'use strict';
// Validate existing evidence and record the local candidate. Never deploy, simulate or publish.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f)),json=f=>JSON.parse(read(f)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const artifact=file=>{const bytes=read(file);return {file,bytes:bytes.length,sha256:sha(bytes)};};
assert.equal(json('package.json').version,'1.1.0');
const verification=json('test-results/release-1.1.0-verification.json');
for(const [file,hash] of Object.entries(verification.sourceHashes))assert.equal(sha(read(file)),hash,'Changed after packaging: '+file);
assert.equal(verification.multiplayerPreservation.verifiedFrozenRuntimeFiles,234);
const log=read('test-results/sprint13-node-final.log').toString();
const count=Number(log.match(/tests (\d+)/)[1]);assert.equal(count,554);assert.match(log,/pass 554/);assert.match(log,/fail 0/);assert.match(log,/skipped 0/);
const native={};
for(const name of ['shell','match','training','arsenal','collection','warroom']){
  const file='test-results/sprint13-native-'+name+'.log';const result=JSON.parse(read(file).toString().match(/FRONTLINES_SMOKE (\{[^\r\n]+\})/)[1]);assert.equal(result.version,'1.1.0');native[name]={...result,evidence:file};
}
assert.equal(native.shell.fullscreen,true);assert.equal(native.shell.windowed,true);assert.equal(native.shell.commanderTutorialActivation,true);
assert.ok([0,1].includes(native.match.winner));assert.equal(native.match.cards,155);assert.equal(native.training.lessons.length,6);
assert.equal(native.arsenal.foundations,10);assert.equal(native.collection.summary.total,155);assert.equal(native.warroom.completed,2);assert.equal(native.warroom.errors,0);
const multiplayer={};
for(const role of ['host','guest']){
  const file='test-results/native-multiplayer/s13-package-final2/'+role+'-result.json',result=json(file);
  assert.equal(result.version,'1.1.0');for(const key of ['twoSeparateProcesses','privateMatchCompleted','lobby','bothReady','openingAcknowledged','hiddenHand','hiddenReserve','rematch','initiativeAlternated'])assert.equal(result[key],true,role+': '+key);
  assert.deepEqual(result.failures,[]);assert.equal(result.publicInternetVerified,false);assert.deepEqual(result.diagnostics.providerErrors,[]);
  const {diagnostics,...safe}=result;multiplayer[role]={...safe,counters:diagnostics.counters,completedMatch:diagnostics.completedMatch,evidence:file};
}
assert.equal(multiplayer.host.sharedHash,multiplayer.guest.sharedHash);assert.equal(multiplayer.host.sequence,multiplayer.guest.sequence);assert.equal(multiplayer.host.winner,multiplayer.guest.winner);
fs.writeFileSync(path.join(root,'test-results/sprint13-native-summary.json'),JSON.stringify({passed:true,native,multiplayer,publicInternetVerified:false},null,2)+'\n');
const browser={};
for(const name of ['battlefield-browser','commander-browser','offline-rewards-browser','two-browser-real-relay','ui-browser','ui-scaled-browser','offline-regressions','offline-legacy-regressions']){
  const file='test-results/sprint13-'+name+'.json',result=json(file);assert.equal(result.passed,true,file);assert.deepEqual(result.errors??result.focused?.errors??[],[]);browser[name]={evidence:file,sha256:sha(read(file)),passed:true};
}
const sourcePath='test-results/source-1.1.0-checkpoint.json';
let sourceCheckpoint=null;if(fs.existsSync(path.join(root,sourcePath))){sourceCheckpoint=json(sourcePath);assert.equal(artifact(sourceCheckpoint.file).sha256,sourceCheckpoint.sha256);assert.equal(sourceCheckpoint.runtimeHashesMatchPackage,true);}
const config=require('../multiplayer-config.js');assert.equal(config.serviceURL,'');
const artifacts=['Frontlines-Setup-1.1.0.exe','Frontlines-Setup-1.1.0.exe.blockmap','latest.yml','win-unpacked/Frontlines.exe','win-unpacked/resources/app.asar'].map(f=>artifact('release/1.1.0/'+f));
const previous=json('docs/balance/sprint13-v1.0.5-baseline/checkpoint-hashes.json');
for(const item of [...previous.protectedArtifacts,previous.sourceCheckpoint])assert.equal(artifact(item.file).sha256,item.sha256,'Previous release changed: '+item.file);
const manifest={version:'1.1.0',status:'local-candidate-awaiting-public-service-activation',sprintComplete:false,published:false,installedOverOwnerCopy:false,
  commit:null,commitRecordedIn:'release/1.1.0/manifest.json',baseCommit:'7f388ec66fb80f4c8d9883b3111551dd8ab0e829',
  artifacts,sourceCheckpoint,packageVerification:verification,
  tests:{node:{passed:count,failed:0,skipped:0,evidence:'test-results/sprint13-node-final.log'},native,multiplayer,browser,largeAutonomousBalanceCampaigns:0},
  networking:{provider:'Cloudflare Worker + SQLite-backed Durable Object',route:'HTTPS/WSS relay primary',directP2P:false,protocolVersion:1,serviceURL:'',publicEndpointDeployed:false,publicInternetVerified:false,differentHomeVerified:false},
  progression:{private:'actual-use mastery and local match history; no Credits/Supply/packs; no mastery for concede/abandon/no-use',ordinary:{victoryCredits:70,defeatCredits:50,firstEligibleMatchBonus:50}},
  preserved:{cards:155,decks:35,commanders:10,cardRatio:'5:7',baseline:'docs/balance/sprint13-v1.0.5-baseline/checkpoint-hashes.json',baselineManifestSHA256:sha(read('docs/balance/sprint13-v1.0.5-baseline/checkpoint-hashes.json')),previousArtifacts:previous.protectedArtifacts||null},
  documentation:{report:'docs/SPRINT-013.md',release:'docs/RELEASE-1.1.0.md',playtest:'docs/MULTIPLAYER-PLAYTEST.md',architecture:'docs/MULTIPLAYER-ARCHITECTURE.md',protocol:'docs/MULTIPLAYER-PROTOCOL.md',interface:'docs/MULTIPLAYER-INTERFACE.md',activation:'backend/README.md'},
  blocker:{reason:'Project-owned public relay account has not been authorized or provisioned',ownerAction:'Sign in/create the project Cloudflare account and approve official Wrangler browser OAuth',estimate:'Existing-account approval usually takes a few minutes; account creation can take longer',forgeNext:'Deploy reviewed service, configure public HTTPS origin, test deployed two-client route/match/reconnect, rebuild and verify installer'},
  knownIssues:['Not ready for Ryken/Wyatt across-home testing until public service activation and route validation','Actual Wyatt Windows 150% scaling and different-home play remain owner validation','Host application restart loses active match; no migration','Modified host can cheat; relay operator can observe forwarded frames; TLS is not end-to-end encryption','Provider quotas/outages and 15-minute new-guest invite/6-hour room expiry','Unsigned and unpublished Windows candidate']};
fs.writeFileSync(path.join(root,'docs/release-1.1.0-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const hash=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const message=cp.execFileSync('git',['log','-1','--format=%s'],{cwd:root,encoding:'utf8'}).trim();
const external={...manifest,commit:message==='Frontlines v1.1.0 - Private Online Multiplayer'?hash:null};
fs.writeFileSync(path.join(root,'release/1.1.0/manifest.json'),JSON.stringify(external,null,2)+'\n');
console.log(JSON.stringify({version:manifest.version,tests:count,runtimeFiles:verification.verifiedRuntimeFiles,packagedMatchActions:multiplayer.host.sequence,installer:artifacts[0],sourceCheckpoint,commit:external.commit,publicInternetVerified:false,published:false},null,2));
