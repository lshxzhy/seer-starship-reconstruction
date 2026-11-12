  // Classic browser-game base chassis. Metres, origin at sole level, front at -Z.
  // Sources and the unsighted rear surface are documented in references/robot-audit.
  const seerRobots = (() => {
    const PI = Math.PI, TAU = PI * 2;
    const restCoreY = .955, ankleY = .177, hipX = .249, hipY = .539;
    const restLegLength = hipY - ankleY, faceAxisY = .051;
    const glassZ = -.555, glassRadius = .349, glassDepth = .085;
    const paint = '$paint';
    const bronze = 0xc88b39, gold = 0xf1bf65, graphite = 0x35383d;
    const dark = 0x181b21, rubber = 0x23242a, steel = 0x8e9399;
    const hex = value => new T.Color(value).convertSRGBToLinear();
    const clamp = T.MathUtils.clamp;
    // The portrait graphics are drawn once per expression and shared across rigs.
    const faceMaterials=new Map();
    function faceMaterial(frame) {
      if (faceMaterials.has(frame)) return faceMaterials.get(frame);
      const canvas=document.createElement('canvas');
      canvas.width=canvas.height=512;
      const ctx=canvas.getContext('2d');
      ctx.scale(2,2);
      const panel=ctx.createRadialGradient(108,91,12,128,128,134);
      panel.addColorStop(0,'#20242b');
      panel.addColorStop(.80,'#11151b');
      panel.addColorStop(1,'#080b10');
      ctx.fillStyle=panel;
      ctx.fillRect(0,0,256,256);
      const half=frame==='half' || frame==='halfSmile';
      const opening=frame==='closed'?.055:half?.53:1;
      for (const sign of [-1,1]) {
        ctx.save();
        ctx.translate(128+sign*51,131);
        ctx.scale(1,opening);
        // Create the gradient in eye coordinates so the lower rim remains shaded.
        const white=ctx.createRadialGradient(-12,-32,9,0,2,81);
        white.addColorStop(0,'#fffefa');white.addColorStop(.78,'#f6f6ed');
        white.addColorStop(1,'#bec8ca');
        ctx.fillStyle=white;
        ctx.beginPath();ctx.ellipse(0,0,48,82,0,0,TAU);ctx.fill();
        if (frame!=='closed') {
          ctx.translate(-sign*6,-10);
          ctx.fillStyle='#11141a';
          ctx.beginPath();
          if (frame==='smile' || frame==='halfSmile') {
            // The 2014 dialogue keeps the whites open and bends the dark pupils.
            ctx.moveTo(-24,17);
            ctx.bezierCurveTo(-20,-36,19,-38,24,17);
            ctx.bezierCurveTo(12,-6,-8,-9,-24,17);
            ctx.closePath();
          } else ctx.ellipse(0,0,20,38,0,0,TAU);
          ctx.fill();
        }
        ctx.restore();
      }
      const map=new T.CanvasTexture(canvas);
      map.encoding=T.sRGBEncoding;
      const material=new T.MeshBasicMaterial({map,toneMapped:false});
      faceMaterials.set(frame,material);
      return material;
    }
    const skinMaterials = {
      fixed: new T.MeshStandardMaterial({vertexColors:true, roughness:.51, metalness:.28}),
      paint: new T.MeshStandardMaterial({vertexColors:true, roughness:.33, metalness:.28}),
      alloy: new T.MeshStandardMaterial({vertexColors:true, roughness:.34, metalness:.78}),
      machined: new T.MeshStandardMaterial({vertexColors:true, roughness:.30, metalness:.76}),
      gasket: new T.MeshStandardMaterial({vertexColors:true, roughness:.77, metalness:.03}),
      screen: faceMaterial('neutral'),
      // A single near-only glass surface catches the environment above the display stack.
      glass: new T.MeshPhysicalMaterial({vertexColors:true, roughness:.085, metalness:.05,
        clearcoat:1, clearcoatRoughness:.065, reflectivity:.59, envMapIntensity:.8,
        transparent:true, opacity:.22, blending:T.AdditiveBlending, depthWrite:false})
    };
    const lacquer = new T.MeshPhysicalMaterial({vertexColors:true, roughness:.36, metalness:.19,
      clearcoat:.67, clearcoatRoughness:.19, envMapIntensity:.85});
    const suitColors = new Map(), suitMaterials = new Map();
    function suitColor(value) {
      if (!suitColors.has(value)) suitColors.set(value,hex(value));
      return suitColors.get(value);
    }
    function suitMaterial(value,simple) {
      const key=(simple?'crew/':'pilot/')+value;
      if (!suitMaterials.has(key)) {
        const material=(simple?skinMaterials.paint:lacquer).clone();
        material.color.copy(suitColor(value));
        suitMaterials.set(key,material);
      }
      return suitMaterials.get(key);
    }
    const templates = new Map();
    function template(simple) {
      if (templates.has(simple)) return templates.get(simple);
      const parts = new Map(), primitives = [];
      const segments = simple ? 16 : 48;
      function profile(points, radialSegments=segments) {
        const geometry = new T.LatheGeometry(points.map(([radius,y]) => new T.Vector2(radius,y)),radialSegments);
        primitives.push(geometry);
        return geometry;
      }
      // Retain the registration silhouette while smoothing the large painted panels.
      function smoothProfile(points) {
        if (simple) return profile(points);
        const spline=new T.SplineCurve(points.slice(1).map(([x,y])=>new T.Vector2(x,y)));
        const sampled=spline.getPoints((points.length-1)*4);
        return profile([points[0],...sampled.map(p=>[Math.max(0,p.x),p.y])],88);
      }
      const drum = new T.CylinderGeometry(1,1,1,segments);
      const cube = new T.BoxGeometry(1,1,1);
      primitives.push(drum,cube);
      const pose = new T.Object3D(), normalMatrix = new T.Matrix3();
      const point = new T.Vector3(), normal = new T.Vector3();
      function cast(bone,geometry,x,y,z,w,h,d,color,mode,rx=0,ry=0,rz=0) {
        let family = color === paint ? 'paint' : (mode || 'fixed');
        if (!simple && family==='fixed') {
          if (color===gold || color===bronze) family='alloy';
          else if (color===steel) family='machined';
          else if (color===rubber || color===dark) family='gasket';
        }
        const key = bone + '/' + family;
        if (!parts.has(key)) parts.set(key,{bone,family,pos:[],norm:[],col:[],ix:[]});
        const dest = parts.get(key), offset = dest.pos.length/3;
        const tint = color === paint ? new T.Color(1,1,1) : hex(color);
        pose.position.set(x,y,z);
        pose.rotation.set(rx,ry,rz);
        pose.scale.set(w,h,d);
        pose.updateMatrix();
        normalMatrix.getNormalMatrix(pose.matrix);
        const positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal');
        const colors=geometry.getAttribute('color');
        for (let i=0;i<positions.count;i++) {
          point.fromBufferAttribute(positions,i).applyMatrix4(pose.matrix);
          normal.fromBufferAttribute(normals,i).applyNormalMatrix(normalMatrix);
          dest.pos.push(point.x,point.y,point.z);
          dest.norm.push(normal.x,normal.y,normal.z);
          if (colors) dest.col.push(tint.r*colors.getX(i),tint.g*colors.getY(i),tint.b*colors.getZ(i));
          else dest.col.push(tint.r,tint.g,tint.b);
        }
        for (let i=0;i<geometry.index.count;i++) dest.ix.push(geometry.index.getX(i)+offset);
      }
      function coreShape(shape,x,y,z,color,rx=0,ry=0,rz=0) {
        cast('core',shape,x,y,z,1,1,1,color,null,rx,ry,rz);
      }

      // One equipment shell carries the optics, side covers and leg mounts.
      const shell = smoothProfile([[0,-.408],[.35,-.405],[.447,-.358],[.508,-.27],[.539,-.15],
        [.548,-.052],[.544,.046],[.522,.158],[.474,.265],[.395,.357],[.302,.425],
        [.206,.47],[.105,.491],[0,.5]]);
      cast('core',shell,0,0,.005,1,1,.98,paint);
      const lowerBand = profile([[0,-.100],[.502,-.100],[.55,-.081],[.568,-.058],
        [.568,.061],[.555,.084],[.526,.096],[0,.096]]);
      coreShape(lowerBand,0,-.319,0,gold);
      const rolledEdge = profile([[.528,-.013],[.559,-.013],[.567,-.004],
        [.567,.005],[.558,.013],[.528,.013]]);
      coreShape(rolledEdge,0,-.388,0,bronze);
      coreShape(rolledEdge,0,-.252,0,bronze);
      if (!simple) {
        const bandSeal = profile([[.510,0],[.539,0],[.545,.003],[.545,.008],[.535,.012],[.51,.012]]);
        coreShape(bandSeal,0,-.226,0,rubber);
      }
      const rivet = profile([[0,-.015],[.058,-.015],[.068,-.006],[.068,.014],
        [.059,.024],[.048,.028],[0,.029]]);
      const studCap = simple ? null : profile([[0,-.001],[.046,-.001],[.047,.001],
        [.045,.004],[.024,.004],[.020,.002],[.015,.002],[.014,.004],[0,.004]],32);
      for (let i=0;i<8;i++) {
        const a=i*TAU/8, x=Math.sin(a), z=-Math.cos(a);
        // Place the local +Y axis of each stud radially outwards.
        cast('core',rivet,x*.561,-.325,z*.561,1,1,1,graphite,null,-PI/2,0,-a);
        if (!simple) cast('core',studCap,x*.591,-.325,z*.591,1,1,1,0x44484b,'machined',-PI/2,0,-a);
      }

      // Short plug with a flat, broad button on the crown.
      const stem = profile([[0,-.012],[.098,-.012],[.099,.017],[.082,.026],
        [.082,.075],[.099,.081],[0,.081]]);
      const button = profile([[0,0],[.170,0],[.200,.014],[.215,.11],[.209,.125],
        [.184,.137],[0,.137]]);
      coreShape(stem,0,.483,0,graphite);
      cast('core',button,0,.563,0,1,1.33,1,paint);
      cast('core',drum,0,.570,0,.174,.013,.174,dark);
      if (!simple) {
        const socketLip=profile([[.078,0],[.104,0],[.112,.005],[.111,.012],[.100,.017],[.078,.017]]);
        coreShape(socketLip,0,.487,0,0x696d70);
        const capInset=profile([[.143,0],[.154,0],[.155,.002],[.153,.004],[.145,.004],[.143,.002]]);
        coreShape(capInset,0,.743,0,graphite);
        cast('core',drum,0,.745,0,.144,.002,.144,paint);
      }

      // The side-on assembly frame shows a round gold service cover. The rear
      // follows the existing shell contour because a rear reference is missing.
      const sideCover = profile([[0,-.064],[.244,-.064],[.284,-.027],[.292,-.001],
        [.284,.016],[.257,.033],[0,.033]]);
      const brassRim=profile([[.225,0],[.257,0],[.274,.007],[.274,.014],
        [.265,.024],[.236,.024],[.225,.018],[.225,0]]);
      for (const sign of [-1,1]) {
        coreShape(sideCover,sign*.499,-.005,.031,graphite,0,0,-sign*PI/2);
        coreShape(brassRim,sign*.533,-.005,.031,gold,0,0,-sign*PI/2);
        cast('core',drum,sign*.546,-.005,.031,.228,.026,.228,0xe4ab43,null,0,0,PI/2);
        // The three stamped marks are distinct in the side-on assembly frame.
        for(const [dy,dz,height] of [[.010,-.018,.221],[.066,.062,.075],[-.071,.007,.070]])
          cast('core',cube,sign*.563,dy,.031+sign*dz,.007,height,.029,graphite,null,-sign*.55);
      }

      const faceY = faceAxisY;
      const bezel = profile([[.339,-.130],[.374,-.13],[.409,-.097],[.419,-.056],
        [.419,.033],[.407,.061],[.384,.073],[.351,.073],[.339,.062],[.339,-.130]],simple?segments:88);
      coreShape(bezel,0,faceY,-.498,graphite,-PI/2);
      if (!simple) {
        const lip=profile([[.338,.067],[.350,.067],[.353,.070],[.352,.075],
          [.348,.077],[.343,.077],[.339,.074],[.338,.067]],88);
        coreShape(lip,0,faceY,-.498,0x4e5359,-PI/2);
        const glassSeal=profile([[.334,.067],[.342,.066],[.345,.069],[.344,.073],
          [.339,.074],[.335,.072],[.334,.067]],88);
        coreShape(glassSeal,0,faceY,-.498,rubber,-PI/2);
        // A countersink seats the hexagonal drive below the front of each screw head.
        const fastener=profile([[0,-.002],[.017,-.002],[.017,.001],[.014,.003],
          [.008,.003],[.006,.001],[0,.001]],24);
        const hexSocket=profile([[0,0],[.005,0],[.005,.001],[0,.001]],6);
        for (let i=0;i<8;i++) {
          const a=TAU*(i+.5)/8;
          const x=.384*Math.cos(a), y=faceY+.384*Math.sin(a);
          cast('core',fastener,x,y,-.573,1.22,1,1.22,0x393d42,'machined',-PI/2);
          cast('core',hexSocket,x,y,-.5743,1,1,1,dark,'gasket',-PI/2);
        }
        // Only the front hemisphere is drawn. The eye graphics stay below the glass.
        const cover=new T.SphereGeometry(1,64,40,PI,PI);
        primitives.push(cover);
        cast('core',cover,0,faceY,glassZ,glassRadius,glassRadius,glassDepth+.031,0x12181b,'glass');
      }
      const screen=new T.SphereGeometry(1,simple?12:48,simple?8:32,PI,PI);
      const pos=screen.getAttribute('position'), uv=screen.getAttribute('uv');
      for (let i=0;i<pos.count;i++) uv.setXY(i,(1-pos.getX(i))/2,(1+pos.getY(i))/2);
      screen.scale(glassRadius,glassRadius,glassDepth);
      screen.translate(0,faceY,glassZ);

      const sole = profile([[0,0],[.94,0],[1,.022],[1,.032],[.94,.05],[0,.05]]);
      const shoe = smoothProfile([[0,0],[.95,0],[1,.018],[.99,.044],[.91,.075],[.72,.101],
        [.54,.119],[.26,.13],[0,.133]]);
      const wiper=simple?null:profile([[.055,-.018],[.067,-.018],[.071,-.013],[.071,.010],
        [.068,.015],[.064,.017],[.055,.017]],32);
      const retainingLip=simple?null:profile([[.062,0],[.069,0],[.070,.002],[.069,.005],[.062,.005]],32);
      for (const sign of [-1,1]) {
        const side=sign<0?'L':'R', leg='leg'+side, foot='foot'+side;
        cast(leg,drum,0,-restLegLength/2,0,.061,restLegLength,.061,steel);
        for(let i=0;i<4;i++) {
          const y=-(.042+i*.081);
          if (simple) cast(leg,drum,0,y,0,.070,.032,.070,graphite);
          else {
            cast(leg,wiper,0,y,0,1,1,1,rubber);
            cast(leg,retainingLip,0,y+.008,0,1,1,1,steel);
          }
        }
        cast(foot,sole,0,-ankleY,-.051,.222,1,.258,rubber);
        cast(foot,sole,0,-ankleY+.032,-.051,.226,.78,.26,gold);
        cast(foot,shoe,0,-ankleY+.058,-.050,.211,1,.247,paint);
        cast(foot,drum,0,-.003,0,.103,.040,.105,bronze);
        cast(foot,drum,0,.020,0,.084,.014,.086,gold);
        cast(foot,cube,-sign*.073,-.104,-.285,.074,.041,.044,bronze,null,-.42,0,0);
      }

      const entries=[];
      for (const entry of parts.values()) {
        const geometry=new T.BufferGeometry();
        geometry.setAttribute('position',new T.Float32BufferAttribute(entry.pos,3));
        geometry.setAttribute('normal',new T.Float32BufferAttribute(entry.norm,3));
        geometry.setAttribute('color',new T.Float32BufferAttribute(entry.col,3));
        geometry.setIndex(entry.ix);
        geometry.computeBoundingSphere();
        entries.push({bone:entry.bone,family:entry.family,geometry});
      }
      for (const geometry of primitives) geometry.dispose();
      entries.push({bone:'core',family:'screen',geometry:screen});
      templates.set(simple,entries);
      return entries;
    }

    function skeleton() {
      const root=new T.Group(), bones={};
      for (const name of ['core','legL','legR','footL','footR']) {
        const joint=new T.Group();
        joint.name=name;
        root.add(joint);
        bones[name]=joint;
      }
      return {root,bones,clock:0,lastYaw:0,turn:0};
    }
    const down = new T.Vector3(0,-1,0), axis = new T.Vector3();
    function stepLength(speed) {return .68+.22*clamp(Math.abs(speed)/3.2,0,1);}
    function phaseStep(speed,dt) {return TAU*Math.abs(speed)*dt/stepLength(speed);}
    function applyPose(rig,phase,speed,idleTime,riding=false) {
      const v=Math.abs(speed), weight=clamp(v/.38,0,1), run=clamp((v-1.5)/2.5,0,1);
      const stance=.55-.085*run, reach=stepLength(speed)*stance*.5;
      const bones=rig.bones, core=bones.core;
      core.position.set(0,restCoreY+.006*Math.sin(idleTime*2)*(1-weight)-.014*Math.cos(phase*2)*weight,0);
      core.rotation.set(-.042*run*weight,rig.turn+.014*Math.sin(idleTime*.74)*(1-weight),
        .019*Math.sin(phase)*weight);
      if(riding){
        core.position.y-=.11;
        core.position.z=.055;
      }
      for(const sign of [-1,1]) {
        const side=sign<0?'L':'R', leg=bones['leg'+side], foot=bones['foot'+side];
        const t=((phase/TAU+(sign>0?.5:0))%1+1)%1;
        const swing=clamp((t-stance)/(1-stance),0,1);
        const blend=swing*swing*swing*(10+swing*(-15+6*swing));
        const z=(t<stance?-reach+2*reach*t/stance:reach*(1-2*blend))*weight;
        const lift=Math.sin(PI*swing)*(.070+.035*run)*weight;
        foot.position.set(sign*hipX,ankleY+lift,riding?-.11:z);
        foot.rotation.set(-.10*Math.sin(TAU*swing)*weight,-sign*.13,0);
        // The sleeve spans both endpoints while the grounded shoe is stationary.
        leg.position.set(sign*hipX,hipY-restCoreY,0).applyQuaternion(core.quaternion).add(core.position);
        axis.subVectors(foot.position,leg.position);
        leg.scale.y=axis.length()/restLegLength;
        leg.quaternion.setFromUnitVectors(down,axis.normalize());
      }
    }
    function create(color=0xcb4d3a,options={}){
      const rig=skeleton();
      rig.root.name=options.name||'赛尔机器人';
      rig.expression='neutral';
      rig.faceFrame='neutral';
      for(const entry of template(options.simple===true)){
        const m=entry.family==='paint'?suitMaterial(color,options.simple===true):skinMaterials[entry.family];
        const mesh=new T.Mesh(entry.geometry,m);
        const opaqueBody=entry.family!=='glass' && entry.family!=='screen';
        mesh.castShadow=options.castShadow!==false && opaqueBody;
        mesh.receiveShadow=opaqueBody;
        if (entry.family==='screen') {
          mesh.name='赛尔面盘 · 曲面显示屏';
          rig.screen=mesh;
        }
        rig.bones[entry.bone].add(mesh);
      }
      applyPose(rig,0,0,0);return rig;
    }
    function showFaceFrame(rig,frame){
      if (rig.faceFrame===frame) return;
      rig.screen.material=faceMaterial(frame);
      rig.faceFrame=frame;
    }
    function setExpression(rig,expression){
      if (!rig || !rig.screen || (expression!=='neutral' && expression!=='smile')) return false;
      rig.expression=expression;
      showFaceFrame(rig,expression);
      return true;
    }
    function animate(rig,phase,speed,dt=1/60,riding=false){
      const step=clamp(Number.isFinite(dt)?dt:0,0,.12);
      const yaw=rig.root.rotation.y;
      const angle=Math.atan2(Math.sin(yaw-rig.lastYaw),Math.cos(yaw-rig.lastYaw));
      const target=step>0?clamp(angle/step*.07,-.23,.23):0;
      rig.turn+=(target-rig.turn)*(1-Math.exp(-step*12));
      rig.lastYaw=yaw;rig.clock+=step;
      applyPose(rig,phase,speed,rig.clock,riding);
      const blink=rig.clock%4.3;
      let frame=rig.expression;
      if (blink>=3.80 && blink<3.98) {
        if (blink>=3.84 && blink<3.93) frame='closed';
        else frame=rig.expression==='smile'?'halfSmile':'half';
      }
      showFaceFrame(rig,frame);
    }
    function createBatch(capacity){
      const root=new T.Group(),rig=skeleton();
      root.name='附近赛尔 · 分段实例';
      const parts=template(true).map(entry=>{
        const mesh=new T.InstancedMesh(entry.geometry,skinMaterials[entry.family],capacity);
        // r128 allocates instanceColor on its first write using mesh.count.
        // Reserve the whole buffer before hiding this initially empty batch.
        if(entry.family==='paint'){
          mesh.setColorAt(0,new T.Color(1,1,1));
          mesh.instanceColor.setUsage(T.DynamicDrawUsage);
        }
        mesh.count=0;mesh.frustumCulled=false;mesh.receiveShadow=entry.family!=='screen';
        mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(mesh);
        return {mesh,bone:rig.bones[entry.bone],tinted:entry.family==='paint'};
      });
      const previousColors=new Array(capacity);
      function write(slot,x,y,z,yaw,color,phase,speed){
        if(slot<0||slot>=capacity)return;
        rig.root.position.set(x,y,z);rig.root.rotation.y=yaw;
        applyPose(rig,phase,speed,slot*.57+phase*.13);rig.root.updateMatrixWorld(true);
        const tintChanged=previousColors[slot]!==color;
        for(const {mesh,bone,tinted} of parts){
          mesh.setMatrixAt(slot,bone.matrixWorld);
          if(tinted && tintChanged)mesh.setColorAt(slot,suitColor(color));
        }
        previousColors[slot]=color;
        return rig.bones;
      }
      function finish(count){
        const n=clamp(count,0,capacity);
        for(const {mesh} of parts){
          mesh.count=n;
          if(n)mesh.instanceMatrix.needsUpdate=true;
          if(n&&mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
        }
      }
      return {root,write,finish,capacity};
    }
    return {create,animate,createBatch,phaseStep,setExpression,height:1.70,eyeHeight:restCoreY+faceAxisY};
  })();
