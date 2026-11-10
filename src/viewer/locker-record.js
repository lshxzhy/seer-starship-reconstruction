// The training rack issues three numbered specimens. Deliveries consume the
// prefix of the mined specimens, so rewards can be reconstructed from receipts.
const trainingTerms=Object.freeze({capacity:3,unitReward:20});
function normalizePilotPack(p){
  if(p?.version!==1&&p?.version!==2)return null;
  const batches=[];
  let delivered=0;
  if(p.version===2&&Array.isArray(p.batches)){
    for(const count of p.batches.slice(0,trainingTerms.capacity)){
      if(!Number.isSafeInteger(count)||count<1||delivered+count>trainingTerms.capacity)break;
      batches.push(count);delivered+=count;
    }
  }
  const samples=Number.isSafeInteger(p.samples)?Math.max(0,Math.min(trainingTerms.capacity-delivered,p.samples)):0;
  return {version:2,drillOwned:p.drillOwned===true,drillEquipped:p.drillOwned===true&&p.drillEquipped===true,
    samples,batches,flyerStored:p.flyerStored===true,tracking:typeof p.tracking==='boolean'?p.tracking:samples>0};
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
  return {...next,drillOwned:prior.drillOwned||next.drillOwned,batches,
    samples:mined-Math.max(end,redeemed)};
}
