// Standard shipboard receiving frame. All dimensions are in metres; +Z leads
// away from the machinery and out into the room. Poses use habitat metric
// coordinates, independently of the exterior mesh's display scale.
const shipTransporterGate=Object.freeze({
  z:3.75,halfWidth:.75,halfDepth:.55,jambX:1.42,jambDepth:.48,exitZ:4.90
});

const shipTransporters=(()=>{
  const ports=room=>room?.group?.userData?.shipTransporterPorts||[];
  function nearby(room,pose){
    if(!room||!pose||pose.level!==room.level||!Number.isFinite(pose.y)||
      Math.abs(pose.y-room.center[1])>.8)return null;
    const c=Math.cos(room.yawRad),s=Math.sin(room.yawRad);
    const dx=pose.x-room.center[0],dz=pose.z-room.center[2];
    const x=c*dx-s*dz,z=s*dx+c*dz;
    return ports(room).find(site=>{
      const ca=Math.cos(site.yaw),sa=Math.sin(site.yaw);
      const xx=x-site.x,zz=z-site.z;
      return Math.abs(ca*xx-sa*zz)<=shipTransporterGate.halfWidth &&
        Math.abs(sa*xx+ca*zz-shipTransporterGate.z)<=shipTransporterGate.halfDepth;
    })||null;
  }
  function poseAt(room,id,offset,turn){
    const site=ports(room).find(p=>p.id===id);
    if(!site)return null;
    const x=site.x+Math.sin(site.yaw)*offset,z=site.z+Math.cos(site.yaw)*offset;
    const c=Math.cos(room.yawRad),s=Math.sin(room.yawRad);
    return {x:room.center[0]+c*x+s*z,y:room.center[1],z:room.center[2]-s*x+c*z,
      level:room.level,yaw:room.yawRad+site.yaw+turn};
  }
  return Object.freeze({install:buildShipTransporterRoom,installPorts:installShipTransporterPorts,ports,nearby,
    boardingPose:(room,id)=>poseAt(room,id,shipTransporterGate.z,0),
    returnPose:(room,id)=>poseAt(room,id,shipTransporterGate.exitZ,Math.PI)});
})();

function shipPortFootprint(site,localX,localZ,width,depth) {
  const c=Math.cos(site.yaw),s=Math.sin(site.yaw);
  return {x:site.x+c*localX+s*localZ,z:site.z-s*localX+c*localZ,
    w:Math.abs(c)*width+Math.abs(s)*depth,d:Math.abs(s)*width+Math.abs(c)*depth};
}

function shipTransporterCastings({T,root}) {
  const paints=new Map();
  function paint(color,roughness=.44,metalness=.22,clearcoat=0) {
    const key=[color,roughness,metalness,clearcoat].join('/');
    if(!paints.has(key))paints.set(key,new T.MeshPhysicalMaterial({
      color:new T.Color(color).convertSRGBToLinear(),roughness,metalness,
      clearcoat,clearcoatRoughness:.24}));
    return paints.get(key);
  }
  function casting(geometry,color,z=0,roughness=.44,metalness=.22,clearcoat=0) {
    const mesh=new T.Mesh(geometry,color?.isMaterial?color:paint(color,roughness,metalness,clearcoat));
    mesh.position.z=z;mesh.receiveShadow=true;root.add(mesh);return mesh;
  }
  return {paint,casting};
}

