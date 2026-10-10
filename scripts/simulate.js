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
  --max-turns N         Paired Turn cutoff for sprint15 (default 120);
                        historical profiles count Action Windows (default 240)
  --max-action-windows N  Explicit normal-window cutoff (paired default 240)
  --max-decisions N     AI-decision cutoff per match (default 10000)
  --verify              Check invariants and card conservation every decision
  --balance PROFILE     Centralized balance profile (default baseline)
  --ai PROFILE          baseline, faction, deck, or random for both decks
  --deck-file-a FILE    Exported deck JSON for side A
  --deck-file-b FILE    Exported deck JSON for side B
  --pool IDS            Matrix pool: archetypes, starters, commanders, or IDs
  --ai-a PROFILE        Override policy attached to original A deck
  --ai-b PROFILE        Override policy attached to original B deck
  --compare FILE        Compare a previous JSON report using matched seeds
  --out FILE            JSON report (default test-results/simulator-report.json)
  --csv                 Also write sibling matches/cards/commanders CSV files
  --help                Show this help

Seat-swapped pairs reuse one seed. Matrix mode always includes both seats.
Cutoffs and errors are unfinished, never inferred wins. Ctrl+C saves completed
matches; the current incomplete match is excluded. No animations or sleeps.
`;

function parseArgs(args) {
  const options = {}, result = {options,out:'test-results/simulator-report.json',csv:false,help:false,compare:null};
  let aiA,aiB;
  const values = {'--count':'count','--a':'deckA','--b':'deckB','--mode':'mode','--seed':'seed','--max-turns':'maxTurns','--max-action-windows':'maxActionWindows','--max-decisions':'maxDecisions','--balance':'balanceProfile','--ai':'ai'};
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (flag === '--help' || flag === '-h') result.help = true;
    else if (flag === '--csv') result.csv = true;
    else if (flag === '--verify') options.verify = true;
    else if (flag === '--fixed-seats') options.swapSeats = false;
    else if (flag === '--mirrors') options.includeMirrors = true;
    else if (flag === '--out'||flag==='--compare'||flag==='--ai-a'||flag==='--ai-b'||flag==='--deck-file-a'||flag==='--deck-file-b'||flag==='--pool'||values[flag]) {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}.`);
      if(flag==='--out')result.out=value;else if(flag==='--compare')result.compare=value;
      else if(flag==='--deck-file-a')result.deckFileA=value;else if(flag==='--deck-file-b')result.deckFileB=value;else if(flag==='--pool')result.pool=value;
      else if(flag==='--ai-a')aiA=value;else if(flag==='--ai-b')aiB=value;else options[values[flag]]=value;
    } else throw new Error(`Unknown option: ${flag}. Use --help for usage.`);
  }
  if(aiA||aiB)options.aiProfiles=[aiA||options.ai||'baseline',aiB||options.ai||'baseline'];
  return result;
}
function unusedOutput(requested,csv){
  const absolute=path.resolve(requested),extension=path.extname(absolute)||'.json',stem=absolute.slice(0,absolute.length-(path.extname(absolute).length));
  let candidate=absolute,index=1;
  function exists(file){const base=file.replace(/\.json$/i,'');return fs.existsSync(file)||fs.existsSync(`${base}.html`)||(csv&&(fs.existsSync(`${base}.matches.csv`)||fs.existsSync(`${base}.cards.csv`)||fs.existsSync(`${base}.commanders.csv`)));}
  while(exists(candidate))candidate=`${stem}-${++index}${extension}`;
  return candidate;
}

async function main(args = process.argv.slice(2)) {
  const cli = parseArgs(args);
  if (cli.help) { process.stdout.write(HELP); return null; }
  const Decks=require('../decks.js').forData(require('../balance.js').dataFor(cli.options.balanceProfile||'baseline'));
  for(const side of ['A','B'])if(cli['deckFile'+side]){
    const file=path.resolve(cli['deckFile'+side]);if(fs.statSync(file).size>100000)throw new Error('Deck files must be smaller than 100 KB.');
    const deck=Decks.importDeck(fs.readFileSync(file,'utf8'));deck.id='import-'+side.toLowerCase();
    (cli.options.customDecks||(cli.options.customDecks=[])).push(deck);cli.options['deck'+side]=deck.id;
  }
  if(cli.pool){if(cli.pool==='commanders'&&!Decks.commandersEnabled())throw new Error('Commander foundations require --balance sprint9.');cli.options.deckPool=cli.pool==='archetypes'?Decks.presets().map(d=>d.id):cli.pool==='starters'?Decks.starters().map(d=>d.id):cli.pool==='commanders'?Decks.commanderStarters().map(d=>d.id):cli.pool.split(',');}
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
  const comparison=cli.compare?Simulator.compareReports(JSON.parse(fs.readFileSync(path.resolve(cli.compare),'utf8')),report):null;
  if(comparison)report.comparison=comparison;
  const output=unusedOutput(cli.out,cli.csv),base=output.replace(/\.json$/i,'');
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(report,null,2) + '\n');
  fs.writeFileSync(`${base}.html`,Simulator.reportHTML(report,comparison));
  if (cli.csv) {
    fs.writeFileSync(`${base}.matches.csv`,Simulator.matchesCSV(report));
    fs.writeFileSync(`${base}.cards.csv`,Simulator.cardsCSV(report));
    if(report.summary.byCommander)fs.writeFileSync(`${base}.commanders.csv`,Simulator.commandersCSV(report));
  }
  process.stdout.write(`${report.completed}/${report.total} matches saved to ${output}\n`);
  process.stdout.write(`${report.summary.decisive} decisive; ${report.summary.unfinished} cutoffs; ${report.summary.errors} errors. ${(report.elapsedMs/1000).toFixed(2)} seconds.\n`);
  if (report.summary.errors) process.exitCode = 1;
  return report;
}
if (require.main === module) main().catch(error => { console.error(error.message);process.exitCode = 1; });
module.exports = {parseArgs,main,unusedOutput};
