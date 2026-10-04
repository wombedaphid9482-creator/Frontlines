'use strict';
// Commander frame/layout smoke only. No match, balance campaign or gameplay
// outcome is automated here; the battlefield fixture remains in its first turn.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.argv[2]||'playwright');
const base=process.env.FRONTLINES_TEST_URL||'http://127.0.0.1:4173',out=path.resolve(__dirname,'../test-results');
fs.mkdirSync(out,{recursive:true});
const sizes=[[1366,768],[900,600],[390,844]];
async function geometry(page,selector){return page.evaluate(selector=>{
 const box=n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
 return {page:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],rows:[...document.querySelectorAll(selector)].map(n=>({box:box(n),art:n.querySelector('.art-commander')?box(n.querySelector('.art-commander')):null,image:n.querySelector('.art-commander img')?box(n.querySelector('.art-commander img')):null,name:n.querySelector('h2,h3,.commander-name,b')?box(n.querySelector('h2,h3,.commander-name,b')):null}))};
},selector);}
function inWindow(g,width,height){assert.ok(g.page[0]<=width+1&&g.page[1]<=height+1,'Page overflow '+JSON.stringify(g.page));}
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[],results=[];
  page.on('pageerror',e=>errors.push(e.message));
  for(const [width,height] of sizes){
   await page.setViewportSize({width,height});
   await page.goto(base+'/collection.html#commanders');
   await page.waitForFunction(()=>document.querySelectorAll('.commander-catalog-card').length===10);
   // Load offscreen portraits for asset-boundary QA; normal play stays lazy.
   await page.evaluate(()=>document.querySelectorAll('.commander-catalog-art img').forEach(i=>i.loading='eager'));
   await page.waitForFunction(()=>[...document.querySelectorAll('.commander-catalog-art img')].every(i=>i.complete&&i.naturalWidth>0));
   await page.evaluate(async()=>Promise.all([...document.querySelectorAll('.commander-catalog-art img')].map(i=>i.decode())));
   const catalog=await geometry(page,'.commander-catalog-card');inWindow(catalog,width,height);assert.equal(catalog.rows.length,10);
   for(const c of catalog.rows){assert.ok(c.box.left>=0&&c.box.right<=width+1);assert.ok(c.art.height>=240,'Commander catalog portrait too small');assert.ok(c.art.bottom<c.name.top);assert.ok(c.image.top>=c.art.top-1&&c.image.bottom<=c.art.bottom+1,'Illustration escapes frame');}
   await page.screenshot({path:path.join(out,'v102-commanders-catalog-'+width+'.png')});
   await page.goto(base+'/deck-builder.html');await page.waitForFunction(()=>!!window.FrontlinesDeckBuilder);
   const banner=await geometry(page,'.builder-commander-banner');inWindow(banner,width,height);
   await page.locator('[data-action="commander-flow"]').click();
   await page.waitForFunction(()=>[...document.querySelectorAll('.commander-choice img')].every(i=>i.complete&&i.naturalWidth>0));
   await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('.commander-choice img')].map(i=>i.decode()));await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
   const choices=await geometry(page,'.commander-choice');inWindow(choices,width,height);assert.equal(choices.rows.length,2);
   const dialog=await page.locator('#deck-dialog').boundingBox();assert.ok(dialog.x>=0&&dialog.x+dialog.width<=width+1);
   for(const c of choices.rows){assert.ok(c.box.left>=dialog.x&&c.box.right<=dialog.x+dialog.width);assert.ok(c.art.height>=160);assert.ok(c.art.bottom<=c.name.top+1);assert.ok(c.image.top>=c.art.top-1&&c.image.bottom<=c.art.bottom+1);}
   const continuation=await page.locator('[data-dialog-action="commander-foundation"]').boundingBox();assert.ok(continuation.y>=0&&continuation.y+continuation.height<=height+1,'Chooser continuation is below dialog fold');
   const footer=await page.locator('.commander-flow .arsenal-dialog-actions').boundingBox();for(const c of choices.rows)assert.ok(c.name.bottom<=footer.y+1,'Chooser footer hides Commander nameplate');
   await page.screenshot({path:path.join(out,'v102-commanders-choice-'+width+'.png')});
   await page.locator('[data-dialog-action="close"]').click();
   await page.goto(base);await page.waitForFunction(()=>!!window.FrontlinesApp);
   await page.evaluate(()=>FrontlinesApp.startMatch({factions:['stonewall','bruiser'],mode:'hotseat',developer:true,bothHands:true,seed:90901}));
   // Both intro banners play sequentially on narrow windows.
   await page.waitForTimeout(3000);
   await page.waitForFunction(()=>[...document.querySelectorAll('.commander-panel img')].every(i=>i.complete&&i.naturalWidth>0));
   await page.evaluate(async()=>Promise.all([...document.querySelectorAll('.commander-panel img')].map(i=>i.decode())));
   const hud=await geometry(page,'.commander-panel');inWindow(hud,width,height);assert.equal(hud.rows.length,2);
   for(const c of hud.rows){assert.ok(c.box.left>=0&&c.box.right<=width+1);assert.ok(c.art.width>=39&&Math.abs(c.art.width-c.art.height)<=1);}
   const fieldHeight=await page.evaluate(()=>{const a=document.querySelector('.map-scroll').getBoundingClientRect(),b=document.querySelector('.battlefield').getBoundingClientRect();return Math.max(0,Math.min(a.bottom,b.bottom,innerHeight)-Math.max(a.top,b.top,0));});assert.ok(fieldHeight>=64,'Commander frame collapsed battlefield');
   await page.screenshot({path:path.join(out,'v102-commanders-match-'+width+'.png')});
   await page.locator('[data-action="commander-inspect"]').first().click();
   await page.waitForFunction(()=>[...document.querySelectorAll('.modal .commander-brief img')].every(i=>i.complete&&i.naturalWidth>0));
   await page.evaluate(async()=>Promise.all([...document.querySelectorAll('.modal .commander-brief img')].map(i=>i.decode())));
   const brief=await geometry(page,'.modal .commander-brief');inWindow(brief,width,height);assert.equal(brief.rows.length,1);assert.ok(brief.rows[0].art.height>=350);
   assert.ok(await page.locator('.modal .commander-brief h3').count()===3);
   const overlap=await page.evaluate(()=>{const art=document.querySelector('.modal .commander-brief>.art-commander').getBoundingClientRect();return [...document.querySelectorAll('.modal .commander-brief h2,.modal .commander-brief h3,.modal .commander-brief p')].some(n=>{const r=n.getBoundingClientRect();return r.left<art.right&&r.right>art.left&&r.top<art.bottom&&r.bottom>art.top;});});assert.equal(overlap,false,'Commander art overlaps briefing text');
   await page.screenshot({path:path.join(out,'v102-commanders-brief-'+width+'.png')});
   results.push({width,height,catalog:10,choices:2,portraitFramed:true,rulesSeparate:true,battlefieldVisibleHeight:fieldHeight,pageOverflow:false});
  }
  assert.deepEqual(errors,[]);const result={ok:true,viewports:results,errors,balanceRuns:0,matchOutcomes:0};
  fs.writeFileSync(path.join(out,'v102-commanders-ui.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
