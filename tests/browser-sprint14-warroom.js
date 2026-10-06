'use strict';
// One correctness match supplies real card-intelligence rows. No balance campaign.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.argv[2]||'playwright'),C=require('../collection'),B=require('../balance'),D=B.dataFor(B.DEFAULT_PROFILE);
const origin=process.env.FRONTLINES_TEST_URL||'http://127.0.0.1:4173',out=path.resolve(__dirname,'../test-results');
const evidence={passed:false,version:require('../package.json').version,kind:'war-room-card-inspection',matchesExecuted:0,largeCampaigns:0,layouts:[],errors:[]};
const profile=C.createProfile({seed:14141});
for(const row of Object.values(profile.cards)){
 row.copies=3;row.variants=['standard','foil','fullArt','veteran'];row.cosmetics={...row.cosmetics,preferredVariant:'foil',preferredWear:'veteran'};
}
const inspections=['stonewall_rifles','stonewall_bulwark_warden','nightwalker_ghost_extraction'];
async function inspect(page,id){
 await page.locator('[data-lab-card="'+id+'"]').first().click();
 const card=D.CARDS[id],dialog=page.locator('#lab-card-dialog'),face=dialog.locator('.lab-card-face');
 assert.equal(await dialog.evaluate(n=>n.open),true);
 assert.equal(await dialog.locator('header h2').innerText(),card.name);
 assert.equal(await face.locator(':scope > h3').innerText(),card.name);
 assert.equal(await face.locator(':scope > p').innerText(),card.rulesText);
 assert.equal(await dialog.locator('.lab-card-briefing > section > p').nth(1).innerText(),card.rulesText);
 assert.equal(await face.locator('.prestige-frame').count(),1,'Exactly one shared rarity frame');
 assert.match(await face.getAttribute('class'),/cosmetic-standard wear-standard/,'Public briefing ignores local Foil and Veteran preferences');
 assert.equal(await face.locator('.prestige-art-layers').count(),1);assert.equal(await face.locator('.prestige-cosmetic.cosmetic-standard').count(),1);assert.equal(await face.locator('.prestige-wear.wear-standard').count(),1);
 assert.equal(await face.locator('.rarity-badge').getAttribute('aria-label'),'Rarity: '+C.metadata(card).rarity[0].toUpperCase()+C.metadata(card).rarity.slice(1));
 if(C.metadata(card).rarity==='legendary')assert.equal(await face.locator('.prestige-crest').count(),1);
 const geometry=await face.evaluate(node=>{const r=node.getBoundingClientRect(),art=node.querySelector('.card-portrait'),style=getComputedStyle(art),close=document.querySelector('[data-close-lab-card]').getBoundingClientRect(),dialog=node.closest('dialog').getBoundingClientRect();return {cardId:node.querySelector('h3').textContent,width:r.width,height:r.height,artSize:style.backgroundSize,artPosition:style.backgroundPosition,artImage:style.backgroundImage,artRefined:art.classList.contains('art-refined'),close:{x:close.x,y:close.y,right:close.right,bottom:close.bottom,width:close.width,height:close.height},dialog:{x:dialog.x,y:dialog.y,right:dialog.right,bottom:dialog.bottom},pageWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,viewportWidth:innerWidth,viewportHeight:innerHeight,dpr:devicePixelRatio,idleAnimations:document.getAnimations().filter(a=>a.effect.getTiming().iterations===Infinity).length};});
 assert.ok(Math.abs(geometry.width/geometry.height-5/7)<.002,'Canonical 5:7 card face');
 assert.equal(geometry.artSize,geometry.artRefined?'cover':'200% 200%','Accepted portrait crop');
 const expected=await page.evaluate(id=>FrontlinesArt.get(FrontlinesBalance.dataFor(FrontlinesBalance.DEFAULT_PROFILE).CARDS[id]),id);
 assert.ok(geometry.artImage.includes(expected.src),'Reviewed artwork source');assert.equal(geometry.artPosition,expected.position==='center'?'50% 50%':expected.position,'Reviewed artwork focal point');
 assert.ok(await page.evaluate(async src=>{const img=new Image();img.src=src;try{await img.decode();return img.naturalWidth>0;}catch(_){return false;}},expected.src),'Artwork asset loads');
 assert.ok(geometry.pageWidth<=geometry.viewportWidth+1&&geometry.pageHeight<=geometry.viewportHeight+1,'No whole-page overflow');
 assert.ok(geometry.close.x>=0&&geometry.close.y>=0&&geometry.close.right<=geometry.viewportWidth&&geometry.close.bottom<=geometry.viewportHeight&&geometry.close.width>=44&&geometry.close.height>=44,'Accessible close control');
 assert.ok(geometry.dialog.x>=0&&geometry.dialog.y>=0&&geometry.dialog.right<=geometry.viewportWidth+1&&geometry.dialog.bottom<=geometry.viewportHeight+1,'Bounded dialog with local scrolling');
 assert.equal(geometry.idleAnimations,0,'No continuous premium animation');return geometry;
}
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const context=await browser.newContext({viewport:{width:1920,height:1080}}),page=await context.newPage();page.on('pageerror',e=>evidence.errors.push(e.message));
  await page.addInitScript(({key,profile})=>localStorage.setItem(key,JSON.stringify(profile)),{key:C.STORAGE_KEY,profile});
  await page.goto(origin+'/simulator.html');await page.waitForFunction(()=>!!window.FrontlinesSimulatorApp);
  await page.locator('[data-war-room="quick"]').click();await page.selectOption('#faction-a','stonewall');await page.selectOption('#deck-a','stonewall-fortified-advance');await page.selectOption('#faction-b','nightwalker');await page.selectOption('#deck-b','nightwalker-planned-exposure');await page.fill('#match-count','1');await page.evaluate(()=>{document.getElementById('seed').value='14141';document.getElementById('verify').checked=true;});
  await page.locator('#run-button').click();await page.waitForFunction(()=>FrontlinesSimulatorApp.getStatus().status==='completed',null,{timeout:60000});
  const report=await page.evaluate(()=>FrontlinesSimulatorApp.getReport());assert.equal(report.completed,1);assert.equal(report.summary.errors,0);assert.equal(report.summary.unfinished,0);assert.equal(report.execution.runner,'worker');evidence.matchesExecuted=1;evidence.correctnessMatch={seed:report.options.seed,status:report.matches[0].status,rulesVersion:report.rulesSnapshot.rulesVersion,runner:report.execution.runner};
  const before=await page.evaluate(()=>JSON.stringify(FrontlinesSimulatorApp.getReport()));await page.locator('#tab-cards').click();
  for(const id of inspections)assert.ok(await page.locator('[data-lab-card="'+id+'"]').count(),'Observed card-intelligence row '+id);
  const cdp=await context.newCDPSession(page);
  for(const [width,height,dpr]of [[1920,1080,1],[1600,900,1],[1366,768,1],[1280,720,1],[911,512,1.5]]){
   await page.setViewportSize({width,height});await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:dpr,mobile:false});
   const layout={width,height,dpr,cards:[]};
   for(const [index,id]of inspections.entries()){
    layout.cards.push(await inspect(page,id));
    if(id==='stonewall_bulwark_warden')await page.screenshot({path:path.join(out,'sprint14-warroom-'+width+'.png')});
    if(index%2===0)await page.keyboard.press('Escape');else await page.locator('[data-close-lab-card]').click();
    assert.equal(await page.locator('#lab-card-dialog').evaluate(n=>n.open),false,'Close and Escape dismiss inspection');
   }
   evidence.layouts.push(layout);
  }
  assert.equal(await page.evaluate(()=>JSON.stringify(FrontlinesSimulatorApp.getReport())),before,'Inspection does not mutate experiment data');
  assert.deepEqual(evidence.errors,[]);evidence.passed=true;await context.close();
 }catch(error){evidence.failure=String(error.stack||error);throw error;}finally{fs.writeFileSync(path.join(out,'sprint14-warroom-browser.json'),JSON.stringify(evidence,null,2)+'\n');await browser.close();}
 console.log(JSON.stringify({passed:evidence.passed,layouts:evidence.layouts.length,cardInspections:evidence.layouts.reduce((sum,l)=>sum+l.cards.length,0),matchesExecuted:evidence.matchesExecuted,largeCampaigns:0,errors:evidence.errors}));
})().catch(error=>{console.error(error);process.exitCode=1;});
