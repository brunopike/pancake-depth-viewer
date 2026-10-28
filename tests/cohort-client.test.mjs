import test from 'node:test';import assert from 'node:assert/strict';import {gzipSync} from 'node:zlib';
import {readContractCohort,retainContractCohort} from '../src/cohort-client.mjs';
const hash='0x'+'1'.repeat(64),snapshot={block:100,blockHash:hash,cutoff:200};
const empty={version:1,method:'interaction-recipient-downstream-v1',throughBlock:100,blockHash:hash,cutoff:200,rows:[],addressCount:0,directCount:0,downstreamCount:0,interactedCount:0,receivedCount:0,holdingCount:0,balance_wei:'0',direct_balance_wei:'0',downstream_balance_wei:'0',source_balance_wei:'0',stake_wei:'0',source_stake_wei:'0',other_return_wei:'0',stakeTransactions:0,stakeAddresses:0};
test('refresh keeps compatible cohort before the asynchronous request and rejects reorg or future evidence',()=>{
 const next={...snapshot,block:101,cutoff:201};assert.equal(retainContractCohort(next,empty).cohort,empty);
 assert.equal(retainContractCohort({...snapshot,blockHash:'0x'+'2'.repeat(64)},empty).cohort,undefined);
 assert.equal(retainContractCohort({...snapshot,block:99},empty).cohort,undefined);
 const old={...empty,throughBlock:99,cutoff:199};assert.equal(retainContractCohort({...snapshot,cohort:empty},old).cohort,empty);
});
test('small cohort snapshot is pinned, validated, cached and cannot replace newer evidence',async()=>{
 let calls=0;const fetch=async()=>{calls++;return new Response(gzipSync(JSON.stringify(empty)));};
 const result=await readContractCohort(snapshot,{fetch});assert.deepEqual(result.cohort,empty);
 await readContractCohort(snapshot,{fetch});assert.equal(calls,1);
 const newer={...empty,throughBlock:101,cutoff:201};assert.equal((await readContractCohort({...snapshot,block:102,cutoff:202,cohort:newer},{fetch})).cohort,newer);
});
test('bad sums, future blocks, mismatched hashes and network failures preserve the report',async()=>{
 for(const c of [{...empty,balance_wei:'1'},{...empty,throughBlock:101},{...empty,blockHash:'0x'+'2'.repeat(64)},{...empty,throughBlock:'100'},{...empty,cutoff:-1}])assert.equal(await readContractCohort(snapshot,{fetch:async()=>new Response(gzipSync(JSON.stringify(c)))}),snapshot);
 assert.equal(await readContractCohort(snapshot,{fetch:async()=>{throw Error('offline');}}),snapshot);
});
test('production mirror failures use the public checkpoint fallback',async()=>{
 const before=globalThis.location;globalThis.location={hostname:'esimonchain.imstark.site'};
 try{const {readContractCohort:read}=await import('../src/cohort-client.mjs?mirror-fallback');let calls=0;const result=await read(snapshot,{fetch:async url=>{calls++;if(url.startsWith('./'))return new Response('',{status:503});return new Response(gzipSync(JSON.stringify(empty)));}});assert.equal(calls,2);assert.deepEqual(result.cohort,empty);}finally{if(before===undefined)delete globalThis.location;else globalThis.location=before;}
});
