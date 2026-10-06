'use strict';
// Record the verified local candidate. Never deploy, simulate, install or publish.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f)),json=f=>JSON.parse(read(f)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const artifact=file=>{const bytes=read(file);return {file,bytes:bytes.length,sha256:sha(bytes)};};
assert.equal(json('package.json').version,'1.2.0');
const verification=json('test-results/release-1.2.0-verification.json');
for(const [file,hash]of Object.entries(verification.sourceHashes))assert.equal(sha(read(file)),hash,'Changed after packaging: '+file);
assert.equal(verification.verifiedRuntimeFiles,242);assert.equal(verification.prestigePreservation.protectedAssets,169);
const nodeLog=read('test-results/sprint14-node-final.log').toString(),count=Number(nodeLog.match(/tests (\d+)/)[1]);
assert.equal(count,590);assert.match(nodeLog,/pass 590/);assert.match(nodeLog,/fail 0/);assert.match(nodeLog,/skipped 0/);
const native={};
for(const mode of ['shell','match','training','arsenal','collection','warroom']){
  const file='test-results/sprint14-native-'+mode+'.log',result=JSON.parse(read(file).toString().match(/FRONTLINES_SMOKE (\{[^\r\n]+\})/)[1]);
  assert.equal(result.version,'1.2.0');assert.equal(read(file.replace('.log','.err')).length,0);native[mode]={...result,evidence:file};
}
assert.equal(native.shell.fullscreen,true);assert.equal(native.shell.windowed,true);assert.equal(native.shell.commanderTutorialActivation,true);
assert.ok([0,1].includes(native.match.winner));assert.equal(native.match.cards,155);assert.equal(native.training.lessons.length,6);
assert.equal(native.arsenal.foundations,10);assert.equal(native.collection.summary.total,155);assert.equal(native.warroom.completed,2);assert.equal(native.warroom.errors,0);
const config=require('../multiplayer-config'),multiplayer={};assert.equal(config.deploymentStatus,'deployed');assert.match(config.serviceURL,/^https:\/\//);
for(const role of ['host','guest']){
  const file='test-results/native-multiplayer/s13-s14-public-final/'+role+'-result.json',result=json(file);
  assert.equal(result.version,'1.2.0');assert.equal(result.serviceOrigin,config.serviceURL);
  for(const key of ['twoSeparateProcesses','publicInternetVerified','privateMatchCompleted','lobby','bothReady','openingAcknowledged','hiddenHand','hiddenReserve','rematch','initiativeAlternated'])assert.equal(result[key],true,role+': '+key);
  assert.equal(result.differentHomeVerified,false);assert.deepEqual(result.failures,[]);assert.deepEqual(result.diagnostics.providerErrors,[]);
  const {diagnostics,...safe}=result;multiplayer[role]={...safe,counters:diagnostics.counters,completedMatch:diagnostics.completedMatch,evidence:file};
}
assert.equal(multiplayer.host.sharedHash,multiplayer.guest.sharedHash);assert.equal(multiplayer.host.sequence,multiplayer.guest.sequence);assert.equal(multiplayer.host.winner,multiplayer.guest.winner);
fs.writeFileSync(path.join(root,'test-results/sprint14-native-summary.json'),JSON.stringify({passed:true,native,multiplayer,publicInternetVerified:true,differentHomeVerified:false},null,2)+'\n');
const browser={};
for(const name of ['prestige-visual','collection-browser','warroom-browser','two-browser-real-relay','ui-browser','ui-scaled-browser','offline-regressions']){
  const file='test-results/sprint14-'+name+'.json',result=json(file);assert.equal(result.passed,true,file);assert.deepEqual(result.errors??result.focused?.errors??[],[]);
  browser[name]={evidence:file,sha256:sha(read(file)),passed:true};
}
const visual=json('test-results/sprint14-prestige-visual.json');assert.equal(visual.examples,35);assert.equal(visual.layouts.length,20);
assert.equal(json('test-results/sprint14-collection-browser.json').layouts.length,10);assert.equal(json('test-results/sprint14-warroom-browser.json').layouts.length,5);
const relay={};
for(const name of ['route','controller']){
  const file='test-results/sprint14-relay-public-'+name+'.json',result=json(file);assert.equal(result.completed,true);assert.equal(result.publicInternetVerified,true);assert.equal(result.serviceOrigin,config.serviceURL);
  relay[name]={...result,evidence:file,sha256:sha(read(file))};
}
const previous=json('docs/balance/sprint14-v1.1.0-baseline/checkpoint-hashes.json');
for(const item of [...previous.protectedArtifacts,previous.sourceCheckpoint])assert.equal(artifact(item.file).sha256,item.sha256,'Previous release changed: '+item.file);
const artifactFiles=['Frontlines-Setup-1.2.0.exe','Frontlines-Setup-1.2.0.exe.blockmap','latest.yml','win-unpacked/Frontlines.exe','win-unpacked/resources/app.asar'];
const artifacts=artifactFiles.map(f=>artifact('release/1.2.0/'+f));
const metadata=read('release/1.2.0/latest.yml').toString();assert.match(metadata,/version: 1\.2\.0/);assert.match(metadata,/path: Frontlines-Setup-1\.2\.0\.exe/);
const installer=read('release/1.2.0/Frontlines-Setup-1.2.0.exe'),sha512=crypto.createHash('sha512').update(installer).digest('base64');
assert.ok(metadata.includes('sha512: '+sha512));assert.ok(metadata.includes('size: '+installer.length));
let sourceCheckpoint=null;
if(fs.existsSync(path.join(root,'test-results/source-1.2.0-checkpoint.json'))){
  sourceCheckpoint=json('test-results/source-1.2.0-checkpoint.json');assert.equal(artifact(sourceCheckpoint.file).sha256,sourceCheckpoint.sha256);assert.equal(sourceCheckpoint.runtimeHashesMatchPackage,true);
}
const manifest={version:'1.2.0',status:sourceCheckpoint?'private-playtest-candidate':'verified-build-awaiting-source-checkpoint',sprintComplete:!!sourceCheckpoint,published:false,installedOverOwnerCopy:false,
  commit:null,commitRecordedIn:'release/1.2.0/manifest.json',baseCommit:previous.baseCommit,artifacts,sourceCheckpoint,packageVerification:verification,
  tests:{node:{passed:count,failed:0,skipped:0,evidence:'test-results/sprint14-node-final.log'},native,multiplayer,browser,relay,largeAutonomousBalanceCampaigns:0},
  networking:{provider:'Cloudflare Worker + SQLite-backed Durable Object',route:'HTTPS/WSS relay primary',directP2P:false,protocolVersion:1,serviceURL:config.serviceURL,deploymentVersion:'73b90d84-6587-4dd5-b21c-f71aa4a9e972',publicEndpointDeployed:true,publicInternetVerified:true,normalPackagedConfigurationVerified:true,differentHomeVerified:false},
  prestige:{rarities:['common','uncommon','rare','epic','legendary'],independentLayers:['rarity','premium finish','earned wear'],factionMaterials:{stonewall:'forged',bruiser:'industrial',syndicate:'precision',nightwalker:'spectral',rogue:'salvaged'},actualUseMastery:true,legacyPointsAndUnlocksPreserved:true,unknownLegacyAcquisitionDatesHonest:true,publicOpponentFallback:'Standard / Unworn',visualExamples:35,canonicalFacesMeasured:140},
  progression:{private:'actual-use mastery and local match history; no Credits/Supply/packs; no mastery for concede/abandon/no-use',ordinary:{victoryCredits:70,defeatCredits:50,firstEligibleMatchBonus:50}},
  preserved:{cards:155,decks:35,commanders:10,protectedArtworkFiles:169,cardRatio:'5:7',engine:true,ai:true,economy:true,networkAuthority:true,baseline:'docs/balance/sprint14-v1.1.0-baseline/checkpoint-hashes.json',baselineManifestSHA256:sha(read('docs/balance/sprint14-v1.1.0-baseline/checkpoint-hashes.json'))},
  documentation:{release:'docs/RELEASE-1.2.0.md',rarity:'docs/RARITY-PRESENTATION.md',mastery:'docs/CARD-MASTERY.md',playtest:'docs/MULTIPLAYER-PLAYTEST.md',activation:'backend/README.md'},
  knownIssues:['Ryken/Wyatt different-home play and actual Windows 150% hardware scaling remain human validation','Host application restart loses active match; no host migration','Modified host can cheat; relay operator can observe forwarded frames; TLS is not end-to-end encryption','Provider quotas/outages and 15-minute new-guest invite/6-hour room expiry','Holographic renderer treatment has no newly granted or selectable entitlement','Unsigned and unpublished Windows candidate'],publicationRecommendation:'Ready for private playtesting; retain human cross-home check before broader publication'};
fs.writeFileSync(path.join(root,'docs/release-1.2.0-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const commit=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),message=cp.execFileSync('git',['log','-1','--format=%s'],{cwd:root,encoding:'utf8'}).trim();
const external={...manifest,commit:message==='Frontlines v1.2.0 - Arsenal Prestige and Private Multiplayer Activation'?commit:null};
fs.writeFileSync(path.join(root,'release/1.2.0/manifest.json'),JSON.stringify(external,null,2)+'\n');
console.log(JSON.stringify({version:manifest.version,status:manifest.status,tests:count,runtimeFiles:verification.verifiedRuntimeFiles,packagedPublicMatchActions:multiplayer.host.sequence,installer:artifacts[0],sourceCheckpoint,commit:external.commit,publicInternetVerified:true,published:false},null,2));
