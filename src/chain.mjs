import { createPublicClient, http, fallback, parseAbi, parseAbiItem } from 'viem';
import { bsc } from 'viem/chains';
import { priceOf, tickRange } from './math.mjs';
import { mergeTicks, cacheMatchesPool } from './liquidity-cache.mjs';
import { loadOwnership } from './lp-chain.mjs';
import { poolMetadata } from './ownership.mjs';

export const RPCS = ['https://bsc-mainnet.public.blastapi.io', 'https://bsc-rpc.publicnode.com', 'https://bsc-dataseed.bnbchain.org', 'https://bsc-dataseed1.binance.org'];
export const client = createPublicClient({ chain: bsc, transport: fallback(RPCS.map(u => http(u, { timeout: 16000, retryCount: 1 }))),
  batch: { multicall: true } });
const CL_MANAGER = '0xa0FfB9c1CE1Fe56963B0321B32E7A0302114058b';
const v2abi = parseAbi(['function getReserves() view returns (uint112,uint112,uint32)', 'function token0() view returns (address)', 'function token1() view returns (address)']);
const v3abi = parseAbi([
  'function slot0() view returns (uint160,int24,uint16,uint16,uint16,uint32,bool)',
  'function liquidity() view returns (uint128)', 'function tickSpacing() view returns (int24)',
  'function token0() view returns (address)', 'function token1() view returns (address)',
  'function tickBitmap(int16) view returns (uint256)',
  'function ticks(int24) view returns (uint128,int128,uint256,uint256,int56,uint160,uint32,bool)'
]);
const clabi = parseAbi([
  'function getSlot0(bytes32) view returns (uint160,int24,uint24,uint24)',
  'function getLiquidity(bytes32) view returns (uint128)',
  'function poolIdToPoolKey(bytes32) view returns (address,address,address,address,uint24,bytes32)',
  'function getPoolBitmapInfo(bytes32,int16) view returns (uint256)',
  'function getPoolTickInfo(bytes32,int24) view returns ((uint128 liquidityGross,int128 liquidityNet,uint256 feeGrowthOutside0X128,uint256 feeGrowthOutside1X128))'
]);
const call = (address, abi, functionName, args = []) => ({ address, abi, functionName, args });
const mint = parseAbiItem('event Mint(address sender, address indexed owner, int24 indexed tickLower, int24 indexed tickUpper, uint128 amount, uint256 amount0, uint256 amount1)');
const burn = parseAbiItem('event Burn(address indexed owner, int24 indexed tickLower, int24 indexed tickUpper, uint128 amount, uint256 amount0, uint256 amount1)');
const modify = parseAbiItem('event ModifyLiquidity(bytes32 indexed id, address indexed sender, int24 tickLower, int24 tickUpper, int256 liquidityDelta, bytes32 salt)');
async function batch(contracts, blockNumber, chunkSize = 80, rpc = client) {
  const out = [];
  for (let i = 0; i < contracts.length; i += chunkSize * 3) {
    const chunks = [];
    for (let j = i; j < Math.min(i + chunkSize * 3, contracts.length); j += chunkSize) chunks.push(contracts.slice(j, j + chunkSize));
    const results = await Promise.all(chunks.map(chunk => rpc.multicall({ contracts: chunk, blockNumber, batchSize: 0, allowFailure: true })));
    for (let n = 0; n < results.length; n++) for (let j = 0; j < results[n].length; j++) {
      const r = results[n][j];
      if (r.status === 'success') { out.push(r.result); continue; }
      // Public RPCs can return per-call multicall failures under a large read load.
      // Retry the exact failed call independently, still at the same pinned block.
      try { out.push(await rpc.readContract({ ...chunks[n][j], blockNumber })); }
      catch (e) { throw new Error(`RPC 合约读取失败：${(e.shortMessage || e.message) + (e.details ? ': ' + e.details : '')}`); }
    }
  }
  return out;
}

async function changedTicks(meta, fromBlock, toBlock, rpc) {
  const indices = new Set();
  for (let first = fromBlock; first <= toBlock; first += 1500n) {
    const last = first + 1499n > toBlock ? toBlock : first + 1499n;
    const query = { fromBlock: first, toBlock: last, strict: false };
    const logs = meta.protocol === 'infinityCl'
      ? await rpc.getLogs({ ...query, address: CL_MANAGER, event: modify, args: { id: meta.id } })
      : await rpc.getLogs({ ...query, address: meta.id, events: [mint, burn] });
    for (const log of logs) {
      if (log.removed || typeof log.blockNumber !== 'bigint' || log.blockNumber < first || log.blockNumber > last
        || !Number.isInteger(log.args?.tickLower) || !Number.isInteger(log.args?.tickUpper)) throw new Error('增量数据不完整');
      indices.add(log.args.tickLower); indices.add(log.args.tickUpper);
    }
  }
  return [...indices].sort((a, b) => a - b);
}

