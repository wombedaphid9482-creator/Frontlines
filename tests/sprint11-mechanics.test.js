'use strict';
// Public-action deterministic board fixtures only; no balance campaign.
const test=require('node:test'),assert=require('node:assert/strict');
const B=require('../balance'),Decks=require('../decks'),R=B.createRuntime('sprint11'),E=R.engine,D=R.data,L=Decks.forData(D);
const TacticalArsenal=require('../tactical-arsenal');
const clone=x=>JSON.parse(JSON.stringify(x));
function game(factions=['stonewall','bruiser'],config={},commanders){
  const decks=factions.map((f,i)=>({...L.starters().find(d=>d.faction===f),...(commanders?{commanderId:commanders[i]}:{})}));
  const s=E.createGame({seed:1104,factions,decks,config:{startingCommand:200,commandCap:250,captureThreshold:1000,...config}});s.players.forEach(p=>{p.hand=[];});return s;
}
function field(s,id,owner=0,territory=3,extra={}){const u={uid:'fixture'+s.nextUid++,cardId:id,owner,territory,damage:0,ready:true,deployedTurn:0,movedTurn:-1,...extra};s.units.push(u);return u;}
function hand(s,id,owner=0){const h={uid:'fixture'+s.nextUid++,cardId:id};s.players[owner].hand.push(h);return h;}
function act(s,a){const before=JSON.stringify(s),r=E.dispatch(s,a,{events:true});assert.equal(r.ok,true,r.error);assert.equal(JSON.stringify(s),before,'dispatch remains immutable');E.assertInvariants(r.state);return r;}
function cast(s,id,args={},player=s.attacker){const h=hand(s,id,player);return act(s,{type:'order',handUid:h.uid,...args});}
function combat(s,a,b){const response=act(s,{type:'attack',unitUid:a.uid,targetUid:b.uid});return act(response.state,{type:'respond',pass:true});}
function unit(s,u){return s.units.find(x=>x.uid===(typeof u==='string'?u:u.uid));}
function status(s,u,kind){return E.statusesFor(s,typeof u==='string'?u:u.uid).find(x=>x.kind===kind);}
function next(s){return act(s,{type:'endTurn'}).state;}
function rejected(s,a,pattern){const before=JSON.stringify(s),r=E.dispatch(s,a,{events:true});assert.equal(r.ok,false);assert.strictEqual(r.state,s);assert.equal(JSON.stringify(s),before);if(pattern)assert.match(r.error,pattern);return r;}
function ability(s,u,args={}){return act(s,{type:'ability',unitUid:u.uid,abilityId:D.CARDS[u.cardId].tactical.ability.id,...args});}
function casualtyRewards(r){return r.events.filter(e=>e.type==='passive'&&e.trait==='scavenge'||e.type==='commanderPassive'&&e.commanderId==='commander_rogue_scavenger');}

