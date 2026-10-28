import {createHash} from 'node:crypto';
import {realtimeSQL} from './realtime-store.mjs';
import {CONFIRMED_HOLDER_LABELS} from '../../src/holder-labels.mjs';
import {EXECUTION_LABELS} from './execution-categories.mjs';
export const sharedRpcKey=(method,params)=>createHash('sha256').update('56:'+JSON.stringify([method,params])).digest('hex');
export const fixedRead=(method,params)=>method!=='eth_blockNumber'&&!/"(?:latest|pending|safe|finalized)"/.test(JSON.stringify(params));
export function sharedCache(sql=realtimeSQL()) {return {
 async read(calls){if(!calls.length)return new Map();const rows=await sql.query("SELECT key,result FROM esim_ledger.rpc_cache WHERE key=ANY($1::text[]) AND created_at>=(SELECT valid_after FROM esim_ledger.rpc_cache_epoch WHERE id=1) AND (method NOT IN ('alchemy_getAssetTransfers','eth_getLogs') OR created_at>now()-interval '1 hour')",[calls.map(c=>sharedRpcKey(c.method,c.params))]);return new Map(rows.map(r=>[r.key,r.result]));},
 async write(calls){if(!calls.length)return;await sql.query(`INSERT INTO esim_ledger.rpc_cache(key,method,result) SELECT x.key,x.method,x.result FROM jsonb_to_recordset($1::jsonb) x(key text,method text,result jsonb) ON CONFLICT(key) DO UPDATE SET result=excluded.result,created_at=now()`,[JSON.stringify(calls.map(c=>({key:sharedRpcKey(c.method,c.params),method:c.method,result:c.result})))]);}
};}
export async function loadSharedRegistry(sql){
 if(!sql&&!process.env.ESIM_REALTIME_DATABASE_URL)return {loaded:false};
 const rows=await (sql||realtimeSQL()).query('SELECT address,label,kind,evidence,mm_included FROM esim_ledger.address_registry');
 for(const row of rows){const prior=CONFIRMED_HOLDER_LABELS[row.address];
  // Local mixed/exclusion rules are never promoted to whole-wallet ownership.
  if(prior&&['mixed','dex','activity','reserve'].includes(prior.kind))continue;
  CONFIRMED_HOLDER_LABELS[row.address]={...prior,label:row.label,kind:row.kind,source:row.evidence};
  if(['own','lp'].includes(row.kind))EXECUTION_LABELS[row.address]={...EXECUTION_LABELS[row.address],label:row.label,category:'own',source:row.evidence};
 }
 return {loaded:true,count:rows.length,mm:rows.filter(r=>r.mm_included).length};
}
