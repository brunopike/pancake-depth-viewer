import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createSnapshotReader} from '../server/esim/view-cache.mjs';
import {holderViewOptions,sellerViewOptions,buildHolderView,buildHolderSummary,buildSellerView,validateBalanceValues} from '../server/esim/views.mjs';
import {createViewHandler} from '../api/esim-view.js';
import {selectHolderView,holderLedger,holderOverviewCharts} from '../src/holder-overview.mjs';
import {holderInsights} from '../src/holder-insights.mjs';
import {HOLDER_SORT_KEYS} from '../src/holder-ranking.mjs';
import {cacheData} from '../src/data-cache.mjs';
import {cachedView,readView,compactViewsEnabled} from '../src/view-client.mjs';
const W=10n**18n,address=n=>'0x'+n.toString(16).padStart(40,'0');
const rows=Array.from({length:235},(_,i)=>({address:address(i+1),balance:(BigInt(i)*W+1n).toString(),priorBalance:null,change24h:null,tags:i%3===0?[{id:'received',kind:'received',text:'领过币'}]:[],day:{buyAmount:String(i*3),sellAmount:String(235-i),buyCount:i%11,sellCount:i%13},history:{buyAmount:String(i*2),sellAmount:String(i),buyCount:i%7,sellCount:i%5}}));
rows.push({address:'0x588177775e6fba9e752d0c9dfd5bbb562e8f016a',balance:(500000n*W).toString(),tags:[]});
rows.push({address:address(999),balance:(400000n*W).toString(),tags:[{id:'own',kind:'own',text:'我方'}]});
const holders={version:1,block:100,cutoff:1000,totalSupply:(1000000n*W).toString(),rows};
const saleRows=rows.slice(0,210).map((r,i)=>({address:r.address,sold:String(i+1),bought:String(i*2),netSold:String(1-i),sellCount:i%4+1,buyCount:i%3,received:i%3===0,own:i<5}));
const period={start:0,end:1000,available:true,initiator:{rows:saleRows,buyOnlyRows:[{address:address(900),sold:'0',bought:'777',own:true}],missingSold:'5',missingBought:'6'}};period.funding=period.initiator;
const trades={version:1,block:99,cutoff:999,windows:{today:period,yesterday:period,history:period}};
const packed=(data,etag='one')=>({block:data.block,etag,body:gzipSync(JSON.stringify(data)).toString('base64')});

