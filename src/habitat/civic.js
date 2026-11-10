// Civic rooms, metres. G01/G06/G07 and the scene notes live in references/habitat/civic/.
// Room dimensions, reverse faces and working clearances are project design values.
function civicAssembly(kit,x,z,angle,make) {
  const first=kit.root.children.length;
  make();
  const parts=kit.root.children.slice(first), group=new kit.T.Group();
  parts.forEach(part=>group.add(part));
  group.position.set(x,0,z);group.rotation.y=angle;kit.root.add(group);
  return group;
}

cabinBuilders.teleport = function(kit) {
  const {box,cyl,ball,beam,pipe,torus,panel,text,block,W,D,H}=kit;
  const PI=Math.PI, ivory=0xe1ddd0, white=0xe6eff0, steel=0x657f8c;
  const dark=0x243d50, cyan=0x64e4ec, blue=0x206bac, gold=0xe9ad50;
  kit.root.userData.civicReference='G07 / 2012-05-08 scene; rear construction, dimensions and overhead feed inferred';
  const {T,root}=kit;
  const paints=new Map();
  function casting(geometry,color,z=0) {
    if(!paints.has(color))paints.set(color,new T.MeshStandardMaterial({
      color:new T.Color(color).convertSRGBToLinear(),roughness:.44,metalness:.22}));
    const mesh=new T.Mesh(geometry,paints.get(color));
    mesh.position.z=z;mesh.receiveShadow=true;root.add(mesh);return mesh;
  }
  function faceShape(points) {
    const shape=new T.Shape();
    points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));
    shape.closePath();return shape;
  }

  // Flush blue foreground and inlaid guides: no central machine blocks the hero view.
  cyl(0,.015,.1,8.3,8.3,.022,0x234c80);
  cyl(0,.030,.1,7.65,7.65,.015,0x315e99);
  torus(0,.043,.1,7.28,.045,0x95c7e4,{rx:PI/2});
  torus(0,.043,.1,5.55,.05,0x1e376a,{rx:PI/2});
  torus(0,.043,.1,3.65,.033,0x8eb6dc,{rx:PI/2});
  for(let i=0;i<24;i++) {
    const a=i*PI/12;
    box(Math.cos(a)*7.95,.052,.1+Math.sin(a)*7.95,.55,.028,.13,
      i%3===0?cyan:0x829faf,{ry:-a,glow:i%3===0?.25:0});
  }
  for(const s of [-1,1]) {
    box(s*2.4,.022,10.4,.10,.025,7.4,0x9ac4d0);
    for(let i=0;i<4;i++)box(s*2.4,.043,8.4+i*1.3,.12,.025,.48,cyan,{glow:.25});
  }
  // G07 has a broad segmented silver apron and thick cream arc, not just lines.
  // Split the raised side arcs to keep a generous passage through the rear centre.
  function arcCasting(r0,r1,a0,a1,top,depth,color) {
    const shape=new T.Shape();
    shape.moveTo(Math.cos(a0)*r1,Math.sin(a0)*r1);
    shape.absarc(0,0,r1,a0,a1,false);
    shape.lineTo(Math.cos(a1)*r0,Math.sin(a1)*r0);
    shape.absarc(0,0,r0,a1,a0,true);shape.closePath();
    const part=casting(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:24}),color);
    part.rotation.x=PI/2;part.position.set(0,top,.1);return part;
  }
  for(let i=0;i<28;i++) {
    const a=i*PI/14;
    arcCasting(8.34,9.17,a+.012,a+PI/14-.012,.047,.04,i%2?0x788b99:0x9cafbc);
  }
  for(const [a0,a1] of [[PI*1.02,PI*1.36],[PI*1.64,PI*1.98]]) {
    for(const [r0,r1,top,c] of [[8.5,9.02,.16,steel],[9.02,9.62,.31,ivory],[9.62,10.06,.43,white]])
      arcCasting(r0,r1,a0,a1,top,top-.035,c);
    // Small separate AABBs follow the curve instead of fencing off its empty centre.
    for(let i=0;i<10;i++) {
      const aa=a0+(a1-a0)*i/10,bb=a0+(a1-a0)*(i+1)/10;
      const xs=[8.5,10.06].flatMap(r=>[Math.cos(aa)*r,Math.cos(bb)*r]);
      const zs=[8.5,10.06].flatMap(r=>[Math.sin(aa)*r+.1,Math.sin(bb)*r+.1]);
      block((Math.min(...xs)+Math.max(...xs))/2,(Math.min(...zs)+Math.max(...zs))/2,
        Math.max(...xs)-Math.min(...xs)+.08,Math.max(...zs)-Math.min(...zs)+.08);
      const a=(aa+bb)/2;
      box(Math.cos(a)*9.27,.329,.1+Math.sin(a)*9.27,.055,.028,.54,0x526571,{ry:PI/2-a});
    }
  }

  // Share the pointed, genuinely hollow casting between stations. The opening
  // and outer crown use different profiles so the apex reads from eye height.
  const outer=[[-1.18,.55],[-1.87,.98],[-2.14,2.78],[-2.04,4.46],[-1.4,5.92],
    [0,7.04],[1.4,5.92],[2.04,4.46],[2.14,2.78],[1.87,.98],[1.18,.55]];
  const aperture=[[-.90,1.35],[-1.43,2.75],[-1.33,4.38],[-.88,5.56],[0,6.29],
    [.88,5.56],[1.33,4.38],[1.43,2.75],[.90,1.35]];
  const shellShape=faceShape(outer),hole=new T.Path();
  aperture.forEach(([x,y],i)=>i?hole.lineTo(x,y):hole.moveTo(x,y));hole.closePath();
  shellShape.holes.push(hole);
  const shellGeo=new T.ExtrudeGeometry(shellShape,{depth:1.12,bevelEnabled:true,
    bevelSize:.07,bevelThickness:.06,bevelSegments:2,steps:1,curveSegments:8});
  const backGeo=new T.ExtrudeGeometry(faceShape(outer),{depth:.18,bevelEnabled:false});
  const wellGeo=new T.ExtrudeGeometry(faceShape(aperture),{depth:.13,bevelEnabled:false});
  const shieldGeo=new T.ExtrudeGeometry(faceShape([[-.79,1.89],[-.89,2.28],[-.36,3.43],
    [0,3.65],[.36,3.43],[.89,2.28],[.79,1.89]]),
    {depth:.27,bevelEnabled:true,bevelSize:.055,bevelThickness:.035,bevelSegments:1});
  function pod(x,z,a,tint,n) {
    const g=civicAssembly(kit,x,z,a,()=>{
      cyl(0,.18,0,2.17,2.3,.36,dark);
      cyl(0,.40,0,1.98,2.17,.14,ivory);
      cyl(0,.495,.04,1.72,1.72,.055,tint,{glow:.18});
      torus(0,.54,.04,1.68,.07,tint,{rx:PI/2,glow:.4});
      casting(backGeo,0x4b4a49,-1.29);
      casting(shellGeo,n===2?0xb87e43:n===3?0xc1c8cc:0xa7997d,-1.08);
      casting(wellGeo,n===3?0x344a91:0x305255,-.73);
      // Raised ribs follow the sharp crown. No oval torus softens the silhouette.
      const rim=[...aperture,aperture[0]];
      for(let i=1;i<rim.length;i++)beam([rim[i-1][0],rim[i-1][1],.17],
        [rim[i][0],rim[i][1],.17],.065,.075,i<4||i>6?dark:tint);
      for(const s of [-1,1]) {
        beam([s*1.99,2.25,.25],[s*1.98,3.53,.25],.15,.17,ivory);
        beam([s*1.96,3.62,.25],[s*1.63,4.91,.25],.13,.17,0xc8d4d5);
        beam([s*1.62,5.03,.24],[s*.32,6.71,.24],.12,.16,0xdddccc);
        box(s*1.93,1.68,.30,.18,.62,.12,gold);
        // Inner hooked links frame the separate silver pointed shield in G07.
        pipe([[s*.52,3.02,.40],[s*1.03,3.69,.37],[s*1.12,4.44,.17],
          [s*.88,5.1,.10]],.12,0x263f43);
        cyl(s*1.12,3.17,.48,.27,.27,.19,steel,{rx:PI/2});
        cyl(s*1.12,3.17,.60,.14,.14,.07,tint,{rx:PI/2,glow:.2});
        box(s*1.45,2.2,-1.4,.31,1.7,.23,0x344e5c);
        beam([s*1.4,.6,-1.31],[s*.84,5.9,-1.37],.17,.24,steel);
      }
      casting(shieldGeo,steel,.28);
      const face=casting(shieldGeo,n===3?0xd4d9e7:white,.58);face.scale.set(.72,.84,.35);face.position.y=.42;
      beam([0,2.02,.76],[0,3.32,.76],.10,.07,0x6f8492);
      ball(0,1.43,.72,1.21,.20,.78,tint,{glow:.16});
      cyl(0,1.03,.57,.83,.98,.3,steel);
      box(0,.92,1.15,.22,.86,.26,ivory);
      box(0,.96,1.30,.055,.66,.045,tint,{glow:.45});
      torus(0,6.65,.28,.29,.06,cyan,{glow:.45});
      box(0,6.64,.30,.23,.27,.11,white,{rz:PI/4});
      // Three broad treads project toward the forecourt; they belong to the
      // collision-reserved machine, while public circulation stays level.
      for(const [yy,zz,hh,dd] of [[.08,3.18,.16,1.10],[.16,2.45,.32,.90],[.25,1.7,.50,.90]]) {
        box(0,yy,zz,2.18,hh,dd,ivory);
        box(0,yy,zz+dd/2+.025,2.18,.08,.05,dark);
      }
      text(0,.27,2.925,'0'+n,.8,.18,steel);
      // Independent side socket, exposed piston and hinged service cover.
      box(2.48,1.72,-.2,.77,2.8,1.08,ivory);
      box(2.91,1.73,-.19,.12,2.18,.79,steel);
      cyl(2.91,2.25,.29,.23,.23,.16,gold,{rx:PI/2});
      pipe([[1.95,3.52,-.15],[2.53,3.22,.03],[2.58,2.28,.20]],.10,dark);
      beam([2.1,.62,.18],[2.6,1.35,.18],.16,.16,steel);
      panel(2.48,2.7,.39,.53,.62,tint);
      // Rear access panel and conduit can be seen on a walk around the appliance.
      box(0,3.3,-1.39,1.32,2.5,.18,0x445966);
      for(let i=0;i<6;i++)box(0,2.5+i*.23,-1.50,.91,.06,.03,dark);
      pipe([[-.72,1,-1.45],[-.87,3.2,-1.52],[0,6.2,-1.1]],.09,gold);
    });
    g.name='独立传送舱位 0'+n;
    // Transform each local footprint, including the projecting treads. Separate
    // bounds keep the unoccupied gaps usable by the player and routed NPCs.
    for(const [xx,zz,w,d] of [[0,0,4.64,4.64],[0,2.97,2.3,1.96],[2.60,-.1,1.24,1.48]]) {
      const ca=Math.cos(a),sa=Math.sin(a);
      block(x+xx*ca+zz*sa,z-xx*sa+zz*ca,Math.abs(ca)*w+Math.abs(sa)*d,
        Math.abs(sa)*w+Math.abs(ca)*d);
    }
  }
  const stations=[[-12,-8.0,.24,0x70d8d6,1],[-4.8,-10,.10,0x86e899,2],
    [4.8,-10,-.10,0x9396ed,3],[12,-8.0,-.24,0x70e0df,4]];
  stations.forEach(p=>pod(...p));
  // Bulkhead access panels behind the individual machines tie the four
  // freestanding service cradles into one installation.
  for(const [x,z,a,tint] of stations){
    box(x,4.1,-14.52,5.7,7.8,.37,0x5b5147);
    box(x,4.35,-14.25,5.30,6.34,.27,0xb09a75);
    box(x,6.55,-14.03,4.73,.72,.28,0x372f31);
    for(let i=0;i<8;i++)box(x-1.91+i*.54,6.54,-13.85,.31,.49,.12,0x8a755f,{rz:.19});
    for(const s of [-1,1]){
      box(x+s*2.39,3.45,-13.96,.25,3.94,.18,0xd7b778);
      box(x+s*2.39,3.64,-13.84,.085,1.41,.07,tint,{glow:.43});
    }
    pipe([[x,7.45,-14.23],[x,7.45,-12.85],[x,6.34,z-1.25],[x,5.72,z-.86]],.18,0x8c7149);
    block(x,-14.42,5.75,.71);
  }

  // High distribution collar: an engineering completion of the visible pod feed.
  // The lower edge is above eight metres, leaving all of the walking volume clear.
  const halo=torus(0,8.9,-6.7,7.2,.27,steel,{rx:PI/2});halo.scale.x*=1.85;
  const haloTop=torus(0,9.05,-6.7,7.2,.12,ivory,{rx:PI/2});haloTop.scale.x*=1.85;
  const haloLight=torus(0,8.72,-6.7,7.2,.045,cyan,{rx:PI/2,glow:.30});haloLight.scale.x*=1.85;
  stations.forEach(([x,z])=>{
    const a=Math.atan2((z+6.7)/7.2,x/13.32),hx=Math.cos(a)*13.32,hz=-6.7+Math.sin(a)*7.2;
    pipe([[x,7.04,z-.7],[x,7.65,z-.85],[hx,8.45,hz],[hx,8.85,hz]],.14,gold);
    box(hx,8.88,hz,.65,.72,.74,ivory);
  });
  for(const s of [-1,1])for(const z of [-10,-3]) {
    beam([s*13,9.05,z],[s*(W/2-.4),H-.9,z],.34,.42,steel);
    box(s*(W/2-.45),H-1.0,z,.66,.7,1.3,ivory);
  }
  // Recessed rear navigation screen has a housing, side fins and a readable glyph.
  box(0,4.0,-14.24,5.2,4.6,.64,steel);
  panel(0,4.05,-13.88,4.65,3.9,cyan);
  torus(0,4.18,-13.79,1.12,.08,cyan,{glow:.55});
  torus(0,4.18,-13.77,.64,.045,white);
  for(const s of [-1,1])box(s*1.72,4.18,-13.76,.46,.08,.04,cyan,{glow:.4});
  text(0,2.55,-13.77,'航 路 定 位',3.4,.38,white);
  text(0,7.2,-14.2,'传 送 舱',6.4,.76,ivory);
  text(0,6.44,-14.15,'TRANSFER / 01—04',5.2,.30,cyan);
  block(0,-14.24,5.3,.76);

  // The small orange unit in front of the green/purple bays is a separate
  // apparatus in the reference. Its exact function is not established there.
  const frontUnit=civicAssembly(kit,8.5,-3.8,-.12,()=>{
    cyl(0,.19,0,1.30,1.48,.38,dark,{segments:16});
    cyl(0,.43,0,1.12,1.30,.17,steel,{segments:16});
    cyl(0,.56,0,.88,1.06,.10,0x45689e);
    torus(0,.63,0,.80,.08,gold,{rx:PI/2});
    box(0,.99,-.31,.72,.75,.58,0x3d639a);
    box(0,1.35,-.18,.55,.45,.52,0xb75b43,{rx:-.26});
    torus(0,1.81,-.12,.57,.17,0xd1783e,{arc:PI});
    torus(0,1.81,.06,.57,.055,gold,{arc:PI});
    box(0,2.16,-.12,.58,.24,.57,gold,{rz:.28});
    box(0,2.16,.20,.38,.12,.07,cyan,{glow:.2});
    for(const s of [-1,1]) {
      pipe([[s*.75,.51,.5],[s*1.13,.83,.22],[s*1.25,1.38,-.17],
        [s*.96,1.84,-.37]],.17,0xc28a42);
      beam([s*.98,.70,.24],[s*1.16,1.35,-.15],.10,.12,white);
      cyl(s*1.12,1.36,.02,.24,.24,.24,dark,{rx:PI/2});
      cyl(s*1.12,1.36,.16,.14,.14,.08,gold,{rx:PI/2});
      box(s*.75,.23,.93,.22,.43,.53,gold);
    }
    box(0,.18,1.26,1.35,.36,.47,ivory);
    box(0,.20,1.51,.73,.18,.05,steel);
  });
  frontUnit.position.y=.43;
  cyl(8.5,.215,-3.8,1.55,1.55,.43,dark,{segments:16});
  block(8.5,-3.7,3.28,3.45);
  // G07's right-hand yellow machine has volume, a circular readout and keypad.
  civicAssembly(kit,14.2,1.4,-.36,()=>{
    box(0,.17,0,2.8,.34,2.25,dark);
    box(0,1.92,-.15,2.36,3.30,1.60,0xbba04c);
    box(0,3.63,-.15,1.94,.2,1.42,ivory);
    box(0,2.25,.72,2.45,2.09,.26,steel);
    cyl(0,2.30,.93,.93,.93,.23,0x367ba5,{rx:PI/2});
    cyl(0,2.30,1.064,.76,.76,.045,0x246e7d,{rx:PI/2,glow:.12});
    torus(0,2.30,1.10,.76,.075,cyan,{glow:.25});
    text(0,2.31,1.15,'16.1',1.25,.44,cyan);
    box(0,.91,1.02,1.25,.46,.79,gold,{rx:-.30});
    for(let row=0;row<3;row++)for(let col=0;col<3;col++)
      cyl(-.34+col*.34,1.10+row*.06,.76+row*.19,.085,.085,.045,dark,{rx:-.30});
    cyl(1.29,1.73,-.02,.44,.44,.20,steel,{rz:PI/2});
    cyl(1.42,1.73,-.02,.23,.23,.09,dark,{rz:PI/2});
    box(0,1.84,-1.02,1.72,2.25,.18,steel);
    for(let i=0;i<6;i++)box(0,1.2+i*.21,-1.13,1.20,.065,.04,dark);
    pipe([[-1.1,.65,-.65],[-1.39,1.3,-.75],[-1.27,2.85,-.7]],.11,dark);
  });
  block(14.2,1.6,4.12,4.32);
  // Layered semicircular approach under the tall navigation column, visible
  // at the left of the game view. Rear internals and dimensions are inferred.
  civicAssembly(kit,-15.4,-1.2,.40,()=>{
    for(const [y,r,h] of [[.09,2.55,.18],[.23,2.18,.28],[.41,1.80,.34]]) {
      cyl(0,y,-.65,r,r,h,0x9b8e75);
      torus(0,y+h/2,-.65,r-.05,.035,dark,{rx:PI/2});
    }
    box(0,3.9,-1.15,3.35,6.15,1.12,steel);
    box(0,4.27,-.50,2.9,4.90,.22,dark);
    box(0,4.3,-.32,2.64,4.46,.05,0x3b6265);
    text(0,4.80,-.25,'3',1.60,1.85,cyan);
    for(let i=0;i<4;i++)box(.8,3.23+i*.44,-.24,.48,.11,.035,cyan,{glow:.16});
    box(0,6.9,-.93,3.63,.28,1.43,ivory);
    box(0,6.7,-.2,2.57,.085,.08,cyan,{glow:.2});
    box(0,3.7,-1.79,2.44,3.84,.15,0x52616a);
  });
  block(-15.4,-1.8,5.92,5.96);

  // Separate waiting alcoves; all seats and queue posts stay outside |x| < 7.5.
  for(const s of [-1,1]) {
    civicAssembly(kit,s*14,7,s>0?-PI/2:PI/2,()=>{
      box(0,.23,0,4.8,.46,1.55,dark);
      box(0,.56,0,4.88,.2,1.68,ivory);
      box(0,1.03,-.72,4.88,.83,.24,steel);
      for(const x of [-2.15,0,2.15])box(x,.82,0,.14,.35,1.52,gold);
      for(const x of [-1.17,1.17])box(x,.68,.04,2.12,.055,1.28,0x7aa6bb);
    });
    block(s*14,7,1.95,5.1);
    for(const z of [3.9,6.2]) {
      cyl(s*8.9,.75,z,.075,.075,1.5,steel);
      cyl(s*8.9,.06,z,.31,.31,.12,dark);
      ball(s*8.9,1.53,z,.12,.12,.12,cyan,{glow:.2});
      block(s*8.9,z,.64,.64);
    }
    pipe([[s*8.9,1.4,3.9],[s*8.9,1.25,5],[s*8.9,1.4,6.2]],.035,0x9cb2bc);
    block(s*8.9,5.05,.12,2.45);
  }
  panel(-18.65,2.6,2,3.4,1.4,cyan,{ry:PI/2});
  text(-18.59,2.62,2,'资料室  /  等候区',3.1,.38,white,{ry:PI/2});
  for(const x of [-17.7,17.7])for(const z of [-11,-2,10]) {
    box(x,.55,z,.35,.84,.64,steel);
    box(x,.86,z+.34,.22,.18,.04,cyan,{glow:.45});
    block(x,z,.4,.7);
  }
};

