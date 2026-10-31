import { test, expect } from '@playwright/test';
const json=(route,data)=>route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
const staff={id:'staff-1',name:'Neema Manager',role:'admin',preferredLanguage:'en'};
const order={_id:'order-1',submissionId:'SUB-2026-001',trackingId:'TNZ-2026-001',clientName:'Asha',clientWhatsApp:'0712000000',formTitle:'Magazine',status:'assigned',clientPreferredLanguage:'sw',draftVersions:[]};

test('staff language persists, actual channel outcomes are shown, and unconfirmed retries require explicit acknowledgement',async({page})=>{
 let preference='en',writes=[],retryBody;
 await page.addInitScript(()=>{localStorage.setItem('tinzel_language','en');localStorage.setItem('tinzel_staff_token','test-staff');});
 await page.route('**/api/staff/me',route=>json(route,{user:{...staff,preferredLanguage:preference}}));
 await page.route('**/api/staff/preferences',route=>{preference=route.request().postDataJSON().preferredLanguage;writes.push(preference);return json(route,{success:true,preferredLanguage:preference});});
 const items=[{_id:'inapp',channel:'in_system',status:'delivered',eventGroupId:'event-1',workflowEventKey:'key-1',title:'Verify payment',message:'New order awaits payment verification.',isRead:false,attempts:1},
  {_id:'sms',channel:'sms',status:'unconfirmed',eventGroupId:'event-1',workflowEventKey:'key-1',title:'Verify payment',message:'New order awaits payment verification.',errorMessage:'Provider acceptance is unconfirmed.',attempts:1},
  {_id:'email',channel:'email',status:'sent',eventGroupId:'event-1',workflowEventKey:'key-1',title:'Verify payment',message:'New order awaits payment verification.',attempts:1}];
 await page.route('**/api/notifications/history?*',route=>json(route,{notifications:items,unreadCount:1,channelCounts:{all:3,in_system:1,email:1,sms:1}}));
 await page.route('**/api/notifications/diagnostics',route=>json(route,{diagnostics:{}}));
 await page.route('**/api/notifications/settings',route=>json(route,{settings:{channels:{in_system:true,email:true,sms:true},triggers:{},catalog:[]}}));
 await page.route('**/api/notifications/resend/sms',route=>{retryBody=route.request().postDataJSON();return json(route,{success:true});});
 await page.route('**/api/admin/config',route=>route.request().method()==='PUT'?json(route,{success:true}):json(route,{configs:[{key:'printer_preferred_language',value:'sw'}]}));
 await page.goto('/staff/notifications');await expect(page.getByText('Verify payment',{exact:true})).toBeVisible();
 await expect(page.getByText(/EMAIL: provider accepted/)).toBeVisible();await expect(page.getByText(/SMS: unconfirmed/)).toBeVisible();
 await page.getByRole('button',{name:'SW',exact:true}).click();await expect.poll(()=>writes).toEqual(['sw']);
 await page.reload();await expect(page.getByRole('button',{name:'SW',exact:true})).toHaveAttribute('aria-pressed','true');expect(writes).toEqual(['sw']);
 page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('button',{name:'Retry SMS',exact:true}).click();expect(retryBody).toBeUndefined();
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Retry SMS',exact:true}).click();await expect.poll(()=>retryBody).toEqual({channel:'sms',confirmUncertain:true});
 await page.screenshot({path:'/tmp/tinzel-workflow-notifications-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Notification Triggers & Settings'}).click();await expect(page.getByLabel('Printer notification language')).toHaveValue('sw');
 await page.getByLabel('Printer notification language').selectOption('en');await page.getByRole('button',{name:'Save printer language'}).click();await expect(page.getByText('Printer notification language saved.')).toBeVisible();
});

test('customer sees a private mobile inbox, marks messages read, saves language and polls only while signed in',async({page})=>{
 await page.clock.install();
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>{localStorage.setItem('tinzel_language','en');sessionStorage.setItem('tinzel_client_token','test-client');});
 let language='sw',read=false,historyCalls=0;
 await page.route('**/api/client/order',route=>json(route,{order:{...order,clientPreferredLanguage:language}}));
 await page.route('**/api/client/preferences',route=>{language=route.request().postDataJSON().preferredLanguage;return json(route,{success:true});});
 await page.route('**/api/client/notifications',route=>{historyCalls++;return json(route,{notifications:[{_id:'client-note',title:'Malipo yamethibitishwa',message:'Malipo ya jarida lako yamethibitishwa.',isRead:read,createdAt:'2026-10-31T10:00:00Z'}],unreadCount:read?0:1});});
 await page.route('**/api/client/notifications/client-note/read',route=>{read=true;return json(route,{success:true});});
 await page.goto('/track');await expect(page.getByRole('button',{name:'SW',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByText('Taarifa (1)',{exact:true}).click();await expect(page.getByText('Malipo yamethibitishwa',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Weka imesomwa'}).click();await expect.poll(()=>read).toBe(true);await expect(page.locator('summary')).toHaveText('Taarifa');
 await page.getByRole('button',{name:'EN',exact:true}).click();await expect.poll(()=>language).toBe('en');
 await expect(page.locator('summary')).toHaveText('Notifications');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
 await page.screenshot({path:'/tmp/tinzel-workflow-customer-mobile.png',fullPage:true});
 const beforeTimer=historyCalls;await page.clock.fastForward(30000);await expect.poll(()=>historyCalls).toBeGreaterThan(beforeTimer);
 const before=historyCalls;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect.poll(()=>historyCalls).toBeGreaterThan(before);
 await page.getByRole('button',{name:/Sign out|Logout|Log out/i}).click();const afterLogout=historyCalls;
 await page.clock.fastForward(60000);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));expect(historyCalls).toBe(afterLogout);
});
