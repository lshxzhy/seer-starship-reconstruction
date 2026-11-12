// Latitude and longitude are radians. One scene unit is one metre. East, up,
// south form a right-handed local frame everywhere, including at the poles.
const KLOSE_WORLD = (() => {
  const radius = 480000, latitude = .32, longitude = .54;
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
    id,name,x,z,lat:latitude-z/radius,lon:longitude+x/(radius*Math.cos(latitude)),description
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
    ['ridge','蓝脊山鞍部',14400,-7400],['delta','金河口高岸',-13600,-14700],
    ['grove','绯叶林台',22500,9900]
  ].map(([id,name,x,z])=>({id,name,x,z,lat:latitude-z/radius,lon:longitude+x/(radius*Math.cos(latitude))}));
  return {id:'klose',name:'克洛斯星',radius,sites,routes,rings,landingSites};
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
  function chart(lat,lon) {
    return {x:unwrap(lon-origin.lon)*radius*Math.cos(origin.lat),z:(origin.lat-lat)*radius};
  }
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
    ['swamp',-15,-16,12,7],['swamp',18,20,10,5],['swamp',-21,17,8,6],
    ['wetland',-21,-13,18,10],['wetland',18,17,10,9],['wetland',14,-23,13,6],
    ['core',-6,-14,10,5]
  ].map(([id,dx,dz,rx,rz])=>({id,dx,dz,rx,rz,x:byId.get(id).x+dx,z:byId.get(id).z+dz}));
  // Make the lake floors depressions in the same field that supports the avatar.
  // The concentric contours and water elevation therefore also meet on the banks.
  function landscape(x,z) {
    const waves=1.7*Math.sin(x*.027+.3)*Math.cos(z*.022)+.95*Math.sin(z*.043-x*.012);
    const outside=smooth(24,85,Math.hypot(x,z));
    let h=120+waves*(.28+.72*outside)+Math.sin(x*.071+z*.052)*.16;
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
    const d=Math.hypot(x,z),globalWeight=smooth(33000,76000,d);
    let h=120,water=0,rock=0,forest=0;
    if(d>350 && globalWeight<1){
      const hills=fractal(x*.00032,18,z*.00032),grain=noise(x*.0015,5,z*.0015);
      const crest=x-(12500+z*.14+2600*Math.sin(z/7800)+950*Math.sin(z/2300));
      const ridge=Math.exp(-((crest/3400)**2));
      const shoulders=Math.exp(-((crest/7200)**2));
      const bank=x-(-8100+.33*z+1320*Math.sin(z/3700)+430*Math.sin(z/1900));
      const flood=1-smooth(110,820,Math.abs(bank));
      const lake=Math.hypot((x+10300)/4150,(z+15100)/2050)+hills*.13;
      const valley=lake<1.38?Math.max(flood,1-smooth(.97,1.38,lake)):flood;
      const shelf=smooth(-.43,.18,hills)*smooth(3500,13000,z)*smooth(12000,22000,x);
      rock=clamp(ridge*(.67+.33*grain)+shoulders*.17);
      forest=clamp((.45+.68*hills+.19*grain+shelf*.53)*(1-rock)*(1-valley));
      const drainage=Math.min(Math.abs(bank)-135-(hills+1)*62,(lake-1)*1670);
      water=1-smooth(-7,8,drainage);
      const ridgeline=540+930*(.52+.30*Math.sin(z/4650)+.18*Math.cos(z/1300));
      const upland=158+138*hills+25*grain+ridge*ridgeline+265*shoulders+shelf*295;
      const channel=39+Math.max(0,drainage)*.22;
      h=T.MathUtils.lerp(upland,channel,valley);
      const inner=smooth(350,1250,d);
      h=120+(h-120)*inner;forest*=inner;rock*=inner;water*=inner;
    }
    if(globalWeight>0){
      const c=Math.cos(lat),sx=c*Math.cos(lon),sy=Math.sin(lat),sz=-c*Math.sin(lon);
      const plate=bedrock(sx,sy,sz),wide=fractal(46*sx,46*sy,46*sz);
      const ridge=1-Math.min(1,Math.abs(fractal(31*sx,31*sy,31*sz))*3.2);
      const mountains=smooth(.14,.72,plate)*ridge*ridge;
      const continents=Math.max(0,plate+.18)*720+mountains*(470+640*(.5+.5*wide));
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
    const pad=closestPad(x,z,54);
    if(pad){
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
    const {x,z}=chart(lat,lon);
    let result=null,best=58;
    for (const site of sites) {
      const d=Math.hypot(x-site.x,z-site.z);
      if (d<best) {best=d; result=site;}
    }
    return result;
  }

  return {sites,origin,tau,clamp,smooth,unwrap,frame,move,chart,trail,pools,noise,fractal,bedrock,
    closestPad,sample,heightSample,height,point,siteAt};
}

function createKloseSurface(T, world, definition = KLOSE_WORLD, ground = createKloseTerrain(T,definition)) {
  const {radius,landingSites}=definition;
  const {sites,origin,tau,clamp,smooth,unwrap,frame,move,chart,trail,pools,noise,fractal,bedrock,
    closestPad,sample,heightSample,height,point,siteAt}=ground;
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
    const w=2048,h=1024,body=document.createElement('canvas');
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
        const field=bedrock(x,y,z);
        orbitalAlbedo(x,y,z,field,sample);
        const relief=1+.073*field+.040*fractal(x*55,y*55,z*55);
        land.data[i]=255*sample.r*relief;
        land.data[i+1]=255*sample.g*relief;
        land.data[i+2]=255*sample.b*relief;
        land.data[i+3]=255;
      }
    }
    ctx.putImageData(land,0,0);
    const tex=new T.CanvasTexture(body);tex.encoding=T.sRGBEncoding;tex.wrapS=T.RepeatWrapping;tex.anisotropy=4;return tex;
  }
  function addRings() {
    const {inner,outer}=definition.rings;
    // The icon has an amber inner band and a wider lemon-gold outer band.
    // Give the disk a few genuine gaps; the globe and rings share the depth buffer.
    const material=new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide});
    const rotation=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),pole);
    const lerp=T.MathUtils.lerp;
    const sun=frame(origin.lat,origin.lon);
    const light=sun.up.multiplyScalar(.76).addScaledVector(sun.east,-.8).addScaledVector(sun.north,-.22).normalize();
    const p=new T.Vector3(),base=new T.Color();
    for(const [a,b,dark,bright] of [[0,.22,'#bd834c','#dfa25e'],[.244,.70,'#efd567','#ffff66'],
      [.707,.89,'#f4d269','#fff484'],[.907,1,'#efbd5a','#ffff77']]){
      const start=lerp(inner,outer,a),end=lerp(inner,outer,b);
      const ring=new T.RingGeometry(start*radius,end*radius,220,12);
      const attribute=ring.getAttribute('position'),rgb=new Float32Array(attribute.count*3);
      const low=color(dark),high=color(bright);
      for(let i=0;i<attribute.count;i++){
        p.fromBufferAttribute(attribute,i).divideScalar(radius).applyQuaternion(rotation);
        const r=p.length(),t=clamp((r-start)/(end-start)),along=p.dot(light);
        const clearance=Math.sqrt(Math.max(0,r*r-along*along));
        const shade=along>=0?1:.49+.51*smooth(.95,1.08,clearance);
        base.copy(low).lerp(high,.3+.6*t+.07*Math.sin(t*28+a*6)).multiplyScalar(shade);
        base.toArray(rgb,i*3);
      }
      ring.setAttribute('color',new T.BufferAttribute(rgb,3));
      const mesh=new T.Mesh(ring,material);mesh.name='克洛斯星 · 金色环带';
      mesh.quaternion.copy(rotation);orbital.add(mesh);
    }
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
    addRings();
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
    sanctuary:['#197ba5','#43acda','#d58d64']
  };
  for (const name of Object.keys(soil)) soil[name]=soil[name].map(color);
  const grassBlue=color('#2a8cbd'),grassTip=color('#58b5d9'),grassMoss=color('#98af45');
  const groundColor=new T.Color(),regionColor=new T.Color(),sodColor=new T.Color(),beltColor=new T.Color();
  const plains=color('#ba8170'),forestColor=color('#34698a'),stoneColor=color('#85687f');
  const goldWater=color('#c49950'),deepWater=color('#476684');
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
    groundColor.copy(plains).lerp(beltColor,.28);
    groundColor.lerp(forestColor,clamp(land.forest*1.4));
    groundColor.lerp(stoneColor,.86*land.rock);
    groundColor.lerp(d<65000?goldWater:deepWater,land.water);
    if(d>660)return groundColor.lerp(beltColor,1-detail);
    const variation=smooth(-.66,.66,noise(x*.066,8,z*.066));
    const trailCoverage=1-smooth(1.2,4.4,trail(x,z));
    const daylight=.94+.09*variation;
    for (const site of sites) {
      const dx=x-site.x,dz=z-site.z;
      const weight=1-smooth(50,132,Math.hypot(dx,dz));
      if (!weight)continue;
      const [shade,light,path]=soil[site.id];
      regionColor.copy(shade).lerp(light,.15+.73*variation);
      if (site.id==='grassland') grassClearing(dx,dz,variation,trailCoverage);
      regionColor.lerp(path,.66*trailCoverage);
      groundColor.lerp(regionColor,weight);
    }
    return groundColor.multiplyScalar(daylight).lerp(beltColor,1-detail);
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
  // Geodetic vegetation cells keep their physical size at high latitudes.
  // Collision and drawing request the same deterministic cell contents even
  // when the destination is outside the camera's loaded neighbourhood.
  const tileRows=Math.ceil(Math.PI*radius/240),cache=new Map();
  function tileRow(lat){return clamp(Math.floor((lat/Math.PI+.5)*tileRows),0,tileRows-1);}
  function tileCols(row){return Math.max(1,Math.round(tau*radius*Math.cos(((row+.5)/tileRows-.5)*Math.PI)/240));}
  function tileCol(lon,n){return ((Math.floor((unwrap(lon)/tau+.5)*n)%n)+n)%n;}
  function tile(row,col,n){
    const key=row+'/'+col;
    if(cache.has(key))return cache.get(key);
    let seed=(Math.imul(row+17,73856093)^Math.imul(col+11,19349663))>>>0;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const items=[],land={};
    for(let i=0;i<34;i++){
      const lat=((row+random())/tileRows-.5)*Math.PI,lon=((col+random())/n-.5)*tau;
      const {x,z}=chart(lat,lon);
      if(sites.some(site=>Math.abs(x-site.x)<87&&Math.abs(z-site.z)<87)||closestPad(x,z,35))continue;
      sample(lat,lon,x,z,land);
      if(land.water>.15)continue;
      const chance=random(),tree=chance<land.forest*.86;
      if(!tree && chance>.08+land.forest*.86+land.rock*.29)continue;
      const size=(tree?4.2:1.25)*(1+.9*random()+.55*random());
      const reach=size*(tree?.75:1.1),h=size*(tree?1.85:.76);
      const c=Math.cos(lat),up=new T.Vector3(c*Math.cos(lon),Math.sin(lat),-c*Math.sin(lon));
      const at=up.clone().multiplyScalar(radius+land.height);
      const yaw=random()*tau,paint=tree?(z>3500&&x>12500?0x975879:0x477c89):(land.rock>.4?0x816276:0xc18e70);
      items.push({lat,lon,up,at,size,h,reach,yaw,paint,tree,top:land.height+h});
    }
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
  function updateGroves(lat,lon,altitude){
    groves.visible=altitude<3100;
    if(!groves.visible)return;
    const row=tileRow(lat),col=tileCol(lon,tileCols(row));
    if(row===forestRow&&col===forestCol)return;
    forestRow=row;forestCol=col;
    if(!treeTrunks){
      const batch=(geometry,paint,tinted)=>{
        const material=new T.MeshStandardMaterial({color:paint,roughness:.94});
        const meshes=new T.InstancedMesh(geometry,material,34*49);
        if(tinted)meshes.instanceColor=new T.InstancedBufferAttribute(new Float32Array(meshes.count*3),3);
        meshes.frustumCulled=false;meshes.receiveShadow=true;groves.add(meshes);return meshes;
      };
      treeTrunks=batch(new T.CylinderGeometry(.56,1,1,5),0x674b49,false);
      treeCrowns=batch(new T.IcosahedronGeometry(1,1),0xffffff,true);
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
          transform.position.addScaledVector(it.up,it.size*.58);
          transform.scale.set(it.size*.16,it.size*1.16,it.size*.16);transform.updateMatrix();
          treeTrunks.setMatrixAt(trees,transform.matrix);
          transform.position.addScaledVector(it.up,it.size*.71);
          transform.scale.set(it.reach,it.size*.56,it.reach*.87);transform.updateMatrix();
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
  const diskRadius=120000;
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
      details=createKloseScenery(T,local,{sites,pools,radius,point,frame,move,chart,trail,height,padClear,groundCorrection});
      details.setSafariState(safariState);
    }
    return details;
  }
  function buildGround() {
    if (terrain) return;
    const radii=[0,.8,1.7,2.8,4,5.5,7.2,9.2,12,15,19,24,30,37,45,55,67,81,99,120,146,180,220,270,335,415,520,660,835,1050,1350,1750,2250,3000,4200,5700,8000,11500,16500,24000,35000,48000,65000,85000,103000,diskRadius];
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
    const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({map:soilMap(),vertexColors:true,roughness:.98}));
    mesh.receiveShadow=true;mesh.frustumCulled=false;groundGroup.add(mesh);terrain={coords,geo,radii,sectors};
    ensureScenery();
  }
  function placeGround(lat,lon,altitude) {
    const {coords,geo,radii}=terrain,anchor=point(lat,lon),f=frame(lat,lon);
    const pos=geo.attributes.position,col=geo.attributes.color,uv=geo.attributes.uv;
    groundGroup.position.copy(anchor);groundGroup.quaternion.copy(f.quaternion);
    const profile=1-.39*smooth(50,13000,altitude),fine=1-smooth(3800,39000,altitude);
    const sections=radii.map(r=>{
      const range=diskRadius*Math.pow(r/diskRadius,profile);
      return {sin:Math.sin(range/radius),cos:Math.cos(range/radius),detail:fine*(1-smooth(28000,90000,range))};
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
    }
    pos.needsUpdate=col.needsUpdate=uv.needsUpdate=true;geo.computeVertexNormals();
    groundInverse.copy(f.quaternion).invert();
    shellCenter.value.copy(f.up);lastFocus={lat,lon,altitude,rings:sections.map(r=>r.sin*anchorRadius)};
  }
  function setMode(next) {
    if(next===mode&&next!=='hidden')return;
    mode=next;root.visible=next!=='hidden';orbital.visible=next==='orbit'||next==='flight';
    local.visible=next==='surface';shellCut.value=2;lastFocus=null;groundTime=0;
    if (orbital.visible) buildOrbit();
    if(atmosphereRim)atmosphereRim.visible=next==='orbit';
    if (local.visible) buildGround();
  }
  function update(lat,lon,dt=0,altitude=0,shuttleStatus=null) {
    if(mode!=='surface'&&mode!=='flight')return;
    altitude=mode==='surface'?0:Math.max(0,altitude);
    if(atmosphereRim)atmosphereRim.visible=altitude>12000;
    local.visible=altitude<42000;
    if(!local.visible){shellCut.value=2;lastFocus=null;return;}
    buildGround();groundTime+=dt;
    const moved=lastFocus?Math.hypot((lat-lastFocus.lat)*radius,unwrap(lon-lastFocus.lon)*radius*Math.cos(lat)):Infinity;
    const tolerance=mode==='surface'?4:clamp(4+altitude*.2,4,1700);
    const rising=lastFocus&&Math.abs(altitude-lastFocus.altitude)>Math.max(14,altitude*.1);
    if((moved>tolerance||rising)&&(mode==='surface'||groundTime>.09||moved>Math.max(250,tolerance*3))){
      placeGround(lat,lon,altitude);groundTime=0;
    }
    shellCut.value=mode==='flight'?Math.cos((diskRadius-6800)/radius):2;
    details.update(lat,lon,dt,altitude,mode==='surface',shuttleStatus);updateGroves(lat,lon,altitude);
  }
  // The flight solver samples the entire footprint before setting the gear
  // down. Keep the lidar envelope separate from the underlying foot height:
  // the centre of a pond is flyable, but is not a place to park the shuttle.
  for(const pool of pools){
    const lat=origin.lat-pool.z/radius,lon=origin.lon+pool.x/(radius*Math.cos(origin.lat));
    pool.surface=height(lat,lon)+(pool.id==='core'?.99:.75)+.13;
  }
  function footprintAt(lat,lon,footprint){
    const {x,z}=chart(lat,lon),land=sample(lat,lon,x,z,{}),pad=closestPad(x,z,20);
    let maximum=land.height,slope=0,water=land.water>.49;
    if(pad&&Math.hypot(x-pad.x,z-pad.z)+footprint<20){
      return {height:land.height,top:land.height,slope,water:false,obstacle:false};
    }
    for(let i=0;footprint>0&&i<8;i++){
      const angle=tau*i/8;
      const corner=move(lat,lon,footprint*Math.cos(angle),footprint*Math.sin(angle)),c=chart(corner.lat,corner.lon);
      const edge=sample(corner.lat,corner.lon,c.x,c.z,heightSample);
      maximum=Math.max(maximum,edge.height);water ||= edge.water>.49;
      slope=Math.max(slope,Math.atan2(Math.abs(edge.height-land.height),footprint));
    }
    let waterLevel=-Infinity;
    for(const pool of pools){
      if(Math.hypot((x-pool.x)/(pool.rx+footprint),(z-pool.z)/(pool.rz+footprint))<1){
        water=true;waterLevel=Math.max(waterLevel,pool.surface);
      }
    }
    let solids=scatterTop(lat,lon,footprint);
    if(Math.abs(x)<470&&Math.abs(z)<370)
      solids=Math.max(solids,ensureScenery().obstacleTop(x,z,footprint));
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
    let dest=details?details.walk(lat,lon,east,north):move(lat,lon,east,north);
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
  function dispose() {
    const geometry=new Set(),materials=new Set(),textures=new Set();
    root.traverse(o=>{if(o.geometry)geometry.add(o.geometry);
      if(o.material)for(const mat of [].concat(o.material)) {materials.add(mat);if(mat.map)textures.add(mat.map);}
      if(o.isInstancedMesh && o.dispose)o.dispose();});
    geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());world.remove(root);
  }
  setMode('hidden');
  return {root,sites,radius,frame,height,groundCorrection,point,move,walk,resolveArrival,siteAt,update,setMode,dispose,
    landingSites,landingSite:id=>landings.get(id)||null,flightHeight,landingInfo,
    nearestPipi:(lat,lon,id)=>details?details.nearestPipi(lat,lon,id):null,
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
