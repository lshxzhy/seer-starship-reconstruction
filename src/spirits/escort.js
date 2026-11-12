// The selected party member has its own floor position. The ship and planet
// use different coordinates but both sweep the actual walkable terrain.
function createSpiritEscort(T,world,metre=1){
  const anchor=new T.Group(),turntable=new T.Group(),gait=new T.Group();
  anchor.name='随行精灵';anchor.scale.setScalar(metre);anchor.visible=false;
  anchor.add(turntable);turntable.add(gait);world.add(anchor);
  const shade=new T.ShaderMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
    vertexShader:'varying vec2 q;void main(){q=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec2 q;void main(){gl_FragColor=vec4(0.055,0.060,0.075,.26*(1.-smoothstep(.2,1.,dot(q,q))));}'});
  const shadow=new T.Mesh(new T.PlaneGeometry(1,1).rotateX(-Math.PI/2),shade);
  shadow.position.y=.006;anchor.add(shadow);
  let model=null,selected=null,foot=null,lastOwner=null,goal=null,sample=0,stalled=0;
  let heading=0,stride=0,radius=.26,stepHeight=.03;
  const trail=[];
  function hide(){
    anchor.visible=false;foot=lastOwner=goal=null;sample=stalled=stride=0;trail.length=0;
  }
  function setSpecies(id){
    const next=Number(id)||null;if(next===selected)return;
    hide();
    if(model){gait.remove(model.root);model.dispose();model=null;}
    selected=next;if(!selected)return;
    model=createCompanionFigure(T,next);
    if(!model)return;
    const bounds=new T.Box3().setFromObject(model.root),size=bounds.getSize(new T.Vector3());
    const row=SEER_SPIRIT_DATA.index.find(p=>p[0]===next);
    const height=row?.[3]>0?row[3]/100:size.y;
    const factor=height/Math.max(.01,size.y);
    model.root.scale.multiplyScalar(factor);model.root.position.y-=factor*bounds.min.y;
    model.root.traverse(part=>{if(part.isMesh){part.castShadow=true;part.receiveShadow=true;}});
    radius=Math.max(.17,factor*Math.max(size.x,size.z)/2);
    shadow.scale.setScalar(radius*2.25);
    stepHeight=Math.min(.095,.08*height);stride=0;
    gait.add(model.root);
  }
  function follow(owner,face,dt,firstPerson,direction,move,clear){
    if(!model)return false;
    if(lastOwner&&(lastOwner.level!==owner.level||direction(lastOwner,owner).distance>8))hide();
    lastOwner={...owner};
    if(!trail.length||direction(trail[trail.length-1],owner).distance>.32){
      trail.push(lastOwner);if(trail.length>64)trail.shift();
    }
    sample-=dt;
    if(!goal||sample<=0){
      const side=1.05+radius,fore=firstPerson?Math.max(3.05,side*2):-.65;
      const c=Math.cos(face),s=Math.sin(face);
      goal=null;sample=.15;
      // NoNo normally flies at the player's right. Prefer the opposite side,
      // then try a single-file position in a narrow passage.
      for(const [lateral,front] of [[-side,fore],[0,-1.1-radius],[-.6*side,-1.4],[side,fore]]){
        const dx=c*lateral-s*front,dz=-s*lateral-c*front;
        const candidate=move(owner,dx,dz),offset=direction(owner,candidate);
        if(Math.hypot(offset.x-dx,offset.z-dz)>.19||!clear(candidate,radius))continue;
        goal=candidate;break;
      }
    }
    if(!goal){anchor.visible=false;foot=null;return false;}
    if(!foot){foot={...goal};heading=face+Math.PI;stalled=0;}
    if(!clear(foot,radius)){anchor.visible=false;foot=null;return false;}
    let target=goal;
    if(stalled>.28&&trail.length>1){
      // Follow the owner's footsteps around a door jamb or a blind corner.
      for(let i=trail.length-1;i>=0;i--){
        const d=direction(foot,trail[i]);
        if(d.distance<.32||d.distance>5)continue;
        if(direction(move(foot,d.x,d.z),trail[i]).distance<.20){target=trail[i];trail.splice(0,i);break;}
      }
    }
    const vector=direction(foot,target);
    const distance=vector.distance,step=Math.min(distance,8.6*dt,distance*(1-Math.exp(-8*dt)));
    const previous=foot;
    if(step>.002){
      const next=move(foot,vector.x*step/distance,vector.z*step/distance);
      if(clear(next,radius))foot=next;
    }
    const delta=direction(previous,foot);
    if(distance>.45&&delta.distance<step*.4)stalled+=dt;
    else if(target===goal)stalled=0;
    if(direction(foot,owner).distance>8){hide();return false;}
    const glance=delta.distance>.004?delta:direction(foot,owner);
    const aim=Math.atan2(glance.x,glance.z);
    const bend=Math.atan2(Math.sin(aim-heading),Math.cos(aim-heading));
    heading+=bend*(1-Math.exp(-11*dt));turntable.rotation.y=heading;
    const effort=dt?Math.min(1,delta.distance/(dt*3.6)):0;
    stride+=delta.distance*8;
    gait.position.y=stepHeight*Math.abs(Math.sin(stride))*effort;
    gait.rotation.z=.047*Math.sin(stride)*effort;
    model.update(dt,effort);anchor.visible=true;
    return true;
  }
  function deck(owner,yaw,dt,firstPerson,population,flight){
    const delta=(a,b)=>({x:b.x-a.x,z:b.z-a.z,distance:Math.hypot(b.x-a.x,b.z-a.z)});
    const move=(p,x,z)=>habitat.move(p,x,z,radius,(from,to)=>population.clearsCrew(from,to,radius)&&flight.clearsParked(from,to));
    const clear=(p,r)=>habitat.canStand(p,r)&&!population.nearest(p,r+.35);
    if(!follow(owner,yaw,dt,firstPerson,delta,move,clear))return;
    anchor.position.copy(habitat.worldPosition(foot.x,foot.y+contactFloor(foot),foot.z));
  }
  function surface(body,owner,yaw,dt,firstPerson,mayStand){
    const delta=(a,b)=>{const d=kloseDisplacement(a,b,body.radius);return {x:d.east,z:-d.north,distance:d.distance};};
    function move(p,dx,dz){
      const dest=body.walk(p.lat,p.lon,dx,-dz),length=Math.hypot(dx,dz);
      const side=radius-.26;
      if(side>.08&&length>.001){
        // The terrain's walker already accounts for a 26 cm radius. Sweep
        // both edges for larger species so the centre cannot skim a tree.
        for(const sign of [-1,1]){
          const edge=body.move(p.lat,p.lon,sign*dz*side/length,sign*dx*side/length);
          const actual=delta(edge,body.walk(edge.lat,edge.lon,dx,-dz));
          if(Math.hypot(actual.x-dx,actual.z-dz)>.08)return p;
        }
      }
      return dest;
    }
    if(!follow(owner,yaw,dt,firstPerson,delta,move,mayStand||(()=>true)))return;
    anchor.position.copy(body.point(foot.lat,foot.lon,body.groundCorrection(foot.lat,foot.lon)+.01));
    anchor.quaternion.copy(body.frame(foot.lat,foot.lon).quaternion);
  }
  return {setSpecies,deck,surface,hide,dispose(){setSpecies(null);shadow.geometry.dispose();shade.dispose();world.remove(anchor);}};
}
