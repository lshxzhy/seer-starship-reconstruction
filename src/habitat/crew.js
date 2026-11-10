  // The same footprints which reserve walking clearance also locate the
  // broad contact shading at floor level. The map has soft edges, leaving
  // the two-metre floor plate seams visible under each piece of equipment.
  {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
    const brush=canvas.getContext('2d');
    const falloff=brush.createRadialGradient(32,32,3,32,32,32);
    falloff.addColorStop(0,'rgba(17,25,34,.36)');
    falloff.addColorStop(.66,'rgba(17,25,34,.22)');
    falloff.addColorStop(1,'rgba(17,25,34,0)');
    brush.fillStyle=falloff;brush.fillRect(0,0,64,64);
    const stamp=new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas),transparent:true,depthWrite:false,
      toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1});
    const unit=new T.PlaneGeometry(1,1);
    for(const id of Object.keys(cabinBuilders)){
      const build=cabinBuilders[id];
      cabinBuilders[id]=function(kit){
        build(kit);
        const marks=kit.root.userData.blocks.filter(b=>b.w<kit.W*.91 && b.d<kit.D*.91);
        if(!marks.length)return;
        const shadows=new T.InstancedMesh(unit,stamp,marks.length);
        const marker=new T.Object3D();marker.rotation.x=-Math.PI/2;
        marks.forEach((b,i)=>{
          marker.position.set(b.x,.018,b.z);marker.scale.set(b.w*1.3+.28,b.d*1.3+.28,1);
          marker.updateMatrix();shadows.setMatrixAt(i,marker.matrix);
        });
        shadows.frustumCulled=false;shadows.instanceMatrix.needsUpdate=true;kit.root.add(shadows);
      };
    }
  }
