'use strict';
// Optional end-to-end checks. Supply an existing Playwright package as argv[2].
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.argv[2] || 'playwright');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'test-results');
fs.mkdirSync(out, {recursive:true});

async function status(page, expected) {
  await page.waitForFunction(value => FrontlinesSimulatorApp.getStatus().status === value, expected, {timeout:120000});
}
async function selectedMatch(page, count) {
  await page.locator('.mode-switch label:has(input[value="duel"])').click();
  await page.locator('#balance-profile').selectOption('baseline');
  await page.locator('#ai-a').selectOption('baseline');
  await page.locator('#ai-b').selectOption('baseline');
  await page.locator('#faction-a').selectOption('nightwalker');
  await page.locator('#faction-b').selectOption('rogue');
  await page.locator('#match-count').fill(String(count));
  await page.locator('#seed').fill('631');
}
async function exportFile(page, button, filename) {
  const pending = page.waitForEvent('download');
  await page.locator(button).click();
  const download = await pending;
  const target = path.join(out, filename);
  await download.saveAs(target);
  return fs.readFileSync(target, 'utf8');
}

(async () => {
  const browser = await chromium.launch({headless:true, channel:'msedge'});
  const page = await browser.newPage({viewport:{width:1366,height:900}, acceptDownloads:true});
  const errors = [];
  const track = p => { p.on('pageerror', e => errors.push(e.message)); p.on('console', e => {if(e.type()==='error') errors.push(e.text());}); };
  track(page);
  await page.goto('http://127.0.0.1:4173/simulator.html?view=advanced');
  await page.evaluate(()=>localStorage.clear());await page.reload();
  await page.waitForSelector('#run-button');
  assert.equal(await page.locator('#faction-a option').count(), 5);
  assert.equal(await page.locator('#deck-a option').count(), 3);
  // Both native count validation and cross-field rules validation stop a job.
  await page.locator('#match-count').fill('0');
  await page.locator('#run-button').click();
  assert.equal(await page.evaluate(() => FrontlinesSimulatorApp.getStatus().status), 'idle');
  await page.locator('#match-count').fill('24');
  await page.locator('#run-form .advanced summary').first().click();
  await page.locator('#rule-commandCap').fill('10');
  await page.locator('#run-button').click();
  assert.match(await page.locator('#form-error').innerText(), /cap.*lower/i);
  assert.equal(await page.evaluate(() => FrontlinesSimulatorApp.getStatus().status), 'idle');
  await page.locator('#reset-rules').click();
  await page.locator('#run-form .advanced summary').first().click();
  await selectedMatch(page, 24);
  assert.equal(await page.locator('#deck-a').inputValue(), 'nightwalker-starter');
  await page.locator('#run-button').click();
  await status(page, 'completed');
  assert.equal(await page.evaluate(() => FrontlinesSimulatorApp.getStatus().runner), 'worker');
  const duel = await page.evaluate(() => FrontlinesSimulatorApp.getReport());
  assert.equal(duel.completed, 24);
  assert.equal(duel.summary.errors, 0);
  const json = JSON.parse(await exportFile(page, '#export-json', 'simulator-export.json'));
  assert.deepEqual(json.matches, duel.matches);
  const matchesCSV = await exportFile(page, '#export-matches', 'simulator-export.matches.csv');
  assert.equal(matchesCSV.trim().split(/\r?\n/).length, 25);
  const cardsCSV = await exportFile(page, '#export-cards', 'simulator-export.cards.csv');
  assert.match(cardsCSV, /attacksInitiated/);
  await page.locator('[data-tab="cards"]').click();
  assert.ok(await page.locator('#card-rows tr').count() > 10);
  await page.locator('#card-faction-filter').selectOption('rogue');
  assert.ok(await page.locator('#card-rows tr').count() > 0);
  assert.ok(!(await page.locator('#card-rows').innerText()).includes('Nightwalker'));
  await page.locator('[data-tab="matches"]').click();
  await page.locator('[data-match="0"]').click();
  await page.waitForFunction(() => document.querySelector('#replay-trace').textContent.includes('FINAL ANALYSIS STATE'));
  assert.match(await page.locator('#replay-trace').innerText(), /DECISION TRACE/);
  await page.locator('#close-replay').click();

  // Pause/resume preserves the job, while Stop exports only finalized matches.
  await page.locator('#match-count').fill('10000');
  await page.locator('#run-button').click();
  await page.waitForFunction(() => FrontlinesSimulatorApp.getStatus().completed >= 5);
  assert.equal(await page.locator('#match-count').isDisabled(), true);
  await page.locator('#pause-button').click();
  await status(page, 'paused');
  await page.waitForTimeout(100);
  const paused = await page.evaluate(() => FrontlinesSimulatorApp.getStatus());
  await page.waitForTimeout(350);
  const stillPaused = await page.evaluate(() => FrontlinesSimulatorApp.getStatus());
  assert.equal(stillPaused.completed, paused.completed);
  assert.ok(Math.abs(stillPaused.elapsedMs - paused.elapsedMs) < 20);
  await page.locator('#pause-button').click();
  await page.waitForFunction(previous => FrontlinesSimulatorApp.getStatus().completed > previous, paused.completed);
  await page.locator('#stop-button').click();
  await status(page, 'stopped');
  const stopped = await page.evaluate(() => FrontlinesSimulatorApp.getReport());
  assert.ok(stopped.completed > paused.completed && stopped.completed < stopped.total);
  assert.equal(stopped.matches.length, stopped.completed);
  assert.equal(stopped.complete, false);
  assert.equal(await page.locator('#export-json').isDisabled(), false);
  await page.locator('#match-count').fill('3');
  await page.locator('#run-button').click();
  await status(page, 'completed');
  await page.waitForTimeout(350);
  assert.equal(await page.evaluate(() => FrontlinesSimulatorApp.getReport().completed), 3, 'Old job messages leaked');

  // The complete browser worker benchmark must match Node/CLI records exactly.
  await page.locator('[data-tab="overview"]').click();
  await page.locator('.mode-switch label:has(input[value="matrix"])').click();
  await page.locator('#pool-starters').click();
  await page.locator('#match-count').fill('1000');
  await page.locator('#seed').fill('1009');
  await page.locator('#run-button').click();
  await status(page, 'completed');
  const matrix = await page.evaluate(() => FrontlinesSimulatorApp.getReport());
  const baseline = JSON.parse(fs.readFileSync(path.join(root, 'docs/simulator-baseline-1000.json'), 'utf8'));
  assert.equal(matrix.completed,baseline.completed);
  for(let index=0;index<baseline.matches.length;index++){const expected=baseline.matches[index],actual=matrix.matches[index];assert.deepEqual(Object.fromEntries(Object.keys(expected).map(key=>[key,actual[key]])),expected,'Canonical baseline match '+index);}
  for(const metric of ['matches','decisive','unfinished','errors','firstPlayerWins'])assert.equal(matrix.summary[metric],baseline.summary[metric]);
  const workerTime = await page.evaluate(() => FrontlinesSimulatorApp.getStatus().elapsedMs);
  for (const width of [1366,1024,768,390]) {
    await page.setViewportSize({width,height:900});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow at ${width}px`);
  }
  await page.setViewportSize({width:1366,height:900});
  await page.screenshot({path:path.join(out, 'sprint5-simulator-regression.png')});

  // Direct offline launch uses the same deterministic cooperative runner.
  const offline = await browser.newPage({viewport:{width:1366,height:768}});
  track(offline);
  await offline.goto(pathToFileURL(path.join(root, 'simulator.html')).href + '?view=advanced');
  await selectedMatch(offline, 24);
  await offline.locator('#run-button').click();
  await status(offline, 'completed');
  assert.equal(await offline.evaluate(() => FrontlinesSimulatorApp.getStatus().runner), 'cooperative');
  const local = await offline.evaluate(() => FrontlinesSimulatorApp.getReport());
  assert.deepEqual(local.matches, duel.matches);
  assert.deepEqual(local.summary, duel.summary);
  // Explicit turn/decision limit labels and missing win denominators.
  await offline.locator('#run-form .advanced summary').first().click();
  await offline.locator('#max-decisions').fill('1');
  await offline.locator('#match-count').fill('5');
  await offline.locator('#run-button').click();
  await status(offline, 'completed');
  const limited = await offline.evaluate(() => FrontlinesSimulatorApp.getReport());
  assert.equal(limited.summary.decisive, 0);
  assert.equal(limited.summary.unfinished, 5);
  assert.equal(await offline.locator('#metric-seat').innerText(), '—');

  // A Worker startup failure during Stop must not resurrect a fallback job.
  const failing = await browser.newPage();
  track(failing);
  await failing.addInitScript(() => {
    window.Worker = class {
      postMessage(message) {if(message.type === 'start')setTimeout(() => this.onerror?.({preventDefault(){},message:'Expected test startup failure'}),20);}
      terminate() {}
    };
  });
  await failing.goto('http://127.0.0.1:4173/simulator.html');
  await failing.evaluate(() => {FrontlinesSimulatorApp.start({count:20});FrontlinesSimulatorApp.stop();});
  await status(failing, 'stopped');
  assert.equal(await failing.evaluate(() => FrontlinesSimulatorApp.getStatus().completed), 0);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({workerMatches:1000,workerElapsedMs:Math.round(workerTime),nodeCLIWorkerAgreement:true,fileAgreement:true,pauseResume:true,stoppedMatches:stopped.completed,newJobIsolation:true,exportJSONCSV:true,replay:true,safetyCutoffs:true,startupStopRace:true,viewportWidths:[1366,1024,768,390],errors:0}, null, 2));
  await browser.close();
})().catch(error => {console.error(error);process.exit(1);});
