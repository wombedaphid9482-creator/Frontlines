'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const D=require('../decks.js'),Data=require('../data.js'),E=require('../engine.js'),S=require('../sim-core.js');
const store=()=>{const entries=new Map();return {getItem:key=>entries.get(key)||null,setItem:(key,value)=>entries.set(key,value)};};
function complete(options){const run=S.createRun(options);while(!run.done)run.step();return run.result();}
test('original starters and ten distinct archetypes satisfy the same 26-card rules',()=>{
  assert.equal(D.starters().length,5);assert.equal(D.presets().length,10);
  for(const deck of D.starters().concat(D.presets()))assert.equal(D.validate(deck).legal,true,deck.id+' '+D.validate(deck).errors.join(' '));
  for(const faction of Object.keys(Data.FACTIONS)){const pair=D.presets().filter(d=>d.faction===faction);assert.equal(pair.length,2);assert.notDeepEqual(pair[0].cards,pair[1].cards);}
  const documented=JSON.parse(fs.readFileSync('docs/arsenal/deck-presets.json','utf8'));
  for(const preset of documented){const actual=D.presets().find(d=>d.faction===preset.faction&&d.archetype===preset.archetype);assert.deepEqual(D.validate(actual).counts,Object.fromEntries(Object.entries(preset.counts).map(([id,count])=>[preset.faction+'_'+id,count])));}
});
test('legality explains missing cards, faction mixing, copy caps, size and malformed input',()=>{
  const deck=D.starters()[0];deck.cards[0]='rogue_outrider';assert.match(D.validate(deck).errors.join(' '),/different faction/);
  deck.cards=Array(26).fill('stonewall_commander');assert.match(D.validate(deck).errors.join(' '),/at most 2/);
  deck.cards=['removed_card'];assert.match(D.validate(deck).errors.join(' '),/Unavailable card/);assert.equal(D.validate(null).legal,false);
});
test('saved drafts survive updates, copies have distinct IDs and delete preserves builtins',()=>{
  const storage=store(),base=D.starters()[0],first=D.duplicate(base,'My Bastion',storage);assert.equal(first.ok,true);assert.notEqual(first.deck.id,base.id);
  const second=D.duplicate(first.deck,'My variation',storage);assert.equal(second.ok,true);assert.notEqual(first.deck.id,second.deck.id);
  first.deck.cards[0]='retired_card';const saved=D.save(first.deck,storage);assert.equal(saved.ok,true);assert.equal(D.load(storage).length,2);assert.equal(D.validate(D.load(storage)[0]).legal,false);
  assert.equal(D.remove(first.deck.id,storage).ok,true);assert.equal(D.load(storage).length,1);assert.equal(D.starters()[0].cards.length,26);
});
test('imports roundtrip exact lists and reject malformed or excessive data safely',()=>{
  const deck=D.presets()[3],round=D.importDeck(D.exportDeck(deck));assert.deepEqual(round.cards,deck.cards);assert.equal(round.id,'');assert.equal(round.archetype,deck.archetype);
  for(const bad of ['{','null','[]',JSON.stringify({name:'X',faction:'constructor',cards:[]}),JSON.stringify({name:'X',faction:'rogue',cards:['__proto__']}),JSON.stringify({name:'X',faction:'other',cards:[]}),JSON.stringify({name:'X',faction:'rogue',cards:Array(501).fill('rogue_outrider')})])assert.throws(()=>D.importDeck(bad));
  const broken=store();broken.setItem(D.STORAGE_KEY,'invalid');assert.deepEqual(D.load(broken),[]);assert.equal(D.save(deck,{getItem:()=>null,setItem:()=>{throw Error('Quota exceeded');}}).ok,false);
});
test('composition counts all 26 cards and random generator is deterministic and legal',()=>{
  for(const faction of Object.keys(Data.FACTIONS)){const deck=D.random(faction,83947201);assert.deepEqual(deck,D.random(faction,83947201));assert.equal(D.validate(deck).legal,true);const c=D.composition(deck);assert.equal(c.curve.reduce((n,b)=>n+b.count,0),26);assert.equal(c.units+c.leaders+c.assets+c.orders,26);assert.ok(c.averageCost>0);}
});
test('live authoritative setup uses exact custom inventory and refuses illegal selection',()=>{
  const a=D.presets()[0],b=D.presets()[3],state=E.createGame({factions:[a.faction,b.faction],decks:[a,b],seed:4});
  for(let seat=0;seat<2;seat++){const player=state.players[seat];assert.deepEqual(player.deck.concat(player.hand.map(c=>c.cardId)).sort(),[a,b][seat].cards.slice().sort());assert.equal(player.deckMeta.archetype,[a,b][seat].archetype);}
  const illegal={...a,cards:a.cards.slice(1)};assert.throws(()=>E.createGame({factions:[a.faction,b.faction],decks:[illegal,b]}),/illegal/);assert.throws(()=>E.createGame({decks:[a,a],factions:['stonewall','bruiser']}),/does not match/);
});
test('simulated custom decks retain immutable lists and reproduce after local variants change',()=>{
  const a={...D.presets()[0],id:'custom-a',name:'Defense v1'},b={...D.presets()[3],id:'custom-b',name:'Push v1'};
  const report=complete({count:6,balanceProfile:'arsenal',ai:'deck',customDecks:[a,b],deckA:a.id,deckB:b.id,verify:true,seed:341});
  assert.equal(report.summary.errors,0);assert.equal(report.summary.decisive,6);assert.equal(report.summary.byDeck.length,2);assert.ok(report.summary.synergies.length>0);
  const replay=S.replayMatch(report,0);assert.equal(replay.match.winner,report.matches[0].winner);assert.equal(replay.match.decisions,report.matches[0].decisions);
  a.cards.pop();assert.equal(report.options.customDecks[0].cards.length,26);assert.equal(S.replayMatch(report,0).match.winner,replay.match.winner);
  assert.throws(()=>S.createRun({customDecks:[a],deckA:a.id}),/Illegal deck/);
});
test('round robin covers same-faction variants with paired seats and truthful cutoffs',()=>{
  const pool=D.presets().slice(0,3).map(d=>d.id),report=complete({mode:'matrix',deckPool:pool,count:6,maxDecisions:1,ai:'deck'});
  assert.equal(new Set(report.matches.map(m=>m.deckIds.join(':'))).size,6);assert.equal(report.summary.unfinished,6);assert.equal(report.summary.decisive,0);assert.equal(report.summary.synergies.length,0);
  for(let i=0;i<6;i+=2){assert.equal(report.matches[i].seed,report.matches[i+1].seed);assert.deepEqual(report.matches[i].deckIds,report.matches[i+1].deckIds.slice().reverse());}
});
