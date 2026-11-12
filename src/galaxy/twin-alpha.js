// Taomee maps 105, 106, 46 and 407. Walkable distances, hidden backs and the
// meandering connection between these painted scenes are authored for this world.
const ALPHA_WORLD=defineTwinWorld({
  id:'alpha',name:'双子阿尔法星',radius:38000,lat:.29,lon:-.95,
  sites:[
    {id:'alpha-springs',name:'双子阿尔法星 · 温泉群',mapId:105,x:0,z:0,lookAt:[-5,-15],lookPitch:.10,description:'矿物环托住碧色温泉，蒸汽从金色菌台与孔树之间升起。'},
    {id:'alpha-rock',name:'阿尔法星岩地',mapId:106,x:65,z:-103,lookAt:[106,-190],lookPitch:.18,description:'紫色盘根穿过开裂的银灰板岩；巨型豆豆果树与能源高塔分立岩地两侧。'},
    {id:'alpha-station',name:'海盗能源站',mapId:46,x:103,z:-163,lookAt:[104,-186],lookPitch:.20,description:'滚筒输送带通往能源塔，右翼橙色传送盘接通贝塔星荒原。'},
    {id:'alpha-forest',name:'黑白森林',mapId:407,x:-88,z:-45,lookAt:[-94,-63],description:'巨根拱起林廊，树间漏下青绿色天光，赭色石径通向暖光树洞。'}
  ],
  routes:[['alpha-springs','alpha-rock'],['alpha-springs','alpha-forest'],['alpha-rock','alpha-station']],
  landingSites:[{id:'alpha-landing',name:'温泉东侧高台',x:29,z:36,description:'温泉盆地东南侧为 L-01 留出的平坦着陆高地。'}],
  palette:{soil:0xb0b9aa,rock:0x91879d,highlight:0xc2dfca,horizon:0xc0dfcd,zenith:0x536c92,haze:0x9eb9ba},
  terrainHeight(x,z){
    const knoll=(cx,cz,rx,rz)=>Math.exp(-(((x-cx)/rx)**2+((z-cz)/rz)**2));
    const thermalBowl=knoll(-5,-16,38,31),forested=knoll(-94,-52,64,46);
    const land=4.6-3.6*thermalBowl+4.1*knoll(25,32,41,27)+3.8*knoll(75,-141,42,71)
      -2.5*forested+.65*Math.sin(x*.044+Math.cos(z*.034))+.45*Math.sin(z*.067-x*.025);
    const distance=Math.hypot(x-105,z+177),t=T.MathUtils.smoothstep(distance,24,43);
    return 6.25+(land-6.25)*t;
  },
  groundTone(x,z){
    const blend=(a,b,t)=>{
      t=Math.max(0,Math.min(1,t));
      return (Math.round((a>>16)*(1-t)+(b>>16)*t)<<16)|
        (Math.round(((a>>8)&255)*(1-t)+((b>>8)&255)*t)<<8)|Math.round((a&255)*(1-t)+(b&255)*t);
    };
    const marble=Math.sin(x*.19+z*.15+1.2*Math.sin(z*.25)),grain=.5+.5*Math.sin(x*.46-z*.22)*Math.cos(z*.32);
    let tone=blend(0xa1aea6,0xd1cdb3,.50+.23*marble+.27*grain);
    const forest=Math.hypot((x+94)/48,(z+54)/39);
    if(forest<1.65){
      const path=Math.abs(x+89+.28*(z+52)+1.6*Math.sin(z*.15));
      const forestTone=blend(0x394837,0x85613e,Math.max(0,1-path/10.5));
      tone=blend(tone,forestTone,(1.65-forest)*1.45);
    }
    const rocks=Math.hypot((x-70)/49,(z+107)/49);
    if(rocks<1.55)tone=blend(tone,blend(0x878b89,0xc8c4b5,.5+.32*marble+.18*grain),(1.55-rocks)*1.2);
    const station=Math.hypot((x-103)/36,(z+182)/37);
    if(station<1.55)tone=blend(tone,blend(0x695352,0x857372,grain),(1.55-station)*1.32);
    return tone;
  },
  buildLandmarks:buildAlphaLandmarks
});

