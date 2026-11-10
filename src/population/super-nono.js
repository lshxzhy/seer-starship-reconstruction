  // The blue twin-bladed NoNo is the player's one companion. Coordinates
  // passed to habitat remain on the deck even while its body is hovering.
  function createSuperNono(worldMetre,world=scene) {
    const root=new T.Group(),body=new T.Group();
    root.name='超能 NoNo · 玩家伙伴';root.visible=false;
    root.scale.setScalar(worldMetre);root.add(body);world.add(root);
    const shell=new T.MeshPhysicalMaterial({color:0xeaf4f5,metalness:.13,roughness:.30,clearcoat:.54});
    const seal=new T.MeshStandardMaterial({color:0x223846,metalness:.38,roughness:.43});
    const glass=new T.MeshPhysicalMaterial({color:0x07151c,emissive:0x061117,metalness:.14,roughness:.24,clearcoat:.65});
    const aqua=new T.MeshStandardMaterial({color:0x04d5db,emissive:0x03898f,emissiveIntensity:.52,roughness:.34});
    const lens=new T.MeshBasicMaterial({color:0x69fff9,toneMapped:false});
    const blades=new T.MeshStandardMaterial({vertexColors:true,emissive:0x089b9e,emissiveIntensity:.32,
      metalness:.12,roughness:.29});

    function part(parent,name,geometry,material){
      const mesh=new T.Mesh(geometry,material);mesh.name=name;parent.add(mesh);return mesh;
    }
    const hull=part(body,'珠白球形护壳',new T.SphereGeometry(1,48,32),shell);
    const rx=.315,ry=.288,rz=.29;
    hull.scale.set(rx,ry,rz);
    function surface(az,el,r){
      const c=Math.cos(el);
      return [rx*r*Math.sin(az)*c,ry*r*Math.sin(el),-rz*r*Math.cos(az)*c];
    }
    // Concentric rounded contours follow the sphere. The dark screen and
    // seal wrap around the cheeks without floating flat over the shell.
    function inset(az,el,width,height,r,roundness,tilt=0){
      const positions=surface(az,el,r),indices=[],n=56,bands=7;
      for(let band=1;band<=bands;band++){
        for(let i=0;i<n;i++){
          const angle=i*Math.PI*2/n,c=Math.cos(angle),s=Math.sin(angle);
          const x=Math.sign(c)*Math.pow(Math.abs(c),roundness)*width*band/bands;
          const y=Math.sign(s)*Math.pow(Math.abs(s),roundness)*height*band/bands;
          positions.push(...surface(az+x+tilt*y,el+y,r));
          const a=1+(band-1)*n+i,b=1+(band-1)*n+(i+1)%n;
          if(band===1)indices.push(0,b,a);
          else indices.push(a-n,b,a, a-n,b-n,b);
        }
      }
      const g=new T.BufferGeometry();
      g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
      g.setIndex(indices);g.computeVertexNormals();return g;
    }
    part(body,'屏周深色密封环',inset(0,.198,1.47,.687,1.012,.8),seal);
    part(body,'下沿青色导光条',inset(0,.194,1.405,.625,1.023,.77),aqua);
    part(body,'弧面墨色屏',inset(0,.239,1.400,.566,1.034,.79),glass);
    const eyes=[];
    for(const side of [-1,1]){
      const eye=part(body,'青色目条',inset(side*.433,.23,.094,.226,1.043,.27,-side*.20),lens);
      eyes.push(eye);
    }
    const wink=part(body,'眨眼光符',inset(.433,.231,.119,.041,1.044,.45,-.26),lens);
    wink.visible=false;

    function spindle(profile,paint){
      const g=new T.LatheGeometry(profile.map(([h,r])=>new T.Vector2(r,h)),32);
      if(paint){
        const p=g.getAttribute('position'),colors=[],color=new T.Color();
        const foot=new T.Color(0xdbfffb),edge=new T.Color(0x00afb8),tip=new T.Color(0x58ebee);
        const len=profile[profile.length-1][0];
        for(let i=0;i<p.count;i++){
          const t=T.MathUtils.clamp(p.getY(i)/len,0,1);
          if(t<.27)color.copy(foot).lerp(edge,t/.27);
          else color.copy(edge).lerp(tip,(t-.27)/.73);
          colors.push(color.r,color.g,color.b);
        }
        g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
      }
      return g;
    }
    const crownShape=spindle([[0,0],[.016,.048],[.048,.071],[.095,.075],[.155,.058],[.244,.041],[.339,.024],[.395,.012],[.423,0]],true);
    const finShape=spindle([[0,0],[.012,.029],[.037,.045],[.063,.046],[.112,.034],[.175,.018],[.208,0]],true);
    const crownCup=spindle([[0,0],[.006,.052],[.017,.061],[.038,.057],[.050,.041],[.052,0]],false);
    const earGroups=[],fins=[];
    for(const side of [-1,1]){
      const ear=new T.Group();body.add(ear);earGroups.push(ear);
      ear.position.set(side*.128,.235,.005);ear.rotation.set(.12,0,-side*.40);
      part(ear,'耳翼白瓷底座',crownCup,shell);
      const blade=part(ear,'上部浮空能量翼',crownShape,blades);blade.position.y=.070;
      blade.scale.z=.64;
      const wing=new T.Group();body.add(wing);fins.push(wing);
      wing.position.set(side*.275,-.088,.016);
      const joint=part(wing,'侧鳍磁耦',crownCup,aqua);joint.scale.set(.73,.61,.7);
      const fin=part(wing,'短侧鳍',finShape,blades);fin.scale.z=.65;fin.position.y=.065;
      wing.rotation.z=-side*2.12;
    }
    const shadowMaterial=new T.ShaderMaterial({
      transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
      uniforms:{strength:{value:.26}},
      vertexShader:'varying vec2 v;void main(){v=uv*2.0-1.0;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:'varying vec2 v;uniform float strength;void main(){float r=dot(v,v);gl_FragColor=vec4(.015,.04,.055,strength*exp(-3.*r)*(1.-smoothstep(.65,1.,r)));}'
    });
    const shadow=part(root,'低悬投影',new T.PlaneGeometry(1,1).rotateX(-Math.PI/2),shadowMaterial);
    const radius=.54;
    let current=null,goal=null,previousOwner=null,elapsed=0,salute=0,hover=1.0,heading=0;
    let sampleDue=0,formation=null,retracing=false,stalled=0,previousCar=null;
    const trail=[];
    const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
    function formationPoint(p,yaw,style,mounted){
      const c=Math.cos(yaw),s=Math.sin(yaw),eye=style==='eye';
      const aspect=Math.max(.30,camera.aspect);
      const side=mounted?2.25:(eye?Math.min(1.22,.92+.16*aspect):1.20);
      const halfView=Math.tan(T.MathUtils.degToRad(camera.fov/2))*aspect;
      const forward=eye
        ? Math.max(mounted?3.9:1.92,(side+.66)/halfView)
        : (mounted ? .22 : -.16);
      // Trace from the owner as well: two adjacent rooms can have perfectly
      // walkable endpoints on opposite sides of a wall.
      let best=p,bestDistance=0;
      for(const sign of [1,-1]){
        const dx=c*side*sign-s*forward,dz=-s*side*sign-c*forward;
        const q=habitat.move(p,dx,dz,radius);
        if(Math.hypot(q.x-p.x-dx,q.z-p.z-dz)<.08)return q;
        const reached=distance(q,p);
        if(reached>bestDistance){bestDistance=reached;best=q;}
      }
      return best;
    }
    function arrive(p,yaw=0){
      current=formationPoint(p,yaw,'follow',false);goal=current;previousOwner={...p};
      previousCar=null;
      hover=1;heading=yaw+Math.PI;body.rotation.set(0,heading,0);salute=0;
      trail.length=0;trail.push({...p});retracing=false;stalled=0;formation=null;sampleDue=0;
      root.visible=true;
      root.position.copy(habitat.worldPosition(current.x,current.y+contactFloor(current),current.z));
      body.position.y=hover;
    }
    function insideCar(cabin){
      if(!current||!cabin)return false;
      const {center,bounds}=cabin;
      return Math.abs(current.x-center.x)<=bounds.halfWidth-radius &&
        Math.abs(current.z-center.z)<=bounds.halfDepth-radius && Math.abs(current.y-center.y)<.15;
    }
    function cabinSlot(p,cabin){
      const {center,bounds}=cabin;
      const dx=p.x-center.x;
      return {x:center.x+T.MathUtils.clamp(dx+(dx>.15?-1.05:1.05),-.98,.98),
        y:center.y,z:center.z+T.MathUtils.clamp(p.z-center.z+.48,-bounds.halfDepth+.8,bounds.halfDepth-.8),level:p.level};
    }
    function restoreInCar(p,yaw,cabin){
      current=cabinSlot(p,cabin);previousCar={...cabin.center};goal=current;previousOwner={...p};
      heading=yaw+Math.PI;hover=1.02;root.visible=true;trail.length=0;formation=null;
    }
    function updateInCar(p,yaw,dt,style,cabin){
      const {center,bounds}=cabin;
      if(previousCar&&cabin.carried){
        current.x+=center.x-previousCar.x;current.z+=center.z-previousCar.z;
      }
      current.y=center.y;current.level=p.level;previousCar={...center};
      const slot=cabinSlot(p,cabin);
      // Enter through the open door before taking up an escort position.
      let target=slot;
      const sill=center.z-bounds.halfDepth;
      if(current.z<sill+radius && Math.abs(current.x-center.x)>.48)
        target={x:center.x,z:Math.min(current.z,sill-.62)};
      const gap=distance(current,target),fraction=gap>.001?Math.min(1,dt*9,.01+9*dt/gap):0;
      const dx=(target.x-current.x)*fraction,dz=(target.z-current.z)*fraction;
      if(cabin.carried){current.x+=dx;current.z+=dz;}
      else current=habitat.move(current,dx,dz,radius);
      trail.length=0;retracing=false;formation=null;previousOwner={...p};
      drawCompanion(p,yaw,dt,style,0,0,bounds.height,0,Math.hypot(dx,dz));
    }
    function update(p,yaw,dt,style='follow',mounted=false,rideHeight=0,cabin=null){
      if(!current)return;
      dt=T.MathUtils.clamp(dt,0,.10);elapsed+=dt;salute=Math.max(0,salute-dt);
      if(cabin){updateInCar(p,yaw,dt,style,cabin);return;}
      previousCar=null;
      if(current.level!==p.level||Math.abs(current.y-p.y)>.8)arrive(p,yaw);
      sampleDue-=dt;
      const ownerSpeed=previousOwner&&dt?distance(previousOwner,p)/dt:0;
      previousOwner={...p};
      if(!trail.length||distance(trail[trail.length-1],p)>.40)trail.push({...p});
      // Keep recent corners while the companion is catching up.
      if(trail.length>128)trail.shift();
      if(!formation||formation.style!==style||formation.mounted!==mounted||Math.abs(formation.aspect-camera.aspect)>.03||
        (sampleDue<=0&&(distance(formation,p)>.07||Math.abs(formation.yaw-yaw)>.035))){
        goal=formationPoint(p,yaw,style,mounted);
        formation={x:p.x,z:p.z,yaw,style,mounted,aspect:camera.aspect};sampleDue=.082;
      }
      let target=goal;
      if(retracing){
        while(trail.length>1&&distance(current,trail[0])<.36)trail.shift();
        target=trail[0]||goal;
        if(distance(current,p)<.66){retracing=false;stalled=0;target=goal;}
      }else if(trail.length>1){
        // Trim corners already reached. Keep a chain behind the owner for
        // doorways where a direct line from the escort position hits a jamb.
        while(trail.length>1&&distance(current,trail[1])<1.28)trail.shift();
      }
      const remaining=distance(current,target),step=Math.min(remaining,(mounted?16:12)*dt,remaining*(1-Math.exp(-10*dt)));
      let travel=0;
      if(step>.001){
        const q=habitat.move(current,(target.x-current.x)*step/remaining,(target.z-current.z)*step/remaining,radius);
        travel=distance(current,q);current=q;
        stalled=remaining>.44&&travel<step*.36?stalled+dt:0;
        if(stalled>.22){
          // Find the latest visible breadcrumb, then proceed along the
          // owner's walked chain. Each move still sweeps the whole chassis.
          for(let i=trail.length-1;i>=0;i--){
            const node=trail[i];
            if(distance(current,node)>8)continue;
            const trace=habitat.move(current,node.x-current.x,node.z-current.z,radius);
            if(distance(trace,node)<.09){trail.splice(0,i);retracing=true;break;}
          }
          stalled=0;
        }
      }
      const floor=contactFloor(current),room=habitat.byId.get(habitat.location(current).roomId);
      let ceiling=3.1;
      if(room){
        const margin=Math.min(room.spec.width/2-Math.abs(current.x-room.center[0]),
          room.spec.depth/2-Math.abs(current.z-room.center[2]));
        ceiling+=Math.max(0,room.spec.height-3.1)*T.MathUtils.smoothstep(margin,.45,1.8);
      }
      const lift=mounted&&Number.isFinite(rideHeight)?Math.max(0,rideHeight):0;
      drawCompanion(p,yaw,dt,style,lift,floor,ceiling,ownerSpeed,travel);
    }
    function drawCompanion(p,yaw,dt,style,lift,floor,ceiling,ownerSpeed,travel){
      const desired=1.02+lift+.054*Math.sin(elapsed*2.65)+.13*Math.sin(Math.PI*salute/1.8);
      const limit=ceiling-floor-.77;
      hover=Math.min(limit,hover+(Math.min(limit,desired)-hover)*(1-Math.exp(-9*dt)));
      root.position.copy(habitat.worldPosition(current.x,current.y+floor,current.z));body.position.y=hover;
      const toOwner=Math.atan2(current.x-p.x,current.z-p.z);
      let aim=toOwner;
      if(style==='follow'&&salute===0){
        // Look toward the following camera when at rest.
        const behind=yaw+Math.PI,blend=T.MathUtils.smoothstep(ownerSpeed,.6,4.1);
        aim=behind+Math.atan2(Math.sin(yaw-behind),Math.cos(yaw-behind))*blend;
      }
      heading+=Math.atan2(Math.sin(aim-heading),Math.cos(aim-heading))*(1-Math.exp(-7*dt));
      const reply=salute?Math.sin((1.8-salute)*Math.PI*2/1.8):0;
      body.rotation.set(.025*Math.sin(elapsed*2.65)+.10*reply,heading,.022*Math.sin(elapsed*1.8));
      for(let i=0;i<2;i++){
        const side=i===0?-1:1;
        earGroups[i].rotation.z=-side*(.40+.022*Math.sin(elapsed*2.2)+.07*reply);
        fins[i].rotation.z=-side*(2.12+.06*Math.sin(elapsed*3.1)+.21*reply);
      }
      const winking=salute>1.02&&salute<1.53;
      wink.visible=winking;eyes[1].visible=!winking;
      blades.emissiveIntensity=.32+.10*Math.max(0,reply)+Math.min(.06,travel*.6);
      shadow.position.y=.006;shadow.scale.setScalar(.78+.18*hover);
      shadowMaterial.uniforms.strength.value=.36/(.65+hover);
    }
    function leave(){current=goal=previousOwner=formation=previousCar=null;root.visible=false;trail.length=0;salute=0;}
    function dispose(){
      leave();world.remove(root);
      const geometries=new Set(),materials=new Set();
      root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}});
      for(const g of geometries)g.dispose();
      for(const m of materials)m.dispose();
    }
    function followOnPlanet(x,y,z,yaw,dt){
      elapsed+=dt;root.visible=true;root.position.set(x,y,z);
      body.position.y=1.02+.054*Math.sin(elapsed*2.65);
      body.rotation.set(.025*Math.sin(elapsed*2.65),yaw,.022*Math.sin(elapsed*1.8));
      shadow.position.y=.012;
    }
    return {arrive,update,followOnPlanet,insideCar,restoreInCar,greet(){if(!current)return false;salute=1.8;return true;},leave,dispose};
  }
