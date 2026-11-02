import {test,expect} from '@playwright/test';
import {securityLogin} from './security-login.js';
async function sessionContext(browser,request,role){const token=await securityLogin(request,role);const context=await browser.newContext();await context.addCookies([{name:'tinzel_staff',value:token,url:'http://127.0.0.1:5177',httpOnly:true,sameSite:'Strict'}]);await context.addInitScript(()=>localStorage.setItem('tinzel_language','en'));return {context,token};}
const auth=token=>({Cookie:'',Authorization:`Bearer ${token}`});
test('admin SMS OTP rejects incorrect codes, signs in, and keeps credentials out of browser storage',async({page,request},info)=>{
 await request.post('http://127.0.0.1:5078/__test__/reset-otp-limits');await page.addInitScript(()=>localStorage.setItem('tinzel_language','en'));await page.setViewportSize({width:390,height:844});const authRequests=[];page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/staff/'))authRequests.push(r);});
 const initial=await page.goto('/staff/login');if(process.env.SECURITY_PRODUCTION_PREVIEW)expect(initial.headers()['content-security-policy']).toContain("script-src 'self'");
 await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();expect(authRequests).toHaveLength(0);
 await page.getByLabel('Work Email Address',{exact:true}).fill('admin@example.test');await page.getByLabel('Password',{exact:true}).fill('Browser!2026');await expect(page.getByLabel('Sign-in verification channel')).toHaveCount(0);
 const login=page.waitForResponse(r=>r.url().endsWith('/staff/login'));await page.getByRole('button',{name:'Sign in',exact:true}).click();const challenge=await (await login).json();expect(authRequests.filter(r=>r.url().endsWith('/staff/login'))).toHaveLength(1);await expect(page.getByRole('dialog')).toBeVisible();
 await page.screenshot({path:info.outputPath('verification-mobile.png')});await page.setViewportSize({width:1280,height:900});await page.screenshot({path:info.outputPath('verification-desktop.png')});await page.setViewportSize({width:390,height:844});
 await page.getByLabel('Verification code',{exact:true}).fill('000000');await page.getByRole('button',{name:'Verify code',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Invalid verification code');
 const code=(await (await request.get(`http://127.0.0.1:5078/__test__/otp/${challenge.challengeId}`)).json()).code;
 await page.getByLabel('Verification code',{exact:true}).fill(code);await page.getByRole('button',{name:'Verify code',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:'Security / Usalama',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('tinzel_staff_token'))).toBeNull();expect((await page.context().cookies()).find(c=>c.name==='tinzel_staff').httpOnly).toBe(true);
 await page.getByRole('button',{name:'Security / Usalama'}).click();await expect(page.getByRole('button',{name:'Close',exact:true})).toBeFocused();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await page.screenshot({path:info.outputPath('mobile-otp-session.png'),fullPage:true});
});
test('manager downloads the original with an audit trail; designer and unauthenticated requests cannot',async({browser,request},info)=>{
 const {context,token}=await sessionContext(browser,request,'manager');const page=await context.newPage();
 const orders=await (await request.get('/api/manager/orders',{headers:auth(token)})).json();const order=orders.orders.find(o=>o.trackingId==='TNZ-SECURITY-1');expect(order).toBeTruthy();
 await page.goto(`/staff/design-phase?orderId=${order._id}&tab=drafts`);await expect(page.getByAltText('Magazine page 1')).toBeVisible();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download original PDF',exact:true}).click();expect((await download).suggestedFilename()).toContain('.pdf');
 const audit=await (await request.get(`/api/security/downloads?orderId=${order._id}`,{headers:auth(token)})).json();expect(audit.events.some(e=>e.action==='DOWNLOAD_COMPLETED')).toBe(true);
 const designer=await securityLogin(request,'designer');expect((await request.get(`/api/security/orders/${order._id}/download/1`,{headers:auth(designer)})).status()).toBe(403);
 expect((await request.get(`/api/security/orders/${order._id}/download/1`,{headers:{Cookie:''}})).status()).toBe(401);
 await page.screenshot({path:info.outputPath('manager-watermarked-book.png'),fullPage:true});await context.close();
});
test('printer invitation requires SMS and a revoked invitation stops further downloads',async({browser,request},info)=>{
 const manager=await securityLogin(request,'manager');const orders=await (await request.get('/api/manager/orders',{headers:auth(manager)})).json();const order=orders.orders.find(o=>o.trackingId==='TNZ-SECURITY-2');
 const inviteResponse=await request.post(`/api/printer/orders/${order._id}/invite`,{headers:auth(manager),data:{}});expect(inviteResponse.ok()).toBe(true);const invitation=await inviteResponse.json();
 const context=await browser.newContext();const page=await context.newPage();await page.goto(invitation.url);await expect(page.getByRole('link',{name:'Download authorized print file'})).toHaveCount(0);
 const sent=page.waitForResponse(r=>r.url().endsWith('/otp'));await page.getByRole('button',{name:'Send SMS code'}).click();const challenge=await (await sent).json();
 const code=(await (await request.get(`http://127.0.0.1:5078/__test__/otp/${challenge.challengeId}`)).json()).code;
 await page.getByLabel('Printer SMS code').fill(code);await page.getByRole('button',{name:'Verify printer'}).click();await expect(page.getByRole('link',{name:'Download authorized print file'})).toBeVisible();
 const download=page.waitForEvent('download');await page.getByRole('link',{name:'Download authorized print file'}).click();expect((await download).suggestedFilename()).toBe('tinzel-magazine.pdf');
 await page.screenshot({path:info.outputPath('printer-verified.png'),fullPage:true});
 const revoked=await request.post(`/api/printer/orders/${order._id}/revoke`,{headers:auth(manager),data:{}});expect(revoked.ok()).toBe(true);
 await page.getByRole('link',{name:'Download authorized print file'}).click();await expect(page.getByRole('alert')).toContainText('unavailable');await expect(page.getByRole('link',{name:'Download authorized print file'})).toHaveCount(0);await context.close();
});

test('Staff Login navigation shows the form without restoring an existing session',async({browser,request})=>{
 const {context}=await sessionContext(browser,request,'manager');const page=await context.newPage();const authRequests=[];
 page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/staff/'))authRequests.push(r.url());});
 await page.goto('/');await page.getByRole('link',{name:'Staff Login',exact:true}).click();
 await expect(page).toHaveURL(/\/staff\/login$/);await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();
 await expect(page.getByRole('dialog')).toHaveCount(0);expect(authRequests).toHaveLength(0);
 await page.reload();await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();expect(authRequests).toHaveLength(0);
 await context.close();
});
