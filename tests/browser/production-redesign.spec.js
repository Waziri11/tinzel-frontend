import {securityLogin} from './security-login.js';
import {test,expect} from './fixtures.js';
import AxeBuilder from '@axe-core/playwright';
import {proofPdf} from '../../../tinzel-backend/tests/fixtures/proofPdf.js';
const password='Browser!2026';
const login=securityLogin;
async function api(request,path,token,data,method='post'){const response=await request[method](`/api${path}`,{headers:{Cookie:'',Authorization:`Bearer ${token}`},...(data===undefined?{}:{data})});const body=await response.json();expect(response.ok(),`${method} ${path}: ${JSON.stringify(body)}`).toBe(true);return body;}
async function staffSignIn(page,role,path){const token=await securityLogin(page.request,role);await page.context().addCookies([{name:'tinzel_staff',value:token,url:'http://127.0.0.1:5177',httpOnly:true,sameSite:'Strict'}]);await page.goto(path);}
async function createEdition(request,admin){const suffix=Date.now();const created=await api(request,'/admin/forms',admin,{title:`Fictional release ${suffix}`,titleSw:'Toleo la majaribio',description:'Isolated acceptance record.',price:50000,currency:'TZS',coverImageUrl:'/brand/magazine-cover-sample.jpg',sections:[{sectionId:'story',title:'Your story',titleSw:'Hadithi yako',order:0}],fields:[{fieldId:'story',sectionId:'story',label:'Your story',labelSw:'Hadithi yako',type:'textarea',required:true,order:0}],lipaNambaInstructions:{tillNumber:'TEST',accountName:'Isolated test only',instructions:'Do not pay this test order.'}});await api(request,`/admin/forms/${created.form._id}/publish`,admin);return created.form;}

