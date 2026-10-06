'use strict';
// One complete two-client network correctness match, not a balance campaign.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../multiplayer-controller'),B=require('../balance'),Decks=require('../decks');
const endpoint=process.env.FRONTLINES_RELAY_TEST_URL||'http://127.0.0.1:8787',local=/^http:\/\/(127\.0\.0\.1|localhost):/.test(endpoint);
const runtime=B.createRuntime(B.DEFAULT_PROFILE),presets=Decks.forData(runtime.data).getDecks();
const wait=(fn,label,ms=18000)=>new Promise((resolve,reject)=>{const start=Date.now(),timer=setInterval(()=>{try{if(fn()){clearInterval(timer);resolve();}else if(Date.now()-start>ms){clearInterval(timer);reject(Error('Timed out: '+label));}}catch(e){clearInterval(timer);reject(e);}},8);});
const aligned=(a,b)=>a.snapshot&&b.snapshot&&a.snapshot.sequence===b.snapshot.sequence&&a.snapshot.sharedHash===b.snapshot.sharedHash;
async function main(){
  const opts={serviceURL:endpoint,allowLocalhost:local,allowTestFaults:true},host=C.createController({...opts,hostOptions:{seedFactory:()=>7317}}),guest=C.createController(opts);
  const report={date:new Date().toISOString(),environment:local?'local Cloudflare Worker emulator':'explicit public endpoint',route:'production HTTPS/WSS relay implementation',serviceOrigin:new URL(endpoint).origin,publicInternetVerified:!local,homeNetworkVerified:false,simulation:false,checks:[],actions:0,commanders:new Set(),events:new Set()};
  async function recover(controller,which){
    const before=host.getState().snapshot;controller.interruptForTest();await wait(()=>host.getState().snapshot.status==='reconnecting'&&(!host.getState().connection.peerConnected||host.getState().connection.state==='reconnecting'),which+' paused');
    assert.equal((await host.command('intent',{action:{type:'endTurn'}})).ok,false);
    await wait(()=>[host.getState(),guest.getState()].every(m=>m.connection.state==='connected'&&m.connection.peerConnected&&m.snapshot.status==='active')&&aligned(host.getState(),guest.getState()),which+' recovered');
    assert.equal(host.getState().snapshot.sequence,before.sequence);assert.equal(host.getState().snapshot.sharedHash,before.sharedHash);report.checks.push(which+' socket disconnect pauses gameplay and automatically resyncs the same match');
  }
  async function act(){
    const models=[host.getState(),guest.getState()],index=models.findIndex(m=>m.snapshot?.legalActions.length),controller=[host,guest][index];assert.ok(controller,'No legal active player');const snap=models[index].snapshot;let action;
    action=snap.legalActions.find(a=>a.type==='commander'&&!report.commanders.has(snap.localSeat));
    if(!action)try{action=runtime.ai.chooseAction(snap.state);}catch{}
    if(!action||!snap.legalActions.some(a=>JSON.stringify(a)===JSON.stringify(action)))action=snap.legalActions.find(a=>a.type==='deploy')||snap.legalActions.find(a=>a.type==='attack')||snap.legalActions.find(a=>a.type==='endTurn')||snap.legalActions[0];
    const before=snap.sequence,result=await controller.command('intent',{action});assert.equal(result.ok,true,result.message||'Intent rejected');await wait(()=>host.getState().snapshot.sequence===before+1&&aligned(host.getState(),guest.getState()),'canonical action '+before);
    report.actions++;if(action.type==='commander')report.commanders.add(snap.localSeat);for(const e of host.getState().snapshot.events||[])report.events.add(e.status||e.type);
    const [a,b]=[host.getState().snapshot,guest.getState().snapshot];assert.equal(a.state.players[1-a.localSeat].hand.length,0);assert.equal(b.state.players[1-b.localSeat].hand.length,0);assert.ok(a.state.players.every(p=>p.deck.every(c=>c===null)));assert.ok(b.state.players.every(p=>p.deck.every(c=>c===null)));assert.equal(a.state.winner,b.state.winner);
  }
  try{
    assert.equal((await host.command('host',{name:'Ryken'})).ok,true);assert.equal((await guest.command('join',{code:host.getState().code,name:'Wyatt'})).ok,true);await wait(()=>host.getState().lobby.players.length===2&&guest.getState().lobby.players.length===2,'shared lobby');report.checks.push('host/invite/join in the real relay stack','display names and shared lobby');
    for(const [controller,faction]of [[host,'nightwalker'],[guest,'rogue']]){
      const deck=presets.find(d=>d.faction===faction&&d.set==='tactical-011')||presets.find(d=>d.faction===faction);assert.equal((await controller.command('select',{deck,faction,commanderId:deck.commanderId})).ok,true);await wait(()=>[host.getState(),guest.getState()].every(m=>m.lobby.players.some(p=>p.faction===faction&&p.legal)),'legal '+faction+' selection');
      assert.equal((await controller.command('ready',{ready:true})).ok,true);await wait(()=>[host.getState(),guest.getState()].every(m=>m.lobby.players.some(p=>p.faction===faction&&p.ready)),'ready '+faction);
    }
    assert.equal(host.getState().lobby.canStart,true);assert.equal((await host.command('start')).ok,true);await wait(()=>host.getState().snapshot?.status==='active'&&guest.getState().snapshot?.status==='active'&&aligned(host.getState(),guest.getState()),'opening acknowledgement');
    const matchId=host.getState().snapshot.matchId,openingSeat=host.getState().localSeat;report.checks.push('validated faction/deck/Commander choices and readiness','both clients acknowledge the same seeded canonical opening');
    for(let i=0;i<12;i++)await act();await recover(guest,'guest');for(let i=0;i<12;i++)await act();await recover(host,'host');
    while(host.getState().phase!=='results'&&report.actions<1800)await act();assert.equal(host.getState().phase,'results');assert.equal(guest.getState().phase,'results');assert.equal(host.getState().snapshot.matchId,matchId);assert.equal(host.getState().result.reason,'territory');assert.equal(guest.getState().result.reason,'territory');assert.equal(report.commanders.size,2);
    report.result={winner:host.getState().snapshot.state.winner,actionWindows:host.getState().snapshot.state.turn,sequence:host.getState().snapshot.sequence,sharedHash:host.getState().snapshot.sharedHash};report.checks.push('one complete territorial match over actual Worker relay','Commander active used by both clients','same canonical sequence/shared hash after every action','both player-safe views hide opponent hand and all reserve identities','both clients receive matching territorial result');
    assert.equal((await guest.command('rematch')).ok,true);await wait(()=>host.getState().phase==='lobby'&&guest.getState().phase==='lobby','rematch lobby');
    for(const controller of [host,guest]){assert.equal((await controller.command('ready',{ready:true})).ok,true);await wait(()=>[host.getState(),guest.getState()].every(m=>m.lobby.players.filter(p=>p.ready).length>0),'rematch ready');}
    await wait(()=>host.getState().lobby.canStart,'both rematch ready');assert.equal((await host.command('start')).ok,true);await wait(()=>host.getState().snapshot?.status==='active'&&guest.getState().snapshot?.status==='active'&&aligned(host.getState(),guest.getState()),'rematch opening');assert.notEqual(host.getState().snapshot.matchId,matchId);assert.equal(host.getState().localSeat,1-openingSeat);report.checks.push('rematch preserves selections, uses new match ID and alternates initiative');
    assert.equal((await guest.command('concede')).ok,true);await wait(()=>host.getState().phase==='results'&&guest.getState().phase==='results','concession');assert.equal(host.getState().result.reason,'concede');report.checks.push('confirmed protocol concession synchronizes terminal result');
    report.commanders=[...report.commanders];report.events=[...report.events];report.completed=true;fs.writeFileSync(path.resolve(__dirname,'../test-results/'+(local?'sprint13-relay-controller.json':'sprint13-relay-public-controller.json')),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  }finally{await guest.dispose();await host.dispose();}
}
main().catch(e=>{console.error('RELAY_CONTROLLER_TEST_FAILED',e.message,(e.stack||'').split('\n').find(line=>line.includes('sprint13-relay-controller.js'))||'');process.exitCode=1;});
