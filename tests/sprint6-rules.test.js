'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const B=require('../balance'),Base=require('../data'),Legacy=require('../engine'),S=require('../sim-core'),T=require('../telemetry');
const runtime=B.createRuntime('sprint6'),E=runtime.engine,D=runtime.data;
let uid=60000;
function fixture(config={}){return E.createGame({seed:76123,config:{startingCommand:80,commandCap:80,drawCount:0,...config}});}
function hand(state,id,owner=0){const item={uid:'fixture'+uid++,cardId:id};state.players[owner].hand.push(item);return item;}
function field(state,id,owner=0,territory=3,changes={}){const unit={uid:'fixture'+uid++,cardId:id,owner,territory,damage:0,ready:true,deployedTurn:0,movedTurn:-1,...changes};state.units.push(unit);return unit;}
function apply(state,action){const before=JSON.stringify(state),result=E.dispatch(state,action,{events:true});assert.equal(result.ok,true,result.error);assert.equal(JSON.stringify(state),before);E.assertInvariants(result.state);return result;}
function reject(state,action,pattern){const before=JSON.stringify(state),result=E.dispatch(state,action);assert.equal(result.ok,false);assert.equal(result.state,state);assert.equal(JSON.stringify(state),before);assert.match(result.error,pattern);}
function inventory(state,seat){return state.players[seat].deck.concat(state.players[seat].discard,state.players[seat].hand.map(c=>c.cardId),state.units.filter(u=>u.owner===seat).map(u=>u.cardId)).sort();}
function conservedField(state,id,owner,territory,changes={}){
 const player=state.players[owner],inHand=player.hand.findIndex(c=>c.cardId===id);
 let item;if(inHand>=0)item=player.hand.splice(inHand,1)[0];else{const at=player.deck.indexOf(id);assert.notEqual(at,-1,'fixture needs card in legal deck');player.deck.splice(at,1);item={uid:'c'+state.nextUid++,cardId:id};}
 const unit={...item,owner,territory,damage:0,ready:true,deployedTurn:0,movedTurn:-1,...changes};state.units.push(unit);return unit;
}

test('Sprint 6 changes costs/rules only and preserves every Arsenal combat value and deck',()=>{
 const old=B.dataFor('arsenal');assert.equal(B.DEFAULT_PROFILE,'sprint15');
 assert.deepEqual(D.DEFAULT_CONFIG,old.DEFAULT_CONFIG);assert.deepEqual(D.DECKS,old.DECKS);
 for(const id of Object.keys(D.CARDS)){
  for(const key of ['presence','attack','health','traits','effect','unique','type','faction'])assert.deepEqual(D.CARDS[id][key],old.CARDS[id][key],id+' '+key);
  assert.ok(Number.isInteger(D.CARDS[id].commandCost));assert.ok([0,1].includes(D.CARDS[id].commandCost));
 }
 assert.equal(E.VERSION,'frontlines-territory-v3-command-frontline');assert.equal(Legacy.VERSION,'frontlines-territory-v2-arsenal');
 assert.equal(Base.CARDS.stonewall_rifles.commandCost,undefined);
});

test('high Capacity ordinary deployments exceed three card plays and work at zero commands',()=>{
 let state=fixture();state.players[0].hand=[];state.actionsLeft=0;
 for(let i=0;i<6;i++)hand(state,'stonewall_rifles');
 const available=E.presence(state,0).available;
 for(let i=0;i<6;i++){
  const card=state.players[0].hand[0],action={type:'deploy',handUid:card.uid,territory:i<5?2:1};
  assert.deepEqual(E.actionCost(state,action),{presence:4,commandActions:0});
  assert.ok(E.legalActions(state).some(a=>a.type==='deploy'&&a.handUid===card.uid));
  state=apply(state,action).state;assert.equal(state.actionsLeft,0);
 }
 assert.equal(state.units.length,6);assert.equal(E.presence(state,0).available,available-24);
});

