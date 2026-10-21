import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRpc } from '../server/esim/rpc.mjs';
import { refreshState, nativeFlow } from '../server/esim/collector.mjs';
import handler, { allowedOrigin } from '../api/esim.js';
import { windowMetrics, SOURCE, TOKEN } from '../server/esim/metrics.mjs';
import {SOURCE_INFLOW_SEED as seed,isSourceInflowAligned} from '../server/esim/source-inflows.mjs';

test('paid RPC has a hard request cap and reordered batch responses stay correctly mapped', async () => {
  let requests = 0;
  const t = makeRpc({ endpoint: 'https://example.invalid/rpc', budget: 1, fetch: async (_, options) => {
    requests++;
    return { ok: true, json: async () => JSON.parse(options.body).map(c => ({ id: c.id, result: c.params[0] })).reverse() };
  } });
  assert.deepEqual(await t.batch([['a', [7]], ['b', [8]]]), [7, 8]);
  await assert.rejects(t.rpc('c', []), /QUERY_LIMIT/);
  assert.equal(requests, 1);
});
test('transport failures never return upstream URL or raw errors', async () => {
  const t = makeRpc({ endpoint: 'https://example.invalid/private-path', fetch: async () => { throw new Error('https://example.invalid/private-path'); } });
  await assert.rejects(t.rpc('eth_chainId', []), e => e.message === 'RPC_UNAVAILABLE');
});
test('checkpoint mismatch rejects update and preserves state', async () => {
  const state = { block: 1, blockHash: 'old', trades: [{ value: '100' }] }, before = structuredClone(state);
  await assert.rejects(refreshState(state, { batch: async () => ['0x38', { hash: 'reorg' }, { number: '0x10' }] }), /CHAIN_OR_CHECKPOINT_CHANGED/);
  assert.deepEqual(state, before);
});
test('source ESIM balance is read at the same verified closing block as distributions',async()=>{
 const calls=[],end=seed.throughBlock+8,hex=n=>'0x'+n.toString(16),hash='0x'+'a'.repeat(64),state={version:1,token:TOKEN,source:SOURCE,block:seed.throughBlock,blockHash:seed.blockHash,cutoff:seed.cutoff,balance:'0',pools:{},firstRecipient:{},distributions:[{block:seed.throughBlock,value:(BigInt(seed.total_wei)-BigInt(seed.balance_wei)).toString()}],trades:[],calls:[],native:[],coverage:{}};
 const rpc=async(method,params)=>{
  calls.push([method,params]);
  if(method==='eth_chainId')return '0x38';
  if(method==='eth_getBlockByNumber')return params[0]==='latest'?{number:hex(end+20)}:params[0]===hex(seed.throughBlock)?{hash:seed.blockHash}:params[0]===hex(end+1)?{parentHash:hash,timestamp:hex(seed.cutoff+5)}:{hash,number:hex(end),timestamp:hex(seed.cutoff+4)};
  if(method==='eth_getBalance')return '0x0';
  if(method==='eth_call')return hex(BigInt(seed.balance_wei));
  if(method==='alchemy_getAssetTransfers')return {transfers:[]};
  if(['eth_getLogs','trace_filter'].includes(method))return [];
  throw Error(method);
 };
 const next=await refreshState(state,{rpc,batch:requests=>Promise.all(requests.map(([m,p])=>rpc(m,p)))},{maxBlocks:8});
 assert.deepEqual(next.sourceTokenBalance,{block:end,blockHash:hash,cutoff:seed.cutoff+5,balance_wei:seed.balance_wei});
 assert(isSourceInflowAligned(next.sourceInflow,next));assert.equal(next.sourceInflow.total_wei,seed.total_wei);
 const balanceReads=calls.filter(([m,p])=>m==='eth_call'&&p[0].to===TOKEN);
 assert.equal(balanceReads.length,1);assert.equal(balanceReads[0][1][1],hex(end));assert(balanceReads[0][1][0].data.endsWith(SOURCE.slice(2)));
 assert.equal(state.sourceTokenBalance,undefined);
});
test('API rejects unapproved origins and arbitrary paid RPC input before loading any data', async () => {
  assert.equal(allowedOrigin('https://evil.example', 'pancake-depth-viewer.vercel.app'), null);
  assert.equal(allowedOrigin('https://starkweng.github.io', 'pancake-depth-viewer.vercel.app'), 'https://starkweng.github.io');
  for (const [req, expected] of [
    [{ method: 'POST', headers: { origin: 'https://evil.example' } }, 403],
    [{ method: 'POST', headers: {}, body: { method: 'eth_getLogs' } }, 400],
    [{ method: 'POST', headers: {}, query: { address: '0x123' } }, 400],
    [{ method: 'DELETE', headers: {} }, 405],
  ]) {
    const res = { setHeader() {}, status(n) { this.code = n; return this; }, json() {} };
    await handler(req, res); assert.equal(res.code, expected);
  }
});
test('BNB window balances reconcile beginning + net inflow = ending', () => {
  const state = { origin: 0, cutoff: 40, balance: '60', nativeComplete: true, trades: [], distributions: [], firstRecipient: {},
    calls: [{ timestamp: 10, from: 'a', value: '100' }, { timestamp: 30, from: 'b', value: '20' }],
    native: [{ timestamp: 10, side: 'direct', value: '100' }, { timestamp: 20, side: 'out', value: '60' }, { timestamp: 30, side: 'direct', value: '20' }] };
  const b = windowMetrics(state, 15, 25).bnb;
  assert.equal(b.balance_start_wei, '100'); assert.equal(b.balance_end_wei, '40');
  assert.equal(BigInt(b.balance_start_wei) + BigInt(b.net_inflow_wei), BigInt(b.balance_end_wei));
});
test('native selfdestruct and creation transfers are counted, delegatecall and self-transfers are not', () => {
  const a = '0x' + '1'.repeat(40);
  assert.deepEqual(nativeFlow({ type: 'suicide', action: { address: a, refundAddress: SOURCE, balance: '0x10' }, traceAddress: [0] }), { from: a, to: SOURCE, value: '16', side: 'internal' });
  assert.equal(nativeFlow({ type: 'create', action: { from: SOURCE, value: '0x10' }, result: { address: a }, traceAddress: [0] }).side, 'out');
  assert.equal(nativeFlow({ type: 'call', action: { from: a, to: SOURCE, value: '0x10', callType: 'delegatecall' }, traceAddress: [0] }), null);
  assert.equal(nativeFlow({ type: 'call', action: { from: SOURCE, to: SOURCE, value: '0x10' }, traceAddress: [0] }), null);
});
