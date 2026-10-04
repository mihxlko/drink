/* Footer label: Torph preserves text across wording changes. When one or two
   digits change, only those digits slide, with a configurable exit direction. */
import { TextMorph } from 'torph'
import { TIME_CARD_MOTION } from './timing'

export function createTimeCardFooter(element: HTMLElement) {
  const wordingTiming = {duration:TIME_CARD_MOTION.footer.wordingDuration,easing:TIME_CARD_MOTION.easing};
  const timing = {duration:TIME_CARD_MOTION.footer.slideDuration, easing:TIME_CARD_MOTION.easing};
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
  const makeMorph = () => new TextMorph({element:torph,numbers:false,scale:false,duration:wordingTiming.duration,ease:wordingTiming.easing,respectReducedMotion:true});
  let morph = makeMorph();
  let previous = '';
  const distance = TIME_CARD_MOTION.footer.distance;
  const currentDigits = new Map<number, HTMLSpanElement>();

  function changedDigits(before: string, after: string) {
    if (before.length !== after.length) return [];
    const changed = [...after].map((char,index)=>char===before[index]?-1:index).filter(index=>index!==-1);
    return changed.every(index=>/\d/.test(before[index])&&/\d/.test(after[index])) ? changed : [];
  }
  function clearSlide() {
    slide.getAnimations({subtree:true}).forEach(animation=>animation.cancel());
    slide.replaceChildren();
    currentDigits.clear();
  }
  function update(text: string) {
    if (text === previous) return;
    const changed = reduced.matches ? [] : changedDigits(previous,text);
    const useSlide = changed.length===1;
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
        slot.dataset.index=String(index);
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
          visible.get(index)!,
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
      element.dataset.slidingDigits=String(changed.length);
    } else {
      clearSlide();
      element.dataset.renderer='torph';
      delete element.dataset.slidingDigits;
    }
    morph.update(text);
    accessible.textContent=text;
    previous=text;
  }
  const onReducedMotion = () => {
    if (!reduced.matches) return;
    clearSlide();
    torph.getAnimations({subtree:true}).forEach(animation => animation.cancel());
    morph.destroy();
    torph.replaceChildren();
    morph = makeMorph();
    morph.update(previous);
    element.dataset.renderer = 'torph';
    delete element.dataset.slidingDigits;
  };
  reduced.addEventListener('change', onReducedMotion);
  return {update, destroy() {
    reduced.removeEventListener('change', onReducedMotion);
    clearSlide();
    torph.getAnimations({subtree:true}).forEach(animation => animation.cancel());
    morph.destroy();
    element.replaceChildren();
    delete element.dataset.renderer;
    delete element.dataset.slidingDigits;
  }};
};
