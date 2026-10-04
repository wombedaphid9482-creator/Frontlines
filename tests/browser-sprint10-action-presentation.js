'use strict';
// Presentation and legal-action smoke only: no balance campaign or complete match.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.argv[2]||'playwright');
const origin=process.env.FRONTLINES_TEST_URL||'http://127.0.0.1:4173',out=path.resolve(__dirname,'../test-results');
const evidence={passed:false,balanceRuns:0,completeMatches:0,ratios:[],cardStates:[],targets:[],commanders:[],errors:[]};
let page;
fs.mkdirSync(out,{recursive:true});
const save=()=>fs.writeFileSync(path.join(out,'sprint10-action-presentation.json'),JSON.stringify(evidence,null,2));
async function reveal(){if(await page.locator('[data-action="reveal"]').count())await page.locator('[data-action="reveal"]').click();}
async function dispatch(a){assert.ok(a,'Fixture action exists');const r=await page.evaluate(a=>FrontlinesApp.dispatch(a),a);assert.equal(r.ok,true,JSON.stringify(r));}
async function ratios(selector,label){
  const cards=await page.locator(selector).evaluateAll(nodes=>nodes.map(n=>{
    const r=n.getBoundingClientRect(),s=getComputedStyle(n),portrait=n.querySelector('.card-portrait:not(.art-symbol),.arsenal-portrait:not(.art-symbol)');let painted=null;
    if(portrait){
      const p=portrait.getBoundingClientRect(),ps=getComputedStyle(portrait),id=n.dataset.id||n.dataset.uid;
      const card=FrontlinesData.CARDS[id]||window.FrontlinesApp?.getState()?.players.flatMap(p=>p.hand).map(h=>h.uid===id?FrontlinesData.CARDS[h.cardId]:null).find(Boolean);
      const expected=card?FrontlinesArt.get(card):null;
      painted={width:p.width,height:p.height,image:ps.backgroundImage,position:ps.backgroundPosition,expected};
    }
    return {width:r.width,height:r.height,ratio:r.width/r.height,cssRatio:s.aspectRatio,name:n.querySelector('.card-name,.arsenal-card-name')?.textContent,painted};
  }));
  assert.ok(cards.length,label+' contains cards');
  for(const c of cards)assert.ok(Math.abs(c.ratio-5/7)<.012,label+' canonical ratio '+JSON.stringify(c));
  for(const c of cards.filter(c=>c.painted)){
    assert.ok(Math.abs(c.painted.width-c.painted.height)<1,'Atlas paint keeps its square proportion '+label+' '+JSON.stringify(c.painted));
    assert.ok(c.painted.expected,'Painted card uses a known art mapping '+label);
    assert.ok(c.painted.image.includes(c.painted.expected.src),'Card keeps its approved art asset '+label+' '+JSON.stringify(c.painted));
    assert.equal(c.painted.position,c.painted.expected.position,'Card keeps its approved atlas quadrant '+label);
  }
  if(label==='enemy Inspect Deck')for(const c of cards)assert.ok(c.width<=201,'Enemy deck uses card-sized tracks rather than a full-width column');
  evidence.ratios.push({label,cards});save();
}
async function start(config={}){
  await page.goto(origin);await page.waitForFunction(()=>!!window.FrontlinesApp);
  await page.evaluate(config=>FrontlinesApp.startMatch({factions:['stonewall','bruiser'],mode:'hotseat',developer:false,bothHands:false,seed:90901,
    config:{startingCommand:80,commandCap:100,startingHand:26,actionLimit:20,captureThreshold:1000,...config}}),config);
  await reveal();
}
async function commanderState(expected){
  const c=await page.locator('[data-commander-player="0"]').evaluate(n=>({state:n.dataset.commanderState,label:n.querySelector('.commander-state')?.textContent,disabled:n.querySelector('.commander-active').disabled}));
  evidence.commanders.push(c);save();assert.equal(c.state,expected);assert.ok(c.label?.trim(),'Commander readiness label is visible text');
  if(expected==='ready')assert.equal(c.disabled,false);else assert.equal(c.disabled,true);
}
async function commanderLabelFits(){
  const boxes=await page.locator('.commander-active').evaluateAll(nodes=>nodes.map(n=>{
    const b=n.getBoundingClientRect();const texts=[...n.querySelectorAll('.commander-state,b,small')].flatMap(t=>{const r=document.createRange();r.selectNodeContents(t);return [...r.getClientRects()].filter(r=>r.width&&r.height).map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom}));});
    return {button:{left:b.left,right:b.right,top:b.top,bottom:b.bottom},texts};}));
  for(const b of boxes)for(const t of b.texts)assert.ok(t.left>=b.button.left-2&&t.right<=b.button.right+2&&t.top>=b.button.top-2&&t.bottom<=b.button.bottom+2,'Commander name, cost and readiness fit '+JSON.stringify(b));
}
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try{
    page=await browser.newPage({viewport:{width:1366,height:768}});page.on('pageerror',e=>evidence.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)evidence.errors.push(r.status()+' '+r.url());});
    await start();await commanderState('no-target');
    const hand=await page.locator('.hand-card[data-action="hand"]').evaluateAll(nodes=>nodes.map(n=>({uid:n.dataset.uid,state:n.dataset.cardState,disabled:n.getAttribute('aria-disabled'),reason:n.dataset.unavailableReason,title:n.title,opacity:Number(getComputedStyle(n).opacity)})));
    assert.ok(hand.some(c=>c.state==='playable'));assert.ok(hand.some(c=>c.state==='unplayable'));
    for(const c of hand){assert.ok(['playable','unplayable'].includes(c.state));if(c.state==='playable')assert.equal(c.opacity,1);else{assert.equal(c.disabled,'true');assert.ok(c.reason&&c.title,'Unavailable card explains the exact reason');assert.ok(c.opacity>=.65&&c.opacity<1,'Unavailable card stays readable');}}
    evidence.cardStates.push({label:'opening hand',cards:hand});save();
    for(const [width,height]of[[1920,1080],[1600,900],[1366,768],[1280,720],[1024,576]]){await page.setViewportSize({width,height});await ratios('.hand-cards .hand-card','hand '+width+'×'+height);await commanderLabelFits();}
    await page.setViewportSize({width:1366,height:768});
    for(let turn=0;turn<4;turn++){
      for(let i=0;i<2;i++){
        const a=await page.evaluate(turn=>{const s=FrontlinesApp.getState(),p=s.attacker,legal=FrontlinesEngine.legalActions(s);
          return turn<2?legal.find(a=>a.type==='deploy'&&a.territory===(p===0?2:4)&&s.players[p].hand.find(h=>h.uid===a.handUid)?.cardId===(p===0?'stonewall_defender':'bruiser_assault')):legal.find(a=>a.type==='move'&&a.territory===3);},turn);
        await dispatch(a);
      }
      await dispatch({type:'endTurn'});await reveal();
    }
    await page.waitForTimeout(1200);
    const attack=await page.evaluate(()=>FrontlinesEngine.legalActions(FrontlinesApp.getState()).find(a=>a.type==='attack'));assert.ok(attack,'Fixture presents a combat choice');
    await page.locator('[data-action="unit"][data-uid="'+attack.unitUid+'"]').click();
    const targets=await page.locator('.unit,.territory').evaluateAll(nodes=>nodes.map(n=>({kind:n.classList.contains('unit')?'unit':'territory',uid:n.dataset.uid,state:n.dataset.targetState,disabled:n.getAttribute('aria-disabled'),cursor:getComputedStyle(n).cursor,border:getComputedStyle(n).borderStyle})));
    assert.ok(targets.some(t=>t.state==='legal'));assert.ok(targets.some(t=>t.state==='invalid'));
    for(const t of targets.filter(t=>t.state==='legal')){assert.equal(t.cursor,'crosshair');assert.ok(['dashed','double'].includes(t.border),'Targets use a non-color shape cue');}
    const before=await page.evaluate(()=>JSON.stringify(FrontlinesApp.getState()));
    await page.locator('.unit[data-target-state="invalid"]').first().evaluate(n=>n.click());
    assert.equal(await page.evaluate(()=>JSON.stringify(FrontlinesApp.getState())),before,'Invalid target cannot execute an action');
    evidence.targets.push(targets);save();
    // Resolve one legal exchange to give the Warden an actual wounded ally.
    await page.locator('[data-action="unit"][data-uid="'+attack.targetUid+'"]').click();
    for(let phase=0;phase<3&&await page.evaluate(()=>!!FrontlinesApp.getState().response);phase++){await reveal();await page.locator('[data-action="pass-response"]').click();}
    await reveal();assert.equal(await page.evaluate(()=>FrontlinesApp.getState().response),null);await commanderState('ready');
    await page.locator('[data-action="commander"][data-player="0"]').click();
    assert.ok(await page.locator('.unit[data-target-state="legal"]').count(),'Commander targeting uses the same legality cues');
    await page.locator('.unit[data-target-state="legal"]').first().click();await commanderState('spent');
    await page.locator('.hand-cards .hand-card').first().hover();await page.locator('[data-action="enlarge-card"]').click();
    await ratios('.full-card-preview .hand-card','detailed inspect');await page.screenshot({path:path.join(out,'sprint10-card-inspect.png')});await page.locator('[data-action="close-modal"]').first().click();
    await start({startingCommand:1});await commanderState('unaffordable');
    const unaff=await page.locator('.hand-card[data-card-state="unplayable"]').evaluateAll(nodes=>nodes.map(n=>({reason:n.dataset.unavailableReason,title:n.title})));assert.ok(unaff.some(c=>/Presence|Capacity/i.test(c.reason)));evidence.cardStates.push({label:'low Presence',cards:unaff});
    // Deck inspection goes through the actual setup Inspect Deck button.
    await page.setViewportSize({width:1280,height:720});
    await page.goto(origin);await page.waitForFunction(()=>!!window.FrontlinesApp);await page.evaluate(()=>FrontlinesApp.showScreen('play'));
    await page.locator('[data-action="deck"][data-player="1"]').click();
    await ratios('.deck-grid .hand-card','enemy Inspect Deck');await page.screenshot({path:path.join(out,'sprint10-enemy-inspect-deck.png')});
    await page.goto(origin+'/deck-builder.html');await page.waitForFunction(()=>!!window.FrontlinesDeckBuilder);
    for(const [width,height]of[[1920,1080],[1366,768],[1280,720]]){await page.setViewportSize({width,height});await ratios('.arsenal-card-inspect','Arsenal card faces '+width+'×'+height);}
    await page.screenshot({path:path.join(out,'sprint10-arsenal-ratio.png')});
    assert.deepEqual(evidence.errors,[]);evidence.passed=true;save();console.log(JSON.stringify({passed:true,ratioContexts:evidence.ratios.length,commanderStates:evidence.commanders.map(c=>c.state),balanceRuns:0,completeMatches:0,errors:[]},null,2));
  }catch(e){evidence.failure=String(e.stack||e);save();if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'sprint10-action-presentation-failure.png')}).catch(()=>{});throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
