import {matchesTagFilters} from './holder-model.mjs';
import {matchesSellerGroup} from './seller-summary.mjs';

export const SELLER_PAGE_SIZE=100;
export const SELLER_SORT_KEYS=['address','sold','bought','netSold','sellCount','buyCount','trades','esim','usdt','bnb'];
const balanceKeys=new Set(['esim','usdt','bnb']);
export function filterSellerRows(rows,{search='',filter='all',tags=[]}={},getProfile=row=>row,manual={}){
 const q=search.trim().toLowerCase();
 return rows.filter(row=>{
  const profile=getProfile(row);
  return (!q||row.address.includes(q))&&matchesSellerGroup(profile,filter)&&matchesTagFilters(profile.tags||[],tags,manual[row.address]);
 });
}
export function rankSellerRows(rows,key='sold',direction='desc',balance=()=>null){
 if(!SELLER_SORT_KEYS.includes(key))key='sold';
 const sign=direction==='asc'?1:-1;
 return rows.map(row=>({row,value:key==='address'?row.address:balanceKeys.has(key)?balance(row,key):row[key]})).sort((a,b)=>{
  if(a.value==null||b.value==null)return a.value==null&&b.value==null?a.row.address.localeCompare(b.row.address):a.value==null?1:-1;
  const x=key==='address'?a.value:BigInt(a.value),y=key==='address'?b.value:BigInt(b.value);
  return x===y?a.row.address.localeCompare(b.row.address):(x<y?-1:1)*sign;
 }).map(item=>item.row);
}
export function sellerPage(rows,requested=0){
 const pages=Math.ceil(rows.length/SELLER_PAGE_SIZE),page=Math.max(0,Math.min(requested,Math.max(0,pages-1)));
 return {rows:rows.slice(page*SELLER_PAGE_SIZE,(page+1)*SELLER_PAGE_SIZE),page,pages,pageSize:SELLER_PAGE_SIZE,total:rows.length};
}
export function balanceBatches(addresses){
 return Array.from({length:Math.ceil(addresses.length/25)},(_,i)=>addresses.slice(i*25,(i+1)*25));
}
