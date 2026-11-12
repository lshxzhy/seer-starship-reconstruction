// Latitude and longitude are radians. One scene unit is one metre. East, up,
// south form a right-handed local frame everywhere, including at the poles.
// A district keeps its authored metre chart. Its anchor, rather than its
// meshes, chooses where it belongs on the globe. Connected underground rooms
// share an anchor so their entrance, slope and roof remain continuous.
function createSurfaceLayout(radius,sites,groups,scale=1.7){
  const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
  const regions=groups.map(([ids,lat,lon])=>{
    const members=ids.map(id=>sites.find(s=>s.id===id)).filter(Boolean),origin=members[0];
    return {ids,members,x:origin.x,z:origin.z,lat,lon};
  });
  function source(x,z){
    let best=Infinity,result=regions[0];
    for(const region of regions)for(const site of region.members){
      const d=Math.hypot(x-site.x,z-site.z);if(d<best){best=d;result=region;}
    }
    return result;
  }
  function move(lat,lon,east,north){
    const d=Math.hypot(east,north);if(!d)return {lat,lon};
    const a=d/radius,s=Math.sin(a),c=Math.cos(a),cl=Math.cos(lat),sl=Math.sin(lat);
    const x=cl*c-sl*north/d*s,y=east/d*s;
    return {lat:Math.atan2(sl*c+cl*north/d*s,Math.hypot(x,y)),lon:wrap(lon+Math.atan2(y,x))};
  }
  function displacement(region,lat,lon){
    const d=wrap(lon-region.lon),c=Math.cos(lat),s=Math.sin(lat);
    const east=c*Math.sin(d),north=Math.cos(region.lat)*s-Math.sin(region.lat)*c*Math.cos(d);
    const dot=Math.sin(region.lat)*s+Math.cos(region.lat)*c*Math.cos(d),length=Math.hypot(east,north);
    if(length<1e-10&&dot<0)return {x:Math.PI*radius,z:0,distance:Math.PI*radius};
    const factor=length>1e-10?radius*Math.atan2(length,dot)/length:radius;
    return {x:east*factor,z:-north*factor,distance:radius*Math.atan2(length,dot)};
  }
  function fromXZ(x,z,region=source(x,z)){
    return move(region.lat,region.lon,(x-region.x)*scale,-(z-region.z)*scale);
  }
  function chart(lat,lon){
    let best=null,second=Infinity;
    for(const region of regions){
      const p=displacement(region,lat,lon);
      if(!best||p.distance<best.distance){second=best?.distance??Infinity;best={...p,region};}
      else second=Math.min(second,p.distance);
    }
    return {x:best.region.x+best.x/scale,z:best.region.z+best.z/scale,region:best.region,distance:best.distance,edge:second-best.distance};
  }
  // Every point belongs to a real spherical district, including both poles.
  // Only neighbouring district boundaries blend; there is no unassigned belt.
  function weights(lat,lon){
    const samples=regions.map(region=>({...displacement(region,lat,lon),region}));
    const nearest=Math.min(...samples.map(p=>p.distance)),band=Math.min(180,radius*.24);
    let total=0;
    for(const p of samples){p.weight=Math.max(0,1-(p.distance-nearest)/band)**2;total+=p.weight;}
    return samples.filter(p=>p.weight>0).map(p=>({...p,x:p.region.x+p.x/scale,z:p.region.z+p.z/scale,weight:p.weight/total}));
  }
  function detail(p){
    if(!p.region)return 1;
    let own=Infinity,other=Infinity;
    for(const region of regions)for(const site of region.members){
      const d=Math.hypot(p.x-site.x,p.z-site.z);
      if(region===p.region)own=Math.min(own,d);else other=Math.min(other,d);
    }
    const edge=Math.max(0,Math.min(1,(other-own)/24));
    const extent=Math.max(0,Math.min(1,(360-own)/100));
    const border=Math.max(0,Math.min(1,(p.edge??Infinity)/140));
    return edge*edge*(3-2*edge)*extent*extent*(3-2*extent)*border*border*(3-2*border);
  }
  return {radius,scale,regions,source,move,chart,weights,detail,fromXZ,displacement};
}

const KLOSE_WORLD = (() => {
  const radius = 900, latitude = .32, longitude = .54;
  const locations = [
    ['grassland','克洛斯星草原',0,0,'黄晶矿露头、花草和野生皮皮'],
    ['swamp','克洛斯星沼泽',-174,12,'沿泥潭之间的陆桥穿过仙人球栖地'],
    ['forest','克洛斯星林间',-304,-91,'草系 SPT 首领蘑菇怪（10 级）与依依的洞口'],
    ['vineway','藤蔓通道',-198,103,'顺着盘根覆盖的斜坡进入地层'],
    ['core','克洛斯星地心',-224,191,'洞厅深处的能量池与克洛斯金刚石'],
    ['wetland','克洛斯星的湿地',4,-166,'精灵捕猎场的湿地、水道和芦苇'],
    ['flame','烈焰丛林',135,-104,'赤红林木与神狐栖地'],
    ['sanctuary','神宠之境',132,62,'从草原支线进入的封神之地']
  ];
  const sites = locations.map(([id,name,x,z,description]) => ({
    id,name,x,z,lat:latitude-z/radius,lon:longitude+x/(radius*Math.cos(latitude)),description,
    ...(id==='swamp'?{lookAt:[x,z-13],lookPitch:.08}:{})
  }));
  const routes = [['grassland','swamp'],['swamp','forest'],['swamp','vineway'],['vineway','core'],
    ['grassland','wetland'],['grassland','flame'],['grassland','sanctuary'],['wetland','flame']];
  const rings={normal:[-.068462,.759343,.647078],inner:1.64,outer:1.98};
  // Keep the classic walking district together. These natural clearings give
  // a 13 m landing craft room for its wings and aft ramp, away from the trails.
  const landingSites=[
    ['grassland','草原南坪',2,39],['swamp','沼泽东岸',-136,29],
    ['forest','林间南缘',-305,-40],['vineway','藤蔓通道外沿',-242,124],
    ['wetland','湿地东岸',47,-173],['flame','烈焰丛林东缘',179,-109],
    ['sanctuary','神宠高地东坪',177,68],
    ['ridge','蓝脊山鞍部',570,-295],['delta','金河口高岸',-545,-590],
    ['grove','绯叶林台',900,395]
  ].map(([id,name,x,z])=>({id,name,x,z,lat:latitude-z/radius,lon:longitude+x/(radius*Math.cos(latitude))}));
  const layout=createSurfaceLayout(radius,[...sites,...landingSites.filter(p=>!sites.some(s=>s.id===p.id))],[
    [['grassland'],latitude,longitude],[['swamp'],.16,2.12],[['forest'],.65,-2.48],
    [['vineway','core'],-.52,-.92],[['wetland'],1.02,.91],[['flame'],-.64,2.36],
    [['sanctuary'],-.47,-2.69],[['ridge'],.63,-.65],[['delta'],-1.00,.33],[['grove'],.08,-1.60]
  ]);
  for(const site of [...sites,...landingSites])Object.assign(site,layout.fromXZ(site.x,site.z));
  return {id:'klose',name:'克洛斯星',radius,sites,routes,rings,landingSites,layout,previousRadius:48000};
})();

