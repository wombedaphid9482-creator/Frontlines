'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../data.js');
const E = require('../engine.js');
const FX = require('../effects.js');

let nextUid = 8000;
function fixture(config = {}) {
  const state = E.createGame({ seed: 1193, config: { startingCommand: 80, commandCap: 80, ...config } });
  state.players.forEach(p => { p.hand = []; p.deck = []; p.discard = []; });
  return state;
}
function field(state, cardId, owner = 0, territory = 3, changes = {}) {
  const unit = { uid: `effects${nextUid++}`, cardId, owner, territory, damage: 0, ready: true, deployedTurn: 0, movedTurn: -1, ...changes };
  state.units.push(unit);
  return unit;
}
function hand(state, cardId, owner = 0) {
  const item = { uid: `effects${nextUid++}`, cardId };
  state.players[owner].hand.push(item);
  return item;
}
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function step(before, action) {
  const result = E.dispatch(before, action);
  assert.equal(result.ok, true, result.error);
  freeze(before); freeze(result.state); freeze(action);
  const beforeText = JSON.stringify(before), afterText = JSON.stringify(result.state);
  const events = FX.deriveEvents(before, result.state, action);
  assert.deepEqual(FX.deriveEvents(before, result.state, action), events, 'Event derivation is nondeterministic');
  assert.equal(JSON.stringify(before), beforeText, 'Effects mutated prior rules state');
  assert.equal(JSON.stringify(result.state), afterText, 'Effects mutated resulting rules state');
  return { state: result.state, events };
}
const ofType = (events, type) => events.filter(e => e.type === type);
const forUnit = (events, type, uid) => events.find(e => e.type === type && e.unit?.uid === uid);
function resource(events, player, key) { return events.find(e => e.type === 'resource' && e.player === player && e.key === key); }
function attack(state, a, b) { return step(state, { type: 'attack', unitUid: a.uid, targetUid: b.uid }).state; }

test('effect derivation is empty for missing or unchanged state', () => {
  const state = freeze(fixture());
  assert.deepEqual(FX.deriveEvents(null, state), []);
  assert.deepEqual(FX.deriveEvents(state, null), []);
  assert.deepEqual(FX.deriveEvents(state, state), []);
});

test('deployment and movement report the actual unit and exact commitment changes', () => {
  const before = fixture();
  const item = hand(before, 'stonewall_rifles');
  const deployed = step(before, { type: 'deploy', handUid: item.uid, territory: 2 });
  const event = forUnit(deployed.events, 'deploy', item.uid);
  assert.equal(event.unit.territory, 2);
  assert.equal(event.handUid, item.uid);
  assert.deepEqual(resource(deployed.events, 0, 'committed'), { type: 'resource', player: 0, key: 'committed', from: 0, to: D.CARDS[item.cardId].presence });
  assert.equal(resource(deployed.events, 0, 'available').to, 80 - D.CARDS[item.cardId].presence);
  assert.equal(ofType(deployed.events, 'death').length, 0);
  const moved = step(deployed.state, { type: 'move', unitUid: item.uid, territory: 3 });
  const moving = forUnit(moved.events, 'move', item.uid);
  assert.deepEqual([moving.from, moving.to], [2, 3]);
  assert.equal(ofType(moved.events, 'resource').length, 0);
});

test('an offensive Order emits its effect, damage and temporary spending once', () => {
  const before = fixture();
  const target = field(before, 'stonewall_heavy', 1);
  const item = hand(before, 'stonewall_fire_support');
  const { events } = step(before, { type: 'order', handUid: item.uid, targetUid: target.uid });
  assert.deepEqual(ofType(events, 'order'), [{ type: 'order', player: 0, cardId: item.cardId, targetUid: target.uid, kind: 'damage' }]);
  assert.equal(forUnit(events, 'damage', target.uid).amount, D.CARDS[item.cardId].effect.amount);
  assert.equal(resource(events, 0, 'spent').to, D.CARDS[item.cardId].presence);
  assert.equal(resource(events, 0, 'committed'), undefined);
  assert.equal(ofType(events, 'combat').length, 0);
});

