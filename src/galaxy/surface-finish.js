// Fixed scenery is authored in a metre chart about the district origin. Its
// builders already lower y by groundY(x,z); this adapter maps that same chart
// onto the sphere instead of leaving x/z on the original tangent plane.
// Apply matrix() once to static instance placements, or to freshly written
// dynamic placements. Point buffers can use point() after their ordinary
// animation update. Never repeatedly project an already projected placement.
function createSurveyProjection(T,radius,groundY,height,radialAt){
  const localUp=new T.Vector3(0,1,0),normal=new T.Vector3();
  const position=new T.Vector3(),scale=new T.Vector3(),attitude=new T.Quaternion(),tilt=new T.Quaternion();
  function radial(x,z,out){
    if(radialAt)return radialAt(x,z,out);
    const distance=Math.hypot(x,z);
    if(distance<1e-8)return out.set(0,1,0);
    const angle=distance/radius,factor=Math.sin(angle)/distance;
    return out.set(x*factor,Math.cos(angle),z*factor);
  }
  function point(x,y,z,out=new T.Vector3()){
    // Separate the builder's old projected base from the object's height
    // above it, then use the same radial terrain height as the walker.
    const above=y-groundY(x,z),r=radius+height(x,z)+above;
    radial(x,z,normal);out.copy(normal).multiplyScalar(r);out.y-=radius;return out;
  }
  function rotation(x,z,out=new T.Quaternion()){
    radial(x,z,normal);
    return out.setFromUnitVectors(localUp,normal);
  }
  function matrix(source,out=source){
    source.decompose(position,attitude,scale);
    rotation(position.x,position.z,tilt);point(position.x,position.y,position.z,position);
    attitude.premultiply(tilt);
    return out.compose(position,attitude,scale);
  }
  return {point,rotation,matrix};
}

// Object-space relief stays attached to a growing stem or tilted rock.
// Pixel derivatives suppress detail below one pixel in the orbital view.
function fieldSurfaceFinish(material,kind){
  const surfaces={
    coating:`float enamelGrain=sin(39.*p.x+13.*p.y+7.*p.z)*cos(34.*p.z-17.*p.y+.5*sin(8.*p.x));
      relief=.11*enamelGrain;polish=-.035+.10*enamelGrain;`,
    metal:`float grain=sin(71.*p.x+9.*p.y+7.*p.z)*cos(19.*p.z+4.*p.y);
      float mottling=sin(7.1*p.x+5.6*p.z+.7*sin(4.*p.y))*cos(4.3*p.y-.73*p.x);
      float pit=smoothstep(.76,.94,mottling+.11*grain);
      relief=.31*grain-.75*pit;
      polish=-.065*grain+.23*pit;
      oxide=.82*pit;
      pigment=mix(vec3(1.+.055*grain),vec3(.72,.54,.38),pit*.69);`,
    stone:`float layer=p.y*11.+1.7*p.z+.6*sin(3.*p.x)+.15*sin(13.*p.z);
      float seam=1.-smoothstep(.018,.10,abs(fract(layer)-.48));
      float fleck=sin(35.*p.x+14.*p.z)*sin(23.*p.y-25.*p.z);
      relief=.30*sin(layer*6.28)-seam+.13*fleck;
      polish=.11*seam-.16*smoothstep(.58,.94,fleck);
      pigment=vec3(.98,1.,1.02)*(.98+.12*relief);`,
    stem:`float a=atan(p.z,p.x);
      float bark=cos(15.*a+.92*sin(6.*p.y)+.44*sin(3.*a+8.*p.y));
      relief=smoothstep(-.84,.4,bark)-.4;
      polish=.08-.18*max(0.,relief);
      pigment=mix(vec3(.77,.73,.66),vec3(1.10,1.05,.98),.46+.50*relief);`,
    blade:`float spine=exp(-abs(p.x-.06*p.z*p.z)*78.);
      float rib=1.-smoothstep(.03,.22,abs(fract(9.*p.z-17.*abs(p.x)+.18*sin(p.z*9.))-.5));
      relief=.85*spine+.54*rib-.36;
      polish=-.14*spine-.06*rib;
      pigment=vec3(.95,1.03,1.005)*(.99+.19*relief);`,
    moss:`float curl=sin(p.x*18.+sin(19.*p.z))*cos(14.*p.z-6.*p.y);
      relief=.59*curl+.23*sin(36.*p.x-17.*p.z);
      polish=.16*max(0.,relief);
      pigment=mix(vec3(.85,.90,.94),vec3(1.11,1.08,1.04),.5+.45*relief);`,
    cuticle:`float wax=sin(8.*p.y+2.*p.x+.65*sin(6.*p.z))*cos(9.*p.z-3.*p.y);
      float pore=smoothstep(.80,.97,sin(45.*p.x-11.*p.y)*cos(37.*p.z+14.*p.y));
      relief=.18*wax-.23*pore;polish=-.14+.065*wax+.14*pore;
      pigment=vec3(1.+.024*wax-.045*pore);`,
    crystal:`float plane=p.y*14.+1.1*p.x-.83*p.z+.18*sin(4.*p.z+3.*p.x);
      relief=.53*cos(6.28*plane)+.30*cos(12.56*plane);
      polish=.14*smoothstep(.33,.9,relief)-.095;
      pigment=mix(vec3(.90,.86,.79),vec3(1.11,1.07,1.03),.5+.55*relief);`,
    sponge:`vec2 grid=vec2(12.*atan(p.z,p.x)/6.283185+6.,7.*p.y);
      grid.x+=mod(floor(grid.y),2.)*.5;
      vec2 cell=fract(grid)-.5;float pore=length(cell*vec2(1.,.84));
      relief=smoothstep(.035,.18,pore)-.65+.28*exp(-abs(pore-.21)*20.);
      polish=.15*(1.-smoothstep(.04,.18,pore))-.07;
      pigment=mix(vec3(.64,.59,.66),vec3(1.06,1.02,.99),smoothstep(.02,.18,pore));`,
    nacre:`float rib=cos(20.*atan(p.y-.2,p.x)+5.*p.z);
      relief=rib*.58;polish=-.12+.06*rib;
      pigment=mix(vec3(.93,.91,.86),vec3(.98,1.09,1.13),.5+.45*rib);`
  };
  material.customProgramCacheKey=()=>'field-finish-'+kind;
  material.onBeforeCompile=s=>{
    s.vertexShader='varying vec3 fieldPoint;\n'+s.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nfieldPoint=position;');
    s.fragmentShader='varying vec3 fieldPoint;\n'+s.fragmentShader.replace('#include <color_fragment>',
      `#include <color_fragment>
       vec3 p=fieldPoint,pigment=vec3(1.);
       float relief=0.,polish=0.,oxide=0.,lod=1.-smoothstep(.006,.06,length(fwidth(p)));
       ${surfaces[kind]}
       diffuseColor.rgb*=mix(vec3(1.),pigment,lod);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+polish*lod,.07,1.);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor*=1.-oxide*lod;')
      .replace('#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
       vec3 hx=dFdx(-vViewPosition),hy=dFdy(-vViewPosition);
       vec3 rx=cross(hy,normal),ry=cross(normal,hx);
       float det=dot(hx,rx);
       normal=normalize(abs(det)*normal-sign(det)*.004*lod*(dFdx(relief)*rx+dFdy(relief)*ry)+1e-12*normal);
       ${kind==='nacre'?`float grazing=1.-abs(dot(normal,normalize(vViewPosition)));
       diffuseColor.rgb*=mix(vec3(1.),mix(vec3(.92,1.08,1.10),vec3(1.10,.94,1.06),.5+.5*sin(9.*grazing+relief)),.7*grazing*grazing);`:''}`);
  };
  return material;
}

