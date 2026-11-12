// Sculpted from the numbered portraits on the July 2011 wetland roster.
// The ground plane, +Z face and metric height are shared by field and studio.
function createSafariFigure(T,id){
  id=Number(id);
  if(![574,690,553,249,414,738,293,203,399,732,459,454,703,289,200,32,785,108,814,281,344,387,471,756,618,646,724].includes(id))return null;
  const root=new T.Group(),sizeGroup=new T.Group(),body=new T.Group();
  root.add(sizeGroup);sizeGroup.add(body);
  const sphere=new T.SphereGeometry(1,30,20),box=new T.BoxGeometry(2,2,2),crystal=new T.OctahedronGeometry(1);
  const cone=new T.ConeGeometry(1,1,11),geometry=new Set([sphere,box,crystal,cone]),materials=new Map(),moving=[];
  const V=(x,y,z)=>new T.Vector3(x,y,z),ink='#282235',white='#fff8e9',tau=2*Math.PI;
  function mesh(g,col,x,y,z,w,h,d,parent=body,alpha=1){
    const key=col+alpha;
    if(!materials.has(key)){
      const mat=new T.MeshStandardMaterial({color:new T.Color(col).convertSRGBToLinear(),roughness:alpha<1?.20:.58,
        transparent:alpha<1,opacity:alpha,depthWrite:alpha===1,side:T.DoubleSide});
      materials.set(key,mat);
    }
    const m=new T.Mesh(g,materials.get(key));m.scale.set(w,h,d);m.position.set(x,y,z);
    m.castShadow=alpha===1;m.receiveShadow=true;parent.add(m);return m;
  }
  const oval=(col,x,y,z,w,h,d,parent)=>mesh(sphere,col,x,y,z,w,h,d,parent);
  const cube=(col,x,y,z,w,h,d,parent)=>mesh(box,col,x,y,z,w,h,d,parent);
  const gem=(col,x,y,z,w,h,d,parent)=>finishSpiritPart(mesh(crystal,col,x,y,z,w,h,d,parent),'gem',materials);
  function horn(col,a,b,r,parent=body){
    const start=V(...a),end=V(...b),dir=end.clone().sub(start),mid=start.add(end).multiplyScalar(.5);
    const m=mesh(cone,col,mid.x,mid.y,mid.z,r,dir.length(),r,parent);
    m.quaternion.setFromUnitVectors(V(0,1,0),dir.normalize());return m;
  }
  function strand(col,points,radii,parent=body){
    const vertices=points.map(p=>V(...p)),curve=new T.CatmullRomCurve3(vertices),rings=21,sides=10;
    const frames=curve.computeFrenetFrames(rings,false),pos=[],index=[];
    for(let j=0;j<=rings;j++){
      const t=j/rings,at=curve.getPoint(t),u=t*(radii.length-1),k=Math.min(radii.length-2,Math.floor(u));
      const r=T.MathUtils.lerp(radii[k],radii[k+1],u-k);
      for(let i=0;i<sides;i++){
        const a=tau*i/sides,v=at.clone().addScaledVector(frames.normals[j],r*Math.cos(a)).addScaledVector(frames.binormals[j],r*Math.sin(a));
        pos.push(v.x,v.y,v.z);
        if(j){const n=(j-1)*sides+i,q=(j-1)*sides+(i+1)%sides;index.push(n,q,n+sides,q,q+sides,n+sides);}
      }
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(index);g.computeVertexNormals();geometry.add(g);
    return mesh(g,col,0,0,0,1,1,1,parent);
  }
  // A fan-shaped solid, triangulated through a raised midrib. Useful for
  // irregular fins, armoured crests and lightning tails.
  function fin(col,points,ridge=.025,parent=body){
    const c=points.reduce((sum,p)=>sum.add(V(...p)),V(0,0,0)).multiplyScalar(1/points.length);
    const pos=[c.x,c.y+ridge,c.z+ridge,c.x,c.y-ridge,c.z-ridge],indices=[],outer=2,n=points.length;
    for(const p of points)pos.push(...p);
    // Fold the two faces into a shallow vein and taper them to the same rim.
    for(const side of [1,-1]){
      const ring=pos.length/3;
      for(let i=0;i<n;i++){
        const p=points[i],h=side*ridge*(i%2?.52:.81);
        pos.push(c.x+.61*(p[0]-c.x),c.y+.61*(p[1]-c.y)+h,c.z+.61*(p[2]-c.z)+h);
      }
      for(let i=0;i<n;i++){const j=(i+1)%n;
        if(side===1)indices.push(0,ring+i,ring+j,ring+i,outer+i,outer+j,ring+i,outer+j,ring+j);
        else indices.push(1,ring+j,ring+i,ring+i,outer+j,outer+i,ring+i,ring+j,outer+j);
      }
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(indices);g.computeVertexNormals();geometry.add(g);
    const tissue=[281,344,814].includes(id)?'feather':[293,387,738].includes(id)?'petal':
      [108,289,399,703].includes(id)?'fin':'scute';
    return finishSpiritPart(mesh(g,col,0,0,0,1,1,1,parent),tissue,materials);
  }
  const eyelids=[];
  function eye(s,x,y,z,w,h,iris=ink,slant=0){
    // Place the eye on the curved face instead of projecting a flat front
    // view into empty space at each cheek. Ignore glass and distant trim.
    body.updateMatrixWorld(true);
    const ray=new T.Raycaster(V(s*x,y,z+.20),V(0,0,-1),0,.42);
    const hit=ray.intersectObject(body,true).find(q=>!q.object.material?.transparent&&q.face);
    const socket=new T.Group();body.add(socket);
    socket.position.set(s*x,y,hit?hit.point.z+.002:z);
    if(hit){
      const normal=hit.face.normal.clone().applyNormalMatrix(new T.Matrix3().getNormalMatrix(hit.object.matrixWorld));
      normal.z=Math.max(.48,normal.z);normal.normalize();
      socket.quaternion.setFromUnitVectors(V(0,0,1),normal);
    }
    socket.rotateZ(s*slant);
    eyelids.push(socket);
    oval('#323044',0,0,-.003,w*1.08,h*1.06,.016,socket);
    finishSpiritPart(oval(iris,0,0,.002,w,h,.016,socket),'iris',materials);
    if(iris!==ink){
      oval('#242638',0,h*.11,.014,w*.62,h*.67,.006,socket);
      oval(iris,w*.19,-h*.45,.015,w*.30,h*.14,.004,socket);
    }
    oval(white,-w*.23,h*.30,.021,w*.31,h*.34,.006,socket);
  }
  function joint(x,y,z,axis,amplitude,phase=0){
    const g=new T.Group();g.position.set(x,y,z);body.add(g);moving.push({g,axis,amplitude,phase});return g;
  }
  const pair=fn=>{fn(-1);fn(1);};
  function feet(col,x,y,z,w,h,d){pair(s=>oval(col,s*x,y,z,w,h,d));}

  function keri(){
    const pearl='#daf4f0',black='#102428';
    strand(black,[[0,.06,.10],[0,.10,.24],[0,.22,.36],[0,.32,.31],[0,.35,.21]],[.085,.091,.081,.046,.035]);
    oval('#ffdf16',0,.32,.27,.106,.110,.10);
    for(let j=0;j<3;j++)oval(j%2?pearl:'#accdd5',0,.28+.108*j,-.015,.195-j*.017,.108,.153);
    const profile=[[.01,.444],[.192,.437],[.302,.448],[.333,.47],[.329,.50],[.287,.556],[.223,.632],[.168,.757],[.137,.879],[.096,.967],[.042,1.012],[0,1.018]];
    const hood=new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),48);geometry.add(hood);
    mesh(hood,pearl,0,0,0,1,1,.79);
    strand(black,[[0,1.004,-.015],[.042,.905,-.092],[.12,.757,-.099],[.211,.620,-.105],[.275,.49,-.11]],[.009,.018,.018,.013,.003]);
    pair(s=>{fin(black,[[s*.047,.611,.185],[s*.115,.645,.154],[s*.183,.588,.139],[s*.115,.581,.175]]);
      fin(pearl,[[s*.135,.49,0],[s*.32,.40,-.09],[s*.15,.36,.075]]);});
  }
  function taida(){
    oval('#46403d',0,.30,0,.168,.186,.15);oval('#696354',0,.35,.095,.128,.095,.09);
    oval('#637161',0,.695,0,.303,.334,.244);
    oval('#517287',0,.65,.125,.26,.224,.17);oval('#a39b93',0,.638,.175,.224,.208,.145);
    pair(s=>{const shield=oval('#495a4e',s*.235,.72,-.015,.112,.25,.20);shield.rotation.z=s*.12;
      oval(white,s*.115,.602,.302,.064,.080,.027);eye(s,.119,.603,.33,.033,.048,'#29292e');
      const arm=joint(s*.125,.35,.0,'z',.09,s);
      oval('#657660',s*.091,-.063,.015,.083,.132,.079,arm).rotation.z=s*.38;
      horn('#334139',[s*.086,-.101,.014],[s*.148,-.240,.037],.067,arm);});
    oval('#363b3a',0,.976,-.01,.177,.036,.19);
  }
  function yaya(){
    oval('#4c3840',0,.44,-.025,.48,.36,.52);oval('#4dc4c9',0,.45,.09,.46,.314,.367);
    oval('#745b53',0,.48,.133,.433,.338,.321);oval('#ebc8aa',0,.40,.32,.337,.242,.164);
    oval('#46363e',0,.69,.20,.291,.169,.19);
    for(let j=0;j<4;j++)fin('#824548',[[-.21,.70-j*.035,-.03-j*.099],[0,.89-j*.055,-.115-j*.10],[.238,.69-j*.04,-.04-j*.10]],.085);
    pair(s=>{strand('#b48a5d',[[s*.235,.655,.215],[s*.285,.79,.24],[s*.374,.955,.19],[s*.432,1.025,.135]],[.081,.059,.026,.004]);
      oval('#283132',s*.191,.427,.434,.097,.132,.025).rotation.y=s*.47;eye(s,.19,.433,.456,.072,.103,'#27b1ad');
      oval('#6e4b4d',s*.388,.20,.011,.132,.056,.146);});
  }
  function floatSeed(){
    const tan='#e8c895';
    oval(tan,0,.5,.04,.245,.217,.28);oval('#ddc58f',0,.49,-.145,.147,.125,.242);
    pair(s=>{eye(s,.143,.53,.252,.06,.09,'#203347');
      fin('#f5e1a5',[[0,.48,-.265],[s*.09,.58,-.432],[s*.13,.72,-.382],[s*.07,.49,-.343],[s*.12,.298,-.36],[0,.392,-.28]]);
      for(let i=0;i<2;i++)oval('#aa805a',s*(.198-.026*i),.50,-.04-i*.09,.016,.077-i*.016,.020);});
    mesh(sphere,'#a7cbf3',0,.51,.015,.368,.369,.35,body,.18);
    oval('#f1ffff',-.142,.734,.251,.071,.023,.012).rotation.z=.3;
  }
  function wulu(){
    const blue='#8097b4',plum='#745378';
    oval(plum,0,.37,0,.205,.235,.20);oval(blue,0,.47,-.09,.222,.226,.189);
    strand(blue,[[0,.39,-.105],[0,.31,-.255],[0,.23,-.401],[0,.16,-.502]],[.117,.100,.052,.003]);
    oval(plum,0,.64,.076,.217,.179,.19);oval(blue,0,.77,.036,.249,.21,.216);
    fin('#bad1e2',[[-.08,.753,.236],[0,1.077,.197],[.064,.782,.241],[0,.69,.267]],.037);
    pair(s=>{eye(s,.125,.644,.247,.064,.055,'#e6ba30',s*.17);
      oval(blue,s*.153,.211,-.013,.108,.17,.138);oval(plum,s*.149,.088,.109,.091,.055,.126);
      horn('#7c668b',[s*.088,.472,.126],[s*.143,.378,.225],.032);});
  }
  function halo(){
    oval('#e6c7bc',0,.68,.021,.275,.313,.222);oval('#fae7d6',0,.712,.145,.201,.244,.137);
    pair(s=>{const wing=joint(s*.191,.65,-.01,'z',.064,s);
      strand('#edb6cd',[[0,-.094,0],[s*.158,.03,-.018],[s*.167,.188,0],[s*.10,.249,.038],[s*.034,.138,.066]],[.037,.051,.046,.037,.012],wing);
      oval('#edb8c5',s*.172,.426,.012,.172,.065,.107).rotation.z=s*.19;
      eye(s,.095,.45,.182,.043,.038,'#438db1');
      strand('#99bd7a',[[s*.117,.405,0],[s*.115,.298,.009],[s*.188,.17,-.018],[s*.234,.084,-.04]],[.035,.029,.018,.002]);});
  }
  function miniBud(){
    oval('#c9a454',0,.418,-.056,.265,.218,.229);
    for(let j=0;j<22;j++){const a=j*2.39996,z=-.03-.14*(j%4)/3;
      oval('#d8b66c',.226*Math.cos(a),.43+.186*Math.sin(a),z,.092,.091,.093);}
    oval('#f5e1a1',0,.521,.158,.159,.142,.103);
    feet('#55aa83',.087,.174,.101,.074,.111,.087);
    pair(s=>{oval('#a4c198',s*.148,.676,.073,.123,.134,.146);eye(s,.066,.526,.253,.035,.058,'#675381');});
    oval('#a8bc95',0,.723,.035,.217,.112,.176);
    strand('#459679',[[0,.671,.157],[.015,.813,.138],[.012,.971,.092],[.063,1.089,-.025],[.133,1.13,-.072]],[.072,.045,.031,.015,.003]);
  }
  function stoneWorm(){
    strand('#c5a05e',[[0,.66,.09],[0,.45,.045],[0,.24,-.019],[.047,.126,-.139],[.148,.194,-.275],[.178,.31,-.314]],[.17,.162,.149,.139,.096,.069]);
    oval('#ddbb70',0,.705,.097,.222,.185,.18);oval('#b28d56',0,.618,.207,.176,.087,.098);
    for(let i=0;i<3;i++)gem(i%2?'#fdd3cd':'#dd3556',(i-1)*.073,.855+(i%2)*.047,.087,.095,.131,.079);
    gem('#e64c64',.176,.34,-.32,.096,.12,.079);
    strand('#75572f',[[-.119,.647,.236],[0,.632,.300],[.123,.65,.238]],[.003,.007,.003]);
    pair(s=>{eye(s,.128,.741,.235,.059,.082,'#7e1644');for(let j=0;j<3;j++)gem('#f6e6bf',s*.08,.185+j*.055,.071+j*.038,.039,.047,.019);});
  }
  function sala(){
    oval('#e2c393',0,.47,.027,.145,.168,.099);oval('#6dd6e8',0,.604,.078,.135,.114,.084);
    const cap=mesh(cone,'#80aede',0,.835,0,.181,.52,.166);cap.rotation.z=-.17;
    oval('#dd8fc1',0,.655,.005,.177,.051,.152);
    pair(s=>{eye(s,.075,.59,.15,.035,.049,'#2b9ab1');
      fin('#ab4f91',[[s*.075,.527,0],[s*.273,.653,-.083],[s*.565,.888,-.205],[s*.42,.614,-.101],[s*.31,.572,-.03],[s*.21,.437,.015]]);
      fin('#8eddf0',[[s*.15,.542,.012],[s*.392,.732,-.096],[s*.53,.845,-.189],[s*.345,.598,-.056],[s*.223,.55,.008]]);
      strand('#8ecee6',[[s*.041,.366,0],[s*.098,.26,-.011],[s*.185,.207,-.111],[s*.206,.254,-.151]],[.035,.028,.017,.003]);});
  }
  function mundo(){
    oval('#efba36',0,.43,-.018,.325,.296,.273);oval('#ffdd65',0,.378,.119,.297,.224,.188);
    for(let i=0;i<3;i++){
      strand(i===1?'#df9828':'#af612e',[[.008,.62,-.005],[-.031,.739,-.04],[-.06+i*.047,.836+i*.05,-.070],[-.105+i*.055,.894+i*.08,-.102]],[.11,.084,.047,.002]);
    }
    pair(s=>{eye(s,.166,.40,.28,.079,.075,'#365b75',.22);oval('#da9e31',s*.24,.316,.214,.022,.017,.012);});
  }
  function yoda(){
    const olive='#737529',bright='#c3b752',gold='#c8a048';
    cube('#494c28',0,.55,-.017,.245,.196,.18);
    cube(olive,0,.657,-.025,.265,.159,.197);cube(bright,0,.823,-.019,.264,.029,.20);
    cube('#ad914e',0,.686,.170,.105,.182,.042);cube('#e7c57d',0,.847,.018,.105,.029,.196);
    cube('#514f21',0,.52,.18,.203,.094,.048);cube('#e9e62c',0,.53,.232,.113,.039,.009);
    pair(s=>{
      const ring=new T.TorusGeometry(.123,.037,9,32);geometry.add(ring);
      const hub=mesh(ring,gold,s*.25,.486,0,1,1,1);hub.rotation.y=Math.PI/2;
      cube(olive,s*.184,.238,.034,.088,.126,.139).rotation.x=.18;
    });
  }
  function electricBeast(){
    const red='#a41e22',yellow='#ffd32a';
    oval(yellow,0,.49,-.038,.243,.222,.298);oval(red,0,.564,.034,.220,.207,.228);
    oval(yellow,0,.453,.193,.168,.125,.128);
    pair(s=>{
      eye(s,.10,.505,.273,.046,.059,'#aa2330',.22);
      horn(red,[s*.107,.613,.038],[s*.158,.805,-.245],.093);
      horn(red,[s*.173,.469,.116],[s*.218,.297,.136],.063);
      for(let j=0;j<3;j++)horn('#ffe650',[s*.149,.50-j*.049,-.131],[s*(.22+j*.015),.63-j*.072,-.386+j*.029],.065);
    });
    fin(yellow,[[0,.53,-.263],[.105,.698,-.405],[.082,.641,-.434],[.198,.809,-.628],
      [.16,.775,-.643],[.251,.886,-.753],[.16,.697,-.599],[.199,.719,-.588],[.073,.565,-.412]],.026);
    oval('#efae22',0,.729,-.02,.073,.039,.086);
  }
  function littleKe(){
    const plum='#85548c',peach='#e7b485';
    oval(peach,0,.399,-.019,.294,.245,.255);
    for(let j=0;j<8;j++){const a=tau*j/8;horn('#efd2a4',[.231*Math.cos(a),.293,.201*Math.sin(a)],[.270*Math.cos(a),.114+.035*(j%3),.257*Math.sin(a)],.087);}
    oval(plum,0,.559,.014,.282,.224,.231);oval('#a470a2',0,.529,.116,.241,.151,.173);
    pair(s=>{strand('#645189',[[s*.1,.674,0],[s*.144,.746,-.035],[s*.178,.79,-.03]],[.041,.047,.061]);
      gem('#79649e',s*.192,.812,-.044,.079,.080,.074);eye(s,.144,.538,.251,.059,.071,'#744420',-.24);
      fin('#b196c7',[[s*.213,.475,.04],[s*.405,.615,-.113],[s*.331,.446,-.021],[s*.202,.397,.036]]);
      oval('#a677b8',s*.099,.684,.126,.047,.021,.053);
    });
  }
  function yoshi(){
    const blue='#438fa2',aqua='#71bbcd';
    oval(blue,0,.554,-.048,.253,.236,.319);oval(aqua,0,.587,.157,.239,.238,.198);
    pair(s=>{eye(s,.129,.570,.323,.061,.091,'#252940');
      const wing=joint(s*.123,.416,.012,'x',.11,s);
      oval('#84678f',s*.036,-.171,0,.070,.192,.064,wing).rotation.z=s*.13;
      oval('#5caeb7',s*.033,-.067,.045,.048,.143,.046,wing);
      for(let j=0;j<3;j++){const x=s*(.10+.035*(j%2)),y=.711-.041*j,z=.012-.078*j;
        oval(aqua,x,y,z,.055,.077,.055);oval('#326777',x,y+.066,z,.039,.014,.037);}
      fin('#a693b7',[[0,.50,-.293],[s*.159,.598,-.472],[s*.115,.422,-.48],[0,.417,-.34]]);
    });
  }
  function scaleDragon(){
    const gold='#bd955e',blue='#8497b2';
    strand(blue,[[0,.50,.47],[0,.57,.18],[0,.60,-.082],[0,.576,-.356],[0,.626,-.684],[0,.725,-.839]],
      [.068,.12,.112,.077,.046,.016]);
    oval('#d1ae7d',0,.495,.403,.105,.070,.16);oval('#ece1c9',0,.454,.439,.090,.031,.132);
    for(let j=0;j<6;j++){
      const z=.268-j*.082;
      fin(gold,[[-.074,.61,z],[0,.684,z+.072],[.040,.752+.075*Math.sin(j/6*Math.PI),z-.052],[.083,.635,z-.067],[0,.60,z-.084]],.046);
    }
    pair(s=>{eye(s,.069,.482,.523,.023,.023,'#324363');
      const wing=joint(s*.048,.54,.056,'z',.075,s);
      fin('#b5c4da',[[0,.01,.087],[s*.164,.094,-.014],[s*.423,.017,-.292],[s*.504,-.213,-.529],[s*.291,-.091,-.316],[s*.186,-.165,-.362],[s*.123,-.036,-.078]],.017,wing);
      for(let j=0;j<3;j++)strand('#72849e',[[0,0,.032],[s*(.11+.035*j),-.02,-.08-j*.020],[s*(.22+.126*j),-.14-.028*j,-.28-j*.12]],[.015,.014,.002],wing);
      horn('#94a6bf',[0,.71,-.807],[s*.133,.882,-.993],.027);
    });
  }
  function bara(){
    const moss='#80a938',shell='#9a842f',rim='#d0b754';
    oval('#c3ae54',0,.36,-.12,.33,.193,.34);oval(shell,0,.493,-.136,.329,.295,.343);
    for(let j=0;j<7;j++){
      const x=(j-3)*.081,reach=Math.sqrt(Math.max(0,1-(x/.36)**2));
      strand(j%2?rim:'#a08d39',[[x,.410,-.126-.31*reach],[x,.565+reach*.14,-.29],[x,.51+reach*.27,-.124],
        [x,.55+reach*.16,.045],[x,.451,.145]],[.014,.022,.029,.021,.012]);
    }
    oval(moss,0,.425,.242,.219,.177,.193);oval('#719137',0,.36,.352,.175,.066,.128);
    strand('#d0ad69',[[0,.54,.325],[0,.618,.380],[0,.705,.375],[0,.748,.354]],[.081,.058,.032,.002]);
    pair(s=>{eye(s,.143,.448,.353,.049,.055,ink);
      for(const z of [-.24,.145]){
        oval(moss,s*.257,.228,z,.136,.193,.14);oval('#96b849',s*.28,.121,z+.033,.135,.078,.134);
        for(let j=0;j<3;j++)oval('#e5d08c',s*(.226+.045*j),.108,z+.14,.026,.035,.039);
      }});
  }
  function xixi(){
    const blue='#4dbbe2',ice='#a6f1e9';
    oval(blue,0,.542,0,.279,.285,.236);
    oval(ice,0,.737,.100,.119,.123,.132).rotation.x=-.50;
    pair(s=>{oval('#ffc857',s*.17,.710,.104,.065,.078,.077);eye(s,.14,.515,.201,.068,.073,'#24416a');
      const flipper=joint(s*.139,.343,0,'z',.11,s);
      oval(blue,s*.122,-.067,.02,.166,.070,.111,flipper).rotation.z=s*.15;
      oval('#78d2e2',s*.11,-.046,.041,.133,.049,.087,flipper);
      oval(ice,s*.062,.335,.117,.066,.045,.060);
    });
    strand(ice,[[0,.345,.171],[-.027,.258,.181],[0,.144,.155],[.054,.142,.118]],[.041,.030,.018,.003]);
  }
  function blu(){
    const pearl='#c7dce5',navy='#455c91';
    oval(pearl,0,.371,0,.080,.188,.092);feet(pearl,.064,.207,.047,.073,.058,.072);
    oval(pearl,0,.617,.009,.262,.182,.181);oval(navy,0,.734,-.021,.219,.080,.152);
    const crown=oval('#6e8ed5',.014,.782,-.031,.156,.033,.108);crown.rotation.z=-.09;
    oval('#edf7ff',-.045,.81,-.013,.061,.009,.023);
    oval(pearl,0,.173,.080,.043,.052,.054);
    strand('#405571',[[-.037,.571,.173],[-.005,.558,.181],[.028,.573,.177]],[.002,.006,.002]);
    pair(s=>{eye(s,.146,.615,.157,.052,.073,'#347d9f');
      const ear=joint(s*.242,.605,-.003,'z',.11,s);
      oval('#b7dbe7',s*.081,-.066,.006,.050,.131,.038,ear).rotation.z=s*.65;
      oval('#e0eef0',s*.075,-.052,.024,.035,.110,.021,ear).rotation.z=s*.65;
    });
  }
  function linda(){
    const aqua='#58bfc1',blue='#64ccd4',violet='#bc9dcc';
    strand(aqua,[[0,.718,.087],[0,.531,.049],[.043,.366,.004],[.136,.245,-.082],[.246,.169,-.103],[.287,.247,-.146]],
      [.129,.133,.105,.070,.039,.006]);
    oval(blue,0,.734,.080,.156,.174,.171);oval('#9ce7e2',0,.691,.199,.116,.063,.11);
    horn('#e7c779',[0,.848,.146],[0,.984,.167],.042);
    for(let j=0;j<4;j++)fin(j%2?'#e7cda6':violet,[[-.035,.879-j*.105,-.022],[.021,.911-j*.107,-.272],
      [.071,.819-j*.107,-.222],[.038,.749-j*.1,-.065]],.058);
    pair(s=>{eye(s,.091,.754,.22,.050,.068,'#7e416f');horn('#78cbd7',[s*.099,.481,.081],[s*.155,.637,.031],.038);
      oval('#f0a7af',s*.125,.696,.19,.022,.013,.016);});
  }
  function brightBird(){
    const lilac='#c5bdd7',pale='#eee8f4';
    oval(lilac,0,.375,-.022,.160,.162,.151);feet('#635775',.074,.222,.013,.052,.041,.052);
    oval(pale,0,.609,.033,.245,.236,.196);
    pair(s=>{fin(lilac,[[s*.106,.671,.026],[s*.283,.944,-.051],[s*.259,.697,.045],[s*.208,.543,.017]]);
      const arm=joint(s*.112,.378,-.014,'z',.20,s);oval('#897996',s*.047,-.032,-.074,.060,.105,.118,arm);
      eye(s,.118,.620,.205,.066,.106,'#322d4d');});
    horn(pale,[0,.753,.009],[0,1.079,-.059],.117);oval('#dad487',0,.771,.144,.047,.071,.030);
    horn('#626076',[0,.54,.198],[0,.497,.25],.027);
  }
  function youngScythe(){
    const amber='#bd762b',sand='#cfb597',dark='#704339';
    oval(sand,0,.424,0,.193,.244,.18);oval(amber,0,.660,.01,.253,.218,.201);
    oval('#d38b30',0,.718,.086,.253,.136,.184);oval(sand,0,.581,.141,.162,.119,.101);
    const top=oval('#b69f7e',0,.859,.022,.14,.054,.114);top.rotation.z=.085;
    for(const side of [-1,1]){
      eye(side,.082,.59,.235,.045,.037,'#6a4547');
      horn('#ba7134',[side*.144,.798,-.017],[side*.198,.934,-.08],.041);
      const wing=joint(side*.17,.468,-.009,'z',.16,side);
      for(let i=0;i<4;i++)fin(i%2?'#f2c258':'#dd9238',[[0,.079,.037],[side*(.159+i*.023),-.144+i*.027,-.132+i*.034],
        [side*(.063+i*.009),-.072,.039]],.014,wing);
      for(let j=0;j<3;j++)oval(dark,side*(.037+.031*j),.381-.033*j,.158-(j%2)*.015,.011,.011,.012);
    }
    for(let j=0;j<3;j++)oval('#e7ad41',(j-1)*.056,.206,-.09,.053,.177,.066).rotation.x=-.45;
  }
  function xinno(){
    const cream='#efe0ae',green='#79b96b',orange='#e89a5f';
    oval(cream,0,.439,0,.264,.225,.216);oval('#fff0c9',0,.521,.070,.238,.186,.164);
    feet(orange,.11,.234,.073,.106,.058,.092);feet('#559344',.165,.236,-.070,.081,.055,.072);
    pair(s=>{eye(s,.123,.457,.213,.068,.076,'#3c7737',-.20);
      oval('#568647',s*.117,.574,.201,.045,.021,.024).rotation.z=s*.23;
      const ear=joint(s*.19,.585,-.015,'z',.075,s);oval(orange,s*.064,.068,0,.108,.132,.085,ear).rotation.z=-s*.38;
      for(let j=0;j<4;j++)oval(green,s*(.051+.044*(j%2)),.022+.044*j,.072,.031,.030,.013,ear);
      strand('#6a915f',[[s*.138,.639,.010],[s*.129,.765,-.004],[s*.095,.86,-.029]],[.021,.015,.002]);});
  }
  function yite(){
    const lime='#d4eea4',mint='#81d5b2',cyan='#439b9b';
    oval(lime,0,.471,.010,.232,.271,.186);
    strand('#65826c',[[-.047,.424,.184],[-.009,.421,.192],[.048,.430,.181]],[.004,.006,.003]);
    for(let i=-1;i<=1;i++){
      const x=.145*i,h=.69-(i*i)*.052;
      oval(lime,x,h,0,.137,.178,.125);oval(mint,x,h+.082,-.009,.126,.101,.125);
      for(let j=-1;j<2;j++)fin(mint,[[x+j*.047-.026,h+.084,.104],[x+j*.047+.025,h+.084,.104],[x+j*.047,h+.036,.124]],.004);
    }
    pair(s=>{eye(s,.096,.513,.176,.044,.061,'#70599f');oval('#d8b054',s*.213,.471,-.004,.086,.131,.133);
      oval(cyan,s*.240,.468,.015,.073,.119,.127);});
  }
  function xiete(){
    const plum='#a86995',red='#834753';
    oval('#593c5d',0,.334,0,.159,.169,.128);oval(plum,0,.569,.013,.267,.209,.202);
    oval(red,0,.720,.037,.204,.112,.185);
    fin(red,[[-.166,.733,.15],[.175,.734,.151],[.019,.56,.212]],.032);
    pair(s=>{eye(s,.135,.539,.182,.061,.088,'#3c3251',-.31);
      fin('#7f4e77',[[s*.169,.43,.066],[s*.173,.327,.069],[s*.071,.422,.124]]);
      oval(red,s*.056,.32,.123,.076,.049,.033);});
    strand('#64446d',[[.116,.366,-.019],[.264,.367,-.13],[.319,.516,-.14],[.277,.576,-.093]],[.046,.041,.034,.005]);
  }
  function dula(){
    const gold='#f5c743',red='#c75851';
    oval(gold,0,.496,.003,.279,.229,.241);oval('#f1d69d',0,.417,.094,.227,.123,.173);
    for(const s of [-1,1]){
      eye(s,.131,.498,.217,.068,.095,'#a64e34');oval('#b43e38',s*.133,.467,.241,.037,.048,.037);
      for(let j=0;j<3;j++){
        const x=s*(.157+.016*j),y=.641-j*.056,z=-.061-j*.057;
        oval(red,x+s*.037,y+.043,z-.023,.092,.112,.094);
        oval(gold,x,y,z+.027,.112,.113,.107);
      }
    }
    oval('#2878a3',0,.393,.252,.045,.031,.037);
  }
  function peixi(){
    const gold='#eed15f',black='#4f4141';
    oval(gold,0,.331,0,.115,.144,.118);feet(black,.100,.223,.049,.078,.044,.087);
    oval(gold,0,.58,.024,.224,.218,.188);oval('#faf1cf',0,.508,.127,.186,.121,.112);
    pair(s=>{
      eye(s,.105,.54,.228,.057,.061,'#9e6139');const ear=joint(s*.067,.748,-.004,'z',.07,s);
      cube(black,s*.093,.077,-.01,.128,.055,.059,ear).rotation.z=-s*.19;
      cube(gold,s*.097,.092,.006,.126,.048,.060,ear).rotation.z=-s*.19;
      cube(gold,s*.204,.048,.005,.044,.076,.059,ear).rotation.z=-s*.32;
    });
  }
  function sibeila(){
    const aqua='#68c9ce',dark='#4d5660';
    strand(dark,[[-.106,.484,-.016],[-.14,.307,0],[-.115,.189,0],[.022,.160,0],[.124,.270,-.018],[.105,.49,-.04]],
      [.093,.070,.058,.066,.078,.112]);
    oval('#538b91',0,.507,.021,.191,.129,.147);oval('#42747b',0,.531,.101,.165,.105,.090);
    mesh(sphere,'#8be4ea',0,.613,-.006,.251,.247,.226,body,.35);
    pair(s=>{
      oval(aqua,s*.101,.527,.186,.049,.078,.024);oval('#bbffff',s*.101,.534,.204,.037,.059,.013);
      strand('#c2fbf7',[[s*.035,.669,.196],[s*.123,.711,.166],[s*.171,.743,.095]],[.004,.005,.002]);
      gem('#b7ffff',s*.166,.712,.106,.012,.015,.009);
    });
  }
  const forms={574:keri,690:taida,553:yaya,249:floatSeed,414:wulu,738:halo,293:miniBud,203:stoneWorm,399:sala,
    732:mundo,459:yoda,454:electricBeast,703:littleKe,289:yoshi,200:scaleDragon,32:bara,785:xixi,108:blu,814:linda,
    281:brightBird,344:youngScythe,387:xinno,471:yite,756:xiete,618:dula,646:peixi,724:sibeila};
  forms[id]();
  const entry=SEER_SPIRIT_DATA.index.find(row=>row[0]===id),bounds=new T.Box3().setFromObject(body);
  const factor=(entry?.[3]>0?entry[3]/100:.52)/(bounds.max.y-bounds.min.y);
  sizeGroup.position.y=-bounds.min.y*factor;sizeGroup.scale.setScalar(factor);
  root.name=entry?.[1]||String(id);
  let time=0;
  return {root,update(dt,effort=0){
    time+=dt;body.rotation.z=.018*Math.sin(time*2.1)+effort*.035*Math.sin(time*7);
    body.scale.y=1+.009*Math.sin(time*3);
    const blink=Math.min(1,.12+Math.abs(((time+id*.27)%4.4)-.14)*8);
    for(const socket of eyelids)socket.scale.y=blink;
    for(const {g,axis,amplitude,phase} of moving)g.rotation[axis]=amplitude*Math.sin(time*(2.8+effort*2)+phase);
  },dispose(){geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
