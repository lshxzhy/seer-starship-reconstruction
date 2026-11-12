// Interaction anchors use the same authored charts as the original map props.
// These are the three known ore/gas sites, not every decorative crystal.
function createFieldWorksites(T,world,definition,surface,getPack,collect){
  const root=new T.Group();root.name=definition.name+' · 资源采集';world.add(root);
  const geometry=new T.TorusGeometry(.74,.035,8,40),particleGeometry=new T.SphereGeometry(.055,8,6);
  const ore=new T.MeshBasicMaterial({color:0xffd267,transparent:true,opacity:.7,depthWrite:false});
  const gas=new T.MeshBasicMaterial({color:0x8be8ef,transparent:true,opacity:.55,depthWrite:false});
  const nodes=[];
  for(const [id,spec] of Object.entries(FIELD_DEPOSITS)){
    if(spec.planet!==definition.id)continue;
    const at=definition.layout.fromXZ(spec.x,spec.z),anchor=new T.Group();root.add(anchor);
    anchor.position.copy(surface.point(at.lat,at.lon,(surface.groundCorrection?.(at.lat,at.lon)||0)+.10));
    anchor.quaternion.copy(surface.frame(at.lat,at.lon).quaternion);
    const ring=new T.Mesh(geometry,spec.tool==='gas'?gas:ore);ring.rotation.x=-Math.PI/2;anchor.add(ring);
    const particles=[];
    for(let i=0;i<12;i++){const p=new T.Mesh(particleGeometry,spec.tool==='gas'?gas:ore);p.visible=false;anchor.add(p);particles.push(p);}
    nodes.push({id,...spec,at,anchor,ring,particles});
  }
  let active=null,elapsed=0,clock=0,origin=null;
  const displacement=(a,b)=>surfaceDisplacement(a,b,definition.radius);
  function nearest(at,limit=6){
    let result=null,best=limit;
    for(const node of nodes){const d=displacement(at,node.at);if(d.distance<best){best=d.distance;result={...node,bearing:Math.atan2(-d.east,d.north)};}}
    return result;
  }
  function start(at,heading){
    const node=nearest(at,4.6),pack=getPack();
    if(!node)return {ok:false,message:'请靠近黄晶矿露头或甲烷气泡泉。'};
    if(pack.fieldSamples.includes(node.id))return {ok:false,message:node.name+'标本已采集，可在背包查看并送往动力室。'};
    if(pack.handTool!==node.tool)return {ok:false,message:'请在背包 B 装备'+(node.tool==='gas'?'气体收集器':'挖矿钻头')+'。'};
    if(Math.cos(node.bearing-heading)<.25)return {ok:false,message:'请面向'+node.name+'采集点再按 E。'};
    if(active)return {ok:false,message:'采集中，稍候；移动或按 Esc 可取消。'};
    active=node;elapsed=0;origin={...at};return {ok:true,message:'正在采集'+node.name+' · 保持站位'};
  }
  function cancel(){active=null;elapsed=0;origin=null;}
  function update(at,dt,enabled,heading){
    clock+=dt;root.visible=enabled;
    const pack=getPack();let outcome=null;
    if(active){
      const target=displacement(at,active.at),moved=displacement(origin,at).distance;
      const bearing=Math.atan2(-target.east,target.north);
      if(!enabled||target.distance>4.8||moved>.55||pack.handTool!==active.tool||Math.cos(bearing-heading)<.1){cancel();outcome={message:'采集已取消，未消耗材料。'};}
      else if((elapsed+=dt)>=2.2){
        const result=collect(active.id);outcome={message:result.message};cancel();
      }
    }
    for(const node of nodes){
      node.anchor.visible=enabled&&displacement(at,node.at).distance<75;
      const used=pack.fieldSamples.includes(node.id);node.ring.visible=!used;
      const busy=active?.id===node.id;
      node.ring.scale.setScalar(1+.07*Math.sin(clock*3));
      for(let i=0;i<node.particles.length;i++){
        const p=node.particles[i],t=(clock*(busy?1.8:.4)+i/12)%1;
        p.visible=!used&&(busy||node.tool==='gas');
        p.position.set(Math.sin(i*2.4)*.4*(1-t),.1+t*(busy?1.2:.8),Math.cos(i*2.4)*.4*(1-t));
        p.scale.setScalar(node.tool==='gas'?1+t*.6:.45);
      }
    }
    return outcome;
  }
  return {start,cancel,update,hide(){root.visible=false;cancel();},get working(){return active?.tool||null;},
    label(at){if(active)return '采集'+active.name+' '+Math.round(elapsed/2.2*100)+'%';
      const n=nearest(at);if(!n)return '';return getPack().fieldSamples.includes(n.id)?n.name+' · 已采集':'采集'+n.name+' · E';},
    target(at){return nearest(at,4.6);},
    dispose(){world.remove(root);geometry.dispose();particleGeometry.dispose();ore.dispose();gas.dispose();}};
}
