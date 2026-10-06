'use strict';
// Raw provider-boundary tests, separate from gameplay correctness. Never print capabilities.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const endpoint=process.env.FRONTLINES_RELAY_TEST_URL||'http://127.0.0.1:8787',local=/^http:\/\/(127\.0\.0\.1|localhost):/.test(endpoint);
const wait=(fn,ms=6000)=>new Promise((resolve,reject)=>{const start=Date.now(),t=setInterval(()=>{if(fn()){clearInterval(t);resolve();}else if(Date.now()-start>ms){clearInterval(t);reject(Error('Security fixture timeout'));}},15);});
async function post(route,data){const r=await fetch(endpoint+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});return {status:r.status,...await r.json()};}
async function socket(identity){const receipt=await post('/v1/rooms/'+identity.code+'/ticket',identity);assert.equal(receipt.ok,true);const messages=[],ws=new WebSocket(endpoint.replace(/^http/,'ws')+'/v1/rooms/'+identity.code+'/socket',['frontlines-relay-v1','ticket.'+receipt.ticket]);ws.addEventListener('message',e=>messages.push(JSON.parse(e.data)));let failed=false;ws.addEventListener('error',()=>{failed=true;});await wait(()=>messages.some(m=>m.type==='connected')||failed);assert.equal(failed,false);return {ws,messages,ticket:receipt.ticket};}
async function main(){
  const report={date:new Date().toISOString(),environment:local?'local Cloudflare Worker emulator':'explicit public endpoint',publicInternetVerified:!local,homeNetworkVerified:false,checks:[]};
  const host=await post('/v1/rooms',{}),guest=await post('/v1/rooms/'+host.code+'/join',{});assert.equal(host.ok,true);assert.equal(guest.ok,true);let h,g;
  try{
    const base='/v1/rooms/'+host.code;
    assert.equal((await post(base+'/ticket',{...guest,reconnectToken:'not-a-token'})).status,403);assert.equal((await post(base+'/ticket',{...guest,senderId:host.senderId})).status,403);assert.equal((await post(base+'/ticket',{...guest,sessionId:'not-the-session'})).status,403);report.checks.push('wrong capability, sender and session cannot authenticate');
    assert.equal((await post(base+'/join',{})).error,'MATCH_FULL');report.checks.push('third seat rejected');
    const large=await post(base+'/ticket',{reconnectToken:'x'.repeat(9000)});assert.equal(large.status,413);assert.equal(large.error,'REQUEST_TOO_LARGE');report.checks.push('oversized declared body rejected before room forwarding');
    const streamed=new ReadableStream({start(c){const raw=new TextEncoder().encode(JSON.stringify({reconnectToken:'x'.repeat(9000)}));c.enqueue(raw.slice(0,4000));c.enqueue(raw.slice(4000));c.close();}}),streamedResponse=await fetch(endpoint+base+'/ticket',{method:'POST',headers:{'Content-Type':'application/json'},body:streamed,duplex:'half'});assert.equal(streamedResponse.status,413);assert.equal((await streamedResponse.json()).error,'REQUEST_TOO_LARGE');report.checks.push('chunked oversized body cannot bypass the edge limit');
    h=await socket(host);g=await socket(guest);
    const reused=new WebSocket(endpoint.replace(/^http/,'ws')+base+'/socket',['frontlines-relay-v1','ticket.'+g.ticket]);let denied=false,opened=false;reused.addEventListener('error',()=>{denied=true;});reused.addEventListener('open',()=>{opened=true;});await wait(()=>denied||opened);assert.equal(opened,false);assert.equal(denied,true);report.checks.push('consumed socket ticket cannot authenticate a second socket');
    for(const raw of ['[]','null','not JSON','{"type":"forward","message":"executable string"}','{"type":"forward","message":{},"senderId":"spoof"}'])g.ws.send(raw);
    await wait(()=>g.messages.filter(m=>m.type==='error').length>=5);assert.ok(g.messages.filter(m=>m.type==='error').every(m=>m.error==='INVALID_MESSAGE'));assert.equal(h.messages.filter(m=>m.type==='message').length,0);report.checks.push('malformed frames and provider-level sender overrides rejected');
    g.ws.send(JSON.stringify({type:'forward',message:{senderId:'spoof',kind:'data'},destinationId:'not-a-member'}));await wait(()=>g.messages.some(m=>m.error==='INVALID_DESTINATION'));assert.equal(h.messages.filter(m=>m.type==='message').length,0);report.checks.push('arbitrary destination rejected');
    g.ws.send(JSON.stringify({type:'forward',message:{senderId:'spoof',kind:'data'}}));await wait(()=>h.messages.some(m=>m.type==='message'));const delivered=h.messages.find(m=>m.type==='message');assert.equal(delivered.senderId,guest.senderId);assert.equal(delivered.message.senderId,'spoof');report.checks.push('trusted socket identity cannot be forged by JSON');
    await post(base+'/leave',guest);assert.equal((await post(base+'/ticket',guest)).error,'AUTH_FAILED');report.checks.push('left guest capability immediately revoked');
    await post(base+'/leave',host);assert.equal((await post(base+'/ticket',host)).error,'MATCH_CLOSED');report.checks.push('closed host capability cannot revive the session');
    report.completed=true;fs.writeFileSync(path.resolve(__dirname,'../test-results/'+(local?'sprint13-relay-security.json':'sprint13-relay-public-security.json')),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  }finally{h?.ws.close();g?.ws.close();}
}
main().catch(e=>{console.error('RELAY_SECURITY_TEST_FAILED',e.code||e.message);process.exitCode=1;});
