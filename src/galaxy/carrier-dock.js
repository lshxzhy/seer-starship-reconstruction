  // These are openings through the actual installed hull, not luminous decals.
  // Keep the mesh cut in model space so every exterior clone inherits it.
  const carrierGlazing=(()=>{
    const metric=ship.scale.clone().multiplyScalar(habitat.metresPerRenderUnit);
    const rooms=['observation','terraceAccess'].map(id=>habitat.byId.get(id));
    const apertures=rooms.map(room=>{
      const {width:W,depth:D,height:H}=room.spec,terrace=room.id==='terraceAccess';
      const pier=terrace?2:Math.max(1.35,W*.12),sill=terrace?.34:Math.min(.72,H*.22),head=terrace?H-.45:H*.80;
      const inner=room.center[2]+room.side*D/2;
      return {room,inner,x0:room.center[0]-W/2+pier,x1:room.center[0]+W/2-pier,
        y0:room.center[1]+sill,y1:room.center[1]+head,
        z0:room.side<0?-600:inner-.03,z1:room.side<0?inner+.03:600};
    });
    const groups=ship.children.filter(g=>g!==habitat.root&&g!==interiorModel.root);
    ship.updateMatrixWorld(true);
    const toModel=ship.matrixWorld.clone().invert(),unit=new T.Matrix4().makeScale(metric.x,metric.y,metric.z);
    // Split intersecting triangles against the six aperture faces. Keeping
    // the exterior fragments cuts the dark backing and every armour layer,
    // including triangles spanning a small opening in a much larger panel.
    function subtractWindow(part,transform,holes){
      const original=part.geometry,source=original.index?original.toNonIndexed():original;
      const attributes=Object.entries(source.attributes),sizes=attributes.map(([,a])=>a.itemSize);
      const offsets=[];let stride=0;for(const size of sizes){offsets.push(stride);stride+=size;}
      const pos=source.attributes.position;
      const result=attributes.map(()=>[]),point=new T.Vector3();let changed=false;
      function vertex(index){
        const data=[];for(const [,a] of attributes)for(let k=0;k<a.itemSize;k++)data.push(a.array[index*a.itemSize+k]);
        point.fromBufferAttribute(pos,index).applyMatrix4(transform);
        return {data,p:[point.x,point.y,point.z]};
      }
      function mix(a,b,t){return {data:a.data.map((v,i)=>v+(b.data[i]-v)*t),p:a.p.map((v,i)=>v+(b.p[i]-v)*t)};}
      function split(poly,axis,bound,sign){
        const inside=[],outside=[];
        for(let i=0;i<poly.length;i++){
          const a=poly[i],b=poly[(i+1)%poly.length],da=(a.p[axis]-bound)*sign,db=(b.p[axis]-bound)*sign;
          (da>=0?inside:outside).push(a);
          if((da>=0)!==(db>=0)){const v=mix(a,b,da/(da-db));inside.push(v);outside.push(v);}
        }
        return [inside,outside];
      }
      function emit(poly){
        for(let i=1;i<poly.length-1;i++)for(const v of [poly[0],poly[i],poly[i+1]]){
          for(let k=0;k<attributes.length;k++)for(let n=0;n<sizes[k];n++)result[k].push(v.data[offsets[k]+n]);
        }
      }
      for(let i=0;i<pos.count;i+=3){
        let fragments=[[vertex(i),vertex(i+1),vertex(i+2)]];
        for(const h of holes){
          const remaining=[];
          for(const poly of fragments){
            // Most triangles can be rejected before clipping any attributes.
            if(poly.every(v=>v.p[0]<h.x0)||poly.every(v=>v.p[0]>h.x1)||
              poly.every(v=>v.p[1]<h.y0)||poly.every(v=>v.p[1]>h.y1)||
              poly.every(v=>v.p[2]<h.z0)||poly.every(v=>v.p[2]>h.z1)){remaining.push(poly);continue;}
            let inside=poly;
            for(const [axis,bound,sign] of [[0,h.x0,1],[0,h.x1,-1],[1,h.y0,1],[1,h.y1,-1],[2,h.z0,1],[2,h.z1,-1]]){
              const [a,b]=split(inside,axis,bound,sign);if(b.length>=3)remaining.push(b);inside=a;if(inside.length<3)break;
            }
            if(inside.length>=3)changed=true;
          }
          fragments=remaining;
        }
        for(const poly of fragments)emit(poly);
      }
      if(changed){
        const geometry=new T.BufferGeometry();
        attributes.forEach(([name,a],i)=>geometry.setAttribute(name,new T.Float32BufferAttribute(result[i],a.itemSize,a.normalized)));
        geometry.computeBoundingBox();geometry.computeBoundingSphere();part.geometry=geometry;
      }
      if(source!==original)source.dispose();
    }
    const box=new T.Box3();
    for(const group of groups)group.traverse(part=>{
      if(!part.isMesh||part.isInstancedMesh||Array.isArray(part.material)||part.material.isShaderMaterial)return;
      const transform=unit.clone().multiply(toModel).multiply(part.matrixWorld);
      if(!part.geometry.boundingBox)part.geometry.computeBoundingBox();
      box.copy(part.geometry.boundingBox).applyMatrix4(transform);
      const holes=apertures.filter(h=>box.max.x>h.x0&&box.min.x<h.x1&&box.max.y>h.y0&&box.min.y<h.y1&&box.max.z>h.z0&&box.min.z<h.z1);
      if(holes.length)subtractWindow(part,transform,holes);
    });
    const reveals=new T.Group();reveals.name='真实观景窗 · 贯通舰壳与舱内';
    reveals.scale.set(1/metric.x,1/metric.y,1/metric.z);ship.add(reveals);groups.push(reveals);
    const lining=new T.MeshStandardMaterial({color:linearColor(0x526c7e),metalness:.58,roughness:.41,side:T.DoubleSide});
    function hullZ(x,y,side){
      const [w,keel,belt,top]=station(x/metric.x),dy=y/metric.y-belt;
      const c=Math.min(1,Math.pow(Math.abs(dy)/(dy>=0?top-belt:belt-keel),1/.84));
      return side*(w*Math.pow(Math.max(0,1-c*c),.425)*(1+.10*Math.min(0,Math.sign(dy)*c))+.14)*metric.z;
    }
    function quad(vertices,points){for(const i of [0,1,2,0,2,3])vertices.push(...points[i]);}
    for(const h of apertures){
      const p=[],side=h.room.side;
      // Four pressure-window reveals follow the real curved shell at their
      // outer ends. Their inner ends meet the room's own sill and jambs.
      for(const y of [h.y0,h.y1])for(let i=0;i<16;i++){
        const a=T.MathUtils.lerp(h.x0,h.x1,i/16),b=T.MathUtils.lerp(h.x0,h.x1,(i+1)/16);
        quad(p,[[a,y,h.inner],[b,y,h.inner],[b,y,hullZ(b,y,side)],[a,y,hullZ(a,y,side)]]);
      }
      for(const x of [h.x0,h.x1])for(let i=0;i<8;i++){
        const a=T.MathUtils.lerp(h.y0,h.y1,i/8),b=T.MathUtils.lerp(h.y0,h.y1,(i+1)/8);
        quad(p,[[x,a,h.inner],[x,b,h.inner],[x,b,hullZ(x,b,side)],[x,a,hullZ(x,a,side)]]);
      }
      const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(p,3));geometry.computeVertexNormals();
      const liningMesh=new T.Mesh(geometry,lining);reveals.add(liningMesh);
      if(h.room.id==='terraceAccess'){
        const glass=applyWindowFresnel(new T.MeshStandardMaterial({color:linearColor(0xaedbe5),roughness:.10,
          metalness:.08,transparent:true,opacity:.10,depthWrite:false,side:T.DoubleSide}));
        const pane=new T.Mesh(new T.PlaneGeometry(h.x1-h.x0,h.y1-h.y0),glass);
        pane.position.set((h.x0+h.x1)/2,(h.y0+h.y1)/2,h.inner);reveals.add(pane);
      }
    }
    let interior=false;
    return {rooms,groups,hasView:id=>rooms.some(r=>r.id===id),
      setInteriorView(id){
        const visible=rooms.some(r=>r.id===id);if(visible===interior)return;interior=visible;
        for(const group of groups){group.visible=visible;if(visible)group.traverse(p=>{if(p.isMesh)p.visible=true;});}
      }};
  })();

  // The carrier's orbital frame uses the habitat's installed metre coordinates.
  // The cradle, rail car and departure controller share the same berth transform.
  function kloseCarrierStation(body){
    const home=body.sites.find(s=>s.id==='grassland');
    return body.point(home.lat+.18,home.lon+.05,2400);
  }
  function carrierOrientation(T,center,surfacePoint){
    const radial=center.clone().normalize(),back=center.clone().sub(surfacePoint).normalize();
    const right=radial.clone().cross(back).normalize(),up=back.clone().cross(right).normalize();
    return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,back));
  }
  function createCarrierDock(T,world,body,room,berthId){
    const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
    const home=body.sites.find(s=>s.id==='grassland');
    const center=kloseCarrierStation(body);
    const orientation=carrierOrientation(T,center,body.point(home.lat,home.lon));
    const carrier=new T.Group();carrier.name='赛尔号 · 克洛斯星驻留轨道';world.add(carrier);
    carrier.position.copy(center);carrier.quaternion.copy(orientation);
    const hull=new T.Group();hull.scale.copy(ship.scale).multiplyScalar(habitat.metresPerRenderUnit);carrier.add(hull);
    // Reuse the installed exterior, sharing its geometries, textures and materials.
    for(const group of exterior){
      const clone=group.clone(true);
      clone.traverse(o=>{o.visible=true;o.castShadow=false;o.updateMatrix();o.matrixAutoUpdate=false;});hull.add(clone);
    }
    // Share the very same room geometries used by the walking controller.
    // Only the two glazed cabins are carried into this orbital scene; their
    // equipment, walls and window mullions remain at installed metre positions.
    const windowCabins=carrierGlazing.rooms.map(record=>{
      const source=habitat.ensureRoom(record.id),cabin=source.group.clone(true);
      cabin.position.fromArray(source.center);
      cabin.traverse(o=>{o.visible=true;o.castShadow=false;o.updateMatrix();o.matrixAutoUpdate=false;});
      cabin.visible=false;carrier.add(cabin);
      return {cabin,center:new T.Vector3().fromArray(source.center),side:source.side};
    });
    const addr=shipTransporters.ports(room),slot=Math.max(0,addr.findIndex(p=>p.id===berthId));
    const gate=shipTransporters.boardingPose(room,berthId)||{x:room.center[0],y:room.center[1],z:room.center[2]};
    const berth=V(room.center[0]+(slot-(addr.length-1)/2)*19,gate.y-8,-304);
    const start=V(gate.x,gate.y,gate.z),below=start.clone();below.y=berth.y;
    const end=berth.clone().add(V(0,0,11.8)),span=end.clone().sub(below),length=span.length();
    const fit=new T.Group();carrier.add(fit);
    const owned=new Set(),boxGeo=new T.BoxGeometry(1,1,1),stamp=new T.Object3D(),batches=new Map();
    const embarkRoom=room.group.clone(true);
    embarkRoom.position.fromArray(room.center);embarkRoom.visible=true;
    embarkRoom.updateMatrixWorld(true);carrier.updateMatrixWorld(true);
    const hatch=new T.Box3(V(start.x-1.8,start.y-.40,start.z-2.5),V(start.x+1.8,start.y+.19,start.z+2.5));
    const planes=[new T.Plane(V(1,0,0),-hatch.max.x),new T.Plane(V(-1,0,0),hatch.min.x),
      new T.Plane(V(0,0,1),-hatch.max.z),new T.Plane(V(0,0,-1),hatch.min.z),new T.Plane(V(0,1,0),-hatch.max.y)];
    for(const plane of planes)plane.applyMatrix4(carrier.matrixWorld);
    const cutMats=new Map();
    embarkRoom.traverse(o=>{
      if(!o.isMesh||Array.isArray(o.material)||o.isInstancedMesh)return;
      if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
      if(!o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld).intersectsBox(hatch))return;
      if(!cutMats.has(o.material)){
        const m=o.material.clone();
        m.onBeforeCompile=o.material.onBeforeCompile;
        m.customProgramCacheKey=o.material.customProgramCacheKey;
        m.clippingPlanes=planes;m.clipIntersection=true;owned.add(m);cutMats.set(o.material,m);
      }
      o.material=cutMats.get(o.material);
    });
    carrier.add(embarkRoom);
    const paint=(hex,glow=false,finish='paint')=>{
      const c=new T.Color(hex).convertSRGBToLinear();
      const m=glow?new T.MeshBasicMaterial({color:c}):applyManufacturedFinish(new T.MeshStandardMaterial({
        color:c,roughness:finish==='metal'?.39:.57,metalness:finish==='metal'?.72:.20}),finish);
      owned.add(m);return m;
    };
    const steel=paint(0x394b63,false,'metal'),deck=paint(0x7c8d9a),ivory=paint(0xdce4df),gold=paint(0xf0af4f);
    const cyan=paint(0x73eadd,true),light=paint(0xffdb95,true);
    function box(x,y,z,w,h,d,mat,angle=0){
      if(!batches.has(mat))batches.set(mat,[]);
      stamp.position.set(x,y,z);stamp.scale.set(w,h,d);stamp.rotation.set(0,angle,0);stamp.updateMatrix();
      batches.get(mat).push(stamp.matrix.clone());
    }
    const angle=Math.atan2(span.x,span.z),axis=span.clone().normalize(),side=V(axis.z,0,-axis.x);
    // Rails and fixed worklights stay still while the passenger cage passes them.
    for(const s of [-1,1]){
      const m=below.clone().lerp(end,.5).addScaledVector(side,s*2.25);
      box(m.x,m.y-.55,m.z,.32,.45,length,steel,angle);
      box(m.x,m.y-.27,m.z,.18,.12,length,deck,angle);
    }
    for(let d=2;d<length;d+=6){
      const p=below.clone().addScaledVector(axis,d);
      box(p.x,p.y-.72,p.z,5.6,.30,.32,steel,angle);
      for(const s of [-1,1]){
        const q=p.clone().addScaledVector(side,s*2.85);
        box(q.x,q.y+1.35,q.z,.18,4.5,.26,steel,angle);
        box(q.x,q.y+1.47,q.z,.24,.18,.29,cyan,angle);
      }
      box(p.x,p.y+3.5,p.z,5.85,.18,.31,deck,angle);
    }
    // A sealed shaft removes the passenger from the room floor before the
    // carriage enters the rail tunnel. The outboard span is a glazed gantry.
    const shellEnd=Math.max(0,length-118),mid=below.clone().addScaledVector(axis,shellEnd*.5);
    for(const s of [-1,1]){
      const q=mid.clone().addScaledVector(side,s*3.03);
      box(q.x,q.y+1.36,q.z,.16,4.45,shellEnd,steel,angle);
    }
    box(mid.x,mid.y+3.58,mid.z,6.2,.16,shellEnd,steel,angle);
    box(mid.x,mid.y-1,mid.z,6.2,.20,shellEnd,steel,angle);
    box(berth.x,berth.y-.4,berth.z+1.0,16,.8,27,deck);
    for(const s of [-1,1]){
      box(berth.x+s*7.2,berth.y+.34,berth.z+1,.25,.72,26,steel);
      box(berth.x+s*7.2,berth.y+.74,berth.z+1,.32,.12,25,cyan);
      for(let z=-10;z<13;z+=3)box(berth.x+s*5.9,berth.y+.018,berth.z+z,.37,.03,1.5,gold);
    }
    box(berth.x,berth.y-.22,berth.z+10.8,4.5,.46,5.4,ivory);
    for(const [mat,matrices] of batches){
      const mesh=new T.InstancedMesh(boxGeo,mat,matrices.length);
      matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;fit.add(mesh);
    }
    const car=new T.Group();carrier.add(car);
    function part(x,y,z,w,h,d,m){
      const mesh=new T.Mesh(boxGeo,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);car.add(mesh);return mesh;
    }
    part(0,-.11,0,3.5,.22,4.8,deck);part(0,2.81,0,3.5,.14,4.8,steel);
    for(const s of [-1,1]){
      for(const z of [-2.25,0,2.25])part(s*1.68,1.35,z,.12,2.72,.16,ivory);
      part(s*1.68,.68,0,.12,.13,4.7,gold);part(s*1.4,2.70,0,.14,.045,4.1,light);
    }
    const pane= new T.MeshBasicMaterial({color:0xa7d7ef,transparent:true,opacity:.09,depthWrite:false});
    owned.add(pane);for(const s of [-1,1])part(s*1.69,1.58,0,.035,1.66,4.45,pane);
    const gateLeaves=[-1,1].map(s=>part(s*.72,1.1,-2.20,1.4,2.2,.08,pane));
    const indicator=[-1,1].map(s=>part(s*.03,1.12,-2.27,.045,2.13,.04,cyan));
    let travel=0;const total=8+length;
    function setTravel(distance){
      travel=T.MathUtils.clamp(distance,0,total);
      embarkRoom.visible=travel<13;
      car.position.copy(start);
      if(travel<=8)car.position.y-=travel;
      else car.position.copy(below).addScaledVector(axis,travel-8);
      const open=1-T.MathUtils.smoothstep(Math.min(travel,total-travel),0,2);
      for(let i=0;i<2;i++){
        const sign=i?1:-1;gateLeaves[i].position.x=sign*(.72+open*1.39);
        indicator[i].position.x=sign*(.03+open*1.39);
      }
    }
    setTravel(0);carrier.updateMatrixWorld(true);
    const dockPosition=carrier.localToWorld(berth.clone()),inverse=orientation.clone().invert();
    const metric=ship.scale.clone().multiplyScalar(habitat.metresPerRenderUnit);
    function isBlocked(point){
      const p=point.clone().sub(center).applyQuaternion(inverse),x=p.x/metric.x;
      if(x<sections[0][0]||x>sections[sections.length-1][0])return false;
      const [beam,keel,belt,top]=station(x),y=p.y/metric.y-belt;
      const h=y>=0?top-belt:belt-keel;if(Math.abs(y)>h+.075)return false;
      const cs=Math.pow(Math.min(1,Math.abs(y)/h),1/.84);
      return Math.abs(p.z)<beam*metric.z*Math.pow(1-cs*cs,.425)+5.6;
    }
    const eye=new T.Vector3();
    function updateView(position){
      eye.copy(position);carrier.worldToLocal(eye);
      for(const {cabin,center,side} of windowCabins){
        const near=eye.distanceToSquared(center)<2200*2200&&side*(eye.z-center.z)>-35;
        cabin.visible=near;
      }
    }
    return {root:carrier,car,total,position:dockPosition,quaternion:orientation,corridor:35,corridorLength:35,
      isBlocked,setTravel,updateView,get travel(){return travel;},dispose(){
        world.remove(carrier);boxGeo.dispose();owned.forEach(m=>m.dispose());
        fit.traverse(o=>{if(o.isInstancedMesh)o.dispose?.();});
      }};
  }
