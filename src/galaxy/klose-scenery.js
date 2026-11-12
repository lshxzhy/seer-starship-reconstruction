// Query the cells reached by this animal's own footprint. High foliage only
// blocks animals whose crown or flight arc can actually reach its underside.
function kloseClearsCover(cover,x,z,r,height){
  for(let ix=Math.floor(x-r);ix<=Math.floor(x+r);ix++)for(let iz=Math.floor(z-r);iz<=Math.floor(z+r);iz++){
    for(const b of cover.get(ix*256+iz)||[]){
      if(b.underside>height)continue;
      const dx=Math.max(0,b.left-x,x-b.right),dz=Math.max(0,b.back-z,z-b.front);
      if(dx*dx+dz*dz<r*r)return false;
    }
  }
  return true;
}
// All scenery is authored geometry. Sites share one tangent chart and leave
// the original map connections open. The historic hunting rooms share a biome.
// Scalloped, overlapping tufts give the blue moss and ochre crowns the soft
// edge of the map paintings. Keep a single closed mesh per crown in both LODs.
function kloseCanopyGeometry(T,near){
  const slices=near?36:18,rows=near?14:8,p=[],rgb=[],ix=[];
  for(let j=0;j<=rows;j++)for(let i=0;i<slices;i++){
    const lat=Math.PI*j/rows,a=i*2*Math.PI/slices,s=Math.sin(lat),c=Math.cos(lat);
    const lobe=.5+.5*Math.cos(6*a+2.3*c+.30*Math.sin(3*a));
    const folds=.5+.5*Math.cos(12*a-3*c);
    const w=s*(.78+.15*lobe+.045*folds+.020*Math.sin(3*a));
    const skirt=s*s*(1-lobe);
    p.push(w*Math.cos(a),.87*c-.12*skirt+.06*s*s*Math.cos(3*a+c),w*Math.sin(a));
    const light=.66+.22*(c+1)/2+.09*lobe+.03*folds-.10*skirt;
    rgb.push(light*.96,light,Math.min(1,light+.028));
    if(j<rows){
      const a0=j*slices+i,b0=j*slices+(i+1)%slices;
      if(j)ix.push(a0,b0,a0+slices);
      if(j<rows-1)ix.push(b0,b0+slices,a0+slices);
    }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));
  g.setAttribute('color',new T.Float32BufferAttribute(rgb,3));g.setIndex(ix);g.computeVertexNormals();
  for(let i=0;i<slices;i++){
    g.attributes.normal.setXYZ(i,0,1,0);g.attributes.normal.setXYZ(rows*slices+i,0,-1,0);
  }
  return g;
}

