  function createFlightDeck(boarding,onTravel,requestFrame){
    const overlay=root.querySelector('[data-overlay]'),dialog=overlay.querySelector('[role="dialog"]');
    const title=overlay.querySelector('[data-panel-title]'),dismiss=overlay.querySelector('[data-dismiss]');
    const dock=root.querySelector('.ship-dock'),triggers=[...dock.querySelectorAll('[data-console]')];
    const pages=new Map([...overlay.querySelectorAll('[data-page]')].map(p=>[p.dataset.page,p]));
    const labels={map:'舰内地图',bag:'背包 · 储存箱',terminal:'舰载终端',exchange:'动力室 · 能源兑换台'};
    let current=null,opener=null;
    const getState=()=>boarding.consoleState();
    const exchange=createSupplyExchange({container:pages.get('exchange'),getState,onDeliver:boarding.deliver,onClose:close});
    root.querySelector('[data-exchange]').addEventListener('click',()=>open('exchange'));
    const map=createShipMap({container:pages.get('map'),getState,onTravel:id=>{close(false);onTravel(id);focusPilot();},onClose:close});
    const inventory=createPilotInventory({container:pages.get('bag'),getState,onUse:id=>{
      if(id==='map'||id==='locateDrill'){open('map',id==='locateDrill'?'machine':null);return;}
      boarding.useItem(id);
      if(id==='flyer'||id==='stowFlyer'||id==='drill'||id==='delivery')close();
      else inventory.refresh();
    },onClose:close});
    function focusPilot(){dock.querySelector('[data-console="terminal"]').focus({preventScroll:true});}
    function close(focus=true){
      if(!current)return;
      map.close();inventory.close();exchange.close();current=null;
      overlay.hidden=true;delete stage.dataset.consoleOpen;
      for(const trigger of triggers)trigger.setAttribute('aria-expanded','false');
      if(focus)(opener||triggers[0]).focus({preventScroll:true});
      opener=null;requestFrame();
    }
    function open(key,target=null){
      if(stage.dataset.domain==='planet'||!pages.has(key)||boarding.commsOpen||boarding.inTransit)return;
      if(key==='bag'&&!getState().active)return;
      if(key==='exchange'&&!getState().atExchange)return;
      if(current===key){close();return;}
      if(!current)opener=triggers.find(b=>b.dataset.console===key);
      map.close();inventory.close();exchange.close();boarding.clearInputs();
      current=key;stage.dataset.consoleOpen=key;
      for(const [id,page] of pages)page.hidden=key!==id;
      for(const trigger of triggers)trigger.setAttribute('aria-expanded',String(trigger.dataset.console===key));
      overlay.hidden=false;title.textContent=labels[key];
      if(key==='map')map.open(target);
      if(key==='bag')inventory.open();
      if(key==='exchange')exchange.open();
      dismiss.focus({preventScroll:true});
    }
    for(const trigger of triggers){
      trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');
      trigger.addEventListener('click',()=>open(trigger.dataset.console));
    }
    dismiss.addEventListener('click',()=>close());
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    // After a command with an immediate scene result, show the resulting view.
    pages.get('terminal').addEventListener('click',e=>{
      const button=e.target.closest('button');if(!button)return;
      if(button.hasAttribute('data-comms')){close(false);return;}
      if(button.matches('[data-view="deck"]'))return;
      if(button.matches('[data-action="fullscreen"]'))return;
      close();focusPilot();
    });
    pages.get('terminal').addEventListener('change',e=>{
      if(e.target.matches('[data-perspective]')){close();focusPilot();}
    });
    function onKey(e){
      if(stage.dataset.domain==='planet'||boarding.commsOpen||e.ctrlKey||e.metaKey||e.altKey||e.isComposing)return;
      const el=e.target;
      if(el!==window&&el!==document&&el!==document.body&&el!==document.documentElement&&!root.contains(el))return;
      if(current&&e.key==='Tab'){
        const controls=[...dialog.querySelectorAll('button:not(:disabled),select:not(:disabled),a[href],input:not(:disabled),[tabindex="0"]')].filter(c=>c.getClientRects().length);
        const first=controls[0],last=controls[controls.length-1];
        if(first&&((e.shiftKey&&document.activeElement===first)||(!e.shiftKey&&document.activeElement===last))){
          e.preventDefault();(e.shiftKey?last:first).focus();
        }
        return;
      }
      if(e.key==='Escape'&&current){
        e.preventDefault();e.stopPropagation();close();return;
      }
      if(el.isContentEditable||el.closest?.('input,select,textarea,[role=textbox]'))return;
      const code=e.code||e.key.toUpperCase();
      const key=code==='KeyM'||code==='M'?'map':code==='KeyB'||code==='B'?'bag':null;
      if(key){e.preventDefault();e.stopPropagation();if(!e.repeat)open(key);}
    }
    window.addEventListener('keydown',onKey,true);
    function refreshPack(){
      if(current==='bag')inventory.refresh();
      if(current==='exchange')exchange.refresh();
    }
    stage.addEventListener('seer-pack-change',refreshPack);
    return {
      close,
      get isOpen(){return current!==null;},
      sync(aboard){
        dock.querySelector('[data-console="bag"]').hidden=!aboard;
        if(!aboard&&(current==='bag'||current==='exchange'))close(false);
        if(current==='map')map.refresh();if(current==='bag')inventory.refresh();
      },
      dispose(){window.removeEventListener('keydown',onKey,true);stage.removeEventListener('seer-pack-change',refreshPack);map.dispose();inventory.dispose();exchange.dispose();}
    };
  }
