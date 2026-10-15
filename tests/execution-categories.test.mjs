import test from 'node:test';
import assert from 'node:assert/strict';
import {executionBreakdown,EXECUTION_LABELS} from '../server/esim/execution-categories.mjs';
import {aggregateTrades} from '../server/esim/metrics.mjs';
const a=n=>'0x'+n.toString(16).padStart(40,'0');
const own='0xe1de6ac2ee058df5d3be8edeb62a8815fd13ff5a',router='0x6aba0315493b7e6989041c91181337b662fb1b90',robot='0x278d858f05b94576c1e6f73285886876ff6ef8d2';
const trade=(tx,executor,side,amount,extra={})=>({tx,executor,side,amount_wei:String(amount),timestamp:1791899800,initiator:a(1),address:null,group:'remaining_unattributed',...extra});
test('execution categories partition exact quantities without changing funding attribution or all-pool totals',()=>{
 const rows=[trade('a',own,'sell',2n**100n),trade('b',router,'buy',999n),trade('c',robot,'sell',100n),trade('d',null,'sell',21n),trade('e',router,'sell',17n,{group:'source_recipients'})];
 const before=structuredClone(rows),parts=executionBreakdown(rows),g=aggregateTrades(rows).remaining_unattributed;
 for(const field of ['sold_wei','bought_wei','net_sold_wei'])assert.equal(parts.reduce((n,r)=>n+BigInt(r[field]),0n).toString(),g[field]);
 assert.deepEqual(rows,before);assert.deepEqual(parts.map(p=>p.id),['own','binance','robot','other']);
});
test('public router classification follows the executor without asserting who owns the funding wallet',()=>{
 const p=executionBreakdown([trade('a',router,'sell',2,{address:a(2),initiator:own})])[0];
 assert.equal(p.id,'binance');assert.equal(p.examples[0].address,router);assert.equal(EXECUTION_LABELS[router].source,'BscScan 地址标签');
});
test('frequency uses distinct transactions within one Beijing day; duplicated pool legs do not inflate the threshold',()=>{
 const repeated=Array.from({length:150},()=>trade('same',a(9),'sell',1));assert.equal(executionBreakdown(repeated)[0].id,'other');
 const daily=Array.from({length:100},(_,i)=>trade('tx'+i,a(9),'sell',1));assert.equal(executionBreakdown(daily)[0].id,'frequency');
 const split=daily.map((t,i)=>({...t,timestamp:t.timestamp-(i<50?86400:0)}));assert.equal(executionBreakdown(split)[0].id,'other');
 const routed=daily.map(t=>({...t,executor:router}));assert.equal(executionBreakdown(routed)[0].id,'binance');
});
test('known own executions never fall into the high-frequency category; missing legacy identity remains explicit',()=>{
 const rows=Array.from({length:100},(_,i)=>trade('tx'+i,own,'sell',1));assert.equal(executionBreakdown(rows)[0].id,'own');
 const missing=executionBreakdown([trade('old',null,'sell',7,{initiator:null})])[0];assert.equal(missing.id,'other');assert.equal(missing.path_addresses_lower_bound,true);assert.deepEqual(missing.examples,[]);
});
test('holder import identities do not turn LPs, routers, vaults, exchanges or external wallets into confirmed robots',()=>{
 const lp='0x1db99241d9e230edc33996567ec2707c42475fd8',alpha='0x73d8bd54f7cf5fab43fe4ef40a62d390644946db';
 const unclassified=['0x238a358808379702088667322f80ac48bad5e6c4','0x53f78a071d04224b8e254e243fffc6d9f2f3fa23','0x1ab4973a48dc892cd9971ece8e01dcc7688f8f23','0x54403ec2c1035295e81172e1bf381d01df135f67','0x4252f9e683c7d38b6fd053346358f6460d982745'];
 assert.equal(EXECUTION_LABELS[lp].category,'own');assert.equal(EXECUTION_LABELS[alpha].category,'binance');
 for(const address of unclassified)assert.equal(EXECUTION_LABELS[address],undefined);
 const rows=[trade('lp',lp,'sell',10),trade('router',alpha,'buy',20),...unclassified.map((address,i)=>trade('external'+i,address,'sell',i+1)),trade('robot',robot,'buy',99)];
 const parts=executionBreakdown(rows);
 assert.deepEqual(parts.map(p=>p.id),['own','binance','robot','other']);
 assert.equal(parts.find(p=>p.id==='robot').bought_wei,'99');assert.equal(parts.find(p=>p.id==='robot').sold_wei,'0');
 for(const field of ['sold_wei','bought_wei','net_sold_wei'])assert.equal(parts.reduce((n,r)=>n+BigInt(r[field]),0n).toString(),aggregateTrades(rows).remaining_unattributed[field]);
});
