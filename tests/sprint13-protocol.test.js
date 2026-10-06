'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),vm=require('node:vm');
const P=require('../multiplayer-protocol'),B=require('../balance'),Decks=require('../decks'),R=B.createRuntime('sprint12'),E=R.engine,L=Decks.forData(R.data),copy=P.clone;
test('canonical SHA-256 matches Node vectors and sorted JSON across renderer and authority',()=>{
  for(const text of ['', 'abc','Frontlines — Ryken ↔ Wyatt','a'.repeat(2000)])assert.equal(P.sha256(text),crypto.createHash('sha256').update(text).digest('hex'));
  assert.equal(P.hash({b:[1,2],a:{z:'x',y:true}}),P.hash({a:{y:true,z:'x'},b:[1,2]}));assert.notEqual(P.hash([1,2]),P.hash([2,1]));
  const context=vm.createContext({TextEncoder,Uint8Array,crypto:crypto.webcrypto,FrontlinesDeckRules:require('../deck-rules'),FrontlinesBuild:{version:'1.1.0'}});vm.runInContext(fs.readFileSync('multiplayer-protocol.js','utf8'),context);
  assert.equal(context.FrontlinesMultiplayerProtocol.sha256('Frontlines ☀'),P.sha256('Frontlines ☀'));
});
test('invite codes use secure unambiguous eight-character alphabet and forgiving normalization',()=>{
  assert.equal(P.normalizeInvite(' f7k9 r2qm '),'F7K9-R2QM');assert.equal(P.normalizeInvite('f7k9-r2qm'),'F7K9-R2QM');assert.equal(P.normalizeInvite('F7K9R2QM'),'F7K9-R2QM');
  for(const invalid of [null,'','0000-OOOO','AAAA-AAAA-AAAA','<AAAA-AAAA>'])assert.equal(P.normalizeInvite(invalid),null);
  const codes=new Set(Array.from({length:64},()=>P.generateInvite()));assert.equal(codes.size,64);for(const code of codes)assert.equal(P.normalizeInvite(code),code);
  assert.equal(P.reconnectToken().length,64);assert.notEqual(P.reconnectToken(),P.reconnectToken());
});
test('wire compatibility explicitly rejects app, protocol, content and ruleset differences',()=>{
  const c=P.createCompatibility(R,{appVersion:'1.1.0',implementationHash:'source1'});assert.deepEqual(P.compareCompatibility(c,copy(c)),{ok:true});
  for(const [field,value,code]of [['protocolVersion',2,'PROTOCOL_MISMATCH'],['appVersion','1.0.5','VERSION_MISMATCH'],['rulesetHash','different','RULESET_MISMATCH'],['contentHash','different','RULESET_MISMATCH'],['profile','sprint11','RULESET_MISMATCH']])assert.equal(P.compareCompatibility(c,{...c,[field]:value}).code,code);
  assert.notEqual(c.rulesetHash,P.createCompatibility(R,{appVersion:'1.1.0',implementationHash:'source2'}).rulesetHash);
  const changed={...R,data:copy(R.data)};changed.data.CARDS.stonewall_rifles.artRole='cosmetic';changed.data.CARDS.stonewall_rifles.flavorText='Cosmetic';assert.equal(P.createCompatibility(changed,{appVersion:'1.1.0',implementationHash:'source1'}).rulesetHash,c.rulesetHash);
  changed.data.CARDS.stonewall_rifles.attack++;assert.notEqual(P.createCompatibility(changed,{appVersion:'1.1.0',implementationHash:'source1'}).rulesetHash,c.rulesetHash);
});
test('deck manifest hashes composition independent of input order but includes Commander',()=>{
  const deck=L.starters()[0],reversed={...deck,cards:deck.cards.slice().reverse()};assert.equal(P.deckHash(deck),P.deckHash(reversed));assert.notEqual(P.deckHash(deck),P.deckHash({...deck,commanderId:'commander_stonewall_marshal'}));assert.notEqual(P.deckHash(deck),P.deckHash({...deck,cards:deck.cards.slice(1)}));
});
test('strict intentions cannot submit state, player identity, damage or debug mutations',()=>{
  for(const action of [null,[],{type:'debug'},{type:'deploy',handUid:'c1',territory:-1},{type:'deploy',handUid:'c1',territory:0,player:1},{type:'attack',unitUid:'c1',targetUid:'c2',damage:100},{type:'move',unitUid:'c1',territory:2.1},{type:'endTurn',state:{}},{type:'respond',pass:false},{type:'respond',pass:true,handUid:'c1'}])assert.ok(P.validateAction(action));
  for(const action of [{type:'endTurn'},{type:'deploy',handUid:'c1',territory:0},{type:'attack',unitUid:'c1',targetUid:'c2'},{type:'respond',pass:true},{type:'counter',handUid:'c3'},{type:'commander',targetUid:'c1'},{type:'ability',unitUid:'c1',abilityId:'repair',targetUid:'c2'},{type:'overwatch',unitUid:'c1'}])assert.equal(P.validateAction(action),null);
});
test('messages reject oversized, deeply nested and prototype-bearing untrusted data',()=>{
  const base=P.packet({sessionId:'session',senderId:'guest'},'ready',{ready:true});assert.deepEqual(P.parseMessage(JSON.stringify(base)),base);
  assert.throws(()=>P.parseMessage({...base,payload:{huge:'x'.repeat(P.MAX_MESSAGE_BYTES)}}));assert.throws(()=>P.parseMessage(JSON.stringify(base).replace('"ready":true','"__proto__":{}')));
  let nested={};for(let i=0;i<20;i++)nested={next:nested};assert.throws(()=>P.parseMessage({...base,payload:nested}));assert.throws(()=>P.parseMessage({...base,protocolVersion:2}));
});
test('player-safe snapshots never include hidden opponent hand, deck order, seed or RNG',()=>{
  const state=E.createGame({seed:1313,factions:['stonewall','bruiser']});state.privateChoice={cardId:'SECRET_CHOICE'};state.players[0].hand.push({uid:'secretHand',cardId:'SECRET_HOST_HAND'});state.players[0].deck.push('SECRET_HOST_RESERVE');state.players[0].deckMeta.secret='SECRET_MANIFEST';state.log.push({turn:1,type:'draw',text:'SECRET_LOG'});
  const guest=P.projectState(state,1),wire=JSON.stringify(guest);for(const secret of ['SECRET_HOST_HAND','SECRET_HOST_RESERVE','SECRET_CHOICE','SECRET_MANIFEST','SECRET_LOG','rngState','nextUid','"seed"'])assert.equal(wire.includes(secret),false,secret);
  assert.deepEqual(guest.players[0].hand,[]);assert.equal(guest.players[0].handCount,state.players[0].hand.length);assert.deepEqual(guest.players[0].deck,Array(state.players[0].deck.length).fill(null));assert.deepEqual(guest.players[1].hand,state.players[1].hand);
  const publicState=P.projectState(state,null);assert.deepEqual(publicState.players.map(row=>row.hand),[[],[]]);assert.equal(P.hash(P.projectState(guest,null)),P.hash(publicState));
});
test('network events redact private draws and hand recovery while preserving actual public mechanics',()=>{
  const events=[{type:'draw',turn:2,player:0,uid:'hidden',cardId:'SECRET_DRAW'},{type:'commanderRecovery',turn:2,player:0,uid:'hidden2',cardId:'SECRET_RECOVERY',commanderId:'commander_rogue_scavenger',amount:1},{type:'statusApplied',turn:2,player:0,status:'cover',targetUid:'c1',amount:2},{type:'futurePrivateChoice',cardId:'SECRET_FUTURE'}];
  const guest=P.projectEvents(events,1);assert.equal(JSON.stringify(guest).includes('SECRET'),false);assert.deepEqual(guest[0],{type:'draw',turn:2,player:0,amount:1});assert.equal(guest[2].status,'cover');assert.equal(P.projectEvents(events,0)[0].cardId,'SECRET_DRAW');
});
test('every launch Commander public availability survives reserve-safe projection',()=>{
  for(const commander of E.commanders.list()){const deck=L.commanderStarters().find(deck=>deck.commanderId===commander.id),state=E.createGame({seed:13,factions:[commander.faction,'bruiser'],decks:[deck,L.starters().find(deck=>deck.faction==='bruiser')]});assert.deepEqual(E.commanderStatus(P.projectState(state,0),0),E.commanderStatus(state,0),commander.id);}
  const state=E.createGame({seed:13,factions:['syndicate','bruiser'],decks:[L.commanderStarters().find(deck=>deck.commanderId==='commander_syndicate_quartermaster'),L.starters()[1]]});state.players[0].spent=0;state.players[0].discard=[];assert.equal(E.commanderStatus(P.projectState(state,0),0).available,true);
});
