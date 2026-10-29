// One cache per mounted reader. At most two page loads and ten decoded image URLs.
export function createProofPageCache(reader, { limit=10, concurrency=2, decode=decodeImage, createUrl=(blob)=>URL.createObjectURL(blob), revokeUrl=(url)=>URL.revokeObjectURL(url) }={}) {
  const entries=new Map(), queue=[];let active=0,disposed=false,visible=new Set();
  const prune=()=>{
    const ready=[...entries].filter(([,entry])=>entry.value);
    while(ready.length>limit){const index=ready.findIndex(([number])=>!visible.has(number));const [number,entry]=ready.splice(index<0?0:index,1)[0];revokeUrl(entry.value.image);entries.delete(number);}
  };
  const pump=()=>{
    while(!disposed&&active<concurrency&&queue.length){
      queue.sort((a,b)=>b.entry.priority-a.entry.priority);
      const {number,entry}=queue.shift();active++;entry.controller=new AbortController();
      (async()=>{
        let image;
        try{
          const bundled=reader.bundle?await reader.bundle(number,entry.controller.signal):null;
          const blob=bundled?.blob||await reader.page(number,entry.controller.signal);const text=bundled?.text||await reader.text(number);
          if(entry.controller.signal.aborted)throw new DOMException('Cancelled','AbortError');
          if(disposed)throw new Error('Reader closed');
          const decodeStarted=performance.now();image=createUrl(blob);await decode(image);
          performance.measure?.('proof-page-decode',{start:decodeStarted,end:performance.now(),detail:{page:number}});
          if(entry.controller.signal.aborted)throw new DOMException('Cancelled','AbortError');
          if(disposed)throw new Error('Reader closed');
          entry.value={image,text};entry.resolve(entry.value);prune();
        }catch(error){if(image)revokeUrl(image);if(entries.get(number)===entry)entries.delete(number);entry.reject(error);}
        finally{active--;pump();}
      })();
    }
  };
  return {
    get(number,{priority=100}={}){
      if(disposed)return Promise.reject(new Error('Reader closed'));
      let entry=entries.get(number);
      if(entry?.controller?.signal.aborted){entries.delete(number);entry=null;}
      if(entry){entry.priority=Math.max(entry.priority,priority);entries.delete(number);entries.set(number,entry);return entry.promise;}
      entry={priority};entry.promise=new Promise((resolve,reject)=>{entry.resolve=resolve;entry.reject=reject;});
      entries.set(number,entry);queue.push({number,entry});pump();return entry.promise;
    },
    setVisible(numbers){
      visible=new Set(numbers);
      for(const number of visible){const entry=entries.get(number);if(entry)entry.priority=100;}
      for(let i=queue.length-1;i>=0;i--){const {number,entry}=queue[i];if(!visible.has(number)&&entry.priority<=0){queue.splice(i,1);entries.delete(number);entry.reject(new DOMException('Prefetch cancelled','AbortError'));}}
      for(const [number,entry]of entries)if(!entry.value&&entry.priority<=0&&!visible.has(number))entry.controller?.abort();
    },
    dispose(){disposed=true;for(const entry of entries.values())entry.controller?.abort();for(const [,entry]of entries)if(entry.value)revokeUrl(entry.value.image);for(const {entry}of queue)entry.reject(new Error('Reader closed'));queue.length=0;entries.clear();},
    peek(number){return entries.get(number)?.value;},
    get size(){return [...entries.values()].filter((entry)=>entry.value).length;},
  };
}
function decodeImage(url){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve();image.onerror=()=>reject(new Error('Unable to decode magazine page'));image.src=url;});}
export function proofBatch(number,pageCount){const start=Math.floor((number-1)/5)*5+1;return Array.from({length:Math.min(5,pageCount-start+1)},(_,i)=>start+i);}
