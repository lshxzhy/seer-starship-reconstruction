// Scenic double exposure of the two world-map globes. Bearings are in the
// east/up/south frame of the district, independent of the player's camera.
const TWIN_PANORAMA_GLSL=`
  vec3 scenicDisc(vec3 ray,vec3 sky,vec3 centre,float radius,float green,float roll,float foregroundShade){
    float facing=dot(ray,centre);
    if(facing<cos(radius*1.16))return sky;
    vec3 right=normalize(cross(centre,vec3(0.,1.,0.))),up=cross(right,centre);
    vec2 uv=vec2(dot(ray,right),dot(ray,up))/sin(radius);
    float r=length(uv);
    vec3 limb=mix(vec3(.98,.68,.61),vec3(.61,.96,.89),green);
    float halo=exp(-max(0.,r-1.)*38.)*(1.-smoothstep(1.02,1.14,r));
    vec3 behind=mix(sky,limb,halo*.46);
    if(r>1.)return behind;
    vec3 n=vec3(uv,sqrt(max(0.,1.-r*r)));
    float ca=cos(roll),sa=sin(roll);
    vec3 axis=vec3(ca*n.x-sa*n.z,n.y,sa*n.x+ca*n.z);
    vec3 tile=twinCrust(axis,green);
    float light=dot(n,normalize(vec3(-.62,.58,.52)));
    float rim=pow(1.-n.z,2.4);
    float bands=relief(axis*19.)*.15+relief(axis*42.)*.055;
    float cloud=smoothstep(.49,.75,relief(axis*4.+bands)+.23*sin(axis.y*29.+4.*axis.x+bands*6.));
    tile=mix(tile,vec3(.86,.88,.77),cloud*.28);
    vec3 face=tile*(.35+.78*sqrt(max(light,0.)))+limb*(.045+.40*rim);
    face=mix(face,sky,.10+.065*(1.-smoothstep(-.05,.18,ray.y)));
    face*=1.-foregroundShade*.17;
    return mix(face,behind,smoothstep(.991,1.,r));
  }
  vec3 twinHorizon(vec3 ray,vec3 sky,float betaGround,float phase){
    // Both silhouettes remain readable for the whole crossing. The smaller
    // disc transits the near limb and occludes the background without alpha layering.
    vec3 farCentre=normalize(vec3(-.265+.036*sin(phase),.30+.012*cos(phase),-1.));
    vec3 nearCentre=normalize(vec3(.061-.052*sin(phase),.21+.029*cos(phase),-1.));
    float shade=smoothstep(cos(.223),cos(.127),dot(ray,normalize(nearCentre+vec3(.023,-.020,0.))));
    vec3 back=scenicDisc(ray,sky,farCentre,.245,betaGround,.48+.16*sin(phase),shade);
    return scenicDisc(ray,back,nearCentre,.149,1.-betaGround,-.63+.11*cos(phase),0.);
  }`;
