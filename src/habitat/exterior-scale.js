  // Small hull fittings use the same metre as the walkable decks. The large
  // forward window bands remain the identifying shape from the game artwork.
  {
    const detail = new T.Group();
    detail.name = '扩建舰 · 检修口与舷侧工作层';
    ship.add(detail);
    const metre = size.x / 795;
    const inverseScale = new T.Matrix4().makeScale(1/ship.scale.x,1/ship.scale.y,1/ship.scale.z);
    const unitBox = new T.BoxGeometry();
    const batches = new Map();
    const local = new T.Object3D();
    function fitting(frame,x,y,z,w,h,d,material,angle=0){
      local.position.set(x,y,z); local.scale.set(w,h,d); local.rotation.set(0,0,angle); local.updateMatrix();
      if(!batches.has(material)) batches.set(material,[]);
      batches.get(material).push(frame.clone().multiply(local.matrix));
    }
    function surfaceFrame(x,angle,side,offset) {
      const point=(dx,dt)=>new T.Vector3(...shellPoint(x+dx,side*(angle+dt),offset)).multiply(ship.scale);
      const fore=point(.001,0).sub(point(-.001,0)).normalize();
      const around=point(0,.001).sub(point(0,-.001)).normalize();
      const normal=around.cross(fore).multiplyScalar(side).normalize();
      const right=fore.multiplyScalar(side);
      const up=new T.Vector3().crossVectors(normal,right).normalize();
      const matrix=new T.Matrix4().makeBasis(right,up,normal).setPosition(point(0,0));
      return matrix.scale(new T.Vector3(metre,metre,metre)).premultiply(inverseScale);
    }
    for(const side of [-1,1]) {
      // Windows are clustered in occupied work bays; structural gaps and
      // the central side reactor interrupt the runs.
      for(const [x0,x1] of [[-4.23,-3.19],[.99,4.83]]){
        for(const band of [1.96,2.13]){
          let n=0;
          for(let x=x0;x<x1;x+=.088,n++){
            if(n%9===8 || (band>2 && x>1.45 && x<2.15))continue;
            const f=surfaceFrame(x,band,side,.049);
            fitting(f,0,0,0,3.9,1.85,.32,mats.edge);
            fitting(f,0,.04,.19,2.72,.84,.14,n%7===2?mats.glass:n%5===1?mats.gold:mats.blue);
          }
        }
      }
      // One maintenance lock on each flank with a recessed roll door, a
      // service ledge, stair rungs, handrails and marked lifting fixtures.
      const f=surfaceFrame(1.76,2.15,side,.060);
      fitting(f,0,0,0,18.4,8.2,.8,mats.steel);
      fitting(f,0,-.10,.45,15.6,6.7,.28,mats.dark);
      for(let j=0;j<9;j++) fitting(f,0,-2.75+j*.67,.68,13.6,.53,.20,j%3===2?mats.edge:mats.steel);
      for(const sign of [-1,1]){
        fitting(f,sign*8.2,0,.73,.60,7.1,.70,mats.pearl);
        fitting(f,sign*8.2,2.1,1.12,.66,1.45,.15,mats.ochre);
        fitting(f,sign*5.5,-2.82,1.46,.16,1.18,.16,mats.ochre);
      }
      fitting(f,0,-3.62,1.27,19.8,.38,2.6,mats.cobalt);
      fitting(f,0,-2.23,1.58,11.4,.15,.17,mats.ochre);
      for(let j=0;j<6;j++) fitting(f,9.9,-2.8+j*.54,.84,1.36,.13,.42,mats.steel);
      // Vent cassettes follow each side of the curved aft service belt.
      // The channels terminate in visible clamps instead of wrapping the
      // continuous primary armour or the occupied window bands.
      for(const x of [-3.76,-3.45,3.36,3.67]){
        const vent=surfaceFrame(x,2.31,side,.072);
        fitting(vent,0,0,0,12.0,4.16,.52,mats.edge);
        fitting(vent,0,0,.29,11.20,3.56,.19,mats.dark);
        for(let i=0;i<7;i++)fitting(vent,-4.55+i*1.51,0,.49,.54,2.66,.30,mats.steel,-.15);
        for(const s of [-1,1]){
          fitting(vent,s*5.62,0,.47,.34,3.51,.27,mats.pearl);
          fitting(vent,s*4.71,1.63,.46,.76,.20,.19,mats.ochre);
        }
      }
    }
    for(const [material,transforms] of batches){
      const instances=new T.InstancedMesh(unitBox,material,transforms.length);
      transforms.forEach((m,i)=>instances.setMatrixAt(i,m));
      instances.instanceMatrix.needsUpdate=true;instances.frustumCulled=false;
      detail.add(instances);
    }
  }
