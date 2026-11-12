// The twin planets share a metre frame, terrain renderer and landing solver.
// Their classic maps supply independent palettes, relief and landmark meshes.
function twinMove(radius,lat,lon,east,north){
  const distance=Math.hypot(east,north);
  if(!distance)return {lat,lon};
  const arc=distance/radius,s=Math.sin(arc),c=Math.cos(arc),cl=Math.cos(lat),sl=Math.sin(lat);
  const x=cl*c-sl*north/distance*s,y=east/distance*s;
  const nextLon=lon+Math.atan2(y,x);
  return {lat:Math.atan2(sl*c+cl*north/distance*s,Math.hypot(x,y)),lon:Math.atan2(Math.sin(nextLon),Math.cos(nextLon))};
}

function defineTwinWorld(spec){
  const locate=site=>({...site,...twinMove(spec.radius,spec.lat,spec.lon,site.x,-site.z)});
  return {...spec,sites:spec.sites.map(locate),landingSites:spec.landingSites.map(locate)};
}

function createTwinSurface(T,world,definition){
  const {radius,sites,landingSites,palette}=definition,home={lat:definition.lat,lon:definition.lon};
  const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),tau=Math.PI*2;
  const root=new T.Group(),district=new T.Group(),patch=new T.Group();
  root.name=definition.name;root.add(district,patch);root.visible=false;world.add(root);
  const globe=createTwinGlobe(T,definition);root.add(globe);
  const uniforms=globe.material.uniforms;
  function frame(lat,lon){
    const c=Math.cos(lat),s=Math.sin(lat),a=Math.cos(lon),b=Math.sin(lon);
    const up=v(c*a,s,-c*b),east=v(-b,0,-a),north=v(-s*a,c,s*b),south=north.clone().negate();
    return {east,up,north,south,quaternion:new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(east,up,south))};
  }
  const districtFrame=frame(home.lat,home.lon);
  district.quaternion.copy(districtFrame.quaternion);district.position.copy(districtFrame.up).multiplyScalar(radius);
  const move=(lat,lon,x,n)=>twinMove(radius,lat,lon,x,n);
  function chart(lat,lon){
    const d=lon-home.lon,c=Math.cos(lat),s=Math.sin(lat);
    const east=c*Math.sin(d),north=Math.cos(home.lat)*s-Math.sin(home.lat)*c*Math.cos(d);
    const dot=Math.sin(home.lat)*s+Math.cos(home.lat)*c*Math.cos(d),length=Math.hypot(east,north);
    const factor=length>1e-12?radius*Math.atan2(length,dot)/length:radius;
    return {x:east*factor,z:-north*factor};
  }
  const fromXZ=(x,z)=>move(home.lat,home.lon,x,-z);
  const padHeights=landingSites.map(p=>definition.terrainHeight(p.x,p.z));
  // Keep the walking district open. Beyond it, the approach crosses real mesas
  // or scarps; their silhouettes, foot heights and flight clearances agree.
  function rimRelief(x,z){
    const dx=x+60,dz=z+60,distance=Math.hypot(dx,dz);
    if(distance<300||distance>1150)return 0;
    const a=Math.atan2(dz,dx),ridge=510+72*Math.sin(3*a+.7)+41*Math.cos(7*a-.9);
    const along=.63+.18*Math.sin(5*a)+.13*Math.cos(9*a+.42)+.06*Math.sin(18*a);
    if(definition.id==='alpha'){
      const d=Math.abs(distance-ridge);
      return along*(42*(1-T.MathUtils.smoothstep(d,57,164))+47*(1-T.MathUtils.smoothstep(d,31,48))
        +23*(1-T.MathUtils.smoothstep(d,11,20)));
    }
    const edge=Math.abs(distance-ridge-19*Math.cos(12*a));
    const spine=Math.max(0,1-edge/155);
    return along*(72*spine**1.7+43*spine**4*(.35+.65*Math.cos(13*a-.3)**2));
  }
  function heightAt(x,z){
    const range=Math.hypot(x,z);
    const far=25*Math.sin(x*.00042+z*.00017)*Math.cos(z*.00036)+12*Math.cos(x*.0011-z*.00057);
    if(range>2000)return far;
    const land=definition.terrainHeight(x,z);
    for(const [i,p] of landingSites.entries()){
      const dist=Math.hypot(x-p.x,z-p.z);
      if(dist<34)return T.MathUtils.lerp(padHeights[i],land,T.MathUtils.smoothstep(dist,23,34));
    }
    return T.MathUtils.lerp(land,far,T.MathUtils.smoothstep(range,800,2000))+rimRelief(x,z);
  }
  const ground=(x,z)=>(radius+heightAt(x,z))*Math.cos(Math.hypot(x,z)/radius)-radius;
  function height(lat,lon){const p=chart(lat,lon);return heightAt(p.x,p.z);}
  function point(lat,lon,above=0){
    const r=radius+height(lat,lon)+above,c=Math.cos(lat);
    return v(r*c*Math.cos(lon),r*Math.sin(lat),-r*c*Math.sin(lon));
  }
  const blocks=[],portals=[],animations=[],materials=new Map();
  let built=false;
  function build(){
    if(built)return;
    built=true;
    const batches=new Map(),pose=new T.Object3D();
    function material(hex,options={}){
      const key=String(hex)+JSON.stringify(options);
      if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color:new T.Color(hex).convertSRGBToLinear(),roughness:.67,...options}));
      return materials.get(key);
    }
    function stamp(geo,mat,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){
      const key=geo.uuid+':'+mat.uuid;
      if(!batches.has(key))batches.set(key,{geo,mat,poses:[]});
      pose.position.set(x,y,z);pose.scale.set(sx,sy,sz);pose.rotation.set(rx,ry,rz);pose.updateMatrix();
      batches.get(key).poses.push(pose.matrix.clone());
    }
    definition.buildLandmarks({T,root:district,ground,material,stamp,
      block:(x,z,r,h)=>blocks.push({x,z,r,top:heightAt(x,z)+h}),
      animate:fn=>animations.push(fn),portal:(x,z,planet,site,r=3.5)=>portals.push({x,z,planet,site,r})});
    for(const {geo,mat,poses} of batches.values()){
      const mesh=new T.InstancedMesh(geo,mat,poses.length);
      poses.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
      mesh.castShadow=!mat.transparent;mesh.receiveShadow=true;district.add(mesh);
    }
    district.updateMatrixWorld(true);
  }
  function portalAt(lat,lon){
    const p=chart(lat,lon);
    return portals.find(g=>Math.hypot(g.x-p.x,g.z-p.z)<g.r);
  }
  function siteAt(lat,lon){
    const p=chart(lat,lon);
    let closest=null,distance=55;
    for(const site of sites){const d=Math.hypot(p.x-site.x,p.z-site.z);if(d<distance){closest=site;distance=d;}}
    return closest;
  }
  function walk(lat,lon,east,north){
    const start=chart(lat,lon);
    if(Math.hypot(start.x,start.z)>1100)return move(lat,lon,east,north);
    build();
    const end=move(lat,lon,east,north),q=chart(end.lat,end.lon);
    const steps=Math.max(1,Math.ceil(Math.hypot(east,north)/.25));
    const dx=(q.x-start.x)/steps,dz=(q.z-start.z)/steps;
    let x=start.x,z=start.z;
    for(let i=0;i<steps;i++){
      x+=dx;z+=dz;
      for(const b of blocks){
        const bx=x-b.x,bz=z-b.z,d=Math.hypot(bx,bz),min=b.r+.30;
        if(d<min){x=b.x+(d?bx/d:1)*min;z=b.z+(d?bz/d:0)*min;}
      }
    }
    return fromXZ(x,z);
  }
  function footprint(lat,lon,r=7.4){
    const p=chart(lat,lon),floor=heightAt(p.x,p.z);
    if(Math.hypot(p.x,p.z)<1000)build();
    const step=Math.max(.8,r),pad=landingSites.find(s=>Math.hypot(s.x-p.x,s.z-p.z)+r<=23);
    let high=floor,low=floor;
    for(const [ex,sz] of [[step,0],[-step,0],[0,step],[0,-step]]){
      const h=heightAt(p.x+ex,p.z+sz);high=Math.max(high,h);low=Math.min(low,h);
    }
    let obstruction=false;
    for(const b of blocks)if(Math.hypot(b.x-p.x,b.z-p.z)<b.r+r){high=Math.max(high,b.top);obstruction=true;}
    return {height:floor,top:high,ok:!obstruction&&(!!pad||high-low<step*.30),
      reason:obstruction?'机翼范围内有设施或岩体':'请在平缓处或标注的着陆坪降落'};
  }
  function clipCamera(aim,eye){
    const ray=eye.clone().sub(aim),distance=ray.length();if(distance<.25)return;
    const sample=v(),steps=Math.ceil(distance/.34);
    for(let i=1;i<=steps;i++){
      sample.copy(aim).addScaledVector(ray,i/steps);
      const lat=Math.atan2(sample.y,Math.hypot(sample.x,sample.z)),lon=Math.atan2(-sample.z,sample.x),p=chart(lat,lon);
      const altitude=sample.length()-radius;
      if(altitude<heightAt(p.x,p.z)+.16||blocks.some(b=>altitude<b.top+.16&&Math.hypot(b.x-p.x,b.z-p.z)<b.r+.10)){
        eye.copy(aim).addScaledVector(ray,Math.max(.01,(i-1)/steps));return;
      }
    }
  }

  // Closely spaced rings provide walkable relief at the player's feet. The last rings
  // bridge to the intact globe, so landing and climbing reveal the same curved ground.
  const rings=[.65,1.4,2.3,3.5,5,7,9.5,12,15,18,22,26,31,36,42,48,55,63,72,82,93,106,121,138,158,181,209,245,275,310,345,380,415,450,480,510,540,570,605,650,735,860,1200,1600,2300,3300,4800,7000,10000];
  const sectors=128,count=1+rings.length*sectors,positions=new Float32Array(count*3),tints=new Float32Array(count*3),uv=new Float32Array(count*2),faces=[];
  for(let j=0;j<rings.length;j++)for(let i=0;i<sectors;i++){
    const a=1+j*sectors+i,b=1+j*sectors+(i+1)%sectors;
    if(!j)faces.push(0,b,a);else faces.push(a-sectors,b,a,b-sectors,b,a-sectors);
  }
  const terrainGeo=new T.BufferGeometry();terrainGeo.setIndex(faces);
  for(const [key,array,size] of [['position',positions,3],['color',tints,3],['uv',uv,2]])terrainGeo.setAttribute(key,new T.BufferAttribute(array,size));
  const pixels=document.createElement('canvas');pixels.width=pixels.height=256;
  const ctx=pixels.getContext('2d'),data=ctx.createImageData(256,256);
  let seed=definition.id==='alpha'?49487:84517;
  // A seamless tile of mineral seams and granular deposits. The UVs stay in
  // survey metres as the spherical terrain patch moves underneath the walker.
  const cells=7,stones=Array.from({length:cells*cells},(_,i)=>[
    .18+.64*(.5+.5*Math.sin(i*31.919+1.2)),.18+.64*(.5+.5*Math.sin(i*14.635+.45))]);
  for(let i=0;i<256*256;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const x=(i%256)*cells/256,z=(i>>8)*cells/256,ix=Math.floor(x),iz=Math.floor(z);
    let nearest=10,second=10;
    for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){
      const s=stones[((ix+a+cells)%cells)+cells*((iz+b+cells)%cells)];
      const dx=x-ix-a-s[0],dz=z-iz-b-s[1],d=dx*dx+dz*dz;
      if(d<nearest){second=nearest;nearest=d;}else if(d<second)second=d;
    }
    const band=second-nearest,vein=(1-T.MathUtils.smoothstep(band,.012,.080))*(.5+.5*Math.sin(tau*z/cells+.4*Math.cos(tau*x/cells)));
    const shade=218+(seed>>>26)*.54-5*nearest-32*vein+3*Math.sin(tau*(x+z)*2/cells);
    const k=i*4;data.data[k]=shade;data.data[k+1]=shade-vein*3;data.data[k+2]=shade-vein*7;data.data[k+3]=255;
  }
  ctx.putImageData(data,0,0);const grain=new T.CanvasTexture(pixels);
  grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.anisotropy=4;
  const terrainMat=new T.MeshStandardMaterial({vertexColors:true,map:grain,bumpMap:grain,bumpScale:.05,roughness:.89});
  const groundMesh=new T.Mesh(terrainGeo,terrainMat);groundMesh.receiveShadow=true;groundMesh.frustumCulled=false;patch.add(groundMesh);
  const colour=new T.Color(),radial=v();
  function placePatch(lat,lon){
    const f=frame(lat,lon);patch.position.copy(f.up).multiplyScalar(radius);patch.quaternion.copy(f.quaternion);
    function sample(i,dist,cs,sn){
      const arc=dist/radius,a=Math.cos(arc),b=Math.sin(arc);
      radial.copy(f.up).multiplyScalar(a).addScaledVector(f.east,b*cs).addScaledVector(f.south,b*sn);
      const ll=chart(Math.asin(T.MathUtils.clamp(radial.y,-1,1)),Math.atan2(-radial.z,radial.x));
      const h=heightAt(ll.x,ll.z),r=radius+h;
      positions[i*3]=b*cs*r;positions[i*3+1]=a*r-radius;positions[i*3+2]=b*sn*r;
      const tint=Math.hypot(ll.x,ll.z)<900?definition.groundTone(ll.x,ll.z,h):palette.rock;
      colour.setHex(tint);
      if(h>24&&Math.hypot(ll.x+60,ll.z+60)>300){
        const upper=h>60;
        colour.setHex(definition.id==='alpha'?(upper?0xb2ac78:0x729295):(upper?0xa98e82:0x796677));
        colour.multiplyScalar(.87+.13*Math.sin(h*.34+ll.x*.010));
      }
      colour.convertSRGBToLinear();colour.toArray(tints,i*3);
      uv[i*2]=ll.x/10;uv[i*2+1]=ll.z/10;
    }
    sample(0,0,1,0);
    for(let j=0;j<rings.length;j++)for(let k=0;k<sectors;k++){
      const angle=k*tau/sectors;sample(1+j*sectors+k,rings[j],Math.cos(angle),Math.sin(angle));
    }
    for(const key of ['position','color','uv'])terrainGeo.attributes[key].needsUpdate=true;
    terrainGeo.computeVertexNormals();terrainGeo.computeBoundingSphere();
    uniforms.capCenter.value.copy(f.up);uniforms.cut.value=Math.cos(9100/radius);
  }
  let mode='hidden',last=null,time=0;
  function update(lat,lon,dt,alt){
    const near=mode==='surface'||(mode==='flight'&&alt<radius*.23);
    patch.visible=near;const c=chart(lat,lon);
    district.visible=near&&alt<2000&&Math.hypot(c.x,c.z)<2300;
    if(district.visible){build();time+=dt;for(const fn of animations)fn(dt,time);}
    if(!near){last=null;uniforms.cut.value=2;return;}
    if(!last||Math.hypot(c.x-last.x,c.z-last.z)>Math.min(470,3.5+alt*.21)){
      placePatch(lat,lon);last=c;
    }
  }
  const nothing=()=>null;
  return {root,globe,radius,sites,landingSites,siteAt,frame,point,move,chart,height,walk,portalAt,
    landingSite:id=>landingSites.find(s=>s.id===id),groundCorrection:()=>0,
    resolveArrival:(lat,lon)=>walk(lat,lon,0,0),clipCamera,
    flightHeight:(lat,lon,r=0)=>footprint(lat,lon,r).top,landingInfo:footprint,
    setMode(next){mode=next;root.visible=next!=='hidden';},update,
    setSunDirection:dir=>uniforms.sunDir.value.copy(dir),
    nearbySpirit:nothing,spiritObservation:nothing,pickSpirit:nothing,withdrawSpirit:nothing,
    safariAction:nothing,safariHint:()=>'',safariWalk:nothing,interactSpiritSite:()=>'',setSafariState(){},
    spiritSiteHint:(lat,lon)=>siteAt(lat,lon)?.description||'',
    dispose(){
      const geo=new Set(),mats=new Set(materials.values()),textures=new Set([grain]);
      root.traverse(o=>{if(o.geometry)geo.add(o.geometry);for(const mat of [].concat(o.material||[])){mats.add(mat);for(const value of Object.values(mat))if(value?.isTexture)textures.add(value);}});
      for(const g of geo)g.dispose();for(const m of mats)m.dispose();for(const tex of textures)tex.dispose();world.remove(root);
    }};
}
