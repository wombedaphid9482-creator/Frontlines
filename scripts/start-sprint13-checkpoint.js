'use strict';
// Freeze the completed 1.0.5 release before any multiplayer runtime changes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f)),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),json=f=>JSON.parse(read(f));
const pkg=json('package.json'),release=json('docs/release-1.0.5-manifest.json'),verified=json('test-results/release-1.0.5-verification.json');
assert.equal(pkg.version,'1.0.5');assert.equal(release.version,'1.0.5');assert.equal(release.tests.node.passed,478);assert.equal(release.published,false);
const nodeLog=read('test-results/sprint13-entry-node.log').toString();assert.match(nodeLog,/pass 478/);assert.match(nodeLog,/fail 0/);assert.match(nodeLog,/skipped 0/);
for(const artifact of [...release.artifacts,release.sourceCheckpoint])assert.equal(sha(read(artifact.file)),artifact.sha256,'Stable release artifact changed: '+artifact.file);
const dest=path.join(root,'docs/balance/sprint13-v1.0.5-baseline');assert.ok(!fs.existsSync(dest),'Never overwrite a stable checkpoint.');fs.mkdirSync(dest,{recursive:true});
for(const [file,expected]of Object.entries(verified.sourceHashes)){const bytes=read(file);assert.equal(sha(bytes),expected,'Source differs from completed package: '+file);const target=path.join(dest,'source',file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);}
fs.writeFileSync(path.join(dest,'source/package.json'),read('package.json'));
const B=require('../balance'),R=B.createRuntime('sprint12'),D=R.data,L=require('../decks').forData(D),Collection=require('../collection');
assert.equal(Object.keys(D.CARDS).length,155);assert.equal(L.getDecks().length,35);assert.equal(Object.keys(R.engine.commanders.COMMANDERS).length,10);for(const d of L.getDecks())assert.equal(L.validate(d).legal,true);
fs.writeFileSync(path.join(dest,'rules-and-decks.json'),JSON.stringify({cards:D.CARDS,rules:D.RULES,config:D.DEFAULT_CONFIG,decks:L.getDecks(),commanders:R.engine.commanders.COMMANDERS,glossary:D.GLOSSARY},null,2)+'\n');
const record={version:'1.0.5',date:new Date().toISOString(),baseCommit:release.git.baseHead,newCommit:null,sourceHashes:verified.sourceHashes,installer:verified.installer,protectedArtifacts:release.artifacts,sourceCheckpoint:release.sourceCheckpoint,tests:478,entryTests:'test-results/sprint13-entry-node.log',entrySimulation:'test-results/sprint13-entry-sim.json',native:release.tests.native,art:release.art,saveSchema:{collectionVersion:Collection.VERSION,collectionSchema:Collection.SCHEMA_VERSION,collectionKey:Collection.STORAGE_KEY,deckKey:L.STORAGE_KEY},rulesChanged:false};
fs.writeFileSync(path.join(dest,'checkpoint-hashes.json'),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({version:record.version,files:Object.keys(record.sourceHashes).length,cards:155,decks:35,commanders:10,tests:478,checkpoint:path.relative(root,dest),installer:record.installer.sha256},null,2));
