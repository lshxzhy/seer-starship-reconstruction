(() => {
  const game=document.querySelector('iframe[name="seer-portable"]');
  serveSpiritStorage(game);
  const send=pack=>game.contentWindow.postMessage({type:'seer.locker.initial',pack},'*');
  const storage=openLocalPilotStore(send);
  window.addEventListener('message',e=>{
    if(e.source!==game.contentWindow)return;
    if(e.data?.type==='seer.locker.read')send(storage.read());
    else if(e.data?.type==='seer.locker.write'){
      const pack=normalizePilotPack(e.data.pack);
      if(pack)storage.write(pack);
    }
  });
})();
