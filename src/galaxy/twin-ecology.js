// Classic habitats follow Taomee's PetXMLInfo mapID/Foundin fields, preserved in
// references/klose/client-spirit-config/18.xml, plus the official numbered pages.
// #090 is observed as #089's evolution at map 105, not made a capturable spawn.
// Visible three-dimensional inhabitants are observations, not invented capture
// events: the original encounter conditions/rewards are deliberately separate.
const TWIN_HABITATS={
  'alpha-springs':{name:'双子阿尔法星 · 温泉群',animals:[89,90,91]},
  'alpha-rock':{name:'阿尔法星岩地',animals:[88]},
  'alpha-station':{name:'海盗能源站',animals:[97,98]},
  'beta-plain':{name:'双子贝塔星',animals:[119,120]},
  'beta-waste':{name:'贝塔星荒原',animals:[105,106,113]}
};
function createTwinEcology(T,parent,definition,surface){
  const layout=definition.id==='alpha'?[
    ['alpha-springs',91,7,5],['alpha-springs',91,-9,7],
    ['alpha-springs',89,-14,12],['alpha-springs',90,15,12],['alpha-rock',88,10,8],
    ['alpha-station',97,-8,6],['alpha-station',98,8,8]
  ]:[
    ['beta-plain',119,-7,8],['beta-plain',119,8,4],['beta-plain',120,13,11],
    ['beta-waste',105,-8,8],['beta-waste',105,6,5],['beta-waste',106,-13,13],['beta-waste',113,13,11]
  ];
  const nodes=layout.map(([siteId,id,x,z],index)=>{
    const site=definition.sites.find(s=>s.id===siteId);if(!site)return null;
    const boss=id===88||id===113,model=createFieldSpirit(T,id,{boss});if(!model)return null;
    const anchor=new T.Group(),turn=new T.Group();anchor.add(turn);turn.add(model.root);parent.add(anchor);
    const key=siteId+'-'+id+'-'+index;anchor.userData.twinSpirit=key;anchor.visible=false;
    return {site,id,x,z,homeX:x,homeZ:z,model,anchor,turn,key,boss,phase:index*1.91,age:0,yaw:0,at:null,ready:false,retry:0};
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
    for(let ring=0;ring<=15;ring++){
      const n=Math.max(1,ring*8);
      for(let i=0;i<n;i++){
        const a=i*Math.PI*2/n,x=p.homeX+ring*.85*Math.cos(a),z=p.homeZ+ring*.85*Math.sin(a);
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
      if(!nearby){p.anchor.visible=false;continue;}
      if(!p.ready){
        p.retry=Math.max(0,p.retry-dt);
        if(p.retry||!initialize(p)){p.anchor.visible=false;if(!p.retry)p.retry=2;continue;}
      }
      p.anchor.visible=true;p.age+=dt;
      let movement=0,aim=p.yaw;
      const toVisitor=displacement(p.at,visitor);
      if(p.boss||toVisitor.distance<p.model.radius+2.1){
        aim=Math.atan2(toVisitor.east,-toVisitor.north);
      }else{
        const phase=p.phase+p.age*.40,range=p.id===91?1.65:2.3;
        const tx=p.homeX+Math.cos(phase)*range,tz=p.homeZ+Math.sin(phase*.79)*range;
        const dx=tx-p.x,dz=tz-p.z,left=Math.hypot(dx,dz),stride=Math.min(left,dt*(p.id===91?.48:.37));
        if(left>.03){
          aim=Math.atan2(dx,dz);
          const x=p.x+dx/left*stride,z=p.z+dz/left*stride;
          const next=surface.move(p.site.lat,p.site.lon,x,-z);
          if(clear(p,next)){p.x=x;p.z=z;p.at=next;movement=stride;}
        }
      }
      const turn=Math.atan2(Math.sin(aim-p.yaw),Math.cos(aim-p.yaw));
      p.yaw+=T.MathUtils.clamp(turn,-dt*1.5,dt*1.5);
      p.model.update(dt,movement?1:0);pose(p);
    }
  }
  function record(p,lat,lon){
    return {key:p.key,id:p.key,speciesId:p.id,name:SEER_SPIRIT_DATA.index.find(row=>row[0]===p.id)?.[1]||'精灵',
      siteId:p.site.id,size:p.model.size,kind:'observation',boss:p.boss,visible:true,
      fieldLock:p.boss?'可以观察和交流。该首领的原版挑战条件与奖励尚未接入。':'可以观察和交流。该精灵的原版出现条件与捕捉流程尚未接入。',
      lat:p.at.lat,lon:p.at.lon,distance:displacement({lat,lon},p.at).distance,
      focusPoint:p.anchor.localToWorld(new T.Vector3(0,p.model.size*.52,0))};
  }
  function spiritObservation(lat,lon,key){
    let best=null;
    for(const p of nodes){
      if(!p.anchor.visible||!p.ready||(key&&key!==p.key))continue;
      const found=record(p,lat,lon);
      if(found.distance<=40&&(!best||found.distance<best.distance))best=found;
    }
    return best;
  }
  function pickSpirit(caster,lat,lon){
    const close=nodes.filter(p=>p.anchor.visible&&p.ready&&displacement({lat,lon},p.at).distance<=24);
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
    withdrawSpirit:()=>false,
    setVisible(value){enabled=value;if(!value)for(const p of nodes)p.anchor.visible=false;},
    hint(lat,lon){const p=spiritObservation(lat,lon);return p&&p.distance<12?'附近有'+p.name+' · 靠近后按 E 观察与交流':'';},
    dispose(){for(const p of nodes){parent.remove(p.anchor);p.model.dispose();}}
  };
}
