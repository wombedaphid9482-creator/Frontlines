#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const Simulator = require('../sim-core.js');

const HELP = `Project Faction Cards — headless balance simulator

Usage: node scripts/simulate.js [options]
  --count N             Total matches to run, 1–100000 (default 100)
  --a DECK              First faction or starter deck ID (default stonewall)
  --b DECK              Second faction or starter deck ID (default bruiser)
  --mode duel|matrix    Selected matchup or all starter matchups (default duel)
  --seed N              Reproducible unsigned 32-bit base seed (default 1009)
  --fixed-seats         Keep A as Player 1 in duel mode
  --mirrors             Include mirror matches in matrix mode
  --max-turns N         Offensive-turn cutoff (default 240)
  --max-decisions N     AI-decision cutoff per match (default 10000)
  --verify              Check invariants and card conservation every decision
  --out FILE            JSON report (default test-results/simulator-report.json)
  --csv                 Also write sibling .matches.csv and .cards.csv files
  --help                Show this help

Seat-swapped pairs reuse one seed. Matrix mode always includes both seats.
Cutoffs and errors are unfinished, never inferred wins. Ctrl+C saves completed
matches; the current incomplete match is excluded. No animations or sleeps.
`;

function parseArgs(args) {
  const options = {}, result = {options,out:'test-results/simulator-report.json',csv:false,help:false};
  const values = {'--count':'count','--a':'deckA','--b':'deckB','--mode':'mode','--seed':'seed','--max-turns':'maxTurns','--max-decisions':'maxDecisions'};
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (flag === '--help' || flag === '-h') result.help = true;
    else if (flag === '--csv') result.csv = true;
    else if (flag === '--verify') options.verify = true;
    else if (flag === '--fixed-seats') options.swapSeats = false;
    else if (flag === '--mirrors') options.includeMirrors = true;
    else if (flag === '--out' || values[flag]) {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}.`);
      if (flag === '--out') result.out = value; else options[values[flag]] = value;
    } else throw new Error(`Unknown option: ${flag}. Use --help for usage.`);
  }
  return result;
}

async function main(args = process.argv.slice(2)) {
  const cli = parseArgs(args);
  if (cli.help) { process.stdout.write(HELP); return null; }
  const run = Simulator.createRun(cli.options), start = performance.now();
  let stopped = false,lastProgress = start;
  const stop = () => { stopped = true; };
  process.on('SIGINT',stop);
  try {
    // A short chunk gives SIGINT a chance to save a partial report, while the
    // shared core makes exactly the same decisions as the browser worker.
    while (!run.done && !stopped) {
      const deadline = performance.now() + 25;
      do { run.step(); } while (!run.done && performance.now() < deadline);
      if (performance.now() - lastProgress >= 1000) {
        process.stderr.write(`Completed ${run.completed}/${run.total} matches.\n`);
        lastProgress = performance.now();
      }
      await new Promise(resolve => setImmediate(resolve));
    }
  } finally { process.removeListener('SIGINT',stop); }
  const report = run.result();
  report.reason = stopped ? 'stopped' : 'completed';
  report.elapsedMs = performance.now() - start;
  const output = path.resolve(cli.out);
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(report,null,2) + '\n');
  if (cli.csv) {
    const base = output.replace(/\.json$/i,'');
    fs.writeFileSync(`${base}.matches.csv`,Simulator.matchesCSV(report));
    fs.writeFileSync(`${base}.cards.csv`,Simulator.cardsCSV(report));
  }
  process.stdout.write(`${report.completed}/${report.total} matches saved to ${output}\n`);
  process.stdout.write(`${report.summary.decisive} decisive; ${report.summary.unfinished} cutoffs; ${report.summary.errors} errors. ${(report.elapsedMs/1000).toFixed(2)} seconds.\n`);
  if (report.summary.errors) process.exitCode = 1;
  return report;
}
if (require.main === module) main().catch(error => { console.error(error.message);process.exitCode = 1; });
module.exports = {parseArgs,main};
