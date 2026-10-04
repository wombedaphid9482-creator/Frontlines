'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Catalog=require('../commanders.js'),Balance=require('../balance.js'),Decks=require('../decks.js');
const R=Balance.createRuntime('sprint9'),E=R.engine,D=R.data,L=Decks.forData(D);
const clone=v=>JSON.parse(JSON.stringify(v));
function game(id='commander_stonewall_warden'){
  const c=Catalog.get(id),other=c.faction==='bruiser'?'stonewall':'bruiser';
  const own=L.starters().find(d=>d.faction===c.faction),enemy=L.starters().find(d=>d.faction===other);
  return E.createGame({seed:909,factions:[c.faction,other],decks:[{...own,commanderId:id},enemy],config:{startingCommand:100,commandCap:120}});
}
function add(state,id,owner=0,territory=2,extra={}){const u={uid:'fixture'+state.nextUid++,cardId:id,owner,territory,damage:0,ready:true,deployedTurn:0,movedTurn:-1,...extra};state.units.push(u);return u;}
function act(state,action){const result=E.dispatch(state,action,{events:true});assert.equal(result.ok,true,result.error);return result;}
function attack(state,a,b){let r=act(state,{type:'attack',unitUid:a.uid,targetUid:b.uid});return act(r.state,{type:'respond',pass:true});}

test('ten immutable off-lane Commanders have exact costs, identity and useful faction hooks',()=>{
  assert.equal(Catalog.list().length,10);assert.ok(Object.isFrozen(Catalog.COMMANDERS));
  for(const faction of Object.keys(D.FACTIONS))assert.equal(Catalog.list(faction).length,2);
  for(const c of Catalog.list()){
    assert.ok(c.id.startsWith('commander_'));assert.equal(D.CARDS[c.id],undefined);
    assert.ok(Object.isFrozen(c.active.cost));assert.equal(c.active.oncePerMatch,true);assert.equal(c.active.cost.commandActions,1);
    assert.ok(c.passive.text.length>35&&c.active.text.length>35&&c.hook.text.length>35);
    assert.ok(Object.values(D.CARDS).some(card=>Catalog.synergy(card,c.id).score>0));
    assert.equal(Catalog.synergy({faction:'unknown'},c.id).score,0);
  }
  assert.equal(Catalog.get('__proto__'),null);assert.equal(Catalog.defaultFor('__proto__'),null);
});

test('Sprint9 changes only Commander rules and retains all 115 Sprint7 card definitions',()=>{
  const previous=Balance.dataFor('sprint7');assert.deepEqual(D.CARDS,previous.CARDS);assert.deepEqual(D.DECKS,previous.DECKS);assert.deepEqual(D.DEFAULT_CONFIG,previous.DEFAULT_CONFIG);
  assert.deepEqual(D.RULES,{...previous.RULES,commanders:true});
  for(const profile of ['baseline','sprint6','sprint7']){const old=Balance.createRuntime(profile),s=old.engine.createGame({seed:9});assert.equal(s.players[0].commander,undefined);assert.match(old.engine.validate(s,{type:'commander'}),/not enabled/);}
});

test('a Commander belongs to the deck faction, stays outside26 and consumes no deployed Presence',()=>{
  const state=game();assert.equal(state.players[0].deck.length+state.players[0].hand.length,26);assert.equal(state.units.length,0);assert.equal(E.presence(state,0).committed,0);
  assert.equal(state.players[0].deckMeta.commanderId,'commander_stonewall_warden');
  const starter=L.starters()[0];assert.throws(()=>E.createGame({factions:[starter.faction,'bruiser'],decks:[{...starter,commanderId:'commander_rogue_drifter'},L.starters().find(d=>d.faction==='bruiser')]}),/faction/);
  assert.throws(()=>E.createGame({decks:[{...starter,commanderId:''},L.starters().find(d=>d.faction==='bruiser')]}),/Commander/);
});

