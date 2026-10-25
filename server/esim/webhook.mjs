import {createHmac,timingSafeEqual,createHash} from 'node:crypto';

export const MAX_WEBHOOK_BYTES=2*1024*1024;
const hash=value=>typeof value==='string'&&/^0x[\da-f]{64}$/i.test(value);
export function verifyWebhook(raw,signature,key){
 if(!Buffer.isBuffer(raw)||!key||typeof signature!=='string'||!/^([\da-f]{64})$/i.test(signature))return false;
 return timingSafeEqual(createHmac('sha256',key).update(raw).digest(),Buffer.from(signature,'hex'));
}
export async function readWebhookBody(req){
 const chunks=[];let size=0;
 for await(const chunk of req){size+=chunk.length;if(size>MAX_WEBHOOK_BYTES)throw Error('BODY_TOO_LARGE');chunks.push(Buffer.from(chunk));}
 return Buffer.concat(chunks);
}
// Notifications are wake-up hints only. Financial amounts always come from the
// canonical RPC collector, so a replay or an out-of-order notification adds zero.
export function webhookHint(payload,allowed){
 if(!allowed.includes(payload?.webhookId)||typeof payload.id!=='string'||payload.id.length>200)throw Error('UNKNOWN_WEBHOOK');
 let blocks=[],events=0,kinds=[];
 if(payload.type==='GRAPHQL'){
  const b=payload.event?.data?.block;
  if(!b||!hash(b.hash)||!Number.isSafeInteger(Number(b.number))||Number(b.number)<1)throw Error('INVALID_BLOCK');
  blocks=[Number(b.number)];
  for(const [key,value]of Object.entries(b))if(Array.isArray(value)){events+=value.length;if(value.length)kinds.push(key);}
 }else if(payload.type==='ADDRESS_ACTIVITY'){
  if(payload.event?.network!=='BNB_MAINNET'||!Array.isArray(payload.event.activity))throw Error('WRONG_NETWORK');
  for(const row of payload.event.activity){const n=Number(row.blockNum);if(!Number.isSafeInteger(n)||n<1||!hash(row.hash))throw Error('INVALID_BLOCK');blocks.push(n);}
  events=blocks.length;kinds=['address-activity'];
 }else throw Error('INVALID_TYPE');
 if(!blocks.length||!events)return null;
 return {id:payload.id,webhook:payload.webhookId,block:Math.max(...blocks),events,kinds:kinds.join(',')};
}
export const bodyDigest=raw=>createHash('sha256').update(raw).digest('hex');
