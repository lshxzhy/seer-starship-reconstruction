// The five species below were individually sculpted from the July 2011
// hunting register and the official portraits. +Z is forward; units are metres.
function createKloseSafariModel(T,id){
  const sizes={22:.46,30:.29,153:.153,198:.18,812:.33};
  if(!Object.hasOwn(sizes,id))return null;
  const root=new T.Group(),base=new T.Group(),body=new T.Group();root.add(base);base.add(body);
  const ball=new T.SphereGeometry(1,28,18),materials=new Map(),swing=[];
  const teal='#54ccdc',white='#fff8e9',black='#2b2527',brown='#765034',stone='#b58c58',honey='#efa927';
  function mat(c){
    if(!materials.has(c))materials.set(c,new T.MeshStandardMaterial({color:new T.Color(c).convertSRGBToLinear(),roughness:.60}));
    return materials.get(c);
  }
  function add(geom,material,parent=body){
    const m=new T.Mesh(geom,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  }
  function oval(c,x,y,z,rx,ry,rz,parent=body){
    const m=add(ball,mat(c),parent);m.position.set(x,y,z);m.scale.set(rx,ry,rz);return m;
  }
  function pivot(x,y,z,axis,magnitude,phase=0){
    const group=new T.Group();group.position.set(x,y,z);body.add(group);swing.push({group,axis,magnitude,phase});return group;
  }
  function path(c,pts,r,parent=body){
    const spline=new T.CatmullRomCurve3(pts.map(pt=>new T.Vector3(...pt)));
    return add(new T.TubeGeometry(spline,Math.max(10,pts.length*4),r,7,false),mat(c),parent);
  }
  function blade(c,a,b,size,parent=body){
    const v=new T.Vector3(...a),w=new T.Vector3(...b),direction=w.clone().sub(v);
    const mesh=add(new T.ConeGeometry(size,direction.length(),10),mat(c),parent);
    mesh.position.copy(v.lerp(w,.5));mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());return mesh;
  }
  function fin(c,corners,crest,parent=body,custom=null){
    const verts=[...crest,...corners.flat()],indices=[];
    for(let i=0;i<corners.length;i++)indices.push(0,i+1,(i+1)%corners.length+1);
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex(indices);g.computeVertexNormals();
    const material=custom||mat(c);material.side=T.DoubleSide;
    return add(g,material,parent);
  }
  function eye(x,y,z,r,outer,inside,parent=body){
    oval(outer,x,y,z,r*.78,r,r*.46,parent);
    finishSpiritPart(oval(inside,x*.99,y+.025*r,z+.36*r,r*.42,r*.67,r*.25,parent),'iris',materials);
    oval('#fffdf0',x-r*.115,y+r*.29,z+.56*r,r*.15,r*.18,r*.075,parent);
  }
  if(id===22){
    oval(teal,0,.49,0,.277,.264,.245);
    oval(white,0,.502,.151,.204,.179,.116);
    for(const s of [-1,1]){
      eye(s*.068,.524,.256,.042,black,'#16151d');
      const g=pivot(s*.21,.43,-.01,'z',.14,s);
      oval(teal,s*.058,-.003,0,.12,.074,.044,g);
      for(let j=0;j<3;j++){
        const feather=oval('#6fdadd',s*(.112+.019*j),.007+j*.058,0,.07,.091+j*.008,.038,g);
        feather.rotation.z=-s*(1.03-j*.23);finishSpiritPart(feather,'feather',materials);
      }
      const leg=oval(teal,s*.094,.203,.012,.049,.12,.061);leg.rotation.z=s*.14;
    }
    oval('#c9782a',0,.446,.260,.017,.023,.011);
    const plume=pivot(0,.748,0,'z',.055);
    fin('#e78b16',[[-.060,0,.001],[-.081,.092,.001],[-.03,.205,0],[.012,.31,0],[.074,.164,0],[.056,.033,0]],[.007,.114,.05],plume);
  }else if(id===30){
    const olive='#95bb4e',shell='#729e27',rim='#dfd474',seal='#616a2d';
    // Share the shell's boundary vertices between the green scutes and the
    // lower band. Two almost coincident ellipsoids gave a serrated colour edge.
    function shellPoint(azimuth,elevation,lift=0){
      const t=Math.cos(elevation),s=Math.sin(elevation),upper=T.MathUtils.smoothstep(s,-.70,.12);
      const rx=.345-.011*upper,ry=.312-.008*upper,rz=.330-.020*upper;
      return [(rx+lift)*t*Math.sin(azimuth),.295+.036*upper+(ry+lift)*s,
        -.018-.028*upper+(rz+lift)*t*Math.cos(azimuth)];
    }
    const sectors=56,lowerRows=12,upperRows=22,rows=lowerRows+upperRows;
    const shellGeo=new T.BufferGeometry(),positions=[],indices=[];
    for(let j=0;j<=rows;j++)for(let k=0;k<sectors;k++){
      const a=k*Math.PI*2/sectors,seam=-.33+.19*Math.cos(a)+.055*Math.cos(3*a);
      const latitude=j<=lowerRows?T.MathUtils.lerp(-Math.PI/2,seam,j/lowerRows):
        T.MathUtils.lerp(seam,Math.PI/2,(j-lowerRows)/upperRows);
      positions.push(...shellPoint(a,latitude));
      if(j<rows){
        const left=j*sectors+k,right=j*sectors+(k+1)%sectors;
        indices.push(left,right,left+sectors,right,right+sectors,left+sectors);
      }
    }
    shellGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));shellGeo.setIndex(indices);shellGeo.computeVertexNormals();
    const lowerCount=lowerRows*sectors*6;
    shellGeo.addGroup(0,lowerCount,0);shellGeo.addGroup(lowerCount,indices.length-lowerCount,1);
    add(shellGeo,[spiritCoating(mat(seal),'scute',materials),spiritCoating(mat(shell),'scute',materials)]);
    for(const side of [-1,1]){
      path('#455d20',[[.72,1.10],[1.14,.95],[1.66,.87],[2.15,1.01],[2.47,1.22]].map(([a,h])=>shellPoint(side*a,h,.002)),.008);
      for(const a of [1.14,2.15,2.89])path('#455d20',[[a,.94],[a+.12,.64],[a+.18,.35],[a+.14,.04]].map(([az,h])=>shellPoint(side*az,h,.002)),.007);
    }
    oval('#292a16',0,.313,.181,.280,.211,.089);
    path(rim,[[-.27,.142,.145],[-.302,.295,.15],[-.204,.505,.133],[-.084,.56,.092],[.114,.52,.112],[.258,.406,.150],[.304,.23,.147],[.248,.134,.144]],.050);
    oval('#b6aa5e',0,.177,.190,.283,.135,.177);
    for(let i=0;i<3;i++)path('#796d37',[[-.208+i*.018,.105+i*.054,.258],[0,.100+i*.056,.342+i*.01],[.197-i*.016,.110+i*.056,.268]],.008);
    oval(olive,0,.364,.204,.166,.145,.145);
    const brow=oval('#78401f',0,.461,.267,.053,.054,.033);brow.rotation.x=-.46;
    for(const side of [-1,1]){
      eye(side*.075,.384,.317,.049,'#637b31','#181911');
      const flipper=pivot(side*.207,.263,.144,'x',.12,side);oval('#8eaf3f',side*.023,-.029,.107,.082,.093,.10,flipper);
      oval('#bada68',side*.031,-.002,.175,.044,.045,.023,flipper);
    }
  }else if(id===198){
    // The fish swims along its local nose. The brown ridged carapace wraps a blue body.
    oval('#7393bb',0,.30,-.002,.126,.158,.273);
    oval(white,0,.306,.198,.114,.127,.126);
    oval('#8fa3c3',0,.245,.126,.118,.072,.183);
    for(const side of [-1,1]){
      eye(side*.091,.342,.247,.054,white,'#342719');
      const p=pivot(side*.103,.245,.032,'z',.17,side);
      fin(white,[[0,0,.11],[side*.198,-.10,-.045],[side*.11,-.053,-.119]],[side*.048,-.018,-.004],p);
    }
    for(let j=0;j<3;j++){
      const z=.145-.144*j;
      fin(j%2?'#bd985f':'#aa804e',[[-.125,.287,z+.07],[-.071,.418,z+.082],[0,.486,z-.073],[.075,.418,z+.082],[.123,.291,z+.071],[0,.338,z-.092]],
        [0,.459,z+.020]);
    }
    const tail=pivot(0,.295,-.203,'y',.29);
    fin('#aabddb',[[-.008,0,.055],[0,.173,-.201],[0,.035,-.167],[0,-.129,-.23],[0,-.060,.035]],[.017,0,-.097],tail);
    for(const s of [-1,1])path(stone,[[s*.095,.381,.186],[s*.139,.346,.039],[s*.103,.326,-.15],[s*.045,.33,-.25]],.014);
  }else if(id===153){
    oval(honey,0,.31,0,.177,.163,.161);
    for(let j=0;j<33;j++){
      const y=.19+.226*((j%9)/8),a=j*2.39996,d=.162*Math.sqrt(Math.max(.1,1-((y-.31)/.166)**2));
      const x=d*Math.sin(a),z=d*Math.cos(a);
      if(z>.088&&Math.abs(x)<.135)continue;
      blade('#e4a328',[x,y,z],[x*1.16,y+.018,z*1.16],.023);
    }
    for(const s of [-1,1]){
      eye(s*.067,.326,.133,.071,white,black);oval('#edaa2c',s*.055,.131,.017,.024,.058,.028);
      const g=pivot(s*.120,.359,-.044,'z',.13,s);
      for(const [dx,dy,z] of [[.326,.268,-.062],[.25,.020,-.151]]){
        const points=[[0,0,0],[s*dx*.43,dy*.67,z*.41],[s*dx,dy,z],[s*dx*.81,dy*.55-.034,z],[s*dx*.30,dy*.23-.038,z*.50]];
        const membrane=new T.MeshPhysicalMaterial({color:0xc3e8e9,roughness:.24,transparent:true,opacity:.68,side:T.DoubleSide,depthWrite:false});
        fin(null,points,[s*dx*.5,dy*.54,z*.51-.012],g,membrane);
        path('#b19e6d',[...points,points[0]],.005,g);
        path('#cfdae0',[points[0],[s*dx*.42,dy*.46,z*.46],points[2]],.004,g);
        for(const h of [.39,.65])path('#bbc6b8',[[s*dx*h,dy*h,z*h],[s*dx*(h+.1),dy*(h-.12),z*(h+.18)],[s*dx*(h+.19),dy*(h-.09)-.015,z*(h+.28)]],.0018,g);
      }
    }
  }else{
    const fur='#f6e8d8',face='#fff5e5',cocoa='#67462d';
    finishSpiritPart(oval(fur,0,.251,-.025,.182,.187,.145),'velvet',materials);finishSpiritPart(oval(face,0,.484,0,.245,.247,.197),'velvet',materials);
    for(const s of [-1,1]){
      oval('#dfc4b1',s*.182,.678,-.023,.101,.102,.055);
      oval(fur,s*.182,.683,.014,.094,.09,.038);
      oval('#6a5034',s*.195,.685,.049,.045,.043,.021);
      eye(s*.102,.488,.146,.078,'#a98a4d','#47321f');
      const paw=pivot(s*.145,.296,0,'x',.14,s);
      oval(fur,s*.045,-.051,.019,.064,.09,.068,paw);
      for(let j=0;j<3;j++)blade(brown,[s*(.022+.024*j),-.092,.044],[s*(.032+.023*j),-.174,.076],.015,paw);
      oval('#ded1bc',s*.081,.098,.043,.079,.058,.077);
      for(let j=0;j<3;j++)blade(face,[s*.202,.389+j*.037,0],[s*(.246-j*.008),.360+j*.037,-.01],.037);
    }
    oval(white,0,.41,.164,.108,.075,.085);oval(cocoa,0,.414,.222,.079,.047,.046);
    for(const s of [-1,1]){const brow=oval('#dcd3ca',s*.092,.607,.159,.045,.028,.023);brow.rotation.z=-s*.41;}
  }
  const box=new T.Box3().setFromObject(root),scale=sizes[id]/(box.max.y-box.min.y);
  base.scale.setScalar(scale);base.position.y=-box.min.y*scale;
  let t=0;
  return {root,update(dt,effort=0){
    t+=dt;body.scale.y=1+.012*Math.sin(t*2.75);
    body.rotation.y=(id===198?.072:.028)*Math.sin(t*2.3);
    const f=id===153?18:id===22?6:2.8;
    for(const j of swing)j.group.rotation[j.axis]=j.magnitude*Math.sin(t*(f+effort*2)+j.phase);
  },dispose(){disposeKloseModel(root);}};
}

