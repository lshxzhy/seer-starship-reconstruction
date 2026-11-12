// Classic ocean encounters use the map names and the playable species' original numbers.
const OCEAN_HABITATS={
  'ocean-shallows':{name:'海洋星浅水区',animals:[30]},
  'ocean-depths':{name:'海洋星深水区',animals:[33]},
  'ocean-floor':{name:'海洋星海底',animals:[34]}
};

// The figure faces local +Z. Sized to 46 and 64 cm from the numbered catalogue.
function createOceanShark(T,id){
  if(id!==33&&id!==34)return null;
  const young=id===33,root=new T.Group(),sized=new T.Group(),body=new T.Group(),tail=new T.Group();
  root.add(sized);sized.add(body);body.add(tail);
  const sphere=new T.SphereGeometry(1,28,18),geometries=new Set([sphere]),materials=new Map();
  const dark=0x404248,belly=young?0xe9f7fb:0xb3e8ed;
  const v=(x,y,z)=>new T.Vector3(x,y,z);
  function paint(hex){
    if(!materials.has(hex))materials.set(hex,new T.MeshStandardMaterial({color:new T.Color(hex).convertSRGBToLinear(),roughness:.48,side:T.DoubleSide}));
    return materials.get(hex);
  }
  function piece(geom,color,parent=body){
    geometries.add(geom);const m=new T.Mesh(geom,paint(color));m.castShadow=m.receiveShadow=true;parent.add(m);return m;
  }
  function oval(color,x,y,z,w,h,d,parent=body){
    const m=piece(sphere,color,parent);m.position.set(x,y,z);m.scale.set(w,h,d);return m;
  }
  function stroke(color,points,r,parent=body){
    const curve=new T.CatmullRomCurve3(points.map(p=>v(...p)));
    return piece(new T.TubeGeometry(curve,16,r,8,false),color,parent);
  }
  // z, half width, half height, centre height. Belly and dark hood share one continuous skin.
  const profile=young?[
    [-.49,.016,.025,0],[-.42,.18,.22,0],[-.27,.32,.34,0],[-.04,.39,.40,.015],
    [.16,.36,.36,.01],[.32,.26,.26,.00],[.405,.12,.14,-.005],[.432,.01,.012,-.01]
  ]:[
    [-.94,.026,.052,.025],[-.77,.072,.099,.025],[-.52,.18,.175,.00],[-.27,.286,.25,.01],
    [.02,.34,.315,.014],[.29,.31,.28,.031],[.52,.225,.19,.027],[.67,.096,.095,.006],[.705,.012,.015,0]
  ];
  const skin=new T.BufferGeometry(),verts=[],indices=[],colors=[];
  const upper=new T.Color(dark).convertSRGBToLinear(),lower=new T.Color(belly).convertSRGBToLinear();
  const grey=new T.Color(young?0x737670:0x55595b).convertSRGBToLinear();
  const span=new T.CatmullRomCurve3(profile.map(([z,rx,ry])=>v(rx,ry,z)),false,'centripetal');
  const rings=52,arc=22;
  const samples=Array.from({length:rings+1},(_,i)=>{
    const t=i/rings,point=span.getPoint(t),f=t*(profile.length-1),ix=Math.floor(f);
    return {z:point.z,x:point.x,y:point.y,cy:T.MathUtils.lerp(profile[ix][3],profile[Math.min(ix+1,profile.length-1)][3],f-ix)};
  });
  function sideAt(y,z){
    const i=samples.findIndex(s=>s.z>=z),p=samples[Math.max(i-1,0)],q=samples[Math.max(i,0)];
    const u=p===q?0:(z-p.z)/(q.z-p.z),rx=T.MathUtils.lerp(p.x,q.x,u),ry=T.MathUtils.lerp(p.y,q.y,u);
    return rx*Math.sqrt(Math.max(0,1-((y-T.MathUtils.lerp(p.cy,q.cy,u))/ry)**2));
  }
  for(let stripe=0;stripe<3;stripe++){
    const offset=verts.length/3;
    for(const [i,{z,x:rx,y:ry,cy}] of samples.entries()){
      const brow=young?.22+.32*Math.max(0,z/.43):.02+.42*Math.max(0,z/.71);
      const cheek=young?.68*Math.exp(-(((z-.08)/.14)**2)):.43*Math.exp(-(((z-.17)/.115)**2));
      const cut=Math.asin(T.MathUtils.clamp(brow-cheek,-.85,.85)),rim=cut+.105;
      // Split the three strips at the actual height of the cheek in each ring.
      // This keeps the curved hood edge smooth across the snout.
      for(let j=0;j<=arc;j++){
        const u=j/arc;
        const a=stripe===0?T.MathUtils.lerp(rim,Math.PI-rim,u):
          stripe===1?T.MathUtils.lerp(Math.PI-rim,Math.PI-cut,u):T.MathUtils.lerp(Math.PI-cut,Math.PI*2+cut,u);
        verts.push(rx*Math.cos(a),cy+ry*Math.sin(a),z);
        const shade=stripe===0?upper:stripe===1?grey:lower;colors.push(shade.r,shade.g,shade.b);
        if(i<rings&&j<arc){const k=offset+i*(arc+1)+j;indices.push(k,k+1,k+arc+1,k+1,k+arc+2,k+arc+1);}
      }
    }
  }
  // Mirror the narrow hood rim on the opposite flank.
  const start=verts.length/3;
  for(let i=0;i<=rings;i++){
    const j=(rings+1)*(arc+1)+i*(arc+1);
    for(const k of [j,j+arc]){verts.push(-verts[3*k],verts[3*k+1],verts[3*k+2]);colors.push(grey.r,grey.g,grey.b);}
    if(i<rings){const k=start+2*i;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
  }
  skin.setIndex(indices);skin.setAttribute('position',new T.Float32BufferAttribute(verts,3));skin.setAttribute('color',new T.Float32BufferAttribute(colors,3));skin.computeVertexNormals();
  const hull=piece(skin,0xffffff);hull.material=hull.material.clone();hull.material.vertexColors=true;materials.set('skin',hull.material);
  function fin(points,color,thickness,parent=body){
    const outline=points.map(p=>v(...p)),centre=v(0,0,0);for(const p of outline)centre.add(p);centre.multiplyScalar(1/outline.length);
    const normal=v(0,0,0).crossVectors(outline[1].clone().sub(outline[0]),outline[2].clone().sub(outline[0])).normalize();
    const front=centre.clone().addScaledVector(normal,thickness),back=centre.clone().addScaledVector(normal,-thickness);
    const pts=[...outline,front,back],idx=[],n=outline.length;
    for(let i=0;i<n;i++){const j=(i+1)%n;idx.push(n,i,j,n+1,j,i);}
    const g=new T.BufferGeometry().setFromPoints(pts);g.setIndex(idx);g.computeVertexNormals();return piece(g,color,parent);
  }
  const flippers=[];
  if(young){
    for(const [z,y,w,h] of [[.01,.30,.20,.295],[-.24,.22,.13,.17]]){
      const crown=oval(0x558ebc,0,y,z,.135,h,w);
      const accent=new T.Color(0x9cd8f9).convertSRGBToLinear(),base=new T.Color(0x4b92c5).convertSRGBToLinear();
      const g=sphere.clone(),c=[];geometries.add(g);
      const points=g.attributes.position;
      for(let j=0;j<points.count;j++){
        const band=Math.cos(9.8*(points.getZ(j)*.58+points.getY(j)*.49));const shade=band>.18?accent:base;c.push(shade.r,shade.g,shade.b);
      }
      g.setAttribute('color',new T.Float32BufferAttribute(c,3));crown.material=hull.material;crown.geometry=g;
    }
    for(const s of [-1,1]){
      const paddle=oval(dark,s*.307,-.117,-.02,.105,.094,.21);paddle.rotation.y=s*.58;flippers.push(paddle);
      oval(0xe2fbfa,s*.35,-.13,-.006,.076,.024,.15);
      const eye=new T.Group();eye.position.set(s*sideAt(.11,.29),.11,.29);eye.rotation.y=s*.87;body.add(eye);
      oval(0x474952,0,0,0,.115,.147,.036,eye);oval(0xf7fbf6,0,0,.021,.103,.134,.031,eye);
      oval(0x5b9eb5,0,0,.041,.075,.100,.025,eye);oval(0x1f3136,0,.005,.060,.039,.065,.019,eye);
      oval(0xffffff,-.019,.043,.080,.016,.021,.009,eye);
      // The light dash follows the turning forehead on the original portrait.
      stroke(0xa2a29e,[[s*sideAt(.198,.34),.198,.34],[s*sideAt(.210,.302),.210,.302],[s*sideAt(.218,.268),.218,.268]],.008);
    }
    stroke(0x373640,[[-.073,.031,.424],[-.046,.014,.431],[0,.001,.438],[.046,.011,.432],[.073,.035,.424]],.009);
    tail.position.set(0,-.034,-.411);
    for(const s of [-1,1]){
      const fluke=oval(dark,s*.091,0,-.082,.09,.053,.114,tail);fluke.rotation.y=-s*.40;
    }
  }else{
    fin([[0,.25,.14],[0,.58,-.20],[0,.65,-.43],[0,.41,-.38],[0,.225,-.25]],dark,.042);
    fin([[0,.13,-.47],[0,.31,-.65],[0,.325,-.73],[0,.11,-.65]],dark,.022);
    for(const s of [-1,1]){
      const f=fin([[s*.18,-.07,.03],[s*.37,-.13,-.015],[s*.67,-.258,-.32],[s*.59,-.29,-.405],[s*.29,-.19,-.29]],dark,.040);
      flippers.push(f);
      const eye=new T.Group();eye.position.set(s*sideAt(.09,.437),.09,.437);eye.rotation.y=s*1.17;body.add(eye);
      oval(0x42484c,0,0,0,.115,.083,.025,eye);oval(0xe7f7f4,0,0,.014,.104,.074,.023,eye);
      oval(0x5c8091,0,.016,.029,.051,.050,.015,eye);oval(0x17242b,0,.021,.040,.032,.037,.012,eye);
      oval(0xfcffff,-.009,.035,.051,.010,.013,.005,eye);
      const cheekLine=(color,points,r)=>stroke(color,points.map(([y,z])=>[s*(sideAt(y,z)+.004),y,z]),r);
      cheekLine(dark,[[.092,.551],[.135,.486],[.155,.42],[.151,.34]],.016);
      cheekLine(0xac6970,[[-.023,.698],[-.034,.651],[-.061,.585],[-.100,.478]],.009);
      for(let i=0;i<3;i++)cheekLine(0x934c58,[[.023,.19-i*.048],[-.031,.171-i*.048],[-.083,.127-i*.048]],.006);
      fin([[s*.36,-.175,-.154],[s*.57,-.260,-.345],[s*.53,-.250,-.327],[s*.40,-.194,-.182]],0xbac1c3,.004,f);
    }
    tail.position.set(0,.026,-.88);
    fin([[0,.01,.12],[0,.18,-.02],[0,.41,-.24],[0,.40,-.30],[0,.13,-.27],[0,.02,-.15],[0,-.16,-.28],[0,-.23,-.21],[0,-.12,-.04]],dark,.035,tail);
  }
  const bounds=new T.Box3().setFromObject(body),height=young?.46:.64,scale=height/(bounds.max.y-bounds.min.y);
  sized.scale.setScalar(scale);sized.position.y=-bounds.min.y*scale;
  let clock=0;
  return {root,update(dt,effort=0){
    clock+=dt;tail.rotation.y=(young?.24:.34)*Math.sin(clock*(3.2+effort*2));
    for(const [i,fin] of flippers.entries())fin.rotation.z=(i?1:-1)*.09*Math.sin(clock*2.7);
    body.rotation.z=.025*Math.sin(clock*1.9);
  },dispose(){for(const g of geometries)g.dispose();for(const m of materials.values())m.dispose();}};
}

function createOceanEcology(T,parent,definition,surface){
  const schools=[
    ['ocean-shallows',30,5,-3.4,-5.2],['ocean-shallows',30,6,5.6,-4.4],
    ['ocean-depths',33,15,-3.6,-6.8],['ocean-depths',33,16,5.9,-4.1],
    [SPT_CHALLENGES.get(34).site,34,SPT_CHALLENGES.get(34).level,0,-8.1],
    ['ocean-shallows',108,16,6.1,5.8],['ocean-depths',108,16,-7.5,3.4],['ocean-floor',108,16,6.8,3.9]
  ];
  const names={30:'贝尔',33:'利牙鱼',34:'钢牙鲨',108:'布鲁'};
  const nodes=schools.map(([siteId,id,level,x,z],i)=>{
    const site=definition.sites.find(s=>s.id===siteId),model=createFieldSpirit(T,id);
    const anchor=new T.Group(),turn=new T.Group();anchor.add(turn);turn.add(model.root);parent.add(anchor);
    const key=siteId+'-'+id+'-'+i;anchor.userData.oceanSpirit=key;anchor.visible=false;
    // Reserve a real footprint for the first pose as well as its patrol.
    let at=surface.move(site.lat,site.lon,x,-z);
    if(!surface.canSwim(at.lat,at.lon,model.radius)){
      let found=false;
      for(let ring=1;ring<=10&&!found;ring++)for(let k=0;k<ring*8;k++){
        const a=k*Math.PI*2/(ring*8),ix=x+ring*.50*Math.cos(a),iz=z+ring*.50*Math.sin(a);
        const candidate=surface.move(site.lat,site.lon,ix,-iz);
        if(surface.canSwim(candidate.lat,candidate.lon,model.radius)){x=ix;z=iz;at=candidate;found=true;break;}
      }
    }
    const radius=id===34?2.6:id===30?1.15:1.68,t=1.69*i;
    return {site,model,anchor,turn,key,id,level,radius,cx:x-radius*Math.sin(t),cz:z-radius*.65*Math.cos(t),
      ix:x,iz:z,at,yaw:.5*i,t,rest:0,sign:1,blocked:0,age:t};
  });
  const sites=Object.keys(OCEAN_HABITATS),interval=75,rareWindow=45;
  let lastVisitor=null;
  function wetDistance(a,b){return kloseDisplacement(a,b,definition.radius).distance;}
  function update(lat,lon,dt,walking=true){
    lastVisitor={lat,lon};
    const now=Date.now(),cycle=now/1000,rareSite=sites[Math.floor(cycle/interval)%sites.length];
    for(const p of nodes){
      const active=walking&&wetDistance(p.site,lastVisitor)<46&&p.rest<=now&&
        (p.id!==108||(p.site.id===rareSite&&cycle%interval<rareWindow));
      p.anchor.visible=active;if(!active)continue;
      const cadence=p.id===34?.39:p.id===30?.47:.82,steps=Math.max(1,Math.ceil(dt/.06)),sub=dt/steps;
      let distanceMoved=0;p.age+=dt;
      for(let i=0;i<steps&&sub>0;i++){
        const tangent=Math.atan2(p.sign*Math.cos(p.t),-p.sign*.65*Math.sin(p.t));
        const bend=Math.atan2(Math.sin(tangent-p.yaw),Math.cos(tangent-p.yaw));
        p.yaw+=T.MathUtils.clamp(bend,-2.6*sub,2.6*sub);
        const alignment=Math.max(0,Math.cos(tangent-p.yaw));
        if(alignment<.5)continue;
        const t=p.t+sub*cadence*p.sign*alignment*alignment;
        const nextX=p.cx+p.radius*Math.sin(t),nextZ=p.cz+p.radius*.65*Math.cos(t);
        const candidate=surface.move(p.site.lat,p.site.lon,nextX,-nextZ);
        const oldDistance=wetDistance(lastVisitor,p.at),newDistance=wetDistance(lastVisitor,candidate);
        const clear=nodes.every(other=>{
          if(other===p||!other.anchor.visible||other.site!==p.site)return true;
          const distance=wetDistance(other.at,candidate);
          return distance>=p.model.radius+other.model.radius||distance>wetDistance(other.at,p.at);
        });
        if(clear&&(newDistance>.36+p.model.radius||newDistance>=oldDistance)&&surface.canSwim(candidate.lat,candidate.lon,p.model.radius)){
          distanceMoved+=Math.hypot(nextX-p.ix,nextZ-p.iz);
          p.ix=nextX;p.iz=nextZ;p.at=candidate;p.t=t;p.blocked=0;
        }else if((p.blocked+=sub)>.65){
          p.sign=-p.sign;p.blocked=0;
        }
      }
      const offset=p.id===30?.09+.03*Math.sin(p.age):.7+.16*Math.sin(1.7*p.age);
      p.anchor.position.copy(surface.point(p.at.lat,p.at.lon,offset));
      p.anchor.quaternion.copy(surface.frame(p.at.lat,p.at.lon).quaternion);
      p.turn.rotation.y=p.yaw;p.model.update(dt,dt?Math.min(1,distanceMoved/(dt*p.radius*cadence)):0);
      p.anchor.updateMatrixWorld(true);
    }
  }
  function record(p,lat,lon){
    return {id:p.key,key:p.key,speciesId:p.id,name:names[p.id],size:p.model.size,siteId:p.site.id,level:p.level,
      kind:p.id===34?'boss':p.id===108?'rare':'wild',visible:true,fieldLock:'',
      portraitBearing:p.id===34?Math.PI-p.yaw+.9:undefined,
      lat:p.at.lat,lon:p.at.lon,distance:wetDistance({lat,lon},p.at),focusPoint:p.anchor.localToWorld(new T.Vector3(0,p.model.size*.52,0))};
  }
  function spiritObservation(lat,lon,key){
    let closest=null;
    for(const p of nodes){
      if(!p.anchor.visible||key&&p.key!==key)continue;
      const found=record(p,lat,lon);if(found.distance<=40&&(!closest||found.distance<closest.distance))closest=found;
    }
    return closest;
  }
  function pickSpirit(caster,lat,lon){
    const nearby=nodes.filter(p=>p.anchor.visible&&wetDistance({lat,lon},p.at)<=22);
    const hit=caster.intersectObjects(nearby.map(p=>p.anchor),true)[0];
    let n=hit?.object;while(n&&!n.userData.oceanSpirit)n=n.parent;
    return n?spiritObservation(lat,lon,n.userData.oceanSpirit):null;
  }
  function withdrawSpirit(key){
    const p=nodes.find(p=>p.key===key);if(!p)return false;
    p.rest=Date.now()+60000;p.anchor.visible=false;return true;
  }
  function hint(lat,lon){
    if(!lastVisitor)return '';
    const blu=nodes.find(p=>p.id===108&&p.anchor.visible&&wetDistance(p.at,{lat,lon})<30);
    return blu?'稀有信号 · 布鲁正在附近游动':'';
  }
  function clearWalker(point,radius){
    for(const p of nodes){
      if(!p.anchor.visible)continue;
      const centre=surface.chart(p.at.lat,p.at.lon),dx=point.x-centre.x,dz=point.z-centre.z;
      const d=Math.hypot(dx,dz),separation=p.model.radius+radius;
      if(d<separation){
        point.x=centre.x+separation*(d?dx/d:1);
        point.z=centre.z+separation*(d?dz/d:0);
      }
    }
  }
  return {update,clearWalker,spiritObservation,nearbySpirit:(lat,lon)=>spiritObservation(lat,lon),pickSpirit,withdrawSpirit,hint,
    dispose(){for(const p of nodes){parent.remove(p.anchor);p.model.dispose();}}};
}
