// Map 316 rear row. The four silhouettes follow references/byron/hold.png;
// depth, rear panels and fittings hidden by that image are spatial reconstruction.
// Coordinates remain in the parent ship's metre frame; +Z faces the entrance.
const BYRON_TRAINING_STATIONS=[
  {id:'inclined-track',x:3.5,z:-56.8},
  {id:'red-hub',x:12.2,z:-58.8},
  {id:'glass-pod',x:20.9,z:-58.8},
  {id:'hooded-cabinet',x:29.6,z:-56.8}
];

function buildByronTrainingHold(T,k,obstruct){
  const metal=c=>k.mat(c,false,false,'metal');
  const tau=Math.PI*2,paint=metal(0x34695a),edge=metal(0x719a8b),dark=k.mat(0x222e3e);
  const steel=metal(0x89979f),violet=metal(0x62566e),recess=k.mat(0x152a31);
  const cyan=k.mat(0x60e6ee,true),green=k.mat(0x61ec49,true),orange=k.mat(0xffac39,true);
  const red=k.mat(0xfa4134,true),glass=k.mat(0x4eacc9,false,true),rubber=k.mat(0x303945,false,false,'rubber');
  const hoop=new T.TorusGeometry(1,.065,10,64);

  // Extruded front silhouettes avoid treating all four machines as scaled boxes.
  function panel(material,outline,depth,x,y,z,rx=0,rz=0){
    const shape=new T.Shape();
    outline.forEach(([u,v],i)=>i?shape.lineTo(u,v):shape.moveTo(u,v));shape.closePath();
    const geometry=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:1,
      steps:1,bevelSize:.06,bevelThickness:.06,curveSegments:1});
    geometry.translate(0,0,-depth/2);k.put(geometry,material,x,y,z,1,1,1,rx,0,rz);
  }
  function bezel(material,x,y,z,width,height){
    k.put(hoop,material,x,y,z,width,height,1);
  }
  function bolts(x,y,z,r,count=8){
    for(let n=0;n<count;n++){
      const a=tau*n/count;k.ball(steel,x+r*Math.cos(a),y+r*Math.sin(a),z,.085,.085,.06);
    }
  }
  function base({x,z}){
    k.disk(dark,x,.43,z,3.27,.86);k.disk(violet,x,1.02,z,3.27,.32);
    k.ring(steel,x,1.21,z,3.03);k.disk(dark,x,1.25,z,2.72,.10);
    for(let n=0;n<8;n++){
      const a=tau*n/8;
      k.box(steel,x+3.08*Math.sin(a),1.20,z+3.08*Math.cos(a),.12,.055,.36,0,a);
    }
    // Use the same installation footprint for walking, camera and flight solids.
    obstruct(x,z,3.27);
    k.volume(x-3.27,x+3.27,z-3.27,z+3.27,p=>p.y>=0&&p.y<=1.30&&Math.hypot(p.x-x,p.z-z)<3.27);
  }

  function inclinedTrack({x,z}){
    const tilt=new T.Euler(-.12,0,.23),origin=new T.Vector3(x+.78,1.58,z-.40);
    const point=(u,v,w)=>new T.Vector3(u,v,w).applyEuler(tilt).add(origin);
    const box=(material,u,v,w,width,height,depth)=>{
      const p=point(u,v,w);k.box(material,p.x,p.y,p.z,width,height,depth,tilt.x,0,tilt.z);
    };
    const outline=[[-1.13,0],[1.12,0],[1.28,.54],[1.01,5.60],[.56,6.08],[-.72,6.08],[-1.13,5.50]];
    panel(dark,outline,1.82,origin.x,origin.y,origin.z,tilt.x,tilt.z);
    panel(steel,outline.map(([u,v])=>[u*.82,.20+v*.92]),.16,
      ...point(0,0,1.00).toArray(),tilt.x,tilt.z);
    box(recess,0,3.39,1.12,.80,4.74,.15);
    box(orange,0,3.37,1.23,.40,4.15,.09);
    box(red,0,5.59,1.23,.43,.38,.10);
    box(paint,0,.67,1.22,1.88,.66,.40);
    for(const u of [-.70,.70])box(green,u,.67,1.46,.16,.20,.08);
    for(let n=0;n<5;n++){
      const p=point(-.88+n*.40,5.88,1.08);k.ball(green,p.x,p.y,p.z,.10,.10,.07);
    }
    // An open curved belt wraps the left side, with separate tread plates.
    const beltX=x-.36,beltY=3.72,beltZ=z+1.00,start=.32*Math.PI,arc=1.38*Math.PI;
    k.put(new T.TorusGeometry(1.90,.56,10,52,arc),rubber,beltX,beltY,beltZ,1,1,1,0,0,start);
    for(const face of [-.46,.46]){
      k.put(new T.TorusGeometry(1.90,.11,8,52,arc),steel,beltX,beltY,beltZ+face,1,1,1,0,0,start);
    }
    for(let n=0;n<11;n++){
      const a=start+arc*(n+.5)/11;
      k.box(n%2?steel:edge,beltX+1.90*Math.cos(a),beltY+1.90*Math.sin(a),beltZ+.53,
        .72,.37,.10,0,0,a+Math.PI/2);
    }
    const a=start+arc,tipX=beltX+1.9*Math.cos(a),tipY=beltY+1.9*Math.sin(a);
    panel(green,[[-.28,-.22],[.34,0],[-.28,.22]],.08,tipX,tipY,beltZ+.61,0,-.48);
    // The exposed rear coil belongs to this device, below the room's roof.
    for(let n=0;n<5;n++)k.ring(n%2?edge:dark,x-.64,6.30+n*.26,z-.87,1.37,.94);
    k.box(paint,x+.55,1.65,z-.12,3.12,.61,2.48,0,0,0,true);
    k.volume(x-2.85,x+2.65,z-2.1,z+1.8,p=>p.y>1.3&&p.y<7.8&&
      ((p.x-x+.2)/2.65)**2+((p.z-z)/1.8)**2<1);
  }

  function redHub({x,z}){
    const profile=[[0,1.30],[2.35,1.30],[2.62,1.72],[2.66,3.0],[2.45,4.85],
      [2.07,6.30],[1.40,7.38],[.76,8.10],[0,8.10]];
    k.put(new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),48),paint,x,0,z,1,1,.88);
    k.volume(x-2.7,x+2.7,z-2.4,z+2.4,p=>p.y>1.3&&p.y<8.15&&
      ((p.x-x)/2.7)**2+((p.z-z)/2.4)**2<1);
    for(const [y,r] of [[1.57,2.48],[2.05,2.61],[4.82,2.45]]){
      k.ring(dark,x,y,z,r,r*.88);k.ring(steel,x,y+.12,z,r-.04,(r-.04)*.88);
    }
    for(let n=0;n<10;n++){
      const a=tau*n/10;
      for(const [y,r] of [[2.75,2.66],[5.24,2.32]]){
        const xx=x+r*Math.sin(a),zz=z+r*.88*Math.cos(a);
        k.ball(dark,xx,y,zz,.30,.36,.27);k.ball(green,xx+.20*Math.sin(a),y,zz+.20*Math.cos(a),.18,.24,.18);
      }
      k.box(cyan,x+2.55*Math.sin(a),4.56,z+2.25*Math.cos(a),.42,.25,.10,0,a);
    }
    // Three tapering ribs and cyan insets lead up from the front hub.
    for(const side of [-1,0,1]){
      const path=[[x+side*1.76,5.17,z+1.42],[x+side*1.39,6.16,z+1.37],[x+side*.67,7.84,z+.57]];
      k.pipe(dark,path,.20);k.pipe(cyan,path.map(([u,v,w])=>[u,v,w+.17]),.075);
      k.pipe(edge,path.map(([u,v,w])=>[u+side*.24,v,w-.05]),.09);
    }
    k.ball(dark,x,3.91,z+2.13,1.32,1.53,.35);
    bezel(steel,x,3.91,z+2.43,1.18,1.36);
    for(let n=0;n<10;n++){
      const a=tau*n/10;
      k.box(steel,x+.92*Math.sin(a),3.91+1.10*Math.cos(a),z+2.47,.33,.42,.13,0,0,-a);
    }
    k.ball(recess,x,3.91,z+2.48,.68,.73,.12);
    bezel(green,x,3.91,z+2.60,.53,.57);k.ball(red,x,3.91,z+2.62,.40,.43,.13);
    for(const side of [-1,1])k.box(dark,x+side*1.82,1.59,z+1.39,.54,.54,.34,0,side*.25);
  }

  function glassPod({x,z}){
    k.disk(steel,x,1.50,z,2.64,.35,2.25);k.disk(paint,x,1.78,z,2.77,.27,2.29);
    k.ring(cyan,x,1.94,z,2.59,2.18);
    // Flattened rear and an oval front keep the pod distinct from a glass globe.
    k.ball(glass,x,4.24,z-.12,2.76,2.83,2.17,true);
    bezel(dark,x,4.30,z+.98,2.61,2.78);bezel(edge,x,4.30,z+1.08,2.50,2.67);
    for(const side of [-1,1]){
      k.pipe(paint,[[x+side*2.57,1.97,z-.18],[x+side*2.81,3.49,z-.38],
        [x+side*2.30,6.10,z-.52],[x+side*.97,7.06,z-.66]],.25);
      k.pipe(cyan,[[x+side*1.02,6.91,z-.40],[x+side*1.84,6.47,z+.10],[x+side*2.20,5.94,z+.35]],.07);
    }
    // Raised rear hood, side ventilation slots and a visible empty inner seat.
    k.box(paint,x,6.64,z-1.04,3.53,.45,1.47,-.25);
    for(let n=0;n<5;n++)k.box(edge,x-1.40+n*.70,6.90,z-1.05,.10,.10,1.38,-.25);
    k.disk(dark,x,2.07,z,1.24,.18);k.ring(green,x,2.19,z,1.01,.76);
    for(let n=0;n<12;n++){
      const a=tau*n/12;k.box(edge,x+.87*Math.sin(a),2.21,z+.66*Math.cos(a),.10,.08,.29,0,a);
    }
    k.ball(dark,x+2.61,4.29,z+.12,.39,1.56,.99);
    for(let n=0;n<8;n++)k.box(steel,x+2.86,3.27+n*.28,z+.16,.18,.12,1.05,0,-.15);
    k.ball(recess,x-1.64,4.58,z+1.59,.45,.57,.13);
    bezel(cyan,x-1.64,4.58,z+1.72,.30,.42);
    k.box(dark,x-1.66,1.73,z+1.71,.83,.43,.19,-.22);
    k.box(green,x-1.66,1.77,z+1.83,.53,.23,.06,-.22);
  }

  function hoodedCabinet({x,z}){
    const shell=[[-2.61,1.42],[-2.80,2.17],[-2.56,5.54],[-1.93,7.08],
      [1.57,7.08],[2.50,6.35],[2.77,2.02],[2.15,1.42]];
    panel(paint,shell,3.70,x,0,z);
    panel(dark,shell.map(([u,v])=>[u*.89,1.60+(v-1.42)*.90]),.18,x,0,z+1.96);
    panel(edge,[[-2.14,2.15],[-1.91,5.73],[-1.43,6.52],[1.30,6.52],[2.03,5.95],[2.19,2.15]],.16,x,0,z+2.10);
    panel(recess,[[-1.93,2.43],[-1.71,5.60],[-1.30,6.23],[1.19,6.23],[1.80,5.78],[1.96,2.43]],.12,x,0,z+2.21);
    // Broad U-shaped cyan rim and a recessed upper instrument pane.
    k.pipe(cyan,[[x-1.79,4.80,z+2.32],[x-1.76,3.38,z+2.32],[x-1.25,2.72,z+2.32],
      [x+.89,2.72,z+2.32],[x+1.76,3.40,z+2.32],[x+1.69,4.80,z+2.32]],.095);
    k.box(steel,x-.35,5.50,z+2.31,2.37,1.06,.13,0,0,-.09);
    k.box(recess,x-.35,5.50,z+2.41,2.04,.78,.08,0,0,-.09);
    k.box(cyan,x-1.06,5.50,z+2.48,.32,.54,.06,0,0,-.09);
    k.box(paint,x+.25,3.57,z+2.29,1.45,.90,.13);
    for(let n=0;n<3;n++)k.box(green,x-.19+n*.40,3.58,z+2.39,.16,.09,.06);
    for(let n=0;n<5;n++){
      const zz=z-1.47+n*.71;
      k.line(dark,[x-1.91,7.12,zz],[x+1.51,7.12,zz],.13);
      k.line(edge,[x+1.51,7.12,zz],[x+2.47,6.34,zz],.11);
    }
    for(const side of [-1,1]){
      k.box(steel,x+side*2.38,2.12,z+1.84,.25,.94,.21,0,0,side*.12);
      bolts(x+side*2.36,2.18,z+1.98,.18,4);
    }
    k.volume(x-2.9,x+2.9,z-1.95,z+2.45,p=>p.z>=z-1.95&&p.z<=z+2.45&&
      byronInside(p.x-x,p.y,shell));
  }

  const builders=[inclinedTrack,redHub,glassPod,hoodedCabinet];
  BYRON_TRAINING_STATIONS.forEach((station,i)=>{base(station);builders[i](station);});
}