test('explicit major deployments consume both Capacity and commands; costs remain flexible',()=>{
 let state=fixture();state.players[0].hand=[];const heavy=hand(state,'stonewall_heavy'),leader=hand(state,'stonewall_commander'),asset=hand(state,'stonewall_redoubt');
 for(const item of [heavy,leader,asset])assert.deepEqual(E.actionCost(state,{type:'deploy',handUid:item.uid,territory:2}),{presence:D.CARDS[item.cardId].presence,commandActions:1});
 state=apply(state,{type:'deploy',handUid:heavy.uid,territory:2}).state;assert.equal(state.actionsLeft,2);
 state.actionsLeft=0;reject(state,{type:'deploy',handUid:leader.uid,territory:2},/No Command Actions/);
 const data=JSON.parse(JSON.stringify(D));data.CARDS.stonewall_rifles.commandCost=2;const custom=Legacy.withData(data),f=custom.createGame({seed:7});
 const card=hand(f,'stonewall_rifles');assert.deepEqual(custom.actionCost(f,{type:'deploy',handUid:card.uid}),{presence:4,commandActions:2});
 const result=custom.dispatch(f,{type:'deploy',handUid:card.uid,territory:2});assert.ok(result.ok);assert.equal(result.state.actionsLeft,1);
});

test('support Orders are free; tactical Orders and commands cost one; insufficient Capacity is rejected',()=>{
 let state=fixture();state.players[0].hand=[];state.actionsLeft=0;
 const injured=field(state,'stonewall_rifles',0,2,{damage:2}),heal=hand(state,'stonewall_triage');
 assert.deepEqual(E.actionCost(state,{type:'order',handUid:heal.uid,targetUid:injured.uid}),{presence:3,commandActions:0});
 state=apply(state,{type:'order',handUid:heal.uid,targetUid:injured.uid}).state;assert.equal(state.actionsLeft,0);assert.equal(state.players[0].spent,3);
 const target=field(state,'bruiser_heavy',1),strike=hand(state,'stonewall_fire_support');
 reject(state,{type:'order',handUid:strike.uid,targetUid:target.uid},/No Command Actions/);
 state.actionsLeft=3;state=apply(state,{type:'order',handUid:strike.uid,targetUid:target.uid}).state;assert.equal(state.actionsLeft,2);
 const ordinary=hand(state,'stonewall_rifles');state.players[0].spent=state.players[0].command-E.presence(state,0).committed;
 reject(state,{type:'deploy',handUid:ordinary.uid,territory:2},/Requires 4 Presence/);
});

test('moves and attacks use one command and both seats reset to the same command allowance',()=>{
 let state=fixture(),unit=field(state,'stonewall_rifles',0,2),enemy=field(state,'bruiser_heavy',1);
 const move={type:'move',unitUid:unit.uid,territory:3};assert.deepEqual(E.actionCost(state,move),{presence:0,commandActions:1});state=apply(state,move).state;assert.equal(state.actionsLeft,2);
 state.units.find(u=>u.uid===unit.uid).ready=true;
 const attack={type:'attack',unitUid:unit.uid,targetUid:enemy.uid};assert.deepEqual(E.actionCost(state,attack),{presence:0,commandActions:1});state=apply(state,attack).state;assert.equal(state.actionsLeft,1);
 state=apply(state,{type:'respond',pass:true}).state;state=apply(state,{type:'endTurn'}).state;assert.equal(state.actionsLeft,3);assert.equal(state.attacker,1);
 state=apply(state,{type:'endTurn'}).state;assert.equal(state.actionsLeft,3);assert.equal(state.attacker,0);
});

test('responses and counters remain Capacity-only even with zero commands',()=>{
 let state=fixture(),attacker=field(state,'stonewall_rifles'),defender=field(state,'bruiser_heavy',1),shield=hand(state,'stonewall_brace',1),counter=hand(state,'syndicate_counter');
 state.actionsLeft=1;state=apply(state,{type:'attack',unitUid:attacker.uid,targetUid:defender.uid}).state;assert.equal(state.actionsLeft,0);
 assert.deepEqual(E.actionCost(state,{type:'respond',handUid:shield.uid}),{presence:2,commandActions:0});state=apply(state,{type:'respond',handUid:shield.uid}).state;
 assert.deepEqual(E.actionCost(state,{type:'counter',handUid:counter.uid}),{presence:2,commandActions:0});state=apply(state,{type:'counter',handUid:counter.uid}).state;assert.equal(state.actionsLeft,0);assert.equal(state.response,null);
});

