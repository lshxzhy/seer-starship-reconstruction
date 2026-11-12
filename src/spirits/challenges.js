// One record per field boss. A player's evolved partner keeps its own stats.
const SPT_CHALLENGES=new Map([
  [47,{planet:'klose',site:'forest',level:10,hp:100,bankedXP:3000,partner:46}],
  [34,{planet:'ocean',site:'ocean-floor',level:25,hp:200,blackCrystal:1}],
  [88,{planet:'alpha',site:'alpha-rock',level:50,hp:1200,partner:86,bankedXP:8000,
    moves:[10248,10242,20078,20041],
    description:'地面系首领，准备水、草或冰系招式，并留意它的恢复技能。',
    projectRule:'双子星游览挑战：等级、体力和经验奖励采用本项目规则，使用普通回合对战；首胜伙伴只领取一次。'}],
  [113,{planet:'beta',site:'beta-waste',level:70,hp:1600,partner:111,bankedXP:12000,
    moves:[10336,10331,20145,20073],
    description:'机械系首领，准备火、战斗或地面系招式；属性复制会临时改变它的属性。',
    projectRule:'双子星游览挑战：等级、体力和经验奖励采用本项目规则，使用普通回合对战；首胜伙伴只领取一次。'}]
]);
// Spawn levels are an exploration progression, not a claim about every era of
// the original server. Capture eligibility still comes from the client table.
const TWIN_ENCOUNTERS=new Map([
  [89,{site:'alpha-springs',level:15}],[90,{site:'alpha-springs',level:30}],
  [91,{site:'alpha-springs',level:10}],[188,{site:'alpha-rock',level:18}],
  [189,{site:'alpha-rock',level:30}],[97,{site:'alpha-station',level:16}],
  [98,{site:'alpha-station',level:25}],[119,{site:'beta-plain',level:15}],
  [120,{site:'beta-plain',level:25}],[184,{site:'beta-ruins',level:20}],
  [185,{site:'beta-ruins',level:30}],[105,{site:'beta-waste',level:16}],
  [106,{site:'beta-waste',level:25}]
]);
