// The standalone game's sandboxed iframe delegates saves to its outer document.
// The loopback game uses the same revision check directly in its own origin.
function openSpiritStorage(){
  const key='seer.spirits.v1';
  function read(){
    const raw=localStorage.getItem(key);
    if(!raw)return {revision:0,data:null};
    const record=JSON.parse(raw);
    if(!Number.isSafeInteger(record?.revision)||!record.data)throw new Error('精灵存档格式无法读取；原记录已保留。');
    return record;
  }
  function commit(expected,data){
    function write(){
      const prior=read();
      if(expected!==prior.revision)return {ok:false,record:prior};
      const record={revision:prior.revision+1,data};
      localStorage.setItem(key,JSON.stringify(record));
      return {ok:true,record};
    }
    return navigator.locks?navigator.locks.request(key,write):Promise.resolve(write());
  }
  return {read,commit};
}
function serveSpiritStorage(frame){
  const storage=openSpiritStorage();
  window.addEventListener('message',async event=>{
    const request=event.data;
    if(event.source!==frame.contentWindow||request?.type!=='seer.spirits.request')return;
    let result,error;
    try{
      if(request.op==='read')result=storage.read();
      else if(request.op==='commit'&&request.data&&typeof request.data==='object')result=await storage.commit(request.expected,request.data);
      else return;
    }catch(reason){error=reason.message;}
    frame.contentWindow.postMessage({type:'seer.spirits.reply',id:request.id,result,error},'*');
  });
}
function createSpiritPersistence(){
  if(window.name!=='seer-portable'||parent===window)return openSpiritStorage();
  const pending=new Map();
  let sequence=0;
  window.addEventListener('message',event=>{
    const reply=event.data;
    if(event.source!==parent||reply?.type!=='seer.spirits.reply')return;
    const request=pending.get(reply.id);
    if(!request)return;
    clearTimeout(request.timer);pending.delete(reply.id);
    if(reply.error)request.reject(new Error(reply.error));else request.resolve(reply.result);
  });
  function send(op,expected,data){
    return new Promise((resolve,reject)=>{
      const id=++sequence;
      const timer=setTimeout(()=>{pending.delete(id);reject(new Error('精灵存档未响应，请重新打开面板。'));},6000);
      pending.set(id,{resolve,reject,timer});
      parent.postMessage({type:'seer.spirits.request',op,id,expected,data},'*');
    });
  }
  return {read:()=>send('read'),commit:(expected,data)=>send('commit',expected,data)};
}
