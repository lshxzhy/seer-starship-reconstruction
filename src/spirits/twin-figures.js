// #089 迪达 / #090 迪尔克. Original Taomee battle vectors were viewed directly:
// https://seer.61.com/resource/fightResource/pet/swf/89.swf (sprites 17 / 70)
// https://seer.61.com/resource/fightResource/pet/swf/90.swf (sprites 23 / 62)
// The low brow, inset almond eyes, flared/curling trunk, flame carapace and four
// separate feet follow those frames. Unseen joint depth is a 3D reconstruction.
function createDidaFamilyFigure(T,id){
  const adult=id===90,root=new T.Group(),body=new T.Group();root.add(body);
  root.name=adult?'迪尔克':'迪达';
  const sphere=new T.SphereGeometry(1,40,28),geometries=new Set([sphere]),materials=new Map();
  const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),tau=Math.PI*2;
  const pink=0xf495a3,rose=0xc75c6c,white=0xfff6ed,orange=0xff9f21,gold=0xffc448,cream=0xffe9a1;
  function mesh(g,c,parent=body,tissue='cuticle'){
    geometries.add(g);const key=String(c);
    if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({
      color:new T.Color(c).convertSRGBToLinear(),roughness:.52}));
    const m=new T.Mesh(g,materials.get(key));m.castShadow=m.receiveShadow=true;parent.add(m);
    return tissue?finishSpiritPart(m,tissue,materials):m;
  }
  function oval(c,p,r,parent=body,tissue='cuticle'){
    const m=mesh(sphere,c,parent,tissue);m.position.set(...p);m.scale.set(...r);return m;
  }
  function geometry(p,indices){
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));
    g.setIndex(indices);g.computeVertexNormals();return g;
  }
  function stroke(c,points,r,parent=body){
    return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),Math.max(24,points.length*3),r,8,false),c,parent);
  }
  function sweep(c,points,widths,depths,parent=body,tissue='cuticle'){
    const curve=new T.CatmullRomCurve3(points.map(p=>v(...p))),rows=48,sides=28,p=[],indices=[];
    // This family is symmetrical across X. Keeping the section's width on X
    // makes broad blade-like armour instead of round banana-shaped horns.
    for(let j=0;j<=rows;j++){
      const t=j/rows,q=t*(widths.length-1),k=Math.min(widths.length-2,Math.floor(q));
      const w=T.MathUtils.lerp(widths[k],widths[k+1],q-k),d=T.MathUtils.lerp(depths[k],depths[k+1],q-k);
      const at=curve.getPointAt(t),tangent=curve.getTangentAt(t).normalize();
      let n=v(1,0,0).addScaledVector(tangent,-tangent.x).normalize();
      if(n.lengthSq()<.1)n=v(0,0,1);
      const b=tangent.clone().cross(n).normalize();
      for(let i=0;i<sides;i++){
        const a=i*tau/sides,point=at.clone().addScaledVector(n,Math.cos(a)*w).addScaledVector(b,Math.sin(a)*d);
        p.push(point.x,point.y,point.z);
        if(j<rows){const index=j*sides+i,next=j*sides+(i+1)%sides;
          indices.push(index,next,index+sides,next,next+sides,index+sides);}
      }
    }
    return mesh(geometry(p,indices),c,parent,tissue);
  }
  const hipY=adult?.82:.59,hipX=adult?.285:.27,frontZ=adult?.34:.30,rearZ=adult?-.40:-.35;
  const torsoY=adult?.78:.56,torsoR=adult?[.395,.29,.60]:[.35,.245,.52];
  oval(adult?white:pink,[0,torsoY,-.075],torsoR);
  // Measure the skin over the forelegs, excluding the helmet and flame tips.
  const shoulderHeight=torsoY+torsoR[1]*Math.sqrt(1-((frontZ+.075)/torsoR[2])**2);
  const head=new T.Group();head.position.set(0,adult?.86:.66,adult?.40:.35);body.add(head);
  const headR=adult?[.285,.24,.33]:[.29,.215,.32];
  oval(adult?white:pink,[0,0,0],headR,head);
  function facePoint(a,b,lift=0){
    const [x,y,z]=headR,p=v(x*Math.cos(b)*Math.sin(a),y*Math.sin(b),z*Math.cos(b)*Math.cos(a));
    const n=v(p.x/(x*x),p.y/(y*y),p.z/(z*z)).normalize();return p.addScaledVector(n,lift);
  }
  function facePatch(side,colour,a,b,wa,hb,lift,almond=false){
    const p=[],indices=[],rows=24,cols=36;
    for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
      const u=-1+2*i/cols,t=-1+2*j/rows;
      const height=almond?Math.sin((u+1)*Math.PI/2)**.86:Math.sqrt(Math.max(0,1-u*u));
      const point=facePoint(side*(a+wa*u*(adult?.72:1)),b+hb*t*height*(adult?.80:1)+(almond?.10*u:0),lift);
      p.push(point.x,point.y,point.z);
      if(j<rows&&i<cols){const n=j*(cols+1)+i;
        if(side>0)indices.push(n,n+1,n+cols+1,n+1,n+cols+2,n+cols+1);
        else indices.push(n,n+cols+1,n+1,n+1,n+cols+1,n+cols+2);}
    }
    return mesh(geometry(p,indices),colour,head,colour===0xae1421?'iris':null);
  }
  for(const s of [-1,1]){
    // Every layer lies on the same ellipsoidal skin. There are no eyeball spheres
    // and no tall stacks of sclera/iris/pupil protruding through the brow.
    facePatch(s,adult?0xcab1b7:rose,.96,.025,.43,.34,.0015,true);
    facePatch(s,adult?white:0xffdcdf,.96,.032,.385,.285,.0022,true);
    facePatch(s,0x341d22,.96,.022,.205,.245,.0029);
    facePatch(s,0xae1421,.96,-.035,.171,.185,.0036);
    facePatch(s,0x211319,.94,.060,.139,.167,.0043);
    facePatch(s,0xfffcf3,.89,.147,.062,.084,.0050);
  }
  const nosePoints=adult?[[0,-.015,.22],[0,-.13,.33],[0,-.39,.40],[0,-.49,.42],[0,-.44,.31],[0,-.35,.30]]:
    [[0,-.025,.22],[0,-.12,.38],[0,-.16,.53],[0,-.125,.67]];
  sweep(adult?white:pink,nosePoints,adult?[.115,.084,.056,.047,.038,.008]:[.115,.087,.063,.087],
    adult?[.088,.075,.052,.042,.032,.006]:[.095,.071,.056,.080],head);
  if(!adult){
    const lip=new T.Group();lip.position.set(0,-.125,.67);lip.rotation.x=-.23;head.add(lip);
    const rim=mesh(new T.TorusGeometry(.073,.019,16,48),0xf8b1b9,lip);rim.scale.y=.90;
    const inner=mesh(new T.CylinderGeometry(.054,.067,.035,40,1,true),0xbc5361,lip,null);
    inner.rotation.x=Math.PI/2;inner.position.z=-.014;inner.scale.z=.90;inner.material.side=T.BackSide;
    const hole=mesh(new T.CircleGeometry(.055,40),0x8a3342,lip,null);hole.position.z=-.033;hole.scale.y=.90;
  }
  const shellY=adult?.98:.79,shellW=adult?.43:.40,shellL=adult?.68:.61,shellH=adult?.30:.36;
  function shellPoint(a,t,lift=0){
    const r=Math.sin(t),front=Math.max(0,Math.cos(a));
    return v((shellW+lift)*r*Math.sin(a),shellY+(shellH+lift)*Math.cos(t)-.105*r*r*front*front,
      -.06+(shellL+lift)*r*Math.cos(a));
  }
  {
    const p=[],indices=[],rows=36,sides=96;
    for(let j=0;j<=rows;j++)for(let k=0;k<sides;k++){
      const point=shellPoint(k*tau/sides,.001+(Math.PI/2-.001)*j/rows);p.push(point.x,point.y,point.z);
      if(j<rows){const n=j*sides+k,next=j*sides+(k+1)%sides;
        indices.push(n,n+sides,next,next,n+sides,next+sides);}
    }
    mesh(geometry(p,indices),orange,body,'horn');
    const rim=[];for(let k=0;k<=96;k++)rim.push(shellPoint(k*tau/96,Math.PI/2,.002));
    stroke(cream,rim,adult?.035:.030);
  }
  if(!adult){
    // A broad rolled helmet border follows the dome instead of a thin hoop.
    const p=[],indices=[],rows=12,cols=80;
    for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
      const a=-2.5+5*i/cols,width=.34*Math.sin(Math.PI*i/cols)**.45;
      const point=shellPoint(a,Math.PI/2-width*(1-j/rows),.005);p.push(point.x,point.y,point.z);
      if(j<rows&&i<cols){const n=j*(cols+1)+i;indices.push(n,n+cols+1,n+1,n+1,n+cols+1,n+cols+2);}
    }
    mesh(geometry(p,indices),cream,body,'horn');
  }
  // Vent marks are shallow dark apertures on the shell, not attached balls.
  for(const side of [-1,1])for(let j=0;j<3;j++){
    const a=side*(.69+j*.29),t=.75+j*.035,p=shellPoint(a,t,.004);
    const n=v(Math.sin(a)*Math.sin(t)/shellW,Math.cos(t)/shellH,Math.cos(a)*Math.sin(t)/shellL).normalize();
    const vent=mesh(new T.CircleGeometry(1,28),0x723226,body,null);vent.position.copy(p);
    vent.quaternion.setFromUnitVectors(v(0,0,1),n);vent.scale.set(.026,.041,1);
  }
  if(adult){
    // The front armour is a cupped leaf shield: connected thick edges, a broad
    // recessed face and a curled U-shaped lower lip, not a round tapered horn.
    const spine=new T.CatmullRomCurve3([[0,1.02,.68],[0,1.17,.78],[0,1.47,.51],[0,1.76,.17],[0,1.94,-.09]].map(p=>v(...p)));
    const widths=[.21,.385,.32,.19,.002],rows=56,cols=40,p=[],indices=[];
    function shieldPoint(t,u,back=false,lift=0){
      const at=spine.getPointAt(t),tangent=spine.getTangentAt(t).normalize();
      const outward=v(1,0,0).cross(tangent).normalize(),q=t*(widths.length-1),k=Math.min(widths.length-2,Math.floor(q));
      const width=T.MathUtils.lerp(widths[k],widths[k+1],q-k);
      const depth=back?-.045:.025+.10*u*u-.055*(1-u*u)*Math.sin(Math.PI*t);
      return at.add(v(width*u,0,0)).addScaledVector(outward,depth+lift)
        .addScaledVector(tangent,.12*u*u*(1-t)**3);
    }
    const layerSize=(rows+1)*(cols+1);
    for(const back of [false,true])for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
      const at=shieldPoint(j/rows,-1+2*i/cols,back);p.push(at.x,at.y,at.z);
      if(j<rows&&i<cols){const n=(back?layerSize:0)+j*(cols+1)+i;
        if(back)indices.push(n,n+cols+1,n+1,n+1,n+cols+1,n+cols+2);
        else indices.push(n,n+1,n+cols+1,n+1,n+cols+2,n+cols+1);}
    }
    const edge=[];
    for(let i=0;i<=cols;i++)edge.push(i);
    for(let j=1;j<=rows;j++)edge.push(j*(cols+1)+cols);
    for(let i=cols-1;i>=0;i--)edge.push(rows*(cols+1)+i);
    for(let j=rows-1;j>0;j--)edge.push(j*(cols+1));
    for(let i=0;i<edge.length;i++){
      const a=edge[i],b=edge[(i+1)%edge.length];indices.push(a,a+layerSize,b,b,a+layerSize,b+layerSize);
    }
    mesh(geometry(p,indices),orange,body,'horn');
    const border=edge.map(i=>v(p[i*3],p[i*3+1],p[i*3+2]));border.push(border[0].clone());
    stroke(gold,border,.026);
    const inset=[],insetIndices=[];
    for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
      const t=.16+.78*j/rows,u=(-1+2*i/cols)*.62*Math.sin(Math.PI*j/rows)**.55;
      const at=shieldPoint(t,u,false,.003);inset.push(at.x,at.y,at.z);
      if(j<rows&&i<cols){const n=j*(cols+1)+i;insetIndices.push(n,n+1,n+cols+1,n+1,n+cols+2,n+cols+1);}
    }
    mesh(geometry(inset,insetIndices),cream,body,'horn');
    for(const s of [-1,1]){
      sweep(orange,[[s*.24,1.04,.58],[s*.34,1.15,.76],[s*.34,1.36,.66],[s*.28,1.46,.53]],
        [.083,.087,.052,.003],[.065,.068,.040,.002],body,'horn');
      sweep(orange,[[s*.23,1.13,-.15],[s*.27,1.38,-.25],[s*.24,1.70,-.26]],
        [.107,.065,.003],[.083,.055,.002],body,'horn');
      sweep(orange,[[s*.28,1.02,-.44],[s*.31,1.18,-.55],[s*.27,1.43,-.55]],
        [.070,.050,.002],[.058,.044,.002],body,'horn');
      const p=[],indices=[],rows=24,cols=48,hem=[],layerSize=(rows+1)*(cols+1);
      for(const inner of [false,true])for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
        const u=i/cols,t=j/rows,z=-.65+1.16*u;
        const bottom=.73-.42*Math.exp(-(((u-.17)/.18)**2))-.41*Math.exp(-(((u-.79)/.18)**2));
        const x=s*(.33+.080*Math.sin(Math.PI*t)+.034*Math.sin(Math.PI*u)-(inner?.038:0));
        const y=T.MathUtils.lerp(.965-.055*Math.cos(tau*u),bottom,t);
        p.push(x,y,z);
        if(!inner&&j===rows)hem.push(v(x,y,z));
        if(j<rows&&i<cols){const n=(inner?layerSize:0)+j*(cols+1)+i;
          if((s>0)!==inner)indices.push(n,n+1,n+cols+1,n+1,n+cols+2,n+cols+1);
          else indices.push(n,n+cols+1,n+1,n+1,n+cols+1,n+cols+2);}
      }
      const edge=[];
      for(let i=0;i<=cols;i++)edge.push(i);
      for(let j=1;j<=rows;j++)edge.push(j*(cols+1)+cols);
      for(let i=cols-1;i>=0;i--)edge.push(rows*(cols+1)+i);
      for(let j=rows-1;j>0;j--)edge.push(j*(cols+1));
      for(let i=0;i<edge.length;i++){
        const a=edge[i],b=edge[(i+1)%edge.length];
        if(s>0)indices.push(a,a+layerSize,b,b,a+layerSize,b+layerSize);
        else indices.push(a,b,a+layerSize,b,b+layerSize,a+layerSize);
      }
      mesh(geometry(p,indices),pink);stroke(0xf8b5c1,hem,.024);
    }
  }else{
    const seam=[];for(let k=0;k<=40;k++){
      const a=k/40*Math.PI,t=Math.abs(Math.PI/2-a);seam.push(shellPoint(a<Math.PI/2?0:Math.PI,t,.004));
    }
    stroke(0xe37e18,seam,.008);
  }
  const legs=[];
  for(const s of [-1,1])for(const front of [true,false]){
    const hip=v(s*hipX,hipY,front?frontZ:rearZ),foot=new T.Group();root.add(foot);
    const legColour=adult?white:pink,upper=oval(legColour,[0,0,0],[1,1,1],root),lower=oval(legColour,[0,0,0],[1,1,1],root);
    oval(legColour,[hip.x,hip.y-.025,hip.z],[adult?.12:.145,adult?.15:.175,adult?.14:.15]);
    oval(legColour,[0,.065,.012],[adult?.135:.13,.065,adult?.145:.14],foot);
    for(const dx of [-.049,.049])stroke(adult?0xcbb2b8:rose,[v(dx,.045,.132),v(dx,.016,.139)],.005,foot);
    const phase=s<0?(front?0:.75):(front?.5:.25);
    legs.push({s,front,hip,foot,upper,lower,contact:v(hip.x,0,hip.z),swing:null,nextLift:.69-phase});
  }
  function bone(part,a,b,r){
    const d=b.clone().sub(a);part.position.copy(a).lerp(b,.5);part.quaternion.setFromUnitVectors(v(0,1,0),d.clone().normalize());
    part.scale.set(r,d.length()/2+r*.35,r*.93);
  }
  let time=0,cycle=0,weight=0;
  function update(dt,effort=0,locomotion={}){
    const motionDt=Number.isFinite(dt)?Math.max(0,dt):0,animDt=Math.min(.12,motionDt);time+=animDt;
    const scale=Math.max(.01,Math.abs(root.scale.y)),speed=Number.isFinite(locomotion.speed)?locomotion.speed/scale:Math.max(0,effort)*.38;
    const lateralSpeed=Number.isFinite(locomotion.lateralSpeed)?locomotion.lateralSpeed/scale:0;
    const turnRate=Number.isFinite(locomotion.turnRate)?locomotion.turnRate:0;
    const velocities=legs.map(leg=>v(lateralSpeed+turnRate*leg.hip.z,0,speed-turnRate*leg.hip.x));
    const pace=Math.max(...velocities.map(velocity=>velocity.length())),moving=pace>.00001;
    weight+=(Math.min(1,pace/.12)-weight)*(1-Math.exp(-animDt*12));
    const stride=adult?.36:.29,stance=.69,cycleRate=pace*stance/stride;cycle+=motionDt*cycleRate;
    const angle=turnRate*motionDt,c=Math.cos(angle),s=Math.sin(angle),travel=speed*motionDt;
    // Callers turn first, then move along their new +Z. Invert that exact order
    // so planted feet (and swing endpoints) retain their ground positions.
    function groundFrame(point){
      const x=point.x,z=point.z;point.x=c*x-s*z-lateralSpeed*motionDt;point.z=s*x+c*z-travel;
    }
    body.position.y=.009*weight*Math.cos(cycle*tau*2);body.rotation.z=.014*weight*Math.sin(cycle*tau);
    head.rotation.x=.012*Math.sin(time*1.5)+.018*weight*Math.cos(cycle*tau*2);
    let lifted=legs.filter(leg=>leg.swing).length;
    for(const [index,leg] of legs.entries()){
      groundFrame(leg.contact);leg.foot.rotation.y-=angle;
      if(leg.swing){
        groundFrame(leg.swing.from);groundFrame(leg.swing.to);
        leg.swing.fromYaw-=angle;leg.swing.toYaw-=angle;
      }
      const velocity=velocities[index];let started=false;
      const reach=Math.hypot(leg.contact.x-leg.hip.x,leg.contact.z-leg.hip.z);
      if(moving&&!leg.swing&&lifted<2&&(cycle>=leg.nextLift||reach>stride*.58)){
        const duration=T.MathUtils.clamp((1-stance)/cycleRate,.10,.55);
        const lead=duration+Math.min(stance/(2*cycleRate),.45);
        const to=leg.hip.clone().addScaledVector(velocity,lead);to.y=0;
        leg.swing={from:leg.contact.clone(),to,elapsed:0,duration,fromYaw:leg.foot.rotation.y,toYaw:turnRate*duration};
        leg.nextLift+=Math.max(1,Math.floor(cycle-leg.nextLift)+1);started=true;lifted++;
      }
      let lift=0,rock=0;
      if(leg.swing){
        const step=leg.swing;if(!started)step.elapsed+=motionDt;
        // A stopped animal finishes a raised step; grounded feet never snap
        // back under the hips when speed/turnRate become zero.
        if(!moving){
          const dx=step.to.x-leg.hip.x,dz=step.to.z-leg.hip.z,d=Math.hypot(dx,dz),limit=stride*.55;
          if(d>limit){step.to.x=leg.hip.x+dx*limit/d;step.to.z=leg.hip.z+dz*limit/d;}
        }
        const progress=Math.min(1,step.elapsed/step.duration),ease=progress*progress*(3-2*progress);
        leg.contact.copy(step.from).lerp(step.to,ease);lift=.11*Math.sin(Math.PI*progress);
        leg.foot.rotation.y=T.MathUtils.lerp(step.fromYaw,step.toYaw,ease);rock=-.12*Math.sin(Math.PI*progress);
        if(progress===1){leg.contact.copy(step.to);leg.swing=null;lift=0;lifted--;}
      }
      leg.foot.position.set(leg.contact.x,lift,leg.contact.z);leg.foot.rotation.x=rock;
      const ankle=leg.contact.clone();ankle.y=.115+lift;
      const hip=leg.hip.clone().applyEuler(body.rotation).add(body.position);
      const direction=ankle.clone().sub(hip),distance=direction.length();direction.normalize();
      const upperLength=adult?.38:.275,lowerLength=adult?.38:.275;
      const along=T.MathUtils.clamp((upperLength*upperLength-lowerLength*lowerLength+distance*distance)/(2*Math.max(.01,distance)),.02,upperLength);
      const bend=v(0,0,leg.front?1:-1).addScaledVector(direction,-direction.z*(leg.front?1:-1)).normalize();
      const knee=hip.clone().addScaledVector(direction,along).addScaledVector(bend,Math.sqrt(Math.max(0,upperLength*upperLength-along*along)));
      bone(leg.upper,hip,knee,adult?.105:.125);bone(leg.lower,knee,ankle,adult?.076:.099);
    }
  }
  update(0,0);
  // About 1.6 / 2.2 times the 1.81 m player's body at the actual shoulders.
  return {root,articulatedGait:true,shoulderHeight,fieldMinShoulderHeight:adult?4.0:2.9,update,
    dispose(){for(const g of geometries)g.dispose();for(const m of materials.values())m.dispose();}};
}

