// Local crew communications. This fragment lives inside the viewer IIFE.
// No window exports, browser storage, polling, or model think overrides.
function createCrewDialogue(adapter) {
  const uid='seer-comms-'+Math.random().toString(36).slice(2,10);
  const scope='[data-seer-comms="'+uid+'"]';
  const host=document.createElement('div');
  host.dataset.seerComms=uid;
  const style=document.createElement('style');
  style.textContent=`
${scope}{position:absolute;inset:0;z-index:45;pointer-events:none;color:#e6edf2;font:14px/1.45 "Segoe UI","Microsoft YaHei",sans-serif;letter-spacing:normal;text-align:left}
${scope}[data-spirit-chat]{pointer-events:auto;background:#08101c55}
${scope} *{box-sizing:border-box}
${scope} [hidden]{display:none!important}
${scope} button,${scope} select,${scope} textarea{font:inherit;color:inherit;letter-spacing:normal}
${scope} button{cursor:pointer;touch-action:manipulation}
${scope} button:disabled,${scope} select:disabled{cursor:default;opacity:.48}
${scope} button:focus-visible,${scope} select:focus-visible,${scope} textarea:focus-visible,${scope} summary:focus-visible{outline:2px solid #9de5ee;outline-offset:2px}
${scope} .sc-btn{border:1px solid #456173;border-radius:6px;padding:6px 10px;background:#213a49;min-height:32px}
${scope} .sc-btn:hover:enabled{border-color:#8ec8d4;background:#294b5b}
${scope} .sc-launch{position:absolute;right:12px;top:12px;pointer-events:auto;box-shadow:0 2px 12px #06101b77}
${scope} .sc-panel{position:absolute;right:10px;top:10px;bottom:10px;width:min(430px,calc(100% - 20px));pointer-events:auto;display:flex;flex-direction:column;gap:8px;padding:14px;background:#14232ff5;border:1px solid #4e7186;border-radius:10px;box-shadow:0 8px 28px #050b1488;overflow:auto;overscroll-behavior:contain;min-height:0}
${scope} .sc-head,${scope} .sc-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
${scope} .sc-head{justify-content:space-between;flex-shrink:0}
${scope} .sc-title{margin:0;font-size:18px;font-weight:600;color:#edf6fa}
${scope} .sc-controls{display:flex;flex-direction:column;gap:7px;flex-shrink:0}
${scope} .sc-field{display:flex;align-items:center;gap:8px;min-width:0;flex:1}
${scope} .sc-field>span{white-space:nowrap;color:#b7cbd7}
${scope} select{min-width:0;max-width:100%;width:100%;border:1px solid #3d5b6f;border-radius:5px;background:#142b3b;padding:6px;min-height:32px}
${scope} .sc-model{font-size:12px}
${scope} .sc-status,${scope} .sc-place,${scope} .sc-identity{margin:0;color:#aec5d5;font-size:12px;overflow-wrap:anywhere}
${scope} .sc-status[data-tone="error"]{color:#ffbfa8}
${scope} .sc-status[data-tone="ready"]{color:#a5dfc5}
${scope} .sc-error{margin:0;padding:8px;border:1px solid #966a51;border-radius:5px;color:#ffd6b7;background:#513a2b55;font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere}
${scope} .sc-facts{font-size:12px;color:#c7d7e0;flex-shrink:0}
${scope} .sc-facts>summary{cursor:pointer;color:#a9dce6}
${scope} .sc-factbody{max-height:145px;overflow:auto;padding:4px 1px 0;overscroll-behavior:contain}
${scope} .sc-factbody h4{font-size:12px;margin:7px 0 3px;color:#e2ecf1}
${scope} .sc-factbody p{margin:3px 0;white-space:pre-wrap;overflow-wrap:anywhere}
${scope} .sc-factbody ul{padding-left:18px;margin:3px 0}
${scope} .sc-factbody li{margin:5px 0}
${scope} .sc-offline p{margin:0 0 10px}
${scope} .sc-offline code{display:block;padding:8px;background:#0c1b27;word-break:break-all}
${scope} .sc-offline a{color:#a9dce6}
${scope} .sc-log{flex:1;min-height:60px;overflow:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:10px;padding:2px 4px 2px 0;scrollbar-width:thin}
${scope} .sc-empty{margin:auto 10px;color:#9db6c7;text-align:center;font-size:13px}
${scope} .sc-message{margin:0;padding:9px 11px;background:#213747;border:1px solid #355264;border-radius:8px;overflow-wrap:anywhere}
${scope} .sc-message[data-role="user"]{margin-left:24px;background:#24454d;border-color:#406871}
${scope} .sc-message[data-role="assistant"]{margin-right:12px}
${scope} .sc-speaker{font-size:11px;color:#accbd9;margin:0 0 4px}
${scope} .sc-content{margin:0;white-space:pre-wrap;line-height:1.55}
${scope} .sc-note{margin:6px 0 0;font-size:11px;color:#9fb6c6}
${scope} .sc-sources{font-size:11px;color:#aec5d5;margin-top:6px}
${scope} .sc-sources summary{cursor:pointer}
${scope} .sc-sources a{color:#92d9e7;text-decoration:underline;display:block;overflow-wrap:anywhere;margin-top:3px}
${scope} .sc-sources p{margin:3px 0}
${scope} .sc-compose{display:flex;flex-direction:column;gap:7px;flex-shrink:0;margin:0}
${scope} textarea{resize:vertical;min-height:62px;max-height:145px;width:100%;padding:9px;border:1px solid #486376;border-radius:6px;background:#0c1b27;line-height:1.45}
${scope} .sc-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
${scope} .sc-hint{font-size:11px;color:#91aab9;margin:0;flex:1}
${scope} .sc-primary{background:#286278;border-color:#5997a9}
@media(max-height:550px){${scope} .sc-panel{gap:6px;padding:10px}${scope} .sc-facts .sc-factbody{max-height:88px}${scope} textarea{min-height:44px;max-height:80px}${scope} .sc-controls{gap:4px}}
`;
  host.appendChild(style);
  const make=(tag,cls,parent,value)=>{
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(value!==undefined)node.textContent=String(value);
    if(parent)parent.appendChild(node);
    return node;
  };
  const button=(parent,label,cls='')=>{
    const node=make('button','sc-btn '+cls,parent,label);node.type='button';return node;
  };
  const launch=root.querySelector('[data-comms]');
  const panel=make('section','sc-panel',host);
  panel.id=uid;panel.hidden=true;panel.setAttribute('role','dialog');
  panel.setAttribute('aria-label','舰上通讯');panel.setAttribute('aria-modal','false');
  launch.setAttribute('aria-controls',uid);launch.setAttribute('aria-expanded','false');
  const head=make('div','sc-head',panel);
  const title=make('h3','sc-title',head,'舰上通讯');
  const closeButton=button(head,'关闭');
  closeButton.setAttribute('aria-label','关闭舰上通讯');
  const offlineGuide=make('div','sc-offline',panel);
  make('p','',offlineGuide,'舰上角色和精灵通讯使用这台电脑上的 Ollama。请在项目目录双击「启动舰上通讯.cmd」，或运行以下命令。');
  make('code','',offlineGuide,'python src/ai/server.py --open');
  const localLink=make('a','',offlineGuide,'服务已启动？打开本地登舰通讯版');
  localLink.href='http://127.0.0.1:8765/play';localLink.target='_blank';localLink.rel='noopener noreferrer';
  const controls=make('div','sc-controls',panel);
  const peopleRow=make('div','sc-row',controls);
  const peopleLabel=make('label','sc-field',peopleRow);
  make('span','',peopleLabel,'联系');
  const people=make('select','',peopleLabel);people.setAttribute('aria-label','选择通讯对象');
  const refreshNearby=button(peopleRow,'附近船员');
  const identity=make('p','sc-identity',controls,'选择职务角色，或与附近的船员交谈。');
  const place=make('p','sc-place',controls);
  const modelRow=make('div','sc-row',controls);
  const modelLabel=make('label','sc-field sc-model',modelRow);
  make('span','',modelLabel,'模型');
  const models=make('select','',modelLabel);models.setAttribute('aria-label','本地模型');
  const reconnect=button(modelRow,'重连');
  const modelStatus=make('p','sc-status',controls,'打开后连接本地模型。');
  modelStatus.setAttribute('role','status');modelStatus.setAttribute('aria-live','polite');
  const problem=make('p','sc-error',controls);problem.hidden=true;problem.setAttribute('role','alert');
  const facts=make('details','sc-facts',panel);
  const factsTitle=make('summary','',facts,'组织与角色资料');
  const factBody=make('div','sc-factbody',facts);
  const log=make('div','sc-log',panel);log.setAttribute('role','log');
  log.setAttribute('aria-label','当前通讯记录');log.setAttribute('aria-live','off');log.tabIndex=0;
  const phase=make('p','sc-status',panel,'');phase.setAttribute('role','status');phase.setAttribute('aria-live','polite');
  const form=make('form','sc-compose',panel);
  const input=make('textarea','',form);input.rows=2;input.maxLength=8000;
  input.placeholder='向当前角色提问…';input.setAttribute('aria-label','通讯消息');
  const actions=make('div','sc-actions',form);
  const send=button(actions,'发送','sc-primary');send.type='submit';
  const stop=button(actions,'停止');stop.disabled=true;
  const retry=button(actions,'重试上次提问');retry.hidden=true;
  const fresh=button(actions,'新会话');fresh.title='只清空当前联系人的内存对话';
  make('p','sc-hint',actions,'Enter 发送 · Shift+Enter 换行');
  (root.querySelector('.seer-stage')||root).appendChild(host);

  const localGame=location.protocol==='http:' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname) &&
    /^\/play\/?$/.test(location.pathname) && window.origin===location.origin;
  offlineGuide.hidden=localGame;
  for(const element of [controls,facts,log,phase,form])element.hidden=!localGame;
  host.hidden=true;
  const requestedModel='qwen3.5:9b';
  let selectedModel=requestedModel,modelChanged=false,characters=[],organization=[];
  let thinkingOffModel=null;
  let availableModels=new Set();
  let genericCharacter=null,currentKey='',serviceReady=false,catalogReady=false,disposed=false;
  let spirit=null,boarded=false,afterSpirit=null,spiritOpener=null;
  let connectRequest=null,activeRequest=null,followBottom=true;
  const targets=new Map(),sessions=new Map(),knownCrew=new Map();
  const startupHint='请在项目目录运行 python src/ai/server.py --open，再点击“重连”。';

  function readContext() {
    try{return adapter.context()||{};}catch(_){return {};}
  }
  function stopMovement() { adapter.stopMovement?.();adapter.requestFrame?.(); }
  function showProblem(message) {problem.textContent=message||'';problem.hidden=!message;}
  function setPhase(message,tone='') {phase.textContent=message;phase.dataset.tone=tone;}
  function modelCaption() {
    const caption=(serviceReady?'Ollama 可用 · 已安装 ':'所选模型 · ')+selectedModel;
    return serviceReady&&thinkingOffModel===selectedModel?caption+' · 思考已关闭':caption;
  }
  function sessionFor(key=currentKey) {
    if(!sessions.has(key))sessions.set(key,{messages:[],draft:'',retry:null});
    return sessions.get(key);
  }
  function trimHistory(session) {
    while(session.messages.length>16)session.messages.shift();
    if(session.messages[0]?.role==='assistant')session.messages.shift();
  }
  function describe(value,depth=0) {
    if(value===null||value===undefined||depth>3)return '';
    if(typeof value==='string'||typeof value==='number')return String(value).trim();
    if(typeof value==='boolean')return value?'是':'否';
    if(Array.isArray(value))return value.map(item=>describe(item,depth+1)).filter(Boolean).join('；');
    if(typeof value==='object') {
      const primary=value.text||value.summary||value.description||value.claim||value.fact;
      if(primary)return describe(primary,depth+1);
      const heading=[value.name,value.title||value.role].filter(Boolean).map(item=>describe(item,depth+1)).join(' · ');
      if(heading)return heading;
      return Object.values(value).map(item=>describe(item,depth+1)).filter(Boolean).join('；');
    }
    return '';
  }
  function lines(parent,value,empty) {
    const items=Array.isArray(value)?value:[value];
    let count=0;
    for(const item of items) {
      const text=describe(item);
      if(text){make('p','',parent,text);count++;}
    }
    if(!count&&empty)make('p','',parent,empty);
  }
  function appendSources(parent,sources) {
    if(!Array.isArray(sources)||!sources.length)return;
    const details=make('details','sc-sources',parent);make('summary','',details,'资料出处');
    for(const item of sources) {
      const raw=typeof item==='string'?item:item?.url||item?.href||'';
      const label=typeof item==='string'?item:describe(item?.title||item?.name||item?.label||item?.text)||'资料来源';
      let url;
      try{url=new URL(raw);}catch(_){}
      if(url&&/^https?:$/.test(url.protocol)) {
        const link=make('a','',details,label);link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';
      }else make('p','',details,label);
    }
  }
  function renderOrganization(parent) {
    const tree=make('details','',parent);
    make('summary','',tree,'查看舰上组织与外部联系');
    function branch(parentId,container) {
      const nodes=organization.filter(item=>item.parentId===parentId);
      if(!nodes.length)return;
      const list=make('ul','',container);
      for(const item of nodes){
        const row=make('li','',list),details=make('details','',row);
        make('summary','',details,item.name+' · '+(item.basis==='source'?'原作组织':'项目分工'));
        if(item.description)make('p','',details,item.description);
        const members=characters.filter(person=>person.departmentId===item.id&&!person.generic);
        if(members.length)make('p','',details,'可联系：'+members.map(person=>person.name).join('、'));
        appendSources(details,item.sources);
        branch(item.id,row);
      }
    }
    branch(null,tree);
  }
  function renderFacts() {
    factBody.replaceChildren();
    const target=targets.get(currentKey),character=target?.character;
    if(spirit){
      make('p','',factBody,'图鉴 '+String(spirit.speciesId).padStart(3,'0')+' · '+spirit.name+
        (spirit.type?' · '+spirit.type:''));
      if(spirit.level&&spirit.bond!=='dex')make('p','',factBody,'等级 '+spirit.level+
        (Number.isInteger(spirit.hp)&&Number.isInteger(spirit.maxHp)?' · 体力 '+spirit.hp+'/'+spirit.maxHp:''));
      return;
    }
    renderOrganization(factBody);
    if(!character)return;
    const department=organization.find(item=>item.id===character.departmentId);
    make('h4','',factBody,department?department.name:character.title);
    make('p','',factBody,character.title);
    if(target.crewId)make('p','',factBody,'普通岗位船员 · 编号 '+target.crewId+' · '+target.role);
    make('h4','',factBody,'已知事实');
    lines(factBody,character.facts,'该岗位暂没有登记的原作事实。');
    if(character.expertise){make('h4','',factBody,'负责领域');lines(factBody,character.expertise);}
    appendSources(factBody,character.sources);
  }
  function renderHistory() {
    log.replaceChildren();followBottom=true;
    const target=targets.get(currentKey),session=currentKey?sessionFor():null;
    if(!session?.messages.length) {
      make('p','sc-empty',log,target?'通讯就绪后，向'+target.label+'说一句话。':'正在准备通讯对象。');
    }else for(const message of session.messages) {
      const article=make('article','sc-message',log);article.dataset.role=message.role;
      make('p','sc-speaker',article,message.role==='user'?'你':target?.label||'通讯回复');
      const content=make('p','sc-content',article,message.content||'等待回复…');
      if(activeRequest?.assistant===message)activeRequest.contentNode=content;
      if(message.notice)make('p','sc-note',article,message.notice);
      appendSources(article,message.sources);
    }
    log.scrollTop=log.scrollHeight;
  }
  function queuePaint(request) {
    if(request.paintFrame||disposed)return;
    request.paintFrame=requestAnimationFrame(()=>{
      request.paintFrame=0;
      if(disposed||activeRequest!==request||request.key!==currentKey)return;
      if(request.contentNode)request.contentNode.textContent=request.assistant.content||'等待回复…';
      if(followBottom)log.scrollTop=log.scrollHeight;
    });
  }
  function updateControls() {
    const hasTarget=targets.has(currentKey),busy=Boolean(activeRequest);
    send.disabled=!serviceReady||!hasTarget||busy||!input.value.trim();
    retry.hidden=!hasTarget||!sessions.get(currentKey)?.retry;retry.disabled=busy||!serviceReady;
    stop.disabled=!busy;fresh.disabled=!hasTarget;
    input.disabled=!hasTarget;models.disabled=busy||Boolean(connectRequest);
    refreshNearby.disabled=!catalogReady;
  }
  function crewLabel(crew) {
    return (String(crew.role||'船员'))+' · '+String(crew.id);
  }
  function rebuildTargets(preferNearby=false) {
    if(spirit){
      const key='spirit:'+spirit.speciesId+':'+spirit.bond+':'+(spirit.uid||'');
      targets.clear();targets.set(key,{key,character:{id:'spirit:'+spirit.speciesId},label:spirit.name});
      people.replaceChildren(new Option(spirit.name,key));selectTarget(key);
      place.textContent=spirit.location?'当前位置：'+spirit.location:'';
      return;
    }
    const context=readContext(),nearby=context.nearby;
    const availableCrew=new Map(knownCrew);
    if(nearby?.id!==undefined&&nearby?.id!==null&&genericCharacter) {
      const id=String(nearby.id);
      if(!availableCrew.has(id))availableCrew.set(id,{id,role:String(nearby.role||'船员'),zone:nearby.zone});
    }
    const previous=currentKey;
    targets.clear();people.replaceChildren();
    const namedGroup=make('optgroup','',people);namedGroup.label='职务通讯';
    for(const character of characters) {
      if(character===genericCharacter)continue;
      const key='character:'+character.id;
      const label=[character.name,character.title].filter(Boolean).join(' · ')||character.id;
      targets.set(key,{key,character,label});
      const option=make('option','',namedGroup,label+(character.aboard===false?'（远程）':''));option.value=key;
    }
    if(availableCrew.size&&genericCharacter) {
      const group=make('optgroup','',people);group.label='岗位船员通讯';
      for(const crew of availableCrew.values()) {
        const key='crew:'+crew.id,label=crewLabel(crew);
        targets.set(key,{key,character:genericCharacter,crewId:crew.id,role:crew.role,zone:crew.zone,label});
        const isNearby=nearby&&String(nearby.id)===crew.id;
        const option=make('option','',group,(isNearby?'附近 · ':'已联系 · ')+label);option.value=key;
      }
    }
    const nearbyKey=nearby?.id!==undefined?'crew:'+String(nearby.id):'';
    const local=characters.find(character=>character!==genericCharacter&&character.roomId===context.roomId&&character.aboard!==false);
    const desired=preferNearby&&targets.has(nearbyKey)?nearbyKey:
      targets.has(previous)?previous:local?'character:'+local.id:targets.keys().next().value||'';
    selectTarget(desired);
    const locationLabel=typeof context.location==='string'?context.location:describe(context.location);
    place.textContent=locationLabel?'当前位置：'+locationLabel:'';
    refreshNearby.title=nearby?.id!==undefined?'联系附近的'+String(nearby.role||'船员'):'刷新附近可交谈的船员';
    if(preferNearby&&!nearby)setPhase('附近暂没有可联系的船员，可使用职务通讯。');
  }
  function selectTarget(key) {
    if(currentKey&&currentKey!==key)sessionFor().draft=input.value;
    if(key!==currentKey){cancelGeneration('回复已停止');showProblem('');}
    currentKey=targets.has(key)?key:'';people.value=currentKey;
    const target=targets.get(currentKey);
    if(target?.crewId)knownCrew.set(target.crewId,{id:target.crewId,role:target.role,zone:target.zone});
    identity.textContent=spirit?(spirit.bond==='owned'?'伙伴':spirit.bond==='wild'?'野外相遇':'图鉴模拟')+' · '+spirit.name:
      target?target.crewId?'岗位船员通讯 · '+target.label:
      '职务通讯 · '+target.label+(target.character.aboard===false?' · 远程联络':''):'';
    input.value=currentKey?sessionFor().draft:'';
    input.placeholder=target?'向'+target.label+'提问…':'等待取得通讯对象…';
    if(!activeRequest)setPhase('');
    renderFacts();renderHistory();updateControls();
  }
  function setModelOptions(data) {
    models.replaceChildren();
    const names=Array.isArray(data?.models)?data.models.map(model=>typeof model==='string'?model:model?.name).filter(name=>typeof name==='string'&&name):[];
    availableModels=new Set(names);
    // The local launcher's selected model takes priority over tag order.
    if(!modelChanged)selectedModel=availableModels.has(data?.selected)?data.selected:requestedModel;
    if(!names.includes(selectedModel)) {
      const option=make('option','',models,data?selectedModel+'（未安装）':selectedModel);option.value=selectedModel;
    }
    for(const name of new Set(names)) {const option=make('option','',models,name);option.value=name;}
    models.value=selectedModel;
  }
  setModelOptions(null);
  async function checkedFetch(path,options) {
    if(!localGame)throw new Error('请使用本地登舰通讯版。');
    const response=await fetch(path,{credentials:'same-origin',mode:'same-origin',redirect:'error',...options});
    if(!response.ok) {
      let detail='';
      try{const data=await response.json();detail=typeof data.message==='string'?data.message:typeof data.error==='string'?data.error:'';}catch(_){}
      throw new Error(detail||'通讯服务返回 HTTP '+response.status+'。');
    }
    return response;
  }
  function abortConnect() {
    if(!connectRequest)return;
    const request=connectRequest;connectRequest=null;
    clearTimeout(request.timer);request.controller.abort();
  }
  async function connect() {
    if(disposed||!localGame||panel.hidden)return;
    cancelGeneration('回复已停止');abortConnect();
    const controller=new AbortController();
    const request={controller,timedOut:false,timer:0};connectRequest=request;
    request.timer=setTimeout(()=>{request.timedOut=true;controller.abort();},15000);
    serviceReady=false;modelStatus.textContent='正在连接本地通讯服务…';modelStatus.dataset.tone='';
    showProblem('');updateControls();
    try {
      const results=await Promise.allSettled([spirit?null:'/api/catalog','/api/health','/api/models'].map(async path=>{
        if(!path)return null;
        const response=await checkedFetch(path,{signal:controller.signal});return response.json();
      }));
      if(disposed||connectRequest!==request||panel.hidden)return;
      const [catalogResult,healthResult,modelsResult]=results;
      if(!spirit&&catalogResult.status==='fulfilled') {
        const data=catalogResult.value;
        if(!Array.isArray(data?.characters))throw new Error('角色目录格式不完整，请重连。');
        const seen=new Set();
        characters=data.characters.filter(character=>{
          if(!character||typeof character.id!=='string'||seen.has(character.id))return false;
          seen.add(character.id);return true;
        });
        organization=Array.isArray(data.organization)?data.organization:[];catalogReady=true;
        genericCharacter=characters.find(character=>character.generic===true||character.id==='crew')||null;
        rebuildTargets();
      }
      if(modelsResult.status==='fulfilled')setModelOptions(modelsResult.value);
      const health=healthResult.status==='fulfilled'?healthResult.value:null;
      thinkingOffModel=health?.thinking===false?health.model:null;
      const needsModel=modelsResult.status==='fulfilled'&&!availableModels.has(selectedModel);
      const oldSpiritService=Boolean(spirit&&health&&!health.spiritChat);
      serviceReady=Boolean((spirit||catalogResult.status==='fulfilled'&&catalogReady)&&health?.ok&&health?.ollamaAvailable&&
        modelsResult.status==='fulfilled'&&!needsModel&&!oldSpiritService);
      if(serviceReady) {
        modelStatus.textContent=modelCaption();modelStatus.dataset.tone='ready';
        showProblem('');
      }else {
        modelStatus.textContent=health?'通讯服务已连接 · 本地模型尚未就绪':'通讯服务未连接';modelStatus.dataset.tone='error';
        const failed=results.find(result=>result.status==='rejected');
        const detail=failed?.reason?.message;
        showProblem(request.timedOut?'连接超时。'+startupHint:
          !health?startupHint:oldSpiritService?'旧版舰上通讯仍在运行。请关闭旧服务后重新双击「启动舰上通讯.cmd」。':
          !health.ollamaAvailable?'Ollama 尚未连接。启动 Ollama 后点击“重连”。':
          needsModel?'本机暂未提供 '+selectedModel+'。请确认模型已安装，再点击“重连”。':detail||'未能取全通讯资料，请点击“重连”。');
      }
    }catch(error) {
      if(connectRequest!==request||disposed||panel.hidden)return;
      serviceReady=false;modelStatus.textContent='通讯连接未完成';modelStatus.dataset.tone='error';
      showProblem((request.timedOut?'连接超时。':error?.message||'连接失败。')+' '+startupHint);
    }finally {
      clearTimeout(request.timer);
      if(connectRequest===request){connectRequest=null;updateControls();}
    }
  }
  function finishMessage(request,notice) {
    if(!request.assistant.content.trim()) {
      const index=request.session.messages.indexOf(request.assistant);
      if(index!==-1)request.session.messages.splice(index,1);
    }else if(notice)request.assistant.notice=notice;
    request.session.retry=notice||!request.assistant.content.trim()?request.user:null;
    request.assistant.complete=!request.session.retry;
    trimHistory(request.session);
  }
  function cancelGeneration(message='回复已停止') {
    if(!activeRequest)return;
    const request=activeRequest;activeRequest=null;request.controller.abort();
    finishMessage(request,message);
    if(request.paintFrame)cancelAnimationFrame(request.paintFrame);
    if(!disposed&&request.key===currentKey){renderHistory();setPhase(message);}
    if(!disposed)updateControls();
  }
  function recentHistory(session,currentUser) {
    const context=[{role:'user',content:currentUser.content}];
    let budget=30000-currentUser.content.length;
    for(let i=session.messages.lastIndexOf(currentUser)-1;i>0;i--){
      const answer=session.messages[i],question=session.messages[i-1];
      if(answer.role!=='assistant'||!answer.complete||question.role!=='user')continue;
      const reply=answer.content.slice(0,8000),cost=reply.length+question.content.length;
      if(cost>budget||context.length+2>15)break;
      context.unshift({role:'user',content:question.content},{role:'assistant',content:reply});
      budget-=cost;i--;
    }
    return context;
  }
  async function submitMessage(repeat=false) {
    const target=targets.get(currentKey);
    if(!target||activeRequest||!serviceReady||disposed||panel.hidden)return;
    const session=sessionFor();
    const textValue=repeat?session.retry?.content:input.value.trim();
    if(!textValue)return;
    stopMovement();showProblem('');
    const user=repeat?session.retry:{role:'user',content:textValue};
    if(repeat){
      const index=session.messages.indexOf(user);
      if(index<0)return;
      session.messages.splice(index+1);
    }else{
      session.messages.push(user);session.draft='';input.value='';
    }
    session.retry=null;
    const messages=recentHistory(session,user);
    const assistant={role:'assistant',content:''};session.messages.push(assistant);trimHistory(session);
    const controller=new AbortController();
    const request={controller,key:currentKey,session,user,assistant,contentNode:null,paintFrame:0};activeRequest=request;
    renderHistory();updateControls();setPhase('正在载入模型…');
    let reader=null,gotDone=false;
    const isCurrent=()=>!disposed&&activeRequest===request&&!controller.signal.aborted;
    try {
      const sceneInfo=readContext(),context=spirit?{speciesId:spirit.speciesId,bond:spirit.bond,
        location:spirit.location,level:spirit.level,hp:spirit.hp,maxHp:spirit.maxHp,moves:spirit.moves}:
        {roomId:sceneInfo.roomId,location:sceneInfo.location};
      if(target.crewId){
        context.crewId=target.crewId;
        context.nearby={id:target.crewId,role:target.role,zone:target.zone};
        context.contactInRange=adapter.inRange(target.crewId);
      }
      const response=await checkedFetch('/api/chat',{
        method:'POST',signal:controller.signal,
        headers:{'Content-Type':'application/json','Accept':'application/x-ndjson'},
        body:JSON.stringify({characterId:target.character.id,model:selectedModel,messages,context})
      });
      if(!isCurrent())return;
      if(!response.body)throw new Error('浏览器未能读取流式回复，请用本地登舰通讯版重开。');
      reader=response.body.getReader();
      const decoder=new TextDecoder();let pending='';
      const acceptLine=line=>{
        if(!line.trim()||!isCurrent()||gotDone)return;
        let event;
        try{event=JSON.parse(line);}catch(_){throw new Error('通讯响应格式有误，请重连后再试。');}
        if(event.type==='status') {
          if(event.phase==='thinking'){
            thinkingOffModel=null;modelStatus.textContent=modelCaption();setPhase('正在思考…');
          }
          else if(event.phase==='loading')setPhase('正在载入模型…');
        }else if(event.type==='token'&&typeof event.content==='string') {
          // Only response content is rendered. Thought traces are never displayed.
          assistant.content+=event.content;setPhase('正在回复…');queuePaint(request);
        }else if(event.type==='done') {
          gotDone=true;assistant.sources=Array.isArray(event.sources)?event.sources:[];
          if(typeof event.model==='string')assistant.model=event.model;
        }else if(event.type==='error')throw new Error(typeof event.message==='string'?event.message:'本地模型未能完成回复。');
      };
      while(isCurrent()&&!gotDone) {
        const part=await reader.read();
        if(!isCurrent())return;
        pending+=decoder.decode(part.value||new Uint8Array(),{stream:!part.done});
        let newline;
        while((newline=pending.indexOf('\n'))!==-1) {
          const line=pending.slice(0,newline);pending=pending.slice(newline+1);acceptLine(line);
          if(gotDone)break;
        }
        if(pending.length>1024*1024)throw new Error('通讯响应异常，请重连后再试。');
        if(part.done){if(pending.trim())acceptLine(pending);break;}
      }
      if(!isCurrent())return;
      if(!gotDone)throw new Error('回复连接提前中断，请重新发送或点击“重连”。');
      finishMessage(request,'');activeRequest=null;
      renderHistory();setPhase(assistant.content.trim()?'回复完成。':'模型没有返回正文，可换个问题重试。');
    }catch(error) {
      if(!isCurrent())return;
      finishMessage(request,'回复未完成');activeRequest=null;
      renderHistory();setPhase('回复未完成。','error');
      const networkError=error instanceof TypeError;
      if(networkError){serviceReady=false;modelStatus.textContent='通讯连接已中断';modelStatus.dataset.tone='error';}
      showProblem(networkError?'未能连接通讯服务。'+startupHint:error?.message||'通讯失败，请重试。');
    }finally {
      if(reader){try{await reader.cancel();}catch(_){}try{reader.releaseLock();}catch(_){}}
      if(request.paintFrame)cancelAnimationFrame(request.paintFrame);
      if(activeRequest===request)activeRequest=null;
      if(!disposed)updateControls();
    }
  }
  function openPanel() {
    if(disposed||host.hidden)return;
    title.textContent=spirit?'精灵通讯':'舰上通讯';
    factsTitle.textContent=spirit?'本次精灵资料':'组织与角色资料';
    host.toggleAttribute('data-spirit-chat',Boolean(spirit));panel.setAttribute('aria-modal',String(Boolean(spirit)));
    peopleRow.hidden=Boolean(spirit);panel.setAttribute('aria-label',title.textContent);
    closeButton.setAttribute('aria-label','关闭'+title.textContent);
    stopMovement();panel.hidden=false;launch.hidden=true;launch.setAttribute('aria-expanded','true');
    if(!localGame){closeButton.focus({preventScroll:true});return;}
    if(spirit||catalogReady)rebuildTargets();
    (input.disabled?closeButton:input).focus({preventScroll:true});connect();
  }
  function closePanel(restoreFocus=true) {
    if(panel.hidden)return;
    if(currentKey)sessionFor().draft=input.value;
    cancelGeneration('回复已停止');abortConnect();stopMovement();
    const callback=afterSpirit,previousOpener=spiritOpener;
    if(spirit){spirit=null;afterSpirit=null;spiritOpener=null;currentKey='';input.value='';}
    panel.hidden=true;launch.hidden=false;launch.setAttribute('aria-expanded','false');
    host.removeAttribute('data-spirit-chat');
    host.hidden=!boarded;
    if(restoreFocus){
      if(callback)callback();
      if(!callback||!document.activeElement||document.activeElement===document.body||host.contains(document.activeElement)){
        const focus=previousOpener?.isConnected&&previousOpener.getClientRects().length?previousOpener:
          (boarded?root.querySelector('[data-console="terminal"]'):root.querySelector('canvas'));
        focus?.focus({preventScroll:true});
      }
    }
    adapter.requestFrame?.();
  }
  launch.addEventListener('click',openPanel);
  closeButton.addEventListener('click',()=>closePanel());
  reconnect.addEventListener('click',connect);
  refreshNearby.addEventListener('click',()=>{if(currentKey)sessionFor().draft=input.value;rebuildTargets(true);});
  people.addEventListener('change',()=>selectTarget(people.value));
  models.addEventListener('change',()=>{
    selectedModel=models.value;modelChanged=true;
    modelStatus.textContent=modelCaption();
  });
  form.addEventListener('submit',event=>{event.preventDefault();submitMessage();});
  stop.addEventListener('click',()=>cancelGeneration());
  retry.addEventListener('click',()=>submitMessage(true));
  fresh.addEventListener('click',()=>{
    cancelGeneration();if(!currentKey)return;
    const session=sessionFor();session.messages=[];session.draft='';session.retry=null;input.value='';
    showProblem('');setPhase('已开始当前联系人的新会话。');renderHistory();updateControls();input.focus({preventScroll:true});
  });
  input.addEventListener('input',()=>{if(currentKey)sessionFor().draft=input.value;updateControls();});
  input.addEventListener('keydown',event=>{
    if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&event.keyCode!==229) {
      event.preventDefault();submitMessage();
    }
  });
  log.addEventListener('scroll',()=>{followBottom=log.scrollHeight-log.scrollTop-log.clientHeight<60;},{passive:true});
  host.addEventListener('focusin',stopMovement);
  host.addEventListener('pointerdown',event=>{event.stopPropagation();stopMovement();});
  host.addEventListener('click',event=>{if(spirit&&event.target===host)closePanel();});
  host.addEventListener('wheel',event=>event.stopPropagation(),{passive:true});
  // Bubble isolation prevents both walking controls and the viewer Escape key
  // from handling text, select keys or the panel's close action.
  host.addEventListener('keydown',event=>{
    event.stopPropagation();
    if(event.key==='Escape'&&!event.isComposing&&!panel.hidden){event.preventDefault();closePanel();}
    if(spirit&&event.key==='Tab'){
      const controls=[...panel.querySelectorAll('button:enabled,select:enabled,textarea:enabled,a[href],summary,[tabindex="0"]')]
        .filter(node=>node.getClientRects().length);
      const first=controls[0],last=controls.at(-1);
      if(first&&event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(last&&!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  host.addEventListener('keyup',event=>event.stopPropagation());
  updateControls();renderHistory();
  return {
    get isOpen(){return !panel.hidden;},
    openSpirit(context,onClose=null){
      if(disposed||!context||!Number.isSafeInteger(context.speciesId)||context.speciesId<=0||!context.name)return false;
      if(!panel.hidden)closePanel(false);
      spirit={...context,moves:(Array.isArray(context.moves)?context.moves:[]).map(m=>typeof m==='string'?m:m?.name).filter(Boolean).slice(0,4)};
      spiritOpener=document.activeElement;afterSpirit=typeof onClose==='function'?onClose:null;
      host.hidden=false;openPanel();return true;
    },
    close(){closePanel(false);},
    setBoarded(value){boarded=value;if(!boarded)closePanel(false);host.hidden=!boarded;},
    dispose() {
      if(disposed)return;
      disposed=true;cancelGeneration();abortConnect();
      sessions.clear();targets.clear();knownCrew.clear();host.remove();
    }
  };
}
