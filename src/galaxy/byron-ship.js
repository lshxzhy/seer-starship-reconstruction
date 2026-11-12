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

// Initial position of the exposed eye, in the same metres as the hull and pilot.
const BYRON_BOSS={x:-165,y:103,z:-382,height:1200};
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

function createByronHull(T,distant=false){
  const root=new T.Group(),k=byronKit(T,root),m=k.mat;
  root.name='拜伦号 · 赫尔卡遗舰';
  const black=0x23283d,navy=0x3b435f,slate=0x56637f,edge=0x64738a,plum=0x55445e;
  const cyan=0x50d7d1,pink=0xca49ac,steel=m(slate),iron=m(black),jade=m(0x316468),lamp=m(cyan,true);
  // Sections are cut across the vertical spine, the curved keel and the outside
  // of the inhabited deck. Each row holds height, centre, half spans and coating.
  const profile=[[-.56,-1],[.56,-1],[1,-.6],[1,.6],[.56,1],[-.56,1],[-1,.6],[-1,-.6]];
  const colours=new Map(),metal={pos:[],rgb:[],uv:[]},light={pos:[],rgb:[]},mix=T.MathUtils.lerp;
  function tone(hex){
    if(!colours.has(hex))colours.set(hex,new T.Color(hex).convertSRGBToLinear());
    return colours.get(hex);
  }
  function triangle(batch,hex,shade,a,b,c,uv){
    batch.pos.push(...a,...b,...c);
    const col=tone(hex);
    for(let n=0;n<3;n++)batch.rgb.push(col.r*shade,col.g*shade,col.b*shade);
    if(batch.uv&&!distant)batch.uv.push(...(uv||[.002,.002,.002,.002,.002,.002]));
  }
  function quad(batch,hex,shade,a,b,c,d,tile){
    if(tile===undefined){triangle(batch,hex,shade,a,c,b);triangle(batch,hex,shade,b,c,d);return;}
    const u=(tile%2)*.5+.003,v=Math.floor(tile/2)*.5+.003,w=.494;
    triangle(batch,hex,shade,a,c,b,[u,v,u,v+w,u+w,v]);
    triangle(batch,hex,shade,b,c,d,[u+w,v,u,v+w,u+w,v+w]);
  }
  function vertex(row,i){
    const [u,v]=profile[i%8];return [row[1]+u*row[3],row[0],row[2]+v*row[4]];
  }
  function shell(rows,plate=false){
    for(let j=0;j<rows.length-1;j++){
      const lo=rows[j],hi=rows[j+1],dy=hi[0]-lo[0];
      const west=Math.min(lo[1]-lo[3],hi[1]-hi[3]),east=Math.max(lo[1]+lo[3],hi[1]+hi[3]);
      const fore=Math.min(lo[2]-lo[4],hi[2]-hi[4]),aft=Math.max(lo[2]+lo[4],hi[2]+hi[4]);
      if(!distant)k.volume(west,east,fore,aft,p=>{
        if(p.y<=lo[0]||p.y>=hi[0])return false;
        const h=(p.y-lo[0])/dy,x=Math.abs(p.x-mix(lo[1],hi[1],h))/mix(lo[3],hi[3],h);
        const z=Math.abs(p.z-mix(lo[2],hi[2],h))/mix(lo[4],hi[4],h);
        return x<1&&z<1&&.4*x+.44*z<.84-.4*.44;
      });
      for(let i=0;i<8;i++){
        const a=vertex(lo,i),b=vertex(lo,i+1),c=vertex(hi,i),d=vertex(hi,i+1);
        const dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dz);
        const shade=.82+.055*((i+2*j)%4);
        quad(metal,lo[5],shade,a,b,c,d);
        if(distant||!plate||dy<3.4||len<4)continue;
        const count=Math.max(1,Math.round(len/8)),nx=dz/len,nz=-dx/len;
        function panelPoint(u,h,raise){
          return [mix(mix(a[0],b[0],u),mix(c[0],d[0],u),h)+nx*raise,
            lo[0]+h*dy,mix(mix(a[2],b[2],u),mix(c[2],d[2],u),h)+nz*raise];
        }
        for(let n=0;n<count;n++){
          const left=(n+.035)/count,right=(n+.965)/count;
          const patch=(batch,hex,sh,u,v,h,top,r,tile)=>quad(batch,hex,sh,panelPoint(u,h,r),panelPoint(v,h,r),panelPoint(u,top,r),panelPoint(v,top,r),tile);
          patch(metal,lo[5],1.03+.095*((n+i*j)%3),left,right,.07,.95,.11,(n+3*i+j)%4);
          if((n+i+j)%4===1||dy>=14)continue;
          const u=left+.15/count,v=right-.13/count;
          patch(metal,black,.82,u,v,.47,.82,.18);
          patch(light,(n+2*i+j)%8?cyan:pink,.83,u+.06/count,v-.06/count,.56,.68,.21);
        }
      }
    }
    for(const last of [false,true]){
      const row=last?rows[rows.length-1]:rows[0],mid=[row[1],row[0],row[2]];
      for(let i=0;i<8;i++){
        const a=vertex(row,i),b=vertex(row,i+1);
        triangle(metal,row[5],1,mid,last?b:a,last?a:b);
      }
    }
  }
  // Broad broken waist with an undercut above the engine trench.
  shell([[-22,-3,-6,23,51,black],[-16,-2,-3,33,62,plum],[-12,-1,-2,38,68,navy],
    [-9,0,0,41,73,black],[-5,0,0,39,73,edge],[-2.7,0,0,44,78,navy],[-1,0,0,43,79,slate]],true);
  k.prism(m(0x474359),BYRON_DECK,-1,6,!distant);
  // The reference tower has an armoured prow above the bridge with a swept
  // sensor blade on top. The broken shoulder leaves daylight underneath it.
  shell([[-17,-30,-19,9,26,black],[3,-31,-19,10,28,slate],[17,-32,-20,8,25,navy],
    [26,-31,-25,8,26,black],[35,-29,-30,9,26,navy],[42,-28,-31,8,24,edge],
    [47,-27,-34,7,21,black]],true);
  shell([[36,-28,-30,8,26,black],[41,-28,-29,13,36,plum],[44,-28,-28,14,40,slate],
    [50,-28,-31,12,34,navy],[54,-27,-38,8,19,slate],[55,-27,-39,6,16,navy]],true);
  shell([[53,-27,-40,5.8,11,black],[60,-26,-43,5,9,navy],[66,-25,-46,3.5,7,edge],
    [73,-24,-53,1.7,4,slate],[80,-23,-61,.22,.48,black]]);
  // Reinforced hook tapering beneath the inhabited ring. Its foot curls
  // back towards the bow, giving the wreck its distinctive tall silhouette.
  shell([[-96,-13,-24,.7,1.6,edge],[-92,-15,-17,2.9,6,navy],[-84,-17,-6,4.7,12,slate],
    [-70,-20,2,6.8,15,navy],[-50,-22,3,7.7,17,black],[-45,-22,3,8.6,19,slate],
    [-40,-23,2,8.5,18,black],[-31,-25,0,10,19,navy],[-17,-26,-4,12,22,slate],[-10,-25,-5,14,23,black]],true);
  shell([[-63,-12,0,6,12,black],[-59,-10,0,12,17,navy],[-54,-10,-1,16,20,plum],
    [-51,-11,-3,14,19,black]],true);
  shell([[-34,-16,-3,9,18,black],[-29,-12,-6,19,23,plum],[-24,-12,-7,21,25,navy],
    [-20,-15,-7,16,19,black]],true);
  // Turquoise observatory and its projecting base, above the broad deck.
  shell([[16,-29,-11,5,9,black],[19,-23,-7,11,12,navy],[22,-21,-6,12,12,slate],
    [24,-20,-6,10,10,black]],true);
  k.ball(jade,-17,24,-4,6.9,2.5,6.9,!distant);k.ball(lamp,-17,25,-4,5.4,4.9,5.4,!distant);
  k.ring(steel,-17,25.4,-4,5.9);
  for(const side of [-1,1]){
    // A pair of blades projects beyond the waist. Struts run back to the
    // frame; the shorter blades in the lower keel repeat the same mounting.
    for(const [x,y,z,reach] of [[38,-4,-28,24],[37,-9,12,16],[0,-55,-8,13]]){
      const base=side*x,tip=base+side*reach;
      shell([[y-1.3,base+side*2,z,2.4,5.8,black],[y,base+side*reach*.46,z-4,reach*.54,7.2,slate],
        [y+1.8,base+side*reach*.54,z-7,reach*.5,4.2,navy]]);
      k.line(iron,[base,y-6,z+5],[tip-side*3,y,z-4],.75);
    }
    const x=side*15;
    k.ball(iron,x,-8,58,8.6,6.4,13,!distant);
    const nozzle=new T.LatheGeometry([[3.5,48],[7.5,55],[8.1,59],[7.3,64],[6.25,69],[4.5,69],[3.2,60]].map(([r,z])=>new T.Vector2(r,z)),32);
    nozzle.rotateX(Math.PI/2);k.put(nozzle,steel,x,-8,0);
    for(const z of [58.2,63.1,68.7])k.ring(z===63.1?lamp:iron,x,-8,z,z===58.2?7.9:z===63.1?7:5.9,5.8,0);
    if(distant)continue;
    for(let n=0;n<10;n++){
      const a=n*Math.PI/5,ray=(r,z)=>[x+r*Math.cos(a),-8+r*Math.sin(a),z];
      k.line(iron,ray(7.8,57),ray(6.0,67.6),.32);
    }
  }
  if(!distant){
    // Flexible conduit and fittings on the visible face of the lower keel.
    for(let i=0;i<3;i++){
      const x=-14+i*1.13;
      k.pipe(i===1?steel:iron,[[x,-18,20],[x,-33,18],[x,-49,19],[x,-68,14],[x+1,-79,5],[x+1,-88,-10]],.43);
    }
    for(const [x,y,z,r] of [[-12,-37,14,2.7],[-12,-62,15,2.1],[-22,33,-9,2.8]]){
      k.ball(iron,x,y,z,r*1.5,r*1.2,r);k.ring(steel,x+.25,y,z+r*.82,r, r,0);
      k.ball(lamp,x+.3,y,z+r*.92,r*.67,r*.67,r*.30);
    }
    for(let i=0;i<BYRON_DECK.length;i++){
      const a=BYRON_DECK[i],b=BYRON_DECK[(i+1)%BYRON_DECK.length],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
      if(len<9)continue;
      const n=Math.ceil(len/8),yaw=Math.atan2(dx,dz),nx=dz/len,nz=-dx/len;
      for(let j=0;j<n;j++){
        const x=a[0]+dx*(j+.5)/n,z=a[1]+dz*(j+.5)/n;
        k.box(steel,x+nx*.14,2.9,z+nz*.14,.5,4.7,len/n-.45,0,yaw);
        k.box(iron,x+nx*.48,3.5,z+nz*.48,.35,1.8,len/n-.95,0,yaw);
        if(j%3!==1)k.box(lamp,x+nx*.69,3.6,z+nz*.69,.12,.42,len/n*.58,0,yaw);
      }
    }
  }
  for(const [batch,paint] of [[metal,new T.MeshStandardMaterial({vertexColors:true,roughness:.53,metalness:.36})],
    [light,new T.MeshBasicMaterial({vertexColors:true})]]){
    if(!batch.pos.length){paint.dispose();continue;}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(batch.pos,3));
    if(batch.uv?.length){
      geo.setAttribute('uv',new T.Float32BufferAttribute(batch.uv,2));
      paint.map=armourColour;paint.bumpMap=paint.roughnessMap=armourHeight;paint.bumpScale=.035;
    }
    geo.setAttribute('color',new T.Float32BufferAttribute(batch.rgb,3));geo.computeVertexNormals();k.put(geo,paint,0,0,0);
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
  for(const paint of [iron,purple,jade,pale,copper])fieldSurfaceFinish(paint,'metal');
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
    const yaw=-.19,rail=(u,h,v)=>[x+u*Math.cos(yaw)+v*Math.sin(yaw),h,z-u*Math.sin(yaw)+v*Math.cos(yaw)];
    k.box(iron,x,6.18,z,2.42,.36,5.90,0,yaw,0,true);
    k.box(pale,x,6.37,z,2.12,.24,5.48,0,yaw);
    for(const u of [-.37,.37]){
      k.line(cyan,rail(u,6.67,-2.16),rail(u,6.67,2.16),.29);
      k.line(ice,rail(u-.11,6.91,-2.09),rail(u-.11,6.91,2.09),.057);
    }
    for(const v of [-2.32,2.32]){
      const [xx,h,zz]=rail(0,6.66,v);k.box(hull,xx,h,zz,1.97,.63,.46,0,yaw);
      k.line(pale,rail(-.88,6.98,v),rail(.88,6.98,v),.075);
    }
    for(const u of [-.85,.85])k.line(pale,rail(u,6.81,-2.29),rail(u,6.81,2.29),.085);
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
  // Pivot blocks sit outside the ramp. The hinge shaft and both piston rods
  // run up to the underside of the open cover seen in the deck artwork.
  for(const s of [-1,1]){
    const x=-11.1+s*5.4,outline=[[x-.99,10.1],[x-.8,9.3],[x+.72,9.3],[x+1.04,10.45],[x+.93,16.64],[x+.54,17.43],[x-.68,17.43],[x-1.04,16.62]];
    k.prism(iron,outline,6.04,6.68,true);k.prism(jade,outline,6.68,7.53,true);obstruct(x,13.5,1.01);
    k.line(iron,[x,7.54,15.95],[x,9.07,14.79],.48);
    k.line(pale,[x,9.07,14.79],[x,12.75,12.62],.26);
    k.line(hull,[x,7.34,10.7],[x,10.23,8.2],.57);
    for(const z of [8.2,12.63])k.line(pale,[x-.64,z<10?10.2:12.76,z],[x+.64,z<10?10.2:12.76,z],.33);
    for(let j=0;j<4;j++)k.box(j===0?cyan:shadow,x+s*.95,7.1,11.04+j*.94,.12,.40,.56);
  }
  k.box(glass,-11.1,11.65,10.5,9.4,.29,6.1,-.55);
  for(const x of [-15.84,-6.36])k.box(pale,x,11.62,10.5,.28,.44,6.35,-.55);
  for(const z of [7.88,13.12]){
    const y=11.65+(z-10.5)*Math.tan(.55);
    k.box(jade,-11.1,y,z,9.65,.48,.42,-.55);k.box(cyan,-11.1,y+.22,z-.11,7.9,.045,.14,-.55);
  }
  const serviceHatch=[[7.02,15.11],[7.80,14.14],[12.48,14.14],[13.18,15.11],[13.18,20.9],[12.43,21.84],[7.66,21.84],[7.02,21.09]];
  k.prism(iron,serviceHatch,6.04,6.83,true);k.prism(jade,serviceHatch,6.83,7.06);obstruct(10.1,18,2.85);
  k.box(shadow,10.1,7.09,18,4.95,.08,5.60);
  for(let j=0;j<6;j++)k.box(j%2?hull:copper,10.1,7.14,15.77+j*.88,4.45,.08,.21);
  k.box(glass,10.1,7.22,18,4.75,.075,5.44);
  for(const s of [-1,1]){
    k.box(pale,10.1+s*2.45,7.30,18,.14,.20,5.63);k.box(cyan,10.1+s*2.53,6.97,18,.13,.18,3.16);
    for(const z of [15.73,20.38])k.ball(amber,10.1+s*1.83,7.22,z,.12,.11,.12);
  }
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
    const [edgeX,edgeZ]=polar(10.7,a+.07);
    k.box(iron,edgeX,.205,edgeZ,8.65,.055,.12,0,-(a+.07));
    if(j%3===0){
      const [jackX,jackZ]=polar(10.2,(a+b)/2);
      k.ring(iron,jackX,.23,jackZ,.69);
      for(let n=0;n<3;n++)k.box(pale,jackX-.42+n*.42,.235,jackZ,.11,.07,.46,0,-a);
    }
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
    for(let n=0;n<5;n++){
      const rad=14.14+.48*n,h=4.83+.77*n;
      k.line(n===2?pale:iron,pos(rad-.10,h-.15),pos(rad+.10,h+.15),1.02);
    }
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
  const trainingGlass=[[4,-56],[9,-60],[27,-60],[31,-55],[31,-43],[27,-38],[10,-38],[4,-43]];
  k.prism(glass,trainingGlass,.08,.17);
  trainingGlass.forEach(([x,z],i)=>{
    const [xx,zz]=trainingGlass[(i+1)%trainingGlass.length];
    k.line(iron,[x,.17,z],[xx,.17,zz],.28);k.line(ice,[x,.29,z],[xx,.29,zz],.078);
  });
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
      for(const h of [1.74,1.94,6.52])k.ring(pale,x,h,z,h<2?2.45:1.31,h<2?2.21:1.05);
      for(let n=0;n<7;n++){
        const a=n*2.4,h=2.5+n*.38;
        k.ball(glass,x+1.13*Math.cos(a),h,z+.72*Math.sin(a),.19,.25,.19);
      }
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
  const trim=o.mat(0x596b90),pad=o.mat(0x2d3757);
  const finish=cabinFinish('enamel');Object.assign(cab,finish);Object.assign(trim,finish);
  const displayPlane=new T.PlaneGeometry(1,1),displays=[];
  for(let type=0;type<2;type++){
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
    const c=canvas.getContext('2d'),bg=c.createLinearGradient(0,0,208,128);
    bg.addColorStop(0,type?'#5d579c':'#0b6d8d');bg.addColorStop(1,type?'#262c5b':'#103e67');
    c.fillStyle=bg;c.fillRect(0,0,256,128);c.strokeStyle=type?'#797ea9':'#468caa';c.lineWidth=.8;
    c.beginPath();
    for(let u=12;u<256;u+=16){c.moveTo(u,0);c.lineTo(u,128);}
    for(let v=12;v<128;v+=16){c.moveTo(0,v);c.lineTo(256,v);}
    c.stroke();c.strokeStyle=c.fillStyle=type?'#e2d5ff':'#8bf9ff';c.lineWidth=2;
    c.font='bold 15px sans-serif';c.fillText(type?'ENGINE':'NAV',12,20);
    if(type){
      for(let n=0;n<2;n++){
        c.beginPath();
        for(let i=0;i<170;i+=2){
          const y=61+7*Math.sin(.13*i+n)+12*Math.sin(.036*i+.7*n)+n*19;
          if(i)c.lineTo(9+i,y);else c.moveTo(9,y);
        }
        c.stroke();
      }
    }else{
      for(const radius of [17,37,53]){c.beginPath();c.ellipse(88,72,radius,radius*.66,-.25,0,tau);c.stroke();}
      c.beginPath();c.moveTo(71,82);c.lineTo(98,66);c.lineTo(89,81);c.closePath();c.fill();
    }
    for(let i=0;i<8;i++){c.fillRect(194,27+i*10,14+32*Math.abs(Math.sin(.81*i+.7*type)),3);}
    const map=new T.CanvasTexture(canvas);map.encoding=T.sRGBEncoding;map.anisotropy=4;
    const material=new T.MeshBasicMaterial({map,toneMapped:false});
    material.addEventListener('dispose',()=>map.dispose());displays.push(material);
  }
  function witnessObstacle(x,z,radius){obstruct(w.x+co*x+si*z,w.z-si*x+co*z,radius);}
  function instrument(x,y,z,width,height,tilt,channel){
    o.box(seam,x,y,z,width+.19,height+.18,.18,tilt);
    o.put(displayPlane,displays[channel],x,y-.10*Math.sin(tilt),z+.10*Math.cos(tilt),width,height,1,tilt);
    for(const s of [-1,1])o.box(trim,x+s*(width*.5+.075),y,z+.055,.055,height+.08,.14,tilt);
  }
  o.box(cab,0,-.72,4.44,16,1.42,10.48,0,0,0,true);
  o.box(cab,0,-.94,-2.24,16,.20,Math.hypot(2.88,1.68),-Math.atan2(1.68,2.88),0,0,true);
  o.box(cab,0,-2.12,-5.46,16,.88,3.6,0,0,0,true);
  o.box(seam,0,-3.06,1.7,13.3,1.05,14.6,0,0,0,true);
  o.box(cab,0,3.3,9.2,16.1,7.4,.62,0,0,0,true);
  o.box(seam,0,7.4,.8,16.4,.78,17.0,0,0,0,true);
  // A low transverse flight console follows the sill. The instrument faces
  // tilt toward the lowered gallery, leaving both eyelines clear over its rim.
  o.prism(seam,[[-4.62,-6.51],[4.62,-6.51],[4.49,-5.61],[3.17,-5.13],[-3.17,-5.13],[-4.49,-5.61]],-1.68,-1.13,true);
  for(let n=0;n<3;n++){
    const x=(n-1)*1.95;
    o.box(trim,x,-1.01,-5.81,1.92,.31,1.10,-.18);
    instrument(x,-.72,-5.80,1.53,.60,-.67,n%2);witnessObstacle(x,-5.84,.77);
    for(let j=0;j<5;j++)o.box(j===4?blue:silver,x-.58+j*.27,-.95,-5.32,.16,.065,.13);
  }
  for(const z of [-5.94,-5.64])o.line(silver,[-3.67,-1.13,z],[3.67,-1.13,z],.053);
  for(const side of [-1,1]){
    o.box(cab,side*8.05,3.35,1.1,.56,7.2,17.0,0,0,0,true);
    // Three nested steel profiles expose the dark pressure seal between them.
    for(const [offset,radius,paint] of [[0,.34,seam],[.20,.19,trim],[.33,.082,silver]]){
      o.line(paint,[side*(7.74-offset),-1.64,-6.45],[side*(7.34-offset),6.89,-6.76],radius);
    }
    o.line(blue,[side*7.48,.56,-6.3],[side*7.21,4.7,-6.4],.063);
    const bank=side*5.85;
    o.prism(trim,[[4.10,-6.81],[7.73,-6.73],[7.73,-3.94],[6.83,-3.77],[4.26,-4.88]].map(([x,z])=>[side*x,z]),-1.59,-.16,true);
    o.box(cab,bank,-.16,-5.70,2.89,.43,1.34,-.26);
    instrument(bank,.099,-5.69,2.23,.85,-.61,side>0?0:1);
    for(let row=0;row<2;row++)for(let n=0;n<5;n++){
      o.box(n===3&&row?lavender:silver,bank+(n-2)*.38,-.15-row*.043,-5.02+row*.23,.22,.063,.115,-.25);
    }
    o.line(trim,[bank-1.19,-.30,-4.73],[bank+1.19,-.30,-4.73],.092);
    for(let j=0;j<7;j++){
      const h=-.85+j*1.06;
      o.box(trim,side*(7.57-.041*j),h,-6.23,.44,.13,.40);
      o.ball(silver,side*(7.57-.041*j),h,-5.99,.070,.072,.038);
    }
    // High-backed pilot buckets and their side controls, outside the centre aisle.
    const seat=side*5.6,z=2.95;witnessObstacle(seat,z,.89);
    o.disk(seam,seat,.18,z,.63,.36,.83);o.disk(trim,seat,.49,z,.37,.48,.45);
    o.ball(seam,seat,.91,z,.94,.42,1.02,true);o.ball(pad,seat,1.12,z,.75,.25,.79);
    o.box(trim,seat,1.97,z+.77,1.56,2.20,.33,.16,0,0,true);
    o.ball(pad,seat,1.99,z+.55,.78,1.07,.25);
    o.box(seam,seat,2.96,z+.74,1.03,.52,.43,.14);
    for(const arm of [-1,1]){
      o.line(trim,[seat+arm*.56,.56,z+.01],[seat+arm*.91,1.27,z-.36],.115);
      o.box(cab,seat+arm*.88,1.30,z-.13,.27,.22,1.08,-.07);
      o.box(blue,seat+arm*.88,1.42,z-.38,.16,.045,.36,-.07);
    }
    for(let j=0;j<5;j++){
      const z=-3.73+j*2.52;
      o.box(trim,side*7.65,4.82,z,.52,1.05,.40,0,0,-side*.19);
      o.line(trim,[side*7.71,5.0,z],[side*6.44,6.99,z-.26],.22);
      o.box(seam,side*6.25,6.93,z,2.82,.32,2.19);o.box(silver,side*6.09,6.72,z+.67,1.79,.062,.24);
      o.box(blue,side*7.68,2.43,z,.069,.125,.86);
    }
  }
  for(const [h,z,r,p] of [[6.92,-6.55,.33,seam],[6.77,-6.70,.19,trim],[6.65,-6.83,.075,silver]])o.line(p,[-7.4,h,z],[7.4,h,z],r);
  o.line(seam,[-7.62,-1.75,-6.35],[7.62,-1.75,-6.35],.18);
  for(const x of [-5.18,5.42])o.line(silver,[x,-1.66,-6.54],[x+(x>0?1.43:-1.4),6.75,-6.65],.16);
  for(let j=0;j<5;j++)for(const x of [-6.45,6.45])o.box(j%2?blue:lavender,x,.03,1.8+j*1.27,.34,.038,.91);
  o.finish();

  const encounter=new T.Group();encounter.name='原始黑洞 · 拜伦号撞击现场';root.add(encounter);
  const boss=createYunasFigure(T,4717,{height:BYRON_BOSS.height});
  const apparition=new T.Group();
  apparition.rotation.y=Math.PI+Math.atan2(w.x-BYRON_BOSS.x,w.z-BYRON_BOSS.z);
  apparition.userData.byronSpirit='byron-yunas';apparition.add(boss.root);encounter.add(apparition);
  const lensOffset=boss.core.getWorldPosition(new T.Vector3());
  // The contacting material in 1002-10 pushes against the bow. The growth is
  // actual geometry between ship and eye, with the stern and its engines visible.
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
  const travelAxis=new T.Vector3(0,0,-1),grip=new T.Vector3(6.18,-.62,.90),toEye=new T.Vector3();
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
    const scale=1+.065*engulf-.65*collapse;
    orbitPivot.set(BYRON_BOSS.x+approach*48,BYRON_BOSS.y-approach*24,BYRON_BOSS.z+approach*125);
    apparition.scale.setScalar(scale);apparition.position.copy(orbitPivot).addScaledVector(lensOffset,-scale);
    boss.core.getWorldPosition(bossPoint);
    for(const {sheet,geo,j,rings,slices} of waves){
      const reach=.20+.80*engulf-.32*collapse,positions=geo.attributes.position;
      const near=Math.max(0,Math.cos(j*tau/8));
      for(let i=0;i<=rings;i++){
        const row=i/rings,t=row*reach,tip=smooth(row,.72,1),atEye=1-smooth(t,0,.64);
        const x=-30+24*t+(bossPoint.x+30+52*scale)*atEye;
        const y=31*(1-t)+1.6*t+4*Math.sin(t*3.3+j*.4)+(bossPoint.y-31-63*scale)*atEye;
        const z=-142+(163+97*near**.64)*t+(5.4*Math.sin(j*2.43)-8.5)*t*t+(bossPoint.z+142+73*scale)*atEye;
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
    skyDebris.scale.setScalar(.93+.13*engulf-.39*collapse);
    skyDebris.position.set(-7*collapse,5*collapse,-40*collapse);
    const leg=phase<=.73?.535*smooth(phase,.50,.73):.535+.465*smooth(phase,.73,.98);
    trace.visible=phase>=.50&&phase<.993;trace.position.copy(track.getPointAt(leg));
    const finalRun=smooth(phase,.835,.985),heading=track.getTangentAt(leg);
    toEye.subVectors(bossPoint,trace.position).normalize();heading.lerp(toEye,finalRun).normalize();
    trace.quaternion.setFromUnitVectors(travelAxis,heading);trace.position.lerp(bossPoint,finalRun);
    trace.scale.setScalar(1-.82*smooth(phase,.94,1));
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
      siteId:'byron-witness',size:BYRON_BOSS.height,visible:true,distance,observationRange:BYRON_BOSS.height,
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
  return {root,kind:'ship',encounterCore:bossPoint,radius,chartScale,sites,landingSites,coordinates,chart,frame,height,point,move,walk,resolveArrival,siteAt,
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
