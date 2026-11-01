import {test,expect} from './fixtures.js';
import AxeBuilder from '@axe-core/playwright';
const json=(route,data)=>route.fulfill({json:data});
async function publicFixture(page){await page.route('**/api/public/forms',route=>json(route,{forms:[]}));}
async function staffFixture(page,role,lang){
 await page.addInitScript(()=>{localStorage.setItem('tinzel_staff_token','isolated-ui');});
 await page.route('**/api/staff/me',route=>json(route,{user:{_id:'accessibility-user',name:'Fictional Staff',email:'fixture@example.test',role,preferredLanguage:lang}}));
 await page.route('**/api/manager/orders?*',route=>json(route,{orders:[],total:0,page:1,pageCount:1,summary:{},statusCounts:{}}));
 await page.route('**/api/manager/designers',route=>json(route,{designers:[]}));
 await page.route('**/api/manager/settings',route=>json(route,{printer:{configured:false}}));
 await page.route('**/api/designer/orders*',route=>json(route,{orders:[]}));
 await page.route('**/api/designer/returns*',route=>json(route,{returns:[],summary:{}}));
 await page.route('**/api/admin/forms',route=>json(route,{forms:[]}));
 await page.route('**/api/admin/staff',route=>json(route,{staff:[]}));
 await page.route('**/api/admin/audit-logs',route=>json(route,{logs:[]}));
 await page.route('**/api/notifications/diagnostics',route=>json(route,{diagnostics:{}}));
 await page.route('**/api/notifications/settings',route=>json(route,{settings:{channels:{in_system:true,email:true,sms:true},triggers:{},catalog:[]}}));
}
for(const [role,paths] of [['public',['/','/catalogue','/track','/staff','/not-found']],['manager',['/staff/pre-design','/staff/design-phase','/staff/post-design','/staff/returns','/staff/notifications']],['designer',['/staff/design','/staff/returns']],['admin',['/staff/forms','/staff/users','/staff/notifications']]])for(const width of [390,1440])for(const lang of ['en','sw'])test(`${role} keyboard labels, contrast and reflow at ${width} in ${lang}`,async({page},testInfo)=>{
 await page.setViewportSize({width,height:900});await page.addInitScript(value=>localStorage.setItem('tinzel_language',value),lang);await publicFixture(page);if(role!=='public')await staffFixture(page,role,lang);
 for(const path of paths){await page.goto(path);await expect(page.locator('#main-content')).toBeVisible();await expect(page.locator('.tinzel-loading')).toHaveCount(0);await expect(page.locator('.spin')).toHaveCount(0);
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  expect(result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)})),path).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),path).toBe(true);
 }
 await page.screenshot({path:testInfo.outputPath(`${role}-${width}.png`),fullPage:true});
});

test('catalogue failure, empty search and missing routes offer translated recovery',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('tinzel_language','sw'));let fail=true;
 await page.route('**/api/public/forms',route=>fail?route.fulfill({status:503,json:{message:'Unavailable'}}):json(route,{forms:[{slug:'fixture',title:'Fictional edition',titleSw:'Toleo la mfano',price:50000,currency:'TZS'}]}));
 await page.goto('/catalogue');await expect(page.getByRole('alert')).toContainText('Matoleo hayajafunguka');fail=false;await page.getByRole('button',{name:'Jaribu tena'}).click();await expect(page.getByText('Toleo la mfano',{exact:true}).first()).toBeVisible();
 await page.getByRole('searchbox').fill('No matching fixture');await expect(page.getByText('Hakuna matoleo yaliyopatikana')).toBeVisible();await page.getByRole('button',{name:'Futa Utafutaji'}).click();
 await page.goto('/a-missing-page');await expect(page.getByRole('heading',{name:'Ukurasa haupatikani'})).toBeVisible();
});

test('client session expiry clears protected customer content and retains a separate staff sign-in',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('tinzel_language','en');localStorage.setItem('tinzel_staff_token','valid-staff');sessionStorage.setItem('tinzel_client_token','expired-client');});
 await page.route('**/api/client/order',route=>route.fulfill({status:401,json:{message:'Expired customer session'}}));
 await page.goto('/track');await expect(page.locator('#track-login-id')).toBeVisible();expect(await page.evaluate(()=>sessionStorage.getItem('tinzel_client_token'))).toBeNull();expect(await page.evaluate(()=>localStorage.getItem('tinzel_staff_token'))).toBe('valid-staff');
});

test('account dialogs contain keyboard focus and return it on close',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('tinzel_language','en'));await staffFixture(page,'admin','en');await page.goto('/staff/users');
 const opener=page.getByRole('button',{name:'Add User',exact:true});await opener.click();const dialog=page.getByRole('dialog',{name:'Add Internal User'});await expect(dialog).toBeVisible();
 await expect.poll(()=>dialog.evaluate(element=>element.contains(document.activeElement))).toBe(true);
 const first=dialog.getByRole('button',{name:'Close',exact:true});await first.focus();await page.keyboard.press('Shift+Tab');expect(await dialog.evaluate(element=>element.contains(document.activeElement))).toBe(true);
 await page.keyboard.press('Tab');await expect(first).toBeFocused();await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();
});

for(const role of ['public','admin'])test(`200 percent desktop layout equivalent preserves ${role} controls`,async({page})=>{
 // A 1440px display at 200% browser zoom has 720 CSS pixels for layout.
 await page.setViewportSize({width:720,height:450});await page.addInitScript(()=>localStorage.setItem('tinzel_language','en'));await publicFixture(page);if(role==='admin')await staffFixture(page,role,'en');
 for(const path of role==='public'?['/','/catalogue','/track','/staff']:['/staff/forms','/staff/users','/staff/notifications']){await page.goto(path);await expect(page.locator('.tinzel-loading')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),path).toBe(true);const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(result.violations.map(item=>item.id),path).toEqual([]);}
});

for(const role of ['manager','designer','admin'])for(const width of [320,430,768])test(`${role} staff reflow at ${width}px in both languages`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.addInitScript(()=>localStorage.setItem('tinzel_language','en'));
 const paths=role==='manager'?['/staff/pre-design','/staff/design-phase','/staff/post-design','/staff/returns','/staff/notifications']:role==='designer'?['/staff/design','/staff/returns']:['/staff/forms','/staff/users','/staff/notifications'];
 for(const lang of ['en','sw']){await staffFixture(page,role,lang);for(const path of paths){await page.goto(path);await expect(page.locator('.tinzel-loading')).toHaveCount(0);await expect(page.locator('html')).toHaveAttribute('lang',lang);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${path}: ${lang}`).toBe(true);}}
});
