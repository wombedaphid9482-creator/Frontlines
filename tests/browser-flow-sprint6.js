'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.argv[2]||'playwright');
const base='http://127.0.0.1:4173',out=path.resolve(__dirname,'../test-results');
const matrix=[[1920,1080],[2560,1440],[1366,768],[1280,720],[900,600]];
async function bounds(page,selectors){return page.evaluate(selectors=>{
 const result={width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight};
 result.commands=selectors.map(s=>{const n=document.querySelector(s),r=n?.getBoundingClientRect();if(!r)return {s,missing:true};let clipped=false;for(let p=n.parentElement;p&&p!==document.body;p=p.parentElement){if(/hidden|auto|scroll/.test(getComputedStyle(p).overflowY)){const b=p.getBoundingClientRect();if(r.top<b.top-1||r.bottom>b.bottom+1)clipped=true;}}return {s,bottom:r.bottom,right:r.right,top:r.top,left:r.left,height:r.height,clipped};});return result;
},selectors);}
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.goto(base);await page.waitForSelector('.welcome-prompt');assert.match(await page.locator('[data-game-version]').textContent(),new RegExp('v'+require('../package.json').version.replaceAll('.','\\.')));
 const viewports=[];for(const [width,height]of matrix){await page.setViewportSize({width,height});const r=await bounds(page,['[data-action="open-play"]','.home-actions [data-action="tutorial"]','[data-game-navigation="warroom"]']);assert.ok(r.scrollWidth<=width+1&&r.scrollHeight<=height+1);for(const c of r.commands)assert.ok(!c.clipped&&!c.missing&&c.bottom<=height+1);viewports.push({screen:'home',...r});}
 await page.setViewportSize({width:1366,height:768});await page.screenshot({path:path.resolve(__dirname,'../docs/screenshots/command-menu-sprint-8.png')});
 await page.locator('[data-action="play-immediately"]').click();assert.equal(await page.locator('#mode').inputValue(),'ai');assert.equal(await page.locator('#ai-difficulty').inputValue(),'easy');
 for(const difficulty of ['easy','normal','hard','expert']){await page.locator('#ai-difficulty').selectOption(difficulty);assert.equal(await page.evaluate(()=>FrontlinesApp.getSettings().aiDifficulty),difficulty);}
 await page.reload();assert.equal(await page.evaluate(()=>FrontlinesApp.getSettings().aiDifficulty),'expert');await page.locator('[data-action="open-play"]').click();
 for(const [width,height]of matrix){await page.setViewportSize({width,height});const r=await bounds(page,['#ai-difficulty','[data-action="start"]']);assert.ok(r.scrollHeight<=height+1&&r.scrollWidth<=width+1);for(const c of r.commands)assert.ok(!c.clipped&&c.bottom<=height+1,JSON.stringify(r));viewports.push({screen:'setup',...r});}
 await page.setViewportSize({width:1366,height:768});await page.locator('[data-action="settings"]').click();await page.locator('[data-settings-tab="learning"]').click();await page.locator('#shell-ai-speed').selectOption('deliberate');await page.locator('[data-pref="tutorialHints"]').uncheck();await page.keyboard.press('Escape');
 await page.evaluate(()=>FrontlinesApp.startMatch({mode:'ai',factions:['stonewall','bruiser'],seed:706001,aiDifficulty:'easy'}));
 const free=await page.evaluate(()=>FrontlinesEngine.legalActions(FrontlinesApp.getState()).find(a=>a.type==='deploy'&&FrontlinesEngine.actionCost(FrontlinesApp.getState(),a).commandActions===0));assert.ok(free);
 await page.locator('[data-action="hand"][data-uid="'+free.handUid+'"]').click();assert.match(await page.locator('.order-guidance').textContent(),/0 Command Actions/);const before=await page.evaluate(()=>FrontlinesApp.getState());
 await page.locator('.territory[data-territory="'+free.territory+'"] .territory-header').click();const after=await page.evaluate(()=>FrontlinesApp.getState());assert.equal(after.actionsLeft,before.actionsLeft);assert.ok(after.units.some(u=>u.uid===free.handUid));
 await page.locator('[data-action="end-turn"]').click();const aiBefore=await page.evaluate(()=>JSON.stringify(FrontlinesApp.getState()));await page.waitForTimeout(450);assert.equal(await page.evaluate(()=>JSON.stringify(FrontlinesApp.getState())),aiBefore,'Deliberate AI acted opaquely immediately');
 await page.waitForSelector('.ai-activity',{timeout:5000});assert.match(await page.locator('.ai-activity').textContent(),/Bruiser/);
 await page.locator('[data-action="settings"]').click();const paused=await page.evaluate(()=>JSON.stringify(FrontlinesApp.getState()));await page.waitForTimeout(1800);assert.equal(await page.evaluate(()=>JSON.stringify(FrontlinesApp.getState())),paused);await page.keyboard.press('Escape');
 await page.evaluate(()=>FrontlinesApp.startMatch({mode:'hotseat',factions:['stonewall','bruiser'],seed:706002,developer:true,bothHands:true}));
 const completed=await page.evaluate(()=>{let decisions=0;while(FrontlinesApp.getState().winner===null&&decisions<1500){const result=FrontlinesApp.dispatch(FrontlinesAI.chooseAction(FrontlinesApp.getState(),{profile:'deck',difficulty:'normal'}));if(!result.ok)throw Error(result.error);decisions++;}const state=FrontlinesApp.getState();return {winner:state.winner,decisions,turns:state.turn};});assert.notEqual(completed.winner,null);
 await page.evaluate(()=>FrontlinesApp.showScreen('home'));await page.locator('[data-action="rules"]').click();for(const topic of ['Command Actions','Retreat','Combat']){await page.locator('[data-action="manual-topic"][data-topic="'+topic+'"]').click();assert.match(await page.locator('.manual-reading h3').textContent(),new RegExp(topic));}await page.keyboard.press('Escape');
 assert.deepEqual(errors,[]);const result={version:require('../package.json').version,viewports,freeDeployment:true,difficultyPersistence:true,deliberateCadence:true,settingsPauseAI:true,manualSections:true,completeMatch:completed,errors};fs.writeFileSync(path.join(out,'browser-flow-sprint6.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({...result,viewports:viewports.map(r=>({screen:r.screen,width:r.width,height:r.height,clipping:false}))},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
