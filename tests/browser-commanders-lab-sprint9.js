'use strict';
// Renderer/export contract only. The injected runner performs no match decisions.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.argv[2]||'playwright');
const origin=process.env.FRONTLINES_TEST_URL||'http://127.0.0.1:4173',out=path.resolve('test-results');
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{
  const page=await browser.newPage({viewport:{width:1366,height:768},acceptDownloads:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(origin+'/simulator.html');await page.waitForFunction(()=>!!window.FrontlinesSimulatorApp);
  await page.locator('[data-war-room="quick"]').click();
  const preview=await page.evaluate(()=>{
    const options={balanceProfile:'sprint9',count:1,seed:909,ai:'deck',deckA:'commander_stonewall_warden-foundation',deckB:'commander_bruiser_bloodhound-foundation'},report=FrontlinesSimulator.createRun(options).result();
    window.Worker=undefined;
    FrontlinesSimulator.createRun=()=>({done:true,step(){},snapshot:()=>report,result:()=>report});
    FrontlinesSimulatorApp.start(options);return report.completed;
  });assert.equal(preview,0);
  await page.waitForFunction(()=>FrontlinesSimulatorApp.getStatus().status==='completed');await page.locator('#tab-decks').click();
  assert.equal(await page.locator('#commander-results').isVisible(),true);assert.equal(await page.locator('#commander-result-rows tr').count(),2);
  assert.match(await page.locator('#commander-result-rows').innerText(),/The Warden/);assert.match(await page.locator('#commander-result-rows').innerText(),/The Bloodhound/);
  assert.match(await page.locator('#commander-results').innerText(),/not isolated Commander strength/);assert.equal(await page.locator('#export-commanders').isEnabled(),true);
  const download=page.waitForEvent('download');await page.locator('#export-commanders').click();const target=path.join(out,'sprint9-commanders-preview.commanders.csv');await(await download).saveAs(target);
  const csv=fs.readFileSync(target,'utf8');assert.match(csv,/commander_stonewall_warden/);assert.match(csv,/presenceSaved,commandActionsSaved,bonusPressure/);assert.equal(csv.trim().split('\r\n').length,3);
  await page.screenshot({path:path.join(out,'sprint9-commander-lab-results.png')});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'sprint9-commander-lab-results-390.png')});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(errors,[]);const result={ok:true,balanceRuns:0,matchDecisions:0,checks:['Commander result rows','normal-player Commander CSV export','typed telemetry and version columns','narrow results layout','zero runtime errors']};fs.writeFileSync(path.join(out,'sprint9-commander-lab-browser.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
