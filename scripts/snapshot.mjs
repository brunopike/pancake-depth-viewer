import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { createPublicClient, http } from 'viem';
import { bsc } from 'viem/chains';
import { client as publicClient, loadPools } from '../src/chain.mjs';
import { DEFAULT_BASE, DEFAULT_QUOTE, SHARED_URL, parseSnapshot, serializeSnapshot } from '../src/snapshot.mjs';

// This script runs on the server only. The build never reads this environment variable.
const key = process.env.ALCHEMY_API_KEY;
if (!key && process.env.ALLOW_PUBLIC_SNAPSHOT !== '1') {
  console.log('未配置 ALCHEMY_API_KEY，保留已有公开快照。');
  process.exit(0);
}
const rpc = key ? createPublicClient({ chain: bsc, transport: http(`https://bnb-mainnet.g.alchemy.com/v2/${key}`, { timeout: 20000, retryCount: 1 }) }) : publicClient;
const file = process.env.SNAPSHOT_OUTPUT || 'public/data/esim-usdt.json';
const catalog = JSON.parse(await readFile('public/data/catalog.json', 'utf8'));
const metas = catalog.pools.filter(p => [p.token0.id.toLowerCase(), p.token1.id.toLowerCase()].sort().join('/') === [DEFAULT_BASE, DEFAULT_QUOTE].sort().join('/'));
let previous;
try {
  const response = await fetch(SHARED_URL, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
  if (response.ok) previous = parseSnapshot(await response.text(), metas, DEFAULT_BASE, DEFAULT_QUOTE);
} catch { /* A missing or invalid cache triggers a full chain scan. */ }
if (!previous) try { previous = parseSnapshot(await readFile(file, 'utf8'), metas, DEFAULT_BASE, DEFAULT_QUOTE); } catch {}
const started = Date.now();
try {
  if (await rpc.getChainId() !== 56) throw new Error('Wrong network');
  const live = await loadPools(metas, DEFAULT_BASE, Infinity, (done, total) => console.log(`读取 ${done}/${total}`), { client: rpc, previous });
  const supported = metas.filter(p => ['v2', 'v3', 'infinityCl'].includes(p.protocol));
  if (live.pools.length !== supported.length || !live.pools.length) throw new Error('Incomplete supported-pool snapshot');
  const text = serializeSnapshot(live, DEFAULT_BASE, DEFAULT_QUOTE, key ? 'Alchemy' : '公共节点');
  parseSnapshot(text, metas, DEFAULT_BASE, DEFAULT_QUOTE);
  await mkdir(file.slice(0, file.lastIndexOf('/')), { recursive: true });
  await writeFile(`${file}.tmp`, text); await rename(`${file}.tmp`, file);
  console.log(JSON.stringify({ source: key ? 'Alchemy' : '公共节点', block: String(live.blockNumber), pools: live.pools.length,
    incrementalPools: live.pools.filter(p => p.incremental).length, elapsedMs: Date.now() - started }));
} catch {
  // RPC exceptions may contain the private endpoint. Never log them or publish them.
  console.error('后台快照未通过完整性校验，保留上次数据。请检查节点配置、额度或服务状态。');
  process.exitCode = 1;
}
