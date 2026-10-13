import { parseAbi, parseAbiItem } from 'viem';
import { OWNERS, CL_POSITION_MANAGER, V3_POSITION_MANAGER, CL_POOL_MANAGER, validateOwnership, validateOwnershipIndex, poolKeyHash, ownedPoolMeta } from './ownership.mjs';
import { latestSharedURL } from './snapshot.mjs';

const nftAbi = parseAbi(['function balanceOf(address) view returns (uint256)', 'function ownerOf(uint256) view returns (address)', 'function tokenOfOwnerByIndex(address,uint256) view returns (uint256)']);
const clAbi = parseAbi(['function clPoolManager() view returns (address)', 'function getPoolAndPositionInfo(uint256) view returns ((address currency0,address currency1,address hooks,address poolManager,uint24 fee,bytes32 parameters),uint256)', 'function getPositionLiquidity(uint256) view returns (uint128)']);
const v3Abi = parseAbi(['function positions(uint256) view returns (uint96,address,address,address,uint24,int24,int24,uint128,uint256,uint256,uint128,uint128)']);
const v2Abi = parseAbi(['function balanceOf(address) view returns (uint256)', 'function totalSupply() view returns (uint256)']);
const factoryAbi = parseAbi(['function getPool(address,address,uint24) view returns (address)']);
const V3_FACTORY = '0x0bfbcf9fa4f9c56b0f40a671ad40e0805a091865';
const transfer = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)');
const call = (address, abi, functionName, args = []) => ({ address, abi, functionName, args });
const lower = s => s.toLowerCase();
const decodeIndex = text => validateOwnershipIndex(JSON.parse(text, (key, value) => key === 'blockNumber' && typeof value === 'string' ? BigInt(value) : value));
let initialSeed, browserIndex;
async function seedIndex() {
  if (!initialSeed) initialSeed = fetch('./data/lp-owners.json', { signal: AbortSignal.timeout(6000) }).then(r => {
    if (!r.ok) throw new Error('Missing LP checkpoint'); return r.text();
  }).then(decodeIndex).catch(() => { initialSeed = undefined; return undefined; });
  return initialSeed;
}
async function checkpoint(options) {
  const { rpc, blockNumber } = options;
  const browser = typeof window !== 'undefined';
  const candidates = [options.previous, options.seed, browser ? browserIndex : null];
  if (browser && !options.seed) candidates.push(await seedIndex());
  const canonical = async index => {
    try {
      validateOwnershipIndex(index);
      return index.blockNumber <= blockNumber && blockNumber - index.blockNumber <= 40000n
        && (await rpc.getBlock({ blockNumber: index.blockNumber })).hash === index.blockHash;
    } catch { return false; }
  };
  candidates.sort((a, b) => a?.blockNumber > b?.blockNumber ? -1 : 1);
  for (const candidate of candidates) if (await canonical(candidate)) return candidate;
  // A viewer opened long after the bundled checkpoint can use the latest public worker index.
  if (browser) try {
    const signal = AbortSignal.timeout(6000), r = await fetch(await latestSharedURL(signal), { cache: 'no-store', signal });
    if (r.ok) {
      const data = JSON.parse(await r.text(), (key, value) => key === 'blockNumber' && typeof value === 'string' ? BigInt(value) : value);
      if (await canonical(data.ownershipIndex)) return data.ownershipIndex;
    }
  } catch { /* No unverified index is used. */ }
}

