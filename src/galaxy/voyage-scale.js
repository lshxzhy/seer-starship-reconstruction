// Unmarked v3 saves used the 48 km-class planets. New saves carry radius.
const previousPlanetRadius={klose:480000,ocean:410000};
const previousCompactPlanetRadius={klose:48000,ocean:41000,alpha:38000,beta:35000};
const previousKlosePads={ridge:[2880,-1480],delta:[-2720,-2940],grove:[4500,1980]};
const compactVoyageSystemScale=1/60;

function voyageRadial(lat,lon){
  return new T.Vector3(Math.cos(lat)*Math.cos(lon),Math.sin(lat),-Math.cos(lat)*Math.sin(lon));
}
function voyageCoordinates(lat,lon){
  const c=Math.cos(lat);
  return {lat:Math.atan2(Math.sin(lat),Math.abs(c)),lon:Math.atan2(Math.sin(lon)*c,Math.cos(lon)*c)};
}
function previousVoyageDefinition(definition){
  const radius=previousCompactPlanetRadius[definition.id]||definition.radius,home=definition.sites[0];
  return {...definition,radius,landingSites:(definition.landingSites||[]).map(site=>{
    const [x,z]=definition.id==='klose'&&previousKlosePads[site.id]||[site.x,site.z];
    return {...site,x,z,lat:home.lat-z/radius,lon:home.lon+x/(radius*Math.cos(home.lat))};
  })};
}

// Original 480/410 km -> 48/41 km step. Its definition retains the old pads.
function legacyCompactSurfacePoint(location,definition,oldRadius){
  if(!location||!Number.isFinite(location.lat)||!Number.isFinite(location.lon)||!Number.isFinite(oldRadius))return location;
  const current=definition.radius;if(current===oldRadius)return location;
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
    for(const site of definition.landingSites){
      if(!previousKlosePads[site.id])continue;
      const dx=x-5*site.x,dz=z-5*site.z,near=Math.hypot(dx,dz);
      if(near>=200)continue;
      const weight=1-T.MathUtils.smoothstep(near,70,200);
      east+=(site.x+dx-east)*weight;south+=(site.z+dz-south)*weight;break;
    }
  }
  return {...location,...voyageCoordinates(home.lat-south/current,home.lon+east/(current*cos))};
}

function compactSurfacePoint(location,definition,oldRadius=previousCompactPlanetRadius[definition.id]){
  if(!location||!Number.isFinite(location.lat)||!Number.isFinite(location.lon)||
      !Number.isFinite(oldRadius)||oldRadius<=0||!previousCompactPlanetRadius[definition.id]||definition.kind==='ship')return location;
  const current=definition.radius,prior=previousCompactPlanetRadius[definition.id];
  if(oldRadius===current)return location;
  if(definition.id==='alpha'||definition.id==='beta'){
    const home=definition.sites[0],d=location.lon-home.lon,c=Math.cos(location.lat),s=Math.sin(location.lat);
    const east=c*Math.sin(d),north=Math.cos(home.lat)*s-Math.sin(home.lat)*c*Math.cos(d);
    const dot=Math.sin(home.lat)*s+Math.cos(home.lat)*c*Math.cos(d),length=Math.hypot(east,north);
    const factor=length>1e-12?oldRadius*Math.atan2(length,dot)/length:oldRadius;
    return {...location,...twinMove(current,home.lat,home.lon,east*factor,north*factor)};
  }
  if(oldRadius>prior){
    location=legacyCompactSurfacePoint(location,previousVoyageDefinition(definition),oldRadius);
    oldRadius=prior;
  }
  const home=definition.sites[0],cos=Math.cos(home.lat),lonDelta=location.lon-home.lon;
  const x=Math.atan2(Math.sin(lonDelta),Math.cos(lonDelta))*oldRadius*cos,z=(home.lat-location.lat)*oldRadius;
  const distance=Math.hypot(x,z),ratio=current/oldRadius;
  // Preserve classic metre plans and local offsets beside relocated tail ramps.
  const r=distance<=500?distance:500+(distance-500)*ratio,factor=distance?r/distance:1;
  let east=x*factor,south=z*factor;
  if(definition.id==='klose')for(const site of definition.landingSites||[]){
    const old=previousKlosePads[site.id];if(!old)continue;
    const dx=x-old[0],dz=z-old[1],near=Math.hypot(dx,dz);if(near>=200)continue;
    const weight=1-T.MathUtils.smoothstep(near,70,200);
    east+=(site.x+dx-east)*weight;south+=(site.z+dz-south)*weight;break;
  }
  return {...location,...voyageCoordinates(home.lat-south/current,home.lon+east/(current*cos))};
}


