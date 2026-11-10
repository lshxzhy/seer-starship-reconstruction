  function mesh(geometry, mat, x=0,y=0,z=0,parent=ship) {
    const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);parent.add(m);return m;
  }
  function box(w,h,d,mat,x,y,z,parent=ship) {
    return mesh(new T.BoxGeometry(w,h,d),mat,x,y,z,parent);
  }
  function sphere(rx,ry,rz,mat,x,y,z,parent=ship) {
    const m=mesh(new T.SphereGeometry(1,48,32),mat,x,y,z,parent);m.scale.set(rx,ry,rz);return m;
  }
  function cylinder(top,bottom,h,mat,x,y,z,parent=ship,segments=64) {
    return mesh(new T.CylinderGeometry(top,bottom,h,segments,1),mat,x,y,z,parent);
  }
  function lineTube(points,radius,mat,parent=ship,closed=false) {
    const c=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),closed,'centripetal');
    return mesh(new T.TubeGeometry(c,Math.max(24,points.length*8),radius,6,closed),mat,0,0,0,parent);
  }
