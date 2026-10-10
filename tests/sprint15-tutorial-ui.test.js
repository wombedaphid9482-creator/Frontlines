'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const T=require('../tutorial'),Training=require('../tactical-training'),FX=require('../effects'),Manual=require('../field-manual');
const R=require('../balance').createRuntime('sprint15'),E=R.engine,D=R.data;
function harness(index=0){
  let state=null;const saved=new Map([[T.STORAGE_KEY,JSON.stringify({version:2,index,started:true,complete:false,completedLessons:Array.from({length:index},(_,i)=>i)})]]);
  const controller=T.create({engine:E,data:D,storage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},getState:()=>state,loadScenario:s=>state=s});
  function dispatch(action,automatic=false){const allowed=controller.beforeAction(action,{tutorialAutomatic:automatic});if(!allowed.ok)return allowed;const before=state,result=E.dispatch(state,action,{events:true});assert.equal(result.ok,true,result.error);state=result.state;controller.afterAction(before,state,action,result.events);T.assertInventory(state,D);return result;}
  controller.start({resume:true});return {controller,dispatch,get state(){return state;}};
}
function endPair(h){const turn=h.state.turn,result=h.dispatch({type:'endTurn'});assert.equal(h.state.turn,turn);assert.equal(h.state.window,1);assert.equal(result.events.some(e=>e.type==='capture'),false);return h.dispatch({type:'endTurn'},true);}
test('paired tutorial teaches FIRST and SECOND before any progress or capture',()=>{
  const h=harness(5),r=h.controller.snapshot().refs;h.dispatch({type:'move',unitUid:r.mover,territory:3});
  const oldProgress=h.state.territories[3].progress.slice(),first=h.dispatch({type:'endTurn'});
  assert.equal(h.state.turn,1);assert.equal(h.state.window,1);assert.deepEqual(h.state.territories[3].progress,oldProgress);assert.equal(first.events.some(e=>e.type==='capture'),false);assert.equal(h.controller.snapshot().complete,false);assert.match(h.controller.snapshot().feedback,/Still TURN 1.*SECOND.*No capture progress/);
  assert.equal(h.dispatch({type:'endTurn'}).ok,false,'Player cannot impersonate the scripted opponent.');
  h.controller.pause();assert.equal(h.dispatch({type:'endTurn'},true).ok,false);h.controller.resume();
  const second=h.dispatch({type:'endTurn'},true);assert.ok(second.events.some(e=>e.type==='turnEndComplete'));assert.ok(second.events.some(e=>e.type==='capture'));assert.equal(h.state.lastResolvedTurn,1);assert.equal(h.state.turn,2);assert.equal(h.state.contested,4);assert.equal(h.controller.snapshot().complete,true);assert.match(h.controller.snapshot().feedback,/Both Action Windows completed/);
});
test('both retreat fixtures capture at paired Turn End and conserve or release exact commitment',()=>{
  const h=harness(6);let r=h.controller.snapshot().refs,committed=E.presence(h.state,1).committed;
  let result=endPair(h);assert.ok(result.events.some(e=>e.type==='forcedRetreat'));assert.equal(h.state.units.find(u=>u.uid===r.enemy).territory,4);assert.equal(E.presence(h.state,1).committed,committed);assert.equal(h.controller.snapshot().complete,false);
  h.controller.continue();assert.equal(h.controller.snapshot().phase,1);r=h.controller.snapshot().refs;committed=E.presence(h.state,1).committed;
  result=endPair(h);assert.ok(result.events.some(e=>e.type==='forcedElimination'));assert.equal(h.state.units.some(u=>u.uid===r.enemy),false);assert.equal(E.presence(h.state,1).committed,committed-D.CARDS.bruiser_brawler.presence);assert.equal(h.controller.snapshot().complete,true);
});
test('guided alternatives and Commander onboarding retain real engine decisions',()=>{
  for(const choice of ['firstChoice','secondChoice']){const h=harness(9);assert.equal(h.dispatch({type:'endTurn'}).ok,false);h.dispatch({type:'move',unitUid:h.controller.snapshot().refs[choice],territory:3});endPair(h);assert.equal(h.controller.snapshot().complete,true);}
  const h=harness(10),r=h.controller.snapshot().refs;endPair(h);assert.equal(h.state.units.find(u=>u.uid===r.passiveAlly).damage,1);assert.equal(h.controller.snapshot().complete,true);
  h.controller.continue();const active=h.controller.snapshot().refs;h.dispatch({type:'commander',targetUid:active.activeAlly});assert.equal(h.state.players[0].commander.used,true);assert.equal(h.state.units.find(u=>u.uid===active.activeAlly).damage,0);assert.equal(h.controller.snapshot().complete,true);
  h.controller.continue();h.controller.chooseCommander('commander_stonewall_marshal');h.controller.continue();assert.equal(h.state.players[0].commander.id,'commander_stonewall_marshal');assert.equal(h.controller.snapshot().training,true);
});
test('all fourteen live fixtures conserve legal cards and the six paired tactical exercises finish',()=>{
  for(let i=0;i<14;i++){const f=T.createFixture(i,{engine:E,data:D});assert.equal(E.assertInvariants(f.state),true);T.assertInventory(f.state,D);assert.equal(f.state.turnSystemVersion,2);}
  for(let i=0;i<6;i++){const runner=Training.createRunner(i,{engine:E,data:D});while(!runner.snapshot().complete)runner.next(true);const s=runner.snapshot();assert.equal(E.assertInvariants(s.state),true);assert.ok(s.history.every(h=>Number.isInteger(h.turn)&&Number.isInteger(h.windowIndex)&&h.timingAfter));assert.ok(s.history.every(h=>h.events.every(e=>e.type!=='capture')),'Exercise cannot silently capture.');}
});
test('presentation reports actual first/second context and a resolution only after SECOND',()=>{
  let state=E.createGame({seed:15003}),before=state,result=E.dispatch(state,{type:'endTurn'},{events:true});let cues=FX.deriveEvents(before,result.state,{type:'endTurn'},result.events);
  assert.equal(cues.some(e=>e.type==='turnResolution'),false);assert.deepEqual(cues.find(e=>e.type==='phase'),{type:'phase',actor:1,stage:'ACTION_WINDOW',turn:1,window:1,windowIndex:2});
  state=result.state;result=E.dispatch(state,{type:'endTurn'},{events:true});cues=FX.deriveEvents(state,result.state,{type:'endTurn'},result.events);assert.equal(cues.filter(e=>e.type==='turnResolution').length,1);assert.equal(cues.find(e=>e.type==='turnResolution').turn,1);assert.equal(cues.find(e=>e.type==='phase').windowIndex,3);
  const manual=Manual.sections(result.state.config,D);assert.match(manual['Action windows'].join(' '),/Turn number stays the same after FIRST/);assert.match(manual.Territory.join(' '),/equal pressure adds zero/);assert.match(manual.Commanders.join(' '),/one use per match/);
});
