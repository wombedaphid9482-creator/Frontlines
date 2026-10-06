'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../collection'),B=require('../balance'),D=require('../decks');
const Frozen105=require('../docs/balance/sprint13-v1.0.5-baseline/source/collection');
const Frozen110=require('../docs/balance/sprint14-v1.1.0-baseline/source/collection');
const copy=value=>JSON.parse(JSON.stringify(value));
function storage(profile=C.createProfile({seed:14})){const records=new Map(),s={getItem:k=>records.get(k)??null,setItem:(k,v)=>records.set(k,String(v))};s.setItem(C.STORAGE_KEY,JSON.stringify(profile));return s;}
function edit(s,fn){const p=C.load(s);fn(p);s.setItem(C.STORAGE_KEY,JSON.stringify(p));return p;}
const match=(id,extra={})=>({id,rewardPolicy:'completed-match-v2',completed:true,human:true,victory:true,deckCardIds:['stonewall_rifles','stonewall_heavy'],cardStats:{stonewall_rifles:{deployments:1,attacks:2,kills:1}},...extra});
function oldKeys(actual,expected,label){for(const [key,value]of Object.entries(expected))assert.deepEqual(actual[key],value,label+' '+key);}

test('Arsenal Prestige preserves every economy, rarity, entitlement, grant and ownership rule',()=>{
  for(const key of ['VERSION','STORAGE_KEY','SCHEMA_VERSION','ECONOMY','PACKS','CARD_META','RARITIES','VARIANTS','STARTER_COLLECTION','STARTER_DECKS','COMMANDER_CARD_GRANT'])assert.deepEqual(C[key],Frozen110[key],key);
  for(const [id,row]of Object.entries(Frozen110.createProfile({seed:14}).cards))oldKeys(C.createProfile({seed:14}).cards[id],row,id);
  for(const def of Object.values(C.PACKS).filter(p=>p.enabled))for(const seed of [14,1914760997,2038765063])assert.deepEqual(C.generatePack(def.id,seed),Frozen110.generatePack(def.id,seed));
});

for(const [version,Frozen]of [['v1.0.5',Frozen105],['v1.1.0',Frozen110]])test(version+' migration preserves raw legacy progress and other saves while adding honest history',()=>{
  const p=Frozen.createProfile({seed:140});p.credits=4207;p.supply=811;p.futureData={retained:['future']};p.firstMatchRewarded=true;
  p.cards.stonewall_rifles.variants.push('foil','fieldWorn','battleHardened','veteran');p.cards.stonewall_rifles.preferredVariant='veteran';
  Object.assign(p.cards.stonewall_rifles.mastery,{points:411,matchesIncluded:117,victories:45,deployments:51,attacks:19});p.rewards.legacy={eligible:true,creditsEarned:70};
  p.commanders.commander_stonewall_warden.mastery={matches:17,victories:9,activations:6};
  const s=storage(p),other={'frontlines.settings.v1':'{"audio":false,"animationSpeed":"fast"}','frontlines.decks.v1':'{"kept":true}',
    'frontlines.tutorial.v1':'{"completed":true}','frontlines.multiplayer.v1':'{"displayName":"Ryken"}','frontlines.history.v1':'{"matches":["old"]}'};
  for(const [key,value]of Object.entries(other))s.setItem(key,value);
  const migrated=C.load(s);assert.equal(migrated.readOnly,undefined);
  for(const [key,value]of Object.entries(p))if(!['cards','revision'].includes(key))assert.deepEqual(migrated[key],value,key);
  for(const [id,row]of Object.entries(p.cards))oldKeys(migrated.cards[id],row,id);
  assert.equal(migrated.cards.stonewall_rifles.preferredVariant,'veteran');
  const state=C.cosmeticState('stonewall_rifles',migrated),summary=C.masterySummary('stonewall_rifles',migrated);
  assert.equal(state.variant,'standard');assert.equal(state.wear,'veteran');assert.equal(summary.level,'veteran');assert.equal(summary.points,411);
  assert.equal(summary.firstAcquiredDate,null);assert.equal(summary.firstAcquiredKnown,false);assert.equal(summary.historyComplete,false);
  assert.equal(summary.matchesUsed,0);assert.equal(summary.legacyMatchesIncluded,117);assert.equal(summary.deployments,51);assert.equal(summary.winsIncluded,45);
  assert.equal(summary.nextMilestone,null);assert.match(summary.lastProgressReason,/preserved/);
  const persisted=s.getItem(C.STORAGE_KEY);assert.equal(JSON.parse(persisted).prestigeVersion,1);C.load(s);assert.equal(s.getItem(C.STORAGE_KEY),persisted);
  for(const [key,value]of Object.entries(other))assert.equal(s.getItem(key),value,key);
});

