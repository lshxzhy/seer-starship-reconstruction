// One companion only. The caller supplies its real east/up/south bearing;
// the low-altitude illustration may enlarge its angular radius, never its
// direction or identity. The telescope uses the actual orbital globe.
const TWIN_PANORAMA_GLSL=`
  vec3 scenicDisc(vec3 ray,vec3 sky,vec3 centre,float radius,float green,float roll,float foregroundShade){
    float facing=dot(ray,centre);
    if(facing<cos(radius*1.16))return sky;
    vec3 pole=abs(centre.y)>.98?vec3(0.,0.,1.):vec3(0.,1.,0.);
    vec3 right=normalize(cross(centre,pole)),up=cross(right,centre);
    vec2 uv=vec2(dot(ray,right),dot(ray,up))/sin(radius);
    float r=length(uv);
    vec3 lightDir=normalize(vec3(dot(sun,right),dot(sun,up),-dot(sun,centre)));
    vec3 limb=mix(vec3(.98,.68,.61),vec3(.61,.96,.89),green);
    float halo=exp(-max(0.,r-1.)*38.)*(1.-smoothstep(1.02,1.14,r));
    float litRim=smoothstep(-.4,.65,dot(uv,lightDir.xy));
    vec3 behind=mix(sky,limb,halo*(.20+.26*litRim));
    if(r>1.)return behind;
    vec3 n=vec3(uv,sqrt(max(0.,1.-r*r)));
    float ca=cos(roll),sa=sin(roll);
    vec3 axis=vec3(ca*n.x-sa*n.z,n.y,sa*n.x+ca*n.z);
    vec3 tile=twinCrust(axis,green);
    float light=dot(n,lightDir);
    float rim=pow(1.-n.z,2.4);
    float bands=relief(axis*19.)*.15+relief(axis*42.)*.055;
    float cloud=smoothstep(.49,.75,relief(axis*4.+bands)+.23*sin(axis.y*29.+4.*axis.x+bands*6.));
    // At the terminator, intersect the higher cloud deck before the ground sees the sun.
    float groundLight=smoothstep(-.10,.92,light);
    float cloudLight=smoothstep(-.21,.85,light);
    float groundShade=smoothstep(.32,.62,relief(axis*4.+bands+.13)+.23*sin(axis.y*29.+4.*axis.x+bands*6.+.12));
    vec3 ground=tile*(.36+.72*groundLight)*(1.-groundShade*.11*groundLight);
    vec3 cloudColour=mix(vec3(.83,.72,.70),vec3(.88,.91,.80),green)*(.40+.68*cloudLight);
    vec3 face=mix(ground,cloudColour,cloud*mix(.21,.34,green))+limb*(.045+(.22+.18*litRim)*rim);
    face=mix(face,sky,.10+.065*(1.-smoothstep(-.05,.18,ray.y)));
    face*=1.-foregroundShade*.17;
    return mix(face,behind,smoothstep(.991,1.,r));
  }
  vec3 twinHorizon(vec3 ray,vec3 sky,float betaGround,vec3 companion,float angularRadius,float phase){
    return scenicDisc(ray,sky,normalize(companion),angularRadius,betaGround,.48+.16*sin(phase),0.);
  }`;
