'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
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

test('Sprint 10 presentation preserves approved portrait mappings and runtime artwork byte for byte',()=>{
  const baseline=JSON.parse(fs.readFileSync(path.join(root,'docs/release-1.0.2-manifest.json'),'utf8'));
  const hashes=baseline.verification.package.sourceHashes;
  const protectedFiles=Object.keys(hashes).filter(file=>file==='art.js'||file.startsWith('assets/'));
  assert.ok(protectedFiles.includes('art.js'),'Artwork mapping is protected');
  assert.equal(protectedFiles.filter(file=>file.endsWith('starter-atlas.webp')).length,5,'Every faction atlas is protected');
  assert.equal(protectedFiles.filter(file=>file.endsWith('-portrait-v2.webp')).length,10,'Every approved Commander portrait is protected');
  for(const file of protectedFiles){
    const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
    assert.equal(actual,hashes[file],'Approved art or mapping changed: '+file);
  }
});
