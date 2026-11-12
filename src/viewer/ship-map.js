  // The radar plots the installed metric layout. Passage endpoints, doors and
  // lift stops are shared with the walking controller and cabin builders.
  function createShipMap({container,getState,onTravel,onPlanetTravel,parkedRamp,drawSystemChart,surfaceNavigation,onGuide}) {
    const plan=habitat.plan;
    const decks=new Map(plan.levels.map(deck=>[deck.id,deck]));
    const targets=new Map();
    for(const room of plan.rooms)targets.set(room.id,{...room,kind:'room',label:room.name});
    for(const ward of plan.crew.zones){
      targets.set(ward.id,{...ward,kind:'ward',label:ward.sector+' 区充能驻舱',
        center:{x:ward.cx,z:(ward.z0+ward.z1)/2}});
    }
    for(const lift of plan.lifts)for(const stop of lift.stops){
      const id=stop.level+'-'+lift.id;
      const door={x:stop.center.x,z:stop.center.z-3.50};
      targets.set(id,{id,kind:'lift',name:lift.name,label:lift.name,level:stop.level,
        center:stop.center,door,line:lift});
    }
    const NS='http://www.w3.org/2000/svg';
    const draw=(parent,tag,attrs={},text='')=>{
      const node=document.createElementNS(NS,tag);
      for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);
      if(text)node.textContent=text;
      parent.append(node);
      return node;
    };
    container.innerHTML=`
      <style>
        .sm-radar {color:#daeff7;display:grid;gap:.55rem;font:inherit}
        .sm-radar .sm-toolbar,.sm-radar .sm-controls,.sm-radar .sm-keys {display:flex;align-items:center;flex-wrap:wrap;gap:.38rem .75rem}
        .sm-radar .sm-toolbar {justify-content:space-between}
        .sm-radar .sm-toolbar label {display:flex;align-items:center;gap:.5em}
        .sm-radar select,.sm-radar button {font:inherit;color:inherit}
        .sm-radar .sm-position {color:#a5ded5}
        .sm-radar .sm-chart {position:relative;overflow:hidden;height:clamp(156px,28vw,224px);border:1px solid #245267;border-radius:5px;background-color:#0a2030;background-image:linear-gradient(#23516b39 1px,transparent 1px),linear-gradient(90deg,#23516b39 1px,transparent 1px),radial-gradient(ellipse at 48% 45%,#10425a 0,transparent 72%);background-size:18px 18px,18px 18px,100% 100%}
        .sm-radar svg {display:block;width:100%;height:100%;font:12px "Microsoft YaHei UI",sans-serif}
        .sm-radar svg text {pointer-events:none;fill:#d4e9f1;paint-order:stroke;stroke:#0a2738;stroke-width:3px;stroke-linejoin:round}
        .sm-radar svg .sm-fine {font-size:10px;fill:#9bbecf}
        .sm-radar svg [data-klose-site] {pointer-events:auto;cursor:pointer}
        .sm-radar svg g[data-sm-target] {cursor:pointer}
        .sm-radar .sm-keys {font-size:.84em;color:#b4cddb}
        .sm-radar .sm-keys i {display:inline-block;width:.57em;height:.57em;margin-right:.38em;vertical-align:.06em}
        .sm-radar .sm-crew-dot {background:#71ffbf;border-radius:50%}
        .sm-radar .sm-stop-dot {border:1.5px solid #ffbe67;transform:rotate(45deg)}
        .sm-radar .sm-route-dash {width:1.1em!important;border-top:2px dashed #7ef2eb;height:0!important}
        .sm-radar .sm-choices {display:flex;gap:.35em;flex-wrap:wrap}
        .sm-radar .sm-choices button {border:1px solid #326178;background:#102e40;border-radius:4px;padding:.28em .65em;line-height:1.4;cursor:pointer}
        .sm-radar .sm-choices button[aria-pressed="true"] {background:#1e5160;border-color:#8fe3d8;color:#e6fffa}
        .sm-radar .sm-choices button:focus-visible {outline:2px solid #a1fff1;outline-offset:1px}
        .sm-radar .sm-route {margin:0;color:#c4dfe9;line-height:1.45}
        .sm-radar .sm-controls {justify-content:space-between;border-top:1px solid #284958;padding-top:.42rem}
        .sm-radar .sm-target {font-weight:650}
        .sm-radar [hidden] {display:none!important}
      </style>
      <section class="sm-radar">
        <div class="sm-toolbar"><label>区域 <select class="form-select" data-sm-area><option value="ship">赛尔号</option><option value="system">帕诺星系 · 轨道图</option></select></label><label data-sm-deck-label>甲板 <select class="form-select" data-sm-deck></select></label><label data-sm-site-label hidden>目的地 <select class="form-select" data-sm-site></select></label><span class="sm-position" data-sm-position></span></div>
        <div class="sm-chart"><svg role="img" aria-label="舰内平面图"></svg></div>
        <div class="sm-keys"><span><i class="sm-crew-dot"></i>当前位置</span><span><i class="sm-stop-dot"></i>升降站</span><span><i class="sm-route-dash"></i>步行路线</span></div>
        <div class="sm-choices" role="group" aria-label="本层舱室与升降站"></div>
        <div class="sm-controls"><strong class="sm-target"></strong><span><button type="button" class="ship-key" data-sm-walk hidden>步行引导</button> <button type="button" class="ship-key" data-sm-travel hidden>传送到此</button></span></div>
        <p class="sm-route" aria-live="polite"></p>
      </section>`;
    const panel=container.querySelector('.sm-radar'),chart=panel.querySelector('svg');
    const picker=panel.querySelector('[data-sm-deck]'),choices=panel.querySelector('.sm-choices');
    const travel=panel.querySelector('[data-sm-travel]'),text=panel.querySelector('.sm-route');
    const guide=panel.querySelector('[data-sm-walk]'),fieldTools=root.querySelector('[data-field-tools]');
    const horizon=fieldTools.querySelector('[data-twin-horizon]');
    const areaPicker=panel.querySelector('[data-sm-area]'),sitePicker=panel.querySelector('[data-sm-site]');
    const {regions}=PANO_NAVIGATION;
    const planets=Object.values(regions).map(region=>region.definition);
    for(const planet of planets)areaPicker.add(new Option(planet.name,planet.id));
    let systemDestination='ocean';
    function selectArea(area,target){
      areaPicker.value=area;sitePicker.replaceChildren();
      if(area==='system'){
        for(const p of planets)sitePicker.add(new Option(p.name,p.id));
        sitePicker.value=systemDestination;
      }else if(regions[area]){
        appendSurfaceOptions(sitePicker,regions[area],rampOnPlanet(parkedRamp(),area));
        const visitor=surfaceNavigation();
        if(!target&&visitor?.planetId===area)target=visitor.targetId||visitor.nearestId;
        if(target&&[...sitePicker.options].some(o=>o.value===target))sitePicker.value=target;
      }
      lastView='';refresh();
    }
    for(const deck of [...decks.values()].reverse())picker.add(new Option(deck.name,deck.id));
    let level='lower',selected=null,opened=false,lastView='';

    function walkingLeg(start,end){
      // Add inner approach points up to the doors, then use the branch and
      // spine centre lines; room furniture is negotiated by the visitor.
      const a=start.door,b=end.door;
      if(Math.abs(a.x-b.x)<.01)return [start.point,a,b,end.point];
      return [start.point,a,{x:a.x,z:0},{x:b.x,z:0},b,end.point];
    }
    function routeFrom(pose,goal){
      if(!pose||!goal)return null;
      const here=habitat.location(pose),inside=targets.get(here.roomId||here.wardId);
      const rides=shipLiftRides(pose.level,goal.level);
      if(!rides)return null;
      if(inside?.id===goal.id)return {rides,legs:new Map(),arrived:true};
      const deck=decks.get(pose.level);
      let originDoor=inside?.door;
      if(!originDoor){
        // Outside a room, project onto the lane the player actually occupies.
        // Bridge to the nearest point of that segment before entering the spine.
        const lane=deck.corridors.reduce((best,c)=>{
          const x=Math.min(Math.max(pose.x,Math.min(c.from.x,c.to.x)),Math.max(c.from.x,c.to.x));
          const z=Math.min(Math.max(pose.z,Math.min(c.from.z,c.to.z)),Math.max(c.from.z,c.to.z));
          const d=Math.hypot(pose.x-x,pose.z-z);
          return d<best.d?{d,x,z}:best;
        },{d:Infinity});
        originDoor={x:lane.x,z:lane.z};
      }
      let start={point:pose,door:originDoor};
      const legs=new Map();
      for(const ride of rides){
        const a=ride.line.stops.find(s=>s.level===ride.from).center;
        const b=ride.line.stops.find(s=>s.level===ride.to).center;
        legs.set(ride.from,walkingLeg(start,{door:a,point:a}));
        start={door:b,point:b};
      }
      legs.set(goal.level,walkingLeg(start,{door:goal.door,point:goal.door}));
      const arrived=goal.kind==='lift'&&here.lift&&here.name===goal.name&&here.level===goal.level;
      return {rides,legs,arrived};
    }
    function plot(deck,items,pose,route){
      const box=chart.getBoundingClientRect();
      if(!box.width || !box.height)return;
      const w=box.width,h=box.height;
      chart.setAttribute('viewBox',`0 0 ${w} ${h}`);
      chart.setAttribute('aria-label',deck.name+'平面图；可用下方舱名选择目的地');
      chart.replaceChildren();
      const points=deck.corridors.flatMap(c=>[c.from,c.to]);
      for(const item of items){
        if(item.kind==='lift')continue;
        points.push({x:item.center.x-item.width/2,z:item.center.z-item.depth/2},
          {x:item.center.x+item.width/2,z:item.center.z+item.depth/2});
      }
      if(pose?.level===level)points.push(pose);
      const xs=points.map(p=>p.x),zs=points.map(p=>p.z);
      const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
      const scale=Math.min((w-70)/Math.max(1,maxX-minX),(h-60)/Math.max(1,maxZ-minZ));
      const X=x=>w/2+(x-(minX+maxX)/2)*scale;
      const Y=z=>h/2+(z-(minZ+maxZ)/2)*scale;
      for(const c of deck.corridors){
        const attr={x1:X(c.from.x),y1:Y(c.from.z),x2:X(c.to.x),y2:Y(c.to.z)};
        draw(chart,'line',{...attr,stroke:'#6596ab','stroke-width':Math.max(2.8,c.width*scale)+1.5});
        draw(chart,'line',{...attr,stroke:'#23506a','stroke-width':Math.max(2.8,c.width*scale)});
      }
      const legend=draw(chart,'g',{'aria-hidden':'true'});
      draw(legend,'text',{x:8,y:14,class:'sm-fine'},'左舷');
      draw(legend,'text',{x:w-8,y:14,'text-anchor':'end',class:'sm-fine'},'舰艏 →');
      draw(legend,'text',{x:8,y:h-8,class:'sm-fine'},'右舷');
      const bar=[1,2,5,10,20,50,100,200].filter(m=>m*scale<=56).pop()||1;
      const barEnd=w-9,barStart=barEnd-bar*scale;
      draw(legend,'path',{d:`M ${barStart} ${h-11} v 4 H ${barEnd} v -4`,fill:'none',stroke:'#9bbecf'});
      draw(legend,'text',{x:barEnd,y:h-15,'text-anchor':'end',class:'sm-fine'},bar+' m');
      for(const item of items.filter(i=>i.kind!=='lift')){
        const x=X(item.center.x),y=Y(item.center.z),width=item.width*scale,height=item.depth*scale;
        const group=draw(chart,'g',{'data-sm-target':item.id});
        draw(group,'title',{},item.name);
        draw(group,'rect',{x:x-width/2,y:y-height/2,width,height,rx:Math.min(4,width/5,height/5),
          fill:item.id===selected?'#215865':'#16425b',stroke:item.id===selected?'#9fffe2':'#65b6d4','stroke-width':1.4});
        const doorY=Y(item.door.z),doorX=X(item.door.x);
        draw(group,'line',{x1:doorX-2.4,y1:doorY,x2:doorX+2.4,y2:doorY,stroke:'#d4f6f3','stroke-width':2});
        const label=item.kind==='ward'?item.sector+' 区':item.label;
        const fit=width>label.length*12+6&&height>15;
        const above=item.center.z<0;
        const labelY=fit?y+4:above?y-height/2-4:y+height/2+13;
        draw(group,'text',{x,y:labelY,'text-anchor':'middle'},label);
        // The label can extend beyond a small room's outline on compact screens.
        draw(group,'rect',{x:x-Math.max(22,label.length*12)/2,y:labelY-12,
          width:Math.max(22,label.length*12),height:16,fill:'transparent'});
      }
      const leg=route?.legs.get(level);
      if(leg?.length)draw(chart,'polyline',{points:leg.map(p=>X(p.x)+','+Y(p.z)).join(' '),
        fill:'none',stroke:'#8cfff2','stroke-width':2.25,'stroke-linecap':'round','stroke-dasharray':'4 4','pointer-events':'none'});
      for(const item of items.filter(i=>i.kind==='lift')){
        const x=X(item.center.x),y=Y(item.center.z);
        const group=draw(chart,'g',{'data-sm-target':item.id});
        draw(group,'title',{},item.name);
        draw(group,'rect',{x:x-8,y:y-8,width:16,height:16,fill:'transparent'});
        draw(group,'path',{d:`M ${x} ${y-4.5} l 4.5 4.5 -4.5 4.5 -4.5 -4.5 Z`,
          fill:item.id===selected?'#ffe2a8':'#594331',stroke:'#ffc46e','stroke-width':1.4});
      }
      if(pose?.level===level){
        const x=X(pose.x),y=Y(pose.z);
        draw(chart,'circle',{cx:x,cy:y,r:7.5,fill:'#77f4b4','fill-opacity':.18,'pointer-events':'none'});
        draw(chart,'circle',{cx:x,cy:y,r:4.1,fill:'#71ffbf',stroke:'#062e32','stroke-width':1.5,'pointer-events':'none'});
      }
    }
    function refresh(){
      if(!opened)return;
      const state=getState(),pose=state.active?state.pose:null;
      const visitor=surfaceNavigation(),remote=Boolean(visitor),area=areaPicker.value,planet=area!=='ship';
      const view=[area,remote,sitePicker.value,level,selected,pose?.level,pose?.x.toFixed(1),pose?.z.toFixed(1),
        chart.clientWidth,chart.clientHeight].join('|');
      if(view===lastView)return;
      lastView=view;
      panel.querySelector('[data-sm-deck-label]').hidden=planet;
      panel.querySelector('[data-sm-site-label]').hidden=!planet;
      panel.querySelector('.sm-keys').hidden=choices.hidden=planet;
      guide.hidden=true;fieldTools.hidden=!visitor||area!==visitor.planetId;
      horizon.hidden=!visitor?.canLookNorth;
      if(planet){
        if(area==='system'){
          systemDestination=sitePicker.value;
          panel.querySelector('[data-sm-position]').textContent='帕诺星系';
          panel.querySelector('.sm-target').textContent=regions[systemDestination]?.definition.name||'';
          chart.setAttribute('aria-label','帕诺星系轨道与各行星当前位置');
          drawSystemChart(chart,systemDestination,id=>{if(id==='dock'){selectArea('ship');return;}if(regions[id]){sitePicker.value=id;refresh();}});
          text.textContent='球体半径 '+(regions[systemDestination].definition.radius/1000)+' 公里。在登陆艇驾驶席打开航线可飞往这颗行星。';
          travel.textContent='查看地表地图';travel.hidden=false;return;
        }
        const region=regions[area],ramp=rampOnPlanet(parkedRamp(),area);
        const site=sitePicker.value==='shuttle-ramp'?ramp:region.byId.get(sitePicker.value);
        const local=visitor?.planetId===area;
        panel.querySelector('[data-sm-position]').textContent=visitor?'当前 · '+visitor.location:'帕诺星系';
        panel.querySelector('.sm-target').textContent=site?.name||'';
        const route=local&&site?visitor.routeTo(site.id):[];
        const distance=local&&site?surfaceDisplacement(visitor.position,site,region.definition.radius).distance:null;
        text.textContent=site?(site.description||'')+(local?'　／　距你 '+formatNavDistance(distance):''):'';
        if(local&&route.length>1)text.textContent+='　／　经 '+route.slice(0,-1).map(id=>region.byId.get(id)?.name).filter(Boolean).join(' → ');
        guide.hidden=!local||!route.length||(distance<surfaceArrivalRadius(site.id)&&visitor.targetId!==site?.id);
        guide.textContent=site&&visitor?.targetId===site.id?'取消引导':'步行引导';
        chart.setAttribute('aria-label',region.definition.name+'地点图，可使用目的地列表选择');
        drawSurfaceMap(chart,{region,selected:sitePicker.value,ramp,observer:local?visitor.position:null,route,
          onSelect:id=>{sitePicker.value=id;refresh();}});
        travel.hidden=!site;travel.textContent='传送到此';return;
      }
      const deck=decks.get(level),items=[...targets.values()].filter(t=>t.level===level);
      const target=targets.get(selected),route=routeFrom(pose,target);
      picker.value=level;
      const place=pose?habitat.location(pose):null;
      panel.querySelector('[data-sm-position]').textContent=place?'当前 · '+place.name:remote?'当前 · '+(regions[stage.dataset.planet]?.definition.name||'行星地表'):'舰外总览';
      // Keep the native buttons stable while state refreshes, including focus.
      if(choices.dataset.level!==level){
        choices.replaceChildren();
        for(const item of items){
          const button=document.createElement('button');
          button.type='button';button.dataset.smTarget=item.id;
          button.textContent=item.label;
          choices.append(button);
        }
        choices.dataset.level=level;
      }
      for(const button of choices.children)button.setAttribute('aria-pressed',String(button.dataset.smTarget===selected));
      panel.querySelector('.sm-target').textContent=target?target.name:'选择舱室或升降站';
      travel.hidden=!target||target.level!==level||Boolean(route?.arrived);
      if(!travel.hidden)travel.textContent=(pose||remote)?'传送到此':'在此登舰';
      if(!target)text.textContent='';
      else if(!pose)text.textContent=target.kind==='lift'
        ?'可停靠'+target.line.stops.map(s=>decks.get(s.level).name).join('、')
        :decks.get(target.level).name+' · '+target.width+' × '+target.depth+' 米';
      else if(route?.arrived)text.textContent=target.kind==='lift'?'已到升降站。等车门打开后进厢选层。':'你已在这里。';
      else if(!route)text.textContent='这两个标高之间尚无升降通路。';
      else{
        const directions=route.rides.map(r=>'乘'+r.line.name+'至'+decks.get(r.to).name);
        directions.push('沿甲板通路前往'+target.name);
        text.textContent=directions.join(' → ')+'。';
      }
      const officer=target?.kind==='room'?namedCrewPosts[target.id]:null;
      if(officer)text.textContent+='　值班：'+officer.name+' · '+SEER_DUTY_PROFILES[officer.id].title;
      plot(deck,items,pose,route);
    }
    function select(e){
      const element=e.target.closest?.('[data-sm-target]');
      if(!element || !panel.contains(element))return;
      selected=element.dataset.smTarget;refresh();
    }
    areaPicker.addEventListener('change',()=>selectArea(areaPicker.value));sitePicker.addEventListener('change',refresh);
    picker.addEventListener('change',()=>{level=picker.value;refresh();});
    guide.addEventListener('click',()=>{
      const visitor=surfaceNavigation();if(visitor?.planetId!==areaPicker.value||guide.hidden)return;
      onGuide(visitor.targetId===sitePicker.value?null:sitePicker.value);
    });
    panel.addEventListener('click',select);
    travel.addEventListener('click',()=>{
      if(areaPicker.value==='system'){selectArea(systemDestination);return;}
      const region=regions[areaPicker.value];
      if(region){
        if(region.byId.has(sitePicker.value)||(sitePicker.value==='shuttle-ramp'&&rampOnPlanet(parkedRamp(),areaPicker.value)))onPlanetTravel(sitePicker.value,areaPicker.value);
        return;
      }
      const target=targets.get(selected);
      if(!target)return;
      if(target.kind==='lift'){
        const pose={...target.door,y:decks.get(target.level).floorY,level:target.level,yaw:Math.PI};
        if(habitat.canStand(pose))onTravel(null,pose);
      }else onTravel(target.id);
    });
    const observer=new ResizeObserver(refresh);
    observer.observe(chart);
    return {
      open(id){
        const away=parkedRamp(),visitor=surfaceNavigation();
        const area=id==='shuttle-ramp'&&away?(away.planetId||'klose'):visitor?.planetId||'ship';
        selectArea(area,id||visitor?.targetId||visitor?.nearestId);
        const s=getState(),target=targets.get(id||(s.active&&s.pose&&habitat.location(s.pose).roomId));
        level=target?.level||(s.active&&s.pose?.level)||level;
        if(target)selected=target.id;
        if(!target)selected=null;
        opened=true;lastView='';refresh();
      },
      refresh,close(){opened=false;},
      dispose(){opened=false;observer.disconnect();container.replaceChildren();}
    };
  }