function formerVoyageDock(definition,radius,dock){
  if(definition.id!=='klose'||!dock)return null;
  const home=definition.sites[0];
  // The old 480 km sample is retained as an approximate station datum for
  // unmarked saves. Docked saves use the exact new berth; airborne saves
  // below are checked against the actual new hull before they are accepted.
  const center=voyageRadial(home.lat+.18,home.lon+.05).multiplyScalar(radius+145000+795.707971);
  const surface=voyageRadial(home.lat,home.lon).multiplyScalar(radius+120.350081);
  const quaternion=carrierOrientation(T,center,surface);
  return {root:{position:center},quaternion};
}
function rotateVoyageRecord(updated,source,rotation,speedLimit){
  for(const field of ['v','heading'])if(Array.isArray(source[field])&&source[field].length===3&&source[field].every(Number.isFinite)){
    const vector=new T.Vector3().fromArray(source[field]).applyQuaternion(rotation);
    if(field==='v'&&Number.isFinite(speedLimit))vector.clampLength(0,speedLimit);
    updated[field]=vector.toArray();
  }
  if(Array.isArray(source.q)&&source.q.length===4&&source.q.every(Number.isFinite))
    updated.q=rotation.clone().multiply(new T.Quaternion().fromArray(source.q)).normalize().toArray();
}

function legacyVehicleToCompact(record,definition,dock){
  const prior=previousVoyageDefinition(definition),oldRadius=previousPlanetRadius[definition.id];
  const updated={...record,version:3,planetId:definition.id,planetRadius:prior.radius};
  if(record.inTransit||!oldRadius||!Array.isArray(record.p)||record.p.length!==3||!record.p.every(Number.isFinite))return updated;
  const position=new T.Vector3().fromArray(record.p);if(position.length()<oldRadius*.99)return null;
  const altitude=position.length()-oldRadius,from=formerVoyageDock(definition,oldRadius,dock),to=formerVoyageDock(definition,prior.radius,dock);
  const rotation=new T.Quaternion();
  if(from&&position.distanceTo(from.root.position)<3500){
    rotation.copy(to.quaternion).multiply(from.quaternion.clone().invert());
    updated.p=position.sub(from.root.position).applyQuaternion(rotation).add(to.root.position).toArray();
  }else{
    const ll={lat:Math.atan2(position.y,Math.hypot(position.x,position.z)),lon:Math.atan2(-position.z,position.x)};
    const mapped=legacyCompactSurfacePoint(ll,prior,oldRadius);
    const weight=record.phase==='landed'?1:1-T.MathUtils.smoothstep(altitude,1500,30000);
    const up=voyageRadial(ll.lat+(mapped.lat-ll.lat)*weight,ll.lon+(mapped.lon-ll.lon)*weight);
    rotation.setFromUnitVectors(position.clone().normalize(),up);
    updated.p=up.multiplyScalar(prior.radius+altitude).toArray();
  }
  rotateVoyageRecord(updated,record,rotation);return updated;
}

