'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Data = require('../data'), Engine = require('../engine'), AI = require('../ai'), Balance = require('../balance');
const difficulties = ['easy','normal','hard','expert','learning'];
const clone = value => JSON.parse(JSON.stringify(value));
let nextUid = 80000;
function fixture(factions = ['nightwalker','bruiser']) {
  const state = Engine.createGame({seed:62071,factions,config:{startingCommand:80,commandCap:80}});
  state.players.forEach(p => { p.hand = []; });
  return state;
}
function unit(state,cardId,owner = 0,territory = 3,extra = {}) {
  const value = {uid:'ai-fixture-'+nextUid++,cardId,owner,territory,damage:0,ready:true,deployedTurn:0,movedTurn:-1,...extra};
  state.units.push(value); return value;
}
function hand(state,cardId,owner = 0) {
  const value = {uid:'ai-fixture-'+nextUid++,cardId}; state.players[owner].hand.push(value); return value;
}
function concealed(state) {
  const hidden = clone(state), actor = Engine.getActor(hidden);
  for (const p of hidden.players) Object.defineProperty(p,'deck',{get() { throw Error('AI inspected concealed deck order'); }});
  Object.defineProperty(hidden.players[1-actor],'hand',{get() { throw Error('AI inspected opponent hand'); }});
  Object.defineProperty(hidden.players[1-actor],'deckMeta',{get() { throw Error('AI inspected opponent deck identity'); }});
  Object.defineProperty(hidden,'rngState',{get() { throw Error('AI inspected concealed random stream'); }});
  return hidden;
}

test('selectable difficulties are explicit, copied, and reject unknown settings', () => {
  const list = AI.getDifficulties();
  assert.deepEqual(list.map(d => d.id),difficulties);
  assert.equal(list.find(d => d.id === 'learning').tutorial,true);
  assert.match(list.find(d => d.id === 'expert').description,/experienced/);
  list[0].name = 'Changed by caller';
  assert.notEqual(AI.getDifficulties()[0].name,list[0].name);
  assert.throws(() => AI.chooseAction(fixture(),{profile:'deck',difficulty:'cheating'}),/Unknown AI difficulty/);
});

test('every difficulty is deterministic, rules-legal and independent of concealed information', () => {
  // Small public-board fixtures verify the decision contract, not win rates.
  for (const faction of Object.keys(Data.FACTIONS)) {
    let state = Engine.createGame({seed:6006,factions:[faction,'bruiser']});
    for (let turn = 0; turn < 12 && state.winner === null; turn++) {
      const snapshot = JSON.stringify(state), legal = Engine.legalActions(state);
      for (const difficulty of difficulties) {
        const options = {profile:'deck',difficulty};
        const decision = AI.explainAction(state,options);
        assert.equal(Engine.validate(state,decision.action),null,difficulty);
        assert.deepEqual(AI.chooseAction(state,options),decision.action);
        assert.deepEqual(AI.explainAction(state,{...options,legalActions:legal}),decision);
        assert.deepEqual(AI.explainAction(concealed(state),options),decision,'Concealed information influenced '+difficulty);
        assert.equal(JSON.stringify(state),snapshot,'Decision changed authoritative state');
        assert.ok(decision.explanation.length > 15);
        assert.doesNotMatch(decision.explanation,/score|heuristic|formula|priorityMargin|\*\.\d/);
        assert.ok(Number.isInteger(decision.cost.presence));
        assert.ok(Number.isInteger(decision.cost.commandActions));
        assert.ok(decision.planning.projected <= (difficulty === 'expert' ? 35 : difficulty === 'hard' ? 5 : 0));
      }
      const result = Engine.dispatch(state,AI.chooseAction(state,{profile:'deck',difficulty:'normal'}));
      assert.ok(result.ok,result.error); state = result.state;
    }
  }
});

test('response and counter difficulties preserve legality without reading hidden hands', () => {
  const state = fixture();
  const attacker = unit(state,'bruiser_assault',1,3,{damage:1});
  const defender = unit(state,'nightwalker_blade');
  hand(state,'nightwalker_ambush');
  state.attacker = 1;
  attacker.ready = false;
  state.response = {stage:'response',attackerUid:attacker.uid,defenderUid:defender.uid,originalDefenderUid:defender.uid,responder:0};
  for (const difficulty of difficulties) {
    const options = {profile:'deck',difficulty}, decision = AI.explainAction(state,options);
    assert.equal(Engine.validate(state,decision.action),null);
    assert.deepEqual(AI.explainAction(concealed(state),options),decision);
    assert.equal(decision.cost.commandActions,0);
    assert.equal(decision.planning.projected,0);
  }
  const counterState = fixture(['syndicate','stonewall']);
  const a = unit(counterState,'syndicate_enforcer'), d = unit(counterState,'stonewall_rifles',1);
  hand(counterState,'syndicate_counter');
  a.ready = false;
  counterState.response = {stage:'counter',attackerUid:a.uid,defenderUid:d.uid,originalDefenderUid:d.uid,responder:1,order:{cardId:'stonewall_brace',handUid:'public-pending-order'}};
  for (const difficulty of difficulties) {
    const options = {profile:'deck',difficulty};
    const decision = AI.explainAction(counterState,options);
    assert.equal(Engine.validate(counterState,decision.action),null);
    assert.deepEqual(AI.explainAction(concealed(counterState),options),decision);
  }
});

