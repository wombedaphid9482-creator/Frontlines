'use strict';
// Evidence generation only: no gameplay, runtime art, or balance mutations.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const packages='C:/Users/noaho/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const sharp=require(path.join(packages,'sharp')),{chromium}=require(path.join(packages,'playwright'));
const B=require('../balance'),Art=require('../art'),D=B.dataFor('sprint11');
const root=path.resolve(__dirname,'..'),stage=process.argv.includes('--after')?'after':process.argv.includes('--framing')?'framing':'before',out=path.join(root,'docs/art/sprint12-'+stage);
const origin=process.env.FRONTLINES_TEST_URL||'http://127.0.0.1:4173';
if(stage!=='after'&&fs.existsSync(path.join(out,'legacy-stonewall-faces.png')))throw new Error('The '+stage+' contact-sheet evidence is immutable. Use --after for current-art review.');
fs.mkdirSync(out,{recursive:true});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
async function labels(text,width,height){return sharp(Buffer.from('<svg width="'+width+'" height="'+height+'"><rect width="100%" height="100%" fill="#101c27"/><text x="12" y="27" fill="#eef3f5" font-size="17" font-family="sans-serif">'+esc(text)+'</text></svg>')).png().toBuffer();}
(async()=>{
  const legacy=Object.values(D.CARDS).filter(c=>c.set!=='tactical-011');
  const sources={};for(const faction of Object.keys(D.FACTIONS)){
    const relative='assets/cards/'+faction+'/starter-atlas.webp',p=path.join(root,relative),m=await sharp(p).metadata();
    sources[relative]={width:m.width,height:m.height,bytes:fs.statSync(p).size,sha256:hash(p)};
  }
  const mappings=legacy.map(c=>{
    const a=Art.get(c),isIllustration=a.refined||['unit','leader'].includes(c.type);
    return {id:c.id,name:c.name,faction:c.faction,type:c.type,artRole:a.role,runtimeKind:a.refined?'refined-painting':isIllustration?'painted-atlas':'symbol',source:isIllustration?a.src:null,position:isIllustration?a.position:null,dimensions:isIllustration?[a.width||512,a.height||512]:null,sourceEvidence:isIllustration?(sources[a.src]||{sha256:hash(path.join(root,a.src)),bytes:fs.statSync(path.join(root,a.src)).size}):null,effectKind:c.effect?.kind||null,rulesText:c.rulesText};
  });
  fs.writeFileSync(path.join(out,'legacy-mappings-'+stage+'.json'),JSON.stringify({build:stage==='after'?'v1.0.5 art quality review':'v1.0.4',cards:mappings,sources},null,2));
  const atlasComposites=[];
  for(const[factionIndex,faction]of Object.keys(D.FACTIONS).entries()){
    const image=await sharp(path.join(root,'assets/cards/'+faction+'/starter-atlas.webp')).resize(500,500,{fit:'contain'}).png().toBuffer();
    atlasComposites.push({input:await labels(D.FACTIONS[faction].name+' — four 512px source tiles',500,42),left:(factionIndex%3)*500,top:Math.floor(factionIndex/3)*542});
    atlasComposites.push({input:image,left:(factionIndex%3)*500,top:Math.floor(factionIndex/3)*542+42});
  }
  await sharp({create:{width:1500,height:1084,channels:3,background:'#101c27'}}).composite(atlasComposites).png().toFile(path.join(out,'legacy-atlas-benchmarks.png'));
  const portraits=[];for(const[index,id]of Object.keys(Art.COMMANDER_ART).entries()){
    const a=Art.commanderGet(id),p=path.join(root,a.src),m=await sharp(p).metadata();
    portraits.push({id,name:Art.COMMANDER_ART[id].name,faction:a.faction,src:a.src,width:m.width,height:m.height,bytes:fs.statSync(p).size,sha256:hash(p)});
  }
  const commanderComposites=[];for(const[index,p]of portraits.entries()){
    commanderComposites.push({input:await labels(p.name+' · '+p.faction,320,40),left:(index%5)*320,top:Math.floor(index/5)*360});
    commanderComposites.push({input:await sharp(path.join(root,p.src)).resize(320,320,{fit:'cover'}).png().toBuffer(),left:(index%5)*320,top:Math.floor(index/5)*360+40});
  }
  await sharp({create:{width:1600,height:720,channels:3,background:'#101c27'}}).composite(commanderComposites).png().toFile(path.join(out,'commander-benchmarks.png'));
  fs.writeFileSync(path.join(out,'commander-mappings-'+stage+'.json'),JSON.stringify(portraits,null,2));
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try{
    const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage();
    await page.goto(origin+'/collection.html');await page.waitForFunction(()=>!!window.FrontlinesCollectionApp);
    await page.locator('#collection-set-filter').selectOption('legacy');
    for(const faction of Object.keys(D.FACTIONS)){
      await page.locator('#collection-faction-filter').selectOption(faction);
      const body=await page.locator('#collection-cards').innerHTML();
      const html='<!doctype html><html><head><base href="'+origin+'/"><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="collection.css"><link rel="stylesheet" href="presentation.css"><style>body{margin:0;padding:20px;height:auto;background:#101c27;overflow:visible}h1{margin:0 0 15px;font-size:24px} .collection-grid{display:grid!important;grid-template-columns:repeat(6,200px)!important;gap:14px!important;padding:0!important;height:auto!important;max-height:none!important;overflow:visible!important}.collection-card{min-width:0;width:200px!important}.collection-card.unowned .collection-art{filter:none;opacity:1}.collection-card-inspect{width:200px!important;height:280px!important;aspect-ratio:5/7!important;cursor:default}.collection-card-type{font-size:7px}.collection-card-text h3{font-size:12px}.collection-card-status{font-size:7px}.collection-card{position:relative}.collection-card:after{content:attr(data-card);display:block;height:26px;padding:5px;background:#10202b;color:#c0d4df;font:9px monospace;overflow:hidden}</style></head><body><h1>'+esc(D.FACTIONS[faction].name)+' · 23 legacy cards · actual Collection renderer, unowned dimming removed</h1><div class="collection-grid">'+body+'</div></body></html>';
      fs.writeFileSync(path.join(out,'legacy-'+faction+'-faces.html'),html);
      const sheet=await context.newPage();await sheet.setContent(html);await sheet.evaluate(()=>document.fonts.ready);
      await sheet.waitForFunction(()=>[...document.querySelectorAll('.card-portrait')].every(n=>!!getComputedStyle(n).backgroundImage));
      await sheet.evaluate(async()=>Promise.all([...new Set([...document.querySelectorAll('.card-portrait')].map(n=>getComputedStyle(n).backgroundImage.match(/url\("?(.*?)"?\)/)?.[1]).filter(Boolean))].map(url=>new Promise((resolve,reject)=>{const img=new Image();img.onload=resolve;img.onerror=reject;img.src=url;}))));
      await sheet.screenshot({path:path.join(out,'legacy-'+faction+'-faces.png'),fullPage:true});await sheet.close();
    }
  }finally{await browser.close();}
  console.log(JSON.stringify({legacyCards:mappings.length,commanderBenchmarks:portraits.length,sheets:7,out:'docs/art/sprint12-'+stage,runtimeMutations:0,completeMatches:0}));
})().catch(e=>{console.error(e);process.exitCode=1;});
