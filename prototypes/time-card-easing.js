// Shared by the prototype's motion controls, not by production Sip.
window.TimeCardEasing = (() => {
  const presets = {
    current:{label:'Current · 0.22, 1, 0.36, 1',curve:[.22,1,.36,1]},
    outQuad:{label:'Ease out quad',curve:[.25,.46,.45,.94]},
    outCubic:{label:'Ease out cubic',curve:[.215,.61,.355,1]},
    outQuart:{label:'Ease out quart',curve:[.165,.84,.44,1]},
    outQuint:{label:'Ease out quint',curve:[.23,1,.32,1]},
    outExpo:{label:'Ease out expo',curve:[.19,1,.22,1]},
    inOut:{label:'Ease in out',curve:[.42,0,.58,1]},
    linear:{label:'Linear',curve:[0,0,1,1]}
  };
  const css = points => `cubic-bezier(${points.join(',')})`;
  return {
    current:css(presets.current.curve),
    control:()=>({type:'select',default:'current',options:[...Object.entries(presets).map(([value,preset])=>({value,label:preset.label})),{value:'custom',label:'Custom cubic Bézier'}]}),
    resolve(preset, custom) {
      if(preset!=='custom')return css((presets[preset]??presets.current).curve);
      const text=String(custom??'').trim().replace(/^cubic-bezier\s*\((.*)\)$/i,'$1');
      const parts=text.split(',').map(part=>part.trim());
      const points=parts.map(Number);
      if(parts.length!==4||parts.some(part=>!part)||points.some(point=>!Number.isFinite(point))||points[0]<0||points[0]>1||points[2]<0||points[2]>1)return null;
      return css(points);
    }
  };
})();
