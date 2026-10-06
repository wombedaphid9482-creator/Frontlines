'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../collection'),T=require('../tactical-arsenal'),B=require('../balance'),Decks=require('../decks');
const Frozen=require('../docs/balance/sprint11-v1.0.3-baseline/source/collection');
const clone=x=>JSON.parse(JSON.stringify(x));
function store(){const data=new Map();return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v))};}
function save(p){const storage=store();storage.setItem(C.STORAGE_KEY,JSON.stringify(p));return storage;}
test('155-card collection preserves every legacy metadata row, economy, original grant and Commander grant',()=>{
  assert.equal(Object.keys(C.CARD_META).length,155);
  for(const id of Object.keys(Frozen.CARD_META))assert.deepEqual(C.metadata(id),Frozen.metadata(id),id);
  for(const key of ['ECONOMY','PACKS','STARTER_COLLECTION','COMMANDER_CARD_GRANT'])assert.deepEqual(C[key],Frozen[key],key);
  assert.equal(C.SCHEMA_VERSION,Frozen.SCHEMA_VERSION);assert.equal(C.STORAGE_KEY,Frozen.STORAGE_KEY);
  for(const id of Object.keys(T.CARD_ADDITIONS)){const m=C.metadata(id);assert.ok(C.RARITIES.includes(m.rarity));assert.equal(m.starter,false);assert.equal(m.starterCopies,0);assert.equal(m.commanderStarterCopies,0);assert.equal(m.copyLimit,T.CARD_ADDITIONS[id].type==='leader'?2:4);assert.equal(m.packAvailable,true);assert.equal(m.craftCost,C.ECONOMY.craftCosts[m.rarity]);assert.ok(m.variants.includes('foil'));}
});
test('v1.0.3 save migration adds unowned definitions while preserving all progression and unrelated preferences',()=>{
  const old=Frozen.createProfile({seed:11});old.credits=4242;old.supply=777;old.cards.stonewall_rifles.mastery.points=26;old.cards.stonewall_rifles.variants.push('foil');old.cards.stonewall_rifles.preferredVariant='foil';old.futureData={kept:true};old.commanders.commander_stonewall_warden.mastery.matches=5;
  const s=save(old),other={'frontlines.settings.v1':'{"music":false,"avoidLastOpponent":true,"lastOpponent":"last-match"}','frontlines.tutorial.v1':'{"complete":true}','frontlines.decks.v1':'{"version":1,"decks":[]}'};
  for(const[k,v]of Object.entries(other))s.setItem(k,v);
  const migrated=C.load(s);assert.equal(migrated.readOnly,undefined);assert.equal(migrated.credits,4242);assert.equal(migrated.supply,777);assert.equal(migrated.rngState,old.rngState);assert.deepEqual(migrated.futureData,old.futureData);assert.deepEqual(migrated.commanders,old.commanders);
  for(const id of Object.keys(Frozen.CARD_META)){
    for(const [key,value] of Object.entries(old.cards[id]))assert.deepEqual(migrated.cards[id][key],value,id+'.'+key);
    assert.ok(migrated.cards[id].history,id+' additive history');assert.ok(migrated.cards[id].cosmetics,id+' additive cosmetic preferences');
  }
  for(const id of Object.keys(T.CARD_ADDITIONS)){assert.equal(migrated.cards[id].copies,0);assert.deepEqual(migrated.cards[id].variants,[]);assert.equal(migrated.cards[id].mastery.points,0);}
  assert.equal(C.craft('stonewall_dig_in',s,{requestId:'migration-proof'}).ok,true);
  const persisted=JSON.parse(s.getItem(C.STORAGE_KEY));assert.equal(Object.keys(persisted.cards).length,155);assert.equal(persisted.cards.stonewall_dig_in.copies,1);assert.equal(persisted.credits,4242);
  for(const[k,v]of Object.entries(other))assert.equal(s.getItem(k),v,k);
});
test('every expansion card is craftable, handles duplicate overflow and earns the same cosmetic mastery',()=>{
  for(const card of Object.values(T.CARD_ADDITIONS)){
    const profile=C.createProfile({seed:11});profile.supply=20000;const s=save(profile),meta=C.metadata(card.id);
    const crafted=C.craft(card.id,s,{requestId:'new-card'});assert.equal(crafted.ok,true,card.id);assert.equal(crafted.cost,meta.craftCost);assert.equal(crafted.profile.cards[card.id].copies,1);assert.deepEqual(crafted.profile.cards[card.id].variants,['standard']);
    const prepared=C.load(s);prepared.cards[card.id].copies=meta.copyLimit;prepared.packs.push({id:'overflow',definitionId:card.faction,name:'Overflow fixture',claimed:false,contents:Array(5).fill(null).map(()=>({cardId:card.id,rarity:meta.rarity,variant:'foil'})),acquisitions:[],supplyGained:0});prepared.cards[card.id].mastery.points=24;s.setItem(C.STORAGE_KEY,JSON.stringify(prepared));
    const claimed=C.claimPack('overflow',s);assert.equal(claimed.ok,true,card.id);assert.equal(claimed.profile.cards[card.id].copies,meta.copyLimit);assert.ok(claimed.supplyGained>=meta.duplicateSupply*5);assert.ok(claimed.profile.cards[card.id].variants.includes('foil'));
    const reward=C.rewardMatch({id:'earned-'+card.id,completed:true,human:true,mode:'match',ownTurns:4,meaningfulActions:4,victory:true,deckCardIds:[card.id],cardStats:{[card.id]:{deployments:1}}},s);assert.equal(reward.eligible,true);assert.ok(reward.profile.cards[card.id].variants.includes('fieldWorn'));assert.ok(reward.profile.cards[card.id].mastery.points>24);
    assert.equal(C.setPreferredVariant(card.id,'foil',s).ok,true);assert.equal(C.variantFor(card.id,C.load(s)),'foil');
  }
});
test('seeded pack generation includes expansion options and preserves rarity guarantees and deterministic state',()=>{
  const found=new Set();
  // This is a deterministic pack correctness fixture, never a match simulation.
  for(const faction of Object.keys(B.dataFor(B.DEFAULT_PROFILE).FACTIONS))for(const seed of [1,11,29,301,1209,2048,3007,4011]){
    const a=C.generatePack(faction,seed),b=C.generatePack(faction,seed);assert.deepEqual(a,b);assert.equal(a.contents.length,5);
    for(const item of a.contents){const m=C.metadata(item.cardId);assert.equal(m.faction,faction);assert.equal(m.rarity,item.rarity);if(T.CARD_ADDITIONS[item.cardId])found.add(faction);}
    assert.ok(C.RARITIES.indexOf(a.contents[4].rarity)>=1);
  }
  assert.equal(found.size,5,'Every faction pack can produce expansion cards');
});
test('all old custom decks and showcase copies retain legality independent of collection ownership',()=>{
  const legacy=Decks.forData(B.dataFor('sprint10')),current=Decks.forData(B.dataFor(B.DEFAULT_PROFILE)),profile=C.createProfile({seed:11});
  for(const d of legacy.getDecks()){const custom={...clone(d),id:'saved-'+d.id,source:'saved'};assert.equal(current.validate(custom).legal,true,custom.id);}
  for(const d of current.presets().filter(d=>d.set==='tactical-011')){assert.equal(current.validate(d).legal,true);assert.equal(C.canUseDeck(d,profile).complete,false);assert.ok(C.canUseDeck(d,profile).missing.every(m=>T.CARD_ADDITIONS[m.cardId]||m.required>m.owned));}
});
