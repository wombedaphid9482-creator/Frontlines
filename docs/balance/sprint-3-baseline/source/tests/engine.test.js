'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../engine.js');
const D = require('../data.js');

let fixtureUid = 1000;
function fixture(config) {
  const state = E.createGame({ seed: 12345, config: { startingCommand: 80, commandCap: 80, ...config } });
  state.players.forEach(player => { player.hand = []; });
  return state;
}
function field(state, cardId, owner = 0, territory = 3, changes) {
  const unit = { uid: `fixture${fixtureUid++}`, cardId, owner, territory, damage: 0, ready: true, deployedTurn: 0, movedTurn: -1, ...changes };
  state.units.push(unit);
  return unit;
}
function hand(state, cardId, owner = 0) {
  const item = { uid: `fixture${fixtureUid++}`, cardId };
  state.players[owner].hand.push(item);
  return item;
}
function doAction(state, action) {
  const before = JSON.stringify(state);
  const result = E.dispatch(state, action);
  assert.equal(result.ok, true, result.error);
  assert.equal(JSON.stringify(state), before, 'dispatch mutated its input');
  E.assertInvariants(result.state);
  return result.state;
}
function reject(state, action, pattern) {
  const before = JSON.stringify(state);
  const result = E.dispatch(state, action);
  assert.equal(result.ok, false);
  assert.strictEqual(result.state, state);
  assert.equal(JSON.stringify(state), before);
  if (pattern) assert.match(result.error, pattern);
}
function beginCombat(state, attacker, defender) { return doAction(state, { type: 'attack', unitUid: attacker.uid, targetUid: defender.uid }); }

test('seeded setup, Command growth, opening draws, initiative and readiness', () => {
  let state = E.createGame({ seed: 72 });
  assert.deepEqual(state, E.createGame({ seed: 72 }));
  assert.equal(state.players[0].hand.length, 6);
  assert.equal(state.players[1].hand.length, 5);
  assert.deepEqual(state.players.map(p => p.command), [20, 20]);
  assert.deepEqual(state.territories.map(t => t.owner), [0, 0, 0, null, 1, 1, 1]);
  state = doAction(state, { type: 'endTurn' });
  assert.equal(state.attacker, 1);
  assert.equal(state.players[1].command, 20);
  state = doAction(state, { type: 'endTurn' });
  assert.equal(state.players[0].command, 30);
  assert.equal(state.players[1].command, 20);
  assert.equal(state.turn, 3);
});

test('configuration rejects nonfinite, fractional, zero actions and invalid factions', () => {
  for (const config of [{ actionLimit: 0 }, { startingCommand: Infinity }, { startingHand: NaN }, { drawCount: 1.5 }, { commandCap: 19 }, { victoryTerritories: 8 }]) {
    assert.throws(() => E.createGame({ config }));
  }
  assert.throws(() => E.createGame({ factions: ['unknown', 'bruiser'] }));
});

test('deployment commits Presence, enforces ownership, capacity, unique and affordability', () => {
  let state = fixture({ startingCommand: 20, slotsPerTerritory: 1 });
  const unit = hand(state, 'stonewall_commander');
  const copy = hand(state, 'stonewall_commander');
  const other = hand(state, 'stonewall_heavy');
  reject(state, { type: 'deploy', handUid: unit.uid, territory: 3 }, /control/);
  state = doAction(state, { type: 'deploy', handUid: unit.uid, territory: 2 });
  assert.deepEqual(E.presence(state, 0), { command: 20, committed: 7, spent: 0, available: 13 });
  reject(state, { type: 'deploy', handUid: copy.uid, territory: 1 }, /unique/);
  reject(state, { type: 'deploy', handUid: other.uid, territory: 2 }, /slots/);
  state.players[0].spent = 6;
  reject(state, { type: 'deploy', handUid: other.uid, territory: 1 }, /Requires 8.*7 available/);
});