test('old field-worn and battle-hardened selections become a separate wear layer without clearing original fields',()=>{
  for(const wear of ['fieldWorn','battleHardened']){const p=Frozen110.createProfile({seed:1});p.cards.stonewall_rifles.variants.push(wear);p.cards.stonewall_rifles.preferredVariant=wear;
    const migrated=C.load(storage(p));assert.equal(migrated.cards.stonewall_rifles.preferredVariant,wear);assert.equal(C.cosmeticState('stonewall_rifles',migrated).variant,'standard');assert.equal(C.cosmeticState('stonewall_rifles',migrated).wear,wear);}
});

test('Legendary Foil Veteran is independent, persistent and cannot alter canonical gameplay or deck legality',()=>{
  const s=storage(),id='stonewall_bulwark_warden',dataBefore=JSON.stringify(B.dataFor(B.DEFAULT_PROFILE)),rulesBefore=JSON.stringify(D.RULES);
  const before=edit(s,p=>{p.cards[id].copies=1;p.cards[id].variants=['standard','foil','fullArt','veteran'];p.cards[id].mastery.points=300;});
  const result=C.setCosmeticPreferences(id,{variant:'foil',wear:'veteran',favorite:true},s);assert.equal(result.ok,true);
  const state=C.cosmeticState(id,C.load(s));assert.deepEqual({rarity:state.rarity,variant:state.variant,wear:state.wear,favorite:state.favorite},{rarity:'legendary',variant:'foil',wear:'veteran',favorite:true});
  assert.equal(C.load(s).credits,before.credits);assert.equal(C.load(s).supply,before.supply);assert.deepEqual(C.load(s).cards[id].mastery,before.cards[id].mastery);
  assert.deepEqual(C.load(s).cards[id].variants,before.cards[id].variants);assert.equal(JSON.stringify(B.dataFor(B.DEFAULT_PROFILE)),dataBefore);assert.equal(JSON.stringify(D.RULES),rulesBefore);
  assert.equal(C.setCosmeticPreferences(id,{variant:'fullArt'},s).ok,true);assert.equal(C.cosmeticState(id,C.load(s)).wear,'veteran');
  assert.equal(C.setCosmeticPreferences(id,{wear:'standard'},s).ok,true);assert.equal(C.cosmeticState(id,C.load(s)).variant,'fullArt');
});

test('legacy selection API remains compatible and now stacks Foil with earned wear',()=>{
  const s=storage();edit(s,p=>p.cards.stonewall_rifles.variants.push('foil','fieldWorn'));
  assert.equal(C.setPreferredVariant('stonewall_rifles','foil',s).ok,true);assert.equal(C.setPreferredVariant('stonewall_rifles','fieldWorn',s).ok,true);
  assert.equal(C.variantFor('stonewall_rifles',C.load(s)),'fieldWorn');const state=C.cosmeticState('stonewall_rifles',C.load(s));assert.equal(state.variant,'foil');assert.equal(state.wear,'fieldWorn');
  assert.equal(C.setCosmeticPreferences('stonewall_rifles',{variant:'foil'},s).ok,true);assert.equal(C.load(s).cards.stonewall_rifles.preferredVariant,'foil');assert.equal(C.cosmeticState('stonewall_rifles',C.load(s)).wear,'fieldWorn');
});

