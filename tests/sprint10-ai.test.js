'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const B=require('../balance'),AI=require('../ai');
const R=B.createRuntime('sprint10'),D=R.data,E=R.engine,A=R.ai;
const previous=B.createRuntime('sprint9'),clone=value=>JSON.parse(JSON.stringify(value));
let nextUid=110000;
function fixture(faction,archetype='custom'){
  const state=E.createGame({seed:10103,factions:[faction,'bruiser'],config:{startingCommand:80,commandCap:80,drawCount:0}});
  state.players.forEach(p=>{p.hand=[];});state.players[0].deckMeta.archetype=archetype;return state;
}
function unit(state,cardId,owner=0,territory=3,extra={}){const value={uid:'s10-ai-'+nextUid++,cardId,owner,territory,damage:0,ready:true,deployedTurn:0,movedTurn:-1,...extra};state.units.push(value);return value;}
function hand(state,cardId,extra={}){const item={uid:'s10-ai-'+nextUid++,cardId,...extra};state.players[0].hand.push(item);return item;}
function conceal(state){
  const hidden=clone(state),actor=E.getActor(hidden);
  for(const p of hidden.players)Object.defineProperty(p,'deck',{get(){throw Error('AI read concealed deck order');}});
  Object.defineProperty(hidden.players[1-actor],'hand',{get(){throw Error('AI read concealed enemy hand');}});
  Object.defineProperty(hidden.players[1-actor],'deckMeta',{get(){throw Error('AI read concealed enemy deck identity');}});
  Object.defineProperty(hidden,'rngState',{get(){throw Error('AI read concealed random stream');}});return hidden;
}
function profiles(){return [{profile:'deck'},{profile:'deck',difficulty:'normal'},{profile:'deck',difficulty:'hard'},{profile:'deck',difficulty:'expert'}];}

test('recovery policy version is explicit while all historical AI versions remain unchanged',()=>{
  assert.equal(A.VERSION,'frontlines-ai-sprint10-v1');assert.equal(previous.ai.VERSION,'frontlines-ai-sprint9-v1');
  const Frozen=require('../docs/balance/sprint10-v1.0.2-baseline/source/ai').forRules(previous.data,previous.engine);
  for(const faction of Object.keys(D.FACTIONS)){
    let state=previous.engine.createGame({seed:10101,factions:[faction,'bruiser']});
    for(let step=0;step<8;step++){
      for(const options of profiles())assert.deepEqual(previous.ai.explainAction(state,options),Frozen.explainAction(state,options));
      state=previous.engine.dispatch(state,previous.ai.chooseAction(state,{profile:'deck'})).state;
    }
  }
});

test('current basic-policy labels disclose recovery changes while historical provenance stays unchanged',()=>{
  const profile=A.getProfiles().find(p=>p.id==='baseline'),old=previous.ai.getProfiles().find(p=>p.id==='baseline');
  assert.equal(profile.name,'Basic recovery policy');assert.match(profile.description,/capture pressure, retained wounds and Commander sequencing/);
  assert.doesNotMatch(profile.description,/unchanged|Frozen/);assert.equal(old.name,'Frozen basic heuristic');assert.equal(old.description,'Original Sprint 2 scores and tie-breaking unchanged.');
  assert.equal(A.BASELINE_VERSION,'frontlines-heuristic-sprint2-v1');assert.equal(A.BASELINE_VERSION,previous.ai.BASELINE_VERSION);
  const state=fixture('stonewall');assert.match(A.explainAction(state,{profile:'baseline'}).reason,/balance-recovery rules/);
  assert.match(previous.ai.explainAction(state,{profile:'baseline'}).reason,/Frozen Sprint 2/);
});

test('Breaker and Marshal conserve once-per-match readiness commands when no attack or advance remains',()=>{
  for(const [faction,commanderId,cardId,enemyId,ready] of [
    ['bruiser','commander_bruiser_breaker','bruiser_shock_runner','bruiser_heavy',true],
    ['stonewall','commander_stonewall_marshal','stonewall_rifles','bruiser_brawler',false]
  ]){
    const state=fixture(faction);state.players[0].commander.id=commanderId;
    unit(state,cardId,0,3,{ready});unit(state,enemyId,1);state.actionsLeft=1;
    for(const options of profiles()){
      const decision=A.explainAction(state,options);assert.equal(decision.action.type,'endTurn');
      const wasted=previous.ai.explainAction(state,options);assert.equal(wasted.action.type,'commander');
      assert.deepEqual(A.explainAction(conceal(state),options),decision);
    }
    state.actionsLeft=2;assert.equal(A.chooseAction(state,{profile:'deck'}).type,'commander');
    const commanded=E.dispatch(state,A.chooseAction(state,{profile:'deck'}));assert.equal(commanded.ok,true);
    assert.equal(A.chooseAction(commanded.state,{profile:'deck'}).type,'attack');
  }
});

