(function (root, factory) {
  'use strict';
  const api = factory(typeof module === 'object' && module.exports ? require('./data.js') : root.FrontlinesData, typeof module === 'object' && module.exports ? require('./commanders.js') : root.FrontlinesCommanders, typeof module === 'object' && module.exports ? require('./tactical-rules.js') : root.FrontlinesTacticalRules);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FrontlinesEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createEngine(Data, Commanders, TacticalRules) {
  'use strict';

  const LIMITS = {
    startingCommand: [1, 1000], commandGrowth: [0, 100], commandCap: [1, 1000],
    captureThreshold: [1, 1000], startingHand: [1, 50], drawCount: [0, 20],
    slotsPerTerritory: [1, 20], actionLimit: [1, 20], victoryTerritories: [4, 7]
  };
  const RESPONSE_EFFECTS = ['shield', 'ambush', 'retreat'];
  const ACTION_EFFECTS = ['damage', 'heal', 'rally', 'draw', 'disrupt', 'reclaim', 'sabotage'];
  const copy = value => JSON.parse(JSON.stringify(value));
  const card = value => Data.CARDS[typeof value === 'string' ? value : value && value.cardId];
  const trait = (unit, name) => !!unit && !unit.suppressed && (card(unit).traits || []).includes(name);
  const unitById = (state, uid) => state.units.find(unit => unit.uid === uid);
  const handById = (state, player, uid) => state.players[player].hand.find(item => item.uid === uid);
  const unitsAt = (state, territory, owner) => state.units.filter(unit => unit.territory === territory && (owner === undefined || unit.owner === owner));
  const controlledCount = (state, player) => state.territories.filter(territory => territory.owner === player).length;
  const getActor = state => state.response && state.response.stage === 'response' ? state.response.responder : state.attacker;
  const direction = player => player === 0 ? 1 : -1;
  const RULES = Data.RULES || {};
  const separatedEconomy = RULES.actionEconomy === 'capacity-command';
  const frontlineIntegrity = RULES.frontlineIntegrity === true;
  const arsenalMechanics = RULES.arsenalMechanics === true;
  const commandersEnabled = RULES.commanders === true;
  const salvageRecovery = RULES.salvageRecovery === true;
  const tacticalArsenal = RULES.tacticalArsenal === true;
  if(tacticalArsenal&&!TacticalRules)throw new Error('Tactical rules module is unavailable.');
  if (Commanders && Commanders.forRules) Commanders = Commanders.forRules(RULES);
  if (commandersEnabled && !Commanders) throw new Error('Commander rules catalog is unavailable.');
  const leader = (state,player) => commandersEnabled && state.players[player]?.commander;
  const leads = (state,player,id) => leader(state,player)?.id === id;
  function commanderPassive(state,player,amount,detail={}) {
    const c=Commanders.get(leader(state,player).id);
    event(state,'commanderPassive',{player,commanderId:c.id,passive:c.passive.name,amount,...detail});
  }
  const actionEffects = (arsenalMechanics ? ACTION_EFFECTS.concat('mark','reinforce','adapt') : ACTION_EFFECTS).concat(tacticalArsenal?TacticalRules.EFFECTS:[]);
  let activeEvents = null;
  function event(state, type, detail) { if (activeEvents) activeEvents.push({ type, turn:state.turn, ...detail }); }
  const T=tacticalArsenal?TacticalRules.create({card,trait,unitsAt,unitById,event,log,draw,dealDamage,destroy,removeDead,baseCombatDamage,attackValue,direction,retreatDestination}):null;

  function presence(state, player) {
    const p = state.players[player];
    const committed = state.units.reduce((sum, unit) => sum + (unit.owner === player ? card(unit).presence : 0), 0);
    return { command: p.command, committed, spent: p.spent, available: p.command - committed - p.spent };
  }

  // Costs are public rules data. Legality and execution both use this exact
  // function so free deployments remain available after the last command.
  function actionCost(state, action) {
    if (!action || typeof action.type !== 'string') return { presence:0, commandActions:0 };
    if(T&&['ability','overwatch'].includes(action.type))return T.actionCost(state,action);
    if (action.type === 'commander') return Commanders && Commanders.get(leader(state,getActor(state))?.id)?.active.cost || {presence:0,commandActions:0};
    if (['deploy','order','respond','counter'].includes(action.type)) {
      const item = handById(state,getActor(state),action.handUid);
      const definition = item && card(item);
      const isMark=action.type==='order'&&resolveEffect(definition,action)?.kind==='mark';
      const presenceCost = definition ? Math.max(1,definition.presence-(isMark&&leads(state,getActor(state),'commander_syndicate_coordinator')?1:0)) : 0;
      if (action.type === 'respond' || action.type === 'counter') return { presence:presenceCost, commandActions:0 };
      let commandActions=separatedEconomy && definition ? definition.commandCost ?? 0 : 1;
      if (action.type==='order'&&definition&&leads(state,getActor(state),'commander_syndicate_quartermaster')&&definition.presence<=3&&commandActions>0&&leader(state,getActor(state)).passiveTurn!==state.turn) commandActions=0;
      return {presence:presenceCost,commandActions};
    }
    return {presence:0,commandActions:action.type==='move'&&leads(state,getActor(state),'commander_rogue_drifter')&&leader(state,getActor(state)).passiveTurn!==state.turn?0:['move','attack'].includes(action.type)?1:0};
  }

  function attackValue(state, unit, target) {
    if (!unit || card(unit).type === 'asset') return 0;
    return Math.max(0,card(unit).attack + (trait(unit, 'berserk') && unit.damage > 0 ? 1 : 0)
      + unitsAt(state, unit.territory, unit.owner).filter(ally => ally.uid !== unit.uid && trait(ally, 'command')).length
      + (commandersEnabled ? unit.commanderCounter || 0 : 0) + (commandersEnabled ? unit.commanderBreach || 0 : 0)
      + (target && unit.owner===state.attacker && leads(state,unit.owner,'commander_bruiser_bloodhound') && target.damage>0 ? 1 : 0)
      + (T?T.get(state,unit.uid,'attackBoost')?.amount||0:0) - (T&&T.get(state,unit.uid,'suppression')?1:0)
      + (T&&target&&trait(unit,'breach')&&card(target).type==='asset'?card(unit).tactical?.breachAssetBonus||0:0)
      + (T&&target&&(target.marked||T.get(state,target.uid,'exposed'))?card(unit).tactical?.preparedBonus||0:0));
  }

  // Every mode resolves to an ordinary reusable effect. Invalid Adapt choices
  // remain invalid rather than silently choosing an effect for the player.
  function resolveEffect(definition, action) {
    const effect = definition && definition.effect;
    if (!effect) return null;
    if (effect.kind !== 'adapt') return effect;
    if (!arsenalMechanics || !action || typeof action.mode !== 'string') return null;
    return Array.isArray(effect.modes) ? effect.modes.find(mode => mode.id === action.mode) || null : null;
  }

  function combatProtection(state, unit) {
    const fortify = trait(unit,'fortify') && state.territories[unit.territory].owner === unit.owner ? 1 : 0;
    const armor = arsenalMechanics ? Math.max(trait(unit,'armor') ? 1 : 0,unit.reinforced ? 1 : 0) : 0;
    return {fortify,armor};
  }

  function baseCombatDamage(state, unit, amount, shield = 0) {
    if (!unit) return 0;
    const protection = combatProtection(state,unit);
    const mark = arsenalMechanics && unit.marked && amount > 0 ? 1 : 0;
    return Math.max(0,amount + mark - shield - protection.fortify - protection.armor);
  }
  function combatDamage(state,unit,amount,shield=0,context={}){
    return T?T.hitInfo(state,unit,amount,{player:1-unit.owner,direct:unit.owner!==state.attacker,combat:true,shield,...context}).damage:baseCombatDamage(state,unit,amount,shield);
  }

  function log(state, text, type) {
    state.log.push({ turn: state.turn, text, type: type || 'info' });
    if (state.log.length > 500) state.log.splice(0, state.log.length - 500);
  }

  function random(state) {
    let value = state.rngState | 0;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    state.rngState = value >>> 0;
    return state.rngState / 4294967296;
  }

  function shuffle(state, list) {
    for (let index = list.length - 1; index > 0; index--) {
      const next = Math.floor(random(state) * (index + 1));
      [list[index], list[next]] = [list[next], list[index]];
    }
  }

  function draw(state, player, amount, quiet) {
    const p = state.players[player];
    let drawn = 0;
    for (let index = 0; index < amount; index++) {
      if (!p.deck.length && p.discard.length) {
        p.deck = p.discard.splice(0);
        shuffle(state, p.deck);
        log(state, `Player ${player + 1} recycles ${p.deck.length} casualty/discard cards into reserves.`, 'draw');
      }
      if (!p.deck.length) break;
      p.hand.push({ uid: `c${state.nextUid++}`, cardId: p.deck.pop() });
      const item = p.hand[p.hand.length - 1];
      event(state,'draw',{player,uid:item.uid,cardId:item.cardId});
      drawn++;
    }
    if (!quiet) log(state, drawn ? `Player ${player + 1} draws ${drawn} card${drawn === 1 ? '' : 's'}.` : `Player ${player + 1} has no reserves to draw.`, 'draw');
    return drawn;
  }

  function destroy(state, unit, killer, provenance) {
    if (!unitById(state, unit.uid)) return;
    const cause=T?(provenance?.cause||unit.lastDamage?.cause||'rulesResolution'):null;
    if(T)T.clearUnit(state,unit.uid);
    state.units = state.units.filter(item => item.uid !== unit.uid);
    state.players[unit.owner].discard.push(unit.cardId);
    if (killer !== undefined && killer !== unit.owner) state.stats.kills[killer]++;
    const source = activeEvents && activeEvents.slice().reverse().find(item => item.type === 'damage' && item.targetUid === unit.uid && item.player === killer);
    event(state,'death',{player:unit.owner,uid:unit.uid,cardId:unit.cardId,territory:unit.territory,freedPresence:card(unit).presence,
      killer:killer === undefined ? null : killer,sourceUid:source && source.sourceUid || null,sourceCardId:source && source.sourceCardId || null,...(commandersEnabled?{sourceCommanderId:source && source.sourceCommanderId || null}:{}),...(T?{cause,sourceKind:provenance?.sourceKind||unit.lastDamage?.sourceKind||'rules',sourcePlayer:provenance?.player??unit.lastDamage?.player??killer??null,sourceUid:provenance?.sourceUid||unit.lastDamage?.sourceUid||null,sourceCardId:provenance?.sourceCardId||unit.lastDamage?.sourceCardId||null}:{})});
    log(state, `${card(unit).name} is destroyed; Player ${unit.owner + 1} frees ${card(unit).presence} committed Presence.`, 'destroy');
    if(T&&(!['combat','enemyEffect','displacementFailure'].includes(cause)||killer===undefined||killer===unit.owner))return;
    // Simultaneous casualties are already wounded to their lethal totals. A
    // source destined to die in this exchange must never draw before removal.
    const salvager = state.units.find(ally => ally.owner === unit.owner && ally.territory === unit.territory &&
      ally.damage < card(ally).health && trait(ally,'scavenge'));
    const owner = state.players[unit.owner];
    // v1.0.3: printed Scavenge and Nothing Wasted share one casualty
    // dividend. A nearby surviving source gets attribution; the Commander
    // supplies the same salvage opportunity when no such source survives.
    // Historical profiles keep their independent trigger budgets below.
    if (salvageRecovery) {
      const commander = leads(state,unit.owner,'commander_rogue_scavenger') && owner.commander.passiveTurn!==state.turn;
      if (owner.scavengedTurn === state.turn || !salvager && !commander) return;
      owner.scavengedTurn = state.turn;
      if (leads(state,unit.owner,'commander_rogue_scavenger')) owner.commander.passiveTurn = state.turn;
      const drawn = draw(state,unit.owner,1);
      if (salvager) event(state,'passive',{player:unit.owner,uid:salvager.uid,cardId:salvager.cardId,trait:'scavenge',amount:drawn,causeUid:unit.uid});
      else commanderPassive(state,unit.owner,drawn,{causeUid:unit.uid});
      return;
    }
    if (leads(state,unit.owner,'commander_rogue_scavenger') && owner.commander.passiveTurn!==state.turn) {
      owner.commander.passiveTurn=state.turn;const drawn=draw(state,unit.owner,1);
      commanderPassive(state,unit.owner,drawn,{causeUid:unit.uid});
    }
    if (salvager && owner.scavengedTurn !== state.turn) {
      owner.scavengedTurn = state.turn;
      const drawn = draw(state, unit.owner, 1);
      event(state,'passive',{player:unit.owner,uid:salvager.uid,cardId:salvager.cardId,trait:'scavenge',amount:drawn,causeUid:unit.uid});
    }
  }

  function dealDamage(state, unit, amount, sourcePlayer, combat, source) {
    if (!unit || !unitById(state, unit.uid)) return 0;
    const protection = combat ? combatProtection(state,unit) : {fortify:0,armor:0};
    const reduction = protection.fortify;
    const shield = combat && source && source.shield || 0;
    const mark = combat && arsenalMechanics && unit.marked && amount > 0 ? 1 : 0;
    const context={player:sourcePlayer,combat:!!combat,shield,direct:combat&&unit.owner!==state.attacker,...source};
    const tacticalHit=T?T.hitInfo(state,unit,amount,context):null;
    const actual = tacticalHit?tacticalHit.damage:combat ? baseCombatDamage(state,unit,amount,shield) : Math.max(0,amount);
    const remainingHealth=Math.max(0,card(unit).health-unit.damage);
    const effective=Math.min(actual,remainingHealth);
    if(T){T.consumeHit(state,unit,tacticalHit);unit.lastDamage={cause:source?.cause||(combat?'combat':sourcePlayer===undefined?'rulesResolution':sourcePlayer===unit.owner?'alliedEffect':'enemyEffect'),player:sourcePlayer??null,sourceCardId:source?.sourceCardId||null,sourceUid:source?.sourceUid||null,sourceKind:source?.sourceKind||source?.passive|| (combat?'combat':'effect')};}
    unit.damage += actual;
    if (sourcePlayer !== undefined) state.stats.damage[sourcePlayer] += actual;
    event(state,'damage',{player:sourcePlayer === undefined ? null : sourcePlayer,targetOwner:unit.owner,targetUid:unit.uid,targetCardId:unit.cardId,
      territory:unit.territory,amount:actual,effective,fortifyAbsorbed:Math.min(Math.max(0,amount+mark-shield),reduction),combat:!!combat,...source,
      fortifyEffectiveProtected:Math.min(Math.max(0,amount+mark-shield-protection.armor),remainingHealth)-effective,
      ...(arsenalMechanics ? {armorAbsorbed:Math.min(Math.max(0,amount+mark-shield-reduction),protection.armor),markBonus:mark,
        armorEffectiveProtected:Math.min(Math.max(0,amount+mark-shield-reduction),remainingHealth)-effective} : {}),
      commandEffectiveEnabled:source&&source.commandSupporters?effective-Math.min(Math.max(0,actual-source.commandSupporters.length),remainingHealth):0,...(T?{direct:!!context.direct,cause:unit.lastDamage.cause,tacticalProtected:tacticalHit.avoided,exposedBonus:tacticalHit.exposedBonus}:{})});
    const feedback = [mark ? 'Mark adds 1' : '',reduction ? 'Fortify absorbs 1' : '',protection.armor ? 'Armor absorbs 1' : ''].filter(Boolean);
    log(state, `${card(unit).name} takes ${actual} damage${feedback.length ? ' ('+feedback.join('; ')+')' : ''}.`, 'damage');
    return actual;
  }

  function removeDead(state, killerForOwner) {
    state.units.filter(unit => unit.damage >= card(unit).health).forEach(unit => destroy(state, unit, killerForOwner === undefined ? 1 - unit.owner : killerForOwner));
  }

  function configFor(overrides) {
    const result = {};
    Object.keys(LIMITS).forEach(key => {
      const value = overrides[key] === undefined ? Data.DEFAULT_CONFIG[key] : overrides[key];
      if (!Number.isInteger(value) || value < LIMITS[key][0] || value > LIMITS[key][1]) {
        throw new Error(`${key} must be an integer from ${LIMITS[key][0]} to ${LIMITS[key][1]}.`);
      }
      result[key] = value;
    });
    if (result.commandCap < result.startingCommand) throw new Error('Command cap cannot be lower than starting Command Presence.');
    return result;
  }

  function createGame(options) {
    options = options || {};
    const factions = options.factions || ['stonewall', 'bruiser'];
    if (factions.length !== 2 || factions.some(faction => !Data.FACTIONS[faction] || !Data.DECKS[faction])) throw new Error('Choose two valid factions.');
    const deckAPI = (typeof module === 'object' && module.exports ? require('./decks.js') : globalThis.FrontlinesDecks);
    const library = deckAPI && deckAPI.forData(Data);
    if (options.decks !== undefined && (!Array.isArray(options.decks) || options.decks.length !== 2)) throw new Error('Choose two legal decks.');
    const chosenDecks = factions.map((faction,seat) => {
      const chosen = options.decks && options.decks[seat];
      if (!chosen) return {id:faction+'-starter',name:Data.FACTIONS[faction].name+' Starter',faction,cards:Data.DECKS[faction].slice(),archetype:'custom',...(commandersEnabled?{commanderId:Commanders.defaultFor(faction)}:{})};
      if (!library) throw new Error('Deck rules are unavailable.');
      const selected=commandersEnabled?{...chosen,commanderId:chosen.commanderId===undefined?Commanders.defaultFor(faction):chosen.commanderId}:chosen;
      if (commandersEnabled && (!Commanders.get(selected.commanderId)||Commanders.get(selected.commanderId).faction!==faction)) throw new Error('Choose one Commander from your deck faction.');
      const result = library.validate(selected);
      if (!result.legal || chosen.faction !== faction) throw new Error('Player '+(seat+1)+' deck is illegal: '+(chosen.faction!==faction?'deck faction does not match selection':result.errors.join(' ')));
      return copy(selected);
    });
    const seed = Number.isFinite(options.seed) ? options.seed >>> 0 : (Date.now() >>> 0);
    const config = configFor(options.config || {});
    const state = {
      config, seed, rngState: seed || 0x9e3779b9, nextUid: 1, turn: 1, attacker: 0,
      actionsLeft: config.actionLimit,
      players: factions.map((faction, id) => ({ id, faction, command: config.startingCommand, spent: 0, turns: 0, deck: chosenDecks[id].cards.slice(), deckMeta:{id:chosenDecks[id].id||'custom-'+id,name:chosenDecks[id].name,faction,archetype:chosenDecks[id].archetype||'custom',...(commandersEnabled?{commanderId:chosenDecks[id].commanderId}:{})}, hand: [], discard: [], riftwalker: null,...(commandersEnabled?{commander:{id:chosenDecks[id].commanderId,used:false,passiveTurn:-1}}:{}) })),
      territories: Data.TERRITORY_NAMES.map((name, id) => ({ id, name, owner: id < 3 ? 0 : id > 3 ? 1 : null, progress: [0, 0] })),
      contested: 3, units: [], response: null, winner: null, log: [],
      stats: { deployments: [0, 0], orders: [0, 0], attacks: [0, 0], kills: [0, 0], damage: [0, 0], captures: [0, 0], presenceGenerated: [0, 0], turns: [0, 0] }
    };
    if(T){state.effects=[];state.nextEffectId=0;for(let i=0;i<2;i++)state.players[i].deckMeta.set=chosenDecks[i].set|| (String(chosenDecks[i].id).startsWith('commander_')?'commander-foundation':'legacy');}
    state.players.forEach(p => { shuffle(state, p.deck); draw(state, p.id, config.startingHand, true); });
    log(state, `${Data.FACTIONS[factions[0]].name} faces ${Data.FACTIONS[factions[1]].name}. The center is contested.`, 'setup');
    startTurn(state);
    assertInvariants(state);
    return state;
  }

  function startTurn(state) {
    const player = state.attacker;
    const p = state.players[player];
    if(T)T.expire(state,player,'windowStart');
    if (p.turns > 0) p.command = Math.min(state.config.commandCap, p.command + state.config.commandGrowth);
    p.turns++;
    p.spent = 0;
    state.stats.turns[player]++;
    state.actionsLeft = state.config.actionLimit;
    state.units.filter(unit => unit.owner === player).forEach(unit => { unit.ready = true; });
    if (arsenalMechanics) for (const unit of state.units.filter(unit => unit.owner === player)) {
      for (const status of ['marked','reinforced']) if (unit[status]) {
        delete unit[status];
        event(state,status === 'marked' ? 'markEnd' : 'reinforceEnd',{player,uid:unit.uid,cardId:unit.cardId});
        log(state, `${card(unit).name}'s ${status === 'marked' ? 'Mark' : 'temporary Armor'} expires.`, 'order');
      }
    }
    if (leads(state,player,'commander_stonewall_warden')) for (const unit of state.units.filter(u=>u.owner===player&&u.damage>0&&state.territories[u.territory].owner===player)) {
      unit.damage--;event(state,'heal',{player,uid:unit.uid,cardId:unit.cardId,amount:1,sourceCommanderId:p.commander.id});
      commanderPassive(state,player,1,{targetUid:unit.uid});
      log(state,`${Commanders.get(p.commander.id).name} restores 1 damage on friendly ground.`,'heal');
    }
    // Sabotage is a tactical window, ending before this owner's Medic/aura
    // effects are evaluated. Printed stats and commitment never change.
    state.units.filter(unit => unit.owner === player && unit.suppressed).forEach(unit => {
      delete unit.suppressed;
      delete unit.sabotageSource;
      event(state,'sabotageEnd',{player,uid:unit.uid,cardId:unit.cardId});
    });
    for (const unit of state.units.filter(item => item.owner === player && item.damage > 0)) {
      const healing = unitsAt(state, unit.territory, player).filter(ally => trait(ally, 'medic')).length;
      if (healing) {
        const actual = Math.min(healing, unit.damage);
        unit.damage -= actual;
        event(state,'heal',{player,uid:unit.uid,cardId:unit.cardId,amount:actual,passive:'medic',
          supporters:unitsAt(state,unit.territory,player).filter(ally => trait(ally,'medic')).map(ally => ({uid:ally.uid,cardId:ally.cardId}))});
        log(state, `${card(unit).name} recovers ${actual} damage from Medic support.`, 'heal');
      }
    }
    if(T)for(const unit of state.units.filter(u=>u.owner===player).slice().sort(compareUid))T.hooks(state,unit,'onStart');
    log(state, separatedEconomy ? `Player ${player + 1} takes initiative: ${p.command} total Capacity, ${presence(state,player).available} available Capacity, ${state.actionsLeft} Command Actions.` : `Player ${player + 1} takes initiative: ${p.command} Command Presence, ${state.actionsLeft} actions.`, 'turn');
    draw(state, player, state.config.drawCount);
  }

  function moveError(state, unit, territory, reaction) {
    if (!Number.isInteger(territory) || !state.territories[territory]) return 'Choose a valid battlefield territory.';
    if (card(unit).type === 'asset') return 'Assets are fixed positions and cannot move.';
    if(T&&T.get(state,unit.uid,'suppression'))return 'Suppression prevents voluntary movement until the end of this unit’s next action window.';
    if (!reaction && !unit.ready) return 'This unit is exhausted. It readies at the start of your next offensive turn.';
    if (Math.abs(territory - unit.territory) !== 1) return 'Move one adjacent territory at a time; territories cannot be skipped.';
    if (unitsAt(state, territory, unit.owner).length >= state.config.slotsPerTerritory) return 'All allied slots in that territory are occupied.';
    const step = direction(unit.owner);
    const stranded = (unit.territory - state.contested) * step > 0;
    if (stranded) {
      if ((territory - unit.territory) * step !== -1) return 'A stranded unit must move back toward the contested frontline.';
      return null;
    }
    if ((territory - state.contested) * step > 0) return 'The army cannot advance beyond the current contested territory.';
    if (territory !== state.contested && state.territories[territory].owner !== unit.owner) return 'You may move only into controlled ground or the current contested territory.';
    return null;
  }

  function affordableError(state, player, definition, action) {
    const available = presence(state, player).available;
    const required=action?actionCost(state,action).presence:definition.presence;
    return required > available ? separatedEconomy ? `Not enough Capacity. Requires ${definition.presence} Presence; you have ${available} available Capacity.` : `Requires ${definition.presence} Presence. You currently have ${available} available.` : null;
  }

  function orderTargetError(state, player, definition, action) {
    const target = unitById(state, action.targetUid);
    const effect = resolveEffect(definition,action);
    if (!effect) return 'Choose a valid Adapt mode before selecting a target.';
    if(T&&TacticalRules.EFFECTS.includes(effect.kind))return T.error(state,player,effect,action);
    switch (effect.kind) {
      case 'mark':
        if (!target || target.owner === player) return 'Choose an enemy battlefield card to Mark.';
        if (target.marked) return 'That card is already Marked until its next offensive turn.';
        break;
      case 'reinforce':
        if (!target || target.owner !== player) return 'Choose an allied battlefield card to Reinforce.';
        if (!target.damage && (target.reinforced || trait(target,'armor'))) return 'That card is healthy and already protected by Armor.';
        break;
      case 'damage':
        if (!target || target.owner === player) return 'Choose an enemy battlefield card to damage.';
        break;
      case 'sabotage':
        if (!target || target.owner === player) return 'Choose an enemy battlefield card to sabotage.';
        if (!(card(target).traits || []).length) return 'This card has no printed traits to suppress.';
        if (target.suppressed) return 'This card is already sabotaged until its next offensive turn.';
        break;
      case 'heal':
        if (!target || target.owner !== player) return 'Choose an allied battlefield card to heal.';
        if (!target.damage) return 'That card is already at full health.';
        break;
      case 'rally':
        if (!target || target.owner !== player || card(target).type === 'asset') return 'Choose an allied unit to ready.';
        if (target.ready) return 'That unit is already ready.';
        break;
      case 'reclaim':
        if (!target || target.owner !== player) return 'Choose an allied battlefield card to return to hand.';
        break;
      case 'disrupt':
        if (presence(state, 1 - player).available === 0) return 'The opponent has no available Presence to disrupt.';
        break;
    }
    return null;
  }

  function orderTargets(state, player, definition, action = {}) {
    const effect = resolveEffect(definition,action);
    if(T&&effect&&TacticalRules.EFFECTS.includes(effect.kind))return T.targets(state,player,effect,action).filter(a=>!T.error(state,player,effect,a)).map(a=>a.targetUid).filter(Boolean);
    if (!effect || !['damage','heal','rally','reclaim','sabotage','mark','reinforce'].includes(effect.kind)) return [];
    return state.units.filter(unit => !orderTargetError(state,player,definition,{...action,targetUid:unit.uid})).map(unit => unit.uid);
  }

  function commanderCandidates(state,player) {
    const c=Commanders && Commanders.get(leader(state,player)?.id);
    if (!c) return [];
    if (c.active.target==='none'||c.active.target==='frontline-enemies') return [{type:'commander'}];
    if (c.active.target==='relocate-ally') return state.units.filter(u=>u.owner===player).flatMap(u=>state.territories.map(t=>({type:'commander',targetUid:u.uid,territory:t.id})));
    return state.units.map(u=>({type:'commander',targetUid:u.uid}));
  }

  function commanderError(state,player,action) {
    if (!commandersEnabled) return 'Commanders are not enabled in this historical rules profile.';
    const runtime=leader(state,player),c=Commanders.get(runtime?.id);
    if (!c) return 'Choose a Commander from your faction.';
    if (state.winner!==null) return 'The match is over.';
    if (state.response) return 'Resolve the response window before commanding.';
    if (player!==state.attacker) return 'Your Commander acts only during your offensive turn.';
    if (runtime.used) return 'This once-per-match Commander ability is spent.';
    if (state.actionsLeft<c.active.cost.commandActions) return 'This Commander ability requires 1 Command Action.';
    if (presence(state,player).available<c.active.cost.presence) return `This Commander ability requires ${c.active.cost.presence} available Capacity.`;
    const target=unitById(state,action.targetUid);
    switch(c.id) {
      case 'commander_stonewall_warden':
        if (!target||target.owner!==player||!target.damage) return 'Choose a damaged allied battlefield card.'; break;
      case 'commander_stonewall_marshal':
        if (!target||target.owner!==player||card(target).type==='asset'||target.ready) return 'Choose an exhausted allied unit.'; break;
      case 'commander_bruiser_breaker':
        if (!target||target.owner!==player||card(target).type==='asset'||target.territory!==state.contested) return 'Choose an allied unit in the contested territory.'; break;
      case 'commander_bruiser_bloodhound':
        if (!target||target.owner===player||!target.damage) return 'Choose a wounded enemy battlefield card.'; break;
      case 'commander_syndicate_coordinator':
        if (!target||target.owner===player) return 'Choose an enemy battlefield card.'; break;
      case 'commander_syndicate_quartermaster':
        if (!state.players[player].spent&&!state.players[player].deck.length&&!state.players[player].discard.length) return 'No temporary spending or reserve cards remain to recover.'; break;
      case 'commander_nightwalker_ghost':
        if (!target||target.owner!==player||card(target).type==='asset') return 'Choose an allied unit to withdraw.';
        if(T&&T.get(state,target.uid,'suppression'))return 'Suppression prevents voluntary withdrawal.';
        if (retreatDestination(state,target).to===null) return 'That unit has no adjacent friendly retreat slot.'; break;
      case 'commander_nightwalker_saboteur':
        if (!unitsAt(state,state.contested,1-player).length) return 'No enemies occupy the contested territory.'; break;
      case 'commander_rogue_scavenger':
        if (!state.players[player].discard.some(id=>card(id).type!=='order')) return 'No destroyed battlefield card remains in your discard.'; break;
      case 'commander_rogue_drifter': {
        const t=state.territories[action.territory];
        if (!target||target.owner!==player||card(target).type==='asset') return 'Choose an allied unit to relocate.';
        if(T&&T.get(state,target.uid,'suppression')&&target.territory!==action.territory)return 'Suppression prevents voluntary relocation.';
        if (!Number.isInteger(action.territory)||!t||(t.owner!==player&&t.id!==state.contested)) return 'Choose friendly territory or the current contested territory.';
        if (target.territory!==t.id&&unitsAt(state,t.id,player).length>=state.config.slotsPerTerritory) return 'No allied slot is available at the destination.';
        if (target.territory===t.id&&target.ready) return 'Choose a different destination or an exhausted unit.';
        break;
      }
    }
    return null;
  }

  function commanderStatus(state,player) {
    const runtime=state.players[player]?.commander,c=Commanders&&Commanders.get(runtime?.id);
    if (!commandersEnabled||!c) return {id:null,used:false,available:false,reason:'Commanders are not enabled in this rules profile.',cost:{presence:0,commandActions:0},legalActions:[]};
    const candidates=commanderCandidates(state,player),legal=candidates.filter(a=>!commanderError(state,player,a));
    const base=commanderError(state,player,{type:'commander'});
    return {...c,id:c.id,used:runtime.used,available:legal.length>0,reason:legal.length?'':base||'No legal target is available.',cost:{...c.active.cost},legalActions:legal};
  }

  function resolveCommander(state,player,action) {
    const p=state.players[player],c=Commanders.get(p.commander.id),cost=c.active.cost,target=unitById(state,action.targetUid);
    p.commander.used=true;p.spent+=cost.presence;state.actionsLeft-=cost.commandActions;
    event(state,'commanderActivated',{player,commanderId:c.id,ability:c.active.name,presenceCost:cost.presence,commandCost:cost.commandActions,...(target?{targetUid:target.uid}:{}),...(action.territory!==undefined?{territory:action.territory}:{})});
    const heal=(unit,amount)=>{const actual=Math.min(amount,unit.damage);unit.damage-=actual;event(state,'heal',{player,uid:unit.uid,cardId:unit.cardId,amount:actual,sourceCommanderId:c.id});};
    switch(c.id) {
      case 'commander_stonewall_warden': heal(target,3);target.reinforced=1;event(state,'reinforce',{player,uid:target.uid,cardId:target.cardId,amount:1,sourceCommanderId:c.id});break;
      case 'commander_stonewall_marshal': target.ready=true;target.commanderCounter=1;break;
      case 'commander_bruiser_breaker': target.ready=true;target.commanderBreach=2;break;
      case 'commander_bruiser_bloodhound': dealDamage(state,target,3,player,false,{sourceCommanderId:c.id,...(T?{direct:true,cause:'enemyEffect',sourceKind:'commander'}:{})});removeDead(state,player);break;
      case 'commander_syndicate_coordinator': target.marked=1;event(state,'mark',{player,targetOwner:target.owner,uid:target.uid,targetUid:target.uid,cardId:target.cardId,amount:1,sourceCommanderId:c.id});dealDamage(state,target,2,player,false,{sourceCommanderId:c.id,...(T?{direct:true,cause:'enemyEffect',sourceKind:'commander'}:{})});removeDead(state,player);break;
      case 'commander_syndicate_quartermaster': {const amount=Math.min(4,p.spent);p.spent-=amount;const drawn=draw(state,player,2);event(state,'commanderRecovery',{player,commanderId:c.id,amount,drawn});break;}
      case 'commander_nightwalker_ghost': {const from=target.territory;target.territory=retreatDestination(state,target).to;target.ready=true;target.movedTurn=state.turn;heal(target,3);event(state,'move',{player,uid:target.uid,cardId:target.cardId,from,to:target.territory,reason:'commander',commanderId:c.id});if(T){T.moved(state,target);T.entry(state,target,'voluntary');}break;}
      case 'commander_nightwalker_saboteur': {
        for(const unit of unitsAt(state,state.contested,1-player)) {unit.suppressed=true;event(state,'sabotage',{player,targetOwner:unit.owner,uid:unit.uid,cardId:unit.cardId,sourceCommanderId:c.id,traits:card(unit).traits.slice()});}
        const amount=Math.min(2,presence(state,1-player).available);state.players[1-player].spent+=amount;event(state,'commanderDisrupt',{player,commanderId:c.id,amount});break;
      }
      case 'commander_rogue_scavenger': {const index=p.discard.findLastIndex(id=>card(id).type!=='order'),id=p.discard.splice(index,1)[0],uid=`c${state.nextUid++}`;p.hand.push({uid,cardId:id});event(state,'commanderRecovery',{player,commanderId:c.id,cardId:id,uid,amount:1});break;}
      case 'commander_rogue_drifter': {const from=target.territory;target.territory=action.territory;target.ready=true;target.movedTurn=state.turn;event(state,'move',{player,uid:target.uid,cardId:target.cardId,from,to:target.territory,reason:'commander',commanderId:c.id});if(T&&from!==target.territory){T.moved(state,target);T.entry(state,target,'voluntary');}break;}
    }
    log(state,`${c.name} commands ${c.active.name}. Its once-per-match command is now spent.`,'commander');
  }

  function validate(state, action) {
    if (!action || typeof action.type !== 'string') return 'Choose an action.';
    if (state.winner !== null) return 'The match is over. Start a rematch to play again.';
    const player = getActor(state);
    if (action.player !== undefined && action.player !== player) return `Player ${player + 1} must act now.`;
    if (state.response) {
      const response = state.response;
      const required = response.stage === 'response' ? 'respond' : 'counter';
      if (action.type !== required) return required === 'respond' ? 'Resolve the defender response before continuing.' : 'Resolve the attacker counter before continuing.';
      const choices = Number(action.pass === true) + Number(!!action.handUid) + Number(!!action.guardUid);
      if (choices !== 1) return 'Choose exactly one response or pass.';
      if (action.pass === true) return null;
      if (action.guardUid) {
        if (required !== 'respond') return 'Guard is a defender response only.';
        const guard = unitById(state, action.guardUid);
        const defender = unitById(state, response.defenderUid);
        const attacking = unitById(state, response.attackerUid);
        if (!guard || guard.owner !== player || !trait(guard, 'guard') || !guard.ready || card(guard).type === 'asset') return 'Choose a ready allied Guard unit.';
        if (guard.uid === defender.uid || guard.territory !== defender.territory) return 'Guard must be another allied unit in the defending territory.';
        if (trait(attacking, 'precision')) return 'Precision bypasses Guard interception.';
        return null;
      }
      const item = handById(state, player, action.handUid);
      if (!item) return 'That card is no longer in your hand.';
      const definition = card(item);
      if (definition.type !== 'order' || !definition.effect) return 'Choose a suitable Order from your hand.';
      if (required === 'respond') {
        if (definition.timing !== 'response' || !RESPONSE_EFFECTS.includes(definition.effect.kind)) return 'This Order cannot be played as a defender response.';
        if (definition.effect.kind === 'retreat') {
          const defender = unitById(state, response.defenderUid);
          const error = moveError(state, defender, defender.territory - direction(player), true);
          if (error) return `Cannot retreat: ${error}`;
        }
      } else if (definition.timing !== 'counter' || definition.effect.kind !== 'counter' || !response.order) {
        return 'A Counter can cancel a defensive Order only; Guard cannot be countered.';
      }
      return affordableError(state, player, definition, action);
    }
    if (action.type === 'respond' || action.type === 'counter') return 'There is no pending response window.';
    if (action.type === 'endTurn') return null;
    if (action.type === 'commander') return commanderError(state,player,action);
    const cost = actionCost(state,action);
    if (cost.commandActions > state.actionsLeft) return separatedEconomy ? 'No Command Actions remaining for this action. You may still deploy Free Action cards if you have enough Capacity.' : 'No major actions remain. End your offensive turn.';
    if(T&&['ability','overwatch'].includes(action.type)){
      const unit=unitById(state,action.unitUid);
      if(!unit||unit.owner!==player)return 'Choose your surviving battlefield card.';
      if(cost.presence>presence(state,player).available)return 'Not enough available Capacity for this tactical ability.';
      return action.type==='ability'?T.abilityError(state,player,unit,action):T.overwatchError(state,unit);
    }
    if (action.type === 'deploy' || action.type === 'order') {
      const item = handById(state, player, action.handUid);
      if (!item) return 'That card is no longer in your hand.';
      const definition = card(item);
      if (action.type === 'deploy') {
        if (definition.type === 'order') return 'Orders are played for their effect, not deployed.';
        const territory = state.territories[action.territory];
        if (!Number.isInteger(action.territory) || !territory || territory.owner !== player) return 'Deploy into a territory you control.';
        if (unitsAt(state, territory.id, player).length >= state.config.slotsPerTerritory) return 'All allied slots in that territory are occupied.';
        if (definition.unique && state.units.some(unit => unit.owner === player && unit.cardId === item.cardId)) return 'You already control this unique card.';
      } else {
        if (definition.type !== 'order' || (definition.timing || 'action') !== 'action' || !definition.effect || !actionEffects.includes(definition.effect.kind)) return 'This card is not an offensive Order.';
        const error = orderTargetError(state, player, definition, action);
        if (error) return error;
      }
      return affordableError(state, player, definition, action);
    }
    if (action.type === 'move' || action.type === 'attack') {
      const unit = unitById(state, action.unitUid);
      if (!unit || unit.owner !== player) return 'Choose one of your surviving battlefield units.';
      if (action.type === 'move') return moveError(state, unit, action.territory, false);
      if (card(unit).type === 'asset') return 'Assets cannot attack.';
      if (!unit.ready) return 'This unit is exhausted. It must ready before attacking.';
      if (unit.deployedTurn === state.turn && !trait(unit, 'rush')) return 'Newly deployed units cannot attack this turn unless they have Rush.';
      const target = unitById(state, action.targetUid);
      if (!target || target.owner === player) return 'Choose a surviving enemy battlefield card.';
      if (target.territory !== unit.territory) return 'Combat requires both cards to be in the same territory.';
      return null;
    }
    return 'Unknown action.';
  }

  function playOrder(state, player, handUid, action) {
    const p = state.players[player];
    const cost=actionCost(state,action||{type:state.response?.stage==='counter'?'counter':'respond',handUid});
    const index = p.hand.findIndex(item => item.uid === handUid);
    const item = p.hand.splice(index, 1)[0];
    const definition = card(item);
    p.spent += cost.presence;
    if (leads(state,player,'commander_syndicate_quartermaster')&&action?.type==='order'&&definition.presence<=3&&definition.commandCost>0&&p.commander.passiveTurn!==state.turn) {
      p.commander.passiveTurn=state.turn;commanderPassive(state,player,definition.commandCost,{causeUid:item.uid});
    }
    if (leads(state,player,'commander_syndicate_coordinator')&&cost.presence<definition.presence) commanderPassive(state,player,definition.presence-cost.presence,{causeUid:item.uid});
    p.discard.push(item.cardId);
    state.stats.orders[player]++;
    event(state,'order',{player,uid:item.uid,cardId:item.cardId,presence:cost.presence,commandActions:cost.commandActions,effect:resolveEffect(definition,action)?.kind || definition.effect.kind,timing:definition.timing || 'action',
      ...(definition.effect.kind === 'adapt' ? {mode:action.mode} : {})});
    log(state, `Player ${player + 1} plays ${definition.name}, spending ${cost.presence} Presence until their next offensive turn.`, 'order');
    return item;
  }

  function resolveOrder(state, player, definition, action) {
    const target = unitById(state, action.targetUid);
    const effect = resolveEffect(definition,action);
    const amount = effect.amount || 0;
    if(T&&TacticalRules.EFFECTS.includes(effect.kind)){T.resolve(state,player,definition,action,effect);return;}
    switch (effect.kind) {
      case 'mark':
        target.marked = 1;
        event(state,'mark',{player,targetOwner:target.owner,uid:target.uid,targetUid:target.uid,cardId:target.cardId,sourceCardId:definition.id,amount:1});
        log(state, `${card(target).name} is Marked: +1 incoming combat damage until its owner's next offensive turn.`, 'order');
        break;
      case 'reinforce': {
        const healed = Math.min(target.damage,amount);
        target.damage -= healed;target.reinforced = 1;
        event(state,'heal',{player,uid:target.uid,cardId:target.cardId,amount:healed,sourceCardId:definition.id});
        event(state,'reinforce',{player,uid:target.uid,cardId:target.cardId,sourceCardId:definition.id,amount:1,healed});
        log(state, `${card(target).name} heals ${healed} damage and gains temporary Armor until its owner's next offensive turn.`, 'heal');
        break;
      }
      case 'damage': dealDamage(state, target, amount, player, false,{sourceCardId:definition.id,sourceUid:null,...(T?{direct:true,cause:'enemyEffect',sourceKind:'order'}:{})}); removeDead(state, player); break;
      case 'sabotage':
        target.suppressed = true;
        target.sabotageSource = {player,cardId:definition.id};
        event(state,'sabotage',{player,targetOwner:target.owner,uid:target.uid,targetUid:target.uid,cardId:target.cardId,sourceCardId:definition.id,traits:card(target).traits.slice()});
        log(state, `${card(target).name} loses its printed traits until its owner's next offensive turn.`, 'order');
        break;
      case 'heal': {
        const healed = Math.min(target.damage, amount);
        target.damage -= healed;
        event(state,'heal',{player,uid:target.uid,cardId:target.cardId,amount:healed,sourceCardId:definition.id});
        log(state, `${card(target).name} heals ${healed} damage.`, 'heal');
        break;
      }
      case 'rally': target.ready=true;event(state,'rally',{player,uid:target.uid,cardId:target.cardId,sourceCardId:definition.id});log(state,`${card(target).name} is ready again.`,'order');break;
      case 'draw': draw(state, player, amount); break;
      case 'disrupt': {
        const applied = Math.min(amount, presence(state, 1 - player).available);
        state.players[1 - player].spent += applied;
        event(state,'disrupt',{player,targetPlayer:1-player,amount:applied,sourceCardId:definition.id});
        log(state, `Player ${2 - player} loses ${applied} available Presence until their next offensive turn.`, 'order');
        break;
      }
      case 'reclaim':
        if(T)T.clearUnit(state,target.uid);
        state.units = state.units.filter(unit => unit.uid !== target.uid);
        state.players[player].hand.push({ uid: target.uid, cardId: target.cardId, ...(salvageRecovery && target.damage ? {damage:target.damage} : {}) });
        event(state,'reclaim',{player,uid:target.uid,cardId:target.cardId,freedPresence:card(target).presence,sourceCardId:definition.id,...(salvageRecovery?{retainedDamage:target.damage}:{})});
        log(state, `${card(target).name} returns to hand${salvageRecovery && target.damage ? ` retaining ${target.damage} wounds` : ''} and frees ${card(target).presence} committed Presence.`, 'order');
        break;
    }
  }

  function resolveCombat(state, canceled) {
    const response = state.response;
    // Close the window before applying any effects: this engagement can resolve only once.
    state.response = null;
    let attacker = unitById(state, response.attackerUid);
    let defender = unitById(state, response.defenderUid);
    let shield = 0;
    if (response.order && !canceled) {
      const definition = card(response.order.cardId);
      const amount = definition.effect.amount || 0;
      if (definition.effect.kind === 'shield') shield = amount;
      if (definition.effect.kind === 'ambush') {
        dealDamage(state, attacker, amount, response.responder, false,{sourceUid:response.order.handUid,sourceCardId:definition.id});
        removeDead(state, response.responder);
      }
      if (definition.effect.kind === 'retreat' && defender) {
        const destination = defender.territory - direction(defender.owner);
        if (!moveError(state, defender, destination, true)) {
          const origin = defender.territory;
          defender.territory = destination;
          if(T){T.moved(state,defender);T.entry(state,defender,'voluntary');}
          defender.ready = false;
          defender.movedTurn = state.turn;
          event(state,'move',{player:defender.owner,uid:defender.uid,cardId:defender.cardId,from:origin,to:destination,reason:'retreat'});
          log(state, `${card(defender).name} retreats to ${state.territories[destination].name}; the attack misses.`, 'move');
        }
      }
    }
    attacker = unitById(state, response.attackerUid);
    defender = unitById(state, response.defenderUid);
    if (!attacker || !defender || attacker.territory !== defender.territory) {
      log(state, 'The engagement ends without combat damage.', 'combat');
      return;
    }
    // Snapshot both attacks before wounds or deaths so retaliation is simultaneous.
    const incoming = attackValue(state, attacker,defender);
    if (leads(state,attacker.owner,'commander_bruiser_bloodhound')&&defender.damage>0) commanderPassive(state,attacker.owner,1,{causeUid:attacker.uid,targetUid:defender.uid});
    const retaliation = attackValue(state, defender);
    if(T&&trait(attacker,'breach'))event(state,'breach',{player:attacker.owner,sourceUid:attacker.uid,sourceCardId:attacker.cardId,targetUid:defender.uid,targetCardId:defender.cardId,bypassedCover:!!T.get(state,defender.uid,'cover'),assetBonus:card(defender).type==='asset'?card(attacker).tactical?.breachAssetBonus||0:0});
    event(state,'combat',{player:attacker.owner,attackerUid:attacker.uid,attackerCardId:attacker.cardId,defenderUid:defender.uid,defenderCardId:defender.cardId,
      incoming,retaliation,shield,shieldCardId:response.order && !canceled && shield ? response.order.cardId : null,
      shieldAbsorbed:Math.min(incoming+(arsenalMechanics&&defender.marked&&incoming>0?1:0),shield),shieldEffectiveProtected:Math.min(combatDamage(state,defender,incoming,0,{sourceUid:attacker.uid,direct:true}),card(defender).health-defender.damage)
        -Math.min(combatDamage(state,defender,incoming,shield,{sourceUid:attacker.uid,direct:true}),card(defender).health-defender.damage),
      commandSupporters:[attacker,defender].map(unit => unitsAt(state,unit.territory,unit.owner).filter(ally => ally.uid !== unit.uid && trait(ally,'command')).map(ally => ({player:ally.owner,uid:ally.uid,cardId:ally.cardId}))),
      berserk:[attacker,defender].map(unit => trait(unit,'berserk') && unit.damage > 0)});
    if (shield) log(state, `The defensive Order absorbs up to ${shield} incoming damage.`, 'combat');
    dealDamage(state,defender,arsenalMechanics?incoming:Math.max(0,incoming-shield),attacker.owner,true,{sourceUid:attacker.uid,sourceCardId:attacker.cardId,...(arsenalMechanics?{shield}:{}),
      commandSupporters:unitsAt(state,attacker.territory,attacker.owner).filter(unit=>unit.uid!==attacker.uid&&trait(unit,'command')).map(unit=>({player:unit.owner,cardId:unit.cardId}))});
    dealDamage(state,attacker,retaliation,defender.owner,true,{sourceUid:defender.uid,sourceCardId:defender.cardId,
      commandSupporters:unitsAt(state,defender.territory,defender.owner).filter(unit=>unit.uid!==defender.uid&&trait(unit,'command')).map(unit=>({player:unit.owner,cardId:unit.cardId}))});
    removeDead(state);
    const survivor = unitById(state, response.defenderUid);
    if(T&&survivor)survivor.defendedTurn=state.turn;
    if (survivor && card(survivor).type!=='asset' && leads(state,survivor.owner,'commander_stonewall_marshal')) {
      survivor.commanderCounter=1;commanderPassive(state,survivor.owner,1,{targetUid:survivor.uid});
    }
    const survivingAttacker = unitById(state, response.attackerUid);
    if (survivor && survivingAttacker && trait(survivor,'retaliate')) {
      event(state,'passive',{player:survivor.owner,uid:survivor.uid,cardId:survivor.cardId,trait:'retaliate',amount:1});
      dealDamage(state,survivingAttacker,1,survivor.owner,false,{sourceUid:survivor.uid,sourceCardId:survivor.cardId,passive:'retaliate'});
      removeDead(state,survivor.owner);
    }
  }

  function compareUid(left, right) {
    const a = /^(.*?)(\d+)$/.exec(left.uid), b = /^(.*?)(\d+)$/.exec(right.uid);
    if (a && b && a[1] === b[1] && Number(a[2]) !== Number(b[2])) return Number(a[2])-Number(b[2]);
    return left.uid < right.uid ? -1 : left.uid > right.uid ? 1 : 0;
  }

  // A dedicated forced-movement query keeps future withdrawal modifiers in
  // one rules boundary, separate from player-issued moves and response Orders.
  function retreatDestination(state, unit) {
    const to = unit.territory - direction(unit.owner);
    if (card(unit).type === 'asset') return { to:null, reason:'immobile asset' };
    if (!state.territories[to]) return { to:null, reason:'no territory beyond home' };
    if (state.territories[to].owner !== unit.owner) return { to:null, reason:'no friendly territory' };
    if (unitsAt(state,to,unit.owner).length >= state.config.slotsPerTerritory) return { to:null, reason:'friendly territory is full' };
    return { to, reason:null };
  }

  function resolveForcedRetreat(state, territory, capturedBy) {
    const defenders = unitsAt(state,territory,1-capturedBy).slice().sort(compareUid);
    // Reserve destinations in UID order before removing casualties. A source
    // that is itself routed cannot scavenge another simultaneous routed ally.
    const plans = [], reserved = new Map();
    for (const unit of defenders) {
      const destination = retreatDestination(state,unit);
      if (destination.to !== null) {
        const reservedSlots = reserved.get(destination.to)||0;
        if (unitsAt(state,destination.to,unit.owner).length+reservedSlots >= state.config.slotsPerTerritory) {
          destination.to = null;destination.reason = 'friendly territory is full';
        } else reserved.set(destination.to,reservedSlots+1);
      }
      plans.push({unit,...destination});
    }
    for (const plan of plans) if (plan.to === null) plan.unit.damage = card(plan.unit).health;
    for (const {unit,to,reason} of plans) {
      if (to === null) {
        event(state,'forcedElimination',{player:unit.owner,uid:unit.uid,cardId:unit.cardId,territory,reason,freedPresence:card(unit).presence,capturedBy});
        log(state,`NO RETREAT — ${card(unit).name} is eliminated (${reason}); the captured territory cannot shelter enemy forces.`,'retreat');
        destroy(state,unit,capturedBy,T?{cause:'displacementFailure',sourceKind:'capture',player:capturedBy}:undefined);
        continue;
      }
      unit.territory = to;
      if(T)T.moved(state,unit);
      unit.ready = false;
      unit.movedTurn = state.turn;
      event(state,'forcedRetreat',{player:unit.owner,uid:unit.uid,cardId:unit.cardId,from:territory,to,capturedBy});
      log(state,`${card(unit).name} retreats from ${state.territories[territory].name} to friendly ${state.territories[to].name} because the territory was captured.`,'retreat');
    }
  }

  function capture(state, player, forced) {
    const territory = state.territories[state.contested];
    const held = territory.owner === player;
    const previousOwner = territory.owner;
    territory.owner = player;
    state.territories.forEach(item => { item.progress = [0, 0]; });
    state.stats.captures[player]++;
    event(state,'capture',{player,territory:territory.id,previousOwner,recapture:held,forced:!!forced,
      contributors:unitsAt(state,territory.id,player).map(unit => ({uid:unit.uid,cardId:unit.cardId,presence:card(unit).presence}))});
    log(state, `Player ${player + 1} ${held ? 'secures' : 'captures'} ${territory.name}${forced ? ' [DEBUG]' : ''}.`, 'capture');
    if (frontlineIntegrity) resolveForcedRetreat(state,territory.id,player);
    const opponentHome = player === 0 ? 6 : 0;
    if (territory.id === opponentHome || controlledCount(state, player) >= state.config.victoryTerritories) {
      state.winner = player;
      state.response = null;
      if (frontlineIntegrity) event(state,'frontline',{player,from:state.contested,to:state.contested,victory:true});
      log(state, `Player ${player + 1} wins by conquest!`, 'victory');
      return;
    }
    const previousFrontline = state.contested;
    state.contested = Math.max(0, Math.min(6, state.contested + direction(player)));
    if (frontlineIntegrity) event(state,'frontline',{player,from:previousFrontline,to:state.contested});
    log(state, `The frontline shifts to ${state.territories[state.contested].name}.`, 'frontline');
    // A breakthrough creates contact before the defender's initiative. Without
    // this adjacent advance, two stationary stacks can endlessly secure their
    // own ground on alternating turns without ever being allowed to engage.
    let spaces = state.config.slotsPerTerritory - unitsAt(state, state.contested, player).length;
    const advancing = unitsAt(state, territory.id, player)
      .filter(unit => card(unit).type !== 'asset')
      .sort((left, right) => left.deployedTurn - right.deployedTurn);
    for (const unit of advancing) {
      if (spaces <= 0) break;
      unit.territory = state.contested;
      if(T)T.moved(state,unit);
      event(state,'move',{player,uid:unit.uid,cardId:unit.cardId,from:territory.id,to:state.contested,reason:'breakthrough'});
      spaces--;
      log(state, `${card(unit).name} advances one territory with the breakthrough to ${state.territories[state.contested].name}.`, 'move');
    }
  }

  function capturePressure(state,player) {
    const frontline=unitsAt(state,state.contested,player);
    const printed=frontline.reduce((sum,unit)=>sum+card(unit).presence,0);
    const bonus=leads(state,player,'commander_bruiser_breaker')&&frontline.some(unit=>trait(unit,'rush')||trait(unit,'mobile'))?2:0;
    const tacticalBonus=T?(state.effects||[]).filter(f=>f.kind==='pressure'&&f.owner===player&&f.territory===state.contested).reduce((sum,f)=>sum+f.amount,0):0;
    return {printed,bonus,total:printed+bonus+tacticalBonus,...(T?{tacticalBonus}:{})};
  }
  function endTurn(state) {
    const player = state.attacker;
    const territory = state.territories[state.contested];
    const pressure=capturePressure(state,player),extra=pressure.bonus,generated=pressure.total;
    if(extra)commanderPassive(state,player,extra,{territory:state.contested});
    if(commandersEnabled)for(const unit of state.units.filter(u=>u.owner===player)){delete unit.commanderCounter;delete unit.commanderBreach;}
    territory.progress[player] += generated;
    state.stats.presenceGenerated[player] += generated;
    event(state,'pressure',{player,territory:territory.id,amount:generated,contributors:unitsAt(state,territory.id,player).map(unit => ({uid:unit.uid,cardId:unit.cardId,presence:card(unit).presence}))});
    log(state, `Player ${player + 1} adds ${generated} Presence to ${territory.name}: ${territory.progress[player]}/${state.config.captureThreshold}.`, 'presence');
    if (territory.progress[player] >= state.config.captureThreshold) capture(state, player, false);
    if(T)T.expire(state,player,'windowEnd');
    if (state.winner !== null) return;
    state.attacker = 1 - player;
    state.turn++;
    startTurn(state);
  }

  function dispatchImpl(state, action) {
    const error = validate(state, action);
    if (error) return { ok: false, state, error };
    const next = copy(state);
    const player = getActor(next);
    switch (action.type) {
      case 'commander': resolveCommander(next,player,action); break;
      case 'ability': T.executeAbility(next,player,action);break;
      case 'overwatch': T.setOverwatch(next,unitById(next,action.unitUid));break;
      case 'deploy': {
        const hand = next.players[player].hand;
        const item = hand.splice(hand.findIndex(entry => entry.uid === action.handUid), 1)[0];
        next.units.push({ uid: item.uid, cardId: item.cardId, owner: player, territory: action.territory, damage: salvageRecovery ? item.damage || 0 : 0, ready: true, deployedTurn: next.turn, movedTurn: -1 });
        if (leads(next,player,'commander_nightwalker_ghost')&&trait(next.units[next.units.length-1],'precision')&&leader(next,player).passiveTurn!==next.turn) {
          leader(next,player).passiveTurn=next.turn;next.units[next.units.length-1].reinforced=1;commanderPassive(next,player,1,{targetUid:item.uid});
        }
        next.actionsLeft -= actionCost(state,action).commandActions;
        next.stats.deployments[player]++;
        event(next,'deploy',{player,uid:item.uid,cardId:item.cardId,territory:action.territory,presence:card(item).presence,commandActions:actionCost(state,action).commandActions});
        log(next, `${card(item).name} deploys to ${next.territories[action.territory].name}, committing ${card(item).presence} Presence${separatedEconomy?` and using ${actionCost(state,action).commandActions} Command Actions`:''}.`, 'deploy');
        if(T){const unit=unitById(next,item.uid);T.hooks(next,unit,'onDeploy');T.entry(next,unit,'deploy');}
        break;
      }
      case 'move': {
        const unit = unitById(next, action.unitUid);
        const freeReady = trait(unit, 'mobile') && unit.movedTurn !== next.turn;
        const origin = unit.territory;
        unit.territory = action.territory;
        if(T)T.moved(next,unit);
        unit.ready = freeReady;
        unit.movedTurn = next.turn;
        next.actionsLeft -= actionCost(state,action).commandActions;
        if (leads(next,player,'commander_rogue_drifter')&&leader(next,player).passiveTurn!==next.turn) {leader(next,player).passiveTurn=next.turn;commanderPassive(next,player,1,{targetUid:unit.uid});}
        event(next,'move',{player,uid:unit.uid,cardId:unit.cardId,from:origin,to:action.territory,reason:freeReady ? 'mobile' : 'action'});
        log(next, `${card(unit).name} moves to ${next.territories[action.territory].name}${freeReady ? ' and remains ready (Mobile)' : ''}.`, 'move');
        if(T)T.entry(next,unit,'voluntary');
        break;
      }
      case 'attack': {
        const unit = unitById(next, action.unitUid);
        const target = unitById(next, action.targetUid);
        unit.ready = false;
        if(T){unit.attackedTurn=next.turn;T.clearKind(next,unit.uid,'overwatch');}
        next.actionsLeft -= actionCost(state,action).commandActions;
        next.stats.attacks[player]++;
        next.response = { stage: 'response', attackerUid: unit.uid, defenderUid: target.uid, originalDefenderUid: target.uid, responder: target.owner };
        log(next, `${card(unit).name} attacks ${card(target).name}. Player ${target.owner + 1} may respond.`, 'attack');
        break;
      }
      case 'order': {
        const item = playOrder(next, player, action.handUid, action);
        next.actionsLeft -= actionCost(state,action).commandActions;
        resolveOrder(next, player, card(item), action);
        if (leads(next,player,'commander_nightwalker_saboteur')&&resolveEffect(card(item),action)?.kind==='sabotage'&&leader(next,player).passiveTurn!==next.turn) {
          leader(next,player).passiveTurn=next.turn;const amount=Math.min(1,presence(next,1-player).available);next.players[1-player].spent+=amount;commanderPassive(next,player,amount,{targetUid:action.targetUid});
        }
        break;
      }
      case 'respond':
        if (action.pass === true) resolveCombat(next, false);
        else {
          if (action.guardUid) {
            const guard = unitById(next, action.guardUid);
            guard.ready = false;
            next.response.defenderUid = guard.uid;
            next.response.guardUid = guard.uid;
            event(next,'passive',{player,uid:guard.uid,cardId:guard.cardId,trait:'guard',amount:1});
            log(next, `${card(guard).name} intercepts the attack (Guard).`, 'response');
          } else {
            const item = playOrder(next, player, action.handUid);
            next.response.order = { cardId: item.cardId, handUid: item.uid };
          }
          next.response.stage = 'counter';
        }
        break;
      case 'counter':
        if (action.pass === true) resolveCombat(next, false);
        else {
          const item = playOrder(next, player, action.handUid);
          event(next,'counter',{player,cardId:item.cardId,canceledCardId:next.response.order.cardId});
          log(next, `${card(item).name} cancels ${card(next.response.order.cardId).name}. Its spent Presence remains spent.`, 'counter');
          resolveCombat(next, true);
        }
        break;
      case 'endTurn': endTurn(next); break;
    }
    assertInvariants(next);
    return { ok: true, state: next };
  }

  // Optional diagnostic events are returned alongside the exact authoritative
  // transition. They never enter state or change validation, RNG, or rules.
  function dispatch(state, action, options) {
    const previous = activeEvents;
    activeEvents = options && options.events ? [] : null;
    try {
      const result = dispatchImpl(state,action);
      return activeEvents ? { ...result,events:activeEvents } : result;
    } finally { activeEvents = previous; }
  }

  function legalActions(state) {
    if (state.winner !== null) return [];
    const player = getActor(state);
    const candidates = [];
    if (state.response) {
      const type = state.response.stage === 'response' ? 'respond' : 'counter';
      candidates.push({ type, pass: true });
      state.players[player].hand.forEach(item => candidates.push({ type, handUid: item.uid }));
      if (type === 'respond') state.units.forEach(unit => candidates.push({ type, guardUid: unit.uid }));
    } else {
      candidates.push({ type: 'endTurn' });
      if (commandersEnabled) candidates.push(...commanderCandidates(state,player));
      if (state.actionsLeft > 0 || separatedEconomy) {
        state.players[player].hand.forEach(item => {
          const definition = card(item);
          if (definition.type !== 'order') state.territories.forEach(territory => candidates.push({ type: 'deploy', handUid: item.uid, territory: territory.id }));
          else {
            const modes = arsenalMechanics && definition.effect?.kind === 'adapt' ? definition.effect.modes.map(mode => mode.id) : [null];
            for (const mode of modes) {
              const action = {type:'order',handUid:item.uid,...(mode === null ? {} : {mode})};
              const effect = resolveEffect(definition,action);
              if(T&&effect&&TacticalRules.EFFECTS.includes(effect.kind))candidates.push(...T.targets(state,player,effect,action));
              else if (effect && ['damage','heal','rally','reclaim','sabotage','mark','reinforce'].includes(effect.kind)) state.units.forEach(unit => candidates.push({...action,targetUid:unit.uid}));
              else candidates.push(action);
            }
          }
        });
        if(T)candidates.push(...T.actionCandidates(state,player));
        state.units.filter(unit => unit.owner === player).forEach(unit => {
          [unit.territory - 1, unit.territory + 1].forEach(territory => candidates.push({ type: 'move', unitUid: unit.uid, territory }));
          unitsAt(state, unit.territory, 1 - player).forEach(target => candidates.push({ type: 'attack', unitUid: unit.uid, targetUid: target.uid }));
        });
      }
    }
    return candidates.filter(action => !validate(state, action));
  }

  // Public-board-only forecasts. Never copy/read an opponent hand or reserve.
  function previewCombat(state,attackerRef,defenderRef,shield=0){
    const attacker=typeof attackerRef==='object'?(unitById(state,attackerRef.uid)||attackerRef):unitById(state,attackerRef),defender=typeof defenderRef==='object'?(unitById(state,defenderRef.uid)||defenderRef):unitById(state,defenderRef);
    const empty={affected:[],statusesConsumed:[],statusesRemoved:[],incoming:0,returning:0,damageToDefender:0,retaliation:0};if(!attacker||!defender)return empty;
    const incoming=attackValue(state,attacker,defender),returning=attackValue(state,defender);
    const hit=T?T.hitInfo(state,defender,incoming,{player:attacker.owner,direct:true,combat:true,shield,sourceUid:attacker.uid}):{damage:baseCombatDamage(state,defender,incoming,shield),consumed:[],bypassed:[]};
    const back=T?T.hitInfo(state,attacker,returning,{player:defender.owner,direct:false,combat:true,sourceUid:defender.uid}):{damage:baseCombatDamage(state,attacker,returning),consumed:[],bypassed:[]};
    if(card(defender).health-defender.damage>hit.damage&&card(attacker).health-attacker.damage>back.damage&&trait(defender,'retaliate'))back.damage++;
    const affected=[[defender,hit.damage],[attacker,back.damage]].map(([u,damage])=>({uid:u.uid,owner:u.owner,cardId:u.cardId,damage,healthAfter:Math.max(0,card(u).health-u.damage-damage),killed:u.damage+damage>=card(u).health}));
    return {affected,statusesConsumed:[...hit.consumed,...back.consumed],statusesRemoved:[...hit.bypassed,...back.bypassed],incoming:hit.damage,returning:back.damage,damageToDefender:hit.damage,retaliation:back.damage,targetTerritory:defender.territory,ignoresCover:!!(T&&trait(attacker,'breach')),ignoresDodge:!!trait(attacker,'precision')};
  }
  function previewAction(state,action){
    const result={affected:[],statusesApplied:[],statusesConsumed:[],statusesRemoved:[],moves:[],readies:[],exhausted:[],marks:[],cost:actionCost(state,action),targetTerritory:action.territory??null,ignoresCover:false,ignoresDodge:false,sacrificeUid:action.sacrificeUid||null};
    const warning=validate(state,action);if(warning)return {...result,warning};
    const player=getActor(state),target=unitById(state,action.targetUid);let unit=unitById(state,action.unitUid);
    if(action.type==='attack')return {...result,...previewCombat(state,unit,target),exhausted:[unit.uid]};
    const addHit=(u,amount,context={})=>{const info=T?T.hitInfo(state,u,amount,{player,direct:true,...context}):{damage:context.combat?baseCombatDamage(state,u,amount):Math.max(0,amount),consumed:[],bypassed:[]};result.affected.push({uid:u.uid,owner:u.owner,cardId:u.cardId,damage:info.damage,healthAfter:Math.max(0,card(u).health-u.damage-info.damage),killed:u.damage+info.damage>=card(u).health});result.statusesConsumed.push(...info.consumed);result.statusesRemoved.push(...info.bypassed);};
    const addHeal=(u,amount)=>{const healed=Math.min(amount,u.damage);result.affected.push({uid:u.uid,owner:u.owner,cardId:u.cardId,damage:0,healed,healthAfter:card(u).health-u.damage+healed,killed:false});};
    const addStatus=(kind,u,source,amount,meta)=>{const record=T.record(state,kind,u,source,amount,meta);const existing=T.get(state,u.uid,kind);if(existing)record.id=existing.id;result.statusesApplied.push(record);if(kind==='exposed')result.statusesRemoved.push(...T.statusesFor(state,u.uid).filter(f=>['cover','dodge'].includes(f.kind)).map(f=>f.id));};
    if(T&&action.type==='commander'){
      const id=leader(state,player)?.id;
      if(id==='commander_bruiser_bloodhound'){addHit(target,3);return result;}
      if(id==='commander_syndicate_coordinator'){result.marks.push(target.uid);addHit({...target,marked:1},2);return result;}
      if(id==='commander_nightwalker_ghost'||id==='commander_rogue_drifter'){
        const to=id==='commander_nightwalker_ghost'?retreatDestination(state,target).to:action.territory;
        result.readies.push(target.uid);if(id==='commander_nightwalker_ghost')addHeal(target,3);
        if(to===target.territory)return result;
        unit=target;action={...action,type:'move',unitUid:target.uid,territory:to,commanderRelocation:id};
      }
    }
    if(T&&action.type==='overwatch'){addStatus('overwatch',unit,{player,sourceCardId:unit.cardId,sourceUid:unit.uid},card(unit).tactical.overwatch.damage||2,card(unit).tactical.overwatch);result.exhausted.push(unit.uid);return result;}
    if(action.type==='move'||action.type==='deploy'){
      const entrant=action.type==='move'?{...unit,territory:action.territory,damage:action.commanderRelocation==='commander_nightwalker_ghost'?Math.max(0,unit.damage-3):unit.damage}:{uid:action.handUid,cardId:handById(state,player,action.handUid).cardId,owner:player,territory:action.territory,damage:handById(state,player,action.handUid).damage||0};
      if(action.type==='move')result.moves.push({uid:unit.uid,from:unit.territory,to:action.territory,ready:!!action.commanderRelocation||trait(unit,'mobile')&&unit.movedTurn!==state.turn});else result.deployed=entrant;
      if(T){
        if(action.type==='move')result.statusesRemoved.push(...T.statusesFor(state,unit.uid).filter(f=>f.kind==='overwatch').map(f=>f.id));
        const shadow={turn:state.turn,attacker:state.attacker,territories:state.territories,effects:(state.effects||[]).map(f=>({...f})),units:state.units.map(u=>({...u}))};
        if(action.type==='move')Object.assign(shadow.units.find(u=>u.uid===unit.uid),entrant);else shadow.units.push(entrant);
        // Deployment preparation occurs before entry reactions.
        if(action.type==='deploy')for(const effect of card(entrant).tactical?.onDeploy||[])if(effect.target==='self'&&['cover','dodge'].includes(effect.kind)){const f=T.record(state,effect.kind,entrant,{player,sourceCardId:entrant.cardId,sourceUid:entrant.uid},effect.amount||1);shadow.effects.push(f);result.statusesApplied.push(f);}
        if(!T.territoryStatuses(shadow,action.territory).length)for(const f of shadow.effects.filter(f=>f.kind==='overwatch'&&f.owner!==player&&f.territory===action.territory).slice().sort((a,b)=>compareUid({uid:a.targetUid},{uid:b.targetUid}))){
          const watcher=unitById(shadow,f.targetUid);if(!watcher||watcher.suppressed||entrant.damage>=card(entrant).health)continue;
          const info=T.hitInfo(shadow,entrant,f.amount,{player:watcher.owner,direct:true,sourceUid:watcher.uid,precision:trait(watcher,'precision')});entrant.damage+=info.damage;result.statusesConsumed.push(f.id,...info.consumed);result.statusesRemoved.push(...info.bypassed);shadow.effects=shadow.effects.filter(e=>![f.id,...info.consumed,...info.bypassed].includes(e.id));
          if(f.metadata.consumeSelf)result.affected.push({uid:watcher.uid,owner:watcher.owner,cardId:watcher.cardId,damage:card(watcher).health-watcher.damage,healthAfter:0,killed:true,cause:'rulesResolution'});
        }
        const starting=action.type==='move'?(action.commanderRelocation==='commander_nightwalker_ghost'?Math.max(0,unit.damage-3):unit.damage):handById(state,player,action.handUid).damage||0,damage=entrant.damage-starting;if(damage)result.affected.push({uid:entrant.uid,owner:entrant.owner,cardId:entrant.cardId,damage,healthAfter:Math.max(0,card(entrant).health-entrant.damage),killed:entrant.damage>=card(entrant).health});
      }return result;
    }
    const definition=action.type==='ability'?unit&&card(unit):action.handUid?card(handById(state,player,action.handUid)):null;
    const effect=action.type==='ability'?definition?.tactical?.ability.effect:resolveEffect(definition,action);if(!effect)return result;
    const source={player,sourceCardId:definition.id,sourceUid:action.type==='ability'?unit.uid:null},amount=effect.amount||1,territory=action.territory;
    if(action.type==='ability')result.exhausted.push(unit.uid);
    if(T&&TacticalRules.SACRIFICE_EFFECTS.includes(effect.kind)){const sacrifice=unitById(state,action.sacrificeUid);result.affected.push({uid:sacrifice.uid,owner:sacrifice.owner,cardId:sacrifice.cardId,damage:card(sacrifice).health-sacrifice.damage,healthAfter:0,killed:true,cause:'sacrifice'});result.statusesRemoved.push(...T.statusesFor(state,sacrifice.uid).map(f=>f.id));}
    switch(effect.kind){
      case 'damage':addHit(target,amount);break;
      case 'heal':case 'sacrificeRepair':addHeal(target,amount);break;
      case 'rally':result.readies.push(target.uid);break;
      case 'mark':result.marks.push(target.uid);break;
      case 'reclaim':result.reclaimed=target.uid;result.statusesRemoved.push(...(T?T.statusesFor(state,target.uid):[]).map(f=>f.id));break;
      case 'cover':case 'dodge':case 'suppression':case 'exposed':if(effect.mark)result.marks.push(target.uid);addStatus(effect.kind,target,source,amount);break;
      case 'smoke':addStatus('smoke',{owner:player,territory},source,1);break;
      case 'blast':case 'salvageBlast':result.ignoresCover=true;result.ignoresDodge=true;for(const u of T.victims(state,player,territory,effect.maxTargets||2))addHit(u,amount+(effect.preparedBonus&&(u.marked||T.get(state,u.uid,'exposed'))?effect.preparedBonus:0),{direct:false,blast:true});break;
      case 'breach':result.ignoresCover=true;addHit(target,amount+(card(target).type==='asset'?effect.assetBonus||0:0),{breach:true});break;
      case 'assault':addStatus('attackBoost',target,source,amount);addStatus('exposed',target,source,1);break;
      case 'interlockingFire':case 'holdFast':case 'contingency':
        for(const u of T.selected(state,player,territory,effect.maxTargets||2))addStatus('cover',u,source,2);
        if(effect.kind==='holdFast'){for(const u of unitsAt(state,territory,player).filter(u=>card(u).type!=='asset'))addHeal(u,1);addStatus('pressure',{owner:player,territory},source,effect.pressure||2);}
        if(effect.kind==='contingency')result.unknownDraw=1;break;
      case 'cleanExit':result.moves.push({uid:target.uid,from:target.territory,to:retreatDestination(state,target).to,ready:false});result.exhausted.push(target.uid);addStatus('dodge',target,source,1);break;
      case 'badPlan':addStatus('cover',target,source,2);addStatus('dodge',target,source,1);break;
      case 'breakPosition':{
        const enemies=unitsAt(state,territory,1-player).slice().sort(compareUid);result.statusesRemoved.push(...enemies.flatMap(u=>T.statusesFor(state,u.uid).filter(f=>f.kind==='cover').map(f=>f.id)));
        const enemy=enemies.find(u=>u.damage||T.get(state,u.uid,'cover')||card(u).type==='asset');if(enemy)addStatus('suppression',enemy,source,1);
        const ally=unitsAt(state,territory,player).slice().sort(compareUid).find(u=>card(u).type!=='asset'&&!u.ready&&u.attackedTurn!==state.turn&&!(u.deployedTurn===state.turn&&!trait(u,'rush')));if(ally)result.readies.push(ally.uid);break;
      }
    }return result;
  }

  function debug(state, action) {
    const next = copy(state);
    if (!action || !['presence', 'draw', 'damage', 'destroy', 'capture'].includes(action.type)) throw new Error('Unknown debug action.');
    const player = action.player === undefined ? state.attacker : action.player;
    if (player !== 0 && player !== 1) throw new Error('Debug player must be 0 or 1.');
    const amount = action.amount === undefined ? (action.type === 'damage' ? 1 : action.type === 'draw' ? 1 : 10) : action.amount;
    if (!Number.isInteger(amount) || amount < 0 || amount > 1000) throw new Error('Debug amount must be an integer from 0 to 1000.');
    log(next, `[DEBUG] ${action.type} invoked for Player ${player + 1}.`, 'debug');
    if (action.type === 'presence') {
      next.players[player].command += amount;
      next.config.commandCap = Math.max(next.config.commandCap, next.players[player].command);
    }
    if (action.type === 'draw') draw(next, player, amount);
    if (action.type === 'damage' || action.type === 'destroy') {
      const unit = unitById(next, action.unitUid);
      if (!unit) throw new Error('Select a battlefield card first.');
      if (action.type === 'destroy') destroy(next, unit);
      else { dealDamage(next, unit, amount, undefined, false); removeDead(next); }
      if (next.response && (!unitById(next, next.response.attackerUid) || !unitById(next, next.response.defenderUid) || !unitById(next, next.response.originalDefenderUid))) {
        next.response = null;
        log(next, '[DEBUG] Pending engagement canceled because a participant was removed.', 'debug');
      }
    }
    if (action.type === 'capture') {
      if (next.response) {
        next.response = null;
        log(next, '[DEBUG] Pending engagement canceled before the forced frontline shift.', 'debug');
      }
      capture(next, player, true);
    }
    assertInvariants(next);
    return next;
  }

  function assertInvariants(state) {
    const fail = text => { throw new Error(`Rules invariant: ${text}`); };
    if(T)T.assertStatuses(state,fail);
    if (!Number.isInteger(state.turn) || state.turn < 1 || ![0, 1].includes(state.attacker)) fail('invalid turn or attacker');
    if (!Number.isInteger(state.actionsLeft) || state.actionsLeft < 0 || state.actionsLeft > state.config.actionLimit) fail('invalid actions remaining');
    if (state.players.length !== 2 || state.territories.length !== 7 || !Number.isInteger(state.contested) || state.contested < 0 || state.contested > 6) fail('invalid battlefield');
    if (![null, 0, 1].includes(state.winner)) fail('invalid winner');
    const ids = new Set();
    const unique = new Set();
    function checkUid(uid) { if (!uid || ids.has(uid)) fail('duplicate or missing card UID'); ids.add(uid); }
    state.players.forEach((p, player) => {
      if (p.id !== player || !Data.FACTIONS[p.faction]) fail('invalid player');
      if (commandersEnabled && (!p.commander||Commanders.get(p.commander.id)?.faction!==p.faction||typeof p.commander.used!=='boolean'||!Number.isInteger(p.commander.passiveTurn)||p.commander.passiveTurn < -1||p.commander.passiveTurn>state.turn)) fail('invalid Commander');
      if (!Number.isInteger(p.command) || !Number.isInteger(p.spent) || p.command < 0 || p.spent < 0 || presence(state, player).available < 0) fail('negative or invalid Presence economy');
      p.deck.concat(p.discard).forEach(id => { if (!card(id)) fail('unknown card'); });
      p.hand.forEach(item => {
        checkUid(item.uid); if (!card(item)) fail('unknown hand card');
        if (salvageRecovery && item.damage !== undefined && (!Number.isInteger(item.damage) || item.damage < 0 || card(item).type === 'order' || item.damage >= card(item).health)) fail('invalid reclaimed wounds');
      });
    });
    state.territories.forEach((territory, index) => {
      if (territory.id !== index || ![null, 0, 1].includes(territory.owner)) fail('invalid territory owner or index');
      if (territory.progress.length !== 2 || territory.progress.some(value => !Number.isInteger(value) || value < 0)) fail('invalid capture progress');
      [0, 1].forEach(player => { if (unitsAt(state, index, player).length > state.config.slotsPerTerritory) fail('territory slot capacity exceeded'); });
      if (frontlineIntegrity && ((index < state.contested && territory.owner !== 0) || (index > state.contested && territory.owner !== 1))) fail('non-contiguous frontline ownership');
    });
    state.units.forEach(unit => {
      checkUid(unit.uid);
      const definition = card(unit);
      if (!definition || definition.type === 'order' || ![0, 1].includes(unit.owner) || !Number.isInteger(unit.territory) || unit.territory < 0 || unit.territory > 6) fail('invalid battlefield card');
      if (!Number.isInteger(unit.damage) || unit.damage < 0 || unit.damage >= definition.health || typeof unit.ready !== 'boolean') fail('dead or invalid battlefield card');
      if (arsenalMechanics && ['marked','reinforced'].some(status => unit[status] !== undefined && unit[status] !== 1)) fail('invalid temporary arsenal status');
      if (commandersEnabled && (unit.commanderCounter!==undefined&&unit.commanderCounter!==1 || unit.commanderBreach!==undefined&&unit.commanderBreach!==2)) fail('invalid Commander unit bonus');
      if (frontlineIntegrity && (unit.territory-state.contested)*direction(unit.owner)>0) fail('enemy unit stranded behind frontline');
      if (definition.unique) {
        const key = `${unit.owner}:${unit.cardId}`;
        if (unique.has(key)) fail('duplicate unique card');
        unique.add(key);
      }
    });
    if (state.response) {
      const response = state.response;
      const attacking = unitById(state, response.attackerUid);
      const defending = unitById(state, response.defenderUid);
      const original = unitById(state, response.originalDefenderUid);
      if (!['response', 'counter'].includes(response.stage) || response.responder !== 1 - state.attacker) fail('invalid response stage or actor');
      if (!attacking || !defending || !original || attacking.owner !== state.attacker || defending.owner !== response.responder || original.owner !== response.responder || attacking.territory !== defending.territory || attacking.ready) fail('invalid response participants');
      if (response.order && (!card(response.order.cardId) || card(response.order.cardId).timing !== 'response')) fail('invalid pending Order');
      if (state.winner !== null) fail('response after victory');
    }
    return true;
  }

  return { VERSION:T?'frontlines-territory-v7-tactical':salvageRecovery ? 'frontlines-territory-v6-salvage-recovery' : commandersEnabled ? 'frontlines-territory-v5-commanders' : arsenalMechanics ? 'frontlines-territory-v4-arsenal-mechanics' : separatedEconomy || frontlineIntegrity ? 'frontlines-territory-v3-command-frontline' : 'frontlines-territory-v2-arsenal',RULES:copy(RULES),withData:data => createEngine(data,Commanders,TacticalRules),commanders:Commanders,commanderStatus,capturePressure,hasTrait:trait,createGame,dispatch,card,presence,actionCost,resolveEffect,orderTargets,combatDamage,retreatDestination,unitsAt,controlledCount,getActor,legalActions,validate,attackValue,debug,assertInvariants,
    statusesFor:(state,uid)=>T?T.statusesFor(state,uid):[],territoryStatuses:(state,territory,owner)=>T?T.territoryStatuses(state,territory,owner):[],statusDetails:(state,target)=>T?T.statusDetails(state,target):[],previewAction,actionPreview:previewAction,previewCombat};
});
