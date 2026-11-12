// In the planet-fixed frame distances are metres, velocities are m/s. The
// vehicle origin is the plane through the three deployed landing feet.
function createShuttleFlight(T,body,dock,saved){
  const clamp=T.MathUtils.clamp,R=body.radius,highSpeed=8000;
  const position=dock.position.clone(),quaternion=dock.quaternion.clone(),velocity=new T.Vector3();
  const dockForward=new T.Vector3(0,0,-1).applyQuaternion(dock.quaternion);
  const dockUp=new T.Vector3(0,1,0).applyQuaternion(dock.quaternion);
  const dockRight=new T.Vector3(1,0,0).applyQuaternion(dock.quaternion);
  const corridor=dock.corridorLength??dock.corridor??35;
  const gate=dock.position.clone().addScaledVector(dockForward,corridor+16);
  const outer=dock.position.clone().addScaledVector(dockForward,1050).addScaledVector(dockUp,180);
  const padFootprint=7.4;
  const home=body.landingSites[0];
  const heading=new T.Vector3(),desired=new T.Vector3(),right=new T.Vector3(),up=new T.Vector3();
  const eastAxis=new T.Vector3(),northAxis=new T.Vector3();
  const attitude=new T.Quaternion(),inclination=new T.Quaternion(),transport=new T.Quaternion(),basis=new T.Matrix4(),bankPitch=new T.Euler(0,0,0,'YXZ');
  let phase='docked',auto=null,leg='',target=null,detour=null,detourClock=0;
  let pitch=0,roll=0,riseLevel=0,latitude=0,longitude=0,altitude=0,ground=0,power=0;
  let pad=null,range=0,timeScale=1,stage='泊位锁定',boostPower=0;
  let tour=[],tourIndex=0,coastSign=1;
  const next=new T.Vector3(),error=new T.Vector3(),delta=new T.Vector3();
  const tangent=new T.Vector3(),destUp=new T.Vector3(),probe=new T.Vector3();
  function angles(p){
    return {lat:Math.atan2(p.y,Math.hypot(p.x,p.z)),lon:Math.atan2(-p.z,p.x)};
  }
  function currentFrame(){
    const ll=angles(position);
    latitude=ll.lat;longitude=ll.lon;altitude=position.length()-R;
    const frame=body.frame(latitude,longitude);
    up.copy(frame.up);eastAxis.copy(frame.east);northAxis.copy(frame.north);
    ground=body.height(latitude,longitude);
    pad=altitude-ground<35?body.landingInfo(latitude,longitude,padFootprint):null;
    return frame;
  }
  function levelHeading(frame){
    heading.projectOnPlane(up);
    if(heading.lengthSq()<.0001)heading.copy(frame.north);
    heading.normalize();right.crossVectors(heading,up).normalize();
  }
  function alignHeading(dir,dt){
    tangent.copy(dir).projectOnPlane(up);
    if(tangent.lengthSq()<.0001)return;
    tangent.normalize();
    const turn=Math.atan2(tangent.dot(right),tangent.dot(heading));
    heading.applyAxisAngle(up,-clamp(turn,-1.35*dt,1.35*dt));
    right.crossVectors(heading,up).normalize();
  }
  // Measure the same three gear pads that are visible on the model. On a
  // gentle grade this locates the hull plane without leaving a foot floating.
  function gearSupport(lat,lon){
    const frame=body.frame(lat,lon),s=heading.dot(frame.east),c=heading.dot(frame.north);
    const feet=[[0,-4.30],[-2.93,2.75],[2.93,2.75]].map(([x,z])=>{
      const point=body.move(lat,lon,c*x-s*z,-s*x-c*z);
      return body.point(point.lat,point.lon);
    });
    const normal=feet[1].sub(feet[0]).cross(feet[2].sub(feet[0])).normalize();
    return {normal,height:normal.dot(feet[0])/normal.dot(frame.up)-R};
  }
  function gearAttitude(normal){
    const forward=heading.clone().projectOnPlane(normal).normalize();
    return attitude.setFromRotationMatrix(basis.makeBasis(tangent.crossVectors(forward,normal).normalize(),normal,forward.negate()));
  }
  function pose(dt,atDock=false){
    if(atDock)attitude.copy(dock.quaternion);
    else{
      basis.makeBasis(right,up,tangent.copy(heading).negate());
      attitude.setFromRotationMatrix(basis);
      bankPitch.set(pitch,0,roll,'YXZ');
      attitude.multiply(inclination.setFromEuler(bankPitch));
      const gap=altitude-ground;
      if(pad?.ok&&gap<2.8&&velocity.length()<4&&leg!=='rise'){
        const target=attitude.clone();
        gearAttitude(gearSupport(latitude,longitude).normal);
        attitude.slerp(target,T.MathUtils.smoothstep(gap,.08,2.8));
      }
    }
    // A manual turn changes the actual nose and the forward track together.
    // Keeping an independent, slowly following body pose caused long sideways slides.
    if(!auto&&!atDock)quaternion.copy(attitude);
    else quaternion.slerp(attitude,1-Math.exp(-4.5*dt)).normalize();
  }
  function settleDock(){
    phase='docked';auto=null;leg='';target=detour=null;velocity.set(0,0,0);
    position.copy(dock.position);quaternion.copy(dock.quaternion);heading.copy(dockForward);
    pitch=roll=power=range=boostPower=0;tour=[];tourIndex=0;timeScale=1;stage='泊位锁定';
    levelHeading(currentFrame());
  }
  function settleSurface(info){
    phase='landed';auto=null;leg='';target=detour=null;velocity.set(0,0,0);
    const support=gearSupport(latitude,longitude);
    position.copy(up).multiplyScalar(R+support.height);altitude=support.height;ground=info.height;
    pitch=roll=power=range=boostPower=0;tour=[];tourIndex=0;timeScale=1;stage='起落架已承重';
    levelHeading(body.frame(latitude,longitude));quaternion.copy(gearAttitude(support.normal));
  }
  function validSite(p){
    return p&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=Math.PI/2&&Number.isFinite(p.lon);
  }
  function resolveSite(site){
    return typeof site==='string'?body.landingSite(site):site;
  }
  function placeOnSurface(site,angle=0){
    let place=resolveSite(site)||home;
    if(!validSite(place))place=home;
    let info=body.landingInfo(place.lat,place.lon,padFootprint);
    if(!info.ok){place=home;info=body.landingInfo(place.lat,place.lon,padFootprint);}
    if(!info.ok)return false;
    position.copy(body.point(place.lat,place.lon));
    const frame=currentFrame();
    heading.copy(frame.north).applyAxisAngle(frame.up,-(Number.isFinite(angle)?angle:0));
    settleSurface(info);return true;
  }
  function launch(){
    if(phase==='flying')return false;
    const docked=phase==='docked';
    phase='flying';leg=docked?'undock':'rise';riseLevel=altitude+11;
    stage=docked?'解锁出坞':'垂直起飞';
    return true;
  }
  function manual(){
    auto=null;target=detour=null;tour=[];tourIndex=0;range=0;timeScale=1;boostPower=0;
    coastSign=1;
    if(phase==='flying'){
      if(leg==='latch')leg='undock';
      if(leg!=='rise'&&leg!=='undock')leg='';
      stage=leg==='undock'?'出坞导向':leg==='rise'?'垂直起飞':'手动驾驶';
    }
  }
  function scenicRoute(){
    // Cave interiors cannot be seen from the sky. The remaining named maps
    // form a short, ordered viewing circuit before the final landing approach.
    const sites=(body.sites||[]).filter(s=>validSite(s)&&s.id!=='core');
    if(!sites.length)return [];
    const cx=sites.reduce((sum,s)=>sum+(s.x||0),0)/sites.length;
    const cz=sites.reduce((sum,s)=>sum+(s.z||0),0)/sites.length;
    const pending=sites.map(s=>{
      let dx=(s.x||0)-cx,dz=(s.z||0)-cz,length=Math.hypot(dx,dz);
      if(length<1){dx=1;dz=0;length=1;}
      const offset=body.move(s.lat,s.lon,140*dx/length,-140*dz/length);
      return {id:s.id,name:s.name,...offset,focusLat:s.lat,focusLon:s.lon};
    });
    const ordered=[];let from=position.clone().normalize();
    while(pending.length){
      let best=0,score=-Infinity;
      for(let i=0;i<pending.length;i++){
        const s=pending[i],dot=body.frame(s.lat,s.lon).up.dot(from);
        if(dot>score){score=dot;best=i;}
      }
      const marker=pending.splice(best,1)[0];ordered.push(marker);
      from=body.frame(marker.lat,marker.lon).up;
    }
    return ordered;
  }
  function autopilot(destination,site){
    if(destination!=='surface'&&destination!=='dock')return false;
    if(destination==='dock'&&phase==='docked')return false;
    const place=destination==='surface'?(resolveSite(site)||(!site&&home)):null;
    if(destination==='surface'&&(!validSite(place)||!body.landingInfo(place.lat,place.lon,padFootprint).ok))return false;
    if(phase!=='flying')launch();
    if(leg==='latch'&&destination==='surface')leg='undock';
    if(leg!=='undock'&&leg!=='rise')leg='';
    auto=destination;target=place;detour=null;detourClock=0;boostPower=0;
    tour=destination==='surface'&&place.id?scenicRoute():[];tourIndex=0;
    stage=leg==='undock'?'解锁出坞':leg==='rise'?'垂直起飞':'航线已接通';return true;
  }
  function departSystem(){
    if(phase!=='flying')launch();
    if(leg==='latch')leg='undock';
    if(leg!=='undock'&&leg!=='rise')leg='';
    auto='outbound';target=detour=null;tour=[];tourIndex=0;boostPower=0;stage='驶向星际航路';return true;
  }
  function canCapture(){
    return phase==='flying'&&position.distanceTo(gate)<65&&velocity.length()<22;
  }
  function captureDock(){
    if(!canCapture())return false;
    auto='dock';leg='gate';detour=target=null;stage='对准泊位轴线';return true;
  }
  function canLand(){
    return phase==='flying'&&pad?.ok===true&&altitude-pad.height<22&&velocity.length()<18&&leg!=='rise';
  }
  function land(){
    if(!canLand())return false;
    return autopilot('surface',{lat:latitude,lon:longitude,name:'当前着陆点'});
  }
  function manualLimit(agl){
    if(agl<12)return 22+2.5*Math.max(0,agl);
    if(agl<120)return 52+2.8*(agl-12);
    if(agl<1400)return 354.4+1.4*(agl-120);
    return Math.min(highSpeed,2146.4+.65*(agl-1400));
  }
  // Limit both commanded speed and braking distance. Fine approach speed
  // tends continuously to zero when the position error vanishes.
  function closing(distance,accel,limit,gain=.82){
    return Math.min(limit,Math.sqrt(1.6*accel*distance),gain*distance);
  }
  function seek(point,maxSpeed,accel,gain=.82){
    desired.subVectors(point,position);
    const d=desired.length();
    if(d>0)desired.multiplyScalar(closing(d,accel,maxSpeed,gain)/d);
    return d;
  }
  function clearLine(a,b){
    if(!dock.isBlocked)return true;
    const count=Math.max(1,Math.ceil(a.distanceTo(b)/17));
    for(let i=1;i<=count;i++){
      probe.lerpVectors(a,b,i/count);
      if(dock.isBlocked(probe))return false;
    }
    return true;
  }
  function exteriorWaypoint(dt){
    detourClock-=dt;
    if(detour&&position.distanceTo(detour)<15){detour=null;detourClock=0;}
    if(detourClock<=0){
      detourClock=1.5;
      if(clearLine(position,outer))detour=null;
      else if(!detour){
        for(const offset of [dockUp,dockRight,dockRight.clone().negate(),dockUp.clone().negate()]){
          const via=dock.position.clone().addScaledVector(offset,1200).addScaledVector(dockForward,350);
          if(clearLine(position,via)&&clearLine(via,outer)){detour=via;break;}
        }
        if(!detour){
          const away=position.clone().sub(dock.position);
          if(away.lengthSq()<1)away.copy(dockForward);
          detour=away.normalize().multiplyScalar(1700).add(dock.position);
        }
      }
    }
    return detour||outer;
  }
  function dockGuidance(dt){
    if(!leg)leg='outer';
    const goal=leg==='outer'?exteriorWaypoint(dt):leg==='gate'?gate:dock.position;
    const limit=leg==='outer'?230:leg==='gate'?70:12;
    const distance=seek(goal,limit,leg==='latch'?4.5:18,leg==='latch'?.85:.65);
    range=position.distanceTo(dock.position);
    if(leg==='latch')stage='倒车入坞 · 对接锁捕获';
    else stage=leg==='outer'?'绕舰进近':'对准泊位轴线';
    if(leg==='outer'&&goal===outer&&distance<5&&velocity.length()<8)leg='gate';
    else if(leg==='gate'&&distance<.9&&velocity.length()<2)leg='latch';
    else if(leg==='latch'&&distance<.07&&velocity.length()<.22)settleDock();
  }
  function planetaryGuidance(limit,accel){
    const toDock=auto==='dock';
    const goal=toDock?outer:body.point(target.lat,target.lon);
    destUp.copy(goal).normalize();
    const cosine=clamp(destUp.dot(up),-1,1);
    tangent.copy(destUp).addScaledVector(up,-cosine);
    const sine=tangent.length();
    if(sine<1e-12)tangent.copy(heading);else tangent.multiplyScalar(1/sine);
    const arc=Math.atan2(sine,cosine)*(R+altitude);
    const endHeight=goal.length()-R;
    // Climb early for long cross-country flights. At the destination the
    // great-circle leg becomes a level, slow vertical landing on its pad.
    const cruise=Math.min(180,arc*.22);
    let height=toDock?endHeight:Math.max(endHeight+cruise,ground+Math.min(105,arc*1.2));
    if(!toDock&&arc<8)height=endHeight+Math.max(0,arc-.75)*.75;
    if(!toDock&&arc<1&&pad?.ok)height=pad.height;
    const dz=height-altitude;
    const verticalLimit=dz<0?Math.min(limit,Math.max(1.4,(altitude-endHeight)*.55)):limit;
    const braking=.31*accel;
    const vertical=Math.sign(dz)*closing(Math.abs(dz),braking,verticalLimit,.72);
    desired.copy(tangent).multiplyScalar(closing(arc,braking,limit));
    desired.addScaledVector(up,vertical).clampLength(0,limit);
    range=Math.hypot(arc,altitude-endHeight);
    if(toDock){
      const safe=70+closing(Math.max(0,range-2400),braking,limit);
      desired.clampLength(0,safe);
    }
    stage=toDock?'返舰巡航':arc<14?(altitude-endHeight<35?'垂直着陆':'垂直进近'):
      dz>80?'爬升巡航':altitude-ground<320?'地表进近':'下降巡航';
    if(!toDock&&arc<.85&&pad?.ok&&altitude-pad.height<.09&&velocity.length()<.9)settleSurface(pad);
  }
  function scenicGuidance(limit,accel){
    const marker=tour[tourIndex],frame=body.frame(marker.lat,marker.lon);
    const dot=clamp(frame.up.dot(up),-1,1);
    tangent.copy(frame.up).addScaledVector(up,-dot);
    const sine=tangent.length(),arc=Math.atan2(sine,dot)*(R+altitude);
    if(sine>.00001)tangent.multiplyScalar(1/sine);else tangent.copy(heading);
    // Look ahead far enough to climb over the same ridges and canopies used by
    // the collision sweep. The ordinary viewing band is 110–180 m above land.
    const ahead=body.move(latitude,longitude,tangent.dot(eastAxis)*Math.min(arc,90),tangent.dot(northAxis)*Math.min(arc,90));
    const floor=Math.max(ground,body.flightHeight(latitude,longitude,padFootprint),
      body.flightHeight(ahead.lat,ahead.lon,padFootprint));
    const scenicHeight=Math.max(body.flightHeight(marker.lat,marker.lon,padFootprint)+110,floor+80);
    const speed=Math.min(limit,arc<100?12:arc<350?20:28);
    const vertical=clamp((scenicHeight-altitude)*.45,-Math.max(8,Math.min(180,(altitude-scenicHeight)*.3)),38);
    desired.copy(tangent).multiplyScalar(Math.min(speed,Math.max(4,arc*.6))).addScaledVector(up,vertical);
    range=position.distanceTo(body.point(target.lat,target.lon));
    stage='观景 '+(tourIndex+1)+'/'+tour.length+' · '+marker.name;
    if(arc<16&&Math.abs(altitude-scenicHeight)<28)tourIndex++;
  }
  function manualGuidance(input,dt,limit){
    const value=k=>clamp(Number(input[k])||0,-1,1);
    const turn=value('turn');
    heading.applyAxisAngle(up,-turn*dt*(1.70-.60*clamp(velocity.length()/2200,0,1))-(Number(input.lookYaw)||0));
    right.crossVectors(heading,up).normalize();
    pitch=clamp(pitch+value('pitch')*dt*.95+(Number(input.lookPitch)||0),-1.32,1.32);
    const banking=clamp(turn+(Number(input.lookYaw)||0)/Math.max(dt,.0001)*.35,-1,1);
    roll+=(-banking*.23-roll)*(1-Math.exp(-3*dt));
    const forward=value('forward'),side=value('strafe'),lift=value('lift');
    boostPower=clamp(boostPower+(input.boost ? .22 : -.32)*dt,0,1);
    const cruise=limit*(.52+.48*boostPower);
    // Holding afterburner is itself forward thrust. This also gives the screen
    // afterburner button a useful effect without a second simultaneous button.
    const drive=forward||(input.boost?1:0);
    if(drive)coastSign=Math.sign(drive);
    desired.copy(heading).multiplyScalar(drive*Math.cos(pitch)).addScaledVector(right,side*.64)
      .addScaledVector(up,lift+drive*Math.sin(pitch)).clampLength(0,1).multiplyScalar(cruise);
    if(input.brake)desired.set(0,0,0);
    stage=input.boost?'手动加力 · '+Math.round(boostPower*100)+'%':'手动驾驶';range=position.distanceTo(dock.position);
  }
  function hitsHull(a,b){
    if(!dock.isBlocked||b.distanceToSquared(dock.position)>1800*1800)return false;
    const steps=Math.max(1,Math.ceil(a.distanceTo(b)/5));
    const offsets=[[0,1.6,0],[-5.4,1.8,0],[5.4,1.8,0],[0,1.55,-6.4],[0,1.6,6.3]];
    for(let i=1;i<=steps;i++){
      const p=error.lerpVectors(a,b,i/steps);
      for(const v of offsets)if(dock.isBlocked(probe.fromArray(v).applyQuaternion(quaternion).add(p)))return true;
    }
    return false;
  }
  function advance(dt,accel,inputs){
    // The vertical thrusters reserve enough authority to brake a descent
    // while the main engine is still turning onto the final track.
    const agl=Math.max(0,altitude-ground);
    const downLimit=.65+Math.sqrt(2*.29*accel*agl);
    const vr=desired.dot(up);
    if(vr<-downLimit)desired.addScaledVector(up,-downLimit-vr);
    if(!auto&&!leg&&velocity.lengthSq()>.000001){
      // Arcade flight has no uncommanded lateral inertia: preserve speed while
      // steering it onto the nose, including the coast after releasing W/S.
      // With no thrust the desired velocity stays zero, so braking still follows.
      const speed=velocity.length();
      if(desired.lengthSq()>.01)velocity.copy(desired).setLength(speed);
      else velocity.copy(heading).multiplyScalar(Math.cos(pitch)).addScaledVector(up,Math.sin(pitch)).multiplyScalar(speed*coastSign);
      const descent=velocity.dot(up);
      if(descent<-downLimit)velocity.addScaledVector(up,-downLimit-descent);
    }
    delta.subVectors(desired,velocity);
    const demand=clamp(delta.length()/Math.max(1,accel*.65),0,1);
    const engine=auto?Math.max(demand,clamp(velocity.length()/highSpeed,0,1)):
      inputs.forward||inputs.boost? .38+.62*boostPower : demand*.18;
    power+=(engine-power)*(1-Math.exp(-4*dt));
    const dv=delta.dot(up);
    delta.addScaledVector(up,-dv).clampLength(0,.71*accel*dt);
    velocity.add(delta).addScaledVector(up,clamp(dv,-.70*accel*dt,.70*accel*dt));
    const nearDock=position.distanceToSquared(dock.position)<2200*2200;
    if(nearDock)next.copy(position).addScaledVector(velocity,dt);
    else{
      // Transport the flat heading and velocity across the curved surface.
      // Vertical velocity changes radius; tangential speed changes latitude.
      const vr=velocity.dot(up),radial=position.length();
      tangent.copy(velocity).addScaledVector(up,-vr);
      const speed=tangent.length(),angle=dt*speed/radial;
      destUp.copy(up).multiplyScalar(Math.cos(angle));
      if(speed)destUp.addScaledVector(tangent,Math.sin(angle)/speed);
      next.copy(destUp).multiplyScalar(radial+vr*dt);
      transport.setFromUnitVectors(up,destUp);
      // Apply the same parallel transport to the craft and its velocity after the
      // sweep accepts the new position. This keeps a straight course near a pole.
      velocity.applyQuaternion(transport);
    }
    if(hitsHull(position,next)){
      velocity.set(0,0,0);stage='舰体净空限制';
      if(auto==='dock'&&leg==='outer'){detour=null;detourClock=0;}
      return;
    }
    const ll=angles(next),height=next.length()-R,terrain=body.height(ll.lat,ll.lon);
    if(Math.min(altitude-ground,height-terrain)<190){
      const samples=Math.ceil(next.distanceTo(position)/padFootprint);
      for(let i=1;i<samples;i++){
        probe.lerpVectors(position,next,i/samples);
        const mid=angles(probe);
        if(probe.length()-R+.08<body.flightHeight(mid.lat,mid.lon,padFootprint)){
          const climb=Math.max(0,velocity.dot(up));velocity.copy(up).multiplyScalar(climb);
          stage='地形净空限制';return;
        }
      }
    }
    if(height<terrain+190){
      const roof=body.flightHeight(ll.lat,ll.lon,padFootprint);
      const nearGround=height<Math.max(roof,terrain)+3;
      if(nearGround){
        const info=body.landingInfo(ll.lat,ll.lon,padFootprint);
        const slowContact=info.ok&&leg!=='rise'&&velocity.length()<4;
        const floor=slowContact?gearSupport(ll.lat,ll.lon).height:
          Math.max(terrain,roof)+(info.ok?0:1.1);
        if(height<floor){
          const vr=velocity.dot(up);
          const across=tangent.copy(velocity).addScaledVector(up,-vr).length();
          if(info.ok&&vr<=0&&across<1.4&&Math.abs(vr)<2.4&&leg!=='rise'&&
              (auto==='surface'&&range<8||(!auto&&(inputs.lift<0||pad?.ok&&altitude-pad.height<.15)))){
            position.copy(next);currentFrame();settleSurface(info);return;
          }
          if(floor>altitude+Math.max(.27,dt*Math.max(0,vr)+.06)){
            // The projected hull footprint meets an escarpment or canopy.
            // Arrest horizontal motion on the clear side of the obstacle.
            velocity.copy(up).multiplyScalar(Math.max(0,vr));
            stage='地形净空限制';return;
          }
          next.setLength(R+floor);
          if(vr<0)velocity.addScaledVector(up,-vr);
          if(!info.ok)stage=info.reason||'此处无法停放';
        }
      }
    }
    if(!nearDock){heading.applyQuaternion(transport);quaternion.premultiply(transport).normalize();}
    position.copy(next);
  }
  function step(dt,input){
    const frame=currentFrame();
    levelHeading(frame);
    const agl=Math.max(0,altitude-ground),limit=manualLimit(agl),near=position.distanceTo(dock.position);
    let accel=clamp(32+agl*.26,32,650);
    let dockPose=false;
    if(leg==='undock'){
      const end=dock.position.clone().addScaledVector(dockForward,corridor+5);
      const distance=seek(end,13,5,.85);stage='解锁出坞';accel=5;dockPose=true;
      if(!auto&&input.brake)desired.set(0,0,0);
      if(distance<.65&&velocity.length()<2){leg='';heading.copy(dockForward);levelHeading(frame);}
    }else if(leg==='rise'){
      desired.copy(up).multiplyScalar(closing(Math.max(0,riseLevel-altitude),12,9));
      stage='垂直起飞';accel=15;
      if(altitude>=riseLevel-.7)leg='';
    }else if(auto==='outbound'){
      if(near<2000){
        const exit=probe.copy(dock.position).addScaledVector(dockForward,2400);
        seek(exit,near<180?35:Math.min(limit,480),32);stage='离开母舰航道';
      }else{desired.copy(up).multiplyScalar(limit);stage='爬升至转移轨道';}
    }else if(auto==='dock'&&((near<2400&&velocity.length()<132)||leg)){
      dockGuidance(dt);accel=leg==='latch'?5:28;dockPose=leg==='latch'||leg==='gate';
    }else if(auto){
      if(auto==='surface'&&tourIndex<tour.length)scenicGuidance(limit,accel);
      else planetaryGuidance(Math.min(limit,auto==='dock'?600:Math.max(10,Math.min(120,10+agl*.32))),accel);
    }
    else{
      const dockLimit=Math.min(22+near*.27,Math.sqrt(22*22+2*.63*accel*near));
      manualGuidance(input,dt,Math.min(limit,dockLimit));
      accel*=1+2.4*boostPower;
      if(input.brake)accel*=2.5;
    }
    if(phase!=='flying')return;
    if(auto){
      const viewing=auto==='surface'&&tourIndex<tour.length;
      if(!dockPose&&desired.lengthSq()>1&&!viewing)alignHeading(desired,dt);
      const climbAngle=Math.asin(clamp(desired.dot(up)/Math.max(.01,desired.length()),-1,1));
      if(viewing){
        const marker=tour[tourIndex];
        error.copy(body.point(marker.focusLat,marker.focusLon)).sub(position);
        // During the viewing pass the pilot presents the landscape through the
        // front glass; the route itself remains at its safe viewing altitude.
        if(error.lengthSq()>1)alignHeading(error,dt);
      }
      const nosePitch=dockPose||agl<45?0:viewing?-.48:clamp(climbAngle,-.45,.35);
      pitch+=(nosePitch-pitch)*(1-Math.exp(-2.6*dt));roll*=Math.exp(-3*dt);
    }
    pose(dt,dockPose);advance(dt,accel,input);
  }
  function tick(realDt,input={}){
    if(!(realDt>0)||!Number.isFinite(realDt))return 0;
    realDt=Math.min(realDt,.25);
    if(phase!=='flying')return realDt;
    // Touring uses real time, so neither scenery nor steering is sped up by
    // altitude. This also removes up to 6.4 times the former physics workload.
    timeScale=1;
    const rate=timeScale,budget=realDt*rate;
    let remaining=budget;
    while(remaining>1e-7&&phase==='flying'){
      const dt=Math.min(remaining,1/30);
      const controls={...input,lookYaw:(Number(input.lookYaw)||0)*dt/budget,lookPitch:(Number(input.lookPitch)||0)*dt/budget};
      step(dt,controls);remaining-=dt;
    }
    currentFrame();
    return budget-remaining+remaining/rate;
  }
  function snapshot(){
    return {version:1,phase,auto,leg,target:target?{id:target.id,name:target.name,lat:target.lat,lon:target.lon}:null,
      p:position.toArray(),v:velocity.toArray(),q:quaternion.toArray(),heading:heading.toArray(),pitch,roll,riseLevel,
      boostPower,tour,tourIndex};
  }
  function restore(s){
    const tuple=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(Number.isFinite);
    if(s?.version!==1||!['landed','flying','docked'].includes(s.phase)||!tuple(s.p,3)||
        !tuple(s.v,3)||!tuple(s.q,4)||!tuple(s.heading,3))return false;
    if(s.phase==='docked'){settleDock();return true;}
    next.fromArray(s.p);
    if(next.length()<R*.99||next.length()>R*1000)return false;
    position.copy(next);const frame=currentFrame();
    phase=s.phase;heading.fromArray(s.heading);levelHeading(frame);quaternion.fromArray(s.q).normalize();
    velocity.fromArray(s.v).clampLength(0,highSpeed);
    pitch=clamp(Number(s.pitch)||0,-1.32,1.32);roll=clamp(Number(s.roll)||0,-.3,.3);
    coastSign=velocity.dot(heading)*Math.cos(pitch)+velocity.dot(up)*Math.sin(pitch)<0?-1:1;
    if(phase==='landed'){
      // A parked craft already has a berth. Keep its latitude and longitude
      // even if an animal is now inside the flight planner's approach margin.
      settleSurface({height:ground});return true;
    }
    if(altitude<ground){position.setLength(R+ground+2);currentFrame();}
    target=validSite(s.target)?{...s.target}:null;
    auto=s.auto==='surface'&&target?'surface':s.auto==='dock'?'dock':s.auto==='outbound'?'outbound':null;
    leg=['undock','rise','outer','gate','latch'].includes(s.leg)?s.leg:'';
    if(!auto&&['outer','gate','latch'].includes(leg))leg='';
    riseLevel=Number.isFinite(s.riseLevel)?s.riseLevel:altitude+10;
    boostPower=clamp(Number(s.boostPower)||0,0,1);
    tour=auto==='surface'&&Array.isArray(s.tour)?s.tour.filter(m=>validSite(m)&&Number.isFinite(m.focusLat)&&Number.isFinite(m.focusLon)):[];
    if(auto==='surface'&&target?.id&&!tour.length)tour=scenicRoute();
    tourIndex=clamp(Math.floor(Number(s.tourIndex)||0),0,tour.length);
    stage=auto?'续航中':'手动驾驶';range=0;power=0;detour=null;detourClock=0;timeScale=1;return true;
  }
  function status(){
    return {phase,auto,stage,speed:velocity.length(),verticalSpeed:velocity.dot(up),clearance:Math.max(0,altitude-ground),
      altitude,lat:latitude,lon:longitude,heading:Math.atan2(heading.dot(eastAxis),heading.dot(northAxis)),range,timeScale,throttle:power,
      targetName:auto==='dock'?'赛尔号泊位':target?.name||'',targetId:target?.id||null,
      canCapture:canCapture(),canLand:canLand(),landingReason:pad?.reason||''};
  }
  settleDock();if(saved)restore(saved);
  return {position,quaternion,velocity,tick,status,launch,land,captureDock,manual,autopilot,departSystem,placeOnSurface,snapshot,restore};
}
