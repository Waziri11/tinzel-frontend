// One cache per mounted reader. At most two page loads and ten decoded image URLs.
export function createProofPageCache(reader, { limit=10, concurrency=2, decode=decodeImage, createUrl=(blob)=>URL.createObjectURL(blob), revokeUrl=(url)=>URL.revokeObjectURL(url) }={}) {
  const entries=new Map(), queue=[];let active=0,disposed=false;
  const prune=()=>{
    const ready=[...entries].filter(([,entry])=>entry.value);
    while(ready.length>limit){const [number,entry]=ready.shift();revokeUrl(entry.value.image);entries.delete(number);}
  };
  const pump=()=>{
    while(!disposed&&active<concurrency&&queue.length){
      const {number,entry}=queue.shift();active++;
      (async()=>{
        let image;
        try{
          const blob=await reader.page(number);const text=await reader.text(number);
          if(disposed)throw new Error('Reader closed');
          image=createUrl(blob);await decode(image);
          if(disposed)throw new Error('Reader closed');
          entry.value={image,text};entry.resolve(entry.value);prune();
        }catch(error){if(image)revokeUrl(image);entries.delete(number);entry.reject(error);}
        finally{active--;pump();}
      })();
    }
  };
  return {
    get(number){
      if(disposed)return Promise.reject(new Error('Reader closed'));
      let entry=entries.get(number);
      if(entry){entries.delete(number);entries.set(number,entry);return entry.promise;}
      entry={};entry.promise=new Promise((resolve,reject)=>{entry.resolve=resolve;entry.reject=reject;});
      entries.set(number,entry);queue.push({number,entry});pump();return entry.promise;
    },
    dispose(){disposed=true;for(const [,entry]of entries)if(entry.value)revokeUrl(entry.value.image);for(const {entry}of queue)entry.reject(new Error('Reader closed'));queue.length=0;entries.clear();},
    get size(){return [...entries.values()].filter((entry)=>entry.value).length;},
  };
}
function decodeImage(url){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve();image.onerror=()=>reject(new Error('Unable to decode magazine page'));image.src=url;});}
export function proofBatch(number,pageCount){const start=Math.floor((number-1)/5)*5+1;return Array.from({length:Math.min(5,pageCount-start+1)},(_,i)=>start+i);}
