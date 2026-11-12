function createKloseBird(T,speciesId) {
    const shiny=speciesId===164;
    const color=hex=>new T.Color(hex).convertSRGBToLinear();
    const v=(x,y,z)=>new T.Vector3(x,y,z),tau=2*Math.PI;
    const round=new T.SphereGeometry(1,32,22);
    const animal=new T.Group(),body=new T.Group(),ears=[],feet=[],eyes=[];
    animal.add(body);animal.rotation.order='YXZ';
    const pink=shiny?'#faf9ef':'#f5b2ca',light=shiny?'#fffdeb':'#ffd3e1',tip=shiny?'#ebbc41':'#381b2a',cheek=shiny?'#e9929e':'#ff778f';
    const materials=new Map();
    function paint(hex) {
      if (!materials.has(hex)) materials.set(hex,new T.MeshStandardMaterial({color:color(hex),roughness:.61}));
      return materials.get(hex);
    }
    function oval(x,y,z,sx,sy,sz,hex) {
      const m=new T.Mesh(round,paint(hex));m.position.set(x,y,z);m.scale.set(sx,sy,sz);body.add(m);return m;
    }
    finishSpiritPart(oval(0,.098,0,.102,.076,.080,pink),'velvet',materials);
    const tail=finishSpiritPart(oval(0,.098,-.096,.048,.043,.052,light),'velvet',materials);tail.rotation.x=.42;
    // Face paint sits on the round head; cheeks must keep its contour in profile.
    function cheekPatch(side){
      const p=[],ix=[],rings=5,n=32;
      for(let j=0;j<=rings;j++)for(let k=0;k<n;k++){
        const u=j/rings,a=k*tau/n;
        const longitude=side*(.93+.52*u*Math.cos(a)),latitude=-.19+.34*u*Math.sin(a);
        p.push(.103*Math.sin(longitude)*Math.cos(latitude),.098+.077*Math.sin(latitude),
          .081*Math.cos(longitude)*Math.cos(latitude));
        if(j){const i=(j-1)*n+k,next=(j-1)*n+(k+1)%n;ix.push(i,next,i+n,next,next+n,i+n);}
      }
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));
      g.setIndex(ix);g.computeVertexNormals();const ink=paint(cheek);ink.side=T.DoubleSide;body.add(new T.Mesh(g,ink));
    }
    const span=18,steps=42;
    for (const side of [-1,1]) {
      const foot=oval(side*.063,.035,.036,.049,.035,.052,pink);foot.rotation.z=side*.17;
      animal.add(foot);feet.push(foot);
      cheekPatch(side);
      const eye=new T.Group();eye.position.set(side*.034,.121,.072);eye.rotation.y=side*.28;body.add(eye);eyes.push(eye);
      eye.add(finishSpiritPart(oval(0,0,0,.0109,.0179,.0058,'#29202a'),'iris',materials));
      eye.add(oval(-.002,.007,.007,.0048,.008,.0028,'#fff8fc'));
      eye.add(oval(.003,-.008,.007,.0026,.0028,.0017,'#bfabb5'));
      const ear=new T.Group();ear.position.set(side*.048,.147,-.003);body.add(ear);ears.push(ear);
      const curve=new T.CatmullRomCurve3([[0,0,0],[.014,.091,-.002],[.031,.169,-.007],
        [.066,.213,-.012],[.108,.219,-.014],[.151,.179,-.016],[.177,.103,-.013],
        [.187,.027,-.006],[.187,-.062,.004],[.182,-.103,.011]].map(([x,y,z])=>v(side*x,y,z)));
      const p=[],rgb=[],idx=[],base=color(pink),end=color(tip),glow=color(light),tone=new T.Color();
      for(let j=0;j<=steps;j++) {
        const t=j/steps,center=curve.getPoint(t),tangent=curve.getTangent(t);
        const lateral=v(-tangent.y,tangent.x,0).normalize();
        const rad=.018+.014*Math.sin(Math.PI*t)+.017*T.MathUtils.smoothstep(t,.58,.83);
        const taper=t>.89?Math.sqrt(Math.max(0,1-((t-.89)/.11)**2)):1;
        for(let k=0;k<span;k++) {
          const a=tau*k/span,offset=lateral.clone().multiplyScalar(rad*taper*Math.cos(a));
          p.push(center.x+offset.x,center.y+offset.y,center.z+.72*rad*taper*Math.sin(a));
          const darkTip=t>.66+.033*Math.cos(a);
          const ridge=Math.max(0,Math.cos(a-side*.42))**5;
          p[p.length-1]+=.0015*rad/.035*Math.sin(Math.PI*t)*Math.cos(3*a);
          tone.copy(darkTip?end:base).lerp(glow,ridge*(darkTip?.12:.22));
          rgb.push(tone.r,tone.g,tone.b);
          if(j) {const l=(j-1)*span+k,r=(j-1)*span+(k+1)%span;idx.push(l,r,l+span,r,r+span,l+span);}
        }
      }
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));
      geo.setAttribute('color',new T.Float32BufferAttribute(rgb,3));geo.setIndex(idx);geo.computeVertexNormals();
      const earFinish=spiritCoating(paint('#ffffff'),'velvet',materials);earFinish.vertexColors=true;earFinish.side=T.DoubleSide;
      ear.add(new T.Mesh(geo,earFinish));
    }
    // The sprite's tiny cyan mouth has a broad upper edge and a rounded downward point.
    const bill=round.clone(),bp=bill.attributes.position;
    for(let i=0;i<bp.count;i++){
      const y=bp.getY(i);
      bp.setXYZ(i,bp.getX(i)*(.68+.32*y),y+.16*(1-y*y),bp.getZ(i)*(1+.17*y));
    }
    bill.computeVertexNormals();
    const lip=new T.Mesh(bill,spiritCoating(paint(shiny?'#f29798':'#399ce6'),'horn',materials));lip.position.set(0,.084,.081);
    lip.scale.set(.031,.012,.013);body.add(lip);
    oval(0,.089,.087,.019,.004,.007,shiny?'#ffc7ce':'#7bd9ff');
    animal.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    animal.name=shiny?'164 · 闪光皮皮':'010 · 皮皮';
    let time=0;
    function blink(t){const aperture=.10+.90*Math.min(1,Math.abs((t%4.1)-3.3)/.096);for(const eye of eyes)eye.scale.y=aperture;}
    return {animal,root:animal,body,ears,feet,blink,update(dt){time+=dt;blink(time);body.scale.y=1+.015*Math.sin(3*time);ears.forEach((ear,i)=>{ear.rotation.z=(i?1:-1)*.045*Math.sin(time*3+i*.25);});},dispose(){disposeKloseModel(animal);}};
}

