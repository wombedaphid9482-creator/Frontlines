'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),B=require('../balance'),AI=require('../ai');
const R=B.createRuntime('sprint11'),D=R.data,E=R.engine,A=R.ai,clone=value=>JSON.parse(JSON.stringify(value));
let serial=111000;
function fixture(faction){const s=E.createGame({seed:1104,factions:[faction,'bruiser'],config:{startingCommand:80,commandCap:80,drawCount:0}});s.players.forEach(p=>{p.hand=[];p.commander.used=true;});return s;}
function unit(s,cardId,owner=0,territory=3,extra={}){const u={uid:'s11-ai-'+serial++,cardId,owner,territory,damage:0,ready:true,deployedTurn:0,movedTurn:-1,...extra};s.units.push(u);return u;}
function hand(s,cardId){const h={uid:'s11-ai-'+serial++,cardId};s.players[0].hand.push(h);return h;}
function status(s,u,kind,amount=1){s.nextEffectId++;s.effects.push({id:'effect'+s.nextEffectId,kind,targetUid:u.uid,territory:u.territory,owner:u.owner,sourcePlayer:u.owner,sourceCardId:u.cardId,sourceUid:u.uid,amount,startedTurn:s.turn,stack:'refresh',consume:'directEnemyHit',expires:{timing:kind==='suppression'?'windowEnd':'windowStart',player:u.owner,afterTurn:s.turn},metadata:{}});}
function conceal(s){const hidden=clone(s),actor=E.getActor(hidden);for(const p of hidden.players)Object.defineProperty(p,'deck',{get(){throw Error('AI read concealed deck order');}});Object.defineProperty(hidden.players[1-actor],'hand',{get(){throw Error('AI read concealed enemy hand');}});Object.defineProperty(hidden.players[1-actor],'deckMeta',{get(){throw Error('AI read concealed enemy deck identity');}});Object.defineProperty(hidden,'rngState',{get(){throw Error('AI read concealed random stream');}});return hidden;}
function chooseAmong(s,predicate,options={profile:'deck'}){const legal=E.legalActions(s).filter(a=>a.type==='endTurn'||predicate(a));const before=JSON.stringify(s),decision=A.explainAction(s,{...options,legalActions:legal});assert.equal(E.validate(s,decision.action),null);assert.ok(Number.isFinite(decision.score));assert.deepEqual(A.explainAction(conceal(s),{...options,legalActions:legal}),decision);assert.equal(JSON.stringify(s),before);return decision;}

test('Tactical AI version is explicit while Sprint 10 policies retain exact decisions',()=>{
  assert.equal(A.VERSION,'frontlines-ai-sprint11-v1');const old=B.createRuntime('sprint10');
  const frozen=require('../docs/balance/sprint11-v1.0.3-baseline/source/ai').forRules(old.data,old.engine);
  for(const faction of Object.keys(D.FACTIONS)){let s=old.engine.createGame({seed:1103,factions:[faction,'bruiser']});for(let step=0;step<6;step++){for(const opts of [{profile:'baseline'},{profile:'deck'},{profile:'deck',difficulty:'normal'},{profile:'deck',difficulty:'expert'}])assert.deepEqual(old.ai.explainAction(s,opts),frozen.explainAction(s,opts));s=old.engine.dispatch(s,old.ai.chooseAction(s,{profile:'deck'})).state;}}
});

test('Stonewall protects the valuable threatened ally instead of a healthy low-impact body',()=>{
  const s=fixture('stonewall'),engineer=unit(s,'stonewall_trench_engineer'),key=unit(s,'stonewall_commander',0,3,{damage:4}),small=unit(s,'stonewall_trench_engineer',0,3,{damage:0});unit(s,'bruiser_heavy',1);
  const decision=chooseAmong(s,a=>a.type==='ability'&&a.unitUid===engineer.uid);assert.equal(decision.action.type,'ability');assert.equal(decision.action.targetUid,key.uid);assert.notEqual(decision.action.targetUid,small.uid);assert.match(decision.reason,/Protect/);
});

test('Bruiser Grenade favors a capped cluster over a lone durable target',()=>{
  const s=fixture('bruiser'),grenade=hand(s,'bruiser_frag_out');unit(s,'bruiser_assault',1,3,{damage:D.CARDS.bruiser_assault.health-2});unit(s,'bruiser_brawler',1,3,{damage:D.CARDS.bruiser_brawler.health-2});unit(s,'bruiser_heavy',1,4);
  const decision=chooseAmong(s,a=>a.handUid===grenade.uid);assert.equal(decision.action.handUid,grenade.uid);assert.equal(decision.action.territory,3);assert.match(decision.reason,/cluster/);
});

