// The opening phase is registered to the 960 × 560 Taomee NewWorldMap2020Panel.
// Chart pixels are a projection; orbital lengths and times are game-scale choices.
const PANO_ORBITS=(()=>{
  const scale=16000,period=10*86400;
  const icon=(world,px,py,colour)=>{
    const z=(py-280)/.56, x=px-515-.28*z;
    return {id:world.id,name:world.name,a:scale*Math.hypot(x,z),phase:Math.atan2(z,x),colour};
  };
  const klose=icon(KLOSE_WORLD,551,154,'#e8d34e');
  const rows=[klose,icon(OCEAN_WORLD,409,78,'#7ed9f5'),
    icon(ALPHA_WORLD,345,221,'#81d7a2'),icon(BETA_WORLD,237,341,'#efbf75'),
    icon(BYRON_WORLD,884,229,'#a490cd')];
  for(const row of rows)row.period=period*Math.pow(row.a/klose.a,1.5);
  return Object.fromEntries(rows.map(row=>[row.id,row]));
})();

const PANO_NAVIGATION=createPlanetNavigation([KLOSE_WORLD,OCEAN_WORLD,ALPHA_WORLD,BETA_WORLD,BYRON_WORLD]);

function panoCenter(id,time,out=new T.Vector3()){
  if(id==='star')return out.set(0,0,0);
  const orbit=PANO_ORBITS[id],angle=orbit.phase+2*Math.PI*((time%orbit.period)/orbit.period);
  return out.set(orbit.a*Math.cos(angle),0,orbit.a*Math.sin(angle));
}

// The original map icons show a celadon crust with ochre pools on Alpha,
// and lavender ash with bright gold basins on Beta. Both scales of the
// viewer use this same spherical painting and the same direction to the sun.
const TWIN_CRUST_GLSL=`
      float relief(vec3 p){
        return .53*sin(p.x+p.y*.76)*cos(p.z-p.x*.37)+.29*sin(2.7*p.y+p.z)*cos(p.x*2.8)
          +.18*cos(p.y*5.1-p.z*4.1)*sin(3.2*p.x+p.z);
      }
      float basin(vec3 d,vec3 centre,float width,float stretch,float tilt){
        centre=normalize(centre);
        vec3 x=normalize(cross(vec3(0.,1.,0.),centre)),y=cross(centre,x);
        float u=dot(d,x),v=dot(d,y),ct=cos(tilt),st=sin(tilt);
        vec2 q=vec2(u*ct+v*st,(v*ct-u*st)/stretch)/width;
        return dot(d,centre)>.3?length(q):4.;
      }
      vec3 twinCrust(vec3 d,float alpha){
        float broad=relief(d*5.),fine=relief(d*19.+broad*1.4),grain=relief(d*83.);
        float contour=clamp(.53+.39*broad+.13*fine,0.,1.);
        vec3 crust=alpha>.5?mix(vec3(.12,.53,.46),vec3(.56,.88,.65),contour)
          :mix(vec3(.39,.24,.43),vec3(.78,.57,.64),contour);
        float r=min(basin(d,vec3(.81,.28,.61),.23,.63,-.58),basin(d,vec3(.18,.69,-.68),.29,.75,.84));
        r=min(r,basin(d,vec3(.88,-.41,-.23),.21,.67,.22));
        r=min(r,basin(d,vec3(-.39,.14,.90),.30,.70,-.60));
        r=min(r,basin(d,vec3(-.77,.57,-.30),.25,.60,1.1));
        r=min(r,basin(d,vec3(.04,-.91,.39),.24,.90,.45));
        r=min(r,basin(d,vec3(-.48,-.39,-.81),.33,.64,1.02));
        r+=.048*fine+.019*grain;
        float lip=smoothstep(.73,.94,r)*(1.-smoothstep(.96,1.12,r)),pool=1.-smoothstep(.70,.90,r);
        float seam=(1.-smoothstep(.035,.115,abs(broad+.11*fine-.23)))*.11;
        crust*=1.-seam;
        vec3 edge=alpha>.5?vec3(.35,.59,.30):vec3(.99,.77,.25);
        vec3 centre=alpha>.5?mix(vec3(.46,.67,.25),vec3(.81,.80,.37),clamp(.42+r*.45+fine*.15,0.,1.))
                          :mix(vec3(.49,.23,.27),vec3(.96,.58,.12),clamp(.27+r*.81+fine*.18,0.,1.));
        crust=mix(crust,edge,lip);
        crust=mix(crust,centre,pool);
        crust+=.028*fine+.014*grain;
        return crust;
      }`;