const KLOSE_SPECIMENS={
  10:['皮皮',.37],16:['仙人球',.47],27:['小豆芽',.49],46:['小蘑菇',.45],47:['蘑菇怪',1.35],83:['依依',.50],
  164:['闪光皮皮',.367],442:['闪光依依',.48],701:['西蒙',.52],821:['烈焰火狐',.42],2197:['闪光波斯蒂加',1.65],
  4690:['变异鳄兰',1.42],4693:['星光·蘑菇怪',1.45],4694:['石晶晶',.52]
};
function disposeKloseModel(root){
  const gs=new Set(),ms=new Set();
  root.traverse(o=>{
    if(o.geometry)gs.add(o.geometry);
    if(Array.isArray(o.material))o.material.forEach(m=>ms.add(m));
    else if(o.material)ms.add(o.material);
  });
  gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());
}
function createKloseSpiritModel(T,id){
  id=Number(id);
  if(!KLOSE_SPECIMENS[id])return createKloseSafariModel(T,id)||createSafariFigure(T,id);
  if(id===10||id===164)return createKloseBird(T,id);
  const root=new T.Group(),skeleton=new T.Group(),body=new T.Group();
  root.add(skeleton);skeleton.add(body);root.name=KLOSE_SPECIMENS[id][0];
  const colors=new Map(),shapes=new Map(),joints=[],tau=2*Math.PI;
  let mushroomEyes;
  const dark='#26212c',cream='#fff0c5',gold='#f1bd44';
  function geometry(key){
    if(!shapes.has(key)){
      const geo=key==='egg'?new T.SphereGeometry(1,24,16):key==='stone'?new T.IcosahedronGeometry(1,0):
        key==='gem'?new T.OctahedronGeometry(1):new T.ConeGeometry(1,1,8);
      shapes.set(key,geo);
    }
    return shapes.get(key);
  }
  function mesh(geo,pigment,at,size,group=body){
    if(!colors.has(pigment))colors.set(pigment,new T.MeshStandardMaterial({color:new T.Color(pigment).convertSRGBToLinear(),roughness:.64}));
    const m=new T.Mesh(geo,colors.get(pigment));m.position.set(...at);m.scale.set(...size);
    m.castShadow=m.receiveShadow=true;group.add(m);return m;
  }
  function oval(col,x,y,z,rx,ry,rz,group){return mesh(geometry('egg'),col,[x,y,z],[rx,ry,rz],group);}
  function gem(col,x,y,z,rx,ry,rz,group){return finishSpiritPart(mesh(geometry('gem'),col,[x,y,z],[rx,ry,rz],group),'gem',colors);}
  function joint(x,y,z,sway=0,axis='z',phase=0){
    const g=new T.Group();g.position.set(x,y,z);body.add(g);
    joints.push({g,sway,axis,phase});return g;
  }
  function spike(col,a,b,r,group){
    const dir=new T.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]),len=dir.length();
    const m=mesh(geometry('point'),col,a.map((v,i)=>(v+b[i])/2),[r,len,r],group);
    m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());return m;
  }
  // Each silhouette is lofted along its own curved centreline. The varying radii
  // preserve the contour of the petal, claw, ear, or tail instead of a rigid cone.
  function strand(col,pts,radii,group=body){
    const path=new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p))),steps=24,n=10,pos=[],idx=[];
    const frames=path.computeFrenetFrames(steps,false);
    for(let j=0;j<=steps;j++){
      const f=j/steps,center=path.getPointAt(f),q=f*(radii.length-1),k=Math.min(Math.floor(q),radii.length-2);
      const radius=T.MathUtils.lerp(radii[k],radii[k+1],q-k);
      for(let i=0;i<n;i++){
        const a=tau*i/n,v=center.clone().addScaledVector(frames.normals[j],Math.cos(a)*radius)
          .addScaledVector(frames.binormals[j],Math.sin(a)*radius);pos.push(v.x,v.y,v.z);
        if(j){const l=(j-1)*n+i,r=(j-1)*n+(i+1)%n;idx.push(l,r,l+n,r,r+n,l+n);}
      }
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
    return mesh(geo,col,[0,0,0],[1,1,1],group);
  }
  function eye(x,y,z,scale=1,group=body,pupil=dark){
    finishSpiritPart(oval(pupil,x,y,z,.047*scale,.071*scale,.032*scale,group),'iris',colors);
    oval('#fffbee',x-.008*scale,y+.020*scale,z+.028*scale,.013*scale,.017*scale,.008*scale,group);
  }
  function feet(col,width,z,rad=.095){
    for(const s of [-1,1])oval(col,s*width,rad*.67,z,rad,rad*.70,rad*1.1);
  }
  function cactus(){
    const green='#779d2a',shade='#527626';
    finishSpiritPart(oval(green,0,.57,0,.245,.35,.19),'cuticle',colors);
    for(const side of [-1,1]){
      const arm=joint(side*.13,.34,.12,.10,'x',side);
      strand(green,[[0,0,0],[side*.095,-.07,.03],[side*.04,-.10,.12],[-side*.05,-.10,.14]],[.060,.071,.063,.025],arm);
      for(let k=0;k<2;k++)spike('#efcb57',[-side*.035,-.097+.031*k,.125],[-side*(.084+.015*k),-.09+.035*k,.133],.016,arm);
      strand(green,[[side*.055,.29,0],[side*.052,.18,.01],[side*.022,.065,.02],[0,.012,.02]],[.058,.061,.030,.004]);
      eye(side*.085,.53,.171,.70);
    }
    strand('#526e22',[[-.045,.439,.177],[0,.455,.194],[.045,.435,.175]],[.009,.013,.005]);
    const brow=joint(0,.64,0,.045,'x');
    // #016 has one broad, folded cactus blade above the face, with a flattened
    // front and longitudinal ribs. A round tube obscured this distinctive hook.
    const crest=new T.Shape();crest.moveTo(.14,-.02);
    crest.bezierCurveTo(-.10,-.04,-.32,.08,-.29,.32);
    crest.bezierCurveTo(-.28,.48,-.23,.56,-.13,.55);
    crest.bezierCurveTo(-.03,.54,-.08,.39,-.105,.27);
    crest.bezierCurveTo(-.12,.19,-.04,.145,.085,.18);
    crest.bezierCurveTo(.22,.20,.27,.15,.255,.07);
    crest.bezierCurveTo(.23,-.015,.17,-.035,.14,-.02);
    const crestGeo=new T.ExtrudeGeometry(crest,{depth:.105,bevelEnabled:true,bevelSize:.032,bevelThickness:.027,bevelSegments:4,steps:1,curveSegments:20});
    finishSpiritPart(mesh(crestGeo,'#91b438',[0,0,.095],[1,1,1],brow),'petal',colors);
    for(const dx of [-.067,0,.067]){
      strand(shade,[[dx-.15,.52,.232],[dx-.22,.31,.232],[dx-.18,.12,.232],[dx+.06,.055,.232]],[.005,.007,.007,.003],brow);
    }
    for(let i=0;i<19;i++){
      const a=i*2.39996,y=.36+(i%5)*.10;const x=.22*Math.sin(a),z=.154*Math.cos(a);
      if(z>.10&&Math.abs(x)<.155)continue;
      spike('#f2cd58',[x,y,z],[x*1.38,y+.065,z*1.40],.030);
    }
    for(let j=0;j<3;j++)spike(gold,[-.17+.036*j,.54,.15],[-.23+.090*j,.65+.065*(j%2),.15],.028,brow);
    strand('#87a832',[[.08,.82,-.02],[.22,.75,.0],[.25,.58,.01],[.20,.38,.07]],[.072,.101,.082,.043]);
    strand(shade,[[.10,.86,.035],[.235,.76,.068],[.275,.57,.052],[.214,.39,.096]],[.005,.009,.007,.002]);
  }
  function sprout(){
    const yellow='#e5bb23';
    oval(yellow,0,.40,0,.225,.29,.165);oval('#fff9df',0,.34,.106,.185,.214,.075);
    feet(yellow,.110,.035);
    for(const s of [-1,1]){
      oval('#7971b2',s*.092,.443,.149,.047,.071,.029);
      eye(s*.092,.445,.164,.88,body,'#30264e');
      const g=joint(s*.174,.45,.01,.14,'z',s);
      const blade=finishSpiritPart(oval('#a7b73e',s*.064,-.109,0,.083,.187,.035,g),'petal',colors);blade.rotation.z=s*.38;
      strand('#73842e',[[0,.015,0],[s*.065,-.09,.032],[s*.095,-.21,.024],[s*.114,-.27,.002]],[.009,.009,.005,.001],g);
      for(let k=0;k<3;k++)strand('#919c33',[[s*.047,-.056-k*.055,.031],[s*.096,-.055-k*.055,.031],[s*.145,-.081-k*.055,.019]],[.005,.005,.001],g);
    }
    strand(dark,[[-.047,.381,.184],[-.013,.369,.188],[.012,.387,.188],[.035,.367,.182],[.062,.379,.173]],[.006,.009,.009,.006,.003]);
    const head=joint(0,.63,0,.045,'z');
    for(let k=0;k<8;k++){const a=k*tau/8;
      const p=finishSpiritPart(oval('#c7f6f2',.092*Math.sin(a),-.014,.083*Math.cos(a),.069,.064,.130,head),'petal',colors);
      p.rotation.set(.18,a,0,'YXZ');}
    strand('#518827',[[0,.025,0],[.08,.146,-.02],[.22,.185,-.04],[.28,.10,-.04],[.26,-.16,-.05],[.32,-.20,-.04],[.345,-.155,-.015],[.305,-.145,0]],
      [.038,.028,.025,.023,.020,.014,.009,.001],head);
  }
  function classicMushroom(){
    const young=id===46,ochre='#a38d60',brown='#735831',ivory='#f4dda5';
    const hood=joint(0,0,0,young?.030:.018,'x');
    const crown=young?.975:1.015,brim=young?.37:.53;
    // The curved front opening lifts over the eyes. The sides hang lower and curl in.
    function surface(a,t,lift=0){
      const end=t*Math.PI*.55,lip=t*t*t,front=Math.cos(a),side=Math.sin(a);
      const fold=young?.013*Math.cos(3*a+.7):.076*Math.cos(3*a+.45)+.028*Math.sin(2*a);
      const brow=young?0:Math.exp(-12*(t-.79)**2)*Math.max(0,front)*(.7+.3*Math.cos(2*a));
      const rad=(young?.463:.506)*Math.sin(end)*(1+lip*fold)+.034*brow;
      const y=brim+(crown-brim)*Math.cos(t*Math.PI*.5)+lip*((young?.072:.118)*front*front+.037*front+fold)-.030*brow;
      return new T.Vector3((rad+lift)*side-(young?.024:.057)*(1-t),(y+lift*Math.cos(end)),(rad+lift)*front*(young?.91:.88));
    }
    function skin(vertices,triangles,color,group){
      const geo=new T.BufferGeometry();
      geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(triangles);geo.computeVertexNormals();
      return mesh(geo,color,[0,0,0],[1,1,1],group);
    }
    const rings=22,sectors=64,tip=surface(0,0),vertices=[tip.x,tip.y,tip.z],triangles=[];
    for(let j=1;j<=rings+3;j++)for(let k=0;k<sectors;k++){
      const a=k*tau/sectors,t=Math.min(j/rings,1),v=surface(a,t);
      if(j>rings){
        const roll=j-rings;
        const f=[1,.971,.81,.25][roll];
        v.x*=f;v.z*=f;v.y+=[0,-.018,-.012,.070][roll];
      }
      vertices.push(v.x,v.y,v.z);
      const thisIndex=1+(j-1)*sectors+k,next=1+(j-1)*sectors+(k+1)%sectors;
      if(j===1)triangles.push(0,thisIndex,next);
      else triangles.push(thisIndex-sectors,thisIndex,next,next,next-sectors,thisIndex-sectors);
    }
    const topCount=(sectors+(rings-1)*sectors*2)*3;
    const cap=skin(vertices,triangles,young?'#863909':'#83320c',hood);
    finishSpiritPart(cap,'cap',colors);
    const colorUnder='#533217';
    if(!colors.has(colorUnder))colors.set(colorUnder,new T.MeshStandardMaterial({color:new T.Color(colorUnder).convertSRGBToLinear(),roughness:.77}));
    cap.geometry.addGroup(0,topCount,0);cap.geometry.addGroup(topCount,triangles.length-topCount,1);
    cap.material=[cap.material,colors.get(colorUnder)];
    // Shallow radial lamellae follow the rolled underside. All gills are one
    // mesh and stop at the stalk, leaving the lifted brow clear.
    const gills=[],faces=[];
    for(let i=0;i<40;i++){
      const angle=tau*i/40,rim=surface(angle,1),start=i%3===1?.45:.27;
      for(let j=0;j<=6;j++){
        const t=j/6,r=start+(.93-start)*t,a=angle+.028*Math.sin(Math.PI*t+i*.6),n=gills.length/3;
        const height=rim.y+.071-.105*t,vane=.029*Math.sin(Math.PI*t);
        const x=Math.sin(a)*Math.hypot(rim.x,rim.z/.88)*r,z=Math.cos(a)*Math.hypot(rim.x,rim.z/.88)*r*.88;
        const w=.004+.003*Math.sin(Math.PI*t);
        gills.push(x-w*Math.cos(a),height,z+w*Math.sin(a),x,height-vane,z,x+w*Math.cos(a),height,z-w*Math.sin(a));
        if(j)faces.push(n-3,n,n-2,n-2,n,n+1,n-2,n+1,n-1,n-1,n+1,n+2);
      }
    }
    skin(gills,faces,'#876344',hood).material.side=T.DoubleSide;
    // Each coloured island follows the actual hood surface, including its bent brim.
    const patches=young?
      [[-.74,.86,.34,.135],[.91,.79,.41,.205],[-.43,.36,.52,.16],[2.39,.58,.41,.20],[-2.24,.63,.46,.21],[2.19,.22,.45,.12]]:
      [[-.64,.80,.33,.19],[1.03,.73,.55,.29],[-1.36,.68,.19,.18],[-.29,.37,.46,.17],[2.32,.56,.40,.17],
        [-2.39,.67,.37,.21],[-1.75,.29,.37,.12],[2.98,.29,.31,.10]];
    for(const [a,t,w,h] of patches){
      const pts=[],indices=[],steps=32,ringsOnSpot=5;
      for(let j=0;j<=ringsOnSpot;j++)for(let k=0;k<steps;k++){
        const d=j/ringsOnSpot,p=k*tau/steps,wave=1+.10*Math.cos(3*p+a)+.07*Math.sin(2*p+2*a);
        const s=surface(a+w*d*wave*Math.cos(p),Math.min(.991,t+h*d*wave*Math.sin(p)),.003);
        pts.push(s.x,s.y,s.z);
        if(j){const l=(j-1)*steps+k,r=(j-1)*steps+(k+1)%steps;indices.push(l,r,l+steps,r,r+steps,l+steps);}
      }
      finishSpiritPart(skin(pts,indices,ivory,hood),'cap',colors).material.side=T.DoubleSide;
    }
    if(!young){
      // A thick, folded band wraps across the front of #047. Its ends curl
      // under the adjoining lobes, while the centre lifts clear of the eyes.
      const p=[],rgb=[],ix=[],rows=52,n=18;
      const russet=new T.Color('#782e09').convertSRGBToLinear(),sand=new T.Color(ivory).convertSRGBToLinear(),c=new T.Color();
      for(let i=0;i<=rows;i++){
        const t=i/rows,a=-1.68+3.34*t,front=Math.cos(a);
        const end=Math.sin(Math.PI*t)**.43,h=.66+.074*front+.029*Math.cos(3*a+.25);
        const radius=.442+.030*Math.cos(2*a+.7);
        for(let j=0;j<n;j++){
          const b=tau*j/n,rad=radius+(.075*Math.cos(b)+.014*Math.sin(b))*end;
          p.push(rad*Math.sin(a),h+.092*Math.sin(b)*end,rad*.93*front);
          const arc=(a>-.97-.10*Math.sin(b)&&a<-.44+.12*Math.cos(b))||a>.78+.13*Math.cos(b);
          c.copy(arc?sand:russet).multiplyScalar(.82+.17*Math.sin(b)+.065*Math.cos(3*a));
          rgb.push(c.r,c.g,c.b);
          if(i){const l=(i-1)*n+j,r=(i-1)*n+(j+1)%n;ix.push(l,r,l+n,r,r+n,l+n);}
        }
      }
      const fold=skin(p,ix,'#ffffff',hood);
      fold.geometry.setAttribute('color',new T.Float32BufferAttribute(rgb,3));
      const finish=fold.material.clone();finish.vertexColors=true;finish.side=T.DoubleSide;fold.material=finish;
    }
    const face=new T.Group();body.add(face);
    if(young){
      oval('#b09a68',0,.315,0,.212,.279,.164);
      for(const s of [-1,1])oval('#aa945f',s*.083,.085,.010,.076,.091,.088);
      oval('#302317',0,.526,.034,.294,.10,.165);
      face.position.set(0,.383,.162);
      for(const s of [-1,1]){
        const outline=oval('#5f472a',s*.099,0,.004,.047,.094,.020,face);outline.rotation.z=-s*.065;
        const eyeWhite=oval('#fffcef',s*.099,.005,.019,.041,.088,.019,face);eyeWhite.rotation.z=-s*.065;
      }
    }else{
      body.scale.x=.97;body.scale.z=.96;
      oval(brown,0,.40,-.018,.316,.192,.27);oval(ochre,0,.454,.006,.35,.164,.265);
      const toes=[[-.220,-.105],[-.248,.12],[.153,.233],[.253,-.096]];
      for(const [x,z] of toes){
        const s=Math.sign(x),group=joint(x,.50,z,.032,'x',z*15);
        const fore=z>.2,bend=fore?.065:.18,pts=[],rgb=[],indices=[],n=28;
        const sections=[[0,.018,0,.001],[.09,0,0,.089],[.27,-.053,.014,.128],[.47,-.125,.025,.143],
          [.58,-.205,.024,.129],[.57,-.254,.018,.100],[.54,-.296,.021,.080],[.62,-.330,.048,.068],
          [.78,-.363,.082,.061],[.92,-.374,.104,.047],[1,-.367,.128,.001]];
        const tone=new T.Color(),amber=new T.Color('#c2a675').convertSRGBToLinear(),stem=new T.Color('#8d744b').convertSRGBToLinear();
        for(const [j,[offset,y,dz,r]] of sections.entries())for(let k=0;k<n;k++){
          const a=k*tau/n;
          pts.push(s*offset*bend+Math.sin(a)*r,y*(fore?1.37:1),dz*(fore?.76:1)+Math.cos(a)*r*(.86+.19*offset));
          const marking=Math.cos(a-s*.72+j*.16)>.42 && (j<=3||j>=7);
          tone.copy(marking?amber:stem);rgb.push(tone.r,tone.g,tone.b);
          if(j){const l=(j-1)*n+k,rgt=(j-1)*n+(k+1)%n;indices.push(l,l+n,rgt+n,rgt+n,rgt,l);}
        }
        const foot=skin(pts,indices,'#ffffff',group);foot.geometry.setAttribute('color',new T.Float32BufferAttribute(rgb,3));
        const finish=foot.material.clone();finish.vertexColors=true;foot.material=finish;
      }
      oval('#1b140f',0,.618,.016,.310,.162,.24);face.position.set(0,.627,.25);
      for(const s of [-1,1])oval('#fffdee',s*.089,-.008,.002,.047,.059,.024,face);
      strand('#806742',[[-.286,.54,.10],[-.194,.492,.192],[0,.468,.255],[.157,.511,.219],[.28,.539,.119]],
        [.022,.037,.036,.026,.009]);
      strand('#d7c49a',[[-.293,.544,.101],[-.184,.512,.202],[0,.486,.265],[.161,.527,.213],[.25,.546,.149]],
        [.012,.029,.025,.018,.004]);
      for(const [x,y,z,r] of [[.267,.440,.222,.077],[.166,.361,.310,.057]]){
        oval('#a04617',x,y,z,r,r*1.21,r*.78);
        oval(ivory,x+r*.41,y+r*.26,z+r*.55,r*.41,r*.57,r*.21);
        oval('#dec997',x-r*.43,y-r*.1,z+r*.60,r*.31,r*.38,r*.17);
      }
    }
    mushroomEyes=face;
  }
  function starMushroom(){
    const cap='#ba6231',spot='#ffe697';
    const mantle=joint(0,0,0,.035,'z');
    for(const s of [-1,1])for(const zz of [1,-1])oval('#ad9672',s*.18,.17,zz*.13,.078,.17,.084,mantle);
    oval('#bdab85',0,.34,0,.288,.221,.224,mantle);
    oval('#292020',0,.50,.13,.245,.149,.157,mantle);
    for(const s of [-1,1])oval('#fff3d5',s*.098,.53,.269,.032,.051,.019,mantle);
    const profile=[[0,0],[.37,-.01],[.52,.065],[.50,.16],[.41,.27],[.25,.37],[.07,.42],[0,.423]];
    mesh(new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),40),cap,[0,.56,0],[1,1,.84],mantle);
    for(let j=0;j<12;j++){
      const a=j*2.39996,r=.20+.18*((j%4)/3);
      const mark=oval(spot,Math.sin(a)*r,.963-r*.39,Math.cos(a)*r*.85,.067,.030,.059,mantle);
      mark.rotation.x=.44*Math.cos(a);mark.rotation.z=-.44*Math.sin(a);
    }
    const crystal=gem('#ffda80',-.28,.95,.1,.09,.20,.08,mantle);crystal.rotation.z=.37;
    for(const side of [-1,1]){
      strand('#8b9766',[[side*.31,.62,0],[side*.53,.86,.06],[side*.64,.91,.04],[side*.63,.77,.02]],[.020,.012,.009,.001],mantle);
      for(let j=0;j<3;j++)oval('#ffe796',side*(.4+.05*j),.32+j*.13,.05,.026,.030,.025,mantle);
    }
  }
  function yiyi(){
    const shiny=id===442,lime=shiny?'#b2bc3b':'#b7b447',shell=shiny?'#7b9633':'#70692c';
    feet(lime,.155,.118,.083);
    oval(lime,0,.26,0,.224,.204,.181);oval(shell,0,.285,-.023,.228,.189,.171);
    oval(lime,0,.207,.112,.211,.127,.132);
    const mask=oval('#423e26',0,.254,.213,.160,.091,.035);mask.rotation.z=-.025;
    for(const side of [-1,1]){
      oval('#f7ebad',side*.194,.29,.03,.035,.062,.051);
      oval(cream,side*.076,.25,.243,.038,.044,.019);eye(side*.073,.246,.257,.35);
      const rod=joint(side*.041,.462,-.012,.07,'z',side);
      strand('#a4a339',[[0,0,0],[side*.026,.12,.022],[side*.06,.31,.037],[side*.085,.40,.066]],[.018,.016,.010,.006],rod);
      const antenna=oval('#c9cc53',side*.085,.401,.065,.023,.050,.021,rod);antenna.rotation.z=-side*.26;
      oval('#e1d471',side*.128,.369,.116,.048,.066,.028);
    }
    oval(lime,0,.444,-.013,.09,.032,.076);
  }
  function simon(){
    const shell='#a52330';
    oval(shell,0,.415,0,.28,.266,.232);
    for(const side of [-1,1]){
      const claw=joint(side*.17,.22,.016,.11,'x',side);
      strand('#bc3635',[[0,0,0],[side*.104,-.02,.08],[side*.158,-.10,.12],[side*.145,-.20,.18]],
        [.075,.074,.051,.006],claw);
      spike('#f69b19',[side*.14,-.12,.135],[side*.145,-.215,.182],.032,claw);
      oval('#e98012',side*.13,.44,.165,.088,.117,.050);
      eye(side*.13,.45,.202,.65);
      spike('#90293c',[side*.199,.43,0],[side*.31,.59,-.09],.082);
    }
    gem('#f96866',0,.552,.194,.082,.135,.036);feet('#af5728',.092,.05,.072);
    const fire=joint(0,.61,0,.085,'z');
    for(let j=0;j<5;j++)strand(j%2?'#f5811c':'#ffd05a',[[.06*(j-2),-.063,0],[.055*(j-2),.044,-.03],[.064*(j-2)+.03,.14+.05*(j%2),-.05],[.045*(j-2),.198+.045*(j%2),-.07]],
      [.057,.069,.039,.001],fire);
  }
  function fox(){
    const coat='#c88455',fire='#ed5934';
    finishSpiritPart(oval(coat,0,.32,-.07,.157,.176,.288),'velvet',colors);
    finishSpiritPart(oval('#eed4a0',0,.44,.13,.14,.16,.14),'velvet',colors);
    const head=joint(0,.595,.202,.060,'y');finishSpiritPart(oval(coat,0,0,0,.189,.166,.166,head),'velvet',colors);
    oval('#f4dbab',0,-.055,.145,.12,.067,.115,head);oval('#49323b',0,-.029,.231,.045,.028,.029,head);
    for(const s of [-1,1]){
      spike(fire,[s*.112,.075,-.04],[s*.205,.265,-.092],.083,head);
      const stripe=oval('#b43b30',s*.111,.045,.107,.063,.072,.035,head);stripe.rotation.z=-s*.35;
      eye(s*.089,.021,.151,.62,head);
      for(const z of [-.18,.12]){oval('#ba6b46',s*.106,.16,z,.059,.147,.066);oval('#e8c18b',s*.103,.048,z+.035,.057,.052,.079);}
    }
    const tail=joint(0,.31,-.31,.18,'x');
    strand('#de4733',[[0,0,0],[.08,.09,-.13],[.15,.23,-.25],[.15,.38,-.28],[.19,.50,-.32]],[.055,.103,.097,.063,.001],tail);
    strand('#ffbc55',[[.10,.15,-.19],[.15,.26,-.25],[.17,.37,-.29],[.20,.48,-.315]],[.017,.077,.044,.002],tail);
  }
  function dragonPlant(){
    const steel='#354452',leaf='#628c59',g=joint(0,.49,0,.065,'y');
    for(const s of [-1,1]){
      strand(steel,[[0,.54,0],[s*.14,.42,.10],[s*.25,.13,.07],[s*.46,.06,.13],[s*.52,.03,.14]],[.101,.092,.057,.043,.004]);
      strand(leaf,[[0,.50,-.03],[s*.17,.30,-.17],[s*.29,.06,-.16],[s*.47,.05,-.25]],[.09,.065,.049,.001]);
      spike('#62738e',[s*.12,.23,-.07],[s*.35,.70,-.18],.119,g);
    }
    strand(steel,[[0,.13,0],[0,.31,0],[.034,.44,.07],[.021,.50,.13]],[.132,.141,.176,.087],g);
    oval('#b03c49',0,.392,.144,.287,.136,.225,g);
    oval('#473443',0,.288,.18,.229,.082,.183,g);
    oval('#74375c',0,.194,.18,.218,.068,.165,g);
    for(const s of [-1,1]){
      oval('#f2be37',s*.148,.456,.21,.065,.030,.070,g);
      for(let j=0;j<3;j++)spike('#e4d4ad',[s*(.098+.047*j),.324,.299-.023*j],[s*(.096+.048*j),.218,.298-.022*j],.027,g);
      strand('#9c8c70',[[s*.12,.48,-.04],[s*.21,.67,-.16],[s*.24,.76,-.13],[s*.31,.74,-.09]],[.021,.019,.014,.002],g);
    }
  }
  function crystal(){
    const stone='#aaa78e',teal='#38acac';
    mesh(geometry('stone'),stone,[0,.30,0],[.245,.225,.214]);
    oval('#364345',0,.256,.135,.195,.107,.080);
    for(const s of [-1,1]){
      oval(teal,s*.102,.28,.209,.045,.066,.027);oval('#d8f5e9',s*.099,.292,.229,.017,.035,.009);
      mesh(geometry('stone'),'#929281',[s*.147,.100,-.006],[.124,.089,.126]);
      const shard=gem('#229c9d',s*.184,.425,-.008,.080,.145,.074);shard.rotation.z=-s*.41;
      const arm=joint(s*.205,.219,0,.09,'x',s);gem('#238d91',s*.022,0,.05,.086,.101,.093,arm);
    }
    const crest=gem('#4dc7bb',-.032,.47,-.071,.081,.145,.079);crest.rotation.z=.18;
    gem('#30928d',.005,.397,.156,.047,.058,.029);
  }
  function shiningBird(){
    const white='#fff2db',pink='#ecc9ba',orange='#eba843';
    oval(pink,0,.39,0,.147,.244,.12);oval(white,0,.643,.036,.149,.153,.13);
    spike(gold,[0,.607,.140],[0,.57,.242],.044);
    for(const s of [-1,1]){
      eye(s*.066,.656,.147,.60);
      strand(gold,[[s*.07,.72,0],[s*.13,.83,-.014],[s*.118,.913,-.05],[s*.160,.979,-.061]],[.029,.041,.019,.001]);
      const wing=joint(s*.135,.56,-.015,.13,'z',s);
      for(let j=0;j<7;j++){
        const d=j/6;
        strand(j%3?white:orange,[[0,0,0],[s*(.12+.055*d),.058-.12*d,-.02],[s*(.25+.09*d),.132-.32*d,-.08],[s*(.38-.11*d),.115-.53*d,-.15]],
          [.058,.087,.072,.002],wing);
      }
      strand(white,[[s*.061,.30,0],[s*.102,.20,.019],[s*.135,.137,.064],[s*.129,.07,.094]],[.043,.045,.025,.012]);
      spike(gold,[s*.125,.075,.088],[s*.148,.028,.141],.028);
      for(let j=0;j<3;j++)strand(j===1?orange:white,[[s*.04,.39,-.04],[s*.10,.30,-.14],[s*(.15+.06*j),.15,-.20],[s*(.19+.057*j),.016,-.28]],[.046,.067,.049,.001]);
    }
  }
  switch(id){
    case 16:cactus();break;case 27:sprout();break;
    case 46:case 47:classicMushroom();break;case 4693:starMushroom();break;
    case 83:case 442:yiyi();break;case 701:simon();break;case 821:fox();break;
    case 4690:dragonPlant();break;case 4694:crystal();break;case 2197:shiningBird();break;
  }
  const box=new T.Box3().setFromObject(root),scale=KLOSE_SPECIMENS[id][1]/(box.max.y-box.min.y);
  skeleton.scale.setScalar(scale);skeleton.position.y=-box.min.y*scale;
  let clock=0;
  return {root,update(dt,effort=0){
    clock+=dt;
    body.scale.y=1+.013*Math.sin(clock*2.3);
    body.rotation.z=.018*Math.sin(clock*1.8)+effort*.035*Math.sin(clock*8);
    if(mushroomEyes)mushroomEyes.scale.y=.12+.88*Math.min(1,Math.abs(clock%4.7-3.2)/.086);
    joints.forEach(({g,sway,axis,phase})=>{g.rotation[axis]=sway*Math.sin(clock*(2.35+effort*3.6)+phase);});
  },dispose(){disposeKloseModel(root);}};
}

