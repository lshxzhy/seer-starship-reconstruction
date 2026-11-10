  // Distances are in ship metres. Each lift has one carriage; an empty call and
  // an occupied journey run through exactly the same doors and guideway.
  function createLiftRide(lines,plant){
    const doorTime=1.15;
    const deckNames=new Map(habitat.plan.levels.map(deck=>[deck.id,deck.name]));
    const cars=new Map();
    let rider=null;

    for(const line of lines){
      let distance=0,previous=null;
      const stops=line.stops.slice().sort((a,b)=>a.center.y-b.center.y).map(stop=>{
        if(previous)distance+=Math.hypot(stop.center.x-previous.x,stop.center.y-previous.y,stop.center.z-previous.z);
        previous=stop.center;
        return {...stop,distance,name:deckNames.get(stop.level)||stop.level};
      });
      const byLevel=new Map(stops.map(stop=>[stop.level,stop]));
      const home=byLevel.get(line.homeLevel);
      const car={line,stops,byLevel,home,from:home,to:home,phase:'idle',elapsed:0,profile:null,
        center:{...home.center},dockedLevel:home.level,door:1,speed:0,progress:1};
      cars.set(line.id,car);present(car);
    }

    function profileFor(car,from,to){
      const length=Math.abs(to.distance-from.distance);
      // A half-cosine speed ramp starts and ends with zero acceleration. Short
      // adjacent-deck trips use a lower peak speed and no cruising interval.
      const {speedLimit,accelerationLimit}=car.line;
      const peak=Math.min(speedLimit,Math.sqrt(2*length*accelerationLimit/Math.PI));
      const ramp=peak*Math.PI/(2*accelerationLimit);
      const cruise=Math.max(0,length/peak-ramp);
      return {length,peak,ramp,cruise,duration:2*ramp+cruise};
    }

    function along(profile,time){
      const {length,peak,ramp,cruise,duration}=profile;
      const t=Math.min(duration,Math.max(0,time));
      if(t>=duration)return {distance:length,speed:0};
      if(t>=ramp && t<=ramp+cruise)return {distance:peak*(t-ramp/2),speed:peak};
      const braking=t>ramp+cruise,u=braking?duration-t:t;
      const theta=Math.PI*u/ramp;
      const speed=peak*(1-Math.cos(theta))/2;
      const span=peak*(u-ramp*Math.sin(theta)/Math.PI)/2;
      return {distance:braking?length-span:span,speed};
    }

    function positionAt(car,s){
      // The main rail is vertical; the service rail also changes x as it follows
      // the pod's neck. Interpolate along the installed stop-to-stop rail spans.
      for(let i=1;i<car.stops.length;i++){
        const b=car.stops[i],a=car.stops[i-1];
        if(s>b.distance)continue;
        const u=Math.max(0,(s-a.distance)/(b.distance-a.distance));
        return {x:a.center.x+(b.center.x-a.center.x)*u,
          y:a.center.y+(b.center.y-a.center.y)*u,z:a.center.z+(b.center.z-a.center.z)*u};
      }
      return {...car.stops[car.stops.length-1].center};
    }

    function present(car){
      car.speed=0;
      if(car.phase==='moving'){
        const motion=along(car.profile,car.elapsed);
        car.progress=motion.distance/car.profile.length;
        car.speed=motion.speed;
        car.center=positionAt(car,car.from.distance+Math.sign(car.to.distance-car.from.distance)*motion.distance);
        car.dockedLevel=null;car.door=0;
      }else{
        const closing=car.phase==='closing',dock=closing?car.from:car.to;
        car.center={...dock.center};car.dockedLevel=dock.level;
        const u=car.elapsed/doorTime;
        const doorTravel=u*u*(3-2*u);
        car.door=car.phase==='idle'?1:closing?1-doorTravel:doorTravel;
        car.progress=closing?0:1;
      }
      plant.setCar(car.line.id,{center:car.center,dockedLevel:car.dockedLevel,door:car.door});
    }

    function start(car,to){
      car.from=car.to;car.to=to;car.profile=profileFor(car,car.from,to);
      car.phase='closing';car.elapsed=0;present(car);
    }

    function tick(dt){
      if(!Number.isFinite(dt)||dt<=0)return;
      for(const car of cars.values()){
        if(car.phase==='idle')continue;
        let remaining=dt;
        while(remaining>0&&car.phase!=='idle'){
          const end=car.phase==='moving'?car.profile.duration:doorTime;
          const step=Math.min(remaining,Math.max(0,end-car.elapsed));
          car.elapsed+=step;remaining-=step;
          if(car.elapsed<end)break;
          car.elapsed=0;
          if(car.phase==='closing')car.phase='moving';
          else if(car.phase==='moving')car.phase='opening';
          else{car.phase='idle';car.from=car.to;car.profile=null;}
        }
        present(car);
      }
    }

    function station(pose){return pose?plant.station(pose):null;}
    function status(pose){
      const here=rider?null:station(pose);
      const car=cars.get(rider?.lineId||here?.lineId);
      if(!car)return null;
      const level=rider?(car.dockedLevel||car.from.level):here.level;
      const inside=Boolean(rider||here?.inside);
      const dockedHere=car.dockedLevel===level,ready=car.phase==='idle';
      return {lineId:car.line.id,name:car.line.name,level,inside,waiting:!inside,
        canCall:!rider&&!inside&&ready&&!dockedHere,canDepart:!rider&&inside&&ready&&dockedHere,
        phase:car.phase,dockedLevel:car.dockedLevel,fromLevel:car.from.level,targetLevel:car.to.level,
        fromName:car.from.name,targetName:car.to.name,door:car.door,progress:car.progress,
        center:{...car.center},speed:car.speed,direction:Math.sign(car.to.distance-car.from.distance),
        destinations:car.stops.filter(stop=>stop.level!==level).map(stop=>({id:stop.level,name:stop.name,floorY:stop.center.y}))};
    }
    function call(pose){
      const place=status(pose);
      if(!place?.canCall)return false;
      const car=cars.get(place.lineId);start(car,car.byLevel.get(place.level));return true;
    }
    function depart(pose,level){
      const place=status(pose);
      if(!place?.canDepart||level===place.level)return false;
      const car=cars.get(place.lineId),to=car.byLevel.get(level);
      if(!to)return false;
      rider={lineId:car.line.id,dx:pose.x-car.center.x,dz:pose.z-car.center.z,yaw:pose.yaw||0};
      start(car,to);return true;
    }
    function passengerPose(){
      if(!rider)return null;
      const car=cars.get(rider.lineId);
      return {x:car.center.x+rider.dx,y:car.center.y,z:car.center.z+rider.dz,
        level:car.dockedLevel||car.from.level,yaw:rider.yaw};
    }
    function movePassenger(dx,dz){
      if(!rider)return;
      // Motion in the carriage frame is independent of the speed of its rails.
      const b=plant.cabinBounds,radius=.43;
      rider.dx=Math.max(radius-b.halfWidth,Math.min(b.halfWidth-radius,rider.dx+dx));
      rider.dz=Math.max(radius-b.halfDepth,Math.min(b.halfDepth-radius,rider.dz+dz));
    }
    function consumeArrival(){
      if(!rider||cars.get(rider.lineId).phase!=='idle')return null;
      const final=passengerPose();rider=null;return final;
    }
    function snapshot(){
      return {version:1,cars:[...cars.values()].map(car=>({id:car.line.id,from:car.from.level,to:car.to.level,
        phase:car.phase,elapsed:car.elapsed})),rider:rider?{...rider}:null};
    }
    function restore(saved){
      if(saved?.version!==1||!Array.isArray(saved.cars)||!saved.cars.length||saved.cars.length>cars.size)return false;
      const states=new Map();
      for(const s of saved.cars){
        const car=cars.get(s?.id),from=car?.byLevel.get(s?.from),to=car?.byLevel.get(s?.to);
        if(!car||!from||!to||states.has(s.id)||!['idle','closing','moving','opening'].includes(s.phase)||
          !Number.isFinite(s.elapsed)||s.elapsed<0||(s.phase==='idle')!==(from===to))return false;
        const profile=from===to?null:profileFor(car,from,to);
        const end=s.phase==='idle'?0:s.phase==='moving'?profile.duration:doorTime;
        states.set(s.id,{from,to,profile,phase:s.phase,elapsed:Math.min(end,s.elapsed)});
      }
      const r=saved.rider;
      if(r!=null&&(!states.has(r.lineId)||![r.dx,r.dz,r.yaw].every(Number.isFinite)||
        Math.abs(r.dx)>plant.cabinBounds.halfWidth||Math.abs(r.dz)>plant.cabinBounds.halfDepth))return false;
      // A newer ship may have another line. Place only cars absent from the
      // saved fleet at their installed home stops, and retain existing journeys.
      for(const [id,car] of cars){
        const state=states.get(id)||{from:car.home,to:car.home,profile:null,phase:'idle',elapsed:0};
        Object.assign(car,state);present(car);
      }
      rider=r?{lineId:r.lineId,dx:r.dx,dz:r.dz,yaw:r.yaw}:null;return true;
    }
    return {station,status,call,depart,tick,movePassenger,passengerPose,consumeArrival,snapshot,restore,
      get riding(){return rider!==null;},get moving(){return [...cars.values()].some(car=>car.phase!=='idle');}};
  }
