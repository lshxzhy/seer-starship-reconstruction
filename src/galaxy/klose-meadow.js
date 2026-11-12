// Foreground plants of map 10. Each asset is built at metre scale once and
// placed by the same instance/collision system as the surrounding scenery.
function buildMeadowPlants(T){
  const tau=Math.PI*2;
  function mesh(pos,rgb,indices){
    const g=new T.BufferGeometry();g.setIndex(indices);
    g.setAttribute('position',new T.Float32BufferAttribute(pos,3));
    g.setAttribute('color',new T.Float32BufferAttribute(rgb,3));g.computeVertexNormals();return g;
  }
  function pinkRoot(){
    const pts=[],rgb=[],ix=[],rings=32,sides=18;
    const path=new T.CatmullRomCurve3([[0,-.07,0],[.17,.22,-.08],[.46,.24,-.12],[.79,.15,-.03],[.98,.11,.16],[1.13,.27,.22],[1.1,.36,.18]].map(a=>new T.Vector3(...a)));
    const cross=path.computeFrenetFrames(rings,false);
    for(let j=0;j<=rings;j++){
      const t=j/rings,center=path.getPointAt(t);
      const w=.29*(1-t)**.65+.044*Math.sin(Math.PI*t)**2+.003;
      for(let k=0;k<sides;k++){
        const a=k*tau/sides,fold=1+.095*Math.cos(5*a+4*t);
        const v=center.clone().addScaledVector(cross.normals[j],w*fold*Math.cos(a))
          .addScaledVector(cross.binormals[j],w*.88*fold*Math.sin(a));
        pts.push(v.x,v.y,v.z);
        const tone=.68+.18*Math.cos(5*a+4*t)+.12*Math.sin(2*a+t);
        rgb.push(.83+.15*tone,.56+.39*tone,.70+.26*tone);
        if(j<rings){const n=j*sides+k,b=j*sides+(k+1)%sides;ix.push(n,b,n+sides,b,b+sides,n+sides);}
      }
    }
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
  return {meadowRoot:pinkRoot(),meadowSocket:socketRoot()};
}
