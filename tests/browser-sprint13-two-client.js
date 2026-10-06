'use strict';
// Real controller and real relay WebSockets, rendered by two isolated browser profiles.
// The Native bridge is emulated; packaged EXE proof is a separate desktop test.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.argv[2]||'playwright');
const Controller=require('../multiplayer-controller'),Balance=require('../balance'),Decks=require('../decks');
const origin=process.env.FRONTLINES_TEST_URL||'http://127.0.0.1:4173',serviceURL=process.env.FRONTLINES_RELAY_TEST_URL||'http://127.0.0.1:8787',out=path.resolve(__dirname,'../test-results');
const report={passed:false,kind:'two-browser-native-equivalent-real-relay',nativeBridgeEmulated:true,realRelayWebSockets:true,internetVerified:false,largeCampaigns:0,actions:0,errors:[],privacyChecks:0,commanderActivations:[],tacticalCardsPlayed:[],rematch:false,reconnect:false};
fs.mkdirSync(out,{recursive:true});const runtime=Balance.createRuntime(Balance.DEFAULT_PROFILE),library=Decks.forData(runtime.data);
const controllers=[Controller.createController({serviceURL,allowLocalhost:true,allowTestFaults:true,hostOptions:{seedFactory:()=>7317}}),Controller.createController({serviceURL,allowLocalhost:true,allowTestFaults:true})];
let browser,pages=[],queues=[Promise.resolve(),Promise.resolve()],stopped=false;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn,label,timeout=12000){const started=Date.now();while(!fn()){if(Date.now()-started>timeout)throw Error('Timed out: '+label+' '+JSON.stringify(controllers.map(c=>({phase:c.getState().phase,status:c.getState().snapshot?.status,error:c.getState().error}))));await pause(15);}await Promise.all(queues);}
async function bind(page,index){
  await page.exposeBinding('__privateCommand',(_source,command,payload)=>controllers[index].command(command,payload));
  await page.exposeBinding('__privateState',()=>controllers[index].getState());
  controllers[index].onState(model=>{if(stopped)return;queues[index]=queues[index].then(()=>page.evaluate(model=>window.__receiveNativeMultiplayer?.(model),model)).catch(error=>{if(!stopped)report.errors.push('Bridge: '+error.message);});});
  await page.addInitScript(()=>{
    let listener=null;
    window.__receiveNativeMultiplayer=model=>listener?.(model);
    window.FrontlinesDesktop={onState:()=>()=>{},onNavigate:()=>()=>{},getState:async()=>({version:'1.1.0',fullscreen:false,update:{status:'current'}}),setMatchActive:async()=>{},setFullscreen:async()=>({version:'1.1.0',fullscreen:true,update:{status:'current'}}),checkUpdate:async()=>({version:'1.1.0',update:{status:'current'}}),restartUpdate:async()=>{},quit:async()=>{},
      multiplayer:(command,payload)=>window.__privateCommand(command,payload),getMultiplayerState:()=>window.__privateState(),onMultiplayer:fn=>{listener=fn;return()=>listener=null;}};
    localStorage.setItem('frontlines.onboarding.v1','seen');
  });
  page.on('pageerror',e=>report.errors.push(e.message));await page.goto(origin);await page.waitForFunction(()=>!!window.FrontlinesApp);
  await page.evaluate(()=>{
    // Owned-card fixture prepares Tactical Arsenal choices; no economic purchase is simulated.
    const profile=FrontlinesCollection.load();for(const card of Object.values(FrontlinesData.CARDS)){profile.cards[card.id].copies=FrontlinesCollection.copyLimit(card.id);if(!profile.cards[card.id].variants.includes('standard'))profile.cards[card.id].variants.push('standard');}
    localStorage.setItem(FrontlinesCollection.STORAGE_KEY,JSON.stringify(profile));FrontlinesShell.savePreferences({animationSpeed:'fast',presentation:'minimal',reducedEffects:true});
  });
}
(async()=>{
  const health=await fetch(serviceURL+'/health');assert.equal(health.ok,true,'Local production Worker emulator is running');
  browser=await chromium.launch({headless:true,channel:'msedge'});
  const contexts=await Promise.all([browser.newContext({viewport:{width:1366,height:768}}),browser.newContext({viewport:{width:1280,height:720}})]);
  pages=await Promise.all(contexts.map(context=>context.newPage()));await Promise.all(pages.map(bind));
  await pages[0].locator('[data-action="open-multiplayer"]').click();await pages[0].locator('[data-mp-setting="name"]').fill('Ryken');await pages[0].locator('[data-mp-setting="name"]').blur();await pages[0].locator('[data-mp="host"]').click();
  await until(()=>controllers[0].getState().code,'host invite');const code=controllers[0].getState().code;
  await pages[1].locator('[data-action="open-multiplayer"]').click();await pages[1].locator('[data-mp-setting="name"]').fill('Wyatt');await pages[1].locator('[data-mp-setting="name"]').blur();await pages[1].locator('[data-mp="join-screen"]').click();await pages[1].locator('#mp-invite').fill(code.toLowerCase().replace('-',' '));await pages[1].locator('.mp-join-form [type="submit"]').click();
  await until(()=>controllers.every(c=>c.getState().lobby.players.length===2),'shared lobby');
  for(const [index,faction,deckId]of [[0,'nightwalker','nightwalker-smoke-and-mirrors'],[1,'rogue','rogue-make-do']]){
    assert.ok(library.getDecks().some(d=>d.id===deckId));await pages[index].locator('[data-mp-setting="faction"]').selectOption(faction);
    await until(()=>controllers[index].getState().lobby.players[index]?.faction===faction,'own faction update');
    await pages[index].locator('[data-mp-setting="deck"]').selectOption(deckId);await until(()=>controllers[index].getState().lobby.players[index]?.deck?.id===deckId,'own deck update');
    await pages[index].locator('[data-mp="ready"]').click();await until(()=>controllers[index].getState().lobby.players[index]?.ready===true,'ready update');
  }
  await until(()=>controllers.every(c=>c.getState().lobby.canStart),'both ready');await pages[0].locator('[data-mp="start"]').click();
  await until(()=>controllers.every(c=>c.getState().snapshot?.status==='active'),'opening acknowledgement');
  const firstMatchId=controllers[0].getState().snapshot.matchId,firstHostSeat=controllers[0].getState().localSeat;
  const initialCredits=await Promise.all(pages.map(p=>p.evaluate(()=>FrontlinesCollection.load().credits)));
  // Temporary guest transport loss must pause actual UI controls and restore same match.
  controllers[1].interruptForTest();await until(()=>controllers[0].getState().snapshot.status==='reconnecting','guest disconnect pause');
  const blocked=await pages[0].evaluate(()=>FrontlinesApp.dispatch({type:'endTurn'}));assert.equal(blocked.ok,false);
  await until(()=>controllers.every(c=>c.getState().snapshot?.status==='active'&&c.getState().connection.state==='connected'),'guest reconnect',25000);
  assert.equal(controllers[1].getState().snapshot.matchId,firstMatchId);report.reconnect=true;
  while(controllers[0].getState().phase!=='results'&&report.actions<1800){
    const models=controllers.map(c=>c.getState()),active=models.findIndex(m=>m.snapshot.legalActions.length>0);assert.ok(active>=0,'An authenticated player owns legal commands');
    const snapshot=models[active].snapshot;let action=snapshot.legalActions.find(a=>a.type==='commander');
    if(!action)action=snapshot.legalActions.find(a=>a.handUid&&runtime.data.CARDS[snapshot.state.players[snapshot.localSeat].hand.find(h=>h.uid===a.handUid)?.cardId]?.set==='tactical-011');
    if(!action){try{action=runtime.ai.chooseAction(snapshot.state,{profile:'deck',difficulty:'normal',legalActions:snapshot.legalActions});}catch{} }
    if(!action||!snapshot.legalActions.some(a=>JSON.stringify(a)===JSON.stringify(action)))action=snapshot.legalActions.find(a=>a.type==='deploy')||snapshot.legalActions.find(a=>a.type==='attack')||snapshot.legalActions.find(a=>a.type==='endTurn')||snapshot.legalActions[0];
    if(action.type==='commander')report.commanderActivations.push({seat:snapshot.localSeat,commander:snapshot.state.players[snapshot.localSeat].commander.id});
    const hand=snapshot.state.players[snapshot.localSeat].hand.find(h=>h.uid===action.handUid);if(hand&&runtime.data.CARDS[hand.cardId]?.set==='tactical-011')report.tacticalCardsPlayed.push(hand.cardId);
    const result=await pages[active].evaluate(action=>FrontlinesApp.dispatch(action),action);assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.pending,true,'The renderer sends intent without resolving local game');
    await until(()=>controllers.every(c=>c.getState().snapshot.sequence>snapshot.sequence),'canonical action broadcast');
    const current=controllers.map(c=>c.getState().snapshot);assert.equal(current[0].sharedHash,current[1].sharedHash);assert.equal(current[0].sequence,current[1].sequence);
    for(const [i,p]of pages.entries()){
      const view=await p.evaluate(()=>FrontlinesApp.getState());const seat=current[i].localSeat;assert.equal(view.players[1-seat].hand.length,0);assert.ok(view.players.every(player=>player.deck.every(card=>card===null)));assert.equal(view.winner,current[i].state.winner);report.privacyChecks++;
    }
    report.actions++;
  }
  assert.equal(controllers[0].getState().phase,'results');assert.equal(controllers[1].getState().phase,'results');
  assert.ok(report.commanderActivations.length>=2,'Both Commanders activate through host authority');assert.ok(report.tacticalCardsPlayed.length>0,'Tactical Arsenal cards enter the real synchronized match');
  for(const [i,p]of pages.entries()){
    await p.locator('.mp-result').waitFor();assert.equal(await p.evaluate(()=>FrontlinesCollection.load().credits),initialCredits[i]);
    const history=await p.evaluate(()=>FrontlinesApp.getRecentMatches());assert.ok(history.some(entry=>entry.matchId===firstMatchId&&entry.mode==='private-online'));
    await p.screenshot({path:path.join(out,'sprint13-real-relay-result-'+i+'.png')});
  }
  report.winner=controllers[0].getState().snapshot.state.winner;report.windows=controllers[0].getState().snapshot.state.turn;report.finalSequence=controllers[0].getState().snapshot.sequence;
  await pages[1].locator('[data-mp="rematch"]').click();await until(()=>controllers.every(c=>c.getState().phase==='lobby'&&!c.getState().snapshot),'shared rematch lobby');
  for(const [i,p]of pages.entries()){assert.equal(await p.locator('[data-mp-setting="deck"]').inputValue(),i===0?'nightwalker-smoke-and-mirrors':'rogue-make-do');await p.locator('[data-mp="ready"]').click();await until(()=>controllers[i].getState().lobby.players[i]?.ready===true,'rematch ready');}
  await until(()=>controllers.every(c=>c.getState().lobby.canStart),'rematch both ready');await pages[0].locator('[data-mp="start"]').click();await until(()=>controllers.every(c=>c.getState().snapshot?.status==='active'),'rematch acknowledgement');
  assert.notEqual(controllers[0].getState().snapshot.matchId,firstMatchId);assert.equal(controllers[0].getState().localSeat,1-firstHostSeat);report.rematch=true;
  assert.deepEqual(report.errors,[]);report.passed=true;
})().catch(error=>{report.failure=String(error.stack||error);process.exitCode=1;}).finally(async()=>{
  stopped=true;await Promise.all(controllers.map(c=>c.dispose()));if(browser)await browser.close();
  report.tacticalCardsPlayed=[...new Set(report.tacticalCardsPlayed)];fs.writeFileSync(path.join(out,'sprint13-two-browser-real-relay.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
});
