import {readFile,writeFile,mkdir} from 'node:fs/promises';import {gunzipSync,gzipSync} from 'node:zlib';
import {makeRpc} from '../../server/esim/rpc.mjs';import {readHolderBalances} from '../../server/esim/holders.mjs';
import {PCS,UNI,VAULT} from '../../server/esim/attribution.mjs';import {cohortBalances} from '../../server/esim/cohort-balances.mjs';
import {collectReturnStakes} from '../../server/esim/return-stakes.mjs';import {buildContractCohort} from '../../server/esim/contract-cohort.mjs';import {validCohort} from '../../server/esim/cohort-validation.mjs';
import {publishReportFiles} from './publish-report-files.mjs';
try{
 const read=async file=>JSON.parse(gunzipSync(await readFile(file))),state=await read(process.env.ESIM_CHECKPOINT_FILE),p=await read(process.env.ESIM_FLOW_CHECKPOINT_FILE);
 if(p.throughBlock>state.block)throw Error('COHORT_CORE_BEHIND');
 const s={...state,block:p.throughBlock,blockHash:p.blockHash,cutoff:p.cutoff,calls:state.calls.filter(c=>c.block<=p.throughBlock),distributions:state.distributions.filter(d=>d.block<=p.throughBlock)};
 const markets=[PCS,UNI,VAULT,...Object.keys(s.pools).filter(a=>a.length===42)],t=makeRpc({budget:1200,timeoutMs:1200000,cacheDir:'.goodway/claim-flow/rpc-cache',progress:e=>{if(e.phase!=='rpc'||e.physical%20===0)console.log(JSON.stringify(e));}}),hex=n=>'0x'+n.toString(16);
 const [chain,start,end]=await t.batch([['eth_chainId',[]],['eth_getBlockByNumber',[hex(p.openingBlock),false]],['eth_getBlockByNumber',[hex(p.throughBlock),false]]],{fresh:true});
 if(chain!=='0x38'||start.hash!==p.openingBlockHash||end.hash!==p.blockHash)throw Error('COHORT_CHAIN_CHANGED');
 const balances=cohortBalances({source:s.source,marketAddresses:markets,openingBalances:p.openingBalances,transfers:p.transfers});
 const missing=[...new Set(s.calls.map(c=>c.from))].filter(a=>!Object.hasOwn(balances.closingBalances,a)&&a!==s.source&&!markets.includes(a));
 const added=await readHolderBalances(missing,hex(p.throughBlock),t);missing.forEach((a,i)=>balances.closingBalances[a]=added[i]);
 console.log(JSON.stringify({phase:'cohort-balance-ledger',block:s.block,addresses:Object.keys(balances.closingBalances).length}));
 const returns=await collectReturnStakes(p.transfers,t,{previous:p.returnProof,progress:e=>console.log(JSON.stringify(e))});
 const cohort=buildContractCohort({state:s,transfers:p.transfers,marketAddresses:markets,openingBalances:p.openingBalances,...balances,returnStakes:returns.rows});
 const live=await readHolderBalances(cohort.rows.map(r=>r.address),hex(p.throughBlock),t);if(cohort.rows.some((r,i)=>r.balance_wei!==live[i]))throw Error('COHORT_CLOSING_MISMATCH');
 const after=await t.rpc('eth_getBlockByNumber',[hex(p.throughBlock),false],{fresh:true});if(after.hash!==p.blockHash||!validCohort(cohort,cohort))throw Error('COHORT_INVALID');
 cohort.sourceAllocation='proportional-origin-pool-v1';
 await mkdir('.goodway/cohort',{recursive:true});await writeFile('.goodway/cohort/cohort.json',JSON.stringify(cohort));
 for(let attempt=0;attempt<3;attempt++)try{await publishReportFiles([['cohort.json.gz',gzipSync(JSON.stringify(cohort))]],{message:`Verify ESIM cohort balances and restaking at block ${cohort.throughBlock}`,skip:prior=>prior&&prior.throughBlock>=cohort.throughBlock});break;}catch(e){if(attempt===2||e.message!=='CHECKPOINT_PUBLISH_PUSH_FAILED')throw e;}
 const {rows,...summary}=cohort;console.log(JSON.stringify({phase:'cohort-published',...summary,rpc:t.stats}));
}catch(e){console.error('COHORT_REFRESH_FAILED',/^[A-Z_]+$/.test(e.message)?e.message:'QUERY_FAILED');process.exitCode=1;}
