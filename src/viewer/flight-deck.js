  function createFlightDeck(boarding,onTravel,requestFrame,onPlanetTravel,parkedRamp,drawSystemChart,surfaceNavigation,onGuide,onLookNorth,fieldAccess={}){
    const overlay=root.querySelector('[data-overlay]'),dialog=overlay.querySelector('[role="dialog"]');
    const title=overlay.querySelector('[data-panel-title]'),dismiss=overlay.querySelector('[data-dismiss]');
    const dock=root.querySelector('.ship-dock'),triggers=[...dock.querySelectorAll('[data-console]')];
    const pages=new Map([...overlay.querySelectorAll('[data-page]')].map(p=>[p.dataset.page,p]));
    const labels={map:'地图',bag:'背包 · 储存箱',terminal:'舰载终端',exchange:'动力室 · 能源兑换台'};
    let current=null;
    const getState=()=>{const state=boarding.consoleState();return fieldAccess.available?.()?{...state,active:true,onSurface:true,mounted:false,landing:false,atExchange:false}:state;};
    const exchange=createSupplyExchange({container:pages.get('exchange'),getState,onDeliver:boarding.deliver,onClose:close});
    const crewPage=pages.get('crew'),dutyChat=crewPage.querySelector('[data-duty-chat]');
    function visitCrew(event){
      const id=event.detail?.characterId,profile=SEER_DUTY_PROFILES[id];
      if(!profile||!getState().active)return;
      open('crew');
      if(current!=='crew')return;
      title.textContent=profile.name+' · '+profile.title;
      crewPage.querySelector('[data-duty-post]').textContent=habitat.byId.get(profile.roomId)?.name||profile.title;
      crewPage.querySelector('[data-duty-facts]').replaceChildren(...profile.facts.map(fact=>{
        const line=document.createElement('li');line.textContent=fact;return line;
      }));
      dutyChat.hidden=!boarding.localComms;dutyChat.dataset.characterId=id;
    }
    stage.addEventListener('seer-visit-crew',visitCrew);
    dutyChat.addEventListener('click',()=>{const id=dutyChat.dataset.characterId;close(false);boarding.openDutyChat(id);});
    root.querySelector('[data-exchange]').addEventListener('click',()=>open('exchange'));
    const map=createShipMap({container:pages.get('map').querySelector('[data-navigation-map]'),getState,parkedRamp,drawSystemChart,surfaceNavigation,
      onGuide:id=>{close(false);onGuide(id);canvas.focus({preventScroll:true});},
      onCancelGuide:()=>{close(false);if(surfaceNavigation())onGuide(null);else boarding.cancelGuide();canvas.focus({preventScroll:true});},
      onTravel:(id,pose)=>{close(false);onTravel(id,pose);canvas.focus({preventScroll:true});},
      onPlanetTravel:(id,planetId)=>{close(false);onPlanetTravel(id,false,planetId);canvas.focus({preventScroll:true});}});
    root.querySelector('[data-twin-horizon]').addEventListener('click',()=>{
      close(false);onLookNorth();canvas.focus({preventScroll:true});
    });
    const inventory=createPilotInventory({container:pages.get('bag'),getState,onUse:id=>{
      const s=getState();
      if(id.startsWith('field:')){close(false);fieldAccess.travel?.(id.slice(6));return;}
      if(id==='map'){open('map',null,!!s.onSurface);return;}
      if(['drill','gas','dive'].includes(id)&&!(id==='drill'?s.drillOwned:s.fieldKitOwned)){close(false);onTravel('machine');return;}
      if(id==='flame'&&!s.flameTool){close(false);onTravel('laboratory');return;}
      if(id==='resources'){if(s.atExchange)boarding.deliverField();else {close(false);onTravel('power');}inventory.refresh();return;}
      if(['drill','gas','dive','flame'].includes(id)){boarding.useEquipment(id);inventory.refresh();requestFrame();return;}
      boarding.useItem(id);
      if(id==='flyer'||id==='stowFlyer'||id==='delivery')close();
      else inventory.refresh();
    }});
    function close(focus=true){
      if(!current)return;
      map.close();inventory.close();exchange.close();current=null;
      overlay.hidden=true;delete stage.dataset.consoleOpen;
      for(const trigger of triggers)trigger.setAttribute('aria-expanded','false');
      if(focus)canvas.focus({preventScroll:true});
      requestFrame();
    }
    function open(key,target=null,fromSurface=false){
      if((stage.dataset.domain==='planet'&&!fromSurface)||!pages.has(key)||boarding.commsOpen||boarding.inTransit)return;
      if(key==='bag'&&!getState().active)return;
      if(key==='exchange'&&!getState().atExchange)return;
      if(current===key){close();return;}
      map.close();inventory.close();exchange.close();boarding.clearInputs();fieldAccess.clear?.();
      current=key;stage.dataset.consoleOpen=key;
      for(const [id,page] of pages)page.hidden=key!==id;
      for(const trigger of triggers)trigger.setAttribute('aria-expanded',String(trigger.dataset.console===key));
      overlay.hidden=false;title.textContent=key==='map'?'导航图':labels[key];
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
      close();
    });
    pages.get('terminal').addEventListener('change',e=>{
      if(e.target.matches('[data-perspective]'))close();
    });
    function onKey(e){
      if(stage.dataset.consoleOpen==='spirits'||boarding.commsOpen||e.ctrlKey||e.metaKey||e.altKey||e.isComposing)return;
      const el=e.target;
      if(el!==window&&el!==document&&el!==document.body&&el!==document.documentElement&&!root.contains(el))return;
      if(current&&e.key==='Tab'){
        cycleDialogFocus(e,dialog);return;
      }
      const editing=el.isContentEditable||el.closest?.('input,select,textarea,[role=textbox]');
      if((e.key==='Escape'||(!editing&&current==='map'&&seerControlCode(e)==='KeyM'))&&current){
        e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)close();return;
      }
      if(editing)return;
      const code=seerControlCode(e),key=code==='KeyM'?'map':code==='KeyB'?'bag':null;
      const field=stage.dataset.domain==='planet';
      if(field&&!current&&(key!=='bag'||!fieldAccess.available?.()))return;
      if(key){e.preventDefault();e.stopPropagation();if(!e.repeat)open(key,null,field);}
    }
    window.addEventListener('keydown',onKey,true);
    function refreshPack(){
      if(current==='bag')inventory.refresh();
      if(current==='exchange')exchange.refresh();
    }
    stage.addEventListener('seer-pack-change',refreshPack);
    return {
      close,openBag:()=>open('bag',null,stage.dataset.domain==='planet'),openMap:(target=null,fromSurface=false)=>open('map',target,fromSurface),
      get isOpen(){return current!==null;},
      sync(aboard){
        dock.querySelector('[data-spirit-book]').hidden=!aboard;
        dock.querySelector('[data-console="bag"]').hidden=!aboard;
        if(!aboard&&(['exchange','crew'].includes(current)||current==='bag'&&!fieldAccess.available?.()))close(false);
        if(current==='map')map.refresh();if(current==='bag')inventory.refresh();
      },
      dispose(){window.removeEventListener('keydown',onKey,true);stage.removeEventListener('seer-visit-crew',visitCrew);stage.removeEventListener('seer-pack-change',refreshPack);map.dispose();inventory.dispose();exchange.dispose();}
    };
  }
