/* Dedicated analysis runner. The simulation engine remains authoritative. */
'use strict';
importScripts('build-info.js', 'data.js', 'commanders.js', 'deck-rules.js', 'decks.js', 'engine.js', 'ai.js', 'arsenal.js', 'balance.js', 'telemetry.js', 'analytics.js', 'sim-core.js');

let active = null;
function send(type, payload) {
  if (active) postMessage(Object.assign({ type, jobId: active.jobId }, payload));
}
function progress(force) {
  const now = performance.now();
  if (active && (force || now - active.lastProgress >= 250)) {
    active.lastProgress = now;
    send('progress', { snapshot: active.run.snapshot() });
  }
}
function finish(reason) {
  if (!active || active.finished) return;
  active.finished = true;
  clearTimeout(active.timer);
  send('final', { report: active.run.result(), reason });
}
function pump() {
  if (!active || active.finished || active.paused) return;
  try {
    const end = performance.now() + 14;
    do {
      active.run.step();
    } while (!active.run.done && !active.paused && performance.now() < end);
    progress(false);
    if (active.run.done) finish('completed');
    else active.timer = setTimeout(pump, 0);
  } catch (error) {
    clearTimeout(active.timer);
    active.finished = true;
    send('failure', { error: error.message || String(error), report: active.run.result() });
  }
}
self.onmessage = function (event) {
  const message = event.data || {};
  if (message.type === 'start') {
    if (active) clearTimeout(active.timer);
    try {
      const run = FrontlinesSimulator.createRun(message.options);
      active = { jobId: message.jobId, run, paused: false, finished: false, timer: null, lastProgress: 0 };
      progress(true);
      active.timer = setTimeout(pump, 0);
    } catch (error) {
      postMessage({ type: 'failure', jobId: message.jobId, error: error.message || String(error) });
    }
    return;
  }
  if (!active || active.jobId !== message.jobId || active.finished) return;
  if (message.type === 'pause') {
    active.paused = true;
    clearTimeout(active.timer);
    progress(true);
    send('paused', {});
  } else if (message.type === 'resume') {
    active.paused = false;
    send('resumed', {});
    active.timer = setTimeout(pump, 0);
  } else if (message.type === 'stop') {
    finish('stopped');
  }
};
