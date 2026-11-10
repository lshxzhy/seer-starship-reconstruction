  // Only portable equipment is kept across visits. Position is managed by the viewer.
  function createPilotLocker(onLoad){
    const key='seer.pilot.locker.v1',portable=window.name==='seer-portable'&&parent!==window;
    let edited=false;
    function initial(p){
      if(p?.version===1&&!edited)onLoad(p);
    }
    function receive(e){
      if(e.source===parent&&e.data?.type==='seer.locker.initial')initial(e.data.pack);
    }
    if(portable){
      window.addEventListener('message',receive);
      parent.postMessage({type:'seer.locker.read'},'*');
    }else if(!window.openai){
      try{initial(JSON.parse(localStorage.getItem(key)));}catch(_){}
    }
    return {
      write(pack){
        edited=true;
        if(portable){parent.postMessage({type:'seer.locker.write',pack},'*');return;}
        if(!window.openai){try{localStorage.setItem(key,JSON.stringify(pack));}catch(_){}}
      },
      dispose(){window.removeEventListener('message',receive);}
    };
  }
