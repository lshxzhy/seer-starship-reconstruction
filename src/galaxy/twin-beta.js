// The five scenes follow Taomee's resource/map/{47,48,49,501,502}.swf.
// X/Z describe one survey in metres. Reverse sides, distances and ramps connect
// the original stage views without moving the visitor between separate maps.
const BETA_WORLD=defineTwinWorld({
  id:'beta',name:'双子贝塔星',radius:7000,previousRadius:35000,lat:.19,lon:-.47,
  districts:[[['beta-plain'],.19,-.47],[['beta-waste','beta-training','beta-hall'],.37,1.64],[['beta-ruins'],-.40,-2.55]],
  sites:[
    {id:'beta-plain',name:'双子贝塔星',x:0,z:0,mapId:47,lookAt:[4,-32],lookPitch:.22,description:'红褐色巨型掘进机。单目绿灯下方是红色进气口，两条节臂垂下三枚锥钻。'},
    {id:'beta-waste',name:'贝塔星荒原',x:-105,z:-60,mapId:49,lookAt:[-109,-83],lookPitch:.24,description:'青光裂谷贯穿六角电能石层。隔岸可以看见成组的玻璃罩勘察站；左侧圆台通往双子阿尔法星海盗能源站。'},
    {id:'beta-ruins',name:'海盗要塞废墟',x:102,z:-9,mapId:48,lookAt:[108,-31],description:'赭黄装甲塌入灰岩，横断的管束、格栅地沟和破裂的舱壁从断层中露出。'},
    {id:'beta-training',name:'海盗训练场',x:-187.5,z:-73,mapId:501,lookAt:[-184.6,-90],lookPitch:-.055,description:'四座校准柱嵌在紫色维护墙前，浅色断层楼板下垂着线缆。右侧保留四道青光栅。'},
    {id:'beta-hall',name:'精灵召唤场',x:-258,z:-134.8,mapId:502,lookAt:[-254.3,-153.0],lookPitch:-.14,description:'从入口坡道可见中央黄盘、左蓝右红与后方绿座。穿过嵌有倒三角的中门，即可走进检修通道。'}
  ],
  routes:[['beta-plain','beta-waste'],['beta-plain','beta-ruins'],['beta-waste','beta-training'],['beta-training','beta-hall']],
  landingSites:[{id:'beta-landing',name:'重机坪',x:1,z:39,description:'巨型掘进机南面的平坦泊点。'},
    {id:'beta-waste-landing',name:'荒原北侧泊坪',x:-83,z:-19,description:'避开裂谷的北侧硬地，可步行前往训练场和召唤场。'},
    {id:'beta-ruins-landing',name:'要塞废墟东侧泊坪',x:145,z:22,description:'残骸区外侧的开放泊坪。'}],
  palette:{soil:0x87726e,rock:0x61575e,highlight:0xaea68a,horizon:0xffbec7,zenith:0x5f5388,haze:0xc4a2a8},
  terrainHeight(x,z){
    const waves=1.15*Math.sin(.025*x+.008*z)+.68*Math.sin(.043*z-.016*x);
    const valleyZ=z+81-6*Math.sin((x+108)*.082);
    const gorge=14.8*Math.exp(-(((x+104)/44)**2+(valleyZ/7.6)**2));
    const ridge=5.2*Math.exp(-(((x+108)/39)**2+((z+106)/13)**2));
    let h=waves+ridge-gorge;
    // The horizontal slabs in the original fortress and summoning arena form
    // their walkable floor; fade gently back into the natural approach.
    for(const [cx,cz,r,level] of [[102,-18,20,0],[-185,-84,17,-.7],[-255,-148,21,-1.0],[1,39,24,0]]){
      const t=Math.max(0,Math.min(1,(Math.hypot(x-cx,z-cz)-r)/8));
      h=level+(h-level)*t*t*(3-2*t);
    }
    // The foreground panels in 502 overlook the coloured sockets. A shallow
    // entry ramp carries that view down to the level floor, including on foot.
    if(Math.abs(x+255)<21&&z>-144.7&&z<-119)
      h+=3.1*T.MathUtils.smoothstep(z,-144.7,-133)*(1-T.MathUtils.smoothstep(z,-128,-119))*(1-T.MathUtils.smoothstep(Math.abs(x+255),12,21));
    return h;
  },
  groundTone(x,z,h){
    if(h< -5)return h< -11?0x2e8d8c:0x5b7075;
    if(Math.hypot(x+255,z+146)<26)return 0x716a63;
    if(Math.hypot(x+185,z+87)<24)return 0x8b9691;
    if(Math.hypot(x-102,z+10)<42)return 0x8b8790;
    const dust=.5+.5*Math.sin(x*.32+Math.sin(z*.21)*1.8)*Math.cos(z*.23-x*.12);
    const tint=(r,g,b)=>((r+dust*18|0)<<16)|((g+dust*13|0)<<8)|(b+dust*11|0);
    if(z<-45&&x<-52)return z<-91?tint(146,139,122):tint(147,101,106);
    return tint(124,129,109);
  },
  buildLandmarks:buildBetaLandmarks
});