// Playable descendants need their own visible bodies after evolution. These
// family-based sculpts are project adaptations awaiting artwork refinement;
// they deliberately expose that status to the portrait UI. They are separate
// meshes and proportions, not an adult model relabelled as its baby form.
function createTwinGrowthFigure(T,id){
  if(![86,87,92,93,94,99,107,111,112,121].includes(id))return null;
  const root=new T.Group(),body=new T.Group();root.add(body);root.name='twin-growth-'+id;
  const geometry=new Set(),materials=new Map(),joints=[],details=[];
  const sphere=new T.SphereGeometry(1,28,20);geometry.add(sphere);
  function material(color,metal=false){
    const key=color+':'+metal;
    if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color:new T.Color(color).convertSRGBToLinear(),roughness:metal?.37:.62,metalness:metal?.42:0}));
    return materials.get(key);
  }
  function part(g,color,parent=body,metal=false){
    geometry.add(g);const m=new T.Mesh(g,material(color,metal));m.castShadow=m.receiveShadow=true;parent.add(m);return m;
  }
  function oval(color,x,y,z,rx,ry,rz,parent=body,metal=false){
    const m=part(sphere,color,parent,metal);m.position.set(x,y,z);m.scale.set(rx,ry,rz);return m;
  }
  function box(color,x,y,z,w,h,d,parent=body,metal=false){
    const m=part(new T.BoxGeometry(w,h,d),color,parent,metal);m.position.set(x,y,z);return m;
  }
  function cone(color,x,y,z,r,h,parent=body,metal=false){
    const m=part(new T.ConeGeometry(r,h,16),color,parent,metal);m.position.set(x,y,z);return m;
  }
  function line(color,points,r,parent=body,metal=false){
    return part(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),32,r,8,false),color,parent,metal);
  }
  function ring(color,x,y,z,r,t,parent=body,metal=false){
    const m=part(new T.TorusGeometry(r,t,10,36),color,parent,metal);m.position.set(x,y,z);return m;
  }
  function limb(x,y,z,phase){
    const g=new T.Group();g.position.set(x,y,z);body.add(g);joints.push({g,y,phase});return g;
  }
  function eye(x,y,z,r,parent=body,color=0x2a4948){
    oval(0xeaf7ed,x,y,z,r,r*1.16,r*.24,parent);
    oval(color,x,y,z+r*.20,r*.56,r*.83,r*.12,parent);
    oval(0xffffff,x-r*.15,y+r*.34,z+r*.32,r*.17,r*.22,r*.035,parent);
  }
  if(id===86||id===87){
    const middle=id===87,stone=middle?0x718f90:0x8da8a1,moss=0x829849;
    const headY=middle?.90:.57,bodyY=middle?.43:.28;
    oval(stone,0,bodyY,0,middle?.25:.28,middle?.31:.22,.24);
    oval(stone,0,headY,.015,middle?.38:.34,middle?.25:.27,.26);
    for(const s of [-1,1]){
      const leg=limb(s*.16,middle?.24:.16,0,s<0?0:Math.PI);
      oval(stone,0,-.08,.025,.10,middle?.17:.10,.115,leg);
      oval(0xb9c6b5,0,-(middle?.20:.13),.06,.13,.07,.13,leg);
      eye(s*.15,headY+.015,.255,middle?.073:.089);
      const arm=limb(s*(middle?.34:.30),middle?.61:.35,.01,s<0?Math.PI:0);
      oval(stone,s*.025,-.11,0,.10,middle?.23:.13,.10,arm);
      oval(0xa3b6ad,s*.025,-(middle?.30:.20),.015,.115,.09,.12,arm);
      line(moss,[[s*.29,headY+.10,-.02],[s*.33,headY-.05,.12],[s*.27,headY-.19,.19]],.020);
    }
    if(middle){
      eye(0,headY+.035,.281,.065);
      for(const x of [-.23,0,.23])box(0xc5cbb9,x,1.16,-.01,.14,.13,.16);
      line(moss,[[-.20,.63,.19],[-.11,.52,.24],[.10,.50,.24],[.23,.57,.16]],.024);
    }else{
      cone(moss,-.10,.87,-.03,.065,.17).rotation.z=.32;
      cone(moss,.08,.85,-.02,.052,.13).rotation.z=-.24;
      oval(0xb6c7ba,0,.28,.20,.13,.105,.025);
    }
  }else if(id===111||id===112){
    const middle=id===112,gold=middle?0xd8ac24:0xe3bd45,steel=0x929d9e;
    oval(gold,0,.30,0,middle?.31:.28,.22,middle?.36:.28,body,true);
    for(const s of [-1,1]){
      for(const z of [-.17,.15]){
        const leg=limb(s*.25,.22,z,(s<0?0:Math.PI)+(z<0?Math.PI:0));
        oval(steel,s*.07,-.055,.015,.11,.12,.12,leg,true);
        oval(gold,s*.09,-.12,.055,.13,.065,.145,leg,true);
      }
      const arm=limb(s*.28,.27,.20,s<0?0:Math.PI);
      line(steel,[[0,0,0],[s*.09,.015,.13],[s*.14,-.01,.22]],.045,arm,true);
      for(const side of [-1,1])line(gold,[[s*.14,-.01,.22],[s*.14+side*.07,-.01,.29],[s*.14+side*.045,-.01,.36]],.034,arm,true);
      eye(s*.115,.34,middle?.335:.265,.073,body,0x3e501d);
    }
    line(steel,[[-.20,.45,.06],[0,.50,.03],[.20,.45,.06]],.018,body,true);
    if(middle){
      line(steel,[[0,.35,-.25],[0,.50,-.39],[0,.70,-.38],[0,.79,-.23]],.07,body,true);
      for(const [y,z] of [[.47,-.35],[.61,-.39],[.75,-.31]])box(gold,0,y,z,.16,.13,.15,body,true);
      box(gold,0,.79,-.16,.24,.12,.19,body,true);
      for(const s of [-1,1])cone(0xb45443,s*.065,.78,-.03,.025,.12).rotation.x=Math.PI/2;
    }else{
      for(const s of [-1,1])line(steel,[[s*.08,.47,.02],[s*.12,.61,.01],[s*.15,.64,.02]],.015,body,true);
    }
  }else if(id===92||id===93||id===94){
    const color={92:0xbadac9,93:0x92b5e4,94:0xc3e9f1}[id],accent={92:0x7baaa1,93:0xf1d64f,94:0x74bddc}[id];
    const head=new T.Group();head.position.y=.73;body.add(head);details.push(head);
    oval(color,0,.35,0,.20,.25,.18);oval(0xf2faf3,0,.32,.12,.13,.19,.07);
    oval(color,0,0,.01,.31,.27,.24,head);
    for(const s of [-1,1]){
      eye(s*.13,.017,.225,.09,head,id===93?0x3e5378:0x3b6974);
      const leg=limb(s*.12,.18,.01,s<0?0:Math.PI);oval(color,0,-.09,.06,.07,.12,.105,leg);
      const ear=oval(color,s*.19,.30,-.02,.075,.26,.05,head);ear.rotation.z=-s*.30;
      const inner=oval(accent,s*.205,.31,.024,.037,.18,.012,head);inner.rotation.z=-s*.30;
      if(id===92){
        const wing=oval(0xe5f4ea,s*.29,.51,-.04,.10,.30,.075);wing.rotation.z=-s*.86;
        for(let k=0;k<3;k++)oval(accent,s*(.34+k*.04),.53-k*.07,-.01,.08,.12,.034).rotation.z=-s*.70;
      }else if(id===93){
        const bolt=box(accent,s*.34,.43,.015,.12,.25,.045);bolt.rotation.z=-s*.48;
        box(accent,s*.40,.57,.015,.16,.065,.05).rotation.z=s*.24;
      }else{
        const fin=cone(accent,s*.30,.44,-.005,.12,.33);fin.rotation.z=-s*.76;
        cone(0xeffcff,s*.21,1.21,-.03,.06,.18).rotation.z=-s*.25;
      }
    }
    line(accent,[[0,.32,-.12],[.10,.37,-.35],[.14,.55,-.40]],.055);
    if(id===94)cone(0xc7f6ff,.14,.64,-.40,.09,.21);
  }else if(id===99){
    const blue=0x276a9f,teal=0x22b6a5;
    oval(teal,0,.48,-.08,.26,.26,.47);
    for(const s of [-1,1])for(const z of [-.33,.25]){
      const leg=limb(s*.23,.39,z,(s<0?0:Math.PI)+(z<0?Math.PI:0));
      oval(blue,0,-.13,0,.105,.24,.12,leg);oval(0xdceff3,0,-.32,.07,.13,.065,.15,leg);
    }
    const head=new T.Group();head.position.set(0,.86,.31);body.add(head);details.push(head);
    box(blue,0,0,0,.58,.53,.24,head);box(teal,0,.012,.13,.52,.46,.055,head);
    box(0xe9f4ec,0,.025,.169,.43,.36,.025,head);
    for(const s of [-1,1]){
      eye(s*.115,.045,.19,.058,head,0x376caf);
      const ear=ring(0x57d4df,s*.36,.01,0,.17,.045,head);ear.rotation.y=Math.PI/2;
      line(0xe0f36f,[[s*.34,.10,.02],[s*.47,.23,.02],[s*.40,.25,.02],[s*.55,.41,.02]],.019,head);
      cone(blue,s*.16,.43,-.025,.105,.43,head).rotation.z=-s*.23;
    }
    line(blue,[[0,.52,-.43],[0,.60,-.66],[0,.88,-.76]],.06);
    cone(0x93dedc,0,1.00,-.76,.08,.23);
  }else if(id===107){
    const stone=0xbba79e,blue=0x739eb7;
    cone(0xd9ded5,0,.23,0,.24,.49).rotation.z=Math.PI;
    const thread=[];for(let k=0;k<=100;k++){const t=k/100,a=t*Math.PI*9;thread.push([.23*t*Math.cos(a),.02+.43*t,.23*t*Math.sin(a)]);}
    line(0x5b737a,thread,.025);
    box(stone,0,.62,0,.58,.41,.38);box(blue,0,.79,.195,.46,.16,.025);
    box(stone,0,1.03,-.015,.64,.32,.47);box(0xd8c8b8,0,1.21,-.015,.72,.07,.50);
    for(const s of [-1,1]){
      eye(s*.13,1.03,.225,.061,body,0x374750);
      const arm=limb(s*.39,.76,.01,s<0?0:Math.PI);
      box(stone,s*.035,-.16,0,.20,.36,.24,arm);oval(blue,s*.045,-.38,.045,.17,.14,.16,arm);
      for(const k of [-1,0,1])cone(0xddd5c2,s*.045+k*.07,-.50,.085,.03,.14,arm).rotation.x=Math.PI;
      box(0x736867,s*.19,1.257,.01,.075,.015,.36).rotation.y=s*.27;
    }
  }else if(id===121){
    const pink=0xd7aa99,cream=0xf0dfb6;
    oval(pink,0,.49,.20,.27,.29,.23);
    const shell=oval(cream,0,.89,-.10,.45,.46,.37);
    for(const s of [-1,1]){
      const spiral=[];for(let k=0;k<=100;k++){const t=k/100,a=t*Math.PI*3.5,r=.34*(1-.9*t);spiral.push([s*(.46-.13*(1-t)),.89+r*Math.cos(a),-.10+r*Math.sin(a)]);}
      line(0xab9b75,spiral,.017);
      const point=cone(0xd2e2bc,s*.50,.90,-.10,.21,.38);point.rotation.z=-s*Math.PI/2;
      const leg=limb(s*.18,.27,.13,s<0?0:Math.PI);oval(pink,0,-.10,.02,.12,.18,.13,leg);oval(cream,0,-.22,.10,.15,.07,.17,leg);
      const arm=limb(s*.29,.57,.23,s<0?Math.PI:0);oval(pink,s*.035,-.14,.02,.09,.21,.10,arm);oval(cream,s*.045,-.31,.055,.11,.08,.12,arm);
      eye(s*.12,.59,.411,.062,body,0x7e5550);
      cone(0xe0eac6,s*.21,1.28,-.02,.09,.25).rotation.z=-s*.40;
    }
    oval(0xf2cfba,0,.33,.37,.16,.13,.04);details.push(shell);
  }
  let time=0,phase=0,weight=0;
  return {root,articulatedGait:joints.length>0,presentationNote:'项目简化造型 · 待按原立绘精修',update(dt,effort=0,locomotion={}){
    dt=Math.min(.12,Math.max(0,dt));time+=dt;
    const scale=Math.max(.01,Math.abs(root.scale.y));
    const speed=Number.isFinite(locomotion.speed)?locomotion.speed/scale:effort*.40;
    const turning=Number.isFinite(locomotion.turnRate)?Math.abs(locomotion.turnRate):0;
    weight+=(Math.min(1,Math.abs(speed)*5+turning*.5)-weight)*Math.min(1,dt*12);
    phase+=dt*(Math.abs(speed)*7+turning*1.8);
    for(const j of joints){j.g.rotation.x=Math.sin(phase+j.phase)*.22*weight;j.g.position.y=j.y+Math.max(0,Math.cos(phase+j.phase))*.025*weight;}
    for(const d of details)d.rotation.z=.017*Math.sin(time*1.8);
    if([92,93,94].includes(id))body.position.y=.018*Math.sin(time*2.3);
  },dispose(){for(const g of geometry)g.dispose();for(const m of materials.values())m.dispose();}};
}

