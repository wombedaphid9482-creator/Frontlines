'use strict';
const proofPrefix=process.env.FRONTLINES_EVIDENCE_PREFIX||'sprint12';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require(process.argv[2]||'playwright');
const out=path.resolve(__dirname,'../test-results'),evidence={passed:false,portraits:[],errors:[],matches:0};
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{const page=await browser.newPage({viewport:{width:1366,height:768}});page.on('pageerror',e=>evidence.errors.push(e.message));await page.goto('http://127.0.0.1:4173/deck-builder.html');await page.waitForFunction(()=>!!window.FrontlinesDeckBuilder);
  const decks=await page.evaluate(()=>FrontlinesDeckBuilder.getCommanderStarters().map(d=>({id:d.id,commanderId:d.commanderId})));
  assert.equal(decks.length,10);
  for(const deck of decks){await page.evaluate(id=>FrontlinesDeckBuilder.selectDeck(id),deck.id);await page.waitForFunction(()=>{const i=document.querySelector('.builder-commander-portrait img');return i?.complete&&i.naturalWidth>0;});
    const portrait=await page.locator('.builder-commander-portrait img').evaluate(i=>{const r=i.getBoundingClientRect(),css=getComputedStyle(i);return {src:i.getAttribute('src'),natural:[i.naturalWidth,i.naturalHeight],width:r.width,height:r.height,fit:css.objectFit};});assert.deepEqual(portrait.natural,[768,768]);assert.ok(portrait.width>0&&portrait.height>0);assert.ok(portrait.src.includes(deck.commanderId));assert.equal(portrait.fit,'cover');evidence.portraits.push({commander:deck.commanderId,...portrait});
  }
  await page.screenshot({path:path.join(out,proofPrefix+'-arsenal-commander-loaded.png')});assert.deepEqual(evidence.errors,[]);evidence.passed=true;
}finally{await browser.close();}})().catch(e=>{evidence.failure=String(e.stack||e);process.exitCode=1;}).finally(()=>{fs.writeFileSync(path.join(out,proofPrefix+'-commander-browser.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));});
