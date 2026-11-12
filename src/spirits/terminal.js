// The terminal issues commands to the rules engine. Only a committed turn
// can consume an item or remove a creature from the landscape.
function createSpiritTerminal({records,chat,locationName,siteId,setFollower,setSafari,setFlameTool,visitChallengeSite,enterWetland,withdraw,requestFrame}){
  const overlay=root.querySelector('[data-spirit-overlay]'),panel=overlay.querySelector('[role=dialog]');
  const content=panel.querySelector('[data-spirit-content]'),tabs=panel.querySelector('[data-spirit-tabs]');
  const feedback=panel.querySelector('[data-spirit-feedback]'),title=panel.querySelector('h2'),dismiss=panel.querySelector('[data-spirit-close]');
  const game=createSpiritSystem(),studio=createSpiritStage(T);
  const sections={party:'队伍',storage:'仓库',dex:'图鉴',spt:'SPT 首领',lab:'培育',safari:'捕猎场',field:'野外'};
  const origins=new Map();
  function addOrigin(id,text){
    if(!origins.has(id))origins.set(id,new Set());
    origins.get(id).add(text);
  }
  addOrigin(10,'克洛斯星草原 · 常驻');
  for(const [site,rows] of Object.entries(KLOSE_TERRITORIES)){
    const name=KLOSE_WORLD.sites.find(s=>s.id===site)?.name;
    for(const [id,,,,role] of rows)addOrigin(id,name+' · '+({rare:'特殊遭遇',boss:'SPT 首领',event:'历史活动观察',wild:'野生'})[role]);
  }
  for(const habitat of Object.values(OCEAN_HABITATS)){
    for(const id of habitat.animals)addOrigin(id,habitat.name+' · '+(id===34?'SPT 首领':'野生'));
  }
  for(const habitat of Object.values(TWIN_HABITATS)){
    for(const id of habitat.animals)addOrigin(id,habitat.name+' · 栖地观察');
  }
  addOrigin(108,'海洋星 · 三层轮换的历史稀有遭遇');
  const safariMethods={field:'场内可见',random:'步行遭遇',fish:'垂钓',tree:'摇树',bear:'闪光晶石'};
  for(const [key,list] of Object.entries(SEER_SPIRIT_DATA.safari)){
    for(const id of list)addOrigin(id,'2011 年克洛斯湿地捕猎场 · '+safariMethods[key]);
  }
  for(const id of game.view().starters)addOrigin(id,'赛尔号 · 初始伙伴');
  addOrigin(46,'克洛斯星林间 · 蘑菇怪首胜奖励');
  addOrigin(301,'实验室融合 · 绿色元神珠孵化');
  for(const id of SEER_SPIRIT_DATA.playable){
    const evolution=SEER_SPIRIT_DATA.species[id]?.evolves;
    if(evolution)addOrigin(evolution[1],game.species(id,false).name+'达到 '+evolution[0]+' 级进化');
  }
  const statNames=['体力','攻击','防御','特攻','特防','速度'];
  let page='party',active=false,busy=false,recordReady=false,revision=0,opener=null,encounter=null,chiefId=47;
  let selection=null,starter=1,query='',offset=0,dexId=1,stageJob=null,generation=0;
  const period=20;
  let huntTimer=0,atFieldGate=false;
  let sightWrites=Promise.resolve();
  function el(parent,tag,cls='',text=''){
    const item=document.createElement(tag);if(cls)item.className=cls;if(text!=='')item.textContent=text;parent.append(item);return item;
  }
  function button(parent,label,fn,options={}){
    const b=el(parent,'button',options.primary?'spirit-primary':'',label);b.type='button';b.disabled=!!options.disabled;
    if(options.selected!==undefined)b.setAttribute('aria-pressed',String(options.selected));
    if(options.action)b.dataset.spiritAction=options.action;
    if(options.note)el(b,'small','',options.note);
    b.addEventListener('click',fn);return b;
  }
  function report(message){
    feedback.textContent=message||'';feedback.hidden=!message;
  }
  const number=id=>'#'+String(id).padStart(3,'0');
  function types(p){return (p?.types||[]).join(' / ');}
  function figure(host,entries,duel=false){
    const mount=el(host,'div','spirit-stage'+(duel?' duel':''));stageJob={mount,entries};
  }
  function hpMeter(parent,p){
    const row=el(parent,'div','spirit-meter'),bar=el(row,'progress');
    bar.max=Math.max(1,p.maxHP);bar.value=p.hp;bar.setAttribute('aria-label',p.name+'体力');
    el(row,'small','',p.hp+' / '+p.maxHP);
  }
  function chatWith(p,bond){
    if(busy)return;
    const place=locationName(),sid=p.speciesId??p.id;
    const context={speciesId:sid,uid:bond==='owned'?String(p.uid):undefined,name:p.name,bond,level:p.level,
      location:place,hp:p.hp,maxHp:p.maxHP,type:types(p)||types(game.species(sid)),moves:(p.moves||[]).map(m=>m.name)};
    if(!chat(context,()=>{if(active){dismiss.focus({preventScroll:true});requestFrame();}})){
      report('精灵通讯使用本机 Ollama。请打开项目的「启动舰上通讯.cmd」，在本机通讯版与精灵交谈。');
    }
  }
  async function act(action){
    if(busy||!recordReady)return;
    busy=true;const before=game.snapshot(),previous=game.view().battle,viewGeneration=generation;
    try{
      const result=game.act(action);
      if(!result.ok){report(result.message);return;}
      const committed=await records.commit(revision,game.snapshot());
      if(!committed?.ok){
        if(committed?.record){revision=committed.record.revision;game.restore(committed.record.data);}
        else game.restore(before);
        report('存档已在另一窗口更新，已载入最新进度。请重新选择操作。');return;
      }
      revision=committed.record.revision;
      if(action.type==='safari'&&action.op==='enter'&&atFieldGate){enterWetland();atFieldGate=false;}
      if(action.type!=='safari'&&['won','caught','escapedWild'].includes(result.outcome)){
        if(previous?.encounterKey)withdraw(previous.encounterKey);encounter=null;
      }
      if(result.outcome&&action.type!=='safari'){page='party';selection=game.view().party[0]?.uid??null;}
      if(result.outcome==='won'&&previous?.kind==='boss'&&!before.bosses.includes(previous.enemy.speciesId)){
        chiefId=previous.enemy.speciesId;page='spt';
      }
      if(action.type==='safari')page='safari';
      if(action.type==='starter')page=encounter?'field':'party';
      if(action.type==='withdraw')page='party';
      if(action.type==='store')page='storage';
      if(action.uid)selection=action.uid;
      if(action.type==='move')studio.animateTurn();
      report(result.outcome?game.view().log.slice(-3).join('　'):result.message);
    }catch(reason){
      game.restore(before);report('进度未写入。'+reason.message);
    }finally{
      busy=false;applyFollower(game.snapshot());if(active&&generation===viewGeneration)render();
    }
  }
  function starterPage(host){
    const block=el(host,'section','spirit-page');el(block,'h3','','选择初始伙伴');
    const choices=el(block,'div','spirit-list');
    for(const id of game.view().starters){
      const s=game.species(id);
      button(choices,s.name,()=>{starter=id;render();},{selected:starter===id,note:types(s)});
    }
    const current=game.species(starter);
    figure(block,[{id:starter,name:current.name}]);
    button(block,'领取'+current.name,()=>act({type:'starter',speciesId:starter}),{primary:true,action:'starter'});
  }
  function showMoves(parent,moves){
    const list=el(parent,'div','spirit-list');
    for(const m of moves)el(list,'span','spirit-sub',m.name+' · '+m.pp+'/'+m.maxPP+' PP');
  }
  function showStats(parent,items){
    const row=el(parent,'div','spirit-stats');
    for(const [i,name] of statNames.entries()){const cell=el(row,'div','',name);el(cell,'strong','',String(items[i]??'—'));}
  }
  function memberPage(host,state,inVault){
    const group=inVault?state.storage:state.party;
    if(!group.length){
      if(!inVault&&!state.party.length){starterPage(host);return;}
      el(host,'p','spirit-sub','仓库为空。队伍满员时，新捕捉的精灵会进入仓库。');return;
    }
    const pet=group.find(p=>p.uid===selection)||group[0];selection=pet.uid;
    const list=el(host,'div','spirit-list');
    for(const p of group)button(list,p.name+'　Lv.'+p.level,()=>{selection=p.uid;render();},
      {selected:p.uid===pet.uid,note:p.hp+'/'+p.maxHP+' HP'});
    const columns=el(host,'div','spirit-columns'),art=el(columns,'div'),detail=el(columns,'div');
    figure(art,[{id:pet.speciesId,name:pet.name}]);
    el(detail,'span','spirit-catalog-number',number(pet.speciesId)+'　'+types(pet));
    el(detail,'h3','spirit-name',pet.name+'　Lv.'+pet.level);hpMeter(detail,pet);
    el(detail,'p','spirit-sub','经验 '+pet.xp+' / '+pet.nextXP+'　·　'+pet.nature+'　·　个体 '+pet.iv);
    const stats=pet.stats;showStats(detail,[pet.maxHP,stats.attack,stats.defense,stats.spAttack,stats.spDefense,stats.speed]);
    if(Array.isArray(pet.ev))el(detail,'p','spirit-sub','学习力（体 / 攻 / 防 / 特攻 / 特防 / 速）　'+pet.ev.join(' / '));
    showMoves(detail,pet.moves);
    const controls=el(host,'div','spirit-actions');
    button(controls,'与'+pet.name+'交流',()=>chatWith(pet,'owned'),{action:'chat'});
    if(inVault)button(controls,'加入队伍',()=>act({type:'withdraw',uid:pet.uid}),{disabled:state.party.length>=6,action:'withdraw'});
    else{
      button(controls,'设为首发',()=>act({type:'lead',uid:pet.uid}),{disabled:state.party[0].uid===pet.uid,action:'lead'});
      button(controls,state.followerUid===pet.uid?'收回跟随':'身边跟随',()=>act({type:'follow',uid:pet.uid}),{selected:state.followerUid===pet.uid,action:'follow'});
      button(controls,'送入仓库',()=>act({type:'store',uid:pet.uid}),{disabled:state.party.length<=1,action:'store'});
      button(controls,'全队恢复与补给',()=>act({type:'heal'}),{action:'heal'});
    }
    if(!inVault&&state.bankedXP>0&&pet.level<100){
      const bank=el(host,'details');el(bank,'summary','','分配积累经验 · 余额 '+state.bankedXP);
      const line=el(bank,'div','spirit-row'),label=el(line,'label','','经验点数 ');
      const amount=el(label,'input');amount.type='number';amount.min='1';amount.max=String(state.bankedXP);
      amount.value=String(Math.min(state.bankedXP,Math.max(1,pet.nextXP-pet.xp)));
      button(line,'分给'+pet.name,()=>act({type:'allocateXP',uid:pet.uid,amount:amount.valueAsNumber}),{action:'allocate-xp'});
    }
    if(pet.learnable?.length){
      const fold=el(host,'details');el(fold,'summary','','更换技能');const row=el(fold,'div','spirit-row');
      const move=el(row,'select');move.setAttribute('aria-label','可学习技能');
      for(const m of pet.learnable)move.add(new Option(m.name+' · '+m.type,m.id));
      const slot=el(row,'select');slot.setAttribute('aria-label','技能槽');
      for(let i=0;i<4;i++)slot.add(new Option((i+1)+' · '+(pet.moves[i]?.name||'空位'),String(i)));
      button(row,'装入技能槽',()=>act({type:'learn',uid:pet.uid,moveId:Number(move.value),slot:Number(slot.value)}),{action:'learn'});
    }
  }
  function travelSpt(site){
    if(busy)return;
    close(false);visitChallengeSite(site);
    if(site==='laboratory')open(null,canvas,{op:'spt'});
  }
  function sptMission(host,state){
    const switcher=el(host,'div','spirit-row');
    for(const [id,challenge] of SPT_CHALLENGES)
      button(switcher,PANO_NAVIGATION.regions[challenge.planet].definition.name+' · '+game.species(id,false).name,()=>{chiefId=id;render();},{selected:chiefId===id,action:'spt-'+id});
    const challenge=SPT_CHALLENGES.get(chiefId),species=game.species(chiefId,false);
    const site=PANO_NAVIGATION.regions[challenge.planet].byId.get(challenge.site);
    const cols=el(host,'div','spirit-columns'),art=el(cols,'div'),detail=el(cols,'div');
    figure(art,[{id:chiefId,name:species.name}]);
    el(detail,'span','spirit-catalog-number',number(chiefId)+'　'+types(species)+'　·　SPT 先锋队');
    el(detail,'h3','spirit-name',chiefId===47?'发狂的蘑菇怪':species.name);
    el(detail,'p','',site.name+'　·　Lv.'+challenge.level+'　·　'+challenge.hp+' 体力');
    if(chiefId===34){
      el(detail,'p','spirit-sub',state.defeatedShark?'已完成首胜　·　持有黑晶矿 ×'+state.materials.blackCrystal:'首胜奖励　·　黑晶矿 ×'+challenge.blackCrystal);
      el(detail,'p','','深水区可以捕获利牙鱼。将它培养到 20 级，会进化成自己的钢牙鲨。');
      button(detail,'前往海底 · 钢牙鲨',()=>travelSpt(challenge.site),{primary:true,action:'spt-ocean-floor'});
      return;
    }
    const lab=siteId()==='laboratory';
    el(detail,'p','spirit-sub',state.defeatedMushroom?'已完成首胜　·　小蘑菇已领取':'首胜奖励　·　1 级'+game.species(challenge.partner,false).name+'和 '+challenge.bankedXP.toLocaleString('zh-CN')+' 点积累经验');
    if(state.bankedXP>0){
      el(detail,'p','','待分配经验　'+state.bankedXP);
      button(detail,'到队伍分配经验',()=>{page='party';report('');render();},{action:'party-xp'});
    }
    if(!state.flameTool){
      el(detail,'p','','先在赛尔号实验室领用火焰喷射器。');
      if(lab)button(detail,'领取并装备火焰喷射器',()=>act({type:'equipFlameTool',site:siteId()}),{primary:true,action:'equip-flame'});
      else button(detail,'前往赛尔号实验室',()=>travelSpt('laboratory'),{primary:true,action:'spt-lab'});
    }else{
      el(detail,'p','','火焰喷射器已装备。面向淡蓝色护膜连续照射三次，等它消散后点蘑菇怪发起挑战。');
      button(detail,'前往林间 · 蘑菇怪',()=>travelSpt(challenge.site),{primary:true,action:'spt-forest'});
    }
  }
  function fieldPage(host,state){
    if(!encounter){el(host,'p','spirit-sub','靠近地表的精灵后，可以接触它。');return;}
    const info=game.species(encounter.speciesId);if(!info)return;
    const role=encounter.boss?'首领观察':{wild:'野生',rare:'稀有',boss:'首领',event:'活动观察',observation:'栖地观察'}[encounter.kind]||'野生';
    const columns=el(host,'div','spirit-columns'),art=el(columns,'div'),detail=el(columns,'div');
    figure(art,[{id:info.id,name:info.name}]);el(detail,'span','spirit-catalog-number',number(info.id)+'　'+types(info));
    el(detail,'h3','spirit-name',info.name);el(detail,'p','',role+(encounter.level?'　Lv.'+encounter.level:''));
    el(detail,'p','spirit-sub',(TWIN_HABITATS[encounter.siteId]?.name||OCEAN_HABITATS[encounter.siteId]?.name||KLOSE_WORLD.sites.find(s=>s.id===encounter.siteId)?.name||locationName())+
      (encounter.kind==='boss'?'　·　首领挑战':encounter.kind==='event'?'　·　历史活动观察':encounter.kind==='observation'?'　·　观察与交流':'　·　可使用精灵胶囊'));
    const row=el(detail,'div','spirit-actions');
    if(encounter.fieldLock){
      el(detail,'p','spirit-sub',encounter.fieldLock);
      if(encounter.speciesId===47&&!state.flameTool)button(row,'去实验室领取喷射器',()=>travelSpt('laboratory'),{action:'spt-lab'});
    }
    if(!['event','observation'].includes(encounter.kind)&&!encounter.fieldLock){
      if(state.party.length)button(row,encounter.kind==='boss'?'挑战首领':'进入对战',()=>act({type:'encounter',encounter:{key:encounter.key,speciesId:info.id,level:encounter.level,kind:encounter.kind,siteId:encounter.siteId}}),{primary:true,action:'encounter'});
      else button(row,'先选择初始伙伴',()=>{page='party';render();},{primary:true,action:'choose'});
    }
    button(row,'与'+info.name+'交流',()=>chatWith({...encounter,types:info.types},'wild'),{action:'chat'});
  }
  function battlePage(host,state){
    const b=state.battle,pet=state.party.find(p=>p.uid===b.activeUid)||state.party[0],enemy=b.enemy;
    const top=el(host,'div','spirit-battle-heads');
    for(const p of [pet,enemy]){const side=el(top,'div');el(side,'strong','',p.name+'　Lv.'+p.level+(p.status?'　'+p.status:''));hpMeter(side,p);}
    figure(host,[{id:pet.speciesId,name:pet.name},{id:enemy.speciesId,name:enemy.name}],true);
    const moveList=el(host,'div','spirit-moves');
    if(!b.needsSwitch){
      for(const m of pet.moves)button(moveList,m.name,()=>act({type:'move',moveId:m.id}),{disabled:m.pp<=0,
        note:m.type+' · '+m.category+'　'+(m.power||'—')+'　PP '+m.pp+'/'+m.maxPP,action:'move'});
      if(b.canStruggle)button(moveList,'挣扎',()=>act({type:'move',moveId:0}),{note:'技能 PP 已用完',action:'struggle'});
    }else el(host,'p','','当前精灵已失去战斗力，请换上还能出战的伙伴。');
    const options=el(host,'div','spirit-actions');
    for(const p of state.party.filter(p=>p.uid!==pet.uid&&p.hp>0))
      button(options,'换上'+p.name,()=>act({type:'switch',uid:p.uid}),{action:'switch'});
    if(b.kind!=='boss'&&!b.needsSwitch)button(options,'精灵胶囊 ×'+state.capsules,()=>act({type:'capture'}),{disabled:state.capsules<=0,action:'capture'});
    if(!b.needsSwitch)button(options,'体力药 ×'+state.potions,()=>act({type:'potion',uid:pet.uid}),{disabled:state.potions<=0||pet.hp===pet.maxHP,action:'potion'});
    button(options,'撤离',()=>act({type:'flee'}),{action:'flee'});
    const log=el(host,'ol','spirit-log');for(const msg of state.log.slice(-5))el(log,'li','',msg);
  }
  function dexPage(host){
    const head=el(host,'div','spirit-row'),search=el(head,'input');search.type='search';search.placeholder='精灵名或编号';search.value=query;search.setAttribute('aria-label','搜索精灵图鉴');
    const count=el(head,'span','spirit-count');
    const results=el(host,'div','spirit-list spirit-dex-results'),pager=el(host,'div','spirit-actions'),details=el(host,'div');
    function selectDex(){
      details.replaceChildren();const s=game.species(dexId);
      if(!s)return;
      const cols=el(details,'div','spirit-columns'),art=el(cols,'div'),info=el(cols,'div');
      if(SEER_SPIRIT_DATA.playable.includes(s.id)||SEER_SPIRIT_DATA.exhibits.includes(s.id)){
        figure(art,[{id:s.id,name:s.name}]);studio.show(stageJob.mount,stageJob.entries);
      }else{studio.hide();cols.style.gridTemplateColumns='1fr';art.remove();}
      el(info,'span','spirit-catalog-number',number(s.id)+'　'+types(s)+'　'+(s.owned?'已获得':s.seen?'已观察':'未发现'));el(info,'h3','spirit-name',s.name);
      const where=origins.get(s.id);
      el(info,'p','spirit-sub',where?[...where].join(' ／ '):'全星系图鉴记录 · 本期没有收录其出现地点');
      if(SPT_CHALLENGES.has(s.id))button(info,'查看 SPT 首领任务',()=>{chiefId=s.id;page='spt';render();},{action:s.id===47?'mushroom-spt':'shark-spt'});
      const row=SEER_SPIRIT_DATA.index.find(item=>item[0]===s.id);
      if(row?.[3]||row?.[4])el(info,'p','spirit-sub',[row[3]&&('身高 '+row[3]+' cm'),row[4]&&('体重 '+row[4]+' kg')].filter(Boolean).join('　'));
      const artLink=el(info,'a','spirit-source','查看原版头像');artLink.href='https://seerh5.61.com/resource/assets/pet/head/'+s.id+'.png';
      artLink.target='_blank';artLink.rel='noopener noreferrer';
      showStats(info,s.base);
      if(s.evolves){const evolved=game.species(s.evolves[1]);if(evolved)button(info,'Lv.'+s.evolves[0]+' → '+evolved.name,()=>{dexId=evolved.id;selectDex();});}
      button(info,'图鉴模拟交流',()=>chatWith(s,'dex'),{action:'chat'});
      const list=el(details,'details','spirit-dex-info');el(list,'summary','','等级技能表（'+s.skills.length+'）');
      for(const m of s.skills)el(list,'p','spirit-sub','Lv.'+m.level+'　'+m.name+'　'+m.type+'　'+(m.power||'—')+'　'+m.maxPP+' PP');
      if(s.extra?.length){el(list,'h3','','额外技能');for(const m of s.extra)el(list,'p','spirit-sub',m.name+'　'+m.type+'　'+(m.power||'—')+'　'+m.maxPP+' PP');}
    }
    function fill(resetSelection){
      const found=game.catalog(query,period,offset);count.textContent=found.total+' 种';results.replaceChildren();pager.replaceChildren();
      if(!found.entries.length){details.replaceChildren();studio.hide();el(results,'p','spirit-sub','没有符合的精灵。');return;}
      if(resetSelection||!dexId)dexId=found.entries[0].id;
      for(const s of found.entries)button(results,number(s.id)+' '+s.name,()=>{dexId=s.id;fill(false);},{selected:s.id===dexId});
      button(pager,'上一页',()=>{offset=Math.max(0,offset-period);fill(true);},{disabled:offset===0});
      el(pager,'small','spirit-sub',(1+Math.floor(offset/period))+' / '+Math.ceil(found.total/period));
      button(pager,'下一页',()=>{offset+=period;fill(true);},{disabled:offset+period>=found.total});
      selectDex();
    }
    search.addEventListener('input',()=>{query=search.value.trim();offset=0;fill(true);});fill(false);
  }
  function labPage(host,s){
    const where=siteId(),lab=where==='laboratory',forest=where==='forest';
    const materials=s.materials||{photo:0,air:0};
    const labStock=el(host,'section');el(labStock,'h3','','绿色元神珠');
    el(labStock,'p','spirit-sub','实验室融合 → 克洛斯星林间吸能 → NoNo 孵化黄金布布');
    el(labStock,'p','','光合能量 ×'+materials.photo+'　空气结晶 ×'+materials.air);
    if(s.bead){
      if(s.bead.phase==='fresh'){
        el(labStock,'p','','已有绿色元神珠。带它前往克洛斯星林间吸收能量。');
        button(labStock,'吸能并交给 NoNo 孵化',()=>act({type:'energize',site:where}),{disabled:!forest,action:'energize'});
      }else{
        const ready=Date.now()>=s.bead.readyAt;
        el(labStock,'p','',ready?'NoNo 已完成孵化。':'预计孵化时间　'+new Date(s.bead.readyAt).toLocaleString('zh-CN'));
        button(labStock,ready?'领取黄金布布':'查看孵化进度',()=>ready?act({type:'hatch'}):render(),{primary:ready,action:'hatch'});
      }
    }else{
      el(labStock,'p','','布布花与小豆芽家族成员融合。击败仙人球可得光合能量，击败皮皮可得空气结晶。');
      const owned=[...s.party,...s.storage],mains=owned.filter(p=>p.speciesId===3),sides=owned.filter(p=>[27,28,29].includes(p.speciesId));
      if(lab&&mains.length&&sides.length){
        const row=el(labStock,'div','spirit-row');
        function selectPartner(options,label){
          const select=el(row,'select');select.setAttribute('aria-label',label);
          for(const p of options)select.add(new Option(p.name+' Lv.'+p.level+' · '+p.uid,p.uid));return select;
        }
        const main=selectPartner(mains,'主融合精灵'),side=selectPartner(sides,'副融合精灵');
        const recipe=el(row,'select');recipe.setAttribute('aria-label','融合能源');
        recipe.add(new Option('4 光合能量','photo'));recipe.add(new Option('2 光合能量 + 2 空气结晶','mixed'));
        const confirmation=el(labStock,'div','spirit-row');confirmation.hidden=true;
        const label=el(confirmation,'span','spirit-sub');
        button(confirmation,'确认融合',()=>act({type:'fuse',mainUid:main.value,sideUid:side.value,recipe:recipe.value,site:siteId()}),{action:'fuse'});
        button(confirmation,'取消',()=>{confirmation.hidden=true;});
        function review(){label.textContent='将消耗 '+main.selectedOptions[0].text+' 和 '+side.selectedOptions[0].text+'，生成一颗绿色元神珠。';confirmation.hidden=false;}
        button(row,'核对融合伙伴',review);
        row.addEventListener('change',()=>{confirmation.hidden=true;});
      }else el(labStock,'p','spirit-sub',lab?'准备好布布花和一只小豆芽家族伙伴后可融合。':'前往赛尔号实验室操作融合转生舱。');
    }
    const plan=el(host,'section');el(plan,'h3','','实验室 · 克洛斯星收集计划');
    const required=[10,16,27],complete=required.every(id=>s.owned.includes(id));
    el(plan,'p','',required.map(id=>(s.owned.includes(id)?'✓ ':'○ ')+game.species(id).name).join('　'));
    if(s.collectionRewardClaimed){el(plan,'p','spirit-sub','已领取本期收集计划伙伴。');return;}
    el(plan,'p','spirit-sub','曾获得以上三种精灵，即可回实验室选择第二只初始伙伴。');
    if(lab&&complete){
      const choices=el(plan,'div','spirit-actions');
      for(const id of s.starters.filter(n=>!s.owned.includes(n)))button(choices,'领取'+game.species(id).name,
        ()=>act({type:'collectionReward',speciesId:id,site:siteId()}),{action:'collectionReward'});
    }
  }
  function applyFollower(saved){
    const following=saved?.party?.find(p=>p.uid===saved.followerUid);
    setFollower(following?.speciesId||null);
    const state=game.view();
    setFlameTool(state.flameTool);
    setSafari(state.safari);
  }
  async function replaceCollection(raw){
    if(busy||!recordReady)throw new Error('当前存档正在写入。');
    busy=true;const prior=game.snapshot();
    try{
      game.restore(raw);
      const saved=game.snapshot(),committed=await records.commit(revision,saved);
      if(!committed.ok){
        revision=committed.record.revision;game.restore(committed.record.data);applyFollower(committed.record.data);
        report('另一窗口已修改存档，请再次核对导入。');return false;
      }
      revision=committed.record.revision;applyFollower(saved);selection=null;
      page='party';report('已导入精灵存档。');return true;
    }catch(error){game.restore(prior);throw error;}
    finally{busy=false;if(active)render();}
  }
  async function refreshFollower(){
    const ticket=generation;
    try{const stored=await records.read();if(ticket===generation&&!busy&&!active){game.restore(stored?.data);applyFollower(stored?.data);}}
    catch{/* Opening the terminal reports storage failures in context. */}
  }
  function observe(wild){
    if(!wild||active||busy)return;
    // Keep a subsequent contact behind its sighting write without dropping
    // the player's click or blocking the opening of the field terminal.
    sightWrites=sightWrites.then(async()=>{
      const record=await records.read();game.restore(record.data);
      if(!game.view().seen.includes(wild.speciesId)){
        game.act({type:'observe',speciesId:wild.speciesId});
        const result=await records.commit(record.revision,game.snapshot());
        if(!result.ok&&result.record)game.restore(result.record.data);
      }
    }).catch(()=>{/* Looking at the animal remains available offline. */});
  }
  function render(){
    if(!active)return;
    clearTimeout(huntTimer);
    const state=game.view();tabs.replaceChildren();content.replaceChildren();stageJob=null;
    const battle=!!state.battle;tabs.hidden=battle;
    if(!battle)for(const [key,label] of Object.entries(sections)){
      if(key==='field'&&!encounter)continue;
      if(key==='safari'&&page!=='safari'&&siteId()!=='wetland'&&!state.safari?.active)continue;
      button(tabs,key==='party'?label+' '+state.party.length+'/6':label,()=>{page=key;report('');render();},{selected:page===key,action:key});
    }
    title.textContent=battle?(state.battle.kind==='boss'?'SPT 首领挑战':'精灵对战')+' · 第 '+state.battle.turn+' 回合':({party:'精灵背包',storage:'精灵仓库',dex:'精灵图鉴',spt:'赛尔先锋队 · 首领任务',field:'野外接触',lab:'融合与培育',safari:'克洛斯湿地捕猎场'})[page];
    const host=el(content,'div','spirit-page');
    if(!battle&&page==='party'&&state.party.length&&!state.starterClaimed){
      const initial=el(host,'details');
      el(initial,'summary','','领取初始伙伴');
      for(const id of state.starters)button(initial,'领取'+game.species(id).name,()=>act({type:'starter',speciesId:id}),{action:'starter'});
    }
    if(battle)battlePage(host,state);
    else if(page==='field'&&encounter)fieldPage(host,state);
    else if(page==='dex')dexPage(host);
    else if(page==='spt')sptMission(host,state);
    else if(page==='lab')labPage(host,state);
    else if(page==='safari'){
      renderWetlandCapture(host,state,{el,button,figure,act,chatWith,siteId:()=>atFieldGate?'wetland':siteId()});
      function tick(){
        if(!active||page!=='safari')return;
        const counter=host.querySelector('[data-safari-deadline]');
        if(!counter)return;
        const end=Number(counter.dataset.safariDeadline);
        if(Date.now()>=end){applyFollower(game.snapshot());render();return;}
        counter.textContent=safariRemaining(end);huntTimer=setTimeout(tick,1000);
      }
      if(state.safari?.active)huntTimer=setTimeout(tick,1000);
    }
    else memberPage(host,state,page==='storage');
    if(battle||page==='storage')renderSpiritTransfer(host,{getSnapshot:game.snapshot,importSnapshot:replaceCollection,report});
    if(page!=='dex'||battle){
      if(stageJob)studio.show(stageJob.mount,stageJob.entries);else studio.hide();
    }
  }
  async function open(wild,trigger,activity=null){
    if(busy)return;
    if(active){close();return;}
    const turn=++generation;active=true;opener=trigger||canvas;encounter=wild||null;page=activity?.op==='spt'?'spt':activity?'safari':wild?'field':'party';
    chiefId=OCEAN_HABITATS[siteId()]?34:47;
    atFieldGate=activity?.op==='enter'&&activity.destination==='wetland';
    overlay.hidden=false;stage.dataset.consoleOpen='spirits';recordReady=false;
    tabs.replaceChildren();content.replaceChildren();report('正在读取精灵背包…');dismiss.focus({preventScroll:true});
    try{
      await sightWrites;if(turn!==generation)return;
      const record=await records.read();
      if(turn!==generation)return;
      game.restore(record?.data);applyFollower(record?.data);
      revision=record?.revision||0;recordReady=true;report('');
      if(activity?.op==='spt')render();
      else if(game.view().safari?.encounter&&(activity||wild?.kind==='safari')){page='safari';render();}
      else if(activity&&!['enter','menu','resume'].includes(activity.op))await act({type:'safari',op:activity.op,speciesId:activity.speciesId,site:siteId()});
      else if(wild&&!game.view().seen.includes(wild.speciesId))await act({type:'observe',speciesId:wild.speciesId});
      else render();
    }catch(error){if(turn===generation)report('无法读取精灵存档。'+error.message);}
    requestFrame();
  }
  function close(focus=true){
    if(!active||busy)return;
    active=false;generation++;clearTimeout(huntTimer);overlay.hidden=true;studio.hide();encounter=null;
    if(stage.dataset.consoleOpen==='spirits')delete stage.dataset.consoleOpen;
    if(focus)(opener?.getClientRects().length?opener:canvas).focus({preventScroll:true});requestFrame();
  }
  dismiss.addEventListener('click',()=>close());
  overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
  panel.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!e.isComposing){e.preventDefault();e.stopPropagation();close();return;}
    cycleDialogFocus(e,panel);
  });
  return {open,close,observe,refreshFollower,get active(){return active;},dispose(){clearTimeout(huntTimer);studio.dispose();}};
}
