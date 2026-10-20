import { readFile } from 'node:fs/promises';
import { parseState } from '../../server/esim/store.mjs';
import { buildReport } from '../../server/esim/metrics.mjs';
import { buildAddressReport } from '../../server/esim/addresses.mjs';
import { PROJECT_REPOSITORY,projectRepository } from '../../server/esim/repository.mjs';
const token = process.env.GITHUB_TOKEN;
const repo = projectRepository(process.env.GITHUB_REPOSITORY || PROJECT_REPOSITORY);
if (!token || !repo) throw new Error('Invalid publication configuration');
const bytes = await readFile('.goodway/esim-monitor/state.json.gz');
const state = parseState(bytes);
const root = `https://api.github.com/repos/${repo}/git`;
async function api(path, body, method = body ? 'POST' : 'GET') {
  const r = await fetch(`${root}/${path}`, { method, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60000) });
  if (r.status === 404 && method === 'GET') return null;
  if (!r.ok) throw new Error(`GitHub publication failed (${r.status})`);
  return r.json();
}
const ref = await api('ref/heads/esim-cache');
const previous = ref ? await api(`commits/${ref.object.sha}`) : null;
if (ref) {
  const old = await fetch('https://raw.githubusercontent.com/brunopike/pancake-depth-viewer/esim-cache/report.json', { signal: AbortSignal.timeout(15000) });
  if (old.ok && (await old.json()).block >= state.block) { console.log('ESIM checkpoint already current.'); process.exit(0); }
}
const files = [ ['state.json.gz', bytes.toString('base64'), 'base64'], ['report.json', JSON.stringify(buildReport(state)), 'utf-8'], ['addresses.json', JSON.stringify(buildAddressReport(state)), 'utf-8'] ];
const entries = [];
for (const [path, content, encoding] of files) {
  const blob = await api('blobs', { content, encoding });
  entries.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
}
const tree = await api('trees', { ...(previous ? { base_tree: previous.tree.sha } : {}), tree: entries });
const commit = await api('commits', { message: `Verified ESIM checkpoint at block ${state.block}`, tree: tree.sha, parents: ref ? [ref.object.sha] : [] });
if (ref) await api('refs/heads/esim-cache', { sha: commit.sha, force: false }, 'PATCH');
else await api('refs', { ref: 'refs/heads/esim-cache', sha: commit.sha });
console.log(`Published verified ESIM checkpoint at block ${state.block}.`);