function createKloseSafari(T,surface){
  const {chart,move,groundCorrection,pools}=surface;
  const stations=[],actors=[],labels=new Map();
  let s=null,wet=null,clock=0,stepOrigin=null,strides=0,stepGoal=12,sequence=0,guest=null,guestKey='';
  const fieldIds=[10,16,574,690,553,249,414,164,738];
  const anchors=[[3,-4],[-7,0],[9,4],[-3,-8],[1,-12],[-11,3],[12,-3],[-7,10],[4,9]];
  const cube=new T.BoxGeometry(1,1,1),round=new T.SphereGeometry(1,15,11);
  const materials=new Map();
  function material(hex){
    if(!materials.has(hex))materials.set(hex,new T.MeshStandardMaterial({color:new T.Color(hex).convertSRGBToLinear(),roughness:.65}));
    return materials.get(hex);
  }
  function mesh(g,geo,col,x,y,z,sx,sy,sz){
    const m=new T.Mesh(geo,material(col));m.position.set(x,y,z);m.scale.set(sx,sy,sz);
    m.castShadow=m.receiveShadow=true;g.add(m);return m;
  }
  function beam(g,a,b,r,col){
    const start=new T.Vector3(...a),end=new T.Vector3(...b),dir=end.clone().sub(start);
    const m=mesh(g,new T.CylinderGeometry(.78,1,1,10),col,0,0,0,r,dir.length(),r);
    m.position.copy(start.lerp(end,.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());return m;
  }
  function sign(g,text,x,y,z,w,h){
    if(!labels.has(text)){
      const c=document.createElement('canvas');c.width=384;c.height=96;const p=c.getContext('2d');
      p.fillStyle='#254149';p.fillRect(0,0,384,96);p.strokeStyle='#79c8b0';p.lineWidth=7;p.strokeRect(4,4,376,88);
      p.font='600 40px "Microsoft YaHei",sans-serif';p.textAlign='center';p.textBaseline='middle';p.fillStyle='#fff2d1';p.fillText(text,192,50,355);
      const tex=new T.CanvasTexture(c);tex.encoding=T.sRGBEncoding;
      labels.set(text,new T.MeshBasicMaterial({map:tex,side:T.DoubleSide,toneMapped:false}));
    }
    const board=new T.Mesh(new T.PlaneGeometry(w,h),labels.get(text));board.position.set(x,y,z);g.add(board);
  }
  const enabled=()=>!!s?.active&&Number.isFinite(s.endsAt)&&s.endsAt>Date.now();
  function station(site,near,yAt,hazards,op,x,z,r){
    const root=new T.Group();root.position.set(x,yAt(x,z),z);near.add(root);
    const scale=op==='register'?1:KLOSE_ITEM_SCALE;
    root.scale.setScalar(scale);r*=scale;
    const item={root,site,near,x,z,op,r,reach:2.35+r};stations.push(item);
    if(r>.05)hazards.push({x:site.x+x,z:site.z+z,r});
    return item;
  }
  function register(site,near,yAt,hazards,x,z){
    const row=station(site,near,yAt,hazards,'register',x,z,.64),g=row.root;
    const keeper=seerRobots.create(0xc2dcdb,{name:'捕猎场管理员',castShadow:true});
    keeper.root.scale.setScalar(.90);keeper.root.rotation.y=Math.PI;g.add(keeper.root);row.keeper=keeper;
    const brim=mesh(g,new T.CylinderGeometry(1,1,.12,22),'#809f92',0,1.3,.12,.35,1,.35);
    brim.rotation.x=-.15;
    mesh(g,cube,'#436965',.86,.46,-.06,.09,.89,.10);
    sign(g,'捕猎场管理处',.86,1.1,0,1.27,.35);
    sign(g,'本次免费',.86,.78,.005,1.08,.22);
  }
  function rodStation(){
    const {site,near,yAt,hazards}=wet;
    const row=station(site,near,yAt,hazards,'rod',-2,-4.3,.43),g=row.root;
    mesh(g,cube,'#856443',0,.16,0,.75,.31,.41);mesh(g,cube,'#e6c86e',0,.322,0,.8,.065,.48);
    const rod=new T.Group();g.add(rod);row.rod=rod;
    const parts=[[-.25,.32,.12],[-.05,.62,.03],[.22,.96,.0],[.53,1.20,.03],[.74,1.28,.07]];
    for(let i=1;i<parts.length;i++)beam(rod,parts[i-1],parts[i],.038-i*.006,'#ba663f');
    beam(rod,parts[0],[-.11,.53,.06],.052,'#d4a16a');
    const reel=mesh(rod,new T.CylinderGeometry(1,1,1,20),'#687c7a',-.086,.58,.085,.065,.085,.065);
    reel.rotation.x=Math.PI/2;
    mesh(rod,round,'#dfc07f',-.086,.58,.134,.044,.044,.009);
    const guides=new T.TorusGeometry(.024,.004,6,16);
    for(let j=1;j<parts.length;j++){
      const [x,y,z]=parts[j],guide=mesh(rod,guides,'#ead4a3',x,y-.027,z,1,1,1);
      guide.rotation.y=.70;
      if(j>1)beam(rod,[parts[j-1][0],parts[j-1][1]-.027,parts[j-1][2]],[x,y-.027,z],.003,'#d4dfd6');
    }
    beam(rod,[.74,1.26,.07],[.74,.69,.07],.004,'#d4dfd6');
    mesh(rod,round,'#cd694e',.74,.72,.07,.042,.079,.04);
    mesh(rod,round,'#f8e4ae',.74,.757,.07,.039,.040,.038);
    sign(g,'普通钓竿',0,.18,.217,.64,.19);
    const bank=station(site,near,yAt,hazards,'fish',-5.5,-6,.54),b=bank.root;
    for(const side of [-1,1])beam(b,[side*.48,0,0],[side*.48,.85,0],.075,'#9c7455');
    sign(b,'垂钓区',0,.70,.05,1.13,.36);
    const float=mesh(b,round,'#ce723e',-1.42,.1,-.64,.067,.12,.067);
    bank.float=float;
  }
  function treeStation(){
    const {site,near,yAt,hazards}=wet;
    const node=station(site,near,yAt,hazards,'tree',6,-4,.77),trunk=new T.Group();node.root.add(trunk);node.branches=trunk;
    beam(trunk,[0,0,0],[-.15,1.4,.07],.34,'#854d76');
    // Flared turquoise hollows and bunched red fruit in the 2011 forest scene.
    const outline=[[.45,-.54],[.58,-.20],[.78,.16],[1,.39],[1.05,.51],[.91,.54],[.68,.34],[.12,.12]];
    const calyx=new T.LatheGeometry(outline.map(([r,h])=>new T.Vector2(r,h)),28);
    const rim=new T.TorusGeometry(.97,.066,8,28);
    for(const [x,y,z] of [[-.72,1.86,.1],[-.30,2.62,-.12],[.70,2.43,.24],[.94,1.93,-.40],[.17,2.97,.02]]){
      beam(trunk,[-.14,1.10,.02],[x,y,z],.21,'#6f529a');
      const cup=new T.Group();cup.position.set(x,y,z);cup.rotation.set(.12,-.17*x,-.33*x);trunk.add(cup);
      mesh(cup,calyx,'#503f96',0,0,0,.40,.65,.32);
      const lip=mesh(cup,rim,'#54cdd0',0,.33,0,.40,.32,.42);lip.rotation.x=-Math.PI/2;
      mesh(cup,round,'#317f9e',0,.095,0,.26,.035,.22);
      for(let j=0;j<7;j++){
        const a=j*2.40,r=.14*Math.sqrt(j/6);
        mesh(cup,round,j%3?'#bf395e':'#e65677',r*Math.cos(a),-.17+r*Math.sin(a),.25+j*.003,.079,.083,.070);
      }
      for(const side of [-1,1]){
        const bract=mesh(cup,round,'#dabe60',side*.080,-.015,.24,.037,.094,.031);bract.rotation.z=-side*.72;
      }
    }
    sign(node.root,'摇树区',0,.48,.39,.77,.24);
  }
  function denStation(){
    const {site,near,yAt,hazards}=wet;
    const node=station(site,near,yAt,hazards,'bear',-5,6,.82),g=node.root;node.crystals=[];
    mesh(g,new T.CylinderGeometry(.85,1,.28,14),'#7a6a4c',0,.12,0,1,.77,.88);
    for(let i=0;i<5;i++){
      const a=(i/4-.5)*2.4,x=.66*Math.sin(a),z=.42*Math.cos(a);
      const shard=new T.Mesh(new T.OctahedronGeometry(1),new T.MeshStandardMaterial({color:0x678489,emissive:0x246c78,roughness:.30}));
      shard.position.set(x,.37+.04*(i%2),z);shard.scale.set(.141,.27+.10*(i%2),.12);
      shard.rotation.z=-.30*Math.sin(a);g.add(shard);node.crystals.push(shard);
      const socket=mesh(g,new T.CylinderGeometry(1,.82,1,6),'#746657',x,.237,z,.176,.10,.159);
      socket.rotation.y=a;
    }
    sign(g,'闪光晶石',0,.139,.86,.77,.23);
  }
  function instantiate(site,near,yAt,hazards,cover){
    const start=stations.length;
    if(site.id==='grassland')register(site,near,yAt,hazards,-4,-14);
    else if(site.id==='wetland'&&!wet){
      wet={site,near,yAt,hazards,cover};register(site,near,yAt,hazards,1.45,2.2);
      rodStation();treeStation();denStation();
      setState(s);
    }
    for(const p of stations.slice(start)){
      const bounds=new T.Box3(),local=new T.Matrix4();
      p.root.updateWorldMatrix(true,true);const inverse=p.root.matrixWorld.clone().invert();
      p.root.traverse(part=>{
        if(!part.isMesh)return;
        const geo=part.geometry;if(!geo.boundingBox)geo.computeBoundingBox();
        local.multiplyMatrices(inverse,part.matrixWorld);
        bounds.union(geo.boundingBox.clone().applyMatrix4(local));
      });
      p.top=bounds.max.y*p.root.scale.y;
      p.overhang=Math.hypot(Math.max(-bounds.min.x,bounds.max.x),Math.max(-bounds.min.z,bounds.max.z))*p.root.scale.x;
    }
  }
  function clear(x,z,r,size,actor){
    if(!wet||Math.hypot(x,z)<1.05+r)return false;
    const gx=wet.site.x+x,gz=wet.site.z+z;
    if(wet.hazards.some(h=>Math.hypot(gx-h.x,gz-h.z)<r+h.r))return false;
    if(pools.some(p=>Math.hypot((gx-p.x)/(p.rx+r),(gz-p.z)/(p.rz+r))<1.06))return false;
    if(!kloseClearsCover(wet.cover,x,z,r,size+.15))return false;
    if(guest&&guest!==actor&&Math.hypot(guest.x-x,guest.z-z)<guest.r+r)return false;
    return actors.every(p=>p===actor||Math.hypot(p.x-x,p.z-z)>=p.r+r);
  }
  function locate(x,z,model){
    for(let j=0;j<=14;j++)for(let k=0,n=Math.max(1,8*j);k<n;k++){
      const a=k*2*Math.PI/n,dx=x+Math.cos(a)*j*.38,dz=z+Math.sin(a)*j*.38;
      if(clear(dx,dz,model.radius,model.size,null))return {x:dx,z:dz};
    }
    return null;
  }
  function createActor(id,originX,originZ,method,level){
    const model=createFieldSpirit(T,id);if(!model)return null;
    const spot=locate(originX,originZ,model);
    if(!spot){model.dispose();return null;}
    const {x,z}=spot;
    const actor={...model,id,key:'wetland-hunt-'+method+'-'+id,method,level:level||8,r:model.radius,x,z,homeX:x,homeZ:z,yaw:0};
    model.root.userData.safariKey=actor.key;wet.near.add(model.root);place(actor,0);return actor;
  }
  function place(p,bob){
    p.at=move(wet.site.lat,wet.site.lon,p.x,-p.z);
    p.root.position.set(p.x,wet.yAt(p.x,p.z)+groundCorrection(p.at.lat,p.at.lon)+bob+.004,p.z);p.root.rotation.y=p.yaw;
  }
  function buildField(){
    if(actors.length||!wet)return;
    for(const [i,id] of fieldIds.entries()){
      const [x,z]=anchors[i],p=createActor(id,x,z,'field',7+i%5);if(!p)continue;
      p.yaw=i*2.4;actors.push(p);
    }
  }
  function dropGuest(){
    if(guest){wet.near.remove(guest.root);guest.dispose();guest=null;}
    guestKey='';
  }
  function syncGuest(viewer){
    const encounter=s?.encounter,pet=encounter?.pet,method=encounter?.method;
    if(!pet||method==='field'){if(guest)dropGuest();return;}
    const key=method+'-'+pet.speciesId;if(guestKey===key)return;
    dropGuest();
    const point=method==='fish'?[-6.6,-7.4]:method==='tree'?[5.0,-3.6]:method==='bear'?[-4.0,5.4]:
      [viewer.x-wet.site.x+1.1,viewer.z-wet.site.z-1.6];
    guest=createActor(pet.speciesId,point[0],point[1],method,pet.level);
    if(guest)guestKey=key;
  }
  function setState(state){
    s=state||null;
    if(!s?.encounter&&guest)dropGuest();
    if(!enabled()){stepOrigin=null;strides=0;stepGoal=12;}
    if(!wet)return;
    for(const marker of stations){
      if(marker.rod)marker.rod.visible=!s?.rod;
      if(marker.crystals)for(const [i,gem] of marker.crystals.entries()){
        gem.material.color.setHex((s?.crystals||0)>i?0x67d6dc:0x657279);
        gem.material.emissiveIntensity=(s?.crystals||0)>i?.9:.05;
      }
    }
    if(enabled()){
      buildField();
      for(const p of actors)if(s.fieldRest?.[p.id]>Date.now())p.root.visible=false;
    }else{for(const p of actors)p.root.visible=false;dropGuest();}
  }
  function patrol(p,i,dt,viewer,boat){
    if(s.fieldRest?.[p.id]>Date.now()){p.root.visible=false;return;}
    const visible=p.id!==164||clock%57<10||s?.encounter?.pet?.speciesId===164;
    p.root.visible=visible;if(!visible)return;
    const busy=s?.encounter?.method==='field'&&s.encounter.pet?.speciesId===p.id;
    const targetX=p.homeX+2.1*Math.sin(.26*clock+i*2.71),targetZ=p.homeZ+1.55*Math.sin(.34*clock+i*1.66);
    const dx=busy?viewer.x-wet.site.x-p.x:targetX-p.x,dz=busy?viewer.z-wet.site.z-p.z:targetZ-p.z;
    const angular=Math.atan2(Math.sin(Math.atan2(dx,dz)-p.yaw),Math.cos(Math.atan2(dx,dz)-p.yaw));
    p.yaw+=T.MathUtils.clamp(angular,-dt*3.1,dt*3.1);
    const stride=Math.min(.52*dt,Math.hypot(dx,dz)),x=p.x+stride*Math.sin(p.yaw),z=p.z+stride*Math.cos(p.yaw);
    const gx=wet.site.x+x,gz=wet.site.z+z;
    const walk=!busy&&Math.abs(angular)<.19&&clear(x,z,p.r,p.size,p)&&Math.hypot(viewer.x-gx,viewer.z-gz)>p.r+.36&&
      (!boat||Math.hypot(boat.x-gx,boat.z-gz)>9+p.r);
    if(walk){p.x=x;p.z=z;}
    p.update(dt,walk?1:0);place(p,walk?.032*Math.abs(Math.sin(clock*6+i)):0);
  }
  function update(dt,viewer,boat){
    clock+=dt;
    for(const row of stations){
      if(!row.near.visible)continue;
      if(row.keeper)seerRobots.animate(row.keeper,0,0,dt);
      if(row.float)row.float.position.y=.14+.036*Math.sin(clock*2.9);
      if(row.branches)row.branches.rotation.z=s?.encounter?.method==='tree'?.034*Math.sin(clock*4.9):.004*Math.sin(clock*.9);
    }
    if(!wet||!wet.near.visible){stepOrigin=null;return;}
    if(!enabled()){for(const p of actors)p.root.visible=false;if(guest)dropGuest();return;}
    buildField();
    const at=viewer||wet.site;syncGuest(at);
    actors.forEach((p,i)=>patrol(p,i,dt,at,boat));
    if(guest){
      const toward=Math.atan2(at.x-wet.site.x-guest.x,at.z-wet.site.z-guest.z)-guest.yaw;
      guest.yaw+=T.MathUtils.clamp(Math.atan2(Math.sin(toward),Math.cos(toward)),-3.2*dt,3.2*dt);
      guest.update(dt);
      place(guest,guest.method==='tree'?.21+.04*Math.sin(clock*3):0);
    }
  }
  function walked(lat,lon){
    const here=chart(lat,lon);
    if(!enabled()||!wet||s.encounter||Math.hypot(here.x-wet.site.x,here.z-wet.site.z)>48){
      stepOrigin=null;return null;
    }
    const step=stepOrigin?Math.hypot(here.x-stepOrigin.x,here.z-stepOrigin.z):0;
    stepOrigin=here;
    if(step>2.0){strides=0;return null;}
    strides+=step;
    if(strides<stepGoal)return null;
    strides=0;stepGoal=14+(++sequence%4)*2;return {op:'random',site:'wetland',label:'草间传来动静'};
  }
  function choose(rows,caster,lat,lon,limit,personal=false){
    const at=chart(lat,lon);let best=null,score=Infinity;
    for(const a of rows){
      if(!a.near.visible||!a.root.visible)continue;
      const d=Math.hypot(at.x-a.site.x-a.x,at.z-a.site.z-a.z);
      if(d>limit||(!caster&&personal&&d>(a.reach||3.25)))continue;
      const rank=caster?caster.intersectObject(a.root,true)[0]?.distance:d;
      if(rank!==undefined&&rank<score){best=a;score=rank;}
    }
    return best;
  }
  function activePets(){
    return enabled()&&wet?[...actors,...(guest?[guest]:[])].filter(p=>p.root.visible):[];
  }
  function petRows(){
    return activePets().map(p=>({p,site:wet.site,near:wet.near,x:p.x,z:p.z,root:p.root,reach:p.r+2.5}));
  }
  function contact(p,lat,lon){
    const at=chart(lat,lon);
    const species=SEER_SPIRIT_DATA.index.find(r=>r[0]===p.id);
    return {id:p.key,key:p.key,speciesId:p.id,name:species?.[1]||'捕猎场精灵',kind:'safari',method:p.method,siteId:'wetland',
      level:s?.encounter?.pet?.speciesId===p.id?s.encounter.pet.level:p.level,size:p.size,visible:true,lat:p.at.lat,lon:p.at.lon,
      distance:Math.hypot(at.x-wet.site.x-p.x,at.z-wet.site.z-p.z),focusPoint:p.root.localToWorld(new T.Vector3(0,p.size*.5,0))};
  }
  function observe(lat,lon,key){
    const p=choose(key?petRows().filter(r=>r.p.key===key):petRows(),null,lat,lon,22);
    return p?contact(p.p,lat,lon):null;
  }
  function pick(caster,lat,lon){
    const r=choose(petRows(),caster,lat,lon,22);return r?contact(r.p,lat,lon):null;
  }
  function action(caster,lat,lon){
    const on=enabled(),all=stations.filter(a=>{
      if(a.op==='register')return !on||a.site.id==='wetland';
      if(!on||s.encounter||a.site.id!=='wetland')return false;
      if(a.op==='rod')return !s.rod;
      if(a.op==='bear')return s.crystals>=5;
      if(a.op==='fish')return s.rod;
      return true;
    });
    const target=choose(s?.encounter?all:[...all,...petRows()],caster,lat,lon,caster?16:4,true);
    if(!target)return null;
    if(target.p)return {op:'field',speciesId:target.p.id,site:'wetland',label:'接触'+(SEER_SPIRIT_DATA.index.find(r=>r[0]===target.p.id)?.[1]||'精灵')};
    const op=target.op==='register'?(on?'exit':'enter'):target.op;
    const labels={enter:'报名捕猎 · 免费体验',exit:'结束本次捕猎',rod:'拾取普通钓竿',fish:'在湖边垂钓',tree:'摇动捕猎树',bear:'用五颗晶石引出汤尼熊'};
    return {op,site:'wetland',label:labels[op],destination:op==='enter'&&target.site.id==='grassland'?'wetland':null};
  }
  function hint(lat,lon){
    const at=chart(lat,lon);
    if(!wet||Math.hypot(at.x-wet.site.x,at.z-wet.site.z)>44)return '';
    if(!enabled())return '湿地捕猎场 · 在入口管理员旁报名';
    const here=action(null,lat,lon);
    if(here)return here.label+'　／　E';
    return '捕猎场 · 岸边垂钓，紫蓝果树下摇树，晶石巢可召来汤尼熊';
  }
  function obstacles(){
    return activePets().map(p=>({x:wet.site.x+p.x,z:wet.site.z+p.z,r:p.r,top:surface.height(p.at.lat,p.at.lon)+p.size}));
  }
  function obstacleTop(x,z,r){
    let top=-Infinity;
    for(const p of stations){
      if(Math.hypot(x-p.site.x-p.x,z-p.site.z-p.z)>r+p.overhang)continue;
      const coordinate=move(p.site.lat,p.site.lon,p.x,-p.z);
      top=Math.max(top,surface.height(coordinate.lat,coordinate.lon)+p.top);
    }
    for(const p of obstacles())if(Math.hypot(x-p.x,z-p.z)<r+p.r)top=Math.max(top,p.top);
    return top;
  }
  return {instantiate,setState,update,walked,action,hint,observe,pick,obstacles,obstacleTop};
}
