/* Forge 008 collection/economy. Gameplay definitions and deck legality are never
 * mutated. One saved document commits each purchase, claim, craft or reward.
 * Browser: FrontlinesCollection. Node: require('./collection'). See the public
 * API contract at the end; storage arguments are localStorage-compatible.
 */
(function(root,factory){
  'use strict';
  const node=typeof module==='object'&&module.exports;
  const Balance=node?require('./balance.js'):root.FrontlinesBalance;
  const Decks=node?require('./decks.js'):root.FrontlinesDecks;
  const api=factory(Balance.dataFor(Balance.DEFAULT_PROFILE),Decks,root,node?require('./commanders.js'):root.FrontlinesCommanders,Balance);
  if(node)module.exports=api;else{
    root.FrontlinesCollection=api;
    // Run before shell preferences are created so a genuinely fresh profile
    // cannot be mistaken for a pre-Sprint-8 migration on its first page visit.
    api.load();
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(Data,Decks,root,Commanders,Balance){
  'use strict';
  const VERSION='frontlines-collection-v1',STORAGE_KEY='frontlines.collection.v1',SCHEMA_VERSION=1;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const has=(object,key)=>!!object&&Object.hasOwn(object,key);
  function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
  const RARITIES=freeze(['common','uncommon','rare','epic','legendary']);
  const VARIANTS=freeze({
    standard:{id:'standard',name:'Standard',label:'Standard',source:'owned card'},
    fieldWorn:{id:'fieldWorn',name:'Field-Worn',label:'Field-Worn',source:'mastery'},
    battleHardened:{id:'battleHardened',name:'Battle-Hardened',label:'Battle-Hardened',source:'mastery'},
    veteran:{id:'veteran',name:'Veteran',label:'Veteran',source:'mastery'},
    foil:{id:'foil',name:'Foil / Holographic',label:'Foil',source:'packs'},
    fullArt:{id:'fullArt',name:'Full-Art',label:'Full-Art',source:'packs'}
  });
  const ECONOMY=freeze({
    startingCredits:300,migrationCredits:500,startingSupply:0,
    rewards:{completion:35,victory:35,defeat:15,tutorial:100,firstMatch:50},
    eligibility:{minimumOwnTurns:4,minimumMeaningfulActions:4},
    craftCosts:{common:15,uncommon:35,rare:80,epic:180,legendary:360},
    duplicateSupply:{common:5,uncommon:10,rare:20,epic:45,legendary:90},
    cosmeticDuplicateSupply:5,
    cosmeticOdds:{standard:.965,foil:.03,fullArt:.005},
    pity:{rare:8,epic:4,legendary:20},
    masteryWeights:{matchesIncluded:1,victories:1,deployments:2,attacks:1,eliminations:2,territoriesInfluenced:1,factionActions:1},
    masteryMilestones:[{points:25,variant:'fieldWorn'},{points:100,variant:'battleHardened'},{points:300,variant:'veteran'}]
  });
  // Explicit collectible classification. Rarity measures complexity and identity,
  // not strength; starter staples remain useful and existing stats remain exact.
  const RARITY_GROUPS=freeze({
    stonewall:{common:'rifles defender triage brace rally fire_support reserve_watch',uncommon:'medic heavy escort pathfinder aid_station line_reinforcement',rare:'watchguard countermarch plate_medic counterbattery',epic:'commander redoubt recovery_team advance_marshal',legendary:'bulwark_warden breach_shield'},
    bruiser:{common:'assault heavy brawler vanguard rally resupply triage_rig',uncommon:'breacher gunner bombard ambush collision_crew counterpuncher',rare:'shock_runner breach_caller pavise_breaker surge_drummers',epic:'commander banner rupture_heavy overrun_charge',legendary:'ram_team breakthrough_gunner'},
    syndicate:{common:'security enforcer courier intel precision_strike counter cover_protocol',uncommon:'observer coordinator contractor disrupt patch_team rapid_detail',rare:'tactical_medic signal_lock target_designator fire_coordinator',epic:'commander relay screen_operator breach_monitor',legendary:'eliminator field_link'},
    nightwalker:{common:'blade stalker assault recon withdraw strike decoy_patrol',uncommon:'marksman saboteur ambush scout false_route handler',rare:'blackout ghost_extraction exposure_window misfire_team',epic:'commander beacon shadow_handler route_keeper',legendary:'silencer crossfire_cell'},
    rogue:{common:'outrider skirmisher scrapper reclaim rally retreat raid',uncommon:'salvage trailguard raider repair_courier route_scout wandering_medic',rare:'broker bulwark lancer scrap_hauler',epic:'commander workshop patchguard rolling_cache',legendary:'field_options field_negotiator'}
  });
  // Collection catalogs grow with the active release; original owned starters
  // remain exactly the frozen Sprint 7 grant. Expansion cards are not granted.
  const CurrentDecks=Decks.forData(Data),STARTER_DECKS=freeze(Decks.forData(Balance.dataFor('sprint7')).starters());
  const STARTER_COLLECTION={};
  for(const deck of STARTER_DECKS){
    const legality=CurrentDecks.validate(deck);
    if(!legality.legal)throw new Error('Collection starter is not legal: '+legality.errors.join(' '));
    for(const [id,count] of Object.entries(legality.counts))STARTER_COLLECTION[id]=Math.max(STARTER_COLLECTION[id]||0,count);
  }
  freeze(STARTER_COLLECTION);
  const CommanderDecks=Decks.forData(Balance.dataFor(Balance.DEFAULT_PROFILE));
  const COMMANDER_STARTERS=freeze(CommanderDecks.commanderStarters?.()||[]);
  const COMMANDER_CARD_GRANT=freeze(CommanderDecks.starterGrant?.()||STARTER_COLLECTION);
  const COMMANDER_GRANT_VERSION=1;
  const commanderRow=id=>({id,owned:true,variants:['standard'],preferredVariant:'standard',mastery:{matches:0,victories:0,activations:0}});
  function grantCommanders(profile){
    if(profile.commanderGrantVersion===COMMANDER_GRANT_VERSION)return false;
    profile.commanders=profile.commanders||{};
    for(const c of Commanders?.list()||[])profile.commanders[c.id]=profile.commanders[c.id]||commanderRow(c.id);
    for(const [id,count]of Object.entries(COMMANDER_CARD_GRANT)){const row=profile.cards[id];if(row&&row.copies<count){row.copies=count;if(!row.variants.includes('standard'))row.variants.push('standard');}}
    profile.commanderGrantVersion=COMMANDER_GRANT_VERSION;return true;
  }
  const PACKS={};
  function pack(id,name,price,factions,odds,minRarity,description){return {id,name,price,cardsPerPack:5,factions,allowedFactions:factions,enabled:true,family:id,odds,guarantees:[{slot:4,minRarity}],pity:{...ECONOMY.pity},cosmeticOdds:{...ECONOMY.cosmeticOdds},duplicateBehavior:'excess-to-supply',commanderWeight:0,reveal:'individual-or-all',description};}
  const factions=Object.keys(Data.FACTIONS);
  PACKS.standard=pack('standard','Standard Pack',100,factions,{common:.60,uncommon:.27,rare:.09,epic:.035,legendary:.005},'uncommon','Five cards across all factions. At least one Uncommon or better.');
  for(const faction of factions)PACKS[faction]=pack(faction,Data.FACTIONS[faction].name+' Pack',140,[faction],{common:.55,uncommon:.29,rare:.11,epic:.04,legendary:.01},'uncommon','Five '+Data.FACTIONS[faction].name+' cards. At least one Uncommon or better.');
  PACKS.veteran=pack('veteran','Veteran Pack',200,factions,{common:.36,uncommon:.34,rare:.20,epic:.085,legendary:.015},'rare','Five cards with improved Rare+ odds. At least one Rare or better.');
  PACKS.elite=pack('elite','Elite Pack',350,factions,{common:.15,uncommon:.32,rare:.32,epic:.17,legendary:.04},'epic','Five cards with improved Epic/Legendary odds. At least one Epic or better.');
  PACKS.commander={id:'commander',name:'Commander Pack',price:0,cardsPerPack:0,factions:[],allowedFactions:[],enabled:false,family:'commander',odds:{},guarantees:[],pity:{...ECONOMY.pity},commanderWeight:1,reveal:'commander',description:'All ten launch Commanders are granted free. Commander cosmetic packs are planned for a future release.'};
  freeze(PACKS);
  const CARD_META={};
  for(const [faction,groups] of Object.entries(RARITY_GROUPS))for(const [rarity,keys] of Object.entries(groups))for(const key of keys.split(' ')){
    const id=faction+'_'+key,card=Data.CARDS[id];
    if(!card||has(CARD_META,id))throw new Error('Invalid collectible card classification: '+id);
    CARD_META[id]={id,faction,rarity,starter:has(STARTER_COLLECTION,id),starterCopies:STARTER_COLLECTION[id]||0,commanderStarterCopies:COMMANDER_CARD_GRANT[id]||0,packAvailable:true,pools:['standard',faction,'veteran','elite'],craftCost:ECONOMY.craftCosts[rarity],duplicateSupply:ECONOMY.duplicateSupply[rarity],copyLimit:CurrentDecks.copyLimit(card),variants:Object.keys(VARIANTS)};
  }
  // Explicit card-level rarity is authoritative only for this new set. Legacy
  // metadata above, odds, pity, mastery and schema version remain unchanged.
  for(const card of Object.values(Data.CARDS).filter(c=>c.set==='tactical-011')){
    const {id,faction,rarity}=card;
    if(has(CARD_META,id)||!RARITIES.includes(rarity))throw new Error('Invalid tactical collectible classification: '+id);
    CARD_META[id]={id,faction,rarity,starter:false,starterCopies:0,commanderStarterCopies:0,packAvailable:true,pools:['standard',faction,'veteran','elite'],craftCost:ECONOMY.craftCosts[rarity],duplicateSupply:ECONOMY.duplicateSupply[rarity],copyLimit:CurrentDecks.copyLimit(card),variants:Object.keys(VARIANTS),set:'tactical-011'};
  }
  if(Object.keys(CARD_META).length!==Object.keys(Data.CARDS).length)throw new Error('Every gameplay card needs explicit collectible metadata.');
  freeze(CARD_META);
  const MASTER_STATS=Object.keys(ECONOMY.masteryWeights);
  const emptyMastery=()=>Object.fromEntries(['points',...MASTER_STATS].map(key=>[key,0]));
  // Keep the original entitlement list and preferredVariant for old saves and
  // callers. Prestige is an additive presentation/history view, never rules.
  const PRESTIGE_VERSION=1,COSMETIC_VARIANTS=freeze(['standard','foil','fullArt']),WEAR_VARIANTS=freeze(['standard','fieldWorn','battleHardened','veteran']);
  function validDate(value){return typeof value==='string'&&value.length<=40&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;}
  function historyFor(row,acquiredAt){
    return {version:PRESTIGE_VERSION,firstAcquiredDate:row.copies>0&&validDate(acquiredAt)?acquiredAt:null,
      firstAcquiredKnown:row.copies>0&&validDate(acquiredAt),matchesUsed:0,
      deployments:row.mastery.deployments,winsIncluded:row.mastery.victories,
      historyComplete:validDate(acquiredAt)||row.copies===0,lastProgress:null};
  }
  function cosmeticsFor(row){
    const legacy=row.preferredVariant;
    return {version:PRESTIGE_VERSION,preferredVariant:COSMETIC_VARIANTS.includes(legacy)||legacy==='random'?legacy:'standard',
      preferredWear:WEAR_VARIANTS.includes(legacy)?legacy:'standard',favorite:false};
  }
  function ensurePrestige(row,acquiredAt){
    if(!row.history)row.history=historyFor(row,acquiredAt);
    if(!row.cosmetics)row.cosmetics=cosmeticsFor(row);
  }
  function cardId(card){return typeof card==='string'?card:card?.cardId||card?.id;}
  function metadata(card){const id=cardId(card);return has(CARD_META,id)?CARD_META[id]:null;}
  function copyLimit(card){return metadata(card)?.copyLimit||CurrentDecks.copyLimit(card);}
  function integer(value,max=1000000000){return Number.isSafeInteger(value)&&value>=0&&value<=max;}
  function freshSeed(){return ((Date.now()>>>0)^Math.floor(Math.random()*4294967296))>>>0||1;}
  function createProfile(options={}){
    const seed=integer(options.seed,4294967295)?options.seed||1:freshSeed();
    const cards={};
    for(const meta of Object.values(CARD_META))cards[meta.id]={id:meta.id,faction:meta.faction,rarity:meta.rarity,copies:Math.max(meta.starterCopies,COMMANDER_CARD_GRANT[meta.id]||0),variants:meta.starter||COMMANDER_CARD_GRANT[meta.id]>0?['standard']:[],preferredVariant:'standard',mastery:emptyMastery(),newlyAcquired:false,starter:meta.starter};
    for(const row of Object.values(cards))ensurePrestige(row,options.acquiredAt);
    return {version:VERSION,schemaVersion:SCHEMA_VERSION,prestigeVersion:PRESTIGE_VERSION,revision:0,migrated:options.migrated===true,starterGrantVersion:1,credits:options.migrated?ECONOMY.migrationCredits:ECONOMY.startingCredits,supply:ECONOMY.startingSupply,rngState:seed,cards,pity:{},packs:[],packsOpened:0,purchases:{},craftRequests:{},rewards:{},tutorials:{},firstMatchRewarded:false,commanderGrantVersion:COMMANDER_GRANT_VERSION,commanders:Object.fromEntries((Commanders?.list()||[]).map(c=>[c.id,commanderRow(c.id)]))};
  }
  function storageFor(storage){if(storage)return storage;try{return root.localStorage||null;}catch(_){return null;}}
  function migratedProfile(storage){return ['frontlines.decks.v1','frontlines.settings.v1'].some(key=>storage.getItem(key)!==null);}
  function validateProfile(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.schemaVersion!==SCHEMA_VERSION)throw new Error('Unsupported collection format.');
    for(const field of ['revision','credits','supply','rngState','packsOpened'])if(!integer(raw[field],field==='rngState'?4294967295:1000000000))throw new Error('Invalid collection '+field+'.');
    for(const field of ['cards','pity','purchases','craftRequests','rewards','tutorials'])if(!raw[field]||typeof raw[field]!=='object'||Array.isArray(raw[field]))throw new Error('Invalid collection '+field+'.');
    if(!Array.isArray(raw.packs))throw new Error('Invalid saved packs.');
    const result=clone(raw);
    if(result.prestigeVersion!==undefined&&result.prestigeVersion!==PRESTIGE_VERSION)throw new Error('Unsupported collection prestige format.');
    if(result.commanderGrantVersion!==undefined&&(!integer(result.commanderGrantVersion,COMMANDER_GRANT_VERSION)))throw new Error('Unsupported Commander collection format.');
    if(result.commanders!==undefined){
      if(!result.commanders||typeof result.commanders!=='object'||Array.isArray(result.commanders))throw new Error('Invalid Commander collection.');
      for(const c of Commanders?.list()||[]){const row=result.commanders[c.id]||(result.commanders[c.id]=commanderRow(c.id));if(typeof row.owned!=='boolean'||!Array.isArray(row.variants)||row.variants.some(v=>typeof v!=='string')||typeof row.preferredVariant!=='string')throw new Error('Invalid Commander cosmetics: '+c.id);if(row.mastery&&['matches','victories','activations'].some(k=>!integer(row.mastery[k]||0)))throw new Error('Invalid Commander mastery: '+c.id);}
    }
    for(const meta of Object.values(CARD_META)){
      let row=result.cards[meta.id];
      // Missing newly introduced card entries recover as unowned, retaining all
      // old and unknown fields. The one-time starter grant is never reapplied.
      if(!row){row=createProfile({seed:1}).cards[meta.id];row.copies=0;row.variants=[];result.cards[meta.id]=row;}
      if(!integer(row.copies,meta.copyLimit))throw new Error('Invalid saved ownership: '+meta.id+'.');
      if(!Array.isArray(row.variants)||row.variants.some(id=>typeof id!=='string')||row.copies>0&&!row.variants.includes('standard'))throw new Error('Invalid saved cosmetics: '+meta.id+'.');
      if(!row.mastery||MASTER_STATS.concat('points').some(key=>!integer(row.mastery[key])))throw new Error('Invalid saved mastery: '+meta.id+'.');
      row.id=meta.id;row.faction=meta.faction;row.rarity=meta.rarity;row.starter=meta.starter;
      if(row.preferredVariant!=='random'&&!row.variants.includes(row.preferredVariant))row.preferredVariant='standard';
      row.newlyAcquired=row.newlyAcquired===true;
      ensurePrestige(row);
      const history=row.history,cosmetics=row.cosmetics;
      if(!history||typeof history!=='object'||Array.isArray(history)||history.version!==PRESTIGE_VERSION||
        ['matchesUsed','deployments','winsIncluded'].some(key=>!integer(history[key]))||
        (history.firstAcquiredDate!==null&&!validDate(history.firstAcquiredDate))||
        typeof history.firstAcquiredKnown!=='boolean'||typeof history.historyComplete!=='boolean'||
        (history.firstAcquiredKnown&&history.firstAcquiredDate===null))throw new Error('Invalid card history: '+meta.id+'.');
      if(history.lastProgress!==null&&(!history.lastProgress||typeof history.lastProgress!=='object'||Array.isArray(history.lastProgress)||
        !integer(history.lastProgress.points,100000)||typeof history.lastProgress.reason!=='string'||history.lastProgress.reason.length>400))throw new Error('Invalid last mastery progress: '+meta.id+'.');
      if(!cosmetics||typeof cosmetics!=='object'||Array.isArray(cosmetics)||cosmetics.version!==PRESTIGE_VERSION||
        !COSMETIC_VARIANTS.concat('random').includes(cosmetics.preferredVariant)||!WEAR_VARIANTS.includes(cosmetics.preferredWear)||
        typeof cosmetics.favorite!=='boolean')throw new Error('Invalid separated cosmetics: '+meta.id+'.');
    }
    for(const counter of Object.values(result.pity))if(!counter||['rare','epic','legendary'].some(key=>!integer(counter[key])))throw new Error('Invalid saved pity counters.');
    const packIds=new Set();
    for(const record of result.packs){
      const def=PACKS[record?.definitionId];
      if(!def||!def.enabled||typeof record.id!=='string'||!record.id||packIds.has(record.id)||!Array.isArray(record.contents)||record.contents.length!==def.cardsPerPack||typeof record.claimed!=='boolean')throw new Error('Invalid saved pack.');
      packIds.add(record.id);
      for(const item of record.contents){const meta=metadata(item?.cardId);if(!meta||item.rarity!==meta.rarity||!def.factions.includes(meta.faction)||!has(VARIANTS,item.variant))throw new Error('Invalid saved pack contents.');}
    }
    return result;
  }
  function read(storage,initialize=true){
    const store=storageFor(storage),preview=createProfile({seed:1});
    if(!store)return {profile:preview,blocked:true,warnings:['Local storage is unavailable. Collection purchases and rewards need a persistent save.'],raw:null};
    let raw;
    try{
      raw=store.getItem(STORAGE_KEY);
      if(raw===null){const profile=createProfile({migrated:migratedProfile(store),acquiredAt:new Date().toISOString()});if(initialize)store.setItem(STORAGE_KEY,JSON.stringify(profile));return {profile,blocked:false,warnings:[],raw:null};}
      const profile=validateProfile(JSON.parse(raw)),granted=grantCommanders(profile);
      const prestigeMigrated=profile.prestigeVersion!==PRESTIGE_VERSION;
      if(prestigeMigrated)profile.prestigeVersion=PRESTIGE_VERSION;
      if((granted||prestigeMigrated)&&initialize){profile.revision++;store.setItem(STORAGE_KEY,JSON.stringify(profile));}
      return {profile,blocked:false,warnings:[],raw};
    }catch(error){return {profile:preview,blocked:true,warnings:['Collection save could not be read. Your original data is preserved; export recovery data before resetting it. '+error.message],raw};}
  }
  function load(storage){const record=read(storage);return record.blocked?{...record.profile,readOnly:true,storageWarning:record.warnings[0]}:record.profile;}
  function diagnostics(storage){const {blocked,warnings}=read(storage);return {blocked,warnings};}
  function recoveryExport(storage){const store=storageFor(storage);if(!store)throw new Error('Local storage is unavailable.');return store.getItem(STORAGE_KEY)||'';}
  function transaction(storage,fn){
    try{
      const store=storageFor(storage);if(!store)throw new Error('Local storage is unavailable.');
      const saved=read(store);if(saved.blocked)throw new Error(saved.warnings[0]);
      const profile=saved.profile,result=fn(profile);
      if(result.changed!==false){profile.revision++;validateProfile(profile);store.setItem(STORAGE_KEY,JSON.stringify(profile));}
      const output={...result,ok:true,profile:clone(profile)};delete output.changed;return output;
    }catch(error){return {ok:false,error:error.message};}
  }
  // Xorshift state is serialized. Pack generation uses no ambient randomness.
  function nextRandom(cursor){let n=cursor.rngState||1;n^=n<<13;n^=n>>>17;n^=n<<5;cursor.rngState=n>>>0;return cursor.rngState/4294967296;}
  function weighted(weights,rng,minIndex=0){
    const values=Object.entries(weights).filter(([key,value])=>value>0&&(RARITIES.includes(key)?RARITIES.indexOf(key)>=minIndex:true));
    const sum=values.reduce((total,[,value])=>total+value,0);if(!sum)throw new Error('Pack weights contain no valid choices.');
    let choice=rng()*sum;for(const [key,weight] of values){choice-=weight;if(choice<0)return key;}return values.at(-1)[0];
  }
  function generatePack(definitionId,seedOrCursor,pity={rare:0,epic:0,legendary:0}){
    const def=PACKS[definitionId];if(!def?.enabled)throw new Error('This pack is unavailable.');
    const cursor=typeof seedOrCursor==='object'?{rngState:seedOrCursor.rngState}:{rngState:(Number(seedOrCursor)>>>0)||1};
    const rng=()=>nextRandom(cursor),contents=[];
    let pityFloor=0;
    for(const rarity of ['rare','epic','legendary'])if((pity[rarity]||0)+1>=def.pity[rarity])pityFloor=Math.max(pityFloor,RARITIES.indexOf(rarity));
    for(let slot=0;slot<def.cardsPerPack;slot++){
      let minIndex=slot===def.cardsPerPack-1?pityFloor:0;
      for(const guarantee of def.guarantees)if(guarantee.slot===slot)minIndex=Math.max(minIndex,RARITIES.indexOf(guarantee.minRarity));
      const rarity=weighted(def.odds,rng,minIndex),pool=Object.values(CARD_META).filter(meta=>meta.packAvailable&&meta.rarity===rarity&&def.factions.includes(meta.faction));
      if(!pool.length)throw new Error('Pack contains an empty rarity pool.');
      const meta=pool[Math.floor(rng()*pool.length)],variant=weighted(def.cosmeticOdds,rng);
      contents.push({cardId:meta.id,rarity,variant});
    }
    const highest=Math.max(...contents.map(item=>RARITIES.indexOf(item.rarity))),nextPity={};
    for(const rarity of ['rare','epic','legendary'])nextPity[rarity]=highest>=RARITIES.indexOf(rarity)?0:(pity[rarity]||0)+1;
    return {contents,rngState:cursor.rngState,pity:nextPity,pityApplied:pityFloor?RARITIES[pityFloor]:null};
  }
  function requestKey(value){if(typeof value!=='string'||!/^[-\w.:]{1,160}$/.test(value)||has(Object.prototype,value)||value==='prototype')throw new Error('Use a valid transaction ID.');return value;}
  function purchasePack(definitionId,storage,options={}){
    return transaction(storage,profile=>{
      const requestId=requestKey(options.requestId||'purchase-'+profile.revision+'-'+profile.packs.length);
      if(has(profile.purchases,requestId)){const record=profile.packs.find(pack=>pack.id===profile.purchases[requestId]);if(!record||record.definitionId!==definitionId)throw new Error('Transaction ID was used for a different pack.');return {pack:clone(record),alreadyPurchased:true,changed:false};}
      const def=PACKS[definitionId];if(!def?.enabled)throw new Error('This pack is unavailable. Launch Commanders are granted automatically; cosmetic packs are planned.');
      if(profile.credits<def.price)throw new Error('Not enough Credits. This pack costs '+def.price+'.');
      const generated=generatePack(definitionId,profile,profile.pity[def.family]||{}),id='pack-'+profile.revision+'-'+profile.packs.length+'-'+profile.rngState.toString(36);
      const record={id,definitionId,name:def.name,price:def.price,contents:generated.contents,pityApplied:generated.pityApplied,claimed:false,acquisitions:[],supplyGained:0};
      profile.credits-=def.price;profile.rngState=generated.rngState;profile.pity[def.family]=generated.pity;profile.packs.push(record);profile.purchases[requestId]=id;
      return {pack:clone(record),alreadyPurchased:false};
    });
  }
  function acquire(profile,item){
    const meta=metadata(item.cardId),row=profile.cards[item.cardId],newCard=row.copies===0,newVariant=!row.variants.includes(item.variant);
    let copiesAdded=0,duplicateSupply=0;
    if(row.copies<meta.copyLimit){row.copies++;copiesAdded=1;}else duplicateSupply+=meta.duplicateSupply;
    if(!row.variants.includes('standard'))row.variants.push('standard');
    if(newVariant&&!row.variants.includes(item.variant))row.variants.push(item.variant);
    else if(!newVariant&&item.variant!=='standard')duplicateSupply+=ECONOMY.cosmeticDuplicateSupply;
    row.newlyAcquired=true;profile.supply+=duplicateSupply;
    if(newCard&&row.history.firstAcquiredDate===null){row.history.firstAcquiredDate=new Date().toISOString();row.history.firstAcquiredKnown=true;row.history.historyComplete=true;}
    return {...item,newCard,newVariant:item.variant!=='standard'&&newVariant,copiesAdded,duplicateSupply};
  }
  function claimPack(id,storage){
    return transaction(storage,profile=>{
      const pack=profile.packs.find(record=>record.id===id);if(!pack)throw new Error('Saved pack not found.');
      if(pack.claimed)return {pack:clone(pack),acquisitions:clone(pack.acquisitions),supplyGained:pack.supplyGained,alreadyClaimed:true,changed:false};
      pack.acquisitions=pack.contents.map(item=>acquire(profile,item));pack.supplyGained=pack.acquisitions.reduce((total,item)=>total+item.duplicateSupply,0);pack.claimed=true;profile.packsOpened++;
      return {pack:clone(pack),acquisitions:clone(pack.acquisitions),supplyGained:pack.supplyGained,alreadyClaimed:false};
    });
  }
  function craft(id,storage,options={}){
    return transaction(storage,profile=>{
      const requestId=requestKey(options.requestId||'craft-'+profile.revision+'-'+id);
      if(has(profile.craftRequests,requestId)){const receipt=profile.craftRequests[requestId];if(receipt.cardId!==id)throw new Error('Transaction ID was used for a different card.');return {...clone(receipt),card:clone(profile.cards[id]),alreadyCrafted:true,changed:false};}
      const meta=metadata(id);if(!meta?.packAvailable)throw new Error('This card is currently unavailable for crafting.');
      if(profile.cards[id].copies>=meta.copyLimit)throw new Error('You already own the legal copy limit.');
      if(profile.supply<meta.craftCost)throw new Error('Not enough Supply. This card costs '+meta.craftCost+'.');
      profile.supply-=meta.craftCost;acquire(profile,{cardId:id,rarity:meta.rarity,variant:'standard'});
      const receipt={cardId:id,cost:meta.craftCost};profile.craftRequests[requestId]=receipt;
      return {...receipt,card:clone(profile.cards[id]),alreadyCrafted:false};
    });
  }
  function ownedCount(card,profile){return (profile||load()).cards?.[cardId(card)]?.copies||0;}
  function canUseDeck(deck,profile){
    const current=profile||load(),counts={},missing=[];
    for(const id of deck?.cards||[])counts[id]=(counts[id]||0)+1;
    for(const [id,required] of Object.entries(counts)){const owned=ownedCount(id,current);if(required>owned)missing.push({cardId:id,owned,required,missing:required-owned});}
    return {complete:missing.length===0,missing};
  }
  function setPreferredVariant(id,variant,storage){
    return transaction(storage,profile=>{
      const row=profile.cards[id];if(!metadata(id)||!row?.copies)throw new Error('Own this card before selecting its cosmetic treatment.');
      if(variant!=='random'&&(!has(VARIANTS,variant)||!row.variants.includes(variant)))throw new Error('This cosmetic variant is not owned.');
      row.preferredVariant=variant;
      if(WEAR_VARIANTS.includes(variant)&&variant!=='standard')row.cosmetics.preferredWear=variant;
      else row.cosmetics.preferredVariant=variant;
      return {card:clone(row)};
    });
  }
  function setCosmeticPreferences(id,options,storage){
    return transaction(storage,profile=>{
      const row=profile.cards[id];if(!metadata(id))throw new Error('Unknown card.');
      if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(key=>!['variant','wear','favorite'].includes(key)))throw new Error('Use cosmetic variant, wear or favorite preferences.');
      if(has(options,'variant')){
        if(!row?.copies)throw new Error('Own this card before selecting its cosmetic treatment.');
        if(options.variant!=='random'&&(!COSMETIC_VARIANTS.includes(options.variant)||!row.variants.includes(options.variant)))throw new Error('This cosmetic variant is not owned.');
      }
      if(has(options,'wear')){
        if(!row?.copies)throw new Error('Own this card before selecting its mastery treatment.');
        if(!WEAR_VARIANTS.includes(options.wear)||(options.wear!=='standard'&&!row.variants.includes(options.wear)))throw new Error('This mastery treatment is not unlocked.');
      }
      if(has(options,'favorite')&&typeof options.favorite!=='boolean')throw new Error('Favorite must be true or false.');
      const before=JSON.stringify({cosmetics:row.cosmetics,preferredVariant:row.preferredVariant});
      if(has(options,'variant')){row.cosmetics.preferredVariant=options.variant;row.preferredVariant=options.variant;}
      if(has(options,'wear'))row.cosmetics.preferredWear=options.wear;
      if(has(options,'favorite'))row.cosmetics.favorite=options.favorite;
      return {card:clone(row),cosmeticState:cosmeticState(id,profile),changed:before!==JSON.stringify({cosmetics:row.cosmetics,preferredVariant:row.preferredVariant})};
    });
  }
  function setFavorite(id,favorite,storage){return setCosmeticPreferences(id,{favorite},storage);}
  function cosmeticState(card,profile,seed){
    const current=profile||load(),id=cardId(card),row=current.cards?.[id],owned=(row?.copies||0)>0,preferences=row?.cosmetics||cosmeticsFor(row||{});
    const unlockedVariants=owned?COSMETIC_VARIANTS.filter(variant=>row.variants?.includes(variant)):['standard'];
    const unlockedWear=owned?WEAR_VARIANTS.filter(wear=>wear==='standard'||row.variants?.includes(wear)):['standard'];
    let variant=preferences.preferredVariant;
    if(variant==='random')variant=unlockedVariants[Math.floor(nextRandom({rngState:seed===undefined?current.rngState:Number(seed)>>>0})*unlockedVariants.length)]||'standard';
    if(!unlockedVariants.includes(variant))variant='standard';
    return {rarity:metadata(id)?.rarity||null,owned,variant,wear:unlockedWear.includes(preferences.preferredWear)?preferences.preferredWear:'standard',
      favorite:preferences.favorite===true,unlockedVariants,unlockedWear};
  }
  function masterySummary(card,profile){
    const current=profile||load(),row=current.cards?.[cardId(card)],mastery=row?.mastery||emptyMastery(),history=row?.history||historyFor({copies:row?.copies||0,mastery});
    const earned=ECONOMY.masteryMilestones.filter(milestone=>mastery.points>=milestone.points||row?.variants?.includes(milestone.variant));
    const level=earned.at(-1)?.variant||'standard',next=ECONOMY.masteryMilestones.find(milestone=>milestone.points>mastery.points&&!row?.variants?.includes(milestone.variant));
    const lastProgressReason=history.lastProgress?.reason||(!history.historyComplete&&mastery.points>0?'Existing mastery is preserved. Detailed matches-used history starts with Arsenal Prestige.':'Deploy or play this card in a completed match to earn mastery.');
    return {points:mastery.points,level,levelLabel:VARIANTS[level].label,matchesUsed:history.matchesUsed,deployments:history.deployments,
      winsIncluded:history.winsIncluded,firstAcquiredDate:history.firstAcquiredDate,firstAcquiredKnown:history.firstAcquiredKnown,
      historyComplete:history.historyComplete,legacyMatchesIncluded:mastery.matchesIncluded,lastProgressReason,
      lastProgressPoints:history.lastProgress?.points||0,nextMilestone:next?{points:next.points,wear:next.variant,label:VARIANTS[next.variant].label,remaining:Math.max(0,next.points-mastery.points)}:null};
  }
  function variantFor(card,profile,seed){
    const current=profile||load(),row=current.cards?.[cardId(card)];if(!row?.copies)return 'standard';
    if(row.preferredVariant==='random'){const variants=row.variants.filter(id=>has(VARIANTS,id));return variants.length?variants[Math.floor(nextRandom({rngState:seed===undefined?current.rngState:Number(seed)>>>0})*variants.length)]:'standard';}
    return has(VARIANTS,row.preferredVariant)&&row.variants.includes(row.preferredVariant)?row.preferredVariant:'standard';
  }
  function markSeen(id,storage){return transaction(storage,profile=>{if(id!==undefined&&!metadata(id))throw new Error('Unknown card.');for(const row of Object.values(profile.cards))if(id===undefined||row.id===id)row.newlyAcquired=false;return {};});}
  function rewardEligibility(match){
    if(!match||match.completed!==true)return 'Complete the match to earn rewards.';
    if(match.human!==true||match.allAI||match.simulation||match.warRoom||['warroom','war-room','simulation','simulator','ai-vs-ai'].includes(String(match.mode||'').toLowerCase()))return 'AI self-play and War Room do not award progression.';
    if(match.practice||match.tutorial||match.nonCompetitive||['practice','training','tutorial'].includes(String(match.mode||'').toLowerCase()))return 'Practice and tutorial matches do not award match progression.';
    if(match.conceded||match.concede)return 'Conceded matches do not award progression.';
    // v1.0.5 normal matches pay on an authoritative completed outcome, including
    // short defeats. Keep the original policy available for historical callers.
    if(match.rewardPolicy!=='completed-match-v2'&&(!integer(match.ownTurns)||match.ownTurns<ECONOMY.eligibility.minimumOwnTurns||!integer(match.meaningfulActions)||match.meaningfulActions<ECONOMY.eligibility.minimumMeaningfulActions))return 'Play at least four of your turns and take four meaningful actions to earn progression.';
    if(typeof match.victory!=='boolean')return 'The match result is unresolved.';
    return null;
  }
  function applyMastery(profile,match){
    const gains=[];
    for(const id of new Set(match.deckCardIds||[])){
      const row=profile.cards[id];if(!metadata(id)||!row?.copies)continue;
      const stats=match.cardStats?.[id]||{},delta={matchesIncluded:1,victories:match.victory?1:0};
      const aliases={eliminations:'kills',territoriesInfluenced:'captureContributions',factionActions:'passiveTriggers'};
      for(const key of MASTER_STATS.filter(key=>!['matchesIncluded','victories'].includes(key))){const amount=stats[key]??stats[aliases[key]];delta[key]=integer(amount,10000)?amount:0;}
      // Deck inclusion remains a historical counter, but cannot farm wear.
      // A real observed action is required for new mastery points/matches-used.
      const used=Object.entries(delta).some(([key,value])=>!['matchesIncluded','victories'].includes(key)&&value>0)||['plays','orders'].some(key=>integer(stats[key],10000)&&stats[key]>0);
      const points=used?Object.entries(delta).reduce((sum,[key,value])=>sum+value*ECONOMY.masteryWeights[key],0):0,unlocks=[];
      for(const [key,value] of Object.entries(delta))row.mastery[key]+=value;
      row.history.winsIncluded+=delta.victories;
      row.history.deployments+=delta.deployments;
      if(!used)continue;
      row.history.matchesUsed++;
      row.mastery.points+=points;
      const details=[];
      for(const [key,value] of Object.entries(delta))if(value>0&&!['matchesIncluded','victories'].includes(key))details.push(value+' '+({deployments:'deployment',attacks:'attack',eliminations:'elimination',territoriesInfluenced:'territory contribution',factionActions:'faction action'}[key])+(value===1?'':'s'));
      if(!details.length)details.push('a played order');
      row.history.lastProgress={points,reason:details.join(', ')+(match.victory?' in a victory.':' in a completed match.')};
      for(const milestone of ECONOMY.masteryMilestones)if(row.mastery.points>=milestone.points&&!row.variants.includes(milestone.variant)){row.variants.push(milestone.variant);row.newlyAcquired=true;unlocks.push(milestone.variant);}
      gains.push({cardId:id,points,totalPoints:row.mastery.points,unlocks,stats:delta});
    }
    return gains;
  }
  function rewardMatch(match,storage){
    const reason=rewardEligibility(match);if(reason)return {ok:true,eligible:false,creditsEarned:0,masteryGains:[],sources:[],reason,profile:load(storage)};
    return transaction(storage,profile=>{
      const id=requestKey(match.id);
      if(has(profile.rewards,id))return {...clone(profile.rewards[id]),alreadyRewarded:true,changed:false};
      const sources=[{name:'Match completion',credits:ECONOMY.rewards.completion},{name:match.victory?'Victory':'Defeat',credits:match.victory?ECONOMY.rewards.victory:ECONOMY.rewards.defeat}];
      if(!profile.firstMatchRewarded){sources.push({name:'First completed match',credits:ECONOMY.rewards.firstMatch});profile.firstMatchRewarded=true;}
      const creditsEarned=sources.reduce((total,item)=>total+item.credits,0);profile.credits+=creditsEarned;
      const leader=profile.commanders?.[match.commanderId];let commanderMastery=null;
      if(leader?.owned){leader.mastery=leader.mastery||{matches:0,victories:0,activations:0};leader.mastery.matches++;if(match.victory)leader.mastery.victories++;if(match.commanderActiveUsed)leader.mastery.activations++;commanderMastery={id:match.commanderId,...clone(leader.mastery)};}
      const receipt={eligible:true,id,creditsEarned,newBalance:profile.credits,sources,masteryGains:applyMastery(profile,match),commanderMastery};profile.rewards[id]=receipt;
      return {...clone(receipt),alreadyRewarded:false};
    });
  }
  // Private friend matches record observed participation only. Currency, Supply,
  // packs and the first normal-match bonus remain reserved for ordinary play.
  function rewardPrivateMatch(match,storage){
    const reason=!match||match.completed!==true||typeof match.victory!=='boolean'
      ?'Complete the private match to record mastery.'
      :match.conceded||match.reason==='concede'||match.abandoned
        ?'Conceded or abandoned private matches do not award progression.'
        :!Array.isArray(match.usedCards)||!match.usedCards.length
          ?'No cards were used in this private match.':null;
    if(reason)return {ok:true,eligible:false,creditsEarned:0,masteryGains:[],sources:[],reason,profile:load(storage)};
    return transaction(storage,profile=>{
      const id=requestKey('private-'+requestKey(match.id));
      if(has(profile.rewards,id))return {...clone(profile.rewards[id]),alreadyRewarded:true,changed:false};
      const used=[...new Set(match.usedCards)].filter(card=>metadata(card)&&['deployments','orders','plays'].some(key=>integer(match.cardStats?.[card]?.[key],10000)&&match.cardStats[card][key]>0));
      const earned={...match,deckCardIds:used};
      let commanderMastery=null;const leader=profile.commanders?.[match.commanderId];
      if(used.length&&leader?.owned){leader.mastery=leader.mastery||{matches:0,victories:0,activations:0};leader.mastery.matches++;if(match.victory)leader.mastery.victories++;if(match.commanderActiveUsed===true)leader.mastery.activations++;commanderMastery={id:match.commanderId,...clone(leader.mastery)};}
      const receipt={id,eligible:used.length>0,privateMatch:true,policy:'mastery-only',creditsEarned:0,newBalance:profile.credits,
        sources:[],masteryGains:applyMastery(profile,earned),commanderMastery,
        reason:'Private matches record used-card mastery and wear; Credits, Supply and packs are not awarded.'};
      profile.rewards[id]=receipt;return {...clone(receipt),alreadyRewarded:false};
    });
  }
  function completeTutorial(id,storage){
    return transaction(storage,profile=>{
      requestKey(id);
      // One entire tutorial reward per profile, even after restart or new lesson
      // identifiers. The caller invokes this only on completed training.
      if(Object.keys(profile.tutorials).length)return {creditsEarned:0,alreadyRewarded:true,changed:false};
      profile.credits+=ECONOMY.rewards.tutorial;profile.tutorials[id]=true;
      return {creditsEarned:ECONOMY.rewards.tutorial,newBalance:profile.credits,alreadyRewarded:false,sources:[{name:'Tutorial completion',credits:ECONOMY.rewards.tutorial}]};
    });
  }
  function summary(profile){
    const current=profile||load(),rows=Object.values(CARD_META),factionSummary={},rarities={};
    for(const faction of factions)factionSummary[faction]={total:0,owned:0,completion:0};
    for(const rarity of RARITIES)rarities[rarity]={total:0,owned:0};
    let uniqueOwned=0,copiesOwned=0,mastered=0;const recentlyAcquired=[];
    for(const meta of rows){const row=current.cards?.[meta.id],owned=(row?.copies||0)>0;factionSummary[meta.faction].total++;rarities[meta.rarity].total++;if(owned){uniqueOwned++;copiesOwned+=row.copies;factionSummary[meta.faction].owned++;rarities[meta.rarity].owned++;}if(row?.variants?.includes('veteran'))mastered++;if(row?.newlyAcquired)recentlyAcquired.push(meta.id);}
    for(const faction of Object.values(factionSummary))faction.completion=faction.owned/faction.total;
    return {commanders:{total:Commanders?.list().length||0,owned:(Commanders?.list()||[]).filter(c=>current.commanders?.[c.id]?.owned).length},total:rows.length,uniqueOwned,copiesOwned,completion:uniqueOwned/rows.length,factions:factionSummary,rarities,credits:current.credits,supply:current.supply,packsOpened:current.packsOpened,mastered,recentlyAcquired};
  }
  /* Public API: purchases save durable packs, then claimPack(instanceId) grants
   * their contents exactly once. Supply/craft and reward receipts are persisted.
   * Caller passes a stable options.requestId to retry a purchase/craft safely.
   * rewardMatch: {id,completed,human:true,mode,ownTurns,meaningfulActions,victory,
   *   deckCardIds,cardStats:{[cardId]:{deployments,attacks,eliminations,
   *   territoriesInfluenced,factionActions}}}. No simulation ever calls it.
   * canUseDeck is ownership-only; CurrentDecks.validate remains legality-only.
   */
  return {VERSION,STORAGE_KEY,SCHEMA_VERSION,PRESTIGE_VERSION,RARITIES,VARIANTS,COSMETIC_VARIANTS,WEAR_VARIANTS,ECONOMY,PACKS,CARD_META,RARITY_GROUPS,STARTER_COLLECTION,STARTER_DECKS,COMMANDER_STARTERS,COMMANDER_CARD_GRANT,COMMANDER_GRANT_VERSION,createProfile,load,diagnostics,storageDiagnostics:diagnostics,recoveryExport,metadata,card:metadata,copyLimit,ownedCount,canUseDeck,generatePack,purchasePack,claimPack,craft,setPreferredVariant,setCosmeticPreferences,setFavorite,cosmeticState,masterySummary,variantFor,markSeen,rewardEligibility,rewardMatch,rewardPrivateMatch,completeTutorial,summary};
});