test('movement is adjacent, respects frontline and exhausts; Mobile works only once per turn', () => {
  let state = fixture();
  const ordinary = field(state, 'stonewall_rifles', 0, 1);
  const mobile = field(state, 'rogue_outrider', 0, 1);
  reject(state, { type: 'move', unitUid: ordinary.uid, territory: 3 }, /adjacent/);
  state = doAction(state, { type: 'move', unitUid: ordinary.uid, territory: 2 });
  reject(state, { type: 'move', unitUid: ordinary.uid, territory: 3 }, /exhausted/);
  state = doAction(state, { type: 'move', unitUid: mobile.uid, territory: 2 });
  assert.equal(state.units.find(u => u.uid === mobile.uid).ready, true);
  state = doAction(state, { type: 'move', unitUid: mobile.uid, territory: 3 });
  assert.equal(state.units.find(u => u.uid === mobile.uid).ready, false);
  state.actionsLeft = 3;
  state.units.find(u => u.uid === mobile.uid).ready = true;
  reject(state, { type: 'move', unitUid: mobile.uid, territory: 4 }, /beyond/);
});

test('new units may move; Rush plus Mobile permits deployment-turn assault', () => {
  let state = fixture();
  const normal = hand(state, 'stonewall_rifles');
  const victim = field(state, 'bruiser_heavy', 1, 2);
  state = doAction(state, { type: 'deploy', handUid: normal.uid, territory: 2 });
  reject(state, { type: 'attack', unitUid: normal.uid, targetUid: victim.uid }, /Newly deployed/);
  state = doAction(state, { type: 'move', unitUid: normal.uid, territory: 3 });
  assert.equal(state.units.find(u => u.uid === normal.uid).territory, 3);
  state = fixture();
  const rush = hand(state, 'rogue_raider');
  const enemy = field(state, 'bruiser_heavy', 1, 3);
  state = doAction(state, { type: 'deploy', handUid: rush.uid, territory: 2 });
  state = doAction(state, { type: 'move', unitUid: rush.uid, territory: 3 });
  state = beginCombat(state, rush, enemy);
  assert.equal(state.response.stage, 'response');
});

test('simultaneous damage kills both and frees commitment; repeated resolution is rejected', () => {
  let state = fixture();
  const a = field(state, 'nightwalker_blade');
  const b = field(state, 'nightwalker_blade', 1);
  state = beginCombat(state, a, b);
  assert.equal(E.getActor(state), 1);
  assert.equal(state.actionsLeft, 2);
  reject(state, { type: 'endTurn' }, /response/);
  reject(state, { type: 'respond', pass: true, player: 0 }, /Player 2/);
  state = doAction(state, { type: 'respond', pass: true });
  assert.equal(state.response, null);
  assert.equal(state.units.length, 0);
  assert.equal(E.presence(state, 0).committed, 0);
  assert.deepEqual(state.stats.kills, [1, 1]);
  reject(state, { type: 'respond', pass: true }, /no pending/);
  reject(state, { type: 'attack', unitUid: a.uid, targetUid: b.uid }, /surviving/);
});

test('Guard redirects once, exhausts, cannot be countered; Precision bypasses it', () => {
  let state = fixture();
  const a = field(state, 'bruiser_heavy');
  const target = field(state, 'bruiser_heavy', 1);
  const guard = field(state, 'stonewall_defender', 1);
  const counter = hand(state, 'syndicate_counter');
  state = beginCombat(state, a, target);
  state = doAction(state, { type: 'respond', guardUid: guard.uid });
  assert.equal(state.response.defenderUid, guard.uid);
  assert.equal(E.getActor(state), 0);
  assert.equal(state.units.find(u => u.uid === guard.uid).ready, false);
  reject(state, { type: 'counter', handUid: counter.uid }, /Guard/);
  state = doAction(state, { type: 'counter', pass: true });
  assert.equal(state.units.find(u => u.uid === guard.uid).damage, D.CARDS[a.cardId].attack);
  assert.equal(state.units.find(u => u.uid === target.uid).damage, 0);
  state = fixture();
  const sniper = field(state, 'nightwalker_marksman');
  const enemy = field(state, 'bruiser_heavy', 1);
  const intercept = field(state, 'stonewall_defender', 1);
  state = beginCombat(state, sniper, enemy);
  reject(state, { type: 'respond', guardUid: intercept.uid }, /Precision/);
});