function createKloseTerrain(T, definition = KLOSE_WORLD) {
  const {radius,sites,routes,landingSites} = definition;
  const origin = sites[0], byId = new Map(sites.map(site=>[site.id,site]));
  const tau = 2*Math.PI, clamp = (v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  function smooth(a,b,v) {
    const t = clamp((v-a)/(b-a)); return t*t*(3-2*t);
  }
  function unwrap(v) {return Math.atan2(Math.sin(v),Math.cos(v));}
  function frame(lat,lon) {
    const c=Math.cos(lat),s=Math.sin(lat),u=Math.cos(lon),v=Math.sin(lon);
    const up=new T.Vector3(c*u,s,-c*v), east=new T.Vector3(-v,0,-u);
    const north=new T.Vector3(-s*u,c,s*v),south=north.clone().negate();
    const quaternion=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(east,up,south));
    return {up,east,north,south,quaternion};
  }
  function move(lat,lon,east,north) {
    const dist=Math.hypot(east,north);
    if (!dist) return {lat,lon};
    const angle=dist/radius, sinA=Math.sin(angle),cosA=Math.cos(angle),c=Math.cos(lat),s=Math.sin(lat);
    // Exp-map in a Cartesian tangent frame stays regular on both poles.
    const forward=north/dist,side=east/dist, radial=c*cosA-s*forward*sinA;
    return {lat:Math.atan2(s*cosA+c*forward*sinA,Math.hypot(radial,side*sinA)),
      lon:unwrap(lon+Math.atan2(side*sinA,radial))};
  }
  function chart(lat,lon) {return definition.layout.chart(lat,lon);}
  function section(x,z,a,b) {
    const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz));
    return {distance:Math.hypot(x-a.x-t*dx,z-a.z-t*dz),t};
  }
  const lanes=routes.map(([a,b])=>[byId.get(a),byId.get(b)]);
  function trail(x,z) {
    let nearest=Infinity;
    for (const [a,b] of lanes) nearest=Math.min(nearest,section(x,z,a,b).distance);
    return nearest;
  }
  const pools = [
    ['swamp',12,-16,8.7,5.4],['swamp',18,13,12,6],['swamp',-18,14,10,6],
    ['wetland',-21,-13,18,10],['wetland',18,17,10,9],['wetland',14,-23,13,6],
    ['core',-6,-14,10,5]
  ].map(([id,dx,dz,rx,rz])=>({id,dx,dz,rx,rz,x:byId.get(id).x+dx,z:byId.get(id).z+dz}));
  // Ochre headlands behind the blue sod of map 10. The same field supplies
  // the walking surface, the flight altimeter and the far mesh silhouette.
  const heads=[[-62,-105,44,27,15],[68,-141,47,25,20],[-105,-198,55,30,23],
    [-30,-262,58,30,25],[89,-277,71,38,31],[158,-236,53,27,19]];
  function sandstone(x,z){
    if(z>-65||z< -345||x< -193||x>235)return 0;
    let rise=0;
    for(const [cx,cz,w,d,h] of heads){
      const u=(x-cx)/w,v=(z-cz)/d;
      if(Math.abs(u)>1.38||Math.abs(v)>1.38)continue;
      const r=Math.hypot(u+.10*Math.sin(v*4),v+.12*Math.sin(u*5.4))+.055*Math.cos(11*u+5*v);
      rise=Math.max(rise,h*(.56*(1-smooth(.49,1.30,r))+.33*(1-smooth(.54,.85,r))+.11*(1-smooth(.22,.46,r))));
    }
    if(!rise)return 0;
    return rise*smooth(5.5,18,trail(x,z));
  }
  // Make the lake floors depressions in the same field that supports the avatar.
  // The concentric contours and water elevation therefore also meet on the banks.
  function landscape(x,z) {
    const waves=1.7*Math.sin(x*.027+.3)*Math.cos(z*.022)+.95*Math.sin(z*.043-x*.012);
    const outside=smooth(24,85,Math.hypot(x,z));
    let h=120+waves*(.28+.72*outside)+Math.sin(x*.071+z*.052)*.16+sandstone(x,z);
    for (const pool of pools) {
      const d=Math.hypot((x-pool.x)/pool.rx,(z-pool.z)/pool.rz);
      if (d<1.22) h-=(1-smooth(.7,1.22,d))*(pool.id==='core'?1.6:1.25);
    }
    const swamp=byId.get('swamp'),core=byId.get('core'),cut=section(x,z,swamp,core);
    h-= (1-smooth(32,72,cut.distance))*smooth(.08,.87,cut.t)*30;
    return h;
  }
  // A tiled 3D lattice is sampled on the unit sphere. Adjacent map edges and
  // both poles therefore have the same geography at every level of detail.
  const lattice=new Float32Array(64*64*64);
  let noiseSeed=19491307;
  for(let i=0;i<lattice.length;i++){
    noiseSeed=(Math.imul(noiseSeed,1664525)+1013904223)>>>0;lattice[i]=noiseSeed/2147483648-1;
  }
  function noise(x,y,z) {
    let ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
    let a=x-ix,b=y-iy,c=z-iz;a=a*a*(3-2*a);b=b*b*(3-2*b);c=c*c*(3-2*c);
    ix&=63;iy&=63;iz&=63;
    const jx=(ix+1)&63,jy=((iy+1)&63)<<6,jz=((iz+1)&63)<<12;
    iy<<=6;iz<<=12;
    const v00=lattice[ix|iy|iz]*(1-a)+lattice[jx|iy|iz]*a;
    const v01=lattice[ix|jy|iz]*(1-a)+lattice[jx|jy|iz]*a;
    const v10=lattice[ix|iy|jz]*(1-a)+lattice[jx|iy|jz]*a;
    const v11=lattice[ix|jy|jz]*(1-a)+lattice[jx|jy|jz]*a;
    return (v00*(1-b)+v01*b)*(1-c)+(v10*(1-b)+v11*b)*c;
  }
  function fractal(x,y,z) {
    return .52*noise(x,y,z)+.28*noise(7+z*2.07,19+x*2.07,5+y*2.07)
      +.14*noise(13+y*4.23,7+z*4.23,19+x*4.23)+.06*noise(17+x*8.61,31+y*8.61,7+z*8.61);
  }
  function bedrock(x,y,z) {
    const dx=noise(7+x*3.7,2+y*3.7,z*3.7),dz=noise(8+z*3.1,x*3.1,13+y*3.1);
    const c=fractal(11+x*3.3+.8*dx,14+y*3.1+.6*dz,7+z*3.3+.7*dx);
    const cap=.64*(1-smooth(.03,.40,Math.hypot(x-.814,y-.315,z+.488)));
    return c*1.72+.11*fractal(3+14*x,11+14*y,8+14*z)+cap-.03;
  }
  // The survey province outside the painted maps is a mountain watershed.
  // One continuous field describes its drainage, forest cover and relief at
  // every scale. The broad colour belts remain visible from deep space.
  function landform(lat,lon,x,z,out){
    const d=Math.hypot(x,z),globalWeight=smooth(1100,2200,d);
    let h=120,water=0,rock=0,forest=0;
    if(d>350 && globalWeight<1){
      // The survey watershed and its three landing shelves share a 1:5 map
      // scale. The connected classic clearings still have metre-scale actors.
      const sx=x*25,sz=z*25;
      const hills=fractal(sx*.00032,18,sz*.00032),grain=noise(sx*.0015,5,sz*.0015);
      const crest=sx-(12500+sz*.14+2600*Math.sin(sz/7800)+950*Math.sin(sz/2300));
      const ridge=Math.exp(-((crest/3400)**2));
      const shoulders=Math.exp(-((crest/7200)**2));
      const bank=sx-(-8100+.33*sz+1320*Math.sin(sz/3700)+430*Math.sin(sz/1900));
      const flood=1-smooth(110,820,Math.abs(bank));
      const lake=Math.hypot((sx+10300)/4150,(sz+15100)/2050)+hills*.13;
      const valley=lake<1.38?Math.max(flood,1-smooth(.97,1.38,lake)):flood;
      const shelf=smooth(-.43,.18,hills)*smooth(3500,13000,sz)*smooth(12000,22000,sx);
      rock=clamp(ridge*(.67+.33*grain)+shoulders*.17);
      forest=clamp((.45+.68*hills+.19*grain+shelf*.53)*(1-rock)*(1-valley));
      const drainage=Math.min(Math.abs(bank)-135-(hills+1)*62,(lake-1)*1670);
      water=1-smooth(-7,8,drainage);
      const ridgeline=260+420*(.52+.30*Math.sin(sz/4650)+.18*Math.cos(sz/1300));
      const upland=138+70*hills+15*grain+ridge*ridgeline+130*shoulders+shelf*145;
      const channel=56+Math.max(0,drainage)*.09;
      h=T.MathUtils.lerp(upland,channel,valley);
      const inner=smooth(350,580,d);
      h=120+(h-120)*inner;forest*=inner;rock*=inner;water*=inner;
    }
    if(globalWeight>0){
      const c=Math.cos(lat),sx=c*Math.cos(lon),sy=Math.sin(lat),sz=-c*Math.sin(lon);
      const plate=bedrock(sx,sy,sz),wide=fractal(46*sx,46*sy,46*sz);
      const ridge=1-Math.min(1,Math.abs(fractal(31*sx,31*sy,31*sz))*3.2);
      const mountains=smooth(.14,.72,plate)*ridge*ridge;
      const continents=Math.max(0,plate+.18)*360+mountains*(235+320*(.5+.5*wide));
      h=T.MathUtils.lerp(h,39+continents,globalWeight);
      water=T.MathUtils.lerp(water,1-smooth(-.186,-.173,plate),globalWeight);
      rock=T.MathUtils.lerp(rock,mountains,globalWeight);
      forest=T.MathUtils.lerp(forest,smooth(-.17,.07,plate)*(1-mountains)*(.5+.48*wide),globalWeight);
    }
    if(d<720)h=T.MathUtils.lerp(landscape(x,z),h,smooth(350,720,d));
    out.height=h;out.water=water;out.rock=rock;out.forest=forest;
    return out;
  }
  const pads=landingSites.map(s=>({...s,elevation:landform(s.lat,s.lon,s.x,s.z,{}).height}));
  function closestPad(x,z,limit){
    let best=null,bestDistance=limit;
    for(const p of pads) {
      if(Math.abs(p.x-x)>bestDistance||Math.abs(p.z-z)>bestDistance)continue;
      const distance=Math.hypot(p.x-x,p.z-z);
      if(distance<bestDistance){best=p;bestDistance=distance;}
    }
    return best;
  }
  function sample(lat,lon,x,z,out){
    landform(lat,lon,x,z,out);
    const projected=chart(lat,lon),detail=definition.layout.detail(projected);
    const c=Math.cos(lat),sx=c*Math.cos(lon),sy=Math.sin(lat),sz=-c*Math.sin(lon);
    const field=fractal(sx*9,sy*9,sz*9),ridge=1-Math.min(1,Math.abs(fractal(sx*18,sy*18,sz*18))*2.8);
    const broad={height:0,water:0,rock:0,forest:0},biomes=definition.layout.weights(lat,lon);
    for(const p of biomes){
      const id=p.region.ids[0];let h=120+15*field,water=0,rock=.12,forest=.40;
      if(id==='swamp'){h=114+8*field;water=.65*smooth(-.14,.16,field);forest=.43;}
      else if(id==='forest'){h=122+26*field;forest=.92;rock=.18;}
      else if(id==='vineway'){h=106+34*field+17*ridge;forest=.70;rock=.55;}
      else if(id==='wetland'){h=113+9*field;water=.72*smooth(-.08,.20,field);forest=.52;}
      else if(id==='flame'){h=136+32*field+24*ridge;forest=.66;rock=.48;}
      else if(id==='sanctuary'){h=143+20*field+20*ridge*ridge;forest=.37;rock=.43;}
      else if(id==='ridge'){h=172+42*field+80*ridge*ridge;forest=.13;rock=.89;}
      else if(id==='delta'){h=96+13*field;water=.78*(1-smooth(.06,.20,Math.abs(field)));forest=.47;}
      else if(id==='grove'){h=128+24*field;forest=.96;rock=.14;}
      broad.height+=h*p.weight;broad.water+=water*p.weight;broad.rock+=rock*p.weight;broad.forest+=forest*p.weight;
    }
    out.biomes=biomes;out.region=projected.region;out.coreDetail=detail;
    if(detail<1){
      for(const key of ['height','water','rock','forest'])out[key]=T.MathUtils.lerp(broad[key],out[key],detail);
    }
    const pad=closestPad(x,z,54);
    if(pad&&detail>.5){
      const blend=smooth(20,54,Math.hypot(pad.x-x,pad.z-z));
      out.height=T.MathUtils.lerp(pad.elevation,out.height,blend);
      out.water*=blend;out.rock*=blend;out.forest*=blend;
    }
    return out;
  }
  const heightSample={};
  function height(lat,lon){
    const {x,z}=chart(lat,lon);
    return sample(lat,lon,x,z,heightSample).height;
  }
  function point(lat,lon,above=0) {
    const r=radius+height(lat,lon)+above,c=Math.cos(lat);
    return new T.Vector3(r*c*Math.cos(lon),r*Math.sin(lat),-r*c*Math.sin(lon));
  }
  function siteAt(lat,lon) {
    const p=chart(lat,lon),{x,z}=p;
    let result=null,best=58;
    for (const site of sites) {
      const d=Math.hypot(x-site.x,z-site.z);
      if (d<best&&p.region.ids.includes(site.id)) {best=d; result=site;}
    }
    return result;
  }

  return {sites,origin,tau,clamp,smooth,unwrap,frame,move,chart,trail,pools,noise,fractal,bedrock,
    closestPad,sample,heightSample,height,point,siteAt,sandstone};
}

