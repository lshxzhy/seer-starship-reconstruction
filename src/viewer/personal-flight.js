  // One physical craft serves the player. Its navigational point stays on
  // the deck; flying height is measured separately so lifts retain their datum.
  function createPersonalFlight(worldMetre,population) {
    const craft=createPersonalFlyer(worldMetre);
    // The rotating wingtip sweeps 1.548 m. Allow its 3.20 m envelope to pass
    // through a centred 3.40 m cabin doorway at low hover.
    const clearance=craft.radius;
    const bay=habitat.byId.get('teleport');
    const orientation=bay.side===1?-1:1;
    let parked={x:bay.center[0]+2.55*orientation,y:bay.center[1],
      z:bay.center[2]+8.5*orientation,level:bay.level};
    let heading=bay.yawRad, mounted=false, landing=false, stored=false;
    let altitude=0, targetHeight=0, vx=0, vz=0;

    function reachable(p){
      if(stored||!p||p.level!==parked.level)return false;
      const dx=parked.x-p.x,dz=parked.z-p.z;
      if(Math.hypot(dx,dz)>clearance+1.65)return false;
      const end=habitat.move(p,dx,dz);
      return Math.hypot(end.x-parked.x,end.z-parked.z)<.15;
    }
    function heightLimit(p){
      const room=habitat.byId.get(habitat.location(p).roomId);
      if(!room)return .35;
      const margin=Math.min(room.spec.width/2-Math.abs(p.x-room.center[0]),
        room.spec.depth/2-Math.abs(p.z-room.center[2]));
      return Math.min(room.id==='terraceAccess'?5:3,Math.max(.35,margin-clearance),room.spec.height-3.2);
    }
    function stop(){vx=0;vz=0;}
    function park(){
      mounted=false;landing=false;altitude=targetHeight=0;stop();
    }
    function beside(p,yaw,radius){
      // Search around the actual bay. Reject spots hidden behind walls,
      // occupied by people, or too small to contain the folded-out wings.
      for(const offset of [Math.PI/2,-Math.PI/2,0,Math.PI,Math.PI*.25,-Math.PI*.25,Math.PI*.75,-Math.PI*.75]){
        const angle=yaw+offset;
        const dx=Math.sin(angle)*(clearance+.84),dz=Math.cos(angle)*(clearance+.84);
        const q={...p,x:p.x+dx,z:p.z+dz};
        if(!habitat.canStand(q,radius)||population.nearest(q,radius+.42))continue;
        const end=habitat.move(p,dx,dz);
        if(Math.hypot(end.x-q.x,end.z-q.z)<.12)return q;
      }
      return null;
    }
    function interact(p,yaw){
      if(mounted){
        landing=true;targetHeight=0;
        return {notice:'正在着陆'};
      }
      if(!reachable(p)){
        const place=beside(p,yaw,clearance);
        if(!place)return {notice:'翼端净空不足。请到开阔地面取出滑翔翼。'};
        parked=place;heading=yaw;stored=false;
        return {notice:'滑翔翼已停在身旁，可以登乘。'};
      }
      if(population.nearest(parked,.88))return {notice:'有船员经过踏板，请稍后登乘。'};
      mounted=true;landing=false;targetHeight=.28;stop();
      return {pose:{...parked},notice:'已登乘奥飞滑翔翼'};
    }
    function changeHeight(delta,p){
      if(mounted&&!landing)targetHeight=T.MathUtils.clamp(targetHeight+delta,0,heightLimit(p));
    }
    const serviceBrake=48;
    function clearAhead(p,dx,dz,speed){
      const reach=speed*speed/(2*serviceBrake)+.42;
      const steps=Math.ceil(reach/.46);
      let from=p,permitted=speed;
      for(let i=1;i<=steps;i++){
        const travel=reach*i/steps;
        const to={...p,x:p.x+dx*travel,z:p.z+dz*travel};
        if(!habitat.canStand(to,clearance)||(altitude<=1.9&&!population.clearsCrew(from,to,clearance))){
          permitted=Math.min(speed,Math.sqrt(2*serviceBrake*reach*(i-1)/steps));break;
        }
        targetHeight=Math.min(targetHeight,heightLimit(to));
        from=to;
      }
      // A slow manoeuvre may still slide along a bulkhead or door jamb.
      return Math.max(2.4,permitted);
    }
    function drive(p,dx,dz,boost,dt) {
      const magnitude=Math.hypot(dx,dz);
      if(magnitude>1){dx/=magnitude;dz/=magnitude;}
      const powered=!landing&&magnitude>.001;
      const speed=powered?clearAhead(p,dx/Math.min(1,magnitude),dz/Math.min(1,magnitude),boost?24:15):0;
      const tx=dx*speed,tz=dz*speed,ex=tx-vx,ez=tz-vz;
      const accelerating=powered&&vx*tx+vz*tz>=vx*vx+vz*vz;
      const response=accelerating?(boost?36:28):serviceBrake;
      const u=Math.hypot(ex,ez),rampTime=Math.min(dt,u/response);
      const fraction=u>1e-6?Math.min(1,response*dt/u):1;
      const oldX=vx,oldZ=vz;
      vx+=ex*fraction;vz+=ez*fraction;
      const moveX=vx*dt+(oldX-vx)*rampTime*.5,moveZ=vz*dt+(oldZ-vz)*rampTime*.5;
      const canFly=(from,to)=>altitude<=heightLimit(to)+.02 &&
        (altitude>1.9 || population.clearsCrew(from,to,clearance));
      const next=habitat.move(p,moveX,moveZ,clearance,canFly);
      const distance=Math.hypot(next.x-p.x,next.z-p.z);
      if(distance>.001){
        const desired=Math.atan2(p.x-next.x,p.z-next.z);
        const arc=Math.atan2(Math.sin(desired-heading),Math.cos(desired-heading));
        heading+=arc*(1-Math.exp(-dt*9));
      }
      // Remove only the blocked axis, preserving a controlled slide along the other.
      if(Math.abs(moveX-(next.x-p.x))>.001)vx=0;
      if(Math.abs(moveZ-(next.z-p.z))>.001)vz=0;
      targetHeight=Math.min(targetHeight,heightLimit(next));
      parked={...next};
      const climb=T.MathUtils.clamp(targetHeight-altitude,-2.2*dt,2.2*dt);
      // A pilot can pass over a crew member but must descend onto clear deck.
      if(climb>=0 || altitude+climb>1.9 || !population.nearest(next,clearance+.41))altitude+=climb;
      else if(landing){landing=false;targetHeight=altitude;return {pose:next,notice:'下方有船员，请移到空处着陆。'};}
      if(landing&&altitude<.015&&Math.hypot(vx,vz)<.1){
        const exit=beside(parked,heading,.43);
        landing=false;
        if(exit){park();return {pose:exit,steppedOff:true,notice:'已下机，滑翔翼留在停靠位置。'};}
        return {pose:next,notice:'侧面没有下机净空，请移到开阔处。'};
      }
      return {pose:next};
    }
    function draw(p,dt){
      if(stored||p.level!==parked.level){craft.hide();return null;}
      const footOffset=craft.update(parked,heading,{mounted,dt,speed:Math.hypot(vx,vz),altitude});
      return mounted?{footOffset,heading}:null;
    }
    function clearsParked(from,to){
      if(stored||mounted||to.level!==parked.level)return true;
      const dist=Math.hypot(to.x-parked.x,to.z-parked.z);
      return dist>=clearance+.4||dist>=Math.hypot(from.x-parked.x,from.z-parked.z);
    }
    function restore(saved,p) {
      park();
      if(!saved?.parked||!habitat.levels.some(deck=>deck.id===saved.parked.level)||
        !habitat.canStand(saved.parked,clearance))return;
      parked={x:saved.parked.x,y:saved.parked.y,z:saved.parked.z,level:saved.parked.level};
      heading=Number.isFinite(saved.heading)?saved.heading:0;
      stored=saved.stored===true;
      mounted=!stored&&saved.mounted===true&&p.level===parked.level&&Math.hypot(p.x-parked.x,p.z-parked.z)<.15;
      if(mounted)altitude=targetHeight=T.MathUtils.clamp(Number.isFinite(saved.altitude)?saved.altitude:0,0,heightLimit(p));
    }
    return {get mounted(){return mounted;},get altitude(){return altitude;},get landing(){return landing;},get stored(){return stored;},
      get speed(){return Math.hypot(vx,vz);},
      get inMotion(){return mounted&&(landing||Math.hypot(vx,vz)>.01||Math.abs(altitude-targetHeight)>.015);},
      setStored(value){if(!mounted){stored=value===true;if(stored)craft.hide();}},
      reachable,interact,drive,draw,changeHeight,clearsParked,restore,stop,park,
      label:p=>mounted?(landing?'着陆中':'着陆下机'):reachable(p)?'驾驶滑翔翼':'取出滑翔翼',
      snapshot:()=>({parked:{...parked},heading,mounted,altitude,stored}),
      leave(){craft.hide();stop();},dispose(){craft.dispose();}};
  }
