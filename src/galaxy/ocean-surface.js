// Taomei's map table connects 20 → 21 → 22 and, in a later chapter, 22 → 737.
// The floating L-01 berth is expedition equipment. All natural ground is submerged.
const OCEAN_WORLD=(()=>{
  const radius=41000,lat=.24,lon=-.43;
  const at=(id,name,x,z,description,mapId)=>({id,name,x,z,description,mapId,
    lat:lat-z/radius,lon:lon+x/(radius*Math.cos(lat))});
  const sites=[
    at('ocean-shallows','海洋星浅水区',0,0,'粉色管珊瑚、贝尔与甲烷气泡泉',20),
    at('ocean-depths','海洋星深水区',-108,47,'白色岩台、黄晶矿与利牙鱼口腔护理站',21),
    at('ocean-floor','海洋星海底',-203,105,'海沟石阶与钢牙鲨的岩洞',22),
    {...at('ocean-sanctum','深海禁地',-149,193,'青光共柱撑起两道深海岩窗，左侧有半埋的辐轮残件',737),
      lookAt:[-148,171],lookPitch:.22}
  ];
  const routes=sites.slice(1).map((site,i)=>[sites[i].id,site.id]);
  const landingSites=[at('ocean-shallows','浅海登陆平台',24,-37,'海洋星水面上的 L-01 人工泊台',null)];
  return {id:'ocean',name:'海洋星',radius,sites,landingSites,routes};
})();

