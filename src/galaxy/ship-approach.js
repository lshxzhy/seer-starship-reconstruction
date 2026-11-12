// Close-quarters flight around a drifting vessel uses its Cartesian hull
// frame. Space below the keel and beside the wings stays open.
function createShipApproach(T,body,saved){
  const berth=body.landingSites[0],socket=body.point(berth.lat,berth.lon);
  const position=socket.clone(),velocity=new T.Vector3(),quaternion=new T.Quaternion();
  const localUp=new T.Vector3(0,1,0),desired=new T.Vector3(),next=new T.Vector3(),probe=new T.Vector3();
  const mark=new T.Vector3(),attitude=new T.Quaternion(),forward=new T.Vector3(),euler=new T.Euler(0,0,0,'YXZ');
  const gearSamples=[[0,.04,-4.3],[-2.93,.04,2.75],[2.93,.04,2.75],[0,1.55,-6.4],[0,1.6,6.3],[-5.4,1.8,0],[5.4,1.8,0]].map(a=>new T.Vector3(...a));
  const clamp=T.MathUtils.clamp;
  let phase='landed',auto=null,leg='',yaw=0,pitch=0,roll=0,throttle=0,timeScale=1,range=0;
  let stage='接驳坪已停稳';
  function settle(){
    phase='landed';auto=null;leg='';velocity.set(0,0,0);
    quaternion.setFromAxisAngle(localUp,yaw);pitch=roll=throttle=0;timeScale=1;stage='接驳坪已停稳';
  }
  function launch(){
    if(phase!=='landed')return false;
    phase='flying';leg='rise';stage='离开接驳坪';return true;
  }
  function manual(){auto=null;if(leg!=='rise')leg='';stage=leg==='rise'?'离开接驳坪':'舷侧手动驾驶';}
  function departSystem(){if(phase==='landed')launch();auto='outbound';stage='离开拜伦号';}
  function autopilot(destination,site){
    if(destination!=='surface'||(site?.id&&site.id!==berth.id))return false;
    if(phase==='landed')return false;
    auto='surface';leg='approach';stage='接驳坪进近';return true;
  }
  function canLand(){
    const at=body.coordinates(position);
    return phase==='flying'&&leg!=='rise'&&body.landingInfo(at.lat,at.lon,7.4).ok&&
      position.y>=socket.y-.12&&position.y<socket.y+23&&velocity.length()<18;
  }
  function land(){
    if(!canLand())return false;
    auto='surface';leg='approach';return true;
  }
  function nearestHullDistance(){
    return Math.max(0,position.length()-body.radius,position.y-socket.y);
  }
  function sweep(a,b){
    const steps=Math.max(1,Math.ceil(a.distanceTo(b)/2));
    for(let i=1;i<=steps;i++){
      const along=i/steps;
      for(const point of gearSamples){
        probe.copy(point).applyQuaternion(quaternion);
        probe.x+=a.x+(b.x-a.x)*along;probe.y+=a.y+(b.y-a.y)*along;probe.z+=a.z+(b.z-a.z)*along;
        if(body.blocksShuttle(probe))return true;
      }
    }
    return false;
  }
  function step(dt,input){
    const distance=nearestHullDistance(),speedLimit=Math.min(1700,13+distance*.72);
    const accel=Math.min(650,21+distance*.48);
    const guided=Boolean(auto||leg==='rise');
    if(guided){
      if(leg==='rise'||auto==='outbound'){
        mark.copy(position);
        mark.y=leg==='rise'?socket.y+18:Math.max(3200,position.y+400);
        if(leg==='rise'&&position.y>=socket.y+16){leg='';if(!auto)stage='舷侧手动驾驶';}
      }else{
        // First clear the hull, then converge on the axis above the landing
        // stripe. Only the last leg lowers the feet to the support plane.
        const horizontal=Math.hypot(position.x-socket.x,position.z-socket.z);
        const overPad=horizontal<1.2;
        if(position.y<-25&&Math.abs(position.x)<110&&Math.abs(position.z)<100){
          mark.set(position.x>=0?125:-125,Math.min(position.y,-62),position.z);
        }else if(!overPad&&position.y<socket.y+58&&horizontal>16){
          mark.copy(position);mark.y=socket.y+68;
        }else{
          mark.copy(socket);mark.y+=overPad?0:Math.min(230,Math.max(10,horizontal*.85));
        }
        stage=overPad?'垂直接驳':'对准拜伦号接驳坪';
      }
      desired.subVectors(mark,position);const gap=desired.length();
      if(gap)desired.setLength(Math.min(shuttleCruiseSpeed(speedLimit),gap*.82,Math.sqrt(1.2*accel*gap)));
      if(auto==='surface'&&Math.hypot(position.x-socket.x,position.z-socket.z)<1.2){
        desired.x=(socket.x-position.x)*.8;desired.z=(socket.z-position.z)*.8;
      }
      if(Math.hypot(desired.x,desired.z)>1){
        const angle=Math.atan2(-desired.x,-desired.z)-yaw;
        yaw+=Math.atan2(Math.sin(angle),Math.cos(angle))*(1-Math.exp(-2*dt));
      }
      pitch*=Math.exp(-4*dt);roll*=Math.exp(-4*dt);
    }else{
      yaw-=(input.turn||0)*dt*1.15;pitch=clamp(pitch+(input.pitch||0)*dt*.82,-1.32,1.32);
      roll+=(-(input.turn||0)*.2-roll)*(1-Math.exp(-3*dt));
      attitude.setFromEuler(euler.set(pitch,yaw,0));
      desired.set(input.strafe||0,0,-(input.forward||0)).applyQuaternion(attitude);
      desired.y+=input.lift||0;desired.clampLength(0,1).multiplyScalar(shuttleCruiseSpeed(speedLimit,input.boost));
      if(input.brake)desired.set(0,0,0);
    }
    quaternion.slerp(attitude.setFromEuler(euler.set(pitch,yaw,roll)),1-Math.exp(-5*dt));
    desired.sub(velocity);throttle=Math.min(1,desired.length()/Math.max(1,accel));
    velocity.add(desired.clampLength(0,dt*accel*(input.brake&&!guided?2:1)));
    next.copy(position).addScaledVector(velocity,dt);
    const at=body.coordinates(next),over=body.landingInfo(at.lat,at.lon,7.4).ok;
    if(over&&position.y>=socket.y-.1&&next.y<socket.y+.07&&velocity.y<=0){
      if(velocity.length()<1&&(auto==='surface'||input.lift<0)){
        position.set(next.x,socket.y,next.z);settle();return;
      }
      next.y=socket.y+.07;velocity.y=0;
    }
    if((distance<160||next.length()<body.radius+160)&&sweep(position,next)){
      velocity.set(0,0,0);stage='舰壳净空限制';return;
    }
    position.copy(next);range=position.distanceTo(socket);
  }
  function tick(dt,input={}){
    if(!Number.isFinite(dt)||dt<=0)return 0;
    dt=Math.min(dt,.25);
    if(phase==='landed')return dt;
    if(auto&&hasShuttleControlInput(input))manual();
    timeScale=1;
    const elapsed=dt*timeScale;let left=elapsed;
    while(phase==='flying'&&left>1e-7){const sub=Math.min(left,.035);step(sub,input);left-=sub;}
    return elapsed;
  }
  function placeOnSurface(site,angle=0){
    const pad=typeof site==='string'?body.landingSite(site):site;
    if(!pad||!body.landingInfo(pad.lat,pad.lon,7.4).ok)return false;
    position.copy(body.point(pad.lat,pad.lon));yaw=angle;settle();return true;
  }
  if(saved?.p&&saved.q&&saved.v){
    position.fromArray(saved.p);velocity.fromArray(saved.v);quaternion.fromArray(saved.q).normalize();
    euler.setFromQuaternion(quaternion,'YXZ');yaw=euler.y;pitch=euler.x;roll=euler.z;
    if(saved.phase==='landed')settle();
    else{phase='flying';auto=['surface','outbound'].includes(saved.auto)?saved.auto:null;
      leg=['rise','approach'].includes(saved.leg)?saved.leg:'';stage=auto?'接驳续航':'舷侧手动驾驶';}
  }
  function snapshot(){
    return {phase,auto,leg,p:position.toArray(),v:velocity.toArray(),q:quaternion.toArray(),
      heading:forward.set(0,0,-1).applyQuaternion(quaternion).toArray(),target:auto==='surface'?berth:null};
  }
  function status(){
    return {...body.coordinates(position),phase,auto,stage,speed:velocity.length(),verticalSpeed:velocity.y,
      clearance:nearestHullDistance(),altitude:position.y,heading:-yaw,range,timeScale,throttle,
      targetName:auto==='surface'?berth.name:'',targetId:auto==='surface'?berth.id:null,
      canCapture:false,canLand:canLand(),landingReason:'请进近外甲板接驳坪'};
  }
  return {position,quaternion,velocity,tick,status,manual,launch,land,autopilot,departSystem,placeOnSurface,snapshot,captureDock:()=>false};
}
