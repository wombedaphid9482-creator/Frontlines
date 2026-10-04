'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../collection'),B=require('../balance'),Decks=require('../decks'),Commanders=require('../commanders'),T=require('../tutorial');
const R=B.createRuntime('sprint9'),E=R.engine,D=R.data,library=Decks.forData(D);
function storage(){const records=new Map();return {records,getItem:k=>records.get(k)??null,setItem:(k,v)=>records.set(k,String(v))};}
function legacy(){const p=C.createProfile({seed:9301});delete p.commanders;delete p.commanderGrantVersion;for(const [id,row]of Object.entries(p.cards)){row.copies=C.STARTER_COLLECTION[id]||0;row.variants=row.copies?['standard']:[];}return p;}

test('v0.9 source and installer remain the unchanged pre-Commander checkpoint',()=>{
  const fs=require('node:fs'),crypto=require('node:crypto'),m=JSON.parse(fs.readFileSync('docs/release-0.9.0-manifest.json'));
  for(const row of [m.verification.package.installer,m.finalSourceCheckpoint]){
    const file=row.file.includes('/')?row.file:'release/0.9.0/'+row.file;
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),row.sha256,file);
  }
});

test('v0.9 collection migration grants ten Commanders and all foundation copies once without changing progression',()=>{
  const s=storage();C.load(s);const purchase=C.purchasePack('standard',s,{requestId:'migration-pending'});assert.equal(purchase.ok,true);
  const p=legacy(),pending=C.load(s);p.credits=997;p.supply=421;p.packs=pending.packs;p.purchases=pending.purchases;p.pity=pending.pity;p.rngState=pending.rngState;p.revision=9;
  p.rewards.old={creditsEarned:50};p.tutorials.original=true;p.futureField={retained:true};p.cards.stonewall_rifles.variants.push('foil');p.cards.stonewall_rifles.preferredVariant='foil';p.cards.stonewall_rifles.mastery.points=87;
  s.setItem(C.STORAGE_KEY,JSON.stringify(p));s.setItem(Decks.STORAGE_KEY,'legacy deck save');s.setItem('frontlines.settings.v1','original settings');
  const upgraded=C.load(s);assert.equal(upgraded.revision,10);assert.equal(upgraded.credits,997);assert.equal(upgraded.supply,421);
  for(const key of ['packs','purchases','pity','rngState','rewards','tutorials','futureField'])assert.deepEqual(upgraded[key],p[key],key);
  assert.equal(upgraded.cards.stonewall_rifles.preferredVariant,'foil');assert.equal(upgraded.cards.stonewall_rifles.mastery.points,87);
  assert.equal(C.summary(upgraded).commanders.owned,10);assert.equal(C.summary(upgraded).uniqueOwned,63);assert.equal(C.summary(upgraded).copiesOwned,171);
  assert.ok(library.commanderStarters().every(d=>library.validate(d).legal&&C.canUseDeck(d,upgraded).complete));
  const saved=s.getItem(C.STORAGE_KEY);assert.deepEqual(C.load(s),upgraded);assert.equal(s.getItem(C.STORAGE_KEY),saved);
  assert.equal(s.getItem(Decks.STORAGE_KEY),'legacy deck save');assert.equal(s.getItem('frontlines.settings.v1'),'original settings');
  assert.equal(C.completeTutorial('commander-tutorial',s).creditsEarned,0);
});

test('future and quota-blocked Commander migrations preserve the original bytes',()=>{
  for(const kind of ['future','quota']){const s=storage(),p=legacy();if(kind==='future')p.commanderGrantVersion=2;const raw=JSON.stringify(p);s.setItem(C.STORAGE_KEY,raw);if(kind==='quota')s.setItem=()=>{throw Error('Quota exceeded');};
    assert.equal(C.load(s).readOnly,true);assert.equal(C.recoveryExport(s),raw);assert.equal(C.diagnostics(s).blocked,true);
  }
});

test('Commander match history shares idempotent reward and developer exclusion boundaries',()=>{
  const s=storage(),id=Commanders.defaultFor('stonewall'),match={id:'commander-earned',completed:true,human:true,mode:'match',ownTurns:4,meaningfulActions:4,victory:true,commanderId:id,commanderActiveUsed:true,deckCardIds:['stonewall_rifles'],cardStats:{stonewall_rifles:{deployments:1}}};
  const earned=C.rewardMatch(match,s);assert.equal(earned.ok,true);assert.deepEqual(earned.commanderMastery,{id,matches:1,victories:1,activations:1});
  const wallet=C.load(s).credits;assert.equal(C.rewardMatch(match,s).alreadyRewarded,true);assert.equal(C.load(s).credits,wallet);assert.equal(C.load(s).commanders[id].mastery.matches,1);
  const excluded=C.rewardMatch({...match,id:'developer',practice:true},s);assert.equal(excluded.eligible,false);assert.equal(C.load(s).commanders[id].mastery.matches,1);
});

test('old tutorial completion returns to explicit Commander lessons without repeating its reward',()=>{
  const s=storage();s.setItem(T.STORAGE_KEY,JSON.stringify({version:1,index:10,started:true,complete:true,completedLessons:[0,1,2,3,4,5,6,7,8,9,10]}));
  const p=T.progress(s);assert.equal(p.index,10);assert.equal(p.complete,false);assert.equal(p.completedLessons.length,10);assert.equal(p.commanderId,'commander_stonewall_warden');
  s.setItem(T.STORAGE_KEY,JSON.stringify({version:2,index:13,complete:true,completedLessons:[0,1,2]}));assert.equal(T.progress(s).index,10);assert.equal(T.progress(s).complete,false);
  s.setItem(T.STORAGE_KEY,JSON.stringify({version:2,index:13,complete:true,completedLessons:[10,11,12],commanderId:'commander_stonewall_marshal'}));assert.equal(T.progress(s).complete,true);assert.equal(T.progress(s).commanderId,'commander_stonewall_marshal');
});

test('shared capture forecast includes Breaker bonus and disables it when Rush/Mobile is suppressed',()=>{
  const s=E.createGame({factions:['bruiser','stonewall'],seed:9302}),index=s.players[0].deck.findIndex(id=>D.CARDS[id].traits?.includes('rush'));
  const cardId=s.players[0].deck.splice(index,1)[0],u={uid:'c'+s.nextUid++,cardId,owner:0,territory:3,damage:0,ready:true,deployedTurn:0};s.units.push(u);
  const forecast=E.capturePressure(s,0);assert.equal(forecast.bonus,2);assert.equal(forecast.total,D.CARDS[cardId].presence+2);
  const result=E.dispatch(s,{type:'endTurn'},{events:true});assert.equal(result.ok,true);assert.equal(result.events.find(e=>e.type==='pressure').amount,forecast.total);
  u.suppressed=1;assert.equal(E.capturePressure(s,0).bonus,0);assert.equal(E.capturePressure(s,1).total,0);
});
