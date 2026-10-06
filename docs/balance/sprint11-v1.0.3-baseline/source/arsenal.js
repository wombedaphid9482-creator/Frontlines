/* Structured expansion content. Historical profiles never receive these cards. */
(function(root,factory){
  'use strict';
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?src=>require('node:fs').existsSync(require('node:path').join(__dirname,src)):null,node?require('./deck-rules.js'):root.FrontlinesDeckRules);
  if(node)module.exports=api;
  root.FactionArsenal=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(defaultAssetExists,DeckRules){
  'use strict';
  const VERSION='frontlines-arsenal-007-v1';
  const clone=value=>JSON.parse(JSON.stringify(value));
  function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
  const KEYWORDS=freeze({
    Armor:'Reduce incoming regular combat damage by 1 on any ground. Armor adds to Fortify on owned ground. Printed Armor and temporary Reinforce do not stack. Orders, Ambush and Retaliate bypass Armor; Sabotage suppresses printed Armor.',
    Mark:'The marked enemy takes +1 damage from each positive incoming regular combat hit, including normal simultaneous return fire, until its next offensive turn starts. A zero-Attack card does not gain damage; shields and protection can absorb the bonus. Marks do not stack. Orders, Ambush and Retaliate gain no bonus.',
    Reinforce:'Heal the chosen friendly permanent by the printed amount and give it temporary Armor 1 until your next offensive turn starts. Temporary Armor does not stack with printed Armor; it adds to Fortify on owned ground.',
    Adapt:'Choose one printed mode when playing this Order. Only that mode resolves, with its usual target requirements. All modes pay this card’s printed Capacity and 1 Command Action; this is a choice, never a random result.'
  });
  const EFFECT_SCHEMA=freeze({
    heal:{target:'friendly',timings:['action'],minimum:1},shield:{target:'defender',timings:['response'],minimum:1},
    rally:{target:'friendly',timings:['action'],minimum:0},damage:{target:'enemy',timings:['action'],minimum:1},
    draw:{target:'none',timings:['action'],minimum:1},ambush:{target:'attacker',timings:['response'],minimum:1},
    disrupt:{target:'none',timings:['action'],minimum:1},counter:{target:'order',timings:['counter'],minimum:0},
    retreat:{target:'defender',timings:['response'],minimum:0},reclaim:{target:'friendly',timings:['action'],minimum:0},
    sabotage:{target:'enemy',timings:['action'],minimum:0},mark:{target:'enemy',timings:['action'],minimum:1},
    reinforce:{target:'friendly',timings:['action'],minimum:1},adapt:{target:'mode',timings:['action'],minimum:0}
  });
  const SCHEMA=freeze({
    types:['unit','leader','asset','order'],artRoles:['rifle','heavy','specialist','commander'],
    traits:['fortify','guard','medic','mobile','command','rush','berserk','precision','retaliate','scavenge','armor'],
    effects:EFFECT_SCHEMA,adaptKinds:['heal','draw','rally'],
    maximumValue:1000,maximumCommandCost:20,deckRules:{size:DeckRules.size,maxCopies:DeckRules.maxCopies,maxLeaderCopies:DeckRules.maxLeaders}
  });
  const factionStrategies={stonewall:['bastion','counteroffensive'],bruiser:['shock-assault','heavy-breakthrough'],syndicate:['combined-arms','precision-operations'],nightwalker:['sabotage','assassination'],rogue:['scavenger','wildcard']};
  const cards=Object.create(null);
  function targeting(effect,effects=EFFECT_SCHEMA){
    if(!effect)return {owner:'none',required:false};
    if(effect.kind==='adapt')return {owner:'mode',required:false,modes:Object.fromEntries((Array.isArray(effect.modes)?effect.modes:[]).filter(mode=>mode&&typeof mode.id==='string').map(mode=>[mode.id,{owner:effects[mode.kind]?.target||'unknown',required:mode.kind!=='draw'}]))};
    const owner=effects[effect.kind]?.target||'unknown';
    return {owner,required:['friendly','enemy'].includes(owner)};
  }
  function add(faction,key,name,type,presence,attack,health,traits,commandCost,archetypes,role,artRole,rulesText,designIntent,extra){
    const id=faction+'_'+key,effect=extra?.effect;
    cards[id]={id,name,faction,type,presence,attack,health,traits,commandCost,set:'arsenal-007',
      archetype:archetypes[0],archetypes,role,artRole,rulesText:rulesText+' '+(type==='order'&&extra?.timing!=='action'?'Costs Capacity; no Command Action.':commandCost?'Costs 1 Command Action in addition to Capacity.':'Free Action — costs Capacity; no Command Action.'),
      designIntent,tags:[role,...traits,...(effect?[effect.kind]:[])],ai:{role,priority:commandCost?'tactical':'support'},
      targeting:targeting(effect),...extra};
  }
  function unit(faction,key,name,p,a,h,traits,ca,archetypes,role,artRole,text,intent){add(faction,key,name,'unit',p,a,h,traits,ca,archetypes,role,artRole,text,intent);}
  function asset(faction,key,name,p,h,traits,ca,archetypes,role,text,intent){add(faction,key,name,'asset',p,0,h,traits,ca,archetypes,role,'specialist',text,intent);}
  function order(faction,key,name,p,kind,amount,ca,archetypes,role,text,intent,timing='action',modes){add(faction,key,name,'order',p,0,0,[],ca,archetypes,role,'specialist',text,intent,{timing,effect:{kind,amount,...(modes?{modes}:{})}});}

  unit('stonewall','bulwark_warden','Bulwark Warden',6,2,6,['armor','guard'],0,['bastion'],'armored interceptor','heavy',
    'Armor. Guard — while ready, intercept an attack on another ally here; Precision bypasses Guard.',
    'Protect a forward foothold before it is owned. Trades offensive damage for Armor that works on contested ground; direct Orders still cut through it.');
  unit('stonewall','countermarch','Countermarch Section',5,3,5,['mobile','retaliate'],0,['counteroffensive'],'mobile retaliation','rifle',
    'Mobile — first move each turn preserves readiness. Retaliate — after surviving as combat defender, deal 1 damage to the surviving attacker.',
    'Turn a successful defensive exchange into an advance without buying extra attacks. Less durable than Counterbattery Section and no Fortify.');
  unit('stonewall','plate_medic','Plate Medic',4,1,4,['armor','medic'],0,['bastion','counteroffensive'],'armored medic','specialist',
    'Armor. Medic — at your offensive turn start, heal every ally here by 1.',
    'Offer a low-commitment forward medic resilient to small combat hits, with weak attack and low health against Orders.');
  unit('stonewall','advance_marshal','Advance Marshal',6,2,5,['command','retaliate'],1,['counteroffensive','bastion'],'retaliation command','commander',
    'Command — other allies here gain +1 Attack. Retaliate — after surviving as combat defender, deal 1 damage to the surviving attacker.',
    'Support a counterpush without replacing the Commander. A lower-commitment aura pays a Command Action and exposes a fragile, low-Attack support body.');
  order('stonewall','line_reinforcement','Line Reinforcement',3,'reinforce',2,0,['bastion','counteroffensive'],'defensive reinforcement',
    'Reinforce — heal one friendly permanent by 2, then give it temporary Armor 1 until your next offensive turn starts. Does not stack with printed Armor.',
    'Choose protection for the enemy response instead of Triage’s larger heal. Armor expires before the next friendly initiative and cannot stop direct removal.');
  unit('stonewall','reserve_watch','Reserve Watch',3,1,4,['retaliate'],0,['counteroffensive'],'recovery infantry','rifle',
    'Retaliate — after surviving as combat defender, deal 1 damage to the surviving attacker.',
    'Recover occupancy cheaply after casualties. Low pressure and Attack make it a defensive sacrifice rather than an efficient finisher.');
  unit('stonewall','breach_shield','Breach Shield Column',7,2,6,['armor','guard','mobile'],1,['counteroffensive','bastion'],'heavy escort','heavy',
    'Armor. Guard. Mobile — first move each turn preserves readiness, keeping interception available after repositioning.',
    'Carry a defensive screen through the moving frontline. Pays a Command Action and sacrifices offensive stats for mobile protection.');

  unit('bruiser','pavise_breaker','Pavise Breaker',6,3,5,['guard','berserk'],1,['heavy-breakthrough','shock-assault'],'heavy assault screen','heavy',
    'Guard. Berserk — gain +1 Attack while wounded.',
    'Protect a committed Heavy after a push stalls. Unlike ordinary Vanguards, protection costs a Command Action and Precision still bypasses it.');
  unit('bruiser','collision_crew','Collision Crew',5,2,4,['rush','retaliate'],0,['shock-assault'],'shock retaliation','rifle',
    'Rush — may attack on its deployment turn if ready. Retaliate — after surviving as combat defender, deal 1 damage to the surviving attacker.',
    'Provide an aggressive force that punishes a counterattack. Loses a point of Attack versus Assault Squad to gain its defensive threat.');
  unit('bruiser','ram_team','Armored Ram Team',7,3,7,['armor','berserk'],1,['heavy-breakthrough'],'armored heavy','heavy',
    'Armor. Berserk — gain +1 Attack while wounded.',
    'Commit to a slower, durable breakthrough body rather than raw Heavy damage. Still vulnerable to direct removal, Sabotage and pressure in another position.');
  unit('bruiser','surge_drummers','Surge Drummers',4,1,4,['command','mobile'],1,['shock-assault','heavy-breakthrough'],'mobile assault command','commander',
    'Command — other allies here gain +1 Attack. Mobile — first move each turn preserves readiness.',
    'Shift a fragile assault aura between groups. Small Presence commitment comes with an explicit Command Action and almost no independent damage.');
  unit('bruiser','counterpuncher','Counterpuncher',4,2,4,['berserk','retaliate'],0,['shock-assault','heavy-breakthrough'],'wounded retaliation','rifle',
    'Berserk — gain +1 Attack while wounded. Retaliate — after surviving as combat defender, deal 1 damage to the surviving attacker.',
    'Keep a failed assault dangerous without raising Bruiser’s staying power across its pool. Trades Brawler damage for counterattack punishment.');
  order('bruiser','triage_rig','Combat Triage Rig',3,'heal',3,0,['heavy-breakthrough'],'heavy recovery',
    'Heal one wounded friendly permanent by 3.',
    'Spend a draw slot on preserving an expensive push instead of Resupply. Healing can remove Berserk, creating a timing decision.');
  unit('bruiser','breakthrough_gunner','Breakthrough Gunner',8,4,4,['rush','armor'],1,['heavy-breakthrough','shock-assault'],'armored shock heavy','heavy',
    'Rush — may attack on its deployment turn if ready. Armor — reduce incoming regular combat damage by 1.',
    'Buy a protected deployment-turn shot with higher commitment and lower raw health than Siege Heavy. A 4-damage Order kills this Gunner while an unwounded Siege Heavy survives; deployment, movement and attack can consume the whole initiative.');

  order('syndicate','target_designator','Target Designator',2,'mark',1,1,['precision-operations','combined-arms'],'target marking',
    'Mark one enemy permanent: it takes +1 incoming regular combat damage until its next offensive turn starts. Marks do not stack.',
    'Turn coordinated exchanges into selective removal instead of spending on direct damage. Guard and defensive responses remain available.');
  unit('syndicate','screen_operator','Screen Operator',5,2,5,['armor','guard'],0,['combined-arms'],'armored tactical escort','rifle',
    'Armor. Guard — while ready, intercept an attack on another ally here; Precision bypasses Guard.',
    'Protect a marked-target operation without copying Rapid Security Detail’s mobility. Gives up Attack and movement readiness for combat protection.');
  unit('syndicate','fire_coordinator','Fire Coordinator',5,2,4,['command','precision'],0,['combined-arms','precision-operations'],'precision command','commander',
    'Command — other allies here gain +1 Attack. Precision — attacks cannot be redirected by Guard.',
    'Bridge the two tactical archetypes with a fragile aura that can contribute to the selected target. Gives up Coordinator health and Attack for Precision.');
  unit('syndicate','patch_team','Tactical Patch Team',4,1,4,['medic','guard'],0,['combined-arms'],'escort medic','specialist',
    'Medic — at your offensive turn start, heal every ally here by 1. Guard — intercept while ready.',
    'Combine two supporting jobs in one slot while accepting low damage and fragile health. Small direct Orders can remove the combined support.');
  unit('syndicate','breach_monitor','Breach Monitor',6,3,6,['armor','precision'],1,['precision-operations'],'armored precision specialist','heavy',
    'Armor. Precision — attacks cannot be redirected by Guard.',
    'Offer a durable specialist for planned Mark exchanges instead of an Eliminator’s movement and burst damage. Costs a Command Action to deploy.');
  asset('syndicate','field_link','Field Link',3,5,['command','medic'],1,['combined-arms','precision-operations'],'fixed combined support',
    'Immobile asset. Command — other allies here gain +1 Attack. Medic — at your offensive turn start, heal every ally here by 1.',
    'Combine auras cheaply in Presence while risking a fragile static asset and a Command Action. It cannot follow a breakthrough or retreat after capture.');
  order('syndicate','cover_protocol','Cover Protocol',2,'reinforce',1,0,['combined-arms','precision-operations'],'tactical reinforcement',
    'Reinforce — heal one friendly permanent by 1, then give it temporary Armor 1 until your next offensive turn starts. Does not stack with printed Armor.',
    'Protect the next combined exchange with a small, temporary investment. Sacrifices healing quantity and a deck slot for short-term protection.');

  order('nightwalker','exposure_window','Exposure Window',3,'mark',1,1,['assassination','sabotage'],'assassination marking',
    'Mark one enemy permanent: it takes +1 incoming regular combat damage until its next offensive turn starts. Marks do not stack.',
    'Set up a chosen assassination with a visible, short window rather than additional raw stats. Pays more Presence than Syndicate’s specialized targeting tool.');
  unit('nightwalker','shadow_handler','Shadow Handler',4,1,4,['command','precision'],0,['sabotage','assassination'],'covert command','commander',
    'Command — other allies here gain +1 Attack. Precision — attacks cannot be redirected by Guard.',
    'Supply a low-commitment aura for timed disruption and removal. Its tiny independent Attack and health make revealing it a risk.');
  unit('nightwalker','misfire_team','Misfire Team',4,3,4,['precision','retaliate'],0,['assassination'],'precision retaliation','specialist',
    'Precision. Retaliate — after surviving as combat defender, deal 1 damage to the surviving attacker.',
    'Choose a unit that discourages enemy cleanup rather than Blade Team’s higher Attack. It has no deployment-turn attack or movement shortcut.');
  order('nightwalker','false_route','False Route',2,'disrupt',3,1,['sabotage'],'Presence disruption',
    'Add 3 temporary Presence spending to the opponent until their next offensive turn starts. Does not reduce Command Actions.',
    'Restrict enemy response Capacity during a planned operation without dealing damage. Costs a Command Action and expires when the opponent’s offensive turn starts.');
  unit('nightwalker','decoy_patrol','Decoy Patrol',3,1,3,['guard','mobile'],0,['sabotage'],'mobile decoy','rifle',
    'Guard. Mobile — first move each turn preserves readiness, keeping interception available.',
    'Trade a cheap body and a move for protecting the important operative. Low damage, health and pressure prevent the decoy from becoming a finisher.');
  unit('nightwalker','route_keeper','Route Keeper',5,2,5,['guard','precision'],0,['sabotage','assassination'],'precision escort','rifle',
    'Guard. Precision — attacks cannot be redirected by Guard.',
    'Let a planned operation defend its support without abandoning selective targeting. Lower Attack than ordinary Nightwalker threats and no Rush.');
  unit('nightwalker','crossfire_cell','Crossfire Cell',6,3,4,['precision','mobile','retaliate'],0,['assassination','sabotage'],'mobile precision retaliation','specialist',
    'Precision. Mobile. Retaliate — after surviving as combat defender, deal 1 damage to the surviving attacker.',
    'Favor flexible positioning and an awkward counterattack over Silencer Team’s immediate burst. No Rush and modest Attack make the timing deliberate.');

  order('rogue','field_options','Field Options',3,'adapt',0,1,['wildcard','scavenger'],'adaptive support',
    'Adapt — choose one: Repair (heal one ally by 3); Resupply (draw 2); Reposition (ready one exhausted ally). Every mode costs 1 Command Action.',
    'Keep one card useful across different positions. Flexibility costs more tempo than a dedicated heal/draw Order and more Presence than Rally.','action',[
      {id:'repair',label:'Repair — heal 3',kind:'heal',amount:3},
      {id:'resupply',label:'Resupply — draw 2',kind:'draw',amount:2},
      {id:'reposition',label:'Reposition — ready one ally',kind:'rally',amount:0}
    ]);
  unit('rogue','route_scout','Route Scout',3,1,3,['mobile','scavenge'],0,['scavenger','wildcard'],'mobile salvage scout','rifle',
    'Mobile. Scavenge — when another ally here is destroyed, draw 1 (once per player per turn; sources do not stack).',
    'Re-establish a cheap salvage network after losses. A fragile body and low capture pressure keep it from replacing durable Broker builds.');
  unit('rogue','scrap_hauler','Scrap Hauler',6,2,6,['armor','scavenge'],0,['scavenger'],'armored salvage support','heavy',
    'Armor. Scavenge — when another ally here is destroyed, draw 1 (once per player per turn; sources do not stack).',
    'Maintain recovery value under repeated combat without Bulwark’s interception. Lower Attack and lack of Guard expose the rest of the force.');
  unit('rogue','field_negotiator','Field Negotiator',5,1,5,['command','scavenge'],1,['scavenger','wildcard'],'salvage command','commander',
    'Command — other allies here gain +1 Attack. Scavenge — draw 1 when another ally here is destroyed, once per player per turn.',
    'Make casualties and coordinated attacks support the same plan. Paying a Command Action for a low-Attack fragile aura prevents free support stacking.');
  unit('rogue','wandering_medic','Salvage Medic',5,2,4,['medic','scavenge'],0,['scavenger','wildcard'],'salvage medic','specialist',
    'Medic — at your offensive turn start, heal every ally here by 1. Scavenge — draw 1 when another ally here is destroyed, once per player per turn.',
    'Choose whether to preserve allies or accept a casualty for recovery. Loses Repair Courier mobility and health in exchange for salvage value.');
  unit('rogue','patchguard','Patchguard',5,2,5,['guard','armor'],0,['wildcard','scavenger'],'improvised armored escort','rifle',
    'Guard. Armor — reduce incoming regular combat damage by 1 on any ground.',
    'Protect an improvised support group without buying an expensive salvage engine. Modest Attack and no mobility limit aggressive flexibility.');
  asset('rogue','rolling_cache','Salvage Cache',4,6,['medic','scavenge'],0,['scavenger'],'fixed recovery support',
    'Immobile asset. Medic — at your offensive turn start, heal every ally here by 1. Scavenge — draw 1 when another ally here is destroyed, once per player per turn.',
    'Combine healing and recovery in a single slot at the price of fixed deployment. Advancing abandons its support and a lost territory eliminates the cache.');
  const CARD_ADDITIONS=freeze(cards);
  const templates=[
    ['stonewall','fortified-advance','Fortified Advance',{rifles:3,defender:2,medic:2,commander:2,bulwark_warden:3,countermarch:3,plate_medic:2,line_reinforcement:3,advance_marshal:2,fire_support:2,brace:2}],
    ['bruiser','rolling-breakthrough','Rolling Breakthrough',{assault:3,shock_runner:3,heavy:2,commander:2,ram_team:3,collision_crew:3,counterpuncher:2,surge_drummers:2,triage_rig:2,rally:2,bombard:2}],
    ['syndicate','coordinated-removal','Coordinated Removal',{security:3,coordinator:2,commander:2,eliminator:2,screen_operator:3,fire_coordinator:2,patch_team:2,target_designator:3,cover_protocol:2,intel:3,counter:2}],
    ['nightwalker','planned-exposure','Planned Exposure',{blade:3,scout:2,commander:2,silencer:2,shadow_handler:2,decoy_patrol:3,crossfire_cell:3,exposure_window:2,false_route:2,ghost_extraction:2,recon:3}],
    ['rogue','field-improvisation','Field Improvisation',{outrider:3,commander:2,lancer:2,broker:2,route_scout:3,scrap_hauler:3,patchguard:2,wandering_medic:2,field_options:3,reclaim:2,rally:2}]
  ];
  const factionTitles={stonewall:'Stonewall',bruiser:'Bruiser',syndicate:'The Syndicate',nightwalker:'Nightwalker',rogue:'Rogue'};
  const PRESETS=freeze(templates.map(([faction,archetype,title,counts])=>({id:faction+'-'+archetype,name:factionTitles[faction]+' — '+title,faction,archetype,
    cards:Object.entries(counts).flatMap(([key,count])=>Array(count).fill(faction+'_'+key)),source:'preset'})));
  const ARCHETYPE_PARENTS=freeze(Object.fromEntries(templates.map(([faction,archetype])=>[archetype,factionStrategies[faction].slice()])));

  function inferredRole(card){
    if(card.role)return card.role;
    if(card.type==='leader')return 'faction command';
    if(card.type==='order')return (card.effect?.kind||'tactical')+' support';
    if(card.type==='asset')return 'fixed support';
    if((card.traits||[]).includes('medic'))return 'medic support';
    if((card.traits||[]).includes('command'))return 'command support';
    if((card.traits||[]).includes('precision'))return 'precision specialist';
    if((card.traits||[]).includes('guard'))return 'defensive infantry';
    if((card.traits||[]).includes('rush'))return 'aggressive infantry';
    return /heavy|gunner|breacher/i.test(card.name||'')?'heavy pressure':'territory infantry';
  }
  function metadataFor(card){
    card=card||{};const role=inferredRole(card),strategies=factionStrategies[card.faction]||[];
    const archetypes=Array.isArray(card.archetypes)&&card.archetypes.length?card.archetypes.slice():card.archetype?[card.archetype]:strategies.slice();
    const tags=[...new Set([...(Array.isArray(card.tags)?card.tags:[]),role,...(card.traits||[]),...(card.effect?[card.effect.kind]:[])])];
    return {role,archetypes,tags,designIntent:card.designIntent||'Existing '+(card.faction||'faction')+' '+role+'; retain its printed rules and use its role to compare deck alternatives.',
      ai:clone(card.ai||{role,priority:card.type==='order'?'tactical':(card.traits||[]).some(t=>['medic','command','scavenge'].includes(t))?'support':'pressure'}),
      targeting:clone(card.targeting||targeting(card.effect))};
  }
  function validateCardPool(data,options){
    options=options||{};const errors=[],schema={...SCHEMA,...options.schema},max=schema.maximumValue;
    const factions=data&&data.FACTIONS&&typeof data.FACTIONS==='object'?data.FACTIONS:{};
    const raw=data&&data.CARDS;const list=Array.isArray(raw)?raw.map(c=>[c?.id,c]):raw&&typeof raw==='object'?Object.entries(raw):[];
    if(!list.length)errors.push('Card pool must contain cards.');
    const ids=new Set(),available=Object.create(null),factionCounts=Object.create(null);
    const text=(value,min=1,limit=5000)=>typeof value==='string'&&value.trim().length>=min&&value.length<=limit;
    const strings=value=>Array.isArray(value)&&value.length>0&&value.every(v=>text(v,1,120));
    const integer=(value,min=0)=>Number.isInteger(value)&&value>=min&&value<=max;
    const assetExists=options.assetExists||defaultAssetExists;
    function error(id,message){errors.push((id||'(missing ID)')+': '+message);}
    function effectCheck(id,effect,timing,mode){
      const spec=effect&&schema.effects[effect.kind];
      if(!spec){error(id,'Unknown or missing effect.');return;}
      if(!integer(effect.amount,spec.minimum))error(id,'Invalid effect amount.');
      if(!spec.timings.includes(timing))error(id,'Effect is not valid for this timing.');
      if(effect.kind==='mark'&&effect.amount!==1)error(id,'Mark amount must be 1.');
      if(effect.kind==='adapt'){
        if(mode){error(id,'Nested Adapt is unsupported.');return;}
        if(effect.amount!==0)error(id,'Adapt amount must be 0; each mode has its own amount.');
        if(!Array.isArray(effect.modes)||effect.modes.length<2||effect.modes.length>6){error(id,'Adapt requires 2–6 modes.');return;}
        const modes=new Set();for(const choice of effect.modes){
          if(!choice||!text(choice.id,1,50)||!/^[-a-z0-9]+$/.test(choice.id)||modes.has(choice.id))error(id,'Invalid or duplicate Adapt mode ID.');
          else modes.add(choice.id);
          if(!text(choice?.label,1,100))error(id,'Adapt mode needs a label.');
          if(!schema.adaptKinds.includes(choice?.kind))error(id,'Unsupported Adapt mode effect.');
          else effectCheck(id,choice,'action',true);
        }
      }else if(effect.modes!==undefined)error(id,'Only Adapt can define modes.');
    }
    for(const [key,card]of list){
      if(!card||typeof card!=='object'||Array.isArray(card)){error(key,'Card must be an object.');continue;}
      const id=card.id;
      if(!text(id,1,100)||!/^[-a-z0-9_]+$/.test(id)||Object.hasOwn(Object.prototype,id)||id==='prototype')error(id,'Invalid or missing ID.');
      else if(ids.has(id))error(id,'Duplicate ID.');
      else {ids.add(id);available[id]=card;}
      if(key!==id)error(id,'Card ID does not match pool key.');
      if(!Object.hasOwn(factions,card.faction))error(id,'Unknown faction.');else factionCounts[card.faction]=(factionCounts[card.faction]||0)+1;
      if(!text(card.name,1,100))error(id,'Card needs a readable name.');
      if(!schema.types.includes(card.type))error(id,'Unsupported card type.');
      if(!integer(card.presence,1)||!integer(card.attack)||!integer(card.health,card.type==='order'?0:1))error(id,'Invalid Presence, Attack or Health.');
      if(card.type==='order'&&(card.attack!==0||card.health!==0))error(id,'Orders must have zero Attack and Health.');
      if(card.type==='asset'&&card.attack!==0)error(id,'Immobile assets must have zero Attack.');
      if(!Array.isArray(card.traits)||card.traits.some(t=>!schema.traits.includes(t))||new Set(card.traits||[]).size!==(card.traits||[]).length)error(id,'Invalid or duplicate keyword.');
      if(card.type==='order'&&card.traits?.length)error(id,'Orders cannot have permanent traits.');
      if(!text(card.rulesText))error(id,'Missing rules text.');
      if(card.commandCost!==undefined&&(!Number.isInteger(card.commandCost)||card.commandCost<0||card.commandCost>schema.maximumCommandCost))error(id,'Invalid Command Action cost.');
      if(Number.isInteger(data?.DEFAULT_CONFIG?.commandCap)&&card.presence>data.DEFAULT_CONFIG.commandCap)error(id,'Presence exceeds maximum Capacity and cannot be played.');
      if(Number.isInteger(data?.DEFAULT_CONFIG?.actionLimit)&&card.commandCost>data.DEFAULT_CONFIG.actionLimit)error(id,'Command cost exceeds the full offensive-turn allowance.');
      if(card.type==='order'){
        effectCheck(id,card.effect,card.timing,false);
        if(card.timing!=='action'&&card.commandCost!==undefined&&card.commandCost!==0)error(id,'Responses and counters must cost zero Command Actions.');
        if(card.effect?.kind==='adapt'&&card.commandCost!==1)error(id,'Every Adapt mode must share 1 Command Action.');
      }else if(card.effect!==undefined)error(id,'Permanent effects require a supported schema extension.');
      const expanded=card.set==='arsenal-007'||options.requireMetadata===true;
      if(expanded){
        if(![0,1].includes(card.commandCost))error(id,'Expanded cards require an explicit 0/1 Command Action cost.');
        if(!strings(card.archetypes)||!strings(card.tags)||!text(card.role,1,100)||!text(card.designIntent))error(id,'Missing structured design metadata.');
        if(!card.ai||!text(card.ai.role,1,100)||!['support','pressure','tactical'].includes(card.ai.priority))error(id,'Invalid AI role/priority metadata.');
        const expected=targeting(card.effect,schema.effects);
        if(!card.targeting||card.targeting.owner!==expected.owner||card.targeting.required!==expected.required||(expected.modes&&JSON.stringify(card.targeting.modes)!==JSON.stringify(expected.modes)))error(id,'Targeting metadata disagrees with the effect.');
        if(!schema.artRoles.includes(card.artRole))error(id,'Unknown or missing artwork role.');
      }else if(card.artRole!==undefined&&!schema.artRoles.includes(card.artRole))error(id,'Unknown artwork role.');
      if(Object.hasOwn(factions,card.faction)&&assetExists){
        const src='assets/cards/'+card.faction+'/starter-atlas.webp';
        try{if(!assetExists(src))error(id,'Missing artwork: '+src);}catch(_){error(id,'Artwork lookup failed: '+src);}
      }
    }
    function deckCheck(deck,label){
      if(!deck||!Object.hasOwn(factions,deck.faction)||!Array.isArray(deck.cards)){error(label,'Invalid built-in deck shape/faction.');return;}
      const rules={...schema.deckRules,...options.deckRules};
      if(deck.cards.length!==rules.size)error(label,'Built-in deck must contain '+rules.size+' cards.');
      const counts=Object.create(null);for(const id of deck.cards){
        counts[id]=(counts[id]||0)+1;
        if(!available[id])error(label,'Unavailable deck card '+String(id)+'.');
        else if(available[id].faction!==deck.faction)error(label,'Cross-faction deck card '+id+'.');
      }
      for(const [id,count]of Object.entries(counts)){const c=available[id];if(c&&count>(c.type==='leader'?rules.maxLeaderCopies:rules.maxCopies))error(label,'Copy limit exceeded for '+id+'.');}
    }
    if(data?.DECKS&&typeof data.DECKS==='object')for(const [faction,deck]of Object.entries(data.DECKS))deckCheck({faction,cards:deck},faction+'-starter');
    const presets=options.presets||data?.PRESETS||[];if(!Array.isArray(presets))errors.push('Built-in presets must be an array.');
    else {const seen=new Set();for(const deck of presets){if(!deck?.id||seen.has(deck.id))error(deck?.id,'Missing or duplicate built-in deck ID.');else seen.add(deck.id);deckCheck(deck,deck?.id||'preset');}}
    return {valid:errors.length===0,errors,cards:list.length,factions:{...factionCounts}};
  }
  return freeze({VERSION,CARD_ADDITIONS,KEYWORDS,SCHEMA,PRESETS,ARCHETYPE_PARENTS,metadataFor,validateCardPool});
});
