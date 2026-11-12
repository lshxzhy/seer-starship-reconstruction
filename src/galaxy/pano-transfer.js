// One L-01. Surface flight uses the current planet's metre frame; while in
// transit the same pose and velocity integrate in the star-centred inertial frame.
function createPanoFlight(T,getSurface,dock,pano,saved){
  const ids=Object.keys(PANO_ORBITS),clamp=T.MathUtils.clamp,cruiseLimit=260000;
  const position=new T.Vector3(),velocity=new T.Vector3(),quaternion=new T.Quaternion();
  const globalP=new T.Vector3(),globalV=new T.Vector3(),wanted=new T.Vector3(),goal=new T.Vector3();
  const centre=new T.Vector3(),orbitalV=new T.Vector3(),axis=new T.Vector3(),turn=new T.Quaternion();
  const right=new T.Vector3(1,0,0),up=new T.Vector3(0,1,0),forward=new T.Vector3(0,0,-1);
  const face=new T.Matrix4(),lookUp=new T.Vector3(),lookAt=new T.Vector3(),localHeading=new T.Vector3();
  const approach=new T.Vector3(),radial=new T.Vector3(),along=new T.Vector3(),segment=new T.Vector3();
  const waypoint=new T.Vector3(),prev=new T.Vector3(),previousRel=new T.Vector3();
  const destinationCentre=new T.Vector3(),relativeV=new T.Vector3(),priorCentre=new T.Vector3();
  const emptyDock={position:new T.Vector3(1e9,0,0),quaternion:new T.Quaternion()};
  const available=id=>ids.includes(id);
  const definition=id=>PANO_NAVIGATION.regions[id].definition;
  const tuple=(a,n)=>Array.isArray(a)&&a.length===n&&a.every(Number.isFinite);
  let reference='klose',local=null,transit=false,route=null,time=0,range=0,stage='',scale=1,power=0,boostPower=0,coastSign=1;
  function createLocal(id,record){
    reference=id;local=definition(id).kind==='ship'?createShipApproach(T,getSurface(id),record):
      createShuttleFlight(T,getSurface(id),id==='klose'?dock:emptyDock,record,id);
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
    const b=getSurface(id);
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
    if(requested.site&&!getSurface(planet).landingInfo(requested.site.lat,requested.site.lon,7.4).ok)return false;
    if(!transit&&reference===planet){
      const accepted=local.autopilot(destination,requested.site);
      if(accepted)route=null;
      return accepted;
    }
    route=requested;
    boostPower=0;
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
    if(definition(id).kind==='ship')radial.copy(up);else radial.copy(position).normalize();
    const pitch=Math.asin(clamp(localHeading.dot(radial),-1,1));
    const side=axis.copy(right).applyQuaternion(quaternion);
    const flatRight=along.crossVectors(localHeading,radial);
    const roll=flatRight.lengthSq()>.0001?Math.atan2(side.dot(radial),side.dot(flatRight.normalize())*Math.cos(pitch)):0;
    createLocal(id,{version:5,planetId:id,planetRadius:definition(id).radius,systemScale:compactVoyageSystemScale,
      phase:'flying',p:position.toArray(),v:velocity.toArray(),q:quaternion.toArray(),
      heading:localHeading.toArray(),pitch,roll});
    if(route){
      const r=route;route=null;local.autopilot(r.destination,r.site);
    }
    syncLocal();
  }
  function approachPoint(r){
    pano.center(r.planet,time,destinationCentre);
    if(r.destination==='dock'){
      approach.copy(dock.position);
      approach.addScaledVector(axis.copy(forward).applyQuaternion(dock.quaternion),1000);
    }else if(definition(r.planet).kind==='ship'){
      approach.copy(getSurface(r.planet).point(r.site.lat,r.site.lon)).addScaledVector(up,2200);
    }else{
      const b=getSurface(r.planet);approach.copy(b.frame(r.site.lat,r.site.lon).up).multiplyScalar(b.radius+Math.min(28000,b.radius*.36));
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
      const radius=id==='star'?pano.starRadius:definition(id).radius;
      const radiusLimit=radius+(id==='star'?radius*.18:Math.min(14000,radius*.12));
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
    const radius=obstacle==='star'?pano.starRadius:definition(obstacle).radius;
    along.subVectors(end,centre).projectOnPlane(radial);
    if(along.lengthSq()<1){
      along.crossVectors(radial,up);
      if(along.lengthSq()<.01)along.crossVectors(radial,right);
    }
    along.normalize();
    const reach=Math.max(here,radius+radius*(obstacle==='star' ? .35 : .85)),angle=.30;
    return waypoint.copy(centre).addScaledVector(radial,reach*Math.cos(angle)).addScaledVector(along,reach*Math.sin(angle));
  }
  function guide(dt){
    const end=approachPoint(route),next=limbWaypoint(end);
    range=globalP.distanceTo(end);
    wanted.subVectors(next,globalP);const distance=wanted.length();
    if(distance>.001)wanted.setLength(Math.min(800,Math.sqrt(2*600*distance),distance*.32));
    wanted.add(pano.velocity(route.planet,time,orbitalV));
    stage=next===end?(range<2400?'转移轨道 · 进近':'星际巡航 · '+PANO_ORBITS[route.planet].name):'沿星体边缘绕行';
    // Follow the actual route-relative track. Changing the nearest reference
    // planet must not abruptly replace either the nose direction or camera up.
    along.copy(globalV).sub(pano.velocity(route.planet,time,orbitalV));
    if(along.lengthSq()<5)along.copy(wanted).sub(orbitalV);
    if(along.lengthSq()>5){
      lookAt.copy(globalP).add(along);
      lookUp.copy(up).applyQuaternion(quaternion);
      if(Math.abs(along.normalize().dot(lookUp))>.98)
        lookUp.crossVectors(axis.copy(right).applyQuaternion(quaternion),along).normalize();
      face.lookAt(globalP,lookAt,lookUp);turn.setFromRotationMatrix(face);
      quaternion.slerp(turn,1-Math.exp(-1.8*dt)).normalize();
    }
  }
  function manualGuidance(dt,input){
    const value=k=>clamp(Number(input[k])||0,-1,1);
    quaternion.multiply(turn.setFromAxisAngle(up,-value('turn')*dt*1.4-(Number(input.lookYaw)||0)));
    quaternion.multiply(turn.setFromAxisAngle(right,value('pitch')*dt*.95+(Number(input.lookPitch)||0))).normalize();
    boostPower=clamp(boostPower+(input.boost ? .22 : -.32)*dt,0,1);
    const clearance=position.length()-definition(reference).radius;
    let limit=Math.min(cruiseLimit,3200+Math.max(0,clearance)*.49);
    if(reference==='klose'){
      const fromBerth=position.distanceTo(dock.position);
      // This local berth is high above the ground. Closing speed must depend
      // on the ship as well as on altitude until the deck controller takes over.
      limit=Math.min(limit,Math.sqrt(900*900+2*8000*Math.max(0,fromBerth-4200)));
    }
    const drive=value('forward')||(input.boost?1:0);
    if(drive)coastSign=Math.sign(drive);
    wanted.set(value('strafe')*.68,value('lift'),-drive).clampLength(0,1);
    wanted.applyQuaternion(quaternion).multiplyScalar(limit*(.52+.48*boostPower));
    if(input.brake)wanted.set(0,0,0);
    wanted.add(pano.velocity(reference,time,orbitalV));
    stage=input.boost?'星际加力 · '+Math.round(boostPower*100)+'%':'星际手动驾驶';range=0;
  }
  function protectSurface(id,dt){
    const radius=id==='star'?pano.starRadius:definition(id).radius;
    pano.center(id,time,centre);radial.subVectors(globalP,centre);
    const altitude=radial.length()-radius;
    const travel=prev.distanceTo(globalP);
    const brakingReach=id==='byron'?Math.max(7000,travel+radius):Math.max(radius*.65,travel+radius*.2);
    if(altitude>brakingReach)return;
    radial.normalize();
    // Bound closing speed as the distance to the approach shell falls. Both
    // manual boost and guidance must leave enough braking distance to enter local flight.
    const v=pano.velocity(id,time,orbitalV),floor=id==='star'?radius*.14:Math.min(8000,radius*.06);
    const limit=Math.sqrt(2*4000*Math.max(0,altitude-floor))+800;
    const shell=radius+floor;
    // Sweep in the moving body's frame. Catch a glancing chord even when
    // its start and end both lie just outside the clearance shell.
    previousRel.subVectors(prev,pano.center(id,time-dt,priorCentre));
    segment.copy(globalP).sub(centre).sub(previousRel);
    const travel2=segment.lengthSq(),near=travel2?clamp(-previousRel.dot(segment)/travel2,0,1):0;
    along.copy(previousRel).addScaledVector(segment,near);
    const hit=along.lengthSq()<shell*shell;
    if(hit&&previousRel.lengthSq()>=shell*shell&&travel2>0){
      const projection=-previousRel.dot(segment)/travel2;
      const chord=projection*projection-(previousRel.lengthSq()-shell*shell)/travel2;
      const at=clamp(projection-Math.sqrt(Math.max(0,chord)),0,1);
      radial.copy(previousRel).addScaledVector(segment,at).normalize();
      // Keep the remaining tangential displacement; remove only penetration.
      segment.multiplyScalar(1-at).projectOnPlane(radial);
      globalP.copy(centre).addScaledVector(radial,shell).add(segment);
    }else if(altitude<floor){
      if(radial.lengthSq()<.5)radial.copy(previousRel).normalize();
      globalP.copy(centre).addScaledVector(radial,shell);
    }
    let inward=-relativeV.copy(globalV).sub(v).dot(radial);
    if(inward>limit){
      const braking=Math.min(inward-limit,dt*19000);
      globalV.addScaledVector(radial,braking);inward-=braking;
    }
    if((hit||altitude<floor)&&inward>0)globalV.addScaledVector(radial,inward);
  }
  function transferStep(dt,input){
    if(route)guide(dt);else manualGuidance(dt,input);
    if(!route){
      // Match near-planet arcade steering while retaining the reference body's
      // orbital velocity. Mouse steering also turns the coast after releasing W.
      relativeV.copy(wanted).sub(pano.velocity(reference,time,orbitalV));
      const speed=axis.copy(globalV).sub(orbitalV).length();
      if(relativeV.lengthSq()>.01)globalV.copy(relativeV).setLength(speed).add(orbitalV);
      else globalV.copy(forward).applyQuaternion(quaternion).multiplyScalar(speed*coastSign).add(orbitalV);
    }
    const dv=along.subVectors(wanted,globalV);
    power=route?Math.min(1,dv.length()/8000):(input.forward||input.boost ? .38+.62*boostPower : .12);
    const acceleration=route?800:input.brake?42000:13500*(1+2.4*boostPower);
    if(route)dv.multiplyScalar(1-Math.exp(-2.4*dt));
    globalV.add(dv.clampLength(0,acceleration*dt));
    prev.copy(globalP);globalP.addScaledVector(globalV,dt);time+=dt;
    for(const id of ['star',...ids])protectSurface(id,dt);
    // Keep a little hysteresis at an influence boundary. Evaluate every registered body
    // against the same inertial position before choosing the nearest reference frame.
    let closest=reference;
    let best=.96*globalP.distanceTo(pano.center(reference,time,centre))/definition(reference).radius;
    for(const id of ids){
      if(id===reference)continue;
      const relative=globalP.distanceTo(pano.center(id,time,centre))/definition(id).radius;
      if(relative<best){best=relative;closest=id;}
    }
    reference=closest;
    syncInertial();
    if(route&&route.planet===reference){
      const d=globalP.distanceTo(approachPoint(route));
      const vessel=definition(reference).kind==='ship';
      const capture=route.destination==='dock'?420:Math.min(1000,definition(reference).radius*1.2);
      if(d<(vessel?230:capture)&&velocity.length()<(vessel?165:180))resumeLocal(reference);
    }else if(!route&&definition(reference).kind==='ship'&&position.length()<3800){
      resumeLocal(reference);
    }else if(!route&&velocity.length()<8000){
      const r=definition(reference).radius;
      if(position.length()-r<r*.50||(reference==='klose'&&position.distanceTo(dock.position)<1600))resumeLocal(reference);
    }
  }
  function tick(dt,input={}){
    if(!Number.isFinite(dt)||!(dt>0))return;
    dt=Math.min(.25,dt);
    if(hasShuttleControlInput(input)&&(route||(!transit&&local.status().auto))){
      route=null;
      if(!transit)local.manual();
      else{stage='星际手动驾驶';range=0;}
    }
    if(!transit){
      time+=local.tick(dt,input);
      const s=local.status();syncLocal();
      const outsideDock=reference!=='klose'||position.distanceTo(dock.position)>(route?1850:5100);
      const orbitalBoundary=definition(reference).kind==='ship'?(route?1700:4500):
        definition(reference).radius*(route ? .75 : 1.7);
      if(s.phase==='flying'&&outsideDock&&s.clearance>=orbitalBoundary&&(route||!s.auto))enterTransfer();
      return;
    }
    scale=1;
    let left=dt*scale;
    while(left>1e-7&&transit){
      const step=Math.min(left,1/30,3200/Math.max(1,globalV.length()));
      const controls={...input,lookYaw:(Number(input.lookYaw)||0)*step/(dt*scale),lookPitch:(Number(input.lookPitch)||0)*step/(dt*scale)};
      transferStep(step,controls);left-=step;
    }
    if(!transit&&left>1e-7){
      const controls={...input,lookYaw:(Number(input.lookYaw)||0)*left/(dt*scale),lookPitch:(Number(input.lookPitch)||0)*left/(dt*scale)};
      time+=local.tick(left/scale,controls);syncLocal();
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
    const b=getSurface(reference),coords=b.coordinates?b.coordinates(position):{lat:Math.atan2(position.y,Math.hypot(position.x,position.z)),lon:Math.atan2(-position.z,position.x)};
    const {lat,lon}=coords,height=position.length()-b.radius,f=b.frame(lat,lon);
    localHeading.copy(forward).applyQuaternion(quaternion);
    return {phase:'flying',auto:route?.destination||null,stage,speed:velocity.length(),verticalSpeed:velocity.dot(f.up),
      clearance:Math.max(0,b.kind==='ship'?height:height-b.height(lat,lon)),altitude:height,lat,lon,heading:Math.atan2(localHeading.dot(f.east),localHeading.dot(f.north)),
      range,timeScale:scale,throttle:power,planetId:reference,destinationPlanetId,interplanetary:true,
      targetName:route?.site?.name||(route?.destination==='dock'?'赛尔号泊位':''),targetId:route?.site?.id||null,
      canCapture:false,canLand:false,landingReason:'进入行星近地航段后可着陆'};
  }
  function snapshot(){
    const record=transit?{phase:'flying',auto:route?.destination||null,p:position.toArray(),v:velocity.toArray(),
      q:quaternion.toArray(),heading:localHeading.copy(forward).applyQuaternion(quaternion).toArray()}:local.snapshot();
    return {...record,version:5,planetId:reference,planetRadius:definition(reference).radius,systemScale:compactVoyageSystemScale,
      orbitTime:time,inTransit:transit,boostPower:transit?boostPower:record.boostPower,
      route:route?{...route,planetRadius:definition(route.planet).radius,site:route.site?
      {id:route.site.id,name:route.site.name,lat:route.site.lat,lon:route.site.lon}:null}:null};
  }
  function restore(rec){
    rec=compactVehicleRecord(rec,dock);
    if(rec?.version!==5)return false;
    const id=available(rec.planetId)?rec.planetId:'klose';
    const validTime=Number.isFinite(rec.orbitTime)&&rec.orbitTime>=0;
    if(rec.inTransit&&(!tuple(rec.p,3)||!tuple(rec.v,3)||!tuple(rec.q,4)||!validTime))return false;
    if(!rec.inTransit&&(!tuple(rec.p,3)||!tuple(rec.v,3)||!tuple(rec.q,4)||!tuple(rec.heading,3)))return false;
    time=validTime?rec.orbitTime:0;
    route=readRoute(rec.route);boostPower=clamp(Number(rec.boostPower)||0,0,1);
    if(rec.inTransit){
      reference=id;position.fromArray(rec.p);velocity.fromArray(rec.v);quaternion.fromArray(rec.q).normalize();
      coastSign=velocity.dot(axis.copy(forward).applyQuaternion(quaternion))<0?-1:1;
      globalP.copy(position).add(pano.center(reference,time,centre));globalV.copy(velocity).add(pano.velocity(reference,time,orbitalV));
      transit=true;scale=1;stage=route?'星际巡航续航':'星际手动驾驶';range=route?globalP.distanceTo(approachPoint(route)):0;return true;
    }
    createLocal(rec.phase==='docked'?'klose':id,rec);return true;
  }
  function placeOnSurface(site,angle=0,planet=reference){
    if(!available(planet))return false;
    const to=siteFor(planet,site);
    if(!to||!getSurface(planet).landingInfo(to.lat,to.lon,7.4).ok)return false;
    if(transit||planet!==reference)createLocal(planet,null);
    const result=local.placeOnSurface(to,angle);if(result)route=null;syncLocal();return result;
  }
  if(!restore(saved))createLocal('klose',null);
  return {position,quaternion,velocity,tick,status,autopilot,snapshot,restore,placeOnSurface,
    get orbitTime(){return time;},get planetId(){return reference;},
    launch(){return !transit&&local.launch();},
    manual(){route=null;boostPower=0;coastSign=1;if(!transit)local.manual();else{stage='星际手动驾驶';range=0;}},
    captureDock(){return !transit&&reference==='klose'&&local.captureDock();},land(){return !transit&&local.land();}};
}
