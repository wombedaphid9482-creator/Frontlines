'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const v=JSON.parse(read('test-results/release-1.0.4-verification.json')),m=JSON.parse(read('docs/release-1.0.4-manifest.json'));
assert.equal(require('../package.json').version,'1.0.4');assert.equal(m.tests.node.passed,448);assert.equal(m.published,false);
const dest=path.join(root,'docs/balance/sprint12-v1.0.4-baseline');assert.ok(!fs.existsSync(dest),'Never overwrite a stable checkpoint.');fs.mkdirSync(dest,{recursive:true});
for(const [file,expected]of Object.entries(v.sourceHashes)){const bytes=read(file);assert.equal(sha(bytes),expected,file);const target=path.join(dest,'source',file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);}
fs.writeFileSync(path.join(dest,'source','package.json'),read('package.json'));
const B=require('../balance'),D=B.dataFor('sprint11'),L=require('../decks').forData(D),E=B.createRuntime('sprint11').engine;
fs.writeFileSync(path.join(dest,'rules-and-decks.json'),JSON.stringify({cards:D.CARDS,rules:D.RULES,config:D.DEFAULT_CONFIG,decks:L.getDecks(),commanders:E.commanders.COMMANDERS,glossary:D.GLOSSARY},null,2)+'\n');
fs.writeFileSync(path.join(dest,'checkpoint-hashes.json'),JSON.stringify({version:'1.0.4',date:new Date().toISOString(),baseCommit:m.git.baseHead,newCommit:null,sourceHashes:v.sourceHashes,installer:v.installer,sourceCheckpoint:m.sourceCheckpoint,tests:448,native:m.tests.native},null,2)+'\n');
console.log(JSON.stringify({version:'1.0.4',files:Object.keys(v.sourceHashes).length,cards:155,decks:35,tests:448,installer:v.installer.sha256,checkpoint:path.relative(root,dest)}));