// Offsets are measured in metres east and south of each site's centre.
const KLOSE_TERRITORIES={
    grassland:[[164,-7,-5,1,'rare']],
    swamp:[[16,2,-5,11,'wild'],[16,-6,7,12,'wild'],[16,10,6,12,'wild'],[27,-6,-4,11,'rare']],
    forest:[[47,7,-11,SPT_CHALLENGES.get(47).level,'boss'],[83,-5,3,15,'rare'],[442,-9,-4,15,'rare']],
    flame:[[821,-8,-5,30,'event']],
    vineway:[[4690,3,-7,35,'event']],
    core:[[4694,4.4,-4.8,12,'rare'],[4693,-7,6,35,'event']],
    sanctuary:[[2197,2,-9,40,'event']]
};
function createKloseWildlife(T,surface,meadowBirds){
  const {chart,groundCorrection,pools,sceneScale=1}=surface;
  const inhabitants=[],byKey=new Map(),switches=[];
  let coreStep=0;
  const shieldWindowMs=6500;
  function resetShield(p){
    p.hits=0;p.shieldDeadline=0;p.shield.visible=true;p.radius=p.shieldRadius;
    p.shield.material.uniforms.heat.value=0;p.shield.material.uniforms.flash.value=0;
  }
  function shieldVisual(p,now){
    if(!p.shield?.visible)return;
    if(p.hits&&now>=p.shieldDeadline)resetShield(p);
    const u=p.shield.material.uniforms;
    u.heat.value=.47*p.hits*Math.min(1,Math.max(0,(p.shieldDeadline-now)/700));
    u.flash.value=p.hits?Math.max(0,1-(now-(p.shieldDeadline-shieldWindowMs))/370):0;
    u.phase.value=p.clock%100;
  }
  function clear(p,x,z,walker,boat){
    if(Math.hypot(x,z)<1.05+p.radius||Math.abs(x)+p.radius>21.5||Math.abs(z)+p.radius>21.5||
        Math.hypot(x-p.homeX,z-p.homeZ)>(p.spawnPending?p.placementReach:7.6))return false;
    const radius=p.radius,location=p.space.global(x,z),dx=location.x,dz=location.z;
    const height=p.shieldRadius&&p.radius===p.shieldRadius?p.shieldHeight:p.size;
    if(!kloseClearsCover(p.cover,x,z,radius,height+.12))return false;
    if(p.hazards.some(b=>b.region===location.region&&Math.hypot(dx-b.x,dz-b.z)<b.r+radius))return false;
    if(pools.some(w=>p.space.region.ids.includes(w.id)&&Math.hypot((dx-w.x)/(w.rx+radius),(dz-w.z)/(w.rz+radius))<1.04))return false;
    const away=(cx,cz,r)=>{
      const d=Math.hypot(dx-cx,dz-cz);
      const previous=p.space.global(p.x,p.z);
      return d>=r || (p.at&&d>Math.hypot(previous.x-cx,previous.z-cz)+1e-6);
    };
    if(walker?.region===location.region&&!away(walker.x,walker.z,radius+.35/sceneScale))return false;
    if(boat?.region===location.region&&!away(boat.x,boat.z,radius+9/sceneScale))return false;
    if(p.site.id==='grassland'&&meadowBirds.some(b=>{
      if(b.cooldown||b.spawnPending)return false;
      const q=b.space.global(b.x,b.z);return !away(q.x,q.z,radius+b.radius);
    }))return false;
    return inhabitants.every(other=>{
      if(other===p||other.spawnPending||other.space.region!==p.space.region||other.cooldown)return true;
      const q=other.space.global(other.x,other.z);return away(q.x,q.z,radius+other.radius);
    });
  }
  function pose(p,bounce=0){
    p.at=p.space.at(p.x,p.z);
    p.space.pose(p.root,p.x,p.yAt(p.x,p.z)+groundCorrection(p.at.lat,p.at.lon)+.006+bounce,p.z,p.yaw);
  }
  function findPlacement(p,walker=null,boat=null){
    const rings=Math.ceil(p.placementReach/.41);
    for(let ring=0;ring<=rings;ring++)for(let k=0,n=1+ring*7;k<n;k++){
      const a=k*Math.PI*2/n,x=p.homeX+Math.cos(a)*ring*.41,z=p.homeZ+Math.sin(a)*ring*.41;
      if(!clear(p,x,z,walker,boat))continue;
      p.x=p.homeX=x;p.z=p.homeZ=z;p.spawnPending=false;
      if(p.mouth){p.space.pose(p.mouth,x,p.yAt(x,z)+.023,z);p.mouth.visible=true;}
      return true;
    }
    return false;
  }
  function install(site,near,yAt,hazards,cover){
    if(site.id==='core')installCore(site,near,yAt,hazards);
    for(const [index,row] of (KLOSE_TERRITORIES[site.id]||[]).entries()){
      const [speciesId,homeX,homeZ,level,kind]=row,model=createFieldSpirit(T,speciesId,{boss:kind==='boss',sceneScale});
      const seed=(speciesId*37+index*19)%97;
      const p={...model,key:site.id+'-'+speciesId+'-'+(index+1),speciesId,level,kind,
        site,near,yAt,space:surface.placement(site),hazards,cover,homeX,homeZ,x:homeX,z:homeZ,bodyRadius:model.radius,
        clock:0,yaw:-.3+seed*.031,distance:0,wait:.3+seed*.02,cooldown:0,path:null,walker:null,hits:0,spawnPending:true,retry:0};
      if(speciesId===47){
        p.shieldRadius=Math.max(1.1*FIELD_SPIRIT_SCALE/sceneScale,model.radius*1.30);
        p.radius=p.shieldRadius;p.shieldHeight=p.size*1.21;
      }
      p.placementReach=Math.min(18,Math.max(4.92,p.radius*2.2+1.6));
      const placed=findPlacement(p);if(!placed)p.retry=2;
      p.root.userData.kloseSpirit=p.key;
      near.add(p.root);inhabitants.push(p);byKey.set(p.key,p);if(placed)pose(p);p.root.visible=false;
      if(speciesId===47){
        const shield=new T.Mesh(new T.SphereGeometry(1,56,32),new T.ShaderMaterial({
          transparent:true,depthWrite:false,
          uniforms:{heat:{value:0},flash:{value:0},phase:{value:0}},
          vertexShader:`varying vec3 local, eye, normalEye;
            void main(){
              local=position;vec4 mv=modelViewMatrix*vec4(position,1.);
              eye=-mv.xyz;normalEye=normalMatrix*normal;gl_Position=projectionMatrix*mv;
            }`,
          fragmentShader:`uniform float heat,flash,phase;varying vec3 local,eye,normalEye;
            void main(){
              float rim=pow(1.-clamp(dot(normalize(eye),normalize(normalEye)),0.,1.),1.9);
              float glint=pow(max(0.,dot(normalize(local),normalize(vec3(-.36,.59,.72)))),26.);
              float ripple=.5+.5*sin(local.y*11.+phase*1.6+sin(local.z*7.+phase*.7));
              vec3 film=mix(vec3(.21,.59,.96),vec3(.010,.012,.024),heat);
              vec3 light=mix(vec3(.51,.89,1.),vec3(.13,.16,.22),heat);
              vec3 colour=mix(film,light,clamp(rim*.86+glint,0.,1.));
              colour=mix(colour,vec3(1.,.56,.22),flash*(.28+rim*.38));
              gl_FragColor=vec4(colour,min(.92,.082+rim*.56+glint*.26+heat*.31+ripple*.024));
              #include <tonemapping_fragment>
              #include <encodings_fragment>
            }`}));
        shield.scale.set(p.shieldRadius,p.size*.77,p.shieldRadius);shield.position.y=p.shieldHeight-shield.scale.y;
        p.root.add(shield);p.shield=shield;resetShield(p);
      }
      if(speciesId===83||speciesId===442){
        // The animal retracts into the dark mouth below its body, not through
        // a stretch of unbroken soil. The marker stays when the animal is shy.
        const mouth=new T.Mesh(new T.CylinderGeometry(.23,.19,.026,24),
          new T.MeshStandardMaterial({color:0x352c24,roughness:1}));
        mouth.userData.kloseFixture=true;
        const width=FIELD_SPIRIT_SCALE/sceneScale;
        mouth.scale.set(width,1,.72*width);mouth.visible=placed;p.mouth=mouth;near.add(mouth);
        if(placed)p.space.pose(mouth,p.x,yAt(p.x,p.z)+.023,p.z);
      }
    }
  }
  function installCore(site,near,yAt,hazards){
      const space=surface.placement(site);
      // The vine, upper mineral, violet bud and resonant seam are also
      // recognisable at a distance. Only the last seam comes alive.
      const spots=[[-6,-2,'卷叶鳄兰'],[4,-8,'高处矿石'],[-5,3,'紫花苞'],[3,-5,'共鸣矿石']];
      for(const [index,[x,z,name]] of spots.entries()){
        const device=new T.Group();device.userData.kloseFixture=true;device.position.set(x,yAt(x,z),z);device.scale.setScalar(KLOSE_ITEM_SCALE);near.add(device);
        const jewel=index===1||index===3,mat=new T.MeshStandardMaterial({color:[0x788847,0x57bda9,0xa24d90,0x667d73][index],
          roughness:jewel?.32:.66,emissive:0x132a22,emissiveIntensity:jewel?.42:.1});
        const base=new T.Mesh(new T.DodecahedronGeometry(1),new T.MeshStandardMaterial({color:0x665c48,roughness:.95}));
        base.scale.set(.74,index===1?.87:.18,.59);base.position.y=index===1?.69:.08;device.add(base);
        let top=.18;
        if(jewel){
          const prism=new T.LatheGeometry([[.05,0],[.95,.08],[1,.66],[.70,.82],[0,1]].map(([r,h])=>new T.Vector2(r,h)),6);
          for(let k=0;k<6;k++){
            const a=k*Math.PI*.4,h=k===5?.87:.39+.26*(k%3)/2,offset=k===5?0:.27,stem=index===1?1.31:.15;
            const shard=new T.Mesh(prism,mat);
            shard.position.set(offset*Math.sin(a),stem,offset*Math.cos(a));
            shard.scale.set(.13+.026*(k%2),h,.15);shard.rotation.set(k===5?0:.32,a,0,'YXZ');device.add(shard);
            top=Math.max(top,stem+h);
          }
        }else if(index===0){
          const path=new T.CatmullRomCurve3([[0,.14,0],[-.12,.43,0],[-.16,.85,.02],[.07,1.04,.04],
            [.32,.95,.06],[.35,.70,.08],[.17,.61,.10],[.10,.74,.11]].map(p=>new T.Vector3(...p)));
          device.add(new T.Mesh(new T.TubeGeometry(path,36,.070,9,false),mat));
          for(const side of [-1,1]){
            const blade=new T.Mesh(new T.SphereGeometry(1,20,12),mat);blade.scale.set(.12,.33,.055);
            blade.position.set(side*.19,.43,.05);blade.rotation.z=-side*.63;device.add(blade);
          }
          top=1.15;
        }else{
          const bud=new T.SphereGeometry(1,26,16);
          const sepals=new T.MeshStandardMaterial({color:0x828b42,roughness:.68});
          for(let k=0;k<6;k++){
            const a=k*Math.PI/3,c=Math.cos(a),s=Math.sin(a),petal=new T.Mesh(bud,mat),sepal=new T.Mesh(bud,sepals);
            petal.scale.set(.14,.36,.105);petal.position.set(.15*s,.54,.15*c);petal.rotation.set(-.20,a,0,'YXZ');
            sepal.scale.set(.072,.21,.054);sepal.position.set(.17*s,.32,.17*c);sepal.rotation.set(.37,a,0,'YXZ');
            device.add(petal,sepal);
          }
          top=.91;
        }
        space.project(device);
        switches.push({site,near,space,x,z,index,name,root:device,mat,top:top*KLOSE_ITEM_SCALE});
        hazards.push({...space.global(x,z),r:.74*KLOSE_ITEM_SCALE});
      }
  }
  function exposed(p,visitor){
    const id=p.speciesId,t=p.clock;
    if(id===4694)return coreStep===4;
    if((id===83&&p.hits>=3)||(id===442&&p.hits>=1))return true;
    if(id===27)return t%42<13;
    if(id===164)return (t+33)%69<14;
    if(id===83)return t%15<9;
    if(id===442)return (t+16)%53<12;
    if(id===701)return p.distance>=2.4&&((p.distance-2.4)%22<11);
    if(p.kind==='event')return visitor?.region===p.space.region&&Math.hypot(visitor.x-p.site.x,visitor.z-p.site.z)<32;
    return true;
  }
  function random(p){
    p.seed=((p.seed??(1919+p.speciesId))+0x6d2b79f5)>>>0;
    let x=Math.imul(p.seed^(p.seed>>>15),p.seed|1);
    x^=x+Math.imul(x^(x>>>7),x|61);
    return ((x^(x>>>14))>>>0)/4294967296;
  }
  function clearLine(p,x,z,walker,boat){
    const dx=x-p.x,dz=z-p.z,n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.16));
    for(let i=1;i<=n;i++)if(!clear(p,p.x+dx*i/n,p.z+dz*i/n,walker,boat))return false;
    return true;
  }
  function step(p,dt,walker,boat){
    const fixed=p.kind==='boss'||p.kind==='event'||p.speciesId===83||p.speciesId===442;
    let aim=p.yaw,travel=0;
    if(fixed){
      if(walker?.region===p.space.region){const local=p.space.local(walker);aim=Math.atan2(local.x-p.x,local.z-p.z);}
    }else{
      p.wait=Math.max(0,p.wait-dt);
      if(!p.path&&!p.wait){
        for(let j=0;j<9;j++){
          const a=random(p)*Math.PI*2,r=1+random(p)*2.6,x=p.homeX+Math.sin(a)*r,z=p.homeZ+Math.cos(a)*r;
          if(clearLine(p,x,z,walker,boat)){p.path={x,z};break;}
        }
        if(!p.path)p.wait=.6;
      }
      if(p.path)aim=Math.atan2(p.path.x-p.x,p.path.z-p.z);
    }
    const delta=Math.atan2(Math.sin(aim-p.yaw),Math.cos(aim-p.yaw)),max=(fixed?1.5:3.4)*dt;
    p.yaw+=T.MathUtils.clamp(delta,-max,max);
    if(p.path&&Math.abs(delta)<=max+.05){
      const left=Math.hypot(p.path.x-p.x,p.path.z-p.z);
      const speed=p.speciesId===701?.88:p.speciesId===164?.73:.44;
      const stride=Math.min(left,speed*dt),nx=p.x+Math.sin(p.yaw)*stride,nz=p.z+Math.cos(p.yaw)*stride;
      if(clearLine(p,nx,nz,walker,boat)){p.x=nx;p.z=nz;travel=stride;}
      if(stride>=left||!travel){p.path=null;p.wait=.4+random(p)*1.4;}
    }
    p.travel=(p.travel||0)+travel;
    let bob=travel?Math.abs(Math.sin(p.travel*12))*.042:0;
    if((p.speciesId===83&&p.hits<3)||(p.speciesId===442&&p.hits<1)){
      const shiny=p.speciesId===442,t=(p.clock+(shiny?16:0))%(shiny?53:15),end=shiny?12:9;
      bob-=p.size*(1-T.MathUtils.smoothstep(Math.min(t,end-t),0,1.1));
    }
    p.update(dt,travel?1:0);pose(p,bob);
  }
  function update(dt,walker,boat){
    for(const p of inhabitants){
      if(!p.near.visible){p.walker=null;continue;}
      if(p.spawnPending){
        p.root.visible=false;p.retry=Math.max(0,p.retry-dt);
        if(p.retry||!findPlacement(p,walker,boat)){if(!p.retry)p.retry=2;continue;}
        pose(p);
      }
      p.cooldown=Math.max(0,p.cooldown-dt);
      const nearby=walker?.region===p.space.region&&Math.hypot(walker.x-p.site.x,walker.z-p.site.z)<43;
      if(nearby){
        p.clock+=dt;
        if(p.walker){const d=Math.hypot(walker.x-p.walker.x,walker.z-p.walker.z);if(d<2)p.distance+=d;}
      }
      p.walker=nearby?walker:null;
      p.root.visible=!p.cooldown&&exposed(p,walker);
      if(p.root.visible){
        if(p.shield)shieldVisual(p,performance.now());
        step(p,dt,walker,boat);
      }
    }
  }
  function fieldLock(p){
    return p.shield?.visible?'装备火焰喷射器，连续照射护膜（'+p.hits+'/3）':
      p.speciesId===83&&p.hits<3?'向探头的依依照射三次（'+p.hits+'/3）':
      p.speciesId===442&&!p.hits?'对探头的闪光依依照射一次':'';
  }
  function record(p,distance){
    return {key:p.key,id:p.key,speciesId:p.speciesId,name:KLOSE_SPECIMENS[p.speciesId][0],siteId:p.site.id,fieldLock:fieldLock(p),
      size:p.size*sceneScale,level:p.level,kind:p.kind,visible:true,lat:p.at.lat,lon:p.at.lon,distance,
      contactRange:22+p.radius*sceneScale,observationRange:22+p.radius*sceneScale,
      focusPoint:p.root.localToWorld(new T.Vector3(0,p.size*.48,0))};
  }
  function observation(lat,lon,key){
    const viewer=chart(lat,lon);let best=null;
    const options=key?[byKey.get(key)]:inhabitants;
    for(const p of options){
      if(!p||p.spawnPending||!p.root.visible||!p.near.visible||viewer.region!==p.space.region)continue;
      const at=p.space.global(p.x,p.z),distance=Math.hypot(viewer.x-at.x,viewer.z-at.z)*sceneScale;
      if((!best||distance<best.distance)&&distance<=40+p.radius*sceneScale)best=record(p,distance);
    }
    return best;
  }
  function withdraw(key){
    const p=byKey.get(key);if(!p)return false;
    p.cooldown=p.kind==='boss'?90:48;p.root.visible=false;p.path=null;p.hits=0;
    if(p.shield)resetShield(p);
    if(p.speciesId===4694)coreStep=0;
    return true;
  }
  const prompts=['轻触卷叶鳄兰','触摸较高的绿矿石','轻触紫花苞','点亮共鸣矿石'];
  function hint(lat,lon){
    const v=chart(lat,lon);
    const room=surface.sites.find(s=>v.region===surface.placement(s).region&&Math.hypot(v.x-s.x,v.z-s.z)<25);
    if(room?.id==='core'&&coreStep<4)return '地心晶脉 · '+prompts[coreStep]+'（点按或靠近按 E）';
    if(room?.id==='forest')return '林间调查 · 装备喷射器，连续照射蘑菇怪护膜；洞边也能找到依依';
    return '';
  }
  function interact(caster,lat,lon,flameTool=false){
    const visitor=chart(lat,lon),candidates=[];
    for(const p of inhabitants){
      if(!p.near.visible||!p.root.visible||visitor.region!==p.space.region||!fieldLock(p))continue;
      candidates.push({x:p.x,z:p.z,space:p.space,root:p.shield||p.root,p});
    }
    if(coreStep<4)for(const sw of switches)if(sw.near.visible)candidates.push(sw);
    let best=null,range=Infinity,hitPoint=null;
    for(const c of candidates){
      if(visitor.region!==c.space.region)continue;
      const at=c.space.global(c.x,c.z),distance=Math.hypot(visitor.x-at.x,visitor.z-at.z)*sceneScale;
      const reach=(caster?22:4)+(c.p?.radius||0)*sceneScale;
      if(distance>reach)continue;
      c.root.updateWorldMatrix(true,true);
      const hit=caster?caster.intersectObject(c.root,true)[0]:null,d=caster?hit?.distance:distance;
      if(d!==undefined&&d<range){range=d;best=c;hitPoint=hit?.point.clone()||null;}
    }
    if(!best)return null;
    const p=best.p;
    if(p){
      if(!flameTool)return {message:'先去赛尔号实验室领取并装备火焰喷射器',effect:null};
      const target=hitPoint||(p.shield?.visible?p.shield.localToWorld(new T.Vector3(0,0,1)):
        p.root.localToWorld(new T.Vector3(0,p.size*.48,0)));
      const flameResult=message=>({message,effect:'flame',target});
      if(p.shield){
        const now=performance.now();shieldVisual(p,now);p.hits++;
        if(p.hits>=3){p.shield.visible=false;p.radius=p.bodyRadius;return flameResult('护膜消散 · 可以挑战蘑菇怪了');}
        p.shieldDeadline=now+shieldWindowMs;shieldVisual(p,now);
        return flameResult('护膜'+(p.hits===1?'开始变暗':'已变黑')+' · 连续照射 '+p.hits+' / 3');
      }
      p.hits++;
      const needed=p.speciesId===83?3:1;
      return flameResult(p.hits<needed?'火焰照射 '+p.hits+' / '+needed:'精灵停在洞口 · 可以接触了');
    }
    if(best.index!==coreStep)return {message:'晶脉尚未响应 · 请先'+prompts[coreStep],effect:null};
    coreStep++;
    const seam=switches.find(s=>s.index===3);
    if(seam){seam.mat.emissive.setHex(coreStep>=3?0x36dacf:0x132a22);seam.mat.emissiveIntensity=coreStep>=3?.78:.42;}
    return {message:coreStep===4?'共鸣矿石亮起 · 石晶晶出现了':'晶脉传来回响 · 接下来'+prompts[coreStep],effect:null};
  }
  function obstacleTop(x,z,footprint,region){
    let top=-Infinity;
    for(const sw of switches){
      if(sw.space.region!==region)continue;
      const q=sw.space.global(sw.x,sw.z);if(Math.hypot(x-q.x,z-q.z)>=footprint+.74*KLOSE_ITEM_SCALE)continue;
      const at=sw.space.at(sw.x,sw.z);
      top=Math.max(top,surface.height(at.lat,at.lon)+sw.top);
    }
    return top;
  }
  return {install,update,observation,withdraw,interact,hint,inhabitants,obstacleTop};
}
