  // Both camera styles follow one physical robot, using the same foot pose
  // as door collision, deck navigation and lift landings.
  function createSeerPilot(worldMetre) {
    const rig=seerRobots.create(0xd84a38,{name:'SE-00001',castShadow:false});
    const avatar=rig.root;
    avatar.name='SE-00001 · 玩家赛尔';
    avatar.scale.setScalar(worldMetre);
    avatar.visible=false;
    scene.add(avatar);
    const contacts=createSoleContacts(1),ground=contacts.mesh;
    ground.scale.setScalar(worldMetre);ground.visible=false;scene.add(ground);
    let facing=0,phase=0,previous=null,style='follow',distance=4.15,active=false;
    let sampled=null,available=distance;
    function arrive(pose,yaw,saved){
      active=true;previous={x:pose.x,z:pose.z};sampled=null;
      facing=Number.isFinite(saved?.facing)?saved.facing:yaw;
      if(saved?.perspective==='eye'||saved?.perspective==='follow')style=saved.perspective;
      if(Number.isFinite(saved?.boom))distance=T.MathUtils.clamp(saved.boom,2.4,6.6);
    }
    function roomFor(pose){
      return habitat.byId.get(habitat.location(pose).roomId);
    }
    function positionCamera(pose,yaw,pitch,dt,eyeHeight,ride=null){
      const dx=previous?pose.x-previous.x:0,dz=previous?pose.z-previous.z:0;
      const travelled=Math.hypot(dx,dz);
      const speed=!ride && dt>0 && travelled<1.5?travelled/dt:0;
      if(ride)facing=ride.heading;
      else if(travelled>.0001 && travelled<1.5){
        const direction=Math.atan2(-dx,-dz);
        const difference=Math.atan2(Math.sin(direction-facing),Math.cos(direction-facing));
        facing+=difference*(1-Math.exp(-16*dt));
      }
      previous={x:pose.x,z:pose.z};
      phase+=seerRobots.phaseStep(speed,dt);
      avatar.rotation.y=facing;
      seerRobots.animate(rig,phase,speed,dt,Boolean(ride));
      const floorY=pose.y+(ride?ride.footOffset:contactFloor(pose));
      avatar.position.copy(habitat.worldPosition(pose.x,floorY,pose.z));
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
      if(!sampled || sampled.level!==pose.level || Math.abs(sampled.x-pose.x)+Math.abs(sampled.z-pose.z)>.012 ||
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
        const ceiling=current&&current===behind?current.spec.height:3.10;
        sampled={x:pose.x,z:pose.z,level:pose.level,yaw,pitch,distance:boom,ceiling};
      }
      avatar.visible=active&&available>.76;ground.visible=avatar.visible&&!ride;
      if(!avatar.visible){
        camera.position.copy(head);
        camera.lookAt(head.clone().add(new T.Vector3(-sin*Math.cos(pitch),Math.sin(pitch),-cos*Math.cos(pitch))));
        return {x:pose.x,y:floorY+seatedEye,z:pose.z};
      }
      const cy=T.MathUtils.clamp(1.12+floorY-pose.y+Math.tan(angle)*available,.43,sampled.ceiling-.32);
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
      leave(){active=false;avatar.visible=ground.visible=false;previous=null;sampled=null;},
      setStyle(next){style=next==='eye'?'eye':'follow';sampled=null;},
      zoom(delta){distance=T.MathUtils.clamp(distance*Math.exp(delta*.0011),2.4,6.6);sampled=null;},
      get style(){return style;},get facing(){return facing;},
      snapshot(){return {perspective:style,facing,boom:distance};},
      dispose(){avatar.visible=ground.visible=false;scene.remove(avatar,ground);contacts.dispose();}
    };
  }
