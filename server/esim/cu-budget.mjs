import {randomUUID} from 'node:crypto';
export const CU_ERRORS=['CU_BUDGET_DEFERRED','CU_METER_UNAVAILABLE','CU_UNKNOWN_METHOD','CU_INVALID_CONFIG'];
export function cuErrorCode(error){
 for(let e=error,i=0;e&&i<8;e=e.cause,i++){
  const code=CU_ERRORS.find(c=>new RegExp(`\\b${c}\\b`).test(e.message||''));
  if(code)return code;
 }
 return null;
}

// Alchemy billing CU (not throughput CU), checked 2026-11-06:
// https://www.alchemy.com/docs/reference/compute-unit-costs
export const CU_COSTS=Object.freeze({eth_chainId:0,net_version:0,eth_blockNumber:10,
 eth_getBlockByNumber:20,eth_getBlockByHash:20,eth_getBalance:20,eth_getCode:20,
 eth_getStorageAt:20,eth_getTransactionCount:20,eth_getTransactionByHash:20,
 eth_getTransactionReceipt:20,eth_getBlockReceipts:20,web3_sha3:20,eth_call:26,
 eth_getLogs:60,alchemy_getAssetTransfers:120,trace_filter:40,trace_transaction:40,
 debug_traceTransaction:40,getNFTsForOwner:480});

export function quoteCu(methods){
 const counts={};let units=0;
 for(const method of methods){
  if(!Object.hasOwn(CU_COSTS,method))throw Error('CU_UNKNOWN_METHOD');
  counts[method]=(counts[method]||0)+1;units+=CU_COSTS[method];
 }
 return {units,counts,calls:methods.length};
}

export function createCuMeter({mode='off',task='unassigned',query,limit=3000000,reserve=400000,timeoutMs=3000,
 warning=()=>{}}={}){
 if(!['off','observe','enforce'].includes(mode)||!Number.isSafeInteger(limit)||limit<1
  ||!Number.isSafeInteger(reserve)||reserve<0||reserve>limit||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>10000
  ||!/^[-a-z0-9_]{1,40}$/.test(task))throw Error('CU_INVALID_CONFIG');
 const stats={estimatedCu:0,unpersistedCu:0,attemptedCalls:0,attempts:0,byMethod:{}};
 let unavailableUntil=0;
 async function charge(methods){
  const quote=quoteCu(methods);
  let unpersisted=mode==='observe'&&Date.now()<unavailableUntil;
  if(mode!=='off'&&!unpersisted){
   let timer;
   try{
    if(typeof query!=='function')throw Error('CU_METER_UNAVAILABLE');
    const result=await Promise.race([
     query('SELECT * FROM esim_ledger.reserve_rpc_cu($1,$2,$3,$4,$5,$6,$7,$8)',
      [randomUUID(),task,quote.units,quote.calls,JSON.stringify(quote.counts),mode,limit,reserve]),
     new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('CU_METER_UNAVAILABLE')),timeoutMs);})
    ]);
    const row=(result.rows||result)[0];
    if(row?.admitted!==true){const e=Error('CU_BUDGET_DEFERRED');e.code=e.message;e.retryAt=Number(row?.retry_at_ms);throw e;}
   }catch(error){
    if(error.message==='CU_BUDGET_DEFERRED'||mode==='enforce')throw error.message==='CU_BUDGET_DEFERRED'?error:Error('CU_METER_UNAVAILABLE');
    unavailableUntil=Date.now()+60000;unpersisted=true;
    warning({phase:'cu-meter-unavailable',task});
   }finally{clearTimeout(timer);}
  }
  if(unpersisted)stats.unpersistedCu+=quote.units;
  stats.estimatedCu+=quote.units;stats.attemptedCalls+=quote.calls;stats.attempts++;
  for(const [method,count]of Object.entries(quote.counts))stats.byMethod[method]=(stats.byMethod[method]||0)+count;
  return quote;
 }
 function wrapFetch(request,{method}={}){
  return async(url,options)=>{
   const body=method?null:JSON.parse(options?.body);
   const methods=method?[method]:(Array.isArray(body)?body:[body]).map(c=>c.method);
   await charge(methods);
   return request(url,options);
  };
 }
 return {stats,charge,wrapFetch};
}
