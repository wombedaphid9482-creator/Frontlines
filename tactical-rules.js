/* Canonical deterministic tactical statuses. No DOM, clock, or private deck reads. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.FrontlinesTacticalRules=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const VERSION='frontlines-tactical-rules-v1';
 const MECHANICS={
  Cover:{definition:'Reduce the next eligible direct enemy hit by 2, then consume Cover.',timing:'Expires at the protected owner’s next action-window start.',stack:'One charge; reapplication refreshes duration, never adds charges.',counter:'Breach removes it; Blast bypasses it.',examples:'Stonewall Dig In; Rogue Jury-Rigged Shield.'},
  Breach:{definition:'An initiated Breach attack removes and ignores Cover; only printed cards grant an Asset bonus.',timing:'Applies to the initiated direct hit, not return fire.',stack:'One printed property; no bonus unless the target is an Asset.',counter:'Unprepared mobile units deny the specialist bonus.',examples:'Bruiser Demolition Squad and Linebreaker; No Shelter.'},
  Blast:{definition:'Damage at most the printed number of enemy permanents in a chosen territory, in ascending numeric card UID order.',timing:'All selected damage is applied before casualties resolve.',stack:'Separate paid effects; never hits allies. Bypasses Cover and Dodge without consuming them; no Mark bonus.',counter:'Spread out, remove the Grenadier, or avoid clustering.',examples:'Bruiser Frag Out; Rogue Salvage Charge.'},
  Dodge:{definition:'Avoid the next eligible direct enemy hit, then consume Dodge; deterministic, with no miss roll.',timing:'Expires at the protected owner’s next action-window start.',stack:'One charge; reapplication refreshes duration.',counter:'Mark or Precision bypasses and consumes it; Exposed removes it; Blast bypasses without consuming it.',examples:'Nightwalker Vanish and Ghost Operative.'},
  Suppression:{definition:'The target has −1 Attack (minimum zero) and cannot voluntarily move.',timing:'Expires at the end of the target’s next action window after application. Forced retreat still resolves.',stack:'Reapplication refreshes duration; the penalty never stacks. Printed traits remain active.',counter:'Attack, use Orders/abilities, or wait for expiry; this is distinct from Sabotage.',examples:'Bruiser Suppressor Heavy; Syndicate Suppression Team.'},
  Overwatch:{definition:'A prepared source reacts once to the first enemy voluntary entry into its territory with printed direct damage.',timing:'Pay 1 Command Action and exhaust a ready unit instead of attacking; fresh deployments require Rush. Expires at its owner’s next action-window start.',stack:'One charge per source. Sources resolve in numeric UID order; stop when the entrant dies. Forced retreat and Breakthrough never trigger it.',counter:'Smoke prevents the reaction while present; remove the source, or enter with expendable/protected troops.',examples:'Stonewall Bastion Gunner; Nightwalker Shadow Trapper. Improvised Mine auto-arms on deployment and destroys itself after reacting.'},
  Sacrifice:{definition:'Voluntarily destroy your chosen friendly permanent as an explicit, irreversible cost.',timing:'Paid atomically only after every cost and payoff target is legal; consumes the real battlefield card.',stack:'Each paid card resolves once. Sacrifice never triggers Scavenge or Nothing Wasted.',counter:'Remove or separate potential sacrifice/payoff pieces; an illegal payoff cannot spend the cost.',examples:'Rogue Salvage Charge, Strip It for Parts, Bad Plan, Good Result.'},
  Exposed:{definition:'Remove Cover and Dodge immediately; add +1 to the next eligible direct enemy hit, then consume Exposed.',timing:'Expires at the target owner’s next action-window start.',stack:'One charge; reapplication refreshes duration, never multiplies damage.',counter:'Delay the engagement until expiry or use ordinary protection; no bonus to Blast or return fire.',examples:'Syndicate Target Package; Nightwalker Expose the Opening.'}
 };
 const SMOKE={definition:'Friendly permanents in this territory take 1 less damage from direct enemy hits; Overwatch cannot react to entry here while Smoke exists.',timing:'Expires at the smoke owner’s next action-window start.',stack:'One zone effect per owner; refresh duration, never stack reductions.',counter:'Blast bypasses Smoke; enemies already present can attack, Mark and expose normally.',examples:'Nightwalker Smoke Screen.'};
 const KINDS=['cover','dodge','suppression','overwatch','exposed','smoke','attackBoost','pressure'];
 const EFFECTS=['cover','dodge','suppression','exposed','smoke','blast','breach','interlockingFire','holdFast','assault','breakPosition','contingency','cleanExit','salvageBlast','sacrificeRepair','badPlan'];
 const TERRITORY_EFFECTS=['smoke','blast','interlockingFire','holdFast','breakPosition','contingency','salvageBlast'];
 const SACRIFICE_EFFECTS=['salvageBlast','sacrificeRepair','badPlan'];
 const labels={cover:'Cover',dodge:'Dodge',suppression:'Suppressed',overwatch:'Overwatch',exposed:'Exposed',smoke:'Smoke',attackBoost:'Assault +2',pressure:'Stand +2 pressure'};
 const uidNumber=u=>Number(/(\d+)$/.exec(u.uid)?.[1]||0);
 function compare(a,b){return uidNumber(a)-uidNumber(b)||(a.uid<b.uid?-1:a.uid>b.uid?1:0);}
 function create(h){
  const {card,trait,unitsAt,unitById,event,log,draw,dealDamage,destroy,baseCombatDamage,attackValue,direction,retreatDestination}=h;
  const all=state=>state.effects||[];
  const statusesFor=(state,uid)=>all(state).filter(f=>f.targetUid===uid);
  const get=(state,uid,kind)=>statusesFor(state,uid).find(f=>f.kind===kind);
  const territoryStatuses=(state,territory,owner)=>all(state).filter(f=>f.territory===territory&&f.kind==='smoke'&&(owner===undefined||f.owner===owner));
  const woundedSort=(a,b)=>b.damage-a.damage||compare(a,b);
  function record(state,kind,target,source={},amount=1,meta={}){
   const owner=target.owner,territory=target.territory,targetUid=target.uid||null;
   return {id:'pending-'+kind+'-'+(targetUid||territory)+'-'+owner,kind,owner,targetUid,territory,sourcePlayer:source.player??owner,sourceCardId:source.sourceCardId||null,sourceUid:source.sourceUid||null,
    startedTurn:state.turn,amount,stack:'refresh',consume:{cover:'directEnemyHit',dodge:'directEnemyHit',exposed:'directEnemyHit',overwatch:'enemyVoluntaryEntry'}[kind]||'expiry',
    expires:{timing:kind==='suppression'||kind==='pressure'?'windowEnd':'windowStart',player:owner,afterTurn:kind==='pressure'?state.turn-1:state.turn},metadata:{...meta}};
  }
  function detail(state,f){const unit=f.targetUid&&unitById(state,f.targetUid);return {status:f.kind,kind:f.kind,id:f.id,player:f.sourcePlayer,sourcePlayer:f.sourcePlayer,owner:f.owner,targetOwner:f.owner,targetUid:f.targetUid,targetCardId:unit?.cardId||null,uid:f.targetUid,territory:f.territory,sourceCardId:f.sourceCardId,sourceUid:f.sourceUid,amount:f.amount};}
  function remove(state,f,reason='consumed',extra={}){
   state.effects=all(state).filter(e=>e.id!==f.id);event(state,reason==='expired'?'statusExpired':reason==='bypassed'?'statusBypassed':'statusConsumed',{...detail(state,f),reason,...extra});
   log(state,`${labels[f.kind]} ${reason}${f.targetUid?' on '+card(unitById(state,f.targetUid)||{cardId:extra.targetCardId})?.name:''}.`,'tactical');
  }
  function apply(state,kind,target,source={},amount=1,meta={}){
   if(kind==='exposed')for(const f of statusesFor(state,target.uid).filter(f=>['cover','dodge'].includes(f.kind)))remove(state,f,'bypassed',{counter:'Exposed'});
   const prior=all(state).find(f=>f.kind===kind&&f.owner===target.owner&&(target.uid?f.targetUid===target.uid:!f.targetUid&&f.territory===target.territory));
   const f=record(state,kind,target,source,amount,meta);state.nextEffectId=(state.nextEffectId||0)+1;f.id=prior?.id||'effect'+state.nextEffectId;
   state.effects=all(state).filter(e=>e.id!==prior?.id);state.effects.push(f);event(state,'statusApplied',{...detail(state,f),refreshed:!!prior,expires:f.expires});
   if(kind==='overwatch')event(state,'overwatchSet',{...detail(state,f),automatic:!!meta.automatic});
   log(state,`${labels[kind]} applied${target.uid?' to '+card(target).name:' in '+state.territories[target.territory].name}.`,'tactical');return f;
  }
  function expire(state,player,timing){for(const f of all(state).slice())if(f.expires.player===player&&f.expires.timing===timing&&state.turn>f.expires.afterTurn)remove(state,f,'expired');}
  function clearUnit(state,uid){for(const f of statusesFor(state,uid).slice())remove(state,f,'expired',{reason:'leftBattlefield'});}
  function statusDetails(state,target){
   const effects=typeof target==='string'?statusesFor(state,target):typeof target==='number'?territoryStatuses(state,target):target?.uid?statusesFor(state,target.uid):territoryStatuses(state,target?.id??target?.territory);
   return effects.map(f=>{const duration=f.kind==='pressure'?'Until the end of this action window':'Until P'+(f.owner+1)+'’s '+(f.expires.timing==='windowEnd'?'next action-window end':'next action-window start');const key={suppression:'Suppression',overwatch:'Overwatch',cover:'Cover',dodge:'Dodge',exposed:'Exposed',smoke:'Smoke'}[f.kind];return {...f,label:labels[f.kind],duration,expiryText:duration,text:key?(MECHANICS[key]||SMOKE).definition:labels[f.kind]+' until this action window ends.'};});
  }
  function hitInfo(state,target,amount,context={}){
   const direct=!!context.direct&&context.player!==undefined&&context.player!==target.owner&&amount>0&&!context.blast;
   const source=context.sourceUid&&unitById(state,context.sourceUid),precision=!!context.precision||source&&trait(source,'precision'),breach=!!context.breach||source&&trait(source,'breach');
   const exposed=direct&&get(state,target.uid,'exposed'),cover=direct&&get(state,target.uid,'cover'),dodge=direct&&get(state,target.uid,'dodge');
   const raw=amount+(exposed?1:0),base=context.combat?baseCombatDamage(state,target,raw,context.shield||0):Math.max(0,raw);
   let damage=base;const consumed=[],bypassed=[],avoided={cover:0,dodge:0,smoke:0},effectiveProtected={cover:0,dodge:0,smoke:0},health=Math.max(0,card(target).health-target.damage);
   if(exposed)consumed.push(exposed.id);
   if(cover){if(breach){bypassed.push(cover.id);}else{const before=damage;avoided.cover=Math.min(damage,cover.amount);damage=Math.max(0,damage-cover.amount);effectiveProtected.cover=Math.min(before,health)-Math.min(damage,health);consumed.push(cover.id);}}
   if(dodge){if(target.marked||precision||exposed){bypassed.push(dodge.id);}else{effectiveProtected.dodge=Math.min(damage,health);avoided.dodge=damage;damage=0;consumed.push(dodge.id);}}
   if(direct&&territoryStatuses(state,target.territory,target.owner).length){const before=damage;avoided.smoke=Math.min(1,damage);damage=Math.max(0,damage-1);effectiveProtected.smoke=Math.min(before,health)-Math.min(damage,health);}
   return {damage,consumed,bypassed,avoided,effectiveProtected,exposedBonus:exposed?1:0,breach:!!(direct&&breach),base};
  }
  function consumeHit(state,target,info){
   for(const id of info.consumed){const f=all(state).find(e=>e.id===id);if(f)remove(state,f,'consumed',{absorbed:info.avoided[f.kind]||0,effectiveProtected:info.effectiveProtected[f.kind]||0});}
   for(const id of info.bypassed){const f=all(state).find(e=>e.id===id);if(f)remove(state,f,'bypassed',{counter:info.breach?'Breach':'Mark / Precision / Exposed',absorbed:0});}
   if(info.avoided.smoke)event(state,'smokeProtected',{player:target.owner,targetUid:target.uid,targetCardId:target.cardId,territory:target.territory,amount:info.avoided.smoke});
  }
  function error(state,player,effect,action,sourceUnit){
   const target=unitById(state,action.targetUid),territory=state.territories[action.territory],own=u=>u&&u.owner===player,enemy=u=>u&&u.owner!==player;
   if(sourceUnit&&sourceUnit.territory!==((target&&target.territory)??action.territory))return 'This ability targets only its source territory.';
   if(effect.unitsOnly&&target&&card(target).type==='asset')return 'This effect requires a unit, not an Asset.';
   if(['cover','dodge','assault','cleanExit'].includes(effect.kind)){
    if(!own(target))return 'Choose a friendly battlefield card.';
    if(effect.excludeSelf&&target.uid===sourceUnit?.uid)return 'Choose another allied card here.';
    if(effect.kind==='assault'&&(card(target).type==='asset'||!target.ready||target.deployedTurn===state.turn&&!trait(target,'rush')))return 'Choose a ready unit able to attack this action window.';
    if(effect.kind==='cleanExit'){
     if(get(state,target.uid,'suppression'))return 'Suppression prevents this voluntary withdrawal.';
     if(!target.damage&&target.attackedTurn!==state.turn)return 'Clean Exit requires a wounded unit or one that attacked this window.';
     if(retreatDestination(state,target).to===null)return 'No legal adjacent friendly rear territory has room.';
    }
   }
   if(['suppression','exposed','breach'].includes(effect.kind)){
    if(!enemy(target))return 'Choose an enemy battlefield card.';
    if(effect.requiresMarked&&!target.marked)return 'Requires a Marked enemy target.';
    if(effect.requiresVulnerable&&!target.damage&&target.ready)return 'Choose a wounded or exhausted enemy unit.';
   }
   if(TERRITORY_EFFECTS.includes(effect.kind)){
    if(!Number.isInteger(action.territory)||!territory)return 'Choose a valid territory.';
    const allies=unitsAt(state,territory.id,player).filter(u=>card(u).type!=='asset'),enemies=unitsAt(state,territory.id,1-player);
    if(effect.kind==='smoke'&&!unitsAt(state,territory.id,player).length)return 'Smoke Screen requires a friendly permanent in that territory.';
    if(['blast','salvageBlast','breakPosition'].includes(effect.kind)&&!enemies.length)return 'This territory contains no enemy targets.';
    if(['smoke','interlockingFire','holdFast','contingency'].includes(effect.kind)&&territory.id!==state.contested&&territory.owner!==player)return 'Choose controlled ground or the contested territory.';
    if(effect.minimumAllies&&allies.length<effect.minimumAllies)return 'Requires '+effect.minimumAllies+' allied units in that territory.';
    if(effect.kind==='holdFast'&&!allies.some(u=>u.defendedTurn===state.turn-1))return 'Requires an ally that survived defending combat in the previous enemy action window.';
    if(effect.kind==='contingency'&&new Set(allies.map(u=>card(u).artRole||card(u).type)).size<2)return 'Requires at least two different friendly unit classes here.';
    if(effect.kind==='breakPosition'&&(!allies.length||!enemies.some(u=>u.damage||get(state,u.uid,'cover')||card(u).type==='asset')))return 'Requires your unit and a wounded, Covered or Asset enemy in this territory.';
   }
   if(SACRIFICE_EFFECTS.includes(effect.kind)){
    const sacrifice=unitById(state,action.sacrificeUid);
    if(!own(sacrifice))return 'Select the friendly permanent you will destroy as the Sacrifice cost.';
    if(effect.requiresWounded&&!sacrifice.damage)return 'The Sacrifice cost requires a wounded friendly permanent.';
    if(effect.kind==='salvageBlast'&&sacrifice.territory!==action.territory)return 'Sacrifice and Blast must occur in the same territory.';
    if(effect.kind!=='salvageBlast'){
     if(!own(target)||target.uid===sacrifice.uid||target.territory!==sacrifice.territory)return 'Choose a different friendly permanent in the sacrifice territory.';
     if(effect.kind==='sacrificeRepair'&&!target.damage)return 'Choose another damaged ally to repair.';
     if(effect.kind==='badPlan'&&card(target).type==='asset')return 'Choose another friendly unit, not an Asset.';
    }
   }
   return null;
  }
  function targets(state,player,effect,action={}){
   if(SACRIFICE_EFFECTS.includes(effect.kind))return state.units.filter(u=>u.owner===player).flatMap(u=>effect.kind==='salvageBlast'?[{...action,sacrificeUid:u.uid,territory:u.territory}]:state.units.map(target=>({...action,sacrificeUid:u.uid,targetUid:target.uid})));
   if(TERRITORY_EFFECTS.includes(effect.kind))return state.territories.map(t=>({...action,territory:t.id}));
   return state.units.map(u=>({...action,targetUid:u.uid}));
  }
  function heal(state,u,amount,source){const actual=Math.min(u.damage,amount);u.damage-=actual;event(state,'heal',{player:u.owner,uid:u.uid,cardId:u.cardId,amount:actual,...source});}
  function selected(state,player,territory,max=2){return unitsAt(state,territory,player).filter(u=>card(u).type!=='asset').slice().sort(woundedSort).slice(0,max);}
  function victims(state,player,territory,max=2){return unitsAt(state,territory,1-player).slice().sort(compare).slice(0,max);}
  function resolve(state,player,definition,action,effect,sourceUnit){
   const source={player,sourceCardId:definition.id,sourceUid:sourceUnit?.uid||null},target=unitById(state,action.targetUid),amount=effect.amount||1,territory=action.territory;
   if(SACRIFICE_EFFECTS.includes(effect.kind)){
    const cost=unitById(state,action.sacrificeUid);event(state,'sacrifice',{...source,uid:cost.uid,unitUid:cost.uid,cardId:cost.cardId,territory:cost.territory,freedPresence:card(cost).presence});
    destroy(state,cost,player,{cause:'sacrifice',sourceKind:'cost',...source});
   }
   switch(effect.kind){
    case 'cover':case 'dodge':case 'suppression':case 'exposed':
     if(effect.mark){target.marked=1;event(state,'mark',{...source,targetOwner:target.owner,targetUid:target.uid,uid:target.uid,cardId:target.cardId,amount:1});}
     apply(state,effect.kind,target,source,amount);break;
    case 'smoke':apply(state,'smoke',{owner:player,territory},source,1);break;
    case 'blast':case 'salvageBlast':{
     const affected=victims(state,player,territory,effect.maxTargets||2),hits=[];
     for(const u of affected){const prepared=effect.preparedBonus&&(u.marked||get(state,u.uid,'exposed'))?effect.preparedBonus:0;const damage=dealDamage(state,u,amount+prepared,player,false,{...source,blast:true,cause:'enemyEffect',sourceKind:'blast'});hits.push({uid:u.uid,targetUid:u.uid,targetCardId:u.cardId,targetOwner:u.owner,damage,amount:damage});}
     event(state,'blast',{...source,territory,targets:hits,bypassCover:true,bypassDodge:true});h.removeDead(state,player);break;
    }
    case 'breach':{
     const cover=get(state,target.uid,'cover');if(cover)remove(state,cover,'bypassed',{counter:'Breach'});
     const bonus=card(target).type==='asset'?effect.assetBonus||0:0;
     event(state,'breach',{...source,targetUid:target.uid,targetCardId:target.cardId,bypassedCover:!!cover,assetBonus:bonus});
     dealDamage(state,target,amount+bonus,player,false,{...source,direct:true,breach:true,cause:'enemyEffect',sourceKind:'breach'});h.removeDead(state,player);break;
    }
    case 'assault':apply(state,'attackBoost',target,source,amount);apply(state,'exposed',target,source,1);break;
    case 'interlockingFire':case 'holdFast':case 'contingency':{
     for(const u of selected(state,player,territory,effect.maxTargets||2))apply(state,'cover',u,source,2);
     if(effect.kind==='holdFast'){
      for(const u of unitsAt(state,territory,player).filter(u=>card(u).type!=='asset'))heal(state,u,1,source);
      apply(state,'pressure',{owner:player,territory},source,effect.pressure||2);
     }
     if(effect.kind==='contingency')draw(state,player,effect.draw||1);break;
    }
    case 'breakPosition':{
     const candidates=unitsAt(state,territory,1-player).slice().sort(compare),enemy=candidates.find(u=>u.damage||get(state,u.uid,'cover')||card(u).type==='asset');
     for(const u of unitsAt(state,territory,1-player))for(const f of statusesFor(state,u.uid).filter(f=>f.kind==='cover'))remove(state,f,'bypassed',{counter:'Break the Position'});
     if(enemy)apply(state,'suppression',enemy,source,1);
     const ally=unitsAt(state,territory,player).slice().sort(compare).find(u=>card(u).type!=='asset'&&!u.ready&&u.attackedTurn!==state.turn&&!(u.deployedTurn===state.turn&&!trait(u,'rush')));
     if(ally){ally.ready=true;event(state,'rally',{...source,uid:ally.uid,cardId:ally.cardId});}break;
    }
    case 'cleanExit':{
     const from=target.territory,to=retreatDestination(state,target).to;target.territory=to;target.ready=false;target.movedTurn=state.turn;
     event(state,'move',{...source,uid:target.uid,cardId:target.cardId,from,to,reason:'cleanExit'});moved(state,target);apply(state,'dodge',target,source,1);entry(state,target,'voluntary');break;
    }
    case 'sacrificeRepair':heal(state,target,amount,source);break;
    case 'badPlan':apply(state,'cover',target,source,2);apply(state,'dodge',target,source,1);break;
   }
  }
  function clearKind(state,uid,kind){const f=get(state,uid,kind);if(f)remove(state,f,'expired',{reason:'sourceMovedOrActed'});}
  function moved(state,unit){clearKind(state,unit.uid,'overwatch');for(const f of statusesFor(state,unit.uid))f.territory=unit.territory;}
  function hooks(state,unit,timing){
   if(!unit||unit.suppressed)return;const effects=card(unit).tactical?.[timing]||[],source={player:unit.owner,sourceCardId:unit.cardId,sourceUid:unit.uid};
   for(const effect of effects){
    const candidates=effect.target==='self'?[unit]:unitsAt(state,unit.territory,unit.owner).filter(u=>(!effect.excludeSelf||u.uid!==unit.uid)&&(!effect.unitsOnly||card(u).type!=='asset')).slice().sort(woundedSort).slice(0,effect.maxTargets||1);
    for(const u of candidates){if(effect.kind==='heal'){if(u.damage)heal(state,u,effect.amount||1,source);}else if(effect.kind==='smoke')apply(state,'smoke',{owner:unit.owner,territory:unit.territory},source,1);else apply(state,effect.kind,u,source,effect.amount||1,effect.kind==='overwatch'?{...effect,automatic:true}:{});}
   }
  }
  function entry(state,entrant,reason){
   if(!unitById(state,entrant.uid)||!['voluntary','deploy'].includes(reason))return;
   if(territoryStatuses(state,entrant.territory).length)return;
   const watchers=all(state).filter(f=>f.kind==='overwatch'&&f.territory===entrant.territory&&f.owner!==entrant.owner).map(f=>({f,unit:unitById(state,f.targetUid)})).filter(x=>x.unit&&!x.unit.suppressed).sort((a,b)=>compare(a.unit,b.unit));
   for(const {f,unit} of watchers){
    if(!unitById(state,entrant.uid))break;
    remove(state,f);event(state,'overwatchTriggered',{...detail(state,f),targetUid:entrant.uid,targetOwner:entrant.owner,targetCardId:entrant.cardId});
    dealDamage(state,entrant,f.amount,unit.owner,false,{player:unit.owner,sourceUid:unit.uid,sourceCardId:unit.cardId,direct:true,precision:trait(unit,'precision'),cause:'enemyEffect',sourceKind:'overwatch'});h.removeDead(state,unit.owner);
    if(f.metadata.consumeSelf&&unitById(state,unit.uid))destroy(state,unit,unit.owner,{cause:'rulesResolution',sourceKind:'spentTrap',sourceCardId:unit.cardId,sourceUid:unit.uid});
   }
  }
  function overwatchError(state,unit){if(!unit)return 'Choose a surviving unit.';if(!card(unit).tactical?.overwatch||card(unit).tactical.overwatch.automatic)return 'This card cannot voluntarily set Overwatch.';if(unit.suppressed)return 'Sabotage disables this printed ability.';if(!unit.ready)return 'Overwatch requires a ready unit.';if(unit.deployedTurn===state.turn&&!trait(unit,'rush'))return 'New deployments must wait for their next action window before preparing Overwatch.';if(get(state,unit.uid,'overwatch'))return 'Already watching this territory.';if(unit.attackedTurn===state.turn)return 'A unit that attacked cannot also enter Overwatch this window.';return null;}
  function abilityError(state,player,unit,action){
   const ability=unit&&card(unit).tactical?.ability;if(!unit||unit.owner!==player||!ability||ability.id!==action.abilityId)return 'Choose a valid friendly unit ability.';
   if(unit.suppressed)return 'Sabotage disables this printed ability.';if(!unit.ready)return 'This ability exhausts a ready card.';
   if(unit.abilityTurn===state.turn)return 'This ability was used this action window.';
   if(unit.deployedTurn===state.turn&&!trait(unit,'rush'))return 'Newly deployed cards cannot use this ability until their next action window.';
   if(ability.effect.kind==='heal'){const u=unitById(state,action.targetUid);if(!u||u.owner!==player||!u.damage)return 'Choose a damaged friendly card here.';if(u.territory!==unit.territory)return 'Repair targets only this territory.';return null;}
   return error(state,player,ability.effect,action,unit);
  }
  function actionCost(state,action){const unit=unitById(state,action.unitUid),spec=action.type==='ability'?card(unit)?.tactical?.ability?.cost:card(unit)?.tactical?.overwatch;return {presence:spec?.presence||0,commandActions:spec?.commandActions??1};}
  function executeAbility(state,player,action){const u=unitById(state,action.unitUid),ability=card(u).tactical.ability,cost=actionCost(state,action);u.ready=false;u.abilityTurn=state.turn;clearKind(state,u.uid,'overwatch');state.actionsLeft-=cost.commandActions;state.players[player].spent+=cost.presence;event(state,'ability',{player,uid:u.uid,cardId:u.cardId,abilityId:ability.id,cost,effect:ability.effect.kind});if(ability.effect.kind==='heal')heal(state,unitById(state,action.targetUid),ability.effect.amount,{player,sourceCardId:u.cardId,sourceUid:u.uid});else resolve(state,player,card(u),action,ability.effect,u);}
  function setOverwatch(state,unit){const spec=card(unit).tactical.overwatch,cost=actionCost(state,{type:'overwatch',unitUid:unit.uid});state.actionsLeft-=cost.commandActions;state.players[unit.owner].spent+=cost.presence;unit.ready=false;apply(state,'overwatch',unit,{player:unit.owner,sourceCardId:unit.cardId,sourceUid:unit.uid},spec.damage||2,spec);}
  function actionCandidates(state,player){const list=[];for(const u of state.units.filter(u=>u.owner===player)){if(card(u).tactical?.overwatch)list.push({type:'overwatch',unitUid:u.uid});const a=card(u).tactical?.ability;if(a){const action={type:'ability',unitUid:u.uid,abilityId:a.id};list.push(...targets(state,player,a.effect,action));}}return list;}
  function assertStatuses(state,fail){
   if(!Array.isArray(state.effects)||!Number.isInteger(state.nextEffectId)||state.nextEffectId<0)fail('invalid tactical effect container');const ids=new Set(),stacks=new Set();
   for(const f of state.effects){if(!f||!KINDS.includes(f.kind)||!f.id||ids.has(f.id)||![0,1].includes(f.owner)||![0,1].includes(f.sourcePlayer)||!Number.isInteger(f.startedTurn)||f.startedTurn>state.turn||!Number.isInteger(f.amount)||f.amount<1||f.stack!=='refresh'||!['windowStart','windowEnd'].includes(f.expires?.timing)||f.expires.player!==f.owner||!Number.isInteger(f.expires.afterTurn)||!Number.isInteger(f.territory)||!state.territories[f.territory])fail('invalid tactical effect record');ids.add(f.id);const key=f.kind+':'+f.owner+':'+(f.targetUid||f.territory);if(stacks.has(key))fail('stacked tactical charges');stacks.add(key);if(f.targetUid){const u=unitById(state,f.targetUid);if(!u||u.owner!==f.owner)fail('effect on missing/foreign target');}if(f.sourceCardId&&!card(f.sourceCardId))fail('unknown tactical source');}
  }
  return {statusesFor,territoryStatuses,statusDetails,get,apply,record,remove,expire,clearUnit,clearKind,moved,hitInfo,consumeHit,error,targets,resolve,hooks,entry,overwatchError,abilityError,actionCost,executeAbility,setOverwatch,actionCandidates,assertStatuses,selected,victims};
 }
 return {VERSION,MECHANICS,SMOKE,KINDS,EFFECTS,TERRITORY_EFFECTS,SACRIFICE_EFFECTS,create};
});
