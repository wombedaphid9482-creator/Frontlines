'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),B=require('../balance'),T=require('../telemetry'),S=require('../sim-core'),Analytics=require('../analytics');
const R=B.createRuntime('sprint11'),D=R.data,E=R.engine,clone=v=>JSON.parse(JSON.stringify(v));let serial=112000;
function fixture(faction='stonewall'){const s=E.createGame({seed:1104,factions:[faction,'bruiser'],config:{startingCommand:80,commandCap:80,drawCount:0}});s.players.forEach(p=>{p.hand=[];p.commander.used=true;});return s;}
function unit(s,cardId,owner=0,territory=3,extra={}){const u={uid:'s11-metric-'+serial++,cardId,owner,territory,damage:0,ready:true,deployedTurn:0,movedTurn:-1,...extra};s.units.push(u);return u;}
function hand(s,cardId,owner=0){const h={uid:'s11-metric-'+serial++,cardId};s.players[owner].hand.push(h);return h;}
function tracker(s){return T.createTracker({state:s,data:D,engine:E,trace:true,decks:['fixture-a','fixture-b']});}
function tracked(s,t,a){const r=E.dispatch(s,a,{events:true});assert.equal(r.ok,true,r.error);t.record(s,r.state,a,{events:r.events});return r.state;}
function resolve(s,t,a){s=tracked(s,t,a);while(s.response)s=tracked(s,t,{type:s.response.stage==='counter'?'counter':'respond',pass:true});return s;}
function row(report,id,owner=0){return report.cards.find(c=>c.cardId===id&&c.player===owner);}

test('Tactical events record Cover source, exact effective protection and expiry without changing gameplay',()=>{
  let s=fixture(),ally=unit(s,'stonewall_rifles'),enemy=unit(s,'bruiser_assault',1),cover=hand(s,'stonewall_dig_in');const t=tracker(s);
  s=tracked(s,t,{type:'order',handUid:cover.uid,targetUid:ally.uid});s.attacker=1;s=resolve(s,t,{type:'attack',unitUid:enemy.uid,targetUid:ally.uid});
  const report=t.finish(s);assert.equal(report.telemetryVersion,'frontlines-telemetry-v7-tactical');assert.equal(report.tactical[0].coverApplied,1);assert.equal(report.tactical[0].coverConsumed,1);assert.equal(report.tactical[0].coverDamagePrevented,2);assert.equal(row(report,'stonewall_dig_in').coverDamagePrevented,2);assert.ok(report.trace.some(step=>step.events.some(e=>e.type==='statusConsumed'&&e.status==='cover')));
  const old=B.createRuntime('sprint10'),legacy=T.createTracker({state:old.engine.createGame({seed:1103}),data:old.data,engine:old.engine}).summary();assert.equal(legacy.telemetryVersion,'frontlines-telemetry-v6-commanders');assert.equal(legacy.tactical,undefined);assert.equal(legacy.cards[0].coverApplied,undefined);
});

test('Protection does not claim effective health saved when both covered and uncovered hits are lethal',()=>{
  let s=fixture(),ally=unit(s,'stonewall_rifles',0,3,{damage:D.CARDS.stonewall_rifles.health-1}),enemy=unit(s,'bruiser_heavy',1),cover=hand(s,'stonewall_dig_in');const t=tracker(s);s=tracked(s,t,{type:'order',handUid:cover.uid,targetUid:ally.uid});s.attacker=1;s=resolve(s,t,{type:'attack',unitUid:enemy.uid,targetUid:ally.uid});const report=t.finish(s);assert.equal(report.tactical[0].coverDamagePrevented,0);assert.equal(report.tactical[0].destructionCauses.combat,1);
});

test('Blast diagnostics cap effective damage at remaining health and distinguish untouched defensive charges',()=>{
  let s=fixture('bruiser'),enemy1=unit(s,'bruiser_assault',1,3,{damage:D.CARDS.bruiser_assault.health-1}),enemy2=unit(s,'bruiser_brawler',1),cover=hand(s,'bruiser_frag_out');s.nextEffectId++;s.effects.push({id:'effect'+s.nextEffectId,kind:'cover',owner:1,targetUid:enemy1.uid,territory:3,sourcePlayer:1,sourceCardId:enemy1.cardId,sourceUid:enemy1.uid,amount:2,startedTurn:s.turn,stack:'refresh',consume:'directEnemyHit',expires:{timing:'windowStart',player:1,afterTurn:s.turn},metadata:{}});const t=tracker(s);
  s=tracked(s,t,{type:'order',handUid:cover.uid,territory:3});const report=t.finish(s);assert.equal(report.tactical[0].blastUses,1);assert.equal(report.tactical[0].blastTargetsHit,2);assert.equal(report.tactical[0].blastEffectiveDamage,3);assert.equal(row(report,'bruiser_frag_out').blastEffectiveDamage,3);assert.equal(report.tactical[1].coverBlastBypasses,1);assert.equal(report.tactical[1].coverConsumed,0);assert.equal(report.tactical[1].destructionCauses.enemyEffect,1);assert.ok(s.units.some(u=>u.uid===enemy2.uid));
});

