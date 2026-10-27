import { gzipSync } from 'node:zlib';
import { makeRpc } from '../server/esim/rpc.mjs';
import { refreshState } from '../server/esim/collector.mjs';
import { loadState } from '../server/esim/store.mjs';
import { buildReport } from '../server/esim/metrics.mjs';
import { buildAddressPage, buildAddressDataset, addressOptions } from '../server/esim/addresses.mjs';
import { queryBalances } from '../server/esim/balances.mjs';
import { readSnapshotBalances, snapshotAddressResponse } from '../server/esim/snapshot-balances.mjs';
import { readViewSnapshot } from '../server/esim/view-cache.mjs';

let current, pending, checkedAt = 0, lastAttempt = 0, loadedAt = 0;
export const config = { maxDuration: 300 };
export function allowedOrigin(origin, host) {
  if (!origin) return null;
  const allowed = new Set(['https://starkweng.github.io', 'http://127.0.0.1:4317']);
  if (host && /^[a-z0-9.-]+(?::\d+)?$/i.test(host)) { allowed.add(`https://${host}`); if (host.startsWith('127.0.0.1:')) allowed.add(`http://${host}`); }
  return allowed.has(origin) ? origin : null;
}
export default async function handler(req, res) {
  const origin = req.headers.origin, allowed = allowedOrigin(origin, req.headers.host);
  res.setHeader('Vary', 'Origin'); res.setHeader('Cache-Control', 'no-store');
  if (origin && !allowed) return res.status(403).json({ message: '此来源不允许查询。' });
  if (allowed) res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ message: '不支持此请求。' });
  const q = req.query || {}, body = req.body || {};
  const balanceRequest = req.method === 'POST' && body.action === 'balances';
  const validQuery = Object.keys(q).every(k => q.view === 'addresses' ? ['view','period','mode','filter','sort','page','search','dataset'].includes(k) : k === 'view') && (!q.view || q.view === 'addresses')&&(!q.dataset||q.dataset==='1');
  const validBody = balanceRequest ? Object.keys(body).every(k => ['action', 'addresses'].includes(k)) && Array.isArray(body.addresses) && body.addresses.length > 0 && body.addresses.length <= 25 : Object.keys(body).length === 0;
  // Balance addresses must also belong to the verified ESIM trading dataset.
  if (!validQuery || !validBody) return res.status(400).json({ message: '此接口只查询固定的 ESIM 报表与已识别地址。' });
  let options;
  try { if (q.view === 'addresses') options = addressOptions(q); } catch { return res.status(400).json({ message: '地址筛选条件无效。' }); }
  const reportFor = state => q.view === 'addresses' ? q.dataset==='1'?buildAddressDataset(state,options):buildAddressPage(state, options) : buildReport(state);
  try {
    // A balance request needs the verified trading allowlist, not the hundreds
    // of MB of transfers/traces used by the historical collector.
    if (balanceRequest && process.env.ESIM_REALTIME_DATABASE_URL) {
      if (!process.env.ALCHEMY_API_KEY) return res.status(503).json({ message:'后台尚未配置 Alchemy，当前显示已保存的数据。' });
      try { return res.status(200).json({balances:await readSnapshotBalances(body.addresses,makeRpc({budget:8,timeoutMs:45000}))}); }
      catch(error) { if(error.message==='INVALID_BALANCE_ADDRESSES')return res.status(400).json({message:'仅可查询本页已识别的交易地址，每次最多 25 个。'});throw error; }
    }
    if (process.env.ESIM_REALTIME_DATABASE_URL) {
      const {data}=await readViewSnapshot(q.view==='addresses'?'addresses':'report');
      const report=q.view==='addresses'?snapshotAddressResponse(data,options,q.dataset==='1'):data;
      res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Content-Encoding','gzip');
      return res.status(200).send(gzipSync(JSON.stringify({report,configured:!!process.env.ALCHEMY_API_KEY,cached:true,catchingUp:Date.now()/1000-data.cutoff>120})));
    }
    if (!current || Date.now() - loadedAt > 300000) {
      const saved = await loadState();
      if (!current || saved.block > current.block) current = saved;
      loadedAt = Date.now();
    }
    if (req.method === 'GET') return res.status(200).json({ report: reportFor(current), configured: !!process.env.ALCHEMY_API_KEY });
    if (!process.env.ALCHEMY_API_KEY) return res.status(503).json({ message: '后台尚未配置 Alchemy，当前显示已保存的数据。' });
    if (balanceRequest) {
      try { return res.status(200).json({ balances: await queryBalances(current, body.addresses, makeRpc({ budget: 8, timeoutMs: 45000 })) }); }
      catch (error) { if (error.message === 'INVALID_BALANCE_ADDRESSES') return res.status(400).json({ message: '仅可查询本页已识别的交易地址，每次最多 25 个。' }); throw error; }
    }
    if (Date.now() - checkedAt < 60000) return res.status(200).json({ report: reportFor(current), cached: true, catchingUp: Date.now() / 1000 - current.cutoff > 120 });
    if (!pending && Date.now() - lastAttempt < 60000) return res.status(429).json({ message: '上次查询尚未完成或刚刚失败，请一分钟后重试。' });
    if (!pending) {
      lastAttempt = Date.now();
      pending = (async () => {
        const remote = await loadState(); if (remote.block > current.block) current = remote;
        const transport = makeRpc({ budget: 300, timeoutMs: 225000 });
        const startBlock = current.block;
        for (let i = 0; i < 8; i++) {
          let updated;
          try { updated = await refreshState(current, transport, { maxBlocks: 6000 }); }
          catch (error) { if (current.block === startBlock) throw error; break; }
          const unchanged = updated.block === current.block;
          current = updated;
          if (unchanged || Date.now() / 1000 - current.cutoff < 120) break;
        }
        checkedAt = Date.now(); return current;
      })().finally(() => { pending = null; });
    }
    const updated = await pending;
    return res.status(200).json({ report: reportFor(updated), catchingUp: Date.now() / 1000 - updated.cutoff > 120 });
  } catch (error) {
    // RPC error objects may contain secrets; never return/log their text.
    console.warn('ESIM query stopped:', /^[A-Z_]+$/.test(error.message) ? error.message : 'QUERY_FAILED');
    return res.status(502).json({ message: '本次查询未通过核验，已保留上次数据，请稍后重试。' });
  }
}
