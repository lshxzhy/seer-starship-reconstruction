// Engineering interiors. Metres; origin at the common floor centre, +Z to door.
// Evidence and inferred construction: references/habitat/engineering/来源与建模.md
// All equipment is built once with kit primitives. No external assets are loaded.
// The clear standing point between the central ore intake and the separate
// foreground game control, in metres relative to the centre of the power room.
const powerExchangePoint=Object.freeze({x:0,z:3.95});
(function () {
  const C = {
    ivory: 0xe5ddc5, white: 0xf2ede0, edge: 0x9faaa9,
    steel: 0x647b86, dark: 0x263b43, rubber: 0x18282c,
    gold: 0xd9a650, goldLight: 0xf4ce70, bronze: 0x8c6841,
    cyan: 0x52e3e5, blue: 0x3e8dc4, navy: 0x285776,
    green: 0xa6d89b, yellow: 0xf1cd54, red: 0xcd6b4f
  };

  function equipment(kit) {
    const {box,cyl,ball,beam,pipe,torus,panel,text,block} = kit;
    const ring = (x,y,z,r,t,color,opts={}) =>
      torus(x,y,z,r,t,color,{rx:Math.PI/2,...opts});
    // A screen has an actual enclosure, rear thickness, bezel and surface.
    function screen(x,y,z,w,h,label,ry=0) {
      const p=(u,v,n)=>[x+u*Math.cos(ry)+n*Math.sin(ry),y+v,z-u*Math.sin(ry)+n*Math.cos(ry)];
      box(x,y,z,w+.22,h+.22,.24,C.steel,{ry});
      box(...p(0,0,.132),w,h,.025,C.navy,{ry});
      panel(...p(0,.07*h,.17),w*.9,h*.7,C.cyan,{ry});
      for(let i=0;i<3;i++)box(...p(-w*.26+i*w*.26,-h*.35,.2),w*.12,.045,.022,C.green,{ry,glow:.2});
      if(label)text(...p(0,.07*h,.218),label,w*.77,h*.31,C.white,{ry});
    }
    function bench(x,z,w,d,color=C.ivory) {
      box(x,1.27,z,w,.25,d,color);
      box(x,1.43,z,w-.16,.08,d-.14,C.steel);
      for(const sx of [-1,1])for(const sz of [-1,1]) {
        box(x+sx*(w/2-.3),.6,z+sz*(d/2-.27),.34,1.2,.34,C.edge);
        box(x+sx*(w/2-.3),.12,z+sz*(d/2-.27),.6,.16,.56,C.dark);
      }
      beam([x-w/2+.35,.52,z-d/2+.3],[x+w/2-.35,.52,z-d/2+.3],.12,.18,C.steel);
      pipe([[x-w/2+.5,.72,z-d/2+.08],[x,.58,z-d/2+.08],[x+w/2-.5,.72,z-d/2+.08]],.055,C.dark);
      block(x,z,w+.14,d+.14);
    }
    function console(x,z,label,color=C.ivory) {
      box(x,.17,z,3.5,.28,1.9,C.dark);
      box(x,.74,z,3.06,1.02,1.43,color);
      box(x,1.3,z-.04,3.26,.24,1.6,C.edge,{rx:.22});
      box(x,1.44,z-.12,2.72,.07,1.16,C.navy,{rx:.22});
      for(const sx of [-1,1])box(x+sx*1.18,1.5,z+.1,.16,.045,.63,C.cyan,{rx:.22,glow:.25});
      for(let i=0;i<4;i++)cyl(x-.55+i*.37,1.56,z+.33,.065,.065,.045,i===3?C.red:C.green);
      text(x,1.0,z+.735,label,2.45,.3,C.dark);
      pipe([[x,1.0,z-.76],[x,.32,z-.95],[x,.18,z-1.5]],.085,C.dark);
      block(x,z,3.5,1.9);
    }
    function cabinet(x,z,w,h,label,color=C.ivory) {
      box(x,h/2,z,w,h,1.35,color);
      box(x,.15,z,w+.22,.3,1.55,C.dark);
      box(x,h-.12,z,w+.1,.24,1.46,C.edge);
      for(const sx of [-1,1]) {
        box(x+sx*w*.245,h*.48,z+.69,w*.46,h*.72,.09,C.steel);
        box(x+sx*.13,h*.47,z+.77,.08,.43,.08,C.white);
      }
      screen(x,h*.79,z+.77,w*.64,.38,label);
      for(let i=0;i<4;i++)box(x-w*.28+i*w*.18,h*.2,z+.76,.18,.045,.035,C.dark);
      block(x,z,w+.22,1.6);
    }
    function arm(points,color=C.ivory) {
      for(let i=0;i<points.length-1;i++) {
        beam(points[i],points[i+1],.28,.37,color);
        const p=points[i];ball(p[0],p[1],p[2],.3,.3,.3,C.steel);
      }
      const p=points[points.length-1];ball(p[0],p[1],p[2],.24,.24,.24,C.edge);
      pipe(points.map(p=>[p[0]+.18,p[1],p[2]]),.055,C.dark);
    }
    function toolWall(x,z,w=7) {
      box(x,2.9,z,w,3.55,.42,C.ivory);
      box(x,2.94,z+.235,w-.34,2.94,.08,C.steel);
      for(let j=0;j<3;j++)box(x,1.95+j*.93,z+.3,w-.52,.055,.06,C.dark);
      for(let i=0;i<5;i++) {
        const xx=x-w*.35+i*w*.175;
        box(xx,2.8,z+.41,.12,1.32,.11,i%2?C.red:C.white,{rz:(i-2)*.08});
        torus(xx,3.48,z+.42,.2,.07,C.edge);
        box(xx-.14,2.1,z+.41,.08,.23,.12,C.edge);
        box(xx+.14,2.1,z+.41,.08,.23,.12,C.edge);
      }
      box(x,1.12,z+.1,w+.15,.21,.9,C.edge);
      block(x,z,w+.16,1.05);
    }
    function overhead(W,D,H,color=C.steel) {
      // Beam soffits are at least H-1.1; no low cross-room obstruction.
      for(const z of [-D*.28,D*.2]) {
        box(0,H-.62,z,W-.8,.5,.55,color);
        for(const x of [-W*.32,W*.32]) {
          box(x,H-.95,z,4,.13,.74,C.white,{glow:.12});
          box(x,H-.84,z,4.25,.13,.9,C.dark);
        }
      }
      for(const x of [-W*.41,W*.41])box(x,H-.62,0,.35,.46,D-.8,C.edge);
    }
    function floorLine(x,z,w,d,color=C.cyan) {
      box(x,.025,z,w,.026,d,color,{glow:.1});
    }
    function platedFloor(W,D) {
      box(0,.012,0,W-.15,.02,D-.15,C.ivory);
      for(let x=-W/2+2;x<W/2-.2;x+=2)box(x,.027,0,.021,.008,D-.18,0xb8b5a5);
      for(let z=-D/2+2;z<D/2-.2;z+=2)box(0,.027,z,W-.18,.008,.021,0xb8b5a5);
    }
    return {ring,screen,bench,console,cabinet,arm,toolWall,overhead,floorLine,platedFloor};
  }

  cabinBuilders.power = function (kit) {
    const {T,box,cyl,ball,beam,pipe,torus,text,block,W,D,H,root} = kit;
    const {ring,screen,cabinet,overhead,floorLine} = equipment(kit);
    const P={gold:0xe8b952,light:0xf3ce78,cream:0xe8ddc3,trim:0x8c775b,
      brown:0x91724e,inset:0x62503c,base:0x353631,black:0x202b2b,cyan:0x58e0ce};
    const F={enamel:{roughness:.38,metalness:.32},coat:{roughness:.56,metalness:.15},
      metal:{roughness:.29,metalness:.78},grip:{roughness:.86,metalness:.02},base:{roughness:.73,metalness:.19}};
    const surfaces=color=>color===P.gold||color===P.light?F.enamel:
      color===P.cream||color===P.brown?F.coat:color===P.black?F.grip:color===P.base?F.base:F.metal;
    const parts=new Map();
    const geometry=(key,make)=>{if(!parts.has(key))parts.set(key,make());return parts.get(key);};
    const z=-5.3, tau=Math.PI*2;
    root.name='动力室 · 罩壳与操作凹口';

    // Closed profiles give the hood, shoulders and cut ends actual thickness.
    // Materials and ordinary fittings still come from the shared room kit.
    function plate(points,depth,x,y,zz,color,name,opts={}) {
      const radius=opts.radius??.035;
      const key='plate/'+JSON.stringify([points,depth,radius]);
      const g=geometry(key,()=>{
        const shape=new T.Shape(points.map(p=>new T.Vector2(p[0],p[1])));
        const g=new T.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,
          bevelThickness:radius,bevelSize:radius,bevelSegments:3,curveSegments:4});
        g.translate(0,0,-depth/2);return g;
      });
      const m=box(x,y,zz,1,1,1,color,{...surfaces(color),...opts,name});m.geometry=g;return m;
    }
    function swept(profile,start,arc,color,name,opts={}) {
      const steps=opts.segments||Math.max(6,Math.ceil(64*arc/tau));
      const key='sweep/'+JSON.stringify([profile,arc,steps]);
      const m=box(0,0,z,1,1,1,color,{...surfaces(color),...opts,ry:start,name});
      m.geometry=geometry(key,()=>new T.LatheGeometry(profile.concat([profile[0]])
        .map(p=>new T.Vector2(...p)),steps,0,arc));
      if(arc<tau-.001)for(const end of [false,true]) {
        const a=start+(end?arc:0), sign=end?-1:1;
        const cap=box(0,0,z,1,1,1,color,{...surfaces(color),...opts,
          ry:a+(end?Math.PI/2:-Math.PI/2),name:name+' · 端面'});
        cap.geometry=geometry('cap/'+JSON.stringify([profile,sign]),()=>new T.ShapeGeometry(
          new T.Shape(profile.map(p=>new T.Vector2(sign*p[0],p[1])))));
      }
      return m;
    }
    // Short quadratic returns are real rounded cross-sections, in metres.
    function softened(points,r=.035) {
      const out=[];
      points.forEach((p,i)=>{
        const prev=points[(i+points.length-1)%points.length],next=points[(i+1)%points.length];
        const d0=Math.hypot(prev[0]-p[0],prev[1]-p[1]),d1=Math.hypot(next[0]-p[0],next[1]-p[1]);
        const d=Math.min(r,d0*.25,d1*.25);
        const a=p.map((v,k)=>v+(prev[k]-v)*d/d0),b=p.map((v,k)=>v+(next[k]-v)*d/d1);
        for(let j=0;j<=3;j++){const t=j/3;out.push(p.map((v,k)=>(1-t)**2*a[k]+2*t*(1-t)*v+t*t*b[k]));}
      });return out;
    }
    function fitting(p,axis,r,h,color,name,opts={}) {
      const m=cyl(...p,r,r,h,color,{...surfaces(color),segments:12,...opts,name});
      m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(...axis).normalize());return m;
    }
    function socket(p,direction,r) {
      const axis=new T.Vector3(...direction).normalize(),n=new T.Vector3(p[0],0,p[2]-z).normalize();
      const at=d=>p.map((v,i)=>v+axis.getComponent(i)*d);
      fitting(p,n.toArray(),r*1.8,.16,P.brown,'接管焊座');
      fitting(at(.17),axis.toArray(),r*1.2,.4,P.trim,'接管套颈');
      fitting(at(.35),axis.toArray(),r*1.65,.13,C.edge,'接管压兰',F.metal);
      fitting(at(.44),axis.toArray(),r*1.23,.045,P.black,'压兰密封');
      const side=new T.Vector3(0,1,0).cross(axis).normalize();
      for(const s of [-1,1])fitting(at(.35).map((v,i)=>v+s*side.getComponent(i)*r*1.4),
        axis.toArray(),.046,.17,C.edge,'压兰对夹螺栓',{...F.metal,segments:6});
    }
    function deck(points,depth,y,zz,color,name) {
      const m=plate(points,depth,0,y,zz,color,name);m.rotation.x=Math.PI/2;return m;
    }
    // A ring footprint is split into short sector bounds, so the open front
    // service bay is represented in player and NPC collision, not just visually.
    function ringBlocks(inner,outer,start,arc) {
      const count=Math.ceil(arc/.22),radialCount=Math.ceil((outer-inner)/.7);
      for(let i=0;i<count;i++)for(let j=0;j<radialCount;j++) {
        const a=start+arc*i/count,b=start+arc*(i+1)/count;
        const r0=inner+(outer-inner)*j/radialCount,r1=inner+(outer-inner)*(j+1)/radialCount;
        const angles=[a,b];
        for(let k=0;k<=4;k++)if(k*Math.PI/2>a&&k*Math.PI/2<b)angles.push(k*Math.PI/2);
        const points=[];
        for(const angle of angles)for(const r of [r0,r1])points.push([Math.sin(angle)*r,z+Math.cos(angle)*r]);
        const xs=points.map(p=>p[0]),zs=points.map(p=>p[1]);
        const left=Math.min(...xs),right=Math.max(...xs),back=Math.min(...zs),front=Math.max(...zs);
        block((left+right)/2,(back+front)/2,right-left,front-back);
      }
    }

    // G04's low charcoal work field and pale ring remain walkable surfaces.
    cyl(0,.021,-4.65,11.1,11.1,.03,P.base);
    ring(0,.049,-4.65,10.85,.055,0x899b73);
    ring(0,.049,-4.65,10.52,.022,P.black);
    for(const a of [-.98,.98]) {
      beam([Math.sin(a)*6.7,.068,-4.65+Math.cos(a)*6.7],
        [Math.sin(a)*10.65,.068,-4.65+Math.cos(a)*10.65],.10,.055,P.black);
    }
    for(const x of [-3.25,3.25])floorLine(x,10,.065,10,0x77766a);
    for(const a of [-1.1,1.0])for(let i=0;i<4;i++) {
      const aa=a+i*.048,r=10.1;
      box(Math.sin(aa)*r,.048,-4.65+Math.cos(aa)*r,.16,.025,.7,P.cyan,{ry:aa,glow:.13});
    }

    // The dark annular plinth leaves the front operating recess open.
    const cut=.82;
    swept([[6.48,.035],[6.48,.57],[6.16,.78],[3.94,.78],[3.94,.035]],cut,tau-2*cut,P.base,'暗色开口底座');
    swept([[6.51,.35],[6.51,.48],[6.39,.5],[6.39,.35]],cut,tau-2*cut,P.trim,'底座外缘');
    swept([[5.91,.78],[5.91,.86],[5.73,.86],[5.73,.78]],cut,tau-2*cut,P.cream,'底座浅色边');
    ringBlocks(3.9,6.57,cut,tau-2*cut);
    // A C-section lower casing wraps the back; the forward sector stays empty.
    swept([[4.21,.78],[4.33,4.9],[4.1,5.7],[3.61,5.7],[3.77,4.85],[3.69,.78]],.96,tau-1.92,P.brown,'下罩壳背侧');
    ringBlocks(3.64,4.42,.96,tau-1.92);

    // The golden bell is a hollow skin with a visible underside and return lip.
    swept([[4.6,6.05],[4.6,6.55],[4.22,6.95],[3.75,9.4],[2.6,11.7],[1.1,12.8],
      [.96,12.55],[2.3,11.5],[3.4,9.3],[3.92,6.9],[4.18,6.55],[4.18,6.05]],0,tau,P.gold,'金色中空罩壳');
    swept(softened([[4.29,7.05],[4.25,7.34],[4.08,7.38],[4.13,7.06]],.03),
      0,tau,P.cream,'罩壳腰带圆折边');
    swept(softened([[4.17,6.005],[4.53,6.005],[4.625,6.07],[4.65,6.16],
      [4.61,6.23],[4.5,6.26],[4.2,6.26],[4.17,6.18]],.04),0,tau,P.gold,'罩檐卷边及内翻回口');
    swept([[4.17,5.99],[4.49,5.99],[4.49,6.027],[4.17,6.027]],0,tau,P.black,'罩檐密封座');
    swept([[1.24,12.58],[1.24,12.88],[.87,12.88],[.87,12.58]],0,tau,P.trim,'顶部接环');
    cyl(0,13.1,z,.82,.82,.43,P.black);
    cyl(0,13.37,z,1.1,.82,.16,P.cream);
    // Formed access skins follow the existing bell, keeping its overall contour.
    // Their gaskets, latches and coating boundaries are inferred assembly detail.
    for(const a of [-.48,0,.48]) {
      const width=a===0?.3:.4;
      swept([[4.125,7.59],[3.778,9.4],[3.023,10.91],[2.993,10.91],[3.748,9.4],[4.095,7.59]],
        a-width/2-.018,width+.036,P.black,'罩面盖板周缘密封');
      swept(softened([[4.14,7.65],[3.81,9.4],[3.085,10.85],[3.035,10.85],[3.76,9.4],[4.09,7.65]],.018),
        a-width/2,width,a===0?P.gold:P.light,'弧形可拆罩面',a===0?F.enamel:F.coat);
      for(const [r,y] of [[4.17,7.74],[3.16,10.74]])
        box(Math.sin(a)*r,y,z+Math.cos(a)*r,.16,.13,.085,P.trim,{...F.metal,ry:a});
    }
    // Two broad front shoulders bound the golden hood and its front recess.
    // Matching rear pair is an explicit construction inference.
    const shoulder=[[5.58,.72],[5.58,5.68],[5.27,6.22],[4.77,6.88],[4.47,9.32],
      [3.24,11.6],[1.5,13.03],[1.21,12.79],[2.83,11.38],[3.96,9.22],
      [4.23,6.64],[4.82,5.78],[4.92,.72]];
    const angles=[-.95,.95,Math.PI-.95,Math.PI+.95];
    for(const a of angles) {
      swept(shoulder,a-.16,.32,P.cream,'厚肩梁');
      swept(softened([[5.68,5.72],[5.42,6.34],[4.86,6.96],[4.78,6.68],[5.15,6.12],[5.31,5.63]],.045),
        a-.185,.37,P.trim,'肩肘压边');
      const x=Math.sin(a)*5.18,zz=z+Math.cos(a)*5.18;
      box(x,.62,zz,1.1,.38,1.15,P.trim,{ry:a});
      for(const y of [1.1,1.48])ball(x+Math.sin(a)*.36,y,zz+Math.cos(a)*.36,.075,.075,.075,P.trim);
      block(x,zz,1.8,1.8);
      const foot=[Math.sin(a)*1.45,13.0,z+Math.cos(a)*1.45];
      const head=[Math.sin(a)*3.7,H-.8,z+Math.cos(a)*3.7];
      box(...foot,.39,.25,.42,P.trim,{...F.metal,ry:a});
      beam(foot,head,.16,.23,C.steel,F.metal);
      box(...head,.41,.31,.45,C.edge,{...F.metal,ry:a});
      cyl(head[0],H-.43,head[2],.08,.08,.74,C.steel,{...F.metal,segments:12});
      box(head[0],H-.06,head[2],.74,.12,.74,P.trim,F.metal);
    }
    // Inferred secondary lids sit on the shoulder skin with hinges and cams.
    for(const a of [-.95,.95]) {
      const normal=[Math.sin(a),0,Math.cos(a)];
      const at=(u,v,n)=>[Math.sin(a)*5.58+u*Math.cos(a)+n*Math.sin(a),2.65+v,
        z+Math.cos(a)*5.58-u*Math.sin(a)+n*Math.cos(a)];
      const outline=[[-.49,-.83],[.49,-.83],[.57,-.75],[.57,.75],[.49,.83],[-.49,.83],[-.57,.75],[-.57,-.75]];
      const seal=plate(outline,.035,...at(0,0,.018),P.black,'检修盖密封');seal.rotation.y=a;
      const lid=plate(outline.map(p=>p.map(v=>v*.91)),.11,...at(0,0,.1),P.cream,'肩梁二级检修盖',{radius:.025});lid.rotation.y=a;
      for(const v of [-.52,.52]) {
        fitting(at(-.49,v,.11),[0,1,0],.052,.24,P.trim,'检修盖铰筒');
        fitting(at(.36,v,.18),normal,.07,.04,C.edge,'四分之一转锁',F.metal);
        beam(at(.33,v,.207),at(.39,v,.207),.012,.012,P.black,F.grip);
      }
      box(...at(0,.2,.167),.62,.22,.025,P.trim,{...F.metal,ry:a});
    }
    // The front cheek frame is a single extruded U, including its inner wall.
    const arch=[[-4.95,.75],[-5.02,4.5],[-4.37,6.3],[-2.8,6.65],[2.8,6.65],
      [4.37,6.3],[5.02,4.5],[4.95,.75],[3.52,.75],[3.58,3.9],[3.08,4.75],
      [2.57,5.03],[-2.57,5.03],[-3.08,4.75],[-3.58,3.9],[-3.52,.75]];
    plate(arch,.75,0,0,z+2.57,P.gold,'正面拱形罩口');
    for(const s of [-1,1]) {
      block(s*4.24,z+2.57,1.75,1.66);
      // Stepped inner cheeks and diagonal joints give depth without filling it.
      for(let i=0;i<3;i++) {
        const zz=z+2.1-i*.65,xx=s*(3.63-i*.15);
        plate([[s*.05,.95],[s*.49,.95],[s*.53,3.88],[s*.05,4.5],[-s*.18,3.94]],
          .45,xx,0,zz,i===1?P.cream:P.trim,'凹口阶层侧颊');
        block(xx,zz,1.0,.7);
      }
    }
    plate([[-3.25,1.0],[-3.25,4.34],[-2.44,4.96],[2.44,4.96],[3.25,4.34],[3.25,1.0]],
      .42,0,0,z-1.15,P.inset,'后退操作腔背板');
    for(const y of [2.72,3.56,4.34])for(const s of [-1,1])
      beam([s*.4,y-.12,z-.91],[s*2.72,y+.3,z-.91],.12,.15,P.trim);
    box(0,1.29,z-.68,2.65,1.05,.65,P.cream);
    box(0,1.93,z-.51,2.28,.18,.84,P.trim,{rx:.22});
    screen(0,2.2,z-.26,1.46,.46,'主机状态');
    block(0,z-.9,6.65,1.12);
    block(0,z-.53,2.85,1.1);
    for(const a of [-.285,-.095,.095,.285]) {
      box(Math.sin(a)*4.57,5.89,z+Math.cos(a)*4.57,.24,.23,.13,P.cyan,{ry:a,glow:.35});
    }

    // The chamfered tongue projects beyond the ring, with its two cyan rails.
    const tongue=[[-2.18,-1.38],[-1.92,.95],[-1.42,1.53],[1.42,1.53],[1.92,.95],[2.18,-1.38]];
    deck(tongue,.38,.25,.8,P.trim,'前庭短舌底座');
    deck(tongue.map(p=>[p[0]*.91,p[1]*.94]),.2,.55,.8,P.cream,'短舌上缘');
    deck([[-1.53,-.93],[-1.4,.8],[-1.12,1.03],[1.12,1.03],[1.4,.8],[1.53,-.93]],
      .19,.77,.8,P.brown,'短舌内凹面');
    for(const x of [-1.23,1.23]) {
      box(x,.88,.95,.29,.065,1.44,P.cyan,{glow:.28});
      box(x,.65,2.1,.22,.13,.12,P.trim);
    }
    box(0,.9,.68,1.5,.08,1.26,P.cream);
    block(0,.87,4.5,3.55);

    // Map 6's oreExchange responds on the central machine's open tongue.
    // The scaled inlet occupies its existing footprint; the separate horned
    // controller farther forward is not the resource exchange.
    const intakeStart=root.children.length;
    box(0,1.05,.65,1.72,.48,.74,P.trim,{...F.metal,name:'中央矿物接收口'});
    box(0,1.02,1.032,1.44,.27,.045,P.black,F.grip);
    for(const x of [-.79,.79]){
      box(x,1.07,1.18,.10,.33,.50,P.cream);
      box(x,1.24,1.19,.056,.035,.28,P.cyan,{glow:.25});
    }
    for(const zz of [1.13,1.29,1.45,1.61,1.77])
      cyl(0,.91,zz,.056,.056,1.49,C.steel,{rz:Math.PI/2,segments:18});
    box(0,1.42,.51,1.69,.32,.16,P.black,F.grip);
    text(0,1.42,.60,'资源兑换',1.26,.22,P.cream);
    box(0,.52,2.235,1.25,.24,.10,P.brown);
    text(0,.53,2.293,'矿物投入口',1.03,.16,P.cream);
    for(const part of root.children.slice(intakeStart))part.userData.oreIntake=true;

    // Separate low horn-crowned control pedestal visible in G04's foreground.
    // Its inclined round face and tapered foot stay below the main opening.
    const controlZ=6.35;
    deck([[-1.12,-.7],[-.62,.6],[0,1.05],[.62,.6],[1.12,-.7]],.18,.14,controlZ,P.black,'独立控制器底脚');
    plate([[-.44,.8],[-.24,.22],[0,.06],[.24,.22],[.44,.8]],.42,0,0,controlZ+.12,P.gold,'控制器尖尾');
    cyl(0,.82,controlZ,.49,.73,1.18,P.trim);
    for(const s of [-1,1])plate([[-s*.3,.72],[-s*.93,.89],[-s*1.3,1.43],[-s*1.4,1.78],
      [-s*1.13,1.8],[-s*.96,1.36],[-s*.65,1.2],[-s*.44,1.5],[-s*.24,1.35]],
      .35,0,0,controlZ,P.gold,'叉角操作器');
    for(const s of [-1,1]) {
      pipe([[s*1.24,1.69,controlZ],[s*1.05,2.10,controlZ-.12],[s*.7,2.32,controlZ-.13]],.09,P.black);
      ball(s*.7,2.32,controlZ-.13,.13,.13,.13,C.steel);
      for(let i=0;i<3;i++)ring(s*1.29,.8+i*.13,controlZ+.14,.2-i*.025,.055,P.black,{...F.grip,segments:24});
      cyl(s*.55,1.08,controlZ+.31,.105,.105,.08,s<0?C.blue:C.red,{rx:Math.PI/2});
    }
    cyl(0,1.24,controlZ+.19,.66,.73,.26,P.cream,{rx:Math.PI/2-.57});
    cyl(0,1.32,controlZ+.32,.49,.49,.045,P.black,{rx:Math.PI/2-.57});
    torus(0,1.34,controlZ+.35,.4,.065,P.cyan,{rx:-.57,glow:.25});
    const bezel=swept(softened([[.49,-.055],[.58,-.055],[.6,-.015],[.6,.045],[.56,.09],[.49,.09]],.022),
      0,tau,P.cream,'操作器折边护圈',{...F.coat,segments:40});
    bezel.position.set(0,1.34,controlZ+.35);bezel.rotation.x=Math.PI/2-.57;
    const dial=(u,v,n)=>[u,1.34+v*Math.cos(.57)+n*Math.sin(.57),
      controlZ+.35-v*Math.sin(.57)+n*Math.cos(.57)];
    // All twelve engraved index bars are one small solid mesh, without a map.
    const ticks=[];
    for(let i=0;i<12;i++) {
      const a=-Math.PI*.75+i*Math.PI*1.5/11,inner=i%3===0?.24:.27;
      const p=(r,t)=>new T.Vector2(Math.sin(a)*r+Math.cos(a)*t,Math.cos(a)*r-Math.sin(a)*t);
      ticks.push(new T.Shape([p(inner,-.006),p(.30,-.006),p(.30,.006),p(inner,.006)]));
    }
    const markings=box(...dial(0,0,.025),1,1,1,P.cream,{...F.coat,rx:-.57,name:'操作器实体刻度'});
    markings.geometry=new T.ExtrudeGeometry(ticks,{depth:.012,steps:1,bevelEnabled:false});
    beam(dial(0,0,.048),dial(.16,.12,.048),.018,.018,P.light,F.metal);
    fitting(dial(0,0,.048),[0,Math.sin(.57),Math.cos(.57)],.034,.025,P.trim,'操作器指针轴');
    pipe([[0,.6,controlZ-.2],[0,.18,controlZ-.85],[1.5,.14,controlZ-1.3]],.055,P.black);
    block(0,controlZ,3.0,2.35);
    block(.75,controlZ-1.03,1.65,.65);

    // Peripheral machines retain the reference massing, dark vent slots,
    // sloped cheeks and small inspection faces.
    for(const s of [-1,1]) {
      const x=s*16;
      cyl(x,.35,-7.6,2.65,2.8,.7,P.trim);
      cyl(x,3.85,-7.6,2.15,2.5,6.25,P.cream);
      cyl(x,7.05,-7.6,1.91,2.16,.6,P.brown);
      cyl(x,7.48,-7.6,1.1,1.81,.28,C.steel);
      for(const yy of [1.23,4.69,6.36])ring(x,yy,-7.6,2.31,.11,P.trim);
      box(x,4.9,-5.17,3.24,.88,.18,P.black);
      for(let i=0;i<7;i++)box(x-1.32+i*.44,4.91,-5.04,.085,.68,.12,P.trim,{rz:.12});
      for(const sx of [-1,1])plate([[-.3,1.23],[-.3,3.4],[.08,3.64],[.47,2.9],[.52,1.3]],
        .6,x+sx*1.91,0,-5.97,P.brown,'边机折面');
      screen(x,3.46,-5.03,1.5,.63,s<0?'资源转换':'支路监控');
      pipe([[x,7.5,-7.6],[x,11.65,-7.6],[s*8.1,11.65,-7.6],
        [s*3.4,11.2,-6.9],[s*2.6,10.8,-6.9]],.27,C.steel);
      socket([s*2.6,10.8,-6.9],[s*.8,.4,0],.27);
      for(const y of [8.2,10.8])ring(x,y,-7.6,.34,.07,P.trim);
      block(x,-7.6,5.8,5.8);
      cabinet(s*10.6,-14.4,4.1,3.8,s<0?'采集物':'备用支路',P.cream);
    }
    box(16,3.1,-5.42,6.3,2,.6,P.brown);
    block(16,-5.4,6.5,1.0);
    // Two thick forward pipes end in actual wall returns. Small parallel lines
    // connect their flanges to the manifold; all low fittings have a footprint.
    for(const x of [14.4,18]) {
      cyl(x,1.7,3.8,1.16,1.16,7.4,P.gold,{rx:Math.PI/2});
      for(const zz of [.35,3.8,7.25]) {
        torus(x,1.7,zz,1.18,.19,P.trim);
        torus(x,1.7,zz+.22,1.16,.09,P.cream);
        for(let i=0;i<6;i++) {
          const a=i*tau/6;
          cyl(x+Math.sin(a)*1.2,1.7+Math.cos(a)*1.2,zz+.22,.065,.065,.12,C.steel,{rx:Math.PI/2,segments:6});
        }
      }
      for(const zz of [1.1,6.5])box(x,.35,zz,2.6,.6,.85,C.steel);
      pipe([[x,1.7,.1],[x,1.7,-1.2],[x,3.4,-2.7],[x,3.4,-5.12]],.75,P.gold);
      torus(x,3.4,-5.05,.82,.13,P.trim);
      pipe([[x,1.7,7.48],[x,1.7,9.15],[x+.9,2.5,9.8],[x+.9,4.6,9.8]],.87,P.brown);
      cyl(x+.9,4.64,9.8,1.03,1.03,.2,P.trim);
      cyl(x+.9,4.9,9.8,.42,.42,.32,C.steel);
      ring(x+.9,5.1,9.8,.49,.09,P.gold);
      const returnY=x<16?5.5:6.0;
      pipe([[x+.9,4.9,9.8],[x+.9,returnY,9.8],[21.1,returnY,9.8]],.17,C.steel);
      fitting([21.42,returnY,9.8],[1,0,0],.26,.7,C.steel,'壁面回管套座');
      fitting([21.36,returnY,9.8],[1,0,0],.37,.12,P.brown,'回管壁面法兰');
      pipe([[x-.8,2.33,.35],[x-.8,3.4,-1.7],[x-.8,3.4,-4.9]],.11,C.steel);
      block(x+.3,2.7,3.45,16.0);
    }
    for(const y of [3.4,4.1]) {
      pipe([[3.5,y,-7.75],[5.6,y,-10],[7.3,y,-11.7],[13.8,y,-11.7],[16,y,-9.9]],.23,P.brown);
      socket([3.5,y,-7.75],[2.1,0,-2.25],.23);
      box(10.1,y,-11.7,.24,.7,.72,C.steel);
    }
    // This rear link has 3.17 m minimum soffit; the personnel aisle runs below.
    // Left receiving bank, with its own connected back return and service face.
    box(-16,1.23,4,5,2.46,4.4,P.brown);
    box(-16,2.56,4,5.35,.28,4.7,P.cream);
    box(-16,2.74,4,4.25,.16,3.3,P.black);
    for(const x of [-17.4,-16,-14.6])box(x,2.9,4,.85,.16,2.7,P.cyan,{glow:.17});
    box(-16,1.37,6.33,3,1.6,.16,P.trim);
    screen(-16,1.42,6.45,2.5,.76,'转换接收');
    pipe([[-18.3,1.5,3],[-19.4,1.5,3],[-19.4,3.4,-2],[-18,3.4,-7.6]],.29,C.steel);
    for(const y of [1.0,1.4,1.8])box(-16,y,6.45,2.5,.055,.07,P.trim);
    block(-16,4,5.8,5);
    block(-19.35,-2.4,1.2,12.4);
    for(const s of [-1,1]) {
      const x=s*18.4;
      box(x,1.6,11.7,2.6,3.2,1.6,P.cream);
      box(x,2.0,12.56,1.65,1.9,.11,P.black);
      for(const dx of [-.47,0,.47])box(x+dx,2.0,12.64,.2,1.58,.06,P.cyan,{glow:.18});
      block(x,11.7,2.8,1.85);
    }
    overhead(W,D,H,P.trim);
    text(0,13.7,-D/2+.35,'动力室',5,.68,P.light);
  };

  cabinBuilders.machine = function (kit) {
    const {box,cyl,ball,beam,pipe,torus,text,block,W,D,H,root} = kit;
    const {ring,screen,bench,cabinet,arm,overhead,floorLine,platedFloor} = equipment(kit);
    root.name='机械室 · M01 维修台与青光双台';
    // The light field, two floor rails and open middle come from M01.
    platedFloor(W,D);
    for(const x of [-1.1,3.3])floorLine(x,6.5,.11,12,C.edge);
    for(const x of [-6.2,-1.8]) {
      box(x,.048,2.8,.23,.045,15,C.dark);
      box(x,.073,2.8,.055,.018,14.6,C.edge);
    }
    for(let i=0;i<4;i++)floorLine(2.0,1.4+i*.7,1.3,.21,C.cyan);
    // Left-centre thick repair cradle; the lift mechanism beneath is designed.
    const bx=-4.0,bz=-4.0;
    box(bx,.22,bz,5.85,.44,8.7,C.steel);
    box(bx,.56,bz,4.1,.32,5.5,C.dark);
    for(const xx of [-5.45,-2.55]) {
      cyl(xx,1.0,bz, .33,.4,1.5,C.edge);
      cyl(xx,1.35,bz, .18,.18,1.7,C.steel);
      beam([xx,.55,bz-2.0],[xx,1.35,bz+2],.17,.27,C.edge);
      beam([xx,.55,bz+2.0],[xx,1.35,bz-2],.17,.27,C.edge);
    }
    box(bx,1.5,bz,5.3,.42,7.4,C.ivory);
    box(bx,1.74,bz,4.45,.09,6.6,0xb3b5a4);
    box(bx,1.8,bz+.2,2.1,.045,3.7,C.steel);
    for(const dx of [-.6,.6])box(bx+dx,1.83,bz+.2,.04,.025,3.1,C.edge);
    for(const dz of [-1.3,1.3])box(bx,1.83,bz+.2+dz,1.65,.03,.05,C.edge);
    // Headrest, bed side returns and the bent support are visible in M01.
    box(bx,2.48,bz-3.7,2.65,1.45,.53,C.ivory,{rx:-.12});
    box(bx,2.52,bz-3.38,2.18,1.0,.09,C.edge,{rx:-.12});
    for(const dz of [-2.4,2.1]) {
      arm([[bx-2.56,1.5,bz+dz],[bx-2.85,2.15,bz+dz],[bx-1.95,2.65,bz+dz],[bx-1.5,2.4,bz+dz]],C.ivory);
      box(bx-1.42,2.35,bz+dz,.46,.32,.75,C.steel);
    }
    arm([[bx+2.3,1.5,bz-2.3],[bx+2.8,3.5,bz-2.3],[bx+1.4,4.2,bz-1.4],[bx+.7,3.4,bz-.2]],C.ivory);
    cyl(bx+.7,3.17,bz-.2,.3,.18,.35,C.steel);
    cyl(bx+.7,2.94,bz-.2,.17,.17,.1,C.cyan,{glow:.3});
    screen(bx,1.1,bz+3.79,2.5,.54,'维修升降台');
    pipe([[bx+2.35,1.4,bz-3],[bx+2.35,.52,bz-4.3],[bx+2.6,.52,bz-5.1]],.11,C.dark);
    block(bx,-4.2,6.7,10.6);

    // M01's two parallel luminous machines are translated into full-depth
    // calibration / fitting stations; their exact functions are not attested.
    for(const x of [8.3,13.3]) {
      const z=-4.3;
      box(x,.3,z,4.0,.6,10.1,C.steel);
      for(const zz of [-8.2,-.5]) {
        box(x,1.1,zz,3.4,1.5,.67,C.ivory);
        box(x,.13,zz,4.0,.22,.94,C.dark);
      }
      box(x,2.0,z,3.4,.57,9.35,C.ivory,{rx:.17});
      box(x,2.33,z-.06,2.7,.12,8.65,C.cyan,{rx:.17,glow:.28});
      for(let i=0;i<9;i++) {
        const zz=-8.0+i*.9, yy=2.33-(zz-z)*Math.sin(.17);
        box(x,yy+.09,zz,2.62,.07,.075,C.white,{rx:.17});
      }
      for(const sx of [-1,1])beam([x+sx*1.6,3.03,-8.8],[x+sx*1.6,1.48,.2],.17,.22,C.edge);
      box(x,1.27,.55,3.6,.85,.68,C.ivory);
      screen(x,1.38,.94,2.4,.44,x<10?'检测校准':'装配工位');
      pipe([[x,1.3,-8.8],[x,.6,-9.8],[x+1.9,.6,-10.4]],.095,C.dark);
      block(x,z,4.1,10.6);
    }
    // Blue transverse ribs between the machine feet, leaving the middle clear.
    for(let i=0;i<5;i++)box(10.8,.13,-1.6+i*.44,.9,.22,.2,C.navy);
    block(10.8,-.72,1.0,2.8);
    // The warning frame stands behind the right-hand machines, away from door.
    for(const x of [5.9,15.6]) {
      box(x,3.15,-10.65,.42,6.3,.5,C.steel);
      for(let i=0;i<8;i++)box(x,.58+i*.71,-10.36,.44,.34,.065,i%2?C.dark:C.yellow);
      block(x,-10.65,.7,.8);
    }
    box(10.75,6.14,-10.65,10.1,.46,.55,C.yellow);
    for(let i=0;i<11;i++)box(6.25+i*.9,6.14,-10.34,.46,.47,.07,C.dark,{rz:-.3});
    text(10.75,5.44,-10.3,'检修区',2.5,.46,C.dark);

    // Slanted factory wall, with actual tools, cabinet depth and rear feeds.
    box(-17.8,3.8,-2.8,.55,6.8,11.4,C.edge);
    for(let i=0;i<4;i++) {
      const zz=-6.7+i*2.55;
      box(-17.34,3.8,zz,.44,5.6,2.1,C.ivory,{rz:-.1});
      box(-16.98,3.5,zz,.13,2.5,1.57,C.dark);
      beam([-16.83,2.5,zz],[-16.83,4.2,zz+.16],.15,.16,i%2?C.red:C.white);
      torus(-16.81,4.38,zz+.16,.23,.085,C.edge,{ry:Math.PI/2});
      box(-16.83,2.35,zz,.16,.3,.48,C.edge);
    }
    text(-16.76,5.93,-2.8,'赛尔工厂',7,.64,C.blue,{ry:Math.PI/2});
    box(-16.9,.63,-2.8,1.7,1.25,11.2,C.ivory);
    block(-17.25,-2.8,2.7,11.7);
    screen(-17,3.2,6.7,2.8,1.8,'装备目录',Math.PI/2);
    box(-17.5,1.45,6.7,1.3,2.9,3.5,C.ivory);
    block(-17.5,6.7,1.6,3.7);
    // Three removable demonstration cores on individual cradles. Pieces are
    // batched within their own sample group so collection can hide each one.
    const rackX=-16,rackZ=5.9;
    box(rackX,.72,rackZ,1.11,.14,3.0,C.edge);
    box(rackX,.62,rackZ,1.03,.18,2.89,C.ivory);
    for(const zz of [-1.20,1.20])for(const xx of [-.39,.39]){
      box(rackX+xx,.32,rackZ+zz,.11,.56,.14,C.steel);
    }
    text(rackX+.566,.68,rackZ,'采矿训练',1.3,.16,C.dark,{ry:Math.PI/2});
    block(rackX,rackZ,1.13,3.00);
    root.userData.trainingSamples=[];
    for(let i=0;i<3;i++){
      const z=rackZ+(i-1)*.91;
      box(rackX,.808,z,.79,.052,.78,C.dark);
      const sample=new kit.T.Group();sample.name='黄晶矿训练样品 '+(i+1);
      sample.position.set(rackX,.833,z);sample.rotation.y=i*.77-.22;root.add(sample);
      root.userData.trainingSamples.push(sample);
      // The three differently oriented prismatic tips grow from a rough bed.
      cyl(0,.069,0,.26,.29,.14,0x736147,{segments:7,parent:sample});
      for(const [x,dz,r,h,lean] of [[0,0,.134,.42,.10],[-.143,.08,.090,.215,-.31],[.107,-.115,.084,.245,.37]]){
        const vein=new kit.T.Group();vein.position.set(x,.085,dz);vein.rotation.z=lean;
        sample.add(vein);
        cyl(0,h/2,0,r,r*.86,h,0xe5ad36,{segments:6,metalness:.21,roughness:.29,parent:vein});
        cyl(0,h+r*.48,0,.011,r,r*.96,0xffcf54,{segments:6,glow:.08,roughness:.26,parent:vein});
      }
    }
    cabinet(-10.8,-12.45,4.1,3.9,'备件');
    cabinet(-5.4,-12.45,4.1,3.9,'工具');
    screen(.45,3.2,-13.05,3.5,2.0,'检修记录');
    // A replacement component is ready on a proper wheeled carrier.
    const cx=-10.8,cz=6.9;
    box(cx,.52,cz,3.1,.27,2.15,C.steel);
    for(const sx of [-1,1])for(const sz of [-1,1])ball(cx+sx*1.2,.24,cz+sz*.78,.22,.23,.18,C.dark);
    cyl(cx,1.05,cz,.68,.72,.86,C.ivory);
    ring(cx,1.44,cz,.65,.09,C.cyan,{glow:.15});
    box(cx,1.5,cz,1.2,.11,.6,C.edge);
    pipe([[cx-1.36,.55,cz-.8],[cx-1.36,1.8,cz-.8],[cx+1.36,1.8,cz-.8],[cx+1.36,.55,cz-.8]],.075,C.steel);
    block(cx,cz,3.3,2.4);
    bench(11.1,6.7,7.8,2.5);
    for(let i=0;i<3;i++)box(8.5+i*2.4,1.66,6.6,1.5,.35,1.25,i===1?C.blue:C.edge);
    // Raised utility bridge and service pipes remain well above walking height.
    for(const x of [-11.8,3.6]) {
      pipe([[x,4.4,-12.6],[x,8.4,-12.6],[x,8.4,10]],.14,C.steel);
      for(const z of [-7,2,9])box(x,8.65,z,.15,.62,.15,C.dark);
    }
    overhead(W,D,H);
    text(0,7.5,-D/2+.32,'机械室',4.5,.63,C.blue);
  };

  cabinBuilders.workshop = function (kit) {
    const {box,cyl,ball,beam,pipe,torus,panel,text,block,W,D,H,root} = kit;
    const {ring,screen,bench,arm,toolWall,overhead,floorLine,platedFloor} = equipment(kit);
    root.name='发明室 · W05/W06 经典尖锥装置';
    // The 2009 full-room views govern the arrangement and cream/cyan palette.
    platedFloor(W,D);
    for(const z of [-2.9,1.25]) {
      box(0,.04,z,W-.9,.055,.44,C.steel);
      box(0,.075,z,W-1.0,.02,.12,C.cyan,{glow:.1});
    }
    for(const x of [-3.3,3.3])floorLine(x,7.1,.1,9.4,C.edge);
    // Three rear bays read as one classic invention wall. The dark cyan back
    // panels reproduce the depicted glazed recesses, not extra hull openings.
    for(const x of [-8,0,8]) {
      box(x,4.7,-11.58,6.25,7.7,.34,C.edge);
      box(x,4.7,-11.38,5.6,7.04,.06,0x255e69);
      beam([x-2.55,2.0,-11.31],[x+2.55,6.9,-11.31],.1,.07,C.edge);
      for(let j=0;j<5;j++)ball(x-2.1+j*.93,2.4+(j*1.47)%5.1,-11.31,.027,.027,.018,C.white,{glow:.15});
      for(const sx of [-1,1])box(x+sx*3.02,4.7,-11.26,.29,7.9,.32,C.ivory);
      box(x,8.45,-11.2,6.25,.35,.5,C.ivory);
    }
    // Rear-centre hanging stepped tip + illuminated round plinth are directly
    // visible in W05/W06. Suspension, fins' backs and function are inferred.
    const pz=-6.8;
    cyl(0,.28,pz,2.58,2.85,.55,C.edge);
    cyl(0,.65,pz,2.6,2.58,.22,C.ivory);
    cyl(0,.79,pz,2.19,2.19,.1,C.blue);
    ring(0,.87,pz,1.88,.085,C.cyan,{glow:.35});
    cyl(0,.87,pz,1.17,1.17,.07,C.cyan,{glow:.32});
    for(let i=0;i<6;i++) {
      const a=i*Math.PI/3;box(Math.sin(a)*2.42,.5,pz+Math.cos(a)*2.42,.4,.26,.33,C.navy,{ry:a});
    }
    box(0,8.2,pz,4.7,.5,4.6,C.steel);
    cyl(0,7.3,pz,1.06,1.06,1.5,C.steel);
    cyl(0,6.3,pz,1.36,.98,.65,C.blue);
    cyl(0,5.05,pz,1.32,.36,2.1,C.steel);
    cyl(0,3.49,pz,.4,.055,1.05,C.edge);
    for(const y of [5.8,6.75,7.8])ring(0,y,pz,y===5.8?1.1:1.18,.13,C.edge);
    for(let i=0;i<4;i++) {
      const a=Math.PI/4+i*Math.PI/2,sx=Math.sin(a),sz=Math.cos(a);
      beam([sx*1.24,6.4,pz+sz*1.24],[sx*1.93,5.9,pz+sz*1.93],.25,.42,C.edge);
      beam([sx*1.93,5.9,pz+sz*1.93],[sx*.65,3.6,pz+sz*.65],.29,.44,C.blue);
      beam([sx*.65,3.6,pz+sz*.65],[sx*.13,2.95,pz+sz*.13],.14,.22,C.steel);
      beam([sx*1.4,8.15,pz+sz*1.4],[sx*2.8,8.2,pz+sz*2.8],.16,.21,C.dark);
    }
    pipe([[0,8.46,pz],[0,8.46,-10.9],[7.0,8.46,-10.9]],.17,C.dark);
    block(0,pz,5.8,5.8);
    screen(0,1.25,-3.75,2.25,.64,'实验控制');
    box(0,.61,-3.91,2.65,1.2,.67,C.ivory);
    block(0,-3.91,2.8,.94);

    // Rear-left open-mouthed cylindrical device, kept hollow with a dark inset.
    const lx=-8,lz=-7;
    cyl(lx,.25,lz,2.4,2.65,.5,C.edge);
    cyl(lx,1.85,lz,1.95,2.22,2.7,C.ivory);
    cyl(lx,3.21,lz,2.05,1.93,.18,C.steel);
    cyl(lx,3.315,lz,1.69,1.69,.05,C.rubber);
    ring(lx,3.35,lz,1.87,.11,C.cyan,{glow:.3});
    for(let i=0;i<4;i++) {
      const a=i*Math.PI/2;
      beam([lx+Math.sin(a)*2.15,.65,lz+Math.cos(a)*2.15],[lx+Math.sin(a)*1.98,2.8,lz+Math.cos(a)*1.98],.2,.25,C.steel);
    }
    screen(lx,1.6,lz+2.1,1.8,.7,'部件转换');
    pipe([[lx-2,.9,lz],[lx-3,.9,lz],[lx-3,.9,-10.2],[lx-1.2,.9,-10.7]],.13,C.dark);
    block(-8.4,-7.7,6.2,6.9);

    // Rear-right open-lid invention pod, with full rear hinge and support links.
    const rx=8,rz=-6.85;
    cyl(rx,.25,rz,2.55,2.85,.5,C.steel);
    cyl(rx,.75,rz,2.3,2.55,.5,C.ivory);
    cyl(rx,1.04,rz,1.86,1.86,.1,C.cyan,{glow:.2});
    cyl(rx,1.46,rz,.8,1.0,.73,C.edge);
    ball(rx,1.97,rz,.86,.52,.86,C.steel);
    for(const sx of [-1,1]) {
      beam([rx+sx*1.95,.6,rz+.9],[rx+sx*2.05,2.8,rz-.9],.45,.6,C.steel);
      beam([rx+sx*2.05,2.8,rz-.9],[rx+sx*1.5,3.68,rz-1.3],.35,.4,C.edge);
      cyl(rx+sx*1.64,3.33,rz-1.12,.24,.24,.66,C.dark,{rz:Math.PI/2});
    }
    box(rx,3.75,rz-1.33,4.6,2.4,.5,0x8492a7,{rx:-.32});
    box(rx,3.79,rz-.98,3.9,1.7,.12,C.ivory,{rx:-.32});
    box(rx,4.98,rz-1.71,2.5,.22,.35,C.steel);
    for(const sx of [-1,1])pipe([[rx+sx*2.1,.5,rz-1],[rx+sx*2.3,1.8,rz-1.4],[rx+sx*1.8,3.2,rz-1.2]],.085,C.dark);
    block(rx,rz,5.8,5.9);

    // Left-front inventor's round table. Cyan work surface, console and an
    // articulated assembly aid; the latter is a workflow design informed by W03.
    const tx=-8,tz=2.8;
    cyl(tx,.2,tz,2.58,2.8,.4,C.steel);
    cyl(tx,.79,tz,1.55,1.98,.9,C.ivory);
    cyl(tx,1.32,tz,2.6,2.55,.28,C.edge);
    cyl(tx,1.49,tz,2.28,2.28,.09,C.blue);
    ring(tx,1.56,tz,1.95,.065,C.cyan,{glow:.15});
    cyl(tx,1.57,tz,.9,.9,.08,C.cyan,{glow:.22});
    arm([[tx-1.65,1.48,tz-.9],[tx-1.8,2.9,tz-.9],[tx-.85,3.55,tz-.5],[tx-.1,2.6,tz-.1]],C.ivory);
    box(tx-.1,2.48,tz-.1,.4,.29,.5,C.steel);
    for(let i=0;i<4;i++)box(tx-.6+i*.4,1.57,tz+1.75,.16,.07,.2,i===3?C.red:C.white);
    screen(tx-2.22,2.2,tz-1.5,1.65,1.16,'肖恩工位',.24);
    beam([tx-2.22,1.36,tz-1.65],[tx-2.22,2.15,tz-1.65],.14,.16,C.dark);
    pipe([[tx+1.5,.6,tz-1.1],[tx+2.8,.25,tz-1.8],[tx+2.8,.25,-1.4]],.08,C.steel);
    block(tx,tz,6.3,6.0);
    block(-5.25,-.85,.4,1.3);

    // The small central assembly stand is moved slightly aside to preserve the
    // single entrance's straight route to the rear core's operating position.
    const sx=-1.9,sz=3.6;
    cyl(sx,.18,sz,1.07,1.27,.35,C.edge);
    cyl(sx,.62,sz,.65,.9,.52,C.ivory);
    cyl(sx,.95,sz,.86,.86,.15,C.blue);
    ring(sx,1.08,sz,.66,.06,C.cyan,{glow:.3});
    for(let i=0;i<3;i++) {
      const a=i*2*Math.PI/3;
      beam([sx+Math.sin(a)*.83,.7,sz+Math.cos(a)*.83],[sx+Math.sin(a)*.5,1.72,sz+Math.cos(a)*.5],.1,.14,C.edge);
    }
    ball(sx,1.56,sz,.3,.32,.3,C.blue);
    block(sx,sz,2.6,2.6);
    // W05/W06's small blue machine at right front becomes a complete fixture.
    const mx=9.5,mz=4.6;
    cyl(mx,.2,mz,1.42,1.65,.4,C.steel);
    cyl(mx,.77,mz,.9,1.26,.74,C.ivory);
    box(mx,1.56,mz,1.26,1.35,1.35,C.blue);
    cyl(mx,1.8,mz+.72,.37,.37,.24,C.dark,{rx:Math.PI/2});
    torus(mx,1.8,mz+.86,.33,.07,C.cyan,{glow:.25});
    box(mx,2.29,mz-.12,.9,.12,1.06,C.edge);
    screen(mx,1.12,mz+.86,1.02,.36,'原型工装');
    block(mx,mz,3.4,3.4);

    // Added right-wall tool / machining bench. Its role and placement are design
    // choices; unlike the three rear silhouettes they are not a 2009 screenshot.
    bench(12.8,-.35,3.8,2.7);
    box(12.1,1.72,-.38,.7,.5,1.4,C.steel);
    box(13.8,1.9,-.38,.5,.84,1.45,C.edge);
    cyl(13.08,2.05,-.38,.25,.25,1.45,C.dark,{rz:Math.PI/2});
    box(13.0,1.59,.1,1.2,.15,.7,C.blue);
    screen(14.0,2.7,-.8,1.2,.76,'加工设定');
    toolWall(10.7,-10.93,4.3);
    // Raised side service rails and a ceiling grid give a readable upper volume.
    for(const x of [-14.7,14.7]) {
      pipe([[x,2.3,8.5],[x,6.7,8.5],[x,6.7,-9.6]],.16,C.steel);
      for(const z of [-7,-1,5])box(x,6.65,z,.5,.45,.32,C.edge);
    }
    overhead(W,D,H,C.edge);
    text(0,8.32,-D/2+.34,'发明室',4.1,.56,C.cyan);
  };
})();
