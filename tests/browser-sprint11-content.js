'use strict';
// Collection, inspection and deck-building correctness only. No match campaign.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.argv[2]||'playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results'),origin=process.env.FRONTLINES_TEST_URL||'http://127.0.0.1:4173',outputPrefix=process.env.FRONTLINES_ART_PHASE==='after'?'sprint12':'sprint11';
fs.mkdirSync(out,{recursive:true});
async function geometry(page,selector){return page.evaluate(selector=>{
  const box=n=>{const r=n.getBoundingClientRect();return {width:r.width,height:r.height,x:r.x,y:r.y,right:r.right,bottom:r.bottom};};
  return {width:innerWidth,height:innerHeight,pageWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,
    faces:[...document.querySelectorAll(selector)].map(n=>({face:box(n),art:box(n.querySelector('.collection-art,.arsenal-art')),size:getComputedStyle(n.querySelector('.art-tactical')).backgroundSize})),
    controls:[...document.querySelectorAll('.collection-filters input,.collection-filters select,.collection-tabs button')].map(box)};
},selector);}
function check(g,phase){
  assert.ok(g.pageWidth<=g.width+1&&g.pageHeight<=g.height+1,phase+' document overflow');
  for(const row of g.faces){assert.ok(Math.abs(row.face.width/row.face.height-5/7)<.005,phase+' canonical ratio');assert.equal(row.size,'cover',phase+' uniform tactical crop');assert.ok(row.art.width>20&&row.art.height>15,phase+' visible art');}
  for(const b of g.controls)assert.ok(b.height>=43,phase+' accessible control height');
}
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'}),errors=[],evidence={passed:false,largeCampaigns:0,completeMatches:0,cards:155,newCards:40,inspections:0,showcaseDecks:0,contexts:[],errors};
  try{
    const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(origin+'/collection.html');await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForFunction(()=>!!window.FrontlinesCollectionApp);
    assert.equal(await page.evaluate(()=>Object.keys(FrontlinesData.CARDS).length),155);
    evidence.artVersion=await page.evaluate(()=>FrontlinesArt.VERSION||'legacy');evidence.refinedMappings=await page.evaluate(()=>Object.keys(FrontlinesArt.REFINED_ART||{}).length);
    await page.locator('#collection-set-filter').selectOption('tactical-011');assert.equal(await page.locator('.collection-card').count(),40);
    const ids=await page.evaluate(()=>FrontlinesCollectionApp.getCatalogIds());
    for(const id of ids){
      assert.equal(await page.evaluate(id=>FrontlinesCollection.ownedCount(id),id),0,id+' unowned by default');
      await page.locator('[data-collection-action="inspect"][data-id="'+id+'"]').click();
      const exact=await page.evaluate(id=>FrontlinesData.CARDS[id].rulesText,id);assert.ok((await page.locator('#collection-briefing').innerText()).includes(exact),id+' exact rules visible');
      evidence.inspections++;
    }
    const resources=await page.evaluate(async ids=>Promise.all(ids.map(id=>new Promise(resolve=>{const asset=FrontlinesArt.get(FrontlinesData.CARDS[id]),image=new Image();image.onload=()=>resolve({id,ok:true,width:image.naturalWidth,height:image.naturalHeight,expectedWidth:asset.width||400,expectedHeight:asset.height||400,refined:asset.refined===true});image.onerror=()=>resolve({id,ok:false});image.src=asset.src;}))),ids);
    assert.ok(resources.every(r=>r.ok&&r.width===r.expectedWidth&&r.height===r.expectedHeight),'All forty assets decode at their exact current artwork dimensions');assert.ok(resources.filter(r=>r.refined).every(r=>r.width>=512&&r.height>=512),'Reviewed raster replacements retain a minimum512px quality floor');evidence.assets=resources.length;
    await page.locator('#collection-search').fill('sacrifice');assert.equal(await page.locator('.collection-card').count(),3);await page.locator('#collection-search').fill('');
    for(const size of [{width:1920,height:1080},{width:1600,height:900},{width:1366,height:768},{width:1280,height:720},{width:900,height:600},{width:390,height:844}]){
      await page.setViewportSize(size);await page.locator('#collection-faction-filter').selectOption('stonewall');check(await geometry(page,'.collection-card-inspect'),'collection '+size.width);evidence.contexts.push('collection '+size.width+'×'+size.height);await page.screenshot({path:path.join(out,outputPrefix+'-collection-'+size.width+'.png')});
    }
    await page.setViewportSize({width:1366,height:768});await page.goto(origin+'/deck-builder.html');await page.waitForFunction(()=>!!window.FrontlinesDeckBuilder);
    const decks=await page.evaluate(()=>FrontlinesDecks.forData(FrontlinesData).presets().filter(d=>d.set==='tactical-011').map(d=>({id:d.id,faction:d.faction})));assert.equal(decks.length,5);
    for(const deck of decks){
      await page.locator('#builder-faction').selectOption(deck.faction);await page.locator('#builder-deck').selectOption(deck.id);assert.equal(await page.evaluate(()=>FrontlinesDeckBuilder.getLegality().legal),true,deck.id);assert.equal(await page.evaluate(()=>FrontlinesDeckBuilder.getOwnership().complete),false);assert.equal(await page.locator('[data-action="simulate"]').isDisabled(),false);assert.equal(await page.locator('[data-action="play"]').isDisabled(),true);
      if(await page.locator('#advanced-card-filters').isHidden())await page.locator('[data-action="filters"]').click();await page.locator('#card-set-filter').selectOption('tactical-011');assert.equal(await page.locator('.arsenal-card').count(),8,deck.id);
      const factionIds=await page.evaluate(()=>FrontlinesDeckBuilder.getCatalogIds());
      for(const id of factionIds){await page.locator(' .arsenal-card-inspect[data-action="inspect"][data-id="'+id+'"]').click();const exact=await page.evaluate(id=>FrontlinesData.CARDS[id].rulesText,id);assert.ok((await page.locator('#card-detail').innerText()).includes(exact),id+' exact deck briefing');evidence.inspections++;}
      evidence.showcaseDecks++;
    }
    await page.locator('#builder-faction').selectOption('stonewall');await page.locator('#builder-deck').selectOption('stonewall-prepared-ground');
    if(await page.locator('#advanced-card-filters').isHidden())await page.locator('[data-action="filters"]').click();await page.locator('#card-set-filter').selectOption('tactical-011');await page.locator('#card-keyword-filter').selectOption('cover');const coverIds=await page.evaluate(()=>FrontlinesDeckBuilder.getCatalogIds());assert.ok(coverIds.includes('stonewall_hold_fast')&&coverIds.includes('stonewall_interlocking_fire'),'Compound card mechanics are discoverable');await page.locator('#card-keyword-filter').selectOption('');
    await page.locator('[data-action="filters"]').click();await page.locator('#card-catalog').evaluate(n=>{n.scrollTop=0;});await page.locator('.arsenal-card-inspect[data-id="stonewall_trench_engineer"]').click();await page.locator('#card-catalog').evaluate(n=>{n.scrollTop=0;});
    for(const size of [{width:1366,height:768},{width:1280,height:720},{width:900,height:600},{width:390,height:844}]){
      await page.setViewportSize(size);const panel=page.locator('[data-action="panel"][data-panel="cards"]');if(await panel.isVisible())await panel.click();check(await geometry(page,'.arsenal-card-inspect'),'arsenal '+size.width);evidence.contexts.push('arsenal '+size.width+'×'+size.height);await page.screenshot({path:path.join(out,outputPrefix+'-arsenal-'+size.width+'.png')});
    }
    assert.deepEqual(errors,[]);evidence.passed=true;fs.writeFileSync(path.join(out,outputPrefix+'-content-browser.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));
  }catch(error){evidence.error=error.message;fs.writeFileSync(path.join(out,outputPrefix+'-content-browser.json'),JSON.stringify(evidence,null,2));throw error;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
