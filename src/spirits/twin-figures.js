// Classic twin-world figures. Identity/colour references: Taomee's numbered
// main/spirit/{id}.html and seerh5.61.com pet/head/{id}.png.
// Full silhouettes were compared with the preserved original battle artwork at
// wiki.biligame.com/seer/精灵:{id}; unseen backs and joint motion are 3D adaptations.
// This adds presentation only: no species stats, capture rules or boss rewards.
function createTwinSpiritFigure(T,id){
  if(![88,89,90,91,97,98,105,106,113,119,120,184,185,188,189].includes(id))return null;
  const root=new T.Group(),body=new T.Group();root.add(body);
  root.name='twin-spirit-'+id;
  const sphere=new T.SphereGeometry(1,32,22),geometries=new Set([sphere]),materials=new Map(),joints=[],discharges=[];
  const v=(x,y,z)=>new T.Vector3(x,y,z),tau=Math.PI*2;
  function paint(hex,metal=false){
    const key=String(hex)+(metal?'-metal':'');
    if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({
      color:new T.Color(hex).convertSRGBToLinear(),roughness:metal?.34:.63,metalness:metal?.38:0}));
    return materials.get(key);
  }
  function mesh(g,c,parent=body,metal=false){
    geometries.add(g);const m=new T.Mesh(g,paint(c,metal));m.castShadow=m.receiveShadow=true;parent.add(m);return m;
  }
  function oval(c,x,y,z,sx,sy,sz,parent=body,metal=false){
    const m=mesh(sphere,c,parent,metal);m.position.set(x,y,z);m.scale.set(sx,sy,sz);return m;
  }
  function block(c,x,y,z,w,h,d,parent=body,metal=false){
    const m=mesh(new T.BoxGeometry(w,h,d),c,parent,metal);m.position.set(x,y,z);return m;
  }
  function cylinder(c,x,y,z,r1,r2,h,parent=body,metal=false,sides=32){
    const m=mesh(new T.CylinderGeometry(r1,r2,h,sides),c,parent,metal);m.position.set(x,y,z);return m;
  }
  function rod(c,a,b,r,parent=body,metal=false){
    const start=v(...a),end=v(...b),d=end.clone().sub(start),m=cylinder(c,0,0,0,r,r,d.length(),parent,metal,20);
    m.position.copy(start).lerp(end,.5);m.quaternion.setFromUnitVectors(v(0,1,0),d.normalize());return m;
  }
  function strand(c,points,r,parent=body,metal=false){
    return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>v(...p))),Math.min(192,Math.max(24,points.length*3)),r,8,false),c,parent,metal);
  }
  function taper(c,points,radii,parent=body){
    const curve=new T.CatmullRomCurve3(points.map(p=>v(...p))),steps=36,sides=14;
    const frames=curve.computeFrenetFrames(steps,false),vertices=[],indices=[];
    for(let j=0;j<=steps;j++){
      const t=j/steps,q=t*(radii.length-1),k=Math.min(radii.length-2,Math.floor(q));
      const r=T.MathUtils.lerp(radii[k],radii[k+1],q-k),at=curve.getPointAt(t);
      for(let i=0;i<sides;i++){
        const a=i*tau/sides,p=at.clone().addScaledVector(frames.normals[j],Math.cos(a)*r).addScaledVector(frames.binormals[j],Math.sin(a)*r);
        vertices.push(p.x,p.y,p.z);
        if(j<steps){const n=j*sides+i,next=j*sides+(i+1)%sides;indices.push(n,n+sides,next,next,n+sides,next+sides);}
      }
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();
    return mesh(g,c,parent);
  }
  function plate(c,x,y,z,w,h,d,r,parent=body,metal=false){
    const s=new T.Shape(),left=-w/2,bottom=-h/2,right=w/2,top=h/2;
    s.moveTo(left+r,bottom);s.lineTo(right-r,bottom);s.quadraticCurveTo(right,bottom,right,bottom+r);
    s.lineTo(right,top-r);s.quadraticCurveTo(right,top,right-r,top);s.lineTo(left+r,top);
    s.quadraticCurveTo(left,top,left,top-r);s.lineTo(left,bottom+r);s.quadraticCurveTo(left,bottom,left+r,bottom);
    const m=mesh(new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:.008,bevelThickness:.009,bevelSegments:2,curveSegments:12}),c,parent,metal);
    m.position.set(x,y,z);return m;
  }
  function electricFan(side,x,y,z,parent){
    const shape=new T.Shape(),outline=[[0,-.16],[.17,-.23],[.12,-.13],[.31,-.10],[.19,-.035],[.34,.055],[.18,.075],[.27,.20],[.12,.13],[.14,.29],[0,.16]];
    shape.moveTo(...outline[0]);for(const p of outline.slice(1))shape.lineTo(...p);shape.closePath();
    const geometry=new T.ShapeGeometry(shape,1);geometries.add(geometry);
    const group=new T.Group();group.position.set(x,y,z);group.scale.x=side;parent.add(group);
    for(const [colour,scale,depth] of [[0x7bf733,1,0],[0xeaffd3,.77,.003]]){
      const mat=new T.MeshBasicMaterial({color:colour,side:T.DoubleSide,transparent:true,opacity:.55,depthWrite:false});
      materials.set('electric-'+materials.size,mat);discharges.push(mat);
      const flash=new T.Mesh(geometry,mat);flash.scale.set(scale,scale,1);flash.position.z=depth;group.add(flash);
    }
  }
  function ring(c,x,y,z,r,t,parent=body,metal=false){
    const m=mesh(new T.TorusGeometry(r,t,10,44),c,parent,metal);m.position.set(x,y,z);return m;
  }
  function joint(x,y,z,axis,amount,phase=0,parent=body){
    const g=new T.Group();g.position.set(x,y,z);parent.add(g);joints.push({g,axis,amount,phase});return g;
  }
  function eye(x,y,z,r,parent=body,iris=0x647f7d){
    oval(0x293a39,x,y,z,r*1.10,r*1.20,r*.34,parent);
    oval(0xfcfff8,x,y,z+r*.23,r*.96,r*1.04,r*.23,parent);
    finishSpiritPart(oval(iris,x,y,z+r*.40,r*.55,r*.73,r*.19,parent),'iris',materials);
    oval(0x293b3b,x,y,z+r*.54,r*.34,r*.51,r*.12,parent);
    oval(0xffffff,x-r*.17,y+r*.29,z+r*.64,r*.12,r*.17,r*.06,parent);
  }
  function screw(c,x,y,z,h,r,turns,parent=body,metal=false){
    const points=[];
    for(let i=0;i<=180;i++){
      const t=i/180,a=t*tau*turns,rad=r*(.07+.93*t);
      points.push([x+rad*Math.cos(a),y+h*t,z+rad*Math.sin(a)]);
    }
    return strand(c,points,.026,parent,metal);
  }
  function fleece(c,x,y,z,rx,ry,rz,parent=body){
    const g=sphere.clone(),p=g.attributes.position;
    for(let i=0;i<p.count;i++){
      const px=p.getX(i),py=p.getY(i),pz=p.getZ(i),a=Math.atan2(px,pz),b=Math.acos(T.MathUtils.clamp(py,-1,1));
      const r=1+.027*Math.sin(b*18+2*Math.sin(a*9))+.017*Math.cos(a*20+b*7)*Math.sin(b);
      p.setXYZ(i,px*r,py*r,pz*r);
    }
    g.computeVertexNormals();const m=mesh(g,c,parent);m.position.set(x,y,z);m.scale.set(rx,ry,rz);
    return finishSpiritPart(m,'velvet',materials);
  }
  if(id===184||id===185){
    const adult=id===185,blue=0x4baebc,light=0x83d5da,ochre=0xba7a12,gold=0xdca523;
    const hy=adult?.85:.52,hw=adult?.39:.30;
    fleece(ochre,0,adult?.40:.28,-.035,adult?.28:.31,adult?.29:.20,adult?.235:.245);
    if(adult)fleece(gold,0,hy,0,hw,.325,.267);
    else{
      oval(blue,0,hy,.012,hw,.275,.225);
      const collar=[];for(let k=0;k<=60;k++){const a=k*tau/60;collar.push([.29*Math.sin(a),.30+.016*Math.sin(15*a),-.025+.23*Math.cos(a)]);}
      strand(gold,collar,.034);
      for(const s of [-1,1])taper(blue,[[s*.21,.71,0],[s*.245,.79,.012],[s*.25,.84,.01]],[.061,.036,.001]);
      taper(0xd69112,[[0,.76,0],[-.023,.88,-.01],[.024,1.025,.015]],[.085,.076,.002]);
      taper(0xedb92d,[[-.03,.80,.06],[-.044,.90,.052],[.006,.99,.035]],[.031,.038,.001]);
    }
    const spread=adult?.168:.139,eyeY=hy+.01,r=adult?.148:.125;
    for(const s of [-1,1]){
      if(adult){
        oval(0x337a83,s*spread,eyeY,.225,r*1.32,r*1.47,.040);
        oval(blue,s*spread,eyeY,.255,r*1.23,r*1.38,.029);
      }
      oval(0x835310,s*spread,eyeY,.249,r*1.03,r*1.20,.040);
      oval(0xf0c150,s*spread,eyeY,.277,r*.93,r*1.09,.032);
      finishSpiritPart(oval(0xad731c,s*spread,eyeY-.006,.301,r*.76,r*.91,.022),'iris',materials);
      oval(0x171719,s*spread,eyeY+.012,.322,r*.55,r*.70,.014);
      oval(0xffffff,s*spread-r*.25,eyeY+r*.38,.337,r*.22,r*.24,.008);
      oval(0xffffff,s*spread-r*.34,eyeY+r*.03,.338,r*.095,r*.13,.007);
      const leg=joint(s*(adult?.13:.12),adult?.18:.12,-.012,'x',.070,s);
      rod(blue,[0,0,0],[s*.014,-.055,.022],adult?.033:.021,leg);
      for(let j=-1;j<=1;j++)taper(blue,[[s*.014,-.055,.022],[s*.014+j*.030,-.089,.09],[s*.014+j*.058,-.10,.155]],
        adult?[.022,.020,.002]:[.018,.015,.002],leg);
      if(adult){
        const arm=joint(s*.25,.54,.005,'z',.065,s);
        taper(blue,[[0,0,0],[s*.05,-.105,.025],[s*.12,-.18,.10]],[.029,.023,.029],arm);
        for(let j=-1;j<=1;j++)taper(blue,[[s*.12,-.18,.10],[s*(.14+j*.047),-.22,.14],[s*(.13+j*.06),-.31,.15]],
          [.026,.018,.002],arm);
        const horn=joint(s*.24,1.09,-.035,'z',.025,s);
        taper(blue,[[0,0,0],[s*.032,.08,0],[s*.055,.15,-.015]],[.027,.023,.025],horn);
        const normal=v(s*.60,.77,.10).normalize(),rim=ring(light,s*.055,.15,-.015,.074,.013,horn);
        rim.quaternion.setFromUnitVectors(v(0,0,1),normal);
        const hole=mesh(new T.CircleGeometry(.061,28),0x25585b,horn);hole.position.copy(rim.position).addScaledVector(normal,-.004);hole.quaternion.copy(rim.quaternion);hole.material.side=T.DoubleSide;
      }
    }
    oval(0xa86e62,0,hy-.025,.339,.076,.068,.033);
    oval(0xf1adb7,0,hy-.021,.361,.067,.058,.029);
    strand(0x81565c,[[-.040,hy-.025,.384],[-.035,hy-.046,.389],[-.013,hy-.048,.393],[0,hy-.026,.396],[.013,hy-.048,.393],[.035,hy-.046,.389],[.040,hy-.025,.384]],.006);
    oval(0xffe9e4,-.015,hy+.006,.390,.019,.012,.006);
    if(adult){
      const chest=new T.Shape();chest.moveTo(0,.66);chest.bezierCurveTo(-.09,.61,-.21,.46,-.15,.39);
      chest.bezierCurveTo(-.10,.34,-.025,.36,0,.41);chest.bezierCurveTo(.025,.36,.10,.34,.15,.39);
      chest.bezierCurveTo(.21,.46,.09,.61,0,.66);
      const mark=mesh(new T.ExtrudeGeometry(chest,{depth:.007,bevelEnabled:true,bevelSize:.006,bevelThickness:.004,bevelSegments:2,curveSegments:16}),blue);
      mark.position.z=.205;
    }
  }else if(id===188||id===189){
    const adult=id===189,blue=0x619fc6,green=0x66bc75,cream=0xf4e6c9,dark=0x304f62;
    const base=adult?.34:.025,top=adult?1.0:.80,rx=adult?.265:.238;
    const profile=[[0,base],[.045,base+.04],[.12,base+.19],[rx*.82,top-.18],[rx,top-.035],[rx*.82,top+.04],[0,top+.04]];
    const hull=mesh(new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),40),cream);hull.scale.z=.86;
    for(const y of [base+.24,base+.45]){
      const scale=(y-base)/(top-base),w=rx*(.49+.39*scale),z=rx*.79;
      strand(dark,[[-w,y+.067,z*.58],[-w*.50,y+.09,z*.91],[w*.10,y+.004,z],[w*.70,y-.054,z*.80],[w,y-.042,z*.54]],.008);
    }
    if(adult){
      cylinder(blue,0,.34,0,.10,.10,.07);
      for(let k=0;k<7;k++){
        const r=.077*(1-k/7),yy=.30-k*.040;
        cylinder(k%2?0x566b7a:0x8c9eaa,0,yy,0,r,r*.64,.045,body,true,24);
      }
    }
    const headY=adult?1.06:.80;
    const helmet=oval(blue,0,headY,-.015,rx*1.15,adult?.225:.235,rx*1.03);
    finishSpiritPart(helmet,'scute',materials);
    for(const s of [-1,1]){
      const streak=[];for(let k=0;k<=24;k++){const t=k/24*.9;streak.push([s*rx*(.10+.83*Math.sin(t)),headY+.222*Math.cos(t),-.015+rx*.55*Math.sin(t)]);}
      strand(green,streak,adult?.017:.012);
      const jewel=oval(0xb53e8a,s*(adult?.17:.16),headY+(adult?.095:.13),adult?.18:.17,adult?.038:.019,adult?.051:.023,.018);
      finishSpiritPart(jewel,'gem',materials);oval(0xffd0eb,s*(adult?.17:.16)-.008,headY+(adult?.115:.14),adult?.199:.188,.009,.014,.004);
      if(adult)oval(0xe476b7,s*.245,headY-.002,.139,.022,.026,.013);
      const antenna=[[s*.064,headY+.21,-.01],[s*.10,headY+.36,-.025],[s*.17,headY+.56,.015]];
      taper(0xc89b31,antenna,adult?[.014,.013,.008]:[.009,.008,.001]);
      if(adult)for(let k=0;k<8;k++){
        const t=(k+1)/10,x=s*(.064+.106*t),y=headY+.21+.35*t;
        const band=ring(0x8b6922,x,y,-.01,.012,.0025);band.rotation.x=Math.PI/2;band.rotation.z=-s*.24;
      }
      const arm=joint(s*(adult?.265:.26),adult?.99:.79,0,'x',adult?.055:.10,s);
      const fistX=s*(adult?.33:.06),fistY=adult?-.34:0;
      if(adult){
        rod(dark,[0,0,0],[s*.16,-.12,.07],.058,arm);rod(blue,[s*.025,-.015,.01],[s*.13,-.10,.06],.076,arm);
        rod(green,[s*.025,-.015,.01],[s*.05,-.035,.023],.082,arm);
        rod(dark,[s*.16,-.12,.07],[s*.30,-.32,.11],.057,arm);rod(blue,[s*.18,-.145,.078],[s*.28,-.29,.10],.076,arm);
        rod(green,[s*.18,-.145,.078],[s*.20,-.175,.085],.083,arm);
      }
      const fist=joint(fistX,fistY,adult?.12:.035,'z',.045,s,arm),r=adult?.145:.143;
      finishSpiritPart(oval(blue,0,0,0,r,r,r,fist),'scute',materials);
      for(let k=0;k<7;k++){
        const a=k*2.39996,b=-.75+(k%4)*.46,normal=v(Math.sin(a)*Math.cos(b),Math.sin(b),Math.cos(a)*Math.cos(b));
        if(adult){
          const spike=mesh(new T.ConeGeometry(.025,.048,8),cream,fist);spike.position.copy(normal).multiplyScalar(r+.013);spike.quaternion.setFromUnitVectors(v(0,1,0),normal);
        }else{
          const spot=oval(cream,normal.x*r*.98,normal.y*r*.98,normal.z*r*.98,.039,.044,.007,fist);spot.quaternion.setFromUnitVectors(v(0,0,1),normal);
        }
      }
    }
    if(adult){
      oval(0x12212a,0,headY-.103,.199,.179,.073,.035);
      for(const s of [-1,1]){
        oval(0xfffdf0,s*.068,headY-.098,.226,.040,.047,.014);
        oval(0x182b33,s*.065,headY-.081,.239,.025,.030,.007);
      }
      for(let k=0;k<4;k++){
        const spine=mesh(new T.ConeGeometry(.035,.086,8),green);spine.position.set(0,headY+.17-k*.065,-.17-k*.035);spine.rotation.x=-.65;
      }
    }else for(const s of [-1,1]){
      oval(dark,s*.109,.80,.185,.106,.139,.035);oval(0xfffdf3,s*.109,.80,.209,.093,.126,.028);
      finishSpiritPart(oval(0x87356e,s*.109,.815,.231,.069,.095,.020),'iris',materials);
      oval(0x151c24,s*.096,.831,.246,.048,.072,.012);oval(0xffffff,s*.105-.021,.865,.259,.025,.031,.007);
    }
  }else if(id===91){
    // A white floating teardrop, two long tipped antennae, large olive-black eyes.
    const head=joint(0,.62,0,'z',.045);
    finishSpiritPart(oval(0xf4f5ef,0,0,0,.305,.30,.255,head),'velvet',materials);
    oval(0xd7dfdf,0,.32,-.01,.085,.19,.075);
    oval(0xfafcf5,0,-.36+.62,.02,.055,.12,.049);
    for(const s of [-1,1]){
      const antenna=joint(s*.12,.85,0,'z',.06,s);
      strand(0xf2f5ed,[[0,0,0],[s*.019,.10,-.015],[s*.038,.25,-.008],[s*.065,.32,.008]],.018,antenna);
      oval(0xfafff8,s*.065,.32,.008,.045,.053,.042,antenna);
      const face=new T.Group();face.position.set(s*.172,-.018,.207);face.rotation.y=s*.38;head.add(face);
      oval(0x9da39b,0,0,0,.117,.164,.035,face);
      finishSpiritPart(oval(0x24291b,0,0,.026,.102,.149,.034,face),'iris',materials);
      oval(0x4b5138,s*.018,-.047,.051,.061,.085,.017,face);
      oval(0x080d0a,-s*.012,.024,.056,.074,.102,.020,face);
      strand(0xffffff,[[-.042,.020,.073],[-.040,.073,.070],[-.018,.100,.068]],.008,face);
      rod(0xf6f8ef,[s*.045,.33,0],[s*.15,.19,.025],.023);
    }
    strand(0x777d77,[[-.059,.46,.220],[-.035,.445,.233],[0,.458,.239],[.036,.445,.233],[.060,.460,.22]],.007);
  }else if(id===89||id===90){
    const adult=id===90,pink=adult?0xf0b3be:0xee9da7,orange=0xee8c17,gold=0xffbd45,cream=0xffe8a2;
    oval(pink,0,.43,-.08,.30,.25,.40);
    const head=joint(0,.46,.30,'x',.026);
    oval(adult?0xf7e8e7:pink,0,0,.04,.25,.21,.25,head);
    for(const s of [-1,1]){
      const face=new T.Group();face.position.set(s*.20,.068,.175);face.rotation.y=s*.79;head.add(face);
      oval(0xa44c55,0,0,0,.111,.105,.022,face);
      oval(0xffdfdd,0,.005,.015,.097,.086,.024,face);
      finishSpiritPart(oval(0xc52f39,0,-.005,.038,.055,.070,.020,face),'iris',materials);
      oval(0x37191f,0,.005,.055,.037,.052,.012,face);oval(0xfffaf0,-.011,.025,.067,.014,.021,.006,face);
      oval(pink,s*.228,-.005,-.035,.079,.145,.123,head);
      for(const zz of [-.29,.22]){
        const leg=joint(s*.20,.31,zz,'x',.055,s+zz*4);
        oval(adult?0xf9e9e5:pink,0,-.12,0,.077,.19,.085,leg);
        oval(adult?0xfff1e8:0xe696a0,0,-.255,.025,.09,.045,.105,leg);
        for(const dx of [-.037,.037])strand(0xb57078,[[dx,-.244,.116],[dx,-.272,.118]],.005,leg);
      }
    }
    const nose=adult?[[0,-.04,.17],[0,-.17,.29],[0,-.34,.33],[0,-.38,.27],[0,-.30,.22]]:
      [[0,-.025,.17],[0,-.105,.32],[0,-.13,.45],[0,-.10,.51]];
    taper(adult?0xffeae8:pink,nose,adult?[.102,.070,.045,.018]:[.105,.077,.061,.064],head);
    if(!adult){
      const opening=ring(0xcd747e,0,-.10,.51,.064,.012,head);opening.rotation.x=-.25;
      oval(0x9c4554,0,-.10,.517,.048,.048,.007,head);
    }else for(const s of [-1,1])taper(0xfffaf1,[[s*.16,-.08,.16],[s*.20,-.15,.25],[s*.24,-.235,.30]],[.060,.040,.001],head);
    // The orange carapace is a connected dome with a pale rolled border.
    const positions=[],indices=[],rows=18,sectors=48;
    for(let j=0;j<=rows;j++)for(let k=0;k<sectors;k++){
      const a=k*tau/sectors,t=j/rows*Math.PI*.5,front=Math.cos(a),r=Math.sin(t);
      positions.push(.355*r*Math.sin(a),.58+.215*Math.cos(t)+.025*front,-.075+.52*r*front);
      if(j<rows){const n=j*sectors+k,next=j*sectors+(k+1)%sectors;indices.push(n,n+sectors,next,next,n+sectors,next+sectors);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
    finishSpiritPart(mesh(g,orange),'scute',materials);
    const border=[];for(let k=0;k<=64;k++){const a=k*tau/64;border.push([.355*Math.sin(a),.58+.025*Math.cos(a),-.075+.52*Math.cos(a)]);}
    strand(cream,border,.031);
    for(const s of [-1,1])for(let k=0;k<3;k++){
      const x=s*(.14+.052*k),z=.29-.09*k,yy=.58+.215*Math.sqrt(Math.max(.05,1-(x/.355)**2-((z+.075)/.52)**2))+.025;
      const mark=oval(0x9e4e1a,x,yy,z,.025,.008,.037);mark.rotation.z=-s*.5;mark.rotation.x=.45;
    }
    if(adult){
      for(const s of [-1,1]){
        taper(gold,[[s*.11,.74,.35],[s*.19,.92,.42],[s*.19,1.13,.42],[s*.11,1.28,.38]],[.132,.123,.072,.002]);
        taper(orange,[[s*.27,.67,-.25],[s*.31,.87,-.33],[s*.27,1.05,-.30]],[.082,.071,.001]);
        taper(gold,[[s*.22,.66,-.44],[s*.23,.80,-.51],[s*.20,.95,-.48]],[.058,.045,.001]);
        const fold=[];for(let j=0;j<=30;j++){const t=j/30;fold.push([s*(.31+.025*Math.sin(Math.PI*t)),.55-.17*Math.sin(Math.PI*t),.28-.63*t]);}
        strand(pink,fold,.059);
      }
      taper(orange,[[0,.77,-.12],[0,1.04,-.19],[0,1.22,-.10]],[.112,.075,.001]);
    }else{
      const seam=[];for(let k=0;k<=28;k++){const t=k/28*Math.PI;seam.push([.022,.585+.215*Math.sin(t),-.075+.52*Math.cos(t)]);}
      strand(0xd26b13,seam,.010);
    }
  }else if(id===97||id===98){
    const adult=id===98,blue=0x3167a2,deep=0x123e69,cyan=0x32c7ca,teal=0x19ac91,white=0xe7eff0;
    if(adult){
      oval(teal,0,.38,-.22,.19,.20,.35);
      for(const s of [-1,1]){
        const front=joint(s*.18,.34,.25,'x',.08,s);
        oval(blue,0,-.12,.045,.118,.18,.16,front);oval(0x4e99dd,0,-.245,.075,.12,.055,.14,front);
        const back=joint(s*.20,.31,-.39,'x',.09,s+Math.PI);
        rod(white,[0,.025,.02],[s*.035,-.10,-.09],.067,back);
        oval(teal,s*.035,-.12,-.08,.080,.13,.10,back);oval(0x4a95d5,s*.035,-.23,-.08,.111,.056,.128,back);
        const collar=ring(white,s*.016,.37,-.25,.20,.025);collar.rotation.y=Math.PI/2;
      }
    }else{
      cylinder(deep,0,.26,0,.285,.25,.10);cylinder(blue,0,.21,0,.26,.23,.073);
      for(const s of [-1,1]){
        const foot=joint(s*.12,.15,0,'x',.075,s);
        oval(white,0,-.04,.035,.085,.12,.092,foot);oval(0xfafffa,0,-.098,.07,.068,.060,.063,foot);
      }
    }
    const head=joint(0,adult?.65:.55,adult?.19:0,'y',.035);
    const width=adult?.35:.48,height=adult?.40:.43;
    oval(teal,0,-.014,-.022,width*.61,height*.60,.16,head);
    plate(deep,0,0,.095,width+.10,height+.09,.015,.13,head);
    plate(cyan,0,0,.113,width+.062,height+.055,.014,.12,head);
    plate(teal,0,.012,.134,width+.025,height+.018,.013,.11,head);
    plate(white,0,.024,.152,width,height,.012,.105,head);
    for(const s of [-1,1]){
      oval(0x174c94,s*width*.25,.024,.185,width*.107,.068,.014,head);
      finishSpiritPart(oval(0x5f9ee7,s*width*.25,.024,.198,width*.084,.057,.013,head),'iris',materials);
      oval(0x123c72,s*width*.25,.03,.209,width*.048,.042,.009,head);
      oval(0xffffff,s*width*.25-.011,.047,.219,.012,.019,.005,head);
      const electrode=new T.Group();electrode.position.set(s*(width*.60),0,-.025);electrode.rotation.z=s*Math.PI/2;head.add(electrode);
      cylinder(deep,0,0,0,.245,.245,.055,electrode,true);
      cylinder(blue,0,-.034,0,.230,.230,.025,electrode,true);
      cylinder(cyan,0,-.053,0,.203,.203,.013,electrode);
      electricFan(s,s*(width*.60+.05),0,-.038,head);
    }
    strand(0x36556c,adult?[[-.027,-.077,.186],[0,-.067,.190],[.027,-.077,.186]]:
      [[-.052,-.083,.186],[-.024,-.094,.189],[0,-.084,.190],[.026,-.094,.189],[.052,-.083,.186]],.007,head);
    taper(0x1168b0,adult?[[0,.20,0],[0,.40,-.01],[-.025,.62,.015],[-.065,.76,.065]]:
      [[0,.20,0],[0,.34,.012],[0,.45,.01]],adult?[.152,.108,.046,.001]:[.126,.073,.001],head);
    if(adult)strand(0x65b9ed,[[-.16,.42,.27],[-.10,.30,.30],[0,.23,.30],[.10,.30,.30],[.16,.42,.27]],.025);
  }else if(id===105){
    // The white conical screw and the rose-grey hexagonal slotted bolt are its body.
    cylinder(0xe9edec,0,.32,0,.237,.008,.56,body,false,40);
    screw(0x65787d,0,.04,0,.52,.24,4.8);
    screw(0xf4faf7,0,.055,0,.51,.245,4.8);
    cylinder(0x94b6d8,0,.66,0,.172,.195,.20);
    for(let k=0;k<3;k++){const r=ring(0x2d5268,0,.59+k*.061,0,.181,.010);r.rotation.x=Math.PI/2;}
    for(const s of [-1,1]){
      oval(0x102a37,s*.105,.667,.160,.062,.079,.036);
      oval(0xffffff,s*.105,.675,.188,.039,.056,.020);
    }
    const cap=cylinder(0xb69d9e,0,.849,0,.274,.274,.225,body,false,6);cap.rotation.y=Math.PI/6;
    const lip=cylinder(0xe1d1ca,0,.965,0,.283,.283,.016,body,false,6);lip.rotation.y=Math.PI/6;
    block(0x776e70,0,.976,0,.115,.009,.48);
    block(0x776e70,0,.976,0,.41,.009,.104);
    block(0xaaa29d,0,.980,0,.078,.006,.44);
  }else if(id===106){
    const stone=0xbba29d,blue=0x7199bd,dark=0x3b505b;
    cylinder(0xe1e5e1,0,.24,0,.20,.004,.43,body,false,32);screw(0x59686a,0,.025,0,.405,.205,4.6);
    const torso=cylinder(stone,0,.52,0,.245,.19,.28,body,false,8);torso.rotation.y=Math.PI/8;
    cylinder(0xe5d0c7,0,.655,0,.24,.265,.07,body,false,8);
    cylinder(blue,0,.79,0,.235,.25,.19,body,false,12);
    plate(dark,0,.79,.224,.39,.088,.009,.025);
    for(const s of [-1,1]){
      oval(0xfffdf1,s*.10,.779,.241,.036,.041,.012);
      const arm=joint(s*.27,.55,0,'z',.055,s);
      const upper=cylinder(stone,0,-.09,0,.089,.115,.29,arm,false,6);upper.rotation.z=-s*.10;
      cylinder(blue,s*.014,-.24,0,.12,.115,.047,arm,false,6);
      oval(0xcbb3ad,s*.014,-.32,0,.116,.107,.103,arm);
      strand(0x8b7877,[[s*.037,.02,.086],[s*.025,-.10,.107],[s*.045,-.207,.103]],.006,arm);
    }
    const cap=cylinder(stone,0,1.00,0,.20,.32,.20,body,false,12);cap.rotation.y=Math.PI/12;
    cylinder(0xd4bfba,0,.90,0,.33,.33,.045,body,false,12);
    strand(0x73676a,[[-.04,1.105,-.17],[.02,1.106,-.06],[-.04,1.106,.04],[.02,1.105,.17]],.008);
    for(const s of [-1,1])strand(0x8a7674,[[s*.16,1.04,.14],[s*.21,.98,.20],[s*.20,.90,.25]],.006);
  }else if(id===119||id===120){
    const adult=id===120;
    // Low spotted legs beneath a heavy cream-and-mint spiral shell, not a snail body.
    const pink=0xdcae9d,cream=0xf4e0b4,groove=0xa89973;
    for(const s of [-1,1]){
      const foot=joint(s*.12,.13,.035,'x',.08,s);
      oval(pink,0,0,0,.082,adult?.095:.137,.092,foot);
      for(let i=0;i<3;i++)oval(0xb88478,(i-1)*.032,.02+.048*(i%2),.077,.013,.023,.008,foot);
    }
    oval(pink,0,.31,.17,.205,.159,.146);
    for(let i=0;i<9;i++){
      const a=i*2.4,x=Math.sin(a)*.159,y=.245+.073*Math.cos(a);
      oval(0xba8a7d,x,y,.293-Math.abs(x)*.18,.012,.019,.007);
    }
    for(const s of [-1,1]){
      oval(0x514343,s*.095,.335,.292,.047,.071,.023);
      oval(0xa46a68,s*.095,.337,.309,.034,.059,.018);
      oval(0x161719,s*.095,.340,.323,.020,.046,.012);
      oval(0xffffff,s*.095-.009,.364,.334,.010,.017,.006);
    }
    strand(0x805d58,adult?[[-.039,.265,.309],[-.034,.235,.316],[.034,.235,.316],[.039,.265,.309]]:
      [[-.079,.235,.300],[0,.225,.316],[.079,.235,.300]],.007);
    if(adult){
      const rows=12,sides=48,points=[],indices=[];
      for(let j=0;j<=rows;j++)for(let k=0;k<sides;k++){
        const t=j/rows,a=k*tau/sides,r=.105+.135*t*t;
        points.push(r*Math.sin(a),.30-.19*t+.016*t*Math.cos(5*a),.11+r*.66*Math.cos(a));
        if(j<rows){const n=j*sides+k,q=j*sides+(k+1)%sides;indices.push(n,n+sides,q,q,n+sides,q+sides);}
      }
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setIndex(indices);g.computeVertexNormals();
      const skirt=mesh(g,pink);skirt.material.side=T.DoubleSide;
      const hem=[];for(let k=0;k<=48;k++){const a=k*tau/48;hem.push([.24*Math.sin(a),.11+.016*Math.cos(5*a),.11+.24*.66*Math.cos(a)]);}
      strand(0xf9e4d4,hem,.010);
      for(let i=0;i<9;i++){const a=(i-4)*.22,r=.14+(i%3)*.03;oval(0xba8a7d,Math.sin(a)*r,.16+(i%3)*.034,.11+Math.cos(a)*r*.68,.013,.021,.006);}
    }
    const shell=oval(cream,0,.60,-.035,.345,.357,.304);
    const geo=sphere.clone(),pos=geo.attributes.position,col=[],top=new T.Color(0xe0f7d8).convertSRGBToLinear(),base=new T.Color(cream).convertSRGBToLinear(),shade=new T.Color();
    for(let i=0;i<pos.count;i++){shade.copy(base).lerp(top,T.MathUtils.smoothstep(pos.getY(i)+pos.getZ(i)*.30,.05,.91));col.push(shade.r,shade.g,shade.b);}
    geo.setAttribute('color',new T.Float32BufferAttribute(col,3));geometries.add(geo);shell.geometry=geo;
    const m=shell.material.clone();m.vertexColors=true;materials.set('shell-colour',m);shell.material=m;
    for(const s of [-1,1]){
      const spiral=[];
      for(let k=0;k<=110;k++){
        const t=k/110,a=-.65+tau*1.65*t,r=.271*(1-.89*t),yy=r*Math.cos(a),zz=r*Math.sin(a);
        spiral.push([s*(.345*Math.sqrt(Math.max(.05,1-(yy/.357)**2-(zz/.304)**2))+.006),.60+yy,-.035+zz]);
      }
      strand(groove,spiral,.011);
      if(adult){
        const point=cylinder(0xe3eac3,s*.385,.60,-.035,.005,.196,.26,body,false,48);
        point.rotation.z=-s*Math.PI/2;
        const cuff=ring(groove,s*.27,.60,-.035,.197,.010);cuff.rotation.y=Math.PI/2;
      }
    }
    strand(0xf8eac6,[[-.32,.37,.14],[-.26,.48,.19],[0,.51,.278],[.26,.48,.19],[.32,.37,.14]],.046);
  }else if(id===88){
    const stone=0x738b8c,edge=0xb2c3bf,moss=0x768e42,ivory=0xc9c9b8;
    cylinder(stone,0,.78,0,.39,.33,.29);
    cylinder(edge,0,.925,0,.27,.39,.11);
    cylinder(0x354f54,0,.98,0,.23,.23,.06);
    oval(stone,0,1.215,0,.47,.276,.30);
    oval(0x516d70,0,1.073,.105,.415,.089,.241);
    for(const x of [-.28,0,.28]){
      const z=.273-Math.abs(x)*.14;
      ring(0x536c32,x,1.23,z,.123,.018);
      eye(x,1.23,z+.006,.104,body,0x8fa8a2);
    }
    strand(0x718d40,[[-.395,1.23,.17],[-.27,1.23,.247],[0,1.23,.295],[.27,1.23,.247],[.395,1.23,.17]],.012);
    for(let i=0;i<8;i++){
      const a=i*tau/8,x=Math.sin(a)*.365,z=Math.cos(a)*.224;
      const crown=block(ivory,x,1.48,z,.15,.14,.12);crown.rotation.y=a;
      const tooth=block(ivory,x,1.575+(i%3)*.022,z,.069,.13,.113);tooth.rotation.y=a;
    }
    for(const s of [-1,1]){
      const arm=joint(s*.53,1.03,0,'x',.034,s);
      oval(stone,0,-.05,0,.135,.36,.137,arm);
      oval(edge,-s*.036,-.06,.113,.021,.29,.035,arm);
      for(const y of [-.34,-.42])cylinder(stone,0,y,0,.152,.145,.065,arm);
      oval(stone,0,-.50,0,.16,.15,.15,arm);
      for(const x of [-.085,.085])block(ivory,x,-.56,.116,.063,.16,.055,arm);
      strand(moss,[[0,.25,.12],[-s*.04,.12,.14],[s*.022,-.09,.144],[s*.005,-.23,.122]],.018,arm);
      const leg=joint(s*.18,.62,0,'x',.028,s*2);
      cylinder(stone,0,-.18,0,.14,.095,.38,leg);
      oval(stone,0,-.39,.015,.098,.09,.103,leg);
      const vine=[];for(let k=0;k<=64;k++){const t=k/64,a=t*tau*2.15;vine.push([.128*Math.cos(a)*(1-t*.28),-.04-.35*t,.128*Math.sin(a)*(1-t*.28)]);}
      strand(moss,vine,.014,leg);
    }
    for(let i=0;i<8;i++){
      const a=i*tau/8;rod(0x4d6568,[.335*Math.sin(a),.65,.335*Math.cos(a)],[.385*Math.sin(a),.88,.385*Math.cos(a)],.008);
    }
    strand(moss,[[-.37,.92,.05],[-.30,.81,.21],[-.19,.74,.32],[.07,.73,.35],[.30,.80,.25],[.37,.90,.07]],.023);
    strand(moss,[[.18,.88,.35],[.17,.75,.36],[.24,.71,.34],[.28,.78,.32]],.012);
  }else if(id===113){
    const gold=0xdba900,light=0xf3c716,steel=0x92999d,dark=0x474f55;
    const trunk=joint(0,.33,0,'z',.017);
    oval(gold,0,.12,0,.35,.25,.43,trunk,true);
    for(const s of [-1,1]){
      for(const z of [-.22,.20]){
        const leg=joint(s*.32,-.05,z,'x',.06,s+z,trunk);
        oval(dark,0,-.02,0,.16,.17,.18,leg,true);
        oval(light,s*.032,.04,.015,.16,.165,.18,leg,true);
        for(let k=-3;k<=3;k++)rod(steel,[k*.035,-.12,.115],[k*.035,-.17,.083],.007,leg,true);
      }
      const shoulder=joint(s*.29,.08,.30,'y',.065,s,trunk);
      cylinder(steel,s*.06,0,.04,.08,.08,.18,shoulder,true);
      rod(dark,[s*.04,0,.06],[s*.18,-.03,.29],.07,shoulder,true);
      oval(gold,s*.18,-.03,.31,.12,.12,.095,shoulder,true);
      // Each pincer is open; articulated prongs retain their hooked silhouette.
      for(const side of [-1,1]){
        const claw=joint(s*.18+side*.07,-.03,.35,'y',.035,side,shoulder);
        strand(steel,[[0,0,0],[side*.11,0,.13],[side*.10,0,.24],[side*.025,0,.26]],.048,claw,true);
      }
      const brow=oval(steel,s*.16,.32,.13,.065,.05,.18,trunk,true);brow.rotation.z=-s*.5;
    }
    for(const [x,y,z,r] of [[0,.22,.371,.12],[-.165,.065,.388,.135],[.165,.065,.388,.135]]){
      oval(steel,x,y,z,r*1.17,r*1.14,.041,trunk,true);
      oval(0x101c19,x,y,z+.031,r,r,.029,trunk,true);
      oval(0xf6ff71,x-r*.23,y-r*.31,z+.059,r*.19,r*.23,.009,trunk);
      oval(0xffffff,x-r*.25,y-r*.25,z+.067,r*.08,r*.10,.005,trunk);
    }
    const tail=joint(0,.24,-.30,'z',.035,.4,trunk);
    const path=[[0,0,0],[0,.14,-.17],[0,.34,-.24],[0,.55,-.22],[0,.70,-.10],[0,.76,.04]];
    for(let i=0;i<path.length-1;i++){
      const a=v(...path[i]),b=v(...path[i+1]),direction=b.clone().sub(a),g=new T.Group();g.position.copy(a).lerp(b,.5);g.quaternion.setFromUnitVectors(v(0,1,0),direction.normalize());tail.add(g);
      block(dark,0,0,0,.29,.20,.21,g,true);block(gold,0,0,.006,.31,.165,.23,g,true);
      block(light,-.118,0,.126,.035,.15,.018,g,true);
    }
    block(light,0,.78,.08,.43,.18,.27,tail,true);
    block(0x7e5c41,0,.75,.225,.37,.12,.014,tail,true);
    for(const x of [-.138,-.046,.046,.138]){
      const spike=mesh(new T.ConeGeometry(.039,.16,16),0xd93b46,tail,true);spike.rotation.x=Math.PI/2;spike.position.set(x,.75,.30);
    }
  }
  let time=0;
  return {root,update(dt,effort=0){
    time+=Math.min(dt,.12);const motion=1+Math.min(1,effort);
    for(const j of joints)j.g.rotation[j.axis]=Math.sin(time*(id===113?1.4:1.8)*motion+j.phase)*j.amount;
    for(const [i,m] of discharges.entries())m.opacity=.28+.22*(.5+.5*Math.sin(time*2.4+i*.45));
    body.position.y=id===91?.025*Math.sin(time*2.4):[105,106,188,189].includes(id)?.014*Math.sin(time*2):0;
    if(id===105)body.rotation.y=.065*Math.sin(time*.9);
  },dispose(){for(const g of geometries)g.dispose();for(const m of materials.values())m.dispose();}};
}
