import { readFile } from 'node:fs/promises';
const token = process.env.GITHUB_TOKEN, repo = process.env.GITHUB_REPOSITORY;
if (!token || !repo) throw new Error('Missing GitHub publishing environment');
const file = await readFile('public/data/esim-usdt.json', 'utf8');
const payload = JSON.parse(file);
if (payload.source !== 'Alchemy' || !payload.blockHash || !payload.pools?.length) throw new Error('Invalid server snapshot');
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
const blob = await api('blobs', { content: file, encoding: 'utf-8' });
const tree = await api('trees', { ...(previous ? { base_tree: previous.tree.sha } : {}), tree: [{ path: 'esim-usdt.json', mode: '100644', type: 'blob', sha: blob.sha }] });
const commit = await api('commits', { message: `ESIM depth at block ${payload.blockNumber}`, tree: tree.sha, parents: previous ? [ref.object.sha] : [] });
if (!ref) await api('refs', { ref: 'refs/heads/depth-cache', sha: commit.sha });
else {
  const response = await fetch(`${root}/refs/heads/depth-cache`, { method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ sha: commit.sha, force: false }), signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`GitHub cache update failed (${response.status})`);
}
console.log(`Published ESIM snapshot at block ${payload.blockNumber}`);
