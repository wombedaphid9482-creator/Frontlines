'use strict';
const assert=require('node:assert/strict');const {chromium}=require(process.argv[2]||'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:900,height:600}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  // Isolated host adapter exercises event-driven update UI without contacting a release server.
  await page.addInitScript(()=>{
    let callback,host={version:'0.6.0',fullscreen:false,update:{status:'disabled'},activeMatch:false};
    window.updateRestarts=0;
    window.FrontlinesDesktop={getState:async()=>({...host}),setFullscreen:async value=>{host={...host,fullscreen:value};callback?.(host);return host;},
      setMatchActive:async value=>{host={...host,activeMatch:value};return host;},checkUpdate:async()=>host,
      restartUpdate:async()=>{if(!host.activeMatch&&host.update.status==='ready')updateRestarts++;return {ok:!host.activeMatch};},quit:async()=>{},onNavigate:()=>{},
      onState:listener=>{callback=listener;return ()=>{};}};
    window.injectUpdate=update=>{host={...host,update};callback?.(host);};
  });
  await page.goto('http://127.0.0.1:4173');await page.waitForSelector('[data-action="open-play"]');
  await page.locator('[data-action="settings"]').click();await page.locator('#display-mode').selectOption('fullscreen');assert.equal(await page.evaluate(()=>FrontlinesShell.getState().desktop.fullscreen),true);
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>FrontlinesShell.getState().desktop.fullscreen),true,'Escape unexpectedly exited fullscreen');
  await page.evaluate(()=>FrontlinesApp.startMatch({mode:'ai',factions:['stonewall','bruiser'],seed:7317}));
  const before=await page.evaluate(()=>JSON.stringify(FrontlinesApp.getState()));
  await page.locator('[data-action="settings"]').click();
  await page.evaluate(()=>injectUpdate({status:'ready',version:'0.7.0'}));await page.locator('[data-settings-tab="advanced"]').click();
  assert.equal(await page.locator('.shell-settings [data-shell-action="restart-update"]').isDisabled(),true);
  assert.equal(await page.locator('#shell-update-notice').count(),0,'Update toast interrupted match');assert.equal(await page.evaluate(()=>updateRestarts),0);
  await page.waitForTimeout(1000);assert.equal(await page.evaluate(()=>JSON.stringify(FrontlinesApp.getState())),before,'Match advanced while settings overlay was open');
  await page.keyboard.press('Escape');await page.evaluate(()=>FrontlinesApp.showScreen('home'));assert.equal(await page.locator('#shell-update-notice').count(),0,'Paused active match lost update protection');
  await page.evaluate(()=>{FrontlinesApp.showScreen('play');FrontlinesApp.startMatch({mode:'hotseat',factions:['stonewall','bruiser'],seed:7317,developer:true,bothHands:true});let n=0;while(FrontlinesApp.getState().winner===null&&n++<3000)FrontlinesApp.dispatch(FrontlinesAI.chooseAction(FrontlinesApp.getState()));FrontlinesApp.showScreen('home');});
  await page.waitForSelector('#shell-update-notice');await page.locator('#shell-update-notice [data-shell-action="dismiss-update"]').click();assert.equal(await page.locator('#shell-update-notice').count(),0);
  await page.locator('[data-action="settings"]').click();await page.locator('[data-settings-tab="advanced"]').click();assert.equal(await page.locator('.shell-settings [data-shell-action="restart-update"]').isDisabled(),false);
  await page.locator('.shell-settings [data-shell-action="restart-update"]').click();assert.equal(await page.evaluate(()=>updateRestarts),1);
  await page.evaluate(()=>injectUpdate({status:'downloading',version:'0.7.0',percent:37}));assert.match(await page.locator('#settings-update-text').textContent(),/37%/);assert.equal(await page.locator('.shell-settings [data-shell-action="restart-update"]').isDisabled(),true);
  assert.equal(await page.locator('.shell-settings [data-shell-action="check-update"]').isDisabled(),true);
  await page.evaluate(()=>injectUpdate({status:'error'}));assert.match(await page.locator('#settings-update-text').textContent(),/try again later/);
  assert.equal(await page.locator('.shell-settings [data-shell-action="check-update"]').isDisabled(),false);
  await page.keyboard.press('Escape');
  const scaling=[];
  for(const factor of [1.25,1.5]){const context=await browser.newContext({viewport:{width:Math.floor(1920/factor),height:Math.floor(1080/factor)},deviceScaleFactor:factor});const scaled=await context.newPage();await scaled.goto('http://127.0.0.1:4173');await scaled.locator('[data-action="settings"]').click();const dimensions=await scaled.evaluate(()=>({width:innerWidth,height:innerHeight,docWidth:document.documentElement.scrollWidth,docHeight:document.documentElement.scrollHeight,close:document.querySelector('.shell-settings footer button').getBoundingClientRect().bottom}));assert.ok(dimensions.docWidth<=dimensions.width+1&&dimensions.docHeight<=dimensions.height+1&&dimensions.close<=dimensions.height);scaling.push({factor,...dimensions});await context.close();}
  assert.deepEqual(errors,[]);console.log(JSON.stringify({fullscreenControl:true,escapePreservesFullscreen:true,updateNeverRestartsActiveMatch:true,pausedMatchProtected:true,manualRestartAfterMatch:true,settingsPauseAI:true,emulatedDisplayScaling:scaling,errors},null,2));await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