function buildAlphaLandmarks({T,root,ground,material,stamp,block,animate,portal}){
  const tau=Math.PI*2,V=(x,y,z)=>new T.Vector3(x,y,z);
  const sphere=new T.SphereGeometry(1,18,12),cube=new T.BoxGeometry(1,1,1);
  const rod=new T.CylinderGeometry(1,1,1,16),disc=new T.CylinderGeometry(1,1,1,52);
  const hoop=new T.TorusGeometry(1,.045,8,64);
  const stone=material(0xffffff,{vertexColors:true,roughness:.87}),skin=material(0xffffff,{vertexColors:true,roughness:.67});
  const metal=material(0x454d58,{metalness:.52,roughness:.46}),slate=material(0x8299a6,{metalness:.38,roughness:.54});
  const purple=material(0x654277,{metalness:.40,roughness:.41}),hazard=material(0xe8a340,{metalness:.3});
  const lime=material(0xc0f945,{emissive:0x64931d,emissiveIntensity:.60}),ivory=material(0xdbefce);
  const lilac=material(0x824d78),leaf=material(0x39786f),amber=material(0xeac843);
  const teal=material(0x477e83),moss=material(0x334b38),bark=material(0x253e37);
  const vEuler=new T.Euler(),q=new T.Quaternion(),up=V(0,1,0);
  function link(g,m,a,b,r,depth=r){
    const dir=b.clone().sub(a),length=dir.length();
    q.setFromUnitVectors(up,dir.normalize());vEuler.setFromQuaternion(q);
    stamp(g,m,(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2,r,length,depth,vEuler.x,vEuler.y,vEuler.z);
  }
  function curve(points,radius,count=20){
    return new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>V(...p))),count,radius,8,false);
  }
  // Strata, bark flutes and mushroom lamellae are continuous shaded surfaces.
  function revolve(profile,segments,tint,warp){
    const points=[],colours=[],indices=[],tone=new T.Color();
    for(let j=0;j<profile.length;j++)for(let i=0;i<segments;i++){
      const theta=tau*i/segments,[r,y,c]=profile[j],rad=r*(1+(warp?warp(theta,y):0));
      points.push(rad*Math.cos(theta),y,rad*Math.sin(theta));
      tone.setHex(c).convertSRGBToLinear();const light=tint(theta,y,j);
      colours.push(tone.r*light,tone.g*light,tone.b*light);
      if(j+1<profile.length){const a=j*segments+i,b=j*segments+(i+1)%segments;indices.push(a,a+segments,b,b,a+segments,b+segments);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));
    g.setAttribute('color',new T.Float32BufferAttribute(colours,3));g.setIndex(indices);g.computeVertexNormals();return g;
  }
  const rim=revolve([[1.28,-.03,0x8a8c88],[1.13,.19,0xa9aba0],[1.04,.52,0xd6ccb3],
    [.92,.56,0xf2ebc1],[.85,.42,0x9cb8a5],[.78,.20,0x408b87]],56,
    (a,y)=>.86+.16*Math.max(0,Math.sin(13*a+.7))+.08*Math.cos(a*5+y),
    a=>.064*Math.sin(a*3+.8)+.035*Math.sin(a*7));
  const rock=revolve([[.50,-.4,0x88868a],[.91,-.22,0xabada2],[1,.09,0x949599],[.82,.30,0xd0d3c3],
    [.41,.44,0xc0bdb3],[.015,.45,0xb4b9a7]],9,(a,y)=>.93+.14*Math.sin(a*3+y),
    (a,y)=>.10*Math.cos(3*a+y*1.4)+.09*Math.sin(5*a-y));
  const crystal=revolve([[.50,0,0x81aeb0],[.60,.12,0xb4ddd1],[.54,.73,0xc6cbae],
    [.43,.85,0xdeddbb],[.015,1,0xf2efc9]],6,a=>.95+.15*Math.cos(a*2),a=>.05*Math.sin(a*3));
  const trunk=revolve([[1.42,0,0x426d74],[1.05,.08,0x507980],[.82,.26,0x528088],
    [.61,.52,0x53818c],[.47,.80,0x6f8d8a],[.37,1,0x496f7b]],36,
    (a,y)=>.77+.24*Math.pow(.5+.5*Math.cos(7*a+y*3),2)+.12*Math.sin(3*a-y), (a,y)=>.13*Math.cos(7*a+3*y));
  const cap=revolve([[.09,0,0x919da9],[.63,.12,0x9d97a2],[.97,.32,0xe9c56a],
    [1,.39,0xf4d050],[.90,.50,0xe8b53d],[.69,.56,0xd1a03a],[.38,.6,0xcd9132],
    [.01,.59,0xe2ba45]],72,(a,y,j)=>j<3?.66+.32*Math.pow(Math.cos(28*a),2):.94+.09*Math.cos(a*6-y),
    a=>.05*Math.sin(3*a+.6)+.035*Math.cos(7*a));
  const curled=curve([[0,0,0],[-.12,-.43,.05],[.047,-.83,.13],[.22,-.96,.08],[.38,-.81,-.01],[.31,-.65,.02],[.19,-.72,.06]],.048);
  const twist=curve([[0,0,0],[.30,.07,.03],[.53,.18,.09],[.66,.45,.14],[.83,.72,.18],[1,1,0]],.075);
  function nativeTree(x,z,size,turn=0){
    const y=ground(x,z);
    stamp(trunk,skin,x,y-.15,z,size*.65,size*4.2,size*.69,0,turn,0);
    block(x,z,size*.84,size*4.45);
    for(let j=0;j<5;j++){
      const a=turn+j*tau/5,h=(.52+.72*j)*size,c=Math.cos(a),s=Math.sin(a),width=(j===4?1.78:.89+.19*(j%2))*size;
      const tx=x+c*.64*size,tz=z+s*.64*size;
      stamp(cap,skin,tx,y+h,tz,width,.78*size,width*.91,0,a,0);
      const budR=(.19+.055*(j%2))*size;
      const ex=x+c*.58*size,ez=z+s*.58*size;
      stamp(sphere,teal,ex,y+h+.52*size,ez,budR*1.15,budR*1.34,budR*.79,0,-a,0);
      stamp(sphere,lime,ex+c*.08*size,y+h+.54*size,ez+s*.08*size,budR,budR*1.18,budR*.66,0,-a,0);
      stamp(curled,lilac,tx+s*width*.70,y+h+.15*size,tz+c*width*.70,size*.86,size*.88,size*.86,0,a,0);
    }
    const crownWidth=(1.54+.21*Math.sin(turn*3))*size;
    stamp(cap,skin,x,y+4.03*size,z,crownWidth,size*1.07,crownWidth*.79,-.08,turn,.08);
    for(let j=0;j<3;j++){
      const a=turn+j*tau/3;
      stamp(twist,teal,x+size*1.65*Math.cos(a),y,z+size*1.65*Math.sin(a),1.67*size,2.30*size,1.2*size,0,Math.PI-a,0);
    }
  }
  const ventData=[[-7,-12,3.05],[5,-21,2.75],[-18,-27,2.65],[7,-6,1.95],[-15,3,2.2],[.5,-37,2.35],[-32,-7,2.1],[18,-29,1.8]];
  const water=new T.ShaderMaterial({uniforms:{clock:{value:0}},vertexShader:`
    varying vec2 disk;void main(){disk=position.xz;vec4 p=vec4(position,1.);
    #ifdef USE_INSTANCING
      p=instanceMatrix*p;
    #endif
    gl_Position=projectionMatrix*modelViewMatrix*p;}`,
    fragmentShader:`varying vec2 disk;uniform float clock;void main(){
      float r=length(disk),a=atan(disk.y,disk.x),w=sin(22.*r-clock*2.4+1.3*sin(a*2.+clock*.46));
      float line=smoothstep(.58,.96,w)*smoothstep(.13,.47,r);
      vec3 col=mix(vec3(.24,.77,.74),vec3(.66,.96,.82),.22+.58*r);
      col=mix(col,vec3(.93,1.,.91),.34*line+.18*(1.-smoothstep(.0,.29,r)));
      gl_FragColor=vec4(col,1.);}`});
  const mistPos=[],mistData=[];
  for(const [i,[x,z,r]] of ventData.entries()){
    const y=ground(x,z);
    const rise=.65+r*.13;
    stamp(rim,stone,x,y,z,r,rise,r*.89,0,i*.71,0);
    stamp(disc,water,x,y+rise*.44,z,.97*r,.06,r*.84,0,i*.71,0);
    block(x,z,1.07*r,rise*.58);
    for(let j=0;j<6;j++){
      mistPos.push(x,y+.62,z);
      mistData.push((i*.143+j/6)%1, .54*r+.22*(j%2),i*1.7+j*.83,(i===0?3.0:1.6)*r);
    }
  }
  const mistGeom=new T.BufferGeometry();mistGeom.setAttribute('position',new T.Float32BufferAttribute(mistPos,3));
  mistGeom.setAttribute('flow',new T.Float32BufferAttribute(mistData,4));
  const mistMat=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{clock:{value:0}},
    vertexShader:`attribute vec4 flow;uniform float clock;varying float opacity;varying float curl;
      void main(){float t=fract(clock*.25+flow.x);float beat=.66+.34*sin(clock*.65+flow.z);
        vec3 p=position+vec3(sin(t*7.+flow.z)*t*.64+1.25*t*t,flow.w*t*beat,cos(t*6.+flow.z)*t*.52);
        vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
        gl_PointSize=clamp(flow.y*(.67+t*2.7)*600./max(.1,-mv.z),2.,170.);
        opacity=.60*(1.-t)*smoothstep(0.,.12,t);curl=flow.z+t*2.;}`,
    fragmentShader:`varying float opacity;varying float curl;void main(){
      vec2 uv=gl_PointCoord*2.-1.;float wr=.10*sin(uv.y*8.+curl)*sin(uv.x*7.-curl);
      float puff=(1.-smoothstep(.13,1.,length(uv)+wr));gl_FragColor=vec4(.83,.98,.92,puff*puff*opacity);}`});
  const steam=new T.Points(mistGeom,mistMat);steam.name='温泉蒸汽';steam.frustumCulled=false;root.add(steam);
  const jet=new T.CylinderGeometry(1,1,1,26,20,true);
  jet.translate(0,.5,0);
  const spray=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{clock:{value:0}},
    vertexShader:`uniform float clock;varying vec2 flow;void main(){
      vec3 p=position;float h=position.y;float phase=0.;
      #ifdef USE_INSTANCING
        phase=instanceMatrix[3].x;
      #endif
      float twist=6.28*uv.x+5.*h-clock*1.5;float beat=.70+.28*sin(phase+clock*.72);
      p.xz*=(.46+.34*h+.10*sin(6.28*h))*(.83+.17*sin(3.*twist)+.08*cos(5.*twist+clock*1.1));
      p.x+=.20*h*h*sin(3.*h+phase+clock*1.4);p.z+=.18*h*h*cos(4.*h+clock*1.2);
      p.y*=beat;vec4 v=vec4(p,1.);
      #ifdef USE_INSTANCING
        v=instanceMatrix*v;
      #endif
      flow=vec2(uv.x,h);gl_Position=projectionMatrix*modelViewMatrix*v;}`,
    fragmentShader:`uniform float clock;varying vec2 flow;void main(){
      float band=.5+.5*sin(flow.x*44.+flow.y*15.-clock*3.+sin(flow.y*8.+clock)*2.);
      float edge=smoothstep(.2,.88,band);
      vec3 col=mix(vec3(.20,.77,.78),vec3(.86,.99,.94),edge*.74+flow.y*.22);
      float alpha=(.16+.37*edge)*(1.-smoothstep(.43,1.,flow.y));
      gl_FragColor=vec4(col,alpha);}`});
  const dropPos=[],dropCycle=[];
  for(const [i,h] of [[0,6.2],[2,3.5],[5,3.8]]){
    const [x,z,r]=ventData[i];stamp(jet,spray,x,ground(x,z)+.38,z,r*.40,h,r*.35);
    for(let j=0;j<45;j++){
      const a=j*2.39996,spread=.52+.39*Math.sin(j*3.07)**2;
      dropPos.push(x,ground(x,z)+.55,z);
      dropCycle.push(Math.cos(a)*r*spread,Math.sin(a)*r*spread,h*(.52+.34*Math.sin(j*1.73)**2),j/45+i*.23);
    }
  }
  // Water at the top separates into illuminated beads and falls back inside the basin.
  const drops=new T.BufferGeometry();drops.setAttribute('position',new T.Float32BufferAttribute(dropPos,3));
  drops.setAttribute('flight',new T.Float32BufferAttribute(dropCycle,4));
  const bead=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{clock:water.uniforms.clock},
    vertexShader:`attribute vec4 flight;uniform float clock;varying float fade;void main(){
      float t=fract(clock*.55+flight.w);vec3 p=position+vec3(t*flight.x,4.*flight.z*t*(1.-t),t*flight.y);
      vec4 v=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*v;
      gl_PointSize=clamp(110./max(.1,-v.z),1.4,12.);fade=smoothstep(.07,.28,t)*(1.-smoothstep(.87,1.,t));}`,
    fragmentShader:`varying float fade;void main(){vec2 p=(gl_PointCoord*2.-1.)*vec2(1.45,1.);
      float f=1.-smoothstep(.30,1.,length(p));gl_FragColor=vec4(.77,.98,.98,.78*f*fade);}`});
  const droplets=new T.Points(drops,bead);droplets.frustumCulled=false;root.add(droplets);
  animate((dt,time)=>{water.uniforms.clock.value=time;mistMat.uniforms.clock.value=time;spray.uniforms.clock.value=time;});
  for(const [x,z,s,a] of [[-18,-8,3.6,.3],[19,-14,4.6,.15],[-23,10,2.6,.8],[-26,-34,5.1,1],
    [8,-48,4.0,1.6],[31,-40,3.3,.6],[-43,-11,4.3,1.2],[-33,28,4,2.1],[-47,12,4.7,.15],
    [46,-14,4.1,.8],[52,-45,3.8,1.9],[26,-72,2.6,.5]])nativeTree(x,z,s,a);
  const terrace=revolve([[.78,-.13,0x99949a],[.89,.12,0x78a1a8],[.93,.42,0x65939d],
    [.99,.50,0xd6b859],[1,.55,0xdec454],[.85,.61,0xb1a251],[.03,.63,0xbdb96c]],52,
    (a,y,j)=>j<3?.70+.32*Math.abs(Math.cos(a*18+y*2)):.94+.08*Math.cos(6*a),
    a=>.10*Math.sin(3*a)+.05*Math.cos(7*a+.4));
  for(const [x,z,w,h,d] of [[-42,-36,15,10,7],[-40,-66,14,14,9],[-3,-69,16,11,9],[15,-87,10,17,7],[51,-66,12,15,8],[-63,20,18,11,8]]){
    const y=ground(x,z);stamp(terrace,stone,x,y,z,w,h,d,0,.2,0);block(x,z,Math.max(w,d)*.88,h*.64);
    for(let j=0;j<3;j++)stamp(curled,lilac,x+Math.cos(j*1.7)*w*.90,y+.51*h,z+Math.sin(j*1.7)*d*.87,2.2,3.1,1.8,0,j,0);
  }
  for(let i=0;i<41;i++){
    const a=i*2.39996,r=14+((i*13)%43),x=-8+r*Math.cos(a),z=-18+.70*r*Math.sin(a);
    if(Math.hypot(x-29,z-36)<25||Math.hypot(x,z)<4||ventData.some(v=>Math.hypot(x-v[0],z-v[1])<v[2]*1.36))continue;
    const y=ground(x,z),s=.35+(i%4)*.11;
    stamp(cap,skin,x,y+s*.52,z,s*1.2,s,s*1.05,0,a,0);stamp(sphere,ivory,x,y+s*.26,z,s*.24,s*.38,s*.22);
    if(i%4===0){
      for(let j=0;j<4;j++)stamp(crystal,skin,x+.48*j,y,z+.3*Math.sin(j),s*.53,s*(1.2+.3*j),s*.50,0,a,-.13+j*.06);
    }
  }
  // Exposed jointed slabs and violet root bundles border the road to the tower.
  const roots=curve([[0,0,0],[.16,.16,.06],[.42,-.02,.12],[.71,.14,.03],[1,.04,0]],.065);
  for(let i=0;i<60;i++){
    const side=i%2?-1:1,n=Math.floor(i/2),x=46+n*1.75+side*(10.4+(n*7)%20),z=-76-n*2.1;
    if(Math.hypot(x-65,z+103)<5.5)continue;
    const y=ground(x,z),s=1.6+((i*13)%9)*.39;
    stamp(rock,stone,x,y+.16,z,s,.64*s,s*(.72+(i%3)*.10),-.035,i*.81,.04);
    if(s>3.7)block(x,z,s*.80,.6*s);
    if(i%3===0)stamp(roots,lilac,x,y+.19,z,3.7*s,.64*s,s,0,i*.72,-.03);
  }
  nativeTree(45,-119,3.65,1.4);
  for(let i=0;i<8;i++){
    const x=45+3.1*Math.sin(i*.81),z=-119+2.65*Math.cos(i*.81);
    stamp(sphere,amber,x,ground(x,z)+5.7+.15*(i%3),z,.44,.57,.32,.15,i*.48,.18);
  }
  // Forest 407's illuminated opening is formed by bent multi-ridged trunks,
  // a warm hollow, and an interlaced roof. Keep the central aisle open.
  const forestTrunk=curve([[0,0,0],[.31,.13,.04],[-.14,.37,.08],[-.32,.66,-.06],[.06,.87,-.12],[.38,1,0]],.115,30);
  const forestRoot=curve([[0,.65,0],[.14,.32,.09],[.41,.14,-.06],[.70,.05,.02],[1,0,0]],.074);
  const vine=curve([[0,0,0],[.24,-.14,.05],[.49,-.33,.09],[.74,-.18,.02],[1,0,0]],.037);
  const beamGreen=material(0x528e6c),dusk=material(0x233e38),warm=material(0xd19348,{emissive:0x65301a,emissiveIntensity:.53});
  for(let i=0;i<24;i++){
    const side=i%2?-1:1,n=Math.floor(i/2),x=-92+side*(10.4+(n*3)%9),z=-33-n*3.8;
    const y=ground(x,z),h=9+((i*7)%12),a=i*.96;
    stamp(forestTrunk,bark,x,y,z,7,h,7,0,a,0);
    block(x,z,2,h*.92);
    for(let j=0;j<4;j++){
      const angle=a+j*tau/4;
      stamp(forestRoot,j%2?dusk:moss,x,y,z,5.8,h*.62,4.6,0,angle,0);
      stamp(forestTrunk,j%2?moss:bark,x,y+1,z,3.0,h*1.1,4.0,-.10,angle,.18*side);
    }
    stamp(cap,moss,x,y+h*1.06,z,6.2,1.75,5.7,.16,a,.1);
    if(i%2===0)stamp(vine,beamGreen,x,y+h*.83,z,18,6,12,0,a*.07,-.08);
  }
  const hollowX=-98,hollowZ=-78,hollowY=ground(hollowX,hollowZ);
  stamp(trunk,stone,hollowX,hollowY,hollowZ,4.6,10.6,3.5,0,.9,.10);
  stamp(sphere,bark,hollowX,hollowY+2.9,hollowZ+1.9,2.2,3.8,1.05,0,0,-.07);
  stamp(sphere,warm,hollowX,hollowY+2.4,hollowZ+2.75,1.46,2.8,.39,0,0,-.06);
  block(hollowX,hollowZ,3.6,10.8);
  for(let i=0;i<13;i++){
    const x=-92+3*Math.sin(i*1.74),z=-40-i*2.9;
    stamp(rock,stone,x,ground(x,z)-.27,z,1.25,.80,1.60,0,i,0);
  }
  // The original 106 vista terminates at a tall grey cylinder with lime slots.
  // At its feet map 46 uses two ochre grilles, blue decks and a pink warp disc.
  const towerX=106,towerZ=-190,base=ground(towerX,towerZ);
  const tower=revolve([[1.0,0,0x4f5361],[.96,.09,0x96959b],[.85,.13,0x69676e],
    [.80,.60,0x8c8791],[.76,.70,0x88848d],[.79,.74,0xb2aba7],[.67,.76,0x736b75],
    [.61,.94,0xaaa39d],[.60,1,0xccc1b0],[.02,1,0x89929b]],44,a=>.82+.16*Math.cos(a*2),a=>.012*Math.cos(12*a));
  stamp(tower,stone,towerX,base,towerZ,9.8,48,9.8);block(towerX,towerZ,9.55,48);
  const panel=material(0x626b6e,{roughness:.54,metalness:.39}),edgeMetal=material(0xafaa9e,{metalness:.48});
  for(let band=0;band<3;band++)for(let i=0;i<18;i++){
    const a=tau*(i+(band%2)*.5)/18,c=Math.cos(a),s=Math.sin(a),r=band===0?8.7:band===1?7.8:6.5;
    const h=band===0?7.4:band===1?21.5:39.2,rot=Math.PI/2-a;
    stamp(cube,metal,towerX+r*c,base+h,towerZ+r*s,.115,5.4,.18,0,rot,0);
    stamp(cube,edgeMetal,towerX+r*c,base+h+2.65,towerZ+r*s,2.55,.075,.15,0,rot,0);
  }
  const panelZ=towerZ+9.25;
  stamp(cube,metal,towerX,base+5.55,panelZ,6.3,8,.70,0,0,0);
  stamp(cube,panel,towerX,base+5.7,panelZ+.44,5.76,7.45,.39);
  stamp(sphere,edgeMetal,towerX,base+6.72,panelZ+.58,1.92,2.65,.44);
  stamp(sphere,metal,towerX,base+6.68,panelZ+.88,1.57,2.26,.23);
  for(const [a,b] of [[[-1.01,7.47],[1.01,7.47]],[[1.01,7.47],[0,5.78]],[[0,5.78],[-1.01,7.47]]])
    link(rod,lime,V(towerX+a[0],base+a[1],panelZ+1.11),V(towerX+b[0],base+b[1],panelZ+1.11),.102);
  for(let k=0;k<5;k++)stamp(cube,metal,towerX-1.26+k*.63,base+3.03,panelZ+.67,.27,.73,.12);
  for(let i=0;i<9;i++){
    const x=towerX+(i%3-1)*3.88,z=towerZ+13.8+Math.floor(i/3)*3.25;
    stamp(cube,slate,x,ground(x,z)+.024,z,3.81,.11,3.19);
    stamp(cube,edgeMetal,x,ground(x,z)+.085,z+1.43,3.10,.023,.07);
  }
  for(let i=0;i<14;i++){
    const a=tau*i/14,c=Math.cos(a),s=Math.sin(a),h=11+(i%3)*6.4;
    const yrot=Math.PI/2-a;
    stamp(cube,metal,towerX+7.9*c,base+h,towerZ+7.9*s,1.22,7.9,.60,0,yrot,0);
    stamp(cube,lime,towerX+8.26*c,base+h,towerZ+8.26*s,.68,6.5,.25,0,yrot,0);
  }
  for(const [h,r] of [[2.5,9.6],[10.5,8.2],[32.5,7.5],[38.2,6.4],[45.1,6.1]]){
    stamp(hoop,metal,towerX,base+h,towerZ,r,r,3.2,Math.PI/2,0,0);
  }
  for(const side of [-1,1]){
    const x=towerX+side*11.4,z=towerZ+9,y=ground(x,z);
    stamp(disc,purple,x,y+2,z,2.52,4,2.52);
    stamp(disc,metal,x,y+4.13,z,2.82,.50,2.82);
    stamp(crystal,stone,x,y+4.3,z,1.45,2.1,1.48);block(x,z,2.56,6.4);
    link(rod,metal,V(x,y+3,z),V(towerX+side*6,base+9,towerZ+2),.84);
    const deckX=towerX+side*9,deckZ=towerZ+14.8,deckY=ground(deckX,deckZ);
    stamp(cube,slate,deckX,deckY+.03,deckZ,8.5,.13,5.3,0,.13*side,0);
    for(let k=0;k<9;k++){
      const px=deckX-3.34+k*.83;
      stamp(cube,hazard,px,deckY+.12,deckZ-2.30,.50,.08,.65,0,.30,0);
      const z2=deckZ+2.25;
      stamp(rod,metal,px,deckY+.21,z2,.40,1.75,.40,Math.PI/2,0,0);
      stamp(rod,lime,px,deckY+.22,z2,.405,.25,.405,Math.PI/2,0,0);
    }
  }
  const px=122,pz=-174,py=ground(px,pz);
  stamp(disc,metal,px,py+.045,pz,2.58,.11,2.58);
  stamp(disc,hazard,px,py+.12,pz,2.42,.10,2.42);
  stamp(disc,material(0xf3c0d5,{emissive:0xc44781,emissiveIntensity:.72}),px,py+.19,pz,1.91,.08,1.91);
  stamp(disc,ivory,px,py+.24,pz,1.18,.055,1.18);
  for(let i=0;i<8;i++){
    const a=i*tau/8;stamp(sphere,lime,px+2.20*Math.cos(a),py+.23,pz+2.20*Math.sin(a),.09,.07,.09);
  }
  portal(px,pz,'beta','beta-waste',3.5);
}
