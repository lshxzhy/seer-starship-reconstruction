// Loopback and the outer document of the portable game use the same store.
// A save from before a delivery cannot reinstate already exchanged samples.
function localVoyageRecord(value){
  const key='seer.navigator.v1';
  try{
    if(value===undefined)return JSON.parse(localStorage.getItem(key)||'null');
    if(value?.version===3)localStorage.setItem(key,JSON.stringify(value));
  }catch{/* Restricted browser storage still permits the current voyage. */}
  return null;
}
function createVoyageStore(){
  const portable=window.name==='seer-portable'&&parent!==window;
  let ready=!portable;
  return {
    read(apply){
      if(!portable)return localVoyageRecord();
      function receive(e){
        if(e.source!==parent||e.data?.type!=='seer.voyage.initial')return;
        window.removeEventListener('message',receive);ready=true;if(e.data.value)apply(e.data.value);
      }
      window.addEventListener('message',receive);parent.postMessage({type:'seer.voyage.read'},'*');return null;
    },
    write(state){
      if(!ready)return;
      // Inventory, companions and personal messages have separate stores.
      const {pack,spiritArchive,...voyage}=state;
      if(portable)parent.postMessage({type:'seer.voyage.write',value:voyage},'*');
      else localVoyageRecord(voyage);
    }
  };
}
function openLocalPilotStore(onChange){
  const key='seer.pilot.locker.v2',legacy='seer.pilot.locker.v1';
  let writes=Promise.resolve();
  function read(){
    try{return normalizePilotPack(JSON.parse(localStorage.getItem(key)||localStorage.getItem(legacy)));}catch(_){return null;}
  }
  function store(p){
    const merged=mergePilotPacks(read(),p);
    if(!merged)return;
    try{localStorage.setItem(key,JSON.stringify(merged));}catch(_){return;}
    if(JSON.stringify(merged)!==JSON.stringify(normalizePilotPack(p)))onChange(merged);
  }
  function write(p){
    if(!navigator.locks){store(p);return;}
    writes=writes.then(()=>navigator.locks.request(key,()=>store(p))).catch(()=>store(p));
  }
  function storage(e){if(e.key===key){const p=read();if(p)onChange(p);}}
  window.addEventListener('storage',storage);
  return {read,write,dispose(){window.removeEventListener('storage',storage);}};
}
function createPilotLocker(onLoad){
  const portable=window.name==='seer-portable'&&parent!==window;
  let local=null;
  function receive(e){
    if(e.source===parent&&e.data?.type==='seer.locker.initial'){
      const p=normalizePilotPack(e.data.pack);if(p)onLoad(p);
    }
  }
  if(portable){
    window.addEventListener('message',receive);
    parent.postMessage({type:'seer.locker.read'},'*');
  }else if(!window.openai){
    local=openLocalPilotStore(onLoad);
    const saved=local.read();if(saved)onLoad(saved);
  }
  return {write(pack){
    if(portable)parent.postMessage({type:'seer.locker.write',pack},'*');
    else local?.write(pack);
  },dispose(){local?.dispose();window.removeEventListener('message',receive);}};
}
