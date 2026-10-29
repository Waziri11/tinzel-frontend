const BASE = import.meta.env?.VITE_API_URL || '';
export const MAX_DRAFT_BYTES = 500 * 1024 * 1024;
const key = (staffId, orderId) => `tinzel_draft_upload:${staffId}:${orderId}`;
export function savedDraftUpload(staffId, orderId) {
  try { return JSON.parse(localStorage.getItem(key(staffId, orderId)) || 'null'); } catch { return null; }
}
function remember(staffId, orderId, value) {
  try { if(value)localStorage.setItem(key(staffId,orderId),JSON.stringify(value));else localStorage.removeItem(key(staffId,orderId)); } catch { /* Transfer still works if browser storage is disabled. */ }
}
const hash = async (data) => [...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map((n)=>n.toString(16).padStart(2,'0')).join('');
async function fingerprint(file) {
  const sample = new Blob([String(file.size),file.slice(0,65536),file.slice(Math.max(0,file.size-65536))]);
  return hash(await sample.arrayBuffer());
}
const sleep = (ms, signal) => new Promise((resolve,reject)=>{
  const abort=()=>{clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'));};
  const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},ms);
  signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
});
async function request(url, token, { method='GET', body, binary=false, signal, progress, retry, complete=false }={}) {
  for(let attempt=0;attempt<3;attempt++) {
    signal?.throwIfAborted();
    try {
      return await new Promise((resolve,reject)=>{
        const xhr=new XMLHttpRequest();xhr.open(method,BASE+url);xhr.timeout=binary?120000:60000;
        xhr.setRequestHeader('Authorization',`Bearer ${token}`);
        if(body!==undefined)xhr.setRequestHeader('Content-Type',binary?'application/octet-stream':'application/json');
        const abort=()=>xhr.abort();signal?.addEventListener('abort',abort,{once:true});
        xhr.onloadend=()=>signal?.removeEventListener('abort',abort);
        xhr.upload.onprogress=(e)=>progress?.(e.loaded);
        xhr.onerror=()=>reject(new Error('Connection interrupted. Retry to resume your upload.'));
        xhr.ontimeout=()=>reject(Object.assign(new Error('Upload timed out. Retry to resume.'),{status:408}));
        xhr.onabort=()=>reject(new DOMException('Cancelled','AbortError'));
        xhr.onload=()=>{
          let data={};try{data=JSON.parse(xhr.responseText);}catch{/* gateways may return plain text */}
          if(xhr.status>=200&&xhr.status<300)return resolve(data);
          const reference=xhr.getResponseHeader('X-Request-Id')||xhr.getResponseHeader('X-Vercel-Id');
          const message=xhr.status===413?'The server rejected an upload part as too large. Refresh the application and retry.':data.message||`Upload failed (${xhr.status}). Retry to resume.`;
          reject(Object.assign(new Error(message+(reference?` Reference: ${reference}`:'')),{status:xhr.status}));
        };
        if(binary)xhr.setRequestHeader('X-Chunk-SHA256',body.sha256);
        if(signal?.aborted)return reject(new DOMException('Cancelled','AbortError'));
        xhr.send(body===undefined?undefined:binary?body.bytes:JSON.stringify(body));
      });
    }catch(error){
      const transient=!error.status||[408,429,502,503,504].includes(error.status)||(complete&&error.status===409);
      if(error.name==='AbortError'||attempt===2||!transient)throw error;
      retry?.();await sleep(700*2**attempt,signal);
    }
  }
}
export async function cancelDraftUpload(token, staffId, orderId) {
  const saved=savedDraftUpload(staffId,orderId);
  if(saved){try{await request(`/api/designer/orders/${orderId}/draft-uploads/${saved.id}`,token,{method:'DELETE'});}catch(error){if(![404,410].includes(error.status))throw error;}}
  remember(staffId,orderId,null);
}
export async function transferDraft({ token, staffId, orderId, file, metadata, signal, onProgress }) {
  if(!file||!file.name.toLowerCase().endsWith('.pdf')||file.type!=='application/pdf')throw new Error('Choose a valid PDF file.');
  if(file.size>MAX_DRAFT_BYTES)throw new Error('Magazine PDFs must be at most 500 MB.');
  const prefix=`/api/designer/orders/${orderId}/draft-uploads`;
  const started=Date.now();let acknowledged=0, sentThisRun=0;
  const emit=(stage,partial=0)=>{
    const bytes=Math.min(file.size,acknowledged+partial), speed=sentThisRun/Math.max(.1,(Date.now()-started)/1000);
    onProgress?.({stage,bytes,total:file.size,percent:stage==='complete'?100:Math.min(99,bytes/file.size*100),speed,remaining:speed>0?(file.size-bytes)/speed:null});
  };
  emit('checking');const identity=await fingerprint(file);signal?.throwIfAborted();
  let saved=savedDraftUpload(staffId,orderId), session;
  if(saved?.fingerprint===identity){
    try{session=await request(`${prefix}/${saved.id}`,token,{signal,retry:()=>emit('reconnecting')});}
    catch(e){if(![404,410].includes(e.status))throw e;remember(staffId,orderId,null);}
  }
  if(!session){
    session=await request(prefix,token,{method:'POST',body:{...metadata,name:file.name,size:file.size,contentType:'application/pdf',fingerprint:identity},signal,retry:()=>emit('reconnecting')});
    saved={id:session.id,fingerprint:identity,name:file.name,size:file.size,metadata};remember(staffId,orderId,saved);
  }
  if(session.fingerprint!==identity)throw new Error('Select the same PDF to resume, or cancel this upload and start again.');
  if(session.state!=='complete') {
    const chunks=new Map(session.chunks.map((c)=>[c.n,c]));
    for(let n=0;n<Math.ceil(file.size/session.chunkBytes);n++){
      signal?.throwIfAborted();const bytes=await file.slice(n*session.chunkBytes,Math.min(file.size,(n+1)*session.chunkBytes)).arrayBuffer();
      const sha256=await hash(bytes);signal?.throwIfAborted();
      if(chunks.has(n)){
        if(chunks.get(n).sha256!==sha256)throw new Error('This PDF differs from the saved upload. Select the original file or cancel and start again.');
      }else{
        emit('uploading');
        const runBefore=sentThisRun;
        await request(`${prefix}/${session.id}/chunks/${n}`,token,{method:'PUT',binary:true,body:{bytes,sha256},signal,progress:(loaded)=>{sentThisRun=runBefore+Math.min(bytes.byteLength,loaded);emit('uploading',Math.min(bytes.byteLength,loaded));},retry:()=>{sentThisRun=runBefore;emit('reconnecting');}});
        sentThisRun=runBefore+bytes.byteLength;
      }
      acknowledged+=bytes.byteLength;emit('uploading');
    }
  }
  acknowledged=file.size;emit('finalizing');
  const result=await request(`${prefix}/${session.id}/complete`,token,{method:'POST',body:{},signal,complete:true,retry:()=>emit('finalizing')});
  emit('complete');remember(staffId,orderId,null);return result;
}
