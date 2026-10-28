// Short-lived high-memory work. The persistent supervisor never holds a full
// ledger while another child is parsing the same ledger.
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {parseState} from '../../server/esim/store.mjs';
import {publishCore} from './realtime-worker.mjs';
import {publishRealtime} from '../../server/esim/realtime-store.mjs';
import {leaseFromEnvironment,requireLease} from '../../server/esim/worker-lease.mjs';
const task=process.argv[2];
const dryRun=process.env.ESIM_WORKER_DRY_RUN==='true';
try{
 const lease=leaseFromEnvironment();if(!lease)throw Error('WORKER_LEASE_REQUIRED');await requireLease(lease);
 let result;
 if(task==='core'){
  const state=parseState(await readFile('.goodway/esim-monitor/state.json.gz'));
  if(state.block<Number(process.env.ESIM_MIN_BLOCK||0))throw Error('SNAPSHOT_NOT_ADVANCED');
  await publishCore(state,dryRun?async()=>{}:undefined);result={block:state.block,cutoff:state.cutoff};
 }else if(task==='holders'){
  const holders=JSON.parse(await readFile('.goodway/esim-holders/holders.json','utf8'));
  const core=JSON.parse(await readFile('.goodway/vm/core.json','utf8'));
  if(holders.block<core.block||holders.tradeCutoff<core.cutoff)throw Error('HOLDER_TRADES_BEHIND');
  if(!dryRun)await publishRealtime([{kind:'holders',data:holders}]);
  result={block:holders.block,cutoff:holders.cutoff,tradeCutoff:holders.tradeCutoff,balanceAudit:holders.balanceAudit};
 }else throw Error('INVALID_VM_TASK');
 await mkdir('.goodway/vm',{recursive:true});
 await writeFile(`.goodway/vm/${task}.tmp`,JSON.stringify(result));await rename(`.goodway/vm/${task}.tmp`,`.goodway/vm/${task}.json`);
 console.log(JSON.stringify({phase:`vm-${task}-${dryRun?'verified':'published'}`,dryRun,...result,rss:process.memoryUsage().rss}));
}catch(e){console.error(/^[A-Z_]+$/.test(e.message)?e.message:'VM_TASK_FAILED');process.exitCode=1;}