test('shield and counter are paid once; canceled defender Order does not reduce combat damage', () => {
  let state = fixture();
  const a = field(state, 'bruiser_heavy');
  const b = field(state, 'stonewall_defender', 1);
  const shield = hand(state, 'stonewall_brace', 1);
  const counter = hand(state, 'syndicate_counter');
  state = beginCombat(state, a, b);
  state = doAction(state, { type: 'respond', handUid: shield.uid });
  reject(state, { type: 'respond', pass: true }, /counter/);
  state = doAction(state, { type: 'counter', handUid: counter.uid });
  assert.equal(state.units.find(u => u.uid === b.uid).damage, D.CARDS[a.cardId].attack);
  assert.deepEqual(state.players.map(p => p.spent), [2, 2]);
  assert.equal(state.actionsLeft, 2);
  reject(state, { type: 'counter', handUid: counter.uid }, /no pending/);
  state = doAction(state, { type: 'endTurn' });
  assert.deepEqual(state.players.map(p => p.spent), [2, 0]);
  state = doAction(state, { type: 'endTurn' });
  assert.deepEqual(state.players.map(p => p.spent), [0, 0]);
});

test('shield stacks with owned-ground Fortify only for combat', () => {
  let state = fixture();
  const a = field(state, 'bruiser_heavy', 0, 4);
  const b = field(state, 'stonewall_heavy', 1, 4);
  const shield = hand(state, 'stonewall_brace', 1);
  state = beginCombat(state, a, b);
  state = doAction(state, { type: 'respond', handUid: shield.uid });
  state = doAction(state, { type: 'counter', pass: true });
  const combatDamage = Math.max(0, D.CARDS[a.cardId].attack - D.CARDS[shield.cardId].effect.amount - 1);
  assert.equal(state.units.find(u => u.uid === b.uid).damage, combatDamage);
  const damage = hand(state, 'stonewall_fire_support');
  state = doAction(state, { type: 'order', handUid: damage.uid, targetUid: b.uid });
  assert.equal(state.units.find(u => u.uid === b.uid).damage, combatDamage + D.CARDS[damage.cardId].effect.amount);
});

test('precombat Ambush killing the attacker prevents retaliation and resolves once', () => {
  let state = fixture();
  const a = field(state, 'nightwalker_marksman');
  const b = field(state, 'bruiser_heavy', 1);
  const ambush = hand(state, 'bruiser_ambush', 1);
  state = beginCombat(state, a, b);
  state = doAction(state, { type: 'respond', handUid: ambush.uid });
  state = doAction(state, { type: 'counter', pass: true });
  assert.equal(state.units.some(u => u.uid === a.uid), false);
  assert.equal(state.units.find(u => u.uid === b.uid).damage, 0);
  assert.equal(state.response, null);
  assert.equal(state.stats.kills[1], 1);
});

test('retreat changes territory, exhausts and cancels combat; full destination blocks response', () => {
  let state = fixture({ slotsPerTerritory: 1 });
  const a = field(state, 'bruiser_heavy');
  const b = field(state, 'rogue_outrider', 1);
  const retreat = hand(state, 'rogue_retreat', 1);
  field(state, 'rogue_outrider', 1, 4);
  state = beginCombat(state, a, b);
  reject(state, { type: 'respond', handUid: retreat.uid }, /slots/);
  state.units = state.units.filter(u => u.territory !== 4);
  state = doAction(state, { type: 'respond', handUid: retreat.uid });
  state = doAction(state, { type: 'counter', pass: true });
  const survivor = state.units.find(u => u.uid === b.uid);
  assert.equal(survivor.territory, 4);
  assert.equal(survivor.ready, false);
  assert.equal(survivor.damage, 0);
  assert.equal(state.units.find(u => u.uid === a.uid).damage, 0);
});

