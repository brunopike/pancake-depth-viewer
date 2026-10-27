import test from 'node:test';import assert from'node:assert/strict';
import{snapshotTradingAddresses,readSnapshotBalances}from'../server/esim/snapshot-balances.mjs';
const a='0x'+'7'.repeat(40),b='0x'+'8'.repeat(40),c='0x'+'9'.repeat(40);
const report={version:1,windows:{history:{available:true,initiator:{rows:[{address:a}],buyOnlyRows:[{address:b}]},funding:{rows:[{address:c}],buyOnlyRows:[{address:a}]}}}};
test('verified allowlist covers both transaction modes and buy-only addresses, without holder-only expansion',()=>{
 assert.deepEqual([...snapshotTradingAddresses(report)].sort(),[a,b,c]);assert.strictEqual(snapshotTradingAddresses(report),snapshotTradingAddresses(report));
 assert.throws(()=>snapshotTradingAddresses({...report,windows:{}}),/UNAVAILABLE/);
});
test('balance API reads only the compact trading snapshot and queries all three assets at one confirmed block',async()=>{
 const reads=[],calls=[],transport={rpc:async(m,p)=>{calls.push([m,p]);return m==='eth_chainId'?'0x38':m==='eth_blockNumber'?'0x64':{hash:'verified',timestamp:'0x100'};},batch:async requests=>{calls.push(...requests);return ['0x123','0x456','0x789'];}};
 const read=async kind=>{reads.push(kind);return {data:report};};let result=await readSnapshotBalances([b],transport,{read});assert.deepEqual(reads,['addresses']);assert.equal(result[b].esim,'291');assert.equal(result[b].usdt,'1110');assert.equal(result[b].bnb,'1929');assert.equal(result[b].block,80);
 assert(calls.filter(([m])=>['eth_call','eth_getBalance'].includes(m)).every(([,p])=>p[1]==='0x50'));
 let count=calls.length;await assert.rejects(readSnapshotBalances(['0x'+'a'.repeat(40)],transport,{read}),/INVALID_BALANCE_ADDRESSES/);assert.equal(calls.length,count);
 await assert.rejects(readSnapshotBalances(Array(26).fill(a),transport,{read}),/INVALID_BALANCE_ADDRESSES/);
 await assert.rejects(readSnapshotBalances([a,a],transport,{read}),/INVALID_BALANCE_ADDRESSES/);
 await assert.rejects(readSnapshotBalances([c],transport,{read:async()=>{throw Error('SNAPSHOT_UNAVAILABLE');}}),/SNAPSHOT_UNAVAILABLE/);
});
