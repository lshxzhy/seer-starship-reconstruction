// Original cloth IDs: gas collector 100055; diving suit 5 = 100024/25/26.
// The dive suit has a fin cap, paired hand rudders and a belt, not a human helmet.
function createFieldEquipment(T,rig){
  const group=new T.Group();group.name='作业装备 · 潜水与采气';rig.bones.core.add(group);
  const diving=new T.Group(),gas=new T.Group();group.add(diving,gas);
  const geometries=new Set(),materials=new Set(),rudders=[],bubbles=[];
  function mat(color,metalness=.2,roughness=.4){
    const m=new T.MeshStandardMaterial({color:new T.Color(color).convertSRGBToLinear(),metalness,roughness});materials.add(m);return m;
  }
  const blue=mat(0x4282a4),steel=mat(0xb4cad0,.65,.3),gold=mat(0xd3b060,.45),dark=mat(0x3d4d61),white=mat(0xe0e9e7),yellow=mat(0xffd351);
  const orb=new T.SphereGeometry(1,24,16);geometries.add(orb);
  function mesh(g,m,parent,x=0,y=0,z=0){
    geometries.add(g);const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;
  }
  function oval(m,parent,x,y,z,w,h,d){const o=mesh(orb,m,parent,x,y,z);o.scale.set(w,h,d);return o;}
  function tube(points,r,m,parent){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),24,r,10,false),m,parent);}
  // Low cap follows the Seer shell; the crest runs fore-aft over its top.
  oval(blue,diving,0,.64,.015,.46,.24,.44);
  const crest=new T.Shape();crest.moveTo(-.37,0);crest.quadraticCurveTo(-.10,.05,.06,.33);
  crest.quadraticCurveTo(.20,.11,.38,0);crest.closePath();
  const fin=mesh(new T.ExtrudeGeometry(crest,{depth:.055,bevelEnabled:true,bevelSize:.015,bevelThickness:.012,bevelSegments:2,steps:1}),blue,diving,-.027,.81,.04);
  fin.rotation.y=Math.PI/2;
  const belt=mesh(new T.TorusGeometry(.56,.055,12,56),dark,diving,0,-.20,.015);belt.rotation.x=Math.PI/2;belt.scale.y=1.06;
  const beltTrim=mesh(new T.TorusGeometry(.565,.014,8,56),gold,diving,0,-.17,.015);beltTrim.rotation.x=Math.PI/2;beltTrim.scale.y=1.06;
  const blade=new T.Shape();blade.moveTo(-.11,0);blade.quadraticCurveTo(-.27,-.22,-.12,-.38);
  blade.quadraticCurveTo(.02,-.49,.20,-.35);blade.lineTo(.12,-.06);blade.closePath();
  const bladeGeometry=new T.ExtrudeGeometry(blade,{depth:.045,bevelEnabled:true,bevelSize:.018,bevelThickness:.012,bevelSegments:2});
  for(const side of [-1,1]){
    const paddle=new T.Group();paddle.position.set(side*.53,-.13,-.06);diving.add(paddle);rudders.push(paddle);
    oval(steel,paddle,0,0,0,.075,.10,.09);
    mesh(bladeGeometry,blue,paddle,0,-.025,-.025);
    tube([[side*.25,-.17,.32],[side*.32,.03,.38],[side*.22,.23,.37]],.036,white,diving);
    oval(dark,diving,side*.22,-.24,-.35,.10,.09,.065);
  }
  // The helmet stays on the hidden avatar in first person; its light does not.
  const illumination=new T.Group();illumination.name='潜水装 · 照明';
  illumination.visible=false;illumination.matrixAutoUpdate=false;
  const light=new T.SpotLight(0xc7f3ff,1.8,18,.55,.65,1.4);
  light.position.set(0,.65,-.53);light.target.position.set(0,.02,-8);illumination.add(light,light.target);
  const inverse=new T.Matrix4();
  function syncIllumination(){
    let host=rig.root;while(host.parent)host=host.parent;
    if(host===rig.root){illumination.visible=false;return;}
    if(illumination.parent!==host)host.add(illumination);
    rig.bones.core.updateWorldMatrix(true,false);
    inverse.copy(host.matrixWorld).invert();
    illumination.matrix.multiplyMatrices(inverse,rig.bones.core.matrixWorld);
    illumination.matrixWorldNeedsUpdate=true;
  }
  oval(steel,diving,0,.65,-.44,.10,.06,.045);
  const lamp=mat(0xb8eeff);lamp.emissive.setHex(0x90dfff);lamp.emissiveIntensity=.5;
  oval(lamp,diving,0,.65,-.487,.055,.035,.012);
  // Gas collector: bright blue cylinder, stepped intake rings and yellow control.
  gas.position.set(.55,-.02,-.05);gas.rotation.x=-.22;
  const barrel=mesh(new T.CylinderGeometry(.14,.14,.38,28),blue,gas,0,0,-.13);barrel.rotation.x=Math.PI/2;
  for(const [z,r] of [[-.34,.145],[-.39,.115],[-.43,.088]]){
    mesh(new T.TorusGeometry(r,.023,10,28),steel,gas,0,0,z);
  }
  mesh(new T.CircleGeometry(.083,28),dark,gas,0,0,-.434).rotation.y=Math.PI;
  oval(yellow,gas,.14,.05,-.08,.033,.04,.055);
  const vial=mesh(new T.CylinderGeometry(.075,.075,.24,20),steel,gas,0,-.17,.015);
  vial.rotation.z=.16;oval(blue,gas,0,-.28,.015,.09,.045,.085);
  tube([[0,.04,.05],[-.08,.08,.19],[-.13,-.13,.24],[0,-.18,.09]],.025,dark,gas);
  const bubbleMat=new T.MeshBasicMaterial({color:0xbcecff,transparent:true,opacity:.44,depthWrite:false});materials.add(bubbleMat);
  for(let i=0;i<14;i++){const b=mesh(orb,bubbleMat,group);b.scale.setScalar(.018+(i%3)*.009);b.castShadow=b.receiveShadow=false;bubbles.push(b);}
  let state={},clock=0,pulse=0;
  return {set(value){state=value||{};},pulse(){pulse=1.4;},update(dt,{visible=true,underwater=false,moving=0}={}){
    clock+=dt;pulse=Math.max(0,pulse-dt);group.visible=visible;
    diving.visible=!!state.divingSuit;gas.visible=state.handTool==='gas';
    illumination.visible=diving.visible&&underwater;
    if(illumination.visible)syncIllumination();
    for(let i=0;i<rudders.length;i++)rudders[i].rotation.x=Math.sin(clock*5+i*Math.PI)*.22*moving;
    for(let i=0;i<bubbles.length;i++){
      const b=bubbles[i],t=(clock*(pulse?1.7:.6)+i/14)%1;
      b.visible=visible&&((diving.visible&&underwater)||(gas.visible&&pulse>0));
      if(gas.visible&&pulse>0)b.position.set(.55+.11*Math.sin(i*2.4)*(1-t),-.05+.11*Math.cos(i*1.6)*(1-t),-.48-(1-t)*.8);
      else b.position.set(.13*Math.sin(i*2.1)+.06*Math.sin(clock+i),.08+t*.94,-.42+.06*Math.cos(i));
    }
  },hide(){group.visible=illumination.visible=false;},
  dispose(){illumination.parent?.remove(illumination);rig.bones.core.remove(group);for(const g of geometries)g.dispose();for(const m of materials)m.dispose();light.dispose?.();}};
}
