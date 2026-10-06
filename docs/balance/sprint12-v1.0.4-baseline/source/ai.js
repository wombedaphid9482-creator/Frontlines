/* A small deterministic opponent. It scores only legal actions using public
 * battlefield information and the acting player's own hand. No deck order or
 * opposing card identity is inspected. UI pacing belongs to app.js.
 */
(function (root, factory) {
  'use strict';
  const node = typeof module === 'object' && module.exports;
  const api = factory(node ? require('./data.js') : root.FrontlinesData, node ? require('./engine.js') : root.FrontlinesEngine);
  root.FrontlinesAI = api;
  if (node) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createAI(D, E) {
  'use strict';
  const has = (unit, trait) => E.hasTrait ? E.hasTrait(unit,trait) : !!unit && !unit.suppressed && D.CARDS[unit.cardId].traits.includes(trait);
  const def = unit => D.CARDS[unit.cardId];
  const remaining = unit => def(unit).health - unit.damage;
  const arsenalMechanics = E.RULES?.arsenalMechanics === true;
  const balanceRecovery = E.RULES?.balanceRecovery === true;
  const salvageRecovery = E.RULES?.salvageRecovery === true;
  const tacticalArsenal = E.RULES?.tacticalArsenal === true;
  const tacticalKinds = new Set(['cover','dodge','suppression','exposed','blast','breach','smoke','interlockingFire','holdFast','assault','breakPosition','contingency','cleanExit','salvageBlast','sacrificeRepair','badPlan']);
  const statuses = (state,unit,kind) => (E.statusesFor?E.statusesFor(state,unit.uid):(state.effects||[]).filter(effect=>effect.targetUid===unit.uid)).filter(effect=>!kind||effect.kind===kind);
  const effectFor = (c,action) => E.resolveEffect ? E.resolveEffect(c,action) : c?.effect;
  const distance = (state, unit) => Math.abs(unit.territory - state.contested);
  const atFront = (state, owner) => state.units.filter(u => u.owner === owner && u.territory === state.contested);
  const totalP = units => units.reduce((n, u) => n + def(u).presence, 0);
  const pressure = (state,owner) => balanceRecovery && E.capturePressure ? E.capturePressure(state,owner).total : totalP(atFront(state,owner));
  const find = (state, uid) => state.units.find(u => u.uid === uid);
  const publicPosition = (state,units) => ({config:state.config,seed:state.seed,turn:state.turn,attacker:state.attacker,
    contested:state.contested,territories:state.territories,response:state.response,winner:state.winner,
    actionsLeft:state.actionsLeft,players:state.players,units,...(tacticalArsenal?{effects:state.effects||[],nextEffectId:state.nextEffectId}: {})});
  const value = (state, unit) => {
    if (!unit) return 0;
    const c = def(unit);
    return c.presence * 1.35 + c.attack * 0.65 + remaining(unit) * 0.3 +
      (has(unit, 'command') ? 2 : 0) + (has(unit, 'medic') ? 2 : 0) +
      (unit.territory === state.contested ? c.presence * 0.8 : 0);
  };
  function fortify(state, unit) {
    return (has(unit, 'fortify') && state.territories[unit.territory].owner === unit.owner ? 1 : 0)
      + (arsenalMechanics ? Math.max(has(unit,'armor') ? 1 : 0,unit.reinforced ? 1 : 0) : 0);
  }
  const incoming = (state,unit,amount,shield=0) => E.combatDamage ? E.combatDamage(state,unit,amount,shield) : Math.max(0,amount-shield-fortify(state,unit));

  // Expected public combat. Defensive orders are unknowable; ready Guards are
  // visible and are accounted for by attack scoring below.
  function combat(state, attacker, defender, effect) {
    if (!attacker || !defender) return { score: 0, attackerDies: false, defenderDies: false, toAttacker: 0, toDefender: 0 };
    if (effect && effect.kind === 'retreat') return { score: 0, attackerDies: false, defenderDies: false, toAttacker: 0, toDefender: 0 };
    if(tacticalArsenal&&E.previewCombat&&(!effect||effect.kind==='shield'||effect.kind==='ambush')){
      let position=find(state,attacker.uid)&&find(state,defender.uid)?state:publicPosition(state,state.units.filter(u=>u.uid!==attacker.uid&&u.uid!==defender.uid).concat(attacker,defender));
      const ambush=effect?.kind==='ambush'?effect.amount:0;
      if(ambush>=remaining(attacker))return {score:-value(state,attacker),attackerDies:true,defenderDies:false,toAttacker:ambush,toDefender:0};
      // Ambush wounds precede combat and do not consume direct-hit protection.
      // Replace the public unit itself: canonical forecasts resolve by UID.
      if(ambush>0)position=publicPosition(position,position.units.map(u=>u.uid===attacker.uid?{...u,damage:u.damage+ambush}:u));
      const forecast=E.previewCombat(position,attacker.uid,defender.uid,effect?.kind==='shield'?effect.amount:0),hits=forecast.affected||[];
      const a=hits.find(hit=>hit.uid===attacker.uid),d=hits.find(hit=>hit.uid===defender.uid);
      const toAttacker=ambush+(a?.damage||0),toDefender=d?.damage||0,attackerDies=a?.killed||false,defenderDies=d?.killed||false;
      return {score:(defenderDies?value(state,defender):Math.min(toDefender,remaining(defender))*1.1)-(attackerDies?value(state,attacker):Math.min(toAttacker,remaining(attacker))*.95),attackerDies,defenderDies,toAttacker,toDefender};
    }
    const ambush = effect && effect.kind === 'ambush' ? effect.amount : 0;
    const attackerDiesEarly = ambush >= remaining(attacker);
    const attackBonus = ambush > 0 && attacker.damage === 0 && has(attacker, 'berserk') ? 1 : 0;
    const toDefender = attackerDiesEarly ? 0 : incoming(state,defender,E.attackValue(state,attacker,defender)+attackBonus,effect && effect.kind === 'shield' ? effect.amount : 0);
    let toAttacker = ambush + (attackerDiesEarly ? 0 : incoming(state,attacker,E.attackValue(state,defender)));
    const defenderDies = toDefender >= remaining(defender);
    if (!attackerDiesEarly && !defenderDies && toAttacker < remaining(attacker) && has(defender,'retaliate')) toAttacker += 1;
    const attackerDies = toAttacker >= remaining(attacker);
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
    const enemyP = pressure(state,target.owner);
    if (target.territory === state.contested && result.defenderDies &&
        enemyProgress + enemyP >= state.config.captureThreshold) score += 8;
    if (result.attackerDies && attacker.territory === state.contested) {
      const ownP = pressure(state,attacker.owner);
      const ownProgress = state.territories[state.contested].progress[attacker.owner];
      const afterLoss = balanceRecovery ? pressure(publicPosition(state,state.units.filter(u=>u.uid!==attacker.uid)),attacker.owner) : ownP-def(attacker).presence;
      if (ownProgress + ownP >= state.config.captureThreshold &&
          ownProgress + afterLoss < state.config.captureThreshold) score -= 12;
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

  function commanderScore(state,action,actor) {
    const c=E.commanders?.get(state.players[actor].commander?.id),target=action.targetUid&&find(state,action.targetUid),cost=E.actionCost(state,action);
    if(!c)return {score:-100,reason:'No Commander is available'};
    let score=-4;
    const own=state.players[actor],front=atFront(state,actor),enemy=atFront(state,1-actor);
    const capture=state.territories[state.contested].progress[actor]+pressure(state,actor)>=state.config.captureThreshold;
    const followup=(u,position=state)=>E.legalActions(position).filter(a=>a.type==='attack'&&a.unitUid===u.uid).map(a=>attackScore(position,find(position,a.unitUid),find(position,a.targetUid)));
    const readyPosition=u=>({...state,units:state.units.map(x=>x.uid===u.uid?{...x,ready:true}:x)});
    switch(c.id){
      case 'commander_stonewall_warden':score=Math.min(3,target.damage)*2.3+ (target.territory===state.contested?2:0)-2;break;
      case 'commander_stonewall_marshal':{const pos=balanceRecovery?projectPublicAction(state,action,actor):readyPosition(target),scores=pos?followup(target,pos):[];const advance=balanceRecovery?pos&&E.legalActions(pos).some(a=>a.type==='move'&&a.unitUid===target.uid&&Math.abs(a.territory-state.contested)<distance(state,target)):Math.abs(target.territory-state.contested)===1;score=scores.length?Math.max(...scores)*.8:advance?2:-4;break;}
      case 'commander_bruiser_breaker':{const pos=balanceRecovery?projectPublicAction(state,action,actor):readyPosition(target);if(pos)find(pos,target.uid).commanderBreach=2;const scores=pos?followup(target,pos):[];score=scores.length?Math.max(...scores)*.8+1:-4;break;}
      case 'commander_bruiser_bloodhound':{const hit=tacticalArsenal&&E.previewAction?E.previewAction(state,action).affected.find(h=>h.uid===target.uid):null;score=tacticalArsenal?hit?.killed?value(state,target)+7:(hit?.damage||0)>0?Math.min(hit.damage,remaining(target))*1.8-2:-5:remaining(target)<=3?value(state,target)+7:Math.min(3,remaining(target))*1.8-2;break;}
      case 'commander_syndicate_coordinator':{const nearby=E.unitsAt(state,target.territory,actor).filter(u=>canAttack(state,u)),hit=tacticalArsenal&&E.previewAction?E.previewAction(state,action).affected.find(h=>h.uid===target.uid):null;if(tacticalArsenal&&hit?.killed)score=value(state,target)+5;else if(balanceRecovery&&(tacticalArsenal||remaining(target)>2)){const pos=projectPublicAction(state,action,actor),attacks=pos?E.legalActions(pos).filter(a=>a.type==='attack'&&a.targetUid===target.uid).map(a=>attackScore(pos,find(pos,a.unitUid),find(pos,a.targetUid))):[];const before=nearby.map(u=>attackScore(state,u,target));score=attacks.length?Math.max(...attacks)*.8-Math.max(0,...before)*.4:-4;}else score=remaining(target)<=2?value(state,target)+5:nearby.length&&state.actionsLeft>1?Math.min(8,nearby.length*2+2):-3;break;}
      case 'commander_syndicate_quartermaster':score=Math.min(4,own.spent)*1.6+(own.hand.length<=3?5:own.hand.length<=5?1:-5)-3;break;
      case 'commander_nightwalker_ghost':score=Math.min(3,target.damage)*2+(remaining(target)<=2?4:0)-2;if(target.territory===state.contested)score-=capture?12:3;break;
      case 'commander_nightwalker_saboteur':{const traits=enemy.reduce((n,u)=>n+(!u.suppressed?def(u).traits.length:0),0);score=state.actionsLeft>1&&front.some(u=>canAttack(state,u))?traits*1.4+Math.min(2,E.presence(state,1-actor).available)-2:-4;break;}
      case 'commander_rogue_scavenger':{const id=own.discard.findLast(id=>D.CARDS[id].type!=='order');score=id?(D.CARDS[id].presence>=5?6:own.hand.length<=2?4:-3):-100;break;}
      case 'commander_rogue_drifter':{const pos=balanceRecovery?projectPublicAction(state,action,actor):{...state,units:state.units.map(u=>u.uid===target.uid?{...u,territory:action.territory,ready:true}:u)},scores=pos?followup(target,pos):[];score=(Math.abs(target.territory-state.contested)-Math.abs(action.territory-state.contested))*2+(action.territory===state.contested?3:0)+(scores.length&&state.actionsLeft>1?Math.max(0,...scores)*.6:0)-2;break;}
    }
    if(tacticalArsenal&&['commander_nightwalker_ghost','commander_rogue_drifter'].includes(c.id))for(const hit of E.previewAction(state,action).affected||[])if(hit.uid===target.uid&&hit.damage>0)score-=hit.killed?value(state,target)+8:hit.damage*1.8;
    score-=cost.presence*.25;
    return {score,reason:`${c.name}: ${c.active.name}; use the once-per-match command for visible ${c.role.toLowerCase()} value`};
  }

  function commanderPreference(state,action,actor){
    if(!E.RULES?.commanders)return 0;
    const runtime=state.players[actor].commander,c=E.commanders?.get(runtime?.id);
    if(!c)return 0;
    const hand=action.handUid&&state.players[actor].hand.find(h=>h.uid===action.handUid),definition=hand&&def(hand);
    if(action.type==='deploy'&&definition)return Math.min(2,E.commanders.synergy(definition,c.id).score*.6);
    if(action.type==='move'&&c.id==='commander_rogue_drifter'&&runtime.passiveTurn!==state.turn)return action.territory===state.contested?1.5:0;
    if(action.type==='order'&&definition&&E.actionCost(state,action).commandActions<definition.commandCost)return 1;
    if(action.type==='endTurn'&&c.id==='commander_bruiser_breaker'&&atFront(state,actor).some(u=>has(u,'rush')||has(u,'mobile'))&&state.territories[state.contested].progress[actor]+totalP(atFront(state,actor))+2>=state.config.captureThreshold)return 1;
    return 0;
  }

  function scoreAction(state, action, actor, ownHand, legal) {
    if(action.type==='commander')return commanderScore(state,action,actor).score;
    if (state.response) return state.response.stage === 'counter'
      ? counterScore(state, action, ownHand) : responseScore(state, action, ownHand);
    const ownFront = atFront(state, actor);
    const enemyFront = atFront(state, 1 - actor);
    const ownP = pressure(state,actor);
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
      let score = 7 + c.presence * 0.75 + (c.health-(salvageRecovery?item.damage||0:0)) * 0.18 + c.attack * 0.3 - dist * 4;
      if (dist === 0) score += 8;
      if (dist === 1 && state.actionsLeft >= 2) score += 3;
      if (ownFront.length >= state.config.slotsPerTerritory && dist > 0) score -= 8;
      if (c.traits.includes('mobile')) score += 1.8;
      if (c.traits.includes('medic')) score += allied.filter(u => u.damage > 0).length;
      if (c.traits.includes('command')) score += allied.length * 0.5;
      if (c.traits.includes('rush') && localEnemies.length && hasFollowupCommand(state,action)) score += 3;
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
      const movedPressure=balanceRecovery?pressure(publicPosition(state,state.units.map(u=>u.uid===unit.uid?{...u,territory:action.territory}:u)),actor):ownP+c.presence;
      if (after === 0 && progress + movedPressure >= state.config.captureThreshold) score += 7;
      if (reachesCapture) score -= 14;
      if (after === 0 && enemyFront.length && remaining(unit) <= 2 && !has(unit, 'precision')) score -= 2;
      return score;
    }
    if (action.type === 'attack') return attackScore(state, find(state, action.unitUid), find(state, action.targetUid));
    if (action.type !== 'order') return -100;
    const item = ownHand.find(c => c.uid === action.handUid);
    const c = def(item);
    const target = action.targetUid && find(state, action.targetUid);
    const effect = effectFor(c,action);
    if (!effect) return -100;
    const cost = c.presence * 0.45 + 2;
    if (effect.kind === 'damage') {
      const lethal = effect.amount >= remaining(target);
      let score = (lethal ? value(state, target) + 3 : Math.min(remaining(target), effect.amount) * 1.2) - cost;
      if (!lethal && hasFollowupCommand(state,action)) {
        const finisher = state.units.some(u => u.owner === actor && u.territory === target.territory && u.ready &&
          def(u).type !== 'asset' && incoming(state,target,E.attackValue(state,u)) >= remaining(target)-effect.amount);
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
      const threatened = threats.some(u => incoming(state,target,E.attackValue(state,u)) >= remaining(target));
      return heal * 1.3 + (threatened ? 5 : 0) + (target.territory === state.contested ? 2 : 0) - cost;
    }
    if (effect.kind === 'rally') {
      if (!hasFollowupCommand(state,action)) return -5;
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
      if (!salvageRecovery && target.damage >= def(target).health * 0.6 && distance(state, target) > 0)
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
      const canFight = hasFollowupCommand(state,action) && attacks.length > 0;
      return canFight && enemyAvailable > 0 && enemyAvailable <= effect.amount + 2 ? 2.5 : -4;
    }
    if (effect.kind === 'sabotage') {
      const allies=E.unitsAt(state,target.territory,target.owner).filter(u=>u.uid!==target.uid);
      const attackers=E.unitsAt(state,target.territory,actor).filter(u=>canAttack(state,u));
      // Suppression ends before the enemy acts. Disabling Medic, Rush or Mobile
      // in isolation therefore has no value; an attack must use this window.
      if(!attackers.length||!hasFollowupCommand(state,action))return -5;
      const aura=has(target,'command')?allies.length*1.2:0;
      const guard=has(target,'guard')&&allies.length&&attackers.some(u=>!has(u,'precision'));
      const tactical=(guard?5:0)+(fortify(state,target)?3:0)+(has(target,'retaliate')?2:0);
      return aura+tactical-cost;
    }
    if (effect.kind === 'mark') {
      if (state.actionsLeft-actionCost(state,action).commandActions < 1) return -5;
      const attackers=E.unitsAt(state,target.territory,actor).filter(u=>canAttack(state,u));
      if (!attackers.length) return -5;
      const marked=publicPosition(state,state.units.map(u=>u.uid===target.uid?{...u,marked:1}:u));
      const gains=attackers.map(u=>attackScore(marked,find(marked,u.uid),find(marked,target.uid))-attackScore(state,u,target));
      return Math.max(...gains)*.85+Math.min(3,attackers.length)-cost;
    }
    if (effect.kind === 'reinforce') {
      const restored=Math.min(target.damage,effect.amount), threats=E.unitsAt(state,target.territory,1-actor);
      const protectedTarget={...target,damage:target.damage-restored,reinforced:1};
      const saves=threats.some(u=>incoming(state,target,E.attackValue(state,u))>=remaining(target)
        && incoming(state,protectedTarget,E.attackValue(state,u))<remaining(protectedTarget));
      const usefulArmor=fortify(state,protectedTarget)>fortify(state,target);
      return restored*1.3+(saves?7:usefulArmor&&threats.length?2:0)+(target.territory===state.contested?2:0)-cost;
    }
    return -100;
  }

  function baselineAction(state, suppliedLegal) {
    const legal = suppliedLegal || E.legalActions(state);
    if (!legal.length) return null;
    const actor = E.getActor(state);
    const ownHand = state.players[actor].hand;
    let best = legal.find(a => a.pass || a.type === 'endTurn') || legal[0];
    let bestScore = tacticalArsenal?tacticalScore(state,best,actor,ownHand,legal,scoreAction(state,best,actor,ownHand,legal)).score:scoreAction(state, best, actor, ownHand, legal);
    for (const action of legal) {
      const score = tacticalArsenal?tacticalScore(state,action,actor,ownHand,legal,scoreAction(state,action,actor,ownHand,legal)).score:scoreAction(state, action, actor, ownHand, legal);
      if (score > bestScore + 0.001) { best = action; bestScore = score; }
    }
    return best;
  }

  const VERSION=tacticalArsenal ? 'frontlines-ai-sprint11-v1' : balanceRecovery ? 'frontlines-ai-sprint10-v1' : E.RULES?.commanders ? 'frontlines-ai-sprint9-v1' : arsenalMechanics ? 'frontlines-ai-sprint7-v1' : 'frontlines-ai-sprint6-v1';
  const BASELINE_VERSION='frontlines-heuristic-sprint2-v1';
  const PROFILES=[
    {id:'baseline',name:tacticalArsenal?'Basic tactical policy':balanceRecovery?'Basic recovery policy':'Frozen basic heuristic',description:tacticalArsenal?'Public-board tactical protection, capped Blast, setup/payoff and explicit Sacrifice tradeoffs without concealed information.':balanceRecovery?'Basic public-board scores updated for capture pressure, retained wounds and Commander sequencing.':'Original Sprint 2 scores and tie-breaking unchanged.'},
    {id:'faction',name:'Faction-aware tactical policy',description:'Public-board tactical sequencing, response reserve, capture preservation and faction priorities.'},
    {id:'deck',name:'Deck-aware tactical policy',description:'Faction tactics plus declared own-deck archetype priorities; no hidden order or opponent hand inspection.'},
    {id:'random',name:'Seeded random legal policy',description:'Deterministic selection from legal actions; a diagnostic control rather than competitive AI.'}
  ];
  const DIFFICULTIES = [
    { id:'easy', name:'Easy — Learning', description:'Readable local decisions and occasional acceptable alternatives. Good for first matches.' },
    { id:'normal', name:'Normal — Standard', description:'Competent public-board tactics and basic combinations.' },
    { id:'hard', name:'Hard — Tactical', description:'Deck priorities, reaction reserves and bounded two-action sequencing.' },
    { id:'expert', name:'Expert — Command AI', description:'Deck-aware tactics with bounded three-action planning. Intended for experienced players.' },
    { id:'learning', name:'Learning AI', description:'Controlled local policy for the training mission; follows the same rules.', tutorial:true }
  ];
  const canAttack=(state,u)=>u.ready&&def(u).type!=='asset'&&(u.deployedTurn!==state.turn||has(u,'rush'));
  function hash(text) { let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return h>>>0; }
  function publicRandom(state,actor,ownHand) {
    // No RNG state, deck order, or opposing hand identity enters this key.
    return hash(JSON.stringify([state.seed,state.turn,state.actionsLeft,actor,state.contested,
      state.territories.map(t=>[t.owner,t.progress]),state.units.map(u=>[u.uid,u.cardId,u.owner,u.territory,u.damage,u.ready]),
      ownHand.map(c=>[c.uid,c.cardId]),state.response&&[state.response.stage,state.response.attackerUid,state.response.defenderUid,state.response.order&&state.response.order.cardId]]));
  }
  function reserveFor(state,actor,ownHand) {
    if(!atFront(state,actor).length||!atFront(state,1-actor).length)return 0;
    const responders=ownHand.map(def).filter(c=>c.type==='order'&&['response','counter'].includes(c.timing));
    return responders.length?Math.min(...responders.map(c=>c.presence)):0;
  }
  function factionScore(state,action,actor,ownHand,legal) {
    if(action.type==='commander')return commanderScore(state,action,actor);
    let score=scoreAction(state,action,actor,ownHand,legal);
    const f=state.players[actor].faction, front=atFront(state,actor), enemy=atFront(state,1-actor);
    const p=pressure(state,actor), progress=state.territories[state.contested].progress[actor], capture=progress+p>=state.config.captureThreshold;
    const enemyCapture=state.territories[state.contested].progress[1-actor]+pressure(state,1-actor)>=state.config.captureThreshold;
    const reasons=[];
    if(state.response) {
      if(action.pass)return {score,reason:'Pass: response cost does not improve the public exchange.'};
      const pending=state.response, attacker=find(state,pending.attackerUid), defender=find(state,pending.defenderUid);
      if(action.guardUid)reasons.push('Intercept preserves a more valuable ally');
      const item=ownHand.find(c=>c.uid===action.handUid), c=item&&def(item);
      if(c?.effect.kind==='ambush'&&attacker&&c.effect.amount>=remaining(attacker)){score+=7;reasons.push('Ambush removes the attacker before retaliation');}
      if(c?.effect.kind==='retreat'&&defender){
        const b=combat(state,attacker,defender);
        if(b.defenderDies&&(f==='rogue'||f==='nightwalker')){score+=4;reasons.push('Preserve a fragile unit through withdrawal');}
        if(front.length===1&&enemyCapture){score-=5;reasons.push('Withdrawal yields critical occupation');}
      }
      if(c?.effect.kind==='shield'&&defender&&has(defender,'fortify')){score+=1;reasons.push('Shield compounds positional protection');}
      if(action.type==='counter')reasons.push('Cancel a visible pending response when the trade improves');
      return {score,reason:reasons.join('; ')||'Response improves expected public combat after Presence cost'};
    }
    if(action.type==='endTurn')return {score:capture?2:0,reason:capture?'Capture is available; improve the occupation before ending when a better action remains':'No remaining positive legal tactical commitment'};
    if(action.type==='deploy') {
      const c=def(ownHand.find(h=>h.uid===action.handUid));
      const dist=Math.abs(action.territory-state.contested), allied=E.unitsAt(state,action.territory,actor);
      const remainingBudget=E.presence(state,actor).available-c.presence, reserve=reserveFor(state,actor,ownHand);
      if(reserve&&remainingBudget<reserve){score-=f==='nightwalker'?5:2;reasons.push('Commitment would consume the held reaction reserve');}
      if(f==='stonewall'){
        if(c.traits.includes('fortify')&&state.territories[action.territory].owner===actor){score+=2;reasons.push('Fortify on owned ground');}
        if(c.traits.includes('medic')){const wounds=allied.reduce((n,u)=>n+Math.min(u.damage,2),0);score+=wounds*1.3;reasons.push('Medic supports wounded occupation');}
      }
      if(c.traits.includes('command')){score+=allied.filter(u=>def(u).type!=='asset').length;reasons.push('Command coordinates allied attacks');}
      if(c.traits.includes('retaliate')&&E.unitsAt(state,action.territory,1-actor).length){score+=1.5;reasons.push('Surviving defenders punish nonlethal attacks with Retaliate');}
      if(c.traits.includes('scavenge')&&allied.length){score+=Math.min(2,allied.length*.6);reasons.push('Scavenge supports casualty recovery without stacking draws');}
      if(arsenalMechanics&&c.traits.includes('armor')&&dist<=1){score+=1.5;reasons.push('Armor protects a continuing occupation even on neutral ground');}
      if(c.traits.includes('mobile')&&dist===1&&state.actionsLeft>=2)reasons.push('Mobile preserves readiness after advancing');
      if(c.traits.includes('rush')&&hasFollowupCommand(state,action)){
        const item=ownHand.find(h=>h.uid===action.handUid);
        const fake={uid:'projection',cardId:c.id,owner:actor,territory:action.territory,damage:salvageRecovery?item.damage||0:0,ready:true,deployedTurn:state.turn,movedTurn:-1};
        const fights=E.unitsAt(state,action.territory,1-actor).map(u=>attackScore(state,fake,u));
        if(fights.length){score+=Math.max(0,...fights)*.35;reasons.push('Rush creates a same-turn attack opportunity');}
      }
      if(c.type==='asset'&&dist>0)reasons.push('Static support cannot follow a moving frontline');
      return {score,reason:reasons.join('; ')||'Deploy affordable Presence near the objective with sustainable combat value'};
    }
    if(action.type==='move') {
      const u=find(state,action.unitUid), arriving=action.territory===state.contested;
      if(arriving&&has(u,'mobile')&&canAttack(state,u)){
        const projected=publicPosition(state,state.units.map(x=>x.uid===u.uid?{...x,territory:action.territory}:x));
        const moved=find(projected,u.uid), fights=enemy.map(t=>attackScore(projected,moved,t));
        if(hasFollowupCommand(state,action)&&fights.length){score+=Math.max(0,...fights)*.4;reasons.push('Mobile advance preserves a follow-up attack');}
      }
      if(arriving&&remaining(u)<=2&&enemy.some(t=>E.attackValue(state,t)>=remaining(u))&&!enemyCapture){score-=3;reasons.push('Avoid exposing a wounded commitment without urgent defense');}
      if(balanceRecovery&&arriving&&!front.length&&!enemyCapture&&def(u).attack<=2&&['medic','command','guard'].some(trait=>has(u,trait))){
        const projected=projectPublicAction(state,action,actor),moved=projected&&find(projected,u.uid);
        const captures=projected&&progress+pressure(projected,actor)>=state.config.captureThreshold;
        const safeFight=moved&&E.legalActions(projected).some(a=>a.type==='attack'&&a.unitUid===u.uid&&combat(projected,moved,find(projected,a.targetUid)).defenderDies);
        const overwhelmed=moved&&enemy.some(t=>{const trade=combat(projected,find(projected,t.uid),moved);return trade.defenderDies&&!trade.attackerDies;});
        if(overwhelmed&&!captures&&!safeFight){score=-6;reasons.push('Keep unsupported support behind the line until a viable advance or capture window opens');}
      }
      return {score,reason:reasons.join('; ')||'Advance connected forces toward capture pressure'};
    }
    if(action.type==='attack') {
      const attacker=find(state,action.unitUid), target=find(state,action.targetUid), outcome=combat(state,attacker,target);
      if(has(attacker,'precision')&&state.units.some(u=>u.owner===target.owner&&u.territory===target.territory&&has(u,'guard')&&u.ready))reasons.push('Precision bypasses visible Guard coverage');
      if(has(target,'command')&&outcome.defenderDies){score+=E.unitsAt(state,target.territory,target.owner).filter(u=>u.uid!==target.uid).length*1.5;reasons.push('Remove an exposed command aura');}
      if(f==='nightwalker'&&outcome.attackerDies&&!outcome.defenderDies){score-=5;reasons.push('Reject a fragile nonlethal frontal trade');}
      if(f==='bruiser'&&outcome.defenderDies&&def(target).presence>=def(attacker).presence){score+=2;reasons.push('Break a valuable occupation unit');}
      if(target.suppressed||E.unitsAt(state,target.territory,target.owner).some(u=>u.suppressed&&def(u).traits.includes('command'))){score+=3;reasons.push('Use the active Sabotage window before the enemy turn restores abilities');}
      return {score,reason:reasons.join('; ')||'Choose favorable public trades while preserving capture Presence'};
    }
    if(action.type==='order') {
      const c=def(ownHand.find(h=>h.uid===action.handUid)), target=action.targetUid&&find(state,action.targetUid), cost=c.presence*.45+2;
      const effect=effectFor(c,action);
      if(effect.kind==='damage'&&target){
        if(effect.amount>=remaining(target))reasons.push('Remove a visible target without retaliation');
        else if(hasFollowupCommand(state,action)){
          const projected=publicPosition(state,state.units.map(u=>u.uid===target.uid?{...u,damage:u.damage+effect.amount}:u));
          const hurt=find(projected,target.uid);
          const guards=E.unitsAt(projected,target.territory,1-actor).filter(u=>u.uid!==target.uid&&u.ready&&has(u,'guard'));
          const finishers=E.unitsAt(projected,target.territory,actor).filter(u=>canAttack(projected,u)).map(u=>({u,fight:combat(projected,u,hurt),s:attackScore(projected,u,hurt)})).filter(x=>x.fight.defenderDies&&(has(x.u,'precision')||guards.every(g=>combat(projected,x.u,g).defenderDies)));
          if(finishers.length){score+=Math.min(6,Math.max(...finishers.map(x=>x.s))*.35+2);reasons.push('Damage Order sets up a legal same-turn lethal attack, subject to hidden reactions');}
        }
      }
      if(effect.kind==='rally'&&target&&hasFollowupCommand(state,action)){
        const ready=publicPosition(state,state.units.map(u=>u.uid===target.uid?{...u,ready:true}:u)), restored=find(ready,target.uid);
        const readyLegal=E.legalActions(ready),next=readyLegal.filter(a=>a.unitUid===target.uid&&(a.type==='move'||a.type==='attack'));
        if(next.length){const scores=next.map(a=>scoreAction(ready,a,actor,ownHand,readyLegal));score=Math.max(score,Math.max(...scores)*.8-cost);reasons.push('Rally restores a legal follow-up move or attack');}else{score=-6;reasons.push('Rally has no legal follow-up');}
      }
      if(effect.kind==='reclaim'&&target){
        const threatened=E.unitsAt(state,target.territory,1-actor).some(u=>incoming(state,target,E.attackValue(state,u))>=remaining(target));
        const recalled=balanceRecovery?publicPosition(state,state.units.filter(u=>u.uid!==target.uid)):null;
        const critical=target.territory===state.contested&&capture&&progress+(recalled?pressure(recalled,actor):p-def(target).presence)<state.config.captureThreshold;
        if(critical){score-=15;reasons.push('Do not recall the Presence completing capture');}
        else if(threatened&&target.damage>=2){score=Math.max(score,(salvageRecovery?remaining(target)*.5:target.damage*1.5)+def(target).presence*.45-cost+3);reasons.push(salvageRecovery?'Withdraw a threatened unit and release commitment; its wounds remain':'Recall a wounded threatened unit and release its commitment');}
      }
      if(effect.kind==='heal'&&target&&target.territory===state.contested){
        const threatened=enemy.some(u=>incoming(state,target,E.attackValue(state,u))>=remaining(target));
        if(threatened){score+=3+(capture?3:0);reasons.push('Healing protects occupation from a visible lethal threat');}
      }
      if(effect.kind==='disrupt'&&hasFollowupCommand(state,action)){
        const available=E.presence(state,1-actor).available, fights=legal.filter(a=>a.type==='attack').map(a=>attackScore(state,find(state,a.unitUid),find(state,a.targetUid)));
        if(available>0&&fights.some(s=>s>5)){score=Math.max(score,Math.min(available,effect.amount)*1.4+Math.min(12,Math.max(...fights))*.4-cost+(available<=effect.amount?10:2));reasons.push('Disruption limits affordable reactions before a favorable attack');}
      }
      if(effect.kind==='draw'){
        const alternatives=legal.filter(a=>a.type==='deploy'||a.type==='attack');
        if(state.actionsLeft>=2&&ownHand.length<=4&&!alternatives.length){score=Math.max(score,8-cost);reasons.push('Refill a depleted usable hand while an action remains to use it');}
        else reasons.push('Refill tactical options only when hand resources are scarce');
      }
      if(effect.kind==='sabotage'&&target){
        const suppressed=publicPosition(state,state.units.map(u=>u.uid===target.uid?{...u,suppressed:true}:u));
        const before=legal.filter(a=>a.type==='attack').map(a=>attackScore(state,find(state,a.unitUid),find(state,a.targetUid)));
        const after=legal.filter(a=>a.type==='attack').map(a=>attackScore(suppressed,find(suppressed,a.unitUid),find(suppressed,a.targetUid)));
        const gain=after.length?Math.max(...after)-Math.max(...before):0;
        const possible=hasFollowupCommand(state,action)&&E.unitsAt(state,target.territory,actor).some(u=>canAttack(state,u));
        if(possible&&gain>0){score=Math.max(score,gain*.75-cost);reasons.push('Sabotage creates a public follow-up attack window');}
        else{score=-5;reasons.push('Do not spend Sabotage without an improved legal same-turn attack');}
      }
      if(effect.kind==='mark')reasons.push(score>0?'Mark creates a same-turn combat opening before the enemy clears it':'Save Mark until a ready ally can exploit its short window');
      if(effect.kind==='reinforce')reasons.push('Reinforce repairs an ally and protects it through the enemy turn without stacking Armor');
      if(c.effect.kind==='adapt')reasons.push('Choose '+effect.label+' using the visible board rather than unknown draws');
      return {score,reason:reasons.join('; ')||'Use an Order when its tactical value exceeds temporary Presence and an action'};
    }
    return {score,reason:'Legal action evaluated by the frozen public-board heuristic'};
  }
  function deckScore(state,action,actor,ownHand,legal) {
    const result=factionScore(state,action,actor,ownHand,legal);
    const archetype=state.players[actor].deckMeta?.archetype;
    if(!archetype)return result;
    const parents=arsenalMechanics && D.ARCHETYPE_PARENTS?.[archetype];
    const intents=Array.isArray(parents) ? [...new Set(parents)] : tacticalArsenal&&typeof parents==='string' ? [parents] : [archetype];
    const supports=id=>intents.includes(id);
    const item=action.handUid&&ownHand.find(c=>c.uid===action.handUid),c=item&&def(item);
    const unit=action.unitUid&&find(state,action.unitUid),target=action.targetUid&&find(state,action.targetUid);
    let bonus=0,reason='';
    function prefer(amount,explanation){
      // A hybrid receives its strongest useful parent preference, never the
      // sum of both. A visible preservation warning still takes precedence.
      if(intents.length===1||amount<0&&(bonus>=0||amount<bonus)||amount>bonus&&bonus>=0){bonus=amount;reason=explanation;}
    }
    if(action.type==='deploy'&&c){
      const allies=E.unitsAt(state,action.territory,actor),dist=Math.abs(action.territory-state.contested);
      if(supports('bastion')&&dist<=1&&(c.traits.includes('guard')||c.traits.includes('retaliate')))prefer(2,'Bastion establishes a durable interception line');
      if(supports('counteroffensive')&&allies.some(u=>u.damage>0)&&c.traits.includes('medic'))prefer(2,'Counteroffensive recovers survivors before advancing');
      if(supports('shock-assault')&&c.traits.includes('rush')&&dist<=1)prefer(2,'Shock Assault deploys immediate pressure');
      if(supports('heavy-breakthrough')&&((c.presence>=7&&c.type!=='order')||(c.traits.includes('command')&&allies.some(u=>def(u).presence>=7))))prefer(1.5,'Heavy Breakthrough builds a supported expensive spearhead');
      if(supports('combined-arms')&&allies.length&&(c.traits.includes('command')||c.traits.includes('medic')||c.traits.includes('guard')))prefer(1.5,'Combined Arms adds a support role to the deployed formation');
      if(supports('scavenger')&&c.traits.includes('scavenge')&&allies.length&&!allies.some(u=>has(u,'scavenge')))prefer(2,'Scavenger places one recovery source behind allied casualties');
      if(supports('wildcard')&&c.traits.includes('mobile')&&dist===1)prefer(1,'Wildcard preserves positioning choices');
    }
    if(action.type==='attack'&&unit&&target){
      const outcome=combat(state,unit,target);
      if(supports('assassination')&&outcome.defenderDies&&(has(target,'command')||has(target,'medic')||def(target).presence>=7))prefer(2,'Assassination removes a valuable visible support or finisher');
      if(supports('precision-operations')&&outcome.defenderDies&&!outcome.attackerDies)prefer(1.5,'Precision Operations favors clean selective removal');
      if(supports('heavy-breakthrough')&&def(unit).presence>=7&&outcome.attackerDies&&!outcome.defenderDies)prefer(-4,'Heavy Breakthrough preserves its costly finisher from a failed attack');
      if(supports('scavenger')&&has(unit,'scavenge')&&outcome.attackerDies&&!outcome.defenderDies)prefer(-3,'Scavenger protects the recovery source');
    }
    if(action.type==='order'&&c){
      const effect=effectFor(c,action);
      if(supports('sabotage')&&effect.kind==='sabotage'&&result.score>0)prefer(2,'Sabotage opens a timed ability-disruption window');
      if(supports('assassination')&&effect.kind==='damage'&&target&&effect.amount>=remaining(target)&&(has(target,'command')||has(target,'medic')))prefer(2,'Assassination removes the visible support without retaliation');
      if(supports('counteroffensive')&&['heal','reinforce'].includes(effect.kind)&&target?.damage)prefer(1,'Counteroffensive preserves established defenders');
      if(supports('wildcard')&&(['rally','reclaim'].includes(effect.kind)||c.effect.kind==='adapt')&&result.score>0)prefer(1,'Wildcard restores a useful tactical option');
      if(arsenalMechanics&&effect.kind==='mark'&&(supports('precision-operations')||supports('assassination'))&&result.score>0)prefer(1,'Exploit a selective combat opening with the deck’s removal plan');
    }
    if(arsenalMechanics&&c&&result.score>0&&c.archetypes?.some(tag=>supports(tag))){bonus+=.5;reason=reason||'This card supports the declared own-deck strategy';}
    return {score:result.score+bonus,reason:reason?result.reason+'; '+reason:result.reason};
  }
  function profileId(options) {const id=options?.profile||'baseline';if(!PROFILES.some(p=>p.id===id))throw new Error('Unknown AI profile: '+id);return id;}
  function difficultyId(options) {
    if (options?.difficulty === undefined) return null;
    if (!DIFFICULTIES.some(d => d.id === options.difficulty)) throw new Error('Unknown AI difficulty: ' + options.difficulty);
    return options.difficulty;
  }
  function actionCost(state, action) {
    if (!action) return { presence:0, commandActions:0 };
    if (E.actionCost) return E.actionCost(state, action);
    const actor = E.getActor(state), item = state.players[actor].hand.find(h => h.uid === action.handUid);
    return { presence:item ? def(item).presence : 0,
      commandActions:['deploy','move','attack','order'].includes(action.type) ? 1 : 0 };
  }
  const hasFollowupCommand=(state,action)=>state.actionsLeft-(balanceRecovery?actionCost(state,action).commandActions:1)>0;

  // Easy and the training policy reason locally. They deliberately do not
  // search damage/rally/suppression sequences or infer concealed reactions.
  function localScore(state, action, actor, ownHand, learning) {
    if(action.type==='commander')return commanderScore(state,action,actor);
    if (state.response) return {
      score:state.response.stage === 'counter' ? counterScore(state,action,ownHand) : responseScore(state,action,ownHand),
      reason:'Resolve the visible combat using a useful affordable reaction'
    };
    if (action.type === 'endTurn') return { score:0, reason:'Finish the turn after useful local commitments' };
    const item = ownHand.find(h => h.uid === action.handUid), c = item && def(item);
    const front = atFront(state,actor), frontPressure = pressure(state,actor);
    if (action.type === 'deploy') {
      const dist = Math.abs(action.territory-state.contested), allied = E.unitsAt(state,action.territory,actor);
      let score = 10 + (c.health-(salvageRecovery?item.damage||0:0))*.2 + c.attack*.2 - c.presence*.45 - dist*4;
      if (!dist) score += 7;
      if (c.type === 'asset' && dist) score -= 8;
      if (c.traits.includes('medic') && allied.some(u => u.damage > 0)) score += 2;
      if (c.traits.includes('command') && !allied.length) score -= 2;
      if (c.presence >= 7 && (learning || state.players[actor].turns <= 2)) score -= 3;
      return { score, reason:'Establish affordable forces close to the contested territory' };
    }
    if (action.type === 'move') {
      const unit = find(state,action.unitUid), before = distance(state,unit), after = Math.abs(action.territory-state.contested);
      if (after >= before) return { score:-4, reason:'Moving away would give up useful frontline pressure' };
      const alreadyEnough = state.territories[state.contested].progress[actor]+frontPressure >= state.config.captureThreshold;
      return { score:alreadyEnough ? -1 : 12 + (after === 0 ? 4 : 0), reason:'Bring a ready unit toward the objective' };
    }
    if (action.type === 'attack') {
      const attacker = find(state,action.unitUid), target = find(state,action.targetUid), result = combat(state,attacker,target);
      let score = result.score + (result.defenderDies ? 5 : result.toDefender > 0 ? 3 : -4);
      if (result.attackerDies && !result.defenderDies) score -= 4;
      // Visible Guards can make an apparently clean trade unsafe.
      if (!has(attacker,'precision')) for (const guard of E.unitsAt(state,target.territory,target.owner)) {
        if (guard.uid !== target.uid && guard.ready && has(guard,'guard')) score = Math.min(score,combat(state,attacker,guard).score+2);
      }
      return { score, reason:result.defenderDies ? 'Remove an exposed defender in a straightforward exchange' : 'Apply useful local damage without a costly failed attack' };
    }
    if (action.type !== 'order' || !c) return { score:-100, reason:'No useful local action' };
    const target = action.targetUid && find(state,action.targetUid), cost = c.presence*.5;
    const effect=effectFor(c,action);
    if (effect.kind === 'damage') return {
      score:(effect.amount >= remaining(target) ? value(state,target)+3 : effect.amount*.9)-cost,
      reason:'Use direct damage against a visible defender'
    };
    if (['heal','reinforce'].includes(effect.kind)) return { score:Math.min(target.damage,effect.amount)*1.2+(effect.kind==='reinforce'&&E.unitsAt(state,target.territory,1-actor).length?2:0)-cost, reason:effect.kind==='reinforce'?'Repair and protect a visible ally':'Restore a wounded ally' };
    if (effect.kind === 'draw') return { score:ownHand.length <= 2 ? 5-cost : -2, reason:'Refill a small hand without predicting the cards drawn' };
    if (effect.kind === 'reclaim') return {
      score:salvageRecovery?E.unitsAt(state,target.territory,1-actor).some(u=>incoming(state,target,E.attackValue(state,u))>=remaining(target))?remaining(target)*.5+def(target).presence*.25-cost+2:-3:target.damage >= def(target).health*.6 && target.territory !== state.contested ? target.damage-cost : -3,
      reason:salvageRecovery?'Preserve a threatened unit without assuming its wounds are cleared':'Preserve a badly wounded rear unit'
    };
    return { score:-3, reason:'Keep complex tactical orders for a clear opportunity' };
  }

  function difficultyScore(state,action,actor,ownHand,legal,profile,difficulty) {
    let result;
    if (difficulty === 'easy' || difficulty === 'learning') result = localScore(state,action,actor,ownHand,difficulty === 'learning');
    else if (profile === 'baseline') result = {score:scoreAction(state,action,actor,ownHand,legal),reason:'Use the public battlefield to make a useful tactical commitment'};
    else if (difficulty === 'normal' || profile === 'faction') result = factionScore(state,action,actor,ownHand,legal);
    else result = deckScore(state,action,actor,ownHand,legal);
    if (tacticalArsenal) result=tacticalScore(state,action,actor,ownHand,legal,result.score,result.reason);
    if (state.response) return result;
    const cost = actionCost(state,action), commandsAfter = state.actionsLeft-cost.commandActions;
    // The old score family assumed every deployment consumed a command. Use
    // the printed economy here without changing omitted-difficulty diagnostics.
    if (action.type === 'deploy') {
      const c = def(ownHand.find(h => h.uid === action.handUid));
      const inContact = E.unitsAt(state,action.territory,1-actor).length > 0;
      if (c.traits.includes('rush') && inContact && commandsAfter > 0 && state.actionsLeft < 2) result = {...result,score:result.score+3};
      if (['hard','expert'].includes(difficulty) && cost.commandActions && commandsAfter === 0 && legal.some(a => a.type === 'attack')) result = {...result,score:result.score-3};
    }
    if (action.type === 'order' && cost.commandActions === 0 && ['hard','expert','normal'].includes(difficulty)) {
      const c = def(ownHand.find(h => h.uid === action.handUid));
      if (c.effect.kind === 'heal' && action.targetUid && find(state,action.targetUid).damage) result = {...result,score:result.score+.5};
    }
    return result;
  }

  // Tactical evaluations never dispatch a speculative game. The canonical
  // preview reads public board effects, printed cards and the acting hand.
  function tacticalScore(state,action,actor,ownHand,legal,baseScore=-100,baseReason='') {
    const fallback={score:baseScore,reason:baseReason||'Public-board tactical evaluation'};
    if(!tacticalArsenal||state.response)return fallback;
    const item=action.handUid&&ownHand.find(h=>h.uid===action.handUid),c=item&&def(item),source=action.unitUid&&find(state,action.unitUid);
    const effect=action.type==='ability'?def(source).tactical?.ability?.effect:c&&effectFor(c,action);
    const special=action.type==='overwatch'||action.type==='ability'||action.type==='order'&&effect&&tacticalKinds.has(effect.kind);
    const preview=E.previewAction?E.previewAction(state,action):{};
    const cost=actionCost(state,action),price=cost.presence*.55+(cost.commandActions?1.7:0);
    const enemyHere=territory=>E.unitsAt(state,territory,1-actor);
    const readyAllies=territory=>E.unitsAt(state,territory,actor).filter(u=>u.uid!==source?.uid&&canAttack(state,u));
    const target=action.targetUid&&find(state,action.targetUid);
    const targetTerritory=preview.targetTerritory??action.territory??target?.territory??source?.territory;
    function protection(u,kind){
      if(!u)return 0;
      const kinds=(Array.isArray(kind)?kind:[kind]).filter(k=>!statuses(state,u,k).length);if(!kinds.length)return 0;
      const threats=enemyHere(u.territory).filter(e=>def(e).type!=='asset'&&E.attackValue(state,e,u)>0);
      if(!threats.length)return u.territory===state.contested?2:-1;
      const defended={...publicPosition(state,state.units),effects:(state.effects||[]).concat(kinds.map(k=>({id:'ai-protection-'+k,kind:k,targetUid:u.uid,owner:u.owner,sourcePlayer:actor,amount:k==='cover'?2:1})))};
      let gain=0;
      for(const enemy of threats){const before=combat(state,enemy,u),after=combat(defended,enemy,u);gain=Math.max(gain,Math.max(0,before.toDefender-after.toDefender)*1.6+(before.defenderDies&&!after.defenderDies?value(state,u)*.7+4:0));}
      return gain+(has(u,'command')||has(u,'medic')?1.5:0);
    }
    function damageValue(){
      let score=0;
      for(const hit of preview.affected||[]){const u=find(state,hit.uid);if(!u||!hit.damage||hit.uid===action.sacrificeUid)continue;const amount=Math.min(Math.max(0,hit.damage),remaining(u));score+=(u.owner===actor?-1:1)*(hit.killed?value(state,u)+5:amount*1.6);}
      return score;
    }
    function setupValue(u){
      if(!u||state.actionsLeft-cost.commandActions<1)return -6;
      const attackers=readyAllies(u.territory);if(!attackers.length)return -6;
      const projected={...publicPosition(state,state.units.map(x=>x.uid===u.uid?{...x,marked:effect?.mark?1:x.marked}:x)),effects:(state.effects||[]).filter(e=>e.targetUid!==u.uid||!['cover','dodge'].includes(e.kind)).concat({id:'ai-exposed',kind:'exposed',targetUid:u.uid,owner:u.owner,sourcePlayer:actor,amount:1})};
      const gains=attackers.map(a=>attackScore(projected,find(projected,a.uid),find(projected,u.uid))-attackScore(state,a,u));
      return Math.max(0,...gains)*.85+(statuses(state,u,'cover').length||statuses(state,u,'dodge').length?2:0)-price;
    }
    if(action.type==='overwatch'){
      const enemies=state.units.filter(u=>u.owner!==actor&&def(u).type!=='asset'&&Math.abs(u.territory-source.territory)<=1);
      const entry=enemies.some(u=>u.territory!==source.territory&&remaining(u)<=2);
      const smoke=(state.effects||[]).some(e=>e.kind==='smoke'&&e.territory===source.territory);
      const attacks=legal.filter(a=>a.type==='attack'&&a.unitUid===source.uid).map(a=>attackScore(state,source,find(state,a.targetUid)));
      return {score:smoke?-8:Math.max(-2,4+(entry?5:0)+(source.territory===state.contested?2:0)-Math.max(0,...attacks)*.65-price),reason:smoke?'Smoke blocks this visible Overwatch threat':'Prepare one visible entry reaction instead of spending this unit’s attack'};
    }
    if(special){
      let score=-5,reason='Spend tactical resources only for a visible payoff';
      const protectedUnits=(preview.statusesApplied||preview.statusApplied||[]).filter(e=>['cover','dodge'].includes(e.kind)).map(e=>({u:find(state,e.targetUid),kind:e.kind}));
      if(['cover','dodge','interlockingFire','holdFast','contingency','badPlan','smoke'].includes(effect.kind)){
        const grouped=new Map();for(const e of protectedUnits)if(e.u){const entry=grouped.get(e.u.uid)||{u:e.u,kinds:[]};entry.kinds.push(e.kind);grouped.set(e.u.uid,entry);}
        score=[...grouped.values()].reduce((sum,e)=>sum+protection(e.u,e.kinds),0)-price;
        if(!protectedUnits.length&&target&&['cover','dodge'].includes(effect.kind))score=protection(target,effect.kind)-price;
        if(effect.kind==='smoke'){
          const watch=(state.effects||[]).filter(e=>e.kind==='overwatch'&&e.owner!==actor&&e.territory===targetTerritory).length;
          const existing=(state.effects||[]).some(e=>e.kind==='smoke'&&e.owner===actor&&e.territory===targetTerritory);
          if(!existing){const clouded={...publicPosition(state,state.units),effects:(state.effects||[]).concat({id:'ai-smoke',kind:'smoke',owner:actor,territory:targetTerritory,targetUid:null,sourcePlayer:actor,amount:1})};for(const ally of E.unitsAt(state,targetTerritory,actor)){let benefit=0;for(const enemy of enemyHere(targetTerritory)){const before=combat(state,enemy,ally),after=combat(clouded,enemy,ally);benefit=Math.max(benefit,Math.max(0,before.toDefender-after.toDefender)*1.5+(before.defenderDies&&!after.defenderDies?value(state,ally)*.6+3:0));}score+=benefit;}}
          score+=watch*4;reason='Local Smoke protects allies and answers visible prepared entry shots';
        }else reason='Protect a threatened valuable ally using temporary, answerable defense';
        if(effect.kind==='holdFast')score+=(targetTerritory===state.contested?3:0)+(E.unitsAt(state,targetTerritory,actor).reduce((sum,u)=>sum+Math.min(1,u.damage),0)*1.3);
        if(effect.kind==='contingency')score+=ownHand.length<=3?4:1;
      }else if(effect.kind==='heal'){
        const restored=Math.min(target?.damage||0,effect.amount||0);score=restored*1.6+(target&&enemyHere(target.territory).some(e=>combat(state,e,target).defenderDies)?5:0)-price;reason='Pay for real repair of a wounded occupation unit';
      }else if(['blast','salvageBlast','breach'].includes(effect.kind)){
        score=damageValue()-price;reason=effect.kind==='breach'?'Remove protection or a defensive Asset with a narrow Breach tool':'Exploit clustered enemy cards using capped, deterministic Blast targets';
      }else if(effect.kind==='exposed'){
        score=setupValue(target);reason=score>0?'Prepare Mark/Exposed for a ready ally’s paid follow-up':'Keep exposure setup until a legal follow-up can exploit it';
      }else if(effect.kind==='suppression'){
        const existing=target&&statuses(state,target,'suppression').length;
        score=existing?-4:Math.min(7,E.attackValue(state,target))*1.1+(has(target,'mobile')?2:0)+(enemyHere(target.territory).length&&E.unitsAt(state,target.territory,actor).length?2:0)-price;
        reason='Limit a high-threat enemy’s next attack and voluntary movement without disabling its traits';
      }else if(effect.kind==='assault'){
        if(target&&state.actionsLeft-cost.commandActions>0){const projected={...publicPosition(state,state.units),effects:(state.effects||[]).concat({id:'ai-assault',kind:'attackBoost',targetUid:target.uid,owner:actor,sourcePlayer:actor,amount:effect.amount})};const fights=enemyHere(target.territory);score=Math.max(-5,...fights.map(enemy=>attackScore(projected,target,enemy)-attackScore(state,target,enemy)))-price-(enemyHere(target.territory).length?1:0);}reason='Take the assault risk only when the extra attack creates a useful follow-up';
      }else if(effect.kind==='breakPosition'){
        const followup=readyAllies(targetTerritory);score=state.actionsLeft-cost.commandActions>0?(followup.length?4:0)+(preview.readies||[]).length*3+(state.effects||[]).filter(e=>e.kind==='cover'&&find(state,e.targetUid)?.owner!==actor&&find(state,e.targetUid)?.territory===targetTerritory).length*2-price:-5;reason='Convert a damaged fortified position into a real remaining-command follow-up';
      }else if(effect.kind==='cleanExit'){
        const threatened=target&&enemyHere(target.territory).some(e=>combat(state,e,target).defenderDies);score=threatened?value(state,target)*.8+3-price:-3;reason='Withdraw a threatened accomplished piece while retaining its wounds and attack lock';
      }else if(effect.kind==='sacrificeRepair'){
        const restored=Math.min(target?.damage||0,effect.amount||0),threatened=target&&enemyHere(target.territory).some(e=>combat(state,e,target).defenderDies);score=restored*2+(threatened?value(state,target)*.7+3:0)-price;reason='Trade a real lesser piece to preserve a more important damaged ally';
      }
      const sacrificed=action.sacrificeUid&&find(state,action.sacrificeUid);
      if(sacrificed){score-=value(state,sacrificed)*.8;reason+='; explicitly price the lost piece with no casualty-draw credit';}
      if(action.type==='ability'&&source){const fights=legal.filter(a=>a.type==='attack'&&a.unitUid===source.uid).map(a=>attackScore(state,source,find(state,a.targetUid)));score-=Math.max(0,...fights)*.3;}
      return {score,reason};
    }
    if(['move','deploy'].includes(action.type)){
      const risk=(preview.affected||[]).filter(hit=>hit.damage>0&&hit.owner===actor).reduce((sum,hit)=>{const u=find(state,hit.uid)||(item&&{...item,owner:actor,territory:action.territory,damage:item.damage||0});return sum+(hit.killed&&u?value(state,u)+8:hit.damage*2);},0);
      return risk?{score:baseScore-risk,reason:fallback.reason+'; Visible Overwatch entry damage makes this commitment costly'}:fallback;
    }
    if(action.type==='order'&&effect?.kind==='damage'){
      let score=damageValue()-price;const projected=state.actionsLeft-cost.commandActions>0?projectPublicAction(state,action,actor):null;
      if(projected&&target&&find(projected,target.uid)){const following=E.legalActions(projected).filter(a=>a.type==='attack'&&a.targetUid===target.uid);if(following.length){const after=Math.max(...following.map(a=>attackScore(projected,find(projected,a.unitUid),find(projected,target.uid)))),before=Math.max(0,...legal.filter(a=>a.type==='attack'&&a.targetUid===target.uid).map(a=>attackScore(state,find(state,a.unitUid),target)));if(after>before)score+=Math.min(7,(after-before)*.4);}}
      return {score,reason:'Resolve actual direct Order damage through visible Cover, Dodge, Exposed and Smoke; preserve a real follow-up command'};
    }
    if(action.type==='order'&&effect?.kind==='mark'&&target&&(statuses(state,target,'cover').length||statuses(state,target,'dodge').length))return {score:setupValue(target),reason:'Mark counters visible evasion only when a ready ally can exploit the opening'};
    return fallback;
  }

  // A bounded planning projection is intentionally separate from dispatch.
  // Dispatching a copied match could draw concealed cards or inspect the next
  // player's hand. These projections use only printed/public effects and the
  // acting hand. Draws, new turns and hidden response Orders are not predicted.
  function projectPublicAction(state, action, actor) {
    if (state.response || action.type === 'endTurn') return null;
    const cost = actionCost(state,action);
    const next = {config:state.config,seed:state.seed,turn:state.turn,attacker:state.attacker,contested:state.contested,
      territories:state.territories,response:null,winner:state.winner,actionsLeft:state.actionsLeft-cost.commandActions,
      ...(tacticalArsenal?{effects:(state.effects||[]).map(e=>({...e,expires:e.expires&&{...e.expires}})),nextEffectId:state.nextEffectId}:{}),
      units:state.units.map(u => ({...u})),
      players:state.players.map((p,i) => ({id:p.id,faction:p.faction,command:p.command,spent:p.spent,turns:p.turns,
        hand:i === actor ? p.hand.map(h => ({...h})) : [],deckMeta:i === actor ? p.deckMeta : undefined,
        ...(balanceRecovery?{commander:p.commander&&{...p.commander},discard:(p.discard||[]).slice(),deck:[]}: {})}))};
    const p = next.players[actor], unit = action.unitUid && find(next,action.unitUid);
    let forecastAction=action;
    const target = action.targetUid && find(next,action.targetUid);
    function removeCasualties() { next.units = next.units.filter(u => u.damage < def(u).health); }
    const tacticalEffect=action.type==='ability'?unit&&def(unit).tactical?.ability?.effect:action.type==='order'?effectFor(def(p.hand.find(h=>h.uid===action.handUid)),action):null;
    if(tacticalArsenal&&(action.type==='ability'||action.type==='overwatch'||action.type==='order'&&tacticalEffect&&tacticalKinds.has(tacticalEffect.kind))){
      if(tacticalEffect?.kind==='contingency')return null; // The new drawn card remains unknowable.
      if(action.handUid)p.hand=p.hand.filter(h=>h.uid!==action.handUid);
      p.spent+=cost.presence;
      if(unit){unit.ready=false;unit.abilityTurn=state.turn;}
      if(action.sacrificeUid)next.units=next.units.filter(u=>u.uid!==action.sacrificeUid);
    }else if (action.type === 'move') {
      const retainsReady = has(unit,'mobile') && unit.movedTurn !== state.turn;
      unit.territory = action.territory; unit.ready = !!retainsReady; unit.movedTurn = state.turn;
      if(balanceRecovery&&p.commander?.id==='commander_rogue_drifter')p.commander.passiveTurn=state.turn;
    } else if (action.type === 'attack') {
      let defender = target;
      if (!has(unit,'precision')) for (const guard of E.unitsAt(next,target.territory,target.owner)) {
        if (guard.uid !== target.uid && guard.ready && has(guard,'guard') && combat(next,unit,guard).score < combat(next,unit,defender).score) defender = guard;
      }
      const outcome = combat(next,unit,defender);
      if(tacticalArsenal&&defender.uid!==target.uid)forecastAction={...action,targetUid:defender.uid};
      unit.ready = false;
      if(tacticalArsenal)unit.attackedTurn=state.turn;
      if (defender.uid !== target.uid) defender.ready = false;
      unit.damage += outcome.toAttacker; defender.damage += outcome.toDefender;
      removeCasualties();
      if(balanceRecovery&&find(next,defender.uid)&&def(defender).type!=='asset'&&next.players[defender.owner].commander?.id==='commander_stonewall_marshal')defender.commanderCounter=1;
    } else if (action.type === 'deploy' || action.type === 'order') {
      const index = p.hand.findIndex(h => h.uid === action.handUid), item = p.hand[index], c = def(item);
      const effect=effectFor(c,action);
      if (action.type === 'order' && effect.kind === 'draw') return null;
      p.hand.splice(index,1);
      if (action.type === 'deploy') {
        const deployed={uid:item.uid,cardId:item.cardId,owner:actor,territory:action.territory,damage:salvageRecovery?item.damage||0:0,ready:true,deployedTurn:state.turn,movedTurn:-1};
        if(balanceRecovery&&p.commander?.id==='commander_nightwalker_ghost'&&p.commander.passiveTurn!==state.turn&&c.traits.includes('precision')){deployed.reinforced=1;p.commander.passiveTurn=state.turn;}
        next.units.push(deployed);
      }
      else {
        p.spent += balanceRecovery?cost.presence:c.presence;
        if(balanceRecovery&&p.commander?.id==='commander_syndicate_quartermaster'&&cost.commandActions<c.commandCost)p.commander.passiveTurn=state.turn;
        switch (effect.kind) {
          case 'damage': if(!tacticalArsenal){target.damage += effect.amount; removeCasualties();} break;
          case 'heal': target.damage = Math.max(0,target.damage-effect.amount); break;
          case 'reinforce': target.damage = Math.max(0,target.damage-effect.amount); target.reinforced=1; break;
          case 'mark': target.marked=1; break;
          case 'rally': target.ready = true; break;
          case 'sabotage': target.suppressed = true;if(balanceRecovery&&p.commander?.id==='commander_nightwalker_saboteur'&&p.commander.passiveTurn!==state.turn){p.commander.passiveTurn=state.turn;next.players[1-actor].spent+=Math.min(1,E.presence(next,1-actor).available);}break;
          case 'disrupt': next.players[1-actor].spent += Math.min(effect.amount,E.presence(next,1-actor).available); break;
          case 'reclaim': next.units = next.units.filter(u => u.uid !== target.uid); p.hand.push({uid:target.uid,cardId:target.cardId,...(salvageRecovery&&target.damage?{damage:target.damage}:{})}); break;
          default: return null;
        }
      }
    } else if(balanceRecovery&&action.type==='commander'){
      const c=E.commanders?.get(p.commander?.id);
      if(!c||['commander_syndicate_quartermaster','commander_rogue_scavenger'].includes(c.id))return null;
      p.commander.used=true;p.spent+=cost.presence;
      switch(c.id){
        case 'commander_stonewall_warden':target.damage=Math.max(0,target.damage-3);target.reinforced=1;break;
        case 'commander_stonewall_marshal':target.ready=true;target.commanderCounter=1;break;
        case 'commander_bruiser_breaker':target.ready=true;target.commanderBreach=2;break;
        case 'commander_bruiser_bloodhound':if(!tacticalArsenal){target.damage+=3;removeCasualties();}break;
        case 'commander_syndicate_coordinator':target.marked=1;if(!tacticalArsenal){target.damage+=2;removeCasualties();}break;
        case 'commander_nightwalker_ghost':target.territory=E.retreatDestination(state,target).to;target.ready=true;target.movedTurn=state.turn;target.damage=Math.max(0,target.damage-3);break;
        case 'commander_nightwalker_saboteur':for(const u of atFront(next,1-actor))u.suppressed=true;next.players[1-actor].spent+=Math.min(2,E.presence(next,1-actor).available);break;
        case 'commander_rogue_drifter':target.territory=action.territory;target.ready=true;target.movedTurn=state.turn;break;
        default:return null;
      }
    } else return null;
    if(tacticalArsenal&&E.previewAction){
      const preview=E.previewAction(state,forecastAction),removed=new Set([...(preview.statusesRemoved||[]),...(preview.statusesConsumed||[])].map(e=>typeof e==='object'?e.id:e));
      next.effects=next.effects.filter(e=>!removed.has(e.id));
      for(const effect of preview.statusesApplied||preview.statusApplied||[]){next.effects=next.effects.filter(e=>!(effect.targetUid&&e.targetUid===effect.targetUid&&e.kind===effect.kind||!effect.targetUid&&e.territory===effect.territory&&e.owner===effect.owner&&e.kind===effect.kind));next.effects.push({...effect,id:effect.id||'ai-'+effect.kind+'-'+(effect.targetUid||effect.territory)});}
      for(const hit of preview.affected||[]){const affected=find(next,hit.uid);if(affected){if(Number.isFinite(hit.healthAfter))affected.damage=Math.max(0,def(affected).health-hit.healthAfter);else affected.damage=Math.max(0,affected.damage+(hit.damage||0));}}
      for(const move of preview.moves||[]){const moved=find(next,move.uid||move.unitUid);if(moved){moved.territory=move.territory??move.to;moved.movedTurn=state.turn;if(typeof move.ready==='boolean')moved.ready=move.ready;}}
      for(const id of preview.marks||[]){const marked=find(next,typeof id==='object'?id.uid:id);if(marked)marked.marked=1;}
      for(const id of preview.readies||[]){const readied=find(next,typeof id==='object'?id.uid:id);if(readied)readied.ready=true;}
      for(const id of preview.exhausted||[]){const exhausted=find(next,typeof id==='object'?id.uid:id);if(exhausted)exhausted.ready=false;}
      removeCasualties();
    }
    return next;
  }

  function addPlanning(state,rows,actor,profile,difficulty) {
    if (state.response) return 0;
    const depth = difficulty === 'expert' ? 2 : 1, rootWidth = difficulty === 'expert' ? 7 : 5, branchWidth = difficulty === 'expert' ? 4 : 3;
    let projected = 0;
    function bestFollowUp(position,remainingDepth,reference) {
      const legal = E.legalActions(position), hand = position.players[actor].hand;
      const alternatives = legal.filter(a => a.type !== 'endTurn').map((action,index) => ({action,index,...difficultyScore(position,action,actor,hand,legal,profile,difficulty)}));
      alternatives.sort((a,b) => b.score-a.score || a.index-b.index);
      let gain = Math.max(0,(alternatives[0]?.score || 0)-reference);
      if (remainingDepth > 1) for (const row of alternatives.slice(0,branchWidth)) {
        if (row.score <= 0) continue;
        const next = projectPublicAction(position,row.action,actor); projected++;
        if (next) gain = Math.max(gain,Math.max(0,row.score-reference)+bestFollowUp(next,remainingDepth-1,row.score)*.5);
      }
      return gain;
    }
    const baseRows = rows.map(row => ({...row}));
    for (const row of rows.slice().sort((a,b) => b.score-a.score || a.index-b.index).filter(r => r.action.type !== 'endTurn' && r.score > 0).slice(0,rootWidth)) {
      const next = projectPublicAction(state,row.action,actor); projected++;
      if (!next) continue;
      const reference = baseRows.filter(r => r.index !== row.index && r.action.type !== 'endTurn').reduce((best,r) => Math.max(best,r.score),0);
      const gain = bestFollowUp(next,depth,reference);
      if (gain > 0) {
        row.score += Math.min(12,gain*.6);
        row.reason += '; Prepare a useful follow-up using visible units and remaining commands';
      }
    }
    return projected;
  }

  function humanExplanation(state,action) {
    if (!action) return 'No legal actions remain.';
    const actor = E.getActor(state), faction = D.FACTIONS[state.players[actor].faction].name;
    const item = action.handUid && state.players[actor].hand.find(h => h.uid === action.handUid), c = item && def(item);
    const unit = action.unitUid && find(state,action.unitUid), target = action.targetUid && find(state,action.targetUid);
    if (action.pass) return `${faction} lets the visible engagement resolve without spending more Capacity.`;
    if (action.guardUid) return `${faction} intercepts to protect the targeted ally.`;
    if (action.type === 'endTurn') {
      const frontPressure = pressure(state,actor), progress = state.territories[state.contested].progress[actor];
      return progress+frontPressure >= state.config.captureThreshold ? `${faction} ends the turn to secure ${state.territories[state.contested].name}.` : `${faction} ends the turn after its current commitments.`;
    }
    if (action.type === 'commander') {const c=E.commanders.get(state.players[actor].commander.id);return `${c.name} uses ${c.active.name}${target?' on '+def(target).name:''}. The command is spent for the rest of this match.`;}
    if (action.type === 'deploy') return `${faction} deploys ${c.name} ${action.territory === state.contested ? 'to reinforce the contested frontline' : 'to build support near the frontline'}.`;
    if (action.type === 'move') return `${faction} moves ${def(unit).name} toward the objective to increase territorial pressure.`;
    if (action.type === 'attack') return `${faction} attacks ${def(target).name} with ${def(unit).name} to weaken enemy resistance. Reactions can change the exchange.`;
    if (action.type === 'ability') return `${faction} uses ${def(unit).tactical.ability.name}${target?' on '+def(target).name:action.territory!==undefined?' in '+state.territories[action.territory].name:''}. The source exhausts and pays its printed tactical cost.`;
    if (action.type === 'overwatch') return `${faction} prepares ${def(unit).name} to react once to the first voluntary enemy entry here. Smoke can block the shot.`;
    if (action.type === 'counter') return `${faction} uses ${c.name} to cancel the visible response.`;
    if (action.type === 'respond') return `${faction} uses ${c.name} to improve the pending combat or preserve a threatened unit.`;
    const reasons = {damage:'remove or weaken a visible defender',heal:'restore a wounded ally',rally:'ready an exhausted unit for another command',draw:'refill its hand with new options',disrupt:'limit the enemy’s available Capacity',reclaim:'preserve a wounded force and release its commitment',sabotage:'disable visible abilities for a tactical opening',mark:'expose a visible defender to a follow-up combat attack',reinforce:'repair an ally and protect it through the enemy turn',cover:'prepare one direct-hit defense',dodge:'protect a valuable piece through one predictable hit',suppression:'limit a high-threat enemy’s attack and voluntary movement',exposed:'remove evasion and prepare a direct-hit payoff',blast:'damage a capped cluster of enemies',breach:'answer Cover or a defensive Asset',smoke:'create temporary local protection and block prepared entry shots',interlockingFire:'prepare a coordinated defensive position',holdFast:'convert surviving defenders into brief capture pressure',assault:'trade defensive protection for immediate attack pressure',breakPosition:'convert a damaged defended position into momentum',contingency:'protect established combined arms and replenish one option',cleanExit:'withdraw a threatened accomplished unit without healing its wounds',salvageBlast:'sacrifice a real friendly piece for a capped enemy Blast',sacrificeRepair:'sacrifice a lesser piece to repair a more important ally',badPlan:'sacrifice a wounded piece for temporary protection on a survivor'};
    const effect=effectFor(c,action);
    return `${faction} plays ${c.name}${c.effect.kind==='adapt'?' — '+effect.label:''} to ${reasons[effect.kind] || 'create a tactical opportunity'}.`;
  }
  function evaluate(state,options,ranked) {
    const profile=profileId(options), difficulty=difficultyId(options);
    const suppliedLegal=options?.legalActions||E.legalActions(state), legal=difficulty?suppliedLegal.filter(a => E.validate(state,a) === null):suppliedLegal;
    if(!legal.length)return {action:null,score:null,reason:'No legal actions',evaluated:0,rankedTop:[],rankedtop:[],difficulty,
      explanation:'No legal actions remain.',cost:{presence:0,commandActions:0},costExplanation:'0 Capacity · 0 Command Actions',planning:{depth:0,projected:0}};
    const actor=E.getActor(state), ownHand=state.players[actor].hand;
    let rows,chosen,projected=0;
    if(profile==='random'){
      const index=publicRandom(state,actor,ownHand)%legal.length;
      rows=legal.map((action,i)=>({action,score:i===index?1:0,reason:'Seeded selection among legal public actions',index:i}));chosen=rows[index];
    }else{
      rows=legal.map((action,index)=>({action,index,...(difficulty?difficultyScore(state,action,actor,ownHand,legal,profile,difficulty):profile==='baseline'?{score:scoreAction(state,action,actor,ownHand,legal),reason:tacticalArsenal?'Basic public-board heuristic using Tactical Arsenal rules':balanceRecovery?'Basic public-board heuristic using balance-recovery rules':'Frozen Sprint 2 public-board heuristic'}:profile==='deck'?deckScore(state,action,actor,ownHand,legal):factionScore(state,action,actor,ownHand,legal))}));
      if(tacticalArsenal&&!difficulty)for(const row of rows){const result=tacticalScore(state,row.action,actor,ownHand,legal,row.score,row.reason);row.score=result.score;row.reason=result.reason;}
      if (E.RULES?.commanders) for (const row of rows) {const bonus=commanderPreference(state,row.action,actor);row.score+=bonus;if(bonus)row.reason+='; Commander passive supports this visible sequence';}
      if (difficulty === 'hard' || difficulty === 'expert') projected=addPlanning(state,rows,actor,profile,difficulty);
      const initial=legal.find(a=>a.pass||a.type==='endTurn')||legal[0];chosen=rows.find(r=>r.action===initial);
      for(const row of rows)if(row.score>chosen.score+.001)chosen=row;
      // Acceptable alternatives remain positive and close in value. Variation
      // is seeded solely from public information, rather than hidden draws.
      if (difficulty === 'easy' && !state.response && chosen.action.type !== 'endTurn') {
        const acceptable = rows.filter(r => r.action.type !== 'endTurn' && r.score > 0 && r.score >= chosen.score-2.5).sort((a,b) => b.score-a.score || a.index-b.index).slice(0,3);
        const key = publicRandom(state,actor,ownHand);
        if (acceptable.length > 1 && key%4 === 0) chosen = acceptable[key%acceptable.length];
      }
    }
    const rankedTop=ranked?rows.slice().sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,5).map(({action,score,reason})=>({action,score,reason})):[];
    const alternative=rows.filter(row=>row!==chosen).reduce((best,row)=>Math.max(best,row.score),-Infinity);
    const priorityMargin=Number.isFinite(alternative)?chosen.score-alternative:0;
    if(typeof options?.onDecision==='function')options.onDecision({profile,score:chosen.score,reason:chosen.reason,evaluated:legal.length,priorityMargin,...(difficulty?{difficulty}: {})});
    const cost = actionCost(state,chosen.action);
    return {action:chosen.action,score:chosen.score,reason:chosen.reason,evaluated:legal.length,priorityMargin,rankedTop,rankedtop:rankedTop,
      difficulty,explanation:humanExplanation(state,chosen.action),cost,planning:{depth:projected ? difficulty === 'expert' ? 3 : 2 : 0,projected},
      costExplanation:`${cost.presence} Capacity · ${cost.commandActions} Command Action${cost.commandActions === 1 ? '' : 's'}`};
  }
  function explainAction(state,options){return evaluate(state,options,true);}
  function chooseAction(state,options) {return profileId(options)==='baseline'&&!difficultyId(options)?baselineAction(state,options?.legalActions):evaluate(state,options,false).action;}
  return {VERSION,BASELINE_VERSION,chooseAction,explainAction,getProfiles:()=>PROFILES.map(p=>({...p})),getDifficulties:()=>DIFFICULTIES.map(d=>({...d})),forRules:(data,engine)=>createAI(data,engine)};
});
