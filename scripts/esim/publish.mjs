import { readFile } from 'node:fs/promises';
import { parseState } from '../../server/esim/store.mjs';
import { buildReport } from '../../server/esim/metrics.mjs';
import { buildAddressReport } from '../../server/esim/addresses.mjs';
import {isSourceInflowAligned} from '../../server/esim/source-inflows.mjs';
import {publishReportFiles} from './publish-report-files.mjs';
import { PROJECT_REPOSITORY,projectRepository } from '../../server/esim/repository.mjs';
const token = process.env.GITHUB_TOKEN;
const repo = projectRepository(process.env.GITHUB_REPOSITORY || PROJECT_REPOSITORY);
if ((!token&&process.env.ESIM_GIT_PUBLISH!=='true') || !repo) throw new Error('Invalid publication configuration');
const bytes = await readFile('.goodway/esim-monitor/state.json.gz');
const state = parseState(bytes);
const report=buildReport(state);
if(!isSourceInflowAligned(report.sourceInflow,report))throw Error('SOURCE_INFLOW_NOT_SYNCHRONIZED');
const commit=await publishReportFiles([
 ['state.json.gz',bytes],
 ['report.json',JSON.stringify(report)],
 ['addresses.json',JSON.stringify(buildAddressReport(state))],
],{message:`Verified ESIM checkpoint at block ${state.block}`,
 skip:prior=>prior.block>state.block||prior.block===state.block&&isSourceInflowAligned(prior.sourceInflow,prior)});
console.log(commit?`Published verified ESIM checkpoint at block ${state.block}.`:'ESIM checkpoint already current.');
