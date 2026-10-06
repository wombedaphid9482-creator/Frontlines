'use strict';
// Guided public-state fixtures only; no campaigns, complete matches or rewards.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.argv[2]||'playwright');
const origin=process.env.FRONTLINES_TEST_URL||'http://127.0.0.1:4173',out=path.resolve(__dirname,'../test-results');
const evidence={passed:false,largeCampaigns:0,completeMatches:0,training:[],errors:[],ui:{}};fs.mkdirSync(out,{recursive:true});
const save=()=>fs.writeFileSync(path.join(out,'sprint12-tactical-browser.json'),JSON.stringify(evidence,null,2)+'\n');
let page;
async function dispatch(action){assert.ok(action,'Legal fixture action exists');const r=await page.evaluate(a=>FrontlinesApp.dispatch(a),action);assert.equal(r.ok,true,r.error);}
async function legal(predicate,args){return page.evaluate(({predicate,args})=>{const s=FrontlinesApp.getState(),E=FrontlinesEngine;return E.legalActions(s).find(a=>Function('a','s','E','args','return '+predicate)(a,s,E,args));},{predicate,args});}
async function deploy(card,territory){const a=await legal("a.type==='deploy'&&a.territory===args.territory&&s.players[E.getActor(s)].hand.find(h=>h.uid===a.handUid)?.cardId===args.card",{card,territory});await dispatch(a);return a.handUid;}
async function hand(card){return page.evaluate(id=>{const s=FrontlinesApp.getState();return s.players[FrontlinesEngine.getActor(s)].hand.find(h=>h.cardId===id)?.uid;},card);}
async function start(decks){await page.goto(origin);await page.waitForFunction(()=>!!window.FrontlinesApp);const s=await page.evaluate(decks=>{
  const L=FrontlinesDecks.forData(FrontlinesData);return FrontlinesApp.startMatch({decks:decks.map(id=>L.getDecks().find(d=>d.id===id)),mode:'hotseat',developer:true,bothHands:true,seed:110041,config:{startingCommand:80,commandCap:80,startingHand:26,drawCount:0,actionLimit:20,captureThreshold:1000}});
},decks);assert.ok(s,'Practice fixture loads');}
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{
  page=await browser.newPage({viewport:{width:1366,height:768}});page.on('pageerror',e=>evidence.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)evidence.errors.push(r.status()+' '+r.url());});
  await page.goto(origin+'/tactical-training.html');await page.waitForFunction(()=>!!window.FrontlinesTacticalTrainingPage);
  const collectionBefore=await page.evaluate(()=>localStorage.getItem('frontlines.collection.v1'));
  assert.equal(await page.locator('.training-nav button').count(),6);
  for(let index=0;index<6;index++){
    await page.locator('[data-training="lesson"][data-index="'+index+'"]').click();
    for(let n=0;n<6;n++){
      const current=await page.evaluate(()=>FrontlinesTacticalTrainingPage.snapshot());if(current.complete)break;
      await page.locator('[data-training="execute"]').click();
      if(await page.locator('.training-confirm').count()){
        const before=await page.evaluate(()=>JSON.stringify(FrontlinesTacticalTrainingPage.snapshot().state));
        await page.locator('[data-training="cancel"]').click();assert.equal(await page.evaluate(()=>JSON.stringify(FrontlinesTacticalTrainingPage.snapshot().state)),before);
        await page.locator('[data-training="execute"]').click();await page.locator('[data-training="confirm"]').click();
      }
    }
    const result=await page.evaluate(()=>FrontlinesTacticalTrainingPage.snapshot());assert.equal(result.complete,true,'Optional lesson '+index+' completes');
    assert.ok(await page.locator('.training-result').count());assert.equal(await page.locator('.training-error').count(),0);
    evidence.training.push({index,lesson:result.lesson.id,actions:result.history.length,turn:result.state.turn});save();
    if(index===3)await page.screenshot({path:path.join(out,'sprint12-training-overwatch.png'),fullPage:true});
  }
  assert.equal(await page.evaluate(()=>localStorage.getItem('frontlines.collection.v1')),collectionBefore,'Training grants no collection rewards');evidence.trainingDoesNotGrantRewards=true;
  await page.reload();await page.waitForFunction(()=>!!window.FrontlinesTacticalTrainingPage);assert.equal(await page.locator('.training-nav').innerText().then(v=>(v.match(/✓/g)||[]).length),6);evidence.trainingCompletionPersists=true;
  await start(['stonewall-prepared-ground','bruiser-breach-column']);
  const engineer=await deploy('stonewall_trench_engineer',2),rifle=await deploy('stonewall_rifles',2);await dispatch({type:'endTurn'});
  assert.equal(await page.locator('.unit[data-uid="'+engineer+'"] [data-status="cover"]').count(),1,'On-deploy Cover is visible');
  const frag=await hand('bruiser_frag_out');await page.locator('[data-action="hand"][data-uid="'+frag+'"]').click();
  assert.equal(await page.locator('[data-action="play-order"]').count(),0,'Territory Order requires choosing its target');
  const preview=await page.locator('.blast-affected').evaluateAll(nodes=>nodes.map(n=>({uid:n.dataset.uid,damage:Number(n.dataset.blastDamage),label:n.querySelector('.blast-preview-number')?.textContent})));
  assert.deepEqual(new Set(preview.map(v=>v.uid)),new Set([engineer,rifle]));for(const hit of preview){assert.equal(hit.damage,2);assert.ok(hit.label.includes('DMG'));}evidence.ui.blastPreview=preview;
  const beforeInvalid=await page.evaluate(()=>JSON.stringify(FrontlinesApp.getState()));await page.locator('.territory[data-territory="6"]').dispatchEvent('click');assert.equal(await page.evaluate(()=>JSON.stringify(FrontlinesApp.getState())),beforeInvalid);
  await page.screenshot({path:path.join(out,'sprint12-blast-targeting.png')});await page.locator('.territory[data-territory="2"]').click();
  const blastState=await page.evaluate(()=>FrontlinesApp.getState());assert.equal(blastState.units.find(u=>u.uid===engineer).damage,2);assert.equal(blastState.units.find(u=>u.uid===rifle).damage,2);assert.equal(await page.locator('.unit[data-uid="'+engineer+'"] [data-status="cover"]').count(),1,'Blast bypasses without consuming Cover');
  await start(['stonewall-prepared-ground','syndicate-fire-control']);
  const watcher=await deploy('stonewall_bastion_gunner',2);await dispatch({type:'move',unitUid:watcher,territory:3});await dispatch({type:'endTurn'});
  const suppressor=await deploy('syndicate_suppression_team',4),entrant=await deploy('syndicate_security',4);await dispatch({type:'move',unitUid:suppressor,territory:3});await dispatch({type:'endTurn'});
  const cover=await hand('stonewall_dig_in');await dispatch({type:'order',handUid:cover,targetUid:watcher});
  await page.locator('.unit[data-uid="'+watcher+'"]').click();assert.equal(await page.locator('[data-action="unit-overwatch"]').isEnabled(),true);
  evidence.ui.tacticalControlLayouts=[];
  for(const [width,height]of [[1920,1080],[1600,900],[1366,768],[1280,720],[1093,614],[1067,600]]){
    await page.setViewportSize({width,height});
    const fit=await page.evaluate(()=>({width:innerWidth,height:innerHeight,pageWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,territories:document.querySelectorAll('.territory').length,commands:[...document.querySelectorAll('.order-buttons .btn')].map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,height:r.height};}).filter(r=>r.height&&r.right>r.x),cards:[...document.querySelectorAll('.hand-cards .hand-card')].map(n=>{const r=n.getBoundingClientRect();return r.width/r.height;})}));
    assert.ok(fit.pageWidth<=width+1&&fit.pageHeight<=height+1,'Tactical control does not create page scrolling');assert.equal(fit.territories,7);assert.ok(fit.commands.length>=3,'Cancel, tactical control and End Turn are visible');
    for(const r of fit.commands){assert.ok(r.x>=0&&r.y>=0&&r.right<=width+1&&r.bottom<=height+1,'Tactical controls are visible');assert.ok(r.height>=44,JSON.stringify({width,height,control:r}));}
    for(const ratio of fit.cards)assert.ok(Math.abs(ratio-5/7)<.012,'Expansion hand keeps canonical card ratio');evidence.ui.tacticalControlLayouts.push({width,height,commands:fit.commands.length,cards:fit.cards.length});
  }
  await page.setViewportSize({width:1366,height:768});await page.locator('[data-action="unit-overwatch"]').click();assert.equal(await page.locator('.unit[data-uid="'+watcher+'"] [data-status="overwatch"]').count(),1);
  await dispatch({type:'endTurn'});await page.locator('.unit[data-uid="'+suppressor+'"]').click();await page.locator('[data-action="unit-ability"]').click();await page.locator('.unit[data-uid="'+watcher+'"]').click();
  assert.equal(await page.locator('.unit[data-uid="'+watcher+'"] [data-status="suppression"]').count(),1);assert.equal(await page.locator('.unit[data-uid="'+watcher+'"] .tactical-status').count(),3);
  assert.equal(await page.locator('.unit[data-uid="'+watcher+'"] .unit-status').count(),0,'New statuses never display a misleading legacy JAMMED label');await page.screenshot({path:path.join(out,'sprint12-status-stack.png')});await dispatch({type:'move',unitUid:entrant,territory:3});
  assert.equal(await page.evaluate(uid=>FrontlinesApp.getState().units.find(u=>u.uid===uid).damage,entrant),2);assert.equal(await page.locator('.unit[data-uid="'+watcher+'"] [data-status="overwatch"]').count(),0);evidence.ui.unitAbilitiesAndOverwatch=true;
  // Reconstruct the legal sacrifice lesson inventory, then deploy through actual actions.
  await page.goto(origin+'/tactical-training.html');await page.waitForFunction(()=>!!window.FrontlinesTacticalTrainingPage);const sacrificeDecks=await page.evaluate(()=>{const f=FrontlinesTacticalTraining.createFixture(4);return f.state.players.map((p,i)=>({faction:p.faction,name:'Sacrifice UI practice',cards:[...p.deck,...p.hand.map(h=>h.cardId),...f.state.units.filter(u=>u.owner===i).map(u=>u.cardId)],commanderId:p.commander.id}));});
  await page.goto(origin);await page.waitForFunction(()=>!!window.FrontlinesApp);await page.evaluate(decks=>FrontlinesApp.startMatch({decks,mode:'hotseat',developer:true,bothHands:true,seed:110043,config:{startingCommand:80,commandCap:80,startingHand:26,drawCount:0,actionLimit:20,captureThreshold:1000}}),sacrificeDecks);
  const source=await deploy('rogue_jury_rigged_shield',2),survivor=await deploy('rogue_bulwark',2);await deploy('rogue_broker',2);await dispatch({type:'endTurn'});
  const bombard=await hand('bruiser_bombard');await dispatch({type:'order',handUid:bombard,targetUid:survivor});await dispatch({type:'endTurn'});
  const parts=await hand('rogue_strip_it_for_parts');await page.locator('[data-action="hand"][data-uid="'+parts+'"]').click();
  const untouched=await page.evaluate(()=>JSON.stringify(FrontlinesApp.getState()));await page.locator('.unit[data-uid="'+source+'"]').click();assert.equal(await page.evaluate(()=>JSON.stringify(FrontlinesApp.getState())),untouched,'Choosing own cost destroys nothing');
  await page.locator('.unit[data-uid="'+survivor+'"]').click();assert.ok((await page.locator('.modal-title').innerText()).includes('YOU ARE DESTROYING YOUR OWN UNIT'));
  await page.locator('[data-action="close-modal"]').first().click();assert.equal(await page.evaluate(()=>JSON.stringify(FrontlinesApp.getState())),untouched,'Cancel is reversible');
  await page.locator('.unit[data-uid="'+survivor+'"]').click();await page.screenshot({path:path.join(out,'sprint12-sacrifice-confirm.png')});await page.locator('[data-action="confirm-sacrifice"]').click();
  const final=await page.evaluate(()=>FrontlinesApp.getState());assert.ok(!final.units.some(u=>u.uid===source));assert.equal(final.units.find(u=>u.uid===survivor).damage,2);evidence.ui.sacrificeRequiresSourcePayoffAndConfirmation=true;
  assert.deepEqual(evidence.errors,[]);evidence.passed=true;save();console.log(JSON.stringify(evidence,null,2));
}finally{await browser.close();}})().catch(error=>{evidence.failure=String(error.stack||error);save();console.error(error);process.exitCode=1;});
