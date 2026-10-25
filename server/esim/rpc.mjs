import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { gzipSync, gunzipSync } from 'node:zlib';
import {setTimeout as sleep} from 'node:timers/promises';

export function makeRpc({ key = process.env.ALCHEMY_API_KEY, endpoint, budget = 500, timeoutMs = 230000,
  cacheDir, fetch: request = fetch, progress = () => {}, sleep:wait=sleep, minIntervalMs=250 } = {}) {
  if (!key && !endpoint) throw new Error('ALCHEMY_NOT_CONFIGURED');
  const url = endpoint || `https://bnb-mainnet.g.alchemy.com/v2/${key}`;
  const deadline = Date.now() + timeoutMs;
  const stats = { physical: 0, logical: 0, cacheHits: 0 };
  let exhausted=false;
  let nextRequestAt=0;
  const cacheKey = (method, params) => createHash('sha256').update(JSON.stringify([method, params])).digest('hex');
  async function batch(calls, { fresh = false } = {}) {
    const results = [], missing = [];
    for (const [i, [method, params]] of calls.entries()) {
      // Only cache immutable fixed-block reads; latest/head is always fresh.
      const cacheable = cacheDir && !fresh && !JSON.stringify(params).includes('latest');
      const file = cacheable ? `${cacheDir}/${cacheKey(method, params)}.json.gz` : null;
      if (file) try { results[i] = JSON.parse(gunzipSync(await readFile(file))); stats.cacheHits++; continue; } catch {}
      missing.push({ i, method, params, file });
    }
    const batchSize = calls.some(([method]) => method.startsWith('trace_')) ? 1 : calls.some(([method]) => method === 'eth_getLogs') ? 6 : 40;
    const chunks = [];
    for (let start = 0; start < missing.length; start += batchSize) chunks.push(missing.slice(start, start + batchSize));
    async function send(chunk, attempt=0) {
      if(exhausted)throw new Error('RPC_CAPACITY_EXCEEDED');
      if (Date.now() >= deadline || stats.physical >= budget) throw new Error('QUERY_LIMIT');
      // Reserve starts synchronously so concurrent chunks do not create CU bursts.
      const delay=Math.max(0,nextRequestAt-Date.now());nextRequestAt=Math.max(nextRequestAt,Date.now())+minIntervalMs;
      if(Date.now()+delay>=deadline)throw new Error('QUERY_LIMIT');
      if(delay)await wait(delay);
      if(exhausted)throw new Error('RPC_CAPACITY_EXCEEDED');
      if(Date.now()>=deadline||stats.physical>=budget)throw new Error('QUERY_LIMIT');
      stats.physical++; stats.logical += chunk.length;
      let response, envelopes;
      try {
        response = await request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chunk.map((c, id) => ({ jsonrpc: '2.0', id, method: c.method, params: c.params }))),
          signal: AbortSignal.timeout(Math.min(55000, deadline - Date.now())) });
        envelopes = await response.json();
      } catch (e) {
        progress({ phase: 'transport-failed', methods: [...new Set(chunk.map(c => c.method))], status: response?.status,
          reason: e.name === 'TimeoutError' ? 'timeout' : 'request-failed' });
        throw new Error('RPC_UNAVAILABLE');
      }
      const errors=(Array.isArray(envelopes)?envelopes:[envelopes]).flatMap(e=>e?.error?[e.error]:[]);
      // Inspect provider text only for classification. Never log/return it or the private URL.
      if(errors.some(e=>/monthly.*(?:capacity|limit)|(?:capacity|limit).*monthly/i.test(String(e.message)))){
        exhausted=true;throw new Error('RPC_CAPACITY_EXCEEDED');
      }
      const limited=response.status===429||errors.some(e=>Number(e.code)===429);
      if(limited||response.status>=500){
        if(attempt>=2)throw new Error(limited?'RPC_RATE_LIMITED':'RPC_UNAVAILABLE');
        const retryAfter=Number(response.headers?.get('retry-after'));
        const delay=Math.min(5000,Math.max(1000*2**attempt,Number.isFinite(retryAfter)?retryAfter*1000:0));
        if(Date.now()+delay>=deadline)throw new Error('QUERY_LIMIT');
        progress({phase:'rpc-retry',status:response.status,attempt:attempt+1});
        await wait(delay);return send(chunk,attempt+1);
      }
      if(!response.ok)throw new Error('RPC_UNAVAILABLE');
      if (!Array.isArray(envelopes) || envelopes.length !== chunk.length) throw new Error('RPC_INCOMPLETE');
      const byId = new Map(envelopes.map(e => [e.id, e]));
      for (const [i, c] of chunk.entries()) {
        const e = byId.get(i);
        if (!e || !Object.hasOwn(e, 'result') || e.error) throw new Error('RPC_MEMBER_FAILED');
        results[c.i] = e.result;
        if (c.file && e.result !== null) { await mkdir(cacheDir, { recursive: true }); await writeFile(c.file, gzipSync(JSON.stringify(e.result))); }
      }
      progress({ phase: 'rpc', ...stats });
    }
    const concurrency = batchSize === 1 ? 1 : batchSize === 6 ? 2 : 3;
    for (let i = 0; i < chunks.length; i += concurrency) {
      const settled = await Promise.allSettled(chunks.slice(i, i + concurrency).map(send));
      const failed = settled.find(r => r.status === 'rejected');
      if (failed) throw failed.reason;
    }
    return results;
  }
  const rpc = async (method, params, options) => (await batch([[method, params]], options))[0];
  return { rpc, batch, stats };
}