test('Berserk and Command use precombat damage; Medic heals on owner turn only', () => {
  let state = fixture();
  const brawler = field(state, 'bruiser_brawler', 0, 2, { damage: 1 });
  field(state, 'bruiser_commander', 0, 2);
  const medic = field(state, 'stonewall_medic', 0, 2, { damage: 2 });
  assert.equal(E.attackValue(state, brawler), 5);
  state = doAction(state, { type: 'endTurn' });
  assert.equal(state.units.find(u => u.uid === brawler.uid).damage, 1);
  state = doAction(state, { type: 'endTurn' });
  assert.equal(state.units.find(u => u.uid === brawler.uid).damage, 0);
  assert.equal(state.units.find(u => u.uid === medic.uid).damage, 1);
  assert.equal(E.attackValue(state, state.units.find(u => u.uid === brawler.uid)), 4);
});

test('Orders keep temporary spending; heal/rally/reclaim target rules and reclaimed wounds reset', () => {
  let state = fixture();
  const unit = field(state, 'rogue_outrider', 0, 2, { damage: 2, ready: false });
  const heal = hand(state, 'stonewall_triage');
  const rally = hand(state, 'rogue_rally');
  const reclaim = hand(state, 'rogue_reclaim');
  state = doAction(state, { type: 'order', handUid: heal.uid, targetUid: unit.uid });
  assert.equal(state.units[0].damage, 0);
  state = doAction(state, { type: 'order', handUid: rally.uid, targetUid: unit.uid });
  assert.equal(state.units[0].ready, true);
  state = doAction(state, { type: 'order', handUid: reclaim.uid, targetUid: unit.uid });
  assert.equal(E.presence(state, 0).committed, 0);
  assert.equal(E.presence(state, 0).spent, 6);
  assert.equal(state.players[0].hand.find(item => item.uid === unit.uid).cardId, unit.cardId);
  state = doAction(state, { type: 'endTurn' });
  state = doAction(state, { type: 'endTurn' });
  state = doAction(state, { type: 'deploy', handUid: unit.uid, territory: 2 });
  assert.equal(state.units[0].damage, 0);
});

test('Disrupt never creates negative available Presence and blocks only affordable reactions', () => {
  let state = fixture();
  state.players[1].command = 20;
  field(state, 'bruiser_heavy', 1);
  field(state, 'bruiser_commander', 1);
  field(state, 'nightwalker_blade', 1);
  const disrupt = hand(state, 'syndicate_disrupt');
  assert.equal(E.presence(state, 1).available, 1);
  state = doAction(state, { type: 'order', handUid: disrupt.uid });
  assert.equal(E.presence(state, 1).available, 0);
  assert.equal(state.players[1].spent, 1);
  state = doAction(state, { type: 'endTurn' });
  assert.equal(state.players[1].spent, 0);
});

test('end-of-turn Presence belongs only to ending player and counts amid enemies', () => {
  let state = fixture({ captureThreshold: 10 });
  field(state, 'bruiser_heavy', 0);
  field(state, 'stonewall_rifles', 1);
  state = doAction(state, { type: 'endTurn' });
  assert.deepEqual(state.territories[3].progress, [8, 0]);
  state = doAction(state, { type: 'endTurn' });
  assert.deepEqual(state.territories[3].progress, [8, 4]);
  state = doAction(state, { type: 'endTurn' });
  assert.equal(state.territories[3].owner, 0);
  assert.equal(state.contested, 4);
  assert.deepEqual(state.territories[3].progress, [0, 0]);
  assert.equal(state.units.length, 2);
});

