/* Shared, offline deck construction and local library. No acquisition restrictions. */
(function(root,factory){
  'use strict';
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('./data.js'):root.FrontlinesData,root,node?require('./deck-rules.js'):root.FrontlinesDeckRules);
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.FrontlinesDecks=api;
})(typeof globalThis!=='undefined'?globalThis:this,function createDecks(Data,root,Rules){
  'use strict';
  const VERSION='frontlines-decks-v1',STORAGE_KEY='frontlines.decks.v1';
  const RULES=Rules;
  const clone=v=>JSON.parse(JSON.stringify(v));
  const titles={stonewall:'Bastion',bruiser:'Breakthrough',syndicate:'Tactical Command',nightwalker:'Shadow Operations',rogue:'Improvised Warfare'};
  const archetypes={stonewall:'bastion',bruiser:'shock-assault',syndicate:'combined-arms',nightwalker:'assassination',rogue:'wildcard'};
  const PRESETS=[
    ['stonewall','bastion','Bastion',{rifles:3,defender:3,medic:2,heavy:2,escort:2,commander:2,aid_station:1,watchguard:3,redoubt:2,triage:2,brace:2,fire_support:2}],
    ['stonewall','counteroffensive','Counteroffensive',{rifles:3,pathfinder:1,escort:2,commander:2,counterbattery:3,recovery_team:2,watchguard:2,medic:3,heavy:2,rally:2,fire_support:2,triage:2}],
    ['bruiser','shock-assault','Shock Assault',{assault:4,brawler:2,breacher:3,gunner:2,commander:2,shock_runner:3,breach_caller:2,heavy:2,rally:2,bombard:2,ambush:2}],
    ['bruiser','heavy-breakthrough','Heavy Breakthrough',{heavy:4,brawler:2,vanguard:2,commander:2,banner:1,rupture_heavy:3,breach_caller:2,rally:3,bombard:2,overrun_charge:3,resupply:2}],
    ['syndicate','combined-arms','Combined Arms',{security:3,enforcer:3,courier:2,coordinator:2,contractor:2,commander:2,tactical_medic:3,rapid_detail:3,intel:2,counter:2,precision_strike:2}],
    ['syndicate','precision-operations','Precision Operations',{security:2,observer:2,courier:2,coordinator:2,commander:2,eliminator:3,signal_lock:2,precision_strike:3,intel:2,counter:2,contractor:2,rapid_detail:2}],
    ['nightwalker','sabotage','Sabotage',{stalker:3,saboteur:1,scout:4,commander:2,handler:4,blackout:2,beacon:1,ambush:2,strike:2,recon:2,withdraw:1,silencer:2}],
    ['nightwalker','assassination','Assassination',{blade:3,marksman:4,assault:2,scout:2,commander:2,silencer:3,ghost_extraction:3,strike:3,ambush:2,recon:2}],
    ['rogue','scavenger','Scavenger',{outrider:3,salvage:2,trailguard:2,commander:2,broker:3,bulwark:3,workshop:1,reclaim:3,rally:2,raid:3,retreat:2}],
    ['rogue','wildcard','Wildcard',{outrider:3,skirmisher:2,raider:3,commander:2,lancer:3,repair_courier:3,trailguard:2,reclaim:2,rally:3,raid:3}]
  ];
  function shape(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('A deck must be a JSON object.');
    if(typeof raw.faction!=='string'||!Object.hasOwn(Data.FACTIONS,raw.faction))throw new Error('Choose a known faction.');
    if(typeof raw.name!=='string'||!raw.name.trim()||raw.name.length>80)throw new Error('Deck name must contain 1–80 characters.');
    if(!Array.isArray(raw.cards)||raw.cards.length>500||raw.cards.some(id=>typeof id!=='string'||!id||id.length>100||Object.hasOwn(Object.prototype,id)||id==='prototype'))throw new Error('Cards must be a list of valid card IDs (maximum 500).');
    const id=typeof raw.id==='string'&&/^[\w-]{1,100}$/.test(raw.id)?raw.id:'';
    return {id,name:raw.name.trim(),faction:raw.faction,cards:raw.cards.slice(),archetype:typeof raw.archetype==='string'?raw.archetype.slice(0,80):'custom',source:'saved',createdAt:typeof raw.createdAt==='string'?raw.createdAt.slice(0,40):'',updatedAt:typeof raw.updatedAt==='string'?raw.updatedAt.slice(0,40):''};
  }
  function validate(raw){
    const errors=[],counts={};let deck;
    try{deck=shape(raw);}catch(error){return {legal:false,errors:[error.message],size:Array.isArray(raw?.cards)?raw.cards.length:0,counts};}
    if(deck.cards.length!==RULES.size)errors.push('Use exactly '+RULES.size+' cards ('+deck.cards.length+'/'+RULES.size+').');
    for(const id of deck.cards){counts[id]=(counts[id]||0)+1;const c=Data.CARDS[id];if(!c){if(counts[id]===1)errors.push('Unavailable card: '+id+'. Remove or replace it.');continue;}if(c.faction!==deck.faction&&counts[id]===1)errors.push(c.name+' belongs to a different faction.');}
    for(const [id,count] of Object.entries(counts)){const c=Data.CARDS[id];if(c&&count>copyLimit(c))errors.push(c.name+': at most '+copyLimit(c)+' copies.');}
    return {legal:errors.length===0,errors,size:deck.cards.length,counts};
  }
  function copyLimit(card){return card?.type==='leader'?RULES.maxLeaders:RULES.maxCopies;}
  function composition(deck){
    const curve=[{label:'0–2',count:0},{label:'3–4',count:0},{label:'5–6',count:0},{label:'7–8',count:0},{label:'9+',count:0}];
    const out={size:deck?.cards?.length||0,averageCost:0,units:0,orders:0,assets:0,leaders:0,heavy:0,specialist:0,unknown:0,curve,archetypeTags:[],commandCosts:{free:0,paid:0}};let cost=0,known=0;const tags={};
    for(const id of deck?.cards||[]){
      const c=Data.CARDS[id];if(!c){out.unknown++;continue;}
      known++;cost+=c.presence;out[{unit:'units',order:'orders',asset:'assets',leader:'leaders'}[c.type]]++;
      // Explicit class metadata matches card labels; older designs use their
      // established role/name. Support effects are never battlefield unit classes.
      if(c.type==='unit'||c.type==='leader'){
        const role=(c.artRole||c.role||c.name).toLowerCase();
        if(/heavy|breaker|juggernaut/.test(role))out.heavy++;
        if(/specialist|marksman|saboteur|medic|engineer|sniper/.test(role))out.specialist++;
      }
      curve[c.presence<=2?0:c.presence<=4?1:c.presence<=6?2:c.presence<=8?3:4].count++;
    }
    for(const id of deck?.cards||[]){const c=Data.CARDS[id];if(!c)continue;const commandCost=Number.isInteger(c.commandCost)?c.commandCost:c.type==='order'&&c.timing!=='action'?0:1;out.commandCosts[commandCost?'paid':'free']++;for(const tag of new Set(c.archetypes||[]))tags[tag]=(tags[tag]||0)+1;}
    out.archetypeTags=Object.entries(tags).map(([tag,count])=>({tag,count})).sort((a,b)=>b.count-a.count||a.tag.localeCompare(b.tag));out.averageCost=known?cost/known:0;return out;
  }
  function starters(){return Object.keys(Data.FACTIONS).map(faction=>({id:faction+'-starter',name:Data.FACTIONS[faction].name+' — '+titles[faction],faction,cards:Data.DECKS[faction].slice(),archetype:archetypes[faction],source:'starter'}));}
  function presets(){return PRESETS.map(([faction,archetype,title,counts])=>({id:faction+'-'+archetype,name:Data.FACTIONS[faction].name+' — '+title,faction,archetype,cards:Object.entries(counts).flatMap(([id,count])=>Array(count).fill(faction+'_'+id)),source:'preset'})).concat((Data.ARSENAL_PRESETS||[]).map(d=>({...clone(d),source:'preset'})));}
  function storageFor(storage){if(storage)return storage;try{return root.localStorage||null;}catch(_){return null;}}
  function readLibrary(storage){
    const result={decks:[],warnings:[],rejected:[],recovered:0,blocked:false};const store=storageFor(storage);if(!store)return result;
    let value;try{value=JSON.parse(store.getItem(STORAGE_KEY)||'[]');if(!Array.isArray(value))throw new Error('The saved library is not a deck list.');}catch(error){result.blocked=true;result.warnings.push('Saved library could not be read. Your original data is preserved; export a recovery copy before resetting it. '+error.message);return result;}
    const ids=new Set(),builtinIds=new Set(starters().concat(presets()).map(d=>d.id));
    value.forEach((raw,index)=>{try{
      let candidate=raw;if(raw&&typeof raw==='object'&&!Array.isArray(raw)&&typeof raw.faction==='string'&&Object.hasOwn(Data.FACTIONS,raw.faction)&&Array.isArray(raw.cards)&&(!raw.name||typeof raw.name!=='string')){candidate={...raw,name:'Recovered '+Data.FACTIONS[raw.faction].name+' deck '+(index+1)};result.recovered++;}
      const deck=shape(candidate);if(!deck.id||ids.has(deck.id)||builtinIds.has(deck.id)){deck.id='recovered-'+index;while(ids.has(deck.id))deck.id+='-copy';result.recovered++;}ids.add(deck.id);result.decks.push(deck);
      const legality=validate(deck);if(!legality.legal)result.warnings.push(deck.name+': '+legality.errors.join(' '));
    }catch(error){result.rejected.push({index,reason:error.message,record:clone(raw)});}});
    if(result.recovered)result.warnings.unshift(result.recovered+' saved field(s) recovered. Save the recovered decks to keep their repaired names and IDs.');
    if(result.rejected.length)result.warnings.push(result.rejected.length+' unreadable record(s) preserved. Export the recovery data to inspect them.');
    return result;
  }
  function storageDiagnostics(storage){const {warnings,rejected,recovered,blocked}=readLibrary(storage);return {warnings,rejected,recovered,blocked};}
  function load(storage){return readLibrary(storage).decks;}
  function recoveryExport(storage){const store=storageFor(storage);if(!store)throw new Error('Local storage is unavailable.');return store.getItem(STORAGE_KEY)||'[]';}
  function persist(list,storage){const store=storageFor(storage);if(!store)throw new Error('Local storage is unavailable. Export your deck to keep a copy.');const previous=readLibrary(storage);if(previous.blocked)throw new Error('The existing library is unreadable. Export recovery data before replacing it.');store.setItem(STORAGE_KEY,JSON.stringify(list.concat(previous.rejected.map(r=>r.record))));}
  function save(raw,storage){
    try{const deck=shape(raw),list=load(storage),now=new Date().toISOString();if(!deck.id||deck.id.endsWith('-starter')||presets().some(d=>d.id===deck.id))deck.id='deck-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);const index=list.findIndex(d=>d.id===deck.id);deck.createdAt=index>=0?list[index].createdAt||now:deck.createdAt||now;deck.updatedAt=now;if(index>=0)list[index]=deck;else{if(list.length>=200)throw new Error('The local library holds 200 decks. Export or remove a deck first.');list.push(deck);}persist(list,storage);return {ok:true,deck:clone(deck)};}catch(error){return {ok:false,error:error.message};}
  }
  function remove(id,storage){try{const list=load(storage);if(!list.some(d=>d.id===id))throw new Error('Saved deck not found. Starter decks remain available.');persist(list.filter(d=>d.id!==id),storage);return {ok:true};}catch(error){return {ok:false,error:error.message};}}
  function duplicate(raw,name,storage){try{const deck=shape(raw);deck.id='';deck.createdAt='';deck.updatedAt='';deck.name=(name||deck.name+' copy').slice(0,80);return save(deck,storage);}catch(error){return {ok:false,error:error.message};}}
  function importDeck(text){if(typeof text!=='string'||text.length>100000)throw new Error('Deck JSON must be smaller than 100 KB.');let raw;try{raw=JSON.parse(text);}catch(_){throw new Error('Invalid deck JSON.');}if(raw.format&&raw.format!=='frontlines-deck-v1')throw new Error('Unsupported deck format.');const deck=shape(raw.deck||raw);deck.id='';deck.createdAt='';deck.updatedAt='';return deck;}
  function exportDeck(raw){const deck=shape(raw);return JSON.stringify({format:'frontlines-deck-v1',deck:{name:deck.name,faction:deck.faction,cards:deck.cards,archetype:deck.archetype}},null,2);}
  function random(faction,seed){
    if(!Object.hasOwn(Data.FACTIONS,faction))throw new Error('Unknown faction.');let n=(Number(seed)>>>0)||1;const rng=()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967296;};const pool=Object.values(Data.CARDS).filter(c=>c.faction===faction),cards=[],counts={};while(cards.length<RULES.size){const available=pool.filter(c=>(counts[c.id]||0)<copyLimit(c));if(!available.length)throw new Error('Not enough cards to build a legal deck.');const c=available[Math.floor(rng()*available.length)];cards.push(c.id);counts[c.id]=(counts[c.id]||0)+1;}return {id:'',name:Data.FACTIONS[faction].name+' random '+(Number(seed)>>>0),faction,cards,archetype:'custom',source:'saved'};
  }
  return {VERSION,STORAGE_KEY,RULES,copyLimit,validate,composition,starters,presets,load,storageDiagnostics,recoveryExport,save,remove,duplicate,importDeck,exportDeck,random,getDecks:storage=>starters().concat(presets(),load(storage)),forData:data=>createDecks(data,root,Rules)};
});
