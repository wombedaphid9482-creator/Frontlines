'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const D=require('../data.js'),B=require('../balance.js');
test('offline embedded profiles match reviewable JSON exactly',()=>{
  for(const profile of B.getProfiles())assert.deepEqual(JSON.parse(fs.readFileSync(path.join(__dirname,'../balance',profile.id+'.json'),'utf8')),profile);
});
test('baseline preserves card, deck and rule definitions with isolated profile copies',()=>{
  const before=JSON.stringify(D),base=B.dataFor('baseline');
  assert.deepEqual(base.CARDS,D.CARDS);assert.deepEqual(base.DECKS,D.DECKS);assert.deepEqual(base.DEFAULT_CONFIG,D.DEFAULT_CONFIG);
  base.CARDS.bruiser_heavy.health=1;base.DECKS.bruiser.pop();base.DEFAULT_CONFIG.captureThreshold=1;
  const next=B.dataFor('baseline');assert.equal(next.CARDS.bruiser_heavy.health,7);assert.equal(next.DECKS.bruiser.length,26);assert.equal(next.DEFAULT_CONFIG.captureThreshold,25);
  assert.equal(JSON.stringify(D),before);assert.throws(()=>B.dataFor('unknown'),/Unknown balance/);
});
test('every profile creates isolated authoritative rules and AI with valid faction decks',()=>{
  for(const profile of B.getProfiles()){
    const r=B.createRuntime(profile.id),s=r.engine.createGame({seed:1009,factions:['nightwalker','rogue']});
    assert.equal(r.profile.id,profile.id);assert.equal(r.data.BALANCE_PROFILE,profile.id);
    assert.deepEqual(r.ai.chooseAction(s),r.ai.chooseAction(s,{profile:'baseline'}));
    const result=r.engine.dispatch(s,r.ai.chooseAction(s,{profile:'faction'}));assert.equal(result.ok,true,result.error);r.engine.assertInvariants(result.state);
    for(const [faction,deck] of Object.entries(r.data.DECKS)){assert.equal(deck.length,26);assert.ok(deck.every(id=>r.data.CARDS[id].faction===faction));}
  }
});
