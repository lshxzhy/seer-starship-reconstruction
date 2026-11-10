  // The model uses +X for the bow. Each station records its half-beam,
  // keel, widest belt and top in that order. The rising forefoot below a
  // nearly level upper deck follows the side silhouette in the flight manual.
  const sections = [
    [-4.80,1.54,-1.09,.22,.84],[-4.45,1.83,-1.35,.29,1.04],
    [-3.55,2.09,-1.67,.33,1.16],[-2.50,2.30,-1.94,.35,1.24],
    [-1.45,2.48,-2.06,.36,1.29],[-.30,2.52,-2.12,.38,1.36],
    [.85,2.51,-2.11,.39,1.40],[1.95,2.43,-1.97,.41,1.39],
    [3.02,2.26,-1.67,.42,1.32],[4.08,1.96,-1.18,.46,1.21],
    [4.92,1.52,-.61,.50,1.08],[5.53,1.01,-.08,.54,.93],
    [5.87,.52,.28,.59,.83],[6.0,.11,.52,.64,.75]
  ];
  const lerp = T.MathUtils.lerp;
  function station(x) {
    let i = 0;
    while (i < sections.length - 2 && sections[i+1][0] < x) i++;
    const a = sections[i], b = sections[i+1];
    const t = T.MathUtils.clamp((x-a[0])/(b[0]-a[0]),0,1);
    return a.slice(1).map((n,j) => lerp(n,b[j+1],t));
  }
  function shellPoint(x, angle, offset=0) {
    const [width,keel,belt,top] = station(x);
    const c = Math.cos(angle), s = Math.sin(angle);
    const height = c >= 0 ? top-belt : belt-keel;
    return [x, belt + Math.sign(c)*Math.abs(c)**.84*height + c*offset,
      Math.sign(s)*Math.abs(s)**.85*width*(1+.10*Math.min(0,c)) + s*offset];
  }
  // Patches share the same parametric skin. Their narrow gaps expose the
  // darker structural layer without drawing a heavy line around every panel.
  const shellBatches=new Map();
  function patch(sample, nx, ny, material, tile=null) {
    if(!shellBatches.has(material))shellBatches.set(material,{vertices:[],indices:[],uv:[]});
    const {vertices,indices,uv}=shellBatches.get(material);
    const first=vertices.length/3;
    // The two extra edge samples form a folded return on each armour sheet.
    const along=(i,n)=>tile===null?i/n:i===0?0:i===n?1:.013+.974*(i-1)/(n-2);
    for(let i=0;i<=nx;i++) for(let j=0;j<=ny;j++){
      const u=along(i,nx),v=along(j,ny);
      vertices.push(...sample(u,v));
      if(tile!==null){
        uv.push((tile%2+.008+u*.984)/2,1-(Math.floor(tile/2)+.015+v*.97)/2);
      }
    }
    for(let i=0;i<nx;i++) for(let j=0;j<ny;j++) {
      const a=first+i*(ny+1)+j, b=a+1, c=a+ny+1, d=c+1;
      indices.push(a,b,c,b,d,c);
    }
  }
  const tau=Math.PI*2;
  patch((u,v)=>shellPoint(lerp(-4.80,6,u),v*tau),72,64,mats.dark);
  const bands=[0,.44,.98,1.34,1.61,1.94,2.48,Math.PI];
  const cuts=[-4.8,-3.39,-1.67,.34,2.56,4.44,6.0];
  const mirroredAngle=(side,angle)=>side===1?angle:tau-angle;
  for(const side of [-1,1]) {
    for(let b=0;b<bands.length-1;b++) for(let k=0;k<cuts.length-1;k++) {
      // Stagger the joints and give a few of the broad plates a dogleg.
      const seam=(index,v)=> {
        const stagger=index>0&&index<cuts.length-1 ? .15*Math.sin(bands[b]+(bands[b+1]-bands[b])*v)*Math.cos(index)*2 : 0;
        const dogleg=index>0&&index<cuts.length-1 ? .12*Math.max(0,1-Math.abs(v-.48)*2.6) : 0;
        return cuts[index]+stagger+dogleg;
      };
      let coating=b<=1?mats.pearl:mats.hull;
      if(b===2) coating=mats.steel;
      if(b===3 && k<2) coating=mats.cobalt;
      if(b>=5) coating=b===6?mats.steel:(k%3===0?mats.steel:mats.shadowArmor);
      patch((u,v)=>{
        const q=side===1?v:1-v;
        const x=lerp(seam(k,q)+.009,seam(k+1,q)-.009,u);
        const a=lerp(bands[b]+.003,bands[b+1]-.003,q);
        const edge=Math.min(u,1-u,v,1-v);
        const lip=.012+.025*Math.min(1,edge/.013);
        return shellPoint(x,mirroredAngle(side,a),lip);
      },16,10,armourCoat(coating),(b*3+k+(side===1?1:0))%4);
    }
  }
  // Cross-section end caps and a bevel-edged outer sill.
  for(const [x,facing] of [[-4.80,-1],[6,1]]) {
    const [width,keel,belt,top]=station(x);
    const cap=box(.042,top-keel,width*1.72,mats.dark,x,(keel+top)/2,0);
    if(facing===1) cap.scale.z=.68;
  }
  function trim(side,start,end,a0,a1,mat,offset=.067) {
    return patch((u,v)=>{
      const q=side===1?v:1-v;
      return shellPoint(lerp(start,end,u),mirroredAngle(side,lerp(a0,a1,q)),offset);
    },Math.max(2,Math.ceil((end-start)*5)),3,mat);
  }
  for(const side of [-1,1]) {
    trim(side,-4.44,5.97,1.23,1.32,mats.pearl);
    // Two continuous dark window galleries wrap around the blunt bow.
    for(const [start,end,a0,a1] of [[.62,5.96,1.44,1.59],[1.10,5.79,1.70,1.82]]) {
      trim(side,start-.025,end+.025,a0-.012,a1+.012,mats.steel,.072);
      trim(side,start,end,a0,a1,mats.dark,.082);
      for(let x=start+.13,j=0;x<end-.10;x+=.165,j++) {
        const light=j%7===4?mats.glass:j%5===1?mats.cyan:mats.blue;
        trim(side,x-.009,x+.084,a0+.017,a1-.018,mats.edge,.094);
        trim(side,x,x+.071,a0+.029,a1-.030,light,.099);
        trim(side,x-.012,x+.086,a1-.027,a1-.009,mats.steel,.105);
      }
    }
    trim(side,-4.36,-2.60,1.66,1.95,mats.cobalt);
    for(let i=0;i<3;i++) trim(side,2.30+i*.16,2.37+i*.16,.78,.99,mats.ochre,.066);
    trim(side,.59,4.56,2.34,2.39,mats.cobalt,.058);
  }

  // Longitudinal castings use a squared section for the engine-bay roof and
  // floor. The space between them remains open around the three exhausts.
  function casting(profile,mat,lateral=0,exponent=.60) {
    const p=[],idx=[],n=48;
    for(const [x,y,rz,ry] of profile) for(let j=0;j<n;j++){
      const a=j*tau/n,c=Math.cos(a),s=Math.sin(a);
      p.push(x,y+Math.sign(c)*Math.abs(c)**exponent*ry,lateral+Math.sign(s)*Math.abs(s)**exponent*rz);
    }
    for(let i=0;i<profile.length-1;i++) for(let j=0;j<n;j++) {
      const a=i*n+j,b=i*n+(j+1)%n,c=a+n,d=b+n;
      idx.push(a,b,c,b,d,c);
    }
    for(const last of [false,true]){
      const i=last?profile.length-1:0,k=p.length/3;
      p.push(profile[i][0],profile[i][1],lateral);
      for(let j=0;j<n;j++){
        const a=i*n+j,b=i*n+(j+1)%n;idx.push(k,last?a:b,last?b:a);
      }
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();
    return mesh(g,mat);
  }
  casting([[-5.69,.71,1.36,.12],[-5.60,.75,1.65,.21],[-5.25,.80,1.87,.32],[-4.49,.93,2.02,.41],[-3.54,1.03,2.10,.35],[-2.71,1.12,1.60,.15]],mats.hull);
  casting([[-5.67,.53,1.41,.05],[-5.56,.52,1.70,.07],[-4.47,.56,2.03,.10],[-3.36,.74,1.88,.04]],mats.cobalt);
  casting([[-5.29,-1.22,1.22,.11],[-5.18,-1.24,1.47,.18],[-4.74,-1.20,1.70,.20],[-3.75,-1.18,1.73,.36],[-2.72,-1.34,1.37,.27]],mats.steel);
  for(const side of [-1,1]){
    casting([[-5.06,-.31,.13,.53],[-4.83,-.31,.20,.72],[-4.03,-.20,.31,.89],[-3.24,-.24,.20,.66]],mats.edge,side*1.64);
    casting([[-3.15,1.00,.22,.28],[-2.57,1.25,.43,.56],[-1.63,1.30,.51,.72],[-.58,1.27,.49,.63],[.44,1.12,.38,.41],[1.31,.97,.15,.17]],mats.pearl,side*1.55);
    const lines=[[-2.78,1.35,1.84],[-2.13,1.67,1.99],[-1.28,1.72,2.00],[-.53,1.51,1.98],[.38,1.28,1.87]];
    lineTube(lines.map(([x,y,z])=>[x,y,z*side]),.038,mats.ochre);
    trim(side,-4.31,-2.69,1.70,1.89,mats.dark,.087);
    for(let j=0;j<10;j++){
      const x=-4.19+j*.138;
      trim(side,x,x+.070,1.736,1.86,j%4===0?mats.blue:mats.steel,.109);
    }
  }
  // Raked glazed wheelhouse with a structural arch on each side of the glass.
  const glazing=[[-1.15,1.38,.80,.27],[-.72,1.58,1.04,.59],[-.16,1.67,1.14,.72],[.52,1.65,1.18,.64],[1.28,1.52,1.12,.45],[1.96,1.39,.93,.23],[2.40,1.32,.58,.085]];
  casting(glazing,mats.glass,0,.60);
  for(const [x,y,w,h] of glazing.slice(2,6).filter((_,i)=>i!==1)){
    const arch=[];
    for(let j=0;j<=26;j++){
      const a=lerp(-1.62,1.62,j/26),c=Math.cos(a),s=Math.sin(a);
      arch.push([x,y+Math.sign(c)*Math.abs(c)**.60*(h+.032),Math.sign(s)*Math.abs(s)**.60*(w+.030)]);
    }
    lineTube(arch,.044,mats.edge);
  }
  for(const s of [-1,1]){
    const ridge=glazing.slice(1).map(([x,y,w,h])=>[x,y+h*.78+.043,s*w*.75]);
    lineTube(ridge,.047,mats.pearl);
  }
  // The raised deck spine carries the registry instead of a floating billboard.
  casting([[2.05,1.36,.73,.055],[2.32,1.42,.98,.12],[3.13,1.35,1.03,.12],[4.22,1.20,.85,.11],[5.20,1.00,.47,.078],[5.87,.78,.15,.036]],mats.pearl);
  function deckMarking() {
    const label=document.createElement('canvas');label.width=768;label.height=256;
    const c=label.getContext('2d');
    c.fillStyle='#193e57';c.textAlign='center';c.font='bold 150px Arial, sans-serif';c.fillText('SEER',384,157);
    c.font='bold 51px monospace';c.fillText('SE–A015',384,228);
    const texture=new T.CanvasTexture(label);texture.encoding=T.sRGBEncoding;
    const paint=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
    const g=new T.PlaneGeometry(1.43,.58);
    const m=mesh(g,paint,3.07,1.478,0);m.rotation.order='ZYX';m.rotation.z=-.135;m.rotation.x=-Math.PI/2;
  }
  deckMarking();

  // These blue-gray maintenance covers and ochre registration stripes wrap
  // over the stern casting. The plotted height is taken from its own section.
  const roof=[[-5.69,.71,1.36,.12],[-5.60,.75,1.65,.21],[-5.25,.80,1.87,.32],[-4.49,.93,2.02,.41],[-3.54,1.03,2.10,.35],[-2.71,1.12,1.60,.15]];
  function roofHeight(x,z){
    let i=0;while(i<roof.length-2 && roof[i+1][0]<x)i++;
    const a=roof[i],b=roof[i+1],t=(x-a[0])/(b[0]-a[0]);
    const [cy,rz,ry]=a.slice(1).map((n,j)=>lerp(n,b[j+1],t));
    return cy+ry*Math.max(0,1-(Math.abs(z)/rz)**(2/.6))**.3;
  }
  function roofPlate(x0,x1,z0,z1,coating,lift=.025){
    return patch((u,v)=>{
      const z=lerp(z0,z1,v),x=lerp(x0,x1,u)+.075*Math.abs(z);
      return [x,roofHeight(x,z)+lift,z];
    },10,5,coating);
  }
  for(const side of [-1,1]){
    const sides=(a,b)=>side>0?[a,b]:[-b,-a];
    roofPlate(-5.59,-3.68,...sides(1.02,1.50),mats.cobalt);
    roofPlate(-5.57,-3.98,...sides(.88,.96),mats.ochre);
    roofPlate(-5.12,-3.47,...sides(.30,.69),mats.edge);
    for(let i=0;i<7;i++)roofPlate(-5.05+i*.202,-4.95+i*.202,...sides(.33,.67),mats.steel,.043);
    for(let i=0;i<3;i++)roofPlate(-5.34+i*.22,-5.25+i*.22,...sides(1.05,1.43),mats.pearl,.050);
  }
  // The many fitted panes and seams all stay in ship coordinates; a single
  // indexed surface per finish handles them in exterior and sectional views.
  for(const [material,{vertices,indices,uv}] of shellBatches){
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    if(uv.length)geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    geometry.setIndex(indices);geometry.computeVertexNormals();
    mesh(geometry,material).name='舰壳分板与舷窗';
  }
  shellBatches.clear();
