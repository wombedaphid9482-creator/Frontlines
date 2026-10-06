'use strict';
// Responsive card and crop checks. No simulation campaign or completed match.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.argv[2]||'playwright');
const origin=process.env.FRONTLINES_TEST_URL||'http://127.0.0.1:4173',out=path.resolve(__dirname,'../test-results');
const phase=process.env.FRONTLINES_ART_PHASE||'framing',report={passed:false,phase,contexts:[],errors:[],campaigns:0,completeMatches:0};
const sizes=[[1920,1080],[1600,900],[1366,768],[1280,720],[900,600],[390,844]];fs.mkdirSync(out,{recursive:true});
async function check(page,selector,surface){const r=await page.evaluate(({selector,surface})=>{
  const box=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
  return {surface,viewport:{width:innerWidth,height:innerHeight},document:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},cards:[...document.querySelectorAll(selector)].map(n=>{const art=n.querySelector('.card-portrait,.arsenal-portrait'),region=n.querySelector('.card-art,.collection-art,.arsenal-art');return {id:n.dataset.id||n.dataset.uid,box:box(n),art:art?box(art):null,region:region?box(region):null,refined:art?.classList.contains('art-refined'),size:art?getComputedStyle(art).backgroundSize:null};})};
},{selector,surface});
  assert.ok(r.cards.length,surface+' cards');assert.ok(r.document.width<=r.viewport.width+1,surface+' horizontal page overflow');
  if(surface!=='full briefing')assert.ok(r.document.height<=r.viewport.height+1,surface+' vertical page overflow');
  for(const c of r.cards){assert.ok(Math.abs(c.box.width/c.box.height-5/7)<.012,surface+' card ratio '+JSON.stringify(c));if(c.refined){assert.equal(c.size,'cover');assert.ok(Math.abs(c.art.width-c.region.width)<=3&&Math.abs(c.art.height-c.region.height)<=3,surface+' refined region fill '+JSON.stringify(c));}}
  report.contexts.push({surface,width:r.viewport.width,height:r.viewport.height,cards:r.cards.length,refined:r.cards.filter(c=>c.refined).length,pageScroll:r.document});
}
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{
  const page=await browser.newPage({viewport:{width:1366,height:768}});page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
  await page.goto(origin+'/collection.html');await page.waitForFunction(()=>!!window.FrontlinesCollectionApp);await page.locator('#collection-faction-filter').selectOption('stonewall');
  for(const [width,height]of sizes){await page.setViewportSize({width,height});await check(page,'.collection-card-inspect','Collection');await page.screenshot({path:path.join(out,'sprint12-collection-'+width+'-'+phase+'.png')});}
  await page.goto(origin+'/deck-builder.html');await page.waitForFunction(()=>!!window.FrontlinesDeckBuilder);
  for(const [width,height]of sizes){await page.setViewportSize({width,height});const tab=page.locator('[data-action="panel"][data-panel="cards"]');if(await tab.isVisible())await tab.click();await check(page,'.arsenal-card-inspect','Arsenal');await page.screenshot({path:path.join(out,'sprint12-arsenal-'+width+'-'+phase+'.png')});}
  await page.setViewportSize({width:1366,height:768});await page.goto(origin);await page.waitForFunction(()=>!!window.FrontlinesApp);
  await page.evaluate(()=>{const L=FrontlinesDecks.forData(FrontlinesData),decks=['stonewall-prepared-ground','bruiser-breach-column'].map(id=>L.getDecks().find(d=>d.id===id));if(!FrontlinesApp.startMatch({decks,mode:'hotseat',developer:true,bothHands:true,seed:120501,config:{startingCommand:80,commandCap:80,startingHand:26,drawCount:0,actionLimit:20,captureThreshold:1000}}))throw new Error('Art fixture failed');});
  for(const [width,height]of [[1920,1080],[1600,900],[1366,768],[1280,720],[1093,614],[1067,600]]){await page.setViewportSize({width,height});await check(page,'.game>.hand-area .hand-card','match hand');assert.equal(await page.locator('.battlefield .territory').count(),7);await page.screenshot({path:path.join(out,'sprint12-hand-'+width+'-'+phase+'.png')});}
  for(const [width,height]of [[1366,768],[390,844]]){await page.setViewportSize({width,height});const node=page.locator('.game>.hand-area .hand-card').first();await node.dispatchEvent('pointerover');await page.locator('.inspector [data-action="enlarge-card"]').evaluate(n=>n.click());await check(page,'.full-card-preview .hand-card','full briefing');await page.screenshot({path:path.join(out,'sprint12-full-card-'+width+'-'+phase+'.png')});await page.locator('[data-action="close-modal"]').first().evaluate(n=>n.click());}
  assert.deepEqual(report.errors,[]);report.passed=true;fs.writeFileSync(path.join(out,'sprint12-art-viewports-'+phase+'.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,contexts:report.contexts.length,campaigns:0,completeMatches:0}));
}catch(e){report.failure=String(e.stack||e);fs.writeFileSync(path.join(out,'sprint12-art-viewports-'+phase+'.json'),JSON.stringify(report,null,2));throw e;}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
