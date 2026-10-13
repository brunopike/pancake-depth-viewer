import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { gunzipSync, gzipSync } from 'node:zlib';
import { TOKEN, SOURCE } from './metrics.mjs';
export const CHECKPOINT_URL = 'https://raw.githubusercontent.com/starkweng/pancake-depth-viewer/esim-cache/state.json.gz';
export function parseState(bytes) {
  const state = JSON.parse(gunzipSync(bytes));
  if (state.version !== 1 || state.token !== TOKEN || state.source !== SOURCE || !Number.isSafeInteger(state.block) || !/^0x[0-9a-f]{64}$/.test(state.blockHash)) throw new Error('INVALID_CHECKPOINT');
  return state;
}
export async function loadState({ fetch: request = fetch, includeRemote = true } = {}) {
  const local = parseState(await readFile(new URL('./bootstrap.json.gz', import.meta.url)));
  if (includeRemote) try {
    const response = await request(`${CHECKPOINT_URL}?t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (response.ok) {
      const remote = parseState(Buffer.from(await response.arrayBuffer()));
      if (remote.block > local.block) return remote;
    }
  } catch { /* The bundled verified checkpoint remains usable. */ }
  return local;
}
export async function saveState(state, dir) {
  await mkdir(dir, { recursive: true });
  await writeFile(`${dir}/state.tmp`, gzipSync(JSON.stringify(state)));
  await rename(`${dir}/state.tmp`, `${dir}/state.json.gz`);
}
