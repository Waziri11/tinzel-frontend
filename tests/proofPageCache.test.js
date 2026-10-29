import test from 'node:test';
import assert from 'node:assert/strict';
import { createProofPageCache,proofBatch } from '../src/utils/proofPageCache.js';
test('proof batches include only the requested five-page window and respect short magazines',()=>{
  assert.deepEqual(proofBatch(1,3),[1,2,3]);assert.deepEqual(proofBatch(9,20),[6,7,8,9,10]);assert.deepEqual(proofBatch(11,12),[11,12]);
});
test('cache coalesces requests, limits parallel loads to two and releases evicted URLs',async()=>{
  let active=0,peak=0,loads=0;const revoked=[];
  const reader={page:async(n)=>{loads++;active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,2));active--;return n;},text:async(n)=>({text:[n]})};
  const cache=createProofPageCache(reader,{decode:async()=>{},createUrl:n=>`page:${n}`,revokeUrl:url=>revoked.push(url)});
  const a=cache.get(1),b=cache.get(1);assert.equal(a,b);
  await Promise.all(Array.from({length:12},(_,i)=>cache.get(i+1)));
  assert.equal(loads,12);assert.equal(peak,2);assert.equal(cache.size,10);assert.deepEqual(revoked,['page:1','page:2']);
  await cache.get(12);assert.equal(loads,12);cache.dispose();assert.equal(revoked.length,12);assert.equal(cache.size,0);
});
test('failed page loads can retry without poisoning the cache',async()=>{
  let failures=1;const cache=createProofPageCache({page:async()=>{if(failures--)throw new Error('Temporary failure');return 1;},text:async()=>({text:[]})},{decode:async()=>{},createUrl:()=>'/page',revokeUrl:()=>{}});
  await assert.rejects(cache.get(1),/Temporary/);assert.equal((await cache.get(1)).image,'/page');cache.dispose();
});
test('bundles load once and navigation aborts obsolete prefetch before visible work',async()=>{
 const started=[],aborted=[];const reader={bundle:(n,signal)=>new Promise((resolve,reject)=>{started.push(n);if(n===1)return resolve({blob:n,text:{text:[]}});signal.addEventListener('abort',()=>{aborted.push(n);reject(new DOMException('Cancelled','AbortError'));});if(n===10)resolve({blob:n,text:{text:[]}});}),page:()=>{throw new Error('Bundle should avoid fallback');}};
 const cache=createProofPageCache(reader,{decode:async()=>{},createUrl:n=>`page:${n}`,revokeUrl:()=>{}});await cache.get(1);cache.get(2,{priority:0}).catch(()=>{});cache.get(3,{priority:0}).catch(()=>{});cache.get(4,{priority:0}).catch(()=>{});
 cache.setVisible([10]);assert.equal((await cache.get(10)).image,'page:10');assert.deepEqual(aborted,[2,3]);assert.ok(!started.includes(4));cache.dispose();
});
test('a prefetched page promoted to visible is retained while obsolete work is cancelled',async()=>{
 let complete,aborted=false;const cache=createProofPageCache({bundle:(n,signal)=>new Promise((resolve,reject)=>{complete=()=>resolve({blob:n,text:{text:[]}});signal.addEventListener('abort',()=>{aborted=true;reject(new DOMException('Cancelled','AbortError'));});})},{decode:async()=>{},createUrl:n=>`page:${n}`,revokeUrl:()=>{}});
 const prefetched=cache.get(2,{priority:0});cache.setVisible([2]);assert.equal(aborted,false);const visible=cache.get(2);assert.equal(visible,prefetched);complete();await visible;assert.equal(cache.peek(2).image,'page:2');cache.dispose();
});
test('an aborted prefetch cannot remove its newer replacement from the cache',async()=>{
 let calls=0;const reader={bundle:(n,signal)=>{calls++;if(calls>1)return Promise.resolve({blob:n,text:{text:[]}});return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>queueMicrotask(()=>reject(new DOMException('Cancelled','AbortError')))));}};
 const cache=createProofPageCache(reader,{decode:async()=>{},createUrl:n=>`page:${n}`,revokeUrl:()=>{}});cache.get(2,{priority:0}).catch(()=>{});cache.setVisible([3]);const replacement=cache.get(2);await replacement;assert.equal(cache.get(2),replacement);assert.equal(calls,2);cache.dispose();
});
