'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const B=require('../balance'),Decks=require('../decks'),R=B.createRuntime('sprint12'),D=R.data,E=R.engine,A=R.ai;
const clone=x=>JSON.parse(JSON.stringify(x));let serial=120000;
function fixture(faction){const s=E.createGame({seed:1205,factions:[faction,'bruiser'],config:{startingCommand:80,commandCap:80,drawCount:0}});s.players.forEach(p=>{p.hand=[];p.commander.used=true;});return s;}
function unit(s,cardId,owner=0,territory=3,extra={}){const u={uid:'fixture'+serial++,cardId,owner,territory,damage:0,ready:true,deployedTurn:0,movedTurn:-1,...extra};s.units.push(u);return u;}
function hand(s,id){const h={uid:'fixture'+serial++,cardId:id};s.players[0].hand.push(h);return h;}
function status(s,u,kind,amount=1){s.effects.push({id:'effect'+s.nextEffectId++,kind,targetUid:u.uid,territory:u.territory,owner:u.owner,sourcePlayer:u.owner,sourceCardId:u.cardId,sourceUid:u.uid,amount,startedTurn:s.turn,stack:'refresh',consume:'directEnemyHit',expires:{timing:'windowStart',player:u.owner,afterTurn:s.turn},metadata:{}});}
function conceal(s){const p=clone(s),actor=E.getActor(p);for(const row of p.players)Object.defineProperty(row,'deck',{get(){throw Error('Concealed deck order read');}});for(const key of ['hand','deckMeta'])Object.defineProperty(p.players[1-actor],key,{get(){throw Error('Concealed opponent information read');}});Object.defineProperty(p,'rngState',{get(){throw Error('Concealed RNG read');}});return p;}
function choose(s,predicate){const legal=E.legalActions(s).filter(a=>a.type==='endTurn'||predicate(a)),before=JSON.stringify(s),options={profile:'deck',difficulty:'normal',legalActions:legal};const decision=A.explainAction(s,options);assert.equal(E.validate(s,decision.action),null);assert.deepEqual(A.explainAction(conceal(s),options),decision);assert.equal(JSON.stringify(s),before);return decision;}
test('refinement preserves all 155 printed cards, 35 deck lists and ten Commanders',()=>{
  const previous=B.createRuntime('sprint11'),frozen=JSON.parse(fs.readFileSync('docs/balance/sprint12-v1.0.4-baseline/rules-and-decks.json'));
  assert.equal(B.DEFAULT_PROFILE,'sprint12');assert.equal(A.VERSION,'frontlines-ai-sprint12-v1');
  assert.deepEqual(D.CARDS,previous.data.CARDS);assert.deepEqual(D.CARDS,frozen.cards);assert.equal(Object.keys(D.CARDS).length,155);
  assert.deepEqual(Decks.forData(D).getDecks(),Decks.forData(previous.data).getDecks());assert.equal(Decks.forData(D).getDecks().length,35);
  assert.deepEqual(E.commanders.COMMANDERS,previous.engine.commanders.COMMANDERS);assert.deepEqual(D.DEFAULT_CONFIG,previous.data.DEFAULT_CONFIG);
  assert.deepEqual(JSON.parse(fs.readFileSync('balance/sprint12.json')),B.getProfiles().find(p=>p.id==='sprint12'));
});
test('historical Sprint 11 public decisions stay exact against its frozen runtime',()=>{
  const previous=B.createRuntime('sprint11'),frozen=require('../docs/balance/sprint12-v1.0.4-baseline/source/ai').forRules(previous.data,previous.engine);
  for(const faction of Object.keys(D.FACTIONS)){const s=previous.engine.createGame({seed:1104,factions:[faction,'bruiser']});for(const options of [{profile:'deck',difficulty:'normal'},{profile:'deck',difficulty:'expert'}])assert.deepEqual(previous.ai.explainAction(s,options),frozen.explainAction(s,options));}
});
test('rear Overwatch is rejected because enemy entry cannot occur before its expiry',()=>{
  const s=fixture('stonewall'),watcher=unit(s,'stonewall_bastion_gunner',0,2);unit(s,'bruiser_assault',1,3);
  assert.equal(choose(s,a=>a.type==='overwatch'&&a.unitUid===watcher.uid).action.type,'endTurn');
  watcher.territory=3;unit(s,'bruiser_brawler',1,4,{damage:3});assert.equal(choose(s,a=>a.type==='overwatch'&&a.unitUid===watcher.uid).action.type,'overwatch');
});
test('Mark setup forecasts only Mark and requires a real remaining-command follow-up',()=>{
  const s=fixture('syndicate'),ally=unit(s,'syndicate_security'),enemy=unit(s,'bruiser_brawler',1,3,{damage:1});status(s,enemy,'cover',2);status(s,enemy,'dodge');
  const id=Object.values(D.CARDS).find(c=>c.faction==='syndicate'&&c.type==='order'&&c.effect?.kind==='mark').id,card=hand(s,id);
  const action=E.legalActions(s).find(a=>a.handUid===card.uid&&a.targetUid===enemy.uid),preview=E.previewAction(s,action);
  assert.deepEqual(preview.marks,[enemy.uid]);assert.equal(preview.statusesRemoved.length,0);assert.equal(preview.statusesApplied.length,0);
  ally.ready=false;assert.equal(choose(s,a=>a.handUid===card.uid).action.type,'endTurn');ally.ready=true;s.actionsLeft=1;assert.equal(choose(s,a=>a.handUid===card.uid).action.type,'endTurn');
});
test('repair earns survival credit only when it changes a visible lethal exchange',()=>{
  const s=fixture('stonewall'),mechanic=unit(s,'stonewall_field_mechanic'),target=unit(s,'stonewall_field_mechanic',0,3,{damage:2}),threat=unit(s,'bruiser_heavy',1);
  const predicate=a=>a.type==='ability'&&a.unitUid===mechanic.uid&&a.targetUid===target.uid;
  const lethal=choose(s,predicate);assert.equal(E.previewCombat(s,threat,target).affected.find(h=>h.uid===target.uid).killed,true);
  const action=E.legalActions(s).find(predicate),repaired=E.dispatch(s,action).state;
  assert.equal(E.previewCombat(repaired,threat.uid,target.uid).affected.find(h=>h.uid===target.uid).killed,true,'Repair does not save a 4-Health unit from 4 damage');
  target.cardId='stonewall_rifles';target.damage=2;const saved=choose(s,predicate);assert.ok(saved.score>lethal.score,'A real survival gain receives a larger score');
});
test('every tactical card yields legal finite public decisions at each difficulty',()=>{
  for(const c of Object.values(D.CARDS).filter(c=>c.set==='tactical-011')){
    const s=fixture(c.faction);hand(s,c.id);unit(s,Object.values(D.CARDS).find(x=>x.faction===c.faction&&x.type==='unit').id,0,3,{damage:1});unit(s,'bruiser_brawler',1,3,{damage:1});
    for(const difficulty of ['easy','normal','hard','expert']){const options={profile:'deck',difficulty};const before=JSON.stringify(s),decision=A.explainAction(s,options);assert.ok(Number.isFinite(decision.score));assert.equal(E.validate(s,decision.action),null);assert.deepEqual(A.explainAction(conceal(s),options),decision);assert.equal(JSON.stringify(s),before);}
  }
});
