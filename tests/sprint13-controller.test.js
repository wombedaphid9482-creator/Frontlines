'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),C=require('../multiplayer-controller'),T=require('../network-transport'),B=require('../balance'),Decks=require('../decks');
const runtime=B.createRuntime(B.DEFAULT_PROFILE),presets=Decks.forData(runtime.data).getDecks();
async function fixture(t){
  const hub=T.createLoopbackHub({autoFlush:false}),host=C.createController({transportFactory:hub.createTransport,allowTestFaults:true,hostOptions:{seedFactory:()=>7317}}),guest=C.createController({transportFactory:hub.createTransport,allowTestFaults:true,intentTimeoutMs:100});
  t.after(async()=>{await guest.dispose();await host.dispose();});
  const settle=async()=>{for(let i=0;i<5;i++){hub.flush();await Promise.resolve();}};
  assert.equal((await host.command('host',{name:'Ryken'})).ok,true);assert.equal((await guest.command('join',{code:host.getState().code,name:'Wyatt'})).ok,true);await settle();
  assert.equal(host.getState().lobby.players.length,2);assert.equal(guest.getState().lobby.players.length,2);
  for(const [controller,faction]of [[host,'nightwalker'],[guest,'rogue']]){const deck=presets.find(d=>d.faction===faction&&d.set==='tactical-011')||presets.find(d=>d.faction===faction);assert.equal((await controller.command('select',{deck,faction,commanderId:deck.commanderId})).ok,true);await settle();assert.equal((await controller.command('ready',{ready:true})).ok,true);await settle();}
  assert.equal(host.getState().lobby.canStart,true);assert.equal((await host.command('start')).ok,true);await settle();
  assert.equal(host.getState().snapshot.status,'active');assert.equal(guest.getState().snapshot.status,'active');
  return {hub,host,guest,settle};
}
test('desktop controllers drive the same authoritative full match through scoped clients and rematch',async t=>{
  const {host,guest,settle}=await fixture(t);let actions=0;
  while(host.getState().phase!=='results'&&actions<1800){
    const models=[host.getState(),guest.getState()],index=models.findIndex(m=>m.snapshot.legalActions.length),controller=[host,guest][index];assert.ok(controller);
    const snap=models[index].snapshot;let action;
    try{action=runtime.ai.chooseAction(snap.state);}catch{/* The test's fallback still uses only host-issued legal actions. */}
    if(!action||!snap.legalActions.some(a=>JSON.stringify(a)===JSON.stringify(action)))action=snap.legalActions.find(a=>a.type==='deploy')||snap.legalActions.find(a=>a.type==='attack')||snap.legalActions.find(a=>a.type==='endTurn')||snap.legalActions[0];
    const result=await controller.command('intent',{action});assert.equal(result.ok,true,JSON.stringify(result));await settle();actions++;
    const a=host.getState().snapshot,b=guest.getState().snapshot;assert.equal(a.sharedHash,b.sharedHash);assert.equal(a.sequence,b.sequence);
    assert.equal(a.state.players[1-a.localSeat].hand.length,0);assert.equal(b.state.players[1-b.localSeat].hand.length,0);assert.ok(a.state.players.every(p=>p.deck.every(c=>c===null)));
  }
  assert.equal(host.getState().phase,'results');assert.equal(guest.getState().phase,'results');assert.ok(actions>10);assert.equal(host.isActive(),false);assert.equal(guest.isActive(),false);
  const previousSeat=host.getState().localSeat;assert.equal((await guest.command('rematch')).ok,true);await settle();assert.equal(host.getState().phase,'lobby');
  for(const controller of [host,guest]){assert.equal((await controller.command('ready',{ready:true})).ok,true);await settle();}assert.equal((await host.command('start')).ok,true);await settle();assert.equal(host.getState().localSeat,1-previousSeat);
});
test('desktop boundary rejects arbitrary requests, keeps credentials and opponent secrets out of exports',async t=>{
  const {host,guest,settle}=await fixture(t);
  await guest.command('start');await settle();assert.equal(guest.getState().error.code,'HOST_ONLY');assert.equal((await guest.command('intent',{action:{type:'setState',winner:1}})).ok,false);
  assert.equal((await host.command('execute',{script:'bad'})).ok,false);assert.equal((await host.command('ready','invalid')).ok,false);
  const text=JSON.stringify(host.diagnostics());assert.doesNotMatch(text,/reconnectToken|ticket\.|127\.0\.0\.1|nightwalker-starter|rogue-starter/);assert.ok(host.getState().code);assert.ok(!text.includes(host.getState().code));
  assert.equal((await guest.command('concede')).ok,true);await settle();assert.equal(host.getState().phase,'results');assert.equal(guest.getState().result.reason,'concede');assert.equal(guest.getState().snapshot.progression.conceded,true);
});
test('offline desktop can report service setup state without any networking or save changes',async()=>{
  const controller=C.createController();assert.equal(controller.getState().available,false);assert.equal((await controller.command('host',{name:'Ryken'})).code,'SERVICE_UNCONFIGURED');assert.equal((await controller.command('leave')).ok,true);assert.equal(controller.getState().phase,'menu');
});
test('a dropped intention times out into authoritative resync without replaying or locking controls',async t=>{
  const {hub,host,guest,settle}=await fixture(t),initial=guest.getState().snapshot.sequence;
  const action=guest.getState().snapshot.legalActions.find(a=>a.type==='deploy');assert.ok(action);hub.setFaults({drop:1});
  await guest.command('intent',{action});await settle();assert.equal(guest.getState().snapshot.pending,true);assert.equal(host.getState().snapshot.sequence,initial);
  await new Promise(resolve=>setTimeout(resolve,140));await settle();assert.equal(guest.getState().snapshot.pending,false);assert.equal(guest.getState().snapshot.status,'active');assert.equal(host.getState().snapshot.sequence,initial);assert.equal(guest.diagnostics().counters.resyncs,1);
  assert.equal((await guest.command('intent',{action})).ok,true);await settle();assert.equal(host.getState().snapshot.sequence,initial+1);assert.equal(guest.getState().snapshot.sequence,initial+1);
});
test('incompatible initial guest is notified and releases its seat for a valid join',async t=>{
  const hub=T.createLoopbackHub({autoFlush:false}),host=C.createController({transportFactory:hub.createTransport}),bad=C.createController({transportFactory:hub.createTransport,appVersion:'0.0.0'}),good=C.createController({transportFactory:hub.createTransport});
  t.after(async()=>{await bad.dispose();await good.dispose();await host.dispose();});const settle=async()=>{for(let i=0;i<8;i++){hub.flush();await Promise.resolve();}};
  await host.command('host',{name:'Host'});const code=host.getState().code;await bad.command('join',{code,name:'Outdated'});await settle();assert.equal(bad.getState().phase,'menu');assert.equal(bad.getState().error.code,'VERSION_MISMATCH');
  assert.equal((await good.command('join',{code,name:'Current'})).ok,true);await settle();assert.equal(host.getState().lobby.players.length,2);assert.equal(good.getState().lobby.players[1].name,'Current');
});
test('explicit guest leave locks unfinished play and closes the canonical session without a reward or invented winner',async t=>{
  const {host,guest,settle}=await fixture(t);const before=host.getState().snapshot.state.winner;await guest.command('leave');await settle();
  const h=host.getState();assert.equal(before,null);assert.ok(h.phase==='closed'||h.snapshot?.status==='reconnecting');assert.ok(!h.snapshot||h.snapshot.state.winner===null);assert.equal(h.snapshot?.progression??null,null);
});
