// Cut the hull skin and its fitted ribs out of occupied rooms at build time.
// Room floors, pipe chases and hatch frames are installed separately.
function byronInteriorClearances(){
  function room(outline,low,high){
    const centre=outline.reduce((c,p)=>[c[0]+p[0]/outline.length,c[1]+p[1]/outline.length],[0,0]);
    const planes=[[0,1,0,-high],[0,-1,0,low]];
    outline.forEach(([x,z],i)=>{
      const [u,v]=outline[(i+1)%outline.length],l=Math.hypot(u-x,v-z);
      let a=(v-z)/l,c=(x-u)/l,d=-a*x-c*z;
      if(a*centre[0]+c*centre[1]+d>0){a=-a;c=-c;d=-d;}
      planes.push([a,0,c,d]);
    });
    return planes;
  }
  const rect=(x,u,z,v)=>[[x,z],[u,z],[u,v],[x,v]];
  return [
    room(BYRON_HOLD,-4.7,11.25),
    room(Array.from({length:24},(_,i)=>[-12+15.84*Math.cos(i*Math.PI/12),-17+15.84*Math.sin(i*Math.PI/12)]),-4.15,12.1),
    room(rect(.75,20.64,-20.5,-13.54),-.65,4.84),
    room(rect(14.12,20.68,-32,-16.45),-.65,4.84),
    room(rect(-15.23,-7.07,-5.01,16.99),-.68,13.9)
  ];
}
function cutByronHull(T,root,rooms){
  const signed=(p,v)=>p[0]*v[0]+p[1]*v[1]+p[2]*v[2]+p[3];
  // Split triangles on the room planes. Save the OUTSIDE piece at each plane;
  // the piece inside all planes is the part removed from the hull.
  function removeRoom(poly,planes){
    if(planes.some(p=>poly.every(v=>signed(p,v)>=0)))return [poly];
    let remaining=poly;
    const kept=[];
    for(const plane of planes){
      const inside=[],outside=[];
      for(let i=0;i<remaining.length;i++){
        const a=remaining[i],b=remaining[(i+1)%remaining.length];
        const da=signed(plane,a),db=signed(plane,b);
        (da>0?outside:inside).push(a);
        if((da>0)!==(db>0)){
          const t=da/(da-db),edge=a.map((x,k)=>x+t*(b[k]-x));
          inside.push(edge);outside.push(edge);
        }
      }
      if(outside.length>=3)kept.push(outside);
      if(inside.length<3)break;
      remaining=inside;
    }
    return kept;
  }
  const transform=new T.Matrix4(),centre=new T.Vector3(),half=new T.Vector3(),bounds=new T.Box3();
  for(const mesh of root.children.slice()){
    if(!mesh.isInstancedMesh)continue;
    const geo=mesh.geometry;if(!geo.boundingBox)geo.computeBoundingBox();
    let kept=0;
    for(let i=0;i<mesh.count;i++){
      mesh.getMatrixAt(i,transform);
      bounds.copy(geo.boundingBox).applyMatrix4(transform);bounds.getCenter(centre);bounds.getSize(half).multiplyScalar(.5);
      const partial=[];let whollyInside=false;
      for(const planes of rooms){
        let outside=false,inside=true;
        for(const [a,b,c,d] of planes){
          const distance=a*centre.x+b*centre.y+c*centre.z+d;
          const radius=Math.abs(a)*half.x+Math.abs(b)*half.y+Math.abs(c)*half.z;
          if(distance-radius>=0){outside=true;break;}
          if(distance+radius>0)inside=false;
        }
        if(outside)continue;
        if(inside){whollyInside=true;break;}
        partial.push(planes);
      }
      if(whollyInside)continue;
      if(!partial.length){
        if(i!==kept)mesh.setMatrixAt(kept,transform);kept++;continue;
      }
      const source=geo.clone().applyMatrix4(transform);
      const keys=['position',...Object.keys(source.attributes).filter(key=>key!=='position')];
      const out=keys.map(()=>[]),rows=[];
      for(let n=0;n<source.attributes.position.count;n++){
        const row=[];
        for(const key of keys){
          const a=source.attributes[key];for(let k=0;k<a.itemSize;k++)row.push(a.array[n*a.itemSize+k]);
        }
        rows.push(row);
      }
      const ix=source.index?.array,len=ix?ix.length:rows.length;
      for(let n=0;n<len;n+=3){
        let polys=[[rows[ix?ix[n]:n],rows[ix?ix[n+1]:n+1],rows[ix?ix[n+2]:n+2]]];
        for(const planes of partial)polys=polys.flatMap(p=>removeRoom(p,planes));
        for(const p of polys)for(let j=1;j<p.length-1;j++)for(const v of [p[0],p[j],p[j+1]]){
          let k=0;keys.forEach((key,g)=>{const size=source.attributes[key].itemSize;for(let t=0;t<size;t++)out[g].push(v[k++]);});
        }
      }
      if(out[0].length){
        const result=new T.BufferGeometry();keys.forEach((key,g)=>result.setAttribute(key,new T.Float32BufferAttribute(out[g],source.attributes[key].itemSize)));
        result.normalizeNormals();const trim=new T.Mesh(result,mesh.material);
        trim.castShadow=mesh.castShadow;trim.receiveShadow=mesh.receiveShadow;root.add(trim);
      }
      source.dispose();
    }
    mesh.count=kept;mesh.instanceMatrix.needsUpdate=true;mesh.visible=kept>0;
  }
}