test('attack and resolved combat have separate phases and simultaneous hit events', () => {
  const before = fixture();
  const a = field(before, 'bruiser_heavy');
  const b = field(before, 'stonewall_heavy', 1);
  const declared = step(before, { type: 'attack', unitUid: a.uid, targetUid: b.uid });
  assert.deepEqual(ofType(declared.events, 'engage'), [{ type: 'engage', attackerUid: a.uid, defenderUid: b.uid, role: 'heavy', owner: 0 }]);
  assert.deepEqual(ofType(declared.events, 'phase'), [{ type: 'phase', actor: 1, stage: 'response', turn: 1 }]);
  assert.equal(ofType(declared.events, 'damage').length, 0);
  const resolved = step(declared.state, { type: 'respond', pass: true });
  assert.equal(ofType(resolved.events, 'combat')[0].exchanged, true);
  assert.equal(forUnit(resolved.events, 'damage', b.uid).amount, D.CARDS[a.cardId].attack);
  assert.equal(forUnit(resolved.events, 'damage', a.uid).amount, D.CARDS[b.cardId].attack);
  assert.deepEqual(ofType(resolved.events, 'phase'), [{ type: 'phase', actor: 0, stage: 'attack', turn: 1 }]);
});

test('simultaneous lethal combat frees both commitments and emits two deaths', () => {
  const before = fixture();
  const a = field(before, 'nightwalker_blade');
  const b = field(before, 'nightwalker_blade', 1);
  const pending = attack(before, a, b);
  const { events, state } = step(pending, { type: 'respond', pass: true });
  assert.equal(state.units.length, 0);
  assert.equal(ofType(events, 'combat')[0].exchanged, true);
  assert.equal(ofType(events, 'death').length, 2);
  for (const unit of [a, b]) {
    assert.equal(forUnit(events, 'death', unit.uid).presence, D.CARDS[unit.cardId].presence);
    assert.equal(resource(events, unit.owner, 'committed').to, 0);
    assert.equal(resource(events, unit.owner, 'available').to, 80);
  }
});

test('Guard intercept changes the visual target and the final combat hits the Guard', () => {
  const before = fixture();
  const a = field(before, 'bruiser_heavy');
  const b = field(before, 'stonewall_heavy', 1);
  const guard = field(before, 'stonewall_defender', 1);
  const pending = attack(before, a, b);
  const redirected = step(pending, { type: 'respond', guardUid: guard.uid });
  assert.equal(ofType(redirected.events, 'intercept').length, 1);
  const resolved = step(redirected.state, { type: 'counter', pass: true });
  assert.equal(ofType(resolved.events, 'combat')[0].defenderUid, guard.uid);
  assert.equal(forUnit(resolved.events, 'damage', b.uid), undefined);
  assert.equal(forUnit(resolved.events, 'damage', guard.uid).amount, D.CARDS[a.cardId].attack);
});

test('countered shields retain both spending events and apply unshielded combat', () => {
  const before = fixture();
  const a = field(before, 'bruiser_heavy');
  const b = field(before, 'stonewall_defender', 1);
  const shield = hand(before, 'stonewall_brace', 1);
  const counter = hand(before, 'syndicate_counter');
  const pending = attack(before, a, b);
  const guarded = step(pending, { type: 'respond', handUid: shield.uid });
  assert.equal(ofType(guarded.events, 'combat').length, 0);
  assert.equal(ofType(guarded.events, 'ability').length, 0, 'A deferred shield was shown before resolution');
  assert.equal(resource(guarded.events, 1, 'spent').to, D.CARDS[shield.cardId].presence);
  assert.deepEqual(ofType(guarded.events, 'phase'), [{ type: 'phase', actor: 0, stage: 'counter', turn: 1 }]);
  const resolved = step(guarded.state, { type: 'counter', handUid: counter.uid });
  assert.equal(resource(resolved.events, 0, 'spent').to, D.CARDS[counter.cardId].presence);
  assert.equal(forUnit(resolved.events, 'damage', b.uid).amount, D.CARDS[a.cardId].attack);
  assert.equal(ofType(resolved.events, 'combat')[0].exchanged, true);
  assert.equal(ofType(resolved.events, 'ability').length, 0, 'A canceled shield still appeared to resolve');
});

