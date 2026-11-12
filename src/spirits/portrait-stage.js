function createSpiritStage(T){
  let gpu=null,scene,eye,frame=0,last=0,cast=[],mount=null,attack=null,signature='',spin=0,drag=null;
  const canvas=document.createElement('canvas');
  canvas.className='spirit-diorama';canvas.setAttribute('role','img');
  const turnHint=document.createElement('span');turnHint.className='spirit-turn-hint';turnHint.textContent='拖动旋转 · 双击复位';
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0||!cast.some(c=>c.model))return;
    event.preventDefault();drag={id:event.pointerId,x:event.clientX,spin};
    canvas.setPointerCapture(event.pointerId);canvas.classList.add('turning');
  });
  canvas.addEventListener('pointermove',event=>{
    if(drag?.id===event.pointerId)spin=drag.spin+(event.clientX-drag.x)*.012;
  });
  function finishTurn(event){
    if(drag?.id!==event.pointerId)return;
    if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
    drag=null;canvas.classList.remove('turning');
  }
  canvas.addEventListener('pointerup',finishTurn);canvas.addEventListener('pointercancel',finishTurn);
  canvas.addEventListener('dblclick',()=>{spin=0;});
  const resources=[];
  function boot(){
    gpu=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
    gpu.outputEncoding=T.sRGBEncoding;gpu.toneMapping=T.ACESFilmicToneMapping;gpu.toneMappingExposure=.90;gpu.setClearColor(0,0);
    scene=new T.Scene();eye=new T.OrthographicCamera(-3,3,1.45,-1.45,.1,30);
    eye.position.set(0,2.17,6.5);eye.lookAt(0,.84,0);
    scene.add(new T.HemisphereLight(0xfff5e6,0x8fadc2,1.08));
    const sun=new T.DirectionalLight(0xffecd0,1.1);sun.position.set(-3,4,4);scene.add(sun);
    const rim=new T.DirectionalLight(0x91e7ff,.65);rim.position.set(4,2,-3);scene.add(rim);
  }
  function platform(parent,size=1){
    const rock=new T.MeshStandardMaterial({color:0x3b6066,roughness:.82,metalness:.21});
    const edge=new T.MeshBasicMaterial({color:0x7ca9a3});
    const disc=new T.CylinderGeometry(1.13,1.04,.085,64),ring=new T.TorusGeometry(1.06,.012,8,70);
    const base=new T.Mesh(disc,rock),trim=new T.Mesh(ring,edge);base.position.y=-.055;trim.rotation.x=-Math.PI/2;trim.position.y=-.007;
    base.scale.setScalar(size);trim.scale.setScalar(size);
    parent.add(base,trim);resources.push(rock,edge,disc,ring);
  }
  function clear(){
    cancelAnimationFrame(frame);frame=0;last=0;
    if(drag&&canvas.hasPointerCapture(drag.id))canvas.releasePointerCapture(drag.id);
    for(const c of cast){scene.remove(c.anchor);c.model?.dispose?.();}
    for(const resource of resources)resource.dispose();
    resources.length=0;cast=[];attack=null;signature='';spin=0;drag=null;canvas.classList.remove('turning');turnHint.remove();
  }
  function render(now){
    frame=0;if(!mount?.isConnected||mount.closest('[hidden]'))return;
    const rect=mount.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return;
    const ratio=Math.min(1.7,window.devicePixelRatio||1);
    if(gpu.getPixelRatio()!==ratio||Math.abs(canvas.width-rect.width*ratio)>1||Math.abs(canvas.height-rect.height*ratio)>1){
      gpu.setPixelRatio(ratio);gpu.setSize(rect.width,rect.height,false);
    }
    const aspect=rect.width/rect.height;
    const height=Math.max(1.95,...cast.map(c=>c.height)),radius=Math.max(1.13,...cast.map(c=>c.radius));
    const width=Math.max(1.35,...cast.map(c=>Math.abs(c.anchor.position.x)+c.radius+.12));
    // Fit the whole pair, retaining the boss's larger body instead of fitting
    // each combatant into an identical portrait box. Include depth when rotated.
    const focus=height*.48;
    eye.position.set(0,focus+1.33,6.5);eye.lookAt(0,focus,0);
    const half=Math.max(height*.51+radius*.20+.10,width/aspect);
    eye.left=-half*aspect;eye.right=half*aspect;eye.top=half;eye.bottom=-half;eye.updateProjectionMatrix();
    const dt=last?Math.min(.09,(now-last)/1000):0;last=now;
    for(const [i,c] of cast.entries()){
      c.anchor.rotation.y=c.bearing+spin;
      c.model?.update?.(dt);
      let offset=0,height=0;
      if(attack){
        const t=(now-attack)/850;
        if(t>=1)attack=null;
        else if(t>=0&&c.model){
          const p=i===0?t/.48:(t-.48)/.52;
          if(p>=0&&p<1){offset=(i===0?1:-1)*.29*Math.sin(Math.PI*p);height=.08*Math.sin(Math.PI*p);}
        }
      }
      c.holder.position.x=offset;c.holder.position.y=height;
    }
    gpu.render(scene,eye);frame=requestAnimationFrame(render);
  }
  function show(element,entries){
    mount=element;
    const key=entries.map(e=>e.id+(e.boss?':boss':'')).join('/');
    if(!gpu){
      try{boot();}catch{element.textContent='三维预览不可用';return;}
    }
    if(signature!==key){
      clear();signature=key;
      for(const [i,entry] of entries.entries()){
        const anchor=new T.Group(),holder=new T.Group(),bossScale=entry.boss?2:1;
        anchor.add(holder);scene.add(anchor);platform(anchor,bossScale);
        const model=createCompanionFigure(T,entry.id);
        let radius=1.13*bossScale,height=1.95*bossScale;
        if(model){
          const bounds=new T.Box3().setFromObject(model.root),size=bounds.getSize(new T.Vector3()),centre=bounds.getCenter(new T.Vector3());
          const scale=bossScale*Math.min(2.08/Math.max(.02,size.y),2.40/Math.max(.02,size.x,size.z));
          const arranged=new T.Group();arranged.scale.setScalar(scale);model.root.position.sub(new T.Vector3(centre.x,bounds.min.y,centre.z));
          arranged.add(model.root);holder.add(arranged);
          height=size.y*scale;radius=Math.max(radius,Math.hypot(size.x,size.z)*scale*.5);
        }
        anchor.position.x=entries.length===1?0:(i===0?-1.25:1.25);
        const bearing=entries.length===1?([6,11,12,165,166].includes(entry.id)?-.68:[4,5].includes(entry.id)?-.55:-.28):(i===0?.66:-.66);
        anchor.rotation.y=bearing;cast.push({anchor,holder,model,bearing,radius,height});
      }
      if(cast.length===2){cast[0].anchor.position.x=-cast[1].radius-.24;cast[1].anchor.position.x=cast[0].radius+.24;}
    }
    canvas.setAttribute('aria-label',entries.map(e=>e.name).join(' 对战 '));element.prepend(canvas);
    if(cast.some(c=>c.model))element.append(turnHint);
    const notes=[...new Set(cast.map(c=>c.model?.presentationNote).filter(Boolean))];
    if(notes.length){
      const label=document.createElement('span');label.className='spirit-sub';
      label.textContent=notes.join(' · ');element.append(label);
    }
    const unavailable=cast.filter(c=>!c.model).length;
    if(unavailable){
      const label=document.createElement('span');label.className='spirit-missing';
      label.textContent='此形态已收录资料，三维造型待补';element.append(label);
    }
    if(!frame)frame=requestAnimationFrame(render);
  }
  return {show,animateTurn(){attack=performance.now();},hide(){clear();mount=null;canvas.remove();},
    dispose(){clear();gpu?.dispose();mount=null;}};
}
