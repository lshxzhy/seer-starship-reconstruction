// Taomee maps 105, 106, 46 and 407. Walkable distances, hidden backs and the
// meandering connection between these painted scenes are authored for this world.
const ALPHA_WORLD=defineTwinWorld({
  id:'alpha',name:'双子阿尔法星',radius:38000,lat:.29,lon:-.95,
  sites:[
    {id:'alpha-springs',name:'双子阿尔法星 · 温泉群',mapId:105,x:0,z:0,lookAt:[-4,-23],lookPitch:.24,description:'矿物环托住碧色温泉，蒸汽从金色菌台与孔树之间升起。'},
    {id:'alpha-rock',name:'阿尔法星岩地',mapId:106,x:65,z:-103,lookAt:[106,-190],lookPitch:.18,description:'紫色盘根穿过开裂的银灰板岩；巨型豆豆果树与能源高塔分立岩地两侧。'},
    {id:'alpha-station',name:'海盗能源站',mapId:46,x:103,z:-163,lookAt:[104,-186],lookPitch:.20,description:'滚筒输送带通往能源塔，右翼橙色传送盘接通贝塔星荒原。'},
    {id:'alpha-forest',name:'黑白森林',mapId:407,x:-88,z:-45,lookAt:[-92,-73],lookPitch:.025,horizon:0x9bc797,zenith:0x557d70,haze:0x7d9479,description:'赭色石径通向林间亮处，左侧石标与右侧暖光树洞分守道路两边。'}
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
  fieldSurfaceFinish(stone,'stone');
  const fungusBark=fieldSurfaceFinish(material(0xffffff,{vertexColors:true,roughness:.86}),'stem');
  const scales=fieldSurfaceFinish(material(0xffffff,{vertexColors:true,roughness:.58}),'nacre');
  const metal=material(0x454d58,{metalness:.52,roughness:.46}),slate=material(0x8299a6,{metalness:.38,roughness:.54});
  const purple=material(0x654277,{metalness:.40,roughness:.41}),hazard=material(0xe8a340,{metalness:.3});
  const lime=material(0xc0f945,{emissive:0x64931d,emissiveIntensity:.60}),ivory=material(0xdbefce);
  const lilac=material(0x824d78),leaf=material(0x39786f),amber=material(0xeac843);
  const teal=material(0x477e83),moss=material(0x334b38),bark=material(0x253e37);
  for(const m of [slate,metal,purple,hazard])fieldSurfaceFinish(m,'metal');
  fieldSurfaceFinish(bark,'stem');fieldSurfaceFinish(moss,'moss');
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
  // Full lamina, central midrib and rolled edges show from above and beneath.
  // Each whorl is one reusable mesh. Stems and leaves meet at a single base.
  function fronds(palette,n){
    const v=[],colors=[],idx=[],tone=new T.Color(),bands=9;
    for(let j=0;j<n;j++){
      const a=j*2.39996,s=Math.sin(a),c=Math.cos(a),length=.62+.32*Math.sin(j*1.72+.3)**2;
      for(let k=0;k<=bands;k++){
        const t=k/bands,w=.135*Math.pow(Math.max(.0001,Math.sin(t*Math.PI)),.74)*(.95+.14*Math.sin(k*.9+j));
        const dir=.1*t*t*Math.cos(a*2),r=length*t,y=.22+.78*Math.sin(t*1.73)-.39*t*t+.17*t*Math.cos(a);
        for(let l=-1;l<=1;l++){
          const lateral=l*w+dir,color=palette[l===0?1:((j+l+1)%3===0?2:0)];
          v.push(c*r-s*lateral,y+(l===0?.045:-.025)*Math.sin(t*Math.PI)-.22,s*r+c*lateral);
          tone.setHex(color).convertSRGBToLinear().multiplyScalar(.63+.38*t);colors.push(tone.r,tone.g,tone.b);
        }
        if(k<bands){const i=j*(bands+1)*3+k*3;idx.push(i,i+3,i+1,i+1,i+3,i+4,i+1,i+4,i+2,i+2,i+4,i+5);}
      }
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    g.setIndex(idx);g.computeVertexNormals();return g;
  }
  const foliage=fieldSurfaceFinish(material(0xffffff,{vertexColors:true,side:T.DoubleSide,roughness:.78}),'blade');
  const springFern=fronds([0x437c7e,0x9bc4a4,0x619896],8),forestFern=fronds([0x295d4a,0x8cae69,0x507a50],11);
  const cavity=material(0x302c3e,{roughness:.89}),goldPith=material(0xebbe42,{emissive:0x8e6c11,emissiveIntensity:.34});
  const socket=new T.TorusGeometry(1,.17,10,42);
  const capGill=curve([[0,.11,0],[.24,.11,0],[.55,.17,.025],[.80,.26,.042],[.94,.34,.05]],.021,10);
  const gillTone=material(0xc0a185,{roughness:.83});
  function capRibs(x,y,z,w,h,d,turn,count){
    for(let k=0;k<count;k++){
      const a=k*tau/count,rx=Math.cos(a)*w,rz=Math.sin(a)*d;
      const sx=Math.hypot(rx,rz),axis=turn-Math.atan2(rz,rx);
      stamp(capGill,gillTone,x,y-.045*h,z,sx*.955,h,sx,0,axis,0);
    }
  }
  function nativeTree(x,z,size,turn=0){
    const y=ground(x,z);
    stamp(trunk,fungusBark,x,y-.15,z,size*.65,size*4.2,size*.69,0,turn,0);
    block(x,z,size*.84,size*4.45);
    for(let j=0;j<5;j++){
      const a=turn+j*tau/5,h=(.52+.72*j)*size,c=Math.cos(a),s=Math.sin(a),width=(j===4?1.78:.89+.19*(j%2))*size;
      const tx=x+c*.64*size,tz=z+s*.64*size;
      stamp(cap,scales,tx,y+h,tz,width,.78*size,width*.91,0,a,0);
      const budR=(.19+.055*(j%2))*size;
      const ex=x+c*.58*size,ez=z+s*.58*size;
      const face=Math.PI/2-a,eyeY=y+h+.57*size;
      stamp(sphere,cavity,ex,eyeY,ez,budR*1.02,budR*1.45,budR*.34,0,face,0);
      stamp(socket,teal,ex+.10*budR*c,eyeY,ez+.10*budR*s,budR,budR*1.54,budR*1.11,0,face,0);
      // Some fissures are empty, others contain the yellow pith. The rim casts
      // shade on the insert and the hollow reads at grazing angles.
      if(j!==1&&j!==3){
        stamp(sphere,goldPith,ex+.25*budR*c,eyeY,ez+.25*budR*s,.64*budR,.99*budR,.22*budR,0,face,0);
        stamp(sphere,lime,ex+.40*budR*c-.13*budR*s,eyeY+.26*budR,ez+.40*budR*s+.13*budR*c,.32*budR,.48*budR,.09*budR,0,face,0);
      }
      if(j===4||j===0)capRibs(tx,y+h,tz,width,.78*size,width*.91,a,15);
      stamp(curled,lilac,tx+s*width*.70,y+h+.15*size,tz+c*width*.70,size*.86,size*.88,size*.86,0,a,0);
    }
    const crownWidth=(1.54+.21*Math.sin(turn*3))*size;
    stamp(cap,scales,x,y+4.03*size,z,crownWidth,size*1.07,crownWidth*.79,0,turn,0);
    capRibs(x,y+4.03*size,z,crownWidth,1.07*size,crownWidth*.79,turn,22);
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
  // Deposits accumulate in chipped, overlapping plates above the waterline.
  // Their contour follows each pool and the actual terrain outside the basin.
  const sinterVertices=[],sinterColors=[],sinterIndices=[],sinterColour=new T.Color();
  function sinterBand(cx,cz,r,turn,rise,index){
    const n=21+index%4;
    for(let k=0;k<n;k++){
      const mid=tau*(k+.5)/n,edge=.91*Math.PI/n,layer=.5+.5*Math.sin(k*13.9+index*4.2);
      const outer=1.30+.33*layer;
      const levels=[[1.02,.43,0xe7e5c3],[1.10,.52,0xd5ccb1],[1.23,.31,0xeae6c2],[outer,.115,0xa0b4ad],[outer+.06,.018,0x778e89]];
      const start=sinterVertices.length/3;
      for(const [row,[rad,height,color]] of levels.entries()){
        for(const f of [-1,0,1]){
          const a=mid+edge*f,rr=rad*(1+.064*Math.sin(3*a+.8)+.038*Math.sin(7*a));
          const dx=Math.cos(a)*r*rr,dz=Math.sin(a)*r*rr*.89;
          const x=cx+dx*Math.cos(turn)+dz*Math.sin(turn),z=cz-dx*Math.sin(turn)+dz*Math.cos(turn);
          const h=height*rise+(f===0?.042:0)+.035*layer;
          const local=T.MathUtils.lerp(ground(cx,cz),ground(x,z),Math.max(0,Math.min(1,(rad-1)*2.5)));
          sinterVertices.push(x,local+h,z);
          sinterColour.setHex(color).convertSRGBToLinear().multiplyScalar(.86+layer*.18+(f===0?.045:0));sinterColors.push(sinterColour.r,sinterColour.g,sinterColour.b);
        }
        if(row<levels.length-1){const i=start+row*3;sinterIndices.push(i,i+1,i+3,i+1,i+4,i+3,i+1,i+2,i+4,i+2,i+5,i+4);}
      }
      if(k%3===index%3){
        const a=mid-turn,dx=Math.cos(a)*r*(outer+.20),dz=Math.sin(a)*r*(outer+.11)*.90,x=cx+dx,z=cz+dz;
        const scale=r*(.11+.05*layer);stamp(springFern,foliage,x,ground(x,z)-.06,z,scale*3.3,scale*2.65,scale*2.9,0,mid,0);
        if(k%2===0)for(let j=0;j<3;j++){
          const xx=x+Math.cos(j*2.2)*scale*.62,zz=z+Math.sin(j*2.2)*scale*.58;
          stamp(crystal,skin,xx,ground(xx,zz)-.025,zz,scale*.49,scale*(1.2+.35*j),scale*.57,0,mid+j,(j-1)*.23);
        }
      }
    }
  }
  for(const [i,[x,z,r]] of ventData.entries()){
    const y=ground(x,z);
    const rise=.65+r*.13;
    stamp(rim,stone,x,y,z,r,rise,r*.89,0,i*.71,0);
    stamp(disc,water,x,y+rise*.44,z,.97*r,.06,r*.84,0,i*.71,0);
    sinterBand(x,z,r,i*.71,rise,i);
    block(x,z,1.07*r,rise*.58);
    for(let j=0;j<6;j++){
      mistPos.push(x,y+.62,z);
      mistData.push((i*.143+j/6)%1, .54*r+.22*(j%2),i*1.7+j*.83,(i===0?3.0:1.6)*r);
    }
  }
  const sinterMesh=new T.BufferGeometry();sinterMesh.setAttribute('position',new T.Float32BufferAttribute(sinterVertices,3));
  sinterMesh.setAttribute('color',new T.Float32BufferAttribute(sinterColors,3));sinterMesh.setIndex(sinterIndices);
  sinterMesh.computeVertexNormals();stamp(sinterMesh,stone,0,0,0);
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
  const pear=material(0xf4c449,{roughness:.49}),fruitBud=material(0xf7dd68);
  for(let i=0;i<60;i++){
    const side=i%2?-1:1,n=Math.floor(i/2),x=46+n*1.75+side*(10.4+(n*7)%20),z=-76-n*2.1;
    if(Math.hypot(x-65,z+103)<5.5)continue;
    const y=ground(x,z),s=1.6+((i*13)%9)*.39;
    stamp(rock,stone,x,y+.16,z,s,.64*s,s*(.72+(i%3)*.10),-.035,i*.81,.04);
    if(s>3.7)block(x,z,s*.80,.6*s);
    if(i%3===0){
      for(let k=0;k<3;k++)stamp(roots,k===1?purple:lilac,x,y+.19+k*.11,z+.24*k,2.8*s,.64*s,s,0,i*.72+k*.07,-.03);
      stamp(springFern,foliage,x+.72*s,y+.46*s,z,2.4*s,1.20*s,1.6*s,0,i*.4,0);
      if(i%2===0)for(let k=0;k<5;k++){
        const xx=x+s*(.49+.47*Math.sin(k*2.4)),zz=z+s*.35*Math.cos(k*2.4);
        stamp(sphere,pear,xx,y+.64*s+.31*k,zz,.36,.23,.26,0,i+k,.36);stamp(sphere,fruitBud,xx-.10,y+.64*s+.31*k+.09,zz,.12,.06,.09);
      }
    }
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
    for(let j=0;j<3;j++){
      const t=a+j*2.1,dx=Math.cos(t),dz=Math.sin(t);
      stamp(forestFern,foliage,x+dx*3.1,y+h*.95,z+dz*3.4,4.8,3.4,4.35,0,t,.18);
      const px=x+dx*3.6,pz=z+dz*3.6;stamp(forestFern,foliage,px,ground(px,pz)-.07,pz,2.6+j*.24,2.5-j*.22,2.5,0,t,0);
      if(j===0)stamp(curled,leaf,x+dx*4.2,y+h,z+dz*4.3,3.5,4.6,3.3,0,a,0);
    }
    if(i%2===0)stamp(vine,beamGreen,x,y+h*.83,z,18,6,12,0,a*.07,-.08);
  }
  const hollowX=-81.6,hollowZ=-78,hollowY=ground(hollowX,hollowZ);
  // Model the opening through the rootstock, so the threshold, curled lip
  // and warm inner bark remain separated as the visitor moves to one side.
  const bole=new T.Shape();bole.moveTo(-5.1,-.2);
  bole.bezierCurveTo(-3.2,1.6,-3.8,5.2,-3.1,7.6);bole.lineTo(-4.3,10.6);bole.lineTo(-3.3,10.1);
  bole.lineTo(-1.9,8.4);bole.lineTo(-1.19,11.1);bole.lineTo(-.1,9.65);bole.lineTo(1.47,10.55);
  bole.lineTo(2.08,8.12);bole.lineTo(4.0,9.3);bole.lineTo(3.25,6.57);
  bole.bezierCurveTo(3.7,4.15,3.31,1.35,5.47,-.2);bole.closePath();
  const throat=new T.Path();throat.moveTo(-1.45,.15);throat.bezierCurveTo(-2.0,1.7,-1.66,4.12,-.38,5.68);
  throat.bezierCurveTo(.94,5.22,2.17,2.48,1.36,.15);throat.closePath();bole.holes.push(throat);
  const hollow=new T.ExtrudeGeometry(bole,{depth:2.3,bevelEnabled:true,bevelSegments:3,bevelSize:.21,bevelThickness:.28,curveSegments:22});
  stamp(hollow,bark,hollowX,hollowY,hollowZ-1.1);
  stamp(sphere,warm,hollowX,hollowY+2.54,hollowZ-1.8,1.96,3.01,.40);
  const furrow=curve([[0,0,0],[-.38,.19,.11],[-.18,.41,.01],[.14,.71,.03],[.08,1,0]],.090);
  for(const side of [-1,1]){
    for(let k=0;k<4;k++){
      stamp(furrow,k%2?moss:dusk,hollowX+side*(1.96+k*.39),hollowY+.38,hollowZ+1.47,2.1,6+.45*k,.98,0,side<0?0:Math.PI,0);
      stamp(forestFern,foliage,hollowX+side*(2.3+k*.62),hollowY+7.8+.5*(k%2),hollowZ-.31*k,4.4,3.7,4.1,0,k*1.6,0);
    }
    stamp(forestRoot,bark,hollowX+side*2.8,hollowY,hollowZ+.1,3.9,7.0,4.0,0,side<0?Math.PI:.21,0);
    block(hollowX+side*2.7,hollowZ,1.6,10.5);
  }
  block(hollowX,hollowZ-2,.88,5.8);
  const markerTone=fieldSurfaceFinish(material(0xb36b50,{roughness:.94,vertexColors:true}),'stone');
  const marker=revolve([[.77,-.1,0xc2a891],[1.0,.08,0x956b57],[.79,.19,0xc6ac8a],
    [.67,.37,0x8b6657],[.80,.42,0xbb9280],[.82,.46,0xdbad87],[.59,.49,0x986b56],
    [.53,.77,0xb6977c],[.61,.82,0xccac90],[.44,.86,0xa98773],[.21,.98,0xcdac92],[.02,1,0xb6927a]],
    16,a=>.85+.16*Math.cos(3*a),a=>.05*Math.cos(4*a+.5));
  const sx=-100.8,sz=-61.3;stamp(marker,markerTone,sx,ground(sx,sz)-.10,sz,1.42,4.6,1.12,0,.35,-.02);
  block(sx,sz,1.05,4.58);
  // On 407 the ochre network surrounds darker islands of worn stone. Seat the
  // contours in the real slope so both the main path and the fork meet the hollow.
  const paved=[],pavedRGB=[],pavedIdx=[],tint=new T.Color();
  function paving(x,z,w,d,angle,index){
    const n=12,start=paved.length/3;
    const levels=[[1.05,.016,0x96542f],[.95,.073,0xa66b38],[.83,.109,0x74633c],[.59,.131,0x756741],[.012,.135,0x74603e]];
    for(const [j,[r,h,col]] of levels.entries())for(let k=0;k<n;k++){
      const a=tau*k/n,rand=1+.11*Math.sin(3*a+index*.44)+.06*Math.cos(5*a-index);
      const dx=w*r*rand*Math.cos(a),dz=d*r*rand*Math.sin(a),xx=x+dx*Math.cos(angle)+dz*Math.sin(angle),zz=z+dz*Math.cos(angle)-dx*Math.sin(angle);
      paved.push(xx,ground(xx,zz)+h,zz);tint.setHex(col).convertSRGBToLinear().multiplyScalar(.80+.21*Math.sin(a*2+index)**2);
      pavedRGB.push(tint.r,tint.g,tint.b);
      if(j<levels.length-1){const from=start+j*n+k,to=start+j*n+(k+1)%n;pavedIdx.push(from,from+n,to,to,from+n,to+n);}
    }
  }
  for(let i=0;i<14;i++){
    const x=-89.6-3.6*i/13,z=-40-i*2.85;
    for(const side of [-1,1])paving(x+side*(1.53+.24*Math.sin(i*1.3)),z+side*.42,1.93+.35*Math.cos(i*.9),1.64,side*.24,i+side);
    if(i>7)paving(x+2.7+(i-7)*1.47,z-.75,1.68,1.26,-.64,i*2);
  }
  const path=new T.BufferGeometry();path.setAttribute('position',new T.Float32BufferAttribute(paved,3));path.setAttribute('color',new T.Float32BufferAttribute(pavedRGB,3));path.setIndex(pavedIdx);path.computeVertexNormals();stamp(path,stone,0,0,0);
  const groveLeaf=fieldSurfaceFinish(material(0xffffff,{vertexColors:true,roughness:.86}),'moss');
  const leafbank=revolve([[.25,-.24,0x213b31],[.78,-.10,0x2c513a],[1,.16,0x3b6346],
    [.93,.38,0x577e53],[.72,.57,0x648757],[.38,.73,0x82a06a],[.02,.79,0x96ae7d]],32,
    (a,h)=>.78+.19*Math.sin(5*a+h*2)**2+.12*Math.cos(a*3), (a,h)=>.17*Math.cos(5*a+h)+.10*Math.cos(8*a+2*h));
  for(let i=0;i<12;i++){
    const x=-119+i*4.55,z=-92-5.3*Math.sin(i*1.5),y=ground(x,z),h=12.0+4.2*Math.sin(i*1.21)**2,a=i*2.39996;
    stamp(forestTrunk,moss,x,y,z,4.2,h,4.2,0,a,.12*Math.sin(a));block(x,z,1.3,h);
    for(let k=-1;k<=1;k++){
      const dx=x+k*2.3,dz=z+Math.sin(a+k)*2.3;
      stamp(leafbank,groveLeaf,dx,y+h*(.82+.10*k),dz,4.15,4.3,3.47,0,a+k,-.11*k);
      stamp(forestFern,foliage,dx,y+h*(.87+.10*k),dz,4.5,2.7,4.2,0,a+k,0);
    }
    if(i%2===0)stamp(forestFern,foliage,x,y-.02,z+1,3.8,2.4,3.1,0,a,0);
    const bx=x+1.25*Math.cos(a),bz=z-14.5,by=ground(bx,bz);
    const bh=4.1+4.6*Math.sin(i*.87+.23)**2;
    stamp(leafbank,groveLeaf,bx,by+.9,bz,5.2,bh,4.4,0,a,0);
    stamp(forestFern,foliage,bx-1.1,by+bh*.53,bz+1.5,3.5,2.65,3.1,0,a+1.2,0);
    block(bx,bz,3.36,bh*.82+.94);
  }
  // The original 106 vista terminates at a tall grey cylinder with lime slots.
  // At its feet map 46 uses two ochre grilles, blue decks and a pink warp disc.
  const towerX=106,towerZ=-190,base=ground(towerX,towerZ);
  const tower=revolve([[1.0,0,0x4f5361],[.96,.09,0x96959b],[.85,.13,0x69676e],
    [.80,.60,0x8c8791],[.76,.70,0x88848d],[.79,.74,0xb2aba7],[.67,.76,0x736b75],
    [.61,.94,0xaaa39d],[.60,1,0xccc1b0],[.02,1,0x89929b]],44,a=>.82+.16*Math.cos(a*2),a=>.012*Math.cos(12*a));
  const towerFinish=fieldSurfaceFinish(material(0xffffff,{vertexColors:true,roughness:.49,metalness:.38}),'metal');
  stamp(tower,towerFinish,towerX,base,towerZ,9.8,48,9.8);block(towerX,towerZ,9.55,48);
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
    // The two projecting service baskets have a mesh bottom, ochre frames,
    // roller hinges and oil lines bolted directly to the side of the tower.
    const trayX=towerX+side*8.1,trayZ=towerZ+10.6,ty=base+3.65;
    for(const s of [-1,1]){
      stamp(cube,hazard,trayX+s*2.65,ty,trayZ,.27,.44,4.5);
      stamp(cube,hazard,trayX,ty,trayZ+s*2.16,5.36,.44,.24);
      stamp(rod,slate,trayX+s*2.67,ty,trayZ+2.08,.57,.71,.57,0,0,Math.PI/2);
      stamp(rod,hazard,trayX+s*3.04,ty,trayZ+2.08,.46,.075,.46,0,0,Math.PI/2);
      stamp(rod,lime,trayX+s*3.09,ty,trayZ+2.08,.29,.07,.29,0,0,Math.PI/2);
      const ax=trayX+s*2.17;
      link(rod,metal,V(ax,base+.15,trayZ-1.9),V(ax,ty-.16,trayZ+1.67),.20);
      block(ax,trayZ-1.9,.38,3.8);
    }
    for(let k=-3;k<=3;k++)for(const s of [-1,1]){
      const dx=k*.84;
      const lo=Math.max(-1.96,-2.50-s*dx),hi=Math.min(1.96,2.50-s*dx);
      if(lo<hi)link(rod,metal,V(trayX+dx+s*lo,ty+.03,trayZ+lo),V(trayX+dx+s*hi,ty+.03,trayZ+hi),.073);
    }
    const servicePipe=curve([[0,0,0],[.58,0,.35],[1.67,.28,.82],[2.05,1.55,.97],[2.11,2.79,.65],[2.82,3.31,.16]],.15,19);
    for(let j=0;j<3;j++){
      stamp(servicePipe,j===1?hazard:edgeMetal,towerX+side*5.72,base+1.07,towerZ+7.6+j*.35,1,1,1,0,side<0?Math.PI:0,0);
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
