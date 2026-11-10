// From the SEER flight manual: stepped tower, two forward observation decks,
// and an underslung engineering compartment with a swept attachment neck.
{
  // Each horizontal section gives elevation, aft extent, fore extent and beam.
  // A rounded rectangle gives the bridge a broad front and the pod flat flanks.
  const pointOnRim = ([height, aft, fore, beam], angle, exponent) => {
    const cx = (aft + fore) / 2;
    const radius = (fore - aft) / 2;
    const c = Math.cos(angle), s = Math.sin(angle);
    return [cx + radius * Math.sign(c) * Math.abs(c) ** exponent, height,
      beam * Math.sign(s) * Math.abs(s) ** exponent];
  };

  function platedStack(parent, stations, material, exponent = 0.82, segments = 40) {
    const positions = [], indices = [];
    for (const section of stations) {
      for (let j = 0; j < segments; j++) positions.push(...pointOnRim(section, 2 * Math.PI * j / segments, exponent));
    }
    for (let i = 0; i < stations.length - 1; i++) {
      for (let j = 0; j < segments; j++) {
        const a = i * segments + j, b = i * segments + (j + 1) % segments;
        const c = a + segments, d = b + segments;
        indices.push(a, c, b, b, c, d);
      }
    }
    // Separate cap vertices keep the horizontal face flat at an armored lip.
    for (const top of [false, true]) {
      const section = stations[top ? stations.length - 1 : 0];
      const center = positions.length / 3;
      positions.push((section[1] + section[2]) / 2, section[0], 0);
      for (let j = 0; j < segments; j++) positions.push(...pointOnRim(section, 2 * Math.PI * j / segments, exponent));
      for (let j = 0; j < segments; j++) {
        const a = center + 1 + j, b = center + 1 + (j + 1) % segments;
        indices.push(center, top ? b : a, top ? a : b);
      }
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return mesh(geometry, material, 0, 0, 0, parent);
  }

  function insetStrip(parent, section, startAngle, endAngle, material, thickness, exponent) {
    const points = [];
    for (let step = 0; step <= 14; step++) {
      const angle = startAngle + (endAngle - startAngle) * step / 14;
      points.push(pointOnRim(section, angle, exponent));
    }
    lineTube(points, thickness, material, parent);
  }

  const bridge = new T.Group();
  bridge.name = '分层观察舰桥';
  bridge.position.set(-1.4, 1.0, 0);
  ship.add(bridge);

  // Wide low dark coaming, angled pearl shoulders and an offset tower trunk.
  platedStack(bridge, [[-.14,-1.63,2.02,1.36],[.04,-1.63,2.02,1.36],
    [.21,-1.40,1.90,1.22]], mats.edge, .72);
  platedStack(bridge, [[.13,-1.44,1.94,1.24],[.28,-1.39,1.91,1.21],
    [.53,-1.22,1.77,1.06],[1.40,-.94,1.39,.91],[1.90,-.68,1.05,.79],
    [2.02,-.64,.81,.71]], mats.hull, .72);
  platedStack(bridge, [[.10,-1.61,.07,1.12],[.62,-1.34,.10,1.00],
    [.70,-1.22,.11,.98],[1.17,-1.13,.08,.91],[1.26,-.96,.08,.89],
    [1.75,-.91,.05,.75],[1.86,-.70,.04,.69],[2.11,-.66,.06,.64]], mats.steel, .68);
  platedStack(bridge, [[1.70,-.72,.81,.75],[2.06,-.63,.70,.66],
    [3.18,-.58,.52,.57],[3.53,-.56,.48,.55]], mats.pearl, .82);

  // Tiered bridge windows project toward the bow. Their dark glazing stays
  // visible above the lower fairing, and narrow blue strips trace its surface.
  function observationDeck(height, width, depth, forwardReach) {
    const aft = -.58 - width * .17;
    platedStack(bridge, [[height - .20, -.57, .51, depth * .63],
      [height - .09, aft, forwardReach - .08, depth * .96],
      [height, aft - .035, forwardReach, depth]], mats.steel);
    platedStack(bridge, [[height - .01, aft, forwardReach - .025, depth * .98],
      [height + .18, aft - .025, forwardReach + .025, depth]], mats.glass);
    const mid = [height + .09, aft - .025, forwardReach + .027, depth * 1.003];
    for (const sign of [-1, 1]) {
      insetStrip(bridge, mid, sign * .14, sign * .43, mats.cyan, .018, .82);
      insetStrip(bridge, mid, sign * .52, sign * 1.02, mats.blue, .016, .82);
    }
    platedStack(bridge, [[height + .17, aft - .06, forwardReach + .07, depth * 1.055],
      [height + .25, aft - .06, forwardReach + .08, depth * 1.06],
      [height + .37, aft + .14, forwardReach - .20, depth * .86],
      [height + .42, aft + .18, forwardReach - .28, depth * .80]], mats.pearl);
  }
  observationDeck(2.26, .82, .85, 1.10);
  observationDeck(3.32, 1.10, 1.05, 1.42);
  platedStack(bridge, [[3.71,-.46,.56,.54],[3.87,-.43,.50,.49],
    [4.27,-.35,.33,.32],[4.38,-.30,.25,.26]], mats.hull, .82);
  platedStack(bridge, [[4.37,-.30,.25,.26],[4.42,-.26,.23,.23]], mats.ochre);
  sphere(.077,.096,.077,mats.cyan,-.03,4.46,0,bridge);

  // Armor seams and inset windows follow the actual trunk at each height.
  const shoulderSections = [[.54,-1.22,1.77,1.068],[1.39,-.94,1.40,.917],[1.89,-.68,1.05,.798]];
  for (const side of [-1, 1]) {
    const ridge = shoulderSections.map(section => pointOnRim(section, side * .72, .72));
    lineTube(ridge,.028,mats.steel,bridge);
    const stripe = shoulderSections.map(section => pointOnRim(section, side * .78, .72));
    lineTube(stripe,.024,mats.ochre,bridge);
    for (let i = 0; i < 5; i++) {
      const a = .90 + i * .135;
      insetStrip(bridge,[1.34,-.956,1.426,.934],side * a,side * (a + .058),mats.gold,.020,.72);
    }
  }

  const pod = new T.Group();
  pod.name = '后倾连接颈与梯形腹舱';
  ship.add(pod);
  // Broad contact patches at both ends create a structural join across the
  // keel. The dark collar is visible between silver shield segments.
  platedStack(pod, [[-2.65,-3.22,-1.91,.60],[-2.47,-3.15,-1.71,.65],
    [-2.00,-2.63,-1.27,.59],[-1.63,-2.39,-1.19,.57],[-1.37,-2.32,-1.12,.53]], mats.steel, .58, 24);
  platedStack(pod, [[-2.57,-3.25,-1.82,.69],[-2.47,-3.20,-1.74,.72],
    [-2.38,-3.09,-1.66,.69]], mats.dark, .58, 24);
  // Broad chamfered prow and stepped lower rim of the underslung pod.
  platedStack(pod, [[-3.76,-3.50,-1.55,.67],[-3.67,-3.66,-1.43,.80],
    [-3.49,-3.78,-1.34,.96],[-3.05,-3.99,-1.14,1.07],
    [-2.84,-3.94,-1.13,1.04],[-2.62,-3.76,-1.26,.94],
    [-2.44,-3.41,-1.60,.70]], mats.hull, .52, 24);
  platedStack(pod, [[-3.76,-3.51,-1.55,.68],[-3.68,-3.67,-1.42,.82],
    [-3.59,-3.72,-1.38,.90]], mats.edge, .52, 24);
  platedStack(pod, [[-3.085,-4.005,-1.125,1.081],[-2.99,-4.005,-1.105,1.082],
    [-2.958,-3.99,-1.115,1.075]], mats.steel, .52, 24);
  // Visible port and starboard: small cyan service lights underneath an
  // ochre ID stripe. The lower faces and belly remain armored.
  for (const side of [-1, 1]) {
    const windowSection = [-3.031,-4.013,-1.110,1.095];
    for (let i = 0; i < 4; i++) {
      const a = 1.02 + .23 * i;
      insetStrip(pod,windowSection,side * a,side * (a + .11),mats.cyan,.021,.52);
    }
    insetStrip(pod,[-2.76,-3.90,-1.14,1.014],side * 1.16,side * 1.74,mats.ochre,.033,.52);
  }
}
