import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesTagFilters,selectHolders} from '../src/holder-model.mjs';
import {filterSellerRows,sellerPage} from '../src/seller-ranking.mjs';
import {sellerProfile} from '../src/holder-insights.mjs';

const address=i=>`0x${i.toString(16).padStart(40,'0')}`;
test('tag filters OR built-in and manual labels, treat own LP as own, and distinguish cleared from zero only',()=>{
 const tags=[{id:'own-lp',kind:'lp'},{id:'received-zero',kind:'cleared'}],manual={text:'钱包 A',kind:'lp'};
 assert(matchesTagFilters(tags,['own']));assert(matchesTagFilters(tags,['frequency','label:钱包 A'],manual));
 assert(matchesTagFilters(tags,['all']));assert(matchesTagFilters(tags,[]));
 assert(!matchesTagFilters(tags,['cleared']));assert(!matchesTagFilters(tags,['label:钱包 B'],manual));
 assert(matchesTagFilters([{id:'cleared',kind:'cleared'}],['cleared']));
});
test('seller tag filters intersect category and search across the full population without duplicate rows',()=>{
 const rows=Array.from({length:205},(_,i)=>({address:address(i+1),sold:String(i+1),bought:'0',received:true,own:i%2===0}));
 const getProfile=r=>({...r,tags:[{kind:'received'},{kind:r.own?'own':'frequency'}]});
 const selected=filterSellerRows(rows,{filter:'own',tags:['own','received']},getProfile);
 assert.equal(selected.length,103);assert.equal(new Set(selected).size,103);
 assert.equal(sellerPage(selected,0).rows.length,100);
 assert.equal(selected.reduce((n,r)=>n+BigInt(r.sold),0n),10609n);
 assert.equal(filterSellerRows(rows,{filter:'own',tags:['received'],search:address(3)},getProfile).length,1);
 assert.equal(filterSellerRows(rows,{filter:'other',tags:['own']},getProfile).length,0);
 assert.equal(rows.length,205);
});
test('historical seller filters do not borrow current receipt or post-receipt sale tags',()=>{
 const row={address:address(1),received:false,receivedSold:false},holder={address:row.address,balance:'0',tags:[{id:'received',kind:'received',text:'领过币'},{id:'received-sold',kind:'sold',text:'领币后卖出'},{id:'cleared',kind:'cleared',text:'领币后卖出 · 当前清仓'}]};
 for(const historical of [row,{...row,received:true},{...row,received:true,receivedSold:undefined}]){
  const profile=sellerProfile(historical,holder);
  assert.equal(matchesTagFilters(profile.tags,['received']),historical.received);
  assert(!matchesTagFilters(profile.tags,['received-sold','cleared']));
 }
 const current=sellerProfile({...row,received:true,receivedSold:true,firstReceivedSale:10},holder);
 assert(matchesTagFilters(current.tags,['received-sold']));assert(matchesTagFilters(current.tags,['cleared']));
});
test('relay sale estimate is available to holder filters without classifying the holder as a direct recipient',()=>{
 const holder={address:address(1),balance:'10',tags:[{id:'received-relay-sold',kind:'sold',text:'转手领币后卖出（估算）'}]};
 assert.equal(selectHolders({rows:[holder]},{filter:['received-relay-sold']}).total,1);
 assert.equal(selectHolders({rows:[holder]},{filter:['received']}).total,0);
 assert.equal(selectHolders({rows:[holder]},{filter:['received-sold','received-relay-sold']}).total,1);
});
test('historical seller relay-sale matching requires that window evidence rather than the latest holder tag',()=>{
 const row={address:address(1),received:false,receivedSold:false},holder={address:row.address,balance:'10',tags:[{id:'received-relay-sold',kind:'sold',text:'转手领币后卖出（估算）'}]};
 for(const historical of [{...row,relaySold:false,firstRelaySale:50},{...row,relaySold:undefined,firstRelaySale:50}]){
  assert(!matchesTagFilters(sellerProfile(historical,holder).tags,['received-relay-sold']));
 }
 for(const latestHolder of [holder,undefined]){
  const profile=sellerProfile({...row,relaySold:true,firstRelaySale:10},latestHolder);
  assert(matchesTagFilters(profile.tags,['received-relay-sold']));
  assert(!matchesTagFilters(profile.tags,['received','received-sold','cleared']));
  assert.equal(profile.tags.filter(t=>t.id==='received-relay-sold').length,1);
 }
});