test('Breach attack beats an ordinary attack into visible Cover',()=>{
  const s=fixture('bruiser'),breacher=unit(s,'bruiser_demolition_squad'),plain=unit(s,'bruiser_assault'),target=unit(s,'bruiser_assault',1,3,{damage:D.CARDS.bruiser_assault.health-3});status(s,target,'cover',2);
  const decision=chooseAmong(s,a=>a.type==='attack'&&a.targetUid===target.uid);assert.equal(decision.action.unitUid,breacher.uid);assert.notEqual(decision.action.unitUid,plain.uid);const preview=E.previewCombat(s,breacher.uid,target.uid);assert.ok(preview.affected.find(hit=>hit.uid===target.uid).killed);
});

test('Syndicate creates a prepared opening only while a ready payoff and command remain',()=>{
  const s=fixture('syndicate'),spotter=unit(s,'syndicate_spotter_cell'),payoff=unit(s,'syndicate_security'),target=unit(s,'bruiser_brawler',1,3,{damage:D.CARDS.bruiser_brawler.health-3});status(s,target,'cover',2);status(s,target,'dodge',1);s.actionsLeft=2;
  const decision=chooseAmong(s,a=>a.type==='ability'&&a.unitUid===spotter.uid);assert.equal(decision.action.type,'ability');assert.equal(decision.action.targetUid,target.uid);
  const result=E.dispatch(s,decision.action);assert.equal(result.ok,true);const followup=chooseAmong(result.state,a=>a.type==='attack'&&a.unitUid===payoff.uid);assert.equal(followup.action.targetUid,target.uid);
  s.actionsLeft=1;assert.equal(chooseAmong(s,a=>a.type==='ability'&&a.unitUid===spotter.uid).action.type,'endTurn');
});

test('Nightwalker Dodge protects a threatened key piece and rejects a wasted duplicate',()=>{
  const s=fixture('nightwalker'),key=unit(s,'nightwalker_marksman',0,3,{damage:D.CARDS.nightwalker_marksman.health-1}),safe=unit(s,'nightwalker_blade',0,2),vanish=hand(s,'nightwalker_vanish');unit(s,'bruiser_heavy',1);
  const decision=chooseAmong(s,a=>a.handUid===vanish.uid);assert.equal(decision.action.handUid,vanish.uid);assert.equal(decision.action.targetUid,key.uid);assert.notEqual(decision.action.targetUid,safe.uid);
  status(s,key,'dodge');assert.equal(chooseAmong(s,a=>a.handUid===vanish.uid).action.type,'endTurn');
});

test('Rogue sacrifices a real lesser piece for a worthwhile Blast and preserves an expensive healthy piece for a poor trade',()=>{
  const s=fixture('rogue'),cheap=unit(s,'rogue_improvised_mine'),large=unit(s,'rogue_commander'),bomb=hand(s,'rogue_salvage_charge');unit(s,'bruiser_assault',1,3,{damage:D.CARDS.bruiser_assault.health-2});unit(s,'bruiser_brawler',1,3,{damage:D.CARDS.bruiser_brawler.health-2});
  const decision=chooseAmong(s,a=>a.handUid===bomb.uid);assert.equal(decision.action.handUid,bomb.uid);assert.equal(decision.action.sacrificeUid,cheap.uid);assert.notEqual(decision.action.sacrificeUid,large.uid);assert.match(decision.reason,/no casualty-draw credit/);
  const bad=fixture('rogue'),costly=unit(bad,'rogue_commander'),order=hand(bad,'rogue_salvage_charge');unit(bad,'bruiser_heavy',1);assert.equal(chooseAmong(bad,a=>a.handUid===order.uid&&a.sacrificeUid===costly.uid).action.type,'endTurn');
});

