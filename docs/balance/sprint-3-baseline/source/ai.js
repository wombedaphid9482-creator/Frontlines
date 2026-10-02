/* A small deterministic opponent. It scores only legal actions using public
 * battlefield information and the acting player's own hand. No deck order or
 * opposing card identity is inspected. UI pacing belongs to app.js.
 */
(function (root) {
  'use strict';
  const E = typeof module !== 'undefined' && module.exports ? require('./engine.js') : root.FrontlinesEngine;
  const D = typeof module !== 'undefined' && module.exports ? require('./data.js') : root.FrontlinesData;
  const has = (unit, trait) => !!unit && D.CARDS[unit.cardId].traits.includes(trait);
  const def = unit => D.CARDS[unit.cardId];
  const remaining = unit => def(unit).health - unit.damage;
  const distance = (state, unit) => Math.abs(unit.territory - state.contested);
  const atFront = (state, owner) => state.units.filter(u => u.owner === owner && u.territory === state.contested);
  const totalP = units => units.reduce((n, u) => n + def(u).presence, 0);
  const find = (state, uid) => state.units.find(u => u.uid === uid);
  const value = (state, unit) => {
    if (!unit) return 0;
    const c = def(unit);
    return c.presence * 1.35 + c.attack * 0.65 + remaining(unit) * 0.3 +
      (has(unit, 'command') ? 2 : 0) + (has(unit, 'medic') ? 2 : 0) +
      (unit.territory === state.contested ? c.presence * 0.8 : 0);
  };
  function fortify(state, unit) {
    return has(unit, 'fortify') && state.territories[unit.territory].owner === unit.owner ? 1 : 0;
  }

  // Expected public combat. Defensive orders are unknowable; ready Guards are
  // visible and are accounted for by attack scoring below.
  function combat(state, attacker, defender, effect) {
    if (!attacker || !defender) return { score: 0, attackerDies: false, defenderDies: false, toAttacker: 0, toDefender: 0 };
    if (effect && effect.kind === 'retreat') return { score: 0, attackerDies: false, defenderDies: false, toAttacker: 0, toDefender: 0 };
    const ambush = effect && effect.kind === 'ambush' ? effect.amount : 0;
    const attackerDiesEarly = ambush >= remaining(attacker);
    const attackBonus = ambush > 0 && attacker.damage === 0 && has(attacker, 'berserk') ? 1 : 0;
    const toDefender = attackerDiesEarly ? 0 : Math.max(0, E.attackValue(state, attacker) + attackBonus - fortify(state, defender) -
      (effect && effect.kind === 'shield' ? effect.amount : 0));
    const toAttacker = ambush + (attackerDiesEarly ? 0 : Math.max(0, E.attackValue(state, defender) - fortify(state, attacker)));
    const attackerDies = toAttacker >= remaining(attacker);
    const defenderDies = toDefender >= remaining(defender);
    const gain = defenderDies ? value(state, defender) : Math.min(toDefender, remaining(defender)) * 1.1;
    const loss = attackerDies ? value(state, attacker) : Math.min(toAttacker, remaining(attacker)) * 0.95;
    return { score: gain - loss, attackerDies, defenderDies, toAttacker, toDefender };
  }

  function attackScore(state, attacker, target) {
    let result = combat(state, attacker, target);
    let score = result.score;
    if (!has(attacker, 'precision')) {
      const guards = state.units.filter(u => u.owner === target.owner && u.territory === target.territory &&
        u.uid !== target.uid && u.ready && has(u, 'guard'));
      guards.forEach(guard => { score = Math.min(score, combat(state, attacker, guard).score + 1.5); });
    }
    // Exchanging cheap specialists for an occupation unit is valuable even if
    // both die; killing a unit about to complete a capture is especially useful.
    const enemyProgress = state.territories[state.contested].progress[target.owner];
    const enemyP = totalP(atFront(state, target.owner));
    if (target.territory === state.contested && result.defenderDies &&
        enemyProgress + enemyP >= state.config.captureThreshold) score += 8;
    if (result.attackerDies && attacker.territory === state.contested) {
      const ownP = totalP(atFront(state, attacker.owner));
      const ownProgress = state.territories[state.contested].progress[attacker.owner];
      if (ownProgress + ownP >= state.config.captureThreshold &&
          ownProgress + ownP - def(attacker).presence < state.config.captureThreshold) score -= 12;
    }
    // A nonlethal exchange also sets up follow-up attacks. Without this modest
    // tempo value, equally strong armies refuse all fair fights and simply
    // bounce the objective between occupied zones forever.
    return score + (result.defenderDies ? 6 : result.attackerDies ? -2 : result.toDefender > 0 ? 6 : -3);
  }

  function responseScore(state, action, ownHand) {
    const response = state.response;
    const attacker = find(state, response.attackerUid);
    const defender = find(state, response.defenderUid);
    if (!attacker || !defender || action.pass) return 0;
    const baseline = combat(state, attacker, defender);
    if (action.guardUid) {
      const guard = find(state, action.guardUid);
      const after = combat(state, attacker, guard);
      let score = baseline.score - after.score - 1;
      if (baseline.defenderDies && !after.defenderDies) score += 3;
      if (guard && guard.territory === state.contested && guard.ready) score -= 0.75;
      return score;
    }
    const handCard = ownHand.find(c => c.uid === action.handUid);
    if (!handCard) return -100;
    const c = def(handCard);
    const after = combat(state, attacker, defender, c.effect);
    let score = baseline.score - after.score - c.presence * 0.75 - 1.5;
    if (baseline.defenderDies && !after.defenderDies) score += 3;
    if (c.effect.kind === 'retreat') {
      // Giving up occupation strength should only happen to preserve a unit
      // that is about to die, or to deny an overwhelmingly bad exchange.
      score -= defender.territory === state.contested ? def(defender).presence * 0.5 : 0;
      if (!baseline.defenderDies) score -= 5;
    }
    return score;
  }

  function counterScore(state, action, ownHand) {
    if (action.pass) return 0;
    const response = state.response;
    const attacker = find(state, response.attackerUid);
    const defender = find(state, response.defenderUid);
    const own = ownHand.find(c => c.uid === action.handUid);
    const pending = response.order && D.CARDS[response.order.cardId];
    if (!own || !pending || !attacker || !defender) return -1;
    const canceled = combat(state, attacker, defender);
    const resolved = combat(state, attacker, defender, pending.effect);
    return canceled.score - resolved.score - def(own).presence * 0.7 - 1.5;
  }

  function scoreAction(state, action, actor, ownHand, legal) {
    if (state.response) return state.response.stage === 'counter'
      ? counterScore(state, action, ownHand) : responseScore(state, action, ownHand);
    const ownFront = atFront(state, actor);
    const enemyFront = atFront(state, 1 - actor);
    const ownP = totalP(ownFront);
    const progress = state.territories[state.contested].progress[actor];
    const reachesCapture = progress + ownP >= state.config.captureThreshold;
    if (action.type === 'endTurn') return reachesCapture ? 2 : 0;

    if (action.type === 'deploy') {
      const item = ownHand.find(c => c.uid === action.handUid);
      const c = def(item);
      const dist = Math.abs(action.territory - state.contested);
      const allied = E.unitsAt(state, action.territory, actor);
      const localEnemies = E.unitsAt(state, action.territory, 1 - actor);
      if (c.type === 'asset') {
        if (dist > 0) return -8 - dist * 2;
        return 7 + c.presence * 0.8 + allied.length * 1.2 -
          (reachesCapture ? 8 : 0) - (allied.length >= state.config.slotsPerTerritory - 1 ? 4 : 0);
      }
      let score = 7 + c.presence * 0.75 + c.health * 0.18 + c.attack * 0.3 - dist * 4;
      if (dist === 0) score += 8;
      if (dist === 1 && state.actionsLeft >= 2) score += 3;
      if (ownFront.length >= state.config.slotsPerTerritory && dist > 0) score -= 8;
      if (c.traits.includes('mobile')) score += 1.8;
      if (c.traits.includes('medic')) score += allied.filter(u => u.damage > 0).length;
      if (c.traits.includes('command')) score += allied.length * 0.5;
      if (c.traits.includes('rush') && localEnemies.length && state.actionsLeft >= 2) score += 3;
      if (allied.length >= state.config.slotsPerTerritory - 1) score -= 1.5;
      if (reachesCapture && dist > 0) score -= 6;
      return score;
    }
    if (action.type === 'move') {
      const unit = find(state, action.unitUid);
      const c = def(unit);
      const before = distance(state, unit);
      const after = Math.abs(action.territory - state.contested);
      if (after >= before) return -7;
      let score = 10 + (before - after) * 3 + c.presence * 0.75;
      if (after === 0) score += 4 + (has(unit, 'mobile') ? 2 : 0);
      if (before > 1 && after > 0) score -= after * 2;
      if (after === 0 && progress + ownP + c.presence >= state.config.captureThreshold) score += 7;
      if (reachesCapture) score -= 14;
      if (after === 0 && enemyFront.length && remaining(unit) <= 2 && !has(unit, 'precision')) score -= 2;
      return score;
    }
    if (action.type === 'attack') return attackScore(state, find(state, action.unitUid), find(state, action.targetUid));
    if (action.type !== 'order') return -100;
    const item = ownHand.find(c => c.uid === action.handUid);
    const c = def(item);
    const target = action.targetUid && find(state, action.targetUid);
    const effect = c.effect;
    const cost = c.presence * 0.45 + 2;
    if (effect.kind === 'damage') {
      const lethal = effect.amount >= remaining(target);
      let score = (lethal ? value(state, target) + 3 : Math.min(remaining(target), effect.amount) * 1.2) - cost;
      if (!lethal && state.actionsLeft > 1) {
        const finisher = state.units.some(u => u.owner === actor && u.territory === target.territory && u.ready &&
          def(u).type !== 'asset' && E.attackValue(state, u) >= remaining(target) - effect.amount + fortify(state, target));
        if (finisher) score += 3;
      }
      if (target.territory === state.contested && lethal &&
          state.territories[state.contested].progress[1 - actor] + totalP(enemyFront) >= state.config.captureThreshold) score += 8;
      return score;
    }
    if (effect.kind === 'heal') {
      const heal = Math.min(target.damage, effect.amount);
      if (!heal) return -5;
      const threats = E.unitsAt(state, target.territory, 1 - actor);
      const threatened = threats.some(u => E.attackValue(state, u) - fortify(state, target) >= remaining(target));
      return heal * 1.3 + (threatened ? 5 : 0) + (target.territory === state.contested ? 2 : 0) - cost;
    }
    if (effect.kind === 'rally') {
      if (state.actionsLeft < 2) return -5;
      // Rally is useful only if there is time to use the restored readiness.
      const attacks = E.unitsAt(state, target.territory, 1 - actor)
        .map(enemy => attackScore(state, target, enemy));
      const canAttack = target.deployedTurn !== state.turn || has(target, 'rush');
      const bestFight = canAttack && attacks.length ? Math.max(...attacks) * 0.7 : -5;
      const canAdvance = distance(state, target) > 0 && ownFront.length < state.config.slotsPerTerritory;
      const move = canAdvance ? 7 + def(target).presence * 0.5 : -5;
      return Math.max(bestFight, move) - cost;
    }
    if (effect.kind === 'reclaim') {
      if (target.damage >= def(target).health * 0.6 && distance(state, target) > 0)
        return target.damage + def(target).presence * 0.4 - cost;
      if (def(target).type === 'asset' && distance(state, target) > 0)
        return 5 + def(target).presence * 0.5 - cost;
      return -4;
    }
    if (effect.kind === 'draw') {
      if (ownHand.length >= 7) return -1;
      const deployment = legal.some(a => a.type === 'deploy');
      return (ownHand.length <= 2 ? 9 : 4) + (!deployment ? 2 : 0) - cost;
    }
    if (effect.kind === 'disrupt') {
      const enemyAvailable = E.presence(state, 1 - actor).available;
      const attacks = legal.filter(a => a.type === 'attack');
      const canFight = state.actionsLeft > 1 && attacks.length > 0;
      return canFight && enemyAvailable > 0 && enemyAvailable <= effect.amount + 2 ? 2.5 : -4;
    }
    return -100;
  }

  function chooseAction(state) {
    const legal = E.legalActions(state);
    if (!legal.length) return null;
    const actor = E.getActor(state);
    const ownHand = state.players[actor].hand;
    let best = legal.find(a => a.pass || a.type === 'endTurn') || legal[0];
    let bestScore = scoreAction(state, best, actor, ownHand, legal);
    for (const action of legal) {
      const score = scoreAction(state, action, actor, ownHand, legal);
      if (score > bestScore + 0.001) { best = action; bestScore = score; }
    }
    return best;
  }
  const api = { chooseAction };
  root.FrontlinesAI = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
