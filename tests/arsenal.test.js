'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const D=require('../data.js'),E=require('../engine.js'),A=require('../ai.js'),B=require('../balance.js'),Art=require('../art.js');
const Presets=require('../docs/arsenal/deck-presets.json');
const T=require('../telemetry.js');
let uid=80000;
function fixture(factions=['stonewall','bruiser']){
  const s=E.createGame({seed:7349,factions,config:{startingCommand:80,commandCap:80}});
  s.players.forEach(p=>p.hand=[]);return s;
}
function field(s,cardId,owner=0,territory=3,extras={}){
  const u={uid:'arsenal-'+uid++,cardId,owner,territory,damage:0,ready:true,deployedTurn:0,movedTurn:-1,...extras};s.units.push(u);return u;
}
function hand(s,cardId,owner=0){const c={uid:'arsenal-'+uid++,cardId};s.players[owner].hand.push(c);return c;}
function dispatch(s,a){const before=JSON.stringify(s),r=E.dispatch(s,a,{events:true});assert.equal(r.ok,true,r.error);assert.equal(JSON.stringify(s),before);E.assertInvariants(r.state);return r;}
function combat(s,attacker,defender){return dispatch(dispatch(s,{type:'attack',unitUid:attacker.uid,targetUid:defender.uid}).state,{type:'respond',pass:true});}

test('Arsenal adds four meaningful cards per faction without changing the original sixty or starter lists',()=>{
  const old=require('../docs/balance/sprint-3-baseline/source/data.js');
  assert.equal(Object.keys(D.CARDS).length,80);assert.deepEqual(D.DECKS,old.DECKS);
  for(const [id,c]of Object.entries(old.CARDS))assert.deepEqual(D.CARDS[id],c,id);
  for(const f of Object.keys(D.FACTIONS)){
    const added=Object.values(D.CARDS).filter(c=>c.faction===f&&c.set==='arsenal');assert.equal(added.length,4);
    assert.equal(new Set(added.map(c=>c.archetype)).size,2);
    for(const c of added){assert.ok(c.role&&c.flavorText&&c.rulesText);assert.ok(['rifle','heavy','specialist','commander'].includes(c.artRole));assert.ok(fs.existsSync(path.join(__dirname,'..',Art.get(c).src)));}
  }
});

test('all ten archetype presets are legal, different, and use the expansion cards',()=>{
  assert.equal(Presets.length,10);
  for(const p of Presets){
    const cards=Object.entries(p.counts).flatMap(([key,count])=>{
      const id=p.faction+'_'+key,c=D.CARDS[id];assert.ok(c,id);assert.equal(c.faction,p.faction);assert.ok(count>=1&&count<=(c.type==='leader'?2:4));return Array(count).fill(id);
    });
    assert.equal(cards.length,26,p.name);assert.ok(cards.some(id=>D.CARDS[id].set==='arsenal'));
    for(const q of Presets.filter(q=>q.faction===p.faction&&q!==p))assert.notDeepEqual(p.counts,q.counts);
  }
});

test('Arsenal avoids strict same-faction upgrades through explicit durability tradeoffs',()=>{
  const cards=B.dataFor('arsenal').CARDS;
  assert.equal(cards.stonewall_watchguard.presence,cards.stonewall_defender.presence);
  assert.ok(cards.stonewall_watchguard.health<cards.stonewall_defender.health);
  assert.equal(cards.stonewall_recovery_team.presence,cards.stonewall_medic.presence);
  assert.ok(cards.stonewall_recovery_team.health<cards.stonewall_medic.health);
  assert.equal(cards.bruiser_rupture_heavy.health,5);
  assert.equal(B.dataFor('baseline').CARDS.bruiser_rupture_heavy.health,7,'authoring baseline remains available');
});

test('every Arsenal permanent can deploy, and every new Order has an authoritative legal target',()=>{
  for(const c of Object.values(D.CARDS).filter(c=>c.set==='arsenal')){
    let s=fixture([c.faction,c.faction==='bruiser'?'stonewall':'bruiser']);
    const h=hand(s,c.id);
    let action;
    if(c.type!=='order')action={type:'deploy',handUid:h.uid,territory:2};
    else if(c.effect.kind==='damage'||c.effect.kind==='sabotage')action={type:'order',handUid:h.uid,targetUid:field(s,'stonewall_defender',1).uid};
    else action={type:'order',handUid:h.uid,targetUid:field(s,'nightwalker_silencer',0,3,{damage:2}).uid};
    const r=dispatch(s,action);assert.ok(r.events.length,c.id);
    for(const profile of ['baseline','faction','deck','random']){const a=A.chooseAction(r.state,{profile});assert.equal(E.validate(r.state,a),null,c.id+' '+profile);}
  }
});

