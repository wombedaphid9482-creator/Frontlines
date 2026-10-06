'use strict';
// Current-release offline proof. Legacy fixture bodies are loaded unchanged;
// only evidence filenames are rewritten so frozen Sprint 12 records survive.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {execFile}=require('node:child_process');
const playwright=process.argv[2]||'playwright',{chromium}=require(playwright);
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results'),origin=process.env.FRONTLINES_TEST_URL||'http://127.0.0.1:4173';
const report={passed:false,version:require('../package.json').version,kind:'current-release-offline-regression',largeCampaigns:0,legacyFixtures:[],focused:{layouts:[],errors:[]}};
fs.mkdirSync(out,{recursive:true});
async function legacy(file,replacements){
  const job={file:path.join(__dirname,file),replacements};
  const bootstrap=`const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),job=JSON.parse(process.argv[1]);let source=fs.readFileSync(job.file,'utf8');for(const [before,after]of job.replacements)source=source.split(before).join(after);const fixture=new Module(job.file,module);fixture.filename=job.file;fixture.paths=Module._nodeModulePaths(path.dirname(job.file));fixture._compile(source,job.file);`;
  console.log('Starting '+file);
  const result=await new Promise((resolve,reject)=>execFile(process.execPath,['-e',bootstrap,JSON.stringify(job),playwright],{cwd:root,timeout:180000,maxBuffer:4*1024*1024},(error,stdout,stderr)=>error?reject(Object.assign(error,{stdout,stderr})):resolve({stdout,stderr})));
  const proof=JSON.parse(result.stdout.trim());report.legacyFixtures.push({source:file,passed:proof.passed??proof.ok??proof.errors?.length===0,proof});
  console.log('Passed '+file);
}
async function geometry(page,label,selectors,minHeight=43){
  const result=await page.evaluate(({label,selectors})=>({label,width:innerWidth,height:innerHeight,deviceScaleFactor:devicePixelRatio,browserEquivalentOnly:true,
    page:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},
    controls:selectors.map(selector=>{const node=document.querySelector(selector);if(!node)return {selector,missing:true};const r=node.getBoundingClientRect();return {selector,x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};}),
    territories:[...document.querySelectorAll('.battlefield .territory')].map(node=>{const r=node.getBoundingClientRect();return {id:Number(node.dataset.territory),x:r.x,y:r.y,right:r.right,bottom:r.bottom};})}),{label,selectors});
  report.focused.layouts.push(result);await page.screenshot({path:path.join(out,'sprint13-offline-'+label.replace(/[^a-z0-9]/gi,'-')+'.png')});
  assert.ok(result.page.width<=result.width+1&&result.page.height<=result.height+1,label+' whole-page overflow '+JSON.stringify(result));
  for(const c of result.controls)assert.ok(!c.missing&&c.x>=-1&&c.y>=-1&&c.right<=result.width+1&&c.bottom<=result.height+1&&c.height>=minHeight,label+' inaccessible control '+JSON.stringify(c));
  for(const t of result.territories)assert.ok(t.x>=-1&&t.y>=-1&&t.right<=result.width+1&&t.bottom<=result.height+1,label+' territory outside viewport');
}
async function focused(){
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try{
    const context=await browser.newContext({viewport:{width:911,height:512},deviceScaleFactor:1.5}),page=await context.newPage();
    page.on('pageerror',e=>report.focused.errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('frontlines.onboarding.v1','seen'));
    await page.goto(origin);await page.waitForFunction(()=>!!window.FrontlinesApp);
    assert.match(await page.locator('.home-actions [data-game-version]').innerText(),/v1\.1\.0.*Sprint 13 — Private Online Multiplayer/);
    await geometry(page,'1366x768-150percent-home',['[data-action="open-play"]','[data-action="open-multiplayer"]','.home-actions [data-action="tutorial"]','[data-game-navigation="arsenal"]','[data-game-navigation="warroom"]'],58);
    await page.evaluate(()=>FrontlinesApp.startMatch({mode:'hotseat',developer:false,bothHands:false,factions:['stonewall','bruiser'],seed:131001}));
    assert.equal(await page.locator('.privacy').count(),1);assert.equal(await page.locator('.hand-card').count(),0,'Opening curtain exposes no cards');
    await geometry(page,'1366x768-150percent-hotseat-curtain',['[data-action="reveal"]']);
    await page.locator('[data-action="reveal"]').click();
    const hand=await page.evaluate(()=>{const s=FrontlinesApp.getState(),actor=FrontlinesEngine.getActor(s);return {actor,own:s.players[actor].hand.map(c=>c.uid),other:s.players[1-actor].hand.map(c=>c.uid)};});
    const shown=await page.locator('.hand-area .hand-card').evaluateAll(nodes=>nodes.map(n=>n.dataset.uid));assert.deepEqual(shown,hand.own);assert.ok(!shown.some(uid=>hand.other.includes(uid)));
    await geometry(page,'1366x768-150percent-hotseat-match',['[data-action="end-turn"]']);
    await page.locator('[data-action="end-turn"]').click();assert.equal(await page.locator('.privacy').count(),1);assert.equal(await page.locator('.hand-card').count(),0,'Transfer hides both hands');
    const state=await page.evaluate(()=>JSON.stringify(FrontlinesApp.getState()));await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>FrontlinesApp.getUIState().screen),'home');assert.equal(await page.locator('.hand-card').count(),0);
    await page.locator('[data-action="open-play"]').click();assert.equal(await page.locator('.privacy').count(),1,'Resume retains transfer curtain');assert.equal(await page.evaluate(()=>JSON.stringify(FrontlinesApp.getState())),state);
    await page.locator('[data-action="reveal"]').click();assert.equal(await page.evaluate(()=>FrontlinesApp.getUIState().actor),1);assert.equal(await page.locator('.debug-other-hand').count(),0);
    report.focused.hotseatPrivacy={opening:true,transfer:true,menuAndResume:true,ownOnly:true};
    await page.goto(origin);await page.waitForFunction(()=>!!window.FrontlinesApp);await page.evaluate(()=>FrontlinesApp.startTutorial(false));
    await page.waitForFunction(()=>{const images=[...document.querySelectorAll('.commander-row .commander-portrait img')];return images.length===2&&images.every(img=>img.complete&&img.naturalWidth>0);});
    await page.locator('.commander-row .commander-portrait img').evaluateAll(async images=>{await Promise.all(images.map(img=>img.decode()));await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
    report.focused.tutorialPortraits=await page.locator('.commander-row .commander-portrait img').evaluateAll(images=>images.map(img=>({src:img.getAttribute('src'),naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight})));
    await geometry(page,'1366x768-150percent-tutorial',['[data-tutorial-action="hint"]','[data-tutorial-action="next"]','[data-tutorial-action="restart-lesson"]'],40);
    assert.equal(await page.locator('#inspector').isVisible(),false,'Empty tutorial inspector yields space to the actual hand');
    await page.locator('[data-tutorial-action="next"]').click();
    const deploy=await page.evaluate(()=>FrontlinesApp.getTutorialState().refs.deploy),card=page.locator('.hand-area .hand-card[data-uid="'+deploy+'"]');
    const art=await card.evaluate(node=>{const box=n=>n.getBoundingClientRect().toJSON(),portrait=node.querySelector('.card-art'),tray=node.closest('.hand-cards');return {card:box(node),art:box(portrait),tray:box(tray)};});
    assert.ok(Math.abs(art.card.width/art.card.height-5/7)<.012,'Compact teaching card keeps 5:7 frame');
    assert.ok(art.art.top>=art.tray.top-1&&art.art.bottom<=art.tray.bottom+1,'Unit artwork remains fully visible in the compact hand');
    await card.click();assert.equal(await page.locator('#inspector').isVisible(),true,'Selected-card inspector remains available');
    assert.ok((await page.locator('#inspector').innerText()).includes('Presence'),'Inspector retains card costs');
    await page.locator('.territory[data-territory="2"] .territory-header').click();assert.equal(await page.evaluate(()=>FrontlinesApp.getTutorialState().complete),true,'Actual guided deployment remains clickable at scaled viewport');
    report.focused.compactTutorialCard={ratio:5/7,artVisible:true,selectedInspectorVisible:true,deploymentClicked:true,geometry:art};
    await geometry(page,'1366x768-150percent-tutorial-deployed',['[data-tutorial-action="next"]'],44);
    await page.goto(origin+'/deck-builder.html');await page.waitForFunction(()=>!!window.FrontlinesDeckBuilder);
    await geometry(page,'1366x768-150percent-deck-builder',['.arsenal-command-bar [data-action="save"]','.arsenal-command-bar [data-action="simulate"]','.arsenal-command-bar [data-action="play"]']);
    await page.goto(origin+'/simulator.html');await page.waitForFunction(()=>!!window.FrontlinesSimulatorApp);await page.locator('[data-war-room="quick"]').click();
    await geometry(page,'1366x768-150percent-war-room',['#run-button']);
    await page.setViewportSize({width:1366,height:768});
    const options={mode:'duel',count:1,deckA:'stonewall-prepared-ground',deckB:'bruiser-breach-column',balanceProfile:'sprint12',seed:131003,aiProfiles:['deck','deck'],verify:true,maxTurns:240,maxDecisions:10000};
    await page.evaluate(options=>FrontlinesSimulatorApp.start(options),options);await page.waitForFunction(()=>['completed','error','stopped'].includes(FrontlinesSimulatorApp.getStatus().status),null,{timeout:30000});
    const sim=await page.evaluate(()=>({status:FrontlinesSimulatorApp.getStatus(),report:FrontlinesSimulatorApp.getReport()}));assert.equal(sim.status.status,'completed');assert.equal(sim.status.runner,'worker');assert.equal(sim.report.completed,1);assert.equal(sim.report.summary.errors,0);assert.equal(sim.report.summary.unfinished,0);
    fs.writeFileSync(path.join(out,'sprint13-current-worker-match.json'),JSON.stringify(sim.report,null,2)+'\n');report.focused.currentWorker={matches:1,runner:'worker',errors:0,rulesVersion:sim.report.rulesSnapshot.rulesVersion,gameVersion:sim.report.gameVersion};
    assert.deepEqual(report.focused.errors,[]);
  }finally{await browser.close();}
}
(async()=>{
  if(process.argv[3]!=='--legacy')await focused();
  if(process.argv[3]!=='--focused'){
    await legacy('browser-sprint12-tutorial.js',[['sprint12-tutorial-browser.json','sprint13-tutorial-browser.json'],['tutorial-minimum-sprint-9.png','tutorial-minimum-sprint-13.png'],['tutorial-sprint-9.png','tutorial-sprint-13.png']]);
    await legacy('browser-commanders-decks-sprint9.js',[['sprint9-commander-','sprint13-commander-']]);
    await legacy('browser-arsenal-sprint7.js',[['sprint7-arsenal-','sprint13-arsenal-'],['sprint7-library-recovery.json','sprint13-library-recovery.json']]);
    await legacy('browser-sprint12-lab-migration.js',[['sprint12-lab-migration.json','sprint13-lab-migration.json']]);
  }
  report.passed=true;
})().catch(error=>{report.failure=String(error.stack||error);if(error.stdout)report.childOutput=error.stdout;if(error.stderr)report.childError=error.stderr;process.exitCode=1;}).finally(()=>{fs.writeFileSync(path.join(out,process.argv[3]==='--legacy'?'sprint13-offline-legacy-regressions.json':'sprint13-offline-regressions.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,legacyFixtures:report.legacyFixtures.length,layouts:report.focused.layouts.length,currentWorker:report.focused.currentWorker,failure:report.failure}));});