test('Coordinator uses exact Mark-plus-damage follow-up but still finishes lethal targets on the final command',()=>{
  const state=fixture('syndicate','coordinated-removal'),ally=unit(state,'syndicate_security'),target=unit(state,'bruiser_heavy',1);
  state.actionsLeft=1;
  for(const options of profiles())assert.equal(A.chooseAction(state,options).type,'endTurn');
  state.actionsLeft=2;
  for(const options of profiles())assert.deepEqual(A.chooseAction(state,options),{type:'commander',targetUid:target.uid});
  const next=E.dispatch(state,{type:'commander',targetUid:target.uid}).state;
  assert.deepEqual(A.chooseAction(next,{profile:'deck'}),{type:'attack',unitUid:ally.uid,targetUid:target.uid});
  state.actionsLeft=1;target.damage=D.CARDS[target.cardId].health-2;
  assert.equal(A.chooseAction(state,{profile:'deck'}).type,'commander');
});

test('Breaker capture forecasts include the bonus and preserve the only pressure-bearing Rush body',()=>{
  const state=fixture('bruiser','rolling-breakthrough');const ally=unit(state,'bruiser_shock_runner');unit(state,'bruiser_heavy',1);
  state.territories[3].progress[0]=state.config.captureThreshold-E.capturePressure(state,0).total;state.actionsLeft=1;
  for(const options of profiles()){
    const decision=A.explainAction(state,options);assert.equal(decision.action.type,'endTurn');
    assert.match(decision.explanation,/secure/);assert.match(decision.reason,/Capture is available/);
  }
  const resolved=E.dispatch(state,{type:'endTurn'});assert.equal(resolved.ok,true);assert.equal(resolved.state.territories[3].owner,0);
  ally.suppressed=true;assert.doesNotMatch(A.explainAction(state,{profile:'deck'}).explanation,/secure/);
});

test('Mark needs a real attack window and free Quartermaster Sabotage can use the last remaining command',()=>{
  const state=fixture('syndicate','coordinated-removal'),ally=unit(state,'syndicate_security'),target=unit(state,'bruiser_heavy',1,3,{damage:1});
  state.players[0].commander.used=true;const mark=hand(state,'syndicate_target_designator');
  for(const options of profiles())assert.equal(A.chooseAction(state,options).handUid,mark.uid);
  const next=E.dispatch(state,{type:'order',handUid:mark.uid,targetUid:target.uid}).state;
  assert.deepEqual(A.chooseAction(next,{profile:'deck'}),{type:'attack',unitUid:ally.uid,targetUid:target.uid});
  state.actionsLeft=1;assert.equal(A.chooseAction(state,{profile:'deck'}).type,'endTurn');
  const logistics=fixture('syndicate');logistics.players[0].commander.id='commander_syndicate_quartermaster';logistics.players[0].commander.used=true;
  const attacker=unit(logistics,'syndicate_security'),enemy=unit(logistics,'bruiser_ram_team',1,3,{damage:4}),sabotage=hand(logistics,'syndicate_signal_lock');
  logistics.actionsLeft=1;
  for(const options of profiles())assert.deepEqual(A.chooseAction(logistics,options),{type:'order',handUid:sabotage.uid,targetUid:enemy.uid});
  const disabled=E.dispatch(logistics,{type:'order',handUid:sabotage.uid,targetUid:enemy.uid}).state;
  assert.equal(disabled.actionsLeft,1);assert.deepEqual(A.chooseAction(disabled,{profile:'deck'}),{type:'attack',unitUid:attacker.uid,targetUid:enemy.uid});
  logistics.players[0].commander.passiveTurn=logistics.turn;assert.equal(A.chooseAction(logistics,{profile:'deck'}).type,'endTurn');
});

