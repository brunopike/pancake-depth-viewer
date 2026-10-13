import { build } from 'esbuild';
import { mkdir, cp, copyFile, readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
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
await writeFile('dist/data/catalog.json.gz', gzipSync(await readFile('public/data/catalog.json')));
console.log('Built dist/');
