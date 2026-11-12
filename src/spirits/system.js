// The assembler injects the same factual catalog used by the local dialogue server.
function includeSpiritEvolutionForms(playable,data=SEER_SPIRIT_DATA){
  // Set iteration also visits newly added descendants, including in a region
  // supplied by another build of the simulator (for example Yoyo on Alpha).
  for(const id of playable){
    const next=data.species[id]?.evolves?.[1];
    if(next&&data.species[next])playable.add(next);
    for(const route of data.evolutionBranches?.[id]||[]){
      if(route.method==='chamber'&&route.level>0&&data.species[route.target])playable.add(route.target);
    }
  }
  return playable;
}
function createSpiritSystem(saved){
  const data=SEER_SPIRIT_DATA;
  const roster=new Set(data.playable),starters=[1,4,7];
  includeSpiritEvolutionForms(roster,data);
  const wild=new Set([10,16,27,30,33,34,47,83,108,164,442,4694,...TWIN_ENCOUNTERS.keys(),...SPT_CHALLENGES.keys()]);
  const index=new Map(data.index.map(row=>[row[0],row]));
  const formsFrom=new Map(),formsTo=new Map();
  function linkForm(source,route){
    if(!index.has(source)||!index.has(route.target))return;
    if(!formsFrom.has(source))formsFrom.set(source,[]);
    if(!formsTo.has(route.target))formsTo.set(route.target,[]);
    formsFrom.get(source).push(route);
    formsTo.get(route.target).push({source,route});
  }
  for(const [id,def] of Object.entries(data.species)){
    if(def.evolves)linkForm(Number(id),{target:def.evolves[1],level:def.evolves[0],method:'level'});
  }
  for(const [id,routes] of Object.entries(data.evolutionBranches||{})){
    for(const route of routes)linkForm(Number(id),route);
  }
  const evolutionStock={400004:'air',400005:'photo',400006:'water'};
  const statKeys=['attack','defense','spAttack','spDefense','speed'];
  const category={1:'物理',2:'特殊',4:'属性'};
  const statuses=SPIRIT_STATUS_NAME;
  const faintStatuses=['fear','sleep','tired','paralysis','stone'];
  let state;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const integer=(value,min,max,fallback=min)=>Number.isFinite(value)?clamp(Math.floor(value),min,max):fallback;
  const rand=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
  const dice=p=>Math.random()*100<p;
  const copy=value=>JSON.parse(JSON.stringify(value));
  const elements=id=>(data.types[id]||'未知').split(/\s+/);
  const monName=id=>index.get(id)?.[1]||'未知精灵';
  const label=pet=>monName(pet.speciesId);
  const fresh=()=>({version:1,nextId:1,followerUid:null,party:[],storage:[],seen:[],owned:[],bosses:[],recent:{},
    capsules:10,potions:5,materials:{photo:0,air:0,water:0,blackCrystal:0},bead:null,starterClaimed:false,collectionRewardClaimed:false,
    flameTool:false,bankedXP:0,battle:null,log:[],safari:safari.blank()});
  const addLog=message=>{state.log.push(message);if(state.log.length>12)state.log.shift();};
  const done=(message,outcome)=>{addLog(message);return {ok:true,message,outcome};};
  const fail=message=>({ok:false,message});
  const remember=(list,id)=>{if(!list.includes(id))list.push(id);};
  const findPet=uid=>state.party.find(p=>p.uid===uid)||state.storage.find(p=>p.uid===uid);
  const active=()=>state.party.find(p=>p.uid===state.battle?.activeUid);
  const markOwned=pet=>{remember(state.seen,pet.speciesId);remember(state.owned,pet.speciesId);};
  const safari=createSafariRules({data,makePet,readPet,petView,receive,markSeen:id=>remember(state.seen,id),done,fail});
  const xpGoal=level=>level<100?Math.floor(7+1.4*level*level):0;
  const encounterXP=foe=>Math.max(1,Math.floor((data.species[foe.speciesId].yield||56)*foe.level/7));
  function bankExperience(amount){
    const granted=Math.min(amount,Number.MAX_SAFE_INTEGER-state.bankedXP);
    state.bankedXP+=granted;return granted;
  }
  function costToLevel(p,target){
    if(target<=p.level)return 0;
    let cost=-p.xp;for(let level=p.level;level<Math.min(100,target);level++)cost+=xpGoal(level);
    return Math.max(0,cost);
  }
  function evolutionOptions(id,pet){
    return (formsFrom.get(id)||[]).map(r=>{
      const stock=evolutionStock[r.item],count=r.count||0;
      const ownedCount=stock?state.materials[stock]||0:0;
      const supported=!!r.level&&r.method!=='special'&&roster.has(id)&&roster.has(r.target)&&(!r.item||!!stock);
      return {targetId:r.target,targetName:monName(r.target),method:r.method,level:r.level||0,
        itemId:r.item||0,itemName:r.item?(data.evolutionItems?.[r.item]||'道具 #'+r.item):'',count,ownedCount,
        supported,ready:!!pet&&supported&&pet.level>=r.level&&ownedCount>=count};
    });
  }
  function moveInfo(id){
    const r=data.moves[id];
    if(!r)return {id,name:'待核技能 #'+id,type:'未知',category:'待核',power:null,maxPP:null,accuracy:null,available:false,effectText:'尚未取得技能数据',partial:true};
    return {id,name:r[0],category:category[r[1]]||'其他',type:elements(r[2]).join('·'),power:r[3],maxPP:r[4],
      accuracy:r[5],priority:r[6]||0,mustHit:!!r[7],critChance:spiritCriticalChance(r),available:true,...spiritEffectSummary(r,data.types)};
  }
  function species(id,details=true){
    id=Number(id);const row=index.get(id);if(!row)return null;
    const def=data.species[id];
    const entry={id,name:row[1],types:elements(row[2]),heightCm:row[3]??null,weightKg:row[4]??null,base:def?.base||[],evolves:def?.evolves||null,
      seen:state.seen.includes(id),owned:state.owned.includes(id),playable:roster.has(id),canCapture:!!def?.catch};
    if(details&&def){
      entry.previousForms=(formsTo.get(id)||[]).map(({source})=>({id:source,name:monName(source)}));
      entry.evolutionRoutes=evolutionOptions(id);
      entry.skills=def.skills.map(([level,m])=>({level,...moveInfo(m)}));
      entry.extra=(def.extra||[]).map(([level,m])=>({level,...moveInfo(m)}));
    }
    return entry;
  }
  function catalog(query='',limit=60,offset=0){
    const q=String(query).trim().replace(/^#/,'').toLowerCase(),numeric=/^\d+$/.test(q);
    let results=data.index;
    if(q)results=results.filter(([id,name,t])=>numeric?id===Number(q):name.toLowerCase().includes(q)||elements(t).some(v=>v.includes(q)));
    const start=integer(offset,0,results.length);
    return {total:results.length,entries:results.slice(start,start+integer(limit,1,200,60)).map(r=>species(r[0],false))};
  }
  function stats(p){
    const nature=data.natures[p.nature],st=data.species[p.speciesId].base;
    return st.map((base,i)=>{
      if(i===0&&p.uid==='wild'&&SPT_CHALLENGES.has(p.speciesId))return SPT_CHALLENGES.get(p.speciesId).hp;
      const value=Math.floor((base*2+p.iv+Math.floor(p.ev[i]/4))*p.level/100);
      return i?Math.floor((value+5)*nature[i]):value+10+p.level;
    });
  }
  function levelMoves(id,level){
    return data.species[id].skills.filter(([lv,m])=>lv<=level&&data.moves[m]).map(row=>row[1]);
  }
  function potential(p){
    return [...new Set([...(p.inheritedMoves||[]),...levelMoves(p.speciesId,p.level)])];
  }
  // A small, explainable default: a main attack, different attack coverage and
  // one useful support skill. This is a suggestion; manual loadouts stay intact.
  function recommendedMoveIds(p){
    const values=stats(p),native=elements(index.get(p.speciesId)[2]),pool=potential(p);
    const scores=new Map(pool.map(id=>{
      const row=data.moves[id],fx=decodeSpiritEffects(row).filter(f=>f.args!==null);
      if(row[1]===4){
        let score=0;
        for(const {code,args:[x,y,z]} of fx){
          if(code===43)score=Math.max(score,80/Math.max(1,x));
          if(code===4&&z>0)score+=z*([0,2].includes(x)?(x===0?values[1]:values[3])/Math.max(values[1],values[3])*18:8);
          if([10,15,16].includes(code))score=Math.max(score,24*x/100);
          if(code===5&&z<0)score+=Math.abs(z)*8;
          if([33,47,48,55,56].includes(code))score=Math.max(score,18);
          if(code===20)score-=10;
        }
        return [id,score*(row[7]?1:row[5]/100)];
      }
      let power=row[3],repeat=1;
      for(const {code,args:[x,y]} of fx){
        if(code===31)repeat=(x+y)/2;
        if(code===6)power*=.8;
        if(code===34||code===7)power=Math.max(power,25);
      }
      const same=elements(row[2]).every(t=>native.includes(t))?1.5:1;
      return [id,power*repeat*same*(row[1]===1?values[1]:values[3])*(row[7]?1:row[5]/100)];
    }));
    const byScore=(a,b)=>scores.get(b)-scores.get(a)||b-a;
    const attacks=pool.filter(id=>data.moves[id][1]!==4).sort(byScore);
    const support=pool.filter(id=>data.moves[id][1]===4&&scores.get(id)>0).sort(byScore);
    const selected=[];
    const add=id=>{if(id!==undefined&&!selected.includes(id)&&selected.length<4)selected.push(id);};
    add(attacks[0]);
    const primary=data.moves[attacks[0]];
    add(attacks.find(id=>data.moves[id][2]!==primary?.[2]));
    add(support[0]);
    for(const id of attacks)add(id);
    for(const id of support)add(id);
    for(const id of pool)add(id);
    return selected;
  }
  function trainingView(p){
    const routes=evolutionOptions(p.speciesId,p).filter(r=>r.supported).sort((a,b)=>a.level-b.level);
    const next=routes[0],recommended=recommendedMoveIds(p),values=stats(p);
    return {nextLevelCost:costToLevel(p,p.level+1),fiveLevelsCost:costToLevel(p,p.level+5),maxLevelCost:costToLevel(p,100),
      evolutionCost:next?costToLevel(p,next.level):null,evolutionTarget:next?.targetName||null,evolutionLevel:next?.level||null,
      recommendedMoves:recommended.map(id=>({...moveInfo(id),pp:p.moves.find(m=>m[0]===id)?.[1]??reserveMovePP(p,id)})),
      recommendationChanged:recommended.length!==p.moves.length||recommended.some((id,i)=>p.moves[i]?.[0]!==id),
      focus:values[1]>=values[3]?'物攻':'特攻'};
  }
  // Limit migrated moves to real ancestors and a reachable evolution level.
  // Branch siblings, activity forms and unearned future moves cannot contribute.
  function inheritedCandidates(id,level){
    const visited=new Set([id]),moves=new Set(),queue=[id];
    while(queue.length){
      for(const {source,route} of formsTo.get(queue.pop())||[]){
        if(visited.has(source)||route.method==='special'||!route.level||route.level>level)continue;
        visited.add(source);queue.push(source);
        for(const move of levelMoves(source,level))moves.add(move);
      }
    }
    return moves;
  }
  function makePet(id,level,uid){
    const p={uid,speciesId:id,level,xp:0,iv:rand(0,31),nature:rand(0,data.natures.length-1),ev:[0,0,0,0,0,0],hp:0,moves:[]};
    p.moves=recommendedMoveIds(p).map(id=>[id,data.moves[id][4]]);p.hp=stats(p)[0];return p;
  }
  function petView(p){
    const values=stats(p),flags=state.battle?.conditions[p.uid],equipped=new Set(p.moves.map(m=>m[0]));
    return {uid:p.uid,speciesId:p.speciesId,name:label(p),types:elements(battleType(p)),level:p.level,
      iv:p.iv,ev:[...p.ev],nature:data.natures[p.nature][0],hp:p.hp,maxHP:values[0],xp:p.xp,nextXP:xpGoal(p.level),
      stats:Object.fromEntries(statKeys.map((k,i)=>[k,values[i+1]])),
      evolutionRoutes:evolutionOptions(p.speciesId,p),training:trainingView(p),
      moves:p.moves.map(([id,pp])=>({...moveInfo(id),pp})),learnable:potential(p).filter(id=>!equipped.has(id)).map(id=>({...moveInfo(id),pp:reserveMovePP(p,id)})),
      status:statuses[flags?.status]||''};
  }
  function view(){
    const b=state.battle;
    return {party:state.party.map(petView),storage:state.storage.map(petView),followerUid:state.followerUid,capsules:state.capsules,potions:state.potions,
      starters:[...starters],seen:[...state.seen],owned:[...state.owned],log:[...state.log],
      materials:{...state.materials},bead:state.bead?{...state.bead}:null,starterClaimed:state.starterClaimed,collectionRewardClaimed:state.collectionRewardClaimed,
      flameTool:state.flameTool,bosses:[...state.bosses],defeatedMushroom:state.bosses.includes(47),defeatedShark:state.bosses.includes(34),bankedXP:state.bankedXP,
      safari:safari.view(state.safari),
      battle:b?{enemy:petView(b.enemy),activeUid:b.activeUid,encounterKey:b.encounterKey,kind:b.kind,turn:b.turn,
        needsSwitch:active()?.hp===0,area:b.area,canCapture:b.kind!=='boss'&&!!data.species[b.enemy.speciesId].catch,canStruggle:active()?.hp>0&&active().moves.every(m=>!m[1])}:null};
  }
  function receive(p){
    p.uid='p'+state.nextId++;const party=state.party.length<6;
    (party?state.party:state.storage).push(p);markOwned(p);return party?'随行队伍':'精灵仓库';
  }
  function grantXP(p,foe){
    if(!p.hp)return;
    const beforeHp=stats(p)[0],kind=data.species[foe.speciesId];
    let budget=510-p.ev.reduce((a,b)=>a+b,0);
    for(let i=0;i<6;i++){
      const earned=Math.min(budget,255-p.ev[i],kind.ev[i]||0);
      p.ev[i]+=earned;budget-=earned;
    }
    const earned=encounterXP(foe);
    if(p.level<100)addLog(label(p)+' 获得 '+earned+' 经验。');
    gainExperience(p,earned,beforeHp);
  }
  function gainExperience(p,amount,beforeHp){
    p.xp+=amount;
    while(p.level<100&&p.xp>=xpGoal(p.level)){
      const known=new Set(potential(p));p.xp-=xpGoal(p.level);p.level++;
      addLog(label(p)+' 升到 '+p.level+' 级。');
      catchUpLevelForms(p);
      learnNewMoves(p,known);
    }
    const unused=p.level===100?p.xp:0;
    if(p.level===100)p.xp=0;
    const maximum=stats(p)[0];
    if(p.hp)p.hp=clamp(p.hp+maximum-beforeHp,1,maximum);
    return amount-unused;
  }
  function learnNewMoves(p,known){
    for(const id of potential(p)){
      if(known.has(id)||p.moves.some(m=>m[0]===id))continue;
      if(p.moves.length<4){
        p.moves.push([id,data.moves[id][4]]);
        addLog(label(p)+' 已装配 '+data.moves[id][0]+'。');
      }else addLog(label(p)+' 可在配招中学习 '+data.moves[id][0]+'。');
    }
  }
  function changeForm(p,target){
    const from=label(p),known=potential(p);
    const targetMoves=new Set(levelMoves(target,p.level));
    const inherited=known.filter(id=>!targetMoves.has(id));
    if(inherited.length)p.inheritedMoves=inherited;
    else delete p.inheritedMoves;
    p.speciesId=target;
    markOwned(p);
    addLog(from+' 进化为 '+label(p)+'。');
  }
  function catchUpLevelForms(p){
    const visited=new Set([p.speciesId]);
    for(;;){
      const route=evolutionOptions(p.speciesId,p).find(r=>r.method==='level'&&r.ready);
      if(!route||visited.has(route.targetId))return;
      visited.add(route.targetId);
      changeForm(p,route.targetId);
    }
  }
  function evolve(p,action){
    const route=evolutionOptions(p.speciesId,p).find(r=>r.targetId===Number(action.targetId));
    if(!route||!route.supported)return fail('这个形态当前没有可使用的进化途径。');
    if(route.method==='chamber'&&action.site!=='laboratory')return fail('请前往赛尔号实验室使用精灵进化舱。');
    if(p.level<route.level)return fail('至少需要 '+route.level+' 级才能进化。');
    if(route.ownedCount<route.count)return fail('还需要 '+(route.count-route.ownedCount)+' 份'+route.itemName+'。');
    const maxBefore=stats(p)[0],known=new Set(potential(p)),from=label(p);
    if(route.count)state.materials[evolutionStock[route.itemId]]-=route.count;
    changeForm(p,route.targetId);
    catchUpLevelForms(p);
    const maxAfter=stats(p)[0];
    if(p.hp)p.hp=clamp(p.hp+maxAfter-maxBefore,1,maxAfter);
    learnNewMoves(p,known);
    return {ok:true,message:from+' 已进化为'+label(p)+'。'};
  }
  function flags(uid){
    const db=state.battle.conditions;
    return db[uid] ||= {stages:[0,0,0,0,0,0],status:'',duration:0,seed:0,shield:0,mist:0,fireWard:0,
      evade:0,boost:0,boostFactor:1,weaken:0,weakenFactor:1,aim:0,chainMove:0,chain:0,
      barrier:0,ward:0,crit:0,leech:0,leechFactor:1,siphon:0,siphonFactor:1,recovery:0,recoveryFactor:1,
      physicalWard:0,reflect:0,reflectFactor:1,addDamage:0,addAmount:0,typeBuff:0,buffType:0,buffFactor:1,
      critBonus:0,mirror:0,mirroredDefense:0,staticGuard:0,staticChance:0,
      specialWard:0,mirrorAttack:0,mirroredAttack:0,recoveryPoints:0,recoveryAmount:0,
      priorityTurns:0,priorityBonus:0,attackPriorityTurns:0,attackPriorityBonus:0,boostPercentTurns:0,boostPercent:0,
      typeTurns:0,typeId:0};
  }
  function battleType(p){
    const f=state.battle?.conditions[p.uid];
    return f?.typeTurns&&Object.hasOwn(data.types,f.typeId)?f.typeId:index.get(p.speciesId)[2];
  }
  function scaled(p,i){
    const f=flags(p.uid);
    if(i===1&&f.mirror)return f.mirroredDefense;
    if(i===0&&f.mirrorAttack)return f.mirroredAttack;
    const stage=f.stages[i],base=stats(p)[i+1];
    return base*(stage>=0?(2+stage)/2:2/(2-stage));
  }
  function typeFactor(attacking,defend){
    const attacks=elements(attacking),opponents=elements(battleType(defend));
    const one=(a,d)=>data.matchups[a]?.[d]??1;
    function combined(a,b){
      if(a===2&&b===2)return 4;
      return (a+b)/(a===0||b===0?4:2);
    }
    if(attacks.length===1){
      const values=opponents.map(d=>one(attacks[0],d));return values.length===1?values[0]:combined(...values);
    }
    return opponents.reduce((sum,d)=>sum+combined(one(attacks[0],d),one(attacks[1],d)),0)/opponents.length;
  }
  function afflict(p,status,duration){
    const f=flags(p.uid);
    if(!status||!p.hp||f.status||f.ward)return;
    f.status=status;f.duration=duration;
    addLog(label(p)+' 陷入'+statuses[status]+'。');
  }
  function useEffects(att,def,fx,damage,first){
    const a=flags(att.uid),b=flags(def.uid),ah=stats(att)[0];
    for(const {code,args} of fx){
      const [x,y,z]=args;
      if(code===1)att.hp=Math.min(ah,att.hp+Math.ceil(damage/2));
      if(code===3){a.stages=a.stages.map(s=>Math.max(0,s));}
      if(code===521)a.stages=a.stages.map(Math.abs);
      if(code===585)a.stages=a.stages.map((s,i)=>clamp(s+(args[i]||0),-6,6));
      if(code===749&&!b.mist&&dice(x))b.stages=b.stages.map(s=>clamp(s-y,-6,6));
      if((code===4||code===5)&&x>=0&&x<6&&dice(y)){
        const target=code===4?a:b,pet=code===4?att:def;
        if(z<0&&target.mist>0)continue;
        target.stages[x]=clamp(target.stages[x]+z,-6,6);
        addLog(label(pet)+' 的'+['攻击','防御','特攻','特防','速度','命中'][x]+(z>0?'提升':'下降')+'。');
      }
      if(code===6)att.hp=Math.max(0,att.hp-Math.ceil(damage/Math.max(1,x)));
      const ailment={10:'paralysis',11:'poison',12:'burn',14:'freeze',15:'fear',16:'sleep',94:'stone'}[code];
      if(ailment&&dice(x))afflict(def,ailment,rand(2,4));
      if(code===74||code===75){
        const roll=rand(0,9);
        if(roll<3)afflict(def,(code===74?['poison','burn','freeze']:['paralysis','sleep','fear'])[roll],rand(2,4));
      }
      if(code===13&&!elements(battleType(def)).includes('草'))b.seed=x;
      if(code===20&&dice(x)){a.status='tired';a.duration=y+1;}
      if(code===22&&dice(x))afflict(def,'tired',y+(first?0:1));
      if(code===21){a.reflect=rand(x,y)+1;a.reflectFactor=z;}
      if(code===32)a.critBonus=x+1;
      if(code===33)b.stages=b.stages.map(s=>Math.min(0,s));
      if(code===39&&dice(x))for(const m of def.moves)m[1]=Math.max(0,m[1]-y);
      if(code===41)a.fireWard=rand(x,y)+1;
      if(code===42){a.typeBuff=rand(x,y)+1;a.buffType=5;a.buffFactor=2;}
      if(code===43)att.hp=Math.min(ah,att.hp+Math.ceil(ah/Math.max(1,x)));
      if(code===45){a.mirroredDefense=scaled(def,1);a.mirror=x+1;}
      if(code===51){a.mirroredAttack=scaled(def,0);a.mirrorAttack=x+1;}
      if(code===46)a.shield=x;
      if(code===47)a.mist=x+1;
      if(code===48)a.ward=x+1;
      if(code===49)a.barrier=Math.max(a.barrier,x);
      if(code===50)a.physicalWard=x+1;
      if(code===44)a.specialWard=x+1;
      if(code===52)a.evade=x+(first?0:1);
      if(code===53||code===90){a.boost=x+1;a.boostFactor=y;}
      if(code===776){a.boost=x+1;a.boostFactor=2;}
      if(code===693){a.boostPercentTurns=x+1;a.boostPercent=y;}
      if(code===843){a.priorityTurns=x+1;a.priorityBonus=y;}
      if(code===481){a.attackPriorityTurns=x+1;a.attackPriorityBonus=y;}
      if(code===54){b.weaken=x+1;b.weakenFactor=y;}
      if(code===55){
        const from=battleType(att),to=battleType(def);
        a.typeId=to;b.typeId=from;a.typeTurns=b.typeTurns=x+1;
        addLog(label(att)+' 与 '+label(def)+' 的战斗属性互换 '+x+' 回合。');
      }
      if(code===56){
        a.typeId=battleType(def);a.typeTurns=x+1;
        addLog(label(att)+' 复制了对手的'+elements(a.typeId).join('·')+'属性。');
      }
      if(code===81)a.aim=x+1;
      if(code===58)a.crit=x+1;
      if(code===57){a.recovery=x+1;a.recoveryFactor=y;}
      if(code===77){a.recoveryPoints=x+1;a.recoveryAmount=y;}
      if(code===87)for(const slot of att.moves)slot[1]=data.moves[slot[0]][4];
      if(code===60){a.addDamage=x+1;a.addAmount=y;}
      if(code===63)for(let i=0;i<6;i++){
        if(a.stages[i]>=0)continue;
        if(!b.mist)b.stages[i]=clamp(b.stages[i]+a.stages[i],-6,6);
        a.stages[i]=0;
      }
      if(code===65){a.typeBuff=x+1;a.buffType=y;a.buffFactor=z;}
      if(code===84){a.staticGuard=x+1;a.staticChance=y;}
      if(code===85)for(let i=0;i<6;i++){
        if(b.stages[i]<=0)continue;
        a.stages[i]=clamp(a.stages[i]+b.stages[i],-6,6);b.stages[i]=0;
      }
      if(code===89){a.leech=x+1;a.leechFactor=y;}
      if(code===105)att.hp=Math.min(ah,att.hp+Math.floor(damage/Math.max(1,x)));
      if(code===101)att.hp=Math.min(ah,att.hp+Math.floor(damage*x/100));
      if(code===66&&!def.hp&&damage>0)att.hp=Math.min(ah,att.hp+Math.floor(ah/Math.max(1,x)));
      if(code===450)att.hp=Math.min(ah,att.hp+rand(x,y));
      if(code===796){a.siphon=x;a.siphonFactor=y;}
      if(code===847)a.barrier=Math.max(a.barrier,x);
      if(code===748&&damage>=x&&damage<=y)afflict(def,SPIRIT_STATUS_ID[z],3);
    }
  }
  const struggle=['挣扎',1,8,40,1,100,0,1,0,[6],[4]];
  // The client's status glossary places these ticks at the start of the
  // opposing action, including a capsule, potion or voluntary replacement.
  function damageOnOpponentAction(p){
    const status=flags(p.uid).status;
    if(!['poison','burn','freeze','bleed'].includes(status))return;
    const amount=status==='bleed'?80:Math.max(1,Math.floor(stats(p)[0]/8));
    const loss=Math.min(p.hp,amount);p.hp-=loss;
    addLog(label(p)+' 受到'+statuses[status]+'伤害 '+loss+'。');
  }
  function recoverOnMoveUse(p,f){
    if(!p.hp||(!f.recovery&&!f.recoveryPoints))return;
    const max=stats(p)[0],heal=(f.recovery?Math.ceil(max/f.recoveryFactor):0)+(f.recoveryPoints?f.recoveryAmount:0);
    p.hp=Math.min(max,p.hp+heal);
  }
  function strike(att,def,slot,first,received){
    const a=flags(att.uid),b=flags(def.uid);
    damageOnOpponentAction(def);
    if(!def.hp)return 0;
    if(slot&&slot[1]<=0){addLog(label(att)+' 所选技能的 PP 已耗尽。');return 0;}
    if(faintStatuses.includes(a.status)){
      addLog(label(att)+' 因'+statuses[a.status]+'未能行动。');return 0;
    }
    const row=slot?data.moves[slot[0]]:struggle;
    const fx=decodeSpiritEffects(row).filter(f=>f.args!==null),byCode=new Map(fx.map(f=>[f.code,f.args]));
    if(slot&&!(byCode.has(412)&&att.hp<stats(att)[0]/byCode.get(412)[0]))slot[1]--;
    const currentId=slot?.[0]||0;
    const consecutive=a.chainMove===currentId?a.chain:0;
    a.chain=consecutive+1;a.chainMove=currentId;
    const accuracy=a.stages[5],modifier=accuracy>=0?(3+accuracy)/3:3/(3-accuracy);
    addLog(label(att)+' 使用了'+row[0]+'。');
    const attackMove=row[1]!==4;
    if(byCode.has(7)&&def.hp<=att.hp){addLog('对手体力没有高于自身。');recoverOnMoveUse(att,a);return 0;}
    if(!row[7]&&!(attackMove&&a.aim)&&((b.evade&&!first)||!dice(row[5]*modifier))){
      addLog('技能未命中。');recoverOnMoveUse(att,a);return 0;
    }
    const priorStatus=b.status;
    if(attackMove&&priorStatus==='sleep'){b.status='';b.duration=0;addLog(label(def)+' 被击中后醒来。');}
    if(attackMove&&b.shield>0){b.shield--;addLog(label(def)+' 的防护罩挡下了攻击。');recoverOnMoveUse(att,a);return 0;}
    let damage=0;
    if(row[1]!==4){
      let power=row[3];
      if(byCode.has(61))power=rand(50,150);
      if(byCode.has(70))power=rand(140,220);
      if(byCode.has(2)&&def.hp<stats(def)[0]/2)power*=2;
      if(byCode.has(40)&&first)power*=2;
      if(byCode.has(30)&&!first)power*=2;
      if(byCode.has(37)&&att.hp<stats(att)[0]/byCode.get(37)[0])power*=byCode.get(37)[1];
      if(row[11]?.PwrDouble===1&&SPIRIT_DOUBLE_STATUSES.includes(priorStatus))power*=2;
      if(byCode.has(96)&&priorStatus==='burn'||byCode.has(97)&&priorStatus==='freeze'||byCode.has(102)&&priorStatus==='paralysis')power*=2;
      if(byCode.has(35))power+=20*b.stages.reduce((sum,n)=>sum+Math.max(0,n),0);
      if(byCode.has(9)){
        const [increment,max]=byCode.get(9);
        power=Math.min(max,power+consecutive*increment);
      }
      if(a.status==='burn'&&!byCode.has(64))power*=.5;
      const physical=row[1]===1;
      const defenseIndex=physical?1:3;
      const attack=scaled(att,physical?0:2),defense=scaled(def,defenseIndex),baseDefense=stats(def)[defenseIndex+1];
      const same=elements(row[2]).every(t=>elements(battleType(att)).includes(t))?1.5:1;
      const factor=typeFactor(row[2],def);
      const burst=byCode.get(1141);
      // A multi-strike rule explicitly repeats the damage calculation.
      // The client's animation segment count does not multiply move power.
      const repeat=burst?rand(burst[0],burst[1]):byCode.has(31)?rand(...byCode.get(31)):1;
      for(let i=0;i<repeat;i++){
        const extraCrit=byCode.has(95)&&priorStatus==='sleep'?byCode.get(95)[0]*6.25:0;
        const crit=a.crit||dice(spiritCriticalChance(row)+(a.critBonus?6.25:0)+extraCrit)?2:1;
        const resist=(crit===2||byCode.has(195))&&b.stages[defenseIndex]>0?Math.min(defense,baseDefense):defense;
        let hit=((.4*att.level+2)*power*attack/resist/50+2)*same*factor*(rand(217,255)/255)*crit;
        if(a.boost)hit*=a.boostFactor;
        if(a.boostPercentTurns)hit*=1+a.boostPercent/100;
        if(a.typeBuff&&a.buffType===row[2])hit*=a.buffFactor;
        if(a.weaken)hit/=a.weakenFactor;
        if(b.physicalWard&&physical)hit*=.5;
        if(b.specialWard&&!physical)hit*=.5;
        if(b.fireWard&&elements(row[2]).includes('火'))hit*=.5;
        if(byCode.has(64)&&['burn','freeze','poison'].includes(a.status))hit*=2;
        if(byCode.has(88)&&dice(byCode.get(88)[0]))hit*=byCode.get(88)[1];
        damage+=factor>0?Math.max(1,Math.floor(hit)):0;
        if(burst&&dice(repeat<burst[4]?burst[5]:burst[2]))afflict(def,SPIRIT_STATUS_ID[repeat<burst[4]?burst[6]:burst[3]],3);
      }
      if(byCode.has(7))damage=Math.max(0,def.hp-att.hp);
      if(byCode.has(34))damage=received*(byCode.get(34)[0]||2);
      if(byCode.has(29))damage+=byCode.get(29)[0];
      if(byCode.has(683))damage+=rand(...byCode.get(683));
      if(byCode.has(447)&&factor>0)damage=Math.max(damage,byCode.get(447)[0]);
      if(byCode.has(93)&&dice(byCode.get(93)[0]))damage+=byCode.get(93)[1];
      if(a.addDamage)damage+=a.addAmount;
      if(byCode.has(593)){
        const [who,index,percent]=byCode.get(593);
        if(index<5)damage+=Math.floor(scaled(who===0?att:def,index)*percent/100);
      }
      if(b.barrier){const absorbed=Math.min(damage,b.barrier);b.barrier-=absorbed;damage-=absorbed;}
      if(byCode.has(8))damage=Math.min(damage,def.hp-1);
      damage=clamp(damage,0,def.hp);def.hp-=damage;
      if(b.reflect)att.hp=Math.max(0,att.hp-Math.floor(damage/b.reflectFactor));
      if(b.staticGuard&&physical&&damage&&!a.status&&!a.ward&&dice(b.staticChance)){a.status='paralysis';a.duration=3;}
      if(a.leech)att.hp=Math.min(stats(att)[0],att.hp+Math.floor(damage/a.leechFactor));
      addLog(label(def)+' 失去 '+damage+' 体力'+(factor>1?'，属性克制。':factor<1?'，属性效果微弱。':'。'));
      if(repeat>1)addLog('连续攻击 '+repeat+' 次。');
    }else if(byCode.has(28)){
      damage=Math.floor(def.hp/byCode.get(28)[0]);def.hp-=damage;addLog(label(def)+' 失去 '+damage+' 体力。');
    }
    useEffects(att,def,fx,damage,first);
    recoverOnMoveUse(att,a);
    return damage;
  }
  function chooseMove(p){
    const available=p.moves.filter(m=>m[1]>0);
    if(!available.length)return null;
    const opponent=p.uid==='wild'?active():state.battle.enemy,a=flags(p.uid),b=flags(opponent.uid);
    const attacks=available.filter(m=>data.moves[m[0]][1]!==4);
    const supports=available.filter(m=>data.moves[m[0]][1]===4).filter(m=>
      decodeSpiritEffects(data.moves[m[0]]).some(({code,args})=>{
        if(!args)return false;
        if(code===43)return p.hp<stats(p)[0]*.65;
        if(code===4)return args[2]>0&&a.stages[args[0]]<4;
        if(code===5)return args[2]<0&&b.stages[args[0]]>-4&&!b.mist;
        if([10,11,12,14,15,16,94].includes(code))return !b.status&&!b.ward;
        if(code===33)return b.stages.some(value=>value>0);
        if(code===3)return a.stages.some(value=>value<0);
        if(code===55||code===56)return !a.typeTurns&&battleType(p)!==battleType(opponent);
        return ![4,5,43].includes(code);
      }));
    if(supports.length&&(!attacks.length||dice(25)))return supports[rand(0,supports.length-1)];
    function score(slot){
      const row=data.moves[slot[0]],power=Math.max(1,row[3]),physical=row[1]===1;
      return power*scaled(p,physical?0:2)/Math.max(1,scaled(opponent,physical?1:3))*typeFactor(row[2],opponent)*
        (elements(row[2]).every(t=>elements(battleType(p)).includes(t))?1.5:1)*(row[7]?1:row[5]/100);
    }
    attacks.sort((x,y)=>score(y)-score(x));
    return (dice(75)?attacks[0]:attacks[rand(0,attacks.length-1)])||available[0];
  }
  function finishRound(){
    const b=state.battle,player=active(),enemy=b.enemy;
    for(const [pet,other] of [[player,enemy],[enemy,player]]){
      if(!pet.hp||!other.hp)continue;
      const f=flags(pet.uid),max=stats(pet)[0];
      if(f.seed>0&&pet.hp){
        const dmg=Math.min(pet.hp,Math.max(1,Math.floor(max/8)));pet.hp-=dmg;other.hp=Math.min(stats(other)[0],other.hp+dmg);f.seed--;
      }
      if(f.siphon&&other.hp){
        const drain=Math.min(other.hp,Math.max(1,Math.floor(other.hp/f.siphonFactor)));
        other.hp-=drain;pet.hp=Math.min(max,pet.hp+drain);
      }
      if(f.duration>0&&!--f.duration)f.status='';
      for(const key of ['mist','fireWard','evade','boost','weaken','aim','ward','crit','leech','siphon','recovery',
        'physicalWard','reflect','addDamage','typeBuff','critBonus','mirror','staticGuard','specialWard','mirrorAttack',
        'priorityTurns','attackPriorityTurns','recoveryPoints','boostPercentTurns','typeTurns'])if(f[key]>0)f[key]--;
    }
    if(!enemy.hp){
      if(enemy.speciesId===16){state.materials.photo++;addLog('获得光合能量 ×1。');}
      if(enemy.speciesId===10||enemy.speciesId===164){state.materials.air++;addLog('获得空气结晶 ×1。');}
      if(enemy.speciesId===30){state.materials.water++;addLog('获得水之精华 ×1。');}
      let reward='';
      if(b.kind==='boss'&&!state.bosses.includes(enemy.speciesId)){
        remember(state.bosses,enemy.speciesId);
        const quest=SPT_CHALLENGES.get(enemy.speciesId),rewards=[];
        if(quest.partner){const where=receive(makePet(quest.partner,1,''));rewards.push(monName(quest.partner)+'已进入'+where);}
        if(quest.bankedXP)rewards.push(bankExperience(quest.bankedXP)+' 点积累经验');
        if(quest.blackCrystal){state.materials.blackCrystal+=quest.blackCrystal;rewards.push('黑晶矿 ×'+quest.blackCrystal);}
        reward='首次击败'+label(enemy)+'，'+rewards.join('，')+'。';
      }
      for(const uid of b.participants){
        const p=state.party.find(p=>p.uid===uid);if(p)grantXP(p,enemy);
      }
      // One shared award per won encounter, independent of party size. Healing,
      // fleeing and capture do not mint experience; rest prevents immediate reuse.
      const banked=bankExperience(Math.max(1,Math.floor(encounterXP(enemy)*.5)));
      addLog('获得 '+banked+' 点积累经验，可用于队伍或仓库伙伴。');
      state.recent[b.encounterKey]=Date.now()+60000;state.battle=null;
      return done(reward||'战斗胜利。','won');
    }
    if(!state.party.some(p=>p.hp)){
      state.battle=null;return done('队伍失去战斗能力，请进行精灵恢复。','lost');
    }
    if(enemy.speciesId===108&&b.kind==='rare'&&b.turn>=5){
      state.recent[b.encounterKey]=Date.now()+60000;state.battle=null;
      return done('五个回合结束，布鲁游进水流深处了。','escapedWild');
    }
    b.turn++;
    return done(player.hp?'第 '+(b.turn-1)+' 回合结束。':'当前精灵失去战斗能力，请换上队友。');
  }
  function begin(encounter){
    if(state.battle)return fail('目前正在对战。');
    const id=Number(encounter?.speciesId),key=encounter?.key;
    if(!wild.has(id)||typeof key!=='string'||!key.length||key.length>120||
      !['wild','rare','boss','common','shiny'].includes(encounter.kind))return fail('该精灵当前仅可观察。');
    const chief=SPT_CHALLENGES.get(id);
    if(chief?encounter.siteId!==chief.site||encounter.kind!=='boss':encounter.kind==='boss')return fail('请在首领所在区域发起挑战。');
    const habitat=TWIN_ENCOUNTERS.get(id);
    if(habitat&&(encounter.siteId!==habitat.site||encounter.kind!=='wild'))return fail('请在该精灵所在栖地发起对战。');
    if(id===47&&!state.flameTool)return fail('先到赛尔号实验室领取火焰喷射器，回林间破开护膜。');
    if((state.recent[key]||0)>Date.now())return fail('这只精灵刚刚离开，请寻找附近的其他个体。');
    const lead=state.party.find(p=>p.hp>0);
    if(!lead)return fail(state.party.length?'请先恢复队伍体力。':'先选择一只初始伙伴。');
    const enemy=makePet(id,chief?.level||habitat?.level||integer(encounter.level,1,100,1),'wild');
    if(chief?.moves){
      const learned=new Set(potential(enemy));
      enemy.moves=chief.moves.filter(move=>learned.has(move)).slice(0,4).map(move=>[move,data.moves[move][4]]);
    }
    const b={enemy,kind:encounter.kind,area:String(encounter.siteId||''),encounterKey:key,
      turn:1,activeUid:lead.uid,participants:[lead.uid],conditions:{}};
    state.battle=b;remember(state.seen,id);flags(lead.uid);flags(enemy.uid);
    return done('遭遇 '+label(enemy)+'（Lv.'+enemy.level+'），'+label(lead)+' 出战。');
  }
  function turn(action){
    const b=state.battle,player=active(),enemy=b.enemy;
    if(action.type==='flee'){state.battle=null;return done('已撤离这场遭遇。','fled');}
    if(action.type==='switch'){
      const next=state.party.find(p=>p.uid===action.uid);
      if(!next||next===player||!next.hp)return fail('请选择另一只有体力的随行精灵。');
      const forced=!player.hp;delete b.conditions[player.uid];b.activeUid=next.uid;remember(b.participants,next.uid);flags(next.uid);
      addLog(label(next)+' 接替出战。');
      if(forced)return {ok:true,message:'已派出 '+label(next)};
      damageOnOpponentAction(enemy);
      if(enemy.hp)strike(enemy,next,chooseMove(enemy),true,0);
      return finishRound();
    }
    if(!player.hp)return fail('请先换上有体力的队友。');
    if(action.type==='capture'){
      if(b.kind==='boss'||!data.species[enemy.speciesId].catch)return fail('这场挑战不能使用胶囊。');
      if(!state.capsules)return fail('胶囊已用完。脱离战斗后可恢复补给。');
      damageOnOpponentAction(enemy);
      if(!enemy.hp)return finishRound();
      state.capsules--;
      const maximum=stats(enemy)[0],weakness=1-enemy.hp/maximum,affliction=flags(enemy.uid).status;
      const rate=data.species[enemy.speciesId].catch/255;
      // Project encounter odds. Client catch-rate data supplies the rarity factor.
      const odds=clamp((.12+.83*weakness)*(.26+.74*rate)*(affliction?1.32:1),.02,.96);
      if(Math.random()<odds){
        const where=receive(enemy);state.recent[b.encounterKey]=Date.now()+60000;state.battle=null;
        return done('收服了 '+label(enemy)+'，已进入'+where+'。','caught');
      }
      addLog(label(enemy)+' 挣脱了胶囊。');
      strike(enemy,player,chooseMove(enemy),true,0);return finishRound();
    }
    if(action.type==='potion'){
      const recipient=action.uid?state.party.find(p=>p.uid===action.uid):player;
      const result=medicate(recipient);if(!result.ok)return result;
      damageOnOpponentAction(enemy);
      if(enemy.hp)strike(enemy,player,chooseMove(enemy),true,0);
      return finishRound();
    }
    if(action.type!=='move')return fail('请先结束这场对战。');
    const depleted=player.moves.every(m=>!m[1]);
    const selected=player.moves.find(m=>m[0]===Number(action.moveId)&&m[1]>0);
    if(!selected&&!(depleted&&Number(action.moveId)===0))return fail('这项技能未装配或 PP 已用完。');
    const other=chooseMove(enemy);
    function priority(p,move){
      const row=move?data.moves[move[0]]:struggle,f=flags(p.uid);
      return (row[6]||0)+(f.priorityTurns?f.priorityBonus:0)+(f.attackPriorityTurns&&row[1]!==4?f.attackPriorityBonus:0);
    }
    const delta=priority(player,selected)-priority(enemy,other),speed=scaled(player,4)-scaled(enemy,4);
    const first=delta?delta>0:speed?speed>0:dice(50);
    const order=first?[[player,enemy,selected],[enemy,player,other]]:[[enemy,player,other],[player,enemy,selected]];
    const hit=strike(...order[0],true,0);
    if(player.hp&&enemy.hp)strike(...order[1],false,hit);
    return finishRound();
  }
  function medicate(p){
    if(!p||!p.hp||p.hp>=stats(p)[0])return fail('请给仍可战斗且体力受损的精灵使用药剂。');
    if(!state.potions)return fail('体力药剂已用完，请先补给。');
    state.potions--;const old=p.hp;p.hp=Math.min(stats(p)[0],p.hp+20);
    return done(label(p)+' 恢复 '+(p.hp-old)+' 体力。');
  }
  function fuse(a){
    if(a.site!=='laboratory')return fail('请前往实验室操作融合器。');
    if(state.bead)return fail('先处理现有绿色元神珠。');
    const main=findPet(a.mainUid),side=findPet(a.sideUid);
    if(main?.speciesId!==3||!side||side===main||![27,28,29].includes(side.speciesId))return fail('请选择布布花与小豆芽家族的两个不同个体。');
    if(state.party.length+state.storage.length<3)return fail('至少再保留一只伙伴，才能消耗这两只精灵。');
    if(!['photo','mixed'].includes(a.recipe))return fail('请选择融合配方。');
    const photo=a.recipe==='photo'?4:2,air=4-photo;
    if(state.materials.photo<photo||state.materials.air<air)return fail('光合能量或空气结晶不足。');
    state.party=state.party.filter(p=>p!==main&&p!==side);state.storage=state.storage.filter(p=>p!==main&&p!==side);
    if(!state.party.length)state.party.push(state.storage.shift());
    if([main.uid,side.uid].includes(state.followerUid))state.followerUid=null;
    state.materials.photo-=photo;state.materials.air-=air;state.bead={phase:'fresh',readyAt:null};
    return done('融合成功，两只亲本与材料已消耗。绿色元神珠需要在克洛斯星林间吸能。');
  }
  function act(a={}){
    if(!a||typeof a.type!=='string')return fail('没有可执行的操作。');
    if(a.type==='observe'){
      const id=Number(a.speciesId);if(!index.has(id))return fail('图鉴中没有此编号。');
      remember(state.seen,id);return {ok:true,message:'已更新观察记录。'};
    }
    if(a.type==='safari'){
      if(state.battle)return fail('请先结束普通精灵对战。');
      return safari.act(state.safari,a);
    }
    if(safari.active(state.safari)&&state.safari.encounter)return fail('先撤离当前的湿地捕猎遭遇。');
    if(state.battle)return turn(a);
    if(a.type==='encounter')return begin(a.encounter);
    if(a.type==='fuse')return fuse(a);
    if(a.type==='equipFlameTool'){
      if(a.site!=='laboratory')return fail('请到赛尔号实验室领取火焰喷射器。');
      if(state.flameTool)return fail('已装备火焰喷射器。');
      state.flameTool=true;
      return done('已装备火焰喷射器，可在克洛斯星林间对准蘑菇怪护膜。');
    }
    if(a.type==='allocateXP'){
      const pet=findPet(a.uid);
      if(!pet||pet.level>=100)return fail('请选择一只未满级的队伍或仓库伙伴。');
      let amount=a.amount;
      if(a.mode!==undefined){
        const training=trainingView(pet);
        const costs={nextLevel:training.nextLevelCost,fiveLevels:training.fiveLevelsCost,evolution:training.evolutionCost,
          all:Math.min(state.bankedXP,training.maxLevelCost)};
        if(!Object.hasOwn(costs,a.mode))return fail('请选择有效的培养目标。');
        amount=costs[a.mode];
        if(amount===null)return fail('这只精灵没有当前可用的进化路线。');
        if(a.mode==='evolution'&&!amount)return fail('已达到进化等级，请在进化栏查看材料或前往实验室。');
      }
      if(!Number.isSafeInteger(amount)||amount<=0)return fail('没有可分配的经验，请通过对战胜利积累。');
      if(amount>state.bankedXP)return fail('本次需要 '+amount+' 点经验，当前还有 '+state.bankedXP+' 点。');
      const used=gainExperience(pet,Math.min(amount,costToLevel(pet,100)),stats(pet)[0]);
      state.bankedXP-=used;
      return done(label(pet)+' 领取了 '+used+' 点积累经验，剩余 '+state.bankedXP+' 点。');
    }
    if(a.type==='energize'){
      if(a.site!=='forest'||state.bead?.phase!=='fresh')return fail('请携带未吸能的绿色元神珠前往克洛斯星林间。');
      state.bead={phase:'incubating',readyAt:Date.now()+24*60*60*1000};
      return done('绿色元神珠已吸能，NoNo 开始孵化。24 小时后可领取。');
    }
    if(a.type==='hatch'){
      if(state.bead?.phase!=='incubating'||Date.now()<state.bead.readyAt)return fail('元神珠尚未完成孵化。');
      const where=receive(makePet(301,1,''));state.bead=null;
      return done('孵化完成，黄金布布已进入'+where+'。');
    }
    if(a.type==='collectionReward'){
      const id=Number(a.speciesId);
      if(!state.starterClaimed)return fail('请先选择第一只初始伙伴。');
      if(a.site!=='laboratory'||state.collectionRewardClaimed||![10,16,27].every(n=>state.owned.includes(n)))return fail('请完成克洛斯星收集计划，到实验室领取一次奖励。');
      if(!starters.includes(id)||state.owned.includes(id))return fail('请选择尚未获得的另一只初始伙伴。');
      const p=makePet(id,5,'');const where=receive(p);state.collectionRewardClaimed=true;
      return done('收集计划完成，'+label(p)+' 已进入'+where+'。');
    }
    if(a.type==='starter'){
      if(state.starterClaimed||!starters.includes(Number(a.speciesId)))return fail('请选择一只尚未领取的初始伙伴。');
      const p=makePet(Number(a.speciesId),5,'');const place=receive(p);state.starterClaimed=true;
      return done('领取了 '+label(p)+'，已进入'+place+'。');
    }
    if(a.type==='heal'){
      for(const p of [...state.party,...state.storage]){
        p.hp=stats(p)[0];
        for(const m of p.moves)m[1]=data.moves[m[0]][4];
        delete p.reservePP;
      }
      state.capsules=Math.max(10,state.capsules);state.potions=Math.max(5,state.potions);
      return done('精灵体力与 PP 已恢复，胶囊与体力药剂已补给。');
    }
    const pet=findPet(a.uid);
    if(!pet)return fail('请选择队伍或仓库内的精灵。');
    if(a.type==='evolve')return evolve(pet,a);
    if(a.type==='potion')return medicate(pet);
    if(a.type==='autoLearn'){
      const recommended=recommendedMoveIds(pet),equipped=new Map(pet.moves);
      const replacements=recommended.map(id=>[id,equipped.get(id)??reserveMovePP(pet,id)]);
      for(const [id,pp] of pet.moves){
        if(!recommended.includes(id)&&pp<data.moves[id][4])(pet.reservePP??={})[id]=pp;
      }
      for(const id of recommended)if(pet.reservePP)delete pet.reservePP[id];
      pet.moves=replacements;
      return done(label(pet)+' 已采用推荐配招，剩余 PP 保留。');
    }
    if(a.type==='learn'){
      const id=Number(a.moveId),slot=Number(a.slot);
      if(!potential(pet).includes(id)||pet.moves.some(m=>m[0]===id))return fail('该精灵暂不能装配这项技能。');
      if(!Number.isInteger(slot)||slot<0||slot>=4||slot>pet.moves.length)return fail('请选择一个有效的技能槽。');
      const previous=pet.moves[slot],pp=reserveMovePP(pet,id);
      if(previous&&previous[1]<data.moves[previous[0]][4])(pet.reservePP??={})[previous[0]]=previous[1];
      if(pet.reservePP)delete pet.reservePP[id];
      pet.moves[slot]=[id,pp];return done(label(pet)+' 已装配 '+data.moves[id][0]+'。');
    }
    const inParty=state.party.indexOf(pet);
    if(a.type==='follow'&&inParty>=0){
      state.followerUid=state.followerUid===pet.uid?null:pet.uid;
      return done(label(pet)+(state.followerUid?' 开始跟随。':' 已结束跟随。'));
    }
    if(a.type==='lead'&&inParty>=0){state.party.splice(inParty,1);state.party.unshift(pet);return done(label(pet)+' 已设为首发。');}
    if(a.type==='store'&&inParty>=0){
      if(state.party.length===1)return fail('请为随行队伍保留至少一只精灵。');
      if(state.followerUid===pet.uid)state.followerUid=null;
      state.party.splice(inParty,1);state.storage.push(pet);return done(label(pet)+' 已存入仓库。');
    }
    if(a.type==='withdraw'&&inParty<0){
      if(state.party.length>=6)return fail('随行队伍已满，请先存入一只精灵。');
      state.storage.splice(state.storage.indexOf(pet),1);state.party.push(pet);return done(label(pet)+' 已加入队伍。');
    }
    return fail('此操作目前不可用。');
  }
  // Only spent, unequipped moves need a reserve entry. Older saves start empty.
  function reserveMovePP(p,id){return p.reservePP?.[id]??data.moves[id][4];}
  function restoreReservePP(p,raw,allowed){
    if(!raw.reservePP||typeof raw.reservePP!=='object'||Array.isArray(raw.reservePP))return;
    for(const [key,pp] of Object.entries(raw.reservePP)){
      const id=Number(key);
      if(String(id)!==key||!allowed.includes(id)||p.moves.some(slot=>slot[0]===id))continue;
      if(Number.isInteger(pp)&&pp>=0&&pp<data.moves[id][4])(p.reservePP??={})[key]=pp;
    }
  }
  function readPet(raw,uid){
    if(!raw||!roster.has(raw.speciesId)||!data.species[raw.speciesId]||!uid)return null;
    const p={uid,speciesId:raw.speciesId,level:integer(raw.level,1,100,1),xp:0,iv:integer(raw.iv,0,31),
      nature:integer(raw.nature,0,data.natures.length-1),hp:0,ev:[],moves:[]};
    let budget=510;
    for(let i=0;i<6;i++){const n=integer(raw.ev?.[i],0,Math.min(255,budget));p.ev.push(n);budget-=n;}
    p.hp=integer(raw.hp,0,stats(p)[0],stats(p)[0]);p.xp=integer(raw.xp,0,Math.max(0,xpGoal(p.level)-1));
    const ancestorMoves=inheritedCandidates(p.speciesId,p.level);
    const ownMoves=new Set(levelMoves(p.speciesId,p.level));
    const equipped=Array.isArray(raw.moves)?raw.moves.filter(Array.isArray).map(m=>m[0]):[];
    const inherited=[...new Set([...(Array.isArray(raw.inheritedMoves)?raw.inheritedMoves:[]),...equipped])]
      .filter(id=>ancestorMoves.has(id)&&!ownMoves.has(id));
    if(inherited.length)p.inheritedMoves=inherited;
    const allowed=potential(p);
    for(const m of Array.isArray(raw.moves)?raw.moves:[]){
      if(!Array.isArray(m)||!allowed.includes(m[0])||p.moves.some(v=>v[0]===m[0]))continue;
      p.moves.push([m[0],integer(m[1],0,data.moves[m[0]][4])]);if(p.moves.length===4)break;
    }
    if(!p.moves.length)p.moves=allowed.slice(-4).map(id=>[id,data.moves[id][4]]);
    restoreReservePP(p,raw,allowed);
    return p;
  }
  function restore(saved){
    state=fresh();if(!saved||saved.version!==1)return;
    const used=new Set();
    for(const key of ['party','storage']){
      for(const raw of Array.isArray(saved[key])?saved[key]:[]){
        const uid=raw?.uid;
        if(typeof uid!=='string'||!/^p[1-9]\d{0,8}$/.test(uid)||used.has(uid))continue;
        const pet=readPet(raw,uid);if(!pet)continue;
        used.add(uid);state.nextId=Math.max(state.nextId,Number(uid.slice(1))+1);
        (key==='party'&&state.party.length<6?state.party:state.storage).push(pet);
        markOwned(pet);
      }
    }
    if(!state.party.length&&state.storage.length)state.party.push(state.storage.shift());
    state.nextId=Math.max(state.nextId,integer(saved.nextId,1,999999999,1));
    if(state.party.some(p=>p.uid===saved.followerUid))state.followerUid=saved.followerUid;
    for(const key of ['seen','owned'])for(const id of Array.isArray(saved[key])?saved[key]:[])if(index.has(id))remember(state[key],id);
    state.starterClaimed=typeof saved.starterClaimed==='boolean'?saved.starterClaimed:starters.some(id=>state.owned.includes(id));
    state.bosses=Array.isArray(saved.bosses)?saved.bosses.filter(id=>SPT_CHALLENGES.has(id)):[];
    const defeated=state.bosses.includes(47);
    state.flameTool=defeated||saved.flameTool===true;
    // A v0.11.0 first-win record already awarded the baby, but had no experience bank.
    const rewardXP=SPT_CHALLENGES.get(47).bankedXP;
    state.bankedXP=integer(saved.bankedXP,0,Number.MAX_SAFE_INTEGER,defeated?rewardXP:0);
    state.capsules=integer(saved.capsules,0,9999,10);state.potions=integer(saved.potions,0,9999,5);
    state.collectionRewardClaimed=saved.collectionRewardClaimed===true;
    for(const k of ['photo','air','water'])state.materials[k]=integer(saved.materials?.[k],0,Number.MAX_SAFE_INTEGER);
    const rewardMineral=SPT_CHALLENGES.get(34).blackCrystal;
    state.materials.blackCrystal=state.bosses.includes(34)?integer(saved.materials?.blackCrystal,0,rewardMineral,rewardMineral):0;
    if(saved.bead?.phase==='fresh')state.bead={phase:'fresh',readyAt:null};
    if(saved.bead?.phase==='incubating'&&Number.isSafeInteger(saved.bead.readyAt)&&saved.bead.readyAt>0)
      state.bead={phase:'incubating',readyAt:saved.bead.readyAt};
    state.log=Array.isArray(saved.log)?saved.log.filter(s=>typeof s==='string').slice(-12).map(s=>s.slice(0,180)):[];
    state.safari=safari.restore(saved.safari);
    for(const [key,t] of Object.entries(saved.recent||{}))if(key.length<=120&&t>Date.now()&&t<=Date.now()+60000)state.recent[key]=t;
    const old=saved.battle,enemy=readPet(old?.enemy,'wild');
    if(!old||!enemy||(!wild.has(enemy.speciesId)&&enemy.speciesId!==701)||!enemy.hp||!state.party.some(p=>p.hp)||!state.party.some(p=>p.uid===old.activeUid))return;
    const chief=SPT_CHALLENGES.get(enemy.speciesId);
    if(chief&&(old.area!==chief.site||enemy.level!==chief.level||old.kind!=='boss'))return;
    const habitat=TWIN_ENCOUNTERS.get(enemy.speciesId);
    if(habitat&&(old.area!==habitat.site||enemy.level!==habitat.level||old.kind!=='wild'))return;
    if(enemy.speciesId===47)state.flameTool=true;
    state.safari.encounter=null;
    const partySet=new Set(state.party.map(p=>p.uid));
    const participants=Array.isArray(old.participants)?[...new Set(old.participants.filter(id=>partySet.has(id)))]:[];
    remember(participants,old.activeUid);
    state.battle={enemy,activeUid:old.activeUid,turn:integer(old.turn,1,999999,1),kind:chief?'boss':'wild',
      encounterKey:String(old.encounterKey||'').slice(0,120),area:String(old.area||'').slice(0,80),participants,conditions:{}};
    if(!chief&&old.kind==='rare')state.battle.kind='rare';
    for(const uid of [...partySet,'wild']){
      const f=flags(uid),s=old.conditions?.[uid];if(!s)continue;
      f.stages=f.stages.map((_,i)=>integer(s.stages?.[i],-6,6,0));
      f.status=Object.hasOwn(statuses,s.status)?s.status:'';
      for(const key of Object.keys(f))if(typeof f[key]==='number')f[key]=integer(s[key],0,key==='chainMove'?99999:999,f[key]);
      if(!Object.hasOwn(data.types,f.typeId)){f.typeId=0;f.typeTurns=0;}
    }
  }
  function snapshot(){
    for(const [key,t] of Object.entries(state.recent))if(t<=Date.now())delete state.recent[key];
    if(!safari.active(state.safari)){state.safari.encounter=null;state.safari.balls=0;}
    return copy(state);
  }
  restore(saved);return {catalog,species,view,act,snapshot,restore};
}
