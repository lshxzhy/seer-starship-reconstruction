// Object-space relief stays attached to a growing stem or tilted rock.
// Pixel derivatives suppress detail below one pixel in the orbital view.
function fieldSurfaceFinish(material,kind){
  const surfaces={
    metal:`float grain=sin(71.*p.x+9.*p.y+7.*p.z)*cos(19.*p.z+4.*p.y);
      float mottling=sin(7.1*p.x+5.6*p.z+.7*sin(4.*p.y))*cos(4.3*p.y-.73*p.x);
      float pit=smoothstep(.76,.94,mottling+.11*grain);
      relief=.31*grain-.75*pit;
      pigment=mix(vec3(1.+.055*grain),vec3(.72,.54,.38),pit*.69);`,
    stone:`float layer=p.y*11.+1.7*p.z+.6*sin(3.*p.x)+.15*sin(13.*p.z);
      float seam=1.-smoothstep(.018,.10,abs(fract(layer)-.48));
      float fleck=sin(35.*p.x+14.*p.z)*sin(23.*p.y-25.*p.z);
      relief=.30*sin(layer*6.28)-seam+.13*fleck;
      pigment=vec3(.98,1.,1.02)*(.98+.12*relief);`,
    stem:`float a=atan(p.z,p.x);
      float bark=cos(15.*a+.92*sin(6.*p.y)+.44*sin(3.*a+8.*p.y));
      relief=smoothstep(-.84,.4,bark)-.4;
      pigment=mix(vec3(.77,.73,.66),vec3(1.10,1.05,.98),.46+.50*relief);`,
    blade:`float spine=exp(-abs(p.x-.06*p.z*p.z)*78.);
      float rib=1.-smoothstep(.03,.22,abs(fract(9.*p.z-17.*abs(p.x)+.18*sin(p.z*9.))-.5));
      relief=.85*spine+.54*rib-.36;
      pigment=vec3(.95,1.03,1.005)*(.99+.19*relief);`,
    moss:`float curl=sin(p.x*18.+sin(19.*p.z))*cos(14.*p.z-6.*p.y);
      relief=.59*curl+.23*sin(36.*p.x-17.*p.z);
      pigment=mix(vec3(.85,.90,.94),vec3(1.11,1.08,1.04),.5+.45*relief);`,
    crystal:`float plane=p.y*14.+1.1*p.x-.83*p.z+.18*sin(4.*p.z+3.*p.x);
      relief=.53*cos(6.28*plane)+.30*cos(12.56*plane);
      pigment=mix(vec3(.90,.86,.79),vec3(1.11,1.07,1.03),.5+.55*relief);`,
    sponge:`vec2 grid=vec2(12.*atan(p.z,p.x)/6.283185+6.,7.*p.y);
      grid.x+=mod(floor(grid.y),2.)*.5;
      vec2 cell=fract(grid)-.5;float pore=length(cell*vec2(1.,.84));
      relief=smoothstep(.035,.18,pore)-.65+.28*exp(-abs(pore-.21)*20.);
      pigment=mix(vec3(.64,.59,.66),vec3(1.06,1.02,.99),smoothstep(.02,.18,pore));`,
    nacre:`float rib=cos(20.*atan(p.y-.2,p.x)+5.*p.z);
      relief=rib*.58; pigment=mix(vec3(.93,.91,.86),vec3(.98,1.09,1.13),.5+.45*rib);`
  };
  material.customProgramCacheKey=()=>'field-finish-'+kind;
  material.onBeforeCompile=s=>{
    s.vertexShader='varying vec3 fieldPoint;\n'+s.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nfieldPoint=position;');
    s.fragmentShader='varying vec3 fieldPoint;\n'+s.fragmentShader.replace('#include <color_fragment>',
      `#include <color_fragment>
       vec3 p=fieldPoint,pigment=vec3(1.);
       float relief=0.,lod=1.-smoothstep(.006,.06,length(fwidth(p)));
       ${surfaces[kind]}
       diffuseColor.rgb*=mix(vec3(1.),pigment,lod);`).replace('#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
       vec3 hx=dFdx(-vViewPosition),hy=dFdy(-vViewPosition);
       vec3 rx=cross(hy,normal),ry=cross(normal,hx);
       float det=dot(hx,rx);
       normal=normalize(abs(det)*normal-sign(det)*.004*lod*(dFdx(relief)*rx+dFdy(relief)*ry)+1e-12*normal);`);
  };
  return material;
}