cabinBuilders.instructor = function(kit) {
  const {box,cyl,ball,beam,pipe,torus,panel,text,block,H}=kit;
  const PI=Math.PI,cream=0xdcd9c8,white=0xe6ece7,dark=0x30444d;
  const steel=0x70828a,cyan=0x5ce3d6,green=0x4c8067,gold=0xd3a858;
  kit.root.userData.civicReference='G01; desks, briefing workflow and hidden construction inferred';
  // G01's cream modules and teal strips establish a quieter office scale.
  for(const s of [-1,1]) {
    box(s*8.5,2.7,-9.6,5.5,4.5,.35,cream);
    box(s*8.5,3.2,-9.38,4.9,.22,.13,dark);
    box(s*8.5,3.2,-9.29,4.25,.08,.06,cyan,{glow:.25});
    box(s*8.5,.53,-9.42,5.3,.62,.5,dark);
  }
  // A framed mission chart is genuinely backed, not a freestanding billboard.
  box(-2.2,3.65,-9.42,8.3,4.7,.48,dark);
  box(-2.2,3.65,-9.12,7.96,4.34,.17,cream);
  box(-2.2,3.65,-9.01,7.45,3.85,.05,0x1d4853);
  for(let i=0;i<4;i++)box(-2.2,2.35+i*.76,-8.95,6.9,.026,.025,0x466b71);
  for(let i=0;i<8;i++)box(-5.2+i*.86,3.65,-8.94,.025,3.35,.02,0x466b71);
  const nodes=[[-5.1,2.6],[-3.7,4.4],[-1.2,3.1],[.6,4.75],[.3,2.3]];
  nodes.forEach(([x,y],i)=>{
    torus(x,y,-8.87,.16,.028,cyan,{glow:.3});
    if(i)pipe([[nodes[i-1][0],nodes[i-1][1],-8.91],[x,y,-8.91]],.025,0xc5d9be);
  });
  text(-2.2,5.05,-8.85,'先锋队 · 任务部署',6.8,.45,white);
  text(-2.2,1.97,-8.85,'训练 / 任务 / 返回报告',5.6,.29,0x8ccebd);
  block(-2.2,-9.42,8.4,.6);
  // Low command desk stands well back, with accessible rear working space.
  box(-2.2,.15,-4.9,6.8,.3,2.7,dark);
  for(const x of [-4.9,.5]) {
    box(x,.71,-4.9,1.05,1.15,2.4,cream);
    box(x,.7,-3.67,.77,.83,.09,steel);
    for(let y=.48;y<1.1;y+=.24)box(x,y,-3.61,.59,.04,.03,dark);
  }
  box(-2.2,1.37,-4.9,7.05,.24,2.85,cream);
  box(-2.2,1.515,-4.9,6.75,.045,2.55,0x668b86);
  box(-2.2,.85,-3.64,4.25,.7,.18,dark);
  for(let i=0;i<5;i++)box(-3.7+i*.74,.94,-3.53,.5,.1,.04,cyan,{glow:.25});
  panel(-3.3,1.89,-5.35,1.8,.83,cyan,{rx:-.3});
  box(-3.3,1.65,-5.65,1.95,.12,.22,dark);
  box(-.7,1.59,-4.82,1.25,.08,.76,dark);
  for(let i=0;i<6;i++)box(-1.12+i*.17,1.646,-4.7,.095,.025,.35,cream);
  cyl(-.05,1.66,-5.72,.35,.45,.28,gold);
  text(-2.2,1.18,-3.43,'总教官  雷蒙',3.65,.30,white);
  // An office chair with back, arms and a connected swivel base.
  cyl(-2.2,.17,-7.3,.6,.66,.16,dark);
  cyl(-2.2,.47,-7.3,.1,.1,.55,steel);
  box(-2.2,.80,-7.3,1.28,.24,1.21,green);
  box(-2.2,1.35,-7.82,1.28,1.15,.24,green,{rx:-.11});
  for(const s of [-1,1])box(-2.2+s*.75,1.04,-7.3,.16,.16,1.18,steel);
  block(-2.2,-4.9,7.15,2.95);block(-2.2,-7.35,1.85,1.65);

  // G01's recognizable tall cyan sloping terminal, on the right of the sightline.
  civicAssembly(kit,8.1,-3.4,-.20,()=>{
    box(0,.18,0,3.7,.36,3.15,dark);
    box(0,1.57,-.62,3.2,2.78,1.25,cream);
    beam([-1.5,.4,1.15],[-1.5,2.8,-.5],.32,.52,cream);
    beam([1.5,.4,1.15],[1.5,2.8,-.5],.32,.52,cream);
    box(0,1.52,.43,2.68,2.75,.22,cyan,{rx:-.55,glow:.18});
    for(let i=0;i<7;i++)box(0,.83+i*.245,.91-i*.15,2.22,.035,.045,0xb5fff2);
    box(0,3.26,-.73,3.1,.83,.46,cream);
    panel(0,3.27,-.46,1.6,.54,0x5f9cce);
    box(0,.64,-1.33,2.68,.54,.12,steel);
    for(let i=0;i<4;i++)box(-.8+i*.53,.64,-1.4,.32,.08,.025,dark);
    text(0,2.68,-.11,'训练任务',2.3,.32,dark);
  });
  block(8.1,-3.4,4.5,4.1);
  // A separate check-in desk and stools support briefing without filling the entrance.
  civicAssembly(kit,-8,2.9,.22,()=>{
    box(0,.7,0,3.5,1.4,1.6,cream);
    box(0,1.47,0,3.8,.15,1.9,dark);
    panel(-.7,1.75,-.24,1.4,.6,cyan,{rx:-.45});
    box(.95,1.6,.15,.75,.12,.83,white);
    box(0,.81,.84,2.95,.2,.08,green);
    text(0,.84,.90,'新兵报到',2.7,.33,white);
  });
  block(-8,2.9,4.3,2.8);
  for(const x of [-5.2,-3.4,-1.6]) {
    cyl(x,.24,.4,.33,.42,.45,steel);
    cyl(x,.51,.4,.57,.57,.14,green);
    block(x,.4,1.17,1.17);
  }
  // Low visitor seats occupy only the right flank of the entrance apron.
  box(8.5,.25,5.5,4.75,.5,1.48,dark);
  box(8.5,.61,5.5,4.85,.22,1.6,cream);
  box(8.5,1.04,6.18,4.85,.78,.18,green);
  for(const x of [6.3,8.5,10.7])box(x,.84,5.48,.13,.24,1.46,steel);
  block(8.5,5.5,5,1.9);
  // Training supply cabinets carry their own top, backs, feet and handles.
  for(let i=0;i<3;i++) {
    const z=-6.4+i*2.5;
    box(-10.85,1.47,z,1.5,2.94,2.14,steel);
    box(-10.01,1.48,z,.17,2.65,1.92,cream);
    box(-9.89,1.55,z+.55,.11,.56,.08,dark);
    box(-9.89,2.4,z,.045,.11,1.44,cyan,{glow:.25});
    block(-10.85,z,1.9,2.25);
  }
  for(const z of [-5,1,6]) {
    beam([-10.7,H-.5,z],[10.7,H-.5,z],.24,.34,steel);
    box(0,H-.69,z,7.1,.12,.75,cream);
    box(0,H-.77,z,6.55,.04,.42,0xd8f7ed,{glow:.7});
  }
  text(4.7,5.5,-9.35,'教官办公室',5.7,.57,dark);
  text(4.7,4.83,-9.32,'INSTRUCTOR / BRIEFING',5.7,.26,green);
  panel(11.65,2.7,1.5,2.7,1.25,green,{ry:-PI/2});
  text(11.58,2.72,1.5,'底层走廊中部 →',2.5,.37,white,{ry:-PI/2});
};

