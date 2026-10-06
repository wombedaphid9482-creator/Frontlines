'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const B=require('../balance'),P=require('../multiplayer-protocol'),S=require('../multiplayer-session'),Decks=require('../decks'),Training=require('../tactical-training');
const R=B.createRuntime('sprint12'),E=R.engine,L=Decks.forData(R.data),copy=P.clone;
function fixture(options={}){
  const runtime=options.state?{...R,engine:{...E,createGame:()=>copy(options.state)}}:R;
  const h=S.createHost({runtime,appVersion:'1.1.0',sessionId:'session_fixture',hostId:'host',name:'Ryken',...options.hostOptions});
  const clients={host:S.createClient({compatibility:h.compatibility,sessionId:h.sessionId,senderId:'host',hostId:'host'}),guest:S.createClient({compatibility:h.compatibility,sessionId:h.sessionId,senderId:'guest',hostId:'host'})};
  function deliver(result){for(const item of result.outbox||[]){const accepted=clients[item.toId]?.accept(item.message);assert.equal(accepted?.ok,true,JSON.stringify(accepted));}return result;}
  deliver(h.join('guest','Wyatt',h.compatibility));
  const selected=options.state?options.state.players.map(player=>({...L.starters().find(deck=>deck.faction===player.faction),commanderId:player.commander.id})):options.decks||[L.starters()[0],L.starters()[1]];
  deliver(h.select('host',selected[0]));deliver(h.select('guest',selected[1]));deliver(h.ready('host',true));deliver(h.ready('guest',true));
  if(options.start!==false){deliver(h.start('host',{seed:options.seed??2}));deliver(h.handle('host',clients.host.message('startAck',{})));deliver(h.handle('guest',clients.guest.message('startAck',{})));}
  function act(action){const state=h.inspectCanonical(),id=h.snapshotFor('host').localSeat===E.getActor(state)?'host':'guest',message=clients[id].makeIntent(action),before=copy(state),expected=E.dispatch(before,action,{events:true}),result=h.handle(id,message);assert.equal(result.ok,true,JSON.stringify(result));deliver(result);assert.deepEqual(h.inspectCanonical(),expected.state);assert.equal(clients.host.getSnapshot().sharedHash,clients.guest.getSnapshot().sharedHash);return {result,message,id,expected};}
  return {h,clients,deliver,act};
}
test('host shared lobby validates deck choices, ready state and ownership before start',()=>{
  const h=S.createHost({runtime:R,sessionId:'room',hostId:'host',appVersion:'1.1.0'});assert.equal(h.lobby().canStart,false);assert.equal(h.ready('host',true).code,'DECK_INVALID');assert.equal(h.select('stranger',L.starters()[0]).code,'INVALID_SENDER');
  assert.equal(h.join('guest','Wyatt',h.compatibility).ok,true);assert.equal(h.join('third','Third',h.compatibility).code,'MATCH_FULL');
  assert.equal(h.select('guest',{...L.starters()[1],cards:['unknown']}).code,'DECK_INVALID');assert.equal(h.select('guest',{...L.starters()[1],commanderId:'commander_stonewall_warden'}).code,'DECK_INVALID');assert.equal(h.select('guest',{...L.starters()[1],commanderId:undefined}).code,'DECK_INVALID');
  h.select('host',L.starters()[0]);h.select('guest',L.starters()[1]);h.ready('host',true);h.ready('guest',true);assert.equal(h.lobby().canStart,true);h.select('guest',L.starters()[1]);assert.equal(h.lobby().players[1].ready,false);assert.equal(h.start('guest').code,'HOST_ONLY');assert.equal(h.start('host').code,'NOT_READY');
  const wire=JSON.stringify(h.lobby());assert.equal(wire.includes('"cards"'),false);assert.ok(wire.includes(L.starters()[1].name));assert.equal(wire.includes('reconnectToken'),false);
});
test('expired invites, closed sessions and compatibility mismatch fail cleanly',()=>{
  let clock=100;const h=S.createHost({runtime:R,sessionId:'room',hostId:'host',appVersion:'1.1.0',now:()=>clock,inviteTtlMs:50});
  assert.equal(h.join('guest','Wyatt',{...h.compatibility,protocolVersion:2}).code,'PROTOCOL_MISMATCH');assert.equal(h.join('guest','Wyatt',{...h.compatibility,appVersion:'1.0.5'}).code,'VERSION_MISMATCH');assert.equal(h.join('guest','Wyatt',{...h.compatibility,rulesetHash:'different'}).code,'RULESET_MISMATCH');clock=151;assert.equal(h.join('guest','Wyatt',h.compatibility).code,'INVITE_EXPIRED');h.close('host');assert.equal(h.select('host',L.starters()[0]).code,'MATCH_CLOSED');
});
test('first-time authenticated guest receives terminal compatibility errors without private state or membership',()=>{
  const h=S.createHost({runtime:R,sessionId:'room',hostId:'host',appVersion:'1.1.0'});
  for(const [field,value,code]of [['appVersion','1.0.5','VERSION_MISMATCH'],['rulesetHash','different','RULESET_MISMATCH'],['protocolVersion',2,'PROTOCOL_MISMATCH']]){
    const message=P.packet({sessionId:'room',senderId:'newGuest'},'hello',{name:'Wyatt',compatibility:{...h.compatibility,[field]:value}}),result=h.handle('newGuest',message);
    assert.equal(result.code,code);assert.equal(result.outbox.length,1);assert.equal(result.outbox[0].toId,'newGuest');const error=result.outbox[0].message;assert.equal(error.messageType,'error');assert.equal(error.payload.code,code);assert.equal(error.matchId,null);assert.equal(error.stateHash,null);assert.equal(error.payload.resync,false);assert.deepEqual(Object.keys(error.payload).sort(),['actionId','code','reason','resync']);assert.equal(h.lobby().players.length,1);
    const wire=JSON.stringify(error);for(const field of ['"state"','"players"','"cards"','"hand"','reconnectToken','rngState'])assert.equal(wire.includes(field),false,field);
    const client=S.createClient({sessionId:'room',senderId:'newGuest',hostId:'host',compatibility:h.compatibility});assert.equal(client.accept(error).code,code);
  }
  const unsupported=P.packet({sessionId:'room',senderId:'newGuest'},'hello',{compatibility:h.compatibility});unsupported.protocolVersion=2;const reply=h.handle('newGuest',JSON.stringify(unsupported));assert.equal(reply.code,'PROTOCOL_MISMATCH');assert.equal(reply.outbox[0].message.payload.code,'PROTOCOL_MISMATCH');assert.equal(h.lobby().players.length,1);
  assert.equal(h.handle('differentAuthenticatedId',unsupported).outbox,undefined);assert.equal(h.handle('newGuest',{...unsupported,payload:{constructor:{}}}).outbox,undefined);
});
test('interrupted opening welcome is idempotent for the same relay-authenticated guest only',()=>{
  const h=S.createHost({runtime:R,sessionId:'room',hostId:'host',appVersion:'1.1.0'}),guest=S.createClient({sessionId:'room',senderId:'guest',hostId:'host',compatibility:h.compatibility});
  const first=h.handle('guest',guest.hello('Wyatt')),firstWelcome=first.outbox.find(entry=>entry.toId==='guest'&&entry.message.messageType==='welcome');assert.ok(firstWelcome);assert.equal(guest.getReconnectCredential().token,null);
  h.disconnect('guest');const recovered=h.handle('guest',guest.hello('Wyatt'));assert.equal(recovered.ok,true);assert.equal(h.lobby().players.length,2);const welcome=recovered.outbox.find(entry=>entry.message.messageType==='welcome');assert.equal(welcome.toId,'guest');assert.equal(welcome.message.payload.reconnectToken,firstWelcome.message.payload.reconnectToken);assert.equal(recovered.outbox.some(entry=>entry.toId==='host'&&entry.message.messageType==='welcome'),false);assert.equal(guest.accept(welcome.message).ok,true);assert.equal(guest.getReconnectCredential().token,firstWelcome.message.payload.reconnectToken);
  const again=h.handle('guest',P.packet({sessionId:'room',senderId:'guest'},'hello',{name:'Wyatt',compatibility:h.compatibility}));assert.equal(again.ok,true);assert.equal(h.lobby().players.length,2);
  assert.equal(h.handle('stranger',guest.hello('Wyatt')).code,'INVALID_SENDER');assert.equal(h.handle('stranger',P.packet({sessionId:'room',senderId:'stranger'},'hello',{name:'Other',compatibility:h.compatibility})).code,'MATCH_FULL');
  const incompatible=guest.hello('Wyatt');incompatible.payload.compatibility.rulesetHash='bad';assert.equal(h.handle('guest',incompatible).code,'RULESET_MISMATCH');
  const wrong=guest.hello('Wyatt');wrong.payload.reconnectToken='wrong';assert.equal(h.handle('guest',wrong).code,'RECONNECT_REJECTED');
});
test('missing opening credential is never accepted once canonical gameplay has started',()=>{
  const {h,clients}=fixture();h.disconnect('guest');const hello=clients.guest.hello('Wyatt');delete hello.payload.reconnectToken;assert.equal(h.handle('guest',hello).code,'RECONNECT_REJECTED');assert.equal(h.snapshotFor('host').status,'reconnecting');
});
test('both clients acknowledge the same opening before any gameplay intake',()=>{
  const {h,clients,deliver}=fixture({start:false});deliver(h.start('host',{seed:2}));const snap=clients.host.getSnapshot(),action=E.legalActions(h.inspectCanonical())[0],raw=P.makeIntent({sessionId:h.sessionId,matchId:snap.matchId,senderId:'host',sequence:0,stateHash:snap.stateHash,rulesetHash:h.compatibility.rulesetHash},action);
  assert.equal(h.submitIntent('host',raw).code,'MATCH_PAUSED');assert.equal(h.handle('guest',{...clients.guest.message('startAck',{}),stateHash:'wrong'}).code,'STATE_MISMATCH');
  deliver(h.handle('host',clients.host.message('startAck',{})));assert.equal(h.snapshotFor('host').status,'starting');deliver(h.handle('guest',clients.guest.message('startAck',{})));assert.equal(h.snapshotFor('host').status,'active');
});
test('seed bit fairly assigns canonical initiative and rematch alternates seats with fresh IDs and RNG',()=>{
  const {h,clients,deliver}=fixture({seed:3});assert.equal(h.snapshotFor('host').localSeat,1);assert.equal(h.inspectCanonical().attacker,0);assert.equal(h.inspectCanonical().players[0].faction,'bruiser');const first=h.inspectCanonical(),match=h.snapshotFor('host').matchId;
  deliver(h.concede('guest'));assert.equal(clients.host.getSnapshot().result.reason,'concede');deliver(h.rematch('host'));assert.equal(h.lobby().players.every(player=>!player.ready),true);assert.ok(h.lobby().players.every(player=>player.deck));h.ready('host',true);h.ready('guest',true);deliver(h.start('host',{seed:19}));assert.equal(h.snapshotFor('host').localSeat,0);assert.notEqual(h.snapshotFor('host').matchId,match);assert.notEqual(h.inspectCanonical().seed,first.seed);assert.notEqual(h.inspectCanonical().rngState,first.rngState);
});
test('strict authenticated intentions reject wrong window, forged identity and impossible ownership',()=>{
  const {h,clients}=fixture(),before=h.inspectCanonical(),host=clients.host.getSnapshot();
  const base={sessionId:h.sessionId,matchId:host.matchId,senderId:'host',sequence:host.sequence,stateHash:host.stateHash,rulesetHash:h.compatibility.rulesetHash};
  const foreign=P.makeIntent({...base,senderId:'guest',stateHash:clients.guest.getSnapshot().stateHash},{type:'endTurn'});assert.equal(h.submitIntent('guest',foreign).code,'WRONG_PLAYER');
  assert.equal(h.submitIntent('guest',P.makeIntent(base,{type:'endTurn'})).code,'INVALID_SENDER');assert.equal(h.submitIntent('host',P.makeIntent(base,{type:'deploy',handUid:before.players[1].hand[0].uid,territory:0})).code,'ILLEGAL_ACTION');
  const forged=P.makeIntent(base,{type:'endTurn'});forged.payload.action.player=1;assert.equal(h.submitIntent('host',forged).code,'MALFORMED_ACTION');assert.deepEqual(h.inspectCanonical(),before);
});
test('duplicated, stale, future and reused action identifiers never resolve twice',()=>{
  const {h,clients,act}=fixture(),choice=clients.host.getSnapshot().legalActions.find(action=>action.type==='deploy')||{type:'endTurn'},accepted=act(choice),after=copy(h.inspectCanonical());
  assert.equal(h.submitIntent(accepted.id,accepted.message).duplicate,true);assert.deepEqual(h.inspectCanonical(),after);
  const altered=copy(accepted.message);altered.payload.action={type:'endTurn'};if(P.canonical(altered.payload)===P.canonical(accepted.message.payload))altered.payload.action={type:'deploy',handUid:'c999',territory:0};assert.equal(h.submitIntent(accepted.id,altered).code,'ACTION_ID_REUSED');
  const stale={...accepted.message,actionId:P.randomId('action')};assert.equal(h.submitIntent(accepted.id,stale).code,'STALE_ACTION');const future={...stale,sequence:50};assert.equal(h.submitIntent(accepted.id,future).code,'FUTURE_ACTION');assert.deepEqual(h.inspectCanonical(),after);
});
test('client sequence gaps and hash corruption lock input then safe resync restores it',()=>{
  const {h,clients,act}=fixture();act({type:'endTurn'});const saved=clients.host.getSnapshot(),future=copy(h.snapshotMessage('host','state'));future.sequence+=2;future.payload.sequence+=2;assert.equal(clients.host.accept(future).code,'SEQUENCE_GAP');assert.equal(clients.host.needsResync(),true);assert.throws(()=>clients.host.makeIntent({type:'endTurn'}));assert.equal(clients.host.accept(h.snapshotMessage('host')).ok,true);
  const corrupt=copy(h.snapshotMessage('host'));corrupt.payload.state.actionsLeft++;assert.equal(clients.host.accept(corrupt).code,'STATE_MISMATCH');assert.equal(clients.host.getSnapshot().stateHash,saved.stateHash);assert.equal(clients.host.accept(h.snapshotMessage('host')).ok,true);
  const wrongHash=copy(clients.guest.makeIntent({type:'endTurn'}));wrongHash.stateHash='bad';assert.equal(h.submitIntent('guest',wrongHash).code,'STATE_MISMATCH');assert.equal(clients.host.getSnapshot().sharedHash,clients.guest.getSnapshot().sharedHash);
});
test('idle disconnect pauses both actors, scoped credential restores the same match and dedup survives reconnect',()=>{
  const {h,clients,act,deliver}=fixture(),accepted=act(clients.host.getSnapshot().legalActions.find(action=>action.type==='deploy')||{type:'endTurn'}),match=h.snapshotFor('host').matchId,canonical=h.inspectCanonical();
  deliver(h.disconnect('guest'));assert.equal(h.snapshotFor('host').status,'reconnecting');const message={...accepted.message,actionId:P.randomId('action'),sequence:h.snapshotFor('host').sequence,stateHash:h.snapshotFor('host').stateHash};assert.equal(h.submitIntent('host',message).code,'MATCH_PAUSED');assert.equal(h.reconnect('guest','wrong').code,'RECONNECT_REJECTED');
  const token=clients.guest.getReconnectCredential().token;deliver(h.reconnect('guest',token));assert.equal(h.snapshotFor('host').matchId,match);assert.equal(h.snapshotFor('host').status,'active');assert.deepEqual(h.inspectCanonical(),canonical);assert.equal(h.submitIntent(accepted.id,accepted.message).duplicate,true);
  const diagnostics=JSON.stringify(h.diagnostics());assert.equal(diagnostics.includes(token),false);assert.equal(diagnostics.includes('reconnectToken'),false);
});
test('missed events during transport recovery resynchronize without replaying the last action',()=>{
  const {h,clients,deliver}=fixture();const first=clients.host.makeIntent({type:'endTurn'}),step=h.handle('host',first);for(const item of step.outbox)if(item.toId==='host')clients.host.accept(item.message);
  const middle=h.snapshotFor('guest'),remote=P.makeIntent({sessionId:h.sessionId,matchId:middle.matchId,senderId:'guest',sequence:middle.sequence,stateHash:middle.stateHash,rulesetHash:h.compatibility.rulesetHash},{type:'endTurn'});h.handle('guest',remote);h.disconnect('guest');deliver(h.reconnect('guest',clients.guest.getReconnectCredential().token));assert.equal(clients.guest.getSequence(),2);assert.equal(h.submitIntent('guest',remote).duplicate,true);assert.equal(h.snapshotFor('guest').sequence,2);
});
test('resync replaces state without repeating prior attack feedback and reconnect revalidates compatibility',()=>{
  const {h,clients,act}=fixture();act(clients.host.getSnapshot().legalActions.find(action=>action.type==='deploy')||{type:'endTurn'});assert.ok(h.snapshotFor('host').events.length);assert.deepEqual(h.snapshotMessage('host').payload.events,[]);assert.ok(h.snapshotMessage('host','state').payload.events.length);
  h.disconnect('guest');const hello=clients.guest.hello('Wyatt');hello.payload.compatibility.appVersion='1.0.5';assert.equal(h.handle('guest',hello).code,'VERSION_MISMATCH');assert.equal(h.snapshotFor('host').status,'reconnecting');
});
test('a pending Response survives reconnect with stable identity and only the eligible seat can answer',()=>{
  const state=E.createGame({seed:13,factions:['syndicate','stonewall'],config:{startingCommand:100,commandCap:120}});state.players[0].hand.push({uid:'fixtureCounter',cardId:'syndicate_counter'});state.players[1].hand.push({uid:'fixtureShield',cardId:'stonewall_brace'});state.units.push({uid:'fixtureAttacker',cardId:'syndicate_security',owner:0,territory:3,damage:0,ready:true,deployedTurn:0,movedTurn:-1},{uid:'fixtureDefender',cardId:'stonewall_heavy',owner:1,territory:3,damage:1,ready:true,deployedTurn:0,movedTurn:-1});
  const {h,clients,act,deliver}=fixture({state});act({type:'attack',unitUid:'fixtureAttacker',targetUid:'fixtureDefender'});const opening=clients.guest.getSnapshot().responseWindow;assert.equal(opening.eligibleSeat,1);assert.equal(opening.stage,'response');assert.equal(clients.host.getSnapshot().legalActions.length,0);
  deliver(h.disconnect('guest'));deliver(h.reconnect('guest',clients.guest.getReconnectCredential().token));assert.deepEqual(clients.guest.getSnapshot().responseWindow,opening);
  act({type:'respond',handUid:'fixtureShield'});const counter=clients.host.getSnapshot().responseWindow;assert.equal(counter.id,opening.id);assert.equal(counter.eligibleSeat,0);assert.equal(counter.stage,'counter');assert.equal(clients.guest.getSnapshot().state.response.order.cardId,'stonewall_brace');act({type:'counter',handUid:'fixtureCounter'});assert.equal(clients.guest.getSnapshot().responseWindow,null);assert.equal(h.inspectCanonical().response,null);
});
test('reconnect grace expiry preserves battlefield with no automatic winner and wait-longer resumes',()=>{
  let clock=100;const {h,deliver}=fixture({hostOptions:{now:()=>clock,reconnectGraceMs:50}}),before=h.inspectCanonical();deliver(h.disconnect('guest'));clock=151;deliver(h.tick());assert.equal(h.snapshotFor('host').status,'connectionLost');assert.equal(h.inspectCanonical().winner,null);assert.deepEqual(h.inspectCanonical(),before);assert.equal(h.waitLonger('guest').code,'HOST_ONLY');deliver(h.waitLonger('host'));assert.equal(h.snapshotFor('host').status,'reconnecting');deliver(h.reconnect('guest',h.getReconnectCredential('guest').token));assert.equal(h.snapshotFor('host').status,'active');
});
test('concession ends the same canonical match without altering terrain or paying currency',()=>{
  const {h,clients,deliver}=fixture(),before=h.inspectCanonical();deliver(h.concede('guest'));const result=clients.host.getSnapshot();assert.equal(result.state.winner,0);assert.equal(result.result.reason,'concede');assert.deepEqual(result.state.territories,before.territories);assert.equal(result.result.creditsEarned,0);assert.equal(result.result.supplyEarned,0);assert.equal(result.progression.id,result.matchId);assert.equal(h.concede('guest').code,'MATCH_NOT_ACTIVE');assert.equal(h.inspectCanonical().winner,0);
});
test('host and guest opening snapshots contain only recipient hand and no active canonical seed',()=>{
  const {h,clients}=fixture();for(const id of ['host','guest']){const snapshot=clients[id].getSnapshot(),canonical=h.inspectCanonical(),other=1-snapshot.localSeat;assert.deepEqual(snapshot.state.players[other].hand,[]);assert.deepEqual(snapshot.state.players[snapshot.localSeat].hand,canonical.players[snapshot.localSeat].hand);assert.equal(Object.hasOwn(snapshot.state,'seed'),false);assert.equal(Object.hasOwn(snapshot.state,'rngState'),false);assert.equal(snapshot.result,null);assert.equal(snapshot.progression,null);assert.deepEqual(snapshot.state.players[other].deck,Array(canonical.players[other].deck.length).fill(null));}
});
for(const commander of E.commanders.list())test('networked '+commander.name+' signature has canonical cost, once-per-match state and reconnect persistence',()=>{
  const other=commander.faction==='bruiser'?'stonewall':'bruiser',decks=[{...L.starters().find(deck=>deck.faction===commander.faction),commanderId:commander.id},L.starters().find(deck=>deck.faction===other)],initial=E.createGame({seed:13,factions:[commander.faction,other],decks,config:{startingCommand:100,commandCap:120}});
  const own=Object.values(R.data.CARDS).find(card=>card.faction===commander.faction&&card.type==='unit'&&card.health>=4),enemy=Object.values(R.data.CARDS).find(card=>card.faction===other&&card.type==='unit'&&card.health>=4);
  initial.units.push({uid:'fixtureOwn',cardId:own.id,owner:0,territory:3,damage:1,ready:false,deployedTurn:0,movedTurn:-1},{uid:'fixtureEnemy',cardId:enemy.id,owner:1,territory:3,damage:1,ready:true,deployedTurn:0,movedTurn:-1});initial.players[0].discard.push(own.id);initial.players[0].spent=3;
  const {h,clients,act,deliver}=fixture({state:initial}),action=clients.host.getSnapshot().legalActions.find(action=>action.type==='commander');assert.ok(action,commander.id);const resolved=act(action);assert.equal(resolved.expected.events.filter(event=>event.type==='commanderActivated').length,1);assert.equal(clients.host.getSnapshot().state.players[0].commander.used,true);assert.equal(clients.guest.getSnapshot().state.players[0].commander.used,true);assert.equal(clients.host.getSnapshot().legalActions.some(action=>action.type==='commander'),false);
  deliver(h.disconnect('guest'));deliver(h.reconnect('guest',clients.guest.getReconnectCredential().token));assert.equal(clients.guest.getSnapshot().state.players[0].commander.used,true);deliver(h.concede('guest'));assert.equal(clients.host.getSnapshot().progression.commanderActiveUsed,true);
});
for(let index=0;index<6;index++)test('networked tactical exercise '+(index+1)+' preserves canonical statuses, resource spending, events and response actors',()=>{
  const runner=Training.createRunner(index,{data:R.data,engine:E}),initial=runner.snapshot().state;for(let step=0;step<8&&!runner.snapshot().complete;step++)runner.next(true);const finished=runner.snapshot();assert.equal(finished.complete,true);
  const {h,clients,act}=fixture({state:initial});for(const step of finished.history){const resolved=act(step.action);assert.deepEqual(resolved.expected.events,step.events);assert.deepEqual(h.inspectCanonical(),step.after||resolved.expected.state);assert.equal(clients.host.getSnapshot().state.effects.length,h.inspectCanonical().effects.length);}assert.deepEqual(h.inspectCanonical(),finished.state);
});
test('enemy casualty Scavenge draws only once and the guest recovery identity stays private from host UI',()=>{
  const initial=E.createGame({seed:13,factions:['bruiser','rogue'],config:{startingCommand:100,commandCap:120,captureThreshold:1000,drawCount:0}});initial.players[0].hand.push({uid:'fixtureBombard',cardId:'bruiser_bombard'});initial.units.push({uid:'fixtureCasualty',cardId:'rogue_skirmisher',owner:1,territory:3,damage:R.data.CARDS.rogue_skirmisher.health-1,ready:true,deployedTurn:0,movedTurn:-1},{uid:'fixtureSalvager',cardId:'rogue_salvage',owner:1,territory:3,damage:0,ready:true,deployedTurn:0,movedTurn:-1});
  const {h,clients,act}=fixture({state:initial}),before=initial.players[1].hand.length;act({type:'order',handUid:'fixtureBombard',targetUid:'fixtureCasualty'});assert.equal(h.inspectCanonical().players[1].hand.length,before+1);const hostDraw=clients.host.getSnapshot().events.find(event=>event.type==='draw'&&event.player===1),guestDraw=clients.guest.getSnapshot().events.find(event=>event.type==='draw'&&event.player===1);assert.ok(hostDraw);assert.equal(hostDraw.cardId,undefined);assert.equal(hostDraw.uid,undefined);assert.ok(guestDraw.cardId);assert.equal(clients.host.getSnapshot().state.players[1].hand.length,0);assert.equal(clients.host.getSnapshot().state.players[1].scavengedTurn,h.inspectCanonical().turn);
});
test('networked Reclaim and redeploy preserve wounds, release real commitment and keep returned hand private',()=>{
  const initial=E.createGame({seed:13,factions:['rogue','bruiser'],config:{startingCommand:100,commandCap:120}});initial.players[0].hand.push({uid:'fixtureReclaim',cardId:'rogue_reclaim'});initial.units.push({uid:'fixtureWounded',cardId:'rogue_outrider',owner:0,territory:3,damage:2,ready:true,deployedTurn:0,movedTurn:-1});
  const {h,clients,act}=fixture({state:initial});act({type:'order',handUid:'fixtureReclaim',targetUid:'fixtureWounded'});assert.equal(h.inspectCanonical().units.length,0);assert.equal(clients.host.getSnapshot().state.players[0].hand.find(card=>card.uid==='fixtureWounded').damage,2);assert.equal(clients.guest.getSnapshot().state.players[0].hand.length,0);assert.equal(E.presence(h.inspectCanonical(),0).committed,0);act({type:'deploy',handUid:'fixtureWounded',territory:2});assert.equal(h.inspectCanonical().units[0].damage,2);assert.equal(E.presence(h.inspectCanonical(),0).committed,R.data.CARDS.rogue_outrider.presence);
});
test('networked capture resolves forced retreat before broadcasting one contiguous frontline',()=>{
  const initial=E.createGame({seed:13,factions:['bruiser','rogue'],config:{startingCommand:100,commandCap:120,captureThreshold:1}});initial.units.push({uid:'fixturePush',cardId:'bruiser_heavy',owner:0,territory:3,damage:0,ready:true,deployedTurn:0,movedTurn:-1},{uid:'fixtureRetreat',cardId:'rogue_outrider',owner:1,territory:3,damage:1,ready:true,deployedTurn:0,movedTurn:-1});
  const {h,clients,act}=fixture({state:initial}),resolved=act({type:'endTurn'});assert.ok(resolved.expected.events.some(event=>event.type==='forcedRetreat'));assert.ok(resolved.expected.events.some(event=>event.type==='capture'));assert.equal(h.inspectCanonical().contested,4);assert.equal(h.inspectCanonical().units.find(unit=>unit.uid==='fixtureRetreat').territory,4);assert.equal(clients.guest.getSnapshot().state.contested,4);assert.equal(E.assertInvariants(h.inspectCanonical()),true);
});
test('networked deployed trap reacts to voluntary entry then consumes itself with explicit cause',()=>{
  const initial=E.createGame({seed:13,factions:['rogue','stonewall'],config:{startingCommand:100,commandCap:120,captureThreshold:1000,drawCount:0}});initial.territories[3].owner=0;initial.players[0].hand.push({uid:'fixtureMine',cardId:'rogue_improvised_mine'});initial.units.push({uid:'fixtureEntrant',cardId:'stonewall_rifles',owner:1,territory:4,damage:0,ready:true,deployedTurn:0,movedTurn:-1});
  const {h,clients,act}=fixture({state:initial});act({type:'deploy',handUid:'fixtureMine',territory:3});assert.ok(clients.guest.getSnapshot().state.effects.some(effect=>effect.kind==='overwatch'&&effect.targetUid==='fixtureMine'));act({type:'endTurn'});const resolved=act({type:'move',unitUid:'fixtureEntrant',territory:3});assert.ok(resolved.expected.events.some(event=>event.type==='overwatchTriggered'));assert.ok(resolved.expected.events.some(event=>event.type==='death'&&event.cause==='rulesResolution'));assert.equal(h.inspectCanonical().units.some(unit=>unit.uid==='fixtureMine'),false);assert.equal(clients.host.getSnapshot().state.effects.some(effect=>effect.targetUid==='fixtureMine'),false);
});
test('small checkpoints expose only recipient hashes and leave synchronized clients unchanged',()=>{
  const {h,clients}=fixture(),before=h.inspectCanonical(),messages=h.checkpointMessages();assert.equal(messages.length,2);
  for(const {toId,message}of messages){
    assert.deepEqual(Object.keys(message).sort(),['matchId','messageType','payload','protocolVersion','rulesetHash','senderId','sequence','sessionId','stateHash']);assert.deepEqual(Object.keys(message.payload),['sharedHash']);assert.equal(message.messageType,'checkpoint');assert.equal(message.matchId,clients[toId].getSnapshot().matchId);assert.equal(message.sequence,0);assert.equal(message.stateHash,clients[toId].getSnapshot().stateHash);assert.equal(message.payload.sharedHash,clients[toId].getSnapshot().sharedHash);
    const wire=JSON.stringify(message);for(const field of ['"state"','"hand"','"cards"','"deck"','"events"','"legalActions"','"seed"','"rngState"','reconnectToken'])assert.equal(wire.includes(field),false,field);assert.ok(Buffer.byteLength(wire)<700);
    const saved=clients[toId].getSnapshot(),result=clients[toId].accept(message);assert.deepEqual(result,{ok:true,type:'checkpoint',noop:true});assert.deepEqual(clients[toId].getSnapshot(),saved);assert.equal(clients[toId].needsResync(),false);
  }
  assert.notEqual(messages[0].message.stateHash,messages[1].message.stateHash);assert.deepEqual(h.inspectCanonical(),before);
  h.disconnect('guest');assert.deepEqual(h.checkpointMessages().map(row=>row.toId),['host']);h.close('host');assert.deepEqual(h.checkpointMessages(),[]);
});

