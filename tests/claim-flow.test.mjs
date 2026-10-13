import test from 'node:test';
import assert from 'node:assert/strict';
import {traceClaimFlow,claimFlowWindow} from '../server/esim/claim-flow.mjs';
const source='source',pool='pool',router='router';
const edge=(n,from,to,value,tx='tx'+n)=>({id:String(n),tx,order:[n,0,0],from,to,value:String(value)});
const sale=(tx,address,amount)=>({tx,address,side:'sell',amount_wei:String(amount),timestamp:100,block:9});
function run(transfers,trades=[],opening={}){return traceClaimFlow({source,zero:'zero',marketAddresses:[pool],openingBalances:Object.fromEntries(['a','b','c',router].map(a=>[a,String(opening[a]||0)])),transfers,trades});}
test('A to B to C crosses transactions and only the terminal sale counts',()=>{
 const r=run([edge(1,source,'a',100),edge(2,'a','b',80),edge(3,'b','c',60),edge(4,'c',pool,50)],[sale('tx4','c',50)]);
 assert.equal(r.totals.relay_wei,'50');assert.equal(r.totals.direct_wei,'0');assert.equal(r.totals.remaining_wei,'50');
 assert.deepEqual(r.sales[0].examples[0].path,['a','b','c',pool]);assert.equal(claimFlowWindow(r,0,101).relay_wei,'50');
});
test('mixed pre-existing coins are estimated in proportion to the balance',()=>{
 const r=run([edge(1,source,'a',100),edge(2,'a','b',100),edge(3,'b',pool,100)],[sale('tx3','b',100)],{b:100});
 assert.equal(r.totals.relay_wei,'50');assert.equal(r.totals.remaining_wei,'50');
});
test('same-transaction execution through a router retains the original funding owner',()=>{
 const r=run([edge(1,source,'a',100),edge(2,'a',router,100,'sell'),edge(3,router,pool,100,'sell')],[sale('sell','a',100)]);
 assert.equal(r.totals.direct_wei,'100');assert.equal(r.totals.relay_wei,'0');
});
test('pool output and later resale cannot count the same distributed tokens twice',()=>{
 const r=run([edge(1,source,'a',100),edge(2,'a',pool,100),edge(3,pool,'b',100),edge(4,'b',pool,100)],[sale('tx2','a',100),sale('tx4','b',100)]);
 assert.equal(r.totals.direct_wei,'100');assert.equal(r.totals.relay_wei,'0');assert.equal(r.totals.issued_wei,'100');
});
test('a sale before a claim, including in the same transaction, is not retroactive',()=>{
 const r=run([edge(1,'a',pool,100,'both'),edge(2,source,'a',100,'both')],[sale('both','a',100)],{a:100});
 assert.equal(r.totals.direct_wei,'0');assert.equal(r.totals.remaining_wei,'100');
});
test('transfers, LP deposits and mismatched complex input are not automatically sales',()=>{
 const r=run([edge(1,source,'a',100),edge(2,'a','b',100),edge(3,'b',pool,100)],[sale('tx3','b',60)]);
 assert.equal(r.totals.sold_wei,'0');assert.equal(r.totals.unconfirmed_pool_wei,'100');
});
test('splits, cycles, burns and returns preserve the issued token balance',()=>{
 const r=run([edge(1,source,'a',100),edge(2,'a','b',50),edge(3,'b','a',20),edge(4,'a',pool,40),edge(5,'b',source,10),edge(6,'b','zero',5)],[sale('tx4','a',40)]);
 assert.equal(r.totals.sold_wei,'40');assert.equal(r.totals.returned_wei,'10');assert.equal(r.totals.burned_wei,'5');assert.equal(r.totals.remaining_wei,'45');
});
test('large integers remain exact, and incomplete opening balances stop the model',()=>{
 const n=2n**100n,r=run([edge(1,source,'a',n),edge(2,'a','b',n),edge(3,'b',pool,n/2n)],[sale('tx3','b',n/2n)]);
 assert.equal(r.totals.sold_wei,(n/2n).toString());assert.equal(r.totals.remaining_wei,(n/2n).toString());
 assert.throws(()=>run([edge(1,'a','b',1)]),/FLOW_BALANCE/);
 assert.throws(()=>run([edge(1,source,'a',1),edge(1,source,'a',1)]),/DUPLICATE/);
});
