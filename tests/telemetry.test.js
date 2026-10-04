'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../engine.js'),D=require('../data.js'),AI=require('../ai.js'),T=require('../telemetry.js'),S=require('../sim-core.js'),A=require('../analytics.js');
let uid=20000;
function fixture(config){const s=E.createGame({seed:42,config:{startingCommand:80,commandCap:80,...config}});s.players.forEach(p=>{p.hand=[];});return s;}
function unit(s,id,owner=0,territory=3,changes={}){const u={uid:`t${uid++}`,cardId:id,owner,territory,damage:0,ready:true,deployedTurn:0,movedTurn:-1,...changes};s.units.push(u);return u;}
function hand(s,id,owner=0){const h={uid:`t${uid++}`,cardId:id};s.players[owner].hand.push(h);return h;}
function tracked(s,tracker,action,detail){const r=E.dispatch(s,action,{events:true});assert.equal(r.ok,true,r.error);tracker.record(s,r.state,action,{events:r.events,...detail});return r.state;}
function card(report,id,player=0){return report.cards.find(c=>c.cardId===id&&c.player===player);}
function finished(options){const run=S.createRun(options);while(!run.done)run.step();return run.result();}

test('diagnostic event collection cannot change state, seeded draws or input',()=>{
  let s=E.createGame({seed:401});
  for(let i=0;i<200&&s.winner===null;i++){
    const action=AI.chooseAction(s),before=JSON.stringify(s);
    const plain=E.dispatch(s,action),diagnostic=E.dispatch(s,action,{events:true});
    assert.deepEqual(diagnostic.state,plain.state);assert.equal(JSON.stringify(s),before);
    assert.ok(Array.isArray(diagnostic.events));s=plain.state;
  }
});
test('withData isolates rule/card contexts and never mutates baseline definitions',()=>{
  const data=JSON.parse(JSON.stringify(D));data.CARDS.stonewall_rifles.attack=99;
  const altered=E.withData(data);
  assert.equal(altered.card('stonewall_rifles').attack,99);assert.notEqual(E.card('stonewall_rifles').attack,99);
  assert.equal(D.CARDS.stonewall_rifles.attack,3);
});
test('ambush lethal damage and kill belong to the response Order, with capped health loss',()=>{
  let s=fixture();const attacker=unit(s,'stonewall_rifles',0,3,{damage:D.CARDS.stonewall_rifles.health-1});
  const defender=unit(s,'bruiser_heavy',1),ambush=hand(s,'bruiser_ambush',1);
  const t=T.createTracker({state:s,trace:true});
  s=tracked(s,t,{type:'attack',unitUid:attacker.uid,targetUid:defender.uid});
  s=tracked(s,t,{type:'respond',handUid:ambush.uid});s=tracked(s,t,{type:'counter',pass:true});
  const r=t.finish(s),order=card(r,'bruiser_ambush',1);
  assert.equal(order.damageDealt,3);assert.equal(order.effectiveDamageDealt,1);assert.equal(order.kills,1);
  assert.equal(card(r,'bruiser_heavy',1).damageDealt,0);
  assert.equal(r.economy[0].casualtyReleased,D.CARDS.stonewall_rifles.presence);
  assert.equal(r.economy[1].orderSpend,3);
  assert.ok(r.trace.some(step=>step.events.some(event=>event.sourceName==='Violent Reprisal')));
});
test('simultaneous lethal trades attribute each kill and effective damage to its own unit',()=>{
  let s=fixture();const a=unit(s,'stonewall_rifles'),b=unit(s,'bruiser_assault',1);
  a.damage=D.CARDS[a.cardId].health-1;b.damage=D.CARDS[b.cardId].health-1;
  const t=T.createTracker({state:s});s=tracked(s,t,{type:'attack',unitUid:a.uid,targetUid:b.uid});s=tracked(s,t,{type:'respond',pass:true});
  const r=t.finish(s);
  assert.equal(card(r,a.cardId).kills,1);assert.equal(card(r,b.cardId,1).kills,1);
  assert.equal(card(r,a.cardId).effectiveDamageDealt,1);assert.equal(card(r,b.cardId,1).effectiveDamageDealt,1);
  assert.equal(r.economy.reduce((sum,e)=>sum+e.kills,0),2);
});
test('Command extra effective damage is tracked without assigning all ally damage to commander',()=>{
  let s=fixture();const a=unit(s,'stonewall_rifles'),c=unit(s,'stonewall_commander'),b=unit(s,'bruiser_heavy',1);
  const t=T.createTracker({state:s});s=tracked(s,t,{type:'attack',unitUid:a.uid,targetUid:b.uid});s=tracked(s,t,{type:'respond',pass:true});
  const r=t.finish(s),commander=card(r,c.cardId);
  assert.equal(commander.damageDealt,0);assert.equal(commander.commandBonusEnabled,1);assert.equal(commander.commandEffectiveDamageEnabled,1);
  assert.equal(card(r,a.cardId).damageDealt,D.CARDS[a.cardId].attack+1);
});
test('Command overkill contributes no extra effective health damage',()=>{
  let s=fixture();const a=unit(s,'stonewall_rifles'),c=unit(s,'stonewall_commander'),b=unit(s,'bruiser_assault',1,3,{damage:D.CARDS.bruiser_assault.health-1});
  const t=T.createTracker({state:s});s=tracked(s,t,{type:'attack',unitUid:a.uid,targetUid:b.uid});s=tracked(s,t,{type:'respond',pass:true});
  assert.equal(card(t.finish(s),c.cardId).commandEffectiveDamageEnabled,0);
});
test('Fortify absorption and Medic actual healing report passives on the correct cards',()=>{
  let s=fixture();s.territories[3].owner=1;const a=unit(s,'bruiser_assault'),b=unit(s,'stonewall_rifles',1);
  const t=T.createTracker({state:s});s=tracked(s,t,{type:'attack',unitUid:a.uid,targetUid:b.uid});s=tracked(s,t,{type:'respond',pass:true});
  assert.equal(card(t.finish(s),b.cardId,1).fortifyAbsorbed,1);
  let m=fixture();const medic=unit(m,'stonewall_medic',1,4),hurt=unit(m,'stonewall_rifles',1,4,{damage:2});
  const mt=T.createTracker({state:m});m=tracked(m,mt,{type:'endTurn'});
  assert.equal(card(mt.finish(m),medic.cardId,1).healingEnabled,1);
  assert.equal(m.units.find(u=>u.uid===hurt.uid).damage,1);
});
test('canceled shield remains spending but cannot claim prevented damage or kills',()=>{
  let s=fixture();const a=unit(s,'syndicate_security'),b=unit(s,'stonewall_rifles',1);
  const shield=hand(s,'stonewall_brace',1),counter=hand(s,'syndicate_counter');const t=T.createTracker({state:s});
  s=tracked(s,t,{type:'attack',unitUid:a.uid,targetUid:b.uid});s=tracked(s,t,{type:'respond',handUid:shield.uid});s=tracked(s,t,{type:'counter',handUid:counter.uid});
  const r=t.finish(s);assert.equal(card(r,shield.cardId,1).orders,1);assert.equal(card(r,counter.cardId).counteredOrders,1);
  assert.equal(r.economy[1].orderSpend,D.CARDS[shield.cardId].presence);
});
test('reclaim frees commitment but is not a death or reserve draw; redeployment does not inflate draws',()=>{
  let s=fixture();const a=unit(s,'rogue_raider',0,2),reclaim=hand(s,'rogue_reclaim');const t=T.createTracker({state:s});
  s=tracked(s,t,{type:'order',handUid:reclaim.uid,targetUid:a.uid});s=tracked(s,t,{type:'deploy',handUid:a.uid,territory:2});
  const r=t.finish(s),c=card(r,a.cardId);assert.equal(c.deaths,0);assert.equal(c.drawn,0);assert.equal(c.deployments,1);
  assert.equal(r.economy[0].reclaimedReleased,D.CARDS[a.cardId].presence);
});
test('Command generation is starting capacity plus capped growth, separate from territorial pressure',()=>{
  let s=fixture({startingCommand:20,commandCap:25,commandGrowth:10});unit(s,'stonewall_rifles');
  const t=T.createTracker({state:s});s=tracked(s,t,{type:'endTurn'});s=tracked(s,t,{type:'endTurn'});
  const r=t.finish(s);assert.equal(r.economy[0].generated,25);assert.equal(r.economy[1].generated,20);
  assert.equal(r.economy[0].territorialPressure,D.CARDS.stonewall_rifles.presence);
});
test('capture pressure belongs to contributors, assets hold ground, and breakthrough is a named move',()=>{
  let s=fixture({captureThreshold:1});const a=unit(s,'stonewall_rifles'),asset=unit(s,'stonewall_aid_station');
  const t=T.createTracker({state:s,trace:true,territoryHistory:true});s=tracked(s,t,{type:'endTurn'});
  const r=t.finish(s);assert.equal(r.territory.captures[0],1);assert.equal(r.territory.firstCaptureTurn,1);
  assert.equal(card(r,a.cardId).pressureContributed,D.CARDS[a.cardId].presence);assert.equal(card(r,asset.cardId).captureContributions,1);
  assert.ok(r.trace[0].events.some(event=>event.type==='move'&&event.reason==='breakthrough'));
  assert.equal(r.territory.samples[1].controlled[0],4);
});
test('meaningful affordability distinguishes full slots and invalid targets from cheap printed cards',()=>{
  let s=fixture({slotsPerTerritory:1});for(const zone of[0,1,2])unit(s,'stonewall_rifles',0,zone);
  const h=hand(s,'stonewall_heavy'),t=T.createTracker({state:s});s=tracked(s,t,{type:'endTurn'});
  const r=t.finish(s);assert.equal(r.economy[0].noMeaningfulAffordableTurns,1);
  assert.equal(card(r,h.cardId).affordableHandEndTurnObservations,1);assert.equal(card(r,h.cardId).affordableOpportunityTurns,0);
});
test('a legal card played later in its opportunity turn counts once even when first action was movement',()=>{
  let s=fixture();const a=unit(s,'stonewall_rifles',0,2),h=hand(s,'stonewall_heavy'),t=T.createTracker({state:s});
  s=tracked(s,t,{type:'move',unitUid:a.uid,territory:3});s=tracked(s,t,{type:'deploy',handUid:h.uid,territory:2});
  const c=card(t.finish(s),h.cardId);assert.equal(c.affordableOpportunityTurns,1);assert.equal(c.playedOpportunityTurns,1);
});
test('trace is bounded and finish is cached without leaking subsequent mutation',()=>{
  let s=E.createGame({seed:601});const t=T.createTracker({state:s,trace:true,traceLimit:3});
  for(let i=0;i<12;i++)s=tracked(s,t,AI.chooseAction(s));
  const r=t.finish(s);assert.equal(r.trace.length,3);assert.equal(r.traceTruncated,true);
  r.economy[0].generated=999;assert.notEqual(t.finish(s).economy[0].generated,999);
  assert.throws(()=>t.record(s,s,{type:'endTurn'}),/finalized/);
});
test('shared live tracker and simulator yield identical card/economy diagnostics for the same transitions',()=>{
  const report=finished({count:1,swapSeats:false,seed:631});const replay=S.replayMatch(report,0);
  let s=E.createGame({seed:631});const live=T.createTracker({state:s,trace:true});
  for(const entry of replay.actions)s=tracked(s,live,entry.action,{decision:entry.decision});
  const r=live.finish(s);assert.deepEqual(r.economy,replay.metrics.economy);assert.deepEqual(r.cards,replay.metrics.cards);
  assert.equal(report.summary.cards.reduce((sum,c)=>sum+c.effectiveDamageDealt,0),r.economy.reduce((sum,e)=>sum+e.effectiveDamageDealt,0));
});
test('distribution reports population standard deviation and nearest-rank percentiles',()=>{
  const d=A.distribution();for(const n of[1,2,3,4])A.addValue(d,n);const s=A.stats(d);
  assert.equal(s.mean,2.5);assert.equal(s.median,2.5);assert.equal(s.p75,3);assert.equal(s.p90,4);assert.equal(s.p95,4);assert.equal(s.std,Math.sqrt(1.25));
});
test('unfinished card usage is preserved but never counted as losing win exposure',()=>{
  const r=finished({count:2,maxDecisions:1});assert.equal(r.summary.ties,0);assert.equal(r.summary.decisive,0);
  assert.ok(r.summary.cards.some(c=>c.drawn>0));assert.ok(r.summary.cards.every(c=>c.drawnDecisiveMatches===0&&c.winRateDrawn===null));
});
test('policy follows selected deck when seats swap; matrix policies reverse with canonical pair',()=>{
  const r=finished({count:2,aiProfiles:['random','baseline'],maxDecisions:1});assert.deepEqual(r.matches[0].aiProfiles,['random','baseline']);assert.deepEqual(r.matches[1].aiProfiles,['baseline','random']);
  const m=finished({mode:'matrix',count:2,aiProfiles:['random','faction'],maxDecisions:1});assert.deepEqual(m.matches[1].aiProfiles,['faction','random']);
});
test('comparisons match exact seeds/decks, describe AI confounding, and HTML escapes untrusted labels',()=>{
  const r=finished({count:4,seed:601}),same=S.compareReports(r,r);assert.equal(same.paired.matched,4);assert.equal(same.paired.changedWinners,0);assert.ok(same.factions.every(row=>row.delta===0||row.delta===null));
  const changed=JSON.parse(JSON.stringify(r));changed.options.aiProfiles=['faction','faction'];assert.equal(S.compareReports(r,changed).controlledBalanceComparison,false);
  changed.summary.byFaction[0].name='<script>alert(1)</script>';
  if(changed.summary.byFactionCross?.length)changed.summary.byFactionCross[0].name='<script>alert(1)</script>';
  const html=S.reportHTML(changed);assert.ok(!html.includes('<script>alert(1)</script>'));assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));assert.ok(html.includes('Casualty commitment released'));
});
test('diagnostic thresholds are validated and only flag after sufficient samples',()=>{
  assert.throws(()=>S.normalizeOptions({thresholds:{seatLow:.9,seatHigh:.1}}));assert.throws(()=>S.normalizeOptions({thresholds:{oops:1}}));
  const r=finished({count:2,thresholds:{minSamples:99999}});assert.equal(r.summary.diagnostics.flags.length,0);assert.equal(r.summary.diagnostics.cardOutliers.length,0);
});
