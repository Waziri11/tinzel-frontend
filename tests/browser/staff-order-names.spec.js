import { test, expect } from './fixtures.js';
const json = (route, data) => route.fulfill({ json: data });
const orders = [
  { _id:'internal-one', trackingId:'TNZ-2026-101', submissionId:'SUB-2026-101', clientName:'Asha Mushi', formTitle:'Wedding Magazine', status:'assigned', updatedAt:'2026-11-06T10:00:00Z',createdAt:'2026-11-06T10:00:00Z',draftVersions:[] },
  { _id:'internal-two', trackingId:'TNZ-2026-102', submissionId:'SUB-2026-102', clientName:'Asha Mushi', formTitle:'Birthday Magazine', status:'assigned', updatedAt:'2026-11-07T10:00:00Z',createdAt:'2026-11-07T10:00:00Z',draftVersions:[] },
];
async function staff(page, role, lang='en') {
 await page.addInitScript(lang=>localStorage.setItem('tinzel_language',lang),lang);
 await page.route('**/api/staff/me',route=>json(route,{user:{_id:'staff',name:'Test Staff',role,preferredLanguage:lang,isActive:true}}));
}
for (const [lang,width] of [['en',1280],['sw',390]]) test(`designer chooses same-name orders separately in ${lang}`,async({page})=>{
 await staff(page,'designer',lang);await page.setViewportSize({width,height:844});
 const searches=[];
 await page.route(url=>url.pathname==='/api/designer/orders',route=>{
  const params=new URL(route.request().url()).searchParams;searches.push(params.get('search'));
  const list=params.get('column')==='new'?orders:[];return json(route,{orders:list,total:list.length,pageCount:1});
 });
 await page.route('**/api/designer/orders/internal-two',route=>json(route,{order:orders[1],auditLogs:[]}));
 await page.goto('/staff/design');
 await expect(page.locator('.designer-kanban-card')).toHaveCount(2);
 await expect(page.locator('main')).not.toContainText(/TNZ-|SUB-|internal-one|internal-two/);
 await page.locator('.designer-kanban-search input').fill('Asha');
 await expect.poll(()=>searches.includes('Asha')).toBe(true);
 const card=page.locator('.designer-kanban-card').filter({hasText:'Birthday Magazine'});
 await card.getByRole('button').click();
 await expect(page).toHaveURL(/\/orders\/internal-two$/);
 await expect(page.getByRole('heading',{name:'Asha Mushi',exact:true})).toBeVisible();
 await expect(page.locator('main')).not.toContainText(/TNZ-|SUB-|internal-two/);
});

test('manager security selects a sender by name and keeps the selected internal identity',async({page})=>{
 await staff(page,'manager');
 await page.route('**/api/staff/security',route=>json(route,{sessions:[],devices:[],events:[]}));
 await page.route('**/api/manager/designers',route=>json(route,{designers:[]}));
 await page.route('**/api/manager/settings',route=>json(route,{printer:{}}));
 await page.route(url=>url.pathname==='/api/manager/orders',route=>json(route,{orders,total:2,pageCount:1,summary:{},statusCounts:{}}));
 let requested;
 await page.route('**/api/security/downloads?*',route=>{requested=new URL(route.request().url()).searchParams.get('orderId');return json(route,{events:[{eventId:'event',orderId:'internal-two',orderClientName:'Asha Mushi',version:2,actorName:'Manager',action:'DOWNLOAD_COMPLETED',createdAt:'2026-11-07T10:00:00Z'}]});});
 await page.goto('/staff/pre-design');
 await page.getByRole('button',{name:'Security'}).click();
 await page.getByLabel('Select an order',{exact:true}).selectOption('internal-two');
 await page.getByRole('button',{name:'Search download history',exact:true}).click();
 await expect.poll(()=>requested).toBe('internal-two');
 await expect(page.getByRole('dialog')).toContainText('Asha Mushi / 2');
 await expect(page.getByRole('dialog')).not.toContainText(/TNZ-|SUB-|internal-two/);
});

test('staff notification titles, messages and badges use the sender name',async({page})=>{
 await staff(page,'designer');
 await page.route('**/api/notifications/history?*',route=>json(route,{notifications:[{_id:'note',orderId:orders[0],title:'Draft ready: TNZ-2026-101',message:'Tracking ID: TNZ-2026-101\nSubmission ID: SUB-2026-101\nVersion 2\nhttps://tinzel.gifts/staff/design/orders/internal-one',channel:'in_system',status:'delivered',isRead:true,createdAt:'2026-11-07T10:00:00Z'}],unreadCount:0,channelCounts:{all:1,in_system:1}}));
 await page.goto('/staff/notifications');
 await expect(page.getByText('Draft ready: Asha Mushi',{exact:true})).toBeVisible();
 await expect(page.locator('main')).not.toContainText(/TNZ-|SUB-|internal-one/);
});
