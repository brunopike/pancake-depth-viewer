import { snapshotName } from '../src/background-markets.mjs';
import { readFile } from 'node:fs/promises';
import {leaseFromEnvironment,requireLease} from '../server/esim/worker-lease.mjs';
const token = process.env.GITHUB_TOKEN, repo = process.env.GITHUB_REPOSITORY;
if (!token || !repo) throw new Error('Missing GitHub publishing environment');
const manifest = JSON.parse(await readFile('.goodway/snapshot-manifest.json', 'utf8'));
if (!manifest.length) { console.log('No new selected-market snapshots to publish.'); process.exit(0); }
const snapshots = [];
for (const item of manifest) {
  if (item.filename !== snapshotName(item.base, item.quote)) throw new Error('Invalid selected snapshot name');
  const file = await readFile(`public/data/${item.filename}`, 'utf8'), payload = JSON.parse(file);
  if (payload.source !== 'Alchemy' || !payload.blockHash || !payload.pools?.length || payload.base !== item.base || payload.quote !== item.quote) throw new Error('Invalid server snapshot');
  snapshots.push({ ...item, file, payload });
}
const root = `https://api.github.com/repos/${repo}/git`;
async function api(path, body) {
  const response = await fetch(`${root}/${path}`, { method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
  if (response.status === 404 && !body) return null;
  if (!response.ok) throw new Error(`GitHub publication failed (${response.status})`);
  return response.json();
}
const ref = await api('ref/heads/depth-cache');
const previous = ref ? await api(`commits/${ref.object.sha}`) : null;
const entries = [];
for (const { filename, file } of snapshots) {
  const blob = await api('blobs', { content: file, encoding: 'utf-8' });
  entries.push({ path: filename, mode: '100644', type: 'blob', sha: blob.sha });
}
const tree = await api('trees', { ...(previous ? { base_tree: previous.tree.sha } : {}), tree: entries });
const commit = await api('commits', { message: `Refresh ${snapshots.length} selected market snapshot(s)`, tree: tree.sha, parents: previous ? [ref.object.sha] : [] });
const lease=leaseFromEnvironment();if(lease)await requireLease(lease);
if (!ref) await api('refs', { ref: 'refs/heads/depth-cache', sha: commit.sha });
else {
  const response = await fetch(`${root}/refs/heads/depth-cache`, { method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ sha: commit.sha, force: false }), signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`GitHub cache update failed (${response.status})`);
}
console.log(`Published ${snapshots.length} selected market snapshot(s).`);
