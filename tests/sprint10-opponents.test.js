'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const B=require('../balance.js'),C=require('../commanders.js'),O=require('../playtest-opponents.js');
const Decks=require('../decks.js').forData(B.dataFor('sprint10'));
test('random enemy selects only legal faction, deck and Commander combinations deterministically',()=>{
  for(const seed of[1,42,1209,4294967295]){
    const pick=O.choose(Decks,C,{seed});assert.deepEqual(pick,O.choose(Decks,C,{seed}));
    const deck=Decks.getDecks().find(d=>d.id===pick.deckId);assert.equal(pick.faction,deck.faction);
    assert.equal(C.get(pick.commanderId).faction,deck.faction);assert.equal(Decks.validate({...deck,commanderId:pick.commanderId}).legal,true);
  }
});
test('random deck keeps the selected faction and Commander and avoids the previous opponent when possible',()=>{
  const options={faction:'nightwalker',commanderId:'commander_nightwalker_saboteur',seed:1209};
  const first=O.choose(Decks,C,options),next=O.choose(Decks,C,{...options,avoidKey:O.key(first)});
  assert.equal(next.faction,options.faction);assert.equal(next.commanderId,options.commanderId);assert.notEqual(next.deckId,first.deckId);
  assert.throws(()=>O.choose(Decks,C,{...options,commanderId:'commander_rogue_drifter'}),/No legal decks/);
});
test('malformed saved decks are excluded and one remaining legal configuration has a safe fallback',()=>{
  const good=Decks.starters()[0],one={getDecks:()=>[good,{...good,id:'invalid',cards:[]}],validate:Decks.validate};
  const opts={faction:good.faction,commanderId:good.commanderId,seed:42};const pick=O.choose(one,C,opts);
  assert.equal(pick.deckId,good.id);assert.deepEqual(O.choose(one,C,{...opts,avoidKey:O.key(pick)}),pick);
});
