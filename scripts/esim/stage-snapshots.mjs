import {readFile,writeFile} from 'node:fs/promises';
import {validSnapshot,newerSnapshot} from '../../src/snapshot-client.mjs';
import {parseState} from '../../server/esim/store.mjs';
import {buildReport} from '../../server/esim/metrics.mjs';
// Only public, verified ESIM JSON is copied. Checkpoint state and credentials stay out of dist.
for(const [kind,source]of [['report','.goodway/pages-report/report.json'],['addresses','.goodway/pages-report/addresses.json'],['holders','.goodway/pages-holders/holders.json']]){
 const latest=JSON.parse(await readFile(source,'utf8'));
 const bundled=JSON.parse(await readFile(`dist/data/esim-${kind}.json`,'utf8'));
 if(!validSnapshot(kind,latest)||!validSnapshot(kind,bundled))throw Error(`INVALID_${kind.toUpperCase()}_SNAPSHOT`);
 let selected=newerSnapshot(bundled,latest);
 if(kind==='report'){
  const state=parseState(await readFile('.goodway/pages-report/state.json.gz'));
  if(state.block===selected.block){
   const enriched=buildReport(state,selected.generatedAt);
   for(const key of ['today','yesterday','history'])if(JSON.stringify(enriched.windows[key].groups)!==JSON.stringify(selected.windows[key].groups))throw Error('REPORT_TOTALS_CHANGED');
   selected=enriched;
  }
 }
 await writeFile(`dist/data/current-esim-${kind}.json`,JSON.stringify(selected));
 console.log(`${kind}: verified block ${selected.block}`);
}