test('Cover applies as a serializable nonstacking charge and consumes on an initiated direct attack',()=>{
  let s=game();const target=field(s,'stonewall_rifles'),enemy=field(s,'bruiser_heavy',1);
  s=cast(s,'stonewall_dig_in',{targetUid:target.uid}).state;const first=status(s,target,'cover');assert.equal(first.amount,2);assert.equal(first.sourceCardId,'stonewall_dig_in');assert.equal(first.owner,0);assert.equal(first.targetUid,target.uid);assert.equal(first.expires.timing,'windowStart');assert.ok(first.consume);assert.ok(first.id);
  s=cast(s,'stonewall_dig_in',{targetUid:target.uid}).state;assert.equal(E.statusesFor(s,target.uid).filter(f=>f.kind==='cover').length,1);assert.equal(status(s,target,'cover').id,first.id);assert.equal(status(s,target,'cover').amount,2);
  s.attacker=1;const naked=clone(s);naked.effects=[];const expected=E.previewCombat(naked,enemy,target).incoming-2;const r=combat(s,enemy,target);assert.equal(unit(r.state,target).damage,Math.max(0,expected));assert.equal(status(r.state,target,'cover'),undefined);assert.ok(r.events.some(e=>e.type==='statusConsumed'&&e.status==='cover'));
  assert.deepEqual(JSON.parse(JSON.stringify(r.state)),r.state);
});
test('Cover expires at owner next window and does not protect return fire',()=>{
  let s=game();const own=field(s,'stonewall_heavy'),enemy=field(s,'bruiser_heavy',1);
  s=cast(s,'stonewall_dig_in',{targetUid:own.uid}).state;const r=combat(s,own,enemy);assert.equal(unit(r.state,own).damage,E.combatDamage(s,own,E.attackValue(s,enemy)));assert.ok(status(r.state,own,'cover'));
  s=next(r.state);assert.ok(status(s,own,'cover'));s=next(s);assert.equal(status(s,own,'cover'),undefined);
});
test('Breach removes Cover and grants its Asset bonus only against Assets',()=>{
  let s=game(['stonewall','bruiser']);const target=field(s,'stonewall_hardpoint'),attacker=field(s,'bruiser_demolition_squad',1);
  s=cast(s,'stonewall_dig_in',{targetUid:target.uid}).state;s.attacker=1;
  const before=E.previewCombat(s,attacker,target),r=combat(s,attacker,target);assert.equal(before.incoming,D.CARDS.bruiser_demolition_squad.attack+1);assert.equal(unit(r.state,target).damage,4);assert.equal(status(r.state,target,'cover'),undefined);assert.ok(r.events.some(e=>e.type==='statusBypassed'&&e.status==='cover'));
  s=game();const ordinary=field(s,'stonewall_rifles'),a=field(s,'bruiser_demolition_squad',1);s=cast(s,'stonewall_dig_in',{targetUid:ordinary.uid}).state;s.attacker=1;assert.equal(E.previewCombat(s,a,ordinary).incoming,3);
});
test('No Shelter has an explicit Asset-only bonus and Dodge is a distinct counter',()=>{
  let s=game(['nightwalker','bruiser']);const target=field(s,'nightwalker_false_contact');s=cast(s,'nightwalker_vanish',{targetUid:field(s,'nightwalker_blade').uid}).state;
  // False Contact prepares its own Dodge through an actual legal deployment.
  const card=hand(s,'nightwalker_false_contact');s=act(s,{type:'deploy',handUid:card.uid,territory:2}).state;const decoy=unit(s,card.uid);s.attacker=1;
  const r=cast(s,'bruiser_no_shelter',{targetUid:decoy.uid});assert.ok(unit(r.state,decoy));assert.equal(unit(r.state,decoy).damage,0);assert.equal(status(r.state,decoy,'dodge'),undefined);
  s=game();const asset=field(s,'stonewall_hardpoint'),normal=field(s,'stonewall_rifles');s.attacker=1;let hit=cast(s,'bruiser_no_shelter',{targetUid:asset.uid});assert.equal(unit(hit.state,asset).damage,3);hit=cast(hit.state,'bruiser_no_shelter',{targetUid:normal.uid});assert.equal(unit(hit.state,normal).damage,1);assert.ok(target);
});
test('Blast targets a territory, caps at two numeric UID enemies and leaves allies and defensive charges intact',()=>{
  let s=game(['nightwalker','bruiser']);const first=field(s,'nightwalker_stalker'),second=field(s,'nightwalker_blade'),third=field(s,'nightwalker_marksman'),friend=field(s,'bruiser_heavy',1);
  s.units.reverse();s=cast(s,'nightwalker_vanish',{targetUid:first.uid}).state;s.attacker=1;
  const h=hand(s,'bruiser_frag_out',1),action={type:'order',handUid:h.uid,territory:3},preview=E.previewAction(s,action),r=act(s,action);
  assert.deepEqual(preview.affected.map(x=>x.uid),[first.uid,second.uid]);assert.equal(unit(r.state,first).damage,2);assert.equal(unit(r.state,second).damage,2);assert.equal(unit(r.state,third).damage,0);assert.equal(unit(r.state,friend).damage,0);assert.ok(status(r.state,first,'dodge'));
  assert.equal(r.events.find(e=>e.type==='blast').targets.length,2);assert.equal(E.validate(r.state,{type:'order',handUid:hand(r.state,'bruiser_frag_out',1).uid,territory:1}), 'This territory contains no enemy targets.');
});
test('Blast bypasses Cover without consuming it and simultaneous deaths resolve with explicit enemy-effect cause',()=>{
  let s=game();const a=field(s,'stonewall_rifles',0,3,{damage:D.CARDS.stonewall_rifles.health-1}),b=field(s,'stonewall_watchguard',0,3,{damage:D.CARDS.stonewall_watchguard.health-1});s=cast(s,'stonewall_dig_in',{targetUid:a.uid}).state;s.attacker=1;
  const r=cast(s,'bruiser_frag_out',{territory:3});assert.equal(unit(r.state,a),undefined);assert.equal(unit(r.state,b),undefined);const deaths=r.events.filter(e=>e.type==='death');assert.equal(deaths.length,2);assert.ok(deaths.every(e=>e.cause==='enemyEffect'));assert.equal(r.events.filter(e=>e.type==='statusConsumed'&&e.status==='cover').length,0);
});
test('Coordinated Barrage pays off Mark/Exposed once and its deterministic preview matches damage',()=>{
  let s=game(['syndicate','stonewall']);const enemy=field(s,'stonewall_heavy',1),other=field(s,'stonewall_defender',1);
  s=cast(s,'syndicate_target_package',{targetUid:enemy.uid}).state;const h=hand(s,'syndicate_coordinated_barrage'),action={type:'order',handUid:h.uid,territory:3},p=E.previewAction(s,action),r=act(s,action);
  assert.equal(unit(r.state,enemy).damage,3,'Prepared Blast is 1+2, not Mark+Exposed direct bonuses');assert.equal(unit(r.state,other).damage,1);assert.equal(p.affected.find(x=>x.uid===enemy.uid).damage,3);assert.ok(status(r.state,enemy,'exposed'),'Blast does not consume the direct-hit vulnerability');
});
test('Dodge is a deterministic one-hit charge, nonstacking, and expires at the next owner start',()=>{
  let s=game(['nightwalker','bruiser']);const target=field(s,'nightwalker_stalker'),enemy=field(s,'bruiser_heavy',1);
  s=cast(s,'nightwalker_vanish',{targetUid:target.uid}).state;s=cast(s,'nightwalker_vanish',{targetUid:target.uid}).state;assert.equal(E.statusesFor(s,target.uid).filter(f=>f.kind==='dodge').length,1);
  s.attacker=1;const a=clone(s),b=clone(s),r=combat(a,enemy,target),again=combat(b,enemy,target);assert.deepEqual(r,again);assert.equal(unit(r.state,target).damage,0);assert.equal(status(r.state,target,'dodge'),undefined);
  s=game(['nightwalker','bruiser']);const u=field(s,'nightwalker_stalker');s=cast(s,'nightwalker_vanish',{targetUid:u.uid}).state;s=next(s);assert.ok(status(s,u,'dodge'));s=next(s);assert.equal(status(s,u,'dodge'),undefined);
});
test('Mark and Precision counter Dodge and consume the charge without random rolls',()=>{
  let s=game(['nightwalker','syndicate']);const target=field(s,'nightwalker_handler'),a=field(s,'syndicate_security',1);
  s=cast(s,'nightwalker_vanish',{targetUid:target.uid}).state;s.attacker=1;s=cast(s,'syndicate_target_designator',{targetUid:target.uid}).state;let r=combat(s,a,target);assert.ok(unit(r.state,target).damage>0);assert.equal(status(r.state,target,'dodge'),undefined);assert.ok(r.events.some(e=>e.type==='statusBypassed'&&e.status==='dodge'));
  s=game(['nightwalker','syndicate']);const v=field(s,'nightwalker_stalker'),p=field(s,'syndicate_contract_marksman',1);s=cast(s,'nightwalker_vanish',{targetUid:v.uid}).state;s.attacker=1;r=combat(s,p,v);assert.equal(unit(r.state,v).damage,3);assert.equal(status(r.state,v,'dodge'),undefined);
});
test('Exposed removes Cover/Dodge on application, adds one direct-hit damage and expires predictably',()=>{
  let s=game(['nightwalker','syndicate']);const target=field(s,'nightwalker_handler'),a=field(s,'syndicate_observer',1);
  s=cast(s,'nightwalker_vanish',{targetUid:target.uid}).state;s=cast(s,'stonewall_dig_in',{targetUid:target.uid}).state;s.attacker=1;let r=cast(s,'syndicate_target_package',{targetUid:target.uid});s=r.state;assert.equal(status(s,target,'cover'),undefined);assert.equal(status(s,target,'dodge'),undefined);assert.ok(status(s,target,'exposed'));assert.equal(r.events.filter(e=>e.type==='statusBypassed').length,2);
  const expected=E.previewCombat(s,a,target).incoming;r=combat(s,a,target);assert.equal(unit(r.state,target).damage,expected);assert.equal(status(r.state,target,'exposed'),undefined);
  s=game(['nightwalker','syndicate']);const u=field(s,'nightwalker_stalker');s.attacker=1;s=cast(s,'syndicate_target_package',{targetUid:u.uid}).state;s=next(s);assert.equal(status(s,u,'exposed'),undefined);
});
test('Expose the Opening accepts wounded or exhausted enemies and rejects a healthy ready target',()=>{
  const s=game(['nightwalker','bruiser']),wounded=field(s,'bruiser_heavy',1,3,{damage:1}),exhausted=field(s,'bruiser_brawler',1,3,{ready:false}),ready=field(s,'bruiser_vanguard',1),h=hand(s,'nightwalker_expose_the_opening');
  assert.equal(E.validate(s,{type:'order',handUid:h.uid,targetUid:wounded.uid}),null);assert.equal(E.validate(s,{type:'order',handUid:h.uid,targetUid:exhausted.uid}),null);assert.ok(E.validate(s,{type:'order',handUid:h.uid,targetUid:ready.uid}));
});
test('Suppression reduces Attack without disabling traits or attacks and prohibits voluntary movement',()=>{
  let s=game(['syndicate','bruiser']);const source=field(s,'syndicate_suppression_team'),target=field(s,'bruiser_shock_runner',1),before=E.attackValue(s,target);
  s=ability(s,source,{targetUid:target.uid}).state;assert.equal(E.attackValue(s,target),Math.max(0,before-1));assert.equal(E.hasTrait(unit(s,target),'mobile'),true);assert.equal(unit(s,target).suppressed,undefined,'Does not use legacy Sabotage flag');s=next(s);
  assert.ok(E.legalActions(s).some(a=>a.type==='attack'&&a.unitUid===target.uid));assert.equal(E.legalActions(s).some(a=>a.type==='move'&&a.unitUid===target.uid),false);const warning=E.validate(s,{type:'move',unitUid:target.uid,territory:4});assert.match(warning,/Suppression/);assert.ok(status(s,target,'suppression'));
  s=next(s);assert.equal(status(s,target,'suppression'),undefined);assert.equal(E.attackValue(s,target),before);
});
test('Suppression refresh is one penalty through the end of the target next action window',()=>{
  let s=game(['rogue','bruiser']);const target=field(s,'bruiser_brawler',1);s=cast(s,'rogue_make_it_work',{mode:'suppress',targetUid:target.uid}).state;s=cast(s,'rogue_make_it_work',{mode:'suppress',targetUid:target.uid}).state;
  assert.equal(E.statusesFor(s,target.uid).filter(f=>f.kind==='suppression').length,1);assert.equal(E.attackValue(s,target),D.CARDS.bruiser_brawler.attack-1);s=next(s);assert.ok(status(s,target,'suppression'));s=next(s);assert.equal(status(s,target,'suppression'),undefined);
});
test('Overwatch pays a real action, exhausts, obeys deployment locks and expires at owner start',()=>{
  let s=game();const source=field(s,'stonewall_bastion_gunner'),fresh=field(s,'stonewall_bastion_gunner',0,2,{deployedTurn:s.turn});
  rejected(s,{type:'overwatch',unitUid:fresh.uid},/New deployments/);const actions=s.actionsLeft,r=act(s,{type:'overwatch',unitUid:source.uid});s=r.state;assert.equal(s.actionsLeft,actions-1);assert.equal(unit(s,source).ready,false);assert.equal(status(s,source,'overwatch').amount,2);rejected(s,{type:'overwatch',unitUid:source.uid},/ready|watching/);s=next(s);assert.ok(status(s,source,'overwatch'));s=next(s);assert.equal(status(s,source,'overwatch'),undefined);
});
test('Overwatch reacts once on voluntary enemy entry in deterministic source order',()=>{
  let s=game();const a=field(s,'stonewall_bastion_gunner'),b=field(s,'stonewall_bastion_gunner'),enemy=field(s,'bruiser_heavy',1,4);s.units.reverse();s=act(s,{type:'overwatch',unitUid:b.uid}).state;s=act(s,{type:'overwatch',unitUid:a.uid}).state;s=next(s);
  const action={type:'move',unitUid:enemy.uid,territory:3},preview=E.previewAction(s,action),r=act(s,action);assert.deepEqual(r.events.filter(e=>e.type==='overwatchTriggered').map(e=>e.sourceUid),[a.uid,b.uid]);assert.equal(unit(r.state,enemy).damage,4);assert.equal(preview.affected.find(x=>x.uid===enemy.uid).damage,4);assert.equal(status(r.state,a,'overwatch'),undefined);assert.equal(status(r.state,b,'overwatch'),undefined);
});
test('Overwatch ignores same-side moves, distant entry and stops ordered reactions when the entrant dies',()=>{
  let s=game();const watcher=field(s,'stonewall_bastion_gunner'),own=field(s,'stonewall_rifles',0,2),enemy=field(s,'bruiser_heavy',1,5);s=act(s,{type:'overwatch',unitUid:watcher.uid}).state;s=act(s,{type:'move',unitUid:own.uid,territory:3}).state;assert.ok(status(s,watcher,'overwatch'));s=next(s);s=act(s,{type:'move',unitUid:enemy.uid,territory:4}).state;assert.ok(status(s,watcher,'overwatch'));
  s=game();const a=field(s,'stonewall_bastion_gunner'),b=field(s,'stonewall_bastion_gunner'),v=field(s,'bruiser_brawler',1,4,{damage:D.CARDS.bruiser_brawler.health-1});s=act(s,{type:'overwatch',unitUid:a.uid}).state;s=act(s,{type:'overwatch',unitUid:b.uid}).state;s=next(s);const r=act(s,{type:'move',unitUid:v.uid,territory:3});assert.equal(unit(r.state,v),undefined);assert.equal(r.events.filter(e=>e.type==='overwatchTriggered').length,1);assert.ok(status(r.state,b,'overwatch'));
});
test('Improvised Mine automatically arms on legal deployment, consumes itself and yields no casualty value',()=>{
  let s=game(['rogue','bruiser'],{},['commander_rogue_scavenger','commander_bruiser_breaker']);field(s,'rogue_broker',0,2);const enemy=field(s,'bruiser_heavy',1,3),h=hand(s,'rogue_improvised_mine');s=act(s,{type:'deploy',handUid:h.uid,territory:2}).state;assert.ok(status(s,h.uid,'overwatch'));
  // Set a legal later frontier to permit voluntary entry into the prepared zone.
  s.contested=2;s.territories[2].owner=null;s.territories[3].owner=1;s.attacker=1;const count=s.players[0].hand.length,r=act(s,{type:'move',unitUid:enemy.uid,territory:2});assert.equal(unit(r.state,h.uid),undefined);assert.equal(unit(r.state,enemy).damage,2);assert.equal(casualtyRewards(r).length,0);assert.equal(r.state.players[0].hand.length,count);assert.equal(r.events.find(e=>e.type==='death'&&e.uid===h.uid).cause,'rulesResolution');
});
test('Smoke reduces direct damage, bypasses Blast, blocks Overwatch and expires without blocking Mark',()=>{
  let s=game(['nightwalker','syndicate']);const target=field(s,'nightwalker_stalker'),source=field(s,'syndicate_contract_marksman',1),watcher=field(s,'nightwalker_shadow_trapper'),enter=field(s,'syndicate_security',1,4);
  s=act(s,{type:'overwatch',unitUid:watcher.uid}).state;s=cast(s,'nightwalker_smoke_screen',{territory:3}).state;assert.equal(E.territoryStatuses(s,3).length,1);s=next(s);let r=act(s,{type:'move',unitUid:enter.uid,territory:3});assert.equal(unit(r.state,enter).damage,0);assert.ok(status(r.state,watcher,'overwatch'));assert.equal(E.validate(r.state,{type:'order',handUid:hand(r.state,'syndicate_signal_lock',1).uid,targetUid:target.uid}),null);
  r=combat(r.state,source,target);assert.equal(unit(r.state,target).damage,2);s=next(r.state);assert.equal(E.territoryStatuses(s,3).length,0);
});
test('Smoke requires a friendly permanent and does not stack protection in a territory',()=>{
  let s=game(['nightwalker','bruiser']);const h=hand(s,'nightwalker_smoke_screen');assert.ok(E.validate(s,{type:'order',handUid:h.uid,territory:2}),'Empty friendly ground has no friendly permanent');const u=field(s,'nightwalker_stalker');s=act(s,{type:'order',handUid:h.uid,territory:3}).state;s=cast(s,'nightwalker_smoke_screen',{territory:3}).state;assert.equal(E.territoryStatuses(s,3).length,1);s.attacker=1;const r=cast(s,'bruiser_frag_out',{territory:3});assert.equal(unit(r.state,u).damage,2);assert.equal(E.territoryStatuses(r.state,3).length,1);
});
test('Sacrifice Blast destroys the chosen source as a real paid cost and never feeds casualty draw engines',()=>{
  let s=game(['rogue','bruiser'],{},['commander_rogue_scavenger','commander_bruiser_breaker']);field(s,'rogue_broker');const source=field(s,'rogue_jury_rigged_shield'),enemy=field(s,'bruiser_heavy',1),h=hand(s,'rogue_salvage_charge'),before=s.players[0].hand.length,cost=E.presence(s,0),action={type:'order',handUid:h.uid,sacrificeUid:source.uid,territory:3};const preview=E.previewAction(s,action),r=act(s,action);
  assert.equal(unit(r.state,source),undefined);assert.equal(unit(r.state,enemy).damage,2);assert.equal(r.state.players[0].hand.length,before-1);assert.equal(r.state.actionsLeft,s.actionsLeft-1);assert.equal(E.presence(r.state,0).spent,cost.spent+3);assert.equal(E.presence(r.state,0).committed,cost.committed-D.CARDS[source.cardId].presence);assert.equal(casualtyRewards(r).length,0);assert.equal(r.events.find(e=>e.type==='death').cause,'sacrifice');assert.equal(preview.affected.find(x=>x.uid===source.uid).cause,'sacrifice');
});
test('illegal Sacrifice payoff is rejected atomically and cannot spend a card, action or source',()=>{
  const s=game(['rogue','bruiser']),source=field(s,'rogue_scrapper'),healthy=field(s,'rogue_outrider'),h=hand(s,'rogue_strip_it_for_parts');rejected(s,{type:'order',handUid:h.uid,sacrificeUid:source.uid,targetUid:healthy.uid},/damaged/);rejected(s,{type:'order',handUid:h.uid,sacrificeUid:source.uid,targetUid:source.uid},/different/);
  const blast=hand(s,'rogue_salvage_charge');rejected(s,{type:'order',handUid:blast.uid,sacrificeUid:source.uid,territory:2},/enemy|same/);
});
test('explicit Sacrifice repair and contingency payoffs work with selected second targets, without draw refunds',()=>{
  let s=game(['rogue','bruiser']);const cost=field(s,'rogue_improvised_mine'),target=field(s,'rogue_bulwark',0,3,{damage:4});let r=cast(s,'rogue_strip_it_for_parts',{sacrificeUid:cost.uid,targetUid:target.uid});assert.equal(unit(r.state,cost),undefined);assert.equal(unit(r.state,target).damage,1);assert.equal(casualtyRewards(r).length,0);
  s=game(['rogue','bruiser']);const wounded=field(s,'rogue_scrapper',0,3,{damage:1}),saved=field(s,'rogue_outrider');r=cast(s,'rogue_bad_plan_good_result',{sacrificeUid:wounded.uid,targetUid:saved.uid});assert.equal(unit(r.state,wounded),undefined);assert.ok(status(r.state,saved,'cover'));assert.ok(status(r.state,saved,'dodge'));assert.equal(unit(r.state,saved).damage,0);assert.equal(casualtyRewards(r).length,0);
});
test('Hold Fast requires a real prior surviving defender and pressure only lasts through this action window',()=>{
  let s=game();const a=field(s,'stonewall_rifles'),b=field(s,'stonewall_watchguard');const h=hand(s,'stonewall_hold_fast');assert.ok(E.validate(s,{type:'order',handUid:h.uid,territory:3}));
  s=next(s);const enemy=field(s,'bruiser_brawler',1);s=combat(s,enemy,a).state;s=next(s);assert.equal(unit(s,a).defendedTurn,s.turn-1);const pressure=E.capturePressure(s,0).total,contested=s.contested;s=cast(s,'stonewall_hold_fast',{territory:3}).state;assert.equal(E.capturePressure(s,0).total,pressure+2);assert.equal(s.contested,contested);assert.ok(status(s,a,'cover'));assert.ok(status(s,b,'cover'));s=next(s);assert.equal(s.effects.some(f=>f.kind==='pressure'),false);
});
test('Contingency requires combined classes and gives only one paid draw plus two temporary charges',()=>{
  let s=game(['syndicate','bruiser']);field(s,'syndicate_security');field(s,'syndicate_security');let h=hand(s,'syndicate_contingency_plan');assert.ok(E.validate(s,{type:'order',handUid:h.uid,territory:3}));
  s=game(['syndicate','bruiser']);const a=field(s,'syndicate_security'),b=field(s,'syndicate_contract_marksman');h=hand(s,'syndicate_contingency_plan');const before=s.players[0].hand.length,actions=s.actionsLeft,r=act(s,{type:'order',handUid:h.uid,territory:3});assert.equal(r.state.players[0].hand.length,before);assert.equal(r.state.actionsLeft,actions-1);assert.ok(status(r.state,a,'cover'));assert.ok(status(r.state,b,'cover'));assert.equal(r.events.filter(e=>e.type==='draw'&&e.player===0).length,1);
});
test('Clean Exit retreats one adjacent friendly rear position and retains wounds, attack locks and costs',()=>{
  let s=game(['nightwalker','bruiser']);const u=field(s,'nightwalker_blade',0,3,{damage:1,ready:false,attackedTurn:s.turn});const before=E.presence(s,0),r=cast(s,'nightwalker_clean_exit',{targetUid:u.uid});assert.equal(unit(r.state,u).territory,2);assert.equal(unit(r.state,u).damage,1);assert.equal(unit(r.state,u).attackedTurn,s.turn);assert.equal(unit(r.state,u).ready,false);assert.equal(E.presence(r.state,0).committed,before.committed);assert.equal(E.presence(r.state,0).spent,before.spent+4);assert.ok(status(r.state,u,'dodge'));assert.ok(r.events.every(e=>e.type!=='reclaim'&&e.type!=='draw'));
});
test('activated Cover/repair/Blast abilities pay once, exhaust and restrict targets to their own territory',()=>{
  let s=game();const source=field(s,'stonewall_trench_engineer'),ally=field(s,'stonewall_rifles'),distant=field(s,'stonewall_rifles',0,2);rejected(s,{type:'ability',unitUid:source.uid,abilityId:'entrench',targetUid:distant.uid},/source territory/);const before=E.presence(s,0),r=ability(s,source,{targetUid:ally.uid});assert.equal(unit(r.state,source).ready,false);assert.equal(E.presence(r.state,0).spent,before.spent+1);assert.ok(status(r.state,ally,'cover'));rejected(r.state,{type:'ability',unitUid:source.uid,abilityId:'entrench',targetUid:ally.uid},/ready|used/);
  s=game();const medic=field(s,'stonewall_field_mechanic'),hurt=field(s,'stonewall_hardpoint',0,3,{damage:3});assert.equal(unit(ability(s,medic,{targetUid:hurt.uid}).state,hurt).damage,1);
});
test('tactical removal followed by capture resolves surviving defenders and no-retreat destruction contiguously',()=>{
  for(const full of [false,true]){
    let s=game(['bruiser','stonewall'],{captureThreshold:1});field(s,'bruiser_linebreaker');field(s,'bruiser_heavy');const doomed=field(s,'stonewall_rifles',1,3,{damage:D.CARDS.stonewall_rifles.health-1}),survivor=field(s,'stonewall_rifles',1);
    if(full)for(let i=0;i<s.config.slotsPerTerritory;i++)field(s,'stonewall_rifles',1,4);
    s=cast(s,'bruiser_frag_out',{territory:3}).state;assert.equal(unit(s,doomed),undefined);const r=act(s,{type:'endTurn'});assert.equal(r.state.contested,4);assert.equal(r.state.territories[3].owner,0);E.assertInvariants(r.state);
    if(full){assert.equal(unit(r.state,survivor),undefined);assert.ok(r.events.some(e=>e.type==='death'&&e.uid===survivor.uid&&e.cause==='displacementFailure'));}else assert.equal(unit(r.state,survivor).territory,4);
    assert.ok(r.state.units.every(u=>(u.territory-r.state.contested)*(u.owner===0?1:-1)<=0));
  }
});
test('Sprint 11 retains the Sprint 10 shared Rogue casualty budget and wounded reclaim behavior',()=>{
  let s=game(['rogue','bruiser'],{},['commander_rogue_scavenger','commander_bruiser_breaker']);const a=field(s,'rogue_scrapper',0,3,{damage:3}),b=field(s,'rogue_outrider',0,3,{damage:3});field(s,'rogue_broker');s.attacker=1;let r=cast(s,'bruiser_frag_out',{territory:3});assert.equal(casualtyRewards(r).length,1);assert.equal(r.events.filter(e=>e.type==='draw'&&e.player===0).length,1);assert.equal(unit(r.state,a),undefined);assert.equal(unit(r.state,b),undefined);
  s=game(['rogue','bruiser']);const wounded=field(s,'rogue_outrider',0,2,{damage:2});s=cast(s,'rogue_reclaim',{targetUid:wounded.uid}).state;const h=s.players[0].hand.find(x=>x.cardId===wounded.cardId);assert.equal(h.damage,2);s=act(s,{type:'deploy',handUid:h.uid,territory:2}).state;assert.equal(unit(s,h.uid).damage,2);
});
test('Hardpoint prepares just one most-wounded unit at owner-window start with deterministic ties',()=>{
  let s=game();const hardpoint=field(s,'stonewall_hardpoint',0,2),first=field(s,'stonewall_defender',0,2,{damage:2}),second=field(s,'stonewall_watchguard',0,2,{damage:2}),light=field(s,'stonewall_rifles',0,2,{damage:1});s.units.reverse();s=next(s);s=next(s);
  assert.ok(status(s,first,'cover'));assert.equal(status(s,second,'cover'),undefined);assert.equal(status(s,light,'cover'),undefined);assert.equal(status(s,hardpoint,'cover'),undefined);assert.equal(status(s,first,'cover').sourceUid,hardpoint.uid);assert.equal(status(s,first,'cover').startedTurn,s.turn);
});
test('Overwatch reacts to legal deployment after deployment Cover/Dodge hooks and clears on source movement',()=>{
  let s=game(['nightwalker','bruiser']);const watcher=field(s,'nightwalker_shadow_trapper'),h=hand(s,'bruiser_heavy',1);s=act(s,{type:'overwatch',unitUid:watcher.uid}).state;s.attacker=1;s.territories[3].owner=1;const r=act(s,{type:'deploy',handUid:h.uid,territory:3});assert.equal(unit(r.state,h.uid).damage,2);assert.equal(status(r.state,watcher,'overwatch'),undefined);assert.equal(r.events.filter(e=>e.type==='overwatchTriggered').length,1);
  s=game(['nightwalker','bruiser']);const own=field(s,'nightwalker_shadow_trapper');s=act(s,{type:'overwatch',unitUid:own.uid}).state;s.units.find(x=>x.uid===own.uid).ready=true;s=act(s,{type:'move',unitUid:own.uid,territory:2}).state;assert.equal(status(s,own,'overwatch'),undefined);
});
test('Exposed and defensive statuses refresh without stacking and zero-Attack hits do not spend charges',()=>{
  let s=game(['nightwalker','syndicate']);const target=field(s,'nightwalker_handler'),source=field(s,'syndicate_recon_drone',1);s=cast(s,'nightwalker_vanish',{targetUid:target.uid}).state;s.attacker=1;s=cast(s,'syndicate_target_package',{targetUid:target.uid}).state;s=cast(s,'syndicate_target_package',{targetUid:target.uid}).state;assert.equal(E.statusesFor(s,target.uid).filter(f=>f.kind==='exposed').length,1);assert.equal(status(s,target,'exposed').amount,1);assert.equal(E.attackValue(s,source),0);
  s=game(['nightwalker','stonewall']);const defender=field(s,'nightwalker_stalker'),attacker=field(s,'stonewall_field_mechanic',1);s=cast(s,'nightwalker_vanish',{targetUid:defender.uid}).state;s=cast(s,'rogue_make_it_work',{mode:'suppress',targetUid:attacker.uid}).state;s.attacker=1;const r=combat(s,attacker,defender);assert.equal(unit(r.state,defender).damage,0);assert.ok(status(r.state,defender,'dodge'));
});
test('Break the Position requires an actual prepared enemy and never readies a second attacker',()=>{
  let s=game(['bruiser','stonewall']);const ally=field(s,'bruiser_demolition_squad',0,3,{ready:false}),already=field(s,'bruiser_heavy',0,3,{ready:false,attackedTurn:s.turn}),enemy=field(s,'stonewall_defender',1);const h=hand(s,'bruiser_break_the_position');assert.ok(E.validate(s,{type:'order',handUid:h.uid,territory:3}));s.attacker=1;s=cast(s,'stonewall_dig_in',{targetUid:enemy.uid}).state;s.attacker=0;const preview=E.previewAction(s,{type:'order',handUid:h.uid,territory:3}),r=act(s,{type:'order',handUid:h.uid,territory:3});assert.equal(status(r.state,enemy,'cover'),undefined);assert.ok(status(r.state,enemy,'suppression'));assert.equal(unit(r.state,ally).ready,true);assert.equal(unit(r.state,already).ready,false);assert.deepEqual(preview.readies,[ally.uid]);
});
test('Suppression also blocks voluntarily choosing a defensive Retreat response',()=>{
  let s=game(['nightwalker','bruiser']);const defender=field(s,'nightwalker_stalker'),attacker=field(s,'bruiser_heavy',1);s.attacker=1;s=cast(s,'rogue_make_it_work',{mode:'suppress',targetUid:defender.uid}).state;const withdraw=hand(s,'nightwalker_withdraw',0);s=act(s,{type:'attack',unitUid:attacker.uid,targetUid:defender.uid}).state;rejected(s,{type:'respond',handUid:withdraw.uid},/Suppression/);
});
test('Commander direct-effect forecasts match actual damage through Cover, Dodge and Smoke',()=>{
  for(const commander of ['commander_bruiser_bloodhound','commander_syndicate_coordinator']){
    const faction=commander.includes('bruiser')?'bruiser':'syndicate';let s=game(['nightwalker',faction],{},['commander_nightwalker_ghost',commander]);const target=field(s,'nightwalker_handler',0,3,{damage:1});s=cast(s,'nightwalker_vanish',{targetUid:target.uid}).state;s=cast(s,'stonewall_dig_in',{targetUid:target.uid}).state;s=cast(s,'nightwalker_smoke_screen',{territory:3}).state;s.attacker=1;const a={type:'commander',targetUid:target.uid},preview=E.previewAction(s,a),before=unit(s,target).damage,r=act(s,a);assert.equal(unit(r.state,target).damage-before,preview.affected.find(x=>x.uid===target.uid).damage,commander);assert.equal(status(r.state,target,'dodge'),undefined,commander);
  }
});

