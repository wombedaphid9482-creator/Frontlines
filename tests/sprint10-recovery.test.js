'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Balance=require('../balance.js'),BaseEngine=require('../engine.js'),Decks=require('../decks.js');
const clone=v=>JSON.parse(JSON.stringify(v));
const previous=Balance.dataFor('sprint9');
const D={...clone(previous),RULES:{...previous.RULES,salvageRecovery:true}};
const E=BaseEngine.withData(D),L=Decks.forData(D);
function game(commander='commander_rogue_scavenger',enemy='bruiser',config={}){
  const faction=E.commanders.get(commander).faction;
  return E.createGame({seed:10103,factions:[faction,enemy],decks:[{...L.starters().find(d=>d.faction===faction),commanderId:commander},L.starters().find(d=>d.faction===enemy)],config:{startingCommand:100,commandCap:120,...config}});
}
function field(s,id,owner=0,territory=3,extra={}){const u={uid:'fixture'+s.nextUid++,cardId:id,owner,territory,damage:0,ready:true,deployedTurn:0,movedTurn:-1,...extra};s.units.push(u);return u;}
function hand(s,id,owner=0,extra={}){const h={uid:'fixture'+s.nextUid++,cardId:id,...extra};s.players[owner].hand.push(h);return h;}
function act(s,a){const before=JSON.stringify(s),r=E.dispatch(s,a,{events:true});assert.equal(r.ok,true,r.error);assert.equal(JSON.stringify(s),before,'dispatch stays immutable');E.assertInvariants(r.state);return r;}
function bombard(s,victim){s.attacker=1;const h=hand(s,'bruiser_bombard',1);return act(s,{type:'order',handUid:h.uid,targetUid:victim.uid});}
function salvageEvents(r){return r.events.filter(e=>e.type==='passive'&&e.trait==='scavenge'||e.type==='commanderPassive'&&e.commanderId==='commander_rogue_scavenger');}
function combat(s,a,b){let r=act(s,{type:'attack',unitUid:a.uid,targetUid:b.uid});return act(r.state,{type:'respond',pass:true});}
function inventory(s,p){const x=s.players[p];return x.deck.length+x.discard.length+x.hand.length+s.units.filter(u=>u.owner===p).length;}

test('Scavenge and Nothing Wasted share one casualty draw, with nearby source attribution',()=>{
  let s=game();const source=field(s,'rogue_broker'),other=field(s,'rogue_bulwark'),a=field(s,'rogue_scrapper',0,3,{damage:3}),b=field(s,'rogue_outrider',0,2,{damage:3});
  const before=s.players[0].hand.length,total=inventory(s,0);let r=bombard(s,a);s=r.state;
  assert.equal(s.players[0].hand.length,before+1);assert.equal(inventory(s,0),total);
  assert.deepEqual(salvageEvents(r).map(e=>[e.type,e.uid,e.amount]),[['passive',source.uid,1]]);
  assert.equal(s.players[0].scavengedTurn,s.turn);assert.equal(s.players[0].commander.passiveTurn,s.turn);
  r=bombard(s,b);assert.equal(r.state.players[0].hand.length,before+1);assert.equal(salvageEvents(r).length,0);
  assert.ok(r.state.units.some(u=>u.uid===other.uid));
});

test('Commander fallback consumes the same budget before a later local Scavenge casualty',()=>{
  let s=game();field(s,'rogue_broker',0,3);const a=field(s,'rogue_scrapper',0,2,{damage:3}),b=field(s,'rogue_outrider',0,3,{damage:3});
  const before=s.players[0].hand.length;let r=bombard(s,a);s=r.state;
  assert.equal(salvageEvents(r).length,1);assert.equal(salvageEvents(r)[0].type,'commanderPassive');
  r=bombard(s,b);assert.equal(r.state.players[0].hand.length,before+1);assert.equal(salvageEvents(r).length,0);
});

test('shared draw allowance refreshes per global turn, including enemy initiative',()=>{
  let s=game();field(s,'rogue_broker');let victim=field(s,'rogue_scrapper',0,3,{damage:3});let r=bombard(s,victim);s=r.state;
  assert.equal(salvageEvents(r).length,1);s=act(s,{type:'endTurn'}).state;
  const own=field(s,'rogue_scrapper',0,3,{damage:3}),enemy=field(s,'bruiser_heavy',1,3);r=combat(s,own,enemy);s=r.state;
  assert.equal(salvageEvents(r).length,1,'fresh allowance on Rogue initiative');s=act(s,{type:'endTurn'}).state;
  victim=field(s,'rogue_outrider',0,3,{damage:3});r=bombard(s,victim);
  assert.equal(salvageEvents(r).length,1,'fresh allowance on opposing initiative');
});

