'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),baseline=path.join(root,'docs/balance/sprint14-v1.1.0-baseline');
const checkpoint=JSON.parse(fs.readFileSync(path.join(baseline,'checkpoint-hashes.json'),'utf8'));
const frozen=JSON.parse(fs.readFileSync(path.join(baseline,'rules-and-economy.json'),'utf8'));
// Sprint 14's historical contract is checked under its original rules profile.
// Sprint 15 separately protects printed values while intentionally migrating timing.
const B=require('../balance'),R=B.createRuntime('sprint12'),E=R.engine,D=require('../decks').forData(R.data),C=require('../collection'),A=require('../art');
const P=require('../multiplayer-protocol'),S=require('../multiplayer-session'),Build=require('../build-info');
const FrozenB=require('../docs/balance/sprint14-v1.1.0-baseline/source/balance');
const FrozenC=require('../docs/balance/sprint14-v1.1.0-baseline/source/collection');
const FrozenA=require('../docs/balance/sprint14-v1.1.0-baseline/source/art');
const clone=P.clone,sha=value=>crypto.createHash('sha256').update(value).digest('hex');
function storage(profile){const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),...(() =>{data.set(C.STORAGE_KEY,JSON.stringify(profile));return {};})()};}
function protectedFile(file,expected=checkpoint.sourceHashes[file]){assert.ok(expected,'Frozen file recorded: '+file);assert.equal(sha(fs.readFileSync(path.join(root,file))),expected,file+' preserved bytes');}
function oldFields(actual,expected,label){for(const [key,value]of Object.entries(expected))assert.deepEqual(actual[key],value,label+' '+key);}

test('Arsenal Prestige frozen checkpoint preserves canonical engine, AI and tactical sources byte for byte',()=>{
  const required=['engine.js','ai.js','data.js','balance.js','decks.js','deck-rules.js','commanders.js','tactical-rules.js','tactical-arsenal.js','sim-core.js','simulator-worker.js','live-runtime.js'];
  for(const file of required)assert.equal(sha(fs.readFileSync(path.join(baseline,'source',file))),checkpoint.sourceHashes[file],file+' immutable Sprint 14 checkpoint');
  for(const file of ['data.js','decks.js','deck-rules.js','tactical-arsenal.js','live-runtime.js'])protectedFile(file);
  const profiles=Object.keys(checkpoint.sourceHashes).filter(file=>file.startsWith('balance/')&&file.endsWith('.json'));assert.ok(profiles.length>=10);
  for(const file of profiles)protectedFile(file);
  assert.equal(sha(fs.readFileSync(path.join(baseline,'source/build-info.js'))),checkpoint.sourceHashes['build-info.js'],'historical implementation fingerprint remains frozen');
});

test('all 155 printed cards, 35 preset decks, ten Commanders and exact timing/configuration remain frozen',()=>{
  assert.equal(Object.keys(R.data.CARDS).length,155);assert.deepEqual(R.data.CARDS,frozen.cards);assert.deepEqual(R.data.RULES,frozen.rules);
  assert.deepEqual(R.data.DEFAULT_CONFIG,frozen.config);assert.deepEqual(R.data.GLOSSARY,frozen.glossary);
  assert.equal(D.getDecks().length,35);assert.deepEqual(D.getDecks(),frozen.decks);assert.deepEqual(E.commanders.COMMANDERS,frozen.commanders);
  for(const deck of D.getDecks())assert.equal(D.validate(deck).legal,true,deck.id);
});

test('every approved runtime artwork file and all card mappings remain byte-identical',()=>{
  protectedFile('art.js');protectedFile('art-map012.js');
  const assets=Object.entries(checkpoint.sourceHashes).filter(([file])=>file.startsWith('assets/'));assert.ok(assets.length>=150);
  for(const [file,expected]of assets)protectedFile(file,expected);
  const cards=Object.values(R.data.CARDS);assert.equal(cards.length,155);
  for(const card of cards){const current=A.get(card),prior=FrozenA.get(card);assert.deepEqual(current,prior,card.id+' approved crop');
    assert.ok(Object.hasOwn(checkpoint.sourceHashes,current.src),card.id+' preserved runtime image');protectedFile(current.src);
    assert.equal(A.html(card,{className:'card-portrait'}),FrozenA.html(card,{className:'card-portrait'}),card.id+' artwork rendering');}
  for(const commander of E.commanders.list())assert.deepEqual(A.commanderGet(commander),FrozenA.commanderGet(commander),commander.id+' portrait');
});

