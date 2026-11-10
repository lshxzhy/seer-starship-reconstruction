  // Concept arrangement inside the existing hull. All centres, entrances and
  // outlines use ship-local XYZ (+X forward, +Y up and +Z starboard). The
  // three primary levels are large functional zones, not human-scale storeys.
  const interiorModel = (() => {
    const root = new T.Group();
    const structure = new T.Group();
    const vertical = new T.Group();
    root.name = '内部总布置';
    structure.name = '龙骨、肋架与甲板梁';
    vertical.name = '升降井与动力舱斜梯';
    root.add(structure, vertical);
    ship.add(root);
    root.visible = false;

    const palette = {};
    function paint(name, color, glow=0) {
      const c = new T.Color(color).convertSRGBToLinear();
      palette[name] = new T.MeshStandardMaterial({
        color:c, roughness:.49, metalness:.17,
        emissive:glow ? c : 0x000000, emissiveIntensity:glow
      });
    }
    paint('plate',0x698299); paint('slate',0x354b61);
    paint('passage',0x273d50); paint('wall',0xc3cfd1); paint('cap',0xf0e7d2);
    paint('frame',0x596d84); paint('rubber',0x1d2c38); paint('aluminum',0xb5c6c9);
    paint('engineering',0x516585); paint('science',0x518c8a);
    paint('command',0x6c7392); paint('support',0x867b6a);
    paint('amber',0xe6a64d); paint('ceramic',0xe9ddc5);
    paint('screen',0x368b9e,.35); paint('guide',0x71e8ee,.48);
    paint('green',0xa1cc8d,.26); paint('power',0xffbc4b,.52);
    paint('ice',0x87cfff,.48); paint('glass',0x297d91,.19);
    const corridor = .37;
    const liftX = -1.46;
    const engineHatchX = -2.10;
    const decks = [], rooms = [];
    const hullEnd = 4.69;
    const canonical = '舱名见《飞船手册》，本层具体位置与左右舷划分为建模推定。';
    const inferred = '为补全船上运行与通行关系增设的工程示意空间。';
    const byLocation = (clue) => '手册图示' + clue + '，舱室尺寸与设备陈设为推定。';
    // The two halves of a deck share room endpoints so bulkheads and routes
    // can be generated from one plan. Satellite rooms belong to their zone.
    const deckData = [
      {id:'lower',name:'底层',floorY:-1.28,height:.68,xMin:-3.55,xMax:3.25,
        bays:[-3.55,-.05,3.25], plan:[
          [['teleport','传送舱','science','portal',canonical],['workshop','发明室','science','workshop',canonical]],
          [['machine','机械室','engineering','machine',canonical],['instructor','教官办公室','command','instructor',canonical]]]},
      {id:'central',name:'中心区',floorY:-.48,height:.70,xMin:-4.16,xMax:4.39,
        bays:[-4.16,-1.42,1.24,4.39], plan:[
          [['laboratory','实验室','science','laboratory',canonical],['archives','资料室','command','archives',canonical],['honors','荣誉大厅','support','honors',canonical]],
          [['logistics','装卸备勤区','support','cargo',inferred],['services','公用设备间','engineering','services',inferred],['stores','物资储备舱','support','cargo',inferred]]]},
      {id:'upper',name:'顶层',floorY:.38,height:.49,xMin:-4.10,xMax:hullEnd,
        bays:[-4.10,-1.08,1.34,hullEnd], plan:[
          [['relay','通信机务区','command','archives',inferred],['navigation','导航值班区','command','command',inferred],['observation','瞭望舱','command','observation',byLocation('瞭望舱位于前上方')]],
          [['liftservice','升降设备间','engineering','services',inferred],['ready','值勤准备区','support','instructor',inferred],['terraceAccess','瞭望露台接驳区','command','terrace', '手册有瞭望露台，本期建其舱内接驳与观察区，外露平台待细化。']]]}
    ];

    // Invert the superellipse used by shellPoint. Check the entire local
    // station between floor underside and wall head before choosing the beam.
    function halfBeam(x,y) {
      const [w,keel,belt,top] = station(x);
      if(y<=keel || y>=top) return 0;
      const dy = y-belt, h=dy>=0?top-belt:belt-keel;
      const c = Math.sign(dy)*Math.pow(Math.abs(dy)/h,1/.84);
      return w*Math.pow(Math.max(0,1-c*c),.425)*(1+.10*Math.min(0,c));
    }
    function usable(deck,x) {
      return Math.min(halfBeam(x,deck.floorY-.075),halfBeam(x,deck.floorY+deck.height+.04))-.13;
    }
    function group(parent,name) {
      const g=new T.Group();g.name=name;parent.add(g);return g;
    }
    const cube = new T.BoxGeometry(1,1,1);
    const drum = new T.CylinderGeometry(1,1,1,20);
    const ball = new T.SphereGeometry(1,24,16);
    // Batch simple repeating objects per room. Each room remains a distinct
    // scene group for selection while equipment does not add a draw per bolt.
    const batches = new Map();
    const dummy = new T.Object3D();
    function stamp(parent,geo,mat,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0) {
      let table=batches.get(parent);
      if(!table) {table=new Map();batches.set(parent,table);}
      const key=geo.uuid+mat.uuid;
      if(!table.has(key)) table.set(key,{geo,mat,items:[]});
      dummy.position.set(x,y,z);dummy.rotation.set(rx,ry,rz);dummy.scale.set(sx,sy,sz);
      dummy.updateMatrix();table.get(key).items.push(dummy.matrix.clone());
    }
    const slab=(g,m,x,y,z,w,h,d,ry=0)=>stamp(g,cube,m,x,y,z,w,h,d,0,ry,0);
    const round=(g,m,x,y,z,r,h)=>stamp(g,drum,m,x,y,z,r,h,r);
    function member(g,m,a,b,w,d=w) {
      const start=new T.Vector3(...a),end=new T.Vector3(...b);
      const delta=end.clone().sub(start);
      if(delta.length()<.0001) return;
      dummy.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());
      const rot=dummy.rotation.clone();
      const mid=start.add(end).multiplyScalar(.5);
      stamp(g,cube,m,mid.x,mid.y,mid.z,w,delta.length(),d,rot.x,rot.y,rot.z);
    }
    function flush() {
      for(const [parent,table] of batches) for(const {geo,mat,items} of table.values()) {
        const instances=new T.InstancedMesh(geo,mat,items.length);
        items.forEach((matrix,i)=>instances.setMatrixAt(i,matrix));
        instances.instanceMatrix.needsUpdate=true;instances.frustumCulled=false;
        instances.receiveShadow=true;parent.add(instances);
      }
      batches.clear();
    }
    function shapePath(points,asHole=false) {
      const path=asHole?new T.Path():new T.Shape();
      points.forEach(([x,z],i)=>i?path.lineTo(x,z):path.moveTo(x,z));path.closePath();return path;
    }
    function polygon(g,points,y,thickness,m,holes=[]) {
      const shape=shapePath(points);
      for(const ring of holes)shape.holes.push(shapePath(ring,true));
      const geo=new T.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false,steps:1});
      geo.rotateX(Math.PI/2);
      const floor=mesh(geo,m,0,y,0,g);floor.receiveShadow=true;return floor;
    }
    function rect(x0,x1,z0,z1) {return [[x0,z0],[x1,z0],[x1,z1],[x0,z1]];}
    function outline(deck,x0,x1,side) {
      const breaks=[x0,...sections.map(s=>s[0]).filter(x=>x>x0&&x<x1),x1];
      return breaks.map(x=>[x,side*usable(deck,x)]);
    }
    const shaftHole=rect(liftX-.24,liftX+.24,-.16,.16);
    const branchHole=rect(engineHatchX-.16,engineHatchX+.16,-.115,.115);
    function perimeter(g,points,y,h) {
      for(let i=1;i<points.length;i++){
        const [x0,z0]=points[i-1], [x1,z1]=points[i];
        const dx=x1-x0,dz=z1-z0,span=Math.hypot(dx,dz),angle=-Math.atan2(dz,dx);
        slab(g,palette.wall,(x0+x1)/2,y+h*.50,(z0+z1)/2,span,h,.047,angle);
        slab(g,palette.cap,(x0+x1)/2,y+h+.012,(z0+z1)/2,span,.025,.060,angle);
      }
    }

    function roomWalls(g,deck,room,out) {
      const y=deck.floorY, s=room.side, z=s*corridor;
      const centre=room.door[0], clear=.43, top=deck.height, doorH=Math.min(.34,top-.075);
      // Two wall leaves and a high lintel leave an actual opening to the spine.
      for(const [a,b] of [[room.xMin,centre-clear/2],[centre+clear/2,room.xMax]]) {
        slab(g,palette.wall,(a+b)/2,y+top/2,z,b-a,top,.043);
        slab(g,palette.cap,(a+b)/2,y+top+.008,z,b-a,.017,.055);
        slab(g,palette.slate,(a+b)/2,y+.077,z,b-a,.084,.049);
      }
      slab(g,palette.slate,centre,y+(doorH+top)/2,z,clear,top-doorH,.052);
      for(const dx of [-clear/2,clear/2])slab(g,palette.amber,centre+dx,y+doorH*.5,z,.030,doorH,.065);
      slab(g,palette.guide,centre,y+doorH+.014,z,clear,.024,.065);
      slab(g,palette.amber,centre,y+.012,z,clear,.020,.075);
      // The perimeter is cut to half-height for the arrangement drawing.
      // Interior partition walls retain their full modelled height.
      perimeter(g,out,y,Math.min(.24,top*.53));
      function endWall(x) {
        const off=usable(deck,x)-corridor;
        slab(g,palette.wall,x,y+top*.5,s*(corridor+off/2),.048,top,off);
        slab(g,palette.cap,x,y+top+.009,s*(corridor+off/2),.062,.018,off);
      }
      endWall(room.xMin);
      if(Math.abs(room.xMax-deck.xMax)<.001) endWall(room.xMax);
    }

    function equipment(g,deck,room) {
      const y=deck.floorY+.024, s=room.side;
      const p=(ux,v)=>{
        const x=lerp(room.xMin+.22,room.xMax-.22,ux);
        return [x,s*lerp(corridor+.21,usable(deck,x)-.20,v)];
      };
      const table=(x,z,w=.43,d=.21)=>{
        slab(g,palette.frame,x,y+.072,z,w*.85,.12,d*.66);
        slab(g,palette.ceramic,x,y+.149,z,w,.040,d);
      };
      const consoleAt=(ux,v,w=.34)=>{
        const [x,z]=p(ux,v);table(x,z,w,.19);
        slab(g,palette.rubber,x,y+.196,z+s*.046,w*.83,.11,.037);
        slab(g,palette.screen,x,y+.199,z+s*.024,w*.72,.071,.009);
        slab(g,palette.guide,x-w*.26,y+.169,z-s*.024,w*.21,.009,.025);
      };
      const rack=(ux,v,tone)=>{
        const [x,z]=p(ux,v);
        slab(g,palette.frame,x,y+.171,z,.28,.32,.19);
        for(let i=0;i<4;i++){
          slab(g,palette.rubber,x,y+.058+i*.063,z-s*.102,.248,.044,.028);
          slab(g,tone,x-.078,y+.058+i*.063,z-s*.120,.050,.015,.006);
        }
        slab(g,palette.cap,x,y+.34,z,.29,.029,.20);
      };
      const pod=(ux,v,r,tone)=>{
        const [x,z]=p(ux,v);
        round(g,palette.frame,x,y+.037,z,r*1.18,.07);
        round(g,tone,x,y+.17,z,r,.24);
        round(g,palette.aluminum,x,y+.31,z,r*1.04,.047);
      };
      const cargo=(ux,v,cnt)=>{
        const [x,z]=p(ux,v);
        for(let h=0;h<cnt;h++){
          slab(g,palette.support,x,y+.072+h*.135,z,.34,.126,.22);
          for(const dx of [-.105,.105])slab(g,palette.amber,x+dx,y+.073+h*.135,z,.026,.131,.228);
          slab(g,palette.ceramic,x,y+.072+h*.135,z-s*.114,.088,.04,.010);
        }
      };
      const ring=(x,cy,z,r,thick,mat)=>{
        const torus=mesh(new T.TorusGeometry(r,thick,7,36),mat,x,cy,z,g);
        torus.rotation.x=Math.PI/2;
      };
      switch(room.fixture){
        case 'portal': {
          const [x,z]=p(.55,.51);
          round(g,palette.slate,x,y+.035,z,.36,.065); round(g,palette.glass,x,y+.074,z,.30,.030);
          ring(x,y+.104,z,.26,.018,palette.ice);
          for(let i=0;i<4;i++){
            const a=i*Math.PI/2+Math.PI/4;
            const px=x+Math.cos(a)*.31,pz=z+Math.sin(a)*.31;
            slab(g,palette.frame,px,y+.16,pz,.055,.28,.055);
            slab(g,palette.guide,px,y+.31,pz,.064,.028,.066);
          }
          consoleAt(.13,.76); break;
        }
        case 'machine': {
          for(const ux of [.22,.57,.82]){
            const [x,z]=p(ux,.64);
            slab(g,palette.slate,x,y+.048,z,.46,.09,.40);
            stamp(g,drum,palette.aluminum,x,y+.17,z,.135,.39,.135,0,0,Math.PI/2);
            for(const dx of [-.14,.14])stamp(g,drum,palette.amber,x+dx,y+.17,z,.142,.047,.142,0,0,Math.PI/2);
          }
          consoleAt(.28,.16); break;
        }
        case 'laboratory':
          for(const ux of [.22,.65]){
            const [x,z]=p(ux,.62);table(x,z,.56,.32);
            for(const dx of [-.14,.04,.17]){
              round(g,palette.aluminum,x+dx,y+.174,z,.054,.055);
              round(g,dx>0?palette.glass:palette.green,x+dx,y+.24,z,.042,.108);
              round(g,palette.cap,x+dx,y+.303,z,.047,.025);
            }
          }
          pod(.88,.27,.11,palette.glass);consoleAt(.23,.17);break;
        case 'workshop': {
          const [x,z]=p(.44,.57);table(x,z,.71,.38);
          round(g,palette.frame,x-.19,y+.187,z,.08,.1);
          const joint=[x-.07,y+.42,z+.07*s],wrist=[x+.14,y+.31,z+.02*s];
          member(g,palette.amber,[x-.19,y+.23,z],joint,.057);
          member(g,palette.amber,joint,wrist,.051);
          stamp(g,ball,palette.frame,joint[0],joint[1],joint[2],.05,.05,.05);
          slab(g,palette.rubber,wrist[0],wrist[1]-.043,wrist[2],.07,.082,.05);
          rack(.84,.72,palette.power);break;
        }
        case 'archives':
          for(const ux of [.19,.39,.64,.85])rack(ux,.68,palette.ice);
          consoleAt(.46,.18);break;
        case 'honors': {
          for(const ux of [.21,.49,.77]){
            const [x,z]=p(ux,.57);round(g,palette.ceramic,x,y+.08,z,.13,.145);
            stamp(g,ball,palette.amber,x,y+.22,z,.09,.11,.09);
          }
          break;
        }
        case 'services':
          for(const ux of [.20,.45,.71])pod(ux,.69,.112,palette.aluminum);
          rack(.82,.28,palette.power);break;
        case 'observation':case 'terrace':
          for(const ux of [.20,.49,.77]){
            consoleAt(ux,.60);
            const [x,z]=p(ux,.86);
            const pivot=[x,y+.19,z],tip=[x+.13,y+.34,z+s*.055];
            round(g,palette.frame,x,y+.076,z,.047,.15);member(g,palette.aluminum,pivot,tip,.072);
            stamp(g,ball,palette.glass,...tip,.042,.037,.042);
          } break;
        case 'command':case 'instructor':
          for(const ux of [.24,.69])consoleAt(ux,.64);
          {const [x,z]=p(.48,.27);table(x,z,.53,.21);}
          break;
        default:
          for(const [a,b,n] of [[.21,.67,2],[.49,.73,2],[.76,.61,1],[.23,.23,1],[.76,.23,1]])cargo(a,b,n);
      }
    }

    function register(deck,record) {
      record.deckId=deck.id;record.group.name=record.name;record.group.userData.roomId=record.id;
      deck.rooms.push(record);rooms.push(record);return record;
    }
    for(const deck of deckData){
      const deckGroup=group(root,deck.name);decks.push(deckGroup);deck.rooms=[];
      const y=deck.floorY;
      const outside=[...outline(deck,deck.xMin,deck.xMax,-1),...outline(deck,deck.xMin,deck.xMax,1).reverse()];
      const holes=deck.id==='lower'?[shaftHole,branchHole]:[shaftHole];
      polygon(deckGroup,outside,y,.065,palette.plate,holes);
      polygon(deckGroup,rect(deck.xMin,deck.xMax,-corridor+.025,corridor-.025),y+.008,.005,palette.passage,holes);
      for(const side of [-1,1]){
        slab(deckGroup,palette.guide,(deck.xMin+deck.xMax)/2,y+.015,side*.30,deck.xMax-deck.xMin-.03,.009,.015);
        const row=deck.plan[side>0?1:0];
        row.forEach(([id,name,type,fixture,basis],k)=>{
          const xMin=deck.bays[k],xMax=deck.bays[k+1],x=(xMin+xMax)/2;
          const room=register(deck,{id,name,type,fixture,basis,side,xMin,xMax,
            center:[x,y+.17,side*(usable(deck,x)+corridor)/2],door:[x,y+.13,side*corridor],group:group(deckGroup,name)});
          const boundary=outline(deck,xMin,xMax,side);
          const inset=boundary.map(([px,pz])=>[px,pz-side*.042]);
          polygon(room.group,[[xMin,side*(corridor+.03)],[xMax,side*(corridor+.03)],...inset.reverse()],y+.016,.009,palette[type]);
          roomWalls(room.group,deck,room,boundary);
          equipment(room.group,deck,room);
        });
      }
      // A landing lip indicates the shaft opening, with clear approaches on
      // both sides. The guide stripes bypass the aperture.
      for(const x of [liftX-.255,liftX+.255])slab(deckGroup,palette.amber,x,y+.023,0,.026,.026,.35);
      for(const s of [-1,1])slab(deckGroup,palette.amber,liftX,y+.022,s*.172,.51,.024,.024);
    }

    // Pod and tower are independent enclosed volumes in the exterior design.
    // Their service floors therefore sit at their actual elevations.
    const podY=-3.28;
    const pod=register(deckData[0],{id:'power',name:'动力室',type:'engineering',fixture:'reactor',
      side:0,xMin:-3.66,xMax:-1.50,center:[-2.75,podY+.19,0],door:[-2.53,podY+.14,0],
      basis:'《飞船手册》标出后下悬舱；G04 场景图可见金色主机、白色护梁、环道、操作台和粗管。机组尺寸、管线走向与斜梯接入为建模推定。',group:group(decks[0],'动力室')});
    const podOutline=[[-3.70,-.40],[-3.46,-.78],[-1.88,-.78],[-1.52,-.52],[-1.46,.37],[-1.83,.75],[-3.43,.75],[-3.70,.38]];
    polygon(pod.group,podOutline,podY,.055,palette.engineering);
    perimeter(pod.group,[...podOutline,podOutline[0]],podY,.19);
    // G04 shows one gold machine surrounded by a walkable annulus. The
    // forward end of the annulus opens onto the sloping ladder at x=-2.53.
    {
      const machineX=-3.06;
      const platform=group(pod.group,'环形检修道与金色主机');
      platform.position.set(machineX,podY,0);
      function circle(radius) {
        return Array.from({length:60},(_,i)=>{
          const angle=i*Math.PI/30;
          return [radius*Math.cos(angle),radius*Math.sin(angle)];
        });
      }
      function band(radius,tube,height,material){
        const ring=mesh(new T.TorusGeometry(radius,tube,8,64),material,0,height,0,platform);
        ring.rotation.x=-Math.PI/2;
      }
      polygon(platform,circle(.526),.018,.014,palette.passage,[circle(.318)]);
      band(.518,.007,.021,palette.aluminum);
      band(.326,.008,.023,palette.amber);
      for(const angle of [-2.4,-1.5,-.7,.7,1.5,2.4]){
        // Walkway lights sit flush with the tread; no raised curb at entry.
        for(let i=0;i<3;i++){
          const a=angle+i*.085;
          slab(platform,palette.guide,.477*Math.cos(a),.024,.477*Math.sin(a),.024,.009,.011,-a);
        }
      }
      round(platform,palette.frame,0,.046,0,.304,.078);
      round(platform,palette.amber,0,.098,0,.265,.055);
      round(platform,palette.rubber,0,.153,0,.247,.064);
      for(let i=0;i<18;i++){
        const a=i*Math.PI/9;
        slab(platform,i%3?palette.frame:palette.guide,.250*Math.cos(a),.154,.250*Math.sin(a),
          .015,.043,.039,-a);
      }
      // Variable-radius core: shoulder, tapered gold vessel, collar and crown.
      const profile=[[.002,.173],[.241,.173],[.262,.206],[.258,.263],
        [.213,.296],[.207,.341],[.187,.418],[.144,.503],[.105,.529],[.002,.535]];
      mesh(new T.LatheGeometry(profile.map(([r,h])=>new T.Vector2(r,h)),64),
        palette.power,0,0,0,platform);
      band(.255,.009,.227,palette.amber);
      band(.212,.011,.325,palette.ceramic);
      round(platform,palette.frame,0,.540,0,.103,.022);
      round(platform,palette.guide,0,.554,0,.070,.014);
      // Three curved pearl guards frame the vessel and leave the forward
      // service face exposed; each guard has a shoulder, foot and fasteners.
      const shield=new T.Shape();
      shield.moveTo(.242,.046);shield.lineTo(.305,.046);shield.lineTo(.311,.278);
      shield.quadraticCurveTo(.302,.404,.232,.516);
      shield.lineTo(.167,.548);shield.lineTo(.142,.516);
      shield.quadraticCurveTo(.228,.451,.258,.288);shield.lineTo(.242,.046);
      const shieldGeo=new T.ExtrudeGeometry(shield,{depth:.070,bevelEnabled:true,
        bevelThickness:.006,bevelSize:.006,bevelSegments:2,curveSegments:10});
      shieldGeo.translate(0,0,-.035);
      for(const a of [-1.39,1.39,Math.PI]){
        const arm=group(platform,'白色设备护梁');arm.rotation.y=a;
        mesh(shieldGeo,palette.ceramic,0,0,0,arm);
        slab(arm,palette.frame,.272,.06,0,.117,.068,.106);
        slab(arm,palette.amber,.303,.228,0,.018,.084,.077);
        for(const z of [-.039,.039]){
          stamp(arm,ball,palette.aluminum,.281,.083,z,.013,.013,.013);
          stamp(arm,ball,palette.aluminum,.178,.521,z,.009,.009,.009);
        }
      }
      const controls=group(pod.group,'操作台与回流管组');
      controls.position.set(0,podY,0);
      // Console and pipes occupy the margins; the centreline from the
      // ladder to the forward control aisle remains clear.
      slab(controls,palette.frame,-1.98,.046,-.35,.38,.081,.17);
      slab(controls,palette.ceramic,-1.98,.112,-.35,.36,.075,.16);
      const desk=group(controls,'倾斜仪表面');desk.position.set(-1.98,.173,-.35);
      desk.rotation.x=-.27;
      slab(desk,palette.rubber,0,0,0,.40,.032,.206);
      slab(desk,palette.screen,-.04,.018,-.022,.208,.009,.102);
      for(let i=0;i<5;i++){
        slab(desk,palette.guide,-.125+i*.038,.025,-.021,.012,.008,.027+i*.009);
        slab(desk,i%2?palette.green:palette.amber,-.095+i*.046,.027,.063,.020,.012,.017);
      }
      for(const z of [.44,.61]){
        stamp(controls,drum,palette.amber,-2.04,.154,z,.054,.60,.054,0,0,Math.PI/2);
        for(const x of [-2.29,-2.08,-1.82]){
          stamp(controls,drum,palette.frame,x,.154,z,.065,.031,.065,0,0,Math.PI/2);
          slab(controls,palette.aluminum,x,.071,z,.046,.083,.110);
        }
        slab(controls,palette.guide,-2.00,.211,z,.092,.009,.020);
      }
      for(let i=0;i<4;i++)slab(controls,palette.guide,-2.36+i*.145,.028,-.145,.060,.011,.021);
    }
    const towerY=4.30;
    const bridge=register(deckData[2],{id:'captain',name:'船长室',type:'command',fixture:'bridge',
      side:0,xMin:-2.00,xMax:-.20,center:[-1.08,towerY+.13,0],door:[liftX,towerY+.10,.18],
      basis:byLocation('船长室位于塔顶'),group:group(decks[2],'船长室')});
    const rim=[];
    for(let i=0;i<36;i++){const a=i*2*Math.PI/36;rim.push([-1.12+.91*Math.cos(a),.64*Math.sin(a)]);}
    polygon(bridge.group,rim,towerY,.046,palette.command,[shaftHole]);
    for(let i=-3;i<=3;i++){
      const a=i*.30,x=-1.12+.68*Math.cos(a),z=.47*Math.sin(a);
      slab(bridge.group,palette.frame,x,towerY+.058,z,.155,.10,.112,-a);
      slab(bridge.group,palette.screen,x,towerY+.127,z,.148,.031,.091,-a);
    }
    for(const z of [-.19,.19]){slab(bridge.group,palette.amber,-.88,towerY+.087,z,.114,.14,.114);}

    // Twin guides are located at the ends of the shaft, leaving both faces
    // unobstructed for boarding. The single cabin is parked at the centre deck.
    for(const dx of [-.205,.205])for(const z of [-.129,.129]){
      member(vertical,palette.frame,[liftX+dx,-1.26,z],[liftX+dx,towerY+.03,z],.025);
    }
    for(const h of [-1.02,-.20,.69,1.56,2.49,3.39,4.19]) {
      for(const dx of [-.205,.205])slab(vertical,palette.aluminum,liftX+dx,h,0,.033,.031,.272);
    }
    slab(vertical,palette.amber,liftX,-.475,0,.36,.032,.22);
    for(const dx of [-.162,.162])slab(vertical,palette.wall,liftX+dx,-.337,0,.028,.25,.211);
    slab(vertical,palette.frame,liftX,-.195,0,.36,.034,.22);
    const upper=[engineHatchX,-1.28,0],lower=[-2.53,podY+.03,0];
    for(const s of [-1,1])member(vertical,palette.frame,[upper[0],upper[1],s*.097],[lower[0],lower[1],s*.097],.027);
    for(let i=1;i<=15;i++){
      const t=i/16;slab(vertical,palette.amber,lerp(upper[0],lower[0],t),lerp(upper[1],lower[1],t),0,.037,.025,.205);
    }
    // The keel and ring frames follow the exterior stations, leaving the
    // deck clearances and two lift openings unobstructed.
    // Twin keel girders straddle the sloping service hatch into the belly pod.
    for(const z of [-.25,.25]){
      const spine=sections.slice(1,-1).map(([x,w,keel])=>[x,keel+.105,z]);
      for(let i=1;i<spine.length;i++)member(structure,palette.frame,spine[i-1],spine[i],.075,.088);
    }
    for(const x of [-3.59,-2.42,-.72,.88,2.52,3.94]){
      const framePoints=[];
      for(let j=0;j<=44;j++)framePoints.push(shellPoint(x,j*2*Math.PI/44,-.095));
      for(let j=1;j<framePoints.length;j++)member(structure,palette.frame,framePoints[j-1],framePoints[j],.052,.072);
      for(const deck of deckData){
        if(x<deck.xMin+.14||x>deck.xMax-.14)continue;
        const width=usable(deck,x)-.06;
        slab(structure,palette.frame,x,deck.floorY-.105,0,.065,.080,width*2);
      }
    }
    flush();
    return {root,decks,deckData,rooms,structure,vertical};
  })();
