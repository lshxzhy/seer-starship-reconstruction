// In v0.12 a location contained angles only. The classic walking districts
// kept their metre layouts, while the three Klose survey pads moved inward.
const previousPlanetRadius={klose:480000,ocean:410000};

function compactLegacyPoint(location,definition,oldRadius=previousPlanetRadius[definition.id]){
  if(!location||!Number.isFinite(location.lat)||!Number.isFinite(location.lon))return location;
  const current=definition.previousRadius||definition.radius;
  if(!Number.isFinite(oldRadius)||current===oldRadius)return location;
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

// Version 4 records retain the old stable place ids. Only physical positions
// move: a visitor's offset within a district is carried into that district's
// new spherical anchor. Arbitrary wilderness positions retain their angles.
function migrateSurfacePoint(location,definition,format=3){
  if(!location||!Number.isFinite(location.lat)||!Number.isFinite(location.lon)||!definition.layout||format>=4)return location;
  if(format<3)return compactSurfacePoint(location,definition);
  const oldRadius=definition.previousRadius,home=definition.sites[0];
  if(!oldRadius)return location;
  let x,z;
  if(definition.id==='alpha'||definition.id==='beta'){
    const d=surfaceDisplacement(home,location,oldRadius);x=d.east;z=-d.north;
  }else{
    const delta=location.lon-home.lon;x=Math.atan2(Math.sin(delta),Math.cos(delta))*oldRadius*Math.cos(home.lat);
    z=(home.lat-location.lat)*oldRadius;
  }
  const region=definition.layout.source(x,z),distance=Math.min(...region.members.map(s=>Math.hypot(x-s.x,z-s.z)));
  if(distance>550)return {...location};
  return {...location,...definition.layout.fromXZ(x,z,region)};
}

function compactSurfacePoint(location,definition,oldRadius=previousPlanetRadius[definition.id]){
  return migrateSurfacePoint(compactLegacyPoint(location,definition,oldRadius),definition,3);
}

let formerKloseTerrain=null;
function previousKloseHeight(lat,lon){
  if(!formerKloseTerrain){
    const oldRadius=KLOSE_WORLD.previousRadius,home=KLOSE_WORLD.sites[0];
    const fromXZ=(x,z)=>({lat:home.lat-z/oldRadius,lon:home.lon+x/(oldRadius*Math.cos(home.lat))});
    const chart=(a,b)=>({x:Math.atan2(Math.sin(b-home.lon),Math.cos(b-home.lon))*oldRadius*Math.cos(home.lat),z:(home.lat-a)*oldRadius});
    formerKloseTerrain=createKloseTerrain(T,{...KLOSE_WORLD,radius:oldRadius,
      sites:KLOSE_WORLD.sites.map(s=>({...s,...fromXZ(s.x,s.z)})),
      landingSites:KLOSE_WORLD.landingSites.map(s=>({...s,...fromXZ(s.x,s.z)})),layout:{chart,fromXZ,detail:()=>1}});
  }
  return formerKloseTerrain.height(lat,lon);
}

function compactVehicleRecord(record,dock){
  if(!record||![1,2,3].includes(record.version))return record;
  const definition=PANO_NAVIGATION.regions[record.planetId]?.definition||KLOSE_WORLD;
  const updated={...record,version:4,planetId:definition.id};
  const site=(value,body)=>{
    if(!value)return value;
    const named=body.landingSites.find(s=>s.id===value.id)||body.sites.find(s=>s.id===value.id);
    return named?{...value,lat:named.lat,lon:named.lon}:migrateSurfacePoint(value,body,record.version);
  };
  updated.target=site(record.target,definition);
  if(record.route?.site){
    const body=PANO_NAVIGATION.regions[record.route.planet]?.definition||KLOSE_WORLD;
    updated.route={...record.route,site:site(record.route.site,body)};
  }
  // Interstellar coordinates are relative to the same moving planet centre.
  if(record.inTransit||!definition.layout||
     !Array.isArray(record.p)||record.p.length!==3||!record.p.every(Number.isFinite))return updated;
  const position=new T.Vector3().fromArray(record.p),oldRadius=record.version===3?
    definition.previousRadius:previousPlanetRadius[definition.id]||definition.previousRadius;
  if(position.length()<oldRadius*.94)return null;
  const altitude=position.length()-oldRadius;
  const ll={lat:Math.atan2(position.y,Math.hypot(position.x,position.z)),lon:Math.atan2(-position.z,position.x)};
  const radial=(lat,lon)=>new T.Vector3(Math.cos(lat)*Math.cos(lon),Math.sin(lat),-Math.cos(lat)*Math.sin(lon));
  let rotation=new T.Quaternion();
  if(definition.id==='klose'&&dock&&altitude>140000&&altitude<150000){
    // The terrain sampler in v0.12 placed the carrier and meadow at these heights.
    const home=definition.sites[0];
    const formerHeight=record.version===3?previousKloseHeight(home.lat+.18,home.lon+.05):795.707971;
    const formerCentre=radial(home.lat+.18,home.lon+.05).multiplyScalar(oldRadius+145000+formerHeight);
    if(position.distanceTo(formerCentre)<3500){
      const formerHome=radial(home.lat,home.lon).multiplyScalar(oldRadius+(record.version===3?previousKloseHeight(home.lat,home.lon):120.350081));
      rotation=dock.quaternion.clone().multiply(carrierOrientation(T,formerCentre,formerHome).invert());
      updated.p=position.sub(formerCentre).applyQuaternion(rotation).add(dock.root.position).toArray();
    }
  }
  if(updated.p===record.p){
    const mapped=migrateSurfacePoint(ll,definition,record.version);
    const weight=record.phase==='landed'?1:1-T.MathUtils.smoothstep(altitude,1500,30000);
    const delta=Math.atan2(Math.sin(mapped.lon-ll.lon),Math.cos(mapped.lon-ll.lon));
    const to={lat:ll.lat+(mapped.lat-ll.lat)*weight,lon:ll.lon+delta*weight},up=radial(to.lat,to.lon);
    const tangent=(lat,lon)=>{
      const east=new T.Vector3(-Math.sin(lon),0,-Math.cos(lon)),normal=radial(lat,lon),south=east.clone().cross(normal);
      return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(east,normal,south));
    };
    rotation.copy(tangent(to.lat,to.lon)).multiply(tangent(ll.lat,ll.lon).invert());
    updated.p=up.multiplyScalar(definition.radius+altitude).toArray();
  }
  for(const field of ['v','heading'])
    if(Array.isArray(record[field])&&record[field].length===3)updated[field]=new T.Vector3().fromArray(record[field]).applyQuaternion(rotation).toArray();
  if(Array.isArray(record.q)&&record.q.length===4)updated.q=rotation.multiply(new T.Quaternion().fromArray(record.q)).normalize().toArray();
  return updated;
}
