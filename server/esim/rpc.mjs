import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { gzipSync, gunzipSync } from 'node:zlib';

export function makeRpc({ key = process.env.ALCHEMY_API_KEY, endpoint, budget = 500, timeoutMs = 230000,
  cacheDir, fetch: request = fetch, progress = () => {} } = {}) {
  if (!key && !endpoint) throw new Error('ALCHEMY_NOT_CONFIGURED');
  const url = endpoint || `https://bnb-mainnet.g.alchemy.com/v2/${key}`;
  const deadline = Date.now() + timeoutMs;
  const stats = { physical: 0, logical: 0, cacheHits: 0 };
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
    const batchSize = calls.some(([method]) => method === 'eth_getLogs' || method.startsWith('trace_')) ? 6 : 40;
    const chunks = [];
    for (let start = 0; start < missing.length; start += batchSize) chunks.push(missing.slice(start, start + batchSize));
    async function send(chunk) {
      if (Date.now() >= deadline || stats.physical >= budget) throw new Error('QUERY_LIMIT');
      stats.physical++; stats.logical += chunk.length;
      let response, envelopes;
      try {
        response = await request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chunk.map((c, id) => ({ jsonrpc: '2.0', id, method: c.method, params: c.params }))),
          signal: AbortSignal.timeout(Math.min(55000, deadline - Date.now())) });
        if (!response.ok) throw new Error(`RPC_HTTP_${response.status}`);
        envelopes = await response.json();
      } catch (e) {
        progress({ phase: 'transport-failed', methods: [...new Set(chunk.map(c => c.method))], status: response?.status,
          reason: e.name === 'TimeoutError' ? 'timeout' : e.cause?.code || 'request-failed' });
        throw new Error('RPC_UNAVAILABLE');
      }
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
    const concurrency = batchSize === 6 ? 2 : 3;
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
