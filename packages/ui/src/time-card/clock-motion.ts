/* Card 07 only. Torph owns digit identity; layout and entrances use separate
   transform layers so a new digit never gets its own diagonal trajectory. */
import { segmentNumber, type NumberSegment } from 'torph'
import { TIME_CARD_MOTION } from './timing'

type Slot = {node: HTMLSpanElement; glyph: HTMLSpanElement; padding?: boolean}
type ClockSegment = {id: string; string: string; padding?: boolean}
export interface ClockUpdate {padding?: number; cursorIndex?: number; step?: boolean; deleting?: boolean}

export function createTimeCardMotion(element: HTMLElement) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const settings = TIME_CARD_MOTION.input;
  const layoutDuration = TIME_CARD_MOTION.layoutDuration;
  const easing = TIME_CARD_MOTION.easing;
  const group = document.createElement('span');
  group.className = 'clock-motion-group';
  const measure = document.createElement('span');
  measure.className = 'clock-motion-measure';
  element.append(group, measure);
  let segments: NumberSegment[] = [];
  let previousRaw = '', initialized = false;
  let slots = new Map<string, Slot>();

  const tx = (node: HTMLElement) => {
    const transform = getComputedStyle(node).transform;
    return transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m41;
  };
  function move(node: HTMLElement, from: number, to: number, animate: boolean, timing: KeyframeAnimationOptions) {
    node.getAnimations().forEach(animation => animation.cancel());
    node.style.transform = `translateX(${to}px)`;
    if (animate && Math.abs(from-to) > .01) {
      node.animate([{transform:`translateX(${from}px)`},{transform:`translateX(${to}px)`}], timing);
    }
  }
  function width(text: string) {
    measure.textContent = text;
    // Layout uses local CSS pixels. Screen-space bounds include preview scale
    // and would apply that scale a second time when positioning the digits.
    return parseFloat(getComputedStyle(measure).width);
  }
  function update(text: string, {padding = 0, cursorIndex, step = false, deleting = false}: ClockUpdate = {}) {
    const verticalTiming={duration:step?(settings.stepDurationMs??settings.travelTimeMs):settings.travelTimeMs,easing:step?(settings.stepEasing??easing):easing};
    const layoutTiming=step?verticalTiming:{duration:layoutDuration,easing};
    const raw = text.replace(/:/g,'').slice(padding);
    if (raw !== previousRaw || !initialized) segments = segmentNumber(raw, segments, cursorIndex);
    previousRaw = raw;
    const next: ClockSegment[] = [...Array.from({length:padding}, (_,i) => ({id:`padding-${i}`,string:'0',padding:true})), ...segments];
    if (text.includes(':')) next.splice(next.length-2,0,{id:'colon',string:':',padding:raw.length<=2});

    const animate = initialized && !reduced.matches;
    const oldGroupX = tx(group);
    const oldPositions = new Map([...slots].map(([id, slot]) => [id, tx(slot.node)]));
    const nextIds = new Set(next.map(segment => segment.id));
    const nextSlots = new Map<string, Slot>();
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
      const x = element.clientWidth/2 + oldGroupX + (oldPositions.get(id) ?? 0);
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
      const rollOut = (step || deleting) && /\d/.test(slot.glyph.textContent ?? '');
      const downward = step ? settings.stepExitDownward : deleting && settings.deleteDownward;
      const exitDistance = downward || settings.linkExitToEntry ? settings.enterDistancePx : settings.exitDistancePx;
      const exit = slot.node.animate([
        {transform:`translateX(${x}px)`,opacity:1},
        {transform:rollOut ? `translate(${x}px, ${downward?exitDistance:-exitDistance}px)` : `translateX(${x-(slot.padding?16:0)}px)`,opacity:0}
      ],{duration:rollOut?verticalTiming.duration:TIME_CARD_MOTION.paddingExitDuration,easing:verticalTiming.easing,fill:'forwards'});
      exit.onfinish = () => slot.node.remove();
    }

    for (const segment of layout) {
      let slot = slots.get(segment.id);
      const fresh = !slot;
      if (!slot) {
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
      move(slot.node, fresh ? segment.x : (oldPositions.get(segment.id) ?? segment.x), segment.x, animate, layoutTiming);
      if (fresh && animate) {
        const rise = segment.string !== ':' && (step || !slot.padding);
        // Match the resting CSS transform: dropping back to `none` switches
        // rasterization at the end of a slide, which can shift text in WebKit.
        const from = rise ? `translate3d(0,${settings.enterDistancePx}px,0)` : slot.padding ? 'translate3d(12px,0,0)' : 'translate3d(0,0,0)';
        slot.glyph.animate([{transform:from,opacity:0},{transform:'translate3d(0,0,0)',opacity:1}],{duration:rise?verticalTiming.duration:layoutTiming.duration,easing:verticalTiming.easing,fill:'backwards'});
      }
      nextSlots.set(segment.id,slot);
    }
    group.style.width = `${totalWidth}px`;
    move(group, initialized ? oldGroupX : -totalWidth/2, -totalWidth/2, animate, layoutTiming);
    slots = nextSlots;
    initialized = true;
  }
  const onReducedMotion = () => {
    if (!reduced.matches) return;
    element.getAnimations({subtree:true}).forEach(animation => animation.cancel());
    element.querySelectorAll('[data-exiting]').forEach(node => node.remove());
  };
  reduced.addEventListener('change', onReducedMotion);
  return {update, destroy() {
    reduced.removeEventListener('change', onReducedMotion);
    element.getAnimations({subtree:true}).forEach(animation => animation.cancel());
    element.replaceChildren();
  }};
};
