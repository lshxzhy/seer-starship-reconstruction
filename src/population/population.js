  // A low receiver query keeps shoes on top of flush hatches, floor inlays
  // and charging plates. The camera and the crew use the same deck datum.
  const contactFloor=(()=>{
    const rooms=new Map(),ray=new T.Raycaster(),hits=[],point=new T.Vector3();
    const inverse=new T.Matrix4(),relative=new T.Matrix4(),box=new T.Box3();
    function roomSurfaces(room){
      if(rooms.has(room))return rooms.get(room);
      const low=[];room.group.updateWorldMatrix(true,true);
      inverse.copy(room.group.matrixWorld).invert();
      room.group.traverse(part=>{
        if(!part.isMesh||part.material.transparent)return;
        const geometry=part.geometry;
        if(!geometry.boundingBox)geometry.computeBoundingBox();
        relative.multiplyMatrices(inverse,part.matrixWorld);
        box.copy(geometry.boundingBox).applyMatrix4(relative);
        // A material batch may span both a floor flange and taller fixtures.
        // Keep overlapping bounds; the downward ray selects the actual top.
        if(box.max.y<0 || box.min.y>.15)return;
        low.push({part,x0:box.min.x,x1:box.max.x,z0:box.min.z,z1:box.max.z});
      });
      const receivers={low,cache:new Map()};rooms.set(room,receivers);return receivers;
    }
    function height(p){
      const ward=habitat.residences.zoneAt(p);
      if(ward){
        const localZ=ward.side*p.z-ward.front;
        const row=Math.round((localZ-habitat.residences.firstRow)/habitat.residences.pitchZ);
        if(row>=0 && row<habitat.residences.rows &&
          Math.abs(localZ-habitat.residences.firstRow-row*habitat.residences.pitchZ)<.58){
          for(let col=0;col<habitat.residences.columns;col++)
            if(Math.abs((p.x-ward.cx)*ward.side-habitat.residences.localX(col))<.74)return .064;
        }
        return Math.abs(p.x-ward.cx)<2.7?.016:.006;
      }
      const room=habitat.rooms.find(r=>r.built && r.level===p.level &&
        Math.abs(p.x-r.center[0])<=r.spec.width/2 && Math.abs(p.z-r.center[2])<=r.spec.depth/2);
      if(!room)return .027;
      const sign=room.side===1?-1:1, x=(p.x-room.center[0])*sign,z=(p.z-room.center[2])*sign;
      const ix=Math.floor(x*4),iz=Math.floor(z*4),key=(ix+256)*1024+iz+256;
      const {low,cache}=roomSurfaces(room);
      if(cache.has(key))return cache.get(key);
      const cx=(ix+.5)/4,cz=(iz+.5)/4;
      point.set(cx,.18,cz);room.group.localToWorld(point);
      ray.ray.origin.copy(point);ray.ray.direction.set(0,-1,0);
      let top=0;
      for(const entry of low){
        if(cx<entry.x0||cx>entry.x1||cz<entry.z0||cz>entry.z1)continue;
        hits.length=0;entry.part.raycast(ray,hits);
        for(const hit of hits){
          const y=room.group.worldToLocal(point.copy(hit.point)).y;
          if(y>top && y<=.151)top=y;
        }
      }
      cache.set(key,top);return top;
    }
    return height;
  })();

  // One transparent draw for all pairs of soles. The unlit footprint
  // widens and softens when the matching shoe is lifted during a step.
  function createSoleContacts(capacity) {
    const geometry=new T.PlaneGeometry(1,1).rotateX(-Math.PI/2);
    const strength=new T.InstancedBufferAttribute(new Float32Array(capacity*2),1);
    geometry.setAttribute('soleStrength',strength.setUsage(T.DynamicDrawUsage));
    const material=new T.ShaderMaterial({
      transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
      vertexShader:`attribute float soleStrength;
        varying vec2 footUV; varying float opacity;
        void main(){footUV=uv*2.0-1.0;opacity=soleStrength;
          gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`,
      fragmentShader:`varying vec2 footUV; varying float opacity;
        void main(){vec2 p=footUV;float r=dot(p,p);
          float fog=exp(-2.8*r),heel=exp(-7.0*dot(p-vec2(0.0,-.16),p-vec2(0.0,-.16)));
          float alpha=(.48*fog+.52*heel)*(1.0-smoothstep(.68,1.0,r))*opacity;
          gl_FragColor=vec4(.035,.047,.062,alpha);}`
    });
    const mesh=new T.InstancedMesh(geometry,material,capacity*2),transform=new T.Object3D();
    mesh.name='双脚接触阴影';mesh.count=0;mesh.frustumCulled=false;
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    function write(slot,x,y,z,yaw,bones){
      const cos=Math.cos(yaw),sin=Math.sin(yaw);
      for(let j=0;j<2;j++){
        const foot=j===0?bones.footL:bones.footR, local=foot.position;
        const toe=.058, direction=yaw+foot.rotation.y;
        transform.position.set(x+cos*local.x+sin*local.z-Math.sin(direction)*toe,y+.004,
          z-sin*local.x+cos*local.z-Math.cos(direction)*toe);
        const lift=T.MathUtils.clamp(local.y-.177,0,.14);
        transform.rotation.y=direction;transform.scale.set(.73+lift,.95,1.00+lift);
        transform.updateMatrix();mesh.setMatrixAt(slot*2+j,transform.matrix);
        strength.setX(slot*2+j,.57-2.1*lift);
      }
    }
    function finish(n){
      mesh.count=n*2;
      if(n){mesh.instanceMatrix.needsUpdate=true;strength.needsUpdate=true;}
    }
    return {mesh,write,finish,dispose(){geometry.dispose();material.dispose();mesh.dispose();}};
  }

  // Each crew number owns one physical charging berth. Duty routes are
  // sampled against a common simulation clock; leaving the camera's area
  // releases its draw slot without changing its crew number or route phase.
  function createSeerPopulation() {
    const residences = habitat.residences;
    const total = 12000;
    if (!residences || residences.capacity < total) throw new Error('全舰缺少 12000 个可分配的驻舱位');
    const radius = 42;
    const maxVisible = 112;
    const tile = 14;
    const crew = new Array(total);
    const levelCells = new Map();
    const rowsByKey = new Map();
    const rowsByLevel = new Map();
    const workByLevel = new Map();
    const tasks = [];
    const roomRoutes = new Map();
    const officerRigs=new Map();
    const clockStart = 37.0;
    const nominalPlayer = habitat.byId.get('teleport');
    let lastPlayer = {x:nominalPlayer.door[0],y:nominalPlayer.door[1],z:nominalPlayer.door[2]+nominalPlayer.side*2.25,level:nominalPlayer.level,yaw:nominalPlayer.yawRad};
    let elapsed = 0, active = false, lastScan = -Infinity, lastX = Infinity, lastZ = Infinity, lastLevel = '';
    let visibleIds = [], nearby = [], drawnCount=0;
    const batch = seerRobots.createBatch(maxVisible);
    const contacts=createSoleContacts(maxVisible);
    batch.root.add(contacts.mesh);
    batch.root.name = '邻近的在舰赛尔';
    habitat.root.add(batch.root);
    batch.root.visible = false;

    const uniforms = [0xee7d43,0x45afe4,0x58baa9,0xd4a53e,0x9468ac,0xd05760,0x49a1b1,0x6a9c60];
    function hash(n) {
      let v=Math.imul(n ^ (n>>>16),0x45d9f3b);
      v=Math.imul(v^(v>>>16),0x45d9f3b);
      return ((v^(v>>>16))>>>0)/4294967296;
    }
    const tileId = (ix,iz)=>ix+'/'+iz;
    const keyFor = index=>'SE-'+String(index+1).padStart(5,'0');
    function listFor(map,key) {
      if (!map.has(key)) map.set(key,[]);
      return map.get(key);
    }
    for (let i=0;i<total;i++) {
      const berth = residences.slot(i);
      const rowKey=berth.level+'/'+berth.zone+'/'+berth.aisleZ;
      if (!rowsByKey.has(rowKey)) {
        const row={level:berth.level,aisle:berth.aisleZ,gallery:berth.galleryX,home:[],phase:hash(i+91),index:rowsByKey.size};
        rowsByKey.set(rowKey,row);listFor(rowsByLevel,row.level).push(row);
      }
      const row=rowsByKey.get(rowKey);
      crew[i]={home:berth,row,task:null,tint:uniforms[Math.floor(hash(i+4071)*uniforms.length)]};
      row.home.push(i);
      if (!levelCells.has(berth.level))levelCells.set(berth.level,new Map());
      listFor(levelCells.get(berth.level),tileId(Math.floor(berth.x/tile),Math.floor(berth.z/tile))).push(i);
    }

    // An injective shuffle of 1..11999 spreads the watch across the berth
    // decks; 421 and 11999 are coprime. Zero is reserved for the pilot.
    let nextAssignment=0;
    function post(level,role,zone,position,officer=null) {
      const i=1+((nextAssignment++*421+493)%11999);
      const task={level,role,zone,position,index:i,officer};
      crew[i].task=task;
      tasks.push(task);
      listFor(workByLevel,level).push(i);
    }

    // Straight, disjoint walking strips in a cabin are cut from actual
    // walkable floor. A flood fill from the real door excludes inaccessible
    // pockets behind equipment. Equipment AABBs are not treated as scenery.
    function lanesFor(room,count) {
      if(roomRoutes.has(room.id))return roomRoutes.get(room.id);
      if(!room.built)habitat.spawn(room.id);
      const blocks=room.group.userData.blocks||[];
      const spacing=1.42, margin=.63;
      const nx=Math.floor((room.spec.width-2*margin)/spacing)+1;
      const nz=Math.floor((room.spec.depth-2*margin)/spacing)+1;
      const dx=(room.spec.width-2*margin)/(nx-1), dz=(room.spec.depth-2*margin)/(nz-1);
      const xAt=k=>-room.spec.width/2+margin+k*dx;
      const zAt=k=>-room.spec.depth/2+margin+k*dz;
      function clear(x0,z0,x1,z1) {
        const loX=Math.min(x0,x1)-.46, hiX=Math.max(x0,x1)+.46;
        const loZ=Math.min(z0,z1)-.46, hiZ=Math.max(z0,z1)+.46;
        return blocks.every(b=>b.x+b.w/2<loX || b.x-b.w/2>hiX || b.z+b.d/2<loZ || b.z-b.d/2>hiZ);
      }
      const mask=new Uint8Array(nx*nz), open=[];
      // The doorway is centred on +Z in every local room frame.
      for(let x=0;x<nx;x++){
        const px=xAt(x),pz=zAt(nz-1),n=(nz-1)*nx+x;
        if(Math.abs(px)<1.26 && clear(px,pz,px,room.spec.depth/2)){
          mask[n]=1;open.push(n);
        }
      }
      for(let h=0;h<open.length;h++){
        const n=open[h],x=n%nx,z=Math.floor(n/nx);
        for(const [ox,oz] of [[1,0],[-1,0],[0,1],[0,-1]]){
          const xx=x+ox,zz=z+oz,nn=zz*nx+xx;
          if(xx<0||xx>=nx||zz<0||zz>=nz||mask[nn]||!clear(xAt(x),zAt(z),xAt(xx),zAt(zz)))continue;
          mask[nn]=1;open.push(nn);
        }
      }
      const candidates=[];
      for(let z=1;z<nz-1;z++){
        let begin=-1;
        const pz=zAt(z);
        for(let x=1;x<nx;x++){
          const free=x<nx-1 && mask[z*nx+x]===1 &&
            !(Math.abs(xAt(x))<2.5 && pz>room.spec.depth/2-4.3);
          const linked=begin<0 || clear(xAt(x-1),pz,xAt(x),pz);
          if(begin>=0 && (!free||!linked)){
            if(x-begin>=3){
              const lo=xAt(begin)+.12,hi=xAt(x-1)-.12;
              candidates.push({x:lo,end:hi,z:pz,width:hi-lo});
            }
            begin=-1;
          }
          if(free && begin<0)begin=x;
        }
      }
      // Prefer one mid-ground workstation visible from the entrance, then
      // spread the other duties throughout the ship-local room.
      const chosen=[];
      // Reserve a single accessible work position beside the documented station.
      // Use the same connected component as the room's other standing and walking jobs.
      const officer=namedCrewPosts[room.id];
      if(officer&&open.length){
        let best=null,distance=Infinity;
        for(const n of open){
          const x=xAt(n%nx),z=zAt(Math.floor(n/nx)),d=(x-officer.x)**2+(z-officer.z)**2;
          if(d>=distance||!clear(x-.28,z-.28,x+.28,z+.28))continue;
          best={x,end:x,z};distance=d;
        }
        if(best)chosen.push(best);
      }
      while(chosen.length<count && candidates.length){
        let best=-1,score=-Infinity;
        for(let j=0;j<candidates.length;j++){
          const c=candidates[j],cx=(c.x+c.end)/2;
          if(chosen.some(l=>Math.abs(l.z-c.z)<1.39 && c.x<l.end+1.1 && c.end>l.x-1.1))continue;
          const value=chosen.length ?
            Math.min(...chosen.map(l=>Math.hypot(cx-(l.x+l.end)/2,c.z-l.z)))+.08*Math.min(c.width,9) :
            -Math.abs(c.z-room.spec.depth*.035)-Math.abs(cx)*.55+.08*Math.min(c.width,8);
          if(value>score){score=value;best=j;}
        }
        if(best<0)break;
        const c=candidates.splice(best,1)[0],len=Math.min(c.width,chosen.length%3===1?7.2:5.2);
        c.x+=(c.width-len)*.5;c.end=c.x+len;chosen.push(c);
      }
      for(const n of open) {
        if(chosen.length>=count)break;
        const x=xAt(n%nx),z=zAt(Math.floor(n/nx));
        if(Math.abs(x)<2.5&&z>room.spec.depth/2-4.3)continue;
        if(chosen.every(l=>Math.hypot(z-l.z,Math.max(0,l.x-x,x-l.end))>1.28))chosen.push({x,end:x,z});
      }
      if(chosen.length<count)throw new Error(room.name+' 缺少互不重叠的可达工位');
      roomRoutes.set(room.id,chosen);return chosen;
    }

    const makePoint=(x,y,z,level,yaw=0,speed=0,phase=0)=>({x,y,z,level,yaw,speed,phase});
    function roomPose(room,count,slot,i,seconds) {
      const line=lanesFor(room,count)[slot],len=line.end-line.x;
      const orientation=room.side===1?-1:1;
      if(slot===0&&namedCrewPosts[room.id]){
        const x=room.center[0]+orientation*line.x,z=room.center[2]+orientation*line.z;
        const yaw=Math.atan2(x-room.door[0],z-room.door[2]);
        return makePoint(x,room.center[1],z,room.level,yaw);
      }
      const pace=.85+hash(i+548)*.48,ramp=Math.min(.38,len/pace*.5);
      const travel=len/pace+ramp,dwell=2.5+hash(i+332)*4;
      const period=2*(travel+dwell),t=(seconds+hash(i+925)*period)%period;
      const outward=t<travel+dwell,leg=outward?t:t-travel-dwell;
      const moving=Math.min(leg,travel),left=travel-moving;
      const delta=!ramp?0:moving<ramp?pace*moving*moving/(2*ramp):
        left<ramp?len-pace*left*left/(2*ramp):pace*(moving-ramp*.5);
      const x=room.center[0]+orientation*(outward?line.x+delta:line.end-delta);
      const direction=(outward?1:-1)*orientation;
      const yaw=-direction*Math.PI/2+Math.PI*T.MathUtils.smoothstep(leg-travel,.1,dwell-.1);
      const speed=ramp?pace*Math.min(1,moving/ramp,left/ramp):0;
      return makePoint(x,room.center[1],room.center[2]+orientation*line.z,room.level,yaw,speed,seerRobots.phaseStep(pace,delta/pace)+slot);
    }
    const roles={power:'动力巡检',machine:'机修技师',workshop:'试制员',teleport:'传送值班员',
      instructor:'训练教员',captain:'舰桥值班员',laboratory:'实验技术员',archives:'资料管理员',
      honors:'大厅服务员',observation:'观测员',terraceAccess:'露台值勤员'};
    for(const r of habitat.rooms){
      if(!roles[r.id])continue;
      const count=Math.max(3,Math.min(11,Math.round(r.spec.width*r.spec.depth/135)));
      for(let slot=0;slot<count;slot++){
        const officer=slot===0?namedCrewPosts[r.id]:null;
        post(r.level,officer?.role||roles[r.id],r.name,(i,t)=>roomPose(r,count,slot,i,t),officer);
      }
    }

    // All four segments of a corridor circuit are inside the wheelhouse
    // floor polygons. The regular headway keeps opposing traffic in lanes.
    function circuit(deck,caption,points,speed,headway){
      const sides=points.map(([x,z],j)=>{
        const [xx,zz]=points[(j+1)%points.length];
        const length=Math.hypot(xx-x,zz-z);
        return {x,z,dx:(xx-x)/length,dz:(zz-z)/length,length};
      });
      // Corridors form rectangular tracks. Round each corner on the inside,
      // keeping the tangent and the distance clock continuous through a turn.
      const radii=sides.map((side,i)=>Math.min(.58,.23*side.length,.23*sides[(i+3)%4].length));
      const segments=[];
      for(let i=0;i<sides.length;i++){
        const s=sides[i],j=(i+1)%sides.length,n=sides[j],r=radii[j];
        segments.push({x:s.x+s.dx*radii[i],z:s.z+s.dz*radii[i],dx:s.dx,dz:s.dz,length:s.length-radii[i]-r});
        segments.push({x:n.x-s.dx*r+n.dx*r,z:n.z-s.dz*r+n.dz*r,dx:s.dx,dz:s.dz,
          nextX:n.dx,nextZ:n.dz,radius:r,length:r*Math.PI/2});
      }
      const length=segments.reduce((s,d)=>s+d.length,0);
      if(length<8)return;
      const count=Math.max(1,Math.floor(length/headway));
      for(let k=0;k<count;k++)post(deck.id,'通行巡检',caption,(i,t)=>{
        const odometer=t*speed+(k+.43)*length/count;
        let travel=odometer%length;
        for(const s of segments){
          if(travel<s.length+1e-7){
            let x=s.x+s.dx*travel,z=s.z+s.dz*travel,dx=s.dx,dz=s.dz;
            if(s.radius){
              const a=travel/s.radius,c=Math.cos(a),sn=Math.sin(a);
              x=s.x+s.radius*(s.dx*sn-s.nextX*c);z=s.z+s.radius*(s.dz*sn-s.nextZ*c);
              dx=s.dx*c+s.nextX*sn;dz=s.dz*c+s.nextZ*sn;
            }
            return makePoint(x,deck.floorY,z,deck.id,Math.atan2(-dx,-dz),speed,seerRobots.phaseStep(speed,odometer/speed)+i);
          }
          travel-=s.length;
        }
      });
    }
    for(const d of habitat.levels){
      if(!['pod','lower','central','upper','crown'].includes(d.id))continue;
      const x0=d.bounds.lo+1.5,x1=d.bounds.hi-1.5;
      circuit(d,d.name+'主廊',[[x0,-1.25],[x1,-1.25],[x1,1.25],[x0,1.25]],1.36,13);
      for(const r of habitat.rooms.filter(r=>r.level===d.id && roles[r.id])){
        const x=r.door[0],s=r.side,a=4.3*s,b=r.door[2]+1.05*s;
        if(Math.abs(a-b)>2.5)circuit(d,r.name+'门厅与支廊',[[x-.68,a],[x-.68,b],[x+.68,b],[x+.68,a]],1.12,19);
      }
    }

    // Each residential row runs one duty round at a time. The row's crew
    // member returns to its *own* berth before the next watch is selected.
    const shift=130;
    let rotatingRows=0;
    for(const row of rowsByKey.values()){
      row.eligible=row.home.filter(i=>i!==0&&!crew[i].task);
      if(row.eligible.length)rotatingRows++;
    }
    function watch(row,t){
      if(!row.eligible.length)return -1;
      const shiftNumber=Math.floor((t+row.phase*shift)/shift);
      return row.eligible[(shiftNumber+Math.floor(row.phase*row.eligible.length))%row.eligible.length];
    }
    function residentPose(i,t){
      const {home:h,row}=crew[i];
      const base=makePoint(h.x,h.y,h.z,h.level,h.yaw||0,0,0);
      if(watch(row,t)!==i)return base;
      const time=(t+row.phase*shift)%shift;
      const cap=Math.min(Math.abs(h.galleryX-h.x),24+hash(i+339)*13);
      const targetX=h.x+Math.sign(h.galleryX-h.x)*Math.max(0,cap-.70);
      const path=[[h.x,h.z],[h.x,h.aisleZ],[targetX,h.aisleZ],[h.x,h.aisleZ],[h.x,h.z]];
      const speed=1.12;
      let walk=Math.max(0,time-8)*speed;
      for(let j=0;j<4;j++){
        const [x,z]=path[j],[xx,zz]=path[j+1],len=Math.hypot(xx-x,zz-z);
        if(len>0 && walk<len){
          const p=makePoint(x+(xx-x)*walk/len,h.y,z+(zz-z)*walk/len,h.level,
            Math.atan2(x-xx,z-zz),time<8?0:speed,seerRobots.phaseStep(speed,Math.max(0,time-8-(j>=2?7:0))));
          return p;
        }
        walk-=len;
        if(j===1){
          if(walk<7*speed)return makePoint(xx,h.y,zz,h.level,Math.atan2(x-xx,z-zz),0,0);
          walk-=7*speed;
        }
      }
      return base;
    }
    function locate(i,t){
      if(i===0)return makePoint(lastPlayer.x,lastPlayer.y,lastPlayer.z,lastPlayer.level,lastPlayer.yaw||0);
      const task=crew[i].task;
      return task?task.position(i,t):residentPose(i,t);
    }

    function candidates(p,t){
      const ids=new Set(workByLevel.get(p.level)||[]);
      const homes=levelCells.get(p.level);
      if(homes){
        const ix0=Math.floor((p.x-radius)/tile), ix1=Math.floor((p.x+radius)/tile);
        const iz0=Math.floor((p.z-radius)/tile), iz1=Math.floor((p.z+radius)/tile);
        for(let ix=ix0;ix<=ix1;ix++)for(let iz=iz0;iz<=iz1;iz++)
          for(const i of homes.get(tileId(ix,iz))||[])if(i>0&&!crew[i].task)ids.add(i);
        for(const row of rowsByLevel.get(p.level)||[]){
          if(Math.abs(row.aisle-p.z)>radius+1)continue;
          const i=watch(row,t);if(i>=0)ids.add(i);
        }
      }
      const close=[];
      for(const i of ids){
        // Testing a cabin's footprint first avoids creating cabins just to
        // compute invisible AI waypoints on the other side of the vessel.
        const task=crew[i].task;
        if(task?.room && (Math.abs(p.x-task.room.center[0])>radius+task.room.spec.width/2 ||
          Math.abs(p.z-task.room.center[2])>radius+task.room.spec.depth/2))continue;
        const a=locate(i,t),d=(a.x-p.x)**2+(a.z-p.z)**2;
        if(d<=radius*radius)close.push({i,d});
      }
      close.sort((a,b)=>a.d-b.d||a.i-b.i);
      return close.slice(0,maxVisible).map(a=>a.i);
    }
    const roomByName=new Map(habitat.rooms.map(r=>[r.name,r]));
    for(const task of tasks)task.room=roomByName.get(task.zone);

    function normalizeId(id){
      const n=typeof id==='string'&&/^SE-\d{5}$/.test(id)?Number(id.slice(3)):id;
      return Number.isInteger(n)&&n>=1&&n<=total?n-1:-1;
    }
    const now=()=>elapsed+clockStart;
    function getById(id){
      const i=normalizeId(id);
      if(i<0)return null;
      const c=crew[i],t=now(),near=nearby.find(a=>a.i===i);
      const position=near?.p||locate(i,t);
      const role=i===0?'参观机组':c.task?.role||(watch(c.row,t)===i?'驻舱巡检':'驻位充能');
      return {id:keyFor(i),number:i+1,player:i===0,role,characterId:c.task?.officer?.id,name:c.task?.officer?.name,
        zone:i===0?habitat.location(lastPlayer).name:c.task?.zone||c.home.zone,
        position:{x:position.x,y:position.y,z:position.z,level:position.level},
        berth:{index:i,level:c.home.level,zone:c.home.zone,x:c.home.x,y:c.home.y,z:c.home.z}};
    }
    // A bystander crossing the chase camera can otherwise fill the entire
    // screen. Preserve that bystander's pose and collision while they pass.
    function blocksSight(actor,p,eye){
      if(!eye)return false;
      const dx=p.x-eye.x,dz=p.z-eye.z,span=dx*dx+dz*dz;
      const t=span>.01?((actor.x-eye.x)*dx+(actor.z-eye.z)*dz)/span:0;
      if(t<-.09||t>1.01)return false;
      const u=Math.max(0,Math.min(1,t));
      const y=eye.y+(p.y+1.12-eye.y)*u;
      return y>=actor.y-.15 && y<=actor.y+1.90 &&
        (actor.x-eye.x-dx*u)**2+(actor.z-eye.z-dz*u)**2<.64**2;
    }
    function update(p,dt,eye=null){
      if(!active||!p)return;
      if(Number.isFinite(dt))elapsed+=Math.min(.25,Math.max(0,dt));
      lastPlayer={...p};
      const t=now();
      if(lastLevel!==p.level || elapsed-lastScan>.30 || Math.hypot(lastX-p.x,lastZ-p.z)>2){
        visibleIds=candidates(p,t);lastScan=elapsed;lastLevel=p.level;lastX=p.x;lastZ=p.z;
      }
      nearby=[];drawnCount=0;
      let ordinaryCount=0;
      for(const rig of officerRigs.values())rig.root.visible=false;
      for(const i of visibleIds){
        const a=locate(i,t);
        const dx=a.x-p.x,dz=a.z-p.z,d=Math.hypot(dx,dz);
        if(d>radius+2)continue;
        if(a.speed>0 && d<.95){
          // A walking robot gives the pilot room, but a wall or machinery
          // still has priority over the avoidance displacement.
          const lx=Math.cos(a.yaw),lz=-Math.sin(a.yaw),sign=dx*lx+dz*lz>=0?1:-1;
          for(const k of [sign,-sign]){
            const move=(.96-d)*k;
            const alt={...a,x:a.x+lx*move,z:a.z+lz*move};
            if(habitat.canStand(alt)){a.x=alt.x;a.z=alt.z;break;}
          }
        }
        if(!blocksSight(a,p,eye)){
          const y=a.y+contactFloor(a);
          const officer=crew[i].task?.officer;
          let feet,heading=a.yaw;
          if(officer){
            if(!officerRigs.has(i)){
              const rig=createOfficerFigure(officer);rig.root.rotation.y=rig.lastYaw=a.yaw;
              officerRigs.set(i,rig);batch.root.add(rig.root);
            }
            const rig=officerRigs.get(i);
            const desired=d<4&&habitat.location(p).roomId===crew[i].task.room.id?Math.atan2(dx,dz):a.yaw;
            let delta=desired-rig.root.rotation.y;
            delta=Math.atan2(Math.sin(delta),Math.cos(delta));
            heading=rig.root.rotation.y+=delta*(1-Math.exp(-4.5*Math.max(0,dt)));
            rig.root.visible=true;rig.root.position.set(a.x,y,a.z);
            seerRobots.animate(rig,0,0,dt);feet=rig.bones;
          }else feet=batch.write(ordinaryCount++,a.x,y,a.z,a.yaw,crew[i].tint,a.phase,a.speed);
          contacts.write(drawnCount,a.x,y,a.z,heading,feet);
          drawnCount++;
        }
        nearby.push({i,p:a});
      }
      batch.finish(ordinaryCount);
      contacts.finish(drawnCount);
    }
    function setActive(value){
      active=Boolean(value);batch.root.visible=active;
      for(const rig of officerRigs.values())rig.root.visible=false;
      lastScan=-Infinity;lastLevel='';visibleIds=[];nearby=[];drawnCount=0;batch.finish(0);
      contacts.finish(0);
    }
    function nearest(p,maxMetres=4,namedOnly=false){
      let match=null,best=maxMetres**2;
      const room=namedOnly?habitat.location(p).roomId:null;
      for(const a of nearby){
        if(namedOnly&&(!crew[a.i].task?.officer||crew[a.i].task.room.id!==room))continue;
        const d=(p.x-a.p.x)**2+(p.z-a.p.z)**2;
        if(a.p.level===p.level && d<best){match=a;best=d;}
      }
      return match?{...getById(match.i+1),distance:Math.sqrt(best)}:null;
    }
    function namedContact(picker,p,maxMetres=4){
      const member=nearest(p,maxMetres,true);
      if(!member)return null;
      const rig=officerRigs.get(member.number-1);
      if(!rig?.root.visible)return null;
      const hit=picker.intersectObject(rig.root,true)[0];
      if(!hit)return null;
      const room=crew[member.number-1].task.room;
      const surface=picker.intersectObject(room.group,true)[0];
      return surface&&surface.distance<hit.distance-.001?null:{...member,hitDistance:hit.distance};
    }
    function clearsCrew(p,q,radius=.43){
      if(!active||!nearby.length||p.level!==q.level)return true;
      return nearby.every(n=>{
        if(n.p.level!==q.level)return true;
        const dist=(q.x-n.p.x)**2+(q.z-n.p.z)**2;
        const clearance=radius+(crew[n.i].task?.officer ? .68 : .41);
        return dist>=clearance**2 || dist>=(p.x-n.p.x)**2+(p.z-n.p.z)**2;
      });
    }
    function constrainStep(p,next){
      const allowed=q=>clearsCrew(p,q);
      if(allowed(next))return next;
      // Globe movement may already have slid along a wall; recheck both
      // axes before accepting a second slide along a crew member.
      for(const q of [{...next,x:p.x},{...next,z:p.z}]){
        if(allowed(q)&&habitat.canStand(q))return q;
      }
      return p;
    }
    return {update,setActive,getById,nearest,nearestNamed:(p,max=4)=>nearest(p,max,true),namedContact,clearsCrew,constrainStep,
      dispose(){
        for(const rig of officerRigs.values()){batch.root.remove(rig.root);rig.disposeKit();}
        officerRigs.clear();batch.root.remove(contacts.mesh);contacts.dispose();
      },
      get summary(){const onDuty=1+tasks.length+rotatingRows;
        return {total,npc:total-1,capacity:residences.capacity,visible:drawnCount,active:onDuty,charging:total-onDuty};}
    };
  }
