import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { makeRpc } from '../../server/esim/rpc.mjs';
import { refreshState } from '../../server/esim/collector.mjs';
import { buildReport } from '../../server/esim/metrics.mjs';
import { loadState,mergeCheckpointState,saveState,readState } from '../../server/esim/store.mjs';
import {checkpointPassComplete} from '../../server/esim/worker-health.mjs';
import {publishCore} from './realtime-worker.mjs';
import {prepareArchiveViews} from '../../server/esim/archive-views.mjs';
import {leaseFromEnvironment,requireLease} from '../../server/esim/worker-lease.mjs';
const work = '.goodway/esim-monitor';
const inlinePublish=process.env.ESIM_INLINE_CORE_PUBLISH==='true';
await mkdir(work, { recursive: true });
try {
  let stageStarted=Date.now();
  const stage=name=>{console.log(JSON.stringify({phase:'core-stage',stage:name,elapsedMs:Date.now()-stageStarted,rss:process.memoryUsage().rss}));stageStarted=Date.now();};
  if(inlinePublish){const lease=leaseFromEnvironment();if(!lease)throw Error('WORKER_LEASE_REQUIRED');await requireLease(lease);}
  let state,checkpointIdentity,stateFile=`${work}/state.json.gz`;
  const remote=process.env.ESIM_REMOTE_START==='true';
  try { state = await readState(stateFile,{deferClaimFlow:remote}); }
  catch { stateFile='server/esim/bootstrap.json.gz';state = await readState(stateFile,{deferClaimFlow:remote}); }
  if (process.env.ESIM_REMOTE_START === 'true') {
    state = mergeCheckpointState(state,await loadState({currentState:state,claimFlowCheckpointFile:stateFile,includeRemoteCore:process.env.ESIM_PERSISTENT_WORKER!=='true'||process.env.ESIM_REMOTE_BOOTSTRAP==='true'}));
  }
  stage('read-and-merge-state');
  const budget = Number(process.env.ESIM_RPC_BUDGET || 600), targetBlock = process.env.ESIM_TARGET_BLOCK ? Number(process.env.ESIM_TARGET_BLOCK) : undefined;
  if (!Number.isInteger(budget) || budget < 1 || budget > 2000) throw new Error('BAD_BUDGET');
  const transport = makeRpc({ endpoint: process.env.ESIM_RPC_URL, budget, timeoutMs: 1500000,
    cacheDir: `${work}/rpc-cache`, progress: e => { if (e.phase !== 'rpc' || e.physical % 10 === 0) console.log(JSON.stringify(e)); } });
  // Yield only after a verified checkpoint so independent tasks keep updating.
  const passStarted=Date.now();
  for (let i = 0; i < 160; i++) {
    const next = await refreshState(state, transport, { maxBlocks:24000,targetBlock, progress: e => console.log(JSON.stringify(e)) });
    stage('refresh-state');
    const advanced=next.block>state.block;
    state = next;
    checkpointIdentity=await saveState(state,work);
    stage('save-state');
    if(!inlinePublish)await writeFile(`${work}/latest.json`, JSON.stringify(buildReport(state)));
    console.log(JSON.stringify({ phase: 'checkpoint', block: state.block, cutoff: state.cutoff, calls: state.calls.length, trades: state.trades.length, ...transport.stats }));
    if (!advanced) break;
    if (targetBlock && state.block >= targetBlock) break;
    if (!targetBlock && Date.now() / 1000 - state.cutoff < 120) break;
    if(checkpointPassComplete(passStarted,Date.now(),process.env.ESIM_PERSISTENT_WORKER==='true'))break;
  }
  await writeFile(`${work}/usage.json`, JSON.stringify(transport.stats));
  if(inlinePublish){
    if(state.block<Number(process.env.ESIM_MIN_BLOCK||0))throw Error('SNAPSHOT_NOT_ADVANCED');
    const dryRun=process.env.ESIM_WORKER_DRY_RUN==='true';
    const prepare=!dryRun&&process.env.ESIM_PERSISTENT_WORKER==='true'?(state,report,addresses)=>prepareArchiveViews(state,report,addresses,{checkpointIdentity}):null;
    const result=await publishCore(state,dryRun?async()=>{}:undefined,prepare);
    await mkdir('.goodway/vm',{recursive:true});
    await writeFile('.goodway/vm/core.tmp',JSON.stringify(result));await rename('.goodway/vm/core.tmp','.goodway/vm/core.json');
    console.log(JSON.stringify({phase:`vm-core-${dryRun?'verified':'published'}`,dryRun,...result,rss:process.memoryUsage().rss}));
  }
} catch (error) {
  // Only internal symbolic errors; never print transport error details or URLs.
  const code = /^[A-Z_]+$/.test(error.message) ? error.message : 'QUERY_FAILED';
  console.error(`ESIM refresh stopped: ${code}. Last verified checkpoint preserved.`);
  process.exitCode = 1;
}
