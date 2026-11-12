// One Cartesian frame for the ship, both observation craft and the 2025 encounter.
// The lat/lon fields in the shared navigation record encode deck metres, not a globe.
const BYRON_WORLD=(()=>{
  const chartScale=400,site=(id,name,x,z,lookAt,description,extras={})=>({
    id,name,x,z,lat:-z/chartScale,lon:x/chartScale,lookAt,description,...extras});
  return {id:'byron',kind:'ship',name:'拜伦号',radius:100,chartScale,
    sites:[
      site('byron-witness','吞舰现场 · 逃生舰',180,182,[-26,-65],'从逃生舰前窗看拜伦号与原始黑洞·尤纳斯的接触面。',{lookPitch:.025}),
      site('byron-deck','拜伦号甲板',-9,34,[-12,9],'绕过卧式蓝光管，沿开启的罩门下坡进入神秘空间。',{mapId:314}),
      site('byron-space','神秘空间',-12,-5,[-9.9,-11.5],'中央亮井连接分段圆甲与透明的管线地板，右舷廊桥通向精灵舱。',{mapId:315}),
      site('byron-hold','拜伦号精灵舱',17,-31,[17,-56],'透过养成舱玻璃可以看见下层管线；训练设备和三口泡泡机位于环廊两侧。',{mapId:316})
    ],
    landingSites:[site('byron-berth','左舷靠泊甲板',-22,43,[-9,20],'起落架对准青色边灯围住的甲板。')],
    routes:[['byron-deck','byron-space'],['byron-space','byron-hold']]};
})();

const BYRON_BOSS={x:-13,y:-80,z:-160,height:260};
const BYRON_DECK=[[-40,55],[-40,29],[-34,18],[-20,12],[-17,7],[-15.2,7],[-15.2,17],[-7.1,17],[-7.1,7],[-6,7],[4,13],[20,14],[36,23],[34,45],[23,64],[5,72],[-22,67]];
const BYRON_HOLD=[[.5,-28],[4,-26.4],[10,-24],[24,-24],[33,-29],[35,-37],[35,-56],[29,-65],[4,-65],[-1.7,-58],[-1.7,-36]];
const BYRON_WITNESS={x:180,y:16,z:182,yaw:Math.atan2(206,247)};
function byronInside(x,z,poly){
  let hit=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const [a,b]=poly[i],[c,d]=poly[j];
    if((b>z)!==(d>z)&&x<(c-a)*(z-b)/(d-b)+a)hit=!hit;
  }
  return hit;
}

function byronKit(T,root){
  const groups=new Map(),materials=new Map(),solids=new Map(),v=(x,y,z)=>new T.Vector3(x,y,z),axis=v(0,1,0);
  const cube=new T.BoxGeometry(1,1,1),round=new T.SphereGeometry(1,32,18),drum=new T.CylinderGeometry(1,1,1,36);
  const hoop=new T.TorusGeometry(1,.060,8,48),pose=new T.Object3D();
  function mat(c,lit=false,glass=false){
    const key=[c,lit,glass].join('/');
    if(!materials.has(key)){
      const paint=new T.Color(c).convertSRGBToLinear();
      materials.set(key,new T.MeshStandardMaterial({color:paint,metalness:glass?.12:.35,roughness:glass?.21:.56,
        emissive:lit?paint:0,emissiveIntensity:lit?.89:0,transparent:glass,opacity:glass?.33:1,depthWrite:!glass,side:glass?T.DoubleSide:T.FrontSide}));
    }
    return materials.get(key);
  }
  function put(geo,m,x,y,z,w=1,h=1,d=1,rx=0,ry=0,rz=0){
    const key=geo.uuid+m.uuid;
    if(!groups.has(key))groups.set(key,{geo,m,matrices:[]});
    pose.position.set(x,y,z);pose.scale.set(w,h,d);pose.rotation.set(rx,ry,rz);pose.updateMatrix();
    const matrix=pose.matrix.clone();groups.get(key).matrices.push(matrix);return matrix;
  }
  function volume(x0,x1,z0,z1,predicate){
    for(let i=Math.floor(x0/12);i<=Math.floor(x1/12);i++)for(let j=Math.floor(z0/12);j<=Math.floor(z1/12);j++){
      const key=i+','+j;if(!solids.has(key))solids.set(key,[]);solids.get(key).push(predicate);
    }
  }
  const local=v(0,0,0);
  function box(m,x,y,z,w,h,d,rx=0,ry=0,rz=0,solid=false){
    const matrix=put(cube,m,x,y,z,w,h,d,rx,ry,rz);
    if(solid){
      const inverse=matrix.clone().invert(),bound=new T.Box3(v(-.5,-.5,-.5),v(.5,.5,.5)).applyMatrix4(matrix);
      volume(bound.min.x,bound.max.x,bound.min.z,bound.max.z,p=>{
        local.copy(p).applyMatrix4(inverse);return Math.max(Math.abs(local.x),Math.abs(local.y),Math.abs(local.z))<.5-1e-5;
      });
    }
  }
  function ball(m,x,y,z,w,h,d,solid=false){
    put(round,m,x,y,z,w,h,d);
    if(solid)volume(x-w,x+w,z-d,z+d,p=>((p.x-x)/w)**2+((p.y-y)/h)**2+((p.z-z)/d)**2<.99999);
  }
  function disk(m,x,y,z,r,h,depth=r){
    put(drum,m,x,y,z,r,h,depth);
  }
  function ring(m,x,y,z,r,depth=r,rx=Math.PI/2,ry=0){
    put(hoop,m,x,y,z,r,r,depth,rx,ry);
  }
  function line(m,a,b,r){
    const va=v(...a),vb=v(...b),delta=vb.clone().sub(va),mid=va.clone().lerp(vb,.5),length=delta.length();
    const e=new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(axis,delta.normalize()));
    put(drum,m,mid.x,mid.y,mid.z,r,length,r,e.x,e.y,e.z);
  }
  function pipe(m,points,r){
    const path=new T.CatmullRomCurve3(points.map(p=>v(...p)));put(new T.TubeGeometry(path,Math.max(12,points.length*5),r,8,false),m,0,0,0);return path;
  }
  function prism(m,outline,bottom,top,solid=false){
    const shape=new T.Shape();outline.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
    const g=new T.ExtrudeGeometry(shape,{depth:top-bottom,bevelEnabled:false,curveSegments:1});
    g.rotateX(-Math.PI/2);put(g,m,0,bottom,0);
    if(solid){
      const xx=outline.map(p=>p[0]),zz=outline.map(p=>p[1]);
      volume(Math.min(...xx),Math.max(...xx),Math.min(...zz),Math.max(...zz),
        p=>p.y>bottom+1e-4&&p.y<top-1e-4&&byronInside(p.x,p.z,outline));
    }
  }
  function finish(){
    for(const {geo,m,matrices} of groups.values()){
      const mesh=new T.InstancedMesh(geo,m,matrices.length);matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
      mesh.castShadow=!m.transparent;mesh.receiveShadow=true;root.add(mesh);
    }
  }
  return {mat,put,box,ball,ring,disk,line,pipe,prism,volume,finish,
    contains:p=>(solids.get(Math.floor(p.x/12)+','+Math.floor(p.z/12))||[]).some(hit=>hit(p))};
}

