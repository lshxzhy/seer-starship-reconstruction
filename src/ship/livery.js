  // Object colours are fixed paint and glazing. The surrounding controls
  // follow the viewer's theme independently of the spacecraft.
  const mats = {};
  const linearColor = hex => new T.Color(hex).convertSRGBToLinear();
  function coat(name, hex, metalness, roughness, emission=0) {
    const color = linearColor(hex);
    mats[name] = new T.MeshStandardMaterial({
      color, metalness, roughness,
      emissive: emission ? color : 0x000000, emissiveIntensity: emission
    });
  }
  coat('pearl',0xf1e8cb,.24,.34);
  coat('hull',0xc4d1d9,.30,.38);
  coat('shadowArmor',0x8ba4bd,.30,.40);
  coat('steel',0x7892aa,.44,.34);
  coat('edge',0x415575,.39,.37);
  coat('dark',0x192a40,.24,.42);
  coat('cobalt',0x235486,.29,.34);
  coat('ochre',0xe49828,.29,.34);
  coat('glass',0x0d485e,.33,.21,.09);
  coat('blue',0x389bf4,.10,.29,1.0);
  coat('cyan',0x56e5ff,.08,.25,1.3);
  coat('gold',0xffb427,.19,.27,1.05);
  coat('hot',0xffe8a7,.05,.24,1.55);
  coat('red',0xeb574e,.12,.29,.35);

  // Four original service-plate patterns share one colour atlas and one relief
  // atlas. Only exterior armour carries the tooling marks and captive screws.
  function armourAtlas(relief) {
    const canvas=document.createElement('canvas');
    canvas.width=1024;canvas.height=512;
    const ctx=canvas.getContext('2d');
    let seed=0x5e0127;
    function random(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}
    const variants=[
      [[158,5,208,241],[376,31,107,82]],
      [[8,24,265,149],[292,3,210,245]],
      [[14,9,188,235],[222,65,271,164]],
      [[11,8,296,237],[336,17,154,140]]
    ];
    for(let tile=0;tile<4;tile++) {
      ctx.save();ctx.translate((tile%2)*512,Math.floor(tile/2)*256);
      ctx.beginPath();ctx.rect(0,0,512,256);ctx.clip();
      ctx.fillStyle=relief?'#888':'#f1f2f1';ctx.fillRect(0,0,512,256);
      for(const [x,y,w,h] of variants[tile]){
        const bevel=Math.min(19,h*.16);
        ctx.beginPath();ctx.moveTo(x+bevel,y);ctx.lineTo(x+w-8,y);ctx.lineTo(x+w,y+8);
        ctx.lineTo(x+w,y+h-bevel);ctx.lineTo(x+w-bevel,y+h);ctx.lineTo(x+6,y+h);
        ctx.lineTo(x,y+h-6);ctx.lineTo(x,y+bevel);ctx.closePath();
        ctx.fillStyle=relief?'#a1a1a1':'#fafaf6';ctx.fill();
        ctx.lineWidth=5;ctx.strokeStyle=relief?'#565656':'#c0c4c6';ctx.stroke();
        ctx.lineWidth=1.5;ctx.strokeStyle=relief?'#383838':'#878f95';ctx.stroke();
        for(const sx of [x+11,x+w-11])for(const sy of [y+12,y+h-12]){
          ctx.beginPath();ctx.arc(sx,sy,2.8,0,2*Math.PI);
          ctx.fillStyle=relief?'#595959':'#959da0';ctx.fill();
          ctx.fillStyle=relief?'#afafaf':'#d9dad5';ctx.fillRect(sx-1.6,sy-1.4,3.1,1.4);
        }
        // Recessed latches sit at the removable plate's forward edge.
        ctx.fillStyle=relief?'#505050':'#92999d';ctx.fillRect(x+w-16,y+h*.47,4,20);
        ctx.fillStyle=relief?'#aaaaaa':'#d6dad9';ctx.fillRect(x+w-15,y+h*.47+2,2,15);
        // Stepped recess, cross-web and grip of a removable plate. Its dull
        // pocket and burnished lip also receive different specular responses.
        if(w>160&&h>110){
          const hx=x+20,hy=y+h*.72,length=Math.min(54,w*.23);
          ctx.fillStyle=relief?'#777':'#c5cdce';ctx.fillRect(hx,hy,length,9);
          ctx.fillStyle=relief?'#4a4a4a':'#909a9d';ctx.fillRect(hx+2,hy+1,length-4,5);
          ctx.fillStyle=relief?'#b8b8b8':'#e7e8df';ctx.fillRect(hx+5,hy+3,length-10,2);
          for(let j=0;j<3;j++){
            const ix=hx+4+j*6;
            ctx.fillStyle=relief?'#929292':'#c2c7c4';ctx.fillRect(ix,hy+13,3,3);
          }
        }
      }
      // A few directional scuffs break the highlight only at close approach.
      for(let i=0;i<125;i++){
        const x=random()*512,y=random()*256,len=2+random()*16;
        ctx.strokeStyle=relief?'rgba(75,75,75,.09)':'rgba(58,69,76,.09)';
        ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+len,y-len*.14);ctx.stroke();
      }
      ctx.restore();
    }
    if(relief){
      // Red retains the machined profile. Green is independent roughness:
      // paint on broad panels, exposed lips, grime in the recessed seams.
      const layer=ctx.getImageData(0,0,canvas.width,canvas.height),p=layer.data;
      for(let i=0;i<p.length;i+=4){
        const h=p[i],row=Math.floor(i/(4*canvas.width));
        const rough=h<110?237:h>169?120:190;
        p[i+1]=rough+(random()-.5)*17+5*Math.sin(row*Math.PI/8);
      }
      ctx.putImageData(layer,0,0);
    }
    const map=new T.CanvasTexture(canvas);
    if(!relief)map.encoding=T.sRGBEncoding;
    map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    return map;
  }
  const armourColour=armourAtlas(false), armourHeight=armourAtlas(true);
  const armourCoatings=new Map();
  function armourCoat(base) {
    if(!armourCoatings.has(base)){
      const metal=base.clone();
      metal.map=armourColour;metal.bumpMap=armourHeight;metal.bumpScale=.007;
      metal.roughnessMap=armourHeight;metal.roughness=Math.min(.78,base.roughness+.22);
      armourCoatings.set(base,metal);
    }
    return armourCoatings.get(base);
  }

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const hemisphere = new T.HemisphereLight(0xdcecfb,0x647486,.48);
  scene.add(hemisphere);
  function sun(color,intensity,x,y,z) {
    const light = new T.DirectionalLight(color,intensity);
    light.position.set(x,y,z);
    scene.add(light);
    return light;
  }
  const mainLamp=sun(0xffeed7,1.28,-4,9,5);
  mainLamp.castShadow=true;
  mainLamp.shadow.mapSize.set(1024,1024);
  Object.assign(mainLamp.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.1,far:35});
  mainLamp.shadow.camera.updateProjectionMatrix();
  mainLamp.shadow.bias=-.00035;
  mainLamp.shadow.normalBias=.026;
  sun(0x90cfff,.68,4,2,-7);
  sun(0xc8d6ff,.27,-7,-3,4);
