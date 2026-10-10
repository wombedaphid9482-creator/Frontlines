'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const B=require('../balance'),T=require('../telemetry'),S=require('../sim-core'),Analytics=require('../analytics'),P=require('../multiplayer-protocol');
const R=B.createRuntime('sprint15'),E=R.engine,D=R.data,clone=v=>JSON.parse(JSON.stringify(v));
let serial=150000,pairedFixture;
function state(){const s=E.createGame({seed:1515,config:{startingCommand:80,commandCap:80,drawCount:0}});s.players.forEach(p=>{p.hand=[];p.commander.used=true;});return s;}
function unit(s,id='stonewall_rifles',owner=0){const u={uid:'s15metric'+serial++,cardId:id,owner,territory:3,damage:0,ready:true,deployedTurn:0,deployedWindow:0,movedTurn:-1,movedWindow:-1,attackedWindow:-1,defendedWindow:-1,abilityWindow:-1};s.units.push(u);return u;}
function tracked(s,t,a){const result=E.dispatch(s,a,{events:true});assert.equal(result.ok,true,result.error);t.record(s,result.state,a,{events:result.events});return result.state;}
function finish(options){const run=S.createRun(options);let steps=0;while(!run.done){run.step();assert.ok(++steps<30000,'bounded correctness fixture');}return run.result();}
function fixture(){if(!pairedFixture)pairedFixture=finish({balanceProfile:'sprint15',count:2,seed:1515,ai:'deck',verify:true});return pairedFixture;}

test('paired telemetry retains own-window economy but samples territory once after both windows',()=>{
 let s=state(),u=unit(s),t=T.createTracker({state:s,data:D,engine:E,trace:true,territoryHistory:true});
 s=tracked(s,t,{type:'endTurn'});let r=t.summary();assert.equal(s.turn,1);assert.equal(r.territory.sampleCount,0);assert.equal(r.economy[0].endTurns,1);assert.equal(r.economy[1].endTurns,0);assert.deepEqual(r.economy.map(e=>e.samples),[1,1]);
 s=tracked(s,t,{type:'endTurn'});r=t.finish(s);assert.equal(r.schemaVersion,2);assert.equal(r.telemetryVersion,'frontlines-telemetry-v8-paired-turns');assert.equal(r.timingModel,'paired-turns-v2');assert.equal(r.turns,2);assert.equal(r.actionWindows,3);assert.equal(r.actionWindowsCompleted,2);assert.equal(r.pairedTurnsCompleted,1);assert.equal(r.territory.sampleCount,1);assert.equal(r.territory.samples[1].turn,1);assert.equal(r.territory.samples[1].window,1);assert.equal(r.territory.samples[1].windowIndex,2);assert.equal(r.cards.find(c=>c.cardId===u.cardId).unitWindowObservations,1);
 assert.deepEqual(r.trace.map(e=>[e.turn,e.window,e.windowIndex]),[[1,0,1],[1,1,2]]);assert.ok(r.trace.every(e=>e.stateHash.length===64&&e.stateHashBefore.length===64&&e.sequence));assert.ok(r.trace[1].events.some(e=>e.type==='turnEndComplete'));
});

test('four-window deployment and six-window early-play horizons do not double their duration',()=>{
 let s=state();s.players[0].hand=[{uid:'metricdeployment',cardId:'stonewall_rifles'}];const t=T.createTracker({state:s,data:D,engine:E});s=tracked(s,t,{type:'deploy',handUid:'metricdeployment',territory:2});
 for(let i=0;i<3;i++)s=tracked(s,t,{type:'endTurn'});let card=t.summary().cards.find(c=>c.cardId==='stonewall_rifles'&&c.player===0);assert.equal(card.deploymentWindowCount,0);
 s=tracked(s,t,{type:'endTurn'});card=t.finish(s).cards.find(c=>c.cardId==='stonewall_rifles'&&c.player===0);assert.equal(card.deploymentWindowCount,1);assert.equal(card.deploymentWindowCensored,0);assert.equal(card.playTurnSum,1);assert.equal(card.playWindowSum,1);assert.equal(card.earlyPlayedMatches,1);assert.equal(card.affordableOpportunityWindows,card.affordableOpportunityTurns);
});

test('AI distinguishes provisional FIRST capture from final-current SECOND capture without reading concealed cards',()=>{
 const s=state();s.config.captureThreshold=1;unit(s);const first=R.ai.explainAction(s,{profile:'deck',legalActions:[{type:'endTurn'}]});assert.equal(first.action.type,'endTurn');assert.match(first.reason,/opponent still acts|provisional/i);assert.doesNotMatch(first.explanation,/to secure/);
 const second=clone(s);second.window=1;second.windowIndex=2;second.activePlayer=second.attacker=1;second.units[0].owner=1;second.units[0].cardId='bruiser_assault';const last=R.ai.explainAction(second,{profile:'deck',legalActions:[{type:'endTurn'}]});assert.match(last.reason,/Final-current|Turn.End/i);assert.match(last.explanation,/current capture outlook/i);
 const hidden=state(),legal=E.legalActions(hidden);Object.defineProperty(hidden.players[1],'hand',{get(){throw Error('AI inspected enemy hand');}});Object.defineProperty(hidden.players[1],'deck',{get(){throw Error('AI inspected enemy reserve order');}});assert.doesNotThrow(()=>R.ai.explainAction(hidden,{profile:'deck',difficulty:'expert',legalActions:legal}));
});

