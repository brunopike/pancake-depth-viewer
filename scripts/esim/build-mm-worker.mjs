import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const source=process.argv[2];if(!source)throw Error('Pass the existing esim-daily-ledger/web directory');
const backfill=process.argv[3]==='backfill',entry=backfill?'server-backfill':'server-step',output=backfill?'backfill':'worker';
const inputs={};await mkdir('server/mm-ledger',{recursive:true});
await build({entryPoints:[path.resolve(source,`scripts/${entry}.js`)],outfile:`server/mm-ledger/${output}.mjs`,bundle:true,platform:'node',format:'esm',banner:{js:"import {createRequire as __createRequire} from 'node:module';const require=__createRequire(import.meta.url);"},target:'node22',external:['pg-native'],plugins:[{name:'authoritative-ledger',setup(b){b.onLoad({filter:/\.(?:js|cjs)$/},async args=>{let text=await readFile(args.path,'utf8');if(!args.path.includes('node_modules'))inputs[path.relative(source,args.path)]=createHash('sha256').update(text).digest('hex');if(args.path.endsWith('/lib/collector.js'))text=text.replace("const {createEngine}=createRequire(import.meta.url)('../vendor/engine.cjs');","import {createEngine} from '../vendor/engine.cjs';");return {contents:text,loader:'js'};});}}]});
await writeFile(`server/mm-ledger/${backfill?'backfill-':'source-'}manifest.json`,JSON.stringify({source:'esim-daily-ledger/web',inputs},null,2)+'\n');
