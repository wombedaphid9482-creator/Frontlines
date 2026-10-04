'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.argv[2]||'playwright');
const base='http://127.0.0.1:4173',output=path.resolve(__dirname,'../test-results');fs.mkdirSync(output,{recursive:true});
async function snapshot(page){return page.evaluate(()=>FrontlinesApp.getTutorialState());}
async function next(page){const before=(await snapshot(page)).index;await page.locator('[data-tutorial-action="next"]').click();await page.waitForFunction(i=>FrontlinesApp.getTutorialState().index>i,before);}
async function enact(page,action){
  const before=await page.evaluate(()=>JSON.stringify(FrontlinesApp.getState()));
  const select=(kind,uid)=>page.locator('[data-action="'+kind+'"][data-uid="'+uid+'"]');
  if(action.type==='deploy'||action.type==='order')await select('hand',action.handUid).click();
  if(action.type==='move'||action.type==='attack')await select('unit',action.unitUid).click();
  if(action.territory!==undefined)await page.locator('.territory[data-territory="'+action.territory+'"] .territory-header').click();
  else if(action.targetUid)await select('unit',action.targetUid).click();
  else if(action.type==='order')await page.locator('[data-action="play-order"]').click();
  else if(action.type==='endTurn')await page.locator('[data-action="end-turn"]').click();
  else if(action.pass)await page.locator('[data-action="pass-response"]').click();
  else if(action.guardUid)await select('unit',action.guardUid).click();
  else if((action.type==='respond'||action.type==='counter')&&action.handUid)await select('hand',action.handUid).click();
  await page.waitForFunction(previous=>JSON.stringify(FrontlinesApp.getState())!==previous,before);
}
async function bounds(page){return page.evaluate(()=>{
  const selectors=['#tutorial-coach','[data-tutorial-action="hint"]','[data-tutorial-action="next"]','[data-tutorial-action="restart-lesson"]'];
  const rect=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
  return {width:innerWidth,height:innerHeight,pageWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,
    controls:selectors.map(selector=>({selector,...rect(document.querySelector(selector))})),
    huds:Array.from(document.querySelectorAll('.player-hud,.turn-hud')).map(rect),
    board:rect(document.querySelector('.game>section[aria-label="Battlefield"]')),
    coach:rect(document.querySelector('#tutorial-coach')),dock:rect(document.querySelector('.orders-bar')),
    guidance:rect(document.querySelector('.order-guidance')),commandButtons:Array.from(document.querySelectorAll('.orders-bar button')).map(rect).filter(button=>button.height>0)};
});}
function assertLayout(result){
  assert.ok(result.pageWidth<=result.width+1&&result.pageHeight<=result.height+1,'Tutorial document overflow '+JSON.stringify(result));
  for(const c of result.controls)assert.ok(c.x>=0&&c.y>=0&&c.right<=result.width+1&&c.bottom<=result.height+1,'Tutorial control outside viewport '+JSON.stringify(c));
  for(const hud of result.huds)assert.ok(hud.bottom<=Math.min(result.board.y,result.coach.y)+2,'HUD overlaps playable field or coach '+JSON.stringify(result));
  assert.ok(result.board.bottom<=result.dock.y+1,'Battlefield section extends under the command dock '+JSON.stringify(result));
  assert.ok(result.guidance.y>=result.dock.y-1&&result.guidance.bottom<=result.dock.bottom+1,'Selected command guidance escapes its dock '+JSON.stringify(result));
  for(const button of result.commandButtons)assert.ok(button.x>=result.dock.x-1&&button.right<=result.dock.right+1&&button.y>=result.dock.y-1&&button.bottom<=result.dock.bottom+1,'Command button escapes its dock '+JSON.stringify(result));
}
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'}),context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
  await page.goto(base);await page.waitForFunction(()=>!!window.FrontlinesApp?.startTutorial);await page.locator('.welcome-prompt [data-action="tutorial"]').click();await page.waitForSelector('#tutorial-coach');
  const matrix=[];
  for(const [width,height] of [[1920,1080],[2560,1440],[1366,768],[1280,720],[900,600],[390,844]]){
    await page.setViewportSize({width,height});const result=await bounds(page);matrix.push(result);
    assertLayout(result);
  }
  await page.setViewportSize({width:1366,height:768});
  await page.locator('[data-tutorial-action="hint"]').click();assert.equal((await snapshot(page)).hintLevel,1);await page.locator('[data-tutorial-action="hint"]').click();assert.equal((await snapshot(page)).hintLevel,2);await page.locator('[data-tutorial-action="hint"]').click();assert.equal((await snapshot(page)).hintLevel,3);assert.equal(await page.locator('[data-tutorial-action="hint"]').isDisabled(),true);
  await next(page);let s=await snapshot(page);
  const before=await page.evaluate(()=>JSON.stringify(FrontlinesApp.getState()));await page.locator('[data-action="end-turn"]').click();assert.equal(await page.evaluate(()=>JSON.stringify(FrontlinesApp.getState())),before);
  let commands=await page.evaluate(()=>FrontlinesApp.getState().actionsLeft);await enact(page,{type:'deploy',handUid:s.refs.deploy,territory:2});assert.equal(await page.evaluate(()=>FrontlinesApp.getState().actionsLeft),commands);assert.equal((await snapshot(page)).complete,true);
  await page.locator('[data-action="home"]').click();assert.equal(await page.locator('#tutorial-coach').count(),0);await page.locator('[data-action="open-play"]').click();assert.equal((await snapshot(page)).index,1);assert.equal((await snapshot(page)).complete,true);
  await next(page);s=await snapshot(page);await enact(page,{type:'deploy',handUid:s.refs.deploy,territory:2});await next(page);
  s=await snapshot(page);await enact(page,{type:'deploy',handUid:s.refs.deploy,territory:2});await enact(page,{type:'attack',unitUid:s.refs.attacker,targetUid:s.refs.enemy});await page.waitForFunction(()=>FrontlinesApp.getTutorialState().complete);await next(page);
  s=await snapshot(page);
  await page.setViewportSize({width:900,height:600});
  await page.locator('[data-action="unit"][data-uid="'+s.refs.attacker+'"]').click();
  const combatBounds=await bounds(page);assertLayout(combatBounds);
  assert.equal(await page.locator('#toast.visible').count(),0,'A prior lesson rejection must not cover the new fixture.');
  assert.equal(await page.locator('.tutorial-combat-preview').evaluate(n=>{const r=n.getBoundingClientRect(),parent=n.closest('.tutorial-coach-body').getBoundingClientRect();return r.top>=parent.top&&r.bottom<=parent.bottom;}),true,'Combat forecast must be visible before reading the longer explanation.');
  await page.screenshot({path:path.resolve(__dirname,'../docs/screenshots/tutorial-minimum-sprint-9.png')});
  await page.locator('[data-action="unit"][data-uid="'+s.refs.enemy+'"]').click();await page.waitForFunction(()=>!!FrontlinesApp.getState().response);
  await page.locator('[data-action="settings"]').click();const pausedCombat=await page.evaluate(()=>JSON.stringify(FrontlinesApp.getState()));
  await page.waitForTimeout(850);assert.equal(await page.evaluate(()=>JSON.stringify(FrontlinesApp.getState())),pausedCombat,'Opening Settings must pause the controlled defender response.');
  await page.keyboard.press('Escape');await page.waitForFunction(()=>FrontlinesApp.getTutorialState().complete);await page.setViewportSize({width:1366,height:768});await next(page);
  s=await snapshot(page);await enact(page,{type:'move',unitUid:s.refs.mover,territory:3});await enact(page,{type:'endTurn'});assert.equal(await page.evaluate(()=>FrontlinesApp.getState().contested),4);await next(page);
  s=await snapshot(page);await enact(page,{type:'endTurn'});assert.equal(await page.evaluate(uid=>FrontlinesApp.getState().units.find(u=>u.uid===uid).territory,s.refs.enemy),4);assert.match(await page.locator('.tutorial-feedback').textContent(),/retreated/);
  await page.locator('[data-tutorial-action="next"]').click();assert.equal((await snapshot(page)).phase,1);s=await snapshot(page);await enact(page,{type:'endTurn'});assert.equal(await page.evaluate(uid=>FrontlinesApp.getState().units.some(u=>u.uid===uid),s.refs.enemy),false);assert.match(await page.locator('.tutorial-feedback').textContent(),/NO RETREAT/);await next(page);
  s=await snapshot(page);await enact(page,{type:'order',handUid:s.refs.order,targetUid:s.refs.enemy});assert.equal((await snapshot(page)).complete,true);await next(page);
  const factionState=await page.evaluate(()=>JSON.stringify(FrontlinesApp.getState()));for(const faction of ['stonewall','bruiser','syndicate','nightwalker','rogue']){await page.locator('[data-tutorial-faction="'+faction+'"]').click();assert.ok((await page.locator('.tutorial-example').textContent()).length>40);}assert.equal(await page.evaluate(()=>JSON.stringify(FrontlinesApp.getState())),factionState);await next(page);
  s=await snapshot(page);await page.locator('[data-tutorial-action="restart-lesson"]').click();assert.equal((await snapshot(page)).index,9);s=await snapshot(page);await enact(page,{type:'move',unitUid:s.refs.secondChoice,territory:3});await enact(page,{type:'endTurn'});await next(page);
  assert.equal((await snapshot(page)).index,10);let passive=await snapshot(page);assert.ok(await page.locator('[data-commander-player="0"]').isVisible());assert.match(await page.locator('[data-commander-player="0"]').innerText(),/The Warden/);const wounded=await page.evaluate(uid=>FrontlinesApp.getState().units.find(u=>u.uid===uid).damage,passive.refs.passiveAlly);await enact(page,{type:'endTurn'});await page.waitForFunction(()=>FrontlinesApp.getTutorialState().complete);assert.equal(await page.evaluate(uid=>FrontlinesApp.getState().units.find(u=>u.uid===uid).damage,passive.refs.passiveAlly),wounded-1);await next(page);
  let command=await snapshot(page);await page.locator('[data-action="commander"][data-player="0"]').click();await page.locator('[data-action="unit"][data-uid="'+command.refs.activeAlly+'"]').click();assert.equal((await snapshot(page)).complete,true);assert.equal(await page.evaluate(()=>FrontlinesApp.getState().players[0].commander.used),true);assert.equal(await page.evaluate(uid=>FrontlinesApp.getState().units.find(u=>u.uid===uid).damage,command.refs.activeAlly),0);assert.equal(await page.locator('[data-action="commander"][data-player="0"]').isDisabled(),true);await next(page);
  assert.equal((await snapshot(page)).index,12);await page.locator('[data-tutorial-commander="commander_stonewall_marshal"]').click();assert.match(await page.locator('.tutorial-commander-copy').innerText(),/survives as the defender/);await page.locator('[data-tutorial-commander="commander_stonewall_warden"]').click();await next(page);assert.equal(await page.evaluate(()=>FrontlinesApp.getState().players[0].commander.id),'commander_stonewall_warden');
  assert.equal((await snapshot(page)).training,true);await page.evaluate(()=>FrontlinesShell.savePreferences({animationSpeed:'fast',reducedEffects:true,reducedShake:true}));
  let playerClicks=0;
  while(await page.evaluate(()=>FrontlinesApp.getState().winner===null)&&playerClicks<100){
    await page.waitForFunction(()=>FrontlinesApp.getState().winner!==null||FrontlinesEngine.getActor(FrontlinesApp.getState())===0);
    if(await page.evaluate(()=>FrontlinesApp.getState().winner!==null))break;
    const action=await page.evaluate(()=>FrontlinesAI.chooseAction(FrontlinesApp.getState(),{profile:'deck',difficulty:'normal'}));await enact(page,action);playerClicks++;
  }
  assert.equal(await page.evaluate(()=>FrontlinesApp.getState().winner),0);assert.ok(await page.evaluate(()=>FrontlinesApp.getState().stats.turns[1]>0));assert.equal((await snapshot(page)).progress.complete,true);assert.equal(await page.locator('.victory-overlay').count(),0);assert.equal(await page.evaluate(()=>FrontlinesApp.getPlaytestReport()),null);
  await page.setViewportSize({width:1280,height:720});const trainingBounds=await bounds(page);assertLayout(trainingBounds);
  await page.screenshot({path:path.resolve(__dirname,'../docs/screenshots/tutorial-sprint-9.png')});await page.locator('[data-tutorial-action="next"]').click();await page.locator('[data-action="home"]').click();assert.match(await page.locator('.home-actions [data-action="tutorial"]').textContent(),/REPLAY TUTORIAL/);
  await page.locator('.home-actions [data-action="tutorial"]').click();assert.equal((await snapshot(page)).index,0);await page.locator('#tutorial-coach summary').click();await page.locator('[data-tutorial-action="skip"]').click();assert.equal(await page.locator('#tutorial-coach').count(),0);
  // Revisit the final lesson through its persisted Continue path, then make
  // deliberately unproductive human turns to verify the actual defeat/retry UI.
  await page.evaluate(()=>{localStorage.setItem(FrontlinesTutorial.STORAGE_KEY,JSON.stringify({version:2,index:13,started:true,complete:false,completedLessons:[0,1,2,3,4,5,6,7,8,9,10,11,12]}));FrontlinesApp.startTutorial(true);});
  let lossClicks=0;
  while(await page.evaluate(()=>FrontlinesApp.getState().winner===null)&&lossClicks<30){
    await page.waitForFunction(()=>FrontlinesApp.getState().winner!==null||FrontlinesEngine.getActor(FrontlinesApp.getState())===0);
    if(await page.evaluate(()=>FrontlinesApp.getState().winner!==null))break;
    const action=await page.evaluate(()=>FrontlinesApp.getState().response?{type:FrontlinesApp.getState().response.stage==='counter'?'counter':'respond',pass:true}:{type:'endTurn'});await enact(page,action);lossClicks++;
  }
  assert.equal(await page.evaluate(()=>FrontlinesApp.getState().winner),1);assert.match(await page.locator('[data-tutorial-action="next"]').textContent(),/Retry training/);assert.equal(await page.locator('[data-tutorial-action="next"]').isEnabled(),true);
  await page.locator('[data-tutorial-action="next"]').click();assert.equal(await page.evaluate(()=>FrontlinesApp.getState().winner),null);assert.equal(await page.evaluate(()=>FrontlinesApp.getState().turn),1);assert.equal((await snapshot(page)).index,13);
  await page.locator('#tutorial-coach summary').click();await page.locator('[data-tutorial-action="skip"]').click();
  await page.evaluate(()=>FrontlinesApp.startTutorial(false));await next(page);await page.reload();await page.locator('.home-actions [data-action="tutorial"]').click();assert.equal((await snapshot(page)).index,1);assert.equal((await snapshot(page)).complete,false);
  assert.deepEqual(errors,[]);const result={lessons:14,commanderPassiveObserved:true,commanderActiveClicked:true,commanderDoctrineChoice:true,realClickCampaign:true,capacityDeploymentFree:true,realCombat:true,settingsPausesControlledResponse:true,forcedRetreat:true,noRetreatElimination:true,allFactionExamples:true,alternativeObjective:true,actualLearningVictory:true,lossRetryRecovery:true,playerClicks,lossClicks,matrix,combatBounds,trainingBounds,progressPersistence:true,skipAndReplay:true,errors};fs.writeFileSync(path.join(output,'browser-tutorial-sprint9.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({...result,matrix:matrix.map(r=>({width:r.width,height:r.height,pageOverflow:false,coachControlsVisible:true}))},null,2));await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
