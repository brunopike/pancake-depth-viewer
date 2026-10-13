import test from 'node:test';
import assert from 'node:assert/strict';
import { addressRanking, buildAddressReport, buildAddressPage, addressOptions, OWN_EXECUTOR } from '../server/esim/addresses.mjs';
import { queryBalances } from '../server/esim/balances.mjs';
import { TOKEN, ORIGIN } from '../server/esim/metrics.mjs';
const a = '0x' + '1'.repeat(40), b = '0x' + '2'.repeat(40), router = '0x' + '3'.repeat(40);
const state = { origin: ORIGIN, cutoff: ORIGIN + 1000, block: 1, firstRecipient: { [a]: { timestamp: ORIGIN + 5 } }, trades: [
 { tx: 't1', timestamp: ORIGIN + 10, side: 'sell', amount_wei: '100', initiator: a, executor: OWN_EXECUTOR, address: router },
 { tx: 't1', timestamp: ORIGIN + 10, side: 'sell', amount_wei: '50', initiator: a, executor: OWN_EXECUTOR, address: router },
 { tx: 't1', timestamp: ORIGIN + 10, side: 'buy', amount_wei: '75', initiator: a, executor: OWN_EXECUTOR, address: null },
 { tx: 't2', timestamp: ORIGIN + 15, side: 'sell', amount_wei: '20', initiator: b, executor: router, address: null },
] };
test('ownership follows the specified execution contract and initiator is distinct from funding address', () => {
 const r = buildAddressReport(state, state.cutoff); const ranked = r.windows.history.initiator.rows;
 assert.equal(r.ownProgramCount, 1); assert.equal(ranked[0].address, a); assert.equal(ranked[0].ownType, '刷量');
 assert.equal(ranked[0].received, true); assert.equal(ranked[1].own, false);
 assert.equal(ranked[0].sold, '150'); assert.equal(ranked[0].netSold, '75'); assert.equal(ranked[0].trades, 1);
 assert.equal(ranked[0].sellCount, 1); assert.equal(ranked[0].buyCount, 1);
 assert.equal(r.windows.history.funding.rows[0].address, router);
 assert.equal(r.windows.history.funding.missingSold, '20');
 assert.equal(r.windows.history.initiator.missingSold, '0');
});
test('high frequency counts unique transactions per Beijing calendar day and does not imply ownership', () => {
 const trades = Array.from({length:100},(_,i)=>({ ...state.trades[3], tx:'freq'+i, timestamp: ORIGIN + i }));
 const r = addressRanking({ ...state, trades }, ORIGIN, state.cutoff).rows[0];
 assert.equal(r.highFrequency,true); assert.equal(r.own,false); assert.equal(r.peakDailyTrades,100);
});
test('balance queries use one confirmed block, support three currencies, cache, and reject unknown addresses', async () => {
 const calls = [];
 const transport = { rpc: async (m,p) => { calls.push([m,p]); return m === 'eth_chainId' ? '0x38' : m === 'eth_blockNumber' ? '0x64' : { hash:'0xverified', timestamp:'0x64' }; },
 batch: async requests => { calls.push(...requests); return ['0x64','0xc8','0x12c']; } };
 const result = await queryBalances(state,[a],transport);
 assert.equal(result[a].esim,'100'); assert.equal(result[a].usdt,'200'); assert.equal(result[a].bnb,'300'); assert.equal(result[a].block,80);
 assert.equal(calls.filter(([m])=>m==='eth_call').length,2);
 assert(calls.filter(([m])=>['eth_call','eth_getBalance'].includes(m)).every(([,p])=>p[1]==='0x50'));
 const count = calls.length; await queryBalances(state,[a],transport); assert.equal(calls.length,count);
 await assert.rejects(queryBalances(state,['0x'+'9'.repeat(40)],transport),/INVALID_BALANCE_ADDRESSES/);
 await assert.rejects(queryBalances(state,Array(26).fill(a),transport),/INVALID_BALANCE_ADDRESSES/);
});
test('reorganized balance block is rejected before publication', async () => {
 let reads = 0;
 const transport = { rpc: async m => m==='eth_chainId'?'0x38':m==='eth_blockNumber'?'0x64':{hash:++reads===1?'before':'after',timestamp:'0x64'}, batch:async()=>['0x1','0x2','0x3'] };
 await assert.rejects(queryBalances(state,[b],transport),/BALANCE_BLOCK_CHANGED/);
});

test('server address response is paginated and filters do not broaden the paid balance scope', () => {
 const trades=Array.from({length:80},(_,i)=>({...state.trades[0],tx:'t'+i,initiator:'0x'+(i+10).toString(16).padStart(40,'0'),amount_wei:String(i+1)}));
 const page=buildAddressPage({...state,trades},{period:'history',page:'1'},state.cutoff);
 assert.equal(page.rows.length,25);assert.equal(page.total,80);assert.equal(page.page,1);assert.equal(page.rows[0].sold,'55');
 assert.equal(buildAddressPage(state,{period:'history',filter:'received'},state.cutoff).total,1);
 assert.throws(()=>addressOptions({page:'-1'}),/INVALID_ADDRESS_FILTER/);
 assert.throws(()=>addressOptions({mode:'anything'}),/INVALID_ADDRESS_FILTER/);
});
