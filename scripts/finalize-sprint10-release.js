'use strict';
// Release provenance only. Validates options without creating or stepping a simulation.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file)),json=file=>JSON.parse(read(file)),sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const write=(file,value)=>fs.writeFileSync(path.join(root,file),JSON.stringify(value,null,2)+'\n');
const pkg=json('package.json');assert.equal(pkg.version,'1.0.3');
const baselinePath='docs/balance/sprint10-v1.0.2-baseline',baseline=json(baselinePath+'/checkpoint-hashes.json');
for(const [file,expected] of Object.entries(baseline.files))assert.equal(sha(read(baselinePath+'/source/'+file)),expected,'Frozen v1.0.2 changed: '+file);
const frozen=json(baselinePath+'/interim-frozen-configuration.json'),options=JSON.parse(JSON.stringify(frozen.options));options.balanceProfile='sprint10';
const S=require('../sim-core.js'),normalized=S.normalizeOptions(options);
assert.deepEqual(normalized,options,'Recommendation must match frozen options apart from balance profile');
assert.equal(options.count,100000);assert.equal(options.deckPool.length,30);assert.equal(options.seed,1209);
assert.equal(options.swapSeats,true);assert.equal(options.includeMirrors,true);assert.equal(options.verify,false);
const optionFile='docs/balance/sprint10-validation-options.json';write(optionFile,options);
const verification=json('test-results/release-1.0.3-verification.json');assert.equal(verification.version,'1.0.3');
for(const [file,expected] of Object.entries(verification.sourceHashes))assert.equal(sha(read(file)),expected,'Source changed after package verification: '+file);
const preservedArt=Object.keys(baseline.files).filter(file=>file==='art.js'||file.startsWith('assets/'));
for(const file of preservedArt)assert.equal(sha(read(file)),baseline.files[file],'Approved art changed: '+file);
const protectedArtifacts=[
 ['release/1.0.2/Frontlines-Setup-1.0.2.exe','35edc8df70f740badd82d54ab8f621bb9c70f87d3dafcfc85c7e468ac4d3c6ba'],
 ['docs/checkpoints/sprint9-v1.0.2.zip','08e9392f8be4c495f9bf0a5919afcaa922aacf222b1643ed61fdd2de128ec412'],
 ['release/1.0.2-viewport-hotfix/Frontlines-Setup-1.0.2.exe','7a214a5e1a4fbb86e85f85b9a02b221df42c1fc114de594a39ff924ac9458a0d']
].map(([file,expected])=>{const bytes=read(file),actual=sha(bytes);assert.equal(actual,expected,'Stable artifact changed: '+file);return {file,bytes:bytes.length,sha256:actual};});
const nodeLog=read('test-results/sprint10-final-node.log').toString();assert.match(nodeLog,/tests 334/);assert.match(nodeLog,/pass 334/);assert.match(nodeLog,/fail 0/);assert.match(nodeLog,/skipped 0/);
const viewport=json('test-results/viewport-hotfix-browser.json'),action=json('test-results/sprint10-action-presentation.json'),random=json('test-results/sprint10-playtest-browser.json'),legacy=json('test-results/v102-browser-presentation.json'),tutorial=json('test-results/browser-tutorial-sprint9.json');
for(const item of [viewport,action,random,legacy])assert.equal(item.passed,true);
assert.equal(viewport.layouts.length,13);assert.equal(action.ratios.length,10);assert.equal(legacy.layouts.length,5);
assert.equal(tutorial.lessons,14);assert.equal(tutorial.matrix.length,6);assert.equal(tutorial.commanderActiveClicked,true);assert.equal(tutorial.actualLearningVictory,true);assert.equal(tutorial.lossRetryRecovery,true);assert.deepEqual(tutorial.errors,[]);
const nativeLog=read('test-results/sprint10-native-shell.log').toString(),native=JSON.parse(nativeLog.match(/FRONTLINES_SMOKE (\{[^\r\n]+\})/)[1]);assert.equal(native.version,'1.0.3');
for(const key of ['tutorialDeployment','commanderTutorialActivation','installedVersionVisible','fullscreen','windowed'])assert.equal(native[key],true);
const nativeMatchLog=read('test-results/sprint10-native-match.log').toString(),nativeMatch=JSON.parse(nativeMatchLog.match(/FRONTLINES_SMOKE (\{[^\r\n]+\})/)[1]);
assert.equal(nativeMatch.version,'1.0.3');assert.equal(nativeMatch.page,'game');assert.ok([0,1].includes(nativeMatch.winner));assert.equal(nativeMatch.cards,115);assert.ok(nativeMatch.commanders.every(c=>c.used));
const additions=Object.keys(verification.sourceHashes).filter(file=>!baseline.files[file]);
const changed=Object.keys(baseline.files).filter(file=>verification.sourceHashes[file]!==baseline.files[file]);
const manifest={version:'1.0.3',candidate:'balance-recovery',date:new Date().toISOString(),published:false,installedOverOwnerCopy:false,
 git:{baseHead:'f394c18b09862c064711a5581640bcb922ad8d5a',newCommit:null,workingTreeChangesPreserved:true},
 baseline:{version:'1.0.2',kind:'latest-viewport-hotfix',directory:baselinePath,runtimeFilesVerified:Object.keys(baseline.files).length,checkpointHashesSha256:sha(read(baselinePath+'/checkpoint-hashes.json')),
 report:{file:baselinePath+'/interim-seed-1209.html',sha256:sha(read(baselinePath+'/interim-seed-1209.html')),status:'interim-owner-approved',attempted:46679,target:100000,decisive:46402,cutoffs:277,errors:0,seed:1209},protectedArtifacts},
 changes:{runtimeFiles:changed,addedRuntimeFiles:additions,rules:['One shared Scavenge/Nothing Wasted casualty draw per player/global turn','Reclaim retains wounds through redeployment'],
 cards:['rogue_reclaim','nightwalker_ghost_extraction'],cardChanges:'Rules text only; all printed Presence, attack, health, traits, effect amounts and Command Action costs unchanged',
 commanders:['commander_rogue_scavenger: Nothing Wasted shared draw budget; Recover the Fallen unchanged'],
 decks:['stonewall-fortified-advance','bruiser-rolling-breakthrough','syndicate-coordinated-removal','nightwalker-planned-exposure'],
 ai:'Seven tactical corrections under balanceRecovery, plus truthful current baseline metadata; see traceable change log',
 presentation:['Explicit card/target/Commander legality states','Retained wounds visible','Random Enemy / Random Deck / Avoid Last Opponent','Canonical 5:7 full card faces; square painted surfaces cropped safely'],
 changeLog:'docs/balance/SPRINT-010-CHANGELOG.md',sprintReport:'docs/SPRINT-010.md',historicalProfilesPreserved:true},
 artPreservation:{filesVerified:preservedArt.length,assetsAndMappingsUnchanged:true,commanderPortraits:10},
 tests:{node:{passed:334,failed:0,skipped:0,log:'test-results/sprint10-final-node.log'},
 viewport:{passed:true,cases:13,populatedUnits:10,commanderVariants:20,noRoutinePageOrMapVerticalScrolling:true,evidence:'test-results/viewport-hotfix-browser.json'},
 actionAndRatios:{passed:true,contexts:10,evidence:'test-results/sprint10-action-presentation.json'},
 randomSetup:{...random,evidence:'test-results/sprint10-playtest-browser.json'},
 legacyPresentation:{passed:true,viewportCases:5,assetMappingsAndSymbolsVerified:true,portraitsLoaded:10,evidence:'test-results/v102-browser-presentation.json'},
 tutorial:{passed:true,lessons:14,viewports:6,commanderTaught:true,trainingVictoryAndLossRetry:true,evidence:'test-results/browser-tutorial-sprint9.json'},
 nativeShell:{...native,evidence:'test-results/sprint10-native-shell.log'},
 nativeMatch:{...nativeMatch,purpose:'One ordinary-match correctness smoke; no win-rate estimate',evidence:'test-results/sprint10-native-match.log'},
 profileIntegration:{pairedMatches:2,seed:1209,invariants:true,purpose:'Correctness only; no win-rate estimate'},largeAutonomousBalanceCampaigns:0},
 packageVerification:verification,
 validationRecommendation:{file:optionFile,sha256:sha(read(optionFile)),executed:false,count:100000,mode:'matrix',seed:1209,deckPool:30,bothSeats:true,mirrors:true,balanceProfile:'sprint10',aiProfiles:['deck','deck'],commandIn:'docs/SPRINT-010.md'},
 knownLimitations:['No measured post-patch faction/deck win rates','First-contact/capture and immediate terminal conquest remain structural initiative risks; opening compensation and turn-system rewrite deferred','Interim baseline is incomplete; effects of simultaneous rules/deck/AI changes cannot be isolated by a pooled comparison']};
const checkpoint='test-results/source-1.0.3-checkpoint.json';if(fs.existsSync(path.join(root,checkpoint)))manifest.sourceCheckpoint=json(checkpoint);
write('docs/release-1.0.3-manifest.json',manifest);write('release/1.0.3/manifest.json',manifest);
console.log(JSON.stringify({version:manifest.version,source:verification.verifiedRuntimeFiles,baseline:Object.keys(baseline.files).length,art:preservedArt.length,changed,added:additions,installer:verification.installer,validationExecuted:false,checkpoint:!!manifest.sourceCheckpoint},null,2));