test('Suppression chooses a dangerous threat while visible lethal Overwatch discourages entry',()=>{
  const s=fixture('syndicate'),source=unit(s,'syndicate_suppression_team'),high=unit(s,'bruiser_heavy',1),low=unit(s,'bruiser_assault',1);const suppress=chooseAmong(s,a=>a.type==='ability'&&a.unitUid===source.uid);assert.equal(suppress.action.targetUid,high.uid);assert.notEqual(suppress.action.targetUid,low.uid);
  const trap=fixture('stonewall'),entrant=unit(trap,'stonewall_medic',0,2,{damage:D.CARDS.stonewall_medic.health-1}),watcher=unit(trap,'bruiser_suppressor_heavy',1);status(trap,watcher,'overwatch',2);const entry=chooseAmong(trap,a=>a.type==='move'&&a.unitUid===entrant.uid&&a.territory===3);assert.equal(entry.action.type,'endTurn');
});

test('Smoke protects against a visible lethal hit and answers prepared Overwatch while a useless refresh waits',()=>{
  const s=fixture('nightwalker'),ally=unit(s,'nightwalker_marksman',0,3,{damage:0}),enemy=unit(s,'bruiser_assault',1),smoke=hand(s,'nightwalker_smoke_screen');status(s,enemy,'overwatch',2);
  const useful=chooseAmong(s,a=>a.handUid===smoke.uid);assert.equal(useful.action.handUid,smoke.uid);assert.equal(useful.action.territory,3);assert.match(useful.reason,/Smoke/);
  const next=E.dispatch(s,useful.action);assert.equal(next.ok,true);const replacement=hand(next.state,'nightwalker_smoke_screen');next.state.effects=next.state.effects.filter(e=>e.kind!=='overwatch');assert.equal(chooseAmong(next.state,a=>a.handUid===replacement.uid).action.type,'endTurn');assert.ok(next.state.units.some(u=>u.uid===ally.uid));
});

test('Tactical response forecasts retain visible protection without reading hidden reactions',()=>{
  const s=fixture('stonewall'),attacker=unit(s,'stonewall_rifles',0,3,{ready:false}),defender=unit(s,'bruiser_heavy',1,3,{damage:2});status(s,defender,'cover',2);status(s,defender,'dodge',1);
  s.response={stage:'response',attackerUid:attacker.uid,defenderUid:defender.uid,originalDefenderUid:defender.uid,responder:1};s.players[1].hand.push({uid:'response-'+serial++,cardId:'bruiser_ambush'});
  const before=JSON.stringify(s);for(const difficulty of ['easy','normal','hard','expert']){const options={profile:'deck',difficulty},decision=A.explainAction(s,options);assert.equal(E.validate(s,decision.action),null);assert.ok(Number.isFinite(decision.score));assert.deepEqual(A.explainAction(conceal(s),options),decision);assert.equal(JSON.stringify(s),before);}
});

test('Ambush wounds use canonical protected combat after updating the public attacker snapshot',()=>{
  const s=fixture('stonewall'),attacker=unit(s,'stonewall_rifles',0,3,{ready:false}),defender=unit(s,'bruiser_heavy',1,3,{damage:2});status(s,defender,'cover',2);status(s,defender,'dodge');
  s.response={stage:'response',attackerUid:attacker.uid,defenderUid:defender.uid,originalDefenderUid:defender.uid,responder:1};s.players[1].hand.push({uid:'ambush-'+serial++,cardId:'bruiser_ambush'});
  const observed=[],watched=AI.forRules(D,{...E,previewCombat(position,attackerUid,defenderUid,shield){const forecast=E.previewCombat(position,attackerUid,defenderUid,shield);observed.push({damage:position.units.find(u=>u.uid===attacker.uid).damage,defenderDamage:forecast.damageToDefender});return forecast;}});
  const before=JSON.stringify(s),options={profile:'deck',difficulty:'normal'},decision=watched.explainAction(s,options);assert.equal(E.validate(s,decision.action),null);assert.ok(Number.isFinite(decision.score));assert.ok(observed.some(hit=>hit.damage===D.CARDS.bruiser_ambush.effect.amount&&hit.defenderDamage===0));assert.equal(JSON.stringify(s),before);assert.deepEqual(watched.explainAction(conceal(s),options),decision);
});

