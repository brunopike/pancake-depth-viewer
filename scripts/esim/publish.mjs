import {auxiliaryFile} from '../../server/esim/auxiliary-health.mjs';
import {loadSharedRegistry} from '../../server/esim/shared-data.mjs';
import { readFile } from 'node:fs/promises';
import { readState } from '../../server/esim/store.mjs';
import { buildReport } from '../../server/esim/metrics.mjs';
import { buildAddressReport } from '../../server/esim/addresses.mjs';
import {isSourceInflowAligned} from '../../server/esim/source-inflows.mjs';
import {readArchiveViews} from '../../server/esim/archive-views.mjs';
import {publishReportFiles} from './publish-report-files.mjs';
import { PROJECT_REPOSITORY,projectRepository } from '../../server/esim/repository.mjs';
const token = process.env.GITHUB_TOKEN;
const repo = projectRepository(process.env.GITHUB_REPOSITORY || PROJECT_REPOSITORY);
if ((!token&&process.env.ESIM_GIT_PUBLISH!=='true') || !repo) throw new Error('Invalid publication configuration');
const bytes = await readFile('.goodway/esim-monitor/state.json.gz');
const prepared=await readArchiveViews(bytes);
if(!prepared&&process.env.ESIM_PERSISTENT_WORKER==='true')throw Error('VM_ARCHIVE_VIEWS_UNAVAILABLE');
const state=prepared?.state||await readState('.goodway/esim-monitor/state.json.gz');
if(!prepared)await loadSharedRegistry();
const now=Date.now()/1000,report=prepared?.report||buildReport(state,now);
if(!isSourceInflowAligned(report.sourceInflow,report))throw Error('SOURCE_INFLOW_NOT_SYNCHRONIZED');
const addresses=prepared?.addresses||buildAddressReport(state,now);
console.log(JSON.stringify({phase:'archive-views',prepared:!!prepared,block:state.block}));
const commit=await publishReportFiles([
 auxiliaryFile('archive',state.block,state.cutoff,prepared?.counts||{trades:state.trades.length,distributions:state.distributions.length}),
 ['state.json.gz',bytes],
 ['report.json',JSON.stringify(report)],
 ['addresses.json',JSON.stringify(addresses)],
],{message:`Verified ESIM checkpoint at block ${state.block}`,
 skip:prior=>prior.block>state.block||prior.block===state.block&&isSourceInflowAligned(prior.sourceInflow,prior)});
console.log(commit?`Published verified ESIM checkpoint at block ${state.block}.`:'ESIM checkpoint already current.');