cabinBuilders.honors = function(kit) {
  const {box,cyl,ball,beam,pipe,torus,panel,text,block}=kit;
  const PI=Math.PI,white=0xd8e5e9,shell=0x91aab6,dark=0x293e4c;
  const cyan=0x68deea,blue=0x226b88,gold=0xf8bd55;
  kit.root.userData.civicReference='G06; full badge, backside supports and ceremony workflow inferred';
  const arc=(r,z,y,a,b,n)=>Array.from({length:n+1},(_,i)=>{
    const q=a+(b-a)*i/n;
    return [Math.cos(q)*r,y,z-Math.sin(q)*r*.83];
  });
  // G06's low segmented ceremonial ring stays below the sightline.
  cyl(0,.035,-4,8.3,8.3,.07,0x8b9ba6);
  cyl(0,.078,-4,7.94,7.94,.016,white);
  torus(0,.105,-4,7.62,.055,gold,{rx:PI/2,glow:.25});
  torus(0,.105,-4,6.96,.035,dark,{rx:PI/2});
  cyl(0,.098,-4,3.7,3.7,.02,0xaac3cc);
  torus(0,.12,-4,3.64,.035,cyan,{rx:PI/2,glow:.25});
  for(let i=0;i<10;i++) {
    const a=i*PI/5;
    box(Math.cos(a)*5.6,.113,-4+Math.sin(a)*5.6,1.65,.034,.72,0xcedce0,{ry:-a});
    box(Math.cos(a)*7.22,.123,-4+Math.sin(a)*7.22,.75,.025,.23,blue,{ry:-a});
  }
  for(const x of [-2.3,2.3]) {
    box(x,.025,8.6,.13,.025,8.1,0xa6c5d1);
    box(x,.045,5,.13,.035,1.3,cyan,{glow:.25});
  }
  // A complete medal and its layered casing anchor the view from the entrance.
  box(0,.29,-11.3,6.3,.58,2.8,dark);
  box(0,.63,-11.3,5.6,.12,2.45,white);
  for(const x of [-1.5,1.5]) {
    box(x,2.48,-11.64,.68,3.7,.76,shell);
    beam([x,.7,-12.1],[x,4.6,-11.65],.22,.3,dark);
  }
  cyl(0,4.02,-11.46,2.58,2.58,.6,dark,{rx:PI/2});
  cyl(0,4.02,-11.10,2.43,2.43,.17,gold,{rx:PI/2});
  cyl(0,4.02,-10.985,2.13,2.13,.08,0xa17a43,{rx:PI/2});
  torus(0,4.02,-10.91,2.13,.12,0xffdb7c,{glow:.25});
  const star=[];
  for(let i=0;i<11;i++) {
    const a=PI/2+i*PI/5,r=i%2?.74:1.7;
    star.push([Math.cos(a)*r,4.02+Math.sin(a)*r,-10.85]);
  }
  for(let i=0;i<10;i++)beam(star[i],star[i+1],.16,.13,0xffe6a4);
  cyl(0,4.02,-10.78,.52,.52,.16,gold,{rx:PI/2});
  for(let i=0;i<12;i++) {
    const a=i*PI/6;
    ball(Math.cos(a)*2.31,4.02+Math.sin(a)*2.31,-10.9,.067,.067,.045,0xffe6aa);
  }
  for(const s of [-1,1]) {
    box(s*1.08,6.07,-11.8,.72,2,.18,blue,{rz:s*.29});
    box(s*1.08,6.07,-11.69,.11,1.98,.06,cyan,{rz:s*.29});
  }
  text(0,1.13,-9.87,'使命 · 勇气 · 荣誉',5.3,.42,white);
  block(0,-11.3,6.4,3.15);
  // G06's oblique cyan memorial face, with two solid rear support ribs.
  box(-15.3,.32,-6.7,5.2,.64,3.5,dark);
  box(-15.3,3.7,-7.05,4.45,6.65,1.5,shell,{rz:-.17});
  box(-15.12,3.75,-6.2,3.6,5.65,.25,white,{rz:-.17});
  ball(-15.1,3.72,-6.01,1.57,2.42,.15,blue);
  const memorialRing=torus(-15.1,3.7,-5.83,1.33,.075,cyan,{glow:.35});memorialRing.scale.y*=1.43;
  box(-15.1,3.75,-5.79,.65,1.65,.12,white);
  box(-15.1,3.9,-5.70,1.42,.36,.08,white);
  text(-15.1,2.32,-5.75,'SEER',2,.38,white);
  box(-16.7,3.15,-7.95,.38,4.5,.5,dark,{rz:-.17});
  box(-13.8,3.15,-7.95,.38,4.5,.5,dark,{rz:-.17});
  block(-15.3,-6.8,5.7,4.2);
  // Two archive plinths have real rears, tops and three-dimensional small awards.
  for(const [x,z,num] of [[15.5,-8.6,'01'],[16.6,-1.5,'02']]) {
    box(x,.42,z,3.6,.84,2.4,dark);
    box(x,1.17,z,3.4,.65,2.18,white);
    box(x,2.78,z-.72,3.35,2.5,.45,shell);
    panel(x,2.9,z-.46,2.9,1.95,blue);
    box(x,1.58,z+.08,2.95,.18,1.6,0xc6d9df);
    cyl(x,2.03,z,.58,.78,.72,gold);
    ball(x,2.66,z,.7,.68,.35,0xffd377);
    torus(x,2.68,z+.36,.39,.055,white);
    for(const s of [-1,1])box(x+s*1.56,2.6,z,.12,2.4,1.8,cyan,{glow:.15});
    box(x,3.85,z,3.45,.16,1.95,white);
    text(x,1.13,z+1.115,'荣誉档案 '+num,2.7,.3,dark);
    block(x,z,3.7,2.55);
  }
  const ap=arc(20,2,7.5,PI*.09,PI*.91,12);
  pipe(ap,.24,white);
  pipe(ap.map(p=>[p[0],p[1]+.38,p[2]]),.075,cyan,{glow:.35});
  for(let i=0;i<ap.length;i+=2) {
    const [x,,z]=ap[i];
    box(x,3.77,z,.58,7.55,.8,shell);
    box(x,3.75,z+.44,.15,6.5,.12,white);
    box(x,.32,z,1.2,.64,1.38,dark);
    block(x,z,1.25,1.4);
  }
  // Overhead members and ring-light remain at least 9.2 metres over the deck.
  torus(0,9.8,-4,8.5,.28,white,{rx:PI/2});
  torus(0,9.6,-4,8.05,.075,cyan,{rx:PI/2,glow:.45});
  for(let i=0;i<8;i++) {
    const a=i*PI/4,x=Math.cos(a)*8.5,z=-4+Math.sin(a)*8.5;
    beam([x,9.8,z],[Math.cos(a)*18.5,11.25,-4+Math.sin(a)*10.7],.38,.45,shell);
  }
  text(0,8.2,-14.9,'荣 誉 大 厅',10.3,1.05,white);
  text(0,7.19,-14.87,'HALL OF HONOR',8.3,.43,cyan);
  for(const x of [-13.8,13.8]) {
    box(x,.33,8.5,6,.66,1.7,dark);
    box(x,.78,8.5,6.1,.26,1.85,white);
    box(x,1.26,9.12,6.1,.84,.2,shell);
    for(const dx of [-2.75,2.75])box(x+dx,.99,8.45,.18,.35,1.65,cyan);
    block(x,8.5,6.15,2);
  }
  panel(-21.7,2.8,2.4,2.7,1.2,dark,{ry:PI/2});
  text(-21.62,2.8,2.4,'教官办公室 →',2.5,.48,cyan,{ry:PI/2});
};

