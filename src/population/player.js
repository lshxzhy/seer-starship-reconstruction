  // Both camera styles follow one physical robot, using the same foot pose
  // as door collision, deck navigation and lift landings.
  function createSeerPilot(worldMetre) {
    const rig=seerRobots.create(0xd84a38,{name:'SE-00001',castShadow:false});
    const avatar=rig.root;
    avatar.name='SE-00001 · 玩家赛尔';
    avatar.scale.setScalar(worldMetre);
    avatar.visible=false;
    scene.add(avatar);
    const drill=createMiningDrill();
    let flameTool=null;
    const contacts=createSoleContacts(1),ground=contacts.mesh;
    ground.scale.setScalar(worldMetre);ground.visible=false;scene.add(ground);
    let facing=0,phase=0,strideSpeed=0,previous=null,style='follow',distance=4.15,active=false;
    let sampled=null,available=distance;
    function arrive(pose,yaw,saved){
      active=true;previous={x:pose.x,z:pose.z};sampled=null;strideSpeed=0;
      facing=Number.isFinite(saved?.facing)?saved.facing:yaw;
      if(saved?.perspective==='eye'||saved?.perspective==='follow')style=saved.perspective;
      if(Number.isFinite(saved?.boom))distance=T.MathUtils.clamp(saved.boom,2.4,6.6);
    }
    function roomFor(pose){
      return habitat.byId.get(habitat.location(pose).roomId);
    }
    function positionCamera(pose,yaw,pitch,dt,eyeHeight,ride=null,cabin=null){
      let dx=previous?pose.x-previous.x:0,dz=previous?pose.z-previous.z:0;
      if(cabin?.carried){
        dx=previous?.carX==null?0:dx-(cabin.center.x-previous.carX);
        dz=previous?.carZ==null?0:dz-(cabin.center.z-previous.carZ);
      }
      const travelled=Math.hypot(dx,dz);
      // A slow frame can contain a perfectly valid long fast-walk step.
      // Ignore location jumps without dropping the gait of a moving robot.
      const speed=!ride&&dt>0&&travelled<=Math.max(1.5,dt*16)?travelled/dt:0;
      if(ride)facing=ride.heading;
      else if(speed>0){
        const direction=Math.atan2(-dx,-dz);
        const difference=Math.atan2(Math.sin(direction-facing),Math.cos(direction-facing));
        facing+=difference*(1-Math.exp(-16*dt));
      }
      previous={x:pose.x,z:pose.z,carX:cabin?.center.x,carZ:cabin?.center.z};
      phase+=seerRobots.phaseStep(speed,dt);
      strideSpeed+=(speed-strideSpeed)*(1-Math.exp(-Math.max(0,dt)*(speed?24:17)));
      avatar.rotation.y=facing;
      seerRobots.animate(rig,phase,ride?0:strideSpeed,dt,Boolean(ride));
      const floorY=cabin?cabin.center.y:pose.y+(ride?ride.footOffset:contactFloor(pose));
      avatar.position.copy(habitat.worldPosition(pose.x,floorY,pose.z));
      drill.update(rig.bones.core,dt,active);
      ground.position.copy(avatar.position);
      ground.rotation.y=facing;
      contacts.write(0,0,0,0,0,rig.bones);contacts.finish(1);
      const sin=Math.sin(yaw),cos=Math.cos(yaw);
      const seatedEye=eyeHeight - (ride ? .11 : 0);
      const head=habitat.worldPosition(pose.x,floorY+seatedEye,pose.z);
      if(style==='eye'){
        avatar.visible=ground.visible=false;camera.position.copy(head);
        camera.lookAt(head.clone().add(new T.Vector3(-sin*Math.cos(pitch),Math.sin(pitch),-cos*Math.cos(pitch))));
        return {x:pose.x,y:floorY+seatedEye,z:pose.z};
      }
      // Sweep the camera boom through the walkable footprint, stopping before
      // bulkheads and equipment. Only resample when the camera actually moves.
      const angle=T.MathUtils.clamp(.28-pitch,-.16,1.04);
      // Pull back enough to frame the wide wingtip span and the hovering
      // companion as soon as the player boards, retaining wheel zoom.
      const boom=distance + (ride ? 1.30 : 0);
      const want=boom*Math.cos(angle);
      let ceiling;
      if(cabin){
        // Clip the camera boom against the moving car in its own frame.
        const {center,bounds}=cabin;
        const localX=pose.x-center.x,localZ=pose.z-center.z;
        const reachX=Math.abs(sin)<1e-6?Infinity:(bounds.halfWidth-.13-Math.sign(sin)*localX)/Math.abs(sin);
        const reachZ=Math.abs(cos)<1e-6?Infinity:(bounds.halfDepth-.13-Math.sign(cos)*localZ)/Math.abs(cos);
        available=Math.max(0,Math.min(want,reachX,reachZ));ceiling=bounds.height;sampled=null;
      }else if(!sampled || sampled.level!==pose.level || Math.abs(sampled.x-pose.x)+Math.abs(sampled.z-pose.z)>.012 ||
         Math.abs(sampled.yaw-yaw)+Math.abs(sampled.pitch-pitch)>.003 || sampled.distance!==boom){
        available=0;
        for(let test=.18;test<want+.18;test+=.18){
          const reach=Math.min(test,want);
          if(!habitat.canStand({...pose,x:pose.x+sin*reach,z:pose.z+cos*reach}))break;
          available=reach;
        }
        const current=roomFor(pose);
        const behind=roomFor({...pose,x:pose.x+sin*available,z:pose.z+cos*available});
        // Door lintels are lower than either room's ceiling.
        ceiling=current&&current===behind?current.spec.height:3.10;
        sampled={x:pose.x,z:pose.z,level:pose.level,yaw,pitch,distance:boom,ceiling};
      }else ceiling=sampled.ceiling;
      avatar.visible=active&&available>.76;ground.visible=avatar.visible&&!ride;
      if(!avatar.visible){
        camera.position.copy(head);
        camera.lookAt(head.clone().add(new T.Vector3(-sin*Math.cos(pitch),Math.sin(pitch),-cos*Math.cos(pitch))));
        return {x:pose.x,y:floorY+seatedEye,z:pose.z};
      }
      const cy=T.MathUtils.clamp(1.12+floorY-pose.y+Math.tan(angle)*available,.43,ceiling-.32);
      camera.position.copy(habitat.worldPosition(pose.x+sin*available,pose.y+cy,pose.z+cos*available));
      // Aim slightly past the player's shoulder from behind. The swept boom
      // stays in the safe path and the front inspection angle stays centred.
      const shoulder=Math.min(.65,available*.16)*Math.min(1,camera.aspect)*
        T.MathUtils.smoothstep(Math.cos(yaw-facing),-.1,.72);
      camera.lookAt(habitat.worldPosition(pose.x-sin*.85+cos*shoulder,
        floorY+(ride ? .72 : 1.08)+.21*shoulder+.52*Math.sin(pitch),pose.z-cos*.85-sin*shoulder));
      return {x:pose.x+sin*available,y:pose.y+cy,z:pose.z+cos*available};
    }
    return {
      arrive,positionCamera,
      setSmile(value){seerRobots.setExpression(rig,value?'smile':'neutral');},
      setDrill(equipped){drill.set(equipped);},
      setFlameTool(equipped){
        if(equipped&&!flameTool)flameTool=createFieldFlameTool(T,rig);
        flameTool?.setVisible(equipped);
      },
      workDrill(){drill.work();},
      leave(){active=false;avatar.visible=ground.visible=false;drill.hide();previous=null;sampled=null;},
      setStyle(next){style=next==='eye'?'eye':'follow';sampled=null;},
      zoom(delta){distance=T.MathUtils.clamp(distance*Math.exp(delta*.0011),2.4,6.6);sampled=null;},
      get style(){return style;},get facing(){return facing;},
      snapshot(){return {perspective:style,facing,boom:distance};},
      dispose(){avatar.visible=ground.visible=false;scene.remove(avatar,ground);contacts.dispose();drill.dispose();flameTool?.dispose();}
    };
  }
