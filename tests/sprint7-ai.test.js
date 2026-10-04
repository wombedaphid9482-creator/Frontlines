'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const B=require('../balance'),AI=require('../ai');
const runtime=B.createRuntime('sprint7'),D=runtime.data,E=runtime.engine,A=AI.forRules(D,E),clone=value=>JSON.parse(JSON.stringify(value));
let nextUid=107000;
function fixture(faction='rogue'){
 const state=E.createGame({seed:70817,factions:[faction,'bruiser'],config:{startingCommand:80,commandCap:80,drawCount:0}});
 state.players.forEach(p=>{p.hand=[];});return state;
}
function hand(state,cardId,owner=0){const item={uid:'s7-ai-'+nextUid++,cardId};state.players[owner].hand.push(item);return item;}
function unit(state,cardId,owner=0,territory=3,extra={}){const value={uid:'s7-ai-'+nextUid++,cardId,owner,territory,damage:0,ready:true,deployedTurn:0,movedTurn:-1,...extra};state.units.push(value);return value;}
function concealed(state){
 const next=clone(state),actor=E.getActor(next);
 for(const p of next.players)Object.defineProperty(p,'deck',{get(){throw Error('AI read concealed deck order');}});
 Object.defineProperty(next.players[1-actor],'hand',{get(){throw Error('AI read concealed opponent hand');}});
 Object.defineProperty(next.players[1-actor],'deckMeta',{get(){throw Error('AI read concealed opponent deck identity');}});
 Object.defineProperty(next,'rngState',{get(){throw Error('AI read concealed RNG');}});return next;
}

test('Sprint 7 AI has a new per-rules version while Sprint 6 retains its original version',()=>{
 assert.equal(A.VERSION,'frontlines-ai-sprint7-v1');const old=B.createRuntime('sprint6');assert.equal(AI.forRules(old.data,old.engine).VERSION,'frontlines-ai-sprint6-v1');
});

test('every new card evaluates legally, finitely and deterministically at every difficulty without hidden access',()=>{
 const additions=Object.values(D.CARDS).filter(c=>!B.dataFor('sprint6').CARDS[c.id]);assert.ok(additions.length>=30);
 for(const c of additions){
  const state=fixture(c.faction),ownId=Object.values(D.CARDS).find(card=>card.faction===c.faction&&card.type==='unit').id;
  unit(state,ownId,0,3,{damage:1,ready:false});unit(state,ownId,0,3);unit(state,'bruiser_heavy',1,3,{damage:1});hand(state,c.id);
  const snapshot=JSON.stringify(state);
  for(const difficulty of ['easy','normal','hard','expert','learning']){
   const options={profile:'deck',difficulty},decision=A.explainAction(state,options);
   assert.equal(E.validate(state,decision.action),null,c.id+' '+difficulty);assert.ok(Number.isFinite(decision.score));
   assert.deepEqual(A.chooseAction(state,options),decision.action);assert.deepEqual(A.explainAction(concealed(state),options),decision);
   assert.equal(JSON.stringify(state),snapshot);assert.ok(decision.planning.projected<=(difficulty==='expert'?35:difficulty==='hard'?5:0));
  }
 }
});

test('Adapt AI distinguishes repair, resupply and rally using their exact visible effects',()=>{
 for(const mode of D.CARDS.rogue_field_options.effect.modes){
  const state=fixture(),item=hand(state,'rogue_field_options'),ally=unit(state,'rogue_raider',0,3,{damage:mode.kind==='heal'?4:0,ready:mode.kind!=='rally'});
  if(mode.kind==='rally')unit(state,'bruiser_assault',1,3,{damage:Math.max(0,D.CARDS.bruiser_assault.health-2)});
  const choices=E.legalActions(state).filter(action=>action.type==='endTurn'||action.handUid===item.uid&&action.mode===mode.id);
  assert.ok(choices.some(action=>action.mode===mode.id));
  for(const difficulty of ['normal','hard','expert']){
   const decision=A.explainAction(state,{profile:'deck',difficulty,legalActions:choices});
   assert.equal(decision.action.mode,mode.id,mode.id+' '+difficulty);assert.match(decision.explanation,new RegExp(mode.label.split(' — ')[0]));
   assert.equal(decision.cost.commandActions,1);assert.equal(E.validate(state,decision.action),null);
  }
  assert.ok(ally);
 }
});

