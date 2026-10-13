import { keccak256, stringToHex } from 'viem';
import { TOKEN, SOURCE } from './metrics.mjs';
export const signature = value => keccak256(stringToHex(value));
export const TRANSFER = signature('Transfer(address,address,uint256)');
export const PCS = '0xa0ffb9c1ce1fe56963b0321b32e7a0302114058b';
export const UNI = '0x28e2ea090877bf75740558f6bfb36a5ffee9e9df';
export const VAULT = '0x238a358808379702088667322f80ac48bad5e6c4';
export const V2 = signature('Swap(address,uint256,uint256,uint256,uint256,address)');
export const V3 = new Set(['Swap(address,address,int256,int256,uint160,uint128,int24)', 'Swap(address,address,int256,int256,uint160,uint128,int24,uint128,uint128)'].map(signature));
export const SWAPS = {
  [PCS]: signature('Swap(bytes32,address,int128,int128,uint160,uint128,int24,uint24,uint16)'),
  [UNI]: signature('Swap(bytes32,address,int128,int128,uint160,uint128,int24,uint24)'),
};
export const V4 = new Set(Object.values(SWAPS));
export const topic = a => `0x${a.slice(2).padStart(64, '0')}`;
export const addr = word => `0x${word.slice(-40).toLowerCase()}`;
export const order = e => ['blockNumber', 'transactionIndex', 'logIndex'].map(k => Number(BigInt(e[k])));
export const before = (a, b) => a[0] < b[0] || a[0] === b[0] && (a[1] < b[1] || a[1] === b[1] && a[2] < b[2]);
export const eventKey = e => `${e.transactionHash}:${e.logIndex}`;
export const words = s => (s.slice(2).match(/.{64}/g) || []).map(x => BigInt(`0x${x}`));
const signed = n => n >= 1n << 255n ? n - (1n << 256n) : n;
export const typedWallet = code => code === '0x' || /^0xef0100[0-9a-f]{40}$/i.test(code);

export function decodeLeg(e, pools, timestamp) {
  const sig = e.topics[0], pid = V4.has(sig) ? e.topics[1] : e.address.toLowerCase(), pool = pools[pid];
  if (!pool || ![pool.token0, pool.token1].includes(TOKEN)) throw new Error('Unverified ESIM pool');
  if (V4.has(sig) && pool.manager !== e.address.toLowerCase()) throw new Error('Wrong pool manager');
  const i = pool.token0 === TOKEN ? 0 : 1, w = words(e.data);
  let amount;
  if (V3.has(sig)) amount = signed(w[i]);
  else if (V4.has(sig)) amount = -signed(w[i]);
  else if (sig === V2) amount = w[i] - w[i + 2];
  else throw new Error('Unknown swap');
  return { tx: e.transactionHash, pool: pid, manager: e.address.toLowerCase(), block: order(e)[0], order: order(e),
    timestamp, side: amount > 0n ? 'sell' : 'buy', amount_wei: (amount < 0n ? -amount : amount).toString() };
}

