// The unmarked v3 planets used one metre chart; desktop v4 distributed those
// charts across larger globes. Keep both historical coordinate frames explicit.
const previousPlanetRadius={klose:480000,ocean:410000};
const previousCompactPlanetRadius={klose:48000,ocean:41000,alpha:38000,beta:35000};
const previousDistrictPlanetRadius={klose:9600,ocean:8200,alpha:7600,beta:7000};
const previousKlosePads={ridge:[2880,-1480],delta:[-2720,-2940],grove:[4500,1980]};
const compactVoyageSystemScale=1/60;
// Two format-5 builds shared radii but used different charts for Ocean Star.
const singleOceanLayout='single-ocean',currentVoyageLayout='ocean-districts';
const previousVoyageDistricts={
  klose:[[['grassland'],.32,.54],[['swamp'],.16,2.12],[['forest'],.65,-2.48],
    [['vineway','core'],-.52,-.92],[['wetland'],1.02,.91],[['flame'],-.64,2.36],
    [['sanctuary'],-.47,-2.69],[['ridge'],.63,-.65],[['delta'],-1,.33],[['grove'],.08,-1.60]],
  ocean:[[['ocean-shallows','ocean-depths','ocean-floor','ocean-sanctum'],.24,-.43]],
  alpha:[[['alpha-springs'],.29,-.95],[['alpha-rock','alpha-station'],.34,1.16],[['alpha-forest'],-.43,-3.02]],
  beta:[[['beta-plain'],.19,-.47],[['beta-waste','beta-training','beta-hall'],.37,1.64],[['beta-ruins'],-.40,-2.55]]
};

function voyageRadial(lat,lon){
  return new T.Vector3(Math.cos(lat)*Math.cos(lon),Math.sin(lat),-Math.cos(lat)*Math.sin(lon));
}
function voyageCoordinates(lat,lon){
  const c=Math.cos(lat);
  return {lat:Math.atan2(Math.sin(lat),Math.abs(c)),lon:Math.atan2(Math.sin(lon)*c,Math.cos(lon)*c)};
}
function voyageTangent(lat,lon){
  const east=new T.Vector3(-Math.sin(lon),0,-Math.cos(lon)),up=voyageRadial(lat,lon),south=east.clone().cross(up);
  return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(east,up,south));
}
function formerVoyageSites(definition,oldPads=true){
  const copy=site=>{
    const pad=oldPads&&definition.id==='klose'&&previousKlosePads[site.id];
    return pad?{...site,x:pad[0],z:pad[1]}:{...site};
  };
  return [...definition.sites.map(copy),...(definition.landingSites||[]).map(copy)];
}

// Original 480/410 km -> 48/41 km step, retaining the original survey pads.
function compactLegacyPoint(location,definition,oldRadius=previousPlanetRadius[definition.id]){
  if(!location||!Number.isFinite(location.lat)||!Number.isFinite(location.lon))return location;
  const current=previousCompactPlanetRadius[definition.id];
  if(!Number.isFinite(oldRadius)||!current||oldRadius===current)return location;
  const home=definition.sites[0],cos=Math.cos(home.lat),lonDelta=location.lon-home.lon;
  const x=Math.atan2(Math.sin(lonDelta),Math.cos(lonDelta))*oldRadius*cos,z=(home.lat-location.lat)*oldRadius;
  const distance=Math.hypot(x,z),ratio=current/oldRadius,mix=(r,a,b,lo,hi)=>lo+(r-a)*(hi-lo)/(b-a);
  let r=distance;
  if(distance>800){
    if(definition.id==='klose'){
      if(distance<8000)r=mix(distance,800,8000,800,1600);
      else if(distance<65000)r=distance*.2;
      else if(distance<195000)r=mix(distance,65000,195000,13000,195000*ratio);
      else return location;
    }else if(distance<16000)r=mix(distance,800,16000,800,16000*ratio);
    else return location;
  }
  const factor=distance?r/distance:1;
  let east=x*factor,south=z*factor;
  if(definition.id==='klose'&&distance>8000&&distance<35000){
    for(const [px,pz] of Object.values(previousKlosePads)){
      const dx=x-5*px,dz=z-5*pz,near=Math.hypot(dx,dz);
      if(near>=200)continue;
      const weight=1-T.MathUtils.smoothstep(near,70,200);
      east+=(px+dx-east)*weight;south+=(pz+dz-south)*weight;break;
    }
  }
  return {...location,...voyageCoordinates(home.lat-south/current,home.lon+east/(current*cos))};
}

