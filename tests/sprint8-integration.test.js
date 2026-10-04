'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const C=require('../collection'),B=require('../balance'),Decks=require('../decks'),S=require('../sim-core');
test('ownership is separate from gameplay legality and simulator inventories',()=>{
  const data=B.dataFor('sprint7'),decks=Decks.forData(data),profile=C.createProfile({seed:80801});
  const expanded=decks.presets().find(d=>d.archetype==='field-improvisation');
  assert.equal(decks.validate(expanded).legal,true);assert.equal(C.canUseDeck(expanded,profile).complete,false);
  const frozen=JSON.stringify(data),options={count:1,balanceProfile:'sprint7',deckA:expanded.id,deckB:'stonewall-starter',ai:'deck'};
  const snapshot=S.createRun(options).result().rulesSnapshot;assert.equal(snapshot.decks.find(d=>d.id===expanded.id).cards.length,26);assert.equal(Object.keys(snapshot.cards).length,115);assert.equal(JSON.stringify(data),frozen);
});
test('Sprint7 installer and source checkpoint remain immutable during progression work',()=>{
  const m=JSON.parse(fs.readFileSync('docs/release-0.8.0-manifest.json'));
  for(const row of [m.verification.package.installer,m.finalSourceCheckpoint]){
    const file=row.file.includes('/')?row.file:'release/0.8.0/'+row.file;
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),row.sha256,file);
  }
});
test('all browser entry points load collection before settings and isolate presentation',()=>{
  for(const file of ['index.html','deck-builder.html','collection.html']){
    const html=fs.readFileSync(file,'utf8');assert.ok(html.indexOf('collection.js')<html.indexOf('shell.js'),file);assert.ok(html.includes('presentation.css'),file);assert.ok(html.includes('music-data.js'),file);
  }
});
