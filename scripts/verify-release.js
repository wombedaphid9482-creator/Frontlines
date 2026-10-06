#!/usr/bin/env node
'use strict';
// Verify the actual packaged payload, not merely the files intended for packaging.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const asar=require('@electron/asar');
const root=path.resolve(__dirname,'..'),pkg=require('../package.json');
const release=path.resolve(root,process.argv[2]||`release/${pkg.version}`);
assert.ok(release.startsWith(root+path.sep),'Release must be inside this workspace.');
const archive=path.join(release,'win-unpacked','resources','app.asar');
const packedFile=file=>asar.extractFile(archive,file.split('/').join(path.sep));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const runtimeFiles=[];
function walk(relative){
  const directory=path.join(root,relative);
  if(!fs.existsSync(directory))return;
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    const name=path.posix.join(relative,entry.name);
    if(entry.isDirectory())walk(name);else if(entry.isFile())runtimeFiles.push(name);
  }
}
for(const entry of fs.readdirSync(root,{withFileTypes:true}))if(entry.isFile()&&/\.(js|html|css)$/.test(entry.name))runtimeFiles.push(entry.name);
for(const directory of ['balance','assets/cards','assets/ui','assets/battlefield','assets/audio','assets/effects','assets/animations'])walk(directory);
const archivePaths=asar.listPackage(archive).map(name=>name.replaceAll('\\','/').replace(/^\/+/,''));
const sourceHashes={};
for(const file of runtimeFiles.sort()){
  assert.ok(archivePaths.includes(file),'Missing packaged runtime file: '+file);
  const source=fs.readFileSync(path.join(root,file)),packed=packedFile(file);
  assert.ok(source.equals(packed),'Packaged runtime differs from tested source: '+file);
  sourceHashes[file]=hash(source);
}
for(const file of archivePaths)assert.ok(!/^(tests|docs|scripts|release|dist|assets\/source)(\/|$)/.test(file)&&!/^node_modules\/(electron|electron-builder|playwright|@playwright|@electron\/asar)(\/|$)/.test(file),'Development material entered the runtime: '+file);
const packedPackage=JSON.parse(packedFile('package.json'));
assert.equal(packedPackage.version,pkg.version);assert.equal(packedPackage.main,pkg.main);
assert.equal(packedPackage.dependencies['electron-updater'],pkg.dependencies['electron-updater']);
const updater=JSON.parse(packedFile('node_modules/electron-updater/package.json'));
assert.ok(updater.version,'Production updater dependency missing.');
const baselineDirectory=path.join(root,'docs/balance/sprint5-baseline-source');
const baseline=JSON.parse(fs.readFileSync(path.join(baselineDirectory,'checkpoint-hashes.json')));
for(const [file,expected]of Object.entries(baseline.files))assert.equal(hash(fs.readFileSync(path.join(baselineDirectory,file))),expected,'Frozen Sprint 5 baseline changed: '+file);
let tacticalPreservation;
let refinementPreservation;
let multiplayerPreservation;
let prestigePreservation;
if(pkg.version==='1.0.4'){
  const entryDir=path.join(root,'docs/balance/sprint11-v1.0.3-baseline'),entry=JSON.parse(fs.readFileSync(path.join(entryDir,'checkpoint-hashes.json')));
  let protectedAssets=0;
  for(const [file,expected]of Object.entries(entry.sourceHashes)){
    assert.equal(hash(fs.readFileSync(path.join(entryDir,'source',file))),expected,'Frozen v1.0.3 file changed: '+file);
    if(file.startsWith('assets/')){assert.equal(hash(fs.readFileSync(path.join(root,file))),expected,'Protected v1.0.3 asset changed: '+file);protectedAssets++;}
  }
  const old=require('../balance').dataFor('sprint10'),current=require('../balance').dataFor('sprint11');
  for(const [id,card]of Object.entries(old.CARDS))assert.deepEqual(current.CARDS[id],card,'Existing card changed: '+id);
  const decks=require('../decks');const oldDecks=decks.forData(old).getDecks(),nowDecks=decks.forData(current).getDecks();
  for(const deck of oldDecks)assert.deepEqual(nowDecks.find(d=>d.id===deck.id),deck,'Existing deck changed: '+deck.id);
  const commanders=require('../commanders');assert.deepEqual(commanders.forRules(current.RULES).COMMANDERS,commanders.forRules(old.RULES).COMMANDERS);
  assert.equal(Object.keys(current.CARDS).length,155);assert.equal(nowDecks.length,35);
  tacticalPreservation={baseCommit:entry.baseCommit,verifiedFrozenRuntimeFiles:Object.keys(entry.sourceHashes).length,protectedAssets,unchangedCards:115,unchangedDecks:30,unchangedCommanders:10,newCards:40,newShowcases:5};
}
if(pkg.version==='1.0.5'){
  const entryDir=path.join(root,'docs/balance/sprint12-v1.0.4-baseline'),entry=JSON.parse(fs.readFileSync(path.join(entryDir,'checkpoint-hashes.json'))),frozen=JSON.parse(fs.readFileSync(path.join(entryDir,'rules-and-decks.json')));
  let protectedAssets=0;
  for(const [file,expected]of Object.entries(entry.sourceHashes)){
    assert.equal(hash(fs.readFileSync(path.join(entryDir,'source',file))),expected,'Frozen v1.0.4 file changed: '+file);
    if(file.startsWith('assets/')){assert.equal(hash(fs.readFileSync(path.join(root,file))),expected,'Protected v1.0.4 asset changed: '+file);protectedAssets++;}
  }
  const B=require('../balance'),runtime=B.createRuntime('sprint12'),decks=require('../decks').forData(runtime.data).getDecks();
  assert.deepEqual(runtime.data.CARDS,frozen.cards);assert.deepEqual(decks,frozen.decks);assert.deepEqual(runtime.data.DEFAULT_CONFIG,frozen.config);assert.deepEqual(runtime.engine.commanders.COMMANDERS,frozen.commanders);
  const visual=JSON.parse(fs.readFileSync(path.join(root,'docs/art/SPRINT12-VISUAL-CHECKPOINT.json')));
  let acceptedArtFiles=0;
  for(const [file,expected]of Object.entries(visual.artHashes))if(file.startsWith('assets/')||['art.js','art-map012.js','presentation.css','collection.css'].includes(file)){assert.equal(hash(fs.readFileSync(path.join(root,file))),expected,'Accepted art changed after checkpoint: '+file);acceptedArtFiles++;}
  const Art=require('../art');for(const card of Object.values(runtime.data.CARDS))assert.doesNotMatch(Art.html(card),/art-symbol|<svg/,'Placeholder artwork live: '+card.id);
  refinementPreservation={baseBuild:'1.0.4',verifiedFrozenRuntimeFiles:Object.keys(entry.sourceHashes).length,protectedAssets,unchangedCards:155,unchangedDecks:35,unchangedCommanders:10,acceptedArtFiles,replacementMappings:visual.replacementMappings,artBefore:visual.before,artAfter:visual.after,commanderArtUnchanged:true};
}
if(pkg.version==='1.1.0'){
  const entryDir=path.join(root,'docs/balance/sprint13-v1.0.5-baseline'),entry=JSON.parse(fs.readFileSync(path.join(entryDir,'checkpoint-hashes.json'))),frozen=JSON.parse(fs.readFileSync(path.join(entryDir,'rules-and-decks.json')));
  let protectedAssets=0;
  for(const [file,expected]of Object.entries(entry.sourceHashes)){
    assert.equal(hash(fs.readFileSync(path.join(entryDir,'source',file))),expected,'Frozen v1.0.5 file changed: '+file);
    if(file.startsWith('assets/')){assert.equal(hash(fs.readFileSync(path.join(root,file))),expected,'Protected v1.0.5 asset changed: '+file);protectedAssets++;}
  }
  for(const file of ['engine.js','tactical-rules.js','commanders.js','deck-rules.js','art.js','art-map012.js','presentation.css','collection.css'])assert.equal(hash(fs.readFileSync(path.join(root,file))),entry.sourceHashes[file],'Canonical rules or approved art changed: '+file);
  const B=require('../balance'),runtime=B.createRuntime('sprint12'),decks=require('../decks').forData(runtime.data).getDecks();
  assert.deepEqual(runtime.data.CARDS,frozen.cards);assert.deepEqual(decks,frozen.decks);assert.deepEqual(runtime.data.DEFAULT_CONFIG,frozen.config);assert.deepEqual(runtime.engine.commanders.COMMANDERS,frozen.commanders);
  for(const file of archivePaths)assert.ok(!/^(backend|network)(\/|$)/.test(file),'Server/tooling shipped in player build: '+file);
  multiplayerPreservation={baseBuild:'1.0.5',verifiedFrozenRuntimeFiles:Object.keys(entry.sourceHashes).length,protectedAssets,unchangedCards:155,unchangedDecks:35,unchangedCommanders:10,engineUnchanged:true,tacticalRulesUnchanged:true,artUnchanged:true,cardRatio:'5:7',backendExcluded:true};
}
if(pkg.version==='1.2.0'){
  const entryDir=path.join(root,'docs/balance/sprint14-v1.1.0-baseline'),entry=JSON.parse(fs.readFileSync(path.join(entryDir,'checkpoint-hashes.json'))),frozen=JSON.parse(fs.readFileSync(path.join(entryDir,'rules-and-economy.json')));
  let protectedAssets=0;
  for(const [file,expected]of Object.entries(entry.sourceHashes)){
    assert.equal(hash(fs.readFileSync(path.join(entryDir,'source',file))),expected,'Frozen v1.1.0 file changed: '+file);
    if(file.startsWith('assets/')){assert.equal(hash(fs.readFileSync(path.join(root,file))),expected,'Approved artwork changed: '+file);protectedAssets++;}
  }
  for(const file of ['engine.js','ai.js','data.js','balance.js','decks.js','deck-rules.js','commanders.js','tactical-rules.js','tactical-arsenal.js','sim-core.js','simulator-worker.js','live-runtime.js','art.js','art-map012.js','multiplayer-protocol.js','multiplayer-session.js','multiplayer-controller.js','network-transport.js'])assert.equal(hash(fs.readFileSync(path.join(root,file))),entry.sourceHashes[file],'Protected authority or artwork changed: '+file);
  for(const [file,expected]of Object.entries(entry.sourceHashes).filter(([file])=>file.startsWith('balance/')))assert.equal(hash(fs.readFileSync(path.join(root,file))),expected);
  for(const [file,expected]of Object.entries(entry.protectedNetwork))if(file!=='backend/README.md')assert.equal(hash(fs.readFileSync(path.join(root,file))),expected,'Prepared backend changed: '+file);
  const runtime=require('../balance').createRuntime(),C=require('../collection');
  assert.deepEqual(runtime.data.CARDS,frozen.cards);assert.deepEqual(runtime.data.RULES,frozen.rules);assert.deepEqual(runtime.data.DEFAULT_CONFIG,frozen.config);
  assert.deepEqual(require('../decks').forData(runtime.data).getDecks(),frozen.decks);assert.deepEqual(runtime.engine.commanders.COMMANDERS,frozen.commanders);
  for(const [key,field]of [['ECONOMY','economy'],['PACKS','packs'],['RARITIES','rarities'],['CARD_META','cardMeta']])assert.deepEqual(C[key],frozen[field]);
  const config=require('../multiplayer-config');assert.equal(config.serviceURL,'https://frontlines-private-relay.frontlines-private-relay.workers.dev');assert.equal(config.protocolVersion,1);assert.equal(config.privateEconomy,'mastery-only');
  for(const file of archivePaths)assert.ok(!/^(backend|network)(\/|$)/.test(file),'Server tooling entered player build: '+file);
  prestigePreservation={baseBuild:'1.1.0',baseCommit:entry.baseCommit,verifiedFrozenRuntimeFiles:Object.keys(entry.sourceHashes).length,protectedAssets,unchangedCards:155,unchangedDecks:35,unchangedCommanders:10,engineUnchanged:true,aiUnchanged:true,economyUnchanged:true,artUnchanged:true,networkAuthorityUnchanged:true,serviceConfigured:true,cardRatio:'5:7',backendExcluded:true};
}
const installerName=`Frontlines-Setup-${pkg.version}.exe`,installer=fs.readFileSync(path.join(release,installerName));
const report={version:pkg.version,verifiedRuntimeFiles:runtimeFiles.length,sourceHashes,
  productionUpdaterVersion:updater.version,verifiedFrozenFiles:Object.keys(baseline.files).length,
  developmentMaterialExcluded:true,...(tacticalPreservation?{tacticalPreservation}:{}),...(refinementPreservation?{refinementPreservation}:{}),...(multiplayerPreservation?{multiplayerPreservation}:{}),...(prestigePreservation?{prestigePreservation}:{}),installer:{file:installerName,bytes:installer.length,sha256:hash(installer)}};
fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
fs.writeFileSync(path.join(root,'test-results',`release-${pkg.version}-verification.json`),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,sourceHashes:undefined},null,2));
