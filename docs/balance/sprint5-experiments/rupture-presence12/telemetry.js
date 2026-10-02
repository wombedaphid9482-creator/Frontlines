/* Shared offline playtest diagnostics: observes authoritative transitions only. */
(function(root,factory) {
  const node = typeof module === 'object' && module.exports;
  const api = factory(node ? require('./data.js') : root.FrontlinesData,node ? require('./engine.js') : root.FrontlinesEngine);
  if (node) module.exports = api;
  root.FrontlinesTelemetry = api;
})(typeof globalThis !== 'undefined' ? globalThis : this,function(DefaultData,DefaultEngine) {
  'use strict';
  const VERSION = 'frontlines-telemetry-v2-arsenal';
  const clone = value => JSON.parse(JSON.stringify(value));
  const CONDITIONS = ['territoryDeficit2','centerLost','enemyForward','committedDeficit','unitDeficit'];
  const CARD_METRICS = ['included','includedMatches','drawn','plays','deployments','orders','attacksInitiated','deaths',
    'unitTurnObservations','handEndTurnObservations','affordableHandEndTurnObservations','drawTurnSum','playTurnSum','presencePaid',
    'damageDealt','effectiveDamageDealt','damageReceived','effectiveDamageReceived','kills','pressureContributed','captureContributions',
    'survivalTurnSum','completedLives','survivingTurnExposure','affordableOpportunityTurns','playedOpportunityTurns',
    'affordableReactionWindows','playedReactionWindows','costStrandedObservations',
    'drawnMatches','drawnWins','playedMatches','playedWins','earlyPlayedMatches','earlyPlayedWins','latePlayedMatches','latePlayedWins',
    'passiveTriggers','fortifyAbsorbed','fortifyEffectiveHealthProtected','commandBonusEnabled','commandEffectiveDamageEnabled',
    'healingEnabled','healingDone','disruptionApplied','counteredOrders','shieldAbsorbed','shieldEffectiveHealthProtected','rallies','mobileMoves','rushAttacks','precisionBypasses',
    'retaliateTriggers','retaliateEffectiveDamage','scavengeTriggers','scavengeCardsDrawn','sabotageApplications','traitsSuppressed','sabotageCombatWindows'];
  function createTracker(options) {
    options = options || {};
    const D = options.data || DefaultData, E = options.engine || DefaultEngine;
    const hasTrait=(unit,name)=>E.hasTrait?E.hasTrait(unit,name):!!unit&&!unit.suppressed&&(D.CARDS[unit.cardId].traits||[]).includes(name);
    const traceLimit = Math.max(0,Math.min(5000,options.traceLimit === undefined ? 1000 : options.traceLimit));
    const records = [],cards = [Object.create(null),Object.create(null)],lives = new Map();
    const aiProfiles = options.aiProfiles || ['human','human'];
    const deckIds = options.decks || [];
    let initial = null,last = null,decisions = 0,finished = null,opportunity = null;
    const actions = {}, timeline = [];
    const economy = [0,1].map(() => ({generated:0,orderSpend:0,deploymentCommitment:0,casualtyReleased:0,reclaimedReleased:0,
      samples:0,commandSum:0,availableSum:0,committedSum:0,unitCountSum:0,unusedEndTurnSum:0,endTurns:0,
      noMeaningfulAffordableTurns:0,meaningfulOpportunityTurns:0,playedCostSum:0,plays:0,costStrandedObservations:0,
      territorialPressure:0,damageDealt:0,effectiveDamageDealt:0,kills:0,finalCommitted:0}));
    const territory = {samples:[],firstCaptureTurn:null,captures:[0,0],recaptures:[0,0],ownershipRecaptures:[0,0],
      timeCenter:[0,0],timeEnemyTerritory:[0,0],longestHold:[0,0],meanControl:[0,0],meanLead:[0,0],maxLead:[0,0],
      contestedSamples:0,winnerFirstLeadTurn:null,winnerPermanentLeadTurn:null};
    const holds = [0,0],previousOwners = new Map();
    const comeback = [0,1].map(() => Object.fromEntries(CONDITIONS.map(condition => [condition,{experienced:false,recovered:false,won:false,firstTurn:null}])));
    function row(seat,id) {
      if (!cards[seat][id]) {
        const card = D.CARDS[id];
        const item = {player:seat,deckId:typeof deckIds[seat] === 'string' ? deckIds[seat] : `${D.FACTIONS[initial.players[seat].faction].id}-starter`,
          cardId:id,name:card.name,faction:card.faction,type:card.type,copiesPerDeck:0};
        for (const metric of CARD_METRICS) item[metric] = 0;
        cards[seat][id] = item;
      }
      return cards[seat][id];
    }
    function observeDraw(seat,item,turn) { const card = row(seat,item.cardId);card.drawn++;card.drawTurnSum += turn; }
    function sample(state,turn,opening) {
      const controlled = [E.controlledCount(state,0),E.controlledCount(state,1)],committed = [E.presence(state,0).committed,E.presence(state,1).committed];
      const units = [state.units.filter(unit => unit.owner === 0).length,state.units.filter(unit => unit.owner === 1).length];
      const enemyOccupancy = [0,1].map(seat => state.units.some(unit => unit.owner !== seat && (seat === 0 ? unit.territory <= 2 : unit.territory >= 4)));
      const item = {turn,controlled,centerOwner:state.territories[3].owner,enemyOccupancy,committed,units};
      timeline.push(item);
      if (options.trace || options.territoryHistory) territory.samples.push(item);
      for (let seat = 0; seat < 2; seat++) {
        if (!opening) {
          const lead = controlled[seat]-controlled[1-seat];
          territory.meanControl[seat] += controlled[seat];territory.meanLead[seat] += lead;
          territory.maxLead[seat] = Math.max(territory.maxLead[seat],lead);
          if (item.centerOwner === seat) territory.timeCenter[seat]++;
          const inside = state.units.some(unit => unit.owner === seat && (seat === 0 ? unit.territory >= 4 : unit.territory <= 2));
          if (inside) territory.timeEnemyTerritory[seat]++;
          const ownerSignature = state.territories.filter(zone => zone.owner === seat).map(zone => zone.id).join(',');
          holds[seat] = previousOwners.get(seat) === ownerSignature ? holds[seat]+1 : 1;
          previousOwners.set(seat,ownerSignature);territory.longestHold[seat] = Math.max(territory.longestHold[seat],holds[seat]);
          const presence = E.presence(state,seat), eco = economy[seat];
          eco.samples++;eco.commandSum += presence.command;eco.availableSum += presence.available;eco.committedSum += presence.committed;eco.unitCountSum += units[seat];
        }
        const bad = {territoryDeficit2:controlled[1-seat]-controlled[seat] >= 2,centerLost:item.centerOwner === 1-seat,
          enemyForward:enemyOccupancy[seat],committedDeficit:committed[1-seat]-committed[seat] >= 5,unitDeficit:units[1-seat]-units[seat] >= 2};
        for (const condition of CONDITIONS) {
          const record = comeback[seat][condition];
          if (bad[condition] && !record.experienced) {record.experienced = true;record.firstTurn = turn;}
          if (!bad[condition] && record.experienced && turn > record.firstTurn) record.recovered = true;
        }
      }
      if (!opening && state.units.some(unit => unit.owner === 0 && unit.territory === state.contested)
        && state.units.some(unit => unit.owner === 1 && unit.territory === state.contested)) territory.contestedSamples++;
    }
    function initialize(state) {
      if (initial) return;
      initial = state;last = state;
      for (let seat = 0; seat < 2; seat++) {
        const player = state.players[seat];
        const inventory = player.deck.concat(player.discard,player.hand.map(item => item.cardId),state.units.filter(unit => unit.owner === seat).map(unit => unit.cardId));
        for (const id of inventory) { const card = row(seat,id);card.included++;card.copiesPerDeck++;card.includedMatches = 1; }
        for (const item of player.hand) observeDraw(seat,item,state.turn);
        economy[seat].generated = player.command;
        for (const unit of state.units.filter(unit => unit.owner === seat)) lives.set(unit.uid,{seat,cardId:unit.cardId,turn:unit.deployedTurn});
      }
      sample(state,0,true);
    }
    function namedEvents(events) { return events.map(event => ({...event,cardName:event.cardId && D.CARDS[event.cardId].name || null,
      sourceName:event.sourceCardId && D.CARDS[event.sourceCardId].name || null,targetName:event.targetCardId && D.CARDS[event.targetCardId].name || null})); }
    function record(before,after,action,detail) {
      if (finished) throw new Error('Cannot record actions after telemetry is finalized.');
      initialize(before); detail = detail || {};last = after;decisions++;
      const actor = E.getActor(before), events = detail.events || [];
      actions[action.type] = (actions[action.type] || 0)+1;
      const hand = before.players[actor].hand.find(item => item.uid === action.handUid);
      const unit = before.units.find(item => item.uid === action.unitUid || item.uid === action.guardUid);
      if (hand) {
        const card = row(actor,hand.cardId),cost = D.CARDS[hand.cardId].presence;
        card.plays++;card.playTurnSum += before.turn;card.presencePaid += cost;
        if (action.type === 'deploy') { card.deployments++;economy[actor].deploymentCommitment += cost;lives.set(hand.uid,{seat:actor,cardId:hand.cardId,turn:before.turn}); }
        else {card.orders++;economy[actor].orderSpend += cost;}
        if (before.turn <= 6) card._early = true; else card._late = true;
        economy[actor].playedCostSum += cost;economy[actor].plays++;
      }
      if(action.type==='attack'&&unit){const c=row(unit.owner,unit.cardId);c.attacksInitiated++;
        if(unit.deployedTurn===before.turn&&hasTrait(unit,'rush'))c.rushAttacks++;
        if(hasTrait(unit,'precision')&&before.units.some(guard=>guard.owner!==unit.owner&&guard.territory===unit.territory&&guard.ready&&guard.uid!==action.targetUid&&hasTrait(guard,'guard')))c.precisionBypasses++;}
      const oldHand = before.players.map(player => new Set(player.hand.map(item => item.uid)));
      const oldUnits = new Set(before.units.map(item => item.uid)),newUnits = new Set(after.units.map(item => item.uid));
      for (let seat = 0; seat < 2; seat++) {
        const returned = new Set(after.players[seat].hand.map(item => item.uid));
        for (const item of after.players[seat].hand) if (!oldHand[seat].has(item.uid) && !oldUnits.has(item.uid)) observeDraw(seat,item,after.turn);
        for (const removed of before.units) if (removed.owner === seat && !newUnits.has(removed.uid)) {
          const life = lives.get(removed.uid);lives.delete(removed.uid);
          if (!returned.has(removed.uid)) {
            const card = row(seat,removed.cardId);card.deaths++;card.completedLives++;card.survivalTurnSum += Math.max(0,before.turn-(life ? life.turn : removed.deployedTurn));
            economy[seat].casualtyReleased += D.CARDS[removed.cardId].presence;
          } else economy[seat].reclaimedReleased += D.CARDS[removed.cardId].presence;
        }
        economy[seat].generated += Math.max(0,after.players[seat].command-before.players[seat].command);
      }
      for (const event of events) {
        if (event.type === 'damage') {
          const receiver = row(event.targetOwner,event.targetCardId);receiver.damageReceived += event.amount;receiver.effectiveDamageReceived += event.effective;
          if(event.fortifyAbsorbed){receiver.fortifyAbsorbed+=event.fortifyAbsorbed;receiver.fortifyEffectiveHealthProtected+=event.fortifyEffectiveProtected;receiver.passiveTriggers++;}
          if (event.player !== null) {economy[event.player].damageDealt += event.amount;economy[event.player].effectiveDamageDealt += event.effective;}
          if (event.sourceCardId && event.player !== null) { const source = row(event.player,event.sourceCardId);source.damageDealt += event.amount;source.effectiveDamageDealt += event.effective;if(event.passive==='retaliate')source.retaliateEffectiveDamage+=event.effective; }
          if(event.commandSupporters&&event.commandSupporters.length)for(const support of event.commandSupporters)row(support.player,support.cardId).commandEffectiveDamageEnabled+=event.commandEffectiveEnabled/event.commandSupporters.length;
        }
        if (event.type === 'death' && event.killer !== null) {
          economy[event.killer].kills++;
          if (event.sourceCardId) row(event.killer,event.sourceCardId).kills++;
        }
        if (event.type === 'pressure') {
          economy[event.player].territorialPressure += event.amount;
          for (const source of event.contributors) row(event.player,source.cardId).pressureContributed += source.presence;
        }
        if (event.type === 'capture') {
          territory.captures[event.player]++;if (event.recapture) territory.recaptures[event.player]++;
          if (event.previousOwner !== null && event.previousOwner !== event.player) territory.ownershipRecaptures[event.player]++;
          if (territory.firstCaptureTurn === null) territory.firstCaptureTurn = before.turn;
          for (const source of event.contributors) row(event.player,source.cardId).captureContributions++;
        }
        if (event.type === 'combat') {
          // Count actual exchanges while an ability window was active. This is
          // a descriptive opportunity count, never invented prevented damage.
          const participants=[before.units.find(u=>u.uid===event.attackerUid),before.units.find(u=>u.uid===event.defenderUid)].filter(Boolean);
          for(const affected of before.units.filter(u=>u.suppressed&&u.sabotageSource)){
            const direct=participants.some(u=>u.uid===affected.uid);
            const aura=(D.CARDS[affected.cardId].traits||[]).includes('command')&&participants.some(u=>u.owner===affected.owner&&u.territory===affected.territory&&u.uid!==affected.uid);
            if(direct||aura)row(affected.sabotageSource.player,affected.sabotageSource.cardId).sabotageCombatWindows++;
          }
          if(event.shieldCardId){const shield=row(1-event.player,event.shieldCardId);shield.shieldAbsorbed+=event.shieldAbsorbed;shield.shieldEffectiveHealthProtected+=event.shieldEffectiveProtected;}
          for (const support of event.commandSupporters.flat()) {const card = row(support.player,support.cardId);card.passiveTriggers++;card.commandBonusEnabled++;}
          for (let index = 0; index < 2; index++) if (event.berserk[index]) row(index === 0 ? event.player : 1-event.player,index === 0 ? event.attackerCardId : event.defenderCardId).passiveTriggers++;
        }
        if (event.type === 'heal' && event.passive === 'medic') for (const support of event.supporters) { const card = row(event.player,support.cardId);card.passiveTriggers++;card.healingEnabled += event.amount/event.supporters.length; }
        if(event.type==='heal'&&event.sourceCardId)row(event.player,event.sourceCardId).healingDone+=event.amount;
        if(event.type==='rally')row(event.player,event.sourceCardId).rallies++;
        if(event.type==='move'&&event.reason==='mobile'){const c=row(event.player,event.cardId);c.passiveTriggers++;c.mobileMoves++;}
        if (event.type === 'disrupt') row(event.player,event.sourceCardId).disruptionApplied += event.amount;
        if (event.type === 'counter') row(event.player,event.cardId).counteredOrders++;
        if(event.type==='sabotage'&&event.sourceCardId){const c=row(event.player,event.sourceCardId);c.sabotageApplications++;c.traitsSuppressed+=(event.traits||[]).length;}
        if (event.type === 'passive') {
          const c=row(event.player,event.cardId);c.passiveTriggers += event.amount;
          if(event.trait==='retaliate')c.retaliateTriggers++;
          if(event.trait==='scavenge'){c.scavengeTriggers++;c.scavengeCardsDrawn+=event.amount;}
        }
      }
      if (!events.length) {
        // Public-state fallback for third-party callers. Exact per-card damage
        // attribution requires authoritative dispatch events; never guess kills.
        for (let seat = 0; seat < 2; seat++) {
          economy[seat].damageDealt += after.stats.damage[seat]-before.stats.damage[seat];
          economy[seat].kills += after.stats.kills[seat]-before.stats.kills[seat];
          const captures = after.stats.captures[seat]-before.stats.captures[seat];
          territory.captures[seat] += captures;
          if (captures && territory.firstCaptureTurn === null) territory.firstCaptureTurn = before.turn;
          if (captures && before.territories[before.contested].owner === seat) territory.recaptures[seat] += captures;
        }
      }
      if (action.type === 'endTurn') {
        const available = E.presence(before,actor).available,eco = economy[actor];eco.endTurns++;eco.unusedEndTurnSum += available;
        for (const deployed of before.units) if (deployed.owner === actor) row(actor,deployed.cardId).unitTurnObservations++;
        for (const item of before.players[actor].hand) {
          const card = row(actor,item.cardId);card.handEndTurnObservations++;
          if (D.CARDS[item.cardId].presence <= available) card.affordableHandEndTurnObservations++;
          else {card.costStrandedObservations++;eco.costStrandedObservations++;}
        }
        sample(after,before.turn,false);
      }
      // Evaluate affordable meaningful opportunity once at the first decision
      // of each player's offensive turn, not on every animation/action update.
      if (!before.response && (!opportunity || opportunity.key !== `${before.turn}:${actor}`)) {
        const legal = detail.legalActions || E.legalActions(before);
        const playable = new Set(legal.filter(candidate => candidate.type === 'deploy' || candidate.type === 'order').map(candidate => candidate.handUid));
        economy[actor].meaningfulOpportunityTurns++;
        if (!playable.size) economy[actor].noMeaningfulAffordableTurns++;
        const available = E.presence(before,actor).available;
        const ids = new Set(before.players[actor].hand.filter(item => playable.has(item.uid)).map(item => item.cardId));
        opportunity = {key:`${before.turn}:${actor}`,actor,ids,played:new Set()};
        for (const id of ids) row(actor,id).affordableOpportunityTurns++;
        for (const item of before.players[actor].hand) if (D.CARDS[item.cardId].presence > available) row(actor,item.cardId)._costSeen = true;
      }
      if (hand && opportunity && opportunity.key === `${before.turn}:${actor}` && opportunity.ids.has(hand.cardId) && !opportunity.played.has(hand.cardId)) {
        opportunity.played.add(hand.cardId);row(actor,hand.cardId).playedOpportunityTurns++;
      }
      if(before.response){
        const kind=before.response.stage==='response'?'respond':'counter';
        const validIds=new Set(before.players[actor].hand.filter(item=>!E.validate(before,{type:kind,handUid:item.uid})).map(item=>item.cardId));
        for(const id of validIds)row(actor,id).affordableReactionWindows++;
        if(hand&&validIds.has(hand.cardId))row(actor,hand.cardId).playedReactionWindows++;
      }
      if (options.trace && traceLimit) {
        const target = before.units.find(item => item.uid === action.targetUid),definition = hand ? D.CARDS[hand.cardId] : unit ? D.CARDS[unit.cardId] : null;
        const name = definition ? definition.name : action.pass ? 'Pass' : action.type;
        const destination = action.territory === undefined ? target && before.territories[target.territory].name : before.territories[action.territory].name;
        records.push({turn:before.turn,actor,action:clone(action),cardId:definition && definition.id || null,
          actionText:`${action.type}: ${name}${destination ? ` → ${destination}` : ''}${target ? ` (${D.CARDS[target.cardId].name})` : ''}`,
          presenceBefore:[E.presence(before,0),E.presence(before,1)],presenceAfter:[E.presence(after,0),E.presence(after,1)],
          territoryBefore:[E.controlledCount(before,0),E.controlledCount(before,1)],territoryAfter:[E.controlledCount(after,0),E.controlledCount(after,1)],
          events:namedEvents(events),decision:detail.decision ? {profile:detail.decision.profile || aiProfiles[actor],score:detail.decision.score,reason:detail.decision.reason,evaluated:detail.decision.evaluated} : null});
        if (records.length > traceLimit) records.splice(0,records.length-traceLimit);
      }
    }
    function output(state,final) {
      initialize(state);const winner = state.winner;
      const cardsOut = [0,1].flatMap(seat => Object.values(cards[seat]).map(card => {
        const item = {...card};delete item._early;delete item._late;delete item._costSeen;
        item.drawnMatches = card.drawn ? 1 : 0;item.playedMatches = card.plays ? 1 : 0;
        item.drawnWins = card.drawn && winner === seat ? 1 : 0;item.playedWins = card.plays && winner === seat ? 1 : 0;
        item.earlyPlayedMatches = card._early ? 1 : 0;item.earlyPlayedWins = card._early && winner === seat ? 1 : 0;
        item.latePlayedMatches = card._late ? 1 : 0;item.latePlayedWins = card._late && winner === seat ? 1 : 0;
        if (final) for (const [uid,life] of lives) if (life.seat === seat && life.cardId === card.cardId) item.survivingTurnExposure += Math.max(0,state.turn-life.turn);
        return item;
      }));
      const flow = clone(territory),sampleCount = Math.max(0,timeline.length-1);
      flow.meanControl = flow.meanControl.map(total => sampleCount ? total/sampleCount : 3);
      flow.meanLead = flow.meanLead.map(total => sampleCount ? total/sampleCount : 0);
      flow.sampleCount = sampleCount;
      if (winner !== null) {
        flow.winnerFirstLeadTurn = timeline.find(item => item.controlled[winner] > item.controlled[1-winner])?.turn ?? null;
        let lastNotLeading = -1;
        for (let index = 0; index < timeline.length; index++) if (timeline[index].controlled[winner] <= timeline[index].controlled[1-winner]) lastNotLeading = index;
        flow.winnerPermanentLeadTurn = timeline[lastNotLeading+1]?.turn ?? null;
      }
      const comebacks = clone(comeback);
      for (let seat = 0; seat < 2; seat++) for (const condition of CONDITIONS) comebacks[seat][condition].won = comebacks[seat][condition].experienced && winner === seat;
      const economies = clone(economy);
      for (let seat = 0; seat < 2; seat++) economies[seat].finalCommitted = E.presence(state,seat).committed;
      return {schemaVersion:1,telemetryVersion:VERSION,rulesVersion:E.VERSION || 'frontlines-territory-v1',seed:initial.seed,
        factions:initial.players.map(player => player.faction),aiProfiles:aiProfiles.slice(),winner,turns:state.turn,decisions,actions:{...actions},
        territory:flow,economy:economies,comeback:comebacks,cards:cardsOut,
        definitions:{turn:'One offensive initiative, not a pair of initiatives.',territorySamples:'Post-offensive-end-turn state; opening sample has turn 0.',
          recapture:'Securing a contested objective already owned by that player; ownershipRecaptures separately counts zones taken from the opponent.',
          comeback:'Condition observed in an end-turn sample; recovery means a later sample no longer meets it; win is eventual victory after exposure.',
          deficitConditions:'At least 2 territories behind; enemy owns center; enemy unit in original forward/rear territory; at least 5 less committed Presence; at least 2 fewer deployed cards.',
          generated:'Opening Command plus actual subsequent Command growth. Territorial pressure is separate, not spendable currency.',
          casualtyReleased:'Dead cards free commitment. Printed Presence is not permanently lost and does not penalize future currency.',
          damage:'Actual applied damage including overkill, matching engine counters. Effective damage separately caps health loss.',
          opportunities:'Legal deploy/action-Order options at first decision of own offensive turn; legal response/counter card windows are counted separately. Presence-only affordability end-turn observations are separate.',
          survival:'Offensive turns from deployment to destruction. Surviving exposure is censored and separate.',early:'Card played on offensive turn 6 or earlier.',
          associations:'When-drawn/played win rates are observational, not causal card power estimates. Command bonus-enabled counts do not double-count the attacking card damage.'}};
    }
    const tracker = {record,summary:() => last ? output(last,false) : null,trace:() => clone(records),
      finish(state) {if (!finished) {finished = output(state,true);if (options.trace) {finished.trace = clone(records);finished.traceTruncated = decisions > records.length;}}return clone(finished);}};
    if (options.state) initialize(options.state);
    return tracker;
  }
  return {VERSION,CONDITIONS,CARD_METRICS,createTracker};
});
