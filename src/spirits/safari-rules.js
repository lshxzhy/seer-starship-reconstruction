// The wetland reserve has its own clock and shared capsule pouch.
// Commands return through the same atomic save as the recipient's party or vault.
function createSafariRules({data,makePet,readPet,petView,receive,markSeen,done,fail}){
  const pools=data.safari;
  const duration=15*60*1000;
  const blank=()=>({endsAt:0,balls:0,rod:false,crystals:0,encounter:null,fieldRest:{}});
  const bounded=(v,max)=>Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0;
  const active=s=>s.endsAt>Date.now();
  const choose=pool=>pool[Math.floor(Math.random()*pool.length)];
  const minLevel=new Map();
  for(const spec of Object.values(data.species)){
    if(spec.evolves)minLevel.set(spec.evolves[1],spec.evolves[0]);
  }
  function view(s){
    const e=active(s)?s.encounter:null;
    return {active:active(s),expired:s.endsAt>0&&!active(s),endsAt:s.endsAt,balls:active(s)?s.balls:0,
      rod:s.rod,crystals:s.crystals,fieldRest:{...s.fieldRest},encounter:e?{pet:petView(e.pet),method:e.method,temper:e.temper,turn:e.turn}:null};
  }
  function restore(raw){
    const s=blank();if(!raw)return s;
    s.rod=raw.rod===true;s.crystals=bounded(raw.crystals,9999);
    s.endsAt=bounded(raw.endsAt,Number.MAX_SAFE_INTEGER);
    if(!active(s))return s;
    s.balls=bounded(raw.balls,20);
    const e=raw.encounter,pet=readPet(e?.pet,'safari');
    if(s.balls&&pet&&pools[e.method]?.includes(pet.speciesId)){
      s.encounter={pet,method:e.method,temper:Math.max(-2,Math.min(2,Number(e.temper)||0)),turn:Math.max(1,bounded(e.turn,99999))};
    }
    for(const id of pools.field){
      const t=raw.fieldRest?.[id];if(Number.isSafeInteger(t)&&t>Date.now()&&t<=s.endsAt)s.fieldRest[id]=t;
    }
    return s;
  }
  function discover(s,op,id){
    if(op==='rod'){
      if(s.rod)return fail('已持有普通钓鱼竿。');
      s.rod=true;return done('捡到了普通钓鱼竿，可以在湖岸垂钓。');
    }
    const group=pools[op];
    if(!Array.isArray(group))return fail('请在湿地寻找下一只精灵。');
    if(op==='fish'&&!s.rod)return fail('先到垂钓区拾取鱼竿。');
    if(op==='bear'&&s.crystals<5)return fail('集齐五颗闪光晶石才能引出汤尼熊。');
    if(op==='field'){
      if(!group.includes(id))return fail('这只精灵不在捕猎场的可见名册内。');
      if(s.fieldRest[id]>Date.now())return fail('这个精灵刚刚离开，去别处找找。');
    }
    if((op==='fish'||op==='tree')&&Math.random()<.30){
      s.crystals=Math.min(9999,s.crystals+1);return done('找到了闪光晶石，现有 '+s.crystals+' 颗。');
    }
    const sid=op==='field'?id:choose(group),level=Math.max(minLevel.get(sid)||1,8+Math.floor(Math.random()*10));
    const pet=makePet(sid,level,'safari');markSeen(sid);
    if(op==='bear')s.crystals-=5;
    s.encounter={pet,method:op,turn:1,temper:0};
    return done('遇到了 '+petView(pet).name+'。');
  }
  function releaseEncounter(s){
    const e=s.encounter;
    if(e?.method==='field')s.fieldRest[e.pet.speciesId]=Math.min(s.endsAt,Date.now()+25000);
    s.encounter=null;
  }
  function interact(s,op){
    const e=s.encounter,pet=e.pet,name=petView(pet).name;
    if(op==='flee'){releaseEncounter(s);return done('已离开这只'+name+'。');}
    if(!['throw','feed','capture'].includes(op))return fail('请先结束眼前这场捕猎。');
    let message;
    if(op==='capture'){
      s.balls--;
      const catchability=data.species[pet.speciesId].catch/255;
      const chance=Math.max(.08,Math.min(.90,.31+.29*catchability+.10*e.temper));
      if(Math.random()<chance){
        releaseEncounter(s);const space=receive(pet);
        return done('用专用胶囊收服 '+name+'，已进入'+space+'。');
      }
      message=name+' 挣脱了专用胶囊。';
      if(!s.balls){releaseEncounter(s);return done(message+'20 枚已用完，离场后可重新入场。');}
    }else if(op==='throw'){
      e.temper=Math.min(2,e.temper+1);message=name+' 受惊，捕获和逃跑的机会都提高了。';
    }else{
      e.temper=Math.max(-2,e.temper-1);message=name+' 开始吃食，不容易逃跑。';
    }
    if(Math.random()<.15+.06*e.temper){releaseEncounter(s);return done(message+name+' 逃走了。');}
    e.turn++;return done(message+name+' 仍在附近。');
  }
  function act(s,a){
    const op=a.op;
    if(op==='exit'){
      if(!s.endsAt)return fail('当前未入场。');
      Object.assign(s,{endsAt:0,balls:0,encounter:null,fieldRest:{}});
      return done('已离场，鱼竿与收集的闪光晶石已保留。');
    }
    if(a.site!=='wetland')return fail('请前往克洛斯星湿地捕猎场。');
    if(op==='enter'){
      if(active(s))return fail('当前这一场仍在进行，离场后才能重新入场。');
      Object.assign(s,{endsAt:Date.now()+duration,balls:20,encounter:null,fieldRest:{}});
      return done('已进入湿地捕猎场，限时 15 分钟，专用胶囊 20 枚。');
    }
    if(!active(s))return fail(s.endsAt?'本场 15 分钟已结束，可重新入场。':'请先向管理员登记入场。');
    if(!s.balls)return fail('专用胶囊已用完，离场再进入可补满。');
    return s.encounter?interact(s,op):discover(s,op,Number(a.speciesId));
  }
  return {blank,active,view,restore,act};
}
