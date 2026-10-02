'use strict';
// Optional presentation/browser regression. Existing Playwright path as argv[2].
const assert=require('node:assert/strict');
const {chromium}=require(process.argv[2]||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/index.html?screen=play');await page.waitForSelector('[data-action="start"]');
 await page.locator('[data-action="settings"]').click();
 await page.locator('[data-settings-tab="audio"]').click();
 await page.locator('[data-pref="sound"]').check();
 await page.locator('.shell-settings [data-shell-action="close-settings"]').first().click();
 // A turn draw survives privacy as a count, then animates only the new card.
 await page.evaluate(()=>FrontlinesApp.startMatch({factions:['stonewall','bruiser'],seed:41000,mode:'hotseat',developer:false,bothHands:false}));
 await page.locator('[data-action="reveal"]').click();
 const oldHand=await page.evaluate(()=>FrontlinesApp.getState().players[1].hand.map(h=>h.uid));
 await page.evaluate(()=>FrontlinesApp.dispatch({type:'endTurn'}));
 assert.equal(await page.locator('.hand-card').count(),0,'Turn draw leaked under privacy');
 assert.equal(await page.locator('.faction-fx-layer').count(),0,'Turn draw retained private overlays');
 const drawReveal=await page.evaluate(previous=>{
  document.querySelector('[data-action="reveal"]').click();
  const cards=Array.from(document.querySelectorAll('.hand-area .hand-card'));
  return {newAnimated:cards.filter(n=>!previous.includes(n.dataset.uid)&&n.getAnimations().length>0).length,oldAnimated:cards.filter(n=>previous.includes(n.dataset.uid)&&n.getAnimations().length>0).length};
 },oldHand);
 assert.equal(drawReveal.newAnimated,1,'New turn card did not animate after reveal');
 assert.equal(drawReveal.oldAnimated,0,'Turn draw animated the entire existing hand');
 await page.evaluate(()=>{window.testAudio=[];FrontlinesEffects.setSoundAdapter(e=>testAudio.push(e.name));FrontlinesApp.startMatch({factions:['nightwalker','rogue'],seed:41001,mode:'hotseat',developer:false,bothHands:false});});
 let decisions=0,publicReplays=0,deathReplays=0;
 while(await page.evaluate(()=>FrontlinesApp.getState().winner===null)){
  if(await page.locator('.privacy').count())await page.locator('[data-action="reveal"]').click();
  const before=await page.evaluate(()=>FrontlinesApp.getState());
  const choice=await page.evaluate(()=>FrontlinesAI.chooseAction(FrontlinesApp.getState()));
  await page.evaluate(a=>FrontlinesApp.dispatch(a),choice);
  const after=await page.evaluate(()=>FrontlinesApp.getState());
  const died=before.units.some(u=>!after.units.some(n=>n.uid===u.uid)&&!after.players[u.owner].hand.some(h=>h.uid===u.uid));
  if(await page.locator('.privacy').count()){
   assert.equal(await page.locator('.hand-card').count(),0);
   assert.equal(await page.locator('.faction-fx-layer .hand-card').count(),0);
   assert.equal(await page.locator('.faction-fx-layer').count(),0,'Live overlays under privacy');
   await page.locator('[data-action="reveal"]').click();
   if(died){assert.ok(await page.locator('.fx-casualty').count()>0,'Public death not replayed on reveal');deathReplays++;}
   publicReplays++;
  }
  assert.ok(await page.locator('.faction-fx-layer > *').count()<=48,'Effects unbounded');
  assert.equal(await page.locator('.faction-fx-layer .hand-card').count(),0);
  decisions++;assert.ok(decisions<1200);
 }
 await page.waitForSelector('.victory-modal');
 await page.waitForTimeout(1200);
 assert.equal(await page.locator('.faction-fx-layer > *').count(),0,'Effects failed cleanup');
 assert.ok(deathReplays>0);assert.ok(publicReplays>5);
 assert.ok(await page.evaluate(()=>testAudio.length)>0,'No replaceable audio hooks fired');
 await page.locator('[data-action="rematch"]').click();
 assert.equal(await page.locator('.faction-fx-layer').count(),0,'Rematch retained effects');
 // Verify actual paced AI, allowing it to take player2 actions on its own.
 await page.evaluate(()=>{FrontlinesEffects.configure({animationSpeed:'fast',sound:false,reducedEffects:true});FrontlinesApp.startMatch({factions:['bruiser','stonewall'],seed:1209,mode:'ai',developer:false,bothHands:false});});
 await page.locator('[data-action="settings"]').click();
 await page.locator('[data-settings-tab="interface"]').click();
 await page.locator('#shell-animation').selectOption('fast');
 await page.locator('[data-pref="reducedEffects"]').check();
 await page.locator('.shell-settings [data-shell-action="close-settings"]').first().click();
 let humanDecisions=0;
 while(await page.evaluate(()=>FrontlinesApp.getState().winner===null)){
  const actor=await page.evaluate(()=>FrontlinesEngine.getActor(FrontlinesApp.getState()));
  if(actor===0){await page.evaluate(()=>FrontlinesApp.dispatch(FrontlinesAI.chooseAction(FrontlinesApp.getState())));humanDecisions++;}
  else await page.waitForTimeout(80);
  assert.ok(humanDecisions<1200);
 }
 await page.waitForSelector('.victory-modal');
 assert.equal(await page.locator('.fx-tracer').count(),0,'Reduced mode emitted tracers');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({hotseatDrawReveal:true,hotseatComplete:true,decisions,publicReplays,deathReplays,actualAIComplete:true,humanDecisions,audioHooks:true,effectCleanup:true,reducedEffects:true,errors:0},null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
