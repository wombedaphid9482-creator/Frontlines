'use strict';
// Read-only visual evidence. Changes test-page DOM only; no game rules or campaign.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require(process.argv[2]||'playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results'),origin=process.env.FRONTLINES_TEST_URL||'http://127.0.0.1:4173';
fs.mkdirSync(out,{recursive:true});
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try{
    const page=await browser.newPage({viewport:{width:1366,height:768}});
    await page.goto(origin+'/collection.html');await page.waitForFunction(()=>!!window.FrontlinesCollectionApp);
    const records=await page.evaluate(()=>Object.keys(FrontlinesArt.TACTICAL_ART).map(id=>{const c=FrontlinesData.CARDS[id];return {id,name:c.name,faction:c.faction,type:c.type,rarity:c.rarity,rulesText:c.rulesText,asset:FrontlinesArt.get(c).src};}));
    for(const row of records){const bytes=fs.readFileSync(path.join(root,row.asset));row.sha256=crypto.createHash('sha256').update(bytes).digest('hex');row.bytes=bytes.length;}
    fs.writeFileSync(path.join(out,'sprint12-tactical-before-inventory.json'),JSON.stringify(records,null,2));
    await page.locator('#collection-set-filter').selectOption('tactical-011');
    for(const faction of ['stonewall','bruiser','syndicate','nightwalker','rogue']){
      await page.locator('#collection-faction-filter').selectOption(faction);
      await page.locator('#collection-cards').evaluate(n=>n.scrollTop=0);
      await page.screenshot({path:path.join(out,'sprint12-tactical-'+faction+'-collection-before.png')});
    }
    for(const faction of ['stonewall','bruiser','syndicate','nightwalker','rogue']){
      await page.setViewportSize({width:1160,height:1050});
      await page.evaluate(({records,faction})=>{
        document.body.innerHTML='<style>body{margin:0;padding:18px;background:#0a121a;color:#e1e8ed;font:14px Arial;overflow:auto}h1{margin:0 0 14px;font-size:24px}.audit{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.tile{background:#122331;padding:8px;border:1px solid #385164}.tile img{width:100%;height:auto;aspect-ratio:1;object-fit:contain}.tile h2{font-size:15px;margin:7px 0 4px}.tile p{font-size:11px;line-height:1.4;margin:4px 0}.micro{display:flex;gap:9px;align-items:center;height:80px}.micro img{width:70px;height:70px;object-fit:cover}.micro .wide{width:110px;height:70px;object-fit:cover}</style><h1>Frontlines v1.0.4 · Tactical Arsenal before audit · '+faction+'</h1><div class="audit">'+records.filter(r=>r.faction===faction).map(r=>'<article class="tile"><img src="/'+r.asset+'"><h2>'+r.name+'</h2><p>'+r.type+' · '+r.id+'</p><div class="micro"><img src="/'+r.asset+'"><img class="wide" src="/'+r.asset+'"></div><p>'+r.rulesText+'</p></article>').join('')+'</div>';
      },{records,faction});
      await page.locator('img').evaluateAll(nodes=>Promise.all(nodes.map(n=>n.decode())));
      await page.screenshot({path:path.join(out,'sprint12-tactical-'+faction+'-sheet-before.png'),fullPage:true});
    }
    console.log(JSON.stringify({cards:records.length,sheets:5,collectionScreens:5,campaigns:0}));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
