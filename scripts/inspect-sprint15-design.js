'use strict';
// Local visual inventory; no gameplay campaign or changes to owner saves.
const {chromium}=require(process.argv[2]||'playwright'),fs=require('node:fs'),path=require('node:path');
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'}),context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage(),report=[];fs.mkdirSync('test-results/sprint15-design',{recursive:true});
try{await page.addInitScript(()=>localStorage.setItem('frontlines.onboarding.v1','seen'));
for(const [name,url,screen]of [['home','index.html','home'],['setup','index.html','play'],['multiplayer','index.html','multiplayer'],['arsenal','deck-builder.html'],['collection','collection.html'],['warroom','simulator.html']]){
await page.goto('http://127.0.0.1:4173/'+url);await page.waitForLoadState('networkidle');if(screen)await page.evaluate(s=>FrontlinesApp.showScreen(s),screen);
await page.screenshot({path:path.resolve('test-results/sprint15-design/'+name+'-entry.png')});report.push(await page.evaluate(name=>({name,width:innerWidth,height:innerHeight,pageHeight:document.documentElement.scrollHeight,pageWidth:document.documentElement.scrollWidth,headings:[...document.querySelectorAll('h1,h2')].filter(n=>n.getClientRects().length).map(n=>n.textContent),primary:[...document.querySelectorAll('button.primary,.home-command,.command.primary')].filter(n=>n.getClientRects().length).map(n=>({text:n.textContent.trim().slice(0,90),height:n.getBoundingClientRect().height,disabled:n.disabled}))}),name));}
fs.writeFileSync('test-results/sprint15-design-entry.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
