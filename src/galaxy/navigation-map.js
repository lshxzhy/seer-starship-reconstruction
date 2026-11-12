// Survey coordinates in metres, projected from the same spherical world as walking and flight.
function surfaceDisplacement(a,b,radius){
  const delta=b.lon-a.lon,east=Math.cos(b.lat)*Math.sin(delta);
  const north=Math.cos(a.lat)*Math.sin(b.lat)-Math.sin(a.lat)*Math.cos(b.lat)*Math.cos(delta);
  const dot=Math.sin(a.lat)*Math.sin(b.lat)+Math.cos(a.lat)*Math.cos(b.lat)*Math.cos(delta);
  const bearing=Math.atan2(east,north),distance=radius*Math.atan2(Math.hypot(east,north),dot);
  return {east:distance*Math.sin(bearing),north:distance*Math.cos(bearing),distance,bearing};
}
function formatNavDistance(m){
  return m>=1000?(m/1000).toFixed(m>=10000?0:1)+' km':Math.round(m)+' m';
}
function surfaceArrivalRadius(id){return id==='shuttle-ramp'?1.65:9;}
// Wreck locations store deck metres in scaled chart coordinates so saved
// positions have the same shape as planetary positions. Its decks are flat.
function navigationDisplacement(a,b,world){
  if(world.kind!=='ship')return surfaceDisplacement(a,b,world.radius);
  const east=(b.lon-a.lon)*world.chartScale,north=(b.lat-a.lat)*world.chartScale;
  return {east,north,distance:Math.hypot(east,north),bearing:Math.atan2(east,north)};
}
function createPlanetNavigation(definitions){
  const regions={},flights=new Map([['dock',{id:'dock',planetId:'klose',name:'赛尔号泊位'}]]);
  const outlands={ridge:'山脊之间的鞍部',delta:'能俯瞰河口水道的高岸',grove:'绯叶山林边缘的台地'};
  for(const definition of definitions){
    const {sites,landingSites,routes}=definition;
    const byId=new Map(sites.map(site=>[site.id,site]));
    const walkingLinks=[...routes],pads=[],outlying=[];
    for(const pad of landingSites){
      flights.set(pad.id,{...pad,planetId:definition.id});
      const sharesAddress=byId.has(pad.id);
      const district=sharesAddress?byId.get(pad.id):sites.reduce((best,site)=>
        Math.hypot(site.x-pad.x,site.z-pad.z)<Math.hypot(best.x-pad.x,best.z-pad.z)?site:best,sites[0]);
      const local=sharesAddress||Math.hypot(district.x-pad.x,district.z-pad.z)<100;
      // The walking address and the flight address must remain distinct even
      // when the original scene and its landing pad share an id.
      const place=local?{...pad,id:sharesAddress?pad.id+'-pad':pad.id,area:district.id,description:pad.description||'探索区旁的着陆坪'}:
        {...pad,area:sites[0].id,description:pad.description||outlands[pad.id]||'外围自然着陆点'};
      byId.set(place.id,place);walkingLinks.push([place.area,place.id]);
      (local?pads:outlying).push(place);
    }
    const vessel=definition.kind==='ship';
    regions[definition.id]={definition,byId,places:[...byId.values()],walkingLinks,
      groups:[[vessel?'舰上区域':'经典探索区',sites],['外围地形',outlying],[vessel?'接驳区':'探索区着陆坪',pads]]};
  }
  return {regions,flights};
}
function rampOnPlanet(ramp,planetId){
  return ramp&&(ramp.planetId||KLOSE_WORLD.id)===planetId?ramp:null;
}
function appendSurfaceOptions(select,region,ramp){
  for(const [label,places] of region.groups){
    if(!places.length)continue;
    const group=document.createElement('optgroup');group.label=label;
    for(const place of places)group.append(new Option(place.name,place.id));
    select.append(group);
  }
  if(ramp)select.add(new Option('L-01 · 登陆艇尾坡',ramp.id));
}
function drawSurfaceMap(chart,{region,selected,ramp,observer,route=[],onSelect}){
  const {definition,places:sites}=region;
  const home=definition.sites[0],places=ramp?[...sites,ramp]:sites;
  const offset=p=>navigationDisplacement(home,p,definition);
  const points=new Map(places.map(p=>[p.id,offset(p)]));
  const regional=points.get(selected)?.distance>800;
  const entries=places.filter(p=>{
    if(p.id===selected||p.id===home.id||route.includes(p.id))return true;
    const d=points.get(p.id).distance;
    if(p.id==='shuttle-ramp')return regional||d<=800;
    return regional?d>800:!p.area;
  });
  const bounds=entries.map(p=>points.get(p.id));
  if(observer)bounds.push(offset(observer));
  const east=bounds.map(p=>p.east),north=bounds.map(p=>p.north);
  const minE=Math.min(...east),maxE=Math.max(...east),minN=Math.min(...north),maxN=Math.max(...north);
  const width=chart.clientWidth||480,height=chart.clientHeight||284;
  const scale=Math.min(Math.max(1,width-96)/Math.max(1,maxE-minE),Math.max(1,height-65)/Math.max(1,maxN-minN));
  const xy=p=>[width/2+(p.east-(minE+maxE)/2)*scale,height/2-3-(p.north-(minN+maxN)/2)*scale];
  function mark(tag,attrs,label=''){
    const el=document.createElementNS('http://www.w3.org/2000/svg',tag);
    for(const [key,value] of Object.entries(attrs))el.setAttribute(key,value);
    el.textContent=label;chart.append(el);return el;
  }
  chart.setAttribute('viewBox',`0 0 ${width} ${height}`);chart.replaceChildren();
  if(!regional)for(const [a,b] of definition.routes){
    const [x1,y1]=xy(points.get(a)),[x2,y2]=xy(points.get(b));
    mark('line',{x1,y1,x2,y2,stroke:'#69a69e','stroke-width':2,'stroke-dasharray':a==='vineway'||b==='vineway'?'4 3':'none'});
  }
  if(observer&&route.length){
    const preview=[offset(observer),...route.map(id=>points.get(id)).filter(Boolean)];
    mark('polyline',{points:preview.map(p=>xy(p).join(',')).join(' '),fill:'none',stroke:'#ffc973',
      'stroke-width':2.6,'stroke-dasharray':'5 3','pointer-events':'none'});
  }
  for(const site of entries){
    const [x,y]=xy(points.get(site.id)),chosen=selected===site.id;
    mark('circle',{cx:x,cy:y,r:chosen?6:4.3,fill:chosen?'#ffc973':'#92e5cb',stroke:'#102c31','stroke-width':2});
    const hit=mark('circle',{cx:x,cy:y,r:10,fill:'transparent'});
    const name=site.name.startsWith(definition.name)?site.name.slice(definition.name.length).replace(/^的/,''):site.name;
    const label=mark('text',{x,y:y+(site.id===home.id||site.id==='shuttle-ramp'?18:-9),'text-anchor':'middle'},name||site.name);
    for(const el of [hit,label]){
      el.setAttribute('data-klose-site',site.id);el.onclick=()=>onSelect(site.id);
    }
  }
  if(observer){
    const [cx,cy]=xy(offset(observer));
    mark('circle',{cx,cy,r:8,fill:'none',stroke:'#71ffbf','stroke-width':2.4,'pointer-events':'none'});
  }
  mark('text',{x:12,y:17},'↑ 北');mark('text',{x:12,y:height-8},formatNavDistance(50/scale));
  mark('path',{d:`M12,${height-26}v4h50v-4`,fill:'none',stroke:'#b7dace'});
}
