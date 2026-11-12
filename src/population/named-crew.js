// Taomee's classic dialogue portraits: resource/newNpc/oneSide/{portrait}.swf.
// Look coordinates are in the actual compartment's local X/Z frame.
const namedCrewPosts={
  captain:{id:'roger',name:'罗杰',role:'船长',portrait:1,tint:0x7294b5,x:4.4,z:-5.0},
  instructor:{id:'raymond',name:'雷蒙',role:'总教官',portrait:5,tint:0xa6a7a6,x:2.1,z:-3.4},
  laboratory:{id:'pat',name:'派特',role:'精灵研究博士',portrait:3,tint:0xe0e7e7,x:-8.0,z:-6.2},
  workshop:{id:'shawn',name:'肖恩',role:'发明家',portrait:6,tint:0xc0e9ee,x:-7.8,z:6.4},
  machine:{id:'cece',name:'茜茜',role:'机械师',portrait:2,tint:0xf5b82d,x:-5.4,z:-9.6},
  archives:{id:'alice',name:'爱丽丝',role:'探险家',portrait:4,tint:0xe86099,x:5.6,z:-5.6},
  honors:{id:'crow',name:'克罗',role:'授衔官',portrait:518,tint:0xbd793f,x:-10.8,z:-5.2},
  power:{id:'suke',name:'苏克',role:'动力工程师',portrait:8,tint:0x908c71,x:9.8,z:1.3}
};