// Classic twin-world figures. Identity/colour references: Taomee's numbered
// main/spirit/{id}.html and seerh5.61.com pet/head/{id}.png.
// Full silhouettes were compared with the preserved original battle artwork at
// wiki.biligame.com/seer/精灵:{id}; unseen backs and joint motion are 3D adaptations.
// This adds presentation only: no species stats, capture rules or boss rewards.
function createTwinSpiritFigure(T,id){
  const growth=createTwinGrowthFigure(T,id);if(growth)return growth;
  if(id===89||id===90)return createDidaFamilyFigure(T,id);
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
        if(j<steps){const n=j*sides+i,next=j*sides+(i+1)%sides;indices.push(n,next,n+sides,next,next+sides,n+sides);}
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
  function walkJoint(x,y,z,amount,phase=0,parent=body){
    const g=joint(x,y,z,'x',amount,phase,parent),entry=joints[joints.length-1];
    entry.walk=true;entry.baseY=y;entry.side=Math.sign(x)||1;entry.forward=z;return g;
  }
  function eyePatch(c,x,y,rx,ry,centre,radii,lift=.003,parent=body){
    const p=[],indices=[],rows=12,sides=48;
    for(let j=0;j<=rows;j++)for(let k=0;k<sides;k++){
      const a=k*tau/sides,r=j/rows,px=x+rx*r*Math.cos(a),py=y+ry*r*Math.sin(a);
      const dx=px-centre[0],dy=py-centre[1];
      const dz=radii[2]*Math.sqrt(Math.max(.001,1-(dx/radii[0])**2-(dy/radii[1])**2));
      const normal=v(dx/(radii[0]**2),dy/(radii[1]**2),dz/(radii[2]**2)).normalize();
      const point=v(px,py,centre[2]+dz).addScaledVector(normal,lift);p.push(point.x,point.y,point.z);
      if(j<rows){const n=j*sides+k,next=j*sides+(k+1)%sides;indices.push(n,n+sides,next,next,n+sides,next+sides);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(indices);g.computeVertexNormals();
    return mesh(g,c,parent);
  }
  function eye(x,y,z,r,parent=body,iris=0x647f7d){
    const centre=[0,1.215,0],radii=[.47,.276,.30];
    eyePatch(0x293a39,x,y,r*1.10,r*1.20,centre,radii,.002,parent);
    eyePatch(0xfcfff8,x,y,r*.96,r*1.04,centre,radii,.003,parent);
    finishSpiritPart(eyePatch(iris,x,y,r*.55,r*.73,centre,radii,.004,parent),'iris',materials);
    eyePatch(0x293b3b,x,y,r*.34,r*.51,centre,radii,.005,parent);
    eyePatch(0xffffff,x-r*.17,y+r*.29,r*.12,r*.17,centre,radii,.006,parent);
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
      const eyeCentre=[0,hy,adult?0:.012],eyeRadii=[hw,adult?.325:.275,adult?.267:.225];
      if(adult){
        eyePatch(0x337a83,s*spread,eyeY,r*1.32,r*1.47,eyeCentre,eyeRadii,.012);
        eyePatch(blue,s*spread,eyeY,r*1.23,r*1.38,eyeCentre,eyeRadii,.014);
      }
      eyePatch(0x835310,s*spread,eyeY,r*1.03,r*1.20,eyeCentre,eyeRadii,.016);
      eyePatch(0xf0c150,s*spread,eyeY,r*.93,r*1.09,eyeCentre,eyeRadii,.018);
      finishSpiritPart(eyePatch(0xad731c,s*spread,eyeY-.006,r*.76,r*.91,eyeCentre,eyeRadii,.020),'iris',materials);
      eyePatch(0x171719,s*spread,eyeY+.012,r*.55,r*.70,eyeCentre,eyeRadii,.022);
      eyePatch(0xffffff,s*spread-r*.25,eyeY+r*.38,r*.22,r*.24,eyeCentre,eyeRadii,.024);
      eyePatch(0xffffff,s*spread-r*.34,eyeY+r*.03,r*.095,r*.13,eyeCentre,eyeRadii,.025);
      const leg=walkJoint(s*(adult?.13:.12),adult?.18:.12,-.012,.27,s<0?0:Math.PI);
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
      const centre=[0,headY,-.015],radii=[rx*1.15,.235,rx*1.03];
      eyePatch(dark,s*.109,.80,.106,.139,centre,radii,.002);
      eyePatch(0xfffdf3,s*.109,.80,.093,.126,centre,radii,.003);
      finishSpiritPart(eyePatch(0x87356e,s*.109,.815,.069,.095,centre,radii,.004),'iris',materials);
      eyePatch(0x151c24,s*.096,.831,.048,.072,centre,radii,.005);
      eyePatch(0xffffff,s*.105-.021,.865,.025,.031,centre,radii,.006);
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
      const centre=[0,0,0],radii=[.305,.30,.255];
      eyePatch(0x9da39b,s*.172,-.018,.117,.164,centre,radii,.002,head);
      finishSpiritPart(eyePatch(0x24291b,s*.172,-.018,.102,.149,centre,radii,.003,head),'iris',materials);
      eyePatch(0x4b5138,s*.190,-.065,.061,.085,centre,radii,.004,head);
      eyePatch(0x080d0a,s*.160,.006,.074,.102,centre,radii,.005,head);
      eyePatch(0xffffff,s*.172-.031,.060,.012,.048,centre,radii,.006,head);
      rod(0xf6f8ef,[s*.045,.33,0],[s*.15,.19,.025],.023);
    }
    strand(0x777d77,[[-.059,.46,.220],[-.035,.445,.233],[0,.458,.239],[.036,.445,.233],[.060,.460,.22]],.007);
  }else if(id===97||id===98){
    const adult=id===98,blue=0x3167a2,deep=0x123e69,cyan=0x32c7ca,teal=0x19ac91,white=0xe7eff0;
    if(adult){
      oval(teal,0,.38,-.22,.19,.20,.35);
      for(const s of [-1,1]){
        const front=walkJoint(s*.18,.34,.25,.28,s<0?0:Math.PI);
        oval(blue,0,-.12,.045,.118,.18,.16,front);oval(0x4e99dd,0,-.245,.075,.12,.055,.14,front);
        const back=walkJoint(s*.20,.31,-.39,.30,s<0?Math.PI*1.5:Math.PI*.5);
        rod(white,[0,.025,.02],[s*.035,-.10,-.09],.067,back);
        oval(teal,s*.035,-.12,-.08,.080,.13,.10,back);oval(0x4a95d5,s*.035,-.23,-.08,.111,.056,.128,back);
        const collar=ring(white,s*.016,.37,-.25,.20,.025);collar.rotation.y=Math.PI/2;
      }
    }else{
      cylinder(deep,0,.26,0,.285,.25,.10);cylinder(blue,0,.21,0,.26,.23,.073);
      for(const s of [-1,1]){
        const foot=walkJoint(s*.12,.15,0,.32,s<0?0:Math.PI);
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
      oval(0x174c94,s*width*.25,.024,.178,width*.107,.068,.003,head);
      finishSpiritPart(oval(0x5f9ee7,s*width*.25,.024,.182,width*.084,.057,.0025,head),'iris',materials);
      oval(0x123c72,s*width*.25,.03,.185,width*.048,.042,.002,head);
      oval(0xffffff,s*width*.25-.011,.047,.188,.012,.019,.0015,head);
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
      const foot=walkJoint(s*.12,.13,.035,.29,s<0?0:Math.PI);
      oval(pink,0,0,0,.082,adult?.095:.137,.092,foot);
      for(let i=0;i<3;i++)oval(0xb88478,(i-1)*.032,.02+.048*(i%2),.077,.013,.023,.008,foot);
    }
    oval(pink,0,.31,.17,.205,.159,.146);
    for(let i=0;i<9;i++){
      const a=i*2.4,x=Math.sin(a)*.159,y=.245+.073*Math.cos(a);
      oval(0xba8a7d,x,y,.293-Math.abs(x)*.18,.012,.019,.007);
    }
    for(const s of [-1,1]){
      const centre=[0,.31,.17],radii=[.205,.159,.146];
      eyePatch(0x514343,s*.095,.335,.047,.071,centre,radii,.002);
      eyePatch(0xa46a68,s*.095,.337,.034,.059,centre,radii,.003);
      eyePatch(0x161719,s*.095,.340,.020,.046,centre,radii,.004);
      eyePatch(0xffffff,s*.095-.009,.364,.010,.017,centre,radii,.005);
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
      const leg=walkJoint(s*.18,.62,0,.21,s<0?0:Math.PI);
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
        const leg=walkJoint(s*.32,-.05,z,.24,(s<0?0:Math.PI)+(z<0?Math.PI:0),trunk);
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
  let time=0,walkPhase=0,walkWeight=0;
  return {root,articulatedGait:joints.some(j=>j.walk),update(dt,effort=0,locomotion={}){
    dt=Math.min(.12,Math.max(0,dt));time+=dt;
    const scale=Math.max(.01,Math.abs(root.scale.y));
    const speed=Number.isFinite(locomotion.speed)?locomotion.speed/scale:Math.max(0,effort)*.40;
    const turnRate=Number.isFinite(locomotion.turnRate)?locomotion.turnRate:0;
    const moving=Math.min(1,Math.abs(speed)*5+Math.abs(turnRate)*.6);
    walkWeight+=(moving-walkWeight)*Math.min(1,dt*12);
    walkPhase+=dt*(Math.abs(speed)*7+Math.abs(turnRate)*1.9);
    for(const j of joints){
      if(j.walk){
        const phase=walkPhase+j.phase,pivotOnly=Math.abs(speed)<.025&&Math.abs(turnRate)>.03;
        const direction=pivotOnly?-Math.sign(turnRate)*j.side:1;
        j.g.rotation.x=Math.sin(phase)*j.amount*walkWeight*direction;
        j.g.position.y=j.baseY+Math.max(0,Math.cos(phase))*.035*walkWeight;
      }else j.g.rotation[j.axis]=Math.sin(time*(id===113?1.4:1.8)+j.phase)*j.amount;
    }
    for(const [i,m] of discharges.entries())m.opacity=.28+.22*(.5+.5*Math.sin(time*2.4+i*.45));
    body.position.y=id===91?.025*Math.sin(time*2.4):[105,106,188,189].includes(id)?.014*Math.sin(time*2):0;
    if(id===105)body.rotation.y=.065*Math.sin(time*.9);
  },dispose(){for(const g of geometries)g.dispose();for(const m of materials.values())m.dispose();}};
}