function compactVehicleRecord(record,dock){
  if(!record||![1,2,3].includes(record.version))return record;
  const definition=PANO_NAVIGATION.regions[record.planetId]?.definition||KLOSE_WORLD,original=record;
  if(record.version!==3){record=legacyVehicleToCompact(record,definition,dock);if(!record)return null;}
  const oldRadius=Number.isFinite(record.planetRadius)&&record.planetRadius>0?record.planetRadius:previousCompactPlanetRadius[definition.id];
  const changed=Number.isFinite(oldRadius)&&oldRadius!==definition.radius&&definition.kind!=='ship';
  const updated={...record,version:3,planetId:definition.id,planetRadius:definition.radius,systemScale:compactVoyageSystemScale};
  const site=(value,body,radius)=>{
    if(!value)return value;
    const named=(body.landingSites||[]).find(s=>s.id===value.id);
    return named?{...value,lat:named.lat,lon:named.lon}:compactSurfacePoint(value,body,radius);
  };
  updated.target=site(original.target,definition,original.version===3?oldRadius:previousPlanetRadius[definition.id]);
  if(original.route?.site){
    const body=PANO_NAVIGATION.regions[original.route.planet]?.definition||KLOSE_WORLD;
    const routeRadius=Number.isFinite(original.route.planetRadius)?original.route.planetRadius:
      original.version===3?previousCompactPlanetRadius[body.id]:previousPlanetRadius[body.id];
    updated.route={...original.route,planetRadius:body.radius,site:site(original.route.site,body,routeRadius)};
  }
  if(record.inTransit){
    // This position is relative to its orbital reference centre. Compress
    // that vector by the orbital scale change, even for an unchanged Byron
    // hull. The independent marker prevents shrinking a fresh save twice.
    const oldSystemScale=Number.isFinite(record.systemScale)&&record.systemScale>0?record.systemScale:1;
    if(oldSystemScale!==compactVoyageSystemScale){
      const factor=compactVoyageSystemScale/oldSystemScale;
      for(const field of ['p','v'])if(Array.isArray(record[field])&&record[field].length===3&&record[field].every(Number.isFinite)){
        const vector=new T.Vector3().fromArray(record[field]).multiplyScalar(factor);
        if(field==='v')vector.clampLength(0,800);
        updated[field]=vector.toArray();
      }
      updated.boostPower=0;updated.tour=[];updated.tourIndex=0;
    }
    return updated;
  }
  if(!changed)return updated;
  updated.boostPower=0;updated.tour=[];updated.tourIndex=0;
  if(record.phase==='docked'&&dock){
    updated.planetId='klose';updated.planetRadius=KLOSE_WORLD.radius;
    updated.p=dock.position.toArray();updated.q=dock.quaternion.toArray();updated.v=[0,0,0];
    updated.heading=new T.Vector3(0,0,-1).applyQuaternion(dock.quaternion).toArray();return updated;
  }
  if(!Array.isArray(record.p)||record.p.length!==3||!record.p.every(Number.isFinite))return updated;
  const position=new T.Vector3().fromArray(record.p);if(position.length()<oldRadius*.99)return null;
  const altitude=position.length()-oldRadius,former=formerVoyageDock(definition,oldRadius,dock),rotation=new T.Quaternion();
  let speedLimit=180;
  if(former&&position.distanceTo(former.root.position)<3500){
    rotation.copy(dock.quaternion).multiply(former.quaternion.clone().invert());
    updated.p=position.sub(former.root.position).applyQuaternion(rotation).add(dock.root.position).toArray();
    const migrated=new T.Vector3().fromArray(updated.p);
    if(dock.isBlocked?.(migrated)){
      const forward=new T.Vector3(0,0,-1).applyQuaternion(dock.quaternion);
      const up=new T.Vector3(0,1,0).applyQuaternion(dock.quaternion);
      migrated.copy(dock.position).addScaledVector(forward,(dock.corridorLength??dock.corridor??35)+60).addScaledVector(up,30);
      updated.p=migrated.toArray();updated.leg='';
    }
    updated.riseLevel=new T.Vector3().fromArray(updated.p).length()-definition.radius+20;
    speedLimit=20;
  }else{
    const ll={lat:Math.atan2(position.y,Math.hypot(position.x,position.z)),lon:Math.atan2(-position.z,position.x)};
    const mapped=compactSurfacePoint(ll,definition,oldRadius),up=voyageRadial(mapped.lat,mapped.lon);
    rotation.setFromUnitVectors(position.clone().normalize(),up);
    // Retain low-flight height, but safely bring old high orbits and speeds
    // into the compact world. Landed craft resolve gear support on restore.
    const height=record.phase==='landed'?Math.max(0,altitude):Math.max(45,
      altitude<=500?altitude:Math.min(definition.radius*6,500+(altitude-500)*Math.sqrt(definition.radius/oldRadius)));
    updated.p=up.multiplyScalar(definition.radius+height).toArray();
    updated.riseLevel=height+20;
  }
  rotateVoyageRecord(updated,record,rotation,speedLimit);return updated;
}
