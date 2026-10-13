import { readFile, writeFile, rename } from 'node:fs/promises';
import { configuredCatalog } from '../src/background-markets.mjs';

// Local filtering only. No all-chain API pagination or RPC calls.
const path = 'public/data/catalog.json';
const catalog = JSON.parse(await readFile(path, 'utf8'));
const config = JSON.parse(await readFile('public/data/background-markets.json', 'utf8'));
const selected = configuredCatalog(catalog, config);
await writeFile('public/data/catalog.tmp', JSON.stringify(selected));
await rename('public/data/catalog.tmp', path);
console.log(`Directory: ${selected.markets.length} configured pairs, ${selected.pools.length} pools; no network requests`);