test('simultaneous lethal Scavenge source cannot salvage; Commander fallback draws only once',()=>{
  const s=game(),source=field(s,'rogue_broker',0,3,{damage:4}),enemy=field(s,'bruiser_heavy',1,3,{damage:D.CARDS.bruiser_heavy.health-1});
  s.attacker=1;const before=s.players[0].hand.length,r=combat(s,enemy,source);
  assert.equal(r.state.units.length,0);assert.equal(r.state.players[0].hand.length,before+1);
  assert.equal(salvageEvents(r).length,1);assert.equal(salvageEvents(r)[0].type,'commanderPassive');
  assert.equal(r.events.filter(e=>e.type==='death').length,2);
});

test('suppressed, distant or simultaneously dead sources do not produce a Drifter draw',()=>{
  let s=game('commander_rogue_drifter');field(s,'rogue_broker',0,2);field(s,'rogue_bulwark',0,3,{suppressed:true});const victim=field(s,'rogue_scrapper',0,3,{damage:3});
  let r=bombard(s,victim);assert.equal(salvageEvents(r).length,0);
  s=game('commander_rogue_drifter');const source=field(s,'rogue_broker',0,3,{damage:4}),enemy=field(s,'bruiser_heavy',1,3,{damage:D.CARDS.bruiser_heavy.health-1});s.attacker=1;
  r=combat(s,enemy,source);assert.equal(salvageEvents(r).length,0);
});

test('simultaneous forced eliminations cannot stack draws or use a routed Scavenge source',()=>{
  const s=game('commander_rogue_scavenger','bruiser',{captureThreshold:1});s.attacker=1;
  for(let i=0;i<s.config.slotsPerTerritory;i++)field(s,'rogue_skirmisher',0,2);
  field(s,'rogue_broker');field(s,'rogue_bulwark');field(s,'rogue_scrapper');field(s,'bruiser_heavy',1,3);
  const total=inventory(s,0),r=act(s,{type:'endTurn'});
  assert.equal(r.events.filter(e=>e.type==='forcedElimination').length,3);
  assert.equal(salvageEvents(r).length,1);assert.equal(salvageEvents(r)[0].type,'commanderPassive');
  assert.equal(salvageEvents(r)[0].amount,1);assert.equal(inventory(r.state,0),total);
  assert.equal(r.state.units.filter(u=>u.owner===0).length,5);
});

test('each player has an independent shared budget when both lose a source simultaneously',()=>{
  const s=game('commander_rogue_scavenger','rogue'),a=field(s,'rogue_broker',0,3,{damage:4}),b=field(s,'rogue_broker',1,3,{damage:4});
  const before=s.players.map(p=>p.hand.length),r=combat(s,a,b);
  assert.equal(r.state.units.length,0);assert.deepEqual(r.state.players.map(p=>p.hand.length),before.map(n=>n+1));
  assert.deepEqual(salvageEvents(r).map(e=>e.player).sort(),[0,1]);
  assert.equal(r.state.players[0].scavengedTurn,s.turn);assert.equal(r.state.players[1].scavengedTurn,s.turn);
});

test('empty reserves recycle one casualty once; additional source/Commander triggers cannot duplicate it',()=>{
  const s=game();field(s,'rogue_broker');const victim=field(s,'rogue_scrapper',0,3,{damage:3});s.players[0].deck=[];s.players[0].discard=[];
  const before=s.players[0].hand.length,total=inventory(s,0),r=bombard(s,victim);
  assert.equal(r.state.players[0].hand.length,before+1);assert.equal(r.state.players[0].hand.at(-1).cardId,victim.cardId);
  assert.equal(inventory(r.state,0),total);assert.equal(r.state.players[0].discard.length,0);
  assert.equal(r.events.filter(e=>e.type==='draw'&&e.player===0).length,1);
});

