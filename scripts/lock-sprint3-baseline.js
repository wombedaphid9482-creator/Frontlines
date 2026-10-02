'use strict';
// One-shot archive. Existing baseline directories are never overwritten.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const target = path.join(root, 'docs', 'balance', 'sprint-3-baseline');
if (fs.existsSync(target)) throw new Error('Sprint 3 baseline already exists; preserve it.');
const source = path.join(target, 'source');
fs.mkdirSync(source, {recursive:true});
const files = fs.readdirSync(root).filter(name => /\.(?:js|html|css|cmd)$/.test(name) || ['package.json','package-lock.json','CONTRACT.md'].includes(name));
for (const name of files) fs.copyFileSync(path.join(root,name),path.join(source,name));
for (const folder of ['scripts','tests']) {
  fs.mkdirSync(path.join(source,folder), {recursive:true});
  const names = folder === 'scripts' ? ['simulate.js'] : fs.readdirSync(path.join(root,folder)).filter(name => name.endsWith('.test.js') || name === 'playtest.js');
  for (const name of names) fs.copyFileSync(path.join(root,folder,name),path.join(source,folder,name));
}
fs.cpSync(path.join(root,'assets'), path.join(source,'assets'), {recursive:true, filter: file => !path.relative(path.join(root,'assets'),file).split(path.sep).includes('source')});
for (const name of ['simulator-baseline-1000.json','playtest-results.json']) fs.copyFileSync(path.join(root,'docs',name),path.join(target,name));
const D = require(path.join(source,'data.js'));
const S = require(path.join(source,'sim-core.js'));
const manifest = {clientDate:'2026-10-01',gitCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),package:JSON.parse(fs.readFileSync(path.join(source,'package.json'),'utf8')),rules:S.createRun({count:1}).result().rulesSnapshot,simulatorVersion:S.VERSION,aiVersion:S.AI_VERSION,hashes:{},note:'Frozen pre-Sprint-3 runtime source, native tests, and optimized runtime assets. Original art sources remain in the initial Git commit. Historical reports and user-reported 10,000-match figures are separate evidence.'};
function hashFolder(folder) {for(const entry of fs.readdirSync(folder,{withFileTypes:true})){const file=path.join(folder,entry.name);if(entry.isDirectory())hashFolder(file);else manifest.hashes[path.relative(source,file).split(path.sep).join('/')]=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}}
hashFolder(source);
fs.writeFileSync(path.join(target,'manifest.json'),JSON.stringify(manifest,null,2));
fs.writeFileSync(path.join(target,'reported-results.json'),JSON.stringify({source:'User-supplied Sprint 3 brief; aggregate figures only, raw match records and seed not supplied.',totalMatchesInferredFromWins:10000,rows:[['stonewall',4000,2177,54.4],['bruiser',4000,3929,98.2],['syndicate',4000,2218,55.5],['nightwalker',4000,798,20.0],['rogue',4000,878,21.9]].map(([faction,games,wins,reportedPercent])=>({faction,games,wins,reportedPercent})),unknown:['seed','first-player rates','cutoffs','errors','per-match traces']},null,2));
console.log(`Locked ${Object.keys(manifest.hashes).length} files at ${target}`);
