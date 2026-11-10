  // The Aofei glider from the December 2012 browser-game event. The model's
  // local -Z is its nose, +Y is up and the pilot stands at the X/Z origin.
  function createPersonalFlyer(worldMetre) {
    const root = new T.Group(), hull = new T.Group();
    root.name = '奥飞滑翔翼';
    root.scale.setScalar(worldMetre);
    root.visible = false;
    root.add(hull);
    scene.add(root);

    const ownedGeometry = [], ownedMaterial = [];
    function finish(color, metalness, roughness, emissive = 0) {
      const material = new T.MeshStandardMaterial({
        color:new T.Color(color).convertSRGBToLinear(), metalness, roughness
      });
      if (emissive) {
        material.emissive.copy(material.color);
        material.emissiveIntensity = emissive;
      }
      ownedMaterial.push(material);
      return material;
    }
    const orange = finish(0xfa972b,.26,.32), violet = finish(0x976ac7,.27,.28);
    const scarlet = finish(0xc34d32,.31,.33), redTop = finish(0xe76b46,.24,.31);
    const darkRed = finish(0x943b32,.28,.42), ivory = finish(0xdfded6,.42,.31);
    const tin = finish(0x9caaae,.65,.29), edge = finish(0x4c5a65,.66,.35);
    const gasket = finish(0x292b35,.08,.75), sole = finish(0x49505d,.12,.64);
    const amber = finish(0xffcb59,.16,.29,.42), teal = finish(0x62d9d0,.15,.32,.50);
    const liftLight = finish(0x79f5eb,.15,.28,.55);

    // Bake the rigid fittings by paint. The four ducts and all their screws,
    // for example, do not cost one draw each while following the player.
    const batches = new Map();
    const rotation = new T.Euler(), orientation = new T.Quaternion(), matrix = new T.Matrix4();
    const position = new T.Vector3(), scale = new T.Vector3();
    function stamp(geometry, material, x=0,y=0,z=0, rx=0,ry=0,rz=0, sx=1,sy=1,sz=1) {
      rotation.set(rx,ry,rz);
      orientation.setFromEuler(rotation);
      matrix.compose(position.set(x,y,z),orientation,scale.set(sx,sy,sz));
      const raw = geometry.index ? geometry.toNonIndexed() : geometry;
      raw.applyMatrix4(matrix);
      let batch=batches.get(material);
      if(!batch){batch={positions:[],normals:[]};batches.set(material,batch);}
      for(const value of raw.attributes.position.array)batch.positions.push(value);
      for(const value of raw.attributes.normal.array)batch.normals.push(value);
      raw.dispose();
      if(raw!==geometry)geometry.dispose();
    }
    function box(x,y,z,w,h,d,material,rx=0,ry=0,rz=0){
      stamp(new T.BoxGeometry(w,h,d),material,x,y,z,rx,ry,rz);
    }
    // Horizontal cutting patterns have rounded corners and real bevels.
    function shell(points,y,height,material,bevel=.012,round=.19) {
      const path=new T.Shape(), n=points.length;
      for(let i=0;i<n;i++){
        const prev=points[(i+n-1)%n], cur=points[i], next=points[(i+1)%n];
        const x0=cur[0]+(prev[0]-cur[0])*round, z0=cur[1]+(prev[1]-cur[1])*round;
        const x1=cur[0]+(next[0]-cur[0])*round, z1=cur[1]+(next[1]-cur[1])*round;
        if(i===0)path.moveTo(x0,-z0);else path.lineTo(x0,-z0);
        path.quadraticCurveTo(cur[0],-cur[1],x1,-z1);
      }
      path.closePath();
      const geo=new T.ExtrudeGeometry(path,{depth:height,bevelEnabled:true,
        bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,curveSegments:6});
      stamp(geo,material,0,y,0,-Math.PI/2);
    }
    function ring(x,y,z,r,tube,material,rx=0){
      stamp(new T.TorusGeometry(r,tube,8,36),material,x,y,z,rx);
    }
    function disc(x,y,z,top,base,h,material,rx=0){
      stamp(new T.CylinderGeometry(top,base,h,32),material,x,y,z,rx);
    }
    function mirrored(points,sign){return points.map(([x,z])=>[x*sign,z]);}
    function scaled(points,sx,sz){return points.map(([x,z])=>[x*sx,z*sz]);}

    const belly=[[-.54,-.73],[-.40,-.96],[.40,-.96],[.54,-.73],
      [.59,-.18],[.53,.78],[.42,.97],[-.42,.97],[-.53,.78],[-.59,-.18]];
    shell(scaled(belly,.93,.94),.095,.13,edge,.025);
    shell(belly,.21,.08,tin,.025);
    const footWell=[[-.43,-.46],[.43,-.46],[.47,-.30],[.45,.45],[-.45,.45],[-.47,-.30]];
    shell(footWell,.29,.023,gasket,.008);
    const treadTop=.324;
    // Each sole rests on a non-slip insert. The low rim leaves the pilot's
    // round face and gold lower band in the silhouette of the archive images.
    for(const s of [-1,1]){
      const x=s*.23;
      box(x,.314,0,.34,.020,.61,sole,0,s*.04);
      for(let j=0;j<6;j++)box(x,treadTop+.001,-.22+j*.088,.27,.003,.019,gasket);
      shell(mirrored([[.46,-.53],[.59,-.55],[.62,.54],[.45,.60]],s),.289,.128,tin,.018);
      shell(mirrored([[.485,-.40],[.57,-.42],[.595,.40],[.49,.44]],s),.429,.021,gasket,.009);
    }

    // The central light-grey chin has a recessed, framed transverse opening.
    const chin=[[-.49,-.52],[-.43,-.90],[-.31,-1.01],[.31,-1.01],[.43,-.90],[.49,-.52]];
    shell(chin,.245,.235,ivory,.053,.23);
    box(0,.37,-1.038,.55,.17,.045,edge);
    box(0,.373,-1.063,.45,.102,.018,gasket);
    for(let j=0;j<3;j++)box(0,.342+j*.030,-1.075,.37,.008,.009,tin);

    const wing=[[.42,-.55],[.76,-.77],[1.12,-.80],[1.35,-.69],[1.45,-.43],
      [1.45,.35],[1.32,.53],[.61,.64],[.42,.50]];
    const stripe=[[.47,-.42],[1.21,-.58],[1.42,-.35],[1.44,-.08],
      [1.13,-.19],[1.02,.32],[.58,.42],[.47,.32]];
    for(const s of [-1,1]){
      const plan=mirrored(wing,s);
      shell(scaled(plan,.982,.98),.27,.108,edge,.030,.29);
      shell(plan,.384,.194,orange,.038,.32);
      shell(mirrored(stripe,s),.612,.015,violet,.009,.15);
      shell(mirrored([[1.075,.18],[1.235,.145],[1.273,.201],[1.105,.241]],s),
        .616,.007,teal,.003);
      // Paired forward-facing ports, dark bores within a silver barrel.
      // The source does not establish whether they serve thrust or armament.
      for(const x of [.66,.94]){
        const z=-.94+(x-.66)*.18;
        box(s*x,.364,z+.192,.186,.156,.29,edge);
        const profile=[[.078,-.19],[.107,-.18],[.117,-.11],[.113,.14],
          [.096,.178],[.058,.178],[.055,.093],[.055,-.10]];
        stamp(new T.LatheGeometry(profile.map(([r,a])=>new T.Vector2(r,a)),36),
          ivory,s*x,.368,z,-Math.PI/2);
        disc(s*x,.368,z-.068,.058,.058,.010,gasket,-Math.PI/2);
        ring(s*x,.368,z-.154,.083,.008,tin);
      }
      // Art-directed belly lift cassette, protected between the wing and pads.
      disc(s*.99,.238,-.02,.228,.208,.11,edge);
      disc(s*.99,.174,-.02,.176,.165,.034,gasket);
      disc(s*.99,.153,-.02,.128,.125,.023,liftLight);
      ring(s*.99,.159,-.02,.18,.018,tin,Math.PI/2);
      for(const z of [-.44,.40]){
        box(s*.99,.171,z,.15,.20,.13,edge);
        box(s*.99,.047,z,.238,.072,.26,gasket);
      }
    }

    // The red raised equipment housing is the tall mass behind the pilot.
    const trunk=[[-.39,.46],[.39,.46],[.52,.58],[.50,.99],[.39,1.105],
      [-.39,1.105],[-.50,.99],[-.52,.58]];
    shell(scaled(trunk,.91,.98),.28,.31,darkRed,.025);
    shell(trunk,.59,.314,scarlet,.035);
    shell(scaled(trunk,.972,.995),.905,.094,redTop,.024);
    shell([[-.23,.54],[.23,.54],[.28,.91],[.21,1.03],[-.21,1.03],[-.28,.91]],
      1.01,.046,scarlet,.014);
    box(0,.79,.436,.65,.27,.082,gasket);
    for(const s of [-1,1]){
      box(s*.30,.68,1.12,.21,.10,.032,edge);
      box(s*.30,.69,1.14,.14,.032,.011,amber);
      for(const z of [.65,.79,.93])disc(s*.485,.708,z,.021,.021,.03,tin,0);
    }
    for(const [material,b] of batches){
      const g=new T.BufferGeometry();
      g.setAttribute('position',new T.Float32BufferAttribute(b.positions,3));
      g.setAttribute('normal',new T.Float32BufferAttribute(b.normals,3));
      g.computeBoundingSphere();ownedGeometry.push(g);
      const mesh=new T.Mesh(g,material);
      // The boarding rig caches directional shadows; moving geometry must not
      // stamp a permanent shadow at the launch point.
      mesh.receiveShadow=true;hull.add(mesh);
    }
    batches.clear();
    // The shadow follows the deck underneath, independently of the lifting hull.
    const groundGeometry=new T.PlaneGeometry(3.42,2.68).rotateX(-Math.PI/2);
    const groundMaterial=new T.ShaderMaterial({
      uniforms:{strength:{value:.46}},
      transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
      vertexShader:`varying vec2 footprint;
        void main(){footprint=uv*2.0-1.0;
          gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader:`uniform float strength; varying vec2 footprint;
        void main(){vec2 p=footprint;
          float body=length(p*vec2(2.15,1.30));
          float wings=length(vec2((abs(p.x)-.46)*2.85,p.y*1.72));
          float a=(1.0-smoothstep(.12,1.0,min(body,wings)))*strength;
          gl_FragColor=vec4(.035,.047,.062,a);}`
    });
    ownedGeometry.push(groundGeometry);ownedMaterial.push(groundMaterial);
    const ground=new T.Mesh(groundGeometry,groundMaterial);
    ground.position.y=.006;root.add(ground);
    let clock=0, footHeight=treadTop;
    function update(pose,yaw,{mounted=false,dt=0,speed=0,altitude=0}={}) {
      if(!pose){root.visible=false;return footHeight;}
      clock=(clock+Math.min(.15,Math.max(0,dt)))%(Math.PI*200);
      const floor=contactFloor(pose), lift=Math.max(0,altitude);
      const pulse=mounted ? .043+.018*Math.sin(clock*3) : 0;
      footHeight=floor+lift+pulse+treadTop;
      root.position.copy(habitat.worldPosition(pose.x,pose.y+floor,pose.z));
      root.rotation.y=yaw;
      root.visible=true;
      hull.position.y=lift+pulse;
      groundMaterial.uniforms.strength.value=.46/(1+1.7*hull.position.y);
      liftLight.emissiveIntensity=mounted ? .85+.065*Math.min(12,Math.abs(speed))+.10*Math.sin(clock*7) : .16;
      return footHeight;
    }
    return {
      name:'奥飞滑翔翼', radius:1.60, get footHeight(){return footHeight;},
      root, update, hide(){root.visible=false;},
      dispose(){
        scene.remove(root);
        for(const g of ownedGeometry)g.dispose();
        for(const m of ownedMaterial)m.dispose();
      }
    };
  }
