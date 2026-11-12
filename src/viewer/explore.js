  // Original and clipped materials are kept separately. Exterior paint can
  // be shared with interior fixtures, so clipping must not change that paint.
  renderer.localClippingEnabled=true;
  const cutPlane=new T.Plane(new T.Vector3(0,0,-1),.015);
  const sectionMats=new Map();
  const outerMeshes=[];
  const exterior=ship.children.filter(child=>child!==interiorModel.root && child!==habitat.root);
  for(const group of exterior) group.traverse(part=>{
    if(!part.isMesh)return;
    const source=part.material;
    if(!source.isShaderMaterial && !sectionMats.has(source)){
      const cut=source.clone();
      cut.clippingPlanes=[cutPlane];
      cut.clipShadows=true;
      cut.side=T.DoubleSide;
      sectionMats.set(source,cut);
    }
    outerMeshes.push({part,source});
  });
  const modes={board:'登舰',exterior:'外观',section:'纵剖',deck:'分层',planet:'帕诺星系'};
  const regions=interiorModel.deckData;
  const deckSelect=root.querySelector('[data-deck]');
  const roomSelect=root.querySelector('[data-room]');
  const pickers=root.querySelector('.seer-pickers');
  const tag=root.querySelector('[data-tag]');
  const description=root.querySelector('[data-detail]');
  const enterRoomButton=root.querySelector('[data-enter-room]');
  const viewButtons=[...root.querySelectorAll('[data-view]')];
  for(const [i,deck] of regions.entries())deckSelect.add(new Option(deck.name,String(i)));
  const state={mode:'board',deck:1,room:'',located:'',rotate:false,wire:false,
    azimuth:-.16,elevation:.20,distance:18.7};
  const finishing=createFrameFinish();
  const target=new T.Vector3();
  const raycaster=new T.Raycaster();
  let selected=null, frame=0, lastTime=0, disposed=false;
  let stagedBoard=null, liveBoard=false, lastSaved='';
  let stagedExpedition=null,parkedLanding=null,dockedVehicle=null;
  let spiritArchive=null;
  const recentSaves=[];
  const voyageStore=window.openai?.setWidgetState?null:createVoyageStore();
  const parkedPlanetName=()=>parkedLanding?.vehicle?.phase==='landed'
    ?(PANO_NAVIGATION.regions[parkedLanding.vehicle.planetId||'klose']?.definition.name||'星球地表'):'';
  const boarding=createBoardingController(requestDraw,save,parkedPlanetName);
  function travelToShip(id,pose){
    const trip=expedition.active?expedition.snapshot():null;
    if(trip){
      if(trip.vehicle.phase==='docked')dockedVehicle=trip.vehicle;
      parkedLanding=trip.vehicle.phase==='landed'?{
        origin:{roomId:trip.origin.roomId,berthId:trip.origin.berthId,destination:trip.origin.destination},vehicle:trip.vehicle,
        navTarget:trip.navTarget,ramp:expedition.parkedRamp()}:null;
    }
    const passenger=trip?.origin.board||(liveBoard?boarding.snapshot():null);
    stagedBoard={...passenger,roomId:id||'teleport',pose,yaw:pose?.yaw,pitch:pose?.yaw===undefined?undefined:.02,
      facing:pose?.yaw,flight:passenger?.flight?{...passenger.flight,mounted:false}:undefined};
    Object.assign(state,{mode:'board',room:habitat.byId.has(id)?id:'',located:'',rotate:false,wire:false});
    frameSelection();syncScene();save();
  }
  function travelToPlanet(id,approachMushroom=false,planetId='klose'){
    if(expedition.visitSurface(planetId,id,approachMushroom))return;
    const current=expedition.active?expedition.snapshot():null;
    const origin=current?.origin||{roomId:'teleport',...parkedLanding?.origin,board:liveBoard?boarding.snapshot():null};
    stagedExpedition={format:3,phase:'surface',planetId,mapDestination:id,approachMushroom,origin,
      vehicle:current?.vehicle||parkedLanding?.vehicle||dockedVehicle,navTarget:current?.navTarget||parkedLanding?.navTarget,door:1};
    parkedLanding=null;
    Object.assign(state,{mode:'planet',located:'',rotate:false,wire:false});
    syncScene();canvas.focus({preventScroll:true});save();
  }
  const cockpit=createFlightDeck(boarding,travelToShip,requestDraw,travelToPlanet,
    ()=>expedition.active?expedition.parkedRamp():parkedLanding?.ramp,
    (svg,selected,onSelect)=>expedition.drawSystemChart(svg,selected,onSelect,parkedLanding?.vehicle||dockedVehicle),
    ()=>expedition.surfaceNavigation(),id=>expedition.guideTo(id),()=>expedition.lookNorth());
  const expedition=createPlanetExpedition(requestDraw,save,origin=>{
    dockedVehicle=expedition.snapshot().vehicle;
    const roomId=habitat.byId.has(origin?.roomId)?origin.roomId:'teleport';
    habitat.spawn(roomId);
    const berth=shipTransporters.boardingPose(habitat.byId.get(roomId),origin?.berthId);
    stagedBoard={...origin?.board,roomId};
    if(berth)Object.assign(stagedBoard,{pose:berth,yaw:berth.yaw,facing:berth.yaw,pitch:.025});
    parkedLanding=null;
    Object.assign(state,{mode:'board',room:roomId,located:'',rotate:false,wire:false});
    syncScene();root.querySelector('[data-console="terminal"]').focus({preventScroll:true});save();
  },()=>cockpit.openMap(null,true),bird=>spiritTerminal.observe(bird));
  root.querySelector('[data-face-expression="planet"]').addEventListener('change',event=>{
    boarding.setExpression(event.currentTarget.value);
    cockpit.close(false);canvas.focus({preventScroll:true});
    expedition.previewExpression();
  });
  const spiritRecords=window.openai?.setWidgetState?
    createWidgetSpiritRecords(()=>spiritArchive,async archive=>{
      const previous=spiritArchive;spiritArchive=archive;
      try{await save(true);}catch(error){spiritArchive=previous;throw error;}
    }):createSpiritPersistence();
  const spiritTerminal=createSpiritTerminal({
    records:spiritRecords,requestFrame:requestDraw,locationName:()=>tag.textContent,
    siteId:()=>expedition.active?expedition.fieldSite:liveBoard?boarding.roomId:null,
    setFollower:id=>{boarding.setEscortSpecies(id);expedition.setEscortSpecies(id);},
    setFlameTool:value=>{boarding.setFlameTool(value);expedition.setFlameTool(value);},
    visitChallengeSite:id=>{
      if(id==='laboratory'){travelToShip('laboratory');return;}
      if(id==='ocean-floor'){travelToPlanet(id,false,'ocean');return;}
      if(!expedition.approachForestBoss())travelToPlanet('forest',true);
      canvas.focus({preventScroll:true});
    },
    setSafari:s=>expedition.setSafariState(s),enterWetland:()=>expedition.enterWetland(),
    withdraw:key=>expedition.withdrawSpirit(key),
    chat:(context,onClose)=>{
      if(typeof boarding.openSpiritDialogue!=='function')return false;
      return boarding.openSpiritDialogue(context,onClose);
    }
  });
  function openSpirits(trigger,contact=false){
    if(boarding.inTransit||boarding.commsOpen||stage.dataset.consoleOpen||
      (state.mode!=='board'&&!expedition.canOpenSpirits))return;
    const wild=contact?expedition.nearbySpirit():null;
    if(contact&&(!wild||wild.distance>22))return;
    boarding.clearInputs();expedition.clearInputs();
    if(wild?.kind==='safari')spiritTerminal.open(null,trigger,{op:wild.method==='field'?'field':'menu',speciesId:wild.speciesId});
    else spiritTerminal.open(wild,trigger);
  }
  for(const trigger of root.querySelectorAll('[data-spirit-book]'))trigger.addEventListener('click',()=>openSpirits(trigger));
  const wildTrigger=root.querySelector('[data-encounter]');
  wildTrigger.addEventListener('click',()=>openSpirits(wildTrigger,true));
  stage.addEventListener('seer-wetland-action',e=>{
    if(!expedition.canOpenSpirits||stage.dataset.consoleOpen||boarding.commsOpen)return;
    expedition.clearInputs();spiritTerminal.open(null,canvas,e.detail);
  });
  root.querySelector('[data-embark]').addEventListener('click',()=>{
    const berth=boarding.station();
    if(!berth||boarding.commsOpen||cockpit.isOpen)return;
    if(parkedPlanetName()){cockpit.openMap('shuttle-ramp');return;}
    const target=PANO_NAVIGATION.flights.get(berth.landingSiteId);
    if(!target||target.planetId!==berth.destination)return;
    stagedExpedition={format:3,origin:{roomId:boarding.roomId,berthId:berth.id,destination:berth.destination,board:boarding.snapshot()},
      phase:'transfer',navTarget:target.id,vehicle:dockedVehicle};
    Object.assign(state,{mode:'planet',located:'',rotate:false,wire:false});
    syncScene();canvas.focus({preventScroll:true});save();
  });
  const unitMetre=habitat.worldPosition(1,0,0).distanceTo(habitat.worldPosition(0,0,0));
  const unitBounds=new T.BoxGeometry(1,1,1);
  const locator=new T.LineSegments(new T.EdgesGeometry(unitBounds),new T.LineBasicMaterial({
    color:0xffb94a,toneMapped:false,depthTest:false,transparent:true,opacity:.98
  }));
  unitBounds.dispose();locator.visible=false;locator.renderOrder=20;scene.add(locator);
  const boardable=()=>selected && habitat.byId.get(selected.id);
  function frameSelection(){
    const deck=regions[state.deck];
    selected=state.mode==='deck'?deck.rooms.find(room=>room.id===state.room)||null:null;
    const detailed=boardable();
    if(detailed){
      const [x,y,z]=detailed.center;
      target.copy(habitat.worldPosition(x,y+detailed.spec.height*.18,z));
      state.distance=Math.max(detailed.spec.width,detailed.spec.depth)*unitMetre*2.15;
      state.azimuth=-.24;state.elevation=1.16;
    }else if(selected){
      target.fromArray(selected.center);
      ship.localToWorld(target);
      const span=Math.abs(selected.xMax-selected.xMin)||1.9;
      state.distance=T.MathUtils.clamp(span*2.1+1.4,4.1,8.4);
      state.azimuth=-.32;state.elevation=.86;
    }else if(state.mode==='deck'){
      target.set((deck.xMin+deck.xMax)/2,deck.floorY+.06,0);
      ship.localToWorld(target);
      state.azimuth=-.10;state.elevation=1.18;state.distance=13.4;
    }else{
      target.set(0,.66,0);
      state.azimuth=state.mode==='section'?-.16:-.58;
      state.elevation=state.mode==='section'?.20:.17;
      state.distance=state.mode==='section'?18.7:19.75;
    }
  }
  function syncScene(){
    if(state.mode==='planet'){
      cockpit.close(false);
      if(liveBoard){boarding.leave();liveBoard=false;}
      if(stagedExpedition){expedition.open(stagedExpedition);stagedExpedition=null;}
      requestDraw();return;
    }
    expedition.hide();
    const aboard=state.mode==='board', cut=state.mode==='section', single=state.mode==='deck';
    const detailed=boardable();
    const located=cut && habitat.byId.get(state.located);
    reflections.select(aboard || Boolean(detailed));
    locator.visible=Boolean(located);
    if(located){
      const {width,height,depth}=located.spec;
      const [x,y,z]=located.center;
      locator.position.copy(habitat.worldPosition(x,y+height*.5,z));
      locator.scale.set(width*unitMetre,height*unitMetre,depth*unitMetre);
    }
    for(const g of exterior)g.visible=!single && !aboard;
    for(const {part,source} of outerMeshes){
      part.visible=!single && !aboard && !(cut && source.isShaderMaterial);
      part.material=cut?(sectionMats.get(source)||source):source;
    }
    interiorModel.root.visible=(cut || single) && !detailed;
    interiorModel.structure.visible=!single;
    interiorModel.vertical.visible=!single;
    interiorModel.decks.forEach((deck,i)=>{
      deck.visible=!single||i===state.deck;
      for(const element of deck.children)element.visible=!selected || element===selected.group;
    });
    if(!aboard)ship.traverse(part=>{
      if(part.parent===habitat.root)return;
      if(part.isMesh && !part.material.transparent && 'wireframe' in part.material)
        part.material.wireframe=state.wire;
    });
    for(const b of viewButtons)b.setAttribute('aria-pressed',String(b.dataset.view===state.mode));
    rotateButton.setAttribute('aria-pressed',String(state.rotate));
    rotateButton.textContent=state.rotate?'暂停旋转':'自动旋转';
    wireButton.setAttribute('aria-pressed',String(state.wire));
    rotateButton.hidden=wireButton.hidden=aboard;
    pickers.hidden=!single;
    deckSelect.value=String(state.deck);
    roomSelect.replaceChildren(new Option('整层',''));
    for(const r of regions[state.deck].rooms)roomSelect.add(new Option(r.name,r.id));
    roomSelect.value=state.room;
    enterRoomButton.hidden=!detailed;
    if(aboard){
      if(!liveBoard || stagedBoard){
        // A former cutaway may have enabled wireframe on shared materials.
        habitat.root.traverse(part=>{if(part.isMesh && 'wireframe' in part.material)part.material.wireframe=false;});
        boarding.enter(stagedBoard?.roomId || state.room,stagedBoard);
      }else boarding.refresh();
      liveBoard=true;stagedBoard=null;
      cockpit.sync(true);
      requestDraw();return;
    }
    if(liveBoard){boarding.leave();liveBoard=false;}
    habitat.setPreview(detailed?.id || null);
    camera.near=detailed ? Math.max(.0002,unitMetre*.12) : .1;
    camera.updateProjectionMatrix();
    tag.hidden=false;
    tag.textContent=located?'实舱位置 · '+located.name:selected?.name||modes[state.mode];
    description.textContent=detailed?detailed.name+' · '+[detailed.spec.width,detailed.spec.depth,detailed.spec.height].join(' × ')+' 米 · '+(detailed.brief||selected.basis):
      selected?selected.name+' · 分区示意。'+selected.basis:
      single?'选择游戏舱室可查看拆顶实舱，并从入口登舰；其余功能区显示总体布置。':
      located?'金色轮廓表示'+located.name+'在全舰中的实际安装位置与净尺寸。':
      cut?'从近舷剖开，可看到三大层区、层间通道、塔楼和腹舱。舱区依据《飞船手册》，骨架与舱壁为工程布置方案。':
      '扩建方案长 795 米、宽 555 米、高 675 米。原作手册外廓为 530 × 370 × 450 米。';
    status.textContent=modes[state.mode]+(single?' · '+regions[state.deck].name:'')+(state.wire?' · 线框':'');
    cockpit.sync(false);
    requestDraw();
  }
  function applySelection(mode,deck=state.deck,room='',located=''){
    if(boarding.inTransit||expedition.active)return;
    if(mode==='board' && !liveBoard)room=boardable()?.id||room||boarding.roomId||'teleport';
    Object.assign(state,{mode,deck,room,located,rotate:false,wire:mode==='board'?false:state.wire});
    frameSelection();syncScene();save();
  }
  function restore(saved){
    if(!saved||saved.version!==3)return;
    if(!Object.hasOwn(modes,saved.mode))return;
    const formerBoard=saved.board||saved.expedition?.origin?.board||saved.parkedLanding?.origin?.board;
    boarding.setExpression(saved.faceExpression??formerBoard?.expression??(formerBoard?.smiling?'smile':'neutral'));
    if(saved.pack)boarding.restorePack(saved.pack);
    dockedVehicle=saved.dockedVehicle?.phase==='docked'?saved.dockedVehicle:null;
    spiritArchive=saved.spiritArchive||null;
    parkedLanding=saved.mode!=='planet'&&saved.parkedLanding?.vehicle?.phase==='landed'&&saved.parkedLanding.origin
      ?saved.parkedLanding:null;
    if(parkedLanding&&parkedLanding.vehicle.version<3){
      const definition=parkedLanding.vehicle.planetId==='ocean'?OCEAN_WORLD:KLOSE_WORLD;
      parkedLanding={...parkedLanding,vehicle:compactVehicleRecord(parkedLanding.vehicle),ramp:compactSurfacePoint(parkedLanding.ramp,definition)};
      if(!parkedLanding.vehicle)parkedLanding=null;
    }
    state.mode=saved.mode;
    state.located=habitat.byId.has(saved.located)?saved.located:'';
    state.deck=Number.isInteger(saved.deck)&&regions[saved.deck]?saved.deck:1;
    state.room=(state.mode==='board'?habitat.byId.has(saved.room):regions[state.deck].rooms.some(r=>r.id===saved.room))?saved.room:'';
    stagedBoard=state.mode==='board' ? saved.board || {roomId:state.room} : null;
    if(state.mode==='planet'){
      stagedExpedition=saved.expedition?.origin?saved.expedition:null;
      if(!stagedExpedition){state.mode='board';stagedBoard={roomId:'teleport'};}
    }
    frameSelection();
    for(const k of ['azimuth','elevation','distance'])if(Number.isFinite(saved[k]))state[k]=saved[k];
    state.elevation=T.MathUtils.clamp(state.elevation,-1.3,1.48);
    state.distance=T.MathUtils.clamp(state.distance,boardable()?unitMetre*3:2.1,52);
    state.wire=state.mode!=='board' && saved.wire===true;state.rotate=state.mode!=='board' && saved.rotate===true;
  }
  function save(requireArchive=false){
    const privateContent={version:3,...state,faceExpression:boarding.expression,pack:boarding.pack(),board:state.mode==='board'?boarding.snapshot():null,
      expedition:state.mode==='planet'?expedition.snapshot():null,parkedLanding,dockedVehicle:state.mode==='planet'||parkedLanding?null:dockedVehicle,spiritArchive};
    if(requireArchive===true&&new TextEncoder().encode(JSON.stringify(privateContent)).length>15850){
      throw new Error('聊天存档空间不足，请在本机游戏中继续扩充队伍。');
    }
    voyageStore?.write(privateContent);
    lastSaved=JSON.stringify(privateContent);
    if(window.openai?.setWidgetState){
      recentSaves.push(lastSaved);
      if(recentSaves.length>24)recentSaves.shift();
    }
    const room=state.mode==='planet'?tag.textContent:state.mode==='board'?habitat.byId.get(boarding.roomId)?.name:selected?.name;
    const promise=window.openai?.setWidgetState?.({modelContent:{model:'赛尔号扩建舰',view:state.mode==='planet'?expedition.planetName:modes[state.mode],room:room||null},privateContent});
    if(requireArchive===true)return promise;
    promise?.catch?.(()=>{});
  }
  function draw(time){
    frame=0;if(disposed)return;
    if(state.mode==='planet'){if(expedition.draw(time))requestDraw();return;}
    if(state.mode==='board'){
      const walking=boarding.frame(time);
      finishing.render(unitMetre*.68);
      if(walking)requestDraw();
      return;
    }
    if(state.rotate && lastTime)state.azimuth+=Math.min(time-lastTime,75)*.00015;
    lastTime=state.rotate?time:0;
    const distance=state.distance*Math.max(1,1.24/camera.aspect);
    const horizontal=distance*Math.cos(state.elevation);
    camera.position.set(target.x+Math.sin(state.azimuth)*horizontal,
      target.y+Math.sin(state.elevation)*distance,target.z+Math.cos(state.azimuth)*horizontal);
    camera.lookAt(target);
    if(state.wire)renderer.render(scene,camera);
    else finishing.render(boardable()?unitMetre*.68:.115);
    if(state.rotate)requestDraw();
  }
  function requestDraw(){if(!disposed && !frame)frame=requestAnimationFrame(draw);}
  function resize(){
    const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;
    const ratio=Math.min(window.devicePixelRatio||1,2,Math.sqrt(2800000/(w*h)));
    if(renderer.getPixelRatio()!==ratio)renderer.setPixelRatio(ratio);
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();requestDraw();
  }
  const fullscreenButton=root.querySelector('[data-action=fullscreen]');
  if(document.fullscreenEnabled && root.requestFullscreen){
    fullscreenButton.hidden=false;
    fullscreenButton.addEventListener('click',async()=>{
      try{
        if(document.fullscreenElement===root)await document.exitFullscreen();
        else await root.requestFullscreen();
      }catch{fullscreenButton.hidden=true;}
    });
    root.addEventListener('fullscreenchange',()=>{
      const expanded=document.fullscreenElement===root;
      fullscreenButton.setAttribute('aria-pressed',String(expanded));
      fullscreenButton.textContent=expanded?'退出全屏':'全屏';
      resize();
    });
  }
  for(const btn of viewButtons)btn.addEventListener('click',()=>applySelection(btn.dataset.view));
  enterRoomButton.addEventListener('click',()=>applySelection('board',state.deck,state.room));
  root.querySelector('[data-locate-room]').addEventListener('click',()=>{
    if(boarding.roomId)applySelection('section',state.deck,'',boarding.roomId);
  });
  deckSelect.addEventListener('change',()=>applySelection('deck',Number(deckSelect.value)));
  roomSelect.addEventListener('change',()=>applySelection('deck',state.deck,roomSelect.value));
  rotateButton.addEventListener('click',()=>{state.rotate=!state.rotate;syncScene();save();});
  wireButton.addEventListener('click',()=>{state.wire=!state.wire;syncScene();save();});
  const pointers=new Map();
  let pinch=0,tap=null;
  canvas.addEventListener('pointerdown',e=>{
    if(state.mode==='board'||expedition.active)return;
    canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);
    tap=pointers.size===1?[e.clientX,e.clientY]:null;
    if(pointers.size===2){const [a,b]=pointers.values();pinch=Math.hypot(a[0]-b[0],a[1]-b[1]);}
  });
  canvas.addEventListener('pointermove',e=>{
    if(state.mode==='board'||expedition.active)return;
    const prev=pointers.get(e.pointerId);if(!prev)return;
    const x=e.clientX,y=e.clientY;pointers.set(e.pointerId,[x,y]);
    if(tap && Math.hypot(x-tap[0],y-tap[1])>4)tap=null;
    if(pointers.size===1){state.azimuth-=(x-prev[0])*.007;state.elevation=T.MathUtils.clamp(state.elevation+(y-prev[1])*.006,-1.3,1.48);}
    if(pointers.size===2){
      const [a,b]=pointers.values(),gap=Math.hypot(a[0]-b[0],a[1]-b[1]);
      if(gap && pinch)state.distance=T.MathUtils.clamp(state.distance*pinch/gap,boardable()?unitMetre*3:2.1,52);pinch=gap;
    }
    requestDraw();
  });
  function pickRoom(e){
    if(state.mode==='exterior')return false;
    const bounds=canvas.getBoundingClientRect();
    raycaster.setFromCamera(new T.Vector2(2*(e.clientX-bounds.left)/bounds.width-1,1-2*(e.clientY-bounds.top)/bounds.height),camera);
    const selectable=[];
    ship.traverseVisible(obj=>{if(obj.isMesh && !obj.material.transparent)selectable.push(obj);});
    const hit=raycaster.intersectObjects(selectable,false).find(h=>
      !h.object.material.clippingPlanes?.some(p=>p.distanceToPoint(h.point)<0));
    if(!hit)return false;
    for(let part=hit.object;part;part=part.parent){
      for(let i=0;i<regions.length;i++){
        const room=regions[i].rooms.find(r=>r.group===part);
        if(room){applySelection('deck',i,room.id);return true;}
      }
    }
    return false;
  }
  function release(e){
    if(!pointers.delete(e.pointerId))return;
    if(tap && e.type==='pointerup')pickRoom(e);
    tap=null;pinch=0;save();
  }
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,release);
  let wheelTimer;
  canvas.addEventListener('wheel',e=>{
    if(state.mode==='board'||expedition.active)return;
    e.preventDefault();
    const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?stage.clientHeight:1);
    state.distance=T.MathUtils.clamp(state.distance*Math.exp(T.MathUtils.clamp(delta,-180,180)*.0015),boardable()?unitMetre*3:2.1,52);
    requestDraw();clearTimeout(wheelTimer);wheelTimer=setTimeout(save,240);
  },{passive:false});
  root.addEventListener('keydown',e=>{
    if(expedition.active||cockpit.isOpen||spiritTerminal.active||boarding.commsOpen||e.target.tagName==='SELECT')return;
    if(state.mode==='board'){
      if(e.key==='Escape'){e.preventDefault();applySelection('section');}
      return;
    }
    switch(e.key){
      case 'ArrowLeft':state.azimuth-=.12;break;
      case 'ArrowRight':state.azimuth+=.12;break;
      case 'ArrowUp':state.elevation=Math.min(1.48,state.elevation+.10);break;
      case 'ArrowDown':state.elevation=Math.max(-1.3,state.elevation-.10);break;
      case '+':case '=':state.distance=Math.max(boardable()?unitMetre*3:2.1,state.distance*.90);break;
      case '-':state.distance=Math.min(52,state.distance*1.10);break;
      default:return;
    }
    e.preventDefault();requestDraw();save();
  });
  function loadHostState(e){
    const saved=e.detail?.globals?.widgetState?.privateContent;
    if(!saved||saved.version!==3||boarding.inTransit||recentSaves.includes(JSON.stringify(saved)))return;
    restore(saved);syncScene();resize();
    spiritTerminal.refreshFollower();
  }
  ship.updateMatrixWorld(true);
  frameSelection();
  const savedVoyage=voyageStore?.read(saved=>{restore(saved);syncScene();resize();spiritTerminal.refreshFollower();});
  restore(window.openai?.widgetState?.privateContent||savedVoyage);
  window.addEventListener('openai:set_globals',loadHostState);
  const observer=new ResizeObserver(resize);observer.observe(stage);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();showError('图形上下文已中断，请重新打开模型。');});
  window.addEventListener('pagehide',e=>{
    if(voyageStore)save();
    if(e.persisted)return;
    disposed=true;cancelAnimationFrame(frame);clearTimeout(wheelTimer);observer.disconnect();
    spiritTerminal.dispose();expedition.dispose();cockpit.dispose();boarding.dispose();
    window.removeEventListener('openai:set_globals',loadHostState);
    const geometries=new Set(),materials=new Set([...sectionMats.keys(),...sectionMats.values()]),textures=new Set();
    scene.traverse(p=>{if(p.geometry)geometries.add(p.geometry);if(p.material)materials.add(p.material);});
    geometries.forEach(g=>g.dispose());
    materials.forEach(m=>{for(const value of Object.values(m))if(value?.isTexture)textures.add(value);m.dispose();});
    textures.forEach(t=>t.dispose());
    finishing.dispose();reflections.dispose();renderer.dispose();
  },{once:true});
  syncScene();resize();
  spiritTerminal.refreshFollower();
})();
