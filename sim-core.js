/* Headless balance laboratory. The game engine remains authoritative. */
(function (root, factory) {
  'use strict';
  const node = typeof module === 'object' && module.exports;
  const api = factory(node ? require('./data.js') : root.FrontlinesData,
    node ? require('./engine.js') : root.FrontlinesEngine,
    node ? require('./ai.js') : root.FrontlinesAI,node ? require('./telemetry.js') : root.FrontlinesTelemetry,
    node ? require('./analytics.js') : root.FrontlinesAnalytics);
  if (node) module.exports = api;
  root.FrontlinesSimulator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Data, Engine, AI, Telemetry, Analytics) {
  'use strict';
  const VERSION = '4.0.0';
  const AI_VERSION = AI.VERSION || 'frontlines-heuristic-sprint2-v1';
  const copy = value => JSON.parse(JSON.stringify(value));
  function gameVersion() {
    if(typeof module==='object'&&module.exports)return require('./package.json').version;
    return globalThis.FrontlinesBuild && globalThis.FrontlinesBuild.version || globalThis.FrontlinesShellState && globalThis.FrontlinesShellState.VERSION || globalThis.FrontlinesRuntime && globalThis.FrontlinesRuntime.version || null;
  }
  const CONFIG_LIMITS = {
    startingCommand: [1,1000], commandGrowth: [0,100], commandCap: [1,1000],
    captureThreshold: [1,1000], startingHand: [1,50], drawCount: [0,20],
    slotsPerTerritory: [1,20], actionLimit: [1,20], victoryTerritories: [4,7]
  };
  const DEFAULT_THRESHOLDS = {minSamples:30,healthyLow:.47,healthyHigh:.53,watchLow:.44,watchHigh:.56,
    criticalLow:.40,criticalHigh:.60,matchupLow:.35,matchupHigh:.65,seatLow:.45,seatHigh:.55,
    shortTurns:12,longTurns:60,rarelyPlayedRate:.10,strandedRate:.60,efficientPressure:2};
  function balanceAPI() {
    if (typeof module === 'object' && module.exports) {
      try {return require('./balance.js');} catch(error) {if (error.code !== 'MODULE_NOT_FOUND') throw error;}
    }
    return typeof globalThis !== 'undefined' ? globalThis.FrontlinesBalance : null;
  }
  function getBalanceProfiles() {const balance = balanceAPI();return balance ? balance.getProfiles() : [{id:'baseline',name:'Sprint 3 baseline',version:'sprint2-original',changes:{}}];}
  function runtimeFor(id) {
    const balance = balanceAPI();
    if (balance) return balance.createRuntime(id);
    if (id !== 'baseline') throw new Error(`Unknown balance profile: ${id}.`);
    return {data:Data,engine:Engine,ai:AI,profile:getBalanceProfiles()[0]};
  }

  function getDecks(data) {
    data = data || Data;
    return Object.keys(data.FACTIONS).filter(id => data.DECKS[id]).map(faction => ({
      id: `${faction}-starter`, name: `${data.FACTIONS[faction].name} Starter`,
      faction, cards: data.DECKS[faction].slice()
    }));
  }
  function deckAPI(data) {
    const api=typeof module==='object'&&module.exports?require('./decks.js'):globalThis.FrontlinesDecks;
    return api.forData(data||Data);
  }
  function getDeckCatalog(data,customDecks) {
    const library=deckAPI(data),catalog=library.starters().concat(library.presets(),data?.RULES?.commanders&&library.commanderStarters?library.commanderStarters():[]);
    for(const raw of customDecks||[]) {
      if(!raw||typeof raw.id!=='string'||!/^[-\w]{1,100}$/.test(raw.id)||catalog.some(d=>d.id===raw.id))throw new Error('Custom decks need distinct valid IDs.');
      const result=library.validate(raw);if(!result.legal)throw new Error('Illegal deck '+String(raw.name||raw.id)+': '+result.errors.join(' '));
      catalog.push({id:raw.id,name:raw.name.trim(),faction:raw.faction,cards:raw.cards.slice(),archetype:typeof raw.archetype==='string'?raw.archetype.slice(0,80):'custom',source:'saved',...(data?.RULES?.commanders?{commanderId:raw.commanderId||library.starters().find(d=>d.faction===raw.faction).commanderId}: {})});
    }
    return catalog;
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
  function deckId(value, fallback, catalog) {
    const id = value === undefined ? fallback : value;
    const found = (catalog||getDecks()).find(deck => deck.id === id || deck.faction === id);
    if (!found) throw new Error(`Unknown deck: ${String(id)}.`);
    return found.id;
  }
  function normalizeOptions(raw) {
    raw = raw || {};
    if (typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Simulation options must be an object.');
    const mode = raw.mode === undefined ? 'duel' : raw.mode;
    if (mode !== 'duel' && mode !== 'matrix') throw new Error('Mode must be duel or matrix.');
    const balanceProfile = raw.balanceProfile || 'baseline';
    const runtime = runtimeFor(balanceProfile);
    if(raw.customDecks!==undefined&&(!Array.isArray(raw.customDecks)||raw.customDecks.length>200))throw new Error('Custom deck library must contain at most 200 decks.');
    const catalog=getDeckCatalog(runtime.data,raw.customDecks);
    const customDecks=catalog.filter(d=>d.source==='saved');
    const deckPool=raw.deckPool===undefined?getDecks(runtime.data).map(d=>d.id):raw.deckPool;
    if(!Array.isArray(deckPool)||!deckPool.length||deckPool.length>200||new Set(deckPool).size!==deckPool.length||deckPool.some(id=>!catalog.some(d=>d.id===id)))throw new Error('Select a valid, distinct tournament deck pool.');
    if(mode==='matrix'&&deckPool.length<2&&!raw.includeMirrors)throw new Error('A tournament needs at least two decks, or enable mirrors.');
    const aiProfiles = raw.aiProfiles || [raw.ai || 'baseline',raw.ai || 'baseline'];
    if (!Array.isArray(aiProfiles) || aiProfiles.length !== 2 || aiProfiles.some(id => !['baseline','faction','random','deck'].includes(id))) throw new Error('Choose baseline, faction, deck, or random AI for each seat.');
    const thresholds = {...DEFAULT_THRESHOLDS};
    for (const [key,value] of Object.entries(raw.thresholds || {})) {
      if (!(key in thresholds) || !Number.isFinite(value) || value < 0 || (key.endsWith('Low') || key.endsWith('High') || key.endsWith('Rate')) && value > 1) throw new Error(`Invalid diagnostic threshold: ${key}.`);
      thresholds[key] = value;
    }
    for (const [low,high] of [['healthyLow','healthyHigh'],['watchLow','watchHigh'],['criticalLow','criticalHigh'],['matchupLow','matchupHigh'],['seatLow','seatHigh']]) if (thresholds[low] > thresholds[high]) throw new Error(`${low} cannot exceed ${high}.`);
    const config = {};
    if (raw.config !== undefined && (!raw.config || typeof raw.config !== 'object' || Array.isArray(raw.config))) throw new Error('Rules configuration must be an object.');
    const overrides = raw.config || {};
    for (const key of Object.keys(overrides)) if (!CONFIG_LIMITS[key]) throw new Error(`Unknown rules setting: ${key}.`);
    for (const key of Object.keys(CONFIG_LIMITS)) {
      config[key] = integer(overrides[key], runtime.data.DEFAULT_CONFIG[key], CONFIG_LIMITS[key][0], CONFIG_LIMITS[key][1], key);
    }
    if (config.commandCap < config.startingCommand) throw new Error('Command cap cannot be lower than starting Command Presence.');
    return {
      mode, count: integer(raw.count, 100, 1, 100000, 'Match count'),
      deckA: deckId(raw.deckA, 'stonewall-starter',catalog), deckB: deckId(raw.deckB, 'bruiser-starter',catalog),customDecks:copy(customDecks),deckPool:deckPool.slice(),
      swapSeats: boolean(raw.swapSeats, true, 'Swap seats'),
      includeMirrors: boolean(raw.includeMirrors, false, 'Include mirrors'),
      seed: integer(raw.seed, 1009, 0, 4294967295, 'Seed'),
      maxTurns: integer(raw.maxTurns, 240, 1, 2000, 'Turn limit'),
      maxDecisions: integer(raw.maxDecisions, 10000, 1, 100000, 'Decision limit'),
      verify: boolean(raw.verify, false, 'Verify invariants'),balanceProfile,aiProfiles:aiProfiles.slice(),thresholds,config
    };
  }

  function scheduleFor(options) {
    if (options.mode === 'duel') return [{ a: options.deckA, b: options.deckB, group: 0 }];
    const ids = options.deckPool;
    const result = [];
    let group = 0;
    for (let a = 0; a < ids.length; a++) {
      if (options.includeMirrors) result.push({ a: ids[a], b: ids[a], group: group++ });
      for (let b = a + 1; b < ids.length; b++) {
        result.push({a:ids[a],b:ids[b],group,swapped:false},{a:ids[b],b:ids[a],group,swapped:true});
        group++;
      }
    }
    return result;
  }
  function scheduledMatch(options, schedule, index) {
    let a, b, seedGroup,swapped=false;
    if (options.mode === 'duel') {
      swapped = options.swapSeats && index % 2 === 1;
      a = swapped ? options.deckB : options.deckA;
      b = swapped ? options.deckA : options.deckB;
      seedGroup = options.swapSeats ? Math.floor(index / 2) : index;
    } else {
      const item = schedule[index % schedule.length];
      a = item.a; b = item.b;
      swapped=!!item.swapped;
      const groupsPerCycle = Math.max(...schedule.map(pair => pair.group)) + 1;
      seedGroup = Math.floor(index / schedule.length) * groupsPerCycle + item.group;
    }
    return {index,deckIds:[a,b],aiProfiles:swapped?options.aiProfiles.slice().reverse():options.aiProfiles.slice(),seed:(options.seed+Math.imul(seedGroup,0x9e3779b9))>>>0};
  }

  // Explicit immutable deck lists enter the same authoritative setup as live play.
  function makeState(spec, options, decks, runtime) {
    return (runtime || {engine:Engine}).engine.createGame({ factions: spec.deckIds.map(id => decks[id].faction), decks:spec.deckIds.map(id=>decks[id]), seed: spec.seed, config: options.config });
  }
  function inventory(state, seat) {
    const player = state.players[seat];
    const counts = {};
    const cards = player.deck.concat(player.discard, player.hand.map(item => item.cardId), state.units.filter(unit => unit.owner === seat).map(unit => unit.cardId));
    for (const id of cards) counts[id] = (counts[id] || 0) + 1;
    return counts;
  }
  function verifyState(current) {
    (current.runtime || {engine:Engine}).engine.assertInvariants(current.state);
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
      ...(current.runtime.data.RULES?.commanders?{commanderIds:current.spec.deckIds.map(id=>current.decks[id].commanderId)}:{}),
      aiProfiles:current.spec.aiProfiles ? current.spec.aiProfiles.slice() : current.options.aiProfiles.slice(),balanceProfile:current.options.balanceProfile,
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
  const seatStats=()=>({played:0,decisive:0,won:0,lost:0,ties:0,winRate:null});
  function entry(id, name, faction) {
    return {id,name,faction,played:0,decisive:0,won:0,lost:0,ties:0,unfinished:0,errors:0,turnSum:0,winRate:null,winInterval:null,seats:[seatStats(),seatStats()]};
  }
  function bumpEntry(row, match, seat) {
    row.played++; row.seats[seat].played++;
    if (match.status === 'win') {
      row.decisive++; row.seats[seat].decisive++;
      row.turnSum+=match.turns;
      const key = match.winner === seat ? 'won' : 'lost';
      row[key]++; row.seats[seat][key]++;
    } else if (match.status === 'error') row.errors++;
    else row.unfinished++;
  }
  function decorateEntry(row) {
    const result = copy(row);
    result.winRate = row.decisive ? row.won / row.decisive : null;
    result.winInterval = interval(row.won, row.decisive);
    result.meanTurns=row.decisive?row.turnSum/row.decisive:null;
    for (const seat of result.seats){seat.winRate=seat.decisive?seat.won/seat.decisive:null;seat.winInterval=interval(seat.won,seat.decisive);}
    return result;
  }
  function rulesSnapshot(options, decks, runtime) {
    runtime = runtime || {data:Data,engine:Engine,ai:AI,profile:{id:'baseline',version:'sprint2-original'}};
    const D = runtime.data,E = runtime.engine,A = runtime.ai;
    const separated = D.RULES && D.RULES.actionEconomy === 'capacity-command';
    const retreat = D.RULES && D.RULES.frontlineIntegrity === true;
    return { gameVersion:gameVersion(),rules:copy(D.RULES || {}),config:copy(options.config),factions:copy(D.FACTIONS),cards:copy(D.CARDS),decks:copy(Object.values(decks)),
      ...(D.RULES?.commanders?{commanders:copy(E.commanders.COMMANDERS),commanderVersion:E.commanders.VERSION}:{}),
      balanceProfile:copy(runtime.profile),aiProfiles:options.aiProfiles.slice(),telemetryVersion:Telemetry && Telemetry.VERSION,
      territoryNames:D.TERRITORY_NAMES.slice(),glossary:copy(D.GLOSSARY),
      mechanics:{
        economy:'Available Presence = Command minus deployed card Presence minus spent Orders. Subsequent own offensive turns grow Command to the configured cap and clear spent Presence. Casualties immediately free commitment.',
        battlefield:'Seven territories: Player 1 initially owns sectors 0–2, sector 3 is neutral, and Player 2 initially owns sectors 4–6. The contested objective moves one territory on capture.',
        actions:separated?'Card deployment/action Orders pay their explicit commandCost (ordinary deployments and heal/draw/reclaim support: 0; leaders, listed Heavy/command assets and tactical Orders: 1). Moves and attacks cost 1 Command Action. Responses/counters cost 0 commands. All card plays require Capacity. Zero commands still permits Free Actions. Deployment-turn attack restrictions remain.':'Deploy, move, attack and action Orders each consume one major action. Responses and counters consume no major action but card Orders spend Presence. Units normally cannot attack on their deployment turn without Rush.',
        combat:'Same-territory attacks open response and optional counter windows. Combat damage is simultaneous after those windows, with persistent wounds and card-defined traits. Lethal ambush can remove the attacker before combat.',
        capture:'Only the ending offensive player adds printed frontline unit Presence to their progress, including when enemies are present. At the configured threshold they secure the objective, reset progress, and move the frontline.',
        breakthrough:'After a nonwinning capture, surviving non-assets advance one adjacent into the new objective, filling friendly slots in unit order and preserving wounds/readiness. Assets and overflow remain.',
        retreat:retreat?'After capture, enemy survivors resolve in ascending UID order before the frontline moves. Units retreat exactly one territory toward home into friendly-owned ground with a free friendly slot. Wounds remain and retreat exhausts; immobile assets and units with no legal retreat are eliminated, freeing commitment.':'Historical rule: surviving defenders stay in the captured territory and may later move toward the objective.',
        victory:'A player wins by capturing the opponent home sector or controlling the configured number of territories. No player health total determines victory.',
        reserves:'Draw configured opening and own-turn cards. Empty reserves recycle casualty and spent Order discards; if both reserve and discard are empty, drawing safely stops.',
        ...(D.RULES?.commanders?{commanders:'Exactly one off-lane Commander per deck, outside the 26 cards and battlefield Presence. Each has a catalog-defined passive and a once-per-match active requiring 1 Command Action and its printed available Capacity. Same public rules and legal targets apply to human and AI. Historical profiles disable Commander effects.'}:{}),
        ...(D.RULES?.arsenalMechanics?{arsenal:'Armor reduces regular combat damage by 1 anywhere (maximum with temporary Reinforce Armor, plus positional Fortify). Mark adds 1 to positive incoming regular combat until the target owner’s next offensive turn; Reinforce heals and protects until the friendly owner’s next turn. Direct Orders, Ambush and separate Retaliate ignore Armor/Mark. Adapt requires an explicit mode; only the chosen ordinary effect resolves at the shared printed cost.'}:{})
      },
      rulesVersion:D.RULES?.commanders?'sprint9-commanders-v1':D.RULES?.arsenalMechanics?'sprint7-arsenal-v1':separated || retreat?'sprint6-command-frontline-v1':'sprint4-territory-arsenal-v1',
      engineVersion:E.VERSION || 'frontlines-territory-v1',aiVersion:A.VERSION || AI_VERSION,
      engineFingerprint:fingerprint(String(E.createGame)+String(E.dispatch)+String(E.legalActions)+String(E.validate)+String(E.actionCost)+String(E.retreatDestination)+(D.RULES?.commanders?String(E.commanderStatus):'')+(D.RULES?.arsenalMechanics?String(E.resolveEffect)+String(E.combatDamage):'')),
      aiFingerprint:fingerprint(String(A.chooseAction)),
      dataFingerprint:fingerprint(JSON.stringify({cards:D.CARDS,decks:D.DECKS,config:D.DEFAULT_CONFIG,rules:D.RULES||{},...(D.RULES?.commanders?{commanders:E.commanders.COMMANDERS}: {})})) };
  }
  function fingerprint(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
    return (hash >>> 0).toString(16).padStart(8,'0');
  }

  function createRun(raw) {
    const options = normalizeOptions(raw);
    const runtime=runtimeFor(options.balanceProfile),E=runtime.engine,A=runtime.ai;
    const schedule = scheduleFor(options);
    const activeIds=options.mode==='matrix'?options.deckPool:[options.deckA,options.deckB];
    const decks = Object.fromEntries(getDeckCatalog(runtime.data,options.customDecks).filter(d=>activeIds.includes(d.id)).map(deck => [deck.id,deck]));
    const matches = [], aggregateCards = {}, byDeck = {}, byFaction = {}, byFactionCross = {}, byMatchup = {},byArchetype={},byCommander={},synergies={};
    for (const deck of Object.values(decks)) {
      byDeck[deck.id] = entry(deck.id,deck.name,deck.faction);
      if(runtime.data.RULES?.commanders){const c=E.commanders.get(deck.commanderId);byDeck[deck.id].commanderId=c.id;byCommander[c.id]=byCommander[c.id]||{...entry(c.id,c.name,c.faction),activeUses:0,passiveTriggers:0,passiveAmount:0,presenceSpent:0,commandActionsSpent:0,damageDealt:0,effectiveDamageDealt:0,healingDone:0,cardsRecovered:0,capacityRecovered:0,disruptionApplied:0,presenceSaved:0,commandActionsSaved:0,bonusPressure:0,passiveCardsDrawn:0,activationTurnSum:0};}
      byFaction[deck.faction] = entry(deck.faction,Data.FACTIONS[deck.faction].name,deck.faction);
      byFactionCross[deck.faction] = entry(deck.faction,Data.FACTIONS[deck.faction].name,deck.faction);
      const strategy=deck.faction+':'+(deck.archetype||'custom');byArchetype[strategy]=entry(strategy,deck.archetype||'custom',deck.faction);
    }
    const tally = { matches:0,decisive:0,unfinished:0,errors:0,wins:[0,0],firstPlayerWins:0,
      captures:0,kills:0,damage:0,actions:{},turnSum:0,turnHistogram:new Map(),turnMin:Infinity,turnMax:0 };
    let current = null;
    const advanced=Analytics.createAccumulator(options);
    function finalize(status,error) {
      const match = matchSummary(current,status,error);
      const metrics=current.tracker&&current.state?current.tracker.finish(current.state):null;
      advanced.add(match,metrics);
      if(metrics){match.diagnostics=compactDiagnostics(metrics);if(metrics.commanders)match.commanderUsage=copy(metrics.commanders);}
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
        if(match.commanderIds){const commander=byCommander[match.commanderIds[seat]],usage=metrics?.commanders?.[seat];bumpEntry(commander,match,seat);if(usage){for(const key of ['activeUses','passiveTriggers','passiveAmount','presenceSpent','commandActionsSpent','damageDealt','effectiveDamageDealt','healingDone','cardsRecovered','capacityRecovered','disruptionApplied','presenceSaved','commandActionsSaved','bonusPressure','passiveCardsDrawn'])commander[key]+=usage[key];if(usage.activeTurn!==null)commander.activationTurnSum+=usage.activeTurn;}}
        bumpEntry(byFaction[match.factions[seat]],match,seat);
        if(match.factions[0]!==match.factions[1])bumpEntry(byFactionCross[match.factions[seat]],match,seat);
        const deck=decks[match.deckIds[seat]],strategy=deck.faction+':'+(deck.archetype||'custom');bumpEntry(byArchetype[strategy],match,seat);
        if(status==='win') {
          const played=[...(current.playedCards?.[seat]||[])].sort();
          for(let a=0;a<played.length;a++)for(let b=a+1;b<played.length;b++){
            const key=deck.id+':'+played[a]+':'+played[b];
            const row=synergies[key]||(synergies[key]={deckId:deck.id,cardA:played[a],cardB:played[b],matches:0,wins:0,territorySwingSum:0});
            row.matches++;if(match.winner===seat)row.wins++;row.territorySwingSum+=Math.abs(match.finalTerritories[seat]-3);
          }
        }
      }
      const [deckA,deckB] = match.deckIds.slice().sort(), key = `${deckA}:${deckB}`;
      if (!byMatchup[key]) byMatchup[key] = {deckA,deckB,nameA:decks[deckA].name,nameB:decks[deckB].name,played:0,decisive:0,winsA:0,winsB:0,ties:0,unfinished:0,errors:0,
        turnSum:0,firstPlayerWins:0,winRateA:null,winIntervalA:null,seatsA:[0,0],seatStatsA:[seatStats(),seatStats()]};
      const matchup = byMatchup[key]; matchup.played++;
      // For mirrors, A is the first seat. Deck/faction aggregates correctly count
      // both appearances; the matchup remains a single game with one winner.
      const seatA = match.deckIds[0] === deckA ? 0 : 1; matchup.seatsA[seatA]++;
      matchup.seatStatsA[seatA].played++;
      if(status==='win'){matchup.decisive++;matchup.turnSum+=match.turns;if(match.winner===0)matchup.firstPlayerWins++;
        matchup.seatStatsA[seatA].decisive++;if(match.winner===seatA){matchup.winsA++;matchup.seatStatsA[seatA].won++;}else{matchup.winsB++;matchup.seatStatsA[seatA].lost++;}}
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
      const base={
        matches:tally.matches,decisive:tally.decisive,unfinished:tally.unfinished,errors:tally.errors,wins:tally.wins.slice(),
        firstPlayerWins:tally.firstPlayerWins,firstPlayerWinRate:tally.decisive ? tally.firstPlayerWins/tally.decisive : null,
        firstPlayerWinInterval:interval(tally.firstPlayerWins,tally.decisive),
        turns:{min:tally.decisive ? tally.turnMin : null,mean:tally.decisive ? tally.turnSum/tally.decisive : null,median,max:tally.decisive ? tally.turnMax : null},
        captures:tally.captures,kills:tally.kills,damage:tally.damage,actions:{...tally.actions},
        byDeck:Object.values(byDeck).map(decorateEntry),byFaction:Object.values(byFaction).map(decorateEntry),byFactionCross:Object.values(byFactionCross).map(decorateEntry),
        byMatchup:Object.values(byMatchup).map(row=>({...row,seatsA:row.seatsA.slice(),seatStatsA:row.seatStatsA.map(seat=>({...seat,winRate:seat.decisive?seat.won/seat.decisive:null,winInterval:interval(seat.won,seat.decisive)})),
          winRateA:row.decisive?row.winsA/row.decisive:null,winIntervalA:interval(row.winsA,row.decisive),
          meanTurns:row.decisive?row.turnSum/row.decisive:null,firstPlayerWinRate:row.decisive?row.firstPlayerWins/row.decisive:null})),
        byArchetype:Object.values(byArchetype).map(decorateEntry),
        ...(runtime.data.RULES?.commanders?{byCommander:Object.values(byCommander).map(row=>({...decorateEntry(row),activationRate:row.played?row.activeUses/row.played:null,meanActivationTurn:row.activeUses?row.activationTurnSum/row.activeUses:null}))}:{}),
        deckCompositions:Object.values(decks).map(d=>({id:d.id,name:d.name,archetype:d.archetype||'custom',...deckAPI(runtime.data).composition(d)})),
        synergies:Object.values(synergies).map(row=>({...row,winRate:row.wins/row.matches,winInterval:interval(row.wins,row.matches),averageFinalTerritorySwing:row.territorySwingSum/row.matches})).sort((a,b)=>b.matches-a.matches),cards:[]
      };
      return {...base,...advanced.summary(base)};
    }
    const run = {
      get done() { return matches.length >= options.count; },
      get completed() { return matches.length; },
      get total() { return options.count; },
      step() {
        if (run.done) return false;
        if (!current) {
          const spec = scheduledMatch(options,schedule,matches.length);
          current = {spec,options,decks,runtime,state:null,decisions:0,actions:{},playedCards:[new Set(),new Set()]};
          try {
            current.state=makeState(spec,options,decks,runtime);
            current.inventory = [inventory(current.state,0),inventory(current.state,1)];
            current.tracker=Telemetry.createTracker({data:runtime.data,engine:E,state:current.state,decks:spec.deckIds,aiProfiles:spec.aiProfiles});
            if (options.verify) verifyState(current);
          } catch (error) { finalize('error',String(error && error.message || error)); }
          return true;
        }
        if (current.state.winner !== null) { finalize('win'); return true; }
        if (current.state.turn > options.maxTurns) { finalize('turnLimit'); return true; }
        if (current.decisions >= options.maxDecisions) { finalize('decisionLimit'); return true; }
        try {
          const before = current.state;
          const actor=E.getActor(before);
          let legalActions;
          if(!before.response&&current.opportunityTurn!==before.turn){legalActions=E.legalActions(before);current.opportunityTurn=before.turn;}
          let decision;
          const action=A.chooseAction(before,{profile:current.spec.aiProfiles[actor],legalActions,onDecision:value=>{decision=value;}});
          if (!action) throw new Error('AI did not return an action.');
          const result=E.dispatch(before,action,{events:true});
          if (!result.ok) throw new Error(`Illegal AI action ${JSON.stringify(action)}: ${result.error}`);
          const played=before.players[actor].hand.find(c=>c.uid===action.handUid);if(played)current.playedCards[actor].add(played.cardId);
          current.state = result.state; current.decisions++;
          current.actions[action.type] = (current.actions[action.type] || 0) + 1;
          current.tracker.record(before,current.state,action,{events:result.events,legalActions,decision});
          if (options.verify) verifyState(current);
        } catch (error) { finalize('error',String(error && error.message || error)); }
        return true;
      },
      snapshot() {
        return { options:copy(options),total:options.count,completed:matches.length,complete:run.done,
          current:current&&current.state?{index:current.spec.index,seed:current.spec.seed,deckIds:current.spec.deckIds.slice(),aiProfiles:current.spec.aiProfiles.slice(),turn:current.state.turn,decisions:current.decisions}:null,
          recentMatches:copy(matches.slice(-50)),summary:summary() };
      },
      result() {
        return {schemaVersion:1,gameVersion:gameVersion(),simulatorVersion:VERSION,aiVersion:A.VERSION||AI_VERSION,balanceVersion:runtime.profile.version,
          telemetryVersion:Telemetry.VERSION,options:copy(options),total:options.count,
          completed:matches.length,complete:run.done,rulesSnapshot:rulesSnapshot(options,decks,runtime),summary:summary(),matches:copy(matches),
          method:'Deterministic selected AI policies. Cutoffs and errors are excluded from decisive win rates. Card and pair metrics describe usage and winning-side association, not causal strength. Pair observations require both cards played in the same decisive player-game. Mirrors count two deck/faction appearances and one matchup game. Wilson 95% intervals are descriptive; paired deterministic trials are not independent human samples.',
          schedule:options.mode === 'matrix' ? 'Selected deck pool, paired opposing seats per seed. Exact requested total; partial cycles may have unequal samples. Swap seats only affects duel mode.' : options.swapSeats ? 'Paired same-seed opposing seats; an odd total leaves one extra original-seat match.' : 'Fixed original seats; distinct deterministic seeds.' };
      }
    };
    return run;
  }

  function compactDiagnostics(metrics){return {firstCaptureTurn:metrics.territory.firstCaptureTurn,winnerPermanentLeadTurn:metrics.territory.winnerPermanentLeadTurn,
    recaptures:metrics.territory.recaptures.slice(),comebackWon:metrics.comeback.map(side=>Object.keys(side).filter(key=>side[key].won)),
    commandGenerated:metrics.economy.map(side=>side.generated),casualtyReleased:metrics.economy.map(side=>side.casualtyReleased)};}

  function replayMatch(report,index,limit) {
    if (!report || report.schemaVersion !== 1 || !Array.isArray(report.matches)) throw new Error('Choose a valid simulator report.');
    if (!report.matches.length) throw new Error('There are no completed matches to replay.');
    const matchIndex = integer(index,0,0,report.matches.length-1,'Replay match index');
    const actionLimit = integer(limit,5000,1,5000,'Replay action limit');
    const options=normalizeOptions(report.options),runtime=runtimeFor(options.balanceProfile),E=runtime.engine,A=runtime.ai;
    const activeIds=options.mode==='matrix'?options.deckPool:[options.deckA,options.deckB];
    const decks=Object.fromEntries(getDeckCatalog(runtime.data,options.customDecks).filter(d=>activeIds.includes(d.id)).map(deck=>[deck.id,deck]));
    const currentRules=rulesSnapshot(options,decks,runtime);
    if (!report.rulesSnapshot || report.aiVersion !== (A.VERSION||AI_VERSION) || report.simulatorVersion !== VERSION
      || report.rulesSnapshot.rulesVersion !== currentRules.rulesVersion
      || ['engineFingerprint','aiFingerprint','dataFingerprint'].some(key => report.rulesSnapshot[key] !== currentRules[key])
      || ['cards','decks','config','rules',...(currentRules.rules.commanders?['commanders']:[])].some(key => JSON.stringify(report.rulesSnapshot[key]) !== JSON.stringify(currentRules[key]))) {
      throw new Error('This report uses different rules, cards, or AI. Replay it with its original build.');
    }
    const original=report.matches[matchIndex],spec={index:original.index,seed:original.seed,deckIds:original.deckIds.slice(),aiProfiles:(original.aiProfiles||options.aiProfiles).slice()};
    const current={spec,options,decks,runtime,state:makeState(spec,options,decks,runtime),decisions:0,actions:{}};
    const tracker=Telemetry.createTracker({state:current.state,data:runtime.data,engine:E,decks:spec.deckIds,aiProfiles:spec.aiProfiles,trace:true,traceLimit:actionLimit,territoryHistory:true});
    const actions = [];
    let status,error;
    while (true) {
      if (current.state.winner !== null) { status = 'win'; break; }
      if (current.state.turn > options.maxTurns) { status = 'turnLimit'; break; }
      if (current.decisions >= options.maxDecisions) { status = 'decisionLimit'; break; }
      if (current.decisions >= actionLimit) { status = 'replayLimit'; break; }
      try {
        const actor=E.getActor(current.state),legalActions=E.legalActions(current.state);
        const decision=A.explainAction?A.explainAction(current.state,{profile:spec.aiProfiles[actor],legalActions}):null;
        const action=decision?decision.action:A.chooseAction(current.state,{profile:spec.aiProfiles[actor],legalActions});
        if (!action) throw new Error('AI did not return an action.');
        const item = current.state.players[actor].hand.find(entry => entry.uid === action.handUid)
          || current.state.units.find(unit => unit.uid === action.unitUid || unit.uid === action.guardUid);
        const target = current.state.units.find(unit => unit.uid === action.targetUid);
        actions.push({decision:current.decisions+1,turn:current.state.turn,actor,action:copy(action),
          cardId:item ? item.cardId : null,cardName:item ? runtime.data.CARDS[item.cardId].name : null,...(action.type==='commander'?{commanderId:current.state.players[actor].commander.id,commanderName:E.commanders.get(current.state.players[actor].commander.id).name}:{}),
          targetCardId:target ? target.cardId : null,targetName:target ? runtime.data.CARDS[target.cardId].name : null,
          territoryName:action.territory !== undefined ? current.state.territories[action.territory].name : target ? current.state.territories[target.territory].name : null});
        const before=current.state,dispatched=E.dispatch(before,action,{events:true});
        if (!dispatched.ok) throw new Error(dispatched.error);
        current.state = dispatched.state; current.decisions++;
        tracker.record(before,current.state,action,{events:dispatched.events,decision:decision&&{...decision,profile:spec.aiProfiles[actor]},legalActions});
        const entry=actions[actions.length-1];entry.presenceBefore=[E.presence(before,0),E.presence(before,1)];entry.presenceAfter=[E.presence(current.state,0),E.presence(current.state,1)];entry.events=dispatched.events;entry.decision=decision&&{profile:spec.aiProfiles[actor],score:decision.score,reason:decision.reason,evaluated:decision.evaluated,priorityMargin:decision.priorityMargin};
        current.actions[action.type] = (current.actions[action.type] || 0) + 1;
      } catch (problem) { status='error';error=String(problem && problem.message || problem);break; }
    }
    const metrics=tracker.finish(current.state),match=matchSummary(current,status,error);match.diagnostics=compactDiagnostics(metrics);if(metrics.commanders)match.commanderUsage=copy(metrics.commanders);
    return {match,metrics,trace:tracker.trace(),actions,log:copy(current.state.log),truncated:status==='replayLimit',
      final:{turn:current.state.turn,contested:current.state.contested,winner:current.state.winner,response:copy(current.state.response),
        territories:copy(current.state.territories),units:copy(current.state.units),
        players:current.state.players.map((player,seat) => ({id:player.id,faction:player.faction,deckCount:player.deck.length,hand:copy(player.hand),discard:copy(player.discard),presence:E.presence(current.state,seat),...(E.RULES?.commanders?{commander:copy(player.commander)}:{})}))} };
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
    return csv(['index','seed','p1_deck','p2_deck','p1_faction','p2_faction','status','winner_seat','winner_deck','turns','decisions','p1_captures','p2_captures','p1_kills','p2_kills','p1_damage','p2_damage','p1_territories','p2_territories','error','game_version','p1_commander','p2_commander'],
      report.matches.map(match => [match.index,match.seed,...match.deckIds,...match.factions,match.status,match.winner === null ? '' : match.winner+1,match.winnerDeck,match.turns,match.decisions,...match.captures,...match.kills,...match.damage,...match.finalTerritories,match.error,report.gameVersion||report.rulesSnapshot?.gameVersion||'',...(match.commanderIds||['',''])]));
  }
  function cardsCSV(report) {
    const headers=['deckId','cardId','name','faction','type','copiesPerDeck',...Telemetry.CARD_METRICS,'drawnDecisiveMatches','playedDecisiveMatches',
      'earlyPlayedDecisiveMatches','latePlayedDecisiveMatches','playRate','averageTurnDrawn','averageTurnPlayed','averagePresencePaid','averageSurvival',
      'affordablePlayRate','strandedRate','pressurePerPresence','damagePerPresence','winRateDrawn','winRatePlayed','winRateEarly','winRateLate',
      'notDrawnDecisiveMatches','multiplePlayedDecisiveMatches','winRateNotDrawn','winRateMultiplePlayed','averageAIPlayScore','averageAIPriorityMargin','averageDeploymentControlDelta','averageDeploymentCaptureDelta','game_version'];
    return csv(headers,report.summary.cards.map(row => headers.map(key => key==='game_version'?report.gameVersion||report.rulesSnapshot?.gameVersion||'':row[key])));
  }
  function commandersCSV(report) {
    const headers=['id','name','faction','played','decisive','won','lost','winRate','meanTurns','p1WinRate','p2WinRate','activeUses','activationRate','meanActivationTurn','passiveTriggers','passiveAmount',
      'presenceSpent','commandActionsSpent','damageDealt','effectiveDamageDealt','healingDone','cardsRecovered','capacityRecovered','disruptionApplied','presenceSaved','commandActionsSaved','bonusPressure','passiveCardsDrawn','game_version'];
    return csv(headers,(report.summary.byCommander||[]).map(row=>headers.map(key=>key==='game_version'?report.gameVersion||report.rulesSnapshot?.gameVersion||'':key==='p1WinRate'?row.seats[0].winRate:key==='p2WinRate'?row.seats[1].winRate:row[key])));
  }
  return {VERSION,AI_VERSION,DEFAULT_THRESHOLDS,getBalanceProfiles,getDecks,getDeckCatalog,normalizeOptions,createRun,replayMatch,matchesCSV,cardsCSV,commandersCSV,
    compareReports:Analytics.compareReports,reportHTML:Analytics.reportHTML};
});
