'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.argv[2]||'playwright');
const origin=process.env.FRONTLINES_TEST_URL||'http://127.0.0.1:4173',out=path.resolve(__dirname,'../test-results');
const evidence={passed:false,largeCampaigns:0,completeMatches:0,errors:[]};
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try{
    const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage();
    page.on('pageerror',e=>evidence.errors.push(e.message));
    await page.goto(origin);await page.waitForFunction(()=>window.FrontlinesApp);
    await page.evaluate(()=>FrontlinesApp.showScreen('play'));
    assert.equal(await page.locator('[data-action="random-enemy"]').count(),1);
    await page.locator('[data-action="random-enemy"]').click();
    let settings=await page.evaluate(()=>FrontlinesApp.getSettings());assert.equal(settings.mode,'ai');
    const valid=await page.evaluate(()=>{
      const s=FrontlinesApp.getSettings(),d=FrontlinesDecks.forData(FrontlinesData).getDecks().find(d=>d.id===s.deckIds[1]);
      return FrontlinesDecks.forData(FrontlinesData).validate({...d,commanderId:s.commanderIds[1]}).legal;
    });assert.equal(valid,true);evidence.randomEnemy=true;
    await page.locator('#faction-1').selectOption('rogue');
    await page.locator('#commander-1').selectOption('commander_rogue_drifter');
    await page.locator('[data-action="random-enemy-deck"]').click();
    settings=await page.evaluate(()=>FrontlinesApp.getSettings());assert.equal(settings.factions[1],'rogue');assert.equal(settings.commanderIds[1],'commander_rogue_drifter');evidence.randomDeckPreservesFactionAndCommander=true;
    const oldEnemy=FrontlinesKey(settings);
    await page.locator('[data-action="start"]').click();await page.waitForFunction(()=>!!FrontlinesApp.getState());
    assert.equal(await page.locator('.random-opponent-controls').count(),0);
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('frontlines.settings.v1')));assert.equal(saved.lastOpponent,oldEnemy);evidence.lastPlayedOpponentSaved=true;
    await page.reload();await page.waitForFunction(()=>window.FrontlinesApp);await page.evaluate(()=>FrontlinesApp.showScreen('play'));
    await page.locator('[data-action="random-enemy-deck"]').click();settings=await page.evaluate(()=>FrontlinesApp.getSettings());assert.notEqual(FrontlinesKey(settings),oldEnemy);evidence.avoidLastOpponent=true;
    await page.locator('[data-setting="avoidLastOpponent"]').uncheck();await page.reload();await page.waitForFunction(()=>window.FrontlinesApp);
    assert.equal(await page.evaluate(()=>FrontlinesApp.getSettings().avoidLastOpponent),false);evidence.preferencePersists=true;
    await page.evaluate(()=>localStorage.setItem('frontlines.lab.settings.v2',JSON.stringify({gameVersion:'1.0.2',balanceProfile:'sprint9',mode:'matrix',count:100000,seed:1209,ai:'deck',includeMirrors:true})));
    await page.goto(origin+'/simulator.html');await page.waitForFunction(()=>!!document.querySelector('#balance-profile')?.options.length);
    assert.equal(await page.locator('#balance-profile').inputValue(),'sprint10');evidence.labDefaultMigration=true;
    assert.deepEqual(evidence.errors,[]);evidence.passed=true;fs.writeFileSync(path.join(out,'sprint10-playtest-browser.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));await context.close();
  }finally{await browser.close();}
})().catch(error=>{evidence.failure=String(error.stack||error);fs.writeFileSync(path.join(out,'sprint10-playtest-browser.json'),JSON.stringify(evidence,null,2)+'\n');console.error(error);process.exitCode=1;});
function FrontlinesKey(s){return [s.factions[1],s.deckIds[1],s.commanderIds[1]].join('/');}