// The remote navigation sphere and the orbital mesh use the same four bands and gaps.
function addKloseRingBands(T,parent,definition,sunDirection,segments){
  const {inner,outer,normal}=definition.rings,radius=definition.radius;
  const pole=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(...normal).normalize());
  const rotation=new T.Matrix4().makeRotationFromQuaternion(pole);
  const material=new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide,fog:false});
  material.onBeforeCompile=shader=>{
    shader.uniforms.ringSun={value:sunDirection};
    shader.uniforms.inverseRingRadius={value:1/radius};
    shader.vertexShader='uniform float inverseRingRadius; varying vec3 ringPoint;\n'+shader.vertexShader.replace(
      '#include <begin_vertex>','#include <begin_vertex>\nringPoint=position*inverseRingRadius;');
    shader.fragmentShader='uniform vec3 ringSun; varying vec3 ringPoint;\n'+shader.fragmentShader.replace(
      '#include <color_fragment>',`#include <color_fragment>
      float axial=dot(ringPoint,ringSun);
      float clearance=length(ringPoint-axial*ringSun);
      if(axial<0.)diffuseColor.rgb*=mix(.49,1.,smoothstep(.95,1.08,clearance));`);
  };
  material.customProgramCacheKey=()=>'klose-ring-shadow';
  const base=new T.Color(),p=new T.Vector3();
  for(const [a,b,dark,bright] of [[0,.22,'#bd834c','#dfa25e'],[.244,.70,'#efd567','#ffff66'],
    [.707,.89,'#f4d269','#fff484'],[.907,1,'#efbd5a','#ffff77']]){
    const start=T.MathUtils.lerp(inner,outer,a)*radius,end=T.MathUtils.lerp(inner,outer,b)*radius;
    const ring=new T.RingGeometry(start,end,segments,12);
    ring.applyMatrix4(rotation);
    const position=ring.getAttribute('position'),rgb=new Float32Array(position.count*3);
    const low=new T.Color(dark).convertSRGBToLinear(),high=new T.Color(bright).convertSRGBToLinear();
    for(let i=0;i<position.count;i++){
      const t=T.MathUtils.clamp((p.fromBufferAttribute(position,i).length()-start)/(end-start),0,1);
      base.copy(low).lerp(high,.3+.6*t+.07*Math.sin(t*28+a*6)).toArray(rgb,i*3);
    }
    ring.setAttribute('color',new T.BufferAttribute(rgb,3));
    const mesh=new T.Mesh(ring,material);mesh.name='克洛斯星 · 金色环带';parent.add(mesh);
  }
}

