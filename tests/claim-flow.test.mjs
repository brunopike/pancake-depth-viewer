import test from 'node:test';
import assert from 'node:assert/strict';
import {traceClaimFlow,claimFlowWindow,claimFlowAlreadyPublished} from '../server/esim/claim-flow.mjs';
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
test('equal remainders allocate exact wei deterministically across partial and full-wallet moves',()=>{
 const r=run([edge(1,source,'c',1),edge(2,source,'b',1),edge(3,source,'a',1),edge(4,'c',router,1),edge(5,'b',router,1),edge(6,'a',router,1),edge(7,router,pool,1),edge(8,router,pool,2)],[sale('tx7',router,1),sale('tx8',router,2)]);
 assert.deepEqual(r.sales.map(row=>row.relay_wei),['1','2']);
 assert.deepEqual(r.sales[0].examples.map(row=>row.root),['a']);
 assert.deepEqual(r.sales[1].examples.map(row=>row.root),['c','b']);
 assert.equal(r.totals.remaining_wei,'0');assert.equal(r.totals.issued_wei,r.totals.sold_wei);
});
test('a serialized transaction-boundary checkpoint produces exactly the full replay result',()=>{
 const transfers=[edge(1,source,'a',101),edge(2,'a',router,51),edge(3,source,'b',99),edge(4,'b',router,49),edge(5,router,'c',37),edge(6,'c',pool,31,'sell'),edge(7,router,source,11),edge(8,router,'zero',3)];
 const trades=[sale('sell','c',31)],options={source,zero:'zero',marketAddresses:[pool],openingBalances:{a:'0',b:'0',c:'0',[router]:'17'},trades};
 const first=traceClaimFlow({...options,transfers:transfers.slice(0,4)});
 assert(first.replayState);
 const saved=JSON.parse(JSON.stringify(first));
 const next=traceClaimFlow({...options,transfers:transfers.slice(4),previous:saved});
 assert.deepEqual(next,traceClaimFlow({...options,transfers}));
 assert.deepEqual(traceClaimFlow({...options,transfers:[],previous:JSON.parse(JSON.stringify(next))}),next);
});
test('publishing the initial resumable checkpoint does not skip an equal-block legacy report',()=>{
 const report={throughBlock:100,modelRevision:3,replayCheckpointVersion:1,replayInputHash:'new'};
 assert.equal(claimFlowAlreadyPublished({throughBlock:100,modelRevision:3},report),false);
 assert.equal(claimFlowAlreadyPublished(report,report),true);
 assert.equal(claimFlowAlreadyPublished({...report,throughBlock:101},report),true);
 assert.equal(claimFlowAlreadyPublished({...report,modelRevision:4},report),true);
 assert.equal(claimFlowAlreadyPublished({...report,replayInputHash:'old'},report),false);
});
test('many serialized checkpoints retain exact rounding, mixed roots, returns and sell classification',()=>{
 let seed=7;const random=n=>{seed=(seed*16807)%2147483647;return seed%n;},addresses=['a','b','c',router],balances=Object.fromEntries(addresses.map(a=>[a,200])),transfers=[],trades=[];
 for(let i=1;i<=180;i++){
  let from=addresses[random(addresses.length)],to=[source,pool,...addresses][random(6)];
  if(i%5===0)from=source;
  const value=from===source?random(100)+1:random(balances[from]+1);
  if(from!==source)balances[from]-=value;
  if(to!==source&&to!==pool)balances[to]+=value;
  transfers.push(edge(i,from,to,value));
  if(to===pool)trades.push(sale('tx'+i,from,value));
 }
 const options={source,zero:'zero',marketAddresses:[pool],openingBalances:Object.fromEntries(addresses.map(a=>[a,'200'])),trades};
 let previous=null;
 for(let i=0;i<transfers.length;i+=15)previous=JSON.parse(JSON.stringify(traceClaimFlow({...options,transfers:transfers.slice(i,i+15),previous})));
 assert.deepEqual(previous,traceClaimFlow({...options,transfers}));
 const first=traceClaimFlow({...options,transfers:[edge(1,source,'a',10,'split')]});
 assert.throws(()=>traceClaimFlow({...options,transfers:[edge(2,'a',pool,1,'split')],previous:first}),/FLOW_REPLAY_BOUNDARY/);
});

test('independent receipts into one hub do not repeatedly walk all its existing origins',()=>{
 const n=200,transfers=[],opening={hub:'0'};let order=1;
 for(let i=0;i<n;i++){const wallet='root'+i;opening[wallet]='0';transfers.push(edge(order++,source,wallet,1));}
 for(let i=0;i<n;i++)transfers.push(edge(order++,'root'+i,'hub',1));
 const values=Map.prototype.values;let visits=0;
 Map.prototype.values=function*(){for(const item of values.call(this)){if(item&&Object.hasOwn(item,'root')&&Object.hasOwn(item,'amount'))visits++;yield item;}};
 let result;try{result=traceClaimFlow({source,zero:'zero',marketAddresses:[pool],openingBalances:opening,transfers,trades:[]});}finally{Map.prototype.values=values;}
 assert.equal(result.closingBalances.hub,String(n));assert.equal(result.totals.issued_wei,String(n));assert.equal(result.totals.remaining_wei,String(n));
 assert(visits<12*n,`origin visits ${visits} must grow linearly with independent receipts`);
});
