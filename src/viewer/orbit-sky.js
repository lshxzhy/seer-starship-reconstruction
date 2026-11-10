// Original orbital landmark. The bearing and surface geography are art direction.
(() => {
  const tau = Math.PI * 2;
  const clamp01 = n => Math.max(0,Math.min(1,n));
  function smooth(a,b,value) {
    const t=clamp01((value-a)/(b-a));
    return t*t*(3-2*t);
  }

  // A small periodic 3D value field lets all sampled latitudes, poles and the
  // equirectangular seam share one continuous field. The atlas is baked once.
  const lattice=new Float32Array(32*32*32);
  let seed=0x381a1097;
  for (let i=0;i<lattice.length;i++) {
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    lattice[i]=seed/4294967296;
  }
  function noise(x,y,z) {
    const gx=Math.floor(x),gy=Math.floor(y),gz=Math.floor(z);
    let u=x-gx,v=y-gy,w=z-gz;
    u=u*u*(3-2*u);v=v*v*(3-2*v);w=w*w*(3-2*w);
    const x0=gx&31,x1=(gx+1)&31;
    const a=(gy&31)<<5,b=((gy+1)&31)<<5;
    const c=(gz&31)<<10,d=((gz+1)&31)<<10;
    const near=(lattice[c+a+x0]*(1-u)+lattice[c+a+x1]*u)*(1-v)
      +(lattice[c+b+x0]*(1-u)+lattice[c+b+x1]*u)*v;
    const far=(lattice[d+a+x0]*(1-u)+lattice[d+a+x1]*u)*(1-v)
      +(lattice[d+b+x0]*(1-u)+lattice[d+b+x1]*u)*v;
    return near+(far-near)*w;
  }
  function surfaceAtlas() {
    const width=512,height=256,pixels=new Uint8Array(width*height*4);
    const sinLon=[],cosLon=[];
    for(let col=0;col<width;col++) {
      const lon=tau*(col+.5)/width;
      sinLon[col]=Math.sin(lon);cosLon[col]=Math.cos(lon);
    }
    for(let row=0;row<height;row++) {
      const lat=Math.PI*((row+.5)/height-.5), y=Math.sin(lat), horizontal=Math.cos(lat);
      for(let col=0;col<width;col++) {
        const x=-cosLon[col]*horizontal,z=sinLon[col]*horizontal;
        const terrain=.60*noise(x*2.6+9,y*2.6+7,z*2.6+3)
          +.25*noise(x*6.1,y*6.1+3,z*6.1+7)
          +.10*noise(x*15.3+2,y*15.3,z*15.3)
          +.05*noise(x*36,y*36+5,z*36);
        const shelf=smooth(.51,.61,terrain),land=smooth(.598,.627,terrain);
        let r=19+21*shelf, g=53+48*shelf, b=90+31*shelf;
        const relief=noise(x*19+5,y*19,z*19);
        r+=(78+22*relief-r)*land;g+=(95+21*relief-g)*land;b+=(81+17*relief-b)*land;

        // One broad midlatitude vortex and smaller ripples shear the cloud
        // field; wind rotation dies away outside the storm's footprint.
        const lon=tau*(col+.5)/width;
        const delta=lon-1.36;
        const dx=(delta-tau*Math.round(delta/tau))*.88, dy=lat-.43;
        const storm=Math.exp(-(dx*dx+dy*dy)*8);
        const twist=2.4*storm, ct=Math.cos(twist),st=Math.sin(twist);
        const jet=.18*Math.sin(lat*7)+.19*(noise(3*x,3*y,3*z)-.5);
        const advectedLon=lon+(dx*(ct-1)-dy*st)/.88+jet;
        const advectedLat=lat+dx*st+dy*(ct-1);
        const cy=Math.sin(advectedLat), ring=Math.cos(advectedLat);
        const cx=-Math.cos(advectedLon)*ring, cz=Math.sin(advectedLon)*ring;
        const broad=noise(cx*4.5+3,cy*9.2+11,cz*4.5-2);
        const wisps=noise(cx*16+4,cy*31,cz*16);
        const fine=noise(cx*49,cy*76+4,cz*49);
        const cover=smooth(.468,.74,.53*broad+.31*wisps+.16*fine);
        const ice=.78*smooth(.90,.992,Math.abs(y)+.035*(relief-.5));
        r+=(160-r)*ice;g+=(182-g)*ice;b+=(182-b)*ice;
        const cloudValue=169+47*fine+17*cover;
        const i=(row*width+col)*4;
        pixels[i]=r+(cloudValue-r)*cover;
        pixels[i+1]=g+(cloudValue+4-g)*cover;
        pixels[i+2]=b+(cloudValue+5-b)*cover;
        pixels[i+3]=255*(1-land)*(1-cover)*(1-ice);
      }
    }
    const texture=new T.DataTexture(pixels,width,height,T.RGBAFormat);
    texture.wrapS=T.RepeatWrapping;
    texture.magFilter=T.LinearFilter;
    texture.minFilter=T.LinearMipmapLinearFilter;
    texture.generateMipmaps=true;
    texture.needsUpdate=true;
    return texture;
  }

  // Keep the celestial direction fixed while the camera crosses a room or
  // orbits the hull. Only its depth-buffer distance is compressed: it stays
  // beyond the vessel but in front of the existing distant stellar sprites.
  const bearing=new T.Vector3(.183,.038,-.982).normalize();
  const sunlight=new T.Vector3(-.71,.46,.53).normalize();
  const vertex=`
    uniform vec3 bearing;
    uniform float angularRadius;
    varying vec3 surfaceNormal;
    varying vec3 toEye;
    varying vec2 atlasUV;
    void main() {
      vec3 ray=bearing+position*angularRadius;
      float depth=max(36.0,length(cameraPosition)+27.0);
      gl_Position=projectionMatrix*vec4(mat3(viewMatrix)*(ray*depth),1.0);
      surfaceNormal=normal;
      toEye=-ray;
      atlasUV=uv;
    }`;
  const globe=new T.SphereGeometry(1,80,48);
  const atlas=surfaceAtlas();
  function bodyMaterial(radius,fragment,properties) {
    return new T.ShaderMaterial(Object.assign({
      vertexShader:vertex,fragmentShader:fragment,toneMapped:false,
      uniforms:{bearing:{value:bearing},angularRadius:{value:radius},
        sun:{value:sunlight},surfaceMap:{value:atlas}}
    },properties));
  }
  const ground=bodyMaterial(.075,`
    uniform sampler2D surfaceMap;
    uniform vec3 sun;
    varying vec3 surfaceNormal;
    varying vec3 toEye;
    varying vec2 atlasUV;
    void main() {
      vec3 n=normalize(surfaceNormal), eye=normalize(toEye);
      float daylight=dot(n,sun), limb=1.0-max(0.0,dot(n,eye));
      vec4 texel=texture2D(surfaceMap,atlasUV);
      vec3 albedo=pow(texel.rgb,vec3(2.2));
      float day=smoothstep(-.12,.27,daylight);
      vec3 lit=albedo*(.008+.89*max(daylight,0.0)+.047*day);
      float sparkle=pow(max(0.0,dot(reflect(-sun,n),eye)),45.0)*texel.a*day;
      lit+=vec3(.09,.12,.12)*sparkle;
      lit+=vec3(.022,.115,.20)*pow(limb,3.5)*(.05+.95*day);
      gl_FragColor=vec4(lit,1.0);
      #include <encodings_fragment>
    }`,{});
  // The viewer disposes conventional material maps on page exit.
  ground.map=atlas;
  const planet=new T.Mesh(globe,ground);
  planet.name='航行远景 · 海蓝行星';
  planet.frustumCulled=false;
  scene.add(planet);

  const air=bodyMaterial(.075*1.018,`
    uniform vec3 sun;
    varying vec3 surfaceNormal;
    varying vec3 toEye;
    void main() {
      vec3 n=normalize(surfaceNormal),eye=normalize(toEye);
      float path=abs(dot(n,eye));
      float day=smoothstep(-.20,.48,dot(n,sun));
      // The far hemisphere is hidden by the opaque ground up to the limb.
      float opacity=(1.0-exp(-12.0*path))*(.04+.65*day);
      gl_FragColor=vec4(.077,.35,.57,opacity);
      #include <encodings_fragment>
    }`,{side:T.BackSide,transparent:true,depthWrite:false});
  const atmosphere=new T.Mesh(globe,air);
  atmosphere.name='航行远景 · 大气薄层';
  atmosphere.frustumCulled=false;
  atmosphere.renderOrder=-1;
  scene.add(atmosphere);

  // A feathered dust filament spans only one patch of sky. It leaves the
  // host's transparent canvas and its separate point-star layers intact.
  const dustMaterial=new T.ShaderMaterial({
    transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,
    uniforms:{distantDirection:{value:new T.Vector3(-.30,.19,-.94).normalize()}},
    vertexShader:`
      uniform vec3 distantDirection;
      varying vec2 dustUV;
      void main(){
        vec3 right=normalize(cross(distantDirection,vec3(0.,1.,0.)));
        vec3 up=cross(right,distantDirection);
        vec3 ray=distantDirection+right*(position.x*.98)+up*(position.y*.22+position.x*.21);
        gl_Position=projectionMatrix*vec4(mat3(viewMatrix)*(ray*(length(cameraPosition)+109.0)),1.0);
        dustUV=uv;
      }`,
    fragmentShader:`
      varying vec2 dustUV;
      void main(){
        vec2 p=dustUV*2.-1.;
        float spine=p.y-.18*sin(p.x*4.)-.14*sin(p.x*8.+.7);
        float falloff=exp(-spine*spine*7.)*(1.-smoothstep(.34,1.,abs(p.x)));
        float ridge=9.*(spine+.11*sin(p.x*13.));
        float split=1.-.45*exp(-ridge*ridge);
        gl_FragColor=vec4(.16,.23,.34,.051*falloff*split);
      }`
  });
  const dust=new T.Mesh(new T.PlaneGeometry(2,2),dustMaterial);
  dust.name='航行远景 · 星际尘光';
  dust.frustumCulled=false;
  dust.renderOrder=-2;
  scene.add(dust);
})();