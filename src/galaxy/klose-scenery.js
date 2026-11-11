// All scenery is authored geometry. Sites share one tangent chart and leave
// the original map connections open. The historic hunting rooms share a biome.
function createKloseScenery(T, parent, surface) {
  const {sites,pools,height,frame,move,point,chart,trail,radius,padClear,groundCorrection}=surface;
  const color=hex=>new T.Color(hex).convertSRGBToLinear();
  const shapes=new Map(),tau=Math.PI*2;
  const rough=new T.MeshStandardMaterial({color:0xffffff,roughness:.84,side:T.DoubleSide});
  const gloss=new T.MeshStandardMaterial({color:0xffffff,roughness:.31,metalness:.08,side:T.DoubleSide});
  const luminous=new T.MeshBasicMaterial({color:0xffffff,side:T.DoubleSide});
  function shape(name,geo,material=rough) {shapes.set(name,{geo,material});}
  shape('round',new T.SphereGeometry(1,12,9));
  shape('rock',new T.IcosahedronGeometry(1,1));
  shape('boulder',new T.DodecahedronGeometry(1,0));
  shape('facet',new T.CylinderGeometry(.65,1,1,7,1));
  shape('cane',new T.CylinderGeometry(.79,1,1,9,2));
  shape('twig',new T.CylinderGeometry(.62,1,1,7,1));
  shape('rim',new T.TorusGeometry(1,.10,8,40));
  const poolShape=new T.SphereGeometry(1,48,16);
  shape('mud',poolShape,rough);
  shape('pool',poolShape,new T.MeshStandardMaterial({color:0xffffff,roughness:.48,metalness:0}));
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
  shape('energyPool',energyPool,new T.MeshStandardMaterial({vertexColors:true,roughness:.44,
    emissive:color('#168a93'),emissiveIntensity:.35}));
  shape('lamp',new T.SphereGeometry(1,14,9),luminous);
  // A keeled leaf has its own bent midrib, so both moonlight and sunlight
  // reveal the blade, even without alpha textures.
  function leafGeometry() {
    const p=[],index=[];
    for (let j=0;j<=6;j++) {
      const f=j/6,w=(.025+Math.sin(Math.PI*f)**.8)*.21;
      p.push(-w,.56*Math.sin(f*Math.PI*.9)+.12*f,f,0,.67*Math.sin(f*Math.PI*.9)+.12*f,f,w,.56*Math.sin(f*Math.PI*.9)+.12*f,f);
      if (j) {const a=3*(j-1);index.push(a,a+3,a+1,a+1,a+3,a+4,a+1,a+4,a+2,a+2,a+4,a+5);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(index);g.computeVertexNormals();return g;
  }
  shape('leaf',leafGeometry());
  const mushroomProfile=[[.02,.025],[.49,.02],[.88,.075],[1,.16],[.95,.32],[.78,.52],[.48,.69],[.12,.77],[0,.77]];
  shape('cap',new T.LatheGeometry(mushroomProfile.map(([x,y])=>new T.Vector2(x,y)),32));
  const crystalShape=new T.LatheGeometry([[.04,-.04],[.29,0],[.36,.16],[.31,.72],[0,1]].map(([x,y])=>new T.Vector2(x,y)),6);
  shape('crystal',crystalShape,gloss);
  shape('coreCrystal',crystalShape,new T.MeshStandardMaterial({flatShading:true,roughness:.39,
    metalness:.09,emissive:color('#09665d'),emissiveIntensity:.32}));
  const colored=new T.MeshStandardMaterial({vertexColors:true,roughness:.8,side:T.DoubleSide});
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
  shape('sod',sodGeometry(),colored);
  const distantShapes={round:new T.SphereGeometry(1,8,5),rock:new T.IcosahedronGeometry(1,0),
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
  const lerp=(a,b,t)=>a+(b-a)*t;
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
      return Math.hypot(x,z)<8+pad || padClear(site.x+x,site.z+z,pad) || trail(site.x+x,site.z+z)<3+pad ||
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
        stamp('rock',end.x,end.y,end.z,s*.72,s*.32,s*.65,choose(crown),seed()*.22,a);
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
      const y=yAt(x,z),palette=amber?['#f7b51a','#ffe16a','#c97f19']:['#029a8d','#2aabb1','#157663','#4edfb3'];
      for(let k=0;k<8;k++) {
        const a=tau*k/8,l=(.45+seed()*.7)*s;
        stamp(amber?'crystal':'coreCrystal',x+.32*s*Math.cos(a),y-.12*s,z+.32*s*Math.sin(a),l,l*1.33,l,
          choose(palette),-.42*Math.sin(a),a,.37*Math.cos(a));
      }
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
      for(const [x,z,s] of [[-8,-11,2.2],[-11,-9,1.1],[-10,-14,1.7]]) {
        stones(x,z,s*1.1,'#a77860');crystals(x+.27*s,z+.78*s,s*.93,true);
      }
      for(const [x,z,s] of [[6,-14,2.3],[9,-13,1.65],[10,-17,2.8],[-11,5,2.6]])
        curled(x,yAt(x,z),z,s,.4,'#f474a7',openGround.grassland.fruit);
      // Blue turf in scalloped beds gives the upper terraces and the landing
      // clearing different silhouettes. The orange walking lanes stay visible.
      for(const [x,z,sx,sz] of [[-8,-12,5.4,5.1],[-10,-5,4.3,2.8],[8,-13,5.2,6.3],[8,-6,3.4,3.1],[13,2,7,4.6],[-8,2.5,3.6,2.2],[-15,-21,9,7],[14,-22,10,7]]) {
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
      for(let i=0;i<26;i++) {
        const x=lerp(-21,23,i/25),z=-23+3*Math.sin(.18*x);
        if(blocked(x,z,2))continue;
        const leaves=x>8?meadowLeaves:azureLeaves;
        roughLedge(x,z,1.8+.55*seed(),openGround.grassland.rock,.32);
        stamp('sod',x,yAt(x,z)+1.42,z-.95,2.8,1.3,3.35,choose(leaves),.02,.1);
        if(i%2===0)leafFan(x+.24,yAt(x,z)+1.78,z-.7,.8,leaves,7);
      }
    }
    if(site.id==='swamp') {
      // Root buttresses arch over the branch leading down to the vine passage.
      for(const [x,z,r] of [[5,14,1],[-6,24,.8],[-7,-23,.9]]) {
        const g=yAt(x,z),pts=[v(x-5*r,g,z),v(x-3.8*r,g+2.8*r,z-.4),v(x-.9*r,g+4.3*r,z-.3),v(x+2.6*r,g+3.5*r,z),v(x+5*r,g,z+.4)];
        tendril(pts,.69*r,'#a58c53',true);
        obstacle(x-5*r,z,.6*r);obstacle(x+5*r,z,.5*r);
      }
    }
    if(site.id==='forest') {
      for(let i=0;i<6;i++) {
        const x=-14-seed()*5,z=-11+4*i,y=yAt(x,z),s=3.8+seed();
        stamp('boulder',x,y+.48*s,z,s,s*.72,s*1.2,'#cdad84',0,seed());
        obstacle(x,z,s*.79);
        for(let j=0;j<7;j++) {
          const a=tau*j/7;
          stamp('round',x+.72*s*Math.cos(a),y+s*1.02,z+.7*s*Math.sin(a),s*.16,s*.037,s*.25,'#432f28',0,a);
        }
      }
      for(let i=0;i<18;i++){const a=seed()*tau,r=3+seed()*5;spore(7+r*Math.cos(a),-11+r*Math.sin(a),.29+.43*seed(),'#baa283','#a97d5e');}
      for(const [x,z] of [[-11,-7],[12,-15],[17,8],[-18,10]]) {
        for(let j=0;j<4;j++) {
          const dx=x+j*.43;const g=yAt(dx,z);
          tendril([v(dx+.3,g+12,z),v(dx-.3,g+7.1,z+.4),v(dx,g+.2,z)],.14,j%2?'#777c34':'#9d9d37');
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
        for(const side of [-1,1]) {
          const xx=x+side*w;stones(xx,z,2.5,'#87715c');
          leafFan(xx,g+1,z,1.4,['#465688','#6c509d','#9a72be'],8);
        }
        const edge=x+w-2.7;
        tendril([v(edge,g+2,z-3.7),v(edge-.5,g+1.3,z),v(edge+.35,g+1.8,z+3.7)],.36,rootColor);
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
      const light=new T.PointLight(0x47dee2,1.05,13);light.position.set(8,floor+4,-15);near.add(light);
      const fill=new T.PointLight(0xffddb3,.92,42);fill.position.set(-1,floor+7,-2);near.add(fill);
    }
    if(site.id==='flame') {
      for(const [x,z,s] of [[-9,-12,4.6],[10,-13,4.2],[14,-6,3.2]])tree(x,z,s);
      const g=yAt(-14,-4);
      tendril([v(-21,g-1,-5),v(-20,g+4,-5),v(-17,g+5.4,-5),v(-13,g+5.2,-5),v(-11,g+3,-5),v(-10,g,-5)],1.6,'#814432',true);
    }
    if(site.id==='sanctuary') {
      const x=0,z=-14,g=yAt(x,z);
      for(const [r,h,shade] of [[5,.4,'#985b46'],[4.5,.7,'#c18a62'],[4,.92,'#f0c479']]) stamp('facet',x,g+h*.48,z,r,h,r,shade,0,.19);
      stamp('rim',x,g+.96,z,3.25,3.25,.47,'#ffe4a1',Math.PI/2);
      obstacle(x,z,4.25);
      for(const [px,pz,s] of [[-7,-15,3.7],[7,-16,3.1],[-8,-21,2.5],[9,-23,4.1]]) {
        const y=yAt(px,pz);stamp('boulder',px,y+s*.57,pz,s*.34,s,s*.31,'#a77861',.16,.26,-.18);
        stamp('facet',px-.05,y+s*.67,pz+.21,s*.24,s*1.5,s*.20,'#e6b792',.16,.26,-.18);
        obstacle(px,pz,s*.26);
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
      for(const item of items){
        bounds.copy(geo.boundingBox).applyMatrix4(item.matrix);
        if(bounds.max.x<-22||bounds.min.x>22||bounds.max.z<-22||bounds.min.z>22)continue;
        const cx=(bounds.min.x+bounds.max.x)*.5,cz=(bounds.min.z+bounds.max.z)*.5;
        const underside=bounds.min.y-yAt(cx,cz);
        if(underside>1.80)continue;
        const box={left:bounds.min.x,right:bounds.max.x,back:bounds.min.z,front:bounds.max.z,underside};
        for(let ix=Math.floor(box.left-1.1);ix<=Math.floor(box.right+1.1);ix++)
          for(let iz=Math.floor(box.back-1.1);iz<=Math.floor(box.front+1.1);iz++){
            const cell=ix*256+iz;
            if(!birdCover.has(cell))birdCover.set(cell,[]);
            birdCover.get(cell).push(box);
          }
      }
      if(!['pool','energyPool','mud','lamp','sod','leaf'].includes(key)){
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
        const pet={...createKloseSpiritModel(T,10),id:'grassland-pipi-'+(index+1),x,z,homeX:x,homeZ:z,yAt,site,near,cover:birdCover,cooldown:0,
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
    if(Math.hypot(x,z)<1.05)return false;
    const boxes=pet.cover.get(Math.floor(x)*256+Math.floor(z));
    if(boxes)for(const b of boxes){
      if(b.underside>.62)continue;
      const dx=Math.max(0,b.left-x,x-b.right),dz=Math.max(0,b.back-z,z-b.front);
      if(dx*dx+dz*dz<.30*.30)return false;
    }
    function clears(cx,cz,limit){
      const distance=Math.hypot(x-cx,z-cz);
      // A visitor or the descending hull can enter the avoidance margin:
      // allow the bird to move outwards while still inside that margin.
      return distance>=limit || (pet.at&&distance>Math.hypot(pet.x-cx,pet.z-cz)+1e-7);
    }
    if(walker&&!clears(walker.x,walker.z,.68))return false;
    if(shuttle&&!clears(shuttle.x,shuttle.z,9.3))return false;
    return pipi.every(other=>other===pet||other.cooldown||clears(other.x,other.z,.62)) &&
      wildlife.inhabitants.every(other=>other.site.id!=='grassland'||!other.root.visible||clears(other.x,other.z,other.radius+.30));
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
      lift:.045+.11*stride,duration:.20+.23*stride};
  }
  function update(lat,lon,dt,altitude=0,walking=false,shuttleStatus=null) {
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
      if(!pet.cooldown&&Math.hypot(x-pet.x,z-pet.z)<footprint+.3)
        top=Math.max(top,height(pet.at.lat,pet.at.lon)+.48);
    }
    for(const pet of wildlife.inhabitants){
      if(pet.root.visible&&Math.hypot(x-pet.site.x-pet.x,z-pet.site.z-pet.z)<footprint+pet.radius)
        top=Math.max(top,height(pet.at.lat,pet.at.lon)+pet.size);
    }
    return Math.max(top,safari.obstacleTop(x,z,footprint));
  }
  function nearestPipi(lat,lon,id) {
    const observer=chart(lat,lon);let closest=null,distance=Infinity;
    for(const pet of pipi) {
      if(pet.cooldown||!pet.near.visible||(id&&pet.id!==id))continue;
      const d=Math.hypot(observer.x-pet.x,observer.z-pet.z);
      if(d<distance){closest=pet;distance=d;}
    }
    return closest?{id:closest.id,key:closest.id,speciesId:10,name:'皮皮',siteId:'grassland',kind:'wild',level:1+(pipi.indexOf(closest)%2),size:.37,visible:true,distance,lat:closest.at.lat,lon:closest.at.lon,
      focusPoint:closest.animal.localToWorld(v(0,.166,.012))}:null;
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
      if(p.near.visible&&p.root.visible&&Math.hypot(viewer.x-p.site.x-p.x,viewer.z-p.site.z-p.z)<=22)roots.push(p.root);
    }
    const hit=raycaster.intersectObjects(roots,true)[0];
    if(!hit)return null;
    let node=hit.object;while(node&&!node.userData.kloseSpirit)node=node.parent;
    return node?spiritObservation(lat,lon,node.userData.kloseSpirit):null;
  }
  function walk(lat,lon,east,north) {
    const start=chart(lat,lon),end=move(lat,lon,east,north),dest=chart(end.lat,end.lon);
    const candidates=batches.filter(part=>Math.hypot(start.x-part.site.x,start.z-part.site.z)<111)
      .flatMap(part=>part.obstacles).concat(pipi.filter(p=>!p.cooldown).map(p=>({x:p.x,z:p.z,r:.30})),
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
