import workbook from './holder-import.json' with {type:'json'};
import marketMaking from './mm-own-addresses.json' with {type:'json'};

// Import identity and address types only. Workbook balances and behavioral tags
// are snapshots; fresh balances and trading/claim activity still come from RPC.
export const HOLDER_IMPORT = workbook;
// Reporting exclusions are distinct from wallet ownership. The shared Vault
// is not wholly attributed to us; the user excludes it from external float.
export const HOLDER_CIRCULATION_EXCLUSIONS = {
  '0xa7d81e889f2df910389c95fa0f9d6092220edf87': {label:'币安活动预留',source:'用户确认（2026-10-15）：活动预留不计入外部流通统计。'},
  '0x543714f349970cd3b02d6dc6a85ac8641f2bb3a3': {label:'币安活动预留（新地址）',source:'用户确认（2026-11-08）：币安更新的活动预留地址；单列，不计入外部流通统计。'},
  '0x238a358808379702088667322f80ac48bad5e6c4': {label:'共享 Vault',source:'用户确认（2026-10-15）：基本为我方，按统计约定从外部流通排除；不据此认定共享 Vault 的全部底层资产均属我方。'},
};
export const HOLDER_BALANCE_SPLITS = {
  '0x588177775e6fba9e752d0c9dfd5bbb562e8f016a': {
    external: '409924000000000000000000',
    source: '用户确认（2026-10-15）：409,924 ESIM 属于外部，剩余余额属于我方；只统计我方部分。此份额标记不推断历史买卖的资金归属。',
  },
};
export function splitHolderBalance(address,balance) {
  const rule=HOLDER_BALANCE_SPLITS[address];if(!rule)return null;
  const total=BigInt(balance),fixed=BigInt(rule.external),external=total<fixed?total:fixed;
  return {own:(total-external).toString(),external:external.toString(),confirmedExternal:rule.external,needsReview:total<fixed,source:rule.source};
}
const imported = new Map(workbook.records.map(row => [row.address,row]));
function source(row) {
  return `用户提供 Excel《${workbook.source}》· ${workbook.sheet} 第 ${row.row} 行；快照 ${workbook.capturedAt}，区块 ${workbook.block}${row.type?`；地址类型：${row.type}`:''}`;
}
const importedLabels = Object.fromEntries(workbook.records.flatMap(row => {
  const kind=row.ownership==='own'?(row.lp?'lp':'own'):row.ownership==='external'?'external':row.verified?(['交易路由合约','共享Vault'].includes(row.type)?'dex':row.type==='交易所地址'?'exchange':'contract'):null;
  if(!kind)return [];
  const label=row.ownership==='own'?(row.lp?'我方 LP':row.verified?`我方 · ${row.verified}`:'我方'):row.ownership==='external'?'外部':row.verified;
  return [[row.address,{kind,label,source:source(row)}]];
}));

export const HOLDER_TOKEN_BLACKLIST = Object.fromEntries([
  ['0x54403ec2c1035295e81172e1bf381d01df135f67','0x689f89132802233c17d7dd2d62a482848144d1b7c0385b2b0beef99f8ca84388'],
  ['0x1ab4973a48dc892cd9971ece8e01dcc7688f8f23','0xdf855c24b51a889e89bbac0293af6e42bdc52ca9656a892ce7a8ca800c2ecaf5'],
  ['0xb8b079246869cc8407ec592bbea198fc0df4f649','0xe9d826dc043746d537e18518d4065318627e48b5858c3317c3b4b920a8aa5d24'],
  ['0xf78f370135a9bd7ecc62ffd503dba525a75cd37e','0x667d6e2d451a5ba2c4a6e541e7867ee327ceeb3bda144a21465708915c07e145'],
  ['0xec4387262cdb82ee2bcb40c61e732a086cda739d','0x45f72f637e6b981048850d9680eeb067fb919aa5262b24c3000d27437b21462f'],
  ['0x9ee031f32d44bc4d047414a6b35c48714b4991c9','0xea586e6bba840cdfda56fade990f2e622f4236d8e338dbe54d5eeafbb5e46309'],
  ['0xbfbb0452e2d746e3c7d20992d22511bd5f5f0ff5','0xd18e9dacff0fb891f71951a264f49272d83cec2bba5bee339bc19228af46db8e'],
].map(([address,transaction])=>[address,{
  kind:'blacklist',label:address.endsWith('8f23')?'黑名单 · Bitget 6':address.endsWith('d37e')?'黑名单 · MEXC. User':'代币合约黑名单',
  source:`${importedLabels[address]?.source?importedLabels[address].source+'；':''}链上核验（2026-11-08 21:39:11 北京时间，BSC 区块132402041）：代币合约 blacklists(address)=true；设置交易 https://bscscan.com/tx/${transaction}。用户要求单列外部黑名单持仓，不计入交易所或网体分类；不代表我方所有。`,
}]));

