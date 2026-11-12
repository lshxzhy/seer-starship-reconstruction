  function createPlanetExpedition(requestFrame,persist,returnHome,browseShipMap){
    const nav=stage.querySelector('[data-planet-nav]'),atlas=stage.querySelector('[data-planet-atlas]');
    const openChart=nav.querySelector('[data-atlas]'),land=nav.querySelector('[data-land]');
    const recall=nav.querySelector('[data-return]'),pad=stage.querySelector('[data-move-pad]');
    const watch=stage.querySelector('[data-see-pipi]');
    const encounterButton=stage.querySelector('[data-encounter]');
    const huntButton=stage.querySelector('[data-wetland-action]');
    const spiritBook=nav.querySelector('[data-spirit-book]');
    const select=atlas.querySelector('[data-site-select]'),chart=atlas.querySelector('[data-site-map]');
    const summary=atlas.querySelector('[data-site-summary]'),closeButton=atlas.querySelector('[data-chart-close]');
    const hint=stage.querySelector('[data-route-hint]'),trackButton=atlas.querySelector('[data-track-site]');
    const transportButton=atlas.querySelector('[data-site-transport]'),shipMapButton=atlas.querySelector('[data-browse-ship]');
    const optics=nav.querySelector('[data-flight-view]'),hand=stage.querySelector('[data-shuttle-hand]');
    const targetOnly=atlas.querySelector('[data-target-only]'),unseat=atlas.querySelector('[data-unseat]');
    const planets={klose:KLOSE_WORLD,ocean:OCEAN_WORLD},bodies={};
    let definition=KLOSE_WORLD,sites=definition.sites,groundSites=kloseMapDestinations(),radius=definition.radius;
    let byId=new Map(groundSites.map(s=>[s.id,s])),home=sites[0],walkingLinks=[];
    const clamp=T.MathUtils.clamp;
    // The exposed sky strip in maps 10, 12, 550 and 943 sets the local horizon.
    // In enclosed areas, extend the distant canopy or cave mouth into the haze.
    function air(horizon,zenith,haze,clouds,sun,fill){
      return {horizon:new T.Color(horizon),zenith:new T.Color(zenith),haze:new T.Color(haze),clouds,sun,fill};
    }
    const atmosphere={
      grassland:air(0xff7425,0xc44360,0xf19165,.09,.97,.52),
      swamp:air(0x706144,0x352736,0x897651,.06,.78,.43),
      forest:air(0xcb1a58,0x872431,0x9c6c58,.04,.81,.46),
      vineway:air(0x663954,0x28223c,0x595067,.04,.62,.41),
      core:air(0x473a31,0x262026,0x50453e,0,.18,.30),
      wetland:air(0xffc990,0xc65e83,0xe6a27f,.20,.98,.55),
      flame:air(0xffaa64,0x963669,0xb57872,.14,.90,.49),
      sanctuary:air(0x99d8f3,0x326dc4,0x8ab8dd,.33,.99,.54),
      'ocean-shallows':air(0x88d8dc,0x397ca1,0x65aeb8,.24,.9,.7),
      'ocean-depths':air(0x3c7e9c,0x18416c,0x397d91,.06,.63,.70),
      'ocean-floor':air(0x22556b,0x142f4b,0x255565,.01,.62,.75),
      'ocean-sanctum':air(0x245a76,0x10273c,0x234354,0,.56,.71)
    };
    let airWeights=new Float32Array(sites.length);
    let lastAirLat,lastAirLon;
    const keys=new Set(),touch=new Map(),pendingSteps=new Map(),events=new AbortController();
    const listen=(el,type,fn,options={})=>el.addEventListener(type,fn,{...options,signal:events.signal});
    let world,body,pano,view,local,rig,drill,contact,nono,stars,sky,lamp,bounce,daylight;
    let dockCenter=null;
    let phase='hidden',origin=null,position={lat:home.lat,lon:home.lon},yaw=0,pitch=.03,boom=5.1;
    let lastTime=null,walkPhase=0,targetId=null,path=[],facing=0,eye=false,drag=null,arrival='',shownMode='',uiClock=0,chartClock=0;
    let craft,dock,flight,feet=new T.Vector3(),door=1,gear=1,external=false,transferSign=1;
    let escort=null,escortId=null,safariState=null,flameTool=false,flameRig=null;
    let navTarget='grassland',pending=null,arrivedOnDeck=false,approachRamp=false,feedback='',feedbackUntil=0,lastStore=0;
    const picker=new T.Raycaster(),chaseBoom={length:21},originRotation=new T.Quaternion();
    const vec=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
    const spherical=p=>({lat:Math.atan2(p.y,Math.hypot(p.x,p.z)),lon:Math.atan2(-p.z,p.x)});
    const distanceText=kloseDistanceText;
    let observedBird=null;
    let visible=true;
    const observer=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);if(visible)requestFrame();else resetInput();});
    observer.observe(stage);
    const keyNames=new Set(['KeyW','KeyS','KeyA','KeyD','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','ShiftLeft','ShiftRight','Space','KeyC','KeyX','KeyQ','KeyR']);
    function resetInput(){keys.clear();touch.clear();pendingSteps.clear();drag=null;lastTime=null;}
    const displacement=(a,b)=>kloseDisplacement(a,b,radius);
    function usePlanet(id){
      body?.setMode('hidden');body=bodies[id]||bodies.klose;
      definition=planets[id]||KLOSE_WORLD;sites=definition.sites;radius=definition.radius;
      groundSites=kloseMapDestinations(definition);byId=new Map(groundSites.map(s=>[s.id,s]));home=sites[0];
      walkingLinks=[...definition.routes,...groundSites.filter(s=>s.area).map(s=>[s.area,s.id])];
      airWeights=new Float32Array(sites.length);lastAirLat=lastAirLon=undefined;shownMode='';path=[];targetId=null;observedBird=null;
      stage.dataset.planet=definition.id;
      if(sky){
        const rings=definition.rings;
        sky.userData.ringNormal.fromArray(rings?.normal||[0,0,0]);
        sky.material.uniforms.ringBounds.value.set(rings?.inner||0,rings?.outer||0);
      }
    }
    function localVehicle(){return flight?.planetId===definition.id;}
    function destination(id){
      if(id==='dock')return {planetId:'klose',name:'赛尔号泊位'};
      for(const def of Object.values(planets)){
        const site=def.landingSites.find(s=>s.id===id);
        if(site)return {...site,planetId:def.id};
      }
      return null;
    }
    function nearestSite(at){
      return groundSites.reduce((a,b)=>displacement(at,a).distance<=displacement(at,b).distance?a:b);
    }
    function groundDestination(id){
      if(id!=='shuttle-ramp')return byId.get(id);
      return localVehicle()?parkedRamp():null;
    }
    function plotRoute(id){
      const destination=groundDestination(id);
      targetId=destination?id:null;path=[];
      if(!destination)return;
      const start=nearestSite(position).id,goal=id==='shuttle-ramp'?nearestSite(destination).id:id;
      // When both ends are outside the classic district, walk towards the
      // actual destination without a detour through the meadow.
      if(displacement(position,home).distance>800&&displacement(destination,home).distance>800){
        path=[id];return;
      }
      const queue=[[start]],seen=new Set([start]);
      for(let i=0;i<queue.length;i++){
        const route=queue[i],last=route[route.length-1];
        if(last===goal){path=route;break;}
        for(const [a,b] of walkingLinks){
          const next=a===last?b:b===last?a:null;
          if(next&&!seen.has(next)){seen.add(next);queue.push([...route,next]);}
        }
      }
      if(id==='shuttle-ramp')path.push(id);
      if(path.length>1&&displacement(position,byId.get(path[0])).distance<24)path.shift();
    }
    function buildWorld(){
      if(world)return;
      world=new T.Scene();world.background=new T.Color(0x071322);view=new T.PerspectiveCamera(49,1,.1,radius*8);
      bodies.klose=createKloseSurface(T,world);bodies.ocean=createOceanSurface(T,world);
      pano=createPanoSystem(T,world);usePlanet('klose');
      body.setSafariState(safariState);
      craft=createLandingShuttle(T);world.add(craft.root);
      local=new T.Group();world.add(local);
      rig=seerRobots.create(0xd84a38,{name:'SE-00001 · 地表行走',castShadow:true});
      local.add(rig.root);contact=createSoleContacts(1);local.add(contact.mesh);
      flameRig=createFieldFlameTool(T,rig);
      nono=createSuperNono(1,local);drill=createMiningDrill(world);
      escort=createSpiritEscort(T,world);escort.setSpecies(escortId);
      bounce=new T.HemisphereLight(0xf4f6ff,0x9b8294,.52);
      lamp=new T.DirectionalLight(0xfff8ef,.97);world.add(bounce,lamp,lamp.target);
      lamp.shadow.mapSize.setScalar(Math.min(2048,renderer.capabilities.maxTextureSize));
      Object.assign(lamp.shadow.camera,{left:-27,right:27,bottom:-27,top:27,near:1,far:114});
      lamp.shadow.camera.updateProjectionMatrix();lamp.shadow.bias=-.00035;lamp.shadow.normalBias=.045;
      const sunFrame=body.frame(home.lat,home.lon);
      daylight=sunFrame.up.clone().multiplyScalar(.76).addScaledVector(sunFrame.east,-.80).addScaledVector(sunFrame.north,-.22).normalize();
      lamp.position.copy(daylight).multiplyScalar(radius*3);
      const points=[],g=new T.BufferGeometry();
      for(let i=0;i<1100;i++){
        const u=(i+.5)/1100,y=1-2*u,a=i*2.39996323,s=Math.sqrt(1-y*y);
        points.push(Math.cos(a)*s*radius*5.5,y*radius*5.5,Math.sin(a)*s*radius*5.5);
      }
      g.setAttribute('position',new T.Float32BufferAttribute(points,3));
      stars=new T.Points(g,new T.PointsMaterial({color:0xd8e7f5,size:1.5,sizeAttenuation:false,fog:false,toneMapped:false}));
      world.add(stars);
      // Local sky dome follows the tangent frame so its horizon rotates around the globe.
      const rings=KLOSE_WORLD.rings;
      const ringNormal=new T.Vector3().fromArray(rings.normal);
      sky=new T.Mesh(new T.SphereGeometry(1,42,22),new T.ShaderMaterial({
        side:T.BackSide,depthWrite:false,depthTest:false,fog:false,
        uniforms:{sun:{value:daylight.clone()},horizon:{value:new T.Color()},zenith:{value:new T.Color()},
          cloudAmount:{value:0},moonStrength:{value:0},airDensity:{value:1},ringPlane:{value:new T.Vector3()},
          ringBounds:{value:new T.Vector2(rings.inner,rings.outer)}},
        vertexShader:'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader:`varying vec3 direction;uniform vec3 sun,horizon,zenith,ringPlane;
          uniform vec2 ringBounds;uniform float cloudAmount,moonStrength,airDensity;
          float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
          float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
          void main(){vec3 d=normalize(direction);float y=max(d.y,0.);
            vec3 col=mix(horizon,zenith,smoothstep(0.,.69,pow(y,.80)));
            vec2 q=d.xz/max(.06,d.y+.13)*2.5;float f=noise(q)*.57+noise(q*2.)*.27+noise(q*4.)*.12+noise(q*8.)*.04;
            float den=dot(d,ringPlane);
            if(d.y>0. && abs(den)>.0001){
              float t=-ringPlane.y/den;
              float r=length(vec3(0.,1.,0.)+d*t);
              float band=smoothstep(ringBounds.x,ringBounds.x+.018,r)*(1.-smoothstep(ringBounds.y-.018,ringBounds.y,r));
              if(t>0.)col=mix(col,vec3(1.,.87,.52),band*smoothstep(.025,.30,y)*cloudAmount*.78);
            }
            vec3 moon=normalize(vec3(.25,.40,-.90));float md=length(d-moon)/.19;
            if(md<1.){vec3 n=normalize((d-moon)/.19+moon*sqrt(max(0.,1.-md*md)));
              float lit=.25+.75*max(dot(n,normalize(vec3(-.58,.61,-.51))),0.);
              vec3 m=mix(vec3(.19,.50,.70),vec3(.46,.78,.82),.5+.5*sin(dot(n,vec3(7.,18.,5.))+3.*noise(n.xy*7.)));
              col=mix(col,m*lit,moonStrength*(1.-smoothstep(.98,1.,md)));}
            col=mix(col,mix(horizon,vec3(1.),.62),smoothstep(.52,.76,f)*smoothstep(0.,.19,y)*cloudAmount);
            float s=max(dot(d,sun),0.);col+=cloudAmount*(vec3(.7,.48,.28)*pow(s,40.)+vec3(.9,.84,.72)*smoothstep(.997,.9995,s));
            gl_FragColor=vec4(mix(vec3(.027,.060,.105),col,airDensity),1.);}`
      }));
      sky.userData.ringNormal=ringNormal;
      sky.renderOrder=-1000;sky.frustumCulled=false;world.add(sky);
    }
    function lightSurface(groundFrame,foot){
      const u=sky.material.uniforms;
      if(position.lat!==lastAirLat||position.lon!==lastAirLon){
        lastAirLat=position.lat;lastAirLon=position.lon;
        let total=0;
        for(const [i,site] of sites.entries()){
          airWeights[i]=1-T.MathUtils.smoothstep(displacement(position,site).distance,35,96);
          total+=airWeights[i];
        }
        // Return to the open grassland sky beyond the documented sites.
        const open=atmosphere[home.id];
        let weight=Math.max(0,1-total);
        u.horizon.value.copy(open.horizon);u.zenith.value.copy(open.zenith);world.fog.color.copy(open.haze);
        let sun=open.sun*weight,fill=open.fill*weight,clouds=open.clouds*weight,moon=0;
        for(const [i,site] of sites.entries()){
          const w=airWeights[i],a=atmosphere[site.id];if(!w)continue;
          weight+=w;const blend=w/weight;
          u.horizon.value.lerp(a.horizon,blend);u.zenith.value.lerp(a.zenith,blend);world.fog.color.lerp(a.haze,blend);
          sun+=w*a.sun;fill+=w*a.fill;clouds+=w*a.clouds;
          if(site.id==='sanctuary')moon=w;
        }
        u.cloudAmount.value=clouds/weight;u.moonStrength.value=moon/weight;
        lamp.intensity=sun/weight;bounce.intensity=fill/weight;
        world.background.copy(u.horizon.value);
      }
      lamp.target.position.copy(foot);lamp.position.copy(foot).addScaledVector(daylight,69);
      bounce.position.copy(groundFrame.up);
      u.sun.value.set(daylight.dot(groundFrame.east),daylight.dot(groundFrame.up),daylight.dot(groundFrame.south));
      const n=sky.userData.ringNormal;
      u.ringPlane.value.set(n.dot(groundFrame.east),n.dot(groundFrame.up),n.dot(groundFrame.south));
    }
    function environment(at,agl,walking,shuttleStatus){
      const mode=walking?'surface':'flight',density=1-T.MathUtils.smoothstep(agl,1200,20000);
      if(mode!==shownMode){body.setMode(mode);shownMode=mode;}
      body.update(at.lat,at.lon,frameDt,agl,localVehicle()?shuttleStatus:null);
      const f=body.frame(at.lat,at.lon),ground=body.point(at.lat,at.lon);
      if(!world.fog)world.fog=new T.FogExp2(0x84655e,.00125);
      position=at;lightSurface(f,ground);
      sky.visible=density>.001;stars.visible=density<.94;
      sky.material.uniforms.airDensity.value=density;
      world.background.setHex(0x071322);
      world.fog.density=.00125*density/(1+agl/160);
      const depth=walking&&body.waterDepth?body.waterDepth(at.lat,at.lon):0;
      if(depth>1.7){
        sky.visible=false;stars.visible=false;world.background.copy(world.fog.color);
        world.fog.density=.009+.00024*Math.min(70,depth);
      }
      lamp.castShadow=agl<65;
      if(agl>1400){
        lamp.position.copy(pano.offset(definition.id,'star',flight.orbitTime)).normalize().multiplyScalar(radius*3);
        lamp.target.position.set(0,0,0);
      }
      return f;
    }
    function validPosition(p){
      return p&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=Math.PI/2&&Number.isFinite(p.lon);
    }
    function configureDock(){
      let room=habitat.byId.get(origin?.roomId)||habitat.byId.get('teleport');
      habitat.spawn(room.id);
      if(!shipTransporters.ports(room).length){room=habitat.byId.get('teleport');habitat.spawn(room.id);}
      const berth=shipTransporters.ports(room).find(p=>p.id===origin?.berthId)||shipTransporters.ports(room)[0];
      origin={...origin,roomId:room.id,berthId:berth.id};
      dock?.dispose();dock=createCarrierDock(T,world,bodies.klose,room,berth.id);
      dockCenter=dock.root.position.clone();
    }
    function open(saved){
      buildWorld();origin=saved.origin;configureDock();
      flight=createPanoFlight(T,bodies,dock,pano,saved.vehicle);
      usePlanet(saved.phase==='surface'&&planets[saved.planetId]?saved.planetId:flight.planetId);
      const current=saved.format===2;
      phase=current&&['transfer','cabin','helm','surface'].includes(saved.phase)?saved.phase:'transfer';
      yaw=Number.isFinite(saved.yaw)?saved.yaw:0;pitch=clamp(Number(saved.pitch)||0,-1.1,1.12);
      facing=Number.isFinite(saved.facing)?saved.facing:yaw;eye=!!saved.eye;external=current&&!!saved.external;
      door=clamp(current&&Number.isFinite(saved.door)?saved.door:1,0,1);gear=flight.status().phase==='flying'?0:1;
      feet.set(0,0,11.8);
      if(current&&Array.isArray(saved.feet)&&saved.feet.length===3&&saved.feet.every(Number.isFinite))feet.fromArray(saved.feet);
      navTarget=destination(saved.navTarget)?saved.navTarget:home.id;
      transferSign=saved.transferSign===-1?-1:1;
      dock.setTravel(current&&Number.isFinite(saved.transfer)?saved.transfer:0);
      position=validPosition(saved.position)?{...saved.position}:{lat:home.lat,lon:home.lon};
      if(!current&&saved.phase==='surface'){
        // The previous radius was 780 km. Keep the visitor's distances from the meadow.
        const oldLat=position.lat,oldLon=position.lon;
        position=body.move(home.lat,home.lon,(oldLon-home.lon)*780000*Math.cos(home.lat),(oldLat-home.lat)*780000);
        flight.placeOnSurface('grassland');phase='surface';dock.setTravel(dock.total);
      }
      pending=current&&['launch','auto'].includes(saved.pending)&&phase==='helm'?saved.pending:null;
      arrival='';observedBird=null;arrivedOnDeck=!!saved.arrivedOnDeck;approachRamp=false;feedback='';
      plotRoute(saved.locating?'shuttle-ramp':saved.targetId);
      if(phase==='surface'&&groundDestination(saved.mapDestination))relocate(saved.mapDestination,saved.approachMushroom===true);
      lastTime=null;lastAirLat=lastAirLon=undefined;previousFlight=flight.status().phase;
      stage.dataset.domain='planet';nav.hidden=false;atlas.hidden=true;
      seerRobots.setExpression(rig,origin?.board?.smiling?'smile':'neutral');
      drill.set(boarding.pack().drillEquipped);updateUI();requestFrame();
    }
    function hide(){
      if(phase==='hidden')return;
      phase='hidden';resetInput();body.setMode('hidden');shownMode='';
      nav.hidden=pad.hidden=atlas.hidden=hand.hidden=hint.hidden=watch.hidden=encounterButton.hidden=huntButton.hidden=true;
      local.visible=false;drill.hide();craft.root.visible=false;
      escort?.hide();
      delete stage.dataset.domain;delete stage.dataset.planet;delete stage.dataset.helm;delete stage.dataset.consoleOpen;
    }
    function snapshot(){
      return {format:2,origin,phase,planetId:definition.id,position:{...position},vehicle:flight.snapshot(),feet:feet.toArray(),
        door,transfer:dock.travel,transferSign,external,navTarget,pending,arrivedOnDeck,yaw,pitch,eye,facing,targetId};
    }
    function say(text){feedback=text;feedbackUntil=performance.now()+3200;updateUI();}
    function flightTarget(id=navTarget){
      const s=destination(id)||destination(home.id);
      const p=id==='dock'?dock.position.clone():bodies[s.planetId].point(s.lat,s.lon);
      return p.add(pano.offset(flight.planetId,s.planetId,flight.orbitTime));
    }
    function targetName(){return destination(navTarget)?.name||home.name;}
    function setPhase(next,keepWalking=false){
      phase=next;
      if(keepWalking){pendingSteps.clear();lastTime=null;}else resetInput();
      observedBird=null;feedback='';drag=null;pitch=0;yaw=0;external=false;
      updateUI();requestFrame();persist();
    }
    function rampFoot(){return vec(...craft.layout.rampEnd).applyQuaternion(flight.quaternion).add(flight.position);}
    function rampApproach(metres){
      const ground=spherical(rampFoot()),out=vec(0,0,1).applyQuaternion(flight.quaternion);
      const groundBody=bodies[flight.planetId],frame=groundBody.frame(ground.lat,ground.lon);
      return groundBody.move(ground.lat,ground.lon,metres*out.dot(frame.east),metres*out.dot(frame.north));
    }
    function parkedRamp(){
      return flight?.status().phase==='landed'?{id:'shuttle-ramp',planetId:flight.planetId,name:'登陆艇尾坡',description:'L-01 当前停放的位置',...rampApproach(1.1)}:null;
    }
    function relocate(id,approachMushroom=false){
      const site=groundDestination(id);
      if(!site)return;
      const parked=localVehicle()&&flight.status().phase==='landed';
      const nearHull=parked&&body.point(site.lat,site.lon).distanceTo(flight.position)<9;
      const at=nearHull?rampApproach(1.1):site;
      // The authored scene centres are clear footpaths, including the chamber
      // floor under the cave roof. Use walker constraints rather than the flight lidar.
      position=body.resolveArrival(at.lat,at.lon);
      yaw=facing=id==='shuttle-ramp'||nearHull?-displacement(position,spherical(flight.position)).bearing:0;
      if(id==='forest'&&!nearHull){
        const boss=body.forestBossPosition();
        if(boss){
          const toBoss=displacement(position,boss);
          if(approachMushroom&&toBoss.distance>3){
            const step=1-3/toBoss.distance;
            const near=body.move(position.lat,position.lon,toBoss.east*step,toBoss.north*step);
            position=body.resolveArrival(near.lat,near.lon);
          }
          yaw=facing=-displacement(position,boss).bearing;
        }
      }
      pitch=0;walkPhase=0;observedBird=null;approachRamp=false;feedback='';arrival=site.name;
      plotRoute(null);resetInput();
    }
    function playerPoint(){return body.point(position.lat,position.lon);}
    function closeToRamp(){return localVehicle()&&flight.status().phase==='landed'&&rampFoot().distanceTo(playerPoint())<3.1;}
    function updateUI(){
      if(phase==='hidden')return;
      const s=flight.status(),walking=phase==='surface',seated=phase==='helm',aboard=phase==='cabin';
      const near=walking?nearestSite(position):null;
      const site=near&&displacement(position,near).distance<58?near:null,zone=craft.zone(feet),docked=s.phase==='docked';
      const dockDoor=aboard&&docked&&feet.z>=10.25;
      openChart.hidden=phase==='transfer';openChart.querySelector('span').textContent=walking?'地表图':'航线';
      land.hidden=!(seated||aboard&&(zone==='seat'||dockDoor)||walking&&closeToRamp());
      land.textContent=walking?'沿尾坡登艇':aboard?(dockDoor?'乘廊车回舰':'进入驾驶席'):
        pending?'正在锁舱':s.auto?'手动接管':arrivedOnDeck&&s.phase!=='flying'?'离席下船':docked?'手动离泊':s.phase==='landed'?'手动起飞':s.canCapture?'锁定对接口':s.canLand?'就地着陆':'制动';
      recall.hidden=!(walking&&localVehicle()&&s.phase==='landed'||seated&&!pending&&!s.auto);
      recall.textContent=walking?'定位登陆艇':'自动飞往'+targetName();
      optics.hidden=!seated;optics.textContent=external?'驾驶舱视角':'艇外视角';
      pad.hidden=phase==='transfer';hand.hidden=!seated;
      if(seated)stage.dataset.helm='true';else delete stage.dataset.helm;
      hint.hidden=false;
      if(phase==='transfer'){
        tag.textContent='赛尔号 · 登船廊车';status.textContent=origin.berthId.split(':').pop()+' 号泊位';
        hint.textContent=(transferSign>0?'驶往登陆艇':'驶回传送舱')+'　'+Math.round(transferSign>0?dock.total-dock.travel:dock.travel)+' m';
      }else if(!walking){
        tag.textContent=seated?'L-01 · 驾驶席':'L-01 · 登陆艇';
        status.textContent=s.stage+'　'+(s.speed>=1000?(s.speed/1000).toFixed(2)+' km/s':Math.round(s.speed)+' m/s')+'　高 '+distanceText(s.clearance);
        if(aboard)hint.textContent=zone==='seat'?'按 E 进入驾驶席':dockDoor?'向前走上尾坡，穿过客舱至驾驶席；按 E 可返回母舰。':
          '向艇首走至驾驶席　／　向艇尾走到舱门';
        else{
          const delta=flightTarget().clone().sub(flight.position),range=delta.length();
          delta.applyQuaternion(originRotation.copy(flight.quaternion).invert());
          const bearing=Math.atan2(delta.x,-delta.z)*180/Math.PI;
          const mark=Math.abs(bearing)<8?'正前':(bearing>0?'右 ':'左 ')+Math.round(Math.abs(bearing))+'°';
          hint.textContent=pending?'尾舱门正在闭锁':(s.auto?s.stage+'　×'+s.timeScale.toFixed(1):s.phase!=='flying'?
            arrivedOnDeck?'已停稳 · 离席后可从尾坡下船':'泊位就绪 · 选择手动或自动出发':'手动　W/S 推进 · A/D 转向 · 空格/C 升降 · Shift 加力')+
            '　／　'+targetName()+' '+distanceText(range)+' '+mark;
        }
      }else{
        tag.textContent=site?.name||definition.name+' · 野外';status.textContent='SE-00001 · '+(walking&&body.waterDepth?.(position.lat,position.lon)>1.7?'水下':'地表');
      }
      const nearby=walking?nearbySpirit():null;
      const attraction=walking?safariAction(null):null;
      huntButton.hidden=!attraction;
      if(attraction)huntButton.textContent=attraction.label;
      watch.hidden=!nearby||nearby.distance>22;if(watch.hidden)observedBird=null;
      encounterButton.hidden=watch.hidden;
      encounterButton.textContent=nearby?'接触'+nearby.name:'接触精灵';
      watch.textContent=observedBird!==null?'结束观察':'观察'+(nearby?.name||'精灵');
      spiritBook.hidden=!walking&&phase!=='cabin';
      if(phase!=='surface'||feedback&&performance.now()<feedbackUntil){
        if(feedback&&performance.now()<feedbackUntil)hint.textContent=feedback;return;
      }
      if(observedBird!==null&&nearby){hint.textContent=String(nearby.speciesId).padStart(3,'0')+' '+nearby.name+'　／　'+(site?.name||definition.name);return;}
      while(path.length&&displacement(position,groundDestination(path[0])).distance<(path[0]==='shuttle-ramp'?1.65:9)){
        arrival=groundDestination(path.shift()).name;
        if(!path.length){targetId=null;persist();}
      }
      if(!path.length){
        const fieldHint=body.safariHint(position.lat,position.lon)||body.spiritSiteHint(position.lat,position.lon);
        hint.textContent=closeToRamp()?'已到登陆艇尾坡　／　按 E 登艇':fieldHint|| (arrival?'已抵达 · '+arrival:site?.description||'打开地表图选择目的地');return;
      }
      const next=groundDestination(path[0]),d=displacement(position,next);
      hint.textContent=directionArrow(d.bearing+yaw)+'  '+next.name+'  '+distanceText(d.distance)+
        (path.length>1?'　／　终点 '+groundDestination(targetId).name:'');
    }
    function directionArrow(a){return ['↑','↗','→','↘','↓','↙','←','↖'][((Math.round(a/(Math.PI/4))%8)+8)%8];}
    function flyCommand(kind){
      if(phase!=='helm'||pending)return;
      if(kind==='manual'){flight.manual();updateUI();persist();return;}
      if(flight.status().phase!=='flying'&&door>0){pending=kind;updateUI();requestFrame();persist();return;}
      if(kind==='auto'){
        const dest=destination(navTarget);
        if(!dest||!flight.autopilot(navTarget==='dock'?'dock':'surface',navTarget==='dock'?undefined:dest,dest.planetId))
          say('已位于目标，或该处暂时无法进场');
      }else flight.launch();
      updateUI();requestFrame();persist();
    }
    function boardGround(){
      if(!closeToRamp()||door<.98)return;
      approachRamp=true;observedBird=null;requestFrame();
    }
    function crossSill(q){
      feet.copy(craft.walk(vec(q.x,0,Math.min(q.z,craft.layout.rampEnd[2])),0,0,true));
      approachRamp=false;plotRoute(null);setPhase('cabin',true);
    }
    function useSiteTool(caster){
      const action=body.interactSpiritSite(caster,position.lat,position.lon,flameTool);
      if(!action)return false;
      if(flameTool&&action.includes('护膜'))flameRig.pulse();
      say(action);requestFrame();return true;
    }
    function mainAction(){
      const s=flight.status();
      if(phase==='surface'){
        if(closeToRamp()){boardGround();return;}
        if(requestSafari(safariAction(null)))return;
        if(useSiteTool(null))return;
        if(!encounterButton.hidden)encounterButton.click();
        return;
      }
      if(phase==='cabin'){
        if(s.phase==='docked'&&feet.z>=10.25){transferSign=-1;dock.setTravel(dock.total);setPhase('transfer');}
        else if(craft.zone(feet)==='seat'){feet.fromArray(craft.layout.seat);arrivedOnDeck=false;setPhase('helm');}
        return;
      }
      if(phase!=='helm'||pending)return;
      if(s.auto)flyCommand('manual');
      else if(s.phase!=='flying'&&arrivedOnDeck)setPhase('cabin');
      else if(s.phase!=='flying')flyCommand('launch');
      else if(s.canCapture)flight.captureDock();
      else if(s.canLand)flight.land();
      else{brakeUntil=performance.now()+1800;say('制动中');}
      requestFrame();persist();
    }
    function setLens(near,far){
      const aspect=stage.clientWidth/Math.max(1,stage.clientHeight);
      const fov=phase==='cabin'||phase==='transfer'||(phase==='helm'&&!external)?68:49;
      if(view.near!==near||view.far!==far||view.aspect!==aspect||view.fov!==fov){
        Object.assign(view,{near,far,aspect,fov});view.updateProjectionMatrix();
      }
    }
    function surfaceCamera(dt){
      const f=body.frame(position.lat,position.lon),p=body.point(position.lat,position.lon,.015);

      local.position.copy(p);local.quaternion.copy(f.quaternion);rig.root.rotation.y=facing;
      if(localVehicle()&&flight.status().phase==='landed'&&p.distanceTo(flight.position)<15)escort.hide();
      else escort.surface(body,position,eye?yaw:facing,dt,eye);
      const dir=f.north.clone().multiplyScalar(Math.cos(yaw)).addScaledVector(f.east,-Math.sin(yaw));
      const aim=p.clone().addScaledVector(f.up,eye?seerRobots.eyeHeight:1.08);
      view.up.copy(f.up);
      if(eye){
        view.position.copy(aim);view.lookAt(aim.clone().addScaledVector(dir,Math.cos(pitch)).addScaledVector(f.up,Math.sin(pitch)));
      }else{
        const angle=clamp(.23-pitch,-.12,1.0),back=boom*Math.cos(angle);
        const behind=body.move(position.lat,position.lon,Math.sin(yaw)*back,-Math.cos(yaw)*back);
        const minHeight=body.height(behind.lat,behind.lon)-body.height(position.lat,position.lon)+.35;
        view.position.copy(aim).addScaledVector(dir,-back).addScaledVector(f.up,Math.max(minHeight-1.08,boom*Math.sin(angle)));
        body.clipCamera?.(aim,view.position);
        view.lookAt(aim.clone().addScaledVector(dir,1.35));
      }
      const side=eye?.98:1.45,forward=eye?2.5:-.24;
      const dx=Math.cos(yaw)*side-Math.sin(yaw)*forward,dz=-Math.sin(yaw)*side-Math.cos(yaw)*forward;
      const peer=body.move(position.lat,position.lon,dx,-dz);
      nono.followOnPlanet(dx,body.height(peer.lat,peer.lon)-body.height(position.lat,position.lon),dz,yaw+Math.PI,dt,true);
      if(observedBird!==null){
        const bird=nearbySpirit();
        if(bird&&bird.distance<=22){
          const aim=bird.focusPoint;
          const distance=Math.max(1.45,(bird.size||.42)*2.4);
          if(bird.kind==='boss'){
            const bearing=bird.portraitBearing??displacement(bird,position).bearing;
            view.position.copy(aim).addScaledVector(f.north,Math.cos(bearing)*distance)
              .addScaledVector(f.east,Math.sin(bearing)*distance).addScaledVector(f.up,distance*.19);
            local.visible=false;escort.hide();
          }else view.position.copy(aim).addScaledVector(f.south,distance).addScaledVector(f.east,distance*.58).addScaledVector(f.up,distance*.35);
          body.clipCamera?.(aim,view.position);view.lookAt(aim);
        }else observedBird=null;
      }
      sky.position.copy(view.position);sky.quaternion.copy(f.quaternion);sky.scale.setScalar(1800);
      return f;
    }
    function step(forward,side,metres,dt){
      const len=Math.hypot(forward,side);if(!len||!metres)return;
      const east=(side*Math.cos(yaw)-forward*Math.sin(yaw))/len,north=(side*Math.sin(yaw)+forward*Math.cos(yaw))/len;
      const next=body.walk(position.lat,position.lon,east*metres,north*metres);
      if(localVehicle()&&flight.status().phase==='landed'){
        const q=body.point(next.lat,next.lon).sub(flight.position).applyQuaternion(originRotation.copy(flight.quaternion).invert());
        const tip=craft.layout.rampEnd[2];
        if(Math.abs(q.y)<4){
          if(door>=.98&&Math.abs(q.x)<.95&&q.z>tip-.65&&q.z<tip){position=next;crossSill(q);return;}
          if(Math.abs(q.x)<2.5&&q.z<5.6&&q.z>-5.5)return;
        }
      }
      position=next;
      if(phase==='surface')requestSafari(body.safariWalk(position.lat,position.lon));
      const delta=Math.atan2(-east,north)-facing;
      facing+=Math.atan2(Math.sin(delta),Math.cos(delta))*(1-Math.exp(-15*dt));arrival='';observedBird=null;
    }
    function tapStep(code,metres){
      const along=Number(code==='KeyW'||code==='ArrowUp')-Number(code==='KeyS'||code==='ArrowDown');
      const side=Number(code==='KeyD')-Number(code==='KeyA');
      step(along,side,metres,.08);
    }
    let frameDt=0,previousFlight='',brakeUntil=0;
    function pressed(code){return keys.has(code)||[...touch.values()].includes(code);}
    function disembark(){
      const ground=spherical(rampFoot()),face=vec(0,0,1).applyQuaternion(flight.quaternion);
      const f=body.frame(ground.lat,ground.lon);
      position=rampApproach(.35);
      setPhase('surface');yaw=facing=Math.atan2(-face.dot(f.east),face.dot(f.north));persist();
    }
    function cabinStep(dx,dz){
      const docked=flight.status().phase==='docked',tip=craft.layout.rampEnd[2];
      if(docked&&feet.z>=tip-.02&&feet.z+dz>=tip){
        feet.set(clamp(feet.x+dx,-1.34,1.34),0,clamp(feet.z+dz,tip,12.65));return;
      }
      if(docked&&feet.z>tip&&feet.z+dz<tip){dz+=feet.z-tip;feet.z=tip;}
      feet.copy(craft.walk(feet,dx,dz,door));
      if(flight.status().phase==='landed'&&door>=.98&&feet.z>=tip-.015&&dz>0)disembark();
    }
    function walkInput(dt){
      if(phase==='surface'&&approachRamp&&dt){
        const ramp=rampFoot(),d=displacement(position,spherical(ramp));
        if(d.distance<.10){crossSill(vec(0,0,craft.layout.rampEnd[2]));return 0;}
        const stride=Math.min(2.4*dt,d.distance);
        position=body.walk(position.lat,position.lon,stride*Math.sin(d.bearing),stride*Math.cos(d.bearing));
        facing=-d.bearing;return 2.4;
      }
      yaw+=(Number(pressed('ArrowLeft'))-Number(pressed('ArrowRight')))*dt*1.55;
      const forward=Number(pressed('KeyW')||pressed('ArrowUp'))-Number(pressed('KeyS')||pressed('ArrowDown'));
      const side=Number(pressed('KeyD'))-Number(pressed('KeyA')),len=Math.hypot(forward,side);
      const speed=len?(pressed('ShiftLeft')||pressed('ShiftRight')?6.8:3.6):0;
      if(len&&dt){
        if(phase==='surface')step(forward,side,speed*dt,dt);
        else cabinStep((side*Math.cos(yaw)-forward*Math.sin(yaw))*speed*dt/len,
          (-side*Math.sin(yaw)-forward*Math.cos(yaw))*speed*dt/len);
        pendingSteps.clear();
      }
      return speed;
    }
    function attachCamera(object,point,headYaw,headPitch){
      const dir=vec(-Math.sin(headYaw)*Math.cos(headPitch),Math.sin(headPitch),-Math.cos(headYaw)*Math.cos(headPitch));
      view.position.copy(object.localToWorld(point));const q=object.getWorldQuaternion(new T.Quaternion());
      view.up.set(0,1,0).applyQuaternion(q);view.lookAt(view.position.clone().add(dir.applyQuaternion(q)));
    }
    function insideCamera(s,dt){
      const helm=phase==='helm',inCar=phase==='transfer';
      const base=inCar?dock.car:craft.root,foot=inCar?vec(0,0,.5):feet.clone();
      local.position.copy(base.localToWorld(foot.clone()));local.quaternion.copy(base.getWorldQuaternion(new T.Quaternion()));
      local.visible=true;rig.root.visible=helm&&external;contact.mesh.visible=false;rig.root.rotation.y=0;drill.hide();
      if(helm)nono.followOnPlanet(1.02,0,1.35,0,dt);
      else nono.followOnPlanet(inCar?.92:clamp(.87-foot.x,-.95,.95),0,inCar?-.65:clamp(-1.4-foot.z,-1.45,1.45),0,dt);
      if(helm&&external){
        const minElevation=(s.phase!=='flying'||s.clearance<60) ? .06 : -1.10;
        const elevation=clamp(.20-pitch,minElevation,1.30);
        const horizontal=Math.cos(elevation)*chaseBoom.length;
        const v=vec(Math.sin(yaw)*horizontal,1.4+Math.sin(elevation)*chaseBoom.length,Math.cos(yaw)*horizontal);
        view.position.copy(base.localToWorld(v));view.up.set(0,1,0).applyQuaternion(flight.quaternion);
        view.lookAt(base.localToWorld(vec(0,1.4,-2)));
      }else attachCamera(base,helm?vec(...craft.layout.eye):foot.add(vec(0,seerRobots.eyeHeight,0)),yaw,pitch+(helm?-.065:0));
    }
    function drawWorld(agl,walking){
      const above=agl>1800&&!walking,curve=renderer.toneMapping,clear=renderer.autoClear;
      const back=world.background,visibleLocal=local.visible,visibleSky=sky.visible,visibleStars=stars.visible;
      const nearDock=definition.id==='klose'&&localVehicle()&&flight.position.distanceTo(dock.position)<1800;
      const viewFar=Math.max(pano.far,view.position.length()+radius*6);
      renderer.setRenderTarget(null);renderer.toneMapping=T.NoToneMapping;
      try{
        if(above){
          // The cockpit is centimetres from the camera, the planet hundreds of
          // kilometres away. The two depth ranges use the exact same eye pose.
          local.visible=craft.root.visible=false;dock.root.visible=!nearDock&&dockVisible;
          setLens(Math.max(3,agl*.0005),viewFar);renderer.render(world,view);
          renderer.autoClear=false;renderer.clearDepth();world.background=null;
          pano.root.visible=body.root.visible=sky.visible=stars.visible=false;local.visible=visibleLocal;craft.root.visible=true;
          dock.root.visible=nearDock;setLens(.055,3200);renderer.render(world,view);
        }else{
          pano.root.visible=false;
          setLens(.075,walking?7000:Math.max(11000,Math.sqrt(2*radius*(agl+8))*1.45));
          renderer.render(world,view);
        }
      }finally{
        renderer.autoClear=clear;renderer.toneMapping=curve;world.background=back;
        pano.root.visible=true;local.visible=visibleLocal;body.root.visible=true;craft.root.visible=localVehicle();
        dock.root.visible=dockVisible;sky.visible=visibleSky;stars.visible=visibleStars;
      }
    }
    let dockVisible=true;
    function draw(time){
      if(phase==='hidden'||document.hidden||!visible)return false;
      if((!atlas.hidden||stage.dataset.consoleOpen==='map'||stage.dataset.consoleOpen==='spirits'||boarding.commsOpen)&&flight.status().phase!=='flying')return false;
      const dt=lastTime===null?0:clamp((time-lastTime)/1000,0,.24);lastTime=time;frameDt=dt;
      let s=flight.status();
      if(phase==='transfer'){
        const left=transferSign>0?dock.total-dock.travel:dock.travel;
        const speed=Math.min(43,Math.sqrt(24*Math.max(left,.6)),5+Math.sqrt(26*Math.min(dock.travel,dock.total-dock.travel)));
        dock.setTravel(dock.travel+transferSign*speed*dt);
        if(transferSign>0&&dock.travel>=dock.total){feet.set(0,0,11.8);setPhase('cabin');}
        else if(transferSign<0&&dock.travel<=0){returnHome(origin);return false;}
      }
      const openDoor=s.phase!=='flying'&&!pending;
      door=T.MathUtils.clamp(door+(openDoor?1:-1)*dt*.9,0,1);
      if(pending&&door===0){const command=pending;pending=null;flyCommand(command);}
      const handInput=phase==='helm'&&atlas.hidden&&!s.auto;
      const axis=(a,b)=>Number(pressed(a))-Number(pressed(b));
      flight.tick(dt,handInput?{forward:axis('KeyW','KeyS'),turn:axis('KeyD','KeyA')+axis('ArrowRight','ArrowLeft'),
        strafe:axis('KeyR','KeyQ'),pitch:axis('ArrowUp','ArrowDown'),lift:axis('Space','KeyC'),
        boost:pressed('ShiftLeft')||pressed('ShiftRight'),brake:pressed('KeyX')||time<brakeUntil}:{});
      s=flight.status();
      if(phase!=='surface'&&definition.id!==flight.planetId)usePlanet(flight.planetId);
      pano.update(definition.id,flight.orbitTime,{showOrbits:false});
      dock.root.position.copy(dockCenter).add(pano.offset(definition.id,'klose',flight.orbitTime));
      dock.root.updateMatrixWorld(true);
      if(s.phase!==previousFlight){
        arrivedOnDeck=s.phase!=='flying';
        if(s.phase==='landed')navTarget='dock';else if(s.phase==='docked')navTarget='grassland';
        previousFlight=s.phase;persist();
      }
      const wantGear=s.phase!=='flying'||s.clearance<90||(flight.planetId==='klose'&&flight.position.distanceTo(dock.position)<170)?1:0;
      gear+=clamp(wantGear-gear,-dt*.8,dt*.8);
      craft.root.position.copy(flight.position).add(pano.offset(definition.id,flight.planetId,flight.orbitTime));
      craft.root.quaternion.copy(flight.quaternion);craft.root.visible=localVehicle();
      craft.update({door,gear,thrust:s.throttle,speed:s.speed,altitude:s.clearance,mode:s.stage,destination:targetName()});
      craft.root.updateMatrixWorld(true);
      const speed=phase==='cabin'||phase==='surface'?walkInput(dt):0;
      const walking=phase==='surface',at=walking?position:{lat:s.lat,lon:s.lon},agl=walking?0:s.clearance;
      flameRig.setVisible(walking&&flameTool&&!eye);
      flameRig.update(dt);
      if(!walking)escort.hide();
      const groundFrame=environment(at,agl,walking,s);
      dockVisible=definition.id==='klose'&&localVehicle()&&flight.position.distanceTo(dock.position)<18000;dock.root.visible=dockVisible;
      if(walking){
        local.visible=true;rig.root.visible=contact.mesh.visible=!eye;surfaceCamera(dt);
        walkPhase+=seerRobots.phaseStep(speed,dt);seerRobots.animate(rig,walkPhase,speed,dt);
        contact.write(0,0,.012,0,facing,rig.bones);contact.finish(1);drill.update(rig.bones.core,dt,!eye&&local.visible);
      }else{
        insideCamera(s,dt);
        sky.position.copy(view.position);sky.quaternion.copy(groundFrame.quaternion);sky.scale.setScalar(agl>1800?30000:7500);
      }
      drawWorld(agl,walking);
      if(time-uiClock>140){updateUI();uiClock=time;}
      if(!atlas.hidden&&time-chartClock>750){showSelection();chartClock=time;}
      if((phase==='transfer'||s.phase==='flying')&&time-lastStore>2500){persist();lastStore=time;}
      return true;
    }
    function paintChart(){
      const flying=phase!=='surface';
      if(flying){
        drawSystemChart(chart,destination(select.value)?.planetId||definition.id,id=>{
          select.value=id==='dock'?'dock':planets[id].landingSites[0].id;showSelection();
        });return;
      }
      drawKloseMap(chart,{definition,sites:groundSites,selected:select.value,
        ramp:groundDestination('shuttle-ramp'),observer:position,
        onSelect:id=>{select.value=id;showSelection();}});
    }
    function drawSystemChart(svg,selected,onSelect,storedVehicle){
      buildWorld();
      const current=phase==='hidden'?'klose':definition.id;
      const time=phase==='hidden'&&storedVehicle?storedVehicle.orbitTime||0:flight?.orbitTime||0;
      const carrier=dock?.position||kloseCarrierStation(bodies.klose);
      const restored=phase==='hidden'?storedVehicle:null;
      pano.drawChart(svg,{time,current,selected,onSelect,carrier,
        vehicle:restored?.p?vec(...restored.p):flight?.position||carrier,vehiclePlanet:restored?.planetId||flight?.planetId||'klose'});
    }
    function showSelection(){
      const id=select.value;
      if(phase==='surface'){
        const at=groundDestination(id);
        summary.textContent=at?at.description+'　／　距你 '+distanceText(displacement(position,at).distance):'';
      }
      else{
        const dest=flightTarget(id),name=destination(id);
        summary.textContent=(id==='dock'?'克洛斯星驻留轨道 · 原泊位':planets[name.planetId].name+' · '+name.name)+
          '　／　直距 '+distanceText(dest.distanceTo(flight.position));
      }
      paintChart();
    }
    function toggleAtlas(){
      if(!atlas.hidden){
        atlas.hidden=true;delete stage.dataset.consoleOpen;canvas.focus({preventScroll:true});requestFrame();return;
      }
      if(phase==='transfer'||phase==='hidden')return;
      const walking=phase==='surface',helm=phase==='helm';
      resetInput();select.replaceChildren();
      if(walking){
        for(const [label,entries] of [
          ['经典探索区',sites],['外围地形',groundSites.filter(s=>s.area&&!s.id.endsWith('-pad'))],
          ['探索区着陆坪',groundSites.filter(s=>s.id.endsWith('-pad'))]
        ]){
          const group=document.createElement('optgroup');group.label=label;
          for(const at of entries)group.append(new Option(at.name,at.id));
          if(entries.length)select.append(group);
        }
        if(groundDestination('shuttle-ramp'))select.add(new Option('L-01 · 登陆艇尾坡','shuttle-ramp'));
      }else{
        for(const def of Object.values(planets)){
          const group=document.createElement('optgroup');group.label=def.name;
          for(const site of def.landingSites)group.append(new Option(def.name+' · '+site.name,site.id));
          select.append(group);
        }
        select.add(new Option('赛尔号 · 原泊位','dock'));
      }
      select.value=walking?(targetId||nearestSite(position).id):navTarget;
      atlas.querySelector('small').textContent=walking?'帕诺星系 ／ '+definition.name:'帕诺星系 ／ L-01';
      atlas.querySelector('h2').textContent=walking?'地表导航图':'行星轨道与登陆艇航线';
      chart.setAttribute('aria-label',walking?definition.name+'地点与步行路径':'帕诺星系行星轨道、舰艇位置与目的地');
      trackButton.textContent=walking?'步行引导':'自动飞往此处';trackButton.hidden=!walking&&!helm;
      transportButton.hidden=!walking;shipMapButton.hidden=!walking||!browseShipMap;
      targetOnly.hidden=walking;unseat.hidden=!helm||!!pending;atlas.hidden=false;stage.dataset.consoleOpen='planet';
      showSelection();closeButton.focus({preventScroll:true});
    }
    listen(openChart,'click',toggleAtlas);listen(closeButton,'click',toggleAtlas);
    listen(atlas,'click',e=>{if(e.target===atlas)toggleAtlas();});
    listen(select,'change',showSelection);
    listen(trackButton,'click',()=>{
      const id=select.value;toggleAtlas();
      if(phase==='surface'){arrival='';observedBird=null;approachRamp=false;plotRoute(id);}
      else{navTarget=id;flyCommand('auto');}
      updateUI();persist();
    });
    listen(transportButton,'click',()=>{
      if(phase!=='surface')return;
      const id=select.value;toggleAtlas();relocate(id);updateUI();persist();requestFrame();
    });
    listen(shipMapButton,'click',()=>{
      if(phase!=='surface'||!browseShipMap)return;
      toggleAtlas();resetInput();browseShipMap();
    });
    listen(targetOnly,'click',()=>{navTarget=select.value;toggleAtlas();if(flight.status().auto)flight.manual();updateUI();persist();});
    listen(unseat,'click',()=>{toggleAtlas();setPhase('cabin');});
    listen(land,'click',mainAction);
    listen(watch,'click',()=>{
      if(phase!=='surface')return;
      if(observedBird!==null)observedBird=null;
      else{
        const nearest=nearbySpirit();
        if(nearest&&nearest.distance<=22)observedBird=nearest.key;
      }
      updateUI();requestFrame();
    });
    listen(recall,'click',()=>{
      if(phase==='surface'){plotRoute(targetId==='shuttle-ramp'?null:'shuttle-ramp');arrival='';updateUI();persist();}
      else flyCommand('auto');
    });
    function toggleView(){
      if(phase==='helm'){external=!external;yaw=0;pitch=0;}
      else if(phase==='surface')eye=!eye;
      updateUI();requestFrame();persist();
    }
    function greetCompanion(){
      if(nono.greet()){
        observedBird=null;say('超能 NoNo 抬翼向你致意');requestFrame();
      }
    }
    function companionInSight(){
      const hit=nono.hitBy(picker);
      if(!hit)return false;
      const solids=[];
      for(const group of [rig.root,craft.root,...(phase==='surface'?[body.root]:[])]){
        group.traverseVisible(part=>{
          if(part.isMesh&&[].concat(part.material).some(m=>m.visible&&(!m.transparent||m.opacity>.85)))solids.push(part);
        });
      }
      const maxDistance=picker.far;
      try{
        picker.far=Math.max(0,hit.distance-.01);
        return !picker.intersectObjects(solids,false).length;
      }finally{picker.far=maxDistance;}
    }
    listen(optics,'click',toggleView);
    function safariAction(caster){
      return phase==='surface'?body.safariAction(caster,position.lat,position.lon):null;
    }
    function requestSafari(action){
      if(!action||stage.dataset.consoleOpen||boarding.commsOpen)return false;
      stage.dispatchEvent(new CustomEvent('seer-wetland-action',{detail:action}));return true;
    }
    listen(huntButton,'click',()=>requestSafari(safariAction(null)));
    listen(window,'keydown',e=>{
      if(phase==='hidden'||['map','spirits'].includes(stage.dataset.consoleOpen)||boarding.commsOpen||e.ctrlKey||e.metaKey||e.altKey||e.isComposing)return;
      if(e.target!==window&&e.target!==document&&e.target!==document.body&&e.target!==document.documentElement&&!root.contains(e.target))return;
      if(!atlas.hidden){
        if(e.key==='Tab'){
          const last=[shipMapButton,unseat,targetOnly,transportButton,trackButton,select].find(el=>!el.hidden);
          if(e.shiftKey&&document.activeElement===closeButton){e.preventDefault();last.focus();}
          else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();closeButton.focus();}
        }
        if(e.key==='Escape'){e.preventDefault();toggleAtlas();}return;
      }
      if(e.target.closest?.('select,input,textarea'))return;
      const code=e.code||(/^[a-z]$/i.test(e.key)?'Key'+e.key.toUpperCase():e.key);
      if(code==='KeyN'&&(phase==='surface'||phase==='cabin')){
        e.preventDefault();if(!e.repeat)greetCompanion();return;
      }
      if(code==='KeyM'){e.preventDefault();if(!e.repeat)toggleAtlas();return;}
      if(code==='KeyV'&&(phase==='surface'||phase==='helm')){e.preventDefault();if(!e.repeat)toggleView();return;}
      if(code==='KeyE'&&phase!=='transfer'){e.preventDefault();if(!e.repeat)mainAction();return;}
      if(phase!=='transfer'&&keyNames.has(code)){
        e.preventDefault();if(!keys.has(code))pendingSteps.set(code,code);keys.add(code);requestFrame();
      }
    });
    listen(window,'keyup',e=>{
      const code=e.code||(/^[a-z]$/i.test(e.key)?'Key'+e.key.toUpperCase():e.key);
      if(keys.delete(code)){if(pendingSteps.delete(code))shortStep(code);persist();requestFrame();}
    });
    listen(window,'blur',resetInput);listen(document,'visibilitychange',()=>{resetInput();if(!document.hidden)requestFrame();});
    listen(canvas,'pointerdown',e=>{
      if(phase==='hidden'||!atlas.hidden||drag||e.button!==0)return;
      e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);
      drag={id:e.pointerId,x:e.clientX,y:e.clientY,travel:0};
    });
    listen(canvas,'pointermove',e=>{
      if(drag?.id!==e.pointerId)return;
      const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;drag.travel+=Math.abs(dx)+Math.abs(dy);
      yaw-=dx*.004;pitch=clamp(pitch-dy*.004,-1.1,1.12);requestFrame();
    });
    for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(canvas,type,e=>{
      if(drag?.id!==e.pointerId)return;
      const tap=type==='pointerup'&&drag.travel<5;drag=null;
      if(tap&&(phase==='surface'||phase==='cabin'||phase==='helm'&&!external)){
        const r=canvas.getBoundingClientRect();
        picker.setFromCamera(new T.Vector2(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height),view);
        if(phase==='helm'){
          const action=picker.intersectObjects(craft.controls,false)[0]?.object.userData.shuttleAction;
          if(action==='auto')toggleAtlas();
          if(action==='manual'){if(flight.status().phase==='flying')flyCommand('manual');else flyCommand('launch');}
          if(action==='view')toggleView();
        }else if(companionInSight())greetCompanion();
        else if(phase==='surface'){
          if(requestSafari(safariAction(picker)))return;
          if(useSiteTool(picker))return;
          const chosen=body.pickSpirit(picker,position.lat,position.lon);
          if(chosen&&chosen.distance<=22){observedBird=chosen.key;updateUI();encounterButton.click();}
        }
      }
      persist();
    });
    listen(canvas,'wheel',e=>{
      if(phase==='hidden'||!atlas.hidden)return;e.preventDefault();
      const factor=Math.exp(clamp(e.deltaY,-170,170)*.0018);
      if(phase==='helm'&&external)chaseBoom.length=clamp(chaseBoom.length*factor,13,55);
      else if(phase==='surface')boom=clamp(boom*factor,2.4,8);
      requestFrame();
    },{passive:false});
    function shortStep(code){
      if(phase==='surface'){tapStep(code,.21);return;}
      if(phase!=='cabin')return;
      const side=Number(code==='KeyD')-Number(code==='KeyA');
      const along=Number(code==='KeyW'||code==='ArrowUp')-Number(code==='KeyS'||code==='ArrowDown');
      cabinStep(.21*(side*Math.cos(yaw)-along*Math.sin(yaw)),.21*(-side*Math.sin(yaw)-along*Math.cos(yaw)));
    }
    for(const b of [...pad.querySelectorAll('[data-step]'),...hand.querySelectorAll('[data-flight-key]')]){
      const code=b.dataset.step||b.dataset.flightKey;
      listen(b,'pointerdown',e=>{
        if(phase==='hidden'||phase==='transfer'||!atlas.hidden||e.button!==0)return;
        e.preventDefault();b.setPointerCapture(e.pointerId);touch.set(e.pointerId,code);pendingSteps.set(e.pointerId,code);requestFrame();
      });
      for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(b,type,e=>{
        if(touch.delete(e.pointerId)){if(pendingSteps.delete(e.pointerId)&&type==='pointerup')shortStep(code);persist();requestFrame();}
      });
      listen(b,'click',e=>{if(e.detail===0&&phase!=='hidden'&&atlas.hidden){shortStep(code);requestFrame();persist();}});
    }
    function nearbySpirit(){
      if(phase!=='surface')return null;
      return observedBird?body.spiritObservation(position.lat,position.lon,observedBird):
        body.nearbySpirit(position.lat,position.lon);
    }
    return {open,hide,draw,snapshot,clearInputs:resetInput,nearbySpirit,
      setFlameTool(value){flameTool=!!value;requestFrame();},
      approachForestBoss(){if(phase!=='surface'||definition.id!=='klose')return false;relocate('forest',true);updateUI();persist();requestFrame();return true;},
      setSafariState(value){safariState=value;bodies.klose?.setSafariState(value);},
      enterWetland(){if(phase==='surface'){relocate('wetland');updateUI();persist();requestFrame();}},
      setEscortSpecies(id){escortId=id;escort?.setSpecies(id);requestFrame();},
      get fieldSite(){if(phase!=='surface')return null;const near=nearestSite(position);
        return displacement(position,near).distance<58?(near.area||near.id):null;},
      withdrawSpirit(key){if(body){body.withdrawSpirit(key);observedBird=null;updateUI();requestFrame();}},
      get canOpenSpirits(){return phase==='surface'||phase==='cabin';},
      parkedRamp,drawSystemChart,get planetName(){return definition.name;},get active(){return phase!=='hidden';},dispose(){
      events.abort();observer.disconnect();if(!world)return;
      hide();dock?.dispose();craft.dispose();drill.dispose();flameRig.dispose();contact.dispose();nono.dispose();escort?.dispose();pano.dispose();
      for(const surface of Object.values(bodies))surface.dispose();
      lamp.shadow.map?.dispose();for(const mesh of [sky,stars]){mesh.geometry.dispose();mesh.material.dispose();}
    }};
  }
