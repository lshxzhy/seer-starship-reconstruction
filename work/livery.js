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

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const hemisphere = new T.HemisphereLight(0xdcecfb,0x647486,.75);
  scene.add(hemisphere);
  function sun(color,intensity,x,y,z) {
    const light = new T.DirectionalLight(color,intensity);
    light.position.set(x,y,z);
    scene.add(light);
    return light;
  }
  const mainLamp=sun(0xffeed7,1.42,-4,9,5);
  mainLamp.castShadow=true;
  mainLamp.shadow.mapSize.set(1024,1024);
  Object.assign(mainLamp.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.1,far:35});
  mainLamp.shadow.camera.updateProjectionMatrix();
  mainLamp.shadow.bias=-.00035;
  mainLamp.shadow.normalBias=.026;
  sun(0x90cfff,.93,4,2,-7);
  sun(0xc8d6ff,.43,-7,-3,4);
