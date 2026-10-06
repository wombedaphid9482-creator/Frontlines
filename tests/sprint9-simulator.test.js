'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const S=require('../sim-core.js'),B=require('../balance.js'),T=require('../telemetry.js'),C=require('../commanders.js');
const {parseArgs,unusedOutput}=require('../scripts/simulate.js');
const clone=v=>JSON.parse(JSON.stringify(v)),R=B.createRuntime('sprint9');
const options={balanceProfile:'sprint9',count:2,seed:100009,ai:'deck',verify:true,deckA:'commander_stonewall_warden-foundation',deckB:'commander_bruiser_bloodhound-foundation'};
let report;
function fixture(){if(!report){const run=S.createRun(options);while(!run.done)run.step();report=run.result();}return report;}

test('current simulator keeps thirty decks and exact Commander assignments without changing historical pools',()=>{
  const current=S.getDeckCatalog(R.data);assert.equal(current.length,30);assert.equal(current.filter(d=>d.source==='commander-starter').length,10);
  for(const d of current)assert.equal(C.get(d.commanderId).faction,d.faction);
  assert.equal(S.getDeckCatalog(B.dataFor('sprint7')).length,20);assert.equal(S.getDeckCatalog(B.dataFor('sprint6')).length,15);
  const custom={...current[0],id:'same-list-marshal',commanderId:'commander_stonewall_marshal'};
  const row=S.getDeckCatalog(R.data,[custom]).at(-1);assert.equal(row.commanderId,custom.commanderId);assert.deepEqual(row.cards,custom.cards);
  assert.throws(()=>S.normalizeOptions({...options,customDecks:[{...custom,commanderId:'commander_rogue_drifter'}]}),/illegal/i);
});

test('two complete deterministic seat-paired fixtures conserve cards and report separate Commander metrics',()=>{
  const r=fixture();assert.equal(r.completed,2);assert.equal(r.summary.decisive,2);assert.equal(r.summary.errors,0);assert.equal(r.summary.unfinished,0);
  assert.deepEqual(r.matches[0].commanderIds,r.matches[1].commanderIds.slice().reverse());assert.equal(r.matches[0].seed,r.matches[1].seed);
  assert.equal(r.summary.byCommander.length,2);assert.equal(r.summary.byCommander.reduce((n,c)=>n+c.played,0),4);assert.equal(r.summary.byCommander.reduce((n,c)=>n+c.won,0),2);
  assert.equal(r.summary.byCommander.reduce((n,c)=>n+c.activeUses,0),r.summary.actions.commander||0);
  for(const c of r.summary.byCommander){assert.equal(c.played,2);assert.deepEqual(c.seats.map(s=>s.played),[1,1]);assert.ok(c.activeUses<=c.played);assert.ok(c.passiveTriggers>=0);assert.ok(Number.isFinite(c.healingDone));}
  assert.equal(r.rulesSnapshot.commanderVersion,C.VERSION);assert.deepEqual(r.rulesSnapshot.commanders,C.forRules(R.data.RULES).COMMANDERS);
  assert.equal(r.rulesSnapshot.rulesVersion,'sprint9-commanders-v1');assert.equal(r.summary.cards.some(c=>c.type==='commander'),false);
});

test('Commander replay reproduces both fixture outcomes, signatures, telemetry and spent-state snapshots',()=>{
  const r=fixture();for(let index=0;index<2;index++){
    const replay=S.replayMatch(r,index);assert.equal(replay.truncated,false);assert.deepEqual(replay.match,r.matches[index]);assert.deepEqual(replay.metrics.commanders,r.matches[index].commanderUsage);
    for(let player=0;player<2;player++)assert.equal(replay.final.players[player].commander.id,r.matches[index].commanderIds[player]);
    assert.equal(replay.actions.filter(a=>a.action.type==='commander').length,r.matches[index].actions.commander||0);
    assert.ok(replay.actions.filter(a=>a.action.type==='commander').every(a=>a.commanderId&&a.commanderName&&!a.cardId));
  }
  const altered=clone(r);altered.rulesSnapshot.commanders.commander_stonewall_warden.passive.text='Changed doctrine';assert.throws(()=>S.replayMatch(altered,0),/different rules/);
});