// Decode the four original albedo samples once. Neutralising each sample
// against its own mean retains the distinct painted palette of each game map.
let surveyTiles=null;
function acquireSurveyTiles(T){
  if(!surveyTiles){
    const sheets=Array.from({length:4},()=>{
      const c=document.createElement('canvas');c.width=c.height=1;
      const ctx=c.getContext('2d');ctx.fillStyle='#808080';ctx.fillRect(0,0,1,1);
      const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.MirroredRepeatWrapping;t.anisotropy=4;return t;
    });
    const image=new Image();
    image.onload=()=>{
      const size=Math.floor(image.naturalWidth/2);
      for(const [i,t] of sheets.entries()){
        const c=t.image;c.width=c.height=size;
        const ctx=c.getContext('2d');
        ctx.drawImage(image,(i%2)*size,(i>>1)*size,size,size,0,0,size,size);
        const pixels=ctx.getImageData(0,0,size,size),data=pixels.data,sum=[0,0,0];
        for(let q=0;q<data.length;q+=4)for(let j=0;j<3;j++)sum[j]+=data[q+j];
        const scale=sum.map(n=>128*size*size/Math.max(1,n));
        for(let q=0;q<data.length;q+=4)for(let j=0;j<3;j++)data[q+j]*=scale[j];
        ctx.putImageData(pixels,0,0);t.needsUpdate=true;
      }
    };
    image.src=SURVEY_ALBEDO_URL;
    surveyTiles={sheets,image,users:0};
  }
  surveyTiles.users++;return surveyTiles;
}
// Metre-anchored relief and wetness for the walking mesh. Its radial patch
// follows the player, so neither local mesh coordinates nor screen noise work.
function finishSurveyGround(T,geo,material,definition,metresPerUV){
  // Water film, exposed strata, wind/current-aligned sediment.
  const beds={
    grassland:[.02,.22,.52],swamp:[.91,.04,.20],forest:[.24,.12,.09],vineway:[.31,.71,.18],
    core:[.09,.96,.04],wetland:[.83,.06,.51],flame:[.01,.58,.38],sanctuary:[.25,.43,.24],
    'ocean-shallows':[.78,.04,.96],'ocean-depths':[.62,.60,.51],
    'ocean-floor':[.44,.87,.32],'ocean-sanctum':[.26,.92,.08],
    'alpha-springs':[.72,.42,.05],'alpha-rock':[.11,.95,.20],
    'alpha-station':[.03,.78,.35],'alpha-forest':[.33,.22,.07],
    'beta-plain':[.04,.42,.74],'beta-waste':[.03,.94,.23],'beta-ruins':[.12,.73,.42],
    'beta-training':[.08,.56,.29],'beta-hall':[.03,.88,.09]
  };
  const mix=new T.BufferAttribute(new Float32Array(geo.attributes.position.count*3),3);
  geo.setAttribute('bedMix',mix);
  const tiles=acquireSurveyTiles(T);
  material.addEventListener('dispose',()=>{
    if(--tiles.users===0){tiles.image.onload=null;for(const t of tiles.sheets)t.dispose();surveyTiles=null;}
  });
  const original=material.onBeforeCompile;
  material.onBeforeCompile=function(shader,renderer){
    original.call(this,shader,renderer);
    const [dust,clay,silt,slate]=tiles.sheets;
    // Only three samplers are needed in each biome.
    shader.uniforms.dryBed={value:definition.id==='ocean'?silt:dust};
    shader.uniforms.wetBed={value:definition.id==='ocean'?silt:clay};
    shader.uniforms.rockBed={value:slate};
    shader.vertexShader='attribute vec3 bedMix; varying vec3 bedWeights; varying vec2 bedMetres;\n'+shader.vertexShader.replace(
      '#include <begin_vertex>','#include <begin_vertex>\nbedWeights=bedMix;bedMetres=uv*'+metresPerUV.toFixed(1)+';');
    shader.fragmentShader=`varying vec3 bedWeights;varying vec2 bedMetres;
      uniform sampler2D dryBed,wetBed,rockBed;
      float bedHash(vec2 p){return fract(sin(dot(p,vec2(39.347,17.81)))*4375.31);}
      float bedNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(bedHash(i),bedHash(i+vec2(1,0)),f.x),mix(bedHash(i+vec2(0,1)),bedHash(i+1.),f.x),f.y);}
      `+shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        vec2 metre=bedMetres;
        float broad=bedNoise(metre*.72),chip=bedNoise(metre*8.2),edge=bedNoise(metre*2.3);
        float ridge=sin(metre.x*4.2+metre.y*1.8+3.1*edge)*bedWeights.z;
        float line=abs(fract((metre.x*.63-metre.y*.47)+edge*.38)-.5);
        float seam=(1.-smoothstep(.012,.052,line))*bedWeights.y;
        float nearBed=1.-smoothstep(.07,.34,length(fwidth(metre)));
        // Broad distortion breaks up the mirrored tile without moving the bed underfoot.
        vec2 st=mat2(.94,.34,-.34,.94)*metre*.42+vec2(edge-.5,broad-.5)*.25;
        vec3 albedo=mix(texture2D(dryBed,st).rgb,texture2D(wetBed,st*.84).rgb,bedWeights.x);
        albedo=mix(albedo,texture2D(rockBed,st*.67).rgb,bedWeights.y);
        float surfaceGrain=dot(albedo,vec3(.22,.69,.09))-.5;
        // Film gathers in existing grain depressions and rock seams; dry ridges keep their relief.
        float wet=bedWeights.x*smoothstep(.23,.74,broad-.27*surfaceGrain+.18*seam-.075*ridge);
        float relief=((chip-.5)*.021+.018*ridge-.033*seam+.075*surfaceGrain)*(1.-.63*wet);
        float crystalFace=bedWeights.y*smoothstep(.55,.91,chip)*smoothstep(.0,.22,surfaceGrain);
        diffuseColor.rgb*=mix(vec3(1.),clamp(2.*albedo,vec3(.44),vec3(1.72)),.77*nearBed);
        float dryRough=clamp(.91-.17*bedWeights.y+.09*(chip-.5)-.22*crystalFace,.4,.98);
        roughnessFactor=mix(roughnessFactor,mix(dryRough,.18,wet),nearBed);
        diffuseColor.rgb*=1.+nearBed*(.10*(chip-.5)+.05*ridge-.18*seam-.22*wet);
        `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
         vec3 dp1=dFdx(-vViewPosition),dp2=dFdy(-vViewPosition);
         vec3 aBed=cross(dp2,normal),bBed=cross(normal,dp1);
         float bedDet=dot(dp1,aBed);
         normal=normalize(max(abs(bedDet),1.e-6)*normal-sign(bedDet)*nearBed*(dFdx(relief)*aBed+dFdy(relief)*bBed));`);
  };
  material.customProgramCacheKey=()=>'survey-bed-'+definition.id;
  return function writeBed(i,x,z){
    let sum=.0001,wet=0,rock=.00004,sediment=.00006;
    for(const site of definition.sites){
      const dx=x-site.x,dz=z-site.z,d=dx*dx+dz*dz;
      if(d>40000)continue;
      const w=(1-d/40000)**2/(1+d*.012),b=beds[site.id];
      wet+=b[0]*w;rock+=b[1]*w;sediment+=b[2]*w;sum+=w;
    }
    mix.setXYZ(i,wet/sum,rock/sum,sediment/sum);
    if(i===0)mix.needsUpdate=true;
  };
}
