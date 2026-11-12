// Exterior encounter from Through the Dark Gate. The chapter describes the scanning
// red centre; the unskinned 4717 portrait supplies the pairs of satellite wells.
function createYunasFigure(T,id,options={}){
  if(id!==4717)return null;
  const height=Number.isFinite(options.height)&&options.height>0?options.height:BYRON_BOSS.height;
  const tau=2*Math.PI,root=new T.Group(),bearing=new T.Group(),sculpt=new T.Group();
  root.name='原始黑洞·尤纳斯';root.add(bearing);bearing.add(sculpt);
  const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
  const geometries=new Set(),materials=new Set();
  function geometry(g){geometries.add(g);return g;}
  function material(m){materials.add(m);return m;}
  function mesh(g,m,parent=sculpt){const obj=new T.Mesh(g,m);parent.add(obj);return obj;}
  const sphere=geometry(new T.SphereGeometry(1,72,48)),clock={value:0};
  const surface=geometry(sphere.clone()),positions=surface.attributes.position;
  surface.setAttribute('streamDirection',surface.attributes.normal.clone());
  // The mouth actually recedes behind its front lip. The whirl follows this surface
  // through parallax during an escape-ship orbit, including from outside its rim.
  const offsetX=-.26,offsetY=-.18;
  function opening(x,y,z){
    const r=Math.hypot(x-offsetX,y-offsetY);
    return z*(1-.73*(1-T.MathUtils.smoothstep(r,.13,.81))+
      .16*Math.exp(-((r-.69)**2)/.032))*T.MathUtils.smoothstep(z,0,.28);
  }
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
    if(z>0)positions.setZ(i,opening(x,y,z));
  }
  surface.computeVertexNormals();
  const dustNoise=`float hash(vec2 p){return fract(sin(dot(p,vec2(117.07,43.59)))*14329.34);}
    float noise2(vec2 p){vec2 g=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(hash(g),hash(g+vec2(1,0)),f.x),mix(hash(g+vec2(0,1)),hash(g+1.),f.x),f.y);}`;
  function vortex(primary){
    const uniforms=T.UniformsUtils.clone(T.UniformsLib.fog);
    Object.assign(uniforms,{age:clock,mainWell:{value:primary?1:0}});
    return material(new T.ShaderMaterial({uniforms,fog:true,extensions:{derivatives:true},
      vertexShader:`attribute vec3 streamDirection; varying vec3 ray,ne,stream;
        #include <fog_pars_vertex>
        void main(){
          stream=streamDirection;ne=normalMatrix*normal;
          vec4 mvPosition=modelViewMatrix*vec4(position,1.);ray=-mvPosition.xyz;
          gl_Position=projectionMatrix*mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader:`varying vec3 ray,ne,stream;uniform float age,mainWell;
        #include <fog_pars_fragment>
        ${dustNoise}
        void main(){
          vec3 n=normalize(stream),normal=normalize(ne);
          float edge=pow(1.-abs(dot(normal,normalize(ray))),2.);
          vec2 p=(n.xy+vec2(.26,.18))*vec2(1.06,.97);
          float r=length(p),a=atan(p.y,p.x+.00001);
          float twist=a+(4.35+.48*sin(2.*a+.9*r))*r+.22*sin(3.*a-4.7*r+age*.15)*r-age*.132;
          vec2 field=vec2(cos(twist),sin(twist))*(r+.36);
          float cloud=.55*noise2(field*5.7+.026*age)+.30*noise2(field*12.3)+.15*noise2(field*25.7);
          float wave=.5+.5*cos(3.*twist+2.3*cloud+.55*sin(twist+7.*r));
          float split=.5+.5*cos(2.*twist-4.*r-.9);
          float lanes=pow(wave,3.1)*(.21+.79*split)*(.39+.84*cloud);
          float fibre=pow(.5+.5*cos(9.*twist+4.1*cloud+4.1*r),12.)*.085;
          float orbit=1.-smoothstep(.40,1.18,r);
          vec3 cool=mix(vec3(.035,.019,.090),vec3(.41,.23,.62),1.-smoothstep(.02,.77,r));
          vec3 hot=mix(vec3(.84,.042,.13),vec3(2.45,.54,.22),1.-smoothstep(.06,.49,r));
          vec3 trace=mix(cool,hot,mainWell*(1.-smoothstep(.24,.71,r)));
          float filament=.5+.5*cos(22.*twist+12.*cloud+noise2(field*42.)*2.);
          float fineDust=noise2(field*56.+vec2(cloud,0.))*.7+noise2(field*117.)*.3;
          vec3 well=vec3(.006,.003,.016)+trace*(lanes*(.73+.67*fineDust)+fibre+.018)*orbit;
          well+=trace*pow(filament,8.)*smoothstep(.32,.82,wave)*(.09+.22*cloud)*orbit;
          float crescent=exp(-abs(r-.24-.055*sin(twist*2.))*12.)*max(0.,cos(twist-.6));
          well+=mainWell*vec3(.70,.15,.036)*crescent*(.33+.67*cloud);
          well+=mix(vec3(.26,.17,.58),vec3(1.64,.20,.085),mainWell)*exp(-7.*r);
          well+=mainWell*vec3(.63,.018,.031)*exp(-4.4*r)*(.28+.53*cloud);
          float pin=(1.-smoothstep(.036,.184,r));
          well+=mix(vec3(.87,.85,1.),vec3(2.4,1.56,.95),mainWell)*pin;
          vec2 grid=n.xy*28.;vec2 cell=floor(grid);
          float speck=(1.-smoothstep(.018,.059+min(.095,fwidth(grid.x)),
            length(fract(grid)-vec2(hash(cell+3.),hash(cell+7.)))))*step(.80,hash(cell+19.));
          well+=speck*vec3(.40,.32,.61)*(.38+.62*cloud);
          float side=dot(normal,normalize(vec3(-.50,.60,.59)));
          vec3 back=mix(vec3(.007,.004,.018),vec3(.030,.016,.065),.5+.35*n.y+.14*n.x);
          float facing=smoothstep(-.29,.59,n.z);
          vec3 col=mix(back,well,facing)+max(0.,side)*.014+vec3(.35,.18,.58)*pow(edge,2.7);
          gl_FragColor=vec4(col,1.);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
          #include <fog_fragment>
        }`}));
  }
  const major=vortex(true),minor=vortex(false),body=new T.Group();sculpt.add(body);
  // A broken gas mantle behind the wells gathers into the throat. Three
  // turbulent lobes keep the outer silhouette visible even when it spans the sky.
  const halo=material(new T.ShaderMaterial({uniforms:{age:clock},
    transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,
    vertexShader:`varying vec2 q;void main(){q=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 q;uniform float age;
      ${dustNoise}
      void main(){
        vec2 p=q*vec2(1.,1.14);float r=length(p),a=atan(p.y,p.x+.00001);
        float swirl=2.8*r+.36*sin(2.*a+5.*r)+.015*age;
        vec2 curved=mat2(cos(swirl),sin(swirl),-sin(swirl),cos(swirl))*p;
        float grain=noise2(11.*curved)*.54+noise2(27.*curved)*.30+noise2(68.*curved)*.16;
        float veil=(1.-smoothstep(.45,.74,r))*.59*smoothstep(.24,.71,grain);
        float lobes=.44+.56*pow(.5+.5*cos(3.*a+9.*r+4.*grain),2.);
        float lip=exp(-abs(r-.233)*35.)*(.18+.72*grain);
        vec3 glow=mix(vec3(.13,.062,.30),vec3(.71,.50,1.),lip);
        gl_FragColor=vec4(glow,(veil*lobes+lip*.3)*.95);
      }`}));
  const mantle=mesh(geometry(new T.PlaneGeometry(1.60,1.45)),halo,body);
  mantle.position.z=-.27;
  const core=mesh(surface,major,body),rCore=.234;core.scale.set(rCore,rCore,rCore*.91);
  // Warm white at the bottom of the recess; the lens remains the spatial endpoint of each debris stream.
  const beacon=material(new T.MeshBasicMaterial({color:0xffedc8,toneMapped:false}));
  const lens=mesh(sphere,beacon,body);
  const lipZ=opening(offsetX,offsetY,Math.sqrt(1-offsetX**2-offsetY**2))*rCore*.91;
  lens.position.set(offsetX*rCore,offsetY*rCore,lipZ+.0004);
  lens.scale.set(.015,.014,.0072);
  const flareMat=material(new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide}));
  // The opposed pinches of the primary accretion flare are oblique in the 2025 art.
  for(const side of [-1,1]){
    const coords=[],colors=[],ix=[],rows=25,segments=44;
    for(let j=0;j<=rows;j++){
      const t=j/rows,rad=.225*(1-t)**2.07+.0015,px=-side*.153*t*t;
      for(let i=0;i<segments;i++){
        const a=i*tau/segments,fold=1+.11*Math.cos(3*a+2.8*t);
        coords.push(px+rad*Math.cos(a)*fold,side*(.035+.451*t),-.087+rad*.35*Math.sin(a)*fold);
        const vein=.50+.50*Math.cos(3*a+6.1*t);
        const bright=(.53+.42*vein)*(1-T.MathUtils.smoothstep(t,.42,1));
        colors.push(.034+.69*bright,.015+.53*bright,.086+.91*bright);
        if(j){const q=j*segments+i,b=j*segments+(i+1)%segments;ix.push(q-segments,q,b-segments,b-segments,q,b);}
      }
    }
    const g=geometry(new T.BufferGeometry());g.setIndex(ix);g.setAttribute('position',new T.Float32BufferAttribute(coords,3));
    g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();mesh(g,flareMat,body);
  }
  // Colour grades through a translucent, tapered gas stream between neighbouring wells.
  const wakeShade=material(new T.MeshBasicMaterial({color:0xbda6ff,vertexColors:true,transparent:true,
    opacity:.24,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending}));
  const points=[],shades=[],indices=[];
  for(let j=0;j<=40;j++){
    const t=j/40,amp=Math.sin(Math.PI*t),turn=t*tau*.57;
    for(let i=0;i<10;i++){
      const a=i*tau/10,w=.042+.078*amp,side=w*Math.cos(a),across=w*.31*Math.sin(a);
      points.push(.058*amp*Math.sin(3.2*t)+side*Math.cos(turn)-across*Math.sin(turn),t,
        .045*amp*Math.cos(2.7*t)+side*Math.sin(turn)+across*Math.cos(turn));
      const fade=.22+.61*(1-amp)+.12*Math.cos(a);shades.push(fade*.81,fade*.65,fade);
      if(j){const q=j*10+i,b=j*10+(i+1)%10;indices.push(q-10,q,b-10,b-10,q,b);}
    }
  }
  const wake=geometry(new T.BufferGeometry());wake.setIndex(indices);wake.setAttribute('position',new T.Float32BufferAttribute(points,3));
  wake.setAttribute('color',new T.Float32BufferAttribute(shades,3));wake.computeVertexNormals();
  // Large, unequal secondary black holes, diminishing to pinpricks on each curving arm.
  const chains=[
    [[-.223,.102,-.110,.124],[-.389,.196,-.105,.071],[-.301,.318,-.096,.039],[-.228,.354,-.068,.018],[-.198,.354,-.058,.009]],
    [[.334,.066,.065,.172],[.439,-.244,.022,.130],[.195,-.402,-.038,.077],[.020,-.440,-.074,.044],[-.058,-.389,-.073,.022]]
  ];
  const bodies=[],links=[],axis=v(0,1,0),delta=v();
  for(const [arm,chain] of chains.entries()){
    let last=body;
    for(const [i,[x,y,z,r]] of chain.entries()){
      const orb=mesh(surface,minor);orb.scale.set(r,r,r*.94);orb.position.set(x,y,z);
      const seed=i*.81+arm*2.23;orb.rotation.set(.11*Math.sin(seed),.31*Math.sin(seed+1.4),seed);
      bodies.push({orb,anchor:orb.position.clone(),seed,reach:(i+1)/chain.length});
      const tube=mesh(wake,wakeShade);links.push({tube,from:last,to:orb});last=orb;
    }
  }
  function bind(){
    for(const {tube,from,to} of links){
      delta.subVectors(to.position,from.position);const length=delta.length();
      tube.position.copy(from.position);tube.quaternion.setFromUnitVectors(axis,delta.multiplyScalar(1/length));tube.scale.setScalar(length);
    }
  }
  // Striated, overlapping strips curve from the leading lip down into the eye.
  // Their outermost folds extend toward the ship; the centre stays open to view.
  const streams=[];
  const streamMat=material(new T.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,
    opacity:.31,side:T.DoubleSide,blending:T.AdditiveBlending}));
  for(let k=0;k<5;k++){
    const p=[],rgb=[],ix=[];
    for(let j=0;j<=60;j++){
      const t=j/60,angle=k*tau/5-1.94*t-.20*Math.sin(3.8*t+k);
      const radius=.029+.205*t**.84,front=.060+.210*t**1.5+.012*Math.sin(angle);
      const width=(.0025+.011*t)*Math.sin(Math.PI*t)**.48;
      for(let m=0;m<7;m++){
        const f=m/3-1,rr=radius+f*width;
        p.push(offsetX*rCore*(1-t)+rr*Math.cos(angle),offsetY*rCore*(1-t)+rr*Math.sin(angle),
          front-.006*(f*f)+.001*Math.sin(32*t));
        const alpha=(1-f*f)**2*(.36+.64*Math.sin(Math.PI*t));
        rgb.push(alpha*(.84-.49*t),alpha*(.13+.12*t),alpha*(.23+.36*t));
        if(j&&m){const n=j*7+m;ix.push(n-8,n-1,n,n-8,n,n-7);}
      }
    }
    const g=geometry(new T.BufferGeometry());g.setIndex(ix);g.setAttribute('position',new T.Float32BufferAttribute(p,3));
    g.setAttribute('color',new T.Float32BufferAttribute(rgb,3));const ribbon=mesh(g,streamMat,body);streams.push(ribbon);
  }
  bind();
  // The measured spindle/satellites define the height and encounter root. Dust is transient.
  const bounds=new T.Box3().makeEmpty();
  for(const obj of [body,...bodies.map(b=>b.orb)]){
    obj.updateWorldMatrix(true,true);
    obj.traverse(part=>{
      if(!part.geometry||part===mantle)return;
      if(!part.geometry.boundingBox)part.geometry.computeBoundingBox();
      bounds.union(part.geometry.boundingBox.clone().applyMatrix4(part.matrixWorld));
    });
  }
  const size=bounds.getSize(v()),center=bounds.getCenter(v()),factor=height/size.y;
  bearing.rotation.y=Math.PI;bearing.scale.setScalar(factor);sculpt.position.set(-center.x,-bounds.min.y,-center.z);
  function animate(dt,speed=0,elapsed){
    const t=Number.isFinite(elapsed)?elapsed:clock.value+Math.min(.15,Math.max(0,dt||0));
    clock.value=t;const breath=Math.sin(t*.79);
    body.scale.set(1+.004*breath,1-.003*breath,1+.006*breath);
    body.rotation.z=-.012+.005*Math.sin(t*.43);
    const pulse=.015*(1.04+.06*Math.sin(2.1*t));
    lens.scale.set(pulse,pulse*.94,pulse*.48);
    for(const [i,ribbon] of streams.entries()){
      ribbon.rotation.z=.023*Math.sin(t*.51+i);ribbon.scale.z=1.16+.035*Math.sin(t*.37+i);
    }
    for(const {orb,anchor,seed,reach} of bodies){
      const a=t*.54+seed,w=(.007+.013*reach),s=.998;
      orb.position.set(anchor.x*s+w*Math.sin(a),anchor.y+w*Math.cos(a*.93),anchor.z+w*1.54*Math.sin(a+.6));
      orb.rotation.z=seed+.081*Math.sin(a*.8);
    }
    bind();
  }
  animate(0);
  return {root,core:lens,size:height,radius:.5*factor*Math.max(size.x,size.z),animate,update:animate,
    dispose(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
