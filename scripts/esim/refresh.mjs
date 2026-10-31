import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { makeRpc } from '../../server/esim/rpc.mjs';
import { refreshState } from '../../server/esim/collector.mjs';
import { buildReport } from '../../server/esim/metrics.mjs';
import { loadState,mergeCheckpointState,saveState } from '../../server/esim/store.mjs';
import {checkpointPassComplete} from '../../server/esim/worker-health.mjs';
const work = '.goodway/esim-monitor';
await mkdir(work, { recursive: true });
try {
  let state;
  try { state = JSON.parse(gunzipSync(await readFile(`${work}/state.json.gz`))); }
  catch { state = JSON.parse(gunzipSync(await readFile('server/esim/bootstrap.json.gz'))); }
  if (process.env.ESIM_REMOTE_START === 'true') {
    state = mergeCheckpointState(state,await loadState({currentState:state,includeRemoteCore:process.env.ESIM_PERSISTENT_WORKER!=='true'||process.env.ESIM_REMOTE_BOOTSTRAP==='true'}));
  }
  const budget = Number(process.env.ESIM_RPC_BUDGET || 600), targetBlock = process.env.ESIM_TARGET_BLOCK ? Number(process.env.ESIM_TARGET_BLOCK) : undefined;
  if (!Number.isInteger(budget) || budget < 1 || budget > 2000) throw new Error('BAD_BUDGET');
  const transport = makeRpc({ endpoint: process.env.ESIM_RPC_URL, budget, timeoutMs: 1500000,
    cacheDir: `${work}/rpc-cache`, progress: e => { if (e.phase !== 'rpc' || e.physical % 10 === 0) console.log(JSON.stringify(e)); } });
  // Yield only after a verified checkpoint so independent tasks keep updating.
  const passStarted=Date.now();
  for (let i = 0; i < 160; i++) {
    const next = await refreshState(state, transport, { maxBlocks:5000,targetBlock, progress: e => console.log(JSON.stringify(e)) });
    const advanced=next.block>state.block;
    state = next;
    await saveState(state,work);
    await writeFile(`${work}/latest.json`, JSON.stringify(buildReport(state)));
    console.log(JSON.stringify({ phase: 'checkpoint', block: state.block, cutoff: state.cutoff, calls: state.calls.length, trades: state.trades.length, ...transport.stats }));
    if (!advanced) break;
    if (targetBlock && state.block >= targetBlock) break;
    if (!targetBlock && Date.now() / 1000 - state.cutoff < 120) break;
    if(checkpointPassComplete(passStarted,Date.now(),process.env.ESIM_PERSISTENT_WORKER==='true'))break;
  }
  await writeFile(`${work}/usage.json`, JSON.stringify(transport.stats));
} catch (error) {
  // Only internal symbolic errors; never print transport error details or URLs.
  const code = /^[A-Z_]+$/.test(error.message) ? error.message : 'QUERY_FAILED';
  console.error(`ESIM refresh stopped: ${code}. Last verified checkpoint preserved.`);
  process.exitCode = 1;
}