test('defender can secure already-owned objective, push back and stranded survivors can recover', () => {
  let state = fixture({ captureThreshold: 4 });
  field(state, 'stonewall_rifles', 0);
  state = doAction(state, { type: 'endTurn' });
  assert.equal(state.contested, 4);
  const stranded = field(state, 'rogue_outrider', 0, 4);
  field(state, 'stonewall_rifles', 1, 4);
  state = doAction(state, { type: 'endTurn' });
  assert.equal(state.contested, 3);
  assert.equal(state.territories[4].owner, 1);
  assert.equal(state.units.find(u => u.uid === stranded.uid).territory, 4);
  reject(state, { type: 'move', unitUid: stranded.uid, territory: 5 }, /stranded/);
  state = doAction(state, { type: 'move', unitUid: stranded.uid, territory: 3 });
  assert.equal(state.units.find(u => u.uid === stranded.uid).territory, 3);
});

test('breakthrough immediately creates contact instead of an unreachable own-ground capture loop', () => {
  let state = fixture({ captureThreshold: 4 });
  const pushing = field(state, 'stonewall_rifles', 0, 3, { ready: false, damage: 1 });
  const defending = field(state, 'bruiser_heavy', 1, 4);
  state = doAction(state, { type: 'endTurn' });
  assert.equal(state.contested, 4);
  const advanced = state.units.find(unit => unit.uid === pushing.uid);
  assert.equal(advanced.territory, 4);
  assert.equal(advanced.ready, false);
  assert.equal(advanced.damage, 1);
  assert.ok(E.legalActions(state).some(action => action.type === 'attack' && action.unitUid === defending.uid && action.targetUid === pushing.uid));
  state = beginCombat(state, defending, advanced);
  state = doAction(state, { type: 'respond', pass: true });
  assert.equal(state.units.some(unit => unit.uid === pushing.uid), false);
});

test('breakthrough honors capacity and oldest deployment, leaves assets/overflow, and conserves cards', () => {
  let state = fixture({ captureThreshold: 4, slotsPerTerritory: 3 });
  const newer = field(state, 'stonewall_rifles', 0, 3, { deployedTurn: 1 });
  const oldest = field(state, 'stonewall_defender', 0, 3, { deployedTurn: 0, damage: 2, ready: false });
  const asset = field(state, 'stonewall_aid_station', 0, 3);
  field(state, 'stonewall_rifles', 0, 4);
  field(state, 'stonewall_rifles', 0, 4);
  const cardIds = state.units.map(unit => unit.cardId).sort();
  state = doAction(state, { type: 'endTurn' });
  assert.equal(state.units.find(unit => unit.uid === oldest.uid).territory, 4);
  assert.equal(state.units.find(unit => unit.uid === oldest.uid).damage, 2);
  assert.equal(state.units.find(unit => unit.uid === oldest.uid).ready, false);
  assert.equal(state.units.find(unit => unit.uid === newer.uid).territory, 3);
  assert.equal(state.units.find(unit => unit.uid === asset.uid).territory, 3);
  assert.equal(E.unitsAt(state, 4, 0).length, 3);
  assert.deepEqual(state.units.map(unit => unit.cardId).sort(), cardIds);
});

test('assets remain immobile passive support and still contribute territorial Presence', () => {
  let state = fixture();
  const asset = field(state, 'bruiser_banner', 0, 3);
  const soldier = field(state, 'bruiser_heavy', 0, 3);
  const enemy = field(state, 'bruiser_heavy', 1, 3);
  assert.equal(E.attackValue(state, soldier), D.CARDS[soldier.cardId].attack + 1);
  assert.equal(E.attackValue(state, asset), 0);
  reject(state, { type: 'move', unitUid: asset.uid, territory: 2 }, /Assets/);
  reject(state, { type: 'attack', unitUid: asset.uid, targetUid: enemy.uid }, /Assets/);
  state = doAction(state, { type: 'endTurn' });
  assert.equal(state.territories[3].progress[0], 13);
});