test('capture retreats survivors before shifting the front and conserves every card',()=>{
 let state=fixture({captureThreshold:4});const inventories=[inventory(state,0),inventory(state,1)];
 conservedField(state,'stonewall_rifles',0,3);const defender=conservedField(state,'bruiser_heavy',1,3,{damage:2});
 const result=apply(state,{type:'endTurn'});state=result.state;
 assert.equal(state.contested,4);assert.equal(state.territories[3].owner,0);assert.equal(state.units.find(u=>u.uid===defender.uid).territory,4);assert.equal(state.units.find(u=>u.uid===defender.uid).damage,2);
 const capture=result.events.findIndex(e=>e.type==='capture'),retreat=result.events.findIndex(e=>e.type==='forcedRetreat'),front=result.events.findIndex(e=>e.type==='frontline');
 assert.ok(capture<retreat&&retreat<front);assert.equal(result.events[retreat].capturedBy,0);
 assert.deepEqual(inventory(state,0),inventories[0]);assert.deepEqual(inventory(state,1),inventories[1]);
 assert.ok(state.log.some(e=>e.text.includes('because the territory was captured')));
});

test('multiple defenders reserve slots in ascending numeric UID order; overflow is eliminated',()=>{
 let state=fixture({captureThreshold:4,slotsPerTerritory:2});conservedField(state,'stonewall_rifles',0,3);
 const later=conservedField(state,'bruiser_assault',1,3),earlier=conservedField(state,'bruiser_heavy',1,3);
 later.uid='ordered12';earlier.uid='ordered2';
 conservedField(state,'bruiser_assault',1,4);const result=apply(state,{type:'endTurn'});state=result.state;
 assert.equal(state.units.find(u=>u.uid==='ordered2').territory,4);assert.equal(state.units.some(u=>u.uid==='ordered12'),false);
 const routed=result.events.find(e=>e.type==='forcedElimination');assert.equal(routed.uid,'ordered12');assert.equal(routed.reason,'friendly territory is full');
 assert.ok(result.events.some(e=>e.type==='death'&&e.uid==='ordered12'));assert.equal(state.stats.kills[0],1);
});

test('immobile assets are eliminated on capture; full and off-map retreats never strand units',()=>{
 let state=fixture({captureThreshold:4});conservedField(state,'stonewall_rifles',0,3);const asset=conservedField(state,'bruiser_banner',1,3);
 let result=apply(state,{type:'endTurn'});assert.ok(result.events.some(e=>e.type==='forcedElimination'&&e.uid===asset.uid&&e.reason==='immobile asset'));assert.ok(result.state.players[1].discard.includes(asset.cardId));
 state=fixture({captureThreshold:4,slotsPerTerritory:1});conservedField(state,'stonewall_rifles',0,3);const doomed=conservedField(state,'bruiser_heavy',1,3);conservedField(state,'bruiser_assault',1,4);
 result=apply(state,{type:'endTurn'});assert.equal(result.state.units.some(u=>u.uid===doomed.uid),false);
 state=fixture({captureThreshold:4});state.contested=6;state.territories.forEach((t,i)=>{t.owner=i<6?0:1;});conservedField(state,'stonewall_rifles',0,6);const home=conservedField(state,'bruiser_heavy',1,6);
 result=apply(state,{type:'endTurn'});assert.equal(result.state.winner,0);assert.equal(result.state.units.some(u=>u.uid===home.uid),false);assert.ok(result.events.some(e=>e.type==='forcedElimination'&&e.reason==='no territory beyond home'));
 assert.ok(result.events.some(e=>e.type==='frontline'&&e.victory&&e.from===6&&e.to===6));
});

test('recapture retreats the opposing army toward the other home and remains contiguous',()=>{
 let state=fixture({captureThreshold:4});conservedField(state,'stonewall_rifles',0,3);state=apply(state,{type:'endTurn'}).state;
 const advanced=state.units.find(u=>u.owner===0),defender=conservedField(state,'bruiser_heavy',1,4);
 const result=apply(state,{type:'endTurn'});state=result.state;
 assert.equal(state.contested,3);assert.equal(state.units.find(u=>u.uid===advanced.uid).territory,3);assert.equal(state.units.find(u=>u.uid===defender.uid).territory,3);
 assert.ok(result.events.some(e=>e.type==='forcedRetreat'&&e.player===0&&e.from===4&&e.to===3));E.assertInvariants(state);
});

