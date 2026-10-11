# Pancake Depth Viewer

A public, read-only PancakeSwap market depth viewer by MMDock.

**[Open the viewer](https://starkweng.github.io/pancake-depth-viewer/)**

Search BNB Chain markets by symbol, token address, or pool address. View the five-column order-book-style price ladder and cumulative AMM liquidity depth of the selected **exact token pair**, aggregated across discovered V2, V3, and Infinity CL pools. Enter a price-range percentage or select Maximum, then choose decimal price precision (0–18 places). Default: ESIM/USDT, a ±50% price range and four decimal places (a 0.0001 base price band). The closest 100 bands stay unmerged, followed by grouped distant bands up to the 500-row limit. Up to 500 rows per side are rendered by merging adjacent bands when necessary; endpoint totals always cover the entire selected range. Hover to inspect a level or enter a price to locate it. The address bar preserves the pair and display settings.

## 新手怎么用

1. 点“切换代币”，输入名称。`ESIM / USDT` 表示用 USDT 买卖 ESIM。
2. 顶部显示全池的两种币：卖盘是 ESIM 数量，买盘是用于买入的 USDT 数量。统计全部价格范围中的交易资金，不随图表范围变化，未含 CL 未领取的手续费。
3. 输入“目标价格估算”后点“算一算”。高于现价：看预计需付多少 USDT、买到多少 ESIM。低于现价：看需卖出多少 ESIM、预计换回多少 USDT。目标价不受图表显示范围限制；没有流动性的池子会提示。
4. 输入“价格上下范围”控制表格和曲线。例如 10%，看参考价上下 10% 内的买卖数量和金额；也可点“最大”看现价的 0.5～2 倍范围。
5. 默认 ESIM/USDT、上下 50%、4 位小数。4 位小数表示每档价格相差 0.0001，2 位就是 0.01。档数自动计算，最多每侧 500 行；最近的 100 档保留，其余合并，范围总额保持完整。
6. 卖盘红色在上，买盘绿色在下，卖盘从高到低排列，最下面最接近现价；买盘从高到低排列，最上面最接近现价。表格显示价格、币量、累计币量、价值 U、累计价值 U；U 表示 USDT，非 USDT 市场显示实际计价币。输入“定位价格”后点“跳转”，滚动并高亮包含该价格的行。点击一行查看完整数字。输入的定位价格会单独成为一档，总金额保持不变。
7. 点“查看数据明细”了解哪些池子计入，点“怎么看这些数据？”查看解释。

“池子”是用于买卖两种币的一组资金。页面金额根据当前池内资金估算，未计入交易费用等影响；实际买卖金额以交易时的报价为准。大数字用“万”“亿”或科学计数显示。

## Data and coverage

- **Discovery:** the official PancakeSwap Explorer API, `/api/cached/pools/list`, paginated with `after` / `endCursor`. All listed BNB Chain protocols are queried, including unsupported depth models. Zero-TVL pools are omitted, and TVL-descending pagination stops when it reaches zero. The catalog records start/end timestamps, page count, and completion status. A safety ceiling of 4,000 pages is explicitly reported as incomplete when reached. An exhausted positive-TVL API catalog is not proof of exhaustive on-chain discovery.
- **Depth:** the browser reads public BNB Chain RPC endpoints; the optional private Alchemy worker publishes validated ESIM/USDT chain-state snapshots. All pool state, bitmaps, and ticks in a refresh are pinned to one block. Blast public BSC RPC is tried first: older pinned-block contract reads were runtime-verified; other public nodes are fallbacks and may reject historical state. Bitmap reads use bounded chunks of 512 calls, with at most three chunks and three pools in parallel. Failed multicall items are retried individually at the same block. V2 reads actual reserves; V3 and Infinity CL read current price, liquidity, all bitmap words and initialized ticks, enabling whole-pool inventory and arbitrary target-price estimates. Token identity and Infinity PoolKey are checked on-chain. A first full scan of another market can take longer than a narrow-range scan.
- **Refresh:** first paint uses a timestamped browser/shared/seed cache while a chain refresh runs. Full-range snapshots reuse unchanged initialized ticks, find changed boundaries from Mint/Burn or ModifyLiquidity events and reread those boundaries. Cache identity, canonical block hash and complete-range liquidity are validated; log failures/reorgs trigger a full scan, with a mandatory full scan every six hours. Reads use a block 12 blocks behind the latest head and recheck its hash before publishing. GitHub Actions attempts an Alchemy snapshot every five minutes and a catalog update and Pages publication hourly. Scheduling is best effort. Code-only deployments retain a newer published catalog when available, rather than replacing it with the repository seed. The app exposes the actual catalog time; the optional 60-second update and manual refresh read live chain state. GitHub Pages requires no user API key or wallet.
- **Scope:** direct pools for the same two token contract addresses. Different quote currencies, multihop routes, other exchanges and other chains are separate markets. Same-symbol tokens are not merged.
- **Partial coverage:** unsupported Infinity Bin / StableSwap models and failed RPC reads remain visible in the pool details and are excluded from totals. Nothing is replaced with demo liquidity.

## Calculation

The reference price is taken from the successfully read pool with the largest indexed TVL. Percentage endpoints use `reference × (1 ± percent / 100)` with a lower floor of zero. Decimal price bands align to multiples of `10^(-precision)`; the last partial band reaches the exact percentage endpoint. Row grouping changes presentation, not endpoint totals. Each pool is integrated from its own current price to that common boundary, with liquidity changes applied at initialized ticks. When pool prices differ, the first level includes each pool's available increment to the common boundary.

Maximum displays prices from 0.5 to 2 times the current reference price. This finite viewing window is separate from full-range chain caching, which reads all CL bitmap words and validates that active liquidity returns to zero at both ends. The underlying V2 curve still has theoretical asymptotes; these do not define the default viewing window. Price focus inserts the exact requested boundary into the selected range, integrating it directly and preserving endpoint totals and the 500-row limit. Legacy `levels`/`bps` URLs preserve their old percentage (`levels*bps/100`), while new links use `range` and `precision`.

For a constant-liquidity CL interval, the absolute token deltas are `L × |1/s₀ − 1/s₁|` and `L × |s₁ − s₀|`, where `s` is the square-root raw token price. Decimals are applied separately. A V2 endpoint uses `x' = √(k/P)` and `y' = √(kP)`. Each displayed band is integrated directly, then added to cumulative totals. This avoids subtracting huge cumulative values and losing a tiny remaining token quantity.

The raw state and liquidity changes use BigInt; chart quantities are floating-point display estimates. Amounts **exclude LP/protocol fees, gas, transfer taxes, hook behavior and routing effects**. They are a static liquidity view, not an executable quote, guaranteed fill or defense budget. Hooked/dynamic-fee pools are identified in the pool details.

Whole-pool inventory uses V2 reserves and the CL principal represented by all initialized intervals: remaining base tokens above the current price plus remaining quote tokens below it, adjusted for token order and decimals. Accrued CL fees are separate and excluded. Infinity manager/vault token balances cannot identify the assets of one pool and are not used for this calculation. Only successfully read supported pools count; the coverage is shown beside each total.

Target-price estimates integrate each eligible pool from its own current price to the common requested price, independent of chart range and row grouping. Upward moves sum quote paid and base received; downward moves sum base sold and quote received. A pool already beyond the target in that direction contributes zero. The result flags CL pools with no active liquidity at the target and rejects targets outside protocol bounds. It does not simulate external arbitrage, future liquidity changes or execution order.

## Run locally

Requires Node.js 22+ and Python 3 for the simple preview server.

```sh
npm ci
npm run catalog
npm test
npm run build
npm run serve
```

Open `http://127.0.0.1:4316`. The project uses vanilla HTML/CSS/JS, Canvas, viem and esbuild. The public app has no wallet SDK, order execution or database. Private Alchemy credentials are used only by the Actions worker and never included in the browser bundle.

## Optional Alchemy refresh

1. In this repository, open **Settings → Secrets and variables → Actions → New repository secret**.
2. Name: `ALCHEMY_API_KEY`. Paste the API Key of an existing Alchemy app that supports BNB Mainnet, then save it. Do not put the key in code, URLs, issues or chat.
3. In **Actions → Refresh shared ESIM depth**, click **Run workflow**. Success should publish `esim-usdt.json` on the `depth-cache` branch with `source: Alchemy` and every supported pool included.

The worker uses `https://bnb-mainnet.g.alchemy.com/v2/<private-key>` on the server. Only public chain state is published. Missing credentials, failed reads or invalid snapshots preserve the previous snapshot. Scheduling is best effort; the page always shows the actual chain timestamp. The five-minute shared cache does not provide real-time streaming. Other pairs refresh through public RPC. This setup uses the existing account and does not change plans or spending limits.

## Sources

- [Official API usage examples](https://github.com/pancakeswap/pancakeswap-ai)
- [PancakeSwap developer documentation](https://developer.pancakeswap.finance/apis/subgraph)
- [Infinity core](https://github.com/pancakeswap/infinity-core)
- [Infinity SDK manager addresses](https://www.npmjs.com/package/@pancakeswap/infinity-sdk)
- [Alchemy BNB Mainnet API](https://www.alchemy.com/docs/bnb-smart-chain/bnb-smart-chain-api-overview)
- [V3 pool contract](https://developer.pancakeswap.finance/contracts/v3/pancakev3pool)
- [V3 liquidity and separate fee accounting](https://app.uniswap.org/whitepaper-v3.pdf)

## Validation

`npm test` checks constant-product conservation, inverse token order, mixed token decimals, CL interval deltas, upward/downward tick crossing, empty-liquidity intervals, common price aggregation, grouping invariance, decimal-band alignment, exact percentage endpoints, distant CL gaps in maximum mode, V2 asymptotes, the finite maximum window, exact price focus and extreme-price band precision, incremental position discovery, zero-net initialized ticks, reorg/log failure fallback and snapshot identity/completeness. Inventory and target tests cover full-range principal, display-range invariance, both trading directions, empty target liquidity, per-pool price differences and invalid/incomplete inputs. Independent 70-digit Decimal position-interval checks validate ESIM whole-pool inventory and targets above and below the reference price. Publication and browser checks are recorded separately; a passing build alone does not establish API/RPC availability.
