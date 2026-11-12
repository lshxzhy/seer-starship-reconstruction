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

// G07 has one transporter room, with different equipment along its rear wall.
cabinBuilders.teleport = kit=>shipTransporters.install(kit,'teleport',[
  {slot:'01',x:-12,z:-8,yaw:.24,tint:0x70d8d6,finish:'sand',destination:'klose',alternates:['alpha']},
  {slot:'02',x:-4.8,z:-10,yaw:.10,tint:0x86e899,finish:'bronze',destination:'klose',alternates:['alpha']},
  {slot:'03',x:4.8,z:-10,yaw:-.10,tint:0x9396ed,finish:'silver',destination:'ocean',alternates:['beta']},
  {slot:'04',x:12,z:-8,yaw:-.24,tint:0x70e0df,finish:'sand',destination:'ocean',alternates:['beta','byron']}
]);

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
  cyl(-.05,1.61,-5.72,.50,.56,.16,dark);
  cyl(-.05,1.79,-5.72,.41,.48,.21,gold);
  cyl(-.05,1.936,-5.72,.30,.38,.085,cream);
  // The cyan projection pedestal on the command desk tapers toward its lens.
  // Modelled above the working surface, with the sight returning to its base.
  cyl(-2.08,1.58,-4.47,.41,.49,.11,dark);
  cyl(-2.08,1.68,-4.47,.31,.39,.10,cream);
  torus(-2.08,1.75,-4.47,.27,.036,cyan,{rx:PI/2,glow:.22});
  cyl(-2.08,1.93,-4.47,.08,.15,.34,steel);
  ball(-2.08,2.13,-4.47,.12,.18,.12,cyan,{glow:.23,roughness:.19});
  for(const s of [-1,1])
    beam([-.05+s*.19,1.985,-5.82],[-.05,1.985,-5.63],.042,.044,gold);
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
    for(const side of [-1,1])for(let j=0;j<3;j++){
      const y=.81+j*.70,z=.94-j*.43;
      box(side*1.44,y,z,.40,.73,.23,steel,{rx:-.55});
      box(side*1.44,y+.01,z+.083,.35,.66,.16,cream,{rx:-.55});
    }
    for(let i=0;i<7;i++)box(0,.83+i*.245,.91-i*.15,2.22,.035,.045,0xb5fff2);
    box(0,3.26,-.73,3.1,.83,.46,cream);
    box(0,3.27,-.46,1.60,.54,.12,dark);
    box(0,3.27,-.383,1.42,.40,.055,0x446fba);
    for(const y of [3.18,3.27,3.36])box(0,y,-.35,1.17,.033,.025,0x99bde2);
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
  kit.root.userData.civicReference='G06 and the 2012-04-18 full room (4399 article 154657); scale and hidden construction inferred';
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
  // The April 2012 full-room game view (4399, article 154657) resolves
  // G06's cropped centre: the dais is low, radial and backed by a ranking
  // display. A pair of challenge terminals flanks it. Feet and backs are inferred.
  const zDais=-9.15,T=kit.T;
  cyl(0,.25,zDais,4.62,4.94,.48,dark);
  cyl(0,1.15,zDais,3.30,4.50,1.42,shell);
  cyl(0,2.25,zDais,2.44,3.34,1.25,dark);
  cyl(0,2.98,zDais,2.42,2.62,.39,white);
  torus(0,3.19,zDais,1.97,.115,gold,{rx:PI/2,glow:.36});
  cyl(0,3.16,zDais,1.84,1.94,.16,0xe29236,{glow:.18});
  torus(0,3.25,zDais,1.53,.030,white,{rx:PI/2});
  function castingGeometry(key,sections){
    return cabinAsset(cabinAssets.geometries,'honors/dais/'+key,()=>{
      const vertices=[],triangles=[];
      for(const [radius,bottom,top,half,bevel] of sections){
        vertices.push(-half,bottom+bevel,radius,-half+bevel,bottom,radius,
          half-bevel,bottom,radius,half,bottom+bevel,radius,half,top-bevel,radius,
          half-bevel,top,radius,-half+bevel,top,radius,-half,top-bevel,radius);
      }
      const last=8*(sections.length-1);
      for(let i=1;i<7;i++)triangles.push(0,i+1,i,last,last+i,last+i+1);
      for(let at=0;at<last;at+=8)for(let i=0;i<8;i++){
        const a=at+i,b=at+(i+1)%8;triangles.push(a,b,b+8,a,b+8,a+8);
      }
      const g=new T.BufferGeometry();
      g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(triangles);
      const faces=g.toNonIndexed();g.dispose();faces.computeVertexNormals();return faces;
    });
  }
  const foot=castingGeometry('foundation',[[1.45,.74,2.89,.66,.17],[2.76,.32,2.86,.98,.22],
    [3.28,.24,2.55,1.02,.21],[4.78,.15,1.10,1.04,.19],[5.10,.18,.72,.91,.13]]);
  const upper=castingGeometry('upper',[[1.57,2.72,3.18,.62,.13],[1.96,2.76,3.30,.86,.14],
    [2.66,2.64,3.20,.93,.16],[2.92,2.54,2.93,.89,.12]]);
  const skirt=castingGeometry('skirt',[[2.96,2.32,2.83,.80,.12],[3.20,2.19,2.82,.85,.13],
    [4.46,.93,1.56,.92,.16],[4.85,.62,1.13,.83,.11]]);
  for(let i=0;i<6;i++){
    const angle=(i+.5)*PI/3;
    civicAssembly(kit,0,zDais,angle,()=>{
      for(const [geometry,color] of [[foot,dark],[upper,white],[skirt,white]]){
        const piece=box(0,0,0,1,1,1,color,{structural:true});piece.geometry=geometry;
      }
      for(const s of [-1,1]){
        beam([s*.43,3.24,2.49],[0,3.32,2.08],.13,.045,0x77bfd2);
        beam([s*.63,2.39,3.38],[s*.67,1.34,4.44],.040,.065,0xb5c4c7);
      }
    });
  }
  // The warm badge port and its toothed barrel are clearly visible from
  // player eye height between the two forward petals.
  cyl(0,1.25,zDais+3.15,1.28,1.35,1.45,shell,{rx:PI/2});
  cyl(0,1.25,zDais+3.95,1.36,1.32,.28,dark,{rx:PI/2});
  torus(0,1.25,zDais+4.11,1.03,.16,shell);
  cyl(0,1.25,zDais+4.13,.87,.87,.13,0xd16e28,{rx:PI/2});
  for(let i=0;i<16;i++){
    const a=i*PI/8;
    box(1.15*Math.sin(a),1.25+1.15*Math.cos(a),zDais+4.11,.22,.34,.28,shell,{rz:-a});
    box(.76*Math.sin(a),1.25+.76*Math.cos(a),zDais+4.22,.12,.28,.08,gold,{rz:-a,glow:.23});
  }
  ball(0,1.25,zDais+4.23,.59,.59,.14,0xffb039,{glow:.48});
  // Three strips approximate the circular obstruction without closing its
  // front flanks. The ceremonial forecourt remains on the normal walking deck.
  block(0,zDais,10.05,4.0);
  for(const s of [-1,1])block(0,zDais+s*3.30,8.35,2.65);
  box(0,4.59,zDais-3.25,4.12,3.42,.70,dark,{rx:-.25});
  box(0,4.82,zDais-2.91,3.82,2.92,.30,gold,{rx:-.25});
  box(0,4.85,zDais-2.68,3.41,2.38,.16,0xdadac5,{rx:-.25});
  text(0,4.85,zDais-2.53,'成就排行榜',2.74,.52,dark,{rx:-.25});
  for(const s of [-1,1]){
    const baseX=s*12.6,baseZ=-9.25;
    civicAssembly(kit,baseX,baseZ,-s*.20,()=>{
      cyl(0,.32,0,2.79,3.09,.60,shell);
      cyl(0,.68,0,2.57,2.78,.20,dark);
      torus(0,.80,0,2.45,.082,gold,{rx:PI/2,glow:.23});
      // A backward rake in depth opens the cyan face to the forecourt.
      ball(0,3.14,-.18,2.12,2.89,1.19,white,{rx:-.47});
      ball(0,3.07,.81,1.67,2.46,.28,blue,{rx:-.47});
      const rim=torus(0,3.12,.95,1.60,.088,cyan,{rx:-.47,glow:.26});
      rim.scale.y*=1.49;
      for(const side of [-1,1])beam([side*.67,1.02,-1.40],[side*.89,4.93,-1.13],.30,.38,shell);
      beam([-.33,2.96,1.23],[.31,3.87,.78],.35,.14,white);
      box(.16,3.80,.89,.70,.24,.14,white,{rx:-.47,rz:-.23});
      text(0,2.40,1.52,s<0?'高阶挑战':'低阶挑战',2.12,.33,white,{rx:-.47});
      if(s<0)text(0,2.07,1.65,'SENIOR',1.31,.16,cyan,{rx:-.47});
      cyl(-s*2.0,4.54,-.21,.86,.88,.52,dark,{rz:PI/2});
      torus(-s*1.77,4.54,.38,.69,.17,gold,{glow:.28});
      ball(-s*1.77,4.54,.43,.49,.49,.24,white);
      box(0,5.77,-1.16,4.92,2.17,2.25,dark,{rx:-.17});
      box(0,6.10,-.85,4.75,1.48,2.10,shell,{rx:-.17});
      for(const side of [-1,1]){
        box(side*1.78,5.89,.16,.60,1.18,.38,white,{rx:-.24});
        box(side*1.77,5.86,.39,.21,.46,.095,0xc49cad,{rx:-.24});
      }
    });
    block(baseX,baseZ,6.36,6.22);
    beam([s*10.7,5.12,baseZ-.95],[s*3.28,2.64,zDais-2.70],.62,.81,dark);
    beam([s*10.7,5.51,baseZ-.95],[s*3.28,3.03,zDais-2.70],.15,.20,gold);
  }
  // Two archive plinths have real rears, tops and three-dimensional small awards.
  for(const [x,z,num] of [[18.3,-1.8,'01'],[18.3,3.7,'02']]) {
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
    const x=mx+Math.cos(a)*.64,y=2.14+(i%3)*.28,z=mz+Math.sin(a)*.58;
    ball(x,y,z,.30,.30,.30,[0xf0bc50,0x40d7e5,0x9b70d5][i%3]);
    torus(x,y,z,.295,.020,pale,{rx:Math.PI/2});
  }
  cyl(mx,3.95,mz,.86,1.02,.28,gold);
  // The 2011 machine illustration gives the crown four gold points and a
  // face beneath the glass, with dark flank pods and a diamond-shaped bill.
  ball(mx,4.15,mz,.73,.60,.71,0x187e9a,{metalness:.42,roughness:.29});
  for(let i=0;i<4;i++){
    const a=Math.PI*.25+i*Math.PI/2;
    cyl(mx+.55*Math.cos(a),4.50,mz+.55*Math.sin(a),.045,.18,.52,gold,
      {rx:.38*Math.sin(a),rz:-.38*Math.cos(a),segments:8});
  }
  cyl(mx,4.20,mz+.68,.24,.24,.16,dark,{rx:Math.PI/2,segments:28});
  ball(mx,4.20,mz+.77,.155,.155,.053,gold);
  for(const s of [-1,1]){
    beam([mx+s*.84,1.86,mz+.38],[mx+s*.65,3.83,mz+.31],.115,.16,dark);
    ball(mx+s*1.28,1.00,mz+.19,.39,.58,.50,0x334757,{rz:-s*.37});
    cyl(mx+s*1.35,1.36,mz+.56,.20,.20,.18,steel,{rx:Math.PI/2});
    ball(mx+s*.67,1.28,mz+1.10,.26,.40,.13,dark,{rz:-s*.24});
    ball(mx+s*.67,1.30,mz+1.235,.105,.20,.04,cyan,{glow:.22});
  }
  ball(mx,1.17,mz+1.26,.26,.22,.11,gold);
  box(mx,1.17,mz+1.365,.16,.16,.06,0xe69835,{rz:Math.PI/4});
  torus(mx,1.77,mz,1.305,.055,0xad483d,{rx:Math.PI/2});
  box(mx,.72,mz+1.36,1.30,.68,.24,dark);
  box(mx,.73,mz+1.5,1.01,.40,.06,0x0f2637);
  cyl(mx+.77,1.27,mz+1.19,.24,.24,.21,gold,{rx:Math.PI/2});
  box(mx+.77,1.27,mz+1.33,.095,.36,.08,pale,{rz:-.35});
  box(mx,1.08,mz-1.37,.8,.83,.16,steel);block(mx,mz,3.6,3.5);
  text(mx,3.36,mz+1.1,'梦幻扭蛋',1.65,.36,0xeffcff);
  for(const x of [-6,6]) {
    box(x,1.06,-10.92,2.3,.18,.72,dark,{rx:.2});
    text(x,1.18,-10.55,'星海观景',1.95,.22,0x98eff8,{rx:-Math.PI/2});
  }
};