test('reclaim frees commitment and preserves wounds through same-turn redeployment without curing statuses',()=>{
  let s=game('commander_rogue_drifter');const u=field(s,'rogue_outrider',0,2,{damage:3,ready:false,marked:1,reinforced:1}),h=hand(s,'rogue_reclaim');
  const before=E.presence(s,0),commands=s.actionsLeft,total=inventory(s,0),cost=E.actionCost(s,{type:'order',handUid:h.uid,targetUid:u.uid});
  let r=act(s,{type:'order',handUid:h.uid,targetUid:u.uid});s=r.state;
  assert.equal(s.players[0].hand.find(x=>x.uid===u.uid).damage,3);
  assert.equal(E.presence(s,0).committed,before.committed-D.CARDS[u.cardId].presence);
  assert.equal(E.presence(s,0).spent,before.spent+cost.presence);assert.equal(s.actionsLeft,commands-cost.commandActions);
  assert.equal(r.events.find(e=>e.type==='reclaim').retainedDamage,3);assert.equal(inventory(s,0),total);
  r=act(s,{type:'deploy',handUid:u.uid,territory:2});s=r.state;const returned=s.units.find(x=>x.uid===u.uid);
  assert.equal(returned.damage,3);assert.equal(returned.deployedTurn,s.turn);assert.equal(returned.ready,true);
  assert.equal(returned.marked,undefined);assert.equal(returned.reinforced,undefined);
  assert.equal(E.presence(s,0).committed,before.committed);assert.equal(E.presence(s,0).spent,before.spent+cost.presence);
  assert.equal(E.presence(s,0).available,before.available-cost.presence);assert.equal(inventory(s,0),total);
  const enemy=field(s,'bruiser_brawler',1,2);assert.match(E.validate(s,{type:'attack',unitUid:u.uid,targetUid:enemy.uid}),/Newly deployed/);
});

test('repeated reclaim/redeployment cannot erase wounds; normal Medic healing can',()=>{
  let s=game('commander_rogue_drifter');const u=field(s,'rogue_outrider',0,2,{damage:3});
  for(let i=0;i<2;i++){const h=hand(s,'rogue_reclaim');s=act(s,{type:'order',handUid:h.uid,targetUid:u.uid}).state;s=act(s,{type:'deploy',handUid:u.uid,territory:2}).state;assert.equal(s.units.find(x=>x.uid===u.uid).damage,3);}
  field(s,'rogue_salvage',0,2);s=act(s,{type:'endTurn'}).state;s=act(s,{type:'endTurn'}).state;
  assert.equal(s.units.find(x=>x.uid===u.uid).damage,2);assert.equal(s.players[0].spent,0);
});

test('Ghost Extraction uses the same retained-wound transaction; fresh deployments remain healthy',()=>{
  let s=game('commander_nightwalker_ghost');const u=field(s,'nightwalker_stalker',0,2,{damage:2}),h=hand(s,'nightwalker_ghost_extraction'),fresh=hand(s,'nightwalker_stalker');
  s=act(s,{type:'order',handUid:h.uid,targetUid:u.uid}).state;s=act(s,{type:'deploy',handUid:u.uid,territory:2}).state;s=act(s,{type:'deploy',handUid:fresh.uid,territory:2}).state;
  assert.equal(s.units.find(x=>x.uid===u.uid).damage,2);assert.equal(s.units.find(x=>x.uid===fresh.uid).damage,0);
});

test('Recover the Fallen remains a real paid once-per-match card recovery with fresh redeployment',()=>{
  let s=game();s.players[0].discard=['rogue_raider','rogue_scrapper','rogue_reclaim'];const total=inventory(s,0),before=E.presence(s,0),length=s.players[0].hand.length;
  let r=act(s,{type:'commander'});s=r.state;const recovered=s.players[0].hand.at(-1);
  assert.equal(recovered.cardId,'rogue_scrapper');assert.equal(recovered.damage,undefined);assert.equal(s.players[0].hand.length,length+1);
  assert.deepEqual(s.players[0].discard,['rogue_raider','rogue_reclaim']);assert.equal(E.presence(s,0).spent,before.spent+2);
  assert.equal(s.actionsLeft,2);assert.equal(inventory(s,0),total);assert.match(E.validate(s,{type:'commander'}),/spent/);
  r=act(s,{type:'deploy',handUid:recovered.uid,territory:2});assert.equal(r.state.units[0].damage,0);
  assert.equal(E.presence(r.state,0).committed,D.CARDS.rogue_scrapper.presence);assert.equal(E.presence(r.state,0).spent,2);
  const blocked=game();blocked.players[0].discard=['rogue_reclaim'];assert.equal(E.commanderStatus(blocked,0).available,false);assert.match(E.commanderStatus(blocked,0).reason,/No destroyed/);
});

