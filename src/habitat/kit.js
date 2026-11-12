  // Cabin assets are authored in metres. Primitives are shared across rooms;
  // each invocation puts its equipment, lining and doorway in one local frame.
  const cabinAssets = { geometries:new Map(), materials:new Map(), canvases:new Map() };
  function cabinAsset(collection,key,make){
    if(!collection.has(key))collection.set(key,make());
    return collection.get(key);
  }

  // One seamless painted pattern per manufacturing finish. Red stores height
  // and green stores microsurface roughness in the same linear data texture.
  // G03 shows segmented floor bands; G04 and G07 show framed equipment bays.
  // Joint widths, captive screws, overhead air slots and tread are inferred.
  function cabinFinish(kind){
    return cabinAsset(cabinAssets.canvases,'finish/'+kind,()=>{
      const deck=['deck','tread','sealed','inlay','ribbed'].includes(kind),lid=kind==='soffit',casework=kind==='enamel';
      const n=deck?512:256;
      const makeCanvas=()=>{
        const c=document.createElement('canvas');c.width=n;c.height=n;return c;
      };
      const colour=makeCanvas(),relief=makeCanvas();
      const ink=colour.getContext('2d'),data=relief.getContext('2d');
      const pixels=ink.createImageData(n,n),packed=data.createImageData(n,n);
      let seed=271;
      for(let i=0;i<pixels.data.length;i+=4){
        seed=(Math.imul(seed,1664525)+1013904223)>>>0;
        const grain=(seed>>>29)-3;
        const row=Math.floor(i/(4*n));
        const x=i/4%n;
        const brush=Math.sin(2*Math.PI*row/16)+.45*Math.sin(2*Math.PI*(x+2*row)/32);
        const shade=246+grain+(casework?1:2)*brush;
        pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=shade;
        pixels.data[i+3]=255;
        packed.data[i]=156+grain*.35;packed.data[i+1]=(deck?218:casework?193:203)+grain*3+brush*7;
        packed.data[i+3]=255;
      }
      ink.putImageData(pixels,0,0);data.putImageData(packed,0,0);
      // Work on a common drafting grid, independent of the texture resolution.
      for(const ctx of [ink,data])ctx.scale(n/256,n/256);
      function stroke(points,width,grey,height,rough){
        for(const [ctx,style] of [[ink,'rgb('+[grey,grey,grey]+')'],[data,'rgb('+[height,rough,0]+')']]){
          ctx.strokeStyle=style;ctx.lineWidth=width;ctx.lineJoin='round';
          ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();
        }
      }
      function screw(x,y){
        for(const [ctx,style] of [[ink,'#abadae'],[data,'rgb(105,165,0)']]){
          ctx.fillStyle=style;ctx.beginPath();ctx.arc(x,y,1.6,0,Math.PI*2);ctx.fill();
        }
        stroke([[x-.8,y+.7],[x+.8,y-.7]],.55,90,69,205);
      }
      const bevel=deck?3.0:2.1;
      const edge=[[bevel,8],[8,bevel],[248,bevel],[256-bevel,8],
        [256-bevel,248],[248,256-bevel],[8,256-bevel],[bevel,248],[bevel,8]];
      if(!casework){
        stroke(edge,deck?4.5:3.4,224,143,220);
        stroke(edge,deck?2.5:1.8,200,106,247);
        stroke(edge,.9,163,70,244);
        for(const x of [11,245])for(const y of [11,245])screw(x,y);
      }
      if(deck){
        // Two recessed finger holds near one edge of each removable deck plate.
        for(const x of [98,140]){
          stroke([[x,237],[x+18,237]],2.7,188,85,218);
          stroke([[x,239],[x+18,239]],.75,253,164,163);
        }
        if(kind==='tread'){
          for(let j=0;j<12;j++)for(let i=0;i<14;i++){
            const x=15+i*17+(j%2)*5,y=21+j*18;
            stroke([[x,y],[x+5,y-3]],2.1,226,205,153);
          }
        }else if(kind==='sealed'){
          // Flush resin pans in the laboratory and workshop. Double joints
          // trap liquid at the perimeter, leaving a smooth central field.
          stroke([[14,24],[24,14],[232,14],[242,24],[242,232],[232,242]],
            1.5,215,99,225);
          for(const x of [25,31,37,43])stroke([[x,221],[x+4,217]],1.1,194,103,199);
        }else if(kind==='inlay'){
          // Hairline metal inlay and broad, polished chamfers for the civic decks.
          for(const side of [-1,1]){
            const x=side<0?15:241;
            stroke([[x,35],[x,19],[x-side*5,14],[x-side*28,14]],1.8,217,151,96);
          }
          stroke([[14,220],[14,237],[20,243],[68,243]],1.4,216,151,105);
        }else if(kind==='ribbed'){
          // Finely ribbed foot panels beside optics and exterior observation rails.
          for(let i=0;i<20;i++){
            const y=28+i*10;
            stroke([[18,y],[44,y],[48,y-2],[80,y-2]],1.65,223,184,160);
            stroke([[176,y+2],[206,y+2],[211,y],[238,y]],1.65,223,184,160);
          }
        }
      }else if(lid){
        // The slotted return strip sits to one side of each overhead cassette.
        for(let i=0;i<18;i++){
          const x=26+i*11;stroke([[x,207],[x+4,216]],2.6,189,65,235);
        }
        stroke([[19,200],[235,200]],.8,220,121,226);
      }else if(!casework){
        // Stepped removable facing and two quarter-turn latches.
        stroke([[15,180],[15,216],[26,227],[124,227]],1.2,219,112,233);
        for(const x of [24,232]){
          stroke([[x-3,37],[x+3,37]],2.0,180,116,170);
          stroke([[x-2,38],[x+2,38]],.7,250,163,152);
        }
      }
      // A tangent-space normal keeps the same physical slopes on the full
      // ship, the boarding view and the small exterior model. Wrap the height
      // samples at the tile edge so no artificial border catches the lights.
      const heights=data.getImageData(0,0,n,n).data,normalCanvas=makeCanvas();
      const normalCtx=normalCanvas.getContext('2d'),normals=normalCtx.createImageData(n,n);
      const spanX=casework?.72:deck?2:lid?2.4:2.8,spanY=casework?.72:deck?2:1.6;
      const reliefMetres=casework?.0018:deck?.012:.009;
      const kx=reliefMetres*n/(2*255*spanX),ky=reliefMetres*n/(2*255*spanY);
      for(let y=0;y<n;y++)for(let x=0;x<n;x++){
        const at=(y*n+x)*4;
        const dx=(heights[(y*n+(x+n-1)%n)*4]-heights[(y*n+(x+1)%n)*4])*kx;
        const dy=(heights[(((y+1)%n)*n+x)*4]-heights[(((y+n-1)%n)*n+x)*4])*ky;
        const scale=127.5/Math.sqrt(dx*dx+dy*dy+1);
        normals.data[at]=127.5+dx*scale;normals.data[at+1]=127.5+dy*scale;
        normals.data[at+2]=127.5+scale;normals.data[at+3]=255;
      }
      normalCtx.putImageData(normals,0,0);
      const albedo=new T.CanvasTexture(colour),detail=new T.CanvasTexture(relief);
      const normalMap=new T.CanvasTexture(normalCanvas);
      albedo.encoding=T.sRGBEncoding;
      for(const tex of [albedo,detail,normalMap]){
        tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(1/spanX,1/spanY);tex.anisotropy=4;
      }
      return {map:albedo,roughnessMap:detail,normalMap};
    });
  }

  // UV lengths are metres. Different wall bays therefore share the same paint
  // and texels; a long wall does not stretch a single screw over its width.
  function cabinMetricUV(g,sx,sy,sz){
    const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
    for(let i=0;i<uv.count;i++){
      const x=p.getX(i)*sx,y=p.getY(i)*sy,z=p.getZ(i)*sz;
      const nx=n.getX(i),ny=n.getY(i),nz=n.getZ(i);
      if(Math.abs(ny)>Math.max(Math.abs(nx),Math.abs(nz)))uv.setXY(i,x,-z*Math.sign(ny));
      else if(Math.abs(nx)>Math.abs(nz))uv.setXY(i,-z*Math.sign(nx),y);
      else uv.setXY(i,x*Math.sign(nz),y);
    }
    return g;
  }

  // Each cast housing stays inside its original envelope. The broad faces
  // retain flat normals and the narrow fillet carries the moving highlight.
  // The surrounding kit scales unit geometries, hence the normal correction.
  function cabinHousing(w,h,d){
    const g=new T.BoxGeometry(1,1,1,3,3,3);
    const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
    const r=Math.min(.095,Math.min(w,h,d)*.21);
    const at=new T.Vector3(),outward=new T.Vector3(),face=new T.Vector3();
    for(let i=0;i<p.count;i++){
      at.fromBufferAttribute(p,i);face.fromBufferAttribute(n,i);
      outward.set(Math.abs(at.x)>.4?Math.sign(at.x):0,Math.abs(at.y)>.4?Math.sign(at.y):0,
        Math.abs(at.z)>.4?Math.sign(at.z):0).normalize();
      const x=Math.sign(at.x)*(w*.5-r)+r*outward.x,y=Math.sign(at.y)*(h*.5-r)+r*outward.y,
        z=Math.sign(at.z)*(d*.5-r)+r*outward.z;
      p.setXYZ(i,x/w,y/h,z/d);
      if(face.y)uv.setXY(i,x,-z*face.y);
      else if(face.x)uv.setXY(i,-z*face.x,y);
      else uv.setXY(i,x*face.z,y);
      outward.set(outward.x*w,outward.y*h,outward.z*d).normalize();
      n.setXYZ(i,outward.x,outward.y,outward.z);
    }
    return g;
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
      const key=[tint.getHex(),glow,roughness,metalness,opacity,opts.finish||''].join('/');
      return cabinAsset(cabinAssets.materials,key,()=>{
        tint.convertSRGBToLinear();
        const finish=opts.finish?cabinFinish(opts.finish):null;
        return new T.MeshStandardMaterial({color:tint,roughness,metalness,
          emissive:tint.clone(),emissiveIntensity:glow,transparent:opacity<1,
          opacity,depthWrite:opacity>=1,...finish});
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
      const size=Math.max(w,h,d);
      const housing=!opts.structural&&!opts.finish&&!opts.glow&&(opts.opacity??1)===1&&
        !color?.isMaterial&&Math.min(w,h,d)>=.18&&size>=.72&&size<=10.5;
      const dimensions=[w,h,d].join('/');
      const g=housing?geom('housing/'+dimensions,()=>cabinHousing(w,h,d)):
        opts.finish?geom('metric-box/'+dimensions,()=>cabinMetricUV(boxGeometry.clone(),w,h,d)):boxGeometry;
      const m=place(g,material(color,housing?{...opts,finish:'enamel'}:opts),x,y,z,opts);
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
      const ratio=w/h,aspect=ratio<.88?.75:ratio<1.65?1.25:ratio<3.25?2:4;
      const nav=['captain','observation','teleport'].includes(spec.id);
      const records=['archives','instructor','honors'].includes(spec.id);
      const profile=nav?'bearing':records?'index':'cycle';
      const tint=cssHex(color??0x65d4da), key='display/'+profile+'/'+aspect+'/'+tint;
      const map=texture(key,()=>canvasMap(aspect>=2?512:256,aspect===4?128:256,(ctx,pw,ph)=>{
        // Logical coordinates follow the housing so a dial on a narrow
        // handheld unit remains round. External room labels carry its purpose.
        const wide=aspect>=2,dh=200,dw=dh*aspect;
        ctx.scale(pw/dw,ph/dh);
        const back=ctx.createLinearGradient(0,0,0,dh);
        back.addColorStop(0,'#18373f');back.addColorStop(.65,'#0d202c');back.addColorStop(1,'#122c38');
        ctx.fillStyle=back;ctx.fillRect(0,0,dw,dh);
        const line=(x1,y1,x2,y2)=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();};
        ctx.strokeStyle='#284854';ctx.lineWidth=1;
        for(let x=12;x<dw-10;x+=18)line(x,25,x,dh-22);
        for(let y=28;y<dh-20;y+=18)line(10,y,dw-10,y);
        ctx.fillStyle=tint;ctx.fillRect(9,10,dw*.14,3);
        for(let i=0;i<3;i++)ctx.fillRect(dw-27+6*i,10,3,3);
        const cx=wide?dw*.78:dw*.5,cy=wide?99:87,r=wide?48:43;
        const sweep=Math.PI*1.5,start=Math.PI*.75;
        ctx.strokeStyle=tint;ctx.lineWidth=1.8;
        if(nav){
          for(const radius of [r*.38,r*.71,r]){
            ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.stroke();
          }
          line(cx-r-5,cy,cx+r+5,cy);line(cx,cy-r-5,cx,cy+r+5);
          line(cx,cy,cx+r*.70,cy-r*.70);
          for(const [dx,dy] of [[-.42,.18],[.20,-.54],[.61,-.31]])
            ctx.fillRect(cx+r*dx-2,cy+r*dy-2,4,4);
        }else if(records){
          for(let j=0;j<5;j++){
            const y=cy-r+j*r*.43;
            ctx.strokeRect(cx-r,y,9,9);
            line(cx-r+18,y+3,cx+r*(j%2?.55:.89),y+3);
            line(cx-r+18,y+7,cx-r*.17,y+7);
          }
        }else{
          ctx.beginPath();ctx.arc(cx,cy,r,start,start+sweep);ctx.stroke();
          for(let j=0;j<=24;j++){
            const a=start+j*sweep/24,l=j%4===0?8:3;
            line(cx+(r-l)*Math.cos(a),cy+(r-l)*Math.sin(a),cx+r*Math.cos(a),cy+r*Math.sin(a));
          }
          ctx.beginPath();ctx.arc(cx,cy,3.5,0,2*Math.PI);ctx.fill();
          line(cx,cy,cx+r*.62,cy-r*.44);
        }
        if(wide){
          const traceW=dw*.52;
          ctx.lineWidth=2.3;ctx.beginPath();
          for(let i=0;i<=72;i++){
            const x=16+i*traceW/72,y=106+12*Math.sin(i*.24)+5*Math.cos(i*.75)-15*Math.sin(i*.09);
            if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
          }
          ctx.stroke();
          for(let i=0;i<=12;i++)line(16+i*traceW/12,145,16+i*traceW/12,i%3===0?139:142);
        }
        for(let j=0;j<3;j++){
          const y=155+j*8;ctx.fillStyle='#30505a';ctx.fillRect(dw*.10,y,dw*.37,2.5);
          ctx.fillStyle=tint;ctx.fillRect(dw*.10,y,dw*(.18+.052*j),2.5);
        }
      }));
      const casing=geom('instrument-casing/'+aspect,()=>{
        const a=aspect/2,b=.5,c=.04,s=new T.Shape();
        s.moveTo(-a+c,-b);s.lineTo(a-c,-b);s.lineTo(a,-b+c);s.lineTo(a,b-c);
        s.lineTo(a-c,b);s.lineTo(-a+c,b);s.lineTo(-a,b-c);s.lineTo(-a,-b+c);s.closePath();
        const g=new T.ExtrudeGeometry(s,{depth:1,steps:1,bevelEnabled:true,bevelSegments:1,
          bevelThickness:.065,bevelSize:.017});
        g.translate(0,0,-.5);return g;
      });
      const body=place(casing,material(0x273f4a,{roughness:.32}),0,0,0,{parent:frame});
      body.scale.set(w/(aspect+.034),h/1.034,.075);
      face(0,0,.044,w*.94,h*.88,map,{parent:frame});
      return frame;
    }

    // Flush mechanical dial on a +Z operating face. The bezel catches local
    // light; the printed scale is shared and the needle casts its own relief.
    function dial(x,y,z,r,tint,fraction,opts={}){
      const frame=new T.Group();frame.position.set(x,y,z);frame.rotation.set(opts.rx||0,opts.ry||0,opts.rz||0);
      frame.scale.setScalar(r);(opts.parent||root).add(frame);
      const local={parent:frame};
      cyl(0,0,0,1,1,.20,0x6b777e,{...local,rx:Math.PI/2,segments:36,metalness:.70,roughness:.29});
      const scale=texture('printed-dial/'+tint,()=>canvasMap(160,160,(ctx,w,h)=>{
        ctx.translate(w/2,h/2);ctx.scale(w/2,h/2);
        ctx.fillStyle='#d5dcd2';ctx.beginPath();ctx.arc(0,0,.97,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle=cssHex(tint);ctx.lineWidth=.08;ctx.beginPath();ctx.arc(0,0,.75,.76*Math.PI,1.64*Math.PI);ctx.stroke();
        for(let i=0;i<=24;i++){
          const a=(.76+1.48*i/24)*Math.PI,s=Math.sin(a),c=Math.cos(a),l=i%4===0?.61:.72;
          ctx.strokeStyle='#263746';ctx.lineWidth=i%4===0?.025:.014;ctx.beginPath();
          ctx.moveTo(l*c,l*s);ctx.lineTo(.84*c,.84*s);ctx.stroke();
        }
      }));
      face(0,0,.103,1.92,1.92,scale,local);
      torus(0,0,.11,.936,.066,0x52616b,{...local,segments:40,metalness:.72,roughness:.26});
      const a=(.76+1.48*fraction)*Math.PI,dx=Math.cos(a),dy=-Math.sin(a);
      beam([-.14*dx,-.14*dy,.13],[.69*dx,.69*dy,.13],.047,.035,0xb54f37,local);
      cyl(0,0,.15,.09,.10,.04,0x35424c,{...local,rx:Math.PI/2,segments:16});
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
    const shellOpts={parent:shell,structural:true};
    const roofOpts={parent:roof,structural:true};
    const shellBox=(x,y,z,w,h,d,c,opts={})=>box(x,y,z,w,h,d,c,{...shellOpts,...opts});
    const roofBox=(x,y,z,w,h,d,c,opts={})=>box(x,y,z,w,h,d,c,{...roofOpts,...opts});
    const floorFace=box(0,-.125,0,W,.25,D,frameColor,shellOpts);
    floorFace.name='连续甲板';

    const floorFinish=({power:'tread',teleport:'tread',machine:'tread',laboratory:'sealed',workshop:'sealed',
      captain:'inlay',honors:'inlay',archives:'inlay',observation:'ribbed',terraceAccess:'ribbed'})[family]||'deck';
    const floorMaterial=material(floorColor,{finish:floorFinish,
      roughness:floorFinish==='inlay'?.60:floorFinish==='sealed'?.69:.80,metalness:.12});
    const floorUV=geom('metric-deck/'+W+'/'+D,()=>cabinMetricUV(faceGeometry.clone(),W,D,1));
    const tiles=place(floorUV,floorMaterial,0,.004,0,{rx:-Math.PI/2,parent:shell});
    tiles.scale.set(W,D,1);

    // The clear door opening is part of the wall geometry, including the
    // header, jambs and threshold. Room-specific builders keep this axis free.
    const doorWidth=Math.min(spec.doorWidth??3.4,W-.8);
    const doorHeight=Math.min(spec.doorHeight??3.1,H-.38);
    root.userData.door=[0,0,halfD];
    root.userData.doorWidth=doorWidth;root.userData.doorHeight=doorHeight;
    const t=.22,sideWidth=(W-doorWidth)/2;
    for(const side of [-1,1]){
      shellBox(side*(doorWidth+sideWidth)/2,H/2,halfD+t/2,sideWidth,H,t,wall,{finish:'skin'});
      shellBox(side*(doorWidth/2+.105),doorHeight/2,halfD,.21,doorHeight,.53,dark);
      shellBox(side*(doorWidth/2+.19),doorHeight/2,halfD-.22,.13,doorHeight,.22,lining);
      shellBox(side*(doorWidth/2+.27),doorHeight*.73,halfD-.35,.07,.59,.05,accent,{glow:.46});
      shellBox(side*(doorWidth/2+.39),1.34,halfD-.15,.20,.32,.11,dark);
      // Each side has a recessed latch pocket and keeper. Closed hardware
      // stays outboard of the clear opening and the gaskets sit in its rebate.
      const keeperX=side*(doorWidth/2+.53);
      for(const height of [.57,doorHeight-.50]){
        shellBox(keeperX,height,halfD-.049,.48,.27,.13,dark);
        shellBox(keeperX,height,halfD-.116,.38,.15,.08,frameColor);
        shellBox(keeperX-side*.085,height,halfD-.164,.12,.09,.08,0xa4b2b6);
      }
      for(const dz of [-.08,.09])
        shellBox(side*(doorWidth/2+.013),doorHeight/2,halfD+dz,.025,doorHeight,.033,0x354247);
    }
    shellBox(0,(H+doorHeight)/2,halfD+t/2,doorWidth,H-doorHeight,t,wall,{finish:'skin'});
    shellBox(0,doorHeight+.11,halfD,doorWidth+.48,.22,.52,frameColor);
    shellBox(0,doorHeight+.22,halfD-.21,doorWidth*.48,.065,.13,accent,{glow:.7});
    shellBox(0,.015,halfD-.16,doorWidth,.023,.28,frameColor);
    for(let i=-2;i<=2;i++)shellBox(i*.37,.030,halfD-.16,.16,.010,.10,accent);

    // Extruded shell casting: section coordinates are (inward depth,height)
    // and the third dimension follows a wall bay. Reusing the section makes
    // thick bevels and large overhangs cheaper than stacks of thin cuboids.
    function sideCasting(side,z,length,section,color){
      const finish=length>2?'skin':undefined;
      const key='casting/'+section.map(p=>p.join(',')).join('/')+(finish?'/uv/'+length:'');
      const g=geom(key,()=>{
        const outline=new T.Shape();
        section.forEach(([x,y],i)=>i?outline.lineTo(x,y):outline.moveTo(x,y));
        outline.closePath();
        const geo=new T.ExtrudeGeometry(outline,{depth:1,bevelEnabled:false,steps:1});
        geo.translate(0,0,-.5);return finish?cabinMetricUV(geo,1,1,length):geo;
      });
      const m=place(g,material(color,{finish}),side*halfW,0,z,shellOpts);
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
      // Leading faces of this extrusion already use XY in metres.
      const m=place(g,material(color,{finish:w>2&&h>2?'skin':undefined}),x,y,z,shellOpts);
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
      if(!openEdge)shellBox(x,H/2,0,t,H,D,wall,{finish:'skin'});
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
          shellBox(side*(halfW-.065),h*.49,z,.13,h*.74,span-.23,lining,{finish:'skin'});
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
        shellBox(side*(halfW-.044),H*.50,z,.09,H*.66,span-.16,lining,{finish:'skin'});
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
      shellBox(0,H/2,-halfD-t/2,W,H,t,wall,{finish:'skin'});
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
      roofBox(0,H+.12,0,W,.24,D,ceiling,{finish:'soffit',roughness:.72});
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
    return {T,root,W,D,H,box,cyl,ball,beam,pipe,torus,panel,text,dial,block,shell,roof};
  }