test('Sacrifice attribution remains an explicit paid cause and never claims a general casualty reward',()=>{
  let s=fixture('rogue'),cost=unit(s,'rogue_improvised_mine'),scavenger=unit(s,'rogue_salvage'),enemy=unit(s,'bruiser_assault',1),bomb=hand(s,'rogue_salvage_charge');s.players[0].commander.id='commander_rogue_scavenger';s.players[0].commander.used=false;const t=tracker(s),before=s.players[0].hand.length;
  s=tracked(s,t,{type:'order',handUid:bomb.uid,sacrificeUid:cost.uid,territory:3});const report=t.finish(s);assert.equal(report.tactical[0].sacrifices,1);assert.equal(report.tactical[0].destructionCauses.sacrifice,1);assert.equal(report.tactical[0].sacrificePresenceReleased,D.CARDS[cost.cardId].presence);assert.equal(row(report,'rogue_salvage_charge').sacrifices,1);assert.equal(row(report,scavenger.cardId).scavengeCardsDrawn,0);assert.equal(report.commanders[0].passiveCardsDrawn,0);assert.equal(report.economy[0].kills,0);assert.equal(row(report,'rogue_salvage_charge').kills,0);assert.equal(s.players[0].hand.length,before-1);assert.ok(s.units.some(u=>u.uid===enemy.uid));
});

test('Overwatch and Suppression preserve exact event sources and opportunity denominators',()=>{
  let s=fixture(),watch=unit(s,'stonewall_bastion_gunner'),entrant=unit(s,'bruiser_assault',1,4);const t=tracker(s);s=tracked(s,t,{type:'overwatch',unitUid:watch.uid});s.attacker=1;s=tracked(s,t,{type:'move',unitUid:entrant.uid,territory:3});const report=t.finish(s);assert.equal(report.tactical[0].overwatchSet,1);assert.equal(report.tactical[0].overwatchTriggered,1);assert.equal(row(report,watch.cardId).overwatchTriggered,1);assert.ok(report.trace.some(step=>step.events.some(e=>e.type==='overwatchTriggered'&&e.targetUid===entrant.uid)));
  let suppressed=fixture('syndicate'),source=unit(suppressed,'syndicate_suppression_team'),target=unit(suppressed,'bruiser_heavy',1);const st=tracker(suppressed);suppressed=tracked(suppressed,st,{type:'ability',unitUid:source.uid,abilityId:'pinpoint-fire',targetUid:target.uid});suppressed=tracked(suppressed,st,{type:'endTurn'});suppressed=tracked(suppressed,st,{type:'endTurn'});const summary=st.finish(suppressed);assert.equal(summary.tactical[0].suppressionApplied,1);assert.equal(summary.tactical[1].suppressedActionWindows,1);assert.equal(summary.tactical[1].suppressedActionsObserved,1);assert.equal(summary.tactical[0].suppressionExpired,1);
});

test('Aggregation preserves faction, deck and seat diagnostics including explicitly censored appearances',()=>{
  let s=fixture('bruiser');unit(s,'bruiser_assault',1);hand(s,'bruiser_frag_out');const t=tracker(s);const action=E.legalActions(s).find(a=>a.type==='order');s=tracked(s,t,action);const report=t.finish(s),acc=Analytics.createAccumulator({thresholds:S.DEFAULT_THRESHOLDS});const match={status:'turnLimit',deckIds:['fixture-a','fixture-b'],factions:['bruiser','bruiser'],turns:1,winner:null,winnerFaction:null};acc.add(match,report);const summary=acc.summary({byFaction:[],byMatchup:[],firstPlayerWinRate:null,decisive:0});assert.equal(summary.tactical.totals.blastUses,1);assert.equal(summary.tactical.byDeck[0].appearances,1);assert.equal(summary.tactical.byDeck[0].decisiveAppearances,0);assert.equal(summary.tactical.bySeat[0].blastUses,1);assert.match(summary.tactical.method,/not causal/);
});

test('S11 frozen report defines mechanics and all 35 deck groups without executing a campaign',()=>{
  const catalog=S.getDeckCatalog(D);assert.equal(catalog.length,35);assert.equal(catalog.filter(d=>d.deckGroup==='tactical-showcase').length,5);assert.equal(catalog.filter(d=>d.deckGroup==='legacy-baseline').length,20);assert.equal(catalog.filter(d=>d.deckGroup==='commander-foundation').length,10);
  const run=S.createRun({mode:'matrix',count:100000,balanceProfile:'sprint11',deckPool:catalog.map(d=>d.id),includeMirrors:true,seed:1209,aiProfiles:['deck','deck']});const report=run.result();assert.equal(report.completed,0);assert.equal(report.simulatorVersion,'5.0.0');assert.equal(report.telemetryVersion,'frontlines-telemetry-v7-tactical');assert.equal(report.rulesSnapshot.rulesVersion,'sprint11-tactical-v1');assert.equal(Object.keys(report.rulesSnapshot.cards).length,155);for(const key of ['Cover','Breach','Blast','Dodge','Suppression','Overwatch','Sacrifice','Exposed','Smoke'])assert.ok(report.rulesSnapshot.tacticalDefinitions[key].definition);assert.match(report.rulesSnapshot.tacticalFingerprint,/^[0-9a-f]{8}$/);assert.equal(report.rulesSnapshot.decks.filter(d=>d.deckGroup==='tactical-showcase').length,5);
});

test('One deterministic expansion integration match completes with conserved cards and exported tactical metrics',()=>{
  const run=S.createRun({mode:'duel',count:1,deckA:'stonewall-prepared-ground',deckB:'bruiser-breach-column',balanceProfile:'sprint11',seed:1104,aiProfiles:['deck','deck'],verify:true,maxTurns:240,maxDecisions:10000});while(!run.done)run.step();const report=run.result();assert.equal(report.completed,1);assert.equal(report.summary.errors,0);assert.equal(report.summary.unfinished,0);assert.equal(report.matches[0].status,'win');assert.ok(report.summary.tactical);assert.ok(report.summary.tactical.totals.coverApplied>0||report.summary.tactical.totals.blastUses>0);assert.match(S.cardsCSV(report),/coverApplied/);assert.match(S.reportHTML(report),/Tactical Arsenal diagnostics/);const frozen=clone(report);S.cardsCSV(report);S.reportHTML(report);assert.deepEqual(report,frozen);
});
