import { test, expect } from '@playwright/test';

const json = (route, data) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
const designer = { _id: 'designer-1', name: 'Juma Designer', role: 'designer', isActive: true };
const fix = { _id: 'fix-1', text: 'Correct the anniversary date', pageReference: '4', status: 'open', designerResponse: '' };
const request = { _id: 'return-1', roundNumber: 1, draftVersionNumber: 1, source: 'client', status: 'open', requestedAt: '2026-10-18T10:00:00Z', items: [fix] };
const order = { _id: 'order-1', trackingId: 'TNZ-2026-0099', submissionId: 'SUB-2026-0099', clientName: 'Asha Client', clientWhatsApp: '0712000000', formTitle: 'Love Story', status: 'revision_requested', currentDraftVersion: 1, assignedDesigner: designer, submittedData: { story: 'Our story' }, submittedFields: [{ fieldId: 'story', label: 'Story', order: 1 }], uploadedPhotos: [], draftVersions: [], revisionRequests: [request], updatedAt: '2026-10-18T10:00:00Z' };

async function setup(page) {
  await page.addInitScript(() => localStorage.setItem('tinzel_staff_token', 'designer-test'));
  await page.route('**/api/staff/me', (route) => json(route, { user: designer }));
  await page.route((url) => url.pathname === '/api/designer/orders', (route) => json(route, { orders: [order] }));
  await page.route('**/api/designer/orders/order-1', (route) => json(route, { order, auditLogs: [{ _id: 'log-1', action: 'CLIENT_REVISION_REQUESTED', actor: { name: 'Asha Client' }, details: { feedback: 'Correct the date' }, createdAt: '2026-10-18T10:00:00Z' }] }));
  await page.route('**/api/designer/returns*', (route) => json(route, { returns: [{ orderId: order._id, trackingId: order.trackingId, clientName: order.clientName, ...request }], total: 1, page: 1, pageCount: 1 }));
  await page.route('**/api/designer/orders/order-1/returns/return-1/items/fix-1', (route) => json(route, { success: true }));
}

