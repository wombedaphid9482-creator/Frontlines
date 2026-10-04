'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),Decks=require('../decks');
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};};
test('composition counts battlefield classes rather than support effect names',()=>{
  const current=Decks.forData(require('../balance').dataFor('sprint7'));
  const summary=current.composition({cards:['stonewall_bulwark_warden','bruiser_triage_rig','stonewall_plate_medic','stonewall_heavy','stonewall_medic']});
  assert.equal(summary.units,4);assert.equal(summary.orders,1);assert.equal(summary.heavy,2);assert.equal(summary.specialist,2);
  const historical=Decks.composition({cards:['stonewall_heavy','stonewall_medic','bruiser_bombard']});
  assert.equal(historical.heavy,1);assert.equal(historical.specialist,1);assert.equal(historical.orders,1);
});
test('deck rules and copy limits share one immutable contract',()=>{
  assert.equal(Object.isFrozen(Decks.RULES),true);assert.equal(Decks.copyLimit({type:'leader'}),2);assert.equal(Decks.copyLimit({type:'unit'}),4);
  assert.throws(()=>{Decks.RULES.size=30;});assert.equal(Decks.RULES.size,26);
  const first=Decks.presets()[0];first.cards.pop();assert.equal(Decks.presets()[0].cards.length,26);
});
test('retired cards, duplicate IDs and missing names recover as editable drafts',()=>{
  const s=storage(),base=Decks.starters()[0];s.setItem(Decks.STORAGE_KEY,JSON.stringify([{...base,id:'saved-a',cards:['retired_card']},{...base,id:'saved-a',name:''}]));
  const drafts=Decks.load(s),d=Decks.storageDiagnostics(s);assert.equal(drafts.length,2);assert.notEqual(drafts[0].id,drafts[1].id);assert.equal(Decks.validate(drafts[0]).legal,false);assert.equal(drafts[0].cards[0],'retired_card');assert.match(drafts[1].name,/Recovered/);assert.ok(d.recovered>=2);assert.match(d.warnings.join(' '),/Unavailable card/);
  assert.equal(Decks.save(drafts[1],s).ok,true);assert.equal(Decks.load(s).length,2);
});
test('unreadable records survive unrelated saves and removals',()=>{
  const s=storage(),bad={name:'Unknown future faction',faction:'future',cards:['future_thing']};s.setItem(Decks.STORAGE_KEY,JSON.stringify([bad]));
  const d=Decks.storageDiagnostics(s);assert.equal(d.rejected.length,1);assert.deepEqual(d.rejected[0].record,bad);
  const saved=Decks.duplicate(Decks.starters()[0],'Safe copy',s);assert.equal(saved.ok,true);assert.deepEqual(JSON.parse(Decks.recoveryExport(s)).at(-1),bad);
  assert.equal(Decks.remove(saved.deck.id,s).ok,true);assert.deepEqual(JSON.parse(Decks.recoveryExport(s)),[bad]);
});
test('malformed storage is preserved without overwriting owner data',()=>{
  const s=storage();s.setItem(Decks.STORAGE_KEY,'{broken original');assert.equal(Decks.storageDiagnostics(s).blocked,true);
  assert.equal(Decks.duplicate(Decks.starters()[0],'New',s).ok,false);assert.equal(Decks.recoveryExport(s),'{broken original');
});
test('builtins stay protected when old saved IDs collide with their names',()=>{
  const s=storage(),base=Decks.starters()[0];s.setItem(Decks.STORAGE_KEY,JSON.stringify([base]));assert.notEqual(Decks.load(s)[0].id,base.id);assert.equal(Decks.remove(base.id,s).ok,false);
  const save=Decks.save(Decks.presets()[0],s);assert.equal(save.ok,true);assert.match(save.deck.id,/^deck-/);assert.equal(Decks.presets()[0].cards.length,26);
});
