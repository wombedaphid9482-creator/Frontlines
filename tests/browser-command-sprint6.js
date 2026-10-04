'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.argv[2]||'playwright');
const base='http://127.0.0.1:4173',out=path.resolve(__dirname,'../test-results');fs.mkdirSync(out,{recursive:true});
const matrix=[[1920,1080],[2560,1440],[1366,768],[1280,720],[900,600]];
async function viewport(page,required){
  const result=await page.evaluate(selectors=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,
    controls:selectors.map(selector=>{const n=document.querySelector(selector);if(!n)return {selector,missing:true};const r=n.getBoundingClientRect();return {selector,x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};})}),required);
  assert.ok(result.scrollWidth<=result.width+1,'App horizontal overflow '+JSON.stringify(result));
  assert.ok(result.scrollHeight<=result.height+1,'App vertical overflow '+JSON.stringify(result));
  for(const c of result.controls){assert.ok(!c.missing,'Missing '+c.selector);assert.ok(c.height>=36&&c.x>=0&&c.y>=0&&c.right<=result.width+1&&c.bottom<=result.height+1,'Off-screen command '+JSON.stringify(c));}
  return result;
}
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'}),context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
  await page.goto(base);await page.waitForSelector('[data-action="open-play"]');
  const bounds=[];
  for(const [width,height] of matrix){await page.setViewportSize({width,height});bounds.push({screen:'home',...await viewport(page,['[data-action="open-play"]','[data-action="settings"]','[data-game-navigation="arsenal"]','[data-game-navigation="warroom"]'])});}
  await page.setViewportSize({width:1366,height:768});await page.screenshot({path:path.resolve(__dirname,'../docs/screenshots/command-menu-sprint-8.png')});
  await page.locator('[data-action="settings"]').click();await page.waitForSelector('#display-mode');
  await page.locator('[data-settings-tab="interface"]').click();await page.locator('#shell-animation').selectOption('fast');await page.locator('[data-pref="reducedEffects"]').check();
  await page.locator('[data-settings-tab="audio"]').click();await page.locator('#shell-volume').fill('0');await page.keyboard.press('Escape');
  assert.equal(await page.locator('.shell-overlay').count(),0);assert.equal(await page.evaluate(()=>FrontlinesShell.getState().preferences.masterVolume),0);
  await page.reload();assert.equal(await page.evaluate(()=>FrontlinesShell.getState().preferences.animationSpeed),'fast');assert.equal(await page.evaluate(()=>FrontlinesApp.getSettings().masterVolume),0);
  await page.locator('[data-action="open-play"]').click();await page.waitForSelector('[data-action="start"]');
  for(const [width,height] of matrix){await page.setViewportSize({width,height});bounds.push({screen:'setup',...await viewport(page,['[data-action="start"]','[data-action="home"]','#faction-0','#faction-1'])});}
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>FrontlinesApp.getUIState().screen),'home');
  await page.evaluate(()=>FrontlinesApp.startMatch({mode:'hotseat',factions:['stonewall','bruiser'],seed:7317,developer:false,bothHands:false}));
  await page.locator('[data-action="reveal"]').click();
  for(let i=0;i<30;i++)await page.evaluate(()=>FrontlinesApp.dispatch(FrontlinesAI.chooseAction(FrontlinesApp.getState())));
  if(await page.locator('[data-action="reveal"]').count())await page.locator('[data-action="reveal"]').click();
  await page.locator('.hand-area .hand-card').first().hover();
  const beforeBriefing=await page.evaluate(()=>JSON.stringify(FrontlinesApp.getState()));
  await page.locator('[data-action="enlarge-card"]').click();await page.waitForSelector('.full-card-briefing');
  assert.ok(await page.locator('.full-card-art').evaluate(n=>n.getBoundingClientRect().width)>=200);
  await page.keyboard.press('Escape');assert.equal(await page.locator('.full-card-briefing').count(),0);assert.equal(await page.evaluate(()=>JSON.stringify(FrontlinesApp.getState())),beforeBriefing);
  for(const [width,height] of matrix){await page.setViewportSize({width,height});const command=await page.locator('[data-action="end-turn"]').count()?'[data-action="end-turn"]':'[data-action="pass-response"]';bounds.push({screen:'match',...await viewport(page,[command,'[data-action="home"]'])});}
  await page.setViewportSize({width:1366,height:768});await page.screenshot({path:path.resolve(__dirname,'../docs/screenshots/battlefield-sprint-8.png')});
  const state=await page.evaluate(()=>JSON.stringify(FrontlinesApp.getState()));await page.locator('[data-action="home"]').click();assert.equal(await page.evaluate(()=>FrontlinesApp.getUIState().screen),'home');assert.equal(await page.evaluate(()=>JSON.stringify(FrontlinesApp.getState())),state);
  await page.locator('[data-action="open-play"]').click();assert.equal(await page.evaluate(()=>FrontlinesApp.getUIState().screen),'match');
  await page.locator('[data-action="settings"]').click();await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>FrontlinesApp.getUIState().screen),'match');
  const completed=await page.evaluate(()=>{let n=0;while(FrontlinesApp.getState().winner===null&&n<3000){const r=FrontlinesApp.dispatch(FrontlinesAI.chooseAction(FrontlinesApp.getState()));if(!r.ok)throw Error(r.error);n++;}return {winner:FrontlinesApp.getState().winner,decisions:n};});assert.notEqual(completed.winner,null);
  await page.evaluate(()=>FrontlinesApp.showScreen('home'));await page.locator('[data-game-navigation="arsenal"]').click();await page.waitForSelector('#deck-builder');await page.locator('[data-shell-action="home"]').first().click();await page.waitForSelector('[data-action="open-play"]');
  await page.locator('[data-game-navigation="warroom"]').click();await page.waitForSelector('[data-war-room="quick"]');await page.locator('[data-shell-action="home"]').first().click();await page.waitForSelector('[data-action="open-play"]');
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-command-sprint6.json'),JSON.stringify({matrix:bounds,completeMatch:completed,errors},null,2));console.log(JSON.stringify({matrix:bounds.map(r=>({screen:r.screen,width:r.width,height:r.height,pageOverflow:false})),completeMatch:completed,settingsPersistence:true,menuPauseResume:true,coherentNavigation:true,fullCardBriefing:true,errors},null,2));await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
