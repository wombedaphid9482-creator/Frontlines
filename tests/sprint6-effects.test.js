'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const runtime=require('../balance').createRuntime('sprint6'),E=runtime.engine;
// Bind the presentation to the compiled live profile, as live-runtime.js does in the browser.
const context={FrontlinesData:runtime.data,module:{exports:{}}};
require('node:vm').runInNewContext(require('node:fs').readFileSync(require.resolve('../effects'),'utf8'),context);
const FX=context.module.exports;
function fixture(full=false){
  const state=E.createGame({seed:70603,config:{startingCommand:80,commandCap:80,captureThreshold:4,slotsPerTerritory:2,drawCount:0}});
  let id=90000;
  function field(cardId,owner,territory,damage=0){const unit={uid:'fx'+id++,cardId,owner,territory,damage,ready:true,deployedTurn:0,movedTurn:-1};state.units.push(unit);return unit;}
  field('stonewall_rifles',0,3);
  const defender=field('bruiser_heavy',1,3,2);
  if(full){field('bruiser_assault',1,4);field('bruiser_assault',1,4);}
  return {state,defender};
}
function diff(state){
  const action={type:'endTurn'},result=E.dispatch(state,action,{events:true});assert.equal(result.ok,true,result.error);E.assertInvariants(result.state);
  const before=JSON.stringify(state),after=JSON.stringify(result.state),rules=JSON.stringify(result.events);
  const events=FX.deriveEvents(state,result.state,action,result.events);
  assert.equal(JSON.stringify(state),before);assert.equal(JSON.stringify(result.state),after);assert.equal(JSON.stringify(result.events),rules);
  assert.equal(JSON.stringify(FX.deriveEvents(state,result.state,action,result.events)),JSON.stringify(events));
  return {events,result};
}
test('capture presentation distinguishes wounded forced retreat from ordinary movement and death',()=>{
  const {state,defender}=fixture(),{events}=diff(state);
  const retreat=events.find(e=>e.type==='retreat'&&e.unit.uid===defender.uid);
  assert.ok(retreat);assert.deepEqual([retreat.from,retreat.to,retreat.unit.damage],[3,4,2]);
  assert.ok(events.findIndex(e=>e.type==='capture')<events.indexOf(retreat));
  assert.ok(events.indexOf(retreat)<events.findIndex(e=>e.type==='frontline'));
  assert.ok(!events.some(e=>['move','death','rout'].includes(e.type)&&e.unit?.uid===defender.uid));
});
test('blocked retreat presents one encirclement elimination and released Presence after capture',()=>{
  const {state,defender}=fixture(true),{events,result}=diff(state);
  const rout=events.find(e=>e.type==='rout'&&e.unit.uid===defender.uid);assert.ok(rout);assert.equal(rout.presence,runtime.data.CARDS[defender.cardId].presence);
  assert.equal(events.filter(e=>e.unit?.uid===defender.uid).length,1);
  assert.ok(events.findIndex(e=>e.type==='capture')<events.indexOf(rout));assert.ok(events.indexOf(rout)<events.findIndex(e=>e.type==='frontline'));
  assert.ok(events.some(e=>e.type==='resource'&&e.player===1&&e.key==='committed'&&e.from-e.to===rout.presence));
  assert.ok(!result.state.units.some(u=>u.uid===defender.uid));
});
