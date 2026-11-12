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
  const added=new Set();
  for(const [label,places] of region.groups){
    if(!places.length)continue;
    const group=document.createElement('optgroup');group.label=label;
    for(const place of places){
      if(!region.byId.has(place.id)||added.has(place.id))continue;
      group.append(new Option(place.name,place.id));added.add(place.id);
    }
    select.append(group);
  }
  for(const place of region.byId.values())if(!added.has(place.id))select.add(new Option(place.name,place.id));
  if(ramp)select.add(new Option('L-01 · 登陆艇尾坡',ramp.id));
}
function mapMark(parent,tag,attributes,words){
  const element=document.createElementNS('http://www.w3.org/2000/svg',tag);
  for(const [key,value] of Object.entries(attributes))element.setAttribute(key,value);
  if(words!==undefined)element.textContent=words;
  parent.append(element);return element;
}
function revealMapAddress(chart,id){
  const label=Array.from(chart.querySelectorAll('[data-nav-label][role="button"]')).find(el=>el.dataset.navLabel===id);
  if(!label)return;
  const clip=chart.parentElement,frame=clip.getBoundingClientRect(),rect=label.getBoundingClientRect();
  if(rect.top<frame.top+4)clip.scrollTop+=rect.top-frame.top-4;
  else if(rect.bottom>frame.bottom-4)clip.scrollTop+=rect.bottom-frame.bottom+4;
}

// Fixed label columns keep hit areas separate even if two addresses share a berth.
// Geometry remains at its surveyed position. Each label leads back to that point.
const mapLabelFont='600 13px "Microsoft YaHei", sans-serif';
let mapLabelMeasure;
function mapLabelColumns(nodes,width,preferredHeight,top=14,bottom=14){
  const rail=Math.max(58,Math.min(174,Math.floor(width*.26))),gap=5,lineHeight=16;
  mapLabelMeasure??=document.createElement('canvas').getContext('2d');
  mapLabelMeasure.font=mapLabelFont;
  const sorted=[...nodes].sort((a,b)=>a.mapX-b.mapX||a.mapY-b.mapY);
  const left=sorted.slice(0,Math.ceil(sorted.length/2)),right=sorted.slice(left.length);
  let height=preferredHeight;
  const columns=[left,right].map(column=>{
    const rows=column.sort((a,b)=>a.mapY-b.mapY).map(node=>{
      const lines=[];let line='';
      for(const ch of node.name){
        if(line&&mapLabelMeasure.measureText(line+ch).width>rail-15){lines.push(line);line='';}
        line+=ch;
      }
      lines.push(line);
      return {node,lines,h:Math.max(24,lines.length*lineHeight+6)};
    });
    height=Math.max(height,top+bottom+rows.reduce((n,r)=>n+r.h+gap,0));
    return rows;
  });
  function draw(parent,project,select,chosen,attribute){
    for(const [side,rows] of columns.entries()){
      const x=side?width-rail-3:3,edge=side?x:x+rail;
      let end=top;
      for(const row of rows){
        row.point=project(row.node);
        row.y=Math.max(end,row.point[1]-row.h/2);end=row.y+row.h+gap;
      }
      end=height-bottom;
      for(let i=rows.length-1;i>=0;i--){
        const row=rows[i];row.y=Math.min(row.y,end-row.h);end=row.y-gap;
      }
      for(const row of rows){
        const {node,h,y,point:[px,py]}=row,active=chosen===node.id,cy=y+h/2;
        const colour=active?'#ffe19c':node.colour||'#a0d2d9';
        mapMark(parent,'path',{d:'M'+edge+' '+cy+' L'+(edge+(side?-6:6))+' '+cy+' L'+px+' '+py,
          stroke:colour,'stroke-opacity':active?.85:.44,'stroke-width':active?1.6:1,fill:'none','pointer-events':'none'});
      }
      for(const {node,lines,h,y} of rows){
        const active=chosen===node.id,pickable=node.selectable!==false;
        const attrs={'data-nav-label':node.id,'aria-label':node.fullName||node.name};
        if(pickable)Object.assign(attrs,{role:'button',tabindex:0,'aria-pressed':String(active),[attribute]:node.id});
        const g=mapMark(parent,'g',attrs);
        mapMark(g,'title',{},node.fullName||node.name);
        mapMark(g,'rect',{x,y,width:rail,height:h,rx:4,fill:active?'#294b48':'#102d37',
          stroke:active?'#f7d58d':node.colour||'#476c74','stroke-width':active?1.6:1});
        const text=mapMark(g,'text',{x:x+7,y:y+(h-lines.length*lineHeight)/2+13,'class':'nav-map-label'});
        for(const [i,line] of lines.entries())mapMark(text,'tspan',{x:x+7,dy:i?lineHeight:0},line);
        if(pickable){
          g.onclick=()=>select(node.id);
          g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(node.id);}};
        }
      }
    }
  }
  return {rail,height,draw};
}

