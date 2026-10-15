import test from 'node:test';
import assert from 'node:assert/strict';
import {holderLedger,holderAppearance,selectHolderView,holderOverviewCharts} from '../src/holder-overview.mjs';
import {selectHolders} from '../src/holder-model.mjs';
const W=10n**18n,a='0x'+'1'.repeat(40),b='0x'+'2'.repeat(40),c='0x'+'3'.repeat(40);
const reserve='0xa7d81e889f2df910389c95fa0f9d6092220edf87',vault='0x238a358808379702088667322f80ac48bad5e6c4',mixed='0x588177775e6fba9e752d0c9dfd5bbb562e8f016a';
const tag=kind=>({kind,id:kind,text:kind}),row=(address,n,tags=[])=>({address,balance:(BigInt(n)*W).toString(),tags,priorBalance:null,change24h:null});
const rows=[row(a,1000000,[tag('own'),tag('received')]),row(mixed,500000,[tag('received')]),row(b,90000,[tag('received')]),row(c,200000,[tag('exchange')]),row(reserve,15000000),row(vault,4000000)];
const report={rows,totalSupply:(21000000n*W).toString()};
test('ledger reconciles all indexed shares and leaves supply remainder separate',()=>{
 const result=holderLedger(report);assert.equal(result.own,(1090076n*W).toString());assert.equal(result.external,(699924n*W).toString());
 assert.equal(result.nonExternal,(20090076n*W).toString());
 assert.equal(result.exclusions.reduce((sum,r)=>sum+BigInt(r.balance),BigInt(result.own)),BigInt(result.nonExternal));
 assert.equal(BigInt(result.nonExternal)+BigInt(result.external),BigInt(result.indexed));
 assert.equal(BigInt(result.indexed)+BigInt(result.unindexed),BigInt(report.totalSupply));
});
test('classification respects ownership and exclusions before recipient styling',()=>{
 assert.equal(holderAppearance(rows[0]),'own');assert.equal(holderAppearance(rows[1]),'mixed');assert.equal(holderAppearance(rows[2]),'received');assert.equal(holderAppearance(rows[3]),'institution');
 assert.equal(holderAppearance({...rows[4],tags:[tag('received'),tag('own')]}),'excluded');
});
test('external statistics exclude custody buckets and split mixed wallet once',()=>{
 const result=selectHolderView(report,{scope:'external-stat',sort:'balance'});
 assert.equal(result.total,3);assert.equal(result.all.reduce((sum,r)=>sum+BigInt(r.balance),0n),699924n*W);
 const split=result.all.find(r=>r.address===mixed);assert.equal(split.ownershipScope,'external');assert.equal(split.priorBalance,null);assert.equal(split.walletBalance,(500000n*W).toString());
 assert.equal(selectHolders(report,{excludeOwn:true}).total,5);
});
test('threshold uses displayed external share, before sorting and paging',()=>{
 const result=selectHolderView(report,{scope:'external-stat',minimum:(450000n*W).toString()});assert.equal(result.total,0);
 const all=selectHolderView(report,{scope:'external-stat',minimum:(100000n*W).toString(),sort:'balance',direction:'desc',pageSize:1,page:1});assert.equal(all.total,2);assert.equal(all.rows[0].address,c);
});
test('quick scopes intersect tag filters, search and zero holder controls',()=>{
 assert.equal(selectHolderView(report,{scope:'own'}).total,2);
 assert.equal(selectHolderView(report,{scope:'received',filter:['own']}).total,2);
 assert.equal(selectHolderView(report,{scope:'excluded',search:vault}).total,1);
 const zero=row('0x'+'4'.repeat(40),0,[tag('received')]);
 assert.equal(selectHolderView({...report,rows:[zero]},{scope:'received'}).total,0);
 assert.equal(selectHolderView({...report,rows:[zero]},{scope:'received',includeZero:true}).total,1);
});
test('manual ownership updates totals and scope without absorbing fixed exclusions',()=>{
 const manual={[b]:{kind:'own',text:'我方 B'},[vault]:{kind:'own',text:'本地备注'}};
 assert.equal(holderLedger(report,manual).own,(1180076n*W).toString());assert.equal(holderAppearance(rows[5],manual),'excluded');
 assert.equal(holderLedger(report,manual).nonExternal,(20180076n*W).toString());
 assert.equal(selectHolderView(report,{scope:'external-stat'},manual).total,2);
});
test('chart amounts reconcile, mixed shares split and address counts remain unique',()=>{
 const chart=holderOverviewCharts(rows);
 assert.equal(chart.groups.reduce((s,r)=>s+BigInt(r.balance),0n),BigInt(chart.total));
 assert.equal(chart.countGroups.reduce((s,r)=>s+r.count,0),rows.length);
 assert.equal(chart.groups.find(g=>g.id==='own').balance,(1090076n*W).toString());
 assert.equal(chart.groups.find(g=>g.id==='received').balance,(499924n*W).toString());
 assert.equal(holderOverviewCharts(selectHolderView(report,{scope:'external-stat'}).all).groups.some(g=>g.id==='own'||g.id==='mixed'),false);
});
test('below-fixed external mixed balance never fabricates owned coins',()=>{
 const small={...report,rows:[row(mixed,100)]};assert.equal(holderLedger(small).own,'0');assert.equal(holderLedger(small).external,(100n*W).toString());
});
