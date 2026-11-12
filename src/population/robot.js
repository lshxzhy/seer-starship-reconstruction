  // Classic browser-game base chassis. Metres, origin at sole level, front at -Z.
  // Sources and the unsighted rear surface are documented in references/robot-audit.
  // The suit and painted officer gear use untextured enamel at every viewing distance.
  const seerShellEnamel = new T.MeshStandardMaterial({
    vertexColors:true, roughness:.35, metalness:.06, envMapIntensity:.82
  });
  const seerRobots = (() => {
    const PI = Math.PI, TAU = PI * 2;
    const restCoreY = .955, ankleY = .177, hipX = .249, hipY = .539;
    const restLegLength = hipY - ankleY, faceAxisY = .051;
    const glassZ = -.555, glassRadius = .349, glassDepth = .085;
    const paint = '$paint';
    const bronze = 0xc88b39, gold = 0xf1bf65, graphite = 0x35383d;
    const dark = 0x181b21, rubber = 0x23242a, steel = 0x8e9399;
    const hex = value => new T.Color(value).convertSRGBToLinear();
    const clamp = T.MathUtils.clamp;
    // The portrait graphics are drawn once per expression and shared across rigs.
    const faceMaterials=new Map();
    // Registration and dialogue show a rounder outside edge and a flatter
    // inside edge. The two lit areas almost meet across the dark centre.
    function eyeWhite(ctx,side,width,height) {
      const x=k=>side*width*k,y=k=>height*k;
      ctx.beginPath();ctx.moveTo(x(-.12),y(-1));
      ctx.bezierCurveTo(x(.65),y(-1.04),x(1.06),y(-.43),x(1),y(.18));
      ctx.bezierCurveTo(x(.98),y(.77),x(.48),y(1.04),x(-.18),y(.99));
      ctx.bezierCurveTo(x(-.87),y(.95),x(-.99),y(.48),x(-.98),y(-.03));
      ctx.bezierCurveTo(x(-.95),y(-.60),x(-.86),y(-.96),x(-.12),y(-1));
      ctx.closePath();
    }
    function faceMaterial(frame,officer) {
      const key=officer?officer+'/'+frame:frame;
      if (faceMaterials.has(key)) return faceMaterials.get(key);
      const canvas=document.createElement('canvas');
      canvas.width=canvas.height=512;
      const ctx=canvas.getContext('2d');
      ctx.scale(2,2);
      const panel=ctx.createRadialGradient(108,91,12,128,128,134);
      panel.addColorStop(0,'#20242b');
      panel.addColorStop(.80,'#11151b');
      panel.addColorStop(1,'#080b10');
      ctx.fillStyle=panel;
      ctx.fillRect(0,0,256,256);
      const half=frame==='half' || frame==='halfSmile';
      const opening=frame==='closed'?.055:half?.53:1;
      for (const sign of [-1,1]) {
        ctx.save();
        ctx.translate(128+sign*50,131);
        ctx.scale(1,opening);
        // Create the gradient in eye coordinates so the lower rim remains shaded.
        const white=ctx.createRadialGradient(-12,-32,9,0,2,81);
        white.addColorStop(0,'#fffefa');white.addColorStop(.78,officer==='roger'?'#d6f3f1':'#f6f6ed');
        white.addColorStop(1,'#bec8ca');
        ctx.fillStyle=white;
        eyeWhite(ctx,sign,49,79);ctx.fill();
        if (frame!=='closed') {
          ctx.translate(-sign*6,-10);
          ctx.fillStyle='#11141a';
          ctx.beginPath();
          if (frame==='smile' || frame==='halfSmile') {
            // The 2014 dialogue keeps the whites open and bends the dark pupils.
            ctx.moveTo(-24,17);
            ctx.bezierCurveTo(-20,-36,19,-38,24,17);
            ctx.bezierCurveTo(12,-6,-8,-9,-24,17);
            ctx.closePath();
          } else ctx.ellipse(0,0,16,37,-sign*.06,0,TAU);
          ctx.fill();
        }
        ctx.restore();
      }
      // The captain peers down from under his cap; Shawn's left optical pane
      // is drawn across the same moving eye instead of hiding it behind an opaque patch.
      if(officer==='roger'||officer==='raymond'){
        ctx.fillStyle='#141920';
        ctx.beginPath();ctx.moveTo(18,20);ctx.lineTo(238,20);ctx.lineTo(231,69);
        ctx.quadraticCurveTo(162,80,128,officer==='roger'?103:92);
        ctx.quadraticCurveTo(95,80,25,68);ctx.closePath();ctx.fill();
      }else if(officer==='shawn'){
        ctx.beginPath();ctx.moveTo(151,0);ctx.lineTo(256,0);ctx.lineTo(256,256);ctx.lineTo(112,256);ctx.closePath();
        const lens=ctx.createLinearGradient(130,0,225,256);
        lens.addColorStop(0,'rgba(7,73,102,.72)');lens.addColorStop(.57,'rgba(9,150,164,.58)');lens.addColorStop(1,'rgba(91,218,236,.43)');
        ctx.fillStyle=lens;ctx.fill();ctx.strokeStyle='#394d5a';ctx.lineWidth=4;ctx.stroke();
        ctx.fillStyle='rgba(98,241,255,.72)';ctx.beginPath();ctx.ellipse(194,76,10,21,-.18,0,TAU);ctx.fill();
      }
      const map=new T.CanvasTexture(canvas);
      map.encoding=T.sRGBEncoding;
      const material=new T.MeshBasicMaterial({map,toneMapped:false});
      faceMaterials.set(key,material);
      return material;
    }
    const expressions=Object.freeze({neutral:'平视',smile:'微笑',wink:'眨一只眼',surprise:'惊讶',
      focus:'专注',sleepy:'困倦',anger:'生气',curious:'好奇'});
    const expressionIds=Object.keys(expressions);
    let glyphAtlas;
    function createGlyphAtlas(){
      const canvas=document.createElement('canvas');
      canvas.width=1024;canvas.height=512;
      const ctx=canvas.getContext('2d');
      ctx.fillStyle='black';ctx.fillRect(0,0,canvas.width,canvas.height);
      for(const [index,id] of expressionIds.entries()){
        for(const side of [-1,1]){
          ctx.save();
          ctx.translate((index%4)*256+128+side*50,Math.floor(index/4)*256+131);
          ctx.fillStyle='white';ctx.strokeStyle='white';
          if((id==='wink'&&side===1)||id==='sleepy'){
            const high=id==='wink'?-14:23;
            ctx.lineWidth=id==='wink'?13:11;ctx.lineCap='round';
            ctx.beginPath();ctx.moveTo(-32,12);ctx.quadraticCurveTo(0,high,32,12);ctx.stroke();
          }else{
            if(id==='curious')ctx.translate(0,side===1?-14:8);
            const width=id==='surprise'?44:49,height=id==='surprise'?79:id==='curious'&&side===-1?55:79;
            eyeWhite(ctx,side,width,height);ctx.clip();
            if(id==='focus'||id==='anger'){
              // The inner tips of the two upper lids angle toward the nose.
              const slope=id==='anger'?-.68*side:-.20*side,top=id==='anger'?-22:-32;
              ctx.beginPath();ctx.moveTo(-55,top-55*slope);ctx.lineTo(55,top+55*slope);
              ctx.lineTo(55,90);ctx.lineTo(-55,90);ctx.closePath();ctx.clip();
            }
            ctx.fillRect(-50,-80,100,160);
            ctx.fillStyle='black';ctx.beginPath();
            ctx.translate(id==='curious'?11:-side*4,id==='surprise'?-11:-5);
            if(id==='smile'||id==='wink'){
              // The early dialogue sprite keeps the eyes lit around dark, raised arcs.
              ctx.moveTo(-25,13);ctx.bezierCurveTo(-22,-42,20,-44,25,13);
              ctx.bezierCurveTo(10,-10,-12,-10,-25,13);
            }else{
              const rx=id==='surprise'?12:16,ry=id==='surprise'?21:37;
              ctx.ellipse(0,0,rx,ry,-side*.06,0,TAU);
            }
            ctx.fill();
          }
          ctx.restore();
        }
      }
      const map=new T.CanvasTexture(canvas);
      map.minFilter=T.LinearMipmapLinearFilter;map.magFilter=T.LinearFilter;
      return map;
    }
    // The two playable rigs share the lithographic mask but have their own frame and eyelids.
    function createDisplay(){
      if(!glyphAtlas)glyphAtlas=createGlyphAtlas();
      return new T.ShaderMaterial({toneMapped:false,extensions:{derivatives:true},
        uniforms:{glyphs:{value:glyphAtlas},frame:{value:0},eyeOpen:{value:1}},
        vertexShader:`varying vec2 panelUV;
          void main(){panelUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader:`uniform sampler2D glyphs;
          uniform float frame,eyeOpen;
          varying vec2 panelUV;
          float eye(vec2 p){
            p.y=(p.y-.48)/eyeOpen+.48;
            vec2 tile=vec2(mod(frame,4.),1.-floor(frame/4.));
            return texture2D(glyphs,(tile+clamp(p,vec2(.003),vec2(.997)))/vec2(4.,2.)).r*
              step(.005,p.y)*step(p.y,.995);
          }
          void main(){
            vec2 cells=panelUV*66.,cell=abs(fract(cells)-.5);
            float footprint=max(fwidth(cells.x),fwidth(cells.y));
            float distant=smoothstep(.35,1.35,footprint);
            float dots=1.-smoothstep(.30,.48,max(cell.x,cell.y));
            float signal=mix(eye((floor(cells)+.5)/66.),eye(panelUV),distant);
            vec2 p=(panelUV-.5)*2.;
            float r=length(p);
            float rim=(1.-smoothstep(.007,.016,abs(r-.932)))*.45;
            float reflection=(1.-smoothstep(.0,.49,abs(p.y-.42*p.x-.59)))*.035;
            vec3 substrate=mix(vec3(.021,.023,.030),vec3(.043,.045,.055),1.-smoothstep(.27,.98,r));
            substrate+=reflection+vec3(.022,.092,.102)*rim;
            float emitter=mix(.58+.42*dots,.90,distant);
            vec3 light=mix(vec3(.84,.88,.89),vec3(1.,.995,.975),smoothstep(.16,.70,panelUV.y));
            gl_FragColor=vec4(mix(substrate,light,signal*emitter),1.);
          }`});
    }
    const skinMaterials = {
      fixed: new T.MeshStandardMaterial({vertexColors:true, roughness:.51, metalness:.28}),
      paint: seerShellEnamel,
      alloy: new T.MeshStandardMaterial({vertexColors:true, roughness:.34, metalness:.78}),
      machined: new T.MeshStandardMaterial({vertexColors:true, roughness:.30, metalness:.76}),
      gasket: new T.MeshStandardMaterial({vertexColors:true, roughness:.77, metalness:.03}),
      screen: faceMaterial('neutral'),
      // A single near-only glass surface catches the environment above the display stack.
      glass: new T.MeshPhysicalMaterial({vertexColors:true, roughness:.085, metalness:.05,
        clearcoat:1, clearcoatRoughness:.065, reflectivity:.59, envMapIntensity:.8,
        transparent:true, opacity:.22, blending:T.AdditiveBlending, depthWrite:false})
    };
    applyManufacturedFinish(skinMaterials.alloy,'metal');
    applyManufacturedFinish(skinMaterials.machined,'metal');
    applyManufacturedFinish(skinMaterials.gasket,'rubber');
    const suitColors = new Map(), suitMaterials = new Map();
    function suitColor(value) {
      if (!suitColors.has(value)) suitColors.set(value,hex(value));
      return suitColors.get(value);
    }
    function suitMaterial(value) {
      if (!suitMaterials.has(value)) {
        const material=seerShellEnamel.clone();
        material.color.copy(suitColor(value));
        suitMaterials.set(value,material);
      }
      return suitMaterials.get(value);
    }
    const templates = new Map();
    function template(simple,officer=false,display=false) {
      const variant=officer?'officer':simple?'crew':display?'display':'pilot';
      if (templates.has(variant)) return templates.get(variant);
      const parts = new Map(), primitives = [];
      const segments = simple ? 24 : 48;
      function profile(points, radialSegments=segments) {
        const geometry = new T.LatheGeometry(points.map(([radius,y]) => new T.Vector2(radius,y)),radialSegments);
        primitives.push(geometry);
        return geometry;
      }
      // Retain the registration silhouette while smoothing the large painted panels.
      function smoothProfile(points) {
        if (simple) return profile(points);
        const spline=new T.SplineCurve(points.slice(1).map(([x,y])=>new T.Vector2(x,y)));
        const sampled=spline.getPoints((points.length-1)*4);
        return profile([points[0],...sampled.map(p=>[Math.max(0,p.x),p.y])],88);
      }
      const drum = new T.CylinderGeometry(1,1,1,segments);
      const cube = new T.BoxGeometry(1,1,1);
      primitives.push(drum,cube);
      const pose = new T.Object3D(), normalMatrix = new T.Matrix3();
      const point = new T.Vector3(), normal = new T.Vector3();
      function cast(bone,geometry,x,y,z,w,h,d,color,mode,rx=0,ry=0,rz=0) {
        let family = color === paint ? 'paint' : (mode || 'fixed');
        if (!simple && family==='fixed') {
          if (color===gold || color===bronze) family='alloy';
          else if (color===steel) family='machined';
          else if (color===rubber || color===dark) family='gasket';
        }
        const key = bone + '/' + family;
        if (!parts.has(key)) parts.set(key,{bone,family,pos:[],norm:[],uv:family==='paint'?null:[],col:[],ix:[]});
        const dest = parts.get(key), offset = dest.pos.length/3;
        const tint = color === paint ? new T.Color(1,1,1) : hex(color);
        pose.position.set(x,y,z);
        pose.rotation.set(rx,ry,rz);
        pose.scale.set(w,h,d);
        pose.updateMatrix();
        normalMatrix.getNormalMatrix(pose.matrix);
        const positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal');
        const colors=geometry.getAttribute('color'),texcoords=geometry.getAttribute('uv');
        for (let i=0;i<positions.count;i++) {
          point.fromBufferAttribute(positions,i).applyMatrix4(pose.matrix);
          normal.fromBufferAttribute(normals,i).applyNormalMatrix(normalMatrix);
          dest.pos.push(point.x,point.y,point.z);
          dest.norm.push(normal.x,normal.y,normal.z);
          if(dest.uv)dest.uv.push(texcoords.getX(i),texcoords.getY(i));
          if (colors) dest.col.push(tint.r*colors.getX(i),tint.g*colors.getY(i),tint.b*colors.getZ(i));
          else dest.col.push(tint.r,tint.g,tint.b);
        }
        if(geometry.index)for(let i=0;i<geometry.index.count;i++)dest.ix.push(geometry.index.getX(i)+offset);
        else for(let i=0;i<positions.count;i++)dest.ix.push(i+offset);
      }
      function coreShape(shape,x,y,z,color,rx=0,ry=0,rz=0) {
        cast('core',shape,x,y,z,1,1,1,color,null,rx,ry,rz);
      }

      // One equipment shell carries the optics, side covers and leg mounts.
      const shell = smoothProfile([[0,-.408],[.35,-.405],[.447,-.358],[.508,-.27],[.539,-.15],
        [.548,-.052],[.544,.046],[.522,.158],[.474,.265],[.395,.357],[.302,.425],
        [.206,.47],[.105,.491],[0,.5]]);
      cast('core',shell,0,0,.005,1,1,.98,paint);
      const lowerBand = profile([[0,-.100],[.502,-.100],[.55,-.081],[.568,-.058],
        [.568,.061],[.555,.084],[.526,.096],[0,.096]]);
      coreShape(lowerBand,0,-.319,0,gold);
      const rolledEdge = profile([[.528,-.013],[.559,-.013],[.567,-.004],
        [.567,.005],[.558,.013],[.528,.013]]);
      coreShape(rolledEdge,0,-.388,0,bronze);
      coreShape(rolledEdge,0,-.252,0,bronze);
      if (!simple) {
        const bandSeal = profile([[.510,0],[.539,0],[.545,.003],[.545,.008],[.535,.012],[.51,.012]]);
        coreShape(bandSeal,0,-.226,0,rubber);
      }
      const rivet = profile([[0,-.015],[.058,-.015],[.068,-.006],[.068,.014],
        [.059,.024],[.048,.028],[0,.029]]);
      const studCap = simple ? null : profile([[0,-.001],[.046,-.001],[.047,.001],
        [.045,.004],[.024,.004],[.020,.002],[.015,.002],[.014,.004],[0,.004]],32);
      for (let i=0;i<8;i++) {
        const a=i*TAU/8, x=Math.sin(a), z=-Math.cos(a);
        // Place the local +Y axis of each stud radially outwards.
        cast('core',rivet,x*.561,-.325,z*.561,1,1,1,graphite,null,-PI/2,0,-a);
        if (!simple) cast('core',studCap,x*.591,-.325,z*.591,1,1,1,0x788186,'machined',-PI/2,0,-a);
      }

      // Short plug with a flat, broad button on the crown.
      const stem = profile([[0,-.012],[.098,-.012],[.099,.017],[.082,.026],
        [.082,.075],[.099,.081],[0,.081]]);
      const button = profile([[0,0],[.153,0],[.195,.014],[.218,.085],[.234,.103],
        [.231,.122],[.206,.134],[.104,.139],[0,.139]]);
      const rake=.13;
      function crown(g,y,col,sy=1){
        cast('core',g,0,.483+(y-.483)*Math.cos(rake),(y-.483)*Math.sin(rake),1,sy,1,col,null,rake);
      }
      if(!officer){
        crown(stem,.483,graphite);
        crown(button,.563,paint,1.27);
      }
      if (!simple&&!officer) {
        const socketLip=profile([[.078,0],[.104,0],[.112,.005],[.111,.012],[.100,.017],[.078,.017]]);
        coreShape(socketLip,0,.487,0,0x696d70);
        const capInset=profile([[.143,0],[.154,0],[.155,.002],[.153,.004],[.145,.004],[.143,.002]]);
        crown(capInset,.736,graphite);
      }

      // The side-on assembly frame shows a round gold service cover. The rear
      // follows the existing shell contour because a rear reference is missing.
      const sideCover = profile([[0,-.064],[.244,-.064],[.284,-.027],[.292,-.001],
        [.284,.016],[.257,.033],[0,.033]]);
      const brassRim=profile([[.225,0],[.257,0],[.274,.007],[.274,.014],
        [.265,.024],[.236,.024],[.225,.018],[.225,0]]);
      // One diagonal slot and two short parallel stamps are cut into the
      // circular gold cheek, with the graphite liner showing through the holes.
      const slots=[[-.053,.031,.245,.049,-.72],[.044,.027,.085,.045,.71],
        [-.003,-.090,.076,.047,.71]];
      function stampedCheek(){
        const face=new T.Shape();face.absarc(0,0,.227,0,TAU,false);
        for(const [x,y,length,width,tilt] of slots){
          const hole=new T.Path(),c=Math.cos(tilt),s=Math.sin(tilt);
          const corners=[[-1,-1],[-1,1],[1,1],[1,-1]];
          for(const [i,[a,b]] of corners.entries()){
            const u=a*width/2,v=b*length/2;
            hole[i?'lineTo':'moveTo'](x+u*c-v*s,y+u*s+v*c);
          }
          hole.closePath();face.holes.push(hole);
        }
        const g=new T.ExtrudeGeometry(face,{depth:.007,curveSegments:24,bevelEnabled:true,
          bevelThickness:.002,bevelSize:.002,bevelSegments:2});
        primitives.push(g);return g;
      }
      const cheek=simple?null:stampedCheek();
      for (const sign of [-1,1]) {
        coreShape(sideCover,sign*.499,-.005,.031,graphite,0,0,-sign*PI/2);
        coreShape(brassRim,sign*.533,-.005,.031,gold,0,0,-sign*PI/2);
        cast('core',drum,sign*.546,-.005,.031,.228,.010,.228,simple?gold:graphite,null,0,0,PI/2);
        if(cheek)cast('core',cheek,sign*.551,-.005,.031,1,1,1,0xe7b45b,'alloy',0,sign*PI/2);
        else for(const [u,v,h,w,tilt] of slots)
          cast('core',cube,sign*.553,-.005+v,.031-sign*u,.006,h,w,graphite,null,sign*tilt);
      }

      // Removable rear access plate follows the painted shell rather than
      // adding a backpack to the round silhouette of the registration sprite.
      const rearLip=profile([[.205,0],[.228,.001],[.232,.007],[.228,.012],[.206,.013],[.205,0]]);
      cast('core',rearLip,0,-.02,.510,1,.70,.84,bronze,null,PI/2);
      const rearCover=new T.SphereGeometry(1,simple?18:36,simple?10:18);
      primitives.push(rearCover);
      cast('core',rearCover,0,-.02,.473,.209,.177,.086,paint);
      for(const sign of [-1,1])
        cast('core',cube,sign*.148,-.02,.537,.034,.008,.010,graphite,null,0,sign*.33);
      if(!simple){
        // Recessed ventilation slots follow the dome of the service door.
        // The two short return flanges stay seated on its curved enamel.
        for(let row=0;row<4;row++){
          const y=-.083+row*.040,z=.473+.086*Math.sqrt(1-(y/.177)**2);
          const width=.108-.015*Math.abs(row-1.5);
          cast('core',cube,0,y-.02,z,width,.011,.006,graphite);
          for(const flank of [-1,1])
            cast('core',cube,flank*width*.62,y-.018,z-.004,width*.26,.009,.005,graphite,null,0,flank*.18);
        }
        for(const side of [-1,1]){
          const lug=profile([[.018,0],[.028,.003],[.030,.009],[.025,.014],[.018,.012]],20);
          cast('core',lug,side*.120,.075,.528,1,1,1,steel,'machined',PI/2,0,-side*.23);
        }
      }

      const faceY = faceAxisY;
      const panelZ=display?-.574:glassZ,panelDepth=display?.069:glassDepth;
      const collar=profile([[.350,-.195],[.378,-.16],[.407,-.081],
        [.410,-.068],[.396,-.064],[.356,-.089]],simple?24:64);
      coreShape(collar,0,faceY,-.498,0x494950,-PI/2);
      const bezel = profile([[.339,-.130],[.374,-.13],[.409,-.097],[.419,-.056],
        [.419,.033],[.407,.061],[.384,.073],[.351,.073],[.339,.062],[.339,-.130]],simple?segments:88);
      coreShape(bezel,0,faceY,-.498,graphite,-PI/2);
      if (!simple) {
        const lip=profile([[.338,.067],[.350,.067],[.353,.070],[.352,.075],
          [.348,.077],[.343,.077],[.339,.074],[.338,.067]],88);
        coreShape(lip,0,faceY,-.498,0x4e5359,-PI/2);
        const glassSeal=profile([[.334,.067],[.342,.066],[.345,.069],[.344,.073],
          [.339,.074],[.335,.072],[.334,.067]],88);
        coreShape(glassSeal,0,faceY,-.498,rubber,-PI/2);
        // A countersink seats the hexagonal drive below the front of each screw head.
        const fastener=profile([[0,-.002],[.017,-.002],[.017,.001],[.014,.003],
          [.008,.003],[.006,.001],[0,.001]],24);
        const hexSocket=profile([[0,0],[.005,0],[.005,.001],[0,.001]],6);
        for (let i=0;i<8;i++) {
          const a=TAU*(i+.5)/8;
          const x=.384*Math.cos(a), y=faceY+.384*Math.sin(a);
          cast('core',fastener,x,y,-.573,1.22,1,1.22,0x393d42,'machined',-PI/2);
          cast('core',hexSocket,x,y,-.5743,1,1,1,dark,'gasket',-PI/2);
        }
        // Only the front hemisphere is drawn. The eye graphics stay below the glass.
        const cover=new T.SphereGeometry(1,64,40,PI,PI);
        primitives.push(cover);
        cast('core',cover,0,faceY,panelZ,glassRadius,glassRadius,panelDepth+(display?.010:.031),0x12181b,'glass');
      }
      const screen=new T.SphereGeometry(1,simple?22:48,simple?14:32,PI,PI);
      const pos=screen.getAttribute('position'), uv=screen.getAttribute('uv');
      for (let i=0;i<pos.count;i++) uv.setXY(i,(1-pos.getX(i))/2,(1+pos.getY(i))/2);
      screen.scale(glassRadius,glassRadius,panelDepth);
      screen.translate(0,faceY,panelZ);

      const sole = profile([[0,0],[.94,0],[1,.022],[1,.032],[.94,.05],[0,.05]]);
      const shoe = smoothProfile([[0,0],[.95,0],[1,.018],[.99,.044],[.91,.075],[.72,.101],
        [.54,.119],[.26,.13],[0,.133]]);
      // The production sprite has a broad toe, a pinched heel and a gold rail
      // that rises around the toe before returning to the outside of the sole.
      for(const g of [sole,shoe]){
        const p=g.attributes.position;
        for(let i=0;i<p.count;i++)p.setX(i,p.getX(i)*(1.04-.13*p.getZ(i)));
        g.computeVertexNormals();
      }
      function toeRail(sign){
        const pts=[],coords=[],ix=[],count=simple?10:22;
        for(let i=0;i<=count;i++){
          const t=i/count,a=-sign*.25+(t-.5)*1.43;
          const h=.035+.075*Math.sin(Math.PI*t)**.46;
          for(const [j,[rise,r]] of [[.034,1],[h-.009,1.01],[h,.976],[h-.022,.913]].entries()){
            pts.push(.225*r*Math.sin(a),rise,-.051-.259*r*Math.cos(a));
            coords.push(t,j/3);
          }
          if(i)for(let j=0;j<3;j++){
            const v=i*4+j;ix.push(v-4,v-3,v,v,v-3,v+1);
          }
        }
        const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));
        g.setAttribute('uv',new T.Float32BufferAttribute(coords,2));
        g.setIndex(ix);g.computeVertexNormals();primitives.push(g);return g;
      }
      const legProfile=[[.060,-restLegLength],[.073,-restLegLength+.012]];
      for(let i=0;i<6;i++){
        const y=-restLegLength+.024+.052*i;
        legProfile.push([.067,y],[.066,y+.008],[.075,y+.014],[.076,y+.032],[.070,y+.038]);
      }
      legProfile.push([.070,-.019],[.063,-.006]);
      const gaiter=profile(legProfile,simple?14:28);
      for (const sign of [-1,1]) {
        const side=sign<0?'L':'R', leg='leg'+side, foot='foot'+side;
        cast(leg,gaiter,0,0,0,1,1,1,0x697175,'machined');
        cast(foot,sole,0,-ankleY,-.051,.222,1,.258,rubber);
        cast(foot,sole,0,-ankleY+.032,-.051,.226,.78,.26,gold);
        cast(foot,shoe,0,-ankleY+.058,-.050,.211,1,.247,paint);
        cast(foot,drum,0,-.003,0,.103,.040,.105,bronze);
        cast(foot,drum,0,.020,0,.084,.014,.086,gold);
        cast(foot,toeRail(sign),0,-ankleY,0,1,1,1,gold);
        if(!simple){
          const pivot=profile([[0,-.018],[.066,-.018],[.076,-.010],[.076,.011],[.064,.018],[.035,.018],[.031,.012],[0,.012]],32);
          cast(foot,pivot,sign*.080,-.014,-.004,1,1,1,steel,'machined',0,0,-sign*PI/2);
          cast(foot,drum,sign*.102,-.014,-.004,.033,.009,.033,graphite,null,0,0,PI/2);
          for(let j=0;j<3;j++)
            cast(foot,cube,sign*.177,-ankleY+.029,-.145+j*.074,.030,.011,.032,graphite);
          cast(foot,cube,0,-.093,.159,.105,.026,.023,rubber,null,.18);
        }
      }

      const entries=[];
      for (const entry of parts.values()) {
        const geometry=new T.BufferGeometry();
        geometry.setAttribute('position',new T.Float32BufferAttribute(entry.pos,3));
        geometry.setAttribute('normal',new T.Float32BufferAttribute(entry.norm,3));
        if(entry.uv)geometry.setAttribute('uv',new T.Float32BufferAttribute(entry.uv,2));
        geometry.setAttribute('color',new T.Float32BufferAttribute(entry.col,3));
        geometry.setIndex(entry.ix);
        geometry.computeBoundingSphere();
        entries.push({bone:entry.bone,family:entry.family,geometry});
      }
      for (const geometry of primitives) geometry.dispose();
      entries.push({bone:'core',family:'screen',geometry:screen});
      templates.set(variant,entries);
      return entries;
    }

    function skeleton() {
      const root=new T.Group(), bones={};
      for (const name of ['core','legL','legR','footL','footR']) {
        const joint=new T.Group();
        joint.name=name;
        root.add(joint);
        bones[name]=joint;
      }
      return {root,bones,clock:0,lastYaw:0,turn:0};
    }
    const down = new T.Vector3(0,-1,0), axis = new T.Vector3();
    function stepLength(speed) {return .68+.22*clamp(Math.abs(speed)/3.2,0,1);}
    function phaseStep(speed,dt) {return TAU*Math.abs(speed)*dt/stepLength(speed);}
    function applyPose(rig,phase,speed,idleTime,riding=false) {
      const v=Math.abs(speed), weight=clamp(v/.38,0,1), run=clamp((v-1.5)/2.5,0,1);
      const stance=.55-.085*run, reach=stepLength(speed)*stance*.5;
      const bones=rig.bones, core=bones.core;
      core.position.set(0,restCoreY+.006*Math.sin(idleTime*2)*(1-weight)-.014*Math.cos(phase*2)*weight,0);
      core.rotation.set(-.042*run*weight,rig.turn+.014*Math.sin(idleTime*.74)*(1-weight),
        .019*Math.sin(phase)*weight);
      if(riding){
        core.position.y-=.11;
        core.position.z=.055;
      }
      for(const sign of [-1,1]) {
        const side=sign<0?'L':'R', leg=bones['leg'+side], foot=bones['foot'+side];
        const t=((phase/TAU+(sign>0?.5:0))%1+1)%1;
        const swing=clamp((t-stance)/(1-stance),0,1);
        const blend=swing*swing*swing*(10+swing*(-15+6*swing));
        const z=(t<stance?-reach+2*reach*t/stance:reach*(1-2*blend))*weight;
        const lift=Math.sin(PI*swing)*(.070+.035*run)*weight;
        foot.position.set(sign*hipX,ankleY+lift,riding?-.11:z);
        foot.rotation.set(-.10*Math.sin(TAU*swing)*weight,-sign*.13,0);
        // The sleeve spans both endpoints while the grounded shoe is stationary.
        leg.position.set(sign*hipX,hipY-restCoreY,0).applyQuaternion(core.quaternion).add(core.position);
        axis.subVectors(foot.position,leg.position);
        leg.scale.y=axis.length()/restLegLength;
        leg.quaternion.setFromUnitVectors(down,axis.normalize());
      }
    }
    function create(color=0xcb4d3a,options={}){
      const rig=skeleton();
      rig.root.name=options.name||'赛尔机器人';
      rig.expression='neutral';
      rig.portrait=['roger','raymond','shawn'].includes(options.officer)?options.officer:null;
      rig.faceFrame='neutral';
      for(const entry of template(options.simple===true,Boolean(options.officer),options.display===true)){
        const m=entry.family==='paint'?suitMaterial(color):skinMaterials[entry.family];
        const mesh=new T.Mesh(entry.geometry,m);
        const opaqueBody=entry.family!=='glass' && entry.family!=='screen';
        mesh.castShadow=options.castShadow!==false && opaqueBody;
        mesh.receiveShadow=opaqueBody;
        if (entry.family==='screen') {
          mesh.name=options.display?'小赛尔 · 点阵电子屏':'赛尔面盘 · 曲面显示屏';
          rig.display=options.display?createDisplay():null;
          mesh.material=rig.display||faceMaterial('neutral',rig.portrait);
          rig.screen=mesh;
        }
        rig.bones[entry.bone].add(mesh);
      }
      applyPose(rig,0,0,0);return rig;
    }
    function showFaceFrame(rig,frame){
      if (rig.faceFrame===frame) return;
      rig.screen.material=faceMaterial(frame,rig.portrait);
      rig.faceFrame=frame;
    }
    function setExpression(rig,expression){
      if(rig?.display){
        const index=expressionIds.indexOf(expression);
        if(index<0)return false;
        rig.expression=expression;rig.display.uniforms.frame.value=index;return true;
      }
      if (!rig || !rig.screen || (expression!=='neutral' && expression!=='smile')) return false;
      rig.expression=expression;
      showFaceFrame(rig,expression);
      return true;
    }
    function animate(rig,phase,speed,dt=1/60,riding=false){
      const step=clamp(Number.isFinite(dt)?dt:0,0,.12);
      const yaw=rig.root.rotation.y;
      const angle=Math.atan2(Math.sin(yaw-rig.lastYaw),Math.cos(yaw-rig.lastYaw));
      const target=step>0?clamp(angle/step*.07,-.23,.23):0;
      rig.turn+=(target-rig.turn)*(1-Math.exp(-step*12));
      rig.lastYaw=yaw;rig.clock+=step;
      applyPose(rig,phase,speed,rig.clock,riding);
      const blink=rig.clock%4.3;
      if(rig.display){
        const closing=clamp((blink-3.74)/.22,0,1);
        rig.display.uniforms.eyeOpen.value=1-.92*Math.sin(PI*closing)**2;
        return;
      }
      let frame=rig.expression;
      if (blink>=3.80 && blink<3.98) {
        if (blink>=3.84 && blink<3.93) frame='closed';
        else frame=rig.expression==='smile'?'halfSmile':'half';
      }
      showFaceFrame(rig,frame);
    }
    function createBatch(capacity){
      const root=new T.Group(),rig=skeleton();
      root.name='附近赛尔 · 分段实例';
      const parts=template(true).map(entry=>{
        const mesh=new T.InstancedMesh(entry.geometry,skinMaterials[entry.family],capacity);
        // r128 allocates instanceColor on its first write using mesh.count.
        // Reserve the whole buffer before hiding this initially empty batch.
        if(entry.family==='paint'){
          mesh.setColorAt(0,new T.Color(1,1,1));
          mesh.instanceColor.setUsage(T.DynamicDrawUsage);
        }
        mesh.count=0;mesh.frustumCulled=false;mesh.receiveShadow=entry.family!=='screen';
        mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(mesh);
        return {mesh,bone:rig.bones[entry.bone],tinted:entry.family==='paint'};
      });
      const previousColors=new Array(capacity);
      function write(slot,x,y,z,yaw,color,phase,speed){
        if(slot<0||slot>=capacity)return;
        rig.root.position.set(x,y,z);rig.root.rotation.y=yaw;
        applyPose(rig,phase,speed,slot*.57+phase*.13);rig.root.updateMatrixWorld(true);
        const tintChanged=previousColors[slot]!==color;
        for(const {mesh,bone,tinted} of parts){
          mesh.setMatrixAt(slot,bone.matrixWorld);
          if(tinted && tintChanged)mesh.setColorAt(slot,suitColor(color));
        }
        previousColors[slot]=color;
        return rig.bones;
      }
      function finish(count){
        const n=clamp(count,0,capacity);
        for(const {mesh} of parts){
          mesh.count=n;
          if(n)mesh.instanceMatrix.needsUpdate=true;
          if(n&&mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
        }
      }
      return {root,write,finish,capacity};
    }
    return {create,animate,createBatch,phaseStep,setExpression,expressions,height:1.70,eyeHeight:restCoreY+faceAxisY};
  })();
