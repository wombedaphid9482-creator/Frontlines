#!/usr/bin/env node
'use strict';
// Owner-operated campaign. Preparing a plan never starts a match.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const BASELINE=path.join(ROOT,'docs/balance/sprint15-v1.2.0-baseline');
const COUNT=24500,SEED=1209;
const HELP=`Frontlines Turn System 2.0 — frozen-build comparison

Usage: node scripts/validate-paired-timing.js [--plan | --run] [--out DIRECTORY]

Without --run, print this help and prepare the exact verified plan only.
--plan prints full normalized options and schedule exposure; runs no matches.
--run executes 24,500 frozen v1.2.0 matches and 24,500 v1.3.0 matches.
Ryken must separately authorize this owner-operated balance campaign.
--out selects a new output directory; existing directories are never overwritten.
Both builds use 35 decks, mirrors, paired opposing seats, seed 1209, deck AI,
240 normal Action Windows, 10,000 decisions, and invariant verification.
The frozen build loads its own engine, AI, telemetry, cards and package version.
`;
function parseArgs(args){const result={run:false,plan:false,out:null};for(let i=0;i<args.length;i++){const flag=args[i];if(flag==='--run')result.run=true;else if(flag==='--plan')result.plan=true;else if(flag==='--help'||flag==='-h')result.help=true;else if(flag==='--out'){const value=args[++i];if(!value||value.startsWith('--'))throw Error('Missing output directory.');result.out=path.resolve(value);}else throw Error('Unknown option '+flag+'. Use --help.');}if(result.run&&result.plan)throw Error('Choose --plan or --run.');return result;}
function hash(bytes){return crypto.createHash('sha256').update(bytes).digest('hex');}
function scheduleSource(source){const text=fs.readFileSync(source,'utf8'),begin=text.indexOf('  function scheduleFor('),end=text.indexOf('  // Explicit immutable deck lists',begin);if(begin<0||end<0)throw Error('Cannot verify frozen schedule implementation.');return text.slice(begin,end).replace(/\s+/g,'');}
function preparePlan(){
 const manifest=JSON.parse(fs.readFileSync(path.join(BASELINE,'checkpoint-hashes.json'),'utf8')),source=path.join(BASELINE,'source');
 for(const [file,expected]of Object.entries(manifest.sourceHashes)){const saved=path.join(source,file);if(!fs.existsSync(saved)||hash(fs.readFileSync(saved))!==expected)throw Error('Frozen v1.2.0 source changed: '+file);}
 if(scheduleSource(path.join(source,'sim-core.js'))!==scheduleSource(path.join(ROOT,'sim-core.js')))throw Error('Schedule generator changed; update the owner comparison plan explicitly.');
 const candidate=require('../sim-core'),candidateBalance=require('../balance');
 // Absolute require resolves every baseline relative dependency inside source/.
 const baseline=require(path.join(source,'sim-core.js')),baselineBalance=require(path.join(source,'balance.js'));
 const oldDecks=baseline.getDeckCatalog(baselineBalance.dataFor('sprint12')),newDecks=candidate.getDeckCatalog(candidateBalance.dataFor('sprint15'));
 const lists=decks=>decks.map(d=>({id:d.id,faction:d.faction,cards:d.cards,commanderId:d.commanderId}));
 if(oldDecks.length!==35||JSON.stringify(lists(oldDecks))!==JSON.stringify(lists(newDecks)))throw Error('The frozen/current 35-deck pools differ; review before comparison.');
 const shared={mode:'matrix',count:COUNT,deckPool:oldDecks.map(d=>d.id),includeMirrors:true,swapSeats:true,seed:SEED,ai:'deck',maxDecisions:10000,verify:true};
 const oldOptions=baseline.normalizeOptions({...shared,balanceProfile:'sprint12',maxTurns:240});
 const newOptions=candidate.normalizeOptions({...shared,balanceProfile:'sprint15',maxTurns:120,maxActionWindows:240});
 if(JSON.stringify(oldOptions.config)!==JSON.stringify(newOptions.config))throw Error('Rule numeric configurations differ; this timing comparison needs review.');
 const schedule=candidate.scheduleFor(newOptions),exposures={};
 for(let i=0;i<COUNT;i++){const item=candidate.scheduledMatch(newOptions,schedule,i),key=item.deckIds.join('|');exposures[key]=(exposures[key]||0)+1;}
 const mirrors=schedule.filter(s=>s.a===s.b).length,nonMirrors=schedule.length-mirrors;
 if(schedule.length!==1225||mirrors!==35||nonMirrors!==1190||Object.values(exposures).some(n=>n!==20))throw Error('Unexpected schedule exposure.');
 return {status:'prepared-not-executed',baselineCommit:manifest.baseCommit,sourceFilesVerified:Object.keys(manifest.sourceHashes).length,requestedMatchesPerBuild:COUNT,totalRequestedMatches:COUNT*2,seed:SEED,deckCount:35,
  schedule:{cellsPerCycle:schedule.length,mirrorCells:mirrors,directedNonMirrorCells:nonMirrors,seedGroupsPerCycle:630,cycles:20,matchesPerDirectedCell:20,matchesPerUnorderedNonMirrorPair:40,matchesPerMirrorCell:20,deckAppearancesPerBuild:1400,pairedSeedGroupsPerBuild:12600,exposures},
  ai:'deck; simulator default evaluation, no live difficulty override',actionWindowBudget:240,
  builds:[{id:'v1.2.0',moduleRoot:source,profile:'sprint12',timingModel:'legacy-action-windows-v1',turnUnit:'normal-action-windows',windowBudgetImplementation:'Original maxTurns=240; one historical turn is one normal window.',options:oldOptions},{id:'v1.3.0',moduleRoot:ROOT,profile:'sprint15',timingModel:'paired-turns-v2',turnUnit:'paired-turns',windowBudgetImplementation:'Explicit maxActionWindows=240 and maxTurns=120.',options:newOptions}]};
}
function writeReport(directory,build,simulator,report){const base=path.join(directory,build.id);fs.writeFileSync(base+'.json',JSON.stringify(report,null,2)+'\n');fs.writeFileSync(base+'.html',simulator.reportHTML(report));fs.writeFileSync(base+'.matches.csv',simulator.matchesCSV(report));fs.writeFileSync(base+'.cards.csv',simulator.cardsCSV(report));if(report.summary.byCommander)fs.writeFileSync(base+'.commanders.csv',simulator.commandersCSV(report));}
async function executePlan(plan,directory){
 if(fs.existsSync(directory))throw Error('Output directory already exists. Choose a new --out directory.');
 fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,'plan.json'),JSON.stringify(plan,null,2)+'\n');
 let stopped=false;const stop=()=>{stopped=true;};process.on('SIGINT',stop);const reports=[];
 try{for(const build of plan.builds){if(stopped)break;const simulator=require(path.join(build.moduleRoot,'sim-core.js')),run=simulator.createRun(build.options),start=performance.now();let last=start;
  while(!run.done&&!stopped){const deadline=performance.now()+25;do{run.step();}while(!run.done&&performance.now()<deadline);if(performance.now()-last>1000){process.stderr.write(build.id+': '+run.completed+'/'+run.total+' completed\n');last=performance.now();}await new Promise(resolve=>setImmediate(resolve));}
  const report=run.result();report.reason=stopped?'stopped':'completed';report.elapsedMs=performance.now()-start;report.comparator={baselineCommit:plan.baselineCommit,moduleRoot:build.moduleRoot,timingModel:build.timingModel,actionWindowBudget:plan.actionWindowBudget};writeReport(directory,build,simulator,report);reports.push(report);if(report.summary.errors)process.exitCode=1;
 }}finally{process.removeListener('SIGINT',stop);}
 if(reports.length===2){const simulator=require('../sim-core'),comparison=simulator.compareReports(reports[0],reports[1]);fs.writeFileSync(path.join(directory,'comparison.json'),JSON.stringify(comparison,null,2)+'\n');fs.writeFileSync(path.join(directory,'comparison.html'),simulator.reportHTML(reports[1],comparison));}
 process.stdout.write('Saved '+reports.length+' build report(s) to '+directory+'\n');return reports;
}
async function main(args=process.argv.slice(2)){const cli=parseArgs(args);if(cli.help){process.stdout.write(HELP);return null;}const plan=preparePlan();if(!cli.run){if(!cli.plan)process.stdout.write(HELP+'\n');process.stdout.write(JSON.stringify(plan,null,2)+'\n');return plan;}const stamp=new Date().toISOString().replace(/[:.]/g,'-');return executePlan(plan,cli.out||path.join(ROOT,'test-results','paired-timing-'+stamp));}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={parseArgs,preparePlan,main};