function createKloseScenery(T, parent, surface) {
  const {sites,pools,height,frame,move,point,chart,trail,radius,padClear,groundCorrection,sceneScale=1}=surface;
  const color=hex=>new T.Color(hex).convertSRGBToLinear();
  const shapes=new Map(),tau=Math.PI*2;
  const rough=new T.MeshStandardMaterial({color:0xffffff,roughness:.84,side:T.DoubleSide});
  const gloss=new T.MeshStandardMaterial({color:0xffffff,roughness:.31,metalness:.08,side:T.DoubleSide});
  const luminous=new T.MeshBasicMaterial({color:0xffffff,side:T.DoubleSide});
  function shape(name,geo,material=rough) {shapes.set(name,{geo,material});}
  shape('round',new T.SphereGeometry(1,12,9));
  const stone=fieldSurfaceFinish(rough.clone(),'stone'),bark=fieldSurfaceFinish(rough.clone(),'stem');
  shape('rock',new T.IcosahedronGeometry(1,1),stone);
  // Successively undercut slabs form a ledge with a small bevel and a broken lip.
  const rockProfile=[[-.80,.19],[-.70,.68],[-.48,.84],[-.36,.82],[-.33,.94],[.16,1.0],
    [.23,.89],[.29,.94],[.48,.88],[.60,.62],[.64,.12],[.64,0]];
  const slab=new T.LatheGeometry(rockProfile.map(([y,r])=>new T.Vector2(r,y)),14);
  const pos=slab.attributes.position;
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),a=Math.atan2(z,x);
    const bank=.96+.08*Math.cos(3*a+.25)+.05*Math.sin(5*a)+.022*Math.cos(9*a+y);
    pos.setXYZ(i,x*bank+.09*y,y+.13*x-.05*z,z*bank);
  }
  slab.computeVertexNormals();
  shape('boulder',slab,stone);
  shape('facet',new T.CylinderGeometry(.65,1,1,7,1),stone);
  shape('cane',new T.CylinderGeometry(.79,1,1,12,3),bark);
  shape('twig',new T.CylinderGeometry(.62,1,1,9,2),bark);
  shape('rim',new T.TorusGeometry(1,.10,8,40));
  const poolShape=new T.SphereGeometry(1,48,16);
  const poolTime={value:0};
  function basinSurface(base,strength){
    base.onBeforeCompile=s=>{
      s.uniforms.poolClock=poolTime;
      s.vertexShader='varying vec2 basinXY;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nbasinXY=position.xz;');
      s.fragmentShader='uniform float poolClock; varying vec2 basinXY;\n'+s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        vec2 q=basinXY;
        float w=sin(24.*q.x+17.*q.y+1.3*sin(5.*q.y)-poolClock*1.45);
        float pulse=sin(40.*length(q-vec2(.32,-.19))-2.3*poolClock);
        float h=(w+.42*pulse)*${strength.toFixed(3)}*(1.-smoothstep(.62,1.,dot(q,q)));
        vec3 a=cross(dFdy(-vViewPosition),normal),b=cross(normal,dFdx(-vViewPosition));
        float det=dot(dFdx(-vViewPosition),a);
        normal=normalize(max(abs(det),1.e-7)*normal-sign(det)*(dFdx(h)*a+dFdy(h)*b));`);
    };
    base.customProgramCacheKey=()=>'klose-basin-'+strength;return base;
  }
  shape('mud',poolShape,basinSurface(new T.MeshStandardMaterial({roughness:.42}),.026));
  shape('pool',poolShape,basinSurface(new T.MeshStandardMaterial({roughness:.24}),.065));
  // The energy pool graduates from a shaded teal bank to bright cyan.
  // Its glow is part of the water surface, confined to the basin.
  const energyPool=poolShape.clone(),waterColors=[];
  const deepWater=color('#369c9e'),shallowWater=color('#17d7e1'),waterTone=new T.Color();
  const vertices=energyPool.getAttribute('position');
  for(let i=0;i<vertices.count;i++){
    const t=T.MathUtils.smoothstep(vertices.getZ(i),-.70,.85);
    waterTone.copy(deepWater).lerp(shallowWater,t);waterColors.push(waterTone.r,waterTone.g,waterTone.b);
  }
  energyPool.setAttribute('color',new T.Float32BufferAttribute(waterColors,3));
  shape('energyPool',energyPool,basinSurface(new T.MeshStandardMaterial({vertexColors:true,roughness:.27,
    emissive:color('#168a93'),emissiveIntensity:.35}),.085));
  shape('lamp',new T.SphereGeometry(1,14,9),luminous);
  // A keeled leaf has its own bent midrib, so both moonlight and sunlight
  // reveal the blade, even without alpha textures.
  function leafGeometry() {
    const p=[],rgb=[],index=[],across=[-1,-.36,0,.36,1];
    for(let j=0;j<=10;j++){
      const t=j/10,arch=Math.sin(t*Math.PI*.90),width=(.009+Math.sin(Math.PI*t)**.74)*.217;
      for(const [i,u] of across.entries()){
        const fold=1-Math.abs(u),curl=.062*t*t;
        const h=(.54+.11*fold)*arch+.12*t+.023*u*Math.sin(5*t);
        p.push(width*u+curl,h,t-.07*Math.abs(u)*Math.sin(t*Math.PI));
        const vein=i===2?1:.72+.15*fold+.07*t+.04*Math.cos(5*t+u);
        rgb.push(vein*.98,vein,Math.min(1,vein+.035));
        if(i&&j){
          const n=j*5+i;index.push(n-6,n-1,n,n-6,n,n-5);
        }
      }
    }
    return meshData(p,rgb,index);
  }
  const mushroomProfile=[[.02,.025],[.49,.02],[.88,.075],[1,.16],[.95,.32],[.78,.52],[.48,.69],[.12,.77],[0,.77]];
  // Six separate flat growth faces, with a narrow weathered band, chipped
  // shoulder and an offset apex. Shared vertices within a face keep its
  // strata planar; adjacent faces meet at a sharp crystal edge.
  const crystalShape=(()=>{
    const p=[],rgb=[],ix=[];
    const bands=[[-.03,.19,.42],[.06,.33,.56],[.17,.35,.72],[.35,.344,.80],
      [.365,.341,.61],[.379,.340,.86],[.59,.319,.91],[.601,.316,.75],[.616,.313,.92],[.74,.30,1],[1,0,1]];
    for(let side=0;side<6;side++){
      const first=p.length/3;
      for(let j=0;j<bands.length;j++)for(let k=0;k<2;k++){
        const [y,r,tone]=bands[j],a=(side+k)*tau/6,sheen=.90+.10*Math.cos(side*2.62);
        const shoulder=j===9?.050*Math.sin(2*a+.4):0;
        p.push(r*Math.cos(a)+.051*y*y,y+shoulder,r*Math.sin(a)-.035*y*y);
        const v=tone*sheen;rgb.push(v,Math.min(1,v+.018*y),Math.min(1,v+.029*y));
      }
      for(let j=0;j<bands.length-1;j++){
        const i=first+2*j;ix.push(i,i+2,i+1);if(j<bands.length-2)ix.push(i+1,i+2,i+3);
      }
    }
    return meshData(p,rgb,ix);
  })();
  gloss.vertexColors=true;
  shape('crystal',crystalShape,fieldSurfaceFinish(gloss,'crystal'));
  shape('coreCrystal',crystalShape,fieldSurfaceFinish(new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.39,
    metalness:.09,emissive:color('#09665d'),emissiveIntensity:.32}),'crystal'));
  const colored=new T.MeshStandardMaterial({vertexColors:true,roughness:.8,side:T.DoubleSide});
  for(const [key,geometry] of Object.entries(buildMeadowPlants(T)))shape(key,geometry,colored);
  const mushroomCap=(()=>{
    const p=[],rgb=[],ix=[],segments=64;
    for(const [j,[r,y]] of mushroomProfile.entries())for(let k=0;k<segments;k++){
      const a=k*tau/segments,gill=k%2,edge=j<=3?.025*Math.cos(9*a)*r:0;
      const relief=j===1||j===2?.044*gill:0;
      p.push((r+edge)*Math.cos(a),y+relief,(r+edge)*Math.sin(a));
      const v=j<=2?.57+.23*gill:.84+.16*Math.sin(a+1.2)*r;
      rgb.push(v,Math.min(1,v+.035),v*.93);
      if(j){const i=(j-1)*segments+k,n=(j-1)*segments+(k+1)%segments;
        ix.push(i,i+segments,n,n,i+segments,n+segments);}
    }
    return meshData(p,rgb,ix);
  })();
  shape('cap',mushroomCap,colored);
  const moss=fieldSurfaceFinish(colored.clone(),'moss');
  shape('leaf',leafGeometry(),fieldSurfaceFinish(colored.clone(),'blade'));
  shape('canopy',kloseCanopyGeometry(T,true),moss);
  function meshData(positions,colors,indices) {
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
  }
  function curledBlade() {
    const path=new T.CatmullRomCurve3([[0,0],[.08,.48],[.14,.98],[.04,1.48],[-.22,1.76],[-.54,1.72],[-.73,1.46],[-.67,1.24],[-.49,1.20],[-.40,1.33],[-.48,1.41]].map(([x,y])=>new T.Vector3(x,y,0)));
    const p=[],colors=[],idx=[],sides=16,steps=52;
    for(let j=0;j<=steps;j++) {
      const t=j/steps,at=path.getPointAt(t),tangent=path.getTangentAt(t);
      const width=(.22+.075*Math.sin(t*Math.PI))*Math.pow(1-t,.52)+.009;
      for(let k=0;k<sides;k++) {
        const a=k*tau/sides,b=Math.cos(a),z=Math.sin(a);
        const vein=1+.067*Math.cos(5*a);
        p.push(at.x-tangent.y*width*b,at.y+tangent.x*width*b,at.z+width*.78*z*vein);
        const ridge=.5+.5*Math.cos(a-.3),veinTone=.5+.5*Math.cos(5*a);
        colors.push(.70+.28*ridge,.48+.42*ridge+.10*veinTone,.75+.25*ridge);
        if(j) {const l=(j-1)*sides+k,r=(j-1)*sides+(k+1)%sides;idx.push(l,r,l+sides,r,r+sides,l+sides);}
      }
    }
    return meshData(p,colors,idx);
  }
  shape('plume',curledBlade(),colored);
  {
    const route=new T.CatmullRomCurve3([[-3.65,-.62,.11],[-3.38,.95,-.23],[-3.46,2.02,.08],
      [-2.61,3.46,.35],[-1.05,4.08,.15],[-.37,4.82,-.09],[1.05,4.20,-.25],
      [2.13,3.76,-.10],[3.27,2.47,.19],[3.46,1.41,.39],[4.03,-.55,.25]].map(a=>new T.Vector3(...a)));
    const p=[],c=[],ix=[],rows=68,sides=16;
    for(let j=0;j<=rows;j++){
      const t=j/rows,at=route.getPoint(t),dir=route.getTangent(t),len=Math.hypot(dir.x,dir.y);
      const swell=.42+.22*(2*t-1)**2+.23*Math.sin(3.7*Math.PI*t+.6)**8;
      for(let i=0;i<sides;i++){
        const a=i*tau/sides,flute=Math.cos(4*a+5.2*t+.23*Math.sin(13*t));
        const w=swell*(1+.16*flute+.06*Math.sin(2*a-.9*t)),radial=Math.cos(a)*w;
        p.push(at.x+dir.y/len*radial,at.y-dir.x/len*radial,at.z+Math.sin(a)*w*.90);
        const value=.74+.16*flute+.075*Math.cos(2*a);c.push(value,value*.96,value*.80);
        if(j){const n=j*sides+i,b=j*sides+(i+1)%sides;ix.push(n-sides,n,b-sides,b-sides,n,b);}
      }
    }
    shape('swampVault',meshData(p,c,ix),colored);
  }
  // The body, turned-back lip and dark recess of the ochre pod in map 11.
  {
    const rings=[[.02,-.88,'#57432d'],[.64,-.84,'#846439'],[.92,-.50,'#a88446'],
      [1,.08,'#c69e5d'],[1,.45,'#cba66c'],[.92,.51,'#e9c587'],[.82,.44,'#b57c47'],
      [.77,.37,'#efd2a6'],[.72,.28,'#80afa2'],[.70,.12,'#527c75'],[.55,-.33,'#203a40'],[.01,-.54,'#19272b']];
    const p=[],c=[],ix=[],segs=80;
    for(const [j,[r,z,tint]] of rings.entries()){
      const shade=color(tint);
      for(let i=0;i<segs;i++){
        const a=i*tau/segs,fold=1+.075*Math.cos(3*a+.4)+.034*Math.cos(5*a);
        const groove=.85+.15*Math.cos(7*a-.65*z);
        p.push(r*fold*Math.cos(a),r*Math.sin(a)*fold-.12*Math.cos(a)*r,z+.14*r*Math.sin(3*a));
        c.push(shade.r*groove,shade.g*groove,shade.b*groove);
        if(j){const n=j*segs+i,b=j*segs+(i+1)%segs;ix.push(n-segs,b-segs,n,n,b-segs,b);}
      }
    }
    shape('swampPod',meshData(p,c,ix),colored);
  }
  {
    const p=[],c=[],ix=[],rings=352,sides=12;
    for(let j=0;j<=rings;j++){
      const t=j/rings,angle=t*tau*2.45-.45;
      const ca=Math.cos(angle),sa=Math.sin(angle),spread=.91+.34*t;
      const rib=.5+.5*Math.cos(t*tau*69);
      const width=(.39+.09*Math.sin(angle+.6))*(.86+.14*rib)*Math.min(1,.30+30*Math.min(t,1-t));
      const y=.26+.58*t+.97*Math.max(0,-sa)+.43*Math.sin(angle-1.1)**4;
      for(let i=0;i<sides;i++){
        const a=i*tau/sides,edge=Math.cos(a)*width;
        p.push(ca*(3.25*spread+edge),y+width*Math.sin(a),sa*(2.34*spread+edge));
        const value=.64+.27*rib+.09*Math.sin(a);c.push(value,value,value*.88);
        if(j){const n=j*sides+i,b=j*sides+(i+1)%sides;ix.push(n-sides,b-sides,n,n,b-sides,b);}
      }
    }
    shape('swampCoil',meshData(p,c,ix),colored);
  }
  // Each tilted rib grows from a fluted foot to a keeled, inward-facing tip.
  {
    const p=[],c=[],ix=[],steps=16,section=[[-.58,-.22],[.15,-.42],[1,0],[.12,.42],[-.58,.22]];
    for(let j=0;j<=steps;j++){
      const t=j/steps,thick=(1-.985*t)**.65;
      for(const [i,[dx,dz]] of section.entries()){
        p.push(.72*t*t+.12*Math.sin(3.5*t)+dx*.31*thick,t,dz*.80*thick);
        const hue=.64+.25*(i===2?.98:.58)+.13*t;c.push(hue,hue*.95,hue*.72);
        if(j){const n=j*5+i,b=j*5+(i+1)%5;ix.push(n-5,n,b-5,b-5,n,b);}
      }
    }
    shape('swampRib',meshData(p,c,ix),colored);
  }
  function sodGeometry() {
    const n=38,p=[0,.19,0],rgb=[.84,1,.97],idx=[];
    for(let j=1;j<=5;j++)for(let i=0;i<n;i++) {
      const a=tau*i/n,r=j/5*(1+.11*Math.sin(3*a+.3)+.055*Math.sin(7*a)+.035*Math.cos(11*a));
      const hh=(1-(j/5)**3)*(.19+.035*Math.sin(a*5+j));
      p.push(Math.cos(a)*r,hh,Math.sin(a)*r);
      const t=.79+.16*Math.sin(a*7+j*2)*Math.cos(a*3-j)+.05*(j%2);
      rgb.push(t*.92,t,t*.98);
      const l=1+(j-1)*n+i,b=1+(j-1)*n+(i+1)%n;
      if(j===1)idx.push(0,b,l);else idx.push(l-n,b,l,b-n,b,l-n);
    }
    return meshData(p,rgb,idx);
  }
  shape('sod',sodGeometry(),moss);
  // Paired pinnules share one mesh with a bowed rachis. Each meadow bed can
  // carry many fern tips with a single instance batch.
  function fernGeometry(){
    const points=[],colors=[],indices=[];
    function fold(x,y,z,tx,ty,tz,width,rise){
      const i=points.length/3,mx=(x+tx)*.5,my=(y+ty)*.5,mz=(z+tz)*.5;
      points.push(x,y,z,mx,my,mz-width,mx,my+rise,mz,tx,ty,tz,mx,my,mz+width);
      colors.push(.49,.61,.58, .68,.83,.79, .98,1,.97, .89,.97,.94, .57,.74,.69);
      indices.push(i,i+1,i+2,i+1,i+3,i+2,i+2,i+3,i+4,i,i+2,i+4);
    }
    for(let j=0;j<10;j++){
      const t=j/10,u=(j+1)/10,stem=t*.50+.17*Math.sin(t*Math.PI);
      fold(0,stem,t,.012,u*.50+.17*Math.sin(u*Math.PI),u,.018,.012);
      for(const side of [-1,1]){
        const reach=(.10+.23*Math.sin(Math.PI*(.15+t*.85)))*(1-.59*t);
        fold(0,stem,t,side*reach,stem+.17*(1-t),t+.19-.11*t,.057*(1-.67*t),.036);
      }
    }
    return meshData(points,colors,indices);
  }
  shape('fern',fernGeometry(),colored);
  const distantShapes={round:new T.SphereGeometry(1,8,5),rock:new T.IcosahedronGeometry(1,0),canopy:kloseCanopyGeometry(T,false),
    cane:new T.CylinderGeometry(.79,1,1,5),twig:new T.CylinderGeometry(.62,1,1,5)};
  const temp=new T.Object3D(),axis=new T.Vector3(0,1,0),v=(x,y,z)=>new T.Vector3(x,y,z);
  const batches=[],pipi=[];
  const wildlife=createKloseWildlife(T,surface,pipi);
  const safari=createKloseSafari(T,surface);
  // The classic grassland has blue turf and one yellow-green upper terrace.
  // The hunting grounds use bluer violet banks; only the sanctuary shares
  // the azure grass. Values were sampled from the corresponding map frames.
  const azureLeaves=['#227ca8','#3397c8','#44a3cf','#60afd6'];
  const meadowLeaves=['#627d28','#7a8e37','#9db948','#b4ce53'];
  const wetlandLeaves=['#405c98','#528dc5','#5c6ca7','#718bbd'];
  const openGround={
    grassland:{leaves:azureLeaves,plumes:['#ee6098','#f474a7','#fd9fb7'],fruit:'#204e91',rock:'#ad744f',cap:'#d29b70'},
    wetland:{leaves:wetlandLeaves,plumes:['#bb397f','#e75a8a','#fb8195'],fruit:'#384d93',rock:'#8a475b',cap:'#9c9473'},
    sanctuary:{leaves:azureLeaves,plumes:['#dc5991','#f474a7','#ff9fb7'],fruit:'#1c5685',rock:'#985b46',cap:'#d89e7b'}
  };
  const groves={
    grassland:{bark:'#745332',crown:azureLeaves},
    wetland:{bark:'#78672c',crown:['#667336','#a09a4e','#b4ad64']},
    sanctuary:{bark:'#80604c',crown:azureLeaves},
    swamp:{bark:'#756333',crown:['#434525','#61602e','#78803d'],vine:'#848b3e'},
    forest:{bark:'#54551e',crown:['#41471b','#51541b','#777c34'],vine:'#9d9d37'},
    vineway:{bark:'#473b25',crown:['#243c43','#304d49','#46543c'],vine:'#697033'},
    flame:{bark:'#632b6a',crown:['#e28714','#cd6509','#f7a225','#ab4d0e'],vine:'#1667bc'}
  };
  const randFrom=value=>()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
  function makeSite(site,order) {
    const group=new T.Group(),near=new T.Group(),far=new T.Group();
    group.name=site.name;group.add(near,far);parent.add(group);
    group.position.copy(point(site.lat,site.lon));group.quaternion.copy(frame(site.lat,site.lon).quaternion);
    const seed=randFrom(167518+order*71837),choose=list=>list[Math.floor(seed()*list.length)];
    const records=new Map(),baseHeight=height(site.lat,site.lon),obstacles=[],overhead=new Map();
    const bossGlade=site.id==='forest'?KLOSE_TERRITORIES.forest.find(([id])=>id===47):null;
    function obstacle(x,z,r) {obstacles.push({x:site.x+x,z:site.z+z,r});}
    function yAt(x,z) {
      const at=move(site.lat,site.lon,x,-z);
      return height(at.lat,at.lon)-baseHeight-(x*x+z*z)/(2*radius);
    }
    function stamp(key,x,y,z,sx,sy,sz,hex,rx=0,ry=0,rz=0) {
      temp.position.set(x,y,z);temp.rotation.set(rx,ry,rz);temp.scale.set(sx,sy,sz);temp.updateMatrix();
      remember(key,hex);
    }
    function remember(key,hex) {
      // Leave a sightline at eye height across the clearing, including the
      // length of each frond. The random sequence for the rest of the forest is preserved.
      if(bossGlade&&key==='leaf'&&Math.hypot(temp.position.x-bossGlade[1],temp.position.z-bossGlade[2])<5+2*temp.scale.length())return;
      if(!records.has(key))records.set(key,[]);
      records.get(key).push({matrix:temp.matrix.clone(),hex});
    }
    function link(a,b,rad,hex,key='twig') {
      const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,len=Math.hypot(dx,dy,dz);
      if(len<.001)return;
      temp.position.copy(a).add(b).multiplyScalar(.5);
      temp.quaternion.setFromUnitVectors(axis,v(dx/len,dy/len,dz/len));temp.scale.set(rad,len,rad);
      temp.updateMatrix();remember(key,hex);
    }
    // Tapered joined segments use overlapping end bulbs on curled, living stems.
    function tendril(points,rad,hex,bulbs=false) {
      for(let i=1;i<points.length;i++) {
        const r=rad*(1-.65*(i-1)/(points.length-1));
        link(points[i-1],points[i],r,hex,'cane');
        if(bulbs) {const b=points[i];stamp('round',b.x,b.y,b.z,r*.8,r*.8,r*.8,hex);}
      }
    }
    function blocked(x,z,pad=0) {
      const pod=site.id==='swamp'&&Math.hypot((x+3.6)/(5.4+pad),(z+13)/(3.4+pad))<1;
      return pod || Math.hypot(x,z)<8+pad || padClear(site.x+x,site.z+z,pad) || trail(site.x+x,site.z+z)<3+pad ||
        pools.some(p=>Math.hypot((site.x+x-p.x)/(p.rx+pad),(site.z+z-p.z)/(p.rz+pad))<1.09);
    }
    function leafFan(x,y,z,s,colors,n=9) {
      const phase=seed()*tau;
      for(let i=0;i<n;i++) {
        const f=s*(.65+seed()*.45);
        stamp('leaf',x,y,z,f,f*(.67+seed()*.55),f,choose(colors),-.14+seed()*.28,phase+i*tau/n,.16*(seed()-.5));
      }
    }
    function curled(x,y,z,s,az,stem,fruit) {
      // The drooping indigo fruit and thick salmon fronds recur across grassland and wetland.
      const dx=Math.cos(az),dz=Math.sin(az),local=(u,h)=>v(x+dx*u*s,y+h*s,z+dz*u*s);
      stamp('plume',x,y,z,s,s,s,stem,0,-az);
      for (const [u,h] of [[-.43,1.28],[-.68,1.42],[-.57,1.28]]) {
        const p=local(u,h),q=local(u-.04,h-.33);link(p,q,.021*s,'#765065');
        stamp('round',q.x,q.y-.09*s,q.z,.105*s,.18*s,.11*s,fruit);
        for(let i=0;i<3;i++){
          const a=az+tau*i/3;
          stamp('leaf',q.x,q.y+.023*s,q.z,.19*s,.12*s,.14*s,'#778655',-.35,a);
        }
        stamp('round',q.x-.034*s,q.y-.04*s,q.z+.071*s,.03*s,.045*s,.025*s,'#559fc1');
      }
    }
    function tree(x,z,s) {
      const g=yAt(x,z),phase=seed()*tau;
      const {bark,crown,vine:vineColor}=groves[site.id],flame=site.id==='flame';
      const top=v(x+.22*s,g+1.96*s,z-.18*s),mid=v(x-.12*s,g+1.05*s,z);
      tendril([v(x,g-.07*s,z),mid,top],s*.22,bark,true);
      obstacle(x,z,s*.20);
      for(let j=0;j<5;j++) {
        const a=phase+tau*j/5,dx=Math.cos(a),dz=Math.sin(a);
        const root=v(x+dx*.72*s,yAt(x+dx*.72*s,z+dz*.72*s),z+dz*.72*s);
        tendril([v(x,g+.36*s,z),v(x+.37*s*dx,g+.08*s,z+.37*s*dz),root],s*.135,bark);
        const end=v(top.x+s*.73*dx,top.y+(.16+seed()*.38)*s,top.z+s*.73*dz);
        tendril([mid,v(top.x+s*.32*dx,top.y-.39*s,top.z+s*.32*dz),end],s*.13,bark);
        stamp('canopy',end.x,end.y,end.z,s*.72,s*.32,s*.65,choose(crown),seed()*.22,a);
        if(flame) leafFan(end.x,end.y+.18*s,end.z,.65*s,crown,6);
      }
      if(vineColor) {
        const vine=[];
        for(let j=0;j<=16;j++) {
          const f=j/16,a=phase+f*Math.PI*3.4;
          vine.push(v(x+.225*s*Math.cos(a)+.10*s*f,g+s*(.06+1.88*f),z+.225*s*Math.sin(a)));
        }
        tendril(vine,.055*s,vineColor);
      }
    }
    function reeds(x,z,s,shade) {
      const y=yAt(x,z);
      for(let k=0;k<6;k++) {
        const a=seed()*tau,h=s*(.42+.68*seed()),p=v(x+.17*s*Math.cos(a),y,z+.17*s*Math.sin(a)),t=v(p.x+.23*s*Math.cos(a),y+h,p.z+.23*s*Math.sin(a));
        link(p,t,.022*s,shade);
        stamp('round',t.x,t.y,t.z,.047*s,.14*s,.047*s,'#9e744b',.1,a,.1);
      }
    }
    function spore(x,z,s,body,cap,spots=true) {
      const y=yAt(x,z),lean=.07*s;
      stamp('round',x,y+.42*s,z,.27*s,.55*s,.25*s,body,0,0,-.12);
      stamp('round',x+lean,y+.81*s,z,.73*s,.075*s,.65*s,'#c3ac84');
      stamp('cap',x+lean,y+.79*s,z,.78*s,.74*s,.70*s,cap,0,seed()*tau,-.05);
      if(spots)for(let j=0;j<5;j++) {
        const a=j*tau/5+.3;stamp('round',x+lean+.43*s*Math.cos(a),y+1.18*s,z+.38*s*Math.sin(a),.093*s,.035*s,.078*s,'#f1cc9c',0,a);
      }
    }
    function stones(x,z,s,c) {
      const y=yAt(x,z);
      stamp('boulder',x,y+.32*s,z,s,.69*s,s*.78,c,.11,seed()*tau,-.13);
      stamp('rock',x+s*.7,y+.17*s,z+.28*s,s*.45,.32*s,.37*s,c,.18,seed()*tau);
      if(s>1.35)obstacle(x,z,s*.71);
    }
    function crystals(x,z,s,amber=false) {
      s*=KLOSE_ITEM_SCALE;
      const y=yAt(x,z),palette=amber?['#f7b51a','#ffe16a','#c97f19']:['#029a8d','#2aabb1','#157663','#4edfb3'];
      for(let k=0;k<8;k++) {
        const a=tau*k/8,l=(.45+seed()*.7)*s;
        stamp(amber?'crystal':'coreCrystal',x+.32*s*Math.cos(a),y-.12*s,z+.32*s*Math.sin(a),l,l*1.33,l,
          choose(palette),-.42*Math.sin(a),a,.37*Math.cos(a));
      }
      // Short side growths and matrix stones stay inside the same outcrop.
      for(let k=0;k<5;k++){
        const a=k*tau/5+.26,dx=Math.cos(a)*s,dz=Math.sin(a)*s;
        stamp('rock',x+dx*.47,y+.012*s,z+dz*.46,.29*s,.14*s,.25*s,amber?'#876c51':'#445849',.17,a);
        stamp(amber?'crystal':'coreCrystal',x+dx*.46,y+.052*s,z+dz*.46,.31*s,.34*s,.31*s,
          palette[(k+1)%palette.length],-.36*Math.sin(a),a,.46*Math.cos(a));
      }
      if(s>.75)obstacle(x,z,.80*s);
    }
    function roughLedge(x,z,s,c,az) {
      const y=yAt(x,z);
      stamp('facet',x,y+s*.28,z,s,s*.78,s*.87,c,.06,az,-.07);
      stamp('boulder',x,y+s*.65,z,s*1.04,s*.28,s*.88,openGround[site.id].cap,.04,az);
      if(s>1.5)obstacle(x,z,s*.77);
    }
    // Perimeter landforms are separated from the central navigation lanes.
    for(let k=0;k<105;k++) {
      const a=seed()*tau,r=12+Math.sqrt(seed())*68,x=r*Math.cos(a),z=r*Math.sin(a);
      if(blocked(x,z,1.4))continue;
      const g=yAt(x,z),n=seed(),s=.6+seed()*2;
      if (openGround[site.id]) {
        const palette=openGround[site.id];
        const leaves=site.id==='grassland'&&x>8&&z<-8?meadowLeaves:palette.leaves;
        if(n<.18) {
          stamp('rock',x,g-.12*s,z,s*2,s*.46,s*1.5,choose(leaves),.04,a);
          leafFan(x,g+.22*s,z,s,leaves,6);
        } else if (n<.37) leafFan(x,g,z,s*.9,leaves,8);
        else if(n<.53)curled(x,g,z,s,a,choose(palette.plumes),palette.fruit);
        else if(n<.73 && r>29)roughLedge(x,z,s*1.3,palette.rock,a);
        else if(n<.82 && r>38)tree(x,z,s*1.8);
        else stones(x,z,s*.35,palette.cap);
      } else if(site.id==='swamp'||site.id==='forest'||site.id==='vineway') {
        if(n<.35&&r>18)tree(x,z,s*1.9);
        else if(n<.64)leafFan(x,g,z,s*1.2,site.id==='vineway'?['#254b62','#3d708d','#537f9f']:['#798039','#a2a047','#65682e'],9);
        else if(n<.83)spore(x,z,s*.65,'#a9926f',choose(['#bd8656','#cb9d65','#a98761']),false);
        else stones(x,z,s*.85,'#82785c');
      } else if(site.id==='flame') {
        if(n<.43)tree(x,z,s*2.1);
        else if(n<.74)leafFan(x,g,z,s,['#0d406d','#1f5b8d','#2d6ca2']);
        else if(n<.9)stones(x,z,s,'#944b3c');
      } else if(site.id==='core'&&r<38) {
        if(n<.55)stones(x,z,s*.9,'#947149');
        else if(n<.72)crystals(x,z,s*.72);
        else spore(x,z,s*.72,'#876e34','#b64d35',false);
      }
    }
    // Foreground characteristic details are deliberately hand-placed at each clearing.
    if(site.id==='grassland') {
      for(const [x,z,s] of [[-14,-18,1.32],[-15.6,-16.8,.83],[-13.1,-19.4,.76]]) {
        stones(x,z,s*1.1,'#a77860');crystals(x+.27*s,z+.78*s,s*.93,true);
      }
      // On map 10 the pink plant grows in low lobes on the left. The blue
      // fruit hangs from a separate frond above it. The perforated root is
      // across the clearing on the right bank.
      for(const [x,z,s] of [[-7.6,-9.4,2.7],[-9.7,-12,2.3]]){
        for(const [j,a] of [-.45,.61,1.46,2.57,4.2].entries())
          stamp('meadowRoot',x,yAt(x,z),z,s*(1+.07*j),s,s,j%2?'#f08cab':'#df709d',.03,a,-.035);
        obstacle(x,z,s*.24);
      }
      for(const [x,z,s] of [[-11.6,-13.9,2.0],[-13.7,-13.1,1.67],[-10.6,-15.1,1.83]]){
        const y=yAt(x,z);
        curled(x,y,z,s,.4,'#ed8cae',openGround.grassland.fruit);
        for(let j=0;j<5;j++){
          const a=j*2.15,yy=y+s*(1.30-.13*j),xx=x+s*.20*Math.cos(a),zz=z+s*.20*Math.sin(a);
          stamp('leaf',xx,yy,zz,s*.77,s*.41,s*.77,'#e48fae',.67,a);
          stamp('round',xx+.16*s*Math.sin(a),yy-.18*s,zz+.16*s*Math.cos(a),.105*s,.14*s,.11*s,'#314677');
        }
      }
      for(const [x,z,s,rx,rz] of [[8.4,-6.2,1.67,-.86,-.34],[9.8,-7.5,1.24,-.46,-.54],
        [10.7,-9.7,1.66,-.72,-.30],[11.8,-11.7,1.26,-.54,-.50]]){
        stamp('meadowSocket',x,yAt(x,z)-.18,z,s,s,s,'#ffffff',rx,.12,rz);
        obstacle(x,z,.56*s);
      }
      // Blue turf in scalloped beds gives the upper terraces and the landing
      // clearing different silhouettes. The orange walking lanes stay visible.
      for(const [x,z,sx,sz] of [[-14,-16,5.1,3.5],[-14,-7,3.2,2.8],[13,-14,5.2,4.3],[13,-6,3.4,3.1],[13,2,5,3.6],[-15,-21,9,7],[14,-22,10,7]]) {
        const g=yAt(x,z),leaves=x>=8&&z<=-13?meadowLeaves:azureLeaves;
        stamp('sod',x,g+.08,z,sx,1.35,sz,leaves[1],0,seed()*.66);
        for(let j=0;j<32;j++) {
          const a=seed()*tau,t=Math.sqrt(seed()),px=x+sx*t*Math.cos(a),pz=z+sz*t*Math.sin(a);
          if(trail(site.x+px,site.z+pz)<1.35)continue;
          const py=yAt(px,pz)+.1+.17*(1-t);
          const s=.15+.61*seed();
          leafFan(px,py,pz,s,leaves,4+Math.floor(seed()*3));
          if(j%7===0) {
            const h=.38+.42*seed();link(v(px,py,pz),v(px+.09,py+h,pz),.022,'#6e9774');
            stamp('round',px+.09,py+h,pz,.10,.07,.11,'#e8b489');
          }
        }
      }
      // Map 10 shows overlapping courses of ochre stone under blue turf,
      // turning chartreuse at the eastern terrace. Leave the wetland trail
      // open at the centre and the flame trail open on the eastern flank.
      const masonry=['#936341','#b17c4e','#c18e60','#cc9b6e','#b98359'];
      for(let i=0;i<27;i++){
        const a=-1.19+i*.099,x=21.0*Math.sin(a),z=1-21.8*Math.cos(a);
        if(blocked(x,z,1.7))continue;
        const ground=yAt(x,z),rise=3.55+.62*Math.sin(.29*x),leaves=x>10?meadowLeaves:azureLeaves;
        const turn=-a+.08*Math.cos(x);
        for(let j=0;j<3;j++){
          const dx=x+.48*(j%2),dz=z-.38*j;
          stamp('boulder',dx,ground+(.11+.31*j)*rise,dz,2.45,.70*rise,1.94,
            masonry[(i*2+j)%masonry.length],.05*(j-1),turn+.17*j,-.07*Math.sin(i+j));
        }
        obstacle(x,z,1.72);
        stamp('sod',x,ground+rise+.04,z-.73,3.05,1.68,3.46,leaves[1],0,turn);
        for(let j=0;j<4;j++){
          const dx=x+.70*(j-1.5),dz=z-.70+.32*Math.sin(i+j);
          stamp('canopy',dx,ground+rise+.13*Math.cos(j+i),dz,1.55,.49,1.65,
            leaves[(i+j)%leaves.length],.05,turn);
        }
        if(i%2===0)leafFan(x+.12,ground+rise+.32,z-1.2,.62,leaves,7);
        // Broad stone strata and turf hanging over the lip carry map 10's
        // terrace shape down to eye level, rather than adding surface noise.
        if(i%3===0){
          stamp('boulder',x-.28,ground+rise*.36,z+1.20,1.04,.17,.28,'#d4a578',.02,turn);
          stamp('boulder',x+.42,ground+rise*.66,z+1.08,.83,.13,.23,'#8b603f',-.02,turn);
          for(let j=0;j<3;j++)stamp('leaf',x-.60+j*.48,ground+rise-.06,z+.54,
            .52,.48,.70,leaves[j],.78,Math.PI+.12*(j-1));
        }
      }
    }
    if(site.id==='swamp') {
      const x=-3.6,z=-13,g=yAt(x,z);
      stamp('swampPod',x,g+1.28,z,3.75,1.75,2.25,'#ffffff',-.16,-.16,-.07);
      stamp('swampCoil',x,g,z,1,1,1,'#9b9a54');
      for(let i=0;i<9;i++){
        const a=tau*i/9,dx=Math.cos(a),dz=Math.sin(a);
        tendril([v(x+2.7*dx,g+.65,z+1.5*dz),v(x+3.25*dx,g+.26,z+1.92*dz),
          v(x+3.8*dx,yAt(x+3.8*dx,z+2.38*dz),z+2.38*dz)],.065,'#756849');
      }
      // Distinct segmented shoulders surround the pale green inner lip.
      // Keep the visible recess shallow: the source does not show a tunnel.
      for(let i=0;i<11;i++){
        const a=.13+i*Math.PI/10,dx=3.10*Math.cos(a),dy=1.44*Math.sin(a);
        tendril([v(x+dx*.88,g+1.28+dy*.89,z+.65),v(x+dx,g+1.28+dy,z+.90),
          v(x+dx*1.04,g+1.28+dy*.96,z+.27)],.075,'#e0bc80');
      }
      for(let i=0;i<14;i++){const a=i*tau/14;obstacle(x+3.47*Math.cos(a),z+2.59*Math.sin(a),.72);}
      obstacle(x,z,2.0);
      for(const side of [-1,1])for(let j=0;j<7;j++){
        const f=j/6,xx=12+(f-.5)*7.1,zz=-16+side*1.46+.38*Math.sin(f*Math.PI);
        const y=yAt(xx,zz)+.62,scale=1.5+1.65*Math.sin(f*Math.PI)+.30*f;
        stamp('swampRib',xx,y,zz,1.55,scale,1.35,'#c4a25b',0,side*Math.PI/2-.12,-.11);
        stamp('round',xx,y,zz,1.0,.50,.65,'#8c874c');obstacle(xx,zz,.53);
        link(v(xx+.12,y+.05,zz),v(xx+.16,y+.18,zz-side*.48),.10,'#b3a169');
      }
      // The rooted opening sits across the bearing of the trail to map 12.
      const rx=-17,rz=-13,ux=.62,uz=-.78,fx=.78,fz=.62;
      for(let k=0;k<3;k++){
        const along=k*1.1,foot=3.4+.46*k;
        const coord=(u,h,offset=0)=>{const xx=rx+u*ux+(along+offset)*fx,zz=rz+u*uz+(along+offset)*fz;
          return v(xx,yAt(xx,zz)+h,zz);};
        const a=coord(-foot,0),b=coord(foot+.42,0);
        const origin=coord(0,0);
        stamp('swampVault',origin.x,origin.y,origin.z,foot/3.61,1-.045*k,1,k===0?'#997945':'#bda06b',
          .035*k,.90+.03*k,.047*k);
        obstacle(a.x,a.z,.66);obstacle(b.x,b.z,.66);
        for(const side of [-1,1]){
          const knee=coord(side*(foot-.19),1.68,.14);
          stamp('round',knee.x,knee.y,knee.z,.62,.57,.58,'#98783c');
          for(const toe of [-1,1]){
            const tip=coord(side*(foot+1.06),.02,toe*.94);
            tendril([knee,coord(side*(foot+.21),.66,toe*.38),tip],.34,'#ac8d55',true);
            obstacle(tip.x,tip.z,.29);
          }
          const split=coord(side*(foot-.36),3.08,.05),low=coord(side*(foot+.12),.84,.36);
          tendril([split,coord(side*(foot-.18),2.10,.20),low],.115,'#706a37');
        }
      }
    }
    if(site.id==='forest') {
      for(let i=0;i<6;i++) {
        const x=-14-seed()*5,z=-11+4*i,y=yAt(x,z),s=3.8+seed();
        const az=seed();
        stamp('boulder',x,y+.19*s,z,s*.97,s*.44,s*1.17,'#95734f',0,az);
        stamp('porousShelf',x,y+.56*s,z,s,s*.63,s*1.18,'#ffffff',0,az);
        stamp('porousShelf',x-.25*s,y+.88*s,z-.17*s,s*.73,s*.54,s*.85,'#ffffff',-.025,az+.045);
        obstacle(x,z,s*.79);
      }
      for(let i=0;i<18;i++){const a=seed()*tau,r=3+seed()*5;spore(7+r*Math.cos(a),-11+r*Math.sin(a),.29+.43*seed(),'#baa283','#a97d5e');}
      for(let j=0;j<11;j++){
        const a=j*.71,xx=7+4*Math.cos(a),zz=-11+4*Math.sin(a);
        tendril([v(xx,yAt(xx,zz)+.035,zz),v(xx+.52,yAt(xx+.52,zz+.29)+.038,zz+.29),
          v(xx+.89,yAt(xx+.89,zz+.17)+.03,zz+.17)],.022,'#d2b696');
      }
      for(const [x,z] of [[-11,-7],[12,-15],[17,8],[-18,10]]) {
        for(let j=0;j<4;j++) {
          const dx=x+j*.43;const g=yAt(dx,z);
          tendril([v(dx+.3,g+12,z),v(dx-.3,g+7.1,z+.4),v(dx,g+.2,z)],.14,j%2?'#777c34':'#9d9d37');
          // The long green roots remain a separate right-hand silhouette,
          // with exposed buttress toes instead of a generic tree trunk.
          for(const side of [-1,1])tendril([v(dx,g+.73,z),v(dx+side*.24,g+.28,z+.16),
            v(dx+side*.46,yAt(dx+side*.46,z+.37)+.025,z+.37)],.065,'#898f37');
        }
      }
    }
    if(site.id==='wetland') {
      for(let i=0;i<5;i++) {
        const x=8+i*1.22,z=-9+.12*Math.sin(i),g=yAt(x,z);
        stamp('facet',x,g+.18,z,.67,.31,.62,'#a59770',0,.2*i);
      }
      const x=7,z=-12,g=yAt(x,z);
      stamp('facet',x,g+.27,z,2.8,.54,2.65,'#986446');
      stamp('facet',x,g+.55,z,2.33,.15,2.30,'#9cbd46');
      stamp('rim',x,g+.64,z,1.74,1.72,.45,'#e6b975',Math.PI/2);
      // The 550 wetland isle has a stone kerb around a recessed green basin.
      stamp('round',x,g+.601,z,1.42,.064,1.31,'#637937');
      stamp('round',x,g+.658,z,1.08,.046,1.05,'#9ea740');
      for(let i=0;i<16;i++){
        const a=tau*i/16;
        stamp('round',x+1.37*Math.cos(a),g+.632,z+1.28*Math.sin(a),.079,.023,.19,'#bac488',0,-a);
      }
      for(let j=0;j<9;j++){
        const a=j*tau/9;
        stamp('rock',x+1.97*Math.cos(a),g+.48,z+1.86*Math.sin(a),.42,.22,.27,'#b0a164',0,-a);
      }
      // A low stepped blue shoreline separates the golden wetland water
      // from the stone island in map 550; keep the approach stones exposed.
      for(let j=0;j<11;j++){
        const a=.10+j*.26,px=x+3.27*Math.cos(a),pz=z+2.82*Math.sin(a);
        if(trail(site.x+px,site.z+pz)<1.6)continue;
        stamp('boulder',px,yAt(px,pz)+.12,pz,.72,.21,.43,'#806486',.01,-a);
        stamp('sod',px,yAt(px,pz)+.25,pz,.80,.46,.54,'#6297c7',0,-a);
      }
    }
    for(const p of pools.filter(p=>p.id===site.id)) {
      const x=p.dx,z=p.dz,y=yAt(x,z),isCore=site.id==='core',isWet=site.id==='wetland';
      const water=isCore?'#ffffff':isWet?'#e5a037':'#bf9143';
      const waterLevel=y+(isCore?.99:.75);
      stamp(isCore?'energyPool':isWet?'pool':'mud',x,waterLevel,z,p.rx*.96,.13,p.rz*.96,water);
      for(let j=0;j<22;j++) {
        const a=seed()*tau,t=.91+seed()*.12,dx=x+t*p.rx*Math.cos(a),dz=z+t*p.rz*Math.sin(a);
        if(!isCore && seed()<.45)reeds(dx,dz,.8+seed()*.9,'#979152');
        else stones(dx,dz,.35+seed()*.62,isCore?'#9a784d':isWet?'#8e866e':'#af9556');
      }
      for(let j=0;j<8;j++) {
        const a=seed()*tau,f=seed()*.68,px=x+p.rx*f*Math.cos(a),pz=z+p.rz*f*Math.sin(a);
        stamp('round',px,waterLevel+.139,pz,.36+seed(),.009,.04+seed()*.035,isCore?'#66edeb':isWet?'#f7ce72':'#d9b470',0,.13);
      }
      if(isCore) {
        // Map 13/1707 has an almost continuous strip of pink growth along
        // the pool. The sections under the crystals take on a lavender tint.
        for(let i=0;i<42;i++){
          const a=tau*i/42,c=Math.cos(a),s=Math.sin(a);
          const dx=x+(p.rx+.36)*c,dz=z+(p.rz+.28)*s;
          const along=Math.hypot(p.rx*s,p.rz*c)*tau/42;
          const rimColor=c>.74?'#ae9bde':s<-.65?'#bf558f':'#ce79ae';
          stamp('sod',dx,Math.max(yAt(dx,dz),waterLevel+.03),dz,along*.85,.62,.79,
            rimColor,0,Math.atan2(-p.rz*c,-p.rx*s));
        }
        stamp('rock',x,waterLevel+.16,z,1.7,.49,1.35,'#6d7647');
        stamp('rock',x,waterLevel+.49,z,1.32,.17,1.05,'#bd9c5f');
        // Horn-shaped banks lean into the cyan pool. Their tips stop above
        // the water, leaving the small central island visible from the entry.
        for(const [a,length] of [[.35,2.15],[1.75,1.65],[2.72,2.3],[3.90,1.8],[5.20,2.25]]){
          const c=Math.cos(a),s=Math.sin(a),px=x+(p.rx+.65)*c,pz=z+(p.rz+.65)*s;
          const gy=Math.max(yAt(px,pz),waterLevel+.03);
          tendril([v(px,gy-.08,pz),v(px-.45*c,gy+.79,pz-.45*s),
            v(px-length*.66*c,gy+1.23,pz-length*.66*s),
            v(px-length*c,waterLevel+.26,pz-length*s)],.33,'#ca82b2',true);
          tendril([v(px-.10*s,gy+.12,pz+.10*c),v(px-.54*c-.10*s,gy+.83,pz-.54*s+.10*c),
            v(px-length*.66*c,gy+1.24,pz-length*.66*s)],.045,'#ecc0da');
        }
      }
    }
    if(site.id==='vineway') {
      // Ogre roots form the actual covered descent. The open strip follows
      // the bearing of the swamp-to-core edge through each arch.
      const roof='#50412a',rootColor='#333c2c';
      for(let i=0;i<12;i++) {
        const z=-41+i*7.2,x=-z*.28,g=yAt(x,z),w=8.5+seed()*1.4;
        const pts=[v(x-w,g-.6,z),v(x-w+.9,g+4,z+.9),v(x-3.4,g+8.5+.7*seed(),z+1.3),v(x+2,g+9.3,z+.9),v(x+w-1.5,g+6,z),v(x+w,g,z-.5)];
        tendril(pts,1.65,roof,true);
        obstacle(x-w,z,1.42);obstacle(x+w,z,1.32);
        const vine=pts.map(p=>v(p.x+.48,p.y-.64,p.z+.72));tendril(vine,.21,i%3?'#485a40':'#76713a',true);
        for(let j=1;j<vine.length-1;j+=2){
          const p=vine[j],q=vine[j+1];
          tendril([p,v(p.x+.27,p.y-.46,p.z+.21),v(q.x,q.y-.09,q.z)],.052,'#817455');
        }
        for(const side of [-1,1]) {
          const xx=x+side*w;stones(xx,z,2.5,'#87715c');
          leafFan(xx,g+1,z,1.4,['#465688','#6c509d','#9a72be'],8);
        }
        const edge=x+w-2.7;
        tendril([v(edge,g+2,z-3.7),v(edge-.5,g+1.3,z),v(edge+.35,g+1.8,z+3.7)],.36,rootColor);
        if(i%2===0){
          // Exposed red seams stay below the blue growth at the ravine edge.
          stamp('rock',edge+1.35,g+.48,z,1.12,.41,2.28,'#543242',.09,.18);
          stamp('lamp',edge+1.24,g+.61,z,.12,.045,1.38,'#bc493e',.03,.12);
          for(let j=0;j<4;j++)stamp('leaf',edge+.55+j*.27,g+.74,z-.72+j*.41,
            .63,.48,.91,'#397da3',.32,1.25+j*.35);
        }
      }
    }
    if(site.id==='core') {
      const shell=['#362a1c','#4b3721','#68512d','#775d38'];
      // A closed crown and buttressed perimeter form the cave ceiling and walls.
      // Leave the north-northeast sector open towards the descending root passage.
      const floor=yAt(0,0);
      for(let i=0;i<25;i++) {
        const a=tau*i/25,dx=Math.cos(a),dz=Math.sin(a);
        const x=dx*35,z=dz*38,nearMouth=dz<-.76&&dx>-.32&&dx<.68;
        if(!nearMouth) {
          stamp('boulder',x,yAt(x,z)+4.8,z,6.5,11,8,choose(shell),.07,a);
          obstacle(x,z,6.1);
          for(let j=0;j<3;j++) {
            const xx=x-dx*j*.8,zz=z-dz*j*.8;
            tendril([v(xx,floor+14,zz),v(xx-.55,floor+10,zz+.6),v(xx+.2,floor+6+seed()*2,zz)],.31,'#717150');
          }
        }
        stamp('boulder',x*.63,floor+16.8+seed()*1.4,z*.63,9,4.4,10,choose(shell),.07,a);
      }
      stamp('rock',0,floor+18,0,24,4.1,25,'#4d3c27',.03,.19);
      for(const [x,z,s] of [[9,-16,3.3],[13,-13,4],[14,-10,2.4],[11,-20,3.4],[-17,7,1.85]])crystals(x,z,s);
      // Layered matrix beneath the upper-right crystal bank makes the
      // deposit read as a single outcrop rather than scattered gems.
      for(const [x,z,s] of [[10,-17,1.65],[13,-15,1.85],[14,-12,1.48]]){
        const g=yAt(x,z);
        stamp('boulder',x,g+.13,z,s,.34,s*.72,'#775f66',.04,.27);
        stamp('boulder',x-.18,g+.36,z-.12,s*.79,.16,s*.59,'#b493b5',-.03,.27);
      }
      for(let j=0;j<13;j++){
        const x=10+j*.38,z=-16+Math.sin(j*.76)*1.1;
        stamp('coreCrystal',x,yAt(x,z)-.035,z,.19,.21+.14*Math.sin(j)**2,.22,'#42bdab',.26,j*.53);
      }
      const light=new T.PointLight(0x47dee2,1.05,13);light.position.set(8,floor+4,-15);near.add(light);
      const fill=new T.PointLight(0xffddb3,.92,42);fill.position.set(-1,floor+7,-2);near.add(fill);
    }
    if(site.id==='flame') {
      for(const [x,z,s] of [[-9,-12,4.6],[10,-13,4.2],[14,-6,3.2]])tree(x,z,s);
      const g=yAt(-14,-4);
      tendril([v(-21,g-1,-5),v(-20,g+4,-5),v(-17,g+5.4,-5),v(-13,g+5.2,-5),v(-11,g+3,-5),v(-10,g,-5)],1.6,'#814432',true);
      for(let i=0;i<7;i++){
        const x=-17.9+i*.78,h=4.85+.32*Math.sin(i*.7);
        tendril([v(x-.32,g+h,-3.95),v(x,g+h+.35,-3.73),v(x+.36,g+h+.54,-4.03)],.077,'#b36744');
      }
      // The right side of map 10053 has a fallen hollow trunk. Its open
      // bore and broken branch retain that landmark from the low camera.
      const logPlace=[[15,16],[15,24],[24,30]].find(([x,z])=>!blocked(x,z,4.5));
      if(logPlace){
        const [lx,lz]=logPlace,ly=yAt(lx,lz);
        stamp('hollowRoot',lx,ly+1.08,lz,1.10,3.35,1.10,'#ffffff',.17,.26,Math.PI/2);
        for(let j=0;j<5;j++)obstacle(lx-2.7+j*1.35,lz,.74);
        tendril([v(lx-.50,ly+1.74,lz-.13),v(lx-.98,ly+2.43,lz-.45),v(lx-1.26,ly+2.65,lz-.82)],.22,'#70406a');
        const coil=[];
        for(let j=0;j<=24;j++){
          const t=j/24,a=t*tau*1.6;
          coil.push(v(lx-2.5+5*t,ly+1.08+.97*Math.cos(a),lz+.96*Math.sin(a)));
        }
        tendril(coil,.075,'#2379bd');
      }
    }
    if(site.id==='sanctuary') {
      const x=0,z=-14,g=yAt(x,z);
      for(const [r,h,shade] of [[5,.4,'#985b46'],[4.5,.7,'#c18a62'],[4,.92,'#f0c479']]) stamp('facet',x,g+h*.48,z,r,h,r,shade,0,.19);
      stamp('rim',x,g+.96,z,3.25,3.25,.47,'#ffe4a1',Math.PI/2);
      for(let i=0;i<14;i++){
        const a=tau*i/14+.19;
        stamp('facet',x+3.72*Math.cos(a),g+.78,z+3.72*Math.sin(a),.24,.24,.12,'#ac805b',0,-a);
      }
      obstacle(x,z,4.25);
      for(const [px,pz,s] of [[-7,-15,3.7],[7,-16,3.1],[-8,-21,2.5],[9,-23,4.1]]) {
        const y=yAt(px,pz);stamp('boulder',px,y+s*.57,pz,s*.34,s,s*.31,'#a77861',.16,.26,-.18);
        stamp('facet',px-.05,y+s*.67,pz+.21,s*.24,s*1.5,s*.20,'#e6b792',.16,.26,-.18);
        for(let j=0;j<3;j++)stamp('boulder',px-.04*j,y+s*(.27+.31*j),pz+.14,
          s*(.34-.035*j),s*.065,s*.29,j%2?'#99714f':'#d2ab7e',.07,.26,-.18);
        obstacle(px,pz,s*.26);
      }
    }
    // Put small understory colonies at the edges of the route and around the
    // existing habitat, without moving its older randomly placed flora and fauna.
    if(site.id!=='core'){
      const tint=openGround[site.id]?.leaves||groves[site.id]?.crown||azureLeaves;
      const detail=randFrom(3733+order*419);
      for(let i=0;i<62;i++){
        const az=detail()*tau,range=5+23*detail(),x=Math.sin(az)*range,z=Math.cos(az)*range;
        if(padClear(site.x+x,site.z+z,.5)||trail(site.x+x,site.z+z)<2.7||
           pools.some(p=>Math.hypot((site.x+x-p.x)/p.rx,(site.z+z-p.z)/p.rz)<1.03))continue;
        const size=.35+.71*detail(),y=yAt(x,z)-.015;
        for(let j=0;j<6;j++){
          const angle=az+j*tau/6,stretch=size*(.65+.42*detail());
          stamp('fern',x,y,z,stretch,size,stretch,tint[j%tint.length],-.22+.22*detail(),angle);
        }
      }
    }
    // Record the top of solid scenery in 3 m ground cells directly from the
    // rendered geometry. A shuttle approaches a crown, arch or cave roof from
    // above; the walker's trunk-only footprint cannot describe that contact.
    const bounds=new T.Box3(),birdCover=new Map();
    for(const [key,items] of records) {
      const {geo,material}=shapes.get(key);
      // Ground creatures need a canopy clearance appropriate to their height.
      if(!geo.boundingBox)geo.computeBoundingBox();
      for(const item of key==='fern'?[]:items){
        bounds.copy(geo.boundingBox).applyMatrix4(item.matrix);
        if(bounds.max.x<-22||bounds.min.x>22||bounds.max.z<-22||bounds.min.z>22)continue;
        const cx=(bounds.min.x+bounds.max.x)*.5,cz=(bounds.min.z+bounds.max.z)*.5;
        const underside=bounds.min.y-yAt(cx,cz);
        const box={left:bounds.min.x,right:bounds.max.x,back:bounds.min.z,front:bounds.max.z,underside};
        for(let ix=Math.floor(box.left);ix<=Math.floor(box.right);ix++)
          for(let iz=Math.floor(box.back);iz<=Math.floor(box.front);iz++){
            const cell=ix*256+iz;
            if(!birdCover.has(cell))birdCover.set(cell,[]);
            birdCover.get(cell).push(box);
          }
      }
      if(!['pool','energyPool','mud','lamp','sod','leaf','fern'].includes(key)){
        if(!geo.boundingBox)geo.computeBoundingBox();
        for(const item of items){
          bounds.copy(geo.boundingBox).applyMatrix4(item.matrix);
          if(bounds.max.y-bounds.min.y<.34)continue;
          const top=baseHeight+bounds.max.y;
          for(let ix=Math.floor(bounds.min.x/3);ix<=Math.floor(bounds.max.x/3);ix++)
            for(let iz=Math.floor(bounds.min.z/3);iz<=Math.floor(bounds.max.z/3);iz++){
              const cell=ix*512+iz;overhead.set(cell,Math.max(overhead.get(cell)??-Infinity,top));
            }
        }
      }
      function batch(target,geometry,entries) {
        if(!entries.length)return;
        const mesh=new T.InstancedMesh(geometry,material,entries.length);
        entries.forEach((item,i)=>{mesh.setMatrixAt(i,item.matrix);mesh.setColorAt(i,color(item.hex));});
        mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;
        mesh.receiveShadow=true;mesh.castShadow=target===near&&!['pool','energyPool','mud','lamp','sod'].includes(key);
        target.add(mesh);
      }
      batch(near,geo,items);
      if(key!=='leaf')batch(far,distantShapes[key]||geo,items.filter(item=>{
        const m=item.matrix.elements;
        return Math.max(Math.hypot(m[0],m[1],m[2]),Math.hypot(m[4],m[5],m[6]),Math.hypot(m[8],m[9],m[10]))>2.1;
      }));
    }
    if(site.id==='grassland'){
      const perches=[[2,-5],[-2,-8],[3,1],[-4,5],[-10,10]];
      for(const [index,[x,z]] of perches.entries()){
        const pet={...createFieldSpirit(T,10,{sceneScale}),id:'grassland-pipi-'+(index+1),x,z,homeX:x,homeZ:z,yAt,site,near,cover:birdCover,cooldown:0,
          random:randFrom(15831+pipi.length*931),yaw:0,hop:null,goal:null,idle:0,clock:0,at:null};
        // A scenery edit can shift a bed over a traditional perch. Search
        // outwards on open soil instead of instantiating inside its mesh.
        let found=false;
        for(let ring=0;ring<=12&&!found;ring++){
          const count=Math.max(1,ring*8);
          for(let k=0;k<count;k++){
            const a=tau*k/count,px=x+ring*.45*Math.cos(a),pz=z+ring*.45*Math.sin(a);
            if(!birdClear(pet,px,pz,null,null))continue;
            pet.x=pet.homeX=px;pet.z=pet.homeZ=pz;found=true;break;
          }
        }
        if(!found){pet.dispose();continue;}
        pet.root.userData.kloseSpirit=pet.id;
        pet.yaw=pet.random()*tau;pet.idle=pet.random()*1.1;pet.clock=pet.random()*4;
        pipi.push(pet);near.add(pet.animal);posePipi(pet);
      }
    }
    safari.instantiate(site,near,yAt,obstacles,birdCover);
    wildlife.install(site,near,yAt,obstacles,birdCover);
    return {group,near,far,site,obstacles,overhead};
  }
  function birdClear(pet,x,z,walker,shuttle){
    // The meadow centre is the published walking-map arrival point.
    if(Math.hypot(x,z)<1.05+pet.radius)return false;
    if(!kloseClearsCover(pet.cover,x,z,pet.radius,pet.size+.18))return false;
    function clears(cx,cz,limit){
      const distance=Math.hypot(x-cx,z-cz);
      // A visitor or the descending hull can enter the avoidance margin:
      // allow the bird to move outwards while still inside that margin.
      return distance>=limit || (pet.at&&distance>Math.hypot(pet.x-cx,pet.z-cz)+1e-7);
    }
    if(walker&&!clears(walker.x,walker.z,.36+pet.radius))return false;
    if(shuttle&&!clears(shuttle.x,shuttle.z,9+pet.radius))return false;
    return pipi.every(other=>other===pet||other.cooldown||clears(other.x,other.z,other.radius+pet.radius+.03)) &&
      wildlife.inhabitants.every(other=>other.site.id!=='grassland'||!other.root.visible||clears(other.x,other.z,other.radius+pet.radius));
  }
  function clearPath(pet,x,z,walker,shuttle){
    const dx=x-pet.x,dz=z-pet.z,steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.14));
    for(let i=1;i<=steps;i++){
      if(!birdClear(pet,pet.x+dx*i/steps,pet.z+dz*i/steps,walker,shuttle))return false;
    }
    return true;
  }
  function chooseGoal(pet,threat,walker,shuttle){
    const angle=threat?Math.atan2(pet.x-threat.x,pet.z-threat.z):pet.random()*tau;
    for(let i=0;i<16;i++){
      const a=angle+(threat?(pet.random()-.5)*2.0:i*2.39996);
      const reach=threat?3.6+pet.random()*2.8:1.2+pet.random()*2.3;
      const x=(threat?pet.x:pet.homeX)+Math.sin(a)*reach;
      const z=(threat?pet.z:pet.homeZ)+Math.cos(a)*reach;
      if(Math.abs(x)>19||Math.abs(z)>19||Math.hypot(x-pet.x,z-pet.z)<.75)continue;
      if(clearPath(pet,x,z,walker,shuttle))return {x,z};
    }
    return null;
  }
  function posePipi(pet){
    const h=pet.hop,arc=h?4*h.t*(1-h.t):0,dx=Math.sin(pet.yaw),dz=Math.cos(pet.yaw);
    const ground=pet.yAt(pet.x,pet.z);
    pet.at=move(pet.site.lat,pet.site.lon,pet.x,-pet.z);
    // Follow the drawn triangles under the feet, including after a change
    // of terrain LOD. Local +Z is the actual eye and bill direction.
    pet.animal.position.set(pet.x,ground+groundCorrection(pet.at.lat,pet.at.lon)+.004+(h?h.lift*arc:0),pet.z);
    pet.animal.rotation.y=pet.yaw;
    pet.animal.rotation.x=-Math.atan((pet.yAt(pet.x+.12*dx,pet.z+.12*dz)-ground)/.12);
    pet.animal.rotation.z=Math.atan((pet.yAt(pet.x+.12*dz,pet.z-.12*dx)-ground)/.12);
    const breath=.012*Math.sin(pet.clock*3);
    pet.blink(pet.clock);
    pet.body.scale.set(1-.02*arc,1+breath+.05*arc,1-.02*arc);
    pet.body.rotation.x=h ? .12*Math.sin(h.t*tau) : .025*Math.sin(pet.clock*2);
    for(let i=0;i<2;i++){
      pet.feet[i].position.y=.035+.012*arc;pet.feet[i].rotation.x=-.35*arc;
      pet.ears[i].rotation.z=(i?1:-1)*(.032*Math.sin(pet.clock*2+i*.3)+.23*arc);
      pet.ears[i].rotation.x=h?-.14*Math.sin(h.t*tau):.028*Math.sin(pet.clock*1.8+i);
    }
  }
  function advancePipi(pet,dt,walker,shuttle){
    pet.clock+=dt;
    if(pet.hop){
      const h=pet.hop;h.t=Math.min(1,h.t+dt/h.duration);
      const progress=h.t-Math.sin(h.t*tau)/tau;
      const x=h.x+h.dx*progress,z=h.z+h.dz*progress;
      if(!h.blocked&&birdClear(pet,x,z,walker,shuttle)){pet.x=x;pet.z=z;}
      else {h.blocked=true;pet.goal=null;}
      if(h.t>=1){pet.hop=null;pet.idle=.065+pet.random()*.10;}
      return;
    }
    const near=(p,r)=>p&&Math.hypot(pet.x-p.x,pet.z-p.z)<r;
    const threat=near(shuttle,10.5)?shuttle:near(walker,1.25)?walker:null;
    if(threat&&pet.goal){
      const outward=(pet.goal.x-pet.x)*(pet.x-threat.x)+(pet.goal.z-pet.z)*(pet.z-threat.z);
      if(outward<=0)pet.goal=null;
    }
    if(threat&&!pet.alert)pet.idle=0;
    pet.alert=Boolean(threat);
    if((pet.idle-=dt)>0)return;
    if(!pet.goal){
      pet.goal=chooseGoal(pet,threat,walker,shuttle);
      if(!pet.goal){pet.idle=.45;return;}
    }
    const dx=pet.goal.x-pet.x,dz=pet.goal.z-pet.z,dist=Math.hypot(dx,dz);
    if(dist<.09){pet.goal=null;pet.idle=.6+pet.random()*1.6;return;}
    const want=Math.atan2(dx,dz),turn=Math.atan2(Math.sin(want-pet.yaw),Math.cos(want-pet.yaw));
    const maxTurn=(threat?6:4.6)*dt;
    pet.yaw+=T.MathUtils.clamp(turn,-maxTurn,maxTurn);
    if(Math.abs(turn)>maxTurn)return;
    const stride=Math.min(dist,(threat ? .40 : .26)+pet.random()*.16);
    const stepX=dx*stride/dist,stepZ=dz*stride/dist;
    if(!clearPath(pet,pet.x+stepX,pet.z+stepZ,walker,shuttle)){
      pet.goal=null;pet.idle=.18;return;
    }
    pet.hop={x:pet.x,z:pet.z,dx:stepX,dz:stepZ,t:0,
      lift:.055+.14*stride,duration:.20+.23*stride};
  }
  function update(lat,lon,dt,altitude=0,walking=false,shuttleStatus=null) {
    poolTime.value=(poolTime.value+dt)%3600;
    const {x,z}=chart(lat,lon);
    for(let i=0;i<sites.length;i++) {
      const site=sites[i],dist=Math.hypot(x-site.x,z-site.z,altitude);
      if(!batches[i]&&dist<570)batches[i]=makeSite(site,i);
      const parts=batches[i];
      if(parts){parts.group.visible=dist<670;parts.near.visible=dist<116;parts.far.visible=!parts.near.visible;}
    }
    const walker=walking?{x,z}:null;
    const shuttle=shuttleStatus&&shuttleStatus.clearance<32?chart(shuttleStatus.lat,shuttleStatus.lon):null;
    const total=T.MathUtils.clamp(dt||0,0,.24),steps=Math.max(1,Math.ceil(total/.035));
    wildlife.update(total,walker,shuttle);
    safari.update(total,walker,shuttle);
    if(!batches[0]?.near.visible)return;
    for(const pet of pipi){
      pet.cooldown=Math.max(0,pet.cooldown-total);pet.root.visible=!pet.cooldown;
    }
    for(let i=0;i<steps;i++)for(const pet of pipi)if(!pet.cooldown)advancePipi(pet,total/steps,walker,shuttle);
    for(const pet of pipi)if(!pet.cooldown)posePipi(pet);
  }
  function obstacleTop(x,z,footprint){
    let top=-Infinity;
    for(let i=0;i<sites.length;i++){
      const site=sites[i],dx=x-site.x,dz=z-site.z;
      if(Math.abs(dx)>94+footprint||Math.abs(dz)>94+footprint)continue;
      const batch=batches[i]||(batches[i]=makeSite(site,i));
      for(let ix=Math.floor((dx-footprint)/3);ix<=Math.floor((dx+footprint)/3);ix++)
        for(let iz=Math.floor((dz-footprint)/3);iz<=Math.floor((dz+footprint)/3);iz++){
          top=Math.max(top,batch.overhead.get(ix*512+iz)??-Infinity);
        }
    }
    for(const pet of pipi){
      if(!pet.cooldown&&Math.hypot(x-pet.x,z-pet.z)<footprint+pet.radius)
        top=Math.max(top,height(pet.at.lat,pet.at.lon)+pet.size+(pet.hop?.lift||0));
    }
    for(const pet of wildlife.inhabitants){
      if(pet.root.visible&&Math.hypot(x-pet.site.x-pet.x,z-pet.site.z-pet.z)<footprint+pet.radius)
        top=Math.max(top,height(pet.at.lat,pet.at.lon)+(pet.shield?.visible?pet.shieldHeight:pet.size));
    }
    return Math.max(top,wildlife.obstacleTop(x,z,footprint),safari.obstacleTop(x,z,footprint));
  }
  function nearestPipi(lat,lon,id) {
    const observer=chart(lat,lon);let closest=null,distance=Infinity;
    for(const pet of pipi) {
      if(pet.cooldown||!pet.near.visible||(id&&pet.id!==id))continue;
      const d=Math.hypot(observer.x-pet.x,observer.z-pet.z);
      if(d<distance){closest=pet;distance=d;}
    }
    return closest?{id:closest.id,key:closest.id,speciesId:10,name:'皮皮',siteId:'grassland',kind:'wild',level:1+(pipi.indexOf(closest)%2),size:closest.size*sceneScale,visible:true,distance:distance*sceneScale,lat:closest.at.lat,lon:closest.at.lon,
      focusPoint:closest.root.localToWorld(v(0,closest.size*.45,.02))}:null;
  }
  function spiritObservation(lat,lon,key){
    const possible=[nearestPipi(lat,lon,key),wildlife.observation(lat,lon,key),safari.observe(lat,lon,key)].filter(Boolean);
    return possible.reduce((best,p)=>!best||p.distance<best.distance?p:best,null);
  }
  function withdrawSpirit(key){
    const bird=pipi.find(p=>p.id===key);
    if(!bird)return wildlife.withdraw(key);
    bird.cooldown=48;bird.root.visible=false;bird.hop=bird.goal=null;return true;
  }
  function pickSpirit(raycaster,lat,lon){
    const hunting=safari.pick(raycaster,lat,lon);
    if(hunting)return hunting;
    const viewer=chart(lat,lon),roots=[];
    for(const p of [...pipi,...wildlife.inhabitants]){
      if(p.near.visible&&p.root.visible&&Math.hypot(viewer.x-p.site.x-p.x,viewer.z-p.site.z-p.z)*sceneScale<=22)roots.push(p.root);
    }
    const hit=raycaster.intersectObjects(roots,true)[0];
    if(!hit)return null;
    let node=hit.object;while(node&&!node.userData.kloseSpirit)node=node.parent;
    return node?spiritObservation(lat,lon,node.userData.kloseSpirit):null;
  }
  function walk(lat,lon,east,north) {
    const start=chart(lat,lon),end=move(lat,lon,east,north),dest=chart(end.lat,end.lon);
    const candidates=batches.filter(part=>Math.hypot(start.x-part.site.x,start.z-part.site.z)<111)
      .flatMap(part=>part.obstacles).concat(pipi.filter(p=>!p.cooldown).map(p=>({x:p.x,z:p.z,r:p.radius})),
        wildlife.inhabitants.filter(p=>p.root.visible).map(p=>({x:p.site.x+p.x,z:p.site.z+p.z,r:p.radius})),safari.obstacles())
      .filter(o=>Math.hypot(start.x-o.x,start.z-o.z)<Math.hypot(east,north)+o.r+.55);
    if(!candidates.length)return end;
    // Short steps plus radial projection let the player slide around a trunk
    // without crossing thin buttresses during a sprint.
    const count=Math.max(1,Math.ceil(Math.hypot(east,north)/.26));
    const dx=(dest.x-start.x)/count,dz=(dest.z-start.z)/count;
    let x=start.x,z=start.z;
    for(let i=0;i<count;i++) {
      x+=dx;z+=dz;
      for(const o of candidates) {
        const xx=x-o.x,zz=z-o.z,dist=Math.hypot(xx,zz),minimum=o.r+.26;
        if(dist<minimum) {
          if(dist<1e-6){x=o.x+minimum;z=o.z;}
          else{x=o.x+xx*minimum/dist;z=o.z+zz*minimum/dist;}
        }
      }
    }
    return move(lat,lon,x-start.x,start.z-z);
  }
  function prepareWalk(lat,lon){
    const {x,z}=chart(lat,lon);
    for(const [i,site] of sites.entries()){
      if(!batches[i]&&Math.hypot(x-site.x,z-site.z)<111)batches[i]=makeSite(site,i);
    }
  }
  function forestBossPosition(){
    const boss=wildlife.inhabitants.find(p=>p.speciesId===47);
    return boss?.at||null;
  }
  return {update,nearestPipi,spiritObservation,forestBossPosition,withdrawSpirit,pickSpirit,interactSpiritSite:wildlife.interact,
    spiritSiteHint:wildlife.hint,setSafariState:safari.setState,safariAction:safari.action,safariWalk:safari.walked,safariHint:safari.hint,
    walk,prepareWalk,obstacleTop};
}
