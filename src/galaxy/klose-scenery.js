// All scenery is authored geometry. Sites share one tangent chart and leave
// the original map connections open. The historic hunting rooms share a biome.
function createKloseScenery(T, parent, surface) {
  const {sites,pools,height,frame,move,point,chart,trail}=surface;
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
  shape('pool',new T.SphereGeometry(1,48,12),gloss);
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
  shape('crystal',new T.LatheGeometry([[.04,-.04],[.29,0],[.36,.16],[.31,.72],[0,1]].map(([x,y])=>new T.Vector2(x,y)),6),gloss);
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
        const tone=.79+.21*Math.cos(a-.3)**2+.055*Math.cos(5*a);
        colors.push(tone,tone*.965,tone);
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
  const randFrom=value=>()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
  const lerp=(a,b,t)=>a+(b-a)*t;
  function pipiModel() {
    const animal=new T.Group(),ears=[];
    const pink='#f5b2ca',light='#ffd3e1',tip='#381b2a',cheek='#ff778f';
    const materials=new Map();
    function paint(hex) {
      if (!materials.has(hex)) materials.set(hex,new T.MeshStandardMaterial({color:color(hex),roughness:.61}));
      return materials.get(hex);
    }
    function oval(x,y,z,sx,sy,sz,hex) {
      const m=new T.Mesh(shapes.get('round').geo,paint(hex));m.position.set(x,y,z);m.scale.set(sx,sy,sz);animal.add(m);return m;
    }
    oval(0,.102,0,.104,.078,.073,pink);
    oval(0,.067,-.083,.044,.043,.047,light);
    const span=12,steps=32;
    for (const side of [-1,1]) {
      const foot=oval(side*.063,.035,.031,.050,.035,.048,pink);foot.rotation.z=side*.17;
      oval(side*.079,.088,.047,.026,.018,.014,cheek);
      oval(side*.035,.117,.064,.012,.017,.008,'#291f2a');
      oval(side*.035-.002,.123,.072,.0044,.005,.003,'#fff8fc');
      const ear=new T.Group();ear.position.set(side*.055,.149,0);animal.add(ear);ears.push(ear);
      const curve=new T.CubicBezierCurve3(v(0,0,0),v(side*.028,.277,-.006),v(side*.16,.294,-.012),v(side*.175,-.024,.012));
      const p=[],rgb=[],idx=[],base=color(pink),end=color(tip);
      for(let j=0;j<=steps;j++) {
        const t=j/steps,center=curve.getPoint(t),tangent=curve.getTangent(t);
        const lateral=v(-tangent.y,tangent.x,0).normalize();
        const rad=.016+.012*Math.sin(Math.PI*t)+.015*Math.exp(-((t-.88)**2)/.009);
        const taper=t>.91?Math.sqrt(Math.max(0,1-((t-.91)/.09)**2)):1;
        for(let k=0;k<span;k++) {
          const a=tau*k/span,offset=lateral.clone().multiplyScalar(rad*taper*Math.cos(a));
          p.push(center.x+offset.x,center.y+offset.y,center.z+.72*rad*taper*Math.sin(a));
          const c=t>.76+.016*Math.cos(a)?end:base;rgb.push(c.r,c.g,c.b);
          if(j) {const l=(j-1)*span+k,r=(j-1)*span+(k+1)%span;idx.push(l,r,l+span,r,r+span,l+span);}
        }
      }
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));
      geo.setAttribute('color',new T.Float32BufferAttribute(rgb,3));geo.setIndex(idx);geo.computeVertexNormals();
      ear.add(new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.66})));
    }
    const bill = new T.Mesh(new T.ConeGeometry(1,1,4),paint('#43ade6'));
    bill.position.set(0,.089,.077);bill.rotation.x=Math.PI*.47;bill.rotation.y=Math.PI*.25;bill.scale.set(.018,.027,.012);animal.add(bill);
    animal.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    animal.name='010 · 皮皮'; return {animal,ears};
  }
  function makeSite(site,order) {
    const group=new T.Group(),near=new T.Group(),far=new T.Group();
    group.name=site.name;group.add(near,far);parent.add(group);
    group.position.copy(point(site.lat,site.lon));group.quaternion.copy(frame(site.lat,site.lon).quaternion);
    const seed=randFrom(167518+order*71837),choose=list=>list[Math.floor(seed()*list.length)];
    const records=new Map(),baseHeight=height(site.lat,site.lon),obstacles=[];
    function obstacle(x,z,r) {obstacles.push({x:site.x+x,z:site.z+z,r});}
    function yAt(x,z) {
      const at=move(site.lat,site.lon,x,-z);
      return height(at.lat,at.lon)-baseHeight-(x*x+z*z)/(2*780000);
    }
    function stamp(key,x,y,z,sx,sy,sz,hex,rx=0,ry=0,rz=0) {
      temp.position.set(x,y,z);temp.rotation.set(rx,ry,rz);temp.scale.set(sx,sy,sz);temp.updateMatrix();
      remember(key,hex);
    }
    function remember(key,hex) {
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
      return Math.hypot(x,z)<8+pad || trail(site.x+x,site.z+z)<3+pad ||
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
        stamp('round',q.x-.034*s,q.y-.04*s,q.z+.071*s,.03*s,.045*s,.025*s,'#a4caeb');
      }
    }
    function tree(x,z,s,flame=false,rooty=false) {
      const g=yAt(x,z),phase=seed()*tau;
      const bark=flame?'#65466a':rooty?'#685d42':'#655852';
      const top=v(x+.22*s,g+1.96*s,z-.18*s),mid=v(x-.12*s,g+1.05*s,z);
      tendril([v(x,g-.07*s,z),mid,top],s*.22,bark,true);
      obstacle(x,z,s*.20);
      for(let j=0;j<5;j++) {
        const a=phase+tau*j/5,dx=Math.cos(a),dz=Math.sin(a);
        const root=v(x+dx*.72*s,yAt(x+dx*.72*s,z+dz*.72*s),z+dz*.72*s);
        tendril([v(x,g+.36*s,z),v(x+.37*s*dx,g+.08*s,z+.37*s*dz),root],s*.135,bark);
        const end=v(top.x+s*.73*dx,top.y+(.16+seed()*.38)*s,top.z+s*.73*dz);
        tendril([mid,v(top.x+s*.32*dx,top.y-.39*s,top.z+s*.32*dz),end],s*.13,bark);
        const crowns=flame?['#e9a234','#e58b30','#f1bf46','#cb7539']:rooty?['#777b42','#647951','#9a994f']:['#4d9892','#66b0a2','#78bab0'];
        stamp('rock',end.x,end.y,end.z,s*.72,s*.32,s*.65,choose(crowns),seed()*.22,a);
        if(flame) leafFan(end.x,end.y+.18*s,end.z,.65*s,crowns,6);
      }
      if(flame||rooty) {
        const vine=[];
        for(let j=0;j<=16;j++) {
          const f=j/16,a=phase+f*Math.PI*3.4;
          vine.push(v(x+.225*s*Math.cos(a)+.10*s*f,g+s*(.06+1.88*f),z+.225*s*Math.sin(a)));
        }
        tendril(vine,.055*s,flame?'#2191ae':'#879149');
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
      const y=yAt(x,z),palette=amber?['#ffbd49','#f6d273','#dd9448']:['#33ceba','#69ebce','#2fa893'];
      for(let k=0;k<8;k++) {
        const a=tau*k/8,l=(.45+seed()*.7)*s;
        stamp('crystal',x+.32*s*Math.cos(a),y-.12*s,z+.32*s*Math.sin(a),l,l*1.33,l,choose(palette),-.42*Math.sin(a),a,.37*Math.cos(a));
      }
    }
    function roughLedge(x,z,s,c,az) {
      const y=yAt(x,z);
      stamp('facet',x,y+s*.28,z,s,s*.78,s*.87,c,.06,az,-.07);
      stamp('boulder',x,y+s*.65,z,s*1.04,s*.28,s*.88,'#c0a47f',.04,az);
      if(s>1.5)obstacle(x,z,s*.77);
    }
    // Perimeter landforms are separated from the central navigation lanes.
    for(let k=0;k<105;k++) {
      const a=seed()*tau,r=12+Math.sqrt(seed())*68,x=r*Math.cos(a),z=r*Math.sin(a);
      if(blocked(x,z,1.4))continue;
      const g=yAt(x,z),n=seed(),s=.6+seed()*2;
      if (site.id==='grassland'||site.id==='wetland'||site.id==='sanctuary') {
        const greens=['#5093a0','#72bbca','#529ead','#75a678'];
        if(n<.18) {
          stamp('rock',x,g-.12*s,z,s*2,s*.46,s*1.5,choose(greens),.04,a);
          leafFan(x,g+.22*s,z,s,greens,6);
        } else if (n<.37) leafFan(x,g,z,s*.9,greens,8);
        else if(n<.53)curled(x,g,z,s,a,choose(['#e791aa','#db88ae','#edacbd']), '#565da3');
        else if(n<.73 && r>29)roughLedge(x,z,s*1.3,'#ae816b',a);
        else if(n<.82 && r>38)tree(x,z,s*1.8);
        else stones(x,z,s*.35,'#c09c7b');
      } else if(site.id==='swamp'||site.id==='forest'||site.id==='vineway') {
        if(n<.35&&r>18)tree(x,z,s*1.9,false,true);
        else if(n<.64)leafFan(x,g,z,s*1.2,site.id==='vineway'?['#494a75','#575d8c']:['#7d8a46','#a2a457','#748348'],9);
        else if(n<.83)spore(x,z,s*.65,'#a9926f',choose(['#bd8656','#cb9d65','#a98761']),false);
        else stones(x,z,s*.85,'#82785c');
      } else if(site.id==='flame') {
        if(n<.43)tree(x,z,s*2.1,true);
        else if(n<.74)leafFan(x,g,z,s,['#396381','#587b9d','#56527d']);
        else if(n<.9)stones(x,z,s,'#8b6570');
      } else if(site.id==='core'&&r<38) {
        if(n<.55)stones(x,z,s*.9,'#7d685d');
        else if(n<.72)crystals(x,z,s*.72);
        else spore(x,z,s*.72,'#b38e67','#ba7747',false);
      }
    }
    // Foreground characteristic details are deliberately hand-placed at each clearing.
    if(site.id==='grassland') {
      for(const [x,z,s] of [[-8,-11,2.2],[-11,-9,1.1],[-10,-14,1.7]]) {
        stones(x,z,s*1.1,'#a77860');crystals(x+.27*s,z+.78*s,s*.93,true);
      }
      for(const [x,z,s] of [[6,-14,2.3],[9,-13,1.65],[10,-17,2.8],[-11,5,2.6]])
        curled(x,yAt(x,z),z,s,.4,'#e6a0b6','#5860a1');
      // Blue turf in scalloped beds gives the upper terraces and the landing
      // clearing different silhouettes. The orange walking lanes stay visible.
      for(const [x,z,sx,sz] of [[-8,-12,5.4,5.1],[-10,-5,4.3,2.8],[8,-13,5.2,6.3],[8,-6,3.4,3.1],[13,2,7,4.6],[-8,2.5,3.6,2.2],[-15,-21,9,7],[14,-22,10,7]]) {
        const g=yAt(x,z);
        stamp('sod',x,g+.08,z,sx,1.35,sz,'#5499a8',0,seed()*.66);
        for(let j=0;j<32;j++) {
          const a=seed()*tau,t=Math.sqrt(seed()),px=x+sx*t*Math.cos(a),pz=z+sz*t*Math.sin(a);
          if(trail(site.x+px,site.z+pz)<1.35)continue;
          const py=yAt(px,pz)+.1+.17*(1-t);
          const s=.15+.61*seed();
          leafFan(px,py,pz,s,['#58a6b2','#73babe','#43919f','#789e76'],4+Math.floor(seed()*3));
          if(j%7===0) {
            const h=.38+.42*seed();link(v(px,py,pz),v(px+.09,py+h,pz),.022,'#6e9774');
            stamp('round',px+.09,py+h,pz,.10,.07,.11,'#e8b489');
          }
        }
      }
      for(let i=0;i<26;i++) {
        const x=lerp(-21,23,i/25),z=-23+3*Math.sin(.18*x);
        if(blocked(x,z,2))continue;
        roughLedge(x,z,1.8+.55*seed(),'#c09579',.32);
        stamp('sod',x,yAt(x,z)+1.42,z-.95,2.8,1.3,3.35,choose(['#5499b0','#63a5b8','#75b9c5']),.02,.1);
        if(i%2===0)leafFan(x+.24,yAt(x,z)+1.78,z-.7,.8,['#5195af','#67aabd','#77bdca'],7);
      }
      for(const [x,z,p] of [[2,-6,.8],[-1.6,-8.3,2.2],[4.2,-12.1,4],[10.5,4.8,6],[-13,11,1.7]]) {
        const {animal,ears}=pipiModel();near.add(animal);
        pipi.push({animal,ears,site,x,z,phase:p,yAt,at:move(site.lat,site.lon,x,-z)});
      }
    }
    if(site.id==='swamp') {
      // Root buttresses arch over the branch leading down to the vine passage.
      for(const [x,z,r] of [[5,14,1],[-6,24,.8],[-7,-23,.9]]) {
        const g=yAt(x,z),pts=[v(x-5*r,g,z),v(x-3.8*r,g+2.8*r,z-.4),v(x-.9*r,g+4.3*r,z-.3),v(x+2.6*r,g+3.5*r,z),v(x+5*r,g,z+.4)];
        tendril(pts,.69*r,'#786c4b',true);
        obstacle(x-5*r,z,.6*r);obstacle(x+5*r,z,.5*r);
      }
      for(const [x,z] of [[7,-8],[-9,7],[9,11]]) {
        const g=yAt(x,z);
        stamp('round',x,g+.33,z,.47,.44,.44,'#709b63');
        for(let j=0;j<12;j++) {const a=j*tau/12;stamp('crystal',x+.36*Math.cos(a),g+.34,z+.34*Math.sin(a),.11,.21,.11,'#e8cf8b',.7*Math.sin(a),0,-.7*Math.cos(a));}
        stamp('round',x,g+.69,z,.13,.09,.12,'#e3a4a7');
      }
    }
    if(site.id==='forest') {
      for(let i=0;i<6;i++) {
        const x=-14-seed()*5,z=-11+4*i,y=yAt(x,z),s=3.8+seed();
        stamp('boulder',x,y+.48*s,z,s,s*.72,s*1.2,'#b39c78',0,seed());
        obstacle(x,z,s*.79);
        for(let j=0;j<7;j++) {
          const a=tau*j/7;
          stamp('round',x+.72*s*Math.cos(a),y+s*1.02,z+.7*s*Math.sin(a),s*.16,s*.037,s*.25,'#554b42',0,a);
        }
      }
      // 047's broad mottled cap, shadowed face, pale eyes and four stout legs
      // distinguish the protected individual from nearby ordinary fungi.
      const bx=7,bz=-11,base=yAt(bx,bz);
      for(const dx of [-.42,.42])for(const dz of [-.24,.24])
        stamp('round',bx+dx,base+.33,bz+dz,.20,.40,.19,'#b59c70',.05,0,-dx*.25);
      stamp('round',bx,base+.52,bz,.62,.39,.43,'#bfab7c');
      stamp('round',bx,base+.82,bz+.21,.48,.215,.26,'#39312b');
      for(const off of [-.17,.15])stamp('round',bx+off,base+.86,bz+.46,.057,.088,.035,'#fff3da');
      stamp('cap',bx,base+.86,bz,.88,.67,.73,'#985632',.03,.27,-.13);
      for(let j=0;j<9;j++) {
        const a=j*tau/9,r=j%3?.61:.32;
        stamp('round',bx+Math.cos(a)*r,base+(j%3?1.14:1.34),bz+Math.sin(a)*r*.7,.16,.04,.14,'#d9c196',0,a);
      }
      for(const [dx,dy] of [[.51,.53],[.60,.44]])stamp('round',bx+dx,base+dy,bz+.27,.13,.16,.11,'#c19e6a');
      for(let i=0;i<18;i++){const a=seed()*tau,r=3+seed()*5;spore(7+r*Math.cos(a),-11+r*Math.sin(a),.29+.43*seed(),'#baa283','#a97d5e');}
      const ward=new T.Mesh(shapes.get('round').geo,new T.MeshPhysicalMaterial({color:color('#8bd8bd'),transparent:true,opacity:.19,roughness:.28,side:T.FrontSide,depthWrite:false}));
      ward.scale.set(2.55,2.6,2.55);ward.position.set(7,yAt(7,-11)+.58,-11);near.add(ward);
      obstacle(7,-11,2.22);
      for(const [x,z] of [[-11,-7],[12,-15],[17,8],[-18,10]]) {
        for(let j=0;j<4;j++) {
          const dx=x+j*.43;const g=yAt(dx,z);
          tendril([v(dx+.3,g+12,z),v(dx-.3,g+7.1,z+.4),v(dx,g+.2,z)],.14,'#776f43');
        }
      }
    }
    if(site.id==='wetland') {
      for(let i=0;i<5;i++) {
        const x=8+i*1.22,z=-9+.12*Math.sin(i),g=yAt(x,z);
        stamp('facet',x,g+.18,z,.67,.31,.62,'#a59770',0,.2*i);
      }
      const x=7,z=-12,g=yAt(x,z);
      stamp('facet',x,g+.27,z,2.8,.54,2.65,'#9b8065');
      stamp('facet',x,g+.55,z,2.33,.15,2.30,'#8dab6d');
      stamp('rim',x,g+.64,z,1.74,1.72,.45,'#d0af67',Math.PI/2);
    }
    for(const p of pools.filter(p=>p.id===site.id)) {
      const x=p.dx,z=p.dz,y=yAt(x,z),isCore=site.id==='core',isWet=site.id==='wetland';
      const water=isCore?'#53d7be':isWet?'#dbaa52':'#619e91';
      const waterLevel=y+(isCore?.99:.75);
      stamp('pool',x,waterLevel,z,p.rx*.96,.13,p.rz*.96,water);
      for(let j=0;j<22;j++) {
        const a=seed()*tau,t=.91+seed()*.12,dx=x+t*p.rx*Math.cos(a),dz=z+t*p.rz*Math.sin(a);
        if(!isCore && seed()<.45)reeds(dx,dz,.8+seed()*.9,'#979152');
        else stones(dx,dz,.35+seed()*.62,isCore?'#b78d9d':'#97936e');
      }
      for(let j=0;j<8;j++) {
        const a=seed()*tau,f=seed()*.68,px=x+p.rx*f*Math.cos(a),pz=z+p.rz*f*Math.sin(a);
        stamp('round',px,waterLevel+.139,pz,.36+seed(),.009,.04+seed()*.035,isCore?'#a4ffdd':isWet?'#edd495':'#9bbfb0',0,.13);
      }
      if(isCore) {
        stamp('rock',x,waterLevel+.16,z,1.7,.49,1.35,'#8c8b64');
        stamp('rock',x,waterLevel+.49,z,1.32,.17,1.05,'#a3ae70');
      }
    }
    if(site.id==='vineway') {
      // Ogre roots form the actual covered descent. The open strip follows
      // the bearing of the swamp-to-core edge through each arch.
      const roof='#4e5461',rootColor='#616752';
      for(let i=0;i<12;i++) {
        const z=-41+i*7.2,x=-z*.28,g=yAt(x,z),w=8.5+seed()*1.4;
        const pts=[v(x-w,g-.6,z),v(x-w+.9,g+4,z+.9),v(x-3.4,g+8.5+.7*seed(),z+1.3),v(x+2,g+9.3,z+.9),v(x+w-1.5,g+6,z),v(x+w,g,z-.5)];
        tendril(pts,1.65,roof,true);
        obstacle(x-w,z,1.42);obstacle(x+w,z,1.32);
        const red=pts.map(p=>v(p.x+.48,p.y-.64,p.z+.72));tendril(red,.21,i%3?'#805564':'#984f60',true);
        for(const side of [-1,1]) {
          const xx=x+side*w;stones(xx,z,2.5,'#5b6178');
          leafFan(xx,g+1,z,1.4,['#675e8a','#55577a','#7d7198'],8);
        }
        const edge=x+w-2.7;
        tendril([v(edge,g+2,z-3.7),v(edge-.5,g+1.3,z),v(edge+.35,g+1.8,z+3.7)],.36,rootColor);
      }
    }
    if(site.id==='core') {
      const shell=['#61554c','#665c52','#736157','#79685a'];
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
      stamp('rock',0,floor+18,0,24,4.1,25,'#64594e',.03,.19);
      for(const [x,z,s] of [[9,-16,3.3],[13,-13,4],[14,-10,2.4],[11,-20,3.4],[-17,7,1.85]])crystals(x,z,s);
      const light=new T.PointLight(0x71fadd,1.8,44);light.position.set(-5,floor+4,-13);near.add(light);
      const fill=new T.PointLight(0xf7ca92,.95,45);fill.position.set(1,floor+5,4);near.add(fill);
    }
    if(site.id==='flame') {
      for(const [x,z,s] of [[-9,-12,4.6],[10,-13,4.2],[14,-6,3.2]])tree(x,z,s,true);
      const g=yAt(-14,-4);
      tendril([v(-21,g-1,-5),v(-20,g+4,-5),v(-17,g+5.4,-5),v(-13,g+5.2,-5),v(-11,g+3,-5),v(-10,g,-5)],1.6,'#997165',true);
      const fx=-13,fz=-6,fy=yAt(fx,fz);
      stamp('round',fx,fy+.42,fz,1,.44,.4,'#de7851',.03);
      stamp('round',fx+.7,fy+.82,fz+.12,.44,.41,.35,'#f09c5e');
      for(const s of [-1,1]) {
        stamp('crystal',fx+.68,fy+1.04,fz+s*.2,.33,.56,.31,'#d87857',0,0,-.26);
        stamp('round',fx+.95,fy+.90,fz+s*.23,.047,.066,.043,'#443740');
      }
      stamp('round',fx+1.02,fy+.74,fz+.12,.2,.16,.22,'#eac49b');
      for(let j=0;j<3;j++)stamp('rock',fx-1.05,fy+.52+.24*j,fz-.3+.28*j,.82,.2,.24,'#dc714d',.1,0,-.26-j*.12);
    }
    if(site.id==='sanctuary') {
      const x=0,z=-14,g=yAt(x,z);
      for(const [r,h,shade] of [[5,.4,'#94765b'],[4.5,.7,'#bb9870'],[4,.92,'#dab88c']]) stamp('facet',x,g+h*.48,z,r,h,r,shade,0,.19);
      stamp('rim',x,g+.96,z,3.25,3.25,.47,'#cda76d',Math.PI/2);
      obstacle(x,z,4.25);
      for(const [px,pz,s] of [[-7,-15,3.7],[7,-16,3.1],[-8,-21,2.5],[9,-23,4.1]]) {
        const y=yAt(px,pz);stamp('boulder',px,y+s*.57,pz,s*.34,s,s*.31,'#b79778',.16,.26,-.18);
        stamp('facet',px-.05,y+s*.67,pz+.21,s*.24,s*1.5,s*.20,'#dbb68a',.16,.26,-.18);
        obstacle(px,pz,s*.26);
      }
    }
    for(const [key,items] of records) {
      const {geo,material}=shapes.get(key);
      function batch(target,geometry,entries) {
        if(!entries.length)return;
        const mesh=new T.InstancedMesh(geometry,material,entries.length);
        entries.forEach((item,i)=>{mesh.setMatrixAt(i,item.matrix);mesh.setColorAt(i,color(item.hex));});
        mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;
        mesh.receiveShadow=true;mesh.castShadow=target===near&&key!=='pool'&&key!=='lamp'&&key!=='sod';
        target.add(mesh);
      }
      batch(near,geo,items);
      if(key!=='leaf')batch(far,distantShapes[key]||geo,items.filter(item=>{
        const m=item.matrix.elements;
        return Math.max(Math.hypot(m[0],m[1],m[2]),Math.hypot(m[4],m[5],m[6]),Math.hypot(m[8],m[9],m[10]))>2.1;
      }));
    }
    return {group,near,far,site,obstacles};
  }
  let elapsed=0;
  function update(lat,lon,dt) {
    elapsed+=Math.min(.1,Math.max(0,dt||0));const {x,z}=chart(lat,lon);
    for(let i=0;i<sites.length;i++) {
      const site=sites[i],dist=Math.hypot(x-site.x,z-site.z);
      if(!batches[i]&&dist<570)batches[i]=makeSite(site,i);
      const parts=batches[i];
      if(parts){parts.group.visible=dist<670;parts.near.visible=dist<116;parts.far.visible=!parts.near.visible;}
    }
    for(const pet of pipi) {
      if(!batches[0].near.visible)continue;
      const t=elapsed+pet.phase,w=t*.46;
      const dx=.45*Math.sin(w),dz=.25*Math.cos(w*1.36);
      const hop=Math.max(0,Math.sin(t*3.7))**3;
      pet.animal.position.set(pet.x+dx,pet.yAt(pet.x+dx,pet.z+dz)+.004+.065*hop,pet.z+dz);
      pet.animal.rotation.y=.27+Math.sin(w)*.53;
      pet.ears.forEach((ear,i)=>{ear.rotation.z=(i?1:-1)*(.065*Math.sin(t*2.1)+.1*hop);});
      pet.at=move(pet.site.lat,pet.site.lon,pet.x+dx,-pet.z-dz);
    }
  }
  function nearestPipi(lat,lon) {
    const observer=chart(lat,lon);let closest=null;
    for(const pet of pipi) {
      const p=chart(pet.at.lat,pet.at.lon),d=Math.hypot(observer.x-p.x,observer.z-p.z);
      if(!closest||d<closest.distance)closest={name:'皮皮',distance:d,lat:pet.at.lat,lon:pet.at.lon};
    }
    return closest;
  }
  function walk(lat,lon,east,north) {
    const start=chart(lat,lon),end=move(lat,lon,east,north),dest=chart(end.lat,end.lon);
    const candidates=batches.filter(part=>Math.hypot(start.x-part.site.x,start.z-part.site.z)<111)
      .flatMap(part=>part.obstacles).filter(o=>Math.hypot(start.x-o.x,start.z-o.z)<Math.hypot(east,north)+o.r+.55);
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
  return {update,nearestPipi,walk};
}
