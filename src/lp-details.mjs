import { OWNERS, validateOwnership } from './ownership.mjs';
import { ownedInventory, poolInventory, priceAtTick } from './math.mjs';

// Same pinned pool state and principal calculation as the order book; no extra API reads.
export function lpDetails(pools, baseId) {
  if (!pools.length) throw new Error('LP 数据待核对');
  const wallets = OWNERS.map(owner => ({ owner, base: 0, quote: 0, positions: [] }));
  for (const pool of pools) {
    if (!validateOwnership(pool)) throw new Error('LP 数据待核对');
    const add = (owner, position, amount) => {
      const wallet = wallets.find(w => w.owner === owner);
      wallet.base += amount.base; wallet.quote += amount.quote;
      wallet.positions.push({ ...position, pool, ...amount });
    };
    if (pool.kind === 'v2') {
      if (!pool.ownership.ownBalance) continue;
      if (!pool.ownership.shares) throw new Error('地址份额待刷新');
      const inventory = poolInventory([pool], baseId);
      for (const share of pool.ownership.shares) if (share.ownBalance > 0n) {
        const scale = Number(share.ownBalance) / Number(pool.ownership.totalSupply);
        add(share.owner, {}, { base: inventory.base * scale, quote: inventory.quote * scale });
      }
    } else for (const position of pool.ownership.positions) if (position.liquidity > 0n) {
      const amount = ownedInventory([{ ...pool, ownership: { status: 'verified', positions: [position] } }], baseId);
      const bounds = [position.tickLower, position.tickUpper].map(t => priceAtTick(pool, baseId, t)).sort((a, b) => a - b);
      add(position.owner, { ...position, bounds }, amount);
    }
  }
  return wallets;
}
