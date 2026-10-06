'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),T=require('../network-transport');
const roomModule=()=>import('../network/relay-room.mjs');
function memory(){const data=new Map();return {get:async k=>data.get(k),put:async(k,v)=>data.set(k,structuredClone(v)),deleteAll:async()=>data.clear(),data};}

test('private invite normalization accepts presentation variants and rejects ambiguous/malformed codes',()=>{
  assert.equal(T.normalizeInvite(' abcd-efgh '),'ABCDEFGH');assert.equal(T.normalizeInvite('abcd efgh'),'ABCDEFGH');
  for(const invalid of ['ABCD-EFG0','ABCD-EFG1','ABCD-EFGI','ABCD-EFGO','ABCD-EFGH<script>',{},null,'ABCDEFG','ABCDEFGHI'])assert.equal(T.normalizeInvite(invalid),null);
});
test('loopback host and guest share one private session with stable authenticated identities',async()=>{
  const hub=T.createLoopbackHub({autoFlush:false}),host=hub.createTransport(),guest=hub.createTransport();const h=await host.hostSession(),g=await guest.joinSession(h.inviteCode.toLowerCase());
  assert.equal(h.sessionId,g.sessionId);assert.notEqual(h.senderId,g.senderId);assert.equal(h.role,'host');assert.equal(g.role,'guest');assert.equal(host.getConnectionState().peerConnected,true);assert.equal(guest.getConnectionState().peerConnected,true);
  const delivered=[];guest.onMessage(m=>delivered.push(m));host.send({messageType:'fixture',senderId:'spoof'});hub.flush();assert.equal(delivered[0].senderId,h.senderId);assert.equal(delivered[0].senderRole,'host');assert.equal(delivered[0].message.senderId,'spoof');
  assert.throws(()=>host.send({x:1},'nonmember'),{code:'INVALID_DESTINATION'});
});
test('loopback test transport generates isolated invites, rejects invalid/full/expired/closed sessions',async()=>{
  const hub=T.createLoopbackHub({autoFlush:false}),a=hub.createTransport(),b=hub.createTransport(),c=hub.createTransport(),d=hub.createTransport();const h=await a.hostSession(),other=await d.hostSession();assert.notEqual(h.inviteCode,other.inviteCode);
  assert.throws(()=>b.joinSession('bad'),{code:'INVALID_INVITE'});assert.throws(()=>b.joinSession('2222-2222'),{code:'MATCH_NOT_FOUND'});await b.joinSession(h.inviteCode);assert.throws(()=>c.joinSession(h.inviteCode),{code:'MATCH_FULL'});
  hub.expire(other.inviteCode);assert.throws(()=>c.joinSession(other.inviteCode),{code:'MATCH_EXPIRED'});await a.closeSession();assert.throws(()=>c.joinSession(h.inviteCode),{code:'MATCH_NOT_FOUND'});
});
test('fault transport deliberately drops, duplicates, reverses and reconnects without changing member identity',async()=>{
  const hub=T.createLoopbackHub({autoFlush:false}),a=hub.createTransport(),b=hub.createTransport(),received=[];const host=await a.hostSession(),guest=await b.joinSession(host.inviteCode);b.onMessage(m=>received.push(m.message.id));
  hub.setFaults({drop:1});a.send({id:'drop'});hub.flush();assert.deepEqual(received,[]);hub.setFaults({duplicate:1});a.send({id:'duplicate'});hub.flush();assert.deepEqual(received,['duplicate','duplicate']);
  hub.setFaults({reverse:true});a.send({id:1});a.send({id:2});hub.flush();assert.deepEqual(received.slice(-2),[2,1]);hub.dropConnection(guest.senderId);assert.equal(a.getConnectionState().peerConnected,false);assert.throws(()=>a.send({id:3}),{code:'PEER_DISCONNECTED'});await hub.reconnect(guest.senderId);assert.equal(b.getConnectionState().senderId,guest.senderId);assert.equal(a.getConnectionState().peerConnected,true);
});
test('reconnected transport reports its authenticated live peer atomically with connected status',async()=>{
  const hub=T.createLoopbackHub({autoFlush:false}),host=hub.createTransport(),guest=hub.createTransport(),h=await host.hostSession();await guest.joinSession(h.inviteCode);const recovered=[];
  host.onState(s=>{if(s.status==='connected')recovered.push(s.peerConnected);});hub.dropConnection(h.senderId);await hub.reconnect(h.senderId);assert.deepEqual(recovered,[true,true]);assert.equal(host.getConnectionState().peer.senderId,guest.getConnectionState().senderId);
});
test('transport rejects oversized or executable-shaped payloads and unsafe production URLs before any request',async()=>{
  const hub=T.createLoopbackHub(),a=hub.createTransport();await a.hostSession();assert.throws(()=>a.send('raw code'),{code:'INVALID_MESSAGE'});assert.throws(()=>a.send({text:'x'.repeat(T.MAX_MESSAGE_BYTES)}),{code:'MESSAGE_TOO_LARGE'});
  let calls=0;for(const serviceURL of ['http://remote.example','file:///secret','https://user:pass@example.com','https://example.com?secret=1',''])await assert.rejects(T.createRelayTransport({serviceURL,fetch:()=>{calls++;}}).hostSession(),{code:'SERVICE_UNAVAILABLE'});assert.equal(calls,0);
});
test('relay service persists only hashed temporary reconnect capabilities and single-use socket tickets',async()=>{
  const {RelayRoom}=await roomModule(),storage=memory();let now=1000;const room=new RelayRoom({storage,now:()=>now}),host=await room.create('ABCDEFGH'),guest=await room.join();assert.equal(host.role,'host');assert.equal(guest.role,'guest');assert.equal(host.sessionId,guest.sessionId);
  const saved=JSON.stringify(storage.data.get('room'));assert.ok(!saved.includes(host.reconnectToken));assert.ok(!saved.includes(guest.reconnectToken));assert.ok(saved.includes('tokenHash'));
  const ticket=await room.ticket(host);assert.ok(!JSON.stringify(storage.data.get('room')).includes(ticket.ticket));const identity=await room.consumeTicket(ticket.ticket);assert.equal(identity.senderId,host.senderId);await assert.rejects(room.consumeTicket(ticket.ticket),{code:'AUTH_FAILED'});
  const expired=await room.ticket(guest);now=expired.expiresAt+1;await assert.rejects(room.consumeTicket(expired.ticket),{code:'AUTH_FAILED'});
});
test('relay service serializes simultaneous join claims and rejects unauthorized seat takeover',async()=>{
  const {RelayRoom}=await roomModule(),room=new RelayRoom({storage:memory()}),host=await room.create('ABCDEFGH');const outcomes=await Promise.allSettled([room.join(),room.join()]);assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);assert.equal(outcomes.find(x=>x.status==='rejected').reason.code,'MATCH_FULL');
  const guest=outcomes.find(x=>x.status==='fulfilled').value;await assert.rejects(room.ticket({...host,senderId:guest.senderId}),{code:'AUTH_FAILED'});await assert.rejects(room.ticket({...host,sessionId:'different'}),{code:'AUTH_FAILED'});await assert.rejects(room.ticket({...host,reconnectToken:'bad'}),{code:'AUTH_FAILED'});assert.equal((await room.ticket(host)).ok,true);
});
test('relay identity and valid tickets survive Durable Object reconstruction; closure and expiration reject reconnect',async()=>{
  const {RelayRoom}=await roomModule(),storage=memory();let now=1;const first=new RelayRoom({storage,now:()=>now}),host=await first.create('ABCDEFGH'),guest=await first.join(),ticket=await first.ticket(guest),restored=new RelayRoom({storage,now:()=>now});assert.equal((await restored.consumeTicket(ticket.ticket)).senderId,guest.senderId);
  await assert.rejects(restored.create('ABCDEFGH'),{code:'INVITE_COLLISION'});await restored.leave(host);await assert.rejects(restored.ticket(guest),{code:'MATCH_CLOSED'});
  const second=new RelayRoom({storage:memory(),now:()=>now}),h=await second.create('23456789');now=h.expiresAt;await assert.rejects(second.join(),{code:'MATCH_EXPIRED'});await assert.rejects(second.ticket(h),{code:'MATCH_EXPIRED'});
});
test('new guest invitations expire after fifteen minutes without expiring an existing host session',async()=>{
  const {RelayRoom}=await roomModule(),storage=memory();let now=1;const room=new RelayRoom({storage,now:()=>now}),host=await room.create('ABCDEFGH');now=host.inviteExpiresAt;await assert.rejects(room.join(),{code:'MATCH_EXPIRED'});assert.equal((await room.ticket(host)).ok,true);assert.ok(host.expiresAt>host.inviteExpiresAt);
});
test('guest leave revokes its socket and token while preserving the host invitation',async()=>{
  const {RelayRoom}=await roomModule(),room=new RelayRoom({storage:memory()}),host=await room.create('ABCDEFGH'),guest=await room.join();await room.leave(guest);await assert.rejects(room.ticket(guest),{code:'AUTH_FAILED'});await assert.rejects(room.authorizedSocket({senderId:guest.senderId,role:'guest',sessionId:guest.sessionId}),{code:'AUTH_FAILED'});assert.equal((await room.ticket(host)).ok,true);const replacement=await room.join();assert.notEqual(replacement.senderId,guest.senderId);
});
test('relay frame parser accepts data only and bounds bytes before parsing',async()=>{
  const {parseFrame,MAX_FRAME_BYTES}=await roomModule();assert.deepEqual(parseFrame('{"type":"ping","sentAt":100}'),{type:'ping',sentAt:100});assert.deepEqual(parseFrame('{"type":"forward","message":{"type":"intent"}}').message,{type:'intent'});
  for(const bad of ['eval("alert(1)")','[]','null','{"type":"forward","message":null}','{"type":"forward","message":{},"senderId":"spoof"}','{"type":"ping","sentAt":"clock"}',new Uint8Array([1])])assert.throws(()=>parseFrame(bad),{code:'INVALID_MESSAGE'});assert.throws(()=>parseFrame('x'.repeat(MAX_FRAME_BYTES+1)),{code:'MESSAGE_TOO_LARGE'});
});
test('relay HTTP body limit cannot be bypassed by missing Content-Length, and errors contain no credentials',async()=>{
  const {readJSON}=await roomModule();const valid=new Request('https://room/test',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.deepEqual(await readJSON(valid),{});
  await assert.rejects(readJSON(new Request('https://room/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({x:'x'.repeat(8192)})})),{code:'REQUEST_TOO_LARGE'});
  await assert.rejects(readJSON(new Request('https://room/test',{method:'POST',headers:{'Content-Type':'application/json'},body:'not JSON'})),{code:'INVALID_REQUEST'});
  await assert.rejects(readJSON(new Request('https://room/test',{method:'POST',body:'{}'})),{code:'INVALID_REQUEST'});
});
