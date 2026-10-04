'use strict';
// Focused viewport regression only. No AI campaigns or balance simulations.
// The capacity fixture uses legal engine actions to put five units on each side
// of the objective. Higher setup capacity/hand/actions keep fixture assembly short.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.argv[2]||'playwright');
const origin=process.env.FRONTLINES_TEST_URL||'http://127.0.0.1:4173';
const out=path.resolve(__dirname,'../test-results');
const evidence={passed:false,kind:'battlefield-viewport-hotfix',balanceRuns:0,completeMatches:0,fixture:{units:10,slotsPerSide:5,seed:90901,legalActionsOnly:true},layouts:[],commanderVariants:[],conquestWarnings:[],interactions:{},errors:[]};
let currentPage;
fs.mkdirSync(out,{recursive:true});
const save=()=>fs.writeFileSync(path.join(out,'viewport-hotfix-browser.json'),JSON.stringify(evidence,null,2));

async function reveal(page){if(await page.locator('[data-action="reveal"]').count())await page.locator('[data-action="reveal"]').click();}
async function legalDeployment(page){return page.evaluate(()=>{
  const s=FrontlinesApp.getState(),p=s.attacker;
  return FrontlinesEngine.legalActions(s).filter(a=>a.type==='deploy'&&a.territory===(p===0?2:4)&&FrontlinesData.CARDS[s.players[p].hand.find(h=>h.uid===a.handUid)?.cardId]?.type==='unit')
    .sort((a,b)=>FrontlinesData.CARDS[s.players[p].hand.find(h=>h.uid===a.handUid).cardId].presence-FrontlinesData.CARDS[s.players[p].hand.find(h=>h.uid===b.handUid).cardId].presence)[0];
});}
async function dispatch(page,action){assert.ok(action,'Capacity fixture has a legal action');const result=await page.evaluate(a=>FrontlinesApp.dispatch(a),action);assert.equal(result.ok,true,JSON.stringify(result));}
async function fixture(page,realClicks){
  currentPage=page;
  await page.goto(origin);await page.waitForFunction(()=>!!window.FrontlinesApp);
  await page.evaluate(()=>{
    FrontlinesShell.savePreferences({presentation:'full',animationSpeed:'normal',reducedEffects:false});
    FrontlinesApp.startMatch({factions:['stonewall','bruiser'],mode:'hotseat',developer:false,bothHands:false,seed:90901,
      config:{startingCommand:80,commandCap:100,startingHand:26,actionLimit:20,captureThreshold:1000}});
  });
  await reveal(page);
  assert.equal(await page.locator('.game .random-opponent-controls').count(),0,'Random opponent controls belong to setup, not the fixed-height match HUD');
  for(let turn=0;turn<4;turn++){
    for(let i=0;i<5;i++){
      if(turn<2){
        const a=await legalDeployment(page);assert.ok(a,'Five legal unit deployments per side');
        if(realClicks&&turn===0&&i===0){
          await page.locator('[data-action="hand"][data-uid="'+a.handUid+'"]').click();
          assert.equal(await page.evaluate(()=>FrontlinesApp.getUIState().selection.kind),'hand');
          await page.locator('.territory[data-territory="'+a.territory+'"] .territory-header').click();
          assert.equal(await page.evaluate(uid=>FrontlinesApp.getState().units.some(u=>u.uid===uid),a.handUid),true);
          evidence.interactions.cardDeployByClick=true;
        }else await dispatch(page,a);
      }else{
        const a=await page.evaluate(()=>FrontlinesEngine.legalActions(FrontlinesApp.getState()).find(a=>a.type==='move'&&a.territory===3));
        assert.ok(a,'Five legal unit movements per side');
        if(realClicks&&turn===2&&i===0){
          await page.locator('[data-action="unit"][data-uid="'+a.unitUid+'"]').click();
          assert.match(await page.locator('.order-guidance').innerText(),/Move:/);
          assert.equal(await page.locator('.territory[data-territory="3"]').getAttribute('data-target-label'),'MOVE');
          await page.locator('.territory[data-territory="3"] .territory-header').click();
          assert.equal(await page.evaluate(uid=>FrontlinesApp.getState().units.find(u=>u.uid===uid).territory,a.unitUid),3);
          evidence.interactions.unitSelectionAndMoveTargetByClick=true;
        }else await dispatch(page,a);
      }
    }
    if(turn<3){
      if(realClicks)await page.locator('[data-action="end-turn"]').click();
      else await dispatch(page,{type:'endTurn'});
      await reveal(page);
    }
  }
  await page.waitForTimeout(1700);
  const units=await page.evaluate(()=>FrontlinesApp.getState().units);
  assert.equal(units.length,10);assert.equal(units.filter(u=>u.owner===0&&u.territory===3).length,5);assert.equal(units.filter(u=>u.owner===1&&u.territory===3).length,5);
  assert.equal(await page.locator('.fx-deployment,.fx-dying').count(),0,'Deployment/removal overlays expire');
}