function createKloseSurface(T, world, definition = KLOSE_WORLD, ground = createKloseTerrain(T,definition)) {
  const {radius,landingSites}=definition;
  const sceneScale=definition.layout.scale,sceneGroups=[];
  const {sites,origin,tau,clamp,smooth,unwrap,frame,move,chart,trail,pools,noise,fractal,bedrock,
    closestPad,sample,heightSample,height,point,siteAt,sandstone}=ground;
  const root = new T.Group(), orbital = new T.Group(), local = new T.Group();
  root.name = '帕诺星系 · 克洛斯星'; root.add(orbital,local); world.add(root);
  let mode = 'hidden';
  const landings = new Map(landingSites.map(site=>[site.id,site]));
  landings.set('core',landings.get('vineway'));
  const color = hex=>new T.Color(hex).convertSRGBToLinear();
  // Bright-side fills in Taomei's labelled Pano chart, icon 27. The tilted
  // belts and the ring have a single pole in the planet's Cartesian frame.
  const pole=new T.Vector3(...definition.rings.normal).normalize();
  const belts=['#bc969a','#6f7c91','#aa9db5','#999966','#9ab8b1'].map(hex=>new T.Color(hex));
  const boundaries=[-.36,-.13,.36,.76];
  function orbitalAlbedo(x,y,z,field,output){
    const latitude=x*pole.x+y*pole.y+z*pole.z+field*.018;
    let band=0;
    while(band<boundaries.length&&latitude>boundaries[band]+.022)band++;
    output.copy(belts[band]);
    if(band<boundaries.length)
      output.lerp(belts[band+1],smooth(boundaries[band]-.022,boundaries[band]+.022,latitude));
    return output;
  }
  function atlas() {
    const w=512,h=256,body=document.createElement('canvas');
    body.width=w;body.height=h;
    const ctx=body.getContext('2d'),land=ctx.createImageData(w,h),sample=new T.Color();
    const cosines=new Float32Array(w),sines=new Float32Array(w);
    for(let col=0;col<w;col++) {
      const lon=((col+.5)/w-.5)*tau;
      cosines[col]=Math.cos(lon);sines[col]=Math.sin(lon);
    }
    for (let row=0;row<h;row++) {
      const lat=(.5-(row+.5)/h)*Math.PI,c=Math.cos(lat),y=Math.sin(lat);
      for (let col=0;col<w;col++) {
        const x=c*cosines[col],z=-c*sines[col],i=(row*w+col)*4;
        const lon=((col+.5)/w-.5)*tau,p=chart(lat,lon),landscape={};
        ground.sample(lat,lon,p.x,p.z,landscape);
        sample.copy(shade(p.x,p.z,x,y,z,landscape,1)).convertLinearToSRGB();
        land.data[i]=255*sample.r;
        land.data[i+1]=255*sample.g;
        land.data[i+2]=255*sample.b;
        land.data[i+3]=255;
      }
    }
    ctx.putImageData(land,0,0);
    const tex=new T.CanvasTexture(body);tex.encoding=T.sRGBEncoding;tex.wrapS=T.RepeatWrapping;tex.anisotropy=4;return tex;
  }
  let builtOrbit=false,atmosphereRim;
  const shellCenter={value:new T.Vector3()},shellCut={value:2};
  function buildOrbit() {
    if (builtOrbit) return;
    builtOrbit=true;
    const shell=new T.SphereGeometry(1,240,152),v=new T.Vector3();
    const pos=shell.getAttribute('position');
    for(let i=0;i<pos.count;i++){
      v.fromBufferAttribute(pos,i).normalize();
      v.multiplyScalar(radius+height(Math.asin(clamp(v.y,-1,1)),Math.atan2(-v.z,v.x)));
      pos.setXYZ(i,v.x,v.y,v.z);
    }
    pos.needsUpdate=true;shell.computeVertexNormals();shell.computeBoundingSphere();
    const crust=new T.MeshStandardMaterial({map:atlas(),roughness:.91});
    // Remove only the cap replaced by the local relief. Otherwise a coarse
    // triangle spanning a ravine could hide its high-resolution floor.
    crust.onBeforeCompile=shader=>{
      shader.uniforms.shellCenter=shellCenter;shader.uniforms.shellCut=shellCut;
      shader.vertexShader='varying vec3 surfaceRay;\n'+shader.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\n surfaceRay=normalize(position);');
      shader.fragmentShader='uniform vec3 shellCenter;uniform float shellCut;varying vec3 surfaceRay;\n'+
        shader.fragmentShader.replace('#include <clipping_planes_fragment>',
          '#include <clipping_planes_fragment>\n if(dot(normalize(surfaceRay),shellCenter)>shellCut) discard;');
    };
    orbital.add(new T.Mesh(shell,crust));
    const sun=frame(origin.lat,origin.lon);
    const light=sun.up.multiplyScalar(.76).addScaledVector(sun.east,-.8).addScaledVector(sun.north,-.22).normalize();
    addKloseRingBands(T,orbital,definition,light,220);
    const rim=new T.ShaderMaterial({vertexShader:
      'varying vec3 n; varying vec3 v; void main(){ vec4 p=modelViewMatrix*vec4(position,1.); n=normalize(normalMatrix*normal); v=normalize(-p.xyz); gl_Position=projectionMatrix*p; }',
      fragmentShader:'varying vec3 n; varying vec3 v; void main(){ float f=pow(max(0.,1.-abs(dot(normalize(n),normalize(v)))),5.); gl_FragColor=vec4(.61,.63,.71,.26*f); }',
      transparent:true,side:T.BackSide,depthWrite:false});
    atmosphereRim=new T.Mesh(new T.SphereGeometry(radius*1.009,112,64),rim);orbital.add(atmosphereRim);
  }
  // The original scene paintings give trails their local soil colour. In
  // particular, map 10 has a coral clearing framed by broad banks of blue sod.
  const soil = {
    grassland:['#ee7057','#ff9664','#fb795b'],
    swamp:    ['#926331','#c18a45','#ae894b'],
    forest:   ['#806443','#b18a59','#a78655'],
    vineway:  ['#254468','#42789a','#785f61'],
    core:     ['#785c35','#b79666','#92744a'],
    wetland:  ['#234d80','#4c79b1','#436996'],
    flame:    ['#112d59','#26608b','#995040'],
    sanctuary:['#197ba5','#43acda','#d58d64'],
    ridge:['#587f9b','#8aa4b1','#aa9489'],delta:['#a89762','#c4b375','#8d9b72'],
    grove:['#815c7d','#b57a94','#a5806f']
  };
  for (const name of Object.keys(soil)) soil[name]=soil[name].map(color);
  const grassBlue=color('#2a8cbd'),grassTip=color('#58b5d9'),grassMoss=color('#98af45');
  const groundColor=new T.Color(),regionColor=new T.Color(),sodColor=new T.Color(),beltColor=new T.Color();
  const plains=color('#ba8170'),forestColor=color('#34698a'),stoneColor=color('#85687f');
  const goldWater=color('#c49950'),deepWater=color('#476684');
  const lowerBed=color('#b67866'),sunlitBed=color('#edaf84');
  function grassClearing(x,z,variation,trailCoverage) {
    // North is behind the blue-topped rock ledge. Only the northeastern shelf
    // is yellow-green in map 10; the sunny foreground stays coral.
    const edge=Math.max(-z-17+3.5*Math.sin(x*.11),x-21+3*Math.sin(z*.15),
      -x-17+2.8*Math.sin(z*.13),z-26+4*Math.sin(x*.09));
    const coverage=smooth(-3,4,edge+2.8*variation)*(1-.78*trailCoverage);
    sodColor.copy(grassBlue).lerp(grassTip,.25+.5*variation);
    sodColor.lerp(grassMoss,smooth(9,19,x)*(1-smooth(-13,-4,z)));
    regionColor.lerp(sodColor,coverage);
  }
  function shade(x,z,ux,uy,uz,land,detail) {
    const d=Math.hypot(x,z);
    orbitalAlbedo(ux,uy,uz,0,beltColor).convertSRGBToLinear();
    groundColor.setRGB(0,0,0);
    for(const p of land.biomes||[]){const tone=soil[p.region.ids[0]][0];groundColor.r+=tone.r*p.weight;groundColor.g+=tone.g*p.weight;groundColor.b+=tone.b*p.weight;}
    groundColor.lerp(forestColor,clamp(land.forest*1.4));
    groundColor.lerp(stoneColor,.86*land.rock);
    groundColor.lerp(d<13000?goldWater:deepWater,land.water);
    if(d>660)return groundColor;
    const variation=smooth(-.66,.66,noise(x*.066,8,z*.066));
    const trailCoverage=1-smooth(1.2,4.4,trail(x,z));
    const daylight=.94+.09*variation;
    for (const site of sites) {
      if(!land.region.ids.includes(site.id))continue;
      const dx=x-site.x,dz=z-site.z;
      const weight=(1-smooth(50,132,Math.hypot(dx,dz)))*land.coreDetail;
      if (!weight)continue;
      const [shade,light,path]=soil[site.id];
      regionColor.copy(shade).lerp(light,.15+.73*variation);
      if (site.id==='grassland') grassClearing(dx,dz,variation,trailCoverage);
      regionColor.lerp(path,.66*trailCoverage);
      groundColor.lerp(regionColor,weight);
    }
    const bluff=sandstone(x,z);
    if(bluff>.02){
      const ledge=.46+.27*Math.sin(bluff*1.1)+.16*Math.sin(bluff*2.6+x*.08)+.10*variation;
      regionColor.copy(lowerBed).lerp(sunlitBed,ledge);
      groundColor.lerp(regionColor,smooth(.02,4.6,bluff));
    }
    return groundColor.multiplyScalar(daylight);
  }
  function soilMap() {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=192;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#deded8';ctx.fillRect(0,0,192,192);
    let seed=10932;
    const rand=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
    for (let i=0;i<6500;i++) {
      const x=rand()*192,y=rand()*192,b=rand()>.5?255:75;
      ctx.strokeStyle='rgba('+b+','+b+','+b+','+(.08+rand()*.25)+')';
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-1+rand()*2,y+rand()*4);ctx.stroke();
    }
    const tex=new T.CanvasTexture(canvas);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=4;
    tex.encoding=T.sRGBEncoding;return tex;
  }
  // Hand-drawn colour breaks from the eight map paintings. The sheet uses
  // chart metres so the banks and mineral seams stay fixed as the ground LOD moves.
  function clearingPaint() {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
    const ctx=canvas.getContext('2d'),scale=canvas.width/640;
    let seed=170710;
    function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
    function patch(x,z,rx,rz,tint){
      const corners=[];
      for(let i=0;i<9;i++){
        const angle=i*tau/9,edge=.72+.30*rand();
        corners.push([x+rx*Math.cos(angle)*edge,z+rz*Math.sin(angle)*edge]);
      }
      const prev=corners[8],first=corners[0];
      ctx.beginPath();ctx.moveTo((prev[0]+first[0])*.5,(prev[1]+first[1])*.5);
      for(const [i,p] of corners.entries()){
        const next=corners[(i+1)%9];
        ctx.quadraticCurveTo(p[0],p[1],(p[0]+next[0])*.5,(p[1]+next[1])*.5);
      }
      ctx.fillStyle=tint;ctx.fill();
    }
    function arc(x,z,rx,rz,turn,a,b,tint,line){
      ctx.strokeStyle=tint;ctx.lineWidth=line;ctx.beginPath();ctx.ellipse(x,z,rx,rz,turn,a,b);ctx.stroke();
    }
    for(const site of sites){
      ctx.setTransform(scale,0,0,scale,(392+site.x)*scale,(296+site.z)*scale);
      ctx.globalAlpha=.89;ctx.lineCap='round';
      if(site.id==='grassland'){
        for(const [x,z,rx,rz] of [[-5,3,5,1.6],[8,8,3,2],[-9,-10,4.1,2],[10,-6,5.4,2.6],[-2,13,4.2,2.3]]){
          patch(x,z,rx,rz,'#faae66');
          for(let j=0;j<4;j++)patch(x+(rand()-.5)*rx,z+(rand()-.5)*rz,.52+rand(),.38,'#e58851');
        }
        for(let j=0;j<15;j++){
          const x=rand()*30-14,z=rand()*28-10;
          ctx.beginPath();ctx.moveTo(x,z);ctx.lineTo(x+1,z-.8);ctx.lineTo(x+2.3,z-.65);
          ctx.strokeStyle='#b25248';ctx.lineWidth=.27;ctx.stroke();
        }
      }else if(site.id==='swamp'||site.id==='wetland'||site.id==='core'){
        const tones={swamp:['#a68147','#d9ae65','#735d36'],wetland:['#896e91','#afb2bf','#345c98'],core:['#a65b9e','#d086ac','#703d78']}[site.id];
        for(const p of pools.filter(p=>p.id===site.id)){
          arc(p.dx,p.dz,p.rx*1.11,p.rz*1.12,0,0,tau,tones[0],1.55);
          for(let j=0;j<8;j++){
            const a=j*tau/8+rand()*.2;
            arc(p.dx,p.dz,p.rx*1.15,p.rz*1.22,0,a,a+.27+rand()*.23,tones[1],.46);
            patch(p.dx+Math.cos(a)*p.rx*1.24,p.dz+Math.sin(a)*p.rz*1.29,1+rand(),.6,tones[2]);
          }
        }
      }else if(site.id==='forest'){
        for(let j=0;j<34;j++){
          const x=(rand()-.5)*48,z=(rand()-.5)*38;
          patch(x,z,1.8+rand()*2,.8+rand(),j%3?'#a99b58':'#878946');
          arc(x,z,.8,.48,.36,.1,2.0,'#d0bc73',.33);
        }
      }else if(site.id==='vineway'){
        for(let j=0;j<8;j++){
          const x=(j-3.5)*5,z=-11+6*rand();
          ctx.beginPath();ctx.moveTo(x,z);ctx.bezierCurveTo(x+7,z+8,x-9,z+10,x-4,z+22);
          ctx.strokeStyle='#514b48';ctx.lineWidth=1.5;ctx.stroke();
          ctx.strokeStyle='#a48c62';ctx.lineWidth=.56;ctx.stroke();
        }
      }else if(site.id==='flame'){
        for(let j=0;j<20;j++){
          const x=(rand()-.5)*45,z=(rand()-.5)*36,rx=2+rand()*4;
          patch(x,z,rx,rx*.53,'#a35040');patch(x+.2,z-.22,rx*.73,rx*.25,'#c57846');
        }
      }else if(site.id==='sanctuary'){
        for(let j=0;j<18;j++){
          const angle=j*tau/18,rx=8.2+rand()*2;
          const x=Math.cos(angle)*rx,z=-14+Math.sin(angle)*rx;
          patch(x,z,1.25,.9,j%3?'#e8a36b':'#ca827e');
          if(j%3===0)patch(x,z,.55,.38,'#f1bdd1');
        }
        arc(0,-14,12.4,10.8,0,.22,2.77,'#d5a066',.67);
        // Map 943 has magenta insets down the sandstone approach. Paint
        // their layered lips into the trail so broad, flush discs stay walkable.
        for(const [x,z,r] of [[-.8,-6.9,1.45],[.73,-3.2,1.05],[-1.65,-1.3,.68]]){
          patch(x,z,r*1.16,r*.80,'#914653');
          patch(x,z-.08,r,r*.63,'#cf5d82');
          arc(x-.08,z-.08,r*.77,r*.47,-.18,3.4,5.9,'#ec97a3',.24);
        }
      }
    }
    const texture=new T.CanvasTexture(canvas);texture.anisotropy=4;return texture;
  }
  // Geodetic vegetation cells keep their physical size at high latitudes.
  // Collision and drawing request the same deterministic cell contents even
  // when the destination is outside the camera's loaded neighbourhood.
  const tileRows=Math.ceil(Math.PI*radius/240),cache=new Map();
  function tileRow(lat){return clamp(Math.floor((lat/Math.PI+.5)*tileRows),0,tileRows-1);}
  function tileCols(row){return Math.max(1,Math.round(tau*radius*Math.cos(((row+.5)/tileRows-.5)*Math.PI)/240));}
  function tileCol(lon,n){return ((Math.floor((unwrap(lon)/tau+.5)*n)%n)+n)%n;}
  function vegetation(lat,lon,land,size,tree,reach,h,yaw,paint){
    const c=Math.cos(lat),up=new T.Vector3(c*Math.cos(lon),Math.sin(lat),-c*Math.sin(lon));
    return {lat,lon,up,at:up.clone().multiplyScalar(radius+land.height),size,h,reach,yaw,paint,tree,top:land.height+h};
  }
  // The classic grazing grounds are intentionally clear. Put the middle
  // distance in pockets along the banks instead of peppering the whole plain.
  // Their geodetic cell owns both their instances and the collision record.
  const stands=new Map(),standPaint=[0x34677e,0x49859a,0x507b82,0x557965,0x778849];
  let standCount=0;
  for(const [zone,[cx,cz,spread,density,tint]] of [
    [-72,-101,18,11,0],[-37,-111,12,8,0],[-85,-142,21,14,0],[-55,-145,14,8,2],
    [39,-108,18,12,3],[81,-118,15,10,4],[70,-151,16,12,3],[-104,-188,22,14,2],
    [101,-202,24,14,2],[-42,-244,26,15,0],[58,-256,18,12,2]
  ].entries()){
    for(let i=0;i<density;i++){
      const phase=i*2.39996+zone*.91,ring=spread*Math.sqrt(i/density),x=cx+ring*Math.cos(phase),z=cz+ring*.49*Math.sin(phase);
      const size=3.4+(1-ring/spread)*3.0+1.55*Math.sin(i*2.37+zone*.41)**2,reach=size*(.73+.13*Math.cos(i));
      if(trail(x,z)<reach+4||closestPad(x,z,30+reach)||sites.some(s=>Math.hypot(x-s.x,z-s.z)<40+reach))continue;
      const {lat,lon}=definition.layout.fromXZ(x,z),land=sample(lat,lon,x,z,{});
      const row=tileRow(lat),col=tileCol(lon,tileCols(row)),key=row+'/'+col;
      const item=vegetation(lat,lon,land,size,true,reach,size*(1.42+.47*Math.sin(phase)**2),phase,
        standPaint[Math.min(standPaint.length-1,tint+(i%3===0?1:0))]);
      if(!stands.has(key))stands.set(key,[]);
      stands.get(key).push(item);standCount++;
    }
  }
  function tile(row,col,n){
    const key=row+'/'+col;
    if(cache.has(key))return cache.get(key);
    let seed=(Math.imul(row+17,73856093)^Math.imul(col+11,19349663))>>>0;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const items=[],land={};
    for(let i=0;i<34;i++){
      const lat=((row+random())/tileRows-.5)*Math.PI,lon=((col+random())/n-.5)*tau;
      const {x,z,region}=chart(lat,lon);
      if(sites.some(site=>region.ids.includes(site.id)&&Math.abs(x-site.x)<87&&Math.abs(z-site.z)<87)||closestPad(x,z,35))continue;
      sample(lat,lon,x,z,land);
      if(land.water>.15)continue;
      const chance=random(),tree=chance<land.forest*.86;
      if(!tree && chance>.08+land.forest*.86+land.rock*.29)continue;
      const size=(tree?4.2:1.25)*(1+.9*random()+.55*random());
      const reach=size*(tree?.75:1.1),h=size*(tree?1.85:.76);
      const yaw=random()*tau,id=region.ids[0],paint=tree?(id==='grove'?0x975879:id==='flame'?0x975547:standPaint[Math.floor(yaw/tau*3)]):(land.rock>.4?0x816276:0xc18e70);
      items.push(vegetation(lat,lon,land,size,tree,reach,h,yaw,paint));
    }
    if(stands.has(key))items.push(...stands.get(key));
    if(cache.size>=192)cache.delete(cache.keys().next().value);
    cache.set(key,items);return items;
  }
  function visitTiles(lat,lon,span,accept){
    const center=tileRow(lat);
    for(let row=Math.max(0,center-span);row<=Math.min(tileRows-1,center+span);row++){
      const n=tileCols(row),mid=tileCol(lon,n);
      for(let j=mid-span;j<=mid+span&&j<mid-span+n;j++){
        const col=((j%n)+n)%n;
        accept(tile(row,col,n));
      }
    }
  }
  function scatterTop(lat,lon,footprint){
    let top=-Infinity;
    const cos=Math.cos(lat);
    visitTiles(lat,lon,1,items=>{
      for(const it of items){
        const dist=Math.hypot((it.lat-lat)*radius,unwrap(it.lon-lon)*radius*cos);
        if(dist<footprint+it.reach)top=Math.max(top,it.top);
      }
    });
    return top;
  }
  const groves=new T.Group();groves.name='巡航林冠与山地露岩';local.add(groves);
  let forestRow=-1,forestCol=-1,treeTrunks,treeCrowns,rocks;
  // Six overlapping, wind-bent sprays form a single silhouette. Each spray is
  // fluted on top and undercut along the skirt, with local pigment and shadow
  // baked into its vertices. All trees still use one instanced crown draw.
  function layeredCrown(){
    const v=[],rgb=[],idx=[],sides=16;
    const profile=[[-.77,.05],[-.52,.59],[-.26,.93],[-.12,1],[.26,.82],[.59,.45],[.68,.01]];
    for(const [j,[x,y,z,w,h,d,turn]] of [
      [-.10,.38,-.06,.56,.82,.55,.39],[-.42,.02,.09,.50,.65,.44,1.35],
      [.42,.16,-.17,.49,.75,.45,2.55],[.13,-.15,.43,.48,.60,.46,.70],
      [.04,.02,-.46,.44,.65,.48,1.84],[-.36,-.42,-.33,.36,.51,.38,.26]
    ].entries()){
      const start=v.length/3;
      for(const [row,[height,r]] of profile.entries())for(let k=0;k<sides;k++){
        const a=tau*k/sides,fold=Math.cos(a*5+turn+height*.76),grain=.90+.13*fold+.055*Math.sin(a*3+turn);
        const rx=w*Math.cos(a)*r*grain,rz=d*Math.sin(a)*r*grain;
        v.push(x+rx*Math.cos(turn)+rz*Math.sin(turn)+height*.09,
          y+h*(height+(.13*fold+.09*Math.cos(a*2+turn))*r),z-rx*Math.sin(turn)+rz*Math.cos(turn));
        const light=.65+.29*(height+.77)/1.45+.10*fold*r+.14*(j===0?1:0);
        rgb.push(light*(.93+.04*Math.cos(a)),light,light*(1.06-.11*(height+.77)));
        if(row<profile.length-1){
          const b=start+row*sides+k,c=start+row*sides+(k+1)%sides;
          idx.push(b,b+sides,c,c,b+sides,c+sides);
        }
      }
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));
    g.setAttribute('color',new T.Float32BufferAttribute(rgb,3));g.setIndex(idx);g.computeVertexNormals();return g;
  }
  function updateGroves(lat,lon,altitude){
    groves.visible=altitude<3100;
    if(!groves.visible)return;
    const row=tileRow(lat),col=tileCol(lon,tileCols(row));
    if(row===forestRow&&col===forestCol)return;
    forestRow=row;forestCol=col;
    if(!treeTrunks){
      const batch=(geometry,paint,tinted)=>{
        const material=new T.MeshStandardMaterial({color:paint,roughness:.94,vertexColors:geometry.hasAttribute('color')});
        const meshes=new T.InstancedMesh(geometry,material,34*49+standCount);
        if(tinted)meshes.instanceColor=new T.InstancedBufferAttribute(new Float32Array(meshes.count*3),3);
        meshes.frustumCulled=false;meshes.receiveShadow=true;groves.add(meshes);return meshes;
      };
      // One trunk instance includes the flared foot and three rising boughs.
      // Its upper forks join the crown within the existing clearance envelope.
      const bark=[],barkTint=[],tri=[];
      function limb(centres){
        const start=bark.length/3;
        for(const [j,[x,y,z,r]] of centres.entries())for(let k=0;k<7;k++){
          const a=k*tau/7+j*.06,v=.70+.18*(Math.cos(a-.5)+1)*.5+.08*j/(centres.length-1);
          bark.push(x+r*Math.cos(a),y,z+r*Math.sin(a));barkTint.push(v+.025,v,v*.92);
          if(j){
            const i=start+(j-1)*7+k,n=start+(j-1)*7+(k+1)%7;
            tri.push(i,i+7,n,n,i+7,n+7);
          }
        }
      }
      limb([[0,-.50,0,1],[.15,-.31,-.05,.67],[-.13,.04,.12,.55],[.04,.48,.04,.36]]);
      for(let j=0;j<3;j++){
        const a=j*tau/3+.6,c=Math.cos(a),s=Math.sin(a);
        limb([[-.10,-.02,.10,.43],[1.35*c,.20,1.35*s,.28],[2.15*c,.48,2.15*s,.13]]);
      }
      const trunk=new T.BufferGeometry();
      trunk.setAttribute('position',new T.Float32BufferAttribute(bark,3));trunk.setAttribute('color',new T.Float32BufferAttribute(barkTint,3));
      trunk.setIndex(tri);trunk.computeVertexNormals();
      treeTrunks=batch(trunk,0x735548,false);
      treeCrowns=batch(layeredCrown(),0xffffff,true);
      rocks=batch(new T.DodecahedronGeometry(1),0xffffff,true);
    }
    const anchor=point(lat,lon);groves.position.copy(anchor);
    const transform=new T.Object3D(),axisY=new T.Vector3(0,1,0),paint=new T.Color();
    let trees=0,stones=0;
    visitTiles(lat,lon,3,items=>{
      for(const it of items){
        transform.quaternion.setFromUnitVectors(axisY,it.up);transform.rotateY(it.yaw);
        transform.position.copy(it.at).sub(anchor);
        if(it.tree){
          transform.position.addScaledVector(it.up,it.h*.34);
          transform.scale.set(it.size*.16,it.h*.68,it.size*.16);transform.updateMatrix();
          treeTrunks.setMatrixAt(trees,transform.matrix);
          transform.position.addScaledVector(it.up,it.h*.33);
          transform.scale.set(it.reach,it.h*.34,it.reach*.94);transform.updateMatrix();
          treeCrowns.setMatrixAt(trees,transform.matrix);treeCrowns.setColorAt(trees++,paint.setHex(it.paint).convertSRGBToLinear());
        }else{
          transform.position.addScaledVector(it.up,it.h*.42);
          transform.scale.set(it.reach,it.h*.58,it.reach*.81);transform.updateMatrix();
          rocks.setMatrixAt(stones,transform.matrix);rocks.setColorAt(stones++,paint.setHex(it.paint).convertSRGBToLinear());
        }
      }
    });
    for(const [mesh,count] of [[treeTrunks,trees],[treeCrowns,trees],[rocks,stones]]){
      mesh.count=count;mesh.instanceMatrix.needsUpdate=true;
      if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    }
  }
  const groundGroup=new T.Group(); local.add(groundGroup);
  let lastFocus=null,terrain=null,details=null,groundTime=0,safariState=null;
  const diskRadius=radius*.82;
  const groundInverse=new T.Quaternion(),groundQuery=new T.Vector3();
  // A 37 cm animal can visibly sink between samples of a coarser terrain
  // ring. Interpolate the rendered triangle directly beneath its feet.
  function groundCorrection(lat,lon){
    if(!lastFocus||!terrain)return 0;
    groundQuery.copy(point(lat,lon)).sub(groundGroup.position).applyQuaternion(groundInverse);
    const {x,y,z}=groundQuery,dist=Math.hypot(x,z);
    if(dist<1e-7)return -y;
    const {sectors,geo}=terrain,angle=(Math.atan2(z,x)+tau)%tau;
    const angleStep=tau/sectors,i=Math.min(sectors-1,Math.floor(angle/angleStep));
    // Ring edges are chords between adjacent radial vertices.
    const along=dist*Math.cos(angle-(i+.5)*angleStep)/Math.cos(angleStep*.5);
    const ring=lastFocus.rings.findIndex(range=>range>=along);
    if(ring<0)return 0;
    const pts=geo.attributes.position;
    function onFace(a,b,c){
      const ax=pts.getX(a),az=pts.getZ(a),dx=x-ax,dz=z-az;
      const bx=pts.getX(b)-ax,bz=pts.getZ(b)-az,cx=pts.getX(c)-ax,cz=pts.getZ(c)-az;
      const det=bx*cz-bz*cx;
      const u=(dx*cz-dz*cx)/det,v=(bx*dz-bz*dx)/det;
      if(u<-.00001||v<-.00001||u+v>1.00001)return null;
      return pts.getY(a)*(1-u-v)+pts.getY(b)*u+pts.getY(c)*v-y;
    }
    for(let j=Math.max(1,ring-1);j<=Math.min(terrain.radii.length-1,ring+1);j++){
      const a=1+(j-1)*sectors+i,b=1+(j-1)*sectors+(i+1)%sectors;
      const delta=j===1?onFace(0,b,a):onFace(a-sectors,b,a)??onFace(b-sectors,b,a-sectors);
      if(delta!==null)return delta;
    }
    return 0;
  }
  function padClear(x,z,margin=0){return Boolean(closestPad(x,z,30+margin));}
  function ensureScenery(){
    if(!details){
      const container={add(group){group.scale.setScalar(sceneScale);sceneGroups.push(group);local.add(group);}};
      details=createKloseScenery(T,container,{sites,pools,radius:radius/sceneScale,sceneScale,point,frame,
        move:(lat,lon,e,n)=>move(lat,lon,e*sceneScale,n*sceneScale),chart,trail,
        height:(lat,lon)=>height(lat,lon)/sceneScale,padClear,
        groundCorrection:(lat,lon)=>groundCorrection(lat,lon)/sceneScale});
      details.setSafariState(safariState);
    }
    return details;
  }
  function buildGround() {
    if (terrain) return;
    const radii=[0,.8,1.7,2.8,4,5.5,7.2,9.2,12,15,19,24,30,37,45,55,67,81,99,120,146,180,220,270,335,415,520,660,835,1050,1350,1750,2250,3000,4200,5700,8000,11500,16500,24000].filter(r=>r<diskRadius);
    radii.push(diskRadius);
    const sectors=96, coords=[[0,0,0]],indices=[];
    for (let ring=1;ring<radii.length;ring++) {
      for (let i=0;i<sectors;i++) {
        const angle=tau*i/sectors;coords.push([Math.cos(angle),Math.sin(angle),ring]);
        const a=1+(ring-1)*sectors+i,b=1+(ring-1)*sectors+(i+1)%sectors;
        if (ring===1) indices.push(0,b,a);
        else indices.push(a-sectors,b,a,b-sectors,b,a-sectors);
      }
    }
    const geo=new T.BufferGeometry();
    for (const [attr,stride] of [['position',3],['color',3],['uv',2]]) geo.setAttribute(attr,new T.BufferAttribute(new Float32Array(coords.length*stride),stride));
    geo.setIndex(indices);
    const material=new T.MeshStandardMaterial({map:soilMap(),vertexColors:true,roughness:.98}),paint=clearingPaint();
    material.onBeforeCompile=shader=>{
      shader.uniforms.clearingPaint={value:paint};
      shader.vertexShader='varying vec2 clearingUV;\n'+shader.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\nclearingUV=(uv*2.4+vec2(392.,296.))/640.;clearingUV.y=1.-clearingUV.y;');
      shader.fragmentShader='uniform sampler2D clearingPaint;varying vec2 clearingUV;\n'+shader.fragmentShader.replace('#include <color_fragment>',
        '#include <color_fragment>\nvec4 motif=texture2D(clearingPaint,clearingUV);diffuseColor.rgb=mix(diffuseColor.rgb,pow(motif.rgb,vec3(2.2)),.8*motif.a);');
    };
    const mesh=new T.Mesh(geo,material);
    mesh.receiveShadow=true;mesh.frustumCulled=false;groundGroup.add(mesh);
    terrain={coords,geo,radii,sectors,paint,writeBed:finishSurveyGround(T,geo,material,KLOSE_WORLD,2.4)};
    ensureScenery();
  }
  function placeGround(lat,lon,altitude) {
    const {coords,geo,radii}=terrain,anchor=point(lat,lon),f=frame(lat,lon);
    const pos=geo.attributes.position,col=geo.attributes.color,uv=geo.attributes.uv;
    groundGroup.position.copy(anchor);groundGroup.quaternion.copy(f.quaternion);
    const profile=1-.39*smooth(50,3400,altitude),fine=1-smooth(1000,7800,altitude);
    const sections=radii.map(r=>{
      const range=diskRadius*Math.pow(r/diskRadius,profile);
      return {sin:Math.sin(range/radius),cos:Math.cos(range/radius),detail:fine*(1-smooth(diskRadius*.23,diskRadius*.8,range))};
    });
    const land={},anchorRadius=anchor.length(),dir=new T.Vector3();
    for (let i=0;i<coords.length;i++) {
      const [east,south,j]=coords[i],ring=sections[j];
      dir.copy(f.up).multiplyScalar(ring.cos).addScaledVector(f.east,east*ring.sin).addScaledVector(f.south,south*ring.sin);
      const vlat=Math.asin(clamp(dir.y,-1,1)),vlon=Math.atan2(-dir.z,dir.x),{x,z}=chart(vlat,vlon);
      sample(vlat,vlon,x,z,land);
      const distance=radius+land.height;
      pos.setXYZ(i,east*ring.sin*distance,ring.cos*distance-anchorRadius,south*ring.sin*distance);
      const s=shade(x,z,dir.x,dir.y,dir.z,land,ring.detail);
      col.setXYZ(i,s.r,s.g,s.b);uv.setXY(i,x/2.4,z/2.4);
      terrain.writeBed(i,x,z,vlat,vlon);
    }
    pos.needsUpdate=col.needsUpdate=uv.needsUpdate=true;geo.computeVertexNormals();
    groundInverse.copy(f.quaternion).invert();
    shellCenter.value.copy(f.up);lastFocus={lat,lon,altitude,rings:sections.map(r=>r.sin*anchorRadius)};
  }
  function setMode(next) {
    if(next===mode&&next!=='hidden')return;
    mode=next;root.visible=next!=='hidden';orbital.visible=next!=='hidden';
    local.visible=next==='surface';shellCut.value=2;lastFocus=null;groundTime=0;
    if (orbital.visible) buildOrbit();
    if(atmosphereRim)atmosphereRim.visible=next==='orbit';
    if (local.visible) buildGround();
  }
  function update(lat,lon,dt=0,altitude=0,shuttleStatus=null) {
    if(mode!=='surface'&&mode!=='flight')return;
    altitude=mode==='surface'?0:Math.max(0,altitude);
    if(atmosphereRim)atmosphereRim.visible=altitude>radius*.05;
    local.visible=mode==='surface'||altitude<radius*.68;
    if(!local.visible){shellCut.value=2;lastFocus=null;return;}
    buildGround();groundTime+=dt;
    const moved=lastFocus?definition.layout.displacement(lastFocus,lat,lon).distance:Infinity;
    // The metre mesh stays fixed during a flyby. Recentring/relighting every
    // few metres rebuilt thousands of terrain vertices on the flight frame.
    const tolerance=mode==='surface'?4:diskRadius*.16;
    const rising=lastFocus&&Math.abs(altitude-lastFocus.altitude)>Math.max(14,altitude*.1);
    if(!lastFocus||((moved>tolerance||(mode==='surface'&&rising))&&(mode==='surface'||groundTime>.28))){
      placeGround(lat,lon,mode==='flight'?120:altitude);groundTime=0;
    }
    shellCut.value=Math.cos(.95*diskRadius/radius);
    details.update(lat,lon,dt,altitude,mode==='surface',shuttleStatus);updateGroves(lat,lon,altitude);
  }
  // The flight solver samples the entire footprint before setting the gear
  // down. Keep the lidar envelope separate from the underlying foot height:
  // the centre of a pond is flyable, but is not a place to park the shuttle.
  for(const pool of pools){
    const {lat,lon}=definition.layout.fromXZ(pool.x,pool.z);
    pool.surface=height(lat,lon)+(pool.id==='core'?.99:.75)+.13;
  }
  function footprintAt(lat,lon,footprint){
    const physicalFootprint=footprint;
    footprint/=sceneScale;
    const {x,z}=chart(lat,lon),land=sample(lat,lon,x,z,{}),pad=closestPad(x,z,20);
    let maximum=land.height,slope=0,water=land.water>.49;
    if(pad&&Math.hypot(x-pad.x,z-pad.z)+footprint<20){
      return {height:land.height,top:land.height,slope,water:false,obstacle:false};
    }
    for(let i=0;footprint>0&&i<8;i++){
      const angle=tau*i/8;
      const corner=move(lat,lon,physicalFootprint*Math.cos(angle),physicalFootprint*Math.sin(angle)),c=chart(corner.lat,corner.lon);
      const edge=sample(corner.lat,corner.lon,c.x,c.z,heightSample);
      maximum=Math.max(maximum,edge.height);water ||= edge.water>.49;
      slope=Math.max(slope,Math.atan2(Math.abs(edge.height-land.height),physicalFootprint));
    }
    let waterLevel=-Infinity;
    for(const pool of pools){
      if(Math.hypot((x-pool.x)/(pool.rx+footprint),(z-pool.z)/(pool.rz+footprint))<1){
        water=true;waterLevel=Math.max(waterLevel,pool.surface);
      }
    }
    let solids=scatterTop(lat,lon,physicalFootprint);
    if(Math.abs(x)<470&&Math.abs(z)<370)
      solids=Math.max(solids,ensureScenery().obstacleTop(x,z,footprint)*sceneScale);
    return {height:land.height,top:Math.max(maximum,waterLevel,solids),slope,water,
      obstacle:solids>land.height+.38};
  }
  function flightHeight(lat,lon,footprint=0){return footprintAt(lat,lon,Math.max(0,footprint)).top;}
  function landingInfo(lat,lon,footprint=12){
    const result=footprintAt(lat,lon,Math.max(1,footprint));
    const reason=result.water?'起落架下方有水或泥潭':result.obstacle?'机翼或坡道净空不足':
      result.slope>.13?'坡度过大，请移向平地':'';
    return {...result,ok:!reason,reason};
  }
  function walk(lat,lon,east,north){
    const p=chart(lat,lon),end=move(lat,lon,east,north),q=chart(end.lat,end.lon);
    let dest=details&&p.region===q.region&&definition.layout.detail(p)>.8?
      details.walk(lat,lon,east/sceneScale,north/sceneScale):end;
    const cos=Math.max(.000001,Math.cos(lat));
    visitTiles(dest.lat,dest.lon,1,items=>{
      for(const it of items){
        const dx=unwrap(dest.lon-it.lon)*radius*cos,dn=(dest.lat-it.lat)*radius;
        const distance=Math.hypot(dx,dn),limit=(it.tree?it.size*.16:it.reach)+.26;
        if(distance<limit){
          const push=limit-distance;
          dest=move(dest.lat,dest.lon,distance?dx*push/distance:push,distance?dn*push/distance:0);
        }
      }
    });
    return dest;
  }
  function resolveArrival(lat,lon){
    ensureScenery().prepareWalk(lat,lon);
    return walk(lat,lon,0,0);
  }
  function resolveMigration(lat,lon){
    const start=chart(lat,lon),district=start.region;
    const stable=at=>{
      const p=chart(at.lat,at.lon);if(p.region!==district||definition.layout.detail(p)<.86)return false;
      const base=height(at.lat,at.lon);
      for(const distance of [1,3])for(const [e,n] of [[distance,0],[-distance,0],[0,distance],[0,-distance]]){
        const q=move(at.lat,at.lon,e,n);
        if(Math.abs(height(q.lat,q.lon)-base)>distance*.48)return false;
      }
      return true;
    };
    const original={lat,lon};
    if(stable(original))return resolveArrival(lat,lon);
    const anchors=[...district.members].sort((a,b)=>Math.hypot(start.x-a.x,start.z-a.z)-Math.hypot(start.x-b.x,start.z-b.z));
    for(const site of anchors){
      const distance=Math.hypot(site.x-start.x,site.z-start.z),steps=Math.min(128,Math.max(1,Math.ceil(distance/3)));
      for(let i=1;i<=steps;i++){
        const t=i/steps,at=definition.layout.fromXZ(start.x+(site.x-start.x)*t,start.z+(site.z-start.z)*t,district);
        if(!stable(at))continue;
        const clear=resolveArrival(at.lat,at.lon);if(stable(clear))return clear;
      }
    }
    const home=anchors[0];return resolveArrival(home.lat,home.lon);
  }
  function dispose() {
    const geometry=new Set(),materials=new Set(),textures=new Set();
    if(terrain)textures.add(terrain.paint);
    root.traverse(o=>{if(o.geometry)geometry.add(o.geometry);
      if(o.material)for(const mat of [].concat(o.material)) {materials.add(mat);if(mat.map)textures.add(mat.map);}
      if(o.isInstancedMesh && o.dispose)o.dispose();});
    geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());world.remove(root);
  }
  let flightPrepared=false;
  function prepareFlight(){
    if(flightPrepared)return;
    buildOrbit();buildGround();details.prepareFlight();
    flightPrepared=true;
  }
  setMode('hidden');
  return {root,sites,radius,frame,height,groundCorrection,point,move,chart,walk,resolveArrival,resolveMigration,siteAt,update,setMode,dispose,prepareFlight,
    landingSites,landingSite:id=>landings.get(id)||null,flightHeight,landingInfo,
    nearestPipi:(lat,lon,id)=>details?.nearestPipi(lat,lon,id)||null,
    nearbySpirit:(lat,lon)=>details?.spiritObservation(lat,lon)||null,
    spiritObservation:(lat,lon,key)=>details?.spiritObservation(lat,lon,key)||null,
    withdrawSpirit:key=>details?.withdrawSpirit(key)||false,
    forestBossPosition:()=>details?.forestBossPosition()||null,
    interactSpiritSite:(caster,lat,lon,flameTool)=>details?.interactSpiritSite(caster,lat,lon,flameTool)||'',
    spiritSiteHint:(lat,lon)=>details?.spiritSiteHint(lat,lon)||'',
    setSafariState(state){safariState=state;details?.setSafariState(state);},
    safariAction:(caster,lat,lon)=>details?.safariAction(caster,lat,lon)||null,
    safariWalk:(lat,lon)=>details?.safariWalk(lat,lon)||null,
    safariHint:(lat,lon)=>details?.safariHint(lat,lon)||'',
    pickSpirit:(caster,lat,lon)=>details?.pickSpirit(caster,lat,lon)||null};
}