function compactSurfacePoint(location,definition,oldRadius=previousCompactPlanetRadius[definition.id]){
  if(!location||!Number.isFinite(location.lat)||!Number.isFinite(location.lon)||!definition.layout||
      !Number.isFinite(oldRadius)||oldRadius<=0||definition.kind==='ship')return location;
  const prior=previousCompactPlanetRadius[definition.id];if(!prior)return location;
  if(oldRadius>prior){location=compactLegacyPoint(location,definition,oldRadius);oldRadius=prior;}
  const home=definition.sites[0];let x,z;
  if(definition.id==='alpha'||definition.id==='beta'){
    const p=surfaceDisplacement(home,location,oldRadius);x=p.east;z=-p.north;
  }else{
    const delta=location.lon-home.lon;
    x=Math.atan2(Math.sin(delta),Math.cos(delta))*oldRadius*Math.cos(home.lat);z=(home.lat-location.lat)*oldRadius;
  }
  // An old single-chart location belongs to the nearest stable scene/pad.
  // Moving a survey pad must not multiply the visitor's local metre offset.
  let nearest=null,distance=Infinity;
  for(const site of formerVoyageSites(definition,oldRadius===prior)){
    const d=Math.hypot(x-site.x,z-site.z);if(d<distance){nearest=site;distance=d;}
  }
  if(!nearest||distance>550)return {...location};
  const named=(definition.landingSites||[]).find(s=>s.id===nearest.id&&s.name===nearest.name)||
    definition.sites.find(s=>s.id===nearest.id)||(definition.landingSites||[]).find(s=>s.id===nearest.id);
  const region=definition.layout.source(named.x,named.z);
  const scale=definition.layout.scale;
  return {...location,...definition.layout.fromXZ(named.x+(x-nearest.x)/scale,named.z+(z-nearest.z)/scale,region)};
}

// V4 already uses distributed 1.7x districts. Recover that exact old chart,
// then carry physical offsets into the corresponding new stable district.
function migrateSurfacePoint(location,definition,format=3,oldRadius,sourceLayout){
  if(!location||!Number.isFinite(location.lat)||!Number.isFinite(location.lon)||!definition.layout||
      definition.kind==='ship')return location;
  const singleOcean=format===5&&definition.id==='ocean'&&sourceLayout===singleOceanLayout;
  if(format>=5&&!singleOcean)return location;
  if(format!==4&&!singleOcean)return compactSurfacePoint(location,definition,Number.isFinite(oldRadius)?oldRadius:
    format<3?previousPlanetRadius[definition.id]||previousCompactPlanetRadius[definition.id]:previousCompactPlanetRadius[definition.id]);
  const radius=Number.isFinite(oldRadius)&&oldRadius>0?oldRadius:singleOcean?definition.radius:previousDistrictPlanetRadius[definition.id];
  const groups=previousVoyageDistricts[definition.id];if(!radius||!groups)return location;
  const sites=formerVoyageSites(definition,!singleOcean),unique=sites.filter((s,i)=>sites.findIndex(p=>p.id===s.id)===i);
  const former=createSurfaceLayout(radius,unique,groups,1.7),p=former.chart(location.lat,location.lon);
  const members=sites.filter(s=>former.source(s.x,s.z)===p.region);
  let nearest=null,distance=Infinity;
  for(const member of members){
    const d=Math.hypot(p.x-member.x,p.z-member.z);if(d<distance){nearest=member;distance=d;}
  }
  if(!nearest||distance>550)return {...location};
  const named=(definition.landingSites||[]).find(s=>s.id===nearest.id&&s.name===nearest.name)||
    definition.sites.find(s=>s.id===nearest.id)||(definition.landingSites||[]).find(s=>s.id===nearest.id);
  const region=definition.layout.source(named.x,named.z);
  const factor=former.scale/definition.layout.scale;
  return {...location,...definition.layout.fromXZ(named.x+(p.x-nearest.x)*factor,named.z+(p.z-nearest.z)*factor,region)};
}

