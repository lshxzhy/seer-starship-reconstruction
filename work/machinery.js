  // Side reactors and stern jets use local +Z as their outward axis.
  {
    function turnedPart(profile, material, parent) {
      const points = profile.map(([radius, depth]) => new T.Vector2(radius, depth));
      const part = mesh(new T.LatheGeometry(points, 80), material, 0, 0, 0, parent);
      part.rotation.x = Math.PI / 2;
      return part;
    }

    function rim(radius, thickness, depth, material, parent, arc = Math.PI * 2, angle = 0) {
      const ring = mesh(new T.TorusGeometry(radius, thickness, 10, 88, arc), material, 0, 0, depth, parent);
      ring.rotation.z = angle;
      return ring;
    }

    function dialSector(inner, outer, depth, start, angle, material, parent) {
      return mesh(new T.RingGeometry(inner, outer, 36, 1, start, angle), material, 0, 0, depth, parent);
    }

    // The drawing shows a deep luminous opening inside a broad, beveled cast housing.
    // The upper shell has a lip and a panel break. No spokes cross the lens.
    const lensMaterial = new T.ShaderMaterial({
      uniforms: {
        amber: {value: mats.gold.color.clone()},
        champagne: {value: mats.hot.color.clone()},
        bronze: {value: mats.ochre.color.clone()}
      },
      vertexShader: `
        varying vec3 local;
        void main() {
          local = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec3 local;
        uniform vec3 amber;
        uniform vec3 bronze;
        uniform vec3 champagne;
        void main() {
          float r = length(local.xy);
          float core = 1.0 - smoothstep(0.18, 0.83, r);
          float annulus = exp(-100.0 * abs(r - 0.92));
          vec3 color = mix(amber * 1.3, bronze * 0.82, smoothstep(0.59, 0.98, r));
          color = mix(color, champagne * 2.35, core * 0.94);
          color += amber * annulus * 1.8;
          gl_FragColor = vec4(color, 1.0);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
        }`
    });

    for (const side of [-1, 1]) {
      const housing = new T.Group();
      housing.position.set(-0.9, -0.55, side * 2.37);
      housing.rotation.y = side > 0 ? 0 : Math.PI;
      ship.add(housing);

      turnedPart([[0.01,-0.40], [1.38,-0.40], [1.67,-0.15], [1.69,0.06], [1.62,0.23], [1.47,0.29], [1.20,0.30], [1.20,0.08]], mats.edge, housing);
      turnedPart([[1.56,0.15], [1.64,0.18], [1.59,0.29], [1.42,0.43], [1.22,0.48], [1.13,0.42], [1.09,0.31]], mats.hull, housing);
      turnedPart([[1.14,0.30], [1.16,0.45], [1.11,0.49], [0.98,0.43], [0.90,0.34]], mats.ochre, housing);
      rim(1.63, 0.035, 0.12, mats.steel, housing);
      rim(1.16, 0.035, 0.474, mats.gold, housing);
      rim(1.06, 0.022, 0.455, mats.hot, housing);

      const lens = sphere(1.07, 1.07, 0.105, lensMaterial, 0, 0, 0.425, housing);
      lens.name = '琥珀色能源透镜';
      for (const [start, arc] of [[0.15,0.82], [1.52,0.52], [2.65,0.58], [4.09,0.88], [5.16,0.55]]) {
        dialSector(1.28, 1.48, 0.43, start, arc, mats.steel, housing);
      }
      for (const angle of [0.12, 0.35, 1.42, 2.33, 3.71, 4.70, 5.60]) {
        const indicator = box(0.042, 0.109, 0.03, mats.gold, Math.cos(angle)*1.34, Math.sin(angle)*1.34, 0.459, housing);
        indicator.rotation.z = angle - Math.PI / 2;
      }
      rim(1.52, 0.035, 0.34, mats.pearl, housing, 1.12, 0.83);
    }

    // A transverse camera-facing sheet follows the engine axis. Its smooth
    // alpha falloff removes the hard cone silhouette at the edges and tip.
    function exhaustJet(radius, length, parent) {
      const material = new T.ShaderMaterial({
        uniforms: {
          radius: {value: radius},
          jetLength: {value: length},
          blue: {value: mats.blue.color.clone()},
          cyan: {value: mats.cyan.color.clone()}
        },
        transparent: true,
        depthWrite: false,
        side: T.DoubleSide,
        blending: T.AdditiveBlending,
        vertexShader: `
          uniform float radius;
          uniform float jetLength;
          varying vec2 beam;
          void main() {
            beam = vec2(uv.x * 2.0 - 1.0, uv.y);
            vec3 axis = normalize(mat3(modelViewMatrix) * vec3(0., 0., 1.));
            vec2 transverse = vec2(-axis.y, axis.x);
            transverse = length(transverse) > 0.001 ? normalize(transverse) : vec2(1.,0.);
            vec4 center = modelViewMatrix * vec4(0., 0., 0.64 + beam.y * jetLength, 1.);
            center.xy += transverse * beam.x * radius * 1.60;
            gl_Position = projectionMatrix * center;
          }`,
        fragmentShader: `
          varying vec2 beam;
          uniform vec3 blue;
          uniform vec3 cyan;
          void main() {
            float t = beam.y;
            float width = (0.36 + 0.64 * (1.0 - t)) * (1.0 + 0.045 * cos(t * 20.0));
            float x = abs(beam.x) / width;
            float middle = exp(-14.0 * x * x);
            float envelope = exp(-4.5 * x * x) * (1.0 - smoothstep(0.76, 1.0, abs(beam.x)));
            float fade = pow(max(0.0, 1.0-t), 1.24);
            vec3 color = mix(blue * 1.10, cyan * 1.10, envelope * .76);
            color += vec3(.19, .58, .98) * middle * fade * .42;
            gl_FragColor = vec4(color, envelope * fade * 0.85);
            #include <tonemapping_fragment>
            #include <encodings_fragment>
          }`
      });
      const sheet = mesh(new T.PlaneGeometry(1, 1), material, 0, 0, 0, parent);
      sheet.frustumCulled = false;
      sheet.name = '渐隐蓝色尾流';
    }

    for (const [y, z, radius, length] of [[-0.25,-0.79,0.45,2.19], [-0.25,0.79,0.45,2.37], [-0.63,0,0.51,2.60]]) {
      const engine = new T.Group();
      engine.position.set(-4.72, y, z);
      engine.rotation.y = -Math.PI / 2;
      ship.add(engine);
      turnedPart([[0.01,-0.62],[radius*1.26,-0.62],[radius*1.25,-0.21],[radius*1.03,0.05],[radius*1.12,0.30],[radius*1.09,0.52],[radius*0.94,0.62],[radius*0.77,0.60],[radius*0.65,0.40]], mats.steel, engine);
      rim(radius*1.13, 0.052, 0.27, mats.dark, engine);
      rim(radius*1.03, 0.053, 0.53, mats.pearl, engine);
      rim(radius*0.86, 0.024, 0.606, mats.blue, engine);
      sphere(radius*0.75, radius*0.75, 0.09, mats.cyan, 0, 0, 0.47, engine);
      sphere(radius*0.42, radius*0.42, 0.045, mats.hot, 0, 0, 0.54, engine);
      exhaustJet(radius, length, engine);
    }
  }