test('frontline invariant rejects stranded armies and gaps; old profiles preserve historical rules',()=>{
 const state=fixture();field(state,'stonewall_rifles',0,4);assert.throws(()=>E.assertInvariants(state),/stranded/);
 const gap=fixture();gap.territories[1].owner=1;assert.throws(()=>E.assertInvariants(gap),/non-contiguous/);
 const old=B.createRuntime('arsenal'),legacy=old.engine.createGame({seed:77,config:{startingCommand:80,commandCap:80,captureThreshold:4,drawCount:0}});
 field(legacy,'stonewall_rifles',0,3);const defender=field(legacy,'bruiser_heavy',1,3);const result=old.engine.dispatch(legacy,{type:'endTurn'},{events:true});assert.equal(result.state.units.find(u=>u.uid===defender.uid).territory,3);assert.ok(!result.events.some(e=>e.type==='forcedRetreat'));
 legacy.actionsLeft=0;const ordinary=hand(legacy,'stonewall_rifles');assert.match(old.engine.validate(legacy,{type:'deploy',handUid:ordinary.uid,territory:2}),/No major actions/);
 assert.deepEqual(old.engine.actionCost(legacy,{type:'deploy',handUid:ordinary.uid}),{presence:4,commandActions:1});
});

test('routed simultaneous Scavenge sources do not draw from their own elimination',()=>{
 let state=fixture({captureThreshold:4,slotsPerTerritory:2});field(state,'stonewall_rifles',0,3);field(state,'rogue_broker',1,3);field(state,'rogue_broker',1,3);field(state,'bruiser_assault',1,4);field(state,'bruiser_heavy',1,4);
 const handCount=state.players[1].hand.length,result=apply(state,{type:'endTurn'});assert.equal(result.state.players[1].hand.length,handCount);assert.ok(!result.events.some(e=>e.type==='passive'&&e.trait==='scavenge'));
});

test('telemetry records free plays, command spending and forced movement without altering state',()=>{
 let state=fixture({captureThreshold:4}),ordinary=hand(state,'stonewall_rifles');const tracker=T.createTracker({state,data:D,engine:E,trace:true});
 function record(action){const before=state,result=apply(state,action);tracker.record(before,result.state,action,{events:result.events});state=result.state;}
 record({type:'deploy',handUid:ordinary.uid,territory:2});record({type:'move',unitUid:ordinary.uid,territory:3});field(state,'bruiser_heavy',1,3);record({type:'endTurn'});
 const summary=tracker.finish(state);assert.equal(summary.economy[0].freeCardPlays,1);assert.equal(summary.economy[0].commandActionsSpent,1);assert.equal(summary.economy[1].forcedRetreats,1);assert.equal(summary.gameVersion,require('../package.json').version);assert.deepEqual(summary.rules,D.RULES);
});

test('one deterministic non-balance simulator smoke includes new rules and exact replay',()=>{
 const run=S.createRun({count:1,balanceProfile:'sprint6',seed:76001,verify:true,ai:'deck',maxTurns:240});
 while(!run.done)run.step();const report=run.result();assert.equal(report.summary.errors,0);assert.equal(report.matches[0].status,'win');
 assert.equal(report.rulesSnapshot.rulesVersion,'sprint6-command-frontline-v1');assert.deepEqual(report.rulesSnapshot.rules,D.RULES);assert.match(report.rulesSnapshot.mechanics.actions,/Zero commands/);assert.match(report.rulesSnapshot.mechanics.retreat,/ascending UID/);
 assert.equal(report.gameVersion,require('../package.json').version);assert.deepEqual(S.replayMatch(report,0).match,report.matches[0]);
 assert.match(S.matchesCSV(report),/game_version/);assert.ok(S.matchesCSV(report).includes(report.gameVersion));assert.match(S.cardsCSV(report),/game_version/);
 const altered=JSON.parse(JSON.stringify(report));altered.rulesSnapshot.rules.frontlineIntegrity=false;assert.throws(()=>S.replayMatch(altered,0),/rules|compatible|version/i);
 const old=JSON.parse(JSON.stringify(report));old.simulatorVersion='3.1.0';assert.throws(()=>S.replayMatch(old,0),/rules|compatible|version/i);
});
