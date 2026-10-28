import {loadSharedRegistry} from '../../server/esim/shared-data.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';import {gunzipSync,gzipSync} from 'node:zlib';
import {TOKEN,SOURCE} from '../../server/esim/metrics.mjs';
import {makeRpc} from '../../server/esim/rpc.mjs';import {readHolderBalances} from '../../server/esim/holders.mjs';
import {PCS,UNI,VAULT,TRANSFER,addr,order,eventKey} from '../../server/esim/attribution.mjs';import {cohortBalances} from '../../server/esim/cohort-balances.mjs';
import {collectReturnStakes} from '../../server/esim/return-stakes.mjs';import {buildContractCohort} from '../../server/esim/contract-cohort.mjs';import {validCohort} from '../../server/esim/cohort-validation.mjs';
import {publishReportFiles} from './publish-report-files.mjs';
import {buildExternalCohort} from '../../server/esim/external-cohort.mjs';
try{
 await loadSharedRegistry();
 const read=async file=>JSON.parse(gunzipSync(await readFile(file))),state=await read(process.env.ESIM_CHECKPOINT_FILE),p=await read(process.env.ESIM_FLOW_CHECKPOINT_FILE);
 if(p.version!==1||p.token!==TOKEN||p.source!==SOURCE||state.token!==TOKEN||state.source!==SOURCE||p.throughBlock>state.block)throw Error('COHORT_CORE_BEHIND');
 const s=state;
 const holders=JSON.parse(await readFile(process.env.ESIM_HOLDERS_FILE,'utf8'));if(holders.version!==1||holders.token!==TOKEN||!Array.isArray(holders.rows)||holders.rows.length>50000||holders.rows.some(r=>!/^0x[0-9a-f]{40}$/.test(r.address)))throw Error('COHORT_INVALID_HOLDER_UNIVERSE');
 const markets=[PCS,UNI,VAULT,...Object.keys(s.pools).filter(a=>a.length===42)],t=makeRpc({budget:1200,timeoutMs:1200000,cacheDir:'.goodway/claim-flow/rpc-cache',progress:e=>{if(e.phase!=='rpc'||e.physical%20===0)console.log(JSON.stringify(e));}}),hex=n=>'0x'+n.toString(16);
 const [chain,start,end,target]=await t.batch([['eth_chainId',[]],['eth_getBlockByNumber',[hex(p.openingBlock),false]],['eth_getBlockByNumber',[hex(p.throughBlock),false]],['eth_getBlockByNumber',[hex(s.block),false]]],{fresh:true});
 if(chain!=='0x38'||start.hash!==p.openingBlockHash||end.hash!==p.blockHash||target.hash!==s.blockHash)throw Error('COHORT_CHAIN_CHANGED');
 const queries=[];for(let b=p.throughBlock+1;b<=s.block;b+=3000)queries.push(['eth_getLogs',[{address:TOKEN,topics:[TRANSFER],fromBlock:hex(b),toBlock:hex(Math.min(b+2999,s.block))}]]);
 const raw=(await t.batch(queries)).flat();if(raw.some(e=>e.removed||e.address.toLowerCase()!==TOKEN||e.topics[0]!==TRANSFER||e.topics.length!==3||order(e)[0]<=p.throughBlock||order(e)[0]>s.block))throw Error('COHORT_INVALID_LOGS');
 const added=raw.map(e=>({id:eventKey(e),tx:e.transactionHash,blockHash:e.blockHash,order:order(e),from:addr(e.topics[1]),to:addr(e.topics[2]),value:BigInt(e.data).toString()})),transfers=[...p.transfers,...added];
 if(transfers.length>1500000||new Set(transfers.map(e=>e.id)).size!==transfers.length)throw Error('COHORT_TRANSFER_LIMIT_OR_DUPLICATE');
 const distributions=new Map(transfers.filter(e=>e.from===SOURCE&&BigInt(e.value)>0n).map(e=>[e.id,e]));if(distributions.size!==s.distributions.length||s.distributions.some(d=>{const e=distributions.get(d.id);return !e||e.to!==d.recipient||e.value!==d.value;}))throw Error('COHORT_DISTRIBUTION_MISMATCH');
 const opening={...p.openingBalances},newAddresses=[...new Set(added.flatMap(e=>[e.from,e.to]))].filter(a=>a!==SOURCE&&a!=='0x0000000000000000000000000000000000000000'&&!markets.includes(a)&&!Object.hasOwn(opening,a));
 const initial=await readHolderBalances(newAddresses,hex(p.openingBlock),t);newAddresses.forEach((a,i)=>opening[a]=initial[i]);
 const balances=cohortBalances({source:s.source,marketAddresses:markets,openingBalances:opening,transfers});
 const missing=[...new Set([...s.calls.map(c=>c.from),...holders.rows.map(r=>r.address)])].filter(a=>!Object.hasOwn(balances.closingBalances,a)&&a!==s.source&&!markets.includes(a));
 const additional=await readHolderBalances(missing,hex(s.block),t);missing.forEach((a,i)=>balances.closingBalances[a]=additional[i]);
 console.log(JSON.stringify({phase:'cohort-balance-ledger',block:s.block,addresses:Object.keys(balances.closingBalances).length}));
 const returns=await collectReturnStakes(transfers,t,{previous:p.returnProof,progress:e=>console.log(JSON.stringify(e))});
 const inputs={state:s,transfers,marketAddresses:markets,openingBalances:opening,...balances,returnStakes:returns.rows};
 const cohort=buildContractCohort(inputs);cohort.external=buildExternalCohort(inputs,holders.rows);
 const addresses=Object.keys(balances.closingBalances),live=await readHolderBalances(addresses,hex(s.block),t);if(addresses.some((a,i)=>balances.closingBalances[a]!==live[i]))throw Error('COHORT_CLOSING_MISMATCH');
 const after=await t.rpc('eth_getBlockByNumber',[hex(s.block),false],{fresh:true});if(after.hash!==s.blockHash||!validCohort(cohort,cohort))throw Error('COHORT_INVALID');
 cohort.sourceAllocation='proportional-origin-pool-v1';
 await mkdir('.goodway/cohort',{recursive:true});await writeFile('.goodway/cohort/cohort.json',JSON.stringify(cohort));
 for(let attempt=0;attempt<3;attempt++)try{await publishReportFiles([['cohort.json.gz',gzipSync(JSON.stringify(cohort))]],{message:`Verify external ESIM wallet balances at block ${cohort.throughBlock}`,skip:prior=>prior&&prior.external?.scopeRevision===2&&prior.throughBlock>=cohort.throughBlock});break;}catch(e){if(attempt===2||e.message!=='CHECKPOINT_PUBLISH_PUSH_FAILED')throw e;}
 const {rows,external,...summary}=cohort,{rows:externalRows,...externalSummary}=external;console.log(JSON.stringify({phase:'cohort-published',...summary,external:externalSummary,rpc:t.stats}));
}catch(e){console.error('COHORT_REFRESH_FAILED',/^[A-Z_]+$/.test(e.message)?e.message:'QUERY_FAILED');process.exitCode=1;}
