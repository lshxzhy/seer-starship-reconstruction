// The training rack issues three numbered specimens. Deliveries consume the
// prefix of the mined specimens, so rewards can be reconstructed from receipts.
const trainingTerms=Object.freeze({capacity:3,unitReward:20});
// Original locations/material identities; one sample per authored deposit is
// this reconstruction's finite exploration rule, separate from training ore.
const FIELD_DEPOSITS=Object.freeze({
  'klose-yellow':{planet:'klose',site:'grassland',x:-14,z:-18,tool:'drill',name:'黄晶矿',value:20},
  'ocean-yellow':{planet:'ocean',site:'ocean-depths',x:-117,z:40,tool:'drill',name:'黄晶矿',value:20},
  'ocean-methane':{planet:'ocean',site:'ocean-shallows',x:12,z:4,tool:'gas',name:'甲烷',value:100}
});
function fieldResourceSummary(pack){
  const unsold=(pack.fieldSamples||[]).filter(id=>!(pack.fieldSold||[]).includes(id));
  return {ore:unsold.filter(id=>FIELD_DEPOSITS[id].tool==='drill').length,
    gas:unsold.filter(id=>FIELD_DEPOSITS[id].tool==='gas').length,
    value:unsold.reduce((sum,id)=>sum+FIELD_DEPOSITS[id].value,0),
    credits:(pack.fieldSold||[]).reduce((sum,id)=>sum+FIELD_DEPOSITS[id].value,0)};
}
function normalizePilotPack(p){
  if(![1,2,3].includes(p?.version))return null;
  const batches=[];
  let delivered=0;
  if(p.version>=2&&Array.isArray(p.batches)){
    for(const count of p.batches.slice(0,trainingTerms.capacity)){
      if(!Number.isSafeInteger(count)||count<1||delivered+count>trainingTerms.capacity)break;
      batches.push(count);delivered+=count;
    }
  }
  const samples=Number.isSafeInteger(p.samples)?Math.max(0,Math.min(trainingTerms.capacity-delivered,p.samples)):0;
  const fieldKitOwned=p.fieldKitOwned===true||p.drillOwned===true;
  const handTool=p.handTool==='gas'&&fieldKitOwned?'gas':p.drillOwned===true&&p.drillEquipped===true?'drill':'none';
  const fieldSamples=[...new Set(Array.isArray(p.fieldSamples)?p.fieldSamples.filter(id=>Object.hasOwn(FIELD_DEPOSITS,id)):[])];
  const fieldSold=[...new Set(Array.isArray(p.fieldSold)?p.fieldSold.filter(id=>fieldSamples.includes(id)):[])];
  return {version:3,drillOwned:p.drillOwned===true,drillEquipped:handTool==='drill',
    fieldKitOwned,handTool,divingSuit:fieldKitOwned&&p.divingSuit===true,flameStowed:p.flameStowed===true,
    fieldSamples,fieldSold,samples,batches,flyerStored:p.flyerStored===true,tracking:typeof p.tracking==='boolean'?p.tracking:samples>0};
}
function mergePilotPacks(previous,incoming){
  const next=normalizePilotPack(incoming),prior=normalizePilotPack(previous);
  if(!next||!prior)return next||prior;
  const redeemed=prior.batches.reduce((sum,n)=>sum+n,0);
  const batches=[...prior.batches];
  let end=0;
  for(const n of next.batches){
    end+=n;
    if(end>redeemed)batches.push(Math.min(end-redeemed,n));
  }
  const mined=Math.max(redeemed+prior.samples,end+next.samples);
  return {...next,drillOwned:prior.drillOwned||next.drillOwned,fieldKitOwned:prior.fieldKitOwned||next.fieldKitOwned,
    fieldSamples:[...new Set([...prior.fieldSamples,...next.fieldSamples])],
    fieldSold:[...new Set([...prior.fieldSold,...next.fieldSold])],batches,
    samples:mined-Math.max(end,redeemed)};
}