test('real isolated ordering, manager return, customer revision, approval and delivery closure',async({page,request},testInfo)=>{
 test.setTimeout(180000);await page.addInitScript(()=>localStorage.setItem('tinzel_language','en'));
 const admin=await login(request,'admin'),manager=await login(request,'manager'),designer=await login(request,'designer'),edition=await createEdition(request,admin);
 await page.goto('/catalogue');await page.getByRole('button',{name:new RegExp(edition.title)}).click();
 await expect(page).toHaveURL(/\/catalogue\/[^?]+\?step=details$/);
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Check the highlighted details.');
 const clientName=page.getByLabel('Full Name *',{exact:true});
 await expect(clientName).toHaveAttribute('aria-invalid','true');
 await expect(clientName).toHaveAccessibleDescription('Enter your name.');
 await expect(page.locator('#magazine-client-name-error')).toBeVisible();
 await expect(clientName).toBeFocused();
 await clientName.fill('Fictional Release Client');await page.locator('#magazine-client-whatsapp').fill('0712000088');
 await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('textbox',{name:'Your story',exact:true}).fill('Isolated acceptance story.');
 await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(page.getByText('Isolated acceptance story.',{exact:true})).toBeVisible();
 const submitted=page.waitForResponse(response=>response.url().endsWith('/submit')&&response.request().method()==='POST');
 await page.getByRole('button',{name:/Continue.*Pay/i}).click();const submission=await (await submitted).json();expect(submission.success).toBe(true);
 await expect(page.getByText('Do not pay this test order.')).toBeVisible();
 let rows=await api(request,'/manager/orders?limit=50&scope=all',manager,undefined,'get'),order=rows.orders.find(row=>row.submissionId===submission.order.submissionId);expect(order).toBeTruthy();const id=order._id;
 // A real manager signs in and records payment through the redesigned action dialog.
 await page.clock.install();await page.clock.pauseAt(new Date());
 await staffSignIn(page,'manager','/staff/pre-design');
 const alert=page.locator('.submission-alert');
 await expect(alert).toContainText('New magazine submission');
 await expect(alert).toContainText('Fictional Release Client');
 await expect(alert).toContainText(edition.title);
 await alert.getByRole('button',{name:'Open order'}).click();
 await expect(page).toHaveURL(new RegExp('orderId='+id));
 await expect(alert.filter({hasText:edition.title})).toHaveCount(0);
 await page.clock.resume();
 await page.locator('.manager-order-drawer').getByRole('button',{name:'Verify payment',exact:true}).click();
 const payment=page.getByRole('dialog',{name:'Verify payment',exact:true});await payment.getByLabel('Payment reference').fill('ISOLATED-ONLY');await payment.getByLabel('Amount paid (TZS)').fill('50000');await payment.getByRole('button',{name:'Verify payment',exact:true}).click();
 await expect(payment).toHaveCount(0);order=(await api(request,`/manager/orders/${id}`,manager,undefined,'get')).order;expect(order.status).toBe('assigned');
 // Other journeys can change the workload-based assignment in this shared fixture.
 const testDesigner=(await api(request,'/staff/me',designer,undefined,'get')).user;
 const designerId=testDesigner._id || testDesigner.id;
 if ((order.assignedDesigner?._id || order.assignedDesigner)!==designerId) {
  await api(request,`/manager/orders/${id}/reassign`,manager,{designerId,reason:'Assign the designer used by this isolated test.'});
 }
 const upload=async version=>{const current=(await api(request,`/designer/orders/${id}`,designer,undefined,'get')).order,revision=current.revisionRequests?.at(-1);const response=await request.post(`/api/designer/orders/${id}/upload-draft`,{headers:{Cookie:'',Authorization:`Bearer ${designer}`},multipart:{draftFile:{name:'isolated.pdf',mimeType:'application/pdf',buffer:proofPdf(2)},expectedVersion:String(version-1),...(revision?.status==='open'?{revisionRequestId:revision._id,verifyAll:'true'}:{})}});expect(response.ok(),await response.text()).toBe(true);};
 const address=async()=>{const current=(await api(request,`/designer/orders/${id}`,designer,undefined,'get')).order,revision=current.revisionRequests.at(-1);for(const item of revision.items)await api(request,`/designer/orders/${id}/returns/${revision._id}/items/${item._id}`,designer,{response:'Corrected in the isolated fixture.'},'patch');};
 await upload(1);await api(request,`/manager/orders/${id}/review-draft`,manager,{expectedVersion:1,action:'return_to_designer',items:[{text:'Fictional manager correction',pageReference:'1'}]});await address();await upload(2);
 // Blocked print and stale review both remain enforced by the real backend.
 const blocked=await request.post(`/api/manager/orders/${id}/authorise-print`,{headers:{Cookie:'',Authorization:`Bearer ${manager}`},data:{}});expect(blocked.status()).toBeGreaterThanOrEqual(400);
 const stale=await request.post(`/api/manager/orders/${id}/review-draft`,{headers:{Cookie:'',Authorization:`Bearer ${manager}`},data:{expectedVersion:1,action:'release_to_client'}});expect(stale.status()).toBe(409);
 await api(request,`/manager/orders/${id}/review-draft`,manager,{expectedVersion:2,action:'release_to_client'});order=(await api(request,`/manager/orders/${id}`,manager,undefined,'get')).order;
 await page.goto('/track');await page.locator('#track-login-id').fill(order.trackingId);await page.locator('#track-login-whatsapp').fill('0712000088');
 const otp=page.waitForResponse(response=>response.url().endsWith('/client/request-otp'));await page.getByRole('button',{name:'Continue to tracking'}).click();const otpBody=await (await otp).json();expect(otpBody.devOtp).toBeTruthy();await page.locator('#track-login-otp').fill(otpBody.devOtp);await page.getByRole('button',{name:'View my order'}).click();
 await expect(page.getByAltText('Magazine page 1')).toBeVisible({timeout:30000});
 // Reopen in the same browser after the short-lived session is gone.
 await page.context().clearCookies({name:'tinzel_client'});
 const restored=page.waitForResponse(response=>response.url().endsWith('/client/request-otp')&&response.request().postDataJSON()?.resumeOnly===true);
 await page.reload();
 expect((await (await restored).json()).clientToken).toBe('cookie');
 await expect(page.getByAltText('Magazine page 1')).toBeVisible();
 const client=(await page.context().cookies()).find(c=>c.name==='tinzel_client').value;
 await api(request,'/client/request-revision',client,{expectedVersion:2,items:[{text:'Fictional client correction',pageReference:'1'}]});await address();await upload(3);await api(request,`/manager/orders/${id}/review-draft`,manager,{expectedVersion:3,action:'release_to_client'});
 await page.reload();await expect(page.getByAltText('Magazine page 1')).toBeVisible({timeout:30000});
 await page.screenshot({path:testInfo.outputPath('real-client-proof.png'),fullPage:true});
 await api(request,'/client/approve-draft',client,{expectedVersion:3});await api(request,`/designer/orders/${id}/upload-print-document`,designer,{useApprovedDraft:true});
 // Printer configuration is confined to the in-memory test database. Providers are simulated.
 await api(request,'/admin/config',admin,{key:'printer_whatsapp_phone',value:'+255712000099'},'put');
 for(const [suffix,data] of [['authorise-print',{}],['printer-update',{stage:'in_progress',notes:'Isolated acknowledgement'}],['printer-update',{stage:'completed',notes:'Isolated verification'}],['authorise-dispatch',{carrier:'Fictional Courier',trackingReference:'ISOLATED-SHIP',deliveryAddress:'Fictional test address',notes:'Test only'}],['close-order',{recipientName:'Fictional Release Client',confirmationMethod:'phone_call',recipientFeedback:'Test fixture closure'}]])await api(request,`/manager/orders/${id}/${suffix}`,manager,data);
 await page.reload();await expect(page.getByRole('heading',{name:'Order complete',exact:true})).toBeVisible();
 const final=(await api(request,`/manager/orders/${id}`,manager,undefined,'get')).order;expect(final.status).toBe('closed');expect(final.approvedVersionNumber).toBe(3);
 // Check this order's deliveries; account-security alerts use a separate worker.
 await expect.poll(async()=>{const inbox=await api(request,`/notifications/history?limit=100&orderId=${id}`,manager,undefined,'get');return inbox.notifications.length>0 && inbox.notifications.every(item=>['simulated','delivered','skipped'].includes(item.status));},{timeout:15000}).toBe(true);
});