test('Warden active has exact costs, heals3, reinforces without stacking and is once per match',()=>{
  const state=game(),u=add(state,'stonewall_heavy',0,2,{damage:4}),before=clone(state),cost=E.actionCost(state,{type:'commander',targetUid:u.uid});
  assert.deepEqual(cost,{presence:2,commandActions:1});assert.equal(E.commanderStatus(state,0).available,true);
  const r=act(state,{type:'commander',targetUid:u.uid}),after=r.state;
  assert.deepEqual(state,before);assert.equal(after.units[0].damage,1);assert.equal(after.units[0].reinforced,1);assert.equal(after.players[0].spent,2);assert.equal(after.actionsLeft,2);
  assert.equal(after.players[0].commander.used,true);assert.equal(E.combatDamage(after,after.units[0],4),2); // Fortify1 + Armor1
  assert.ok(r.events.some(e=>e.type==='commanderActivated'&&e.presenceCost===2));assert.match(E.validate(after,{type:'commander',targetUid:u.uid}),/spent/);
  assert.equal(E.legalActions(after).some(a=>a.type==='commander'),false);assert.equal(game().players[0].commander.used,false);
});

test('Warden passive heals friendly territory only and active Armor clears at next initiative',()=>{
  let state=game(),home=add(state,'stonewall_heavy',0,2,{damage:3}),front=add(state,'stonewall_rifles',0,3,{damage:2});
  state=act(state,{type:'commander',targetUid:home.uid}).state;
  state.units.find(u=>u.uid===home.uid).damage=2;
  state=act(state,{type:'endTurn'}).state;const r=act(state,{type:'endTurn'});state=r.state;
  assert.equal(state.units.find(u=>u.uid===home.uid).damage,1);assert.equal(state.units.find(u=>u.uid===front.uid).damage,2);assert.equal(state.units.find(u=>u.uid===home.uid).reinforced,undefined);
  assert.ok(r.events.some(e=>e.type==='commanderPassive'&&e.targetUid===home.uid&&e.amount===1));
});

test('Commander availability explains timing, wrong seat, resources, spent state and real targets',()=>{
  const state=game(),u=add(state,'stonewall_heavy',0,2,{damage:2});
  assert.match(E.validate(state,{type:'commander',targetUid:u.uid,player:1}),/Player 1/);
  assert.match(E.commanderStatus(state,1).reason,/offensive turn/);
  const noCommands=clone(state);noCommands.actionsLeft=0;assert.match(E.commanderStatus(noCommands,0).reason,/Command Action/);
  const noCapacity=clone(state);noCapacity.players[0].spent=E.presence(noCapacity,0).available;assert.match(E.commanderStatus(noCapacity,0).reason,/Capacity/);
  assert.match(E.validate(state,{type:'commander',targetUid:'commander_stonewall_warden'}),/damaged/);
  const front=add(state,'stonewall_rifles',0,3),enemy=add(state,'bruiser_assault',1,3);const pending=act(state,{type:'attack',unitUid:front.uid,targetUid:enemy.uid}).state;
  assert.match(E.validate(pending,{type:'commander',targetUid:u.uid}),/response/);assert.equal(E.commanderStatus(pending,0).available,false);
});

test('Marshal survival bonus does not stack and expires at its next own offensive turn end',()=>{
  let state=game('commander_stonewall_marshal');const defender=add(state,'stonewall_heavy',0,3),a=add(state,'bruiser_assault',1,3);state.attacker=1;
  const r=attack(state,a,defender);state=r.state;assert.equal(state.units.find(u=>u.uid===defender.uid).commanderCounter,1);
  assert.ok(r.events.some(e=>e.type==='commanderPassive'&&e.commanderId==='commander_stonewall_marshal'));
  state=act(state,{type:'endTurn'}).state;assert.equal(state.units.find(u=>u.uid===defender.uid).commanderCounter,1);
  state=act(state,{type:'endTurn'}).state;assert.equal(state.units.find(u=>u.uid===defender.uid).commanderCounter,undefined);
});

