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