function createByronHull(T){
  const root=new T.Group();root.name='拜伦号 · 赫尔卡遗舰';const k=byronKit(T,root);
  const m=k.mat,hull=m(0x414e6b),steel=m(0x596983),iron=m(0x2b3348),violet=m(0x615972),dark=m(0x242737);
  const aqua=m(0x46d5e9,true),orchid=m(0xee76e7,true),verdigris=m(0x507c7d);
  const outline=[[-42,46],[-41,7],[-36,-28],[-28,-63],[-7,-80],[9,-76],[28,-60],[38,-36],[44,9],[40,45],[23,68],[2,79],[-25,67]];
  function hullLayer(scale,b,t,mat){k.prism(mat,outline.map(([x,z])=>[x*scale,z*scale]),b,t,true);}
  hullLayer(.69,-17,-13,dark);hullLayer(.84,-13,-9,iron);hullLayer(.94,-9,-4,violet);hullLayer(1,-4,-1,hull);
  // Cabinet-sized cassettes and luminous blue belts follow the actual chine
  // rather than an axis-aligned box that would disappear inside the facets.
  for(let shell=0;shell<3;shell++){
    const s=[1.004,.948,.848][shell],level=[-2.33,-6.37,-10.77][shell];
    for(let i=0;i<outline.length;i++){
      const a=outline[i],b=outline[(i+1)%outline.length],dx=(b[0]-a[0])*s,dz=(b[1]-a[1])*s,l=Math.hypot(dx,dz);
      const normX=-dz/l,normZ=dx/l,yaw=Math.atan2(dx,dz),count=Math.ceil(l/8.6);
      // Plan vertices run clockwise in the rendered x/z plane. Orient the
      // light cassettes on the outward side whichever direction the edge takes.
      const sign=(normX*(a[0]+b[0])+normZ*(a[1]+b[1]))>=0?1:-1;
      for(let n=0;n<count;n++){
        const x=s*a[0]+dx*(n+.5)/count,z=s*a[1]+dz*(n+.5)/count,ex=sign*normX,ez=sign*normZ;
        k.box(shell===1?violet:steel,x+ex*.37,level,z+ez*.37,.67,2.61,l/count-.43,0,yaw,0);
        k.box(iron,x+ex*.74,level+.25,z+ez*.74,.10,1.1,l/count*.77,0,yaw);
        const lamp=shell===0?(n%5===2?orchid:aqua):shell===1?(n%3===1?aqua:iron):aqua;
        k.box(lamp,x+ex*.81,level+.36,z+ez*.81,.14,.42,l/count*.65,0,yaw);
      }
    }
  }
  k.prism(violet,BYRON_DECK,-1,6,true);
  // High, crooked port-side superstructure, crescent keel and protruding
  // starboard fins identify the craft even without the playable district.
  const spine=[[-38,-55],[-22,-73],[-12,-63],[-17,-27],[-23,-6],[-31,1],[-40,-7]];
  k.prism(hull,spine,-12,20,true);k.prism(steel,spine.map(([x,z])=>[x*.89-3,z*.87-5]),20,32,true);
  k.prism(iron,[[-34,-58],[-23,-73],[-16,-68],[-21,-39],[-27,-18],[-36,-16]],32,37,true);
  k.box(hull,-26,45,-45,6.7,24,10,-.35,-.10,-.24,true);
  k.box(steel,-24,53,-53,3.2,19,4.1,-.52,0,-.19,true);
  for(let n=0;n<8;n++){
    const z=-59+n*5.0,x=-19.4-(n*.13);
    k.box(iron,x,25.7,z,2.22,6.2,4.7,0,-.16,.05);
    k.box(steel,x+1.20,26.35,z,.32,4.88,4.18,0,-.16,.05);
    k.box(n%4===0?orchid:aqua,x+1.39,27.51,z,.26,.65,3.35,0,-.16);
  }
  k.prism(violet,[[-34,-58],[-25,-62],[-20,-54],[-17,-35],[-22,-29],[-32,-37]],36.8,39.4,true);
  k.box(verdigris,-20.6,17.6,-31.0,7.3,4.2,13.4,-.04,-.22,-.1,true);
  for(let n=0;n<5;n++)k.box(aqua,-16.9,18.1,-36+n*2.11,.32,1.17,.68,0,-.22);
  k.box(iron,-29,-26,-26,7.8,36,19,-.25,.08,.13,true);
  k.box(hull,-27,-42,-30,3.9,20,11,-.31,.13,.16,true);
  k.ball(verdigris,-39,15,-24,6.3,4.2,8.4,true);k.ball(aqua,-39,18,-24,4,2.1,4.6);
  for(let j=0;j<6;j++){
    const z=-57+j*7.45;
    k.box(iron,-36,13.8,z,5,6.6,3.71,0,-.08,-.13);
    k.box(aqua,-38.5,14.4,z,.18,.34,2.7);
    if(j%2===0)k.box(orchid,-37.9,11,z,.14,.49,1.9);
  }
  for(const s of [-1,1]){
    for(let j=0;j<3;j++){
      const z=-32+j*25,tip=47-j*2;
      k.prism(j%2?steel:hull,[[s*28,z-14],[s*tip,z-22],[s*(tip-3),z-4],[s*34,z+9]],-4.5,-1.7,true);
      k.line(steel,[s*(tip-2),-2.2,z-14],[s*(tip+4),-2.3,z-27],.46);
      k.pipe(dark,[[s*(tip-3),-2.2,z-13],[s*(tip-1),-5.9,z-15],[s*tip,-6.7,z-19],[s*(tip+2),-3.1,z-23]],.16);
    }
    for(let j=0;j<17;j++){
      const z=-55+j*6.7,x=s*(34+7*Math.cos((z-1)*.023));
      k.box(j%4===0?orchid:aqua,x,-2.7,z,.36,.65,2.5);
      if(j%3===0)k.box(steel,x,-5.1,z,1.55,3.8,3.6,.08,-s*.10,0);
    }
    k.ball(iron,s*15,-8,58,8.5,6.6,13,true);
    for(let j=0;j<3;j++)k.ring(j===1?aqua:steel,s*15,-8,65+j,5.3-j*.34,4.7,0);
  }
  k.finish();root.userData.blocksShuttle=k.contains;return root;
}

