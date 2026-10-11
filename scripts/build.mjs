import { build } from 'esbuild';
import { mkdir, cp, copyFile, readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
await mkdir('dist', { recursive: true });
await cp('public', 'dist', { recursive: true });
await copyFile('index.html', 'dist/index.html');
await build({ entryPoints: ['src/app.js'], bundle: true, minify: true, sourcemap: true,
  outfile: 'dist/app.js', target: ['es2022'], format: 'esm', legalComments: 'eof' });
await copyFile('src/style.css', 'dist/style.css');
await writeFile('dist/data/catalog.json.gz', gzipSync(await readFile('public/data/catalog.json')));
console.log('Built dist/');
