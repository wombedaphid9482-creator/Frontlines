/* Offline-compatible, explicit balance profiles. JSON files in balance/ are
 * reviewable mirrors of this embedded registry; tests require exact equivalence.
 * The immutable Sprint 2 definitions in data.js remain the historical baseline.
 */
(function(root,factory){
  'use strict';
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('./data.js'):root.FrontlinesData,node?require('./engine.js'):root.FrontlinesEngine,node?require('./ai.js'):root.FrontlinesAI);
  if(node)module.exports=api;
  root.FrontlinesBalance=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Base,Engine,AI){
  'use strict';
  const VERSION='frontlines-balance-registry-v2-arsenal';
  const DEFAULT_PROFILE='arsenal';
  const REGISTRY=[
    {id:'baseline',name:'Sprint 3 frozen baseline',version:'sprint2-original',description:'Original cards, starter decks and Presence/territory rules, preserved for historical comparison.',changes:{cards:{},decks:{},config:{}}},
    {id:'iteration01',name:'Iteration 01 — exposed breakthrough',version:'sprint3-iteration01-v1',description:'Reduce Bruiser attrition after a failed push; strengthen selected Nightwalker timing tools and occupation anchors. Original economy and decks retained.',changes:{cards:{
      bruiser_heavy:{health:6},bruiser_brawler:{health:4},bruiser_breacher:{health:5},bruiser_vanguard:{health:5},bruiser_gunner:{health:4},bruiser_commander:{health:6},
      nightwalker_scout:{health:6},nightwalker_commander:{presence:7,health:6},
      nightwalker_ambush:{effect:{kind:'ambush',amount:4},rulesText:'Response: deal 4 damage to the attacker before combat.'},
      nightwalker_strike:{effect:{kind:'damage',amount:5},rulesText:'Deal 5 damage to one enemy battlefield card.'}
    },decks:{},config:{}}},
    {id:'candidate',name:'Sprint 3 candidate — iteration 04',version:'sprint3-candidate-v4',description:'Exploratory attrition-weakness pass. Bruiser breakthrough forces expose lighter staying power and no universal Guard screen; selected Nightwalker infantry survive ordinary 3-Attack retaliation. Not yet the live default.',changes:{cards:{
      bruiser_assault:{attack:3},bruiser_heavy:{presence:7,attack:4,health:5},bruiser_brawler:{health:4},bruiser_breacher:{health:4},bruiser_vanguard:{attack:3,health:5,traits:[],rulesText:'A forward screen with the Presence to occupy ground; vulnerable to precision fire.'},bruiser_gunner:{health:4},bruiser_commander:{presence:7,attack:4,health:5},
      bruiser_ambush:{effect:{kind:'ambush',amount:2},rulesText:'Response: deal 2 damage to the attacker before combat.'},
      nightwalker_blade:{presence:4,health:4},nightwalker_stalker:{presence:5,health:4},nightwalker_marksman:{presence:6},nightwalker_saboteur:{presence:5},nightwalker_scout:{presence:6,health:6},nightwalker_commander:{presence:7,health:6},
      nightwalker_ambush:{effect:{kind:'ambush',amount:4},rulesText:'Response: deal 4 damage to the attacker before combat.'},
      nightwalker_strike:{effect:{kind:'damage',amount:5},rulesText:'Deal 5 damage to one enemy battlefield card.'},
      rogue_outrider:{health:5},rogue_skirmisher:{attack:4},rogue_scrapper:{presence:5,health:5},
      rogue_commander:{traits:['command','mobile','medic'],rulesText:'Unique. Command — other allies here gain +1 Attack. Mobile. Medic — heal each ally here by 1 at your turn start.'}
    },decks:{},config:{}}}
  ];
  REGISTRY.push({id:'arsenal',name:'Sprint 4 Arsenal playtest candidate',version:'sprint4-arsenal-v3',
    description:'Expanded Arsenal with reviewed Sprint 3 stats. Rupture Heavy has 5 Health for selective removal; Watchguard and Recovery Column exchange durability for their new tactical tools. Precision and Sabotage presets now carry more occupation units. Exploratory balance; human validation pending.',
    changes:JSON.parse(JSON.stringify(REGISTRY.find(profile=>profile.id==='candidate').changes))});
  REGISTRY.find(profile=>profile.id==='arsenal').changes.cards.bruiser_rupture_heavy={health:5};
  REGISTRY.find(profile=>profile.id==='arsenal').changes.cards.stonewall_watchguard={health:6};
  REGISTRY.find(profile=>profile.id==='arsenal').changes.cards.stonewall_recovery_team={health:4};
  REGISTRY.push({"id":"candidate03-strike4","name":"Sprint 5 combined counterplay candidate03-strike4","version":"sprint5-candidate03-strike4-v1","description":"Refine independently screened archetype counterplay: Breach Team Health5, original BladeHealth4, Syndicate recoveryHealth4/EliminatorHealth5, BrokerHealth6; compare Surgical Strike threshold in this strengthened opposing field.","changes":{"cards":{"bruiser_assault":{"attack":3,"health":5},"bruiser_heavy":{"presence":7,"attack":4,"health":5},"bruiser_brawler":{"health":4},"bruiser_breacher":{"health":5},"bruiser_vanguard":{"attack":3,"health":5,"traits":[],"rulesText":"A forward screen with the Presence to occupy ground; vulnerable to precision fire."},"bruiser_gunner":{"health":4},"bruiser_commander":{"presence":7,"attack":4,"health":5},"bruiser_ambush":{"effect":{"kind":"ambush","amount":2},"rulesText":"Response: deal 2 damage to the attacker before combat."},"nightwalker_blade":{"health":4},"nightwalker_stalker":{"presence":5,"health":4},"nightwalker_marksman":{"presence":6},"nightwalker_saboteur":{"presence":5},"nightwalker_scout":{"presence":6,"health":6},"nightwalker_commander":{"presence":7,"health":6},"nightwalker_ambush":{"effect":{"kind":"ambush","amount":4},"rulesText":"Response: deal 4 damage to the attacker before combat."},"nightwalker_strike":{"effect":{"kind":"damage","amount":4},"rulesText":"Deal 4 damage to one enemy battlefield card."},"rogue_outrider":{"health":5},"rogue_skirmisher":{"attack":4},"rogue_scrapper":{"presence":5,"health":5},"rogue_commander":{"traits":["command","mobile","medic"],"rulesText":"Unique. Command — other allies here gain +1 Attack. Mobile. Medic — heal each ally here by 1 at your turn start."},"bruiser_rupture_heavy":{"health":4},"stonewall_watchguard":{"health":6},"stonewall_recovery_team":{"health":4},"bruiser_overrun_charge":{"effect":{"kind":"damage","amount":4},"rulesText":"Deal 4 damage to one enemy battlefield card. Spending and a major action are required."},"bruiser_shock_runner":{"health":5},"syndicate_eliminator":{"health":5},"rogue_lancer":{"health":6},"rogue_raid":{"effect":{"kind":"damage","amount":4},"rulesText":"Deal 4 damage to one enemy battlefield card."},"rogue_broker":{"health":6},"syndicate_tactical_medic":{"health":4}},"decks":{},"config":{}}});
  REGISTRY.push({"id":"candidate04","name":"Sprint 5 hypothesis candidate04","version":"sprint5-candidate04-v1","description":"Explicit compiled-data-diff-verified targeted experiment. Exact hypothesis and source retained.","changes":{"cards":{"bruiser_assault":{"attack":3,"health":5},"bruiser_heavy":{"presence":7,"attack":4,"health":6},"bruiser_brawler":{"health":4},"bruiser_breacher":{"health":5},"bruiser_vanguard":{"attack":3,"health":5,"traits":[],"rulesText":"A forward screen with the Presence to occupy ground; vulnerable to precision fire."},"bruiser_gunner":{"health":4},"bruiser_commander":{"presence":7,"attack":4,"health":5},"bruiser_ambush":{"effect":{"kind":"ambush","amount":2},"rulesText":"Response: deal 2 damage to the attacker before combat."},"nightwalker_blade":{"health":4,"presence":4},"nightwalker_stalker":{"presence":5,"health":4},"nightwalker_marksman":{"presence":6},"nightwalker_saboteur":{"presence":5},"nightwalker_scout":{"presence":6,"health":6},"nightwalker_commander":{"presence":7,"health":6},"nightwalker_ambush":{"effect":{"kind":"ambush","amount":4},"rulesText":"Response: deal 4 damage to the attacker before combat."},"nightwalker_strike":{"effect":{"kind":"damage","amount":4},"rulesText":"Deal 4 damage to one enemy battlefield card."},"rogue_outrider":{"health":5},"rogue_skirmisher":{"attack":4},"rogue_scrapper":{"presence":5,"health":5},"rogue_commander":{"traits":["command","mobile","medic"],"rulesText":"Unique. Command — other allies here gain +1 Attack. Mobile. Medic — heal each ally here by 1 at your turn start."},"bruiser_rupture_heavy":{"health":4},"stonewall_watchguard":{"health":6},"stonewall_recovery_team":{"health":4},"bruiser_overrun_charge":{"effect":{"kind":"damage","amount":4},"rulesText":"Deal 4 damage to one enemy battlefield card. Spending and a major action are required.","presence":3},"bruiser_shock_runner":{"health":5},"syndicate_eliminator":{"health":5},"rogue_lancer":{"health":5,"presence":6},"rogue_raid":{"effect":{"kind":"damage","amount":4},"rulesText":"Deal 4 damage to one enemy battlefield card."},"rogue_broker":{"health":6},"syndicate_tactical_medic":{"health":4}},"decks":{},"config":{}}});
  REGISTRY.push({"id":"candidate04-overrun4","name":"Sprint 5 hypothesis candidate04-overrun4","version":"sprint5-candidate04-overrun4-v1","description":"Explicit compiled-data-diff-verified targeted experiment. Exact hypothesis and source retained.","changes":{"cards":{"bruiser_assault":{"attack":3,"health":5},"bruiser_heavy":{"presence":7,"attack":4,"health":6},"bruiser_brawler":{"health":4},"bruiser_breacher":{"health":5},"bruiser_vanguard":{"attack":3,"health":5,"traits":[],"rulesText":"A forward screen with the Presence to occupy ground; vulnerable to precision fire."},"bruiser_gunner":{"health":4},"bruiser_commander":{"presence":7,"attack":4,"health":5},"bruiser_ambush":{"effect":{"kind":"ambush","amount":2},"rulesText":"Response: deal 2 damage to the attacker before combat."},"nightwalker_blade":{"health":4,"presence":4},"nightwalker_stalker":{"presence":5,"health":4},"nightwalker_marksman":{"presence":6},"nightwalker_saboteur":{"presence":5},"nightwalker_scout":{"presence":6,"health":6},"nightwalker_commander":{"presence":7,"health":6},"nightwalker_ambush":{"effect":{"kind":"ambush","amount":4},"rulesText":"Response: deal 4 damage to the attacker before combat."},"nightwalker_strike":{"effect":{"kind":"damage","amount":4},"rulesText":"Deal 4 damage to one enemy battlefield card."},"rogue_outrider":{"health":5},"rogue_skirmisher":{"attack":4},"rogue_scrapper":{"presence":5,"health":5},"rogue_commander":{"traits":["command","mobile","medic"],"rulesText":"Unique. Command — other allies here gain +1 Attack. Mobile. Medic — heal each ally here by 1 at your turn start."},"bruiser_rupture_heavy":{"health":4},"stonewall_watchguard":{"health":6},"stonewall_recovery_team":{"health":4},"bruiser_overrun_charge":{"effect":{"kind":"damage","amount":4},"rulesText":"Deal 4 damage to one enemy battlefield card. Spending and a major action are required.","presence":4},"bruiser_shock_runner":{"health":5},"syndicate_eliminator":{"health":5},"rogue_lancer":{"health":5,"presence":6},"rogue_raid":{"effect":{"kind":"damage","amount":4},"rulesText":"Deal 4 damage to one enemy battlefield card."},"rogue_broker":{"health":6},"syndicate_tactical_medic":{"health":4}},"decks":{},"config":{}}});
  REGISTRY.push({"id":"candidate05-assault4","name":"Sprint 5 hypothesis candidate05-assault4","version":"sprint5-candidate05-assault4-v1","description":"Explicit compiled-data-diff-verified targeted experiment. Exact hypothesis and source retained.","changes":{"cards":{"bruiser_assault":{"attack":3,"health":4},"bruiser_heavy":{"presence":7,"attack":4,"health":6},"bruiser_brawler":{"health":4},"bruiser_breacher":{"health":5},"bruiser_vanguard":{"attack":3,"health":5,"traits":[],"rulesText":"A forward screen with the Presence to occupy ground; vulnerable to precision fire."},"bruiser_gunner":{"health":4},"bruiser_commander":{"presence":7,"attack":4,"health":5},"bruiser_ambush":{"effect":{"kind":"ambush","amount":2},"rulesText":"Response: deal 2 damage to the attacker before combat."},"nightwalker_blade":{"health":4,"presence":4},"nightwalker_stalker":{"presence":5,"health":4},"nightwalker_marksman":{"presence":6},"nightwalker_saboteur":{"presence":5},"nightwalker_scout":{"presence":6,"health":6},"nightwalker_commander":{"presence":7,"health":6},"nightwalker_ambush":{"effect":{"kind":"ambush","amount":4},"rulesText":"Response: deal 4 damage to the attacker before combat."},"nightwalker_strike":{"effect":{"kind":"damage","amount":4},"rulesText":"Deal 4 damage to one enemy battlefield card."},"rogue_outrider":{"health":5},"rogue_skirmisher":{"attack":4},"rogue_scrapper":{"presence":5,"health":5},"rogue_commander":{"traits":["command","mobile","medic"],"rulesText":"Unique. Command — other allies here gain +1 Attack. Mobile. Medic — heal each ally here by 1 at your turn start."},"bruiser_rupture_heavy":{"health":4},"stonewall_watchguard":{"health":6},"stonewall_recovery_team":{"health":4},"bruiser_overrun_charge":{"effect":{"kind":"damage","amount":4},"rulesText":"Deal 4 damage to one enemy battlefield card. Spending and a major action are required.","presence":4},"bruiser_shock_runner":{"health":5},"syndicate_eliminator":{"health":5},"rogue_lancer":{"health":5,"presence":6},"rogue_raid":{"effect":{"kind":"damage","amount":4},"rulesText":"Deal 4 damage to one enemy battlefield card."},"rogue_broker":{"health":6},"syndicate_tactical_medic":{"health":4}},"decks":{},"config":{}}});
  const clone=value=>JSON.parse(JSON.stringify(value));
  const allowedCardFields=['presence','attack','health','traits','effect','rulesText','unique'];
  const traits=new Set(['fortify','guard','medic','mobile','command','rush','berserk','precision','retaliate','scavenge']);
  const effects=new Set(['heal','shield','rally','damage','draw','ambush','disrupt','counter','retreat','reclaim','sabotage']);
  function getProfile(id){const profile=REGISTRY.find(p=>p.id===id);if(!profile)throw new Error('Unknown balance profile: '+id);return clone(profile);}
  function validate(data){
    for(const [id,c] of Object.entries(data.CARDS)){
      if(c.id!==id||!data.FACTIONS[c.faction])throw new Error('Invalid card identity: '+id);
      if(!Number.isInteger(c.presence)||c.presence<1||!Number.isInteger(c.attack)||c.attack<0||!Number.isInteger(c.health)||c.health<(c.type==='order'?0:1))throw new Error('Invalid card values: '+id);
      if(!Array.isArray(c.traits)||c.traits.some(t=>!traits.has(t)))throw new Error('Invalid traits: '+id);
      if(c.type==='order'&&(!c.effect||!effects.has(c.effect.kind)||!Number.isInteger(c.effect.amount)||c.effect.amount<0))throw new Error('Invalid Order effect: '+id);
      if(typeof c.rulesText!=='string'||!c.rulesText.trim())throw new Error('Missing card text: '+id);
    }
    for(const [faction,deck] of Object.entries(data.DECKS)){
      if(!data.FACTIONS[faction]||!Array.isArray(deck)||deck.length!==26||deck.some(id=>!data.CARDS[id]||data.CARDS[id].faction!==faction))throw new Error('Invalid 26-card faction starter: '+faction);
    }
    for(const [key,value] of Object.entries(data.DEFAULT_CONFIG))if(!Number.isInteger(value)||value<(key==='commandGrowth'||key==='drawCount'?0:1))throw new Error('Invalid rule value: '+key);
    if(data.DEFAULT_CONFIG.commandCap<data.DEFAULT_CONFIG.startingCommand)throw new Error('Command cap below starting capacity');
    return data;
  }
  function dataFor(id){
    const profile=getProfile(id||DEFAULT_PROFILE),data=clone(Base);
    for(const [cardId,override] of Object.entries(profile.changes.cards)){
      if(!data.CARDS[cardId])throw new Error('Unknown overridden card: '+cardId);
      for(const key of Object.keys(override))if(!allowedCardFields.includes(key))throw new Error('Unsupported card override: '+key);
      Object.assign(data.CARDS[cardId],clone(override));
    }
    for(const [faction,deck] of Object.entries(profile.changes.decks)){
      if(!data.DECKS[faction])throw new Error('Unknown overridden deck: '+faction);
      data.DECKS[faction]=clone(deck);
    }
    for(const [key,value] of Object.entries(profile.changes.config)){
      if(!(key in data.DEFAULT_CONFIG))throw new Error('Unknown overridden rule: '+key);
      data.DEFAULT_CONFIG[key]=value;
    }
    data.BALANCE_PROFILE=profile.id;data.BALANCE_VERSION=profile.version;
    return validate(data);
  }
  function createRuntime(id){
    const profile=getProfile(id||DEFAULT_PROFILE),data=dataFor(profile.id),engine=Engine.withData(data);
    return {data,engine,ai:AI.forRules(data,engine),profile};
  }
  return {VERSION,DEFAULT_PROFILE,getProfiles:()=>clone(REGISTRY),dataFor,createRuntime};
});
