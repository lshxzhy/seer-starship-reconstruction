// #004 伊优. Taomee identity/colour reference:
// https://seer.61.com/main/spirit/4.html
// https://seerh5.61.com/resource/assets/pet/head/4.png
// Original full battle artwork preserved at https://wiki.biligame.com/seer/精灵:4
// Cross-checked against the original battle animation, not a portrait crop:
// https://seer.61.com/resource/fightResource/pet/swf/4.swf
// attack sprite 19/frame 16, counterattack sprite 78/frame 23, hit sprite 85/frame 3.
// A preserved turnaround on the Baidu 尤里安 entry additionally shows a broad
// blue rear cranium; its original publication date is unverified. The cheek lobes,
// hooked crown and rising white face follow these views; hidden depth is adapted.
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
  // One continuous shell joins the low, wide cranium, the thick upswept rear
  // cheeks and the little hooked crown. Independent eased horizontal sections
  // used to stop their slope at every row and made the head look like stacked lids.
  // Latitude is an angle here, so colour patches follow the same deformation.
  function headSurface(a,latitude){
    const c=Math.cos(latitude),sy=Math.sin(latitude),sx=c*Math.sin(a),sz=c*Math.cos(a);
    const sideAngle=Math.acos(Math.cos(a));
    const cheek=Math.exp(-(((sideAngle-1.79)/.47)**2)-(((latitude-.19)/.53)**2));
    const crown=Math.exp(-((sx/.22)**2)-(((sz+.235)/.29)**2))
      *T.MathUtils.clamp((sy-.57)/.43,0,1);
    // Cheeks grow out of the sides and extend upwards/backwards, rather than
    // becoming thin ears pasted onto a spherical head. The muzzle stays short.
    return v(.373*sx+.108*Math.sin(a)*cheek,
      .950+.306*sy+.133*cheek+.164*crown,
      .048-.025*sy+.282*sz-.033*cheek+.205*crown*crown);
  }
  function headNormal(a,latitude){
    const delta=.0005;
    return headSurface(a+delta,latitude).sub(headSurface(a-delta,latitude))
      .cross(headSurface(a,latitude+delta).sub(headSurface(a,latitude-delta))).normalize();
  }
  function headPoint(a,latitude,lift=0){
    const p=headSurface(a,latitude);
    return lift?p.addScaledVector(headNormal(a,latitude),lift):p;
  }
  {
    const positions=[],indices=[],rings=88,sectors=112;
    for(let j=0;j<=rings;j++){
      // Tiny polar rings avoid the undefined normal of many coincident poles.
      const latitude=-Math.PI/2+.0001+(Math.PI-.0002)*j/rings;
      for(let k=0;k<sectors;k++){
        const p=headPoint(k*tau/sectors,latitude);positions.push(p.x,p.y,p.z);
        if(j<rings){const n=j*sectors+k,next=j*sectors+(k+1)%sectors;
          indices.push(n,next,n+sectors,next,next+sectors,n+sectors);}
      }
    }
    mesh(geometry(positions,indices),blue,head,'cuticle');
  }
  {
    const positions=[],indices=[],rows=44,sectors=104,low=-Math.PI/2+.001;
    for(let k=0;k<=sectors;k++){
      const a=-2.16+4.32*k/sectors;
      // A rounded central blaze separates the large eyes; white continues under
      // each cheek lobe. It ends before the blue rear surface shown in the turn.
      let top=-.57+1.08*Math.exp(-((a/.31)**2))
        +.75*Math.exp(-(((Math.abs(a)-1.69)/.50)**4));
      const edge=T.MathUtils.clamp((Math.abs(a)-1.83)/.33,0,1);
      top=T.MathUtils.lerp(top,low+.0001,edge*edge*(3-2*edge));
      for(let j=0;j<=rows;j++){
        const latitude=T.MathUtils.lerp(low,top,j/rows),p=headPoint(a,latitude,.0025);
        positions.push(p.x,p.y,p.z);
        if(k<sectors&&j<rows){const n=k*(rows+1)+j;indices.push(n,n+rows+1,n+1,n+1,n+rows+1,n+rows+2);}
      }
    }
    mesh(geometry(positions,indices),white,head,'cuticle');
  }
  const mouth=[];
  for(let k=0;k<=32;k++){
    const a=-.87+1.74*k/32,latitude=-1.09+.13*(Math.abs(a)/.87)**1.7;
    mouth.push(headPoint(a,latitude,.005));
  }
  stroke(0x6590a0,mouth,.0055,head);
  const eyes=[];
  function insetEye(side,angle,latitude){
    const delta=.0005;
    const metricA=headSurface(angle+delta,latitude).sub(headSurface(angle-delta,latitude)).length()/(2*delta);
    const metricB=headSurface(angle,latitude+delta).sub(headSurface(angle,latitude-delta)).length()/(2*delta);
    const layers=[],tilt=-side*.14,ca=Math.cos(tilt),sa=Math.sin(tilt),rows=12,sectors=48;
    for(const [colour,cx,cy,rx,ry,lift] of [
      [deepBlue,0,0,.100,.144,.0040],[0x102633,0,0,.090,.132,.0048],
      [0xbe4c92,side*.005,-.021,.069,.097,.0056],
      [0x101c2a,-side*.010,.015,.053,.090,.0064],
      [0xffffff,-.019,.050,.029,.041,.0072]
    ]){
      const samples=[],positions=[],indices=[];
      for(let j=0;j<=rows;j++)for(let k=0;k<sectors;k++){
        const a=tau*k/sectors,r=j/rows,x=cx+rx*r*Math.cos(a),y=cy+ry*r*Math.sin(a);
        samples.push([x*ca-y*sa,x*sa+y*ca]);positions.push(0,0,0);
        if(j<rows){const n=j*sectors+k,next=j*sectors+(k+1)%sectors;
          indices.push(n,n+sectors,next,next,n+sectors,next+sectors);}
      }
      const g=geometry(positions,indices);mesh(g,colour,head,colour===0xbe4c92?'iris':null);
      layers.push({g,samples,lift});
    }
    let previous=-1;
    const blink=value=>{
      if(Math.abs(previous-value)<.0001)return;previous=value;
      for(const {g,samples,lift} of layers){
        const positions=g.attributes.position;
        samples.forEach(([x,y],i)=>{
          const point=headPoint(angle+x/metricA,latitude+y*value/metricB,lift);
          positions.setXYZ(i,point.x,point.y,point.z);
        });
        positions.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();
      }
    };
    blink(1);eyes.push(blink);
  }
  for(const side of [-1,1]){
    // The markings bend with the head, including during a blink. The old
    // tangent-plane stack protruded by about a tenth of the head's depth.
    insetEye(side,side*.555,-.135);
    // Two small turquoise marks belong on the forehead, separate from the eyes.
    const mark=new T.Group(),a=side*.43,markLatitude=.71;
    mark.position.copy(headPoint(a,markLatitude,.010));
    mark.quaternion.setFromUnitVectors(v(0,0,1),headNormal(a,markLatitude));
    mark.rotateZ(side*.10);head.add(mark);
    oval(0x176b8b,0,0,0,.027,.049,.009,mark);
    oval(0x9ce4e7,0,0,.008,.019,.040,.007,mark);
  }
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
    for(const eye of eyes)eye(blink);
  },dispose(){for(const g of geometries)g.dispose();for(const m of materials.values())m.dispose();}};
}
