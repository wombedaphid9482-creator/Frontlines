'use strict';
// Art geometry and asset availability only. No competitive matches or campaign.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.argv[2]||'playwright');
const origin=process.env.FRONTLINES_TEST_URL||'http://127.0.0.1:4173',out=path.resolve(__dirname,'../test-results');
const phase=process.env.FRONTLINES_ART_PHASE||'framing';
const evidence={phase,passed:false,campaigns:0,completeMatches:0,geometry:[],errors:[],screenshots:[]};
fs.mkdirSync(out,{recursive:true});
let page;
const save=()=>fs.writeFileSync(path.join(out,'sprint12-art-surfaces-'+phase+'.json'),JSON.stringify(evidence,null,2)+'\n');
async function capture(label){const name='sprint12-'+label+'-'+phase+'.png';await page.screenshot({path:path.join(out,name)});evidence.screenshots.push(name);}
async function geometry(selector,label,fullFace=true){
  const rows=await page.locator(selector).evaluateAll(nodes=>nodes.map(n=>{
    const box=x=>{const r=x.getBoundingClientRect();return {width:r.width,height:r.height,x:r.x,y:r.y};};
    const art=n.querySelector('.card-portrait,.arsenal-portrait'),windowNode=n.querySelector('.card-art,.collection-art,.arsenal-art,.unit-art,.training-unit-art'),s=art?getComputedStyle(art):null;
    return {id:n.dataset.id||n.dataset.uid,name:n.querySelector('.card-name,.arsenal-card-name,.collection-card-text h3,.unit-name,.training-unit-name')?.textContent,face:box(n),window:windowNode?box(windowNode):null,paint:art?box(art):null,kind:art?.classList.contains('art-symbol')?'symbol':art?.classList.contains('art-refined')?'refined':art?.classList.contains('art-tactical')?'tactical':'atlas',image:s?.backgroundImage,size:s?.backgroundSize,position:s?.backgroundPosition,transform:s?.transform};
  }));
  assert.ok(rows.length,label+' contains entries');
  for(const r of rows){
    if(fullFace)assert.ok(Math.abs(r.face.width/r.face.height-5/7)<.012,label+' 5:7 '+JSON.stringify(r));
    if(r.paint&&r.kind==='atlas'&&r.window){assert.ok(Math.abs(r.paint.width-r.paint.height)<1,label+' atlas stays square '+JSON.stringify(r));}
    if(r.paint&&r.kind==='refined'&&r.window){assert.equal(r.size,'cover',label+' refined uniform crop');assert.ok(Math.abs(r.paint.width-r.window.width)<=3&&Math.abs(r.paint.height-r.window.height)<=3,label+' refined fills window '+JSON.stringify(r));}
  }
  evidence.geometry.push({label,viewport:await page.evaluate(()=>({width:innerWidth,height:innerHeight})),rows});save();return rows;
}
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{
  page=await browser.newPage({viewport:{width:1366,height:768}});page.on('pageerror',e=>evidence.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)evidence.errors.push(r.status()+' '+r.url());});
  await page.goto(origin+'/collection.html');await page.waitForFunction(()=>!!window.FrontlinesCollectionApp);
  evidence.catalog=await page.evaluate(()=>Object.values(FrontlinesData.CARDS).map(c=>({id:c.id,name:c.name,faction:c.faction,type:c.type,html:FrontlinesArt.html(c),mapped:FrontlinesArt.get(c)})));
  assert.equal(evidence.catalog.length,155);const collection=await geometry('.collection-card-inspect','Collection all 155');assert.equal(collection.length,155);
  for(const c of collection.filter(c=>c.kind==='atlas'))assert.ok(Math.abs(c.paint.y-c.window.y)<=1,'Collection restores top of portrait '+c.id);
  evidence.assetDecode=await page.evaluate(async()=>{
    const urls=[...new Set(Object.values(FrontlinesData.CARDS).filter(c=>!FrontlinesArt.html(c).includes('art-symbol')).map(c=>FrontlinesArt.get(c).src))];
    urls.push(...Object.keys(FrontlinesArt.COMMANDER_ART).map(id=>FrontlinesArt.commanderGet(id).src));
    return Promise.all(urls.map(src=>new Promise(resolve=>{const i=new Image();i.onload=()=>resolve({src,ok:true,width:i.naturalWidth,height:i.naturalHeight});i.onerror=()=>resolve({src,ok:false});i.src=src;})));
  });assert.ok(evidence.assetDecode.every(a=>a.ok),'Every used source decodes');
  await capture('collection');
  await page.locator('#collection-set-filter').selectOption('tactical-011');await capture('collection-tactical');
  await page.goto(origin+'/deck-builder.html');await page.waitForFunction(()=>!!window.FrontlinesDeckBuilder);
  const arsenalIds=new Set();
  for(const faction of ['stonewall','bruiser','syndicate','nightwalker','rogue']){await page.locator('#builder-faction').selectOption(faction);const rows=await geometry('.arsenal-card-inspect','Arsenal '+faction);for(const r of rows)arsenalIds.add(r.id);}
  assert.equal(arsenalIds.size,155,'All designs render in Arsenal');evidence.arsenalDesigns=arsenalIds.size;await capture('arsenal');
  await page.goto(origin);await page.waitForFunction(()=>!!window.FrontlinesApp);
  const decks=await page.evaluate(()=>{
    const L=FrontlinesDecks.forData(FrontlinesData),list=[];
    for(const faction of Object.keys(FrontlinesData.FACTIONS)){
      const ids=Object.values(FrontlinesData.CARDS).filter(c=>c.faction===faction).map(c=>c.id);
      for(let part=0;part<2;part++){const chosen=part===0?ids.slice(0,26):[...ids.slice(26),...ids.slice(0,21)];const deck={id:'art-'+faction+'-'+part,name:'Art geometry fixture',faction,cards:chosen,commanderId:FrontlinesCommanders.defaultFor(faction)};if(!L.validate(deck).legal)throw new Error(JSON.stringify(L.validate(deck)));list.push(deck);}
    }
    return list;
  });
  const handIds=new Set(),fullIds=new Set();
  for(const deck of decks){
    await page.evaluate(deck=>{const state=FrontlinesApp.startMatch({decks:[deck,deck],mode:'hotseat',developer:true,bothHands:true,seed:120500,config:{startingCommand:500,commandCap:500,startingHand:26,drawCount:0,actionLimit:20,captureThreshold:1000}});if(!state)throw new Error('Art fixture rejected');},deck);
    const handRows=await geometry('.game>.hand-area .hand-cards .hand-card','hand '+deck.id);const items=await page.evaluate(()=>FrontlinesApp.getState().players[0].hand.map(h=>({uid:h.uid,id:h.cardId})));
    for(const h of items){handIds.add(h.id);if(fullIds.has(h.id))continue;
      await page.locator('.game>.hand-area .hand-card[data-uid="'+h.uid+'"]').dispatchEvent('pointerover');
      await page.locator('.inspector [data-action="enlarge-card"]').evaluate(n=>n.click());await geometry('.full-card-preview .hand-card','full inspection '+h.id);fullIds.add(h.id);
      if(h.id==='stonewall_trench_engineer'||h.id==='rogue_jury_rigged_shield')await capture('full-'+h.id);
      await page.locator('[data-action="close-modal"]').first().evaluate(n=>n.click());
    }
    if(deck.id.endsWith('-0')){
      let deployed=0;for(let n=0;n<3;n++){
        const r=await page.evaluate(()=>{const s=FrontlinesApp.getState(),E=FrontlinesEngine;const a=E.legalActions(s).find(a=>a.type==='deploy'&&a.territory===2);return a?FrontlinesApp.dispatch(a):null;});if(r?.ok)deployed++;
      }
      if(deployed){await page.waitForTimeout(500);await geometry('.battlefield .unit[data-uid]','battlefield '+deck.faction,false);await capture('battlefield-'+deck.faction);}
    }
  }
  assert.equal(handIds.size,155,'All designs covered in actual hand');assert.equal(fullIds.size,155,'All designs covered in actual full briefing');evidence.handDesigns=handIds.size;evidence.fullInspectionDesigns=fullIds.size;
  // Actual opponent Inspect Deck setup route, independent of the hand renderer.
  await page.goto(origin);await page.waitForFunction(()=>!!window.FrontlinesApp);await page.evaluate(()=>FrontlinesApp.showScreen('play'));await page.locator('[data-action="deck"][data-player="1"]').click();await geometry('.deck-grid .hand-card','enemy Inspect Deck');await capture('enemy-deck');
  await page.goto(origin+'/tactical-training.html');await page.waitForFunction(()=>!!window.FrontlinesTacticalTrainingPage);
  for(let i=0;i<6;i++){await page.locator('[data-training="lesson"][data-index="'+i+'"]').click();await geometry('.training-unit','optional training '+i,false);}await capture('training');
  await page.goto(origin);await page.waitForFunction(()=>!!window.FrontlinesApp);await page.evaluate(()=>FrontlinesApp.startTutorial(false));await geometry('.hand-card','beginner tutorial hand');await capture('tutorial');
  await page.goto(origin+'/simulator.html');await page.waitForSelector('#deck-a',{state:'attached'});evidence.warRoom={artCards:await page.locator('.hand-card,.arsenal-card-inspect,.card-portrait').count(),note:'War Room displays deck selectors, numeric card tables and decision traces; no battlefield-card artwork renderer exists. No simulation was started.'};await capture('war-room');
  assert.deepEqual(evidence.errors,[]);evidence.passed=true;save();console.log(JSON.stringify({passed:true,catalog:155,hand:handIds.size,fullInspection:fullIds.size,arsenal:arsenalIds.size,contexts:evidence.geometry.length,assets:evidence.assetDecode.length,screenshots:evidence.screenshots.length,campaigns:0,completeMatches:0}));
}catch(e){evidence.failure=String(e.stack||e);save();if(page)await capture('failure').catch(()=>{});throw e;}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
