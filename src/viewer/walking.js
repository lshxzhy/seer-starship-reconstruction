// In ship metres, +Z points back. On a planet the same axis points south.
const walkPace={walk:4.4,run:8.4};
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
