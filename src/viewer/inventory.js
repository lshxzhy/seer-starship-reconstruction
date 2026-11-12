  // This is the pilot's storage box. The scene owns the equipment and sample
  // counts; reopening a panel must never create a second glider or drill.
  function createPilotInventory({container,getState,onUse}) {
    const items=[
      {id:'flyer',name:'奥飞滑翔翼',type:'单人座驾',
        note:'在开阔的甲板取出，靠近踏板登乘。着陆下机后可收回。'},
      {id:'map',name:'舰内导航图',type:'随船资料',
        note:'查看你所在的甲板、各舱室的入口与升降站。'},
      {id:'drill',name:'挖矿钻头',type:'采集装备',
        note:'机械室配发的双臂钻头。在机械室试钻，或前往克洛斯草原、海洋星深水区采黄晶矿。'},
      {id:'gas',name:'气体收集器',type:'手部作业工具',
        note:'蓝色吸气机与挖矿钻头共用手部槽位。到海洋星浅水区的甲烷气泡泉，面向采集点按 E。'},
      {id:'dive',name:'潜水套装',type:'潜水帽 · 手舵 · 腰带',
        note:'三件一键穿戴，提供水下照明和稳定步速，可同时带钻头或气体收集器。头部与喷火器互斥。'},
      {id:'flame',name:'火焰喷射器',type:'先锋队装备',
        note:'到赛尔号实验室后，打开“精灵 → SPT 首领 → 蘑菇怪”，选择“领取并装备火焰喷射器”。对准林间蘑菇怪护膜连续命中，可开启首领挑战。'},
      {id:'sample',name:'训练矿样',type:'采集材料',
        note:'在机械室采样工位用钻头取下的矿物标本。'},
      {id:'resources',name:'星球采集物',type:'黄晶矿 · 甲烷',
        note:'本期三个明确采集点各取一份标本，永久记录，重复点击不再发放。到动力室交付：黄晶矿每份20豆，甲烷每份100豆。'}
    ];
    const box=document.createElement('section');
    box.className='seer-inventory';
    box.setAttribute('aria-label','个人储存箱');
    box.hidden=true;
    const style=document.createElement('style');
    style.textContent=`
      .seer-inventory{color:#e6f3f5;container-type:inline-size}
      .seer-inventory [hidden]{display:none!important}
      .seer-inventory .inv-layout{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr);gap:clamp(12px,2.2vw,23px);align-items:start}
      .seer-inventory .inv-specimen{position:relative;display:grid;place-items:center;overflow:hidden;border-radius:7px;border:1px solid #315965;background-color:#152f3e;background-image:linear-gradient(#65bbbb12 1px,transparent 1px),linear-gradient(90deg,#65bbbb12 1px,transparent 1px),radial-gradient(ellipse at 45% 15%,#295563,#10232f 82%);background-size:21px 21px,21px 21px,100% 100%}
      .seer-inventory .inv-specimen img{display:block;width:min(84%,235px);height:clamp(95px,18vh,158px);object-fit:contain}
      .seer-inventory .inv-name{margin:.5em 0 .15em;font-size:clamp(16px,2vw,21px);line-height:1.25;color:#f4f9fc}
      .seer-inventory .inv-kind,.seer-inventory .inv-note,.seer-inventory .inv-state{margin:0;line-height:1.45}
      .seer-inventory .inv-kind{font-size:12px;color:#9bc4ca}
      .seer-inventory .inv-note{margin:.45em 0;color:#bdcfd5;font-size:13px}
      .seer-inventory .inv-rack{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
      .seer-inventory .inv-slot{display:grid;grid-template-rows:auto auto auto;align-content:center;justify-items:center;gap:2px;min-width:0;padding:6px 3px;border:1px solid #416372;border-radius:6px;background:#162d3b;color:#e5f2f5;font:inherit}
      .seer-inventory .inv-slot:hover{background:#213d4c}
      .seer-inventory .inv-slot[aria-pressed=true]{background:#264751;border-color:#6ed5cb;box-shadow:inset 0 -2px #6ed5cb}
      .seer-inventory .inv-slot:focus-visible,.seer-inventory .inv-action:focus-visible{outline:2px solid #ebfbff;outline-offset:1px}
      .seer-inventory .inv-slot img{width:min(100%,84px);height:42px;object-fit:contain}
      .seer-inventory .inv-slot-name{font-size:13px;font-weight:bold;overflow-wrap:anywhere}
      .seer-inventory .inv-state{font-size:11px;color:#afced2}
      .seer-inventory .inv-actions{display:flex;gap:6px;flex-wrap:wrap}
      .seer-inventory .inv-action{font:inherit;font-size:13px;min-height:36px;padding:5px 13px;background:#77d7cd;color:#10282e;border:1px solid #77d7cd;border-radius:5px;font-weight:bold}
      .seer-inventory .inv-action[data-inv-more]{background:transparent;color:#cee4e9;border-color:#52707d}
      .seer-inventory .inv-action:disabled{opacity:.5}
      @container(max-width:380px){
        .seer-inventory .inv-layout{grid-template-columns:minmax(0,1fr) 110px;gap:8px}
        .seer-inventory .inv-rack{grid-template-columns:1fr;gap:4px}
        .seer-inventory .inv-slot{grid-template-columns:32px 1fr;grid-template-rows:auto auto;align-items:center;justify-items:start;column-gap:3px;text-align:left}
        .seer-inventory .inv-slot img{grid-row:span 2;width:32px;height:34px}
        .seer-inventory .inv-slot-name{font-size:12px}
        .seer-inventory .inv-specimen img{width:90%;height:90px}
      }
      @media(pointer:coarse){.seer-inventory .inv-action{min-height:44px}}
    `;
    box.innerHTML=`<div class="inv-layout">
      <div><div class="inv-specimen"><img data-inv-image alt=""></div>
        <h3 class="inv-name" data-inv-name></h3><p class="inv-kind" data-inv-kind></p>
        <p class="inv-note" data-inv-note></p><div class="inv-actions">
          <button type="button" class="inv-action" data-inv-use></button>
          <button type="button" class="inv-action" data-inv-more>收回储存箱</button>
        </div></div>
      <div class="inv-rack" role="group" aria-label="已持有物品"></div>
    </div><p class="inv-wallet" data-inv-wallet></p>`;
    box.prepend(style);
    container.append(box);
    const preview=box.querySelector('[data-inv-image]');
    const name=box.querySelector('[data-inv-name]'),kind=box.querySelector('[data-inv-kind]');
    const note=box.querySelector('[data-inv-note]'),use=box.querySelector('[data-inv-use]');
    const stow=box.querySelector('[data-inv-more]'),rack=box.querySelector('.inv-rack');
    const wallet=box.querySelector('[data-inv-wallet]');

    // Paint inventory illustrations once, at double resolution. Each small
    // rack slot and the larger selected preview share the same image.
    function illustration(id){
      const sheet=document.createElement('canvas');
      sheet.width=320;sheet.height=220;
      const c=sheet.getContext('2d');
      if(!c)return '';
      c.scale(2,2);c.lineJoin='round';c.lineCap='round';
      const steel=c.createLinearGradient(0,32,0,85);
      steel.addColorStop(0,'#dfedf0');steel.addColorStop(.40,'#859aa5');steel.addColorStop(.53,'#d9e2df');steel.addColorStop(1,'#74848c');
      function face(d,fill,stroke='#253640'){
        const p=new Path2D(d);c.fillStyle=fill;c.fill(p);
        c.strokeStyle=stroke;c.lineWidth=1.35;c.stroke(p);
      }
      function ellipse(x,y,rx,ry,fill){
        c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);
        c.fillStyle=fill;c.fill();c.lineWidth=1;c.strokeStyle='#384953';c.stroke();
      }
      if(id==='flyer'){
        // Forward ports, folded purple strip, high rear box and centre tread.
        face('M64 31L92 24L104 32L103 56L61 59Z','#914935');
        face('M63 30L91 22L102 29L76 38Z','#fa956d');
        face('M63 30L76 38L76 58L62 52Z','#e76c49');
        face('M44 42L58 45L74 53L102 39L116 38L146 46L145 61L112 73L63 86L16 71L15 56Z','#976236');
        face('M15 55Q14 52 19 51L45 39L64 43L79 52L63 72L20 65Q14 64 15 55Z','#ffb64b');
        face('M22 51L43 43L56 46L44 50L53 54L38 58Z','#a886d2','#9b74c4');
        face('M86 51L103 37Q109 34 116 37L145 45Q148 46 145 52L112 66L91 65Z','#f7a538');
        face('M96 49L108 40L133 45L121 50L111 47L104 55Z','#aa86d1','#9975c5');
        face('M62 51L86 45L101 52L85 64L63 67L54 60Z','#65757e');
        face('M59 63L82 58L94 64L90 75L68 82L55 75Z',steel);
        face('M60 70L66 73L86 67L86 70L66 77L60 74Z','#35444d');
        for(const [x,y] of [[28,68],[38,71],[106,68],[117,64]]){
          face(`M${x-4} ${y-2}l3 -4 7 1 -2 7 -6 1Z`,steel);
          ellipse(x+1,y+2,4,3.2,'#405969');
        }
      }else if(id==='drill'){
        for(const [x,y] of [[53,51],[103,47]]){
          c.save();c.translate(x,y);c.rotate(-.22);
          face('M-19 -10L-8 -12L-6 5L-22 9Q-28 7 -26 -1Z','#c14e3d');
          face('M-14 -17Q0 -30 14 -18L19 2Q18 9 0 12Q-18 11 -18 1Z','#c68f3e');
          ellipse(0,-15,13,5,'#f7d481');ellipse(0,-15,6,2.8,'#88d5ae');
          face('M-17 6Q0 13 18 4L14 23L5 40L0 45L-9 36L-15 21Z',steel);
          c.strokeStyle='#586775';c.lineWidth=2.8;
          for(const [radius,yy] of [[16,12],[14,19],[12,25],[9,31],[5,37]]){
            c.beginPath();c.moveTo(-radius,yy+1);c.quadraticCurveTo(0,yy-4,radius,yy-1);c.stroke();
          }
          c.restore();
        }
      }else if(id==='flame'){
        face('M45 62L107 57L120 63L118 79L47 86L38 78L39 66Z','#41474a');
        face('M40 65L107 58L119 63L49 71Z','#969fa0');
        for(const [x,y] of [[63,62],[97,59]]){
          c.save();c.translate(x,y);c.rotate(-.14);
          face('M-7 10Q-16 1 -13 -9L-7 -22L-7 -32L4 -34L5 -19Q18 -6 10 6Z',steel);
          face('M-10 -33L-10 -41Q-8 -50 0 -50Q8 -50 10 -42L9 -34Q4 -29 -4 -29Z','#a33136');
          ellipse(0,-43,9,6,'#ec766a');ellipse(0,-43,3.8,3,'#321e22');
          face('M-4 3Q-7 13 0 19L4 18Q0 12 3 3Z','#85835f');
          c.restore();
        }
      }else if(id==='gas'){
        face('M53 34L96 28Q119 37 117 64L75 80Q51 69 53 34Z','#3c91c4');
        ellipse(58,54,21,25,steel);ellipse(58,54,15,19,'#2b637d');ellipse(58,54,10,14,'#172c37');
        face('M94 63L108 59L111 88L94 92Z',steel);ellipse(106,42,6,7,'#f8d659');
      }else if(id==='dive'){
        face('M35 43Q75 16 121 42L114 52L42 53Z','#668d9e');
        face('M69 35L89 8L97 37Z','#44788e');
        face('M28 62L46 55L53 88L37 94L23 80Z','#668d9e');
        face('M113 58L132 62L140 81L126 95L108 88Z','#668d9e');
        ellipse(80,79,24,11,steel);ellipse(80,77,17,6,'#294550');
        for(const x of [61,95])face(`M${x} 66v-13h5v18Z`,'#e5eeee');
      }else if(id==='map'){
        face('M34 24L111 13L132 73L55 94L30 34Z','#637e88');
        face('M32 25L110 11L128 69L52 88Z','#acc9cf');
        face('M38 29L106 17L120 65L55 80Z','#1e5665');
        c.save();c.transform(1,-.21,.27,1,41,32);
        for(const [x,y,w,h] of [[9,2,11,12],[29,2,15,10],[4,23,13,10],[30,24,9,9],[48,21,10,10]]){
          c.fillStyle='#6ab3b6';c.fillRect(x,y,w,h);
        }
        c.strokeStyle='#b7f5e8';c.lineWidth=2;c.beginPath();c.moveTo(3,18);c.lineTo(57,18);c.stroke();
        c.beginPath();c.arc(39,18,3,0,Math.PI*2);c.fillStyle='#f6c764';c.fill();
        c.restore();
      }else{
        face('M28 74L35 64L74 56L122 67L136 81L90 95L42 88Z','#687f87');
        face('M30 70L74 57L132 76L90 88L40 82Z','#a9b7b4');
        face('M45 65L56 39L76 35L83 57L65 74Z','#bb7e40');
        face('M56 39L69 45L76 35L62 33Z','#f1c374');
        face('M69 45L76 35L83 57L67 71Z','#8f663c');
        face('M72 71L85 42L100 38L111 57L102 73L86 81Z','#d29e60');
        face('M85 42L95 48L100 38L92 35Z','#fbd798');
        face('M95 48L101 69L111 57L100 38Z','#aa743c');
        face('M36 69L43 53L52 53L59 65L50 74Z','#cc954d');
      }
      return sheet.toDataURL('image/png');
    }

    const slots=new Map();
    for(const item of items){
      const button=document.createElement('button');
      button.className='inv-slot';button.type='button';button.dataset.invItem=item.id;
      const image=document.createElement('img');image.alt='';image.src=illustration(item.id);
      const title=document.createElement('span');title.className='inv-slot-name';title.textContent=item.name;
      const status=document.createElement('span');status.className='inv-state';
      button.append(image,title,status);rack.append(button);
      slots.set(item.id,{button,image,status});
    }
    let selected='flyer',last='';
    function refresh(){
      if(box.hidden)return;
      const s=getState();
      const visible={flyer:!s.onSurface,map:!!s.hasMap,drill:true,gas:true,dive:true,flame:true,sample:s.samples>0,resources:(s.fieldResources?.ore||s.fieldResources?.gas)>0};
      if(!visible[selected])selected=s.onSurface?'drill':'flyer';
      const summary={flyer:s.mounted?'驾驶中':s.flyerStored?'已收纳':s.nearFlyer?'停在身旁':'停在舰内',
        map:'随身',drill:!s.drillOwned?'机械室领取':s.drillEquipped?'已装备':'已收纳',
        gas:!s.fieldKitOwned?'机械室领取':s.handTool==='gas'?'已装备':'已收纳',
        dive:!s.fieldKitOwned?'机械室领取':s.divingSuit?'已穿戴':'已收纳',
        flame:!s.flameTool?'实验室领取':s.flameEquipped?'已装备':'已收纳',sample:'× '+(s.samples||0),
        resources:'黄晶矿 '+(s.fieldResources?.ore||0)+' · 甲烷 '+(s.fieldResources?.gas||0)};
      const signature=JSON.stringify([visible,summary,selected,s.active,s.landing,s.credits,s.atExchange,s.onSurface]);
      if(last===signature)return;
      last=signature;
      wallet.textContent='赛尔豆余额　'+s.credits;
      for(const item of items){
        const slot=slots.get(item.id);
        slot.button.hidden=!visible[item.id];slot.status.textContent=summary[item.id];
        slot.button.setAttribute('aria-pressed',String(selected===item.id));
      }
      const item=items.find(i=>i.id===selected),slot=slots.get(selected);
      preview.src=slot.image.src;name.textContent=item.name;
      kind.textContent=item.type+' · '+summary[selected];note.textContent=item.note;
      const actions={flyer:s.landing?'正在着陆':s.mounted?'着陆下机':s.flyerStored?'取出滑翔翼':
        s.nearFlyer?'驾驶滑翔翼':'调到身旁',map:'打开导航图',
        drill:!s.drillOwned?'前往机械室领取':s.drillEquipped?'卸下钻头':'装备钻头',
        gas:!s.fieldKitOwned?'前往机械室领取':s.handTool==='gas'?'卸下收集器':'装备收集器',
        dive:!s.fieldKitOwned?'前往机械室领取':s.divingSuit?'收起潜水装':'穿戴潜水装',
        flame:!s.flameTool?'前往实验室领取':s.flameEquipped?'收起喷火器':'装备喷火器',
        resources:s.atExchange?'交付采集物 · '+s.fieldResources.value+'豆':'前往动力室交付'};
      use.hidden=false;use.textContent=selected==='sample'?'跟随路标交付':actions[selected]||'';
      use.disabled=!s.active || (selected==='flyer'&&s.landing===true);
      const fieldDestination=['drill','gas','dive','flame'].includes(selected);
      stow.hidden=fieldDestination?false:selected!=='flyer'||s.mounted||s.flyerStored;
      stow.textContent=fieldDestination?({drill:'前往草原黄晶矿',gas:'前往浅水甲烷泉',dive:'前往海洋浅水区',flame:'前往林间调查区'}[selected]):'收回储存箱';
      stow.disabled=!s.active;
    }
    function click(e){
      const button=e.target.closest?.('button');
      if(!button || !box.contains(button)||button.disabled)return;
      if(button.dataset.invItem)selected=button.dataset.invItem;
      else if(button===use)onUse(selected==='sample'?'delivery':selected);
      else if(button===stow)onUse(selected==='flyer'?'stowFlyer':'field:'+selected);
      refresh();
    }
    box.addEventListener('click',click);
    return {
      open(){box.hidden=false;refresh();},refresh,
      close(){box.hidden=true;},
      dispose(){box.removeEventListener('click',click);box.remove();}
    };
  }
