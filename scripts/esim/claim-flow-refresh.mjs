import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {loadState,readState,validClaimFlow} from '../../server/esim/store.mjs';
import {collectClaimFlow} from '../../server/esim/claim-flow-collector.mjs';
import {makeRpc} from '../../server/esim/rpc.mjs';
import {readCheckpoint} from '../../server/esim/state-reader.mjs';
import {writeCheckpoint} from '../../server/esim/state-writer.mjs';
import {flowTarget} from '../../server/esim/flow-target.mjs';
import {Readable} from 'node:stream';
const work='.goodway/claim-flow',url='https://raw.githubusercontent.com/brunopike/pancake-depth-viewer/esim-cache/claim-flow-state.json.gz';
await mkdir(work,{recursive:true});
try{
 let state;
 if(process.env.ESIM_CHECKPOINT_FILE)state=await readState(process.env.ESIM_CHECKPOINT_FILE);
 else try{state=await readState('.goodway/esim-monitor/state.json.gz');}catch{state=await loadState();}
 if(process.env.ESIM_REMOTE_START==='true'){const remote=await loadState();if(remote.block>state.block)state=remote;}
 let previous;
 try{previous=await readCheckpoint(`${work}/state.json.gz`);}
 catch(error){if(error.code!=='ENOENT')throw Error('FLOW_CHECKPOINT_UNAVAILABLE');}
 if(!previous&&process.env.ESIM_FLOW_CHECKPOINT_FILE)try{previous=await readCheckpoint(process.env.ESIM_FLOW_CHECKPOINT_FILE);}catch{throw Error('FLOW_CHECKPOINT_UNAVAILABLE');}
 if(!previous&&!process.env.ESIM_FLOW_CHECKPOINT_FILE)try{
  const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(120000)});
  if(response.ok)previous=await readCheckpoint(Readable.fromWeb(response.body),{loadPart:async path=>{
   const r=await fetch(new URL(path,url),{signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error('CHECKPOINT_PARTS_UNAVAILABLE');return Buffer.from(await r.arrayBuffer());
  }});
 }catch{}
 if(previous?.throughBlock>state.block)throw Error('FLOW_CORE_BEHIND');
 const budget=Number(process.env.ESIM_RPC_BUDGET||600);if(!Number.isInteger(budget)||budget<1||budget>2000)throw Error('BAD_BUDGET');
 const timeoutMs=Number(process.env.ESIM_FLOW_TIMEOUT_MS||1500000);if(!Number.isInteger(timeoutMs)||timeoutMs<60000||timeoutMs>5400000)throw Error('BAD_TIMEOUT');
 const transport=makeRpc({budget,timeoutMs,cacheDir:`${work}/rpc-cache`,progress:e=>{if(e.phase!=='rpc'||e.physical%10===0)console.log(JSON.stringify(e));}});
 const target=await flowTarget(state,previous,transport);
 const next=await collectClaimFlow(target,transport,{previous,progress:e=>console.log(JSON.stringify(e))});
 if(!validClaimFlow(state,next.report))throw Error('FLOW_REPORT_INVALID');
 await writeCheckpoint(next,work);
 await writeFile(`${work}/report.tmp`,JSON.stringify(next.report));await rename(`${work}/report.tmp`,`${work}/report.json`);
 await writeFile(`${work}/usage.json`,JSON.stringify(transport.stats));
 await writeFile(`${work}/progress.json`,JSON.stringify({throughBlock:next.throughBlock,targetBlock:state.block,cutoff:next.cutoff}));
 console.log(JSON.stringify({phase:'claim-flow-verified',block:next.throughBlock,cutoff:next.cutoff,transfers:next.transfers.length,addresses:next.report.addressCount,receipts:next.report.receiptCount,sales:next.report.sales.length,totals:next.report.totals,...transport.stats}));
}catch(error){const code=/^[A-Z_]+$/.test(error.message)?error.message:'QUERY_FAILED';console.error(`ESIM claim flow stopped: ${code}. Last verified data preserved.`);process.exitCode=1;}
