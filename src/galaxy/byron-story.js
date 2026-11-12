// Playable ship records of Through the Dark Gate, chapters 4, 7 and 10.
// The player operates a reconstruction. The historical pilots remain Ophelia
// and the Helka elder. The three viewing stations and timing are our design.
function createByronStory(){
  const lab='byron-space',deck='byron-deck',helm='byron-witness';
  const stations=new Map([[lab,'时空门控制台'],[deck,'拜伦号观测甲板'],[helm,'逃生舰控制台']]);
  // Each position in the record describes the NEXT operation and the visual
  // phase reached by the previous one. Its stable key is written to saves.
  const steps=[
    {key:'arrival',site:helm,phase:0,label:'开启拜伦号航行记录',
      hint:'舷外巨眼属于原始黑洞·尤纳斯。可以在这里重放拜伦号最后一段航行。',
      result:'航行记录已开启。先去时空门控制台，查明全舰停电的原因。'},
    {key:'console',site:lab,phase:.04,label:'清除控制台黑泥',
      hint:'应急电源已接管照明。时空门仍在抽取舰上能源，带有红色乱码的黑泥覆盖了操作面。',
      result:'长老和奥菲利娅清理出一块操作面。下一步在此反转时空门程式。'},
    {key:'gate',site:lab,phase:.10,label:'反转时空门程式',
      hint:'恢复键盘后可以改变程式方向，让逸出的物质重新落回门内。',
      result:'黑泥与门旁的异常生物被吸回，奥菲利娅及时关停装置。前往观测甲板查看舷外。'},
    {key:'carrier',site:deck,phase:.19,label:'追踪拜伦号逆向引擎',
      hint:'长老留在拜伦号，奥菲利娅带意识硬盘登上逃生舰。甲板的记录仪朝向两船分离的位置。',
      result:'拜伦号点亮蓝色尾焰，撞向尤纳斯。黑色物质在接触面堆积；切到逃生舰控制台，跟随奥菲利娅。'},
    {key:'return',site:helm,phase:.50,label:'调转逃生舰航向',
      hint:'逃生舰发现意识服务器已遭侵蚀。奥菲利娅放弃原航线，转回拜伦号与巨影的撞击点。',
      result:'逃生舰避开黑色物质，从破损的舰壳进入引擎舱。可以伸出侧翼勾爪。'},
    {key:'engine',site:helm,phase:.62,label:'勾取罐装黑洞',
      hint:'逃生舰将从引擎舱的另一处破口穿出。让侧翼勾爪接住舱内的罐装黑洞。',
      result:'罐装黑洞已固定在逃生舰侧翼。通向尤纳斯核心的航线上出现黑色屏障。'},
    {key:'breach',site:helm,phase:.73,label:'释放奥菲利娅的电流',
      hint:'黑色物质封住了航路。调取奥菲利娅以电流击穿屏障的记录。',
      result:'屏障裂开，逃生舰的系统也随之失灵。沿原有惯性航线将罐装黑洞送入核心。'},
    {key:'core',site:helm,phase:.84,label:'投入尤纳斯核心',
      hint:'屏障后的核心已经显露。逃生舰只剩下穿过裂隙的惯性。',
      result:'罐装黑洞投入核心。爆发的冲击随即被向心引力拉回，连光也卷入其中。航行记录结束。'},
    {key:'complete',site:helm,phase:1,label:'重播拜伦号航行记录',
      hint:'本段航行记录已结束。可以在逃生舰控制台从头重播。'}
  ];
  let index=0,phase=0;
  function at(siteId){
    if(!stations.has(siteId))return null;
    const step=steps[index];
    if(index>0&&siteId!==step.site){
      const next=stations.get(step.site);
      return {label:'查看航行记录指引',hint:'下一站是'+next+'。'+step.hint,targetSite:step.site};
    }
    return {label:step.label,hint:step.hint,targetSite:step.site};
  }
  function act(siteId){
    const control=at(siteId);
    if(!control)return '';
    const step=steps[index];
    if(index>0&&siteId!==step.site)return control.hint;
    if(index===steps.length-1){
      if(phase<1)return '核心仍在坍缩，稍后可在这里重播。';
      index=1;phase=0;return steps[0].result;
    }
    index++;return step.result;
  }
  function restore(raw){
    const stored=raw?.version===1?steps.findIndex(step=>step.key===raw.step):-1;
    index=Math.max(0,stored);
    phase=stored>=0&&Number.isFinite(raw.phase)?Math.max(0,Math.min(steps[index].phase,raw.phase)):steps[index].phase;
  }
  function tick(dt){
    const target=steps[index].phase;
    if(phase>=target||!Number.isFinite(dt)||dt<=0)return false;
    phase=Math.min(target,phase+Math.min(dt,.25)*.12);
    return true;
  }
  return {at,act,tick,restore,get phase(){return phase;},get step(){return steps[index].key;},
    snapshot:()=>({version:1,step:steps[index].key,phase})};
}

// These accessible instruments are reconstructions for the ship's records.
// The fouled terminal belongs to the time-gate scene. The optical recorder
// and its installation on the old upper deck are simulator fittings.
function createByronRecordStations(T,root){
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
  const eye=station('拜伦号 · 逆向引擎记录仪',-6.9,6,30.3);
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
  d.box(housing,0,1.40,-.26,1.64,.83,.15,-.16);screen(eye,'逆向引擎记录','#83d7fb');
  for(const s of [-1,1]){
    d.line(arm,[s*.67,.77,-.1],[s*.72,1.65,-.36],.087);
    d.line(brass,[s*.72,1.44,-.34],[s*.93,1.44,-.36],.127);
    d.line(housing,[s*.90,1.80,-.31],[s*.90,1.85,-1.03],.20);
    d.ring(arm,s*.90,1.85,-1.04,.19,.16,0);
    for(let i=0;i<4;i++)d.box(thrust,s*(.49+.13*i),.81,.32,.080,.058,.05);
  }
  d.finish();
  const bad=new T.Color(0xf85a63).convertSRGBToLinear(),good=new T.Color(0x6af2d2).convertSRGBToLinear();
  const unlit=new T.Color(0x253849).convertSRGBToLinear(),blue=new T.Color(0x4ccbf8).convertSRGBToLinear();
  let last=-1;
  function setPhase(p){
    if(p===last)return;last=p;
    const spread=1-T.MathUtils.smoothstep(p,.042,.10),reverse=T.MathUtils.smoothstep(p,.10,.19);
    muck.visible=spread>.01;muck.scale.set(.06+.94*spread,.10+.90*spread,.12+.88*spread);
    stateLamp.color.copy(bad).lerp(good,reverse);stateLamp.emissive.copy(stateLamp.color);
    const output=T.MathUtils.smoothstep(p,.22,.48);
    thrust.color.copy(unlit).lerp(blue,output);thrust.emissiveIntensity=.035+1.8*output;
  }
  setPhase(0);return {setPhase};
}
