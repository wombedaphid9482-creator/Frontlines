'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.argv[2]||'playwright');
const base='http://127.0.0.1:4173',out=path.resolve(__dirname,'../test-results');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.waitForFunction(()=>!!FrontlinesApp);
  await page.evaluate(()=>FrontlinesApp.startMatch({mode:'hotseat',developer:true,bothHands:true,seed:80804,config:{startingHand:15}}));
  const layouts=[];
  for(const [width,height]of [[1920,1080],[1366,768],[1280,720],[900,600],[390,844]]){
   await page.setViewportSize({width,height});
   const layout=await page.evaluate(()=>({width:innerWidth,height:innerHeight,page:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],cards:[...document.querySelectorAll('.hand-card')].map(c=>{
    const rect=n=>{const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};};
    const art=c.querySelector('.card-art'),portrait=art.firstElementChild,rules=c.querySelector('.card-rules');
    return {art:rect(art),portrait:rect(portrait),card:rect(c),rules:rect(rules),name:rect(c.querySelector('.card-name')),stats:rect(c.querySelector('.card-stats')),crop:getComputedStyle(art).overflow,font:Number.parseFloat(getComputedStyle(rules).fontSize)};
   })}));
   assert.ok(layout.cards.length>0);assert.ok(layout.page[0]<=width+1&&layout.page[1]<=height+1,'Application viewport remains bounded');
   for(const card of layout.cards){assert.equal(card.crop,'hidden');assert.ok(card.art.bottom<=card.name.top+1&&(!card.rules.height||card.art.bottom<=card.rules.top+1),'Artwork never reaches rules/name '+JSON.stringify({width,height,card}));assert.ok(card.portrait.top>=card.art.top-1&&card.portrait.bottom<=card.art.bottom+1,'Art paint stays within crop');assert.ok(card.rules.bottom<=card.stats.top+1,'Rules never overlap stats');if(width<760)assert.ok(card.stats.bottom<=card.card.bottom+1,'Compact stats stay inside the visible card');assert.ok(card.font>=10,'Minimum readable rule font');}
   layouts.push({width,height,cards:layout.cards.length,overlap:false});
  }
  await page.setViewportSize({width:1366,height:768});
  // A deliberately long fixture verifies wrapping with the same authoritative card.
  const long=await page.evaluate(()=>{
   const c=document.querySelector('.hand-card');c.querySelector('.card-name').textContent='Experimental Reinforcement Detachment With An Unusually Long Name';c.querySelector('.card-rules').textContent='Reinforce — heal one friendly permanent and grant temporary Armor until your next offensive turn. '.repeat(8);
   const art=c.querySelector('.card-art').getBoundingClientRect(),rules=c.querySelector('.card-rules').getBoundingClientRect(),stats=c.querySelector('.card-stats').getBoundingClientRect();return {artBottom:art.bottom,rulesTop:rules.top,rulesBottom:rules.bottom,statsTop:stats.top};
  });assert.ok(long.artBottom<=long.rulesTop&&long.rulesBottom<=long.statsTop+1);
  await page.evaluate(()=>FrontlinesApp.showScreen('home'));
  await page.locator('.home-actions [data-action="settings"]').click();
  const audioTab=page.locator('[data-settings-tab="audio"]');if(await audioTab.count())await audioTab.click();
  await page.locator('[data-pref="sound"]').check();
  await page.waitForFunction(()=>FrontlinesEffects.audioState().unlocked&&FrontlinesEffects.audioState().musicVoices===1,{},{timeout:30000});
  for(const key of ['musicVolume','uiVolume','cardEffectsVolume','battlefieldVolume'])assert.ok(await page.locator('[data-volume-pref="'+key+'"]').count());
  await page.locator('[data-volume-pref="musicVolume"]').focus();await page.locator('[data-volume-pref="musicVolume"]').press('Home');
  assert.equal(await page.evaluate(()=>FrontlinesEffects.audioState().channels.music),0);
  for(let i=0;i<5;i++)await page.locator('[data-volume-pref="musicVolume"]').press('ArrowRight');
  await page.keyboard.press('Escape');
  const states=[];
  for(const route of ['menu','arsenal','shop','match']){
    await page.evaluate(route=>FrontlinesEffects.setMusicState(route),route);
    await page.waitForFunction(route=>FrontlinesEffects.audioState().state===route&&FrontlinesEffects.audioState().track===FrontlinesMusic.states[route]&&FrontlinesEffects.audioState().musicVoices>0,route,{timeout:30000});
    await page.waitForTimeout(750);const state=await page.evaluate(()=>FrontlinesEffects.audioState());assert.ok(state.looping);assert.ok(state.musicVoices<=2);states.push({state:route,track:state.track,looping:state.looping});
  }
  for(const preset of ['full','reduced','minimal']){await page.evaluate(presentation=>FrontlinesShell.savePreferences({presentation}),preset);assert.equal(await page.evaluate(()=>document.body.dataset.presentation),preset);}
  await page.reload();assert.equal(await page.evaluate(()=>FrontlinesShell.getState().preferences.musicVolume),.25);assert.equal(await page.evaluate(()=>FrontlinesShell.getState().preferences.presentation),'minimal');
  assert.deepEqual(errors,[]);fs.mkdirSync(out,{recursive:true});const result={passed:true,layouts,longTextNoOverlap:true,musicStates:states,independentMixer:true,presentationPresets:true,persisted:true,errors};fs.writeFileSync(path.join(out,'sprint8-browser-presentation.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
