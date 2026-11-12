function createSpiritStage(T){
  let gpu=null,scene,eye,frame=0,last=0,cast=[],mount=null,attack=null,signature='';
  const canvas=document.createElement('canvas');
  canvas.className='spirit-diorama';canvas.setAttribute('role','img');
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
  function platform(parent){
    const rock=new T.MeshStandardMaterial({color:0x3b6066,roughness:.82,metalness:.21});
    const edge=new T.MeshBasicMaterial({color:0x7ca9a3});
    const disc=new T.CylinderGeometry(1.13,1.04,.085,64),ring=new T.TorusGeometry(1.06,.012,8,70);
    const base=new T.Mesh(disc,rock),trim=new T.Mesh(ring,edge);base.position.y=-.055;trim.rotation.x=-Math.PI/2;trim.position.y=-.007;
    parent.add(base,trim);resources.push(rock,edge,disc,ring);
  }
  function clear(){
    cancelAnimationFrame(frame);frame=0;last=0;
    for(const c of cast){scene.remove(c.anchor);c.model?.dispose?.();}
    for(const resource of resources)resource.dispose();
    resources.length=0;cast=[];attack=null;signature='';
  }
  function render(now){
    frame=0;if(!mount?.isConnected||mount.closest('[hidden]'))return;
    const rect=mount.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return;
    const ratio=Math.min(1.7,window.devicePixelRatio||1);
    if(gpu.getPixelRatio()!==ratio||Math.abs(canvas.width-rect.width*ratio)>1||Math.abs(canvas.height-rect.height*ratio)>1){
      gpu.setPixelRatio(ratio);gpu.setSize(rect.width,rect.height,false);
    }
    const aspect=rect.width/rect.height;
    const half=Math.max(1.17,(cast.length>1?2.52:1.35)/aspect);
    eye.left=-half*aspect;eye.right=half*aspect;eye.top=half;eye.bottom=-half;eye.updateProjectionMatrix();
    const dt=last?Math.min(.09,(now-last)/1000):0;last=now;
    for(const [i,c] of cast.entries()){
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
    const key=entries.map(e=>e.id).join('/');
    if(!gpu){
      try{boot();}catch{element.textContent='三维预览不可用';return;}
    }
    if(signature!==key){
      clear();signature=key;
      for(const [i,entry] of entries.entries()){
        const anchor=new T.Group(),holder=new T.Group();anchor.add(holder);scene.add(anchor);platform(anchor);
        const model=createCompanionFigure(T,entry.id);
        if(model){
          const bounds=new T.Box3().setFromObject(model.root),size=bounds.getSize(new T.Vector3()),centre=bounds.getCenter(new T.Vector3());
          const scale=Math.min(1.77/Math.max(.02,size.y),2.09/Math.max(.02,size.x,size.z));
          const arranged=new T.Group();arranged.scale.setScalar(scale);model.root.position.sub(new T.Vector3(centre.x,bounds.min.y,centre.z));
          arranged.add(model.root);holder.add(arranged);
        }
        anchor.position.x=entries.length===1?0:(i===0?-1.25:1.25);
        anchor.rotation.y=entries.length===1?-.28:(i===0?.66:-.66);
        cast.push({anchor,holder,model});
      }
    }
    canvas.setAttribute('aria-label',entries.map(e=>e.name).join(' 对战 '));element.prepend(canvas);
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