function createByronSurface(T,world){
  const {sites,landingSites,radius,chartScale}=BYRON_WORLD,root=new T.Group(),ship=createByronHull(T);
  root.name='拜伦号 · 穿越黑暗之门';root.add(ship);world.add(root);root.visible=false;
  const k=byronKit(T,root),m=k.mat,tau=Math.PI*2,w=BYRON_WITNESS,co=Math.cos(w.yaw),si=Math.sin(w.yaw);
  const hull=m(0x434b65),pale=m(0x8498b3),iron=m(0x333b50),purple=m(0x63566e),shadow=m(0x252838);
  const cyan=m(0x36cced,true),ice=m(0x97effb,true),red=m(0xe64b65,true),amber=m(0xe7bf66,true),jade=m(0x4a8072);
  const green=m(0x87dc58,true),glass=m(0x58a4c1,false,true),copper=m(0x9b746b),darkCable=m(0x343045);
  const walkRects=[[-15.2,-7.1,-5,17],[1,20.6,-20.4,-13.6],[14.2,20.6,-32,-16.4]];
  const chart=(lat,lon)=>({x:lon*chartScale,z:-lat*chartScale}),coordinates=p=>({lat:-p.z/chartScale,lon:p.x/chartScale});
  const ll=(x,z)=>({lat:-z/chartScale,lon:x/chartScale}),clamp=T.MathUtils.clamp;
  function witnessLocal(x,z){const dx=x-w.x,dz=z-w.z;return {x:co*dx-si*dz,z:si*dx+co*dz};}
  function witnessFloor(x,z){const p=witnessLocal(x,z);return Math.abs(p.x)<7.7&&p.z>-6.25&&p.z<8.7;}
  function floorAt(x,z){
    if(witnessFloor(x,z))return w.y-1.68*clamp((-witnessLocal(x,z).z-.8)/2.88,0,1);
    if(byronInside(x,z,BYRON_DECK))return 6;
    if(x>=-15.22&&x<=-7.08&&z<=17.02&&z>=-5.01)return 6*clamp((z+4)/21,0,1);
    if(Math.hypot(x+12,z+17)<15.85||byronInside(x,z,BYRON_HOLD))return 0;
    for(const [x0,x1,z0,z1] of walkRects.slice(1))if(x>=x0&&x<=x1&&z>=z0&&z<=z1)return 0;
    return null;
  }
  const barriers=[];
  function obstruct(x,z,r){barriers.push({x,z,r});}
  const records=createByronRecordStations(T,root);
  obstruct(-6.9,30.3,.85);obstruct(-9.15,-8.15,.85);
  function floorBox(x,z,width,depth,colour){
    k.box(colour,x,-.18,z,width,.34,depth,0,0,0,true);
  }
  function armour(x,z,width,depth,dye,y=6.035){
    const a=width*.5,b=depth*.5,cut=Math.min(a,b)*.26;
    k.prism(dye,[[x-a+cut,z-b],[x+a-cut,z-b],[x+a,z-b+cut],[x+a,z+b],[x-a,z+b],[x-a,z-b+cut]],y-.045,y);
  }
  // 314. The light tubes are laid into the torn amethyst plates, beside the
  // raised glass access cover and the second, closed branch of the passage.
  for(let row=0;row<7;row++)for(let col=0;col<8;col++){
    const x=-34+col*8.3+(row%2)*1.3,z=19+row*6.31;
    if(![[-4,-3.1],[4,-3.1],[-4,3.1],[4,3.1]].every(([dx,dz])=>byronInside(x+dx,z+dz,BYRON_DECK)))continue;
    armour(x,z,8.13,6.15,(row+col)%4?hull:purple);
    for(const s of [-1,1])k.box(iron,x+s*3.26,6.062,z+2.41,.22,.065,.39);
  }
  for(const [x,z] of [[-5,24],[1.5,16]]){
    k.box(iron,x,6.18,z,2.42,.36,5.90,0,-.19,0,true);
    k.box(pale,x,6.37,z,2.12,.24,5.48,0,-.19);
    k.box(cyan,x,6.56,z,1.44,.28,4.64,0,-.19);k.box(ice,x-.35,6.72,z,.20,.06,4.21,0,-.19);
    obstruct(x,z,1.34);
  }
  k.box(hull,-11.14,2.83,6.5,8.1,.34,Math.hypot(21,6),-Math.atan2(6,21),0,0,true);
  for(const x of [-15.28,-7.04]){
    k.line(pale,[x,.35,-4],[x,6.37,17],.22);
    k.line(cyan,[x,.51,-4],[x,6.54,17],.056);
  }
  for(let n=0;n<14;n++){
    const z=-3.3+n*1.48;k.box(iron,-11.14,.10+6*(z+4)/21,z,7.3,.070,.13,-.27);
  }
  k.box(jade,-16.5,8.05,13.5,1.95,4.1,7.2,0,0,0,true);obstruct(-16.5,13.5,1.01);
  k.box(jade,-5.7,8.05,13.5,1.95,4.1,7.2,0,0,0,true);obstruct(-5.7,13.5,1.01);
  k.box(glass,-11.1,11.65,10.5,9.4,.29,6.1,-.55);
  for(const x of [-15.84,-6.36])k.box(pale,x,11.62,10.5,.28,.44,6.35,-.55);
  k.box(jade,10.1,6.56,18.0,6.2,.96,7.6,0,0,0,true);obstruct(10.1,18,2.85);
  for(let j=0;j<5;j++)k.box(j%2?cyan:iron,10.1,7.10,15.25+j*1.13,4.95,.1,.41);
  for(const [x,z,s] of [[-33,20,-1],[21,22,1],[22,54,1],[-6,66,-1]]){
    for(let j=0;j<3;j++){
      const xx=x+s*.44*j;k.pipe(j===1?copper:iron,[[xx,6.25,z],[xx+2*s,6.46,z-3.5],[xx+3*s,6.84,z-6.7],[xx+2.8*s,6.57,z-9.7]],.24);
    }
  }
  for(const s of [-1,1]){
    const x=s<0?-16.62:-5.55;
    k.box(iron,x,8.84,14.3,1.85,1.70,1.43);k.box(hull,x,8.78,15.05,1.52,1.44,.28);
    for(let j=0;j<3;j++)k.box(j===1?cyan:pale,x,8.35+.36*j,15.22,.68,.12,.10);
    k.line(copper,[x,8.44,11.88],[x+s*2.78,6.64,10.99],.24);
  }
  // Flush dock strip. It occupies a real flat part of the deck, clear of
  // the ramps, pipe bundles and the equipment on the western lip.
  for(const x of [-32,-12])for(let n=0;n<9;n++)k.box(cyan,x,6.09,32+n*2.55,.31,.07,1.20);
  for(const z of [32,53])for(let n=0;n<6;n++)k.box(pale,-30+n*3.2,6.085,z,1.72,.055,.23);
  // 315. Radial deck wedges, a luminous sunken well and seven external
  // elbow pipes. The breaks expose smaller conduits beneath the glass.
  const cx=-12,cz=-17,r=15.75;
  k.disk(iron,cx,-.25,cz,r,.48);k.disk(glass,cx,.04,cz,r*.975,.085);
  for(let j=0;j<13;j++){
    const a=j*tau/13,b=a+tau/13*(j%4===1?.53:.90);
    const polar=(rad,theta)=>[cx+rad*Math.cos(theta),cz+rad*Math.sin(theta)];
    const wedge=[polar(4.4,a+.06),polar(14.9,a),polar(15.28,(a+b)/2),polar(15.03,b),polar(4.7,b-.04)];
    k.prism(j%3?purple:hull,wedge,.10,.18);
    const px=cx+7.0*Math.cos(a),pz=cz+7.0*Math.sin(a);
    k.line(cyan,[px,-.01,pz],[cx+13.7*Math.cos(a),-.01,cz+13.7*Math.sin(a)],.23);
    if(j%3===0)k.ring(iron,cx+10.6*Math.cos(a),.23,cz+10.6*Math.sin(a),.69);
  }
  k.disk(pale,cx,.25,cz,4.52,.48);k.disk(iron,cx,.51,cz,4.28,.11);
  k.ring(cyan,cx,.62,cz,3.47);k.disk(cyan,cx,.60,cz,3.20,.09);k.disk(ice,cx,.66,cz,2.89,.047);
  for(let j=0;j<24;j++){
    const a=tau*j/24,c=Math.cos(a),s=Math.sin(a);
    k.box(j%4?iron:pale,cx+3.94*c,.71,cz+3.94*s,1.0,.32,.54,0,Math.PI/2-a);
    if(j%3===0)k.box(j%2?cyan:amber,cx+3.96*c,.895,cz+3.96*s,.64,.044,.24,0,Math.PI/2-a);
  }
  for(let j=0;j<7;j++){
    const a=[.70,.99,2.05,2.42,3.74,4.33,5.19][j],c=Math.cos(a),s=Math.sin(a);
    const pos=(rad,h)=>[cx+rad*c,h,cz+rad*s];
    k.pipe(j%2?hull:pale,[pos(12.8,.55),pos(12.8,2.28),pos(13.65,4.05),pos(15.48,7.05),pos(17.3,9.15),pos(16.66,12.70)],.86);
    for(let n=0;n<4;n++){
      const q=pos(12.78+.04*n,.92+n*.46);k.ring(n===2?cyan:iron,q[0],q[1],q[2],.89);
    }
    const lower=pos(12.84,1.26);
    k.box(hull,lower[0],lower[1],lower[2],2.13,2.35,1.92,0,-a);
    const face=pos(11.83,1.51);
    k.box(cyan,face[0],face[1],face[2],1.15,.48,.24,0,Math.PI/2-a);
    const mount=pos(13.75,.65);k.box(hull,mount[0],mount[1],mount[2],2.2,1.3,2.25,0,-a,0,true);obstruct(mount[0],mount[2],1.19);
  }
  for(let j=0;j<40;j++){
    const a=j*tau/40,c=Math.cos(a),s=Math.sin(a);
    if(s>.94||c>.95)continue;
    const x=cx+c*r,z=cz+s*r; k.box(j%4?iron:hull,x,3.28,z,2.65,6.55,.56,0,Math.PI/2-a,0,true);
    k.box(j%4?cyan:pale,x-.24*c,4.61,z-.24*s,2.05,.17,.1,0,Math.PI/2-a);
    const inset=Math.PI/2-a;
    k.box(hull,x-.34*c,2.15,z-.34*s,2.07,2.55,.26,0,inset);
    for(let n=0;n<3;n++)k.box(n===1?pale:shadow,x-.52*c,.98+n*.22,z-.52*s,.86+.21*n,.086,.13,0,inset);
    k.box(iron,x-.34*c,5.96,z-.34*s,2.43,.48,.38,0,inset);
  }
  for(const [x,z,ww,dd] of [[11,-17,19.6,6.8],[17.4,-22.8,6.42,13.1]])floorBox(x,z,ww,dd,hull);
  for(const [x,z,ww,dd] of [[10,-20.44,13.1,.38],[10.8,-13.58,19.7,.38],[14.21,-23.4,.38,5.8],[20.62,-23.4,.38,5.8]]){
    k.box(iron,x,2.22,z,ww,4.42,dd,0,0,0,true);k.box(cyan,x,2.64,z,ww+.055,.09,dd+.055);
  }
  for(const [x,z,ww,dd] of [[10.2,-17,17.2,7.4],[17.5,-22,7.4,12.2]])k.box(hull,x,4.85,z,ww,.41,dd,0,0,0,true);
  // 316. Segmented transparent training floor and its four unequal machines.
  // This historical room has no duplicate boss: the encounter is ship-wide.
  k.prism(iron,BYRON_HOLD,-.64,-.01,true);
  k.prism(glass,[[4,-56],[9,-60],[27,-60],[31,-55],[31,-43],[27,-38],[10,-38],[4,-43]],.08,.17);
  for(let j=0;j<8;j++){
    const x=4.4+j*3.7;k.box(j%2?cyan:jade,x,.015,-49,.47,.10,18.5);
    if(j%2===0)k.box(pale,x,.033,-48,.88,.13,2.54);
  }
  for(let i=0;i<BYRON_HOLD.length;i++){
    const a=BYRON_HOLD[i],b=BYRON_HOLD[(i+1)%BYRON_HOLD.length];
    const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz);
    if(i===2)continue;
    k.box(jade,(a[0]+b[0])/2,2.72,(a[1]+b[1])/2,.64,5.4,len+.16,0,yaw,0,true);
    k.box(cyan,(a[0]+b[0])/2,3.94,(a[1]+b[1])/2,.72,.12,len-.08,0,yaw);
    const nx=-dz/len,nz=dx/len;
    k.box(glass,(a[0]+b[0])/2,7.49,(a[1]+b[1])/2,.38,4.18,len+.08,0,yaw,0,true);
    k.box(iron,a[0],7.50,a[1],.81,4.2,.91,0,yaw);
    for(let n=0;n<Math.floor(len/3.3);n++){
      const t=(n+.5)/Math.floor(len/3.3),x=a[0]+dx*t,z=a[1]+dz*t;
      k.box(hull,x,1.54,z,.78,1.85,2.29,0,yaw);
      k.box(pale,x+nx*.41,1.11,z+nz*.41,.17,.21,1.94,0,yaw);
    }
  }
  for(let j=0;j<4;j++){
    const x=3.5+j*8.7,z=-58.8+(j===0||j===3?2.0:0);
    k.disk(purple,x,.62,z,3.27,1.25);k.ring(pale,x,1.32,z,2.79);obstruct(x,z,2.95);
    if(j===0){
      k.box(iron,x,3.9,z,3.7,6.6,3.3,-.18,0,-.19,true);k.box(amber,x-.22,3.62,z+1.61,.78,4.7,.52,-.18,0,-.19);
      k.pipe(pale,[[x-1.9,1.3,z+1.1],[x-2.7,2.22,z+1.21],[x-2.55,4.18,z+.1],[x-1.6,5.6,z-.33]],.43);
      for(let n=0;n<6;n++)k.box(n%3?cyan:jade,x-1.17+n*.28,6.21,z+.82,.16,.30,.18,-.18,0,-.19);
    }else if(j===1){
      k.ball(jade,x,3.72,z,2.7,3.46,2.30,true);k.ring(pale,x,3.75,z+1.87,1.21,1.13,0);k.ball(red,x,3.75,z+2.12,.52,.57,.26);
      for(const h of [2.29,5.04])k.ring(iron,x,h,z,2.50,2.07);
      for(let n=0;n<12;n++){const a=tau*n/12;k.ball(green,x+2.73*Math.cos(a),3.1,z+2.27*Math.sin(a),.19,.23,.19);}
      k.disk(iron,x,6.65,z,1.57,.49);k.disk(green,x,6.93,z,.93,.08);
    }else if(j===2){
      k.ball(glass,x,3.82,z,3.05,3.08,2.72,true);k.ring(cyan,x,2.0,z,2.53);k.disk(jade,x,2.45,z,1.05,.45);
      for(const side of [-1,1])k.pipe(jade,[[x+side*2.96,2.0,z],[x+side*3.01,3.9,z-.2],[x+side*2.27,5.64,z-.6],[x+side*.94,6.61,z-.9]],.27);
    }else{
      k.box(jade,x,3.36,z,4.63,4.65,4.21,-.16,0,0,true);k.box(iron,x,3.59,z+2.16,2.63,2.4,.23);k.box(cyan,x,3.59,z+2.32,1.98,1.64,.12);
      for(let n=0;n<4;n++)k.box(iron,x-.44,5.47,z-1.37+n*.79,3.78,.21,.25,-.16);
      for(const xx of [x-1.95,x+1.95])k.box(pale,xx,3.66,z+1.88,.23,2.95,.26,-.16);
    }
  }
  const machineX=3.7,machineZ=-36.5;k.disk(hull,machineX,.8,machineZ,2.24,1.58);obstruct(machineX,machineZ,2.12);
  for(let j=0;j<3;j++){
    const a=j*2.1;k.pipe(jade,[[machineX,1.52,machineZ],[machineX+.47*Math.cos(a),2.38,machineZ+.47*Math.sin(a)],[machineX+1.33*Math.cos(a),3.0,machineZ+1.33*Math.sin(a)]],.23);
    k.ball(cyan,machineX+1.33*Math.cos(a),3.0,machineZ+1.33*Math.sin(a),.38,.28,.38);
  }
  // A roof with major engineering spans leaves the stepped glass floor visible
  // inside. Bright rows of service lamps belong to the room itself.
  k.prism(hull,BYRON_HOLD,9.52,10.16,true);
  for(let z=-61;z<=-32;z+=8.2){
    k.box(iron,17,9.27,z,29.1,.55,.76,0,0,0,true);
    for(const x of [5,29])k.box(ice,x,8.96,z,3.55,.11,.41);
  }
  k.finish();
  for(const [x,y,z,c,power,range] of [[-9,7,-18,0x72c8f6,1.1,32],[18,7.2,-50,0x92f7dd,1.35,39],[-9,13,20,0xb9aef6,.78,41]]){
    const light=new T.PointLight(c,power,range,1.35);light.position.set(x,y,z);root.add(light);
  }
  // The oblique mullions and bank of violet/cyan monitors follow the escape
  // bridge shown in the later task. The windows are real open sight lines.
  const observer=new T.Group();observer.name='逃生舰 · 观测驾驶舱';observer.position.set(w.x,w.y,w.z);observer.rotation.y=w.yaw;root.add(observer);
  const o=byronKit(T,observer),cab=o.mat(0x414665),seam=o.mat(0x222537),silver=o.mat(0x8795c2),blue=o.mat(0x47bdf8,true),lavender=o.mat(0xc3b4ff,true);
  o.box(cab,0,-.72,4.44,16,1.42,10.48,0,0,0,true);
  o.box(cab,0,-.94,-2.24,16,.20,Math.hypot(2.88,1.68),-Math.atan2(1.68,2.88),0,0,true);
  o.box(cab,0,-2.12,-5.46,16,.88,3.6,0,0,0,true);
  o.box(seam,0,-3.06,1.7,13.3,1.05,14.6,0,0,0,true);
  o.box(cab,0,3.3,9.2,16.1,7.4,.62,0,0,0,true);
  o.box(seam,0,7.4,.8,16.4,.78,17.0,0,0,0,true);
  for(const side of [-1,1]){
    o.box(cab,side*8.05,3.35,1.1,.56,7.2,17.0,0,0,0,true);
    o.line(silver,[side*7.7,-1.6,-6.37],[side*7.27,6.95,-6.66],.24);
    o.line(blue,[side*7.48,.56,-6.3],[side*7.21,4.7,-6.4],.063);
    o.box(cab,side*5.95,-.55,-5.92,3.3,1.95,1.1,0,side*.32,0,true);
    for(let n=0;n<3;n++){
      const x=side*(4.85+n*.84);o.box(n%2?lavender:blue,x,.46,-5.91,.65,.077,.47,-.22,side*.19);
    }
    o.box(seam,side*5.68,.84,3.65,1.55,.81,1.85,0,0,0,true);
    o.box(cab,side*5.68,1.66,4.33,1.61,1.84,.42,.16,0,0,true);
  }
  o.line(silver,[-7.4,6.73,-6.55],[7.4,6.73,-6.55],.25);
  o.line(seam,[-7.62,-1.75,-6.35],[7.62,-1.75,-6.35],.18);
  for(const x of [-5.18,5.42])o.line(silver,[x,-1.66,-6.54],[x+(x>0?1.43:-1.4),6.75,-6.65],.16);
  for(let j=0;j<5;j++)for(const x of [-6.45,6.45])o.box(j%2?blue:lavender,x,.03,1.8+j*1.27,.34,.038,.91);
  o.finish();

  const encounter=new T.Group();encounter.name='原始黑洞 · 拜伦号撞击现场';root.add(encounter);
  const boss=createYunasFigure(T,4717,{height:BYRON_BOSS.height});
  const apparition=new T.Group();apparition.position.set(BYRON_BOSS.x,BYRON_BOSS.y,BYRON_BOSS.z);
  apparition.rotation.y=Math.PI+Math.atan2(w.x-BYRON_BOSS.x,w.z-BYRON_BOSS.z);
  apparition.userData.byronSpirit='byron-yunas';apparition.add(boss.root);encounter.add(apparition);
  // The contacting material in 1002-10 pushes against the bow. The growth is
  // actual geometry between ship and eye, with the stern and its engines visible.
  const black=new T.MeshStandardMaterial({color:0x151021,roughness:.39,metalness:.54,side:T.DoubleSide});
  const ember=new T.MeshBasicMaterial({color:0x99465d,transparent:true,opacity:.67,depthWrite:false});
  const fingers=[];
  for(let j=0;j<15;j++){
    const side=j%2?1:-1,n=Math.floor(j/2),z=-63+6.3*n+3.2*Math.sin(j),end=new T.Vector3(side*(16+2.7*n),2.8+3.8*Math.cos(j*1.81),z);
    const p0=new T.Vector3(-18+side*(43+3*n),38+15*Math.sin(j*.97),-147+1.95*n);
    const p1=new T.Vector3(-25+side*(29+2.77*n),18+18*Math.cos(j*.9),-113+1.7*n);
    const p2=new T.Vector3(-12+side*(35+1.89*n),10+8*Math.sin(j*.78),-87+4*n);
    const path=new T.CatmullRomCurve3([p0,p1,p2,end]);
    const tube=new T.TubeGeometry(path,42,1,7,false),pos=tube.getAttribute('position');
    for(let row=0;row<=42;row++){
      const t=row/42,base=path.getPointAt(t),width=(2.9+.52*(j%5))*(.28+.72*Math.sin(Math.PI*t)**.70)*(1-.95*t**4);
      for(let a=0;a<=7;a++){
        const i=row*8+a,dx=pos.getX(i)-base.x,dy=pos.getY(i)-base.y,dz=pos.getZ(i)-base.z;
        pos.setXYZ(i,base.x+width*dx,base.y+width*dy*.65,base.z+width*dz);
      }
    }
    tube.computeVertexNormals();tube.computeBoundingSphere();
    const strand=new T.Mesh(tube,black);encounter.add(strand);fingers.push({tube,j,indexCount:tube.index.count});
    if(j%4===0){
      const line=new T.Mesh(new T.TubeGeometry(path,42,.12,5,false),ember);
      line.position.y+=.73;encounter.add(line);fingers.push({tube:line.geometry,j,indexCount:line.geometry.index.count});
    }
  }
  const skyDebris=new T.Group();encounter.add(skyDebris);
  const scraps=byronKit(T,skyDebris),skin=scraps.mat(0x495572),broken=scraps.mat(0x6b5369);
  for(let j=0;j<28;j++){
    const a=j*2.39996,r=43+(j%8)*8.9;
    const x=-27+r*Math.cos(a),y=17+(16+j%5*10)*Math.sin(a),z=-111-1.2*j+8*Math.cos(j*.84);
    scraps.box(j%2?skin:broken,x,y,z,1.1+j%4*.9,.36+j%3*.22,1.35+j%5*.7,.44*j,.73*j,.29*j);
  }
  scraps.finish();
  // The observer sees the approaching body in ship-fixed coordinates: the
  // deck, struts and docked L-01 never move relative to the feet of a visitor.
  // At contact broad folds reach around the bow and cast it into shadow.
  const tideMat=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.38,metalness:.53,side:T.DoubleSide});
  const waves=[];
  for(let j=0;j<8;j++){
    const rings=30,slices=7,v=new Float32Array((rings+1)*(slices+1)*3),rgb=[],faces=[];
    for(let i=0;i<=rings;i++)for(let k=0;k<=slices;k++){
      const t=i/rings,u=k/slices,edge=Math.abs(2*u-1)**3,gleam=.5+.5*Math.sin(i*.46+j*1.3);
      rgb.push(.024+.15*edge*gleam,.012+.043*edge,.038+.18*edge*gleam);
      if(i<rings&&k<slices){const n=i*(slices+1)+k,b=n+slices+1;faces.push(n,b,n+1,n+1,b,b+1);}
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(v,3).setUsage(T.DynamicDrawUsage));
    geo.setAttribute('color',new T.Float32BufferAttribute(rgb,3));geo.setIndex(faces);
    const sheet=new T.Mesh(geo,tideMat);sheet.frustumCulled=false;encounter.add(sheet);waves.push({sheet,geo,j,rings,slices});
  }
  // A world-space archival trace of Ophelia's escape ship, separate from the
  // walkable witness bridge. The grapple really meets the cylinder at the
  // engineering bay and carries it along the visible return trajectory.
  const trace=new T.Group();trace.name='奥菲利娅 · 返航轨迹';encounter.add(trace);
  const vk=byronKit(T,trace),silk=vk.mat(0x8daed4),veil=vk.mat(0x465b7c),beam=vk.mat(0x56cfff,true),thrust=vk.mat(0xcdedff,true);
  vk.prism(silk,[[0,-6.1],[2.16,-2.4],[2.64,2.6],[1.31,4.53],[-1.31,4.53],[-2.64,2.6],[-2.16,-2.4]],-.59,.53);
  vk.ball(veil,0,.72,-.93,1.47,1.1,2.61);vk.ball(beam,0,.87,-2.02,.83,.65,.83);
  for(const s of [-1,1]){
    vk.prism(veil,[[s*1.3,-1.9],[s*6.23,2.73],[s*5.81,3.88],[s*1.76,3.02]],-.21,.16);
    vk.line(beam,[s*2.0,.38,-.5],[s*5.5,.36,2.86],.17);
    vk.ball(thrust,s*1.15,0,4.6,.52,.43,1.63);
  }
  vk.line(silk,[2.6,.17,1],[5.38,.28,.9],.27);vk.line(silk,[5.38,.28,.9],[6.0,-.62,.9],.24);
  vk.finish();
  const capsule=new T.Group();capsule.name='罐装黑洞';encounter.add(capsule);const pk=byronKit(T,capsule);
  const bodyMetal=pk.mat(0xa9c3c7),housing=pk.mat(0x384957),well=pk.mat(0xc05658,true);
  pk.line(housing,[0,0,-2.3],[0,0,2.3],.87);pk.ball(well,0,0,0,1.04,1.04,1.18);
  for(const z of [-1.9,-.84,.84,1.9])pk.ring(bodyMetal,0,0,z,1.02,1.02,0);
  pk.finish();
  const discharge=new T.Group();encounter.add(discharge);
  const arcs=byronKit(T,discharge),electric=arcs.mat(0x71a7ff,true),white=arcs.mat(0xe1ffff,true);
  const split=[32,30,-31],cross=[26,40,-56];
  for(const path of [[[35,20,-18],[41,26,-24],split,[38,35,-44],cross,[31,53,-69],[9,52,-78]],
    [split,[49,37,-34],[44,40,-39],[53,45,-49]],[cross,[17,34,-54],[10,39,-63],[4,37,-65]]]){
    for(let i=1;i<path.length;i++)arcs.line(electric,path[i-1],path[i],.73);
    for(let i=1;i<path.length;i++)arcs.line(white,path[i-1].map((v,j)=>v+(j===2?.48:0)),path[i].map((v,j)=>v+(j===2?.48:0)),.32);
  }
  arcs.finish();
  const nozzles=new T.Group();nozzles.name='拜伦号逆向引擎';encounter.add(nozzles);
  const jets=[],flameShape=new T.ConeGeometry(1,1,32,5,true);flameShape.translate(0,.5,0);
  const plasma=new T.MeshBasicMaterial({color:0x278cff,transparent:true,opacity:.34,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide});
  const hot=new T.MeshBasicMaterial({color:0xb8faff,transparent:true,opacity:.62,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide});
  for(const x of [-15,15])for(let layer=0;layer<2;layer++){
    const jet=new T.Mesh(flameShape,layer?hot:plasma);jet.position.set(x,-8,67);jet.rotation.x=Math.PI/2;nozzles.add(jet);jets.push({jet,layer});
  }
  const track=new T.CatmullRomCurve3([
    new T.Vector3(83,26,142),new T.Vector3(44,0,86),new T.Vector3(17,-6,58),new T.Vector3(30,-1,38),
    new T.Vector3(46,20,10),new T.Vector3(32,34,-30),new T.Vector3(-1,43,-89)]);
  const travelAxis=new T.Vector3(0,0,-1),grip=new T.Vector3(6.18,-.62,.90);
  const exactHook=track.getPointAt(.535),atHook=new T.Quaternion().setFromUnitVectors(travelAxis,track.getTangentAt(.535));
  exactHook.add(grip.clone().applyQuaternion(atHook));const bossPoint=new T.Vector3(),orbitPivot=new T.Vector3();
  const smooth=(p,a,b)=>T.MathUtils.smoothstep(p,a,b);
  let phase=-1,time=0,mode='hidden';
  function setEncounterPhase(value){
    const next=clamp(Number(value)||0,0,1);if(next===phase)return;phase=next;boss.setEncounterPhase?.(phase);records?.setPhase(phase);
    const approach=smooth(phase,.15,.52),engulf=smooth(phase,.23,.77),collapse=smooth(phase,.84,1);
    const shock=smooth(phase,.733,.760)*(1-smooth(phase,.810,.841));discharge.visible=shock>.04;discharge.scale.setScalar(.94+.06*shock);
    const drive=smooth(phase,.18,.50)*(1-.94*smooth(phase,.72,.95));nozzles.visible=drive>.003;
    for(const {jet,layer} of jets){const width=layer?2.76:4.25;jet.scale.set(width,(layer?16:28)*drive+.1,width);}
    const scale=1+.085*engulf-.59*collapse;
    orbitPivot.set(BYRON_BOSS.x+approach*13-5*collapse,BYRON_BOSS.y+BYRON_BOSS.height*.54-approach*14,BYRON_BOSS.z+approach*64);
    apparition.scale.setScalar(scale);apparition.position.copy(orbitPivot);apparition.position.y-=BYRON_BOSS.height*.54*scale;
    boss.core.getWorldPosition(bossPoint);
    for(const {sheet,geo,j,rings,slices} of waves){
      const reach=.20+.80*engulf-.32*collapse,positions=geo.attributes.position;
      const near=Math.max(0,Math.cos(j*tau/8));
      for(let i=0;i<=rings;i++){
        const row=i/rings,t=row*reach,tip=smooth(row,.72,1);
        const x=-30+24*t,y=31*(1-t)+1.6*t+4*Math.sin(t*3.3+j*.4);
        const z=-142+(163+97*near**.64)*t+(5.4*Math.sin(j*2.43)-8.5)*t*t;
        const radial=10+42*Math.sin(Math.min(1,t)*1.66);
        for(let k=0;k<=slices;k++){
          const u=k/slices,ang=j*tau/8+(u-.5)*(.70+.60*engulf+.33*near)*(1-(.94-.31*near)*tip)+.23*Math.sin(t*4+j*1.15)+(j%2?1:-1)*.17*shock;
          const ridge=1+.095*Math.sin(u*Math.PI*3+.54*j)+.055*Math.sin(t*13+3*j);
          let xx=x+Math.cos(ang)*(radial+8*near)*ridge,yy=y+Math.sin(ang)*radial*(.73+.21*Math.sin(j+1))*ridge;
          let zz=z+(2.8+9.6*tip)*Math.cos(u*Math.PI*2+j+.42*i);
          const pull=collapse*(.20+.64*(1-row));xx+=(bossPoint.x-xx)*pull;yy+=(bossPoint.y-yy)*pull;zz+=(bossPoint.z-zz)*pull;
          positions.setXYZ(i*(slices+1)+k,xx,yy,zz);
        }
      }
      positions.needsUpdate=true;geo.computeVertexNormals();sheet.visible=phase>.10;
    }
    for(const f of fingers){
      const t=clamp(.38+.69*T.MathUtils.smoothstep(phase,.19,.75)-.13*T.MathUtils.smoothstep(phase,.92,1)-.025*(f.j%4),0,1);
      f.tube.setDrawRange(0,3*Math.floor(f.indexCount*t/3));
    }
    ember.opacity=.34+engulf*.48-.24*collapse;skyDebris.scale.setScalar(.93+.13*engulf-.39*collapse);
    skyDebris.position.set(-7*collapse,5*collapse,-40*collapse);
    const leg=phase<=.73?.535*smooth(phase,.50,.73):.535+.465*smooth(phase,.73,.98);
    trace.visible=phase>=.50&&phase<.993;trace.position.copy(track.getPointAt(leg));
    trace.quaternion.setFromUnitVectors(travelAxis,track.getTangentAt(leg));trace.scale.setScalar(1-.82*smooth(phase,.94,1));
    capsule.visible=phase<.995;
    if(phase<=.73){capsule.position.copy(exactHook);capsule.quaternion.copy(atHook);}
    else{
      capsule.position.copy(grip).applyQuaternion(trace.quaternion).add(trace.position);
      capsule.position.lerp(bossPoint,smooth(phase,.89,.98));capsule.quaternion.copy(trace.quaternion);
    }
    capsule.scale.setScalar(1-.91*smooth(phase,.94,1));
  }
  setEncounterPhase(0);
  function frame(){
    return {up:new T.Vector3(0,1,0),east:new T.Vector3(1,0,0),north:new T.Vector3(0,0,-1),south:new T.Vector3(0,0,1),quaternion:new T.Quaternion()};
  }
  function height(lat,lon){const {x,z}=chart(lat,lon);return floorAt(x,z)??-80;}
  function point(lat,lon,lift=0){const {x,z}=chart(lat,lon);return new T.Vector3(x,height(lat,lon)+lift,z);}
  function move(lat,lon,east,north){return {lat:lat+north/chartScale,lon:lon+east/chartScale};}
  function free(x,z){
    if(floorAt(x,z)===null)return false;
    if(barriers.some(b=>Math.hypot(b.x-x,b.z-z)<b.r+.26))return false;
    const inside=witnessLocal(x,z);
    return !witnessFloor(x,z)||Math.abs(inside.x)<4.35||inside.z> -4.85;
  }
  function walk(lat,lon,east,north){
    let {x,z}=chart(lat,lon);
    const steps=Math.max(1,Math.ceil(Math.hypot(east,north)/.22)),dx=east/steps,dz=-north/steps;
    for(let i=0;i<steps;i++){
      if(free(x+dx,z+dz)){x+=dx;z+=dz;}
      else if(dx&&free(x+dx,z))x+=dx;
      else if(dz&&free(x,z+dz))z+=dz;
    }
    return ll(x,z);
  }
  function resolveArrival(lat,lon){
    const {x,z}=chart(lat,lon);if(free(x,z))return {lat,lon};
    let best=sites[0],distance=Infinity;
    for(const s of [...sites,...landingSites]){const d=Math.hypot(s.x-x,s.z-z);if(d<distance){distance=d;best=s;}}
    return {lat:best.lat,lon:best.lon};
  }
  function siteAt(lat,lon){
    const {x,z}=chart(lat,lon);
    if(witnessFloor(x,z))return sites[0];
    if(byronInside(x,z,BYRON_HOLD))return sites[3];
    if(z< -3&&x<23)return sites[2];
    return sites[1];
  }
  const localV=new T.Vector3();
  function blocksShuttle(p){
    if(ship.userData.blocksShuttle(p)||k.contains(p))return true;
    const wp=witnessLocal(p.x,p.z);localV.set(wp.x,p.y-w.y,wp.z);
    return o.contains(localV);
  }
  function clipCamera(aim,eye){
    const dir=eye.clone().sub(aim),steps=Math.ceil(dir.length()/.16),probe=new T.Vector3();
    for(let i=1;i<=steps;i++){
      probe.copy(aim).addScaledVector(dir,i/steps);
      if(blocksShuttle(probe)){eye.copy(aim).addScaledVector(dir,(i-1)/steps);break;}
    }
  }
  function landingInfo(lat,lon,footprint=7.4){
    const {x,z}=chart(lat,lon),r=Math.max(0,footprint);
    const ok=Math.abs(x+22)+r<=10.25&&Math.abs(z-43)+r<=11.4;
    return {ok,height:ok?6:height(lat,lon),top:ok?6:height(lat,lon),water:false,obstacle:!ok,slope:0,
      reason:ok?'':'请对准左舷青灯内的实体泊台'};
  }
  const isOutside=(lat,lon)=>{const {x,z}=chart(lat,lon);return witnessFloor(x,z)||byronInside(x,z,BYRON_DECK);};
  function record(lat,lon,key){
    if((key&&key!=='byron-yunas')||!isOutside(lat,lon))return null;
    const distance=point(lat,lon).distanceTo(bossPoint),at=coordinates(bossPoint);
    return {key:'byron-yunas',id:'byron-yunas',speciesId:4717,name:'原始黑洞·尤纳斯',kind:'apparition',
      siteId:'byron-witness',size:BYRON_BOSS.height,visible:true,distance,observationDistance:310,observationRange:510,
      portraitBearing:Math.atan2(w.x-bossPoint.x,w.z-bossPoint.z),focusPoint:bossPoint.clone(),lat:at.lat,lon:at.lon,fieldLock:''};
  }
  function pickSpirit(caster,lat,lon){
    const seen=record(lat,lon);if(!seen)return null;
    const hit=caster.intersectObject(apparition,true)[0];if(!hit)return null;
    const p=new T.Vector3(),step=Math.max(.22,hit.distance/1000);
    for(let d=.35;d<hit.distance;d+=step){caster.ray.at(d,p);if(blocksShuttle(p))return null;}
    return seen;
  }
  function update(lat,lon,dt=0){
    if(mode==='hidden')return;time+=dt;boss.animate(dt,0,time);boss.core.getWorldPosition(bossPoint);
    skyDebris.rotation.z=.012*Math.sin(time*.053);root.updateMatrixWorld(true);
  }
  const nothing=()=>null;
  return {root,kind:'ship',radius,chartScale,sites,landingSites,coordinates,chart,frame,height,point,move,walk,resolveArrival,siteAt,
    clipCamera,blocksShuttle,landingInfo,flightHeight:height,landingSite:id=>landingSites.find(s=>s.id===id),groundCorrection:()=>0,
    isSheltered:(lat,lon)=>!isOutside(lat,lon),setEncounterPhase,update,setMode(next){mode=next;root.visible=next!=='hidden';},
    nearbySpirit:record,spiritObservation:record,pickSpirit,withdrawSpirit:()=>false,portalAt:nothing,
    safariAction:nothing,safariWalk:nothing,safariHint:()=>'',setSafariState(){},interactSpiritSite:()=>'',spiritSiteHint:(lat,lon)=>siteAt(lat,lon).description,
    dispose(){
      apparition.remove(boss.root);boss.dispose();
      const geos=new Set(),mats=new Set();root.traverse(node=>{if(node.geometry)geos.add(node.geometry);for(const mat of [].concat(node.material||[]))mats.add(mat);if(node.isInstancedMesh)node.dispose?.();});
      for(const geo of geos)geo.dispose();for(const m of mats)m.dispose();world.remove(root);
    }};
}
