/* Named, off-lane strategic leaders. Catalog text is the public rules contract. */
(function(root,factory){
  'use strict'; const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.FrontlinesCommanders=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='frontlines-commanders-v1';
  const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
  const COMMANDERS={};
  function add(id,faction,name,role,passiveName,passiveText,activeName,activeText,target,hookText,presence=2){
    COMMANDERS[id]={id,faction,name,role,type:'commander',artRole:'commander',rarity:'legendary',launch:true,
      passive:{name:passiveName,text:passiveText},active:{name:activeName,text:activeText,target,oncePerMatch:true,cost:{presence,commandActions:1}},
      hook:{name:'Deckbuilding direction',text:hookText}};
  }
  add('commander_stonewall_warden','stonewall','The Warden','Fortified endurance','Hold Fast',
    'At the start of your offensive turn, heal 1 damage from each allied battlefield card in territory you control.',
    'Lasting Resolve','Once per match: heal 3 damage from a damaged allied battlefield card and give it temporary Armor 1 until your next offensive turn. Armor does not stack with printed Armor.',
    'ally','Build around Fortify, Guard, durable units and Reinforce. Holding friendly ground lets wounded forces recover.');
  add('commander_stonewall_marshal','stonewall','The Marshal','Defensive counterattack','Return Fire',
    'An allied unit that survives as the defender in regular combat gains +1 Attack until the end of your next offensive turn. This bonus does not stack.',
    'Countermand','Once per match: ready an exhausted allied unit and give it +1 Attack until the end of this offensive turn. This bonus does not stack with Return Fire. Deployment-turn attack restrictions still apply.',
    'ally','Choose Guard, Retaliate and resilient attackers. Survive enemy pressure, then convert defensive survivors into a controlled counterattack.');
  add('commander_bruiser_breaker','bruiser','The Breaker','Frontline breakthrough','Drive Forward',
    'At your offensive turn end, add 2 extra capture progress if a Rush or Mobile allied unit occupies the contested territory. This is territorial pressure, not spendable Capacity.',
    'Breach Order','Once per match: ready an allied unit in the contested territory and give it +2 Attack until this offensive turn ends. Deployment-turn attack restrictions still apply.',
    'ally','Choose Rush, Mobile and cheap occupation units to establish pressure; commit the signature burst when it can break resistance.');
  add('commander_bruiser_bloodhound','bruiser','The Bloodhound','Elimination tempo','Scent of Weakness',
    'Your initiated regular combat attacks gain +1 Attack against a wounded enemy. The bonus does not apply to retaliation, direct damage or a target that was fully healed before combat resolves.',
    'Finish the Hunt','Once per match: deal 3 direct damage to a wounded enemy battlefield card. Direct damage ignores Armor and Fortify.',
    'enemy','Choose selective damage, Precision and aggressive finishers. Set up wounds before committing elimination attacks.');
  add('commander_syndicate_coordinator','syndicate','The Coordinator','Mark sequencing','Target Network',
    'Your action Orders whose selected effect is Mark cost 1 less Capacity, to a minimum of 1. Printed Presence and all other effects are unchanged.',
    'Priority Target','Once per match: Mark an enemy battlefield card and deal 2 direct damage to it. Mark lasts until its owner’s next offensive turn.',
    'enemy','Choose Mark, Precision and coordinated attackers. Spend less on setup, then exploit a visible target with regular combat.');
  add('commander_syndicate_quartermaster','syndicate','The Quartermaster','Efficient sequencing','Rapid Logistics',
    'The first action Order each offensive turn with printed Presence 3 or less and printed Command Action cost above 0 costs 0 Command Actions. Its Capacity cost is unchanged.',
    'Reserve Release','Once per match: clear up to 4 temporary spent Capacity and draw 2 cards. Does not release deployed commitment or exceed total Capacity.',
    'none','Choose inexpensive tactical Orders, draw support and efficient combined arms. Sequence the free tactical Order before costly commands.',0);
  add('commander_nightwalker_ghost','nightwalker','The Ghost','Precision timing','Veiled Entry',
    'The first Precision unit you deploy each offensive turn gains temporary Armor 1 until your next offensive turn. This does not stack with printed Armor.',
    'Fade to Shadow','Once per match: withdraw an allied unit one territory toward home into adjacent friendly ground, heal up to 3 damage and ready it. Destination slots and deployment-turn attack restrictions still apply.',
    'ally','Choose Precision units and Ambush responses. Protect the first infiltrator, then withdraw a valuable unit before it is overwhelmed.');
  add('commander_nightwalker_saboteur','nightwalker','The Saboteur','Frontline disruption','Supply Interference',
    'The first Sabotage action Order you resolve each offensive turn also locks 1 enemy available Capacity until their next offensive turn. It cannot lock committed Capacity.',
    'Blackout','Once per match: suppress the printed traits of every enemy battlefield card in the contested territory until its owner’s next offensive turn, and lock up to 2 enemy available Capacity for that window.',
    'frontline-enemies','Choose Sabotage, selective damage and occupation forces. Disable a frontline’s abilities before attacking; disrupted spending clears at enemy initiative.');
  add('commander_rogue_scavenger','rogue','The Scavenger','Salvaged value','Nothing Wasted',
    'The first allied battlefield card destroyed in each offensive initiative draws you 1 card. This may also trigger alongside a surviving unit’s Scavenge ability; each has its own limit.',
    'Recover the Fallen','Once per match: return the most recent non-Order card in your discard to your hand. Redeployment pays its printed costs and starts without wounds.',
    'none','Choose Scavenge, low-cost battlefield units and valuable recovery targets. Trade expendable forces while preserving tools for the next push.');
  add('commander_rogue_drifter','rogue','The Drifter','Adaptive positioning','Open Route',
    'Your first normal unit movement each offensive turn costs 0 Command Actions. Normal adjacency, readiness, slots and movement exhaustion rules still apply.',
    'Change the Plan','Once per match: relocate an allied unit to any territory you control or the contested territory, and ready it. Destination slots and deployment-turn attack restrictions still apply.',
    'relocate-ally','Choose Mobile and Adapt cards plus flexible occupation forces. Save a movement command, then redeploy pressure where the board opens.');
  const DEFAULTS={stonewall:'commander_stonewall_warden',bruiser:'commander_bruiser_breaker',syndicate:'commander_syndicate_coordinator',nightwalker:'commander_nightwalker_ghost',rogue:'commander_rogue_scavenger'};
  function get(id){return typeof id==='string'&&Object.hasOwn(COMMANDERS,id)?COMMANDERS[id]:null;}
  function list(faction){return Object.values(COMMANDERS).filter(c=>!faction||c.faction===faction);}
  function defaultFor(faction){return Object.hasOwn(DEFAULTS,faction)?DEFAULTS[faction]:null;}
  function synergy(card,id){
    const c=get(id),reasons=[];if(!c||!card||card.faction!==c.faction)return {score:0,reasons,reason:''};
    const traits=Array.isArray(card.traits)?card.traits:[],kind=card.effect?.kind,has=t=>traits.includes(t);
    const add=(condition,text)=>{if(condition)reasons.push(text);};
    switch(id){
      case 'commander_stonewall_warden':add(has('fortify')||has('guard')||kind==='reinforce','Holds protected friendly ground');add(card.health>=6,'Durability gives healing time to matter');break;
      case 'commander_stonewall_marshal':add(has('guard')||has('retaliate'),'Survives defensive exchanges to counterattack');add(card.health>=5&&card.attack>=3,'Can convert a survival bonus into pressure');break;
      case 'commander_bruiser_breaker':add(has('rush')||has('mobile'),'Enables extra frontline capture progress');add(card.type==='unit'&&card.presence<=4,'Supports an early occupation push');break;
      case 'commander_bruiser_bloodhound':add(kind==='damage'||has('precision'),'Prepares or finishes wounded targets');add(card.attack>=4,'Threatens a wounded defender');break;
      case 'commander_syndicate_coordinator':add(kind==='mark'||kind==='adapt'&&card.effect.modes?.some(m=>m.kind==='mark'),'Qualifies for the Mark setup discount');add(has('precision')||has('command'),'Supports the chosen combat target');break;
      case 'commander_syndicate_quartermaster':add(card.type==='order'&&card.timing==='action'&&card.presence<=3&&card.commandCost>0,'Qualifies for a free tactical Order each turn');add(kind==='draw'||card.type==='unit'&&card.presence<=4,'Sustains efficient sequencing');break;
      case 'commander_nightwalker_ghost':add(has('precision'),'Qualifies for the protected first entry');add(kind==='ambush'||kind==='retreat'||has('mobile'),'Supports an evasive timing window');break;
      case 'commander_nightwalker_saboteur':add(kind==='sabotage'||kind==='disrupt','Disrupts enemy setup');add(has('precision')||kind==='damage','Exploits a disabled defender');break;
      case 'commander_rogue_scavenger':add(has('scavenge'),'Adds another limited casualty draw source');add(card.type!=='order'&&(card.presence<=3||card.presence>=6),'Provides an expendable force or recovery target');break;
      case 'commander_rogue_drifter':add(has('mobile'),'Can move without losing its first ready window');add(kind==='adapt'||kind==='rally'||kind==='reclaim','Offers another tactical plan');break;
    }
    return {score:reasons.length,reasons,reason:reasons.join('; ')};
  }
  freeze(COMMANDERS);freeze(DEFAULTS);
  return freeze({VERSION,COMMANDERS,DEFAULTS,list,get,defaultFor,synergy});
});
