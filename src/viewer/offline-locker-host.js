/* The opaque game iframe can persist its small equipment record through its own host. */
(() => {
  const game=document.querySelector('iframe[name="seer-portable"]');
  const key='seer.pilot.locker.v1';
  window.addEventListener('message',e=>{
    if(e.source!==game.contentWindow)return;
    if(e.data?.type==='seer.locker.read'){
      let pack=null;
      try{pack=JSON.parse(localStorage.getItem(key));}catch(_){}
      game.contentWindow.postMessage({type:'seer.locker.initial',pack},'*');
    }else if(e.data?.type==='seer.locker.write'){
      const p=e.data.pack;
      if(p?.version!==1||!Number.isSafeInteger(p.samples)||p.samples<0||p.samples>3)return;
      const pack={version:1,drillOwned:p.drillOwned===true,drillEquipped:p.drillOwned===true&&p.drillEquipped===true,
        samples:p.samples,flyerStored:p.flyerStored===true};
      try{localStorage.setItem(key,JSON.stringify(pack));}catch(_){}
    }
  });
})();
