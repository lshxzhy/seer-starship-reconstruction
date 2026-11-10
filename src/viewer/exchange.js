  // The resource terminal quotes the current manifest; boarding owns all debits,
  // rewards and durable receipts. A displayed quote carries its delivered total.
  function createSupplyExchange({container,getState,onDeliver,onClose}) {
    const panel=document.createElement('section');
    panel.className='supply-exchange';
    panel.setAttribute('aria-label','动力室训练矿样交接');
    panel.hidden=true;
    panel.innerHTML=`
      <style>
        .supply-exchange {padding:clamp(10px,2.5%,20px);color:#e5f2f3}
        .supply-exchange h3,.supply-exchange p,.supply-exchange dl {margin:0}
        .supply-exchange h3 {font-size:20px;letter-spacing:.04em;line-height:1.4}
        .supply-exchange .ex-stock {display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:center;padding-bottom:16px;border-bottom:1px solid #3d565c}
        .supply-exchange .ex-stock small,.supply-exchange dt,.supply-exchange .ex-sub {color:#bad0d1}
        .supply-exchange .ex-glyph {width:61px;height:63px;position:relative;isolation:isolate;background:radial-gradient(ellipse at 50% 73%,#b39b4e35,transparent 70%)}
        .supply-exchange .ex-glyph i {position:absolute;top:10%;left:34%;width:30%;height:73%;background:linear-gradient(85deg,#977844 0 35%,#f6d17a 36% 68%,#bb873b 69%);clip-path:polygon(6% 24%,67% 0,100% 28%,81% 95%,32% 100%,0 86%)}
        .supply-exchange .ex-glyph i:first-child {transform:translate(-12px,5px) rotate(-24deg) scale(.75)}
        .supply-exchange .ex-glyph i:last-child {transform:translate(15px,8px) rotate(28deg) scale(.78)}
        .supply-exchange .ex-fields,.supply-exchange .ex-total,.supply-exchange .ex-actions {display:flex;align-items:center;gap:12px;flex-wrap:wrap}
        .supply-exchange .ex-fields {padding:15px 0 12px;justify-content:space-between}
        .supply-exchange label {display:inline-flex;gap:8px;align-items:center}
        .supply-exchange .ex-counter {display:inline-flex;align-items:center;gap:3px;white-space:nowrap}
        .supply-exchange .ex-counter>span {margin-right:5px}
        .supply-exchange .ex-step {min-width:34px;padding:5px}
        .supply-exchange select,.supply-exchange button {font:inherit;border:1px solid #73999d;border-radius:6px;color:#e4f6f4;background:#244550;padding:6px 11px;min-height:36px}
        .supply-exchange .ex-primary {background:#8bdbcd;border-color:#8bdbcd;color:#143031;font-weight:700}
        .supply-exchange button:disabled,.supply-exchange select:disabled {opacity:.48;cursor:default}
        .supply-exchange .ex-total {justify-content:space-between;background:#172e36;border-left:3px solid #cda05d;padding:10px 12px}
        .supply-exchange .ex-total strong {color:#ffe0a0;font-size:18px}
        .supply-exchange .ex-actions {margin-top:14px}
        .supply-exchange .ex-stub {margin:0 auto;max-width:540px;background:#e2e8d9;color:#243c39;padding:clamp(12px,3%,23px);border-radius:5px}
        .supply-exchange .ex-stub header,.supply-exchange .ex-row {display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap}
        .supply-exchange .ex-stub header {border-bottom:1px dashed #7f9890;padding-bottom:8px}
        .supply-exchange .ex-stub dt,.supply-exchange .ex-stub small {color:#476057}
        .supply-exchange .ex-stub dl {display:grid;gap:5px;margin:10px 0}
        .supply-exchange dd {font-variant-numeric:tabular-nums;font-weight:650;margin:0}
        .supply-exchange .ex-stub footer {border-top:1px dashed #7f9890;padding-top:8px;color:#345e4a}
        .supply-exchange details {margin-top:14px;color:#c5d6d8}
        .supply-exchange details summary {cursor:pointer}
        .supply-exchange ol {margin:5px 0;padding-left:22px}
        .supply-exchange .ex-status {margin-top:8px;color:#ffe0a0}
        .supply-exchange [hidden] {display:none!important}
      </style>
      <div data-ex-offer>
        <div class="ex-stock"><div class="ex-glyph" aria-hidden="true"><i></i><i></i><i></i></div>
          <div><h3>训练矿样</h3><small>机械室采样工位 · 背包持有 <strong data-ex-stock></strong> 块</small></div>
        </div>
        <div class="ex-fields"><div class="ex-counter" role="group" aria-label="调整交付数量"><span>交付数量</span>
          <button type="button" class="ex-step" data-ex-minus aria-label="减少一块">−</button>
          <select data-ex-count aria-label="交付训练矿样数量"></select>
          <button type="button" class="ex-step" data-ex-plus aria-label="增加一块">+</button></div>
          <span class="ex-sub">训练单价　<strong data-ex-rate></strong> 赛尔豆 / 块</span></div>
        <div class="ex-total">本次预计入账<strong data-ex-quote></strong></div>
        <div class="ex-actions"><button type="button" data-ex-submit class="ex-primary">交付并兑换</button></div>
        <p class="ex-status" data-ex-status role="status" hidden></p>
      </div>
      <div data-ex-receipt hidden>
        <div class="ex-stub">
          <header><h3>矿样签收单</h3><small>单号 <strong data-ex-receipt-id></strong></small></header>
          <dl>
            <div class="ex-row"><dt>本次签收</dt><dd data-ex-received></dd></div>
            <div class="ex-row"><dt>训练奖励</dt><dd data-ex-earned></dd></div>
            <div class="ex-row"><dt>储存箱赛尔豆余额</dt><dd data-ex-wallet></dd></div>
            <div class="ex-row"><dt>背包剩余</dt><dd data-ex-remaining></dd></div>
          </dl>
          <footer data-ex-progress></footer>
        </div>
        <div class="ex-actions"><button type="button" data-ex-continue>继续交付</button>
          <button type="button" data-ex-return class="ex-primary">返回舱内</button></div>
      </div>
      <details data-ex-history hidden><summary>已签收的记录</summary><ol></ol></details>`;
    container.append(panel);
    const el=key=>panel.querySelector('[data-ex-'+key+']');
    const countSelect=el('count'),submit=el('submit'),history=el('history');
    let confirmed=null,quoteVersion=0,problem='';
    function refresh(){
      if(panel.hidden)return;
      const state=getState();
      const available=state.samples,rate=state.unitReward;
      const ledger=state.receipts||[];
      const receipt=ledger.find(r=>r.number===confirmed);
      const showReceipt=Boolean(receipt);
      el('receipt').hidden=!showReceipt;
      el('offer').hidden=showReceipt;
      if(showReceipt){
        el('receipt-id').textContent=String(receipt.number).padStart(3,'0');
        el('received').textContent='训练矿样 × '+receipt.count;
        el('earned').textContent='+'+receipt.reward+' 赛尔豆';
        el('wallet').textContent=state.credits+' 赛尔豆';
        el('remaining').textContent=available+' 块矿样';
        el('progress').textContent=state.delivered>=3?'本批训练矿样已全部签收。':'本批已交付 '+state.delivered+' / 3 块。';
        el('continue').hidden=available===0||!state.atExchange;
      }else{
        const previous=Number(countSelect.value);
        if(countSelect.options.length!==available){
          countSelect.replaceChildren();
          for(let n=1;n<=available;n++)countSelect.add(new Option(n+' 块',String(n)));
          if(available)countSelect.value=String(Math.min(previous||available,available));
        }
        el('stock').textContent=available;
        el('rate').textContent=rate;
        el('quote').textContent=Number(countSelect.value)*rate+' 赛尔豆';
        const enabled=state.active&&state.atExchange&&available>0;
        countSelect.disabled=submit.disabled=!enabled;
        el('minus').disabled=!enabled||Number(countSelect.value)<=1;
        el('plus').disabled=!enabled||Number(countSelect.value)>=available;
        const message=problem||(!state.atExchange?'请走到动力室中央主机的矿物投入口。':
          !available?'背包中没有训练矿样。可以在机械室的采样工位领取矿钻并取样。':'');
        el('status').textContent=message;el('status').hidden=!message;
        quoteVersion=state.delivered;
      }
      history.hidden=ledger.length===0;
      const list=history.querySelector('ol');
      list.replaceChildren(...ledger.map(r=>{
        const entry=document.createElement('li');
        entry.textContent='签收 '+String(r.number).padStart(3,'0')+'　训练矿样 × '+r.count+'　+'+r.reward+' 赛尔豆';
        return entry;
      }));
    }
    function commit(){
      if(submit.disabled||el('offer').hidden)return;
      const result=onDeliver(Number(countSelect.value),quoteVersion);
      if(result.ok){
        confirmed=result.receipt.number;problem='';
      }else problem=result.notice;
      refresh();
      if(result.ok)el('return').focus({preventScroll:true});
    }
    function resume(){
      confirmed=null;problem='';
      refresh();countSelect.focus({preventScroll:true});
    }
    submit.addEventListener('click',commit);
    countSelect.addEventListener('change',refresh);
    for(const [key,step] of [['minus',-1],['plus',1]]){
      el(key).addEventListener('click',()=>{
        countSelect.selectedIndex+=step;
        refresh();
      });
    }
    el('continue').addEventListener('click',resume);
    el('return').addEventListener('click',onClose);
    return {
      open(){
        const state=getState(),receipts=state.receipts||[];
        confirmed=!state.samples&&receipts.length?receipts[receipts.length-1].number:null;
        problem='';countSelect.replaceChildren();history.open=false;panel.hidden=false;refresh();
      },
      refresh,close(){panel.hidden=true;},
      dispose(){panel.remove();}
    };
  }
