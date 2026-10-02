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
    let toAttacker = ambush + (attackerDiesEarly ? 0 : Math.max(0, E.attackValue(state, defender) - fortify(state, attacker)));
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
    if (effect.kind === 'sabotage') {
      const allies=E.unitsAt(state,target.territory,target.owner).filter(u=>u.uid!==target.uid);
      const attackers=E.unitsAt(state,target.territory,actor).filter(u=>canAttack(state,u));
      // Suppression ends before the enemy acts. Disabling Medic, Rush or Mobile
      // in isolation therefore has no value; an attack must use this window.
      if(!attackers.length||state.actionsLeft<2)return -5;
      const aura=has(target,'command')?allies.length*1.2:0;
      const guard=has(target,'guard')&&allies.length&&attackers.some(u=>!has(u,'precision'));
      const tactical=(guard?5:0)+(fortify(state,target)?3:0)+(has(target,'retaliate')?2:0);
      return aura+tactical-cost;
    }
    return -100;
  }

  function baselineAction(state, suppliedLegal) {
    const legal = suppliedLegal || E.legalActions(state);
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

  const VERSION='frontlines-ai-sprint4-v2';
  const BASELINE_VERSION='frontlines-heuristic-sprint2-v1';
  const PROFILES=[
    {id:'baseline',name:'Frozen basic heuristic',description:'Original Sprint 2 scores and tie-breaking unchanged.'},
    {id:'faction',name:'Faction-aware tactical policy',description:'Public-board tactical sequencing, response reserve, capture preservation and faction priorities.'},
    {id:'deck',name:'Deck-aware tactical policy',description:'Faction tactics plus declared own-deck archetype priorities; no hidden order or opponent hand inspection.'},
    {id:'random',name:'Seeded random legal policy',description:'Deterministic selection from legal actions; a diagnostic control rather than competitive AI.'}
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
    let score=scoreAction(state,action,actor,ownHand,legal);
    const f=state.players[actor].faction, front=atFront(state,actor), enemy=atFront(state,1-actor);
    const p=totalP(front), progress=state.territories[state.contested].progress[actor], capture=progress+p>=state.config.captureThreshold;
    const enemyCapture=state.territories[state.contested].progress[1-actor]+totalP(enemy)>=state.config.captureThreshold;
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
      if(c.traits.includes('mobile')&&dist===1&&state.actionsLeft>=2)reasons.push('Mobile preserves readiness after advancing');
      if(c.traits.includes('rush')&&state.actionsLeft>=2){
        const fake={uid:'projection',cardId:c.id,owner:actor,territory:action.territory,damage:0,ready:true,deployedTurn:state.turn,movedTurn:-1};
        const fights=E.unitsAt(state,action.territory,1-actor).map(u=>attackScore(state,fake,u));
        if(fights.length){score+=Math.max(0,...fights)*.35;reasons.push('Rush creates a same-turn attack opportunity');}
      }
      if(c.type==='asset'&&dist>0)reasons.push('Static support cannot follow a moving frontline');
      return {score,reason:reasons.join('; ')||'Deploy affordable Presence near the objective with sustainable combat value'};
    }
    if(action.type==='move') {
      const u=find(state,action.unitUid), arriving=action.territory===state.contested;
      if(arriving&&has(u,'mobile')&&canAttack(state,u)){
        const projected={...state,units:state.units.map(x=>x.uid===u.uid?{...x,territory:action.territory}:x)};
        const moved=find(projected,u.uid), fights=enemy.map(t=>attackScore(projected,moved,t));
        if(state.actionsLeft>=2&&fights.length){score+=Math.max(0,...fights)*.4;reasons.push('Mobile advance preserves a follow-up attack');}
      }
      if(arriving&&remaining(u)<=2&&enemy.some(t=>E.attackValue(state,t)>=remaining(u))&&!enemyCapture){score-=3;reasons.push('Avoid exposing a wounded commitment without urgent defense');}
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
      if(c.effect.kind==='damage'&&target){
        if(c.effect.amount>=remaining(target))reasons.push('Remove a visible target without retaliation');
        else if(state.actionsLeft>=2){
          const projected={...state,units:state.units.map(u=>u.uid===target.uid?{...u,damage:u.damage+c.effect.amount}:u)};
          const hurt=find(projected,target.uid);
          const guards=E.unitsAt(projected,target.territory,1-actor).filter(u=>u.uid!==target.uid&&u.ready&&has(u,'guard'));
          const finishers=E.unitsAt(projected,target.territory,actor).filter(u=>canAttack(projected,u)).map(u=>({u,fight:combat(projected,u,hurt),s:attackScore(projected,u,hurt)})).filter(x=>x.fight.defenderDies&&(has(x.u,'precision')||guards.every(g=>combat(projected,x.u,g).defenderDies)));
          if(finishers.length){score+=Math.min(6,Math.max(...finishers.map(x=>x.s))*.35+2);reasons.push('Damage Order sets up a legal same-turn lethal attack, subject to hidden reactions');}
        }
      }
      if(c.effect.kind==='rally'&&target&&state.actionsLeft>=2){
        const ready={...state,units:state.units.map(u=>u.uid===target.uid?{...u,ready:true}:u)}, restored=find(ready,target.uid);
        const readyLegal=E.legalActions(ready),next=readyLegal.filter(a=>a.unitUid===target.uid&&(a.type==='move'||a.type==='attack'));
        if(next.length){const scores=next.map(a=>scoreAction(ready,a,actor,ownHand,readyLegal));score=Math.max(score,Math.max(...scores)*.8-cost);reasons.push('Rally restores a legal follow-up move or attack');}else{score=-6;reasons.push('Rally has no legal follow-up');}
      }
      if(c.effect.kind==='reclaim'&&target){
        const threatened=E.unitsAt(state,target.territory,1-actor).some(u=>E.attackValue(state,u)-fortify(state,target)>=remaining(target));
        const critical=target.territory===state.contested&&capture&&progress+p-def(target).presence<state.config.captureThreshold;
        if(critical){score-=15;reasons.push('Do not recall the Presence completing capture');}
        else if(threatened&&target.damage>=2){score=Math.max(score,target.damage*1.5+def(target).presence*.45-cost+3);reasons.push('Recall a wounded threatened unit and release its commitment');}
      }
      if(c.effect.kind==='heal'&&target&&target.territory===state.contested){
        const threatened=enemy.some(u=>E.attackValue(state,u)-fortify(state,target)>=remaining(target));
        if(threatened){score+=3+(capture?3:0);reasons.push('Healing protects occupation from a visible lethal threat');}
      }
      if(c.effect.kind==='disrupt'&&state.actionsLeft>=2){
        const available=E.presence(state,1-actor).available, fights=legal.filter(a=>a.type==='attack').map(a=>attackScore(state,find(state,a.unitUid),find(state,a.targetUid)));
        if(available>0&&fights.some(s=>s>5)){score=Math.max(score,Math.min(available,c.effect.amount)*1.4+Math.min(12,Math.max(...fights))*.4-cost+(available<=c.effect.amount?10:2));reasons.push('Disruption limits affordable reactions before a favorable attack');}
      }
      if(c.effect.kind==='draw'){
        const alternatives=legal.filter(a=>a.type==='deploy'||a.type==='attack');
        if(state.actionsLeft>=2&&ownHand.length<=4&&!alternatives.length){score=Math.max(score,8-cost);reasons.push('Refill a depleted usable hand while an action remains to use it');}
        else reasons.push('Refill tactical options only when hand resources are scarce');
      }
      if(c.effect.kind==='sabotage'&&target){
        const suppressed={...state,units:state.units.map(u=>u.uid===target.uid?{...u,suppressed:true}:u)};
        const before=legal.filter(a=>a.type==='attack').map(a=>attackScore(state,find(state,a.unitUid),find(state,a.targetUid)));
        const after=legal.filter(a=>a.type==='attack').map(a=>attackScore(suppressed,find(suppressed,a.unitUid),find(suppressed,a.targetUid)));
        const gain=after.length?Math.max(...after)-Math.max(...before):0;
        const possible=state.actionsLeft>=2&&E.unitsAt(state,target.territory,actor).some(u=>canAttack(state,u));
        if(possible&&gain>0){score=Math.max(score,gain*.75-cost);reasons.push('Sabotage creates a public follow-up attack window');}
        else{score=-5;reasons.push('Do not spend Sabotage without an improved legal same-turn attack');}
      }
      return {score,reason:reasons.join('; ')||'Use an Order when its tactical value exceeds temporary Presence and an action'};
    }
    return {score,reason:'Legal action evaluated by the frozen public-board heuristic'};
  }
  function deckScore(state,action,actor,ownHand,legal) {
    const result=factionScore(state,action,actor,ownHand,legal);
    const archetype=state.players[actor].deckMeta?.archetype;
    if(!archetype)return result;
    const item=action.handUid&&ownHand.find(c=>c.uid===action.handUid),c=item&&def(item);
    const unit=action.unitUid&&find(state,action.unitUid),target=action.targetUid&&find(state,action.targetUid);
    let bonus=0,reason='';
    if(action.type==='deploy'&&c){
      const allies=E.unitsAt(state,action.territory,actor),dist=Math.abs(action.territory-state.contested);
      if(archetype==='bastion'&&dist<=1&&(c.traits.includes('guard')||c.traits.includes('retaliate'))){bonus=2;reason='Bastion establishes a durable interception line';}
      if(archetype==='counteroffensive'&&allies.some(u=>u.damage>0)&&c.traits.includes('medic')){bonus=2;reason='Counteroffensive recovers survivors before advancing';}
      if(archetype==='shock-assault'&&c.traits.includes('rush')&&dist<=1){bonus=2;reason='Shock Assault deploys immediate pressure';}
      if(archetype==='heavy-breakthrough'&&((c.presence>=7&&c.type!=='order')||(c.traits.includes('command')&&allies.some(u=>def(u).presence>=7)))){bonus=1.5;reason='Heavy Breakthrough builds a supported expensive spearhead';}
      if(archetype==='combined-arms'&&allies.length&&(c.traits.includes('command')||c.traits.includes('medic')||c.traits.includes('guard'))){bonus=1.5;reason='Combined Arms adds a support role to the deployed formation';}
      if(archetype==='scavenger'&&c.traits.includes('scavenge')&&allies.length&&!allies.some(u=>has(u,'scavenge'))){bonus=2;reason='Scavenger places one recovery source behind allied casualties';}
      if(archetype==='wildcard'&&c.traits.includes('mobile')&&dist===1){bonus=1;reason='Wildcard preserves positioning choices';}
    }
    if(action.type==='attack'&&unit&&target){
      const outcome=combat(state,unit,target);
      if(archetype==='assassination'&&outcome.defenderDies&&(has(target,'command')||has(target,'medic')||def(target).presence>=7)){bonus=2;reason='Assassination removes a valuable visible support or finisher';}
      if(archetype==='precision-operations'&&outcome.defenderDies&&!outcome.attackerDies){bonus=1.5;reason='Precision Operations favors clean selective removal';}
      if(archetype==='heavy-breakthrough'&&def(unit).presence>=7&&outcome.attackerDies&&!outcome.defenderDies){bonus=-4;reason='Heavy Breakthrough preserves its costly finisher from a failed attack';}
      if(archetype==='scavenger'&&has(unit,'scavenge')&&outcome.attackerDies&&!outcome.defenderDies){bonus=-3;reason='Scavenger protects the recovery source';}
    }
    if(action.type==='order'&&c){
      if(archetype==='sabotage'&&c.effect.kind==='sabotage'&&result.score>0){bonus=2;reason='Sabotage opens a timed ability-disruption window';}
      if(archetype==='assassination'&&c.effect.kind==='damage'&&target&&c.effect.amount>=remaining(target)&&(has(target,'command')||has(target,'medic'))){bonus=2;reason='Assassination removes the visible support without retaliation';}
      if(archetype==='counteroffensive'&&c.effect.kind==='heal'&&target?.damage){bonus=1;reason='Counteroffensive preserves established defenders';}
      if(archetype==='wildcard'&&['rally','reclaim'].includes(c.effect.kind)&&result.score>0){bonus=1;reason='Wildcard restores a useful tactical option';}
    }
    return {score:result.score+bonus,reason:reason?result.reason+'; '+reason:result.reason};
  }
  function profileId(options) {const id=options?.profile||'baseline';if(!PROFILES.some(p=>p.id===id))throw new Error('Unknown AI profile: '+id);return id;}
  function evaluate(state,options,ranked) {
    const profile=profileId(options), legal=options?.legalActions||E.legalActions(state);
    if(!legal.length)return {action:null,score:null,reason:'No legal actions',evaluated:0,rankedTop:[],rankedtop:[]};
    const actor=E.getActor(state), ownHand=state.players[actor].hand;
    let rows,chosen;
    if(profile==='random'){
      const index=publicRandom(state,actor,ownHand)%legal.length;
      rows=legal.map((action,i)=>({action,score:i===index?1:0,reason:'Seeded selection among legal public actions',index:i}));chosen=rows[index];
    }else{
      rows=legal.map((action,index)=>({action,index,...(profile==='baseline'?{score:scoreAction(state,action,actor,ownHand,legal),reason:'Frozen Sprint 2 public-board heuristic'}:profile==='deck'?deckScore(state,action,actor,ownHand,legal):factionScore(state,action,actor,ownHand,legal))}));
      const initial=legal.find(a=>a.pass||a.type==='endTurn')||legal[0];chosen=rows.find(r=>r.action===initial);
      for(const row of rows)if(row.score>chosen.score+.001)chosen=row;
    }
    const rankedTop=ranked?rows.slice().sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,5).map(({action,score,reason})=>({action,score,reason})):[];
    return {action:chosen.action,score:chosen.score,reason:chosen.reason,evaluated:legal.length,rankedTop,rankedtop:rankedTop};
  }
  function explainAction(state,options){return evaluate(state,options,true);}
  function chooseAction(state,options) {return profileId(options)==='baseline'?baselineAction(state,options?.legalActions):evaluate(state,options,false).action;}
  return {VERSION,BASELINE_VERSION,chooseAction,explainAction,getProfiles:()=>PROFILES.map(p=>({...p})),forRules:(data,engine)=>createAI(data,engine)};
});
