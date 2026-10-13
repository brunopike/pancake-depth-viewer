import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keccak256, encodeAbiParameters, parseAbiParameters } from 'viem';
import { loadOwnership } from '../src/lp-chain.mjs';
import { OWNERS, CL_POSITION_MANAGER, CL_POOL_MANAGER, V3_POSITION_MANAGER } from '../src/ownership.mjs';

const hash = n => '0x' + String(n).padStart(64, '0');
const tokens = ['0x1111111111111111111111111111111111111111', '0x2222222222222222222222222222222222222222'];
const key = { currency0: tokens[0], currency1: tokens[1], hooks: '0x0000000000000000000000000000000000000000', poolManager: CL_POOL_MANAGER, fee: 500, parameters: '0x' + (10n << 16n).toString(16).padStart(64, '0') };
const id = keccak256(encodeAbiParameters(parseAbiParameters('address,address,address,address,uint24,bytes32'), Object.values(key)));
const packed = (100n << 32n) | (BigInt.asUintN(24, -100n) << 8n);
const cl = () => ({ id, protocol: 'infinityCl', kind: 'cl', token0: { id: tokens[0], decimals: 18 }, token1: { id: tokens[1], decimals: 18 },
  spacing: 10, tick: 0, liquidity: 1000n, ticks: [{ index: -100, net: 1000n }, { index: 100, net: -1000n }] });
const nft = (tokenId, owner) => ({ manager: CL_POSITION_MANAGER, tokenId, owner });
const seed = () => ({ version: 1, chainId: 56, blockNumber: 10n, blockHash: hash(10), owners: OWNERS, nfts: [nft('1', OWNERS[0]), nft('2', OWNERS[0])] });
const external = '0x3333333333333333333333333333333333333333';
const events = [
  { address: CL_POSITION_MANAGER, blockNumber: 11n, logIndex: 1, removed: false, args: { from: OWNERS[0], to: external, tokenId: 1n } },
  { address: CL_POSITION_MANAGER, blockNumber: 12n, logIndex: 2, removed: false, args: { from: external, to: OWNERS[1], tokenId: 3n } }
];
function setup({ counts = [1n, 1n, 0n], logs = events, badHash = false, wrongOwner = false } = {}) {
  const calls = [];
  const rpc = { getBlock: async ({ blockNumber }) => ({ hash: badHash ? hash(99) : hash(Number(blockNumber)) }),
    getLogs: async query => { calls.push(query); return logs.filter(l => query.args.from ? OWNERS.includes(l.args.from) : OWNERS.includes(l.args.to)); } };
  const read = async contracts => contracts.map(c => {
    calls.push(c);
    if (c.functionName === 'clPoolManager') return CL_POOL_MANAGER;
    if (c.functionName === 'balanceOf') return counts[OWNERS.indexOf(c.args[0])];
    if (c.functionName === 'ownerOf') return wrongOwner ? external : c.args[0] === 2n ? OWNERS[0] : OWNERS[1];
    if (c.functionName === 'getPoolAndPositionInfo') return [key, packed];
    if (c.functionName === 'getPositionLiquidity') return 300n;
    throw new Error('Unexpected contract read');
  });
  return { rpc, read, calls };
}
async function load(pool, options) { return loadOwnership([pool], { ...options, blockNumber: 12n, blockHash: hash(12), seed: seed() }); }

test('Transfers update ownership and current position liquidity is read at the pool block', async () => {
  const env = setup(), pool = cl();
  const index = await load(pool, env);
  assert.equal(index.blockNumber, 12n);
  assert.deepEqual(index.nfts.map(n => n.tokenId), ['2', '3']);
  assert.equal(pool.ownership.status, 'verified');
  assert.deepEqual(pool.ownership.positions.map(p => p.owner), OWNERS.slice(0, 2));
  assert.equal(pool.ownership.positions[0].liquidity, 300n);
  assert.equal(pool.ownership.positions[0].tickLower, -100);
  assert.equal(pool.ownership.positions[0].tickUpper, 100);
  assert.ok(env.calls.filter(c => c.fromBlock).every(c => c.fromBlock === 11n && c.toBlock === 12n));
});

test('A missed NFT, stale indexer owner or incomplete log response makes the split unavailable', async () => {
  for (const env of [setup({ counts: [2n, 1n, 0n] }), setup({ wrongOwner: true }), setup({ logs: [{ ...events[0], removed: true }, events[1]] })]) {
    const pool = cl();
    assert.equal(await load(pool, env), undefined);
    assert.equal(pool.ownership.status, 'unavailable');
    assert.equal(pool.liquidity, 1000n);
  }
});

test('A noncanonical checkpoint is not trusted; a verified full discovery can recover it', async () => {
  const pool = cl(), env = setup({ badHash: true });
  assert.equal(await load(pool, env), undefined);
  assert.equal(pool.ownership.status, 'unavailable');
  const fresh = cl();
  const index = await load(fresh, { ...env, discover: async () => [nft('2', OWNERS[0]), nft('3', OWNERS[1])] });
  assert.equal(index.nfts.length, 2); assert.equal(fresh.ownership.status, 'verified');
});

test('An active owned pool omitted by the official catalog is added, rather than silently counted as zero', async () => {
  const pools = [{ ...cl(), id: hash(123) }], env = setup(); let discovered;
  const index = await loadOwnership(pools, { ...env, blockNumber: 12n, blockHash: hash(12), seed: seed(),
    readDiscoveredPool: async meta => { discovered = meta; return { ...cl(), ...meta }; } });
  assert.equal(index.nfts.length, 2); assert.equal(pools.length, 2);
  assert.equal(discovered.id, id); assert.equal(discovered.discoveredBy, 'ownedLP');
  assert.deepEqual(pools[1].ownership.positions.map(n => n.tokenId), ['2', '3']);
});

test('V2 shares and V3 enumerable NFTs use current balances and the exact factory pool', async () => {
  const v2 = { id: external, kind: 'v2', protocol: 'v2' }, v3 = { ...cl(), id: external, protocol: 'v3' };
  const read = async contracts => contracts.map(c => {
    if (c.functionName === 'balanceOf') return c.address === V3_POSITION_MANAGER ? (c.args[0] === OWNERS[0] ? 1n : 0n) : [2n, 3n, 0n][OWNERS.indexOf(c.args[0])];
    if (c.functionName === 'totalSupply') return 10n;
    if (c.functionName === 'tokenOfOwnerByIndex') return 5n;
    if (c.functionName === 'ownerOf') return OWNERS[0];
    if (c.functionName === 'positions') return [0n, external, ...tokens, 500, -100, 100, 300n, 0n, 0n, 0n, 0n];
    if (c.functionName === 'getPool') return external;
    throw new Error('Unexpected read');
  });
  await loadOwnership([v2, v3], { read, rpc: setup().rpc, blockNumber: 12n, blockHash: hash(12) });
  assert.deepEqual(v2.ownership, { status: 'verified', ownBalance: 5n, totalSupply: 10n, shares: OWNERS.map((owner, i) => ({ owner, ownBalance: [2n, 3n, 0n][i] })) });
  assert.equal(v3.ownership.status, 'verified'); assert.equal(v3.ownership.positions[0].tokenId, '5');
});
