/* Offline-compatible, explicit balance profiles. JSON files in balance/ are
 * reviewable mirrors of this embedded registry; tests require exact equivalence.
 * The immutable Sprint 2 definitions in data.js remain the historical baseline.
 */
(function(root,factory){
  'use strict';
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('./data.js'):root.FrontlinesData,node?require('./engine.js'):root.FrontlinesEngine,node?require('./ai.js'):root.FrontlinesAI,node?require('./arsenal.js'):root.FactionArsenal,node?require('./decks.js'):root.FrontlinesDecks);
  if(node)module.exports=api;
  root.FrontlinesBalance=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Base,Engine,AI,Arsenal,Decks){
  'use strict';
  const VERSION='frontlines-balance-registry-v4-arsenal';
  const DEFAULT_PROFILE='sprint7';
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
  // This is a rules revision, not a stat-balancing pass. Explicit card metadata
  // keeps future cards free to choose costs without type/name inference in the engine.
  const sprint6={id:'sprint6',name:'Sprint 6 — Capacity & Frontline',version:'sprint6-command-frontline-v1',
    description:'Capacity pays for ordinary forces and support. Three Command Actions pay for attacks, movement, tactical Orders and explicit major deployments. Captured defenders retreat to adjacent friendly ground or are eliminated. Arsenal v3 card stats are unchanged; fresh human-operated balance validation is pending.',
    changes:JSON.parse(JSON.stringify(REGISTRY.find(profile=>profile.id==='arsenal').changes)),
    rules:{actionEconomy:'capacity-command',frontlineIntegrity:true}};
  const majorDeployments=new Set(['stonewall_heavy','bruiser_heavy','bruiser_rupture_heavy',
    'stonewall_redoubt','bruiser_banner','syndicate_relay','nightwalker_beacon']);
  for(const definition of Object.values(Base.CARDS)){
    const previous=sprint6.changes.cards[definition.id]||{};
    const current={...definition,...previous};
    const reaction=current.type==='order'&&current.timing!=='action';
    const tactical=current.type==='order'&&['damage','rally','disrupt','sabotage'].includes(current.effect.kind);
    const commandCost=reaction?0:current.type==='leader'||majorDeployments.has(current.id)||tactical?1:0;
    let text=current.rulesText;
    if(current.id==='bruiser_shock_runner')text='Rush. Mobile — may move once and then attack on its deployment turn; movement and attack each cost 1 Command Action.';
    if(current.id==='bruiser_overrun_charge')text=`Deal ${current.effect.amount} damage to one enemy battlefield card.`;
    if(current.id==='nightwalker_ghost_extraction')text='Return one friendly battlefield card to hand, clearing wounds and freeing commitment. Redeployment pays its printed Capacity and Command Action cost.';
    sprint6.changes.cards[current.id]={...previous,commandCost,
      rulesText:text+(reaction?' Costs Capacity; no Command Action.':commandCost?' Costs 1 Command Action in addition to Capacity.':' Free Action — costs Capacity; no Command Action.')};
  }
  REGISTRY.push(sprint6);
  const sprint7={id:'sprint7',name:'Sprint 7 — Arsenal & Deckbuilding',version:'sprint7-arsenal-v1',
    description:'35 new faction cards, Armor/Mark/Reinforce/Adapt and five hybrid templates. Silencer Team deployment costs 1 Command Action; its stats and identity remain. Preserved v0.7.0 10k baseline revealed severe matchup and initiative skew. This expanded candidate has not received a new balance simulation.',
    changes:JSON.parse(JSON.stringify(sprint6.changes)),rules:{...sprint6.rules,arsenalMechanics:true}};
  sprint7.changes.cards.nightwalker_silencer={...sprint7.changes.cards.nightwalker_silencer,commandCost:1,
    rulesText:Base.CARDS.nightwalker_silencer.rulesText+' Costs 1 Command Action in addition to Capacity.'};
  sprint7.changes.additions=JSON.parse(JSON.stringify(Arsenal.CARD_ADDITIONS));
  REGISTRY.push(sprint7);
  const clone=value=>JSON.parse(JSON.stringify(value));
  const allowedCardFields=['presence','attack','health','traits','effect','rulesText','unique','commandCost'];
  const traits=new Set(['fortify','guard','medic','mobile','command','rush','berserk','precision','retaliate','scavenge','armor']);
  const effects=new Set(['heal','shield','rally','damage','draw','ambush','disrupt','counter','retreat','reclaim','sabotage','mark','reinforce','adapt']);
  function getProfile(id){const profile=REGISTRY.find(p=>p.id===id);if(!profile)throw new Error('Unknown balance profile: '+id);return clone(profile);}
  function validate(data){
    for(const [id,c] of Object.entries(data.CARDS)){
      if(c.id!==id||!data.FACTIONS[c.faction])throw new Error('Invalid card identity: '+id);
      if(!Number.isInteger(c.presence)||c.presence<1||!Number.isInteger(c.attack)||c.attack<0||!Number.isInteger(c.health)||c.health<(c.type==='order'?0:1))throw new Error('Invalid card values: '+id);
      if(!Array.isArray(c.traits)||c.traits.some(t=>!traits.has(t)))throw new Error('Invalid traits: '+id);
      if(c.type==='order'&&(!c.effect||!effects.has(c.effect.kind)||!Number.isInteger(c.effect.amount)||c.effect.amount<0))throw new Error('Invalid Order effect: '+id);
      if(typeof c.rulesText!=='string'||!c.rulesText.trim())throw new Error('Missing card text: '+id);
      if(c.commandCost!==undefined&&(!Number.isInteger(c.commandCost)||c.commandCost<0||c.commandCost>20))throw new Error('Invalid Command Action cost: '+id);
      if(!data.RULES?.arsenalMechanics&&(c.traits.includes('armor')||['mark','reinforce','adapt'].includes(c.effect?.kind)))throw new Error('Arsenal mechanics require the matching rules profile: '+id);
    }
    for(const [faction,deck] of Object.entries(data.DECKS)){
      if(!data.FACTIONS[faction]||!Array.isArray(deck)||deck.length!==Decks.RULES.size||deck.some(id=>!data.CARDS[id]||data.CARDS[id].faction!==faction))throw new Error('Invalid '+Decks.RULES.size+'-card faction starter: '+faction);
    }
    for(const [key,value] of Object.entries(data.DEFAULT_CONFIG))if(!Number.isInteger(value)||value<(key==='commandGrowth'||key==='drawCount'?0:1))throw new Error('Invalid rule value: '+key);
    if(data.DEFAULT_CONFIG.commandCap<data.DEFAULT_CONFIG.startingCommand)throw new Error('Command cap below starting capacity');
    const schema=Arsenal.validateCardPool(data,{presets:Decks.forData(data).presets()});if(!schema.valid)throw new Error('Card schema: '+schema.errors.join('; '));
    return data;
  }
  function dataFor(id){
    const profile=getProfile(id||DEFAULT_PROFILE),data=clone(Base);
    for(const [cardId,override] of Object.entries(profile.changes.cards)){
      if(!data.CARDS[cardId])throw new Error('Unknown overridden card: '+cardId);
      for(const key of Object.keys(override))if(!allowedCardFields.includes(key))throw new Error('Unsupported card override: '+key);
      Object.assign(data.CARDS[cardId],clone(override));
    }
    for(const [cardId,definition] of Object.entries(profile.changes.additions||{})){
      if(Object.hasOwn(data.CARDS,cardId))throw new Error('Duplicate expansion card: '+cardId);
      data.CARDS[cardId]=clone(definition);
    }
    if(profile.rules?.arsenalMechanics){
      for(const [id,definition] of Object.entries(data.CARDS))data.CARDS[id]={...definition,...Arsenal.metadataFor(definition)};
      data.ARSENAL_PRESETS=clone(Arsenal.PRESETS);
      data.ARCHETYPE_PARENTS=clone(Arsenal.ARCHETYPE_PARENTS||{});
      data.GLOSSARY={...data.GLOSSARY,...clone(Arsenal.KEYWORDS)};
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
    if(profile.rules){
      data.RULES=clone(profile.rules);
      data.GLOSSARY={...data.GLOSSARY,
        'Capacity':'Your army support limit. Available Capacity = total Capacity − committed Presence − temporary spending. Ordinary deployments spend no Command Action.',
        'Command':'Total Capacity, not Command Actions. Subsequent offensive turns grow Capacity to the configured cap and clear temporary spending.',
        'Command Actions':'Three per offensive turn by default. Attacks, moves, tactical Orders and cards with an explicit command cost consume Command Actions. Ordinary deployments and low-impact support are Free Actions; responses and counters never consume a Command Action.',
        'Actions':'Command Actions pay for major tactical decisions. Check each card’s command cost; ordinary deployments remain legal at zero Command Actions if Capacity and friendly slots are available.',
        'Free Action':'An action that consumes zero Command Actions. It still requires sufficient Capacity, a legal location/target, and the usual timing restrictions.',
        'Capture':'At offensive turn end, surviving cards in the contested territory add printed Presence to capture progress, even with enemies present. At threshold the territory is captured; enemy survivors immediately retreat toward home into adjacent friendly territory or are eliminated. Then the frontline advances and eligible attackers make a Breakthrough.',
        'Forced Retreat':'After capture, displaced defenders resolve in ascending card UID order. A unit retreats one territory toward its home only into friendly-owned ground with a free allied slot. Wounds remain; forced retreat costs no resources and exhausts the unit until its next turn. Immobile assets, full/no friendly destinations and units at home are eliminated.',
        'Frontline':'Owned ground stays contiguous on both sides of one contested objective. Enemy forces may occupy the objective, but never remain stranded behind the moving frontline.',
        'Reclaim':'Return a friendly permanent to hand, clearing wounds and freeing committed Presence. Redeployment pays that card’s Capacity and explicit Command Action cost.'};
    }
    return validate(data);
  }
  function createRuntime(id){
    const profile=getProfile(id||DEFAULT_PROFILE),data=dataFor(profile.id),engine=Engine.withData(data);
    return {data,engine,ai:AI.forRules(data,engine),profile};
  }
  return {VERSION,DEFAULT_PROFILE,getProfiles:()=>clone(REGISTRY),dataFor,createRuntime};
});
