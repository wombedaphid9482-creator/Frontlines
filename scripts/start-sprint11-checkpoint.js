'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),hash=b=>crypto.createHash('sha256').update(b).digest('hex'),read=f=>fs.readFileSync(path.join(root,f));
const base='7f388ec66fb80f4c8d9883b3111551dd8ab0e829';assert.equal(cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),base);
const verification=JSON.parse(read('test-results/release-1.0.3-verification.json')),dest=path.join(root,'docs/balance/sprint11-v1.0.3-baseline');
assert.ok(!fs.existsSync(dest),'Preserve existing checkpoint');fs.mkdirSync(dest,{recursive:true});
for(const [file,expected] of Object.entries(verification.sourceHashes)){
 const bytes=read(file);assert.equal(hash(bytes),expected,'Pre-sprint runtime changed: '+file);
 const target=path.join(dest,'source',file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
}
fs.writeFileSync(path.join(dest,'source','package.json'),read('package.json'));
const B=require('../balance.js'),D=B.dataFor('sprint10'),Decks=require('../decks.js').forData(D),E=require('../engine.js').withData(D);
const frozen={version:'1.0.3',baseCommit:base,sourceHashes:verification.sourceHashes,installer:verification.installer,baselineSource:'latest published v1.0.3',date:'2026-10-04'};
fs.writeFileSync(path.join(dest,'checkpoint-hashes.json'),JSON.stringify(frozen,null,2)+'\n');
fs.writeFileSync(path.join(dest,'rules-and-decks.json'),JSON.stringify({cards:D.CARDS,rules:D.RULES,config:D.DEFAULT_CONFIG,decks:Decks.getDecks(),commanders:E.commanders.COMMANDERS,glossary:D.GLOSSARY},null,2)+'\n');
console.log(JSON.stringify({base,version:'1.0.3',runtimeFiles:Object.keys(frozen.sourceHashes).length,cards:Object.keys(D.CARDS).length,decks:Decks.getDecks().length,checkpoint:path.relative(root,dest)}));
