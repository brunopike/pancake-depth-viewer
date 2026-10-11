import { createPublicClient, http, fallback, parseAbi } from 'viem';
import { bsc } from 'viem/chains';
import { priceOf, sqrtAtPrice } from './math.mjs';

export const RPCS = ['https://bsc-rpc.publicnode.com', 'https://bsc-dataseed.bnbchain.org', 'https://bsc-dataseed1.binance.org'];
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
async function batch(contracts, blockNumber) {
  const out = [];
  for (let i = 0; i < contracts.length; i += 80) {
    const result = await client.multicall({ contracts: contracts.slice(i, i + 80), blockNumber, batchSize: 0, allowFailure: true });
    for (const r of result) {
      if (r.status !== 'success') throw new Error('RPC 合约读取失败，请重试或缩小范围');
      out.push(r.result);
    }
  }
  return out;
}

async function readPool(meta, baseId, reference, range, blockNumber) {
  const pool = { ...meta, ticks: [] };
  if (meta.protocol === 'v2') {
    const [r, t0, t1] = await batch(['getReserves', 'token0', 'token1'].map(f => call(meta.id, v2abi, f)), blockNumber);
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
  const values = await batch(initial, blockNumber);
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
  const a = sqrtAtPrice(pool, baseId, p * (1 - range)), b = sqrtAtPrice(pool, baseId, p * (1 + range));
  const targetTicks = [Math.floor(2 * Math.log(a) / Math.log(1.0001)), Math.ceil(2 * Math.log(b) / Math.log(1.0001)), pool.tick];
  const lo = Math.max(-887272, Math.min(...targetTicks) - pool.spacing), hi = Math.min(887272, Math.max(...targetTicks) + pool.spacing);
  pool.minTick = lo; pool.maxTick = hi;
  const first = Math.floor(Math.floor(lo / pool.spacing) / 256), last = Math.floor(Math.floor(hi / pool.spacing) / 256);
  if (last - first > 500) throw new Error('tick 范围过大，请降低档数或 bps');
  const words = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  const bitmaps = await batch(words.map(w => call(address, abi, infinity ? 'getPoolBitmapInfo' : 'tickBitmap', [...prefix, w])), blockNumber);
  const indices = [];
  bitmaps.forEach((bitmap, i) => {
    for (let bit = 0; bit < 256; bit++) {
      if ((bitmap & (1n << BigInt(bit))) === 0n) continue;
      const tick = (words[i] * 256 + bit) * pool.spacing;
      if (tick >= lo && tick <= hi) indices.push(tick);
    }
  });
  if (indices.length > 15000) throw new Error('初始化 tick 数过多，请缩小范围');
  const tickData = await batch(indices.map(t => call(address, abi, infinity ? 'getPoolTickInfo' : 'ticks', [...prefix, t])), blockNumber);
  pool.ticks = indices.map((index, i) => ({ index, net: infinity ? tickData[i].liquidityNet : tickData[i][1] }));
  return pool;
}

export async function loadPools(metas, baseId, range, progress = () => {}) {
  const blockNumber = await client.getBlockNumber({ cacheTime: 0 });
  const block = await client.getBlock({ blockNumber });
  const supported = metas.filter(p => ['v2', 'v3', 'infinityCl'].includes(p.protocol));
  const failed = metas.filter(p => !supported.includes(p)).map(p => ({ ...p, error: '此版本尚未支持深度计算' }));
  const pools = [];
  // The largest indexed pool establishes a common price boundary; all reads pin the same block.
  const ordered = [...supported].sort((a, b) => Number(b.tvlUSD) - Number(a.tvlUSD));
  let reference;
  for (let i = 0; i < ordered.length; i += 3) {
    const chunk = ordered.slice(i, i + 3);
    const result = await Promise.allSettled(chunk.map(p => readPool(p, baseId, reference, range, blockNumber)));
    result.forEach((r, j) => {
      if (r.status === 'fulfilled') pools.push(r.value);
      else failed.push({ ...chunk[j], error: r.reason?.shortMessage || r.reason?.message || '读取失败' });
    });
    if (!reference && pools.length) reference = priceOf(pools[0], baseId);
    progress(pools.length + failed.length, metas.length);
  }
  // Initial parallel reads may have used a local reference. Re-read their ticks using the dominant price.
  const dominant = [...pools].sort((a, b) => Number(b.tvlUSD) - Number(a.tvlUSD))[0];
  if (dominant) {
    const center = priceOf(dominant, baseId);
    for (let i = 0; i < pools.length; i++) {
      if (pools[i].kind !== 'cl' || Math.abs(pools[i].rangeReference / center - 1) < 1e-12) continue;
      try { pools[i] = await readPool(pools[i], baseId, center, range, blockNumber); }
      catch (e) { failed.push({ ...pools[i], error: e.message }); pools[i] = null; }
    }
  }
  return { pools: pools.filter(Boolean), failed, blockNumber, timestamp: Number(block.timestamp) * 1000 };
}
