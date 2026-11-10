  // Scale the solid vessel (without the exhaust plume) to the handbook's
  // overall length, maximum beam and height: 530 m, 370 m and 450 m.
  ship.updateMatrixWorld(true);
  const envelope=new T.Box3();
  ship.traverse(part=>{
    if(!part.isMesh || part.material.transparent) return;
    part.castShadow = true;
    part.receiveShadow = true;
    part.geometry.computeBoundingBox();
    envelope.union(part.geometry.boundingBox.clone().applyMatrix4(part.matrixWorld));
  });
  const size=envelope.getSize(new T.Vector3());
  ship.scale.set(1,size.x*450/(530*size.y),size.x*370/(530*size.z));

  // Soft point sprites at stellar distances keep small stars round.
  const starSprite=document.createElement('canvas');starSprite.width=starSprite.height=32;
  const starBrush=starSprite.getContext('2d');
  const glow=starBrush.createRadialGradient(16,16,0,16,16,16);
  glow.addColorStop(0,'rgba(255,255,255,1)');glow.addColorStop(.24,'rgba(255,255,255,.85)');
  glow.addColorStop(.60,'rgba(255,255,255,.18)');glow.addColorStop(1,'rgba(255,255,255,0)');
  starBrush.fillStyle=glow;starBrush.fillRect(0,0,32,32);
  const starMap=new T.CanvasTexture(starSprite);
  let seed=521;
  function randomUnit(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
  for(const [count,diameter,opacity] of [[2900,.23,.62],[420,.43,.84]]){
    const positions=[],colors=[];
    for(let i=0;i<count;i++){
      const a=randomUnit()*2*Math.PI, v=randomUnit()*2-1, r=60+randomUnit()*43, ring=Math.sqrt(1-v*v);
      positions.push(ring*Math.cos(a)*r,v*r,ring*Math.sin(a)*r);
      const warm=randomUnit();colors.push(.67+.33*warm,.75+.20*warm,1-.18*warm);
    }
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    scene.add(new T.Points(g,new T.PointsMaterial({map:starMap,size:diameter,vertexColors:true,
      transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false})));
  }
