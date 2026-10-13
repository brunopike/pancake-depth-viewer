// User-confirmed classifications apply to cached snapshots and future reports.
export const CONFIRMED_HOLDER_LABELS = {
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
