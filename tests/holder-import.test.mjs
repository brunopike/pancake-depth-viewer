import test from 'node:test';
import assert from 'node:assert/strict';
import {HOLDER_IMPORT,applyHolderLabels,HOLDER_CIRCULATION_EXCLUSIONS} from '../src/holder-labels.mjs';
import {rowTags,selectHolders,category,groupHolders,ownershipAmounts} from '../src/holder-model.mjs';
import {holderInsights,sellerProfile} from '../src/holder-insights.mjs';
import {holderCharts} from '../src/holder-charts.mjs';
import {addressRanking} from '../server/esim/addresses.mjs';
import {executionBreakdown,EXECUTION_LABELS} from '../server/esim/execution-categories.mjs';
import {SEED,buildHolderReport} from '../server/esim/holders.mjs';

const own=[
 '0x28c37e2370d0ca3c2e3b04830a11f2c0ffaeb0f9',
 '0xe858154e5b1d0c295b24103dbc7671b67faccba3',
 '0xe8e15e97a8652ebdc8333007ea9d3b0275595d96',
 '0x85e471fd8abe8e0c6b6f6b4c635956020336a12e',
 '0xa6b9f2f8507c3dcee32f765361f2c5527d7b6ad6',
];
const router='0x73d8bd54f7cf5fab43fe4ef40a62d390644946db';
const row=(address,balance='10',tags=[])=>({address,balance,tags});
test('October workbook adds 221 unique addresses without replacing the prior seed or importing balances',()=>{
 assert.equal(HOLDER_IMPORT.count,221);assert.equal(HOLDER_IMPORT.records.length,221);
 assert.equal(new Set(HOLDER_IMPORT.records.map(r=>r.address)).size,221);
 assert.equal(HOLDER_IMPORT.records.filter(r=>r.ownership==='own').length,39);
 assert.equal(HOLDER_IMPORT.records.filter(r=>r.ownership==='external').length,1);
 assert.equal(HOLDER_IMPORT.records.filter(r=>r.verified).length,7);
 assert.equal(SEED.addresses.length,1016);
 for(const r of HOLDER_IMPORT.records){assert.match(r.address,/^0x[0-9a-f]{40}$/);assert(SEED.addresses.includes(r.address));assert(!Object.hasOwn(r,'balance'));assert(!Object.hasOwn(r,'tags'));}
 assert.equal(SEED.labels['0x2193222afd1cd700a3a48bd802e3fae8a6c901ee'].kind,'own');
 assert.equal(SEED.labels['0x278d858f05b94576c1e6f73285886876ff6ef8d2'].kind,'arbitrage');
});
test('five new own labels update cached rows, filters, charts, insights and seller profiles without mutating balances or activity',()=>{
 const rows=own.map(address=>({...row(address,'9007199254740992001',[{id:'frequency',kind:'frequency',text:'高频'},{id:'received',kind:'received',text:'领过币'}]),day:{sellAmount:'123',sellCount:2}}));
 const original=structuredClone(rows);
 assert.equal(selectHolders({rows},{filter:'own'}).total,5);
 assert.equal(selectHolders({rows},{filter:'frequency'}).total,0);
 assert.equal(groupHolders(rows,{}).find(g=>g.id==='own').balance,(5n*9007199254740992001n).toString());
 for(const r of rows){assert.equal(category(r,{}),'own');assert(sellerProfile(r,r,{}).own);assert(sellerProfile(r,null,{}).own);const tags=rowTags(r,{});assert(tags.some(t=>t.kind==='own'&&t.evidence.includes('Excel')));assert(!tags.some(t=>t.kind==='frequency'));assert.deepEqual(rowTags({...r,tags},{}),tags);}
 const insight=holderInsights({rows,totalSupply:'1000000000000000000000',cutoff:1},{});
 assert.equal(insight.own,(5n*9007199254740992001n).toString());
 assert.deepEqual(rows,original);
});
test('specific router classification replaces stale exchange labels while preserving live claim and robot evidence',()=>{
 const tags=[{id:'known-exchange',kind:'exchange',text:'Binance. Hot Wallet_4'},{id:'received-relay-sold',kind:'sold',text:'分发币转手卖出（估算）'},{id:'frequency',kind:'frequency',text:'高频机器人（疑似）'}];
 const r=row(router,'10',tags),updated=rowTags(r,{});
 assert.equal(category(r,{}),'dex');assert(updated.some(t=>t.kind==='dex'&&t.text==='Binance: Alpha 2.0 Router Proxy'));
 assert(!updated.some(t=>t.kind==='exchange'));assert(updated.some(t=>t.id==='received-relay-sold'));assert(updated.some(t=>t.id==='frequency'));
 assert.deepEqual(rowTags({...r,tags:updated},{}),updated);
 assert.equal(rowTags(r,{[router]:{kind:'custom',text:'测试备注'}})[0].text,'测试备注');
});
test('Safe, exchange and EIP-7702 types retain source evidence and LP ownership without duplicate tags',()=>{
 for(const [address,text] of [
  ['0xdd79e78b3c3917c607f6a320fc1b0394bb219777','Safe 多签（2/3）'],
  ['0x4252f9e683c7d38b6fd053346358f6460d982745','Safe 多签（3/4）'],
  ['0x53f78a071d04224b8e254e243fffc6d9f2f3fa23','KuCoin: Hot Wallet 2'],
  ['0x1ab4973a48dc892cd9971ece8e01dcc7688f8f23','Bitget 6'],
 ]){const tags=applyHolderLabels(address);assert(tags.some(t=>t.text.includes(text)&&t.evidence.includes(address==='0x4252f9e683c7d38b6fd053346358f6460d982745'?'用户确认':'2026-10-15T16:27:00+08:00')));}
 const address='0x1db99241d9e230edc33996567ec2707c42475fd8';
 const tags=applyHolderLabels(address,[{id:'own-lp',kind:'lp',text:'我方 LP'},{id:'contract',kind:'contract',text:'合约地址'},{id:'frequency',kind:'frequency',text:'高频'}]);
 assert.equal(tags.filter(t=>t.kind==='lp').length,1);assert(tags.some(t=>t.kind==='account'&&t.text.includes('EIP-7702')));assert(!tags.some(t=>t.id==='contract'||t.kind==='frequency'));assert.deepEqual(applyHolderLabels(address,tags),tags);
});
test('new RPC reports use the shared identities but keep exact fresh chain balances and independent 24h history',()=>{
 const cutoff=1792051200,state={origin:1,cutoff,trades:[],calls:[],pools:{},firstRecipient:{}};
 const report=buildHolderReport({state,addresses:[own[0],router],balances:['9007199254740992001','22'],priorBalances:['9007199254740992000','30'],contracts:{},block:{number:'0x79dc0f7',timestamp:`0x${cutoff.toString(16)}`,hash:'hash'},priorBlock:{number:'0x79bb000',timestamp:`0x${(cutoff-86400).toString(16)}`},totalSupply:'1000000000000000000000',price:.06});
 assert.equal(report.rows[0].balance,'9007199254740992001');assert.equal(report.rows[0].change24h,'1');assert.equal(report.rows[1].change24h,'-8');
 assert.equal(report.rows[0].tags.find(t=>t.id==='known-own').kind,'own');assert(report.rows[1].tags.some(t=>t.kind==='dex'));
 assert.equal(report.rows[0].history.sellAmount,'0');assert(!report.rows[0].tags.some(t=>t.id==='received'));assert.equal(report.coverage.supplement.count,221);assert.equal(report.coverage.seedTop,1000);assert.equal(report.coverage.exhaustive,false);
});
test('ordinary imported identities never suppress independently observed round-trip behavior in fresh or cached reports',()=>{
 const addresses=[router,'0x54403ec2c1035295e81172e1bf381d01df135f67'];
 const cutoff=1792051200,trades=addresses.flatMap(address=>Array.from({length:3},(_,i)=>['buy','sell'].map(side=>({address,initiator:address,side,amount_wei:'1',timestamp:cutoff-10,tx:address+i})))).flat();
 const report=buildHolderReport({state:{origin:1,cutoff,trades,calls:[],pools:{},firstRecipient:{}},addresses,balances:['10','20'],block:{number:'0x79dc0f7',timestamp:`0x${cutoff.toString(16)}`,hash:'hash'},totalSupply:'1000',price:.06});
 for(const r of report.rows){assert(r.tags.some(t=>t.id==='arbitrage'));const old=rowTags({...r,tags:[{id:'arbitrage',kind:'arbitrage',text:'套利机器人（疑似）'}]},{});assert(old.some(t=>t.id==='arbitrage'));assert.equal(r.history.buyCount,3);assert.equal(r.history.sellCount,3);}
});
test('confirmed own addresses include the new wallet while shared Vault is only a reporting exclusion',()=>{
 const addresses=['0xdde4deb7aab7cefdd5aa1ab4fdc8675eb901cad7','0x4252f9e683c7d38b6fd053346358f6460d982745','0xea4bd4aad512ca4dccda821e8693b6b38b51fc68'];
 for(const address of addresses){
  const r={...row(address,'100',[{id:'known-contract',kind:'contract',text:'旧合约标签'},{id:'frequency',kind:'frequency',text:'高频机器人'}]),history:{sellCount:3,sellAmount:'7'}};
  const before=structuredClone(r),tags=rowTags(r,{});
  assert.equal(ownershipAmounts(r).own,'100');assert.equal(ownershipAmounts(r).external,'0');assert.equal(category(r,{}),'own');
  assert.equal(sellerProfile(r,null,{}).own,true);assert.equal(EXECUTION_LABELS[address].category,'own');assert.equal(SEED.labels[address].kind,'own');
  assert(!tags.some(t=>['frequency','arbitrage'].includes(t.kind)));assert(tags.some(t=>t.kind==='own'&&t.evidence.includes('用户确认')));
  assert.deepEqual(rowTags({...r,tags},{}),tags);assert.deepEqual(r,before);
 }
 const vault='0x238a358808379702088667322f80ac48bad5e6c4',r=row(vault,'100');
 assert(HOLDER_CIRCULATION_EXCLUSIONS[vault]);assert.equal(ownershipAmounts(r).own,'0');assert.equal(ownershipAmounts(r).external,'100');assert.equal(category(r,{}),'dex');
 assert(rowTags(r,{}).some(t=>t.text.includes('外部统计排除')));
});
test('mixed wallet counts only balance minus the confirmed 409924 ESIM as our holding; stocks reconcile exactly',()=>{
 const unit=10n**18n,address='0x588177775e6fba9e752d0c9dfd5bbb562e8f016a';
 const mixed={...row(address,(1159790n*unit+1n).toString(),[{id:'frequency',kind:'frequency',text:'高频'}]),priorBalance:'1',change24h:'2',day:{sellCount:7,sellAmount:'123'},history:{sellCount:8,sellAmount:'456'}};
 const before=structuredClone(mixed),parts=ownershipAmounts(mixed),expectedOwn=(749866n*unit+1n).toString();
 assert.equal(parts.own,expectedOwn);assert.equal(parts.external,(409924n*unit).toString());assert.equal(parts.needsReview,false);
 assert(!rowTags(mixed,{}).some(t=>['own','lp','frequency','arbitrage'].includes(t.kind)));assert(rowTags(mixed,{}).some(t=>t.kind==='mixed'));
 assert.equal(selectHolders({rows:[mixed]},{filter:'own'}).total,1);assert.equal(selectHolders({rows:[mixed]},{filter:'external'}).total,1);
 const insight=holderInsights({rows:[mixed],cutoff:1},{});assert.equal(insight.own,expectedOwn);assert.equal(insight.ownCount,1);assert.equal(insight.external,parts.external);assert.equal(BigInt(insight.own)+BigInt(insight.external),BigInt(mixed.balance));
 const chart=holderCharts([mixed]);assert.equal(chart.groups.find(g=>g.id==='own').balance,expectedOwn);assert.equal(chart.groups.find(g=>g.id==='external').balance,parts.external);assert.equal(chart.groups.reduce((n,g)=>n+BigInt(g.balance),0n).toString(),mixed.balance);assert.deepEqual(chart.countGroups.map(g=>[g.id,g.count]),[['mixed',1]]);
 const outside=selectHolders({rows:[mixed]},{excludeOwn:true}).rows[0];assert.equal(outside.balance,parts.external);assert.equal(outside.walletBalance,mixed.balance);assert.equal(outside.priorBalance,null);assert.equal(outside.change24h,null);assert.equal(ownershipAmounts(outside).own,'0');assert.equal(holderCharts([outside]).total,parts.external);assert.equal(outside.day.sellCount,7);assert.deepEqual(mixed,before);
 const manual={[address]:{kind:'own',text:'本地备注'}};assert.equal(ownershipAmounts(mixed,manual).own,expectedOwn);
 assert.equal(selectHolders({rows:[mixed]},{excludeOwn:true,filter:'own'},manual).total,0);assert.equal(rowTags(mixed,manual).find(t=>t.manual).kind,'custom');
 const old={...mixed,tags:[{id:'own-execution',kind:'own',text:'我方执行'}]};assert(!rowTags(old,manual).some(t=>['own','lp'].includes(t.kind)));assert.equal(sellerProfile({address,own:true},old,manual).own,false);
});
test('mixed holdings guard insufficient balances and never infer ownership of historical transactions',()=>{
 const address='0x588177775e6fba9e752d0c9dfd5bbb562e8f016a',r=row(address,'100');
 const parts=ownershipAmounts(r);assert.equal(parts.own,'0');assert.equal(parts.external,'100');assert.equal(parts.needsReview,true);assert.equal(holderInsights({rows:[r],cutoff:1}).ownCount,0);
 assert.equal(EXECUTION_LABELS[address],undefined);
 const trades=Array.from({length:100},(_,i)=>({address,initiator:address,executor:address,side:'sell',amount_wei:'1',timestamp:1792051190,tx:'mixed'+i,group:'remaining_unattributed'}));
 const ranking=addressRanking({trades,firstRecipient:{}},1,1792051200);assert.equal(ranking.rows[0].own,false);assert.equal(ranking.rows[0].highFrequency,false);assert.equal(ranking.rows[0].sold,'100');
 assert.equal(sellerProfile({...ranking.rows[0],highFrequency:true},r).frequency,false);
 assert.deepEqual(executionBreakdown(trades).map(p=>p.id),['other']);
 const previous=[{...trades[0],executor:'0x21a0541e4122090c30fbc04e98cf27430608e007',amount_wei:'100'},{...trades[1],amount_wei:'999'}];
 const mixedRanking=addressRanking({trades:previous,firstRecipient:{}},1,1792051200).rows[0];assert.equal(mixedRanking.sold,'1099');assert.equal(mixedRanking.own,false);assert.equal(mixedRanking.ownType,null);
 const state={origin:1,cutoff:1792051200,trades,calls:[],pools:{},firstRecipient:{}};
 const report=buildHolderReport({state,addresses:[address],balances:['100'],block:{number:'0x79dc0f7',timestamp:`0x${state.cutoff.toString(16)}`,hash:'hash'},totalSupply:'1000',price:.06});assert(!report.rows[0].tags.some(t=>['frequency','arbitrage'].includes(t.kind)));assert.equal(report.rows[0].history.sellCount,100);
});
