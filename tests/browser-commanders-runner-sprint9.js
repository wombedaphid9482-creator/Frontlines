'use strict';
// Two fixed fixture seeds reproduced across execution paths; no balance sweep.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.argv[2]||'playwright'),S=require('../sim-core');
const options={balanceProfile:'sprint9',count:2,seed:100009,ai:'deck',verify:true,deckA:'commander_stonewall_warden-foundation',deckB:'commander_bruiser_bloodhound-foundation'},out=path.resolve('test-results');
(async()=>{const run=S.createRun(options);while(!run.done)run.step();const expected=run.result();const browser=await chromium.launch({headless:true,channel:'msedge'});try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const paths=[];
  for(const url of ['http://127.0.0.1:4173/simulator.html',new URL('file:///'+path.resolve('simulator.html').replaceAll('\\','/')).href]){
    await page.goto(url);await page.waitForFunction(()=>!!window.FrontlinesSimulatorApp);await page.evaluate(o=>FrontlinesSimulatorApp.start(o),options);await page.waitForFunction(()=>['completed','error'].includes(FrontlinesSimulatorApp.getStatus().status),null,{timeout:30000});
    const result=await page.evaluate(()=>({status:FrontlinesSimulatorApp.getStatus(),report:FrontlinesSimulatorApp.getReport()}));assert.equal(result.status.status,'completed');assert.equal(result.report.summary.errors,0);assert.equal(result.report.summary.unfinished,0);assert.deepEqual(result.report.matches,expected.matches);assert.deepEqual(result.report.summary,expected.summary);assert.deepEqual(result.report.rulesSnapshot,expected.rulesSnapshot);paths.push({protocol:new URL(url).protocol,runner:result.status.runner,completed:result.report.completed,commanderParity:true});
  }
  assert.equal(paths[0].runner,'worker');assert.equal(paths[1].runner,'cooperative');assert.deepEqual(errors,[]);const result={ok:true,uniqueFixtureMatches:2,seed:100009,paths,exactNodeParity:true,balanceCampaign:false,errors};fs.writeFileSync(path.join(out,'sprint9-commanders-runner-browser.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
