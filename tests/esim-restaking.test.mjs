import test from 'node:test';
import assert from 'node:assert/strict';
import seed from '../server/esim/restaking-seed.json' with {type:'json'};
import actual from './fixtures/esim-restaking-event.json' with {type:'json'};
import {TOKEN,SOURCE,ORIGIN,buildReport} from '../server/esim/metrics.mjs';
import {TRANSFER,topic} from '../server/esim/attribution.mjs';
import {ESIM_STAKE_EVENT} from '../server/esim/return-stakes.mjs';
import {matchRestakingLogs,validRestaking,advanceRestaking,restakingWindow} from '../server/esim/restaking.mjs';
import {collectRestaking,refreshRestaking} from '../server/esim/restaking-collector.mjs';
const hex=n=>'0x'+BigInt(n).toString(16),hash=n=>'0x'+n.toString(16).padStart(64,'0'),word=n=>BigInt(n).toString(16).padStart(64,'0');
const wallet='0x'+'1'.repeat(40),ts=v=>Date.parse(v)/1000;
function logs(value='100000000000000000000001',block=seed.throughBlock+1){
 const meta={transactionHash:hash(1),blockHash:hash(block),blockNumber:hex(block),transactionIndex:'0x0',removed:false};
 return {stake:{...meta,address:SOURCE,topics:[ESIM_STAKE_EVENT,topic(wallet),hash(0),hash(0)],data:'0x'+word(value)+word(0)+word(0),logIndex:'0x2'},transfer:{...meta,address:TOKEN,topics:[TRANSFER,topic(wallet),topic(SOURCE)],data:'0x'+word(value),logIndex:'0x1'}};
}
const snapshot={token:TOKEN,source:SOURCE,origin:ORIGIN,block:seed.throughBlock,blockHash:seed.blockHash,cutoff:seed.cutoff};
test('the actual historical contract event has four topics and three data words',()=>{
 const rows=matchRestakingLogs([actual.stake],[actual.transfer],seed);
 assert.equal(rows[0].value_wei,'2000000000000000000000');assert.equal(rows[0].tx,'0x87582ce18903f7baff893122aaa025a1dc5cc703cbaab49b9b27c087e9bcf73d');
 assert.throws(()=>matchRestakingLogs([{...actual.stake,topics:actual.stake.topics.slice(0,2)}],[actual.transfer],seed),/INVALID_EVENT/);
});
test('ordinary returns are excluded, amounts stay exact, and a receipt cannot satisfy two stake events',()=>{
 const {stake,transfer}=logs(),ordinary={...transfer,logIndex:'0x3',data:'0x'+word(7)};
 const rows=matchRestakingLogs([stake],[transfer,ordinary],seed);
 assert.equal(rows.length,1);assert.equal(rows[0].value_wei,'100000000000000000000001');
 assert.deepEqual(matchRestakingLogs([],[ordinary],seed),[]);
 assert.throws(()=>matchRestakingLogs([stake,{...stake,logIndex:'0x4'}],[transfer],seed),/TRANSFER_MISMATCH/);
 assert.throws(()=>matchRestakingLogs([stake],[{...transfer,blockHash:hash(4)}],seed),/TRANSFER_MISMATCH/);
 assert.throws(()=>matchRestakingLogs([stake],[{...transfer,data:'0x'+word(1)}],seed),/TRANSFER_MISMATCH/);
 assert.throws(()=>matchRestakingLogs([{...stake,removed:true}],[transfer],seed),/INVALID_EVENT/);
 assert.throws(()=>matchRestakingLogs([stake,stake],[transfer],seed),/DUPLICATE/);
});
test('a staking transport failure preserves independent core data and the last verified proof, then retries',async()=>{
 const state={...snapshot,block:seed.throughBlock+1,blockHash:hash(2),cutoff:seed.cutoff+20,restaking:seed,trades:[{id:'keep'}]},progress=[];
 const failed=await refreshRestaking(state,{rpc:async()=>{throw Error('RPC_UNAVAILABLE');}},{progress:e=>progress.push(e)});
 assert.equal(failed.block,state.block);assert.equal(failed.trades,state.trades);assert.equal(failed.restaking,seed);assert.equal(failed.restakingError,'RPC_UNAVAILABLE');assert.equal(progress[0].phase,'restaking-deferred');
 assert.equal(restakingWindow(failed.restaking,seed.origin,state.cutoff).complete,false);
 const recovered=await refreshRestaking({...snapshot,restaking:seed,restakingError:failed.restakingError},{});assert.equal(recovered.restakingError,null);
});
test('audited history is continuous, exact and matches the previously delivered daily figures',()=>{
 assert(validRestaking(seed,snapshot));assert.equal(seed.days.length,39);assert.equal(seed.events,9232);
 const expected={'2026-10-28':'2632513005300000000000000','2026-11-03':'4503834427100000000000000','2026-11-04':'4570768804100000000000000','2026-11-10':'2758980454800000000000000'};
 for(const [date,value]of Object.entries(expected))assert.equal(seed.days.find(d=>d.date===date).total_wei,value);
 assert.equal(seed.days[0].date,'2026-10-03');assert.equal(seed.days[0].total_wei,'0');
 assert(!validRestaking({...seed,total_wei:'1'},snapshot));
 assert(!validRestaking({...seed,days:seed.days.slice(1)},snapshot));
});
test('midnight and later incremental intervals are counted once, with explicit unknown legacy history',()=>{
 const block=seed.throughBlock+2,midnight=ts('2026-11-11T00:00:00+08:00');
 const rows=[{id:'before',block:block-1,timestamp:midnight-0.1,value_wei:'11'},{id:'midnight',block,timestamp:midnight,value_wei:'23'}];
 const next=advanceRestaking(seed,rows,{startBlock:seed.throughBlock+1,block,blockHash:hash(block),cutoff:midnight+10});
 assert.equal(restakingWindow(next,midnight-86400,midnight).total_wei,String(2758980454800000000000000n+11n));
 assert.equal(restakingWindow(next,midnight,midnight+10).total_wei,'23');
 assert.equal(seed.days.at(-1).total_wei,'2758980454800000000000000');
 assert.throws(()=>advanceRestaking(next,rows,{startBlock:seed.throughBlock+1,block,blockHash:hash(block),cutoff:midnight+20}),/LEDGER_GAP/);
 assert.equal(restakingWindow(null,midnight,midnight+10).total_wei,null);
 assert.equal(restakingWindow(next,midnight+20,midnight+30).total_wei,null);
 const state={...snapshot,version:1,trades:[],distributions:[],calls:[],native:[],firstRecipient:{},restaking:seed};
 const report=buildReport(state,seed.cutoff),legacy=buildReport({...state,restaking:undefined},seed.cutoff);
 assert.equal(report.history.length,39);assert(report.history.every(d=>d.restaking.total_wei!==null));
 assert.equal(report.windows.history.restaking.total_wei,seed.total_wei);
 assert(legacy.history.every(d=>d.restaking.total_wei===null));
});
test('collector requests only the unprocessed suffix and rejects a changed closing hash',async()=>{
 const block=seed.throughBlock+1,{stake,transfer}=logs('29',block),requests=[];
 const state={...snapshot,block,blockHash:hash(block),cutoff:seed.cutoff+10};let changed=false;
 const rpc=async(method,params)=>{
  requests.push([method,params]);
  if(method==='eth_getLogs'){assert.equal(params[0].fromBlock,hex(block));assert.equal(params[0].toBlock,hex(block));if(params[0].address===TOKEN)assert.equal(JSON.stringify(params[0]),JSON.stringify({address:TOKEN,topics:[TRANSFER,null,topic(SOURCE)],fromBlock:hex(block),toBlock:hex(block)}));return params[0].address===SOURCE?[stake]:[transfer];}
  if(params[0]===hex(seed.throughBlock))return {hash:seed.blockHash};
  return {hash:changed?hash(2):hash(block),number:hex(block),timestamp:hex(Math.floor(seed.cutoff)+1),transactions:[stake.transactionHash]};
 };
 const transport={rpc,batch:rows=>Promise.all(rows.map(([m,p])=>rpc(m,p)))};
 const result=await collectRestaking(state,transport);assert.equal(result.total_wei,String(BigInt(seed.total_wei)+29n));assert.equal(result.events,seed.events+1);
 const count=requests.length;assert.equal(await collectRestaking({...state,restaking:result},transport),result);assert.equal(requests.length,count);
 changed=true;await assert.rejects(collectRestaking(state,transport),/CANONICAL|END_CHANGED/);
 assert.equal(state.restaking,undefined);
});
