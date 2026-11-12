  // Each finish shares its roughness and tangent-space normal across instances.
  // Normal tilt stays consistent between the miniature ship and metre-scale planets.
  const manufacturedTiles = new Map();
  const manufacturedProfiles = {
    paint:   {repeat: 2, mean: .83, relief: .65},
    metal:   {repeat: 3, mean: .78, relief: 1.05},
    rubber:  {repeat: 3, mean: .88, relief: 1.35},
    ceramic: {repeat: 2, mean: .85, relief: .40}
  };

  function makeManufacturedTile(kind, profile) {
    const size = 128, data = new Uint8Array(size * size * 4);
    // Periodic value noise. Interpolate neighbouring cells across both tile edges.
    function noise(u, v, nx, ny) {
      const x = u * nx, y = v * ny, i = Math.floor(x), j = Math.floor(y);
      const fx = x-i, fy = y-j, a = fx*fx*(3-2*fx), b = fy*fy*(3-2*fy);
      function corner(dx, dy) {
        let h = Math.imul((i+dx)&(nx-1), 374761393) ^ Math.imul((j+dy)&(ny-1), 668265263);
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
      }
      return (corner(0,0)*(1-a) + corner(1,0)*a)*(1-b) +
             (corner(0,1)*(1-a) + corner(1,1)*a)*b;
    }
    for (let y=0; y<size; y++) for (let x=0; x<size; x++) {
      const u=(x+.5)/size, v=(y+.5)/size;
      const grain=noise(u,v,64,64)-.5, cast=noise(u,v,16,16)-.5;
      let height, roughness;
      if (kind==='metal') {
        const brush=noise(u,v,4,64)-.5, groove=Math.max(0,-brush-.15);
        height=.48+.47*brush-.26*groove+.10*grain;
        roughness=profile.mean-.37*brush+.21*groove;
      } else if (kind==='rubber') {
        const pore=Math.max(0,-cast-.12);
        height=.53+.43*grain+.25*cast-.55*pore;
        roughness=profile.mean+.18*grain+.24*pore;
      } else if (kind==='ceramic') {
        const glaze=noise(u,v,8,8)-.5;
        height=.5+.16*glaze+.11*grain;
        roughness=profile.mean+.20*glaze+.10*grain;
      } else {
        // Rounded enamel stipple breaks up the reflection without dyeing the panel.
        const stipple=cast+.38*grain;
        height=.50+.55*stipple;
        roughness=profile.mean-.27*stipple;
      }
      const i=4*(y*size+x);
      data[i]=Math.round(255*T.MathUtils.clamp(height,0,1));
      data[i+1]=Math.round(255*T.MathUtils.clamp(roughness,0,1));
      data[i+3]=255;
    }
    const normals=new Uint8Array(data.length);
    const heightAt=(x,y)=>data[4*(((y+size)%size)*size+(x+size)%size)]/255;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const dx=(heightAt(x-1,y)-heightAt(x+1,y))*profile.relief;
      const dy=(heightAt(x,y-1)-heightAt(x,y+1))*profile.relief;
      const inv=1/Math.hypot(dx,dy,1),i=(y*size+x)*4;
      normals[i]=Math.round(127.5*(1+dx*inv));
      normals[i+1]=Math.round(127.5*(1+dy*inv));
      normals[i+2]=Math.round(127.5*(1+inv));
      normals[i+3]=255;
    }
    function texture(pixels,channel){
      const map=new T.DataTexture(pixels,size,size,T.RGBAFormat,T.UnsignedByteType);
      map.name='Workshop '+kind+' '+channel;
      map.wrapS=map.wrapT=T.RepeatWrapping;
      map.repeat.set(profile.repeat,profile.repeat);
      map.generateMipmaps=true;
      map.minFilter=T.LinearMipmapLinearFilter;
      map.magFilter=T.LinearFilter;
      map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
      map.needsUpdate=true;
      return map;
    }
    return {normal:texture(normals,'normal'),roughness:texture(data,'roughness')};
  }

  function applyManufacturedFinish(material, kind) {
    const profile=manufacturedProfiles[kind];
    if (!profile || !material.isMeshStandardMaterial || material.transparent ||
        material.map || material.normalMap || material.bumpMap || material.roughnessMap) return material;
    if (!manufacturedTiles.has(kind)) manufacturedTiles.set(kind,makeManufacturedTile(kind,profile));
    const tile=manufacturedTiles.get(kind);
    material.normalMap=tile.normal;
    material.roughnessMap=tile.roughness;
    material.roughness=Math.min(1,material.roughness/profile.mean);
    return material;
  }

  // Angular radiance probes supply the reflected light that is missing from
  // a rig of point sources. The RGBE pixels describe light, not a sky backdrop.
  function createReflectionProbes() {
    const probes = new Map();
    function makePanorama(profile,up) {
      const width=384, height=192, pixels=new Uint8Array(width*height*4);
      const smooth=(lo,hi,x)=>T.MathUtils.smoothstep(x,lo,hi);
      // Linear sky, horizon and ground irradiance. Keep the survey worlds in
      // their spherical frame so metal reflects the local sky above the walker.
      const field={
        klose:[[.14,.23,.39],[.44,.26,.17],[.095,.072,.039]],
        ocean:[[.09,.36,.48],[.09,.23,.28],[.026,.066,.065]],
        alpha:[[.12,.32,.31],[.39,.32,.21],[.088,.10,.07]],
        beta:[[.16,.13,.26],[.39,.23,.23],[.090,.060,.061]],
        byron:[[.026,.034,.085],[.085,.073,.14],[.016,.013,.031]]
      }[profile];
      for(let row=0;row<height;row++) {
        const latitude=((row+.5)/height-.5)*Math.PI;
        const y=Math.sin(latitude), ring=Math.cos(latitude);
        for(let col=0;col<width;col++) {
          const angle=((col+.5)/width-.5)*Math.PI*2;
          const x=Math.cos(angle)*ring, z=Math.sin(angle)*ring;
          let red,green,blue;
          if(field){
            const h=x*up.x+y*up.y+z*up.z,sky=smooth(-.02,.72,h),land=1-smooth(-.60,.01,h);
            const glint=profile==='byron'?Math.pow(Math.max(0,-x*.37+y*.22-z*.90),22):
              Math.pow(Math.max(0,.78*h+.22*z),12);
            const tint=i=>field[1][i]*(1-sky-land)+field[0][i]*sky+field[2][i]*land;
            red=tint(0)+glint*(profile==='byron'?1.7:.55);
            green=tint(1)+glint*(profile==='byron'?.20:.60);
            blue=tint(2)+glint*(profile==='byron'?.11:.63);
          }else if(profile===true) {
            // Intersect the direction with a virtual room. Long segmented
            // ceiling lamps form legible highlights even on a small metal rim.
            const reach=Math.min(6/Math.max(.001,Math.abs(x)),4/Math.max(.001,Math.abs(y)),8/Math.max(.001,Math.abs(z)));
            const px=x*reach, py=y*reach, pz=z*reach;
            const upper=smooth(-2,3,py), ceiling=smooth(3.93,4,py);
            const left=ceiling*(1-smooth(.20,.43,Math.abs(px+2.8)));
            const right=ceiling*(1-smooth(.23,.55,Math.abs(px-2.15)));
            const joints=smooth(.05,.21,Math.abs(Math.sin(pz*1.12)));
            const window=smooth(7.88,8,-pz)*(1-smooth(2.1,3.4,Math.abs(px-1.7)))*(1-smooth(1.25,1.75,Math.abs(py-.7)));
            const rail=smooth(5.92,6,Math.abs(px))*(1-smooth(.10,.26,Math.abs(py-.18)));
            red=.038+.115*upper+left*joints*4.2+right*joints*2.45+window*.55+rail*.5;
            green=.046+.135*upper+left*joints*3.4+right*joints*3.6+window*1.12+rail*.65;
            blue=.060+.15*upper+left*joints*2.55+right*joints*4.65+window*1.68+rail*.75;
          } else {
            const sun=Math.max(0,-x*.372+y*.820+z*.435);
            const key=5.8*Math.pow(sun,46)+.78*Math.pow(sun,5);
            const limb=Math.pow(Math.max(0,x*.56-y*.27-z*.78),2.5);
            red=.026+.16*Math.max(0,y)+key+limb*.30;
            green=.038+.22*Math.max(0,y)+key*.88+limb*.62;
            blue=.065+.32*Math.max(0,y)+key*.74+limb*.94;
          }
          const exp=Math.ceil(Math.log2(Math.max(red,green,blue)));
          const scale=255/Math.pow(2,exp), i=(row*width+col)*4;
          pixels[i]=Math.round(red*scale);pixels[i+1]=Math.round(green*scale);
          pixels[i+2]=Math.round(blue*scale);pixels[i+3]=exp+128;
        }
      }
      const texture=new T.DataTexture(pixels,width,height,T.RGBAFormat,T.UnsignedByteType);
      texture.encoding=T.RGBEEncoding;
      texture.magFilter=texture.minFilter=T.NearestFilter;
      texture.needsUpdate=true;
      return texture;
    }
    let filter;
    return {
      select(profile,target=scene,up) {
        if(!probes.has(profile)) {
          if(!filter)filter=new T.PMREMGenerator(renderer);
          const panorama=makePanorama(profile,up);
          try { probes.set(profile,filter.fromEquirectangular(panorama)); }
          finally { panorama.dispose(); }
        }
        target.environment=probes.get(profile).texture;
      },
      dispose() {
        scene.environment=null;
        for(const probe of probes.values())probe.dispose();
        filter?.dispose();
      }
    };
  }
  const reflections=createReflectionProbes();
