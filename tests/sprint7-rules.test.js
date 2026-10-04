'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const B=require('../balance'),Legacy=require('../engine');
const runtime=B.createRuntime('sprint7'),E=runtime.engine,D=runtime.data;
const old=B.createRuntime('sprint6'),clone=value=>JSON.parse(JSON.stringify(value));
let nextUid=97000;
function fixture(factions=['stonewall','bruiser']){
 const state=E.createGame({seed:70801,factions,config:{startingCommand:80,commandCap:80,drawCount:0}});
 state.players.forEach(p=>{p.hand=[];});return state;
}
function hand(state,cardId,owner=0){const item={uid:'s7-fixture-'+nextUid++,cardId};state.players[owner].hand.push(item);return item;}
function unit(state,cardId,owner=0,territory=3,changes={}){
 const item={uid:'s7-fixture-'+nextUid++,cardId,owner,territory,damage:0,ready:true,deployedTurn:0,movedTurn:-1,...changes};state.units.push(item);return item;
}
function apply(state,action,engine=E){
 const before=JSON.stringify(state),result=engine.dispatch(state,action,{events:true});assert.equal(result.ok,true,result.error);
 assert.equal(JSON.stringify(state),before);engine.assertInvariants(result.state);return result;
}
function reject(state,action,pattern){const before=JSON.stringify(state),result=E.dispatch(state,action);assert.equal(result.ok,false);assert.equal(result.state,state);assert.equal(JSON.stringify(state),before);assert.match(result.error,pattern);}
function combat(state,attacker,defender,engine=E){
 state=apply(state,{type:'attack',unitUid:attacker.uid,targetUid:defender.uid},engine).state;
 return apply(state,{type:'respond',pass:true},engine);
}

test('Sprint 7 isolates the expanded rules, preserving Sprint 6 cards and narrowly commanding Silencer',()=>{
 assert.equal(E.VERSION,'frontlines-territory-v4-arsenal-mechanics');assert.equal(old.engine.VERSION,'frontlines-territory-v3-command-frontline');
 assert.equal(E.RULES.arsenalMechanics,true);assert.equal(old.engine.RULES.arsenalMechanics,undefined);
 assert.equal(Object.keys(old.data.CARDS).length,80);assert.ok(Object.keys(D.CARDS).length>=110);
 for(const [id,definition] of Object.entries(old.data.CARDS)){
  for(const key of ['presence','attack','health','traits','effect','unique','type','faction'])assert.deepEqual(D.CARDS[id][key],definition[key],id+' '+key);
  assert.equal(D.CARDS[id].commandCost,definition.commandCost+(id==='nightwalker_silencer'?1:0),id);
 }
 const state=fixture(['nightwalker','bruiser']),silencer=hand(state,'nightwalker_silencer');
 assert.deepEqual(E.actionCost(state,{type:'deploy',handUid:silencer.uid,territory:2}),{presence:D.CARDS.nightwalker_silencer.presence,commandActions:1});
 state.actionsLeft=0;reject(state,{type:'deploy',handUid:silencer.uid,territory:2},/Command Actions/);
 assert.deepEqual(old.engine.actionCost(state,{type:'deploy',handUid:silencer.uid,territory:2}),{presence:old.data.CARDS.nightwalker_silencer.presence,commandActions:0});
});

test('Armor protects positive combat on neutral ground, combines with Fortify, and maxes with Reinforce',()=>{
 const data=clone(D);data.CARDS.stonewall_heavy.traits=['armor','fortify'];const engine=Legacy.withData(data);
 const state=fixture(),defender=unit(state,'stonewall_heavy');
 assert.equal(engine.combatDamage(state,defender,3),2);
 state.territories[3].owner=0;assert.equal(engine.combatDamage(state,defender,3),1);
 defender.reinforced=1;assert.equal(engine.combatDamage(state,defender,3),1,'temporary Armor must not stack');
 defender.suppressed=true;assert.equal(engine.combatDamage(state,defender,3),2,'temporary protection survives printed-trait suppression');
 delete defender.reinforced;assert.equal(engine.combatDamage(state,defender,3),3);
});

test('Mark amplifies normal attacks and simultaneous counterfire, respects shields and never invents zero damage',()=>{
 const state=fixture(),attacker=unit(state,'stonewall_heavy',0,3,{marked:1}),defender=unit(state,'bruiser_heavy',1,3,{marked:1});
 const expectedDefender=E.combatDamage(state,defender,E.attackValue(state,attacker));
 const expectedAttacker=E.combatDamage(state,attacker,E.attackValue(state,defender));
 const result=combat(state,attacker,defender),damages=result.events.filter(e=>e.type==='damage');
 assert.equal(damages.find(e=>e.targetUid===defender.uid).amount,expectedDefender);
 assert.equal(damages.find(e=>e.targetUid===attacker.uid).amount,expectedAttacker);
 assert.ok(damages.every(e=>e.markBonus===1));
 assert.equal(E.combatDamage(state,defender,0),0);
 assert.equal(E.combatDamage(state,defender,3,4),0,'shield absorbs the Mark bonus');
});

