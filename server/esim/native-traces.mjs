import {SOURCE} from './metrics.mjs';
const hex=n=>'0x'+n.toString(16);
// Historical BNB trace scans can time out even with an address filter. Keep
// windows small, paginate every window, and bisect timeouts without skipping a
// block. No partial result escapes if one child range fails.
export async function collectNativeTraces({rpc},start,end){
 async function range(from,to){
  const filter={fromBlock:hex(from),toBlock:hex(to),fromAddress:[SOURCE],toAddress:[SOURCE],mode:'union',count:1000,after:0};
  const rows=[];
  try{
   for(let after=0;;){
    const page=await rpc('trace_filter',[{...filter,after}]);
    if(!Array.isArray(page))throw Error('TRACE_INCOMPLETE');
    rows.push(...page);if(page.length<1000)return rows;
    after+=page.length;if(after>=100000)throw Error('TRACE_PAGE_LIMIT');
   }
  }catch(error){
   if(error.message!=='RPC_QUERY_TIMEOUT'||from===to)throw error;
   const middle=Math.floor((from+to)/2);
   return [...await range(from,middle),...await range(middle+1,to)];
  }
 }
 const traces=[],ranges=[];
 for(let from=start;from<=end;from+=100)ranges.push([from,Math.min(from+99,end)]);
 // Four independent windows hide historical-query latency. makeRpc still
 // paces starts and enforces the shared request/deadline budget.
 for(let i=0;i<ranges.length;i+=4){
  const settled=await Promise.allSettled(ranges.slice(i,i+4).map(([from,to])=>range(from,to)));
  const failed=settled.find(r=>r.status==='rejected');if(failed)throw failed.reason;
  traces.push(...settled.flatMap(r=>r.value));
 }
 return traces;
}