async function readPool(meta, baseId, reference, range, blockNumber, rpc, cached, previousBlock, timestamp) {
  const pool = { ...meta, ticks: [] };
  if (meta.protocol === 'v2') {
    const [r, t0, t1] = await batch(['getReserves', 'token0', 'token1'].map(f => call(meta.id, v2abi, f)), blockNumber, 80, rpc);
    if (t0.toLowerCase() !== meta.token0.id.toLowerCase() || t1.toLowerCase() !== meta.token1.id.toLowerCase()) throw new Error('目录与链上代币身份不一致');
    if (r[0] === 0n || r[1] === 0n) throw new Error('空池');
    pool.kind = 'v2'; pool.reserve0 = Number(r[0]); pool.reserve1 = Number(r[1]);
    return pool;
  }
  const infinity = meta.protocol === 'infinityCl';
  pool.kind = 'cl';
  const address = infinity ? CL_MANAGER : meta.id, abi = infinity ? clabi : v3abi;
  const prefix = infinity ? [meta.id] : [];
  const initial = infinity
    ? ['getSlot0', 'getLiquidity', 'poolIdToPoolKey'].map(f => call(address, abi, f, prefix))
    : ['slot0', 'liquidity', 'tickSpacing', 'token0', 'token1'].map(f => call(address, abi, f));
  const values = await batch(initial, blockNumber, 80, rpc);
  const slot = values[0];
  pool.sqrtPriceX96 = slot[0]; pool.tick = Number(slot[1]); pool.liquidity = values[1];
  if (pool.sqrtPriceX96 === 0n) throw new Error('池尚未初始化');
  if (infinity) {
    const key = values[2];
    if (key[0].toLowerCase() !== meta.token0.id.toLowerCase() || key[1].toLowerCase() !== meta.token1.id.toLowerCase()
      || key[3].toLowerCase() !== CL_MANAGER.toLowerCase()) throw new Error('Infinity PoolKey 身份校验失败');
    pool.spacing = Number((BigInt(key[5]) >> 16n) & 0xffffffn);
    pool.hook = key[2]; pool.dynamicFee = (key[4] & 0x800000) !== 0; pool.lpFee = slot[3];
  } else {
    pool.spacing = Number(values[2]);
    if (values[3].toLowerCase() !== meta.token0.id.toLowerCase() || values[4].toLowerCase() !== meta.token1.id.toLowerCase()) throw new Error('目录与链上代币身份不一致');
  }
  if (!Number.isInteger(pool.spacing) || pool.spacing < 1) throw new Error('无效 tick spacing');
  const p = reference || priceOf(pool, baseId);
  pool.rangeReference = p;
  const [lo, hi] = tickRange(pool, baseId, p, range);
  pool.fullRange = range === Infinity;
  pool.minTick = lo; pool.maxTick = hi;
  let indices, incremental = false;
  if (pool.fullRange && cacheMatchesPool(cached, pool) && timestamp >= cached.fullScanTimestamp && timestamp - cached.fullScanTimestamp < 21600000) {
    try {
      indices = await changedTicks(meta, previousBlock + 1n, blockNumber, rpc);
      incremental = true;
    } catch { /* An unavailable or incomplete event interval requires a full bitmap scan. */ }
  }
  if (!incremental) {
  const first = Math.floor(Math.floor(lo / pool.spacing) / 256), last = Math.floor(Math.floor(hi / pool.spacing) / 256);
  const words = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  const bitmaps = await batch(words.map(w => call(address, abi, infinity ? 'getPoolBitmapInfo' : 'tickBitmap', [...prefix, w])), blockNumber, 512, rpc);
  indices = [];
  bitmaps.forEach((bitmap, i) => {
    for (let bit = 0; bit < 256; bit++) {
      if ((bitmap & (1n << BigInt(bit))) === 0n) continue;
      const tick = (words[i] * 256 + bit) * pool.spacing;
      if (tick >= lo && tick <= hi) indices.push(tick);
    }
  });
  }
  if (indices.length > 15000) throw new Error('初始化 tick 数过多，请选择较小百分比');
  const tickData = await batch(indices.map(t => call(address, abi, infinity ? 'getPoolTickInfo' : 'ticks', [...prefix, t])), blockNumber, 80, rpc);
  const updates = indices.map((index, i) => ({ index, net: infinity ? tickData[i].liquidityNet : tickData[i][1], gross: infinity ? tickData[i].liquidityGross : tickData[i][0] }));
  pool.ticks = mergeTicks(incremental ? cached.ticks : [], updates);
  if (pool.ticks.length > 15000) throw new Error('初始化 tick 数过多，请选择较小百分比');
  pool.fullScanTimestamp = incremental ? cached.fullScanTimestamp : timestamp;
  pool.incremental = incremental;
  if (pool.fullRange) {
    let left = BigInt(pool.liquidity), right = left;
    for (const t of pool.ticks) { if (t.index <= pool.tick) left -= t.net; else right += t.net; }
    if (left !== 0n || right !== 0n) throw new Error('全部价格数据校验失败，池子未计入');
  }
  return pool;
}

