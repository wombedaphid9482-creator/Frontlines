(function (root, factory) {
  'use strict';
  const api = factory(typeof module === 'object' && module.exports ? require('./data.js') : root.FrontlinesData);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FrontlinesEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createEngine(Data) {
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
  let activeEvents = null;
  function event(state, type, detail) { if (activeEvents) activeEvents.push({ type, turn:state.turn, ...detail }); }

  function presence(state, player) {
    const p = state.players[player];
    const committed = state.units.reduce((sum, unit) => sum + (unit.owner === player ? card(unit).presence : 0), 0);
    return { command: p.command, committed, spent: p.spent, available: p.command - committed - p.spent };
  }

  function attackValue(state, unit) {
    if (!unit || card(unit).type === 'asset') return 0;
    return card(unit).attack + (trait(unit, 'berserk') && unit.damage > 0 ? 1 : 0)
      + unitsAt(state, unit.territory, unit.owner).filter(ally => ally.uid !== unit.uid && trait(ally, 'command')).length;
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

  function destroy(state, unit, killer) {
    if (!unitById(state, unit.uid)) return;
    state.units = state.units.filter(item => item.uid !== unit.uid);
    state.players[unit.owner].discard.push(unit.cardId);
    if (killer !== undefined && killer !== unit.owner) state.stats.kills[killer]++;
    const source = activeEvents && activeEvents.slice().reverse().find(item => item.type === 'damage' && item.targetUid === unit.uid && item.player === killer);
    event(state,'death',{player:unit.owner,uid:unit.uid,cardId:unit.cardId,territory:unit.territory,freedPresence:card(unit).presence,
      killer:killer === undefined ? null : killer,sourceUid:source && source.sourceUid || null,sourceCardId:source && source.sourceCardId || null});
    log(state, `${card(unit).name} is destroyed; Player ${unit.owner + 1} frees ${card(unit).presence} committed Presence.`, 'destroy');
    // Simultaneous casualties are already wounded to their lethal totals. A
    // source destined to die in this exchange must never draw before removal.
    const salvager = state.units.find(ally => ally.owner === unit.owner && ally.territory === unit.territory &&
      ally.damage < card(ally).health && trait(ally,'scavenge'));
    const owner = state.players[unit.owner];
    if (salvager && owner.scavengedTurn !== state.turn) {
      owner.scavengedTurn = state.turn;
      const drawn = draw(state, unit.owner, 1);
      event(state,'passive',{player:unit.owner,uid:salvager.uid,cardId:salvager.cardId,trait:'scavenge',amount:drawn,causeUid:unit.uid});
    }
  }

  function dealDamage(state, unit, amount, sourcePlayer, combat, source) {
    if (!unit || !unitById(state, unit.uid)) return 0;
    const reduction = combat && trait(unit, 'fortify') && state.territories[unit.territory].owner === unit.owner ? 1 : 0;
    const actual = Math.max(0, amount - reduction);
    const remainingHealth=Math.max(0,card(unit).health-unit.damage);
    const effective=Math.min(actual,remainingHealth);
    unit.damage += actual;
    if (sourcePlayer !== undefined) state.stats.damage[sourcePlayer] += actual;
    event(state,'damage',{player:sourcePlayer === undefined ? null : sourcePlayer,targetOwner:unit.owner,targetUid:unit.uid,targetCardId:unit.cardId,
      territory:unit.territory,amount:actual,effective,fortifyAbsorbed:Math.min(amount,reduction),combat:!!combat,...source,
      fortifyEffectiveProtected:Math.min(amount,remainingHealth)-effective,
      commandEffectiveEnabled:source&&source.commandSupporters?effective-Math.min(Math.max(0,actual-source.commandSupporters.length),remainingHealth):0});
    log(state, `${card(unit).name} takes ${actual} damage${reduction ? ' (Fortify absorbs 1)' : ''}.`, 'damage');
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
      if (!chosen) return {id:faction+'-starter',name:Data.FACTIONS[faction].name+' Starter',faction,cards:Data.DECKS[faction].slice(),archetype:'custom'};
      if (!library) throw new Error('Deck rules are unavailable.');
      const result = library.validate(chosen);
      if (!result.legal || chosen.faction !== faction) throw new Error('Player '+(seat+1)+' deck is illegal: '+(chosen.faction!==faction?'deck faction does not match selection':result.errors.join(' ')));
      return copy(chosen);
    });
    const seed = Number.isFinite(options.seed) ? options.seed >>> 0 : (Date.now() >>> 0);
    const config = configFor(options.config || {});
    const state = {
      config, seed, rngState: seed || 0x9e3779b9, nextUid: 1, turn: 1, attacker: 0,
      actionsLeft: config.actionLimit,
      players: factions.map((faction, id) => ({ id, faction, command: config.startingCommand, spent: 0, turns: 0, deck: chosenDecks[id].cards.slice(), deckMeta:{id:chosenDecks[id].id||'custom-'+id,name:chosenDecks[id].name,faction,archetype:chosenDecks[id].archetype||'custom'}, hand: [], discard: [], riftwalker: null })),
      territories: Data.TERRITORY_NAMES.map((name, id) => ({ id, name, owner: id < 3 ? 0 : id > 3 ? 1 : null, progress: [0, 0] })),
      contested: 3, units: [], response: null, winner: null, log: [],
      stats: { deployments: [0, 0], orders: [0, 0], attacks: [0, 0], kills: [0, 0], damage: [0, 0], captures: [0, 0], presenceGenerated: [0, 0], turns: [0, 0] }
    };
    state.players.forEach(p => { shuffle(state, p.deck); draw(state, p.id, config.startingHand + (p.id === 1 ? (Data.SECOND_PLAYER_OPENING_DRAW || 0) : 0), true); });
    log(state, `${Data.FACTIONS[factions[0]].name} faces ${Data.FACTIONS[factions[1]].name}. The center is contested.`, 'setup');
    startTurn(state);
    assertInvariants(state);
    return state;
  }

  function startTurn(state) {
    const player = state.attacker;
    const p = state.players[player];
    if (p.turns > 0) p.command = Math.min(state.config.commandCap, p.command + state.config.commandGrowth);
    p.turns++;
    p.spent = 0;
    state.stats.turns[player]++;
    state.actionsLeft = state.config.actionLimit;
    state.units.filter(unit => unit.owner === player).forEach(unit => { unit.ready = true; });
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
    log(state, `Player ${player + 1} takes initiative: ${p.command} Command Presence, ${state.actionsLeft} actions.`, 'turn');
    draw(state, player, state.config.drawCount);
  }

  function moveError(state, unit, territory, reaction) {
    if (!Number.isInteger(territory) || !state.territories[territory]) return 'Choose a valid battlefield territory.';
    if (card(unit).type === 'asset') return 'Assets are fixed positions and cannot move.';
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

  function affordableError(state, player, definition) {
    const available = presence(state, player).available;
    return definition.presence > available ? `Requires ${definition.presence} Presence. You currently have ${available} available.` : null;
  }

  function orderTargetError(state, player, definition, action) {
    const target = unitById(state, action.targetUid);
    switch (definition.effect.kind) {
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
      return affordableError(state, player, definition);
    }
    if (action.type === 'respond' || action.type === 'counter') return 'There is no pending response window.';
    if (action.type === 'endTurn') return null;
    if (state.actionsLeft <= 0) return 'No major actions remain. End your offensive turn.';
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
        if (definition.type !== 'order' || (definition.timing || 'action') !== 'action' || !definition.effect || !ACTION_EFFECTS.includes(definition.effect.kind)) return 'This card is not an offensive Order.';
        const error = orderTargetError(state, player, definition, action);
        if (error) return error;
      }
      return affordableError(state, player, definition);
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

  function playOrder(state, player, handUid) {
    const p = state.players[player];
    const index = p.hand.findIndex(item => item.uid === handUid);
    const item = p.hand.splice(index, 1)[0];
    const definition = card(item);
    p.spent += definition.presence;
    p.discard.push(item.cardId);
    state.stats.orders[player]++;
    event(state,'order',{player,uid:item.uid,cardId:item.cardId,presence:definition.presence,effect:definition.effect.kind,timing:definition.timing || 'action'});
    log(state, `Player ${player + 1} plays ${definition.name}, spending ${definition.presence} Presence until their next offensive turn.`, 'order');
    return item;
  }

  function resolveOrder(state, player, definition, targetUid) {
    const target = unitById(state, targetUid);
    const amount = definition.effect.amount || 0;
    switch (definition.effect.kind) {
      case 'damage': dealDamage(state, target, amount, player, false,{sourceCardId:definition.id,sourceUid:null}); removeDead(state, player); break;
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
        state.units = state.units.filter(unit => unit.uid !== target.uid);
        state.players[player].hand.push({ uid: target.uid, cardId: target.cardId });
        event(state,'reclaim',{player,uid:target.uid,cardId:target.cardId,freedPresence:card(target).presence,sourceCardId:definition.id});
        log(state, `${card(target).name} returns to hand and frees ${card(target).presence} committed Presence.`, 'order');
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
    const incoming = attackValue(state, attacker);
    const retaliation = attackValue(state, defender);
    event(state,'combat',{player:attacker.owner,attackerUid:attacker.uid,attackerCardId:attacker.cardId,defenderUid:defender.uid,defenderCardId:defender.cardId,
      incoming,retaliation,shield,shieldCardId:response.order && !canceled && shield ? response.order.cardId : null,
      shieldAbsorbed:Math.min(incoming,shield),shieldEffectiveProtected:Math.min(Math.max(0,incoming-(trait(defender,'fortify')&&state.territories[defender.territory].owner===defender.owner?1:0)),card(defender).health-defender.damage)
        -Math.min(Math.max(0,incoming-shield-(trait(defender,'fortify')&&state.territories[defender.territory].owner===defender.owner?1:0)),card(defender).health-defender.damage),
      commandSupporters:[attacker,defender].map(unit => unitsAt(state,unit.territory,unit.owner).filter(ally => ally.uid !== unit.uid && trait(ally,'command')).map(ally => ({player:ally.owner,uid:ally.uid,cardId:ally.cardId}))),
      berserk:[attacker,defender].map(unit => trait(unit,'berserk') && unit.damage > 0)});
    if (shield) log(state, `The defensive Order absorbs up to ${shield} incoming damage.`, 'combat');
    dealDamage(state,defender,Math.max(0,incoming-shield),attacker.owner,true,{sourceUid:attacker.uid,sourceCardId:attacker.cardId,
      commandSupporters:unitsAt(state,attacker.territory,attacker.owner).filter(unit=>unit.uid!==attacker.uid&&trait(unit,'command')).map(unit=>({player:unit.owner,cardId:unit.cardId}))});
    dealDamage(state,attacker,retaliation,defender.owner,true,{sourceUid:defender.uid,sourceCardId:defender.cardId,
      commandSupporters:unitsAt(state,defender.territory,defender.owner).filter(unit=>unit.uid!==defender.uid&&trait(unit,'command')).map(unit=>({player:unit.owner,cardId:unit.cardId}))});
    removeDead(state);
    const survivor = unitById(state, response.defenderUid);
    const survivingAttacker = unitById(state, response.attackerUid);
    if (survivor && survivingAttacker && trait(survivor,'retaliate')) {
      event(state,'passive',{player:survivor.owner,uid:survivor.uid,cardId:survivor.cardId,trait:'retaliate',amount:1});
      dealDamage(state,survivingAttacker,1,survivor.owner,false,{sourceUid:survivor.uid,sourceCardId:survivor.cardId,passive:'retaliate'});
      removeDead(state,survivor.owner);
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
    const opponentHome = player === 0 ? 6 : 0;
    if (territory.id === opponentHome || controlledCount(state, player) >= state.config.victoryTerritories) {
      state.winner = player;
      state.response = null;
      log(state, `Player ${player + 1} wins by conquest!`, 'victory');
      return;
    }
    state.contested = Math.max(0, Math.min(6, state.contested + direction(player)));
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
      event(state,'move',{player,uid:unit.uid,cardId:unit.cardId,from:territory.id,to:state.contested,reason:'breakthrough'});
      spaces--;
      log(state, `${card(unit).name} advances one territory with the breakthrough to ${state.territories[state.contested].name}.`, 'move');
    }
  }

  function endTurn(state) {
    const player = state.attacker;
    const territory = state.territories[state.contested];
    const generated = unitsAt(state, state.contested, player).reduce((sum, unit) => sum + card(unit).presence, 0);
    territory.progress[player] += generated;
    state.stats.presenceGenerated[player] += generated;
    event(state,'pressure',{player,territory:territory.id,amount:generated,contributors:unitsAt(state,territory.id,player).map(unit => ({uid:unit.uid,cardId:unit.cardId,presence:card(unit).presence}))});
    log(state, `Player ${player + 1} adds ${generated} Presence to ${territory.name}: ${territory.progress[player]}/${state.config.captureThreshold}.`, 'presence');
    if (territory.progress[player] >= state.config.captureThreshold) capture(state, player, false);
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
      case 'deploy': {
        const hand = next.players[player].hand;
        const item = hand.splice(hand.findIndex(entry => entry.uid === action.handUid), 1)[0];
        next.units.push({ uid: item.uid, cardId: item.cardId, owner: player, territory: action.territory, damage: 0, ready: true, deployedTurn: next.turn, movedTurn: -1 });
        next.actionsLeft--;
        next.stats.deployments[player]++;
        event(next,'deploy',{player,uid:item.uid,cardId:item.cardId,territory:action.territory,presence:card(item).presence});
        log(next, `${card(item).name} deploys to ${next.territories[action.territory].name}, committing ${card(item).presence} Presence.`, 'deploy');
        break;
      }
      case 'move': {
        const unit = unitById(next, action.unitUid);
        const freeReady = trait(unit, 'mobile') && unit.movedTurn !== next.turn;
        const origin = unit.territory;
        unit.territory = action.territory;
        unit.ready = freeReady;
        unit.movedTurn = next.turn;
        next.actionsLeft--;
        event(next,'move',{player,uid:unit.uid,cardId:unit.cardId,from:origin,to:action.territory,reason:freeReady ? 'mobile' : 'action'});
        log(next, `${card(unit).name} moves to ${next.territories[action.territory].name}${freeReady ? ' and remains ready (Mobile)' : ''}.`, 'move');
        break;
      }
      case 'attack': {
        const unit = unitById(next, action.unitUid);
        const target = unitById(next, action.targetUid);
        unit.ready = false;
        next.actionsLeft--;
        next.stats.attacks[player]++;
        next.response = { stage: 'response', attackerUid: unit.uid, defenderUid: target.uid, originalDefenderUid: target.uid, responder: target.owner };
        log(next, `${card(unit).name} attacks ${card(target).name}. Player ${target.owner + 1} may respond.`, 'attack');
        break;
      }
      case 'order': {
        const item = playOrder(next, player, action.handUid);
        next.actionsLeft--;
        resolveOrder(next, player, card(item), action.targetUid);
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
      if (state.actionsLeft > 0) {
        state.players[player].hand.forEach(item => {
          const definition = card(item);
          if (definition.type !== 'order') state.territories.forEach(territory => candidates.push({ type: 'deploy', handUid: item.uid, territory: territory.id }));
          else if (definition.effect && ['damage', 'heal', 'rally', 'reclaim', 'sabotage'].includes(definition.effect.kind)) state.units.forEach(unit => candidates.push({ type: 'order', handUid: item.uid, targetUid: unit.uid }));
          else candidates.push({ type: 'order', handUid: item.uid });
        });
        state.units.filter(unit => unit.owner === player).forEach(unit => {
          [unit.territory - 1, unit.territory + 1].forEach(territory => candidates.push({ type: 'move', unitUid: unit.uid, territory }));
          unitsAt(state, unit.territory, 1 - player).forEach(target => candidates.push({ type: 'attack', unitUid: unit.uid, targetUid: target.uid }));
        });
      }
    }
    return candidates.filter(action => !validate(state, action));
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
    if (!Number.isInteger(state.turn) || state.turn < 1 || ![0, 1].includes(state.attacker)) fail('invalid turn or attacker');
    if (!Number.isInteger(state.actionsLeft) || state.actionsLeft < 0 || state.actionsLeft > state.config.actionLimit) fail('invalid actions remaining');
    if (state.players.length !== 2 || state.territories.length !== 7 || !Number.isInteger(state.contested) || state.contested < 0 || state.contested > 6) fail('invalid battlefield');
    if (![null, 0, 1].includes(state.winner)) fail('invalid winner');
    const ids = new Set();
    const unique = new Set();
    function checkUid(uid) { if (!uid || ids.has(uid)) fail('duplicate or missing card UID'); ids.add(uid); }
    state.players.forEach((p, player) => {
      if (p.id !== player || !Data.FACTIONS[p.faction]) fail('invalid player');
      if (!Number.isInteger(p.command) || !Number.isInteger(p.spent) || p.command < 0 || p.spent < 0 || presence(state, player).available < 0) fail('negative or invalid Presence economy');
      p.deck.concat(p.discard).forEach(id => { if (!card(id)) fail('unknown card'); });
      p.hand.forEach(item => { checkUid(item.uid); if (!card(item)) fail('unknown hand card'); });
    });
    state.territories.forEach((territory, index) => {
      if (territory.id !== index || ![null, 0, 1].includes(territory.owner)) fail('invalid territory owner or index');
      if (territory.progress.length !== 2 || territory.progress.some(value => !Number.isInteger(value) || value < 0)) fail('invalid capture progress');
      [0, 1].forEach(player => { if (unitsAt(state, index, player).length > state.config.slotsPerTerritory) fail('territory slot capacity exceeded'); });
    });
    state.units.forEach(unit => {
      checkUid(unit.uid);
      const definition = card(unit);
      if (!definition || definition.type === 'order' || ![0, 1].includes(unit.owner) || !Number.isInteger(unit.territory) || unit.territory < 0 || unit.territory > 6) fail('invalid battlefield card');
      if (!Number.isInteger(unit.damage) || unit.damage < 0 || unit.damage >= definition.health || typeof unit.ready !== 'boolean') fail('dead or invalid battlefield card');
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

  return { VERSION:'frontlines-territory-v3-opening-compensation',withData:data => createEngine(data),hasTrait:trait,createGame,dispatch,card,presence,unitsAt,controlledCount,getActor,legalActions,validate,attackValue,debug,assertInvariants };
});
