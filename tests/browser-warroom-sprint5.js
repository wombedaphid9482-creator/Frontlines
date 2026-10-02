'use strict';
// Optional visual/interaction check: pass an installed Playwright package path as argv[2].
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.argv[2] || 'playwright');
const Simulator = require('../sim-core.js');
const base = path.resolve(__dirname, '..'), out = path.join(base, 'test-results');
fs.mkdirSync(out, {recursive:true});
const sizes = [{width:1920,height:1080},{width:2560,height:1440},{width:1366,height:768},{width:1280,height:720},{width:900,height:600},{width:390,height:844}];
const finished = page => page.waitForFunction(() => ['completed','stopped','error'].includes(FrontlinesSimulatorApp.getStatus().status), {}, {timeout:120000});
function headless(options) { const run=Simulator.createRun(options);while(!run.done)run.step();return run.result(); }
async function fit(page, name, controls) {
  const bounds = await page.evaluate(selectors => {
    const root=document.documentElement;
    return {width:innerWidth,height:innerHeight,scrollWidth:root.scrollWidth,scrollHeight:root.scrollHeight,controls:selectors.map(selector=>{
      const node=document.querySelector(selector),rect=node?.getBoundingClientRect();
      let clipped=false;
      if(rect)for(let parent=node.parentElement;parent;parent=parent.parentElement){const style=getComputedStyle(parent),box=parent.getBoundingClientRect();if(['hidden','auto','scroll','clip'].includes(style.overflowY)&&(rect.top<box.top-1||rect.bottom>box.bottom+1))clipped=true;if(['hidden','auto','scroll','clip'].includes(style.overflowX)&&(rect.left<box.left-1||rect.right>box.right+1))clipped=true;}
      return {selector,visible:!!rect&&rect.width>0&&rect.height>0,clipped,top:rect?.top,bottom:rect?.bottom,left:rect?.left,right:rect?.right,height:rect?.height};
    })};
  }, controls);
  assert.ok(bounds.scrollWidth<=bounds.width+1, name+' page width');
  assert.ok(bounds.scrollHeight<=bounds.height+1, name+' page height');
  for(const box of bounds.controls){assert.ok(box.visible&&!box.clipped,name+' visible and unclipped '+box.selector+' '+JSON.stringify(box));assert.ok(box.top>=-1&&box.bottom<=bounds.height+1&&box.left>=-1&&box.right<=bounds.width+1,name+' accessible '+box.selector+' '+JSON.stringify(box));}
  return bounds;
}
(async()=>{
  const browser = await chromium.launch({headless:true,channel:'msedge'});
  try {
    const context=await browser.newContext({viewport:sizes[2],acceptDownloads:true});
    const page=await context.newPage(), errors=[], matrix=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    await page.goto('http://127.0.0.1:4173/simulator.html');
    await page.evaluate(()=>localStorage.clear());await page.reload();
    assert.equal(await page.locator('#war-room-landing').isVisible(),true);
    assert.equal(await page.locator('[data-war-room]').count(),4);
    for(const size of sizes){
      await page.setViewportSize(size);
      const minimum=size.width<440?['.lab-header [data-shell-action="home"]','.lab-header [data-shell-action="settings"]']:['[data-war-room="quick"]','[data-war-room="tournament"]','[data-war-room="factions"]','[data-war-room="advanced"]'];
      matrix.push({screen:'home',...size,bounds:await fit(page,'Home '+size.width,minimum)});
    }
    await page.setViewportSize(sizes[2]);
    await page.screenshot({path:path.join(out,'sprint5-warroom-home.png')});
    await page.locator('[data-war-room="quick"]').click();
    assert.equal(await page.locator('#developer-policy').isVisible(),false);
    assert.equal(await page.locator('#tab-matches').isVisible(),false);
    assert.equal(await page.locator('#export-json').isVisible(),false);
    assert.equal(await page.locator('#balance-profile').inputValue(),await page.evaluate(()=>FrontlinesBalance.DEFAULT_PROFILE));
    assert.equal(await page.locator('#ai-a').inputValue(),'deck');
    for(const size of sizes.slice(0,5)){await page.setViewportSize(size);await fit(page,'Quick setup '+size.width,['#faction-a','#deck-a','#faction-b','#deck-b','#match-count','[data-count="1000"]','[data-count="10000"]','[data-count="50000"]','#run-button']);}
    await page.setViewportSize(sizes[2]);
    // A saved deck uses the same local catalog and exact card list in simulations.
    const own=await page.evaluate(()=>{
      const library=FrontlinesDecks,preset=library.presets().find(deck=>deck.id==='stonewall-counteroffensive'),result=library.duplicate(preset,'War Room custom defense');
      if(!result.ok)throw new Error(result.error);return result.deck;
    });
    await page.locator('#refresh-decks').click();
    await page.locator('#deck-a').selectOption(own.id);
    await page.locator('#deck-b').selectOption('bruiser-heavy-breakthrough');
    await page.locator('#match-count').fill('12');await page.locator('#run-button').click();await finished(page);
    const duel=await page.evaluate(()=>FrontlinesSimulatorApp.getReport());
    assert.equal(duel.completed,12);assert.equal(duel.summary.errors,0);
    assert.equal(duel.rulesSnapshot.decks.find(deck=>deck.id===own.id).name,own.name);
    assert.deepEqual(duel.matches,headless(duel.options).matches);
    assert.equal(await page.locator('.deck-result-card').count(),2);
    assert.ok((await page.locator('#player-summary').innerText()).includes(own.name));
    assert.ok(!(await page.locator('#run-description').innerText()).includes('seed'));
    for(const tab of ['decks','cards','economy','territory','overview']){await page.locator('[data-tab="'+tab+'"]').click();assert.equal(await page.locator('#view-'+tab).isVisible(),true);}
    assert.equal(await page.locator('#economy-table tbody tr').count(),2);
    assert.ok(await page.locator('#territory-metrics').innerText());
    for(const size of sizes){
      await page.setViewportSize(size);
      matrix.push({screen:'results',...size,bounds:await fit(page,'Results '+size.width,['#run-button','#back-war-room','#toggle-developer'])});
      if(size.width<781){await page.locator('[data-workspace-pane="setup"]').click();assert.equal(await page.locator('#configuration').isVisible(),true);await page.locator('[data-workspace-pane="results"]').click();}
    }
    await page.setViewportSize(sizes[2]);
    fs.mkdirSync(path.join(base,'docs','screenshots'),{recursive:true});
    await page.screenshot({path:path.join(base,'docs','screenshots','war-room-sprint-5.png')});
    await page.locator('#toggle-developer').click();
    assert.equal(await page.locator('#developer-policy').isVisible(),true);assert.equal(await page.locator('#tab-matches').isVisible(),true);
    for(const size of sizes){await page.setViewportSize(size);await fit(page,'Advanced '+size.width,['#run-button','#back-war-room','#toggle-developer']);}
    await page.setViewportSize(sizes[2]);
    await page.locator('#tab-matches').click();await page.locator('#match-rows [data-match="0"]').click();
    await page.waitForFunction(()=>document.querySelector('#replay-trace').textContent.includes('DECISION TRACE'));
    await fit(page,'Replay',['#close-replay']);await page.keyboard.press('Escape');assert.equal(await page.locator('#replay-dialog').isVisible(),false);
    await page.locator('#tab-compare').click();
    const previous=path.join(out,'sprint5-warroom-previous.json');fs.writeFileSync(previous,JSON.stringify(duel));
    await page.locator('#import-report').setInputFiles(previous);await page.waitForFunction(()=>document.querySelector('#compare-deck-before').options.length>0);
    const pending=page.waitForEvent('download');await page.locator('#export-html').click();const download=await pending;await download.saveAs(path.join(out,'sprint5-warroom-report.html'));
    assert.ok(fs.readFileSync(path.join(out,'sprint5-warroom-report.html'),'utf8').includes(own.name));
    // Advanced parameters and invalid cross-field rules remain accessible and authoritative.
    await page.locator('#run-form .advanced summary').first().click();await page.locator('#rule-commandCap').fill('1');
    await page.locator('#run-button').click();assert.ok((await page.locator('#form-error').innerText()).match(/cap.*lower/i));
    await page.locator('#reset-rules').click();await page.locator('#run-form .advanced summary').first().click();
    await page.locator('#back-war-room').click();await page.locator('[data-war-room="tournament"]').click();
    await page.locator('#pool-archetypes').click();assert.equal(await page.locator('#matrix-deck-pool option:checked').count(),10);
    assert.equal(await page.locator('#pool-choices input:checked').count(),10);
    await page.locator('#match-count').fill('90');await page.locator('#run-button').click();await finished(page);
    const tournament=await page.evaluate(()=>FrontlinesSimulatorApp.getReport());
    assert.equal(tournament.completed,90);assert.equal(tournament.summary.errors,0);assert.equal(tournament.summary.byMatchup.length,45);
    assert.deepEqual(tournament.matches,headless(tournament.options).matches);
    const cross=tournament.summary.byFactionCross;
    if(cross&&cross.some(row=>row.decisive)){
      await page.locator('#tab-overview').click();assert.match(await page.locator('#sample-note').innerText(),/cross-faction rates/);
      for(let index=0;index<cross.length;index++){const rate=cross[index].winRate===null?'—':(cross[index].winRate*100).toFixed(1)+'%';assert.ok((await page.locator('#faction-rows tr').nth(index).locator('td').nth(3).innerText()).includes(rate));}
    }
    // Long runs always expose pause/stop in the command bar even when setup is scrolled.
    await page.locator('#match-count').fill('10000');await page.locator('#run-button').click();
    await page.waitForFunction(()=>FrontlinesSimulatorApp.getStatus().completed>2);
    await page.locator('#pause-button').click();await page.waitForFunction(()=>FrontlinesSimulatorApp.getStatus().status==='paused');
    for(const size of sizes){await page.setViewportSize(size);await fit(page,'Paused '+size.width,['#pause-button','#stop-button','#run-button']);}
    await page.setViewportSize(sizes[2]);await page.locator('#stop-button').click();await finished(page);
    const stopped=await page.evaluate(()=>FrontlinesSimulatorApp.getReport());assert.ok(stopped.completed<10000);assert.equal(stopped.summary.errors,0);
    await page.locator('#back-war-room').click();await page.locator('[data-war-room="factions"]').click();
    assert.equal(await page.locator('#matrix-deck-pool option:checked').count(),5);assert.equal(await page.locator('#workspace-title').innerText(),'Faction Overview');
    await page.locator('.lab-header [data-shell-action="settings"]').click();assert.equal(await page.locator('.shell-settings').isVisible(),true);
    await page.keyboard.press('Escape');assert.equal(await page.locator('.shell-settings').count(),0);assert.equal(await page.locator('#workspace-title').innerText(),'Faction Overview');
    await page.keyboard.press('Escape');assert.equal(await page.locator('#war-room-landing').isVisible(),true);
    await page.goto('http://127.0.0.1:4173/simulator.html?view=advanced');assert.equal(await page.locator('#developer-policy').isVisible(),true);
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('.war-room-command').first().evaluate(node=>getComputedStyle(node).transitionDuration),'0s');
    // File-open launch retains the cooperative runner, report format and exact outcomes.
    await page.goto(pathToFileURL(path.join(base,'simulator.html')).href);
    await page.evaluate(options=>FrontlinesSimulatorApp.start(options),duel.options);await finished(page);
    const offline=await page.evaluate(()=>FrontlinesSimulatorApp.getReport());assert.equal(offline.execution.runner,'cooperative');assert.deepEqual(offline.matches,duel.matches);
    assert.deepEqual(errors,[]);
    const result={passed:true,customDuel:12,tournament:90,pairings:45,workerNodeOfflineAgreement:true,pauseStop:true,advancedReplayComparison:true,viewportMatrix:matrix,errors};
    fs.writeFileSync(path.join(out,'sprint5-warroom-browser.json'),JSON.stringify(result,null,2));
    console.log(JSON.stringify({...result,viewportMatrix:matrix.map(({screen,width,height})=>({screen,width,height}))}));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
