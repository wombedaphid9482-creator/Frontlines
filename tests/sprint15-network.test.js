'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const B=require('../balance'),P=require('../multiplayer-protocol'),S=require('../multiplayer-session'),Decks=require('../decks');
const R=B.createRuntime('sprint15'),E=R.engine,L=Decks.forData(R.data),copy=P.clone;
function field(s,id,owner=0,territory=3,extra={}){const u={uid:'fixture'+(s.units.length+1),cardId:id,owner,territory,damage:0,ready:true,deployedTurn:0,deployedWindow:0,movedTurn:-1,movedWindow:-1,attackedTurn:-1,attackedWindow:-1,defendedTurn:-1,defendedWindow:-1,abilityTurn:-1,abilityWindow:-1,...extra};s.units.push(u);return u;}
function fixture(initial){
 const runtime=initial?{...R,engine:{...E,createGame:()=>copy(initial)}}:R,h=S.createHost({runtime,appVersion:'1.3.0',sessionId:'paired_fixture',hostId:'host',name:'Ryken'});
 const clients=Object.fromEntries(['host','guest'].map(id=>[id,S.createClient({compatibility:h.compatibility,sessionId:h.sessionId,senderId:id,hostId:'host'})]));
 const deliver=result=>{assert.equal(result.ok,true,result.reason);for(const row of result.outbox||[]){const accepted=clients[row.toId].accept(row.message);assert.equal(accepted.ok,true,JSON.stringify(accepted));}return result;};
 deliver(h.join('guest','Wyatt',h.compatibility));const decks=initial?initial.players.map(p=>({...L.starters().find(d=>d.faction===p.faction),commanderId:p.commander.id})):L.starters().slice(0,2);
 for(const [i,id]of ['host','guest'].entries()){deliver(h.select(id,decks[i]));deliver(h.ready(id,true));}deliver(h.start('host',{seed:2}));for(const id of ['host','guest'])deliver(h.handle(id,clients[id].message('startAck',{})));
 const act=action=>{const before=h.inspectCanonical(),id=h.snapshotFor('host').localSeat===E.getActor(before)?'host':'guest',message=clients[id].makeIntent(action),expected=E.dispatch(before,action,{events:true});deliver(h.handle(id,message));assert.deepEqual(h.inspectCanonical(),expected.state);assert.equal(clients.host.getSnapshot().sharedHash,clients.guest.getSnapshot().sharedHash);return {message,id,expected,before};};
 const reconnect=id=>{const before=h.inspectCanonical(),sequence=clients[id].getSequence(),credential=id==='host'?h.getReconnectCredential(id):clients[id].getReconnectCredential();deliver(h.disconnect(id));deliver(h.reconnect(id,credential.token));assert.deepEqual(h.inspectCanonical(),before);assert.equal(clients[id].getSequence(),sequence);assert.deepEqual(P.timingContext(clients[id].getSnapshot().state),P.timingContext(before));};
 return {h,clients,deliver,act,reconnect};
}
test('paired gameplay negotiates explicit schema/timing while the Cloudflare envelope remains protocol 1',()=>{
 const current=P.createCompatibility(R,{appVersion:'1.3.0'}),old=P.createCompatibility(B.createRuntime('sprint12'),{appVersion:'1.2.0'});
 assert.equal(current.protocolVersion,1);assert.equal(current.turnSystemVersion,2);assert.equal(current.stateSchemaVersion,2);assert.equal(current.timingModel,'paired-turns');
 assert.equal(P.compareCompatibility(current,old).code,'VERSION_MISMATCH');assert.equal(P.compareCompatibility(current,{...old,appVersion:'1.3.0'}).code,'TIMING_MISMATCH');
 const {h}=fixture();const incompatible=h.handle('new_guest',P.packet({sessionId:h.sessionId,senderId:'new_guest'},'hello',{compatibility:{...current,turnSystemVersion:1}}));assert.equal(incompatible.code,'TIMING_MISMATCH');assert.equal(incompatible.outbox.length,1);assert.equal(incompatible.outbox[0].message.payload.code,'TIMING_MISMATCH');assert.equal(incompatible.outbox[0].message.payload.state,undefined);
});
test('both authoritative projections stay Turn 1 across first handover, then advance once after second window',()=>{
 const {h,clients,act,reconnect}=fixture();let s=h.inspectCanonical();assert.deepEqual([s.turn,s.window,s.windowIndex,s.activePlayer,s.phase],[1,0,1,0,'ACTION_WINDOW']);reconnect('guest');
 const first=act({type:'endTurn'});s=h.inspectCanonical();assert.deepEqual([s.turn,s.window,s.windowIndex,s.activePlayer],[1,1,2,1]);assert.equal(first.expected.events.some(e=>e.type==='turnEndBegin'),false);reconnect('guest');
 const preResolution=copy(s),second=act({type:'endTurn'});s=h.inspectCanonical();assert.deepEqual([s.turn,s.window,s.windowIndex,s.activePlayer,s.lastResolvedTurn,s.lastCompletedWindow],[2,0,3,0,1,2]);
 for(const id of ['host','guest'])assert.deepEqual(P.timingContext(clients[id].getSnapshot().state),P.timingContext(s));
 assert.equal(second.expected.events.filter(e=>e.type==='turnEndBegin').length,1);assert.equal(second.expected.events.filter(e=>e.type==='turnEndComplete').length,1);assert.ok(second.expected.events.filter(e=>e.type.startsWith('turnEnd')).every(e=>e.turn===1&&e.window===1&&e.windowIndex===2));
 reconnect('guest');assert.equal(h.submitIntent(second.id,second.message).duplicate,true);assert.deepEqual(h.inspectCanonical(),s);assert.equal(E.dispatch(preResolution,{type:'endTurn'}).state.lastResolvedTurn,1);
 assert.equal(h.submitIntent(first.id,first.message).duplicate,true);assert.deepEqual(h.inspectCanonical(),s);
});
test('a lost Turn-End frame resyncs the post-resolution state without replaying draws, expiry or capture',()=>{
 const {h,clients,act,deliver,reconnect}=fixture();act({type:'endTurn'});const id=h.snapshotFor('host').localSeat===1?'host':'guest',message=clients[id].makeIntent({type:'endTurn'}),result=h.handle(id,message);assert.equal(result.ok,true);
 const authoritative=h.inspectCanonical(),other=id==='host'?'guest':'host';for(const row of result.outbox)if(row.toId===id)assert.equal(clients[id].accept(row.message).ok,true);
 assert.equal(clients[other].getSnapshot().state.turn,1);const checkpoint=h.checkpointMessages().find(r=>r.toId===other).message;assert.equal(clients[other].accept(checkpoint).resync,true);deliver(h.handle(other,clients[other].requestResync()));
 assert.equal(clients[other].getSnapshot().state.turn,2);assert.deepEqual(h.inspectCanonical(),authoritative);assert.equal(h.submitIntent(id,message).duplicate,true);assert.deepEqual(h.inspectCanonical(),authoritative);reconnect(other);
});
test('Response and Counter preserve initiating normal-window context through reconnect',()=>{
 const s=E.createGame({seed:1515,factions:['syndicate','stonewall'],config:{startingCommand:100,commandCap:120,captureThreshold:1000}});s.players[0].hand.push({uid:'counterFixture',cardId:'syndicate_counter'});s.players[1].hand.push({uid:'braceFixture',cardId:'stonewall_brace'});
 const a=field(s,'syndicate_security'),d=field(s,'stonewall_heavy',1,3,{damage:1}),{h,clients,act,reconnect}=fixture(s),clock=P.timingContext(h.inspectCanonical());
 act({type:'attack',unitUid:a.uid,targetUid:d.uid});let current=h.inspectCanonical();assert.equal(current.phase,'RESPONSE');assert.equal(current.activePlayer,0);assert.equal(E.getActor(current),1);assert.deepEqual([current.turn,current.window,current.windowIndex],[1,0,1]);reconnect('guest');
 act({type:'respond',handUid:'braceFixture'});current=h.inspectCanonical();assert.equal(current.phase,'COUNTER');assert.deepEqual([current.turn,current.window,current.windowIndex],[1,0,1]);reconnect('host');assert.equal(clients.guest.getSnapshot().state.response.order.cardId,'stonewall_brace');
 act({type:'counter',handUid:'counterFixture'});assert.deepEqual(P.timingContext(h.inspectCanonical()),clock);assert.equal(h.inspectCanonical().response,null);
});
test('Turn-End capture and forced retreat are broadcast once with true boundary context',()=>{
 const s=E.createGame({seed:1516,factions:['bruiser','rogue'],config:{startingCommand:100,commandCap:120,captureThreshold:1,drawCount:0}}),push=field(s,'bruiser_heavy'),enemy=field(s,'rogue_outrider',1),{h,clients,act,reconnect}=fixture(s);
 const first=act({type:'endTurn'});assert.equal(h.inspectCanonical().contested,3);assert.equal(first.expected.events.some(e=>e.type==='capture'),false);reconnect('guest');const second=act({type:'endTurn'});
 assert.equal(second.expected.events.filter(e=>e.type==='capture').length,1);assert.equal(h.inspectCanonical().contested,4);assert.equal(h.inspectCanonical().units.find(u=>u.uid===enemy.uid).territory,4);
 for(const event of second.expected.events.filter(e=>['pressure','capture','forcedRetreat'].includes(e.type)))assert.deepEqual([event.turn,event.window,event.windowIndex,event.phase],[1,1,2,'TURN_END']);
 for(const id of ['host','guest']){const safe=clients[id].getSnapshot().state;assert.equal(safe.contested,4);assert.equal(safe.units.find(u=>u.uid===push.uid).deployedWindow,0);assert.ok(safe.players.every(p=>p.deck.every(x=>x===null)));assert.equal(safe.players[1-clients[id].getSnapshot().localSeat].hand.length,0);}
 const before=h.inspectCanonical();reconnect('guest');assert.equal(h.submitIntent(second.id,second.message).duplicate,true);assert.deepEqual(h.inspectCanonical(),before);
});
test('invalid or inconsistent timing snapshots cannot be installed even with freshly forged hashes',()=>{
 for(const change of [{turnSystemVersion:1},{phase:'TURN_END'},{window:1},{windowIndex:0},{activePlayer:1},{lastResolvedTurn:99}]){
 const {h,clients}=fixture(),packet=h.snapshotMessage('guest'),saved=clients.guest.getSnapshot();Object.assign(packet.payload.state,change);packet.payload.stateHash=P.hash(packet.payload.state);packet.stateHash=packet.payload.stateHash;packet.payload.sharedHash=P.hash(P.projectState(packet.payload.state,null,{publicLog:packet.payload.state.log}));
 assert.equal(clients.guest.accept(packet).code,'STATE_MISMATCH');assert.deepEqual(clients.guest.getSnapshot(),saved);assert.throws(()=>clients.guest.makeIntent({type:'endTurn'}));}
});
for(const commander of E.commanders.list())test('paired '+commander.name+' active/passive clock survives projection and resync',()=>{
 const other=commander.faction==='bruiser'?'stonewall':'bruiser',decks=[{...L.starters().find(d=>d.faction===commander.faction),commanderId:commander.id},L.starters().find(d=>d.faction===other)],s=E.createGame({seed:15,factions:[commander.faction,other],decks,config:{startingCommand:100,commandCap:120,captureThreshold:1000}}),own=Object.values(R.data.CARDS).find(c=>c.faction===commander.faction&&c.type==='unit'&&c.health>=4),enemy=Object.values(R.data.CARDS).find(c=>c.faction===other&&c.type==='unit'&&c.health>=4);
 field(s,own.id,0,3,{damage:1,ready:false});field(s,enemy.id,1,3,{damage:1});s.players[0].discard.push(own.id);s.players[0].spent=3;
 const {h,clients,act,reconnect}=fixture(s),action=clients.host.getSnapshot().legalActions.find(a=>a.type==='commander');assert.ok(action,commander.id);assert.deepEqual(E.commanderStatus(P.projectState(h.inspectCanonical(),0),0),E.commanderStatus(h.inspectCanonical(),0));act(action);reconnect('guest');
 for(const id of ['host','guest'])assert.equal(clients[id].getSnapshot().state.players[0].commander.used,true);assert.equal(h.inspectCanonical().players[0].commander.passiveWindow,s.players[0].commander.passiveWindow);
 act({type:'endTurn'});act({type:'endTurn'});reconnect('host');assert.equal(h.inspectCanonical().players[0].commander.used,true);assert.equal(clients.host.getSnapshot().legalActions.some(a=>a.type==='commander'),false);
});
test('concession enters MATCH_END and rematch preserves the existing between-match seat swap',()=>{
 const {h,clients,deliver}=fixture(),firstSeat=clients.host.getSnapshot().localSeat;deliver(h.concede('guest'));assert.equal(h.inspectCanonical().phase,'MATCH_END');const result=clients.host.getSnapshot().result;assert.deepEqual([result.turns,result.actionWindows,result.windows,result.timingModel],[1,1,1,'paired-turns']);assert.equal(result.creditsEarned,0);
 deliver(h.rematch('host'));for(const id of ['host','guest'])deliver(h.ready(id,true));deliver(h.start('host',{seed:2}));for(const id of ['host','guest'])deliver(h.handle(id,clients[id].message('startAck',{})));assert.equal(clients.host.getSnapshot().localSeat,1-firstSeat);assert.deepEqual([h.inspectCanonical().turn,h.inspectCanonical().window,h.inspectCanonical().activePlayer],[1,0,0]);
});
