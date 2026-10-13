import {loadHolders} from '../server/esim/holders.mjs';
import {allowedOrigin} from './esim.js';
export const config={maxDuration:60};
// Public reads never trigger paid RPC. The GitHub workflow is the sole writer.
export default async function handler(req,res){
 const origin=req.headers.origin,allowed=allowedOrigin(origin,req.headers.host);res.setHeader('Vary','Origin');res.setHeader('Cache-Control','public, max-age=0, s-maxage=60');
 if(origin&&!allowed)return res.status(403).json({message:'此来源不允许查询。'});
 if(allowed)res.setHeader('Access-Control-Allow-Origin',allowed);res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
 if(req.method==='OPTIONS')return res.status(204).end();if(req.method!=='GET')return res.status(405).json({message:'持仓由后台定时查询，请读取最新快照。'});
 if(Object.keys(req.query||{}).length)return res.status(400).json({message:'此接口只提供 ESIM 持仓快照。'});
 try{return res.status(200).json({report:await loadHolders(),refreshMode:'hourly-snapshot'});}catch{return res.status(503).json({message:'持仓快照暂时不可用，请稍后重试。'});}
}
