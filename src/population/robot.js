  // Classic browser-game base chassis. Metres, origin at sole level, front at -Z.
  // Sources and the unsighted rear surface are documented in references/robot-audit.
  const seerRobots = (() => {
    const PI = Math.PI, TAU = PI * 2;
    const restCoreY = .955, ankleY = .177, hipX = .249, hipY = .539;
    const restLegLength = hipY - ankleY, faceAxisY = .051;
    const paint = '$paint';
    const bronze = 0xc88b39, gold = 0xf1bf65, graphite = 0x35383d;
    const dark = 0x181b21, rubber = 0x23242a, steel = 0x8e9399;
    const hex = value => new T.Color(value).convertSRGBToLinear();
    const clamp = T.MathUtils.clamp;
    const skinMaterials = {
      fixed: new T.MeshStandardMaterial({vertexColors:true, roughness:.51, metalness:.28}),
      paint: new T.MeshStandardMaterial({vertexColors:true, roughness:.33, metalness:.28}),
      optic: new T.MeshStandardMaterial({vertexColors:true, roughness:.20, metalness:.10}),
      signal: new T.MeshBasicMaterial({vertexColors:true, toneMapped:false})
    };
    const suitColors = new Map(), suitMaterials = new Map();
    function suitColor(value) {
      if (!suitColors.has(value)) suitColors.set(value,hex(value));
      return suitColors.get(value);
    }
    function suitMaterial(value) {
      if (!suitMaterials.has(value)) {
        const material = skinMaterials.paint.clone();
        material.color.copy(suitColor(value));
        suitMaterials.set(value,material);
      }
      return suitMaterials.get(value);
    }

    const templates = new Map();
    function template(simple) {
      if (templates.has(simple)) return templates.get(simple);
      const parts = new Map(), primitives = [];
      const segments = simple ? 16 : 48;
      function profile(points) {
        const geometry = new T.LatheGeometry(points.map(([radius,y]) => new T.Vector2(radius,y)),segments);
        primitives.push(geometry);
        return geometry;
      }
      const orb = new T.SphereGeometry(1,simple?12:36,simple?8:24);
      const drum = new T.CylinderGeometry(1,1,1,segments);
      const cube = new T.BoxGeometry(1,1,1);
      primitives.push(orb,drum,cube);
      const pose = new T.Object3D(), normalMatrix = new T.Matrix3();
      const point = new T.Vector3(), normal = new T.Vector3();
      function cast(bone,geometry,x,y,z,w,h,d,color,mode,rx=0,ry=0,rz=0) {
        const family = color === paint ? 'paint' : (mode || 'fixed');
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
        for (let i=0;i<positions.count;i++) {
          point.fromBufferAttribute(positions,i).applyMatrix4(pose.matrix);
          normal.fromBufferAttribute(normals,i).applyNormalMatrix(normalMatrix);
          dest.pos.push(point.x,point.y,point.z);
          dest.norm.push(normal.x,normal.y,normal.z);
          dest.col.push(tint.r,tint.g,tint.b);
        }
        for (let i=0;i<geometry.index.count;i++) dest.ix.push(geometry.index.getX(i)+offset);
      }
      function coreShape(shape,x,y,z,color,rx=0,ry=0,rz=0) {
        cast('core',shape,x,y,z,1,1,1,color,null,rx,ry,rz);
      }

      // One equipment shell carries the optics, side covers and leg mounts.
      const shell = profile([[0,-.408],[.35,-.405],[.447,-.358],[.508,-.27],[.539,-.15],
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
      const rivet = profile([[0,-.015],[.058,-.015],[.068,-.006],[.068,.014],
        [.059,.024],[.048,.028],[0,.029]]);
      for (let i=0;i<8;i++) {
        const a=i*TAU/8, x=Math.sin(a), z=-Math.cos(a);
        // Place the local +Y axis of each stud radially outwards.
        cast('core',rivet,x*.561,-.325,z*.561,1,1,1,graphite,null,-PI/2,0,-a);
        if (!simple) cast('core',drum,x*.591,-.325,z*.591,.047,.004,.047,0x636971,null,-PI/2,0,-a);
      }

      // Short plug with a flat, broad button on the crown.
      const stem = profile([[0,-.012],[.098,-.012],[.099,.017],[.082,.026],
        [.082,.075],[.099,.081],[0,.081]]);
      const button = profile([[0,0],[.170,0],[.200,.014],[.215,.11],[.209,.125],
        [.184,.137],[0,.137]]);
      coreShape(stem,0,.483,0,graphite);
      cast('core',button,0,.563,0,1,1.33,1,paint);
      cast('core',drum,0,.570,0,.174,.013,.174,dark);
      if (!simple) cast('core',drum,0,.745,0,.161,.002,.161,paint);

      // The side-on assembly frame shows a round gold service cover. The rear
      // follows the existing shell contour because a rear reference is missing.
      const sideCover = profile([[0,-.037],[.181,-.037],[.211,-.013],[.216,.006],
        [.205,.023],[.173,.036],[0,.036]]);
      for (const sign of [-1,1]) {
        coreShape(sideCover,sign*.510,-.068,.003,graphite,0,0,-sign*PI/2);
        cast('core',drum,sign*.548,-.068,.003,.169,.022,.169,gold,null,0,0,PI/2);
        cast('core',cube,sign*.56,-.060,0,.009,.182,.034,bronze,null,-.53,0,0);
        if (!simple) {
          cast('core',cube,sign*.56,-.060,.071,.010,.066,.029,bronze,null,-.53,0,0);
          cast('core',cube,sign*.56,-.113,.033,.010,.065,.029,bronze,null,-.53,0,0);
        }
      }

      // The eyes are patches on the convex glass rather than separate eyeballs.
      const faceY = faceAxisY, glassZ = -.555, glassRadius = .349, glassDepth = .085;
      const bezel = profile([[.339,-.130],[.374,-.13],[.409,-.097],[.419,-.056],
        [.419,.033],[.407,.061],[.384,.073],[.351,.073],[.339,.062],[.339,-.130]]);
      coreShape(bezel,0,faceY,-.498,graphite,-PI/2);
      cast('core',orb,0,faceY,glassZ,glassRadius,glassRadius,glassDepth,0x0c1017,'optic');
      if (!simple) {
        for (let i=0;i<8;i++) {
          const a=TAU*(i+.5)/8;
          cast('core',drum,.384*Math.cos(a),faceY+.384*Math.sin(a),-.573,
            .015,.009,.015,dark,null,-PI/2);
        }
      }
      function lensMark(cx,cy,rx,ry,clearance,color,mode) {
        const positions=[], indices=[];
        const sides=simple?16:40, rings=simple?3:7;
        function vertex(x,y) {
          const dome=Math.sqrt(Math.max(0,1-(x*x+y*y)/(glassRadius*glassRadius)));
          positions.push(x,faceY+y,glassZ-glassDepth*dome-clearance);
        }
        vertex(cx,cy);
        for(let row=1;row<=rings;row++) {
          for(let i=0;i<sides;i++) {
            const a=i*TAU/sides, r=row/rings;
            vertex(cx+rx*r*Math.cos(a),cy+ry*r*Math.sin(a));
            const outer=1+(row-1)*sides+i, next=1+(row-1)*sides+(i+1)%sides;
            if(row===1) indices.push(0,next,outer);
            else indices.push(outer-sides,next,outer,next-sides,next,outer-sides);
          }
        }
        const geometry=new T.BufferGeometry();
        geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        primitives.push(geometry);
        cast('core',geometry,0,0,0,1,1,1,color,mode);
      }
      for (const sign of [-1,1]) {
        lensMark(sign*.139,-.009,.131,.223,.003,0xfaf9f3,'signal');
        lensMark(sign*.121,.018,.054,.103,.006,0x101216,'optic');
      }

      const sole = profile([[0,0],[.94,0],[1,.022],[1,.032],[.94,.05],[0,.05]]);
      const shoe = profile([[0,0],[.95,0],[1,.018],[.99,.044],[.91,.075],[.72,.101],
        [.54,.119],[.26,.13],[0,.133]]);
      for (const sign of [-1,1]) {
        const side=sign<0?'L':'R', leg='leg'+side, foot='foot'+side;
        cast(leg,drum,0,-restLegLength/2,0,.061,restLegLength,.061,steel);
        for(let i=0;i<4;i++) {
          cast(leg,drum,0,-(.042+i*.081),0,.070,.032,.070,graphite);
        }
        cast(foot,sole,0,-ankleY,-.051,.222,1,.258,rubber);
        cast(foot,sole,0,-ankleY+.032,-.051,.226,.78,.26,gold);
        cast(foot,shoe,0,-ankleY+.058,-.050,.211,1,.247,paint);
        cast(foot,drum,0,-.003,0,.103,.040,.105,bronze);
        cast(foot,drum,0,.020,0,.084,.014,.086,gold);
        cast(foot,cube,-sign*.073,-.094,-.261,.074,.050,.048,bronze,null,-.42,0,0);
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
    function applyPose(rig,phase,speed,idleTime) {
      const v=Math.abs(speed), weight=clamp(v/.38,0,1), run=clamp((v-1.5)/2.5,0,1);
      const stance=.55-.085*run, reach=stepLength(speed)*stance*.5;
      const bones=rig.bones, core=bones.core;
      core.position.set(0,restCoreY+.006*Math.sin(idleTime*2)*(1-weight)-.014*Math.cos(phase*2)*weight,0);
      core.rotation.set(-.042*run*weight,rig.turn+.014*Math.sin(idleTime*.74)*(1-weight),
        .019*Math.sin(phase)*weight);
      for(const sign of [-1,1]) {
        const side=sign<0?'L':'R', leg=bones['leg'+side], foot=bones['foot'+side];
        const t=((phase/TAU+(sign>0?.5:0))%1+1)%1;
        const swing=clamp((t-stance)/(1-stance),0,1);
        const blend=swing*swing*swing*(10+swing*(-15+6*swing));
        const z=(t<stance?-reach+2*reach*t/stance:reach*(1-2*blend))*weight;
        const lift=Math.sin(PI*swing)*(.070+.035*run)*weight;
        foot.position.set(sign*hipX,ankleY+lift,z);
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
      for(const entry of template(options.simple===true)){
        const m=entry.family==='paint'?suitMaterial(color):skinMaterials[entry.family];
        const mesh=new T.Mesh(entry.geometry,m);
        mesh.castShadow=options.castShadow!==false;mesh.receiveShadow=true;
        rig.bones[entry.bone].add(mesh);
      }
      applyPose(rig,0,0,0);return rig;
    }
    function animate(rig,phase,speed,dt=1/60){
      const step=clamp(Number.isFinite(dt)?dt:0,0,.12);
      const yaw=rig.root.rotation.y;
      const angle=Math.atan2(Math.sin(yaw-rig.lastYaw),Math.cos(yaw-rig.lastYaw));
      const target=step>0?clamp(angle/step*.07,-.23,.23):0;
      rig.turn+=(target-rig.turn)*(1-Math.exp(-step*12));
      rig.lastYaw=yaw;rig.clock+=step;
      applyPose(rig,phase,speed,rig.clock);
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
        mesh.count=0;mesh.frustumCulled=false;mesh.receiveShadow=true;
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
    return {create,animate,createBatch,phaseStep,height:1.70,eyeHeight:restCoreY+faceAxisY};
  })();