// Install a bank of independent transport positions against a ship bulkhead.
function installShipTransporterPorts(kit,roomId,placements,castings=shipTransporterCastings(kit)) {
  const {T,root,box,cyl,ball,beam,pipe,torus,panel,text,block}=kit;
  const PI=Math.PI,ivory=0xe1ddd0,white=0xe6eff0,steel=0x657f8c;
  const dark=0x243d50,cyan=0x64e4ec,gold=0xe9ad50;
  const {paint,casting}=castings;
  const installed=root.userData.shipTransporterPorts||[];
  const stations=placements.map(site=>{
    const routes=Array.from(new Set([site.destination,...(site.alternates||[])])).map(destination=>{
      const planet=PANO_NAVIGATION.regions[destination]?.definition,landing=planet?.landingSites[0];
      return Object.freeze({destination,destinationName:planet?.name||site.destinationName||'',
        landingSiteId:landing?.id??null,landingSiteName:landing?.name||''});
    });
    return Object.freeze({...site,...routes[0],id:roomId+':'+site.slot,name:site.slot+' 号传送位',routes:Object.freeze(routes)});
  });
  const ids=[...installed,...stations].map(site=>site.id);
  if(new Set(ids).size!==ids.length)throw new Error(roomId+'的传送位编号重复');
  function faceShape(points) {
    const shape=new T.Shape();
    points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));
    shape.closePath();return shape;
  }
  // Only repetitive local fittings are instanced here; whole-ship batching
  // and lighting remain the assembler's responsibility. These are built once.
  const detailBatches=new Map(),unitBox=new T.BoxGeometry(1,1,1),roomFrame=new T.Matrix4();
  const roundPin=new T.CylinderGeometry(1,1,1,16),hexHead=new T.CylinderGeometry(1,1,1,6);
  const washer=new T.TorusGeometry(1,.20,5,16),detailPose=new T.Object3D();
  const alloy=paint(0x91a5af,.25,.82),graphite=paint(0x182932,.79,.07);
  const brass=paint(0xa88c56,.35,.68),porcelain=paint(0xd6dedb,.29,.18,.45);
  // A curved diaphragm sits in the well behind the glass. All transport
  // positions share one blade, one machined seat and one rear optical barrel.
  const bladeOutline=new T.Shape();
  bladeOutline.moveTo(.14,.17);
  bladeOutline.quadraticCurveTo(.46,.14,.62,-.17);
  bladeOutline.quadraticCurveTo(.72,.18,.46,.50);
  bladeOutline.quadraticCurveTo(.22,.54,-.04,.37);
  bladeOutline.lineTo(.14,.17);
  const blade=new T.ExtrudeGeometry(bladeOutline,{depth:.014,bevelEnabled:false,curveSegments:7});
  const bore=new T.TorusGeometry(.68,.045,8,56),blued=paint(0x476979,.32,.68);
  const batchesFor=(geometry,material)=>{
    let materials=detailBatches.get(geometry);
    if(!materials){materials=new Map();detailBatches.set(geometry,materials);}
    if(!materials.has(material))materials.set(material,[]);
    return materials.get(material);
  };
  function stamp(frame,geometry,material,p,s=[1,1,1],r=[0,0,0]) {
    detailPose.position.fromArray(p);detailPose.scale.fromArray(s);
    detailPose.rotation.set(...r);detailPose.updateMatrix();
    batchesFor(geometry,material).push(frame.clone().multiply(detailPose.matrix));
  }
  function stampBeam(frame,a,b,w,d,material) {
    const start=new T.Vector3().fromArray(a),end=new T.Vector3().fromArray(b),delta=end.clone().sub(start);
    detailPose.position.copy(start).add(end).multiplyScalar(.5);
    detailPose.scale.set(w,delta.length(),d);
    detailPose.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());detailPose.updateMatrix();
    batchesFor(unitBox,material).push(frame.clone().multiply(detailPose.matrix));
  }
  function captiveBolt(frame,x,y,z,r=.055) {
    stamp(frame,washer,graphite,[x,y,z],[r*1.34,r*1.34,.095]);
    stamp(frame,hexHead,alloy,[x,y,z+.025],[r,.048,r],[PI/2,0,0]);
    stamp(frame,unitBox,graphite,[x,y,z+.053],[r*.80,r*.16,.008],[0,0,.45]);
  }

  // Share the pointed, genuinely hollow casting between stations. The opening
  // and outer crown use different profiles so the apex reads from eye height.
  const outer=[[-1.18,.55],[-1.87,.98],[-2.14,2.78],[-2.04,4.46],[-1.4,5.92],
    [0,7.04],[1.4,5.92],[2.04,4.46],[2.14,2.78],[1.87,.98],[1.18,.55]];
  const aperture=[[-.90,1.35],[-1.43,2.75],[-1.33,4.38],[-.88,5.56],[0,6.29],
    [.88,5.56],[1.33,4.38],[1.43,2.75],[.90,1.35]];
  const shellShape=faceShape(outer),hole=new T.Path();
  aperture.forEach(([x,y],i)=>i?hole.lineTo(x,y):hole.moveTo(x,y));hole.closePath();
  shellShape.holes.push(hole);
  const shellGeo=new T.ExtrudeGeometry(shellShape,{depth:1.12,bevelEnabled:true,
    bevelSize:.07,bevelThickness:.06,bevelSegments:2,steps:1,curveSegments:8});
  const backGeo=new T.ExtrudeGeometry(faceShape(outer),{depth:.18,bevelEnabled:false});
  const wellGeo=new T.ExtrudeGeometry(faceShape(aperture),{depth:.13,bevelEnabled:false});
  const inset=(sx,sy)=>aperture.map(([x,y])=>[x*sx,3.74+(y-3.74)*sy]);
  function lipGeometry(outline,opening,depth,bevel=.014) {
    const shape=faceShape(outline),voidPath=new T.Path();
    opening.forEach(([x,y],i)=>i?voidPath.lineTo(x,y):voidPath.moveTo(x,y));voidPath.closePath();
    shape.holes.push(voidPath);
    return new T.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelSize:bevel,
      bevelThickness:bevel*.6,bevelSegments:2,steps:1});
  }
  const flangeGeo=lipGeometry(inset(1.11,1.025),inset(.988,.995),.11);
  const sealGeo=lipGeometry(inset(.985,.992),inset(.925,.955),.055,.006);
  const linerGeo=lipGeometry(inset(.93,.959),inset(.84,.918),.30,.018);
  const glassGeo=new T.ExtrudeGeometry(faceShape(inset(.865,.936)),
    {depth:.065,bevelEnabled:true,bevelSize:.016,bevelThickness:.008,bevelSegments:2});
  // A single closed pane, air gap, internal rails and a dark rear well supply
  // depth without a transmission render pass or multiple transparent shells.
  const glassPaint=new T.MeshPhysicalMaterial({color:new T.Color(0x9ec8d2).convertSRGBToLinear(),
    roughness:.11,metalness:.035,clearcoat:1,clearcoatRoughness:.08,
    transparent:true,opacity:.19,depthWrite:false,envMapIntensity:.75});
  const glintGeo=new T.ShapeGeometry([
    faceShape([[-1.00,3.66],[-.96,3.67],[-.66,4.75],[-.22,5.72],[-.26,5.68],[-.71,4.72]]),
    faceShape([[.72,4.39],[.743,4.38],[.50,5.12],[.48,5.13]])]);
  const glintPaint=new T.MeshBasicMaterial({color:0xb6d4df,transparent:true,opacity:.14,
    depthWrite:false,toneMapped:false});
  const shoulderGeo=new T.ExtrudeGeometry([-1,1].map(s=>faceShape([
    [s*1.75,2.20],[s*2.02,2.20],[s*2.10,3.57],[s*1.73,5.12],
    [s*1.48,5.16],[s*1.80,3.55]])),
    {depth:.14,bevelEnabled:true,bevelSize:.025,bevelThickness:.018,bevelSegments:2});
  const footRibGeo=new T.ExtrudeGeometry([-1,1].map(s=>faceShape([
    [s*1.35,.48],[s*2.07,.48],[s*1.94,1.21],[s*1.65,1.45],[s*1.55,.80]])),
    {depth:.22,bevelEnabled:true,bevelSize:.025,bevelThickness:.018,bevelSegments:1});
  const shieldGeo=new T.ExtrudeGeometry(faceShape([[-.79,1.89],[-.89,2.28],[-.36,3.43],
    [0,3.65],[.36,3.43],[.89,2.28],[.79,1.89]]),
    {depth:.27,bevelEnabled:true,bevelSize:.055,bevelThickness:.035,bevelSegments:1});
  const wallZ=-kit.D/2;
  function pod(site) {
    const {x,z,yaw:a,tint,slot,finish,destinationName}=site;
    const silver=finish==='silver';
    const frame=new T.Matrix4().makeRotationY(a);frame.setPosition(x,0,z);
    const frameInverse=frame.clone().invert();
    const g=civicAssembly(kit,x,z,a,()=>{
      cyl(0,.18,0,2.17,2.3,.36,dark);
      cyl(0,.40,0,1.98,2.17,.14,ivory);
      cyl(0,.495,.04,1.72,1.72,.055,tint,{glow:.18});
      torus(0,.54,.04,1.68,.07,tint,{rx:PI/2,glow:.4});
      casting(backGeo,0x4b4a49,-1.29,.63,.28);
      casting(shellGeo,finish==='bronze'?0xb87e43:silver?0xc1c8cc:0xa7997d,-1.08,.32,.26,.42);
      casting(wellGeo,silver?0x233459:0x203b3d,-.99,.67,.18);
      casting(flangeGeo,0x8d9c9e,.015,.29,.75);
      casting(sealGeo,graphite,-.11);
      casting(linerGeo,0x5b7680,-.43,.26,.80);
      const pane=casting(glassGeo,glassPaint,-.30);pane.receiveShadow=false;pane.renderOrder=2;
      const glints=casting(glintGeo,glintPaint,-.221);glints.receiveShadow=false;glints.renderOrder=3;
      casting(shoulderGeo,porcelain,.12);
      // Internal rails remain behind the glass; their dark mounts and bright
      // narrow edges make the air gap legible while moving across the bay.
      for(const s of [-1,1]) {
        stamp(frame,unitBox,graphite,[s*.82,4.18,-.70],[.23,1.66,.24]);
        stamp(frame,unitBox,brass,[s*.82,4.18,-.555],[.075,1.45,.08]);
        for(const y of [3.66,4.18,4.70])
          stamp(frame,unitBox,alloy,[s*.82,y,-.515],[.28,.075,.11]);
      }
      for(const y of [4.84,5.10,5.36])
        stamp(frame,unitBox,graphite,[0,y,-.69],[.92,.09,.12]);
      stamp(frame,roundPin,graphite,[0,4.20,-.72],[.76,.16,.76],[PI/2,0,0]);
      stamp(frame,bore,alloy,[0,4.20,-.60]);
      for(let i=0;i<6;i++)
        stamp(frame,blade,i%2?blued:alloy,[0,4.20,-.625+.003*i],[1,1,1],[0,0,i*PI/3]);
      ball(0,4.20,-.65,.25,.25,.069,tint,{roughness:.16,metalness:.31,glow:.42});
      for(const s of [-1,1]) {
        stampBeam(frame,[s*1.62,5.03,.24],[s*.32,6.71,.24],.12,.16,porcelain);
        box(s*1.93,1.68,.30,.18,.62,.12,gold);
        // Inner hooked links frame the separate silver pointed shield in G07.
        pipe([[s*.52,3.02,.40],[s*1.03,3.69,.37],[s*1.12,4.44,.17],
          [s*.88,5.1,.10]],.12,0x263f43);
        stamp(frame,roundPin,graphite,[s*1.12,3.17,.40],[.31,.16,.31],[PI/2,0,0]);
        stamp(frame,roundPin,alloy,[s*1.12,3.17,.515],[.25,.12,.25],[PI/2,0,0]);
        captiveBolt(frame,s*1.12,3.17,.59,.095);
        for(const [xx,yy,zz] of [[1.95,2.43,.286],[1.92,3.48,.286],[1.60,4.89,.286],[.83,6.05,.327]])
          captiveBolt(frame,s*xx,yy,zz);
        for(const [xx,yy] of [[1.22,2.45],[1.18,4.28],[.65,5.59]])
          captiveBolt(frame,s*xx,yy,-.092,.037);
        stamp(frame,unitBox,graphite,[s*1.45,2.2,-1.40],[.31,1.7,.23]);
        stampBeam(frame,[s*1.4,.6,-1.31],[s*.84,5.9,-1.37],.17,.24,alloy);
        // Shoulder ribs across the rear reveal and an upper service truss are
        // original hidden construction, not additional game-proven devices.
        for(const y of [2.65,3.65,4.65])
          stamp(frame,unitBox,alloy,[s*1.77,y,-.63],[.18,.14,.98]);
        // Backboard anchors are in room coordinates; undo the station yaw
        // before joining them so each truss actually closes onto its bracket.
        const mountA=new T.Vector3(x+s*1.52,6.14,wallZ+1.20).applyMatrix4(frameInverse).toArray();
        const mountB=new T.Vector3(x+s*.74,6.54,wallZ+1.20).applyMatrix4(frameInverse).toArray();
        stampBeam(frame,[s*1.52,4.20,-1.55],mountA,.17,.22,alloy);
        stampBeam(frame,mountA,mountB,.17,.22,alloy);
        stamp(roomFrame,unitBox,alloy,[x+s*1.13,6.35,wallZ+1.015],[1.10,.90,.33]);
        for(const y of [6.04,6.66])captiveBolt(roomFrame,x+s*1.13,y,wallZ+1.19,.065);
        stamp(frame,unitBox,graphite,[s*1.52,4.20,-1.46],[.40,.43,.18]);
        captiveBolt(frame,s*1.52,4.20,-1.345,.070);
      }
      casting(shieldGeo,0x7e929f,.28,.24,.78);
      const face=casting(shieldGeo,silver?0xd4d9e7:white,.58,.31,.17,.45);face.scale.set(.72,.84,.35);face.position.y=.42;
      stampBeam(frame,[0,2.02,.76],[0,3.32,.76],.10,.07,alloy);
      for(const xx of [-.43,.43])captiveBolt(frame,xx,2.30,.697,.038);
      ball(0,1.43,.72,1.21,.20,.78,tint,{glow:.16});
      cyl(0,1.03,.57,.83,.98,.3,steel);
      box(0,.92,1.15,.22,.86,.26,ivory);
      box(0,.96,1.30,.055,.66,.045,tint,{glow:.45});
      torus(0,6.65,.28,.29,.06,cyan,{glow:.45});
      box(0,6.64,.30,.23,.27,.11,white,{rz:PI/4});
      // Two original upper treads stop at the fixed machinery. The advancing
      // lower tongue is a flush receiving deck with an upright, open scan frame.
      for(const [yy,zz,hh,dd] of [[.16,2.04,.32,.46],[.25,1.61,.50,.40]]) {
        box(0,yy,zz,2.18,hh,dd,ivory);
        box(0,yy,zz+dd/2+.025,2.18,.08,.05,dark);
        for(let j=0;j<4;j++)stamp(frame,unitBox,graphite,
          [0,yy+hh/2+.012,zz-dd*.32+j*dd*.21],[1.76,.018,.030]);
      }
      const {z:scanZ,halfWidth,halfDepth,jambX,jambDepth}=shipTransporterGate;
      box(0,.035,scanZ,2*jambX+.24,.042,2*halfDepth+.47,steel);
      box(0,.064,scanZ,2*halfWidth,.017,2*halfDepth,dark);
      for(const s of [-1,1]){
        box(s*halfWidth,.078,scanZ,.055,.012,2*halfDepth,tint,{glow:.42});
        box(0,.078,scanZ+s*halfDepth,2*halfWidth,.012,.055,tint,{glow:.42});
        box(s*jambX,.20,scanZ,.28,.40,jambDepth,dark);
        box(s*jambX,1.40,scanZ,.18,2.59,.28,ivory);
        box(s*jambX,1.43,scanZ+.15,.065,1.99,.035,tint,{glow:.55});
        beam([s*jambX,2.64,scanZ],[s*(jambX-.31),2.98,scanZ],.18,.28,ivory);
        stamp(frame,roundPin,alloy,[s*jambX,.40,scanZ+.20],[.11,.07,.11],[PI/2,0,0]);
      }
      const routeColor=PANO_ORBITS[site.destination]?.colour??tint;
      // Anchor the larger route plate to the original gate lintel; its lower edge stays at 2.86 m.
      const alternate=site.routes.slice(1),extra=alternate.length ? .40 : 0;
      box(0,3.24+extra*.5,scanZ,3.46,.76+extra,.29,dark);
      box(0,3.595+extra,scanZ+.15,3.40,.045,.025,routeColor,{glow:.36});
      text(0,3.37+extra,scanZ+.167,slot+'  '+destinationName,3.25,.45,white);
      text(0,3.015+extra,scanZ+.168,site.landingSiteName,2.85,.26,routeColor);
      if(extra)text(0,3.035,scanZ+.168,'支线 '+alternate.map(r=>r.destinationName).join(' / '),3.25,.32,
        PANO_ORBITS[alternate[0].destination]?.colour||white);
      // Opposed three-lens scan heads sit flush on the outside jambs. Their
      // smoked hood and inset cyan optics keep the passage physically clear.
      for(const s of [-1,1]){
        stamp(frame,unitBox,graphite,[s*jambX,1.62,scanZ+.158],[.195,.55,.056]);
        for(let j=0;j<3;j++){
          const y=1.46+j*.16;
          stamp(frame,roundPin,alloy,[s*jambX,y,scanZ+.208],[.062,.056,.062],[PI/2,0,0]);
          ball(s*jambX,y,scanZ+.243,.041,.041,.019,tint,{glow:.40,roughness:.20});
        }
      }
      casting(footRibGeo,0x8e9a98,.68,.38,.60);
      for(const s of [-1,1]) {
        stamp(frame,unitBox,graphite,[s*1.75,.86,.935],[.16,.30,.025]);
        captiveBolt(frame,s*1.84,.58,.927,.045);
      }
      // Independent side socket, exposed piston and hinged service cover.
      box(2.48,1.72,-.2,.77,2.8,1.08,ivory,{roughness:.34,metalness:.24});
      box(2.91,1.73,-.19,.12,2.18,.79,steel,{roughness:.29,metalness:.68});
      stamp(frame,roundPin,brass,[2.91,2.25,.29],[.23,.16,.23],[PI/2,0,0]);
      captiveBolt(frame,2.91,2.25,.39,.10);
      stamp(frame,unitBox,graphite,[2.48,1.43,.377],[.64,1.45,.11]);
      for(const y of [.66,2.20])stamp(frame,unitBox,alloy,[2.48,y,.42],[.72,.12,.18]);
      for(const xx of [2.20,2.76])stamp(frame,unitBox,alloy,[xx,1.43,.42],[.09,1.42,.18]);
      for(let j=0;j<11;j++)stamp(frame,unitBox,alloy,
        [2.48,.83+j*.115,.475],[.58,.045,.22],[-.22,0,0]);
      for(const y of [1.05,1.98]) {
        stamp(frame,unitBox,graphite,[2.94,y,-.55],[.25,.76,.25]);
        stamp(frame,roundPin,alloy,[3.00,y,-.55],[.10,.58,.10]);
        for(const e of [-1,1])stamp(frame,roundPin,brass,[3.00,y+e*.30,-.55],[.13,.08,.13]);
      }
      for(const xx of [2.20,2.76])for(const y of [.63,2.19])captiveBolt(frame,xx,y,.520,.038);
      pipe([[1.95,3.52,-.15],[2.53,3.22,.03],[2.58,2.28,.20]],.10,dark);
      beam([2.1,.62,.18],[2.6,1.35,.18],.16,.16,steel);
      panel(2.48,2.73,.39,.71,.72,tint);
      // The cabinet and its reader stay outside the passenger scan opening.
      stamp(frame,unitBox,graphite,[2.48,2.29,.437],[.58,.13,.095]);
      stamp(frame,unitBox,alloy,[2.48,2.30,.49],[.43,.045,.03]);
      // Rear access panel and conduit can be seen on a walk around the appliance.
      box(0,3.3,-1.39,1.32,2.5,.18,0x445966);
      stamp(frame,unitBox,graphite,[0,3.19,-1.50],[1.05,1.61,.07]);
      for(let i=0;i<7;i++)stamp(frame,unitBox,alloy,[0,2.51+i*.23,-1.565],[.91,.065,.13],[.20,0,0]);
      pipe([[-.72,1,-1.45],[-.87,3.2,-1.52],[0,6.2,-1.1]],.09,gold);
    });
    g.name=site.name;g.userData.shipTransporterPort=site.id;
    // The circular pedestal occupies the same square at every mounting angle.
    // Bound each jamb separately so a passenger can stand between them.
    block(x,z,4.64,4.64);
    const {z:scanZ,jambX,jambDepth}=shipTransporterGate;
    for(const [xx,zz,w,d] of [[2.60,-.1,1.24,1.48],[-jambX,scanZ,.28,jambDepth],[jambX,scanZ,.28,jambDepth]]) {
      const part=shipPortFootprint(site,xx,zz,w,d);
      block(part.x,part.z,part.w,part.d);
    }
  }
  stations.forEach(pod);
  // Each backboard terminates at the rear bulkhead of its host room.
  for(const {x,z,tint} of stations){
    box(x,4.1,wallZ+.48,5.7,7.8,.37,0x5b5147);
    box(x,4.35,wallZ+.75,5.30,6.34,.27,0xb09a75);
    box(x,6.55,wallZ+.97,4.73,.72,.28,0x372f31);
    for(let i=0;i<8;i++)box(x-1.91+i*.54,6.54,wallZ+1.15,.31,.49,.12,0x8a755f,{rz:.19});
    for(const s of [-1,1]){
      box(x+s*2.39,3.45,wallZ+1.04,.25,3.94,.18,0xd7b778);
      box(x+s*2.39,3.64,wallZ+1.16,.085,1.41,.07,tint,{glow:.43});
    }
    pipe([[x,7.45,wallZ+.77],[x,7.45,wallZ+2.15],[x,6.34,z-1.25],[x,5.72,z-.86]],.18,0x8c7149);
    block(x,wallZ+.58,5.75,.71);
  }

  let detailCount=0,detailDraws=0;
  for(const [geometry,materials] of detailBatches)for(const [material,matrices] of materials) {
    const instances=new T.InstancedMesh(geometry,material,matrices.length);
    instances.name='传送舱 · 可复用机械附件';
    matrices.forEach((matrix,i)=>instances.setMatrixAt(i,matrix));
    instances.instanceMatrix.needsUpdate=true;instances.frustumCulled=false;
    instances.receiveShadow=true;root.add(instances);
    detailCount+=matrices.length;detailDraws++;
  }
  const previous=root.userData.teleportDetailInstances;
  root.userData.teleportDetailInstances={count:detailCount+(previous?.count||0),draws:detailDraws+(previous?.draws||0)};
  root.userData.shipTransporterPorts=[...installed,...stations];
  return stations;
}