test('Retaliate fires after normal combat, kills the surviving attacker and releases commitment',()=>{
  const s=fixture(),a=field(s,'bruiser_brawler',0,3,{damage:3}),d=field(s,'stonewall_watchguard',1);
  const r=combat(s,a,d),survivor=r.state.units.find(u=>u.uid===d.uid);
  assert.equal(survivor.damage,4,'damaged Brawler has Berserk during the exchange');
  assert.ok(!r.state.units.some(u=>u.uid===a.uid));assert.equal(r.state.stats.kills[1],1);
  assert.equal(E.presence(r.state,0).committed,0);
  const hit=r.events.find(e=>e.type==='damage'&&e.passive==='retaliate');assert.equal(hit.amount,1);assert.equal(hit.combat,false);assert.equal(hit.sourceUid,d.uid);
  const order=r.events.map(e=>e.type);assert.ok(order.lastIndexOf('death')>order.lastIndexOf('combat'));
});

test('Retaliate requires a surviving defender and never chains from another Retaliate hit',()=>{
  let s=fixture(),a=field(s,'stonewall_watchguard'),d=field(s,'stonewall_counterbattery',1);
  let r=combat(s,a,d);
  assert.equal(r.state.units.find(u=>u.uid===a.uid).damage,4);assert.equal(r.state.units.find(u=>u.uid===d.uid).damage,2);
  assert.equal(r.events.filter(e=>e.passive==='retaliate'&&e.type==='damage').length,1);
  s=fixture();a=field(s,'bruiser_heavy');d=field(s,'stonewall_watchguard',1,3,{damage:3});r=combat(s,a,d);
  assert.ok(!r.state.units.some(u=>u.uid===d.uid));assert.equal(r.events.filter(e=>e.passive==='retaliate').length,0);
});

test('Retaliate does not trigger from direct Orders, an early Ambush kill, or Retreat',()=>{
  let s=fixture(),d=field(s,'stonewall_watchguard',1),h=hand(s,'bruiser_bombard');
  let r=dispatch(s,{type:'order',handUid:h.uid,targetUid:d.uid});assert.equal(r.events.filter(e=>e.passive==='retaliate').length,0);
  s=fixture();let a=field(s,'bruiser_assault',0,3,{damage:2});d=field(s,'stonewall_watchguard',1);h=hand(s,'nightwalker_ambush',1);
  s=dispatch(s,{type:'attack',unitUid:a.uid,targetUid:d.uid}).state;s=dispatch(s,{type:'respond',handUid:h.uid}).state;r=dispatch(s,{type:'counter',pass:true});
  assert.ok(!r.state.units.some(u=>u.uid===a.uid));assert.equal(r.events.filter(e=>e.passive==='retaliate').length,0);
  s=fixture();a=field(s,'bruiser_heavy');d=field(s,'stonewall_watchguard',1);h=hand(s,'rogue_retreat',1);
  s=dispatch(s,{type:'attack',unitUid:a.uid,targetUid:d.uid}).state;s=dispatch(s,{type:'respond',handUid:h.uid}).state;r=dispatch(s,{type:'counter',pass:true});
  assert.equal(r.events.filter(e=>e.passive==='retaliate').length,0);assert.equal(r.state.units.find(u=>u.uid===a.uid).damage,0);
});

test('Sabotage suppresses Guard and Command without changing printed stats, incoming auras or commitment',()=>{
  let s=fixture(['nightwalker','stonewall']);const a=field(s,'nightwalker_blade'),guard=field(s,'stonewall_escort',1),support=field(s,'stonewall_commander',1),victim=field(s,'stonewall_rifles',1);
  const h=hand(s,'nightwalker_blackout'),before=E.presence(s,1).committed;
  let r=dispatch(s,{type:'order',handUid:h.uid,targetUid:guard.uid});s=r.state;
  assert.equal(E.hasTrait(s.units.find(u=>u.uid===guard.uid),'guard'),false);assert.equal(E.presence(s,1).committed,before);
  assert.equal(E.attackValue(s,s.units.find(u=>u.uid===guard.uid)),4,'external Command still applies');
  assert.ok(r.events.some(e=>e.type==='sabotage'&&e.targetUid===guard.uid));
  s=dispatch(s,{type:'attack',unitUid:a.uid,targetUid:victim.uid}).state;
  assert.match(E.validate(s,{type:'respond',guardUid:guard.uid}),/Guard/);
  assert.equal(E.hasTrait(s.units.find(u=>u.uid===support.uid),'command'),true);
});

