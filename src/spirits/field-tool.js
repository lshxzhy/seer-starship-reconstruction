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
  light.emissive.setHex(0xff7537).convertSRGBToLinear();
  light.emissiveIntensity=.12;
  const geometries=new Set();
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
  let pulseLeft=0;
  return {
    setVisible(value){
      root.visible=!!value;
      if(!root.visible){pulseLeft=0;light.emissiveIntensity=.12;}
    },
    pulse(){if(root.visible){pulseLeft=.24;light.emissiveIntensity=1.7;}},
    update(dt){
      if(!pulseLeft)return;
      pulseLeft=Math.max(0,pulseLeft-dt);
      light.emissiveIntensity=.12+1.58*(pulseLeft/.24);
    },
    dispose(){
      rig.bones.core.remove(root);
      for(const geometry of geometries)geometry.dispose();
      for(const material of [body,rim,silver,olive,red,black,light])material.dispose();
    }
  };
}
