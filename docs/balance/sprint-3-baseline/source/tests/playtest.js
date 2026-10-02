'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const D = require('../data.js');
const E = require('../engine.js');
const AI = require('../ai.js');

function inventory(state, player) {
  const p = state.players[player];
  const ids = [...p.deck, ...p.discard, ...p.hand.map(c => c.cardId), ...state.units.filter(u => u.owner === player).map(u => u.cardId)];
  return ids.reduce((all, id) => { all[id] = (all[id] || 0) + 1; return all; }, {});
}

function simulate(factions, seed, config = {}, maxTurns = 240) {
  let state = E.createGame({ factions, seed, config });
  const initial = [inventory(state, 0), inventory(state, 1)];
  const result = { factions, seed, winner: null, turns: 0, decisions: 0, captures: 0, reversals: 0, firstCenter: null, actions: {}, largestField: [0,0], minAvailable: Infinity, maxQuietTurns: 0, recycled: false };
  let lastCaptureTurn = 1;
  while (state.winner === null && state.turn <= maxTurns && result.decisions < 10000) {
    E.assertInvariants(state);
    for (let p = 0; p < 2; p++) {
      assert.deepEqual(inventory(state, p), initial[p], `Card conservation failed for P${p+1}, seed ${seed}, turn ${state.turn}`);
      const economy = E.presence(state, p);
      assert.equal(economy.available, economy.command - economy.committed - economy.spent);
      result.largestField[p] = Math.max(result.largestField[p], economy.committed);
      result.minAvailable = Math.min(result.minAvailable, economy.available);
    }
    const action = AI.chooseAction(state);
    assert.ok(action, `AI produced no decision: ${factions} seed ${seed} turn ${state.turn}`);
    const before = state;
    const next = E.dispatch(state, action);
    assert.ok(next.ok, `AI illegal action ${JSON.stringify(action)}: ${next.error}`);
    state = next.state;
    result.actions[action.type] = (result.actions[action.type] || 0) + 1;
    result.decisions++;
    if (state.contested !== before.contested || state.winner !== null) {
      result.captures++;
      if (result.firstCenter === null && before.contested === 3) result.firstCenter = before.attacker;
      if (before.territories[before.contested].owner === before.attacker) result.reversals++;
      result.maxQuietTurns = Math.max(result.maxQuietTurns, before.turn - lastCaptureTurn);
      lastCaptureTurn = before.turn;
    }
  }
  E.assertInvariants(state);
  for (let p = 0; p < 2; p++) assert.deepEqual(inventory(state, p), initial[p]);
  result.turns = state.turn;
  result.winner = state.winner;
  result.maxQuietTurns = Math.max(result.maxQuietTurns, state.turn - lastCaptureTurn);
  result.recycled = state.log.some(e => /recycl|reserv|reshuffl/i.test(e.text));
  result.finalTerritories = [E.controlledCount(state, 0), E.controlledCount(state, 1)];
  return { result, state };
}

function suite(rounds = 4) {
  const factions = Object.keys(D.FACTIONS);
  const matches = [];
  for (let a = 0; a < factions.length; a++) {
    for (let b = 0; b < factions.length; b++) {
      for (let round = 0; round < rounds; round++) {
        const seed = 1009 + a * 10000 + b * 100 + round * 37;
        const { result } = simulate([factions[a], factions[b]], seed);
        matches.push(result);
      }
    }
    console.log(`Completed ${factions[a]} matchups (${matches.length} matches).`);
  }
  const finished = matches.filter(m => m.winner !== null);
  const turns = finished.map(m => m.turns).sort((a,b) => a-b);
  const centerWins = finished.filter(m => m.firstCenter === m.winner).length;
  const summary = {
    generatedAt: new Date().toISOString(),
    method: 'Deterministic baseline AI versus itself. Measures rules robustness and obvious tuning problems, not human enjoyment or competitive balance.',
    config: D.DEFAULT_CONFIG,
    matches: matches.length,
    finished: finished.length,
    unfinished: matches.filter(m => m.winner === null).map(m => ({ factions:m.factions, seed:m.seed, turns:m.turns })),
    turns: { min: turns[0], median: turns[Math.floor(turns.length/2)], max: turns[turns.length-1], mean: +(turns.reduce((a,b)=>a+b,0)/Math.max(1,turns.length)).toFixed(1) },
    firstPlayerWins: finished.filter(m => m.winner === 0).length,
    firstCenterWinnerWins: centerWins,
    firstCenterWinnerLosses: finished.length-centerWins,
    totalCaptures: matches.reduce((a,m)=>a+m.captures,0),
    totalDefensiveReversals: matches.reduce((a,m)=>a+m.reversals,0),
    byFaction: Object.fromEntries(factions.map(faction => {
      const games = finished.filter(m => m.factions[0] !== m.factions[1] && m.factions.includes(faction));
      return [faction, { played:games.length, won:games.filter(m => m.factions[m.winner] === faction).length }];
    })),
    results: matches
  };
  fs.mkdirSync(path.join(__dirname, '..', 'docs'), { recursive:true });
  fs.writeFileSync(path.join(__dirname, '..', 'docs', 'playtest-results.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ ...summary, results:undefined }, null, 2));
  if (summary.unfinished.length) process.exitCode = 1;
  return summary;
}

if (require.main === module) suite(Number(process.argv[2] || 4));
module.exports = { simulate, suite, inventory };