cabinBuilders.terraceAccess = function(kit) {
  const {box,cyl,ball,beam,torus,panel,text,block,root}=kit;
  const steel=0x7f9caf,dark=0x25475d,pale=0xd1e3e8,cyan=0x43e9ff,gold=0xeab55a;
  // Metadata for the main assembler: open -Z edge and overhead sky are required.
  // No unknown shell object is hidden or removed by this equipment-only builder.
  root.userData.terraceOpenEdge='-Z';root.userData.terraceOpenRoof=true;
  root.userData.civicReference='2013/2014 terrace scenes; handrail, open edge and canopies inferred';
  // Game-grounded pale walkable deck with cyan rectangular inlays.
  for(const x of [-8.2,8.2]) {
    box(x,.016,-1.4,8.8,.025,14.4,0x2e8fac);
    box(x,.034,-1.4,8.1,.012,13.7,0x65c8db);
    for(const z of [-8.4,5.6])box(x,.047,z,8.7,.018,.065,cyan,{glow:.45});
  }
  for(const x of [-2.45,2.45])box(x,.036,.1,.075,.045,22,cyan,{glow:.35});
  for(let z=-8;z<10;z+=3)box(0,.027,z,.18,.025,.5,0xe9f7f8);
  // A real thick edge beam and post / infill guardrail front the open viewing area.
  box(0,.16,-11.3,35.6,.32,.5,dark);block(0,-11.3,35.8,.65);
  box(0,-.25,-11.72,36.0,.48,1.3,steel);
  for(let i=0;i<13;i++) {
    const x=-17.4+i*2.9;
    box(x,.71,-11.3,.18,1.42,.22,steel);
    box(x,.13,-11.3,.45,.16,.5,pale);
    if(i<12)box(x+1.45,.78,-11.3,2.69,.91,.065,0x83dced,{opacity:.19,roughness:.2});
  }
  beam([-17.5,1.35,-11.3],[17.5,1.35,-11.3],.17,.19,pale);
  beam([-17.5,.48,-11.3],[17.5,.48,-11.3],.10,.12,steel);
  box(0,.34,-11.03,35.1,.06,.05,cyan,{glow:.45});
  for(const s of [-1,1]) {
    box(s*17.5,.16,-6.4,.5,.32,9.8,dark);block(s*17.5,-6.4,.65,10.2);
    for(let i=0;i<5;i++) {
      const z=-11.3+i*2.45;
      box(s*17.5,.71,z,.22,1.42,.18,steel);
      if(i<4)box(s*17.5,.78,z+1.225,.065,.91,2.24,0x83dced,{opacity:.19,roughness:.2});
    }
    beam([s*17.5,1.35,-11.3],[s*17.5,1.35,-1.5],.17,.19,pale);
    beam([s*17.5,.48,-11.3],[s*17.5,.48,-1.5],.10,.12,steel);
    for(const z of [2.2,9]) {
      box(s*17.8,3.75,z,.5,7.5,.6,dark);block(s*17.8,z,.7,.8);
      beam([s*17.8,7.5,z],[s*14.5,8.8,z],.36,.45,steel);
    }
    box(s*16.35,8.75,5.7,3.4,.32,9,pale);
    box(s*16.35,8.55,5.7,.14,.1,8.3,cyan,{glow:.45});
    // Occupants look toward the open edge, from two flanking seats.
    const x=s*11.8,z=-6.8;
    for(const q of [-1.6,1.6])box(x+q,.34,z,.18,.68,.8,dark);
    box(x,.72,z,4.4,.2,1,pale);box(x,1.11,z+.42,4.4,.65,.18,steel);
    block(x,z,4.65,1.3);
  }
  box(-12.3,.65,5.7,5.6,1.3,1.9,dark);
  box(-12.3,1.36,5.7,6,.18,2.2,pale);
  box(-12.3,.8,6.68,4.9,.23,.06,cyan,{glow:.35});block(-12.3,5.7,6.2,2.4);
  box(-13.6,1.74,5.55,1.25,.75,.28,steel,{rx:-.22});
  panel(-13.6,1.76,5.76,1.03,.5,0x48bddd,{rx:-.22});
  text(-12.3,1.02,6.74,'TERRACE / 接待',3.4,.34,0xe6f9fc);
  // A 2011 game machine supplies the dome, gold bands and collection hatch.
  const mx=13.2,mz=4.1;
  cyl(mx,.22,mz,1.6,1.7,.44,dark);cyl(mx,1.07,mz,1.28,1.46,1.6,pale);
  torus(mx,1.72,mz,1.31,.14,gold,{rx:Math.PI/2});
  ball(mx,2.67,mz,1.19,1.33,1.19,0x83dced,{opacity:.21,roughness:.2});
  for(let i=0;i<7;i++) {
    const a=i*2.4;
    ball(mx+Math.cos(a)*.66,2.07+(i%3)*.26,mz+Math.sin(a)*.55,.25,.25,.25,
      [0xf0bc50,0x40d7e5,0x9b70d5][i%3]);
  }
  cyl(mx,3.95,mz,.86,1.02,.28,gold);
  ball(mx,4.19,mz,.32,.32,.32,cyan,{glow:.45});
  box(mx,.72,mz+1.36,.98,.56,.24,dark);
  box(mx,.75,mz+1.5,.71,.3,.06,0x0f2637);
  cyl(mx+.7,1.23,mz+1.2,.18,.18,.14,gold,{rx:Math.PI/2});
  box(mx,1.08,mz-1.37,.8,.83,.16,steel);block(mx,mz,3.6,3.5);
  text(mx,3.36,mz+1.1,'梦幻扭蛋',1.65,.36,0xeffcff);
  for(const x of [-6,6]) {
    box(x,1.06,-10.92,2.3,.18,.72,dark,{rx:.2});
    text(x,1.18,-10.55,'星海观景',1.95,.22,0x98eff8,{rx:-Math.PI/2});
  }
};
