'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.argv[2]||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 const page=await browser.newPage({viewport:{width:1366,height:768}});
 await page.goto('http://127.0.0.1:4173/index.html?screen=play');await page.waitForSelector('[data-action="start"]');
 const stacks=await page.evaluate(()=>{
  FrontlinesApp.startMatch({factions:['stonewall','stonewall'],seed:41001,mode:'hotseat',developer:true,bothHands:true,config:{startingCommand:80,commandCap:80,commandGrowth:0,startingHand:15,actionLimit:8,captureThreshold:1000}});
  for(let player=0;player<2;player++){
   for(let i=0;i<5;i++){
    const state=FrontlinesApp.getState();
    const action=FrontlinesEngine.legalActions(state).find(a=>a.type==='deploy'&&a.territory===(player?4:2));
    if(!action)throw new Error('Missing full-stack fixture deployment');
    const result=FrontlinesApp.dispatch(action);if(!result.ok)throw new Error(result.error);
   }
   FrontlinesApp.dispatch({type:'endTurn'});
  }
  FrontlinesEffects.clear();
  return [...document.querySelectorAll('.zone-roster')].filter(n=>n.querySelectorAll('.unit').length===5).map(n=>{
   const bounds=n.getBoundingClientRect();
   return {top:bounds.top,bottom:bounds.bottom,scrollHeight:n.scrollHeight,clientHeight:n.clientHeight,overflow:getComputedStyle(n).overflowY,cards:[...n.querySelectorAll('.unit')].map(u=>{const r=u.getBoundingClientRect();return {uid:u.dataset.uid,top:r.top,bottom:r.bottom};})};
  });
 });
 assert.equal(stacks.length,2);
 for(const stack of stacks)for(const card of stack.cards){
  // Five-unit armies remain reachable in a bounded roster at smaller windows.
  if(card.top<stack.top-1||card.bottom>stack.bottom+1){assert.ok(stack.scrollHeight>stack.clientHeight);assert.ok(['auto','scroll'].includes(stack.overflow));}
  await page.locator('.zone-roster .unit[data-uid="'+card.uid+'"]').scrollIntoViewIfNeeded();
  const visible=await page.locator('.zone-roster .unit[data-uid="'+card.uid+'"]').evaluate(unit=>{const bounds=unit.getBoundingClientRect(),roster=unit.closest('.zone-roster').getBoundingClientRect();return {top:bounds.top,bottom:bounds.bottom,rosterTop:roster.top,rosterBottom:roster.bottom};});
  assert.ok(visible.top>=visible.rosterTop-1);assert.ok(visible.bottom<=visible.rosterBottom+1,'Every stacked unit can be reached inside its roster');
 }
 const view=await page.evaluate(()=>({end:document.querySelector('[data-action="end-turn"]').getBoundingClientRect().bottom,hand:document.querySelector('.hand-area').getBoundingClientRect().top,height:innerHeight,width:innerWidth,doc:document.documentElement.scrollWidth}));
 assert.ok(view.end<=view.height,'End Turn off screen');assert.ok(view.hand<view.height/2,'Hand dock off screen');assert.ok(view.doc<=view.width+1);
 const marks=await page.evaluate(()=>[...document.querySelectorAll('.unit-allegiance')].map(n=>({text:n.textContent,color:getComputedStyle(n).color})));
 assert.ok(marks.some(n=>n.text==='P1'));assert.ok(marks.some(n=>n.text==='P2'));
 assert.notEqual(marks.find(n=>n.text==='P1').color,marks.find(n=>n.text==='P2').color);
 const dir=path.resolve(__dirname,'../test-results');fs.mkdirSync(dir,{recursive:true});
 await page.screenshot({path:path.join(dir,'full-stacks-mirror.png'),fullPage:true});
 // Clean presentation screenshot from an ordinary private match.
 await page.evaluate(()=>FrontlinesApp.startMatch({factions:['stonewall','bruiser'],seed:631,mode:'hotseat',developer:false,bothHands:false,config:FrontlinesData.DEFAULT_CONFIG}));
 for(let i=0;i<32;i++){
  if(await page.locator('.privacy').count())await page.locator('[data-action="reveal"]').click();
  await page.evaluate(()=>FrontlinesApp.dispatch(FrontlinesAI.chooseAction(FrontlinesApp.getState())));
 }
 if(await page.locator('.privacy').count())await page.locator('[data-action="reveal"]').click();
 await page.waitForTimeout(3500);
 await page.locator('.territory.contested .unit.p2').first().hover();
 const shots=path.resolve(__dirname,'../docs/screenshots');fs.mkdirSync(shots,{recursive:true});
 await page.screenshot({path:path.join(shots,'frontlines-sprint-5-fixture.png')});
 console.log(JSON.stringify({fullStacks:true,mirrorOwnership:true,laptopDock:true,endTurnVisible:true,view},null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
