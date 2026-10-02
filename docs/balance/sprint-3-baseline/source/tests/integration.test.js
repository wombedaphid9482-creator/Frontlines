'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../data.js');
const E = require('../engine.js');
const AI = require('../ai.js');
const { simulate, inventory } = require('./playtest.js');

test('every faction supplies a complete playable 20–30 card deck', () => {
  assert.equal(Object.keys(D.FACTIONS).length, 5);
  for (const id of Object.keys(D.FACTIONS)) {
    const deck = D.DECKS[id];
    assert.ok(deck.length >= 20 && deck.length <= 30, id);
    assert.ok(deck.every(card => D.CARDS[card]), `Unknown card in ${id}`);
    assert.ok(deck.filter(card => ['unit','leader'].includes(D.CARDS[card].type)).length >= 12);
    assert.ok(deck.some(card => D.CARDS[card].type === 'order'));
    assert.ok(deck.every(card => D.CARDS[card].faction === id));
  }
});

test('same seed and decisions reproduce the same game', () => {
  let a = E.createGame({seed:8841});
  let b = E.createGame({seed:8841});
  for (let i=0;i<60 && a.winner === null;i++) {
    assert.deepEqual(a,b);
    const action = AI.chooseAction(a);
    a = E.dispatch(a,action).state;
    b = E.dispatch(b,action).state;
  }
  assert.deepEqual(a,b);
});

test('AI decisions do not depend on concealed opponent cards or deck order', () => {
  let state = E.createGame({factions:['syndicate','rogue'],seed:6321});
  for (let i=0;i<120 && state.winner === null;i++) {
    const actor = E.getActor(state);
    const hidden = structuredClone(state);
    hidden.players[1-actor].hand.forEach((item,index) => {
      item.cardId = D.DECKS[hidden.players[1-actor].faction][index % 26];
    });
    hidden.players.forEach(p => p.deck.reverse());
    assert.deepEqual(AI.chooseAction(state),AI.chooseAction(hidden), `Concealed information affected turn ${state.turn}`);
    state = E.dispatch(state,AI.chooseAction(state)).state;
  }
});

test('enumerated legal actions survive independent application without mutating origin', () => {
  let state = E.createGame({factions:['rogue','nightwalker'],seed:291});
  const initial = [inventory(state,0),inventory(state,1)];
  for (let decision=0;decision<150 && state.winner === null;decision++) {
    const snapshot = JSON.stringify(state);
    const actions = E.legalActions(state);
    assert.ok(actions.length);
    for (const action of actions) {
      const branch = E.dispatch(state,action);
      assert.ok(branch.ok, `${JSON.stringify(action)}: ${branch.error}`);
      E.assertInvariants(branch.state);
      assert.deepEqual(inventory(branch.state,0),initial[0]);
      assert.deepEqual(inventory(branch.state,1),initial[1]);
    }
    assert.equal(JSON.stringify(state),snapshot);
    state = E.dispatch(state,AI.chooseAction(state)).state;
  }
});

test('all five factions can complete seeded conquest matches', () => {
  const factions = Object.keys(D.FACTIONS);
  for (let i=0;i<factions.length;i++) {
    const {result,state} = simulate([factions[i],factions[(i+1)%factions.length]],631+i*79);
    assert.notEqual(result.winner,null,`Unfinished ${result.factions}`);
    assert.equal(E.legalActions(state).length,0);
    assert.equal(E.dispatch(state,{type:'endTurn'}).ok,false);
  }
});