async function infinityIndex(options) {
  const { rpc, blockNumber, blockHash, read } = options;
  let index = await checkpoint(options), nfts;
  if (index) {
    const current = new Map(index.nfts.map(n => [n.tokenId, { ...n }]));
    for (let first = index.blockNumber + 1n; first <= blockNumber; first += 1500n) {
      const last = first + 1499n > blockNumber ? blockNumber : first + 1499n;
      const query = { address: CL_POSITION_MANAGER, event: transfer, fromBlock: first, toBlock: last, strict: false };
      const results = await Promise.all([
        rpc.getLogs({ ...query, args: { from: OWNERS } }), rpc.getLogs({ ...query, args: { to: OWNERS } })
      ]);
      const unique = new Map();
      for (const log of results.flat()) {
        const a = log.args;
        if (log.removed || lower(log.address) !== CL_POSITION_MANAGER || typeof log.blockNumber !== 'bigint'
          || log.blockNumber < first || log.blockNumber > last || !Number.isInteger(log.logIndex)
          || typeof a?.tokenId !== 'bigint' || a.tokenId <= 0n
          || ![a.from, a.to].every(s => /^0x[0-9a-f]{40}$/i.test(s))
          || ![a.from, a.to].some(s => OWNERS.includes(lower(s)))) throw new Error('Incomplete LP transfers');
        const key = `${log.blockNumber}:${log.logIndex}`, old = unique.get(key);
        if (old && (old.args.tokenId !== a.tokenId || lower(old.args.from) !== lower(a.from) || lower(old.args.to) !== lower(a.to))) throw new Error('Conflicting LP transfer');
        unique.set(key, log);
      }
      const logs = [...unique.values()].sort((a, b) => a.blockNumber === b.blockNumber ? a.logIndex - b.logIndex : a.blockNumber < b.blockNumber ? -1 : 1);
      for (const { args } of logs) {
        const tokenId = String(args.tokenId), owner = lower(args.to);
        if (OWNERS.includes(owner)) current.set(tokenId, { manager: CL_POSITION_MANAGER, tokenId, owner });
        else current.delete(tokenId);
      }
    }
    nfts = [...current.values()];
  } else if (options.discover) nfts = await options.discover();
  else throw new Error('No canonical LP checkpoint');
  index = validateOwnershipIndex({ version: 1, chainId: 56, owners: OWNERS, blockNumber, blockHash,
    nfts: nfts.sort((a, b) => BigInt(a.tokenId) < BigInt(b.tokenId) ? -1 : 1) });
  const [manager, ...counts] = await read([call(CL_POSITION_MANAGER, clAbi, 'clPoolManager'), ...OWNERS.map(o => call(CL_POSITION_MANAGER, nftAbi, 'balanceOf', [o]))]);
  if (lower(manager) !== CL_POOL_MANAGER || !counts.every((n, i) => n === BigInt(nfts.filter(p => p.owner === OWNERS[i]).length))) throw new Error('Incomplete LP discovery');
  const holders = await read(nfts.map(n => call(CL_POSITION_MANAGER, nftAbi, 'ownerOf', [BigInt(n.tokenId)])));
  if (!holders.every((owner, i) => lower(owner) === nfts[i].owner)) throw new Error('LP owner mismatch');
  return index;
}

async function infinityPositions(pools, options) {
  const index = await infinityIndex(options), { read } = options;
  const data = await read(index.nfts.flatMap(n => [call(CL_POSITION_MANAGER, clAbi, 'getPoolAndPositionInfo', [BigInt(n.tokenId)]), call(CL_POSITION_MANAGER, clAbi, 'getPositionLiquidity', [BigInt(n.tokenId)])]));
  const byPool = new Map(pools.map(p => [lower(p.id), []]));
  const signed24 = n => Number(BigInt.asIntN(24, n));
  const missing = new Map();
  const pairTokens = [pools[0].token0, pools[0].token1];
  const decoded = index.nfts.map((n, i) => {
    const [key, info] = data[i * 2], liquidity = data[i * 2 + 1];
    if (lower(key.poolManager) !== CL_POOL_MANAGER || !info) throw new Error('Invalid LP PoolKey');
    const poolId = poolKeyHash(key);
    if (!byPool.has(poolId) && liquidity > 0n && [key.currency0, key.currency1].every(currency => pairTokens.some(t => lower(t.id) === lower(currency)))) missing.set(poolId, ownedPoolMeta(key, pairTokens));
    return { n, key, info, liquidity, poolId };
  });
  for (const [id, meta] of missing) {
    if (!options.readDiscoveredPool) throw new Error('Owned pool missing from catalog');
    const pool = await options.readDiscoveredPool(meta);
    pools.push(pool); options.allPools.push(pool); byPool.set(id, []);
  }
  for (const { n, key, info, liquidity, poolId } of decoded) {
    const pool = pools.find(p => lower(p.id) === poolId);
    if (!pool) continue; // Only a different pair or an empty unlisted position can be skipped.
    if (lower(key.currency0) !== lower(pool.token0.id) || lower(key.currency1) !== lower(pool.token1.id)) throw new Error('LP token mismatch');
    byPool.get(poolId).push({ ...n, tickLower: signed24((info >> 8n) & 0xffffffn), tickUpper: signed24((info >> 32n) & 0xffffffn), liquidity });
  }
  for (const pool of pools) {
    pool.ownership = { status: 'verified', positions: byPool.get(lower(pool.id)) };
    validateOwnership(pool);
  }
  if (typeof window !== 'undefined' && (!browserIndex || browserIndex.blockNumber < index.blockNumber)) browserIndex = index;
  return index;
}