test('a checkpoint recovers a dropped final state that transferred initiative without replaying an action',()=>{
  const {h,clients,deliver}=fixture(),opening=clients.guest.getSnapshot();assert.equal(opening.legalActions.length,0);
  const intent=clients.host.makeIntent({type:'endTurn'}),step=h.handle('host',intent);assert.equal(step.ok,true);for(const item of step.outbox)if(item.toId==='host')clients.host.accept(item.message);
  assert.equal(clients.guest.getSequence(),0);assert.equal(clients.guest.getSnapshot().legalActions.length,0);assert.equal(E.getActor(h.inspectCanonical()),1);const authoritative=copy(h.inspectCanonical());
  const checkpoint=h.checkpointMessages().find(row=>row.toId==='guest').message,recovery=clients.guest.accept(checkpoint);assert.equal(recovery.code,'SEQUENCE_GAP');assert.equal(recovery.resync,true);assert.equal(recovery.type,'checkpoint');assert.equal(clients.guest.needsResync(),true);assert.equal(clients.guest.getStatus(),'synchronizing');assert.deepEqual(clients.guest.getSnapshot(),opening);assert.throws(()=>clients.guest.makeIntent({type:'endTurn'}));
  const resync=h.handle('guest',clients.guest.requestResync());assert.equal(resync.ok,true);assert.equal(resync.outbox.length,1);assert.equal(resync.outbox[0].message.messageType,'snapshot');assert.deepEqual(resync.outbox[0].message.payload.events,[]);deliver(resync);assert.equal(clients.guest.getSequence(),1);assert.equal(clients.guest.needsResync(),false);assert.ok(clients.guest.getSnapshot().legalActions.length);assert.deepEqual(h.inspectCanonical(),authoritative);assert.equal(h.submitIntent('host',intent).duplicate,true);assert.deepEqual(h.inspectCanonical(),authoritative);
  assert.equal(clients.guest.accept(checkpoint).noop,true);const next=clients.guest.makeIntent({type:'endTurn'});deliver(h.handle('guest',next));assert.equal(clients.host.getSequence(),2);assert.equal(clients.guest.getSequence(),2);
});