test('Marshal signature readies a survivor without bypassing deployment-turn restrictions',()=>{
  const state=game('commander_stonewall_marshal'),u=add(state,'stonewall_rifles',0,3,{ready:false,deployedTurn:state.turn}),target=add(state,'bruiser_assault',1,3);
  const r=act(state,{type:'commander',targetUid:u.uid});assert.equal(r.state.units[0].ready,true);assert.equal(r.state.units[0].commanderCounter,1);assert.match(E.validate(r.state,{type:'attack',unitUid:u.uid,targetUid:target.uid}),/Newly deployed/);
});

test('Breaker signature boosts a frontline unit and Rush/Mobile adds exactly2 territorial pressure',()=>{
  let state=game('commander_bruiser_breaker'),u=add(state,'bruiser_assault',0,3,{ready:false});
  const base=E.attackValue(state,u);state=act(state,{type:'commander',targetUid:u.uid}).state;
  assert.equal(E.attackValue(state,state.units[0]),base+2);const r=act(state,{type:'endTurn'});assert.equal(r.state.territories[3].progress[0],D.CARDS[u.cardId].presence+2);assert.equal(r.state.units[0].commanderBreach,undefined);
  assert.equal(r.events.find(e=>e.type==='pressure').amount,D.CARDS[u.cardId].presence+2);assert.equal(r.events.filter(e=>e.type==='commanderPassive').length,1);
});

test('Bloodhound attacks wounded targets with1 extra but direct signature ignores protection',()=>{
  const state=game('commander_bruiser_bloodhound'),a=add(state,'bruiser_gunner',0,3),b=add(state,'stonewall_heavy',1,3,{damage:1,reinforced:1});
  assert.equal(E.attackValue(state,a,b),E.attackValue(state,a)+1);b.damage=0;assert.equal(E.attackValue(state,a,b),E.attackValue(state,a));assert.match(E.validate(state,{type:'commander',targetUid:b.uid}),/wounded/);b.damage=1;
  const r=act(state,{type:'commander',targetUid:b.uid});assert.equal(r.state.units.find(u=>u.uid===b.uid).damage,4);assert.equal(r.events.find(e=>e.type==='damage').amount,3);
});

test('Coordinator discounts selected Mark mode only; commitment and card definitions remain printed',()=>{
  const state=game('commander_syndicate_coordinator'),c=D.CARDS.syndicate_target_designator,h={uid:'mark-fixture',cardId:c.id};state.players[0].hand.push(h);const target=add(state,'bruiser_assault',1,3);
  const a={type:'order',handUid:h.uid,targetUid:target.uid};assert.equal(E.actionCost(state,a).presence,Math.max(1,c.presence-1));
  const r=act(state,a);assert.equal(r.state.players[0].spent,Math.max(1,c.presence-1));assert.equal(r.events.find(e=>e.type==='order').presence,Math.max(1,c.presence-1));assert.equal(D.CARDS[c.id].presence,c.presence);
  const active=act(r.state,{type:'commander',targetUid:target.uid});assert.equal(active.state.units.find(u=>u.uid===target.uid).marked,1);assert.equal(active.events.find(e=>e.type==='damage').amount,2);
});