test('offline browser-script runtime reproduces the same two Commander fixtures exactly',()=>{
  const context=vm.createContext({console});context.globalThis=context;
  for(const file of ['build-info.js','data.js','commanders.js','deck-rules.js','decks.js','tactical-rules.js','engine.js','ai.js','arsenal.js','tactical-arsenal.js','balance.js','telemetry.js','analytics.js','sim-core.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context,{filename:file});
  const run=context.FrontlinesSimulator.createRun(options);while(!run.done)run.step();assert.deepEqual(clone(run.result()),fixture());
});

test('Commander HTML, CSV, match CSV and CLI export contracts retain names, usage and provenance',()=>{
  const r=fixture(),html=S.reportHTML(r),csv=S.commandersCSV(r);assert.match(html,/Commander performance/);assert.match(html,/The Warden/);assert.match(html,/do not isolate causal Commander strength/);
  assert.match(csv,/presenceSaved,commandActionsSaved,bonusPressure,passiveCardsDrawn,game_version/);assert.equal(csv.trim().split('\r\n').length,3);assert.match(csv,/commander_stonewall_warden/);assert.match(S.matchesCSV(r).split('\r\n')[0],/game_version,p1_commander,p2_commander$/);
  const malicious=clone(r);malicious.summary.byCommander[0].name='=PAYLOAD';assert.match(S.commandersCSV(malicious),/'=PAYLOAD/);
  const historical={summary:{}};assert.equal(S.commandersCSV(historical).trim().split('\r\n').length,1);
  assert.equal(parseArgs(['--pool','commanders','--balance','sprint9','--csv']).pool,'commanders');
  const dir=fs.mkdtempSync(path.join(__dirname,'..','test-results','commander-csv-')),target=path.join(dir,'report.json'),collision=path.join(dir,'report.commanders.csv');
  try{fs.writeFileSync(collision,'existing');assert.notEqual(unusedOutput(target,true),target);assert.equal(fs.readFileSync(collision,'utf8'),'existing');}finally{fs.unlinkSync(collision);fs.rmdirSync(dir);}
});

test('Commander telemetry uses actual discounts and healing, never inserts synthetic card rows',()=>{
  const E=R.engine,state=E.createGame({seed:1009,config:{startingCommand:50,commandCap:60}});
  state.units.push({uid:'wounded',cardId:'stonewall_heavy',owner:0,territory:2,damage:3,ready:true,deployedTurn:0,movedTurn:-1});
  const tracker=T.createTracker({state,data:R.data,engine:E,trace:true}),r=E.dispatch(state,{type:'commander',targetUid:'wounded'},{events:true});tracker.record(state,r.state,{type:'commander',targetUid:'wounded'},{events:r.events});
  const out=tracker.finish(r.state);assert.equal(out.commanders[0].activeUses,1);assert.equal(out.commanders[0].presenceSpent,2);assert.equal(out.commanders[0].healingDone,3);assert.equal(out.commanders[0].commandActionsSpent,1);assert.equal(out.cards.some(c=>c.type==='commander'),false);assert.match(out.trace[0].actionText,/Lasting Resolve/);
});

test('Scavenger signature recovery is not misreported as a reserve draw',()=>{
  const E=R.engine,L=require('../decks.js').forData(R.data),deck={...L.starters().find(d=>d.faction==='rogue'),commanderId:'commander_rogue_scavenger'};
  const state=E.createGame({seed:91,factions:['rogue','stonewall'],decks:[deck,L.starters().find(d=>d.faction==='stonewall')]});
  const recovered=state.players[0].deck.pop();state.players[0].discard.push(recovered);const tracker=T.createTracker({state,data:R.data,engine:E}),before=tracker.summary().cards.find(c=>c.player===0&&c.cardId===recovered).drawn;
  const action={type:'commander'},r=E.dispatch(state,action,{events:true});assert.equal(r.ok,true);tracker.record(state,r.state,action,{events:r.events});const out=tracker.finish(r.state);
  assert.equal(out.commanders[0].cardsRecovered,1);assert.equal(out.cards.find(c=>c.player===0&&c.cardId===recovered).drawn,before);
});