function drawSurfaceMap(chart,{region,selected,ramp,observer,route=[],onSelect,flightOnly=false}){
  const {definition}=region;
  const places=flightOnly?definition.landingSites:ramp?[...region.byId.values(),ramp]:[...region.byId.values()];
  const home=flightOnly?places[0]:definition.sites[0];
  const offset=p=>navigationDisplacement(home,p,definition);
  const positions=new Map(places.map(p=>[p.id,offset(p)]));
  const outlyingIds=new Set((region.groups.find(([name])=>name==='外围地形')?.[1]||[]).map(p=>p.id));
  const districtRadius=Math.max(800,...places.filter(p=>!outlyingIds.has(p.id)&&p!==ramp).map(p=>positions.get(p.id).distance));
  if(ramp&&positions.get(ramp.id).distance>districtRadius)outlyingIds.add(ramp.id);
  const observerPos=observer?offset(observer):null;
  const observerOutside=observerPos&&observerPos.distance>districtRadius*1.5;
  const district=places.filter(p=>!outlyingIds.has(p.id)),outlying=places.filter(p=>outlyingIds.has(p.id));
  // Show both distances at once. The regional overview has a common anchor in
  // the district, so far-away landing sites never collapse the local street plan.
  const sections=[];
  if(district.length)sections.push({name:flightOnly?'着陆点':definition.kind==='ship'?'舰区':'探索区',places:district,observer:!observerOutside});
  if(outlying.length||observerOutside)sections.push({name:'外围全图',places:[home,...outlying.filter(p=>p!==home)],observer:true});
  const clip=chart.parentElement,width=clip.clientWidth||500,viewport=clip.clientHeight||340;
  const focused=chart.contains(document.activeElement)?document.activeElement.getAttribute('data-nav-label'):null;
  chart.replaceChildren();let used=0;
  for(const [index,section] of sections.entries()){
    const g=mapMark(chart,'g',{transform:'translate(0,'+used+')'});
    const nodes=section.places.map(site=>{
      const p=positions.get(site.id);
      const short=site.name.startsWith(definition.name)?site.name.slice(definition.name.length).replace(/^[的 ·]+/,''):site.name;
      const anchor=index>0&&site===home;
      return {id:site.id,name:anchor?'探索区方向':short||site.name,fullName:site.name,mapX:p.east,mapY:-p.north,selectable:!anchor,
        colour:site===ramp?'#e9cc86':site.area?'#86a9c7':'#79caba'};
    });
    const layout=mapLabelColumns(nodes,width,index?Math.max(210,viewport*.68):viewport,29,30);
    const points=nodes.map(n=>[n.mapX,n.mapY]);
    if(section.observer&&observerPos)points.push([observerPos.east,-observerPos.north]);
    const xs=points.map(([x])=>x),ys=points.map(([,y])=>y);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const scale=Math.min(Math.max(12,width-2*layout.rail-34)/Math.max(1,maxX-minX),
      Math.max(20,layout.height-92)/Math.max(1,maxY-minY));
    const project=({mapX,mapY})=>[width/2+(mapX-(minX+maxX)/2)*scale,layout.height/2+(mapY-(minY+maxY)/2)*scale];
    const lookup=new Map(nodes.map(n=>[n.id,n]));
    mapMark(g,'text',{x:9,y:18},section.name+'　↑ 北');
    if(sections.length>1){
      const link=mapMark(g,'g',{role:'button',tabindex:0,'aria-label':index?'返回探索区':'查看外围全图',style:'cursor:pointer'});
      mapMark(link,'rect',{x:width-98,y:0,width:96,height:27,fill:'transparent'});
      mapMark(link,'text',{x:width-9,y:18,'text-anchor':'end'},index?'↑ 探索区':'外围全图 ↓');
      const nextScroll=index?0:layout.height;
      link.onclick=()=>{clip.scrollTop=nextScroll;};
      link.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();link.onclick();}};
    }
    for(const [a,b] of flightOnly?[]:region.walkingLinks){
      if(!lookup.has(a)||!lookup.has(b))continue;
      const [x1,y1]=project(lookup.get(a)),[x2,y2]=project(lookup.get(b));
      mapMark(g,'line',{x1,y1,x2,y2,stroke:'#69a69e','stroke-width':1.8,'stroke-dasharray':region.byId.get(b)?.area?'4 3':'none'});
    }
    const projectedObserver=observerPos&&project({mapX:observerPos.east,mapY:-observerPos.north});
    const itinerary=route.map(id=>lookup.get(id));
    if(section.observer&&projectedObserver)itinerary.unshift({point:projectedObserver});
    for(let i=1;i<itinerary.length;i++){
      const a=itinerary[i-1],b=itinerary[i];if(!a||!b)continue;
      const [x1,y1]=a.point||project(a),[x2,y2]=project(b);
      mapMark(g,'line',{x1,y1,x2,y2,stroke:'#ffc973','stroke-width':2.6,'stroke-dasharray':'5 3'});
    }
    layout.draw(g,project,onSelect,selected,'data-klose-site');
    for(const n of nodes){
      const [cx,cy]=project(n);
      const pin=mapMark(g,'circle',{cx,cy,r:selected===n.id?6:4.6,fill:selected===n.id?'#ffc973':n.colour,
        stroke:'#0a242c','stroke-width':1.4,style:'cursor:pointer'});
      if(n.selectable)pin.onclick=()=>onSelect(n.id);
    }
    if(projectedObserver&&section.observer)mapMark(g,'circle',{cx:projectedObserver[0],cy:projectedObserver[1],
      r:8,fill:'none',stroke:'#71ffbf','stroke-width':2,'pointer-events':'none'});
    mapMark(g,'text',{x:10,y:layout.height-13},formatNavDistance(48/scale));
    mapMark(g,'path',{d:'M10 '+(layout.height-9)+'v3h48v-3',fill:'none',stroke:'#b7dace'});
    used+=layout.height;
  }
  chart.setAttribute('viewBox','0 0 '+width+' '+used);chart.style.height=used+'px';
  if(focused)Array.from(chart.querySelectorAll('[data-nav-label]')).find(el=>el.dataset.navLabel===focused)?.focus({preventScroll:true});
}