test('designer order uses its own URL, history, checklist and PDF-only top action', async ({ page }) => {
  await setup(page); await page.goto('/staff/design'); await page.getByRole('button', { name: 'English EN' }).click();
  await expect(page.getByRole('heading', { name: 'Design orders', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open TNZ-2026-0099' }).click();
  await expect(page).toHaveURL(/\/staff\/design\/orders\/order-1$/);
  await page.getByRole('tab', { name: 'Version history' }).click();
  await expect(page.getByRole('heading', { name: 'Submission history' })).toBeVisible();
  await page.getByRole('tab', { name: 'Corrections', exact: true }).click();
  await expect(page.getByText('Correct the anniversary date')).toBeVisible();
  await page.reload(); await page.getByRole('button', { name: 'English EN' }).click(); await expect(page.getByRole('heading', { name: 'TNZ-2026-0099' })).toBeVisible();
  await page.getByRole('button', { name: 'Upload new draft' }).click();
  await expect(page.getByLabel('Magazine PDF · up to 500 MB')).toHaveAttribute('accept', 'application/pdf,.pdf');
  await expect(page.getByRole('button', { name: 'Send to manager review' })).toBeDisabled();
});

test('returns page is a separate responsive work list', async ({ page }) => {
  await setup(page); await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/staff/returns'); await page.getByRole('button', { name: 'English EN' }).click();
  await expect(page.getByRole('heading', { name: 'Returned Magazines & Changes' })).toBeVisible();
  await expect(page.getByText('1/1 addressed')).toHaveCount(0);
  await page.getByRole('button', { name: /Open/ }).last().click();
  await expect(page).toHaveURL(/\/staff\/design\/orders\/order-1$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});

test('protected reader uses book view on desktop, single page on mobile, and no designer download', async ({ page }) => {
  await setup(page);
  const proof = { ...order, status: 'draft_manager_review', revisionRequests: [], draftVersions: [{ _id: 'draft-1', versionNumber: 1, uploadedAt: '2026-10-18T10:00:00Z', managerReview: { status: 'pending' }, clientReview: { status: 'pending' } }] };
  await page.route('**/api/designer/orders/order-1', (route) => json(route, { order: proof, auditLogs: [] }));
  await mockReader(page);
  await page.goto('/staff/design/orders/order-1'); await page.getByRole('button', { name: 'English EN' }).click();
  await expect(page.getByRole('button', { name: 'Single page', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download PDF' })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Book view', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});

const samplePage = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="white"/><text x="60" y="100" font-size="24">Magazine correction text</text><rect x="60" y="220" width="300" height="200" fill="#c5a059"/><text x="40" y="600" fill="#999">Viewer · TNZ-2026-0099 · v1</text></svg>`;
async function mockReader(page, { canComment = false, failOnce = false, pageCount=3 } = {}) {
  let annotations = []; let failed = false;
  await page.route('**/api/proofs/staff/order-1/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/annotations')) {
      if (failOnce && !failed) { failed=true; return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Connection interrupted'})}); }
      annotations.push({...route.request().postDataJSON(),_id:`annotation-${annotations.length+1}`,authorName:'Manager',createdAt:'2026-10-28T10:00:00Z'});
      return json(route,{annotations});
    }
    if (/annotations\//.test(url.pathname)) { annotations=[]; return json(route,{annotations}); }
    if (url.pathname.includes('/pages/')) {
      if (url.searchParams.has('text')) return json(route,{width:600,height:800,text:[{str:'Magazine correction text',x:.1,y:.1,width:.6,height:.03}]});
      return route.fulfill({contentType:'image/svg+xml',body:samplePage});
    }
    return json(route,{state:'ready',pageCount,pages:Array.from({length:pageCount},(_,i)=>({page:i+1,width:600,height:800})),annotations,canComment});
  });
}

test('reader retains failed comments, saves selected areas, and opens historical versions', async ({page}) => {
  await setup(page);
  const proof = {...order,status:'draft_manager_review',revisionRequests:[],draftVersions:[1,2].map(versionNumber=>({_id:`draft-${versionNumber}`,versionNumber,managerReview:{status:'pending'},clientReview:{status:'pending'}})),currentDraftVersion:2};
  await page.route('**/api/designer/orders/order-1',route=>json(route,{order:proof,auditLogs:[]}));
  await mockReader(page,{canComment:true,failOnce:true});
  await page.goto('/staff/design/orders/order-1');await page.getByRole('button',{name:'English EN'}).click();
  await expect(page.getByAltText('Magazine page 1')).toBeVisible();
  await page.getByRole('button',{name:'Mark image / area'}).click();
  const bounds = await page.locator('.proof-sheet').boundingBox();
  await page.mouse.move(bounds.x+bounds.width*.15,bounds.y+bounds.height*.3);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width*.55,bounds.y+bounds.height*.5);await page.mouse.up();
  await page.getByLabel('Correction comment').fill('Replace this photograph');
  await page.getByRole('button',{name:'Save comment',exact:true}).click();
  await expect(page.getByText('Save failed — retry')).toBeVisible();
  await expect(page.getByLabel('Correction comment')).toHaveValue('Replace this photograph');
  await page.getByRole('button',{name:'Save comment',exact:true}).click();
  await expect(page.getByText('Saved',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Return for corrections (1)'})).toBeVisible();
  await page.reload();await page.getByRole('button',{name:'English EN'}).click();
  await page.getByRole('button',{name:'Comments (1)',exact:true}).click();
  await expect(page.getByText('Replace this photograph',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Zoom in'}).click();
  await expect(page.getByText('120%',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Next page',exact:true}).click();
  await expect(page.getByAltText('Magazine page 2')).toBeVisible();
  await expect(page.getByAltText('Magazine page 3')).toBeVisible();
  await page.screenshot({path:'/tmp/tinzel-protected-reader-desktop.png',fullPage:true});
  await page.getByRole('tab',{name:'Version history'}).click();
  await page.getByRole('button',{name:'Open version 1',exact:true}).click();
  await expect(page.getByText('Draft version 1',{exact:true})).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await expect(page.getByRole('button',{name:'Book view',exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
  await page.screenshot({path:'/tmp/tinzel-protected-reader-mobile.png',fullPage:true});
});

test('text selections save normalized anchors and submit together as corrections', async ({page}) => {
  await setup(page);
  const proof={...order,status:'draft_manager_review',revisionRequests:[],draftVersions:[{versionNumber:1,managerReview:{status:'pending'}}]};
  await page.route('**/api/designer/orders/order-1',route=>json(route,{order:proof,auditLogs:[]}));
  await mockReader(page,{canComment:true});
  let submitted;
  await page.route('**/api/manager/orders/order-1/review-draft',route=>{submitted=route.request().postDataJSON();return json(route,{success:true});});
  await page.goto('/staff/design/orders/order-1');await page.getByRole('button',{name:'English EN'}).click();
  await expect(page.getByAltText('Magazine page 1')).toBeVisible();
  await page.getByRole('button',{name:'Select text',exact:true}).click();
  const text=page.locator('.proof-text-layer span').first();const b=await text.boundingBox();
  await page.mouse.move(b.x+1,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width-1,b.y+b.height/2,{steps:12});await page.mouse.up();
  await page.getByLabel('Correction comment').fill('Correct this wording');
  const saved=page.waitForRequest(r=>r.url().endsWith('/annotations')&&r.method()==='POST');
  await page.getByRole('button',{name:'Save comment',exact:true}).click();
  const payload=(await saved).postDataJSON();expect(payload.kind).toBe('text');expect(payload.selectedText).toContain('Magazine');expect(payload.rects[0].x).toBeGreaterThanOrEqual(0);expect(payload.rects[0].width).toBeLessThanOrEqual(1);
  await page.getByRole('button',{name:'Return for corrections (1)'}).click();
  await expect.poll(()=>submitted).toEqual({action:'return_to_designer',expectedVersion:1,items:[]});
});

test('client can reopen a released historical magazine while a replacement is private', async ({page}) => {
  await page.addInitScript(()=>sessionStorage.setItem('tinzel_client_token','client-test'));
  const released={...order,status:'draft_manager_review',currentDraftVersion:2,draftVersions:[{versionNumber:1,managerReview:{status:'approved'}}],revisionRequests:[]};
  await page.route('**/api/client/order',route=>json(route,{order:released}));
  await page.route(/\/api\/proofs\/client\/1(?:\/prepare)?$/,route=>json(route,{state:'ready',pageCount:1,pages:[{page:1}],annotations:[],canComment:false}));
  await page.route('**/api/proofs/client/1/pages/1*',route=>new URL(route.request().url()).searchParams.has('text')?json(route,{width:600,height:800,text:[]}):route.fulfill({contentType:'image/svg+xml',body:samplePage}));
  await page.goto('/track');await page.getByRole('button',{name:'English EN'}).click();
  await expect(page.getByAltText('Magazine page 1')).toBeVisible();
  await expect(page.getByLabel('Magazine version')).toHaveValue('1');
  await expect(page.getByRole('button',{name:'Select text',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Download PDF'})).toHaveCount(0);
});

test('draft upload shows real progress, resumes after reload, and waits for server confirmation', async ({page})=>{
  await setup(page);
  const editable={...order,status:'in_design',currentDraftVersion:0,revisionRequests:[]};let committed=false,blocked=true,session,completeRelease;
  const chunks=new Map(),counts=new Map();
  await page.route('**/api/designer/orders/order-1',route=>json(route,{order:{...editable,...(committed?{status:'draft_manager_review',currentDraftVersion:1}: {})},auditLogs:[]}));
  await page.route('**/api/designer/orders/order-1/draft-uploads**',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.pathname.endsWith('/draft-uploads')){session={...req.postDataJSON(),id:'session-1',state:'open',chunkBytes:1024*1024,chunks:[]};return json(route,session);}
    if(url.pathname.endsWith('/complete')){await new Promise(resolve=>completeRelease=resolve);committed=true;return json(route,{success:true,version:1});}
    if(url.pathname.includes('/chunks/')){
      const n=Number(url.pathname.split('/').at(-1));counts.set(n,(counts.get(n)||0)+1);
      expect(req.postDataBuffer().length).toBeLessThanOrEqual(1024*1024);
      if(n===1&&blocked)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Connection interrupted'})});
      chunks.set(n,{n,length:req.postDataBuffer().length,sha256:req.headers()['x-chunk-sha256']});return json(route,{success:true});
    }
    return json(route,{...session,chunks:[...chunks.values()]});
  });
  const payload={name:'large-magazine.pdf',mimeType:'application/pdf',buffer:Buffer.concat([Buffer.from('%PDF-1.7\n'),Buffer.alloc(5*1024*1024)])};
  await page.goto('/staff/design/orders/order-1');await page.getByRole('button',{name:'English EN'}).click();await page.getByRole('button',{name:'Upload new draft'}).click();
  await page.getByLabel('Magazine PDF · up to 500 MB').setInputFiles(payload);await page.getByRole('button',{name:'Send to manager review'}).click();
  await expect(page.getByRole('progressbar',{name:'Magazine upload progress'})).toBeVisible();
  await expect(page.getByText('Reconnecting',{exact:false})).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Connection interrupted');
  expect(await page.getByRole('progressbar').getAttribute('value')).not.toBe('100');
  expect(chunks.has(0)).toBe(true);blocked=false;
  await page.reload();await page.getByRole('button',{name:'English EN'}).click();await page.getByRole('button',{name:'Upload new draft'}).click();
  await expect(page.getByText(/A saved upload is available/)).toBeVisible();
  await page.getByLabel('Magazine PDF · up to 500 MB').setInputFiles(payload);await page.getByRole('button',{name:'Send to manager review'}).click();
  await expect(page.getByText('Finalizing draft',{exact:false})).toBeVisible();expect(counts.get(0)).toBe(1);
  expect(await page.getByRole('progressbar').getAttribute('value')).not.toBe('100');
  await expect(page.getByRole('button',{name:'Cancel',exact:true})).toBeDisabled();
  await page.screenshot({path:'/tmp/tinzel-large-upload-progress.png',fullPage:true});
  completeRelease();await expect(page.getByRole('dialog',{name:'Upload new draft'})).toHaveCount(0);await expect(page.getByText(/Draft uploaded and sent to manager review/)).toBeVisible();
});

test('reader shows the cover without waiting for later opening pages and prepares distant batches',async({page})=>{
  await setup(page);const proof={...order,status:'draft_manager_review',revisionRequests:[],draftVersions:[{versionNumber:1,managerReview:{status:'pending'}}]};
  await page.route('**/api/designer/orders/order-1',route=>json(route,{order:proof,auditLogs:[]}));
  let release;const prepared=new Set([1,2,3,4,5]),requested=[];
  await page.route('**/api/proofs/staff/order-1/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname.includes('/pages/')){
      const n=Number(url.pathname.split('/').at(-1));if(!prepared.has(n))return route.fulfill({status:202,contentType:'application/json',body:JSON.stringify({message:'Preparing page'})});requested.push(n);
      if(n===5)return route.fulfill({status:422,contentType:'application/json',body:JSON.stringify({message:'Page 5 failed'})});
      if(url.searchParams.has('text'))return json(route,{width:600,height:800,text:[]});
      return route.fulfill({contentType:'image/svg+xml',body:samplePage});
    }
    if(url.pathname.endsWith('/prepare'))for(const p of route.request().postDataJSON().pages){const start=Math.floor((p-1)/5)*5+1;for(let n=start;n<=Math.min(12,start+4);n++)prepared.add(n);}
    return json(route,{state:'ready',pageCount:12,pages:[...prepared].map(page=>({page})),annotations:[],canComment:false});
  });
  await page.goto('/staff/design/orders/order-1');await page.getByRole('button',{name:'English EN'}).click();
  await expect(page.getByAltText('Magazine page 1')).toBeVisible();expect(requested.every(n=>n<=5)).toBe(true);expect(prepared.size).toBe(5);
  await page.getByLabel('Go to page').fill('10');await expect(page.getByAltText('Magazine page 10')).toBeVisible();await expect(page.getByAltText('Magazine page 11')).toBeVisible();expect(prepared.has(12)).toBe(true);
});

test('direct multipart transfer hashes parts in the real browser worker with four bounded lanes',async({page})=>{
 await setup(page);await page.goto('/staff/design');
 const result=await page.evaluate(async()=>{
  const {transferBlobDraft}=await import('/src/services/blobDraftTransfer.js');let active=0,peak=0;const checkpoints=[];
  const storage={createMultipartUpload:async()=>({uploadId:'test-upload',key:'test-key'}),uploadPart:async(_path,blob,o)=>{peak=Math.max(peak,++active);await new Promise(r=>setTimeout(r,25));o.onUploadProgress({loaded:blob.size});active--;return {etag:`part-${o.partNumber}`};},completeMultipartUpload:async()=>{}};
  await transferBlobDraft({session:{pathname:'private/test.pdf',state:'open',chunkBytes:8*1024*1024,authorization:{token:'write-only-fixture',validUntil:Date.now()+3600000}},file:new Blob([new Uint8Array(40*1024*1024+13)]),storage,call:async(_path,body)=>{checkpoints.push(body);}});
  return {peak,checkpoints:checkpoints.map(c=>c.parts.length),hashes:checkpoints.flatMap(c=>c.parts.map(p=>p.sha256))};
 });
 expect(result.peak).toBe(4);expect(result.checkpoints).toEqual([0,4,2]);expect(result.hashes).toHaveLength(6);expect(result.hashes.every(hash=>/^[a-f0-9]{64}$/.test(hash))).toBe(true);
});

test('fullscreen book fits both pages, turns a two-sided leaf, and cached navigation avoids metadata round trips',async({page})=>{
 await setup(page);await page.setViewportSize({width:1440,height:900});
 const proof={...order,status:'draft_manager_review',revisionRequests:[],draftVersions:[{versionNumber:1,managerReview:{status:'pending'}}]};
 await page.route('**/api/designer/orders/order-1',route=>json(route,{order:proof,auditLogs:[]}));await mockReader(page,{pageCount:12});
 let metadataRequests=0;page.on('request',request=>{if(/\/proofs\/staff\/order-1\/1(?:\/prepare)?$/.test(new URL(request.url()).pathname))metadataRequests++;});
 await page.goto('/staff/design/orders/order-1');await page.getByRole('button',{name:'English EN'}).click();await expect(page.getByAltText('Magazine page 1')).toBeVisible();
 await expect(page.getByRole('complementary',{name:'Magazine comments'})).toHaveCount(0);
 await page.getByRole('button',{name:'Fullscreen',exact:true}).click();await expect(page.locator('.pdf-book.is-expanded')).toBeVisible();
 const initial=metadataRequests;await page.getByRole('button',{name:'Next page',exact:true}).click();await expect(page.locator('.book-turn-leaf')).toBeVisible();await expect(page.locator('.book-turn-front')).toHaveCount(16);await expect(page.locator('.book-turn-back')).toHaveCount(16);
 await expect.poll(()=>page.locator('.book-paper-segment').first().evaluate(el=>getComputedStyle(el).transform)).toContain('matrix3d');
 await expect.poll(()=>page.locator('.book-turn-leaf').evaluate(el=>getComputedStyle(el).transform)).toContain('matrix3d');
 await expect(page.getByAltText('Magazine page 2')).toBeVisible();await expect(page.getByAltText('Magazine page 3')).toBeVisible();await expect(page.locator('.book-turn')).toHaveCount(0);
 for(const n of [2,3]){const b=await page.getByAltText(`Magazine page ${n}`).boundingBox();expect(b.x).toBeGreaterThanOrEqual(0);expect(b.y).toBeGreaterThanOrEqual(44);expect(b.y+b.height).toBeLessThanOrEqual(856);expect(b.width).toBeGreaterThan(400);}
 await page.screenshot({path:'/tmp/tinzel-book-fullscreen-desktop.png'});
 await page.getByRole('button',{name:'Next page',exact:true}).click();await expect(page.getByAltText('Magazine page 4')).toBeVisible();await expect(page.locator('.book-turn')).toHaveCount(0);expect(metadataRequests).toBe(initial);
 await page.getByRole('button',{name:'Exit fullscreen',exact:true}).click();await expect(page.locator('.pdf-book.is-expanded')).toHaveCount(0);
});

test('mobile fits one page, swipes in either direction, and preserves annotation selection at zoom',async({page})=>{
 await setup(page);await page.setViewportSize({width:390,height:844});
 const proof={...order,status:'draft_manager_review',revisionRequests:[],draftVersions:[{versionNumber:1,managerReview:{status:'pending'}}]};
 await page.route('**/api/designer/orders/order-1',route=>json(route,{order:proof,auditLogs:[]}));await mockReader(page,{canComment:true,pageCount:12});
 await page.goto('/staff/design/orders/order-1');await page.getByRole('button',{name:'English EN'}).click();await expect(page.getByAltText('Magazine page 1')).toBeVisible();
 await page.getByRole('button',{name:'Fullscreen',exact:true}).click();await expect(page.locator('.pdf-book.is-expanded')).toBeVisible();
 await expect(page.getByRole('button',{name:'Book view',exact:true})).toHaveCount(0);
 const bounds=await page.getByAltText('Magazine page 1').boundingBox();expect(bounds.width).toBeGreaterThan(340);expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.y+bounds.height).toBeLessThan(800);
 const stage=await page.locator('.proof-stage').boundingBox();
 const swipe=async(from,to)=>{await page.mouse.move(stage.x+stage.width*from,stage.y+stage.height*.5);await page.mouse.down();await page.mouse.move(stage.x+stage.width*to,stage.y+stage.height*.5,{steps:8});await page.mouse.up();};
 await swipe(.8,.2);await expect(page.getByAltText('Magazine page 2')).toBeVisible();await expect(page.locator('.proof-sheet')).toHaveCount(1);await expect(page.locator('.book-turn')).toHaveCount(0);
 await page.screenshot({path:'/tmp/tinzel-book-fullscreen-mobile.png'});
 await swipe(.2,.8);await expect(page.getByAltText('Magazine page 1')).toBeVisible();await expect(page.locator('.book-turn')).toHaveCount(0);
 await page.getByRole('button',{name:'Zoom in',exact:true}).click();await page.getByRole('button',{name:'Mark image / area',exact:true}).click();
 const sheet=await page.locator('.proof-sheet').boundingBox();await page.mouse.move(sheet.x+sheet.width*.2,sheet.y+sheet.height*.3);await page.mouse.down();await page.mouse.move(sheet.x+sheet.width*.6,sheet.y+sheet.height*.45);await page.mouse.up();
 await expect(page.getByLabel('Correction comment')).toBeVisible();await page.getByLabel('Correction comment').fill('Mobile photo correction');
 const saved=page.waitForRequest(r=>r.url().endsWith('/annotations')&&r.method()==='POST');await page.getByRole('button',{name:'Save comment',exact:true}).click();const data=(await saved).postDataJSON();expect(data.page).toBe(1);expect(data.rects[0].width).toBeCloseTo(.4,1);
});

test('reduced motion skips page rotation and a slow next spread keeps the current page visible',async({page})=>{
 await setup(page);await page.emulateMedia({reducedMotion:'reduce'});
 const proof={...order,status:'draft_manager_review',revisionRequests:[],draftVersions:[{versionNumber:1,managerReview:{status:'pending'}}]};await page.route('**/api/designer/orders/order-1',route=>json(route,{order:proof,auditLogs:[]}));await mockReader(page);
 let release,blocked=true;const gate=new Promise(resolve=>release=resolve);
 await page.route('**/api/proofs/staff/order-1/1/pages/2*',async route=>{if(blocked)await gate;return new URL(route.request().url()).searchParams.has('text')?json(route,{width:600,height:800,text:[]}):route.fulfill({contentType:'image/svg+xml',body:samplePage});});
 await page.goto('/staff/design/orders/order-1');await page.getByRole('button',{name:'English EN'}).click();await expect(page.getByAltText('Magazine page 1')).toBeVisible();await page.getByRole('button',{name:'Next page',exact:true}).click();await expect(page.getByText('Preparing pages…',{exact:true})).toBeVisible();await expect(page.getByAltText('Magazine page 1')).toBeVisible();blocked=false;release();
 await expect(page.getByAltText('Magazine page 2')).toBeVisible();await expect(page.locator('.book-turn')).toHaveCount(0);
});

test('touch devices stay single-page in landscape orientation',async({browser})=>{
 const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});const page=await context.newPage();
 try{await setup(page);const proof={...order,status:'draft_manager_review',revisionRequests:[],draftVersions:[{versionNumber:1,managerReview:{status:'pending'}}]};await page.route('**/api/designer/orders/order-1',route=>json(route,{order:proof,auditLogs:[]}));await mockReader(page,{pageCount:12});await page.goto('/staff/design/orders/order-1');await page.getByRole('button',{name:'English EN'}).click();await expect(page.getByAltText('Magazine page 1')).toBeVisible();await expect(page.getByRole('button',{name:'Single page',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Next page',exact:true}).click();await expect(page.getByAltText('Magazine page 2')).toBeVisible();await expect(page.locator('.proof-sheet')).toHaveCount(1);}finally{await context.close();}
});

test('landscape PDF pages keep their aspect ratio and correction coordinates inside desktop spreads',async({page})=>{
 await setup(page);await page.setViewportSize({width:1440,height:900});const proof={...order,status:'draft_manager_review',revisionRequests:[],draftVersions:[{versionNumber:1,managerReview:{status:'pending'}}]};await page.route('**/api/designer/orders/order-1',route=>json(route,{order:proof,auditLogs:[]}));await mockReader(page,{canComment:true});
 await page.route('**/api/proofs/staff/order-1/1/pages/2*',route=>new URL(route.request().url()).searchParams.has('text')?json(route,{width:800,height:600,text:[]}):route.fulfill({contentType:'image/svg+xml',body:samplePage.replace('width="600" height="800"','width="800" height="600"')}));
 await page.goto('/staff/design/orders/order-1');await page.getByRole('button',{name:'English EN'}).click();await expect(page.getByAltText('Magazine page 1')).toBeVisible();await page.getByRole('button',{name:'Fullscreen',exact:true}).click();await page.getByRole('button',{name:'Next page',exact:true}).click();await expect(page.getByAltText('Magazine page 2')).toBeVisible();await expect(page.locator('.book-turn')).toHaveCount(0);await page.getByRole('button',{name:'Mark image / area',exact:true}).click();const image=page.getByAltText('Magazine page 2'),b=await image.boundingBox();expect(b.width/b.height).toBeCloseTo(800/600,1);
 await page.mouse.move(b.x+b.width*.2,b.y+b.height*.2);await page.mouse.down();await page.mouse.move(b.x+b.width*.5,b.y+b.height*.4);await page.mouse.up();await page.getByLabel('Correction comment').fill('Landscape layout correction');const sent=page.waitForRequest(r=>r.url().endsWith('/annotations')&&r.method()==='POST');await page.getByRole('button',{name:'Save comment',exact:true}).click();const annotation=(await sent).postDataJSON();expect(annotation.page).toBe(2);expect(annotation.rects[0].width).toBeCloseTo(.3,1);expect(annotation.rects[0].height).toBeCloseTo(.2,1);
});

test('saving an earlier comment preserves newer typing and its marked region',async({page})=>{
 await setup(page);const proof={...order,status:'draft_manager_review',revisionRequests:[],draftVersions:[{versionNumber:1,managerReview:{status:'pending'}}]};
 await page.route('**/api/designer/orders/order-1',route=>json(route,{order:proof,auditLogs:[]}));await mockReader(page,{canComment:true});
 let release;const gate=new Promise(resolve=>release=resolve);
 await page.route('**/api/proofs/staff/order-1/1/annotations',async route=>{const body=route.request().postDataJSON();await gate;return json(route,{annotations:[{...body,_id:'saved-1',authorName:'Manager'}]});});
 await page.goto('/staff/design/orders/order-1');await page.getByRole('button',{name:'English EN'}).click();await expect(page.getByAltText('Magazine page 1')).toBeVisible();await page.getByRole('button',{name:'Mark image / area',exact:true}).click();
 const b=await page.getByAltText('Magazine page 1').boundingBox();await page.mouse.move(b.x+b.width*.2,b.y+b.height*.2);await page.mouse.down();await page.mouse.move(b.x+b.width*.5,b.y+b.height*.4);await page.mouse.up();
 await expect(page.locator('.proof-selection-mark')).toBeVisible();await page.getByLabel('Correction comment').fill('First correction');const sent=page.waitForRequest(r=>r.url().endsWith('/annotations')&&r.method()==='POST');await page.getByRole('button',{name:'Save comment',exact:true}).click();const payload=(await sent).postDataJSON();expect(payload.clientMutationId).toMatch(/^[a-f0-9-]{36}$/i);
 await page.getByLabel('Correction comment').fill('Newer correction still being written');release();await expect(page.getByText('Saved earlier comment — your current draft is still here')).toBeVisible();await expect(page.getByLabel('Correction comment')).toHaveValue('Newer correction still being written');await expect(page.locator('.proof-selection-mark')).toBeVisible();
});

test('temporary profile failure preserves sign-in and retries without showing protected content',async({page})=>{
 await setup(page);let unavailable=true;
 await page.route('**/api/staff/me',route=>unavailable?route.fulfill({status:503,contentType:'application/json',body:'{}'}):json(route,{user:designer}));
 await page.goto('/staff/design/orders/order-1');await page.getByRole('button',{name:'English EN'}).click();await expect(page.getByRole('button',{name:'Retry connection'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'TNZ-2026-0099'})).toHaveCount(0);expect(await page.evaluate(()=>localStorage.getItem('tinzel_staff_token'))).toBe('designer-test');
 unavailable=false;await page.getByRole('button',{name:'Retry connection'}).click();await expect(page.getByRole('heading',{name:'TNZ-2026-0099'})).toBeVisible();
});

test('invalid staff session is cleared and requires sign-in',async({page})=>{
 await setup(page);await page.route('**/api/staff/me',route=>route.fulfill({status:401,contentType:'application/json',body:'{}'}));
 await page.goto('/staff/design/orders/order-1');await page.getByRole('button',{name:'English EN'}).click();await expect(page.getByRole('heading',{name:'Staff Workstation Sign In'})).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('tinzel_staff_token'))).toBeNull();await expect(page.getByRole('heading',{name:'TNZ-2026-0099'})).toHaveCount(0);
});

test('cover transfer overlaps metadata and a compatible image response is downloaded only once',async({page})=>{
 await setup(page);const proof={...order,status:'draft_manager_review',revisionRequests:[],draftVersions:[{versionNumber:1,managerReview:{status:'pending'}}]};await page.route('**/api/designer/orders/order-1',route=>json(route,{order:proof,auditLogs:[]}));await mockReader(page);
 let release;const metadataGate=new Promise(resolve=>release=resolve);let imageRequests=0,rawImageRequests=0;
 await page.route('**/api/proofs/staff/order-1/1',async route=>{await metadataGate;return json(route,{state:'ready',pageCount:3,pages:[1,2,3].map(page=>({page,width:600,height:800})),annotations:[],canComment:false});});
 page.on('request',r=>{const url=new URL(r.url());if(url.pathname.endsWith('/pages/1')&&!url.searchParams.has('text')){imageRequests++;if(!url.searchParams.has('bundle'))rawImageRequests++;}});
 const coverRequested=page.waitForRequest(r=>new URL(r.url()).pathname.endsWith('/pages/1'));
 await page.goto('/staff/design/orders/order-1');await page.getByRole('button',{name:'English EN'}).click();
 try{await coverRequested;expect(imageRequests).toBeGreaterThan(0);}finally{release();}
 await expect(page.getByAltText('Magazine page 1')).toBeVisible();expect(rawImageRequests).toBe(0);
});

test('paper bends through connected hinges during the turn and settles flat',async({page})=>{
 await setup(page);await page.setViewportSize({width:1440,height:900});const proof={...order,status:'draft_manager_review',revisionRequests:[],draftVersions:[{versionNumber:1,managerReview:{status:'pending'}}]};await page.route('**/api/designer/orders/order-1',route=>json(route,{order:proof,auditLogs:[]}));await mockReader(page,{pageCount:12});
 await page.goto('/staff/design/orders/order-1');await page.getByRole('button',{name:'English EN'}).click();await expect(page.getByAltText('Magazine page 1')).toBeVisible();await page.getByRole('button',{name:'Fullscreen',exact:true}).click();await page.getByRole('button',{name:'Next page',exact:true}).click();await expect(page.locator('.book-turn')).toHaveCount(0);
 // Hold the decorative leaf long enough to capture and inspect its half-turn geometry.
 await page.evaluate(()=>{const schedule=window.setTimeout;window.setTimeout=(fn,ms,...args)=>schedule(fn,ms===660?4000:ms,...args);});
 await page.addStyleTag({content:'.book-turn-leaf,.book-paper-segment,.book-turn::before,.book-turn-front::after,.book-turn-back::after{animation-play-state:paused!important;animation-delay:-.32s!important}'});
 await page.getByRole('button',{name:'Next page',exact:true}).click();
 const bends=await page.locator('.book-paper-segment').evaluateAll(elements=>elements.map(el=>getComputedStyle(el).transform));expect(bends.length).toBe(16);expect(new Set(bends).size).toBeGreaterThan(8);expect(bends.every(value=>value.includes('matrix3d'))).toBe(true);
 await page.screenshot({path:'/tmp/tinzel-paper-curl.png'});await expect(page.locator('.book-turn')).toHaveCount(0);await expect(page.getByAltText('Magazine page 4')).toBeVisible();
});
