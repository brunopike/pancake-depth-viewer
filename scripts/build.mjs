import { build } from 'esbuild';
import { mkdir, cp, copyFile, readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { configuredCatalog } from '../src/background-markets.mjs';
await mkdir('dist', { recursive: true });
await cp('public', 'dist', { recursive: true });
await build({ entryPoints: ['src/app.js'], bundle: true, minify: true, sourcemap: true,
  outfile: 'dist/app.js', target: ['es2022'], format: 'esm', legalComments: 'eof' });
await copyFile('src/style.css', 'dist/style.css');
let html = await readFile('index.html', 'utf8');
for (const file of ['app.js', 'style.css']) {
  const version = createHash('sha256').update(await readFile(`dist/${file}`)).digest('hex').slice(0, 12);
  html = html.replace(`"./${file}"`, `"./${file}?v=${version}"`);
}
await writeFile('dist/index.html', html);
await build({ entryPoints: ['src/esim.js'], bundle: true, minify: true, outfile: 'dist/esim.js', target: ['es2022'], format: 'esm' });
await copyFile('src/esim.css', 'dist/esim.css');
let reportHTML = await readFile('esim.html', 'utf8');
for (const file of ['esim.js', 'esim.css']) {
  const version = createHash('sha256').update(await readFile(`dist/${file}`)).digest('hex').slice(0, 12);
  reportHTML = reportHTML.replace(`"./${file}"`, `"./${file}?v=${version}"`);
}
await writeFile('dist/esim.html', reportHTML);
await build({ entryPoints: ['src/esim-addresses.js'], bundle: true, minify: true, outfile: 'dist/esim-addresses.js', target: ['es2022'], format: 'esm' });
let addressHTML = await readFile('esim-addresses.html', 'utf8');
for (const file of ['esim-addresses.js', 'esim.css']) {
  const version = createHash('sha256').update(await readFile(`dist/${file}`)).digest('hex').slice(0, 12);
  addressHTML = addressHTML.replace(`"./${file}"`, `"./${file}?v=${version}"`);
}
await writeFile('dist/esim-addresses.html', addressHTML);
const catalog = configuredCatalog(JSON.parse(await readFile('public/data/catalog.json', 'utf8')),
  JSON.parse(await readFile('public/data/background-markets.json', 'utf8')));
const catalogJSON = JSON.stringify(catalog);
await writeFile('dist/data/catalog.json', catalogJSON);
await writeFile('dist/data/catalog.json.gz', gzipSync(catalogJSON));
console.log('Built dist/');
