'use strict';
// Reuse mature smoke fixtures while preserving all earlier evidence files.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const mode=process.argv[2],playwright=process.argv[3]||'playwright';
const files={offline:'browser-sprint13-offline-regressions.js',ui:'browser-sprint13-multiplayer-ui.js',scaled:'browser-sprint13-multiplayer-ui.js',relay:'browser-sprint13-two-client.js'};
if(!files[mode])throw Error('Choose offline, ui, scaled or relay.');
if(mode==='scaled')process.env.FRONTLINES_TEST_SCALED='1';
const file=path.resolve(__dirname,'../tests',files[mode]);let source=fs.readFileSync(file,'utf8');
source=source.replaceAll('sprint13-','sprint14-').replaceAll('sprint-13.png','sprint-14.png').replaceAll("version:'1.1.0'","version:'1.2.0'").replace('v1\\.1\\.0.*Sprint 13 — Private Online Multiplayer','v1\\.2\\.0.*Sprint 14 — Arsenal Prestige');
if(mode==='relay'){
 source=source.replace("localStorage.setItem(FrontlinesCollection.STORAGE_KEY,JSON.stringify(profile));", "for(const row of Object.values(profile.cards)){row.variants=['standard','foil','veteran'];row.cosmetics.preferredVariant='foil';row.cosmetics.preferredWear='veteran';}localStorage.setItem(FrontlinesCollection.STORAGE_KEY,JSON.stringify(profile));");
 source=source.replace('report.privacyChecks++;',`report.privacyChecks++;
      const cosmetics=await p.evaluate(seat=>({own:[...document.querySelectorAll('.unit.p'+(seat+1))].map(n=>n.className),enemy:[...document.querySelectorAll('.unit.p'+(2-seat))].map(n=>n.className),hand:[...document.querySelectorAll('.hand-area .hand-card')].map(n=>n.className)}),seat);
      assert.ok(cosmetics.own.every(value=>value.includes('cosmetic-foil wear-veteran')),'Own public cards retain local finish and wear');
      assert.ok(cosmetics.enemy.every(value=>value.includes('cosmetic-standard wear-standard')),'Enemy public cards never inherit the viewer inventory');
      assert.ok(cosmetics.hand.every(value=>value.includes('cosmetic-foil wear-veteran')),'Own hand renders independent layers');
      report.cosmeticChecks=(report.cosmeticChecks||0)+1;`);
}
process.argv[2]=playwright;process.argv[3]=undefined;
const runner=new Module(file,module);runner.filename=file;runner.paths=Module._nodeModulePaths(path.dirname(file));runner._compile(source,file);
