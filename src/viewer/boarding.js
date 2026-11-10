  // The visitor's position is a foot point in ship-wide metres. Geometry and
  // collision use the same habitat layout. Only the camera uses render units.
  function createBoardingController(requestFrame, persist) {
    const liftControl = root.querySelector('[data-lift-control]');
    const liftPicker = root.querySelector('[data-lift]');
    const movePad = root.querySelector('[data-move-pad]');
    const boardControls = root.querySelector('[data-boarding-controls]');
    const boardButton = root.querySelector('[data-console="terminal"]');
    const tag = root.querySelector('[data-tag]');
    const info = root.querySelector('[data-detail]');
    const hint = root.querySelector('[data-controls-hint]');
    const eyeHeight = seerRobots.eyeHeight;
    const keys = new Set();
    const touchKeys = new Map();
    const keyCodes = new Set(['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown',
      'ArrowLeft','ArrowRight','PageUp','PageDown','ShiftLeft','ShiftRight','Space','KeyC']);
    let active = false;
    let pose = null;
    let yaw = 0, pitch = 0, frameTime = 0, inputStart = 0;
    let lookDrag = null, currentPlace = '', currentRoomId = null;
    const marker = new T.Vector3();
    const worldOrigin = habitat.worldPosition(0,0,0);
    const worldMetre = habitat.worldPosition(1,0,0).distanceTo(worldOrigin);
    const pilot=createSeerPilot(worldMetre);
    const population=createSeerPopulation();
    const companion=createSuperNono(worldMetre);
    const flight=createPersonalFlight(worldMetre,population);
    const benchButton=root.querySelector('[data-bench]');
    const notice=root.querySelector('[data-notice]');
    let noticeTimer=0,drillOwned=false,drillEquipped=false,samples=0;
    const locker=createPilotLocker(restorePack);
    function pack(){
      return {version:1,drillOwned,drillEquipped,samples,flyerStored:flight.stored};
    }
    function updateSamples(){
      const items=habitat.byId.get('machine')?.group?.userData.trainingSamples;
      items?.forEach((item,index)=>{item.visible=index>=samples;});
    }
    function restorePack(p){
      if(p?.version!==1)return;
      drillOwned=p.drillOwned===true;drillEquipped=drillOwned&&p.drillEquipped===true;
      samples=Number.isInteger(p.samples)?Math.max(0,Math.min(3,p.samples)):0;
      flight.setStored(p.flyerStored===true);pilot.setDrill(drillEquipped);updateSamples();
    }
    function notifyPlayer(message){
      clearTimeout(noticeTimer);notice.textContent=message;notice.hidden=false;
      noticeTimer=setTimeout(()=>{notice.hidden=true;},3500);
    }
    function atBench(){
      if(!active||currentRoomId!=='machine'||flight.mounted)return false;
      const room=habitat.byId.get('machine'),sign=room.side===1?-1:1;
      return Math.hypot((pose.x-room.center[0])*sign+15.8,(pose.z-room.center[2])*sign-6.3)<3.25;
    }
    function useBench(){
      if(!atBench())return;
      if(!drillOwned){drillOwned=true;notifyPlayer('已领取挖矿钻头。在背包中选择钻头即可装备。');}
      else if(!drillEquipped){setDrill(true);return;}
      else if(samples<3){samples++;pilot.workDrill();updateSamples();notifyPlayer('训练矿样已入包 · '+samples+' / 3');}
      else return;
      locker.write(pack());flightControls();focusFlightControls();requestFrame();persist();
    }
    function setDrill(on){
      if(!drillOwned)return;
      drillEquipped=on;pilot.setDrill(on);locker.write(pack());requestFrame();persist();
      notifyPlayer(on?'已装备双臂挖矿钻头。':'挖矿钻头已放回背包。');
    }
    benchButton.addEventListener('click',useBench);
    const walkSpeed=3.6,runSpeed=6.8;
    let smiling=false;
    const crewDialogue=createCrewDialogue({
      context:()=>({roomId:currentRoomId,location:tag.textContent,
        nearby:active&&pose?population.nearest(pose,4):null}),
      inRange:id=>{
        const member=active&&pose?population.getById(id)?.position:null;
        return Boolean(member&&member.level===pose.level&&Math.hypot(member.x-pose.x,member.z-pose.z)<=4);
      },
      stopMovement:clearInputs,requestFrame
    });
    const perspective=root.querySelector('[data-perspective]');
    const inspect=root.querySelector('[data-face-player]');
    const smile=root.querySelector('[data-smile]');
    const greet=root.querySelector('[data-nono]');
    const mount=root.querySelector('[data-flyer]');
    const climb=root.querySelector('[data-climb]'),descend=root.querySelector('[data-descend]');
    const detailVisit=root.querySelector('[data-inspect-workstation]');
    const populationText=root.querySelector('[data-population]');
    const idleClock={timer:0,lastReadout:-1};
    let inView=true;
    const visibility=new IntersectionObserver(entries=>{
      inView=entries.some(entry=>entry.isIntersecting);
      if(!inView){clearInputs();clearTimeout(idleClock.timer);}
      else if(active)requestFrame();
    });
    visibility.observe(stage);
    const macroLens = {fov:camera.fov, near:camera.near, far:camera.far};
    // Exterior studio lights flatten a sealed room. Keep the two rigs
    // mutually exclusive, including exposure and shadow update policy.
    const exteriorLights=scene.children.filter(object=>object.isLight);
    const cabinLights=new T.Group();
    cabinLights.name='舱内工作照明';cabinLights.visible=false;scene.add(cabinLights);
    const bounce=new T.HemisphereLight(0xc8d9e5,0x394654,.18);
    const taskLamp=new T.DirectionalLight(0xffe9c9,.88);
    const farBank=new T.PointLight(0x91c5e6,.86,40*worldMetre,1.45);
    const nearFill=new T.PointLight(0xffe7cd,.21,11*worldMetre,1.5);
    const workSpot=new T.SpotLight(0xe0f6ff,1.12,0,.73,.78,1.2);
    cabinLights.add(bounce,taskLamp,taskLamp.target,farBank,nearFill,workSpot,workSpot.target);
    const shadowSize=Math.min(2048,renderer.capabilities.maxTextureSize);
    taskLamp.shadow.mapSize.set(shadowSize,shadowSize);
    taskLamp.shadow.bias=-.00019;
    taskLamp.shadow.normalBias=.055*worldMetre;
    let savedRig=null;
    const shadowFlags=new Map();
    const sizeProbe=new T.Box3(), sizeVector=new T.Vector3();

    function restoreCasters(){
      for(const [part,wasCasting] of shadowFlags)part.castShadow=wasCasting;
      shadowFlags.clear();
    }
    function useCabinRig(){
      if(savedRig)return;
      savedRig={
        exposure:renderer.toneMappingExposure,
        shadowUpdates:renderer.shadowMap.autoUpdate,
        lights:exteriorLights.map(light=>[light,light.visible])
      };
      for(const [light] of savedRig.lights)light.visible=false;
      renderer.toneMappingExposure=.82;
      renderer.shadowMap.autoUpdate=false;
      cabinLights.visible=true;
    }
    function restoreExteriorRig(){
      if(!savedRig)return;
      restoreCasters();
      cabinLights.visible=false;
      for(const [light,visible] of savedRig.lights)light.visible=visible;
      renderer.toneMappingExposure=savedRig.exposure;
      renderer.shadowMap.autoUpdate=savedRig.shadowUpdates;
      renderer.shadowMap.needsUpdate=true;
      savedRig=null;
    }
    function placeCabinLamps(room){
      restoreCasters();
      const [x,y,z]=room?room.center:[pose.x,pose.y,pose.z];
      const width=room?.spec.width||12,depth=room?.spec.depth||12,height=room?.spec.height||4.4;
      const palette={
        teleport:[0xffe6be,0x8bd8ef],power:[0xffdaa5,0x81bdcc],
        observation:[0xcce6ff,0x9ba9ed],archives:[0xe1efcf,0x95c6b6],
        laboratory:[0xe8f8ec,0x7fc7d0],captain:[0xffedce,0x8bbddf]
      }[room?.id]||[0xffe9d3,0x99c6db];
      taskLamp.color.setHex(palette[0]);farBank.color.setHex(palette[1]);
      // The pool of task light is fixed to the overhead bank across the work
      // station. The room frame rotates with port/starboard installation.
      workSpot.intensity=room?1.12:0;
      if(room){
        const focal=focalPoints[room.id]||[0,height*.29,-depth*.23];
        workSpot.position.copy(room.group.localToWorld(new T.Vector3(-width*.24,height*.87,depth*.12)));
        workSpot.target.position.copy(room.group.localToWorld(new T.Vector3(...focal)));
        workSpot.distance=Math.max(width,depth)*.95*worldMetre;
        workSpot.color.setHex(palette[0]);
      }
      const sign=room?.side===1?-1:1;
      taskLamp.position.copy(habitat.worldPosition(x-sign*width*.69,y+height*1.25+depth*.26,z+sign*depth*.52));
      taskLamp.target.position.copy(habitat.worldPosition(x,y+height*.18,z));
      taskLamp.castShadow=Boolean(room);
      farBank.position.copy(habitat.worldPosition(x+sign*width*.31,y+height*.68,z-sign*depth*.26));
      farBank.distance=Math.max(width,depth)*1.06*worldMetre;
      if(room){
        const radius=Math.hypot(width,depth)*.57*worldMetre;
        Object.assign(taskLamp.shadow.camera,{left:-radius,right:radius,bottom:-radius,top:radius,
          near:.20*worldMetre,far:Math.max(width,depth,height)*3*worldMetre});
        taskLamp.shadow.camera.updateProjectionMatrix();
        // Major equipment casts contact shadows. The panelled roof and
        // walls represent the lamp housings and must not shadow the room.
        room.group.updateWorldMatrix(true,true);
        function prepare(part){
          if(part.name==='舱室内衬')return;
          if(part.isMesh && part.material?.isMeshStandardMaterial && !part.material.transparent){
            if(!part.geometry.boundingBox)part.geometry.computeBoundingBox();
            sizeProbe.copy(part.geometry.boundingBox).applyMatrix4(part.matrixWorld);
            sizeProbe.getSize(sizeVector).multiplyScalar(1/worldMetre);
            if(sizeVector.y>.20 && Math.max(sizeVector.x,sizeVector.z)>.60 && !part.castShadow){
              shadowFlags.set(part,false);part.castShadow=true;
            }
          }
          for(const child of part.children)prepare(child);
        }
        prepare(room.group);
      }
      cabinLights.updateMatrixWorld(true);renderer.shadowMap.needsUpdate=true;
    }
    // Targets are measured above each room's floor. They keep the arrival
    // at the real door while framing its working equipment from eye height.
    const focalPoints={
      teleport:[0,2.7,-5],power:[0,5.3,-5],machine:[-3.1,2.0,-4],
      workshop:[1.0,2.7,-4],instructor:[-.8,2.0,-3],laboratory:[1.0,2.9,-4],
      archives:[2,2.4,-3],honors:[0,3.2,-6],captain:[-3.2,2.2,-3],
      observation:[-3.9,3.0,-5],terraceAccess:[0,2.15,-11]
    };
    // Each view is a visitor standing on the installed floor, not a detached
    // camera. Use the ordinary collision check and leave the player in control.
    const workstationViews={
      machine:{floor:[-14.1,6.7],look:[-16.0,1.35,5.95]},
      teleport:{floor:[-2.1,-4.1],look:[-4.8,2.9,-9.8]},
      power:{floor:[3.7,4.6],look:[-.2,3.7,-3.4]},
      observation:{floor:[-2.5,3.4],look:[-6.9,4.35,-2.3]}
    };
    detailVisit.addEventListener('click',()=>{
      const room=habitat.byId.get(currentRoomId),view=workstationViews[currentRoomId];
      if(!active || !room || !view)return;
      const sign=room.side===1?-1:1;
      for(const [offsetX,offsetZ] of [[0,0],[.95,0],[-.95,0],[0,.95],[1.8,.95],[-1.8,.95]]){
        const p={level:room.level,y:room.center[1],x:room.center[0]+sign*(view.floor[0]+offsetX),
          z:room.center[2]+sign*(view.floor[1]+offsetZ)};
        if(!habitat.canStand(p)||population.nearest(p,.92))continue;
        const aim=room.group.localToWorld(new T.Vector3(...view.look))
          .sub(habitat.worldPosition(p.x,p.y+eyeHeight+contactFloor(p),p.z)).normalize();
        const angle=Math.atan2(-aim.x,-aim.z);
        enter(room.id,{pose:p,yaw:angle,facing:angle,pitch:Math.asin(T.MathUtils.clamp(aim.y,-1,1)),perspective:'eye'});
        focusFlightControls();persist();return;
      }
      info.textContent='观景位置有船员经过，稍后可以再试。';
    });
    const residentialStops=new Set(habitat.residences.deckSpecs.map(row=>Array.isArray(row)?row[0]:row.id));
    const wardIds=new Set(habitat.residences.zones.map(zone=>zone.id));

    function cameraStyle(style){
      crewDialogue.close();
      pilot.setStyle(style);
      perspective.value=pilot.style;
      inspect.hidden=pilot.style==='eye';
    }
    perspective.addEventListener('change',()=>{
      cameraStyle(perspective.value);focusFlightControls();requestFrame();persist();
    });
    inspect.addEventListener('click',()=>{
      if(!active)return;
      crewDialogue.close();
      yaw=pilot.facing+Math.PI;pitch=0;requestFrame();focusFlightControls();persist();
    });
    function setSmile(on){
      smiling=on;pilot.setSmile(on);
      smile.setAttribute('aria-pressed',String(on));
      smile.textContent=on?'恢复平视':'微笑';
    }
    smile.addEventListener('click',()=>{
      if(!active)return;
      cameraStyle('follow');setSmile(!smiling);
      yaw=pilot.facing+Math.PI;pitch=0;focusFlightControls();requestFrame();persist();
    });
    greet.addEventListener('click',()=>{
      if(!active)return;
      crewDialogue.close();companion.greet();focusFlightControls();requestFrame();
    });
    const walkHint='点击画面后用 WASD 行走 · Shift 快行 · 拖动环视 · V 切换视角';
    const flyHint='W/A/S/D 驾驶 · Shift 加速 · 空格上升 / C 下降 · F 着陆下机';
    function flightControls(){
      const label=flight.label(pose);
      if(mount.textContent!==label)mount.textContent=label;
      mount.hidden=!active||(!flight.mounted&&!flight.reachable(pose));
      mount.disabled=flight.landing;
      climb.hidden=descend.hidden=!active||!flight.mounted;
      benchButton.hidden=!atBench();
      benchButton.textContent=!drillOwned?'领取挖矿钻头':!drillEquipped?'装备钻头':samples<3?'钻取训练矿样':'矿样已采完';
      benchButton.disabled=drillEquipped&&samples>=3;
      hint.textContent=flight.mounted?flyHint:walkHint;
      status.textContent=flight.mounted?'滑翔翼 · 悬浮 '+flight.altitude.toFixed(1)+' 米':'玩家 SE-00001';
    }
    function operateFlyer(){
      if(!active||flight.landing)return;
      crewDialogue.close();clearInputs();
      const result=flight.interact(pose,yaw);
      if(result.pose){pose=result.pose;pilot.arrive(pose,yaw);habitat.updateLOD(pose);refreshPlace(true);}
      info.textContent=result.notice;notifyPlayer(result.notice);locker.write(pack());
      flightControls();focusFlightControls();requestFrame();persist();
    }
    mount.addEventListener('click',operateFlyer);
    for(const [button,step] of [[climb,.8],[descend,-.8]])button.addEventListener('click',()=>{
      flight.changeHeight(step,pose);focusFlightControls();requestFrame();persist();
    });
    canvas.addEventListener('wheel',e=>{
      if(!active || pilot.style!=='follow')return;
      e.preventDefault();
      pilot.zoom(T.MathUtils.clamp(e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?stage.clientHeight:1),-180,180));
      requestFrame();persist();
    },{passive:false});
    function refreshPopulation(){
      const s=population.summary;
      populationText.textContent='在舰 '+s.total.toLocaleString('zh-CN')+' 台 · 充能泊位 '+s.capacity.toLocaleString('zh-CN')+' 个 · 附近显示 '+s.visible+' 台船员';
    }

    function focusFlightControls() {
      boardButton.focus({preventScroll:true});
    }
    function clearInputs() {
      keys.clear();
      touchKeys.clear();
      frameTime = inputStart = 0;
      lookDrag = null;
      flight.stop();
    }
    function has(code) {
      if (keys.has(code)) return true;
      for (const pressed of touchKeys.values()) if (pressed === code) return true;
      return false;
    }
    function hasMotion() {
      return touchKeys.size > 0 || [...keys].some(k=>!k.startsWith('Shift'));
    }
    function setCameraLens(boarded) {
      camera.fov = boarded ? (camera.aspect<1.1 ? 64 : 58) : macroLens.fov;
      camera.near = boarded ? worldMetre*.065 : macroLens.near;
      camera.far = boarded ? Math.max(1500*worldMetre,160) : macroLens.far;
      camera.updateProjectionMatrix();
    }
    function refreshPlace(force=false) {
      const place = habitat.location(pose);
      const room = habitat.byId.get(place.roomId);
      const identity = [place.level,place.roomId||'',place.name||'',Boolean(place.lift)].join('|');
      if (!force && currentPlace === identity) return;
      if(force || currentRoomId!==(room?.id||null) || !room)placeCabinLamps(room);
      currentPlace = identity;
      currentRoomId = room?.id || null;
      detailVisit.hidden=!workstationViews[currentRoomId];
      detailVisit.textContent=currentRoomId==='machine'?'前往装备工位':'近看设备';
      if(currentRoomId==='machine')updateSamples();
      root.querySelector('[data-locate-room]').hidden=!currentRoomId;
      const levelName = place.levelName || habitat.levels.find(l=>l.id===place.level)?.name || '';
      tag.hidden = false;
      tag.textContent = [levelName,room?.name || place.name].filter(Boolean).join(' · ');
      const dimensions = room ? [room.spec.width,room.spec.depth,room.spec.height].join(' × ')+' 米' : '';
      const words = room ? room.brief || room.spec.basis || '' : '沿走廊进入舱门，可在升降站换层。';
      info.textContent = [dimensions,words].filter(Boolean).join('　');
      status.textContent = '玩家 SE-00001';
      const stops = place.lift ? habitat.liftStops(pose) : [];
      liftPicker.replaceChildren(new Option('选择停靠层',''));
      for (const stop of stops) if (stop.id!==place.level) liftPicker.add(new Option(stop.name,stop.id));
      liftControl.hidden = liftPicker.options.length<2;
    }
    function enter(roomId, saved) {
      crewDialogue.close();crewDialogue.setBoarded(true);
      active = true;
      clearInputs();
      const id = (habitat.byId.has(roomId)||residentialStops.has(roomId)||wardIds.has(roomId)) ? roomId :
        habitat.byId.has('teleport') ? 'teleport' : habitat.rooms[0].id;
      const entry = habitat.spawn(id);
      const p = saved?.pose;
      if (p && [p.x,p.y,p.z].every(Number.isFinite) && habitat.canStand(p)) pose={...p};
      else pose=habitat.move(entry,-Math.sin(entry.yaw||0)*3.45,-Math.cos(entry.yaw||0)*3.45);
      const room=habitat.byId.get(id);
      let initialYaw=entry.yaw||0,initialPitch=.02;
      if(room){
        const focal=room.group.localToWorld(new T.Vector3(...(focalPoints[id]||[0,2.1,0])));
        focal.sub(habitat.worldPosition(pose.x,pose.y+eyeHeight,pose.z)).normalize();
        initialYaw=Math.atan2(-focal.x,-focal.z);initialPitch=Math.asin(T.MathUtils.clamp(focal.y,-1,1));
      }
      yaw=Number.isFinite(saved?.yaw)?saved.yaw:initialYaw;
      pitch=Number.isFinite(saved?.pitch)?T.MathUtils.clamp(saved.pitch,-1.29,1.29):initialPitch;
      useCabinRig();
      habitat.setActive(true);
      habitat.updateLOD(pose);
      pilot.arrive(pose,yaw,saved);cameraStyle(pilot.style);
      population.setActive(true);population.update(pose,0);refreshPopulation();
      populationText.hidden=false;
      setCameraLens(true);
      boardControls.hidden=false;
      movePad.hidden=false;
      stage.dataset.boarded='true';
      flight.restore(saved?.flight,pose);
      if(typeof saved?.smiling==='boolean')setSmile(saved.smiling);
      companion.arrive(pose,yaw);flightControls();
      refreshPlace(true);
      flightControls();
      requestFrame();
    }
    function leave() {
      if (!active) return;
      crewDialogue.setBoarded(false);
      active=false;clearInputs();restoreExteriorRig();clearTimeout(idleClock.timer);
      pilot.leave();population.setActive(false);populationText.hidden=true;
      companion.leave();flight.leave();
      habitat.setActive(false);
      setCameraLens(false);
      boardControls.hidden=true;movePad.hidden=true;liftControl.hidden=true;
      mount.hidden=climb.hidden=descend.hidden=benchButton.hidden=notice.hidden=true;
      delete stage.dataset.boarded;
      hint.textContent='拖动旋转 · 滚轮或双指缩放';
    }
    function frame(time) {
      if (!active) return false;
      clearTimeout(idleClock.timer);
      if(document.hidden||!inView||crewDialogue.isOpen||stage.hasAttribute('data-console-open')){frameTime=0;return false;}
      const dt = frameTime ? Math.min(Math.max(0,time-frameTime)/1000,.12) : 0;
      const moving=hasMotion();
      frameTime = time;
      yaw += ((has('ArrowLeft')?1:0)-(has('ArrowRight')?1:0))*1.4*dt;
      pitch = T.MathUtils.clamp(pitch+((has('PageUp')?1:0)-(has('PageDown')?1:0))*dt,-1.29,1.29);
      let forward = Number(has('KeyW')||has('ArrowUp'))-Number(has('KeyS')||has('ArrowDown'));
      let strafe = Number(has('KeyD')) - Number(has('KeyA'));
      const magnitude = Math.hypot(forward,strafe);
      const sin=Math.sin(yaw),cos=Math.cos(yaw),norm=magnitude||1;
      const dx=(strafe*cos-forward*sin)/norm,dz=(-strafe*sin-forward*cos)/norm;
      const boost=has('ShiftLeft')||has('ShiftRight');
      if(flight.mounted){
        flight.changeHeight((Number(has('Space'))-Number(has('KeyC')))*2.2*dt,pose);
        const result=flight.drive(pose,dx,dz,boost,dt);
        pose=result.pose;
        if(result.steppedOff){pilot.arrive(pose,yaw);clearInputs();persist();}
        habitat.updateLOD(pose);refreshPlace();
        if(result.notice){info.textContent=result.notice;notifyPlayer(result.notice);}
      }else if(magnitude && dt){
        const step=dt*(boost?runSpeed:walkSpeed);
        pose=habitat.move(pose,dx*step,dz*step,.43,
          (from,to)=>flight.clearsParked(from,to)&&population.clearsCrew(from,to));
        habitat.updateLOD(pose);
        refreshPlace();
      }
      const ride=flight.draw(pose,dt);
      companion.update(pose,yaw,dt,pilot.style,Boolean(ride),ride?.footOffset||0);
      marker.copy(habitat.worldPosition(pose.x,pose.y+eyeHeight+(ride?.footOffset||0),pose.z));
      nearFill.position.copy(marker);nearFill.position.y+=.35*worldMetre;
      const sight=pilot.positionCamera(pose,yaw,pitch,dt,eyeHeight,ride);
      pose.yaw=pilot.facing;
      population.update(pose,dt,sight);
      if(time-idleClock.lastReadout>250){flightControls();refreshPopulation();idleClock.lastReadout=time;}
      if(!moving)idleClock.timer=setTimeout(()=>{if(active&&!document.hidden&&inView)requestFrame();},42);
      return moving;
    }
    liftPicker.addEventListener('change',()=>{
      if (!active || !liftPicker.value) return;
      const arrival=habitat.takeLift(pose,liftPicker.value);
      if (arrival) {
        crewDialogue.close();
        flight.park();clearInputs();pose=arrival;
        if (Number.isFinite(arrival.yaw)) yaw=arrival.yaw;
        pilot.arrive(pose,yaw);companion.arrive(pose,yaw);population.update(pose,0);
        habitat.updateLOD(pose);refreshPlace(true);requestFrame();persist();
      }
      liftPicker.value='';focusFlightControls();
    });
    canvas.addEventListener('pointerdown',e=>{
      if (!active || crewDialogue.isOpen || lookDrag || e.button!==0) return;
      // Cancel the browser's subsequent mouse focus change to the document body.
      e.preventDefault();
      focusFlightControls();canvas.setPointerCapture(e.pointerId);
      lookDrag={id:e.pointerId,x:e.clientX,y:e.clientY};
    });
    canvas.addEventListener('pointermove',e=>{
      if (!active || lookDrag?.id!==e.pointerId) return;
      yaw-=(e.clientX-lookDrag.x)*.004;
      pitch=T.MathUtils.clamp(pitch-(e.clientY-lookDrag.y)*.004,-1.29,1.29);
      lookDrag.x=e.clientX;lookDrag.y=e.clientY;requestFrame();
    });
    function finishLook(e) {
      if (lookDrag?.id!==e.pointerId) return;
      lookDrag=null;persist();
    }
    for (const name of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(name,finishLook);
    function keyCode(e){
      if(e.code && e.code!=='Unidentified')return e.code;
      if(e.key===' ')return 'Space';
      if(e.key==='Shift')return e.location===2?'ShiftRight':'ShiftLeft';
      return /^[wasdcvf]$/i.test(e.key)?'Key'+e.key.toUpperCase():e.key;
    }
    function beginHold(){
      if(!hasMotion())frameTime=inputStart=performance.now();
    }
    function finishHold(code){
      if(!hasMotion())return;
      const now=performance.now();
      // Integrate what was held before removing it. A short directional tap
      // gets at least 55 ms of travel even when down/up fall between two frames.
      if(inputStart && ['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown'].includes(code)){
        frameTime-=Math.max(0,55-(now-inputStart));
        inputStart=0;
      }
      frame(now);
    }
    function startKey(e){
      if(!active || crewDialogue.isOpen || stage.hasAttribute('data-console-open') || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey)return;
      const target=e.target;
      if(target!==window && target!==document && target!==document.body && target!==document.documentElement &&
        !root.contains(target))return;
      if(target.isContentEditable || target.closest?.('input,select,textarea,[role="textbox"]'))return;
      const code=keyCode(e);
      if(code==='KeyF'||code==='KeyV'){
        e.preventDefault();
        if(e.repeat)return;
        if(code==='KeyF')operateFlyer();
        else{cameraStyle(pilot.style==='follow'?'eye':'follow');requestFrame();persist();}
        return;
      }
      if(!keyCodes.has(code) || ((code==='Space'||code==='KeyC')&&!flight.mounted))return;
      if(code==='Space' && target.closest?.('button') && target!==boardButton)return;
      e.preventDefault();
      if(!keys.has(code)){beginHold();keys.add(code);}
      requestFrame();
    }
    function endKey(e) {
      const code=keyCode(e);
      if(!keys.has(code))return;
      finishHold(code);keys.delete(code);
      if(!hasMotion())frameTime=inputStart=0;
      requestFrame();persist();
    }
    window.addEventListener('keydown',startKey);
    window.addEventListener('keyup',endKey);
    for (const btn of movePad.querySelectorAll('[data-step]')) {
      btn.addEventListener('pointerdown',e=>{
        if (!active || crewDialogue.isOpen || e.button!==0) return;
        e.preventDefault();focusFlightControls();btn.setPointerCapture(e.pointerId);
        beginHold();
        touchKeys.set(e.pointerId,btn.dataset.step);requestFrame();
      });
      const stop=e=>{
        const code=touchKeys.get(e.pointerId);
        if(!code)return;
        if(e.type==='pointerup')finishHold(code);
        touchKeys.delete(e.pointerId);
        if(!hasMotion())frameTime=inputStart=0;
        requestFrame();persist();
      };
      for(const n of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(n,stop);
      btn.addEventListener('click',e=>{
        if (!active || crewDialogue.isOpen || e.detail!==0) return;
        // A keyboard-activated movement button advances one short step.
        const along=btn.dataset.step==='KeyW'?.65:btn.dataset.step==='KeyS'?-.65:0;
        const across=btn.dataset.step==='KeyD'?.65:btn.dataset.step==='KeyA'?-.65:0;
        const dx=across*Math.cos(yaw)-along*Math.sin(yaw),dz=-across*Math.sin(yaw)-along*Math.cos(yaw);
        if(flight.mounted)pose=flight.drive(pose,dx/.65,dz/.65,false,.12).pose;
        else pose=habitat.move(pose,dx,dz,.43,(from,to)=>flight.clearsParked(from,to)&&population.clearsCrew(from,to));
        habitat.updateLOD(pose);refreshPlace();requestFrame();persist();
      });
    }
    function onBlur(){if(active){clearInputs();persist();}}
    function onHidden(){if (document.hidden){onBlur();clearTimeout(idleClock.timer);}else if(active){frameTime=0;requestFrame();}}
    window.addEventListener('blur',onBlur);
    document.addEventListener('visibilitychange',onHidden);
    return {
      enter,leave,frame,refresh:()=>active && refreshPlace(true),
      clearInputs,pack,restorePack,
      get commsOpen(){return crewDialogue.isOpen;},
      consoleState(){return {active,pose:pose?{...pose}:null,roomId:currentRoomId,mounted:flight.mounted,
        nearFlyer:active&&flight.reachable(pose),flyerStored:flight.stored,landing:flight.landing,
        hasMap:true,companionActive:active,drillOwned,drillEquipped,samples};},
      useItem(id){
        if(!active)return;
        if(id==='flyer')operateFlyer();
        else if(id==='drill')setDrill(!drillEquipped);
        else if(id==='stowFlyer'&&!flight.mounted){
          flight.setStored(true);locker.write(pack());flightControls();requestFrame();persist();
          notifyPlayer('奥飞滑翔翼已收回储存箱。');
        }
      },
      get roomId(){return currentRoomId;},
      snapshot(){return pose ? {pose:{x:pose.x,y:pose.y,z:pose.z,level:pose.level},yaw,pitch,smiling,flight:flight.snapshot(),roomId:currentRoomId||pose.level,...pilot.snapshot()} : null;},
      dispose(){locker.dispose();clearTimeout(noticeTimer);crewDialogue.dispose();clearInputs();clearTimeout(idleClock.timer);visibility.disconnect();companion.dispose();flight.dispose();pilot.dispose();population.setActive(false);population.dispose?.();restoreExteriorRig();taskLamp.shadow.map?.dispose();window.removeEventListener('keydown',startKey);window.removeEventListener('keyup',endKey);window.removeEventListener('blur',onBlur);document.removeEventListener('visibilitychange',onHidden);}
    };
  }