async function layout(page,label,dpr,requireAllUnits){
  const snapshot=await page.evaluate(()=>{
    const rect=n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
    const metrics=n=>({...rect(n),scrollH:n.scrollHeight,clientH:n.clientHeight,scrollW:n.scrollWidth,clientW:n.clientWidth,scrollTop:n.scrollTop,scrollLeft:n.scrollLeft});
    const hit=n=>{const r=n.getBoundingClientRect(),top=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!top&&(n===top||n.contains(top));};
    const pick=s=>[...document.querySelectorAll(s)].map(n=>({...rect(n),hit:hit(n),text:n.textContent.trim().slice(0,120)}));
    const textRects=n=>{const r=document.createRange();r.selectNodeContents(n);return [...r.getClientRects()].filter(r=>r.width&&r.height).map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}));};
    // A Range includes characters suppressed by an intentional ellipsis. In
    // that case its visible text is clipped to the element's own line box.
    const identityText=n=>getComputedStyle(n).textOverflow==='ellipsis'&&getComputedStyle(n).overflowX==='hidden'?[rect(n)]:textRects(n);
    return {width:innerWidth,height:innerHeight,deviceScaleFactor:devicePixelRatio,page:{scrollH:document.documentElement.scrollHeight,scrollW:document.documentElement.scrollWidth,scrollY},
      map:metrics(document.querySelector('.map-scroll')),field:metrics(document.querySelector('.battlefield')),
      territories:[...document.querySelectorAll('.territory')].map(n=>({id:Number(n.dataset.territory),...rect(n),header:rect(n.querySelector('.territory-header')),progress:rect(n.querySelector('.zone-progress'))})),
      hudRow:rect(document.querySelector('.command-row')),commanderRow:rect(document.querySelector('.commander-row')),
      huds:pick('.player-hud,.turn-hud'),resources:pick('.hud-resources .resource,.command-count,.turn-owner'),commanders:pick('.commander-panel'),
      hudContent:[...document.querySelectorAll('.player-hud')].map(n=>({hud:rect(n),identity:rect(n.querySelector('.hud-identity')),identityText:[...n.querySelectorAll('.hud-name,.hud-role')].flatMap(identityText),resources:rect(n.querySelector('.hud-resources')),capacity:rect(n.querySelector('.presence-capacity')),cells:[...n.querySelectorAll('.resource')].map(c=>({cell:rect(c),texts:[...c.querySelectorAll('strong,span')].flatMap(textRects)}))})),
      commanderStatus:[...document.querySelectorAll('.commander-availability')].map(n=>({panel:rect(n.closest('.commander-panel')),status:rect(n),firstLine:textRects(n)[0]})),
      commanderControls:pick('.commander-portrait-button,.commander-active'),controls:pick('.order-buttons .btn:not(.mobile-inspect)'),
      contextualTips:pick('.context-tip'),tipControls:pick('.context-tip [data-action="dismiss-tip"]'),
      hand:metrics(document.querySelector('.hand-area')),handTray:metrics(document.querySelector('.hand-cards')),handCards:pick('.hand-cards .hand-card'),
      units:[...document.querySelectorAll('.territory.contested .unit')].map(n=>({uid:n.dataset.uid,...rect(n),roster:metrics(n.closest('.zone-roster')),hit:hit(n),nameFont:parseFloat(getComputedStyle(n.querySelector('.unit-name')).fontSize),statsFont:parseFloat(getComputedStyle(n.querySelector('.unit-stats')).fontSize)})),
      animationLayerChildren:document.querySelector('.faction-fx-layer')?.children.length||0};
  });
  snapshot.label=label;snapshot.requiredAllUnits=requireAllUnits;evidence.layouts.push(snapshot);save();
  const context=label+' '+snapshot.width+'×'+snapshot.height+' DPR '+dpr;
  const within=(r,container,msg,tolerance=1)=>assert.ok(r.left>=container.left-tolerance&&r.right<=container.right+tolerance&&r.top>=container.top-tolerance&&r.bottom<=container.bottom+tolerance,msg+' '+context+' '+JSON.stringify({r,container}));
  const windowBounds={left:0,right:snapshot.width,top:0,bottom:snapshot.height};
  assert.ok(snapshot.page.scrollH<=snapshot.height+1&&snapshot.page.scrollW<=snapshot.width+1,'No overall page overflow '+context);
  assert.equal(snapshot.page.scrollY,0,'No page scrolling '+context);
  assert.ok(snapshot.map.scrollH<=snapshot.map.clientH+1&&snapshot.map.scrollW<=snapshot.map.clientW+1,'Complete battlefield fits its viewport '+context);
  assert.equal(snapshot.map.scrollTop,0,'Battlefield does not require vertical scrolling '+context);
  assert.equal(snapshot.map.scrollLeft,0,'All seven territories appear together '+context);
  assert.equal(snapshot.territories.length,7);
  for(const t of snapshot.territories){within(t,snapshot.map,'Territory fully visible');within(t.header,t,'Territory identity visible');within(t.progress,t,'Territory control forecast visible');}
  for(const n of [...snapshot.huds,...snapshot.resources,...snapshot.commanders,...snapshot.commanderControls,...snapshot.controls])within(n,windowBounds,'Required match control visible');
  for(const n of snapshot.huds)within(n,snapshot.hudRow,'HUD remains inside its row');
  for(const h of snapshot.hudContent){
    const xOverlap=Math.min(h.identity.right,h.resources.right)-Math.max(h.identity.left,h.resources.left),yOverlap=Math.min(h.identity.bottom,h.resources.bottom)-Math.max(h.identity.top,h.resources.top);
    assert.ok(xOverlap<=1||yOverlap<=1,'Faction identity and Presence values do not overlap '+context+' '+JSON.stringify(h));
    for(const t of h.identityText){within(t,h.identity,'Faction identity text fits its allotted area');within(t,h.hud,'Faction identity text remains inside its HUD');}
    // Font ink can overhang a number's line-height:1 box by two pixels; the
    // actual clipping boundary is its HUD, and labels must stay above the bar.
    for(const c of h.cells)for(const t of c.texts){within(t,c.cell,'Presence numbers and labels fit their resource cell',2);within(t,h.hud,'Presence text remains inside its HUD');assert.ok(t.bottom<=h.capacity.top+1,'Presence label is not obscured by the capacity bar '+context+' '+JSON.stringify({t,capacity:h.capacity}));}
  }
  for(const c of snapshot.commanderStatus){within(c.status,c.panel,'Commander status remains inside its panel');assert.ok(c.firstLine,'Commander status has readable text '+context);within(c.firstLine,c.status,'Commander availability first line is fully visible');}
  for(const n of snapshot.commanders)within(n,snapshot.commanderRow,'Commander remains inside its row');
  assert.ok(snapshot.hudRow.bottom<=snapshot.commanderRow.top+1,'HUD and Commander areas do not overlap '+context);
  assert.equal(snapshot.huds.length,3);assert.equal(snapshot.commanders.length,2);assert.equal(snapshot.commanderControls.length,4);
  for(const n of [...snapshot.commanderControls,...snapshot.controls])assert.equal(n.hit,true,'Control centre hit test '+context+' '+n.text);
  for(const n of snapshot.tipControls){within(n,windowBounds,'Contextual tip can still be dismissed');assert.equal(n.hit,true,'Contextual tip dismiss is reachable '+context);}
  within(snapshot.hand,windowBounds,'Hand column fits actual available height');within(snapshot.handTray,snapshot.hand,'Hand tray is contained');
  for(const c of snapshot.handCards)assert.ok(Math.abs(c.width/c.height-5/7)<.012,'Full hand cards preserve the canonical 5/7 aspect ratio '+context+' '+JSON.stringify(c));
  assert.equal(snapshot.units.length,10);
  for(const u of snapshot.units){
    // Large-screen contested cards already use a 9px name / 7px stat baseline.
    // A viewport fix must not shrink this established text to hide overflow.
    assert.ok(u.nameFont>=9&&u.statsFont>=7,'Deployed card type remains readable '+context+' '+JSON.stringify({uid:u.uid,name:u.nameFont,stats:u.statsFont}));
    within(u.roster,snapshot.map,'Both complete unit rosters are on the battlefield');
    if(requireAllUnits){within(u,u.roster,'Every deployed card visible without roster scrolling');assert.equal(u.hit,true,'Deployed card centre hit test '+context+' '+u.uid);}
  }
  if(!requireAllUnits){
    // On unusually short/scaled desktops, each unit may use its own roster's
    // local scrollbar. Scrolling a unit into reach must never move the map/page.
    for(const u of snapshot.units){
      const n=page.locator('[data-action="unit"][data-uid="'+u.uid+'"]');await n.scrollIntoViewIfNeeded();
      const reachable=await n.evaluate(n=>{const r=n.getBoundingClientRect(),p=n.closest('.zone-roster').getBoundingClientRect(),m=document.querySelector('.map-scroll');return {within:r.top>=p.top-1&&r.bottom<=p.bottom+1,hit:n.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)),mapY:m.scrollTop,mapX:m.scrollLeft,pageY:scrollY};});
      assert.equal(reachable.within,true,'Local roster can reveal an entire unit '+context+' '+u.uid);assert.equal(reachable.hit,true,'Local roster unit reachable '+context+' '+u.uid);assert.deepEqual([reachable.mapY,reachable.mapX,reachable.pageY],[0,0,0]);
    }
    await page.evaluate(()=>document.querySelectorAll('.zone-roster').forEach(n=>n.scrollTop=0));
    snapshot.localRosterReachability=true;
  }
  const last=page.locator('.hand-cards .hand-card').last();assert.ok(await last.count());await last.scrollIntoViewIfNeeded();
  const lastReach=await last.evaluate(n=>{const r=n.getBoundingClientRect(),h=n.closest('.hand-cards').getBoundingClientRect(),m=document.querySelector('.map-scroll');return {hit:n.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)),visibleIntersection:Math.min(r.bottom,h.bottom)-Math.max(r.top,h.top),mapY:m.scrollTop,mapX:m.scrollLeft,pageY:scrollY};});
  assert.ok(lastReach.visibleIntersection>=44&&lastReach.hit,'Last hand card reachable through local scrolling '+context);assert.deepEqual([lastReach.mapY,lastReach.mapX,lastReach.pageY],[0,0,0]);
  if(await last.getAttribute('aria-disabled')==='true'){
    // v1.0.3 makes unplayable cards explicitly aria-disabled as actions. They
    // remain inspectable through the actual hover and Full card briefing flow.
    if(await page.locator('.context-tip [data-action="dismiss-tip"]').count())await page.locator('.context-tip [data-action="dismiss-tip"]').click();
    await last.hover();await page.locator('[data-action="enlarge-card"]').click();
    assert.ok(await page.locator('.full-card-preview .hand-card').count(),'Last unplayable card has an accessible full briefing');
    await page.locator('[data-action="close-modal"]').first().click();
  }else{
    await last.click();assert.equal(await page.evaluate(()=>FrontlinesApp.getUIState().selection?.kind==='hand'||!!document.querySelector('#inspector .inspector:not(.inspector-empty)')),true,'Last playable card can be selected/inspected');
  }
  await page.keyboard.press('Escape');await page.evaluate(()=>document.querySelector('.hand-cards').scrollTop=0);
  snapshot.lastHandCardReachable=true;
  await page.screenshot({path:path.join(out,'viewport-hotfix-'+snapshot.width+'x'+snapshot.height+'-dpr'+String(dpr).replace('.','')+'.png')});save();
}