for(const lang of ['en','sw'])for(const width of [320,390,430,768,1440])test(`real pages reflow at ${width}px in ${lang}`,async({page},testInfo)=>{
 await page.setViewportSize({width,height:900});await page.addInitScript(value=>localStorage.setItem('tinzel_language',value),lang);
 for(const path of ['/','/catalogue','/catalogue/acceptance-magazine?step=details','/catalogue/acceptance-magazine?step=story','/catalogue/acceptance-magazine?step=photos','/catalogue/acceptance-magazine?step=review','/track','/missing-page']){
  await page.goto(path);await expect(page.locator('#main-content')).toBeVisible();await expect(page.locator('.tinzel-loading')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),path).toBe(true);
 }
 if(width===390||width===1440){await page.goto('/');await page.screenshot({path:testInfo.outputPath(`home-${width}-${lang}.png`),fullPage:true});}
});

test('all sixteen question types keep stored values when language and steps change',async({page},testInfo)=>{
 await page.addInitScript(()=>{if(!localStorage.getItem('tinzel_language'))localStorage.setItem('tinzel_language','en');});await page.goto('/catalogue/acceptance-magazine?step=story');
 await page.getByRole('textbox',{name:'Test text',exact:true}).fill('Fictional words');await page.getByRole('textbox',{name:'Test textarea',exact:true}).fill('A fictional longer story.');
 await page.getByRole('spinbutton',{name:'Test number',exact:true}).fill('0');
 await page.getByLabel('Test date',{exact:true}).and(page.locator('input[type="date"]')).fill('2026-11-01');
 await page.getByLabel('Test datetime',{exact:true}).and(page.locator('input[type="datetime-local"]')).fill('2026-11-01T12:30');
 await page.getByLabel('Test time',{exact:true}).and(page.locator('input[type="time"]')).fill('12:30');
 await page.getByRole('textbox',{name:'Test duration',exact:true}).fill('02:10:00');
 await page.getByRole('combobox',{name:'Test dropdown',exact:true}).selectOption('One');
 await page.getByRole('group',{name:'Test radio',exact:true}).getByLabel('One',{exact:true}).check();await page.getByRole('group',{name:'Test checkbox',exact:true}).getByLabel('Two',{exact:true}).check();
 await page.getByLabel('Test linear_scale 1',{exact:true}).check();await page.getByLabel('Test rating 2',{exact:true}).check();
 await page.getByLabel('Test grid_radio: First — One',{exact:true}).check();await page.getByLabel('Test grid_checkbox: Second — Two',{exact:true}).check();
 await page.getByRole('button',{name:'SW',exact:true}).click();await expect(page.getByRole('combobox',{name:'Jaribio dropdown',exact:true})).toHaveValue('One');await expect(page.getByRole('spinbutton',{name:'Jaribio number',exact:true})).toHaveValue('0');await expect(page.getByRole('group',{name:'Jaribio radio',exact:true}).getByLabel('Moja',{exact:true})).toBeChecked();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('tinzel:answers:v2:acceptance-magazine'))?.data?.answers?.grid_radio?.First)).toBe('One');
 await page.getByRole('button',{name:'3 Picha',exact:true}).click();await expect(page.locator('#upload-photo_group')).toBeAttached();await expect(page.locator('#upload-photo_upload')).toBeAttached();
 await page.goBack();await expect(page.getByRole('textbox',{name:'Jaribio text',exact:true})).toHaveValue('Fictional words');await page.reload();await expect(page.getByRole('spinbutton',{name:'Jaribio number',exact:true})).toHaveValue('0');
 const accessibility=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(accessibility.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,html:n.html,reason:n.failureSummary}))}))).toEqual([]);
 await page.screenshot({path:testInfo.outputPath('question-types-sw.png'),fullPage:true});
});

