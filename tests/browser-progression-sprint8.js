'use strict';
// Small integration fixtures verify ownership/reward boundaries, not balance.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.argv[2]||'playwright');
const base='http://127.0.0.1:4173',out=path.resolve(__dirname,'../test-results');
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try{
    const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
    await page.goto(base);await page.waitForFunction(()=>!!window.FrontlinesApp);
    assert.equal(await page.evaluate(()=>FrontlinesCollection.load().credits),300,'Fresh profile receives fresh grant before settings initialization');
    const starterReady=await page.evaluate(()=>FrontlinesDecks.forData(FrontlinesData).starters().every(d=>FrontlinesCollection.canUseDeck(d).complete));assert.equal(starterReady,true);
    const denied=await page.evaluate(()=>{
      const decks=FrontlinesDecks.forData(FrontlinesData),expanded=decks.presets().find(d=>d.archetype==='field-improvisation');
      const started=FrontlinesApp.startMatch({mode:'ai',developer:false,decks:[expanded,decks.starters()[0]],seed:80901});
      return {started:!!started,ownership:FrontlinesCollection.canUseDeck(expanded),legal:decks.validate(expanded).legal};
    });assert.equal(denied.started,false);assert.equal(denied.ownership.complete,false);assert.equal(denied.legal,true);
    const result=await page.evaluate(()=>{
      const decks=FrontlinesDecks.forData(FrontlinesData),own=decks.starters().find(d=>d.faction==='stonewall'),opponent=decks.presets().find(d=>d.archetype==='rolling-breakthrough');
      // Solo AI uses an unowned legal template. Its actions carry an AI decision.
      FrontlinesApp.startMatch({mode:'ai',developer:false,bothHands:false,decks:[own,opponent],seed:80902});
      let steps=0;while(FrontlinesApp.getState().winner===null&&steps<2000){
        const state=FrontlinesApp.getState(),actor=FrontlinesEngine.getActor(state),action=FrontlinesAI.chooseAction(state,{profile:'deck',difficulty:'normal'});
        const r=FrontlinesApp.dispatch(action,actor===1?{profile:'deck',reason:'Integration fixture AI'}:undefined);if(!r.ok)throw Error(r.error);steps++;
      }
      const state=FrontlinesApp.getState(),reward=FrontlinesApp.getMatchReward();
      return {winner:state.winner,turns:state.turn,steps,reward,profile:FrontlinesCollection.load()};
    });assert.notEqual(result.winner,null);assert.equal(result.reward.eligible,true);assert.ok(result.reward.creditsEarned>=50);assert.ok(result.reward.masteryGains.length>0);assert.equal(result.profile.credits,300+result.reward.creditsEarned);
    await page.waitForSelector('.match-rewards');assert.match(await page.locator('.match-rewards').innerText(),/CREDITS/);
    const credited=result.profile.credits;await page.evaluate(()=>FrontlinesApp.showScreen('home'));await page.reload();assert.equal(await page.evaluate(()=>FrontlinesCollection.load().credits),credited);
    const debug=await page.evaluate(()=>{
      FrontlinesApp.startMatch({mode:'hotseat',developer:true,bothHands:true,seed:80903});
      window.dispatchEvent(new CustomEvent('frontlines-settings',{detail:{developer:false,bothHands:false}}));
      let steps=0;while(FrontlinesApp.getState().winner===null&&steps++<2000){const s=FrontlinesApp.getState();FrontlinesApp.dispatch(FrontlinesAI.chooseAction(s,{profile:'deck'}));}
      return {winner:FrontlinesApp.getState().winner,reward:FrontlinesApp.getMatchReward(),credits:FrontlinesCollection.load().credits};
    });assert.notEqual(debug.winner,null);assert.equal(debug.reward.creditsEarned,0);assert.equal(debug.credits,credited);
    const assisted=await page.evaluate(()=>{
      const decks=FrontlinesDecks.forData(FrontlinesData).starters();
      FrontlinesApp.startMatch({mode:'hotseat',developer:false,bothHands:false,decks:[decks[0],decks[1]],seed:80904});
      window.dispatchEvent(new CustomEvent('frontlines-settings',{detail:{developer:true,bothHands:true}}));
      window.dispatchEvent(new CustomEvent('frontlines-settings',{detail:{developer:false,bothHands:false}}));
      let steps=0;while(FrontlinesApp.getState().winner===null&&steps++<2000){const s=FrontlinesApp.getState();const r=FrontlinesApp.dispatch(FrontlinesAI.chooseAction(s,{profile:'deck'}));if(!r.ok)throw Error(r.error);}
      return {winner:FrontlinesApp.getState().winner,reward:FrontlinesApp.getMatchReward(),credits:FrontlinesCollection.load().credits};
    });assert.notEqual(assisted.winner,null);assert.equal(assisted.reward.creditsEarned,0);assert.equal(assisted.credits,credited);
    await page.goto(base);await page.locator('[data-game-navigation="collection"]').click();await page.waitForURL(/collection\.html/);assert.ok(await page.locator('#collection-app').isVisible());
    assert.deepEqual(errors,[]);
    const report={passed:true,freshGrant:300,allStartersOwned:true,incompleteDeckBlocked:true,legalitySeparate:true,unrestrictedAI:true,match:{winner:result.winner,turns:result.turns,steps:result.steps,creditsEarned:result.reward.creditsEarned,masteryCards:result.reward.masteryGains.length},developerExcluded:true,assistanceExclusionPersists:true,persistent:true,collectionNavigation:true,errors};
    fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'sprint8-browser-progression.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