async function additionalStates(browser){
  const context=await browser.newContext({viewport:{width:1280,height:720}}),page=await context.newPage();currentPage=page;
  page.on('pageerror',e=>evidence.errors.push(e.message));await page.goto(origin);await page.waitForFunction(()=>!!window.FrontlinesApp);
  const commanders=await page.evaluate(()=>FrontlinesCommanders.list().map(c=>({id:c.id,faction:c.faction})));
  assert.equal(commanders.length,10);
  const contained=(r,p,tolerance=1)=>r.left>=p.left-tolerance&&r.right<=p.right+tolerance&&r.top>=p.top-tolerance&&r.bottom<=p.bottom+tolerance;
  for(const [width,height]of[[1280,720],[1024,576]]){
    await page.setViewportSize({width,height});
    for(const cmd of commanders){
      const selected=await page.evaluate(c=>{FrontlinesApp.startMatch({factions:[c.faction,c.faction],deckIds:[c.faction+'-starter',c.faction+'-starter'],commanderIds:[c.id,c.id],mode:'hotseat',developer:false,bothHands:false,seed:90901});return FrontlinesApp.getState()?.players.map(p=>p.commander.id);},cmd);
      assert.deepEqual(selected,[cmd.id,cmd.id],'Commander selection fixture loads');await reveal(page);
      const panels=await page.evaluate(()=>{
        const box=n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
        const lines=n=>{const r=document.createRange();r.selectNodeContents(n);return [...r.getClientRects()].filter(r=>r.width&&r.height).map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom}));};
        return [...document.querySelectorAll('.commander-panel')].map(n=>({panel:box(n),name:box(n.querySelector('.commander-name')),active:box(n.querySelector('.commander-active')),activeText:[...n.querySelectorAll('.commander-active b,.commander-active small')].flatMap(lines),status:box(n.querySelector('.commander-availability')),statusFirstLine:lines(n.querySelector('.commander-availability'))[0]}));
      });
      for(const panel of panels){
        assert.ok(contained(panel.name,panel.panel),'Commander identity fits '+cmd.id+' '+width);
        assert.ok(contained(panel.active,panel.panel),'Commander active control fits '+cmd.id+' '+width);
        for(const text of panel.activeText)assert.ok(contained(text,panel.active,2),'Commander active name/cost text fits '+cmd.id+' '+width+' '+JSON.stringify({text,button:panel.active}));
        assert.ok(contained(panel.status,panel.panel),'Commander status container fits '+cmd.id+' '+width);
        assert.ok(contained(panel.statusFirstLine,panel.status),'Commander status first line fits '+cmd.id+' '+width);
      }
      evidence.commanderVariants.push({id:cmd.id,width,height,panels});save();
    }
    // This presentation-only fixture copies the production warning markup;
    // reaching its territorial trigger does not require playing a campaign.
    for(const player of [0,1]){
      await page.evaluate(p=>{document.querySelectorAll('.conquest-warning').forEach(n=>n.remove());const warning=document.createElement('div');warning.className='conquest-warning';warning.textContent='◆ ENEMY COMMAND WITHIN REACH';document.querySelector('.player-hud[data-player="'+p+'"]').append(warning);},player);
      const warning=await page.evaluate(()=>{
        const box=n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};};const n=document.querySelector('.conquest-warning'),hud=n.closest('.player-hud');
        return {warning:box(n),hud:box(hud),meta:box(hud.querySelector('.hud-meta')),commander:box(document.querySelector('.commander-row')),labels:[...hud.querySelectorAll('.resource span')].map(box)};
      });
      evidence.conquestWarnings.push({width,height,player,...warning});save();
      assert.ok(contained(warning.warning,warning.hud),'Conquest warning remains in HUD '+width+' P'+(player+1)+' '+JSON.stringify(warning));
      assert.ok(warning.warning.bottom<=warning.commander.top+1,'Conquest warning does not overlap Commander row '+width);
      for(const label of warning.labels)assert.ok(contained(label,warning.hud),'Conquest warning preserves Presence labels '+width);
      assert.ok(warning.meta.bottom<=warning.warning.top+1,'Conquest warning does not overlap HUD state '+width+' '+JSON.stringify(warning));
      await page.screenshot({path:path.join(out,'viewport-hotfix-warning-'+width+'x'+height+'-p'+(player+1)+'.png')});
    }
  }
  await context.close();
}