test('checkpoint mismatched scoped/public hashes lock intentions until authority resync',()=>{
  for(const field of ['stateHash','sharedHash']){
    const {h,clients}=fixture(),checkpoint=copy(h.checkpointMessages().find(row=>row.toId==='host').message),saved=clients.host.getSnapshot();if(field==='sharedHash')checkpoint.payload.sharedHash='0'.repeat(64);else checkpoint.stateHash='0'.repeat(64);
    const result=clients.host.accept(checkpoint);assert.equal(result.code,'STATE_MISMATCH');assert.equal(result.resync,true);assert.equal(clients.host.needsResync(),true);assert.throws(()=>clients.host.makeIntent({type:'endTurn'}));assert.deepEqual(clients.host.getSnapshot(),saved);assert.equal(clients.host.accept(h.snapshotMessage('host')).ok,true);assert.equal(clients.host.needsResync(),false);
  }
});

test('checkpoint ignores old sequence or retired match and rejects malformed or forged frames',()=>{
  const {h,clients,act,deliver}=fixture(),old=copy(h.checkpointMessages().find(row=>row.toId==='host').message);act({type:'endTurn'});const saved=clients.host.getSnapshot();assert.deepEqual(clients.host.accept(old),{ok:true,type:'checkpoint',noop:true,stale:true});assert.deepEqual(clients.host.getSnapshot(),saved);assert.equal(clients.host.needsResync(),false);
  const current=h.checkpointMessages().find(row=>row.toId==='host').message;for(const changed of [{...current,senderId:'guest'},{...current,sessionId:'other_room'}])assert.equal(clients.host.accept(changed).code,'INVALID_SENDER');
  for(const changed of [{...current,sequence:-1},{...current,stateHash:'bad'},{...current,payload:{sharedHash:current.payload.sharedHash,state:{}}},{...current,payload:{sharedHash:'bad'}}])assert.equal(clients.host.accept(changed).code,'MALFORMED_MESSAGE');assert.equal(clients.host.needsResync(),false);
  deliver(h.concede('guest'));deliver(h.rematch('host'));assert.deepEqual(clients.host.accept(old),{ok:true,type:'checkpoint',noop:true,stale:true});assert.equal(clients.host.getSnapshot(),null);assert.equal(clients.host.needsResync(),false);assert.deepEqual(h.checkpointMessages(),[]);
});

