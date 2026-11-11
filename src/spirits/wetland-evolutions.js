// Supplementary ordinary evolutions of the wetland families. The colour blocks,
// crest, armour, limbs and silhouettes follow each form's game illustrations.
function createWetlandEvolution(T,id){
  const kinds={
    23:'crestedBird',24:'crestedBird',31:'shell',109:'axolotl',110:'axolotl',
    154:'bee',155:'bee',199:'shellfish',204:'crystal',250:'blimp',251:'blimp',
    282:'lark',283:'lark',290:'fossilFish',294:'sprout',295:'sprout',345:'sickleBird',
    388:'orchid',389:'orchid',400:'seaDragon',415:'rhino',455:'thunder',472:'sprig',473:'sprig',554:'stag',
    575:'jester',619:'fennec',647:'lop',691:'guardian',704:'spikefish',705:'spikefish',
    733:'gilt',739:'petal',786:'stream',813:'bear',815:'ribbon'
  };
  if(!kinds[id])return null;
  const root=new T.Group(),body=new T.Group();root.add(body);root.name='图鉴 '+id;
  const globe=new T.SphereGeometry(1,20,14),pointed=new T.ConeGeometry(1,1,10);
  const palette=new Map(),wingParts=[],extras=[];
  const white=0xf5f3e5,dark=0x263148,gold=0xf8c934,green=0x69a664,cream=0xf5dfa0;
  function mat(c){
    if(!palette.has(c))palette.set(c,new T.MeshStandardMaterial({color:new T.Color(c).convertSRGBToLinear(),roughness:.52}));
    return palette.get(c);
  }
  function oval(x,y,z,w,h,d,c,rz=0){
    const m=new T.Mesh(globe,mat(c));m.position.set(x,y,z);m.scale.set(w,h,d);m.rotation.z=rz;body.add(m);return m;
  }
  function segment(a,b,r,c,point=false,flat=1){
    const v=new T.Vector3(...a),d=new T.Vector3(...b).sub(v),len=d.length();
    const m=new T.Mesh(point?pointed:globe,mat(c));
    m.position.copy(v).addScaledVector(d,.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());
    m.scale.set(r,point?len:len*.5+r*.17,r*flat);body.add(m);return m;
  }
  const tip=(a,b,r,c,flat)=>segment(a,b,r,c,true,flat);
  function eyes(y,z,x=.17,r=.08,colour=dark){
    for(const k of [-1,1]){oval(k*x,y,z,r*.78,r,r*.37,colour,k*.08);oval(k*x-r*.14,y+r*.32,z+r*.34,r*.22,r*.23,r*.12,white);}
  }
  function biped(c,h=.56){
    oval(0,h,0,.28,.34,.24,c);
    for(const k of [-1,1]){segment([k*.15,.48,0],[k*.17,.12,.08],.09,c);oval(k*.17,.08,.13,.13,.075,.14,c);}
  }
  function paws(c,s=1){
    for(const k of [-1,1])for(const z of [-.26,.25]){
      segment([k*.20,.49,z],[k*.28,.13,z+.05],.095*s,c);
      oval(k*.28,.09,z+.1,.12*s,.08*s,.15*s,c);
    }
  }
  function wings(y,z,span,c,low=false){
    for(const k of [-1,1]){
      const w=segment([k*.16,y,z],[k*span,low?y-.36:y+.26,z-.12],.14,c,false,.50);wingParts.push(w);
      for(let j=0;j<3;j++)tip([k*(span-.16),y+(low?-.18:.14),z-.08-j*.065],[k*(span-.04+j*.045),y+(low?-.42:.23)-j*.075,z-.18-j*.075],.068,c,.48);
    }
  }
  function fish(bodyC,finC,tall=false){
    oval(0,.50,0,.32,.27,.43,bodyC);oval(0,.53,.20,.30,.23,.27,bodyC);eyes(.57,.40,.199,.069);
    for(const k of [-1,1]){
      const m=segment([k*.18,.42,.03],[k*.48,.25,-.13],.12,finC,false,.48);wingParts.push(m);
      tip([0,.50,-.34],[k*.23,.55+(tall?.17:0),-.68],.12,finC,.55);
    }
  }
  const shape=kinds[id];
  if(shape==='crestedBird'){
    const blue=0x76d3ee;oval(0,.78,0,.21,.33,.20,blue);oval(0,.94,.09,.206,.18,.17,white);
    eyes(.97,.228,.082,.055);tip([0,.875,.17],[0,.84,.32],.073,id===23?0x557289:0xe89a32,.60);
    wings(.84,-.02,id===23?.53:.61,blue,true);
    if(id===23)for(const k of [-1,0,1])tip([k*.055,1.05,0],[k*.17,1.46-.07*Math.abs(k),-.07],.103,0xffa02c,.52);
    else for(let j=0;j<13;j++){const a=j*Math.PI/12;oval(.31*Math.cos(a),1.04+.28*Math.sin(a),-.04,.10,.15,.085,j%2?0xf9ae22:0xf9c445,-a+Math.PI/2);}
  }else if(shape==='shell'){
    paws(0x739333);oval(0,.52,-.035,.39,.33,.47,0x335b35);
    for(let i=0;i<3;i++)oval(0,.74,-.25+i*.2,.30,.135,.14,i%2?0x9a9e40:0xd0bf62);
    oval(0,.53,.29,.30,.26,.27,0xb4a650);oval(0,.59,.47,.24,.195,.17,0x71532e);eyes(.60,.595,.146,.066);
    tip([0,.70,.49],[0,.86,.67],.094,cream);
  }else if(shape==='axolotl'){
    const base=0xd1dfed;biped(base);oval(0,.92,.025,.39,.265,.27,base);eyes(.937,.266,.177,.071,0x305782);
    oval(0,1.10,.056,.21,.074,.18,0x405d96);
    for(const k of [-1,1]){
      if(id===109)for(let j=0;j<3;j++)segment([k*.27,.92,0],[k*(.55-j*.02),1.05-j*.16,-.05],.075,0x9ccfe1,false,.46);
      else{tip([k*.26,.98,0],[k*.55,1.12,-.06],.16,0x8fcbe5,.45);segment([k*.20,.78,.03],[k*.31,.38,.16],.09,base);}
    }
  }else if(shape==='bee'){
    biped(gold);oval(0,.99,.06,.30,.24,.27,gold);eyes(.99,.291,.17,.081);
    for(const k of [-1,1])for(let j=0;j<(id===154?2:3);j++){
      const w=segment([k*.13,.65,0],[k*(.64+.08*j),.93+.28*j,-.15-.12*j],.095,0xb9e2e5,false,.18);wingParts.push(w);
    }
    for(let j=0;j<3;j++)oval(0,.91+j*.105,-.14,.26-j*.032,.045,.18,0x93642f);
    segment([0,.53,-.15],[0,.67,-.45],.11,0xc88626);tip([0,.66,-.40],[0,.78,-.65],.09,0x71442a);
  }else if(shape==='shellfish'){
    fish(0xa7b6cf,0xeef3f0,true);
    for(let i=-2;i<=2;i++){const m=oval(i*.095,.72+.035*(2-Math.abs(i)),0,.099,.27,.29,i%2?0xb39873:0xdcc199,-i*.20);m.rotation.x=-.27;}
    oval(0,.62,.29,.275,.13,.18,0xd1b383);eyes(.56,.436,.17,.055);
  }else if(shape==='crystal'){
    paws(0xd4b274,1.2);
    for(let i=0;i<4;i++)oval(0,.39+i*.13,-.22+i*.12,.32+.018*i,.17,.24,i%2?0xe2c487:0xb89d64);
    oval(0,.95,.30,.30,.23,.26,0xe2cc93);eyes(.94,.49,.16,.07,0x8d2a4c);
    for(let i=-2;i<=2;i++)tip([i*.10,.96,-.13],[i*.17,1.3+.07*(2-Math.abs(i)),-.12],.11,i%2?0xf87681:0xb92d4f);
  }else if(shape==='blimp'){
    fish(id===250?0xf4d36f:0xf4e0a2,id===250?0xeac24f:0xff9b48);
    oval(0,.85,-.07,id===250?.265:.36,.39,.30,id===250?0xd8e5ec:0xebebd4);oval(-.09,.97,.12,.12,.16,.04,white);
    oval(0,.53,.38,.21,.18,.13,0xecc14e);eyes(.55,.475,.13,.061,0x315e77);
  }else if(shape==='lark'){
    biped(0xbac0cf);oval(0,.88,.055,.202,.265,.223,0xeeedee);eyes(.88,.246,.125,.059,0x494062);
    oval(0,1.05,-.03,.185,.16,.15,0xc1c1df);tip([0,1.09,-.04],[.12,1.33,-.13],.105,0xbdd377);
    tip([0,.81,.23],[0,.77,.34],.065,0x7f7a55);
    if(id===282)wings(.60,-.025,.32,white,true);
    else{wings(.63,0,.45,0x8f90b3);for(let j=-2;j<=2;j++)tip([0,.40,-.15],[j*.13,.50,-.71],.095,0x7c829e,.55);}
  }else if(shape==='fossilFish'){
    fish(0x4d91ab,0xa49cc0,true);oval(0,.60,.17,.25,.23,.32,0x93b7ca);
    for(let i=0;i<4;i++)tip([0,.69,.18-i*.14],[0,.88+.07*(i%2),.13-i*.15],.087,0x5aa6b8);
    eyes(.59,.42,.17,.06);oval(0,.45,.37,.255,.075,.14,white);
  }else if(shape==='sprout'){
    biped(0x8ab182);oval(0,.73,.11,.24,.22,.22,cream);eyes(.72,.31,.105,.059);
    for(let i=0;i<5;i++){const a=i*Math.PI*.4;oval(.19*Math.sin(a),.94,.14*Math.cos(a),.18,.139,.125,i%2?0x669d84:0xa3bea1,-Math.sin(a)*.65);}
    segment([0,.95,0],[.08,1.33,-.05],.041,0x548964);segment([.08,1.33,-.05],[-.12,1.35,-.025],.031,green);
    if(id===295){oval(-.16,1.28,-.04,.088,.088,.08,0xd5a16c);for(let i=-2;i<=2;i++)tip([i*.05,.55,-.17],[i*.18,1.02-.11*Math.abs(i),-.37],.12,0xeac57b);}
    else tip([0,.47,-.2],[.07,.60,-.47],.16,cream);
  }else if(shape==='sickleBird'){
    const plum=0xbb7639;biped(plum);oval(0,.95,.09,.19,.21,.205,plum);eyes(.98,.25,.105,.052);
    tip([0,.91,.17],[0,.87,.40],.084,0xe7a956);wings(.66,-.08,.38,0xdda45a,true);
    for(const k of [-1,1]){
      segment([k*.11,.99,-.04],[k*.33,1.29,-.11],.066,plum);
      tip([k*.31,1.27,-.11],[k*.67,1.49,-.06],.098,0xebb767,.45);
    }
  }else if(shape==='orchid'){
    const leaf=0x56a778;biped(leaf,id===389?.72:.55);oval(0,.90,.10,.275,.32,.235,cream);eyes(.89,.29,.142,.070,0x20794d);
    tip([0,1.18,.07],[0,1.48,.05],.133,0xf7ae79);
    for(const k of [-1,1]){
      const arm=segment([k*.22,.67,-.02],[k*.35,id===389?.29:.65,.10],.115,leaf);wingParts.push(arm);
      for(let j=0;j<3;j++)oval(k*(.29+j*.015),.68+j*.075,.17,.048,.048,.037,0xf09273);
      if(id===389)tip([k*.16,1.04,0],[k*.30,1.53,-.02],.094,0xbcd675);
    }
  }else if(shape==='seaDragon'){
    fish(0xabc7e9,0xb38cca,true);
    oval(0,.73,.33,.176,.27,.21,0xe9d5f0);eyes(.78,.52,.105,.046,0xcd73a6);
    for(const k of [-1,1]){tip([k*.14,.84,.25],[k*.42,1.19,-.13],.08,0xcfa0d9);tip([k*.16,.66,-.07],[k*.43,.90,-.42],.14,0xc3d4f8,.42);}
  }else if(shape==='rhino'||shape==='stag'||shape==='guardian'){
    const c=shape==='rhino'?0x4b5368:shape==='stag'?0x404744:0x414e50;
    paws(c,1.2);oval(0,.60,-.055,.36,.37,.46,c);oval(0,.72,.29,.28,.264,.27,c);
    eyes(.72,.49,.154,.060,shape==='stag'?0x6eb7b1:gold);
    if(shape==='rhino'){
      tip([0,.77,.48],[0,1.16,.58],.103,0x98a2ad);wings(.80,-.17,.56,0x8b7093);
      tip([0,.47,-.38],[.05,.42,-.82],.105,c);
    }else if(shape==='stag'){
      for(const k of [-1,1]){segment([k*.11,.87,.35],[k*.27,1.17,.40],.052,0x61554d);tip([k*.25,1.15,.4],[k*.45,1.34,.24],.052,0x805f59);tip([k*.24,1.1,.40],[k*.32,1.37,.54],.038,0x705d55);}
    }else{
      for(const k of [-1,1]){oval(k*.26,.67,-.12,.19,.32,.28,0x697575,-k*.28);tip([k*.26,.77,-.06],[k*.39,1.11,-.25],.13,c);}
      oval(0,.80,.39,.25,.18,.12,0xa3a7a0);eyes(.74,.49,.15,.045,0x416d8e);
    }
  }else if(shape==='thunder'){
    paws(0xeab439);oval(0,.60,-.06,.235,.26,.46,0xf4c53d);oval(0,.68,.33,.24,.20,.26,0xf7cf49);eyes(.70,.53,.135,.052);
    for(let i=0;i<4;i++)for(const k of [-1,1])tip([k*.15,.69,.21-i*.16],[k*.28,.96-i*.09,-.12-i*.18],.15,i%2?0xaf3233:0xf6bc24,.62);
    tip([0,.6,-.38],[.22,.76,-.92],.096,0xffff64);
  }else if(shape==='sprig'){
    biped(0x9ead39);oval(0,.77,.11,.32,.26,.27,0xc6dc58);eyes(.77,.342,.16,.075,0x784f96);
    for(const k of [-1,1]){oval(k*.19,.99,.025,.18,.32,.22,0x2c9f94,-k*.28);oval(k*.20,1.01,.216,.075,.112,.04,id===473?gold:0x5cd0a5);}
    if(id===472){oval(0,1.26,-.03,.128,.166,.092,0x317d66);oval(0,1.28,.042,.058,.087,.025,gold);}
    else for(let i=-1;i<=1;i++)oval(i*.12,1.245,.045,.105,.135,.085,0xedc745,-i*.42);
  }else if(shape==='jester'){
    biped(dark);oval(0,.82,0,.30,.28,.24,0xdfebe2);
    for(const k of [-1,1]){tip([k*.15,.98,0],[k*.44,.72,.07],.155,dark);oval(k*.45,.71,.065,.071,.071,.071,gold);}
    tip([0,.98,.02],[-.08,1.3,-.11],.17,0xeff3ec);oval(0,.82,.207,.155,.18,.06,0x7faaa8);eyes(.84,.255,.083,.041);
  }else if(shape==='fennec'||shape==='lop'){
    const c=shape==='fennec'?0xffbc4a:0xeabe71;biped(c);oval(0,.91,.06,.32,.27,.25,c);eyes(.93,.286,.16,.091,0x8e492b);
    oval(0,.81,.267,.181,.08,.098,cream);
    for(const k of [-1,1]){
      if(shape==='fennec'){tip([k*.16,1.09,0],[k*.47,1.46,-.08],.183,c,.43);tip([k*.26,1.19,.015],[k*.45,1.43,-.04],.077,0xa95638,.39);}
      else{const e=segment([k*.17,1.10,-.03],[k*.47,.68,-.12],.119,c,false,.56);oval(k*.455,.71,-.09,.076,.084,.071,0x5c4946);}
    }
  }else if(shape==='spikefish'){
    fish(0x8b629b,0x6d509b,true);oval(0,.45,.21,.23,.145,.17,0xe6cf91);
    for(const k of [-1,1])for(let j=0;j<3;j++)tip([k*.20,.60+j*.035,.16-j*.16],[k*(.43+.055*j),.69+j*.105,-.08-j*.15],.09,0x654183);
    for(const k of [-1,1])tip([k*.13,.67,.03],[k*.27,id===705?1.15:1.03,-.14],.081,0x8864a7);
    if(id===705)oval(0,.73,.21,.11,.15,.09,0xaf7dbb);
  }else if(shape==='gilt'){
    paws(0xe1a94a);oval(0,.54,-.02,.25,.31,.36,0xc9893c);oval(0,.87,.13,.27,.28,.25,0xf5ce64);eyes(.86,.345,.134,.058);
    tip([0,1.05,.04],[.18,1.33,-.07],.154,0xc38640);segment([0,.56,-.25],[.11,.72,-.55],.071,0xe7ad43);
    for(const k of [-1,1])oval(k*.21,.51,.08,.06,.13,.07,cream);
  }else if(shape==='petal'){
    biped(0xb4c870);oval(0,.82,.05,.257,.21,.21,cream);eyes(.82,.232,.135,.055);
    for(let j=-1;j<=1;j++)oval(j*.145,1.09,.03,.139,.30,.19,j===0?0xe8c6e0:0xdcaac9,-j*.22);
    for(const k of [-1,1]){segment([k*.22,.67,0],[k*.43,.90,0],.105,0xadbf75);oval(k*.43,.95,0,.078,.131,.080,0xc6d38a);}
  }else if(shape==='stream'){
    const aqua=0x74cce3;biped(aqua);oval(0,.96,0,.30,.27,.24,0x86d0e2);eyes(.94,.211,.143,.065,0x355879);
    for(const k of [-1,1]){const fin=segment([k*.23,.95,0],[k*.40,.14,.12],.094,aqua);wingParts.push(fin);oval(k*.36,.30,.11,.06,.095,.06,white);}
    oval(0,.66,.152,.166,.20,.095,white);
  }else if(shape==='bear'){
    biped(0xe8d8c5);oval(0,.74,0,.33,.37,.26,0xe2d5c7);oval(0,1.12,.025,.32,.29,.26,white);
    for(const k of [-1,1]){oval(k*.25,1.31,.01,.115,.125,.08,cream);oval(k*.15,1.08,.224,.132,.092,.05,0x665450,-k*.22);
      segment([k*.23,.78,0],[k*.45,.45,.12],.12,0xd7c6b4);for(let j=0;j<3;j++)tip([k*(.39+j*.033),.45,.15],[k*(.40+j*.033),.36,.22],.035,0x84684c);}
    eyes(1.076,.269,.147,.053);oval(0,.99,.25,.122,.083,.067,0xc6ac93);
  }else if(shape==='ribbon'){
    const sea=0x76c5d3;fish(sea,0xabc5f6,true);
    for(const k of [-1,1]){const m=segment([k*.20,.63,-.02],[k*.53,.88,-.31],.15,0x96b9e9,false,.34);wingParts.push(m);tip([k*.12,.71,.22],[k*.26,1.01,-.09],.073,0xc392d9);}
    oval(0,.60,.33,.12,.12,.12,0xede2a6);eyes(.63,.407,.115,.050,0xbd526d);
  }
  for(const w of wingParts)extras.push([w,w.rotation.z]);
  let clock=0;
  return {root,update(dt){clock+=dt;body.position.y=.019*(1+Math.sin(clock*2.8));
      for(const [w,angle] of extras)w.rotation.z=angle+.042*Math.sin(clock*3.7);},
    dispose(){globe.dispose();pointed.dispose();for(const m of palette.values())m.dispose();}};
}
