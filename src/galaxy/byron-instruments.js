function buildByronInstruments(T,root){
  function station(name,x,y,z){
    const frame=new T.Group();frame.name=name;frame.position.set(x,y,z);root.add(frame);return frame;
  }
  function screen(frame,title,colour){
    const canvas=document.createElement('canvas');canvas.width=384;canvas.height=160;
    const c=canvas.getContext('2d');
    c.fillStyle='#112432';c.fillRect(0,0,384,160);c.fillStyle=colour;c.font='bold 32px sans-serif';
    c.fillText(title,18,42);c.strokeStyle='#39616a';c.lineWidth=1;
    for(let x=19;x<367;x+=23){c.beginPath();c.moveTo(x,59);c.lineTo(x,140);c.stroke();}
    for(let y=62;y<146;y+=16){c.beginPath();c.moveTo(18,y);c.lineTo(366,y);c.stroke();}
    c.strokeStyle=colour;c.lineWidth=3;c.beginPath();
    for(let i=0;i<=96;i++){
      const x=18+i*3.6,y=105+13*Math.sin(i*.11)+9*Math.sin(i*.26)-29*Math.exp(-((i-58)**2)/31);
      if(i)c.lineTo(x,y);else c.moveTo(x,y);
    }
    c.stroke();const map=new T.CanvasTexture(canvas);map.encoding=T.sRGBEncoding;
    const panel=new T.Mesh(new T.PlaneGeometry(1.42,.63),new T.MeshBasicMaterial({map,toneMapped:false}));
    panel.position.set(0,1.40,-.15);panel.rotation.x=-.16;frame.add(panel);
  }
  const gate=station('时空门 · 受侵蚀的控制台',-9.15,0,-8.15);
  const eye=station('拜伦号 · 引力监测仪',-6.9,6,30.3);
  const k=byronKit(T,gate),steel=k.mat(0x58697d),edge=k.mat(0x98adc0),ink=k.mat(0x222839);
  const stateLamp=k.mat(0xf85a63,true),keys=k.mat(0x92bac2,true);
  k.box(ink,0,.09,0,1.93,.18,1.06);k.box(steel,0,.47,-.04,1.36,.72,.77);
  k.box(edge,0,.86,.15,1.91,.13,.91,.13);k.box(ink,0,.94,.29,1.53,.05,.48,.13);
  for(let row=0;row<3;row++)for(let i=0;i<7;i++)
    k.box(keys,-.57+.19*i,.99-.019*row,.12+row*.132,.13,.025,.082,.13);
  k.box(ink,0,1.4,-.26,1.69,.85,.15,-.16);screen(gate,'时空门控制', '#9adfcf');
  k.box(stateLamp,0,1.87,-.33,1.39,.045,.07);
  for(const s of [-1,1])k.line(steel,[s*.74,.82,-.18],[s*.74,1.62,-.39],.072);
  k.finish();
  const muck=new T.Group();muck.position.set(-.58,.95,-.12);gate.add(muck);
  const black=byronKit(T,muck),pitch=black.mat(0x190f26),red=black.mat(0xff495c,true);
  // Arms fork from the left casing, over the keys and up the front glass.
  for(const [x,y,z,w,h,d] of [[.05,.02,.10,.31,.13,.28],[.39,.023,.24,.40,.11,.25],
    [.75,.015,.32,.37,.12,.24],[.94,.022,.19,.26,.10,.20],[.11,.24,-.01,.18,.33,.12]]){
    black.ball(pitch,x,y,z,w,h,d);
  }
  black.pipe(pitch,[[0,.08,.08],[.09,.32,-.02],[.21,.51,-.13],[.49,.59,-.16],[.60,.69,-.19]],.072);
  black.pipe(pitch,[[.30,.09,.18],[.57,.13,.06],[.83,.09,.08],[1.01,.10,-.08],[1.16,.23,-.10]],.051);
  for(let i=0;i<8;i++)black.box(red,.09+i*.12,.14+.012*Math.sin(i),.23+.065*Math.sin(i*.91),.058,.012,.033);
  black.finish();
  const d=byronKit(T,eye),arm=d.mat(0x65758b),housing=d.mat(0x37485f),brass=d.mat(0xb69a62);
  const thrust=d.mat(0x4ccbf8,true);
  d.disk(housing,0,.10,0,.90,.18,.67);d.disk(arm,0,.26,0,.69,.15,.49);
  d.box(housing,0,.49,0,.71,.48,.52);d.box(arm,0,.77,-.04,1.68,.16,.70);
  d.box(housing,0,1.40,-.26,1.64,.83,.15,-.16);screen(eye,'引力监测','#83d7fb');
  for(const s of [-1,1]){
    d.line(arm,[s*.67,.77,-.1],[s*.72,1.65,-.36],.087);
    d.line(brass,[s*.72,1.44,-.34],[s*.93,1.44,-.36],.127);
    d.line(housing,[s*.90,1.80,-.31],[s*.90,1.85,-1.03],.20);
    d.ring(arm,s*.90,1.85,-1.04,.19,.16,0);
    for(let i=0;i<4;i++)d.box(thrust,s*(.49+.13*i),.81,.32,.080,.058,.05);
  }
  d.finish();
}