test('Mark scores a visible lethal follow-up and avoids spending the last command on an unusable window',()=>{
 const state=fixture('syndicate'),attacker=unit(state,'syndicate_enforcer'),target=unit(state,'bruiser_heavy',1),mark=hand(state,'syndicate_target_designator');
 target.damage=D.CARDS[target.cardId].health-E.combatDamage(state,target,E.attackValue(state,attacker))-1;
 const choices=E.legalActions(state).filter(action=>action.type==='endTurn'||action.handUid===mark.uid);
 const decision=A.explainAction(state,{profile:'deck',difficulty:'hard',legalActions:choices});
 assert.equal(decision.action.handUid,mark.uid);assert.match(decision.reason,/Mark/);assert.ok(decision.planning.projected>0);
 state.actionsLeft=1;assert.equal(A.chooseAction(state,{profile:'deck',difficulty:'expert',legalActions:choices}).type,'endTurn');
});

test('Reinforce AI protects a visibly threatened occupied unit without assuming concealed responses',()=>{
 const state=fixture('stonewall'),target=unit(state,'stonewall_heavy',0,3,{damage:D.CARDS.stonewall_heavy.health-2}),support=hand(state,'stonewall_line_reinforcement');
 unit(state,'bruiser_assault',1);const choices=E.legalActions(state).filter(action=>action.type==='endTurn'||action.handUid===support.uid);
 for(const difficulty of ['easy','normal','hard','expert']){
  const options={profile:'deck',difficulty,legalActions:choices},decision=A.explainAction(state,options);
  assert.equal(decision.action.handUid,support.uid);assert.equal(decision.cost.commandActions,0);
  assert.deepEqual(A.explainAction(concealed(state),options),decision);assert.equal(E.validate(state,decision.action),null);
 }
 assert.ok(target);
});

test('new temporary combat states alter fair public forecasts and never mutate the authoritative board',()=>{
 const state=fixture('syndicate'),attacker=unit(state,'syndicate_enforcer'),target=unit(state,'bruiser_heavy',1);
 target.damage=D.CARDS[target.cardId].health-E.combatDamage(state,target,E.attackValue(state,attacker))-1;
 const attack={type:'attack',unitUid:attacker.uid,targetUid:target.uid},choices=[{type:'endTurn'},attack];
 const before=A.explainAction(state,{profile:'deck',difficulty:'normal',legalActions:choices});
 target.marked=1;const marked=A.explainAction(state,{profile:'deck',difficulty:'normal',legalActions:choices});assert.ok(marked.score>before.score);
 target.reinforced=1;const protectedDecision=A.explainAction(state,{profile:'deck',difficulty:'normal',legalActions:choices});assert.ok(protectedDecision.score<marked.score);
 const snapshot=JSON.stringify(state);A.explainAction(concealed(state),{profile:'deck',difficulty:'expert',legalActions:choices});assert.equal(JSON.stringify(state),snapshot);
});

test('hybrid intent uses centralized parent strategies without adding both bonuses or reading concealed metadata',()=>{
 assert.deepEqual(D.ARCHETYPE_PARENTS['fortified-advance'],['bastion','counteroffensive']);
 for(const [cardId,parent,explanation] of [['stonewall_plate_medic','counteroffensive',/Counteroffensive/],['stonewall_bulwark_warden','bastion',/Bastion/]]){
  const state=fixture('stonewall');unit(state,'stonewall_rifles',0,2,{damage:2});const item=hand(state,cardId);
  const deploy={type:'deploy',handUid:item.uid,territory:2},choices=[{type:'endTurn'},deploy];
  state.players[0].deckMeta={archetype:'custom'};const generic=A.explainAction(state,{profile:'deck',legalActions:choices});
  state.players[0].deckMeta={archetype:parent};const single=A.explainAction(state,{profile:'deck',legalActions:choices});
  state.players[0].deckMeta={archetype:'fortified-advance'};const hybrid=A.explainAction(state,{profile:'deck',legalActions:choices});
  assert.deepEqual(hybrid.action,deploy);assert.match(hybrid.reason,explanation);assert.equal(hybrid.score,single.score);
  assert.ok(hybrid.score>generic.score);assert.ok(hybrid.score-generic.score<=2.5);
  assert.deepEqual(A.explainAction(concealed(state),{profile:'deck',legalActions:choices}),hybrid);
 }
 const old=B.createRuntime('sprint6');assert.equal(old.data.ARCHETYPE_PARENTS,undefined);
});
