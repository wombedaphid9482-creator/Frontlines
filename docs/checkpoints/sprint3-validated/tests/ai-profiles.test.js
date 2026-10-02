'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../engine.js'),D=require('../data.js'),A=require('../ai.js');
const Frozen=require('../docs/balance/sprint-3-baseline/source/ai.js');
const clone=value=>JSON.parse(JSON.stringify(value));
let uid=10000;
function fixture(factions=['nightwalker','bruiser']){
  const s=E.createGame({seed:456,factions,config:{startingCommand:80,commandCap:80}});
  s.players.forEach(p=>p.hand=[]);return s;
}
function unit(s,cardId,owner=0,territory=3,changes={}){const u={uid:'test-'+uid++,cardId,owner,territory,damage:0,ready:true,deployedTurn:0,movedTurn:-1,...changes};s.units.push(u);return u;}
function hand(s,cardId,owner=0){const c={uid:'test-'+uid++,cardId};s.players[owner].hand.push(c);return c;}

test('default and explicit baseline reproduce the frozen heuristic across complete matches',()=>{
  let decisions=0;
  for(const [i,faction] of Object.keys(D.FACTIONS).entries()){
    let s=E.createGame({seed:1009+i,factions:[faction,'bruiser']});
    while(s.winner===null&&s.turn<=240&&decisions<12000){
      const expected=Frozen.chooseAction(s);
      assert.deepEqual(A.chooseAction(s),expected);
      assert.deepEqual(A.chooseAction(s,{profile:'baseline'}),expected);
      assert.deepEqual(A.explainAction(s,{profile:'baseline'}).action,expected);
      const result=E.dispatch(s,expected);assert.equal(result.ok,true,result.error);s=result.state;decisions++;
    }
    assert.notEqual(s.winner,null,'fixture match must finish');
  }
  assert.ok(decisions>100);
});

test('all policies are deterministic, legal, explainable, immutable and independent of hidden identities',()=>{
  let checked=0;
  for(const faction of Object.keys(D.FACTIONS)){
    let s=E.createGame({seed:1009,factions:[faction,'nightwalker']});
    for(let n=0;n<120&&s.winner===null;n++){
      const actor=E.getActor(s),before=JSON.stringify(s),hidden=clone(s),opponent=hidden.players[1-actor];
      opponent.hand=opponent.hand.map((c,i)=>({...c,cardId:i%2?'bruiser_heavy':'stonewall_brace'}));
      opponent.deck=opponent.deck.slice().reverse();hidden.players[actor].deck=hidden.players[actor].deck.slice().reverse();hidden.rngState=1987654321;
      for(const profile of ['baseline','faction','random']){
        const action=A.chooseAction(s,{profile}),explain=A.explainAction(s,{profile}),legal=E.legalActions(s);
        assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(action)));
        assert.deepEqual(explain.action,action);
        assert.deepEqual(A.explainAction(hidden,{profile}),explain,'hidden information influenced '+profile);
        assert.deepEqual(A.chooseAction(s,{profile,legalActions:legal}),action);
        assert.equal(explain.evaluated,legal.length);
        assert.ok(Number.isFinite(explain.score));assert.ok(explain.reason.length>0);
        assert.ok(explain.rankedTop.length<=5);assert.deepEqual(explain.rankedtop,explain.rankedTop);
        assert.ok(explain.rankedTop.every(r=>Number.isFinite(r.score)&&r.reason));
      }
      assert.equal(JSON.stringify(s),before,'AI mutated state');
      s=E.dispatch(s,A.chooseAction(s,{profile:'faction'})).state;checked++;
    }
  }
  assert.ok(checked>=200);
  assert.throws(()=>A.chooseAction(fixture(),{profile:'omniscient'}),/Unknown AI/);
});

test('a legal damage-then-attack combo outranks a fragile nonlethal frontal trade',()=>{
  const s=fixture();unit(s,'nightwalker_blade');const target=unit(s,'bruiser_heavy',1);const strike=hand(s,'nightwalker_strike');
  const x=A.explainAction(s,{profile:'faction'});
  assert.deepEqual(x.action,{type:'order',handUid:strike.uid,targetUid:target.uid});
  assert.match(x.reason,/same-turn lethal/);
  let next=E.dispatch(s,x.action).state;
  assert.equal(A.chooseAction(next,{profile:'faction'}).type,'attack');
});

test('a freshly deployed unit is not treated as a legal damage-combo finisher',()=>{
  const s=fixture();unit(s,'nightwalker_blade',0,3,{deployedTurn:s.turn});unit(s,'bruiser_heavy',1);hand(s,'nightwalker_strike');
  const x=A.explainAction(s,{profile:'faction'});
  assert.ok(x.rankedTop.every(r=>!r.reason.includes('same-turn lethal')));
});

test('Rally requires an actual legal follow-up and cannot pretend a full zone is enterable',()=>{
  const s=fixture(['rogue','bruiser']);const target=unit(s,'rogue_outrider',0,2,{ready:false});
  for(let i=0;i<5;i++)unit(s,'rogue_trailguard');const rally=hand(s,'rogue_rally');
  const x=A.explainAction(s,{profile:'faction'});
  const row=x.rankedTop.find(r=>r.action.handUid===rally.uid&&r.action.targetUid===target.uid);
  // Retreating away from the objective is legal but receives a negative move score.
  assert.notEqual(x.action.handUid,rally.uid);if(row)assert.ok(row.score<=0);
});

test('Reclaim rescues a wounded front unit but retains Presence completing capture',()=>{
  const s=fixture(['rogue','bruiser']);const target=unit(s,'rogue_skirmisher',0,3,{damage:3});unit(s,'bruiser_heavy',1);const recall=hand(s,'rogue_reclaim');
  let x=A.explainAction(s,{profile:'faction'});
  assert.deepEqual(x.action,{type:'order',handUid:recall.uid,targetUid:target.uid});assert.match(x.reason,/wounded threatened/);
  s.territories[3].progress[0]=20;x=A.explainAction(s,{profile:'faction'});
  assert.equal(x.action.type,'endTurn');
});

test('Ambush recognizes visible pre-combat lethal damage without inspecting attacker hand',()=>{
  const s=fixture();const a=unit(s,'bruiser_assault',1,3,{damage:1}),d=unit(s,'nightwalker_blade');hand(s,'nightwalker_ambush');
  s.attacker=1;s.response={stage:'response',attackerUid:a.uid,defenderUid:d.uid,originalDefenderUid:d.uid,responder:0};
  const x=A.explainAction(s,{profile:'faction'});assert.equal(x.action.type,'respond');assert.match(x.reason,/before retaliation/);
});