export async function loadPools(metas, baseId, range, progress = () => {}, options = {}) {
  const rpc = options.client || client;
  const latest = await rpc.getBlockNumber({ cacheTime: 0 });
  const blockNumber = latest > 12n ? latest - 12n : latest;
  const block = await rpc.getBlock({ blockNumber });
  const timestamp = Number(block.timestamp) * 1000;
  let previous = options.previous;
  if (previous && previous.blockHash && blockNumber >= previous.blockNumber && blockNumber - previous.blockNumber <= 40000n) {
    try { if ((await rpc.getBlock({ blockNumber: previous.blockNumber })).hash !== previous.blockHash) previous = null; }
    catch { previous = null; }
  } else previous = null;
  const allMetas = [...metas];
  for (const p of previous?.pools || []) if (p.discoveredBy === 'ownedLP' && !allMetas.some(m => m.protocol === p.protocol && m.id.toLowerCase() === p.id.toLowerCase())) allMetas.push(poolMetadata(p));
  const supported = allMetas.filter(p => ['v2', 'v3', 'infinityCl'].includes(p.protocol));
  const failed = allMetas.filter(p => !supported.includes(p)).map(p => ({ ...p, error: '此版本尚未支持深度计算' }));
  const pools = [];
  // The largest indexed pool establishes a common price boundary; all reads pin the same block.
  const ordered = [...supported].sort((a, b) => Number(b.tvlUSD) - Number(a.tvlUSD));
  let reference;
  for (let i = 0; i < ordered.length; i += 3) {
    const chunk = ordered.slice(i, i + 3);
    const result = await Promise.allSettled(chunk.map(p => readPool(p, baseId, reference, range, blockNumber, rpc,
      previous?.pools.find(old => old.id.toLowerCase() === p.id.toLowerCase()), previous?.blockNumber, timestamp)));
    result.forEach((r, j) => {
      if (r.status === 'fulfilled') pools.push(r.value);
      else failed.push({ ...chunk[j], error: r.reason?.shortMessage || r.reason?.message || '读取失败' });
    });
    if (!reference && pools.length) reference = priceOf(pools[0], baseId);
    progress(pools.length + failed.length, allMetas.length);
  }
  // Initial parallel reads may have used a local reference. Re-read their ticks using the dominant price.
  const dominant = [...pools].sort((a, b) => Number(b.tvlUSD) - Number(a.tvlUSD))[0];
  if (dominant) {
    const center = priceOf(dominant, baseId);
    for (let i = 0; i < pools.length; i++) {
      if (range === Infinity || pools[i].kind !== 'cl' || Math.abs(pools[i].rangeReference / center - 1) < 1e-12) continue;
      try { pools[i] = await readPool(pools[i], baseId, center, range, blockNumber, rpc, null, null, timestamp); }
      catch (e) { failed.push({ ...pools[i], error: e.message }); pools[i] = null; }
    }
  }
  const livePools = pools.filter(Boolean);
  const ownershipIndex = await loadOwnership(livePools, { rpc, blockNumber, blockHash: block.hash,
    previous: previous?.ownershipIndex, seed: options.ownershipSeed, discover: options.discoverOwnership,
    read: contracts => batch(contracts, blockNumber, 80, rpc),
    readDiscoveredPool: async meta => {
      try {
        const value = await readPool(meta, baseId, reference, range, blockNumber, rpc,
          previous?.pools.find(p => p.id.toLowerCase() === meta.id), previous?.blockNumber, timestamp);
        const failedIndex = failed.findIndex(p => p.protocol === meta.protocol && p.id.toLowerCase() === meta.id);
        if (failedIndex >= 0) failed.splice(failedIndex, 1);
        return value;
      } catch {
        if (!failed.some(p => p.id.toLowerCase() === meta.id)) failed.push({ ...meta, error: '钱包发现的池子暂时读不到，未计入' });
        throw new Error('Owned pool read unavailable');
      }
    } });
  // Re-check the pin before publishing pool and owner state assembled over many RPC requests.
  if ((await rpc.getBlock({ blockNumber })).hash !== block.hash) throw new Error('读取期间区块发生变化，请刷新');
  return { pools: livePools, failed, blockNumber, blockHash: block.hash, timestamp, range, ownershipIndex };
}
