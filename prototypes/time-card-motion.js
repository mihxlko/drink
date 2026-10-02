/* Card 07 only. Torph owns digit identity; layout and entrances use separate
   transform layers so a new digit never gets its own diagonal trajectory. */
window.createTimeCardMotion = function createTimeCardMotion(element) {
  const { segmentNumber } = window.TimeCardLibraries;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 190;
  const easing = 'cubic-bezier(.22, 1, .36, 1)';
  const group = document.createElement('span');
  group.className = 'clock-motion-group';
  const measure = document.createElement('span');
  measure.className = 'clock-motion-measure';
  element.append(group, measure);
  let segments = [], previousRaw = '', initialized = false;
  let slots = new Map();

  const tx = node => {
    const transform = getComputedStyle(node).transform;
    return transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m41;
  };
  function move(node, from, to, animate) {
    node.getAnimations().forEach(animation => animation.cancel());
    node.style.transform = `translateX(${to}px)`;
    if (animate && Math.abs(from-to) > .01) {
      node.animate([{transform:`translateX(${from}px)`},{transform:`translateX(${to}px)`}], {duration,easing});
    }
  }
  function width(text) {
    measure.textContent = text;
    return measure.getBoundingClientRect().width;
  }
  function update(text, {padding = 0, cursorIndex} = {}) {
    const raw = text.replace(/:/g,'').slice(padding);
    if (raw !== previousRaw || !initialized) segments = segmentNumber(raw, segments, cursorIndex);
    previousRaw = raw;
    const next = Array.from({length:padding}, (_,i) => ({id:`padding-${i}`,string:'0',padding:true})).concat(segments);
    if (text.includes(':')) next.splice(next.length-2,0,{id:'colon',string:':',padding:raw.length<=2});

    const animate = initialized && !reduced.matches;
    const oldGroupX = tx(group);
    const oldPositions = new Map([...slots].map(([id, slot]) => [id, tx(slot.node)]));
    const nextIds = new Set(next.map(segment => segment.id));
    const nextSlots = new Map();
    let totalWidth = 0;
    const layout = next.map(segment => {
      const x = totalWidth;
      totalWidth += width(segment.string);
      return {...segment,x};
    });

    // Exits live outside the recentering group: padding always travels left,
    // including when the remaining number is moving right toward the center.
    for (const [id, slot] of slots) {
      if (nextIds.has(id)) continue;
      if (!animate) {slot.node.remove();continue;}
      const x = element.clientWidth/2 + oldGroupX + oldPositions.get(id);
      const glyphStyle = getComputedStyle(slot.glyph);
      const opacity = glyphStyle.opacity;
      const transform = glyphStyle.transform;
      slot.node.getAnimations().forEach(animation => animation.cancel());
      slot.glyph.getAnimations().forEach(animation => animation.cancel());
      slot.glyph.style.transform = transform;
      slot.glyph.style.opacity = opacity;
      element.append(slot.node);
      slot.node.dataset.exiting = '';
      slot.node.style.transform = `translateX(${x}px)`;
      const exit = slot.node.animate([
        {transform:`translateX(${x}px)`,opacity:1},
        {transform:`translateX(${x-(slot.padding?16:0)}px)`,opacity:0}
      ],{duration:150,easing,fill:'forwards'});
      exit.onfinish = () => slot.node.remove();
    }

    for (const segment of layout) {
      let slot = slots.get(segment.id);
      const fresh = !slot;
      if (fresh) {
        const node = document.createElement('span');
        const glyph = document.createElement('span');
        node.className = 'clock-motion-slot';
        glyph.className = 'clock-motion-glyph';
        if (segment.string === ':') glyph.classList.add('clock-motion-colon');
        node.append(glyph);
        group.append(node);
        slot = {node,glyph};
      }
      slot.padding = !!segment.padding;
      slot.node.dataset.padding = String(slot.padding);
      slot.node.dataset.digitId = segment.id;
      slot.glyph.textContent = segment.string;
      // Existing glyphs move only horizontally. New glyphs begin at their
      // final slot; their only horizontal movement comes from the whole group.
      move(slot.node, fresh ? segment.x : oldPositions.get(segment.id), segment.x, animate);
      if (fresh && animate) {
        const from = slot.padding ? 'translateX(12px)' : segment.string === ':' ? 'none' : 'translateY(24px)';
        slot.glyph.animate([{transform:from,opacity:0},{transform:'none',opacity:1}],{duration,easing});
      }
      nextSlots.set(segment.id,slot);
    }
    group.style.width = `${totalWidth}px`;
    move(group, initialized ? oldGroupX : -totalWidth/2, -totalWidth/2, animate);
    slots = nextSlots;
    initialized = true;
  }
  reduced.addEventListener('change', () => {
    if (!reduced.matches) return;
    element.getAnimations({subtree:true}).forEach(animation => animation.cancel());
    element.querySelectorAll('[data-exiting]').forEach(node => node.remove());
  });
  return {update};
};