async function v3Positions(pools, { read }) {
  const counts = await read(OWNERS.map(o => call(V3_POSITION_MANAGER, nftAbi, 'balanceOf', [o])));
  if (counts.some(n => n < 0n || n > 2000n) || counts.reduce((a, b) => a + b, 0n) > 2000n) throw new Error('Too many LP NFTs');
  const expected = OWNERS.flatMap((owner, i) => Array.from({ length: Number(counts[i]) }, (_, j) => ({ owner, index: BigInt(j) })));
  const ids = await read(expected.map(n => call(V3_POSITION_MANAGER, nftAbi, 'tokenOfOwnerByIndex', [n.owner, n.index])));
  if (new Set(ids.map(String)).size !== ids.length) throw new Error('Duplicate LP NFT');
  const values = await read(ids.flatMap(id => [call(V3_POSITION_MANAGER, nftAbi, 'ownerOf', [id]), call(V3_POSITION_MANAGER, v3Abi, 'positions', [id])]));
  const addresses = await read(ids.map((_, i) => { const p = values[i * 2 + 1]; return call(V3_FACTORY, factoryAbi, 'getPool', [p[2], p[3], p[4]]); }));
  const positions = pools.map(() => []);
  ids.forEach((id, i) => {
    if (lower(values[i * 2]) !== expected[i].owner) throw new Error('LP owner mismatch');
    const p = values[i * 2 + 1], index = pools.findIndex(pool => lower(pool.id) === lower(addresses[i]));
    if (index < 0) return;
    if (lower(p[2]) !== lower(pools[index].token0.id) || lower(p[3]) !== lower(pools[index].token1.id)) throw new Error('LP token mismatch');
    positions[index].push({ manager: V3_POSITION_MANAGER, tokenId: String(id), owner: expected[i].owner, tickLower: p[5], tickUpper: p[6], liquidity: p[7] });
  });
  pools.forEach((pool, i) => { pool.ownership = { status: 'verified', positions: positions[i] }; validateOwnership(pool); });
}

export async function loadOwnership(pools, options) {
  for (const p of pools) p.ownership = { status: 'unavailable' };
  const v2 = pools.filter(p => p.protocol === 'v2'), v3 = pools.filter(p => p.protocol === 'v3'), cl = pools.filter(p => p.protocol === 'infinityCl');
  const results = await Promise.allSettled([
    Promise.all(v2.map(async pool => {
      try {
        const [totalSupply, ...balances] = await options.read([call(pool.id, v2Abi, 'totalSupply'), ...OWNERS.map(o => call(pool.id, v2Abi, 'balanceOf', [o]))]);
        pool.ownership = { status: 'verified', ownBalance: balances.reduce((a, b) => a + b, 0n), totalSupply,
          shares: OWNERS.map((owner, i) => ({ owner, ownBalance: balances[i] })) }; validateOwnership(pool);
      } catch { pool.ownership = { status: 'unavailable' }; }
    })),
    v3.length ? v3Positions(v3, options) : Promise.resolve(),
    cl.length ? infinityPositions(cl, { ...options, allPools: pools }) : Promise.resolve()
  ]);
  if (results[1].status === 'rejected') for (const pool of v3) pool.ownership = { status: 'unavailable' };
  if (results[2].status === 'rejected') for (const pool of cl) pool.ownership = { status: 'unavailable' };
  return results[2].status === 'fulfilled' ? results[2].value : undefined;
}