test('Armor, Mark and Reinforce do not alter direct Order, Ambush or separate Retaliate damage',()=>{
 const data=clone(D);data.CARDS.bruiser_heavy.traits=['armor','retaliate'];data.CARDS.stonewall_heavy.health=20;
 const engine=Legacy.withData(data);let state=fixture();
 const attacker=unit(state,'stonewall_heavy',0,3,{marked:1,reinforced:1}),defender=unit(state,'bruiser_heavy',1,3,{marked:1,reinforced:1});
 const strike=hand(state,'stonewall_fire_support');
 let result=apply(state,{type:'order',handUid:strike.uid,targetUid:defender.uid},engine);
 assert.equal(result.events.find(e=>e.type==='damage').amount,data.CARDS.stonewall_fire_support.effect.amount);
 state=fixture();const a=unit(state,'stonewall_heavy',0,3,{marked:1,reinforced:1}),d=unit(state,'bruiser_heavy',1,3,{reinforced:1});
 result=combat(state,a,d,engine);assert.equal(result.events.find(e=>e.type==='damage'&&e.passive==='retaliate').amount,1);
 state=fixture();const ambushed=unit(state,'stonewall_heavy',0,3,{marked:1,reinforced:1}),guard=unit(state,'bruiser_heavy',1),ambush=hand(state,'nightwalker_ambush',1);
 state=apply(state,{type:'attack',unitUid:ambushed.uid,targetUid:guard.uid},engine).state;
 state=apply(state,{type:'respond',handUid:ambush.uid},engine).state;result=apply(state,{type:'counter',pass:true},engine);
 assert.equal(result.events.find(e=>e.type==='damage'&&!e.combat).amount,data.CARDS.nightwalker_ambush.effect.amount);
});

test('Mark targets an unmarked enemy, emits readable feedback, and expires before its owner acts',()=>{
 let state=fixture(['syndicate','bruiser']);const ally=unit(state,'syndicate_enforcer',0,2),target=unit(state,'bruiser_heavy',1),mark=hand(state,'syndicate_target_designator');
 reject(state,{type:'order',handUid:mark.uid,targetUid:ally.uid},/enemy/);
 let result=apply(state,{type:'order',handUid:mark.uid,targetUid:target.uid});state=result.state;
 assert.equal(state.units.find(u=>u.uid===target.uid).marked,1);assert.equal(state.actionsLeft,2);
 assert.ok(result.events.some(e=>e.type==='mark'&&e.sourceCardId===mark.cardId));
 const second=hand(state,mark.cardId);reject(state,{type:'order',handUid:second.uid,targetUid:target.uid},/already Marked/);
 result=apply(state,{type:'endTurn'});assert.equal(result.state.units.find(u=>u.uid===target.uid).marked,undefined);
 assert.ok(result.events.some(e=>e.type==='markEnd'&&e.player===1));assert.ok(result.state.log.some(e=>e.text.includes('Mark expires')));
});

test('Reinforce heals, protects through the enemy turn, expires on own turn and rejects redundant healthy Armor',()=>{
 let state=fixture();const target=unit(state,'stonewall_heavy',0,2,{damage:3}),reinforce=hand(state,'stonewall_line_reinforcement');
 let result=apply(state,{type:'order',handUid:reinforce.uid,targetUid:target.uid});state=result.state;
 assert.equal(state.units.find(u=>u.uid===target.uid).damage,1);assert.equal(state.units.find(u=>u.uid===target.uid).reinforced,1);
 assert.ok(result.events.some(e=>e.type==='reinforce'&&e.healed===2));assert.equal(state.actionsLeft,3,'support Reinforce uses no command');
 state=apply(state,{type:'endTurn'}).state;assert.equal(state.units.find(u=>u.uid===target.uid).reinforced,1);
 result=apply(state,{type:'endTurn'});assert.equal(result.state.units.find(u=>u.uid===target.uid).reinforced,undefined);assert.ok(result.events.some(e=>e.type==='reinforceEnd'));
 state=fixture();const armoredId=Object.values(D.CARDS).find(c=>c.faction==='stonewall'&&c.traits.includes('armor')).id;
 const armored=unit(state,armoredId,0,2),support=hand(state,'stonewall_line_reinforcement');
 reject(state,{type:'order',handUid:support.uid,targetUid:armored.uid},/already protected/);armored.damage=1;
 assert.equal(apply(state,{type:'order',handUid:support.uid,targetUid:armored.uid}).state.units.find(u=>u.uid===armored.uid).damage,0);
});