test('historical network authority remains frozen while transport and prepared backend stay unchanged',()=>{
  for(const file of ['multiplayer-protocol.js','multiplayer-session.js','multiplayer-controller.js'])assert.equal(sha(fs.readFileSync(path.join(baseline,'source',file))),checkpoint.sourceHashes[file],file+' historical authority');
  protectedFile('network-transport.js');
  // The owner explicitly authorized activating the prepared service. Only its
  // public origin/status differ; authority, protocol and private economy do not.
  const current=require('../multiplayer-config'),prior=require('../docs/balance/sprint14-v1.1.0-baseline/source/multiplayer-config');
  assert.deepEqual({...current,serviceURL:prior.serviceURL,deploymentStatus:prior.deploymentStatus},prior);
  assert.equal(current.serviceURL,'https://frontlines-private-relay.frontlines-private-relay.workers.dev');assert.equal(current.deploymentStatus,'deployed');
  assert.ok(Object.keys(checkpoint.protectedNetwork).length>=6);
  for(const [file,expected]of Object.entries(checkpoint.protectedNetwork))if(file!=='backend/README.md')protectedFile(file,expected);
  assert.match(fs.readFileSync(path.join(root,'backend/README.md'),'utf8'),/frontlines-private-relay\.frontlines-private-relay\.workers\.dev/);
});

test('rarities, crafting, duplicate conversion, drop odds, pity and all grants remain exact',()=>{
  assert.deepEqual(C.RARITIES,frozen.rarities);assert.deepEqual(C.CARD_META,frozen.cardMeta);assert.deepEqual(C.ECONOMY,frozen.economy);assert.deepEqual(C.PACKS,frozen.packs);
  assert.deepEqual(C.STARTER_COLLECTION,frozen.starterCollection);assert.deepEqual(C.COMMANDER_CARD_GRANT,frozen.commanderGrant);
  for(const key of ['VERSION','STORAGE_KEY','SCHEMA_VERSION','COMMANDER_GRANT_VERSION','VARIANTS'])assert.deepEqual(C[key],FrozenC[key],key);
  for(const [id,row]of Object.entries(FrozenC.createProfile({seed:14}).cards))oldFields(C.createProfile({seed:14}).cards[id],row,id+' original grant');
});

test('representative actual pack, duplicate and craft transactions retain the previous economic outputs',()=>{
  const profile=FrozenC.createProfile({seed:1401});profile.credits=10000;profile.supply=10000;
  const current=storage(profile),prior=storage(profile);
  for(const def of Object.values(C.PACKS).filter(pack=>pack.enabled)){
    const a=C.purchasePack(def.id,current,{requestId:'preserve-'+def.id}),b=FrozenC.purchasePack(def.id,prior,{requestId:'preserve-'+def.id});
    assert.equal(a.ok,true);assert.equal(b.ok,true);assert.deepEqual(a.pack.contents,b.pack.contents,def.id+' deterministic drop');assert.equal(a.pack.price,b.pack.price);
    const claimA=C.claimPack(a.pack.id,current),claimB=FrozenC.claimPack(b.pack.id,prior);assert.deepEqual(claimA.acquisitions,claimB.acquisitions,def.id+' copies/conversion');assert.equal(claimA.supplyGained,claimB.supplyGained);
  }
  const a=C.load(current),b=FrozenC.load(prior);for(const key of ['credits','supply','pity','rngState','packsOpened','firstMatchRewarded'])assert.deepEqual(a[key],b[key],key);
  for(const [id,row]of Object.entries(b.cards))oldFields(a.cards[id],row,id+' pack outcome');
  const id=Object.keys(frozen.cards).find(cardId=>b.cards[cardId].copies<C.copyLimit(cardId));assert.ok(id);
  const craftA=C.craft(id,current,{requestId:'same-craft'}),craftB=FrozenC.craft(id,prior,{requestId:'same-craft'});assert.equal(craftA.ok,true);assert.equal(craftB.ok,true);assert.equal(craftA.cost,craftB.cost);assert.equal(craftA.profile.supply,craftB.profile.supply);oldFields(craftA.card,craftB.card,id+' craft');
  const saved=C.recoveryExport(current);assert.equal(C.craft(id,current,{requestId:'same-craft'}).alreadyCrafted,true);assert.equal(C.recoveryExport(current),saved);
});