test('paired cutoffs stop at explicit clocks and never fabricate wins or a third-window action',()=>{
 const turn=finish({balanceProfile:'sprint15',count:1,maxTurns:1,maxActionWindows:240,ai:'deck'});assert.equal(turn.matches[0].status,'turnLimit');assert.equal(turn.matches[0].turns,1);assert.equal(turn.matches[0].actionWindows,2);assert.equal(turn.matches[0].winner,null);const replay=S.replayMatch(turn,0);assert.equal(replay.final.turn,2);assert.ok(replay.actions.every(a=>a.turn===1));
 const window=finish({balanceProfile:'sprint15',count:1,maxTurns:120,maxActionWindows:1,ai:'deck'});assert.equal(window.matches[0].status,'actionWindowLimit');assert.equal(window.matches[0].actionWindows,1);assert.equal(window.matches[0].turns,1);assert.equal(window.summary.decisive,0);assert.equal(window.matches[0].pairedTurnsCompleted,0);
 assert.equal(S.normalizeOptions({balanceProfile:'sprint15'}).maxTurns,120);assert.equal(S.normalizeOptions({balanceProfile:'sprint15'}).maxActionWindows,240);assert.equal(S.normalizeOptions({balanceProfile:'sprint12'}).maxTurns,240);assert.throws(()=>S.normalizeOptions({balanceProfile:'sprint15',maxActionWindows:0}),/Window limit/);
});

test('two paired-seat correctness matches finish and replay every canonical clock and SHA256 hash',()=>{
 const r=fixture();assert.equal(r.schemaVersion,2);assert.equal(r.simulatorVersion,'6.0.0');assert.equal(r.completed,2);assert.equal(r.summary.decisive,2);assert.equal(r.summary.errors,0);assert.equal(r.summary.unfinished,0);assert.equal(r.matches[0].seed,r.matches[1].seed);assert.deepEqual(r.matches[0].deckIds,r.matches[1].deckIds.slice().reverse());assert.equal(r.summary.actionWindows.count,2);assert.ok(r.summary.actionWindows.p95>=r.summary.actionWindows.median);
 for(let i=0;i<2;i++){const replay=S.replayMatch(r,i);assert.deepEqual(replay.match,r.matches[i]);assert.equal(replay.schemaVersion,2);assert.equal(replay.truncated,false);let s=E.createGame({seed:replay.match.seed,factions:replay.match.factions,decks:replay.match.deckIds.map(id=>r.rulesSnapshot.decks.find(d=>d.id===id)),config:r.options.config});for(const entry of replay.actions){assert.equal(P.hash(s),entry.stateHashBefore);const next=E.dispatch(s,entry.action,{events:true});assert.equal(next.ok,true);assert.equal(P.hash(next.state),entry.stateHash);assert.equal(entry.windowIndex,s.windowIndex);s=next.state;}assert.equal(s.winner,replay.match.winner);assert.equal(s.lastResolvedTurn,replay.final.lastResolvedTurn);assert.ok(replay.actions.some(a=>a.events.some(e=>e.type==='turnEndComplete')));}
});

test('historical reports retain their old window units and cross-model comparisons omit Turn deltas',()=>{
 const old=finish({balanceProfile:'sprint12',count:1,maxDecisions:1,ai:'deck',seed:1515}),r=clone(fixture());assert.equal(old.schemaVersion,1);assert.equal(old.simulatorVersion,'5.0.0');assert.equal(old.telemetryVersion,'frontlines-telemetry-v7-tactical');assert.equal(old.matches[0].actionWindows,undefined);const before=clone(old);const c=Analytics.compareReports(old,r);assert.equal(c.timingCompatible,false);assert.equal(c.controlledBalanceComparison,false);assert.equal(c.meanTurnsDelta,null);assert.match(c.notes.join(' '),/Timing model changed/);assert.deepEqual(old,before);assert.match(S.reportHTML(old),/archived timing model/);assert.match(S.reportHTML(r),/Normal Action Window length/);const altered=clone(r);altered.timingModel='legacy-action-windows-v1';assert.throws(()=>S.replayMatch(altered,0),/different rules/);
});

test('new JSON, card/Commander CSV and CLI expose both units while legacy CSV contracts remain unchanged',()=>{
 const r=fixture();assert.match(S.matchesCSV(r).split('\r\n')[0],/action_windows,action_windows_completed,paired_turns_completed,timing_model/);assert.match(S.cardsCSV(r).split('\r\n')[0],/playWindowSum/);assert.match(S.commandersCSV(r).split('\r\n')[0],/meanActivationWindow/);assert.match(S.reportHTML(r),/true Turn End after both normal Action Windows/);const cli=require('../scripts/simulate').parseArgs(['--balance','sprint15','--max-turns','120','--max-action-windows','240']);assert.equal(cli.options.maxActionWindows,'240');
 const old=finish({balanceProfile:'sprint12',count:1,maxDecisions:1});assert.match(S.matchesCSV(old).split('\r\n')[0],/game_version,p1_commander,p2_commander$/);assert.doesNotMatch(S.cardsCSV(old).split('\r\n')[0],/playWindowSum/);
});

test('paired browser-script runtime reproduces the same bounded match clocks and rule outcome',()=>{
 const context=vm.createContext({console,TextEncoder});context.globalThis=context;
 for(const file of ['build-info.js','data.js','commanders.js','deck-rules.js','multiplayer-protocol.js','decks.js','tactical-rules.js','engine.js','ai.js','arsenal.js','tactical-arsenal.js','balance.js','telemetry.js','analytics.js','sim-core.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context,{filename:file});
 const options={balanceProfile:'sprint15',count:1,maxTurns:2,maxActionWindows:4,seed:1515,ai:'deck',verify:true},run=context.FrontlinesSimulator.createRun(options);while(!run.done)run.step();assert.deepEqual(clone(run.result()),finish(options));const replay=context.FrontlinesSimulator.replayMatch(run.result(),0);assert.ok(replay.actions.every(a=>a.stateHash.length===64));
});
