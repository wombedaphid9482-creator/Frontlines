/* Forge XI: deterministic tactical alternatives. Historical pools never receive
 * these definitions; the active balance profile opts into this module. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.FrontlinesTacticalArsenal=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='frontlines-tactical-arsenal-011-v1',SET='tactical-011';
  function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
  const cards={};
  const titles={stonewall:'Stonewall',bruiser:'Bruiser',syndicate:'The Syndicate',nightwalker:'Nightwalker',rogue:'Rogue'};
  const parent={stonewall:'bastion',bruiser:'shock-assault',syndicate:'combined-arms',nightwalker:'assassination',rogue:'wildcard'};
  const mechanicTags={interlockingFire:['cover'],holdFast:['cover'],assault:['exposed'],contingency:['cover'],cleanExit:['dodge'],salvageBlast:['sacrifice','blast'],sacrificeRepair:['sacrifice'],badPlan:['sacrifice','cover','dodge'],smoke:['smoke']};
  function ability(id,name,kind,amount,target='friendly',presence=1,extra={}){
    return {id,name,cost:{presence,commandActions:1},effect:{kind,amount,...extra},targetScope:'here',target};
  }
  function targeting(effect){
    const owners={cover:'friendly',heal:'friendly',dodge:'friendly',exposed:'enemy',suppression:'enemy',smoke:'territory',blast:'territory',breach:'enemy',holdFast:'territory',assault:'friendly',breakPosition:'territory',contingency:'territory',cleanExit:'friendly',salvageBlast:'friendly',sacrificeRepair:'friendly',badPlan:'friendly',interlockingFire:'territory',adapt:'mode'};
    if(!effect)return {owner:'none',required:false};
    if(effect.kind==='adapt')return {owner:'mode',required:false,modes:Object.fromEntries(effect.modes.map(m=>[m.id,{owner:owners[m.kind],required:true}]))};
    const owner=owners[effect.kind];return {owner,required:owner!=='none'};
  }
  function add(faction,key,name,type,presence,attack,health,rarity,role,text,intent,extra={}){
    const id=faction+'_'+key,traits=extra.traits||[],tactical=extra.tactical||{},effect=extra.effect;
    const commandCost=extra.commandCost??(type==='order'?1:0);
    const mechanics=[...(tactical.onDeploy||[]).map(e=>e.kind),...(tactical.onStart||[]).map(e=>e.kind),...(tactical.onAttack||[]).map(e=>e.kind),...(tactical.ability?[tactical.ability.effect.kind]:[]),...(tactical.overwatch?['overwatch']:[]),...(effect?[effect.kind,...(effect.modes||[]).map(e=>e.kind)]:[])];
    cards[id]={id,name,faction,type,presence,attack,health,rarity,set:SET,commandCost,traits,
      archetype:parent[faction],archetypes:[parent[faction]],role,artRole:type==='leader'?'commander':/heavy|linebreaker|shield/.test(key)?'heavy':'specialist',
      rulesText:text+' '+(commandCost?'Playing costs '+commandCost+' Command Action in addition to Capacity.':'Free Action — playing costs Capacity; no Command Action.'),
      designIntent:intent,tags:[...new Set([role,...traits,...mechanics,...mechanics.flatMap(k=>mechanicTags[k]||[])])],ai:{role,priority:type==='order'?'tactical':'support'},
      targeting:targeting(effect),artSrc:'assets/cards/tactical-011/'+faction+'/'+id+'.svg',flavorText:extra.flavorText||'',...extra};
  }
  function order(faction,key,name,presence,rarity,role,text,intent,kind,amount,extra={}){add(faction,key,name,'order',presence,0,0,rarity,role,text,intent,{timing:'action',effect:{kind,amount,...(extra.effect||{})},...Object.fromEntries(Object.entries(extra).filter(([k])=>k!=='effect'))});}

  add('stonewall','trench_engineer','Trench Engineer','unit',3,1,4,'common','cover engineer',
    'On deployment: gain Cover. Entrench — pay 1 Capacity and 1 Command Action; exhaust to give one ally here Cover. Cover reduces the next direct enemy attack by 2, then is consumed; it never stacks.',
    'A weak attacker turns spare actions and Capacity into one-shot protection. Blast and Breach answer the position.',
    {tactical:{onDeploy:[{kind:'cover',amount:2,target:'self'}],ability:ability('entrench','Entrench','cover',2)}});
  add('stonewall','shield_section','Shield Section','unit',5,1,6,'uncommon','protective section',
    'Guard. Shield Wall — pay 1 Capacity and 1 Command Action; exhaust to give another ally here Cover. Guard remains vulnerable to Precision and prepared Breach.',
    'Protect a valuable neighbor by sacrificing this section’s readiness; does not passively cover the whole army.',
    {traits:['guard'],tactical:{ability:ability('shield-wall','Shield Wall','cover',2,'friendly',1,{excludeSelf:true})}});
  add('stonewall','bastion_gunner','Bastion Gunner','unit',6,3,5,'rare','prepared gunner',
    'Overwatch — instead of attacking, pay 1 Command Action and exhaust. The first enemy deployment or movement into this territory takes 2 direct damage; consume Overwatch. It expires when your next action window begins.',
    'A substantial stationary commitment deters careless entry but does not react to enemies already present.',
    {tactical:{overwatch:{damage:2,commandActions:1,presence:0}},commandCost:1});
  add('stonewall','field_mechanic','Field Mechanic','unit',4,1,4,'common','field repair',
    'Repair — pay 1 Capacity and 1 Command Action; exhaust to heal one damaged friendly unit or Asset here by 2. Repair does not raise maximum Health.',
    'Trades attack tempo and paid maintenance for controlled chip-damage repair rather than repeatable free healing.',
    {tactical:{ability:ability('repair','Repair','heal',2)}});
  add('stonewall','hardpoint','Hardpoint','asset',5,0,6,'rare','prepared infrastructure',
    'At the beginning of your action window: give the most wounded friendly unit here Cover (ties: lowest unit ID). One unit only; Cover does not stack. Immobile. Breach attacks gain their printed Asset bonus.',
    'An interactable, nonattacking position prepares one defender and is vulnerable to dedicated anti-Asset pressure.',
    {tactical:{onStart:[{kind:'cover',amount:2,target:'friendlyHere',maxTargets:1,unitsOnly:true,excludeSelf:true}]}});
  order('stonewall','dig_in','Dig In',2,'common','emergency cover',
    'Give one friendly permanent Cover. The next eligible direct enemy attack is reduced by 2, then Cover is consumed. Cover expires at your next action-window start. Blast bypasses it; Breach removes it.',
    'Emergency paid defense preserves actions but buys only a single protected exchange.','cover',2,{commandCost:0});
  order('stonewall','interlocking_fire','Interlocking Fire',3,'uncommon','coordinated defense',
    'Choose a territory with at least two friendly units. Give up to two of them Cover, choosing the most wounded first (ties: lowest unit ID). Each charge reduces one direct attack by 2; never stacks.',
    'Rewards concentration but competes with deployment and loses value to area damage.','interlockingFire',2,{effect:{maxTargets:2,minimumAllies:2}});
  order('stonewall','hold_fast','Hold Fast',5,'legendary','defensive conversion',
    'Choose territory with at least two friendly units, including one that survived defending combat in the immediately preceding enemy action window. Heal its friendly units by 1 and give up to two Cover. Gain +2 capture pressure there until this action window ends. No instant capture or unresolved-defender bypass.',
    'Converts a successful defensive stand into a brief controlled advance; requires a real surviving defender and cannot hold indefinitely.','holdFast',1,{effect:{maxTargets:2,pressure:2,minimumAllies:2,requiresDefended:true}});

  add('bruiser','demolition_squad','Demolition Squad','unit',5,3,4,'common','breach infantry',
    'Breach — direct attacks remove and ignore Cover. Deal +1 combat damage against Assets only. No bonus against ordinary units without Cover.',
    'A fragile dedicated fortification answer loses efficiency against unprepared troops.',
    {traits:['breach'],tactical:{breachAssetBonus:1}});
  add('bruiser','grenadier','Grenadier','unit',5,2,4,'uncommon','grenade specialist',
    'Grenade — pay 2 Capacity and 1 Command Action; exhaust to deal 2 Blast damage to up to two enemies here (lowest unit IDs first). Blast bypasses Cover and Dodge; it gains no Asset bonus.',
    'A poor raw combat body supplies paid, limited area damage against clustered defenders.',
    {tactical:{ability:ability('grenade','Grenade','blast',2,'territory',2,{maxTargets:2,bypassCover:true})}});
  add('bruiser','suppressor_heavy','Suppressor Heavy','unit',7,3,6,'rare','assault suppression',
    'Suppressive Fire — pay 1 Capacity and 1 Command Action; exhaust to Suppress an enemy here. Until its next action-window end it has −1 Attack and cannot voluntarily move; refreshes duration, never stacks.',
    'Ties up an expensive Heavy to limit mobility without preventing deployment, Orders, abilities or attacks.',
    {tactical:{ability:ability('suppressive-fire','Suppressive Fire','suppression',1,'enemy',1)},commandCost:1});
  add('bruiser','linebreaker','Linebreaker','unit',7,4,5,'rare','fortification assault',
    'Breach — remove and ignore Cover when attacking. Deal +2 combat damage against Assets only. Aggressive commitment; wounds and failed assaults are not refunded.',
    'An expensive anti-infrastructure finisher remains killable and is less efficient against mobile forces.',
    {traits:['breach'],tactical:{breachAssetBonus:2},commandCost:1});
  order('bruiser','assault_charge','Assault Charge',3,'common','risky assault',
    'Give one ready friendly unit +2 Attack and Exposed until your next action window begins. Exposed removes Cover and Dodge; its next direct enemy hit deals +1 damage. Does not ready an exhausted or newly deployed unit.',
    'Paid pressure exposes the attacker to a real counterattack instead of granting extra attacks.','assault',2,{effect:{unitsOnly:true}});
  order('bruiser','frag_out','Frag Out',4,'common','limited blast',
    'Choose a territory containing enemies. Deal 2 Blast damage to up to two enemy permanents there (lowest unit IDs first). Blast bypasses Cover and Dodge; never damages friendly cards.',
    'Answers clustered preparation with a sensible two-target cap and a full action cost.','blast',2,{effect:{maxTargets:2,bypassCover:true}});
  order('bruiser','no_shelter','No Shelter',3,'uncommon','anti-fortification',
    'Choose an enemy permanent. Remove its Cover, then deal 1 damage, or 3 if it is an Asset. This effect ignores Cover; Dodge can avoid it unless countered by Mark or Exposed. No bonus against ordinary units.',
    'An efficient narrow Asset answer is deliberately modest against an unfortified unit.','breach',1,{effect:{assetBonus:2}});
  order('bruiser','break_the_position','Break the Position',5,'legendary','breach momentum',
    'Choose territory with a friendly unit and a Covered or wounded enemy, or an enemy Asset. Remove enemy Cover there, Suppress one eligible enemy (lowest ID), and ready one friendly unit there (lowest ID) that has not attacked this action window. Never grants a second attack.',
    'Requires a contested damaged position, pays an action, and converts a cracked defense into one usable follow-up.','breakPosition',1);

  add('syndicate','spotter_cell','Spotter Cell','unit',3,1,3,'common','exposure spotter',
    'Designate — pay 1 Capacity and 1 Command Action; exhaust to Mark and Expose one enemy here. Exposed removes Cover/Dodge and adds +1 to its next direct enemy hit. Both statuses have explicit expiry.',
    'A low-stat setup piece earns value only if another unit can exploit its paid action.',
    {tactical:{ability:ability('designate','Designate','exposed',1,'enemy',1,{mark:true})}});
  add('syndicate','fire_control_officer','Fire Control Officer','leader',6,2,4,'rare','fire coordination',
    'Command — other allies here gain +1 Attack. Fire Solution — pay 1 Capacity and 1 Command Action; exhaust to Expose one already Marked enemy here. No legal target without Mark.',
    'A fragile command unit coordinates ordinary pieces and demands sequencing instead of supplying unconditional removal.',
    {traits:['command'],tactical:{ability:ability('fire-solution','Fire Solution','exposed',1,'enemy',1,{requiresMarked:true})},commandCost:1});
  add('syndicate','contract_marksman','Contract Marksman','unit',6,3,4,'uncommon','prepared precision',
    'Precision — bypass Guard and counter Dodge. Direct attacks deal +1 damage to an already Marked or Exposed target. This preparation bonus is once per attack, even if both statuses apply.',
    'A costly fragile specialist depends on setup to exceed an ordinary attacker’s performance.',
    {traits:['precision'],tactical:{preparedBonus:1}});
  add('syndicate','suppression_team','Suppression Team','unit',4,2,4,'common','controlled suppression',
    'Pinpoint Fire — pay 1 Capacity and 1 Command Action; exhaust to Suppress one enemy here. It has −1 Attack and cannot voluntarily move until its next action-window end. Does not stack.',
    'A modest body exchanges its own readiness for predictable tempo control rather than hard denial.',
    {tactical:{ability:ability('pinpoint-fire','Pinpoint Fire','suppression',1,'enemy',1)}});
  add('syndicate','recon_drone','Recon Drone','asset',3,0,3,'rare','target network',
    'Target Scan — pay 1 Capacity and 1 Command Action; exhaust to Mark and Expose one enemy here. Immobile and fragile; it does not reveal hidden hands or deck order.',
    'Interactable infrastructure sets up local targeting without card draw or omniscient information.',
    {tactical:{ability:ability('target-scan','Target Scan','exposed',1,'enemy',1,{mark:true})}});
  order('syndicate','target_package','Target Package',2,'common','target setup',
    'Mark and Expose one enemy permanent. Exposed removes Cover and Dodge and adds +1 to its next direct enemy hit; it expires when that enemy’s next action window begins. Marks never stack.',
    'Setup spends Capacity and an action, so it needs an immediate or planned payoff.','exposed',1,{effect:{mark:true}});
  order('syndicate','coordinated_barrage','Coordinated Barrage',4,'uncommon','prepared blast',
    'Choose enemy-occupied territory. Deal 1 Blast damage to up to two enemies there (lowest IDs first), or 3 to each target already Marked or Exposed. Blast bypasses Cover/Dodge but does not consume Exposed’s direct-hit charge.',
    'Narrow powerful area payoff requires public preparation and is weak when fired without setup.','blast',1,{effect:{maxTargets:2,preparedBonus:2,bypassCover:true}});
  order('syndicate','contingency_plan','Contingency Plan',4,'legendary','combined arms contingency',
    'Choose territory with at least two different friendly unit classes. Give up to two friendly units Cover (most wounded first, ties: lowest ID), then draw 1 card. Requires combined arms; no free actions or resource refund.',
    'Defensive sequencing replenishes one committed card only when multiple ordinary pieces are established.','contingency',2,{effect:{maxTargets:2,minimumClasses:2,draw:1}});

  add('nightwalker','smoke_runner','Smoke Runner','unit',3,1,3,'common','evasive courier',
    'Mobile. On deployment: gain Dodge until your next action window begins. Dodge cancels the next direct enemy attack unless its attacker is Precision or you are Marked/Exposed; no random rolls.',
    'Cheap fragile timing protection is consumed by one engagement and cannot sustain a frontline.',
    {traits:['mobile'],tactical:{onDeploy:[{kind:'dodge',amount:1,target:'self'}]}});
  add('nightwalker','ghost_operative','Ghost Operative','unit',5,3,3,'uncommon','evasive strike',
    'Precision. On deployment: gain Dodge until your next action window begins. After that one charge is consumed or expires, this operative has only 3 Health.',
    'A visible evasive entry buys an opening; prepared targeting and attrition remain efficient answers.',
    {traits:['precision'],tactical:{onDeploy:[{kind:'dodge',amount:1,target:'self'}]}});
  add('nightwalker','shadow_trapper','Shadow Trapper','unit',4,2,3,'rare','visible ambush trap',
    'Overwatch — instead of attacking, pay 1 Command Action and exhaust. First enemy deployment or movement here takes 2 direct damage. Visible, consumed after one trigger; expires at your next action-window start.',
    'A fragile, readable threat manipulates entry timing without hidden dice, permanent stun or unavoidable global damage.',
    {tactical:{overwatch:{damage:2,commandActions:1,presence:0}}});
  add('nightwalker','false_contact','False Contact','asset',2,0,2,'common','decoy screen',
    'Guard. On deployment: gain Dodge until your next action window begins. This immobile decoy can intercept ordinary attacks while ready, but Precision bypasses it and Mark/Exposed counters Dodge.',
    'Cheap fragile deception buys one bad target rather than becoming permanently untargetable.',
    {traits:['guard'],tactical:{onDeploy:[{kind:'dodge',amount:1,target:'self'}]}});
  order('nightwalker','smoke_screen','Smoke Screen',3,'uncommon','local smoke',
    'Choose territory with a friendly permanent. Smoke reduces direct enemy damage to your permanents there by 1 and blocks Overwatch reactions in that territory. It lasts until your next action window begins. Blast bypasses Smoke; Mark targeting remains legal.',
    'Local paid misdirection counters prepared reactions but does not hide or disable the battlefield.','smoke',1);
  order('nightwalker','vanish','Vanish',2,'common','evasive timing',
    'Give one friendly unit Dodge until your next action window begins. One direct enemy attack is canceled unless answered by Precision, Mark or Exposed. No healing, draw, teleport or readiness refund.',
    'Protect a valuable fragile piece for one timing window rather than reclaiming it into a free full-health reset.','dodge',1,{effect:{unitsOnly:true}});
  order('nightwalker','expose_the_opening','Expose the Opening',2,'rare','punish overextension',
    'Expose one enemy unit that is wounded or exhausted. Remove Cover/Dodge; its next direct enemy hit gains +1 damage. Expires when its next action window begins; no effect on an uncommitted healthy ready unit.',
    'Rewards reading visible overextension and supplies no unconditional stat or removal advantage.','exposed',1,{effect:{requiresVulnerable:true,unitsOnly:true}});
  order('nightwalker','clean_exit','Clean Exit',4,'legendary','strike and disengage',
    'Choose a friendly unit that is wounded or has attacked this action window. Retreat it one territory toward your own rear and give it Dodge. Requires room; retains wounds and attack locks. No reclaim, draw or redeployment refund.',
    'A paid, constrained escape lets an accomplished strike survive without recreating a heal or casualty loop.','cleanExit',1,{effect:{requiresWoundedOrAttacked:true,unitsOnly:true}});

  add('rogue','scrap_grenadier','Scrap Grenadier','unit',3,1,3,'common','improvised grenade',
    'Scrap Bomb — pay 2 Capacity and 1 Command Action; exhaust to deal 1 Blast damage to up to two enemies here (lowest IDs first). Blast bypasses Cover/Dodge. Less damage and a frailer body than Grenadier.',
    'Cheap awkward equipment buys a weaker version of the specialist answer while still paying its firing cost.',
    {tactical:{ability:ability('scrap-bomb','Scrap Bomb','blast',1,'territory',2,{maxTargets:2,bypassCover:true})}});
  add('rogue','jury_rigged_shield','Jury-Rigged Shield','asset',3,0,3,'uncommon','patched cover',
    'Patch Cover — pay 1 Capacity and 1 Command Action; exhaust to give another ally here Cover. Immobile, fragile and vulnerable to Breach. No free repeating shield supply.',
    'An improvised defensive tool is less durable than Hardpoint and pays both readiness and upkeep.',
    {tactical:{ability:ability('patch-cover','Patch Cover','cover',2,'friendly',1,{excludeSelf:true})}});
  add('rogue','patch_runner','Patch Runner','unit',4,1,3,'common','mobile emergency repair',
    'Mobile. Field Patch — pay 1 Capacity and 1 Command Action; exhaust to heal a damaged ally here by 1. Retains the normal move and attack limits.',
    'Flexibility and mobility trade away the specialist mechanic’s better repair and durability.',
    {traits:['mobile'],tactical:{ability:ability('field-patch','Field Patch','heal',1)}});
  add('rogue','improvised_mine','Improvised Mine','asset',2,0,2,'rare','visible movement trap',
    'On deployment: arm a visible Overwatch trap. The first enemy voluntary move or deployment here takes 2 direct damage, then destroy this mine through rule resolution. It expires when your next action window begins. Immobile; can be destroyed first; forced retreats do not trigger it.',
    'A visible expendable trap threatens predictable entry with a fragile interactable source; consuming it yields no casualty draw.',
    {tactical:{onDeploy:[{kind:'overwatch',amount:2,target:'self',consumeSelf:true}]}});
  order('rogue','make_it_work','Make It Work',3,'common','improvised modes',
    'Adapt — choose exactly one: Cover a friendly permanent; heal a wounded friendly permanent by 2; or Suppress an enemy permanent. All modes cost the same Capacity and 1 Command Action. No random result, draw or refund.',
    'Three useful imperfect answers trade efficiency for a deliberate, predictable choice.','adapt',0,{effect:{modes:[{id:'cover',label:'Patch defense — Cover',kind:'cover',amount:2},{id:'repair',label:'Field repair — heal 2',kind:'heal',amount:2},{id:'suppress',label:'Improvised fire — Suppression',kind:'suppression',amount:1}]}});
  order('rogue','salvage_charge','Salvage Charge',3,'uncommon','sacrificial blast',
    'Sacrifice a friendly permanent in territory containing enemies. Deal 2 Blast damage to up to two enemies there (lowest IDs first). Sacrifice destroys your chosen card and never triggers Scavenge or Nothing Wasted; no draw or refund.',
    'A real lost battlefield piece and paid Order turn awkward equipment into a narrow grenade payoff.','salvageBlast',2,{effect:{maxTargets:2,bypassCover:true}});
  order('rogue','strip_it_for_parts','Strip It for Parts',2,'rare','sacrificial repair',
    'Choose a friendly permanent to Sacrifice and another damaged friendly permanent in the same territory. Heal the survivor by 3. Sacrifice destroys your source and never triggers casualty draw effects; no resource or card refund.',
    'Save the more important piece by spending a real smaller piece; cannot self-target or mint infinite material.','sacrificeRepair',3);
  order('rogue','bad_plan_good_result','Bad Plan, Good Result',4,'legendary','costly contingency',
    'Choose a wounded friendly permanent to Sacrifice and another friendly unit in the same territory. Give the survivor Cover and Dodge until its next action window begins. No draw, heal, readying or refund; Sacrifice does not trigger general casualty rewards.',
    'Rescue one threatened survivor through a visible paid trade, with both protections temporary and answerable.','badPlan',2,{effect:{requiresWounded:true}});

  const templates=[
    ['stonewall','prepared-ground','Prepared Ground',{rifles:3,defender:2,watchguard:2,escort:2,triage:2,brace:2,trench_engineer:2,shield_section:2,bastion_gunner:2,field_mechanic:1,hardpoint:2,dig_in:2,interlocking_fire:1,hold_fast:1}],
    ['bruiser','breach-column','Breach Column',{assault:3,heavy:2,breacher:2,shock_runner:2,rally:2,ambush:2,demolition_squad:2,grenadier:2,suppressor_heavy:1,linebreaker:2,assault_charge:2,frag_out:2,no_shelter:1,break_the_position:1}],
    ['syndicate','fire-control','Fire Control',{security:3,enforcer:2,observer:2,courier:2,precision_strike:2,counter:2,spotter_cell:2,fire_control_officer:1,contract_marksman:2,suppression_team:1,recon_drone:2,target_package:2,coordinated_barrage:2,contingency_plan:1}],
    ['nightwalker','smoke-and-mirrors','Smoke and Mirrors',{blade:3,stalker:2,marksman:2,recon:2,strike:2,ambush:2,smoke_runner:2,ghost_operative:2,shadow_trapper:2,false_contact:1,smoke_screen:2,vanish:2,expose_the_opening:1,clean_exit:1}],
    ['rogue','make-do','Make Do',{outrider:3,skirmisher:2,scrapper:2,salvage:2,repair_courier:2,retreat:2,scrap_grenadier:2,jury_rigged_shield:2,patch_runner:2,improvised_mine:1,make_it_work:2,salvage_charge:2,strip_it_for_parts:1,bad_plan_good_result:1}]
  ];
  const CARD_ADDITIONS=freeze(cards);
  const PRESETS=freeze(templates.map(([faction,archetype,title,counts])=>({id:faction+'-'+archetype,name:titles[faction]+' — '+title,faction,archetype,cards:Object.entries(counts).flatMap(([key,n])=>Array(n).fill(faction+'_'+key)),source:'preset',set:SET,deckGroup:'tactical-showcase'})));
  const ARCHETYPE_PARENTS=freeze(Object.fromEntries(templates.map(([faction,archetype])=>[archetype,parent[faction]])));
  return freeze({VERSION,SET,CARD_ADDITIONS,PRESETS,ARCHETYPE_PARENTS});
});
