'use strict';
// Optional UI test. Supply the path to an existing Playwright package as argv[2].
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.argv[2] || 'playwright');
const base = path.resolve(__dirname,'..');
const out = path.join(base,'test-results');
fs.mkdirSync(out,{recursive:true});

async function clickAction(page, action) {
  const hand = uid => page.locator('[data-action="hand"][data-uid="'+uid+'"]');
  const unit = uid => page.locator('[data-action="unit"][data-uid="'+uid+'"]');
  const territory = n => page.locator('[data-territory="'+n+'"]');
  switch(action.type) {
    case 'deploy': await hand(action.handUid).click(); await territory(action.territory).click(); break;
    case 'move': await unit(action.unitUid).click(); await territory(action.territory).click(); break;
    case 'attack': await unit(action.unitUid).click(); await unit(action.targetUid).click(); break;
    case 'order': await hand(action.handUid).click(); if(action.targetUid)await unit(action.targetUid).click();else await page.locator('[data-action="play-order"]').click();break;
    case 'respond': case 'counter':
      if(action.pass)await page.locator('[data-action="pass-response"]').click();
      else if(action.guardUid)await unit(action.guardUid).click();
      else await hand(action.handUid).click();
      break;
    case 'endTurn':await page.locator('[data-action="end-turn"]').click();break;
    default:throw new Error('Unknown UI action '+action.type);
  }
}

(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
  await page.goto(pathToFileURL(path.join(base,'index.html')).href);
  await page.waitForSelector('[data-action="start"]');
  assert.equal(await page.locator('#faction-0 option').count(),5);
  await page.screenshot({path:path.join(out,'setup.png'),fullPage:true});
  await page.locator('[data-action="deck"][data-player="0"]').click();
  assert.equal(await page.locator('.deck-grid .hand-card').count(),12);
  await page.locator('[data-action="close-modal"]').first().click();

  await page.evaluate(()=>FrontlinesApp.startMatch({factions:['stonewall','bruiser'],seed:631,developer:true,bothHands:false,mode:'hotseat'}));
  assert.equal(await page.locator('.privacy').count(),1);
  assert.equal(await page.locator('.hand-card').count(),0,'Hand leaked under curtain');
  await page.locator('[data-action="reveal"]').click();
  assert.equal(await page.locator('.hand-card').count(),6);
  await page.locator('[data-action="end-turn"]').click();
  assert.equal(await page.locator('.privacy').count(),1);
  assert.equal(await page.locator('.hand-card').count(),0);
  const beforeKey=await page.evaluate(()=>FrontlinesApp.getState().turn);
  await page.keyboard.press('Tab');await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>FrontlinesApp.getState().turn),beforeKey);
  await page.locator('[data-action="reveal"]').click();

  await page.evaluate(()=>FrontlinesApp.startMatch({factions:['stonewall','bruiser'],seed:631,developer:true,bothHands:true,mode:'hotseat'}));
  let decisions=0,captures=0,deaths=0,responses=0;
  while(await page.evaluate(()=>FrontlinesApp.getState().winner===null)){
    const before=await page.evaluate(()=>FrontlinesApp.getState());
    const action=await page.evaluate(()=>FrontlinesAI.chooseAction(FrontlinesApp.getState()));
    await clickAction(page,action);
    const after=await page.evaluate(()=>FrontlinesApp.getState());
    assert.notDeepEqual(after,before,'UI action did not change state: '+JSON.stringify(action));
    if(after.contested!==before.contested||after.winner!==null)captures++;
    if(before.units.some(u=>!after.units.some(n=>n.uid===u.uid))&&action.type!=='order')deaths++;
    if(action.type==='respond')responses++;
    decisions++;
    if(decisions===32){await page.screenshot({path:path.join(out,'battlefield.png'),fullPage:true});}
    assert.ok(decisions<1500,'UI match did not end');
  }
  await page.waitForSelector('.victory-modal');
  await page.screenshot({path:path.join(out,'victory.png'),fullPage:true});
  assert.ok(captures>=4);assert.ok(responses>0);assert.ok(deaths>0);
  await page.locator('[data-action="rematch"]').click();
  assert.equal(await page.evaluate(()=>FrontlinesApp.getState().turn),1);
  assert.equal(await page.evaluate(()=>FrontlinesApp.getState().winner),null);
  await page.waitForTimeout(1200);
  assert.equal(await page.locator('.victory-modal').count(),0,'Old victory timer leaked');

  // Fresh HTTP launch and several viewport sizes; board must fit horizontally.
  await page.goto('http://127.0.0.1:4173');
  await page.waitForSelector('[data-action="start"]');
  await page.evaluate(()=>FrontlinesApp.startMatch({seed:41001,developer:true,bothHands:true,mode:'hotseat'}));
  for(const width of [1920,1440,1366,1024]){
    await page.setViewportSize({width,height:900});
    assert.equal(await page.locator('.territory').count(),7);
    const size=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,view:innerWidth,board:document.querySelector('.battlefield').getBoundingClientRect().width}));
    assert.ok(size.doc<=size.view+1,'Viewport overflow '+JSON.stringify(size));
  }
  await page.setViewportSize({width:1366,height:768});
  await page.screenshot({path:path.join(out,'laptop.png'),fullPage:true});
  await page.locator('[data-action="settings"]').click();
  await page.locator('[data-setting="animationSpeed"]').selectOption('fast');
  await page.locator('[data-setting="reducedEffects"]').check();
  await page.locator('[data-setting="reducedShake"]').check();
  await page.locator('[data-action="close-modal"]').first().click();
  assert.equal(await page.evaluate(()=>FrontlinesApp.getSettings().animationSpeed),'fast');
  await page.reload();
  await page.waitForSelector('[data-action="start"]');
  assert.equal(await page.evaluate(()=>FrontlinesApp.getSettings().animationSpeed),'fast');
  await browser.close();
  assert.deepEqual(errors,[],'Browser errors');
  console.log(JSON.stringify({fileLaunch:true,httpLaunch:true,decisions,captures,deaths,responses,viewportWidths:[1920,1440,1366,1024],consoleErrors:errors.length,rematch:true,privacy:true,settingsPersist:true},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