test('a shield that absorbs every incoming hit still represents an exchanged combat', () => {
  const before = fixture();
  const a = field(before, 'stonewall_defender');
  const b = field(before, 'stonewall_heavy', 1);
  const shield = hand(before, 'stonewall_brace', 1);
  const pending = attack(before, a, b);
  const response = step(pending, { type: 'respond', handUid: shield.uid });
  const resolved = step(response.state, { type: 'counter', pass: true });
  assert.equal(ofType(resolved.events, 'combat')[0].exchanged, true);
  assert.equal(forUnit(resolved.events, 'damage', b.uid), undefined);
  assert.equal(forUnit(resolved.events, 'damage', a.uid).amount, D.CARDS[b.cardId].attack);
  assert.deepEqual(ofType(resolved.events, 'ability'), [{ type: 'ability', player: 1, cardId: shield.cardId, kind: 'shield', targetUid: b.uid }]);
});

test('countering a lethal Ambush preserves the attack even if retaliation then kills the attacker', () => {
  const before = fixture();
  const a = field(before, 'nightwalker_marksman');
  const b = field(before, 'stonewall_heavy', 1);
  const ambush = hand(before, 'bruiser_ambush', 1);
  const counter = hand(before, 'syndicate_counter');
  const pending = attack(before, a, b);
  const response = step(pending, { type: 'respond', handUid: ambush.uid });
  const resolved = step(response.state, { type: 'counter', handUid: counter.uid });
  assert.equal(ofType(resolved.events, 'combat')[0].exchanged, true);
  assert.equal(forUnit(resolved.events, 'damage', b.uid).amount, D.CARDS[a.cardId].attack);
  assert.ok(forUnit(resolved.events, 'death', a.uid));
  assert.equal(ofType(resolved.events, 'ability').length, 0, 'A canceled Ambush still appeared to hit');
});

test('retreat emits a move with no damage, death or exchanged combat after a full history', () => {
  const before = fixture();
  const a = field(before, 'bruiser_heavy');
  const b = field(before, 'rogue_outrider', 1);
  const retreat = hand(before, 'rogue_retreat', 1);
  before.log = Array.from({ length: 500 }, (_, i) => ({ turn: 1, type: 'info', text: `History ${i}` }));
  const pending = attack(before, a, b);
  const response = step(pending, { type: 'respond', handUid: retreat.uid });
  const resolved = step(response.state, { type: 'counter', pass: true });
  assert.equal(resolved.state.log.length, 500);
  assert.equal(ofType(resolved.events, 'combat')[0].exchanged, false);
  assert.deepEqual([forUnit(resolved.events, 'move', b.uid).from, forUnit(resolved.events, 'move', b.uid).to], [3, 4]);
  assert.equal(ofType(resolved.events, 'damage').length, 0);
  assert.equal(ofType(resolved.events, 'death').length, 0);
  assert.deepEqual(ofType(resolved.events, 'ability'), [{ type: 'ability', player: 1, cardId: retreat.cardId, kind: 'retreat', targetUid: b.uid }]);
});

