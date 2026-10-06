'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),css=fs.readFileSync(path.join(root,'presentation.css'),'utf8');

test('full card faces share one canonical aspect ratio while battlefield units remain strips',()=>{
  assert.match(css,/:root\{--card-aspect-ratio:5\/7\}/);
  for(const selector of ['.hand-card','.arsenal-card-inspect']){
    const escaped=selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    assert.match(css,new RegExp(escaped+'\\{[^}]*aspect-ratio:var\\(--card-aspect-ratio\\)[^}]*contain:size'));
  }
  assert.match(css,/\.deck-grid\{display:grid;grid-template-columns:repeat\(auto-fill,minmax\(156px,200px\)\)/);
  assert.match(css,/\.full-card-preview \.hand-card\{[^}]*height:auto;min-height:0/);
  assert.match(css,/\.hand-card \.card-art>\.card-portrait:not\(\.art-symbol\)[^{]*\{[^}]*height:auto;aspect-ratio:1;background-size:200% 200%;transform:none/);
  assert.doesNotMatch(css,/\.unit[^{}]*\{[^}]*aspect-ratio:var\(--card-aspect-ratio\)/);
});

test('legal action styling uses readiness, shape and cursor in addition to color',()=>{
  assert.match(css,/\.hand-card\[data-card-state="playable"\]\{[^}]*opacity:1;filter:none;cursor:pointer/);
  assert.match(css,/\.hand-card\[data-card-state="unplayable"\][^{]*\{[^}]*saturate\(\.3\)[^}]*cursor:help/);
  assert.match(css,/\.territory\[data-target-state="legal"\]\{[^}]*border-style:double[^}]*cursor:crosshair/);
  assert.match(css,/\.unit\[data-target-state="legal"\]\{[^}]*border-style:dashed/);
  assert.match(css,/\.territory\[data-target-state="legal"\]:after\{content:'\\2713/);
  const commander=fs.readFileSync(path.join(root,'commander-ui.css'),'utf8');
  for(const state of ['ready','spent','no-target','unaffordable','inactive'])assert.ok(commander.includes('data-commander-state="'+state+'"'),state+' has an explicit Commander treatment');
});

test('approved legacy portrait mappings are exact and runtime artwork remains byte for byte',()=>{
  const baseline=JSON.parse(fs.readFileSync(path.join(root,'docs/release-1.0.2-manifest.json'),'utf8'));
  const hashes=baseline.verification.package.sourceHashes;
  // Sprint 11 adds an explicit map for forty new assets. Protect every previous
  // rendering result rather than forbidding this authorized additive module edit.
  const protectedFiles=Object.keys(hashes).filter(file=>file.startsWith('assets/'));
  assert.equal(protectedFiles.filter(file=>file.endsWith('starter-atlas.webp')).length,5,'Every faction atlas is protected');
  assert.equal(protectedFiles.filter(file=>file.endsWith('-portrait-v2.webp')).length,10,'Every approved Commander portrait is protected');
  for(const file of protectedFiles){
    const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
    assert.equal(actual,hashes[file],'Approved art or mapping changed: '+file);
  }
  const frozenRoot=path.join(root,'docs/balance/sprint11-v1.0.3-baseline/source');
  const context={module:{exports:{}}};context.globalThis=context;
  vm.runInNewContext(fs.readFileSync(path.join(frozenRoot,'art.js'),'utf8'),context);
  const oldArt=context.module.exports,newArt=require('../art.js').forVersion('1.0.4');
  const data=require('../balance.js').dataFor('sprint10');
  const plain=value=>JSON.parse(JSON.stringify(value));
  assert.equal(Object.keys(data.CARDS).length,115);
  for(const card of Object.values(data.CARDS)){
    assert.deepEqual(newArt.get(card),plain(oldArt.get(card)),card.id+' atlas map');
    for(const className of ['card-portrait','arsenal-portrait'])assert.equal(newArt.html(card,{className}),oldArt.html(card,{className}),card.id+' rendered portrait');
    assert.equal(newArt.illustration(card),oldArt.illustration(card),card.id+' vector identity');
  }
  for(const commander of require('../commanders.js').list()){
    assert.deepEqual(newArt.commanderGet(commander),plain(oldArt.commanderGet(commander)),commander.id);
    assert.equal(newArt.commanderHtml(commander),oldArt.commanderHtml(commander),commander.id);
    assert.equal(newArt.commanderSvg(commander),oldArt.commanderSvg(commander),commander.id);
  }
});
