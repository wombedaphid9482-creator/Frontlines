'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const T=require('../tutorial.js'),Runtime=require('../balance.js').createRuntime('sprint9');
const E=Runtime.engine,D=Runtime.data,A=Runtime.ai;
function storage(){const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};}
function harness(saved){
  let state=null;
  const store=saved||storage();
  const controller=T.create({engine:E,data:D,storage:store,getState:()=>state,loadScenario:next=>{state=next;}});
  function dispatch(action,decision){const allowed=controller.beforeAction(action,decision);if(!allowed.ok)return allowed;const before=state,result=E.dispatch(state,action,{events:true});if(result.ok){controller.afterAction(before,result.state,action,result.events);state=result.state;T.assertInventory(state,D);}return result;}
  function settle(){if(state.response){const result=dispatch({type:'respond',pass:true},{tutorialAutomatic:true});assert.equal(result.ok,true,result.error);}}
  function goTo(index){controller.start();while(controller.snapshot().index<index){const i=controller.snapshot().index,r=controller.snapshot().refs;
    if(i===1||i===2)assert.equal(dispatch({type:'deploy',handUid:r.deploy,territory:2}).ok,true);
    if(i===3){dispatch({type:'deploy',handUid:r.deploy,territory:2});dispatch({type:'attack',unitUid:r.attacker,targetUid:r.enemy});settle();}
    if(i===4){dispatch({type:'attack',unitUid:r.attacker,targetUid:r.enemy});settle();}
    if(i===5){dispatch({type:'move',unitUid:r.mover,territory:3});dispatch({type:'endTurn'});}
    if(i===6){dispatch({type:'endTurn'});controller.continue();dispatch({type:'endTurn'});}
    if(i===7)dispatch({type:'order',handUid:r.order,targetUid:r.enemy});
    if(i===8)controller.inspectFaction('nightwalker');
    if(i===9){dispatch({type:'move',unitUid:r.firstChoice,territory:3});dispatch({type:'endTurn'});}
    if(i===10){dispatch({type:'endTurn'});dispatch({type:'endTurn'},{tutorialAutomatic:true});}
    if(i===11)dispatch({type:'commander',targetUid:r.activeAlly});
    if(i===12)controller.chooseCommander('commander_stonewall_warden');
    assert.equal(controller.snapshot().complete,true,'Lesson '+(i+1)+' must finish through its objective.');controller.continue();
  }}
  return {controller,dispatch,settle,goTo,store,get state(){return state;}};
}
test('fourteen declared lesson fixtures conserve legal starter inventories and printed stats',()=>{
  const original=JSON.stringify(D.CARDS);
  for(let i=0;i<T.LESSONS.length;i++){const f=T.createFixture(i,{engine:E,data:D});assert.equal(E.assertInvariants(f.state),true);assert.equal(T.assertInventory(f.state,D),true);assert.equal(f.metadata.nonCompetitive,true);assert.equal(f.metadata.scenario,true);assert.equal(f.state.players[0].deck.concat(f.state.players[0].hand.map(h=>h.cardId),f.state.units.filter(u=>u.owner===0).map(u=>u.cardId)).length,26);}
  assert.equal(T.assertInventory(T.createFixture(6,{engine:E,data:D,phase:1}).state,D),true);
  assert.equal(JSON.stringify(D.CARDS),original);
  assert.throws(()=>T.createFixture(14,{engine:E,data:D}),/valid tutorial lesson/);
});
test('ordinary guided deployment commits Capacity without using a Command Action, and unrelated actions are rejected safely',()=>{
  const h=harness();h.goTo(1);const r=h.controller.snapshot().refs,before=JSON.stringify(h.state),commands=h.state.actionsLeft,available=E.presence(h.state,0).available;
  assert.equal(h.dispatch({type:'endTurn'}).ok,false);assert.equal(JSON.stringify(h.state),before);
  assert.equal(h.dispatch({type:'deploy',handUid:r.deploy,territory:1}).ok,false);assert.equal(JSON.stringify(h.state),before);
  assert.equal(h.dispatch({type:'deploy',handUid:r.deploy,territory:2}).ok,true);
  assert.equal(h.state.actionsLeft,commands);assert.equal(E.presence(h.state,0).available,available-D.CARDS.stonewall_rifles.presence);assert.equal(h.controller.snapshot().complete,true);
});
test('command and combat lessons require real attacks and a defender response before completing',()=>{
  const h=harness();h.goTo(3);let r=h.controller.snapshot().refs;
  assert.equal(h.dispatch({type:'attack',unitUid:r.attacker,targetUid:r.enemy}).ok,false);
  h.dispatch({type:'deploy',handUid:r.deploy,territory:2});const commands=h.state.actionsLeft;
  h.dispatch({type:'attack',unitUid:r.attacker,targetUid:r.enemy});assert.equal(h.state.actionsLeft,commands-1);assert.equal(h.controller.snapshot().complete,false);assert.ok(h.state.response);
  assert.equal(h.dispatch({type:'respond',pass:true}).ok,false,'Only the declared controlled opponent resolves this window.');h.settle();assert.equal(h.controller.snapshot().complete,true);assert.equal(h.state.units.some(u=>u.uid===r.enemy),false);assert.ok(h.state.units.find(u=>u.uid===r.attacker).damage>0);
  h.controller.continue();r=h.controller.snapshot().refs;assert.ok(h.state.units.find(u=>u.uid===r.enemy).damage>0,'The described wounded defender must actually have wounds under the current profile.');h.dispatch({type:'attack',unitUid:r.attacker,targetUid:r.enemy});h.settle();assert.equal(h.controller.snapshot().complete,true);assert.equal(h.state.units.some(u=>u.uid===r.enemy),false);assert.ok(h.state.units.find(u=>u.uid===r.attacker));
});
test('territory and two-stage retreat lessons resolve capture, forced retreat, full-destination elimination and freed commitment',()=>{
  const h=harness();h.goTo(5);let r=h.controller.snapshot().refs;h.dispatch({type:'move',unitUid:r.mover,territory:3});let result=h.dispatch({type:'endTurn'});assert.ok(result.events.some(e=>e.type==='capture'));assert.equal(h.state.territories[3].owner,0);assert.equal(h.state.contested,4);assert.equal(h.controller.snapshot().complete,true);
  h.controller.continue();r=h.controller.snapshot().refs;const committed=E.presence(h.state,1).committed;result=h.dispatch({type:'endTurn'});assert.ok(result.events.some(e=>e.type==='forcedRetreat'));assert.equal(h.state.units.find(u=>u.uid===r.enemy).territory,4);assert.equal(E.presence(h.state,1).committed,committed);assert.equal(h.controller.snapshot().complete,false);
  h.controller.continue();assert.equal(h.controller.snapshot().phase,1);r=h.controller.snapshot().refs;const before=E.presence(h.state,1).committed;result=h.dispatch({type:'endTurn'});assert.ok(result.events.some(e=>e.type==='forcedElimination'));assert.equal(h.state.units.some(u=>u.uid===r.enemy),false);assert.equal(E.presence(h.state,1).committed,before-D.CARDS.bruiser_brawler.presence);assert.equal(h.controller.snapshot().complete,true);
});
test('Order uses real targeting and action cost; faction inspection never changes the battlefield',()=>{
  const h=harness();h.goTo(7);const r=h.controller.snapshot().refs,cost=E.actionCost(h.state,{type:'order',handUid:r.order,targetUid:r.enemy}),available=E.presence(h.state,0).available,commands=h.state.actionsLeft;
  assert.deepEqual(cost,{presence:D.CARDS.stonewall_fire_support.presence,commandActions:1});const result=h.dispatch({type:'order',handUid:r.order,targetUid:r.enemy});assert.equal(result.ok,true);assert.equal(h.state.actionsLeft,commands-1);assert.equal(E.presence(h.state,0).available,available-cost.presence);assert.ok(result.events.some(e=>e.type==='death'));
  h.controller.continue();const before=JSON.stringify(h.state);for(const faction of Object.keys(D.FACTIONS))h.controller.inspectFaction(faction);assert.equal(JSON.stringify(h.state),before);assert.equal(h.controller.snapshot().complete,true);
});
test('guided objective supports alternative real actions and recovers an unproductive sequence through Restart lesson',()=>{
  for(const choice of ['firstChoice','secondChoice','newDeployment']){const h=harness();h.goTo(9);const r=h.controller.snapshot().refs;assert.equal(h.dispatch({type:'endTurn'}).ok,false);
    let uid=r[choice];if(choice==='newDeployment'){h.dispatch({type:'deploy',handUid:r.deploy,territory:2});uid=r.deploy;}
    assert.equal(h.dispatch({type:'move',unitUid:uid,territory:3}).ok,true);assert.equal(h.dispatch({type:'endTurn'}).ok,true);assert.equal(h.controller.snapshot().complete,true);
  }
  const h=harness();h.goTo(9);const initial=JSON.stringify(h.state),r=h.controller.snapshot().refs;h.dispatch({type:'move',unitUid:r.firstChoice,territory:1});h.controller.restartLesson();assert.equal(JSON.stringify(h.state),initial);
});
test('training is an actual short legal Learning match with opponent turns and an engine victory',()=>{
  const h=harness();h.goTo(T.TRAINING_INDEX);assert.equal(h.controller.isGuided(),false);let decisions=0,opponent=0;
  while(h.state.winner===null&&decisions<100){const actor=E.getActor(h.state),action=A.chooseAction(h.state,{profile:'deck',difficulty:actor===0?'normal':'learning'});assert.equal(h.dispatch(action).ok,true);if(actor===1)opponent++;decisions++;}
  assert.equal(h.state.winner,0);assert.ok(opponent>0);assert.ok(h.state.stats.attacks[0]>0);assert.ok(h.state.stats.kills[0]>0);assert.equal(h.controller.snapshot().complete,true);assert.equal(T.progress(h.store).complete,true);assert.equal(h.state.config.victoryTerritories,4);
});
test('local Continue, pause, Skip, Replay and broken-storage recovery preserve player choice',()=>{
  const store=storage(),first=harness(store);first.goTo(4);first.controller.pause();assert.equal(first.dispatch({type:'endTurn'}).ok,false);first.controller.resume();assert.equal(first.controller.snapshot().paused,false);first.controller.exit('skip');assert.equal(T.progress(store).index,4);
  const second=harness(store);second.controller.start({resume:true});assert.equal(second.controller.snapshot().index,4);second.controller.restart();assert.equal(second.controller.snapshot().index,0);assert.equal(T.progress(store).complete,false);
  assert.doesNotThrow(()=>T.create({data:D,engine:E,storage:{getItem:()=>{throw Error('Storage denied');},setItem:()=>{throw Error('Quota');}},getState:()=>null,loadScenario:()=>{}}).start());
  store.setItem(T.STORAGE_KEY,'{bad');assert.equal(T.progress(store).index,0);
});
test('a lost training operation offers an immediate legal retry instead of blocking tutorial progress',()=>{
  const h=harness();h.goTo(T.TRAINING_INDEX);let n=0;
  while(h.state.winner===null&&n++<100){const actor=E.getActor(h.state),action=actor===0?(h.state.response?{type:'respond',pass:true}:{type:'endTurn'}):A.chooseAction(h.state,{profile:'deck',difficulty:'learning'});assert.equal(h.dispatch(action).ok,true);}
  assert.equal(h.state.winner,1);assert.equal(h.controller.snapshot().complete,false);h.controller.continue();assert.equal(h.state.winner,null);assert.equal(h.controller.snapshot().index,T.TRAINING_INDEX);assert.equal(T.assertInventory(h.state,D),true);assert.equal(h.state.turn,1);
});
