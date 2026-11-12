// #011/#012 and their shiny forms #165/#166. Silhouettes were compared with
// Taomee's numbered spirit pages and full battle art preserved at
// https://wiki.biligame.com/seer/精灵:11 (likewise 12,165,166).
// The long bill/feathered ears of 比波 and the hanging crest, V ruff, fan tail
// and banded toes of 波克尔 are separate sculpts. Hidden backs are 3D additions.
function createBirdEvolutionFigure(T,id){
  if(![11,12,165,166].includes(id))return null;
  const grown=id===12||id===166,shiny=id>=165;
  const root=new T.Group(),body=new T.Group();root.add(body);root.name='bird-evolution-'+id;
  const sphere=new T.SphereGeometry(1,32,24),geometries=new Set([sphere]),materials=new Map();
  const pink=shiny?0xe7e1ed:0xf1a8bf,light=shiny?0xfffcf1:0xffdce5;
  const tip=shiny?0xf5e397:0x482132;
  const bill=shiny?0xe388a5:0x237fd1,feetColour=shiny?0xeb9b91:0x4388bc;
  const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),tau=Math.PI*2,eyes=[],wings=[],tails=[];
  function paint(colour){
    if(!materials.has(colour))materials.set(colour,new T.MeshStandardMaterial({
      color:new T.Color(colour).convertSRGBToLinear(),roughness:.61}));
    return materials.get(colour);
  }
  function mesh(g,colour,parent=body,tissue=null){
    geometries.add(g);let material=paint(colour);
    if(g.attributes.color){material=paint(0xffffff).clone();material.vertexColors=true;materials.set('coloured-'+materials.size,material);}
    const m=new T.Mesh(g,material);m.castShadow=m.receiveShadow=true;parent.add(m);
    return tissue?finishSpiritPart(m,tissue,materials):m;
  }
  function oval(colour,x,y,z,rx,ry,rz,parent=body,tissue='feather'){
    const m=mesh(sphere,colour,parent,tissue);m.position.set(x,y,z);m.scale.set(rx,ry,rz);return m;
  }
  function stroke(colour,points,r,parent=body){
    return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>v(...p))),32,r,8,false),colour,parent);
  }
  function surface(positions,indices,colours){
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    if(colours)g.setAttribute('color',new T.Float32BufferAttribute(colours,3));
    g.setIndex(indices);g.computeVertexNormals();return g;
  }
  function feather(colour,points,width,depth=.035,end=colour,parent=body){
    const path=new T.CatmullRomCurve3(points.map(p=>v(...p))),rows=40,sides=18,p=[],ix=[],rgb=[];
    const base=new T.Color(colour).convertSRGBToLinear(),edge=new T.Color(end).convertSRGBToLinear(),tone=new T.Color();
    for(let j=0;j<=rows;j++){
      const t=j/rows,at=path.getPoint(t),tangent=path.getTangent(t),across=v(-tangent.y,tangent.x,0).normalize();
      const breadth=Math.pow(Math.sin(Math.PI*t),.68),notch=1-.055*Math.sin(t*18*Math.PI)**2;
      for(let k=0;k<sides;k++){
        const a=tau*k/sides,q=at.clone().addScaledVector(across,width*breadth*notch*Math.cos(a));
        q.z+=depth*breadth*Math.sin(a);p.push(q.x,q.y,q.z);
        tone.copy(base).lerp(edge,T.MathUtils.smoothstep(t,.69,.77));rgb.push(tone.r,tone.g,tone.b);
        if(j<rows){const n=j*sides+k,next=j*sides+(k+1)%sides;ix.push(n,next,n+sides,next,next+sides,n+sides);}
      }
    }
    const g=surface(p,ix,rgb),m=paint(0xffffff).clone();m.vertexColors=true;materials.set('feather-'+materials.size,m);
    const part=new T.Mesh(g,m);geometries.add(g);part.castShadow=part.receiveShadow=true;parent.add(part);
    return finishSpiritPart(part,'feather',materials);
  }
  function eyesAt(y,z,spread,size,parent=body){
    for(const s of [-1,1]){
      const eye=new T.Group();eye.position.set(s*spread,y,z);eye.rotation.y=s*.39;parent.add(eye);eyes.push(eye);
      oval(0x181723,0,0,0,size*.70,size,.018,eye,'iris');
      oval(shiny?0x626ca3:0x86519f,s*.006,-size*.25,.013,size*.43,size*.57,.012,eye,'iris');
      oval(0x14131f,-s*.007,size*.13,.024,size*.44,size*.65,.009,eye,'iris');
      oval(0xffffff,-size*.18,size*.35,.032,size*.22,size*.34,.006,eye,null);
    }
  }
  function beak(rows,colour,parent=body,innerFace=0){
    const p=[],ix=[],rgb=[],segments=32,sides=32;
    const outside=new T.Color(colour).convertSRGBToLinear(),inside=new T.Color(innerFace<0?0x8970a5:0x9b668f).convertSRGBToLinear(),tone=new T.Color();
    for(let j=0;j<=segments;j++){
      const q=j/segments*(rows.length-1),k=Math.min(rows.length-2,Math.floor(q)),t=q-k;
      const row=rows[k].map((a,c)=>T.MathUtils.lerp(a,rows[k+1][c],t));
      const [z,w,top,bottom]=row;
      for(let i=0;i<sides;i++){
        const a=i*tau/sides;p.push(w*Math.cos(a),(top+bottom)/2+(top-bottom)/2*Math.sin(a),z);
        if(innerFace){tone.copy(outside).lerp(inside,T.MathUtils.smoothstep(innerFace*Math.sin(a),.05,.25));rgb.push(tone.r,tone.g,tone.b);}
        if(j<segments){const n=j*sides+i,next=j*sides+(i+1)%sides;ix.push(n,next,n+sides,next,next+sides,n+sides);}
      }
    }
    return mesh(surface(p,ix,innerFace?rgb:null),colour,parent,'horn');
  }
  let lowerBill=null;
  if(!grown){
    oval(pink,0,.51,-.015,.235,.303,.205);oval(light,0,.48,.15,.16,.225,.079);
    oval(pink,0,.965,.014,.270,.269,.239);eyesAt(1.00,.203,.188,.092);
    // The young evolution's bill is nearly as long as its body, with a real
    // opening and tongue; its outline must not collapse to a small oval nose.
    beak([[.18,.103,1.035,.875],[.36,.174,1.133,.952],[.67,.131,1.242,1.120],
      [.91,.067,1.277,1.224],[1.08,.001,1.255,1.253]],bill,body,-1);
    lowerBill=new T.Group();lowerBill.position.set(0,.89,.20);body.add(lowerBill);
    beak([[0,.108,.005,-.076],[.22,.121,-.058,-.152],[.48,.081,-.140,-.228],
      [.69,.001,-.267,-.269]],shiny?0xc66a90:0x306fba,lowerBill,1);
    oval(0x6b2b54,0,.88,.258,.098,.052,.046,body,null);
    const tongue=oval(0xe98785,0,-.065,.28,.075,.030,.20,lowerBill,null);tongue.rotation.x=.16;
    for(const s of [-1,1]){
      const ear=new T.Group();ear.position.set(s*.16,1.115,-.04);body.add(ear);wings.push({g:ear,side:s,ear:true});
      for(let k=0;k<3;k++)feather(light,[[0,0,0],[s*(.105+.035*k),.20-.028*k,-.018],
        [s*(.20+.066*k),.41-.080*k,-.043]],.071-.007*k,.023,tip,ear);
      const wing=new T.Group();wing.position.set(s*.195,.64,-.016);body.add(wing);wings.push({g:wing,side:s});
      const pad=oval(light,s*.025,-.11,.015,.104,.206,.135,wing);pad.rotation.z=s*.26;
      for(let k=0;k<3;k++)feather(pink,[[s*.012,-.13,.091],[s*(.04+.018*k),-.23,.095],
        [s*(.025+.036*k),-.30,.087]],.030,.014,pink,wing);
      oval(light,s*.120,.125,.028,.066,.125,.079,body,'velvet');
    }
    const tail=new T.Group();tail.position.set(0,.39,-.18);body.add(tail);tails.push(tail);
    feather(pink,[[0,0,0],[0,.31,-.13],[0,.57,-.20]],.069,.035,tip,tail);
    feather(light,[[0,.49,-.171],[0,.58,-.192],[0,.63,-.20]],.060,.027,light,tail);
  }else{
    oval(pink,0,.60,-.014,.345,.381,.329);oval(light,0,.53,.185,.254,.275,.135);
    oval(pink,0,1.02,.02,.268,.402,.223);oval(pink,0,1.39,.055,.226,.247,.218);
    eyesAt(1.39,.237,.105,.045);
    for(const s of [-1,1])oval(shiny?0xf09ca7:0xf27799,s*.169,1.298,.219,.080,.052,.025);
    beak([[.235,.076,1.337,1.222],[.41,.077,1.255,1.136],[.60,.039,1.066,.998],
      [.75,.001,.904,.902]],bill);
    // Hanging crests loop high above the head and return towards the shoulders.
    for(const s of [-1,1]){
      feather(light,[[s*.10,1.50,-.026],[s*.17,1.82,-.08],[s*.34,1.83,-.098],
        [s*.42,1.49,-.095],[s*.37,1.04,-.06]],.129,.061,light);
      feather(shiny?0xcfc7dc:0xde91ac,[[s*.19,1.53,-.026],[s*.29,1.73,-.023],
        [s*.36,1.47,-.018],[s*.35,1.12,-.017]],.066,.024,shiny?0xcfc7dc:0xde91ac);
    }
    // Rolled forehead feather and the two long V-shaped chest plumes.
    feather(shiny?0xffe498:0xfff7ed,[[.11,1.56,.159],[-.02,1.59,.245],[-.12,1.70,.228],
      [-.05,1.76,.202],[.05,1.73,.217]],.052,.034);
    feather(shiny?0x513c67:0xee7198,[[0,1.26,.226],[0,1.02,.291],[0,.86,.337]],.143,.026);
    for(const s of [-1,1]){
      const ruff=shiny?0xf5e798:0xfffaf0;
      feather(ruff,[[s*.19,1.37,.172],[s*.30,1.12,.237],[s*.22,.85,.354],[0,.54,.389]],.117,.043,ruff);
      const wing=new T.Group();wing.position.set(s*.28,.84,-.065);body.add(wing);wings.push({g:wing,side:s});
      const upper=oval(pink,s*.030,-.082,.015,.127,.211,.208,wing);upper.rotation.z=-s*.18;
      for(let k=0;k<4;k++)feather(light,[[s*.010,-.056,-.032],[s*(.08+.016*k),-.17,-.112-.035*k],
        [s*(.11+.032*k),-.28,-.205-.043*k]],.051,.025,shiny?0xe6d782:tip,wing);
    }
    const tail=new T.Group();tail.position.set(0,.57,-.255);body.add(tail);tails.push(tail);
    for(let k=-2;k<=2;k++)feather(light,[[0,0,0],[k*.105,.14+(.09-Math.abs(k)*.025),-.28],
      [k*.22,.47-Math.abs(k)*.09,-.66+Math.abs(k)*.085]],.111,.041,tip,tail);
    for(const s of [-1,1]){
      oval(feetColour,s*.20,.22,.010,.060,.153,.062,body,'scute');
      for(const y of [.16,.22,.28]){
        const band=mesh(new T.TorusGeometry(.061,.006,6,24),shiny?0x8b4c58:0x1a3658);band.position.set(s*.20,y,.01);band.rotation.x=Math.PI/2;
      }
      for(let k=-1;k<=1;k++){
        const toe=new T.Group();toe.position.set(s*.20,.060,.045);toe.rotation.y=k*.28;body.add(toe);
        stroke(feetColour,[[k*.028,.022,0],[k*.04,.018,.115],[k*.042,-.005,.272]],.045,toe);
        oval(feetColour,k*.042,-.005,.272,.045,.045,.052,toe,'scute');
        for(const z of [.09,.16,.23]){
          const band=mesh(new T.TorusGeometry(.046,.0055,6,22),shiny?0x8b4c58:0x1a3658,toe);
          band.position.set(k*.04,.013-(z-.09)*.13,z);band.rotation.x=.08;
        }
      }
    }
  }
  let t=0;
  return {root,update(dt,effort=0){
    t+=Math.max(0,Math.min(.12,dt));const stride=T.MathUtils.clamp(effort,0,1);
    body.rotation.z=.014*Math.sin(t*(1.8+stride*2));
    for(const w of wings){w.g.rotation.z=w.side*Math.sin(t*(w.ear?1.7:2.2+stride*3))*(w.ear?.028:.055+stride*.08);}
    for(const tail of tails)tail.rotation.y=.08*Math.sin(t*1.6);
    if(lowerBill)lowerBill.rotation.x=.028*(1+Math.sin(t*1.5));
    const blink=1-.88*Math.max(0,1-Math.abs(t%5.1-4.8)/.10);
    for(const eye of eyes)eye.scale.y=blink;
  },dispose(){for(const g of geometries)g.dispose();for(const m of materials.values())m.dispose();}};
}