test('draw rebuilds shuffled reserves, preserves card count and skips fully empty supply', () => {
  let state = fixture();
  state.players[1].deck = [];
  state.players[1].discard = ['stonewall_rifles', 'stonewall_heavy'];
  state = doAction(state, { type: 'endTurn' });
  assert.equal(state.players[1].hand.length, 1);
  assert.equal(state.players[1].deck.length, 1);
  assert.equal(state.players[1].discard.length, 0);
  state.players.forEach(p => { p.deck = []; p.discard = []; p.hand = []; });
  state = doAction(state, { type: 'endTurn' });
  assert.equal(state.players[0].hand.length, 0);
  assert.equal(state.attacker, 0);
});

test('home conquest and configured shorter conquest stop all further actions', () => {
  let state = fixture({ captureThreshold: 1 });
  state.contested = 6;
  field(state, 'bruiser_heavy', 0, 6);
  state = doAction(state, { type: 'endTurn' });
  assert.equal(state.winner, 0);
  assert.deepEqual(E.legalActions(state), []);
  reject(state, { type: 'endTurn' }, /over/);
  state = fixture({ captureThreshold: 1, victoryTerritories: 4 });
  field(state, 'bruiser_heavy', 0);
  state = doAction(state, { type: 'endTurn' });
  assert.equal(state.winner, 0);
});

test('all enumerated legal actions roundtrip in normal, response and counter states', () => {
  let state = fixture();
  const a = field(state, 'bruiser_heavy');
  const b = field(state, 'rogue_outrider', 1);
  field(state, 'stonewall_defender', 1);
  for (const [cardId, definition] of Object.entries(D.CARDS)) {
    if (definition.type === 'order') hand(state, cardId, definition.timing === 'response' ? 1 : 0);
  }
  hand(state, 'stonewall_rifles');
  for (const action of E.legalActions(state)) doAction(state, action);
  state = beginCombat(state, a, b);
  for (const action of E.legalActions(state)) doAction(state, action);
  const response = E.legalActions(state).find(action => action.handUid);
  state = doAction(state, response);
  for (const action of E.legalActions(state)) doAction(state, action);
  reject(state, null, /Choose/);
  reject(state, {}, /Choose/);
  reject(state, { type: 'counter', pass: true, handUid: 'bad' }, /exactly one/);
});

test('debug operations are immutable, labeled and cancel destroyed response participants safely', () => {
  let state = fixture();
  const a = field(state, 'bruiser_heavy');
  const b = field(state, 'bruiser_heavy', 1);
  state = beginCombat(state, a, b);
  const original = JSON.stringify(state);
  let changed = E.debug(state, { type: 'destroy', unitUid: a.uid });
  assert.equal(JSON.stringify(state), original);
  assert.equal(changed.response, null);
  assert.ok(changed.log.some(entry => entry.type === 'debug'));
  changed = E.debug(changed, { type: 'presence', amount: 10 });
  assert.equal(changed.players[0].command, 90);
  E.assertInvariants(changed);
  const captured = E.debug(state, { type: 'capture', player: 0 });
  assert.equal(captured.response, null);
  assert.equal(captured.contested, 4);
  assert.equal(captured.units.find(unit => unit.uid === a.uid).territory, 4);
  E.assertInvariants(captured);
});

test('invariant audit detects duplicate IDs, invalid economy, dead units and capacity overflow', () => {
  let state = fixture();
  const unit = field(state, 'stonewall_rifles');
  state.players[0].hand.push({ uid: unit.uid, cardId: unit.cardId });
  assert.throws(() => E.assertInvariants(state), /duplicate/);
  state = fixture(); state.players[0].spent = 81;
  assert.throws(() => E.assertInvariants(state), /Presence/);
  state = fixture(); field(state, 'stonewall_rifles', 0, 3, { damage: 5 });
  assert.throws(() => E.assertInvariants(state), /dead/);
  state = fixture({ slotsPerTerritory: 1 }); field(state, 'stonewall_rifles'); field(state, 'stonewall_rifles');
  assert.throws(() => E.assertInvariants(state), /capacity/);
});
