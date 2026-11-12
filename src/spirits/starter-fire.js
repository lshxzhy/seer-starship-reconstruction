// Classic fire starters, +Z forward and neutral soles at y=0.
// Identity and portrait: https://seer.61.com/main/spirit/{7,8,9}.html
// https://seerh5.61.com/resource/assets/pet/head/{7,8,9}.png
// Full original battle artwork preserved by BWIKI:
// 7 https://patchwiki.biligame.com/images/seer/1/1d/ok5ctno6prsls5psa3ld5e4z0g9iys3.png
// 8 https://patchwiki.biligame.com/images/seer/e/ef/5v6kqqmhkotfad38pajwh333i77rynw.png
// 9 https://patchwiki.biligame.com/images/seer/e/e0/3w4gnim5srjbswbyt4r7fpx7jjjg4y7.png
// Each evolution has its own anatomy. Hidden rear surfaces are a restrained
// volume reconstruction; the original portraits do not justify a long monkey tail.
function createStarterFireFigure(T,id){
  id=Number(id);if(id!==7&&id!==8&&id!==9)return null;
  const root=new T.Group(),body=new T.Group();root.add(body);
  root.name={7:'小火猴',8:'烈火猴',9:'烈焰猩猩'}[id];
  const geometrySet=new Set(),materials=new Map(),motions=[],flames=[];
  const sphere=new T.SphereGeometry(1,32,22);geometrySet.add(sphere);
  const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),tau=Math.PI*2;
  const orange=0xf66513,shade=0xbd4619,apricot=0xffa12a,cream=0xffe5bb,light=0xfff6dc;
  const brown=0x6d2b19,dark=0x461c17,yellow=0xffdd32,hot=0xfff69a;
  function paint(colour,glow=0){
    const key=colour+'/'+glow;if(!materials.has(key)){
      const c=new T.Color(colour).convertSRGBToLinear();
      materials.set(key,new T.MeshStandardMaterial({color:c,roughness:.64,
        emissive:glow?c:0,emissiveIntensity:glow}));
    }
    return materials.get(key);
  }
  function mesh(g,colour,parent=body,tissue=null,glow=0){
    geometrySet.add(g);const part=new T.Mesh(g,paint(colour,glow));
    part.castShadow=part.receiveShadow=true;parent.add(part);
    return tissue?finishSpiritPart(part,tissue,materials):part;
  }
  function oval(colour,x,y,z,rx,ry,rz,parent=body,tissue=null){
    const part=mesh(sphere,colour,parent,tissue);part.position.set(x,y,z);part.scale.set(rx,ry,rz);return part;
  }
  function group(x,y,z,parent=body){const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}
  function tracked(g,axis,amount,speed,phase=0){motions.push({g,axis,base:g.rotation[axis],amount,speed,phase});return g;}
  function geometry(positions,indices){
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    g.setIndex(indices);g.computeVertexNormals();return g;
  }
  function stroke(colour,points,r,parent=body,glow=0){
    return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>v(...p))),
      Math.max(20,points.length*6),r,8,false),colour,parent,null,glow);
  }
  // Closed tapered sections. angle increases from normal toward binormal;
  // angle x path gives the outward surface normal, with opposite end caps.
  function sweep(colour,points,widths,depths,parent=body,tissue=null,glow=0){
    const curve=new T.CatmullRomCurve3(points.map(p=>v(...p))),rows=36,sides=20;
    const f=curve.computeFrenetFrames(rows,false),positions=[],indices=[];
    for(let j=0;j<=rows;j++){
      const t=j/rows,q=t*(widths.length-1),k=Math.min(widths.length-2,Math.floor(q)),u=q-k;
      const w=T.MathUtils.lerp(widths[k],widths[k+1],u),d=T.MathUtils.lerp(depths[k],depths[k+1],u),p=curve.getPointAt(t);
      for(let i=0;i<sides;i++){
        const a=i*tau/sides,at=p.clone().addScaledVector(f.normals[j],Math.cos(a)*w).addScaledVector(f.binormals[j],Math.sin(a)*d);
        positions.push(at.x,at.y,at.z);
        if(j<rows){const n=j*sides+i,next=j*sides+(i+1)%sides;indices.push(n,next,n+sides,next,next+sides,n+sides);}
      }
    }
    for(const [j,reverse] of [[0,true],[rows,false]]){
      const p=curve.getPointAt(j/rows),c=positions.length/3;positions.push(p.x,p.y,p.z);
      for(let i=0;i<sides;i++){const a=j*sides+i,b=j*sides+(i+1)%sides;indices.push(c,reverse?b:a,reverse?a:b);}
    }
    return mesh(geometry(positions,indices),colour,parent,tissue,glow);
  }
  function rowAt(rows,y){
    let k=1;while(k<rows.length-1&&rows[k][0]<y)k++;
    const a=rows[k-1],b=rows[k],t=T.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1),f=t*t*(3-2*t);
    return [T.MathUtils.lerp(a[1],b[1],f),T.MathUtils.lerp(a[2],b[2],f),T.MathUtils.lerp(a[3],b[3],f)];
  }
  function surfaceLine(rows,points,offset=.009){
    return points.map(([x,y])=>{
      const [rx,rz,cz]=rowAt(rows,y);
      return [x,y,cz+rz*Math.sqrt(Math.max(0,1-(x/rx)**2))+offset];
    });
  }
  function skin(rows,colour,parent=body,tissue='velvet'){
    const positions=[],indices=[],rings=60,sides=64,lo=rows[0][0],hi=rows[rows.length-1][0];
    for(let j=0;j<=rings;j++){
      const y=T.MathUtils.lerp(lo,hi,j/rings),[rx,rz,cz]=rowAt(rows,y);
      for(let i=0;i<sides;i++){
        const a=i*tau/sides;positions.push(rx*Math.sin(a),y,cz+rz*Math.cos(a));
        if(j<rings){const n=j*sides+i,next=j*sides+(i+1)%sides;indices.push(n,next,n+sides,next,next+sides,n+sides);}
      }
    }
    for(const [j,reverse] of [[0,true],[rings,false]]){
      const y=j?hi:lo,cz=rowAt(rows,y)[2],c=positions.length/3;positions.push(0,y,cz);
      for(let i=0;i<sides;i++){const a=j*sides+i,b=j*sides+(i+1)%sides;indices.push(c,reverse?b:a,reverse?a:b);}
    }
    return mesh(geometry(positions,indices),colour,parent,tissue);
  }
  // Coloured regions follow the head or torso, retaining a readable profile.
  function patch(rows,lo,hi,width,colour,parent=body,centre=0){
    const p=[],ix=[],rings=28,sides=36;
    for(let j=0;j<=rings;j++){
      const t=j/rings,y=T.MathUtils.lerp(lo,hi,t),[rx,rz,cz]=rowAt(rows,y);
      const w=typeof width==='function'?width(t):width;
      for(let i=0;i<=sides;i++){
        const a=centre+(i/sides*2-1)*w;p.push((rx+.003)*Math.sin(a),y,cz+(rz+.004)*Math.cos(a));
        if(j<rings&&i<sides){const n=j*(sides+1)+i;ix.push(n,n+1,n+sides+1,n+1,n+sides+2,n+sides+1);}
      }
    }
    return mesh(geometry(p,ix),colour,parent);
  }
  // Rounded, closed profile panels provide finger notches and angular cheek
  // edges. Extrusion owns both front/back winding; no double-sided materials.
  function plate(colour,outline,depth,parent=body,bevel=.012){
    const shape=new T.Shape();outline.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
    const g=new T.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:bevel>0,bevelSize:bevel,
      bevelThickness:bevel,bevelSegments:3,curveSegments:20});g.translate(0,0,-depth/2);
    return mesh(g,colour,parent);
  }
  function eye(parent,x,y,z,w,h,ang=0,fiery=false){
    const g=group(x,y,z,parent);g.rotation.z=ang;
    oval(brown,0,0,0,w*1.12,h*1.10,.026,g);
    oval(fiery?yellow:0xa8522c,0,0,.022,w,h,.025,g);
    const pupil=oval(fiery?apricot:dark,.006,-.004,.045,w*.77,h*.84,.016,g);
    if(fiery){pupil.material=paint(hot,.23);}
    oval(0xffffff,-w*.22,h*.34,.060,w*.32,h*.36,.009,g);
    if(!fiery)oval(light,w*.31,-h*.39,.059,w*.16,h*.15,.008,g);
    return g;
  }
  function tongue(parent,points,widths,depths,colour=orange,glow=0){
    return sweep(colour,points,widths,depths,parent,null,glow);
  }
  function flame(parent,x,y,z,w,h,depth=.075){
    const fire=group(x,y,z,parent);flames.push({g:fire,phase:flames.length*1.43});
    tongue(fire,[[-.22*w,0,0],[-.36*w,.33*h,0],[-.18*w,.68*h,-.015],[.01*w,h,-.026]],
      [.23*w,.28*w,.16*w,.003],[depth,depth*.95,depth*.59,.003],yellow,.17);
    tongue(fire,[[.16*w,.005,0],[.30*w,.27*h,0],[.18*w,.53*h,.006],[.24*w,.78*h,-.018]],
      [.23*w,.24*w,.12*w,.002],[depth*.9,depth*.81,depth*.40,.002],yellow,.17);
    tongue(fire,[[0,0,.025],[.02*w,.22*h,.048],[-.06*w,.40*h,.048],[.05*w,.61*h,.022]],
      [.15*w,.16*w,.075*w,.002],[depth*.8,depth*.65,depth*.33,.002],hot,.22);
    return fire;
  }
  function toes(parent,x,y,z,w,colour){
    for(let i=0;i<3;i++)oval(colour,x+(i-1)*w*.53,y,z+(i===1?.015:0),w*.32,.050,w*.62,parent,'cuticle');
  }
  function infant(){
    // #007: four blunt crown lobes, the curled forelock and an uninterrupted
    // pale face/neck/belly, with small leaf-like arms and no burning fist cuffs.
    const torso=[[.12,.035,.05,0],[.22,.20,.15,0],[.38,.235,.17,0],[.59,.185,.14,.01],[.70,.11,.10,.015]];
    skin(torso,orange);patch(torso,.22,.665,t=>.10+.83*Math.sin(Math.PI*t)**.35,cream);
    patch(torso,.29,.50,t=>.48*Math.sin(Math.PI*t)**.55,light);
    const head=tracked(group(0,.75,0),'y',.035,1.4);head.position.y=.75;
    const headRows=[[-.15,.08,.09,.03],[-.10,.225,.17,.01],[.04,.345,.245,0],
      [.24,.36,.245,-.025],[.41,.33,.215,-.040],[.55,.26,.18,-.045],[.65,.12,.12,-.04]];
    skin(headRows,orange,head,'cuticle');
    patch(headRows,-.12,.255,t=>.32+(.97-.32)*Math.sin(Math.PI*t)**.26,cream,head);
    for(const s of [-1,1]){
      eye(head,s*.176,.075,.225,.093,.119,s*-.075);
      // The ears are tucked into the head. The conspicuous side shapes in
      // the source are hands, not a second pair of large projecting ears.
      oval(orange,s*.319,.045,-.045,.040,.062,.054,head,'cuticle');
      const arm=group(s*.19,.51,-.006);arm.rotation.z=s<0?-.91:.05;
      tracked(arm,'z',.055,2.0,s*.6);
      sweep(orange,[[0,0,0],[s*.10,-.08,.005],[s*.20,-.17,.025]],
        [.055,.066,.041],[.048,.047,.030],arm,'velvet');
      const hand=plate(orange,[[0,.04],[s*.10,.0],[s*.14,-.085],[s*.09,-.073],[s*.10,-.12],
        [s*.05,-.097],[s*.04,-.15],[-s*.015,-.08]],.050,arm,.009);hand.position.set(s*.16,-.13,.023);
      const foot=oval(orange,s*.139,.091,.020,.086,.091,.118,body,'velvet');foot.rotation.z=s*.13;
    }
    // Crown lobes have round ends rather than the old three leaf-shaped spikes.
    for(const [x,end,h,w] of [[-.245,-.245,.34,.085],[-.087,-.094,.46,.098],[.083,.115,.48,.099],[.242,.267,.35,.083]]){
      tongue(head,[[x,.42,-.055],[x,.59,-.056],[end,.69+h*.44,-.065],[end,.53+h-.018,-.07]],
        [w,w,w*.85,w*.72],[.142,.132,.099,.080],orange);
      oval(orange,end,.53+h-.018,-.07,w*.72,.062,.080,head,'cuticle');
      tongue(head,[[x,.52,.080],[x,.63,.081],[end,.66+h*.26,.067]],
        [w*.34,w*.37,.005],[.008,.009,.004],apricot);
    }
    const curl=[];for(let i=0;i<=50;i++){const t=i/50,a=-.55+t*Math.PI*1.85,r=.091*(1-.76*t);
      curl.push([-.055+r*Math.cos(a),.325+r*Math.sin(a),.216]);}
    stroke(shade,curl,.012,head);
    stroke(brown,surfaceLine(headRows,[[-.070,-.008],[-.064,-.049],[-.018,-.055],[0,-.029],
      [.025,-.055],[.065,-.050],[.070,-.012]]),.0065,head);
    oval(0xe9ba87,0,-.113,.135,.043,.010,.013,head);
    // The back stays short and rounded, without adding an unshown fire tail.
    oval(shade,0,.32,-.156,.114,.144,.033,body,'velvet');
  }
  function adolescent(){
    // #008: the head is a flame-shaped wedge, with a compact torso below it,
    // inward brows and broad bent side fists. It does not reuse the infant head.
    const torso=[[.16,.035,.04,-.005],[.23,.205,.16,-.02],[.48,.245,.20,-.035],
      [.72,.195,.17,-.015],[.91,.12,.13,.005]];
    skin(torso,shade);patch(torso,.24,.83,t=>.10+.70*Math.sin(Math.PI*t)**.45,cream);
    const head=tracked(group(0,.85,0),'y',.027,1.15);
    const rows=[[-.11,.08,.08,.08],[-.03,.235,.18,.02],[.18,.33,.25,-.04],
      [.39,.365,.27,-.08],[.62,.31,.23,-.10],[.77,.17,.16,-.12],[.83,.02,.04,-.13]];
    skin(rows,orange,head,'cuticle');
    patch(rows,-.08,.205,t=>.06+.94*Math.sin(Math.PI*t)**.34,cream,head);
    for(const s of [-1,1]){
      eye(head,s*.143,.102,.206,.082,.096,s*.22);
      stroke(shade,surfaceLine(rows,[[s*.045,.198],[s*.13,.213],[s*.225,.251]],.014),.026,head);
      oval(shade,s*.307,.10,-.055,.042,.070,.061,head,'cuticle');
      const arm=tracked(group(s*.225,.77,-.025),'z',.035,1.6,s*.7);
      sweep(shade,[[0,0,0],[s*.13,.10,-.015],[s*.235,.16,.08],[s*.285,.07,.13]],
        [.105,.14,.16,.145],[.105,.11,.14,.12],arm,'velvet');
      const fist=group(s*.267,.070,.10,arm);fist.rotation.z=-s*.18;
      oval(orange,0,0,0,.178,.174,.146,fist,'cuticle');
      for(let i=0;i<3;i++)oval(orange,s*(.055+.045*i),-.071-i*.030,.049,.053,.072,.095,fist,'cuticle');
      oval(shade,-s*.085,-.055,.119,.067,.089,.046,fist);
      for(let i=0;i<2;i++)stroke(shade,[[s*(.055+.046*i),-.06-i*.035,.144],
        [s*(.083+.046*i),-.095-i*.035,.145],[s*(.097+.046*i),-.12-i*.035,.112]],.006,fist);
      tongue(fist,[[-s*.08,.10,.12],[s*.01,.14,.126],[s*.10,.09,.122],[s*.13,.04,.107]],
        [.024,.044,.034,.003],[.006,.008,.008,.003],apricot);
      sweep(orange,[[s*.125,.30,-.015],[s*.18,.17,.02],[s*.20,.085,.105]],
        [.11,.10,.075],[.10,.091,.071],body,'velvet');
      oval(orange,s*.195,.058,.145,.125,.058,.16,body,'cuticle');toes(body,s*.195,.050,.255,.10,orange);
    }
    // Large connected orange tongues lean behind the yellow forehead flame.
    for(const [x,lean,h,w] of [[-.22,-.14,.65,.145],[.015,.025,.85,.17],[.235,.10,.58,.14]]){
      tongue(head,[[x,.34,-.09],[x+lean*.2,.57,-.10],[x+lean,.72+h*.25,-.15],
        [x+lean*.64,.48+h,-.20]], [w,w*1.06,w*.62,.003],[.18,.16,.087,.003],orange);
      tongue(head,[[x+.018,.44,.075],[x+lean*.4,.62,.070],[x+lean*.82,.56+h*.59,.015]],
        [w*.36,w*.40,.003],[.014,.017,.003],apricot);
    }
    flame(head,0,.235,.223,.28,.55,.049);
    stroke(brown,surfaceLine(rows,[[-.07,-.055],[0,-.072],[.065,-.052]]),.006,head);
    // A short rear flame fan emerges from the rump, rather than a rod-like tail.
    const tail=tracked(group(.055,.34,-.19),'y',.045,1.5,.6);
    tongue(tail,[[0,0,0],[.12,.14,-.08],[.14,.37,-.10],[.10,.59,-.12]],
      [.08,.115,.080,.003],[.075,.07,.042,.003],orange);
    tongue(tail,[[.03,.06,-.02],[.14,.25,-.06],[.11,.43,-.08]],
      [.040,.055,.002],[.034,.028,.002],apricot);
  }
  function adult(){
    // #009: forward head, high shoulder mantle, long planted forearms and
    // small bent hind legs. The yellow fists and flame crown frame the pale face.
    const torso=[[.29,.07,.10,-.13],[.43,.25,.235,-.16],[.75,.325,.29,-.16],
      [1.06,.405,.31,-.13],[1.31,.47,.29,-.115],[1.48,.35,.25,-.12],[1.57,.09,.12,-.14]];
    skin(torso,shade);patch(torso,.56,1.24,t=>.12+.69*Math.sin(Math.PI*t)**.35,cream);
    patch(torso,.62,.93,t=>.43*Math.sin(Math.PI*t)**.65,light);
    const head=tracked(group(0,1.28,.20),'y',.018,.95);
    const rows=[[-.20,.035,.04,.035],[-.13,.19,.14,.035],[.02,.255,.205,.01],
      [.22,.275,.21,-.01],[.35,.235,.18,-.035],[.43,.07,.08,-.06]];
    skin(rows,shade,head,'velvet');
    const face=plate(cream,[[-.24,.14],[-.14,.11],[0,.07],[.14,.11],[.24,.14],
      [.225,.005],[.265,-.015],[.198,-.06],[.224,-.096],[.12,-.15],[0,-.17],
      [-.12,-.15],[-.224,-.096],[-.198,-.06],[-.265,-.015],[-.225,.005]],.055,head,.011);
    face.position.z=.183;
    for(const s of [-1,1]){
      const e=eye(head,s*.125,.078,.230,.088,.073,s*.24,true);
      e.scale.y=.89;
      stroke(brown,[[s*.030,.169,.250],[s*.13,.167,.244],[s*.235,.210,.184]],.025,head);
      const ear=plate(shade,[[0,.07],[s*.105,.095],[s*.13,.018],[s*.08,-.078],[0,-.066]],.085,head,.013);
      ear.position.set(s*.247,.04,-.015);ear.rotation.y=s*.50;
      // Joint roots remain inside the shoulder and elbow volumes.
      const arm=tracked(group(s*.405,1.285,-.09),'z',.013,1.3,s*.8);
      sweep(shade,[[0,0,0],[s*.12,-.19,.07],[s*.17,-.43,.17],[s*.22,-.67,.29],[s*.24,-.90,.40]],
        [.185,.205,.18,.18,.165],[.19,.205,.18,.17,.14],arm,'velvet');
      for(const [y,z,w,h] of [[-.12,.025,.13,.32],[-.38,.115,.12,.32],[-.62,.225,.11,.29]]){
        tongue(arm,[[s*.10,y-.08,z],[s*.17,y+.02,z-.01],[s*.22,y+h*.43,z-.045],[s*.25,y+h,z-.07]],
          [w,w*.86,w*.48,.003],[.10,.09,.045,.003],orange);
        tongue(arm,[[s*.02,y-.05,z+.155],[s*.075,y+.07,z+.14],[s*.12,y+h*.55,z+.09]],
          [.035,.047,.003],[.012,.012,.003],apricot);
      }
      const fist=group(s*.245,-.93,.42,arm);fist.rotation.x=.10;fist.rotation.z=-s*.10;
      oval(0xcf731f,0,0,0,.205,.214,.18,fist,'cuticle');
      // Four folded fingers and the opposing thumb are individually readable.
      for(let i=0;i<4;i++){
        const x=(i-1.5)*.083;oval(apricot,x,-.080,.102,.058,.105,.101,fist,'cuticle');
        stroke(shade,[[x-.024,-.030,.193],[x,-.040,.208],[x+.024,-.030,.193]],.006,fist);
      }
      oval(0xb66c27,-s*.135,.02,.132,.079,.111,.092,fist,'cuticle');
      oval(0xae6b29,0,.045,.164,.118,.126,.034,fist);
      stroke(shade,[[-.07,.13,.177],[-.101,.06,.198],[-.095,-.020,.197]],.008,fist);
      flame(fist,s*.142,-.115,.015,.28,.54,.065).rotation.z=-s*.15;
      const inner=flame(fist,-s*.13,-.095,.012,.17,.40,.052);inner.rotation.z=s*.27;
      tongue(fist,[[-s*.15,-.14,.00],[0,-.20,.10],[s*.13,-.12,.15]],
        [.04,.065,.025],[.036,.042,.025],yellow,.14);
      sweep(shade,[[s*.195,.53,-.18],[s*.31,.30,-.24],[s*.29,.105,-.105]],
        [.17,.165,.10],[.15,.14,.10],body,'velvet');
      oval(shade,s*.29,.062,.018,.145,.062,.18,body,'cuticle');toes(body,s*.29,.050,.148,.12,orange);
    }
    const beard=plate(brown,[[-.22,-.12],[0,-.19],[.22,-.12],[.125,-.34],[-.02,-.42],[-.16,-.29]],.08,head,.010);
    beard.position.z=.106;
    const nose=plate(brown,[[-.041,.015],[.025,.002],[.010,-.043]],.021,head,.004);nose.position.set(0,-.022,.239);
    stroke(dark,[[-.089,-.105,.234],[-.024,-.091,.246],[.031,-.092,.246],[.092,-.109,.233]],.006,head);
    stroke(light,[[-.051,-.109,.242],[.015,-.105,.251],[.056,-.113,.240]],.007,head);
    flame(head,0,.19,.15,.49,.72,.12);
    // Tall red-orange shoulder/back tongues stay behind the yellow crown.
    for(const [x,lean,h,w] of [[-.33,-.09,.59,.18],[.11,-.06,.72,.22],[.37,.07,.56,.19]]){
      tongue(body,[[x,1.16,-.23],[x+lean*.3,1.43,-.28],[x+lean,1.58+h*.26,-.30],[x+lean*.7,1.35+h,-.34]],
        [w,w*1.06,w*.62,.003],[.18,.18,.095,.003],orange);
      tongue(body,[[x,1.34,-.045],[x+lean*.5,1.54,-.07],[x+lean,1.39+h*.67,-.15]],
        [w*.27,w*.37,.002],[.009,.012,.002],apricot);
    }
    const back=tracked(group(.04,.51,-.37),'y',.019,1.05,.8);
    tongue(back,[[0,0,0],[.18,.13,-.12],[.22,.39,-.14],[.13,.68,-.13]],
      [.12,.15,.105,.003],[.09,.11,.062,.003],orange);
  }
  if(id===7)infant();else if(id===8)adolescent();else adult();
  let elapsed=0;
  return {root,update(dt){
    elapsed+=Math.max(0,Math.min(Number(dt)||0,.1));
    // Keep the body origin and soles fixed; head, shoulder and flame motion is local.
    for(const m of motions)m.g.rotation[m.axis]=m.base+m.amount*Math.sin(elapsed*m.speed+m.phase);
    for(const f of flames){f.g.scale.y=1+.018*Math.sin(elapsed*4.1+f.phase);f.g.rotation.y=.018*Math.sin(elapsed*2.7+f.phase);}
  },dispose(){geometrySet.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
