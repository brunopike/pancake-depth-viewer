import test from 'node:test';
import assert from 'node:assert/strict';
import {SOURCE_INFLOW_SEED as seed,buildSourceAccounting,validSourceAccounting} from '../server/esim/source-inflows.mjs';
import {buildReport,ORIGIN} from '../server/esim/metrics.mjs';
const hash='0x'+'a'.repeat(64),block=seed.throughBlock+10,cutoff=seed.cutoff+5;
const state={version:1,token:seed.token,source:seed.source,block,blockHash:hash,cutoff,origin:ORIGIN,
 distributions:[{block:seed.throughBlock,value:(BigInt(seed.total_wei)-BigInt(seed.balance_wei)).toString(),timestamp:seed.cutoff-1,recipient:'a'},
 {block,value:'1000000000000000001',timestamp:cutoff-1,recipient:'b'}],trades:[],calls:[],native:[],firstRecipient:{},
 sourceTokenBalance:{block,blockHash:hash,cutoff,balance_wei:(BigInt(seed.balance_wei)+5n).toString()}};
test('same-block source balance sheet reconciles the audited opening and later outflows in wei',()=>{
 const value=buildSourceAccounting(state);
 assert(value);assert.equal(value.incoming_wei,(BigInt(seed.total_wei)+1000000000000000006n).toString());
 assert.equal(BigInt(value.incoming_wei)-BigInt(value.outgoing_wei),BigInt(value.balance_wei));
 assert.equal(value.method,'balance-reconciliation-v1');assert(validSourceAccounting(value,state));
 const report=buildReport(state,cutoff);assert.equal(report.sourceAccounting.incoming_wei,value.incoming_wei);
 assert.equal(report.windows.history.distribution.total_wei,value.outgoing_wei);
});
test('missing opening coverage or a stale/future token balance cannot become a current inflow figure',()=>{
 for(const bad of [{...state,sourceTokenBalance:null},{...state,distributions:state.distributions.slice(1)},
  {...state,sourceTokenBalance:{...state.sourceTokenBalance,block:block-1}},
  {...state,sourceTokenBalance:{...state.sourceTokenBalance,blockHash:'0x'+'b'.repeat(64)}},
  {...state,distributions:[...state.distributions,{block:block+1,value:'1'}]}])assert.equal(buildSourceAccounting(bad),null);
 const value=buildSourceAccounting(state);
 assert.equal(validSourceAccounting({...value,incoming_wei:'1'},state),false);
 assert.equal(validSourceAccounting(value,{...state,block:block+1}),false);
});
