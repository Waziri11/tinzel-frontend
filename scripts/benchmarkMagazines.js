// Opt-in staging journey: this commits drafts to the five disposable orders in the input file.
import {chromium} from '@playwright/test';
import {readFile,stat,writeFile} from 'node:fs/promises';
const configPath=process.argv[2];
if(!configPath||!process.argv.includes('--run'))throw new Error('Usage: node scripts/benchmarkMagazines.js /private/staging-benchmark.json --run');
const config=JSON.parse(await readFile(configPath,'utf8'));
if(config.uploads?.length!==5||config.readers?.length!==20)throw new Error('Provide five disposable upload orders and twenty authorized reader journeys');
const mbps=Number(config.mbps),latency=Number(config.latencyMs);
if(![10,20,50].includes(mbps)||![100,200,300].includes(latency))throw new Error('Choose 10/20/50 Mbps and 100/200/300 ms');
for(const item of config.uploads){const bytes=(await stat(item.file)).size;if(bytes<150*1024**2||bytes>500*1024**2)throw new Error('Use representative 150–500 MiB PDFs');}
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'}),results=[];
const setup=async item=>{const context=await browser.newContext();const page=await context.newPage();await context.addInitScript(token=>{localStorage.setItem('tinzel_staff_token',token);localStorage.setItem('tinzel_language','en');},item.token);const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency,downloadThroughput:mbps*1e6/8,uploadThroughput:mbps*1e6/8});return {page,context};};
try{
 await Promise.all([...config.uploads.map(async(item,index)=>{
  const {page,context}=await setup(item);try{
   await page.goto(new URL(`/staff/design/orders/${item.orderId}`,config.baseUrl).href);const english=page.getByRole('button',{name:'English EN'});if(await english.isVisible())await english.click();
   await page.getByRole('button',{name:'Upload new draft',exact:true}).click();await page.locator('#draft-pdf').setInputFiles(item.file);await page.locator('#draft-summary').fill('Staging performance validation');
   let finalizationMs;const starts=new WeakMap();page.on('request',req=>{if(req.url().endsWith('/complete')&&req.url().includes('draft-uploads'))starts.set(req,performance.now());});page.on('response',res=>{const start=starts.get(res.request());if(start&&res.ok())finalizationMs=performance.now()-start;});
   const start=performance.now();await page.getByRole('button',{name:'Send to manager review',exact:true}).click();await page.getByRole('dialog',{name:'Upload new draft'}).waitFor({state:'hidden',timeout:900000});const durationMs=performance.now()-start;
   await page.getByAltText('Magazine page 1',{exact:true}).waitFor({state:'visible',timeout:120000});const coverMs=performance.now()-start-durationMs,size=(await stat(item.file)).size,targetMs=1.25*(size*8/(mbps*1e6))*1000+5000;
   results.push({kind:'upload',index,sizeBytes:size,durationMs,finalizationMs,coverMs,targetMs,withinTransferTarget:durationMs<=targetMs});
  }catch(e){results.push({kind:'upload',index,failed:true,error:e.name});}finally{await context.close();}
 }),...config.readers.map(async(item,index)=>{
  const {page,context}=await setup(item);try{const start=performance.now();await page.goto(new URL(item.path,config.baseUrl).href);const english=page.getByRole('button',{name:'English EN'});if(await english.isVisible())await english.click();await page.getByAltText('Magazine page 1',{exact:true}).waitFor({state:'visible',timeout:120000});results.push({kind:'reader',index,coverMs:performance.now()-start});}catch(e){results.push({kind:'reader',index,failed:true,error:e.name});}finally{await context.close();}
 })]);
 const p95=values=>{const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);return sorted[Math.ceil(sorted.length*.95)-1]??null;};
 const report={at:new Date().toISOString(),mbps,latencyMs:latency,results,p95:{preparedCoverMs:p95(results.filter(r=>r.kind==='reader').map(r=>r.coverMs)),newCoverMs:p95(results.filter(r=>r.kind==='upload').map(r=>r.coverMs)),finalizationMs:p95(results.map(r=>r.finalizationMs))}};
 await writeFile(config.reportPath||'/tmp/tinzel-magazine-benchmark.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report.p95));if(results.some(r=>r.failed||r.withinTransferTarget===false)||report.p95.preparedCoverMs>2000||report.p95.newCoverMs>15000||report.p95.finalizationMs>3000)process.exitCode=1;
}finally{await browser.close();}