test('Fortified Advance avoids a visibly lethal unsupported support move but advances for a capture',()=>{
  const state=fixture('stonewall','fortified-advance'),medic=unit(state,'stonewall_medic',0,2);
  unit(state,'bruiser_heavy',1);unit(state,'bruiser_commander',1);state.players[0].commander.used=true;state.actionsLeft=1;
  for(const options of profiles()){
    assert.equal(A.chooseAction(state,options).type,'endTurn');assert.equal(previous.ai.chooseAction(state,options).type,'move');
  }
  state.territories[3].progress[0]=state.config.captureThreshold-D.CARDS[medic.cardId].presence;
  assert.deepEqual(A.chooseAction(state,{profile:'deck'}),{type:'move',unitUid:medic.uid,territory:3});
  state.territories[3].progress=[0,state.config.captureThreshold-E.capturePressure(state,1).total];
  assert.deepEqual(A.chooseAction(state,{profile:'deck'}),{type:'move',unitUid:medic.uid,territory:3});
  state.territories[3].progress=[0,0];unit(state,'stonewall_countermarch');
  assert.deepEqual(A.chooseAction(state,{profile:'deck'}),{type:'move',unitUid:medic.uid,territory:3});
});

test('retained wounds remove idle reclaim healing loops while threatened withdrawal remains useful',()=>{
  const state=fixture('rogue','scavenger'),ally=unit(state,'rogue_outrider',0,2,{damage:3}),reclaim=hand(state,'rogue_reclaim');
  state.players[0].commander.used=true;
  const choices=E.legalActions(state).filter(a=>a.type==='endTurn'||a.handUid===reclaim.uid);
  for(const options of profiles())assert.equal(A.chooseAction(state,{...options,legalActions:choices}).type,'endTurn');
  state.contested=2;state.territories[3].owner=1;unit(state,'bruiser_heavy',1,2);
  for(const options of profiles()){
    const decision=A.explainAction(state,{...options,legalActions:choices});assert.equal(decision.action.handUid,reclaim.uid);
    assert.match(decision.reason,/wounds remain/);assert.deepEqual(A.explainAction(conceal(state),{...options,legalActions:choices}),decision);
  }
  const recalled=E.dispatch(state,{type:'order',handUid:reclaim.uid,targetUid:ally.uid}).state;
  assert.equal(recalled.players[0].hand.find(h=>h.uid===ally.uid).damage,3);
  const deployed=E.dispatch(recalled,{type:'deploy',handUid:ally.uid,territory:2});assert.equal(deployed.ok,true);assert.equal(deployed.state.units.find(u=>u.uid===ally.uid).damage,3);
});

test('bounded planning follows Commander and recovered-card public costs without reading hidden data',()=>{
  for(const [faction,commanderId,cardId] of [
    ['rogue','commander_rogue_drifter','rogue_outrider'],
    ['nightwalker','commander_nightwalker_ghost','nightwalker_blade'],
    ['syndicate','commander_syndicate_quartermaster','syndicate_security']
  ]){
    const state=fixture(faction);state.players[0].commander.id=commanderId;state.players[0].commander.used=true;
    const ally=unit(state,cardId,0,faction==='syndicate'?3:2);
    hand(state,cardId,{damage:1});if(faction==='syndicate'){hand(state,'syndicate_target_designator');unit(state,'bruiser_heavy',1,3,{damage:1});}
    const observed=[];const watched={...E,legalActions(position){if(position!==state&&position.players[0].commander)observed.push(position);return E.legalActions(position);}};
    const policy=AI.forRules(D,watched),options={profile:'deck',difficulty:'expert'},before=JSON.stringify(state),decision=policy.explainAction(state,options);
    assert.equal(E.validate(state,decision.action),null);assert.equal(JSON.stringify(state),before);
    assert.deepEqual(A.explainAction(conceal(state),options),A.explainAction(state,options));
    assert.ok(observed.length>0);assert.ok(decision.planning.projected<=35);
    const moved=observed.find(p=>p.units.some(u=>u.uid===ally.uid&&u.territory===3));
    if(faction==='rogue'){
      assert.ok(moved);assert.equal(moved.players[0].commander.passiveTurn,state.turn);
      assert.equal(E.actionCost(moved,{type:'move',unitUid:ally.uid,territory:2}).commandActions,1);
      const real=E.dispatch(state,{type:'move',unitUid:ally.uid,territory:3}).state;
      assert.equal(moved.actionsLeft,real.actionsLeft);assert.equal(moved.units.find(u=>u.uid===ally.uid).ready,real.units.find(u=>u.uid===ally.uid).ready);
    }
    const deployed=observed.find(p=>p.units.some(u=>u.deployedTurn===state.turn&&u.cardId===cardId));
    if(deployed){
      const fresh=deployed.units.find(u=>u.deployedTurn===state.turn&&u.cardId===cardId);assert.equal(fresh.damage,1);
      if(faction==='nightwalker'){assert.equal(fresh.reinforced,1);assert.equal(deployed.players[0].commander.passiveTurn,state.turn);}
    }
    if(faction==='syndicate'){
      const marked=observed.find(p=>p.units.some(u=>u.owner===1&&u.marked)&&p.players[0].commander.passiveTurn===state.turn);
      assert.ok(marked);assert.equal(marked.actionsLeft,state.actionsLeft);
    }
  }
});

