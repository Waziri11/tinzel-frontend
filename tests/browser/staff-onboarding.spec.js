import { test, expect } from '@playwright/test';
const json=(route,data)=>route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
const user={id:'designer-setup',name:'Juma Designer',email:'juma@example.test',role:'designer',preferredLanguage:'en',mustChangePassword:true,temporaryPasswordExpiresAt:new Date(Date.now()+86400000).toISOString()};
for(const mobile of [false,true])test(`first login forces password setup and survives refresh on ${mobile?'mobile':'desktop'}`,async({page})=>{
 await page.setViewportSize(mobile?{width:390,height:844}:{width:1440,height:900});
 await page.addInitScript(()=>localStorage.setItem('tinzel_language','en'));
 let ready=false,changed,profileCalls=0,businessWhileSetup=[];
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/api/staff/login')return json(route,{token:'setup-token',user});
  if(path==='/api/staff/me'){profileCalls++;return json(route,{user:{...user,mustChangePassword:!ready}});}
  if(path==='/api/staff/preferences')return json(route,{success:true});
  if(path==='/api/staff/change-password'){
   changed=route.request().postDataJSON();ready=true;return json(route,{token:'normal-token',user:{...user,mustChangePassword:false}});
  }
  if(!ready)businessWhileSetup.push(path);
  if(path==='/api/designer/orders')return json(route,{orders:[]});
  if(path==='/api/notifications/history')return json(route,{notifications:[],unreadCount:0});
  return json(route,{});
 });
 await page.goto('/staff/users');
 await page.getByPlaceholder('name@example.com').fill(user.email);await page.getByPlaceholder('••••••••').fill('Abc!2345');
 await page.getByRole('button',{name:'Sign In to Workstation'}).click();
 await expect(page.getByRole('heading',{name:'Set your own password'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Users',exact:true})).toHaveCount(0);
 await page.reload();await expect(page.getByRole('heading',{name:'Set your own password'})).toBeVisible();expect(profileCalls).toBeGreaterThan(0);expect(businessWhileSetup).toEqual([]);
 await page.getByLabel('Initial password',{exact:true}).fill('Abc!2345');await page.getByLabel('New password',{exact:true}).fill('ChosenPass!7');await page.getByLabel('Confirm new password',{exact:true}).fill('Different!7');
 await page.getByRole('button',{name:'Save password and continue'}).click();await expect(page.getByRole('alert')).toHaveText('New passwords do not match.');expect(changed).toBeUndefined();
 await page.getByLabel('Confirm new password',{exact:true}).fill('ChosenPass!7');
 await page.screenshot({path:`/tmp/tinzel-first-login-${mobile?'mobile':'desktop'}.png`,fullPage:true});
 await page.getByRole('button',{name:'Save password and continue'}).click();
 await expect(page.getByRole('heading',{name:'Design orders',exact:true})).toBeVisible();await expect(page).toHaveURL(/\/staff\/design$/);
 expect(changed).toEqual({currentPassword:'Abc!2345',newPassword:'ChosenPass!7'});
 const storage=await page.evaluate(()=>JSON.stringify(localStorage));expect(storage).not.toContain('ChosenPass!7');expect(storage).not.toContain('Abc!2345');expect(await page.evaluate(()=>localStorage.getItem('tinzel_staff_token'))).toBe('normal-token');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
});

test('admin creates staff without entering a password and can inspect or reissue credentials',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('tinzel_language','en');localStorage.setItem('tinzel_staff_token','admin-token');});
 const admin={_id:'admin-1',name:'Admin',email:'admin@example.test',role:'admin',isActive:true,preferredLanguage:'en',mustChangePassword:false};
 let staff=[admin],created,reissues=0;
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname,method=route.request().method();
  if(path==='/api/staff/me')return json(route,{user:admin});
  if(path==='/api/admin/staff'&&method==='POST'){
   created=route.request().postDataJSON();staff.push({_id:'new-user',...created,isActive:true,isEligibleForAssignment:true,createdAt:new Date().toISOString(),mustChangePassword:true,temporaryPasswordExpiresAt:user.temporaryPasswordExpiresAt,credentialGeneration:1,credentialDelivery:{sms:{status:'failed',attempts:1,error:'Credential delivery failed.'},email:{status:'sent',attempts:1}}});return json(route,{user:staff[1]});
  }
  if(path==='/api/admin/staff')return json(route,{staff});
  if(path==='/api/admin/staff/new-user')return json(route,{user:staff[1]});
  if(path==='/api/admin/staff/new-user/initial-password'){reissues++;staff[1]={...staff[1],credentialGeneration:2,credentialDelivery:{sms:{status:'sent',attempts:1},email:{status:'sent',attempts:1}}};return json(route,{user:staff[1]});}
  if(path==='/api/admin/audit-logs')return json(route,{logs:[]});
  if(path==='/api/notifications/history')return json(route,{notifications:[],unreadCount:0});
  if(path==='/api/notifications/diagnostics')return json(route,{diagnostics:{}});
  return json(route,{});
 });
 await page.goto('/staff/users');await page.getByRole('button',{name:'Add User',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Add Internal User'});
 await expect(dialog.locator('input[type=password]')).toHaveCount(0);
 await dialog.getByLabel('Full name').fill('New Designer');await dialog.getByLabel('Work email').fill('new@example.test');await dialog.getByLabel('Phone',{exact:true}).fill('0712000011');await dialog.getByLabel('Notification language',{exact:true}).selectOption('sw');
 await dialog.getByRole('button',{name:'Create Account',exact:true}).click();await expect.poll(()=>created?.preferredLanguage).toBe('sw');expect(created.password).toBeUndefined();
 await page.getByRole('button',{name:'View New Designer'}).click();const details=page.getByRole('dialog',{name:'view user'});
 await expect(details.getByText('Awaiting first sign-in',{exact:true})).toBeVisible();await expect(details.getByText(/SMS: failed/)).toBeVisible();await expect(details.getByText(/EMAIL: provider accepted/)).toBeVisible();
 page.once('dialog',dialog=>dialog.accept());await details.getByRole('button',{name:'Issue new initial password'}).click();await expect.poll(()=>reissues).toBe(1);await expect(details.getByText(/SMS: provider accepted/)).toBeVisible();
 await page.screenshot({path:'/tmp/tinzel-admin-onboarding.png',fullPage:true});
});
