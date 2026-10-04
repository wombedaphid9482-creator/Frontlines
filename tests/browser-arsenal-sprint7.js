'use strict';
// Bounded UI and save/load checks only. This test never starts a balance run.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.argv[2]||'playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results'),origin=process.env.FRONTLINES_TEST_URL||'http://127.0.0.1:4173';
fs.mkdirSync(out,{recursive:true});
const deck=page=>page.evaluate(()=>FrontlinesDeckBuilder.getDeck());
const click= (page,action)=>page.locator('[data-action="'+action+'"]').first().click();
async function quantity(page,id,count){await page.locator('#quantity-'+id).fill(String(count));await page.locator('#quantity-'+id).dispatchEvent('change');}
async function geometry(page){return page.evaluate(()=>{
  const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
  const visible=n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0;};
  return {width:innerWidth,height:innerHeight,pageWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,
    layout:rect(document.querySelector('.arsenal-layout')),summary:rect(document.querySelector('.deck-summary')),commands:rect(document.querySelector('.arsenal-command-bar')),
    panels:[...document.querySelectorAll('.arsenal-panel')].filter(visible).map(rect),catalog:rect(document.getElementById('card-catalog')),firstName:document.querySelector('.arsenal-card-name')?rect(document.querySelector('.arsenal-card-name')):null,
    filters:rect(document.querySelector('.arsenal-filters')),results:rect(document.querySelector('#catalog-results')),
    buttons:[...document.querySelectorAll('.arsenal-command-bar button,.arsenal-copy-controls button,.deck-row-quantity button')].filter(visible).map(rect)};
});}
function assertGeometry(g,phase){assert.ok(g.pageWidth<=g.width+1&&g.pageHeight<=g.height+1,phase+' document overflow '+JSON.stringify(g));assert.ok(g.layout.bottom<=g.summary.y+1&&g.summary.bottom<=g.commands.y+1,phase+' panel/footer overlap '+JSON.stringify(g));for(const p of g.panels)assert.ok(p.x>=0&&p.right<=g.width+1&&p.bottom<=g.summary.y+1,phase+' panel out of bounds');for(const b of g.buttons)assert.ok(b.height>=43,phase+' undersized edit/launch button');if(g.catalog.width){assert.ok(g.catalog.height>=78,phase+' collection collapsed under filters');assert.ok(g.filters.bottom<=g.results.y+1&&g.results.bottom<=g.catalog.y+1&&g.catalog.bottom<=g.layout.bottom+1,phase+' filters overlap collection');}}
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try{
    const context=await browser.newContext({viewport:{width:1366,height:768},acceptDownloads:true}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(origin+'/deck-builder.html');await page.evaluate(()=>localStorage.clear());await page.reload();
    await page.waitForFunction(()=>!!window.FrontlinesDeckBuilder);
    // Preserve the unrestricted CRUD fixture independently of Sprint 8's
    // dedicated ownership tests; this changes only this browser's test save.
    await page.evaluate(()=>{
      if(!window.FrontlinesCollection)return;
      const C=FrontlinesCollection,p=C.createProfile({seed:80701});
      for(const row of Object.values(p.cards)){row.copies=C.copyLimit(row.id);row.variants=['standard'];}
      localStorage.setItem(C.STORAGE_KEY,JSON.stringify(p));
    });await page.reload();
    const pool=await page.evaluate(()=>({counts:Object.fromEntries(Object.keys(FrontlinesData.FACTIONS).map(f=>[f,Object.values(FrontlinesData.CARDS).filter(c=>c.faction===f).length])),total:Object.keys(FrontlinesData.CARDS).length,expanded:Object.values(FrontlinesData.CARDS).filter(c=>c.set==='arsenal-007').map(c=>({id:c.id,role:c.role,archetypes:c.archetypes,tags:c.tags}))}));
    assert.ok(pool.expanded.length>=30,'Meaningful expansion is loaded in the collection');
    const original=await deck(page);assert.equal(original.source,'starter');
    assert.equal(await page.locator('#deck-name').isEditable(),false);
    assert.equal(await page.locator('[data-action="save"]').isDisabled(),true);
    assert.equal(await page.locator('.arsenal-card [data-action="add-card"]').first().isDisabled(),true);
    await click(page,'duplicate');await page.locator('#deck-name').fill('Forge Arsenal Alpha');await page.locator('#deck-strategy').selectOption('counteroffensive');
    const current=await deck(page);assert.equal(current.source,'saved');assert.notEqual(current.id,original.id);
    for(const [faction,count]of Object.entries(pool.counts)){
      await page.locator('#collection-faction').selectOption(faction);
      assert.equal(await page.locator('.arsenal-card').count(),count);
      assert.deepEqual(await deck(page),current,'Browsing never mutates the dirty deck');
      if(faction!==current.faction)assert.equal(await page.locator('.arsenal-card [data-action="add-card"]:enabled').count(),0,'Foreign cards are inspection only');
    }
    await page.locator('#collection-faction').selectOption('all');assert.equal(await page.locator('.arsenal-card').count(),pool.total);
    await click(page,'filters');await page.locator('#card-set-filter').selectOption('arsenal-007');assert.equal(await page.locator('.arsenal-card').count(),pool.expanded.length);
    const probe=pool.expanded.find(c=>c.role&&c.archetypes?.length&&c.tags?.length);assert.ok(probe);
    await page.locator('#card-role-filter').selectOption(probe.role);assert.ok((await page.evaluate(()=>FrontlinesDeckBuilder.getCatalogIds())).includes(probe.id));
    await page.locator('#card-archetype-filter').selectOption(probe.archetypes[0]);assert.ok((await page.evaluate(()=>FrontlinesDeckBuilder.getCatalogIds())).includes(probe.id));
    await page.locator('#card-tag-filter').selectOption(probe.tags[0]);assert.ok((await page.evaluate(()=>FrontlinesDeckBuilder.getCatalogIds())).includes(probe.id));
    await page.locator('.arsenal-card-inspect[data-id="'+probe.id+'"]').click();assert.match(await page.locator('#card-detail').innerText(),/DECKBUILDING CHOICE/);
    await page.locator('[data-action="clear-filter"][data-filter-key="tag"]').click();assert.equal(await page.locator('#card-tag-filter').inputValue(),'');
    await click(page,'clear-filters');await page.locator('#card-search').fill('stonewall retaliate');assert.ok(await page.locator('.arsenal-card').count()>0);
    assert.ok((await page.evaluate(()=>FrontlinesDeckBuilder.getCatalogIds().map(id=>FrontlinesData.CARDS[id].faction))).every(f=>f==='stonewall'));
    await click(page,'clear-filters');await page.locator('#collection-faction').selectOption('deck');await page.locator('#card-in-deck').check();
    assert.equal(await page.locator('.arsenal-card').count(),new Set(current.cards).size);
    await click(page,'clear-filters');await click(page,'filters');
    const editable=current.cards.find(id=>!id.endsWith('_commander')),copies=current.cards.filter(id=>id===editable).length;
    await quantity(page,editable,copies-1);assert.equal((await deck(page)).cards.length,25);assert.equal(await page.locator('[data-action="play"]').isDisabled(),true);
    await click(page,'undo');assert.deepEqual((await deck(page)).cards,current.cards);await click(page,'redo');assert.equal((await deck(page)).cards.length,25);
    await quantity(page,editable,copies);assert.equal((await deck(page)).cards.length,26);assert.equal(await page.evaluate(()=>FrontlinesDeckBuilder.getLegality().legal),true);
    const capped=await page.evaluate(()=>{const d=FrontlinesDeckBuilder.getDeck(),counts=FrontlinesDeckBuilder.getLegality().counts;return Object.keys(counts).find(id=>counts[id]<FrontlinesDecks.copyLimit(FrontlinesData.CARDS[id]));});
    const cappedBefore=await deck(page),cappedCount=cappedBefore.cards.filter(id=>id===capped).length;
    await quantity(page,capped,cappedCount+1);assert.deepEqual((await deck(page)).cards,cappedBefore.cards,'Full deck quantity change rejected');assert.match(await page.locator('#deck-toast').innerText(),/Remove/);
    await page.locator('#quantity-'+editable).fill(String(copies-1));await click(page,'save');assert.equal((await deck(page)).cards.length,25);assert.equal(await page.evaluate(()=>FrontlinesDeckBuilder.hasUnsavedChanges()),false,'A native quantity blur followed by Save commits with one click');
    await quantity(page,editable,copies);await click(page,'save');const alpha=await deck(page);assert.equal(await page.evaluate(()=>FrontlinesDeckBuilder.hasUnsavedChanges()),false);
    assert.match(await page.locator('.deck-tendencies').innerText(),/do not change AI intent/);assert.match(await page.locator('#summary-archetype').innerText(),/counteroffensive/i);
    await page.reload();await page.locator('#builder-deck').selectOption(alpha.id);assert.deepEqual((await deck(page)).cards,alpha.cards);
    await click(page,'library-panel');await page.locator('#deck-library-search').fill('Forge Arsenal');assert.equal(await page.locator('.deck-library-item').count(),1);
    await page.locator('#deck-library-kind').selectOption('templates');assert.equal(await page.locator('.deck-library-item').count(),0);
    await page.locator('#deck-library-search').fill('');await page.locator('#deck-library-kind').selectOption('');
    await click(page,'duplicate');await page.locator('#deck-name').fill('Forge Arsenal Beta');await click(page,'save');
    assert.equal(await page.evaluate(()=>FrontlinesDeckBuilder.getSavedDecks().length),2);
    await click(page,'delete');await page.locator('[data-dialog-action="close"]').click();assert.equal(await page.evaluate(()=>FrontlinesDeckBuilder.getSavedDecks().length),2);
    await click(page,'delete');await page.locator('[data-dialog-action="delete"]').click();assert.equal(await page.evaluate(()=>FrontlinesDeckBuilder.getSavedDecks().length),1);
    await page.locator('#builder-deck').selectOption(alpha.id);const exportedPromise=page.waitForEvent('download');await click(page,'export');const exported=await exportedPromise,exportFile=path.join(out,'sprint7-arsenal-export.json');await exported.saveAs(exportFile);
    const parsed=JSON.parse(fs.readFileSync(exportFile,'utf8'));assert.deepEqual(parsed.deck.cards,alpha.cards);
    await click(page,'import');await page.locator('#deck-import-text').fill('{invalid');await page.locator('[data-dialog-action="import"]').click();assert.match(await page.locator('#import-error').innerText(),/Invalid deck JSON/);
    await page.locator('#deck-import-file').setInputFiles(exportFile);await page.waitForFunction(()=>document.querySelector('#deck-import-text').value.includes('frontlines-deck-v1'));await page.locator('[data-dialog-action="import"]').click();assert.deepEqual((await deck(page)).cards,alpha.cards);
    const retired={...parsed,deck:{...parsed.deck,name:'Retired-card recovery draft',cards:['stonewall_retired_test',...parsed.deck.cards.slice(1)]}};
    await click(page,'import');await page.locator('#deck-import-text').fill(JSON.stringify(retired));await page.locator('[data-dialog-action="import"]').click();const retiredId=(await deck(page)).id;
    assert.equal(await page.evaluate(()=>FrontlinesDeckBuilder.getLegality().legal),false);assert.match(await page.locator('.deck-legality').innerText(),/Unavailable card/);
    await page.reload();await page.locator('#builder-deck').selectOption(retiredId);await page.locator('[data-action="library-panel"][data-panel="contents"]').click();
    await page.locator('[data-action="remove-all"][data-id="stonewall_retired_test"]').click();assert.ok(!(await deck(page)).cards.includes('stonewall_retired_test'));await click(page,'save');
    await page.locator('#builder-deck').selectOption(alpha.id);
    for(const size of [{width:2560,height:1440},{width:1920,height:1080},{width:1366,height:768},{width:1280,height:720},{width:900,height:600},{width:768,height:800},{width:390,height:844}]){
      await page.setViewportSize(size);await page.locator('[data-action="panel"][data-panel="cards"]').isVisible().then(async visible=>{if(visible)await page.locator('[data-action="panel"][data-panel="cards"]').click();});
      assertGeometry(await geometry(page),'collapsed '+size.width+'x'+size.height);
      const collapsed=await geometry(page);if(size.height<=680)assert.ok(collapsed.firstName.bottom<=collapsed.catalog.bottom,'Compact collection keeps the first card name visible');
      await page.screenshot({path:path.join(out,'sprint7-arsenal-collapsed-'+size.width+'x'+size.height+'.png')});
      await click(page,'filters');assertGeometry(await geometry(page),'expanded '+size.width+'x'+size.height);
      await page.screenshot({path:path.join(out,'sprint7-arsenal-'+size.width+'x'+size.height+'.png')});await click(page,'filters');
      if(size.width<=1100){await page.locator('.arsenal-card-inspect').first().click();assert.equal(await page.locator('#deck-dialog').isVisible(),true);assert.equal(await page.locator('#deck-dialog [data-action="inspect-dialog"]').count(),0,'Compact briefing has no inactive enlargement control');await page.keyboard.press('Escape');await page.locator('[data-action="panel"][data-panel="library"]').click();await page.locator('[data-action="library-panel"][data-panel="contents"]').click();assertGeometry(await geometry(page),'contents '+size.width);await page.locator('[data-action="panel"][data-panel="cards"]').click();}
    }
    await page.setViewportSize({width:1366,height:768});await click(page,'simulate');await page.waitForURL(/simulator\.html\?/);assert.equal(await page.locator('#deck-a').inputValue(),alpha.id);assert.equal(await page.evaluate(()=>FrontlinesSimulatorApp.getStatus().status),'idle','Routing does not start a simulation');
    await page.goto(origin+'/deck-builder.html?deck='+encodeURIComponent(alpha.id));await click(page,'play');await page.waitForURL(/index\.html\?/);assert.equal(await page.locator('#deck-0').inputValue(),alpha.id);
    await page.locator('[data-action="start"]').click();const match=await page.evaluate(()=>FrontlinesApp.getState());assert.deepEqual(match.players[0].deck.concat(match.players[0].hand.map(c=>c.cardId)).sort(),alpha.cards.slice().sort(),'Match receives exact custom deck');
    const recovery=await context.newPage();await recovery.goto(origin+'/deck-builder.html');const raw=JSON.stringify([{...alpha,name:undefined,id:'',cards:alpha.cards},{unreadable:true}]);await recovery.evaluate(raw=>localStorage.setItem('frontlines.decks.v1',raw),raw);await recovery.reload();
    await recovery.locator('.deck-recovery summary').click();assert.match(await recovery.locator('.deck-recovery').innerText(),/recovered|unreadable/);
    const recoverDownload=recovery.waitForEvent('download');await recovery.locator('[data-action="recovery-export"]').click();const recovered=await recoverDownload,recoveryFile=path.join(out,'sprint7-library-recovery.json');await recovered.saveAs(recoveryFile);assert.equal(fs.readFileSync(recoveryFile,'utf8'),raw,'Recovery export preserves exact stored records');
    await recovery.evaluate(()=>localStorage.setItem('frontlines.decks.v1','{broken'));await recovery.reload();await recovery.locator('.deck-recovery summary').click();assert.match(await recovery.locator('.deck-recovery').innerText(),/original data is preserved/);await click(recovery,'duplicate');assert.match(await recovery.locator('#deck-toast').innerText(),/unreadable/);assert.equal(await recovery.evaluate(()=>localStorage.getItem('frontlines.decks.v1')),'{broken','Blocked library cannot be overwritten');
    const offline=await browser.newContext({viewport:{width:1280,height:720}}),filePage=await offline.newPage();await filePage.goto(pathToFileURL(path.join(root,'deck-builder.html')).href);await filePage.waitForFunction(()=>!!window.FrontlinesDeckBuilder);assert.equal(await filePage.locator('.arsenal-card').count(),pool.counts.stonewall);assertGeometry(await geometry(filePage),'offline file');
    assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,cards:pool.total,expansion:pool.expanded.length,factions:Object.keys(pool.counts).length,viewports:7,checks:['all-faction independent browsing','metadata filters and AND search','quantities and undo/redo','immutable templates','CRUD and import/export','retired-card repair','recovery data preservation','custom match routing','idle War Room routing','offline file'],balanceRuns:0,screenshots:out},null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
