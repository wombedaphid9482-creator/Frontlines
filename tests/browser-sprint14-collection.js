'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.argv[2]||'playwright'),C=require('../collection'),B=require('../balance'),D=B.dataFor(B.DEFAULT_PROFILE);
const origin=process.env.FRONTLINES_TEST_URL||'http://127.0.0.1:4173',out=path.resolve(__dirname,'../test-results');
const legend=Object.values(D.CARDS).find(c=>c.faction==='stonewall'&&C.metadata(c).rarity==='legendary'),profile=C.createProfile({seed:14140});
assert.ok(legend);const chosen=legend.id;
profile.credits=20000;profile.supply=20000;
profile.cards[chosen].copies=2;profile.cards[chosen].variants=['standard','foil','fullArt','fieldWorn','battleHardened','veteran'];
profile.cards[chosen].mastery.points=300;profile.cards[chosen].cosmetics={...profile.cards[chosen].cosmetics,preferredVariant:'foil',preferredWear:'veteran',favorite:true};
profile.cards[chosen].history.matchesUsed=12;profile.cards[chosen].history.deployments=22;
const packIds=['premium-first','premium-last','fast-open'];
const basic='stonewall_rifles';
for(const [i,packId]of packIds.entries())profile.packs.push({id:packId,definitionId:'standard',name:'Prestige QA Pack',claimed:false,contents:Array.from({length:5},(_,n)=>({cardId:n===(i===1?4:0)?chosen:basic,rarity:n===(i===1?4:0)?'legendary':'common',variant:n===(i===1?4:0)?'foil':'standard'})),acquisitions:[],supplyGained:0});
const report={passed:false,version:require('../package.json').version,layouts:[],checks:[],errors:[],largeCampaigns:0};
async function measure(page,label,selector){
 const m=await page.evaluate(({label,selector})=>({label,width:innerWidth,height:innerHeight,dpr:devicePixelRatio,pageWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,
  cards:[...document.querySelectorAll(selector)].filter(n=>n.getClientRects().length).map(n=>{const r=n.getBoundingClientRect();return {w:r.width,h:r.height};}),idleAnimations:document.getAnimations().filter(a=>a.effect.getTiming().iterations===Infinity).length}),{label,selector});
 assert.ok(m.pageWidth<=m.width+1&&m.pageHeight<=m.height+1,label+' whole-page overflow '+JSON.stringify(m));
 for(const card of m.cards)assert.ok(Math.abs(card.w/card.h-5/7)<.002,label+' 5:7 ratio '+JSON.stringify(card));
 assert.equal(m.idleAnimations,0,label+' infinite card animation');report.layouts.push(m);
}
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  for(const [width,height,dpr]of [[1920,1080,1],[1600,900,1],[1366,768,1],[1280,720,1],[911,512,1.5]]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr});const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
   await page.addInitScript(({key,profile})=>{localStorage.setItem(key,JSON.stringify(profile));localStorage.setItem('frontlines.onboarding.v1','seen');}, {key:C.STORAGE_KEY,profile});
   await page.goto(origin+'/collection.html');await page.waitForFunction(()=>!!window.FrontlinesCollectionApp);
   assert.equal(await page.locator('.collection-card').count(),155);
   await measure(page,width+'x'+height+' collection','.collection-card');
   await page.selectOption('#collection-sort','mastery');assert.equal(await page.locator('.collection-card').first().getAttribute('data-card'),chosen);
   await page.selectOption('#collection-rarity-filter','legendary');const ids=await page.evaluate(()=>FrontlinesCollectionApp.getCatalogIds());assert.ok(ids.length>=5);assert.ok(ids.every(id=>C.metadata(id).rarity==='legendary'));
   await page.selectOption('#collection-rarity-filter','');await page.locator('.collection-filter-options summary').click();
   await page.selectOption('#collection-faction-filter','nightwalker');assert.ok((await page.evaluate(()=>FrontlinesCollectionApp.getCatalogIds())).every(id=>D.CARDS[id].faction==='nightwalker'));
   await page.selectOption('#collection-type-filter','order');const orders=await page.evaluate(()=>FrontlinesCollectionApp.getCatalogIds());assert.ok(orders.length>0);assert.ok(orders.every(id=>D.CARDS[id].faction==='nightwalker'&&D.CARDS[id].type==='order'));
   await page.selectOption('#collection-faction-filter','');await page.selectOption('#collection-type-filter','');
   await page.selectOption('#collection-ownership-filter','favorite');assert.deepEqual(await page.evaluate(()=>FrontlinesCollectionApp.getCatalogIds()),[chosen]);
   await page.selectOption('#collection-ownership-filter','');await page.selectOption('#collection-cosmetic-filter','foil');assert.deepEqual(await page.evaluate(()=>FrontlinesCollectionApp.getCatalogIds()),[chosen]);
   await page.selectOption('#collection-wear-filter','veteran');assert.deepEqual(await page.evaluate(()=>FrontlinesCollectionApp.getCatalogIds()),[chosen]);
   await page.locator('[data-collection-action="inspect"][data-id="'+chosen+'"]').click();
   const scope=page.locator(width<=1000?'#collection-dialog':'.collection-detail');
   await scope.locator('[data-collection-variant]').selectOption('fullArt');await scope.locator('[data-collection-wear]').selectOption('battleHardened');
   const prefs=await page.evaluate(id=>FrontlinesCollection.cosmeticState(id,FrontlinesCollection.load()),chosen);assert.equal(prefs.variant,'fullArt');assert.equal(prefs.wear,'battleHardened');
   const face=scope.locator('.collection-inspect-face');assert.match(await face.getAttribute('class'),/cosmetic-full-art wear-battle-hardened/);assert.equal(await face.locator('.prestige-frame').count(),1);
   assert.match(await scope.innerText(),/12.*matches actually used/s);assert.match(await scope.innerText(),/22.*deployments/s);
   if(width<=1000)await scope.locator('[data-collection-action="close"]').click();
   await page.screenshot({path:path.join(out,'sprint14-collection-'+width+'.png')});
   await page.goto(origin+'/deck-builder.html');await page.waitForFunction(()=>!!window.FrontlinesDeckBuilder);
   await measure(page,width+'x'+height+' arsenal','.arsenal-card-inspect');
   await page.locator('[data-action="inspect"][data-id="'+chosen+'"]').click();
   const briefing=page.locator(width<=1100?'#deck-dialog':'#card-detail');
   await briefing.locator('[data-cosmetic-layer="variant"]').selectOption('foil');await briefing.locator('[data-cosmetic-layer="wear"]').selectOption('veteran');
   const saved=await page.evaluate(id=>FrontlinesCollection.cosmeticState(id,FrontlinesCollection.load()),chosen);assert.equal(saved.variant,'foil');assert.equal(saved.wear,'veteran');
   assert.equal(await briefing.locator('.prestige-frame').count(),1);await page.screenshot({path:path.join(out,'sprint14-arsenal-'+width+'.png')});
   if(width<=1100)await briefing.locator('[data-dialog-action="close"]').click();
   await context.close();
  }
  report.checks.push('155-card Collection; rarity/mastery/type/finish/wear/favorite filters; independent persistent selections in Collection and Arsenal; local panels and 5:7 at five sizes');
  const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(({key,profile})=>{localStorage.setItem(key,JSON.stringify(profile));localStorage.setItem('frontlines.onboarding.v1','seen');},{key:C.STORAGE_KEY,profile});await page.goto(origin+'/collection.html#shop');await page.waitForFunction(()=>!!window.FrontlinesCollectionApp);
  const heard=[];await page.exposeFunction('__heard',event=>heard.push(event));await page.evaluate(()=>{FrontlinesEffects.reveal=(card,node,options)=>window.__heard({id:card.id,options});});
  for(const [n,packId]of packIds.entries()){
   await page.evaluate(id=>FrontlinesCollectionApp.openPack(id),packId);const before=await page.evaluate(()=>FrontlinesCollectionApp.getProfile().packsOpened),cuesBefore=heard.length;
   if(n===2){await page.locator('[data-collection-action="skip-pack"]').click();assert.equal(heard.length,cuesBefore,'Fast-open invokes no reveal effect');}
   else{
    await page.locator('[data-collection-action="activate-pack"]').click();
    const backs=await page.locator('.pack-reveal.face-down').evaluateAll(nodes=>nodes.map(n=>n.outerHTML));assert.equal(backs.length,5);assert.ok(backs.every(html=>!html.match(/rarity-|faction-|variant-|foil|legendary/i)),'Sealed cards leak no identity or rarity');
    if(n===0)await page.locator('[data-collection-action="reveal"][data-index="0"]').click();
    else{for(let i=0;i<4;i++)await page.locator('[data-collection-action="reveal"][data-index="'+i+'"]').click();await page.locator('[data-collection-action="reveal"][data-index="4"]').click();}
    assert.equal(await page.locator('#collection-dialog').getAttribute('data-reveal-stage'),'legendary');assert.match(await page.locator('.legendary-spotlight-copy').innerText(),/LEGENDARY DISCOVERED/);
    const opening=await page.evaluate(()=>FrontlinesCollectionApp.getOpening());assert.equal(opening.claimed,n===1,'Last Legendary is saved before continuing');
    await page.locator('#collection-dialog').evaluate(async node=>{await Promise.all(node.getAnimations({subtree:true}).map(animation=>animation.finished.catch(()=>{})));});
    await page.screenshot({path:path.join(out,'sprint14-pack-'+(n===0?'first':'last')+'-legendary.png')});
    if(n===0)await page.locator('[data-collection-action="skip-pack"]').click();else await page.locator('[data-collection-action="continue-reveal"]').click();
   }
   assert.equal(await page.locator('#collection-dialog').getAttribute('data-reveal-stage'),'summary');assert.equal(await page.evaluate(()=>FrontlinesCollectionApp.getProfile().packsOpened),before+1);
   await page.evaluate(id=>FrontlinesCollection.claimPack(id),packId);assert.equal(await page.evaluate(()=>FrontlinesCollectionApp.getProfile().packsOpened),before+1,'Claim idempotent');
   await page.locator('#collection-dialog [data-collection-action="close"]').first().click();
  }
  report.checks.push('Legendary first and last reveal; last-card durable save; face-down privacy; fast-open skips effects; claims idempotent');
  await context.close();assert.deepEqual(report.errors,[]);report.passed=true;
 }catch(error){report.failure=String(error.stack||error);throw error;}finally{fs.writeFileSync(path.join(out,'sprint14-collection-browser.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
 console.log(JSON.stringify({passed:report.passed,layouts:report.layouts.length,checks:report.checks,errors:report.errors}));
})().catch(e=>{console.error(e);process.exitCode=1;});
