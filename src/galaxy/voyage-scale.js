// In v0.12 a location contained angles only. The classic walking districts
// kept their metre layouts, while the three Klose survey pads moved inward.
const previousPlanetRadius={klose:480000,ocean:410000};

function compactSurfacePoint(location,definition,oldRadius=previousPlanetRadius[definition.id]){
  if(!location||!Number.isFinite(location.lat)||!Number.isFinite(location.lon))return location;
  const current=definition.radius;
  if(current===oldRadius)return location;
  const home=definition.sites[0],cos=Math.cos(home.lat);
  const lonDelta=location.lon-home.lon;
  const x=Math.atan2(Math.sin(lonDelta),Math.cos(lonDelta))*oldRadius*cos,z=(home.lat-location.lat)*oldRadius;
  const distance=Math.hypot(x,z),ratio=current/oldRadius;
  const mix=(r,a,b,lo,hi)=>lo+(r-a)*(hi-lo)/(b-a);
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
  // Preserve the actual metre offset of the ramp, walker and gear on old pads.
  if(definition.id==='klose'&&distance>8000&&distance<35000){
    for(const site of definition.landingSites){
      if(site.id!=='ridge'&&site.id!=='delta'&&site.id!=='grove')continue;
      const dx=x-5*site.x,dz=z-5*site.z,near=Math.hypot(dx,dz);
      if(near>=200)continue;
      const weight=1-T.MathUtils.smoothstep(near,70,200);
      east+=(site.x+dx-east)*weight;south+=(site.z+dz-south)*weight;
      break;
    }
  }
  return {...location,lat:home.lat-south/current,lon:home.lon+east/(current*cos)};
}

function compactVehicleRecord(record,dock){
  if(!record||![1,2].includes(record.version))return record;
  const definition=record.planetId==='ocean'?OCEAN_WORLD:KLOSE_WORLD;
  const updated={...record,version:3,planetId:definition.id};
  const site=(value,body)=>{
    if(!value)return value;
    const named=body.landingSites.find(s=>s.id===value.id);
    return named?{...value,lat:named.lat,lon:named.lon}:compactSurfacePoint(value,body);
  };
  updated.target=site(record.target,definition);
  if(record.route?.site){
    const body=record.route.planet==='ocean'?OCEAN_WORLD:KLOSE_WORLD;
    updated.route={...record.route,site:site(record.route.site,body)};
  }
  // Interstellar coordinates are relative to the same moving planet centre.
  if(record.inTransit||!Array.isArray(record.p)||record.p.length!==3||!record.p.every(Number.isFinite))return updated;
  const position=new T.Vector3().fromArray(record.p),oldRadius=previousPlanetRadius[definition.id];
  if(position.length()<oldRadius*.99)return null;
  const altitude=position.length()-oldRadius;
  const ll={lat:Math.atan2(position.y,Math.hypot(position.x,position.z)),lon:Math.atan2(-position.z,position.x)};
  const radial=(lat,lon)=>new T.Vector3(Math.cos(lat)*Math.cos(lon),Math.sin(lat),-Math.cos(lat)*Math.sin(lon));
  let rotation=new T.Quaternion();
  if(definition.id==='klose'&&dock&&altitude>140000&&altitude<150000){
    // The terrain sampler in v0.12 placed the carrier and meadow at these heights.
    const home=definition.sites[0];
    const formerCentre=radial(home.lat+.18,home.lon+.05).multiplyScalar(oldRadius+145000+795.707971);
    if(position.distanceTo(formerCentre)<3500){
      const formerHome=radial(home.lat,home.lon).multiplyScalar(oldRadius+120.350081);
      rotation=dock.quaternion.clone().multiply(carrierOrientation(T,formerCentre,formerHome).invert());
      updated.p=position.sub(formerCentre).applyQuaternion(rotation).add(dock.root.position).toArray();
    }
  }
  if(updated.p===record.p){
    const mapped=compactSurfacePoint(ll,definition);
    const weight=record.phase==='landed'?1:1-T.MathUtils.smoothstep(altitude,1500,30000);
    const up=radial(ll.lat+(mapped.lat-ll.lat)*weight,ll.lon+(mapped.lon-ll.lon)*weight);
    rotation.setFromUnitVectors(position.clone().normalize(),up);
    updated.p=up.multiplyScalar(definition.radius+altitude).toArray();
  }
  for(const field of ['v','heading'])
    if(Array.isArray(record[field])&&record[field].length===3)updated[field]=new T.Vector3().fromArray(record[field]).applyQuaternion(rotation).toArray();
  if(Array.isArray(record.q)&&record.q.length===4)updated.q=rotation.multiply(new T.Quaternion().fromArray(record.q)).normalize().toArray();
  return updated;
}
