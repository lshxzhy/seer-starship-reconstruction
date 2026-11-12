  // The blue twin-bladed NoNo is the player's one companion. Coordinates
  // passed to habitat remain on the deck even while its body is hovering.
  function createSuperNono(worldMetre,world=scene) {
    const root=new T.Group(),body=new T.Group();
    root.name='超能 NoNo · 玩家伙伴';root.visible=false;
    root.scale.setScalar(worldMetre);root.add(body);world.add(root);
    body.scale.setScalar(1.12);
    const shell=new T.MeshPhysicalMaterial({color:0xeaf4f5,metalness:.13,roughness:.30,clearcoat:.54});
    const seal=new T.MeshStandardMaterial({color:0x223846,metalness:.38,roughness:.43});
    const glass=new T.MeshPhysicalMaterial({color:0x030b10,emissive:0x02080b,metalness:.12,roughness:.19,clearcoat:.72});
    const aqua=new T.MeshStandardMaterial({color:0x04d5db,emissive:0x03898f,emissiveIntensity:.52,roughness:.34});
    const lens=new T.MeshBasicMaterial({vertexColors:true,toneMapped:false});
    const reflection=new T.MeshBasicMaterial({color:0xc6ecee,transparent:true,opacity:.18,depthWrite:false});
    const blades=new T.MeshStandardMaterial({vertexColors:true,emissive:0x089b9e,emissiveIntensity:.32,
      metalness:.12,roughness:.29});

    function part(parent,name,geometry,material){
      const mesh=new T.Mesh(geometry,material);mesh.name=name;parent.add(mesh);return mesh;
    }
    const hull=part(body,'珠白球形护壳',new T.SphereGeometry(1,48,32),shell);
    const rx=.315,ry=.310,rz=.304;
    hull.scale.set(rx,ry,rz);
    function surface(az,el,r){
      const c=Math.cos(el);
      return [rx*r*Math.sin(az)*c,ry*r*Math.sin(el),-rz*r*Math.cos(az)*c];
    }
    // Concentric rounded contours follow the sphere. The dark screen and
    // seal wrap around the cheeks without floating flat over the shell.
    function inset(az,el,width,height,r,roundness,tilt=0,lowerHeight=height){
      const positions=surface(az,el,r),indices=[],n=56,bands=7;
      for(let band=1;band<=bands;band++){
        for(let i=0;i<n;i++){
          const angle=i*Math.PI*2/n,c=Math.cos(angle),s=Math.sin(angle);
          const x=Math.sign(c)*Math.pow(Math.abs(c),roundness)*width*band/bands;
          const y=Math.sign(s)*Math.pow(Math.abs(s),roundness)*(s<0?lowerHeight:height)*band/bands;
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
    part(body,'屏周深色密封环',inset(0,.04,1.37,1.10,1.012,.91,0,.44),seal);
    part(body,'下沿青色导光条',inset(0,.04,1.335,1.06,1.023,.91,0,.422),aqua);
    part(body,'弧面墨色屏',inset(0,.057,1.305,1.015,1.036,.91,0,.373),glass);
    part(body,'面屏左上柔光',inset(-.53,.59,.205,.202,1.046,1,.36),reflection);

    // Project the strokes onto the visor. A blink changes a stroke's shape
    // in angular coordinates so its centre stays on the curved glass.
    const eyeRows=17;
    function makeEye(side){
      const geometry=new T.BufferGeometry(),indices=[],colors=[];
      const points=new T.Float32BufferAttribute(new Float32Array(eyeRows*2*3),3);
      const bottom=new T.Color(0x50f4fb),top=new T.Color(0xc1ffff),tint=new T.Color();
      for(let row=0;row<eyeRows;row++){
        tint.copy(bottom).lerp(top,row/(eyeRows-1));
        colors.push(tint.r,tint.g,tint.b,tint.r,tint.g,tint.b);
        if(row+1<eyeRows){const k=row*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
      }
      geometry.setIndex(indices);geometry.setAttribute('position',points);
      geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
      const eye=part(body,'曲面目光',geometry,lens);eye.frustumCulled=false;
      return {side,points};
    }
    const eyes=[makeEye(-1),makeEye(1)];
    function drawEye(eye,closed,winking,lookX,lookY){
      const {points,side}=eye;
      for(let row=0;row<eyeRows;row++){
        const u=2*row/(eyeRows-1)-1;
        const fold=Math.sqrt(u*u+.018),scale=1-closed;
        const closedX=winking ? .225*fold-.09 : .153*u;
        const closedY=winking ? .096*u : .022*(1-u*u);
        const dx=-side*.035*scale+(winking ? .225*u/fold : .153)*closed;
        const dy=.307*scale+(winking ? .096 : -.044*u)*closed;
        const inv=1/Math.max(.0001,Math.hypot(dx,dy));
        const width=(.083*scale+.025*closed)*Math.sqrt(Math.max(0,1-Math.pow(u,12)));
        const cx=side*.427+lookX-side*.035*u*scale+closedX*closed,cy=.227+lookY+.307*u*scale+closedY*closed;
        for(let edge=0;edge<2;edge++){
          const w=(edge?width:-width)*inv,az=cx+dy*w,el=cy-dx*w;
          const c=Math.cos(el)*1.055;
          points.setXYZ(row*2+edge,rx*c*Math.sin(az),ry*1.055*Math.sin(el),-rz*c*Math.cos(az));
        }
      }
      points.needsUpdate=true;
    }
    for(const eye of eyes)drawEye(eye,0,false,0,0);

    function spindle(profile,paint,sweep=0){
      const g=new T.LatheGeometry(profile.map(([h,r])=>new T.Vector2(r,h)),32);
      if(paint){
        const p=g.getAttribute('position'),colors=[],color=new T.Color();
        const foot=new T.Color(0xb8fff7),edge=new T.Color(0x38e9e8),tip=new T.Color(0x05f3f5);
        const len=profile[profile.length-1][0];
        for(let i=0;i<p.count;i++){
          const t=T.MathUtils.clamp(p.getY(i)/len,0,1);
          // Sweep toward the rear while pinching the blade to a thin bright edge.
          p.setZ(i,p.getZ(i)*(1-.36*t)+sweep*t*t);
          if(t<.27)color.copy(foot).lerp(edge,t/.27);
          else color.copy(edge).lerp(tip,(t-.27)/.73);
          colors.push(color.r,color.g,color.b);
        }
        g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
        g.computeVertexNormals();
      }
      return g;
    }
    const crownShape=spindle([[0,0],[.014,.036],[.047,.056],[.094,.067],[.204,.066],[.312,.050],[.412,.028],[.470,.012],[.480,0]],true,.105);
    const finShape=spindle([[0,0],[.012,.024],[.04,.047],[.072,.055],[.115,.048],[.151,.029],[.180,.010],[.186,0]],true,.055);
    const crownCup=spindle([[0,0],[.009,.040],[.028,.062],[.053,.072],[.075,.071],[.098,.060],[.107,.048],[.109,0]],false);
    const earGroups=[],fins=[];
    for(const side of [-1,1]){
      const ear=new T.Group();body.add(ear);earGroups.push(ear);
      ear.position.set(side*.150,.317,.008);ear.rotation.set(.09,0,-side*.46);
      const cup=part(ear,'耳翼悬浮白底座',crownCup,shell);cup.scale.z=.74;
      const blade=part(ear,'上部浮空能量翼',crownShape,blades);blade.position.y=.053;
      blade.scale.z=.54;
      const wing=new T.Group();body.add(wing);fins.push(wing);
      part(body,'侧鳍青色耦合口',inset(side*1.48,-.52,.14,.142,1.011,.95),aqua);
      wing.position.set(side*.273,-.155,-.015);
      const fin=part(wing,'浮动侧鳍',finShape,blades);fin.scale.z=.53;fin.position.y=.041;
      wing.rotation.z=-side*2.12;
    }
    const shadowMaterial=new T.ShaderMaterial({
      transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
      uniforms:{strength:{value:.26}},
      vertexShader:'varying vec2 v;void main(){v=uv*2.0-1.0;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:'varying vec2 v;uniform float strength;void main(){float r=dot(v,v);gl_FragColor=vec4(.015,.04,.055,strength*exp(-3.*r)*(1.-smoothstep(.65,1.,r)));}'
    });
    const shadow=part(root,'低悬投影',new T.PlaneGeometry(1,1).rotateX(-Math.PI/2),shadowMaterial);
    const radius=.60;
    let current=null,goal=null,elapsed=0,salute=0,hover=1.0,heading=0;
    let effort=0,lean=0,bank=0,gazeX=0,gazeY=0;
    let lastSurface=null;
    const lastAnchor=new T.Vector3(),anchorDelta=new T.Vector3(),localFrame=new T.Quaternion();
    const damp=(current,target,rate,dt)=>current+(target-current)*(1-Math.exp(-rate*dt));
    const angleDelta=(from,to)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));
    const ease=T.MathUtils.smoothstep;
    const glances=[[0,0],[-.14,.05],[0,.02],[.12,-.07],[0,0],[.08,.085],[0,0]];
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
      current=formationPoint(p,yaw,'follow',false);goal=current;
      previousCar=null;
      hover=1;heading=yaw+Math.PI;body.rotation.set(0,heading,0,'YXZ');salute=0;
      effort=lean=bank=gazeX=gazeY=0;
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
      current=cabinSlot(p,cabin);previousCar={...cabin.center};goal=current;
      heading=yaw+Math.PI;hover=1.02;root.visible=true;trail.length=0;formation=null;
      effort=lean=bank=gazeX=gazeY=0;
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
      const wasX=current.x,wasZ=current.z;
      if(cabin.carried){current.x+=dx;current.z+=dz;}
      else current=habitat.move(current,dx,dz,radius);
      trail.length=0;retracing=false;formation=null;
      drawCompanion(p,yaw,dt,style,0,0,bounds.height,current.x-wasX,current.z-wasZ);
    }
    function update(p,yaw,dt,style='follow',mounted=false,rideHeight=0,cabin=null){
      if(!current)return;
      dt=T.MathUtils.clamp(dt,0,.10);
      if(cabin){updateInCar(p,yaw,dt,style,cabin);return;}
      previousCar=null;
      if(current.level!==p.level||Math.abs(current.y-p.y)>.8)arrive(p,yaw);
      sampleDue-=dt;
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
      const wasX=current.x,wasZ=current.z;
      if(step>.001){
        const q=habitat.move(current,(target.x-current.x)*step/remaining,(target.z-current.z)*step/remaining,radius);
        const travel=distance(current,q);current=q;
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
      drawCompanion(p,yaw,dt,style,lift,floor,ceiling,current.x-wasX,current.z-wasZ);
    }
    function drawCompanion(p,yaw,dt,style,lift,floor,ceiling,dx,dz){
      root.position.copy(habitat.worldPosition(current.x,current.y+floor,current.z));
      const toOwner=Math.atan2(current.x-p.x,current.z-p.z);
      const restAim=style==='follow'&&!salute?yaw+Math.PI:toOwner;
      animate(dt,dx,dz,restAim,toOwner,lift,ceiling-floor);
    }
    function animate(dt,dx,dz,restAim,toOwner,lift,headroom){
      elapsed+=dt;salute=Math.max(0,salute-dt);
      const speed=dt>0?Math.hypot(dx,dz)/dt:0;
      const desiredEffort=ease(speed,.12,5.5),lastEffort=effort;
      effort=damp(effort,desiredEffort,6,dt);
      const moveYaw=Math.atan2(-dx,-dz);
      const moving=salute?0:ease(speed,.18,1.6);
      const glance=glances[Math.floor(elapsed/2.35)%glances.length],idle=(1-effort)*(salute?0:1);
      const watch=elapsed%10.8,attention=ease(watch,3.6,4.25)*(1-ease(watch,5.1,5.8));
      restAim=salute ? toOwner : restAim+angleDelta(restAim,toOwner)*attention*.52*idle;
      const aim=restAim+angleDelta(restAim,moveYaw)*moving+glance[0]*idle*.72;
      const yawError=angleDelta(heading,aim);
      const turn=T.MathUtils.clamp(yawError*(1-Math.exp(-5.8*dt)),-4.2*dt,4.2*dt);
      heading+=turn;
      const pitchGoal=-.14*effort-(dt>0 ? .036*(effort-lastEffort)/dt : 0);
      lean=damp(lean,pitchGoal,7,dt);bank=damp(bank,dt>0?turn/dt*.068:0,6,dt);
      const age=1.8-salute,reply=salute?Math.sin(Math.PI*age/1.8):0;
      const nod=salute ? .12*Math.sin(age*6.3)*reply : 0;
      const bob=.036*Math.sin(elapsed*2.8)+.017*Math.sin(elapsed*1.6+.7);
      const limit=headroom-.99;
      hover=Math.min(limit,damp(hover,Math.min(limit,1.02+lift+bob*(1-.42*effort)+.105*reply),9,dt));
      body.position.y=hover;
      body.rotation.set(lean+.025*Math.cos(elapsed*2.8)+nod,heading,bank+.038*Math.sin(elapsed*1.9)+.115*reply,'YXZ');
      gazeX=damp(gazeX,T.MathUtils.clamp(-yawError*.23+glance[0]*idle,-.20,.20),15,dt);
      gazeY=damp(gazeY,glance[1]*idle+.04*effort+.054*reply,13,dt);
      for(let i=0;i<2;i++){
        const side=eyes[i].side,ear=earGroups[i],fin=fins[i];
        const beat=Math.sin(elapsed*(3.05)+side*.40);
        ear.rotation.x=damp(ear.rotation.x,.10+.24*effort+.043*beat-nod,6.8,dt);
        ear.rotation.z=damp(ear.rotation.z,-side*(.46+.047*beat+.10*reply+.045*effort)-.57*bank,6,dt);
        ear.position.y=.317+.009*beat+.010*reply;
        fin.rotation.z=damp(fin.rotation.z,-side*(2.13+.13*beat-.23*effort+.25*reply)-.68*bank,10,dt);
        fin.rotation.x=.09*Math.sin(elapsed*2.62+side*.77)+.20*effort;
        fin.rotation.y=damp(fin.rotation.y,side*(.10*beat+effort*.40)-.55*bank,8,dt);
        const clock=elapsed%12.17-i*.013;
        const blink=(1-ease(Math.abs(clock-2.80),.018,.137))+(1-ease(Math.abs(clock-7.71),.022,.15))+
          (1-ease(Math.abs(clock-8.04),.01,.09));
        const wink=salute&&i===1?ease(age,.20,.38)*(1-ease(age,.71,.94)):0;
        drawEye(eyes[i],wink||blink,wink>0,gazeX,gazeY);
      }
      blades.emissiveIntensity=.30+.12*reply+.05*effort;
      shadow.position.y=.008;shadow.scale.setScalar(.78+.18*hover);
      shadowMaterial.uniforms.strength.value=.36/(.65+hover);
    }
    function leave(){current=goal=formation=previousCar=null;root.visible=false;lastSurface=null;trail.length=0;salute=0;}
    function dispose(){
      leave();world.remove(root);
      const geometries=new Set(),materials=new Set();
      root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}});
      for(const g of geometries)g.dispose();
      for(const m of materials)m.dispose();
    }
    function followOnPlanet(x,y,z,yaw,dt,surface=false){
      dt=T.MathUtils.clamp(dt,0,.24);
      // On foot the local group follows the player. Remove that displacement
      // before steering the companion towards its slot in the new tangent frame.
      anchorDelta.subVectors(world.position,lastAnchor).applyQuaternion(localFrame.copy(world.quaternion).invert());
      const reset=lastSurface!==surface||(surface&&anchorDelta.lengthSq()>64);
      lastSurface=surface;lastAnchor.copy(world.position);root.visible=true;
      let dx=0,dz=0;
      if(reset){
        root.position.set(x,y,z);heading=yaw;effort=lean=bank=gazeX=gazeY=0;
      }else{
        if(surface){root.position.x-=anchorDelta.x;root.position.z-=anchorDelta.z;}
        dx=(x-root.position.x)*(1-Math.exp(-7*dt));
        dz=(z-root.position.z)*(1-Math.exp(-7*dt));
        root.position.x+=dx;root.position.z+=dz;root.position.y=damp(root.position.y,y,14,dt);
      }
      const toOwner=Math.atan2(root.position.x,root.position.z),restAim=surface?yaw:yaw+.32*angleDelta(yaw,toOwner);
      animate(dt,dx,dz,restAim,toOwner,0,2.85);
    }
    function hitBy(picker){
      if(!root.visible||!world.visible)return null;
      return picker.intersectObject(body,true)[0]||null;
    }
    function greet(){
      if(!root.visible||!world.visible)return false;
      salute=1.8;return true;
    }
    return {arrive,update,followOnPlanet,insideCar,restoreInCar,hitBy,greet,leave,dispose};
  }
