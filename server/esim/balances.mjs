import { TOKEN } from './metrics.mjs';
import { knownTradingAddresses } from './addresses.mjs';
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const cache = new Map();
export async function queryBalances(state, addresses, transport) {
  const known = knownTradingAddresses(state);
  if (!Array.isArray(addresses) || !addresses.length || addresses.length > 25 || new Set(addresses).size !== addresses.length || addresses.some(a => !known.has(a))) throw new Error('INVALID_BALANCE_ADDRESSES');
  const result = {}, missing = [];
  for (const a of addresses) { const saved = cache.get(a); if (saved && Date.now() - saved.checkedAt < 60000) result[a] = saved; else missing.push(a); }
  if (missing.length) {
    const chain = await transport.rpc('eth_chainId', []);
    if (chain !== '0x38') throw new Error('WRONG_CHAIN');
    const head = await transport.rpc('eth_blockNumber', []), block = `0x${(BigInt(head) - 20n).toString(16)}`;
    const before = await transport.rpc('eth_getBlockByNumber', [block, false]);
    const values = await transport.batch(missing.flatMap(a => [
      ['eth_call', [{ to: TOKEN, data: `0x70a08231${a.slice(2).padStart(64, '0')}` }, block]],
      ['eth_call', [{ to: USDT, data: `0x70a08231${a.slice(2).padStart(64, '0')}` }, block]],
      ['eth_getBalance', [a, block]],
    ]));
    const after = await transport.rpc('eth_getBlockByNumber', [block, false], { fresh: true });
    if (!before?.hash || before.hash !== after?.hash) throw new Error('BALANCE_BLOCK_CHANGED');
    const timestamp = Number(BigInt(before.timestamp));
    for (const [i, address] of missing.entries()) {
      const b = { esim: BigInt(values[i * 3]).toString(), usdt: BigInt(values[i * 3 + 1]).toString(), bnb: BigInt(values[i * 3 + 2]).toString(), block: Number(BigInt(block)), timestamp, checkedAt: Date.now() };
      cache.set(address, b); result[address] = b;
    }
  }
  return result;
}
