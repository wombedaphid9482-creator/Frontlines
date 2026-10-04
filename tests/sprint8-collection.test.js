'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Collection=require('../collection'),Balance=require('../balance'),Decks=require('../decks');
const Data=Balance.dataFor('sprint7'),CurrentDecks=Decks.forData(Data);
function storage(){const records=new Map();return {records,getItem:key=>records.has(key)?records.get(key):null,setItem:(key,value)=>records.set(key,String(value))};}
function fixture(options={}){const store=storage(),profile=Collection.createProfile({seed:options.seed??11});if(options.credits!==undefined)profile.credits=options.credits;if(options.supply!==undefined)profile.supply=options.supply;store.setItem(Collection.STORAGE_KEY,JSON.stringify(profile));return store;}
function update(store,fn){const profile=Collection.load(store);fn(profile);store.setItem(Collection.STORAGE_KEY,JSON.stringify(profile));}
function completed(id,overrides={}){return {id,completed:true,human:true,mode:'match',ownTurns:4,meaningfulActions:4,victory:false,deckCardIds:['stonewall_rifles'],cardStats:{stonewall_rifles:{deployments:1,attacks:1}},...overrides};}
test('all 115 cards have explicit immutable collectible metadata without gameplay changes',()=>{
  const before=JSON.stringify(Data),profile=Collection.createProfile({seed:7});
  assert.equal(Object.keys(Collection.CARD_META).length,115);assert.equal(Object.keys(profile.cards).length,115);
  for(const card of Object.values(Data.CARDS)){const meta=Collection.metadata(card);assert.ok(Collection.RARITIES.includes(meta.rarity));assert.equal(meta.faction,card.faction);assert.equal(meta.copyLimit,card.type==='leader'?2:4);assert.ok(meta.pools.includes(card.faction));assert.equal(meta.craftCost,Collection.ECONOMY.craftCosts[meta.rarity]);}
  for(const faction of Object.keys(Data.FACTIONS))for(const rarity of Collection.RARITIES)assert.ok(Object.values(Collection.CARD_META).some(meta=>meta.faction===faction&&meta.rarity===rarity));
  assert.equal(Object.isFrozen(Collection.CARD_META),true);assert.equal(Collection.metadata('__proto__'),null);assert.equal(JSON.stringify(Data),before);assert.equal(JSON.stringify(Balance.dataFor('sprint7')),before);
});
test('fresh profile owns all five legal beginner decks and leaves collection growth',()=>{
  const store=storage(),profile=Collection.load(store),starters=CurrentDecks.starters();
  assert.equal(profile.credits,300);assert.equal(profile.supply,0);assert.equal(profile.migrated,false);assert.equal(starters.length,5);
  for(const deck of starters){assert.equal(deck.cards.length,26);assert.equal(CurrentDecks.validate(deck).legal,true);assert.equal(Collection.canUseDeck(deck,profile).complete,true);}
  const summary=Collection.summary(profile);assert.equal(summary.uniqueOwned,60);assert.equal(summary.copiesOwned,130);assert.ok(summary.completion>0&&summary.completion<1);
  for(const [id,copies] of Object.entries(Collection.STARTER_COLLECTION))assert.equal(Collection.ownedCount(id,profile),copies);
  assert.equal(Collection.load(store).credits,300);assert.equal(Collection.summary(Collection.load(store)).copiesOwned,130);
});
test('Sprint 7 migration preserves decks, settings, tutorial and prior progression keys',()=>{
  const store=storage(),legacyDeck=JSON.stringify([{id:'old-force',name:'Old force',faction:'rogue',cards:['rogue_field_options']}]);
  store.setItem(Decks.STORAGE_KEY,legacyDeck);store.setItem('frontlines.settings.v1','{"music":0.4}');store.setItem('frontlines.tutorial.v1','{"complete":true}');store.setItem('frontlines.profile.v1','{"level":8}');
  const profile=Collection.load(store);assert.equal(profile.migrated,true);assert.equal(profile.credits,500);assert.equal(Collection.ownedCount('rogue_field_options',profile),0);
  assert.equal(store.getItem(Decks.STORAGE_KEY),legacyDeck);assert.equal(store.getItem('frontlines.settings.v1'),'{"music":0.4}');assert.equal(store.getItem('frontlines.profile.v1'),'{"level":8}');
  assert.equal(Collection.canUseDeck(JSON.parse(legacyDeck)[0],profile).complete,false);
  assert.equal(Collection.load(store).credits,500);
});
test('browser initializes the profile before new shell preferences can resemble migration',()=>{
  const store=storage(),context={FrontlinesBalance:Balance,FrontlinesDecks:Decks,localStorage:store};context.globalThis=context;
  vm.runInNewContext(fs.readFileSync(require.resolve('../collection'),'utf8'),context);
  store.setItem('frontlines.settings.v1','{"sound":false}');
  assert.equal(context.FrontlinesCollection.load().credits,300);assert.equal(context.FrontlinesCollection.load().migrated,false);
});
test('malformed or future collection saves stay intact and prevent all writes',()=>{
  for(const original of ['{broken original',JSON.stringify({schemaVersion:99}),JSON.stringify({...Collection.createProfile({seed:2}),credits:-1})]){
    const store=storage();store.setItem(Collection.STORAGE_KEY,original);
    assert.equal(Collection.diagnostics(store).blocked,true);assert.equal(Collection.load(store).readOnly,true);
    assert.equal(Collection.purchasePack('standard',store).ok,false);assert.equal(Collection.completeTutorial('tutorial',store).ok,false);assert.equal(Collection.recoveryExport(store),original);
  }
});
test('new card entries recover as unowned and unknown saved fields survive transactions',()=>{
  const store=fixture();update(store,profile=>{delete profile.cards.rogue_field_options;profile.futureSettings={event:'preserved'};profile.cards.future_card={copies:9,unknown:'preserved'};});
  assert.equal(Collection.load(store).cards.rogue_field_options.copies,0);
  assert.equal(Collection.completeTutorial('training',store).ok,true);
  assert.deepEqual(Collection.load(store).futureSettings,{event:'preserved'});assert.deepEqual(Collection.load(store).cards.future_card,{copies:9,unknown:'preserved'});
});
test('unavailable and failed storage never claims that an economic mutation succeeded',()=>{
  const empty=storage();empty.setItem=()=>{throw new Error('quota exceeded');};assert.equal(Collection.load(empty).readOnly,true);assert.equal(Collection.purchasePack('standard',empty).ok,false);
  const store=fixture(),before=Collection.recoveryExport(store);store.setItem=()=>{throw new Error('quota exceeded');};
  assert.equal(Collection.purchasePack('standard',store).ok,false);assert.equal(Collection.recoveryExport(store),before);
  assert.equal(Collection.purchasePack('standard').ok,false);
});
test('data-driven pack definitions have normalized odds, valid pools and guarantees',()=>{
  for(const pack of Object.values(Collection.PACKS).filter(pack=>pack.enabled)){
    assert.equal(pack.cardsPerPack,5);assert.ok(pack.price>0);assert.ok(Math.abs(Object.values(pack.odds).reduce((a,b)=>a+b,0)-1)<1e-12);
    for(const rarity of Collection.RARITIES)assert.ok(Object.values(Collection.CARD_META).some(meta=>meta.rarity===rarity&&pack.factions.includes(meta.faction)));
    assert.equal(pack.guarantees.length,1);assert.equal(pack.guarantees[0].slot,4);
  }
  assert.equal(Collection.PACKS.commander.enabled,false);assert.equal(Collection.PACKS.commander.cardsPerPack,0);
});
test('seeded packs reproduce exact contents, faction pools, guarantees and cosmetics',()=>{
  for(const def of Object.values(Collection.PACKS).filter(pack=>pack.enabled))for(const seed of [1,11,29,301]){
    const first=Collection.generatePack(def.id,seed),again=Collection.generatePack(def.id,seed);assert.deepEqual(first,again);assert.equal(first.contents.length,5);
    for(const item of first.contents){const meta=Collection.metadata(item.cardId);assert.ok(meta);assert.ok(def.factions.includes(meta.faction));assert.equal(meta.rarity,item.rarity);assert.ok(Object.hasOwn(Collection.VARIANTS,item.variant));}
    assert.ok(Collection.RARITIES.indexOf(first.contents[4].rarity)>=Collection.RARITIES.indexOf(def.guarantees[0].minRarity));
  }
  assert.throws(()=>Collection.generatePack('commander',1),/unavailable/);
});
test('pity guarantees apply on configured boundaries and reset at the acquired rarity',()=>{
  for(const rarity of ['rare','epic','legendary']){
    const counters={rare:0,epic:0,legendary:0};counters[rarity]=Collection.ECONOMY.pity[rarity]-1;
    const pack=Collection.generatePack('standard',8,counters);assert.equal(pack.pityApplied,rarity);
    assert.ok(pack.contents.some(card=>Collection.RARITIES.indexOf(card.rarity)>=Collection.RARITIES.indexOf(rarity)));assert.equal(pack.pity[rarity],0);
  }
  const legendary=Collection.generatePack('standard',8,{rare:7,epic:3,legendary:19});assert.equal(legendary.pityApplied,'legendary');assert.deepEqual(legendary.pity,{rare:0,epic:0,legendary:0});
});
test('specific deterministic seeds exercise Foil and Full-Art drops without sampling sweeps',()=>{
  assert.equal(Collection.generatePack('standard',1914760997).contents[0].variant,'foil');
  assert.equal(Collection.generatePack('standard',2038765063).contents[0].variant,'fullArt');
});
test('purchase and claim persist atomically with request retries and pack reload recovery',()=>{
  const store=fixture({credits:1000}),before=Collection.load(store),purchase=Collection.purchasePack('standard',store,{requestId:'buy-one'});
  assert.equal(purchase.ok,true);assert.equal(purchase.profile.credits,900);assert.equal(Collection.load(store).packs.length,1);assert.deepEqual(purchase.profile.cards,before.cards);
  const replay=Collection.purchasePack('standard',store,{requestId:'buy-one'});assert.equal(replay.alreadyPurchased,true);assert.equal(replay.profile.credits,900);assert.deepEqual(replay.pack.contents,purchase.pack.contents);
  assert.equal(Collection.purchasePack('elite',store,{requestId:'buy-one'}).ok,false);
  const recovered=Collection.load(store).packs[0],claim=Collection.claimPack(recovered.id,store);assert.equal(claim.ok,true);assert.equal(claim.acquisitions.length,5);assert.equal(claim.profile.packsOpened,1);
  const snapshot=Collection.recoveryExport(store),second=Collection.claimPack(recovered.id,store);assert.equal(second.alreadyClaimed,true);assert.equal(Collection.recoveryExport(store),snapshot);assert.deepEqual(second.acquisitions,claim.acquisitions);
});
test('failed affordability, disabled purchases and invalid claims leave existing save exact',()=>{
  const store=fixture({credits:0}),before=Collection.recoveryExport(store);
  assert.equal(Collection.purchasePack('standard',store).ok,false);assert.equal(Collection.purchasePack('commander',store).ok,false);assert.equal(Collection.claimPack('missing',store).ok,false);assert.equal(Collection.purchasePack('standard',store,{requestId:'__proto__'}).ok,false);
  assert.equal(Collection.recoveryExport(store),before);
});
test('persistent RNG advances between purchases and family pity remains independent',()=>{
  const a=fixture({credits:2000,seed:94}),b=fixture({credits:2000,seed:94});
  for(const def of ['standard','stonewall','veteran','standard'])assert.deepEqual(Collection.purchasePack(def,a).pack.contents,Collection.purchasePack(def,b).pack.contents);
  const profile=Collection.load(a);assert.ok(profile.pity.standard);assert.ok(profile.pity.stonewall);assert.ok(profile.pity.veteran);assert.equal(profile.pity.bruiser,undefined);assert.notEqual(profile.rngState,94);assert.deepEqual(Collection.load(a),Collection.load(b));
});
test('duplicate cards convert only excess legal copies and duplicate cosmetics retain value',()=>{
  const store=fixture();update(store,profile=>{
    profile.cards.stonewall_rifles.copies=3;
    profile.packs.push({id:'duplicates',definitionId:'stonewall',name:'test',claimed:false,contents:[
      {cardId:'stonewall_rifles',rarity:'common',variant:'foil'},
      {cardId:'stonewall_rifles',rarity:'common',variant:'foil'},
      {cardId:'stonewall_commander',rarity:'epic',variant:'standard'},
      {cardId:'stonewall_rifles',rarity:'common',variant:'standard'},
      {cardId:'stonewall_medic',rarity:'uncommon',variant:'fullArt'}
    ],acquisitions:[],supplyGained:0});
  });
  const claim=Collection.claimPack('duplicates',store);assert.equal(claim.ok,true);assert.equal(claim.profile.cards.stonewall_rifles.copies,4);assert.equal(claim.profile.cards.stonewall_commander.copies,2);assert.equal(claim.profile.cards.stonewall_medic.copies,3);
  assert.equal(claim.acquisitions[0].copiesAdded,1);assert.equal(claim.acquisitions[1].copiesAdded,0);assert.equal(claim.acquisitions[1].duplicateSupply,10);assert.equal(claim.supplyGained,60);
  assert.ok(claim.profile.cards.stonewall_rifles.variants.includes('foil'));assert.ok(claim.profile.cards.stonewall_medic.variants.includes('fullArt'));
});
test('crafting charges Supply once, adds gameplay copies, and respects the legal cap',()=>{
  const store=fixture({supply:1000}),id='rogue_field_options',meta=Collection.metadata(id),crafted=Collection.craft(id,store,{requestId:'craft-one'});
  assert.equal(crafted.ok,true);assert.equal(crafted.cost,meta.craftCost);assert.equal(crafted.profile.supply,1000-meta.craftCost);assert.equal(crafted.profile.cards[id].copies,1);assert.ok(crafted.profile.cards[id].variants.includes('standard'));
  const repeated=Collection.craft(id,store,{requestId:'craft-one'});assert.equal(repeated.alreadyCrafted,true);assert.equal(repeated.profile.supply,crafted.profile.supply);
  assert.equal(Collection.craft('stonewall_rifles',store).ok,false);assert.equal(Collection.craft('unknown',store).ok,false);assert.equal(Collection.craft('rogue_field_negotiator',fixture({supply:0})).ok,false);
  assert.equal(Collection.craft('rogue_field_negotiator',store,{requestId:'craft-one'}).ok,false);
});
test('owned cosmetic selection, random appearance and fallback never alter gameplay or legality',()=>{
  const store=fixture(),before=JSON.stringify(Data),deck=CurrentDecks.starters()[0];
  assert.equal(Collection.setPreferredVariant('stonewall_rifles','foil',store).ok,false);assert.equal(Collection.setPreferredVariant('rogue_field_options','standard',store).ok,false);
  update(store,profile=>{profile.cards.stonewall_rifles.variants.push('foil');});
  const selected=Collection.setPreferredVariant('stonewall_rifles','foil',store);assert.equal(selected.ok,true);assert.equal(Collection.variantFor('stonewall_rifles',selected.profile),'foil');
  assert.equal(Collection.setPreferredVariant('stonewall_rifles','random',store).ok,true);
  const profile=Collection.load(store);assert.ok(['standard','foil'].includes(Collection.variantFor('stonewall_rifles',profile,87)));assert.equal(Collection.variantFor('rogue_field_options',profile),'standard');
  assert.equal(Collection.canUseDeck(deck,profile).complete,true);assert.equal(CurrentDecks.validate(deck).legal,true);assert.equal(JSON.stringify(Data),before);
});
test('ownership is distinct from legality so legal AI and test decks remain unrestricted',()=>{
  const profile=Collection.createProfile({seed:1}),preset=CurrentDecks.presets().find(deck=>deck.cards.includes('rogue_field_options'))||CurrentDecks.presets().find(deck=>deck.cards.some(id=>!profile.cards[id].copies));
  assert.equal(CurrentDecks.validate(preset).legal,true);assert.equal(Collection.canUseDeck(preset,profile).complete,false);
  assert.ok(Collection.canUseDeck(preset,profile).missing.every(item=>item.required>item.owned&&item.missing===item.required-item.owned));
});
test('completed human matches reward meaningful wins and losses exactly once',()=>{
  const win=fixture(),loss=fixture(),won=Collection.rewardMatch(completed('win',{victory:true}),win),lost=Collection.rewardMatch(completed('loss'),loss);
  assert.equal(won.ok,true);assert.equal(won.eligible,true);assert.equal(won.creditsEarned,120);assert.equal(lost.creditsEarned,100);assert.ok(won.creditsEarned>lost.creditsEarned);assert.ok(lost.sources.some(source=>source.name==='Defeat'));
  assert.equal(Collection.rewardMatch(completed('another-loss'),loss).creditsEarned,50);assert.equal(Collection.rewardMatch(completed('another-win',{victory:true}),win).creditsEarned,70);
  const before=Collection.recoveryExport(win),retry=Collection.rewardMatch(completed('win',{victory:true}),win);assert.equal(retry.alreadyRewarded,true);assert.equal(Collection.recoveryExport(win),before);
});
test('incomplete, trivial, AI, practice, tutorial, concession and War Room matches award nothing',()=>{
  const store=fixture(),before=Collection.recoveryExport(store);
  const rejected=[{completed:false},{human:false},{allAI:true},{simulation:true},{warRoom:true},{mode:'warroom'},{mode:'ai-vs-ai'},{mode:'simulator'},{practice:true},{tutorial:true},{mode:'tutorial'},{mode:'practice'},{nonCompetitive:true},{conceded:true},{concede:true},{ownTurns:3},{meaningfulActions:3},{victory:undefined}];
  for(const flags of rejected){const result=Collection.rewardMatch(completed('blocked',flags),store);assert.equal(result.eligible,false);assert.equal(result.creditsEarned,0);assert.ok(result.reason);assert.deepEqual(result.masteryGains,[]);}
  assert.equal(Collection.recoveryExport(store),before);
});
test('mastery records real card usage once per match and unlocks three cosmetic milestones',()=>{
  const store=fixture();update(store,profile=>{profile.cards.stonewall_rifles.mastery.points=24;});
  const one=Collection.rewardMatch(completed('mastery-one',{deckCardIds:['stonewall_rifles','stonewall_rifles'],cardStats:{stonewall_rifles:{deployments:1,attacks:1,kills:1,captureContributions:1,passiveTriggers:1}}}),store);
  assert.equal(one.masteryGains.length,1);assert.equal(one.masteryGains[0].points,8);assert.deepEqual(one.masteryGains[0].unlocks,['fieldWorn']);assert.equal(one.profile.cards.stonewall_rifles.mastery.matchesIncluded,1);assert.equal(one.profile.cards.stonewall_rifles.mastery.eliminations,1);
  update(store,profile=>{profile.cards.stonewall_rifles.mastery.points=99;});const two=Collection.rewardMatch(completed('mastery-two'),store);assert.deepEqual(two.masteryGains[0].unlocks,['battleHardened']);
  update(store,profile=>{profile.cards.stonewall_rifles.mastery.points=299;});const three=Collection.rewardMatch(completed('mastery-three'),store);assert.deepEqual(three.masteryGains[0].unlocks,['veteran']);assert.equal(Collection.summary(three.profile).mastered,1);
  const before=Collection.recoveryExport(store);assert.equal(Collection.rewardMatch(completed('mastery-three'),store).alreadyRewarded,true);assert.equal(Collection.recoveryExport(store),before);
});
test('whole tutorial bonus is awarded once even after restarting with a different identifier',()=>{
  const store=fixture(),reward=Collection.completeTutorial('frontlines-training',store);assert.equal(reward.creditsEarned,100);assert.equal(reward.profile.credits,400);
  const before=Collection.recoveryExport(store);assert.equal(Collection.completeTutorial('frontlines-training',store).alreadyRewarded,true);assert.equal(Collection.completeTutorial('lesson-restart',store).creditsEarned,0);assert.equal(Collection.recoveryExport(store),before);
});
test('newly acquired markers clear independently of quantity, cosmetics and mastery',()=>{
  const store=fixture({supply:1000}),crafted=Collection.craft('rogue_field_options',store);assert.equal(crafted.card.newlyAcquired,true);assert.ok(Collection.summary(crafted.profile).recentlyAcquired.includes('rogue_field_options'));
  const seen=Collection.markSeen('rogue_field_options',store);assert.equal(seen.profile.cards.rogue_field_options.newlyAcquired,false);assert.equal(seen.profile.cards.rogue_field_options.copies,1);assert.deepEqual(seen.profile.cards.rogue_field_options.mastery,crafted.card.mastery);
});
