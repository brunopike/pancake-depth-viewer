import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { createPublicClient, http } from 'viem';
import { bsc } from 'viem/chains';
import { client as publicClient, loadPools } from '../src/chain.mjs';
import { latestSharedURL, parseSnapshot, serializeSnapshot } from '../src/snapshot.mjs';
import { configuredMarkets, marketPools, snapshotName } from '../src/background-markets.mjs';
import { discoverOwnedInfinity } from './alchemy-ownership.mjs';

// Server-only: an explicit allowlist limits every paid chain read to selected pairs.
const key = process.env.ALCHEMY_API_KEY;
await mkdir('.goodway', { recursive: true });
await writeFile('.goodway/snapshot-manifest.json', '[]');
let nextRefreshAt = Date.now() + 3600000;
try {
  let config = JSON.parse(await readFile('public/data/background-markets.json', 'utf8'));
  if (process.env.GITHUB_REPOSITORY) {
    // Running sessions read the current selection before every hourly pass.
    const response = await fetch(`https://raw.githubusercontent.com/${process.env.GITHUB_REPOSITORY}/main/public/data/background-markets.json`, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error('Configuration unavailable');
    config = await response.json();
  }
  const markets = configuredMarkets(config);
  console.log(`Background selection: ${markets.length} pair(s): ${markets.map(m => m.name).join(', ') || 'none'}`);
  if (!markets.length || !key && process.env.ALLOW_PUBLIC_SNAPSHOT !== '1') {
    console.log('No selected markets or private RPC configuration; no chain reads.');
  } else {
    const catalog = JSON.parse(await readFile('public/data/catalog.json', 'utf8'));
    // Validate every selected pair before making an RPC request; never fall back to all pools.
    const selected = markets.map(market => ({ ...market, metas: marketPools(catalog, market) }));
    const rpc = key ? createPublicClient({ chain: bsc, transport: http(`https://bnb-mainnet.g.alchemy.com/v2/${key}`, { timeout: 20000, retryCount: 1 }) }) : publicClient;
    let ownershipSeed, ownershipDiscovery;
    const manifest = [];
    for (const { name, base, quote, metas } of selected) {
      const filename = snapshotName(base, quote), file = `public/data/${filename}`;
      let previous;
      try {
        const signal = AbortSignal.timeout(12000);
        const response = await fetch(await latestSharedURL(signal, filename), { cache: 'no-store', signal });
        if (response.ok) previous = parseSnapshot(await response.text(), metas, base, quote);
      } catch { /* Missing/invalid public cache needs a fresh selected-pair scan. */ }
      if (!previous) try { previous = parseSnapshot(await readFile(file, 'utf8'), metas, base, quote); } catch {}
      // Worker handoffs and recovery schedules must not buy duplicate hourly reads.
      if (previous && Date.now() - previous.timestamp < 3600000) {
        nextRefreshAt = Math.min(nextRefreshAt, previous.timestamp + 3600000);
        console.log(`${name}: snapshot less than 60 minutes old; no paid reads.`); continue;
      }
      const started = Date.now();
      if (!ownershipSeed) {
        if (await rpc.getChainId() !== 56) throw new Error('Wrong network');
        ownershipSeed = JSON.parse(await readFile('public/data/lp-owners.json', 'utf8'), (key, value) => key === 'blockNumber' ? BigInt(value) : value);
      }
      const live = await loadPools(metas, base, Infinity, (done, total) => console.log(`${name}: ${done}/${total}`), {
        client: rpc, previous, ownershipSeed,
        discoverOwnership: key ? () => ownershipDiscovery ||= discoverOwnedInfinity(key) : undefined });
      const supported = metas.filter(p => ['v2', 'v3', 'infinityCl'].includes(p.protocol));
      if (!live.pools.length || supported.some(meta => !live.pools.some(p => p.protocol === meta.protocol && p.id.toLowerCase() === meta.id.toLowerCase()))) throw new Error('Incomplete supported-pool snapshot');
      if (live.pools.some(p => p.ownership?.status !== 'verified')) throw new Error('Incomplete LP attribution');
      const text = serializeSnapshot(live, base, quote, key ? 'Alchemy' : '公共节点');
      parseSnapshot(text, metas, base, quote);
      await mkdir('public/data', { recursive: true });
      await writeFile(`${file}.tmp`, text); await rename(`${file}.tmp`, file);
      manifest.push({ filename, base, quote });
      nextRefreshAt = Math.min(nextRefreshAt, started + 3600000);
      console.log(JSON.stringify({ pair: name, source: key ? 'Alchemy' : '公共节点', block: String(live.blockNumber), pools: live.pools.length,
        incrementalPools: live.pools.filter(p => p.incremental).length, elapsedMs: Date.now() - started }));
    }
    await writeFile('.goodway/snapshot-manifest.json', JSON.stringify(manifest));
  }
  await writeFile('.goodway/snapshot-schedule.json', JSON.stringify({ nextRefreshAt }));
} catch {
  // RPC exceptions may contain the private endpoint. Never log them or publish them.
  console.error('后台配置或快照未通过校验；未发布本轮数据，保留上次有效快照。');
  process.exitCode = 1;
}
