# Pancake Depth Viewer

A public, read-only PancakeSwap market depth viewer by MMDock.

**[Open the viewer](https://starkweng.github.io/pancake-depth-viewer/)**

Search BNB Chain markets by symbol, token address, or pool address. View the price ladder and cumulative AMM liquidity depth of the selected **exact token pair**, aggregated across discovered V2, V3, and Infinity CL pools. Set 20–500 levels per side and 0.1–1000 basis points per price level (total range below 99%). Default: 100 levels per side, 10 bps per level. Hover to inspect a level, click to locate it, export CSV, or copy a URL that preserves the pair and display settings.

## 新手怎么用

1. 点“切换代币”，输入名称。`ESIM / USDT` 表示用 USDT 买卖 ESIM。
2. 设“显示档数”和“每档价格间隔”。例如 100 档、10 bps：买入和卖出各看 100 行，每档相差参考价的 0.1%，总范围为参考价上下 10%。
3. 看绿色的卖出金额、红色的买入金额。“这一档金额”只看这一段价格；“合计金额”是从第 1 档加到当前这一档。点击一行可以查看具体数字。
4. 点“查看数据明细”了解哪些池子计入，点“怎么看这些数据？”查看解释。点“复制分享链接”保留当前设置，或“下载表格”保存 CSV 文件。

“池子”是用于买卖两种币的一组资金。页面金额根据池内资金估算，未计入交易费用等影响；实际买卖金额以交易时的报价为准。大数字用“万”“亿”显示。

## Data and coverage

- **Discovery:** the official PancakeSwap Explorer API, `/api/cached/pools/list`, paginated with `after` / `endCursor`. All listed BNB Chain protocols are queried, including unsupported depth models. Zero-TVL pools are omitted, and TVL-descending pagination stops when it reaches zero. The catalog records start/end timestamps, page count, and completion status. A safety ceiling of 4,000 pages is explicitly reported as incomplete when reached. An exhausted positive-TVL API catalog is not proof of exhaustive on-chain discovery.
- **Depth:** the browser reads public BNB Chain RPC endpoints. All pool state, bitmaps, and ticks in a refresh are pinned to one block. V2 reads actual reserves; V3 and Infinity CL read current price, liquidity, bitmap words and initialized ticks across the selected price range. Token identity and Infinity PoolKey are checked on-chain.
- **Refresh:** GitHub Actions attempts a catalog update and Pages publication hourly. Scheduling is best effort. Code-only deployments retain a newer published catalog when available, rather than replacing it with the repository seed. The app exposes the actual catalog time; the optional 60-second update and manual refresh read live chain state. GitHub Pages requires no user API key or wallet.
- **Scope:** direct pools for the same two token contract addresses. Different quote currencies, multihop routes, other exchanges and other chains are separate markets. Same-symbol tokens are not merged.
- **Partial coverage:** unsupported Infinity Bin / StableSwap models and failed RPC reads remain visible in the pool details and are excluded from totals. Nothing is replaced with demo liquidity.

## Calculation

The reference price is taken from the successfully read pool with the largest indexed TVL. Level `i` uses `reference × (1 ± i × bps / 10,000)`. Each pool is integrated from its own current price to that common boundary, with liquidity changes applied at initialized ticks. When pool prices differ, the first level includes each pool's available increment to the common boundary.

For a constant-liquidity CL interval, the absolute token deltas are `L × |1/s₀ − 1/s₁|` and `L × |s₁ − s₀|`, where `s` is the square-root raw token price. Decimals are applied separately. A V2 endpoint uses `x' = √(k/P)` and `y' = √(kP)`. Incremental levels are differences of cumulative totals.

The raw state and liquidity changes use BigInt; chart quantities are floating-point display estimates. Amounts **exclude LP/protocol fees, gas, transfer taxes, hook behavior and routing effects**. They are a static liquidity view, not an executable quote, guaranteed fill or defense budget. Hooked/dynamic-fee pools are identified in the pool details.

## Run locally

Requires Node.js 22+ and Python 3 for the simple preview server.

```sh
npm ci
npm run catalog
npm test
npm run build
npm run serve
```

Open `http://127.0.0.1:4316`. The project uses vanilla HTML/CSS/JS, Canvas, viem and esbuild. No app server, private credentials, wallet SDK, order execution or database is included.

## Sources

- [Official API usage examples](https://github.com/pancakeswap/pancakeswap-ai)
- [PancakeSwap developer documentation](https://developer.pancakeswap.finance/apis/subgraph)
- [Infinity core](https://github.com/pancakeswap/infinity-core)
- [Infinity SDK manager addresses](https://www.npmjs.com/package/@pancakeswap/infinity-sdk)
- [V3 pool contract](https://developer.pancakeswap.finance/contracts/v3/pancakev3pool)

## Validation

`npm test` checks constant-product conservation, inverse token order, mixed token decimals, CL interval deltas, upward/downward tick crossing, empty-liquidity intervals, common price aggregation, grouping invariance and invalid range protection. Publication and browser checks are recorded separately; a passing build alone does not establish API/RPC availability.
