import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {gunzipSync,gzipSync} from 'node:zlib';
import {loadState,parseState,validClaimFlow} from '../../server/esim/store.mjs';
import {collectClaimFlow} from '../../server/esim/claim-flow-collector.mjs';
import {makeRpc} from '../../server/esim/rpc.mjs';
const work='.goodway/claim-flow',url='https://raw.githubusercontent.com/brunopike/pancake-depth-viewer/esim-cache/claim-flow-state.json.gz';
await mkdir(work,{recursive:true});
try{
 let state;try{state=parseState(await readFile('.goodway/esim-monitor/state.json.gz'));}catch{state=await loadState({includeRemote:!process.env.ESIM_FLOW_CHECKPOINT_FILE});}
 if(process.env.ESIM_REMOTE_START==='true'){const remote=await loadState();if(remote.block>state.block)state=remote;}
 let previous;try{previous=JSON.parse(gunzipSync(await readFile(process.env.ESIM_FLOW_CHECKPOINT_FILE||`${work}/state.json.gz`)));}catch{if(process.env.ESIM_FLOW_CHECKPOINT_FILE)throw Error('FLOW_CHECKPOINT_UNAVAILABLE');}
 if(!process.env.ESIM_FLOW_CHECKPOINT_FILE)try{const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(30000)});if(response.ok){const remote=JSON.parse(gunzipSync(Buffer.from(await response.arrayBuffer())));if(!previous||remote.throughBlock>previous.throughBlock)previous=remote;}}catch{}
 if(previous?.throughBlock>state.block)throw Error('FLOW_CORE_BEHIND');
 const budget=Number(process.env.ESIM_RPC_BUDGET||600);if(!Number.isInteger(budget)||budget<1||budget>2000)throw Error('BAD_BUDGET');
 const timeoutMs=Number(process.env.ESIM_FLOW_TIMEOUT_MS||1500000);if(!Number.isInteger(timeoutMs)||timeoutMs<60000||timeoutMs>5400000)throw Error('BAD_TIMEOUT');
 const transport=makeRpc({budget,timeoutMs,cacheDir:`${work}/rpc-cache`,progress:e=>{if(e.phase!=='rpc'||e.physical%10===0)console.log(JSON.stringify(e));}});
 const next=await collectClaimFlow(state,transport,{previous,progress:e=>console.log(JSON.stringify(e))});
 if(!validClaimFlow(state,next.report))throw Error('FLOW_REPORT_INVALID');
 await writeFile(`${work}/state.tmp`,gzipSync(JSON.stringify(next)));await rename(`${work}/state.tmp`,`${work}/state.json.gz`);
 await writeFile(`${work}/report.tmp`,JSON.stringify(next.report));await rename(`${work}/report.tmp`,`${work}/report.json`);
 await writeFile(`${work}/usage.json`,JSON.stringify(transport.stats));
 console.log(JSON.stringify({phase:'claim-flow-verified',block:next.throughBlock,cutoff:next.cutoff,transfers:next.transfers.length,addresses:next.report.addressCount,receipts:next.report.receiptCount,sales:next.report.sales.length,totals:next.report.totals,...transport.stats}));
}catch(error){const code=/^[A-Z_]+$/.test(error.message)?error.message:'QUERY_FAILED';console.error(`ESIM claim flow stopped: ${code}. Last verified data preserved.`);process.exitCode=1;}
