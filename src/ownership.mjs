import { keccak256, encodeAbiParameters, parseAbiParameters } from 'viem';
// Public wallet labels. These are addresses, never signing credentials.
export const OWNERS = ['0x1db99241d9e230edc33996567ec2707c42475fd8', '0xc40409aee5b913f14dfd8f967299ddf9dc5009a1', '0x23dd01612443d15c166aed7b430abdaeef923783', '0xdcdb497a0b2ab74753f8e40e36071ce7a0ab4930'];
export const V3_POSITION_MANAGER = '0x46a15b0b27311cedf172ab29e4f4766fbe7f4364';
export const CL_POSITION_MANAGER = '0x55f4c8aba71a1e923edc303eb4feff14608cc226';
export const CL_POOL_MANAGER = '0xa0ffb9c1ce1fe56963b0321b32e7a0302114058b';
const fail = () => { throw new Error('LP 归属数据未通过校验'); };
const uint = n => typeof n === 'bigint' && n >= 0n;

export function validateOwnership(pool) {
  const o = pool.ownership;
  if (!o || o.status === 'unavailable') return false;
  if (o.status !== 'verified') fail();
  if (pool.kind === 'v2') {
    if (!uint(o.ownBalance) || !uint(o.totalSupply) || !o.totalSupply || o.ownBalance > o.totalSupply) fail();
    if (o.shares && (!Array.isArray(o.shares) || o.shares.length !== OWNERS.length
      || o.shares.some((s, i) => s.owner !== OWNERS[i] || !uint(s.ownBalance))
      || o.shares.reduce((sum, s) => sum + s.ownBalance, 0n) !== o.ownBalance)) fail();
    return true;
  }
  const manager = pool.protocol === 'v3' ? V3_POSITION_MANAGER : CL_POSITION_MANAGER;
  if (!Array.isArray(o.positions) || o.positions.length > 2000) fail();
  const ids = new Set(), net = new Map();
  let active = 0n;
  for (const p of o.positions) {
    if (p.manager !== manager || !OWNERS.includes(p.owner) || !/^[1-9]\d*$/.test(p.tokenId) || ids.has(p.tokenId)
      || !uint(p.liquidity) || p.liquidity >= 2n ** 128n || !Number.isInteger(p.tickLower) || !Number.isInteger(p.tickUpper)
      || p.tickLower < -887272 || p.tickUpper > 887272 || p.tickLower >= p.tickUpper
      || p.tickLower % pool.spacing || p.tickUpper % pool.spacing) fail();
    ids.add(p.tokenId);
    net.set(p.tickLower, (net.get(p.tickLower) || 0n) + p.liquidity);
    net.set(p.tickUpper, (net.get(p.tickUpper) || 0n) - p.liquidity);
    if (p.tickLower <= pool.tick && pool.tick < p.tickUpper) active += p.liquidity;
  }
  // Prove that my liquidity is a subset at every interval, using exact integers.
  const wholeNet = new Map(pool.ticks.map(t => [t.index, t.net]));
  const indices = [...new Set([...net.keys(), ...wholeNet.keys()])].sort((a, b) => a - b);
  if (active > pool.liquidity) fail();
  for (const up of [true, false]) {
    let own = active, whole = pool.liquidity;
    const boundaries = indices.filter(t => up ? t > pool.tick : t <= pool.tick);
    if (!up) boundaries.reverse();
    for (const t of boundaries) {
      own += (up ? 1n : -1n) * (net.get(t) || 0n);
      whole += (up ? 1n : -1n) * (wholeNet.get(t) || 0n);
      if (own < 0n || own > whole) fail();
    }
  }
  return { liquidity: active, ticks: [...net].filter(([, value]) => value !== 0n).sort((a, b) => a[0] - b[0]).map(([index, value]) => ({ index, net: value })) };
}

export function ownedCurve(pool) {
  const valid = validateOwnership(pool);
  if (!valid) return null;
  if (pool.kind === 'v2') return { pool, scale: Number(pool.ownership.ownBalance) / Number(pool.ownership.totalSupply),
    external: pool, externalScale: Number(pool.ownership.totalSupply - pool.ownership.ownBalance) / Number(pool.ownership.totalSupply) };
  const ownNet = new Map(valid.ticks.map(t => [t.index, t.net]));
  const allTicks = new Map(pool.ticks.map(t => [t.index, t.net]));
  for (const [index, net] of ownNet) allTicks.set(index, (allTicks.get(index) || 0n) - net);
  const ticks = [...allTicks].filter(([, net]) => net !== 0n).sort((a, b) => a[0] - b[0]).map(([index, net]) => ({ index, net }));
  return { pool: { ...pool, ...valid }, scale: 1,
    external: { ...pool, liquidity: pool.liquidity - valid.liquidity, ticks }, externalScale: 1 };
}

// A discovery checkpoint covers all Infinity NFTs, including empty or other-pair positions.
// Its canonical hash, current ownerOf and balanceOf are rechecked before use.
export function validateOwnershipIndex(index) {
  if (!index || index.version !== 1 || index.chainId !== 56 || typeof index.blockNumber !== 'bigint' || index.blockNumber < 0n
    || !/^0x[0-9a-f]{64}$/i.test(index.blockHash) || !Array.isArray(index.owners)
    || index.owners.length !== OWNERS.length || !OWNERS.every((o, i) => index.owners[i] === o)
    || !Array.isArray(index.nfts) || index.nfts.length > 2000) fail();
  const ids = new Set();
  for (const n of index.nfts) {
    if (n.manager !== CL_POSITION_MANAGER || !OWNERS.includes(n.owner) || !/^[1-9]\d*$/.test(n.tokenId) || ids.has(n.tokenId)) fail();
    ids.add(n.tokenId);
  }
  return index;
}

export function poolKeyHash(key) {
  return keccak256(encodeAbiParameters(parseAbiParameters('address,address,address,address,uint24,bytes32'),
    [key.currency0, key.currency1, key.hooks, key.poolManager, key.fee, key.parameters]));
}
export function ownedPoolMeta(key, tokens) {
  const token0 = tokens.find(t => t.id.toLowerCase() === key.currency0.toLowerCase());
  const token1 = tokens.find(t => t.id.toLowerCase() === key.currency1.toLowerCase());
  if (!token0 || !token1 || token0 === token1 || key.poolManager.toLowerCase() !== CL_POOL_MANAGER) fail();
  return { id: poolKeyHash(key), protocol: 'infinityCl', chainId: 56, token0, token1,
    feeTier: key.fee & 0x7fffff, tvlUSD: '0', discoveredBy: 'ownedLP', discoveryKey: key };
}
export function validateDiscoveredPool(pool, tokens) {
  if (pool.discoveredBy !== 'ownedLP' || pool.protocol !== 'infinityCl') fail();
  const meta = ownedPoolMeta(pool.discoveryKey, tokens);
  if (meta.id !== pool.id.toLowerCase() || !['token0', 'token1'].every(k => pool[k]?.id.toLowerCase() === meta[k].id.toLowerCase() && pool[k].decimals === meta[k].decimals)) fail();
  return meta;
}

export function poolMetadata(pool) {
  // A catalog describes identity/labels. Pinned price, ticks and LP state stay in snapshots.
  return Object.fromEntries(['id', 'protocol', 'chainId', 'token0', 'token1', 'feeTier', 'tvlUSD',
    'volumeUSD24h', 'token0Price', 'token1Price', 'discoveredBy', 'discoveryKey'].filter(key => pool[key] !== undefined).map(key => [key, pool[key]]));
}
