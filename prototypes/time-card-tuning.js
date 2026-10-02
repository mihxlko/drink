window.createTimeCardTuning = function createTimeCardTuning(onChange) {
  const {createDialKit,createDialRoot} = window.TimeCardTuningLibraries;
  // User-tuned defaults shared by WebKit and Chromium previews.
  const kit = createDialKit('Time card · 07', {
    previewMode:false,
    previewOpenKey:{type:'text',label:'Open key',default:'o'},
    footer:{
      singleDigitSlide:true,twoDigitSlide:false,travelDistancePx:[20,0,64,1],
      exitDownward:false,
      slideDurationMs:[290,80,1000,10],
      easingPreset:window.TimeCardEasing.control(),
      customBezier:{type:'text',default:'0.22, 1, 0.36, 1',placeholder:'x1, y1, x2, y2 (used with Custom)'}
    },
    buttons:{
      pressScale:[.94,.8,1.1,.01],digitDurationMs:[350,80,1000,10],
      exitDownward:false,
      easingPreset:window.TimeCardEasing.control(),
      customBezier:{type:'text',default:'0.22, 1, 0.36, 1',placeholder:'x1, y1, x2, y2 (used with Custom)'}
    },
    input:{enterDistancePx:[20,0,96,1],travelTimeMs:[350,80,600,10],exitDistancePx:[20,0,96,1],linkExitToEntry:true,deleteDownward:true},
    layout:{buttonGapPx:[4,0,16,1]}
  }, {id:'sip-time-card-07',persist:true});
  const root = createDialRoot({position:'top-left',theme:document.documentElement.dataset.theme});
  root.element.classList.add('time-card-dials');
  const shell = root.element.querySelector('.dialkit-panel');
  shell.style.top = '100px';
  // DialKit's vanilla drag handler excludes role=button, including its title.
  // Make that visible title draggable while retaining click-to-collapse.
  const title = shell.querySelector('.dialkit-folder-header-top');
  title.style.cursor = 'grab';
  title.style.touchAction = 'none';
  title.title = 'Drag to move. Click to collapse. Alt + arrow keys move the panel.';
  let moveDrag, suppressClick = false;
  function position(x,y) {
    delete shell.dataset.position;
    const box=shell.getBoundingClientRect();
    const top=Math.max(8,Math.min(innerHeight-48,y));
    shell.style.setProperty('--tuning-top',`${top}px`);
    Object.assign(shell.style,{left:`${Math.max(8,Math.min(innerWidth-box.width-8,x))}px`,top:`${top}px`,right:'auto',bottom:'auto'});
  }
  title.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    event.preventDefault();event.stopPropagation();
    const box=shell.getBoundingClientRect();
    moveDrag={x:event.clientX,y:event.clientY,left:box.left,top:box.top,moved:false};
    suppressClick=false;
    title.setPointerCapture(event.pointerId);
  });
  title.addEventListener('pointermove',event=>{
    if(!moveDrag)return;
    const dx=event.clientX-moveDrag.x,dy=event.clientY-moveDrag.y;
    if(!moveDrag.moved&&Math.hypot(dx,dy)<4)return;
    moveDrag.moved=true;
    position(moveDrag.left+dx,moveDrag.top+dy);
  });
  const stopMove=()=>{suppressClick=!!moveDrag?.moved;moveDrag=undefined;};
  title.addEventListener('pointerup',stopMove);
  title.addEventListener('pointercancel',stopMove);
  title.addEventListener('lostpointercapture',()=>{if(moveDrag)stopMove();});
  title.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopImmediatePropagation();suppressClick=false;}},true);
  title.addEventListener('keydown',event=>{
    if(!event.altKey||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();
    const box=shell.getBoundingClientRect();
    position(box.left+(event.key==='ArrowRight'?10:event.key==='ArrowLeft'?-10:0),box.top+(event.key==='ArrowDown'?10:event.key==='ArrowUp'?-10:0));
  });
  const handle = document.createElement('button');
  handle.className = 'tuning-resize';
  handle.type = 'button';
  handle.setAttribute('aria-label','Resize animation controls');
  handle.title = 'Drag to resize. Arrow keys adjust width and height.';
  shell.append(handle);
  const inner = shell.querySelector('.dialkit-panel-inner');
  const motionError=document.createElement('p');
  motionError.className='tuning-motion-error';
  motionError.setAttribute('role','status');
  inner.append(motionError);
  let lastFooterEase=window.TimeCardEasing.current,lastButtonEase=window.TimeCardEasing.current;
  let drag;
  function resize(width,height) {
    const box = shell.getBoundingClientRect();
    shell.style.setProperty('--tuning-width',`${Math.max(280,Math.min(innerWidth-box.left-16,width))}px`);
    shell.style.setProperty('--tuning-height',`${Math.max(180,Math.min(innerHeight-box.top-16,height))}px`);
  }
  handle.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    event.preventDefault();event.stopPropagation();
    const box=inner.getBoundingClientRect();
    drag={x:event.clientX,y:event.clientY,width:box.width,height:box.height};
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener('pointermove',event=>{if(drag)resize(drag.width+event.clientX-drag.x,drag.height+event.clientY-drag.y);});
  const stop = ()=>{drag=undefined;};
  handle.addEventListener('pointerup',stop);
  handle.addEventListener('pointercancel',stop);
  handle.addEventListener('lostpointercapture',stop);
  handle.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();
    const box=inner.getBoundingClientRect(),step=event.shiftKey?40:10;
    resize(box.width+(event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0),box.height+(event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0));
  });
  const themeObserver=new MutationObserver(()=>{root.element.dataset.theme=document.documentElement.dataset.theme;});
  themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  kit.subscribe(values=>{
    if(values.input.linkExitToEntry&&values.input.exitDistancePx!==values.input.enterDistancePx){
      kit.setValue('input.exitDistancePx',values.input.enterDistancePx);
      return;
    }
    const footerEase=window.TimeCardEasing.resolve(values.footer.easingPreset,values.footer.customBezier);
    if(footerEase)lastFooterEase=footerEase;
    const buttonEase=window.TimeCardEasing.resolve(values.buttons.easingPreset,values.buttons.customBezier);
    if(buttonEase)lastButtonEase=buttonEase;
    const invalid=[!footerEase&&'Footer',!buttonEase&&'Buttons'].filter(Boolean);
    motionError.textContent=invalid.length?`${invalid.join(' and ')}: use four Bézier numbers; the first and third must be between 0 and 1.`:'';
    onChange({...values,
      footer:{...values.footer,slideTiming:{duration:values.footer.slideDurationMs,easing:lastFooterEase}},
      buttons:{...values.buttons,digitTiming:{duration:values.buttons.digitDurationMs,easing:lastButtonEase}}
    });
  });
  return kit;
};
