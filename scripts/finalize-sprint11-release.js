'use strict';
// Verify release provenance and saved proof only. No simulation is started.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f)),json=f=>JSON.parse(read(f)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const artifact=file=>{const bytes=read(file);return {file,bytes:bytes.length,sha256:sha(bytes)};};
const pkg=json('package.json');assert.equal(pkg.version,'1.0.4');
const base='7f388ec66fb80f4c8d9883b3111551dd8ab0e829';assert.equal(cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),base);
const verification=json('test-results/release-1.0.4-verification.json');assert.equal(verification.version,pkg.version);
for(const [file,expected]of Object.entries(verification.sourceHashes))assert.equal(sha(read(file)),expected,'Source changed after package verification: '+file);
const checkpoint=json('test-results/source-1.0.4-checkpoint.json');assert.equal(artifact(checkpoint.file).sha256,checkpoint.sha256);assert.equal(checkpoint.runtimeHashesMatchPackage,true);
const options=json('docs/balance/sprint11-validation-options.json'),S=require('../sim-core'),B=require('../balance'),A=require('../tactical-arsenal'),D=B.dataFor('sprint11'),L=require('../decks').forData(D);
assert.deepEqual(S.normalizeOptions(options),options);assert.equal(options.count,100000);assert.equal(options.deckPool.length,35);assert.equal(options.seed,1209);
assert.equal(options.balanceProfile,'sprint11');assert.equal(options.swapSeats,true);assert.equal(options.includeMirrors,true);
const nodeLog=read('test-results/sprint11-node-final.log').toString(),count=Number(nodeLog.match(/tests (\d+)/)[1]);
assert.ok(count>=407);assert.match(nodeLog,new RegExp('pass '+count+'(?:\\r?\\n|$)'));assert.match(nodeLog,/fail 0/);assert.match(nodeLog,/skipped 0/);
const evidenceFiles=['sprint11-content-browser.json','sprint11-tactical-browser.json','sprint11-lab-browser.json','sprint11-lab-migration.json','viewport-hotfix-browser.json','sprint10-action-presentation.json'];
const browser={};for(const file of evidenceFiles){const item=json('test-results/'+file);assert.equal(item.passed,true,file);browser[file]={...item,evidence:'test-results/'+file};}
const tutorial=json('test-results/browser-tutorial-sprint9.json');assert.equal(tutorial.lessons,14);assert.equal(tutorial.commanderActiveClicked,true);assert.equal(tutorial.actualLearningVictory,true);assert.equal(tutorial.lossRetryRecovery,true);assert.deepEqual(tutorial.errors,[]);
const native={};for(const name of ['shell','match','training','arsenal','collection']){
  const file='test-results/sprint11-native-'+name+'.log',text=read(file).toString();const item=JSON.parse(text.match(/FRONTLINES_SMOKE (\{[^\r\n]+\})/)[1]);assert.equal(item.version,pkg.version);native[name]={...item,evidence:file};
}
for(const key of ['tutorialDeployment','commanderTutorialActivation','installedVersionVisible','fullscreen','windowed'])assert.equal(native.shell[key],true);
assert.deepEqual(native.shell.shortcuts,['F11','Alt+Enter']);assert.equal(native.match.cards,155);assert.ok([0,1].includes(native.match.winner));
assert.equal(native.training.desktopTrust,true);assert.equal(native.training.lessons.length,6);assert.equal(native.training.rewards,false);assert.equal(native.arsenal.cards,155);assert.equal(native.collection.summary.uniqueOwned,63);
const preserved=[['release/1.0.3/Frontlines-Setup-1.0.3.exe','da5e5ebcf7bf29e3cdc2b25aec2e23aa1b40904e0e6117bd7d08f131a9d44e66'],['docs/checkpoints/sprint10-v1.0.3.zip','fdb8fc0e9ca377c972e26b53a380eb30eb9285e0d499dd46311982c23f9be2b2']].map(([file,expected])=>{const result=artifact(file);assert.equal(result.sha256,expected);return result;});
const artifacts=['Frontlines-Setup-1.0.4.exe','Frontlines-Setup-1.0.4.exe.blockmap','latest.yml','win-unpacked/Frontlines.exe','win-unpacked/resources/app.asar'].map(file=>artifact('release/1.0.4/'+file));
const manifest={version:pkg.version,candidate:'tactical-arsenal',date:new Date().toISOString(),published:false,installedOverOwnerCopy:false,
  git:{baseHead:base,newCommit:null,workingTreeChangesPreserved:true},baseline:{directory:'docs/balance/sprint11-v1.0.3-baseline',version:'1.0.3',protectedArtifacts:preserved,...verification.tacticalPreservation},
  catalogs:{battlefieldCards:155,newCards:40,commanders:10,decks:35,newShowcases:5,rarityPerFaction:{common:3,uncommon:2,rare:2,legendary:1},
    additions:Object.values(A.CARD_ADDITIONS).map(c=>({id:c.id,name:c.name,faction:c.faction,rarity:c.rarity,type:c.type,presence:c.presence,attack:c.attack,health:c.health,commandCost:c.commandCost,rulesText:c.rulesText})),showcases:L.getDecks().filter(d=>d.deckGroup==='tactical-showcase')},
  compatibility:{oldPrintedCardDataChanged:0,oldDeckListsChanged:0,newCommanders:0,oldArtApiOutputsUnchanged:115,
    interactions:['Existing direct attacks/Orders/Commander damage observe new defenses','Voluntary response/Commander movement observes Suppression and Overwatch','Forced retreat and Breakthrough retain contiguous-frontline resolution','Sacrifice/rules-resolution are excluded from Scavenge/Nothing Wasted','Shared Rogue casualty budget and retained recall wounds remain'],saveDataPreserved:true,economyValuesUnchanged:true,ownershipIndependentWarRoom:true},
  tests:{node:{passed:count,failed:0,skipped:0,log:'test-results/sprint11-node-final.log'},browser,beginnerTutorial:{...tutorial,evidence:'test-results/browser-tutorial-sprint9.json'},native,largeAutonomousBalanceCampaigns:0,
    simulationPurpose:'Single deterministic expansion fixture reused in Node/Worker plus ordinary native correctness smoke and existing regression fixtures; no balance estimates'},
  packageVerification:verification,artifacts,sourceCheckpoint:checkpoint,
  validationRecommendation:{file:'docs/balance/sprint11-validation-options.json',sha256:sha(read('docs/balance/sprint11-validation-options.json')),executed:false,count:100000,seed:1209,profile:'sprint11',decks:35,groups:{legacy:20,commanderFoundations:10,tacticalShowcases:5},fullPairedCycle:1225,endpointIsPartialCycle:true},
  documentation:{sprint:'docs/SPRINT-011.md',catalog:'docs/TACTICAL-ARSENAL.md',training:'docs/TACTICAL-TRAINING.md',release:'docs/RELEASE-1.0.4.md',balance:'docs/BALANCE.md',roadmap:'docs/GAME-ROADMAP.md'},
  knownLimitations:['Expansion competitive balance is unmeasured; owner manual play and proposed campaign remain','AI is deterministic and public-information, not proven optimal','New vector tactical art is readable but less detailed than illustrated Commanders','Local unsigned Windows packaging; no publishing or owner installation','100000-match recommendation has unequal endpoint cell exposure']};
for(const file of ['docs/release-1.0.4-manifest.json','release/1.0.4/manifest.json'])fs.writeFileSync(path.join(root,file),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({version:pkg.version,tests:count,runtimeFiles:verification.verifiedRuntimeFiles,preserved:verification.tacticalPreservation,installer:verification.installer,source:checkpoint,published:false,largeCampaigns:0},null,2));
