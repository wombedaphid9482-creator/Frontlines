'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const D=require('../data'),E=require('../engine'),A=require('../ai'),T=require('../telemetry'),S=require('../sim-core');
function run(options){const r=S.createRun(options);while(!r.done)r.step();return r.result();}
test('priority observation cannot change the exact public action selected',()=>{
 let state=E.createGame({seed:741});
 for(let index=0;index<100&&state.winner===null;index++){
  let observed;const plain=A.chooseAction(state,{profile:'deck'}),withObserver=A.chooseAction(state,{profile:'deck',onDecision:row=>{observed=row;}});
  assert.deepEqual(withObserver,plain);assert.equal(observed.profile,'deck');assert.ok(Number.isFinite(observed.score));assert.ok(Number.isFinite(observed.priorityMargin));
  state=E.dispatch(state,plain).state;
 }
});
test('repeat plays count one conditional player-game, and unfinished exposures never imply losses',()=>{
 const options={count:8,mode:'matrix',balanceProfile:'arsenal',ai:'deck',deckPool:require('../decks').presets().map(d=>d.id),seed:20261007};
 const report=run(options);
 for(const card of report.summary.cards){
  assert.ok(card.multiplePlayedMatches<=card.playedMatches);assert.ok(card.multiplePlayedWins<=card.multiplePlayedMatches);
  assert.ok(card.aiScoredPlays<=card.plays);assert.ok(card.deploymentWindowCount+card.deploymentWindowCensored===card.deployments);
 }
 const unfinished=run({...options,maxDecisions:1});
 assert.equal(unfinished.summary.decisive,0);assert.ok(unfinished.summary.cards.every(c=>c.multiplePlayedDecisiveMatches===0&&c.winRateMultiplePlayed===null));
 assert.ok(unfinished.summary.cardMatchups.every(c=>c.decisiveIncludedMatches===0&&c.playedWins===0&&c.winRatePlayed===null));
});
test('deployment territory window measures actual team change and marks truncated observations',()=>{
 let state=E.createGame({seed:4,config:{startingCommand:50,commandCap:50,captureThreshold:1}});
 state.players[0].hand=[{uid:'observed-card',cardId:'stonewall_rifles'}];state.players[1].hand=[];
 const tracker=T.createTracker({state});
 const apply=action=>{const result=E.dispatch(state,action,{events:true});assert.ok(result.ok,result.error);tracker.record(state,result.state,action);state=result.state;};
 apply({type:'deploy',handUid:'observed-card',territory:2});
 const early=tracker.summary().cards.find(c=>c.cardId==='stonewall_rifles'&&c.player===0);assert.equal(early.deploymentWindowCount,0);
 for(let i=0;i<4;i++)apply({type:'endTurn'});
 const card=tracker.finish(state).cards.find(c=>c.cardId==='stonewall_rifles'&&c.player===0);
 assert.equal(card.deploymentWindowCount,1);assert.equal(card.deploymentControlDeltaSum,0);assert.equal(card.deploymentWindowCensored,0);
});
test('release gate cannot hide cutoffs, missing archetypes or faction-average disparity',()=>{
 const analytics=require('../analytics'),factions=['stonewall','bruiser','syndicate','nightwalker','rogue'];
 const fixture={completed:50000,complete:true,summary:{errors:0,unfinished:0,decisive:50000,firstPlayerWinRate:.51,byFaction:factions.map(id=>({id,decisive:20000,winRate:.5})),byDeck:Array.from({length:10},(_,i)=>({id:'test'+i,decisive:10000,winRate:.5})),byMatchup:Array.from({length:45},()=>({decisive:1110,winRateA:.5}))}};
 assert.equal(analytics.balanceGate(fixture).requiredPassed,true);assert.equal(analytics.balanceGate(fixture).preferredPassed,true);
 fixture.summary.byDeck[0].winRate=.80;fixture.summary.byDeck[1].winRate=.20;assert.equal(analytics.balanceGate(fixture).checks.archetypeRange,false);
 fixture.summary.byDeck.forEach(row=>{row.winRate=.5;});fixture.summary.unfinished=1;assert.equal(analytics.balanceGate(fixture).checks.stableMatches,false);
 fixture.summary.unfinished=0;fixture.completed=10000;assert.equal(analytics.balanceGate(fixture).checks.fullValidation,false);
 fixture.completed=50000;fixture.summary.byFaction[0].winRate=.54;fixture.summary.byFaction[1].winRate=.46;assert.equal(analytics.balanceGate(fixture).checks.factionRange,true);assert.equal(analytics.balanceGate(fixture).preferredPassed,false);
});
test('targeted experiments preserve all existing card overrides while changing only requested fields',()=>{
 const helper=require('../scripts/balance-experiment'),arsenal=require('../balance').getProfiles().find(p=>p.id==='arsenal');
 const patched=helper.mergeOverrides(arsenal,{cards:{nightwalker_blade:{health:3},bruiser_rupture_heavy:{attack:4}}});
 assert.equal(patched.changes.cards.nightwalker_blade.presence,4);assert.equal(patched.changes.cards.nightwalker_blade.health,3);
 assert.equal(patched.changes.cards.bruiser_rupture_heavy.health,5);assert.equal(patched.changes.cards.bruiser_rupture_heavy.attack,4);
 assert.deepEqual(arsenal,require('../balance').getProfiles().find(p=>p.id==='arsenal'));
});
