'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../data.js');
const E = require('../engine.js');
const AI = require('../ai.js');
const { inventory } = require('./playtest.js');

function randomFor(seed) {
  let value = seed >>> 0;
  return () => {
    value = Math.imul(value, 1664525) + 1013904223 >>> 0;
    return value / 4294967296;
  };
}

function audit(state, initial, context) {
  E.assertInvariants(state);
  for (let player = 0; player < 2; player++) {
    assert.deepEqual(inventory(state, player), initial[player], `Card conservation: ${context}`);
    const p = state.players[player];
    const printedCommitment = state.units.filter(u => u.owner === player)
      .reduce((sum, unit) => sum + D.CARDS[unit.cardId].presence, 0);
    assert.deepEqual(E.presence(state, player), {
      command: p.command, committed: printedCommitment, spent: p.spent,
      available: p.command - printedCommitment - p.spent
    }, `Presence accounting: ${context}`);
  }
  assert.ok(state.log.length <= 500, `Unbounded history: ${context}`);
}

test('10,800 varied legal decisions preserve cards, Presence, input state and response ownership', t => {
  const factions = Object.keys(D.FACTIONS);
  const configs = [
    {},
    { startingCommand: 8, commandGrowth: 2, commandCap: 24, slotsPerTerritory: 2, actionLimit: 2, captureThreshold: 12 },
    { startingCommand: 32, commandGrowth: 0, commandCap: 32, slotsPerTerritory: 3, startingHand: 12, drawCount: 2, captureThreshold: 18 },
    { startingCommand: 40, commandGrowth: 5, commandCap: 70, slotsPerTerritory: 5, actionLimit: 5, drawCount: 0, captureThreshold: 35 },
    { startingCommand: 80, commandGrowth: 0, commandCap: 80, slotsPerTerritory: 7, actionLimit: 4, captureThreshold: 50, startingHand: 20, drawCount: 2 },
    { startingCommand: 1, commandGrowth: 0, commandCap: 1, slotsPerTerritory: 1, actionLimit: 1, captureThreshold: 1, startingHand: 1, drawCount: 0 }
  ];
  const coverage = { decisions: 0, random: 0, attack: 0, response: 0, counter: 0, capture: 0, death: 0, order: 0 };
  // Check every faction pairing. Mixed random/CPU choices explore unusual but
  // valid paths while still bringing armies into contact regularly.
  for (let scenario = 0; scenario < 60; scenario++) {
    const seed = 45031 + scenario * 7919;
    const random = randomFor(seed);
    const pairing = [factions[scenario % 5], factions[Math.floor(scenario / 5) % 5]];
    let state = E.createGame({ factions: pairing, seed, config: configs[scenario % configs.length] });
    const initial = [inventory(state, 0), inventory(state, 1)];
    for (let decision = 0; decision < 180; decision++) {
      if (state.winner !== null) {
        assert.deepEqual(E.legalActions(state), []);
        const rejected = E.dispatch(state, { type: 'endTurn' });
        assert.equal(rejected.ok, false);
        assert.strictEqual(rejected.state, state);
        // Continue this pairing with a new shuffle to guarantee broad coverage.
        state = E.createGame({ factions: pairing, seed: seed + decision, config: configs[scenario % configs.length] });
      }
      const context = `scenario ${scenario}, decision ${decision}, turn ${state.turn}`;
      audit(state, initial, context);
      const snapshot = JSON.stringify(state);
      const legal = E.legalActions(state);
      assert.ok(legal.length, `No legal decision: ${context}`);
      const randomChoice = random() < 0.65;
      const action = randomChoice ? legal[Math.floor(random() * legal.length)] : AI.chooseAction(state);
      coverage.random += Number(randomChoice);
      const wrongActor = E.dispatch(state, { ...action, player: 1 - E.getActor(state) });
      assert.equal(wrongActor.ok, false, `Wrong actor accepted: ${context}`);
      assert.strictEqual(wrongActor.state, state);
      assert.equal(JSON.stringify(state), snapshot, `Rejected decision mutated origin: ${context}`);
      const resolved = E.dispatch(state, action);
      assert.equal(resolved.ok, true, `${context}: ${resolved.error}`);
      assert.equal(JSON.stringify(state), snapshot, `Accepted decision mutated origin: ${context}`);
      audit(resolved.state, initial, context);
      coverage.decisions++;
      coverage.attack += Number(action.type === 'attack');
      coverage.response += Number(action.type === 'respond');
      coverage.counter += Number(action.type === 'counter');
      coverage.order += Number(action.type === 'order');
      coverage.capture += Number(resolved.state.stats.captures[0] + resolved.state.stats.captures[1] > state.stats.captures[0] + state.stats.captures[1]);
      coverage.death += Number(resolved.state.stats.kills[0] + resolved.state.stats.kills[1] > state.stats.kills[0] + state.stats.kills[1]);
      if (state.response) {
        assert.equal(action.type, state.response.stage === 'response' ? 'respond' : 'counter', context);
        assert.equal(resolved.state.actionsLeft, state.actionsLeft, `Reaction used a major action: ${context}`);
        if (action.pass && resolved.state.response === null) {
          const stale = E.dispatch(resolved.state, action);
          assert.equal(stale.ok, false, `Reaction resolved twice: ${context}`);
          assert.strictEqual(stale.state, resolved.state);
        }
      }
      if (action.type === 'deploy' || action.type === 'order') {
        assert.ok(!resolved.state.players.some(p => p.hand.some(item => item.uid === action.handUid)), `Consumed hand card remained available: ${context}`);
        const stale = E.dispatch(resolved.state, action);
        assert.equal(stale.ok, false, `Consumed hand card played twice: ${context}`);
        assert.strictEqual(stale.state, resolved.state);
      }
      if (action.type === 'move' || action.type === 'attack') {
        for (let player = 0; player < 2; player++) {
          assert.deepEqual(E.presence(resolved.state, player), E.presence(state, player), `Movement/declaration changed economy: ${context}`);
        }
      }
      if (action.type === 'endTurn') {
        const contribution = state.units.filter(u => u.owner === state.attacker && u.territory === state.contested)
          .reduce((sum, unit) => sum + D.CARDS[unit.cardId].presence, 0);
        assert.equal(resolved.state.stats.presenceGenerated[state.attacker] - state.stats.presenceGenerated[state.attacker], contribution, context);
        assert.ok(Math.abs(resolved.state.contested - state.contested) <= 1, `Frontline skipped ground: ${context}`);
        const captures = resolved.state.stats.captures[state.attacker] - state.stats.captures[state.attacker];
        const expectedProgress = state.territories[state.contested].progress[state.attacker] + contribution;
        assert.equal(captures, Number(expectedProgress >= state.config.captureThreshold), `Capture threshold drifted: ${context}`);
        if (captures) {
          assert.equal(resolved.state.territories[state.contested].owner, state.attacker, context);
          assert.ok(resolved.state.territories.every(t => t.progress.every(value => value === 0)), `Capture did not reset both progress tracks: ${context}`);
        } else {
          assert.equal(resolved.state.territories[state.contested].progress[state.attacker], expectedProgress, `Progress changed without a capture: ${context}`);
        }
      }
      state = resolved.state;
    }
  }
  assert.ok(coverage.decisions >= 10000, JSON.stringify(coverage));
  assert.ok(coverage.random >= 5000, JSON.stringify(coverage));
  for (const category of ['attack', 'response', 'counter', 'capture', 'death', 'order']) {
    assert.ok(coverage[category] > 0, `Missing ${category} coverage: ${JSON.stringify(coverage)}`);
  }
  t.diagnostic(`Coverage: ${JSON.stringify(coverage)}`);
});
