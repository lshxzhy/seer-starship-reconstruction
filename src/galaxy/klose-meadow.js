// Characteristic foreground forms from the Klose maps. Each asset is built
// once and placed by the shared scenery instance/collision system.
function buildMeadowPlants(T){
  const tau=Math.PI*2;
  function mesh(pos,rgb,indices){
    const g=new T.BufferGeometry();g.setIndex(indices);
    g.setAttribute('position',new T.Float32BufferAttribute(pos,3));
    g.setAttribute('color',new T.Float32BufferAttribute(rgb,3));g.computeVertexNormals();return g;
  }
  function pinkRoot(){
    const pts=[],rgb=[],ix=[],sides=18;
    // The map's low pink plant divides into fleshy toes before curling up.
    // These are joined volumes, so the fork reads from the walking camera too.
    function branch(points,width,rings){
      const start=pts.length/3,path=new T.CatmullRomCurve3(points.map(a=>new T.Vector3(...a)));
      const cross=path.computeFrenetFrames(rings,false);
      for(let j=0;j<=rings;j++){
        const t=j/rings,center=path.getPointAt(t),w=width*(1-t)**.65+.037*Math.sin(Math.PI*t)**2+.003;
        for(let k=0;k<sides;k++){
          const a=k*tau/sides,fold=1+.095*Math.cos(5*a+4*t);
          const v=center.clone().addScaledVector(cross.normals[j],w*fold*Math.cos(a))
            .addScaledVector(cross.binormals[j],w*.88*fold*Math.sin(a));
          pts.push(v.x,v.y,v.z);
          const tone=.68+.18*Math.cos(5*a+4*t)+.12*Math.sin(2*a+t);
          rgb.push(.83+.15*tone,.56+.39*tone,.70+.26*tone);
          if(j<rings){const n=start+j*sides+k,b=start+j*sides+(k+1)%sides;ix.push(n,b,n+sides,b,b+sides,n+sides);}
        }
      }
      for(let k=1;k<sides-1;k++){
        ix.push(start,start+k+1,start+k);
        const tip=start+rings*sides;ix.push(tip,tip+k,tip+k+1);
      }
    }
    branch([[0,-.07,0],[.17,.22,-.08],[.46,.24,-.12],[.79,.15,-.03],[.98,.11,.16],[1.13,.27,.22],[1.1,.36,.18]],.29,36);
    branch([[.32,.15,-.10],[.52,.19,-.35],[.84,.10,-.46],[1.01,.20,-.40],[1.01,.29,-.32]],.16,24);
    branch([[.14,.10,.04],[.35,.12,.26],[.60,.08,.37],[.72,.17,.31]],.125,20);
    return mesh(pts,rgb,ix);
  }
  function socketRoot(){
    const pts=[],rgb=[],ix=[],sectors=7,rows=4,steps=16;
    const q=new T.Vector3();
    function vertex(a,t,recess,hex,light){
      const radius=(.48-.21*t+.06*Math.cos(3.4*t+.4)+.042*Math.cos(5*a+3*t))*recess;
      const color=new T.Color(hex).convertSRGBToLinear();
      q.set(.36*t*t+radius*Math.cos(a),2.7*t+.11*t*Math.sin(3*a+.3),.19*Math.sin(t*4)+radius*Math.sin(a));
      pts.push(q.x,q.y,q.z);rgb.push(color.r*light,color.g*light,color.b*light);return pts.length/3-1;
    }
    function joint(a,b){
      for(let k=0;k<a.length;k++){const n=(k+1)%a.length;ix.push(a[k],a[n],b[k],a[n],b[n],b[k]);}
    }
    for(let j=0;j<rows;j++)for(let i=0;i<sectors;i++){
      const seed=i*7+j*3+i*j,hole=seed%4!==1,membrane=(i+2*j)%8===2;
      const bands=hole?[[1,1,0xc59970],[.81,1.02,0xe5b983],[.67,1.01,0xba8058],
        [.59,.83,0x684638],[.47,.66,membrane?0xf4807c:0x513c35],[.01,.61,membrane?0xffb3a9:0x443631]]:
        [[1,1,0xc59970],[.64,1,0xe3b586],[.01,1,0xcf9f75]];
      let prev;
      for(const [band,[r,depth,color]] of bands.entries()){
        const loop=[];
        for(let k=0;k<steps;k++){
          const angle=k*tau/steps-Math.PI*.25,c=Math.cos(angle),s=Math.sin(angle);
          const rad=band===0?.5/Math.max(Math.abs(c),Math.abs(s)):.49*r;
          const u=.5+rad*c*(band?.9:1),v=.5+rad*s*(band?.83:1);
          loop.push(vertex((i+u)*tau/sectors,(j+v)/rows,depth,color,1+.055*Math.cos(angle+seed)));
        }
        if(prev)joint(prev,loop);prev=loop;
      }
      ix.push(...[...Array(steps-2)].flatMap((_,k)=>[prev[0],prev[k+1],prev[k+2]]));
    }
    let prev;
    for(const [t,r,c] of [[1,1,0xdcb083],[1.01,.83,0xeac9a0],[.90,.67,0x674a38],[.77,.06,0x433731]]){
      const rim=Array.from({length:56},(_,k)=>vertex(tau*k/56,t,r,c,1));
      if(prev)joint(prev,rim);prev=rim;
    }
    return mesh(pts,rgb,ix);
  }
  function porousShelf(){
    const pts=[],rgb=[],ix=[],steps=16,nx=6,nz=4;
    function vertex(x,y,z,shade){
      // Rounded corners retain the original broad, layered shelf silhouette.
      const soften=1-.13*Math.abs(x*z),light=new T.Color(shade).convertSRGBToLinear();
      pts.push(x*soften,y+.035*x,z*soften);
      rgb.push(light.r,light.g,light.b);return pts.length/3-1;
    }
    function bridge(a,b){for(let k=0;k<a.length;k++){const n=(k+1)%a.length;ix.push(a[k],a[n],b[k],a[n],b[n],b[k]);}}
    // Every opening has a raised lip, a sloping inner wall and a recessed
    // floor; it is not a dark decal laid on an otherwise solid boulder.
    for(let row=0;row<nz;row++)for(let col=0;col<nx;col++){
      const hole=(col+3*row)%5!==1,loops=hole?
        [[1,.30,0xcdb48c],[.77,.34,0xe5c9a0],[.57,.29,0xa98661],[.46,.10,0x786043],[.15,.055,0x594b38]]:
        [[1,.30,0xcdb48c],[.73,.34,0xe2c59a],[.03,.35,0xd6b98e]];
      let prev;
      for(const [band,[r,y,tint]] of loops.entries()){
        const ring=[];
        for(let k=0;k<steps;k++){
          const a=k*tau/steps+Math.PI/4,c=Math.cos(a),s=Math.sin(a);
          const reach=band===0?1/Math.max(Math.abs(c),Math.abs(s)):r;
          ring.push(vertex(-1+(col+.5+.5*c*reach)*2/nx,y,-1+(row+.5+.5*s*reach)*2/nz,tint));
        }
        if(prev)bridge(prev,ring);prev=ring;
      }
      for(let k=1;k<steps-1;k++)ix.push(prev[0],prev[k],prev[k+1]);
    }
    let prev;
    for(const [reach,y,tint] of [[1,.30,0xcdb48c],[1.035,.19,0xb68c61],[.91,.11,0x806343],
      [.96,-.09,0xa17b54],[.84,-.17,0x735b42],[.87,-.33,0x96734e],[.72,-.39,0x69553e]]){
      const rim=[];
      for(let side=0;side<4;side++)for(let k=0;k<12;k++){
        const u=-1+k/6,[x,z]=side===0?[u,-1]:side===1?[1,u]:side===2?[-u,1]:[-1,-u];
        rim.push(vertex(x*reach,y,z*reach,tint));
      }
      if(prev)bridge(prev,rim);prev=rim;
    }
    for(let k=1;k<prev.length-1;k++)ix.push(prev[0],prev[k+1],prev[k]);
    return mesh(pts,rgb,ix);
  }
  function hollowRoot(){
    const pts=[],rgb=[],ix=[],sides=48;
    // Open end grain, thick bark and a dark inner tube remain visible from
    // either end of a fallen trunk; the cavity is not filled by an end cap.
    const profile=[[1,-1,0x6a4654],[1.04,-.90,0x835066],[.99,.82,0x7b485c],[.91,1,0xb07a69],
      [.68,1.01,0xc49279],[.63,.87,0x503c47],[.61,-.87,0x3b303c],[.68,-1.01,0x9b6b60],[1,-1,0x6a4654]];
    for(const [j,[r,y,tint]] of profile.entries())for(let k=0;k<sides;k++){
      const a=k*tau/sides,bark=j<4||j===profile.length-1?1+.05*Math.cos(a*7+.4*y):1;
      const c=new T.Color(tint).convertSRGBToLinear(),shade=.84+.16*Math.cos(a*7+.4*y);
      pts.push(r*bark*Math.cos(a)+.10*y*y,y,r*bark*Math.sin(a));rgb.push(c.r*shade,c.g*shade,c.b*shade);
      if(j){const n=j*sides+k,b=j*sides+(k+1)%sides;ix.push(n-sides,b-sides,n,n,b-sides,b);}
    }
    return mesh(pts,rgb,ix);
  }
  return {meadowRoot:pinkRoot(),meadowSocket:socketRoot(),porousShelf:porousShelf(),hollowRoot:hollowRoot()};
}