function createTwinGlobe(T,definition){
  const m=new T.ShaderMaterial({
    uniforms:{
      sunDir:{value:panoCenter(definition.id,0).normalize().negate()},
      capCenter:{value:new T.Vector3(0,1,0)},cut:{value:2},
      alpha:{value:definition.id==='alpha'?1:0}
    },
    vertexShader:`varying vec3 radial;varying float rim;
      void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);radial=normal;
        rim=1.-clamp(dot(normalize(normalMatrix*normal),normalize(-mv.xyz)),0.,1.);
        gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`varying vec3 radial;varying float rim;
      uniform vec3 sunDir,capCenter;uniform float cut,alpha;
${TWIN_CRUST_GLSL}
      void main(){
        vec3 d=normalize(radial);
        if(dot(d,capCenter)>cut)discard;
        vec3 crust=twinCrust(d,alpha);
        float light=clamp(dot(d,normalize(sunDir)),0.,1.);
        vec3 rgb=crust*(.27+.73*sqrt(light));
        rgb+=pow(rim,3.4)*(.22+.78*light)*(alpha>.5?vec3(.13,.41,.42):vec3(.36,.17,.30));
        gl_FragColor=vec4(rgb,1.);
      }`
  });
  const body=new T.Mesh(new T.SphereGeometry(definition.radius,96,64),m);
  body.name=definition.name;return body;
}

function createPanoSystem(T,world){
  const tau=Math.PI*2,ids=Object.keys(PANO_ORBITS);
  const root=new T.Group();root.name='帕诺星系 · 公转';world.add(root);
  const starRadius=480000,far=32000000;
  function velocity(id,time,out=new T.Vector3()){
    if(id==='star')return out.set(0,0,0);
    panoCenter(id,time,out);
    const speed=tau/PANO_ORBITS[id].period,x=out.x;
    return out.set(-out.z*speed,0,x*speed);
  }
  const scratch=new T.Vector3();
  function offset(fromId,toId,time,out=new T.Vector3()){
    return panoCenter(toId,time,out).sub(panoCenter(fromId,time,scratch));
  }
  const sun=new T.Mesh(new T.SphereGeometry(starRadius,48,28),new T.ShaderMaterial({
    fog:false,
    vertexShader:`varying vec3 n;varying float limb;
      void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normal;
        limb=max(0.,dot(normalize(normalMatrix*normal),normalize(-p.xyz)));gl_Position=projectionMatrix*p;}`,
    fragmentShader:`varying vec3 n;varying float limb;
      void main(){vec3 d=normalize(n);
        float cells=sin(43.*d.x+3.*sin(17.*d.z))*cos(39.*d.y+5.*d.x);
        vec3 disk=mix(vec3(1.,.64,.34),vec3(1.,.93,.66),.70+.16*cells);
        gl_FragColor=vec4(disk*mix(vec3(.91,.72,.56),vec3(1.),sqrt(limb)),1.);}`
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
    const m=new T.ShaderMaterial({uniforms:{sunDir:{value:new T.Vector3()},pole:{value:new T.Vector3(...KLOSE_WORLD.rings.normal).normalize()},ocean:{value:id==='ocean'?1:0}},
      vertexShader:`varying vec3 n;varying vec3 eye;
        void main(){n=normal;vec4 mv=modelViewMatrix*vec4(position,1.);eye=-mv.xyz;gl_Position=projectionMatrix*mv;}`,
      fragmentShader:`varying vec3 n,eye;uniform vec3 sunDir,pole;uniform float ocean;
      float ring(vec3 p,vec3 center,float r){float d=distance(p,normalize(center))/r;
        return smoothstep(.66,.78,d)*(1.-smoothstep(.87,1.,d));}
      void main(){vec3 d=normalize(n);float light=max(0.,dot(d,sunDir));vec3 colour;
        vec3 nv=mat3(viewMatrix)*d, viewRay=normalize(eye);
        float rim=1.-clamp(dot(nv,viewRay),0.,1.),glint=0.;
        if(ocean>.5){
          float water=sin(d.y*19.+sin(d.x*7.)*2.+d.z*3.)*.5+.5;
          colour=mix(vec3(.13,.23,.36),vec3(.36,.57,.68),water*.52+.24);
          float rims=ring(d,vec3(.89,.45,.13),.27)+ring(d,vec3(.03,.85,.66),.20)+ring(d,vec3(-.46,.15,.92),.29)
            +ring(d,vec3(.95,-.29,.18),.15)+ring(d,vec3(.26,-.38,.9),.19)+ring(d,vec3(-.83,.48,-.08),.20)+ring(d,vec3(-.18,-.59,-.83),.22);
          colour=mix(colour,vec3(.79,.86,.94),min(rims,1.)*.90);
          vec3 reflected=reflect(-(mat3(viewMatrix)*sunDir),nv);
          glint=pow(max(0.,dot(reflected,viewRay)),34.)*light*(1.-min(rims,1.));
        }else{
          float b=dot(d,pole)+.018*sin(d.x*7.+d.z*2.);
          colour=mix(vec3(.737,.588,.604),vec3(.435,.486,.569),smoothstep(-.382,-.338,b));
          colour=mix(colour,vec3(.667,.616,.710),smoothstep(-.152,-.108,b));
          colour=mix(colour,vec3(.600,.600,.400),smoothstep(.338,.382,b));
          colour=mix(colour,vec3(.604,.722,.694),smoothstep(.738,.782,b));
        }
        vec3 sky=ocean>.5?vec3(.21,.42,.52):vec3(.28,.34,.32);
        vec3 lit=colour*(.23+.77*sqrt(light))+sky*pow(rim,3.)*(.12+.48*light);
        gl_FragColor=vec4(lit+glint*vec3(.32,.36,.37),1.);}`});
    const sphere=new T.Mesh(new T.SphereGeometry(radius,64,40),m);
    sphere.name=PANO_ORBITS[id].name;sphere.frustumCulled=false;root.add(sphere);return sphere;
  }
  const proxies={klose:remoteSphere('klose',KLOSE_WORLD.radius),ocean:remoteSphere('ocean',OCEAN_WORLD.radius),
    alpha:createTwinGlobe(T,ALPHA_WORLD),beta:createTwinGlobe(T,BETA_WORLD),byron:createByronHull(T,true)};
  root.add(proxies.alpha,proxies.beta,proxies.byron);
  addKloseRingBands(T,proxies.klose,KLOSE_WORLD,proxies.klose.material.uniforms.sunDir.value,100);
  function update(reference,time){
    panoCenter(reference,time,root.position).negate();
    for(const id of ids){
      const proxy=proxies[id];proxy.visible=id!==reference;
      panoCenter(id,time,proxy.position);
      const direction=proxy.material?.uniforms?.sunDir;
      if(direction)direction.value.copy(proxy.position).normalize().negate();
    }
  }
  function dispose(){
    const geometries=new Set(),materials=new Set();
    root.traverse(o=>{if(o.geometry&&!o.isSprite)geometries.add(o.geometry);if(o.material)materials.add(o.material);});
    for(const g of geometries)g.dispose();for(const m of materials){m.map?.dispose();m.dispose();}world.remove(root);
  }
  return {root,proxies,far,starRadius,center:panoCenter,velocity,offset,update,dispose};
}

function drawPanoChart(svg,{time=0,current='klose',selected=current,onSelect,vehicle=null,vehiclePlanet=current,carrier=null}={}){
    const ids=Object.keys(PANO_ORBITS),clip=svg.parentElement,width=clip.clientWidth||510;
    const focus=svg.contains(document.activeElement)?document.activeElement.getAttribute('data-nav-label'):null;
    const polar=p=>({mapX:p.x+.28*p.z,mapY:p.z*.56});
    const core={id:'star',name:'帕诺星系中心',mapX:0,mapY:0,selectable:false};
    const planets=ids.map(id=>({id,name:PANO_ORBITS[id].name+(id===current?' · 当前':''),
      fullName:PANO_ORBITS[id].name,colour:PANO_ORBITS[id].colour,...polar(panoCenter(id,time))}));
    const ship=carrier?{id:'dock',name:'赛尔号',...polar(panoCenter('klose',time).add(carrier))}:null;
    const boat=vehicle&&PANO_ORBITS[vehiclePlanet]?{id:'vehicle',name:'L-01',selectable:false,...polar(panoCenter(vehiclePlanet,time).add(vehicle))}:null;
    const together=ship&&boat&&Math.hypot(ship.mapX-boat.mapX,ship.mapY-boat.mapY)<PANO_ORBITS.klose.a*.01;
    if(together)ship.name='赛尔号 ／ L-01';
    const nodes=[core,...planets,...(ship?[ship]:[]),...(boat&&!together?[boat]:[])];
    const layout=mapLabelColumns(nodes,width,clip.clientHeight||330),height=layout.height;
    const reach=Math.max(...ids.map(id=>PANO_ORBITS[id].a));
    const scale=Math.min(Math.max(12,width-2*layout.rail-38)/(2.09*reach),(height-38)/(1.12*reach));
    const xy=node=>[width/2+node.mapX*scale,height/2+node.mapY*scale];
    const project=p=>xy(polar(p));
    svg.replaceChildren();svg.style.height=height+'px';svg.setAttribute('viewBox','0 0 '+width+' '+height);
    const mark=(tag,attrs,words)=>mapMark(svg,tag,attrs,words);
    for(const id of ids){
      const orbit=PANO_ORBITS[id],path=[];
      for(let i=0;i<100;i++){const [x,y]=project(panoCenter(id,orbit.period*i/100));path.push((i?'L':'M')+x.toFixed(1)+','+y.toFixed(1));}
      mark('path',{d:path.join('')+'Z',fill:'none',stroke:orbit.colour,'stroke-width':1,'stroke-opacity':.45,
        'stroke-dasharray':PANO_NAVIGATION.regions[id].definition.kind==='ship'?'3 6':'none'});
    }
    if(boat&&!together){
      const [x,y]=xy(boat);
      mark('path',{d:'M'+x+','+(y-5)+'l4,8 -4,-2 -4,2z',fill:'#fff',stroke:'#17272b','stroke-width':1});
    }
    mark('circle',{cx:width/2,cy:height/2,r:5,fill:'#ffe4a1'});
    for(const id of ids){
      const orbit=PANO_ORBITS[id],[x,y]=project(panoCenter(id,time));
      const radius=9*PANO_NAVIGATION.regions[id].definition.radius/KLOSE_WORLD.radius;
      const fill={klose:'#a6a27e',ocean:'#53829d',alpha:'#51a58b',beta:'#ae839c'}[id];
      const hit=mark('g',{style:'cursor:pointer'});
      const symbol=PANO_NAVIGATION.regions[id].definition.kind==='ship'?
        ['path',{d:`M${x-10},${y-4}l6,-1 5,-5 1,5 7,2 -5,3 -2,6 -3,-4 -6,1z`,fill:'#605575',stroke:selected===id?'#f7fff2':orbit.colour,'stroke-width':1.6}]:
        ['circle',{cx:x,cy:y,r:radius,fill,stroke:selected===id?'#f7fff2':'#346271','stroke-width':selected===id?2:1}];
      for(const [tag,args,words] of [
        ['circle',{cx:x,cy:y,r:15,fill:'transparent'}],
        symbol
      ])hit.append(mark(tag,args,words));
      if(id==='klose')hit.append(mark('ellipse',{cx:x,cy:y,rx:radius*1.39,ry:radius*.31,transform:'rotate(-24 '+x+' '+y+')',fill:'none',stroke:orbit.colour,'stroke-width':2}));
      else if(id==='ocean')for(const [dx,dy,r] of [[-.36,-.22,.27],[.39,.22,.20]])hit.append(mark('circle',{cx:x+dx*radius,cy:y+dy*radius,r:r*radius,fill:'none',stroke:'#b7d6e2','stroke-width':1}));
      else if(id==='alpha'||id==='beta')for(const [dx,dy,r] of [[-.34,-.05,.40],[.40,.20,.30]])hit.append(mark('ellipse',{
        cx:x+dx*radius,cy:y+dy*radius,rx:r*radius*.53,ry:r*radius,
        fill:id==='alpha'?'#b5c962':'#8e544e',stroke:id==='alpha'?'#538655':'#f7c75b','stroke-width':1}));
      hit.onclick=()=>onSelect?.(id);
      hit.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect?.(id);}};
    }
    if(ship){
      const [x,y]=xy(ship),dock=mark('rect',{x:x-3,y:y-3,width:6,height:6,fill:'#fff',style:'cursor:pointer'});
      dock.onclick=()=>onSelect?.('dock');
    }
    layout.draw(svg,xy,id=>onSelect?.(id),selected,'data-pano-planet');
    if(focus)Array.from(svg.querySelectorAll('[data-nav-label]')).find(el=>el.dataset.navLabel===focus)?.focus({preventScroll:true});
}
