// Classic habitats follow Taomee's PetXMLInfo mapID/Foundin fields, preserved in
// references/klose/client-spirit-config/18.xml, plus the official numbered pages.
// Evolved habitat inhabitants can be challenged, but zero client capture rates
// stay non-capturable. Spawn levels and the two bosses use the project rules in
// challenges.js; they do not stand for all historical server encounter puzzles.
const TWIN_HABITATS={
  'alpha-springs':{name:'双子阿尔法星 · 温泉群',animals:[89,90,91]},
  'alpha-rock':{name:'阿尔法星岩地',animals:[88,188,189]},
  'alpha-station':{name:'海盗能源站',animals:[97,98]},
  'beta-plain':{name:'双子贝塔星',animals:[119,120]},
  'beta-ruins':{name:'海盗要塞废墟',animals:[184,185]},
  'beta-waste':{name:'贝塔星荒原',animals:[105,106,113]}
};
function createTwinEcology(T,parent,definition,surface){
  // Metres to the right of the arrival view, then metres in front of it.
  // Keep the first inhabitants beside the forward approach, visible together
  // with the landmark instead of behind the visitor's default camera.
  const layout=definition.id==='alpha'?[
    ['alpha-springs',91,-2.8,4.8],['alpha-springs',91,3.1,6.5],
    ['alpha-springs',89,-4.8,9],['alpha-springs',90,5.8,12],
    ['alpha-rock',88,7,15],['alpha-rock',188,-3,4.5],['alpha-rock',189,3.7,6.5],
    ['alpha-station',97,-3.6,5.5],['alpha-station',98,4.3,8]
  ]:[
    ['beta-plain',119,-3,5],['beta-plain',119,3.8,7],['beta-plain',120,-6,11],
    ['beta-ruins',184,-3,5],['beta-ruins',185,4.1,8],
    ['beta-waste',105,-3,4.8],['beta-waste',105,3.5,6.5],['beta-waste',106,-5.5,9],['beta-waste',113,7,13]
  ];
  const nodes=layout.map(([siteId,id,side,ahead],index)=>{
    const site=definition.sites.find(s=>s.id===siteId);if(!site)return null;
    const look=site.lookAt||[site.x,site.z-1],dx=look[0]-site.x,dz=look[1]-site.z,length=Math.hypot(dx,dz);
    const fx=length?dx/length:0,fz=length?dz/length:-1;
    const boss=id===88||id===113,model=createFieldSpirit(T,id,{boss});if(!model)return null;
    const forward=boss?Math.max(ahead,model.radius+8):ahead;
    const x=-fz*side+fx*forward,z=fx*side+fz*forward;
    const anchor=new T.Group(),turn=new T.Group();anchor.add(turn);turn.add(model.root);parent.add(anchor);
    const key=siteId+'-'+id+'-'+index;anchor.userData.twinSpirit=key;anchor.visible=false;
    return {site,id,x,z,homeX:x,homeZ:z,model,anchor,turn,key,boss,phase:index*1.91,age:0,yaw:0,at:null,ready:false,retry:0,rest:0};
  }).filter(Boolean);
  let enabled=true,visitor=null;
  const displacement=(a,b)=>surfaceDisplacement(a,b,definition.radius);
  function groundClear(at,radius){
    if(surface.canStand)return surface.canStand(at.lat,at.lon,radius);
    if(!surface.walk)return true;
    const resolved=surface.walk(at.lat,at.lon,0,0);
    return displacement(at,resolved).distance<.05;
  }
  function clear(p,at,visitorRadius=.40){
    if(!groundClear(at,p.model.radius+.08))return false;
    if(visitor&&displacement(at,visitor).distance<p.model.radius+visitorRadius)return false;
    return nodes.every(other=>other===p||!other.ready||other.site!==p.site||
      displacement(at,other.at).distance>p.model.radius+other.model.radius+.22);
  }
  function initialize(p){
    const step=Math.max(.85,p.model.radius*.28),rings=Math.max(15,Math.ceil((p.model.radius*3+12)/step));
    for(let ring=0;ring<=rings;ring++){
      const n=Math.max(1,ring*8);
      for(let i=0;i<n;i++){
        const a=i*Math.PI*2/n,x=p.homeX+ring*step*Math.cos(a),z=p.homeZ+ring*step*Math.sin(a);
        const at=surface.move(p.site.lat,p.site.lon,x,-z);
        if(!clear(p,at))continue;
        p.x=p.homeX=x;p.z=p.homeZ=z;p.at=at;p.ready=true;return true;
      }
    }
    return false;
  }
  function pose(p){
    p.anchor.position.copy(surface.point(p.at.lat,p.at.lon,p.id===91?.10:0));
    p.anchor.quaternion.copy(surface.frame(p.at.lat,p.at.lon).quaternion);
    p.turn.rotation.y=p.yaw;
  }
  function update(lat,lon,dt,walking=true){
    visitor={lat,lon};dt=Math.min(.15,Math.max(0,dt));
    for(const p of nodes){
      const nearby=enabled&&walking&&displacement(p.site,visitor).distance<105;
      if(!nearby||p.rest>Date.now()){p.anchor.visible=false;continue;}
      if(!p.ready){
        p.retry=Math.max(0,p.retry-dt);
        if(p.retry||!initialize(p)){p.anchor.visible=false;if(!p.retry)p.retry=2;continue;}
      }
      p.anchor.visible=true;p.age+=dt;
      let movement=0,aim=p.yaw,wander=null;
      const toVisitor=displacement(p.at,visitor);
      if(p.boss||toVisitor.distance<p.model.radius+2.1){
        aim=Math.atan2(toVisitor.east,-toVisitor.north);
      }else{
        const phase=p.phase+p.age*.23,range=p.id===91?1.65:Math.max(2.3,p.model.radius*1.7);
        const tx=p.homeX+Math.cos(phase)*range,tz=p.homeZ+Math.sin(phase*.79)*range;
        const dx=tx-p.x,dz=tz-p.z,left=Math.hypot(dx,dz),stride=Math.min(left,dt*(p.id===91?.48:p.id===90?.65:.48));
        if(left>.03){
          aim=Math.atan2(dx,dz);
          wander={stride};
        }
      }
      const turn=Math.atan2(Math.sin(aim-p.yaw),Math.cos(aim-p.yaw));
      const turned=T.MathUtils.clamp(turn,-dt*1.2,dt*1.2);p.yaw+=turned;
      if(wander){
        const stride=wander.stride*Math.max(0,Math.cos(aim-p.yaw))**2;
        const x=p.x+Math.sin(p.yaw)*stride,z=p.z+Math.cos(p.yaw)*stride;
        const next=surface.move(p.site.lat,p.site.lon,x,-z);
        if(clear(p,next)){p.x=x;p.z=z;p.at=next;movement=stride;}
      }
      const speed=dt?movement/dt:0,turnRate=dt?turned/dt:0;
      p.model.update(dt,Math.min(1,Math.max(speed/.65,Math.abs(turnRate)*.5)),{speed,turnRate});pose(p);
    }
  }
  function record(p,lat,lon){
    const challenge=SPT_CHALLENGES.get(p.id),habitat=TWIN_ENCOUNTERS.get(p.id);
    return {key:p.key,id:p.key,speciesId:p.id,name:SEER_SPIRIT_DATA.index.find(row=>row[0]===p.id)?.[1]||'精灵',
      siteId:p.site.id,size:p.model.size,kind:p.boss?'boss':'wild',boss:p.boss,visible:true,
      level:challenge?.level||habitat?.level,canCapture:!p.boss&&!!SEER_SPIRIT_DATA.species[p.id]?.catch,fieldLock:'',
      observationRange:22+p.model.radius,contactRange:22+p.model.radius,
      lat:p.at.lat,lon:p.at.lon,distance:displacement({lat,lon},p.at).distance,
      focusPoint:p.anchor.localToWorld(new T.Vector3(0,p.model.size*.52,0))};
  }
  function spiritObservation(lat,lon,key){
    let best=null;
    for(const p of nodes){
      if(!p.anchor.visible||!p.ready||(key&&key!==p.key))continue;
      const found=record(p,lat,lon);
      if(found.distance<=Math.max(40,found.observationRange)&&(!best||found.distance-p.model.radius<best.distance-best.radius))best={...found,radius:p.model.radius};
    }
    return best;
  }
  function pickSpirit(caster,lat,lon){
    const close=nodes.filter(p=>p.anchor.visible&&p.ready&&displacement({lat,lon},p.at).distance<=24+p.model.radius);
    const hit=caster.intersectObjects(close.map(p=>p.anchor),true)[0];
    let object=hit?.object;while(object&&!object.userData.twinSpirit)object=object.parent;
    return object?spiritObservation(lat,lon,object.userData.twinSpirit):null;
  }
  function avoidWalker(lat,lon,radius=.30){
    let at={lat,lon};
    for(const p of nodes){
      if(!p.anchor.visible||!p.ready)continue;
      const d=displacement(p.at,at),gap=p.model.radius+radius;
      if(d.distance>=gap)continue;
      const next=surface.move(p.at.lat,p.at.lon,d.distance?d.east/d.distance*gap:gap,d.distance?d.north/d.distance*gap:0);
      if(groundClear(next,radius))at=next;
    }
    return at;
  }
  return {update,spiritObservation,nearbySpirit:(lat,lon)=>spiritObservation(lat,lon),pickSpirit,avoidWalker,
    withdrawSpirit(key){const p=nodes.find(p=>p.key===key);if(!p)return false;p.rest=Date.now()+60000;p.anchor.visible=false;return true;},
    setVisible(value){enabled=value;if(!value)for(const p of nodes)p.anchor.visible=false;},
    hint(lat,lon){const p=spiritObservation(lat,lon);return p&&p.distance<12+p.radius?'附近有'+p.name+' · 按 E '+(p.boss?'挑战首领':'接触与对战'):'';},
    dispose(){for(const p of nodes){parent.remove(p.anchor);p.model.dispose();}}
  };
}
