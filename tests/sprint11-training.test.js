'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Balance=require('../balance.js'),Training=require('../tactical-training.js'),Decks=require('../decks.js'),FX=require('../effects.js');
const R=Balance.createRuntime('sprint11'),E=R.engine,D=R.data;
const options={engine:E,data:D};
const has=(s,uid,kind)=>E.statusesFor(s,uid).some(v=>v.kind===kind);
function next(runner,confirm=false){const before=runner.snapshot(),result=runner.next(confirm);assert.equal(result.requiresConfirmation,undefined);assert.ok(result.position>before.position);E.assertInvariants(result.state);return result;}

test('six optional scenarios use legal real inventories and never replace fourteen beginner lessons',()=>{
  assert.equal(Training.LESSONS.length,6);assert.equal(require('../tutorial.js').LESSONS.length,14);
  for(let i=0;i<6;i++){
    const f=Training.createFixture(i,options);E.assertInvariants(f.state);
    for(let p=0;p<2;p++){
      const player=f.state.players[p],cards=[...player.deck,...player.hand.map(h=>h.cardId),...f.state.units.filter(u=>u.owner===p).map(u=>u.cardId)];
      assert.equal(cards.length,26);assert.equal(Decks.forData(D).validate({name:'Tactical exercise',faction:player.faction,cards,commanderId:player.commander.id}).legal,true);
    }
    assert.deepEqual(f.state,Training.createFixture(i,options).state,'fixture is deterministic');
  }
});
test('Cover/Breach exercise applies then removes protection through real combat',()=>{
  const r=Training.createRunner(0,options);let s=next(r);assert.equal(has(s.state,s.refs.defender,'cover'),true);
  s=next(r);assert.equal(s.complete,true);assert.equal(has(s.state,s.refs.defender,'cover'),false);
  assert.ok(s.history.flatMap(h=>h.events).some(e=>e.type==='damage'||e.type==='combat'),'actual combat resolves');
});
test('Blast exercise shows capped area damage and preserved wounds after dispersal',()=>{
  const r=Training.createRunner(1,options);let s=next(r),first=s.state.units.find(u=>u.uid===s.refs.defender),other=s.state.units.find(u=>u.uid===s.refs.other);
  assert.equal(first.damage,2);assert.equal(other.damage,2);s=next(r);assert.equal(s.state.units.find(u=>u.uid===s.refs.defender).territory,4);
  s=next(r);assert.equal(s.complete,true);assert.equal(s.state.units.find(u=>u.uid===s.refs.defender).damage,2,'later center Blast does not reach rear ground');
  assert.equal(s.state.units.find(u=>u.uid===s.refs.other)?.damage,4);
});
test('Dodge exercise uses deterministic Mark/Exposed counter and direct-hit consumption',()=>{
  const r=Training.createRunner(2,options);let s=next(r);assert.equal(has(s.state,s.refs.defender,'dodge'),true);
  s=next(r);assert.equal(has(s.state,s.refs.defender,'dodge'),false);assert.equal(has(s.state,s.refs.defender,'exposed'),true);
  s=next(r);assert.equal(s.complete,true);assert.equal(has(s.state,s.refs.defender,'exposed'),false);
});
test('Suppression does not cancel existing Overwatch: voluntary entry triggers it once',()=>{
  const r=Training.createRunner(3,options);let s=next(r);assert.equal(has(s.state,s.refs.watcher,'overwatch'),true);
  s=next(r);assert.equal(has(s.state,s.refs.watcher,'suppression'),true);assert.equal(has(s.state,s.refs.watcher,'overwatch'),true);
  s=next(r);assert.equal(s.complete,true);assert.equal(s.state.units.find(u=>u.uid===s.refs.entrant).damage,2);assert.equal(has(s.state,s.refs.watcher,'overwatch'),false);
});
test('Sacrifice exercise pauses without mutation for confirmation, pays cost and grants no casualty cards',()=>{
  const r=Training.createRunner(4,options);let s=next(r),before=JSON.stringify(s.state),wounds=s.state.units.find(u=>u.uid===s.refs.survivor).damage;
  const pending=r.next(false);assert.equal(pending.requiresConfirmation,true);assert.equal(JSON.stringify(r.snapshot().state),before);
  s=next(r,true);assert.equal(s.complete,true);assert.ok(!s.state.units.some(u=>u.uid===s.refs.cost));
  assert.equal(s.state.units.find(u=>u.uid===s.refs.survivor).damage,Math.max(0,wounds-3));assert.equal(s.state.players[0].hand.length,0,'only Order was spent; no casualty draw');
  const death=s.history.flatMap(h=>h.events).find(e=>e.type==='death'&&e.uid===s.refs.cost);assert.equal(death.cause,'sacrifice');
});
test('Smoke exercise blocks a reaction only within real expiry window',()=>{
  const r=Training.createRunner(5,options);let s=next(r);s=next(r);assert.equal(E.territoryStatuses(s.state,3).length,1);
  s=next(r);assert.equal(s.state.units.find(u=>u.uid===s.refs.entrant).damage,0);assert.equal(has(s.state,s.refs.watcher,'overwatch'),true,'blocked reaction is not fired');
  s=next(r);assert.equal(s.complete,true);assert.equal(E.territoryStatuses(s.state,3).length,0);assert.equal(has(s.state,s.refs.watcher,'overwatch'),false);
});
test('presentation diff distinguishes voluntary destruction from reclaim and combat death',()=>{
  const f=Training.createFixture(4,options),before=f.state,after=JSON.parse(JSON.stringify(before)),unit=before.units.find(u=>u.uid===f.refs.cost);after.units=after.units.filter(u=>u.uid!==unit.uid);
  const events=FX.deriveEvents(before,after,{type:'order'},[{type:'death',uid:unit.uid,cause:'sacrifice'}]);
  assert.equal(events.find(e=>e.unit?.uid===unit.uid).type,'sacrifice');
});
