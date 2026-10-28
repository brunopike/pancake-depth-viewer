import test from 'node:test';
import assert from 'node:assert/strict';
import registry from '../src/mm-own-addresses.json' with {type:'json'};
import {SEED} from '../server/esim/holders.mjs';
import {CONFIRMED_HOLDER_LABELS} from '../src/holder-labels.mjs';
import {rowTags,ownershipAmounts} from '../src/holder-model.mjs';
import {holderLedger} from '../src/holder-overview.mjs';
import {addressRanking} from '../server/esim/addresses.mjs';
import {EXECUTION_LABELS} from '../server/esim/execution-categories.mjs';

test('confirmed MM registry reaches backend, cached-holder classification and sell rankings without importing balances',()=>{
 assert.equal(registry.records.length,246);
 assert.equal(new Set(registry.records.map(r=>r.address)).size,246);
 assert.equal(registry.records.filter(r=>r.number).length,46);
 const trades=registry.records.map((r,i)=>({address:r.address,initiator:r.address,side:'sell',amount_wei:String(i+1),tx:String(i),timestamp:10}));
 const state={trades,firstRecipient:{},claimFlow:null};
 const ranking=addressRanking(state,0,20);
 assert.equal(ranking.rows.length,246);
 for(const r of registry.records){
  assert.match(r.address,/^0x[0-9a-f]{40}$/);
  assert(!('balance' in r));assert(['own','lp'].includes(SEED.labels[r.address].kind));
  assert(['own','lp'].includes(CONFIRMED_HOLDER_LABELS[r.address].kind));
  assert.equal(EXECUTION_LABELS[r.address].category,'own');
  const row={address:r.address,balance:'9007199254740993001',tags:[{id:'frequency',kind:'frequency',text:'高频'}]};
  assert.equal(ownershipAmounts(row).own,row.balance);
  assert(!rowTags(row,{}).some(t=>['frequency','arbitrage'].includes(t.kind)));
  assert(ranking.rows.find(x=>x.address===r.address).own);
 }
 const a=registry.records[0].address,external='0x0000000000000000000000000000000000000011';
 const ledger=holderLedger({totalSupply:'100',rows:[{address:a,balance:'70',tags:[]},{address:external,balance:'30',tags:[]}]});
 assert.equal(ledger.own,'70');assert.equal(ledger.external,'30');assert.equal(ledger.indexed,'100');
});
