'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),B=require('../balance'),Training=require('../tactical-training'),Decks=require('../decks'),Opponents=require('../playtest-opponents');
const R=B.createRuntime('sprint12'),E=R.engine,D=R.data,L=Decks.forData(D),copy=x=>JSON.parse(JSON.stringify(x));
test('all six tactical exercises replay exactly from JSON state and ordered intents',()=>{
  const old=B.createRuntime('sprint11').engine,observed=new Set();
  for(let i=0;i<6;i++){
    const runner=Training.createRunner(i,{data:D,engine:E}),initial=runner.snapshot().state;
    for(let n=0;n<8&&!runner.snapshot().complete;n++)runner.next(true);
    const finished=runner.snapshot();assert.equal(finished.complete,true);let state=copy(initial);
    for(const step of finished.history){
      const untouched=JSON.stringify(state),a=E.dispatch(state,copy(step.action),{events:true}),b=E.dispatch(copy(state),copy(step.action),{events:true}),historical=old.dispatch(copy(state),copy(step.action),{events:true});
      assert.equal(a.ok,true,a.error);assert.deepEqual(a,b);assert.deepEqual(a.state,historical.state);assert.deepEqual(a.events,historical.events);assert.deepEqual(a.events,step.events);assert.equal(JSON.stringify(state),untouched);
      E.assertInvariants(a.state);for(const event of a.events){if(event.status)observed.add(event.status);if(event.type==='destroy'&&event.cause)observed.add(event.cause);}
      state=copy(a.state);
    }
    assert.deepEqual(state,finished.state);
  }
  for(const status of ['cover','dodge','suppression','overwatch','exposed','smoke'])assert.ok(observed.has(status),status);
});
test('Commander state and an unresolved Response survive serialization without changing resolution',()=>{
  let s=Training.createFixture(0,{data:D,engine:E}).state;
  const cmd=s.players[0].commander;cmd.used=true;cmd.passiveTurn=s.turn;
  s.attacker=1;const attacker=s.units.find(u=>u.owner===1),target=s.units.find(u=>u.owner===0),attack={type:'attack',unitUid:attacker.uid,targetUid:target.uid};
  const r=E.dispatch(s,attack,{events:true});assert.equal(r.ok,true);assert.ok(r.state.response);assert.deepEqual(copy(r.state).players[0].commander,cmd);
  const response={type:'respond',pass:true};assert.deepEqual(E.dispatch(r.state,response,{events:true}),E.dispatch(copy(r.state),copy(response),{events:true}));
  const invalid={type:'move',unitUid:attacker.uid,territory:0},before=JSON.stringify(r.state),rejected=E.dispatch(r.state,invalid,{events:true});assert.equal(rejected.ok,false);assert.equal(JSON.stringify(rejected.state),before);assert.strictEqual(rejected.state,r.state);
});
test('seeded reserve recycling reproduces after reload and is independent of ambient random/clock',()=>{
  const s=E.createGame({seed:1205,factions:['stonewall','bruiser']});s.units=[];
  for(const p of s.players){p.deck=[];p.hand=[];p.discard=L.starters().find(d=>d.faction===p.faction).cards.slice();}
  const first=E.dispatch(s,{type:'endTurn'},{events:true});assert.equal(first.ok,true);assert.ok(first.state.players[1].hand.length);assert.ok(first.state.players[1].deck.length);
  const random=Math.random,now=Date.now;try{Math.random=()=>{throw Error('Ambient randomness during resolution');};Date.now=()=>{throw Error('Clock during resolution');};assert.deepEqual(E.dispatch(copy(s),{type:'endTurn'},{events:true}),first);}finally{Math.random=random;Date.now=now;}
});
test('random opponents include all showcases with legal faction/Commander/deck combinations and avoid-last',()=>{
  const Commanders=E.commanders,showcases=L.getDecks().filter(d=>d.deckGroup==='tactical-showcase');assert.equal(showcases.length,5);
  for(const deck of L.getDecks()){
    const only={...L,getDecks:()=>[deck]},choice=Opponents.choose(only,Commanders,{seed:12});assert.equal(choice.faction,deck.faction);assert.equal(L.validate({...deck,commanderId:choice.commanderId}).legal,true);
    const next=Opponents.choose(L,Commanders,{seed:12,avoidKey:Opponents.key(choice)});assert.notEqual(Opponents.key(next),Opponents.key(choice));assert.equal(L.validate({...L.getDecks().find(d=>d.id===next.deckId),commanderId:next.commanderId}).legal,true);
  }
});
