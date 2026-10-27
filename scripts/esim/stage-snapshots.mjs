import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {validSnapshot,newerSnapshot} from '../../src/snapshot-client.mjs';
import {parseState,attachClaimFlow,validClaimFlow} from '../../server/esim/store.mjs';
import {buildReport} from '../../server/esim/metrics.mjs';
import {buildAddressReport} from '../../server/esim/addresses.mjs';
let flow=null;try{flow=JSON.parse(gunzipSync(await readFile('.goodway/pages-report/claim-flow.json.gz')));}catch{try{flow=JSON.parse(await readFile('.goodway/pages-report/claim-flow.json','utf8'));}catch{}}
// Only public, verified ESIM JSON is copied. Checkpoint state and credentials stay out of dist.
for(const [kind,source]of [['report','.goodway/pages-report/report.json'],['addresses','.goodway/pages-report/addresses.json'],['holders','.goodway/pages-holders/holders.json']]){
 const latest=JSON.parse(await readFile(source,'utf8'));
 const bundled=JSON.parse(await readFile(`dist/data/esim-${kind}.json`,'utf8'));
 if(!validSnapshot(kind,latest)||!validSnapshot(kind,bundled))throw Error(`INVALID_${kind.toUpperCase()}_SNAPSHOT`);
 let selected=newerSnapshot(bundled,latest);
 if(kind==='report'||kind==='addresses'){
  const state=attachClaimFlow(parseState(await readFile('.goodway/pages-report/state.json.gz')),flow);
  if(state.block===selected.block){
   const enriched=kind==='report'?buildReport(state,selected.generatedAt):buildAddressReport(state,selected.generatedAt);
   if(kind==='report')for(const key of ['today','yesterday','history'])if(JSON.stringify(enriched.windows[key].groups)!==JSON.stringify(selected.windows[key].groups))throw Error('REPORT_TOTALS_CHANGED');
   selected=enriched;
  }
 }
 if(kind==='holders'&&validClaimFlow(selected,flow)){
  const relay=new Set(flow.sales.filter(t=>t.timestamp<=selected.cutoff&&BigInt(t.relay_wei)>0n).map(t=>t.address));
  selected={...selected,rows:selected.rows.map(r=>relay.has(r.address)&&!r.tags.some(t=>t.id==='received-relay-sold')?{...r,tags:[...r.tags,{id:'received-relay-sold',text:'分发币转手卖出（估算）',kind:'sold',evidence:'分发币转手路径与卖出成交已识别；混币按余额比例估算，不证明共同控制。'}]}:r)};
 }
 await writeFile(`dist/data/current-esim-${kind}.json`,JSON.stringify(selected));
 console.log(`${kind}: verified block ${selected.block}`);
}
