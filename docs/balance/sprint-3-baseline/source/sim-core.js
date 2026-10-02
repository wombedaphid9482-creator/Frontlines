/* Headless balance laboratory. The game engine remains authoritative. */
(function (root, factory) {
  'use strict';
  const node = typeof module === 'object' && module.exports;
  const api = factory(node ? require('./data.js') : root.FrontlinesData,
    node ? require('./engine.js') : root.FrontlinesEngine,
    node ? require('./ai.js') : root.FrontlinesAI);
  if (node) module.exports = api;
  root.FrontlinesSimulator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Data, Engine, AI) {
  'use strict';
  const VERSION = '1.0.0';
  const AI_VERSION = 'frontlines-heuristic-sprint2-v1';
  const copy = value => JSON.parse(JSON.stringify(value));
  const CONFIG_LIMITS = {
    startingCommand: [1,1000], commandGrowth: [0,100], commandCap: [1,1000],
    captureThreshold: [1,1000], startingHand: [1,50], drawCount: [0,20],
    slotsPerTerritory: [1,20], actionLimit: [1,20], victoryTerritories: [4,7]
  };
  const METRICS = ['drawn','plays','deployments','orders','attacksInitiated','deaths',
    'unitTurnObservations','handEndTurnObservations','affordableHandEndTurnObservations'];

  function getDecks() {
    return Object.keys(Data.FACTIONS).filter(id => Data.DECKS[id]).map(faction => ({
      id: `${faction}-starter`, name: `${Data.FACTIONS[faction].name} Starter`,
      faction, cards: Data.DECKS[faction].slice()
    }));
  }
  function integer(value, fallback, min, max, name) {
    if (value === undefined || value === '') return fallback;
    if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !value.trim())) throw new Error(`${name} must be an integer from ${min} to ${max}.`);
    const number = typeof value === 'number' ? value : Number(value);
    if (!Number.isInteger(number) || number < min || number > max) throw new Error(`${name} must be an integer from ${min} to ${max}.`);
    return number;
  }
  function boolean(value, fallback, name) {
    if (value === undefined) return fallback;
    if (value !== true && value !== false) throw new Error(`${name} must be true or false.`);
    return value;
  }
  function deckId(value, fallback) {
    const id = value === undefined ? fallback : value;
    const found = getDecks().find(deck => deck.id === id || deck.faction === id);
    if (!found) throw new Error(`Unknown deck: ${String(id)}.`);
    return found.id;
  }
  function normalizeOptions(raw) {
    raw = raw || {};
    if (typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Simulation options must be an object.');
    const mode = raw.mode === undefined ? 'duel' : raw.mode;
    if (mode !== 'duel' && mode !== 'matrix') throw new Error('Mode must be duel or matrix.');
    const config = {};
    if (raw.config !== undefined && (!raw.config || typeof raw.config !== 'object' || Array.isArray(raw.config))) throw new Error('Rules configuration must be an object.');
    const overrides = raw.config || {};
    for (const key of Object.keys(overrides)) if (!CONFIG_LIMITS[key]) throw new Error(`Unknown rules setting: ${key}.`);
    for (const key of Object.keys(CONFIG_LIMITS)) {
      config[key] = integer(overrides[key], Data.DEFAULT_CONFIG[key], CONFIG_LIMITS[key][0], CONFIG_LIMITS[key][1], key);
    }
    if (config.commandCap < config.startingCommand) throw new Error('Command cap cannot be lower than starting Command Presence.');
    return {
      mode, count: integer(raw.count, 100, 1, 100000, 'Match count'),
      deckA: deckId(raw.deckA, 'stonewall-starter'), deckB: deckId(raw.deckB, 'bruiser-starter'),
      swapSeats: boolean(raw.swapSeats, true, 'Swap seats'),
      includeMirrors: boolean(raw.includeMirrors, false, 'Include mirrors'),
      seed: integer(raw.seed, 1009, 0, 4294967295, 'Seed'),
      maxTurns: integer(raw.maxTurns, 240, 1, 2000, 'Turn limit'),
      maxDecisions: integer(raw.maxDecisions, 10000, 1, 100000, 'Decision limit'),
      verify: boolean(raw.verify, false, 'Verify invariants'), config
    };
  }

  function scheduleFor(options) {
    if (options.mode === 'duel') return [{ a: options.deckA, b: options.deckB, group: 0 }];
    const ids = getDecks().map(deck => deck.id);
    const result = [];
    let group = 0;
    for (let a = 0; a < ids.length; a++) {
      if (options.includeMirrors) result.push({ a: ids[a], b: ids[a], group: group++ });
      for (let b = a + 1; b < ids.length; b++) {
        result.push({ a: ids[a], b: ids[b], group }, { a: ids[b], b: ids[a], group });
        group++;
      }
    }
    return result;
  }
  function scheduledMatch(options, schedule, index) {
    let a, b, seedGroup;
    if (options.mode === 'duel') {
      const swapped = options.swapSeats && index % 2 === 1;
      a = swapped ? options.deckB : options.deckA;
      b = swapped ? options.deckA : options.deckB;
      seedGroup = options.swapSeats ? Math.floor(index / 2) : index;
    } else {
      const item = schedule[index % schedule.length];
      a = item.a; b = item.b;
      const groupsPerCycle = Math.max(...schedule.map(pair => pair.group)) + 1;
      seedGroup = Math.floor(index / schedule.length) * groupsPerCycle + item.group;
    }
    return { index, deckIds: [a,b], seed: (options.seed + Math.imul(seedGroup, 0x9e3779b9)) >>> 0 };
  }

  // The engine currently accepts faction starter decks. This registry is the
  // extension point for deck selection, rather than changing deck state by hand.
  function makeState(spec, options, decks) {
    return Engine.createGame({ factions: spec.deckIds.map(id => decks[id].faction), seed: spec.seed, config: options.config });
  }
  function cardCounters(deck) {
    const rows = {};
    for (const cardId of deck.cards) {
      if (!rows[cardId]) {
        const card = Data.CARDS[cardId];
        rows[cardId] = { deckId: deck.id, cardId, name: card.name, faction: card.faction, type: card.type, copiesPerDeck: 0 };
        for (const metric of METRICS) rows[cardId][metric] = 0;
      }
      rows[cardId].copiesPerDeck++;
    }
    return rows;
  }
  function recordInitial(current) {
    for (let seat = 0; seat < 2; seat++) for (const item of current.state.players[seat].hand) current.cards[seat][item.cardId].drawn++;
  }
  function recordDecision(current, before, after, action) {
    const actor = Engine.getActor(before);
    const hand = before.players[actor].hand.find(item => item.uid === action.handUid);
    if (hand) {
      const row = current.cards[actor][hand.cardId];
      row.plays++;
      if (action.type === 'deploy') row.deployments++;
      else row.orders++;
    }
    if (action.type === 'attack') {
      const unit = before.units.find(item => item.uid === action.unitUid);
      if (unit) current.cards[unit.owner][unit.cardId].attacksInitiated++;
    }
    const oldUnits = new Set(before.units.map(unit => unit.uid));
    const newUnits = new Set(after.units.map(unit => unit.uid));
    for (let seat = 0; seat < 2; seat++) {
      const oldHand = new Set(before.players[seat].hand.map(item => item.uid));
      const newHand = new Set(after.players[seat].hand.map(item => item.uid));
      for (const item of after.players[seat].hand) {
        if (!oldHand.has(item.uid) && !oldUnits.has(item.uid)) current.cards[seat][item.cardId].drawn++;
      }
      for (const unit of before.units) {
        if (unit.owner === seat && !newUnits.has(unit.uid) && !newHand.has(unit.uid)) current.cards[seat][unit.cardId].deaths++;
      }
    }
    if (action.type === 'endTurn') {
      for (const unit of before.units) if (unit.owner === actor) current.cards[actor][unit.cardId].unitTurnObservations++;
      const available = Engine.presence(before, actor).available;
      for (const item of before.players[actor].hand) {
        const row = current.cards[actor][item.cardId];
        row.handEndTurnObservations++;
        // Affordability means enough Presence, not necessarily a legal target.
        if (Data.CARDS[item.cardId].presence <= available) row.affordableHandEndTurnObservations++;
      }
    }
  }
  function inventory(state, seat) {
    const player = state.players[seat];
    const counts = {};
    const cards = player.deck.concat(player.discard, player.hand.map(item => item.cardId), state.units.filter(unit => unit.owner === seat).map(unit => unit.cardId));
    for (const id of cards) counts[id] = (counts[id] || 0) + 1;
    return counts;
  }
  function verifyState(current) {
    Engine.assertInvariants(current.state);
    for (let seat = 0; seat < 2; seat++) {
      const actual = inventory(current.state, seat);
      const expected = current.inventory[seat];
      if (Object.keys(actual).length !== Object.keys(expected).length || Object.keys(expected).some(id => actual[id] !== expected[id])) {
        throw new Error(`Card inventory changed for Player ${seat + 1}.`);
      }
    }
  }
  function matchSummary(current, status, error) {
    const state = current.state;
    const winner = state && status === 'win' ? state.winner : null;
    return {
      index: current.spec.index, seed: current.spec.seed, deckIds: current.spec.deckIds.slice(),
      factions: current.spec.deckIds.map(id => current.decks[id].faction),
      status, winner, winnerDeck: winner === null ? null : current.spec.deckIds[winner],
      winnerFaction: winner === null ? null : current.decks[current.spec.deckIds[winner]].faction,
      turns: state ? Math.min(state.turn, current.options.maxTurns) : 0,
      decisions: current.decisions, captures: state ? state.stats.captures.slice() : [0,0],
      kills: state ? state.stats.kills.slice() : [0,0], damage: state ? state.stats.damage.slice() : [0,0],
      actions: { ...current.actions }, error: error || null,
      finalTerritories: state ? [Engine.controlledCount(state,0),Engine.controlledCount(state,1)] : [3,3]
    };
  }
  function interval(wins, count) {
    if (!count) return null;
    const z = 1.959963984540054, p = wins / count, z2 = z * z;
    const center = (p + z2 / (2 * count)) / (1 + z2 / count);
    const half = z * Math.sqrt(p * (1-p) / count + z2 / (4 * count * count)) / (1 + z2 / count);
    return { low: wins === 0 ? 0 : Math.max(0, center - half), high: wins === count ? 1 : Math.min(1, center + half) };
  }
  const seatStats = () => ({ played:0, decisive:0, won:0, lost:0, winRate:null });
  function entry(id, name, faction) {
    return { id,name,faction,played:0,decisive:0,won:0,lost:0,unfinished:0,errors:0,winRate:null,winInterval:null,seats:[seatStats(),seatStats()] };
  }
  function bumpEntry(row, match, seat) {
    row.played++; row.seats[seat].played++;
    if (match.status === 'win') {
      row.decisive++; row.seats[seat].decisive++;
      const key = match.winner === seat ? 'won' : 'lost';
      row[key]++; row.seats[seat][key]++;
    } else if (match.status === 'error') row.errors++;
    else row.unfinished++;
  }
  function decorateEntry(row) {
    const result = copy(row);
    result.winRate = row.decisive ? row.won / row.decisive : null;
    result.winInterval = interval(row.won, row.decisive);
    for (const seat of result.seats) seat.winRate = seat.decisive ? seat.won / seat.decisive : null;
    return result;
  }
  function rulesSnapshot(options, decks) {
    return { config:copy(options.config), factions:copy(Data.FACTIONS), cards:copy(Data.CARDS), decks:copy(Object.values(decks)),
      territoryNames:Data.TERRITORY_NAMES.slice(),glossary:copy(Data.GLOSSARY),
      mechanics:{
        economy:'Available Presence = Command minus deployed card Presence minus spent Orders. Subsequent own offensive turns grow Command to the configured cap and clear spent Presence. Casualties immediately free commitment.',
        battlefield:'Seven territories: Player 1 initially owns sectors 0–2, sector 3 is neutral, and Player 2 initially owns sectors 4–6. The contested objective moves one territory on capture.',
        actions:'Deploy, move, attack and action Orders each consume one major action. Responses and counters consume no major action but card Orders spend Presence. Units normally cannot attack on their deployment turn without Rush.',
        combat:'Same-territory attacks open response and optional counter windows. Combat damage is simultaneous after those windows, with persistent wounds and card-defined traits. Lethal ambush can remove the attacker before combat.',
        capture:'Only the ending offensive player adds printed frontline unit Presence to their progress, including when enemies are present. At the configured threshold they secure the objective, reset progress, and move the frontline.',
        breakthrough:'After a nonwinning capture, surviving non-assets advance one adjacent into the new objective, filling friendly slots in unit order and preserving wounds/readiness. Assets and overflow remain.',
        victory:'A player wins by capturing the opponent home sector or controlling the configured number of territories. No player health total determines victory.',
        reserves:'Draw configured opening and own-turn cards. Empty reserves recycle casualty and spent Order discards; if both reserve and discard are empty, drawing safely stops.'
      },
      rulesVersion:'sprint2-territory-breakthrough-v1',
      engineFingerprint: fingerprint(String(Engine.createGame) + String(Engine.dispatch) + String(Engine.legalActions) + String(Engine.validate)),
      aiFingerprint: fingerprint(String(AI.chooseAction)),
      dataFingerprint: fingerprint(JSON.stringify({ cards:Data.CARDS,decks:Data.DECKS,config:Data.DEFAULT_CONFIG })) };
  }
  function fingerprint(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
    return (hash >>> 0).toString(16).padStart(8,'0');
  }

  function createRun(raw) {
    const options = normalizeOptions(raw);
    const decks = Object.fromEntries(getDecks().map(deck => [deck.id,deck]));
    const schedule = scheduleFor(options);
    const matches = [], aggregateCards = {}, byDeck = {}, byFaction = {}, byMatchup = {};
    for (const deck of Object.values(decks)) {
      byDeck[deck.id] = entry(deck.id,deck.name,deck.faction);
      byFaction[deck.faction] = entry(deck.faction,Data.FACTIONS[deck.faction].name,deck.faction);
    }
    const tally = { matches:0,decisive:0,unfinished:0,errors:0,wins:[0,0],firstPlayerWins:0,
      captures:0,kills:0,damage:0,actions:{},turnSum:0,turnHistogram:new Map(),turnMin:Infinity,turnMax:0 };
    let current = null;
    function finalize(status,error) {
      const match = matchSummary(current,status,error);
      matches.push(match); tally.matches++;
      if (status === 'win') {
        tally.decisive++; tally.wins[match.winner]++; if (match.winner === 0) tally.firstPlayerWins++;
        tally.turnSum += match.turns; tally.turnMin = Math.min(tally.turnMin,match.turns); tally.turnMax = Math.max(tally.turnMax,match.turns);
        tally.turnHistogram.set(match.turns,(tally.turnHistogram.get(match.turns) || 0) + 1);
      } else if (status === 'error') tally.errors++;
      else tally.unfinished++;
      for (const metric of ['captures','kills','damage']) tally[metric] += match[metric][0] + match[metric][1];
      for (const type of Object.keys(match.actions)) tally.actions[type] = (tally.actions[type] || 0) + match.actions[type];
      for (let seat = 0; seat < 2; seat++) {
        bumpEntry(byDeck[match.deckIds[seat]],match,seat);
        bumpEntry(byFaction[match.factions[seat]],match,seat);
        for (const cardId of Object.keys(current.cards[seat])) {
          const row = current.cards[seat][cardId], key = `${row.deckId}:${cardId}`;
          if (!aggregateCards[key]) aggregateCards[key] = { ...row };
          else for (const metric of METRICS) aggregateCards[key][metric] += row[metric];
        }
      }
      const [deckA,deckB] = match.deckIds.slice().sort(), key = `${deckA}:${deckB}`;
      if (!byMatchup[key]) byMatchup[key] = { deckA,deckB,nameA:decks[deckA].name,nameB:decks[deckB].name,played:0,decisive:0,winsA:0,winsB:0,unfinished:0,errors:0,winRateA:null,winIntervalA:null,seatsA:[0,0] };
      const matchup = byMatchup[key]; matchup.played++;
      // For mirrors, A is the first seat. Deck/faction aggregates correctly count
      // both appearances; the matchup remains a single game with one winner.
      const seatA = match.deckIds[0] === deckA ? 0 : 1; matchup.seatsA[seatA]++;
      if (status === 'win') { matchup.decisive++; if (match.winner === seatA) matchup.winsA++; else matchup.winsB++; }
      else if (status === 'error') matchup.errors++; else matchup.unfinished++;
      current = null;
    }
    function summary() {
      const sorted = [...tally.turnHistogram.entries()].sort((a,b) => a[0]-b[0]);
      let offset = 0, median = null;
      if (tally.decisive) {
        const lower = Math.floor((tally.decisive - 1) / 2), upper = Math.floor(tally.decisive / 2);
        let lowerValue,upperValue;
        for (const [turn,count] of sorted) {
          if (lowerValue === undefined && offset + count > lower) lowerValue = turn;
          if (offset + count > upper) { upperValue = turn; break; }
          offset += count;
        }
        median = (lowerValue + upperValue) / 2;
      }
      return {
        matches:tally.matches,decisive:tally.decisive,unfinished:tally.unfinished,errors:tally.errors,wins:tally.wins.slice(),
        firstPlayerWins:tally.firstPlayerWins,firstPlayerWinRate:tally.decisive ? tally.firstPlayerWins/tally.decisive : null,
        firstPlayerWinInterval:interval(tally.firstPlayerWins,tally.decisive),
        turns:{min:tally.decisive ? tally.turnMin : null,mean:tally.decisive ? tally.turnSum/tally.decisive : null,median,max:tally.decisive ? tally.turnMax : null},
        captures:tally.captures,kills:tally.kills,damage:tally.damage,actions:{...tally.actions},
        byDeck:Object.values(byDeck).map(decorateEntry),byFaction:Object.values(byFaction).map(decorateEntry),
        byMatchup:Object.values(byMatchup).map(row => ({...row,seatsA:row.seatsA.slice(),winRateA:row.decisive ? row.winsA/row.decisive : null,winIntervalA:interval(row.winsA,row.decisive)})),
        cards:Object.values(aggregateCards).map(row => ({...row,playRate:row.drawn ? row.plays/row.drawn : null}))
      };
    }
    const run = {
      get done() { return matches.length >= options.count; },
      get completed() { return matches.length; },
      get total() { return options.count; },
      step() {
        if (run.done) return false;
        if (!current) {
          const spec = scheduledMatch(options,schedule,matches.length);
          current = { spec,options,decks,state:null,decisions:0,actions:{},cards:spec.deckIds.map(id => cardCounters(decks[id])) };
          try {
            current.state = makeState(spec,options,decks);
            current.inventory = [inventory(current.state,0),inventory(current.state,1)];
            recordInitial(current);
            if (options.verify) verifyState(current);
          } catch (error) { finalize('error',String(error && error.message || error)); }
          return true;
        }
        if (current.state.winner !== null) { finalize('win'); return true; }
        if (current.state.turn > options.maxTurns) { finalize('turnLimit'); return true; }
        if (current.decisions >= options.maxDecisions) { finalize('decisionLimit'); return true; }
        try {
          const before = current.state;
          const action = AI.chooseAction(before);
          if (!action) throw new Error('AI did not return an action.');
          const result = Engine.dispatch(before,action);
          if (!result.ok) throw new Error(`Illegal AI action ${JSON.stringify(action)}: ${result.error}`);
          current.state = result.state; current.decisions++;
          current.actions[action.type] = (current.actions[action.type] || 0) + 1;
          recordDecision(current,before,current.state,action);
          if (options.verify) verifyState(current);
        } catch (error) { finalize('error',String(error && error.message || error)); }
        return true;
      },
      snapshot() {
        return { options:copy(options),total:options.count,completed:matches.length,complete:run.done,
          current:current && current.state ? {index:current.spec.index,seed:current.spec.seed,deckIds:current.spec.deckIds.slice(),turn:current.state.turn,decisions:current.decisions} : null,
          recentMatches:copy(matches.slice(-50)),summary:summary() };
      },
      result() {
        return { schemaVersion:1,simulatorVersion:VERSION,aiVersion:AI_VERSION,options:copy(options),total:options.count,
          completed:matches.length,complete:run.done,rulesSnapshot:rulesSnapshot(options,decks),summary:summary(),matches:copy(matches),
          method:'Deterministic baseline AI versus itself. Cutoffs and errors are excluded from decisive win rates. Card metrics describe usage and exposure; they do not estimate causal card strength. Mirrors count two deck/faction appearances and one matchup game. Confidence intervals are Wilson 95% descriptive intervals; paired deterministic trials are not independent human samples.',
          schedule:options.mode === 'matrix' ? 'All starter decks, paired opposing seats per seed. Exact requested total; partial schedule cycles may have unequal samples. Swap seats option only affects duel mode.' : options.swapSeats ? 'Paired same-seed opposing seats; an odd total leaves one extra original-seat match.' : 'Fixed original seats; distinct deterministic seeds.' };
      }
    };
    return run;
  }

  function replayMatch(report,index,limit) {
    if (!report || report.schemaVersion !== 1 || !Array.isArray(report.matches)) throw new Error('Choose a valid simulator report.');
    if (!report.matches.length) throw new Error('There are no completed matches to replay.');
    const matchIndex = integer(index,0,0,report.matches.length-1,'Replay match index');
    const actionLimit = integer(limit,5000,1,5000,'Replay action limit');
    const options = normalizeOptions(report.options), decks = Object.fromEntries(getDecks().map(deck => [deck.id,deck]));
    const currentRules = rulesSnapshot(options,decks);
    if (!report.rulesSnapshot || report.aiVersion !== AI_VERSION || report.simulatorVersion !== VERSION
      || report.rulesSnapshot.rulesVersion !== currentRules.rulesVersion
      || ['engineFingerprint','aiFingerprint','dataFingerprint'].some(key => report.rulesSnapshot[key] !== currentRules[key])
      || ['cards','decks','config'].some(key => JSON.stringify(report.rulesSnapshot[key]) !== JSON.stringify(currentRules[key]))) {
      throw new Error('This report uses different rules, cards, or AI. Replay it with its original build.');
    }
    const original = report.matches[matchIndex], spec = {index:original.index,seed:original.seed,deckIds:original.deckIds.slice()};
    const current = {spec,options,decks,state:makeState(spec,options,decks),decisions:0,actions:{}};
    const actions = [];
    let status,error;
    while (true) {
      if (current.state.winner !== null) { status = 'win'; break; }
      if (current.state.turn > options.maxTurns) { status = 'turnLimit'; break; }
      if (current.decisions >= options.maxDecisions) { status = 'decisionLimit'; break; }
      if (current.decisions >= actionLimit) { status = 'replayLimit'; break; }
      try {
        const actor = Engine.getActor(current.state), action = AI.chooseAction(current.state);
        if (!action) throw new Error('AI did not return an action.');
        const item = current.state.players[actor].hand.find(entry => entry.uid === action.handUid)
          || current.state.units.find(unit => unit.uid === action.unitUid || unit.uid === action.guardUid);
        const target = current.state.units.find(unit => unit.uid === action.targetUid);
        actions.push({decision:current.decisions+1,turn:current.state.turn,actor,action:copy(action),
          cardId:item ? item.cardId : null,cardName:item ? Data.CARDS[item.cardId].name : null,
          targetCardId:target ? target.cardId : null,targetName:target ? Data.CARDS[target.cardId].name : null,
          territoryName:action.territory !== undefined ? current.state.territories[action.territory].name : target ? current.state.territories[target.territory].name : null});
        const dispatched = Engine.dispatch(current.state,action);
        if (!dispatched.ok) throw new Error(dispatched.error);
        current.state = dispatched.state; current.decisions++;
        current.actions[action.type] = (current.actions[action.type] || 0) + 1;
      } catch (problem) { status='error';error=String(problem && problem.message || problem);break; }
    }
    return {match:matchSummary(current,status,error),actions,log:copy(current.state.log),truncated:status === 'replayLimit',
      final:{turn:current.state.turn,contested:current.state.contested,winner:current.state.winner,response:copy(current.state.response),
        territories:copy(current.state.territories),units:copy(current.state.units),
        players:current.state.players.map((player,seat) => ({id:player.id,faction:player.faction,deckCount:player.deck.length,hand:copy(player.hand),discard:copy(player.discard),presence:Engine.presence(current.state,seat)}))} };
  }
  function csvValue(value) {
    let text = value === null || value === undefined ? '' : String(value);
    // Prevent exported player-visible labels being interpreted as spreadsheet
    // formulae when future custom deck names are introduced.
    if (/^[=+@\-]/.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g,'""')}"` : text;
  }
  function csv(headers,rows) { return [headers.join(','),...rows.map(row => row.map(csvValue).join(','))].join('\r\n') + '\r\n'; }
  function matchesCSV(report) {
    return csv(['index','seed','p1_deck','p2_deck','p1_faction','p2_faction','status','winner_seat','winner_deck','turns','decisions','p1_captures','p2_captures','p1_kills','p2_kills','p1_damage','p2_damage','p1_territories','p2_territories','error'],
      report.matches.map(match => [match.index,match.seed,...match.deckIds,...match.factions,match.status,match.winner === null ? '' : match.winner+1,match.winnerDeck,match.turns,match.decisions,...match.captures,...match.kills,...match.damage,...match.finalTerritories,match.error]));
  }
  function cardsCSV(report) {
    const headers = ['deckId','cardId','name','faction','type','copiesPerDeck',...METRICS,'playRate'];
    return csv(headers,report.summary.cards.map(row => headers.map(key => row[key])));
  }
  return { VERSION,AI_VERSION,getDecks,normalizeOptions,createRun,replayMatch,matchesCSV,cardsCSV };
});
