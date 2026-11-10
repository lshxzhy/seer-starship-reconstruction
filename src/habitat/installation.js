  // Full-size compartments, passages and lift stations share one Cartesian
  // coordinate system, in metres. The render scene retains its compact range
  // for WebGL depth precision and the existing exterior camera.
  const habitat = (() => {
    const lengthMetres = 795;
    const metresPerRenderUnit = lengthMetres / size.x;
    const scaledAxis = ship.scale.clone().multiplyScalar(metresPerRenderUnit);
    const installation = new T.Group();
    installation.name = 'SE-A015 扩建型 · 米制内部总装';
    installation.scale.set(1/scaledAxis.x, 1/scaledAxis.y, 1/scaledAxis.z);
    ship.add(installation);
    installation.visible = false;

    const crossSection = { width: 6.4, height: 4.4, branchWidth: 4.6, branchHeight: 3.65, doorWidth: 3.4 };
    const halfAisle = crossSection.width/2;
    const bodyRadius = .43;
    const levelSpecs = [
      ['pod','腹舱动力区',-3.28,0xf1ae55],
      ['lower','底层机务区',-1.28,0xefad58],
      ['central','中心科研区',-.48,0x42c5c1],
      ['upper','顶层观测区',.38,0x75b7ff],
      ['crown','塔顶指挥区',4.30,0xd3b06b]
    ];
    for(const d of crewBerths.deckSpecs)levelSpecs.push([d.id,d.name,d.floorY/scaledAxis.y,d.accent]);
    levelSpecs.sort((a,b)=>a[2]-b[2]);
    const levels = levelSpecs.map(([id,name,floor,accent]) => {
      const group = new T.Group();
      group.name = name + ' · 交通与安装';
      group.position.y = floor*scaledAxis.y;
      installation.add(group);
      return {id,name,floorY:group.position.y,accent,group,rects:[],stops:[],ports:[]};
    });
    const levelById = new Map(levels.map(l=>[l.id,l]));
    const roomSpecs = [
      // A positive side is starboard. The distance is between the ship's
      // centerline and the sill of the room's actual bulkhead opening.
      ['teleport','传送舱','lower',38,30,12,-1,27,0x39d5dc,'手册的后部底层布置与游戏传送舱场景；舱门外支廊及米制尺寸为扩建设计。'],
      ['machine','机械室','lower',38,28,10,1,32,0xeeb559,'手册底层机械室及瞭望舱入口资料；备件路线和检修工位为设计补全。'],
      ['workshop','发明室','lower',32,24,9,-1,34,0xf49d61,'手册舰艏侧的发明室；试制、装配和校准工位按工作流布置。'],
      ['instructor','教官办公室','lower',24,20,7,1,23,0x699ed9,'手册和教官办公室通往底层走廊的游戏画面；支廊长度为推定。'],
      ['laboratory','实验室','central',36,26,10,-1,35,0x63d5bc,'经典手册中的后部科研空间；内部工作流和米制净空为本项目推定。'],
      ['archives','资料室','central',30,24,8,-1,23,0x87a1ed,'手册资料室与传送舱入口标注；设备后场及资料存储区为工程补全。'],
      ['honors','荣誉大厅','central',46,32,13,-1,39,0xe5b05f,'手册和荣誉大厅游戏场景；登台路线及分层连接由项目补全。'],
      ['observation','瞭望舱','upper',40,28,11,-1,65,0x79cdff,'手册前上方瞭望舱与长筒观测装置截图；维护空间及舱室绝对尺寸为推定。'],
      ['terraceAccess','瞭望露台','upper',40,26,10,1,62,0x73cabf,'手册前上方瞭望露台；观景面、护栏和连接前室为扩建设计。'],
      ['captain','船长室','crown',32,26,9,-1,8.8,0x77c6ec,'手册塔冠船长室；总指挥席、升降站和设备安装细部为推定。'],
      ['power','动力室','pod',44,32,15,-1,9.2,0xf4ba43,'手册将动力室标在后下悬舱，游戏 G04 可见金色设备与环道；扩建版为设备搬运增加专用升降支线。']
    ];
    // Fore observation spaces meet the flanks carrying the original double
    // window belts. Fit their outboard ends to the narrowest hull section
    // across their full width and across the complete height of the glazing.
    function glazedSillOffset(cx,width,depth,floorY,height){
      const x0=(cx-width/2)/scaledAxis.x, x1=(cx+width/2)/scaledAxis.x;
      const stations=[x0,...sections.map(s=>s[0]).filter(x=>x>x0&&x<x1),x1];
      let limit=Infinity;
      for(const x of stations)for(const y of [floorY,(floorY+height)]){
        const [w,keel,belt,top]=station(x),dy=y/scaledAxis.y-belt;
        const cosine=Math.sign(dy)*Math.pow(Math.abs(dy)/(dy>=0?top-belt:belt-keel),1/.84);
        const beam=w*Math.pow(Math.max(0,1-cosine*cosine),.425)*(1+.10*Math.min(0,cosine));
        limit=Math.min(limit,beam*scaledAxis.z);
      }
      return limit-depth-.95;
    }
    const rooms = roomSpecs.map(([id,name,level,width,depth,height,side,standOff,accent,basis]) => {
      const macro = interiorModel.rooms.find(r=>r.id===id);
      if(!macro) throw new Error('缺少舱区基准：'+name);
      const deck=levelById.get(level);
      const cx=macro.center[0]*scaledAxis.x;
      const atGlazing=id==='observation'||id==='terraceAccess';
      const doorZ=side*(atGlazing?glazedSillOffset(cx,width,depth,deck.floorY,height):standOff);
      const cz=doorZ+side*depth/2;
      const group=new T.Group();
      group.name=name+' · 实尺度舱';
      group.position.set(cx,0,cz);
      group.rotation.y=side===1?Math.PI:0;
      deck.group.add(group);
      const spec={id,name,width,depth,height,accent,basis,source:'docs/SOURCES.md',
        openRoof:id==='terraceAccess',skyWindow:id==='terraceAccess'||id==='observation'};
      const room={id,name,level,spec,group,center:[cx,deck.floorY,cz],door:[cx,deck.floorY,doorZ],
        yawRad:group.rotation.y,side,brief:basis,built:false};
      deck.ports.push({x:cx,side,room,width:crossSection.branchWidth});
      return room;
    });
    const byId=new Map(rooms.map(r=>[r.id,r]));
    // Static fittings are compiled after the room builder has finished placing
    // them. Small pieces in the same bay and physical parent can share one
    // ordinary mesh, with real bounds for frustum culling and room raycasts.
    function batchCabinFittings(room,kit){
      const knownGeometry=new Set(cabinAssets.geometries.values());
      const bounds=new Map(),probe=new T.Box3(),extent=new T.Vector3();
      const localBox=g=>{
        if(!bounds.has(g))bounds.set(g,new T.Box3().setFromBufferAttribute(g.attributes.position));
        return bounds.get(g);
      };
      function eligible(part){
        if(part.type!=='Mesh'||part.children.length||!part.visible||part.name||part.animations.length||
            part.layers.mask!==1||part.renderOrder||!part.frustumCulled||!part.matrixAutoUpdate||
            !part.material?.isMeshStandardMaterial||part.material.transparent||part.material.wireframe||
            part.material.transmission||part.material.displacementMap||part.material.alphaTest||
            part.material.onBeforeCompile!==T.Material.prototype.onBeforeCompile||
            part.scale.x<=0||part.scale.y<=0||part.scale.z<=0||
            Object.keys(part.userData).length||part.customDepthMaterial||part.customDistanceMaterial||
            part.raycast!==T.Mesh.prototype.raycast||part.onBeforeRender!==T.Object3D.prototype.onBeforeRender||
            part.onAfterRender!==T.Object3D.prototype.onAfterRender)return false;
        const g=part.geometry,a=g.attributes;
        return knownGeometry.has(g)&&!Object.keys(g.morphAttributes).length&&
          a.position?.count<=384&&a.normal&&a.uv&&Object.keys(a).length===3&&
          g.drawRange.start===0&&g.drawRange.count===Infinity;
      }
      // The boarding light classifies a fitting by its world-space bounds.
      // The render parent, material and original shadow flags are preserved;
      // skip a merge when the combined bounds would change that classification.
      function majorCaster(box,matrix){
        probe.copy(box).applyMatrix4(matrix).getSize(extent).multiplyScalar(metresPerRenderUnit);
        return extent.y>.20&&Math.max(extent.x,extent.z)>.60;
      }
      const metrics={shell:{sources:0,batches:0},equipment:{sources:0,batches:0},drawsSavedIfVisible:0};
      function merge(group,parts,shell,caster){
        if(parts.length<3)return;
        if(!shell&&!parts[0].castShadow){
          const outer=new T.Box3(),scratch=new T.Box3();
          for(const part of parts)outer.union(scratch.copy(localBox(part.geometry)).applyMatrix4(part.matrix));
          if(majorCaster(outer,group.matrixWorld)!==caster)return;
        }
        let vertices=0,indices=0;
        for(const part of parts){
          const g=part.geometry;vertices+=g.attributes.position.count;
          indices+=g.index?g.index.count:g.attributes.position.count;
        }
        const positions=new Float32Array(vertices*3),normals=new Float32Array(vertices*3);
        const uv=new Float32Array(vertices*2),order=new Uint16Array(indices);
        const v=new T.Vector3(),normalMatrix=new T.Matrix3();
        let first=0,next=0;
        for(const part of parts){
          const g=part.geometry,a=g.attributes;normalMatrix.getNormalMatrix(part.matrix);
          for(let i=0;i<a.position.count;i++){
            const at=first+i;
            v.fromBufferAttribute(a.position,i).applyMatrix4(part.matrix).toArray(positions,at*3);
            v.fromBufferAttribute(a.normal,i).applyNormalMatrix(normalMatrix).toArray(normals,at*3);
            uv[at*2]=a.uv.getX(i);uv[at*2+1]=a.uv.getY(i);
          }
          const count=g.index?g.index.count:a.position.count;
          for(let i=0;i<count;i++)order[next++]=first+(g.index?g.index.getX(i):i);
          first+=a.position.count;
        }
        const g=new T.BufferGeometry();
        g.setAttribute('position',new T.BufferAttribute(positions,3));
        g.setAttribute('normal',new T.BufferAttribute(normals,3));
        g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(new T.BufferAttribute(order,1));
        g.computeBoundingBox();
        if(!shell&&!parts[0].castShadow&&majorCaster(g.boundingBox,group.matrixWorld)!==caster)return;
        g.computeBoundingSphere();
        const result=new T.Mesh(g,parts[0].material);
        result.castShadow=parts[0].castShadow;result.receiveShadow=parts[0].receiveShadow;
        for(const part of parts)group.remove(part);
        group.add(result);
        const count=shell?metrics.shell:metrics.equipment;
        count.sources+=parts.length;count.batches++;metrics.drawsSavedIfVisible+=parts.length-1;
      }
      function visit(group,shell){
        if(group.animations.length)return;
        const children=group.children.slice(),bins=new Map();
        for(const part of children){
          if(part.isGroup){visit(part,shell||part===kit.shell);continue;}
          if(!eligible(part))continue;
          const caster=!shell&&!part.castShadow&&majorCaster(localBox(part.geometry),part.matrixWorld);
          const p=part.position,cell=[Math.floor(p.x/12),Math.floor(p.y/8),Math.floor(p.z/12)];
          const key=[part.material.id,part.castShadow,part.receiveShadow,caster,...cell].join('/');
          let bin=bins.get(key);if(!bin){bin={parts:[],vertices:0,caster};bins.set(key,bin);}
          const count=part.geometry.attributes.position.count;
          if(bin.vertices+count>4096){merge(group,bin.parts,shell,caster);bin.parts=[];bin.vertices=0;}
          bin.parts.push(part);bin.vertices+=count;
        }
        for(const bin of bins.values())merge(group,bin.parts,shell,bin.caster);
      }
      room.group.updateWorldMatrix(true,true);
      visit(room.group,false);
      room.group.userData.staticBatching=metrics;
    }
    function buildRoom(room) {
      if(room.built)return;
      const builder=cabinBuilders[room.id];
      if(typeof builder!=='function')throw new Error('未装配舱室模块：'+room.name);
      const kit=buildRoomKit(room.group,room.spec);
      builder(kit);
      batchCabinFittings(room,kit);
      room.roof=kit.roof;
      room.built=true;
    }
    const wardGroups=new Map();
    for(const zone of crewBerths.zones){
      // Use the actual shell profile at the two ends and its intervening
      // stations; include deck thickness, side plating and overhead frames.
      const clearBeam=glazedSillOffset(zone.cx,zone.width+.5,0,zone.floorY-.21,zone.height+.44)+.95;
      zone.hullMargin=clearBeam-Math.max(Math.abs(zone.z0),Math.abs(zone.z1))-.23;
      if(zone.hullMargin<0)throw new Error(zone.name+'与船壳相交');
      levelById.get(zone.level).ports.push({x:zone.cx,side:zone.side,width:5.4,zone});
    }
    const portLabel=p=>p.room?.name||p.zone?.name||p.stop.line.name;

    // Lifts occupy side bays, leaving the straight corridor unobstructed.
    // Main lift shaft lies directly below the tower. The shorter service
    // line follows the sloping neck of the underslung engineering pod.
    const liftLines=[
      {id:'main',name:'塔桥主升降机',stations:[['lower',-1.46],...crewBerths.deckSpecs.map(d=>[d.id,-1.46]),['central',-1.46],['upper',-1.46],['crown',-1.46]]},
      {id:'service',name:'动力舱检修升降机',stations:[['pod',-2.48],['lower',-2.10]]}
    ];
    for(const line of liftLines){
      line.stops=line.stations.map(([id,stationX])=>{
        const deck=levelById.get(id),stop={deck,line,x:stationX*scaledAxis.x,z:6.45};
        deck.stops.push(stop);
        deck.ports.push({x:stop.x,side:1,width:3.05,stop});
        return stop;
      });
    }
    function floorRect(deck,x0,x1,z0,z1){
      deck.rects.push({x0:Math.min(x0,x1),x1:Math.max(x0,x1),z0:Math.min(z0,z1),z1:Math.max(z0,z1)});
    }
    const cachedMaterials=new Map();
    const cube=new T.BoxGeometry(1,1,1);
    const batches=new Map();
    // An octagonal cross-section gives the access covers and cast doorway
    // fittings real side faces. It is shared by every stamp in the passage.
    const coverOutline=new T.Shape();
    [[-.34,-.5],[.34,-.5],[.50,-.34],[.50,.31],[.33,.50],[-.33,.50],[-.50,.31],[-.50,-.34]]
      .forEach(([x,y],i)=>i?coverOutline.lineTo(x,y):coverOutline.moveTo(x,y));
    coverOutline.closePath();
    const castCover=new T.ExtrudeGeometry(coverOutline,{depth:1,bevelEnabled:false});
    castCover.translate(0,0,-.5);
    const coverBatches=new Map();
    const symbolFace=new T.PlaneGeometry(1,1);
    const symbolBatches=new Map();
    const pen=new T.Object3D();
    function metal(color,emission=0) {
      const key=color+'/'+emission;
      if(!cachedMaterials.has(key)){
        const tone=new T.Color(color).convertSRGBToLinear();
        cachedMaterials.set(key,new T.MeshStandardMaterial({color:tone,metalness:.22,roughness:.54,
          emissive:emission?tone:0,emissiveIntensity:emission}));
      }
      return cachedMaterials.get(key);
    }
    const paint={skin:metal(0xa9bac9),ivory:metal(0xdae2e1),base:metal(0x32465b),
      floor:metal(0x52677b),ceiling:metal(0x61788c),trim:metal(0x263e52),silver:metal(0x889bad),
      marking:metal(0xc3d1ca),orange:metal(0xf2ab4a),light:metal(0xb6eaff,.70)};
    function stamp(collection,parent,material) {
      const matrix=pen.matrix.clone();
      if(parent.userData.passageFrame){
        matrix.premultiply(parent.matrix);
        parent=parent.parent;
      }
      let bins=collection.get(parent);
      if(!bins){bins=new Map();collection.set(parent,bins);}
      if(!bins.has(material))bins.set(material,[]);
      bins.get(material).push(matrix);
    }
    function plate(parent,material,x,y,z,w,h,d,yaw=0) {
      if(w<=.001||h<=.001||d<=.001)return;
      pen.position.set(x,y,z);pen.rotation.set(0,yaw,0);pen.scale.set(w,h,d);pen.updateMatrix();
      stamp(batches,parent,material);
    }
    function flush(){
      for(const [collection,geometry] of [[batches,cube],[coverBatches,castCover],[symbolBatches,symbolFace]]){
        for(const [parent,bins] of collection)for(const [material,matrices] of bins){
          const part=new T.InstancedMesh(geometry,material,matrices.length);
          matrices.forEach((matrix,i)=>part.setMatrixAt(i,matrix));
          part.instanceMatrix.needsUpdate=true;part.frustumCulled=false;
          part.receiveShadow=true;parent.add(part);
        }
        collection.clear();
      }
    }
    function wayfinding(parent,text,x,y,z,width,height,yaw,color) {
      const canvas=document.createElement('canvas');
      canvas.width=640;canvas.height=104;
      const ctx=canvas.getContext('2d');
      ctx.fillStyle='#13293c';ctx.fillRect(0,0,640,104);
      ctx.fillStyle=color;ctx.fillRect(0,0,13,104);
      ctx.fillStyle='#e8f3f0';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font='500 53px "Microsoft YaHei", sans-serif';ctx.fillText(text,325,52,580);
      const map=new T.CanvasTexture(canvas);map.encoding=T.sRGBEncoding;
      const m=new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshBasicMaterial({map,toneMapped:false}));
      m.position.set(x,y,z);m.rotation.y=yaw;parent.add(m);
    }
    const passagePaint={
      skin:metal(0x90969d), cover:metal(0xe8d8ac), edge:metal(0x57616b),
      recess:metal(0x303b4b), crown:metal(0x12546e), rim:metal(0x86aab3),
      teal:metal(0x44d9df,.22), latch:metal(0xb64c44), track:metal(0xa8afb4)
    };
    function cover(parent,material,x,y,z,w,h,d,rx=0,rz=0){
      pen.position.set(x,y,z);pen.rotation.set(rx,0,rz);pen.scale.set(w,h,d);pen.updateMatrix();
      stamp(coverBatches,parent,material);
    }
    function wallFrame(parent,x,z,side,name){
      const frame=new T.Group();frame.name=name;frame.position.set(x,0,z);
      frame.rotation.y=side>0?Math.PI:0;frame.updateMatrix();
      frame.userData.passageFrame=true;parent.add(frame);return frame;
    }
    // The archived game views show illuminated emblems framed over each
    // threshold. Draw our symbols from paths rather than using game textures.
    const doorSigns=new Map();
    function doorSymbol(kind){
      if(doorSigns.has(kind))return doorSigns.get(kind);
      const c=document.createElement('canvas');c.width=224;c.height=128;
      const ctx=c.getContext('2d');ctx.fillStyle=kind==='cabinet'?'#dfd2af':'#101e30';ctx.fillRect(0,0,224,128);
      ctx.translate(112,64);ctx.strokeStyle='#63dded';ctx.fillStyle='#63dded';ctx.lineWidth=7;
      const path=points=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();};
      if(kind==='cabinet'){
        ctx.strokeStyle='#597d85';ctx.lineWidth=6;
        ctx.beginPath();ctx.arc(0,0,43,0,Math.PI*2);ctx.stroke();
        path([[-13,26],[-13,-26],[19,-26]]);path([[-13,-3],[13,-3]]);
      }else if(kind==='power'){
        for(let k=0;k<4;k++){path([[0,-46],[14,-16],[30,-9],[15,1],[2,-8]]);ctx.rotate(Math.PI/2);}
        ctx.beginPath();ctx.arc(0,0,9,0,Math.PI*2);ctx.fill();
      }else if(kind==='instructor'){
        const points=[];for(let i=0;i<=10;i++){
          const a=-Math.PI/2+i*Math.PI/5,r=i%2?19:42;points.push([Math.cos(a)*r,Math.sin(a)*r]);
        }path(points);
      }else if(kind==='lift'){
        path([[-35,10],[-17,-14],[1,10]]);path([[-1,-10],[17,14],[35,-10]]);
      }else{
        const ring=r=>{ctx.beginPath();ctx.ellipse(0,0,r,r*.70,0,0,2*Math.PI);ctx.stroke();};
        ring(43);ring(32);ring(15);
        for(let i=0;i<8;i++){const a=i*Math.PI/4;path([[23*Math.cos(a),16*Math.sin(a)],[33*Math.cos(a),23*Math.sin(a)]]);}
      }
      const map=new T.CanvasTexture(c);map.encoding=T.sRGBEncoding;
      const sign=new T.MeshBasicMaterial({map,toneMapped:false});doorSigns.set(kind,sign);return sign;
    }
    function symbol(parent,kind,x,y,z,w,h){
      pen.position.set(x,y,z);pen.rotation.set(0,0,0);pen.scale.set(w,h,1);pen.updateMatrix();
      stamp(symbolBatches,parent,doorSymbol(kind));
    }
    function classicDoor(deck,x,z,side,width,opening,ceiling,kind){
      const p=passagePaint,g=wallFrame(deck.group,x,z,side,'游戏底层通廊 · 开放门框');
      const header=ceiling-opening,mid=opening+header*.5;
      // All shoulder pieces lie outside the navigable door width. The open
      // threshold and lift stop still use their existing metric footprints.
      plate(g,p.recess,0,mid,-.11,width+.74,header,.49);
      cover(g,p.skin,0,mid-.04,.09,width+.98,header*.85,.28);
      for(const edge of [-1,1]){
        const vx=edge*(width/2+.28);
        cover(g,p.recess,vx,opening/2,0,.63,opening+.1,.47);
        cover(g,p.cover,vx,opening/2,.12,.47,opening-.02,.36);
        cover(g,p.edge,vx,opening*.79,.30,.31,opening*.25,.12,0,-edge*.10);
        cover(g,p.teal,edge*(width/2+.06),opening*.50,.27,.067,opening*.72,.08);
        cover(g,p.rim,vx,.20,.20,.71,.38,.44);
        cover(g,p.cover,vx,opening-.08,.20,.73,.48,.39,0,-edge*.28);
      }
      cover(g,p.cover,0,mid,.27,1.29,header*.89,.26);
      cover(g,p.recess,0,mid,.418,.99,header*.68,.057);
      symbol(g,kind,0,mid,.45,.89,header*.58);
      plate(g,p.latch,0,opening+.046,.237,.62,.074,.11);
      // A D-shaped blue sill reads from above and from a robot's eye level.
      cover(g,p.recess,0,.012,.48,width*.78,.91,.018,-Math.PI/2);
      cover(g,p.crown,0,.024,.48,width*.70,.73,.014,-Math.PI/2);
      cover(g,p.teal,0,.033,.78,width*.43,.092,.012,-Math.PI/2);
      for(const edge of [-1,1]){
        plate(g,paint.ivory,edge*width*.36,.028,.59,.12,.018,.19,-edge*.43);
        plate(g,p.teal,edge*.20,.037,1.22,.52,.015,.086,-edge*.63);
        plate(g,p.teal,edge*.20,.037,1.56,.52,.015,.086,-edge*.63);
      }
    }
    function classicWall(deck,side,x0,x1){
      const span=x1-x0;if(span<=.01)return;
      const p=passagePaint,g=wallFrame(deck.group,(x0+x1)/2,side*halfAisle,side,'底层机务壁面');
      // Recess the grey hull between its projecting crown and toe guard.
      // The original walkable boundary stays at local Z=0.
      plate(g,p.skin,0,2.17,-.30,span,4.34,.21);
      plate(g,p.recess,0,.34,-.16,span,.68,.23);
      plate(g,p.rim,0,.19,.024,span,.13,.18);
      plate(g,p.edge,0,1.55,-.165,span,.13,.081);
      plate(g,p.recess,0,3.78,-.08,span,.68,.36);
      plate(g,p.crown,0,3.74,.082,span,.34,.17);
      plate(g,p.teal,0,3.61,.17,span,.035,.028);
      plate(g,p.cover,0,4.25,-.07,span,.22,.31);
      const count=Math.floor((span-.90)/4.6);
      for(let j=0;j<count;j++){
        const xx=(j-(count-1)/2)*4.6;
        if(j%2===0){
          cover(g,p.recess,xx,2.08,-.115,1.71,2.53,.26);
          cover(g,p.cover,xx,2.10,.034,1.53,2.37,.19);
           symbol(g,'cabinet',xx-.32,2.52,.140,.43,.34);
          for(let k=0;k<8;k++)plate(g,p.crown,xx+.34,1.58+k*.14,.15,.34,.080,.048);
          // An independent small access hatch sits proud of the cabinet foot.
          cover(g,p.cover,xx,.77,.012,.96,.50,.32);
          cover(g,p.recess,xx,.79,.181,.68,.26,.055);
          for(let k=0;k<3;k++)plate(g,p.rim,xx,.74+.052*k,.225,.54,.021,.020);
        }else{
          cover(g,p.edge,xx,2.36,-.10,2.20,1.30,.24);
          cover(g,p.cover,xx,2.36,.034,2.04,1.14,.14);
          cover(g,p.crown,xx,2.36,.117,1.87,.96,.072);
          cover(g,p.teal,xx+.76,1.98,.163,.14,.10,.022);
        }
      }
    }
    function emitWall(deck,s,x0,x1) {
      if(deck.id==='lower'||deck.id==='pod'){classicWall(deck,s,x0,x1);return;}
      const x=(x0+x1)/2,span=x1-x0,z=s*(halfAisle+.15),h=crossSection.height;
      plate(deck.group,paint.skin,x,h/2,z,span,h,.30);
      plate(deck.group,paint.trim,x,.36,z-s*.16,span,.72,.12);
      plate(deck.group,paint.silver,x,1.23,z-s*.17,span,.10,.11);
      plate(deck.group,metal(deck.accent),x,2.95,z-s*.16,span,.12,.09);
      // G02/G03: a dark blue horizontal crown, a toe rail, alternating
      // ivory service covers and cyan door jambs identify the lower passage.
      plate(deck.group,paint.trim,x,3.67,z-s*.16,span,.52,.13);
      plate(deck.group,metal(0x297e9d),x,3.67,z-s*.245,span,.22,.062);
      for(let q=x0+3.3;q<x1-2.3;q+=9.8){
        plate(deck.group,paint.base,q,1.92,z-s*.245,2.2,1.47,.13);
        plate(deck.group,paint.ivory,q,1.95,z-s*.33,2.0,1.32,.065);
        for(let j=0;j<6;j++)
          plate(deck.group,metal(0x528a9e),q+.46,1.58+j*.13,z-s*.38,.40,.058,.025);
        plate(deck.group,paint.trim,q-.43,2.13,z-s*.38,.50,.29,.030);
        plate(deck.group,paint.light,q-.43,2.13,z-s*.41,.37,.17,.018);
      }
    }
    function buildSpine(deck){
      const xs=deck.ports.map(p=>p.x);
      const lo=Math.min(...xs)-6.5,hi=Math.max(...xs)+6.5,mid=(lo+hi)/2;
      deck.bounds={lo,hi};
      floorRect(deck,lo,hi,-halfAisle,halfAisle);
      const h=crossSection.height;
      const g=deck.group;
      plate(g,paint.floor,mid,-.105,0,hi-lo,.21,crossSection.width);
      plate(g,paint.ceiling,mid,h+.10,0,hi-lo,.20,crossSection.width+.46);
      for(const s of [-1,1]){
        plate(g,paint.trim,mid,.007,s*2.40,hi-lo,.014,.45);
        plate(g,metal(deck.accent,.18),mid,.020,s*2.41,hi-lo,.011,.09);
        plate(g,paint.trim,mid,h-.08,s*2.56,hi-lo,.20,.49);
        const ports=deck.ports.filter(p=>p.side===s).sort((a,b)=>a.x-b.x);
        let cursor=lo;
        for(const p of ports){
          const a=p.x-p.width/2,b=p.x+p.width/2;
          emitWall(deck,s,cursor,a);
          const classic=deck.id==='lower'||deck.id==='pod';
          if(classic){
            const kind=p.stop?(p.stop.line.id==='service'?'power':'lift'):p.room?.id||'lift';
            classicDoor(deck,p.x,s*halfAisle,s,p.width,3.55,h,kind);
          }else{
          plate(g,paint.base,p.x,3.99,s*(halfAisle+.11),p.width,.82,.40);
          for(const flank of [-1,1]){
            const jambX=p.x+flank*(p.width/2+.145),faceZ=s*(halfAisle-.015);
            plate(g,paint.trim,jambX,1.78,faceZ,.40,3.56,.47);
            plate(g,paint.ivory,jambX,1.82,faceZ-s*.15,.28,3.32,.24);
            plate(g,paint.light,jambX-flank*.065,1.89,faceZ-s*.294,.065,2.49,.045);
            plate(g,paint.silver,jambX,.21,faceZ-s*.10,.49,.42,.41);
            // Flush chevron on the floor; its point faces the open doorway.
            plate(g,metal(0x5faec1,.23),p.x+flank*.31,.023,s*(halfAisle-1.14),.81,.014,.12,s*flank*.52);
          }
          plate(g,metal(0xbc5045,.25),p.x,3.59,s*(halfAisle-.125),.80,.11,.075);
          }
          const name=portLabel(p);
          if(classic){
            wayfinding(g,name,p.x+1.30,4.02,s*(halfAisle-.26),1.33,.26,s>0?Math.PI:0,'#69cdde');
          }else{
            wayfinding(g,name,p.x,3.98,s*(halfAisle-.11),Math.min(3.35,p.width-.12),.46,s>0?Math.PI:0,'#'+deck.accent.toString(16).padStart(6,'0'));
          }
          cursor=b;
        }
        emitWall(deck,s,cursor,hi);
      }
      if(deck.id==='lower'||deck.id==='pod'){
        // G03 has two long segmented tracks crossing the blue apron. Their
        // short seams run across the direction of travel; the surface is flush.
        const tileLength=2.24,count=Math.ceil((hi-lo)/tileLength);
        for(const side of [-1,1]){
          const z=side*.84;
          plate(g,passagePaint.edge,mid,.017,z,hi-lo,.018,1.09);
          for(let i=0;i<count;i++){
            const left=lo+i*tileLength,w=Math.min(tileLength,hi-left);
            plate(g,passagePaint.track,left+w/2,.03,z,w-.028,.014,.98);
          }
        }
      }
      for(const x of [lo-.10,hi+.10]){
        plate(g,paint.skin,x,h/2,0,.20,h,crossSection.width+.38);
        wayfinding(g,deck.name,x+(x<lo?.13:-.13),2.24,0,3.55,.54,x<lo?Math.PI/2:-Math.PI/2,'#73c8d5');
      }
      // Repeat the panel-and-light rhythm of the game corridor. Side frames
      // stop at each doorway and floor markings pass through the junctions.
      for(let x=lo+1.2;x<hi-.4;x+=7.25){
        plate(g,paint.base,x,h-.08,0,.28,.19,crossSection.width+.20);
        plate(g,paint.trim,x+1.9,h-.08,0,2.75,.18,1.16);
        plate(g,paint.light,x+1.9,h-.19,0,2.37,.048,.64);
        plate(g,paint.base,x,.011,0,.038,.012,crossSection.width-.22);
        for(const s of [-1,1]){
          if(deck.ports.some(p=>p.side===s&&Math.abs(p.x-x)<p.width/2+.65))continue;
          plate(g,paint.base,x,h/2,s*(halfAisle-.055),.28,h,.14);
          plate(g,paint.ivory,x,1.98,s*(halfAisle-.14),.15,1.52,.06);
          plate(g,paint.light,x,2.62,s*(halfAisle-.19),.12,.13,.045);
        }
      }
      const junctions=deck.ports.map(p=>({x:p.x,name:portLabel(p)}));
      for(let x=lo+4;x<hi-3;x+=46){
        const forward=junctions.filter(j=>j.x>x+.50).sort((a,b)=>a.x-b.x)[0];
        const aft=junctions.filter(j=>j.x<x-.50).sort((a,b)=>b.x-a.x)[0];
        if(!forward&&!aft)continue;
        plate(g,paint.trim,x,h-.64,0,.085,.64,3.2);
        for(const z of [-1.05,1.05])plate(g,paint.silver,x,h-.18,z,.054,.42,.054);
        if(forward)wayfinding(g,forward.name+'   '+Math.round(forward.x-x)+' m',x-.046,h-.64,0,3.08,.47,-Math.PI/2,'#83d2d8');
        if(aft)wayfinding(g,aft.name+'   '+Math.round(x-aft.x)+' m',x+.046,h-.64,0,3.08,.47,Math.PI/2,'#83d2d8');
      }
    }
    function buildBranch(deck,room){
      const g=deck.group,s=room.side,x=room.center[0],door=room.door[2];
      const D=Math.abs(door)-halfAisle,mid=(s*halfAisle+door)/2;
      const w=crossSection.branchWidth,h=crossSection.branchHeight;
      // An overlapping sill connects the two navigable polygons across the
      // actual 3.4 m room aperture. The airlock frame narrows at its jambs.
      floorRect(deck,x-w/2,x+w/2,s*halfAisle,door-s*.60);
      floorRect(deck,x-crossSection.doorWidth/2,x+crossSection.doorWidth/2,door-s*.70,door+s*.22);
      plate(g,paint.floor,x,-.105,mid,w,.21,D);
      plate(g,paint.ceiling,x,h+.09,mid,w+.28,.18,D);
      for(const sign of [-1,1]){
        const wx=x+sign*(w/2+.09);
        plate(g,paint.skin,wx,h/2,mid,.18,h,D);
        plate(g,paint.base,wx-sign*.13,.38,mid,.1,.76,D);
        plate(g,metal(deck.accent),wx-sign*.13,2.60,mid,.09,.10,D);
        plate(g,metal(deck.accent,.14),x+sign*1.62,.01,mid,.052,.02,D);
      }
      for(let dz=halfAisle+1.5;dz<Math.abs(door)-.80;dz+=5.8){
        plate(g,paint.base,x,h-.04,s*dz,w+.18,.20,.20);
        plate(g,paint.light,x,h-.16,s*dz,1.55,.07,.48);
        for(const sign of [-1,1])plate(g,paint.trim,x+sign*w/2,h/2,s*dz,.12,h,.18);
      }
      for(let dz=halfAisle+14;dz<Math.abs(door)-7;dz+=32){
        const z=s*dz;
        plate(g,paint.trim,x,h-.40,z,2.9,.48,.07);
        for(const k of [-1,1])plate(g,paint.silver,x+k*.99,h-.12,z,.045,.27,.045);
        wayfinding(g,room.name+'  '+Math.round(Math.abs(door)-dz)+' m',
          x,h-.4,z-s*.040,2.8,.38,s>0?Math.PI:0,'#66cad9');
        wayfinding(g,'主廊  '+Math.round(dz-halfAisle)+' m',
          x,h-.4,z+s*.040,2.8,.38,s>0?0:Math.PI,'#eeb266');
      }
      for(const sign of [-1,1]){
        const width=(w-crossSection.doorWidth)/2;
        plate(g,paint.base,x+sign*(crossSection.doorWidth/2+width/2),h/2,door-s*.12,width,h,.26);
      }
      plate(g,paint.base,x,(h+3.1)/2,door-s*.12,crossSection.doorWidth,h-3.1,.26);
      if(deck.id==='lower'||deck.id==='pod'){
        classicDoor(deck,x,door-s*.13,s,crossSection.doorWidth,3.10,h,room.id);
        wayfinding(g,room.name,x+.96,3.43,door-s*.59,1.14,.21,s>0?Math.PI:0,'#8fdddf');
      }else{
        wayfinding(g,room.name,x,3.40,door-s*.26,3.3,.36,s>0?Math.PI:0,'#8fdddf');
      }
      floorRect(deck,x-room.spec.width/2,x+room.spec.width/2,room.center[2]-room.spec.depth/2,room.center[2]+room.spec.depth/2);
    }
    function buildLift(stop){
      const {deck,x,z,line}=stop,g=deck.group,w=4.48,d=5.38,h=3.75;
      const back=z+d/2;
      floorRect(deck,x-1.52,x+1.52,halfAisle-.03,z-d/2+.10);
      floorRect(deck,x-w/2,x+w/2,z-d/2,back);
      plate(g,paint.base,x,-.13,(halfAisle+back)/2,w+.35,.26,back-halfAisle);
      plate(g,paint.floor,x,.001,z,w,.034,d);
      plate(g,paint.ceiling,x,h+.07,(halfAisle+back)/2,w+.35,.20,back-halfAisle);
      for(const side of [-1,1]){
        plate(g,paint.trim,x+side*(w/2+.10),h/2,(halfAisle+back)/2,.20,h,back-halfAisle);
        plate(g,metal(deck.accent),x+side*(w/2-.02),1.36,z,.08,.16,d);
        plate(g,paint.silver,x+side*(w/2-.025),1.04,z,.10,.09,d);
        const wing=(w-3.05)/2;
        plate(g,paint.skin,x+side*(1.525+wing/2),h/2,halfAisle+.23,wing,h,.55);
      }
      plate(g,paint.skin,x,h/2,back+.11,w+.3,h,.22);
      plate(g,paint.light,x,h-.045,z,w-1.20,.08,1.15);
      const displayX=x+.79;
      plate(g,paint.trim,displayX,1.53,back-.12,.60,.90,.15);
      plate(g,paint.light,displayX,1.64,back-.206,.38,.30,.018);
      wayfinding(g,line.name,x,2.65,back-.03,3.27,.5,Math.PI,'#efbd66');
      // Directional floor chevrons identify the boarding threshold.
      for(let i=0;i<7;i++)plate(g,i%2?paint.orange:paint.base,x-1.20+i*.4,.025,halfAisle+.60,.36,.02,.19);
    }
    for(const deck of levels){
      buildSpine(deck);
      for(const room of rooms.filter(r=>r.level===deck.id))buildBranch(deck,room);
      for(const stop of deck.stops)buildLift(stop);
      for(const zone of crewBerths.byLevel.get(deck.id)||[]){
        wardGroups.set(zone.id,installCrewWard(deck,zone,{plate,metal,paint,floorRect,wayfinding}));
      }
    }
    // Both lifts have real full-length guide rails. Geometry is attached to
    // the ship; the occupied landing geometry is revealed at its destination.
    const shaftFrame=new T.Group();shaftFrame.name='升降导轨与索道';installation.add(shaftFrame);
    for(const line of liftLines)for(let i=1;i<line.stops.length;i++){
      const a=line.stops[i-1],b=line.stops[i];
      for(const x of [-2.70,2.70])for(const z of [-1.9,2.8]){
        const start=new T.Vector3(a.x+x,a.deck.floorY+.10,a.z+z);
        const end=new T.Vector3(b.x+x,b.deck.floorY-.10,b.z+z);
        const diff=end.clone().sub(start);
        const rail=new T.Mesh(cube,paint.base);
        rail.position.copy(start).addScaledVector(diff,.5);
        rail.scale.set(.20,diff.length(),.25);
        rail.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),diff.normalize());
        shaftFrame.add(rail);
      }
    }
    flush();

    function floorFor(p){
      if(p && levelById.has(p.level))return levelById.get(p.level);
      if(!p||!Number.isFinite(p.y))return null;
      const deck=levels.find(l=>Math.abs(l.floorY-p.y)<.8);return deck||null;
    }
    const within=(r,x,z)=>x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1;
    function roomAt(deck,x,z){
      return rooms.find(r=>r.level===deck.id&&Math.abs(x-r.center[0])<=r.spec.width/2&&Math.abs(z-r.center[2])<=r.spec.depth/2);
    }
    const bodySamples=Array.from({length:12},(_,i)=>[Math.cos(i*Math.PI/6)*bodyRadius,Math.sin(i*Math.PI/6)*bodyRadius]);
    function canStand(p){
      const deck=floorFor(p);
      if(!deck || !Number.isFinite(p.x)||!Number.isFinite(p.z)||!Number.isFinite(p.y)||Math.abs(p.y-deck.floorY)>.8)return false;
      if(!bodySamples.every(([ox,oz])=>deck.rects.some(r=>within(r,p.x+ox,p.z+oz))))return false;
      const ward=crewBerths.zoneAt(p);
      if(ward && !crewBerths.clearsPedestal(p,ward,bodyRadius))return false;
      const room=roomAt(deck,p.x,p.z);
      if(room){
        buildRoom(room);
        const orientation=room.side===1?-1:1;
        const lx=(p.x-room.center[0])*orientation,lz=(p.z-room.center[2])*orientation;
        for(const block of room.group.userData.blocks||[]){
          const dx=Math.max(0,Math.abs(lx-block.x)-block.w/2),dz=Math.max(0,Math.abs(lz-block.z)-block.d/2);
          if(dx*dx+dz*dz < bodyRadius*bodyRadius)return false;
        }
      }
      return true;
    }
    function spawn(id){
      const ward=crewBerths.zones.find(q=>q.id===id||q.level===id);
      if(ward)return {x:ward.cx,y:ward.floorY,z:ward.side*(ward.front+2.35),level:ward.level,
        yaw:ward.side>0?Math.PI:0};
      const room=byId.get(id)||byId.get('power');
      buildRoom(room);
      const deck=levelById.get(room.level);
      for(const recess of [2.25,1.25,.60,-.65]){
        const p={x:room.door[0],y:deck.floorY,z:room.door[2]+room.side*recess,level:deck.id,yaw:room.yawRad};
        if(canStand(p))return p;
      }
      throw new Error(room.name+'入口净空不足');
    }
    function move(p,dx,dz){
      const deck=floorFor(p);
      if(!deck||!Number.isFinite(dx)||!Number.isFinite(dz))return p;
      const next={...p,y:deck.floorY,level:deck.id};
      const distance=Math.hypot(dx,dz);
      if(distance<1e-7)return next;
      // Divide a long frame step into much shorter segments than a door jamb.
      const steps=Math.max(1,Math.ceil(distance/.26));
      for(let i=0;i<steps;i++){
        const x=next.x+dx/steps,z=next.z+dz/steps;
        if(canStand({...next,x,z})){next.x=x;next.z=z;continue;}
        if(canStand({...next,x}))next.x=x;
        if(canStand({...next,z}))next.z=z;
      }
      return next;
    }
    function atLift(deck,p) {
      return deck.stops.find(stop=>Math.abs(p.x-stop.x)<=1.86&&p.z>=4.12&&p.z<=stop.z+2.18);
    }
    function location(p){
      const deck=floorFor(p);
      if(!deck)return {name:'未定位',label:'未定位',level:null,roomId:null,lift:false};
      const room=roomAt(deck,p.x,p.z),stop=atLift(deck,p);
      const ward=crewBerths.zoneAt(p);
      const branch=deck.ports.find(port=>(port.room||port.zone)&&Math.abs(p.x-port.x)<port.width/2&&port.side*p.z>halfAisle);
      const name=room?.name||ward?.name||stop?.line.name||(branch?portLabel(branch)+'连接廊':deck.name+'主廊');
      return {name,label:name,level:deck.id,levelName:deck.name,roomId:room?.id||null,wardId:ward?.id||null,lift:!!stop};
    }
    function liftStops(p) {
      const deck=floorFor(p),stop=deck&&atLift(deck,p);
      return stop?stop.line.stops.filter(s=>s.deck!==deck).map(s=>({id:s.deck.id,name:s.deck.name,floorY:s.deck.floorY})):[];
    }
    function takeLift(p,destination){
      const deck=floorFor(p),stop=deck&&atLift(deck,p);
      const target=stop?.line.stops.find(s=>s.deck.id===destination && s.deck!==deck);
      return target?{...p,x:target.x,y:target.deck.floorY,z:target.z,level:target.deck.id,yaw:0}:null;
    }
    function elevator(p,direction){
      const stops=liftStops(p).filter(s=>direction>0?s.floorY>p.y:s.floorY<p.y).sort((a,b)=>Math.abs(a.floorY-p.y)-Math.abs(b.floorY-p.y));
      return stops.length?takeLift(p,stops[0].id):null;
    }
    function worldPosition(x,y,z){
      // The metric root counteracts the exterior's anisotropic scale.
      return installation.localToWorld(new T.Vector3(x,y,z));
    }
    let previewRoom=null;
    function clearPreview(){
      if(!previewRoom)return;
      if(previewRoom.roof)previewRoom.roof.visible=true;
      for(const deck of levels)for(const child of deck.group.children)child.visible=true;
      previewRoom=null;
    }
    function setActive(active){
      clearPreview();
      installation.visible=!!active;
      if(!active)for(const room of rooms)room.group.visible=false;
    }
    function setPreview(id){
      clearPreview();
      const room=byId.get(id);
      if(!room){setActive(false);return null;}
      buildRoom(room);
      installation.visible=true;
      shaftFrame.visible=false;
      for(const deck of levels){
        deck.group.visible=deck.id===room.level;
        for(const part of deck.group.children)part.visible=part===room.group;
      }
      previewRoom=room;
      if(room.roof)room.roof.visible=false;
      installation.updateMatrixWorld(true);
      return room;
    }
    function updateLOD(p){
      const deck=floorFor(p);if(!deck)return;
      for(const d of levels)d.group.visible=d===deck;
      // A ward is hidden as a whole outside the sightline of the current
      // compartment. Its physical geometry and assigned slots remain fixed.
      for(const zone of crewBerths.byLevel.get(deck.id)||[]){
        const sameDoor=Math.abs(p.x-zone.cx)<3.6 && p.z*zone.side>=-4.1;
        wardGroups.get(zone.id).visible=crewBerths.roomRadius(p,zone)<35||sameDoor;
      }
      for(const room of rooms){
        const dx=Math.max(0,Math.abs(p.x-room.center[0])-room.spec.width/2);
        const dz=Math.max(0,Math.abs(p.z-room.center[2])-room.spec.depth/2);
        const visible=room.level===deck.id&&Math.hypot(dx,dz)<56;
        if(visible)buildRoom(room);
        room.group.visible=visible;
      }
      shaftFrame.visible=false;
    }
    // The drawing, room picker and walking controller read these same anchor
    // points. The serializable export omits renderer objects and walking state.
    const xyz=(x,y,z)=>({x,y,z});
    const plan={
      unit:'m', lengthMetres, axes:{x:'舰艏',y:'舰桥上方',z:'右舷'},
      rooms:rooms.map(r=>({id:r.id,name:r.name,level:r.level,
        center:xyz(...r.center),door:xyz(...r.door),yawRad:r.yawRad,
        width:r.spec.width,depth:r.spec.depth,height:r.spec.height,basis:r.brief})),
      levels:levels.map(deck=>({id:deck.id,name:deck.name,floorY:deck.floorY,
        corridors:[
          {kind:'spine',width:crossSection.width,height:crossSection.height,
            from:xyz(deck.bounds.lo,deck.floorY,0),to:xyz(deck.bounds.hi,deck.floorY,0)},
          ...deck.ports.map(p=>({kind:(p.room||p.zone)?'branch':'lift-landing',
            leadsTo:p.room?.id||p.zone?.id||p.stop.line.id, width:p.width,height:(p.room||p.zone)?crossSection.branchHeight:3.75,
            from:xyz(p.x,deck.floorY,0),to:p.room?xyz(...p.room.door):p.zone?xyz(p.x,deck.floorY,p.zone.side*p.zone.front):xyz(p.stop.x,deck.floorY,p.stop.z)}))
        ]})),
      crew:{capacity:crewBerths.capacity,rowsPerZone:crewBerths.rows,berthsPerRow:crewBerths.columns,
        zones:crewBerths.zones.map(q=>({...q,door:xyz(q.cx,q.floorY,q.side*q.front)}))},
      lifts:liftLines.map(l=>({id:l.id,name:l.name,stops:l.stops.map(s=>({
        level:s.deck.id,center:xyz(s.x,s.deck.floorY,s.z)}))}))
    };
    ship.updateMatrixWorld(true);
    return {root:installation,rooms,byId,levels,plan,residences:crewBerths,metresPerRenderUnit,lengthMetres,
      spawn,move,canStand,location,locate:location,liftStops,takeLift,elevator,worldPosition,
      toWorld:p=>worldPosition(p.x,p.y,p.z),setActive,setPreview,updateLOD};
  })();
