import { category, groupHolders, holderGroupParts, GROUPS } from './holder-model.mjs';

// All shares use the current filtered holdings, never the token's total supply.
export function holderCharts(rows, manual = {}) {
  const positive = rows.filter(row => BigInt(row.balance) > 0n);
  const total = positive.reduce((sum, row) => sum + BigInt(row.balance), 0n);
  const share = amount => total ? Number(amount * 100000000n / total) / 1000000 : 0;
  const counts = new Map(),contributors=new Map();
  for (const row of positive) {
    const key = category(row, manual);
    counts.set(key, (counts.get(key) || 0) + 1);
    for(const part of holderGroupParts(row,manual))contributors.set(part.id,(contributors.get(part.id)||0)+1);
  }
  const groups = groupHolders(positive, manual).map(group => ({
    ...group, count: contributors.get(group.id), share: share(BigInt(group.balance)),
  }));
  const countGroups=GROUPS.filter(([id])=>counts.has(id)).map(([id,label,color])=>({id,label,color,count:counts.get(id)}));
  let cumulative = 0n;
  const top = [...positive].sort((a, b) => BigInt(a.balance) > BigInt(b.balance) ? -1 : BigInt(a.balance) < BigInt(b.balance) ? 1 : a.address.localeCompare(b.address))
    .slice(0, 10).map(row => {
      cumulative += BigInt(row.balance);
      return { address: row.address, balance: row.balance, share: share(BigInt(row.balance)), cumulativeShare: share(cumulative) };
    });
  return { total: total.toString(), count: positive.length, groups, countGroups, top };
}