function formerVoyageDock(definition,oldRadius,format,dock){
  if(!dock||definition.id!=='klose')return null;
  const home=definition.sites[0];
  // Original sampler heights at grassland and at its orbital station.
  // The 900 m independent chart used a 2400 m orbit rather than 145 km.
  const compact=oldRadius===900&&format===3;
  const ground=format===4?70.709365:compact?117.815661:oldRadius===48000?435.905920:795.707971;
  const center=voyageRadial(home.lat+.18,home.lon+.05).multiplyScalar(oldRadius+(compact?2400:145000)+ground);
  const surface=voyageRadial(home.lat,home.lon).multiplyScalar(oldRadius+120.350081);
  return {center,orientation:carrierOrientation(T,center,surface),range:compact?900:3500};
}
function rotateVoyageRecord(updated,source,rotation,speedLimit){
  for(const field of ['v','heading'])if(Array.isArray(source[field])&&source[field].length===3&&source[field].every(Number.isFinite)){
    const vector=new T.Vector3().fromArray(source[field]).applyQuaternion(rotation);
    if(field==='v')vector.clampLength(0,speedLimit);
    updated[field]=vector.toArray();
  }
  if(Array.isArray(source.q)&&source.q.length===4&&source.q.every(Number.isFinite))
    updated.q=rotation.clone().multiply(new T.Quaternion().fromArray(source.q)).normalize().toArray();
}