test('wear cannot be farmed through idle deck inclusion; real counters and normal completed-match Credits are preserved',()=>{
  const s=storage();edit(s,p=>{p.cards.stonewall_rifles.mastery.points=24;p.cards.stonewall_heavy.mastery.points=99;});
  const first=C.rewardMatch(match('actual-use'),s),p=C.load(s);assert.equal(first.creditsEarned,120);assert.equal(first.masteryGains.length,1);
  assert.equal(p.cards.stonewall_rifles.mastery.points,24+8);assert.equal(p.cards.stonewall_heavy.mastery.points,99);assert.equal(p.cards.stonewall_heavy.mastery.matchesIncluded,1);
  assert.equal(p.cards.stonewall_heavy.mastery.victories,1);assert.equal(p.cards.stonewall_heavy.variants.includes('battleHardened'),false);
  const used=C.masterySummary('stonewall_rifles',p),idle=C.masterySummary('stonewall_heavy',p);assert.equal(used.matchesUsed,1);assert.equal(used.deployments,1);assert.equal(used.winsIncluded,1);
  assert.match(used.lastProgressReason,/1 deployment, 2 attacks, 1 elimination in a victory/);assert.equal(used.nextMilestone.wear,'battleHardened');assert.equal(used.nextMilestone.remaining,68);
  assert.equal(idle.matchesUsed,0);assert.equal(idle.winsIncluded,1);assert.equal(idle.lastProgressPoints,0);
  const idleReward=C.rewardMatch(match('idle',{cardStats:{}}),s);assert.equal(idleReward.creditsEarned,70);assert.deepEqual(idleReward.masteryGains,[]);
  assert.equal(C.masterySummary('stonewall_rifles',C.load(s)).matchesUsed,1);assert.equal(C.load(s).cards.stonewall_rifles.mastery.points,32);
});

test('played orders earn mastery without a deployment and deduplicate repeated copies',()=>{
  const s=storage(),id='stonewall_rally';const reward=C.rewardMatch(match('order',{deckCardIds:[id,id],cardStats:{[id]:{orders:1,plays:1}}}),s);
  assert.equal(reward.masteryGains.length,1);assert.equal(reward.masteryGains[0].points,2);assert.equal(C.masterySummary(id,C.load(s)).matchesUsed,1);assert.equal(C.masterySummary(id,C.load(s)).deployments,0);
});

test('private progression remains actual-use-only, economy-free and idempotent including new history',()=>{
  const s=storage(),before=C.load(s),privateMatch={...match('private-history'),usedCards:['stonewall_rifles','stonewall_heavy']};
  const reward=C.rewardPrivateMatch(privateMatch,s),p=C.load(s);assert.equal(reward.creditsEarned,0);assert.equal(reward.masteryGains.length,1);
  for(const key of ['credits','supply','packs','pity','rngState','purchases','craftRequests','firstMatchRewarded'])assert.deepEqual(p[key],before[key],key);
  assert.equal(C.masterySummary('stonewall_rifles',p).matchesUsed,1);assert.equal(C.masterySummary('stonewall_heavy',p).matchesUsed,0);
  const saved=C.recoveryExport(s);assert.equal(C.rewardPrivateMatch(privateMatch,s).alreadyRewarded,true);assert.equal(C.recoveryExport(s),saved);
  for(const flags of [{conceded:true},{abandoned:true},{completed:false},{victory:null},{usedCards:[]}])assert.equal(C.rewardPrivateMatch({...privateMatch,id:'excluded',...flags},s).eligible,false);
  assert.equal(C.recoveryExport(s),saved);
});

test('malformed action counters cannot invent actual use and never change pack RNG',()=>{
  const s=storage(),rng=C.load(s).rngState;
  C.rewardMatch(match('invalid',{cardStats:{stonewall_rifles:{deployments:-1,attacks:Infinity,orders:10001,plays:'1',kills:NaN}}}),s);
  assert.equal(C.masterySummary('stonewall_rifles',C.load(s)).matchesUsed,0);assert.equal(C.load(s).cards.stonewall_rifles.mastery.points,0);assert.equal(C.load(s).rngState,rng);
  const privateResult=C.rewardPrivateMatch({...match('bad-private'),usedCards:['stonewall_rifles'],cardStats:{stonewall_rifles:{plays:'1',orders:10001}},commanderId:'commander_stonewall_warden'},s);
  assert.equal(privateResult.eligible,false);assert.equal(privateResult.commanderMastery,null);assert.equal(C.load(s).commanders.commander_stonewall_warden.mastery.matches,0);
});

test('first known acquisition is recorded once; existing unknown legacy dates remain unknown on a duplicate',()=>{
  const s=storage(),legacy=C.load(s).cards.stonewall_rifles;
  assert.equal(legacy.history.firstAcquiredDate,null);edit(s,p=>p.supply=1000);
  const crafted=C.craft('rogue_field_negotiator',s,{requestId:'date-once'}),date=crafted.card.history.firstAcquiredDate;
  assert.equal(crafted.ok,true);assert.ok(Number.isFinite(Date.parse(date)));assert.equal(crafted.card.history.firstAcquiredKnown,true);
  const second=C.craft('rogue_field_negotiator',s,{requestId:'date-twice'});assert.equal(second.card.history.firstAcquiredDate,date);
  assert.equal(C.craft('rogue_field_negotiator',s,{requestId:'date-once'}).alreadyCrafted,true);
  edit(s,p=>{p.cards.stonewall_rifles.copies=3;});assert.equal(C.craft('stonewall_rifles',s).ok,true);assert.equal(C.load(s).cards.stonewall_rifles.history.firstAcquiredDate,null);
});