(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try{
    const context=await browser.newContext({viewport:{width:1366,height:768},deviceScaleFactor:1}),page=await context.newPage();
    page.on('pageerror',e=>evidence.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)evidence.errors.push(r.status()+' '+r.url());});
    await fixture(page,true);
    for(const [width,height,allUnits]of[[1920,1080,true],[1600,900,true],[1366,768,true],[1280,720,true],[1366,680,false],[1280,600,false],[1093,614,false],[1024,576,false],[900,600,false]]){
      await page.setViewportSize({width,height});await page.waitForTimeout(60);await layout(page,'window resize',1,allUnits);
    }
    await page.setViewportSize({width:1366,height:768});
    await page.locator('[data-action="commander-inspect"][data-player="1"]').click();assert.match(await page.locator('.modal').innerText(),/Passive.*Active.*Deckbuilding/s);
    await page.locator('[data-action="close-modal"]').first().click();evidence.interactions.commanderInspectionByClick=true;
    await page.locator('[data-action="commander"][data-player="1"]').click();assert.equal(await page.evaluate(()=>FrontlinesApp.getUIState().selection.kind),'commander');assert.match(await page.locator('.order-guidance').innerText(),/Breach Order/);assert.equal(await page.locator('.unit.valid-target').count(),5);
    await page.keyboard.press('Escape');evidence.interactions.commanderActiveTargetingGuidanceByClick=true;
    await layout(page,'post-interaction animation cleanup',1,true);await context.close();
    // deviceScaleFactor affects backing pixels, not CSS layout size. Pair it
    // with the effective CSS viewport expected at Windows display scaling.
    for(const [width,height,dpr,allUnits,physical]of[[1093,614,1.25,false,'1366×768 / 125%'],[1067,600,1.5,false,'1600×900 / 150%'],[1280,720,1.5,true,'1920×1080 / 150%']]){
      const scaled=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr}),p=await scaled.newPage();p.on('pageerror',e=>evidence.errors.push(e.message));
      await fixture(p,false);await layout(p,physical,dpr,allUnits);await scaled.close();
    }
    await additionalStates(browser);
    assert.deepEqual(evidence.errors,[]);evidence.passed=true;evidence.interactions.legalFixtureEndTurnsByClick=true;save();
    console.log(JSON.stringify({passed:true,viewports:evidence.layouts.length,unitsPerFixture:10,commanderVariants:evidence.commanderVariants.length,conquestWarnings:evidence.conquestWarnings.length,interactions:evidence.interactions,balanceRuns:0,errors:evidence.errors},null,2));
  }catch(error){evidence.failure=String(error.stack||error);save();if(currentPage&&!currentPage.isClosed())await currentPage.screenshot({path:path.join(out,'viewport-hotfix-failure.png')}).catch(()=>{});throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
