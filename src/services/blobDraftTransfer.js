import { createMultipartUpload, uploadPart, completeMultipartUpload } from '@vercel/blob/client';
import { createFileHasher } from '../utils/fileHashWorker.js';

export async function transferBlobDraft({session,file,signal,call,emit,renew,storage={createMultipartUpload,uploadPart,completeMultipartUpload},createHasher=createFileHasher}){
  const localAbort=new AbortController();signal=AbortSignal.any([signal,localAbort.signal].filter(Boolean));
  const started=performance.now(),hasher=createHasher(),active=new Map();
  const receipts=new Map((session.receipts||[]).map(p=>[p.partNumber,p]));
  let multipartId=session.multipartId,multipartKey=session.multipartKey,token=session.authorization?.token,validUntil=session.authorization?.validUntil;
  let concurrency=4,retries=0,confirmed=0,completedAtStart=receipts.size,checkpoint=Promise.resolve(),pending=[];
  const count=Math.ceil(file.size/session.chunkBytes);
  const update=(stage)=>{
    const bytes=Math.min(file.size,confirmed+[...active.values()].reduce((a,b)=>a+b,0));
    const speed=Math.max(0,(bytes-completedAtStart*session.chunkBytes))/Math.max(.1,(performance.now()-started)/1000);
    emit?.({stage,bytes,total:file.size,percent:Math.min(99,bytes/file.size*100),speed,remaining:speed>0?(file.size-bytes)/speed:null});
  };
  const options=()=>({token,access:'private',abortSignal:signal,contentType:'application/pdf'});
  const refresh=async()=>{if(!token||validUntil<Date.now()+60000){const renewed=await renew();token=renewed.authorization.token;validUntil=renewed.authorization.validUntil;}};
  const checkpointParts=(parts)=>{checkpoint=checkpoint.then(()=>call('/checkpoint',{multipartId,multipartKey,parts}));return checkpoint;};
  const saveReceipt=(receipt)=>{pending.push(receipt);if(pending.length>=4){const batch=pending;pending=[];return checkpointParts(batch);}return Promise.resolve();};
  try{
    if(session.state==='complete')return;
    await refresh();
    if(!multipartId){const created=await storage.createMultipartUpload(session.pathname,options());multipartId=created.uploadId;multipartKey=created.key;await checkpointParts([]);}
    // Verify acknowledged parts in the background pool too; finalization waits for every hash.
    const jobs=Array.from({length:count},(_,i)=>i+1);let cursor=0;
    const process=async(lane)=>{
      while(cursor<jobs.length){
        while(lane>=concurrency&&cursor<jobs.length){signal.throwIfAborted();await new Promise(r=>setTimeout(r,100));}
        if(cursor>=jobs.length)break;
        signal?.throwIfAborted();const partNumber=jobs[cursor++],blob=file.slice((partNumber-1)*session.chunkBytes,Math.min(file.size,partNumber*session.chunkBytes));
        const hashing=hasher.hash(blob);hashing.catch(()=>{});
        const old=receipts.get(partNumber);
        if(old){if(await hashing!==old.sha256)throw new Error('This PDF differs from the saved upload. Select the original file.');confirmed+=blob.size;update('uploading');continue;}
        let receipt;
        for(let attempt=0;attempt<3;attempt++){
          await refresh();
          try{
            active.set(partNumber,0);
            receipt=await storage.uploadPart(session.pathname,blob,{...options(),partNumber,uploadId:multipartId,key:multipartKey,onUploadProgress:({loaded})=>{active.set(partNumber,Math.min(blob.size,loaded));update('uploading');}});break;
          }catch(error){
            active.delete(partNumber);if(error.name==='AbortError'||signal?.aborted)throw error;
            const status=error.status||error.statusCode;
            if(attempt===2||status&&![408,429,500,502,503,504].includes(status))throw error;
            if(++retries>=2)concurrency=2;update('reconnecting');
            await new Promise((resolve,reject)=>{const aborted=()=>{clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'));};const timer=setTimeout(()=>{signal?.removeEventListener('abort',aborted);resolve();},500*2**attempt);signal?.addEventListener('abort',aborted,{once:true});});
          }
        }
        const sha256=await hashing;active.delete(partNumber);confirmed+=blob.size;
        const stored={partNumber,etag:receipt.etag,sha256};receipts.set(partNumber,stored);await saveReceipt(stored);update('uploading');
      }
    };
    // Two lanes can be parked after repeated throttling without exceeding four active parts.
    const lanes=Array.from({length:4},(_,lane)=>process(lane));
    try{await Promise.all(lanes);}catch(error){localAbort.abort(error);await Promise.allSettled(lanes);throw error;}
    if(pending.length)await checkpointParts(pending);await checkpoint;signal?.throwIfAborted();update('finalizing');
    try{await storage.completeMultipartUpload(session.pathname,[...receipts.values()].sort((a,b)=>a.partNumber-b.partNumber).map(({partNumber,etag})=>({partNumber,etag})),{...options(),uploadId:multipartId,key:multipartKey});}
    catch(error){
      // If completion's response was lost, the server's verified object check is the durable receipt.
      if(error.name==='AbortError'||signal?.aborted)throw error;
      await call('/complete',{});return;
    }
  }finally{hasher.dispose();}
}
