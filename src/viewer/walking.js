// In ship metres, +Z points back. On a planet the same axis points south.
const walkPace={walk:4.4,run:8.4};
// Keep the navigation/support point separate from the physical airborne foot.
// Both controllers use metres and the same gravity; transient motion is not saved.
function createSeerJump(bodyHeight){
  const gravity=12,takeoffSpeed=4.6,clearance=.045;
  let foot=null,support=null,velocity=0,airborne=false;
  function reset(ground=null){
    foot=support=Number.isFinite(ground)?ground:null;velocity=0;airborne=false;
  }
  function start(ground,ceiling=Infinity){
    if(airborne||!Number.isFinite(ground)||ceiling-ground-bodyHeight<.10)return false;
    reset(ground);velocity=takeoffSpeed;airborne=true;return true;
  }
  function update(dt,ground,ceiling=Infinity){
    if(!Number.isFinite(ground))return;
    if(foot===null){reset(ground);return;}
    if(!airborne){
      if(ground<foot-.12)airborne=true;
      else{reset(ground);return;}
    }
    const before=support??ground,total=Math.min(.25,Math.max(0,dt));
    const count=Math.max(1,Math.ceil(total/(1/90))),step=total/count;
    for(let i=1;i<=count;i++){
      const floor=before+(ground-before)*i/count;
      foot+=velocity*step-.5*gravity*step*step;velocity-=gravity*step;
      const top=Math.max(floor,ceiling-bodyHeight-clearance);
      if(foot>top){foot=top;velocity=Math.min(0,velocity);}
      if(foot<=floor&&velocity<=0){reset(ground);return;}
      foot=Math.max(floor,foot);
    }
    support=ground;
  }
  return {start,update,reset,
    canMoveTo(ground,ceiling=Infinity){
      return Number.isFinite(ground)&&(!airborne||
        ground<=foot+.12&&foot+bodyHeight+clearance<=ceiling);
    },
    get airborne(){return airborne;},
    get offset(){return Math.max(0,(foot??0)-(support??0));},
    get pose(){return airborne?Math.min(1,Math.max(0,(foot-support)/.22)):0;}
  };
}
function seerControlCode(event){
  if(event.code&&event.code!=='Unidentified')return event.code;
  if(event.key===' ')return 'Space';
  if(event.key==='Shift')return event.location===2?'ShiftRight':'ShiftLeft';
  return /^[a-z]$/i.test(event.key)?'Key'+event.key.toUpperCase():event.key;
}
function cycleDialogFocus(event,panel){
  if(event.key!=='Tab')return;
  const controls=[...panel.querySelectorAll('button:enabled,select:enabled,input:enabled,textarea:enabled,a[href],summary,[tabindex="0"]')]
    .filter(el=>el.getClientRects().length);
  const first=controls[0],last=controls.at(-1);
  if(first&&document.activeElement===(event.shiftKey?first:last)){
    event.preventDefault();(event.shiftKey?last:first).focus({preventScroll:true});
  }
}
function walkDirection(forward,side,yaw){
  const length=Math.hypot(forward,side);
  if(!length)return {x:0,z:0};
  const cos=Math.cos(yaw),sin=Math.sin(yaw);
  return {x:(side*cos-forward*sin)/length,z:(-side*sin-forward*cos)/length};
}
