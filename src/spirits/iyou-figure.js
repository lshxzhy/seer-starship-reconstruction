// #004 伊优. Taomee identity/colour reference:
// https://seer.61.com/main/spirit/4.html
// https://seerh5.61.com/resource/assets/pet/head/4.png
// Original full battle artwork preserved at https://wiki.biligame.com/seer/精灵:4
// The hooked crest, forehead marks, rising white face, fingered fin arms and
// folded membranes follow that image. Hidden back/tail thickness is a 3D adaptation.
// Local forward is +Z; the neutral feet rest on y=0. Evolution #005/#006 is separate.
function createIyooFigure(T,id){
  if(Number(id)!==4)return null;
  const root=new T.Group(),body=new T.Group();root.name='伊优';root.add(body);
  const headPivot=new T.Group(),head=new T.Group();headPivot.position.set(0,.91,.045);
  head.position.set(0,-.91,-.045);headPivot.add(head);body.add(headPivot);
  const sphere=new T.SphereGeometry(1,36,24),geometries=new Set([sphere]),materials=new Map();
  const blue=0x2d9ee2,deepBlue=0x17658e,finBlue=0x298fc7,aqua=0xa9e9e9,white=0xf3f7f1;
  const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),tau=Math.PI*2;
  function paint(colour){
    if(!materials.has(colour))materials.set(colour,new T.MeshStandardMaterial({
      color:new T.Color(colour).convertSRGBToLinear(),roughness:.48}));
    return materials.get(colour);
  }
  function mesh(geometry,colour,parent=body,tissue=null){
    geometries.add(geometry);const part=new T.Mesh(geometry,paint(colour));
    part.castShadow=part.receiveShadow=true;parent.add(part);
    return tissue?finishSpiritPart(part,tissue,materials):part;
  }
  function oval(colour,x,y,z,rx,ry,rz,parent=body,tissue=null){
    const part=mesh(sphere,colour,parent,tissue);part.position.set(x,y,z);part.scale.set(rx,ry,rz);return part;
  }
  function stroke(colour,points,r,parent=body){
    return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>Array.isArray(p)?v(...p):p)),
      Math.min(100,Math.max(20,points.length*3)),r,8,false),colour,parent);
  }
  function geometry(positions,indices){
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    g.setIndex(indices);g.computeVertexNormals();return g;
  }
  // A varying section follows a centreline, keeping real thickness at the root
  // and a fine tip. It forms the crest, arms and digits without ball-joint seams.
  function sweep(colour,points,widths,depths,parent=body,tissue='cuticle',flatX=false){
    const path=new T.CatmullRomCurve3(points.map(p=>v(...p))),rows=40,sides=18;
    const frames=path.computeFrenetFrames(rows,false),positions=[],indices=[];
    for(let j=0;j<=rows;j++){
      const t=j/rows,q=t*(widths.length-1),k=Math.min(widths.length-2,Math.floor(q));
      const w=T.MathUtils.lerp(widths[k],widths[k+1],q-k),d=T.MathUtils.lerp(depths[k],depths[k+1],q-k);
      const at=path.getPointAt(t),normal=flatX?v(0,-frames.tangents[j].z,frames.tangents[j].y).normalize():frames.normals[j];
      const binormal=flatX?v(1,0,0):frames.binormals[j];
      for(let i=0;i<sides;i++){
        const a=i*tau/sides,p=at.clone().addScaledVector(normal,Math.cos(a)*w).addScaledVector(binormal,Math.sin(a)*d);
        positions.push(p.x,p.y,p.z);
        if(j<rows){const n=j*sides+i,next=j*sides+(i+1)%sides;indices.push(n,next,n+sides,next,next+sides,n+sides);}
      }
    }
    return mesh(geometry(positions,indices),colour,parent,tissue);
  }
  function profileAt(rows,y){
    let k=1;while(k<rows.length-1&&rows[k][0]<y)k++;
    const a=rows[k-1],b=rows[k],t=T.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1),f=t*t*(3-2*t);
    return [T.MathUtils.lerp(a[1],b[1],f),T.MathUtils.lerp(a[2],b[2],f),T.MathUtils.lerp(a[3],b[3],f)];
  }
  function skin(rows,parent,colour){
    const positions=[],indices=[],rings=64,sectors=64,low=rows[0][0],high=rows[rows.length-1][0];
    for(let j=0;j<=rings;j++){
      const y=T.MathUtils.lerp(low,high,j/rings),[rx,rz,cz]=profileAt(rows,y);
      for(let k=0;k<sectors;k++){
        const a=k*tau/sectors;positions.push(rx*Math.sin(a),y,cz+rz*Math.cos(a));
        if(j<rings){const n=j*sectors+k,next=j*sectors+(k+1)%sectors;indices.push(n,next,n+sectors,next,next+sectors,n+sectors);}
      }
    }
    return mesh(geometry(positions,indices),colour,parent,'cuticle');
  }
  const torsoRows=[
    [.145,.006,.010,.015],[.20,.115,.112,.004],[.29,.208,.174,-.015],
    [.43,.233,.198,-.028],[.58,.198,.171,-.010],[.70,.135,.125,.012],[.76,.083,.082,.020]
  ];
  skin(torsoRows,body,blue);
  // The belly patch follows the torso itself and narrows into the neck.
  {
    const positions=[],indices=[],rows=24,sides=28;
    for(let j=0;j<=rows;j++){
      const t=j/rows,y=.265+.43*t,[rx,rz,cz]=profileAt(torsoRows,y);
      const width=.67*Math.sin(Math.PI*t)**.52+.035;
      for(let k=0;k<=sides;k++){
        const a=(k/sides*2-1)*width;positions.push((rx+.0015)*Math.sin(a),y,cz+(rz+.002)*Math.cos(a));
        if(j<rows&&k<sides){const n=j*(sides+1)+k;indices.push(n,n+1,n+sides+1,n+1,n+sides+2,n+sides+1);}
      }
    }
    mesh(geometry(positions,indices),white,body,'cuticle');
  }
  // Wide cranium, flattened lower jaw and a gently receding rear profile. The
  // face is a conforming colour region, not a second sphere masking the head.
  const headRows=[
    [.602,.006,.009,.155],[.637,.165,.150,.132],[.692,.282,.238,.106],
    [.818,.350,.281,.073],[.993,.373,.300,.043],[1.180,.331,.276,.008],
    [1.316,.220,.196,-.026],[1.385,.054,.068,-.050],[1.396,.004,.006,-.055]
  ];
  skin(headRows,head,blue);
  function headPoint(a,y,lift=0){
    const [rx,rz,cz]=profileAt(headRows,y);return v((rx+lift)*Math.sin(a),y,cz+(rz+lift)*Math.cos(a));
  }
  {
    const positions=[],indices=[],rows=30,sectors=72;
    for(let k=0;k<=sectors;k++){
      const a=-1.48+2.96*k/sectors;
      const top=.792+.302*Math.exp(-((a/.245)**2))+.198*Math.exp(-(((Math.abs(a)-1.07)/.33)**2));
      for(let j=0;j<=rows;j++){
        const t=j/rows,y=.615+(top-.615)*t,p=headPoint(a,y,.0023);positions.push(p.x,p.y,p.z);
        if(k<sectors&&j<rows){const n=k*(rows+1)+j;indices.push(n,n+rows+1,n+1,n+1,n+rows+1,n+rows+2);}
      }
    }
    mesh(geometry(positions,indices),white,head,'cuticle');
  }
  const mouth=[];
  for(let k=0;k<=32;k++){
    const a=-.86+1.72*k/32,y=.662+.038*(Math.abs(a)/.86)**1.7;
    mouth.push(headPoint(a,y,.005));
  }
  stroke(0x6590a0,mouth,.0055,head);
  const eyes=[];
  for(const side of [-1,1]){
    const eye=new T.Group(),at=headPoint(side*.595,.868,.004);eye.position.copy(at);
    eye.rotation.set(0,side*.41,-side*.11);head.add(eye);eyes.push(eye);
    oval(deepBlue,0,0,0,.081,.121,.024,eye);
    oval(0x102633,0,0,.017,.070,.109,.022,eye);
    finishSpiritPart(oval(0xbe4c92,side*.004,-.017,.037,.052,.078,.013,eye),'iris',materials);
    oval(0x101c2a,-side*.010,.010,.047,.040,.073,.012,eye);
    oval(0xffffff,-.016,.042,.059,.024,.034,.006,eye);
    // Two small turquoise marks belong on the forehead, separate from the eyes.
    const mark=new T.Group(),a=side*.47,y=1.214,p=headPoint(a,y,.003);
    mark.position.copy(p);mark.rotation.set(-.38,side*.42,side*.14);head.add(mark);
    oval(0x176b8b,0,0,0,.027,.049,.009,mark);
    oval(0x9ce4e7,0,0,.008,.019,.040,.007,mark);
  }
  // Broad hooked dorsal crest with a concave front. Its changing cross-section
  // makes the crest legible from both the front and the profile view.
  sweep(blue,[[0,1.245,-.045],[0,1.435,-.118],[0,1.558,-.005],[0,1.505,.126]],
    [.090,.079,.056,.002],[.047,.042,.029,.001],head,'cuticle',true);
  function membrane(points,colour,parent){
    let [a,b,c]=points.map(p=>v(...p)),normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    if(normal.z<0){[b,c]=[c,b];normal.negate();}
    const positions=[],indices=[],steps=14,grid=[];
    for(let face=0;face<2;face++){
      grid[face]=[];
      for(let i=0;i<=steps;i++){
        grid[face][i]=[];
        for(let j=0;j<=steps-i;j++){
          const u=i/steps,w=j/steps,q=1-u-w;
          const p=a.clone().multiplyScalar(q).addScaledVector(b,u).addScaledVector(c,w)
            .addScaledVector(normal,.19*u*w*q+(face?-.006:.006));
          grid[face][i][j]=positions.length/3;positions.push(p.x,p.y,p.z);
        }
      }
      for(let i=0;i<steps;i++)for(let j=0;j<steps-i;j++){
        const first=[grid[face][i][j],grid[face][i+1][j],grid[face][i][j+1]];
        indices.push(...(face?first.reverse():first));
        if(j<steps-i-1){const second=[grid[face][i+1][j],grid[face][i+1][j+1],grid[face][i][j+1]];indices.push(...(face?second.reverse():second));}
      }
    }
    const part=mesh(geometry(positions,indices),colour,parent,'fin');
    stroke(finBlue,[a,b,c,a],.012,parent);return part;
  }
  const fins=[];
  for(const side of [-1,1]){
    const arm=new T.Group();arm.position.set(side*.195,.61,-.015);body.add(arm);fins.push(arm);
    membrane([[0,-.02,-.015],[side*.229,.270,.020],[side*.192,-.155,-.142]],aqua,arm);
    membrane([[0,-.02,-.015],[side*.192,-.155,-.142],[side*.075,-.337,-.115]],0x93dce5,arm);
    sweep(blue,[[0,0,0],[side*.102,.125,.016],[side*.20,.245,.026],[side*.242,.325,.028]],
      [.080,.076,.062,.051],[.061,.056,.046,.038],arm);
    const wrist=oval(blue,side*.242,.333,.028,.063,.070,.052,arm,'cuticle');wrist.rotation.z=-side*.35;
    for(let j=-1;j<=1;j++){
      const x=side*(.239+j*.037),y=.345-.012*Math.abs(j);
      sweep(blue,[[x,y,.028],[x+side*.018,y+.040,.032],[x+side*.021,y+.063,.035]],
        [.027,.024,.013],[.026,.021,.012],arm);
      const pad=oval(aqua,x+side*.016,y+.040,.055,.021,.034,.012,arm,'fin');pad.rotation.z=-side*.28;
    }
    stroke(finBlue,[[0,-.02,-.015],[side*.08,-.065,-.068],[side*.192,-.155,-.142]],.014,arm);
  }
  // A short tapered rear paddle continues the fins' pale webbing. Its reverse
  // side and thickness complete the original pose without inventing a long tail.
  const tail=new T.Group();tail.position.set(0,.31,-.18);body.add(tail);
  sweep(blue,[[0,0,0],[0,.065,-.16],[0,.20,-.29],[0,.26,-.32]],
    [.070,.118,.078,.002],[.045,.041,.025,.001],tail,'fin',true);
  const rearWeb=oval(aqua,0,.121,-.188,.041,.133,.055,tail,'fin');rearWeb.rotation.x=.62;
  const feet=[];
  for(const side of [-1,1]){
    oval(blue,side*.132,.155,.037,.073,.092,.074,body,'cuticle');
    const foot=new T.Group();foot.position.set(side*.132,0,.037);foot.rotation.y=side*.16;body.add(foot);feet.push(foot);
    const positions=[],indices=[],rows=26,sectors=32;
    for(let j=0;j<=rows;j++){
      const t=j/rows,z=-.11+.345*t,width=.101*Math.sin(Math.PI*t)**.68+.001;
      const thickness=.052*Math.sin(Math.PI*t)**.8+.001;
      for(let k=0;k<sectors;k++){
        const a=k*tau/sectors;positions.push(width*Math.cos(a),thickness*(1+Math.sin(a)),z);
        if(j<rows){const n=j*sectors+k,next=j*sectors+(k+1)%sectors;indices.push(n,next,n+sectors,next,next+sectors,n+sectors);}
      }
    }
    mesh(geometry(positions,indices),blue,foot,'cuticle');
    for(let j=-1;j<=1;j++){
      const pad=oval(aqua,j*.051,.072,.135-.018*Math.abs(j),.025,.026,.050,foot,'fin');pad.rotation.x=-.12;pad.rotation.z=-j*.13;
      stroke(deepBlue,[[j*.051-.020,.065,.101],[j*.051-.025,.077,.131],[j*.051-.014,.068,.176]],.0035,foot);
    }
  }
  let time=0;
  return {root,update(dt,effort=0){
    time+=Math.max(0,Math.min(.12,dt));const stride=T.MathUtils.clamp(effort,0,1);
    headPivot.rotation.y=.025*Math.sin(time*1.4);headPivot.rotation.z=.014*Math.sin(time*1.1);
    for(const [i,arm] of fins.entries()){
      const side=i===0?-1:1;arm.rotation.z=side*(.028+.045*stride)*Math.sin(time*(1.7+stride*2.1)+i*.4);
      arm.rotation.x=.025*Math.sin(time*1.6+i);
    }
    tail.rotation.y=.10*Math.sin(time*(2.0+stride*1.8));
    for(const [i,foot] of feet.entries())foot.rotation.x=.09*stride*Math.sin(time*7+i*Math.PI);
    const cycle=time%5.7,blink=1-.88*Math.max(0,1-Math.abs(cycle-5.35)/.10);
    for(const eye of eyes)eye.scale.y=blink;
  },dispose(){for(const g of geometries)g.dispose();for(const m of materials.values())m.dispose();}};
}