test('Sabotage expires before the owner’s next start-turn Medic healing',()=>{
  let s=fixture(['nightwalker','stonewall']),medic=field(s,'stonewall_medic',1),wounded=field(s,'stonewall_rifles',1,3,{damage:2}),h=hand(s,'nightwalker_blackout');
  s=dispatch(s,{type:'order',handUid:h.uid,targetUid:medic.uid}).state;
  assert.equal(E.hasTrait(s.units.find(u=>u.uid===medic.uid),'medic'),false);
  const r=dispatch(s,{type:'endTurn'});assert.equal(r.state.units.find(u=>u.uid===medic.uid).suppressed,undefined);assert.equal(r.state.units.find(u=>u.uid===wounded.uid).damage,1);
  assert.ok(r.events.findIndex(e=>e.type==='sabotageEnd')<r.events.findIndex(e=>e.type==='heal'));
});

test('Sabotage rejects allies, traitless units and redundant suppression',()=>{
  let s=fixture(['nightwalker','stonewall']),h=hand(s,'nightwalker_blackout'),ally=field(s,'nightwalker_scout'),plain=field(s,'bruiser_heavy',1),guard=field(s,'stonewall_defender',1);
  assert.match(E.validate(s,{type:'order',handUid:h.uid,targetUid:ally.uid}),/enemy/);assert.match(E.validate(s,{type:'order',handUid:h.uid,targetUid:plain.uid}),/no printed traits/);
  s=dispatch(s,{type:'order',handUid:h.uid,targetUid:guard.uid}).state;h=hand(s,'nightwalker_blackout');assert.match(E.validate(s,{type:'order',handUid:h.uid,targetUid:guard.uid}),/already sabotaged/);
});

test('Scavenge draws once per player per global turn and multiple sources never stack',()=>{
  let s=fixture(['bruiser','rogue']);field(s,'rogue_broker',1);field(s,'rogue_bulwark',1);
  const victims=[field(s,'rogue_scrapper',1,3,{damage:3}),field(s,'rogue_outrider',1,3,{damage:3})],h1=hand(s,'bruiser_bombard'),h2=hand(s,'bruiser_bombard');
  let r=dispatch(s,{type:'order',handUid:h1.uid,targetUid:victims[0].uid});s=r.state;assert.equal(s.players[1].hand.length,1);assert.equal(r.events.filter(e=>e.type==='draw').length,1);
  r=dispatch(s,{type:'order',handUid:h2.uid,targetUid:victims[1].uid});s=r.state;assert.equal(s.players[1].hand.length,1);assert.equal(r.events.filter(e=>e.type==='draw').length,0);
  s=dispatch(s,{type:'endTurn'}).state;s=dispatch(s,{type:'endTurn'}).state;
  const victim=field(s,'rogue_skirmisher',1,3,{damage:4}),h=hand(s,'bruiser_bombard');const before=s.players[1].hand.length;r=dispatch(s,{type:'order',handUid:h.uid,targetUid:victim.uid});assert.equal(r.state.players[1].hand.length,before+1);
});

test('Scavenge requires a surviving nearby unsuppressed source, including simultaneous combat deaths',()=>{
  let s=fixture(['bruiser','rogue']),a=field(s,'bruiser_heavy',0,3,{damage:5}),source=field(s,'rogue_broker',1,3,{damage:1});
  let r=combat(s,a,source);assert.equal(r.state.units.length,0);assert.equal(r.state.players[1].hand.length,0,'a dead source cannot scavenge itself or the enemy');
  s=fixture(['bruiser','rogue']);field(s,'rogue_broker',1,2);source=field(s,'rogue_bulwark',1,3,{suppressed:true});const victim=field(s,'rogue_scrapper',1,3,{damage:3}),h=hand(s,'bruiser_bombard');
  r=dispatch(s,{type:'order',handUid:h.uid,targetUid:victim.uid});assert.equal(r.state.players[1].hand.length,0);
});

test('Scavenge uses ordinary discard recycling and attributes the triggered draw',()=>{
  let s=fixture(['bruiser','rogue']);const source=field(s,'rogue_broker',1),victim=field(s,'rogue_scrapper',1,3,{damage:3}),h=hand(s,'bruiser_bombard');s.players[1].deck=[];s.players[1].discard=[];
  const r=dispatch(s,{type:'order',handUid:h.uid,targetUid:victim.uid});assert.equal(r.state.players[1].hand[0].cardId,victim.cardId);
  const trigger=r.events.find(e=>e.type==='passive'&&e.trait==='scavenge');assert.equal(trigger.uid,source.uid);assert.equal(trigger.amount,1);assert.equal(trigger.causeUid,victim.uid);
});

