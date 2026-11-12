/* Metres, +Y up and -Z forward. The origin is the plane of the deployed
   landing pads. The passenger, instruments, hatch and exterior share this root. */
function createLandingShuttle(T) {
  const root=new T.Group();
  root.name='SEER L-01 · 载人登陆艇';
  const layout=Object.freeze({
    floorY:1.05,entrance:[0,1.05,4.85],seat:[0,1.05,-2.75],eye:[0,2.12,-2.75],
    rampEnd:[0,0,8.65],companion:[1.02,1.05,-1.40],
    feet:[[0,0,-4.3],[-2.93,0,2.75],[2.93,0,2.75]]
  });
  const staticBody=new T.Group();
  root.add(staticBody);
  const geometries=new Set(),materials=new Set(),textures=new Set(),controls=[];
  const trackGeometry=g=>{geometries.add(g);return g;};
  const color=hex=>new T.Color(hex).convertSRGBToLinear();
  function paint(hex,metal=.18,rough=.48,glow=0) {
    const c=color(hex);
    const m=new T.MeshStandardMaterial({color:c,metalness:metal,roughness:rough,
      emissive:glow?c:0,emissiveIntensity:glow,side:T.DoubleSide});
    materials.add(m);return m;
  }
  const cream=paint(0xe9dfc6,.30,.39),white=paint(0xd4dfdf,.31,.35),
    gold=paint(0xf1a333,.40,.36),blue=paint(0x284d6e,.40,.39),edge=paint(0x253240,.48,.38),
    alloy=paint(0x80949b,.65,.34),rubber=paint(0x2d3440,.17,.76),
    lining=paint(0x8299a1,.16,.56),tile=paint(0x465b65,.25,.64),
    cyan=paint(0x77e7ef,.15,.30,.75),amber=paint(0xffba49,.16,.34,.76),
    red=paint(0xfc7266,.16,.37,.82),green=paint(0x80efd7,.16,.35,.71);
  const glass=paint(0x70c7dc,.09,.13);
  glass.transparent=true;glass.opacity=.105;glass.depthWrite=false;
  const cube=trackGeometry(new T.BoxGeometry(1,1,1));
  const barrel=trackGeometry(new T.CylinderGeometry(1,1,1,16));
  const orb=trackGeometry(new T.SphereGeometry(1,16,10));
  const plane=trackGeometry(new T.PlaneGeometry(1,1));
  const fixedPanels=new Map(),windowPanes=new Map();
  const vector=(x,y,z)=>new T.Vector3(x,y,z);
  function put(g,m,p,x=0,y=0,z=0,sx=1,sy=1,sz=1){
    const mesh=new T.Mesh(g,m);
    mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);
    mesh.castShadow=!(m.transparent||m.isMeshBasicMaterial);mesh.receiveShadow=true;
    p.add(mesh);return mesh;
  }
  const box=(p,m,x,y,z,w,h,d)=>put(cube,m,p,x,y,z,w,h,d);
  const ellipse=(p,m,x,y,z,w,h,d)=>put(orb,m,p,x,y,z,w,h,d);
  function rod(p,m,a,b,r){
    const direction=b.clone().sub(a);
    const c=a.clone().add(b).multiplyScalar(.5);
    const mesh=put(barrel,m,p,c.x,c.y,c.z,r,direction.length(),r);
    mesh.quaternion.setFromUnitVectors(vector(0,1,0),direction.normalize());return mesh;
  }
  function panel(m,points,pane=null){
    // Sort the three transparent glazing assemblies by their own centres.
    // Opaque hull and console faces need only one batch per coating.
    const bins=pane?windowPanes:fixedPanels,key=pane||m;
    if(!bins.has(key))bins.set(key,[]);
    const verts=bins.get(key);
    for(let i=1;i+1<points.length;i++)verts.push(...points[0],...points[i],...points[i+1]);
  }
  // A wing or fin is a closed, tapered solid. Both faces have actual thickness.
  function plate(m,upper,lower,faces=null){
    if(faces){
      for(const face of faces){
        panel(m,face.map(i=>upper[i]));panel(m,face.slice().reverse().map(i=>lower[i]));
      }
    }else{panel(m,upper);panel(m,lower.slice().reverse());}
    for(let i=0;i<upper.length;i++){
      const j=(i+1)%upper.length;
      panel(m,[upper[i],lower[i],lower[j],upper[j]]);
    }
  }
  function screenTexture(canvas){
    const tex=new T.CanvasTexture(canvas);tex.encoding=T.sRGBEncoding;textures.add(tex);
    const mat=new T.MeshBasicMaterial({map:tex,side:T.FrontSide,toneMapped:false});
    materials.add(mat);return mat;
  }
  // Screen printing for the hull, sill and switches shares a single atlas.
  const prints=document.createElement('canvas');prints.width=prints.height=512;
  const ink=prints.getContext('2d');
  ink.fillStyle='#203c4b';ink.fillRect(0,0,512,512);
  function placard(y,title,caption){
    ink.fillStyle='#77d9d6';ink.fillRect(8,y+8,7,148);
    ink.fillStyle='#f0ead7';ink.font='600 63px "Microsoft YaHei",sans-serif';ink.fillText(title,28,y+82);
    ink.fillStyle='#e8b451';ink.font='31px sans-serif';ink.fillText(caption,28,y+137,455);
  }
  placard(0,'L-01','SEER  /  ORBITAL LANDER');
  placard(170,'登 陆 艇','SEER L-01  /  REAR AIRLOCK');
  const keys=[['auto','航线',cyan],['manual','接管',amber],['view','视角',green]];
  ink.textAlign='center';ink.font='600 48px "Microsoft YaHei",sans-serif';ink.fillStyle='#f1f4e9';
  keys.forEach(([,label],i)=>ink.fillText(label,170*i+85,450));
  const printMaterial=screenTexture(prints);
  function printTile(x,y,w,h){
    const g=trackGeometry(plane.clone()),uv=g.getAttribute('uv');
    for(let i=0;i<uv.count;i++)uv.setXY(i,(x+uv.getX(i)*w)/512,1-(y+(1-uv.getY(i))*h)/512);
    return g;
  }

  // Cross-sections leave the cockpit canopy and the cabin's side windows
  // transparent. The rear frame is built around an open, human-sized doorway.
  const stations=[
    [-6.48,.28,.97,1.20,1.38,1.47],[-5.22,1.02,.78,1.14,1.48,1.61],
    [-4.90,1.20,.70,1.11,1.52,1.72],[-2.16,1.81,.63,1.13,1.79,3.46],
    [-1.76,1.92,.60,1.15,1.88,3.65],[-.22,2.02,.58,1.16,1.90,3.72],
    [1.18,2.02,.59,1.16,1.90,3.72],[2.92,1.94,.61,1.15,1.89,3.68],
    [4.48,1.77,.67,1.16,1.87,3.61],[5.55,1.55,.75,1.16,1.84,3.38]
  ];
  const rings=stations.map(([z,w,bottom,chine,sill,top])=>[
    [-w*.73,bottom,z],[w*.73,bottom,z],[w,chine,z],[w,sill,z],[w*.84,top-.20,z],
    [w*.53,top,z],[-w*.53,top,z],[-w*.84,top-.20,z],[-w,sill,z],[-w,chine,z]
  ]);
  for(let i=0;i<rings.length-1;i++){
    for(let j=0;j<10;j++){
      const k=(j+1)%10;
      const canopy=i===2&&j>=3&&j<=7;
      const window=(i===4||i===5||i===6)&&(j===3||j===7);
      const m=canopy||window?glass:j===0?edge:j===1||j===8?blue:j===2||j===9?white:cream;
      panel(m,[rings[i][j],rings[i+1][j],rings[i+1][k],rings[i][k]],canopy?'windscreen':window?j:null);
    }
  }
  panel(white,rings[0]);
  for(const i of [2,3,4,5,6,7]){
    const r=rings[i];
    for(let j=3;j<=7;j++){
      if(i!==2&&i!==3&&j!==3&&j!==7)continue;
      rod(staticBody,i===2?gold:edge,vector(...r[j]),vector(...r[j+1]),i===3?.058:.038);
    }
  }
  for(const j of [3,4,7,8])rod(staticBody,edge,vector(...rings[2][j]),vector(...rings[3][j]),.044);
  for(const side of [-1,1]){
    const j=side<0?8:3;
    for(let i=4;i<8;i++)rod(staticBody,gold,vector(...rings[i][j]),vector(...rings[i+1][j]),.045);
  }
  // A raised dorsal spine terminates before the cockpit glass.
  box(staticBody,blue,0,3.70,1.28,.76,.18,4.95);
  box(staticBody,alloy,0,3.83,.14,.53,.14,1.54);
  for(let i=0;i<9;i++)box(staticBody,edge,0,3.91,-.48+i*.15,.46,.032,.055);
  ellipse(staticBody,white,0,3.84,2.20,.39,.19,.49);
  ellipse(staticBody,cyan,0,4.005,2.20,.12,.038,.15);
  for(const s of [-1,1]){
    for(const z of [-.83,.48,1.79,3.10]){
      const cover=box(staticBody,white,s*.57,3.717,z,.33,.052,1.09);
      cover.rotation.z=-s*.025;
      for(const offset of [-.37,.37])box(staticBody,edge,s*.66,3.748,z+offset,.15,.019,.035);
    }
    rod(staticBody,alloy,vector(s*1.1,1.53,-4.91),vector(s*1.72,1.72,-2.11),.085);
    const optic=ellipse(staticBody,edge,s*.84,1.41,-5.16,.16,.13,.17);
    optic.rotation.y=s*.29;
    ellipse(staticBody,cyan,s*.84,1.43,-5.30,.094,.056,.03);
  }

  // Forked swept wings carry two independent engine nacelles. The light and
  // dark panels are separate pieces with narrow expansion joints.
  const wingStencil=printTile(0,0,512,166);
  const fanProfile=[[0,.05],[.27,.12],[.45,.30],[.53,.60],[.52,1.53],
    [.63,1.71],[.68,2.78],[.64,3.25],[.54,3.42],[.48,3.56],[0,3.56]];
  const nacelleGeo=trackGeometry(new T.LatheGeometry(fanProfile.map(([r,z])=>new T.Vector2(r,z)),28));
  const exhaustMat=new T.MeshBasicMaterial({color:color(0x65f4ff),transparent:true,opacity:.46,
    depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,side:T.DoubleSide});
  materials.add(exhaustMat);
  const plumeGeo=trackGeometry(new T.ConeGeometry(1,1,22,1,true));
  const plumes=[],pads=[];
  for(const side of [-1,1]){
    const wing=[[1.43,-2.18,1.67],[2.14,-1.79,1.63],[5.40,2.77,1.26],[5.23,3.57,1.23],
      [3.26,3.24,1.42],[2.24,4.39,1.48],[1.46,4.28,1.55]];
    const upper=wing.map(([x,z,y])=>[side*x,y,z]);
    const lower=upper.map(([x,y,z])=>[x,y-(Math.abs(x)>4.5?.14:.32),z]);
    // Split the concave wing at its root to keep both shoulders well defined.
    const indices=[[0,1,2,3,4],[0,4,5,6]];
    plate(cream,upper,lower,indices);
    const stripe=[[2.05,-1.38,1.692],[2.26,-1.34,1.656],[5.24,2.84,1.30],[4.88,2.74,1.34]];
    panel(gold,stripe.map(([x,z,y])=>[side*x,y,z]));
    const tip=[[4.66,2.13,1.37],[5.38,2.77,1.28],[5.22,3.56,1.25],[4.63,3.46,1.35]];
    panel(blue,tip.map(([x,z,y])=>[side*x,y,z]));
    ellipse(staticBody,side<0?red:green,side*5.31,1.29,2.94,.075,.062,.20);
    const engine=put(nacelleGeo,white,staticBody,side*2.58,1.78,1.46);
    engine.rotation.x=Math.PI/2;
    for(const [z,r,h,m] of [[3.28,.66,.17,gold],[4.32,.695,.20,blue],[4.74,.57,.18,alloy],
      [4.92,.58,.17,edge],[5.03,.49,.09,blue],[5.08,.395,.06,cyan],[5.12,.26,.03,edge],[5.14,.17,.018,cyan]]){
      const collar=put(barrel,m,staticBody,side*2.58,1.78,z,r,h,r);
      collar.rotation.x=Math.PI/2;
    }
    for(let k=0;k<12;k++){
      const a=k*Math.PI/6;
      const louver=box(staticBody,alloy,side*2.58+.53*Math.cos(a),1.78+.53*Math.sin(a),4.87,.10,.075,.30);
      louver.rotation.z=a;
      const vane=box(staticBody,alloy,side*2.58+.316*Math.cos(a),1.78+.316*Math.sin(a),5.132,.134,.030,.042);
      vane.rotation.z=a+.39;
      // Raised petal overlaps and actuator rods articulate the nozzle collar.
      const nacelleX=side*2.58,petal=(r,b,z)=>vector(nacelleX+r*Math.cos(b),1.78+r*Math.sin(b),z);
      panel(k%3===0?edge:alloy,[petal(.626,a-.21,4.72),petal(.626,a+.21,4.72),
        petal(.532,a+.17,5.105),petal(.531,a-.15,5.105)].map(p=>p.toArray()));
      if(k%2===0)rod(staticBody,edge,petal(.663,a,4.47),petal(.608,a,4.83),.023);
    }
    const plume=put(plumeGeo,exhaustMat,root,side*2.58,1.78,5.16,.37,1,.37);
    plume.rotation.x=Math.PI/2;plumes.push(plume);plume.castShadow=false;
    // Twin canted stabilizers straddle the rear hatch, preserving its approach.
    const fin=[[side*2.08,2.15,1.71],[side*2.81,3.92,3.18],[side*2.78,4.07,4.10],
      [side*2.16,2.25,4.41]];
    plate(blue,fin,fin.map(([x,y,z])=>[x-side*.15,y,z]));
    panel(gold,[[side*2.70,3.73,2.98],[side*2.82,3.94,3.18],[side*2.79,4.09,4.1],[side*2.70,3.83,4.16]]);
    const badge=put(wingStencil,printMaterial,staticBody,side*2.029,1.56,.60,1.31,.42,1);
    badge.rotation.y=side*Math.PI/2;
    // Small overlapping shoulder panels tie the lower fuselage to its wing.
    const shoulder=[[1.55,-2.75,1.57],[2.03,-1.61,1.73],[2.43,.40,1.64],
      [2.37,1.61,1.58],[1.90,.43,1.65]];
    const shoulderTop=shoulder.map(([x,z,y])=>[side*x,y,z]);
    plate(white,shoulderTop,shoulderTop.map(([x,y,z])=>[x,y-.085,z]));
    for(const z of [2.73,3.01,3.29,3.57]){
      const rib=box(staticBody,blue,side*1.873,1.63,z,.068,.24,.11);
      rib.rotation.x=-.34;
    }
  }

  // One level deck runs from the rear loading threshold to the standing
  // pilot cradle. Keep the raised seats, locker feet and rails out of its aisle.
  box(staticBody,edge,0,.925,.51,3.17,.25,10.07);
  for(let i=0;i<11;i++){
    const z=-4.07+i*.89,w=z<-2.6?2.46:z>4?2.55:3.06;
    box(staticBody,tile,0,1.041,z,w,.018,.86);
    for(const s of [-1,1])box(staticBody,i%3?alloy:cyan,s*.76,1.055,z,.027,.012,.69);
  }
  for(const s of [-1,1]){
    box(staticBody,lining,s*1.69,1.52,.77,.27,.76,5.25);
    box(staticBody,alloy,s*1.58,1.86,.73,.085,.085,5.18);
    for(const z of [.05,1.56]){
      box(staticBody,edge,s*1.44,1.29,z,.58,.40,.92);
      box(staticBody,blue,s*1.48,1.57,z,.54,.19,.84);
      box(staticBody,blue,s*1.70,1.97,z,.14,.64,.85);
      box(staticBody,gold,s*1.59,2.03,z,.055,.45,.095);
      // Padded bolsters, two stowage catches and the recessed grab bar
      // all lie on the seat side of the central passage.
      for(const end of [-1,1]){
        ellipse(staticBody,blue,s*1.46,1.61,z+end*.34,.245,.096,.105);
        box(staticBody,alloy,s*1.39,1.47,z+end*.34,.27,.032,.083);
        rod(staticBody,edge,vector(s*1.59,2.30,z+end*.24),vector(s*1.68,2.29,z+end*.31),.025);
      }
      rod(staticBody,alloy,vector(s*1.59,2.30,z-.24),vector(s*1.59,2.30,z+.24),.029);
    }
    box(staticBody,lining,s*1.37,2.04,3.61,.41,1.96,1.08);
    box(staticBody,edge,s*1.145,2.04,3.61,.028,1.78,.93);
    box(staticBody,blue,s*1.121,2.05,3.61,.025,1.64,.83);
    box(staticBody,amber,s*1.103,2.52,3.61,.026,.036,.60);
    rod(staticBody,alloy,vector(s*1.095,1.82,3.83),vector(s*1.095,2.16,3.83),.029);
    box(staticBody,edge,s*.78,3.47,1.03,.29,.10,4.93);
    for(const z of [-.59,.47,1.55,2.63]){
      box(staticBody,cyan,s*.78,3.405,z,.14,.025,.61);
      rod(staticBody,lining,vector(s*1.86,1.84,z),vector(s*1.51,3.43,z),.065);
    }
  }
  // The Seer robot rolls its feet onto a piloting pad; no human-height seat
  // back obstructs its head or the view through the forward sloped glass.
  const deskTop=[[-.82,1.46,-4.40],[.82,1.46,-4.40],[.90,1.48,-4.21],[.80,1.39,-3.87],
    [-.80,1.39,-3.87],[-.90,1.48,-4.21]];
  plate(blue,deskTop,deskTop.map(([x,y,z])=>[x*.86,y-.23,z-.04]));
  box(staticBody,edge,0,1.07,-2.73,1.22,.034,1.00);
  for(const s of [-1,1]){
    box(staticBody,gold,s*.59,1.094,-2.73,.038,.014,.92);
    box(staticBody,lining,s*.72,1.35,-3.14,.21,.55,.56);
    const boot=put(barrel,rubber,staticBody,s*.72,1.62,-3.14,.091,.052,.10);
    boot.rotation.x=-.28;
    rod(staticBody,edge,vector(s*.72,1.54,-3.09),vector(s*.72,1.75,-3.19),.047);
    ellipse(staticBody,blue,s*.72,1.77,-3.18,.10,.061,.12);
  }
  const overhead=new T.PointLight(0xcde6ef,1.1,8,1.4),reading=new T.PointLight(0xffe1b7,.56,4.1,1.25);
  overhead.position.set(0,3.30,1.24);reading.position.set(.6,2.96,-2.22);root.add(overhead,reading);
  const display=document.createElement('canvas');display.width=768;display.height=256;
  const instrument=screenTexture(display);
  const trimAngle=-.30,cosTrim=Math.cos(trimAngle),sinTrim=Math.sin(trimAngle);
  const trimPoint=(x,y,z)=>[x,1.728+y*cosTrim-z*sinTrim,-4.17+y*sinTrim+z*cosTrim];
  function bezelRing(w,h,c,z){
    return [[-w+c,-h],[w-c,-h],[w,-h+c],[w,h-c],[w-c,h],[-w+c,h],[-w,h-c],[-w,-h+c]]
      .map(([x,y])=>trimPoint(x,y,z));
  }
  const bezelRings=[bezelRing(.83,.254,.071,-.112),bezelRing(.853,.268,.064,-.035),
    bezelRing(.805,.248,.052,.064),bezelRing(.753,.207,.023,.060),bezelRing(.739,.197,.015,.034)];
  const trimPaint=[blue,alloy,edge,rubber];
  for(const [i,finish] of trimPaint.entries()){
    const back=bezelRings[i],front=bezelRings[i+1];
    for(let j=0;j<back.length;j++){
      const k=(j+1)%back.length;
      panel(finish,[back[j],back[k],front[k],front[j]]);
    }
  }
  panel(edge,bezelRings[0].slice().reverse());
  const face=put(plane,instrument,staticBody,...trimPoint(0,0,.032),1.485,.397,1);face.rotation.x=trimAngle;
  const fastener=trackGeometry(new T.CylinderGeometry(1,1,1,6));
  for(const side of [-1,1]){
    for(const row of [-1,1]){
      const bolt=put(fastener,alloy,staticBody,...trimPoint(side*.773,row*.174,.063),.017,.010,.017);
      bolt.rotation.x=Math.PI/2+trimAngle;
    }
    // Vented shrouds join the coaming to the port and starboard control cradles.
    const cover=[[-.10,1.35,-3.68],[.09,1.35,-3.68],[.11,1.58,-4.04],[.057,1.62,-4.23],[-.10,1.60,-4.23]]
      .map(([x,y,z])=>[side*(.99+x),y,z]);
    plate(edge,cover,cover.map(([x,y,z])=>[x,y-.091,z]));
    for(let j=0;j<4;j++){
      const vent=box(staticBody,alloy,.99*side,1.414+.039*j,-3.78-j*.063,.132,.021,.022);
      vent.rotation.x=.55;
    }
  }
  const ctx=display.getContext('2d');
  const actionPanel=box(staticBody,edge,0,1.373,-4.012,1.40,.084,.17);actionPanel.rotation.x=-.30;
  for(const [i,[act,name,m]] of keys.entries()){
    const x=(i-1)*.435,angle=-.66;
    const key=box(root,m,x,1.464,-3.932,.356,.123,.085);
    key.rotation.x=angle;key.name=name;
    key.userData.shuttleAction=act;controls.push(key);
    const print=put(printTile(i*170,370,170,124),printMaterial,staticBody,x,1.464-.044*Math.sin(angle),
      -3.932+.044*Math.cos(angle),.299,.107,1);
    print.rotation.x=angle;
  }

  // End rings form the pressure bulkhead, with a two-metre clear opening.
  for(const s of [-1,1]){
    box(staticBody,cream,s*1.26,2.12,5.53,.52,2.12,.15);
    box(staticBody,edge,s*1.06,2.13,5.44,.14,2.19,.22);
    box(staticBody,cyan,s*1.051,2.15,5.579,.042,1.77,.034);
  }
  box(staticBody,white,0,3.31,5.54,2.50,.21,.20);
  box(staticBody,edge,0,.90,5.55,2.43,.29,.25);
  put(printTile(0,170,512,166),printMaterial,staticBody,0,3.25,5.652,1.51,.32,1);
  for(const s of [-1,1]){
    rod(staticBody,rubber,vector(s*.995,1.105,5.615),vector(s*.995,3.115,5.615),.032);
    rod(staticBody,rubber,vector(s*.995,3.115,5.615),vector(s*.90,3.198,5.615),.032);
    for(const y of [1.47,2.76]){
      box(staticBody,alloy,s*1.14,y,5.622,.14,.19,.064);
      box(staticBody,edge,s*1.14,y,5.659,.062,.10,.019);
    }
  }
  rod(staticBody,rubber,vector(-.90,3.198,5.615),vector(.90,3.198,5.615),.032);
  const rampHinge=new T.Group();rampHinge.position.set(0,layout.floorY,5.55);root.add(rampHinge);
  const rampTip=new T.Group();rampHinge.add(rampTip);
  const rampActuators=[];
  const fixedRamp=2.21,rampRun=layout.rampEnd[2]-rampHinge.position.z;
  const fullRamp=Math.hypot(rampRun,layout.floorY),travel=fullRamp-fixedRamp;
  box(rampHinge,blue,0,-.115,fixedRamp/2,1.965,.23,fixedRamp);
  box(rampHinge,tile,0,-.011,fixedRamp/2,1.82,.022,fixedRamp-.04);
  box(rampTip,alloy,0,-.084,travel/2,1.80,.138,travel+.012);
  for(let i=1;i<10;i++)box(rampHinge,alloy,0,.006,i*.21,1.59,.012,.045);
  for(let i=1;i<5;i++)box(rampTip,rubber,0,-.008,i*.22,1.56,.015,.044);
  for(const s of [-1,1]){
    const shoulder=vector(s*1.13,2.87,4.02),lug=vector(s*.948,-.07,1.08);
    box(staticBody,edge,shoulder.x,shoulder.y,shoulder.z,.21,.205,.27);
    ellipse(staticBody,gold,shoulder.x,shoulder.y,shoulder.z+.085,.103,.103,.105);
    ellipse(rampHinge,alloy,lug.x,lug.y,lug.z,.09,.095,.092);
    rampActuators.push({shoulder,lug,sleeve:put(barrel,edge,root),shaft:put(barrel,alloy,root)});
    box(rampHinge,gold,s*.916,.012,fixedRamp/2,.090,.018,fixedRamp-.07);
    box(rampTip,gold,s*.845,-.009,travel/2,.055,.019,travel-.03);
    box(rampHinge,cream,s*.59,-.240,fixedRamp/2,.52,.05,1.57);
    const outer=put(barrel,edge,staticBody,s*.93,layout.floorY-.065,5.55,.095,.21,.095);
    outer.rotation.z=Math.PI/2;
    const knuckle=put(barrel,alloy,rampHinge,s*.72,-.065,0,.090,.19,.090);
    knuckle.rotation.z=Math.PI/2;
    for(const z of [.29,1.82])box(rampHinge,cyan,s*.918,.026,z,.046,.012,.16);
    box(rampTip,alloy,s*.812,-.115,travel*.52,.082,.08,travel*.96);
  }
  // Telescoping gear, rotating around its trunnion. The shoes stay level.
  for(const [fx,,fz] of layout.feet){
    const fore=fx===0,dir=fore?-1:1;
    const pivot=new T.Group(),mountZ=fz-dir*.51;
    pivot.position.set(fx,1.10,mountZ);root.add(pivot);
    box(staticBody,edge,fx,1.105,mountZ,.61,.28,.61);
    const pin=put(barrel,alloy,staticBody,fx,1.10,mountZ,.12,.64,.12);pin.rotation.z=Math.PI/2;
    const joint=vector(0,-.52,dir*.23),end=vector(0,-1.03,dir*.51);
    rod(pivot,edge,vector(0,0,0),joint,.123);
    rod(pivot,alloy,joint,end,.09);
    rod(pivot,gold,vector(.2,-.04,dir*.10),vector(.10,-.77,dir*.41),.044);
    const foot=new T.Group();foot.position.copy(end);pivot.add(foot);
    box(foot,rubber,0,-.014,0,.74,.112,1.09);
    box(foot,alloy,0,.065,0,.64,.075,.89);
    for(const s of [-1,1])box(foot,gold,s*.275,.110,0,.045,.02,.68);
    pads.push({pivot,foot,dir});
  }

  // Fixed faces with a common coating can be rendered in one draw. Moving
  // hinges, landing shoes, exhaust and the three pickable controls stay separate.
  function combine(group){
    const bins=new Map();
    for(const obj of group.children.slice()){
      if(!obj.isMesh||obj.material.transparent)continue;
      obj.updateMatrix();
      const g=obj.geometry,indices=g.index,pos=g.getAttribute('position'),norm=g.getAttribute('normal'),uv=g.getAttribute('uv');
      const normals=new T.Matrix3().getNormalMatrix(obj.matrix);
      let bin=bins.get(obj.material);
      if(!bin){bin={position:[],normal:[],uv:obj.material.map?[]:null,indices:[]};bins.set(obj.material,bin);}
      const base=bin.position.length/3,p=new T.Vector3();
      for(let i=0;i<pos.count;i++){
        p.fromBufferAttribute(pos,i).applyMatrix4(obj.matrix);bin.position.push(p.x,p.y,p.z);
        p.fromBufferAttribute(norm,i).applyMatrix3(normals).normalize();bin.normal.push(p.x,p.y,p.z);
        if(bin.uv)bin.uv.push(uv?uv.getX(i):0,uv?uv.getY(i):0);
      }
      for(let i=0;i<(indices?indices.count:pos.count);i++)bin.indices.push(base+(indices?indices.getX(i):i));
      group.remove(obj);
    }
    for(const [m,bin] of bins){
      const g=trackGeometry(new T.BufferGeometry());
      g.setAttribute('position',new T.Float32BufferAttribute(bin.position,3));
      g.setAttribute('normal',new T.Float32BufferAttribute(bin.normal,3));
      if(bin.uv)g.setAttribute('uv',new T.Float32BufferAttribute(bin.uv,2));
      g.setIndex(bin.indices);g.computeBoundingSphere();put(g,m,group);
    }
  }
  function panelGeometry(verts){
    const g=trackGeometry(new T.BufferGeometry());
    g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.computeVertexNormals();
    return g;
  }
  for(const [m,verts] of fixedPanels)put(panelGeometry(verts),m,staticBody);
  for(const verts of windowPanes.values()){
    const g=panelGeometry(verts);g.computeBoundingBox();
    const c=g.boundingBox.getCenter(new T.Vector3());g.translate(-c.x,-c.y,-c.z);
    put(g,glass,staticBody,c.x,c.y,c.z);
  }
  fixedPanels.clear();windowPanes.clear();
  combine(staticBody);combine(rampHinge);combine(rampTip);
  for(const pad of pads){combine(pad.pivot);combine(pad.foot);}
  const inUse=new Set();root.traverse(node=>{if(node.isMesh)inUse.add(node.geometry);});
  for(const source of geometries)if(!inUse.has(source)){source.dispose();geometries.delete(source);}

  function floorAt(z){
    return z<=5.55?layout.floorY:layout.floorY*Math.max(0,1-(z-5.55)/rampRun);
  }
  function widthAt(z){
    if(z>4.86)return .57;
    if(z>4.17)return .79-(z-4.17)*.22/.69;
    if(z>2.86)return .75;
    if(z>-1.45)return .79;
    return .79-Math.min(.46,Math.max(0,-z-1.45)*.36);
  }
  function walk(pos,dx,dz,doorOpen){
    const opened=doorOpen===true||Number(doorOpen)>=.98;
    const limit=opened?layout.rampEnd[2]:5.23;
    let x=pos.x,z=T.MathUtils.clamp(pos.z,-3.31,limit);
    const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.22));
    for(let i=0;i<count;i++){
      // Follow the sloping sill into the narrower cockpit and ramp, including
      // when the pilot walks straight ahead with a shoulder beside the rail.
      z=T.MathUtils.clamp(z+dz/count,-3.31,limit);
      const width=widthAt(z);
      x=T.MathUtils.clamp(x+dx/count,-width,width);
    }
    return vector(x,floorAt(z),z);
  }
  function zone(p){
    if(p.z<=-1.92&&Math.abs(p.x)<.76)return 'seat';
    return p.z>=4.40?'exit':'cabin';
  }
  const clamp01=x=>T.MathUtils.clamp(Number(x)||0,0,1);
  let readoutKey='',nextReadout=0,lastState='';
  function readout(speed,altitude,mode,destination,door,gear){
    function metric(v,kmUnit,mUnit){
      return v>=1000?(v/1000).toFixed(v<10000?2:1)+' '+kmUnit:Math.round(v)+' '+mUnit;
    }
    const status=String(mode||'待机'),target=String(destination||'赛尔号');
    const hatch=door<=.01?'已锁闭':door>=.98?'已展开':'动作中';
    const pads=gear<=.01?'已收起':gear>=.99?'已放下':'动作中';
    const state=[status,target,hatch,pads].join('|'),now=performance.now();
    if(now<nextReadout&&state===lastState)return;
    nextReadout=now+120;lastState=state;
    const s=metric(Math.abs(Number(speed)||0),'km/s','m/s');
    const h=metric(Math.max(0,Number(altitude)||0),'km','m');
    const next=[s,h,state].join('|');if(next===readoutKey)return;
    readoutKey=next;
    ctx.fillStyle='#081924';ctx.fillRect(0,0,768,256);
    ctx.fillStyle='#163e4c';ctx.fillRect(14,10,740,46);
    ctx.fillStyle='#90e6e4';ctx.font='600 23px "Microsoft YaHei",sans-serif';
    ctx.fillText('SEER  /  L-01',29,42);ctx.textAlign='right';ctx.fillText(status,738,42,415);ctx.textAlign='left';
    ctx.fillStyle='#8cbfc2';ctx.font='22px "Microsoft YaHei",sans-serif';
    ctx.fillText('航速',30,92);ctx.fillText('雷达高度',403,92);
    ctx.fillStyle='#e9f2e8';ctx.font='600 46px monospace';ctx.fillText(s,28,146,332);ctx.fillText(h,400,146,335);
    ctx.fillStyle='#234651';ctx.fillRect(27,167,712,2);
    ctx.fillStyle='#ecc477';ctx.font='23px "Microsoft YaHei",sans-serif';ctx.fillText('航向目标  '+target,30,207,700);
    ctx.font='20px "Microsoft YaHei",sans-serif';
    ctx.fillStyle=hatch==='动作中'?'#f0b75e':'#94cfce';ctx.fillText('尾坡 '+hatch,29,242);
    ctx.fillStyle=pads==='动作中'?'#f0b75e':'#94cfce';ctx.fillText('起落架 '+pads,402,242);
    instrument.map.needsUpdate=true;
  }
  const ramAxis=vector(0,1,0),ramTip=vector(),ramDir=vector();
  let ramDoor=-1;
  function update({door=0,gear=1,thrust=0,speed=0,altitude=0,mode='',destination=''}={}){
    const d=clamp01(door),g=clamp01(gear),t=clamp01(thrust);
    rampHinge.rotation.x=T.MathUtils.lerp(-Math.PI/2,Math.atan2(layout.floorY,rampRun),d);
    rampTip.position.z=fixedRamp-travel*(1-d);
    if(d!==ramDoor){
      ramDoor=d;
      for(const {shoulder,lug,sleeve,shaft} of rampActuators){
        ramTip.copy(lug).applyQuaternion(rampHinge.quaternion).add(rampHinge.position);
        ramDir.subVectors(ramTip,shoulder);
        const length=ramDir.length(),outer=1.72;
        ramDir.normalize();sleeve.quaternion.setFromUnitVectors(ramAxis,ramDir);
        sleeve.position.copy(shoulder).addScaledVector(ramDir,outer/2);sleeve.scale.set(.055,outer,.055);
        shaft.quaternion.copy(sleeve.quaternion);shaft.scale.set(.036,length-outer+.05,.036);
        shaft.position.copy(shoulder).addScaledVector(ramDir,(length+outer-.05)*.5);
      }
    }
    for(const {pivot,foot,dir} of pads){
      pivot.rotation.x=-dir*(1-g)*1.42;foot.rotation.x=-pivot.rotation.x;
    }
    for(const plume of plumes){
      const length=.11+1.55*t;
      plume.visible=t>.015;plume.scale.set(.23+.12*t,length,.23+.12*t);plume.position.z=5.17+length/2;
    }
    exhaustMat.opacity=.27+.36*t;readout(speed,altitude,mode,destination,d,g);
  }
  function dispose(){
    if(root.parent)root.parent.remove(root);
    for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const tex of textures)tex.dispose();
  }
  update();
  return {root,layout,controls,walk,zone,update,dispose};
}
