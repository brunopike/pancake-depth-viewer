import test from 'node:test';
import assert from 'node:assert/strict';
import {buildContractCohort} from '../server/esim/contract-cohort.mjs';
import {cohortPathSummary,cohortTrackingNote} from '../src/cohort-paths.mjs';
import {cohortCSV,renderCohort} from '../src/report-cohort.mjs';
const a=n=>'0x'+n.toString(16).padStart(40,'0'),h=n=>'0x'+n.toString(16).padStart(64,'0');
const event=(i,from,to,value='1')=>({id:String(i),tx:h(i+1),order:[100+Math.floor(i/6),Math.floor(i/2)%3,i%2],from:a(from),to:a(to),value});
function build(transfers,options={}){
 const addresses=new Set([a(1),...transfers.flatMap(e=>[e.from,e.to])]);
 return buildContractCohort({state:{source:a(90000),block:99999,blockHash:h(99999),cutoff:100,calls:[{from:a(1)}],distributions:[]},transfers,marketAddresses:[],openingBalances:{},closingBalances:Object.fromEntries([...addresses].map(address=>[address,'0'])),sourceBalances:{},returnedFlows:[],returnStakes:[],...options});
}
test('4,096 downstream hops survive shuffled input, block/transaction/log ordering, branches and cycles without duplication',()=>{
 const length=4096,transfers=Array.from({length},(_,i)=>event(i,i+1,i+2));
 transfers.push(event(length,2048,5000),event(length+1,5000,5001),event(length+2,length+1,1),event(length+3,1,length+1));
 const c=build(transfers.reverse()),summary=cohortPathSummary(c.rows);
 assert.equal(c.addressCount,length+3);assert.equal(c.downstreamCount,length+2);
 assert.equal(summary.maxDepth,length);assert.equal(summary.unresolvedCount,0);
 assert.equal(summary.depths.get(a(length+1)),length);assert.equal(summary.depths.get(a(5001)),2049);
 assert.equal(c.rows.find(r=>r.address===a(length+1)).via,a(length));
 assert.equal(new Set(c.rows.map(r=>r.address)).size,c.rows.length);
 const csv=cohortCSV(c.rows.filter(r=>r.address===a(length+1)),c.rows);
 assert(csv.includes('下游层级'));assert(csv.endsWith('"4096"'));
});
test('zero/self transfers do not create members; pre-receipt transfers do not establish a forward path',()=>{
 const c=build([event(0,2,3),event(1,1,2),event(2,2,4),event(3,1,5,'0'),event(4,1,1),event(5,4,6),event(6,2,3)]);
 assert.deepEqual(new Set(c.rows.map(r=>r.address)),new Set([1,2,3,4,6].map(a)));
 assert.equal(c.rows.find(r=>r.address===a(3)).viaTx,h(7));
 assert.equal(cohortPathSummary(c.rows).depths.get(a(6)),3);
 const before=build([event(0,2,3),event(1,1,2)]);assert(!before.rows.some(r=>r.address===a(3)));
});
test('exclude and public route/pool boundaries stop expansion; mixed terminals are counted once but not expanded',()=>{
 const router='0x07964f135f276412b3182a3b2407b8dd45000000';
 const transfers=[event(0,1,2),event(1,2,3),event(2,1,4),event(3,4,5),event(4,1,6),event(5,6,7),event(6,1,0),event(7,1,90000),{...event(8,1,8),to:router},{...event(9,8,9),from:router}];
 const c=build(transfers,{terminalAddresses:[a(2)],excludeAddresses:[a(4)],marketAddresses:[a(6)]});
 assert.deepEqual(new Set(c.rows.map(r=>r.address)),new Set([a(1),a(2)]));
 assert.equal(cohortPathSummary(c.rows).maxDepth,1);
});
test('deep path summaries are iterative and flag missing/cyclic ancestry instead of inventing levels',()=>{
 const rows=Array.from({length:20001},(_,i)=>({address:a(i+1),role:i?'downstream':'direct',via:i?a(i):null}));
 const summary=cohortPathSummary(rows.reverse());assert.equal(summary.maxDepth,20000);assert.equal(summary.unresolvedCount,0);
 const invalid=cohortPathSummary([{address:a(1),role:'downstream',via:a(2)},{address:a(2),role:'downstream',via:a(1)},{address:a(3),role:'downstream',via:a(99)},{address:a(4),role:'other',via:null}]);
 assert.equal(invalid.unresolvedCount,3);assert.equal(invalid.depths.get(a(4)),null);assert(cohortTrackingNote(invalid).includes('完整上游路径待核验'));
});
test('contract report exposes the verified depth and clearly states attribution boundaries',()=>{
 const c=build([event(0,1,2),event(1,2,3)]),html=renderCohort({external:{...c,ownExcludedCount:0,mmExcludedCount:0,other_balance_wei:'0'}},100);
 assert(html.includes('当前最深第 2 层'));assert(html.includes('不设固定层数上限'));assert(html.includes('不代表这些地址没有后续转账'));
});
