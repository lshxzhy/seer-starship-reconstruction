// Science/command cabins. Metres; +Z is the common entrance.
// Evidence and dimensional inferences: references/habitat/science/来源与建模.md
// Kept in a lexical block so assembly with other cabin fragments is safe.
{
  function scienceKit(k) {
    const {T,root,box,cyl,ball,beam,pipe,torus,panel,text,block}=k;
    const C={ink:0x101e32,navy:0x243b54,steel:0x65798a,edge:0xb3c8ca,
      ivory:0xd8d9c5,cyan:0x61e9e8,blue:0x328cc1,amber:0xf8b958,
      green:0x6dcda0,paper:0xf1e4bb,red:0xc96851};
    function tube(a,b,r,color,rb=r) {
      const A=new T.Vector3(...a),B=new T.Vector3(...b),v=B.clone().sub(A);
      const m=cyl((A.x+B.x)/2,(A.y+B.y)/2,(A.z+B.z)/2,r,rb,v.length(),color);
      m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m;
    }
    function ring(p,n,r,t,color) {
      const m=torus(...p,r,t,color);
      m.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(...n).normalize());return m;
    }
    function glass(m,opacity=.25) {
      m.material=m.material.clone();m.material.transparent=true;
      m.material.opacity=opacity;m.material.depthWrite=false;return m;
    }
    function screen(x,y,z,w,h,color=C.cyan,rx=0,ry=0) {
      const body=box(x,y,z-.07,w+.18,h+.18,.18,C.ink,{rx,ry});
      // Face follows the same orientation, including side-wall displays.
      const n=new T.Vector3(0,0,.11).applyEuler(new T.Euler(rx,ry,0));
      const face=panel(x+n.x,y+n.y,z+n.z,w,h,color,{rx,ry,glow:.32});
      return {body,face};
    }
    function keys(x,y,z,w=1.3) {
      box(x,y,z,w,.08,.52,C.ink);
      for(let i=0;i<5;i++)box(x+(i-2)*w/6,y+.055,z,.11,.025,.22,i===4?C.amber:C.edge);
    }
    function smallConsole(x,z,w=2.5,color=C.steel) {
      box(x,.13,z,w+.25,.26,1.8,C.ink);
      box(x,.70,z,w,1.15,1.55,color);
      box(x,1.25,z+.03,w+.12,.18,1.75,C.edge);
      screen(x,1.52,z-.28,w-.38,.72,C.cyan,-.55);
      keys(x,1.38,z+.5,w-.5);
      box(x,.69,z-.83,w-.25,.66,.09,C.navy);
      for(let i=0;i<3;i++)box(x+(i-1)*.4,.65,z+.794,.22,.24,.035,C.ink);
      block(x,z,w+.35,1.95);
    }
    function seat(x,z,color=C.navy,angle=0) {
      // Modelled all round: pedestal, seat, solid rear and paired arms.
      const g=new T.Group();root.add(g);
      const add=m=>{g.add(m);return m;};
      add(cyl(0,.15,0,.67,.80,.3,C.ink));
      add(cyl(0,.58,0,.19,.23,.64,C.steel));
      add(box(0,.97,0,1.30,.25,1.26,color));
      add(box(0,1.42,.49,1.30,1.05,.24,color));
      add(box(0,1.93,.50,.95,.16,.29,C.edge));
      for(const s of [-1,1]){
        add(box(s*.68,1.12,.12,.14,.45,.76,C.steel));
        add(box(s*.68,1.38,-.02,.24,.12,1.08,C.edge));
      }
      g.position.set(x,0,z);g.rotation.y=angle;block(x,z,1.8,1.9);return g;
    }
    function windowBay(x,y,z,w,h,tint=0x102744) {
      box(x,y,z,w+.50,h+.50,.40,C.navy);
      box(x,y,z+.24,w,h,.12,tint,{glow:.13});
      for(const s of [-1,1]){
        box(x+s*(w/2+.14),y,z+.37,.20,h+.38,.28,C.edge);
        box(x,y+s*(h/2+.14),z+.37,w+.44,.20,.28,C.edge);
      }
      for(let i=0;i<15;i++){
        const u=((i*37+11)%101)/101,v=((i*29+17)%97)/97;
        ball(x+(u-.5)*(w-.6),y+(v-.5)*(h-.6),z+.32,.025+(i%3)*.014,.025+(i%3)*.014,.018,i%4?C.edge:C.blue,{glow:.6});
      }
    }
    function lightBar(x,y,z,w,color=C.cyan) {
      box(x,y,z,w,.22,.52,C.navy);box(x,y-.13,z,w-.2,.035,.31,color,{glow:.6});
    }
    function floorLine(x,z,w,d,color=C.cyan){box(x,.022,z,w,.035,d,color,{glow:.16});}
    return {...k,C,tube,ring,glass,screen,keys,smallConsole,seat,windowBay,lightBar,floorLine};
  }

  cabinBuilders.captain=function(kit){
    const {T,root,box,cyl,ball,beam,pipe,torus,panel,text,block,W,D,H,C,tube,ring,
      screen,keys,smallConsole,windowBay,lightBar,floorLine}=scienceKit(kit);
    // 2010 command room: ivory stepped map desk, cyan rings, green slots,
    // framed star/track surfaces. Their viewport use and the seat are inferred.
    const rear=-D/2+.55;
    for(let i=0;i<3;i++)windowBay(-8.8+i*8.8,5.45,rear,8.0,4.75,0x112b45);
    for(const x of [-13.7,-4.5,4.5,13.7]){
      box(x,4.25,rear+.30,.72,8.3,.9,C.ivory);
      box(x,4.5,rear+.82,.16,4.2,.08,C.green,{glow:.25});
    }
    // Projected navigation path is built as a physical window overlay.
    pipe([[-11,5.1,rear+.50],[-5,6.7,rear+.50],[1,6.35,rear+.50],[8,4.7,rear+.50],[12,5.55,rear+.50]],.035,C.cyan,{glow:.45});
    for(const x of [-8,-1,7])ring([x,5.65,rear+.53],[0,0,1],.46,.045,C.cyan);
    text(0,8.35,rear+.85,'SE–A015  指 挥',10,.52,C.edge);
    // Open briefing area on the left, with the source's two cyan map circles.
    const mx=-6.1,mz=-2.3;
    box(mx,.15,mz,7.1,.30,5.2,C.ink);
    box(mx,.49,mz,6.6,.55,4.8,C.ivory);
    box(mx,.88,mz-.12,6.25,.34,4.5,C.edge);
    box(mx,1.19,mz-.28,5.8,.30,4.15,C.ivory);
    // A gently raised rear edge makes the map legible at the entrance eye height.
    for(const s of [-1,1])box(mx+s*1.8,1.72,mz-1.55,.32,.95,.42,C.steel);
    box(mx,1.85,mz-.39,5.5,.18,3.9,C.navy,{rx:.197});
    box(mx,1.97,mz-.39,5.18,.065,3.58,0x447e8a,{rx:.197,glow:.16});
    for(const dx of [-1.15,1.15]){
      ring([mx+dx,2.02,mz-.45],[0,1,.2],.95,.055,C.cyan);
      ring([mx+dx,2.03,mz-.45],[0,1,.2],.57,.04,C.cyan);
      cyl(mx+dx,2.055,mz-.45,.17,.17,.07,C.paper,{rx:.197,glow:.4});
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4,offset=Math.cos(a)*.87;
        box(mx+dx+Math.sin(a)*.87,2.03-offset*.20,mz-.45+offset,
          .035,.025,i%2?.07:.13,C.paper,{rx:.197,ry:a});
      }
    }
    // Rear projection mast and small raised tactical reticle.
    cyl(mx+2.3,2.13,mz-1.6,.08,.12,1.35,C.steel);
    ball(mx+2.3,2.85,mz-1.6,.21,.21,.21,C.cyan,{glow:.5});
    ring([mx+.1,2.8,mz-.6],[0,0,1],.65,.035,C.cyan);
    beam([mx-.6,2.8,mz-.6],[mx+.8,2.8,mz-.6],.035,.035,C.cyan);
    beam([mx+.1,2.15,mz-.6],[mx+.1,3.45,mz-.6],.035,.035,C.cyan);
    for(const dx of [-2.1,2.1]){
      box(mx+dx,.63,mz+2.43,.42,.20,.04,C.green,{glow:.3});
      box(mx+dx,.7,mz-2.35,.7,.55,.10,C.steel);
    }
    text(mx,.98,mz+2.30,'航线 / 星图',3.4,.32,C.ink);block(mx,mz,7.3,5.5);
    // Command seat, inferred from the visible ivory rear equipment silhouette.
    // It faces -Z; visitors see its green-slot back and can walk round either side.
    const sx=6.5,sz=-2.0;
    cyl(sx,.15,sz,2.30,2.55,.30,C.ink);
    cyl(sx,.46,sz,1.8,2.05,.35,C.steel);
    cyl(sx,.94,sz,.47,.72,.75,C.navy);
    box(sx,1.43,sz,2.7,.55,2.6,C.navy);
    box(sx,2.55,sz+.95,3.35,2.65,.90,C.ivory,{rx:-.11});
    box(sx,3.81,sz+.83,2.8,.26,.95,C.edge);
    box(sx,2.5,sz+.39,2.6,1.9,.20,C.navy,{rx:-.11});
    // Green rear ventilation slots are the recognisable game silhouette.
    for(const y of [2.25,3.05]){
      box(sx,y,sz+1.49,2.10,.17,.10,C.ink);
      box(sx,y,sz+1.55,1.70,.075,.035,C.green,{glow:.25});
    }
    for(const s of [-1,1]){
      box(sx+s*1.55,1.85,sz-.15,.48,1.2,2.4,C.ivory);
      box(sx+s*1.55,2.48,sz-.25,.65,.16,2.5,C.edge);
      tube([sx+s*1.65,1.65,sz+.1],[sx+s*2.04,1.65,sz+.1],.68,C.steel);
      ring([sx+s*2.05,1.65,sz+.1],[1,0,0],.55,.11,C.navy);
      box(sx+s*1.55,2.58,sz-1.0,.40,.08,.42,C.green,{glow:.2});
    }
    box(sx,.38,sz-1.48,2.1,.35,1.30,C.steel);
    pipe([[sx,1.1,sz+.8],[sx+2.2,.30,sz+.9],[12,.30,sz+.9],[14.5,.30,-7]],.10,C.ink);
    block(sx,sz,5.2,5.2);
    // Low forward command bench preserves the window above it.
    box(sx,.75,-7,6.4,1.5,2.45,C.ivory);
    box(sx,1.55,-7,6.65,.18,2.7,C.navy);
    for(const dx of [-2.02,0,2.02])screen(sx+dx,1.89,-7.20,1.65,.76,C.cyan,-.55);
    keys(sx,1.72,-6.25,2.7);
    for(const dx of [-2.2,2.2])box(sx+dx,.8,-5.74,1.1,.38,.10,C.green,{glow:.2});
    block(sx,-7,6.9,2.9);
    text(sx,.98,-5.68,'船长  罗杰',2.7,.36,C.ink);
    // Side communications rack and briefing storage; the entrance centre stays open.
    smallConsole(-12.6,5.3,3.9,C.ivory);
    text(-12.6,2.2,4.9,'舰队通讯',2.6,.38,C.edge);
    for(const z of [-4,3,9]){
      box(W/2-.95,2.0,z,1.4,4,3.9,C.ivory);
      screen(W/2-1.72,2.4,z,2.65,1.0,C.green,0,-Math.PI/2);
      for(const y of [.8,1.1,1.4])box(W/2-1.74,y,z,.06,.07,2.6,C.navy);
      block(W/2-.95,z,1.8,4.1);
    }
    // Broad ceiling ribs lead the eye to the panorama; no low hanging centre mass.
    for(const z of [-8,0,8]){
      beam([-14,H-.35,z],[14,H-.35,z],.30,.45,C.ivory);
      lightBar(0,H-.65,z,18,C.paper);
    }
    for(const x of [-11.5,11.5])pipe([[x,6.8,10],[x,H-.9,7],[x,H-.9,-10]],.12,C.steel);
    for(const x of [-1.7,1.7])floorLine(x,2.2,.10,19.3,C.green);
    for(const z of [5,9]){
      beam([-.65,.045,z+.4],[0,.045,z],.10,.06,C.green);
      beam([0,.045,z],[.65,.045,z+.4],.10,.06,C.green);
    }
  };

  cabinBuilders.laboratory=function(kit){
    const {box,cyl,ball,beam,pipe,torus,panel,text,block,W,D,H,C,tube,ring,glass,
      screen,keys,smallConsole,lightBar,floorLine}=scienceKit(kit);
    // Old laboratory, image used in the 2012-02-20 fusion guide.
    // Source: amber dome at left, large rear-right fusion ring, cyan specimen bay.
    const rear=-D/2+.55;
    for(const x of [-14,-6,4,14]){
      box(x,4.4,rear,.48,8.7,.8,C.ivory);
      box(x,5.8,rear+.45,.19,2.8,.08,C.amber,{glow:.23});
    }
    box(-6.2,5.1,rear+.3,12.5,4.2,.5,C.navy);
    for(const dx of [-4,0,4]){
      screen(-6.2+dx,5.15,rear+.64,3.1,2.7,dx===0?C.green:C.cyan);
      // Diagram made from distinct linked nodes, not a photographic texture.
      for(let i=0;i<3;i++){
        const x=-6.2+dx+(i-1)*.65,y=5.1+Math.sin(i+dx)*.6;
        torus(x,y,rear+.80,.25,.04,C.ink);
        if(i<2)beam([x,y,rear+.81],[x+.65,5.1+Math.sin(i+1+dx)*.6,rear+.81],.035,.035,C.ink);
      }
    }
    text(-6.2,8.1,rear+.65,'派 特 实 验 室',11,.58,C.edge);
    // Fusion rebirth chamber: a deep annular vessel with a solid closed back.
    // Shallow closed rear shell stays behind the glass and inner components.
    ball(10.1,3.75,-10.05,3.55,3.65,1.0,C.ivory);
    box(10.1,.35,-8.7,7.3,.7,4.6,C.ink);
    box(10.1,.86,-8.7,6.7,.32,4.0,C.steel);
    tube([10.1,3.75,-9.0],[10.1,3.75,-8.7],2.57,C.navy);
    torus(10.1,3.75,-8.45,2.87,.47,C.edge);
    torus(10.1,3.75,-8.13,2.37,.15,C.cyan,{glow:.40});
    glass(tube([10.1,3.75,-8.14],[10.1,3.75,-8.06],2.19,0x4ebdc7),.26);
    for(let i=0;i<8;i++){
      const t=i*Math.PI/4,x=10.1+Math.sin(t)*2.9,y=3.75+Math.cos(t)*2.9;
      box(x,y,-8.12,.55,.85,.48,i%2?C.ivory:C.steel,{rz:-t});
      ball(x,y,-7.84,.09,.09,.07,C.amber,{glow:.3});
    }
    cyl(10.1,1.48,-8.55,1.50,1.78,.30,C.navy);
    cyl(10.1,1.68,-8.55,1.35,1.35,.10,C.cyan,{glow:.3});
    for(const dx of [-1.05,1.05]){
      cyl(10.1+dx,2.40,-8.9,.43,.53,1.35,C.steel);
      ball(10.1+dx,3.30,-8.9,.61,.81,.61,C.green,{glow:.18});
      ring([10.1+dx,3.04,-8.9],[0,1,0],.59,.048,C.edge);
    }
    smallConsole(10.1,-4.85,4.7,C.ivory);
    text(10.1,2.33,-5.2,'精灵融合转生仓',5.1,.46,C.edge);
    pipe([[13.2,2,-9.8],[15.4,2,-9.8],[15.4,6.9,-9.8],[11.8,6.9,-9.8]],.18,C.steel);
    block(10.1,-8.5,7.7,5.3);
    // Left amber-domed analysis device, with the source's red support arms.
    const ax=-10.1,az=-.1;
    cyl(ax,.20,az,2.55,2.8,.40,C.ink);
    cyl(ax,.68,az,2.1,2.55,.6,C.ivory);
    cyl(ax,1.24,az,1.85,2.05,.5,C.steel);
    ring([ax,1.48,az],[0,1,0],1.75,.11,C.cyan);
    cyl(ax,2.35,az,.85,1.1,1.65,C.ivory);
    for(let i=0;i<3;i++){
      const t=i*Math.PI*2/3,x=ax+Math.sin(t)*1.55,z=az+Math.cos(t)*1.55;
      beam([x,1.1,z],[ax+Math.sin(t)*1.0,3.5,az+Math.cos(t)*1.0],.35,.35,C.red);
      ball(x,1.24,z,.32,.32,.32,C.steel);
    }
    cyl(ax,3.55,az,1.65,1.6,.30,C.amber);
    glass(ball(ax,4.2,az,1.56,1.12,1.56,C.amber,{glow:.28}),.63);
    cyl(ax,4.1,az,.20,.29,1.25,C.paper,{glow:.4});
    cyl(ax,5.30,az,.12,.24,.30,C.red);
    screen(ax,1.6,az+1.84,1.6,.65,C.green,-.25);
    keys(ax,1.2,az+2.0,1.6);block(ax,az,5.8,5.8);
    text(ax,.80,az+2.48,'精灵分析',2.8,.34,C.ink);
    // Preparation bench joins the rear wall but has a proper cabinet backside.
    box(-11.8,.7,-8.0,6.3,1.4,2.5,C.ivory);
    box(-11.8,1.47,-8.0,6.7,.17,2.8,C.edge);
    cyl(-13,1.6,-8.15,.85,.95,.15,C.steel);
    cyl(-13,2.15,-8.15,.64,.64,1.0,C.green,{glow:.15});
    ring([-13,2.7,-8.15],[0,1,0],.8,.10,C.edge);
    screen(-10.8,2.05,-8.2,2.2,1.0,C.cyan,-.32);
    for(let i=0;i<3;i++){
      cyl(-12.4+i*.65,1.9,-7.18,.15,.18,.65,C.paper);
      cyl(-12.4+i*.65,2.25,-7.18,.16,.16,.12,C.red);
    }
    for(const dx of [-2.1,0,2.1])box(-11.8+dx,.78,-6.71,1.75,.8,.07,C.steel);
    block(-11.8,-8,6.9,3.0);
    // Source's front-right cyan specimen platform, expanded to a walk-around bay.
    const px=10.5,pz=4.5;
    cyl(px,.16,pz,2.7,2.95,.32,C.ink);
    cyl(px,.51,pz,2.35,2.65,.4,C.ivory);
    cyl(px,.86,pz,2.25,2.25,.3,C.steel);
    ring([px,1.05,pz],[0,1,0],2.16,.10,C.cyan);
    cyl(px,1.10,pz,2.0,2.0,.08,0x279bae,{glow:.3});
    const g=cyl(px,2.65,pz,1.84,1.84,3.0,C.cyan,{glow:.15});glass(g,.18);
    ring([px,4.18,pz],[0,1,0],1.9,.10,C.edge);
    // Abstract calibration specimen; no unsupported species attribution.
    ball(px,2.4,pz,.55,.8,.48,C.green,{glow:.18});
    ball(px,3.15,pz,.46,.44,.43,C.green,{glow:.18});
    for(const s of [-1,1])beam([px+s*.4,2.5,pz],[px+s*.95,2.9,pz-.2],.18,.18,C.green);
    box(px,1.0,pz+2.5,1.7,.65,.8,C.navy);
    screen(px,1.41,pz+2.62,1.25,.48,C.cyan,-.4);block(px,pz,6.1,6.7);
    // Smaller genetic sample stand, deliberately off the entrance sightline.
    cyl(-5.2,.18,6.0,1.55,1.85,.35,C.steel);
    cyl(-5.2,.88,6.0,.7,1.3,1.10,C.ivory);
    cyl(-5.2,1.49,6.0,1.45,1.45,.16,C.navy);
    ring([-5.2,1.60,6],[0,1,0],1.15,.08,C.cyan);
    ball(-5.2,2.0,6,.4,.7,.4,C.amber);block(-5.2,6,3.8,3.8);
    // Thick wall sockets, service rails and suspended task lighting.
    for(const z of [-6,2,9]){
      box(W/2-.65,3.7,z,.65,3.9,3.6,C.ivory);
      screen(W/2-1.03,4.1,z,2.2,1.0,C.green,0,-Math.PI/2);
      for(let i=0;i<3;i++)box(W/2-1.04,2.6+i*.25,z,.06,.09,2.0,C.steel);
      block(W/2-.65,z,1.0,3.8);
    }
    for(const x of [-15.5,15.5])pipe([[x,.55,10],[x,.55,-10],[x,7.6,-10]],.14,C.steel);
    for(const z of [-7,1,8.5]){
      beam([-15,H-.45,z],[15,H-.45,z],.26,.42,C.ivory);
      lightBar(0,H-.8,z,14,C.edge);
    }
    for(const x of [-1.8,1.8])floorLine(x,2,.10,20,C.cyan);
    floorLine(0,8.4,3.4,.10,C.amber);
  };

  cabinBuilders.archives=function(kit){
    const {box,cyl,ball,beam,pipe,torus,panel,text,block,W,D,H,C,tube,ring,glass,
      screen,keys,lightBar,floorLine}=scienceKit(kit);
    // Green/ivory 2012 archive: three query bays, glass-topped displays,
    // tightly subdivided library stacks, password machine and globe pedestal.
    const rear=-D/2+.48,green=0x549b79;
    box(0,4.3,rear,26,7.3,.40,C.ivory);
    for(const x of [-12.4,-4.3,4.3,12.4]){
      box(x,4.5,rear+.32,.30,6.9,.48,green);
      box(x+.22,4.5,rear+.33,.10,6.8,.50,C.navy);
    }
    for(let b=0;b<3;b++){
      const x=(b-1)*8.0,z=-8.1;
      // Clear two-level desk and equipment cabinet, fully solid all around.
      box(x,.14,z,7.0,.28,3.6,C.ink);
      box(x,.76,z,6.65,1.24,3.25,C.ivory);
      box(x,1.42,z-.12,6.85,.18,3.55,C.edge);
      box(x,1.53,z-.34,6.4,.08,2.7,C.navy);
      screen(x,1.78,z-.65,4.9,1.10,b===1?C.cyan:C.green,-.62);
      keys(x,1.66,z+.75,3.7);
      for(const dx of [-2.4,2.4]){
        box(x+dx,.8,z+1.66,.65,.8,.07,C.steel);
        for(let i=0;i<3;i++)box(x+dx,.61+i*.18,z+1.71,.45,.05,.03,C.ink);
      }
      text(x,.86,z+1.69,['航行记录','星空资料','精灵档案'][b],3.7,.37,C.ink);
      block(x,z,7.2,3.9);
      // Display cases reproduce the three upper scenic fields in the source.
      box(x,4.55,rear+.37,7.1,3.65,.48,C.navy);
      const face=panel(x,4.55,rear+.64,6.55,3.1,0x163b42,{glow:.12});
      for(const s of [-1,1])box(x+s*3.5,4.55,rear+.69,.20,3.8,.48,green);
      if(b===0){
        ball(x-.75,4.7,rear+.87,.75,.75,.14,C.blue);
        ring([x-.75,4.7,rear+1.04],[0,0,1],1.02,.045,C.edge);
        for(let i=0;i<4;i++)box(x+1.1,3.8+i*.40,rear+.88,1.35,.14,.10,C.green,{glow:.2});
      }else if(b===1){
        for(const s of [-1,1]){
          ball(x+s*1.5,4.6,rear+.87,.62,.62,.24,s<0?C.amber:C.blue);
          ring([x+s*1.5,4.6,rear+1.15],[0,0,1],.85,.055,C.edge);
        }
        pipe([[x-1.5,4.6,rear+1.19],[x,5.4,rear+1.19],[x+1.5,4.6,rear+1.19]],.04,C.green);
      }else{
        for(let i=0;i<3;i++){
          box(x+(i-1)*1.75,4.55,rear+.86,1.22,1.9,.18,C.steel);
          for(let j=0;j<4;j++)box(x+(i-1)*1.75,4.0+j*.33,rear+.98,.82,.09,.04,C.green);
        }
      }
      glass(box(x,4.55,rear+1.23,6.6,3.2,.07,C.cyan),.10);
    }
    text(0,7.45,rear+.8,'资 料 室',8.4,.48,C.edge);
    // Fine-grained right-wall library racks, not a row of control consoles.
    for(let b=0;b<3;b++){
      const x=W/2-1.15,z=-6.7+b*6.2;
      box(x,3.25,z,1.45,6.5,5.05,C.navy);
      for(const dz of [-2.47,2.47])box(x-.85,3.25,z+dz,.22,6.6,.20,C.ivory);
      for(let r=0;r<5;r++)box(x-.82,.60+r*1.14,z,.26,.12,4.85,C.edge);
      for(let r=0;r<4;r++)for(let j=0;j<8;j++){
        const h=.64+((j+r)%3)*.10,zz=z+(j-3.5)*.54,yy=.66+r*1.14+h/2;
        box(x-.93,yy,zz,.47,h,.39,[green,C.blue,C.paper,C.steel][(j+2*r)%4]);
        box(x-1.18,yy+.02,zz,.025,.055,.28,C.edge);
      }
      block(x-.2,z,2.1,5.2);
    }
    box(W/2-1.9,6.85,1.1,.18,.82,5.0,C.ivory);
    text(W/2-2.02,6.85,1.1,'在线图书馆',4.5,.5,C.ink,{ry:-Math.PI/2});
    // Password decoder: a seated apparatus, not an ordinary reading chair.
    const cx=-7.9,cz=1.8;
    cyl(cx,.13,cz,1.7,1.9,.26,C.steel);
    cyl(cx,.55,cz,.5,.68,.65,C.navy);
    box(cx,.95,cz,2.0,.36,1.9,C.blue);
    box(cx,2.0,cz-.79,2.2,2.0,.40,C.edge,{rx:.12});
    box(cx,2.0,cz-.52,1.83,1.68,.18,C.blue,{rx:.12});
    for(let r=0;r<2;r++)for(let j=0;j<3;j++)box(cx+(j-1)*.46,1.76+r*.55,cz-.37,.37,.42,.10,C.cyan,{glow:.22});
    for(const s of [-1,1]){
      box(cx+s*1.07,1.27,cz+.2,.30,.65,1.55,C.steel);
      box(cx+s*1.07,1.65,cz+.15,.52,.14,1.65,C.blue);
      box(cx+s*1.07,1.74,cz+.55,.32,.06,.48,C.green,{glow:.15});
    }
    box(cx,2.92,cz-.65,1.55,.24,.62,C.blue);
    pipe([[cx+1,1.0,cz-.7],[cx+2.0,.3,cz-.7],[cx+2.0,.3,-5.5]],.09,C.steel);
    text(cx,.52,cz+1.05,'时空密码机',3.4,.4,C.edge);
    block(cx,cz,3.8,3.9);
    // Spherical archive index, based on the source's cyan globe on green-slot base.
    const gx=6.2,gz=.15;
    cyl(gx,.18,gz,2.18,2.45,.36,C.ink);
    cyl(gx,.63,gz,1.65,2.13,.60,C.steel);
    for(const y of [.47,.76,1.02])ring([gx,y,gz],[0,1,0],1.75+(1-y)*.32,.075,C.green);
    cyl(gx,1.19,gz,1.77,1.65,.22,C.ivory);
    cyl(gx,1.40,gz,1.42,1.63,.20,C.navy);
    glass(ball(gx,2.55,gz,1.47,1.47,1.47,C.cyan,{glow:.18}),.23);
    for(const n of [[0,1,0],[.62,.26,.70]])ring([gx,2.55,gz],n,1.44,.033,C.cyan);
    ring([gx,2.55,gz],[.86,.18,-.38],1.51,.052,C.edge);
    pipe([[gx-.8,2.25,gz+.2],[gx-.4,3.25,gz+.4],[gx+.3,2.7,gz+.7],[gx+.8,3.0,gz]],.055,C.green);
    for(const s of [-1,1])beam([gx+s*1.5,1.4,gz],[gx+s*.72,3.78,gz],.15,.15,C.edge);
    box(gx,3.99,gz,1.4,.20,.55,C.edge);
    screen(gx,1.35,gz+1.55,1.45,.5,C.cyan,-.5);
    text(gx,.70,gz+2.15,'星空索引',2.3,.33,C.edge);block(gx,gz,5.1,5.1);
    // Reading counter on the opposite wall, with side-facing inset terminals.
    box(-W/2+.75,1.03,3.1,1.2,2.05,10.2,C.ivory);
    for(const z of [-.2,3.1,6.4]){
      screen(-W/2+1.42,1.9,z,2.4,1.0,C.cyan,0,Math.PI/2);
      box(-W/2+1.56,1.23,z,.6,.11,2.6,C.navy);
      for(let i=0;i<3;i++)box(-W/2+1.82,1.32,z+(i-1)*.55,.18,.05,.30,C.edge);
    }
    block(-W/2+.95,3.1,1.9,10.5);
    // Coherent overhead frame and green aisle borders recall the 2012 interior.
    for(const z of [-8,-1,7]){
      beam([-13.3,H-.35,z],[13.3,H-.35,z],.25,.35,green);
      lightBar(0,H-.65,z,15,C.paper);
    }
    for(const x of [-1.8,1.8])floorLine(x,3,.12,16,C.green);
    for(const z of [4.5,8])floorLine(0,z,3.5,.09,C.edge);
    // Low entrance-side return stands stay well clear of the unique centre door.
    for(const x of [-9,9]){
      box(x,.70,9.1,3.2,1.4,1.2,C.ivory);
      box(x,1.44,9.1,3.45,.12,1.4,green);
      for(let i=0;i<3;i++)box(x+(i-1)*.75,1.62,9.1,.56,.22,.72,C.paper);
      block(x,9.1,3.7,1.6);
    }
  };

  cabinBuilders.observation=function(kit){
    const {T,root,box,cyl,ball,beam,pipe,torus,text,block,W,D,H,C,tube,ring,
      screen,keys,lightBar,floorLine}=scienceKit(kit);
    // G05: an upper-left / lower-right segmented instrument, a broad green
    // station in front, cyan circular stations, and stairs up to the right door.
    // The shared shell owns the real aft glazing. Do not mask it with sky cards.
    const pale=0xb7b5aa,stone=0x777d83,slate=0x444c65,dark=0x252b42;
    const a=[-4.1,3.8,-1.4],b=[-13.5,8.0,-5.2];
    const delta=b.map((q,i)=>q-a[i]),n=new T.Vector3(...delta).normalize();
    const u=new T.Vector3(0,1,0).cross(n).normalize(),v=n.clone().cross(u);
    const at=t=>a.map((q,i)=>q+delta[i]*t);
    const offset=(p,dir,d)=>p.map((q,i)=>q+dir.getComponent(i)*d);
    // Optical stacks, fasteners and encoder graduations are design completions;
    // G05 establishes their surrounding silhouette, not an optical prescription.
    function precisionMesh(geometry,p,axis,color,opts={}){
      const m=cyl(...p,1,1,1,color,opts);m.geometry=geometry;m.scale.set(1,1,1);
      m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),axis.clone().normalize());return m;
    }
    function annular(A,B,ra,rb,ia,ib,color,opts={}){
      const start=new T.Vector3(...A),end=new T.Vector3(...B),d=end.clone().sub(start),h=d.length()/2;
      const profile=[[ra,-h],[rb,h],[ib,h],[ia,-h],[ra,-h]].map(q=>new T.Vector2(...q));
      return precisionMesh(new T.LatheGeometry(profile,64),start.add(end).multiplyScalar(.5).toArray(),d,color,opts);
    }
    function lining(A,B,ra,rb){
      const start=new T.Vector3(...A),end=new T.Vector3(...B),d=end.clone().sub(start);
      const m=precisionMesh(new T.CylinderGeometry(rb,ra,d.length(),64,1,true),
        start.add(end).multiplyScalar(.5).toArray(),d,0x10161c,{roughness:.96,metalness:.03});
      m.material=m.material.clone();m.material.side=T.BackSide;return m;
    }
    function mirror(p,normal,r,depth){
      const profile=[0,.25,.50,.75,1].map(t=>new T.Vector2(r*t,-depth*(1-t*t)));
      const m=precisionMesh(new T.LatheGeometry(profile,64),p,normal,0x527a83,{roughness:.12,metalness:.88});
      m.material=m.material.clone();m.material.side=T.DoubleSide;
      tube(offset(p,normal,-depth-.035),offset(p,normal,-depth-.010),r*1.04,dark);
      ring(p,normal.toArray(),r*1.04,.022,stone);return m;
    }
    function opticGlass(p,normal,r){
      const m=annular(offset(p,normal,-.006),offset(p,normal,.006),r,r,0,0,0x71a8ae,
        {roughness:.10,metalness:.10,opacity:.20});
      m.material=m.material.clone();m.material.depthWrite=false;return m;
    }
    // Separate tapered castings and raised collars keep the silhouette legible
    // from floor level as well as from the game's high fixed camera.
    const seams=[0,.25,.53,.78,1];
    for(let i=0;i<4;i++){
      const t0=seams[i],t1=seams[i+1];
      const ra=1.45-.33*t0,rb=1.45-.33*t1;
      annular(at(t0),at(t1),ra,rb,ra-.10,rb-.10,i%2?pale:C.ivory);
      lining(at(t0),at(t1),ra-.11,rb-.11);
    }
    for(const t of seams){
      const p=at(t),r=1.45-.33*t;
      ring(p,delta,r+.06,.14,stone);
      ring(at(t+.012),delta,r+.04,.045,C.edge);
      if(t===.25||t===.78)for(let j=0;j<6;j++){
        const q=offset(offset(p,u,Math.sin(j*Math.PI/3)*(r+.12)),v,Math.cos(j*Math.PI/3)*(r+.12));
        ball(...q,.075,.075,.075,dark);
      }
    }
    // Open lips, recessed surfaces and genuinely perforated matte baffles.
    // Solid cylinders must not seal either opening in front of these components.
    annular(at(1),at(1.035),1.14,1.14,.97,.97,slate);
    lining(at(.94),at(1.035),1.029,.969);
    ring(at(1.035),delta,1.0,.10,C.edge);
    for(const t of [.12,.30,.62,.84,.94]){
      const r=1.45-.33*t-.105,hole=t>.8?.84:.79;
      annular(at(t-.0018),at(t+.0018),r,r,hole,hole,0x0b1016,{roughness:1,metalness:0});
    }
    annular(at(.708),at(.721),1.118,1.114,.80,.80,slate);
    mirror(at(.72),n,.81,.065);
    annular(at(-.045),at(.015),1.48,1.48,.395,.395,dark);
    ring(at(-.05),delta,1.39,.13,stone);
    annular(at(-.043),at(-.080),.44,.44,.34,.34,stone);
    lining(at(-.043),at(-.080),.334,.334);
    for(const t of [-.076,-.068])annular(at(t-.001),at(t+.001),.335,.335,.29,.29,0x0b1016,{roughness:1});
    const outward=n.clone().negate();
    annular(at(-.041),at(-.045),.397,.397,.265,.265,stone);
    mirror(at(-.044),outward,.275,.020);
    annular(at(-.0605),at(-.0615),.339,.339,.273,.273,dark);
    opticGlass(at(-.061),outward,.280);
    ring(at(-.081),delta,.382,.040,pale);
    // Finder, two mounting feet and raised longitudinal service strips.
    const fa=offset(at(.19),v,1.67),fb=offset(at(.95),v,1.38);
    tube(fa,fb,.17,stone);ring(fb,delta,.24,.055,C.edge);
    for(const t of [.23,.80])beam(offset(at(t),v,1.05),offset(at(t),v,1.58),.19,.20,stone);
    for(const s of [-1,1])beam(offset(at(.08),u,s*1.12),offset(at(.91),u,s*.94),.13,.13,slate);
    // Complete two-sided elevation mounting. The shaft is perpendicular to the
    // horizontal barrel direction, and actually intersects both bearing centres.
    const pivot=at(.46),cross=new T.Vector3(delta[2],0,-delta[0]).normalize();
    cyl(pivot[0],.20,pivot[2],3.05,3.55,.40,dark);
    cyl(pivot[0],.56,pivot[2],2.75,3.05,.32,stone);
    cyl(pivot[0],.91,pivot[2],2.25,2.60,.38,slate);
    ring([pivot[0],.77,pivot[2]],[0,1,0],2.78,.11,C.edge);
    for(let j=0;j<10;j++){
      const t=j*Math.PI/5;box(pivot[0]+Math.sin(t)*2.83,.50,pivot[2]+Math.cos(t)*2.83,.20,.14,.27,dark,{ry:t});
    }
    // Twin horizontal trunnions share an axis, with no steel through the lumen.
    for(const s of [-1,1])tube(offset(pivot,cross,s*1.25),offset(pivot,cross,s*2.55),.34,stone);
    function gear(p,normal,r,front){
      const g=new T.Group();root.add(g);g.position.fromArray(p);
      g.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),normal.clone().normalize());
      const add=m=>{g.add(m);return m;};
      add(cyl(0,0,0,r,r,.38,slate,{rx:Math.PI/2}));
      add(torus(0,0,.22,r*.76,.12,pale));
      add(cyl(0,0,.27,.51,.51,.19,stone,{rx:Math.PI/2}));
      add(torus(0,0,.39,.33,.09,front?C.cyan:C.edge));
      for(let j=0;j<20;j++){
        const t=j*Math.PI/10;
        add(box(Math.sin(t)*(r+.05),Math.cos(t)*(r+.05),0,.30,.27,.48,stone,{rz:-t}));
      }
      for(let j=0;j<6;j++){
        const t=j*Math.PI/3;
        add(box(Math.sin(t)*r*.46,Math.cos(t)*r*.46,.23,.16,r*.55,.10,stone,{rz:-t}));
        add(ball(Math.sin(t)*r*.88,Math.cos(t)*r*.88,.27,.07,.07,.04,C.edge));
      }
      if(front){
        add(torus(0,0,.435,r*.60,.018,C.edge));
        const stock=box(0,0,0,1,1,1,C.paper),ticks=new T.InstancedMesh(stock.geometry,stock.material,48);
        root.remove(stock);g.add(ticks);const mark=new T.Object3D();
        for(let j=0;j<48;j++){
          const t=j*Math.PI/24;mark.position.set(Math.sin(t)*r*.60,Math.cos(t)*r*.60,.46);
          mark.rotation.z=-t;mark.scale.set(j%4?.010:.018,j%4?.065:.13,.012);
          mark.updateMatrix();ticks.setMatrixAt(j,mark.matrix);
        }
        ticks.instanceMatrix.needsUpdate=true;ticks.frustumCulled=false;
        add(box(0,r*.30,.386,.66,.16,.04,dark));
        add(text(0,r*.30,.411,'0 / 90',.58,.12,C.edge));
      }
      return g;
    }
    for(const s of [-1,1]){
      const p=offset(pivot,cross,s*1.96),foot=[p[0],1.02,p[2]];
      box(foot[0],.94,foot[2],2.0,.48,2.0,stone);
      beam(foot,[p[0],p[1]-.1,p[2]],1.00,1.35,slate);
      beam([foot[0]-.72,1.10,foot[2]],[p[0]-.26,p[1]-.36,p[2]],.27,.40,pale);
      annular(offset(p,cross,-.25),offset(p,cross,.25),.77,.77,.35,.35,stone);
      for(const q of [-.24,.24])ring(offset(p,cross,q),cross.toArray(),.42,.035,dark);
      gear(offset(p,cross,s*.38),cross.clone().multiplyScalar(s),s>0?1.47:1.05,s>0);
      for(const x of [-.65,.65])for(const z of [-.65,.65]){
        cyl(foot[0]+x,1.205,foot[2]+z,.11,.11,.05,dark);
        cyl(foot[0]+x,1.255,foot[2]+z,.065,.065,.065,stone,{segments:6});
      }
      if(s>0){
        const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),cross);
        const radial=new T.Vector3(-.62,.56,0).applyQuaternion(q),read=offset(p,cross,.98).map((x,i)=>x+radial.getComponent(i));
        box(...read,.30,.22,.18,dark).quaternion.copy(q);
        const anchor=[p[0],p[1]-2.0,p[2]],elbow=offset(anchor,cross,1.0);
        beam(anchor,elbow,.14,.18,stone);beam(elbow,read,.14,.18,stone);
        ball(...offset(read,cross,.10),.04,.04,.025,C.green,{glow:.12});
      }
    }
    // Gasketed service covers lie tangentially on the front-visible barrel side.
    for(const t of [.18,.65]){
      const r=1.45-.33*t,g=new T.Group();root.add(g);
      g.position.fromArray(offset(at(t),u,r+.01));
      g.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(n.clone().negate(),v,u));
      const add=m=>{g.add(m);return m;};
      add(box(0,0,0,1.23,.87,.18,dark));add(box(0,0,.10,1.10,.74,.08,pale));
      for(const x of [-.47,.47])for(const y of [-.29,.29]){
        add(cyl(x,y,.16,.045,.045,.045,stone,{rx:Math.PI/2,segments:6}));
      }
      add(box(.34,0,.17,.06,.27,.065,stone));
      add(text(-.10,0,.148,'OPT / '+(t<.5?'A':'B'),.66,.12,dark));
    }
    // The source's lower blue eyepiece is extended down to a usable floor height.
    const low=at(-.035);
    pipe([[low[0],low[1]-.65,low[2]+.25],[-2.95,2.8,.1],[-2.95,1.85,1.15]],.22,stone);
    annular([-2.95,1.85,1.10],[-2.95,1.85,1.48],.36,.36,.225,.225,dark);
    lining([-2.95,1.85,1.10],[-2.95,1.85,1.48],.22,.22);
    torus(-2.95,1.85,1.52,.28,.09,pale);
    const eyeNormal=new T.Vector3(0,0,1);
    annular([-2.95,1.85,1.20],[-2.95,1.85,1.25],.227,.227,.181,.181,stone);
    mirror([-2.95,1.85,1.24],eyeNormal,.185,.012);
    annular([-2.95,1.85,1.385],[-2.95,1.85,1.405],.227,.227,.188,.188,dark);
    opticGlass([-2.95,1.85,1.39],eyeNormal,.195);
    ring([-2.95,1.85,1.45],[0,0,1],.204,.014,0x0b1016);
    // Overhead service routing leaves the walkable floor free of loose cables.
    pipe([[pivot[0]-2,1.25,pivot[2]],[pivot[0]-2,6.5,pivot[2]],[-17,6.5,-7],[-17,8.0,-7]],.13,C.red);
    block(-8.65,-3.25,12.7,9.9);
    // Broad mint display in a deep canted housing; unlike the generic small
    // console this is a principal foreground silhouette visible in G05.
    const gx=-11.8,gz=4.0,tilt=-.20;
    box(gx,.18,gz,7.25,.36,4.0,dark);
    box(gx,.82,gz-.5,6.45,1.20,2.6,slate);
    box(gx,2.35,gz-.45,6.6,3.55,.95,stone,{rx:tilt});
    const display=new T.Group();root.add(display);display.position.set(gx,2.39,gz+.08);display.rotation.x=tilt;
    const onDisplay=m=>{display.add(m);return m;};
    onDisplay(box(0,0,0,5.82,2.83,.12,0x79d49c,{glow:.25}));
    for(const s of [-1,1]){
      onDisplay(box(s*2.88,0,.085,.065,2.88,.07,dark));
      onDisplay(box(0,s*1.40,.085,5.82,.065,.07,dark));
    }
    for(let j=0;j<10;j++)onDisplay(box(-2.55+j*.56,0,.070,.008,2.48,.009,0x75c497));
    for(let j=0;j<5;j++)onDisplay(box(0,-1.03+j*.51,.070,5.40,.008,.009,0x75c497));
    onDisplay(torus(1.38,.02,.085,.73,.014,0xb1e2b7));
    onDisplay(torus(1.38,.02,.085,.29,.009,0xb1e2b7));
    onDisplay(box(1.38,.02,.085,1.70,.012,.010,0xb1e2b7));
    onDisplay(box(1.38,.02,.085,.012,1.70,.010,0xb1e2b7));
    // Readout legends illustrate the panel layout; they are not simulated data.
    onDisplay(text(-1.36,.92,.084,'TRACK  /  0042',1.80,.12,0x214c39));
    for(let j=0;j<3;j++){
      onDisplay(box(-1.35,.40-j*.36,.080,.9+j*.38,.035,.015,0xb5edbc));
      onDisplay(text(-1.40,-.86+j*.18,.084,['AZ  064.2','EL  021.5','LOCK'][j],1.65,.10,0x214c39));
    }
    for(const s of [-1,1]){
      box(gx+s*3.30,2.15,gz-.3,.55,3.55,1.20,slate,{rx:tilt,rz:-s*.08});
      box(gx+s*2.87,3.94,gz-.38,.24,.22,.18,C.edge);
    }
    box(gx,1.13,gz+1.14,6.6,.25,1.1,stone);
    box(gx,.76,gz+1.41,6.45,.98,.20,slate);
    for(const s of [-1,1])box(gx+s*3.12,.76,gz+1.02,.20,.98,.86,slate);
    // Twelve-centimetre keycaps and indexed hand controls give the broad
    // display station a human/Seer-scale working edge at 1.3 metres.
    box(gx,1.285,gz+1.14,2.20,.050,.66,dark);
    for(let row=0;row<3;row++)for(let col=0;col<10;col++){
      const x=gx+(col-4.5)*.185,z=gz+1.14+(row-1)*.18;
      box(x,1.330,z,.12,.040,.15,row===0&&col>7?C.green:stone);
      if(row===0)box(x,1.354,z,.035,.006,.035,C.edge);
    }
    for(const s of [-1,1]){
      const x=gx+s*2.45,z=gz+1.15;
      cyl(x,1.295,z,.36,.36,.060,dark);
      cyl(x,1.350,z,.29,.29,.080,stone);
      ring([x,1.395,z],[0,1,0],.235,.017,C.edge);
      box(x+s*.05,1.41,z-.089,.035,.027,.21,C.paper,{ry:-s*.48});
      for(let j=0;j<12;j++){
        const t=j*Math.PI/6;box(x+Math.sin(t)*.308,1.330,z+Math.cos(t)*.308,.022,.012,j%3?.043:.072,C.edge,{ry:t});
      }
    }
    for(let j=0;j<3;j++)box(gx,.65+j*.14,gz+1.52,4.6,.055,.06,dark);
    box(gx,.62,gz+1.54,1.55,.52,.09,stone);
    for(const s of [-1,1])box(gx+s*.53,.62,gz+1.63,.065,.24,.12,dark);
    box(gx,.75,gz+1.73,1.05,.055,.10,C.edge);
    text(gx,1.13,gz+1.71,'观测记录',1.70,.12,C.edge);block(gx,gz,7.6,4.3);
    // Smaller round station directly beside the staircase, as in the source.
    cyl(6.0,.20,-7.0,2.05,2.40,.40,dark);
    cyl(6.0,.88,-7.0,2.35,1.90,1.0,0x9c775e);
    cyl(6.0,1.42,-7.0,2.42,2.42,.16,stone);
    cyl(6.0,1.53,-7.0,1.85,1.85,.07,0x32c5d8,{glow:.40});
    ring([6,1.59,-7],[0,1,0],1.25,.06,C.cyan);
    box(6,2.30,-8.3,2.4,1.55,.65,slate,{rx:-.12});
    for(let j=0;j<3;j++){
      const y=1.85+j*.39,z=-8.3+.325/Math.cos(-.12)+Math.tan(-.12)*(y-2.30)+.055;
      box(6,y,z,1.85,.23,.08,C.amber,{rx:-.12,glow:.18});
    }
    block(6,-7.1,5.1,5.2);
    // A closed destination door and the stair below it restore G05's relation.
    // The existing single floor-height exit remains the only connected route.
    const dx=12.6,doorZ=-11.6;
    box(dx,1.05,-10.05,6.6,2.10,3.6,slate);
    box(dx,2.15,-10.05,6.6,.15,3.7,stone);
    box(dx,4.70,doorZ-.42,6.0,5.2,.7,slate);
    box(dx,4.30,doorZ,3.7,4.25,.28,dark);
    for(const s of [-1,1]){
      box(dx+s*.91,4.30,doorZ+.19,1.75,4.10,.18,0x635c58);
      box(dx+s*1.64,4.30,doorZ+.33,.16,3.85,.11,0x9c947e);
      beam([dx+s*2.50,2.10,doorZ+.12],[dx+s*2.50,6.30,doorZ+.12],.60,.68,pale);
      beam([dx+s*2.50,6.30,doorZ+.12],[dx+s*1.6,7.12,doorZ+.12],.60,.68,pale);
    }
    box(dx,7.10,doorZ+.12,3.2,.56,.68,pale);
    box(dx,6.42,doorZ+.37,2.65,.66,.14,C.edge);
    text(dx,6.42,doorZ+.46,'机械室',2.3,.45,dark);
    box(dx,4.25,doorZ+.31,.10,3.80,.06,dark);
    box(dx+1.13,3.86,doorZ+.35,.34,.32,.10,C.amber,{glow:.22});
    text(dx,2.76,doorZ+.35,'锁闭',1.35,.30,C.edge);
    for(let j=0;j<7;j++){
      const top=.30*(j+1),z=-3.55-j*.72;
      box(dx,top/2,z,3.45,top,.76,stone);
      box(dx,top+.024,z+.30,3.05,.035,.12,C.green,{glow:.28});
      for(const s of [-1,1])box(dx+s*1.96,top/2+.15,z,.44,top+.30,.78,0x9a8774);
    }
    for(const s of [-1,1])beam([dx+s*1.96,.58,-3.2],[dx+s*1.96,2.60,-8.25],.18,.25,pale);
    // The whole raised exhibit is blocked: no traversable stair/portal is implied.
    block(dx,-7.8,6.9,9.8);
    // Low, shallow star-chart projection at front-right; G05 does not establish
    // a full enclosed globe, so the earlier opaque-looking ball is removed.
    const sx=9.4,sz=5.1;
    cyl(sx,.15,sz,3.35,3.65,.30,dark);
    cyl(sx,.71,sz,2.75,3.2,1.0,slate);
    cyl(sx,1.29,sz,3.25,2.85,.22,stone);
    cyl(sx,1.43,sz,2.70,2.70,.07,0x227f9d,{glow:.28});
    for(const r of [1.0,1.85,2.65])ring([sx,1.50,sz],[0,1,0],r,.055,C.cyan);
    for(let j=0;j<5;j++){
      const t=j*1.7,p=[sx+Math.sin(t)*1.65,1.64+(j%3)*.20,sz+Math.cos(t)*1.65];
      ball(...p,.09,.09,.09,C.cyan,{glow:.48});
      if(j<4)beam(p,[sx+Math.sin(t+1.7)*1.65,1.64+((j+1)%3)*.20,sz+Math.cos(t+1.7)*1.65],.025,.025,C.cyan);
    }
    screen(sx,1.47,sz+2.36,1.85,.50,C.cyan,-.5);keys(sx,1.50,sz+2.73,1.6);
    block(sx,sz,7.4,7.4);
    // Perimeter casings and suspended cable trays echo the heavy blue-grey room.
    for(const z of [-8,0,8]){
      box(-W/2+1.0,2.25,z,1.5,4.5,3.8,slate);
      box(-W/2+1.81,2.1,z,.16,3.35,2.9,stone);
      for(let j=0;j<4;j++)box(-W/2+1.91,1.10+j*.39,z,.06,.10,2.10,dark);
      block(-W/2+1.0,z,1.85,3.9);
    }
    pipe([[-18,6.8,9],[-18,6.8,-8],[-17,8.8,-10],[-11,8.8,-10]],.16,stone);
    for(const z of [-8,1,9]){
      beam([-17,H-.45,z],[17,H-.45,z],.30,.42,slate);
      lightBar(0,H-.75,z,12,C.edge);
    }
    // The centre spine remains open for the player and NPC collision system.
    for(const x of [-1.8,1.8])floorLine(x,3.5,.09,17,C.blue);
    for(const z of [7.0,10.5]){
      beam([-.6,.045,z+.35],[0,.045,z],.09,.05,C.amber);
      beam([0,.045,z],[.6,.045,z+.35],.09,.05,C.amber);
    }
  };
}
