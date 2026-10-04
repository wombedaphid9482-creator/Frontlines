'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Data=require('../data.js'),Decks=require('../decks.js'),Commanders=require('../commanders.js');
const CurrentData={...Data,CARDS:{...Data.CARDS,...require('../arsenal.js').CARD_ADDITIONS},RULES:{...Data.RULES,commanders:true}};
const Current=Decks.forData(CurrentData);
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};};
test('ten Commander foundations are legal, different within every faction and outside the card list',()=>{
  const foundations=Current.commanderStarters();assert.equal(foundations.length,10);assert.equal(new Set(foundations.map(d=>d.commanderId)).size,10);
  for(const f of Object.keys(Data.FACTIONS)){
    const pair=foundations.filter(d=>d.faction===f);assert.equal(pair.length,2);assert.notDeepEqual(pair[0].cards,pair[1].cards);
    for(const d of pair){assert.equal(Current.validate(d).legal,true,d.id);assert.equal(d.cards.length,26);assert.equal(d.cards.includes(d.commanderId),false);assert.equal(Commanders.get(d.commanderId).faction,d.faction);}
  }
});
test('Commander foundation inventory is the minimum max-copy union with old starters preserved',()=>{
  const grants=Current.starterGrant();assert.equal(Object.keys(grants).length,63);assert.equal(Object.values(grants).reduce((a,b)=>a+b,0),171);
  for(const d of Current.starters().concat(Current.commanderStarters()))for(const[id,count]of Object.entries(Current.validate(d).counts))assert.ok(grants[id]>=count,id);
  for(const d of Current.starters())assert.deepEqual(d.cards,Data.DECKS[d.faction]);
  for(const[id,count]of Object.entries(grants))assert.ok(count<=Current.copyLimit(CurrentData.CARDS[id]),id);
});
test('legacy Commander migration preserves names, IDs, cards and source storage until saved',()=>{
  const store=storage(),legacy={...Decks.starters()[0],id:'legacy-save',source:'saved'};store.setItem(Decks.STORAGE_KEY,JSON.stringify([legacy]));const raw=store.getItem(Decks.STORAGE_KEY),loaded=Current.load(store)[0];
  assert.equal(loaded.commanderId,'commander_stonewall_warden');assert.equal(loaded.id,legacy.id);assert.deepEqual(loaded.cards,legacy.cards);assert.equal(store.getItem(Decks.STORAGE_KEY),raw);
  assert.match(Current.storageDiagnostics(store).warnings.join(' '),/assigned The Warden.*cards were preserved/);assert.equal(Current.validate(loaded).legal,true);
  assert.equal(Current.save(loaded,store).ok,true);assert.equal(JSON.parse(store.getItem(Decks.STORAGE_KEY))[0].commanderId,'commander_stonewall_warden');assert.equal(Current.storageDiagnostics(store).warnings.length,0);
});
test('explicit unavailable, empty and wrong-faction Commander choices remain repairable saved decks',()=>{
  for(const commanderId of ['future_commander','','commander_bruiser_breaker']){
    const d={...Current.starters()[0],id:'repair-'+(commanderId||'empty'),commanderId},store=storage(),saved=Current.save(d,store);
    assert.equal(saved.ok,true);assert.equal(Current.load(store)[0].commanderId,commanderId);assert.equal(Current.validate(saved.deck).legal,false);
    assert.deepEqual(saved.deck.cards,d.cards);assert.match(Current.validate(saved.deck).errors.join(' '),/Commander|different faction/);
  }
});
test('Commander IDs survive duplicate, rename, JSON exchange and draft saves',()=>{
  const d=Current.commanderStarters()[1],store=storage(),copy=Current.duplicate(d,'Marshal custom',store);assert.equal(copy.ok,true);assert.notEqual(copy.deck.id,d.id);assert.equal(copy.deck.commanderId,d.commanderId);
  const round=Current.importDeck(Current.exportDeck(copy.deck));assert.equal(round.commanderId,d.commanderId);assert.deepEqual(round.cards,d.cards);round.cards.pop();const saved=Current.save(round,store);assert.equal(saved.ok,true);assert.equal(Current.validate(saved.deck).legal,false);assert.equal(saved.deck.commanderId,d.commanderId);
});
test('invalid Commander payloads are safely rejected instead of corrupting deck storage',()=>{
  for(const commanderId of [null,{},[],42,'__proto__','constructor','prototype','x'.repeat(101)]){
    const d={...Current.starters()[0],commanderId};assert.equal(Current.save(d,storage()).ok,false);assert.throws(()=>Current.importDeck(JSON.stringify(d)),/Commander/);
  }
});
test('historical profiles keep original catalogs and ignore the new Commander requirement',()=>{
  assert.equal(Decks.commandersEnabled(),false);assert.equal(Decks.starters().length,5);assert.equal(Decks.presets().length,10);assert.equal(Decks.getDecks(storage()).length,15);assert.equal(Current.getDecks(storage()).length,25);
  const d={...Decks.starters()[0],commanderId:'future_commander'};assert.equal(Decks.validate(d).legal,true);assert.equal(Current.validate(d).legal,false);
});
test('seeded random legal decks get a faction Commander under current rules',()=>{
  for(const faction of Object.keys(Data.FACTIONS)){const a=Current.random(faction,902);assert.deepEqual(a,Current.random(faction,902));assert.equal(Current.validate(a).legal,true);assert.equal(Commanders.get(a.commanderId).faction,faction);}
});
