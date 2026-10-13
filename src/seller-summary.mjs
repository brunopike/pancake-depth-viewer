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

// Use the same complete period/mode dataset and classifications as the ranking.
// Categories can overlap; each is counted independently, never added together.
export function sellerSummaries(rows, getProfile) {
  const groups = SELLER_GROUPS.map(group => ({ ...group, count: 0, sold: 0n, bought: 0n }));
  for (const row of rows) {
    const profile = getProfile(row), sold = BigInt(row.sold), bought = BigInt(row.bought);
    for (const group of groups) if (matchesSellerGroup(profile, group.id)) {
      group.count++; group.sold += sold; group.bought += bought;
    }
  }
  return groups.map(group => ({ ...group, sold: group.sold.toString(), bought: group.bought.toString(), netSold: (group.sold - group.bought).toString() }));
}
