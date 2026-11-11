// Latitude and longitude are radians. One scene unit is one metre. East, up,
// south form a right-handed local frame everywhere, including at the poles.
const KLOSE_WORLD = (() => {
  const radius = 780000, latitude = .32, longitude = .54;
  const locations = [
    ['grassland','克洛斯星草原',0,0,'黄晶矿露头、花草和野生皮皮'],
    ['swamp','克洛斯星沼泽',-174,12,'沿泥潭之间的陆桥穿过仙人球栖地'],
    ['forest','克洛斯星林间',-304,-91,'巨树下的菌落与蘑菇怪'],
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
  return {id:'klose',name:'克洛斯星',radius,sites,routes,rings};
})();

function createKloseSurface(T, world, definition = KLOSE_WORLD) {
  const {radius,sites,routes} = definition;
  const origin = sites[0], byId = new Map(sites.map(site=>[site.id,site]));
  const root = new T.Group(), orbital = new T.Group(), local = new T.Group();
  root.name = '帕诺星系 · 克洛斯星'; root.add(orbital,local); world.add(root);
  let mode = 'hidden';
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
  function geography(lat,lon) {
    const c=Math.cos(lat),x=c*Math.cos(lon),y=Math.sin(lat),z=-c*Math.sin(lon);
    return bedrock(x,y,z);
  }
  function height(lat,lon) {
    const c=chart(lat,lon),d=Math.hypot(c.x,c.z),w=smooth(8000,33000,d);
    let localHeight=w<1?landscape(c.x,c.z):0;
    if(d>310&&w<1) {
      const blend=smooth(310,1700,d);
      const hills=15.5*fractal(c.x*.002,18,c.z*.002)+28*fractal(13+c.x*.0007,29,c.z*.0007);
      localHeight=localHeight*(1-blend)+(120+hills)*blend;
    }
    if (!w) return localHeight;
    const plate=geography(lat,lon);
    const global=Math.max(-1,10+Math.max(0,plate+.02)*265
      +Math.max(0,plate-.35)*140*Math.sin(44*lat-21*lon)**2);
    return localHeight*(1-w)+global*w;
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
  let builtOrbit=false;
  function buildOrbit() {
    if (builtOrbit) return;
    builtOrbit=true;
    orbital.add(new T.Mesh(new T.SphereGeometry(radius,144,88),
      new T.MeshStandardMaterial({map:atlas(),roughness:.91})));
    addRings();
    const rim=new T.ShaderMaterial({vertexShader:
      'varying vec3 n; varying vec3 v; void main(){ vec4 p=modelViewMatrix*vec4(position,1.); n=normalize(normalMatrix*normal); v=normalize(-p.xyz); gl_Position=projectionMatrix*p; }',
      fragmentShader:'varying vec3 n; varying vec3 v; void main(){ float f=pow(max(0.,1.-abs(dot(normalize(n),normalize(v)))),5.); gl_FragColor=vec4(.61,.63,.71,.26*f); }',
      transparent:true,side:T.BackSide,depthWrite:false});
    orbital.add(new T.Mesh(new T.SphereGeometry(radius*1.009,112,64),rim));
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
  const groundColor=new T.Color(),regionColor=new T.Color(),sodColor=new T.Color();
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
  function shade(lat,lon,x,z) {
    const d=Math.hypot(x,z),c=Math.cos(lat),sx=c*Math.cos(lon),sy=Math.sin(lat),sz=-c*Math.sin(lon);
    orbitalAlbedo(sx,sy,sz,bedrock(sx,sy,sz),groundColor).convertSRGBToLinear();
    if (d>660) return groundColor;
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
  const groundGroup=new T.Group(); local.add(groundGroup);
  let lastFocus=null,terrain=null,details=null;
  function buildGround() {
    if (terrain) return;
    const radii=[0,.8,1.7,2.8,4,5.5,7.2,9.2,12,15,19,24,30,37,45,55,67,81,99,120,146,180,220,270,335,415,520,660,835,1050,1350,1750,2250,3000,4200,5700,8000,11500,16500,24000,35000];
    const sectors=96, coords=[[0,0]],indices=[];
    for (let ring=1;ring<radii.length;ring++) {
      for (let i=0;i<sectors;i++) {
        const angle=tau*i/sectors;coords.push([radii[ring]*Math.cos(angle),radii[ring]*Math.sin(angle)]);
        const a=1+(ring-1)*sectors+i,b=1+(ring-1)*sectors+(i+1)%sectors;
        if (ring===1) indices.push(0,b,a);
        else indices.push(a-sectors,b,a,b-sectors,b,a-sectors);
      }
    }
    const geo=new T.BufferGeometry();
    for (const [attr,stride] of [['position',3],['color',3],['uv',2]]) geo.setAttribute(attr,new T.BufferAttribute(new Float32Array(coords.length*stride),stride));
    geo.setIndex(indices);
    const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({map:soilMap(),vertexColors:true,roughness:.98}));
    mesh.receiveShadow=true;mesh.frustumCulled=false;groundGroup.add(mesh);terrain={coords,geo};
    details=createKloseScenery(T,local,{sites,pools,point,frame,move,chart,trail,height});
  }
  function placeGround(lat,lon) {
    const {coords,geo}=terrain,anchor=point(lat,lon),f=frame(lat,lon);
    const pos=geo.attributes.position,col=geo.attributes.color,uv=geo.attributes.uv;
    groundGroup.position.copy(anchor);groundGroup.quaternion.copy(f.quaternion);
    for (let i=0;i<coords.length;i++) {
      const [dx,dz]=coords[i],p=move(lat,lon,dx,-dz),q=point(p.lat,p.lon).sub(anchor);
      pos.setXYZ(i,q.dot(f.east),q.dot(f.up),q.dot(f.south));
      const {x,z}=chart(p.lat,p.lon),s=shade(p.lat,p.lon,x,z);
      col.setXYZ(i,s.r,s.g,s.b);uv.setXY(i,x/2.4,z/2.4);
    }
    pos.needsUpdate=col.needsUpdate=uv.needsUpdate=true;geo.computeVertexNormals();
    lastFocus={lat,lon};
  }
  function setMode(next) {
    mode=next;root.visible=next!=='hidden';orbital.visible=next==='orbit';local.visible=next==='surface';
    if (orbital.visible) buildOrbit();
    if (local.visible) buildGround();
  }
  function update(lat,lon,dt=0) {
    if (mode!=='surface') return;
    const moved=lastFocus?Math.hypot((lat-lastFocus.lat)*radius,unwrap(lon-lastFocus.lon)*radius*Math.cos(lat)):Infinity;
    if (moved>4) placeGround(lat,lon);
    details.update(lat,lon,dt);
  }
  function dispose() {
    const geometry=new Set(),materials=new Set(),textures=new Set();
    root.traverse(o=>{if(o.geometry)geometry.add(o.geometry);
      if(o.material)for(const mat of [].concat(o.material)) {materials.add(mat);if(mat.map)textures.add(mat.map);}
      if(o.isInstancedMesh && o.dispose)o.dispose();});
    geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());world.remove(root);
  }
  setMode('hidden');
  return {root,sites,radius,frame,height,point,move,siteAt,update,setMode,dispose,
    walk:(lat,lon,east,north)=>details?details.walk(lat,lon,east,north):move(lat,lon,east,north),
    nearestPipi:(lat,lon)=>details?details.nearestPipi(lat,lon):null};
}
