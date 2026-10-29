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
