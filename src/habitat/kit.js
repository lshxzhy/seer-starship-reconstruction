  // Cabin assets are authored in metres. Primitives are shared across rooms;
  // each invocation puts its equipment, lining and doorway in one local frame.
  const cabinAssets = { geometries:new Map(), materials:new Map(), canvases:new Map() };
  function cabinAsset(collection,key,make){
    if(!collection.has(key))collection.set(key,make());
    return collection.get(key);
  }

  function buildRoomKit(parent,spec){
    const W=spec.width,D=spec.depth,H=spec.height;
    const halfW=W/2,halfD=D/2;
    const root=parent;
    const geom=(key,fn)=>cabinAsset(cabinAssets.geometries,key,fn);
    const texture=(key,fn)=>cabinAsset(cabinAssets.canvases,key,fn);
    const material=(color,opts={})=>{
      if(color?.isMaterial)return color;
      const tint=new T.Color(color===undefined?0xc9d4d9:color);
      const glow=opts.glow||0,roughness=opts.roughness??.53,metalness=opts.metalness??.23;
      const opacity=opts.opacity??1;
      const key=[tint.getHex(),glow,roughness,metalness,opacity].join('/');
      return cabinAsset(cabinAssets.materials,key,()=>{
        tint.convertSRGBToLinear();
        return new T.MeshStandardMaterial({color:tint,roughness,metalness,
          emissive:tint.clone(),emissiveIntensity:glow,transparent:opacity<1,
          opacity,depthWrite:opacity>=1});
      });
    };
    const blocks=root.userData.blocks||(root.userData.blocks=[]);
    function block(x,z,w,d){
      if([x,z,w,d].every(Number.isFinite)&&w>0&&d>0)blocks.push({x,z,w,d});
    }

    const boxGeometry=geom('unit-box',()=>new T.BoxGeometry(1,1,1));
    const sphereGeometry=geom('unit-sphere',()=>new T.SphereGeometry(1,32,20));
    const faceGeometry=geom('unit-face',()=>new T.PlaneGeometry(1,1));
    function place(geometry,paint,x,y,z,opts={}){
      const m=new T.Mesh(geometry,paint);
      m.position.set(x,y,z);m.rotation.set(opts.rx||0,opts.ry||0,opts.rz||0);
      if(opts.name)m.name=opts.name;
      m.receiveShadow=opts.shadow!==false&&!paint.transparent;
      // Detailed cabins are normally lit by their own view's environment.
      // Only opt in to casting for large silhouettes that actually need it.
      m.castShadow=opts.castShadow===true;
      (opts.parent||root).add(m);
      return m;
    }
    function box(x,y,z,w,h,d,color,opts={}){
      const m=place(boxGeometry,material(color,opts),x,y,z,opts);
      m.scale.set(w,h,d);return m;
    }
    function cyl(x,y,z,rt,rb,h,color,opts={}){
      const segments=opts.segments||40,r=Math.max(rt,rb,1e-5);
      const ratioTop=rt/r,ratioBottom=rb/r;
      const g=geom('drum/'+ratioTop+'/'+ratioBottom+'/'+segments,
        ()=>new T.CylinderGeometry(ratioTop,ratioBottom,1,segments));
      const m=place(g,material(color,opts),x,y,z,opts);m.scale.set(r,h,r);return m;
    }
    function ball(x,y,z,rx,ry,rz,color,opts={}){
      const m=place(sphereGeometry,material(color,opts),x,y,z,opts);
      m.scale.set(rx,ry,rz);return m;
    }
    function beam(a,b,w,d,color,opts={}){
      const start=new T.Vector3().fromArray(a),end=new T.Vector3().fromArray(b);
      const delta=end.clone().sub(start),middle=start.addScaledVector(delta,.5);
      const m=box(middle.x,middle.y,middle.z,w,delta.length(),d,color,opts);
      if(delta.lengthSq())m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());
      return m;
    }
    function pipe(points,r,color,opts={}){
      if(points.length<2)throw new Error('管件至少需要两个端点');
      const positions=points.map(v=>new T.Vector3().fromArray(v));
      const curve=points.length===2?new T.LineCurve3(positions[0],positions[1])
        :new T.CatmullRomCurve3(positions,opts.closed===true,'centripetal');
      const lengthSegments=points.length===2?1:Math.min(240,(points.length-1)*6);
      const g=new T.TubeGeometry(curve,lengthSegments,r,opts.segments||10,opts.closed===true);
      return place(g,material(color,opts),0,0,0,opts);
    }
    function torus(x,y,z,r,tube,color,opts={}){
      const ratio=tube/Math.max(r,1e-5),arc=opts.arc??Math.PI*2,segments=opts.segments||64;
      const g=geom('ring/'+ratio+'/'+arc+'/'+segments,
        ()=>new T.TorusGeometry(1,ratio,10,segments,arc));
      const m=place(g,material(color,opts),x,y,z,opts);m.scale.setScalar(r);return m;
    }

    function canvasMap(width,height,paint){
      const c=document.createElement('canvas');c.width=width;c.height=height;
      paint(c.getContext('2d'),width,height);
      const map=new T.CanvasTexture(c);map.encoding=T.sRGBEncoding;
      map.anisotropy=4;
      return map;
    }
    function face(x,y,z,w,h,map,opts={}){
      const key='face/'+map.uuid;
      const paint=cabinAsset(cabinAssets.materials,key,()=>new T.MeshBasicMaterial({
        map,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,
        side:T.FrontSide,toneMapped:false
      }));
      const m=place(faceGeometry,paint,x,y,z,opts);m.scale.set(w,h,1);return m;
    }
    function cssHex(color){return '#'+new T.Color(color).getHexString();}
    function text(x,y,z,value,w,h,color,opts={}){
      const label=String(value),tint=cssHex(color??0xc9e9fc);
      const aspect=Math.max(.25,Math.min(18,w/h));
      const width=Math.min(1024,Math.max(96,Math.round(128*aspect)));
      const height=Math.round(width/aspect);
      const key='ink/'+label+'/'+tint+'/'+width+'/'+height;
      const map=texture(key,()=>canvasMap(width,height,(ctx,pw,ph)=>{
        const typeface='system-ui, "Microsoft YaHei", sans-serif';
        ctx.font='600 '+Math.round(ph*.77)+'px '+typeface;
        const measured=ctx.measureText(label).width;
        const size=Math.max(5,Math.floor(ph*.77*Math.min(1,(pw*.96)/Math.max(1,measured))));
        ctx.font='600 '+size+'px '+typeface;ctx.fillStyle=tint;
        ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillText(label,pw/2,ph*.52);
      }));
      return face(x,y,z,w,h,map,opts);
    }
    function panel(x,y,z,w,h,color,opts={}){
      const frame=new T.Group();frame.position.set(x,y,z);
      frame.rotation.set(opts.rx||0,opts.ry||0,opts.rz||0);(opts.parent||root).add(frame);
      const tint=cssHex(color??0x65d4da), key='display/'+tint;
      const map=texture(key,()=>canvasMap(384,192,(ctx,pw,ph)=>{
        ctx.fillStyle='#112a37';ctx.fillRect(0,0,pw,ph);
        ctx.strokeStyle='#284753';ctx.lineWidth=1;
        for(let n=20;n<380;n+=24){ctx.beginPath();ctx.moveTo(n,22);ctx.lineTo(n,ph-15);ctx.stroke();}
        for(let n=22;n<185;n+=23){ctx.beginPath();ctx.moveTo(10,n);ctx.lineTo(pw-10,n);ctx.stroke();}
        ctx.fillStyle=tint;ctx.fillRect(15,12,53,5);ctx.fillRect(330,12,33,4);
        ctx.strokeStyle=tint;ctx.lineWidth=3;ctx.beginPath();
        for(let i=0;i<=63;i++){const X=14+i*3.65,Y=101+15*Math.sin(i*.27)+8*Math.cos(i*.70)-19*Math.sin(i*.09);
          if(i===0)ctx.moveTo(X,Y);else ctx.lineTo(X,Y);}
        ctx.stroke();ctx.lineWidth=4;
        ctx.beginPath();ctx.arc(309,84,33,-Math.PI*.77,Math.PI*.82);ctx.stroke();
        ctx.lineWidth=1;ctx.beginPath();ctx.arc(309,84,26,0,Math.PI*2);ctx.stroke();
        for(let j=0;j<7;j++)ctx.fillRect(19+j*32,158,18-j,4);
      }));
      box(0,0,0,w,h,.075,0x273f4a,{parent:frame,roughness:.32});
      face(0,0,.040,w*.94,h*.88,map,{parent:frame});
      return frame;
    }

    const family=spec.id||'';
    const defaultAccent=({power:0xf2aa48,machine:0xdfa24d,workshop:0xc0ce64,
      honors:0xe7b35a,captain:0x71adce,archives:0x66aab7,laboratory:0x4cc8b9,
      observation:0x64c5de,terraceAccess:0x7fd3e4,teleport:0x52cbdc,
      instructor:0xf1ad58})[family]??0x6bc4d1;
    // The camera sees tens of square metres of shell behind each focal
    // machine. Its paint, deck finish and framing belong to the compartment,
    // just as much as the machinery. These are design swatches derived from
    // the reference families, not measured game colours.
    //               shell     inset     spar      recess    deck      soffit
    const liveries={
      teleport:    [0x7b5436,0xc09a62,0x694a34,0x293b4d,0x4a535b,0x806449],
      power:       [0x4e453b,0x8c7051,0x48494a,0x24292d,0x383431,0x49413b],
      machine:     [0x68695f,0x9f9d84,0x3c525c,0x27343b,0x696f67,0x64716e],
      workshop:    [0x9d896a,0xc3ab7e,0x57636a,0x343d45,0x9d947b,0x847a68],
      instructor:  [0x64756a,0xb9ba9c,0x4d665a,0x33483e,0x747a70,0x747d6f],
      laboratory:  [0x74938e,0xb6c9b4,0x467575,0x294749,0x789190,0x829a96],
      archives:    [0x4a6455,0x8fa794,0x385a4c,0x273d3d,0x536d63,0x5b7269],
      honors:      [0x687b91,0xd6ceaf,0x4a647d,0x233d56,0x7d8d99,0x8c98a1],
      captain:     [0x536678,0xb4b6ac,0x384d60,0x273846,0x626d76,0x63788a],
      observation: [0x38415b,0x5b6786,0x333b56,0x1b2138,0x444f67,0x3c4862],
      terraceAccess:[0x718a97,0xa2b5bf,0x486d7c,0x294853,0x748d96,0x728c9a]
    };
    const swatch=liveries[family]||[0x899aa1,0xafb9b8,0x596d78,0x304351,0x718088,0x7f9099];
    const paint=spec.palette||{};
    const accent=spec.accent??paint.accent??defaultAccent;
    const wall=paint.wall??swatch[0],lining=paint.lining??swatch[1];
    const frameColor=paint.frame??swatch[2],dark=paint.dark??swatch[3];
    const floorColor=paint.floor??swatch[4],ceiling=paint.ceiling??swatch[5];
    const industrial=family==='power'||family==='teleport';
    const openEdge=family==='terraceAccess' && spec.openRoof===true;
    const shell=new T.Group();shell.name='舱室内衬';root.add(shell);
    const roof=new T.Group();roof.name='顶棚与上部横梁';roof.userData.roof=true;shell.add(roof);
    const shellOpts={parent:shell};
    const roofOpts={parent:roof};
    const shellBox=(x,y,z,w,h,d,c,opts={})=>box(x,y,z,w,h,d,c,{...shellOpts,...opts});
    const roofBox=(x,y,z,w,h,d,c,opts={})=>box(x,y,z,w,h,d,c,{...roofOpts,...opts});
    const floorFace=box(0,-.125,0,W,.25,D,frameColor,shellOpts);
    floorFace.name='连续甲板';

    // Draw a repeating, two-metre removable plate with captive screws and a
    // shallow maintenance grip. The aspect of the pattern stays physical even
    // when the compartment sizes differ.
    const floorMap=texture('floor/'+family+'/'+W+'/'+D+'/'+cssHex(floorColor),()=> {
      const map=canvasMap(256,256,(ctx,pw,ph)=>{
        ctx.fillStyle=cssHex(floorColor);ctx.fillRect(0,0,pw,ph);
        ctx.strokeStyle='rgba(20,35,45,.35)';ctx.lineWidth=1.8;
        ctx.strokeRect(2,2,252,252);ctx.strokeStyle='rgba(233,241,236,.18)';ctx.strokeRect(4,4,248,248);
        ctx.fillStyle='rgba(28,45,53,.58)';
        for(const x of [12,244])for(const y of [12,244]){ctx.beginPath();ctx.arc(x,y,2.15,0,Math.PI*2);ctx.fill();}
        ctx.fillStyle='rgba(30,46,54,.24)';
        for(let j=0;j<3;j++)ctx.fillRect(103,232+j*3,48,1.5);
        if(family==='power'){
          ctx.fillStyle='rgba(206,164,107,.16)';
          for(let y=28;y<227;y+=18)for(let x=18;x<240;x+=22){
            const offset=(y%36===28)?8:0;
            ctx.beginPath();ctx.moveTo(x+offset,y);ctx.lineTo(x+offset+5,y-3);
            ctx.lineTo(x+offset+9,y-3);ctx.lineTo(x+offset+4,y+1);ctx.fill();
          }
        }
      });
      map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(W/2,D/2);return map;
    });
    const floorMaterial=cabinAsset(cabinAssets.materials,'floor/'+floorMap.uuid,
      ()=>new T.MeshStandardMaterial({map:floorMap,roughness:.72,metalness:.12}));
    const tiles=place(faceGeometry,floorMaterial,0,.004,0,{rx:-Math.PI/2,parent:shell});
    tiles.scale.set(W,D,1);

    // The clear door opening is part of the wall geometry, including the
    // header, jambs and threshold. Room-specific builders keep this axis free.
    const doorWidth=Math.min(spec.doorWidth??3.4,W-.8);
    const doorHeight=Math.min(spec.doorHeight??3.1,H-.38);
    root.userData.door=[0,0,halfD];
    root.userData.doorWidth=doorWidth;root.userData.doorHeight=doorHeight;
    const t=.22,sideWidth=(W-doorWidth)/2;
    for(const side of [-1,1]){
      shellBox(side*(doorWidth+sideWidth)/2,H/2,halfD+t/2,sideWidth,H,t,wall);
      shellBox(side*(doorWidth/2+.105),doorHeight/2,halfD,.21,doorHeight,.53,dark);
      shellBox(side*(doorWidth/2+.19),doorHeight/2,halfD-.22,.13,doorHeight,.22,lining);
      shellBox(side*(doorWidth/2+.27),doorHeight*.73,halfD-.35,.07,.59,.05,accent,{glow:.46});
      shellBox(side*(doorWidth/2+.39),1.34,halfD-.15,.20,.32,.11,dark);
    }
    shellBox(0,(H+doorHeight)/2,halfD+t/2,doorWidth,H-doorHeight,t,wall);
    shellBox(0,doorHeight+.11,halfD,doorWidth+.48,.22,.52,frameColor);
    shellBox(0,doorHeight+.22,halfD-.21,doorWidth*.48,.065,.13,accent,{glow:.7});
    shellBox(0,.015,halfD-.16,doorWidth,.023,.28,frameColor);
    for(let i=-2;i<=2;i++)shellBox(i*.37,.030,halfD-.16,.16,.010,.10,accent);

    // Extruded shell casting: section coordinates are (inward depth,height)
    // and the third dimension follows a wall bay. Reusing the section makes
    // thick bevels and large overhangs cheaper than stacks of thin cuboids.
    function sideCasting(side,z,length,section,color){
      const key='casting/'+section.map(p=>p.join(',')).join('/');
      const g=geom(key,()=>{
        const outline=new T.Shape();
        section.forEach(([x,y],i)=>i?outline.lineTo(x,y):outline.moveTo(x,y));
        outline.closePath();
        const geo=new T.ExtrudeGeometry(outline,{depth:1,bevelEnabled:false,steps:1});
        geo.translate(0,0,-.5);return geo;
      });
      const m=place(g,material(color),side*halfW,0,z,shellOpts);
      m.scale.set(-side,1,length);return m;
    }
    // Back-wall armor with clipped corners. Its depth sits in front of the
    // hull in the visible bay, behind the stations installed by the room team.
    function backCasting(x,y,z,w,h,depth,color,notch){
      const a=w/2,b=h/2,c=Math.min(notch,a*.45,b*.48);
      const key=['beveled-plate',w,h,c].join('/');
      const g=geom(key,()=>{
        const shape=new T.Shape();
        shape.moveTo(-a+c,-b);shape.lineTo(a-c,-b);shape.lineTo(a,-b+c);
        shape.lineTo(a,b-c);shape.lineTo(a-c,b);shape.lineTo(-a+c,b);
        shape.lineTo(-a,b-c);shape.lineTo(-a,-b+c);shape.closePath();
        return new T.ExtrudeGeometry(shape,{depth:1,bevelEnabled:false,steps:1});
      });
      const m=place(g,material(color),x,y,z,shellOpts);
      m.scale.z=depth;return m;
    }
    if(industrial){
      // Three successive collars give the standard door an actual throat.
      // Keep the specified width and height clear at every collar.
      for(let j=0;j<3;j++){
        const z=halfD-.35-j*.43,coat=j===1?dark:frameColor;
        for(const s of [-1,1])shellBox(s*(doorWidth/2+.18),doorHeight/2,z,.36,doorHeight,.37,coat);
        shellBox(0,doorHeight+.17,z,doorWidth+.72,.34,.37,coat);
        if(j===2)for(const s of [-1,1]){
          shellBox(s*(doorWidth/2+.21),1.58,z-.21,.105,1.35,.05,accent,{glow:.38});
          block(s*(doorWidth/2+.18),halfD-.68,.36,1.34);
        }
      }
    }
    for(const side of [-1,1]){
      const x=side*(halfW+t/2);
      if(!openEdge)shellBox(x,H/2,0,t,H,D,wall);
      shellBox(side*(halfW-.09),.17,0,.18,.34,D,frameColor);
      shellBox(side*(halfW-.045),.48,0,.09,.105,D-.04,dark);
      const bays=Math.max(3,Math.round(D/(industrial?6.8:5.5))),span=D/bays;
      for(let i=0;i<bays;i++){
        const z=-halfD+(i+.5)*span;
        const postZ=z-span/2+.11;
        if(openEdge){
          // The bulwark steps down as the traveller approaches the sky.
          // Nothing spans the clear viewing edge at the far end of the deck.
          const h=i<bays-2?1.62:Math.min(H,1.62+(i-bays+3)*2.85);
          shellBox(x,h/2,z,t,h,span,wall);
          shellBox(side*(halfW-.065),h*.49,z,.13,h*.74,span-.23,lining);
          shellBox(side*(halfW-.12),h-.07,z,.28,.14,span,frameColor);
          shellBox(side*(halfW-.16),h-.21,z,.055,.07,span-.18,accent,{glow:.2});
          shellBox(side*(halfW-.13),h/2,postZ,.26,h,.24,frameColor);
          continue;
        }
        if(industrial){
          const power=family==='power',end=span-.20;
          // Armored foot, hollowed belt, splayed shoulders and suspended
          // soffit create a faceted pressure enclosure around the equipment.
          sideCasting(side,z,end,[[0,.22],[.50,.22],[.78,.72],[.78,1.12],[.30,1.65],[0,1.65]],frameColor);
          sideCasting(side,z,end,[[0,1.55],[.27,1.55],[.42,1.86],[.42,H*.47],[.20,H*.54],[0,H*.55]],lining);
          sideCasting(side,z,end,[[0,H*.57],[.18,H*.57],[.51,H*.67],[1.22,H*.79],[2.75,H*.94],[2.72,H-.10],[0,H-.10]],lining);
          sideCasting(side,z,end,[[.02,H*.53],[.30,H*.52],[.36,H*.53],[.22,H*.57],[.02,H*.58]],dark);
          const postWidth=power?.56:.44;
          sideCasting(side,postZ,postWidth,[[0,.07],[.82,.07],[.95,.62],[.62,1.56],
            [.61,H*.45],[.98,H*.62],[2.03,H*.82],[3.22,H-.33],[3.22,H],[0,H]],frameColor);
          shellBox(side*(halfW-.64),H*.33,postZ,.075,H*.15,postWidth*.62,power?0x967148:accent);
          // Recessed air intake below a removable face; the louvres stop
          // well short of the walking area.
          const ventY=2.40;
          shellBox(side*(halfW-.435),ventY,z,.065,.94,span*.56,dark);
          for(let slat=0;slat<5;slat++)shellBox(side*(halfW-.49),ventY-.33+slat*.165,z,.10,.060,span*.52,frameColor,{rz:side*.16});
          shellBox(side*(halfW-.47),ventY+.59,z-span*.21,.06,.075,.48,power?0x54c6c2:0x71d3e5,{glow:.4});
          block(side*(halfW-.42),z,.84,span);
          if(power){
            shellBox(side*(halfW-.78),.71,z,.14,.16,span-.09,0x9b7746);
            for(const s of [-1,1])shellBox(side*(halfW-.86),.71,z+s*span*.26,.17,.28,.22,dark);
          }else{
            shellBox(side*(halfW-.42),H*.43,z,.055,.18,span*.77,0x284d69);
          }
          continue;
        }
        shellBox(side*(halfW-.044),H*.50,z,.09,H*.66,span-.16,lining);
        shellBox(side*(halfW-.10),H*.63,z,.08,.30,span-.23,frameColor);
        shellBox(side*(halfW-.147),H*.63,z,.018,.055,span*.58,accent,{glow:.27});
        shellBox(side*(halfW-.13),H*.50,postZ,.26,H-.06,.22,frameColor);
        // A canted knee joins the stanchion to the roof ring. Five metres of
        // flat wall remain available for each room's own installations.
        beam([side*(halfW-.18),H-.98,postZ],[side*(halfW-1.02),H-.14,postZ],.20,.26,frameColor,roofOpts);
        if(family==='archives'||family==='instructor'){
          shellBox(side*(halfW-.11),H*.18,z,.21,H*.28,span-.21,dark);
          shellBox(side*(halfW-.19),H*.33,z,.21,.13,span-.16,family==='archives'?0xb6a26c:0xa59c72);
        }else if(family==='observation'||family==='captain'){
          sideCasting(side,postZ,.38,[[0,.12],[.36,.12],[.42,1.35],[.30,H*.38],
            [.74,H*.66],[1.85,H-.22],[1.85,H],[0,H]],dark);
          shellBox(side*(halfW-.33),H*.30,postZ,.06,.64,.15,accent,{glow:.34});
        }else if(family==='machine'||family==='workshop'){
          shellBox(side*(halfW-.27),H-.94,z,.52,.61,span,frameColor,roofOpts);
          shellBox(side*(halfW-.60),H-1.16,z,.25,.13,span,family==='machine'?0xc7933b:0x90846c,roofOpts);
        }else if(family==='honors'){
          sideCasting(side,z,span-.19,[[0,.38],[.33,.38],[.58,.63],[.31,H*.28],[0,H*.32]],frameColor);
          shellBox(side*(halfW-.40),.91,z,.08,.12,span*.79,0xd7aa62);
        }
      }
    }

    const hasWindow=spec.skyWindow===true||family==='observation';
    if(openEdge){
      // The terrace builder owns the skyline, guard posts and glazing below
      // handrail height. Keep the final 10 cm of deck edge outside the path.
      block(0,-halfD+.05,W,.10);
    }else if(hasWindow){
      const sill=Math.min(1.35,H*.22),head=H*.80,pier=Math.max(1.35,W*.12),glassH=head-sill;
      shellBox(0,sill/2,-halfD-t/2,W,sill,t,wall);
      shellBox(0,(head+H)/2,-halfD-t/2,W,H-head,t,wall);
      for(const s of [-1,1])shellBox(s*(halfW-pier/2),(sill+head)/2,-halfD-t/2,pier,glassH,t,wall);
      for(let k=1;k<=3;k++)shellBox((W-2*pier)*(k/4-.5),(head+sill)/2,-halfD-.05,.13,glassH,.34,frameColor);
      shellBox(0,sill,-halfD+.11,W-2*pier+.28,.15,.45,frameColor);
      shellBox(0,head,-halfD+.03,W-2*pier+.25,.17,.36,frameColor);
      shellBox(0,(sill+head)/2,-halfD-.12,W-2*pier,glassH,.035,0x91c5da,{opacity:.12,metalness:.12,roughness:.12});
    }else{
      shellBox(0,H/2,-halfD-t/2,W,H,t,wall);
      shellBox(0,.17,-halfD+.09,W,.34,.18,frameColor);
      shellBox(0,H*.68,-halfD+.07,W,.19,.16,frameColor);
      if(industrial){
        const power=family==='power',panels=power?7:5,bay=W/panels;
        for(let i=0;i<panels;i++){
          const x=-halfW+(i+.5)*bay;
          const y=H*(i%2===0?.63:.66);
          backCasting(x,y,-halfD+.02,bay-.18,H*.58,.22,frameColor,power?.54:.85);
          backCasting(x,y+.08,-halfD+.24,bay-.58,H*.48,.09,lining,power?.37:.71);
          backCasting(x,H*.32,-halfD+.06,bay-.56,.57,.18,dark,.14);
          // Rear high-level access slots remain clear of the scene-specific
          // apparatus at eye level. Small position lamps flank each slot.
          const portY=H*.76;
          backCasting(x,portY,-halfD+.34,bay*.60,H*.095,.075,dark,.13);
          for(let j=0;j<6;j++)shellBox(x-bay*.245+j*bay*.098,portY,-halfD+.43,.075,H*.066,.10,frameColor,{rz:.27});
          shellBox(x+bay*.33,portY,-halfD+.37,.09,.28,.06,power?0x5ce0d2:0x6fd8ee,{glow:.52});
          if(i>0){
            const sx=x-bay*.5;
            beam([sx,H*.43,-halfD+.17],[sx+(i%2?-.55:.55),H*.77,-halfD+.51],.31,.52,frameColor,shellOpts);
          }
        }
        // The cable/tooled manifold wraps the back corners above the devices.
        for(const s of [-1,1]){
          const z=-halfD+.60;
          const points=[[s*(halfW-1.72),H*.42,z],[s*(halfW-1.72),H*.79,z],
            [s*(halfW-2.67),H*.88,z],[s*(halfW*.47),H*.91,z],[s*4.50,H*.91,z]];
          pipe(points,power?.24:.17,power?0x99754d:0x6e8586,shellOpts);
          for(const y of [H*.48,H*.67])cyl(s*(halfW-1.72),y,z,power?.30:.235,power?.30:.235,.16,dark,shellOpts);
        }
      }else if(family==='honors'){
        // Seven shallow facets turn the upper back wall into a ceremonial
        // apse. Their arc stays over the display bays below.
        const segments=9,crown=[];
        for(let i=0;i<segments;i++){
          const m=(i+.5)/segments*2-1,x=m*W*.49,bandW=W*.98/segments;
          const y=H*(.49+.16*(1-m*m)),z=-halfD+.06+.58*m*m;
          const plate=backCasting(x,y,z,bandW-.11,H*.44,.19,lining,.48);
          plate.rotation.y=-m*.16;
          backCasting(x,y+H*.12,z+.20,bandW*.76,.32,.05,0x526e88,.12);
        }
        for(let i=0;i<=28;i++){
          const m=i/14-1;crown.push([m*W*.485,H*(.705+.16*(1-m*m)),-halfD+.39+.57*m*m]);
        }
        pipe(crown,.22,0x455e76,shellOpts);
        pipe(crown.map(([x,y,z])=>[x,y+.13,z+.17]),.065,0xdbaf66,shellOpts);
      }
    }
    if(!spec.openRoof){
      roofBox(0,H+.12,0,W,.24,D,ceiling);
      const spans=Math.max(3,Math.round(D/5.5)),length=D/spans;
      for(let i=0;i<spans;i++){
        const z=-halfD+(i+.5)*length;
        roofBox(0,H-(industrial?.24:.105),z-length/2+.11,W,industrial?.48:.21,industrial?.46:.23,frameColor);
        for(const s of [-1,1]){
          const lampColor=family==='power'?0xe3c58e:family==='teleport'?0xd2f0df:family==='observation'?0x9ecbe6:0xe4f8ee;
          const x=s*W*(industrial?.37:.26),low=industrial?.48:.075;
          roofBox(x,H-low,z,industrial?.58:.29,.15,length*.70,dark);
          roofBox(x,H-low-.087,z,industrial?.31:.153,.035,length*.63,lampColor,{glow:.65});
        }
      }
      if(family==='power'||family==='teleport'){
        for(const s of [-1,1]){
          roofBox(s*(halfW-2.42),H-.67,0,.82,.68,D,frameColor);
          roofBox(s*(halfW-2.42),H-1.04,0,.48,.11,D-.55,family==='power'?0x997245:0x31516b);
        }
      }
    }
    return {T,root,W,D,H,box,cyl,ball,beam,pipe,torus,panel,text,block,shell,roof};
  }
