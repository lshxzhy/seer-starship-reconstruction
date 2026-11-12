// The opening phase is registered to the 960 × 560 Taomee NewWorldMap2020Panel.
// Chart pixels are a projection; orbital lengths and times are game-scale choices.
const PANO_ORBITS=(()=>{
  const scale=16000,period=10*86400;
  const icon=(id,name,px,py,colour)=>{
    const z=(py-280)/.56, x=px-515-.28*z;
    return {id,name,a:scale*Math.hypot(x,z),phase:Math.atan2(z,x),colour};
  };
  const klose=icon('klose','克洛斯星',551,154,'#e8d34e');
  const ocean=icon('ocean','海洋星',409,78,'#7ed9f5');
  for(const row of [klose,ocean])row.period=period*Math.pow(row.a/klose.a,1.5);
  return {klose,ocean};
})();

function createPanoSystem(T,world){
  const tau=Math.PI*2,ids=Object.keys(PANO_ORBITS);
  const root=new T.Group();root.name='帕诺星系 · 公转';world.add(root);
  const starRadius=480000,far=32000000;
  function center(id,time,out=new T.Vector3()){
    if(id==='star')return out.set(0,0,0);
    const orbit=PANO_ORBITS[id],angle=orbit.phase+tau*((time%orbit.period)/orbit.period);
    return out.set(orbit.a*Math.cos(angle),0,orbit.a*Math.sin(angle));
  }
  function velocity(id,time,out=new T.Vector3()){
    if(id==='star')return out.set(0,0,0);
    center(id,time,out);
    const speed=tau/PANO_ORBITS[id].period,x=out.x;
    return out.set(-out.z*speed,0,x*speed);
  }
  const scratch=new T.Vector3();
  function offset(fromId,toId,time,out=new T.Vector3()){
    return center(toId,time,out).sub(center(fromId,time,scratch));
  }
  const sun=new T.Mesh(new T.SphereGeometry(starRadius,48,28),new T.ShaderMaterial({
    fog:false,
    vertexShader:'varying vec3 n;void main(){n=normalize(normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`varying vec3 n;void main(){vec3 d=normalize(n);float w=sin(52.*d.x+5.*sin(21.*d.y))*sin(45.*d.z-6.*d.x);
      gl_FragColor=vec4(mix(vec3(1.,.62,.28),vec3(1.,.94,.67),.73+.15*w),1.);}`
  }));sun.name='帕诺中心光源';root.add(sun);
  const glow=new T.Sprite(new T.SpriteMaterial({map:makeGlow(),transparent:true,depthWrite:false,blending:T.AdditiveBlending,fog:false}));
  glow.scale.setScalar(starRadius*4.2);sun.add(glow);
  function makeGlow(){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
    const c=canvas.getContext('2d'),g=c.createRadialGradient(64,64,0,64,64,64);
    for(const [a,shade] of [[0,'rgba(255,225,155,0.8)'],[.45,'rgba(255,195,100,.5)'],[.55,'rgba(255,172,83,.22)'],[1,'rgba(255,159,53,0)']])g.addColorStop(a,shade);
    c.fillStyle=g;c.fillRect(0,0,128,128);return new T.CanvasTexture(canvas);
  }
  function remoteSphere(id,radius){
    const m=new T.ShaderMaterial({uniforms:{sunDir:{value:new T.Vector3()},ocean:{value:id==='ocean'?1:0}},
      vertexShader:'varying vec3 n;void main(){n=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`varying vec3 n;uniform vec3 sunDir;uniform float ocean;
      float ring(vec3 p,vec3 center,float r){float d=distance(p,normalize(center))/r;
        return smoothstep(.66,.78,d)*(1.-smoothstep(.87,1.,d));}
      void main(){vec3 d=normalize(n);float light=max(0.,dot(d,sunDir));vec3 colour;
        if(ocean>.5){
          float water=sin(d.y*19.+sin(d.x*7.)*2.+d.z*3.)*.5+.5;
          colour=mix(vec3(.13,.23,.36),vec3(.36,.57,.68),water*.52+.24);
          float rims=ring(d,vec3(.89,.45,.13),.27)+ring(d,vec3(.03,.85,.66),.20)+ring(d,vec3(-.46,.15,.92),.29)
            +ring(d,vec3(.95,-.29,.18),.15)+ring(d,vec3(.26,-.38,.9),.19)+ring(d,vec3(-.83,.48,-.08),.20)+ring(d,vec3(-.18,-.59,-.83),.22);
          colour=mix(colour,vec3(.79,.86,.94),min(rims,1.)*.90);
        }else{
          float b=d.y+.035*sin(d.x*7.+d.z*2.);colour=vec3(.54,.58,.65);
          if(b>.57)colour=vec3(.60,.71,.70);else if(b>.20)colour=vec3(.60,.60,.40);
          else if(b>-.14)colour=vec3(.67,.62,.71);else if(b>-.53)colour=vec3(.44,.49,.57);else colour=vec3(.74,.59,.60);
        }gl_FragColor=vec4(colour*(.23+.77*sqrt(light)),1.);}`});
    const sphere=new T.Mesh(new T.SphereGeometry(radius,64,40),m);
    sphere.name=PANO_ORBITS[id].name;sphere.frustumCulled=false;root.add(sphere);return sphere;
  }
  const proxies={klose:remoteSphere('klose',KLOSE_WORLD.radius),ocean:remoteSphere('ocean',OCEAN_WORLD.radius)};
  const rings=KLOSE_WORLD.rings;
  const band=new T.Mesh(new T.RingGeometry(rings.inner*KLOSE_WORLD.radius,rings.outer*KLOSE_WORLD.radius,100),
    new T.MeshBasicMaterial({color:0xe4c54b,side:T.DoubleSide,fog:false}));
  band.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3().fromArray(rings.normal).normalize());
  proxies.klose.add(band);
  const tracks=new T.Group();tracks.name='公转轨迹';root.add(tracks);
  for(const id of ids){
    const points=[];for(let i=0;i<200;i++)points.push(center(id,PANO_ORBITS[id].period*i/200));
    tracks.add(new T.LineLoop(new T.BufferGeometry().setFromPoints(points),
      new T.LineBasicMaterial({color:PANO_ORBITS[id].colour,transparent:true,opacity:.24,fog:false})));
  }
  function update(reference,time,{showOrbits=false}={}){
    center(reference,time,root.position).negate();
    for(const id of ids){
      const sphere=proxies[id];sphere.visible=id!==reference;
      center(id,time,sphere.position);sphere.material.uniforms.sunDir.value.copy(sphere.position).normalize().negate();
    }
    tracks.visible=showOrbits;
  }
  function drawChart(svg,{time=0,current='klose',selected=current,onSelect,vehicle=null,vehiclePlanet=current,carrier=null}={}){
    svg.replaceChildren();svg.setAttribute('viewBox','0 0 510 286');
    const scale=201/PANO_ORBITS.ocean.a,project=p=>[252+(p.x+.28*p.z)*scale,139+p.z*scale*.56];
    function mark(tag,attrs,words=''){
      const el=document.createElementNS('http://www.w3.org/2000/svg',tag);
      for(const [key,val] of Object.entries(attrs))el.setAttribute(key,val);
      if(words)el.textContent=words;svg.append(el);return el;
    }
    for(const id of ids){
      const orbit=PANO_ORBITS[id],path=[];
      for(let i=0;i<100;i++){const [x,y]=project(center(id,orbit.period*i/100));path.push((i?'L':'M')+x.toFixed(1)+','+y.toFixed(1));}
      mark('path',{d:path.join('')+'Z',fill:'none',stroke:orbit.colour,'stroke-width':1,'stroke-opacity':.45});
    }
    mark('circle',{cx:252,cy:139,r:7,fill:'#ffe4a1'});
    mark('text',{x:264,y:145,fill:'#e2cda3','font-size':11},'帕诺星系中心');
    const shipPoint=carrier?project(center('klose',time).add(carrier)):null;
    const boatPoint=vehicle&&PANO_ORBITS[vehiclePlanet]?project(center(vehiclePlanet,time).add(vehicle)):null;
    const together=shipPoint&&boatPoint&&Math.hypot(shipPoint[0]-boatPoint[0],shipPoint[1]-boatPoint[1])<15;
    if(boatPoint&&!together){
      const [x,y]=boatPoint;
      mark('path',{d:'M'+x+','+(y-5)+'l4,8 -4,-2 -4,2z',fill:'#fff',stroke:'#17272b','stroke-width':1});
      mark('text',{x:x+11,y:y+21,fill:'#d4ecec','font-size':10},'L-01');
    }
    for(const id of ids){
      const orbit=PANO_ORBITS[id],[x,y]=project(center(id,time));
      const hit=mark('g',{'data-pano-planet':id,role:'button',tabindex:'0','aria-label':orbit.name,'aria-pressed':String(selected===id),style:'cursor:pointer'});
      for(const [tag,args,words] of [
        ['circle',{cx:x,cy:y,r:18,fill:'transparent'}],
        ['circle',{cx:x,cy:y,r:8,fill:orbit.colour,stroke:selected===id?'#f7fff2':'#346271','stroke-width':selected===id?2.5:1}],
        ['text',{x:x+13,y:y-7,fill:'#e5f2ec','font-size':13},orbit.name+(current===id?' · 当前':'')]
      ])hit.append(mark(tag,args,words));
      hit.onclick=()=>onSelect?.(id);
      hit.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect?.(id);}};
    }
    if(shipPoint){
      const [x,y]=shipPoint;
      mark('rect',{x:x-2.5,y:y-2.5,width:5,height:5,fill:'#fff','pointer-events':'none'});
      const label=mark('text',{x:x+9,y:y+23,fill:'#d4ecec','font-size':11,style:'cursor:pointer',role:'button',tabindex:0},together?'赛尔号 ／ L-01':'赛尔号');
      label.onclick=()=>onSelect?.('dock');
      label.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect?.('dock');}};
    }
  }
  function dispose(){
    const geometries=new Set(),materials=new Set();
    root.traverse(o=>{if(o.geometry&&!o.isSprite)geometries.add(o.geometry);if(o.material)materials.add(o.material);});
    for(const g of geometries)g.dispose();for(const m of materials){m.map?.dispose();m.dispose();}world.remove(root);
  }
  return {root,far,starRadius,center,velocity,offset,update,drawChart,dispose};
}