test('Quartermaster first cheap tactical Order is free in commands and signature recovers bounded spending',()=>{
  const state=game('commander_syndicate_quartermaster'),target=add(state,'bruiser_heavy',1,3);
  const c=Object.values(D.CARDS).find(c=>c.faction==='syndicate'&&c.type==='order'&&c.timing==='action'&&c.commandCost>0&&c.presence<=3);assert.ok(c);
  state.players[0].hand.push({uid:'order-first',cardId:c.id},{uid:'order-second',cardId:c.id});
  const first={type:'order',handUid:'order-first',...(c.effect.kind==='damage'||c.effect.kind==='sabotage'||c.effect.kind==='mark'?{targetUid:target.uid}:{})};
  assert.equal(E.actionCost(state,first).commandActions,0);let r=act(state,first);assert.equal(r.state.actionsLeft,3);
  assert.equal(E.actionCost(r.state,{...first,handUid:'order-second'}).commandActions,1);
  r.state.players[0].spent=7;const length=r.state.players[0].hand.length;r=act(r.state,{type:'commander'});assert.equal(r.state.players[0].spent,3);assert.equal(r.state.players[0].hand.length,length+2);assert.equal(r.state.actionsLeft,2);
});

test('Ghost protects only the first Precision deployment and withdraws into a legal adjacent slot',()=>{
  const state=game('commander_nightwalker_ghost'),definition=Object.values(D.CARDS).find(c=>c.faction==='nightwalker'&&c.type!=='order'&&c.traits.includes('precision'));
  state.players[0].hand.push({uid:'precision-first',cardId:definition.id},{uid:'precision-second',cardId:definition.id});let r=act(state,{type:'deploy',handUid:'precision-first',territory:2});
  r=act(r.state,{type:'deploy',handUid:'precision-second',territory:2});assert.equal(r.state.units[0].reinforced,1);assert.equal(r.state.units[1].reinforced,undefined);
  r.state.units[0].damage=2;r=act(r.state,{type:'commander',targetUid:'precision-first'});assert.equal(r.state.units[0].territory,1);assert.equal(r.state.units[0].damage,0);assert.equal(r.state.units[0].ready,true);
});

test('Saboteur passive locks available Capacity once and signature suppresses frontline traits temporarily',()=>{
  const state=game('commander_nightwalker_saboteur'),u=add(state,'bruiser_brawler',1,3),back=add(state,'bruiser_heavy',1,4);
  state.players[0].hand.push({uid:'sabotage-fixture',cardId:'nightwalker_blackout'});let r=act(state,{type:'order',handUid:'sabotage-fixture',targetUid:u.uid});
  assert.equal(r.state.players[1].spent,1);r=act(r.state,{type:'commander'});assert.equal(r.state.players[1].spent,3);assert.equal(r.state.units.find(x=>x.uid===u.uid).suppressed,true);assert.equal(r.state.units.find(x=>x.uid===back.uid).suppressed,undefined);
  r=act(r.state,{type:'endTurn'});assert.equal(r.state.players[1].spent,0);assert.equal(r.state.units.find(x=>x.uid===u.uid).suppressed,undefined);
});

test('Scavenger draws once per initiative and recovers an actual discarded battlefield card',()=>{
  let state=game('commander_rogue_scavenger'),u=add(state,'rogue_skirmisher',0,3,{damage:D.CARDS.rogue_skirmisher.health-1}),v=add(state,'rogue_scrapper',0,3,{damage:D.CARDS.rogue_scrapper.health-1}),enemy=add(state,'bruiser_heavy',1,3);state.attacker=1;
  const before=state.players[0].hand.length;let r=attack(state,enemy,u);state=r.state;assert.equal(state.players[0].hand.length,before+1);
  enemy=state.units.find(x=>x.uid===enemy.uid);enemy.ready=true;r=attack(state,enemy,v);state=r.state;assert.equal(state.players[0].hand.length,before+1);
  state=act(state,{type:'endTurn'}).state;const last=state.players[0].discard.findLast(id=>D.CARDS[id].type!=='order'),length=state.players[0].hand.length;
  r=act(state,{type:'commander'});assert.equal(r.state.players[0].hand.length,length+1);assert.equal(r.state.players[0].hand.at(-1).cardId,last);assert.ok(r.events.some(e=>e.type==='commanderRecovery'&&e.cardId===last));
});

