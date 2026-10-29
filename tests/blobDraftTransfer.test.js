import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {transferBlobDraft} from '../src/services/blobDraftTransfer.js';
const hash=async blob=>createHash('sha256').update(Buffer.from(await blob.arrayBuffer())).digest('hex');
const session=()=>({pathname:'private/draft.pdf',state:'open',chunkBytes:8*1024*1024,authorization:{token:'write-only',validUntil:Date.now()+3600000}});
const file=()=>new Blob([Buffer.alloc(8*1024*1024*5+17)]);
const hasher=()=>({hash,dispose(){}});
test('direct upload keeps four bounded transfers, batches receipts, and waits for provider completion',async()=>{
 let active=0,peak=0,complete=false;const checkpoints=[],progress=[];
 const storage={createMultipartUpload:async()=>({uploadId:'upload',key:'key'}),uploadPart:async(_path,blob,options)=>{assert.equal(options.access,'private');assert.ok(blob.size<=8*1024*1024);peak=Math.max(peak,++active);options.onUploadProgress({loaded:blob.size});await new Promise(r=>setTimeout(r,10));active--;return {etag:`etag-${options.partNumber}`};},completeMultipartUpload:async(_path,parts)=>{assert.equal(parts.length,6);assert.equal(active,0);complete=true;}};
 await transferBlobDraft({session:session(),file:file(),storage,createHasher:hasher,call:async(s,b)=>checkpoints.push({s,...b}),emit:p=>progress.push(p)});
 assert.equal(peak,4);assert.equal(complete,true);assert.deepEqual(checkpoints.map(p=>p.parts.length),[0,4,2]);assert.ok(progress.every(p=>p.percent<100));assert.equal(progress.at(-1).stage,'finalizing');
});
test('resume verifies acknowledged bytes and sends only missing parts',async()=>{
 const input=file(),s=session();s.multipartId='upload';s.multipartKey='key';s.receipts=[{partNumber:1,etag:'saved',sha256:await hash(input.slice(0,s.chunkBytes))}];const uploaded=[];
 const storage={uploadPart:async(_path,_blob,o)=>{uploaded.push(o.partNumber);return {etag:String(o.partNumber)};},completeMultipartUpload:async()=>{}};
 await transferBlobDraft({session:s,file:input,storage,createHasher:hasher,call:async()=>{}});assert.deepEqual(uploaded.sort(),[2,3,4,5,6]);
 s.receipts[0].sha256='0'.repeat(64);await assert.rejects(transferBlobDraft({session:s,file:input,storage,createHasher:hasher,call:async()=>{}}),/differs/);
});
test('lost multipart completion response uses server verification and never invents success',async()=>{
 const storage={createMultipartUpload:async()=>({uploadId:'u',key:'k'}),uploadPart:async()=>({etag:'e'}),completeMultipartUpload:async()=>{throw new Error('Connection lost');}};let verified=false;
 await transferBlobDraft({session:session(),file:new Blob(['%PDF-small']),storage,createHasher:hasher,call:async path=>{if(path==='/complete')verified=true;}});assert.equal(verified,true);
 await assert.rejects(transferBlobDraft({session:session(),file:new Blob(['%PDF-small']),storage,createHasher:hasher,call:async path=>{if(path==='/complete')throw new Error('Stored object missing');}}),/Stored object missing/);
});