test('compact holders preserve global totals, chart and full-result order before paging for every sort',()=>{
 for(const scope of ['all','own','external-stat','received','excluded'])for(const sort of HOLDER_SORT_KEYS)for(const direction of ['asc','desc']){
  const options=holderViewOptions({scope,sort,direction,page:'1',pageSize:'50',includeZero:'1'}),full=selectHolderView(holders,options),view=buildHolderView(holders,options);
  assert.deepEqual(view.selected.rows,full.rows);assert.equal(view.selected.total,full.total);assert.equal(view.selected.balance,full.all.reduce((n,r)=>n+BigInt(r.balance),0n).toString());assert.deepEqual(view.selected.charts,holderOverviewCharts(full.all));assert(!Object.hasOwn(view.report,'rows'));
 }
 const options=holderViewOptions({scope:'external-stat',minimum:(100000n*W).toString()});assert.equal(buildHolderView(holders,options).selected.balance,(409924n*W).toString());
 const filtered=holderViewOptions({tags:'received',search:'0x000',cohort:'held',includeZero:'1'});assert.deepEqual(buildHolderView(holders,filtered).selected.rows,selectHolderView(holders,filtered).rows);
});
test('summary uses the complete ledger and only explicitly requested full addresses',()=>{
 const view=buildHolderSummary(holders,[rows[5].address,address(999999)]);assert.deepEqual(view.insights,holderInsights(holders));assert.deepEqual(view.ledger,holderLedger(holders));assert.deepEqual(view.rows,[rows[5]]);
});
test('seller global overview includes buy-only and unassigned fills independently from ranking filters',()=>{
 const view=buildSellerView(trades,holders,sellerViewOptions({filter:'own',page:'99'}));
 const all=view.groups.find(g=>g.id==='all'),own=view.groups.find(g=>g.id==='own');
 assert.equal(all.bought,(saleRows.reduce((n,r)=>n+BigInt(r.bought),0n)+783n).toString());assert.equal(own.bought,'797');assert.equal(view.total,5);assert.equal(view.page,0);assert.equal(view.totals.sold,'15');assert.equal(view.holders.rows.length,5);
 const paged=buildSellerView(trades,holders,sellerViewOptions({page:'1'}));assert.equal(paged.rows.length,100);assert.equal(paged.rows[0].address,saleRows[109].address);assert.equal(paged.total,210);assert.equal(paged.groups.find(g=>g.id==='all').sold,all.sold);
 assert(!Object.hasOwn(view.windows.today,'initiator'));
});
test('optional queried balance sorting preserves known-first behavior and full integer precision',()=>{
 const balanceValues=validateBalanceValues({[saleRows[0].address]:{block:101,timestamp:1001,esim:'999999999999999999999999999',bnb:'999999999999999999999999999',usdt:'1',ignored:'no'}});
 const view=buildSellerView(trades,holders,sellerViewOptions({sort:'bnb'}),balanceValues);assert.equal(view.rows[0].address,saleRows[0].address);assert(!Object.hasOwn(balanceValues.get(saleRows[0].address),'ignored'));
 assert.throws(()=>validateBalanceValues({invalid:{block:2}}));assert.throws(()=>validateBalanceValues({[address(1)]:{block:1,timestamp:2,esim:'1e9'}}));
});
test('warm snapshot cache singleflights heavy reads and checks small revisions only',async()=>{
 let reads=0,checks=0,now=0,revision=packed(holders);const read=createSnapshotReader({now:()=>now,ttl:10,metadata:async()=>{checks++;return revision;},read:async()=>{reads++;await new Promise(r=>setTimeout(r,5));return revision;}});
 const first=await Promise.all([read('holders'),read('holders')]);assert.strictEqual(first[0],first[1]);assert.equal(reads,1);
 now=11;await read('holders');assert.equal(checks,1);assert.equal(reads,1);
 revision=packed({...holders,block:101},'two');now=22;assert.equal((await read('holders')).data.block,101);assert.equal(reads,2);
 revision=packed(holders,'old');now=33;await assert.rejects(read('holders'),/REGRESSED/);
 revision=packed({...holders,block:102},'three');assert.equal((await read('holders')).data.block,102);
});
const response=()=>({headers:{},status(s){this.code=s;return this;},setHeader(k,v){this.headers[k]=v;},json(data){this.body=data;return this;},send(data){this.body=data;return this;},end(){return this;}});
test('compact API gzip, ETag, POST balances, input errors and storage failure have honest statuses',async()=>{
 const handler=createViewHandler(async kind=>({data:kind==='holders'?holders:trades,etag:kind+'-1'}));let res=response();
 await handler({method:'GET',query:{kind:'holders'},headers:{}},res);assert.equal(res.code,200);const data=JSON.parse(gunzipSync(res.body));assert.equal(data.selected.rows.length,100);
 const etag=res.headers.ETag;res=response();await handler({method:'GET',query:{kind:'holders'},headers:{'if-none-match':'W/'+etag}},res);assert.equal(res.code,304);assert.equal(res.body,undefined);
 res=response();await handler({method:'POST',query:{kind:'sellers',sort:'usdt'},headers:{},body:{balances:{[saleRows[0].address]:{block:101,timestamp:1001,usdt:'999'}}}},res);assert.equal(res.code,200);assert.equal(JSON.parse(gunzipSync(res.body)).rows[0].address,saleRows[0].address);assert.equal(res.headers['Cache-Control'],'private, no-cache');
 for(const req of [{method:'DELETE',query:{kind:'holders'}},{method:'GET',query:{kind:'summary',addresses:'bad'}},{method:'POST',query:{kind:'sellers'},headers:{'content-length':'2000001'}}]){res=response();await handler(req,res);assert.equal(res.code,req.method==='DELETE'?405:400);}
 res=response();await createViewHandler(async()=>{throw Error('offline');})({method:'GET',query:{kind:'holders'},headers:{}},res);assert.equal(res.code,503);assert.equal(res.headers['Cache-Control'],'no-store');
});
test('view client retains its valid cache on 304 and rejects malformed network responses',async()=>{
 const view=buildHolderView(holders,holderViewOptions({})),options={search:'cache-test'};
 await readView('holders',options,{fetch:async()=>new Response(JSON.stringify(view),{headers:{etag:'one'}})});
 const cached=await cachedView('holders',options);assert.deepEqual(cached.data,view);
 let sent;const same=await readView('holders',options,{fetch:async(_url,init)=>{sent=init;return new Response(null,{status:304});}});assert.deepEqual(same,view);assert.equal(sent.headers['If-None-Match'],'one');
 await assert.rejects(readView('holders',options,{fetch:async()=>new Response('{}')}));
 await assert.rejects(readView('holders',options,{fetch:async()=>new Response(JSON.stringify({...view,ledger:null}))}));
 const older={...view,report:{...view.report,block:99}};assert.deepEqual(await readView('holders',options,{fetch:async()=>new Response(JSON.stringify(older))}),view);
 await cacheData('irrelevant',{no:'private labels here'});const location=globalThis.location;globalThis.location={hostname:'esimonchain.imstark.site'};try{assert(compactViewsEnabled({}));assert(!compactViewsEnabled({[address(1)]:{kind:'own',text:'private'}}));}finally{globalThis.location=location;}
});
