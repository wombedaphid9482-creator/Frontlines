(function (root) {
  'use strict';
  const Data = root.FrontlinesData;
  const Simulator = root.FrontlinesSimulator;
  const Balance = root.FrontlinesBalance;
  const $ = id => document.getElementById(id);
  const format = value => Number(value || 0).toLocaleString('en-US');
  const percent = value => value === null || value === undefined ? '—' : `${(value * 100).toFixed(1)}%`;
  const escape = value => String(value === undefined || value === null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const factionName = id => Data.FACTIONS[id] ? Data.FACTIONS[id].name : id;
  function wilson(wins,total){if(!total)return null;const z=1.959963984540054,p=wins/total,denominator=1+z*z/total,center=(p+z*z/(2*total))/denominator,margin=z*Math.sqrt(p*(1-p)/total+z*z/(4*total*total))/denominator;return {low:Math.max(0,center-margin),high:Math.min(1,center+margin)};}
  let decks = Simulator.getDeckCatalog(Data,root.FrontlinesDecks.load().filter(d=>root.FrontlinesDecks.validate(d).legal));
  let deckById = Object.fromEntries(decks.map(deck => [deck.id, deck]));
  const balanceProfiles = Balance ? Balance.getProfiles() : [{id:'baseline',name:'Baseline',description:'Original registered starter rules.'}];
  const thresholdDefinitions = {
    minSamples:['Minimum samples',false],healthyLow:['Healthy rate low',true],healthyHigh:['Healthy rate high',true],
    watchLow:['Watch rate low',true],watchHigh:['Watch rate high',true],criticalLow:['Critical rate low',true],criticalHigh:['Critical rate high',true],
    matchupLow:['Matchup rate low',true],matchupHigh:['Matchup rate high',true],seatLow:['First-seat rate low',true],seatHigh:['First-seat rate high',true],
    shortTurns:['Short match turns',false],longTurns:['Long match turns',false],rarelyPlayedRate:['Rarely played below',true],strandedRate:['Stranded above',true],efficientPressure:['Pressure / P above',false]
  };
  const thresholdDefaults = Simulator.DEFAULT_THRESHOLDS || {minSamples:30,healthyLow:.47,healthyHigh:.53,watchLow:.44,watchHigh:.56,criticalLow:.40,criticalHigh:.60,matchupLow:.35,matchupHigh:.65,seatLow:.45,seatHigh:.55,shortTurns:12,longTurns:60,rarelyPlayedRate:.10,strandedRate:.60,efficientPressure:2};
  const ruleDefinitions = {
    startingCommand: ['Starting capacity', 1, 1000], commandGrowth: ['Capacity / own turn', 0, 100],
    commandCap: ['Capacity maximum', 1, 1000], captureThreshold: ['Presence to capture', 1, 1000],
    startingHand: ['Opening hand', 1, 50], drawCount: ['Draw / own turn', 0, 20],
    slotsPerTerritory: ['Slots / side / zone', 1, 20], actionLimit: ['Actions / turn', 1, 20],
    victoryTerritories: ['Territories to win', 4, 7]
  };
  const state = {
    jobId: 0, status: 'idle', runner: null, worker: null, localRun: null, timer: null, clock: null,
    snapshot: null, report: null, options: null, activeMs: 0, activeSince: 0, wallStarted: 0,
    cardSort: 'plays', sortDescending: true, matchPage: 0, activeTab: 'overview', replayLines: [],
    workerStarted: false, startupTimer: null, lastRender: 0, previousReport: null, comparison: null, replay: null,
    room: 'home', developer: false, workspacePane: 'setup'
  };
  const live = () => ['loading', 'running', 'paused', 'stopping'].includes(state.status);
  function elapsed() {
    return state.activeMs + (state.activeSince ? performance.now() - state.activeSince : 0);
  }
  function stopClock() {
    if (state.activeSince) state.activeMs += performance.now() - state.activeSince;
    state.activeSince = 0;
  }
  function duration(milliseconds) {
    const seconds = Math.max(0, Math.floor(milliseconds / 1000));
    if (seconds >= 3600) return `${Math.floor(seconds / 3600)}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }
  function factionLabel(id) {
    const faction = Data.FACTIONS[id];
    return `<span class="faction-label"><span class="faction-swatch" style="--faction:${faction ? faction.color : '#9bada8'}" aria-hidden="true"></span>${escape(factionName(id))}</span>`;
  }
  function readOptions() {
    const config = Object.fromEntries(Object.keys(ruleDefinitions).map(key => [key, Number($(`rule-${key}`).value)]));
    return Simulator.normalizeOptions({
      mode: document.querySelector('input[name="mode"]:checked').value,
      count: Number($('match-count').value), deckA: $('deck-a').value, deckB: $('deck-b').value,
      swapSeats: $('swap-seats').checked, includeMirrors: $('include-mirrors').checked,
      seed: Number($('seed').value), maxTurns: Number($('max-turns').value),
      maxDecisions: Number($('max-decisions').value), verify: $('verify').checked, config,
      balanceProfile: $('balance-profile').value, aiProfiles: [$('ai-a').value,$('ai-b').value],
      customDecks:decks.filter(d=>d.source==='saved'),deckPool:[...$('matrix-deck-pool').selectedOptions].map(o=>o.value),
      thresholds:Object.fromEntries(Object.entries(thresholdDefinitions).map(([key,[,percentage]]) => [key,Number($(`threshold-${key}`).value)/(percentage?100:1)]))
    });
  }
  function balanceNote(resetRules) {
    const profile=balanceProfiles.find(item=>item.id===$('balance-profile').value)||balanceProfiles[0];
    $('balance-profile-note').textContent=(profile.version?profile.version+' · ':'')+(profile.description||profile.name);
    if(resetRules){const config=Balance?Balance.dataFor(profile.id).DEFAULT_CONFIG:Data.DEFAULT_CONFIG;Object.keys(ruleDefinitions).forEach(key=>{ $(`rule-${key}`).value=config[key]; });}
  }
  function applyOptions(options) {
    const radio=document.querySelector(`input[name="mode"][value="${options.mode}"]`);if(radio)radio.checked=true;
    ['a','b'].forEach((side,index)=>{const id=options[index===0?'deckA':'deckB'];if(deckById[id]){$(`faction-${side}`).value=deckById[id].faction;fillDeck(side,id);}if(options.aiProfiles)$(`ai-${side}`).value=options.aiProfiles[index];});
    $('balance-profile').value=options.balanceProfile||(Balance && Balance.DEFAULT_PROFILE)||'arsenal';
    for(const option of $('matrix-deck-pool').options)option.selected=(options.deckPool||[]).includes(option.value);
    $('match-count').value=options.count;$('seed').value=options.seed;$('swap-seats').checked=options.swapSeats;$('include-mirrors').checked=options.includeMirrors;
    $('max-turns').value=options.maxTurns;$('max-decisions').value=options.maxDecisions;$('verify').checked=options.verify;
    Object.keys(ruleDefinitions).forEach(key=>{if(options.config&&options.config[key]!==undefined)$(`rule-${key}`).value=options.config[key];});
    Object.entries(thresholdDefinitions).forEach(([key,[,percentage]])=>{$(`threshold-${key}`).value=(options.thresholds&&options.thresholds[key]!==undefined?options.thresholds[key]:thresholdDefaults[key])*(percentage?100:1);});
    balanceNote(false);setMode();setCountPreset();
  }
  function saveOptions(options) {try{localStorage.setItem('frontlines.lab.settings.v2',JSON.stringify(options||readOptions()));}catch(_){/* Small configurations are optional; reports are never persisted here. */}}
  function showError(id, message) {
    $(id).textContent = message || '';
    $(id).hidden = !message;
  }
  function fillDeck(side, requested) {
    const faction = $(`faction-${side}`).value;
    const eligible = decks.filter(deck => deck.faction === faction);
    $(`deck-${side}`).innerHTML = eligible.map(deck => `<option value="${escape(deck.id)}">${escape(deck.name)}</option>`).join('');
    if (requested && eligible.some(deck => deck.id === requested)) $(`deck-${side}`).value = requested;
  }
  function setMode() {
    const matrix = document.querySelector('input[name="mode"]:checked').value === 'matrix';
    $('duel-options').hidden = matrix;
    $('matrix-options').hidden = !matrix;
    $('seat-options').hidden = matrix;
    if ($('workspace-title')) $('workspace-title').textContent = state.developer ? 'Advanced Balance Lab' : state.room === 'factions' ? 'Faction Overview' : matrix ? 'Tournament' : 'Quick Matchup';
    updatePoolChoices();
  }
  function setCountPreset() {
    document.querySelectorAll('[data-count]').forEach(button => button.classList.toggle('active', button.dataset.count === $('match-count').value));
  }
  function cleanRunner() {
    clearTimeout(state.timer);
    clearTimeout(state.startupTimer);
    clearInterval(state.clock);
    if (state.worker) state.worker.terminate();
    state.worker = null;
    state.localRun = null;
    state.timer = null;
    state.clock = null;
  }
  function setStatus(status) {
    state.status = status;
    $('configuration').disabled = live();
    $('run-button').disabled = live();
    $('run-button').innerHTML = live() ? 'Experiment in progress' : '<span aria-hidden="true">▶</span> Run simulations';
    $('pause-button').hidden = !['running', 'paused'].includes(status);
    $('pause-button').textContent = status === 'paused' ? 'Resume' : 'Pause';
    $('stop-button').hidden = !live();
    $('stop-button').disabled = status === 'stopping';
    $('refresh-decks').disabled = live();
    ['export-html','export-json', 'export-matches', 'export-cards'].forEach(id => { $(id).disabled = !state.report; });
    const labels = { idle: 'Ready to run', loading: 'Preparing experiment…', running: 'Simulations running', paused: 'Paused', stopping: 'Finishing current decision…', completed: 'Experiment complete', stopped: 'Stopped — completed results retained', error: 'Runner stopped with an error' };
    $('run-status-text').textContent = labels[status];
    $('command-summary').textContent = labels[status];
    document.querySelectorAll('[data-pool-choice]').forEach(input => { input.disabled = live(); });
    renderProgress();
  }
  function renderProgress() {
    const snapshot = state.snapshot || state.report;
    const completed = snapshot ? snapshot.completed : 0;
    const total = snapshot ? snapshot.total : 0;
    const activeElapsed = elapsed();
    const speed = completed && activeElapsed ? completed / (activeElapsed / 1000) : 0;
    const eta = speed && live() ? duration((total - completed) / speed * 1000) : '—';
    $('run-progress').max = Math.max(1, total);
    $('run-progress').value = completed;
    $('count-label').textContent = `${format(completed)} / ${format(total)} matches`;
    $('timing-label').textContent = `Elapsed ${duration(activeElapsed)} · ${speed ? speed.toFixed(1) : '—'} matches/s · ETA ${eta}`;
    const current = snapshot && snapshot.current;
    if (!state.options) return;
    const options = state.options;
    const method = options.mode === 'matrix' ? `${options.deckPool.length}-deck tournament` : `${deckById[options.deckA]?.name||options.deckA} vs ${deckById[options.deckB]?.name||options.deckB}`;
    const balance=balanceProfiles.find(profile=>profile.id===options.balanceProfile);
    const defaults = Balance ? Balance.dataFor(options.balanceProfile).DEFAULT_CONFIG : Data.DEFAULT_CONFIG;
    const experimental = options.balanceProfile !== ((Balance && Balance.DEFAULT_PROFILE) || 'arsenal') || options.aiProfiles.some(profile => profile !== 'deck') || Object.keys(ruleDefinitions).some(key => options.config[key] !== defaults[key]);
    let description = state.developer ? `${method} · ${balance?balance.name:options.balanceProfile||'baseline'} · ${(options.aiProfiles||['baseline','baseline']).join(' / ')} AI · seed ${options.seed}` : `${method} · ${format(total)} AI matches${experimental ? ' · advanced experiment settings' : ''}`;
    if (current && ['running', 'paused'].includes(state.status)) description += state.developer ? ` · match ${format(current.index + 1)}, turn ${current.turn}, ${format(current.decisions)} decisions` : ` · match ${format(current.index + 1)}`;
    else if (state.status === 'stopped') description += ' · finalized matches retained';
    $('run-description').textContent = description;
    $('command-summary').textContent = live() ? `${state.status === 'paused' ? 'Paused' : 'Testing'} · ${format(completed)} / ${format(total)} matches` : state.report ? `${format(completed)} matches ready to explore` : 'Ready when you are.';
  }
  function renderOverview(summary) {
    const crossFaction = summary.byFactionCross || [];
    const showCrossFaction = crossFaction.some(row => row.decisive > 0);
    const factions = showCrossFaction ? crossFaction : summary.byFaction || [];
    const factionHeading = $('faction-rows').closest('.table-wrap').previousElementSibling.querySelector('h3');
    factionHeading.textContent = showCrossFaction ? 'Faction performance against other factions' : 'Faction performance';
    $('metric-wins').textContent = format(summary.decisive);
    $('metric-unresolved').textContent = format(summary.unfinished);
    $('metric-errors').textContent = format(summary.errors);
    $('metric-seat').textContent = percent(summary.firstPlayerWinRate !== undefined ? summary.firstPlayerWinRate : summary.decisive ? summary.firstPlayerWins / summary.decisive : null);
    $('metric-seat-denominator').textContent = `${format(summary.firstPlayerWins)} / ${format(summary.decisive)} resolved matches`;
    $('metric-seat').title = summary.firstPlayerWinInterval ? `Descriptive 95% Wilson interval: ${percent(summary.firstPlayerWinInterval.low)}–${percent(summary.firstPlayerWinInterval.high)}` : 'No resolved samples';
    $('sample-note').textContent = `${format(summary.matches)} finalized matches${showCrossFaction ? ' · cross-faction rates' : factions.length && summary.matches ? ' · same-faction results: see Decks' : ''}`;
    $('faction-rows').innerHTML = factions.length ? factions.map(row => {
      const interval = row.winInterval ? `<small class="developer-metric" title="95% Wilson interval for AI outcomes">95% interval ${percent(row.winInterval.low)}–${percent(row.winInterval.high)}</small>` : '';
      return `<tr><td>${factionLabel(row.id)}</td><td>${format(row.decisive)}</td><td>${format(row.won)}</td><td class="rate-cell">${percent(row.winRate)}${interval}</td><td>${format(row.unfinished)}</td><td>${format(row.errors)}</td></tr>`;
    }).join('') : '<tr><td colspan="6" class="empty-cell">The front is quiet. Your first run will appear here.</td></tr>';
    const deckRows = summary.byDeck || [];
    $('deck-seat-rows').innerHTML = deckRows.length ? deckRows.map(row => `<tr><td>${escape(row.name)}</td><td class="rate-cell" title="${row.winInterval ? `Descriptive 95% Wilson interval: ${percent(row.winInterval.low)}–${percent(row.winInterval.high)}` : 'No resolved samples'}">${percent(row.winRate)}<small>${format(row.won)} / ${format(row.decisive)}</small></td>${row.seats.map(seat => `<td>${percent(seat.winRate)} <span class="table-note">(${format(seat.won)} / ${format(seat.decisive)})</span></td>`).join('')}</tr>`).join('') : '<tr><td colspan="4" class="empty-cell">No deck samples yet.</td></tr>';
    const pairings = summary.byMatchup || [];
    const ids = Object.keys(Data.FACTIONS);
    const matrix = {};
    pairings.forEach(pair => {
      const a = deckById[pair.deckA]?.faction, b = deckById[pair.deckB]?.faction;if(!a||!b)return;
      if (!matrix[a]) matrix[a] = {};
      if (!matrix[b]) matrix[b] = {};
      if (!matrix[a][b]) matrix[a][b] = { wins: 0, decisive: 0 };
      matrix[a][b].wins += a===b?pair.firstPlayerWins:pair.winsA;
      matrix[a][b].decisive += pair.decisive;
      if (a === b) return;
      if (!matrix[b][a]) matrix[b][a] = { wins: 0, decisive: 0 };
      matrix[b][a].wins += pair.winsB;
      matrix[b][a].decisive += pair.decisive;
    });
    $('matchup-matrix').innerHTML = `<thead><tr><th>ROW / OPPONENT</th>${ids.map(id => `<th>${escape(factionName(id))}</th>`).join('')}</tr></thead><tbody>${ids.map(id => `<tr><td>${factionLabel(id)}</td>${ids.map(opponent => {
      const item = matrix[id] && matrix[id][opponent];
      const rate = item && item.decisive ? item.wins / item.decisive : null;
      const interval=item?wilson(item.wins,item.decisive):null;
      const tooltip = interval ? `Descriptive 95% Wilson interval: ${percent(interval.low)}–${percent(interval.high)}` : 'No resolved samples';
      return `<td title="${escape(tooltip)}" class="${rate > .6 ? 'matrix-high' : rate !== null && rate < .4 ? 'matrix-low' : ''}">${percent(rate)}<small>${item && item.decisive ? `${format(item.wins)} / ${format(item.decisive)}` : 'no resolved samples'}</small></td>`;
    }).join('')}</tr>`).join('')}</tbody>`;
    const turns = summary.turns || {};
    $('summary-notes').innerHTML = `<span>Mean turns <b>${turns.mean ? Number(turns.mean).toFixed(1) : '—'}</b></span><span>Turn range <b>${turns.min === null || turns.min === undefined ? '—' : `${turns.min}–${turns.max}`}</b></span><span>Captures <b>${format(Array.isArray(summary.captures) ? summary.captures.reduce((a,b) => a+b,0) : summary.captures)}</b></span><span class="developer-metric">AI <b>${escape(Simulator.AI_VERSION || 'baseline')}</b></span>`;
    renderPlayerSummary(summary);
  }
  function renderCards(summary) {
    const filter = $('card-faction-filter').value;
    const rows = (summary.cards || []).filter(card => !filter || card.faction === filter).slice();
    rows.sort((a, b) => (state.sortDescending ? -1 : 1) * ((a[state.cardSort] || 0) - (b[state.cardSort] || 0)) || a.name.localeCompare(b.name));
    $('card-rows').innerHTML = rows.length ? rows.map(row => `<tr><td class="card-title">${escape(row.name)}<small>${escape(deckById[row.deckId] ? deckById[row.deckId].name : row.deckId)} · ${escape(row.type)}</small></td><td>${escape(factionName(row.faction))}</td><td title="${format(row.deployments)} deployments; ${format(row.orders)} Orders; ${percent(row.affordablePlayRate)} played during legal opening opportunities">${format(row.plays)}</td><td title="Average draw turn ${row.averageTurnDrawn==null?'—':Number(row.averageTurnDrawn).toFixed(1)}">${format(row.drawn)}</td><td title="Actual applied damage includes overkill; effective damage ${format(row.effectiveDamageDealt)}">${format(row.damageDealt)} / ${format(row.kills)}</td><td>${format(row.pressureContributed)}<small class="card-submetric">${row.pressurePerPresence==null?'—':Number(row.pressurePerPresence).toFixed(2)} / P</small></td><td title="Destroyed lives only; surviving exposure is censored separately">${row.averageSurvival==null?'—':Number(row.averageSurvival).toFixed(1)}<small class="card-submetric">${format(row.completedLives)} completed lives</small></td><td>${percent(row.winRatePlayed)}<small class="card-submetric">${format(row.playedWins)} / ${format(row.playedDecisiveMatches)}</small></td><td title="Cost-stranded end-turn observations relative to all hand end-turn observations">${percent(row.strandedRate)}</td></tr>`).join('') : '<tr><td colspan="9" class="empty-cell">No card samples for this selection yet.</td></tr>';
    document.querySelectorAll('[data-sort]').forEach(button => {
      const labels = { plays: 'Plays', drawn: 'Draws', deaths: 'Deaths', attacksInitiated: 'Attacks' };
      button.textContent = labels[button.dataset.sort] + (state.cardSort === button.dataset.sort ? state.sortDescending ? ' ↓' : ' ↑' : '');
    });
  }
  function renderDecks(summary) {
    const rows=summary.byDeck||[],pairs=summary.byMatchup||[];
    $('deck-matrix').innerHTML=`<thead><tr><th>ROW / OPPONENT</th>${rows.map(r=>`<th>${escape(r.name)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr><th>${escape(r.name)}</th>${rows.map(other=>{const pair=pairs.find(p=>[p.deckA,p.deckB].sort().join('|')===[r.id,other.id].sort().join('|'));const wins=pair?(r.id===pair.deckA?pair.winsA:pair.winsB):0;return `<td>${pair&&pair.decisive?percent(wins/pair.decisive):'—'}<small>${pair?format(wins)+' / '+format(pair.decisive):'no games'}</small></td>`;}).join('')}</tr>`).join('')}</tbody>`;
    $('archetype-rows').innerHTML=(summary.byArchetype||[]).map(row=>`<tr><td>${escape(row.id)}</td><td>${format(row.won)} / ${format(row.decisive)}</td><td>${percent(row.winRate)}</td><td>${numberMetric(row.meanTurns)}</td></tr>`).join('');
    $('deck-curve-rows').innerHTML=(summary.deckCompositions||[]).map(row=>`<tr><td>${escape(row.name)}</td><td>${numberMetric(row.averageCost)}</td><td>${row.units} / ${row.leaders} / ${row.assets} / ${row.orders}</td><td>${row.curve.map(b=>escape(b.label)+': '+b.count).join(' · ')}</td></tr>`).join('');
    const cards=(state.report?.rulesSnapshot?.cards)||Data.CARDS;
    $('synergy-rows').innerHTML=(summary.synergies||[]).slice(0,100).map(row=>`<tr><td>${escape(deckById[row.deckId]?.name||row.deckId)}</td><td>${escape(cards[row.cardA]?.name||row.cardA)} + ${escape(cards[row.cardB]?.name||row.cardB)}</td><td>${row.wins} / ${row.matches}</td><td>${percent(row.winRate)}</td><td>${numberMetric(row.averageFinalTerritorySwing)}</td></tr>`).join('');
  }
  function diagnosticMetric(label,value,note) {return `<div><span>${escape(label)}</span><b>${escape(value)}</b>${note?`<small>${escape(note)}</small>`:''}</div>`;}
  function numberMetric(value,digits) {return value===null||value===undefined?'—':Number(value).toFixed(digits===undefined?1:digits);}
  function renderFlags(rows,empty) {
    return rows.length?rows.slice(0,60).map(flag=>`<div class="diagnostic-flag ${['critical','warning','watch','healthy'].includes(flag.severity)?flag.severity:'watch'}"><span class="flag-severity">${escape(flag.severity||flag.classification||'Review')}</span><div>${escape(flag.message||flag.reason||'')} ${flag.name?`<b>${escape(flag.name)}</b>`:''}</div></div>`).join(''):`<p class="table-note">${escape(empty)}</p>`;
  }
  function renderDiagnostics(summary) {
    const diagnostics=summary.diagnostics||{};
    const flags=diagnostics.flags||summary.flags||[];
    $('balance-flags').innerHTML=renderFlags(flags,summary.matches?'No threshold flags at this sample size. Keep low sample counts in mind.':'Run an experiment to generate diagnostic flags.');
    const length=summary.turns||{};
    $('length-metrics').innerHTML=[diagnosticMetric('Mean turns',numberMetric(length.mean)),diagnosticMetric('Median turns',numberMetric(length.median)),diagnosticMetric('Standard deviation',numberMetric(length.std)),diagnosticMetric('75th percentile',numberMetric(length.p75,0)),diagnosticMetric('90th percentile',numberMetric(length.p90,0)),diagnosticMetric('95th percentile',numberMetric(length.p95,0)),diagnosticMetric('First-player wins',percent(summary.firstPlayerWinRate),`${format(summary.firstPlayerWins)} / ${format(summary.decisive)} resolved`)].join('');
    $('detailed-matchups').innerHTML=(summary.byMatchup||[]).map(row=>`<tr><td>${escape(row.nameA)} vs ${escape(row.nameB)}</td><td>${format(row.decisive)} / ${format(row.played)}</td><td>${format(row.winsA)} / ${format(row.winsB)}</td><td>${format(row.unfinished)} / ${format(row.errors)}</td><td title="${row.winIntervalA?`Descriptive 95% interval ${percent(row.winIntervalA.low)}–${percent(row.winIntervalA.high)}`:''}">${percent(row.winRateA)}</td><td>${percent(row.firstPlayerWinRate)}<small class="card-submetric">${row.firstPlayerWinRate==null?'—':format(Math.round(row.firstPlayerWinRate*row.decisive))} / ${format(row.decisive)}</small></td><td>${numberMetric(row.turns&&row.turns.mean!==undefined?row.turns.mean:row.meanTurns)}</td></tr>`).join('')||'<tr><td colspan="7" class="empty-cell">No matchup observations yet.</td></tr>';
    const economy=diagnostics.economyByFaction||[];
    $('economy-table').innerHTML=`<thead><tr><th>Faction</th><th>Generated / appearance</th><th>Orders / appearance</th><th>Mean committed</th><th>Mean available</th><th>Casualty release / appearance</th><th>No affordable turn</th><th>Pressure / commitment</th></tr></thead><tbody>${economy.length?economy.map(row=>`<tr><td>${factionLabel(row.faction||row.id)}</td><td>${numberMetric(row.averageGenerated)}</td><td>${numberMetric(row.averageOrderSpend)}</td><td>${numberMetric(row.meanCommitted)}</td><td>${numberMetric(row.meanAvailable)}</td><td>${numberMetric(row.averageCasualtyReleased)}</td><td>${percent(row.noMeaningfulAffordableRate)}</td><td>${numberMetric(row.pressurePerCommitment,2)}</td></tr>`).join(''):'<tr><td colspan="8" class="empty-cell">No Presence samples yet.</td></tr>'}</tbody>`;
    const territory=diagnostics.territoryByFaction||[];
    $('territory-metrics').innerHTML=territory.map(row=>diagnosticMetric(factionName(row.faction||row.id),numberMetric(row.meanControlled)+' zones',`Mean lead ${numberMetric(row.meanLead)} · recaptures ${numberMetric(row.averageRecaptures)} / appearance · first capture ${numberMetric(row.firstCaptureTurns&&row.firstCaptureTurns.mean)}`)).join('')||'<p class="table-note">No territory samples yet.</p>';
    const comebacks=diagnostics.comebackByFaction||[];
    const conditionLabels={territoryDeficit2:'At least 2 zones behind',centerLost:'Enemy owns center',enemyForward:'Enemy in home-side zones',committedDeficit:'At least 5 lower commitment',unitDeficit:'At least 2 fewer cards'};
    $('comeback-table').innerHTML=`<thead><tr><th>Faction / condition</th><th>Exposures</th><th>Recoveries / exposures</th><th>Wins / resolved exposures</th></tr></thead><tbody>${comebacks.length?comebacks.map(row=>`<tr><td>${escape(factionName(row.faction))}<small class="card-submetric">${escape(conditionLabels[row.condition]||row.condition)}</small></td><td>${format(row.attempts)}</td><td>${percent(row.recoveryRate)} (${format(row.recoveries)} / ${format(row.attempts)})</td><td>${percent(row.winRate)} (${format(row.wins)} / ${format(row.decisiveAttempts)})</td></tr>`).join(''):'<tr><td colspan="4" class="empty-cell">No comeback observations yet.</td></tr>'}</tbody>`;
    $('comeback-method').textContent='An exposure is a condition seen in an offensive end-turn sample. A recovery is a later sample no longer meeting that condition. A win is eventual victory after exposure; cutoff matches are excluded from win-rate denominators.';
    $('card-flags').innerHTML=renderFlags(diagnostics.cardOutliers||summary.cardOutliers||[],summary.matches?'No card outliers flagged at the current thresholds and sample size.':'No card samples yet.');
  }
  function renderComparison() {
    if(!state.report||!state.previousReport){$('comparison-rows').innerHTML='<tr><td colspan="6" class="empty-cell">Complete or stop a run, then import a previous JSON report.</td></tr>';return;}
    if(!state.comparison){
      try{state.comparison=Simulator.compareReports(state.previousReport,state.report);}catch(error){showError('comparison-notice',error.message||String(error));return;}
    }
    const comparison=state.comparison;
    $('deck-comparison').innerHTML=(comparison.decks||[]).map(row=>`<tr><td>${escape(row.name)}</td><td>${percent(row.before)} (${row.beforeGames})</td><td>${percent(row.after)} (${row.afterGames})</td><td>${row.delta===null?'—':(row.delta*100).toFixed(1)+' pp'}</td></tr>`).join('');
    const beforeRows=state.previousReport.summary.byDeck||[],afterRows=state.report.summary.byDeck||[];
    for(const [id,rows] of [['compare-deck-before',beforeRows],['compare-deck-after',afterRows]]){const prior=$(id).value;$(id).innerHTML=rows.map(row=>`<option value="${escape(row.id)}">${escape(row.name)}</option>`).join('');if(rows.some(r=>r.id===prior))$(id).value=prior;}
    compareVariants();
    const notes=(comparison.notes||[]).map(note=>typeof note==='string'?note:JSON.stringify(note));
    const paired=comparison.paired;
    showError('comparison-notice',`${comparison.compatible?'Comparable experiment metadata.':'Experimental conditions differ; treat deltas as observational.'}${notes.length?' '+notes.join(' '):''}${paired?` Paired seeds: ${format(paired.matched)}; changed winners: ${format(paired.changedWinners)}.`:''}`);
    const before=Object.fromEntries((state.previousReport.summary.byFaction||[]).map(row=>[row.id,row]));
    const after=Object.fromEntries((state.report.summary.byFaction||[]).map(row=>[row.id,row]));
    const ids=[...new Set([...Object.keys(before),...Object.keys(after)])];
    $('comparison-rows').innerHTML=ids.map(id=>{const old=before[id],current=after[id],delta=old&&current&&old.winRate!==null&&current.winRate!==null?current.winRate-old.winRate:null;return `<tr><td>${factionLabel(id)}</td><td>${old?`${format(old.won)} / ${format(old.decisive)}`:'—'}</td><td>${current?`${format(current.won)} / ${format(current.decisive)}`:'—'}</td><td>${percent(old&&old.winRate)}</td><td>${percent(current&&current.winRate)}</td><td class="${delta>0?'comparison-positive':delta<0?'comparison-negative':''}">${delta===null?'—':`${delta>=0?'+':''}${(delta*100).toFixed(1)} pp`}</td></tr>`;}).join('');
  }
  function compareVariants(){
    if(!state.report||!state.previousReport)return;
    const old=(state.previousReport.summary.byDeck||[]).find(r=>r.id===$('compare-deck-before').value),current=(state.report.summary.byDeck||[]).find(r=>r.id===$('compare-deck-after').value);
    $('variant-comparison').textContent=old&&current?`${old.name}: ${old.won}/${old.decisive} (${percent(old.winRate)}), mean ${numberMetric(old.meanTurns)} turns → ${current.name}: ${current.won}/${current.decisive} (${percent(current.winRate)}), mean ${numberMetric(current.meanTurns)} turns. Difference ${old.winRate!==null&&current.winRate!==null?((current.winRate-old.winRate)*100).toFixed(1)+' percentage points':'unavailable'}. Compare opponent pool, AI and rules before attributing this difference to the deck.`:'Choose a deck from each report.';
  }
  function matchFilter(match) {
    const filter = $('match-status-filter').value;
    const matchup=$('matchup-filter').value;
    return (!matchup||match.deckIds.slice().sort().join('|')===matchup)&&(!filter || (filter === 'completed' ? match.status === 'win' : filter === 'error' ? match.status === 'error' : match.status !== 'win' && match.status !== 'error'));
  }
  function renderMatches() {
    const source = state.report ? state.report.matches : state.snapshot && (state.snapshot.recentMatches || state.snapshot.matches) || [];
    const rows = source.filter(matchFilter);
    const pageSize = 50;
    const pages = Math.max(1, Math.ceil(rows.length / pageSize));
    state.matchPage = Math.min(state.matchPage, pages - 1);
    const pageRows = rows.slice(state.matchPage * pageSize, (state.matchPage + 1) * pageSize);
    const statusLabel = { turnLimit: 'Turn limit', decisionLimit: 'Decision limit', error: 'Error' };
    $('match-rows').innerHTML = pageRows.length ? pageRows.map(match => `<tr><td>${format(match.index + 1)}</td><td>${escape(factionName(match.factions[0]))}</td><td>${escape(factionName(match.factions[1]))}</td><td class="${match.status === 'error' ? 'match-error' : match.status !== 'win' ? 'match-unresolved' : ''}" title="${escape(match.error || '')}">${match.status === 'win' ? escape(factionName(match.winnerFaction)) : escape(statusLabel[match.status] || match.status)}</td><td>${format(match.turns)}</td><td>${format(match.decisions)}</td><td>${match.seed}</td><td><button class="inspect-button" type="button" data-match="${match.index}" ${state.report ? '' : 'disabled'}>Inspect</button></td></tr>`).join('') : `<tr><td colspan="8" class="empty-cell">${live() ? 'Full match records are available after completing or stopping the run.' : 'No match records for this selection.'}</td></tr>`;
    $('page-label').textContent = `${format(rows.length)} ${state.report ? '' : 'recent '}records${rows.length ? ` · page ${state.matchPage + 1} / ${pages}` : ''}`;
    $('previous-page').disabled = state.matchPage === 0;
    $('next-page').disabled = state.matchPage >= pages - 1;
  }
  function renderResults(force) {
    const now = performance.now();
    if (!force && now - state.lastRender < 240) return;
    state.lastRender = now;
    const snapshot = state.report || state.snapshot;
    if (!snapshot) return;
    renderProgress();
    renderOverview(snapshot.summary);
    if(['diagnostics','economy','territory'].includes(state.activeTab))renderDiagnostics(snapshot.summary);
    if (state.activeTab === 'cards') renderCards(snapshot.summary);
    if (state.activeTab === 'decks') renderDecks(snapshot.summary);
    if (state.activeTab === 'matches') renderMatches();
    if (state.activeTab === 'compare')renderComparison();
  }
  function finish(report, reason, error) {
    stopClock();
    if (report) report.execution = { status: error ? 'error' : reason, runner: state.runner, elapsedMs: elapsed(), wallElapsedMs: Date.now() - state.wallStarted, matchesPerSecond: elapsed() ? report.completed / (elapsed() / 1000) : 0, finishedAt: new Date().toISOString() };
    state.report = report || null;
    if (report) state.snapshot = report;
    cleanRunner();
    setStatus(error ? 'error' : reason === 'completed' ? 'completed' : 'stopped');
    if (error) showError('run-error', error);
    renderResults(true);
  }
  function localPump(jobId) {
    if (jobId !== state.jobId || state.status !== 'running' || !state.localRun) return;
    try {
      const end = performance.now() + 12;
      do { state.localRun.step(); } while (!state.localRun.done && performance.now() < end);
      const now = performance.now();
      if (now - state.lastRender >= 250 || state.localRun.done) {
        state.snapshot = state.localRun.snapshot();
        renderResults(state.localRun.done);
      }
      if (state.localRun.done) finish(state.localRun.result(), 'completed');
      else state.timer = setTimeout(() => localPump(jobId), 0);
    } catch (error) { finish(state.localRun && state.localRun.result(), 'error', error.message || String(error)); }
  }
  function startLocal(jobId) {
    if (jobId !== state.jobId) return;
    if (state.status === 'stopping') { finish(Simulator.createRun(state.options).result(), 'stopped'); return; }
    if (state.worker) state.worker.terminate();
    state.worker = null;
    clearTimeout(state.startupTimer);
    try {
      state.localRun = Simulator.createRun(state.options);
      state.snapshot = state.localRun.snapshot();
      state.runner = 'cooperative';
      $('runner-label').textContent = 'LOCAL COOPERATIVE RUNNER';
      setStatus('running');
      renderResults(true);
      state.timer = setTimeout(() => localPump(jobId), 0);
    } catch (error) { finish(null, 'error', error.message || String(error)); }
  }
  function start(options) {
    if (live()) throw new Error('Pause or stop the current run before starting another experiment.');
    let normalized;
    try { normalized = Simulator.normalizeOptions(options || readOptions()); } catch (error) { showError('form-error', error.message || String(error)); return false; }
    if (state.room === 'home') openWarRoom('quick', true);
    setWorkspacePane('results');
    for(const deck of Simulator.getDeckCatalog(Data,normalized.customDecks))deckById[deck.id]=deck;
    cleanRunner();
    state.jobId++;
    const jobId = state.jobId;
    state.options = normalized;
    applyOptions(normalized);saveOptions(normalized);
    state.report = null;
    state.snapshot = { options: normalized, total: normalized.count, completed: 0, summary: { matches: 0, decisive: 0, unfinished: 0, errors: 0, firstPlayerWins: 0, byFaction: [], byMatchup: [], cards: [] } };
    state.activeMs = 0;
    state.activeSince = performance.now();
    state.wallStarted = Date.now();
    state.matchPage = 0;
    state.comparison=null;state.replay=null;
    state.workerStarted = false;
    state.lastRender = 0;
    showError('form-error', '');
    showError('run-error', '');
    $('replay-dialog').close();
    setStatus('loading');
    renderResults(true);
    state.clock = setInterval(renderProgress, 250);
    if (location.protocol === 'file:' || typeof Worker === 'undefined') { startLocal(jobId); return true; }
    try {
      state.runner = 'worker';
      $('runner-label').textContent = 'BACKGROUND WORKER';
      const worker = new Worker('simulator-worker.js');
      state.worker = worker;
      worker.onmessage = event => {
        const message = event.data || {};
        if (state.worker !== worker || message.jobId !== state.jobId || !live()) return;
        state.workerStarted = true;
        clearTimeout(state.startupTimer);
        if (message.type === 'progress') {
          state.snapshot = message.snapshot;
          if (state.status === 'loading') setStatus('running');
          renderResults(false);
        } else if (message.type === 'final') finish(message.report, message.reason);
        else if (message.type === 'failure') finish(message.report, 'error', message.error);
      };
      worker.onerror = event => {
        event.preventDefault();
        if (state.worker !== worker || jobId !== state.jobId || !live()) return;
        if (!state.workerStarted) startLocal(jobId);
        else finish(null, 'error', event.message || 'The background runner stopped unexpectedly. Try a smaller run or the direct local launcher.');
      };
      worker.postMessage({ type: 'start', options: normalized, jobId });
      state.startupTimer = setTimeout(() => { if (!state.workerStarted && state.status === 'loading') startLocal(jobId); }, 2500);
    } catch (_) { startLocal(jobId); }
    return true;
  }
  function pause() {
    if (state.status !== 'running') return;
    stopClock();
    clearTimeout(state.timer);
    if (state.worker) state.worker.postMessage({ type: 'pause', jobId: state.jobId });
    else if (state.localRun) state.snapshot = state.localRun.snapshot();
    setStatus('paused');
    renderResults(true);
  }
  function resume() {
    if (state.status !== 'paused') return;
    state.activeSince = performance.now();
    setStatus('running');
    if (state.worker) state.worker.postMessage({ type: 'resume', jobId: state.jobId });
    else state.timer = setTimeout(() => localPump(state.jobId), 0);
  }
  function stop() {
    if (!live()) return;
    stopClock();
    clearTimeout(state.timer);
    if (state.worker) {
      setStatus('stopping');
      state.worker.postMessage({ type: 'stop', jobId: state.jobId });
    } else if (state.localRun) finish(state.localRun.result(), 'stopped');
    else finish(null, 'stopped');
  }
  function download(content, extension, mime) {
    if (!state.report) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `frontlines-${state.options.mode}-${state.options.seed}-${stamp}.${extension}`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  function setTab(name) {
    if (['diagnostics','matches','compare'].includes(name) && !state.developer) setDeveloper(true);
    state.activeTab = name;
    document.querySelectorAll('[data-tab]').forEach(button => {
      const selected = button.dataset.tab === name;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      $(`view-${button.dataset.tab}`).hidden = !selected;
    });
    renderResults(true);
    if (name === 'matches') renderMatches();
  }
  function tabKeydown(event) {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    const button = event.target.closest('[data-tab]');
    if (!button) return;
    const tabs = [...document.querySelectorAll('[data-tab]')].filter(tab => !tab.hidden);
    const current = tabs.indexOf(button);
    if (current < 0) return;
    event.preventDefault();
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
    setTab(tabs[index].dataset.tab);
    tabs[index].focus();
  }
  function renderTrace() {
    const query = $('trace-search').value.trim().toLowerCase();
    const filtered = state.replayLines.filter(line => !query || line.toLowerCase().includes(query));
    $('replay-trace').textContent = filtered.join('\n');
    $('trace-count').textContent = `${format(filtered.join('\n').split('\n').length)} trace lines`;
  }
  function tracePresence(items) {return (items||[]).map((p,index)=>`P${index+1} ${p.available} available / ${p.committed} committed / ${p.spent} spent / ${p.command} capacity`).join(' | ');}
  function territoryChart(replay) {
    const samples=replay.metrics&&replay.metrics.territory&&replay.metrics.territory.samples||[];
    const container=$('territory-chart');container.hidden=!samples.length;if(!samples.length)return;
    const width=840,height=180,left=34,right=15,top=14,bottom=25;
    const finalTurn=Math.max(1,...samples.map(sample=>sample.turn));
    const x=turn=>left+turn/finalTurn*(width-left-right),y=zones=>top+(7-zones)/7*(height-top-bottom);
    const lines=[0,1].map(seat=>`<polyline points="${samples.map(sample=>`${x(sample.turn).toFixed(1)},${y(sample.controlled[seat]).toFixed(1)}`).join(' ')}" fill="none" stroke="${seat===0?'#8bbbe0':'#ef947e'}" stroke-width="2.5"/>`).join('');
    const grid=[0,2,4,6,7].map(zones=>`<line class="chart-grid" x1="${left}" x2="${width-right}" y1="${y(zones)}" y2="${y(zones)}"/><text x="15" y="${y(zones)+3}">${zones}</text>`).join('');
    const points=samples.filter((sample,index)=>index===0||index===samples.length-1||samples.length<120||index%Math.ceil(samples.length/100)===0).map(sample=>[0,1].map(seat=>`<circle class="chart-point" data-chart-turn="${sample.turn}" cx="${x(sample.turn)}" cy="${y(sample.controlled[seat])}" r="3.5" fill="${seat===0?'#8bbbe0':'#ef947e'}"><title>Turn ${sample.turn}: P${seat+1} controls ${sample.controlled[seat]} territories</title></circle>`).join('')).join('');
    container.innerHTML=`<h3>Territory progression</h3><div class="chart-legend"><span><i style="--faction:#8bbbe0"></i>P1 ${escape(factionName(replay.match.factions[0]))}</span><span><i style="--faction:#ef947e"></i>P2 ${escape(factionName(replay.match.factions[1]))}</span></div><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Controlled territories after each offensive turn. Blue is first player; coral is second player.">${grid}${lines}${points}<text x="${left}" y="${height-7}">0</text><text x="${width-right-12}" y="${height-7}">${finalTurn}</text><text x="${width/2}" y="${height-7}">OFFENSIVE TURN</text></svg><p class="chart-note">Select a point to filter the decision trace to that offensive turn. Opening state is turn 0.</p><label class="chart-turn-label" for="chart-turn-slider">Inspect turn <span id="chart-turn-label">All</span><input id="chart-turn-slider" type="range" min="0" max="${samples.length-1}" value="0" step="1"></label>`;
  }
  function selectChartTurn(turn) {$('trace-search').value=`Turn ${turn} `;$('chart-turn-label').textContent=String(turn);renderTrace();}
  function inspectMatch(index) {
    if (!state.report || live()) return;
    const report = state.report;
    const jobId = state.jobId;
    $('replay-title').textContent = `Match ${index + 1} · decision trace`;
    $('replay-description').textContent = 'Reproducing the recorded seed…';
    $('replay-summary').innerHTML = '';
    $('replay-trace').textContent = 'Preparing match inspection…';
    $('trace-search').value = '';
    $('trace-count').textContent = '';
    $('replay-dialog').showModal();
    setTimeout(() => {
      if (jobId !== state.jobId || !$('replay-dialog').open) return;
      try {
        const replay = Simulator.replayMatch(report, index);
        state.replay={report,index,replay};
        const match = replay.match;
        $('replay-description').textContent = `${factionName(match.factions[0])} vs ${factionName(match.factions[1])} · seed ${match.seed} · ${format(match.turns)} turns · ${format(match.decisions)} decisions`;
        $('replay-summary').innerHTML = `<span>Status <b>${escape(match.status)}</b></span><span>Winner <b>${match.winnerFaction ? escape(factionName(match.winnerFaction)) : 'Unresolved'}</b></span><span>Final territory <b>${escape((match.finalTerritories || []).join(' / '))}</b></span><span>Trace <b>${replay.truncated ? 'first 5,000 decisions (capped)' : 'complete'}</b></span>`;
        const actions = replay.trace&&replay.trace.length ? replay.trace.map((item,decision)=>`#${String(decision+1).padStart(4,'0')}  Turn ${item.turn} / P${item.actor+1} / ${item.actionText}\nPresence before: ${tracePresence(item.presenceBefore)}\nPresence after:  ${tracePresence(item.presenceAfter)}\nTerritory: ${(item.territoryBefore||[]).join(' / ')} → ${(item.territoryAfter||[]).join(' / ')}${item.decision?`\nAI ${item.decision.profile||'baseline'} · ${item.decision.evaluated} legal actions evaluated · score ${numberMetric(item.decision.score,2)}\nReason: ${item.decision.reason||'No reason recorded.'}`:''}\nEvents: ${(item.events||[]).map(event=>`${event.type}${event.cardName?' · '+event.cardName:''}${event.sourceName?' from '+event.sourceName:''}${event.targetName?' → '+event.targetName:''}${event.amount!==undefined?' ('+event.amount+')':''}`).join('; ')||'No triggered effects'}\n`) : (replay.actions || []).map(item => `#${String(item.decision).padStart(4, '0')}  Turn ${item.turn} / P${item.actor + 1} / ${item.action.type}${item.cardName ? ` · ${item.cardName}` : ''}${item.targetName ? ` → ${item.targetName}` : ''}${item.territoryName ? ` @ ${item.territoryName}` : ''}  ${JSON.stringify(item.action)}`);
        const logs = (replay.log || []).map(entry => `Turn ${String(entry.turn).padStart(3, ' ')}  [${entry.type}]  ${entry.text}`);
        state.replayLines = [...(match.error ? [`ERROR: ${match.error}`, ''] : []), 'DECISION TRACE', ...actions, '', 'RECENT ENGINE LOG (engine retains up to 500 entries)', ...logs, '', 'FINAL ANALYSIS STATE (both AI hands visible)', JSON.stringify(replay.final, null, 2)];
        $('replay-copy-status').textContent='';
        territoryChart(replay);
        renderTrace();
      } catch (error) { $('replay-trace').textContent = error.message || String(error); $('replay-description').textContent = 'This match could not be reproduced.'; }
    }, 30);
  }
  function setWorkspacePane(pane) {
    state.workspacePane = pane;
    $('war-room-workspace').dataset.pane = pane;
    document.querySelectorAll('[data-workspace-pane]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.workspacePane === pane)));
  }
  function setDeveloper(enabled) {
    state.developer = Boolean(enabled);
    document.body.classList.toggle('developer-view', state.developer);
    document.querySelectorAll('.developer-only').forEach(element => { element.hidden = !state.developer; });
    $('toggle-developer').setAttribute('aria-pressed', String(state.developer));
    $('toggle-developer').textContent = state.developer ? 'Player view' : 'Advanced view';
    if (!state.developer && ['diagnostics','matches','compare'].includes(state.activeTab)) setTab('overview');
    setMode();
    renderResults(true);
  }
  function openWarRoom(room, preserve) {
    if (live()) preserve = true;
    state.room = room;
    $('war-room-landing').hidden = true;
    $('war-room-workspace').hidden = false;
    if (!preserve) {
      setDeveloper(room === 'advanced');
      if (room !== 'advanced') {
        const profile = (Balance && Balance.DEFAULT_PROFILE) || 'arsenal';
        if (balanceProfiles.some(item => item.id === profile)) $('balance-profile').value = profile;
        $('ai-a').value = 'deck'; $('ai-b').value = 'deck';
        $('swap-seats').checked = true;
        $('include-mirrors').checked = false;
        $('max-turns').value = 240; $('max-decisions').value = 10000; $('verify').checked = false;
        balanceNote(true);
        document.querySelector(`input[name="mode"][value="${room === 'quick' ? 'duel' : 'matrix'}"]`).checked = true;
        if (room === 'factions') selectDeckPool('starter');
        else if (room === 'tournament' && $('matrix-deck-pool').selectedOptions.length < 2) selectDeckPool('preset');
      }
      setWorkspacePane('setup');
    }
    setMode();
    renderProgress();
    $('workspace-title').focus({preventScroll:true});
  }
  function warRoomHome() {
    state.room = 'home';
    $('war-room-workspace').hidden = true;
    $('war-room-landing').hidden = false;
    document.querySelector('[data-war-room="quick"]').focus({preventScroll:true});
  }
  function updatePoolChoices() {
    if (!$('pool-choices')) return;
    const selected = new Set([...$('matrix-deck-pool').selectedOptions].map(option => option.value));
    $('pool-choices').innerHTML = decks.map(deck => `<label class="pool-choice"><input type="checkbox" data-pool-choice="${escape(deck.id)}" ${selected.has(deck.id) ? 'checked' : ''} ${live() ? 'disabled' : ''}><span><b>${escape(deck.name)}</b><small>${escape(factionName(deck.faction))} · ${deck.cards.length} cards</small></span></label>`).join('');
    $('pool-count').textContent = `${selected.size} decks selected`;
  }
  function selectDeckPool(source) {
    for (const option of $('matrix-deck-pool').options) option.selected = deckById[option.value].source === source;
    updatePoolChoices();
  }
  function renderPlayerSummary(summary) {
    if (!$('player-summary')) return;
    const rows = summary.byDeck || [];
    $('player-summary').innerHTML = rows.length ? `<div class="player-summary-heading"><h3>${rows.length === 2 ? 'How these decks performed' : 'Deck results at a glance'}</h3><span>AI benchmark · ${format(summary.decisive)} resolved matches</span></div><div class="deck-result-cards">${rows.map(row => `<div class="deck-result-card" style="--faction:${Data.FACTIONS[row.faction]?.color || '#f2b276'}"><span>${escape(factionName(row.faction))}</span><b>${escape(row.name)}</b><strong>${percent(row.winRate)}</strong><div class="deck-rate-track"><i style="width:${Math.max(0,Math.min(100,(row.winRate || 0)*100))}%"></i></div><small>${format(row.won)} wins / ${format(row.decisive)} resolved games</small></div>`).join('')}</div><p class="table-note">Each deck can win and lose in different matchups. These AI results help you choose what to try; small samples and card correlations need context.</p>` : '<div class="player-empty"><span aria-hidden="true">⌖</span><h3>Your next strategy starts here.</h3><p>Select your decks, choose a batch size, then run simulations. Results appear as the battles finish.</p></div>';
  }
  function setupWarRoom() {
    $('workspace-title').tabIndex = -1;
    $('view-overview').insertAdjacentHTML('afterbegin', '<div id="player-summary"></div>');
    $('tab-overview').textContent = 'Overview';
    $('tab-decks').textContent = 'Decks';
    $('tab-diagnostics').textContent = 'Advanced';
    for (const name of ['diagnostics','matches','compare']) $('tab-' + name).classList.add('developer-only');
    for (const id of ['export-json','export-matches','export-cards']) $(id).classList.add('developer-only');
    $('tab-cards').insertAdjacentHTML('afterend', '<button type="button" id="tab-economy" role="tab" aria-selected="false" aria-controls="view-economy" data-tab="economy" tabindex="-1">Economy</button><button type="button" id="tab-territory" role="tab" aria-selected="false" aria-controls="view-territory" data-tab="territory" tabindex="-1">Territory</button>');
    $('view-diagnostics').insertAdjacentHTML('afterend', '<section id="view-economy" role="tabpanel" aria-labelledby="tab-economy" hidden><div class="section-heading"><h3>Presence economy</h3><span>Deployment flexibility and battlefield commitment</span></div></section><section id="view-territory" role="tabpanel" aria-labelledby="tab-territory" hidden><div class="section-heading"><h3>Territory & comeback</h3><span>How decks claim ground and recover</span></div></section>');
    const economy = $('economy-table').closest('details'), territory = $('territory-metrics').closest('details');
    economy.open = true; territory.open = true;
    $('view-economy').append(economy); $('view-territory').append(territory);
    for (const pane of ['economy','territory']) {
      $('tab-' + pane).addEventListener('click', () => setTab(pane));
      $('tab-' + pane).addEventListener('keydown', tabKeydown);
    }
    // The native multi-select remains the single authoritative deck-pool input.
    $('matrix-deck-pool').classList.add('developer-only');
    $('matrix-deck-pool').previousElementSibling.classList.add('developer-only');
    $('pool-note').classList.add('developer-only');
    $('seat-options').querySelector('.field-note').classList.add('developer-only');
    $('matrix-deck-pool').insertAdjacentHTML('beforebegin', '<div class="pool-heading"><b>Choose tournament decks</b><span id="pool-count"></span></div><div id="pool-choices" class="pool-choices"></div>');
    const setupHeading = document.querySelector('.setup-panel .panel-heading');
    setupHeading.querySelector('.chip').remove();
    setupHeading.append($('refresh-decks'));
    $('refresh-decks').textContent = 'Refresh decks';
    $('refresh-decks').title = 'Reload saved legal decks from the Arsenal';
    $('pool-choices').addEventListener('change', event => {
      const choice = event.target.closest('[data-pool-choice]');
      if (!choice || live()) return;
      const option = [...$('matrix-deck-pool').options].find(item => item.value === choice.dataset.poolChoice);
      if (option) option.selected = choice.checked;
      $('pool-count').textContent = `${$('matrix-deck-pool').selectedOptions.length} decks selected`;
      saveOptions();
    });
    $('matrix-deck-pool').addEventListener('change', updatePoolChoices);
    for (const id of ['pool-starters','pool-archetypes','refresh-decks']) $(id).addEventListener('click', updatePoolChoices);
    document.querySelectorAll('[data-war-room]').forEach(button => button.addEventListener('click', () => openWarRoom(button.dataset.warRoom)));
    $('war-room-home').addEventListener('click', warRoomHome);
    $('back-war-room').addEventListener('click', warRoomHome);
    $('toggle-developer').addEventListener('click', () => setDeveloper(!state.developer));
    $('show-setup').addEventListener('click', () => { setWorkspacePane('setup'); $('match-count').focus(); });
    document.querySelectorAll('[data-workspace-pane]').forEach(button => button.addEventListener('click', () => setWorkspacePane(button.dataset.workspacePane)));
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('dialog[open]')) return;
      if (state.room !== 'home') { event.preventDefault(); warRoomHome(); }
      else if (root.FrontlinesShell) { event.preventDefault(); root.FrontlinesShell.goHome(); }
    });
    renderPlayerSummary({});
    updatePoolChoices();
    setDeveloper(false);
    const params = new URLSearchParams(location.search);
    if (params.has('deck')) openWarRoom('quick');
    else if (params.get('view') === 'advanced') openWarRoom('advanced');
  }
  function setup() {
    $('tab-overview').insertAdjacentHTML('afterend','<button type="button" id="tab-decks" role="tab" aria-selected="false" aria-controls="view-decks" data-tab="decks" tabindex="-1">Decks & pairs</button>');
    $('view-overview').insertAdjacentHTML('afterend','<section id="view-decks" role="tabpanel" aria-labelledby="tab-decks" hidden><div class="section-heading"><h3>Deck matchup matrix</h3><span>Row deck wins / decisive games</span></div><div class="table-wrap"><table class="matrix-table" id="deck-matrix"></table></div><details class="advanced" open><summary>Archetype performance</summary><div class="table-wrap"><table><thead><tr><th>Faction / archetype</th><th>Wins / resolved</th><th>Win rate</th><th>Mean turns</th></tr></thead><tbody id="archetype-rows"></tbody></table></div></details><details class="advanced"><summary>Deck composition</summary><div class="table-wrap"><table><thead><tr><th>Deck</th><th>Mean Presence</th><th>Units / Leaders / Assets / Orders</th><th>Presence curve</th></tr></thead><tbody id="deck-curve-rows"></tbody></table></div></details><details class="advanced" open><summary>Frequently played card pairs</summary><div class="table-wrap"><table><thead><tr><th>Deck</th><th>Cards</th><th>Wins / games together</th><th>Win association</th><th>Mean final control change</th></tr></thead><tbody id="synergy-rows"></tbody></table></div><p class="table-note">Both cards were played in the same decisive player-game. The top 100 pairs are shown; JSON retains all. Correlation includes deck, duration and winning-position bias. Control change from the opening three territories does not establish that the pair caused it.</p></details></section>');
    $('view-compare').insertAdjacentHTML('beforeend','<h3>Deck revisions</h3><div class="table-wrap"><table><thead><tr><th>Deck</th><th>Previous rate (games)</th><th>Current rate (games)</th><th>Change</th></tr></thead><tbody id="deck-comparison"></tbody></table></div><h3>Compare named variants</h3><div class="two-fields"><label>Earlier deck<select id="compare-deck-before"></select></label><label>Current deck<select id="compare-deck-after"></select></label></div><p id="variant-comparison" class="table-note">Import a previous report and run a deck variant.</p>');
    for(const id of ['compare-deck-before','compare-deck-after'])$(id).addEventListener('change',compareVariants);
    $('matrix-options').insertAdjacentHTML('beforeend','<label for="matrix-deck-pool">Tournament deck pool</label><select id="matrix-deck-pool" multiple size="6" aria-describedby="pool-note"></select><p id="pool-note" class="field-note">Select at least two decks. Ctrl / Command selects multiple decks.</p><div class="exports"><button type="button" id="pool-starters">Starters</button><button type="button" id="pool-archetypes">10 archetypes</button></div>');
    $('matrix-options').querySelector('b').textContent='Deck round robin';
    $('matrix-deck-pool').innerHTML=decks.map(d=>`<option value="${escape(d.id)}" ${d.source==='starter'?'selected':''}>${escape(d.name)}</option>`).join('');
    $('pool-starters').addEventListener('click',()=>{for(const o of $('matrix-deck-pool').options)o.selected=deckById[o.value].source==='starter';saveOptions();});
    $('pool-archetypes').addEventListener('click',()=>{for(const o of $('matrix-deck-pool').options)o.selected=deckById[o.value].source==='preset';saveOptions();});
    $('duel-options').insertAdjacentHTML('afterend','<button type="button" id="refresh-decks">Refresh saved decks</button><p id="deck-library-note" class="field-note">Saved legal decks appear here.</p>');
    $('refresh-decks').addEventListener('click',()=>{
      if(live())return;
      const saved=root.FrontlinesDecks.load(),valid=saved.filter(d=>root.FrontlinesDecks.validate(d).legal);
      decks=Simulator.getDeckCatalog(Data,valid);deckById=Object.fromEntries(decks.map(d=>[d.id,d]));
      for(const d of state.report?.rulesSnapshot?.decks||[])deckById[d.id]=d;
      for(const side of ['a','b'])fillDeck(side,$('deck-'+side).value);
      const pool=new Set([...$('matrix-deck-pool').selectedOptions].map(o=>o.value));
      $('matrix-deck-pool').innerHTML=decks.map(d=>`<option value="${escape(d.id)}" ${pool.has(d.id)?'selected':''}>${escape(d.name)}</option>`).join('');
      const drafts=saved.length-valid.length;
      $('deck-library-note').textContent=`${valid.length} legal decks loaded · ${drafts} draft${drafts===1?'':'s'} to repair`;
      $('deck-library-note').title='Illegal drafts stay in Arsenal for repair. Results retain the exact deck lists used.';
      const prior=$('matchup-filter').value,pairs=[],catalog=Object.values(deckById);for(let a=0;a<catalog.length;a++)for(let b=a;b<catalog.length;b++)pairs.push({id:[catalog[a].id,catalog[b].id].sort().join('|'),name:`${catalog[a].name} vs ${catalog[b].name}`});
      $('matchup-filter').innerHTML='<option value="">All matchups</option>'+pairs.map(pair=>`<option value="${escape(pair.id)}">${escape(pair.name)}</option>`).join('');if(pairs.some(pair=>pair.id===prior))$('matchup-filter').value=prior;
    });
    for(const side of ['a','b']){$('ai-'+side).insertAdjacentHTML('afterbegin','<option value="deck">Deck-aware</option>');$('ai-'+side).value='deck';}
    ['a', 'b'].forEach(side => {
      $(`faction-${side}`).innerHTML = Object.values(Data.FACTIONS).map(faction => `<option value="${faction.id}">${escape(faction.name)}</option>`).join('');
      $(`faction-${side}`).value = side === 'a' ? 'stonewall' : 'bruiser';
      fillDeck(side);
      $(`faction-${side}`).addEventListener('change', () => fillDeck(side));
    });
    $('card-faction-filter').innerHTML += Object.values(Data.FACTIONS).map(faction => `<option value="${faction.id}">${escape(faction.name)}</option>`).join('');
    $('rule-fields').innerHTML = Object.entries(ruleDefinitions).map(([key, [label, min, max]]) => `<div><label for="rule-${key}">${label}</label><input id="rule-${key}" type="number" min="${min}" max="${max}" value="${Data.DEFAULT_CONFIG[key]}" step="1" required></div>`).join('');
    $('balance-profile').innerHTML=balanceProfiles.map(profile=>`<option value="${escape(profile.id)}">${escape(profile.name)}</option>`).join('');
    $('balance-profile').value=balanceProfiles.some(p=>p.id===(Balance && Balance.DEFAULT_PROFILE))?Balance.DEFAULT_PROFILE:balanceProfiles.some(p=>p.id==='arsenal')?'arsenal':'baseline';balanceNote(false);
    $('threshold-fields').innerHTML=Object.entries(thresholdDefinitions).map(([key,[label,percentage]])=>`<div class="${percentage?'threshold-percentage':''}"><label for="threshold-${key}">${label}</label><input id="threshold-${key}" type="number" min="0" max="${percentage?100:key==='minSamples'?100000:10000}" step="${percentage ? .1 : key==='efficientPressure' ? .1 : 1}" value="${thresholdDefaults[key]*(percentage?100:1)}" required></div>`).join('');
    const pairs=[];for(let a=0;a<decks.length;a++)for(let b=a;b<decks.length;b++)pairs.push({id:[decks[a].id,decks[b].id].sort().join('|'),name:`${decks[a].name} vs ${decks[b].name}`});
    $('matchup-filter').innerHTML+=pairs.map(pair=>`<option value="${escape(pair.id)}">${escape(pair.name)}</option>`).join('');
    $('matrix-options').querySelector('p').textContent = 'Both opening seats are included. The count is the total across selected deck pairings, including same-faction variants.';
    $('run-form').addEventListener('submit', event => {
      event.preventDefault();
      const invalid = $('configuration').querySelector(':invalid');
      if (invalid) {
        if (invalid.closest('.developer-only')) setDeveloper(true);
        const details = invalid.closest('details'); if (details) details.open = true;
        setWorkspacePane('setup');
      }
      if (!$('run-form').reportValidity()) return;
      start();
    });
    document.querySelectorAll('input[name="mode"]').forEach(input => input.addEventListener('change', setMode));
    document.querySelectorAll('[data-count]').forEach(button => button.addEventListener('click', () => { $('match-count').value = button.dataset.count; setCountPreset(); }));
    $('match-count').addEventListener('input', setCountPreset);
    $('random-seed').addEventListener('click', () => {
      const buffer = new Uint32Array(1);
      if (root.crypto && root.crypto.getRandomValues) root.crypto.getRandomValues(buffer);
      else buffer[0] = Math.floor(Math.random() * 4294967296);
      $('seed').value = buffer[0];
    });
    $('reset-rules').addEventListener('click', () => {balanceNote(true);saveOptions();});
    $('balance-profile').addEventListener('change',()=>{balanceNote(true);saveOptions();});
    $('run-form').addEventListener('change',()=>{if(!live())saveOptions();});
    $('pause-button').addEventListener('click', () => state.status === 'paused' ? resume() : pause());
    $('stop-button').addEventListener('click', stop);
    $('export-json').addEventListener('click', () => download(JSON.stringify(state.report, null, 2), 'json', 'application/json'));
    $('export-html').addEventListener('click',()=>{if(state.report){if(state.previousReport&&!state.comparison)renderComparison();download(Simulator.reportHTML(state.report,state.comparison||undefined),'html','text/html;charset=utf-8');}});
    $('export-matches').addEventListener('click', () => download(Simulator.matchesCSV(state.report), 'matches.csv', 'text/csv;charset=utf-8'));
    $('export-cards').addEventListener('click', () => download(Simulator.cardsCSV(state.report), 'cards.csv', 'text/csv;charset=utf-8'));
    document.querySelectorAll('[data-tab]').forEach(button => {
      button.addEventListener('click', () => setTab(button.dataset.tab));
      button.addEventListener('keydown', tabKeydown);
    });
    $('card-faction-filter').addEventListener('change', () => renderResults(true));
    $('match-status-filter').addEventListener('change', () => { state.matchPage = 0; renderMatches(); });
    $('matchup-filter').addEventListener('change',()=>{state.matchPage=0;renderMatches();});
    $('card-metric-sort').addEventListener('change',()=>{state.cardSort=$('card-metric-sort').value;renderResults(true);});
    $('card-sort-direction').addEventListener('click',()=>{state.sortDescending=!state.sortDescending;$('card-sort-direction').textContent=state.sortDescending?'Descending ↓':'Ascending ↑';renderResults(true);});
    document.querySelectorAll('[data-sort]').forEach(button => button.addEventListener('click', () => {
      if (state.cardSort === button.dataset.sort) state.sortDescending = !state.sortDescending;
      else { state.cardSort = button.dataset.sort; state.sortDescending = true; }
      renderResults(true);
    }));
    $('previous-page').addEventListener('click', () => { state.matchPage--; renderMatches(); });
    $('next-page').addEventListener('click', () => { state.matchPage++; renderMatches(); });
    $('match-rows').addEventListener('click', event => { const button = event.target.closest('[data-match]'); if (button) inspectMatch(Number(button.dataset.match)); });
    $('close-replay').addEventListener('click', () => $('replay-dialog').close());
    $('trace-search').addEventListener('input', renderTrace);
    $('territory-chart').addEventListener('click',event=>{const point=event.target.closest('[data-chart-turn]');if(point)selectChartTurn(Number(point.dataset.chartTurn));});
    $('territory-chart').addEventListener('input',event=>{if(event.target.id==='chart-turn-slider'&&state.replay){const samples=state.replay.replay.metrics.territory.samples;selectChartTurn(samples[Number(event.target.value)].turn);}});
    $('copy-replay-seed').addEventListener('click',async()=>{
      if(!state.replay)return;const seed=String(state.replay.replay.match.seed);
      try{if(navigator.clipboard&&navigator.clipboard.writeText)await navigator.clipboard.writeText(seed);else{const input=document.createElement('textarea');input.value=seed;document.body.append(input);input.select();if(!document.execCommand('copy'))throw new Error('Copy unavailable');input.remove();}$('replay-copy-status').textContent='Seed copied: '+seed;}
      catch(_){$('replay-copy-status').textContent='Seed: '+seed+' — select this text to copy.';}
    });
    $('rerun-replay').addEventListener('click',()=>{
      if(!state.replay)return;const match=state.replay.replay.match,source=state.replay.report;
      const options={...source.options,mode:'duel',count:1,seed:match.seed,deckA:match.deckIds[0],deckB:match.deckIds[1],aiProfiles:match.aiProfiles||source.options.aiProfiles,swapSeats:false};
      $('replay-dialog').close();start(options);
    });
    $('import-report').addEventListener('change',async event=>{
      const file=event.target.files[0];if(!file)return;
      try{if(file.size>128*1024*1024)throw new Error('Report exceeds the 128 MB import limit. Choose a smaller saved experiment.');const report=JSON.parse(await file.text());if(!report||!report.summary||!Array.isArray(report.summary.byFaction)||!Array.isArray(report.matches)||!report.options)throw new Error('Choose a Balance Lab JSON report with match records and faction summaries.');state.previousReport=report;state.comparison=null;renderComparison();if(!state.report)showError('comparison-notice',`Loaded ${file.name}. Complete or stop the current experiment to compare it.`);}
      catch(error){showError('comparison-notice',error.message||String(error));}
      event.target.value='';
    });
    try{const saved=JSON.parse(localStorage.getItem('frontlines.lab.settings.v2')||'null');if(saved)applyOptions(Simulator.normalizeOptions(saved));}catch(_){/* Older or corrupt saved settings do not prevent launch. */}
    const launchDeck=deckById[new URLSearchParams(location.search).get('deck')];if(launchDeck){document.querySelector('input[name="mode"][value="duel"]').checked=true;$('faction-a').value=launchDeck.faction;fillDeck('a',launchDeck.id);}
    setMode();
    setCountPreset();
    $('run-form').noValidate = true;
    setupWarRoom();
  }
  root.FrontlinesSimulatorApp = {
    getStatus: () => ({ status: state.status, runner: state.runner, jobId: state.jobId, completed: state.snapshot ? state.snapshot.completed : 0, total: state.snapshot ? state.snapshot.total : 0, elapsedMs: elapsed() }),
    getReport: () => state.report,
    getOptions: () => state.options,
    start, pause, resume, stop,
    openWarRoom, setDeveloper, getView: () => ({room:state.room,developer:state.developer,pane:state.workspacePane,tab:state.activeTab})
  };
  setup();
})(globalThis);