test('new starter acquisition dates can be recorded explicitly while deterministic profiles remain reproducible',()=>{
  const date='2026-10-06T12:00:00.000Z',p=C.createProfile({seed:14,acquiredAt:date});
  assert.equal(C.masterySummary('stonewall_rifles',p).firstAcquiredDate,date);assert.equal(C.masterySummary('stonewall_rifles',p).historyComplete,true);
  assert.equal(C.masterySummary('rogue_field_negotiator',p).firstAcquiredDate,null);
  assert.deepEqual(C.createProfile({seed:14}),C.createProfile({seed:14}));
});

test('cosmetic preference validation rejects unavailable finishes, locked wear and unknown fields atomically',()=>{
  const s=storage(),saved=C.recoveryExport(s);
  for(const [id,options]of [['stonewall_rifles',{variant:'foil'}],['stonewall_rifles',{wear:'veteran'}],['stonewall_rifles',{favorite:1}],['stonewall_rifles',{variant:'holographic'}],['stonewall_rifles',{stats:{attack:999}}],['unknown',{favorite:true}],['rogue_field_negotiator',{variant:'standard'}]])assert.equal(C.setCosmeticPreferences(id,options,s).ok,false);
  assert.equal(C.recoveryExport(s),saved);
  assert.equal(C.setFavorite('rogue_field_negotiator',true,s).ok,true);assert.equal(C.cosmeticState('rogue_field_negotiator',C.load(s)).favorite,true);assert.equal(C.ownedCount('rogue_field_negotiator',C.load(s)),0);
});

test('random premium finish is deterministic without changing wear, legacy entitlements or economic RNG',()=>{
  const s=storage();edit(s,p=>p.cards.stonewall_rifles.variants.push('foil','fullArt','veteran'));
  C.setCosmeticPreferences('stonewall_rifles',{variant:'random',wear:'veteran'},s);const p=C.load(s),before=copy(p);
  const state=C.cosmeticState('stonewall_rifles',p,91);assert.ok(C.COSMETIC_VARIANTS.includes(state.variant));assert.equal(state.wear,'veteran');assert.deepEqual(C.cosmeticState('stonewall_rifles',p,91),state);assert.deepEqual(p,before);
});

test('quota failures preserve progression and selection bytes; successful retries apply exactly once',()=>{
  const s=storage(),saved=C.recoveryExport(s),write=s.setItem;s.setItem=()=>{throw Error('Quota fixture');};
  assert.equal(C.setFavorite('stonewall_rifles',true,s).ok,false);assert.equal(C.rewardMatch(match('quota-history'),s).ok,false);assert.equal(C.recoveryExport(s),saved);
  s.setItem=write;assert.equal(C.rewardMatch(match('quota-history'),s).ok,true);const after=C.recoveryExport(s);assert.equal(C.rewardMatch(match('quota-history'),s).alreadyRewarded,true);assert.equal(C.recoveryExport(s),after);
});

test('malformed new history or preferences preserve recovery data and block economic writes',()=>{
  for(const change of [p=>p.cards.stonewall_rifles.history.matchesUsed=-1,p=>p.cards.stonewall_rifles.cosmetics.favorite='yes',p=>p.cards.stonewall_rifles.history.firstAcquiredDate='invented-date',p=>p.prestigeVersion=2]){
    const p=C.createProfile({seed:14});change(p);const s=storage(p),saved=C.recoveryExport(s);assert.equal(C.load(s).readOnly,true);assert.equal(C.purchasePack('standard',s).ok,false);assert.equal(C.recoveryExport(s),saved);
  }
});

test('read-only summaries cannot mutate supplied saves or unlock cosmetic entitlements',()=>{
  const p=Frozen110.createProfile({seed:14});p.cards.stonewall_rifles.mastery.points=300;const before=copy(p);
  const summary=C.masterySummary('stonewall_rifles',p);assert.equal(summary.level,'veteran');assert.equal(summary.nextMilestone,null);
  assert.deepEqual(C.cosmeticState('stonewall_rifles',p).unlockedWear,['standard']);assert.deepEqual(p,before);
});
