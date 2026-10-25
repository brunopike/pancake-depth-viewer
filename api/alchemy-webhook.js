import {readWebhookBody,verifyWebhook,webhookHint,bodyDigest} from '../server/esim/webhook.mjs';
import {saveWebhook} from '../server/esim/realtime-store.mjs';
export const config={api:{bodyParser:false},maxDuration:30};
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
 let keys;try{keys=JSON.parse(process.env.ALCHEMY_WEBHOOK_KEYS||'{}');}catch{}
 if(!keys||!Object.keys(keys).length)return res.status(503).json({error:'WEBHOOK_NOT_CONFIGURED'});
 try{
  const raw=await readWebhookBody(req);
  let body;try{body=JSON.parse(raw.toString('utf8'));}catch{return res.status(400).json({error:'INVALID_JSON'});}
  if(!verifyWebhook(raw,req.headers['x-alchemy-signature'],keys[body.webhookId]))return res.status(401).json({error:'INVALID_SIGNATURE'});
  let hint;try{hint=webhookHint(body,Object.keys(keys));}catch{return res.status(400).json({error:'INVALID_EVENT'});}
  if(!hint)return res.status(200).json({accepted:true,empty:true});
  const inserted=await saveWebhook(hint,bodyDigest(raw));
  return res.status(200).json({accepted:true,duplicate:!inserted});
 }catch(error){
  if(error.message==='BODY_TOO_LARGE')return res.status(413).json({error:'BODY_TOO_LARGE'});
  // Non-2xx asks Alchemy to retry. Never acknowledge a failed durable write.
  console.warn('Webhook receipt failed');return res.status(503).json({error:'RECEIPT_NOT_SAVED'});
 }
}