// G07 room fit-out: the same bank can be installed without this forecourt.
function buildShipTransporterRoom(kit,roomId,placements) {
  const {T,root,box,cyl,ball,beam,pipe,torus,panel,text,block,W,H}=kit;
  const PI=Math.PI,ivory=0xe1ddd0,white=0xe6eff0,steel=0x657f8c;
  const dark=0x243d50,cyan=0x64e4ec,gold=0xe9ad50;
  root.userData.civicReference='G07 / 2012-05-08 scene; rear construction, dimensions and overhead feed inferred';
  const castings=shipTransporterCastings(kit),{casting}=castings;
  const stations=installShipTransporterPorts(kit,roomId,placements,castings);
  // Flush blue foreground and inlaid guides: no central machine blocks the hero view.
  cyl(0,.015,.1,8.3,8.3,.022,0x234c80);
  cyl(0,.030,.1,7.65,7.65,.015,0x315e99);
  torus(0,.043,.1,7.28,.045,0x95c7e4,{rx:PI/2});
  torus(0,.043,.1,5.55,.05,0x1e376a,{rx:PI/2});
  torus(0,.043,.1,3.65,.033,0x8eb6dc,{rx:PI/2});
  for(let i=0;i<24;i++) {
    const a=i*PI/12;
    box(Math.cos(a)*7.95,.052,.1+Math.sin(a)*7.95,.55,.028,.13,
      i%3===0?cyan:0x829faf,{ry:-a,glow:i%3===0?.25:0});
  }
  for(const s of [-1,1]) {
    box(s*2.4,.022,10.4,.10,.025,7.4,0x9ac4d0);
    for(let i=0;i<4;i++)box(s*2.4,.043,8.4+i*1.3,.12,.025,.48,cyan,{glow:.25});
  }
  // G07 has a broad segmented silver apron and thick cream arc, not just lines.
  // Split the raised side arcs to keep a generous passage through the rear centre.
  function arcCasting(r0,r1,a0,a1,top,depth,color) {
    const shape=new T.Shape();
    shape.moveTo(Math.cos(a0)*r1,Math.sin(a0)*r1);
    shape.absarc(0,0,r1,a0,a1,false);
    shape.lineTo(Math.cos(a1)*r0,Math.sin(a1)*r0);
    shape.absarc(0,0,r0,a1,a0,true);shape.closePath();
    const part=casting(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:24}),color);
    part.rotation.x=PI/2;part.position.set(0,top,.1);return part;
  }
  for(let i=0;i<28;i++) {
    const a=i*PI/14;
    arcCasting(8.34,9.17,a+.012,a+PI/14-.012,.047,.04,i%2?0x788b99:0x9cafbc);
  }
  // Lower sections of the side galleries yield to the actual receiver decks.
  // Use their full feet and disembarkation apron as the cut-out template.
  const {jambX,exitZ}=shipTransporterGate;
  const walks=stations.map(site=>shipPortFootprint(site,0,(2.28+exitZ+.48)/2,
    2*jambX+.40,exitZ+.48-2.28));
  for(const [a0,a1] of [[PI*1.02,PI*1.36],[PI*1.64,PI*1.98]]) {
    // Small separate AABBs follow the curve instead of fencing off its empty centre.
    for(let i=0;i<10;i++) {
      const aa=a0+(a1-a0)*i/10,bb=a0+(a1-a0)*(i+1)/10;
      const xs=[8.5,10.06].flatMap(r=>[Math.cos(aa)*r,Math.cos(bb)*r]);
      const zs=[8.5,10.06].flatMap(r=>[Math.sin(aa)*r+.1,Math.sin(bb)*r+.1]);
      const x=(Math.min(...xs)+Math.max(...xs))/2,z=(Math.min(...zs)+Math.max(...zs))/2;
      const w=Math.max(...xs)-Math.min(...xs)+.08,d=Math.max(...zs)-Math.min(...zs)+.08;
      if(walks.some(q=>Math.abs(q.x-x)<(q.w+w)/2 && Math.abs(q.z-z)<(q.d+d)/2))continue;
      for(const [r0,r1,top,c] of [[8.5,9.02,.16,steel],[9.02,9.62,.31,ivory],[9.62,10.06,.43,white]])
        arcCasting(r0,r1,aa,bb,top,top-.035,c);
      block(x,z,w,d);
      const a=(aa+bb)/2;
      box(Math.cos(a)*9.27,.329,.1+Math.sin(a)*9.27,.055,.028,.54,0x526571,{ry:PI/2-a});
    }
  }

  // High distribution collar: an engineering completion of the visible pod feed.
  // The lower edge is above eight metres, leaving all of the walking volume clear.
  const halo=torus(0,8.9,-6.7,7.2,.27,steel,{rx:PI/2});halo.scale.x*=1.85;
  const haloTop=torus(0,9.05,-6.7,7.2,.12,ivory,{rx:PI/2});haloTop.scale.x*=1.85;
  const haloLight=torus(0,8.72,-6.7,7.2,.045,cyan,{rx:PI/2,glow:.30});haloLight.scale.x*=1.85;
  stations.forEach(({x,z})=>{
    const a=Math.atan2((z+6.7)/7.2,x/13.32),hx=Math.cos(a)*13.32,hz=-6.7+Math.sin(a)*7.2;
    pipe([[x,7.04,z-.7],[x,7.65,z-.85],[hx,8.45,hz],[hx,8.85,hz]],.14,gold);
    box(hx,8.88,hz,.65,.72,.74,ivory);
    for(const h of [8.49,8.57])cyl(hx,h,hz,.226,.226,.063,steel,{segments:12});
    for(const side of [-1,1]){
      box(hx+side*.27,8.70,hz,.16,.15,.78,steel);
      cyl(hx+side*.27,8.80,hz+.23,.065,.065,.08,gold,{segments:6});
    }
  });
  for(const s of [-1,1])for(const z of [-10,-3]) {
    beam([s*13,9.05,z],[s*(W/2-.4),H-.9,z],.34,.42,steel);
    box(s*(W/2-.45),H-1.0,z,.66,.7,1.3,ivory);
  }
  // Recessed rear navigation screen has a housing, side fins and a readable glyph.
  box(0,4.0,-14.24,5.2,4.6,.64,steel);
  panel(0,4.05,-13.88,4.65,3.9,cyan);
  torus(0,4.18,-13.79,1.12,.08,cyan,{glow:.55});
  torus(0,4.18,-13.77,.64,.045,white);
  for(const s of [-1,1])box(s*1.72,4.18,-13.76,.46,.08,.04,cyan,{glow:.4});
  text(0,2.55,-13.77,'航 路 定 位',3.4,.38,white);
  text(0,7.2,-14.2,'传 送 舱',6.4,.76,ivory);
  block(0,-14.24,5.3,.76);

  // Mark each destination on the approach floor and the rear bulkhead. The doorway and
  // queue stay clear; the room, gate and flight deck all use the same installed addresses.
  const routes=new Map();
  for(const site of [...stations].sort((a,b)=>a.x-b.x)){
    if(!routes.has(site.destination))routes.set(site.destination,[]);
    routes.get(site.destination).push(site);
  }
  for(const [i,bank] of [...routes.values()].entries()){
    const site=bank[0],slots=bank.map(p=>p.slot).join(' / ');
    const routeColor=PANO_ORBITS[site.destination]?.colour??site.tint;
    const rearX=bank.reduce((sum,p)=>sum+p.x,0)/bank.length;
    const frontX=(i+.5-routes.size/2)*Math.min(5.2,W*.55/routes.size);
    const frontZ=kit.D/2-5.45,wallZ=-kit.D/2+.74;
    const shared=site.routes.slice(1).filter(r=>bank.every(p=>p.routes.some(line=>line.destination===r.destination)));
    box(rearX,8.44,wallZ,5.5,1.20,.20,dark);
    box(rearX,8.98,wallZ+.102,5.43,.075,.023,routeColor,{glow:.4});
    text(rearX,shared.length?8.64:8.44,wallZ+.122,slots+'  '+site.destinationName,5.15,shared.length ? .51 : .72,white);
    if(shared.length)text(rearX,8.13,wallZ+.122,'支线 '+shared.map(r=>r.destinationName).join(' / '),5.15,.37,
      PANO_ORBITS[shared[0].destination]?.colour||white);
    box(frontX,.071,frontZ,4.26,.024,.94,dark);
    text(frontX,.090,frontZ,slots+'  '+site.destinationName,4.05,.75,routeColor,{rx:-PI/2});
  }

  // The small orange unit in front of the green/purple bays is a separate
  // apparatus in the reference. Its exact function is not established there.
  const frontUnit=civicAssembly(kit,7.6,-3.8,-.12,()=>{
    cyl(0,.19,0,1.30,1.48,.38,dark,{segments:16});
    cyl(0,.43,0,1.12,1.30,.17,steel,{segments:16});
    cyl(0,.56,0,.88,1.06,.10,0x45689e);
    torus(0,.63,0,.80,.08,gold,{rx:PI/2});
    box(0,.99,-.31,.72,.75,.58,0x3d639a);
    box(0,1.35,-.18,.55,.45,.52,0xb75b43,{rx:-.26});
    torus(0,1.81,-.12,.57,.17,0xd1783e,{arc:PI});
    torus(0,1.81,.06,.57,.055,gold,{arc:PI});
    box(0,2.16,-.12,.58,.24,.57,gold,{rz:.28});
    box(0,2.16,.20,.38,.12,.07,cyan,{glow:.2});
    for(const s of [-1,1]) {
      pipe([[s*.75,.51,.5],[s*1.13,.83,.22],[s*1.25,1.38,-.17],
        [s*.96,1.84,-.37]],.17,0xc28a42);
      beam([s*.98,.70,.24],[s*1.16,1.35,-.15],.10,.12,white);
      cyl(s*1.12,1.36,.02,.24,.24,.24,dark,{rx:PI/2});
      cyl(s*1.12,1.36,.16,.14,.14,.08,gold,{rx:PI/2});
      box(s*.75,.23,.93,.22,.43,.53,gold);
    }
    box(0,.18,1.26,1.35,.36,.47,ivory);
    box(0,.20,1.51,.73,.18,.05,steel);
  });
  frontUnit.position.y=.43;
  cyl(7.6,.215,-3.8,1.55,1.55,.43,dark,{segments:16});
  block(7.6,-3.7,3.28,3.45);
  // G07's right-hand yellow machine has volume, a circular readout and keypad.
  civicAssembly(kit,14.2,1.4,-.36,()=>{
    box(0,.17,0,2.8,.34,2.25,dark);
    box(0,1.92,-.15,2.36,3.30,1.60,0xbba04c);
    box(0,3.63,-.15,1.94,.2,1.42,ivory);
    box(0,2.25,.72,2.45,2.09,.26,steel);
    cyl(0,2.30,.93,.93,.93,.23,0x367ba5,{rx:PI/2});
    cyl(0,2.30,1.064,.76,.76,.045,0x246e7d,{rx:PI/2,glow:.12});
    torus(0,2.30,1.10,.76,.075,cyan,{glow:.25});
    for(let mark=0;mark<15;mark++){
      const a=(mark/14*1.46-.73)*PI;
      box(Math.sin(a)*.64,2.30+Math.cos(a)*.64,1.120,.021,mark%2?.07:.13,.021,white,{rz:-a});
    }
    text(0,2.31,1.15,'16.1',1.25,.44,cyan);
    box(0,.91,1.02,1.25,.46,.79,gold,{rx:-.30});
    for(let row=0;row<3;row++)for(let col=0;col<3;col++)
      cyl(-.34+col*.34,1.10+row*.06,.76+row*.19,.085,.085,.045,dark,{rx:-.30});
    cyl(1.29,1.73,-.02,.44,.44,.20,steel,{rz:PI/2});
    cyl(1.42,1.73,-.02,.23,.23,.09,dark,{rz:PI/2});
    box(0,1.84,-1.02,1.72,2.25,.18,steel);
    for(let i=0;i<6;i++)box(0,1.2+i*.21,-1.13,1.20,.065,.04,dark);
    pipe([[-1.1,.65,-.65],[-1.39,1.3,-.75],[-1.27,2.85,-.7]],.11,dark);
  });
  block(14.2,1.6,4.12,4.32);
  // Layered semicircular approach under the tall navigation column, visible
  // at the left of the game view. Rear internals and dimensions are inferred.
  civicAssembly(kit,-15.85,-1.2,.40,()=>{
    for(const [y,r,h] of [[.09,2.55,.18],[.23,2.18,.28],[.41,1.80,.34]]) {
      cyl(0,y,-.65,r,r,h,0x9b8e75);
      torus(0,y+h/2,-.65,r-.05,.035,dark,{rx:PI/2});
    }
    box(0,3.9,-1.15,3.35,6.15,1.12,steel);
    box(0,4.27,-.50,2.9,4.90,.22,dark);
    box(0,4.3,-.32,2.64,4.46,.05,0x3b6265);
    text(0,4.80,-.25,'3',1.60,1.85,cyan);
    for(let i=0;i<4;i++)box(.8,3.23+i*.44,-.24,.48,.11,.035,cyan,{glow:.16});
    box(0,6.9,-.93,3.63,.28,1.43,ivory);
    box(0,6.7,-.2,2.57,.085,.08,cyan,{glow:.2});
    box(0,3.7,-1.79,2.44,3.84,.15,0x52616a);
  });
  block(-15.85,-1.8,5.92,5.96);

  // Separate waiting alcoves; all seats and queue posts stay outside |x| < 7.5.
  for(const s of [-1,1]) {
    civicAssembly(kit,s*14,7,s>0?-PI/2:PI/2,()=>{
      box(0,.23,0,4.8,.46,1.55,dark);
      box(0,.56,0,4.88,.2,1.68,ivory);
      box(0,1.03,-.72,4.88,.83,.24,steel);
      for(const x of [-2.15,0,2.15])box(x,.82,0,.14,.35,1.52,gold);
      for(const x of [-1.17,1.17])box(x,.68,.04,2.12,.055,1.28,0x7aa6bb);
    });
    block(s*14,7,1.95,5.1);
    for(const z of [3.9,6.2]) {
      cyl(s*8.9,.75,z,.075,.075,1.5,steel);
      cyl(s*8.9,.06,z,.31,.31,.12,dark);
      ball(s*8.9,1.53,z,.12,.12,.12,cyan,{glow:.2});
      block(s*8.9,z,.64,.64);
    }
    pipe([[s*8.9,1.4,3.9],[s*8.9,1.25,5],[s*8.9,1.4,6.2]],.035,0x9cb2bc);
    block(s*8.9,5.05,.12,2.45);
  }
  panel(-18.65,2.6,2,3.4,1.4,cyan,{ry:PI/2});
  text(-18.59,2.62,2,'资料室  /  等候区',3.1,.38,white,{ry:PI/2});
  for(const x of [-17.7,17.7])for(const z of [-11,-2,10]) {
    box(x,.55,z,.35,.84,.64,steel);
    box(x,.86,z+.34,.22,.18,.04,cyan,{glow:.45});
    block(x,z,.4,.7);
  }
}