test('Hard and Expert search bounded public tactical sequences while Easy and Learning remain local', () => {
  const state = fixture(); unit(state,'nightwalker_blade');
  const target = unit(state,'bruiser_heavy',1), strike = hand(state,'nightwalker_strike');
  const options = difficulty => ({profile:'deck',difficulty});
  const normal = AI.explainAction(state,options('normal'));
  for (const difficulty of ['hard','expert']) {
    const decision = AI.explainAction(state,options(difficulty));
    assert.deepEqual(decision.action,{type:'order',handUid:strike.uid,targetUid:target.uid});
    assert.ok(decision.score > normal.score,'Planning should recognize the improved follow-up');
    assert.equal(decision.planning.depth,difficulty === 'expert' ? 3 : 2);
    assert.ok(decision.planning.projected > 0);
    assert.match(decision.reason,/follow-up/);
    let next = Engine.dispatch(state,decision.action).state;
    assert.equal(AI.chooseAction(next,options(difficulty)).type,'attack');
  }
  for (const difficulty of ['easy','learning']) {
    const decision = AI.explainAction(state,options(difficulty));
    assert.equal(decision.planning.depth,0);
    assert.equal(decision.planning.projected,0);
    assert.doesNotMatch(decision.reason,/combo|same-turn|follow-up/);
  }
});

test('Hard and Expert preserve declared deck priorities; Normal uses basic faction tactics', () => {
  const state = fixture(['bruiser','stonewall']), card = hand(state,'bruiser_shock_runner');
  state.players[0].deckMeta.archetype = 'shock-assault';
  const legalActions = [{type:'deploy',handUid:card.uid,territory:2},{type:'endTurn'}];
  const normal = AI.explainAction(state,{profile:'deck',difficulty:'normal',legalActions});
  for (const difficulty of ['hard','expert']) {
    const decision = AI.explainAction(state,{profile:'deck',difficulty,legalActions});
    assert.ok(decision.score >= normal.score+2);
    assert.match(decision.reason,/Shock Assault/);
  }
});

test('controlled tutorial choices remain constrained and malformed supplied actions cannot create cheats', () => {
  const state = fixture(['stonewall','bruiser']), card = hand(state,'stonewall_rifles');
  const prescribed = {type:'deploy',handUid:card.uid,territory:2};
  assert.deepEqual(AI.chooseAction(state,{profile:'deck',difficulty:'learning',legalActions:[prescribed]}),prescribed);
  for (const difficulty of difficulties) {
    const options = {profile:'deck',difficulty,legalActions:[{type:'deploy',handUid:'imaginary-card',territory:3},{type:'endTurn'}]};
    assert.deepEqual(AI.chooseAction(state,options),{type:'endTurn'});
    const decision = AI.explainAction(state,{...options,legalActions:[]});
    assert.equal(decision.action,null);
    assert.deepEqual(decision.cost,{presence:0,commandActions:0});
  }
});

test('AI follows the shared free-deployment economy at zero commands and cannot invent Capacity', () => {
  const runtime = Balance.createRuntime('sprint6');
  const state = runtime.engine.createGame({seed:61006,factions:['stonewall','bruiser'],config:{startingCommand:80,commandCap:80}});
  state.players.forEach(p => { p.hand = []; });
  state.players[0].hand.push({uid:'free-rifles',cardId:'stonewall_rifles'});
  state.actionsLeft = 0;
  for (const difficulty of difficulties) {
    const decision = runtime.ai.explainAction(state,{profile:'deck',difficulty});
    assert.equal(decision.action.type,'deploy');
    assert.deepEqual(decision.cost,{presence:runtime.data.CARDS.stonewall_rifles.presence,commandActions:0});
    const result = runtime.engine.dispatch(state,decision.action);
    assert.equal(result.ok,true); assert.equal(result.state.actionsLeft,0);
    assert.equal(result.state.players[0].command,state.players[0].command);
    assert.equal(runtime.engine.presence(result.state,0).available,80-decision.cost.presence);
  }
  state.players[0].spent = 80;
  for (const difficulty of difficulties) assert.deepEqual(runtime.ai.chooseAction(state,{profile:'deck',difficulty}),{type:'endTurn'});
});

test('new-rule tactical smoke preserves printed costs, card identities and identical player resources', () => {
  const runtime = Balance.createRuntime('sprint6');
  let state = runtime.engine.createGame({seed:67006,factions:['rogue','nightwalker'],config:{startingCommand:40,commandCap:80}});
  assert.equal(state.players[0].command,state.players[1].command);
  for (let step = 0; step < 24 && state.winner === null; step++) {
    const actor = runtime.engine.getActor(state), before = JSON.stringify(state);
    for (const difficulty of difficulties) {
      const decision = runtime.ai.explainAction(state,{profile:'deck',difficulty});
      assert.equal(runtime.engine.validate(state,decision.action),null);
      assert.deepEqual(decision.cost,runtime.engine.actionCost(state,decision.action));
      assert.equal(JSON.stringify(state),before);
    }
    const decision = runtime.ai.explainAction(state,{profile:'deck',difficulty:'expert'});
    const result = runtime.engine.dispatch(state,decision.action);
    assert.equal(result.ok,true,result.error);
    runtime.engine.assertInvariants(result.state);
    if (['deploy','move','attack','order'].includes(decision.action.type)) {
      assert.equal(result.state.actionsLeft,state.actionsLeft-decision.cost.commandActions);
      assert.equal(result.state.players[actor].command,state.players[actor].command);
    }
    state = result.state;
  }
});