test('Commanders and legacy damage Orders respect visible Dodge and Cover before claiming a lethal payoff',()=>{
  const blood=fixture('bruiser'),target=unit(blood,'bruiser_assault',1,3,{damage:D.CARDS.bruiser_assault.health-3});blood.players[0].commander.id='commander_bruiser_bloodhound';blood.players[0].commander.used=false;blood.actionsLeft=1;status(blood,target,'dodge');assert.equal(chooseAmong(blood,a=>a.type==='commander').action.type,'endTurn');
  const coordinated=fixture('syndicate'),enemy=unit(coordinated,'bruiser_assault',1,3,{damage:D.CARDS.bruiser_assault.health-2});coordinated.players[0].commander.id='commander_syndicate_coordinator';coordinated.players[0].commander.used=false;coordinated.actionsLeft=1;status(coordinated,enemy,'dodge');assert.equal(chooseAmong(coordinated,a=>a.type==='commander').action.type,'commander');status(coordinated,enemy,'cover',2);assert.equal(chooseAmong(coordinated,a=>a.type==='commander').action.type,'endTurn');
  const removal=fixture('nightwalker'),foe=unit(removal,'bruiser_assault',1,3,{damage:D.CARDS.bruiser_assault.health-3}),strike=hand(removal,'nightwalker_strike');removal.actionsLeft=1;status(removal,foe,'dodge');assert.equal(chooseAmong(removal,a=>a.handUid===strike.uid).action.type,'endTurn');removal.effects=[];assert.equal(chooseAmong(removal,a=>a.handUid===strike.uid).action.handUid,strike.uid);
});

test('String-valued Tactical showcase archetype parents retain their legacy strategic priorities',()=>{
  const s=fixture('stonewall');s.players[0].deckMeta.archetype='prepared-ground';const defender=hand(s,'stonewall_defender'),legal=E.legalActions(s).filter(a=>a.type==='endTurn'||a.handUid===defender.uid&&a.territory===2);
  const decision=A.explainAction(s,{profile:'deck',legalActions:legal});assert.equal(decision.action.handUid,defender.uid);assert.match(decision.reason,/Bastion/);assert.deepEqual(A.explainAction(conceal(s),{profile:'deck',legalActions:legal}),decision);
});

test('All Commander forecasts remain public and legal with tactical protection and relocation hazards',()=>{
  for(const commander of E.commanders.list()){const s=fixture(commander.faction);s.players[0].commander.id=commander.id;s.players[0].commander.used=false;s.players[0].spent=1;const base=Object.values(D.CARDS).find(c=>c.faction===commander.faction&&c.type==='unit');unit(s,base.id,0,2,{damage:1,ready:false});const enemy=unit(s,'bruiser_heavy',1);status(s,enemy,'cover',2);status(s,enemy,'dodge');s.players[0].discard.push(base.id);const before=JSON.stringify(s);for(const difficulty of ['easy','normal','hard','expert']){const options={profile:'deck',difficulty},decision=A.explainAction(s,options);assert.equal(E.validate(s,decision.action),null,commander.id);assert.ok(Number.isFinite(decision.score));assert.deepEqual(A.explainAction(conceal(s),options),decision);assert.equal(JSON.stringify(s),before);}}
  const trap=fixture('rogue');trap.players[0].commander.id='commander_rogue_drifter';trap.players[0].commander.used=false;const mover=unit(trap,'rogue_outrider',0,2,{damage:D.CARDS.rogue_outrider.health-1}),watch=unit(trap,'bruiser_heavy',1);status(trap,watch,'overwatch',2);const chosen=chooseAmong(trap,a=>a.type==='commander'&&a.targetUid===mover.uid&&a.territory===3);assert.equal(chosen.action.type,'endTurn');
});

test('Every new card and ability has finite, legal, deterministic public decisions at all difficulties',()=>{
  const additions=Object.values(D.CARDS).filter(c=>c.set==='tactical-011');assert.equal(additions.length,40);
  for(const c of additions){const s=fixture(c.faction),base=Object.values(D.CARDS).find(d=>d.faction===c.faction&&d.type==='unit');unit(s,base.id,0,3,{damage:1});unit(s,base.id,0,3,{ready:false});unit(s,'bruiser_heavy',1,3,{damage:2});unit(s,'bruiser_assault',1);hand(s,c.id);if(c.type!=='order')unit(s,c.id);
    const before=JSON.stringify(s);for(const difficulty of ['easy','learning','normal','hard','expert']){const options={profile:'deck',difficulty},decision=A.explainAction(s,options);assert.equal(E.validate(s,decision.action),null,c.id+' '+difficulty);assert.ok(Number.isFinite(decision.score));assert.deepEqual(A.explainAction(conceal(s),options),decision);assert.equal(JSON.stringify(s),before);assert.ok(decision.planning.projected<=(difficulty==='expert'?35:difficulty==='hard'?5:0));}}
});
