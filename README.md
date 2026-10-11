# Pancake Depth Viewer

A public, read-only PancakeSwap market depth viewer by MMDock.

**[Open the viewer](https://starkweng.github.io/pancake-depth-viewer/)**

Search BNB Chain markets by symbol, token address, or pool address. View the five-column order-book-style price ladder and cumulative AMM liquidity depth of the selected **exact token pair**, aggregated across discovered V2, V3, and Infinity CL pools. Enter a price-range percentage or select Maximum, then choose decimal price precision (0–18 places). Default: ESIM/USDT, Maximum range and eight decimal places (a 0.00000001 base price band). The closest 100 bands stay unmerged, followed by grouped distant bands up to the 500-row limit. Up to 500 rows per side are rendered by merging adjacent bands when necessary; endpoint totals always cover the entire selected range. Hover to inspect a level, click to locate it, export CSV, or copy a URL that preserves the pair and display settings.

## 新手怎么用

1. 点“切换代币”，输入名称。`ESIM / USDT` 表示用 USDT 买卖 ESIM。
2. 输入“价格上下范围”。例如 10%，直接看参考价上下 10% 内的买入、卖出总金额；也可点“最大”看已计入池子的全部范围。
3. 默认 ESIM/USDT、最大范围、8 位小数。4 位小数表示每档价格相差 0.0001，2 位就是 0.01。档数自动计算，最多每侧 500 行；最近的 100 档保留，其余合并，范围总额保持完整。
4. 卖盘红色在上，买盘绿色在下，两侧从最接近现价的档位开始。表格显示价格、币量、累计币量、价值 U、累计价值 U；U 表示 USDT，非 USDT 市场显示实际计价币。输入“定位价格”后点“跳转”，滚动并高亮包含该价格的行。点击一行查看完整数字。
5. 点“查看数据明细”了解哪些池子计入，点“怎么看这些数据？”查看解释。点“复制分享链接”保留当前设置，或“下载表格”保存 CSV 文件。

“池子”是用于买卖两种币的一组资金。页面金额根据池内资金估算，未计入交易费用等影响；实际买卖金额以交易时的报价为准。大数字用“万”“亿”显示。

## Data and coverage

- **Discovery:** the official PancakeSwap Explorer API, `/api/cached/pools/list`, paginated with `after` / `endCursor`. All listed BNB Chain protocols are queried, including unsupported depth models. Zero-TVL pools are omitted, and TVL-descending pagination stops when it reaches zero. The catalog records start/end timestamps, page count, and completion status. A safety ceiling of 4,000 pages is explicitly reported as incomplete when reached. An exhausted positive-TVL API catalog is not proof of exhaustive on-chain discovery.
- **Depth:** the browser reads public BNB Chain RPC endpoints. All pool state, bitmaps, and ticks in a refresh are pinned to one block. Blast public BSC RPC is tried first: older pinned-block contract reads were runtime-verified; other public nodes are fallbacks and may reject historical state. Bitmap reads use bounded chunks of 512 calls, with at most three chunks and three pools in parallel. Failed multicall items are retried individually at the same block. V2 reads actual reserves; V3 and Infinity CL read current price, liquidity, bitmap words and initialized ticks across the selected price range. Token identity and Infinity PoolKey are checked on-chain.
- **Refresh:** GitHub Actions attempts a catalog update and Pages publication hourly. Scheduling is best effort. Code-only deployments retain a newer published catalog when available, rather than replacing it with the repository seed. The app exposes the actual catalog time; the optional 60-second update and manual refresh read live chain state. GitHub Pages requires no user API key or wallet.
- **Scope:** direct pools for the same two token contract addresses. Different quote currencies, multihop routes, other exchanges and other chains are separate markets. Same-symbol tokens are not merged.
- **Partial coverage:** unsupported Infinity Bin / StableSwap models and failed RPC reads remain visible in the pool details and are excluded from totals. Nothing is replaced with demo liquidity.

## Calculation

The reference price is taken from the successfully read pool with the largest indexed TVL. Percentage endpoints use `reference × (1 ± percent / 100)` with a lower floor of zero. Decimal price bands align to multiples of `10^(-precision)`; the last partial band reaches the exact percentage endpoint. Row grouping changes presentation, not endpoint totals. Each pool is integrated from its own current price to that common boundary, with liquidity changes applied at initialized ticks. When pool prices differ, the first level includes each pool's available increment to the common boundary.

Maximum reads all CL bitmap words between protocol minimum and maximum ticks, validates that active liquidity returns to zero at both ends, and takes the outer initialized ticks as finite CL endpoints. Read failures and excessive tick counts remain explicit exclusions. V2 has no finite upper price or buy-quote total: the maximum buy quantity tends to the base reserve, while the maximum sell-quote amount tends to the quote reserve as price approaches zero and input quantity tends to infinity. These asymptotes are theoretical, not executable at the endpoints. Infinite endpoints are included in totals/table/CSV but omitted from the chart; very wide price axes are compressed. Legacy `levels`/`bps` URLs preserve their old percentage (`levels*bps/100`), while new links use `range` and `precision`.

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

`npm test` checks constant-product conservation, inverse token order, mixed token decimals, CL interval deltas, upward/downward tick crossing, empty-liquidity intervals, common price aggregation, grouping invariance, decimal-band alignment, exact percentage endpoints, distant CL gaps in maximum mode, V2 asymptotes and invalid settings. Publication and browser checks are recorded separately; a passing build alone does not establish API/RPC availability.
