export function createFileHasher(){
  const worker=new Worker(new URL('../workers/fileHash.worker.js',import.meta.url),{type:'module'});let next=0;const pending=new Map();
  worker.onmessage=({data})=>{const item=pending.get(data.id);if(!item)return;pending.delete(data.id);data.error?item.reject(new Error(data.error)):item.resolve(data.hash);};
  worker.onerror=()=>{for(const p of pending.values())p.reject(new Error('File verification worker failed'));pending.clear();};
  return {hash(blob){return new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});worker.postMessage({id,blob});});},dispose(){worker.terminate();for(const p of pending.values())p.reject(new DOMException('Cancelled','AbortError'));pending.clear();}};
}
