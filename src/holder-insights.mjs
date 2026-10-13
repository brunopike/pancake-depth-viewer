import {rowTags,recipientState} from './holder-model.mjs';
import {holderCharts} from './holder-charts.mjs';

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
    if(tags.some(t=>['own','lp'].includes(t.kind))){own+=balance;if(balance>0n)ownCount++;}
    else{external.push(row);if(tags.some(t=>['frequency','arbitrage'].includes(t.kind))){robotBalance+=balance;if(balance>0n)robotCount++;}}
    if(!tags.some(t=>t.id==='received'||t.kind==='received'))continue;
    receivedCount++;received+=balance;
    const index=states.findIndex(s=>s.id===recipientState(row,manual));
    states[index].count++;states[index].balance+=balance;
  }
  const total=report.rows.reduce((n,r)=>n+BigInt(r.balance),0n);
  const outside=holderCharts(external,manual);
  return {cutoff:report.cutoff,block:report.block,price:report.price,total:total.toString(),own:own.toString(),ownCount,
    external:(total-own).toString(),received:received.toString(),receivedCount,robots:{balance:robotBalance.toString(),count:robotCount},
    states:states.map(s=>({...s,balance:s.balance.toString()})),
    externalTop10:outside.top.at(-1)?.cumulativeShare??null,
    source:report.rows.find(r=>r.address==='0x67b97c3845438f264965ca154ba13051c6c73416')?.balance??null,
    manualCount:Object.keys(manual).filter(a=>report.rows.some(r=>r.address===a)).length};
}

// Combine public classifications without attributing every contract caller to its owner.
export function sellerProfile(row, holder, manual = {}) {
  const tags=holder?rowTags(holder,manual):rowTags({address:row.address,tags:[]},manual);
  const own=row.own||tags.some(t=>['own','lp'].includes(t.kind));
  const confirmedRobot=tags.some(t=>['frequency','arbitrage'].includes(t.kind)&&(t.manual||t.evidence?.includes('用户确认')));
  const frequency=!own&&(row.highFrequency||confirmedRobot);
  // Period filters retain receipt status at the end of that trading window.
  const received=!!row.received;
  const visible=tags.filter(t=>(!own||!['frequency','arbitrage'].includes(t.kind))&&(!['frequency','arbitrage'].includes(t.kind)||frequency))
    .map(t=>t.kind==='received'&&!received?{...t,text:'当前领过币'}:t);
  if(own&&!visible.some(t=>['own','lp'].includes(t.kind)))visible.unshift({kind:'own',text:row.ownType==='LP'?'我方 LP':'我方执行'});
  if(received&&!visible.some(t=>t.kind==='received'))visible.push({kind:'received',text:'领过币'});
  if(frequency&&!visible.some(t=>['frequency','arbitrage'].includes(t.kind)))visible.push({kind:'frequency',text:'高频交易（疑似）'});
  return {own,frequency,received,tags:visible,balance:holder?.balance??null};
}

export function holderViewURL({tags=[],search='',zero=false,cohort,excludeOwn=false,chart}={}) {
  const q=new URLSearchParams({view:'holders'});
  if(tags.length)q.set('tags',tags.join(','));
  if(search)q.set('search',search);
  if(zero)q.set('zero','1');
  if(cohort)q.set('cohort',cohort);
  if(excludeOwn)q.set('scope','external');
  if(chart)q.set('chart',chart);
  return `https://starkweng.github.io/esim-onchain/?${q}`;
}

export function displayEsimBalance(live,holder,holderReport){
 const useLive=!!live&&(!holderReport||live.block>=holderReport.block||!holder);
 return useLive?{balance:live.esim,cutoff:live.timestamp,source:'live'}:holder?{balance:holder.balance,cutoff:holderReport.cutoff,source:'snapshot'}:{balance:null,cutoff:null,source:'missing'};
}
