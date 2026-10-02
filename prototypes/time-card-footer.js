/* Footer label: Torph preserves text across wording changes. When one or two
   digits change, only those digits use the input's upward exit / upward entry. */
window.createTimeCardFooter = function createTimeCardFooter(element) {
  const wordingTiming = {duration:200,easing:'cubic-bezier(.22,1,.36,1)'};
  let timing = {...wordingTiming};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const torph = document.createElement('span');
  torph.className = 'footer-torph';
  torph.setAttribute('aria-hidden','true');
  const slide = document.createElement('span');
  slide.className = 'footer-slide';
  slide.setAttribute('aria-hidden','true');
  const accessible = document.createElement('span');
  accessible.className = 'footer-label-sr';
  element.append(torph,slide,accessible);
  const morph = new window.TimeCardLibraries.TextMorph({element:torph,numbers:false,scale:false,duration:wordingTiming.duration,ease:wordingTiming.easing,respectReducedMotion:true});
  let previous = '', singleEnabled = true, doubleEnabled = true, distance = 16;
  let currentDigits = new Map();

  function changedDigits(before, after) {
    if (before.length !== after.length) return [];
    const changed = [...after].map((char,index)=>char===before[index]?-1:index).filter(index=>index!==-1);
    return changed.every(index=>/\d/.test(before[index])&&/\d/.test(after[index])) ? changed : [];
  }
  function clearSlide() {
    slide.getAnimations({subtree:true}).forEach(animation=>animation.cancel());
    slide.replaceChildren();
    currentDigits.clear();
  }
  function update(text) {
    if (text === previous) return;
    const changed = reduced.matches ? [] : changedDigits(previous,text);
    const useSlide = changed.length===1 && singleEnabled || changed.length===2 && doubleEnabled;
    if (useSlide) {
      // Capture interrupted entries before clearing their exits. Each changed
      // digit has its own vertical layer; all unchanged text stays stationary.
      const visible = new Map(changed.map(index=>{
        const current=currentDigits.get(index);
        const style=current?getComputedStyle(current):null;
        return [index,{transform:style?.transform||'none',opacity:style?.opacity||'1'}];
      }));
      clearSlide();
      let start=0;
      for (const index of changed) {
        slide.append(document.createTextNode(text.slice(start,index)));
        const slot=document.createElement('span');
        slot.className='footer-digit-slot';
        slot.dataset.index=index;
        const outgoing=document.createElement('span');
        outgoing.className='footer-digit outgoing';
        outgoing.textContent=previous[index];
        const incoming=document.createElement('span');
        incoming.className='footer-digit incoming';
        incoming.textContent=text[index];
        slot.append(outgoing,incoming);
        slide.append(slot);
        currentDigits.set(index,incoming);
        const exit=outgoing.animate([
          visible.get(index),
          {transform:`translateY(${-distance}px)`,opacity:0}
        ],{...timing,fill:'forwards'});
        exit.onfinish=()=>outgoing.remove();
        incoming.animate([
          {transform:`translateY(${distance}px)`,opacity:0},
          {transform:'translateY(0px)',opacity:1}
        ],timing);
        start=index+1;
      }
      slide.append(document.createTextNode(text.slice(start)));
      element.dataset.renderer='slide';
      element.dataset.slidingDigits=changed.length;
    } else {
      clearSlide();
      element.dataset.renderer='torph';
      delete element.dataset.slidingDigits;
    }
    morph.update(text);
    accessible.textContent=text;
    previous=text;
  }
  reduced.addEventListener('change',()=>{
    if(reduced.matches){clearSlide();element.dataset.renderer='torph';}
  });
  return {
    update,
    configure(values) {
      singleEnabled=values.singleDigitSlide??true;
      doubleEnabled=values.twoDigitSlide??true;
      distance=values.travelDistancePx;
      timing=values.slideTiming??timing;
      const count=Number(element.dataset.slidingDigits);
      if(count===1&&!singleEnabled||count===2&&!doubleEnabled){clearSlide();element.dataset.renderer='torph';delete element.dataset.slidingDigits;}
    }
  };
};