function buildBetaLandmarks(kit){
  const {T,ground,stamp,block,root,material}=kit,tau=2*Math.PI;
  const box=new T.BoxGeometry(1,1,1),ball=new T.SphereGeometry(1,32,20);
  const drum=new T.CylinderGeometry(1,1,1,36),hex=new T.CylinderGeometry(1,1,1,6);
  const chamfer=new T.CylinderGeometry(.82,1,1,8),torus=new T.TorusGeometry(1,.085,10,44);
  const cap=new T.SphereGeometry(1,40,20,0,tau,0,Math.PI/2);
  const p=(x,y,z)=>new T.Vector3(x,y,z),up=p(0,1,0),axisZ=p(0,0,1);
  const metal=c=>fieldSurfaceFinish(material(c,{metalness:.42,roughness:.46}),'metal');
  const emit=(color,intensity=.42)=>material(color,{emissive:color,emissiveIntensity:intensity,roughness:.32,metalness:.12});
  const iron=metal(0x415361),gun=metal(0x33343e),edge=metal(0x8997a0),light=metal(0xc6c4b4);
  const copper=metal(0xab6856),patina=metal(0x69575a),gold=metal(0xc99843),ochre=metal(0xae782c);
  const rose=metal(0x987381),purple=metal(0x6c477e),plum=metal(0x674e72);
  const dark=fieldSurfaceFinish(material(0x25262c,{roughness:.76}),'coating');
  const grime=fieldSurfaceFinish(material(0x666c51,{roughness:.95}),'coating');
  const green=emit(0x93d63a),aqua=emit(0x4ce0da),blue=emit(0x4bbde0),red=emit(0xe84a38);
  const chartreuse=emit(0xcbd63c),rockTone=[0xa69e8e,0x818b87,0xab9c87,0x9a8680].map(c=>fieldSurfaceFinish(material(c,{roughness:.96,vertexColors:true}),'stone'));
  // Beds have a torn edge, a dark seam recessed behind it and a freshly exposed
  // upper face. The same profile can read as a fallen slab or an entire cliff.
  function strata(phase){
    const vertices=[],colors=[],faces=[],n=11;
    const layers=[[-.82,.61,.43],[-.49,1.00,.65],[-.30,.94,.49],[-.25,1.04,.84],
      [-.08,.95,.79],[.10,.82,.47],[.16,.95,.92],[.49,.87,.95],[.62,.61,1.12],[.69,.01,1]];
    for(const [j,[h,r,tint]] of layers.entries())for(let k=0;k<n;k++){
      const a=k*tau/n,broken=1+.18*Math.sin(3*a+phase)+.07*Math.cos(5*a+phase+h*1.3);
      vertices.push(Math.cos(a)*r*broken+.16*h,h+.074*Math.sin(a*3+phase)*r,Math.sin(a)*r*broken-.09*h);
      const shade=tint*(.94+.11*Math.sin(3*a+phase));
      colors.push(shade,shade*(.97+.03*j/layers.length),shade*(.93+.07*j/layers.length));
      if(j<layers.length-1){const i=j*n+k,b=j*n+(k+1)%n;faces.push(i,i+n,b,b,i+n,b+n);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(faces);
    const cut=g.toNonIndexed();cut.computeVertexNormals();g.dispose();return cut;
  }
  const beds=[strata(.35),strata(1.85),strata(3.35)],rockMesh=beds[0];
  function add(g,m,x,y,z,w=1,h=1,d=1,rx=0,ry=0,rz=0){stamp(g,m,x,y,z,w,h,d,rx,ry,rz);}
  function rod(a,b,r,m,g=drum){
    const dir=b.clone().sub(a),mid=a.clone().add(b).multiplyScalar(.5);
    const rot=new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(up,dir.clone().normalize()));
    add(g,m,mid.x,mid.y,mid.z,r,dir.length(),r,rot.x,rot.y,rot.z);
  }
  function ring(x,y,z,r,m,normal=up,thick=1){
    const e=new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(axisZ,normal));
    add(torus,m,x,y,z,r,r,r*thick,e.x,e.y,e.z);
  }
  function pipe(points,r,m,segments=32){
    const line=new T.CatmullRomCurve3(points);
    add(new T.TubeGeometry(line,segments,r,12,false),m,0,0,0);return line;
  }
  function sleeve(curve,count,r,m){
    for(let i=0;i<count;i++){
      const t=(i+.3)/count,c=curve.getPointAt(t);
      ring(c.x,c.y,c.z,r,m,curve.getTangentAt(t).normalize(),.69);
    }
  }
  function rock(x,z,r,h,m=0){
    const y=ground(x,z);add(rockMesh,rockTone[m%4],x,y+h*.3,z,r,h*.76,r*.90,.13,x+z,-.16);
    if(h>.9)block(x,z,r*.88,h*.99);
  }
  function plate(x,z,w,d,c=iron){
    const y=ground(x,z);add(box,c,x,y+.035,z,w,.07,d);
  }
  // Low surface panels follow actual terrain at every corner, including its
  // spherical correction. Each shape has its own bevel, seams and fasteners.
  const deck=new Map();
  function inlay(x,z,outline,c,lift=.055,spacing=Infinity){
    let data=deck.get(c);if(!data){data={v:[],i:[]};deck.set(c,data);}
    const area=outline.reduce((sum,[x,z],k)=>{const [nx,nz]=outline[(k+1)%outline.length];return sum+x*nz-z*nx;},0);
    for(let k=1;k<outline.length-1;k++){
      const a=outline[0],b=outline[area>0?k+1:k],c=outline[area>0?k:k+1];
      const count=Math.max(1,Math.ceil(Math.max(Math.hypot(a[0]-b[0],a[1]-b[1]),Math.hypot(a[0]-c[0],a[1]-c[1]),Math.hypot(b[0]-c[0],b[1]-c[1]))/spacing));
      for(let row=0;row<=count;row++){
        const start=data.v.length/3;
        for(let j=0;j<=count-row;j++){
          const dx=x+a[0]+(b[0]-a[0])*j/count+(c[0]-a[0])*row/count;
          const dz=z+a[1]+(b[1]-a[1])*j/count+(c[1]-a[1])*row/count;
          data.v.push(dx,ground(dx,dz)+lift,dz);
          if(row<count&&j<count-row){
            const i=start+j,n=i+count-row+1;data.i.push(i,i+1,n);
            if(j+1<count-row)data.i.push(i+1,n+1,n);
          }
        }
      }
    }
  }
  function floorPanel(x,z,w,d,tone,spacing=Infinity){
    const a=w/2,b=d/2,k=Math.min(a,b)*.25;
    inlay(x,z,[[-a+k,-b],[a-k,-b],[a,-b+k],[a,b-k],[a-k,b],[-a,b],[-a,-b+k]],tone,.062,spacing);
    inlay(x,z,[[-a+k,-b+.11],[a-k,-b+.11],[a-k-.20,-b+.19],[-a+k,-b+.19]],edge,.075);
    for(const dx of [-a+.38,a-.38])for(const dz of [-b+.39,b-.39])
      add(hex,gun,x+dx,ground(x+dx,z+dz)+.073,z+dz,.073,.024,.073);
  }
  function finishDeck(){
    for(const [mat,{v,i}] of deck){
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));
      g.setIndex(i);g.computeVertexNormals();add(g,mat,0,0,0);
    }
  }

  // Map 47. The two-armed drill overlooks the whole arrival apron. The lip
  // frames a single green optic; the jaw below is open between the teeth.
  const mx=4,mz=-31,my=ground(mx,mz);
  const hullProfile=[[0,0],[4.6,.15],[6.9,2.3],[8.2,6],[8.45,9.6],[7.7,12.3],[5.6,14.3],[0,14.5]];
  const hull=new T.LatheGeometry(hullProfile.map(([r,y])=>new T.Vector2(r,y)),60);
  add(hull,rose,mx,my,mz,1,1,.88);block(mx,mz,7.3,15.3);
  function hullPoint(a,y,lift=0){
    let n=1;while(n<hullProfile.length-1&&hullProfile[n][1]<y)n++;
    const [r0,h0]=hullProfile[n-1],[r1,h1]=hullProfile[n],r=r0+(r1-r0)*(y-h0)/(h1-h0)+lift;
    return p(mx+r*Math.sin(a),my+y,mz+r*.88*Math.cos(a));
  }
  // Curved separate armour gores expose the lip and recessed shadow around
  // each panel. They follow the lathed hull radius rather than intersecting it.
  for(let j=-4;j<4;j++){
    const a=j*.37+.005,b=a+.348,v=[],idx=[];
    for(const [row,y] of [7.10,8.36,9.6,10.8,12.03].entries())for(let k=0;k<=4;k++){
      const at=hullPoint(a+(b-a)*k/4,y+.16*Math.cos((j+.5)*.88),.09);
      v.push(at.x,at.y,at.z);
      if(row<4&&k<4){const i=row*5+k;idx.push(i,i+1,i+5,i+1,i+6,i+5);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();
    add(g,metal(j%2===0?0x907987:0xa27f8b),0,0,0);
    const seamA=hullPoint(a,7.35,.10),seamB=hullPoint(a,11.94,.10);
    pipe([seamA,hullPoint(a,9.6,.12),seamB],.066,patina,5);
    for(const h of [7.63,11.58]){
      const bolt=hullPoint(a+.042,h,.15);
      add(ball,gun,bolt.x,bolt.y,bolt.z,.093,.091,.085);
    }
    for(const h of [8.18,8.43,8.68]){
      const p1=hullPoint(a+.075,h,.16),p2=hullPoint(a+.21,h,.16);
      rod(p1,p2,.041,gun);
    }
  }
  add(ball,gun,mx,my+13,mz+.8,5.85,4.08,5.6);
  add(ball,dark,mx,my+13.2,mz+3.85,4.33,2.75,3.29);
  add(ball,emit(0x76ef49,.7),mx,my+13.6,mz+6.74,.88,.76,.51);
  add(ball,emit(0xe0fdc6,.52),mx-.19,my+13.88,mz+7.10,.21,.14,.16);
  const visor=[];
  for(let i=0;i<=24;i++){
    const a=Math.PI*i/24;visor.push(p(mx+4.85*Math.cos(a),my+12.1+4.14*Math.sin(a),mz+4.58+.56*Math.sin(a)));
  }
  pipe(visor,.28,edge,40);
  const jaw=new T.Shape();jaw.moveTo(-4.6,3.6);jaw.lineTo(-3.1,6.4);jaw.lineTo(-1.6,4.9);jaw.lineTo(.2,7.4);jaw.lineTo(3.8,6.05);jaw.lineTo(4.5,2.75);jaw.lineTo(1,1.1);jaw.lineTo(-2.4,1.6);jaw.closePath();
  const jawMesh=new T.ExtrudeGeometry(jaw,{depth:.24,bevelEnabled:true,bevelSegments:2,bevelSize:.14,bevelThickness:.13,curveSegments:16});
  add(jawMesh,gun,mx,my,mz+7.15);add(jawMesh,red,mx,my+.62,mz+7.58,.82,.82,.37);
  const throat=new T.Shape();
  throat.moveTo(-2.54,3.24);throat.lineTo(-1.52,4.61);throat.lineTo(-.60,4.12);throat.lineTo(.42,5.52);
  throat.lineTo(2.33,4.80);throat.lineTo(2.54,3.39);throat.lineTo(.59,2.43);throat.lineTo(-1.66,2.47);throat.closePath();
  add(new T.ShapeGeometry(throat),emit(0xff9e5e,.70),mx,my,mz+7.77);
  for(const [t,w] of [[2.73,2.51],[3.07,3.18],[3.41,4.72],[3.75,4.4],[4.09,3.58]]){
    add(box,patina,mx,my+t,mz+7.86,w,.09,.13);
  }
  for(let j=0;j<7;j++){
    const x=mx+(j-3)*1.2,y=my+1.7+.15*Math.cos(j);
    add(chamfer,edge,x,y,mz+7.38,.51,1.58,.8,0,.1*(j-3));
    add(drum,gun,x,y-.56,mz+7.70,.42,.29,.42);
  }
  const cuttingSteel=fieldSurfaceFinish(material(0xffffff,{vertexColors:true,metalness:.68,roughness:.34}),'metal');
  const bits=new T.InstancedMesh(drillBit(),cuttingSteel,6),mounts=[],bitPose=new T.Object3D();
  bits.frustumCulled=false;bits.castShadow=true;bits.receiveShadow=true;root.add(bits);
  for(const s of [-1,1]){
    const curve=pipe([p(mx+s*6.3,my+11.4,mz),p(mx+s*10.4,my+14.7,mz-.4),p(mx+s*14.5,my+14.4,mz+2),p(mx+s*17,my+9.2,mz+3.2)],1.40,copper);
    sleeve(curve,14,1.42,patina);
    for(const t of [.04,.91,.97]){
      const c=curve.getPointAt(t); ring(c.x,c.y,c.z,1.57,edge,curve.getTangentAt(t),1.2);
    }
    const x=mx+s*17,z=mz+3.2,y=my+8.8;
    add(chamfer,iron,x,y,z,3.25,2.8,2.65);
    add(chamfer,gold,x,y+.3,z,3.3,.3,2.75);
    for(let j=-1;j<=1;j++){
      add(box,gun,x+j*1.04,y-.12,z+2.35,.94,.49,.23,0,0,j*.04);
      add(box,j===0?gold:edge,x+j*1.04,y-.09,z+2.49,.74,.20,.08);
    }
    for(let j=0;j<3;j++){
      const dx=(j-1)*1.48,dy=y-1.05+(j===1?-.65:0);
      mounts.push({x:x+dx,y:dy,z:z+.46,turn:j*1.25,sign:s});
      add(drum,gun,x+dx,dy+.20,z+.46,.90,.38,.90);
      ring(x+dx,dy+.01,z+.46,.83,light);
    }
    block(x,z,2.8,9);
    add(box,gun,mx+s*5.75,my+6.5,mz+5.14,1.05,4.5,.44,-.18,s*.6,s*.25);
    for(let j=0;j<4;j++)add(box,edge,mx+s*5.7,my+5.1+j*.76,mz+5.42,.83,.15,.21,0,s*.61,s*.25);
    // Salvage pipe racks form continuous ribs around the back of the body.
    for(let j=0;j<3;j++){
      const cx=mx+s*(6.6+j*.8),cz=mz-5+j*2;
      rod(p(cx,my+.15,cz),p(cx+s*1.5,my+5.1,cz-.45),.56,iron);
    }
  }
  function idleMachinery(dt,time){
    for(const [index,m] of mounts.entries()){
      bitPose.position.set(m.x,m.y,m.z);bitPose.scale.set(1,1.13,1);
      bitPose.rotation.set(0,m.turn+m.sign*time*.56,0);bitPose.updateMatrix();
      bits.setMatrixAt(index,bitPose.matrix);
    }
    bits.instanceMatrix.needsUpdate=true;
  }
  idleMachinery(0,0);kit.animate(idleMachinery);
  function drillBit(){
    const n=44,rows=55,v=[],tints=[],idx=[];
    for(let j=0;j<rows;j++)for(let i=0;i<n;i++){
      const t=j/(rows-1),a=tau*i/n,spiral=2.*a+tau*t*2.8;
      const thread=.5+.5*Math.cos(spiral),flute=thread**3.8;
      const r=.83*(.025+.975*t)*(.65+.35*flute);
      v.push(r*Math.cos(a),-3.8+3.8*t,r*Math.sin(a));
      const edgeWear=.17+.62*flute*(.68+.32*Math.sin(spiral+.63)),tip=1-t;
      tints.push(edgeWear*(.82+.21*tip),edgeWear*(.87+.10*tip),edgeWear*(.89+.06*tip));
      if(j<rows-1){const k=j*n+i,b=j*n+(i+1)%n;idx.push(k,k+n,b,b,k+n,b+n);}
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v,3));
    geo.setAttribute('color',new T.Float32BufferAttribute(tints,3));geo.setIndex(idx);geo.computeVertexNormals();return geo;
  }
  // Right of the main clearing: the raised amber generator with a pale circular socket.
  function serviceSocket(x,z,size){
    const y=ground(x,z),r=size;
    add(chamfer,iron,x,y+.7*r,z,r,1.4*r,r);add(chamfer,ochre,x,y+1.48*r,z,r*1.05,.22*r,r*1.05);
    add(drum,gun,x,y+1.68*r,z,r*.63,.12*r,r*.63);ring(x,y+1.80*r,z,r*.50,light);
    add(drum,aqua,x,y+1.80*r,z,r*.35,.09*r,r*.35);
    for(let j=0;j<8;j++){
      const a=tau*j/8;add(box,light,x+.62*r*Math.cos(a),y+1.77*r,z+.62*r*Math.sin(a),r*.26,.2*r,.26*r,0,-a);
    }
    block(x,z,r,1.9*r);
  }
  serviceSocket(18,-6,2.9);
  // Metallic deck fragments at the lip of the native grey-green soil.
  // Keep the walking line between the panels and all of the landing apron clear.
  for(const side of [-1,1])for(let row=0;row<5;row++){
    const x=side*(9.0+1.2*Math.sin(row*.75)),z=12-row*4.35,y=ground(x,z);
    add(box,iron,x,y+.06,z,3.3,.18,4.18,0,side*.05);
    add(box,edge,x,y+.16,z,2.96,.06,3.86,0,side*.05);
    for(const dx of [-1.37,1.37])for(const dz of [-1.78,1.78])
      add(hex,gun,x+dx,y+.22,z+dz,.10,.068,.10);
    add(box,green,x+(side*.91),y+.21,z,.078,.045,1.18,0,side*.05);
  }
  for(let j=0;j<5;j++){
    const x=-28+j*2.4,z=-17-j*1.3,y=ground(x,z);
    add(chamfer,iron,x,y+1.15,z,1.40,2.2,1.20,-.32,0,-.20);
    add(chamfer,grime,x-.18,y+2.15,z+.15,1.23,.46,1.00,-.32,0,-.20);
    block(x,z,1.18,2.45);
  }
  for(let j=0;j<8;j++){
    const x=-11+j%4*2.9,z=-17-Math.floor(j/4)*2.7,y=ground(x,z);
    add(drum,gun,x,y+.32,z,.78,.64,.78);add(drum,purple,x,y+.88,z,.91,.30,.91);
    ring(x,y+.8,z,.75,edge);
  }
  for(let j=0;j<9;j++){rock(-29+3*j,-38-3*Math.sin(j*.9),2.4+j%3*.7,3+j%4,j);}
  // Map 47's apron is made of interlocking steel panels. Long hydraulic
  // scavenging pumps and half-buried ribs bring the machine down to eye level.
  const deckAsh=metal(0x899298),deckBlue=metal(0x637581),deckDune=metal(0xaaa897);
  for(let row=0;row<8;row++)for(let col=-1;col<=1;col++){
    const x=col*4.8+(row%2?.54:-.28),z=10-row*4.6;
    floorPanel(x,z,4.68,4.50,(row+col)%3?deckAsh:deckBlue);
    if(col===0&&row%3===1)for(const dx of [-1.1,0,1.1])
      inlay(x+dx,z,[[-.32,.3],[0,-.36],[.32,.3]],green,.083);
  }
  for(const [x,z,span,side] of [[-14,-6,9,-1],[15,-17,12,1],[-22,-33,12,-1]]){
    const y=ground(x,z),front=p(x,y+1.37,z+span*.5),back=p(x+side*1.6,y+1.63,z-span*.5);
    rod(front,back,1.17,iron);
    const dir=back.clone().sub(front).normalize();
    for(let k=0;k<=5;k++){
      const t=k/5,pos=front.clone().lerp(back,t);ring(pos.x,pos.y,pos.z,1.20,k%2?edge:copper,dir);
    }
    for(const s of [-1,1]){
      const a=front.clone().add(p(s*.83,.77,.3)),b=back.clone().add(p(s*.83,.77,-.45));
      rod(a,b,.135,copper);
    }
    for(const k of [0,.32,.65,1]){
      const pt=front.clone().lerp(back,k);add(chamfer,gun,pt.x,ground(pt.x,pt.z)+.55,pt.z,1.3,1.1,1.48);
      block(pt.x,pt.z,1.25,2.74);
    }
    for(let k=0;k<4;k++){
      const px=x+side*(2.5+(k%2)*2.1),pz=z-5+k*3.9;rock(px,pz,2.75+k%2*.9,1.9+k%3*.52,k);
    }
  }
  // Map 49: dark hexagonal lids sit over illuminated crystal columns. The
  // actual gully is cut from the terrain under the bases, so the cliffs have depth.
  const crystalMesh=(()=>{
    const verts=[],colors=[],idx=[],levels=[[0,.83,0xbcfff4],[.14,1,0x8ef0d9],[.62,1,0x4ebbb3],[.88,1,0x368c90],[1,.90,0x273f53]];
    for(let side=0;side<6;side++)for(let row=0;row<levels.length;row++){
      const [h,w,col]=levels[row],tone=new T.Color(col).convertSRGBToLinear().multiplyScalar(side%2?.94:1);
      for(let i=0;i<2;i++){
        const a=(side+i)*tau/6;verts.push(w*Math.sin(a),h,w*Math.cos(a));colors.push(tone.r,tone.g,tone.b);
      }
      if(row<levels.length-1){const a=(side*levels.length+row)*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    geo.setIndex(idx);geo.computeVertexNormals();return geo;
  })();
  const crystalMat=fieldSurfaceFinish(material(0xffffff,{vertexColors:true,metalness:.13,roughness:.30,emissive:0x0d5851,emissiveIntensity:.23}),'crystal');
  function energyStone(x,z,height,r,capTilt){
    const y=ground(x,z);
    add(crystalMesh,crystalMat,x,y,z,r,height,r);
    for(let j=0;j<6;j++){
      const a=tau*j/6,ax=x+r*Math.sin(a),az=z+r*Math.cos(a);
      rod(p(ax,y+height*.13,az),p(ax,y+height*.86,az),.024*r,aqua);
      // Fine stepped fissures lie just outside the front facet, embedded
      // in the crystal instead of detached bright strips above it.
      if(j%2===0){
        const b=a+tau/6,from=p(ax,y,az),to=p(x+r*Math.sin(b),y,z+r*Math.cos(b));
        const joint=(u,h)=>from.clone().lerp(to,u).add(p(.022*Math.sin(a+.52),height*h,.022*Math.cos(a+.52)));
        for(const [u0,h0,u1,h1] of [[.60,.73,.60,.59],[.60,.59,.40,.55],[.40,.55,.40,.36],[.40,.49,.23,.46],[.23,.46,.23,.40]])
          rod(joint(u0,h0),joint(u1,h1),.018*r,aqua);
      }
    }
    // An inset hexagon sits inside an armoured socket. The profile is cut
    // into each face so sunlight picks out a stepped rim above the dark ore.
    add(hex,iron,x,y+height-.50,z,r*1.09,.76,r*1.09);
    add(hex,edge,x,y+height-.12,z,r*1.085,.13,r*1.085);
    add(hex,gun,x,y+height+.02,z,r*1.03,.23,r*1.03,capTilt);
    add(hex,iron,x,y+height+.15,z,r*.77,.11,r*.77,capTilt);
    add(hex,dark,x,y+height+.21,z,r*.68,.08,r*.68,capTilt);
    const underside=new T.Vector3();
    for(let j=0;j<6;j++){
      const a=(j+.5)*tau/6,nx=Math.sin(a),nz=Math.cos(a),rr=.935*r;
      const at=p(x+nx*rr,y+height-.53,z+nz*rr);
      add(box,j%3===0?gold:patina,at.x,at.y,at.z,.34*r,.36,.13,0,a);
      if(j%2===0){
        underside.set(at.x+.3*Math.cos(a),y+height*.56,at.z-.3*Math.sin(a));
        rod(at,underside,.046*r,iron,hex);
      }
    }
    block(x,z,r*1.08,height+.3);
  }
  for(let j=0;j<14;j++){
    const x=-136+j*4.8,z=-81+5.6*Math.sin((x+108)*.082)+(j%3-1)*2.66;
    energyStone(x,z,13.8+4.35*Math.sin(j*1.87)+j%3*.9,1.65+j%3*.35,(j%2?.06:-.04));
  }
  // The painted gorge has a continuous torn lip. Mineral columns emerge
  // through the cliff, with dark hanging seams over the luminous lower wall.
  const roseCliff=fieldSurfaceFinish(material(0xad7479,{roughness:.95,vertexColors:true}),'stone');
  const deepCliff=fieldSurfaceFinish(material(0x457d7d,{roughness:.91,vertexColors:true}),'stone');
  for(const side of [-1,1])for(let n=0;n<11;n++){
    const x=-138+n*6.6,axis=-81+5.6*Math.sin((x+108)*.082),z=axis+side*(5.0+1.45*Math.cos(n*2.6));
    const y=ground(x,z),w=4.45+1.36*Math.cos(n*.77)**2,d=2.5+.55*Math.sin(n*3.1+.4);
    const h=3.2+1.35*Math.sin(n*2.1+side),g=beds[(n+2+side)%3];
    add(g,deepCliff,x,y-.42,z-side*.4,w,h+2.5,d,0,.14*Math.sin(n),-.08*Math.cos(n));
    add(g,side>0?roseCliff:rockTone[n%4],x,y+h*.37,z,w*1.05,h*.62,d*1.15,0,.13*Math.sin(n),-.04*Math.cos(n));
    for(const dx of [-w*.52,0,w*.52])block(x+dx,z,d*.93,Math.max(1,y+h*.83-ground(x+dx,z)));
    for(let k=0;k<5;k++){
      const sx=x-2.5+k*1.15,sz=z-side*d*(.67+.13*Math.sin(k+n)),sy=y+h*.30-.16*k;
      const bottom=p(sx+.27*Math.sin(k+n),sy-1.8-(k*7+n)%4,sz-side*.48);
      rod(p(sx,sy,sz),bottom,.075+.02*(k%3),k%3?gun:patina,hex);
      if(k%3===0)rod(bottom,bottom.clone().add(p(.11,-.45,0)),.06,aqua,hex);
    }
  }
  // Bench terraces visible from the arrival bank. The earlier low cliff follows
  // the channel floor; these outcrops expose its geology above the rim itself.
  const graphite=fieldSurfaceFinish(material(0x62636b,{roughness:.85,vertexColors:true}),'stone');
  for(const [x,z,w,h,d,far] of [
    [-132,-64,5.4,1.95,2.75,0],[-122,-66,4.7,1.15,2.5,0],[-116,-70.4,4.3,1.36,2.45,0],
    [-98,-68.2,4.3,1.8,2.82,0],[-89,-71.5,5.1,2.45,3.0,0],[-81,-75,4.4,2.64,2.7,0],
    [-123,-86.2,6.2,3.28,3.9,1],[-114,-88.4,4.4,2.36,3.1,1],[-105,-89.6,5.2,2.65,3.1,1],[-93,-90.5,5.6,2.38,3.65,1]
  ]){
    const y=ground(x,z),a=.23*Math.sin(z);
    add(beds[far?1:2],far?rockTone[1]:graphite,x,y+h*.16,z,w,h*1.34,d,0,a,-.12);
    add(beds[0],far?rockTone[0]:roseCliff,x-.26,y+h*.67,z+.13,w*.93,h*.75,d*.98,0,a-.06,-.08);
    for(const u of [-.55,0,.55])block(x+u*w,z,d*.82,Math.max(.42,y+h*1.16-ground(x+u*w,z)));
  }
  // Small broken prismatic tips and translucent glints scatter at the bank,
  // preserving the empty foreground of the return gate and the footpath.
  const splitTip=new T.ConeGeometry(1,1,5),mineralTeal=fieldSurfaceFinish(material(0x439c9a,{metalness:.2,roughness:.35}),'crystal');
  for(const [x,z,s] of [[-115,-66.6,1.05],[-119,-62.1,.72],[-100,-65.8,.67],[-92,-63.3,1.18],[-82,-72.4,.94]]){
    for(let k=0;k<5;k++){
      const a=k*2.4,dx=x+Math.cos(a)*(.28+.16*k)*s,dz=z+Math.sin(a)*(.29+.13*k)*s,h=(.72+.25*(k%3))*s;
      const y=ground(dx,dz),size=s*(.24+.09*(k%2));
      add(crystalMesh,crystalMat,dx,y-.08,dz,size,h,size,.12*Math.cos(a),a,.16*Math.sin(a));
      add(splitTip,mineralTeal,dx+.12*h*Math.sin(a),y+h+.02,dz-.12*h*Math.cos(a),size,.46*s,size,.12*Math.cos(a),a,.16*Math.sin(a));
    }
    block(x,z,s*.72,s*1.52);
  }
  // Geodesic observation hoods, visible hardware and finned foundations.
  const glass=applyWindowFresnel(material(0x83d9d9,{roughness:.17,metalness:.14,transparent:true,opacity:.47,depthWrite:false}));
  const cage=new T.IcosahedronGeometry(1,1),cageLines=new T.EdgesGeometry(cage,1);
  const pos=cageLines.getAttribute('position'),legs=6;
  function dome(x,z,r){
    const y=ground(x,z),h=r*.84;add(drum,light,x,y+.42,z,r*1.04,.85,r*1.04);
    add(cap,glass,x,y+.78,z,r,h,r);
    for(let i=0;i<pos.count;i+=2){
      const a=p(pos.getX(i),pos.getY(i),pos.getZ(i)),b=p(pos.getX(i+1),pos.getY(i+1),pos.getZ(i+1));
      if(a.y<0&&b.y<0)continue;
      if(a.y<0)a.lerp(b,-a.y/(b.y-a.y));
      if(b.y<0)b.lerp(a,-b.y/(a.y-b.y));
      rod(p(x+a.x*r,y+.79+a.y*h,z+a.z*r),p(x+b.x*r,y+.79+b.y*h,z+b.z*r),.024*r,edge);
    }
    for(let i=0;i<legs;i++){
      const a=i*tau/legs;add(box,iron,x+r*Math.cos(a),y+.50,z+r*Math.sin(a),r*.4,.86,r*.23,0,-a);
      const dx=x+r*Math.cos(a),dz=z+r*Math.sin(a);
      add(box,edge,dx,y+.82,dz,r*.35,.083,r*.23,0,-a);
      for(const side of [-1,1])add(hex,gun,dx-.10*r*side*Math.sin(a),y+.89,dz+.10*r*side*Math.cos(a),.058,.065,.058);
    }
    add(chamfer,green,x,y+1.04,z,r*.34,.34,r*.34);
    for(let j=0;j<5;j++){
      const a=tau*j/5,dx=x+.34*r*Math.cos(a),dz=z+.34*r*Math.sin(a);
      add(chamfer,j%2?grime:iron,dx,y+1.15+r*.09,dz,r*.19,r*.26,r*.23,0,a);
      add(chamfer,j%2?green:aqua,dx,y+1.30+r*.16,dz,r*.11,r*.19,r*.14,0,a);
      add(box,gun,x+.77*r*Math.cos(a),y+.76,z+.77*r*Math.sin(a),r*.43,.22,r*.26,0,-a);
    }
    block(x,z,r*1.01,.8+h);
  }
  for(const [x,z,r] of [[-124,-101,4.2],[-112,-108,5.5],[-99,-103,3.6],[-92,-112,3.8],[-83,-104,4.2]])dome(x,z,r);
  cage.dispose();cageLines.dispose();
  for(let j=0;j<5;j++){
    const x=-132+j*3.32,z=-62-j*1.12,y=ground(x,z);
    rod(p(x-1.66,y+.67,z+.56),p(x+1.66,y+.67,z-.56),.67,gun);
    ring(x+1.61,y+.67,z-.55,.75,copper,p(1,0,-.336).normalize());
    add(box,iron,x,y+.24,z,1.2,.49,2);block(x,z,.93,1.48);
  }
  // The circular red-edged station in the lower left of map 49 is door_0 to map 46.
  const px=-114,pz=-53,py=ground(px,pz);
  add(drum,iron,px,py+.055,pz,2.86,.11,2.86);ring(px,py+.12,pz,2.44,red);
  add(drum,chartreuse,px,py+.13,pz,1.78,.08,1.78);ring(px,py+.19,pz,1.36,light);
  for(let j=0;j<8;j++){
    const a=j*tau/8;add(box,edge,px+2.66*Math.cos(a),py+.24,pz+2.66*Math.sin(a),.5,.38,.48,0,-a);
  }
  kit.portal(px,pz,'alpha','alpha-station',3.5);
  ruins();training();summoningHall();finishDeck();
  function ruins(){
    const x=102,z=-31,y=ground(x,z);
    for(let j=0;j<6;j++){
      const dx=x-16+j*5.88,ht=6.1+3*Math.sin(.79+j);
      add(box,iron,dx,y+ht*.48,z,5.63,ht,2.55,0,0,.075*Math.cos(j));block(dx,z,2.85,ht);
      add(chamfer,j%2?ochre:light,dx,y+ht-.22,z,3.36,.74,2.30);
      for(let k=0;k<2;k++){
        rod(p(dx-1.65+k*2.1,y+.6,z+1.5),p(dx-1.45+k*2.1,y+ht-.2,z+1.5),.36,copper);
        for(let n=0;n<3;n++)ring(dx-1.5+k*2.1,y+1.1+n*1.43,z+1.55,.39,gun);
      }
      if(j%2===0)rock(dx+.7,z+2.95,2.6,1.6,(j+2)%4);
    }
    const beamCurve=pipe([p(x-19,y+7,z-2),p(x-8,y+9,z-1),p(x+5,y+8.5,z-3),p(x+21,y+6.4,z)],.89,iron);
    sleeve(beamCurve,12,.91,edge);
    const end=beamCurve.getPoint(1),axis=beamCurve.getTangent(1).normalize();
    ring(end.x,end.y,end.z,.88,patina,axis);
    for(let i=0;i<5;i++){
      const a=i*tau/5,start=end.clone().add(p(0,.48*Math.cos(a),.48*Math.sin(a)));
      const split=start.clone().addScaledVector(axis,.78+.32*i);split.y-=.29+.12*i;split.z+=.35*Math.sin(a);
      rod(start,split,.053,i%2?copper:gun);
      rod(split,split.clone().add(p(.16,-.08*i,.13)),.029,edge);
    }
    for(let j=0;j<3;j++){
      const cx=x+15.3,cz=z+6+j*3.25,h=6.8-j*.93;
      add(box,ochre,cx,y+h,cz,5.2,1.1,4.0,0,.19,-.34);
      add(box,gold,cx-.12,y+h+.47,cz,5.35,.16,3.95,0,.19,-.34);
      rock(cx+1,cz+1.1,2.6,h*.96,j);
    }
    // Floor grates are level with the deck. Their back plates read as open slots.
    for(let j=0;j<6;j++){
      const gx=x-10+j*2.74,gz=z+13+.7*j,gy=ground(gx,gz);
      plate(gx,gz,2.85,2.1,dark);
      for(let k=0;k<4;k++)add(box,edge,gx-1+k*.63,gy+.093,gz,.15,.055,2.1,0,.20);
    }
    // One continuous diagonal trench replaces the broken tiles in the apron.
    // Its twin copper runs are visible through the lattice from the entrance.
    for(let j=0;j<7;j++){
      const gx=x-11.5+j*3.3,gz=z+16-j*.66,gy=ground(gx,gz);
      floorPanel(gx,gz+3.0,3.15,3.5,j%2?deckAsh:deckDune);
      inlay(gx,gz,[[-1.62,-.97],[1.62,-1.56],[1.62,.38],[-1.62,.98]],dark,.087);
      for(const t of [-.37,.29])rod(p(gx-1.58,gy+.10,gz+t+.31),p(gx+1.58,gy+.10,gz+t-.31),.053,copper,hex);
      for(let k=0;k<3;k++)for(const s of [-1,1]){
        const dx=-1.03+.95*k;rod(p(gx+dx-.36,gy+.18,gz-.65-dx*.20),p(gx+dx+.36*s,gy+.18,gz+.6-dx*.20),.047,light,hex);
      }
    }
    const capRock=beds[2];
    for(const side of [-1,1])for(let k=0;k<4;k++){
      const dx=x+side*(9.5+3.25*k),dz=z-2+1.5*Math.cos(k*2.14),gnd=ground(dx,dz);
      add(capRock,rockTone[(k+2)%4],dx,gnd+6.1,dz,4.6,4.9+.7*Math.cos(k),3.1,.08,.47*k,-.16*side);
      block(dx,dz,2.8,9.4);
      add(box,patina,dx,gnd+3.0,dz,2.3,5.6,2.3,0,.28*k,.17*side);
      if(k%2===0)for(let j=0;j<3;j++){
        const sx=dx-1+j*.64;rod(p(sx,gnd+5.6,dz+2.3),p(sx+.2*side,gnd+3.8-j*.38,dz+2.56),.076,j===1?copper:gun,hex);
      }
    }
  }
  function training(){
    const x=-185,z=-89,y=ground(x,z);
    for(let j=0;j<4;j++){
      const a=x-5.5+j*3.7;
      add(box,plum,a,y+2.1,z,2.73,4.2,1.70);block(a,z,1.35,4.2);
      add(chamfer,gold,a,y+.30,z,1.85,.60,1.1);
      ring(a,y+2.57,z+.89,.76,gold,axisZ);add(ball,green,a,y+2.55,z+.97,.31,.33,.14);
      pipe([p(a-.97,y+4.24,z-.55),p(a-.66,y+5.15,z-.49),p(a+.82,y+5.03,z-.58)],.113,gun,10);
    }
    for(let j=0;j<6;j++){
      const xx=x-12.8,level=.45+j*.64,zz=z+8.4-j*2;
      add(box,iron,xx,y+level*.5,zz,4.1,level,1.92);
      add(box,light,xx,y+level+.07,zz,4.26,.14,1.93);
      block(xx,zz,1.35,level);
    }
    const xx=x+11;for(const s of [-1,1]){
      add(box,gun,xx+s*3,y+2.7,z+.5,.85,5.4,1.26);block(xx+s*3,z+.5,.64,5.4);
    }
    for(let k=0;k<4;k++)rod(p(xx-2.7,y+.95+k*.9,z+.49),p(xx+2.7,y+.95+k*.9,z+.49),.095,aqua);
    ring(x+6,y+.11,z+5.1,1.45,light);
    add(drum,chartreuse,x+6,y+.085,z+5.1,1,.07,1);
    for(let row=0;row<3;row++)for(let c=-2;c<=2;c++){
      const dx=x+c*4.5,dz=z+2.6+row*4.15;floorPanel(dx,dz,4.39,4.0,row===1?deckDune:deckAsh);
      if(row!==0&&c%2===0)for(let k=0;k<5;k++)inlay(dx-1.4+k*.56,dz-1.44,[[-.16,-.22],[.14,-.22],[.32,.22],[.02,.22]],chartreuse,.081);
    }
    // Rear gallery and broken cantilever, supported along the back wall only.
    for(let k=0;k<5;k++){
      const dx=x-13+k*6.2,dz=z-5.4,hh=6.1+(k===4?.36:0);
      add(box,iron,dx,y+hh,dz,6.06,.52,4.25,0,0,k===4?.09:0);
      add(box,edge,dx,y+hh+.28,dz,5.86,.12,4.04);
      for(const sx of [-2.3,2.3]){
        add(box,plum,dx+sx,y+2.84,dz-.55,.49,5.66,.78);block(dx+sx,dz-.55,.43,hh+.30);
        rod(p(dx+sx,y+3.85,dz-.56),p(dx+sx*.35,y+hh-.29,dz+1.65),.155,ochre,hex);
      }
      add(box,gun,dx,y+hh-.47,dz+1.72,6.02,.47,.23);
      for(let j=0;j<4;j++)add(box,j%2?gold:light,dx-2.3+j*1.4,y+hh-.40,dz+1.87,.57,.25,.10,0,0,-.24);
      if(k%2===0)rock(dx,dz-3.8,4.5,6.9+k*.22,k);
    }
    const face=metal(0x625278),casing=metal(0xa3aba0),navy=metal(0x3b424d);
    // Behind the four heads the resource shows a purple maintenance wall,
    // broken green-grey plate lips and a loose bundle of downward cable loops.
    for(let j=0;j<6;j++){
      const dx=x-11.36+j*4.49,dz=z-3.15,height=5.26+.28*Math.sin(j*1.57);
      add(box,face,dx,y+2.5,dz,4.42,5.05,1.12);block(dx,dz,1.72,5.35);
      for(const s of [-1,1])add(box,navy,dx+s*1.94,y+2.56,dz+.59,.14,4.8,.12);
      add(box,casing,dx,y+height,dz+.24,4.75,.49,2.7,0,0,.07*Math.cos(j));
      add(box,deckDune,dx,y+height+.30,dz+.29,4.48,.12,2.58,0,0,.07*Math.cos(j));
      if(j===2||j===3)for(let k=0;k<3;k++){
        const a=dx-1.37+k*.90;pipe([p(a,y+height-.06,dz+.98),p(a+.15,y+height-1.03-.19*(k%2),dz+1.18),
          p(a+.72,y+height-1.13-.14*k,dz+1.10),p(a+1.1,y+height-.10,dz+1.05)],.095,gun,12);
      }
      if(j===0||j===5){
        add(box,navy,dx,y+2.90,dz+.70,2.20,2.02,.13);
        for(let k=0;k<6;k++)add(box,edge,dx-.82+.32*k,y+2.85,dz+.81,.13,1.19,.09,0,0,-.12);
      }
    }
    for(let j=0;j<4;j++){
      const dx=x-5.5+j*3.7;
      for(const side of [-1,1]){
        add(chamfer,ochre,dx+side*.92,y+.47,z+.50,.62,.96,.63,0,0,-side*.24);
        rod(p(dx+side*.75,y+3.06,z+.89),p(dx+side*.99,y+4.08,z+.72),.075,gold,hex);
      }
      add(drum,navy,dx,y+2.51,z+.96,.47,.17,.47,Math.PI/2);
      add(ball,green,dx,y+2.51,z+1.09,.205,.24,.09);
      ring(dx,y+2.51,z+1.064,.32,edge,axisZ);
      for(let k=0;k<3;k++){
        const a=tau*k/3;
        add(hex,gun,dx+.35*Math.cos(a),y+2.51+.35*Math.sin(a),z+1.081,.050,.078,.050,Math.PI/2);
      }
    }
    for(let k=0;k<4;k++){
      const h=y+.98+k*.87;
      rod(p(xx-2.72,h,z+.51),p(xx+2.72,h-.14,z+.51),.22,aqua);
      rod(p(xx-2.72,h+.05,z+.70),p(xx+2.72,h-.09,z+.70),.075,material(0xd4ffff,{emissive:0x85ffff,emissiveIntensity:.72}));
    }
    for(const [sx,sz,h] of [[-9.4,-.9,5.57],[2.35,-2.37,5.74]]){
      const dx=x+sx,dz=z+sz;
      add(box,navy,dx,y+h,dz,1.22,1.87,.87,0,-.24,-.36);
      add(box,purple,dx-.10,y+h+.20,dz+.44,1.07,1.49,.12,0,-.24,-.36);
      add(ball,gun,dx+.30,y+h-.48,dz+.62,.48,.52,.35);add(ball,green,dx+.27,y+h-.43,dz+.89,.28,.35,.11);
    }
    for(let k=0;k<3;k++){
      const dx=x+11.6,dz=z-7.5;
      add(box,navy,dx,y+7.18+k*.72,dz,3.2,.70,1.3,.12,-.30,.08);
      add(box,green,dx,y+7.18+k*.72,dz+.65,1.85-.38*k,.17,.09,0,-.31,.11);
    }
  }
  function summoningHall(){
    const cx=-255,cz=-150,y=ground(cx,cz),shell=metal(0x34313c),wall=metal(0x534452);
    const plating=metal(0x645774),fascia=metal(0x76528a),lichen=metal(0x868751);
    const limeLine=emit(0xacc742,.33),cyanLine=emit(0x2bc7e2,.46),olive=material(0x5b622b,{roughness:.9});
    fieldSurfaceFinish(olive,'coating');
    const inset=metal(0x28323f),grille=metal(0x657684),canvasStone=metal(0x8f8878);
    const arc=new T.TorusGeometry(1,.15,12,52,Math.PI),trim=new T.TorusGeometry(1,.045,8,52,Math.PI);
    const panel=(x,z,w,h,d,m,gap=.025)=>add(box,m,cx+x,y+h/2+gap,cz+z,w,h,d);
    const at=(x,h,z)=>p(cx+x,y+h,cz+z);
    function rib(x1,h1,z1,x2,h2,z2,r,m){rod(at(x1,h1,z1),at(x2,h2,z2),r,m,hex);}
    function barrier(x1,z1,x2,z2,h,d,m){
      const dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz),steps=Math.ceil(len/(d*.9)),yaw=Math.atan2(dx,dz);
      add(box,m,cx+(x1+x2)/2,y+h/2,cz+(z1+z2)/2,d,h,len,0,yaw);
      for(let k=0;k<=steps;k++){
        const x=cx+x1+dx*k/steps,z=cz+z1+dz*k/steps;block(x,z,d*.58,Math.max(.6,y+h-ground(x,z)));
      }
    }
    // Interlocking roof bands form a solid vault, open at the entrance and
    // around the bent rear passage. The central front of the hall stays clear.
    const sections=[[-16,6.1],[-14.1,9],[-9.2,11.4],[-3.9,12.9],[3.9,12.9],[9.2,11.4],[14.1,9],[16,6.1]];
    for(let i=0;i<sections.length-1;i++){
      const [a,h0]=sections[i],[b,h1]=sections[i+1],h=(h0+h1)/2;
      const length=Math.hypot(b-a,h1-h0),tilt=Math.atan2(h1-h0,b-a);
      add(box,i%2?wall:shell,cx+(a+b)/2,y+h,cz+.5,length+.11,.52,31.8,0,0,tilt);
      kit.cover(cx+(a+b)/2,cz+.5,(b-a)/2,15.9,Math.min(h0,h1)-.32,Math.max(h0,h1)+.35);
      for(const z of [-13,-7.2,.1,7.8,15.6])rib(a,h0-.31,z,b,h1-.31,z,.17,purple);
    }
    for(const s of [-1,1]){
      barrier(s*16,-15.0,s*16,15.6,6.4,1.35,wall);
      for(let n=0;n<5;n++){
        const z=-12+5.4*n;
        panel(s*15.5,z,.8,6.1,1.4,fascia);
        for(const h of [3.5,4.2,4.77])rib(s*15.22,h,z-2.5,s*15.22,h,z+2.4,.12,h>4.5?gold:patina);
        rib(s*15,5.5,z,s*13.7,8.7,z,.20,gun);
      }
    }
    // Behind the key: the original central aperture shows successive blue
    // reveals and a graded threshold. Offset the far exit to keep the front
    // view enclosed while leaving a real route through the room.
    barrier(-14.8,-14.5,-5.2,-14.5,9.2,1.65,shell);
    barrier(5.2,-14.5,14.8,-14.5,9.2,1.65,shell);
    // Close the whole north gable up to the pitched shell. The passage remains
    // a physical cut-out through its lower centre, open from both directions.
    const gable=new T.Shape();gable.moveTo(-16.15,-.2);gable.lineTo(-3.6,-.2);
    gable.lineTo(-3.6,5.0);gable.lineTo(-2.7,6.83);gable.lineTo(2.7,6.83);gable.lineTo(3.6,5);gable.lineTo(3.6,-.2);gable.lineTo(16.15,-.2);
    for(const [x,h] of [...sections].reverse())gable.lineTo(x,h+.33);
    gable.closePath();add(new T.ExtrudeGeometry(gable,{depth:.47,bevelEnabled:false}),wall,cx,y,cz-14.9);
    kit.cover(cx,cz-14.6,3.6,.4,6.72,13.32);
    for(const s of [-1,1])for(const z of [-14.37,-14.16]){
      rib(s*14,8.8,z,s*8.9,10.95,z,.19,gun);rib(s*8.9,10.95,z,s*3.6,12.42,z,.19,gun);
    }
    barrier(-4.1,-11.2,-4.1,-23,7.6,1.1,inset);
    barrier(4.1,-11.2,4.1,-17.8,7.6,1.1,inset);
    barrier(-4.1,-23,4.1,-23,7.5,1.1,inset);
    add(box,shell,cx,y+7.55,cz-17.1,8.8,.47,12.2);
    kit.cover(cx,cz-17.1,4.4,6.1,7.2,7.9);
    for(let n=0;n<4;n++){
      const z=-12-n*2.55;
      for(const s of [-1,1]){
        if(s===1&&z<-17.8)continue;
        add(box,plating,cx+s*3.45,y+2.5,cz+z,.62,5,1.03,0,0,-s*.055);
        rib(s*3.40,4.83,z,s*2.48,6.42,z,.39,plating);
      }
      add(box,grille,cx,y+.045,cz+z,5.9,.08,1.14);
    }
    // Armoured door faces follow the irregular stepped feet of the resource.
    const leaf=new T.Shape();leaf.moveTo(-2.75,.12);leaf.lineTo(-2.72,3.85);
    leaf.bezierCurveTo(-2.64,6.14,-1.30,7.37,.18,7.28);leaf.bezierCurveTo(1.93,7.06,2.78,5.41,2.74,3.68);
    for(const [x,h] of [[2.65,.41],[1.82,.37],[1.55,1.13],[1.08,.99],[.83,.22],[-.32,.24],[-.64,1.06],[-1.13,1.17],[-1.45,.18]])leaf.lineTo(x,h);
    leaf.closePath();
    const door=new T.ExtrudeGeometry(leaf,{depth:.53,bevelEnabled:true,bevelSize:.09,bevelThickness:.10,bevelSegments:2,curveSegments:18});
    for(let j=-1;j<=1;j++){
      const x=j*8.68,z=j===0?-10.1:-8.2,r=j===0?4.05:3.46,shoulder=4.1;
      for(const s of [-1,1]){
        panel(x+s*r,z,1.05,shoulder,1.95,fascia);block(cx+x+s*r,cz+z,.76,shoulder+r+.67);
        panel(x+s*r,z+.13,1.40,.43,2.35,gun);
        add(box,limeLine,cx+x+s*r,y+2.2,cz+z+.97,.075,3.55,.074);
      }
      add(arc,fascia,cx+x,y+shoulder,cz+z,r,r,4.6);
      add(trim,limeLine,cx+x,y+shoulder,cz+z+.76,r*.92,r*.92,1.0);
      add(trim,gun,cx+x,y+shoulder,cz+z+.56,r*1.11,r*1.11,2.1);
      if(j){
        add(door,lichen,cx+x,y,cz+z-.3);block(cx+x,cz+z-.27,2.65,7.48);
        const ex=x-.18*j,eh=4.05;
        add(drum,gun,cx+ex,y+eh,cz+z+.38,.99,.31,.99,Math.PI/2);
        ring(cx+ex,y+eh,cz+z+.62,.83,olive,axisZ);
        add(ball,grime,cx+ex,y+eh,cz+z+.63,.65,.77,.18);
        add(ball,limeLine,cx+ex-.08,y+eh+.02,cz+z+.79,.25,.47,.09,0,0,-.40);
        for(const [a,b] of [[[-2.57,2.32],[-1.52,2.71]],[[-1.52,2.71],[-1.81,1.25]],[[1.02,3.12],[1.90,1.04]],[[0,3.08],[.15,1.82]]])
          rib(x+a[0],a[1],z+.37,x+b[0],b[1],z+.37,.088,gun);
      }else{
        const key=new T.Shape();key.moveTo(-1.14,.69);key.lineTo(1.14,.69);key.lineTo(.67,-.77);key.lineTo(-.67,-.77);key.closePath();
        add(new T.ExtrudeGeometry(key,{depth:.55,bevelEnabled:true,bevelSize:.07,bevelThickness:.09,bevelSegments:1}),lichen,cx,y+7.15,cz+z+.21);
        const sign=new T.Shape();sign.moveTo(-.58,.41);sign.lineTo(.58,.41);sign.lineTo(0,-.45);sign.closePath();
        add(new T.ShapeGeometry(sign),green,cx,y+7.16,cz+z+.88);
      }
    }
    // Plan view of 502: sockets are not a symmetric four-way cross. The green
    // lens is behind the dais, the red is to the right, and the blue is nearer.
    const deckBase=metal(0x4a4257),neonBlue=emit(0x55adf5,.30),neonRed=emit(0xf46573,.31),neonGreen=emit(0x72be59,.29);
    inlay(cx,cz,[[-12.8,-7.5],[12.4,-7.5],[13.5,-3.7],[12.1,5.5],[6.2,7.7],[-9.4,7.7],[-12.9,4.9]],deckBase,.064,.78);
    add(drum,gun,cx,y+.14,cz+.1,3.36,.20,3.36);
    add(drum,olive,cx,y+.26,cz+.1,3.11,.18,3.11);
    ring(cx,y+.36,cz+.1,2.76,limeLine);
    add(drum,emit(0xd3dc4f,.24),cx,y+.38,cz+.1,2.62,.08,2.62);
    add(drum,emit(0xe5e868,.18),cx,y+.43,cz+.1,2.21,.05,2.21);
    for(const [x,z,m] of [[-4.66,1.66,neonBlue],[5.07,.34,neonRed],[-.18,-4.67,neonGreen]]){
      const r=1.11;
      add(drum,inset,cx+x,y+.12,cz+z,r,.18,r);ring(cx+x,y+.20,cz+z,.92,grille);
      add(drum,m,cx+x,y+.243,cz+z,.77,.093,.77);add(drum,material(0xcdd5c5,{transparent:true,opacity:.22,roughness:.21}),cx+x,y+.30,cz+z,.53,.025,.53);
      for(let j=0;j<6;j++){
        const a=j*tau/6,dx=cx+x+.84*Math.cos(a),dz=cz+z+.84*Math.sin(a);
        add(box,olive,dx,y+.245,dz,.17,.08,.25,0,-a);
        add(hex,grille,dx,y+.298,dz,.037,.028,.037);
      }
    }
    // Route the glow as planar inlays. Each strip follows the real entry ramp;
    // the V-shaped sockets, maintenance openings and rivets stay underfoot.
    function strip(path,width,m,lift){
      for(let j=1;j<path.length;j++){
        const [x,z]=path[j-1],[u,v]=path[j],l=Math.hypot(u-x,v-z),a=(v-z)/l*width/2,b=(x-u)/l*width/2;
        const count=Math.ceil(l/1.1);
        for(let k=0;k<count;k++){
          const sx=x+(u-x)*k/count,sz=z+(v-z)*k/count,tx=x+(u-x)*(k+1)/count,tz=z+(v-z)*(k+1)/count;
          inlay(cx,cz,[[sx-a,sz-b],[tx-a,tz-b],[tx+a,tz+b],[sx+a,sz+b]],m,lift);
        }
      }
    }
    function seam(path,m){
      strip(path,.29,gun,.155);strip(path,.105,m,.18);
    }
    // Wide blue service channel left of the arena, inset into its slanted rim.
    const trough=[[-13.0,7.5],[-10.5,8.4],[-6.1,-2.49],[-8.55,-3.48]];
    inlay(cx,cz,trough,inset,.10,.76);strip([[-11.73,7.91],[-7.28,-2.97]],1.74,emit(0x268eb9,.17),.139);
    seam([[-12.9,7.56],[-8.54,-3.37],[-6.19,-2.43]],limeLine);
    for(let k=0;k<4;k++)seam([[-11.3+k*.74,6.31-k*1.78],[-11.06+k*.74,5.63-k*1.78],[-10.53+k*.74,5.83-k*1.78]],cyanLine);
    for(const s of [-1,1])seam([[s*13,-6.56],[s*6.32,-6.55],[s*4.83,-8.78],[s*3.81,-9.08]],limeLine);
    for(const [x,z,points] of [[-4.66,1.66,[[-3.67,1.4],[-3.12,1.21]]],[5.07,.34,[[3.99,.34],[3.42,.17]]],[-.18,-4.67,[[-.18,-3.61],[.18,-3.17]]]]){
      seam([[x,z],...points],limeLine);
    }
    for(let row=0;row<5;row++)for(let col=-3;col<=3;col++){
      const x=4.0*col+(row%2?.68:0),z=7.4+row*2.08;
      floorPanel(cx+x,cz+z,3.91,2.04,(row+col)%3?canvasStone:deckDune,.85);
    }
    for(const track of [
      [[-13,15],[-8,15],[-8,12.6],[-4,12.6],[-3.15,11.3],[.68,11.3],[1.56,9.91],[1.56,7.91]],
      [[12.1,8.2],[8.42,8.2],[7.1,9.48],[4.15,9.48],[3.29,10.62],[1.58,10.62]],
      [[-10.5,7.01],[-8.0,7.01],[-7.37,7.95],[-5.32,7.95],[-5.32,9.12],[-2.00,9.12]],
      [[-1.58,15.3],[-1.58,13.4],[2.55,13.4],[3.07,12.79],[8.51,12.79]]
    ])seam(track,track[0][0]>0||track[0][0]===-10.5?limeLine:cyanLine);
    // Dense climbing roots hug the flanks, cross just above the right eye and
    // loop through the conduits without closing the central walking line.
    const shoots=fieldSurfaceFinish(material(0x646f30,{roughness:.87}),'stem');
    const vines=fieldSurfaceFinish(material(0x4c5124,{roughness:.88}),'stem');
    for(const s of [-1,1])for(let n=0;n<5;n++){
      const x=s*(13.2+.47*n),z=-11+3.9*n;
      const vine=pipe([at(x+s*.9,9.5,z-1.8),at(x-s*1.3,7.8,z-1),at(x+s*.45,6.0,z+.35),
        at(x-s*1.13,3.7,z+.79),at(x+s*.40,1.25,z+.16),at(x-s*1.75,.53,z+1.9),at(x-s*3.25,.42,z+3.1)],.24+.062*(n%3),n%2?shoots:vines,30);
      for(let k=1;k<6;k++){
        const u=vine.getPointAt(k/7);
        add(chamfer,shoots,u.x+s*.15,u.y+.20,u.z+.23,.24,.45,.15,.40,n*.79,s*.43);
      }
    }
    for(const [x,h,z,a,b] of [[8.6,4.6,-7.33,1.2,1.33],[9.34,6.6,-6.9,1.25,.72],[-9.52,8.2,-7.08,.79,1.19],[13.36,3.44,-1.80,1.63,1.10]]){
      const pts=[];for(let k=0;k<=20;k++){
        const t=k/20*Math.PI*2.15;pts.push(at(x+Math.cos(t)*a,h+Math.sin(t)*b,z+.28*Math.sin(t*2)));
      }
      pipe(pts,.12,shoots,30);
    }
  }
}