// Shared classifications apply to cached snapshots and future reports. Explicit
// user confirmations take precedence over supplemental workbook descriptions.
export const CONFIRMED_HOLDER_LABELS = {
  ...Object.fromEntries(marketMaking.records.map(row=>[row.address,{
    kind:'own',label:row.number?`我方做市钱包 · ${row.number}号`:'我方执行钱包',
    source:`用户指定做市账本地址库（${marketMaking.confirmedAt}）；${row.number?`地址编号 ${row.number}`:'执行钱包组'}。归属来自确认名单，不以路由或资金往来推断。`,
  }])),
  ...importedLabels,
  ...HOLDER_TOKEN_BLACKLIST,
  '0x543714f349970cd3b02d6dc6a85ac8641f2bb3a3': {
    kind:'reserve',label:'币安活动预留（新地址）',
    source:HOLDER_CIRCULATION_EXCLUSIONS['0x543714f349970cd3b02d6dc6a85ac8641f2bb3a3'].source,
  },
  '0x53f78a071d04224b8e254e243fffc6d9f2f3fa23': {
    kind:'exchange',label:'KuCoin: Hot Wallet 2',
    source:importedLabels['0x53f78a071d04224b8e254e243fffc6d9f2f3fa23'].source+'；用户于2026-11-08要求同步KuCoin交易所标记；BscScan公开标签：https://bscscan.com/address/0x53f78a071d04224b8e254e243fffc6d9f2f3fa23',
  },
  '0x857627e285d4dde7f4882d21e806432f8649e601': {
    kind:'own',label:'我方地址（用户确认）',
    source:'用户确认（2026-10-28）：此地址属于我方，外部统计排除。',
  },
  '0xea4bd4aad512ca4dccda821e8693b6b38b51fc68': {
    kind:'own',label:'我方地址（用户确认）',
    source:'用户确认（2026-10-17）：该地址属于我方。',
  },
  '0xdde4deb7aab7cefdd5aa1ab4fdc8675eb901cad7': {
    kind:'own',label:'我方合约（用户确认）',
    source:'用户确认（2026-10-15）：原用途未明合约属于我方；地址用途仍待核实。',
  },
  '0x4252f9e683c7d38b6fd053346358f6460d982745': {
    kind:'own',label:'我方 · Safe 多签（3/4）· 固定10%收币',
    source:'用户确认（2026-10-15）：Safe 3/4 多签、固定10%收币地址属于我方。',
  },
  '0x238a358808379702088667322f80ac48bad5e6c4': {
    kind:'dex',label:'PancakeSwap Infinity 共享 Vault · 外部统计排除',
    source:HOLDER_CIRCULATION_EXCLUSIONS['0x238a358808379702088667322f80ac48bad5e6c4'].source,
  },
  '0x588177775e6fba9e752d0c9dfd5bbb562e8f016a': {
    kind:'mixed', label:'混合持仓 · 部分我方',
    source:HOLDER_BALANCE_SPLITS['0x588177775e6fba9e752d0c9dfd5bbb562e8f016a'].source,
  },
  '0x278d858f05b94576c1e6f73285886876ff6ef8d2': {
    kind: 'arbitrage', label: '套利机器人（用户确认）',
    source: '用户确认（2026-10-13）：机器人套利钱包',
  },
  '0xe1de6ac2ee058df5d3be8edeb62a8815fd13ff5a': {
    kind: 'own', label: '我方关联 · 买卖执行合约',
    source: '用户确认（2026-10-13）：我方关联的高频买卖执行合约',
  },
  '0xda537697845c1da9e639274fc011caf6ee89b33c': {
    kind: 'frequency', label: '高频机器人 · LP / 跨池交易',
    source: '用户确认（2026-10-13）：机器人高频地址，自动化 LP 操作、跨池交易合约',
  },
  '0x218c18d02f0723291ce93aa5c0e5eb709903179a': {
    kind: 'frequency', label: '高频机器人 · 自动卖出',
    source: '用户确认（2026-10-13）：机器人高频地址，自动卖出执行合约',
  },
};

export function applyHolderLabels(address, current=[]) {
  const known=CONFIRMED_HOLDER_LABELS[address],row=imported.get(address);
  let tags=known?[{id:`known-${known.kind}`,text:known.label,kind:known.kind,evidence:known.source},...current.filter(t=>!t.id?.startsWith('known-')&&(known.kind!=='mixed'||!['own','lp','external'].includes(t.kind))&&(!['frequency','arbitrage'].includes(known.kind)||!['frequency','arbitrage'].includes(t.kind)))]:[...current];
  const type=row?.type;
  if(type==='EIP-7702委托地址'||type==='合约（用途未确认）'||type==='合约（地址库）') {
    const delegated=type==='EIP-7702委托地址';
    // A delegated EOA has code but is not a conventional deployed contract.
    // A specific snapshot type replaces the generic code-presence label only.
    if(delegated||type==='合约（用途未确认）')tags=tags.filter(t=>t.id!=='contract'&&t.id!=='imported-type');
    if(delegated||!tags.some(t=>['contract','dex'].includes(t.kind)))tags.push({id:'imported-type',text:delegated?'EIP-7702 委托地址':type,kind:delegated?'account':'contract',evidence:source(row)});
  }
  if(tags.some(t=>['own','lp','mixed'].includes(t.kind)))tags=tags.filter(t=>!['frequency','arbitrage'].includes(t.kind));
  return tags.filter((t,i)=>tags.findIndex(other=>other.kind===t.kind&&other.text===t.text)===i);
}
