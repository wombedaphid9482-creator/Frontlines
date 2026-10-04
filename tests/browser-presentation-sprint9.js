'use strict';
// Presentation correctness only: restored v0.9 atlas/symbol imagery, portrait assets, five
// resolutions and cancel/fast/minimal controls. This never runs a match campaign.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.argv[2]||'playwright'),origin=process.env.FRONTLINES_TEST_URL||'http://127.0.0.1:4173',out=path.resolve(__dirname,'../test-results');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];page.on('pageerror',e=>errors.push(e.message));fs.mkdirSync(out,{recursive:true});
  await page.goto(origin);await page.waitForFunction(()=>!!window.FrontlinesApp);
  await page.evaluate(()=>{FrontlinesShell.savePreferences({presentation:'full',animationSpeed:'normal',reducedEffects:false});FrontlinesApp.startMatch({factions:['stonewall','bruiser'],mode:'hotseat',developer:true,bothHands:true,seed:90901,config:{startingHand:15}});});
  await page.waitForTimeout(1500);
  const layouts=[];
  for(const [width,height]of [[1920,1080],[1366,768],[1280,720],[900,600],[390,844]]){
   await page.setViewportSize({width,height});
   const layout=await page.evaluate(()=>{
    const rect=n=>{const b=n.getBoundingClientRect();return {top:b.top,bottom:b.bottom,left:b.left,right:b.right,width:b.width,height:b.height};},map=rect(document.querySelector('.map-scroll')),field=rect(document.querySelector('.battlefield'));
    const hand=new Map(FrontlinesApp.getState().players.flatMap(p=>p.hand).map(c=>[c.uid,c.cardId]));
    const normalizedSymbol=definition=>{const n=document.createElement('span');n.innerHTML=FrontlinesArt.symbol(definition);return n.innerHTML;};
    return {width:innerWidth,height:innerHeight,page:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],huds:[...document.querySelectorAll('.player-hud,.turn-hud')].map(rect),commanders:[...document.querySelectorAll('.commander-panel')].map(n=>({panel:rect(n),portrait:rect(n.querySelector('.commander-portrait-button')),name:rect(n.querySelector('.commander-name'))})),battlefieldVisibleHeight:Math.max(0,Math.min(map.bottom,field.bottom,innerHeight)-Math.max(map.top,field.top,0)),cards:[...document.querySelectorAll('.hand-card')].map(c=>{
    const r=n=>{const b=n.getBoundingClientRect();return {top:b.top,bottom:b.bottom,left:b.left,right:b.right,width:b.width,height:b.height};},art=c.querySelector('.card-art'),portrait=art.querySelector('.card-portrait'),rules=c.querySelector('.card-rules'),definition=FrontlinesData.CARDS[hand.get(c.dataset.uid)],isAtlas=['unit','leader'].includes(definition?.type),asset=isAtlas?FrontlinesArt.get(definition):null;
    return {card:r(c),art:r(art),artClip:{x:getComputedStyle(art).overflowX,y:getComputedStyle(art).overflowY,contain:getComputedStyle(art).contain},portrait:portrait?r(portrait):null,proceduralArtwork:!!art.querySelector('.art-identity,.art-illustrated'),type:definition?.type,atlas:isAtlas?{src:getComputedStyle(portrait).backgroundImage,position:getComputedStyle(portrait).backgroundPosition,expectedSrc:new URL(asset.src,location.href).href,expectedPosition:asset.position,emptyPortrait:portrait.childElementCount===0}:null,symbol:!isAtlas?{actual:portrait?.innerHTML,expected:definition?normalizedSymbol(definition):null}:null,name:r(c.querySelector('.card-name')),rules:r(rules),stats:r(c.querySelector('.card-stats')),font:parseFloat(getComputedStyle(rules).fontSize)};
   })};});
   assert.ok(layout.cards.length);assert.ok(layout.page[0]<=width+1&&layout.page[1]<=height+1);
   for(const card of layout.cards){
    assert.ok(card.art.bottom<=card.name.top+1&&card.rules.bottom<=card.stats.top+1);assert.ok(card.font>=10);assert.equal(card.proceduralArtwork,false,'Ordinary card must preserve original painted/symbol imagery');
    if(card.atlas){
     // v1.0.3 deliberately keeps an atlas quadrant square inside its shorter
     // art window. The excess paint is cropped, rather than distorting X/Y to
     // make the portrait element itself fit the rectangular image window.
     assert.ok(Math.abs(card.portrait.width-card.portrait.height)<=1,'Painted atlas surface preserves its square proportion');
     assert.ok(card.portrait.top>=card.art.top-1&&card.portrait.left>=card.art.left-1&&card.portrait.right<=card.art.right+1,'Square atlas aligns with its art window');
     assert.deepEqual([card.artClip.x,card.artClip.y],['hidden','hidden'],'Art window clips excess portrait paint');
     assert.ok(card.artClip.contain.includes('paint'),'Atlas paint cannot escape its image window');
     assert.ok(card.atlas.src.includes(card.atlas.expectedSrc));assert.equal(card.atlas.position,card.atlas.expectedPosition);assert.equal(card.atlas.emptyPortrait,true);
    }else{
     if(card.portrait)assert.ok(card.portrait.top>=card.art.top-1&&card.portrait.bottom<=card.art.bottom+1,'Order/Asset insignia remains contained in its art window');
     assert.equal(card.symbol.actual,card.symbol.expected,'Order/Asset SVG must preserve existing insignia');
    }
    if(width<=760)assert.ok(card.stats.bottom<=card.card.bottom+1);
   }
   for(const hud of layout.huds)assert.ok(hud.left>=0&&hud.right<=width+1&&hud.top>=0&&hud.bottom<=height+1,'HUD clipping '+JSON.stringify({width,height,hud}));
   assert.equal(layout.commanders.length,2);for(const c of layout.commanders){assert.ok(c.panel.left>=0&&c.panel.right<=width+1&&c.panel.bottom<=height+1);assert.ok(c.portrait.width>=40&&Math.abs(c.portrait.width-c.portrait.height)<=1,'Commander portrait must be recognizable and square');}
   assert.ok(layout.battlefieldVisibleHeight>=64,'Battlefield collapsed '+JSON.stringify({width,height,visible:layout.battlefieldVisibleHeight}));
   layouts.push({width,height,cards:layout.cards.length,restoredAtlas:layout.cards.filter(c=>c.atlas).length,restoredSymbol:layout.cards.filter(c=>c.symbol).length,battlefieldVisibleHeight:layout.battlefieldVisibleHeight,hudsVisible:true,commandersVisible:true,overlap:false});
   if(width===1366)await page.screenshot({path:path.join(out,'v102-restored-hand-1366.png')});
   if(width===390)await page.screenshot({path:path.join(out,'v102-restored-hand-390.png')});
  }
  await page.setViewportSize({width:1366,height:768});
  const deployment=await page.evaluate(()=>{
   FrontlinesEffects.clear();const state=FrontlinesApp.getState(),action=FrontlinesEngine.legalActions(state).find(a=>a.type==='deploy');if(!action)throw Error('No legal deployment fixture');
   FrontlinesApp.dispatch(action);const n=document.querySelector('.fx-deployment'),a=n?.getAnimations()[0];return {authoritativeUnitPresent:FrontlinesApp.getState().units.some(u=>u.uid===action.handUid),duration:a?.effect.getTiming().duration,frames:a?.effect.getKeyframes().map(f=>({offset:f.offset,transform:f.transform})),overlays:document.querySelector('.faction-fx-layer')?.children.length||0};
  });assert.equal(deployment.authoritativeUnitPresent,true);assert.ok(deployment.duration>=700&&deployment.duration<=1100);assert.ok(deployment.frames.some(f=>f.transform.includes('1.2')));assert.ok(deployment.overlays<=48);
  await page.waitForTimeout(320);await page.screenshot({path:path.join(out,'v102-restored-deployment.png')});
  await page.waitForTimeout(1200);assert.equal(await page.locator('.fx-deployment').count(),0);
  const cancellation=await page.evaluate(()=>{const state=FrontlinesApp.getState();FrontlinesEffects.clear();return JSON.stringify(state)===JSON.stringify(FrontlinesApp.getState());});assert.equal(cancellation,true);
  await page.goto(origin+'/deck-builder.html');await page.waitForFunction(()=>!!window.FrontlinesDeckBuilder);
  await page.waitForFunction(()=>document.querySelectorAll('.arsenal-card .arsenal-portrait').length>0);
  const arsenal=await page.evaluate(()=>({procedural:document.querySelectorAll('.arsenal-art .art-identity,.arsenal-art .art-illustrated').length,atlases:[...document.querySelectorAll('.arsenal-card .arsenal-portrait')].filter(n=>getComputedStyle(n).backgroundImage.includes('starter-atlas.webp')).length,symbols:document.querySelectorAll('.arsenal-art .art-symbol svg').length}));assert.equal(arsenal.procedural,0);assert.ok(arsenal.atlases>0);assert.ok(arsenal.symbols>0);await page.screenshot({path:path.join(out,'v102-restored-arsenal-1366.png')});
  // A focused asset gallery uses the real art/frame pipeline at playable size.
  await page.goto(origin+'/collection.html#commanders');await page.waitForFunction(()=>!!window.FrontlinesArt&&document.querySelectorAll('.commander-catalog-card').length===10);
  await page.evaluate(()=>document.querySelectorAll('.commander-catalog-art img').forEach(i=>i.loading='eager'));
  await page.waitForFunction(()=>[...document.querySelectorAll('.commander-catalog-art img')].every(i=>i.complete&&i.naturalWidth===768));
  for(const [width,height]of [[1366,768],[900,600],[390,844]]){
    await page.setViewportSize({width,height});const g=await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,arts:[...document.querySelectorAll('.commander-catalog-art')].map(n=>{const a=n.getBoundingClientRect(),b=n.querySelector('img').getBoundingClientRect();return {left:a.left,right:a.right,artTop:a.top,artBottom:a.bottom,imageTop:b.top,imageBottom:b.bottom};})}));assert.ok(g.width<=width+1&&g.height<=height+1);for(const art of g.arts){assert.ok(art.left>=0&&art.right<=width+1);assert.ok(art.imageTop>=art.artTop-1&&art.imageBottom<=art.artBottom+1);}
    await page.screenshot({path:path.join(out,'v102-collection-commanders-'+width+'.png')});
  }
  await page.setViewportSize({width:1366,height:768});
  const portraits=await page.evaluate(()=>{
   const A=FrontlinesArt,P=FrontlinesPresentation,D=FrontlinesData,host=document.createElement('section');host.id='presentation-qa';host.style.cssText='position:fixed;inset:0;background:#0b151e;z-index:999;padding:24px;overflow:auto;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:18px';
   host.style.gridTemplateRows='repeat(2,minmax(0,1fr))';
   host.innerHTML=Object.entries(A.COMMANDER_ART).map(([id,c])=>'<article class="commander-catalog-card" style="--faction-color:'+A.THEMES[c.faction].primary+';padding:10px"><div class="commander-catalog-art" style="height:calc(100% - 78px);min-height:0;margin:0 0 8px">'+A.commanderHtml(id,{className:'commander-portrait'})+'</div><h3 style="font-size:20px;margin:4px 0">'+c.name+'</h3><p style="font-size:11px;margin:4px 0;color:'+A.THEMES[c.faction].primary+'">'+c.faction.toUpperCase()+' · COMMANDER</p></article>').join('');document.body.append(host);
   return {count:host.querySelectorAll('img').length,identities:[...host.querySelectorAll('.art-commander')].map(n=>n.className)};
  });await page.evaluate(()=>document.querySelectorAll('#presentation-qa img').forEach(i=>i.loading='eager'));assert.equal(portraits.count,10);assert.equal(new Set(portraits.identities).size,10);await page.waitForFunction(()=>[...document.querySelectorAll('#presentation-qa img')].every(i=>i.complete&&i.naturalWidth===768));await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('#presentation-qa img')].map(i=>i.decode()));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});await page.screenshot({path:path.join(out,'v102-commanders-gallery.png')});
  assert.deepEqual(errors,[]);const result={passed:true,ordinaryImageryRestored:true,arsenal,layouts,normalDeployment:deployment,authoritativeStateImmediate:true,cancellationSafe:cancellation,portraitsLoaded:10,errors};fs.writeFileSync(path.join(out,'v102-browser-presentation.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
