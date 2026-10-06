'use strict';
// Presentation and input routing fixtures; protocol/network tests run separately.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.argv[2]||'playwright');
const origin=process.env.FRONTLINES_TEST_URL||'http://127.0.0.1:4173',out=path.resolve(__dirname,'../test-results');
const scaled=process.env.FRONTLINES_TEST_SCALED==='1',sizes=scaled?[[911,512]]:[[1920,1080],[1600,900],[1366,768],[1280,720]],report={passed:false,kind:'player-interface-bridge-fixtures',transportIsMock:true,browserEquivalentOnly:scaled,deviceScaleFactor:scaled?1.5:1,layouts:[],privacy:[],input:[],errors:[],largeCampaigns:0};
fs.mkdirSync(out,{recursive:true});
async function layout(page,label){
  const result=await page.evaluate(label=>{
    const box=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};
    const visible=n=>!!n.getClientRects().length;
    return {label,width:innerWidth,height:innerHeight,page:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},
      actions:[...document.querySelectorAll('.mp-actions .btn,.mp-entry-actions .home-command,.home-actions .home-command')].filter(visible).map(n=>({...box(n),text:n.textContent.trim(),disabled:n.disabled})),
      cards:[...document.querySelectorAll('.hand-area .hand-card,.full-card-preview .hand-card,.deck-grid .hand-card')].map(n=>({...box(n),id:n.dataset.uid})),
      territories:[...document.querySelectorAll('.battlefield .territory')].map(n=>({...box(n),id:Number(n.dataset.territory)})),
      commanders:[...document.querySelectorAll('.commander-row .commander-panel')].map(n=>({...box(n),seat:Number(n.dataset.commanderPlayer)}))};
  },label);
  assert.ok(result.page.width<=result.width+1,label+' page width');assert.ok(result.page.height<=result.height+1,label+' page height');
  for(const a of result.actions){assert.ok(a.bottom<=result.height+1&&a.right<=result.width+1,label+' visible action '+a.text);assert.ok(a.height>=51,label+' large action '+a.text);}
  for(const c of result.cards)assert.ok(Math.abs(c.width/c.height-5/7)<.012,label+' 5:7 card '+c.id);
  if(result.territories.length){assert.equal(result.territories.length,7);assert.equal(result.commanders.length,2);for(const t of result.territories)assert.ok(t.bottom<=result.height+1&&t.right<=result.width+1,label+' all seven territories');}
  report.layouts.push(result);await page.screenshot({path:path.join(out,'sprint13-ui-'+label.replace(/[^a-z0-9]/gi,'-')+'-'+result.width+'.png')});
}
async function emit(page,next){await page.evaluate(next=>window.__emitNetwork(next),next);}
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try{
    const page=await browser.newPage({viewport:scaled?{width:911,height:512}:{width:1366,height:768},deviceScaleFactor:scaled?1.5:1});page.on('pageerror',e=>report.errors.push(e.message));
    await page.addInitScript(()=>{
      let subscriber=null;window.__networkCommands=[];
      window.__networkModel={phase:'menu',available:true,connection:{state:'idle'},lobby:{players:[]}};
      window.__emitNetwork=next=>{window.__networkModel=JSON.parse(JSON.stringify(next));subscriber?.(window.__networkModel);};
      window.FrontlinesDesktop={onState:()=>()=>{},onNavigate:()=>()=>{},getState:async()=>({version:'1.1.0',fullscreen:false,update:{status:'current'}}),setMatchActive:async()=>{},setFullscreen:async()=>({version:'1.1.0',fullscreen:true,update:{status:'current'}}),checkUpdate:async()=>({version:'1.1.0',update:{status:'current'}}),restartUpdate:async()=>{},quit:async()=>{},
        onMultiplayer:fn=>{subscriber=fn;return()=>subscriber=null;},getMultiplayerState:async()=>window.__networkModel,
        multiplayer:async(type,payload)=>{window.__networkCommands.push({type,payload});const next=JSON.parse(JSON.stringify(window.__networkModel));
          if(window.__holdNextResponse){window.__holdNextResponse=false;return await new Promise(resolve=>window.__completeHeldResponse=()=>resolve({ok:true,state:next}));}
          if(type==='host'||type==='join'){next.phase='lobby';next.connection={state:'connected',route:'relay'};next.sessionId='session-ui';next.code='F7K9R2QM';next.localSeat=type==='host'?0:1;next.lobbySeat=next.localSeat;next.lobby={players:[{name:'Ryken',connected:true,ready:false},{name:'Wyatt',connected:type==='join',ready:false}],canStart:false,startReason:'Both players must choose a deck and Ready.'};}
          if(type==='select'){const p=next.lobby.players[next.lobbySeat];Object.assign(p,{name:next.lobbySeat?'Wyatt':'Ryken',deck:payload.deck,faction:payload.faction,commanderId:payload.commanderId,legal:true,ready:false});}
          if(type==='ready')next.lobby.players[next.lobbySeat].ready=payload.ready;
          if(type==='leave'){next.phase='menu';next.connection={state:'idle'};next.sessionId=null;next.lobby={players:[]};delete next.snapshot;}
          if(type==='report')return {ok:true,report:{version:'1.1.0',sequence:5,excludes:['private cards','credentials']}};
          window.__emitNetwork(next);return {ok:true,state:next};
        }};
      localStorage.setItem('frontlines.onboarding.v1','seen');
    });
    await page.goto(origin);await page.waitForFunction(()=>!!window.FrontlinesMultiplayerUI&&!!window.FrontlinesApp);
    for(const [width,height]of sizes){await page.setViewportSize({width,height});await layout(page,'home');}
    await page.locator('[data-action="open-multiplayer"]').click();
    for(const [width,height]of sizes){await page.setViewportSize({width,height});await layout(page,'multiplayer-menu');}
    await page.locator('[data-mp="join-screen"]').click();
    for(const [width,height]of sizes){await page.setViewportSize({width,height});await layout(page,'join');}
    await page.locator('#mp-invite').fill('f7k9 r2qm');await page.locator('.mp-join-form [type="submit"]').click();
    await page.waitForFunction(()=>window.__networkCommands.some(c=>c.type==='join'));
    assert.equal(await page.evaluate(()=>window.__networkCommands.find(c=>c.type==='join').payload.code),'F7K9R2QM');
    assert.equal(await page.locator('[data-mp-setting="faction"]').count(),1,'Only own selection controls');
    await page.locator('[data-mp-setting="faction"]').selectOption('nightwalker');await page.waitForFunction(()=>window.__networkModel.lobby.players[1].faction==='nightwalker');
    await page.locator('[data-mp="ready"]').click();await page.waitForFunction(()=>window.__networkModel.lobby.players[1].ready===true);
    await page.locator('[data-mp-setting="commander"]').selectOption('commander_nightwalker_saboteur');await page.waitForFunction(()=>window.__networkModel.lobby.players[1].ready===false);
    report.input.push('Join code normalization','Own-only selection controls','Selection clears Ready');
    for(const [width,height]of sizes){await page.setViewportSize({width,height});await layout(page,'guest-lobby');}
    const distinct=await page.evaluate(()=>new Set(FrontlinesMultiplayerUI.getSelectedDeck().cards).size);
    await page.locator('[data-mp="inspect-deck"]').click();assert.equal(await page.locator('.deck-grid .hand-card').count(),distinct);
    await page.locator('[data-action="close-modal"]').first().click();
    await page.locator('[data-mp="leave"]').click();await page.locator('[data-action="open-multiplayer"]').click();await page.locator('[data-mp="host"]').click();
    await page.evaluate(()=>{const model=JSON.parse(JSON.stringify(window.__networkModel));model.lobby.players[1]={name:'<img src=x onerror="window.__bad=true">',connected:true,ready:false};window.__emitNetwork(model);});
    assert.equal(await page.locator('img[src="x"]').count(),0,'Remote names are rendered as text');assert.equal(await page.evaluate(()=>window.__bad),undefined);
    for(const [width,height]of sizes){await page.setViewportSize({width,height});await layout(page,'host-code');}
    assert.equal(await page.locator('[data-mp="start"]').isDisabled(),true,'Host cannot start while guest absent');
    // Both canonical seats exercise ordinary renderer with host-filtered state.
    const fixtures=await page.evaluate(()=>{
      const decks=FrontlinesDecks.forData(FrontlinesData).starters().filter(d=>['stonewall','bruiser'].includes(d.faction));
      const canonical=FrontlinesEngine.createGame({decks,seed:130013});
      return [0,1].map(localSeat=>{const state=JSON.parse(JSON.stringify(canonical));delete state.seed;delete state.rngState;delete state.nextUid;
        state.players.forEach((p,i)=>{p.handCount=p.hand.length;p.deckCount=p.deck.length;p.deck=Array(p.deckCount).fill(null);if(i!==localSeat){p.hand=[];p.deckMeta={faction:p.faction,commanderId:p.commander?.id};}});
        return {phase:'match',available:true,connection:{state:'connected',route:'relay'},localSeat,lobbySeat:0,sessionId:'session-ui',code:'F7K9R2QM',names:['Ryken','Wyatt'],lobby:window.__networkModel.lobby,
          snapshot:{state,localSeat,sequence:0,matchId:'ui-match-'+localSeat,sessionId:'session-ui',status:'active',names:['Ryken','Wyatt'],events:[],legalActions:localSeat===0?FrontlinesEngine.legalActions(canonical):[]}};});
    });
    for(const fixture of fixtures){await emit(page,fixture);
      assert.equal(await page.evaluate(()=>FrontlinesApp.getUIState().privacy),false);
      assert.equal(await page.evaluate(seat=>FrontlinesApp.getState().players[1-seat].hand.length,fixture.localSeat),0);
      assert.equal(await page.locator('.debug-other-hand').count(),0);assert.equal(await page.locator('[data-action="dev"]').count(),0);assert.equal(await page.locator('[data-action="new-match"]').count(),0);
      assert.equal(await page.locator('.hand-area .hand-card').count(),fixture.snapshot.state.players[fixture.localSeat].hand.length);
      assert.equal(await page.locator('.commander-row .commander-panel').first().getAttribute('data-commander-player'),String(fixture.localSeat));
      for(const [width,height]of sizes){await page.setViewportSize({width,height});await layout(page,'match-seat-'+fixture.localSeat);}
      const stateBefore=await page.evaluate(()=>JSON.stringify(FrontlinesApp.getState()));
      if(fixture.localSeat===1){assert.match(await page.locator('.turn-owner').innerText(),/WAITING FOR RYKEN/);const response=await page.evaluate(()=>FrontlinesApp.dispatch({type:'endTurn'}));assert.equal(response.ok,false);}
      else {const response=await page.evaluate(()=>FrontlinesApp.dispatch({type:'endTurn'}));assert.equal(response.pending,true);assert.equal(await page.evaluate(()=>JSON.stringify(FrontlinesApp.getState())),stateBefore,'Renderer never resolves canonical intent');}
      assert.equal(await page.evaluate(()=>FrontlinesApp.getPlaytestReport()),null,'No offline private-state report');
      report.privacy.push({seat:fixture.localSeat,opponentHandEmpty:true,debugDisabled:true,localHandPreserved:true,rendererNeverDispatches:true});
    }
    // Native invoke replies can arrive after a newer onMultiplayer event.
    // Hold a genuine command reply, publish the newer projection, then release
    // the old reply. It must not roll back sequence, pending state, or the view.
    const race=JSON.parse(JSON.stringify(fixtures[0]));race.modelRevision=40;race.snapshot.matchId='ui-native-ordering';race.snapshot.sequence=7;race.snapshot.pending=true;
    await emit(page,race);assert.equal(await page.evaluate(()=>FrontlinesApp.getUIState().networkPending),true);
    await page.evaluate(()=>{window.__holdNextResponse=true;window.__heldCommand=FrontlinesMultiplayerUI.command('resync');});
    await page.waitForFunction(()=>typeof window.__completeHeldResponse==='function');
    const newer=JSON.parse(JSON.stringify(race));newer.modelRevision=42;newer.snapshot.sequence=8;newer.snapshot.pending=false;
    await emit(page,newer);await page.evaluate(async()=>{window.__completeHeldResponse();await window.__heldCommand;});
    assert.equal(await page.evaluate(()=>FrontlinesMultiplayerUI.getState().modelRevision),42,'Late invoke cannot replace a newer event');
    assert.equal(await page.evaluate(()=>FrontlinesMultiplayerUI.getState().snapshot.sequence),8,'Late invoke cannot roll back the battlefield');
    assert.equal(await page.evaluate(()=>FrontlinesApp.getUIState().networkPending),false,'Late invoke cannot relock acknowledged input');
    await page.evaluate(()=>FrontlinesMultiplayerUI.accept({modelRevision:41,phase:'lobby',available:true,connection:{state:'connected'},lobby:{players:[]}}));
    assert.equal(await page.evaluate(()=>FrontlinesApp.getUIState().network),true,'Old lobby DTO cannot tear down a newer match');
    const lowerSequence=JSON.parse(JSON.stringify(newer));delete lowerSequence.modelRevision;lowerSequence.snapshot.sequence=6;lowerSequence.snapshot.pending=true;
    await page.evaluate(model=>FrontlinesMultiplayerUI.accept(model),lowerSequence);
    assert.equal(await page.evaluate(()=>FrontlinesMultiplayerUI.getState().snapshot.sequence),8,'Legacy DTO without revision cannot roll back same match');
    const countBefore=await page.evaluate(()=>window.__networkCommands.filter(c=>c.type==='intent').length);
    const pending=JSON.parse(JSON.stringify(newer));pending.modelRevision=43;pending.snapshot.pending=true;await emit(page,pending);
    const beforeResync=await page.evaluate(()=>JSON.stringify(FrontlinesApp.getState()));
    assert.equal((await page.evaluate(()=>FrontlinesApp.dispatch({type:'endTurn'}))).ok,false,'Awaiting acknowledgement prevents second command');
    const resynced=JSON.parse(JSON.stringify(pending));resynced.modelRevision=44;resynced.snapshot.pending=false;await emit(page,resynced);
    assert.equal(await page.evaluate(()=>FrontlinesApp.getUIState().networkPending),false,'Authoritative same-sequence resync releases pending input');
    assert.equal(await page.evaluate(()=>JSON.stringify(FrontlinesApp.getState())),beforeResync,'Acknowledgement recovery never resolves or replays an intent locally');
    assert.equal(await page.evaluate(()=>window.__networkCommands.filter(c=>c.type==='intent').length),countBefore,'Recovery does not automatically replay a command');
    const unlocked=await page.evaluate(()=>FrontlinesApp.dispatch({type:'endTurn'}));assert.equal(unlocked.pending,true,'User can explicitly issue a command after resync');
    report.input.push('Late invoke reply cannot roll back newer event','Old lobby DTO cannot tear down match','Same-match lower sequence rejected without revision','Authoritative same-sequence resync clears pending without replay');
    await emit(page,fixtures[1]);
    await page.evaluate(()=>{const trigger=document.createElement('button');trigger.dataset.action='deck';trigger.dataset.player='0';document.getElementById('app').appendChild(trigger);trigger.click();});
    assert.equal(await page.locator('.deck-grid').count(),0,'Human opponent deck inspection cannot reveal a private list');assert.match(await page.locator('.modal').innerText(),/deck and hand are private/);
    await page.locator('[data-action="close-modal"]').first().click();report.privacy.push({opponentDeckInspectionDenied:true,remoteNameMarkupEscaped:true});
    const disconnected={...fixtures[1],connection:{state:'reconnecting',route:'relay'}};await emit(page,disconnected);
    assert.equal(await page.locator('.mp-reconnect').count(),1);assert.equal((await page.evaluate(()=>FrontlinesApp.dispatch({type:'endTurn'}))).ok,false);
    await layout(page,'reconnecting');
    const ending=JSON.parse(JSON.stringify(fixtures[1]));ending.phase='results';ending.snapshot.state.winner=1;ending.snapshot.status='results';ending.snapshot.sequence=1;ending.snapshot.result={reason:'territory',winner:1};
    const credits=await page.evaluate(()=>FrontlinesCollection.load().credits);await emit(page,ending);
    assert.match(await page.locator('.mp-result').innerText(),/TERRITORY SECURED/);assert.equal(await page.evaluate(()=>FrontlinesCollection.load().credits),credits);
    for(const [width,height]of sizes){await page.setViewportSize({width,height});await layout(page,'results');}
    await emit(page,{phase:'closed',available:false,configurationRequired:true,connection:{state:'closed',reason:'SOCKET_ECONNRESET'},lobby:{players:[]},error:{code:'VERSION_MISMATCH'}});
    assert.equal(await page.locator('[data-mp="host"]').isDisabled(),true);assert.equal(await page.locator('[data-mp="join-screen"]').isDisabled(),true);assert.equal(await page.locator('[data-mp="update"]').count(),1);assert.doesNotMatch(await page.locator('.mp-screen').innerText(),/SOCKET_ECONNRESET/);
    for(const [width,height]of sizes){await page.setViewportSize({width,height});await layout(page,'connection-error');}
    report.input.push('Opponent window locks commands but preserves inspection','Pending intent locks commands','Reconnect blocks progression','Result does not grant ordinary Credits');
    assert.deepEqual(report.errors,[]);report.passed=true;
  }finally{await browser.close();}
})().catch(e=>{report.failure=String(e.stack||e);process.exitCode=1;}).finally(()=>{fs.writeFileSync(path.join(out,scaled?'sprint13-ui-scaled-browser.json':'sprint13-ui-browser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,layouts:report.layouts.length,errors:report.errors,failure:report.failure}));});