test('deck policy is deterministic, differs by own archetype priority, and ignores hidden identities and order',()=>{
  const s=fixture(['bruiser','stonewall']),h=hand(s,'bruiser_shock_runner');s.players[0].deckMeta={archetype:'shock-assault'};
  const a={type:'deploy',handUid:h.uid,territory:2},faction=A.explainAction(s,{profile:'faction',legalActions:[a,{type:'endTurn'}]}),deck=A.explainAction(s,{profile:'deck',legalActions:[a,{type:'endTurn'}]});
  assert.equal(deck.score,faction.score+2);assert.match(deck.reason,/Shock Assault/);
  const before=JSON.stringify(s),hidden=JSON.parse(before);hidden.players[1].deckMeta={archetype:'assassination'};hidden.players[1].hand=[{uid:'hidden',cardId:'nightwalker_strike'}];hidden.players[0].deck.reverse();hidden.players[1].deck.reverse();hidden.rngState=10;
  assert.deepEqual(A.explainAction(s,{profile:'deck'}),A.explainAction(hidden,{profile:'deck'}));assert.equal(JSON.stringify(s),before);
  const runtime=B.createRuntime('arsenal');assert.ok(runtime.ai.getProfiles().some(p=>p.id==='deck'));
});

test('AI values a visible Sabotage follow-up and respects suppressed public Guard coverage',()=>{
  const s=fixture(['nightwalker','stonewall']),a=field(s,'nightwalker_silencer'),target=field(s,'stonewall_counterbattery',1),h=hand(s,'nightwalker_blackout');s.players[0].deckMeta={archetype:'sabotage'};
  const action={type:'order',handUid:h.uid,targetUid:target.uid},x=A.explainAction(s,{profile:'deck',legalActions:[action,{type:'attack',unitUid:a.uid,targetUid:target.uid},{type:'endTurn'}]});
  assert.deepEqual(x.action,action);assert.ok(x.score>0);assert.match(x.reason,/Sabotage/);
  const r=dispatch(s,action);assert.equal(E.validate(r.state,A.chooseAction(r.state,{profile:'deck'})),null);
});

test('keyword telemetry credits actual Retaliate damage and Scavenge draws to their source',()=>{
  let s=fixture(),a=field(s,'bruiser_brawler',0,3,{damage:3}),d=field(s,'stonewall_watchguard',1);
  let t=T.createTracker({state:s,trace:true});
  function step(action){const r=dispatch(s,action);t.record(s,r.state,action,{events:r.events});s=r.state;}
  step({type:'attack',unitUid:a.uid,targetUid:d.uid});step({type:'respond',pass:true});
  let c=t.finish(s).cards.find(c=>c.cardId===d.cardId&&c.player===1);assert.equal(c.retaliateTriggers,1);assert.equal(c.retaliateEffectiveDamage,1);assert.equal(c.kills,1);
  s=fixture(['bruiser','rogue']);d=field(s,'rogue_broker',1);const victim=field(s,'rogue_scrapper',1,3,{damage:3}),h=hand(s,'bruiser_bombard');t=T.createTracker({state:s});
  step({type:'order',handUid:h.uid,targetUid:victim.uid});c=t.finish(s).cards.find(c=>c.cardId===d.cardId&&c.player===1);assert.equal(c.scavengeTriggers,1);assert.equal(c.scavengeCardsDrawn,1);assert.equal(c.kills,0);
});

test('Sabotage telemetry counts applications and actual combat windows without inventing damage efficiency',()=>{
  let s=fixture(['nightwalker','stonewall']),a=field(s,'nightwalker_silencer'),d=field(s,'stonewall_counterbattery',1),h=hand(s,'nightwalker_blackout');
  const t=T.createTracker({state:s,trace:true});
  function step(action){const r=dispatch(s,action);t.record(s,r.state,action,{events:r.events});s=r.state;}
  step({type:'order',handUid:h.uid,targetUid:d.uid});step({type:'attack',unitUid:a.uid,targetUid:d.uid});step({type:'respond',pass:true});
  const c=t.finish(s).cards.find(c=>c.cardId===h.cardId&&c.player===0);assert.equal(c.sabotageApplications,1);assert.equal(c.traitsSuppressed,2);assert.equal(c.sabotageCombatWindows,1);assert.equal(c.damageDealt,0);assert.equal(c.effectiveDamageDealt,0);
});

test('AI never burns Sabotage on a Medic that restores before healing or without an attack action left',()=>{
  const s=fixture(['nightwalker','stonewall']),medic=field(s,'stonewall_medic',1),wound=field(s,'stonewall_rifles',1,3,{damage:3}),h=hand(s,'nightwalker_blackout');s.players[0].deckMeta={archetype:'sabotage'};
  const action={type:'order',handUid:h.uid,targetUid:medic.uid};
  assert.deepEqual(A.chooseAction(s,{profile:'deck',legalActions:[action,{type:'endTurn'}]}),{type:'endTurn'});
  field(s,'nightwalker_silencer');s.actionsLeft=1;
  assert.deepEqual(A.chooseAction(s,{profile:'deck',legalActions:[action,{type:'endTurn'}]}),{type:'endTurn'});
});