test('Drifter first normal move is free, normal rules remain, and signature offers any legal friendly/frontline slot',()=>{
  let state=game('commander_rogue_drifter'),u=add(state,'rogue_outrider',0,1);assert.equal(E.actionCost(state,{type:'move',unitUid:u.uid,territory:2}).commandActions,0);
  assert.match(E.validate(state,{type:'move',unitUid:u.uid,territory:3}),/adjacent/);state=act(state,{type:'move',unitUid:u.uid,territory:2}).state;
  assert.equal(state.actionsLeft,3);assert.equal(E.actionCost(state,{type:'move',unitUid:u.uid,territory:3}).commandActions,1);
  const r=act(state,{type:'commander',targetUid:u.uid,territory:3});assert.equal(r.state.units[0].territory,3);assert.equal(r.state.units[0].ready,true);assert.equal(r.state.actionsLeft,2);
  const blocked=game('commander_rogue_drifter'),a=add(blocked,'rogue_outrider');assert.match(E.validate(blocked,{type:'commander',targetUid:a.uid,territory:6}),/friendly/);
});

test('every Commander legal action is authoritative and every signature can enter play',()=>{
  for(const c of Catalog.list()){
    const s=game(c.id),own=Object.values(D.CARDS).find(x=>x.faction===c.faction&&x.type==='unit'&&x.health>=4),enemy=Object.values(D.CARDS).find(x=>x.faction===s.players[1].faction&&x.type==='unit'&&x.health>=4);
    add(s,own.id,0,3,{damage:1,ready:false});add(s,enemy.id,1,3,{damage:1});s.players[0].discard.push(own.id);s.players[0].spent=3;
    const actions=E.legalActions(s).filter(a=>a.type==='commander');assert.ok(actions.length,c.id);assert.ok(actions.every(a=>E.validate(s,a)===null));
    const r=act(s,actions[0]);assert.equal(r.state.players[0].commander.used,true);assert.equal(r.events.filter(e=>e.type==='commanderActivated').length,1);assert.equal(E.assertInvariants(r.state),true);
  }
});

test('all AI policies and difficulties understand Commander signatures using public information only',()=>{
  for(const c of Catalog.list()){
    const state=game(c.id),own=Object.values(D.CARDS).find(x=>x.faction===c.faction&&x.type==='unit'&&x.health>=4);add(state,own.id,0,3,{damage:2,ready:false});add(state,'bruiser_heavy',1,3,{damage:1});state.players[0].discard.push(own.id);state.players[0].spent=3;
    for(const profile of ['baseline','faction','deck','random'])for(const difficulty of [null,'learning','easy','normal','hard','expert']){
      const options={profile,...(difficulty?{difficulty}:{})},before=clone(state),a=R.ai.explainAction(state,options);assert.equal(E.validate(state,a.action),null);assert.deepEqual(state,before);
      const hidden=clone(state);hidden.players[1].hand.reverse();hidden.players[1].deck.reverse();hidden.players[0].deck.reverse();assert.deepEqual(R.ai.chooseAction(hidden,options),R.ai.chooseAction(state,options));
    }
  }
});

test('AI spends a Warden signature on an urgent wounded frontline without hidden draw knowledge',()=>{
  const state=game(),u=add(state,'stonewall_heavy',0,3,{damage:4,ready:false});state.players[0].hand=[];
  const decision=R.ai.explainAction(state,{profile:'deck',difficulty:'normal'});assert.equal(decision.action.type,'commander');assert.equal(decision.action.targetUid,u.uid);assert.match(decision.explanation,/Lasting Resolve/);
});

test('Quartermaster cost previews tolerate missing or other-seat hand IDs without relaxing legality',()=>{
  const state=game('commander_syndicate_quartermaster');
  for(const handUid of ['missing',state.players[1].hand[0].uid]){
    const action={type:'order',handUid};assert.doesNotThrow(()=>E.actionCost(state,action));assert.equal(E.actionCost(state,action).presence,0);assert.match(E.validate(state,action),/no longer in your hand/);
  }
});
