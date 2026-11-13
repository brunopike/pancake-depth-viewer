export async function readTransportSnapshot(response,kind,request){
 const data=await response.json();if(data?.chunked!==true)return data;
 if(data.version!==1||data.kind!==kind||!Number.isSafeInteger(data.block)||data.block<1||!Number.isFinite(data.cutoff)||!/^[0-9a-f]{64}$/.test(data.etag)||!Number.isInteger(data.parts)||data.parts<1||data.parts>32)throw Error('INVALID_SNAPSHOT_PARTS');
 const parts=[];
 for(let i=0;i<data.parts;i+=3){
  parts.push(...await Promise.all(Array.from({length:Math.min(3,data.parts-i)},async(_,offset)=>{
   const part=await request(`./api/esim-snapshot?kind=${kind}&etag=${data.etag}&part=${i+offset}`,{cache:'no-store',signal:AbortSignal.timeout(25000)});
   if(!part.ok)throw Error('SNAPSHOT_PART_UNAVAILABLE');const bytes=new Uint8Array(await part.arrayBuffer());
   if(!bytes.length||bytes.length>2*1024*1024)throw Error('INVALID_SNAPSHOT_PART');return bytes;
  })));
 }
 const bytes=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');if(hash!==data.etag)throw Error('SNAPSHOT_PART_HASH_MISMATCH');
 const value=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json();
 if(value.block!==data.block||value.cutoff!==data.cutoff)throw Error('INVALID_SNAPSHOT_PARTS');return value;
}
