import { readFile, writeFile, rename } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';

// Code-only deployments retain a newer catalog produced by the scheduled refresh.
const path = 'public/data/catalog.json';
const seed = JSON.parse(await readFile(path, 'utf8'));
try {
  const response = await fetch('https://starkweng.github.io/pancake-depth-viewer/data/catalog.json.gz', {
    cache: 'no-cache', signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`Published catalog HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const data = bytes[0] === 31 && bytes[1] === 139 ? gunzipSync(bytes) : bytes;
  const published = JSON.parse(data.toString());
  if (published.chainId !== 56 || !Array.isArray(published.pools) || !published.pools.length) {
    throw new Error('Invalid published catalog');
  }
  if (Date.parse(published.fetchedAt) > Date.parse(seed.fetchedAt)) {
    await writeFile('public/data/catalog.tmp', data);
    await rename('public/data/catalog.tmp', path);
    console.log(`Retained published catalog: ${published.pools.length} pools, ${published.fetchedAt}`);
  } else {
    console.log(`Using committed catalog: ${seed.pools.length} pools, ${seed.fetchedAt}`);
  }
} catch (error) {
  console.warn(`${error.message}; using committed catalog dated ${seed.fetchedAt}`);
}
