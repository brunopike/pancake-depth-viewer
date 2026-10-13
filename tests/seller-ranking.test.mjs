import test from 'node:test';
import assert from 'node:assert/strict';
import {SELLER_PAGE_SIZE, rankSellerRows, sellerPage, balanceBatches} from '../src/seller-ranking.mjs';

const row=(i,fields={})=>({address:`0x${i.toString(16).padStart(40,'0')}`,sold:'0',bought:'0',netSold:'0',sellCount:0,buyCount:0,trades:0,...fields});
test('ranking compares unrounded integer amounts, signed net sales and stable ties',()=>{
 const rows=[row(3,{sold:'900719925474099300000001',netSold:'-1'}),row(2,{sold:'900719925474099300000002',netSold:'0'}),row(1,{sold:'900719925474099300000001',netSold:'-2'})];
 assert.deepEqual(rankSellerRows(rows,'sold','desc').map(r=>r.address),[rows[1].address,rows[2].address,rows[0].address]);
 assert.deepEqual(rankSellerRows(rows,'netSold','asc').map(r=>r.netSold),['-2','-1','0']);
 assert.equal(rows[0].address,row(3).address);
});
test('buy and sell counts sort independently, and addresses support either direction',()=>{
 const rows=[row(1,{sellCount:2,buyCount:9}),row(2,{sellCount:3,buyCount:1})];
 assert.equal(rankSellerRows(rows,'sellCount','desc')[0].address,rows[1].address);
 assert.equal(rankSellerRows(rows,'buyCount','desc')[0].address,rows[0].address);
 assert.equal(rankSellerRows(rows,'address','desc')[0].address,rows[1].address);
});
test('missing balances remain last in either direction; confirmed zero is sortable',()=>{
 const rows=[row(1),row(2),row(3)],values=new Map([[rows[0].address,null],[rows[1].address,'0'],[rows[2].address,'5']]);
 const balance=r=>values.get(r.address);
 assert.deepEqual(rankSellerRows(rows,'usdt','asc',balance).map(r=>r.address),[rows[1].address,rows[2].address,rows[0].address]);
 assert.deepEqual(rankSellerRows(rows,'usdt','desc',balance).map(r=>r.address),[rows[2].address,rows[1].address,rows[0].address]);
});
test('sort applies to the complete filtered population before fixed 100-row pagination',()=>{
 const rows=Array.from({length:205},(_,i)=>row(i+1,{sold:String(i+1)}));
 const ranked=rankSellerRows(rows,'sold','desc');
 assert.equal(SELLER_PAGE_SIZE,100);
 assert.equal(sellerPage(ranked,0).rows.length,100);
 assert.equal(sellerPage(ranked,0).rows[0].sold,'205');
 assert.equal(sellerPage(ranked,1).rows[0].sold,'105');
 assert.deepEqual(sellerPage(ranked,9),{rows:ranked.slice(200),page:2,pages:3,pageSize:100,total:205});
 assert.deepEqual(sellerPage([],5),{rows:[],page:0,pages:0,pageSize:100,total:0});
});
test('a 100-row balance query keeps the existing maximum of 25 addresses per API call',()=>{
 const addresses=Array.from({length:100},(_,i)=>row(i).address),batches=balanceBatches(addresses);
 assert.equal(batches.length,4);assert(batches.every(b=>b.length===25));
 assert.deepEqual(batches.flat(),addresses);
});
