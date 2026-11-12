// Original water starters #005 / #006. Identity and official avatar references:
// https://seer.61.com/main/spirit/5.html  https://seer.61.com/main/spirit/6.html
// https://seerh5.61.com/resource/assets/pet/head/5.png (also /6.png)
// Complete original battle artwork preserved by the corresponding wiki pages:
// https://patchwiki.biligame.com/images/seer/d/dc/6bkert8tpjjsj8kx88cwd1msl72f0hk.png
// https://patchwiki.biligame.com/images/seer/5/57/pg7cemay3lkaa01rh9zif6knylgyasb.png
// Silhouettes and visible markings follow those images. Unseen reverse surfaces
// and the depth of fins are a restrained 3D completion, not new canonical detail.
// Forward +Z; resting feet y=0. #004 remains in iyou-figure.js.
function createStarterWaterFigure(T,id){
  id=Number(id);if(id!==5&&id!==6)return null;
  const adult=id===6,root=new T.Group(),body=new T.Group();root.add(body);
  root.name=adult?'巴鲁斯':'尤里安';
  const blue=0x2d9ee2,shade=0x267faa,line=0x22617e,white=0xf3f7f1;
  const mint=0x9be0c5,finLight=0xa6edf0,pad=0xb0f0ec;
  const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),tau=Math.PI*2;
  const sphere=new T.SphereGeometry(1,32,22),geometries=new Set([sphere]),materials=new Map();
  const arms=[],legs=[],eyes=[],fins=[];let tail,headPivot,time=0;
  function paint(colour){
    if(!materials.has(colour))materials.set(colour,new T.MeshStandardMaterial({
      color:new T.Color(colour).convertSRGBToLinear(),roughness:.48}));
    return materials.get(colour);
  }
  function mesh(g,colour,parent=body,tissue='cuticle'){
    geometries.add(g);const part=new T.Mesh(g,paint(colour));
    part.castShadow=part.receiveShadow=true;parent.add(part);
    return tissue?finishSpiritPart(part,tissue,materials):part;
  }
  function oval(colour,x,y,z,rx,ry,rz,parent=body,tissue='cuticle'){
    const part=mesh(sphere,colour,parent,tissue);part.position.set(x,y,z);part.scale.set(rx,ry,rz);return part;
  }
  function geometry(positions,indices){
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    g.setIndex(indices);g.computeVertexNormals();return g;
  }
  function stroke(colour,points,r,parent=body){
    return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>Array.isArray(p)?v(...p):p)),
      Math.max(24,points.length*4),r,8,false),colour,parent,null);
  }
  function sweep(colour,points,widths,depths,parent=body,tissue='cuticle',vertical=false){
    const curve=new T.CatmullRomCurve3(points.map(p=>v(...p))),rows=48,sides=20;
    const frames=curve.computeFrenetFrames(rows,false),positions=[],indices=[];
    for(let j=0;j<=rows;j++){
      const t=j/rows,q=t*(widths.length-1),k=Math.min(widths.length-2,Math.floor(q));
      const a=curve.getPointAt(t),tangent=frames.tangents[j];
      const n=vertical?v(0,1,0).addScaledVector(tangent,-tangent.y).normalize():frames.normals[j];
      const b=vertical?tangent.clone().cross(n).normalize():frames.binormals[j];
      const w=T.MathUtils.lerp(widths[k],widths[k+1],q-k),d=T.MathUtils.lerp(depths[k],depths[k+1],q-k);
      for(let i=0;i<sides;i++){
        const angle=tau*i/sides,p=a.clone().addScaledVector(n,w*Math.cos(angle)).addScaledVector(b,d*Math.sin(angle));
        positions.push(p.x,p.y,p.z);
        // N cross B = tangent: angular edge cross longitudinal edge is outward.
        if(j<rows){const s=j*sides+i,next=j*sides+(i+1)%sides;indices.push(s,next,s+sides,next,next+sides,s+sides);}
      }
    }
    // End caps also close the thicker roots, even when a joint rotates.
    for(const end of [0,1]){
      const p=curve.getPointAt(end),centre=positions.length/3;positions.push(p.x,p.y,p.z);
      const start=end?rows*sides:0;
      for(let i=0;i<sides;i++){
        const a=start+i,b=start+(i+1)%sides;
        indices.push(...(end?[centre,a,b]:[centre,b,a]));
      }
    }
    return mesh(geometry(positions,indices),colour,parent,tissue);
  }
  // Hermite sections keep the head/neck continuous between measured contours.
  // Each section is [height, lateral radius, depth radius, centre depth].
  function profile(rows,y){
    let k=1;while(k<rows.length-1&&rows[k][0]<y)k++;
    const a=rows[k-1],b=rows[k],before=rows[Math.max(0,k-2)],after=rows[Math.min(rows.length-1,k+1)];
    const span=b[0]-a[0],t=T.MathUtils.clamp((y-a[0])/span,0,1),t2=t*t,t3=t2*t;
    return [1,2,3].map(c=>{
      const m0=(b[c]-before[c])/(b[0]-before[0]),m1=(after[c]-a[c])/(after[0]-a[0]);
      const value=(2*t3-3*t2+1)*a[c]+(t3-2*t2+t)*span*m0+(-2*t3+3*t2)*b[c]+(t3-t2)*span*m1;
      return c<3?Math.max(.001,value):value;
    });
  }
  function surfacePoint(rows,a,y,lift=0){
    const [rx,rz,cz]=profile(rows,y);return v((rx+lift)*Math.sin(a),y,cz+(rz+lift)*Math.cos(a));
  }
  function skin(rows,parent=body,colour=blue){
    const positions=[],indices=[],rings=76,sectors=64,low=rows[0][0],high=rows[rows.length-1][0];
    for(let j=0;j<=rings;j++)for(let k=0;k<sectors;k++){
      const p=surfacePoint(rows,k*tau/sectors,T.MathUtils.lerp(low,high,j/rings));positions.push(p.x,p.y,p.z);
      if(j<rings){const n=j*sectors+k,next=j*sectors+(k+1)%sectors;indices.push(n,next,n+sectors,next,next+sectors,n+sectors);}
    }
    return mesh(geometry(positions,indices),colour,parent);
  }
  function facePatch(rows,low,top,width,colour,parent=body){
    const positions=[],indices=[],sectors=76,rings=34;
    for(let k=0;k<=sectors;k++){
      const a=(k/sectors*2-1)*width,upper=typeof top==='function'?top(a):top,lower=typeof low==='function'?low(a):low;
      for(let j=0;j<=rings;j++){
        const y=T.MathUtils.lerp(lower,upper,j/rings),p=surfacePoint(rows,a,y,.0028);positions.push(p.x,p.y,p.z);
        if(k<sectors&&j<rings){const n=k*(rings+1)+j;indices.push(n,n+rings+1,n+1,n+1,n+rings+1,n+rings+2);}
      }
    }
    return mesh(geometry(positions,indices),colour,parent);
  }
  // Solid webs, including the concave tail margin. Ear clipping respects their
  // actual outline; a centre fan would fill the crescent's empty inner region.
  function panel(points,colour,parent=body,thickness=.012,hint=v(0,0,1)){
    let outline=points.map(p=>Array.isArray(p)?v(...p):p.clone());
    const centre=outline.reduce((sum,p)=>sum.add(p),v()).multiplyScalar(1/outline.length);
    const normal=v();
    for(let k=0;k<outline.length;k++)normal.add(outline[k].clone().sub(centre).cross(outline[(k+1)%outline.length].clone().sub(centre)));
    normal.normalize();
    if(normal.dot(hint)<0){outline.reverse();normal.negate();}
    const axis=outline[0].clone().sub(centre);axis.addScaledVector(normal,-axis.dot(normal)).normalize();
    const across=normal.clone().cross(axis),flat=outline.map(p=>{
      const q=p.clone().sub(centre);return new T.Vector2(q.dot(axis),q.dot(across));
    });
    const triangles=T.ShapeUtils.triangulateShape(flat,[]),positions=[],indices=[],sides=outline.length,starts=[];
    for(let face=0;face<2;face++){
      const start=positions.length/3,sign=face?-1:1;starts.push(start);
      for(const point of outline){
        const p=point.clone().addScaledVector(normal,sign*thickness);positions.push(p.x,p.y,p.z);
      }
      for(const triangle of triangles){
        let [a,b,c]=triangle;
        if(outline[b].clone().sub(outline[a]).cross(outline[c].clone().sub(outline[a])).dot(normal)<0)[b,c]=[c,b];
        const mid=outline[a].clone().add(outline[b]).add(outline[c]).multiplyScalar(1/3)
          .addScaledVector(normal,sign*(thickness+.003));
        const m=positions.length/3;positions.push(mid.x,mid.y,mid.z);
        const fan=[start+a,start+b,m,start+b,start+c,m,start+c,start+a,m];
        if(face)for(let k=0;k<fan.length;k+=3)[fan[k+1],fan[k+2]]=[fan[k+2],fan[k+1]];
        indices.push(...fan);
      }
    }
    for(let k=0;k<sides;k++){
      const a=starts[0]+k,b=starts[0]+(k+1)%sides,c=starts[1]+k,d=starts[1]+(k+1)%sides;
      indices.push(a,c,b,b,c,d);
    }
    return mesh(geometry(positions,indices),colour,parent,'fin');
  }
  function eye(parent,position,side,size,angry=false){
    const group=new T.Group();group.position.copy(position);group.rotation.set(0,side*(adult?.87:.49),side*(angry?-.17:-.07));
    parent.add(group);eyes.push(group);
    oval(line,0,0,0,size*1.10,size*.98,size*.24,group,null);
    oval(0x63203f,0,0,size*.20,size,size*.89,size*.18,group,null);
    oval(0xc94087,side*size*.06,-size*.12,size*.40,size*.76,size*.66,size*.12,group,'iris');
    oval(0x50203e,-side*size*.12,size*.16,size*.52,size*.58,size*.59,size*.08,group,null);
    oval(0xffeff7,-size*.19,size*.29,size*.63,size*.32,size*.27,size*.04,group,null);
    if(angry)stroke(shade,[[-size*1.12,size*.57,.022],[0,size*.73,.042],[size*.99,size*.64,.015]],size*.13,group);
    return group;
  }
  function ankleFoot(parent,side,x,z,size=1,claws=true){
    const foot=new T.Group();foot.position.set(side*x,0,z);foot.rotation.y=side*.15;parent.add(foot);legs.push(foot);
    const positions=[],indices=[],rows=30,sectors=32;
    for(let j=0;j<=rows;j++){
      const t=j/rows,depth=(-.11+.37*t)*size,rx=(.107*Math.sin(Math.PI*t)**.6+.001)*size;
      const h=(.058*Math.sin(Math.PI*t)**.75+.001)*size;
      for(let k=0;k<sectors;k++){
        const a=k*tau/sectors;positions.push(rx*Math.cos(a),h*(1+Math.sin(a)),depth);
        if(j<rows){const n=j*sectors+k,next=j*sectors+(k+1)%sectors;indices.push(n,next,n+sectors,next,next+sectors,n+sectors);}
      }
    }
    mesh(geometry(positions,indices),blue,foot);
    for(let j=-1;j<=1;j++){
      const x=j*.066*size,z=(.18-.02*Math.abs(j))*size;
      if(claws)sweep(pad,[[x,.055*size,z-.02*size],[x,.045*size,z+.04*size],[x,.012*size,z+.078*size]],
        [.031*size,.023*size,.001],[.029*size,.025*size,.001],foot,'horn');
      else oval(pad,x,.065*size,z,.030*size,.029*size,.048*size,foot,'fin');
    }
    return foot;
  }
  if(!adult){
    const torso=[
      [.22,.006,.008,-.035],[.28,.147,.132,-.031],[.42,.236,.186,-.040],
      [.61,.218,.168,-.015],[.80,.151,.124,.006],[.965,.086,.075,.025]
    ];
    skin(torso);
    // The chest's two lower lobes follow the body, with blue rising between them.
    facePatch(torso,a=>.30+.10*Math.exp(-((a/.22)**2)),.951,.70,white);
    // The old 004/005/006 turn-around shows a narrow forward (+Z) face and
    // a wide rounded-triangular rear. The side cheeks flare upward, while the
    // central crest sits over the skull rather than ending in a rear spike.
    // See docs/SOURCES.md for independent front/side/back reference frames.
    const headRows=[
      [.815,.006,.008,.160],[.865,.195,.245,.125],[.965,.355,.445,.100],
      [1.100,.535,.505,-.015],[1.240,.545,.425,-.075],[1.430,.430,.335,-.095],
      [1.620,.300,.245,-.080],[1.780,.170,.150,-.060],[1.870,.072,.072,-.040],
      [1.905,.002,.003,-.030]
    ];
    headPivot=new T.Group();headPivot.position.set(0,.92,.02);body.add(headPivot);
    const head=new T.Group();head.position.set(0,-.92,-.02);headPivot.add(head);
    function headPoint(a,y,lift=0){
      const [rx,rz,cz]=profile(headRows,y),sin=Math.sin(a),cos=Math.cos(a);
      const sideAngle=Math.abs(Math.atan2(sin,cos));
      const cheek=Math.exp(-(((sideAngle-1.83)/.38)**2)-(((y-1.185)/.225)**2));
      return v(((rx+lift)*(1-.36*cos)+.115*cheek)*sin,
        y+.175*cheek,cz+(rz+lift)*cos-.035*cheek);
    }
    {
      const positions=[],indices=[],rows=100,sides=80;
      for(let j=0;j<=rows;j++)for(let k=0;k<sides;k++){
        const p=headPoint(tau*k/sides,T.MathUtils.lerp(.815,1.905,j/rows));positions.push(p.x,p.y,p.z);
        if(j<rows){const n=j*sides+k,next=j*sides+(k+1)%sides;indices.push(n,next,n+sides,next,next+sides,n+sides);}
      }
      mesh(geometry(positions,indices),blue,head);
    }
    // White cheeks and the central blaze are sampled from the same surface.
    // The narrow blaze climbs the front crest; blue remains on both flanks.
    // White cheeks reach up under the side lobes, following the same shell.
    {
      const positions=[],indices=[],rows=34,sides=76;
      for(let k=0;k<=sides;k++){
        const a=(k/sides*2-1)*1.91,top=1.040+.115*Math.exp(-(((Math.abs(a)-1.67)/.40)**2));
        for(let j=0;j<=rows;j++){
          const p=headPoint(a,T.MathUtils.lerp(.829,top,j/rows),.0035);positions.push(p.x,p.y,p.z);
          if(k<sides&&j<rows){const n=k*(rows+1)+j;indices.push(n,n+rows+1,n+1,n+1,n+rows+1,n+rows+2);}
        }
      }
      mesh(geometry(positions,indices),white,head);
    }
    {
      const positions=[],indices=[],rows=74,sides=34;
      for(let j=0;j<=rows;j++){
        const y=T.MathUtils.lerp(1.036,1.905,j/rows);
        const width=.235+.13*T.MathUtils.smoothstep(y,1.08,1.70)+.55*T.MathUtils.smoothstep(y,1.80,1.905);
        for(let k=0;k<=sides;k++){
          const p=headPoint((k/sides*2-1)*width,y,.0040);positions.push(p.x,p.y,p.z);
          if(j<rows&&k<sides){const n=j*(sides+1)+k;indices.push(n,n+1,n+sides+1,n+1,n+sides+2,n+sides+1);}
        }
      }
      mesh(geometry(positions,indices),white,head);
    }
    const mouth=[];for(let k=0;k<=30;k++)mouth.push(headPoint(-1.03+2.06*k/30,.881+.013*Math.cos(k/30*Math.PI*2),.006));
    stroke(0x658a9d,mouth,.0045,head);
    for(const side of [-1,1]){
      const a=side*.755,y=1.105,eyeSize=.126,eyeGroup=eye(head,headPoint(a,y,.010),side,eyeSize);
      const angular=headPoint(a+.003,y).sub(headPoint(a-.003,y));
      const upright=headPoint(a,y+.003).sub(headPoint(a,y-.003));
      const normal=angular.cross(upright).normalize(),facing=normal.clone();
      // The eye looks forward beneath the swept forehead. Limit the upward
      // tilt and lift its rim along the true surface normal to avoid embedding.
      facing.y=Math.min(facing.y,Math.hypot(facing.x,facing.z)*Math.tan(.32));facing.normalize();
      const alignment=T.MathUtils.clamp(normal.dot(facing),-1,1);
      const clearance=.010+eyeSize*1.10*Math.sqrt(Math.max(0,1-alignment*alignment));
      eyeGroup.position.copy(headPoint(a,y)).addScaledVector(normal,clearance);
      eyeGroup.quaternion.setFromUnitVectors(v(0,0,1),facing);
      eyeGroup.rotateZ(-side*.16);
      // Forehead leaves follow the slope of the widened face, above the eyes.
      const spot=[];
      for(const [a,y] of [[.70,1.330],[.53,1.445],[.59,1.541],[.76,1.571],[.98,1.525],[.94,1.409]])spot.push(headPoint(side*a,y,.008));
      panel(spot,mint,head,.004);stroke(shade,[...spot,spot[0]],.007,head);
      const arm=new T.Group();arm.position.set(side*.155,.79,-.01);body.add(arm);arms.push(arm);
      sweep(blue,[[0,0,0],[side*.117,-.084,.028],[side*.155,-.181,.123],[side*.120,-.182,.185]],
        [.088,.096,.078,.055],[.074,.081,.066,.054],arm);
      const hand=oval(blue,side*.112,-.189,.182,.094,.113,.077,arm);hand.rotation.z=-side*.20;
      for(let j=0;j<3;j++){
        const finger=oval(pad,side*(.085+j*.011),-.125-j*.067,.243,.041,.027,.018,arm,'fin');finger.rotation.z=-side*.38;
      }
      const wing=new T.Group();wing.position.set(side*.053,-.035,-.030);arm.add(wing);fins.push(wing);
      panel([[0,0,0],[side*.195,.078,-.047],[side*.364,-.060,-.082],[side*.194,-.112,-.081]],mint,wing);
      panel([[side*.100,-.052,-.020],[side*.364,-.060,-.082],[side*.247,-.201,-.049],[side*.118,-.155,-.002]],mint,wing);
      stroke(blue,[[0,0,0],[side*.195,.078,-.047],[side*.364,-.060,-.082]],.016,wing);
      stroke(blue,[[side*.100,-.052,-.020],[side*.364,-.060,-.082],[side*.247,-.201,-.049]],.015,wing);
      oval(blue,side*.183,.317,-.027,.115,.178,.128);
      oval(blue,side*.183,.148,.027,.070,.101,.083);
      ankleFoot(body,side,.183,.052,1.02);
    }
    tail=new T.Group();tail.position.set(0,.405,-.17);body.add(tail);
    sweep(blue,[[0,0,0],[0,-.003,-.207],[0,.040,-.423],[0,.079,-.598]],
      [.093,.093,.061,.001],[.083,.074,.043,.001],tail);
    panel([[0,.007,-.06],[0,.157,-.265],[0,.150,-.419],[0,.077,-.645],
      [0,-.065,-.407],[0,-.065,-.223]],mint,tail,.014,v(1,0,0));
    panel([[.012,.001,-.08],[.012,.082,-.279],[.012,.092,-.403],[.012,.077,-.590],
      [.012,-.003,-.366],[.012,-.028,-.174]],blue,tail,.010,v(1,0,0));
  }else{
    // The final evolution is a long-necked swimmer supported by four limbs.
    // Body and throat form one continuous surface, retaining a narrow neck.
    const torso=[
      [.18,.011,.018,-.11],[.28,.237,.239,-.155],[.47,.317,.308,-.130],
      [.69,.281,.273,-.082],[.96,.209,.202,-.025],[1.24,.172,.161,.060],
      [1.48,.167,.159,.155],[1.67,.191,.184,.222],[1.78,.176,.150,.240]
    ];
    skin(torso);facePatch(torso,.255,1.754,.65,white);
    headPivot=new T.Group();headPivot.position.set(0,1.625,.218);body.add(headPivot);
    const head=new T.Group();head.position.set(0,-1.625,-.218);headPivot.add(head);
    const headRows=[
      [1.531,.018,.028,.303],[1.574,.145,.267,.341],[1.656,.225,.330,.351],
      [1.764,.247,.286,.287],[1.872,.202,.215,.217],[1.937,.105,.123,.161],
      [1.963,.004,.007,.135]
    ];
    skin(headRows,head);
    // The white lower snout is part of the elongated head contour; no duck bill.
    facePatch(headRows,1.538,a=>1.715+.106*Math.exp(-((a/.31)**2))-.025*Math.exp(-(((Math.abs(a)-.78)/.27)**2)),1.73,white,head);
    const mouth=[];for(let k=0;k<=32;k++)mouth.push(surfacePoint(headRows,-1.18+2.36*k/32,1.590+.020*(Math.abs(k-16)/16),.006));
    stroke(0x6a91a4,mouth,.0055,head);
    for(const side of [-1,1]){
      eye(head,surfacePoint(headRows,side*.91,1.766,.005),side,.071,true);
      const brow=surfacePoint(headRows,side*.83,1.821,.009);
      sweep(shade,[[brow.x-side*.038,brow.y+.014,brow.z+.010],[brow.x+side*.012,brow.y+.016,brow.z+.016],
        [brow.x+side*.055,brow.y-.015,brow.z-.018]],[.024,.027,.003],[.020,.022,.002],head);
      // Two tall forward crown rays replace the middle stage's single peak.
      sweep(blue,[[side*.103,1.871,.207],[side*.118,2.023,.091],[side*.122,2.224,-.075],[side*.115,2.313,-.162]],
        [.055,.050,.021,.001],[.041,.035,.015,.001],head);
      const nostril=surfacePoint(headRows,side*.42,1.718,.004);
      oval(shade,nostril.x,nostril.y,nostril.z,.014,.008,.006,head,null);
      const arm=new T.Group();arm.position.set(side*.197,1.293,.031);body.add(arm);arms.push(arm);
      sweep(blue,[[0,0,0],[side*.072,-.321,.055],[side*.099,-.720,.132],[side*.103,-1.153,.204]],
        [.101,.088,.087,.070],[.092,.082,.080,.073],arm);
      const frontFoot=ankleFoot(body,side,.300,.249,.97);
      frontFoot.userData.front=true;
      const wing=new T.Group();wing.position.set(side*.035,-.140,-.020);arm.add(wing);fins.push(wing);
      panel([[0,0,0],[side*.080,-.170,-.043],[side*.147,-.316,-.069],[side*.096,-.435,-.049],[side*.030,-.302,-.012]],mint,wing);
      panel([[side*.035,-.305,-.014],[side*.139,-.410,-.058],[side*.135,-.615,-.035],[side*.060,-.695,-.012]],mint,wing);
      stroke(blue,[[0,0,0],[side*.080,-.170,-.043],[side*.147,-.316,-.069]],.018,wing);
      stroke(blue,[[side*.035,-.305,-.014],[side*.139,-.410,-.058],[side*.135,-.615,-.035]],.016,wing);
      // Large rear haunches and forward-set ankles anchor the sitting stance.
      const thigh=oval(blue,side*.277,.435,-.184,.164,.264,.208);thigh.rotation.x=-.13;
      oval(shade,side*.300,.272,-.114,.134,.176,.159);
      oval(blue,side*.307,.132,-.021,.093,.102,.118);
      ankleFoot(body,side,.308,-.061,1.17);
      const knee=oval(mint,side*.365,.360,-.060,.030,.127,.054);knee.rotation.z=side*.18;
    }
    // Scalloped mint sail: three distinct webs down the crest and neck.
    const sail=new T.Group();body.add(sail);fins.push(sail);
    const webs=[
      [[0,1.868,.048],[0,2.215,-.131],[0,2.089,-.182],[0,1.989,-.338],[0,1.918,-.483],[0,1.710,-.177]],
      [[0,1.710,-.177],[0,1.918,-.483],[0,1.755,-.459],[0,1.544,-.515],[0,1.385,-.567],[0,1.310,-.214]],
      [[0,1.310,-.214],[0,1.385,-.567],[0,1.200,-.499],[0,.976,-.495],[0,.781,-.422],[0,.844,-.246]]
    ];
    for(const points of webs){
      panel(points,mint,sail,.017,v(1,0,0));
      const centre=points.reduce((sum,p)=>sum.add(v(...p)),v()).multiplyScalar(1/points.length);
      const inset=points.map(p=>v(...p).lerp(centre,.21));panel(inset,finLight,sail,.022,v(1,0,0));
      stroke(shade,[points[0],points[1]],.020,sail);stroke(shade,[points.at(-1),points.at(-2)],.020,sail);
      for(const s of [-1,1]){
        const dot=oval(0xd8f5c9,s*.028,centre.y+.026,centre.z-.025,.008,.034,.030,sail,'fin');dot.rotation.x=.25;
      }
    }
    tail=new T.Group();tail.position.set(0,.423,-.285);body.add(tail);
    const tailPath=[[0,0,0],[.095,-.145,-.305],[.259,-.284,-.669],[.193,-.317,-.926],[-.155,-.306,-1.024],[-.435,-.292,-.843]];
    sweep(blue,tailPath,[.147,.138,.105,.073,.046,.001],[.151,.154,.147,.118,.075,.001],tail,'cuticle',true);
    const tailWeb=[[0,.094,-.070],[.094,.115,-.291],[.186,-.028,-.457],[.245,.009,-.628],
      [.303,-.099,-.815],[.231,-.158,-1.010],[-.035,-.221,-1.105],[-.274,-.255,-1.043],
      [-.480,-.291,-.842],[-.182,-.286,-.978],[.172,-.289,-.887],[.227,-.252,-.653],[.078,-.113,-.256]];
    panel(tailWeb,mint,tail,.012,v(0,1,0));
    stroke(blue,[tailWeb[0],tailWeb[1],tailWeb[2],tailWeb[3],tailWeb[4]],.013,tail);
  }
  return {root,update(dt,effort=0){
    time+=T.MathUtils.clamp(Number(dt)||0,0,.12);const stride=T.MathUtils.clamp(Number(effort)||0,0,1);
    headPivot.rotation.y=(adult?.014:.025)*Math.sin(time*(adult?1.1:1.5));
    headPivot.rotation.z=(adult?.007:.012)*Math.sin(time*1.3);
    for(const [i,arm] of arms.entries()){
      const side=i===0?-1:1;arm.rotation.z=side*(adult?.009:.023)*Math.sin(time*1.7+i*.4);
      arm.rotation.x=(adult?.018:.065)*stride*Math.sin(time*5.5+i*Math.PI);
    }
    for(const [i,leg] of legs.entries())leg.rotation.x=(adult?.028:.065)*stride*Math.sin(time*5.5+i*Math.PI);
    for(const [i,fin] of fins.entries())fin.rotation.y=(adult?.012:.035)*Math.sin(time*1.8+i);
    tail.rotation.y=(adult?.055:.13)*Math.sin(time*(1.6+stride*1.8));
    const cycle=time%(adult?6.1:5.4),blink=1-.87*Math.max(0,1-Math.abs(cycle-(adult?5.8:5.1))/.11);
    for(const eye of eyes)eye.scale.y=blink;
  },dispose(){for(const g of geometries)g.dispose();for(const m of materials.values())m.dispose();}};
}
