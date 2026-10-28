import {rowTags,recipientState,ownershipAmounts} from './holder-model.mjs';
import {holderCharts} from './holder-charts.mjs';
import {HOLDER_BALANCE_SPLITS,HOLDER_CIRCULATION_EXCLUSIONS} from './holder-labels.mjs';
import {holderLedger} from './holder-overview.mjs';

export function holderInsights(report, manual = {}) {
  const states = [
    {id:'held', label:'持币 · 未见卖出'},
    {id:'sold-held', label:'卖出后仍持币'},
    {id:'sold-zero', label:'卖出后零持仓'},
    {id:'zero', label:'零持仓 · 未见卖出'},
  ].map(s=>({...s,count:0,balance:0n}));
  let own=0n, received=0n, receivedCount=0, ownCount=0,robotBalance=0n,robotCount=0;
  const external=[];
  for(const row of report.rows){
    const tags=rowTags(row,manual), balance=BigInt(row.balance);
    const parts=ownershipAmounts(row,manual);own+=BigInt(parts.own);if(BigInt(parts.own)>0n)ownCount++;
    if(BigInt(parts.external)>0n){external.push(parts.mixed?{...row,balance:parts.external,ownershipScope:'external'}:row);if(tags.some(t=>['frequency','arbitrage'].includes(t.kind))){robotBalance+=BigInt(parts.external);robotCount++;}}
    if(!tags.some(t=>t.id==='received'||t.kind==='received'))continue;
    receivedCount++;received+=balance;
    const index=states.findIndex(s=>s.id===recipientState(row,manual));
    states[index].count++;states[index].balance+=balance;
  }
  const total=report.rows.reduce((n,r)=>n+BigInt(r.balance),0n);
  const outside=holderCharts(external,manual);
  const circulation=holderLedger({...report,totalSupply:report.totalSupply??total.toString()},manual);
  const circulating=holderCharts(external.filter(row=>!Object.hasOwn(HOLDER_CIRCULATION_EXCLUSIONS,row.address)),manual);
  return {cutoff:report.cutoff,block:report.block,price:report.price,total:total.toString(),own:own.toString(),ownCount,
    external:(total-own).toString(),received:received.toString(),receivedCount,robots:{balance:robotBalance.toString(),count:robotCount},
    states:states.map(s=>({...s,balance:s.balance.toString()})),
    externalTop10:outside.top.at(-1)?.cumulativeShare??null,
    circulation:{...circulation,top10:circulating.top.at(-1)?.cumulativeShare??null},
    source:report.rows.find(r=>r.address==='0x67b97c3845438f264965ca154ba13051c6c73416')?.balance??null,
    manualCount:Object.keys(manual).filter(a=>report.rows.some(r=>r.address===a)).length};
}

// Combine public classifications without attributing every contract caller to its owner.
export function sellerProfile(row, holder, manual = {}) {
  const tags=holder?rowTags(holder,manual):rowTags({address:row.address,tags:[]},manual);
  const mixed=!!HOLDER_BALANCE_SPLITS[row.address];
  const own=!mixed&&(row.own||tags.some(t=>['own','lp'].includes(t.kind)));
  const confirmedRobot=tags.some(t=>['frequency','arbitrage'].includes(t.kind)&&(t.manual||t.evidence?.includes('用户确认')));
  const associated=own||mixed;
  const frequency=!associated&&(row.highFrequency||confirmedRobot);
  // Period filters retain receipt status at the end of that trading window.
  const received=!!row.received;
  const visible=tags.filter(t=>!['received-sold','received-relay-sold','cleared','received-zero'].includes(t.id)&&(!own||!['frequency','arbitrage'].includes(t.kind))&&(!['frequency','arbitrage'].includes(t.kind)||frequency))
    .map(t=>t.kind==='received'&&!received?{...t,id:'current-received',kind:'current-received',text:'当前领过币'}:t);
  if(own&&!visible.some(t=>['own','lp'].includes(t.kind)))visible.unshift({kind:row.ownType==='LP'?'lp':'own',text:row.ownType==='LP'?'我方 LP':'我方执行'});
  if(received&&!visible.some(t=>t.kind==='received'))visible.push({kind:'received',text:'领过币'});
  if(row.receivedSold===true){
    visible.push({id:'received-sold',kind:'sold',text:'领币后卖出',evidence:'本时段截止前，已确认先领取再卖出；不推断卖出的是哪批币'});
    if(holder?.balance!=null&&BigInt(holder.balance)===0n)visible.push({id:'cleared',kind:'cleared',text:'领币后卖出 · 当前清仓',evidence:'本时段截止前已确认领币后卖出；最新持仓快照余额为 0，余额归零也可能包含转账'});
  }else if(holder?.balance!=null&&BigInt(holder.balance)===0n&&tags.some(t=>['cleared','received-zero'].includes(t.id))){
    visible.push({id:'current-zero',kind:'current-zero',text:'当前零持仓',evidence:'最新持仓快照余额为 0；未确认在本时段截止前领币后卖出'});
  }
  if(row.relaySold===true)visible.push({id:'received-relay-sold',kind:'sold',text:'分发币转手卖出（估算）',evidence:'本时段截止前的转账来源追踪与卖出记录估算；不证明卖出的是同一批币或地址同属一人'});
  if(frequency&&!visible.some(t=>['frequency','arbitrage'].includes(t.kind)))visible.push({kind:'frequency',text:'高频交易（疑似）'});
  return {own,frequency,received,tags:visible,balance:holder?.balance??null};
}

export function holderViewURL({tags=[],search='',zero=false,cohort,excludeOwn=false,scope,chart}={},pageURL=globalThis.location?.href) {
  const q=new URLSearchParams({view:'holders'});
  if(tags.length)q.set('tags',tags.join(','));
  if(search)q.set('search',search);
  if(zero)q.set('zero','1');
  if(cohort)q.set('cohort',cohort);
  if(excludeOwn)q.set('scope','external');
  if(scope==='external-stat')q.set('scope',scope);
  if(chart)q.set('chart',chart);
  const target=pageURL?new URL('./esim-holders.html',pageURL):new URL('https://starkweng.github.io/esim-onchain/');
  target.search=q.toString();
  return target.href;
}

export function displayEsimBalance(live,holder,holderReport){
 const useLive=!!live&&(!holderReport||live.block>=holderReport.block||!holder);
 return useLive?{balance:live.esim,cutoff:live.timestamp,source:'live'}:holder?{balance:holder.balance,cutoff:holderReport.cutoff,source:'snapshot'}:{balance:null,cutoff:null,source:'missing'};
}
