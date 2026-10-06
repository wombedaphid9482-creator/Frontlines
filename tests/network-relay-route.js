'use strict';
// Correctness test against Wrangler's local Worker runtime or an explicitly selected public endpoint.
// No matches or balance simulations run here. Session capabilities are never exported.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),T=require('../network-transport');
const evidencePrefix=process.env.FRONTLINES_EVIDENCE_PREFIX||'sprint13';
const endpoint=process.env.FRONTLINES_RELAY_TEST_URL||'http://127.0.0.1:8787',local=/^http:\/\/(127\.0\.0\.1|localhost):/.test(endpoint);
const wait=(fn,ms=15000)=>new Promise((resolve,reject)=>{const start=Date.now(),timer=setInterval(()=>{if(fn()){clearInterval(timer);resolve();}else if(Date.now()-start>ms){clearInterval(timer);reject(Error('Relay test timeout'));}},20);});
async function main(){
  const report={date:new Date().toISOString(),route:'HTTPS/WSS relay',environment:local?'local Cloudflare Worker emulator':'explicit production endpoint',serviceOrigin:new URL(endpoint).origin,publicInternetVerified:!local,homeNetworkVerified:false,checks:[]};
  const health=await fetch(endpoint+'/health').then(r=>r.json());assert.equal(health.ok,true);assert.equal(health.serviceVersion,1);report.checks.push('service health');
  const host=T.createRelayTransport({serviceURL:endpoint,allowLocalhost:local}),guest=T.createRelayTransport({serviceURL:endpoint,allowLocalhost:local}),hMessages=[],gMessages=[];
  host.onMessage(m=>hMessages.push(m));guest.onMessage(m=>gMessages.push(m));
  try{
    const h=await host.hostSession(),g=await guest.joinSession(h.inviteCode.toLowerCase().replace('-',' '));await wait(()=>host.getConnectionState().peerConnected&&guest.getConnectionState().peerConnected);
    assert.equal(h.sessionId,g.sessionId);assert.equal(h.role,'host');assert.equal(g.role,'guest');assert.notEqual(h.senderId,g.senderId);report.checks.push('short invite creation and normalized guest join','authenticated stable host/guest identities','both sockets connected');
    host.send({protocolVersion:1,messageType:'fixture',senderId:h.senderId,payload:{sequence:1}});await wait(()=>gMessages.length===1);assert.equal(gMessages[0].senderId,h.senderId);assert.equal(gMessages[0].message.payload.sequence,1);
    guest.send({protocolVersion:1,messageType:'fixture',senderId:'untrusted-spoof',payload:{sequence:2}});await wait(()=>hMessages.length===1);assert.equal(hMessages[0].senderId,g.senderId);assert.equal(hMessages[0].message.senderId,'untrusted-spoof');report.checks.push('bidirectional ordered frames','relay binds trusted sender independently of untrusted envelope');
    const beforeGuestId=g.senderId,beforeSession=g.sessionId;let disconnected=false;guest.onDisconnected(()=>{disconnected=true;});guest.interruptForTest();await wait(()=>disconnected&&!host.getConnectionState().peerConnected);await wait(()=>guest.getConnectionState().status==='connected'&&host.getConnectionState().peerConnected);
    assert.equal(guest.getConnectionState().senderId,beforeGuestId);assert.equal(guest.getConnectionState().sessionId,beforeSession);assert.equal(guest.diagnostics().reconnections,1);guest.send({protocolVersion:1,messageType:'fixture',payload:{sequence:3}});await wait(()=>hMessages.length===2);assert.equal(hMessages[1].message.payload.sequence,3);report.checks.push('temporary guest socket interruption pauses peer connection state','automatic ticketed guest reconnect preserves identity/session','post-reconnect traffic');
    let hostDisconnected=false;host.onDisconnected(()=>{hostDisconnected=true;});host.interruptForTest();await wait(()=>hostDisconnected&&!guest.getConnectionState().peerConnected);await wait(()=>host.getConnectionState().status==='connected'&&guest.getConnectionState().peerConnected);
    assert.equal(host.getConnectionState().senderId,h.senderId);assert.equal(host.getConnectionState().sessionId,h.sessionId);assert.equal(host.diagnostics().reconnections,1);host.send({protocolVersion:1,messageType:'fixture',payload:{sequence:4}});await wait(()=>gMessages.length===2);assert.equal(gMessages[1].message.payload.sequence,4);report.checks.push('temporary host socket interruption and automatic authenticated recovery');
    for(const view of [host.getConnectionState(),guest.getConnectionState(),host.diagnostics(),guest.diagnostics()])assert.ok(!JSON.stringify(view).match(/reconnectToken|ticket\./));report.checks.push('transport state and diagnostics contain no capabilities');
    const invalid=await fetch(endpoint+'/v1/rooms/22222222/join',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(async r=>({status:r.status,...await r.json()}));assert.equal(invalid.status,404);assert.equal(invalid.error,'MATCH_NOT_FOUND');report.checks.push('invalid invite friendly service error');
    await host.closeSession();await wait(()=>guest.getConnectionState().status==='closed');report.checks.push('host session closure reaches guest');
    report.completed=true;const out=path.resolve(__dirname,'../test-results/'+(local?evidencePrefix+'-relay-route.json':evidencePrefix+'-relay-public-route.json'));fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  }finally{host.disconnect();guest.disconnect();}
}
main().catch(e=>{console.error('RELAY_ROUTE_TEST_FAILED',e.code||e.message);process.exitCode=1;});