function compactVehicleRecord(record,dock){
  if(!record||![1,2,3,4,5].includes(record.version))return record;
  if(record.version===5&&record.surfaceLayout!==singleOceanLayout)return record;
  const definition=PANO_NAVIGATION.regions[record.planetId]?.definition||KLOSE_WORLD;
  const radii=record.version===4?previousDistrictPlanetRadius:record.version<3?previousPlanetRadius:previousCompactPlanetRadius;
  const oldRadius=Number.isFinite(record.planetRadius)&&record.planetRadius>0?record.planetRadius:
    record.version===5?definition.radius:radii[definition.id]||definition.radius;
  const oldSystem=Number.isFinite(record.systemScale)&&record.systemScale>0?record.systemScale:
    record.version===5?compactVoyageSystemScale:1;
  const updated={...record,version:5,surfaceLayout:currentVoyageLayout,planetId:definition.id,planetRadius:definition.radius,systemScale:compactVoyageSystemScale};
  const site=(value,body,radius)=>{
    if(!value)return value;
    const named=(body.landingSites||[]).find(s=>s.id===value.id)||(body.sites||[]).find(s=>s.id===value.id);
    return named?{...value,lat:named.lat,lon:named.lon}:migrateSurfacePoint(value,body,record.version,radius,record.surfaceLayout);
  };
  updated.target=site(record.target,definition,oldRadius);
  if(record.route?.site){
    const body=PANO_NAVIGATION.regions[record.route.planet]?.definition;
    if(body)updated.route={...record.route,planetRadius:body.radius,site:site(record.route.site,body,record.route.planetRadius)};
  }
  if(record.inTransit){
    // p and v are relative to the reference planet at the saved orbital time.
    // Byron has no surface radius migration but shares the same orbital scale.
    if(oldSystem!==compactVoyageSystemScale){
      for(const field of ['p','v'])if(Array.isArray(record[field])&&record[field].length===3&&record[field].every(Number.isFinite)){
        const vector=new T.Vector3().fromArray(record[field]).multiplyScalar(compactVoyageSystemScale/oldSystem);
        if(field==='v')vector.clampLength(0,800);
        updated[field]=vector.toArray();
      }
      updated.boostPower=0;
    }
    return updated;
  }
  if(!definition.layout||(record.version===5&&definition.id!=='ocean'))return updated;
  if(record.phase==='docked'){
    if(dock){
      updated.planetId='klose';updated.planetRadius=KLOSE_WORLD.radius;
      updated.p=dock.position.toArray();updated.q=dock.quaternion.toArray();updated.v=[0,0,0];
      updated.heading=new T.Vector3(0,0,-1).applyQuaternion(dock.quaternion).toArray();
    }
    return updated;
  }
  if(Array.isArray(record.tour)){
    updated.tour=record.tour.map(marker=>{
      if(!marker)return marker;
      const at=migrateSurfacePoint(marker,definition,record.version,oldRadius,record.surfaceLayout);
      const focus=definition.sites.find(s=>s.id===marker.id)||
        migrateSurfacePoint({lat:marker.focusLat,lon:marker.focusLon},definition,record.version,oldRadius,record.surfaceLayout);
      return {...at,focusLat:focus.lat,focusLon:focus.lon};
    });
  }
  if(!Array.isArray(record.p)||record.p.length!==3||!record.p.every(Number.isFinite))return updated;
  const position=new T.Vector3().fromArray(record.p);
  if(position.length()<oldRadius*.5)return null;
  const altitude=position.length()-oldRadius,former=formerVoyageDock(definition,oldRadius,record.version,dock);
  let rotation=new T.Quaternion(),speedLimit=oldRadius===definition.radius?Infinity:180;
  if(record.phase!=='landed'&&former&&position.distanceTo(former.center)<former.range){
    rotation.copy(dock.quaternion).multiply(former.orientation.clone().invert());
    const to=position.sub(former.center).applyQuaternion(rotation).add(dock.root.position);
    if(dock.isBlocked?.(to)){
      const forward=new T.Vector3(0,0,-1).applyQuaternion(dock.quaternion);
      const up=new T.Vector3(0,1,0).applyQuaternion(dock.quaternion);
      to.copy(dock.position).addScaledVector(forward,(dock.corridorLength??dock.corridor??35)+60).addScaledVector(up,30);
      updated.leg='';
    }
    updated.p=to.toArray();updated.riseLevel=to.length()-definition.radius+20;speedLimit=20;
  }else{
    const ll={lat:Math.atan2(position.y,Math.hypot(position.x,position.z)),lon:Math.atan2(-position.z,position.x)};
    const mapped=migrateSurfacePoint(ll,definition,record.version,oldRadius,record.surfaceLayout);
    rotation=voyageTangent(mapped.lat,mapped.lon).multiply(voyageTangent(ll.lat,ll.lon).invert());
    // Landed craft find current leg support on restore. Keep local flight
    // heights; only distant orbits from the larger worlds need compression.
    const height=record.phase==='landed'?Math.max(0,altitude):Math.max(0,
      altitude<=500||oldRadius===definition.radius?altitude:
        Math.min(definition.radius*6,500+(altitude-500)*Math.sqrt(definition.radius/oldRadius)));
    updated.p=voyageRadial(mapped.lat,mapped.lon).multiplyScalar(definition.radius+height).toArray();
    updated.riseLevel=oldRadius===definition.radius&&Number.isFinite(record.riseLevel)?record.riseLevel:height+20;
  }
  if(oldRadius!==definition.radius)updated.boostPower=0;
  rotateVoyageRecord(updated,record,rotation,speedLimit);
  return updated;
}