// Each expanded definition resolves through public legality and immutable dispatch.
// Board attributes model a prior wounded/defensive exchange; no status is injected.
for(const definition of Object.values(TacticalArsenal.CARD_ADDITIONS)){
  test(definition.id+' legally enters play and resolves its available tactical action',()=>{
    const opponent=definition.faction==='bruiser'?'stonewall':'bruiser';
    let s=game([definition.faction,opponent]);
    const legacy=Object.values(D.CARDS).filter(c=>c.faction===definition.faction&&c.type!=='order'&&c.type!=='asset'&&c.set!=='tactical-011');
    const first=legacy[0],other=legacy.find(c=>c.artRole!==first.artRole)||legacy[1];
    field(s,first.id,0,3,{damage:Math.min(3,first.health-1),defendedTurn:s.turn-1});
    field(s,other.id,0,3,{damage:Math.min(3,other.health-1),ready:false});
    const enemy=field(s,opponent+'_heavy',1,3,{damage:1,ready:false});
    const item=hand(s,definition.id);
    if(definition.type==='order'){
      const action=E.legalActions(s).find(a=>a.type==='order'&&a.handUid===item.uid);
      assert.ok(action,definition.name+' has a legal target in its prepared fixture');
      assert.ok(E.previewAction(s,action));
      const result=act(s,action);
      assert.equal(result.state.players[0].hand.some(h=>h.uid===item.uid),false,'the actual Order leaves the hand');
      assert.ok(result.events.some(e=>e.type==='order'&&e.cardId===definition.id));
      assert.equal(result.state.winner,null,'a tactical fixture is not a completed match');
      return;
    }
    // A later-frontier position can permit deployment into the contested space.
    s.territories[3].owner=0;
    const deployment={type:'deploy',handUid:item.uid,territory:3};
    assert.ok(E.legalActions(s).some(a=>a.type==='deploy'&&a.handUid===item.uid&&a.territory===3));
    s=act(s,deployment).state;
    assert.equal(unit(s,item.uid).cardId,definition.id);
    assert.equal(unit(s,item.uid).deployedTurn,s.turn);
    for(const hook of definition.tactical?.onDeploy||[]){
      assert.ok(status(s,item.uid,hook.kind),definition.name+' resolves its deployment hook');
    }
    s=next(next(s)); // Deployment lock is paid by waiting for the actual next window.
    if(definition.tactical?.onStart){
      assert.ok(s.effects.some(f=>f.sourceUid===item.uid&&f.kind==='cover'),'Hardpoint resolves its next-window preparation');
    }
    if(definition.tactical?.ability){
      if(definition.tactical.ability.effect.requiresMarked){
        s=cast(s,'syndicate_target_designator',{targetUid:enemy.uid}).state;
      }
      const action=E.legalActions(s).find(a=>a.type==='ability'&&a.unitUid===item.uid);
      assert.ok(action,definition.name+' exposes a legal activated ability after its deployment lock');
      assert.ok(E.previewAction(s,action));
      const result=act(s,action);s=result.state;
      assert.equal(unit(s,item.uid).ready,false,'an activated tactical source exhausts');
      assert.ok(result.events.some(e=>e.type==='ability'&&e.uid===item.uid));
    }else if(definition.tactical?.overwatch){
      const action=E.legalActions(s).find(a=>a.type==='overwatch'&&a.unitUid===item.uid);
      assert.ok(action);s=act(s,action).state;assert.ok(status(s,item.uid,'overwatch'));
    }else if(definition.traits.includes('breach')||definition.traits.includes('precision')){
      const action=E.legalActions(s).find(a=>a.type==='attack'&&a.unitUid===item.uid);
      assert.ok(action,definition.name+' has a legal initiated attack');
      const pending=act(s,action),resolved=act(pending.state,{type:'respond',pass:true});s=resolved.state;
      if(unit(s,item.uid))assert.equal(unit(s,item.uid).ready,false);
      else assert.ok(resolved.events.some(e=>e.type==='death'&&e.uid===item.uid&&e.cause==='combat'));
    }
    assert.equal(s.winner,null,'a tactical fixture is not a completed match');
  });
}
