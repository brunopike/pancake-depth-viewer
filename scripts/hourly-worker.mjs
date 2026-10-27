import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

// Server-only. One bounded session keeps its own timer instead of relying on cron delivery.
export async function runHourlyWorker({ refresh, handoff, now = Date.now, sleep: wait = sleep,
  sessionMs = 330 * 60000, onError = () => {} }) {
  if (!Number.isFinite(sessionMs) || sessionMs <= 0 || sessionMs > 330 * 60000) throw new Error('Invalid worker duration');
  const end = now() + sessionMs;
  let next = now();
  while (now() < end) {
    if (now() >= next) {
      let due;
      try { due = await refresh(); } catch { onError(); }
      // Respect a fresh snapshot's remaining interval across worker handoffs.
      if (Number.isFinite(due) && due > now()) next = due;
      else do { next += 3600000; } while (next <= now());
    }
    const delay = Math.min(next, end) - now();
    if (delay > 0) await wait(delay);
  }
  await handoff();
}

export async function dispatchNextWorker({ repo, token, workflowId = 'depth-cache.yml', fetch: request = fetch }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo || '') || !token) throw new Error('Missing worker environment');
  if (!['depth-cache.yml','esim-report.yml','esim-claim-flow.yml'].includes(workflowId)) throw new Error('Invalid worker workflow');
  const root = `https://api.github.com/repos/${repo}`;
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' };
  const info = await request(root, { headers, signal: AbortSignal.timeout(20000) });
  const workflow = await request(`${root}/actions/workflows/${workflowId}`, { headers, signal: AbortSignal.timeout(20000) });
  if (!info.ok || !workflow.ok) throw new Error('Worker handoff metadata unavailable');
  if ((await info.json()).private !== false || (await workflow.json()).state !== 'active') return false;
  const response = await request(`${root}/actions/workflows/${workflowId}/dispatches`, { method: 'POST', headers,
    body: JSON.stringify({ ref: 'main', ...(workflowId==='esim-claim-flow.yml'?{}:{inputs:{session_minutes:workflowId==='esim-report.yml'?'300':'330'}}) }), signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Worker handoff failed (${response.status})`);
  return true;
}

async function main() {
  if (!process.env.ALCHEMY_API_KEY || !process.env.GITHUB_TOKEN) throw new Error('Missing private worker configuration');
  const minutes = Number(process.env.SESSION_MINUTES || 330);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 330) throw new Error('Invalid worker duration');
  const run = promisify(execFile);
  console.log(`Hourly worker started; session ${minutes} minutes.`);
  await runHourlyWorker({ sessionMs: minutes * 60000,
    refresh: async () => {
      for (const file of ['snapshot', 'publish-snapshot']) {
        const { stdout } = await run(process.execPath, [`scripts/${file}.mjs`], { timeout: 600000, maxBuffer: 262144 });
        process.stdout.write(stdout);
      }
      const { nextRefreshAt } = JSON.parse(await readFile('.goodway/snapshot-schedule.json', 'utf8'));
      console.log(`Next hourly read: ${new Date(nextRefreshAt).toISOString()}`);
      return nextRefreshAt;
    },
    onError: () => console.error('Hourly read failed; the previous valid snapshot is preserved. The next hourly read will retry.'),
    handoff: async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const restarted = await dispatchNextWorker({ repo: process.env.GITHUB_REPOSITORY, token: process.env.GITHUB_TOKEN });
          console.log(restarted ? 'Next worker dispatched.' : 'Worker stopped: workflow disabled or repository no longer public.');
          return;
        } catch { if (attempt === 2) throw new Error('Worker handoff failed; the scheduled recovery remains available.'); }
        await sleep(5000 * (attempt + 1));
      }
    } });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await main(); } catch { console.error('Background worker stopped. Check configuration or restart the workflow.'); process.exitCode = 1; }
}
