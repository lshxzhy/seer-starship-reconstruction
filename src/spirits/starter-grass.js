// The three original grass starters, drawn from their numbered official pages
// and official heads: https://seer.61.com/main/spirit/{1,2,3}.html
// https://seerh5.61.com/resource/assets/pet/head/{1,2,3}.png
// Full original silhouettes: https://wiki.biligame.com/seer/精灵:{1,2,3}
// Bud: 8dywdcbslwzd5b6obwkhvxlvbhcz9j9.png; grass: qkcywr37in3x1n94a81xejqg6tfxd2b.png;
// flower: 827pbi407gol8hhu43dxm9zlk1vixyq.png on patchwiki.biligame.com/images/seer.
// +Z is the face. The common field factory owns catalogue/world scaling.
function createStarterGrassFigure(T,id){
  id=Number(id);if(![1,2,3].includes(id))return null;
  const root=new T.Group(),figure=new T.Group(),body=new T.Group(),crown=new T.Group();
  root.name=['布布种子','布布草','布布花'][id-1];root.add(figure);figure.add(body);body.add(crown);
  const geometry=new Set(),materials=new Map(),arms=[],feet=[],eyes=[];
  const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),tau=Math.PI*2;
  const sphere=new T.SphereGeometry(1,32,22);geometry.add(sphere);
  const colour=hex=>new T.Color(hex).convertSRGBToLinear();
  const pigment={green:0x397a20,dark:0x285b18,leaf:0xb3ce70,vein:0x718f35,
    cream:0xf4dfa6,pink:0xeb8fbc,rose:0xb84f81,gold:0xffc33c,shine:0xfffa9b};
  function paint(hex,vertex=false){
    const key=hex+':'+vertex;
    if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color:colour(hex),vertexColors:vertex,roughness:.61}));
    return materials.get(key);
  }
  function mesh(g,hex,parent=body,tissue=''){
    geometry.add(g);const m=new T.Mesh(g,paint(hex,!!g.attributes.color));
    if(tissue)finishSpiritPart(m,tissue,materials);
    m.castShadow=m.receiveShadow=true;parent.add(m);return m;
  }
  function oval(x,y,z,sx,sy,sz,hex,parent=body,tissue='',rz=0){
    const m=mesh(sphere,hex,parent,tissue);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.z=rz;return m;
  }
  function tube(points,r,hex,parent=body,tissue='',segments=32){
    const line=new T.CatmullRomCurve3(points.map(p=>Array.isArray(p)?v(...p):p),false,'centripetal');
    return mesh(new T.TubeGeometry(line,segments,r,8,false),hex,parent,tissue);
  }
  function pivot(group,at,list,sign=1){
    const origin=v(...at);for(const child of group.children)child.position.sub(origin);
    group.position.copy(origin);if(list)list.push({group,sign});return group;
  }
  function interpolate(values,t){
    const s=Math.min(values.length-1.000001,t*(values.length-1)),i=Math.floor(s);
    return T.MathUtils.lerp(values[i],values[i+1],s-i);
  }
  // A closed, swollen ribbon follows its own curling spine. Its cross-section
  // is an ellipse, not a single-sided plane; every visible petal has an edge
  // and a back. With the ascending spine, a,c,b points out of the oval tube.
  function ribbon(points,widths,thickness,base,tip=base,parent=body,{vein=false,segments=64,lobes=0}={}){
    const curve=new T.CatmullRomCurve3(points.map(p=>v(...p)),false,'centripetal');
    const positions=[],colors=[],indices=[],sides=16,low=colour(base),high=colour(tip),tint=new T.Color();
    const zAxis=v(0,0,1),centre=v(),right=v(),front=v(),tangent=v(),point=v();
    function section(t){
      curve.getPoint(t,centre);curve.getTangent(t,tangent).normalize();
      right.crossVectors(tangent,zAxis).normalize();front.crossVectors(right,tangent).normalize();
      const width=Math.max(.002,interpolate(widths,t))*(1+lobes*Math.sin(Math.PI*t)*Math.cos(tau*3.5*t));
      const depth=Math.max(.002,thickness*(.14+.86*Math.sin(Math.PI*t)**.6));
      return {width,depth};
    }
    for(let j=0;j<=segments;j++){
      const t=j/segments,{width,depth}=section(t);
      for(let k=0;k<sides;k++){
        const a=tau*k/sides;point.copy(centre).addScaledVector(right,width*Math.cos(a)).addScaledVector(front,depth*Math.sin(a));
        positions.push(point.x,point.y,point.z);
        tint.copy(low).lerp(high,T.MathUtils.smoothstep(t,.26,.82));
        tint.multiplyScalar(.94+.06*Math.max(0,Math.sin(a)));colors.push(tint.r,tint.g,tint.b);
        if(j<segments){const a0=j*sides+k,b0=j*sides+(k+1)%sides,c0=a0+sides,d0=b0+sides;
          indices.push(a0,c0,b0,b0,c0,d0);}
      }
    }
    // Explicit end caps prevent a curled tip showing an open tube in orbit view.
    for(const end of [0,1]){
      const p=curve.getPoint(end),index=positions.length/3;positions.push(p.x,p.y,p.z);
      tint.copy(end?high:low);colors.push(tint.r,tint.g,tint.b);
      const offset=end?segments*sides:0;
      for(let k=0;k<sides;k++){const a=offset+k,b=offset+(k+1)%sides;indices.push(index,...(end?[b,a]:[a,b]));}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
    const m=mesh(g,0xffffff,parent,'petal');
    if(vein){
      const line=[];
      for(let i=0;i<=36;i++){const t=.06+.88*i/36,{depth}=section(t);line.push(centre.clone().addScaledVector(front,depth+.003));}
      tube(line,.0065,base===pigment.green?0x83a648:pigment.vein,parent,'',40);
    }
    return {mesh:m,curve};
  }
  function curledPetal(points,widths,base,tip,parent=crown,depth=.065){
    const result=ribbon(points,widths,depth,base,tip,parent);
    // A low relief seam follows the inward turn rather than painting a spiral
    // across a sphere. It is visible on the original rolled petal tips.
    const seam=[];
    for(let i=0;i<=25;i++){
      const t=.72+.26*i/25,p=result.curve.getPoint(t),tangent=result.curve.getTangent(t).normalize();
      const right=tangent.clone().cross(v(0,0,1)).normalize(),front=right.clone().cross(tangent).normalize();
      seam.push(p.addScaledVector(front,Math.max(.002,depth*(.14+.86*Math.sin(Math.PI*t)**.6))+.003));
    }
    tube(seam,.0075,tip===pigment.leaf?pigment.vein:pigment.rose,parent,'',28);
    return result.mesh;
  }
  function torso(profile){
    const n=64,rows=profile.length,positions=[],indices=[];
    for(let j=0;j<rows;j++){
      const [y,rx,rz,cz]=profile[j];
      for(let i=0;i<n;i++){
        const a=tau*i/n;
        positions.push(rx*Math.cos(a),y,cz+rz*Math.sin(a));
        if(j<rows-1){const p=j*n+i,q=j*n+(i+1)%n;indices.push(p,p+n,q,q,p+n,q+n);}
      }
    }
    for(const end of [0,1]){
      const row=profile[end?rows-1:0],centre=positions.length/3,offset=end?(rows-1)*n:0;
      positions.push(0,row[0],row[3]);
      for(let i=0;i<n;i++){const a=offset+i,b=offset+(i+1)%n;indices.push(centre,...(end?[b,a]:[a,b]));}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
    mesh(g,pigment.green,body,'cuticle');
    function surface(x,y){
      let i=profile.findIndex(row=>row[0]>=y);i=Math.max(1,i<0?rows-1:i);
      const a=profile[i-1],b=profile[i],t=T.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1);
      const rx=T.MathUtils.lerp(a[1],b[1],t),rz=T.MathUtils.lerp(a[2],b[2],t),cz=T.MathUtils.lerp(a[3],b[3],t);
      return cz+rz*Math.sqrt(Math.max(.01,1-(x/rx)**2));
    }
    return surface;
  }
  function facePatch(outline,surface){
    const shape=new T.Shape();shape.moveTo(...outline[0]);
    for(const point of outline.slice(1)){
      if(point.length===6)shape.bezierCurveTo(...point);else shape.lineTo(...point);
    }
    shape.closePath();const flat=new T.ShapeGeometry(shape,36),p=flat.attributes.position;
    const positions=[],normals=[],order=flat.index?.array||Array.from({length:p.count},(_,i)=>i);
    function add(a,b,c,depth){
      if(depth){
        const ab=a.clone().lerp(b,.5),bc=b.clone().lerp(c,.5),ca=c.clone().lerp(a,.5);
        add(a,ab,ca,depth-1);add(ab,b,bc,depth-1);add(ca,bc,c,depth-1);add(ab,bc,ca,depth-1);return;
      }
      for(const q of [a,b,c]){
        positions.push(q.x,q.y,surface(q.x,q.y)+.007);
        const step=.0005,dx=(surface(q.x+step,q.y)-surface(q.x-step,q.y))/(2*step);
        const dy=(surface(q.x,q.y+step)-surface(q.x,q.y-step))/(2*step),normal=v(-dx,-dy,1).normalize();
        normals.push(normal.x,normal.y,normal.z);
      }
    }
    for(let i=0;i<order.length;i+=3)add(v().fromBufferAttribute(p,order[i]),v().fromBufferAttribute(p,order[i+1]),v().fromBufferAttribute(p,order[i+2]),3);
    flat.dispose();const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));mesh(g,pigment.cream,body,'cuticle');
  }
  function gaze(surface,y,spacing,sx,sy,brown=false){
    for(const sign of [-1,1]){
      const x=sign*spacing,z=surface(x,y),eye=new T.Group();eye.position.set(x,y,z+.014);body.add(eye);eyes.push(eye);
      oval(0,0,0,sx,sy,.018,brown?0x512508:0x0c1207,eye,'iris',-sign*.07);
      if(brown)oval(0,-sy*.36,.016,sx*.75,sy*.42,.008,0x8e4824,eye,'iris');
      oval(-sx*.19,sy*.30,.020,sx*.31,sy*.36,.009,0xfffdf0,eye);
      if(brown)oval(sx*.34,-sy*.36,.021,sx*.15,sy*.15,.008,0xfff9d8,eye);
    }
  }
  function stamen(a,b,r=.023,parent=crown){
    const start=v(...a),end=v(...b),middle=start.clone().lerp(end,.5);middle.x-=.025;
    tube([start,middle,end],r,pigment.gold,parent,'horn',28);
    oval(...b,r*2.8,r*3.0,r*2.7,pigment.gold,parent,'horn');
    oval(b[0]-.014,b[1]+.019,b[2]+r*2.4,r*1.38,r*1.50,r*.50,pigment.shine,parent);
  }
  function flowerPalm(parent,x,y,z,sign){
    const shape=new T.Shape(),n=100;
    for(let i=0;i<=n;i++){
      const a=tau*i/n,r=.23*(1+.19*Math.cos(a*5+.3)+.065*Math.cos(a*15));
      const px=x+r*Math.cos(a),py=y+r*Math.sin(a)*1.14;
      if(!i)shape.moveTo(px,py);else shape.lineTo(px,py);
    }
    const g=new T.ExtrudeGeometry(shape,{depth:.035,steps:1,bevelEnabled:true,bevelSegments:3,bevelSize:.013,bevelThickness:.012,curveSegments:18});
    g.translate(0,0,z);const p=g.attributes.position;
    for(let i=0;i<p.count;i++){
      const dx=(p.getX(i)-x)/.28,dy=(p.getY(i)-y)/.31;
      p.setZ(i,p.getZ(i)+.032*Math.max(0,1-dx*dx-dy*dy));
    }
    g.computeVertexNormals();mesh(g,pigment.pink,parent,'petal');
    for(let j=0;j<5;j++){
      const a=j*tau/5+.3;
      tube([[x,y,z+.072],[x+Math.cos(a)*.10,y+Math.sin(a)*.12,z+.074],
        [x+Math.cos(a)*.20,y+Math.sin(a)*.24,z+.05]],.008,pigment.rose,parent);
    }
    for(const [dx,dy,r] of [[-.025,.045,.066],[.027,0,.073],[-.022,-.052,.061]]){
      oval(x+dx,y+dy,z+.086,r*1.16,r*1.18,.033,0xcc912a,parent);
      oval(x+dx,y+dy,z+.104,r,r,.026,0xffdc4b,parent,'petal');
    }
    pivot(parent,[sign*.24,y+.06,0],arms,sign);
  }
  function seed(){
    const surface=torso([[.32,.004,.004,0],[.39,.17,.14,-.01],[.52,.27,.22,0],[.70,.30,.24,0],
      [.90,.28,.23,.01],[1.08,.22,.18,.02],[1.17,.004,.004,.01]]);
    facePatch([[0,1.10],[-.12,1.10,-.21,.98,-.19,.83],[-.18,.68,-.08,.65,0,.67],
      [.13,.64,.20,.72,.19,.87],[.20,1.01,.12,1.10,0,1.10]],surface);
    gaze(surface,.86,.092,.036,.092);
    for(const sign of [-1,1]){
      const foot=new T.Group();body.add(foot);
      ribbon([[sign*.13,.42,.015],[sign*.14,.26,.05],[sign*.18,.07,.10],[sign*.20,.022,.10]],
        [.044,.076,.046,.002],.035,pigment.leaf,0xc6de8b,foot,{vein:true});
      pivot(foot,[sign*.13,.40,.015],feet,sign);
      const arm=new T.Group();body.add(arm);
      const start=v(sign*.25,.78,.015),end=v(sign*.60,.84,.075),axis=end.clone().sub(start).normalize();
      const horizontal=v(0,0,1),vertical=axis.clone().cross(horizontal).normalize();
      ribbon([start.toArray(),start.clone().lerp(end,.46).toArray(),end.toArray()],
        [.064,.11,.084],.085,0xda7ba5,0xf4b1cd,arm);
      const winding=[];
      for(let i=0;i<=70;i++){
        const t=i/70,a=t*tau*2.25,r=.082+.020*Math.sin(Math.PI*t);
        winding.push(start.clone().lerp(end,t).addScaledVector(horizontal,r*Math.cos(a)).addScaledVector(vertical,r*Math.sin(a)));
      }
      tube(winding,.008,pigment.rose,arm,'',72);
      const scroll=[];
      for(let i=0;i<=48;i++){
        const t=i/48,a=t*tau*1.65,r=.076*(1-.94*t);
        scroll.push(end.clone().addScaledVector(axis,.014).addScaledVector(horizontal,r*Math.cos(a)).addScaledVector(vertical,r*Math.sin(a)));
      }
      tube(scroll,.007,0x9f436d,arm,'',50);pivot(arm,start.toArray(),arms,sign);
    }
    // The earlier seed's asymmetrical leaf brim, striped cuffs and pointed
    // leaf feet survive. The swollen bud has its own closed lobed surface.
    const budGeo=sphere.clone(),p=budGeo.attributes.position,rgb=[],green=colour(0xb6cd54),pink=colour(0xf0a4c6),c=new T.Color();
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(x,z);
      const lobe=1+.045*(1-y*y)*Math.cos(3*a-.25)+.018*Math.cos(5*a)*(1-y*y);
      p.setXYZ(i,x*lobe,y-.07*x,z*lobe);
      c.copy(green).lerp(pink,T.MathUtils.smoothstep(y+.20*x,-.06,.86));rgb.push(c.r,c.g,c.b);
    }
    budGeo.setAttribute('color',new T.Float32BufferAttribute(rgb,3));budGeo.computeVertexNormals();
    const bud=mesh(budGeo,0xffffff,crown,'petal');bud.position.set(.02,1.49,-.05);bud.scale.set(.49,.37,.36);bud.rotation.z=-.12;
    for(const a of [-1.75,-.43,.90,2.31]){
      const seam=[];
      for(let i=0;i<=25;i++){
        const polar=.28+1.18*i/25;seam.push(v(Math.sin(polar)*Math.sin(a)*1.018,Math.cos(polar)*1.012,
          Math.sin(polar)*Math.cos(a)*1.018));
      }
      tube(seam,.009,0x98af44,bud,'',28);
    }
    ribbon([[-.48,1.12,.10],[-.43,1.28,.20],[-.25,1.30,.32],[-.04,1.20,.35],
      [.19,1.10,.29],[.39,1.04,.13],[.43,.94,.045],[.38,.94,.06]],
      [.025,.10,.13,.125,.105,.055,.034,.002],.046,pigment.leaf,0xc1d786,crown,{vein:true});
    for(const [dx,dy,turn] of [[-.02,.02,-.44],[.045,0,.43],[.09,-.035,1.02]]){
      const sprig=new T.Group();crown.add(sprig);
      ribbon([[.18+dx,1.81+dy,-.03],[.18+dx,1.94+dy,-.035],[.21+dx,1.98+dy,-.03]],
        [.027,.064,.002],.025,pigment.pink,0xf7b7d4,sprig);
      pivot(sprig,[.18+dx,1.81+dy,-.03]);sprig.rotation.z=turn;
    }
  }
  function grass(){
    const surface=torso([[.25,.004,.004,0],[.34,.17,.14,0],[.52,.26,.20,0],[.76,.255,.205,.005],
      [.98,.225,.18,.015],[1.16,.14,.12,.015],[1.22,.004,.004,0]]);
    facePatch([[0,1.11],[-.12,1.09,-.19,.98,-.18,.85],[-.17,.72,-.06,.69,.01,.70],
      [.12,.69,.18,.76,.18,.89],[.18,1.03,.10,1.11,0,1.11]],surface);
    gaze(surface,.87,.086,.031,.079);
    for(const sign of [-1,1]){
      const foot=new T.Group();body.add(foot);
      ribbon([[sign*.11,.33,0],[sign*.18,.22,.09],[sign*.30,.09,.16],[sign*.36,.04,.14]],
        [.04,.15,.135,.002],.038,pigment.leaf,0xc6dc88,foot,{vein:true});
      pivot(foot,[sign*.11,.33,0],feet,sign);
      const arm=new T.Group();body.add(arm);
      tube([[sign*.19,.81,0],[sign*.33,.75,.015],[sign*.43,.76,.02]],.052,pigment.green,arm,'cuticle');
      flowerPalm(arm,sign*.47,.76,.055,sign);
    }
    // The intermediate is a crowded cup of curled, still-green petals;
    // its three golden stamens are not the final form's opened fan.
    curledPetal([[-.06,1.14,-.21],[-.14,1.56,-.28],[-.28,1.96,-.22],[-.13,2.13,-.15],
      [.09,2.09,-.11],[.14,1.96,-.08],[.06,1.94,-.04]],
      [.045,.21,.24,.19,.13,.070,.002],0x80aa20,pigment.pink);
    curledPetal([[.02,1.15,.02],[-.20,1.35,.07],[-.38,1.66,.06],[-.43,1.91,.02],
      [-.28,2.03,.04],[-.10,1.94,.09],[-.16,1.84,.12]],
      [.055,.27,.30,.24,.16,.075,.002],0x82af23,0xf1a3c6,crown,.072);
    curledPetal([[.06,1.15,-.08],[.29,1.36,-.04],[.49,1.62,.02],[.53,1.83,.01],
      [.39,1.95,.03],[.27,1.88,.08],[.32,1.79,.11]],
      [.045,.25,.25,.19,.13,.065,.002],0x79a71f,pigment.pink);
    curledPetal([[.0,1.40,.24],[.17,1.55,.30],[.15,1.78,.29],[-.03,1.82,.28],
      [-.11,1.72,.30],[-.035,1.65,.34],[.025,1.71,.35]],
      [.065,.16,.17,.12,.073,.042,.002],0x87aa28,pigment.leaf,crown,.055);
    for(const [x,y,z,w] of [[-.18,1.16,.18,.090],[0,1.16,.28,.115],[.16,1.13,.22,.09]]){
      ribbon([[x-.075, y+.045,z-.03],[x,y+.02,z+.035],[x+.10,y-.08,z+.055]],
        [.025,w,.002],.028,0xc4dc92,0xa5c66a,crown,{vein:true,segments:36});
    }
    stamen([-.04,1.75,.16],[-.10,2.28,.15]);
    stamen([.03,1.77,.14],[.19,2.40,.12],.025);
    stamen([.10,1.76,.16],[.40,2.20,.14],.021);
  }
  function flower(){
    const surface=torso([[.19,.004,.004,-.04],[.29,.16,.13,-.03],[.50,.23,.17,-.02],[.76,.24,.18,0],
      [1.00,.265,.19,.01],[1.20,.29,.205,.01],[1.40,.26,.19,0],[1.54,.12,.09,-.02],[1.58,.004,.004,-.02]]);
    // One continuous face-to-belly panel is characteristic of #003.
    facePatch([[0,1.39],[-.16,1.36,-.245,1.19,-.23,1.06],[-.22,.94,-.15,.91,-.13,.87],
      [-.11,.68,-.115,.52,-.05,.34],[0,.39],[.075,.32],[.15,.46,.15,.68,.13,.86],
      [.16,.94,.24,1.01,.235,1.14],[.22,1.30,.12,1.39,0,1.39]],surface);
    // Keep the eyes on the face, below the curled leaf edge in the slightly
    // elevated catalogue view; the original eye size and surface offset stay.
    gaze(surface,.99,.102,.045,.064,true);
    for(const sign of [-1,1]){
      const foot=new T.Group();body.add(foot);
      curledPetal([[sign*.11,.35,.015],[sign*.19,.20,.07],[sign*.28,.11,.14],[sign*.37,.12,.16],
        [sign*.40,.20,.15],[sign*.33,.23,.17],[sign*.30,.18,.19]],
        [.065,.085,.11,.08,.044,.025,.002],pigment.green,0x6ba33c,foot,.04);
      pivot(foot,[sign*.11,.35,.015],feet,sign);
      const arm=new T.Group();body.add(arm);
      // Three tapered leaves form the split, feathered hand/skirt silhouette.
      ribbon([[sign*.24,1.03,-.005],[sign*.34,.80,.025],[sign*.43,.49,.075],[sign*.55,.31,.11]],
        [.066,.135,.13,.002],.042,pigment.green,0x568f28,arm,{vein:true,lobes:.11});
      ribbon([[sign*.29,.83,-.025],[sign*.40,.53,.025],[sign*.47,.24,.08],[sign*.54,.20,.10]],
        [.052,.12,.105,.002],.034,0x34751a,0x679c35,arm,{vein:true});
      ribbon([[sign*.22,.64,-.06],[sign*.30,.39,-.02],[sign*.32,.18,.07],[sign*.40,.15,.09]],
        [.045,.11,.082,.002],.034,0x326e17,0x548c29,arm,{vein:true});
      pivot(arm,[sign*.23,1.02,0],arms,sign);
    }
    // An opened asymmetric crown: tall left petal, broad right petal, lower
    // trailing lobes and a smaller central roll, all with distinct silhouettes.
    curledPetal([[-.08,1.45,-.18],[-.34,1.93,-.22],[-.56,2.40,-.18],[-.60,2.69,-.14],
      [-.39,2.84,-.09],[-.20,2.69,-.055],[-.27,2.59,-.02]],
      [.065,.25,.32,.29,.18,.095,.002],0xd16a9b,0xed9cc6,crown,.073);
    curledPetal([[.04,1.49,-.25],[.39,1.74,-.19],[.74,1.96,-.13],[.88,2.18,-.08],
      [.72,2.34,-.06],[.55,2.24,-.02],[.62,2.12,.025]],
      [.065,.28,.32,.26,.16,.073,.002],0xd274a1,0xf0a0c8,crown,.075);
    curledPetal([[.04,1.43,-.28],[.32,1.31,-.23],[.58,1.12,-.17],[.65,.90,-.12],
      [.50,.80,-.08],[.40,.91,-.025],[.46,.99,.005]],
      [.065,.21,.23,.18,.12,.06,.002],0xd779a7,0xf0a1c9,crown,.057);
    curledPetal([[-.03,1.44,-.30],[-.32,1.40,-.25],[-.59,1.51,-.18],[-.65,1.71,-.12],
      [-.52,1.79,-.07],[-.43,1.70,-.02],[-.49,1.65,.01]],
      [.05,.18,.17,.14,.09,.044,.002],0xd980ad,0xf3accf,crown,.052);
    curledPetal([[.03,1.67,-.31],[.18,2.01,-.28],[.22,2.31,-.22],[.09,2.46,-.17],
      [-.06,2.41,-.12],[-.09,2.30,-.07],[-.01,2.28,-.03]],
      [.04,.16,.18,.13,.083,.042,.002],0xcf6c9b,0xf4acd0,crown,.053);
    stamen([.02,2.02,-.28],[.10,2.99,-.18],.027);
    stamen([.12,1.99,-.26],[.70,2.73,-.16],.027);
    stamen([.19,1.88,-.25],[1.00,2.23,-.13],.023);
    // Pale curled forelocks replace the old paired round leaf cushions.
    const forelocks=new T.Group();crown.add(forelocks);forelocks.position.y=.06;
    curledPetal([[-.02,1.57,.12],[-.14,1.49,.23],[-.24,1.30,.30],[-.35,1.23,.32],
      [-.43,1.30,.30],[-.39,1.40,.32],[-.32,1.38,.35]],
      [.06,.18,.20,.14,.08,.043,.002],0x8fac43,pigment.leaf,forelocks,.061);
    curledPetal([[.09,1.57,.14],[.25,1.46,.25],[.28,1.25,.31],[.19,1.15,.34],
      [.08,1.20,.36],[.11,1.30,.38],[.18,1.27,.39]],
      [.055,.18,.19,.13,.075,.042,.002],0x91af48,pigment.leaf,forelocks,.059);
    curledPetal([[.28,1.39,.01],[.40,1.25,.09],[.45,1.06,.16],[.38,.96,.20],
      [.28,1.00,.23],[.30,1.09,.25],[.37,1.07,.27]],
      [.045,.14,.14,.10,.06,.032,.002],0x91ae48,pigment.leaf,forelocks,.046);
  }
  if(id===1)seed();else if(id===2)grass();else flower();
  pivot(crown,[0,id===1?1.20:id===2?1.16:1.48,-.02]);
  root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root);figure.position.y-=bounds.min.y;
  let clock=0;
  return {root,update(dt,effort=0){
    clock+=Math.min(.2,Math.max(0,dt));const active=T.MathUtils.clamp(effort,0,1),stride=clock*(id===3?6.0:8.0);
    body.rotation.z=.014*Math.sin(clock*1.7)+active*.025*Math.sin(stride);
    crown.rotation.z=.016*Math.sin(clock*1.45+.6)+active*.028*Math.sin(stride-.5);
    crown.rotation.x=.012*Math.sin(clock*1.16);
    for(const {group,sign} of arms)group.rotation.z=sign*(.018*Math.sin(clock*2.1)+active*.10*Math.sin(stride+sign*.5));
    for(const {group,sign} of feet)group.rotation.x=active*.15*Math.sin(stride+sign*Math.PI*.5);
    const blink=.10+.90*Math.min(1,Math.abs(clock%5.3-4.7)/.085);
    for(const eye of eyes)eye.scale.y=blink;
  },dispose(){for(const g of geometry)g.dispose();for(const m of new Set(materials.values()))m.dispose();}};
}
