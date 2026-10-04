'use strict';
// One deterministic custom-deck fixture, replayed in Worker/Node/offline.
// This checks compatibility and rules; it does not collect balance evidence.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.argv[2]||'playwright');
const Simulator=require('../sim-core'),Decks=require('../decks'),version=require('../package.json').version;
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results');
const origin=process.env.FRONTLINES_TEST_URL||'http://127.0.0.1:4173';
fs.mkdirSync(out,{recursive:true});
const previousDeck={...Decks.presets().find(d=>d.id==='nightwalker-assassination'),id:'deck-upgrade-v060',name:'My v0.6 Assassination',source:'saved',createdAt:'2026-10-02T10:00:00.000Z',updatedAt:'2026-10-02T11:00:00.000Z'};
const previousDraft={...previousDeck,id:'deck-upgrade-missing',name:'Old removed-card draft',cards:['nightwalker_removed',...previousDeck.cards.slice(1)]};
async function about(page){
  await page.locator('[data-shell-action="settings"]').first().click();
  await page.locator('[data-settings-tab="advanced"]').click();
  assert.equal(await page.locator('.shell-version').innerText(),'Installed: Frontlines v'+version);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.shell-settings').count(),0);
}
async function bounded(page,selectors){
  const info=await page.evaluate(selectors=>({viewport:[innerWidth,innerHeight],document:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],commands:selectors.map(s=>({s,...document.querySelector(s).getBoundingClientRect().toJSON()}))}),selectors);
  assert.ok(info.document[0]<=info.viewport[0]+1&&info.document[1]<=info.viewport[1]+1,'Whole page remains bounded');
  for(const b of info.commands)assert.ok(b.height>=44&&b.top>=0&&b.bottom<=info.viewport[1]+1&&b.left>=0&&b.right<=info.viewport[0]+1,'Accessible command '+b.s);
  return info.viewport;
}
const finished=page=>page.waitForFunction(()=>['completed','stopped','error'].includes(FrontlinesSimulatorApp.getStatus().status),{},{timeout:60000});
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1366,height:768},acceptDownloads:true});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    await page.goto(origin+'/deck-builder.html');
    await page.evaluate(decks=>{
      localStorage.clear();localStorage.setItem('frontlines.decks.v1',JSON.stringify(decks));
      localStorage.setItem('frontlines.settings.v1',JSON.stringify({animationSpeed:'fast',masterVolume:0,aiDifficulty:'easy'}));
    },[previousDeck,previousDraft]);
    await page.goto(origin+'/deck-builder.html?deck='+previousDeck.id);
    // This legacy CRUD/parity fixture has a full test collection. Dedicated
    // Sprint 8 tests separately enforce starter-only ownership and acquisition.
    await page.evaluate(()=>{
      if(!window.FrontlinesCollection)return;
      const C=FrontlinesCollection,p=C.createProfile({seed:80601});
      for(const row of Object.values(p.cards)){row.copies=C.copyLimit(row.id);row.variants=['standard'];}
      localStorage.setItem(C.STORAGE_KEY,JSON.stringify(p));
    });await page.reload();
    const loaded=await page.evaluate(()=>FrontlinesDeckBuilder.getDeck());
    assert.deepEqual(loaded.cards,previousDeck.cards);assert.equal(loaded.name,previousDeck.name);assert.equal(loaded.createdAt,previousDeck.createdAt);
    assert.equal(await page.evaluate(()=>FrontlinesDeckBuilder.getLegality().legal),true);
    const badges=await page.evaluate(()=>[...document.querySelectorAll('.arsenal-card')].map(n=>({id:n.dataset.card,cost:Number(n.querySelector('.arsenal-command-cost').textContent.replace(/\D/g,'')),expected:FrontlinesData.CARDS[n.dataset.card].commandCost})));
    assert.equal(badges.length,23);assert.ok(badges.every(c=>c.cost===c.expected));
    await page.locator('.arsenal-card-inspect[data-id="nightwalker_blade"]').click();
    assert.equal(await page.locator('#card-detail .arsenal-detail-command-cost b').innerText(),'0');
    assert.match(await page.locator('#card-detail .arsenal-command-note').innerText(),/Free deployment.*without a Command Action/);
    await page.locator('.arsenal-card-inspect[data-id="nightwalker_commander"]').click();
    assert.equal(await page.locator('#card-detail .arsenal-detail-command-cost b').innerText(),'1');
    assert.match(await page.locator('#card-detail .arsenal-command-note').innerText(),/Capacity and 1 Command Action/);
    await page.locator('[data-action="inspect-dialog"]').click();assert.ok(await page.locator('#deck-dialog .arsenal-detail-command-cost').isVisible());await page.keyboard.press('Escape');
    const viewports=[];
    for(const [width,height] of [[1366,768],[900,600]]){
      await page.setViewportSize({width,height});
      viewports.push(await bounded(page,['.arsenal-command-bar [data-action="save"]','.arsenal-command-bar [data-action="simulate"]','.arsenal-command-bar [data-action="play"]']));
      if(width<=1100){
        await page.locator('.arsenal-card-inspect[data-id="nightwalker_commander"]').click();
        assert.ok(await page.locator('#deck-dialog .arsenal-detail-command-cost').isVisible());
        assert.equal(await page.locator('#deck-dialog .arsenal-detail-command-cost b').innerText(),'1');
        await page.keyboard.press('Escape');
      }else assert.ok(await page.locator('#card-detail .arsenal-detail-command-cost').isVisible());
    }
    await page.setViewportSize({width:1366,height:768});
    await about(page);
    const prefs=await page.evaluate(()=>FrontlinesShell.getState().preferences);
    assert.equal(prefs.aiDifficulty,'easy');assert.equal(prefs.masterVolume,0);
    await page.locator('#builder-deck').selectOption(previousDraft.id);
    assert.match(await page.locator('.deck-legality').innerText(),/Unavailable card/);
    assert.equal(await page.locator('[data-action="play"]').isDisabled(),true);
    await page.reload();assert.equal(await page.locator('#builder-deck option[value="'+previousDraft.id+'"]').count(),1);
    await page.locator('#builder-deck').selectOption(previousDeck.id);
    await page.locator('[data-action="duplicate"]').click();await page.locator('#deck-name').fill('Sprint6 custom fixture');await page.keyboard.press('Control+s');
    const custom=await page.evaluate(()=>FrontlinesDeckBuilder.getDeck());assert.notEqual(custom.id,previousDeck.id);assert.deepEqual(custom.cards,previousDeck.cards);
    const retained=await page.evaluate(id=>FrontlinesDeckBuilder.getSavedDecks().find(d=>d.id===id),previousDeck.id);assert.deepEqual(retained.cards,previousDeck.cards);assert.equal(retained.name,previousDeck.name);
    await page.locator('[data-action="import"]').click();await page.locator('#deck-import-text').fill('{broken');await page.locator('[data-dialog-action="import"]').click();assert.match(await page.locator('#import-error').innerText(),/Invalid deck JSON/);await page.keyboard.press('Escape');
    const downloadPending=page.waitForEvent('download');await page.locator('[data-action="export"]').click();const download=await downloadPending;const exportPath=path.join(out,'sprint6-fixture-deck.json');await download.saveAs(exportPath);
    const exported=JSON.parse(fs.readFileSync(exportPath,'utf8'));assert.deepEqual(exported.deck.cards,custom.cards);
    await page.locator('[data-action="import"]').click();await page.locator('#deck-import-text').fill(JSON.stringify(exported));await page.locator('[data-dialog-action="import"]').click();const imported=await page.evaluate(()=>FrontlinesDeckBuilder.getDeck());assert.notEqual(imported.id,custom.id);
    await page.locator('[data-action="delete"]').click();await page.keyboard.press('Escape');assert.ok(await page.evaluate(id=>FrontlinesDeckBuilder.getSavedDecks().some(d=>d.id===id),imported.id));
    await page.locator('[data-action="delete"]').click();await page.locator('[data-dialog-action="delete"]').click();assert.equal(await page.evaluate(id=>FrontlinesDeckBuilder.getSavedDecks().some(d=>d.id===id),imported.id),false);
    await page.locator('#builder-deck').selectOption(custom.id);
    await page.evaluate(()=>localStorage.setItem('frontlines.lab.settings.v2',JSON.stringify({balanceProfile:'arsenal',count:12,aiProfiles:['deck','deck'],seed:1234})));
    await page.locator('[data-action="simulate"]').click();await page.waitForURL(/simulator\.html\?deck=/);
    assert.equal(await page.locator('#deck-a').inputValue(),custom.id);
    assert.equal(await page.locator('#balance-profile').inputValue(),'sprint7');
    assert.equal(await page.locator('#deck-a option[value="'+previousDraft.id+'"]').count(),0);
    assert.ok(await page.evaluate(id=>FrontlinesDecks.load().some(d=>d.id===id),previousDraft.id));
    await about(page);
    await page.locator('#faction-b').selectOption('stonewall');await page.locator('#deck-b').selectOption('stonewall-bastion');
    await page.locator('#match-count').fill('1');await page.locator('#toggle-developer').click();await page.locator('#seed').fill('670071');
    await page.locator('#run-button').click();await finished(page);
    const report=await page.evaluate(()=>FrontlinesSimulatorApp.getReport());
    assert.equal(report.completed,1);assert.equal(report.summary.errors,0);assert.equal(report.summary.unfinished,0);assert.equal(report.execution.runner,'worker');
    assert.equal(report.gameVersion,version);assert.equal(report.rulesSnapshot.gameVersion,version);assert.equal(report.rulesSnapshot.balanceProfile.id,'sprint7');
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('frontlines.lab.settings.v2')).gameVersion),version);
    assert.deepEqual(report.rulesSnapshot.decks.find(d=>d.id===custom.id).cards,custom.cards);
    const run=Simulator.createRun(report.options);while(!run.done)run.step();const nodeReport=run.result();
    assert.deepEqual(report.matches,nodeReport.matches);assert.equal(nodeReport.gameVersion,version);
    await page.locator('#tab-cards').click();assert.equal(await page.locator('#view-cards').isVisible(),true);
    const htmlPending=page.waitForEvent('download');await page.locator('#export-html').click();const htmlDownload=await htmlPending;const htmlPath=path.join(out,'sprint6-fixture-report.html');await htmlDownload.saveAs(htmlPath);const html=fs.readFileSync(htmlPath,'utf8');
    assert.ok(html.includes('Originating game: Frontlines v'+version));assert.ok(html.includes('&quot;gameVersion&quot;: &quot;'+version+'&quot;'));
    const archived={...nodeReport,gameVersion:'0.6.0',rulesSnapshot:{...nodeReport.rulesSnapshot,gameVersion:'0.6.0'}};assert.ok(Simulator.reportHTML(archived).includes('Originating game: Frontlines v0.6.0'));
    const unsafe={...nodeReport,gameVersion:'<script>alert(1)</script>'};assert.ok(!Simulator.reportHTML(unsafe).includes('<script>alert(1)</script>'));
    for(const [width,height] of [[1366,768],[900,600]]){await page.setViewportSize({width,height});await bounded(page,['#run-button']);}
    // An explicitly chosen historical profile in a versioned configuration
    // remains available for review rather than being silently replaced.
    await page.evaluate(gameVersion=>localStorage.setItem('frontlines.lab.settings.v2',JSON.stringify({balanceProfile:'arsenal',gameVersion,count:1,aiProfiles:['deck','deck']})),version);
    await page.goto(origin+'/simulator.html?view=advanced');assert.equal(await page.locator('#balance-profile').inputValue(),'arsenal');
    await page.goto(pathToFileURL(path.join(root,'simulator.html')).href);
    await page.evaluate(options=>FrontlinesSimulatorApp.start(options),report.options);await finished(page);
    const offline=await page.evaluate(()=>FrontlinesSimulatorApp.getReport());assert.equal(offline.execution.runner,'cooperative');assert.deepEqual(offline.matches,report.matches);assert.equal(offline.gameVersion,version);
    await about(page);
    assert.deepEqual(errors,[]);
    const result={passed:true,version,savedDeckUpgrade:true,legacyLabDefaultMigrated:true,versionedHistoricalProfilePreserved:true,invalidDraftRetained:true,commandCostsVisible:true,deckCrudImportExport:true,customDeckFixtureMatches:1,workerNodeOfflineAgreement:true,reportOriginVersion:true,viewports,errors};
    fs.writeFileSync(path.join(out,'sprint6-browser-arsenal-warroom.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
