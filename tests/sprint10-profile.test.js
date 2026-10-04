'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const B=require('../balance.js'),Decks=require('../decks.js'),S=require('../sim-core.js');
const old=B.dataFor('sprint9'),current=B.dataFor('sprint10');
test('recovery profile keeps all 115 combat values and the complete opening economy unchanged',()=>{
  assert.equal(B.DEFAULT_PROFILE,'sprint10');assert.equal(current.RULES.salvageRecovery,true);assert.equal(current.RULES.balanceRecovery,true);
  assert.deepEqual(current.DEFAULT_CONFIG,old.DEFAULT_CONFIG);assert.deepEqual(current.DECKS,old.DECKS);
  const changed=[];for(const id of Object.keys(old.CARDS)){
    for(const key of ['presence','attack','health','traits','effect','commandCost','unique','type','faction'])assert.deepEqual(current.CARDS[id][key],old.CARDS[id][key],id+' '+key);
    if(current.CARDS[id].rulesText!==old.CARDS[id].rulesText)changed.push(id);
  }
  assert.deepEqual(changed.sort(),['nightwalker_ghost_extraction','rogue_reclaim']);
  assert.match(current.GLOSSARY.Scavenge,/one casualty draw per player per global turn/);
  assert.match(current.GLOSSARY.Reclaim,/Wounds stay/);assert.match(old.GLOSSARY.Reclaim,/clearing wounds/);
});
test('exactly four presets receive legal role repairs while saved-list schemas and other decks remain intact',()=>{
  const previous=Decks.forData(old),next=Decks.forData(current),changed=[];
  for(const deck of next.getDecks()){
    assert.equal(next.validate(deck).legal,true,deck.id);assert.equal(deck.cards.length,26);
    const before=previous.getDecks().find(d=>d.id===deck.id);if(JSON.stringify(deck.cards)!==JSON.stringify(before.cards))changed.push(deck.id);
  }
  assert.deepEqual(changed.sort(),['bruiser-rolling-breakthrough','nightwalker-planned-exposure','stonewall-fortified-advance','syndicate-coordinated-removal']);
  assert.equal(next.getDecks().length,30);assert.equal(next.STORAGE_KEY,previous.STORAGE_KEY);
});
test('two deterministic integration fixtures exercise recovery rules, both seats and simulator provenance',()=>{
  const run=S.createRun({count:2,seed:1209,balanceProfile:'sprint10',ai:'deck',verify:true,deckA:'rogue-scavenger',deckB:'stonewall-fortified-advance'});
  while(!run.done)run.step();const report=run.result();
  assert.equal(report.completed,2);assert.equal(report.summary.errors,0);assert.equal(report.summary.unfinished,0);assert.equal(report.summary.decisive,2);
  assert.equal(report.rulesSnapshot.rulesVersion,'sprint10-recovery-v1');assert.equal(report.rulesSnapshot.engineVersion,'frontlines-territory-v6-salvage-recovery');
  assert.equal(report.rulesSnapshot.aiVersion,'frontlines-ai-sprint10-v1');assert.match(report.rulesSnapshot.mechanics.reclaim,/wounds/);
  assert.equal(report.matches[0].seed,report.matches[1].seed);assert.deepEqual(report.matches[0].commanderIds,report.matches[1].commanderIds.slice().reverse());
});
