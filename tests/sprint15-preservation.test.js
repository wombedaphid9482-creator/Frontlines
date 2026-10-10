'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const base=path.resolve(__dirname,'../docs/balance/sprint15-v1.2.0-baseline'),checkpoint=JSON.parse(fs.readFileSync(path.join(base,'checkpoint-hashes.json'))),frozen=JSON.parse(fs.readFileSync(path.join(base,'rules-and-economy.json')));
const B=require('../balance'),R=B.createRuntime('sprint15'),old=B.createRuntime('sprint12'),L=require('../decks').forData(R.data),C=require('../collection'),A=require('../art'),P=require('../multiplayer-protocol');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),read=f=>fs.readFileSync(path.resolve(__dirname,'..',f));
const withoutText=value=>Array.isArray(value)?value.map(withoutText):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>!['rulesText','text'].includes(key)).map(([key,x])=>[key,withoutText(x)])):value;
test('released v1.2.0 comparator is immutable across all 242 runtime files and historical profiles',()=>{
 assert.equal(Object.keys(checkpoint.sourceHashes).length,242);for(const [file,expected]of Object.entries(checkpoint.sourceHashes))assert.equal(sha(fs.readFileSync(path.join(base,'source',file))),expected,file);
 for(const [file,expected]of Object.entries(checkpoint.sourceHashes).filter(([file])=>file.startsWith('balance/')))assert.equal(sha(read(file)),expected,'historical profile '+file);
 assert.deepEqual(old.data.CARDS,frozen.cards);assert.deepEqual(old.data.RULES,frozen.rules);assert.deepEqual(old.data.DEFAULT_CONFIG,frozen.config);assert.deepEqual(old.engine.commanders.COMMANDERS,frozen.commanders);
});
test('paired timing preserves every printed number, role, trait, tactical definition and all 35 decks',()=>{
 assert.equal(B.DEFAULT_PROFILE,'sprint15');assert.equal(Object.keys(R.data.CARDS).length,155);assert.deepEqual(withoutText(R.data.CARDS),withoutText(frozen.cards));
 assert.deepEqual(R.data.DEFAULT_CONFIG,frozen.config);assert.deepEqual(withoutText(R.engine.commanders.COMMANDERS),withoutText(frozen.commanders));assert.equal(Object.keys(R.engine.commanders.COMMANDERS).length,10);
 assert.equal(L.getDecks().length,35);assert.deepEqual(L.getDecks(),frozen.decks);for(const d of L.getDecks())assert.equal(L.validate(d).legal,true,d.id);
});
test('all 169 approved assets, 155 artwork mappings and ten Commander portraits remain exact',()=>{
 const assets=Object.entries(checkpoint.sourceHashes).filter(([file])=>file.startsWith('assets/'));assert.equal(assets.length,169);
 for(const [file,expected]of assets)assert.equal(sha(read(file)),expected,file);for(const file of ['art.js','art-map012.js'])assert.equal(sha(read(file)),checkpoint.sourceHashes[file],file);
 for(const card of Object.values(R.data.CARDS)){const asset=A.get(card);assert.ok(asset?.src,card.id);assert.ok(fs.existsSync(path.resolve(__dirname,'..',asset.src)),card.id);assert.equal(sha(read(asset.src)),checkpoint.sourceHashes[asset.src],card.id);}
 for(const c of R.engine.commanders.list()){const asset=A.commanderGet(c);assert.ok(asset?.src,c.id);assert.equal(sha(read(asset.src)),checkpoint.sourceHashes[asset.src],c.id);}
});
test('collection/deck saves, pack odds, grants and match reward values survive v1.2→v1.3 unchanged',()=>{
 for(const [key,field]of [['ECONOMY','economy'],['PACKS','packs'],['RARITIES','rarities'],['CARD_META','cardMeta'],['STARTER_COLLECTION','starterCollection'],['COMMANDER_CARD_GRANT','commanderGrant']])assert.deepEqual(C[key],frozen[field]);
 assert.equal(C.STORAGE_KEY,checkpoint.saveSchema.collectionKey);assert.equal(C.SCHEMA_VERSION,checkpoint.saveSchema.collectionSchema);assert.equal(L.STORAGE_KEY,checkpoint.saveSchema.deckKey);assert.equal(sha(read('collection.js')),checkpoint.sourceHashes['collection.js']);assert.equal(sha(read('decks.js')),checkpoint.sourceHashes['decks.js']);
 const previous=require('../docs/balance/sprint15-v1.2.0-baseline/source/collection'),profile=previous.createProfile({seed:15150}),map=new Map([[C.STORAGE_KEY,JSON.stringify(profile)]]),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const migrated=C.load(storage);assert.deepEqual(migrated,profile);assert.equal(C.ECONOMY.matchVictory,previous.ECONOMY.matchVictory);assert.equal(C.ECONOMY.matchDefeat,previous.ECONOMY.matchDefeat);
 const deck={...frozen.decks[0],id:'saved-v120-custom',name:'My v1.2 Bastion',preset:false};assert.equal(L.validate(deck).legal,true);const code=L.exportDeck(deck),imported=L.importDeck(code);assert.deepEqual(imported.cards,deck.cards);assert.equal(imported.commanderId,deck.commanderId);
});
test('deployed relay, transport and private progression policy remain unchanged',()=>{
 for(const [file,expected]of Object.entries(checkpoint.protectedNetwork))if(file!=='backend/README.md')assert.equal(sha(read(file)),expected,file);
 for(const file of ['network-transport.js','multiplayer-config.js'])assert.equal(sha(read(file)),checkpoint.sourceHashes[file],file);
 const config=require('../multiplayer-config');assert.equal(config.serviceURL,'https://frontlines-private-relay.frontlines-private-relay.workers.dev');assert.equal(config.protocolVersion,1);assert.equal(config.privateEconomy,'mastery-only');
 assert.notEqual(P.createCompatibility(R).rulesetHash,P.createCompatibility(old).rulesetHash);
});