test('Adapt requires an explicit valid mode and validates that mode target without consuming cards',()=>{
 const state=fixture(['rogue','bruiser']),item=hand(state,'rogue_field_options'),ally=unit(state,'rogue_raider',0,2,{damage:1}),enemy=unit(state,'bruiser_heavy',1);
 reject(state,{type:'order',handUid:item.uid,targetUid:ally.uid},/Adapt mode/);
 reject(state,{type:'order',handUid:item.uid,mode:'invented',targetUid:ally.uid},/Adapt mode/);
 reject(state,{type:'order',handUid:item.uid,mode:'repair',targetUid:enemy.uid},/allied/);
 assert.equal(E.resolveEffect(D.CARDS[item.cardId],{mode:'repair'}).kind,'heal');assert.equal(E.resolveEffect(D.CARDS[item.cardId],{}),null);
});

test('all Adapt modes perform their exact effect with one shared printed command cost',()=>{
 const definition=D.CARDS.rogue_field_options;
 for(const mode of definition.effect.modes){
  let state=fixture(['rogue','bruiser']);const item=hand(state,definition.id),target=unit(state,'rogue_raider',0,2,{damage:2,ready:false});
  const action={type:'order',handUid:item.uid,mode:mode.id,...(mode.kind==='draw'?{}:{targetUid:target.uid})};
  assert.deepEqual(E.actionCost(state,action),{presence:definition.presence,commandActions:1});assert.ok(E.legalActions(state).some(a=>JSON.stringify(a)===JSON.stringify(action)));
  const result=apply(state,action);assert.equal(result.state.actionsLeft,2);assert.equal(result.state.players[0].spent,definition.presence);
  assert.ok(result.events.some(e=>e.type==='order'&&e.mode===mode.id&&e.effect===mode.kind));
  if(mode.kind==='draw')assert.equal(result.state.players[0].hand.length,mode.amount);
  if(mode.kind==='heal')assert.equal(result.state.units.find(u=>u.uid===target.uid).damage,Math.max(0,2-mode.amount));
  if(mode.kind==='rally')assert.equal(result.state.units.find(u=>u.uid===target.uid).ready,true);
  state.actionsLeft=0;reject(state,action,/Command Actions/);
 }
});

test('shared target queries enumerate exact legal mode targets and no-target effects',()=>{
 const state=fixture(['rogue','bruiser']),hurt=unit(state,'rogue_raider',0,2,{damage:1}),exhausted=unit(state,'rogue_raider',0,2,{ready:false}),asset=unit(state,'rogue_workshop',0,2,{ready:false}),enemy=unit(state,'bruiser_heavy',1);
 assert.deepEqual(E.orderTargets(state,0,D.CARDS.rogue_field_options,{mode:'repair'}),[hurt.uid]);
 assert.deepEqual(E.orderTargets(state,0,D.CARDS.rogue_field_options,{mode:'reposition'}),[exhausted.uid]);
 assert.deepEqual(E.orderTargets(state,0,D.CARDS.rogue_field_options,{mode:'resupply'}),[]);
 assert.deepEqual(E.orderTargets(state,0,D.CARDS.syndicate_target_designator),[enemy.uid]);
 assert.equal(E.orderTargets(state,0,D.CARDS.rogue_field_options,{}).length,0);assert.ok(asset);
});

test('temporary states reject malformed numeric values under the new profile only',()=>{
 const state=fixture(),target=unit(state,'stonewall_heavy',0,2,{marked:2});assert.throws(()=>E.assertInvariants(state),/temporary arsenal/);
 target.marked=1;target.reinforced=-1;assert.throws(()=>E.assertInvariants(state),/temporary arsenal/);
 delete target.reinforced;assert.equal(E.assertInvariants(state),true);
 assert.equal(old.engine.assertInvariants(state),true,'historical profiles do not reinterpret new optional statuses');
});

test('older profiles ignore optional Armor and Mark and cannot play new effect kinds',()=>{
 const data=clone(old.data);data.CARDS.stonewall_heavy.traits=['armor'];data.CARDS.stonewall_triage.effect={kind:'reinforce',amount:2};
 const engine=Legacy.withData(data),state=fixture(),target=unit(state,'stonewall_heavy',0,2,{marked:1,reinforced:1,damage:2}),item=hand(state,'stonewall_triage');
 assert.equal(engine.combatDamage(state,target,3),3);assert.match(engine.validate(state,{type:'order',handUid:item.uid,targetUid:target.uid}),/not an offensive/);
});

