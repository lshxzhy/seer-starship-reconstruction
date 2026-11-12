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

    // Revolve separate closed profiles with narrow open slots between them.
    // Cast shoes and nozzle petals each share one indexed mesh per ring.
    function segmentedRing(parent,profile,count,gap,material,sweep=0) {
      const vertices=[],indices=[], steps=6,ringSize=steps+1;
      const pitch=2*Math.PI/count, profileLength=profile.length;
      for(let part=0;part<count;part++){
        const start=vertices.length/3, angle=part*pitch+gap*.5;
        for(const [radius,depth] of profile){
          for(let j=0;j<=steps;j++){
            const theta=angle+(pitch-gap)*j/steps+sweep*depth;
            vertices.push(radius*Math.cos(theta),radius*Math.sin(theta),depth);
          }
        }
        for(let i=0;i<profileLength;i++){
          const here=start+i*ringSize, next=start+((i+1)%profileLength)*ringSize;
          for(let j=0;j<steps;j++)indices.push(here+j,here+j+1,next+j,here+j+1,next+j+1,next+j);
        }
        // Dedicated end vertices preserve the sheared faces at each slot.
        for(const j of [0,steps]){
          const cap=vertices.length/3;
          for(let i=0;i<profileLength;i++){
            const index=(start+i*ringSize+j)*3;
            vertices.push(vertices[index],vertices[index+1],vertices[index+2]);
          }
          for(let i=1;i<profileLength-1;i++){
            if(j===0)indices.push(cap,cap+i,cap+i+1);
            else indices.push(cap,cap+i+1,cap+i);
          }
        }
      }
      const geometry=new T.BufferGeometry();
      geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
      geometry.setIndex(indices);geometry.computeVertexNormals();return mesh(geometry,material,0,0,0,parent);
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
        varying vec3 surfaceNormal;
        varying vec3 toEye;
        void main() {
          local = position;
          vec4 point = modelViewMatrix * vec4(position, 1.0);
          surfaceNormal = normalMatrix * normal;
          toEye = -point.xyz;
          gl_Position = projectionMatrix * point;
        }`,
      fragmentShader: `
        varying vec3 local;
        varying vec3 surfaceNormal;
        varying vec3 toEye;
        uniform vec3 amber;
        uniform vec3 bronze;
        uniform vec3 champagne;
        void main() {
          float r = length(local.xy);
          float angle=atan(local.y,local.x);
          float core = 1.0 - smoothstep(0.17, 0.85, r);
          float ribs=.5+.5*cos(angle*42.0+4.0*r);
          float channel=smoothstep(.50,.62,r)*(1.0-smoothstep(.85,.91,r));
          float electrode=1.0-smoothstep(.004,.018,abs(r-.625));
          float outerRing=exp(-88.0*abs(r-.918));
          vec3 color=mix(amber,bronze*.65,smoothstep(.58,.99,r));
          color=mix(color,champagne*1.62,core*.91);
          color*=1.0-channel*(.16+.23*pow(ribs,2.0));
          color+=amber*(outerRing*1.40+electrode*.41);
          vec3 n=normalize(surfaceNormal),v=normalize(toEye);
          vec3 reflected=reflect(-v,n);
          float glazing=pow(max(0.0,1.0-max(dot(n,v),0.0)),3.0);
          float gleam=pow(max(dot(reflected,normalize(vec3(-.35,.70,.6))),0.0),23.0);
          color+=vec3(.48,.65,.82)*(.24*glazing+.36*gleam);
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
      segmentedRing(housing,[[1.56,.31],[1.55,.34],[1.435,.441],[1.33,.475],
        [1.305,.465],[1.30,.453],[1.43,.424]],12,.028,mats.shadowArmor);
      segmentedRing(housing,[[1.566,.313],[1.558,.342],[1.536,.367],
        [1.511,.370],[1.528,.345]],12,.031,mats.steel);
      rim(1.20,.012,.487,mats.dark,housing);
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
            float phase=t*17.4/(1.0+.3*t);
            float flank=abs(sin(phase))-.95*x;
            float diamond=exp(-16.0*flank*flank);
            vec3 color = mix(blue * 1.10, cyan * 1.10, envelope * .76);
            color += vec3(.24,.57,.89)*diamond*fade*.46+vec3(.20,.42,.65)*middle*fade*.30;
            gl_FragColor = vec4(color, envelope * fade * (0.62 + .23*diamond));
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
      segmentedRing(engine,[[radius*1.14,.245],[radius*1.18,.28],[radius*1.125,.522],
        [radius*.973,.644],[radius*.906,.640],[radius*1.08,.499],[radius*1.10,.27]],
        16,.035,mats.edge,.16);
      segmentedRing(engine,[[radius*.775,.608],[radius*.805,.625],[radius*.747,.626],
        [radius*.595,.425],[radius*.607,.418]],18,.043,mats.steel,-.19);
      rim(radius*1.13, 0.052, 0.27, mats.dark, engine);
      rim(radius*1.12, 0.019, 0.49, mats.steel, engine);
      rim(radius*.882, 0.014, 0.611, mats.blue, engine);
      // Coolant returns bridge the moving petals to the fixed supply ring.
      // Keep the luminous throat open through all three nozzle axes.
      rim(radius*1.12,.017,.163,mats.ochre,engine);
      for(let k=0;k<8;k++){
        const a=(k+.5)*Math.PI/4,c=Math.cos(a),s=Math.sin(a);
        lineTube([[radius*1.12*c,radius*1.12*s,.163],
          [radius*1.19*c,radius*1.19*s,.204],[radius*1.17*c,radius*1.17*s,.292]],
          .011,mats.steel,engine);
      }
      sphere(radius*0.75, radius*0.75, 0.09, mats.cyan, 0, 0, 0.47, engine);
      sphere(radius*0.42, radius*0.42, 0.045, mats.hot, 0, 0, 0.54, engine);
      exhaustJet(radius, length, engine);
    }
  }