function createOceanSurface(T,world){
  const {radius,sites,landingSites}=OCEAN_WORLD,origin=sites[0],pad=landingSites[0];
  const tau=2*Math.PI,clamp=T.MathUtils.clamp,smooth=T.MathUtils.smoothstep;
  const root=new T.Group(),district=new T.Group(),terrain=new T.Group(),fauna=new T.Group();
  root.name='海洋星';root.add(terrain,district,fauna);world.add(root);
  const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
  const color=hex=>new T.Color(hex).convertSRGBToLinear();
  function frame(lat,lon){
    const c=Math.cos(lat),s=Math.sin(lat),a=Math.cos(lon),b=Math.sin(lon);
    const up=v(c*a,s,-c*b),east=v(-b,0,-a),north=v(-s*a,c,s*b),south=north.clone().negate();
    return {east,up,north,south,quaternion:new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(east,up,south))};
  }
  const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
  function move(lat,lon,east,north){
    const dist=Math.hypot(east,north);
    if(!dist)return {lat,lon};
    const angle=dist/radius,cz=Math.cos(angle),sz=Math.sin(angle),c=Math.cos(lat),s=Math.sin(lat);
    const radial=c*cz-s*north/dist*sz,side=east/dist*sz;
    return {lat:Math.atan2(s*cz+c*north/dist*sz,Math.hypot(radial,side)),lon:wrap(lon+Math.atan2(side,radial))};
  }
  const chart=(lat,lon)=>({x:wrap(lon-origin.lon)*radius*Math.cos(origin.lat),z:(origin.lat-lat)*radius});
  const fromXZ=(x,z)=>({lat:origin.lat-z/radius,lon:origin.lon+x/(radius*Math.cos(origin.lat))});
  const depthMarks=[6,27,49,64];
  function seaFloor(x,z){
    const rough=.46*Math.sin(x*.095+z*.041)*Math.cos(z*.08)+.18*Math.sin(x*.27-z*.10);
    const reach=Math.hypot(x+86,z-57);
    if(reach>520)return -89+12*Math.sin(x*.00038)*Math.cos(z*.00051);
    // Blend the shelves by distance; give each named site's central courtyard a level floor.
    let weight=0,sum=0;
    for(let i=0;i<sites.length;i++){
      const dx=x-sites[i].x,dz=z-sites[i].z;
      const t=1/(60+dx*dx+dz*dz),w=t*t;
      sum+=w*depthMarks[i];weight+=w;
    }
    const local=-sum/weight+rough;
    return T.MathUtils.lerp(local,-89+12*Math.sin(x*.00038)*Math.cos(z*.00051),smooth(reach,285,520));
  }
  const pierRadius=22,pierLevel=1.65;
  const pierDistance=Math.hypot(pad.x,pad.z),acrossX=-pad.x/pierDistance,acrossZ=-pad.z/pierDistance;
  function support(x,z){
    const ground=seaFloor(x,z),dx=x-pad.x,dz=z-pad.z;
    if(dx*dx+dz*dz<=pierRadius*pierRadius)return pierLevel;
    const along=dx*acrossX+dz*acrossZ,across=dx*acrossZ-dz*acrossX;
    if(Math.abs(across)<=2.25&&along>=pierRadius-1&&along<=pierDistance+1){
      const mix=clamp((along-pierRadius)/(pierDistance-pierRadius),0,1);
      return Math.max(ground,T.MathUtils.lerp(pierLevel,seaFloor(0,0),mix));
    }
    return ground;
  }
  function height(lat,lon){const {x,z}=chart(lat,lon);return support(x,z);}
  function point(lat,lon,above=0){
    const r=radius+height(lat,lon)+above,c=Math.cos(lat);
    return v(r*c*Math.cos(lon),r*Math.sin(lat),-r*c*Math.sin(lon));
  }
  function siteAt(lat,lon){
    const {x,z}=chart(lat,lon);let nearest=null,best=58;
    for(const site of sites){const d=Math.hypot(x-site.x,z-site.z);if(d<best){nearest=site;best=d;}}
    return nearest;
  }
  const cut={value:2},capCenter={value:v(1,0,0)};
  function globeTexture(){
    const c=document.createElement('canvas');c.width=1024;c.height=512;
    const ctx=c.getContext('2d'),bg=ctx.createLinearGradient(0,0,120,512);
    bg.addColorStop(0,'#88aebd');bg.addColorStop(.32,'#91a9c8');bg.addColorStop(.58,'#687fa9');
    bg.addColorStop(.82,'#6d86a8');bg.addColorStop(1,'#b3c8db');
    ctx.fillStyle=bg;ctx.fillRect(0,0,1024,512);
    let seed=328293;
    const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<58;i++){
      const cx=rnd()*1024,cy=14+484*rnd(),r=6+30*rnd(),stretch=1.15/Math.max(.44,Math.sin(cy*Math.PI/512));
      const bend=rnd()*tau;
      for(const x of [cx-1024,cx,cx+1024]){
        ctx.save();ctx.translate(x,cy);ctx.scale(stretch,1);
        for(const [ratio,tint,weight] of [[1.25,'#556f8b',.14],[1.06,'#ced8ef',.19],[.91,'#f1f2ef',.14],[.74,'#5b8faa',.12],[.62,'#687da3',.18]]){
          ctx.beginPath();
          for(let k=0;k<=40;k++){
            const a=tau*k/40,len=r*ratio*(1+.11*Math.cos(a*4+bend)+.055*Math.cos(3*a-bend));
            const px=len*Math.cos(a),py=len*Math.sin(a);if(k===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
          }
          ctx.closePath();ctx.strokeStyle=tint;ctx.lineWidth=r*weight;ctx.stroke();
        }
        ctx.restore();
      }
    }
    const tex=new T.CanvasTexture(c);tex.encoding=T.sRGBEncoding;tex.wrapS=T.RepeatWrapping;return tex;
  }
  const oceanPaint=new T.MeshStandardMaterial({map:globeTexture(),roughness:.72,metalness:.06});
  oceanPaint.onBeforeCompile=s=>{
    s.uniforms.uCap=cut;s.uniforms.uCapCenter=capCenter;
    s.vertexShader='varying vec3 vOceanNormal;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvOceanNormal=normal;');
    s.fragmentShader='uniform float uCap;uniform vec3 uCapCenter;varying vec3 vOceanNormal;\n'+
      s.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(dot(normalize(vOceanNormal),uCapCenter)>uCap)discard;');
  };
  const globe=new T.Mesh(new T.SphereGeometry(radius,128,80),oceanPaint);root.add(globe);
  const fixedFrame=frame(origin.lat,origin.lon),anchor=fixedFrame.up.clone().multiplyScalar(radius);
  district.position.copy(anchor);district.quaternion.copy(fixedFrame.quaternion);
  // Local geometry is surveyed in the same east/south chart as the collision model.
  function groundY(x,z){return seaFloor(x,z)-(x*x+z*z)/(2*radius);}
  const blockers=[],shapes=new Map(),entries=new Map();
  const painted=new T.MeshStandardMaterial({roughness:.70,metalness:.08});
  const mineral=new T.MeshStandardMaterial({vertexColors:true,roughness:.86,flatShading:true});
  const organic=new T.MeshStandardMaterial({vertexColors:true,roughness:.65,side:T.DoubleSide});
  const tideTime={value:0};
  const waterLightGLSL=`
    float reefLight(vec2 p,float depth,float t){
      vec2 bent=p*.72 + vec2(.81*sin(.52*p.y+t*.31)+.27*sin(1.08*p.x-t*.21),
                              .73*sin(.47*p.x-t*.27)+.31*cos(.89*p.y+t*.19));
      float a=sin(bent.x+.36*bent.y+t*.13),b=cos(bent.y-.42*bent.x-t*.17);
      float line=abs(a+b+.27*sin(1.46*bent.x-.82*bent.y));
      return (1.-smoothstep(.025,.21,line))*(1.-smoothstep(8.,54.,depth))/
        (1.+length(fwidth(p))*.7);
    }
  `;
  const limestone=mineral.clone();
  const spongeSkin=fieldSurfaceFinish(organic.clone(),'sponge');
  const nacre=fieldSurfaceFinish(organic.clone(),'nacre');
  fieldSurfaceFinish(organic,'cuticle');
  const enamel=applyManufacturedFinish(new T.MeshStandardMaterial({roughness:.48,metalness:.12}),'paint');
  const fittings=fieldSurfaceFinish(new T.MeshStandardMaterial({roughness:.57,metalness:.42}),'metal');
  const tabletStone=fieldSurfaceFinish(new T.MeshStandardMaterial({roughness:.85}),'stone');
  fieldSurfaceFinish(mineral,'crystal');
  // Thin folded bedding follows each outcrop, including its underside.
  // Fade the fine strata at a distance so the reef still reads in clear masses.
  limestone.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 bedCoordinate;\n'+shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nbedCoordinate=position;');
    shader.fragmentShader='varying vec3 bedCoordinate;\n'+shader.fragmentShader.replace('#include <color_fragment>',
      `#include <color_fragment>
      float bed=bedCoordinate.y+.13*bedCoordinate.z+.058*sin(4.*bedCoordinate.x+.7*bedCoordinate.z);
      float fine=1.-smoothstep(12.,62.,length(vViewPosition));
      float lamina=1.-smoothstep(.008,.07,abs(fract(bed*10.+.42)-.5));
      float prominence=.5+.5*sin(7.*bedCoordinate.x+2.*bedCoordinate.z);
      diffuseColor.rgb*=1.+fine*(.044*sin(bed*34.)-.16*lamina*prominence);`);
  };
  // Refracted light uses the same metre coordinates on an oyster shell, its
  // limestone support and the sand underneath. It fades down the deep trench.
  for(const [i,mat] of [limestone,mineral,organic,painted,spongeSkin,nacre,enamel,fittings,tabletStone].entries()){
    const surfacePass=mat.onBeforeCompile.bind(mat);
    mat.customProgramCacheKey=()=>'reef-light-'+i;
    mat.onBeforeCompile=s=>{
      surfacePass(s);s.uniforms.seaClock=tideTime;
      s.vertexShader='varying vec3 reefPlace;\n'+s.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\nreefPlace=(instanceMatrix*vec4(position,1.)).xyz;');
      s.fragmentShader='varying vec3 reefPlace;uniform float seaClock;\n'+waterLightGLSL+s.fragmentShader.replace('#include <color_fragment>',
        `#include <color_fragment>
         float lightNet=reefLight(reefPlace.xz+.18*reefPlace.y,-reefPlace.y,seaClock);
         diffuseColor.rgb*=vec3(1.)+vec3(.22,.36,.36)*lightNet*
           (1.-smoothstep(-.18,0.,reefPlace.y));`);
    };
  }
  function shape(name,g,m=painted){shapes.set(name,{g,m});}
  // Closed contour rings share vertices and colours between adjacent faces.
  // One indexed mesh per shape is reused by every colony, shell and outcrop.
  function ringMesh(sides,rows,sample){
    const positions=[],tints=[],indices=[];
    for(let j=0;j<rows;j++)for(let i=0;i<sides;i++){
      const [x,y,z,light]=sample(j,i,tau*i/sides);
      positions.push(x,y,z);tints.push(light,light,light);
      if(j+1===rows)continue;
      const a=j*sides+i,b=j*sides+(i+1)%sides;
      indices.push(a,a+sides,b,b,a+sides,b+sides);
    }
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    g.setAttribute('color',new T.Float32BufferAttribute(tints,3));
    g.setIndex(indices);g.computeVertexNormals();return g;
  }
  const beds=[[-.97,0,.54],[-.72,.78,.66],[-.32,.99,.84],[-.17,.91,.66],
    [-.10,1,.96],[.22,.95,.88],[.34,.89,.68],[.43,.95,.98],[.77,.78,.93],[.87,.49,1],[.90,0,1]];
  shape('rock',ringMesh(13,beds.length,(j,i,a)=>{
    const [y,r,light]=beds[j];
    const radius=r*(.92+.07*Math.sin(3*a+.4)+.04*Math.cos(5*a-.6)+.035*Math.sin(4*a+.49*j));
    const x=radius*Math.cos(a),z=radius*Math.sin(a);
    return [x+.075*y,y+x*.07+z*.08,z,light*(.95+.05*Math.cos(a*3-.3))];
  }),limestone);
  const facets=[[-.75,0,.51],[-.49,.70,.65],[-.18,.85,.74],[.04,.908,.82],
    [.062,.907,.65],[.083,.906,.87],[.32,.96,.94],[.339,.955,.81],[.36,.957,.96],[.53,1,.91],[.82,.52,1],[1,0,1]];
  shape('crystal',ringMesh(6,facets.length,(j,i,a)=>{
    const [y,r,light]=facets[j];
    return [Math.cos(a)*r+y*.15,y,Math.sin(a)*r,light*(i%2?.80:1)];
  }),mineral);
  shape('lobe',new T.SphereGeometry(1,12,8));
  shape('rod',new T.CylinderGeometry(.76,1,1,7));
  shape('box',new T.BoxGeometry(1,1,1));
  shape('disk',new T.CylinderGeometry(1,1,1,48));
  shape('ring',new T.TorusGeometry(1,.11,7,22));
  // A rounded coral tip and a machine housing share a mesh, but reflect differently.
  for(const [id,source,finish] of [['housing','lobe',enamel],['panel','box',enamel],['deck','disk',enamel],
    ['coupling','ring',fittings],['rail','rod',fittings],['hub','lobe',fittings]]){
    shape(id,shapes.get(source).g,finish);
  }
  {
    // One continuous span, surveyed in metres. Rotate the second span around
    // the shared pier; the two openings are independently passable.
    const struts=[[0,-.75,0],[.05,2.7,-.12],[.50,6,-.02],[1.40,9.25,-.32],
      [4.35,12.42,-.85],[7.08,12.94,-1.13],[11.55,11.50,-1.73],[14.23,8.88,-2.08],
      [15.37,5.25,-1.56],[16.28,2.0,-1.13],[16.85,-.83,-.84]].map(a=>v(...a));
    const line=new T.CurvePath();
    for(let j=1;j<struts.length;j++)line.add(new T.LineCurve3(struts[j-1],struts[j]));
    const g=ringMesh(8,65,(j,i,a)=>{
      const t=j/64,at=line.getPoint(t),dir=line.getTangent(t),n=Math.hypot(dir.x,dir.y);
      const fault=.23*Math.pow(Math.max(0,Math.cos(t*52+i*.14)),7);
      const w=(1.39+.97*(2*t-1)**2)*(1+.17*Math.cos(t*26+i*.43)+.15*Math.sin(3*a+.72)-fault);
      const side=Math.cos(a)*w;
      return [at.x+dir.y/n*side,at.y-dir.x/n*side,at.z+Math.sin(a)*w*1.31,
        .61+.32*(.5+.5*Math.cos(a-1.9))+.13*Math.sin(21*t+2*a)-fault*.64];
    });
    shape('sanctumSpan',g,limestone);
    const jagged=[[0,.85],[.12,1],[.38,.74],[.60,.68],[.74,.47],[.89,.32],[1,.035]];
    shape('sanctumSpur',ringMesh(6,jagged.length,(j,i,a)=>{
      const [t,r]=jagged[j],w=r*(1+.16*Math.cos(2*a+.65));
      return [.61*t*t+w*Math.cos(a),t+.034*r*Math.cos(3*a),w*.72*Math.sin(a),
        .63+.23*(.5+.5*Math.cos(2*a+.4))+.11*t];
    }),mineral);
    const tablet=(outline,depth)=>{
      const face=new T.Shape(outline.map(([x,y])=>new T.Vector2(x,y)));face.closePath();
      return new T.ExtrudeGeometry(face,{depth,bevelEnabled:true,bevelSegments:1,bevelSize:.11,bevelThickness:.09});
    };
    shape('sanctumTablet',tablet([[-1.64,-.2],[1.23,-.2],[1.77,2.1],[1.31,3.0],[1.74,5.38],
      [1.08,7.88],[-.28,8.38],[-.92,6.63],[-.87,4.25],[-1.48,3.03]],1.27),tabletStone);
    const jade=new T.MeshStandardMaterial({roughness:.36,metalness:.10,
      emissive:color(0x69c6b6),emissiveIntensity:.63});
    shape('jadePlate',tablet([[-.93,-.27],[.34,-.44],[.97,-.12],[.82,.25],[-.46,.38],[-.86,.18]],.10),jade);
  }
  const spongeRim=[[0,.53,.67],[.31,.66,.76],[.67,.88,.84],[.81,.90,.87],
    [.9,1.02,.97],[.99,.98,1.22],[1,.79,1.12],[.90,.68,.57],[.68,.49,.22],[.55,0,.13]];
  shape('tube',ringMesh(24,spongeRim.length,(j,i,a)=>{
    const [y,r,light]=spongeRim[j],flute=.97+.055*Math.cos(8*a+.9*y)+.023*Math.sin(3*a);
    return [r*flute*Math.cos(a)+.18*y*y,y*(1+.024*Math.cos(a*3+.6)),r*flute*Math.sin(a),light*flute];
  }),spongeSkin);
  // Individual calyces on the fan tips have a six-lobed lip and recessed
  // centre. All of them share one instance batch across the district.
  const calyx=[[0,.13,.64],[.28,.34,.78],[.55,.67,.88],[.90,.86,1],[.59,.53,.71],[.44,0,.40]];
  shape('calyx',ringMesh(24,calyx.length,(j,i,a)=>{
    const [y,r,light]=calyx[j],petal=.5+.5*Math.cos(6*a),edge=j===3?.15:0;
    return [r*(.72+.28*petal)*Math.cos(a),y+edge*petal,r*(.72+.28*petal)*Math.sin(a),light];
  }),organic);
  // A continuous widening whorl curls into a flared aperture with a dark interior.
  const shellSteps=54;
  const whorl=ringMesh(11,shellSteps+4,(j,i,a)=>{
    const t=Math.min(j,shellSteps)/shellSteps,angle=tau*(2.25*t+.12),coil=.015+.34*t*t;
    const lip=j-shellSteps;
    const radius=(.015+.133*t*t)*(lip===1?1.11:lip===2?.72:lip===3?.04:1);
    const rib=1+.05*Math.cos(t*tau*20);
    const reach=coil+radius*rib*Math.cos(a);
    const x=reach*Math.cos(angle),y=.36+.78*reach*Math.sin(angle);
    return [x,y,.17*(1-t)+radius*rib*Math.sin(a)-Math.max(0,lip-1)*.035,
      lip===3?.16:lip===2?.64:(.84+.13*Math.cos(t*tau*12))*(1+.12*Math.cos(a))];
  });
  whorl.rotateX(-.47);whorl.computeBoundingBox();whorl.translate(0,-whorl.boundingBox.min.y,0);
  shape('shell',whorl,nacre);
  const plates=[[0,.91,.52],[.12,1,.77],[.55,.75,.89],[.78,.60,1.04],[.80,.40,1.12],[.59,.30,.46],[.38,.18,.22],[.33,0,.14]];
  shape('barnacle',ringMesh(30,plates.length,(j,i,a)=>{
    const [y,r,light]=plates[j],rib=Math.cos(a*6),flute=1+.065*rib;
    return [r*flute*Math.cos(a),y+.095*y*rib,r*flute*Math.sin(a),light*(.95+.08*rib)];
  }),organic);
  const temp=new T.Object3D();
  function record(id,tint){
    if(!entries.has(id))entries.set(id,[]);
    entries.get(id).push({matrix:temp.matrix.clone(),tint});
  }
  function stamp(id,x,y,z,w,h,d,tint,rx=0,ry=0,rz=0){
    temp.position.set(x,y,z);temp.rotation.set(rx,ry,rz);temp.scale.set(w,h,d);temp.updateMatrix();record(id,tint);
  }
  const rodAxis=v(0,1,0);
  function rod(x,y,z,xx,yy,zz,r,tint,shapeId='rod'){
    const dir=v(xx-x,yy-y,zz-z),len=dir.length();
    temp.position.set((x+xx)*.5,(y+yy)*.5,(z+zz)*.5);
    temp.quaternion.setFromUnitVectors(rodAxis,dir.divideScalar(len));
    temp.scale.set(r,len,r);temp.updateMatrix();record(shapeId,tint);
  }
  let seed=832491;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  function boulder(x,z,w,h,d,tint){
    const base=groundY(x,z),tilt=.10*random(),turn=random()*.9;
    stamp('rock',x,base+h*.42,z,w,h,d,tint,tilt,turn,.05);
    // The colony grows from the upper limestone bed. Transform its contacts
    // along with the rock so that shells never hang on the air beside a terrace.
    const rockFrame=temp.matrix.clone(),anchor=v();
    for(let j=0;j<14;j++){
      const a=j*2.39996+x*.1,r=.19*Math.sqrt(j/14);
      anchor.set(-.13+r*Math.cos(a),.875,.1+r*Math.sin(a));
      anchor.y+=.07*anchor.x+.08*anchor.z;
      anchor.applyMatrix4(rockFrame);
      const size=(.075+.026*(j%4))*Math.min(w,4);
      stamp('barnacle',anchor.x,anchor.y-.045,anchor.z,size,size*.80,size,
        j%3===0?0xa79299:0xd3c2b5,tilt,turn+a,.10);
    }
    if(w>1.35)blockers.push({x,z,r:Math.min(w,d)*.64,top:groundY(x,z)+h*1.42});
  }
  function sponge(x,z,s,shade){
    s*=1.38;
    if(corridorGap(x,z)<s*.9+2.3)return;
    const base=groundY(x,z)-.08;
    for(let j=0;j<8;j++){
      const a=j*2.4,l=s*(.45+random()*.71);
      const dx=s*Math.sin(a)*.56,dz=s*Math.cos(a)*.56,r=.12*s+.10*l;
      stamp('tube',x+dx,base,z+dz,r,l,r,shade,Math.cos(a)*.14,0,-Math.sin(a)*.15);
      if(j%2===0){
        const outerX=x+dx*1.23,outerZ=z+dz*1.23;
        stamp('barnacle',outerX,base+.018,outerZ,.23*s,.18*s,.22*s,0xc6a79d,.09,a);
      }
    }
    if(s>=1.8)blockers.push({x,z,r:s*.76,top:base+1.2*s});
  }
  function fan(x,z,s,tint){
    s*=1.4;
    if(corridorGap(x,z)<s*.65+2.3)return;
    const base=groundY(x,z),tilt=random()*tau,c=Math.cos(tilt),d=Math.sin(tilt);
    const lattice=[[],[],[]];
    function branch(u,h,angle,length,thick,n){
      const uu=u+Math.sin(angle)*length,hh=h+Math.cos(angle)*length;
      rod(x+c*u,base+h,z+d*u,x+c*uu,base+hh,z+d*uu,thick,tint);
      if(n<=2)lattice[n].push([uu,hh]);
      if(n){branch(uu,hh,angle-.37-random()*.16,length*.68,thick*.71,n-1);branch(uu,hh,angle+.34+random()*.20,length*.72,thick*.68,n-1);}
    }
    branch(0,0,-.17,s*.42,s*.075,4);
    for(let i=1;i<lattice[0].length;i+=3){
      const [u,h]=lattice[0][i],r=s*.041;
      stamp('calyx',x+c*u,base+h-r*1.6,z+d*u,r,r*1.60,r,tint,0,i*1.72,i%2?.25:-.28);
    }
    for(const [level,tips] of lattice.entries()){
      for(let j=1;j<tips.length;j++){
        const [u,h]=tips[j-1],[uu,hh]=tips[j];
        if(uu<=u||uu-u>.32*s)continue;
        rod(x+c*u,base+h,z+d*u,x+c*uu,base+hh,z+d*uu,s*(.010+level*.004),tint);
      }
    }
    if(s>=2.8)blockers.push({x,z,r:.41*s,top:base+s});
  }
  function shell(x,z,s){
    s*=1.56;
    if(s>1.6&&corridorGap(x,z)<2.4)return;
    const floor=groundY(x,z),bearing=Math.sin(x-z)*.85;
    stamp('shell',x,floor-.025*s,z,1.24*s,.87*s,1.4*s,0xd6bb8a,0,bearing);
    // The hinge roots in the sand. Sediment catches against its lee side.
    for(let k=-1;k<=1;k++){
      const u=.09*s*k,along=-.31*s;
      stamp('barnacle',x+u*Math.cos(bearing)+along*Math.sin(bearing),floor+.014*s,
        z-u*Math.sin(bearing)+along*Math.cos(bearing),.09*s,.067*s,.10*s,0xbca891,0,bearing);
    }
    if(s>1.6)blockers.push({x,z,r:s*.53,top:groundY(x,z)+s*.7});
  }
  function careStation(x,z,s){
    // The 2009 mission screen shows blue sloping armour, a green top lamp,
    // a vertical row of diodes and two vented side units on short feet.
    const base=groundY(x,z);
    const part=(id,dx,y,dz,w,h,d,tint,rx=0,ry=0,rz=0)=>stamp(id,x+dx*s,base+y*s,z+dz*s,w*s,h*s,d*s,tint,rx,ry,rz);
    part('panel',0,.32,0,2.0,.23,1.12,0x16435a);
    part('housing',0,.85,-.05,1.09,.68,.63,0x298ab1);
    for(const side of [-1,1]){
      part('panel',side*.92,.64,.30,.56,.65,1.04,0x154f78,.22,0,-side*.18);
      part('panel',side*.93,.71,.80,.39,.39,.08,0x388aaf,.22,0,-side*.18);
      for(let k=0;k<3;k++)part('box',side*.93,.60+k*.10,.86,.29,.039,.055,0x173948,.22);
      for(const end of [-1,1])part('lobe',side*.77,.20,end*.42,.17,.17,.18,0xdaa853);
    }
    part('box',0,1.04,.52,.94,.86,.18,0x273944,-.19);
    part('box',.13,1.08,.64,.54,.54,.065,0xadae94,-.19);
    for(let k=0;k<5;k++)part('box',-.27,.74+.14*k,.68-.025*k,.095,.072,.055,k<3?0x85db48:0x287443);
    for(let k=0;k<3;k++)part('box',.14,.92+k*.12,.70-k*.024,.40,.025,.026,0x596b67,-.19);
    part('disk',0,1.58,-.14,.39,.14,.36,0x215368);
    part('lobe',0,1.72,-.14,.27,.26,.27,0x80d743);
    part('lobe',-.10,1.84,.035,.073,.059,.036,0xd9ff8a);
    for(const side of [-1,1]){
      part('coupling',side*.68,1.17,.42,.14,.14,.075,0x9cb2a9,0,side*.32);
      part('lobe',side*.68,1.17,.45,.077,.077,.034,0x254b5a);
      for(let j=0;j<4;j++)part('lobe',side*(.71+.13*(j%2)),.42+.34*(j>>1),.88,.028,.028,.019,0xa2bbb4);
    }
    blockers.push({x,z,r:1.30*s,top:base+2*s});
  }
  function etchedFishStone(x,z,s){
    // Relief fish spines appear on the pale shelves in maps 20, 21 and 22.
    const base=groundY(x,z),tint=0x535461;
    stamp('rock',x,base+.97*s,z,1.38*s,1.17*s,.60*s,0xb6b8af,0,0,-.11);
    stamp('rock',x,base+1.02*s,z+.54*s,1.09*s,.64*s,.10*s,0xb8b7ae);
    const line=(a,b,c,d)=>rod(x+a*s,base+b*s,z+.64*s,x+c*s,base+d*s,z+.64*s,.045*s,tint);
    line(-.78,.83,.43,1.33);line(.43,1.33,.79,1.35);line(.79,1.35,.52,1.06);line(.52,1.06,.43,1.33);
    line(-.78,.83,-.95,1.01);line(-.78,.83,-.84,.61);
    for(let k=0;k<3;k++){
      const a=-.46+k*.24,b=.96+k*.095;line(a,b,a-.18,b+.23);line(a,b,a-.11,b-.26);
    }
    blockers.push({x,z,r:1.10*s,top:base+2.04*s});
  }
  function grotto(x,z,scale,dark){
    const base=groundY(x,z);
    for(let i=0;i<9;i++){
      const a=Math.PI*(i/8),xx=x+6.2*scale*Math.cos(a),yy=base+7.5*scale*Math.sin(a);
      stamp('rock',xx,yy,z,2.45*scale,2.75*scale,2.4*scale,i%2?dark:0x51657a,-.17,.17,a-.8);
      if(i<2||i>6)blockers.push({x:xx,z,r:1.65*scale,top:yy+2.5*scale});
    }
    stamp('lobe',x,base+2.1*scale,z-2.9*scale,5.6*scale,4.4*scale,1.5*scale,0x1b3244);
    for(let j=-2;j<=2;j++)blockers.push({x:x+j*1.95*scale,z:z-3*scale,r:1.5*scale,top:base+4.5*scale});
    for(let j=0;j<3;j++)boulder(x+(j-1)*5.8*scale,z-5*scale,3.6*scale,4*scale,3.8*scale,dark);
  }
  const corridors=[[pad,origin],...sites.slice(1).map((s,i)=>[sites[i],s])];
  function corridorGap(x,z){
    let nearest=Infinity;
    for(const [a,b] of corridors){
      const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);
      nearest=Math.min(nearest,Math.hypot(x-a.x-t*dx,z-a.z-t*dz));
    }
    return nearest;
  }
  // Branching, open-tipped colonies, regional shelf rock and named set pieces are original meshes.
  for(const [i,site] of sites.entries()){
    const tones=[[0xb0a4b7,0x8186a5,0xccbdbd],[0x9994a1,0xd4d4ca,0x777187],
      [0x4d6d70,0x686682,0x618a85],[0x294c69,0x377290,0x526c9a]][i];
    for(let j=0;j<63;j++){
      const a=(j+random())*2.4,r=14+random()*57,x=site.x+Math.cos(a)*r,z=site.z+Math.sin(a)*r;
      if(Math.hypot(x-pad.x,z-pad.z)<pierRadius+4||Math.hypot(x,z)<11)continue;
      if(site.id==='ocean-sanctum'&&Math.abs(x-site.x)<22&&z>site.z-35&&z<site.z+2)continue;
      const t=random();
      if(t<.23){
        const w=2+random()*4,h=1.5+random()*4.1,d=2+random()*3;
        if(corridorGap(x,z)>w+4)boulder(x,z,w,h,d,tones[j%3]);
      }
      else if(t<.48&&i!==1)sponge(x,z,.7+random()*2.1,i===0?(j%2?0xce88bc:0xb96372):i===2?0x6aa88b:0x5684a2);
      else if(t<.68&&i<3)fan(x,z,.9+random()*2.8,i===0?0xdb699a:i===1?0x968297:0x88a786);
      else shell(x,z,.35+random());
    }
  }
  // Place the immediately recognisable landmarks in the visitor's forward field.
  sponge(-6,-10,2.25,0xdb87b5);sponge(-9,-12,1.55,0xb66f9d);fan(14,-8,3.7,0xc1587f);
  const outcropX=22,outcropZ=-8,creviceY=groundY(outcropX,outcropZ);
  boulder(-14,-20,6,4.3,4.7,0x818caf);boulder(outcropX,outcropZ,4,3.4,4.8,0xc6bfbc);
  stamp('lobe',outcropX,creviceY+1.52,outcropZ+3.1,1.52,.91,.45,0x454156);
  for(let i=0;i<6;i++){
    const t=i/6,u=(i+1)/6;
    rod(outcropX+.73*Math.sin(t*4),creviceY+1.45-.76*t,outcropZ+3.48+1.6*t,
      outcropX+.73*Math.sin(u*4),creviceY+1.45-.76*u,outcropZ+3.48+1.6*u,.23-.13*t,0xca899c);
  }
  for(let i=0;i<8;i++)stamp('tube',12+Math.sin(i*2.4)*2.1,groundY(12,4)-.17,4+Math.cos(i*2.4)*1.8,.58,1.18,.65,i%3?0x83c78d:0xb0de88);
  etchedFishStone(-9,7,1.45);
  const depths=sites[1],floor=sites[2],end=sites[3];
  careStation(depths.x+8,depths.z-11,2.0);
  etchedFishStone(depths.x+13,depths.z-17,1.80);
  // The map 21 skyline alternates pale overhangs and narrow teal fissures.
  // The taller limestone stays at the sides of the navigation and fish passages.
  for(const [i,[dx,dz,w,h]] of [[-19,-14,3.8,8.0],[-22,-26,4.2,11.8],[-8,-27,2.9,9.2],
    [3,-35,4.3,12.5],[17,-20,4.2,9.5],[25,-8,3.7,7.2]].entries()){
    const x=depths.x+dx,z=depths.z+dz,base=groundY(x,z),turn=dx*.10;
    if(corridorGap(x,z)<w+4)continue;
    const side=Math.sign(dx),overhang=i===1||i===4;
    stamp('rock',x,base+.61,z,w*1.12,1.85,w*.95,0x64737e,.04,turn);
    if(overhang){
      // An undercut shaft supports the off-centre pale ledge.
      stamp('rock',x,base+.54*h,z,w*.56,.67*h,w*.66,0x858995,.04,turn,-side*.17);
      stamp('rock',x+side*.28*w,base+1.01*h,z,w*.91,h*.14,w*.74,0x617782,-.04,turn,.13*side);
      stamp('rock',x+side*.43*w,base+1.16*h,z,w*1.10,h*.18,w*.84,0xd5d5cb,-.15,turn,.12*side);
      rod(x-side*.22*w,base+.39*h,z+.44*w,x+side*.04*w,base+.64*h,z+.51*w,.105,0x6ca6a0);
      rod(x+side*.04*w,base+.64*h,z+.51*w,x-side*.06*w,base+.71*h,z+.46*w,.080,0x8ebdaf);
    }else if(i===2||i===5){
      // Split bedding planes form a lower pair of diagonally exposed slabs.
      stamp('rock',x-side*.18*w,base+.37*h,z,w*.55,.49*h,w*.82,0x9b9ea5,.12,turn,side*.27);
      stamp('rock',x+side*.42*w,base+.54*h,z-.23*w,w*.41,.65*h,w*.61,0xb3b6b4,-.16,turn+.24,side*.19);
      stamp('rock',x+side*.56*w,base+.98*h,z-.27*w,w*.38,.17*h,w*.62,0xcfd1c8,-.14,turn+.21,side*.33);
    }else{
      // The receding outer wall exposes a tilted succession of wide beds.
      stamp('rock',x,base+.39*h,z,w*1.12,.54*h,w*.91,0x7f8792,-.09,turn,side*.20);
      stamp('rock',x+side*.32*w,base+.77*h,z-.50*w,w*.98,.34*h,w*1.06,0xb5b5b5,-.04,turn+.12,side*.15);
      stamp('rock',x+side*.61*w,base+1.01*h,z-.76*w,w*.79,.18*h,w*.92,0xd2d1c7,.11,turn,side*.19);
    }
    blockers.push({x,z,r:w*.83,top:base+1.42*h});
  }
  for(let i=0;i<13;i++){
    const x=depths.x-10+(i%4)*.67,z=depths.z-8+Math.floor(i/4)*.74,h=1.75+random()*1.45;
    stamp('crystal',x,groundY(x,z)+h*.45,z,.49,h,.58,i%3?0xe8ba48:0xffdf7c,.10,.13,i*.09-.48);
  }
  blockers.push({x:depths.x-9,z:depths.z-7,r:1.65,top:groundY(depths.x-9,depths.z-7)+4.4});
  grotto(floor.x,floor.z-16,1,0x525269);
  for(let j=0;j<13;j++){
    const side=j%2?1:-1,x=floor.x+side*(4.2+.29*(j%3)),z=floor.z-16+(j%5)*.45;
    const y=groundY(x,z),r=.19+.07*(j%4);
    stamp('barnacle',x,y+.03,z,r,.71*r,r,0x88a7a2,0,j*.83);
  }
  etchedFishStone(floor.x-10,floor.z-5,1.62);
  for(const side of [-1,1]){
    const x=floor.x+side*6.4,z=floor.z-15.8,y=groundY(x,z);
    stamp('rock',x,y+.12,z,2.2,.54,2.40,0x4f7078,0,.6*side);
    stamp('rock',x,y+.54,z-.38,1.87,.24,2.03,0x789891,0,.6*side);
    shell(x+side*2.4,z+2.8,1.65);
  }
  {
    const x=end.x+1,z=end.z-21,y=groundY(x,z);
    for(const side of [-1,1]){
      const s=side===1?1.08:.93,az=side===1?-.045:Math.PI-.14;
      stamp('sanctumSpan',x,y,z,s,s,s,side===1?0x40799b:0x3b7396,0,az);
      const xx=x+s*(16.85*Math.cos(az)-.84*Math.sin(az)),zz=z+s*(-16.85*Math.sin(az)-.84*Math.cos(az));
      const base=groundY(xx,zz);
      stamp('sanctumSpur',xx,base-.26,zz,2.65,6.4,2.82,0x315674,0,az);
      stamp('sanctumSpur',xx-side*1.40,base-.25,zz+1.68,1.64,8.05,2.04,0x417991,0,az-.65,side*.24);
      blockers.push({x:xx,z:zz,r:2.49,top:base+7.4});
      // Deep-blue blades recede beyond the windows, leaving both sills clear.
      for(let j=0;j<7;j++){
        const bx=x+side*(5.3+3.1*j),bz=z-15.7-3.63*Math.sin(j*1.37+side);
        const g=groundY(bx,bz),h=4.3+3.6*(.5+.5*Math.sin(2.15*j+.41));
        stamp('sanctumSpur',bx,g-.24,bz,2.45,h,2.36,j%2?0x396b86:0x385b80,0,az,side*(.20+.11*Math.sin(j)));
        blockers.push({x:bx,z:bz,r:1.47,top:g+h});
      }
    }
    stamp('sanctumSpur',x,y-.21,z,2.50,8.75,2.48,0x467074,0,.37);
    stamp('sanctumTablet',x,y,z+1.31,1,1,1,0x397677);
    for(let j=0;j<5;j++){
      stamp('jadePlate',x+.13*j-.28,y+2.17+1.09*j,z+2.65,1.32-.078*j,1.14,1,0x9bdfc9,0,0,-.18+.048*j);
    }
    blockers.push({x,z,r:2.48,top:y+13.5},{x,z:z+1.45,r:1.53,top:y+8.45});
    // Left foreground of map 737: a partly buried spoked rim against the broken, green-lit casing.
    const wx=end.x-9.1,wz=end.z-5.6,base=groundY(wx,wz),wy=base+1.38;
    stamp('sanctumSpur',wx-.98,base-.21,wz-2.04,2.40,3.90,1.63,0x2a5362,0,-.45,.13);
    stamp('coupling',wx,wy,wz,2.14,2.14,.89,0x527c82,-.30,.19,.06);
    const wheel=new T.Object3D();wheel.position.set(wx,wy,wz);wheel.rotation.set(-.30,.19,.06);wheel.updateMatrix();
    const center=v(0,0,0).applyMatrix4(wheel.matrix);
    for(let i=0;i<7;i++){
      const a=i*tau/7,end=v(2.07*Math.cos(a),2.07*Math.sin(a),0).applyMatrix4(wheel.matrix);
      rod(center.x,center.y,center.z,end.x,end.y,end.z,.13,0x49717a,'rail');
      const lug=v(1.64*Math.cos(a),1.64*Math.sin(a),.09).applyMatrix4(wheel.matrix);
      stamp('hub',lug.x,lug.y,lug.z,.093,.091,.058,0x90ada3,-.30,.19,.06);
    }
    stamp('hub',wx,wy,wz,.39,.39,.24,0x5d8586);
    for(let j=0;j<4;j++)stamp('crystal',wx-.76+j*.32,base+2.25+.13*Math.sin(j),wz-1.02,.22,.48+.25*(j%2),.29,0x90ca82,0,0,.24*j-.26);
    blockers.push({x:wx-.35,z:wz-.65,r:2.17,top:wy+2.35});
  }
  for(const sign of [-1,1]){
    const x=end.x+sign*10,z=end.z-5.2;
    if(sign>0)sponge(x,z,2.10,0xbb7284);
    for(let j=0;j<4;j++)stamp('tube',x+sign*(2.7+j*.38),groundY(x,z),z+j*.30,.32,.78+j*.23,.34,j%2?0x8ed568:0xa8e28e);
  }
  // An over-water platform, landing stripe and descending access ramp share the support function.
  const pierY=pierLevel-(pad.x*pad.x+pad.z*pad.z)/(2*radius);
  stamp('deck',pad.x,pierY-.44,pad.z,pierRadius,.88,pierRadius,0x567982);
  stamp('deck',pad.x,pierY-.026,pad.z,pierRadius-.15,.052,pierRadius-.15,0x9caaa5);
  stamp('ring',pad.x,pierY+.04,pad.z,12.2,12.2,.20,0xf0db8f,Math.PI/2);
  for(const off of [-1,1])stamp('box',pad.x+off*2,pierY+.045,pad.z,.42,.06,5.8,0xede7b8);
  stamp('box',pad.x,pierY+.046,pad.z,4,.062,.46,0xede7b8);
  const railRadius=pierRadius-.45,face=Math.atan2(acrossZ,acrossX);
  let railLast=null;
  for(let i=0;i<=42;i++){
    const a=face+.116+(tau-.232)*i/42,x=pad.x+railRadius*Math.cos(a),z=pad.z+railRadius*Math.sin(a);
    rod(x,pierY,z,x,pierY+.84,z,.078,0x75888e,'rail');
    if(railLast)rod(...railLast,x,pierY+.84,z,.065,0xdfcb8f,'rail');
    railLast=[x,pierY+.84,z];
  }
  const rampStart=pierRadius-.2,rampEnd=pierDistance+.6,rampRun=rampEnd-rampStart,rampDrop=pierLevel-seaFloor(0,0);
  const rampMid=(rampStart+rampEnd)*.5;
  const rampOrientation=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(
    v(acrossZ,0,-acrossX),v(acrossX*rampDrop,rampRun,acrossZ*rampDrop).normalize(),
    v(acrossX*rampRun,-rampDrop,acrossZ*rampRun).normalize()));
  temp.position.set(pad.x+acrossX*rampMid,(pierLevel+seaFloor(0,0))*.5-.13,pad.z+acrossZ*rampMid);
  temp.quaternion.copy(rampOrientation);temp.scale.set(4.4,.23,Math.hypot(rampRun,rampDrop));temp.updateMatrix();record('panel',0x7696a0);
  for(const sign of [-1,1]){
    let last=null;
    for(let along=rampStart;along<rampEnd+.1;along+=rampRun/8){
      const x=pad.x+acrossX*along+acrossZ*2.04*sign,z=pad.z+acrossZ*along-acrossX*2.04*sign;
      const y=T.MathUtils.lerp(pierLevel,seaFloor(0,0),(along-rampStart)/rampRun);
      rod(x,y,z,x,y+1,z,.055,0x70868e,'rail');if(last)rod(...last,x,y+1,z,.062,0xffce74,'rail');
      last=[x,y+1,z];
    }
  }
  for(const [id,items] of entries){
    const {g,m}=shapes.get(id),batch=new T.InstancedMesh(g,m,items.length);
    for(const [i,it] of items.entries()){batch.setMatrixAt(i,it.matrix);batch.setColorAt(i,color(it.tint));}
    batch.instanceMatrix.needsUpdate=batch.instanceColor.needsUpdate=true;batch.receiveShadow=true;batch.castShadow=true;
    district.add(batch);
  }
  entries.clear();
  const lights=new T.BufferGeometry(),bubbleCount=196,bubbles=new Float32Array(bubbleCount*3),springFlags=new Float32Array(bubbleCount),rise=[];
  for(let i=0;i<bubbleCount;i++){
    const s=sites[i%4],spring=i%4===0&&i%3===0;
    const x=spring?12+random()*3-1.5:s.x+(random()-.5)*66,z=spring?4+random()*3-1.5:s.z+(random()-.5)*65;
    const y=groundY(x,z);
    springFlags[i]=spring?1:0;
    rise.push({x,z,y,h:Math.max(4,-y-.3),phase:random(),speed:.22+random()*.38});
  }
  const bubblesAttr=new T.BufferAttribute(bubbles,3);lights.setAttribute('position',bubblesAttr);
  lights.setAttribute('spring',new T.BufferAttribute(springFlags,1));
  const bubbleShade=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{},
    vertexShader:'attribute float spring;varying float d;varying float vent;void main(){vec4 p=modelViewMatrix*vec4(position,1.);d=-p.z;vent=spring;gl_Position=projectionMatrix*p;gl_PointSize=clamp((65.+300.*vent)/max(1.,d),1.,6.+16.*vent);}',
    fragmentShader:'varying float d;varying float vent;void main(){float z=length(gl_PointCoord-.5);if(z>.49)discard;float gleam=1.-smoothstep(.04,.13,length(gl_PointCoord-vec2(.36,.32)));float a=(.14+.62*smoothstep(.27,.46,z)+.28*gleam)*(1.-smoothstep(18.,85.,d));gl_FragColor=vec4(mix(vec3(.47,.89,.95),vec3(.64,.97,.55),vent)+.22*gleam,a);}'});
  const particulate=new T.Points(lights,bubbleShade);particulate.frustumCulled=false;district.add(particulate);
  // A camera-centred spherical patch resolves metre-scale walking and joins the orbital shell.
  const patchReach=radius*.57;
  const radii=[0,1.4,3,5,7,10,14,19,26,34,46,62,86,120,174,260,420,720,1400,3500,5800,8500,12400,17800].filter(r=>r<patchReach);
  radii.push(patchReach);
  const sectors=96,coords=[[0,0,0]],indices=[];
  for(let j=1;j<radii.length;j++)for(let i=0;i<sectors;i++){
    const a=tau*i/sectors,n=coords.length,next=1+(j-1)*sectors+(i+1)%sectors;
    coords.push([Math.cos(a),Math.sin(a),j]);
    if(j===1)indices.push(0,next,n);else indices.push(n-sectors,next,n,next-sectors,next,n-sectors);
  }
  const groundGeo=new T.BufferGeometry(),seaGeo=new T.BufferGeometry();
  groundGeo.setIndex(indices);seaGeo.setIndex(groundGeo.index);
  const chartUV=new T.BufferAttribute(new Float32Array(coords.length*2),2);
  for(const g of [groundGeo,seaGeo]){
    g.setAttribute('position',new T.BufferAttribute(new Float32Array(coords.length*3),3));
    g.setAttribute('uv',chartUV);
  }
  groundGeo.setAttribute('color',new T.BufferAttribute(new Float32Array(coords.length*3),3));
  const waterColumn=new T.BufferAttribute(new Float32Array(coords.length),1);
  seaGeo.setAttribute('waterColumn',waterColumn);
  const sandMat=new T.MeshStandardMaterial({vertexColors:true,roughness:.92});
  sandMat.onBeforeCompile=s=>{
    s.uniforms.tideTime=tideTime;
    s.vertexShader='varying vec2 floorUV;varying float depthBelow;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloorUV=uv;depthBelow=-position.y;');
    s.fragmentShader='uniform float tideTime;varying vec2 floorUV;varying float depthBelow;\n'+waterLightGLSL+s.fragmentShader.replace('#include <color_fragment>',
      `#include <color_fragment>
      float ripple=sin(floorUV.x*3.+sin(floorUV.y*1.14)+floorUV.y*.75);
      float sunWater=1.-smoothstep(5.,47.,depthBelow);
      float gleam=reefLight(floorUV-.18*depthBelow,depthBelow,tideTime);
      float pixel=length(fwidth(floorUV));
      vec2 grainCell=floorUV*17.;
      vec2 tile=floor(grainCell);
      float grain=fract(sin(dot(tile,vec2(17.31,78.17)))*4375.7);
      vec2 center=vec2(.30+.40*grain,.34+.30*fract(grain*11.3));
      float fleck=(1.-smoothstep(.08,.27,length(fract(grainCell)-center)))*(grain-.49);
      float grit=1.-smoothstep(.008,.060,pixel);
      float bed=.035*sin(floorUV.x*13.+floorUV.y*2.+2.*sin(floorUV.y*1.2));
      diffuseColor.rgb*=1.+.07*ripple/(1.+.04*pixel)+grit*(.19*fleck+sunWater*bed);
      diffuseColor.rgb*=vec3(1.)+vec3(.25,.39,.39)*gleam;`);
  };
  sandMat.defines={USE_UV:''};sandMat.extensions={derivatives:true};
  const writeBed=finishSurveyGround(T,groundGeo,sandMat,OCEAN_WORLD,1);
  const seabed=new T.Mesh(groundGeo,sandMat);seabed.frustumCulled=false;seabed.receiveShadow=true;
  const seaUniforms=Object.assign(T.UniformsUtils.clone(T.UniformsLib.lights),{uTime:tideTime,seaRadius:{value:radius}});
  const seaMat=new T.ShaderMaterial({uniforms:seaUniforms,lights:true,extensions:{derivatives:true},
    side:T.DoubleSide,transparent:true,depthWrite:false,
    vertexShader:`attribute float waterColumn;uniform float seaRadius;
      varying vec3 waterChart,seaEye,seaUp;
      void main(){
        waterChart=vec3(uv,waterColumn);
        seaUp=normalMatrix*normalize(position+vec3(0.,seaRadius,0.));
        vec4 mv=modelViewMatrix*vec4(position,1.);seaEye=-mv.xyz;
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader:`varying vec3 waterChart,seaEye,seaUp;uniform float uTime;
      #if NUM_DIR_LIGHTS > 0
        struct DirectionalLight {vec3 direction;vec3 color;};
        uniform DirectionalLight directionalLights[NUM_DIR_LIGHTS];
      #endif
      void main(){
      vec2 uvM=waterChart.xy;
      float swell=dot(uvM,vec2(.41,.83))+uTime*.87;
      float crossSea=dot(uvM,vec2(.92,-.34))-uTime*.69;
      float fine=dot(uvM,vec2(4.6,2.7))+.9*sin(swell)+uTime*1.7;
      vec2 slope=.16*vec2(.41,.83)*cos(swell)*(1.-smoothstep(.6,2.8,fwidth(swell)))
                +.08*vec2(.92,-.34)*cos(crossSea)*(1.-smoothstep(.6,2.8,fwidth(crossSea)))
                +.013*(vec2(4.6,2.7)+.9*cos(swell)*vec2(.41,.83))*cos(fine)*(1.-smoothstep(.6,2.8,fwidth(fine)));
      vec3 n=normalize(seaUp),dx=dFdx(-seaEye),dy=dFdy(-seaEye);
      vec3 rx=cross(dy,n),ry=cross(n,dx);float det=dot(dx,rx);
      n=normalize(max(abs(det),1.e-7)*n-sign(det)*(dot(slope,dFdx(uvM))*rx+dot(slope,dFdy(uvM))*ry));
      vec3 eye=normalize(seaEye);float nv=clamp(abs(dot(n,eye)),0.,1.);
      float fresnel=.02+.98*pow(1.-nv,5.);
      float path=min(100.,waterChart.z/max(.33,nv));
      float depthTint=1.-exp(-.038*path);
      vec3 c=mix(vec3(.15,.48,.55),vec3(.07,.23,.40),depthTint);
      float opacity=.26+.47*depthTint;
      if(gl_FrontFacing){
        c=mix(c,vec3(.38,.59,.72),fresnel);
        opacity=mix(opacity,.98,fresnel);
        #if NUM_DIR_LIGHTS > 0
          vec3 halfRay=directionalLights[0].direction+eye;
          float highlight=pow(max(0.,dot(n,halfRay)/max(.001,length(halfRay))),65.);
          c+=directionalLights[0].color*highlight*.58*max(0.,dot(n,directionalLights[0].direction));
        #endif
      }else{
        // Underwater, the sky occupies Snell's window. Grazing rays reflect the water column.
        float window=smoothstep(.61,.72,nv);
        c=mix(vec3(.07,.27,.33),vec3(.32,.65,.71),window);
        opacity=mix(.78,.24,window);
      }
      gl_FragColor=vec4(c,opacity);
      #include <tonemapping_fragment>
      #include <encodings_fragment>
    }`});
  const water=new T.Mesh(seaGeo,seaMat);water.frustumCulled=false;water.renderOrder=3;terrain.add(seabed,water);
  const shallowsColor=color(0xccbf8e),deepColor=color(0xadaab4),floorColor=color(0x597d7b),abyssColor=color(0x3b657b);
  function placePatch(lat,lon){
    const f=frame(lat,lon);terrain.position.copy(f.up).multiplyScalar(radius);terrain.quaternion.copy(f.quaternion);
    const gp=groundGeo.attributes.position,wp=seaGeo.attributes.position,gc=groundGeo.attributes.color;
    const tone=new T.Color();
    for(const [i,[dx,dz,j]] of coords.entries()){
      const range=radii[j],ang=range/radius,cs=Math.cos(ang),ss=Math.sin(ang);
      const ll=move(lat,lon,dx*range,-dz*range),{x,z}=chart(ll.lat,ll.lon),h=seaFloor(x,z),r=radius+h;
      gp.setXYZ(i,dx*ss*r,cs*r-radius,dz*ss*r);wp.setXYZ(i,dx*ss*radius,cs*radius-radius,dz*ss*radius);
      chartUV.setXY(i,x,z);
      waterColumn.setX(i,Math.max(0,-h));
      writeBed(i,x,z);
      tone.copy(shallowsColor).lerp(deepColor,smooth(-h,10,28)).lerp(floorColor,smooth(-h,31,49)).lerp(abyssColor,smooth(-h,50,65));
      tone.multiplyScalar(.98+.07*Math.sin(x*.34+z*.12));gc.setXYZ(i,tone.r,tone.g,tone.b);
    }
    for(const attr of [gp,wp,chartUV,gc,waterColumn])attr.needsUpdate=true;
    groundGeo.computeVertexNormals();capCenter.value.copy(f.up);cut.value=Math.cos(.95*patchReach/radius);
  }
  function canSwim(lat,lon,margin=.4){
    const {x,z}=chart(lat,lon);
    return blockers.every(b=>Math.hypot(x-b.x,z-b.z)>b.r+margin);
  }
  function walk(lat,lon,east,north){
    const at=move(lat,lon,east,north),p=chart(at.lat,at.lon);
    const dx=p.x-pad.x,dz=p.z-pad.z,dist=Math.hypot(dx,dz);
    if(dist>0&&Math.abs(dist-railRadius)<=.38+Math.hypot(east,north)&&
        (dx*acrossX+dz*acrossZ<0||Math.abs(dx*acrossZ-dz*acrossX)>2.02)){
      const old=chart(lat,lon),side=Math.hypot(old.x-pad.x,old.z-pad.z)<railRadius?-1:1;
      if(side*(dist-railRadius)<.38){const edge=railRadius+side*.38;p.x=pad.x+dx*edge/dist;p.z=pad.z+dz*edge/dist;}
    }
    for(const b of blockers){
      const dx=p.x-b.x,dz=p.z-b.z,d=Math.hypot(dx,dz),r=b.r+.28;
      if(d<r){p.x=b.x+(d?dx/d:1)*r;p.z=b.z+(d?dz/d:0)*r;}
    }
    ecology.clearWalker(p,.28);
    return fromXZ(p.x,p.z);
  }
  function landingInfo(lat,lon,footprint=12){
    const {x,z}=chart(lat,lon),onPier=Math.hypot(x-pad.x,z-pad.z)+footprint<=pierRadius;
    const h=support(x,z),top=Math.max(0,h);
    return {ok:onPier,height:h,top,slope:0,water:!onPier,obstacle:false,
      reason:onPier?'':'下方是海水，请返回浅海登陆平台'};
  }
  function clipCamera(aim,eye){
    // Clip the third-person boom at the near edge of any reef its line crosses.
    const here=aim.clone().sub(anchor),sight=eye.clone().sub(aim),x=here.dot(fixedFrame.east),z=here.dot(fixedFrame.south);
    const y=here.dot(fixedFrame.up),dx=sight.dot(fixedFrame.east),dz=sight.dot(fixedFrame.south),dy=sight.dot(fixedFrame.up);
    const length2=dx*dx+dz*dz;if(length2<.001)return;
    let limit=1;
    for(const b of blockers){
      const rx=x-b.x,rz=z-b.z,t=-(rx*dx+rz*dz)/length2,r=b.r+.24;
      if(t<0||t>1+r/Math.sqrt(length2))continue;
      const chord2=r*r-(rx+t*dx)**2-(rz+t*dz)**2;
      if(chord2<=0)continue;
      const entry=Math.max(.06,t-Math.sqrt(chord2/length2)-.035);
      if(entry<limit&&y+dy*entry<=b.top+.18)limit=entry;
    }
    if(limit<1)eye.copy(aim).addScaledVector(sight,limit);
  }
  let mode='hidden',elapsed=0,last=null;
  const body={root,sites,radius,landingSites,landingSite:id=>id===pad.id?pad:null,frame,chart,height,point,move,siteAt,walk,canSwim,clipCamera,
    resolveArrival:(lat,lon)=>walk(lat,lon,0,0),groundCorrection:()=>0,waterDepth:(lat,lon)=>Math.max(0,-height(lat,lon)),
    landingInfo,flightHeight:(lat,lon,footprint=0)=>{
      const {x,z}=chart(lat,lon);
      return Math.hypot(x-pad.x,z-pad.z)<=pierRadius+footprint?pierLevel:Math.max(0,support(x,z));
    },setMode,update,dispose,forestBossPosition:()=>null,nearestPipi:()=>null,setSafariState(){},
    safariAction:()=>null,safariWalk:()=>null,safariHint:()=>'',interactSpiritSite:()=>'',
    spiritSiteHint:(lat,lon)=>height(lat,lon)>.4?'浅海登陆平台 · 沿西南侧黄色护栏斜坡步行下水':
      ecology.hint(lat,lon)||siteAt(lat,lon)?.description||'沿海床探访各处栖息地。',
    nearbySpirit:(lat,lon)=>ecology.nearbySpirit(lat,lon),spiritObservation:(lat,lon,key)=>ecology.spiritObservation(lat,lon,key),
    pickSpirit:(caster,lat,lon)=>ecology.pickSpirit(caster,lat,lon),withdrawSpirit:key=>ecology.withdrawSpirit(key)};
  const ecology=createOceanEcology(T,fauna,OCEAN_WORLD,body);
  function setMode(next){
    if(next!==mode)last=null;mode=next;root.visible=next!=='hidden';if(next==='hidden')return;
    globe.visible=true;terrain.visible=district.visible=fauna.visible=false;cut.value=2;
  }
  function update(lat,lon,dt=0,altitude=0,shuttleStatus=null){
    if(mode==='hidden')return;
    const near=mode==='surface'||(mode==='flight'&&altitude<radius*.19);
    terrain.visible=near;fauna.visible=near&&mode==='surface';
    const c=chart(lat,lon);district.visible=near&&altitude<1250&&Math.hypot(c.x+80,c.z-60)<2700;
    if(!near){last=null;cut.value=2;return;}
    if(!last||Math.hypot(c.x-last.x,c.z-last.z)>Math.min(1800,4+altitude*.18)){placePatch(lat,lon);last=c;}
    elapsed+=dt;tideTime.value=elapsed;
    if(district.visible)for(const [i,p] of rise.entries()){
      const y=p.y+.18+p.h*((p.phase+elapsed*p.speed/p.h)%1);
      bubblesAttr.setXYZ(i,p.x+.14*Math.sin(1.8*y+p.phase),y,p.z+.16*Math.cos(.7*y));
    }
    bubblesAttr.needsUpdate=district.visible;
    ecology.update(lat,lon,dt,mode==='surface',shuttleStatus);
  }
  function dispose(){
    ecology.dispose();const geometry=new Set(),materials=new Set();
    root.traverse(obj=>{if(obj.geometry)geometry.add(obj.geometry);if(obj.material)materials.add(obj.material);if(obj.isInstancedMesh)obj.dispose?.();});
    for(const {g,m} of shapes.values()){geometry.add(g);materials.add(m);}
    for(const g of geometry)g.dispose();
    for(const m of materials){m.map?.dispose();m.dispose();}world.remove(root);
  }
  setMode('hidden');return body;
}
