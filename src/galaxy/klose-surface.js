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
  return {id:'klose',name:'克洛斯星',radius,sites,routes};
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
  const orbitalPalette = ['#102a45','#183e58','#246472','#539d94','#b1ad78','#7f9352','#486e49','#3c5d47','#888765'].map(hex=>new T.Color(hex));
  const thresholds=[-1.2,-.65,-.27,-.07,-.018,.045,.20,.47,1.2];
  function atlas() {
    const w=2048,h=1024,cw=w/2,ch=h/2;
    const body=document.createElement('canvas'), clouds=document.createElement('canvas');
    body.width=w;body.height=h;clouds.width=cw;clouds.height=ch;
    const ctx=body.getContext('2d'), cloudCtx=clouds.getContext('2d');
    const land=ctx.createImageData(w,h),air=cloudCtx.createImageData(cw,ch),relief=new Float32Array(w*h),sample=new T.Color();
    const lons=new Float32Array(w),cosines=new Float32Array(w),sines=new Float32Array(w);
    for(let col=0;col<w;col++) {
      const lon=((col+.5)/w-.5)*tau;
      lons[col]=lon;cosines[col]=Math.cos(lon);sines[col]=Math.sin(lon);
    }
    for (let row=0;row<h;row++) {
      const lat=(.5-(row+.5)/h)*Math.PI,c=Math.cos(lat),y=Math.sin(lat);
      for (let col=0;col<w;col++) {
        const lon=lons[col],x=c*cosines[col],z=-c*sines[col],i=(row*w+col)*4;
        const field=bedrock(x,y,z);
        let band=0;
        while (band<thresholds.length-2 && field>thresholds[band+1]) band++;
        sample.copy(orbitalPalette[band]).lerp(orbitalPalette[band+1],smooth(thresholds[band],thresholds[band+1],field));
        const continent=smooth(-.04,.17,field),fine=fractal(x*74,y*74,z*74);
        const boundary=Math.abs(fractal(11+12*x,3+12*y,7+12*z)+.16*fine);
        const ridge=continent*(1-smooth(.025,.24,boundary))*(.28+.72*smooth(-.05,.43,field));
        relief[row*w+col]=continent*(field*.6+ridge+.10*fine);
        const grain=.93+.13*fine+.045*noise(x*203,y*203,z*203);
        const tundra=ridge*.33,ice=smooth(.94,1.018,Math.abs(y)+.028*noise(9*x,9*y,9*z)+.012*fine);
        land.data[i]=255*((sample.r*grain+tundra*.31)*(1-ice)+.83*ice);
        land.data[i+1]=255*((sample.g*grain+tundra*.21)*(1-ice)+.89*ice);
        land.data[i+2]=255*((sample.b*grain+tundra*.15)*(1-ice)+.89*ice);
        land.data[i+3]=255;
        if(!(row&1)&&!(col&1)) {
          const k=((row>>1)*cw+(col>>1))*4;
          // A localized cyclone deforms the cloud field without repeating a diagonal wave around the globe.
          const px=unwrap(lon-.10)*Math.cos(.33),py=lat-.33,d2=px*px+py*py,twist=2.8*Math.exp(-d2/.075);
          const angle=lon+(px*Math.cos(twist)-py*Math.sin(twist)-px),v=lat+(px*Math.sin(twist)+py*Math.cos(twist)-py);
          const cy=Math.sin(v),cx=Math.cos(v)*Math.cos(angle),cz=-Math.cos(v)*Math.sin(angle);
          const shear=fractal(2+cx*4,9+cy*4,7+cz*4);
          const cloudsBroad=fractal(15+cx*6.1+1.8*shear,12+cy*8.4,7+cz*6.7-.85*shear);
          const wisps=fractal(23+cx*36,17+cy*43+2.6*shear,13+cz*39);
          const density=cloudsBroad+.29*wisps;
          air.data[k]=231;air.data[k+1]=242;air.data[k+2]=238;
          air.data[k+3]=167*smooth(.20,.63,density)+28*smooth(.04,.29,density);
        }
      }
    }
    for(let row=1;row<h-1;row++)for(let col=0;col<w;col++) {
      const j=row*w+col,i=j*4;
      const ew=relief[row*w+((col+1)%w)]-relief[row*w+((col+w-1)%w)];
      const ns=relief[j+w]-relief[j-w],illum=clamp(1+.83*ew+.63*ns,.69,1.23);
      for(let channel=0;channel<3;channel++)land.data[i+channel]*=illum;
    }
    ctx.putImageData(land,0,0); cloudCtx.putImageData(air,0,0);
    return [body,clouds].map(canvas=>{const tex=new T.CanvasTexture(canvas);tex.encoding=T.sRGBEncoding;tex.wrapS=T.RepeatWrapping;tex.anisotropy=4;return tex;});
  }
  let builtOrbit=false;
  function buildOrbit() {
    if (builtOrbit) return;
    builtOrbit=true;
    const [land,clouds]=atlas();
    orbital.add(new T.Mesh(new T.SphereGeometry(radius,144,88),
      new T.MeshStandardMaterial({map:land,roughness:.88})));
    orbital.add(new T.Mesh(new T.SphereGeometry(radius*1.0035,112,72),
      new T.MeshLambertMaterial({map:clouds,transparent:true,depthWrite:false})));
    const rim=new T.ShaderMaterial({vertexShader:
      'varying vec3 n; varying vec3 v; void main(){ vec4 p=modelViewMatrix*vec4(position,1.); n=normalize(normalMatrix*normal); v=normalize(-p.xyz); gl_Position=projectionMatrix*p; }',
      fragmentShader:'varying vec3 n; varying vec3 v; void main(){ float f=pow(max(0.,1.-abs(dot(normalize(n),normalize(v)))),5.); gl_FragColor=vec4(.28,.76,.93,.6*f); }',
      transparent:true,side:T.BackSide,depthWrite:false});
    orbital.add(new T.Mesh(new T.SphereGeometry(radius*1.023,112,64),rim));
  }
  const turf=['#d87d61','#e89d76','#d7a572','#709baa','#7e8153','#9a8459','#7c8568','#426683','#689dad','#366f81','#647da3'].map(color);
  const biomeIndex={grassland:0,swamp:5,forest:4,vineway:10,core:6,wetland:3,flame:7,sanctuary:8};
  const groundColor=new T.Color();
  function shade(lat,lon,x,z) {
    const d=Math.hypot(x,z);
    if (d>1800 && geography(lat,lon)<-.06) return groundColor.copy(turf[9]);
    const variation=.5+.5*Math.sin(.029*x+Math.sin(.035*z))*Math.cos(.033*z-.01*x);
    groundColor.copy(turf[0]).lerp(turf[1],variation*.47);
    if (d>470) return groundColor.setHex(0x759b61).convertSRGBToLinear();
    for (const s of sites) {
      if (s.id==='grassland') continue;
      const weight=1-smooth(30,95,Math.hypot(s.x-x,s.z-z));
      if (weight>0) groundColor.lerp(turf[biomeIndex[s.id]],weight);
    }
    const distance=trail(x,z);
    const path=(1-smooth(1.4,4.5,distance))*.8;
    groundColor.lerp(turf[2],path);
    return groundColor.multiplyScalar(.87+.14*variation+.075*Math.sin(x*.84+z*.46)*Math.sin(z*.75));
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