test('Drifter retains one free adjacent movement per own initiative and paid global relocation',()=>{
  let s=game('commander_rogue_drifter');const u=field(s,'rogue_outrider',0,1,{damage:2});
  assert.equal(E.actionCost(s,{type:'move',unitUid:u.uid,territory:2}).commandActions,0);
  assert.match(E.validate(s,{type:'move',unitUid:u.uid,territory:3}),/adjacent/);s=act(s,{type:'move',unitUid:u.uid,territory:2}).state;
  assert.equal(s.actionsLeft,3);assert.equal(s.units[0].ready,true);assert.equal(E.actionCost(s,{type:'move',unitUid:u.uid,territory:3}).commandActions,1);
  s=act(s,{type:'commander',targetUid:u.uid,territory:3}).state;assert.equal(s.units[0].territory,3);assert.equal(s.units[0].damage,2);assert.equal(s.units[0].ready,true);assert.equal(s.actionsLeft,2);assert.equal(s.players[0].spent,2);
  assert.match(E.validate(s,{type:'commander',targetUid:u.uid,territory:0}),/spent/);
  s=act(s,{type:'endTurn'}).state;s=act(s,{type:'endTurn'}).state;
  assert.equal(E.actionCost(s,{type:'move',unitUid:u.uid,territory:2}).commandActions,0);
  const fresh=game('commander_rogue_drifter'),asset=field(fresh,'rogue_workshop',0,1),ally=field(fresh,'rogue_outrider',0,1);
  assert.match(E.validate(fresh,{type:'commander',targetUid:asset.uid,territory:3}),/unit/);assert.match(E.validate(fresh,{type:'commander',targetUid:ally.uid,territory:6}),/friendly/);
  for(let i=0;i<fresh.config.slotsPerTerritory;i++)field(fresh,'rogue_skirmisher',0,3);
  assert.match(E.validate(fresh,{type:'commander',targetUid:ally.uid,territory:3}),/slot/);
});

test('reclaimed wound metadata is validated; ordinary healthy hand shape stays compatible',()=>{
  const s=game();hand(s,'rogue_outrider',0,{damage:0});assert.equal(E.assertInvariants(s),true);
  for(const damage of [-1,1.5,D.CARDS.rogue_outrider.health]){const bad=clone(s);bad.players[0].hand.at(-1).damage=damage;assert.throws(()=>E.assertInvariants(bad),/invalid reclaimed wounds/);}
  const bad=clone(s);hand(bad,'rogue_reclaim',0,{damage:1});assert.throws(()=>E.assertInvariants(bad),/invalid reclaimed wounds/);
});

test('historical Sprint9 preserves separate casualty draws and wound-clearing reclaim with original Commander text',()=>{
  const old=Balance.createRuntime('sprint9'),OE=old.engine;assert.match(OE.commanders.get('commander_rogue_scavenger').passive.text,/each has its own limit/);
  let s=OE.createGame({seed:10103,factions:['rogue','bruiser'],config:{startingCommand:100,commandCap:120}});
  const source=field(s,'rogue_broker'),victim=field(s,'rogue_scrapper',0,3,{damage:3}),h=hand(s,'bruiser_bombard',1);s.attacker=1;const before=s.players[0].hand.length;
  let r=OE.dispatch(s,{type:'order',handUid:h.uid,targetUid:victim.uid},{events:true});assert.equal(r.ok,true,r.error);s=r.state;assert.equal(s.players[0].hand.length,before+2);
  assert.ok(r.events.some(e=>e.type==='passive'&&e.uid===source.uid));assert.ok(r.events.some(e=>e.type==='commanderPassive'));
  s.attacker=0;const target=field(s,'rogue_outrider',0,2,{damage:3}),recall=hand(s,'rogue_reclaim');r=OE.dispatch(s,{type:'order',handUid:recall.uid,targetUid:target.uid});assert.equal(r.ok,true,r.error);
  assert.equal(r.state.players[0].hand.find(x=>x.uid===target.uid).damage,undefined);r=OE.dispatch(r.state,{type:'deploy',handUid:target.uid,territory:2});assert.equal(r.ok,true,r.error);assert.equal(r.state.units.find(x=>x.uid===target.uid).damage,0);
});

test('own initiative opening economy is symmetric while first terminal capture resolves before the reply',()=>{
  let s=game();const first={command:s.players[0].command,actions:s.actionsLeft,hand:s.players[0].hand.length,spent:s.players[0].spent};
  s=act(s,{type:'endTurn'}).state;assert.deepEqual({command:s.players[1].command,actions:s.actionsLeft,hand:s.players[1].hand.length,spent:s.players[1].spent},first);
  s=act(s,{type:'endTurn'}).state;const second={command:s.players[0].command,actions:s.actionsLeft,hand:s.players[0].hand.length};s=act(s,{type:'endTurn'}).state;
  assert.deepEqual({command:s.players[1].command,actions:s.actionsLeft,hand:s.players[1].hand.length},second);
  const terminal=game('commander_rogue_drifter','bruiser',{captureThreshold:1});terminal.contested=6;terminal.territories.forEach((t,i)=>{t.owner=i<6?0:1;t.progress=[0,0];});field(terminal,'rogue_outrider',0,6);
  const before=terminal.players[1].turns,r=act(terminal,{type:'endTurn'});assert.equal(r.state.winner,0);assert.equal(r.state.players[1].turns,before);assert.equal(r.state.attacker,0);
});