test('checkpoint detects a wholly missed opening and never installs a different match directly',()=>{
  const {h,clients,deliver}=fixture({start:false});assert.deepEqual(h.checkpointMessages(),[]);const started=h.start('host',{seed:2});for(const item of started.outbox)if(item.toId==='host')clients.host.accept(item.message);
  const checkpoint=h.checkpointMessages().find(row=>row.toId==='guest').message,result=clients.guest.accept(checkpoint);assert.equal(result.code,'MATCH_MISMATCH');assert.equal(result.resync,true);assert.equal(clients.guest.getSnapshot(),null);deliver(h.handle('guest',clients.guest.requestResync()));assert.equal(clients.guest.getSnapshot().matchId,checkpoint.matchId);assert.deepEqual(clients.guest.getSnapshot().events,[]);assert.equal(clients.guest.needsResync(),false);
  const wrong={...checkpoint,matchId:'unseen_match'};assert.equal(clients.guest.accept(wrong).code,'MATCH_MISMATCH');assert.equal(clients.guest.needsResync(),true);assert.equal(clients.guest.getSnapshot().matchId,checkpoint.matchId);
});

test('one deterministic two-client match reaches territorial victory and safe results/rematch',()=>{
  const decks=[L.getDecks().find(deck=>deck.id==='nightwalker-planned-exposure'),L.getDecks().find(deck=>deck.id==='rogue-field-improvisation')];assert.ok(decks.every(Boolean));
  const {h,clients,act,deliver}=fixture({decks,seed:1313});let decisions=0;const types=new Set();
  while(h.inspectCanonical().winner===null&&decisions<1800){const state=h.inspectCanonical(),actor=E.getActor(state),id=h.snapshotFor('host').localSeat===actor?'host':'guest',legal=clients[id].getSnapshot().legalActions;const active=legal.find(action=>action.type==='commander'),action=active||R.ai.chooseAction(state,{profile:'deck',difficulty:'normal',legalActions:legal});assert.ok(action);types.add(action.type);act(action);decisions++;}
  const result=h.inspectCanonical();assert.notEqual(result.winner,null);assert.ok(types.has('deploy'));assert.ok(types.has('move'));assert.ok(types.has('attack'));assert.ok(types.has('commander'));
  assert.equal(clients.host.getSnapshot().result.winner,clients.guest.getSnapshot().result.winner);assert.equal(clients.host.getSnapshot().status,'results');assert.equal(clients.guest.getSnapshot().status,'results');assert.equal(clients.host.getSnapshot().result.seed,1313);
  for(const id of ['host','guest']){const snapshot=clients[id].getSnapshot(),own=Object.keys(snapshot.result.cardStats);assert.deepEqual(own.sort(),snapshot.result.usedCards.slice().sort());assert.ok(own.every(cardId=>R.data.CARDS[cardId].faction===snapshot.state.players[snapshot.localSeat].faction));assert.equal(snapshot.result.creditsEarned,0);}
  deliver(h.rematch('guest'));assert.equal(h.lobby().status,'lobby');assert.equal(clients.host.getSnapshot(),null);assert.equal(clients.guest.getSnapshot(),null);
});
