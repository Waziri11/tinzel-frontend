// Decoded pages are limited to ten. Compressed, viewer-watermarked bundles stay in a
// separate bounded memory cache so revisiting an evicted page does not download it again.
export function createProofPageCache(reader, {limit=10,concurrency=2,encodedLimit=32,maxEncodedBytes=32*1024*1024,decode=decodeImage,createUrl=blob=>URL.createObjectURL(blob),revokeUrl=url=>URL.revokeObjectURL(url)}={}){
  const entries=new Map(),encoded=new Map(),queue=[];
  let active=0,disposed=false,visible=new Set(),encodedBytes=0;
  const touchEncoded=number=>{
    const value=encoded.get(number);
    if(value){encoded.delete(number);encoded.set(number,value);}
    return value;
  };
  const keepEncoded=(number,blob,text)=>{
    const previous=encoded.get(number);if(previous){encoded.delete(number);encodedBytes-=previous.bytes;}
    const bytes=(Number(blob.size)||0)+JSON.stringify(text).length*2;
    if(bytes>maxEncodedBytes||encodedLimit<1)return;
    while(encoded.size&&(encoded.size>=encodedLimit||encodedBytes+bytes>maxEncodedBytes)){
      const [old,value]=encoded.entries().next().value;encoded.delete(old);encodedBytes-=value.bytes;
    }
    encoded.set(number,{blob,text,bytes});encodedBytes+=bytes;
  };
  const prune=()=>{
    const ready=[...entries].filter(([,entry])=>entry.value);
    while(ready.length>limit){
      const index=ready.findIndex(([number])=>!visible.has(number));
      const [number,entry]=ready.splice(index<0?0:index,1)[0];revokeUrl(entry.value.image);entries.delete(number);
    }
  };
  const pump=()=>{
    while(!disposed&&active<concurrency&&queue.length){
      queue.sort((a,b)=>b.entry.priority-a.entry.priority);
      const {number,entry}=queue.shift();active++;entry.controller=new AbortController();
      (async()=>{
        let image;
        try{
          let payload=touchEncoded(number);
          if(!payload){
            const bundled=reader.bundle?await reader.bundle(number,entry.controller.signal):null;
            const blob=bundled?.blob||await reader.page(number,entry.controller.signal);
            const text=bundled?.text||await reader.text(number);
            entry.controller.signal.throwIfAborted();if(disposed)throw new Error('Reader closed');
            keepEncoded(number,blob,text);payload={blob,text};
          }
          entry.controller.signal.throwIfAborted();if(disposed)throw new Error('Reader closed');
          const started=performance.now();image=createUrl(payload.blob);await decode(image);
          performance.measure?.('proof-page-decode',{start:started,end:performance.now(),detail:{page:number}});
          entry.controller.signal.throwIfAborted();if(disposed)throw new Error('Reader closed');
          entry.value={image,text:payload.text};entry.resolve(entry.value);prune();
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
      if(entry){entry.priority=Math.max(entry.priority,priority);entries.delete(number);entries.set(number,entry);touchEncoded(number);return entry.promise;}
      entry={priority};entry.promise=new Promise((resolve,reject)=>{entry.resolve=resolve;entry.reject=reject;});
      entries.set(number,entry);queue.push({number,entry});pump();return entry.promise;
    },
    setVisible(numbers,{retain=[]}={}){
      visible=new Set(numbers);const wanted=new Set([...numbers,...retain]);
      for(const [number,entry]of entries)entry.priority=visible.has(number)?100:0;
      for(let i=queue.length-1;i>=0;i--){
        const {number,entry}=queue[i];if(!wanted.has(number)){queue.splice(i,1);if(entries.get(number)===entry)entries.delete(number);entry.reject(new DOMException('Prefetch cancelled','AbortError'));}
      }
      for(const [number,entry]of entries)if(!entry.value&&!wanted.has(number))entry.controller?.abort();
    },
    dispose(){
      disposed=true;for(const entry of entries.values())entry.controller?.abort();
      for(const entry of entries.values())if(entry.value)revokeUrl(entry.value.image);
      for(const {entry}of queue)entry.reject(new Error('Reader closed'));
      queue.length=0;entries.clear();encoded.clear();encodedBytes=0;
    },
    updateText(number,text){const entry=entries.get(number);if(entry?.value)entry.value.text=text;const saved=encoded.get(number);if(saved)keepEncoded(number,saved.blob,text);},
    peek(number){return entries.get(number)?.value;},
    get size(){return [...entries.values()].filter(entry=>entry.value).length;},
    get encodedBytes(){return encodedBytes;},
    get encodedSize(){return encoded.size;},
  };
}
function decodeImage(url){
  const image=new Image();image.decoding='async';
  if(image.decode){image.src=url;return image.decode();}
  return new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('Unable to decode magazine page'));image.src=url;});
}
export function proofBatch(number,pageCount){const start=Math.floor((number-1)/5)*5+1;return Array.from({length:Math.min(5,pageCount-start+1)},(_,i)=>start+i);}
export function proofWindow(number,pageCount,single){
  const visible=[number,...(!single&&number>1&&number<pageCount?[number+1]:[])];
  const next=number+(single||number===1?1:2);
  const ahead=next<=pageCount?[next,...(!single&&next>1&&next<pageCount?[next+1]:[])]:[];
  return {visible,desired:[...new Set([...visible,...ahead,...visible.flatMap(page=>proofBatch(page,pageCount))])]};
}
