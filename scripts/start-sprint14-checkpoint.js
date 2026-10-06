'use strict';
// Preserve the stable v1.1.0 candidate and its economy before cosmetic work.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f)),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),json=f=>JSON.parse(read(f));
const pkg=json('package.json'),release=json('release/1.1.0/manifest.json'),verified=json('test-results/release-1.1.0-verification.json');
assert.equal(pkg.version,'1.1.0');assert.equal(release.version,'1.1.0');assert.equal(release.tests.node.passed,554);assert.equal(release.published,false);
assert.match(read('test-results/sprint14-entry-node.log').toString(),/pass 554/);assert.match(read('test-results/sprint14-entry-node.log').toString(),/fail 0/);
for(const item of [...release.artifacts,release.sourceCheckpoint])assert.equal(sha(read(item.file)),item.sha256,'Candidate artifact changed: '+item.file);
const dest=path.join(root,'docs/balance/sprint14-v1.1.0-baseline');assert.ok(!fs.existsSync(dest),'Preserve existing baseline.');fs.mkdirSync(dest,{recursive:true});
for(const [file,expected]of Object.entries(verified.sourceHashes)){
  const bytes=read(file);assert.equal(sha(bytes),expected,'Source/package mismatch: '+file);
  const target=path.join(dest,'source',file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
}
fs.writeFileSync(path.join(dest,'source/package.json'),read('package.json'));
const B=require('../balance'),R=B.createRuntime('sprint12'),L=require('../decks').forData(R.data),C=require('../collection');
const networkFiles=['network/cloudflare-worker.mjs','network/relay-room.mjs','backend/package.json','backend/package-lock.json','backend/wrangler.jsonc','backend/README.md'];
const protectedNetwork=Object.fromEntries(networkFiles.map(f=>[f,sha(read(f))]));
fs.writeFileSync(path.join(dest,'rules-and-economy.json'),JSON.stringify({cards:R.data.CARDS,rules:R.data.RULES,config:R.data.DEFAULT_CONFIG,decks:L.getDecks(),commanders:R.engine.commanders.COMMANDERS,glossary:R.data.GLOSSARY,rarities:C.RARITIES,cardMeta:C.CARD_META,economy:C.ECONOMY,packs:C.PACKS,starterCollection:C.STARTER_COLLECTION,commanderGrant:C.COMMANDER_CARD_GRANT},null,2)+'\n');
const record={version:'1.1.0',date:new Date().toISOString(),baseCommit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),sourceHashes:verified.sourceHashes,protectedNetwork,protectedArtifacts:release.artifacts,sourceCheckpoint:release.sourceCheckpoint,tests:554,entryTests:'test-results/sprint14-entry-node.log',networking:release.networking,saveSchema:{collectionVersion:C.VERSION,collectionSchema:C.SCHEMA_VERSION,collectionKey:C.STORAGE_KEY,deckKey:L.STORAGE_KEY},gameplayChanged:false,economyChanged:false};
fs.writeFileSync(path.join(dest,'checkpoint-hashes.json'),JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({baseline:path.relative(root,dest),files:Object.keys(record.sourceHashes).length,cards:Object.keys(R.data.CARDS).length,decks:L.getDecks().length,commanders:Object.keys(R.engine.commanders.COMMANDERS).length,tests:554,publicRelayActivated:record.networking.publicEndpointDeployed},null,2));