for (const role of ['admin', 'manager']) test(`${role} opens all field editors, previews an edition and preserves unsaved work`,async({page},testInfo)=>{
 await page.addInitScript(()=>localStorage.setItem('tinzel_language','en'));await staffSignIn(page,role,'/staff/forms');
 await page.getByText('Acceptance magazine',{exact:true}).click();await expect(page.getByLabel('Response Type',{exact:true})).toHaveCount(16);
 const accessibility=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(accessibility.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,html:n.html,reason:n.failureSummary}))}))).toEqual([]);
 await page.getByRole('button',{name:'Preview',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Edition preview'});await expect(dialog).toBeVisible();await expect(dialog.getByText('Test grid_radio',{exact:true})).toBeVisible();
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);const title=page.getByLabel('Magazine Edition Title *',{exact:true});await title.fill('Unsaved fictional title');
 await page.getByRole('button',{name:'Back to Magazine Editions'}).click();await page.getByRole('dialog',{name:'Leave without saving?'}).getByRole('button',{name:'Keep editing',exact:true}).click();await expect(title).toHaveValue('Unsaved fictional title');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:testInfo.outputPath('edition-editor-mobile.png'),fullPage:true});
 await page.getByRole('button',{name:'Back to Magazine Editions'}).click();await page.getByRole('dialog',{name:'Leave without saving?'}).getByRole('button',{name:'Leave without saving',exact:true}).click();await expect(page.getByRole('heading',{name:'Magazine editions',exact:true})).toBeVisible();
});
