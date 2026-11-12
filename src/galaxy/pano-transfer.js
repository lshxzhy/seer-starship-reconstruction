// One L-01. Surface flight uses the current planet's metre frame; while in
// transit the same pose and velocity integrate in the star-centred inertial frame.
function createPanoFlight(T,bodies,dock,pano,saved){
  const ids=['klose','ocean'],clamp=T.MathUtils.clamp;
  const position=new T.Vector3(),velocity=new T.Vector3(),quaternion=new T.Quaternion();
  const globalP=new T.Vector3(),globalV=new T.Vector3(),wanted=new T.Vector3(),goal=new T.Vector3();
  const centre=new T.Vector3(),orbitalV=new T.Vector3(),axis=new T.Vector3(),turn=new T.Quaternion();
  const right=new T.Vector3(1,0,0),up=new T.Vector3(0,1,0),forward=new T.Vector3(0,0,-1);
  const face=new T.Matrix4(),lookUp=new T.Vector3(),lookAt=new T.Vector3(),localHeading=new T.Vector3();
  const approach=new T.Vector3(),radial=new T.Vector3(),along=new T.Vector3(),segment=new T.Vector3();
  const waypoint=new T.Vector3(),prev=new T.Vector3(),previousRel=new T.Vector3();
  const destinationCentre=new T.Vector3(),relativeV=new T.Vector3();
  const emptyDock={position:new T.Vector3(1e9,0,0),quaternion:new T.Quaternion()};
  const available=id=>ids.includes(id)&&!!bodies[id];
  const tuple=(a,n)=>Array.isArray(a)&&a.length===n&&a.every(Number.isFinite);
  let reference='klose',local=null,transit=false,route=null,time=0,range=0,stage='',scale=1,power=0;
  function createLocal(id,record){
    reference=id;local=createShuttleFlight(T,bodies[id],id==='klose'?dock:emptyDock,record);
    transit=false;syncLocal();
  }
  function syncLocal(){
    position.copy(local.position);quaternion.copy(local.quaternion);velocity.copy(local.velocity);
  }
  function syncInertial(){
    position.copy(globalP).sub(pano.center(reference,time,centre));
    velocity.copy(globalV).sub(pano.velocity(reference,time,orbitalV));
  }
  function siteFor(id,value){
    const b=bodies[id];
    const site=typeof value==='string'?b.landingSite(value):value||b.landingSites[0];
    return site&&Number.isFinite(site.lat)&&Math.abs(site.lat)<=Math.PI/2&&Number.isFinite(site.lon)?site:null;
  }
  function readRoute(raw){
    if(!raw||!available(raw.planet))return null;
    if(raw.destination==='dock')return raw.planet==='klose'?{planet:'klose',destination:'dock',site:null}:null;
    const site=siteFor(raw.planet,raw.site);
    return raw.destination==='surface'&&site?{planet:raw.planet,destination:'surface',site}:null;
  }
  function autopilot(destination,site,targetPlanet=reference){
    const planet=destination==='dock'?'klose':targetPlanet;
    const requested=readRoute({destination,planet,site});
    if(!requested)return false;
    if(requested.site&&!bodies[planet].landingInfo(requested.site.lat,requested.site.lon,7.4).ok)return false;
    if(!transit&&reference===planet){
      const accepted=local.autopilot(destination,requested.site);
      if(accepted)route=null;
      return accepted;
    }
    route=requested;
    if(!transit)local.departSystem();
    return true;
  }
  function enterTransfer(){
    syncLocal();
    globalP.copy(position).add(pano.center(reference,time,centre));
    globalV.copy(velocity).add(pano.velocity(reference,time,orbitalV));
    transit=true;stage=route?'星际转移':'星际手动驾驶';range=0;
  }
  function resumeLocal(id){
    reference=id;syncInertial();localHeading.copy(forward).applyQuaternion(quaternion);
    createLocal(id,{version:1,phase:'flying',p:position.toArray(),v:velocity.toArray(),q:quaternion.toArray(),
      heading:localHeading.toArray(),pitch:0,roll:0});
    if(route){
      const r=route;route=null;local.autopilot(r.destination,r.site);
    }
    syncLocal();
  }
  function approachPoint(r){
    pano.center(r.planet,time,destinationCentre);
    if(r.destination==='dock'){
      approach.copy(dock.position);
      approach.addScaledVector(axis.copy(forward).applyQuaternion(dock.quaternion),10000);
    }else{
      const b=bodies[r.planet];approach.copy(b.frame(r.site.lat,r.site.lon).up).multiplyScalar(b.radius+Math.min(28000,b.radius*.36));
    }
    return goal.copy(approach).add(destinationCentre);
  }
  // If the direct chord touches a planet or the star, advance around its
  // limb in bounded angular steps. The departure and arrival pads may lie on opposite hemispheres.
  function limbWaypoint(end){
    segment.subVectors(end,globalP);const length=segment.length();
    if(length<1)return end;
    segment.multiplyScalar(1/length);
    let nearest=Infinity,obstacle=null;
    for(const id of ['star',...ids]){
      pano.center(id,time,centre);
      const radius=id==='star'?pano.starRadius:bodies[id].radius;
      const radiusLimit=radius+(id==='star'?50000:Math.min(14000,radius*.12));
      radial.subVectors(centre,globalP);
      const projected=clamp(radial.dot(segment),0,length);
      along.copy(radial).addScaledVector(segment,-projected);
      if(along.lengthSq()>=radiusLimit*radiusLimit||projected>=nearest)continue;
      if(projected<1&&radial.dot(segment)<0)continue;
      nearest=projected;obstacle=id;
    }
    if(!obstacle)return end;
    pano.center(obstacle,time,centre);
    radial.subVectors(globalP,centre);const here=radial.length();radial.normalize();
    const radius=obstacle==='star'?pano.starRadius:bodies[obstacle].radius;
    along.subVectors(end,centre).projectOnPlane(radial);
    if(along.lengthSq()<1){
      along.crossVectors(radial,up);
      if(along.lengthSq()<.01)along.crossVectors(radial,right);
    }
    along.normalize();
    const reach=Math.max(here,radius+Math.min(78000,radius*.85)),angle=.30;
    return waypoint.copy(centre).addScaledVector(radial,reach*Math.cos(angle)).addScaledVector(along,reach*Math.sin(angle));
  }
  function guide(dt){
    const end=approachPoint(route),next=limbWaypoint(end);
    range=globalP.distanceTo(end);
    wanted.subVectors(next,globalP);const distance=wanted.length();
    if(distance>.001)wanted.setLength(Math.min(175000,Math.sqrt(2*4200*distance),distance*.62));
    wanted.add(pano.velocity(route.planet,time,orbitalV));
    stage=next===end?(range<160000?'转移轨道 · 进近':'星际巡航 · '+PANO_ORBITS[route.planet].name):'沿星体边缘绕行';
    along.copy(wanted).sub(pano.velocity(reference,time,orbitalV));
    if(along.lengthSq()>5){
      lookAt.copy(globalP).add(along);
      lookUp.copy(position).normalize();
      if(Math.abs(along.normalize().dot(lookUp))>.98)lookUp.copy(up).applyQuaternion(quaternion);
      face.lookAt(globalP,lookAt,lookUp);turn.setFromRotationMatrix(face);
      quaternion.slerp(turn,1-Math.exp(-1.8*dt)).normalize();
    }
  }
  function manualGuidance(dt,input){
    const value=k=>clamp(Number(input[k])||0,-1,1);
    quaternion.multiply(turn.setFromAxisAngle(up,-value('turn')*dt*.82));
    quaternion.multiply(turn.setFromAxisAngle(right,value('pitch')*dt*.71)).normalize();
    const clearance=position.length()-bodies[reference].radius;
    const limit=Math.min(175000,2200+Math.max(0,clearance)*.30);
    wanted.set(value('strafe')*.68,value('lift'),-value('forward')).clampLength(0,1);
    wanted.applyQuaternion(quaternion).multiplyScalar(input.boost?limit:limit*.28);
    if(input.brake)wanted.set(0,0,0);
    wanted.add(pano.velocity(reference,time,orbitalV));
    stage='星际手动驾驶';range=0;
  }
  function protectSurface(id,dt){
    const radius=id==='star'?pano.starRadius:bodies[id].radius;
    pano.center(id,time,centre);radial.subVectors(globalP,centre);
    const altitude=radial.length()-radius;
    if(altitude>radius*.65)return;
    radial.normalize();
    // Bound closing speed as the distance to the approach shell falls. Both
    // manual boost and guidance must leave enough braking distance to enter local flight.
    const v=pano.velocity(id,time,orbitalV),floor=id==='star'?14000:Math.min(8000,radius*.06);
    const limit=Math.sqrt(2*4000*Math.max(0,altitude-floor))+800;
    const inward=-relativeV.copy(globalV).sub(v).dot(radial);
    if(inward>limit)globalV.addScaledVector(radial,Math.min(inward-limit,dt*9800));
    if(altitude<floor){
      if(radial.lengthSq()<.5)radial.copy(previousRel.subVectors(prev,centre)).normalize();
      globalP.copy(centre).addScaledVector(radial,radius+floor);
      if(inward>0)globalV.addScaledVector(radial,inward);
    }
  }
  function transferStep(dt,input){
    if(route)guide(dt);else manualGuidance(dt,input);
    const dv=along.subVectors(wanted,globalV);
    power=Math.min(1,dv.length()/4200);
    globalV.add(dv.clampLength(0,(input.brake&&!route?9600:6800)*dt));
    prev.copy(globalP);globalP.addScaledVector(globalV,dt);time+=dt;
    for(const id of ['star',...ids])protectSurface(id,dt);
    const other=reference==='klose'?'ocean':'klose';
    const dist=(id)=>globalP.distanceTo(pano.center(id,time,centre));
    if(dist(other)/bodies[other].radius<.96*dist(reference)/bodies[reference].radius)reference=other;
    syncInertial();
    if(route&&route.planet===reference){
      const d=globalP.distanceTo(approachPoint(route));
      if(d<9000&&velocity.length()<2100)resumeLocal(reference);
    }else if(!route&&velocity.length()<4400){
      const r=bodies[reference].radius;
      if(position.length()-r<Math.min(26000,r*.30)||(reference==='klose'&&position.distanceTo(dock.position)<2800))resumeLocal(reference);
    }
  }
  function tick(dt,input={}){
    if(!Number.isFinite(dt)||!(dt>0))return;
    dt=Math.min(.25,dt);
    if(!transit){
      local.tick(dt,input);
      const s=local.status();time+=dt*(s.timeScale||1);syncLocal();
      const outsideDock=reference!=='klose'||position.distanceTo(dock.position)>(route?1850:3200);
      const orbitalBoundary=route?Math.min(33000,bodies[reference].radius*.54):Math.min(65000,bodies[reference].radius);
      if(s.phase==='flying'&&outsideDock&&s.clearance>=orbitalBoundary&&(route||!s.auto))enterTransfer();
      return;
    }
    scale=route?8:1;
    let left=dt*scale;
    while(left>1e-7&&transit){
      const step=Math.min(left,.09);transferStep(step,input);left-=step;
    }
  }
  function status(){
    const destinationPlanetId=route?.planet||reference;
    if(!transit){
      const s=local.status();
      if(reference!=='klose')s.canCapture=false;
      if(route){
        s.auto=route.destination;s.targetName=route.site?.name||'赛尔号泊位';s.targetId=route.site?.id||null;
        s.range=position.clone().add(pano.center(reference,time,centre)).distanceTo(approachPoint(route));
      }
      return {...s,planetId:reference,destinationPlanetId,interplanetary:!!route};
    }
    const lat=Math.atan2(position.y,Math.hypot(position.x,position.z)),lon=Math.atan2(-position.z,position.x);
    const b=bodies[reference],height=position.length()-b.radius,f=b.frame(lat,lon);
    localHeading.copy(forward).applyQuaternion(quaternion);
    return {phase:'flying',auto:route?.destination||null,stage,speed:velocity.length(),verticalSpeed:velocity.dot(f.up),
      clearance:Math.max(0,height-b.height(lat,lon)),altitude:height,lat,lon,heading:Math.atan2(localHeading.dot(f.east),localHeading.dot(f.north)),
      range,timeScale:scale,throttle:power,planetId:reference,destinationPlanetId,interplanetary:true,
      targetName:route?.site?.name||(route?.destination==='dock'?'赛尔号泊位':''),targetId:route?.site?.id||null,
      canCapture:false,canLand:false,landingReason:'进入行星近地航段后可着陆'};
  }
  function snapshot(){
    const record=transit?{phase:'flying',auto:route?.destination||null,p:position.toArray(),v:velocity.toArray(),
      q:quaternion.toArray(),heading:localHeading.copy(forward).applyQuaternion(quaternion).toArray()}:local.snapshot();
    return {...record,version:3,planetId:reference,orbitTime:time,inTransit:transit,route:route?{...route,site:route.site?
      {id:route.site.id,name:route.site.name,lat:route.site.lat,lon:route.site.lon}:null}:null};
  }
  function restore(rec){
    rec=compactVehicleRecord(rec,dock);
    if(rec?.version!==3)return false;
    const id=available(rec.planetId)?rec.planetId:'klose';
    const validTime=Number.isFinite(rec.orbitTime)&&rec.orbitTime>=0;
    if(rec.inTransit&&(!tuple(rec.p,3)||!tuple(rec.v,3)||!tuple(rec.q,4)||!validTime))return false;
    if(!rec.inTransit&&(!tuple(rec.p,3)||!tuple(rec.v,3)||!tuple(rec.q,4)||!tuple(rec.heading,3)))return false;
    time=validTime?rec.orbitTime:0;
    route=readRoute(rec.route);
    if(rec.inTransit){
      reference=id;position.fromArray(rec.p);velocity.fromArray(rec.v);quaternion.fromArray(rec.q).normalize();
      globalP.copy(position).add(pano.center(reference,time,centre));globalV.copy(velocity).add(pano.velocity(reference,time,orbitalV));
      transit=true;scale=route?8:1;stage=route?'星际巡航续航':'星际手动驾驶';range=route?globalP.distanceTo(approachPoint(route)):0;return true;
    }
    createLocal(rec.phase==='docked'?'klose':id,{...rec,version:1});return true;
  }
  function placeOnSurface(site,angle=0,planet=reference){
    if(!available(planet))return false;
    const to=siteFor(planet,site);
    if(!to||!bodies[planet].landingInfo(to.lat,to.lon,7.4).ok)return false;
    if(transit||planet!==reference)createLocal(planet,null);
    const result=local.placeOnSurface(to,angle);if(result)route=null;syncLocal();return result;
  }
  if(!restore(saved))createLocal('klose',null);
  return {position,quaternion,velocity,tick,status,autopilot,snapshot,restore,placeOnSurface,
    get orbitTime(){return time;},get planetId(){return reference;},
    launch(){return !transit&&local.launch();},
    manual(){route=null;if(!transit)local.manual();else{stage='星际手动驾驶';range=0;}},
    captureDock(){return !transit&&reference==='klose'&&local.captureDock();},land(){return !transit&&local.land();}};
}
