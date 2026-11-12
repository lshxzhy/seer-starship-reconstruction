// Original companion sculpts. Forward is +Z, feet are on y=0.
// These relief fields follow the mesh in its own coordinates. The geometry
// determines the species silhouette; each tissue keeps its own highlights.
const SPIRIT_SURFACES={
  iris:[.17,.0004,'float r=length(p.xy),a=atan(p.y,p.x+.00001);detail=(.5+.5*cos(32.*a+3.*sin(a*7.)+r*6.))*smoothstep(.16,.5,r)*(1.-smoothstep(.82,1.,r));'],
  velvet:[.83,.002,'float f=34.*p.x+6.*sin(4.*p.y)+7.*p.z;detail=.57*cos(f)*cos(21.*p.y-8.*p.z)+.28*sin(53.*p.z+3.*p.y);'],
  feather:[.66,.004,'float spine=exp(-abs(p.x+p.z*.21)*19.);detail=spine+.38*cos(31.*p.y-19.*abs(p.x)-6.*p.z);'],
  fin:[.36,.002,'float ray=atan(p.y+.09,p.z-.14+.00001);detail=pow(.5+.5*cos(33.*ray+6.*p.x),6.)-.25;'],
  petal:[.54,.004,'float v=abs(p.x)+.25*abs(p.z);detail=exp(-v*18.)+.48*pow(.5+.5*cos(27.*p.y-28.*v),7.)-.18;'],
  scute:[.43,.005,'vec2 q=vec2(p.x*8.+p.z*13.,p.y*12.+.24*sin(14.*p.z));detail=.55*cos(q.y*2.)+.36*cos(q.x*2.6+.8*sin(q.y*1.8));'],
  cap:[.69,.003,'detail=.42*sin(48.*p.x+13.*p.y)*cos(38.*p.z-9.*p.y)+.38*sin(14.*p.x+9.*p.z);'],
  gem:[.22,.001,'detail=.47*sin(18.*p.y+7.*p.z+.8*sin(5.*p.x));'],
  cuticle:[.46,.002,'vec3 q=p*31.;detail=.32*cos(q.x+q.y)*sin(q.z-q.y)+.21*cos(q.y+2.*sin(q.x));'],
  horn:[.32,.0015,'detail=.43*cos(p.y*36.+p.z*5.+2.*sin(3.*p.x))+.14*sin(p.x*42.+p.y*2.);']
};
function spiritCoating(material,kind,palette){
  const key=material.uuid+kind;
  if(palette.has(key))return palette.get(key);
  const coat=material.clone(),[roughness,depth,relief]=SPIRIT_SURFACES[kind];
  coat.roughness=roughness;
  coat.customProgramCacheKey=()=>'spirit-tissue-'+kind;
  coat.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 tissuePoint;\n'+shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\ntissuePoint=position;');
    shader.fragmentShader='varying vec3 tissuePoint;\n'+shader.fragmentShader.replace('#include <color_fragment>',
      `#include <color_fragment>
       vec3 p=tissuePoint;float detail=0.;${relief}
       float tissueLod=1.-smoothstep(.012,.085,length(fwidth(p)));
       diffuseColor.rgb*=1.+.11*tissueLod*detail;`)
      .replace('#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor-.11*tissueLod*detail,.08,.98);')
      .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        vec3 dx=-dFdx(vViewPosition),dy=-dFdy(vViewPosition);
        // Work in pixel footprints so field and portrait scales share a relief.
        float viewFootprint=max(length(dx)+length(dy),.0001);
        dx/=viewFootprint;dy/=viewFootprint;
        vec3 gx=cross(dy,normal),gy=cross(normal,dx);
        float det=dot(dx,gx)*faceDirection;
        float tissueFootprint=max(length(dFdx(p))+length(dFdy(p)),.0001);
        vec3 slope=(dFdx(detail)*gx+dFdy(detail)*gy)*(${depth}/tissueFootprint)*sign(det)/max(abs(det),.0001);
        normal=normalize(normal-tissueLod*slope/max(1.,5.*length(slope)));`);
    if(kind==='velvet'||kind==='feather'){
      // Fine fibres catch grazing light; keep their tint and the scene's shadows.
      shader.fragmentShader=shader.fragmentShader.replace('#include <tonemapping_fragment>',`
        float grazing=1.-clamp(dot(geometry.normal,geometry.viewDir),0.,1.);
        gl_FragColor.rgb+=(reflectedLight.indirectDiffuse+reflectedLight.directDiffuse)*(.16*grazing*grazing*grazing);
        #include <tonemapping_fragment>`);
    }
  };
  palette.set(key,coat);return coat;
}
function finishSpiritPart(mesh,kind,palette){
  mesh.material=spiritCoating(mesh.material,kind,palette);return mesh;
}
function createCompanionFigure(T,id){
  return createIyooFigure(T,id)||createStarterGrassFigure(T,id)||createStarterWaterFigure(T,id)||createStarterFireFigure(T,id)||
    createBirdEvolutionFigure(T,id)||createOceanShark(T,id)||createKloseSpiritModel(T,id)||createTwinSpiritFigure(T,id)||createPartnerFigure(T,id)||createWetlandEvolution(T,id);
}
// World presentation uses catalogue height once, with a visibility floor for
// tiny species. This is a scene presentation rule, not a change to their data.
// A scaled scene receives local dimensions; records convert them back to metres.
// Keep the attachment at unit scale so its local focus point matches its geometry.
const FIELD_SPIRIT_SCALE=3.0, FIELD_SPIRIT_MIN_HEIGHT=1.10, FIELD_BOSS_SCALE=1.65, KLOSE_ITEM_SCALE=1.40;
function createFieldSpirit(T,id,{boss=false,sceneScale=1}={}){
  const model=createCompanionFigure(T,id);if(!model)return null;
  const bounds=new T.Box3().setFromObject(model.root),extent=bounds.getSize(new T.Vector3());
  const centimetres=SEER_SPIRIT_DATA.index.find(row=>row[0]===id)?.[3];
  const naturalHeight=centimetres>0?centimetres/100:extent.y;
  const displayHeight=Math.max(FIELD_SPIRIT_MIN_HEIGHT,FIELD_SPIRIT_SCALE*naturalHeight);
  const size=displayHeight*(boss?FIELD_BOSS_SCALE:1)/sceneScale;
  // The measured skin landmark moves with the same floor normalization as the
  // visible body. Ornament tips must not determine an elephant's body scale.
  const shoulderHeight=model.shoulderHeight>0?Math.max(0,model.shoulderHeight-bounds.min.y):0;
  const shoulderFactor=shoulderHeight>0&&model.fieldMinShoulderHeight>0?
    model.fieldMinShoulderHeight/shoulderHeight/sceneScale:0;
  const factor=Math.max(size/Math.max(.01,extent.y),shoulderFactor),root=new T.Group();
  root.name=model.root.name;root.rotation.order='YXZ';
  model.root.scale.multiplyScalar(factor);model.root.position.y-=factor*bounds.min.y;
  root.add(model.root);
  const radius=factor*Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x),Math.abs(bounds.min.z),Math.abs(bounds.max.z));
  return {...model,root,animal:root,size:factor*extent.y,radius,
    articulatedGait:model.articulatedGait===true,shoulderSize:factor*shoulderHeight};
}
function createPartnerFigure(T,id){
  const root=new T.Group(),body=new T.Group();
  root.add(body);
  const sphere=new T.SphereGeometry(1,32,22),mats=new Map(),geometries=new Set([sphere]);
  const eye=0x2c2036;
  function material(color){
    if(!mats.has(color))mats.set(color,new T.MeshStandardMaterial({color:new T.Color(color).convertSRGBToLinear(),roughness:.53}));
    return mats.get(color);
  }
  function oval(x,y,z,w,h,d,color,tilt=0,parent=body){
    const m=new T.Mesh(sphere,material(color));m.position.set(x,y,z);m.scale.set(w,h,d);m.rotation.z=tilt;parent.add(m);return m;
  }
  // A tapered, curved leaf/fin with a gently ridged midrib.
  function leaf(x,y,z,w,h,d,color,tilt=0,bend=.25){
    const rows=18,sides=18,pts=[],idx=[];
    for(let j=0;j<=rows;j++){
      const t=j/rows,rad=.012+.988*Math.pow(Math.sin(t*Math.PI),.69);
      for(let i=0;i<sides;i++){
        const a=i*2*Math.PI/sides;
        const lateral=Math.cos(a),fold=1+.16*Math.abs(lateral)**2+.14*Math.cos(4*a)*Math.sin(Math.PI*t);
        pts.push(w*rad*lateral,t*h+.031*h*rad*lateral*lateral,d*rad*Math.sin(a)*fold+bend*h*t*t);
        if(j<rows){const v=j*sides+i,n=j*sides+(i+1)%sides;idx.push(v,v+sides,n,n+sides,n,v+sides);}
      }
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));g.setIndex(idx);g.computeVertexNormals();geometries.add(g);
    const m=new T.Mesh(g,material(color));m.position.set(x,y,z);m.rotation.z=tilt;body.add(m);
    const tissue=id>=4&&id<=6?'fin':[11,12,165,166].includes(id)?'feather':id<=3||id>=17&&id<=29||id>=301&&id<=303?'petal':null;
    return tissue?finishSpiritPart(m,tissue,mats):m;
  }
  function limb(a,b,r,color){
    const v=new T.Vector3(...a),w=new T.Vector3(...b),mid=v.clone().lerp(w,.5),dir=w.sub(v);
    const m=oval(mid.x,mid.y,mid.z,r,dir.length()*.5+r*.55,r,color);
    m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());return m;
  }
  function face(y,z,spread,sz,iris=eye){
    for(const sign of [-1,1]){
      finishSpiritPart(oval(sign*spread,y,z,sz*.63,sz,sz*.12,iris,-sign*.10),'iris',mats);
      oval(sign*spread-.15*sz,y+.34*sz,z+.115*sz,sz*.20,sz*.24,sz*.018,0xfffaf3);
    }
  }
  function petals(x,y,z,size,color,core){
    for(let i=0;i<5;i++){
      const a=i*Math.PI*.4;finishSpiritPart(oval(x+Math.sin(a)*size*.48,y+Math.cos(a)*size*.48,z,size*.33,size*.52,size*.23,color,-a),'petal',mats);
    }
    oval(x,y,z+size*.2,size*.28,size*.28,size*.17,core);
  }
  function cactus(final){
    const green=0x77972f;
    finishSpiritPart(oval(0,.71,0,.39,final?.59:.47,.32,green),'cuticle',mats);
    oval(0,.77,.238,.26,.25,.114,0xdbbc77);face(.82,.336,.127,.048);
    for(const s of [-1,1]){
      limb([s*.29,.67,.01],[s*.45,.74,.04],.11,green);
      limb([s*.45,.72,.04],[s*.47,.99,.03],.13,green);
      oval(s*.17,.16,.02,.17,.17,.21,green);
      for(let i=0;i<3;i++)leaf(s*(.09+i*.07),1.02,.015,.042,.13+i*.036,.04,0xc4ba58,-s*.23);
    }
    if(final)for(let i=-1;i<=1;i++)leaf(i*.15,1.04,0,.105,.38,.08,green,-i*.26);
  }
  function sprout(final){
    oval(0,.56,0,.15,.34,.16,0xf0ce42);oval(0,.92,.01,.286,.25,.24,0xf4d943);
    for(const s of [-1,1]){
      oval(s*.125,.92,.182,.116,.135,.067,0xf1f5ee);oval(s*.115,.925,.235,.049,.079,.034,eye);
      leaf(s*.12,.30,0,.069,.40,.06,0x9caa44,-s*.45);
      oval(s*.10,.13,0,.08,.16,.09,0xf1d13d);
    }
    for(let i=0;i<(final?6:4);i++){
      const a=i*Math.PI*2/(final?6:4),p=leaf(Math.sin(a)*.13,1.03,Math.cos(a)*.12,.17,.35,.09,0xc6efed,-.72*Math.sin(a),-.3);
      p.rotation.x=Math.cos(a)*.85;
    }
    limb([0,1.17,0],[.08,1.54,-.06],.02,0x8d9a44);leaf(.08,1.51,-.06,.052,.15,.032,0xafc753,-.8);
  }
  function yiyi(final,shiny){
    const jade=shiny?0xc0cf47:0xa7a540,cream=shiny?0xe7e892:0xe3cb69;
    oval(0,.59,0,.29,.40,.26,jade);oval(0,.83,.11,.32,.27,.27,jade);
    for(const s of [-1,1]){
      oval(s*.15,.87,.29,.13,.145,.085,cream);oval(s*.15,.89,.36,.073,.095,.047,eye);
      oval(s*.147,.915,.40,.023,.03,.022,0xffffff);
      limb([s*.18,.46,.03],[s*.31,.13,.17],.056,jade);oval(s*.30,.09,.18,.10,.056,.105,cream);
      leaf(s*.16,.76,-.085,.115,.32,.08,cream,-s*.6);
      if(final)limb([s*.11,1.04,-.01],[s*.15,1.44,0],.024,jade);
    }
    const tail=leaf(.03,.31,-.12,.089,.75,.088,cream,-.32,-.60);tail.rotation.x=-.38;
  }
  function fireCrab(){
    oval(0,.63,0,.39,.37,.30,0xb82d36);oval(0,.91,.025,.38,.27,.29,0xc53b36);
    oval(0,1.04,.28,.09,.14,.055,0xf14d57);face(.95,.285,.177,.074,0xffc344);
    for(const s of [-1,1]){
      for(let i=0;i<3;i++)limb([s*.23,.49,-.14+i*.1],[s*(.39+i*.035),.075,-.13+i*.15],.053,0x8b343a);
      limb([s*.23,.61,.02],[s*.42,.56,.20],.095,0xcc3732);
      oval(s*.44,.40,.24,.133,.24,.147,0xee5435,-s*.23);
      leaf(s*.44,.38,.31,.069,.22,.065,0xffb62d,-s*2.7);
      leaf(s*.18,1.05,-.05,.10,.36,.09,0xff8126,-s*.29,-.34);
    }
    leaf(0,1.08,0,.13,.43,.12,0xffb033,-.12,-.33);
  }
  function goldenBloom(form){
    const jade=0xb5c95e,navy=0x25364c,gold=0xffda70,wine=0x63394d,pink=0xef93b2;
    const grown=form>1;
    oval(0,.55,.01,grown?.28:.24,.37,.24,navy);
    oval(0,.74,.16,.23,.275,.16,gold);face(.80,.305,.11,.065);
    for(const s of [-1,1]){
      oval(s*.14,.17,.02,.115,.18,.145,grown?navy:jade,-s*.2);
      limb([s*.17,.64,.015],[s*.41,.47,.10],.064,jade);
      if(grown)petals(s*.41,.44,.13,.13,pink,gold);
      else leaf(s*.34,.46,.13,.075,.19,.058,pink,-s*.94);
    }
    const cap=oval(0,1.05,-.03,.43,.27,.36,wine);cap.rotation.z=form===1?-.30:-.09;
    for(const s of [-1,1]){
      const edge=leaf(s*.15,.94,.07,.15,form===2?.39:.32,.14,jade,-s*(form===2?.76:1.10),-.23);
      edge.rotation.x=.10;
    }
    oval(0,1.0,.20,.34,.062,.17,grown?jade:navy,.06);
    if(form===3)for(const s of [-1,0,1]){
      const a=[s*.04,1.23,-.02],b=[s*.14,1.51+.06*(s===0),.02];
      limb(a,b,.021,gold);oval(...b,.047,.055,.047,gold);
    }
  }
  if(id===17||id===18)cactus(id===18);
  else if(id===28||id===29)sprout(id===29);
  else if([84,85,443,444].includes(id))yiyi(id===85||id===444,id>=443);
  else if(id===702)fireCrab();
  else if(id>=301&&id<=303)goldenBloom(id-300);
  else {sphere.dispose();return null;}
  let t=0;
  return {root,update(dt){t+=dt;body.position.y=.017*(1+Math.sin(3*t));body.rotation.z=.018*Math.sin(2.2*t);},
    dispose(){geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());}};
}
