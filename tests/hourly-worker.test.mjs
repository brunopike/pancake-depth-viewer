import test from 'node:test';
import assert from 'node:assert/strict';
import { runHourlyWorker, dispatchNextWorker } from '../scripts/hourly-worker.mjs';

test('An active worker refreshes hourly before handing off within the runner limit', async () => {
  let clock = 0, handoffAt;
  const refreshed = [];
  await runHourlyWorker({ now: () => clock, sleep: async ms => { clock += ms; },
    refresh: async () => { refreshed.push(clock); clock += 5000; }, handoff: async () => { handoffAt = clock; } });
  assert.deepEqual(refreshed, [0, 3600000, 7200000, 10800000, 14400000, 18000000]);
  assert.equal(handoffAt, 19800000);
});

test('Failed reads preserve the cadence and can recover at the next hour', async () => {
  let clock = 0, failures = 0;
  const published = [];
  await runHourlyWorker({ sessionMs: 7200001, now: () => clock, sleep: async ms => { clock += ms; },
    refresh: async () => { if (clock === 0) throw new Error('private RPC detail'); published.push(clock); },
    onError: () => { failures++; }, handoff: async () => {} });
  assert.equal(failures, 1);
  assert.deepEqual(published, [3600000, 7200000]);
});

test('Slow reads never overlap or create catch-up request storms', async () => {
  let clock = 0;
  const refreshed = [];
  await runHourlyWorker({ sessionMs: 14400000, now: () => clock, sleep: async ms => { clock += ms; },
    refresh: async () => { refreshed.push(clock); clock += 4000000; }, handoff: async () => {} });
  assert.deepEqual(refreshed, [0, 7200000]);
});

test('Invalid worker duration cannot create an unbounded background loop', async () => {
  for (const sessionMs of [0, -1, Infinity, 21600000]) {
    await assert.rejects(() => runHourlyWorker({ sessionMs, refresh: async () => {}, handoff: async () => {} }), /duration/i);
  }
});

function handoffAPI(metadata = { private: false }, state = 'active', dispatchStatus = 204) {
  const requests = [];
  const fetch = async (url, options) => {
    requests.push({ url, method: options.method || 'GET', body: options.body && JSON.parse(options.body) });
    const dispatch = url.endsWith('/dispatches');
    return { ok: !dispatch || dispatchStatus === 204, status: dispatch ? dispatchStatus : 200,
      json: async () => url.includes('/actions/workflows/') ? { state } : metadata };
  };
  return { requests, fetch };
}

test('Session handoff uses the bounded default session and the same repository workflow', async () => {
  const api = handoffAPI();
  assert.equal(await dispatchNextWorker({ repo: 'owner/viewer', token: 'test-only', fetch: api.fetch }), true);
  assert.equal(api.requests.at(-1).url, 'https://api.github.com/repos/owner/viewer/actions/workflows/depth-cache.yml/dispatches');
  assert.deepEqual(api.requests.at(-1).body, { ref: 'main', inputs: { session_minutes: '330' } });
});

test('Disabled workflows and nonpublic or unverified visibility stop background handoff', async () => {
  for (const [metadata, state] of [[{ private: true }, 'active'], [{ private: false }, 'disabled_manually'], [{}, 'active']]) {
    const api = handoffAPI(metadata, state);
    assert.equal(await dispatchNextWorker({ repo: 'owner/viewer', token: 'test-only', fetch: api.fetch }), false);
    assert.equal(api.requests.some(r => r.method === 'POST'), false);
  }
});

test('Handoff API failures report status without leaking credentials or response bodies', async () => {
  const api = handoffAPI({ private: false }, 'active', 403);
  await assert.rejects(() => dispatchNextWorker({ repo: 'owner/viewer', token: 'test-only', fetch: api.fetch }), /^Error: Worker handoff failed \(403\)$/);
});

test('A worker handoff waits the remaining interval instead of buying a duplicate snapshot', async () => {
  let clock = 330 * 60000;
  const refreshed = [];
  await runHourlyWorker({ sessionMs: 61 * 60000, now: () => clock, sleep: async ms => { clock += ms; },
    refresh: async () => { refreshed.push(clock); return 360 * 60000; }, handoff: async () => {} });
  assert.deepEqual(refreshed, [330 * 60000, 360 * 60000]);
});
test('The ESIM worker hands off to its own bounded session without changing the depth worker',async()=>{
 const api=handoffAPI();
 assert.equal(await dispatchNextWorker({repo:'owner/viewer',token:'test-only',workflowId:'esim-report.yml',fetch:api.fetch}),true);
 assert.match(api.requests.at(-1).url,/esim-report.yml\/dispatches$/);
 assert.deepEqual(api.requests.at(-1).body,{ref:'main',inputs:{session_minutes:'300'}});
 await assert.rejects(dispatchNextWorker({repo:'owner/viewer',token:'test-only',workflowId:'unrelated.yml',fetch:api.fetch}),/Invalid worker workflow/);
});
