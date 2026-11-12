// One Cartesian frame for the ship, both observation craft and the 2025 encounter.
// The lat/lon fields in the shared navigation record encode deck metres, not a globe.
const BYRON_WORLD=(()=>{
  const chartScale=400,site=(id,name,x,z,lookAt,description,extras={})=>({
    id,name,x,z,lat:-z/chartScale,lon:x/chartScale,lookAt,description,...extras});
  return {id:'byron',kind:'ship',name:'拜伦号',radius:100,chartScale,
    sites:[
      site('byron-witness','吞舰现场 · 逃生舰',180,182,[-26,-65],'从逃生舰前窗看拜伦号破口不断脱落的残骸汇入尤纳斯。',{lookPitch:-.085}),
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
const BYRON_WITNESS={x:180,y:72,z:182,yaw:Math.atan2(206,247)};
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
  function mat(c,lit=false,glass=false,finish='paint'){
    const key=[c,lit,glass,finish].join('/');
    if(!materials.has(key)){
      const paint=new T.Color(c).convertSRGBToLinear();
      const surface=new T.MeshStandardMaterial({color:paint,metalness:glass?.12:.35,roughness:glass?.21:.56,
        emissive:lit?paint:0,emissiveIntensity:lit?.89:0,transparent:glass,opacity:glass?.33:1,depthWrite:!glass,side:glass?T.DoubleSide:T.FrontSide});
      if(!lit){
        if(glass)applyWindowFresnel(surface);
        else if(finish==='metal')fieldSurfaceFinish(surface,'metal');
        else applyManufacturedFinish(surface,finish);
      }
      materials.set(key,surface);
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

// Exposed edges of the three broken webs. The draw and debris systems share metres.
const BYRON_TEAR_SITES=[
  {x:36,y:-11,z:8,normal:[.91,.29,.28]},
  {x:-10,y:36,z:-31,normal:[.73,.64,.24]},
  {x:2,y:-43,z:10,normal:[.78,-.49,.38]}
];

function finishByronCoating(T,paint){
  const sheet=document.createElement('canvas');sheet.width=sheet.height=1;
  const ctx=sheet.getContext('2d');ctx.fillStyle='#353b3e';ctx.fillRect(0,0,1,1);
  const tile=new T.CanvasTexture(sheet);
  tile.wrapS=tile.wrapT=T.RepeatWrapping;tile.anisotropy=4;
  const image=new Image();
  image.onload=()=>{
    sheet.width=image.naturalWidth;sheet.height=image.naturalHeight;
    ctx.drawImage(image,0,0);tile.needsUpdate=true;
  };
  image.src=BYRON_COATING_URL;
  paint.onBeforeCompile=s=>{
    s.uniforms.byronMineral={value:tile};
    s.vertexShader='attribute vec2 stoneUV; varying vec2 stoneCoord;\n'+s.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nstoneCoord=stoneUV;');
    s.fragmentShader='uniform sampler2D byronMineral; varying vec2 stoneCoord;\n'+s.fragmentShader.replace('#include <color_fragment>',
      `#include <color_fragment>
       vec3 stoneSample=texture2D(byronMineral,stoneCoord).rgb;
       vec3 stoneGrain=clamp(stoneSample/vec3(.208,.231,.243),.42,1.92);
       float stoneValue=dot(stoneGrain,vec3(.21,.72,.07));
       float stoneDetail=1.-smoothstep(.009,.065,length(fwidth(stoneCoord)));
       float cleavage=sin(dot(stoneCoord,vec2(18.4,-9.6))+.7*sin(7.*stoneCoord.y));
       float facet=smoothstep(.92,1.35,stoneValue)*smoothstep(-.33,.63,cleavage);
       float stoneHeight=.042*(stoneValue-1.)+.012*cleavage;
       diffuseColor.rgb*=mix(vec3(1.),stoneGrain,.72);`).replace('#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
       roughnessFactor=clamp(roughnessFactor+.17*(1.-stoneValue)-.20*stoneDetail*facet,.18,.92);`)
      .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
       vec3 stoneDx=dFdx(-vViewPosition),stoneDy=dFdy(-vViewPosition);
       vec3 stoneX=cross(stoneDy,normal),stoneY=cross(normal,stoneDx);
       float stoneDet=dot(stoneDx,stoneX);
       normal=normalize(max(abs(stoneDet),1.e-7)*normal-sign(stoneDet)*stoneDetail*
          (dFdx(stoneHeight)*stoneX+dFdy(stoneHeight)*stoneY));`);
  };
  paint.customProgramCacheKey=()=>'byron-blackstone';
  paint.addEventListener('dispose',()=>{image.onload=null;tile.dispose();});
}
function createByronHull(T,distant=false){
  const root=new T.Group(),k=byronKit(T,root),m=k.mat;
  root.name='拜伦号 · 黑石残舰';
  const obsidian=0x172d36,basalt=0x30444b,flint=0x526269,cut=0x78818a,oxide=0x62505b;
  const obs=m(obsidian),dark=m(0x111b24),frame=m(flint),copper=m(0x7f6262);
  const red=m(0xe34a30,true),amber=m(0xfc9270,true),ice=m(0x4ca69f,true);
  const metal={pos:[],rgb:[],uv:[],stoneUV:[]},coat=new Map();
  const pt=(x,y,z)=>new T.Vector3(x,y,z),scratch=pt();
  const tileUV=[[.015,.015],[.485,.015],[.485,.485],[.015,.485]];
  function tri(a,b,c,dye,tile,indices){
    if(!coat.has(dye))coat.set(dye,new T.Color(dye).convertSRGBToLinear());
    const col=coat.get(dye);
    const n=distant?null:b.clone().sub(a).cross(c.clone().sub(a));
    for(const [i,p] of [a,b,c].entries()){
      metal.pos.push(p.x,p.y,p.z);metal.rgb.push(col.r,col.g,col.b);
      if(!distant){
        // Project in hull metres, including cuts and bent surfaces without panel UVs.
        const nx=Math.abs(n.x),ny=Math.abs(n.y),nz=Math.abs(n.z);
        const u=nx>=ny&&nx>=nz?p.z:p.x,v=ny>=nx&&ny>=nz?p.z:p.y;
        metal.stoneUV.push(u/7.3,v/7.3);
        const uv=tile==null?[.003,.003]:tileUV[indices[i]];
        metal.uv.push(uv[0]+(tile!=null?(tile%2)*.5:0),uv[1]+(tile!=null?Math.floor(tile/2)*.5:0));
      }
    }
  }
  function face(a,b,c,d,dye,tile){
    tri(a,b,c,dye,tile,[0,1,2]);tri(a,c,d,dye,tile,[0,2,3]);
  }
  function solid(a,b,c,d){
    if(distant)return;
    const tris=[new T.Triangle(a,b,c),new T.Triangle(a,c,d)],nodes=[a,b,c,d];
    const xs=nodes.map(p=>p.x),ys=nodes.map(p=>p.y),zs=nodes.map(p=>p.z);
    const y0=Math.min(...ys)-.38,y1=Math.max(...ys)+.38;
    k.volume(Math.min(...xs)-.4,Math.max(...xs)+.4,Math.min(...zs)-.4,Math.max(...zs)+.4,
      p=>p.y>=y0&&p.y<=y1&&tris.some(t=>t.closestPointToPoint(p,scratch).distanceToSquared(p)<.145));
  }
  // Longitudinal rings are uneven in plan and height. This shell has an arched
  // back, a sloping brow and a turned-under lip as in the original map symbol.
  const profile=[[-1,.31],[-.85,.71],[-.48,.952],[-.045,1],[.51,.91],[.86,.73],[1,.43],[.91,.235],[.52,.065],[-.22,0],[-.81,.11]];
  const brow=[
    [75,-39,3,-4,6],[67,-42,7,-5,15],[53,-44,8,-7,29],
    [32,-43,8.5,-5,44],[14,-38,12.8,5,53],[-6,-31,17.1,13,59],
    [-25,-22,19.5,15,62],[-44,-15,18,18,59],[-60,-10,13,24,54],[-78,-5,3.1,44,55]
  ];
  const skirt=[
    [78,-8,5,-6,.2],[68,-7,18,-12,1],[54,-4,34,-19,2.5],
    [34,-1,40,-23,4],[13,1,39,-28,4],[-8,0,36,-29,3],
    [-32,-1,33,-24,3],[-51,1,31,-17,3],[-68,3,23,-11,1],[-80,2,8,-6,-.5]
  ];
  function point(row,section){
    const [u,h]=profile[section%profile.length];
    return pt(row[1]+u*row[2],row[3]+(row[4]-row[3])*h,row[0]);
  }
  function loft(rows,hood){
    for(let j=0;j<rows.length-1;j++){
      for(let i=0;i<profile.length;i++){
        const a=point(rows[j],i),b=point(rows[j],i+1),c=point(rows[j+1],i+1),d=point(rows[j+1],i);
        const cutaway=hood?j>=5&&j<=7&&i>=6&&i<=8:
          j>=3&&j<=6&&i>=5&&i<=8;
        if(cutaway)continue;
        const dye=(hood?[obsidian,basalt,0x384b50,basalt,0x48595e,obsidian,0x27373e]:
          [basalt,flint,basalt,0x35454d,basalt,0x3a4750,obsidian])[i%7];
        face(a,b,c,d,dye);solid(a,b,c,d);
        if(distant||b.distanceTo(a)<3||d.distanceTo(a)<6)continue;
        const n=b.clone().sub(a).cross(d.clone().sub(a)).normalize();
        function on(u,v,height){return a.clone().lerp(b,u).lerp(d.clone().lerp(c,u),v).addScaledVector(n,height);}
        const columns=Math.max(1,Math.round(b.distanceTo(a)/6.5)),div=Math.max(1,Math.round(d.distanceTo(a)/8.7));
        for(let u=0;u<columns;u++)for(let v=0;v<div;v++){
          const left=(u+.021)/columns,right=(u+.979)/columns,front=(v+.022)/div,back=(v+.978)/div;
          const id=i*11+j*7+u*5+v,shade=id%7===3?0x405057:dye;
          face(on(left,front,.11),on(right,front,.11),on(right,back,.11),on(left,back,.11),shade,id%4);
        }
      }
    }
    for(const end of [0,rows.length-1]){
      const r=rows[end],center=pt(r[1],(r[3]+r[4])*.5,r[0]);
      for(let i=0;i<profile.length;i++){
        const a=point(r,i),b=point(r,i+1);tri(center,end?b:a,end?a:b,basalt);
      }
    }
  }
  loft(brow,true);loft(skirt,false);
  // The original symbol has one warm dorsal slit and an ember in its blunt
  // bow. A second blue band of regular portholes would alter its silhouette.
  for(let j=2;j<=5;j++){
    const between=(row,h)=>point(row,4).lerp(point(row,5),h);
    const a=between(brow[j],.35),b=between(brow[j+1],.35);
    const offset=pt(.44,.6,0);
    k.line(dark,a.toArray(),b.toArray(),2.55);
    const end=a.clone().lerp(b,.965);a.lerp(b,.023);
    a.addScaledVector(offset,3.3);end.addScaledVector(offset,3.3);
    k.line(red,a.toArray(),end.toArray(),1.46);
    if(!distant&&j%3===1){const tip=a.clone().lerp(end,.58);k.line(amber,a.clone().addScaledVector(offset,.78).toArray(),tip.addScaledVector(offset,.78).toArray(),.37);}
  }
  k.box(dark,-37.55,13.3,52,2.4,8.4,5.2,0,-.06,-.09);
  k.box(red,-36.28,13.55,52.1,.7,6.13,3.65,0,-.06,-.09);
  // The playable deck sits in the exposed saddle. Keep its port berth clear.
  k.prism(m(0x344348),BYRON_DECK,-1,6,!distant);
  for(let j=0;j<BYRON_DECK.length;j++){
    const a=BYRON_DECK[j],b=BYRON_DECK[(j+1)%BYRON_DECK.length];
    if(Math.hypot(b[0]-a[0],b[1]-a[1])>14)k.line(obs,[a[0],1.1,a[1]],[b[0],1.1,b[1]],.68);
  }
  // A broken claw has two dark armour faces, a rough bare-metal cross
  // section and a recessed longitudinal ridge, with no intact deck behind it.
  function splinter(base,shoulder,tip,width,thick,dye=basalt){
    const a=pt(...base),b=pt(...shoulder),c=pt(...tip),axis=c.clone().sub(a).normalize();
    const side=axis.clone().cross(pt(0,1,0)).normalize();
    const crown=side.clone().cross(axis).normalize(),foot=a.clone().addScaledVector(crown,-thick*.38);
    const al=a.clone().addScaledVector(side,-width),ar=a.clone().addScaledVector(side,width);
    const bl=b.clone().addScaledVector(side,-width*.67),br=b.clone().addScaledVector(side,width*.83),ridge=b.clone().addScaledVector(crown,thick);
    tri(al,ar,foot,cut);face(al,bl,br,ar,dye);
    tri(al,ridge,bl,basalt);tri(ar,br,ridge,flint);tri(al,ar,ridge,dye);
    tri(bl,c,br,obsidian);tri(bl,ridge,c,cut);tri(br,c,ridge,dye);
    solid(al,ar,br,bl);solid(bl,br,c,ridge);
  }
  // The blunt prow folds into the underside. The plate lies along the outside
  // of the port landing strip; its diagonal cut can be seen from the boat.
  splinter([-42,8,49],[-40,1,62],[-22,-7,75],6.8,4.6);
  splinter([-42,2.9,42],[-35,-8,53],[-15,-13,65],6.5,4.1,obsidian);
  splinter([-43,25,21],[-40,9,21],[-33,-6,27],7,4,basalt);
  // A damaged shoulder shields the cultivation chamber at its starboard side.
  splinter([32,1,-58],[35,10,-46],[37,4,-28],4,2.5);
  // This torn lower mounting joins the deepest shedding site to the main
  // frame. Half of its close-packed laminated sheets have already gone.
  splinter([-8,-15,29],[-6,-32,15],[2,-43,10],5.8,3.2,obsidian);
  // The open starboard flank has three deep diagonal webs. From the witness
  // boat the planetarium can be seen through the gaps where plating tore off.
  for(const [z,out,top] of [[28,28,15],[12,38,21],[-8,46,28],[-30,48,31],[-49,44,29]]){
    splinter([15,-12,z+2],[out-4,top*.54,z-8],[out,top,z-18],4.5,2.1);
    k.line(dark,[10,-16,z+4],[out-5,top*.48,z-8],1.35);
    k.line(frame,[12,-9,z+3],[out-2,top*.55,z-9],.63);
  }
  // Distinct belly, severed conduits and curled ventral hooks, not a central
  // fin below a stack of inhabited floors. All remain off the landing axis.
  for(const [x,z,depth] of [[-20,46,27],[-9,29,37],[-1,13,46],[4,-4,39],[5,-25,32]]){
    splinter([x,-14,z],[x+3,-depth,z-3],[x+8,-depth+1,z-16],3.5,2,obsidian);
    k.pipe(frame,[[x-2,-15,z],[x-1,-depth*.8,z+2],[x+2,-depth,z-4],[x+7,-depth+1,z-12]],.68);
  }
  // A diagonal hinge joins the big dorsal cowl to the keel behind the eye.
  for(const [x,z] of [[-40,24],[-34,4],[-27,-19],[-19,-38]]){
    splinter([x,2,z],[x-1,20,z-2],[x-5,39,z-8],5,2.4,obsidian);
    k.line(obs,[x+3,3,z],[x+5,22,z-6],1.7);
  }
  // Jagged outer sheets terminate at the same three edges from which pieces
  // are pulled in the live encounter. The inner web is several metres behind.
  for(const [j,s] of BYRON_TEAR_SITES.entries()){
    const n=pt(...s.normal).normalize(),center=pt(s.x,s.y,s.z),inside=center.clone().addScaledVector(n,-7.7);
    const across=n.clone().cross(pt(0,1,0)).normalize(),up=across.clone().cross(n).normalize();
    const edgePt=(x,y,d)=>center.clone().addScaledVector(across,x).addScaledVector(up,y).addScaledVector(n,d);
    const teeth=[[-8,2.4],[-6.3,7],[-3.8,3.1],[-1.6,5.6],[0,0],[2,2.5],[4.9,-.4],[8.5,2.9]];
    for(let i=0;i<teeth.length-1;i++){
      const [x,y]=teeth[i],[xx,yy]=teeth[i+1],p=edgePt(x,y,0),q=edgePt(xx,yy,.2*Math.sin(i));
      const a=edgePt(x,y+8,-4.8),b=edgePt(xx,yy+8,-4.8);
      face(p,q,b,a,i%3?basalt:flint);face(p,p.clone().addScaledVector(n,-.65),q.clone().addScaledVector(n,-.65),q,cut);
      solid(p,q,b,a);
    }
    k.line(obs,inside.clone().addScaledVector(across,-9).toArray(),inside.clone().addScaledVector(across,10).toArray(),1.9);
    for(let i=-2;i<=2;i++){
      const x=3.65*i,root=edgePt(x,-6,-7),knuckle=edgePt(x+1,3,-4),lip=edgePt(x+.5,4+1.7*Math.sin(i+j),-1.5);
      k.line(frame,root.toArray(),knuckle.toArray(),.74);k.line(m(oxide),knuckle.toArray(),lip.toArray(),.52);
      if(!distant)k.pipe(copper,[edgePt(x-1,2,-5).toArray(),edgePt(x+.4,.2,-2.3).toArray(),edgePt(x+.65,-2,-.8).toArray()],.20);
    }
    if(!distant)k.line(ice,edgePt(-3,-4,-6.3).toArray(),edgePt(.5,-4.15,-6.15).toArray(),.21);
  }
  if(!distant){
    for(let j=0;j<6;j++){
      const z=33-j*12,x=-35+j*3;
      k.pipe(dark,[[x,13,z],[x+2,8,z+1],[x+4,-1,z+2],[x+6,-5,z-3]],1.18);
      k.pipe(copper,[[x+1.3,13,z-1],[x+3.2,8,z],[x+5.6,-1,z],[x+7,-4,z-3]],.33);
    }
    for(let i=0;i<8;i++){
      const r=brow[2+Math.floor(i/2)],p=point(r,6).lerp(point(r,7),.34+i%2*.41);
      k.ball(i%3===1?red:ice,p.x+.12,p.y,p.z+(i%2?2:-2),.28,.46,.91);
    }
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(metal.pos,3));
  geo.setAttribute('color',new T.Float32BufferAttribute(metal.rgb,3));geo.computeVertexNormals();
  const paint=new T.MeshStandardMaterial({vertexColors:true,roughness:.59,metalness:.43,side:T.DoubleSide});
  if(!distant){
    geo.setAttribute('uv',new T.Float32BufferAttribute(metal.uv,2));
    geo.setAttribute('stoneUV',new T.Float32BufferAttribute(metal.stoneUV,2));
    paint.map=armourColour;paint.bumpMap=paint.roughnessMap=armourHeight;paint.bumpScale=.046;
    finishByronCoating(T,paint);
  }
  k.put(geo,paint,0,0,0);k.finish();
  if(!distant){
    const rooms=byronInteriorClearances();
    cutByronHull(T,root,rooms);
    root.userData.blocksShuttle=p=>k.contains(p)&&!rooms.some(planes=>planes.every(
      ([a,b,c,d])=>a*p.x+b*p.y+c*p.z+d<=0));
  }
  return root;
}

function createByronSurface(T,world){
  const {sites,landingSites,radius,chartScale}=BYRON_WORLD,root=new T.Group(),ship=createByronHull(T);
  root.name='拜伦号 · 穿越黑暗之门';root.add(ship);world.add(root);root.visible=false;
  const k=byronKit(T,root),m=k.mat,tau=Math.PI*2,w=BYRON_WITNESS,co=Math.cos(w.yaw),si=Math.sin(w.yaw);
  const bareMetal=c=>m(c,false,false,'metal');
  const hull=m(0x434b65),pale=bareMetal(0x8498b3),iron=bareMetal(0x333b50),purple=bareMetal(0x63566e),shadow=m(0x252838);
  const cyan=m(0x36cced,true),ice=m(0x97effb,true),red=m(0xe64b65,true),amber=m(0xe7bf66,true),jade=bareMetal(0x4a8072);
  const green=m(0x87dc58,true),glass=m(0x58a4c1,false,true),copper=bareMetal(0x9b746b),darkCable=m(0x343045,false,false,'rubber');
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
  buildByronInstruments(T,root);
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
  const finish=cabinFinish('enamel');
  for(const panel of [cab,trim]){
    Object.assign(panel,finish);
    panel.bumpMap=null; // The enamel atlas supplies its own normal and roughness.
    panel.roughness=.56;
  }
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

  const encounter=new T.Group();encounter.name='拜伦号 · 潮汐撕裂';root.add(encounter);
  const boss=createYunasFigure(T,4717,{height:BYRON_BOSS.height}),apparition=new T.Group();
  apparition.rotation.y=Math.PI+Math.atan2(w.x-BYRON_BOSS.x,w.z-BYRON_BOSS.z);
  apparition.userData.byronSpirit='byron-yunas';apparition.add(boss.root);encounter.add(apparition);
  const bossPoint=new T.Vector3();
  boss.core.getWorldPosition(bossPoint);
  apparition.position.set(BYRON_BOSS.x,BYRON_BOSS.y,BYRON_BOSS.z).sub(bossPoint);
  boss.core.getWorldPosition(bossPoint);

  // The hull and the well stay in their own reference frame. Each loosened piece
  // has its own release time, spin, fracture time and incoming angular momentum.
  function createTidalStream(){
    const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),up=v(0,1,0),smooth=T.MathUtils.smoothstep;
    const throats=BYRON_TEAR_SITES.map((site,i)=>{
      const at=v(site.x,site.y,site.z),direction=bossPoint.clone().sub(at).normalize();
      const right=v().crossVectors(direction,up).normalize(),rise=v().crossVectors(right,direction).normalize();
      const normal=v(...(site.normal||[[1,.13,-.15],[.62,.78,-.12],[.65,-.75,-.12]][i%3])).normalize();
      const lip=v().crossVectors(normal,up).normalize(),edge=v().crossVectors(lip,normal);
      return {at,normal,lip,edge,right,rise,turn:[.37,1.03,-.43][i%3]};
    });
    let seed=4717;
    function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
    const front=v(w.x,w.y,w.z).sub(bossPoint).normalize();
    function track(i,count){
      const port=throats[i%throats.length];
      return {port,start:port.at.clone().addScaledVector(port.lip,(random()-.5)*4.8).addScaledVector(port.edge,(random()-.5)*3.5),
        seed:random(),turn:port.turn+(random()-.5)*.34,bend:84+50*random(),spin:1.9+.95*random(),
        offset:(i+.7*random())/count,rate:1/(9+random()*7)};
    }
    // Launch velocity points outward from the torn lip. The increasing axial
    // velocity and curved transverse motion draw separate wakes into the same eye.
    function sample(piece,t,out){
      const u=.045*t+.955*t**1.72,wake=Math.sin(Math.PI*u),lift=(1-smooth(t,.18,.56))*(1-Math.exp(-12*t));
      const a=piece.turn+piece.spin*u*u,span=piece.bend*wake;
      return out.copy(piece.start).lerp(bossPoint,u).addScaledVector(piece.port.normal,lift*(14+12*piece.seed))
        .addScaledVector(piece.port.right,span*Math.cos(a))
        .addScaledVector(piece.port.rise,span*Math.sin(a)).addScaledVector(front,52*wake*u);
    }
    function extrusion(outline,depth,bevel){
      const shape=new T.Shape();outline.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
      const geometry=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:Boolean(bevel),bevelThickness:bevel,bevelSize:bevel,bevelSegments:1});
      geometry.center();return geometry;
    }
    const armour=extrusion([[-.94,-.38],[-.57,-.56],[.41,-.51],[.95,-.25],[.78,.34],[.24,.29],[.08,.49],[-.79,.45]],.095,.024);
    const rib=extrusion([[-.20,-.30],[.20,-.30],[.20,-.24],[.046,-.24],[.046,.22],[.16,.22],[.16,.28],
      [-.16,.28],[-.16,.22],[-.046,.22],[-.046,-.24],[-.20,-.24]],1.86,0);
    const cable=new T.TubeGeometry(new T.CatmullRomCurve3([v(-.81,.19,.07),v(-.34,.32,-.08),v(.18,-.12,.04),v(.79,-.23,.18)]),8,.052,5,false);
    const chip=new T.TetrahedronGeometry(.65,0);
    const paint=new T.MeshStandardMaterial({color:0xffffff,roughness:.53,metalness:.46,vertexColors:true});
    const familyCount=114,children=3,partKinds=[armour,rib,cable,chip],counts=[0,0,0,children*familyCount],families=[];
    for(let i=0;i<familyCount;i++){
      const kind=Math.floor(i/throats.length)%3,flow=track(i,familyCount),size=(kind===2?.95:.62)+random()**2.1*3.24;
      const group={flow,kind,index:counts[kind]++,size,roll:random()*6.28,breakAt:.46+.25*random(),
        spin:(random()>.5?1:-1)*(.7+random()*1.8),bits:[]};
      for(let j=0;j<children;j++)group.bits.push({cross:(random()-.5)*2,up:(random()-.5)*2,phase:random()*tau});
      families.push(group);
    }
    const fragments=partKinds.map((g,i)=>{
      // Differentiate dark coating, cut flanges, and the freshly exposed metal.
      const normals=g.attributes.normal,colour=[];
      for(let j=0;j<normals.count;j++){
        const bright=i===2?.55:Math.abs(normals.getZ(j))<.58?.82:.42;
        colour.push(bright*.88,bright*.93,bright);
      }
      g.setAttribute('color',new T.Float32BufferAttribute(colour,3));
      const mesh=new T.InstancedMesh(g,paint,counts[i]);mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      mesh.name=['剥落装甲','断裂型材','撕断线束','二次破碎'][i];encounter.add(mesh);return mesh;
    });
    const pose=new T.Object3D(),point=v(),base=v(),tint=new T.Color(),warm=new T.Color(0xff965b).convertSRGBToLinear();
    const clean=[0x9ba6b2,0x899cb0,0xb88d76,0x9faebb].map(c=>new T.Color(c).convertSRGBToLinear());
    function place(mesh,index,at,rx,ry,rz,size,sx,sy,sz,kind,heat){
      pose.position.copy(at);pose.rotation.set(rx,ry,rz);pose.scale.set(sx*size,sy*size,sz*size);pose.updateMatrix();
      mesh.setMatrixAt(index,pose.matrix);mesh.setColorAt(index,tint.copy(clean[kind]).lerp(warm,heat));
    }
    // Fine spall keeps its angular spread and velocity distinct from the larger
    // pieces. The apparent width decreases continuously as grains fall below a pixel.
    const grainCount=1536,dust=[],coords=new Float32Array(grainCount*3),state=new Float32Array(grainCount*2);
    const cloud=new T.BufferGeometry(),xyz=new T.BufferAttribute(coords,3).setUsage(T.DynamicDrawUsage);
    const thermal=new T.BufferAttribute(state,2).setUsage(T.DynamicDrawUsage);
    const shutter=new T.BufferAttribute(new Float32Array(grainCount*3),3).setUsage(T.DynamicDrawUsage);
    cloud.setAttribute('position',xyz);cloud.setAttribute('smelt',thermal);cloud.setAttribute('previous',shutter);
    const resolution={value:720};
    const dustPaint=new T.ShaderMaterial({uniforms:{imageHeight:resolution},transparent:true,depthWrite:false,vertexShader:`
      attribute vec2 smelt;attribute vec3 previous;uniform float imageHeight;
      varying float heat,cover,width,trail,extent;varying vec2 axis;
      void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vec4 clip=projectionMatrix*mv;
        vec4 last=projectionMatrix*modelViewMatrix*vec4(previous,1.);
        vec2 velocity=(clip.xy/max(.1,clip.w)-last.xy/max(.1,last.w))*.5*imageHeight;
        velocity*=vec2(projectionMatrix[1][1]/projectionMatrix[0][0],-1.);float speed=length(velocity);
        axis=velocity/max(.001,speed);trail=min(speed,10.);
        float diameter=.5*imageHeight*smelt.y*projectionMatrix[1][1]/max(.1,-mv.z);
        width=clamp(diameter,.78,4.);heat=smelt.x;cover=clamp(diameter*diameter,0.,1.);
        extent=clamp(width+trail+1.,1.,15.);gl_Position=clip;gl_PointSize=extent;}`,
      fragmentShader:`varying float heat,cover,width,trail,extent;varying vec2 axis;
        void main(){vec2 pixel=(gl_PointCoord-.5)*extent;
          float d=length(pixel-axis*clamp(dot(pixel,axis),-.5*trail,.5*trail));
          float a=1.-smoothstep(.14*width,.58*width,d);
          gl_FragColor=vec4(mix(vec3(.68,.69,.78),vec3(1.,.65,.38),heat),a*cover*.90);}`});
    for(let i=0;i<grainCount;i++){
      const grain=track(i,grainCount);grain.size=.21+.62*random()**1.45;
      grain.bend+=22*(random()-.5);grain.turn+=(random()-.5)*.47;dust.push(grain);
    }
    const motes=new T.Points(cloud,dustPaint);motes.frustumCulled=false;motes.name='引力尾迹 · 细碎屑';
    motes.onBeforeRender=gpu=>{resolution.value=gpu.domElement.height;};encounter.add(motes);
    // At this distance much of the ejecta is smaller than a screen pixel. A
    // thin, broken dust fan follows each stream; individual metal flakes
    // remain opaque in front of it. Its density travels toward the eye.
    const lanes=throats.map((port,i)=>({...track(i,throats.length),port,start:port.at,turn:port.turn,bend:107,spin:2.4,seed:.5}));
    const samples=64,widths=[v(0,1,0),front.clone().cross(up).normalize()],ribbonPos=[],ribbonUV=[],ribbonIndices=[];
    for(let j=0;j<lanes.length*widths.length;j++)for(let k=0;k<=samples;k++){
      const t=k/samples,n=ribbonPos.length/3;ribbonPos.push(0,0,0,0,0,0);ribbonUV.push(t,-1,t,1);
      if(k)ribbonIndices.push(n-2,n-1,n,n-1,n+1,n);
    }
    const vapour=new T.BufferGeometry(),ribbonXYZ=new T.Float32BufferAttribute(ribbonPos,3).setUsage(T.DynamicDrawUsage);
    vapour.setIndex(ribbonIndices);vapour.setAttribute('position',ribbonXYZ);vapour.setAttribute('uv',new T.Float32BufferAttribute(ribbonUV,2));
    const dustTime={value:0},film=new T.ShaderMaterial({uniforms:{tideTime:dustTime},transparent:true,depthWrite:false,side:T.DoubleSide,
      vertexShader:`varying vec2 strand;void main(){strand=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`varying vec2 strand;uniform float tideTime;
        void main(){float p=strand.x,w=strand.y;
          float knot=.5+.5*sin(38.*p-1.3*tideTime+2.6*sin(18.*p+w*2.1-.46*tideTime));
          float fibres=.45+.55*pow(.5+.5*cos(w*15.+2.*sin(27.*p-.65*tideTime)),3.);
          float crossSection=exp(-w*w*4.);
          vec3 dye=mix(vec3(.49,.52,.62),vec3(.92,.55,.35),smoothstep(.45,.96,p));
          gl_FragColor=vec4(dye,.34*crossSection*mix(.25,1.,knot)*fibres*smoothstep(0.,.06,p)*(1.-smoothstep(.90,1.,p)));}`});
    const mist=new T.Mesh(vapour,film);mist.frustumCulled=false;mist.name='裂口细尘';encounter.add(mist);
    return function advance(age){
      for(let i=0;i<families.length;i++){
        const family=families[i],{flow,breakAt,size,kind}=family,t=(flow.offset+age*flow.rate)%1;
        const split=smooth(t,breakAt,breakAt+.055),released=smooth(t,0,.040),swallowed=1-smooth(t,.945,1);
        const heat=smooth(t,.49,.98)*.83,roll=family.roll+family.spin*(t+4*t*t);
        sample(flow,t,base);
        place(fragments[kind],family.index,base,roll+flow.seed,roll*.61,roll*.86,
          size*(1-split)*released,1,.79+.21*flow.seed,1,kind,heat);
        for(let j=0;j<children;j++){
          const splinter=family.bits[j],spread=(t-breakAt)*22*swallowed;
          point.copy(base);
          if(split>0)point.addScaledVector(flow.port.right,splinter.cross*spread).addScaledVector(flow.port.rise,splinter.up*spread);
          place(fragments[3],i*children+j,point,roll*1.7+splinter.phase,roll*2.3,roll*.9,
            size*.60*split*swallowed,1,.49+.08*j,.57,3,heat);
        }
      }
      for(const mesh of fragments){mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;}
      for(let i=0;i<grainCount;i++){
        const grain=dust[i],t=(grain.offset+age*grain.rate)%1;sample(grain,t,point);xyz.setXYZ(i,point.x,point.y,point.z);
        sample(grain,Math.max(0,t-grain.rate/28),point);shutter.setXYZ(i,point.x,point.y,point.z);
        thermal.setXY(i,smooth(t,.37,1),grain.size*smooth(t,0,.029)*(1-smooth(t,.946,1)));
      }
      let vert=0;dustTime.value=age;
      for(const lane of lanes)for(const axis of widths)for(let k=0;k<=samples;k++){
        const t=k/samples,width=(1.2+8.7*Math.sin(Math.PI*t))*(1-smooth(t,.8,1));
        sample(lane,t,base);
        point.copy(base).addScaledVector(axis,-width);ribbonXYZ.setXYZ(vert++,point.x,point.y,point.z);
        point.copy(base).addScaledVector(axis,width);ribbonXYZ.setXYZ(vert++,point.x,point.y,point.z);
      }
      ribbonXYZ.needsUpdate=true;
      xyz.needsUpdate=thermal.needsUpdate=shutter.needsUpdate=true;
    };
  }
  const advanceDebris=createTidalStream();
  let time=0,mode='hidden';advanceDebris(0);
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
    advanceDebris(time);root.updateMatrixWorld(true);
  }
  const nothing=()=>null;
  return {root,kind:'ship',encounterCore:bossPoint,radius,chartScale,sites,landingSites,coordinates,chart,frame,height,point,move,walk,resolveArrival,siteAt,
    clipCamera,blocksShuttle,landingInfo,flightHeight:height,landingSite:id=>landingSites.find(s=>s.id===id),groundCorrection:()=>0,
    isSheltered:(lat,lon)=>!isOutside(lat,lon),update,setMode(next){mode=next;root.visible=next!=='hidden';},
    nearbySpirit:record,spiritObservation:record,pickSpirit,withdrawSpirit:()=>false,portalAt:nothing,
    safariAction:nothing,safariWalk:nothing,safariHint:()=>'',setSafariState(){},interactSpiritSite:()=>'',spiritSiteHint:(lat,lon)=>siteAt(lat,lon).description,
    dispose(){
      apparition.remove(boss.root);boss.dispose();
      const geos=new Set(),mats=new Set();root.traverse(node=>{if(node.geometry)geos.add(node.geometry);for(const mat of [].concat(node.material||[]))mats.add(mat);if(node.isInstancedMesh)node.dispose?.();});
      for(const geo of geos)geo.dispose();for(const m of mats)m.dispose();world.remove(root);
    }};
}
