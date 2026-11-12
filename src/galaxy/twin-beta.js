// The five scenes follow Taomee's resource/map/{47,48,49,501,502}.swf.
// X/Z describe one survey in metres. Reverse sides, distances and ramps connect
// the original stage views without moving the visitor between separate maps.
const BETA_WORLD=defineTwinWorld({
  id:'beta',name:'双子贝塔星',radius:35000,lat:.19,lon:-.47,
  sites:[
    {id:'beta-plain',name:'双子贝塔星',x:0,z:0,mapId:47,lookAt:[4,-32],lookPitch:.22,description:'红褐色巨型掘进机。单目绿灯下方是红色进气口，两条节臂垂下三枚锥钻。'},
    {id:'beta-waste',name:'贝塔星荒原',x:-105,z:-60,mapId:49,lookAt:[-108,-78],lookPitch:.08,description:'青光裂谷贯穿六角电能石层。隔岸可以看见成组的玻璃罩勘察站；左侧圆台通往双子阿尔法星海盗能源站。'},
    {id:'beta-ruins',name:'海盗要塞废墟',x:102,z:-9,mapId:48,lookAt:[108,-31],description:'赭黄装甲塌入灰岩，横断的管束、格栅地沟和破裂的舱壁从断层中露出。'},
    {id:'beta-training',name:'海盗训练场',x:-185,z:-76,mapId:501,lookAt:[-184,-89],description:'分层校准台前立着四座紫色机柱，侧墙保存青色光栅和断开的检修平台。'},
    {id:'beta-hall',name:'精灵召唤场',x:-255,z:-139,mapId:502,lookAt:[-255,-149],description:'古藤从三座拱廊爬向能源通道，中央圆盘与红、绿、蓝三个站位仍相连。'}
  ],
  routes:[['beta-plain','beta-waste'],['beta-plain','beta-ruins'],['beta-waste','beta-training'],['beta-training','beta-hall']],
  landingSites:[{id:'beta-landing',name:'重机坪',x:1,z:39,description:'巨型掘进机南面的平坦泊点。'}],
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
    return h;
  },
  groundTone(x,z,h){
    if(h< -5)return h< -11?0x2e8d8c:0x5b7075;
    if(Math.hypot(x+255,z+146)<26)return 0x716a63;
    if(Math.hypot(x+185,z+87)<24)return 0x8b9691;
    if(Math.hypot(x-102,z+10)<42)return 0x8b8790;
    if(z<-45&&x<-52)return z<-91?0xada999:0xac7778;
    return 0x97937b;
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
  const metal=c=>material(c,{metalness:.42,roughness:.46});
  const emit=(color,intensity=.42)=>material(color,{emissive:color,emissiveIntensity:intensity,roughness:.32,metalness:.12});
  const iron=metal(0x415361),gun=metal(0x33343e),edge=metal(0x8997a0),light=metal(0xc6c4b4);
  const copper=metal(0xab6856),patina=metal(0x69575a),gold=metal(0xc99843),ochre=metal(0xae782c);
  const rose=metal(0x987381),purple=metal(0x6c477e),plum=metal(0x674e72);
  const dark=material(0x25262c,{roughness:.76}),grime=material(0x666c51,{roughness:.95});
  const green=emit(0x93d63a),aqua=emit(0x4ce0da),blue=emit(0x4bbde0),red=emit(0xe84a38);
  const chartreuse=emit(0xcbd63c),rockTone=[0x968d7f,0x73756f,0x9d9482,0x746863].map(c=>material(c,{roughness:.98}));
  const rockMesh=new T.DodecahedronGeometry(1,0);
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
  const bits=new T.InstancedMesh(drillBit(),edge,6),mounts=[],bitPose=new T.Object3D();
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
    const n=36,rows=43,v=[],idx=[];
    for(let j=0;j<rows;j++)for(let i=0;i<n;i++){
      const t=j/(rows-1),a=tau*i/n,thread=.5+.5*Math.cos(a+tau*t*4);
      const r=.83*(.025+.975*t)*(.76+.24*thread**3);
      v.push(r*Math.cos(a),-3.8+3.8*t,r*Math.sin(a));
      if(j<rows-1){const k=j*n+i,b=j*n+(i+1)%n;idx.push(k,k+n,b,b,k+n,b+n);}
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v,3));geo.setIndex(idx);geo.computeVertexNormals();return geo;
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
  const crystalMat=material(0xffffff,{vertexColors:true,metalness:.13,roughness:.30,emissive:0x0d5851,emissiveIntensity:.23});
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
    add(hex,iron,x,y+height,z,r*1.035,.6,r*1.035,capTilt);
    add(hex,gun,x,y+height+.25,z,r*.79,.17,r*.79,capTilt);
    block(x,z,r,height+.4);
  }
  for(let j=0;j<14;j++){
    const x=-136+j*4.8,z=-81+5.6*Math.sin((x+108)*.082)+(j%3-1)*2.66;
    energyStone(x,z,13.8+4.35*Math.sin(j*1.87)+j%3*.9,1.65+j%3*.35,(j%2?.06:-.04));
  }
  // Geodesic observation hoods, visible hardware and finned foundations.
  const glass=material(0x83d9d9,{roughness:.17,metalness:.14,transparent:true,opacity:.47,depthWrite:false});
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
    }
    add(chamfer,green,x,y+1.04,z,r*.34,.34,r*.34);block(x,z,r*1.01,.8+h);
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
  ruins();training();summoningHall();
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
  }
  function summoningHall(){
    const cx=-255,cz=-150,y=ground(cx,cz),arcG=new T.TorusGeometry(1,.13,10,38,Math.PI);
    // The opening through the centre arch is visible from the arrival point.
    for(let j=-1;j<=1;j++){
      const x=cx+j*8.2,z=cz-7+(j===0?-1.65:0),r=j===0?4.4:3.45;
      for(const side of [-1,1]){
        const px=x+side*r;
        add(box,plum,px,y+2.3,z,1.04,4.6,2.0);block(px,z,.78,8.0);
        add(box,iron,px,y+.41,z,1.46,.82,2.34);
      }
      add(arcG,plum,x,y+4.6,z,r,r,2.8);
      add(arcG,metal(0xa69a62),x,y+4.6,z+.58,r*.86,r*.86,1.08);
      if(j!==0){
        add(box,grime,x,y+2.50,z-.55,5.7,5.0,1.0);
        add(ball,grime,x,y+5.40,z-.45,2.84,2.45,.56);block(x,z-.55,2.55,7.75);
        ring(x,y+4.1,z+.17,.91,gun,axisZ);add(ball,green,x,y+4.08,z+.29,.54,.69,.18);
      }
    }
    add(drum,gun,cx,y+.03,cz+1.4,3.5,.09,3.5);
    ring(cx,y+.13,cz+1.4,3.1,grime);
    add(drum,chartreuse,cx,y+.13,cz+1.4,2.78,.095,2.78);
    for(const [dx,dz,m] of [[-4.7,3.5,blue],[4.7,3.5,red],[0,-4.0,green]]){
      ring(cx+dx,y+.12,cz+1.4+dz,.94,edge);add(drum,m,cx+dx,y+.12,cz+1.4+dz,.71,.08,.71);
    }
    for(const s of [-1,1])for(let j=0;j<5;j++){
      const x=cx+s*(10.5+j*.8),z=cz-5.8+j*1.5;
      const vine=pipe([p(x,y+7.9-.5*j,z),p(x-s*.72,y+6.2,z+.8),p(x+s*.61,y+3.2,z-.25),p(x-s*.48,y+.57,z+.39),p(x+s*.17,y+.16,z+2.75)],.15+.025*j,grime,22);
      for(let n=1;n<5;n++){
        const u=vine.getPointAt(n/6);
        add(ball,grime,u.x+s*.22,u.y+.12,u.z+.11,.38,.12,.23,0,0,s*.58);
      }
    }
    for(let k=0;k<3;k++){
      const z=cz+5+k*2.65;add(box,gun,cx+9,y+.019,z,2.52,.05,2.45);
      add(box,aqua,cx+9,y+.065,z,.16,.05,2.35);
    }
  }
}
