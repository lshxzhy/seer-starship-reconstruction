// The wetland's four commands belong to the time-limited capture event.
function renderWetlandCapture(host,state,{el,button,figure,act,siteId,chatWith}){
  const area=siteId(),s=state.safari,enc=s?.encounter;
  const apply=op=>act({type:'safari',op,site:area});
  if(!s?.active){
    el(host,'h3','','克洛斯湿地捕猎场');
    el(host,'p','','15 分钟　／　20 枚捕猎场专用胶囊');
    el(host,'p','spirit-sub','2011 年入场费为 5,000 赛尔豆。本地游览场次免费，进场时领取专用胶囊。');
    el(host,'p','',area==='wetland'?'在湿地探索陆地、树木和湖岸。先捡起湖畔的钓竿，再到水边垂钓。':'在地图中选择克洛斯星的湿地，到管理员旁入场。');
    button(host,'进入捕猎场',()=>apply('enter'),{disabled:area!=='wetland',primary:true,action:'safari-enter'});return;
  }
  const row=el(host,'div','spirit-row'),time=el(row,'strong','',safariRemaining(s.endsAt));
  time.dataset.safariDeadline=s.endsAt;
  el(row,'span','spirit-sub','专用胶囊 '+s.balls+'/20　·　闪光晶石 '+s.crystals+'/5　·　'+(s.rod?'已持钓竿':'未拾取钓竿'));
  if(enc){
    const p=enc.pet,art=el(host,'div','spirit-columns'),one=el(art,'div'),info=el(art,'div');
    figure(one,[{id:p.speciesId,name:p.name}]);
    el(info,'span','spirit-catalog-number','#'+p.speciesId+'　'+p.types.join(' / '));
    el(info,'h3','spirit-name',p.name+'　Lv.'+p.level);
    el(info,'p','',({field:'在湿地遇见',random:'沿岸步行时遇见',tree:'从树上引出',fish:'从湖中钓起',bear:'闪光晶石引来'})[enc.method]||'捕猎场遭遇');
    el(info,'p','spirit-sub','第 '+enc.turn+' 回合　·　'+(area==='wetland'?'精灵会观望，也可能逃走。':'返回湿地继续本场遭遇。'));
    const actions=el(host,'div','spirit-actions');
    for(const [op,label] of [['throw','投掷'],['feed','喂食'],['capture','捕捉'],['flee','撤离遭遇']])
      button(actions,label,()=>apply(op),{primary:op==='capture',disabled:area!=='wetland',action:'safari-'+op});
    button(actions,'与'+p.name+'交流',()=>chatWith(p,'wild'),{action:'chat'});
  }else{
    el(host,'h3','','场内探访');
    el(host,'p','','收起终端可在场内走动。靠近野外精灵、钓竿、湖岸或树木后，点取对应目标或按 E。');
    el(host,'p','spirit-sub','沿岸走动也会遇到随机精灵，集齐五枚闪光晶石可找汤尼熊。');
  }
  button(host,'退出本场',()=>apply('exit'),{action:'safari-exit'});
}
function safariRemaining(deadline){
  const seconds=Math.max(0,Math.ceil((deadline-Date.now())/1000));
  return '剩余 '+Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
}