test('all five recovery factions make deterministic legal public decisions across bounded opening cases',()=>{
  for(const faction of Object.keys(D.FACTIONS)){
    let state=E.createGame({seed:10107,factions:[faction,'nightwalker']});
    for(let step=0;step<16&&state.winner===null;step++){
      const before=JSON.stringify(state);
      for(const difficulty of ['easy','learning','normal','hard','expert']){
        const options={profile:'deck',difficulty},decision=A.explainAction(state,options);
        assert.equal(E.validate(state,decision.action),null);assert.ok(Number.isFinite(decision.score));
        assert.deepEqual(A.explainAction(conceal(state),options),decision);assert.deepEqual(A.chooseAction(state,options),decision.action);
        assert.equal(JSON.stringify(state),before);assert.ok(decision.planning.projected<=(difficulty==='expert'?35:difficulty==='hard'?5:0));
      }
      const result=E.dispatch(state,A.chooseAction(state,{profile:'deck',difficulty:'normal'}));assert.equal(result.ok,true);E.assertInvariants(result.state);state=result.state;
    }
  }
});

test('every recovery card and all ten Commanders evaluate legal finite public decisions at each difficulty',()=>{
  for(const definition of Object.values(D.CARDS)){
    const state=fixture(definition.faction),baseId=Object.values(D.CARDS).find(c=>c.faction===definition.faction&&c.type==='unit').id;
    const defender=unit(state,baseId,0,3,{damage:1,ready:false}),attacker=unit(state,baseId);
    const enemy=unit(state,'bruiser_heavy',1,3,{damage:1});hand(state,definition.id);
    if(definition.type==='order'&&definition.timing==='response'){
      state.attacker=1;enemy.ready=false;state.response={stage:'response',attackerUid:enemy.uid,defenderUid:defender.uid,originalDefenderUid:defender.uid,responder:0};
    }else if(definition.type==='order'&&definition.timing==='counter'){
      attacker.ready=false;state.response={stage:'counter',attackerUid:attacker.uid,defenderUid:enemy.uid,originalDefenderUid:enemy.uid,responder:1,order:{cardId:'bruiser_ambush',handUid:'public-pending'}};
    }
    const before=JSON.stringify(state);
    for(const difficulty of ['easy','learning','normal','hard','expert']){
      const options={profile:'deck',difficulty},decision=A.explainAction(state,options);
      assert.equal(E.validate(state,decision.action),null,definition.id+' '+difficulty);assert.ok(Number.isFinite(decision.score));
      assert.deepEqual(A.explainAction(conceal(state),options),decision);assert.equal(JSON.stringify(state),before);
    }
  }
  for(const commander of E.commanders.list()){
    const state=fixture(commander.faction);state.players[0].commander.id=commander.id;state.players[0].spent=1;
    const ownId=Object.values(D.CARDS).find(c=>c.faction===commander.faction&&c.type==='unit').id;
    unit(state,ownId,0,3,{damage:1,ready:false});unit(state,'bruiser_heavy',1,3,{damage:1});state.players[0].discard.push(ownId);
    for(const difficulty of ['easy','learning','normal','hard','expert']){
      const options={profile:'deck',difficulty},decision=A.explainAction(state,options);
      assert.equal(E.validate(state,decision.action),null);assert.ok(Number.isFinite(decision.score));assert.deepEqual(A.explainAction(conceal(state),options),decision);
    }
  }
});
