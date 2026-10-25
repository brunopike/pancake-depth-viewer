import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { collectHolders,loadHolders } from '../../server/esim/holders.mjs';
import { loadState,parseState } from '../../server/esim/store.mjs';
import { makeRpc } from '../../server/esim/rpc.mjs';
try{
 let state=await loadState();
 // The same worker has just verified this checkpoint; do not wait for the raw-file CDN to catch up.
 try{const local=parseState(await readFile('.goodway/esim-monitor/state.json.gz'));if(local.block>state.block)state=local;}catch{}
 let previous;try{previous=await loadHolders();}catch{}
 try{const local=JSON.parse(await readFile('.goodway/esim-holders/holders.json','utf8'));if(!previous||local.block>previous.block)previous=local;}catch{}
 const transport=makeRpc({budget:500,timeoutMs:900000,progress:e=>{if(e.phase!=='rpc'||e.physical%25===0)console.log(JSON.stringify(e));}});
 const result=await collectHolders(state,transport,{previous,progress:e=>console.log(JSON.stringify(e))});
 await mkdir('.goodway/esim-holders',{recursive:true});await writeFile('.goodway/esim-holders/holders.json',JSON.stringify(result));
 console.log(JSON.stringify({block:result.block,addresses:result.rows.length,priorBlock:result.priorBlock,coverage:result.coverage.balance,...transport.stats}));
}catch(e){console.error(/^[A-Z_]+$/.test(e.message)?e.message:'HOLDER_REFRESH_FAILED');process.exitCode=1;}
