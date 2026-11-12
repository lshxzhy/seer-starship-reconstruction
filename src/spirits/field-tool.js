// The original equip portrait places two red-tipped silver shapes above the Seer's face.
// The robot's core uses -Z as its front and carries the whole accessory during the walk cycle.
function createFieldFlameTool(T,rig){
  const root=new T.Group();
  root.name='实验室装备 · 火焰喷射器';
  root.position.set(0,.458,.048);
  root.visible=false;
  rig.bones.core.add(root);

  function paint(hex,metalness,roughness){
    return new T.MeshStandardMaterial({color:new T.Color(hex).convertSRGBToLinear(),metalness,roughness});
  }
  const body=paint(0x444745,.47,.43),rim=paint(0x989b9a,.53,.34);
  const silver=paint(0xd0d1c9,.52,.32),olive=paint(0x89815a,.48,.45);
  const red=paint(0xb72d32,.32,.35),black=paint(0x281820,.15,.62),light=paint(0xe65e47,.2,.3);
  for(const painted of [body,olive,red])applyManufacturedFinish(painted,'paint');
  for(const alloy of [rim,silver])applyManufacturedFinish(alloy,'metal');
  applyManufacturedFinish(black,'rubber');
  light.emissive.setHex(0xff7537).convertSRGBToLinear();
  light.emissiveIntensity=.12;
  const geometries=new Set(),muzzles=[];
  function piece(parent,geometry,material,x,y,z){
    geometries.add(geometry);
    const mesh=new T.Mesh(geometry,material);
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
    return mesh;
  }
  function contour(points){
    return new T.LatheGeometry(points.map(([r,y])=>new T.Vector2(r,y)),28);
  }
  const saddle=new T.BoxGeometry(.52,.102,.23);
  const edge=new T.BoxGeometry(.49,.025,.244);
  piece(root,saddle,body,0,.012,.025);
  piece(root,edge,rim,0,.066,.024);

  const orb=new T.SphereGeometry(1,24,16);
  const trim=new T.TorusGeometry(.033,.007,8,16);
  const silverForm=contour([[0,-.054],[.056,-.054],[.086,-.034],[.100,.008],[.094,.054],
    [.065,.112],[.052,.136],[.053,.221],[.046,.236],[0,.236]]);
  const crown=contour([[0,0],[.052,0],[.069,.014],[.076,.031],[.072,.090],
    [.059,.107],[.040,.111],[.036,.099],[.036,.074],[0,.074]]);
  const inset=new T.CircleGeometry(.034,24);
  const glowRing=new T.TorusGeometry(.040,.005,8,24);
  const halfOval=(parent,mat,x,y,z,w,h,d)=>{
    const mesh=piece(parent,orb,mat,x,y,z);mesh.scale.set(w,h,d);return mesh;
  };
  for(const side of [-1,1]){
    const x=side*.142;
    halfOval(root,olive,side*.246,.012,.024,.052,.087,.106);
    const tube=new T.Group();tube.position.set(x,.123,-.008);tube.rotation.x=-.74;root.add(tube);
    piece(tube,silverForm,silver,0,0,0);
    piece(tube,crown,red,0,.202,0);
    piece(tube,inset,black,0,.279,0).rotation.x=-Math.PI/2;
    piece(tube,glowRing,light,0,.310,0).rotation.x=-Math.PI/2;
    tube.updateMatrix();
    muzzles.push({origin:new T.Vector3(0,.313,0).applyMatrix4(tube.matrix),
      axis:new T.Vector3(0,1,0).applyQuaternion(tube.quaternion)});
    const sleeve=new T.CatmullRomCurve3([
      new T.Vector3(x*.76,-.049,-.101),new T.Vector3(x*.84,-.018,-.125),
      new T.Vector3(x,.036,-.139),new T.Vector3(x,.078,-.086)
    ]);
    piece(root,new T.TubeGeometry(sleeve,14,.028,10,false),olive,0,0,0);
    const axis=new T.Vector3(0,0,1);
    for(let i=1;i<=6;i++){
      const u=i/8,point=sleeve.getPoint(u);
      const ridge=piece(root,trim,body,point.x,point.y,point.z);
      ridge.quaternion.setFromUnitVectors(axis,sleeve.getTangent(u).normalize());
    }
  }
  // Keep emission outside the avatar hierarchy: first person hides the avatar,
  // but a flame pulse still needs to leave these two physical nozzle positions.
  const effects=new T.Group();effects.name='火焰喷射器 · 短射流';effects.visible=false;effects.matrixAutoUpdate=false;
  const flame=new T.MeshBasicMaterial({color:new T.Color(0xff7022).convertSRGBToLinear(),
    transparent:true,opacity:.68,depthWrite:false});
  const hot=new T.MeshBasicMaterial({color:new T.Color(0xffe59a).convertSRGBToLinear(),
    transparent:true,opacity:.84,depthWrite:false});
  const ember=new T.MeshBasicMaterial({color:new T.Color(0xffbd56).convertSRGBToLinear(),
    transparent:true,opacity:.9,depthWrite:false});
  const steps=16,sides=12,stride=sides+1;
  function makeJet(material,width){
    const positions=new Float32Array((steps+1)*stride*3),indices=[];
    for(let i=0;i<steps;i++)for(let j=0;j<sides;j++){
      const a=i*stride+j,b=a+stride;indices.push(a,a+1,b,a+1,b+1,b);
    }
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));
    geometry.setIndex(indices);geometries.add(geometry);
    const mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;effects.add(mesh);
    return {geometry,positions,width};
  }
  const sparkGeometry=new T.SphereGeometry(.022,6,4);geometries.add(sparkGeometry);
  for(const muzzle of muzzles){
    muzzle.jets=[makeJet(flame,1),makeJet(hot,.48)];muzzle.sparks=[];
    for(let i=0;i<16;i++){
      const mesh=new T.Mesh(sparkGeometry,ember);mesh.visible=false;effects.add(mesh);
      muzzle.sparks.push(mesh);
    }
  }
  const duration=.48,worldTarget=new T.Vector3(),localTarget=new T.Vector3(),inverse=new T.Matrix4();
  const direction=new T.Vector3(),control=new T.Vector3(),end=new T.Vector3(),centre=new T.Vector3();
  const tangent=new T.Vector3(),normal=new T.Vector3(),binormal=new T.Vector3(),reference=new T.Vector3();
  let enabled=false,pulseLeft=0,hasTarget=false;
  function cancelPulse(){pulseLeft=0;effects.visible=false;light.emissiveIntensity=.12;}
  function syncEffects(){
    let stage=rig.root;while(stage.parent)stage=stage.parent;
    if(stage===rig.root)return false;
    if(effects.parent!==stage)stage.add(effects);
    root.updateWorldMatrix(true,false);
    inverse.copy(stage.matrixWorld).invert();effects.matrix.multiplyMatrices(inverse,root.matrixWorld);
    effects.matrixWorldNeedsUpdate=true;
    if(hasTarget)localTarget.copy(worldTarget).applyMatrix4(inverse.copy(root.matrixWorld).invert());
    return true;
  }
  function curveAt(origin,u){
    const v=1-u;
    centre.copy(origin).multiplyScalar(v*v).addScaledVector(control,2*v*u).addScaledVector(end,u*u);
    tangent.copy(control).sub(origin).multiplyScalar(v).addScaledVector(direction.copy(end).sub(control),u).normalize();
    normal.crossVectors(tangent,reference).normalize();binormal.crossVectors(tangent,normal);
  }
  function drawPulse(){
    if(!syncEffects())return;
    const elapsed=duration-pulseLeft,attack=Math.min(1,elapsed/.075),release=Math.min(1,pulseLeft/.17);
    const envelope=attack*release;
    effects.visible=envelope>0;
    flame.opacity=.68*release;hot.opacity=.84*release;ember.opacity=.9*release;
    light.emissiveIntensity=.12+1.58*envelope;
    for(const [index,muzzle] of muzzles.entries()){
      const origin=muzzle.origin;
      if(hasTarget)direction.copy(localTarget).sub(origin);
      else direction.copy(muzzle.axis).multiplyScalar(4.6);
      const distance=direction.length();direction.normalize();
      reference.crossVectors(muzzle.axis,direction);
      if(reference.lengthSq()<1e-8)reference.set(0,Math.abs(direction.y)>.9?0:1,Math.abs(direction.y)>.9?1:0);
      reference.normalize();
      // The visible burst is short even when an old interaction can be selected
      // farther away; it aims at that point without creating a long solid beam.
      const reach=Math.max(.10,Math.min(4.6,distance))*envelope;
      control.copy(origin).addScaledVector(muzzle.axis,Math.min(.36,reach*.30));
      end.copy(origin).addScaledVector(direction,reach);
      for(const jet of muzzle.jets){
        for(let i=0;i<=steps;i++){
          const u=i/steps;curveAt(origin,u);
          const flutter=1+.12*Math.sin(u*25-elapsed*48+index*2);
          const radius=(.030+.105*Math.sin(Math.PI*u))*(1-u)*jet.width*flutter*envelope;
          for(let j=0;j<=sides;j++){
            const angle=j*Math.PI*2/sides,n=(i*stride+j)*3,a=Math.cos(angle)*radius,b=Math.sin(angle)*radius;
            jet.positions[n]=centre.x+normal.x*a+binormal.x*b;
            jet.positions[n+1]=centre.y+normal.y*a+binormal.y*b;
            jet.positions[n+2]=centre.z+normal.z*a+binormal.z*b;
          }
        }
        jet.geometry.attributes.position.needsUpdate=true;
      }
      for(const [i,spark] of muzzle.sparks.entries()){
        const travel=(elapsed-i*.009)/.29;spark.visible=travel>0&&travel<1&&envelope>.02;
        if(!spark.visible)continue;
        curveAt(origin,Math.min(1,travel));
        const angle=i*2.399+index,spread=(.015+.15*travel)*Math.sin(Math.PI*travel);
        spark.position.copy(centre).addScaledVector(normal,Math.cos(angle)*spread)
          .addScaledVector(binormal,Math.sin(angle)*spread);
        spark.scale.setScalar((.52+.24*(i%3))*(1-travel)*envelope);
      }
    }
  }
  return {
    setVisible(value,showModel=true){
      enabled=!!value;root.visible=enabled&&!!showModel;
      if(!enabled)cancelPulse();
    },
    pulse(target){
      if(!enabled)return;
      hasTarget=!!target&&Number.isFinite(target.x)&&Number.isFinite(target.y)&&Number.isFinite(target.z);
      if(hasTarget)worldTarget.copy(target);
      pulseLeft=duration;drawPulse();
    },
    update(dt){
      if(!pulseLeft)return;
      pulseLeft=Math.max(0,pulseLeft-dt);
      if(!pulseLeft){cancelPulse();return;}
      drawPulse();
    },
    dispose(){
      effects.parent?.remove(effects);
      rig.bones.core.remove(root);
      for(const geometry of geometries)geometry.dispose();
      for(const material of [body,rim,silver,olive,red,black,light,flame,hot,ember])material.dispose();
    }
  };
}
