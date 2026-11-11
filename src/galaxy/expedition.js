  // The globe, the walking surface and the star chart share angular coordinates.
  // The only ship-specific information kept on an expedition is its return berth.
  function createPlanetExpedition(requestFrame,persist,returnHome){
    const nav=stage.querySelector('[data-planet-nav]'),atlas=stage.querySelector('[data-planet-atlas]');
    const openChart=nav.querySelector('[data-atlas]'),land=nav.querySelector('[data-land]');
    const recall=nav.querySelector('[data-return]'),pad=stage.querySelector('[data-move-pad]');
    const watch=stage.querySelector('[data-see-pipi]');
    const select=atlas.querySelector('[data-site-select]'),chart=atlas.querySelector('[data-site-map]');
    const summary=atlas.querySelector('[data-site-summary]'),closeButton=atlas.querySelector('[data-chart-close]');
    const hint=stage.querySelector('[data-route-hint]'),trackButton=atlas.querySelector('[data-track-site]');
    const sites=KLOSE_WORLD.sites,byId=new Map(sites.map(s=>[s.id,s])),home=byId.get('grassland');
    const radius=KLOSE_WORLD.radius,clamp=T.MathUtils.clamp;
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
      sanctuary:air(0x99d8f3,0x326dc4,0x8ab8dd,.33,.99,.54)
    };
    const airWeights=new Float32Array(sites.length);
    let lastAirLat,lastAirLon;
    const keys=new Set(),touch=new Map(),pendingSteps=new Map(),events=new AbortController();
    const listen=(el,type,fn,options={})=>el.addEventListener(type,fn,{...options,signal:events.signal});
    let world,body,view,local,rig,drill,contact,nono,stars,sky,lamp,bounce,daylight;
    let phase='hidden',origin=null,position={lat:home.lat,lon:home.lon},yaw=0,pitch=.03,boom=5.1;
    const defaultOrbitZoom=4.6;
    let orbitLat=home.lat+.18,orbitLon=home.lon-.28,orbitZoom=defaultOrbitZoom,elapsed=0,lastTime=null,walkPhase=0;
    let targetId=null,path=[],facing=0,eye=false,drag=null,arrival='',approach=null,shownMode='',uiClock=0;
    let watching=false;
    let visible=true;
    const observer=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);if(visible)requestFrame();else resetInput();});
    observer.observe(stage);
    const keyNames=new Set(['KeyW','KeyS','KeyA','KeyD','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','ShiftLeft','ShiftRight']);
    function resetInput(){keys.clear();touch.clear();pendingSteps.clear();drag=null;lastTime=null;}
    function displacement(a,b){
      const dl=b.lon-a.lon;
      const east=Math.cos(b.lat)*Math.sin(dl);
      const north=Math.cos(a.lat)*Math.sin(b.lat)-Math.sin(a.lat)*Math.cos(b.lat)*Math.cos(dl);
      const dot=Math.sin(a.lat)*Math.sin(b.lat)+Math.cos(a.lat)*Math.cos(b.lat)*Math.cos(dl);
      const bearing=Math.atan2(east,north);
      const distance=radius*Math.atan2(Math.hypot(east,north),dot);
      return {east:distance*Math.sin(bearing),north:distance*Math.cos(bearing),distance,bearing};
    }
    function nearestSite(){
      return sites.reduce((a,b)=>displacement(position,a).distance<=displacement(position,b).distance?a:b);
    }
    function plotRoute(id){
      targetId=byId.has(id)?id:null;path=[];
      if(!targetId)return;
      const start=nearestSite().id;
      const queue=[[start]],seen=new Set([start]);
      for(let i=0;i<queue.length;i++){
        const route=queue[i],last=route[route.length-1];
        if(last===id){path=route;break;}
        for(const [a,b] of KLOSE_WORLD.routes){
          const next=a===last?b:b===last?a:null;
          if(next&&!seen.has(next)){seen.add(next);queue.push([...route,next]);}
        }
      }
      if(path.length>1 && displacement(position,byId.get(path[0])).distance<24)path.shift();
    }
    function buildWorld(){
      if(world)return;
      world=new T.Scene();view=new T.PerspectiveCamera(49,1,.1,radius*8);
      body=createKloseSurface(T,world);
      local=new T.Group();world.add(local);
      rig=seerRobots.create(0xd84a38,{name:'SE-00001 · 地表行走',castShadow:true});
      local.add(rig.root);contact=createSoleContacts(1);local.add(contact.mesh);
      nono=createSuperNono(1,local);drill=createMiningDrill(world);
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
          cloudAmount:{value:0},moonStrength:{value:0},ringPlane:{value:new T.Vector3()},
          ringBounds:{value:new T.Vector2(rings.inner,rings.outer)}},
        vertexShader:'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader:`varying vec3 direction;uniform vec3 sun,horizon,zenith,ringPlane;
          uniform vec2 ringBounds;uniform float cloudAmount,moonStrength;
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
            gl_FragColor=vec4(col,1.);}`
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
        const open=atmosphere.grassland;
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
    function setDetail(mode){
      if(mode===shownMode)return;
      body.setMode(mode);shownMode=mode;
      const ground=mode==='surface';
      stars.visible=!ground;sky.visible=ground;
      lamp.castShadow=ground;
      if(!ground){
        lamp.position.copy(daylight).multiplyScalar(radius*3);lamp.target.position.set(0,0,0);
        lamp.intensity=1.16;bounce.intensity=.36;bounce.position.set(0,1,0);
      }
      lastAirLat=lastAirLon=undefined;
      world.background=new T.Color(ground?atmosphere.grassland.horizon:0x071322);
      world.fog=ground?new T.FogExp2(atmosphere.grassland.haze,.00125):null;
    }
    function validPosition(p){
      return p&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=Math.PI/2&&Number.isFinite(p.lon);
    }
    function open(saved){
      buildWorld();
      origin=saved.origin;phase=saved.phase==='surface'?'surface':'orbit';
      position=validPosition(saved.position)?{...saved.position}:{lat:home.lat,lon:home.lon};
      yaw=Number.isFinite(saved.yaw)?saved.yaw:0;pitch=clamp(Number(saved.pitch)||0,-.90,.97);
      facing=Number.isFinite(saved.facing)?saved.facing:yaw;eye=Boolean(saved.eye);
      const savedZoom=Number(saved.zoom);
      orbitZoom=Number.isFinite(savedZoom)&&savedZoom>0&&(saved.ringFraming||savedZoom!==3.3)
        ?clamp(savedZoom,2.1,7):defaultOrbitZoom;
      orbitLat=clamp(Number.isFinite(saved.orbitLat)?saved.orbitLat:home.lat+.18,-1.52,1.52);
      orbitLon=Number.isFinite(saved.orbitLon)?saved.orbitLon:home.lon-.28;
      arrival='';watching=false;plotRoute(saved.targetId);lastTime=null;
      stage.dataset.domain='planet';nav.hidden=false;atlas.hidden=true;
      seerRobots.setExpression(rig,origin?.board?.smiling?'smile':'neutral');
      drill.set(boarding.pack().drillEquipped);updateUI();requestFrame();
    }
    function hide(){
      if(phase==='hidden')return;
      phase='hidden';resetInput();body.setMode('hidden');shownMode='';
      nav.hidden=pad.hidden=atlas.hidden=hint.hidden=watch.hidden=true;drill.hide();local.visible=false;
      delete stage.dataset.domain;delete stage.dataset.consoleOpen;
    }
    function snapshot(){
      return {origin,phase:phase==='surface'||phase==='descent'?'surface':'orbit',position:{...position},
        yaw,pitch,eye,facing,targetId,orbitLat,orbitLon,zoom:orbitZoom,ringFraming:true};
    }
    function updateUI(){
      const ground=phase==='surface',flying=phase==='ascent'||phase==='descent';
      land.hidden=flying;openChart.hidden=flying;recall.hidden=flying;pad.hidden=!ground;
      if(phase==='hidden')return;
      const site=ground?body.siteAt(position.lat,position.lon):null;
      const nearby=ground?body.nearestPipi(position.lat,position.lon):null;
      watch.hidden=!nearby||nearby.distance>14;
      if(watch.hidden)watching=false;
      watch.textContent=watching?'结束观察':'观察皮皮';
      tag.textContent=ground?(site?.name.startsWith('克洛斯星')?site.name:'克洛斯星 · '+(site?.name||'野外')):'帕诺星系 · 克洛斯星';
      status.textContent=ground?'SE-00001 · 地表':flying?(phase==='descent'?'草原进近':'升入轨道'):'行星轨道';
      land.textContent=ground?(displacement(position,home).distance<=18?'返回轨道':'引导至着陆区'):'着陆草原';
      nav.setAttribute('aria-label',ground?'地表通讯':'轨道导航');
      hint.hidden=Boolean(!ground&&phase!=='orbit');
      if(phase==='orbit')hint.textContent='克洛斯星　／　着陆区 · 草原';
      if(!ground)return;
      if(watching){hint.textContent='010 皮皮　／　飞行系　·　37 厘米';return;}
      while(path.length && displacement(position,byId.get(path[0])).distance<9){
        arrival=byId.get(path.shift()).name;
        if(!path.length){targetId=null;persist();}
      }
      if(!path.length){
        hint.textContent=arrival?'已抵达 · '+arrival:site?.description||'打开地表图选择目的地';return;
      }
      const next=byId.get(path[0]),d=displacement(position,next);
      const angle=d.bearing+yaw;
      const arrows=['↑','↗','→','↘','↓','↙','←','↖'];
      hint.textContent=arrows[((Math.round(angle/(Math.PI/4))%8)+8)%8]+'  '+next.name+'  '+Math.round(d.distance)+' 米'+
        (path.length>1?'　／　终点 '+byId.get(targetId).name:'');
    }
    function liftOff(){
      if(phase!=='orbit'&&phase!=='surface')return;
      if(phase==='surface'&&displacement(position,home).distance>18){
        watching=false;arrival='';plotRoute(home.id);updateUI();persist();return;
      }
      const descending=phase==='orbit';
      if(descending){position=body.move(home.lat,home.lon,0,-5);yaw=facing=0;pitch=.025;arrival='';plotRoute(targetId);}
      watching=false;approach=body.frame(position.lat,position.lon);elapsed=0;lastTime=null;
      phase=descending?'descent':'ascent';resetInput();updateUI();requestFrame();
    }
    function setLens(near,far){
      const aspect=stage.clientWidth/Math.max(1,stage.clientHeight);
      if(view.near!==near||view.far!==far||view.aspect!==aspect){
        Object.assign(view,{near,far,aspect});view.updateProjectionMatrix();
      }
    }
    function orbitPoint(){
      const aspect=stage.clientWidth/Math.max(1,stage.clientHeight);
      return body.frame(orbitLat,orbitLon).up.multiplyScalar(radius*orbitZoom*Math.max(1,1/aspect));
    }
    function surfaceCamera(dt){
      const f=body.frame(position.lat,position.lon),p=body.point(position.lat,position.lon,.015);
      lightSurface(f,p);
      local.position.copy(p);local.quaternion.copy(f.quaternion);rig.root.rotation.y=facing;
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
        view.lookAt(aim.clone().addScaledVector(dir,1.35));
      }
      const side=eye?.98:1.45,forward=eye?2.5:-.24;
      const dx=Math.cos(yaw)*side-Math.sin(yaw)*forward,dz=-Math.sin(yaw)*side-Math.cos(yaw)*forward;
      const peer=body.move(position.lat,position.lon,dx,-dz);
      nono.followOnPlanet(dx,body.height(peer.lat,peer.lon)-body.height(position.lat,position.lon),dz,yaw+Math.PI,dt);
      if(watching){
        const bird=body.nearestPipi(position.lat,position.lon);
        if(bird&&bird.distance<14){
          const aim=body.point(bird.lat,bird.lon,.26);
          view.position.copy(aim).addScaledVector(f.south,1.45).addScaledVector(f.east,.85).addScaledVector(f.up,.50);
          view.lookAt(aim);
        }else watching=false;
      }
      sky.position.copy(view.position);sky.quaternion.copy(f.quaternion);sky.scale.setScalar(1800);
      return f;
    }
    function step(forward,side,metres,dt){
      const len=Math.hypot(forward,side);if(!len||!metres)return;
      const east=(side*Math.cos(yaw)-forward*Math.sin(yaw))/len,north=(side*Math.sin(yaw)+forward*Math.cos(yaw))/len;
      position=body.walk(position.lat,position.lon,east*metres,north*metres);
      const delta=Math.atan2(-east,north)-facing;
      facing+=Math.atan2(Math.sin(delta),Math.cos(delta))*(1-Math.exp(-15*dt));arrival='';watching=false;
    }
    function tapStep(code,metres){
      const along=Number(code==='KeyW'||code==='ArrowUp')-Number(code==='KeyS'||code==='ArrowDown');
      const side=Number(code==='KeyD')-Number(code==='KeyA');
      step(along,side,metres,.08);
    }
    function draw(time){
      if(phase==='hidden'||document.hidden||!visible)return false;
      const dt=lastTime===null?0:clamp((time-lastTime)/1000,0,.12);lastTime=time;
      if(!atlas.hidden)return false;
      if(phase==='orbit'){
        const orbital=orbitPoint();
        setDetail('orbit');setLens(radius*.006,orbital.length()+radius*6);local.visible=false;drill.hide();
        view.position.copy(orbital);view.up.set(0,1,0);view.lookAt(0,0,0);
      }else if(phase==='surface'){
        setDetail('surface');setLens(.08,4200);local.visible=true;rig.root.visible=contact.mesh.visible=!eye;
        const pressed=code=>keys.has(code)||[...touch.values()].includes(code);
        yaw+=(Number(pressed('ArrowLeft'))-Number(pressed('ArrowRight')))*dt*1.55;
        const forward=Number(pressed('KeyW')||pressed('ArrowUp'))-Number(pressed('KeyS')||pressed('ArrowDown'));
        const side=Number(pressed('KeyD'))-Number(pressed('KeyA'));
        const len=Math.hypot(forward,side),speed=len?(pressed('ShiftLeft')||pressed('ShiftRight')?6.8:3.6):0;
        if(len&&dt){step(forward,side,speed*dt,dt);pendingSteps.clear();}
        body.update(position.lat,position.lon,dt);surfaceCamera(dt);
        walkPhase+=seerRobots.phaseStep(speed,dt);seerRobots.animate(rig,walkPhase,speed,dt);
        contact.write(0,0,.012,0,facing,rig.bones);contact.finish(1);drill.update(rig.bones.core,dt,!eye);
        if(time-uiClock>170){updateUI();uiClock=time;}
      }else{
        elapsed+=dt;const u=clamp(elapsed/4.2,0,1),t=phase==='descent'?u:1-u;
        const s=t*t*(3-2*t),foot=body.point(position.lat,position.lon);
        const orbital=orbitPoint(),startHeight=Math.max(radius*.5,orbital.length()-foot.length());
        const height=4*Math.pow(startHeight/4,1-s),mix=1-Math.pow(1-s,4);
        const normal=orbital.normalize().lerp(approach.up,mix).normalize();
        const distant=height>1500,near=distant?Math.max(1,height*.001):.1;
        setDetail(distant?'orbit':'surface');setLens(near,distant?height+radius*7:4200);
        if(shownMode==='surface'){
          body.update(position.lat,position.lon,dt);
          lightSurface(approach,foot);
        }
        view.position.copy(normal).multiplyScalar(foot.length()+height).addScaledVector(approach.south,5*s);
        const aim=foot.clone().addScaledVector(approach.up,1).addScaledVector(approach.north,2);
        view.up.copy(approach.north).lerp(approach.up,s*s).normalize();
        view.lookAt(aim.multiplyScalar(Math.min(1,s*1.7)));
        sky.position.copy(view.position);sky.quaternion.copy(approach.quaternion);sky.scale.setScalar(1800);
        local.visible=false;drill.hide();
        if(u===1){phase=phase==='descent'?'surface':'orbit';updateUI();persist();requestFrame();}
      }
      // Use the original swatch hue through the planet's lighting pass. The
      // ship uses its own filmic exposure for illuminated equipment and metal.
      const shipCurve=renderer.toneMapping;
      renderer.setRenderTarget(null);renderer.toneMapping=T.NoToneMapping;
      try{renderer.render(world,view);}finally{renderer.toneMapping=shipCurve;}
      return phase!=='orbit';
    }
    const ns='http://www.w3.org/2000/svg';
    function mark(type,attrs={},label=''){
      const el=document.createElementNS(ns,type);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);
      el.textContent=label;chart.append(el);return el;
    }
    function paintChart(){
      const coords=new Map(sites.map(s=>[s.id,displacement(home,s)]));
      const es=[...coords.values()].map(p=>p.east),nn=[...coords.values()].map(p=>p.north);
      const emin=Math.min(...es),emax=Math.max(...es),nmin=Math.min(...nn),nmax=Math.max(...nn);
      const scale=Math.min(365/Math.max(1,emax-emin),190/Math.max(1,nmax-nmin));
      const xy=p=>[240+(p.east-(emin+emax)/2)*scale,133-(p.north-(nmin+nmax)/2)*scale];
      chart.setAttribute('viewBox','0 0 480 284');chart.replaceChildren();
      for(let x=24;x<480;x+=32)mark('path',{d:'M'+x+',12v252',stroke:'#254349'});
      for(let y=20;y<270;y+=32)mark('path',{d:'M14,'+y+'h450',stroke:'#254349'});
      for(const [a,b] of KLOSE_WORLD.routes){
        const [x,y]=xy(coords.get(a)),[u,v]=xy(coords.get(b));
        mark('line',{x1:x,y1:y,x2:u,y2:v,stroke:'#69a69e','stroke-width':2,'stroke-dasharray':a==='vineway'||b==='vineway'?'4 3':'none'});
      }
      for(const site of sites){
        const [x,y]=xy(coords.get(site.id)),chosen=select.value===site.id;
        const node=mark('circle',{cx:x,cy:y,r:chosen?6:4.3,fill:chosen?'#ffc973':'#92e5cb',stroke:'#102c31','stroke-width':2});
        const label=mark('text',{x,y:y+(site.id==='grassland'?18:-9),'text-anchor':'middle'},site.name.replace(/^克洛斯星的?/,'')||site.name);
        for(const el of [node,label])el.onclick=()=>{select.value=site.id;showSelection();};
      }
      const [px,py]=xy(displacement(home,position));
      if(phase==='surface'&&px>7&&px<473&&py>7&&py<277)
        mark('circle',{cx:px,cy:py,r:8,fill:'none',stroke:'#ffad69','stroke-width':2});
      mark('text',{x:15,y:18},'↑ 北');mark('text',{x:14,y:274},'地面投影　／　'+Math.round(50/scale)+' m');
      mark('path',{d:'M16,250v5h50v-5',fill:'none',stroke:'#b7dace'});
    }
    function showSelection(){summary.textContent=byId.get(select.value)?.description||'';paintChart();}
    for(const site of sites)select.add(new Option(site.name,site.id));
    function toggleAtlas(){
      if(!atlas.hidden){atlas.hidden=true;delete stage.dataset.consoleOpen;openChart.focus({preventScroll:true});requestFrame();return;}
      if(!['orbit','surface'].includes(phase))return;
      resetInput();select.value=targetId||body.siteAt(position.lat,position.lon)?.id||home.id;
      atlas.hidden=false;stage.dataset.consoleOpen='planet';showSelection();closeButton.focus({preventScroll:true});
    }
    listen(openChart,'click',toggleAtlas);listen(closeButton,'click',toggleAtlas);
    listen(atlas,'click',e=>{if(e.target===atlas)toggleAtlas();});
    listen(select,'change',showSelection);
    listen(trackButton,'click',()=>{arrival='';plotRoute(select.value);toggleAtlas();updateUI();persist();});
    listen(land,'click',liftOff);
    listen(watch,'click',()=>{if(phase==='surface'){watching=!watching;updateUI();requestFrame();}});
    listen(recall,'click',()=>{if(phase==='orbit'||phase==='surface')returnHome(origin);});
    listen(window,'keydown',e=>{
      if(phase==='hidden'||e.ctrlKey||e.metaKey||e.altKey||e.isComposing)return;
      if(e.target!==window&&e.target!==document&&e.target!==document.body&&e.target!==document.documentElement&&!root.contains(e.target))return;
      if(!atlas.hidden){
        if(e.key==='Tab'){
          if(e.shiftKey&&document.activeElement===closeButton){e.preventDefault();trackButton.focus();}
          else if(!e.shiftKey&&document.activeElement===trackButton){e.preventDefault();closeButton.focus();}
        }
        if(e.key==='Escape'){e.preventDefault();toggleAtlas();}return;
      }
      if(e.target.closest?.('select,input,textarea'))return;
      const code=e.code||(/^[a-z]$/i.test(e.key)?'Key'+e.key.toUpperCase():e.key);
      if(code==='KeyM'){e.preventDefault();if(!e.repeat)toggleAtlas();return;}
      if(code==='KeyV'&&phase==='surface'){e.preventDefault();if(!e.repeat){eye=!eye;requestFrame();persist();}return;}
      if(phase==='surface'&&keyNames.has(code)){
        e.preventDefault();if(!keys.has(code))pendingSteps.set(code,code);keys.add(code);requestFrame();
      }
      if(phase==='orbit'&&code.startsWith('Arrow')){
        e.preventDefault();orbitLon+=.08*(Number(code==='ArrowRight')-Number(code==='ArrowLeft'));
        orbitLat=clamp(orbitLat+.08*(Number(code==='ArrowUp')-Number(code==='ArrowDown')),-1.52,1.52);
        requestFrame();
      }
    });
    listen(window,'keyup',e=>{
      const code=e.code||(/^[a-z]$/i.test(e.key)?'Key'+e.key.toUpperCase():e.key);
      if(keys.delete(code)){if(pendingSteps.delete(code))tapStep(code,.2);persist();requestFrame();}
    });
    listen(window,'blur',resetInput);listen(document,'visibilitychange',()=>{resetInput();if(!document.hidden)requestFrame();});
    listen(canvas,'pointerdown',e=>{
      if(!['surface','orbit'].includes(phase)||!atlas.hidden||drag||e.button!==0)return;
      e.preventDefault();openChart.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY};
    });
    listen(canvas,'pointermove',e=>{
      if(drag?.id!==e.pointerId)return;
      const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;
      if(phase==='orbit'){orbitLon-=dx*.006;orbitLat=clamp(orbitLat+dy*.006,-1.52,1.52);}
      if(phase==='surface'){yaw-=dx*.004;pitch=clamp(pitch-dy*.004,-.90,.97);}
      requestFrame();
    });
    for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(canvas,type,e=>{
      if(drag?.id===e.pointerId){drag=null;persist();}
    });
    listen(canvas,'wheel',e=>{
      if(!['orbit','surface'].includes(phase)||!atlas.hidden)return;
      e.preventDefault();const factor=Math.exp(clamp(e.deltaY,-170,170)*.0018);
      if(phase==='orbit')orbitZoom=clamp(orbitZoom*factor,2.1,7);else boom=clamp(boom*factor,2.4,8);
      requestFrame();
    },{passive:false});
    for(const b of pad.querySelectorAll('[data-step]')){
      listen(b,'pointerdown',e=>{
        if(phase!=='surface'||!atlas.hidden||e.button!==0)return;
        e.preventDefault();b.setPointerCapture(e.pointerId);touch.set(e.pointerId,b.dataset.step);pendingSteps.set(e.pointerId,b.dataset.step);requestFrame();
      });
      for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(b,type,e=>{
        if(touch.delete(e.pointerId)){
          if(pendingSteps.delete(e.pointerId)&&e.type==='pointerup')tapStep(b.dataset.step,.2);
          persist();requestFrame();
        }
      });
      listen(b,'click',e=>{
        if(e.detail||phase!=='surface'||!atlas.hidden)return;
        tapStep(b.dataset.step,.6);
        requestFrame();persist();
      });
    }
    return {open,hide,draw,snapshot,get active(){return phase!=='hidden';},dispose(){
      events.abort();observer.disconnect();if(!world)return;
      hide();drill.dispose();contact.dispose();nono.dispose();body.dispose();
      lamp.shadow.map?.dispose();for(const mesh of [sky,stars]){mesh.geometry.dispose();mesh.material.dispose();}
    }};
  }