test('local cosmetic, wear, favorite and history mismatches never alter ruleset, deck or canonical state hashes',()=>{
  const state=E.createGame({seed:1414,factions:['stonewall','bruiser'],decks:[D.starters()[0],D.starters()[1]]});
  const hashes={canonical:P.hash(state),shared:P.hash(P.projectState(state,null)),host:P.hash(P.projectState(state,0)),guest:P.hash(P.projectState(state,1)),deck:P.deckHash(D.starters()[0])};
  const compatibility=P.createCompatibility(R),store=storage(C.createProfile({seed:14})),local=C.load(store),id='stonewall_rifles';
  local.cards[id].variants.push('foil','fullArt','veteran');local.cards[id].mastery.points=397;local.cards[id].history.matchesUsed=80;store.setItem(C.STORAGE_KEY,JSON.stringify(local));
  assert.equal(C.setCosmeticPreferences(id,{variant:'foil',wear:'veteran',favorite:true},store).ok,true);
  assert.equal(C.rewardMatch({id:'state-neutral',completed:true,human:true,rewardPolicy:'completed-match-v2',victory:true,deckCardIds:[id],cardStats:{[id]:{deployments:2,attacks:3}}},store).ok,true);
  assert.equal(C.masterySummary(id,C.load(store)).matchesUsed,81);assert.equal(C.cosmeticState(id,C.load(store)).wear,'veteran');
  assert.deepEqual(P.createCompatibility(R),compatibility);assert.equal(P.hash(state),hashes.canonical);assert.equal(P.hash(P.projectState(state,null)),hashes.shared);
  assert.equal(P.hash(P.projectState(state,0)),hashes.host);assert.equal(P.hash(P.projectState(state,1)),hashes.guest);assert.equal(P.deckHash(D.starters()[0]),hashes.deck);
  const decorated={...R,data:clone(R.data)};for(const card of Object.values(decorated.data.CARDS))Object.assign(card,{cosmeticVariant:'foil',wear:'veteran',mastery:{points:999},history:{matchesUsed:100},favorite:true});
  assert.deepEqual(P.createCompatibility(decorated),compatibility);assert.deepEqual(P.compareCompatibility(compatibility,P.createCompatibility(decorated)),{ok:true});
  assert.equal(P.deckHash({...D.starters()[0],cosmetics:local.cards,history:{private:true}}),hashes.deck);
});

test('public projection strips cosmetic extensions and collection inventory along with hidden hands and order',()=>{
  let state=E.createGame({seed:1415,factions:['nightwalker','rogue']});const deploy=E.legalActions(state).find(action=>action.type==='deploy');assert.ok(deploy);state=E.dispatch(state,deploy).state;
  const originals=[null,0,1].map(seat=>P.projectState(state,seat));
  const marker='SECRET_PRIVATE_PRESTIGE_INVENTORY';state.collection={marker};state.history={marker};state.cosmetics={marker};
  for(const player of state.players){player.collection={marker};player.cosmetics={marker};player.mastery={marker};player.deckMeta.cosmetics={marker};player.deckMeta.privateInventory={marker};
    for(const card of player.hand){card.cosmetics={marker};card.history={marker};card.mastery={marker};}}
  for(const unit of state.units){unit.cosmetics={marker};unit.mastery={marker};unit.history={marker};}
  for(const [index,seat]of [null,0,1].entries()){
    const safe=P.projectState(state,seat);assert.deepEqual(safe,originals[index]);assert.equal(P.hash(safe),P.hash(originals[index]));const wire=JSON.stringify(safe);assert.equal(wire.includes(marker),false);assert.doesNotMatch(wire,/"cosmetics"|"collection"|"mastery"|"history"|"rngState"|"seed"/);
    for(const [owner,player]of safe.players.entries()){assert.ok(player.deck.every(card=>card===null));if(owner!==seat)assert.deepEqual(player.hand,[]);}
  }
  const events=[{type:'deploy',player:0,cardId:state.units[0].cardId,cosmetics:{marker},history:{marker}},{type:'draw',player:0,cardId:'SECRET_DRAW_PRESTIGE',uid:'hidden',cosmetics:{marker}}];
  assert.doesNotMatch(JSON.stringify(P.projectEvents(events,1)),/SECRET_PRIVATE_PRESTIGE_INVENTORY|SECRET_DRAW_PRESTIGE|"cosmetics"|"history"/);
});