test('a lethal Ambush reports the attacker death and no exchanged combat', () => {
  const before = fixture();
  const a = field(before, 'nightwalker_marksman');
  const b = field(before, 'bruiser_heavy', 1);
  const ambush = hand(before, 'bruiser_ambush', 1);
  const pending = attack(before, a, b);
  const response = step(pending, { type: 'respond', handUid: ambush.uid });
  const resolved = step(response.state, { type: 'counter', pass: true });
  assert.equal(ofType(resolved.events, 'combat')[0].exchanged, false);
  assert.equal(ofType(resolved.events, 'death').length, 1);
  assert.equal(forUnit(resolved.events, 'death', a.uid).presence, D.CARDS[a.cardId].presence);
  assert.equal(forUnit(resolved.events, 'damage', b.uid), undefined);
  assert.deepEqual(ofType(resolved.events, 'ability'), [{ type: 'ability', player: 1, cardId: ambush.cardId, kind: 'ambush', targetUid: a.uid }]);
});

test('Reclaim frees commitment and returns the same card without a death effect', () => {
  const before = fixture();
  const a = field(before, 'rogue_raider', 0, 2, { damage: 3 });
  const reclaim = hand(before, 'rogue_reclaim');
  const resolved = step(before, { type: 'order', handUid: reclaim.uid, targetUid: a.uid });
  assert.equal(forUnit(resolved.events, 'reclaim', a.uid).presence, D.CARDS[a.cardId].presence);
  assert.equal(ofType(resolved.events, 'death').length, 0);
  assert.equal(resource(resolved.events, 0, 'committed').to, 0);
  assert.ok(resolved.state.players[0].hand.some(h => h.uid === a.uid));
});

test('capture and owned-ground recapture emit a zone cue, adjacent frontline and breakthrough moves', () => {
  for (const contested of [3, 2]) {
    const before = fixture({ captureThreshold: 1 });
    before.contested = contested;
    const a = field(before, 'stonewall_rifles', 0, contested);
    const resolved = step(before, { type: 'endTurn' });
    assert.deepEqual(ofType(resolved.events, 'capture'), [{ type: 'capture', territory: contested, owner: 0 }]);
    assert.deepEqual(ofType(resolved.events, 'frontline'), [{ type: 'frontline', from: contested, to: contested + 1 }]);
    assert.equal(forUnit(resolved.events, 'move', a.uid).to, contested + 1);
    assert.equal(ofType(resolved.events, 'victory').length, 0);
  }
});

test('turn start reports healing, card acquisition and capacity growth from the authoritative state', () => {
  const before = fixture({ startingCommand: 60, commandGrowth: 10, commandCap: 80 });
  before.players[1].turns = 1;
  before.players[1].deck = ['rogue_outrider'];
  const wounded = field(before, 'rogue_outrider', 1, 4, { damage: 2 });
  field(before, 'rogue_salvage', 1, 4);
  const { events, state } = step(before, { type: 'endTurn' });
  assert.equal(forUnit(events, 'heal', wounded.uid).amount, 1);
  assert.deepEqual(ofType(events, 'draw'), [{ type: 'draw', player: 1, uid: state.players[1].hand[0].uid }]);
  assert.deepEqual(resource(events, 1, 'command'), { type: 'resource', player: 1, key: 'command', from: 60, to: 70 });
  assert.deepEqual(ofType(events, 'phase'), [{ type: 'phase', actor: 1, stage: 'attack', turn: 2 }]);
});

test('conquest emits final ownership and victory without another frontline advance', () => {
  const before = fixture({ captureThreshold: 1 });
  before.contested = 6;
  field(before, 'stonewall_rifles', 0, 6);
  const { events, state } = step(before, { type: 'endTurn' });
  assert.deepEqual(ofType(events, 'capture'), [{ type: 'capture', territory: 6, owner: 0 }]);
  assert.deepEqual(ofType(events, 'victory'), [{ type: 'victory', player: 0 }]);
  assert.equal(ofType(events, 'frontline').length, 0);
  assert.deepEqual(FX.deriveEvents(state, state), []);
  assert.equal(state.winner, 0);
});