// Port of the existing report's receipt/Transfer funding rules. Mixed execution
// remains two separate unattributed sides; a shared router is never a trader.
export function attributionCandidates(legs, receipts, firstRecipient, pools) {
  const infra = new Set([SOURCE, TOKEN, '0x' + '0'.repeat(40), VAULT, PCS, UNI,
    ...Object.keys(pools).filter(a => a.length === 42)]);
  const byTx = new Map();
  for (const l of legs) { if (!byTx.has(l.tx)) byTx.set(l.tx, []); byTx.get(l.tx).push(l); }
  const candidates = [];
  for (const [tx, ll] of byTx) {
    const receipt = receipts[tx];
    if (!receipt || receipt.status !== '0x1') throw new Error('Unsuccessful trade receipt');
    const net = new Map(), edges = [];
    const sold = ll.filter(l => l.side === 'sell').reduce((n, l) => n + BigInt(l.amount_wei), 0n);
    const bought = ll.filter(l => l.side === 'buy').reduce((n, l) => n + BigInt(l.amount_wei), 0n);
    for (const e of receipt.logs) if (e.address.toLowerCase() === TOKEN && e.topics[0] === TRANSFER) {
      const a = addr(e.topics[1]), b = addr(e.topics[2]), v = BigInt(e.data);
      net.set(a, (net.get(a) || 0n) - v); net.set(b, (net.get(b) || 0n) + v);
      if (v) edges.push({ a, b, v, e });
    }
    const targets = new Set(ll.map(l => l.manager)); if (targets.has(PCS)) targets.add(VAULT);
    const reaches = (a, reverse = false) => {
      const reached = new Set([a]); let changed = true;
      while (changed) { changed = false; for (const e of edges) {
        const from = reverse ? e.b : e.a, to = reverse ? e.a : e.b;
        if (reached.has(from) && !reached.has(to)) { reached.add(to); changed = true; }
      } }
      return [...targets].some(t => reached.has(t));
    };
    const neg = [...net].filter(([a, v]) => v < 0n && !infra.has(a) && reaches(a)).map(([a]) => a);
    const pos = [...net].filter(([a, v]) => v > 0n && !infra.has(a) && reaches(a, true)).map(([a]) => a);
    const owners = [], side = sold ? 'sell' : 'buy';
    if (!(sold && bought)) {
      if (sold) {
        const other = [...net].filter(([a, v]) => v < 0n && !infra.has(a) && !neg.includes(a));
        if (neg.length && !pos.length && !other.length && neg.reduce((n, a) => n - net.get(a), 0n) === sold) {
          for (const a of neg) owners.push([a, -net.get(a)]);
        } else if (neg.length === 1 && !pos.length && !other.length && -net.get(neg[0]) >= sold && (net.get(SOURCE) || 0n) >= 0n) owners.push([neg[0], sold]);
        else if (!neg.length) {
          const payers = [...new Set(edges.filter(e => targets.has(e.b) && !infra.has(e.a)).map(e => e.a))];
          if (payers.length === 1) {
            const a = payers[0];
            const paid = edges.filter(e => e.a === a && targets.has(e.b)).reduce((n, e) => n + e.v, 0n);
            const received = edges.filter(e => e.b === a && infra.has(e.a)).reduce((n, e) => n + e.v, 0n);
            const lpEvents = new Set(['Burn(address,int24,int24,uint128,uint256,uint256)', 'Collect(address,address,int24,int24,uint128,uint128)', 'ModifyLiquidity(bytes32,address,int24,int24,int256,bytes32)'].map(signature));
            if (paid === sold && received === sold && receipt.logs.some(e => lpEvents.has(e.topics[0]) && e.topics.slice(1).some(t => addr(t) === a))) owners.push([a, sold]);
          }
        }
      } else if (pos.length === 1 && !neg.length && net.get(pos[0]) > 0n && net.get(pos[0]) <= bought && ![...net].some(([a, v]) => v > 0n && !infra.has(a) && a !== pos[0])) owners.push([pos[0], bought]);
    }
    const entries = owners.map(([a, amount]) => {
      const points = [...ll.map(l => l.order), ...edges.filter(e => side === 'sell' ? e.a === a : e.b === a).map(e => order(e.e))];
      const at = points.reduce((a, b) => before(a, b) ? a : b);
      return { address: a, amount_wei: amount.toString(), side,
        claimBefore: !!firstRecipient[a] && before(firstRecipient[a].order, at) };
    });
    candidates.push({ tx, block: ll[0].block, timestamp: ll[0].timestamp, sold, bought, owners: entries });
  }
  return candidates;
}

export function attributedRows(candidates, codes) {
  return candidates.flatMap(c => {
    const base = { tx: c.tx, block: c.block, timestamp: c.timestamp };
    if (c.owners.length) return c.owners.map(o => {
      if (!o.claimBefore && typeof codes[o.address] !== 'string') throw new Error('Missing wallet code');
      return { ...base, address: o.address, side: o.side, amount_wei: o.amount_wei,
        group: o.claimBefore ? 'source_recipients' : typedWallet(codes[o.address]) ? 'other_wallet_candidates' : 'remaining_unattributed' };
    });
    return [['sell', c.sold], ['buy', c.bought]].filter(([, n]) => n > 0n).map(([side, n]) => ({
      ...base, address: null, side, amount_wei: n.toString(), group: 'remaining_unattributed' }));
  });
}
