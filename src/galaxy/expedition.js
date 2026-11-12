  function createPlanetExpedition(requestFrame,persist,returnHome,browseMap,recordSight){
    const nav=stage.querySelector('[data-planet-nav]'),atlas=stage.querySelector('[data-planet-atlas]');
    const openChart=nav.querySelector('[data-atlas]'),land=nav.querySelector('[data-land]');
    const recall=nav.querySelector('[data-return]'),pad=stage.querySelector('[data-move-pad]');
    const watch=stage.querySelector('[data-see-pipi]');
    const encounterButton=stage.querySelector('[data-encounter]');
    const huntButton=stage.querySelector('[data-wetland-action]');
    const spiritBook=nav.querySelector('[data-spirit-book]');
    const select=atlas.querySelector('[data-site-select]'),chart=atlas.querySelector('[data-site-map]');
    const atlasModes=[...atlas.querySelectorAll('[data-atlas-view]')];
    let atlasView='system',landingViewKey='';
    const summary=atlas.querySelector('[data-site-summary]'),closeButton=atlas.querySelector('[data-chart-close]');
    const hint=stage.querySelector('[data-route-hint]'),trackButton=atlas.querySelector('[data-track-site]');
    const optics=nav.querySelector('[data-flight-view]'),hand=stage.querySelector('[data-shuttle-hand]');
    const targetOnly=atlas.querySelector('[data-target-only]'),unseat=atlas.querySelector('[data-unseat]');
    const {regions,flights}=PANO_NAVIGATION,bodies={};
    let region=regions.klose,definition=region.definition,home=definition.sites[0],radius=definition.radius;
    let kloseTerrain;
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
      'ocean-sanctum':air(0x43a9bc,0x266688,0x37798e,0,.68,.78)
    };
    for(const site of BYRON_WORLD.sites)atmosphere[site.id]=air(0x191827,0x040711,0x292233,0,.78,.79);
    for(const planet of [ALPHA_WORLD,BETA_WORLD])for(const site of planet.sites){
      const p=planet.palette;
      atmosphere[site.id]=air(site.horizon??p.horizon,site.zenith??p.zenith,site.haze??p.haze,
        planet.id==='alpha'?.20:.095,1.12,.74);
    }
    let airWeights=new Float32Array(definition.sites.length);
    let lastAirLat,lastAirLon;
    const keys=new Set(),touch=new Map(),pendingSteps=new Map(),events=new AbortController();
    const listen=(el,type,fn,options={})=>el.addEventListener(type,fn,{...options,signal:events.signal});
    let world,body,pano,view,local,rig,drill,contact,nono,stars,sky,lamp,bounce,daylight,coreLight;
    let dockCenter=null,departurePort=null;
    let phase='hidden',origin=null,position={lat:home.lat,lon:home.lon},yaw=0,pitch=.03,boom=5.1;
    let lastTime=null,walkPhase=0,targetId=null,path=[],facing=0,eye=false,drag=null,arrival='',shownMode='',uiClock=0,chartClock=0;
    let craft,dock,flight,feet=new T.Vector3(),door=1,gear=1,external=false,transferSign=1;
    let escort=null,escortId=null,safariState=null,flameTool=false,flameRig=null;
    let navTarget='grassland',pending=null,arrivedOnDeck=false,approachRamp=false,feedback='',feedbackUntil=0,lastStore=0;
    const picker=new T.Raycaster(),chaseBoom={length:21},originRotation=new T.Quaternion();
    const vec=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
    const spherical=p=>({lat:Math.atan2(p.y,Math.hypot(p.x,p.z)),lon:Math.atan2(-p.z,p.x)});
    const distanceText=formatNavDistance;
    let observedBird=null;
    const skyPlanets={},sisterDirection=new T.Vector3();
    let sister=null,sisterDistance=0,sisterAbove=false,throughScope=false;
    const observation={bearing:0,elevation:.22,zoom:1};
    function observingWreck(){return definition.kind==='ship'&&observedBird!==null;}
    const canObserve=bird=>bird&&bird.distance<=(bird.observationRange||22);
    function observe(bird){
      throughScope=false;
      observedBird=bird.key;observation.bearing=bird.portraitBearing??displacement(bird,position).bearing;
      observation.elevation=.22;observation.zoom=1;
      if(bird.kind==='apparition'){observation.bearing=observation.elevation=0;}
      else recordSight(bird);
    }
    let visible=true;
    const observer=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);if(visible)requestFrame();else resetInput();});
    observer.observe(stage);
    const keyNames=new Set(['KeyW','KeyS','KeyA','KeyD','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','ShiftLeft','ShiftRight','Space','KeyC','KeyX','KeyQ','KeyR']);
    const flightPulses=new Map();
    function resetInput(){keys.clear();touch.clear();pendingSteps.clear();flightPulses.clear();drag=null;lastTime=null;}
    const displacement=(a,b)=>navigationDisplacement(a,b,definition);
    const coordinates=(p,surface=body)=>surface.coordinates?surface.coordinates(p):spherical(p);
    function usePlanet(id){
      throughScope=false;sisterAbove=false;
      for(const mesh of Object.values(skyPlanets))mesh.visible=false;
      body?.setMode('hidden');body=getSurface(regions[id]?id:'klose');
      region=regions[id]||regions.klose;definition=region.definition;radius=definition.radius;home=definition.sites[0];
      airWeights=new Float32Array(definition.sites.length);lastAirLat=lastAirLon=undefined;shownMode='';path=[];targetId=null;observedBird=null;
      stage.dataset.planet=definition.id;
      if(sky){
        const rings=definition.rings;
        sky.userData.ringNormal.fromArray(rings?.normal||[0,0,0]);
        sky.material.uniforms.ringBounds.value.set(rings?.inner||0,rings?.outer||0);
        const f=body.frame(home.lat,home.lon);
        daylight.copy(f.up).multiplyScalar(.79).addScaledVector(f.east,-.74).addScaledVector(f.north,-.36).normalize();
        if(definition.kind==='ship')daylight.set(.72,.87,.32).normalize();
      }
    }
    function localVehicle(){return flight?.planetId===definition.id;}
    function openTwinSky(at){return Boolean(definition.palette)&&!body.isSheltered(at.lat,at.lon,seerRobots.eyeHeight);}
    function nearestSite(at){
      return region.places.reduce((a,b)=>displacement(at,a).distance<=displacement(at,b).distance?a:b);
    }
    function groundDestination(id){
      if(id!=='shuttle-ramp')return region.byId.get(id);
      return localVehicle()?parkedRamp():null;
    }
    function walkingRoute(id){
      const destination=groundDestination(id);
      if(!destination)return [];
      const start=nearestSite(position).id,goal=id==='shuttle-ramp'?nearestSite(destination).id:id;
      // When both ends are outside the classic district, walk towards the
      // actual destination without a detour through the meadow.
      if(displacement(position,home).distance>800&&displacement(destination,home).distance>800){
        return [id];
      }
      const queue=[[start]],seen=new Set([start]);
      for(let i=0;i<queue.length;i++){
        const route=queue[i],last=route[route.length-1];
        if(last===goal){
          if(id==='shuttle-ramp')route.push(id);
          if(route.length>1&&displacement(position,region.byId.get(start)).distance<24)route.shift();
          return route;
        }
        for(const [a,b] of region.walkingLinks){
          const next=a===last?b:b===last?a:null;
          if(next&&!seen.has(next)){seen.add(next);queue.push([...route,next]);}
        }
      }
      return [];
    }
    function plotRoute(id){path=walkingRoute(id);targetId=path.length?id:null;}
    function getSurface(id){
      if(bodies[id])return bodies[id];
      switch(id){
        case 'klose': return bodies.klose=createKloseSurface(T,world,KLOSE_WORLD,kloseTerrain);
        case 'ocean': return bodies.ocean=createOceanSurface(T,world);
        case 'alpha': case 'beta': return bodies[id]=createTwinSurface(T,world,regions[id].definition);
        case 'byron':
          bodies.byron=createByronSurface(T,world);
          bodies.byron.root.add(coreLight);
          return bodies.byron;
      }
    }
    function buildWorld(){
      if(world)return;
      world=new T.Scene();world.background=new T.Color(0x071322);view=new T.PerspectiveCamera(49,1,.1,radius*8);
      kloseTerrain??=createKloseTerrain(T);
      pano=createPanoSystem(T,world);
      coreLight=new T.PointLight(0xff746a,1.18,1900,1);
      for(const twin of [ALPHA_WORLD,BETA_WORLD]){
        const source=pano.proxies[twin.id],display=new T.Mesh(source.geometry,source.material.clone());
        display.name=twin.name+' · 天空视盘';display.material.depthTest=display.material.depthWrite=false;
        display.renderOrder=-900;display.visible=false;skyPlanets[twin.id]=display;world.add(display);
      }
      usePlanet('klose');
      body.setSafariState(safariState);
      craft=createLandingShuttle(T);world.add(craft.root);
      local=new T.Group();world.add(local);
      rig=seerRobots.create(0xd84a38,{name:'SE-00001 · 地表行走',castShadow:true,display:true});
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
        const shell=pano.far*.8;
        points.push(Math.cos(a)*s*shell,y*shell,Math.sin(a)*s*shell);
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
          twinSky:{value:0},skyZoom:{value:1},panorama:{value:0},crossingPhase:{value:0},meadowGlow:{value:0},deepSpace:{value:0},
          ringBounds:{value:new T.Vector2(rings.inner,rings.outer)}},
        vertexShader:'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader:`varying vec3 direction;uniform vec3 sun,horizon,zenith,ringPlane;
          uniform float twinSky,skyZoom,panorama,crossingPhase,meadowGlow,deepSpace;
          uniform vec2 ringBounds;uniform float cloudAmount,moonStrength,airDensity;
          float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
          float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
          ${TWIN_CRUST_GLSL}
          ${TWIN_PANORAMA_GLSL}
          void main(){vec3 d=normalize(direction);float y=max(d.y,0.);
            if(deepSpace>0.){
              vec2 p=vec2(dot(d,vec3(.8,.1,-.58)),dot(d,vec3(.22,.91,.35)));
              float grain=.49*noise(p*9.+2.)+.29*noise(p*20.)+.16*noise(p*47.)+.06*noise(p*114.);
              float lane=dot(d,normalize(vec3(.19,.95,-.25)))+.06*sin(p.x*9.)+.13*(grain-.5);
              float dust=exp(-lane*lane*16.)*smoothstep(.24,.76,grain);
              float offset=(lane+.035)*18.;
              float rim=exp(-offset*offset)*smoothstep(.42,.73,grain);
              vec3 night=vec3(.027,.033,.079)+dust*mix(vec3(.13,.07,.19),vec3(.08,.19,.31),smoothstep(-.7,.6,p.x))+rim*vec3(.15,.10,.17);
              vec2 cell=p*230.;float seed=hash(floor(cell));
              float glint=(1.-smoothstep(.04,.23,length(fract(cell)-vec2(.27+.45*seed,.26+.46*hash(floor(cell)+3.)))))*
                step(.92,seed)*(.09+.42*dust);
              gl_FragColor=vec4(night+vec3(.83,.84,1.)*glint,1.);return;
            }
            vec3 col=mix(horizon,zenith,smoothstep(0.,.69,pow(y,.80)));
            vec2 q=d.xz/max(.06,d.y+.13)*2.5;float f=noise(q)*.57+noise(q*2.)*.27+noise(q*4.)*.12+noise(q*8.)*.04;
            if(meadowGlow>0. && d.y>=0.){
              float ribbon=exp(-pow((d.y-.085)*10.,2.));
              float drift=noise(d.xz*6.+vec2(d.y*2.,d.y*43.));
              col=mix(col,vec3(1.,.56,.24),ribbon*(.15+.21*drift)*meadowGlow);
              col=mix(col,vec3(.77,.30,.42),smoothstep(.13,.47,d.y)*.27*meadowGlow);
            }
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
            if(twinSky>0. && d.y>0.){
              vec2 p=vec2(atan(d.z,d.x),asin(clamp(d.y,0.,1.)));
              float strand=noise(p*vec2(6.,15.)+vec2(2.9,1.))*.66+noise(p*32.)*.34;
              float veil=exp(-pow((p.y-.23-.13*sin(p.x*2.+.8))*5.1,2.))*smoothstep(.32,.75,strand);
              col=mix(col,twinSky>1.5?vec3(.80,.66,.88):vec3(.73,.84,.76),veil*(twinSky>1.5?.35:.16));
              vec2 cell=p*vec2(120.,126.);float seed=hash(floor(cell));
              float spark=1.-smoothstep(.04/skyZoom,.22/skyZoom,length(fract(cell)-vec2(.3+.4*seed,.34+.30*hash(floor(cell)+7.))));
              col+=vec3(.91,.88,1.)*spark*step(.946,seed)*(.14+.37*smoothstep(.03,.7,d.y));
              if(panorama>0. && d.z<-.70){
                vec3 scene=twinHorizon(d,col,step(1.5,twinSky),crossingPhase);
                col=mix(col,scene,panorama);
                col=mix(col,horizon,.075*veil);
              }
            }
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
        for(const [i,site] of definition.sites.entries()){
          airWeights[i]=1-T.MathUtils.smoothstep(displacement(position,site).distance,35,96);
          total+=airWeights[i];
        }
        // Return to the open grassland sky beyond the documented sites.
        const open=atmosphere[home.id];
        let weight=Math.max(0,1-total);
        u.horizon.value.copy(open.horizon);u.zenith.value.copy(open.zenith);world.fog.color.copy(open.haze);
        let sun=open.sun*weight,fill=open.fill*weight,clouds=open.clouds*weight,moon=0;
        for(const [i,site] of definition.sites.entries()){
          const w=airWeights[i],a=atmosphere[site.id];if(!w)continue;
          weight+=w;const blend=w/weight;
          u.horizon.value.lerp(a.horizon,blend);u.zenith.value.lerp(a.zenith,blend);world.fog.color.lerp(a.haze,blend);
          sun+=w*a.sun;fill+=w*a.fill;clouds+=w*a.clouds;
          if(site.id==='sanctuary')moon=w;
        }
        u.cloudAmount.value=clouds/weight;u.moonStrength.value=moon/weight;
        u.meadowGlow.value=definition.id==='klose'?airWeights[0]/weight:0;
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
      if(body.setSunDirection)body.setSunDirection(pano.offset(definition.id,'star',flight.orbitTime).normalize());
      const f=body.frame(at.lat,at.lon),ground=body.point(at.lat,at.lon);
      const u=sky.material.uniforms;
      u.twinSky.value=definition.id==='alpha'?1:definition.id==='beta'?2:0;
      sister=u.twinSky.value===1?BETA_WORLD:u.twinSky.value===2?ALPHA_WORLD:null;
      sisterAbove=false;
      if(sister&&agl<=1800){
        pano.offset(definition.id,sister.id,flight.orbitTime,sisterDirection).sub(ground).addScaledVector(f.up,-agl);
        sisterDistance=sisterDirection.length();sisterDirection.normalize();
        sisterAbove=sisterDirection.dot(f.up)>0&&(!walking||openTwinSky(at));
      }
      if(!sisterAbove||!walking)throughScope=false;
      u.skyZoom.value=throughScope?18:1;
      u.panorama.value=sister&&!throughScope?1-T.MathUtils.smoothstep(agl,250,1500):0;
      u.crossingPhase.value=(flight.orbitTime%420)*(Math.PI*2/420);
      if(!world.fog)world.fog=new T.FogExp2(0x84655e,.00125);
      position=at;lightSurface(f,ground);
      const inCabin=phase==='cabin'||phase==='transfer'||(phase==='helm'&&!external);
      reflections.select(inCabin?true:agl>2800?false:definition.id,world,f.up);
      sky.visible=density>.001;stars.visible=density<.94;
      sky.material.uniforms.airDensity.value=density;
      world.background.setHex(0x071322);
      world.fog.density=.00125*density/(1+agl/160);
      const derelict=definition.kind==='ship';
      u.deepSpace.value=derelict?1:0;
      if(derelict){
        sky.visible=agl<20000;stars.visible=true;world.background.setHex(0x080b17);
        world.fog.density=walking?.00024:0;
        coreLight.position.copy(body.encounterCore);
        coreLight.visible=!walking||!body.isSheltered(at.lat,at.lon);
      }
      // Keep the star field inside the near camera on a deck exposed to space.
      stars.scale.setScalar(derelict&&agl<=1800?3600/(pano.far*.8):1);
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
      const route=berth.routes.find(r=>r.destination===origin?.destination);
      departurePort=route?{...berth,...route}:berth;
      origin={...origin,roomId:room.id,berthId:berth.id};
      dock?.dispose();dock=createCarrierDock(T,world,bodies.klose,room,berth.id);
      dockCenter=dock.root.position.clone();
    }
    function open(saved){
      buildWorld();origin=saved.origin;configureDock();
      flight=createPanoFlight(T,getSurface,dock,pano,saved.vehicle);
      usePlanet(saved.phase==='surface'&&regions[saved.planetId]?saved.planetId:flight.planetId);
      const current=saved.format===2||saved.format===3;
      phase=current&&['transfer','cabin','helm','surface'].includes(saved.phase)?saved.phase:'transfer';
      yaw=Number.isFinite(saved.yaw)?saved.yaw:0;pitch=clamp(Number(saved.pitch)||0,-1.1,1.12);
      facing=Number.isFinite(saved.facing)?saved.facing:yaw;eye=!!saved.eye;external=current&&!!saved.external;
      door=clamp(current&&Number.isFinite(saved.door)?saved.door:1,0,1);gear=flight.status().phase==='flying'?0:1;
      feet.set(0,0,11.8);
      if(current&&Array.isArray(saved.feet)&&saved.feet.length===3&&saved.feet.every(Number.isFinite))feet.fromArray(saved.feet);
      const portTarget=flights.has(departurePort.landingSiteId)?departurePort.landingSiteId:definition.landingSites[0].id;
      const vehiclePhase=flight.status().phase;
      const legacyTarget=vehiclePhase==='landed'?'dock':phase==='transfer'||vehiclePhase==='docked'?portTarget:definition.landingSites[0].id;
      navTarget=flights.has(saved.navTarget)?saved.navTarget:legacyTarget;
      transferSign=saved.transferSign===-1?-1:1;
      dock.setTravel(current&&Number.isFinite(saved.transfer)?saved.transfer:0);
      position=validPosition(saved.position)?{...saved.position}:{lat:home.lat,lon:home.lon};
      if(saved.format===2&&phase==='surface')position=compactSurfacePoint(position,definition);
      if(!current&&saved.phase==='surface'){
        // The previous radius was 780 km. Keep the visitor's distances from the meadow.
        position=compactSurfacePoint(position,definition,780000);
        flight.placeOnSurface('grassland');phase='surface';dock.setTravel(dock.total);
      }
      if(saved.format!==3&&phase==='surface'&&!saved.mapDestination)
        position=body.resolveArrival(position.lat,position.lon);
      pending=current&&['launch','auto'].includes(saved.pending)&&phase==='helm'?saved.pending:null;
      arrival='';observedBird=null;arrivedOnDeck=!!saved.arrivedOnDeck;approachRamp=false;feedback='';
      plotRoute(saved.locating?'shuttle-ramp':saved.targetId);
      if(phase==='surface'&&groundDestination(saved.mapDestination))relocate(saved.mapDestination,saved.approachMushroom===true);
      lastTime=null;lastAirLat=lastAirLon=undefined;previousFlight=flight.status().phase;
      stage.dataset.domain='planet';nav.hidden=false;atlas.hidden=true;
      seerRobots.setExpression(rig,boarding.expression);
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
      return {format:3,origin,phase,planetId:definition.id,position:{...position},vehicle:flight.snapshot(),feet:feet.toArray(),
        door,transfer:dock.travel,transferSign,external,navTarget,pending,arrivedOnDeck,yaw,pitch,eye,facing,targetId};
    }
    function say(text){feedback=text;feedbackUntil=performance.now()+3200;updateUI();}
    function flightTarget(id=navTarget){
      const s=flights.get(id)||flights.get(definition.landingSites[0].id);
      const p=id==='dock'?dock.position.clone():getSurface(s.planetId).point(s.lat,s.lon);
      return p.add(pano.offset(flight.planetId,s.planetId,flight.orbitTime));
    }
    function targetName(){
      const target=flights.get(navTarget);
      if(!target)return home.name;
      return navTarget==='dock'?target.name:regions[target.planetId].definition.name+' · '+target.name;
    }
    function setPhase(next,keepWalking=false){
      phase=next;
      if(keepWalking){pendingSteps.clear();lastTime=null;}else resetInput();
      observedBird=null;feedback='';drag=null;pitch=0;yaw=0;external=false;
      updateUI();requestFrame();persist();
    }
    function rampFoot(){return vec(...craft.layout.rampEnd).applyQuaternion(flight.quaternion).add(flight.position);}
    function rampApproach(metres){
      const groundBody=getSurface(flight.planetId),ground=coordinates(rampFoot(),groundBody),out=vec(0,0,1).applyQuaternion(flight.quaternion);
      const frame=groundBody.frame(ground.lat,ground.lon);
      return groundBody.move(ground.lat,ground.lon,metres*out.dot(frame.east),metres*out.dot(frame.north));
    }
    function parkedRamp(){
      return flight?.status().phase==='landed'?{id:'shuttle-ramp',planetId:flight.planetId,name:'登陆艇尾坡',description:'L-01 当前停放的位置',...rampApproach(1.1)}:null;
    }
    function relocate(id,approachMushroom=false){
      throughScope=false;
      const site=groundDestination(id);
      if(!site)return;
      const parked=localVehicle()&&flight.status().phase==='landed';
      const nearHull=parked&&body.point(site.lat,site.lon).distanceTo(flight.position)<9;
      const at=nearHull?rampApproach(1.1):site;
      // The authored scene centres are clear footpaths, including the chamber
      // floor under the cave roof. Use walker constraints rather than the flight lidar.
      position=body.resolveArrival(at.lat,at.lon);
      yaw=facing=id==='shuttle-ramp'||nearHull?-displacement(position,coordinates(flight.position)).bearing:0;
      if(site.lookAt&&!nearHull)yaw=facing=Math.atan2(site.x-site.lookAt[0],site.z-site.lookAt[1]);
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
      pitch=nearHull?0:site.lookPitch||0;walkPhase=0;observedBird=null;approachRamp=false;feedback='';arrival=site.name;
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
      const gate=walking&&body.portalAt?.(position.lat,position.lon);
      const atRamp=walking&&closeToRamp();
      openChart.hidden=phase==='transfer';openChart.querySelector('span').textContent=walking?(definition.kind==='ship'?'舱区图':'地表图'):'航线';
      land.hidden=observingWreck()||!(seated||aboard&&(zone==='seat'||dockDoor)||atRamp||gate);
      land.textContent=walking?(atRamp?'沿尾坡登艇':gate?'穿过星门 · '+regions[gate.planet].definition.name:'') :aboard?(dockDoor?'乘廊车回舰':'进入驾驶席'):
        pending?'正在锁舱':s.auto?'手动接管':arrivedOnDeck&&s.phase!=='flying'?'离席下船':docked?'手动离泊':s.phase==='landed'?'手动起飞':s.canCapture?'锁定对接口':s.canLand?'就地着陆':'制动';
      recall.hidden=!(walking&&localVehicle()&&s.phase==='landed'||seated&&!pending&&!s.auto);
      recall.textContent=walking?'定位登陆艇':'自动飞往'+targetName();
      optics.hidden=!seated;optics.textContent=external?'驾驶舱视角':'艇外视角';
      pad.hidden=phase==='transfer';hand.hidden=!seated;
      if(seated)stage.dataset.helm='true';else delete stage.dataset.helm;
      hint.hidden=false;
      if(phase==='transfer'){
        tag.textContent='赛尔号 · 登船廊车';status.textContent=origin.berthId.split(':').pop()+' 号泊位';
        hint.textContent=(transferSign>0?'前往 L-01 · '+targetName():'驶回传送舱 · '+departurePort.name)+'　'+Math.round(transferSign>0?dock.total-dock.travel:dock.travel)+' m';
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
        tag.textContent=site?.name||definition.name;status.textContent='SE-00001 · '+(definition.kind==='ship'?'拜伦号':body.waterDepth?.(position.lat,position.lon)>1.7?'水下':'地表');
      }
      const nearby=walking?nearbySpirit():null;
      const attraction=walking?safariAction(null):null;
      huntButton.hidden=!attraction;
      if(attraction)huntButton.textContent=attraction.label;
      const hasSpirit=canObserve(nearby);
      watch.hidden=!hasSpirit&&!(walking&&sisterAbove);if(!hasSpirit)observedBird=null;
      encounterButton.hidden=!hasSpirit||nearby.kind==='apparition';
      encounterButton.textContent=nearby?'接触'+nearby.name:'接触精灵';
      watch.textContent=walking&&sisterAbove&&!hasSpirit?(throughScope?'收起望远镜':'望远镜 · '+sister.name):observedBird!==null?'结束观察':'观察'+(nearby?.name||'精灵');
      if(nearby?.kind==='apparition')watch.textContent=observingWreck()?'放下观测镜':'举起观测镜';
      spiritBook.hidden=!walking&&phase!=='cabin';
      if(phase!=='surface'||feedback&&performance.now()<feedbackUntil){
        if(feedback&&performance.now()<feedbackUntil)hint.textContent=feedback;return;
      }
      if(throughScope){hint.textContent='18× 光学观测 · '+sister.name+'　／　距伴星中心 '+distanceText(sisterDistance);return;}
      if(observingWreck()){
        hint.textContent='引力撕裂区　／　拖动环视 · 滚轮变焦 · Esc 放下';return;
      }
      if(observedBird!==null&&nearby){hint.textContent=nearby.name+'　／　拖动环视 · E 接触 · Esc 返回';return;}
      while(path.length&&displacement(position,groundDestination(path[0])).distance<surfaceArrivalRadius(path[0])){
        arrival=groundDestination(path.shift()).name;
        if(!path.length){targetId=null;persist();}
      }
      if(!path.length){
        const fieldHint=body.safariHint(position.lat,position.lon)||body.spiritSiteHint(position.lat,position.lon);
        hint.textContent=atRamp?'已到登陆艇尾坡　／　按 E 登艇':fieldHint|| (arrival?'已抵达 · '+arrival:site?.description||'打开地表图选择目的地');return;
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
        const dest=flights.get(navTarget);
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
    function mainAction(fromKeyboard=false){
      const s=flight.status();
      if(phase==='surface'){
        if(fromKeyboard&&observedBird!==null){if(!encounterButton.hidden)encounterButton.click();return;}
        if(closeToRamp()){boardGround();return;}
        const gate=body.portalAt?.(position.lat,position.lon);
        if(gate&&regions[gate.planet]?.byId.has(gate.site)){
          usePlanet(gate.planet);relocate(gate.site);updateUI();requestFrame();persist();return;
        }
        if(!fromKeyboard)return;
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
      const fov=throughScope?2*Math.atan(Math.tan(49*Math.PI/360)/18)*180/Math.PI:
        observingWreck()?49*observation.zoom:
        phase==='cabin'||phase==='transfer'||(phase==='helm'&&!external)?68:49;
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
      const roomId=definition.kind==='ship'?body.siteAt(position.lat,position.lon)?.id:null;
      const atWindow=roomId==='byron-witness';
      view.up.copy(f.up);
      if(eye){
        view.position.copy(aim);view.lookAt(aim.clone().addScaledVector(dir,Math.cos(pitch)).addScaledVector(f.up,Math.sin(pitch)));
      }else{
        const angle=clamp(.23-pitch,-.12,1.0),back=boom*Math.cos(angle);
        const behind=body.move(position.lat,position.lon,Math.sin(yaw)*back,-Math.cos(yaw)*back);
        const minHeight=body.height(behind.lat,behind.lon)-body.height(position.lat,position.lon)+.35;
        view.position.copy(aim).addScaledVector(dir,-back).addScaledVector(f.up,Math.max(minHeight-1.08,boom*Math.sin(angle)));
        const focus=aim.clone().addScaledVector(dir,1.35);
        if(definition.palette||definition.kind==='ship')focus.addScaledVector(f.up,Math.sin(Math.max(0,pitch))*boom*.87+.20);
        if(atWindow&&boom>3.2){
          const shoulder=dir.clone().cross(f.up).multiplyScalar(Math.min(1.55,boom*.29));
          view.position.add(shoulder).addScaledVector(f.up,1.28);
          focus.add(shoulder).addScaledVector(f.up,1.38);
        }
        if(roomId==='byron-hold'&&boom>3){
          // Look down the annular walkway at the four rear training machines.
          // Moving the mouse and rolling into shoulder distance still work.
          const weight=T.MathUtils.smoothstep(boom,3,4.8);
          const rise=clamp(boom*1.43-pitch*4,2.0,9.1);
          const high=p.clone().addScaledVector(f.up,rise+1).addScaledVector(dir,-boom*.46);
          const ahead=p.clone().addScaledVector(dir,boom*2.98).addScaledVector(f.up,1.25+pitch*9);
          view.position.lerp(high,weight);focus.lerp(ahead,weight);
        }
        body.clipCamera?.(aim,view.position);
        view.lookAt(focus);
      }
      const side=atWindow?-1.68:eye?.98:1.45,forward=atWindow?-.66:eye?2.5:-.24;
      const dx=Math.cos(yaw)*side-Math.sin(yaw)*forward,dz=-Math.sin(yaw)*side-Math.cos(yaw)*forward;
      const peer=body.move(position.lat,position.lon,dx,-dz);
      nono.followOnPlanet(dx,body.height(peer.lat,peer.lon)-body.height(position.lat,position.lon),dz,yaw+Math.PI,dt,true);
      if(observedBird!==null){
        const bird=nearbySpirit();
        if(canObserve(bird)&&bird.kind==='apparition'){
          local.visible=false;escort.hide();view.position.copy(p).addScaledVector(f.up,seerRobots.eyeHeight);
          const aim=bird.focusPoint.clone().sub(view.position).normalize();
          if(atWindow){
            const deck=region.byId.get('byron-deck');
            const hullDirection=body.point(deck.lat,deck.lon).sub(view.position).normalize();
            aim.lerp(hullDirection,.35*T.MathUtils.smoothstep(observation.zoom,.44,1)).normalize();
          }
          aim.applyAxisAngle(f.up,observation.bearing);
          const right=aim.clone().cross(f.up).normalize();
          aim.applyAxisAngle(right,observation.elevation);view.lookAt(aim.add(view.position));
        }else if(canObserve(bird)){
          const aim=bird.focusPoint;
          const distance=Math.max(1.45,(bird.size||.42)*2.4)*observation.zoom;
          const flat=distance*Math.cos(observation.elevation),frame=body.frame(bird.lat,bird.lon);
          view.position.copy(aim).addScaledVector(frame.north,Math.cos(observation.bearing)*flat)
            .addScaledVector(frame.east,Math.sin(observation.bearing)*flat)
            .addScaledVector(frame.up,distance*Math.sin(observation.elevation));
          local.visible=false;escort.hide();
          body.clipCamera?.(aim,view.position);view.lookAt(aim);
        }else observedBird=null;
      }
      if(throughScope){
        local.visible=false;escort.hide();view.position.copy(p).addScaledVector(f.up,seerRobots.eyeHeight);
        view.lookAt(view.position.clone().add(sisterDirection));
      }
      sky.position.copy(view.position);sky.quaternion.copy(f.quaternion);sky.scale.setScalar(1800);
      return f;
    }
    function step(forward,side,metres,dt){
      if((!forward&&!side)||!metres)return 0;
      throughScope=false;
      const {x,z}=walkDirection(forward,side,yaw),start=position;
      const parked=localVehicle()&&flight.status().phase==='landed'&&body.point(start.lat,start.lon).distanceTo(flight.position)<18;
      const steps=Math.max(1,Math.ceil(metres/.23)),tip=craft.layout.rampEnd[2];
      if(parked)originRotation.copy(flight.quaternion).invert();
      function advance(east,north){
        const next=body.walk(position.lat,position.lon,east,north);
        if(parked){
          const q=body.point(next.lat,next.lon).sub(flight.position).applyQuaternion(originRotation);
          if(Math.abs(q.y)<4){
            if(door>=.98&&Math.abs(q.x)<.95&&q.z>tip-.65&&q.z<tip){position=next;crossSill(q);return true;}
            if(Math.abs(q.x)<2.5&&q.z<5.6&&q.z>-5.5)return false;
          }
        }
        position=next;return true;
      }
      for(let i=0;i<steps&&phase==='surface';i++){
        const east=x*metres/steps,north=-z*metres/steps;
        if(!advance(east,north)&&east&&north&&!advance(east,0))advance(0,north);
      }
      if(phase!=='surface')return 0;
      const motion=displacement(start,position);
      if(motion.distance>.0005){
        const delta=-motion.bearing-facing;
        facing+=Math.atan2(Math.sin(delta),Math.cos(delta))*(1-Math.exp(-15*dt));
        requestSafari(body.safariWalk(position.lat,position.lon));
      }
      arrival='';observedBird=null;
      return dt?Math.min(metres,motion.distance)/dt:0;
    }
    function tapStep(code,metres){
      const along=Number(code==='KeyW'||code==='ArrowUp')-Number(code==='KeyS'||code==='ArrowDown');
      const side=Number(code==='KeyD')-Number(code==='KeyA');
      step(along,side,metres,.08);
    }
    let frameDt=0,previousFlight='',brakeUntil=0;
    function pressed(code){return keys.has(code)||[...touch.values()].includes(code);}
    function disembark(){
      const ground=coordinates(rampFoot()),face=vec(0,0,1).applyQuaternion(flight.quaternion);
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
      const forward=Number(pressed('KeyW')||pressed('ArrowUp'))-Number(pressed('KeyS')||pressed('ArrowDown'));
      const side=Number(pressed('KeyD'))-Number(pressed('KeyA'));
      if(forward||side)approachRamp=false;
      if(phase==='surface'&&approachRamp&&dt){
        const ramp=rampFoot(),d=displacement(position,coordinates(ramp));
        if(d.distance<.10){crossSill(vec(0,0,craft.layout.rampEnd[2]));return 0;}
        const stride=Math.min(2.4*dt,d.distance);
        const old=position;
        position=body.walk(old.lat,old.lon,stride*Math.sin(d.bearing),stride*Math.cos(d.bearing));
        const progress=d.distance-displacement(position,coordinates(ramp)).distance;
        if(progress<stride*.1){approachRamp=false;say('请从尾坡正后方登艇');}
        facing=-d.bearing;return Math.min(stride,displacement(old,position).distance)/dt;
      }
      yaw+=(Number(pressed('ArrowLeft'))-Number(pressed('ArrowRight')))*dt*1.55;
      if((forward||side)&&dt){
        const speed=pressed('ShiftLeft')||pressed('ShiftRight')?walkPace.run:walkPace.walk;
        pendingSteps.clear();
        if(phase==='surface')return step(forward,side,speed*dt,dt);
        const dir=walkDirection(forward,side,yaw),before=feet.clone();
        cabinStep(dir.x*speed*dt,dir.z*speed*dt);return Math.min(speed,before.distanceTo(feet)/dt);
      }
      return 0;
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
      stars.position.copy(view.position);
      // Put an angularly identical proxy inside the ground camera's depth range.
      // Drawing it before the terrain preserves occultation by local ridges.
      if(sister){
        const display=skyPlanets[sister.id];
        display.visible=sisterAbove&&agl<=1800&&sky.material.uniforms.panorama.value<.5;
        if(display.visible){
          display.position.copy(view.position).addScaledVector(sisterDirection,1400);
          display.scale.setScalar(1400/sisterDistance);
          display.material.uniforms.sunDir.value.copy(pano.center(sister.id,flight.orbitTime)).normalize().negate();
        }
      }
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
      const handInput=phase==='helm'&&atlas.hidden&&!stage.dataset.consoleOpen&&!s.auto;
      let remaining=dt;
      while(remaining>0){
        const sub=flightPulses.size?Math.min(remaining,...flightPulses.values()):remaining;
        const held=k=>pressed(k)||flightPulses.has(k),axis=(a,b)=>Number(held(a))-Number(held(b));
        flight.tick(sub,handInput?{forward:axis('KeyW','KeyS'),turn:Number(held('KeyD')||held('ArrowRight'))-Number(held('KeyA')||held('ArrowLeft')),
        strafe:axis('KeyR','KeyQ'),pitch:axis('ArrowUp','ArrowDown'),lift:axis('Space','KeyC'),
        boost:held('ShiftLeft')||held('ShiftRight'),brake:held('KeyX')||time<brakeUntil}:{});
        for(const [key,left] of flightPulses){if(left<=sub)flightPulses.delete(key);else flightPulses.set(key,left-sub);}
        remaining-=sub;
      }
      if(phase==='helm'&&dt)pendingSteps.clear();
      s=flight.status();
      if(phase!=='surface'&&definition.id!==flight.planetId)usePlanet(flight.planetId);
      pano.update(definition.id,flight.orbitTime);
      dock.root.position.copy(dockCenter).add(pano.offset(definition.id,'klose',flight.orbitTime));
      dock.root.updateMatrixWorld(true);
      if(s.phase!==previousFlight){
        arrivedOnDeck=s.phase!=='flying';
        if(s.phase==='landed')navTarget='dock';
        else if(s.phase==='docked')navTarget=departurePort.landingSiteId||definition.landingSites[0].id;
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
    function drawSystemChart(svg,selected,onSelect,storedVehicle){
      kloseTerrain??=createKloseTerrain(T);
      const current=phase==='hidden'?'klose':definition.id;
      const time=phase==='hidden'&&storedVehicle?storedVehicle.orbitTime||0:flight?.orbitTime||0;
      const carrier=dock?.position||kloseCarrierStation(kloseTerrain);
      const restored=phase==='hidden'?storedVehicle:null;
      drawPanoChart(svg,{time,current,selected,onSelect,carrier,
        vehicle:restored?.phase==='docked'?carrier:restored?.p?vec(...restored.p):flight?.position||carrier,vehiclePlanet:restored?.planetId||flight?.planetId||'klose'});
    }
    function showSelection(){
      const id=select.value;
      const dest=flightTarget(id),name=flights.get(id);
      const planet=regions[name.planetId].definition;
      summary.textContent=(id==='dock'?'克洛斯星驻留轨道 · 原泊位':planet.name+(planet.kind==='ship'?' · 幽灵飞船':' · 半径 '+(planet.radius/1000)+' 公里')+' · '+name.name)+
        '　／　直距 '+distanceText(dest.distanceTo(flight.position));
      if(id==='dock')atlasView='system';
      for(const button of atlasModes){
        button.disabled=button.dataset.atlasView==='landing'&&id==='dock';
        button.setAttribute('aria-pressed',String(button.dataset.atlasView===atlasView));
      }
      if(atlasView==='landing'){
        const key=[id,chart.parentElement.clientWidth,chart.parentElement.clientHeight].join('/');
        if(key===landingViewKey)return;
        landingViewKey=key;chart.setAttribute('aria-label',planet.name+'着陆点');
        drawSurfaceMap(chart,{region:regions[name.planetId],selected:id,flightOnly:true,onSelect:pad=>{
          select.value=pad;showSelection();
        }});
      }else{
        landingViewKey='';chart.setAttribute('aria-label','帕诺星系轨道与泊位');
        drawSystemChart(chart,id==='dock'?'dock':name.planetId,selected=>{
          select.value=selected==='dock'?'dock':regions[selected].definition.landingSites[0].id;
          atlasView=selected==='dock'?'system':'landing';showSelection();
        });
      }
    }
    function toggleAtlas(){
      if(!atlas.hidden){
        atlas.hidden=true;delete stage.dataset.consoleOpen;canvas.focus({preventScroll:true});requestFrame();return;
      }
      if(phase==='transfer'||phase==='hidden')return;
      if(phase==='surface'){resetInput();browseMap();return;}
      const helm=phase==='helm';
      resetInput();select.replaceChildren();
      for(const {definition:def} of Object.values(regions)){
        const group=document.createElement('optgroup');group.label=def.name;
        for(const site of def.landingSites)group.append(new Option(def.name+' · '+site.name,site.id));
        select.append(group);
      }
      select.add(new Option('赛尔号 · 原泊位','dock'));select.value=navTarget;
      landingViewKey='';atlasView='system';chart.parentElement.scrollTop=0;
      chart.setAttribute('aria-label','帕诺星系行星轨道、舰艇位置与目的地');
      trackButton.hidden=!helm;trackButton.disabled=targetOnly.disabled=!!pending;
      unseat.hidden=!helm||!!pending;atlas.hidden=false;stage.dataset.consoleOpen='planet';
      showSelection();closeButton.focus({preventScroll:true});
    }
    listen(openChart,'click',toggleAtlas);listen(closeButton,'click',toggleAtlas);
    listen(atlas,'click',e=>{if(e.target===atlas)toggleAtlas();});
    listen(select,'change',()=>{showSelection();if(atlasView==='landing')revealMapAddress(chart,select.value);});
    for(const button of atlasModes)listen(button,'click',()=>{
      atlasView=button.dataset.atlasView;chart.parentElement.scrollTop=0;showSelection();
    });
    listen(trackButton,'click',()=>{
      navTarget=select.value;toggleAtlas();flyCommand('auto');
    });
    listen(targetOnly,'click',()=>{navTarget=select.value;toggleAtlas();if(flight.status().auto)flight.manual();updateUI();persist();});
    listen(unseat,'click',()=>{toggleAtlas();setPhase('cabin');});
    listen(land,'click',()=>mainAction());
    listen(watch,'click',()=>{
      if(phase!=='surface')return;
      const nearest=nearbySpirit();
      if(sisterAbove&&!canObserve(nearest)){throughScope=!throughScope;updateUI();requestFrame();return;}
      if(observedBird!==null)observedBird=null;
      else{
        if(canObserve(nearest))observe(nearest);
      }
      updateUI();requestFrame();
    });
    listen(recall,'click',()=>{
      if(phase==='surface'){plotRoute(targetId==='shuttle-ramp'?null:'shuttle-ramp');arrival='';updateUI();persist();}
      else flyCommand('auto');
    });
    function toggleView(){
      if(throughScope){throughScope=false;updateUI();requestFrame();return;}
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
      if(phase==='hidden'||(stage.dataset.consoleOpen&&atlas.hidden)||boarding.commsOpen||e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||e.isComposing)return;
      if(e.target!==window&&e.target!==document&&e.target!==document.body&&e.target!==document.documentElement&&!root.contains(e.target))return;
      if(!atlas.hidden){
        cycleDialogFocus(e,atlas);
        if(e.key==='Escape'||(seerControlCode(e)==='KeyM'&&!e.target.closest?.('select')&&!e.repeat)){e.preventDefault();toggleAtlas();}return;
      }
      if(e.target.closest?.('select,input,textarea'))return;
      const code=seerControlCode(e);
      if(code==='Escape'&&(throughScope||observedBird!==null)){
        e.preventDefault();throughScope=false;observedBird=null;updateUI();requestFrame();return;
      }
      if(code==='KeyN'&&(phase==='surface'||phase==='cabin')){
        e.preventDefault();if(!e.repeat)greetCompanion();return;
      }
      if(code==='KeyM'){e.preventDefault();if(!e.repeat)toggleAtlas();return;}
      if(code==='KeyV'&&(phase==='surface'||phase==='helm')){e.preventDefault();if(!e.repeat)toggleView();return;}
      if(code==='KeyE'&&phase!=='transfer'){e.preventDefault();if(!e.repeat)mainAction(true);return;}
      if(phase!=='transfer'&&keyNames.has(code)){
        e.preventDefault();if(!keys.has(code))pendingSteps.set(code,code);keys.add(code);requestFrame();
      }
    });
    listen(window,'keyup',e=>{
      const code=seerControlCode(e);
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
      if(observedBird!==null&&phase==='surface'){
        observation.bearing-=dx*.006;observation.elevation=clamp(observation.elevation+dy*.004,observingWreck()?-.95:-.04,1.12);
      }else{yaw-=dx*.004;pitch=clamp(pitch-dy*.004,-1.1,1.12);}
      requestFrame();
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
          if(canObserve(chosen)){observe(chosen);updateUI();requestFrame();}
        }
      }
      persist();
    });
    listen(canvas,'wheel',e=>{
      if(phase==='hidden'||!atlas.hidden)return;e.preventDefault();
      const factor=Math.exp(clamp(e.deltaY,-170,170)*.0018);
      if(phase==='helm'&&external)chaseBoom.length=clamp(chaseBoom.length*factor,13,55);
      else if(observingWreck())observation.zoom=clamp(observation.zoom*factor,.22,1.76);
      else if(phase==='surface'&&observedBird!==null)observation.zoom=clamp(observation.zoom*factor,.75,2.8);
      else if(phase==='surface')boom=clamp(boom*factor,2.4,8);
      requestFrame();
    },{passive:false});
    function shortStep(code){
      if(phase==='helm'){flightPulses.set(code,.055);return;}
      if(phase==='surface'){approachRamp=false;tapStep(code,.24);return;}
      if(phase!=='cabin')return;
      const side=Number(code==='KeyD')-Number(code==='KeyA');
      const along=Number(code==='KeyW'||code==='ArrowUp')-Number(code==='KeyS'||code==='ArrowDown');
      const {x,z}=walkDirection(along,side,yaw);
      cabinStep(.24*x,.24*z);
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
      surfaceNavigation(){
        if(phase!=='surface')return null;
        const near=nearestSite(position),site=displacement(position,near).distance<58?near:null;
        return {planetId:definition.id,position,nearestId:near.id,location:site?.name||definition.name,targetId,routeTo:walkingRoute,
          canLookNorth:openTwinSky(position)};
      },
      guideTo(id){
        if(phase!=='surface')return;
        arrival='';observedBird=null;throughScope=false;approachRamp=false;
        plotRoute(id);updateUI();persist();requestFrame();
      },
      visitSurface(planet,id,approachBoss){
        if(phase!=='surface')return false;
        const ramp=id==='shuttle-ramp'&&rampOnPlanet(parkedRamp(),planet);
        if(!regions[planet]?.byId.has(id)&&!ramp)return false;
        if(planet!==definition.id)usePlanet(planet);
        relocate(id,approachBoss);updateUI();requestFrame();persist();return true;
      },
      lookNorth(){
        if(phase!=='surface'||!openTwinSky(position))return;
        observedBird=null;throughScope=false;yaw=.16;pitch=.24;updateUI();requestFrame();persist();
      },
      setFlameTool(value){flameTool=!!value;requestFrame();},
      previewExpression(){
        if(phase!=='surface')return;
        seerRobots.setExpression(rig,boarding.expression);throughScope=false;observedBird=null;eye=false;
        yaw=facing+Math.PI;pitch=.035;boom=2.65;
        updateUI();requestFrame();persist();
      },
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
      rig.screen.material.dispose();
      for(const display of Object.values(skyPlanets))display.material.dispose();
      lamp.shadow.map?.dispose();for(const mesh of [sky,stars]){mesh.geometry.dispose();mesh.material.dispose();}
    }};
  }
