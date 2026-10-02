'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../sim-core.js');
const D = require('../data.js');
const E = require('../engine.js');
const AI = require('../ai.js');
const {parseArgs} = require('../scripts/simulate.js');
function finish(options) {
  const run = S.createRun(options);
  while (!run.done) run.step();
  return run.result();
}

test('registry exposes five isolated starter decks with valid card inventory', () => {
  const decks = S.getDecks();
  assert.equal(decks.length,5);
  for (const deck of decks) {
    assert.equal(deck.id,`${deck.faction}-starter`);
    assert.deepEqual(deck.cards,D.DECKS[deck.faction]);
    assert.ok(deck.cards.every(id => D.CARDS[id].faction === deck.faction));
  }
  decks[0].cards.pop();
  assert.equal(S.getDecks()[0].cards.length,26);
});
test('options strictly validate workload, seed, cutoffs, decks, and rule configuration', () => {
  assert.equal(S.normalizeOptions({deckA:'rogue',deckB:'nightwalker',count:'12',seed:0}).deckA,'rogue-starter');
  for (const options of [{count:0},{count:100001},{count:1.1},{count:null},{seed:-1},{seed:4294967296},{maxTurns:0},{maxDecisions:100001},{deckA:'unknown'},{mode:'bad'},{verify:'false'},{config:{oops:1}},{config:{startingCommand:30,commandCap:20}}]) {
    assert.throws(() => S.normalizeOptions(options));
  }
});
test('step initializes or advances one decision; partial reports exclude in-progress matches', () => {
  const run = S.createRun({count:2});
  assert.equal(run.completed,0); assert.equal(run.snapshot().current,null);
  run.step(); assert.equal(run.snapshot().current.decisions,0);
  run.step(); assert.equal(run.snapshot().current.decisions,1);
  const partial = run.result();
  assert.equal(partial.completed,0); assert.equal(partial.complete,false);
  assert.equal(partial.matches.length,0); assert.equal(partial.summary.cards.length,0);
  assert.throws(() => S.replayMatch(partial,0),/no completed/i);
});
test('swapped duels use paired seeds and exact odd requested counts', () => {
  const report = finish({count:5,maxDecisions:1,seed:0});
  assert.equal(report.completed,5); assert.equal(report.complete,true);
  const m = report.matches;
  assert.equal(m[0].seed,0); assert.equal(m[0].seed,m[1].seed);
  assert.notEqual(m[1].seed,m[2].seed); assert.equal(m[2].seed,m[3].seed);
  assert.deepEqual(m[0].deckIds,m[1].deckIds.slice().reverse());
  const row = report.summary.byDeck.find(row => row.id === 'stonewall-starter');
  assert.deepEqual(row.seats.map(seat => seat.played),[3,2]);
  assert.equal(report.summary.unfinished,5); assert.equal(report.summary.decisive,0);
  assert.equal(row.winRate,null); assert.equal(row.winInterval,null);
});
test('fixed seats preserve requested sides and use distinct seeds', () => {
  const report = finish({count:3,swapSeats:false,maxDecisions:1});
  assert.ok(report.matches.every(match => match.deckIds[0] === 'stonewall-starter'));
  assert.equal(new Set(report.matches.map(match => match.seed)).size,3);
});
test('matrix full cycle contains every nonmirror ordered pair and paired seeds', () => {
  const report = finish({mode:'matrix',count:20,maxDecisions:1});
  assert.equal(report.matches.length,20);
  assert.equal(new Set(report.matches.map(match => match.deckIds.join(':'))).size,20);
  assert.ok(report.matches.every(match => match.deckIds[0] !== match.deckIds[1]));
  for (let index = 0; index < 20; index += 2) {
    assert.equal(report.matches[index].seed,report.matches[index+1].seed);
    assert.deepEqual(report.matches[index].deckIds,report.matches[index+1].deckIds.slice().reverse());
  }
  for (const deck of report.summary.byDeck) assert.deepEqual(deck.seats.map(seat => seat.played),[4,4]);
});
test('matrix mirrors and partial cycles preserve exact requested total and denominators', () => {
  const report = finish({mode:'matrix',count:25,includeMirrors:true,maxDecisions:1});
  assert.equal(new Set(report.matches.map(match => match.deckIds.join(':'))).size,25);
  assert.equal(report.matches.filter(match => match.deckIds[0] === match.deckIds[1]).length,5);
  assert.equal(report.summary.byDeck.reduce((sum,row) => sum+row.played,0),50);
  assert.equal(report.summary.byMatchup.reduce((sum,row) => sum+row.played,0),25);
  assert.equal(finish({mode:'matrix',count:7,maxDecisions:1}).matches.length,7);
});
test('turn and decision cutoffs are unfinished and never counted as wins', () => {
  const turns = finish({count:1,maxTurns:1,verify:true});
  assert.equal(turns.matches[0].status,'turnLimit');
  assert.equal(turns.matches[0].turns,1); assert.equal(turns.matches[0].winner,null);
  const replay = S.replayMatch(turns,0);
  assert.ok(replay.actions.every(action => action.turn === 1));
  assert.equal(replay.final.turn,2);
  const decisions = finish({count:1,maxDecisions:1});
  assert.equal(decisions.matches[0].status,'decisionLimit');
  assert.equal(decisions.matches[0].decisions,1);
  assert.equal(decisions.summary.firstPlayerWinRate,null);
});
test('seeded results are deterministic and report snapshots are isolated', () => {
  const a = finish({count:8,seed:1321,verify:true});
  const b = finish({count:8,seed:1321,verify:true});
  assert.deepEqual(a,b); assert.equal(a.summary.errors,0); assert.equal(a.summary.decisive,8);
  const run = S.createRun({count:1,maxDecisions:1}); while (!run.done) run.step();
  const changed = run.result(); changed.matches[0].seed++; changed.rulesSnapshot.cards[Object.keys(D.CARDS)[0]].presence++;
  assert.notDeepEqual(changed,run.result());
});
test('mirror wins count one winner and one loser appearance, not two wins', () => {
  const report = finish({count:2,deckA:'bruiser',deckB:'bruiser'});
  assert.equal(report.summary.decisive,2);
  const row = report.summary.byDeck.find(row => row.id === 'bruiser-starter');
  assert.equal(row.played,4); assert.equal(row.decisive,4);
  assert.equal(row.won,2); assert.equal(row.lost,2); assert.equal(row.winRate,0.5);
  const matchup = report.summary.byMatchup[0];
  assert.equal(matchup.played,2); assert.equal(matchup.winsA+matchup.winsB,2);
});
test('headless match is the unchanged engine and AI result and reproducible replay', () => {
  const report = finish({count:1,seed:631,swapSeats:false,verify:true});
  let state = E.createGame({factions:['stonewall','bruiser'],seed:631});
  let decisions = 0;
  while (state.winner === null && state.turn <= 240 && decisions < 10000) {
    const result = E.dispatch(state,AI.chooseAction(state)); assert.equal(result.ok,true);
    state = result.state; decisions++;
  }
  const match = report.matches[0];
  assert.equal(match.winner,state.winner); assert.equal(match.decisions,decisions);
  assert.deepEqual(match.captures,state.stats.captures); assert.deepEqual(match.kills,state.stats.kills);
  const replay = S.replayMatch(report,0);
  assert.deepEqual(replay.match,match);
  assert.equal(replay.truncated,false); assert.equal(replay.actions.length,decisions);
  assert.deepEqual(replay.final.units,state.units);
  assert.ok(replay.actions.some(entry => entry.action.type === 'deploy' && entry.cardName && entry.territoryName));
  assert.ok(replay.log.length > 0 && replay.log.length <= 500);
});
test('replay is bounded and refuses old card or AI rules', () => {
  const report = finish({count:1});
  const limited = S.replayMatch(report,0,1);
  assert.equal(limited.actions.length,1); assert.equal(limited.truncated,true);
  assert.equal(limited.match.status,'replayLimit'); assert.equal(limited.match.winner,null);
  const oldCards = JSON.parse(JSON.stringify(report)); oldCards.rulesSnapshot.dataFingerprint = 'outdated';
  assert.throws(() => S.replayMatch(oldCards,0),/different rules/);
  const oldAI = JSON.parse(JSON.stringify(report)); oldAI.aiVersion = 'future';
  assert.throws(() => S.replayMatch(oldAI,0),/different rules/);
  const oldRules = JSON.parse(JSON.stringify(report)); oldRules.rulesSnapshot.rulesVersion = 'future';
  assert.throws(() => S.replayMatch(oldRules,0),/different rules/);
  const altered = JSON.parse(JSON.stringify(report)); altered.rulesSnapshot.cards[Object.keys(D.CARDS)[0]].attack++;
  assert.throws(() => S.replayMatch(altered,0),/different rules/);
});
test('card descriptive counts match engine deployments/orders/attacks/deaths', () => {
  const report = finish({count:8,seed:1900,verify:true});
  const sums = metric => report.summary.cards.reduce((sum,row) => sum+row[metric],0);
  assert.equal(sums('deployments'),report.summary.actions.deploy || 0);
  assert.equal(sums('attacksInitiated'),report.summary.actions.attack || 0);
  assert.equal(sums('plays'),sums('deployments')+sums('orders'));
  assert.equal(sums('deaths'),report.summary.kills);
  assert.ok(sums('drawn') >= 8*11);
  assert.ok(sums('unitTurnObservations') > 0);
  assert.ok(report.summary.cards.every(row => row.affordableHandEndTurnObservations <= row.handEndTurnObservations));
  assert.equal(report.summary.byFaction.reduce((sum,row) => sum+row.won,0),8);
  assert.equal(report.summary.byFaction.reduce((sum,row) => sum+row.decisive,0),16);
});
test('errors remain diagnostics rather than wins and later trials can continue', () => {
  const Balance=require('../balance.js'),original=Balance.createRuntime;
  Balance.createRuntime=id=>{const runtime=original(id);return {...runtime,ai:{...runtime.ai,chooseAction:()=>({type:'invalid'})}};};
  try {
    const report = finish({count:3});
    assert.equal(report.completed,3); assert.equal(report.summary.errors,3); assert.equal(report.summary.decisive,0);
    assert.ok(report.matches.every(match => match.status === 'error' && match.winner === null && /Illegal AI/.test(match.error)));
  } finally { Balance.createRuntime=original; }
});
test('Wilson intervals and complete rules snapshots accompany decisive rates', () => {
  const report = finish({count:10});
  for (const row of report.summary.byDeck.filter(row => row.decisive)) {
    assert.ok(row.winInterval.low <= row.winRate && row.winInterval.high >= row.winRate);
    assert.ok(row.winInterval.low >= 0 && row.winInterval.high <= 1);
  }
  assert.deepEqual(report.rulesSnapshot.cards,D.CARDS);
  assert.deepEqual(report.rulesSnapshot.config,D.DEFAULT_CONFIG);
  assert.equal(report.rulesSnapshot.decks.length,5);
  assert.ok(report.summary.turns.min <= report.summary.turns.median && report.summary.turns.median <= report.summary.turns.max);
});
test('CSV exports use all matches and readable card headers with escaped fields', () => {
  const report = finish({count:2});
  report.matches[0].error = 'line,"quoted"\nnext';
  assert.ok(S.matchesCSV(report).includes('"line,""quoted""\nnext"'));
  assert.ok(S.matchesCSV(report).startsWith('index,seed,p1_deck'));
  assert.ok(S.cardsCSV(report).includes('attacksInitiated,deaths'));
  const row = report.summary.cards[0]; row.name = '=SUM(A1)';
  assert.ok(S.cardsCSV(report).includes("'=SUM(A1)"));
});
test('CLI arguments map to the shared runner and reject mistakes', () => {
  const parsed = parseArgs(['--count','1000','--a','rogue','--b','stonewall','--mode','matrix','--seed','0','--out','lab.json','--csv','--verify','--fixed-seats','--mirrors']);
  const options = S.normalizeOptions(parsed.options);
  assert.equal(options.count,1000); assert.equal(options.deckA,'rogue-starter'); assert.equal(options.swapSeats,false);
  assert.equal(options.seed,0); assert.equal(parsed.csv,true); assert.equal(parsed.out,'lab.json');
  assert.throws(() => parseArgs(['--count']),/Missing value/);
  assert.throws(() => parseArgs(['--unknown']),/Unknown option/);
});
