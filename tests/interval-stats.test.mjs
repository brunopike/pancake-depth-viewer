import test from 'node:test';
import assert from 'node:assert/strict';
import { intervalStats } from '../src/interval-stats.mjs';
import { buildDepth, MIN_TICK, MAX_TICK } from '../src/math.mjs';
import { OWNERS, CL_POSITION_MANAGER } from '../src/ownership.mjs';

const base = {id:'base', decimals:18}, quote = {id:'quote', decimals:18};
const v2 = {kind:'v2', token0:base, token1:quote, reserve0:1000e18, reserve1:4000e18, tvlUSD:'8000',
  ownership:{status:'verified', ownBalance:3n, totalSupply:10n}};
const near = (a,b) => assert.ok(Math.abs(a-b) <= Math.max(1,Math.abs(b))*1e-9, `${a} != ${b}`);
test('V2 interval amounts match constant-product deltas above, below and across the reference', () => {
  const value = intervalStats([v2], 'base', 4, 2, 8);
  near(value.bid.total.quantity, 1000*(Math.sqrt(2)-1));
  near(value.bid.total.quote, 4000*(1-1/Math.sqrt(2)));
  near(value.ask.total.quantity, 1000*(1-1/Math.sqrt(2)));
  near(value.ask.total.quote, 4000*(Math.sqrt(2)-1));
  for (const side of ['bid','ask']) for (const key of ['quantity','quote']) {
    near(value[side].own[key], value[side].total[key]*.3);
    near(value[side].own[key]+value[side].external[key],value[side].total[key]);
  }
  const band=intervalStats([v2],'base',4,6,8);
  near(band.ask.total.quantity, Math.sqrt(4e6/6)-Math.sqrt(4e6/8));
  near(band.ask.total.quote, Math.sqrt(4e6*8)-Math.sqrt(4e6*6));
  assert.equal(band.bid.total.quantity,0);
  assert.deepEqual(intervalStats([v2],'base',4,8,6),band);
});
test('mixed decimals and inverse token order preserve units', () => {
  const p={...v2,token0:{...base,decimals:6},reserve0:1000e6};
  const forward=intervalStats([p],'base',4,6,8).ask.total;
  const inverse=intervalStats([p],'quote',.25,1/8,1/6).bid.total;
  near(forward.quantity,inverse.quote); near(forward.quote,inverse.quantity);
});
test('CL segments cross empty liquidity gaps and match exact initialized tick bounds', () => {
  const L=1000n*10n**18n;
  const p={kind:'cl',token0:base,token1:quote,sqrtPriceX96:2n**96n,tick:0,liquidity:L,
    fullRange:true,minTick:MIN_TICK,maxTick:MAX_TICK,tvlUSD:'10000',
    ticks:[{index:-200,net:L},{index:200,net:-L},{index:1000,net:L},{index:1200,net:-L}]};
  const out=intervalStats([p],'base',1,1.0001**100,1.0001**1100);
  near(out.ask.total.quantity,1000*(1/1.0001**50-1/1.0001**100)+1000*(1/1.0001**500-1/1.0001**550));
  near(out.ask.total.quote,1000*(1.0001**100-1.0001**50)+1000*(1.0001**550-1.0001**500));
  assert.equal(out.ask.own,null); assert.equal(out.ask.external,null);
  assert.equal(intervalStats([p],'base',1,1.0001**300,1.0001**400).ask.total.quote,0);
});
test('exact ranges match book totals and partition without rounding or dependence on display precision', () => {
  const book=buildDepth([v2],'base',{percent:50,precision:2});
  const out=intervalStats([v2],'base',book.price,book.low,book.high);
  near(out.bid.total.quote,book.bids.at(-1).cumulativeQuote);
  near(out.ask.total.quantity,book.asks.at(-1).cumulativeQuantity);
  const a=intervalStats([v2],'base',4,4,5),b=intervalStats([v2],'base',4,5,6);
  for(const key of ['quantity','quote']) near(a.ask.total[key]+b.ask.total[key],out.ask.total[key]);
  const higher={...v2,reserve1:9000e18};
  near(intervalStats([v2,higher],'base',4,4,6).ask.total.quote,out.ask.total.quote);
});
test('CL own and external positions reconcile across distant ticks in either token direction', () => {
  const L=1000n*10n**18n;
  const p={kind:'cl',protocol:'infinityCl',spacing:10,token0:base,token1:quote,sqrtPriceX96:2n**96n,tick:0,liquidity:L,
    fullRange:true,minTick:MIN_TICK,maxTick:MAX_TICK,tvlUSD:'10000',
    ticks:[{index:-200,net:L},{index:200,net:-L},{index:1000,net:L},{index:1200,net:-L}],
    ownership:{status:'verified',positions:[
      {owner:OWNERS[0],tokenId:'1',manager:CL_POSITION_MANAGER,tickLower:-200,tickUpper:200,liquidity:L/2n},
      {owner:OWNERS[1],tokenId:'2',manager:CL_POSITION_MANAGER,tickLower:1000,tickUpper:1200,liquidity:L/4n}]}};
  const low=1.0001**50,high=1.0001**1100,forward=intervalStats([p],'base',1,low,high).ask;
  near(forward.own.quantity,500*(1/1.0001**25-1/1.0001**100)+250*(1/1.0001**500-1/1.0001**550));
  const inverse=intervalStats([p],'quote',1,1/high,1/low).bid;
  for(const group of ['total','own','external']) {near(forward[group].quantity,inverse[group].quote); near(forward[group].quote,inverse[group].quantity);}
  for(const key of ['quantity','quote']) near(forward.own[key]+forward.external[key],forward.total[key]);
});
test('invalid inputs and incomplete coverage fail; unknown attribution stays unknown', () => {
  for(const bounds of [['',5],[0,5],[-1,5],[5,5],[4,Infinity],[NaN,5]]) assert.throws(()=>intervalStats([v2],'base',4,...bounds),/价格/);
  assert.throws(()=>intervalStats([v2],'base',4,3,5,{expectedPoolCount:2}),/未读完整/);
  assert.throws(()=>intervalStats([v2],'base',4,3,5,{failedCount:1}),/未读完整/);
  const out=intervalStats([{...v2,ownership:undefined}],'base',4,3,5);
  assert.ok(out.ask.total.quantity>0); assert.equal(out.ask.own,null); assert.equal(out.bid.external,null);
  assert.throws(()=>intervalStats([],'base',4,3,5),/未读完整/);
});
