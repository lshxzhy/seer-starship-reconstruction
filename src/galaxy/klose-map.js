// Survey coordinates in metres, projected from the same spherical world as walking and flight.
function kloseDisplacement(a,b){
  const delta=b.lon-a.lon,east=Math.cos(b.lat)*Math.sin(delta);
  const north=Math.cos(a.lat)*Math.sin(b.lat)-Math.sin(a.lat)*Math.cos(b.lat)*Math.cos(delta);
  const dot=Math.sin(a.lat)*Math.sin(b.lat)+Math.cos(a.lat)*Math.cos(b.lat)*Math.cos(delta);
  const bearing=Math.atan2(east,north),distance=KLOSE_WORLD.radius*Math.atan2(Math.hypot(east,north),dot);
  return {east:distance*Math.sin(bearing),north:distance*Math.cos(bearing),distance,bearing};
}
function kloseDistanceText(m){
  return m>=1000?(m/1000).toFixed(m>=10000?0:1)+' km':Math.round(m)+' m';
}
function kloseMapDestinations(){
  const {sites,landingSites}=KLOSE_WORLD;
  const classic=new Set(sites.map(site=>site.id));
  const outlands={ridge:'山脊之间的鞍部',delta:'能俯瞰河口水道的高岸',grove:'绯叶山林边缘的台地'};
  return [...sites,...landingSites.map(pad=>classic.has(pad.id)?
    {...pad,id:pad.id+'-pad',area:pad.id,description:'经典探索区旁的自然着陆坪'}:
    {...pad,area:'grassland',description:outlands[pad.id]||'外围自然着陆点'})];
}
function drawKloseMap(chart,{sites,selected,ramp,observer,flying=false,onSelect}){
  const home=KLOSE_WORLD.sites[0],places=ramp?[...sites,ramp]:sites;
  const points=new Map(places.map(p=>[p.id,kloseDisplacement(home,p)]));
  const regional=flying||points.get(selected)?.distance>800;
  const entries=places.filter(p=>{
    if(p.id===selected||p.id===home.id)return true;
    const d=points.get(p.id).distance;
    if(flying)return d>=900;
    if(p.id==='shuttle-ramp')return regional||d<=800;
    return regional?d>800:!p.area;
  });
  const east=entries.map(p=>points.get(p.id).east),north=entries.map(p=>points.get(p.id).north);
  const minE=Math.min(...east),maxE=Math.max(...east),minN=Math.min(...north),maxN=Math.max(...north);
  const scale=Math.min(365/Math.max(1,maxE-minE),190/Math.max(1,maxN-minN));
  const xy=p=>[240+(p.east-(minE+maxE)/2)*scale,133-(p.north-(minN+maxN)/2)*scale];
  function mark(tag,attrs,label=''){
    const el=document.createElementNS('http://www.w3.org/2000/svg',tag);
    for(const [key,value] of Object.entries(attrs))el.setAttribute(key,value);
    el.textContent=label;chart.append(el);return el;
  }
  chart.setAttribute('viewBox','0 0 480 284');chart.replaceChildren();
  for(let x=24;x<480;x+=32)mark('path',{d:'M'+x+',12v252',stroke:'#254349'});
  for(let y=20;y<270;y+=32)mark('path',{d:'M14,'+y+'h450',stroke:'#254349'});
  if(!regional)for(const [a,b] of KLOSE_WORLD.routes){
    const [x1,y1]=xy(points.get(a)),[x2,y2]=xy(points.get(b));
    mark('line',{x1,y1,x2,y2,stroke:'#69a69e','stroke-width':2,'stroke-dasharray':a==='vineway'||b==='vineway'?'4 3':'none'});
  }
  for(const site of entries){
    const [x,y]=xy(points.get(site.id)),chosen=selected===site.id;
    const dot=mark('circle',{cx:x,cy:y,r:chosen?6:4.3,fill:chosen?'#ffc973':'#92e5cb',stroke:'#102c31','stroke-width':2});
    const label=mark('text',{x,y:y+(site.id===home.id||site.id==='shuttle-ramp'?18:-9),'text-anchor':'middle'},site.name.replace(/^克洛斯星的?/,'')||site.name);
    for(const el of [dot,label]){
      el.setAttribute('data-klose-site',site.id);el.onclick=()=>onSelect(site.id);
    }
  }
  if(observer){
    const [cx,cy]=xy(kloseDisplacement(home,observer));
    if(cx>7&&cx<473&&cy>7&&cy<277)mark('circle',{cx,cy,r:8,fill:'none',stroke:'#ffad69','stroke-width':2,'pointer-events':'none'});
  }
  mark('text',{x:15,y:18},'↑ 北');mark('text',{x:14,y:274},'地面投影　／　'+kloseDistanceText(50/scale));
  mark('path',{d:'M16,250v5h50v-5',fill:'none',stroke:'#b7dace'});
}