function createOfficerFigure(post){
  const rig=seerRobots.create(post.tint,{name:post.name,officer:post.id,castShadow:false});
  // Rigid armour follows the same torso pivot as its face. Batch it once;
  // individual rivets, vents and collar plates never need separate draws.
  const positions=[],normals=[],uvs=[],colors=[],surfaces=[[],[],[],[]];
  const matrix=new T.Matrix4(),normalMatrix=new T.Matrix3();
  const origin=new T.Vector3(),size=new T.Vector3(),axis=new T.Vector3(),normal=new T.Vector3();
  const rotation=new T.Quaternion(),angles=new T.Euler(),tone=new T.Color();
  const sphere=new T.SphereGeometry(1,28,20),cube=new T.BoxGeometry(1,1,1);
  const unitRing=new T.TorusGeometry(1,.082,10,44);
  const graphite=0x354050,silver=0xa9bac5,white=0xe9f2f3,cyan=0x53e9f2,gold=0xe7ad3f;
  const alloys=new Set([silver,gold,0xc88b43,0xffdf70,0xa4aab3,0xb9c9cd,0x8b939d,0x908c71]);
  const emitters=new Set([cyan,0x31d5e2,0x54cfc5,0x86e7ed,0x58d5ca,0xd6ffff]);
  function cast(geometry,x,y,z,w,h,d,color,rx=0,ry=0,rz=0){
    matrix.compose(origin.set(x,y,z),rotation.setFromEuler(angles.set(rx,ry,rz)),size.set(w,h,d));
    normalMatrix.getNormalMatrix(matrix);tone.setHex(color).convertSRGBToLinear();
    const offset=positions.length/3,points=geometry.attributes.position,surface=geometry.attributes.normal;
    for(let i=0;i<points.count;i++){
      axis.fromBufferAttribute(points,i).applyMatrix4(matrix);
      normal.fromBufferAttribute(surface,i).applyNormalMatrix(normalMatrix);
      positions.push(axis.x,axis.y,axis.z);normals.push(normal.x,normal.y,normal.z);colors.push(tone.r,tone.g,tone.b);
      uvs.push(geometry.attributes.uv.getX(i),geometry.attributes.uv.getY(i));
    }
    // Keep the reflected light of enamel, exposed alloy and insulating
    // covers separate even though the uniform stays one rigid mesh.
    const indices=surfaces[emitters.has(color)?3:alloys.has(color)?1:color===graphite?2:0];
    if(geometry.index)for(let i=0;i<geometry.index.count;i++)indices.push(offset+geometry.index.getX(i));
    else for(let i=0;i<points.count;i++)indices.push(offset+i);
  }
  const box=(...a)=>cast(cube,...a),oval=(...a)=>cast(sphere,...a),ring=(...a)=>cast(unitRing,...a);
  function plate(outline,z,depth,color,rx=0){
    const shape=new T.Shape();
    outline.forEach(([x,y],i)=>{if(i)shape.lineTo(x,y);else shape.moveTo(x,y);});shape.closePath();
    const geo=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:2});
    cast(geo,0,0,z,1,1,1,color,rx);geo.dispose();
  }
  function arm(side,x,y,z,width,length,color,tilt=0){
    oval(side*x,y,z,width,length,width*.92,color,0,0,side*tilt);
    ring(side*x,y-.045,z-.028,width*.95,width*.90,width,graphite,Math.PI/2,0,side*tilt);
  }
  function faceRim(color){ring(0,.051,-.566,.395,.392,.38,color);}
  if(post.id==='roger'){
    // Crown rises above a low navy visor; the gold crest descends between the eyes.
    oval(0,.401,.026,.578,.364,.523,white);
    oval(0,.345,-.198,.552,.099,.404,0x233c55);
    plate([[-.13,.68],[-.09,.78],[.107,.78],[.150,.66],[.105,.43],[-.09,.43]],-.483,.093,gold);
    ring(0,.61,-.506,.080,.091,.10,0xffdf70,0,0,.45);
    box(0,.61,-.515,.095,.021,.023,0xd5982a,0,0,-.63);
    for(const s of [-1,1]){
      oval(s*.436,.497,-.043,.134,.187,.304,gold,0,0,-s*.25);
      plate([[s*.35,-.15],[s*.60,.09],[s*.61,-.035],[s*.44,-.26]],-.27,.10,0x2f609e);
      for(let j=0;j<4;j++)oval(s*(.065+j*.048),.377+j*.006,-.542+.025*j,.017,.018,.014,gold);
    }
    plate([[-.14,-.292],[-.095,-.20],[.12,-.20],[.13,-.30],[.06,-.372],[-.09,-.36]],-.527,.10,gold);
    faceRim(0x607e9e);
  }else if(post.id==='cece'){
    faceRim(gold);
    ring(0,.27,.025,.49,.42,.43,0x762c69); // Carry handle behind her crown.
    oval(0,.667,.026,.194,.070,.080,0x63616e);
    for(const s of [-1,1]){
      oval(s*.508,.058,.015,.111,.234,.248,0x8e396e);
      oval(s*.568,.06,-.024,.080,.126,.14,gold);
      box(s*.508,-.195,-.16,.068,.056,.26,0x742857,-.21);
    }
    // The blue guard is split at the face just as it is in the portrait.
    ring(0,-.227,.02,.551,.505,.43,0x30b9ee,Math.PI/2);
    box(0,-.322,-.53,.25,.084,.066,0x2ca5cf);
    arm(1,.55,-.14,-.18,.064,.22,0x8e396e,-.54);
  }else if(post.id==='pat'){
    faceRim(silver);
    for(const s of [-1,1]){
      for(const layer of [0,1])ring(s*.507,.03-layer*.126,.004,.28,.27,.81,0xb9c9cd,Math.PI/2,.04,s*.19);
      box(s*.444,.005,-.237,.16,.19,.216,white);
      for(let j=0;j<3;j++)box(s*.443+(j-1)*.031,.026,-.35,.012,.095,.011,0x6ba2b5);
      plate([[s*.077,.49],[s*.111,.84],[s*.247,.90],[s*.38,.72],[s*.314,.60]],-.09,.294,silver);
      oval(s*.242,.736,-.113,.059,.042,.045,0x86e7ed);
    }
    box(0,.55,-.24,.22,.21,.20,graphite);box(0,.58,-.350,.128,.105,.024,cyan);
    plate([[-.19,-.30],[.18,-.30],[.11,-.48],[-.12,-.48]],-.470,.12,white);
    box(0,-.358,-.494,.073,.095,.026,0xe59641);
  }else if(post.id==='alice'){
    faceRim(0xd6518a);
    oval(0,.421,.02,.276,.268,.26,0x344f77);
    ring(0,.497,-.244,.188,.19,.175,0x526d9c);
    oval(0,.499,-.266,.145,.147,.048,0x31d5e2);
    oval(-.047,.548,-.303,.041,.036,.013,0xd6ffff);
    for(const s of [-1,1]){
      plate([[s*.30,.16],[s*.56,.63],[s*.52,.39],[s*.38,.14]],-.28,.18,0xed6e9e);
      plate([[s*.43,.19],[s*.67,.36],[s*.73,.22],[s*.66,-.10],[s*.49,-.20]],-.15,.30,0x466a98);
      for(let j=0;j<4;j++)box(s*.64,.15-j*.045,-.166,.084,.012,.018,silver,0,0,s*.16);
    }
  }else if(post.id==='raymond'){
    faceRim(0xa9bdc7);
    oval(0,.427,.05,.163,.323,.38,0x8b939d);
    for(let j=0;j<6;j++){
      const a=.33+j*.39;
      box(0,.421+.31*Math.sin(a),.032-.37*Math.cos(a),.126,.040,.035,0x54cfc5,a-.05);
    }
    box(0,.44,-.329,.14,.224,.064,gold);
    for(const s of [-1,1]){
      oval(s*.47,.13,.06,.17,.27,.27,silver);
      for(const j of [0,1]){
        const x=s*(.5+j*.126);
        box(x,-.078,-.078,.111,.147,.69,graphite,-.11);
        box(x,-.065,-.112,.09,.102,.64,0xa4aab3,-.11);
        oval(x,-.11,-.419,.048,.062,.023,gold);
        oval(x,-.11,-.44,.022,.033,.012,0x66604d);
      }
    }
  }else if(post.id==='shawn'){
    faceRim(0x89c3cc);
    for(let j=-2;j<=2;j++){
      const cx=j*.154,y=.545+(.40-.115*Math.abs(j)),lean=j*.19;
      oval(cx,.414,.052,.145,.166,.131,white);
      oval(cx+lean*.25,y-.14,.092,.095,.294-.047*Math.abs(j),.089,0x28cde7,-.20,0,-lean);
      oval(cx+lean*.2,y-.15,-.003,.057,.220-.043*Math.abs(j),.044,white,-.20,0,-lean);
    }
    for(const s of [-1,1]){
      arm(s,.54,-.026,.028,.132,.199,white,-.27);
      arm(s,.616,-.201,-.082,.096,.186,0x77d8df,-.38);
    }
    for(const s of [-1,1])box(-.642+s*.057,-.362,-.130,.045,.091,.090,graphite,0,0,-s*.22);
    for(const s of [-1,1])oval(.657+s*.051,-.346,-.144,.046,.152,.060,0x20b4d4,-.44,0,.18);
  }else if(post.id==='suke'){
    faceRim(0x4d5149);
    box(0,.532,-.018,.74,.089,.113,silver);
    box(0,.541,-.021,.126,.175,.172,gold);
    for(const s of [-1,1]){
      plate([[s*.21,.58],[s*.31,.71],[s*.47,.704],[s*.41,.642],[s*.35,.625],[s*.345,.548],[s*.417,.513],[s*.49,.547],[s*.455,.456],[s*.30,.454],[s*.229,.51]],-.113,.164,0x585f55);
      arm(s,.49,.030,.025,.205,.249,0x85866d,-.24);
      oval(s*.559,.119,-.150,.121,.097,.081,gold);
      arm(s,.579,-.174,-.075,.124,.211,0x695e51,-.28);
      box(s*.625,-.31,-.15,.183,.129,.233,silver,-.24);
      box(s*.625,-.31,-.262,.085,.061,.021,graphite);
    }
    box(-.197,-.226,-.513,.157,.251,.086,gold);
  }else if(post.id==='crow'){
    faceRim(0xc88b43);
    plate([[-.15,.392],[-.135,.86],[.090,.878],[.16,.70],[.14,.40]],-.310,.245,0xb57737);
    plate([[-.080,.456],[-.075,.793],[.055,.799],[.091,.681],[.082,.46]],-.335,.036,0x46c6c0);
    for(const s of [-1,1]){
      plate([[s*.340,.20],[s*.490,.70],[s*.679,.82],[s*.654,.48],[s*.550,.14]],.146,.16,0xca8844);
      arm(s,.50,.032,.014,.205,.230,0xb67b40,-.16);
      plate([[s*.455,-.07],[s*.652,.00],[s*.739,-.390],[s*.566,-.407],[s*.483,-.29]],-.144,.20,0xd69a54);
      for(let j=0;j<3;j++)box(s*(.57+j*.018),-.160-j*.069,-.166,.058,.043,.018,0x58d5ca,0,0,s*.17);
    }
  }
  const attributes={position:new T.Float32BufferAttribute(positions,3),
    normal:new T.Float32BufferAttribute(normals,3),uv:new T.Float32BufferAttribute(uvs,2),
    color:new T.Float32BufferAttribute(colors,3)};
  sphere.dispose();cube.dispose();unitRing.dispose();
  const materials=[
    seerShellEnamel.clone(),
    new T.MeshStandardMaterial({vertexColors:true,metalness:.73,roughness:.29}),
    new T.MeshStandardMaterial({vertexColors:true,metalness:.06,roughness:.65}),
    new T.MeshBasicMaterial({vertexColors:true,toneMapped:false})
  ];
  applyManufacturedFinish(materials[1],'metal');
  applyManufacturedFinish(materials[2],'rubber');
  const armour=new T.Group();armour.name=post.name+' · 职务机装';
  for(const [surface,indices] of surfaces.entries()){
    if(!indices.length)continue;
    const geometry=new T.BufferGeometry();
    for(const [name,buffer] of Object.entries(attributes))geometry.setAttribute(name,buffer);
    geometry.setIndex(indices);
    const part=new T.Mesh(geometry,materials[surface]);part.receiveShadow=true;armour.add(part);
  }
  rig.bones.core.add(armour);
  rig.disposeKit=()=>{armour.children.forEach(part=>part.geometry.dispose());materials.forEach(m=>m.dispose());};
  return rig;
}
