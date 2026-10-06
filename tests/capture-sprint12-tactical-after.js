'use strict';
// Manual-review sheets from the actual Collection renderer and trusted art map.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require(process.argv[2]||'playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results'),origin=process.env.FRONTLINES_TEST_URL||'http://127.0.0.1:4173';
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{
  const page=await browser.newPage({viewport:{width:1366,height:768}});await page.goto(origin+'/collection.html');await page.waitForFunction(()=>!!window.FrontlinesCollectionApp);await page.locator('#collection-set-filter').selectOption('tactical-011');
  const records=await page.evaluate(()=>Object.keys(FrontlinesArt.TACTICAL_ART).map(id=>{const c=FrontlinesData.CARDS[id],a=FrontlinesArt.get(c);return {id,name:c.name,faction:c.faction,type:c.type,asset:a.src,position:a.position,refined:!!a.refined};}));
  if(records.some(r=>!r.refined))throw new Error('After-art review requires all forty refined mappings; before evidence remains untouched.');
  for(const row of records){const bytes=fs.readFileSync(path.join(root,row.asset));row.sha256=crypto.createHash('sha256').update(bytes).digest('hex');row.bytes=bytes.length;}
  fs.writeFileSync(path.join(out,'sprint12-tactical-after-inventory.json'),JSON.stringify(records,null,2));
  for(const faction of ['stonewall','bruiser','syndicate','nightwalker','rogue']){
    await page.goto(origin+'/collection.html');await page.waitForFunction(()=>!!window.FrontlinesCollectionApp);await page.locator('#collection-set-filter').selectOption('tactical-011');await page.locator('#collection-faction-filter').selectOption(faction);await page.locator('#collection-cards').evaluate(n=>n.scrollTop=0);await page.screenshot({path:path.join(out,'sprint12-tactical-'+faction+'-collection-after.png')});
    const faces=await page.evaluate(()=>Object.fromEntries([...document.querySelectorAll('.collection-card')].map(n=>[n.dataset.card,n.outerHTML])));
    await page.setViewportSize({width:1360,height:1250});await page.evaluate(({records,faction,faces})=>{
      document.body.innerHTML='<style>body{margin:0;padding:18px;background:#0a121a;color:#e1e8ed;font:14px Arial;overflow:auto!important;height:auto!important}h1{margin:0 0 14px;font-size:24px}.audit-after{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}.tile{background:#122331;padding:8px;border:1px solid #385164}.source{width:100%;height:auto;aspect-ratio:1;object-fit:contain}.tile h2{font-size:14px;margin:5px 0}.tile .collection-card{width:200px;margin:8px auto;opacity:1}.tile .collection-card .collection-art{opacity:1!important;filter:none!important}.tile .collection-card-inspect{width:200px;height:280px}.tile p{font-size:10px;line-height:1.4;margin:4px 0}</style><h1>Frontlines · Tactical Arsenal after · '+faction+' · source and actual 200×280 card</h1><div class="audit-after">'+records.filter(r=>r.faction===faction).map(r=>'<article class="tile"><img class="source" src="/'+r.asset+'"><h2>'+r.name+'</h2><p>'+r.type+' · '+r.position+'</p>'+faces[r.id]+'</article>').join('')+'</div>';
    },{records,faction,faces});await page.locator('.source').evaluateAll(nodes=>Promise.all(nodes.map(n=>n.decode())));await page.screenshot({path:path.join(out,'sprint12-tactical-'+faction+'-sheet-after.png'),fullPage:true});await page.setViewportSize({width:1366,height:768});
  }
  console.log(JSON.stringify({cards:records.length,sheets:5,collectionScreens:5,phase:'after'}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
