'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const B=require('../balance'),T=require('../telemetry'),S=require('../sim-core'),Decks=require('../decks'),Rules=require('../deck-rules'),Arsenal=require('../arsenal');
const runtime=B.createRuntime(),E=runtime.engine,D=runtime.data;
function fixture(factions){const s=E.createGame({factions,seed:77701,config:{startingCommand:80,commandCap:80,drawCount:0}});s.players.forEach(p=>{p.hand=[];});return s;}
function unit(s,cardId,owner,uid){const u={uid,cardId,owner,territory:3,damage:0,ready:true,deployedTurn:0,movedTurn:-1,...(s.turnSystemVersion===2?{deployedWindow:0,movedWindow:-1,attackedTurn:-1,attackedWindow:-1,defendedTurn:-1,defendedWindow:-1,abilityTurn:-1,abilityWindow:-1}:{})};s.units.push(u);return u;}
function order(s,cardId){const h={uid:'fixture-hand-'+s.players[0].hand.length,cardId};s.players[0].hand.push(h);return h;}
function dispatch(s,t,a){const r=E.dispatch(s,a,{events:true});assert.equal(r.ok,true,r.error);t.record(s,r.state,a,{events:r.events});E.assertInvariants(r.state);return r.state;}
test('current profile, schema and construction use the same rules and preserve older pools',()=>{
  assert.equal(Decks.RULES,Rules);assert.equal(Arsenal.SCHEMA.deckRules.size,Rules.size);assert.equal(Arsenal.SCHEMA.deckRules.maxLeaderCopies,Rules.maxLeaders);
  assert.equal(B.DEFAULT_PROFILE,'sprint15');assert.equal(Object.keys(D.CARDS).length,155);assert.equal(Decks.forData(D).presets().length,20);
  for(const profile of ['baseline','iteration01','candidate','arsenal','sprint6'])assert.equal(Object.keys(B.dataFor(profile).CARDS).length,80,profile);
  for(const deck of Decks.forData(D).getDecks())assert.equal(Decks.forData(D).validate(deck).legal,true,deck.name);
  const snapshot=S.createRun({count:1,balanceProfile:'sprint7',ai:'deck'}).result().rulesSnapshot;
  assert.equal(snapshot.rulesVersion,'sprint7-arsenal-v1');assert.match(snapshot.mechanics.arsenal,/Adapt requires an explicit mode/);assert.equal(Object.keys(snapshot.cards).length,115);
});
test('Mark applications and Armor protection remain visible in card telemetry',()=>{
  let s=fixture(['syndicate','stonewall']);unit(s,'syndicate_security',0,'fixture-attacker');unit(s,'stonewall_bulwark_warden',1,'fixture-defender');const h=order(s,'syndicate_target_designator');
  const t=T.createTracker({state:s,data:D,engine:E});s=dispatch(s,t,{type:'order',handUid:h.uid,targetUid:'fixture-defender'});s=dispatch(s,t,{type:'attack',unitUid:'fixture-attacker',targetUid:'fixture-defender'});s=dispatch(s,t,{type:'respond',pass:true});
  const r=t.finish(s),mark=r.cards.find(c=>c.cardId===h.cardId),armor=r.cards.find(c=>c.cardId==='stonewall_bulwark_warden');assert.equal(mark.markApplications,1);assert.equal(armor.markedCombatWindows,1);assert.equal(armor.armorAbsorbed,1);assert.equal(armor.armorEffectiveHealthProtected,1);
});
test('Reinforce and selected Adapt modes are recorded without invented damage credit',()=>{
  let s=fixture(['stonewall','bruiser']);const u=unit(s,'stonewall_rifles',0,'fixture-ally');u.damage=3;const h=order(s,'stonewall_line_reinforcement');const t=T.createTracker({state:s,data:D,engine:E});s=dispatch(s,t,{type:'order',handUid:h.uid,targetUid:u.uid});const c=t.finish(s).cards.find(c=>c.cardId===h.cardId);assert.equal(c.reinforceApplications,1);assert.equal(c.healingDone,2);assert.equal(c.damageDealt,0);
  s=fixture(['rogue','bruiser']);const adapt=Object.values(D.CARDS).find(c=>c.faction==='rogue'&&c.effect?.kind==='adapt'),a=order(s,adapt.id),tracker=T.createTracker({state:s,data:D,engine:E});s=dispatch(s,tracker,{type:'order',handUid:a.uid,mode:'resupply'});assert.equal(tracker.finish(s).cards.find(c=>c.cardId===a.cardId).adaptPlays,1);
});
test('authorized baseline remains an archived result rather than a newly interpreted replay',()=>{
  const summary=JSON.parse(fs.readFileSync('docs/balance/sprint6-authorized-10000-summary.json'));assert.equal(summary.completed,10000);assert.equal(summary.errors,0);assert.equal(summary.cutoffs,0);assert.equal(summary.audit.allAssertionsPassed,true);
  assert.equal(summary.options.balanceProfile,'sprint6');assert.equal(summary.audit.firstSeat.rate,.5705);assert.match(summary.caveats.join(' '),/No follow-up balance simulation is authorized/);
});
