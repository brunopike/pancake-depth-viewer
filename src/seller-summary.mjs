export const SELLER_GROUPS = [
  { id: 'received', label: '领过币', primary: true },
  { id: 'all', label: '全部', primary: true },
  { id: 'own', label: '我方', primary: false },
  { id: 'other', label: '其他交易', primary: false },
  { id: 'frequency', label: '高频交易', primary: false },
];

export function matchesSellerGroup(profile, group) {
  return group === 'all' || group === 'own' && profile.own ||
    group === 'received' && profile.received ||
    group === 'other' && !profile.own && !profile.received ||
    group === 'frequency' && profile.frequency;
}

// Overview includes buy-only wallets and unassigned verified fills in "all".
// The ranking remains sell-address-only; unknown wallets are never invented.
// Categories can overlap; each is counted independently, never added together.
export function sellerSummaries(rows, getProfile, unassigned = {}) {
  const groups = SELLER_GROUPS.map(group => ({ ...group, count: 0, activeCount:0, buyOnlyCount:0, buyOnlyBought:0n, sold: 0n, bought: 0n }));
  for (const row of rows) {
    const profile = getProfile(row), sold = BigInt(row.sold), bought = BigInt(row.bought);
    for (const group of groups) if (matchesSellerGroup(profile, group.id)) {
      group.activeCount++;if(sold>0n)group.count++;else if(bought>0n){group.buyOnlyCount++;group.buyOnlyBought+=bought;}
      group.sold += sold; group.bought += bought;
    }
  }
  const all=groups.find(group=>group.id==='all');
  all.sold+=BigInt(unassigned.sold||'0');all.bought+=BigInt(unassigned.bought||'0');
  return groups.map(group => ({ ...group, buyOnlyBought:group.buyOnlyBought.toString(), sold: group.sold.toString(), bought: group.bought.toString(), netSold: (group.sold - group.bought).toString() }));
}