test('different cosmetic selections join and start one match without sending inventory or changing authoritative legality',()=>{
  const decorated={...R,data:clone(R.data)};decorated.data.CARDS.stonewall_rifles.cosmeticVariant='fullArt';decorated.data.CARDS.stonewall_rifles.wear='veteran';
  const h=S.createHost({runtime:R,sessionId:'prestige_room',hostId:'host',appVersion:Build.version}),guestCompatibility=P.createCompatibility(decorated,{appVersion:Build.version});
  assert.equal(h.join('guest','Wyatt',guestCompatibility).ok,true);
  const secret='SECRET_PRIVATE_COLLECTION_OWNERSHIP',selected=D.starters().slice(0,2).map(deck=>({...deck,cosmetics:{secret},mastery:{secret},collectionInventory:{secret}}));
  assert.equal(h.select('host',selected[0]).ok,true);assert.equal(h.select('guest',selected[1]).ok,true);assert.equal(h.ready('host',true).ok,true);assert.equal(h.ready('guest',true).ok,true);
  const start=h.start('host',{seed:1416});assert.equal(start.ok,true);assert.equal(JSON.stringify(h.lobby()).includes(secret),false);
  for(const id of ['host','guest']){const snapshot=h.snapshotFor(id);assert.equal(h.acknowledgeStart(id,snapshot.matchId,{sequence:snapshot.sequence,stateHash:snapshot.stateHash}).ok,true);}
  const canonical=h.inspectCanonical();assert.equal(JSON.stringify(canonical).includes(secret),false);
  for(const id of ['host','guest']){const snapshot=h.snapshotFor(id);assert.equal(snapshot.status,'active');assert.equal(snapshot.stateHash,P.hash(snapshot.state));assert.equal(snapshot.state.players[1-snapshot.localSeat].hand.length,0);assert.equal(JSON.stringify(snapshot).includes(secret),false);
    const expected=E.getActor(canonical)===snapshot.localSeat?E.legalActions(canonical):[];assert.deepEqual(snapshot.legalActions,expected);}
  assert.equal(h.snapshotFor('host').sharedHash,h.snapshotFor('guest').sharedHash);h.close('host');
});

test('small deterministic action fixture proves unchanged gameplay and AI outputs without a balance simulation',()=>{
  const priorRuntime=FrozenB.createRuntime('sprint12'),previousEngine=priorRuntime.engine,decks=D.starters().slice(0,2);
  let a=E.createGame({seed:1417,factions:decks.map(deck=>deck.faction),decks}),b=previousEngine.createGame({seed:1417,factions:decks.map(deck=>deck.faction),decks});
  for(let i=0;i<16;i++){
    assert.deepEqual(a,b);assert.deepEqual(E.legalActions(a),previousEngine.legalActions(b));
    const action=R.ai.chooseAction(a);assert.deepEqual(action,priorRuntime.ai.chooseAction(b));
    const current=E.dispatch(a,action,{events:true}),prior=previousEngine.dispatch(b,action,{events:true});assert.deepEqual(current,prior);a=current.state;b=prior.state;
    if(a.winner!==null)break;
  }
  assert.equal(P.hash(a),P.hash(b));
});
