(function (root) {
  'use strict';
  const Data = root.FrontlinesData;
  const Simulator = root.FrontlinesSimulator;
  const $ = id => document.getElementById(id);
  const format = value => Number(value || 0).toLocaleString('en-US');
  const percent = value => value === null || value === undefined ? '—' : `${(value * 100).toFixed(1)}%`;
  const escape = value => String(value === undefined || value === null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const factionName = id => Data.FACTIONS[id] ? Data.FACTIONS[id].name : id;
  const decks = Simulator.getDecks();
  const deckById = Object.fromEntries(decks.map(deck => [deck.id, deck]));
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
    workerStarted: false, startupTimer: null, lastRender: 0
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
      maxDecisions: Number($('max-decisions').value), verify: $('verify').checked, config
    });
  }
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
    ['export-json', 'export-matches', 'export-cards'].forEach(id => { $(id).disabled = !state.report; });
    const labels = { idle: 'Ready to run', loading: 'Preparing experiment…', running: 'Simulations running', paused: 'Paused', stopping: 'Finishing current decision…', completed: 'Experiment complete', stopped: 'Stopped — completed results retained', error: 'Runner stopped with an error' };
    $('run-status-text').textContent = labels[status];
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
    const method = options.mode === 'matrix' ? 'All-faction benchmark' : `${deckById[options.deckA].name} vs ${deckById[options.deckB].name}`;
    let description = `${method} · seed ${options.seed}`;
    if (current && ['running', 'paused'].includes(state.status)) description += ` · match ${format(current.index + 1)}, turn ${current.turn}, ${format(current.decisions)} decisions`;
    else if (state.status === 'stopped') description += ' · finalized matches retained';
    $('run-description').textContent = description;
  }
  function renderOverview(summary) {
    const factions = summary.byFaction || [];
    $('metric-wins').textContent = format(summary.decisive);
    $('metric-unresolved').textContent = format(summary.unfinished);
    $('metric-errors').textContent = format(summary.errors);
    $('metric-seat').textContent = percent(summary.firstPlayerWinRate !== undefined ? summary.firstPlayerWinRate : summary.decisive ? summary.firstPlayerWins / summary.decisive : null);
    $('metric-seat-denominator').textContent = `${format(summary.firstPlayerWins)} / ${format(summary.decisive)} resolved matches`;
    $('metric-seat').title = summary.firstPlayerWinInterval ? `Descriptive 95% Wilson interval: ${percent(summary.firstPlayerWinInterval.low)}–${percent(summary.firstPlayerWinInterval.high)}` : 'No resolved samples';
    $('sample-note').textContent = `${format(summary.matches)} finalized matches`;
    $('faction-rows').innerHTML = factions.length ? factions.map(row => {
      const interval = row.winInterval ? `<small title="95% Wilson interval for baseline AI outcomes">95% interval ${percent(row.winInterval.low)}–${percent(row.winInterval.high)}</small>` : '';
      return `<tr><td>${factionLabel(row.id)}</td><td>${format(row.decisive)}</td><td>${format(row.won)}</td><td class="rate-cell">${percent(row.winRate)}${interval}</td><td>${format(row.unfinished)}</td><td>${format(row.errors)}</td></tr>`;
    }).join('') : '<tr><td colspan="6" class="empty-cell">The front is quiet. Your first run will appear here.</td></tr>';
    const deckRows = summary.byDeck || [];
    $('deck-seat-rows').innerHTML = deckRows.length ? deckRows.map(row => `<tr><td>${escape(row.name)}</td><td class="rate-cell" title="${row.winInterval ? `Descriptive 95% Wilson interval: ${percent(row.winInterval.low)}–${percent(row.winInterval.high)}` : 'No resolved samples'}">${percent(row.winRate)}<small>${format(row.won)} / ${format(row.decisive)}</small></td>${row.seats.map(seat => `<td>${percent(seat.winRate)} <span class="table-note">(${format(seat.won)} / ${format(seat.decisive)})</span></td>`).join('')}</tr>`).join('') : '<tr><td colspan="4" class="empty-cell">No deck samples yet.</td></tr>';
    const pairings = summary.byMatchup || [];
    const ids = Object.keys(Data.FACTIONS);
    const matrix = {};
    pairings.forEach(pair => {
      const a = deckById[pair.deckA].faction, b = deckById[pair.deckB].faction;
      if (!matrix[a]) matrix[a] = {};
      if (!matrix[b]) matrix[b] = {};
      if (!matrix[a][b]) matrix[a][b] = { wins: 0, decisive: 0, interval: pair.winIntervalA };
      matrix[a][b].wins += pair.winsA;
      matrix[a][b].decisive += pair.decisive;
      if (a === b) return;
      if (!matrix[b][a]) matrix[b][a] = { wins: 0, decisive: 0, interval: pair.winIntervalA && { low: 1 - pair.winIntervalA.high, high: 1 - pair.winIntervalA.low } };
      matrix[b][a].wins += pair.winsB;
      matrix[b][a].decisive += pair.decisive;
    });
    $('matchup-matrix').innerHTML = `<thead><tr><th>ROW / OPPONENT</th>${ids.map(id => `<th>${escape(factionName(id))}</th>`).join('')}</tr></thead><tbody>${ids.map(id => `<tr><td>${factionLabel(id)}</td>${ids.map(opponent => {
      const item = matrix[id] && matrix[id][opponent];
      const rate = item && item.decisive ? item.wins / item.decisive : null;
      const tooltip = item && item.interval ? `Descriptive 95% Wilson interval: ${percent(item.interval.low)}–${percent(item.interval.high)}` : 'No resolved samples';
      return `<td title="${escape(tooltip)}" class="${rate > .6 ? 'matrix-high' : rate !== null && rate < .4 ? 'matrix-low' : ''}">${percent(rate)}<small>${item && item.decisive ? `${format(item.wins)} / ${format(item.decisive)}` : 'no resolved samples'}</small></td>`;
    }).join('')}</tr>`).join('')}</tbody>`;
    const turns = summary.turns || {};
    $('summary-notes').innerHTML = `<span>Mean turns <b>${turns.mean ? Number(turns.mean).toFixed(1) : '—'}</b></span><span>Turn range <b>${turns.min === null || turns.min === undefined ? '—' : `${turns.min}–${turns.max}`}</b></span><span>Captures <b>${format(Array.isArray(summary.captures) ? summary.captures.reduce((a,b) => a+b,0) : summary.captures)}</b></span><span>AI <b>${escape(Simulator.AI_VERSION || 'baseline')}</b></span>`;
  }
  function renderCards(summary) {
    const filter = $('card-faction-filter').value;
    const rows = (summary.cards || []).filter(card => !filter || card.faction === filter).slice();
    rows.sort((a, b) => (state.sortDescending ? -1 : 1) * ((a[state.cardSort] || 0) - (b[state.cardSort] || 0)) || a.name.localeCompare(b.name));
    $('card-rows').innerHTML = rows.length ? rows.map(row => `<tr><td class="card-title">${escape(row.name)}<small>${escape(deckById[row.deckId] ? deckById[row.deckId].name : row.deckId)} · ${escape(row.type)}</small></td><td>${escape(factionName(row.faction))}</td><td>${format(row.plays)}</td><td>${format(row.drawn)}</td><td>${format(row.deployments)}</td><td>${format(row.orders)}</td><td>${format(row.deaths)}</td><td>${format(row.attacksInitiated)}</td></tr>`).join('') : '<tr><td colspan="8" class="empty-cell">No card samples for this selection yet.</td></tr>';
    document.querySelectorAll('[data-sort]').forEach(button => {
      const labels = { plays: 'Plays', drawn: 'Draws', deaths: 'Deaths', attacksInitiated: 'Attacks' };
      button.textContent = labels[button.dataset.sort] + (state.cardSort === button.dataset.sort ? state.sortDescending ? ' ↓' : ' ↑' : '');
    });
  }
  function matchFilter(match) {
    const filter = $('match-status-filter').value;
    return !filter || (filter === 'completed' ? match.status === 'win' : filter === 'error' ? match.status === 'error' : match.status !== 'win' && match.status !== 'error');
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
    if (state.activeTab === 'cards') renderCards(snapshot.summary);
    if (state.activeTab === 'matches') renderMatches();
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
    cleanRunner();
    state.jobId++;
    const jobId = state.jobId;
    state.options = normalized;
    state.report = null;
    state.snapshot = { options: normalized, total: normalized.count, completed: 0, summary: { matches: 0, decisive: 0, unfinished: 0, errors: 0, firstPlayerWins: 0, byFaction: [], byMatchup: [], cards: [] } };
    state.activeMs = 0;
    state.activeSince = performance.now();
    state.wallStarted = Date.now();
    state.matchPage = 0;
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
  function renderTrace() {
    const query = $('trace-search').value.trim().toLowerCase();
    const filtered = state.replayLines.filter(line => !query || line.toLowerCase().includes(query));
    $('replay-trace').textContent = filtered.join('\n');
    $('trace-count').textContent = `${format(filtered.length)} trace lines`;
  }
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
        const match = replay.match;
        $('replay-description').textContent = `${factionName(match.factions[0])} vs ${factionName(match.factions[1])} · seed ${match.seed} · ${format(match.turns)} turns · ${format(match.decisions)} decisions`;
        $('replay-summary').innerHTML = `<span>Status <b>${escape(match.status)}</b></span><span>Winner <b>${match.winnerFaction ? escape(factionName(match.winnerFaction)) : 'Unresolved'}</b></span><span>Final territory <b>${escape((match.finalTerritories || []).join(' / '))}</b></span><span>Trace <b>${replay.truncated ? 'first 5,000 decisions (capped)' : 'complete'}</b></span>`;
        const actions = (replay.actions || []).map(item => `#${String(item.decision).padStart(4, '0')}  Turn ${String(item.turn).padStart(3, ' ')}  P${item.actor + 1}  ${item.action.type}${item.cardName ? ` · ${item.cardName}` : ''}${item.targetName ? ` → ${item.targetName}` : ''}${item.territoryName ? ` @ ${item.territoryName}` : ''}  ${JSON.stringify(item.action)}`);
        const logs = (replay.log || []).map(entry => `Turn ${String(entry.turn).padStart(3, ' ')}  [${entry.type}]  ${entry.text}`);
        state.replayLines = [...(match.error ? [`ERROR: ${match.error}`, ''] : []), 'DECISION TRACE', ...actions, '', 'RECENT ENGINE LOG (engine retains up to 500 entries)', ...logs, '', 'FINAL ANALYSIS STATE (both AI hands visible)', JSON.stringify(replay.final, null, 2)];
        renderTrace();
      } catch (error) { $('replay-trace').textContent = error.message || String(error); $('replay-description').textContent = 'This match could not be reproduced.'; }
    }, 30);
  }
  function setup() {
    ['a', 'b'].forEach(side => {
      $(`faction-${side}`).innerHTML = Object.values(Data.FACTIONS).map(faction => `<option value="${faction.id}">${escape(faction.name)}</option>`).join('');
      $(`faction-${side}`).value = side === 'a' ? 'stonewall' : 'bruiser';
      fillDeck(side);
      $(`faction-${side}`).addEventListener('change', () => fillDeck(side));
    });
    $('card-faction-filter').innerHTML += Object.values(Data.FACTIONS).map(faction => `<option value="${faction.id}">${escape(faction.name)}</option>`).join('');
    $('rule-fields').innerHTML = Object.entries(ruleDefinitions).map(([key, [label, min, max]]) => `<div><label for="rule-${key}">${label}</label><input id="rule-${key}" type="number" min="${min}" max="${max}" value="${Data.DEFAULT_CONFIG[key]}" step="1" required></div>`).join('');
    $('matrix-options').querySelector('p').textContent = 'Both opening-seat orientations are included automatically. Matches are distributed across faction pairings; the count below is the total run size.';
    $('run-form').addEventListener('submit', event => {
      event.preventDefault();
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
    $('reset-rules').addEventListener('click', () => Object.keys(ruleDefinitions).forEach(key => { $(`rule-${key}`).value = Data.DEFAULT_CONFIG[key]; }));
    $('pause-button').addEventListener('click', () => state.status === 'paused' ? resume() : pause());
    $('stop-button').addEventListener('click', stop);
    $('export-json').addEventListener('click', () => download(JSON.stringify(state.report, null, 2), 'json', 'application/json'));
    $('export-matches').addEventListener('click', () => download(Simulator.matchesCSV(state.report), 'matches.csv', 'text/csv;charset=utf-8'));
    $('export-cards').addEventListener('click', () => download(Simulator.cardsCSV(state.report), 'cards.csv', 'text/csv;charset=utf-8'));
    document.querySelectorAll('[data-tab]').forEach(button => {
      button.addEventListener('click', () => setTab(button.dataset.tab));
      button.addEventListener('keydown', event => {
        const tabs = [...document.querySelectorAll('[data-tab]')];
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const current = tabs.indexOf(button);
        const index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
        setTab(tabs[index].dataset.tab);
        tabs[index].focus();
      });
    });
    $('card-faction-filter').addEventListener('change', () => renderResults(true));
    $('match-status-filter').addEventListener('change', () => { state.matchPage = 0; renderMatches(); });
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
    setMode();
    setCountPreset();
  }
  root.FrontlinesSimulatorApp = {
    getStatus: () => ({ status: state.status, runner: state.runner, jobId: state.jobId, completed: state.snapshot ? state.snapshot.completed : 0, total: state.snapshot ? state.snapshot.total : 0, elapsedMs: elapsed() }),
    getReport: () => state.report,
    getOptions: () => state.options,
    start, pause, resume, stop
  };
  setup();
})(globalThis);
