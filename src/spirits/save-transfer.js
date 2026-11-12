// Both the portable HTML and the loopback browser exchange only the rules
// engine snapshot. Their storage revisions belong to their own origins.
function readSpiritTransfer(raw){
  const reject=message=>{throw new Error(message);};
  const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const uint=(n,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
  if(!object(raw)||raw.version!==1)reject('无法识别这个版本的精灵存档。');
  if(!Array.isArray(raw.party)||raw.party.length>6||!Array.isArray(raw.storage))reject('队伍或仓库格式有误。');
  if(!raw.party.length&&raw.storage.length)reject('有仓库存放记录，但缺少当前队伍。');
  if(!uint(raw.nextId)||raw.nextId<1||!uint(raw.capsules,9999)||!uint(raw.potions,9999))reject('个体序号或补给数量有误。');
  const playable=new Set(SEER_SPIRIT_DATA.playable),known=new Set(SEER_SPIRIT_DATA.index.map(row=>row[0]));
  includeSpiritEvolutionForms(playable);
  const uids=new Set(),partyIds=new Set(raw.party.map(p=>p?.uid));
  function pet(p,temporaryUid=null){
    if(!object(p)||!playable.has(p.speciesId))reject('此版本无法读取伙伴编号 '+String(p?.speciesId??'空')+'。');
    if(temporaryUid?p.uid!==temporaryUid:typeof p.uid!=='string'||!/^p[1-9]\d{0,8}$/.test(p.uid)||uids.has(p.uid))
      reject('精灵个体编号缺失或重复。');
    if(!temporaryUid){
      uids.add(p.uid);
      if(Number(p.uid.slice(1))>=raw.nextId)reject('下一个个体编号会与已有记录冲突。');
    }
    if(!uint(p.level,100)||!p.level||!uint(p.iv,31)||!uint(p.nature,SEER_SPIRIT_DATA.natures.length-1)||
       !uint(p.xp)||!uint(p.hp)||!Array.isArray(p.ev)||p.ev.length!==6||
       !p.ev.every(n=>uint(n,255))||p.ev.reduce((a,b)=>a+b,0)>510)reject('伙伴的等级、体力或养成记录有误。');
    if(!Array.isArray(p.moves)||p.moves.length>4)reject('伙伴的技能槽有误。');
    if(p.inheritedMoves!==undefined&&(!Array.isArray(p.inheritedMoves)||
       new Set(p.inheritedMoves).size!==p.inheritedMoves.length||
       !p.inheritedMoves.every(id=>uint(id)&&Object.hasOwn(SEER_SPIRIT_DATA.moves,id))))reject('进化继承技能记录有误。');
    const moves=new Set();
    for(const slot of p.moves){
      if(!Array.isArray(slot)||slot.length!==2||!uint(slot[0])||!Object.hasOwn(SEER_SPIRIT_DATA.moves,slot[0])||
        moves.has(slot[0])||!uint(slot[1],SEER_SPIRIT_DATA.moves[slot[0]][4]))reject('伙伴的技能或剩余 PP 有误。');
      moves.add(slot[0]);
    }
    if(p.reservePP!==undefined){
      if(!object(p.reservePP))reject('未装配技能的 PP 记录有误。');
      for(const [key,pp] of Object.entries(p.reservePP)){
        const id=Number(key),row=SEER_SPIRIT_DATA.moves[id];
        if(!uint(id)||String(id)!==key||!row||moves.has(id)||!uint(pp,row[4]))reject('未装配技能的 PP 记录有误。');
      }
    }
  }
  for(const p of [...raw.party,...raw.storage])pet(p);
  if(raw.followerUid!=null&&!partyIds.has(raw.followerUid))reject('随行精灵不在当前队伍中。');
  for(const field of ['seen','owned','bosses']){
    const ids=raw[field];
    if(!Array.isArray(ids)||new Set(ids).size!==ids.length||!ids.every(id=>known.has(id)))
      reject('存档含不在此版本图鉴中的编号，或图鉴记录不完整。');
  }
  const seen=new Set(raw.seen),owned=new Set(raw.owned);
  if(raw.owned.some(id=>!seen.has(id))||[...raw.party,...raw.storage].some(p=>!owned.has(p.speciesId)))
    reject('持有的伙伴与图鉴收藏记录不一致。');
  if(raw.materials!==undefined&&(!object(raw.materials)||!uint(raw.materials.photo)||!uint(raw.materials.air)))reject('融合材料数量有误。');
  if(raw.materials?.water!==undefined&&!uint(raw.materials.water))reject('水之精华数量有误。');
  if(raw.materials?.blackCrystal!==undefined&&!uint(raw.materials.blackCrystal,raw.bosses.includes(34)?SPT_CHALLENGES.get(34).blackCrystal:0))reject('钢牙鲨的黑晶矿数量有误。');
  if(raw.bead!=null&&(!object(raw.bead)||!(raw.bead.phase==='fresh'&&raw.bead.readyAt===null||
      raw.bead.phase==='incubating'&&uint(raw.bead.readyAt)&&raw.bead.readyAt>0)))reject('元神珠的孵化记录有误。');
  if(raw.collectionRewardClaimed!==undefined&&typeof raw.collectionRewardClaimed!=='boolean')reject('图鉴奖励记录有误。');
  if(raw.starterClaimed!==undefined&&typeof raw.starterClaimed!=='boolean')reject('初始伙伴领取记录有误。');
  const defeatedMushroom=raw.bosses.includes(47);
  if(raw.flameTool!==undefined&&typeof raw.flameTool!=='boolean')reject('火焰喷射器记录有误。');
  if(raw.flameTool===false&&(defeatedMushroom||raw.battle?.enemy?.speciesId===47))reject('此首领进度缺少已装备的火焰喷射器。');
  if(raw.bankedXP!==undefined&&!uint(raw.bankedXP))reject('积累经验余额有误。');
  const safari=raw.safari;
  if(safari!==undefined){
    if(!object(safari)||!uint(safari.endsAt)||safari.endsAt>Date.now()+15*60*1000||
       !uint(safari.balls,20)||!uint(safari.crystals,9999)||typeof safari.rod!=='boolean'||!object(safari.fieldRest))
      reject('捕猎场的倒计时、专用胶囊、晶石或钓竿记录有误。');
    const pools=SEER_SPIRIT_DATA.safari;
    if(!Object.entries(safari.fieldRest).every(([id,t])=>String(Number(id))===id&&pools.field.includes(Number(id))&&uint(t)&&t>0&&t<=safari.endsAt))
      reject('捕猎场的野生精灵离开时间有误。');
    if(safari.encounter!==null){
      const e=safari.encounter;
      if(!object(e)||!Object.hasOwn(pools,e.method)||!pools[e.method].includes(e.pet?.speciesId)||
         !uint(e.turn,99999)||!e.turn||!Number.isInteger(e.temper)||Math.abs(e.temper)>2||!safari.balls||!safari.endsAt||
         !seen.has(e.pet.speciesId)||e.method==='fish'&&!safari.rod||raw.battle&&safari.endsAt>Date.now())
        reject('未结束的捕猎缺少有效的场地、精灵或回合记录。');
      pet(e.pet,'safari');
    }
    if(!safari.endsAt&&safari.balls)reject('未入场的记录含有未清空的捕猎场专用胶囊。');
  }
  if(!Array.isArray(raw.log)||!raw.log.every(s=>typeof s==='string')||!object(raw.recent)||
    !Object.entries(raw.recent).every(([key,t])=>key.length>0&&key.length<=120&&!Object.hasOwn(Object.prototype,key)&&uint(t)))
    reject('战斗日志或野外遭遇记录有误。');
  if(raw.battle!==null){
    const b=raw.battle;
    if(!object(b)||!['wild','rare','boss'].includes(b.kind)||!partyIds.has(b.activeUid)||!Array.isArray(b.participants)||!b.participants.includes(b.activeUid)||
       !b.participants.every(id=>partyIds.has(id))||!object(b.conditions)||typeof b.encounterKey!=='string'||
       !b.encounterKey.length||b.encounterKey.length>120||typeof b.area!=='string'||!uint(b.turn,999999)||!b.turn)
      reject('未结束的战斗缺少有效的出战个体或回合记录。');
    pet(b.enemy,'wild');
    for(const [uid,status] of Object.entries(b.conditions)){
      if((uid!=='wild'&&!partyIds.has(uid))||!object(status)||!Array.isArray(status.stages)||status.stages.length!==6||
         !status.stages.every(s=>Number.isInteger(s)&&Math.abs(s)<=6))reject('战斗中的能力等级有误。');
      if(status.typeTurns!==undefined&&(!uint(status.typeTurns,999)||
         status.typeTurns>0&&(!uint(status.typeId)||!Object.hasOwn(SEER_SPIRIT_DATA.types,status.typeId))))
        reject('战斗中的临时属性记录有误。');
    }
  }
  const clean=createSpiritSystem(raw).snapshot();
  // Older fields may have acquired defaults. A coercion that changes a pet
  // or abandons a battle would lose progress and must not replace the save.
  function samePet(a,b){
    return !!b&&['uid','speciesId','level','xp','iv','nature','hp'].every(k=>a[k]===b[k])&&
      JSON.stringify(a.moves)===JSON.stringify(b.moves)&&a.ev.every((n,i)=>n===b.ev[i])&&
      (a.inheritedMoves||[]).every(id=>b.inheritedMoves?.includes(id))&&
      Object.entries(a.reservePP||{}).every(([id,pp])=>(b.reservePP?.[id]??SEER_SPIRIT_DATA.moves[id][4])===pp);
  }
  if(!raw.party.every((p,i)=>samePet(p,clean.party[i]))||!raw.storage.every((p,i)=>samePet(p,clean.storage[i]))||
     (raw.battle&&(!samePet(raw.battle.enemy,clean.battle?.enemy)||raw.battle.kind!==clean.battle.kind))||
     raw.bosses.some(id=>!clean.bosses.includes(id)))
    reject('有伙伴、首领或对战数据无法完整还原，当前进度已保留。');
  if(raw.bankedXP!==undefined&&raw.bankedXP!==clean.bankedXP)
    reject('积累经验无法完整还原，当前进度已保留。');
  if(safari){
    const current=clean.safari,e=safari.encounter;
    if(safari.endsAt!==current.endsAt||safari.rod!==current.rod||safari.crystals!==current.crystals||
       (safari.endsAt>Date.now()&&(safari.balls!==current.balls||
          (e&&(!samePet(e.pet,current.encounter?.pet)||current.encounter.method!==e.method||
            current.encounter.turn!==e.turn||current.encounter.temper!==e.temper)))))
      reject('捕猎场进度无法完整还原，当前进度已保留。');
  }
  return clean;
}

function renderSpiritTransfer(host,{getSnapshot,importSnapshot,report}){
  function append(parent,tag,text){
    const node=document.createElement(tag);node.textContent=text||'';parent.append(node);return node;
  }
  const fold=append(host,'details');fold.dataset.spiritTransfer='';
  append(fold,'summary','精灵存档');
  const actions=append(fold,'div');actions.className='spirit-actions';
  const saveButton=append(actions,'button','导出 JSON'),pickButton=append(actions,'button','选择存档文件');
  const file=append(fold,'input');file.type='file';file.accept='.json,application/json';file.hidden=true;
  const preview=append(fold,'p');preview.className='spirit-sub';preview.setAttribute('aria-live','polite');
  const confirmRow=append(fold,'div');confirmRow.className='spirit-actions';confirmRow.hidden=true;
  const confirm=append(confirmRow,'button','确认替换当前精灵存档'),cancel=append(confirmRow,'button','取消');
  for(const b of [saveButton,pickButton,confirm,cancel])b.type='button';
  let pending=null,sequence=0;
  const format='seer-spirit-save';
  function reset(){
    sequence++;pending=null;file.value='';preview.textContent='';confirmRow.hidden=true;
  }
  saveButton.addEventListener('click',()=>{
    try{
      const save=readSpiritTransfer(getSnapshot());
      const json=JSON.stringify({format,version:1,save},null,2);
      const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));
      const link=append(fold,'a');link.href=url;link.download='seer-spirits-'+new Date().toISOString().slice(0,10)+'.json';
      link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
      report('已请求下载精灵存档。在另一入口选择此 JSON 即可导入。');
    }catch(error){report(error.message);}
  });
  pickButton.addEventListener('click',()=>{reset();file.click();});
  file.addEventListener('change',async()=>{
    const chosen=file.files?.[0],ticket=++sequence;
    pending=null;confirmRow.hidden=true;preview.textContent='';if(!chosen)return;
    try{
      let data;
      try{data=JSON.parse((await chosen.text()).replace(/^\uFEFF/,''));}
      catch{throw new Error('这个文件不是可读取的 JSON 存档。');}
      if(data?.format!==format||data.version!==1)throw new Error('请选择从「精灵存档」导出的版本 1 文件。');
      const save=readSpiritTransfer(data.save);
      if(ticket!==sequence||!fold.isConnected)return;
      const names=new Map(SEER_SPIRIT_DATA.index.map(row=>[row[0],row[1]]));
      const members=save.party.map(p=>names.get(p.speciesId)+' Lv.'+p.level).join('、');
      preview.textContent='将导入队伍 '+save.party.length+' 只'+(members?'（'+members+'）':'')+
        '，仓库 '+save.storage.length+' 只，已见 '+save.seen.length+' 种，积累经验 '+save.bankedXP+
        (save.bosses.length?'，已完成首胜 '+save.bosses.map(id=>names.get(id)).join('、'):'')+
        (save.battle?'，对战第 '+save.battle.turn+' 回合':'')+
        (save.safari.endsAt>Date.now()?'，捕猎场'+safariRemaining(save.safari.endsAt)+'，专用胶囊 '+save.safari.balls+
          (save.safari.encounter?'，正在接触'+names.get(save.safari.encounter.pet.speciesId):''):'')+'。';
      pending=save;confirmRow.hidden=false;
    }catch(error){if(ticket===sequence&&fold.isConnected){preview.textContent=error.message;report(error.message);}}
  });
  cancel.addEventListener('click',reset);
  confirm.addEventListener('click',async()=>{
    if(!pending||confirm.disabled)return;
    for(const b of [confirm,cancel,pickButton,saveButton])b.disabled=true;
    try{
      const result=await importSnapshot(pending);
      if(result===false||result?.ok===false)throw new Error(result?.message||'存档未能写入，请重新选择文件。');
      reset();report('精灵存档已导入。');
    }catch(error){report(error.message);}
    finally{for(const b of [confirm,cancel,pickButton,saveButton])b.disabled=false;}
  });
}
