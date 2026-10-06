'use strict';
const fs=require('node:fs');
const copy=(source,target,replacements)=>{let s=fs.readFileSync(source,'utf8');for(const [a,b]of replacements)s=s.replaceAll(a,b);fs.writeFileSync(target,s);};
copy('tests/browser-sprint11-lab-migration.js','tests/browser-sprint12-lab-migration.js',[
  ['sprint11-lab-migration.json','sprint12-lab-migration.json'],["gameVersion:'1.0.3',balanceProfile:'sprint10'","gameVersion:'1.0.4',balanceProfile:'sprint11'"],["loaded.balanceProfile,'sprint11'","loaded.balanceProfile,'sprint12'"],
  ["selectOption('sprint10')","selectOption('sprint11')"],["inputValue(),'sprint10'","inputValue(),'sprint11'"],['intentionalSprint10Preserved','intentionalSprint11Preserved']
]);
copy('tests/browser-battlefield-viewport-hotfix.js','tests/browser-sprint12-battlefield.js',[
  ['viewport-hotfix-browser.json','sprint12-battlefield-browser.json'],['viewport-hotfix-','sprint12-battlefield-']
]);
copy('tests/browser-tutorial-sprint9.js','tests/browser-sprint12-tutorial.js',[
  ['browser-tutorial-sprint9.json','sprint12-tutorial-browser.json'],['sprint9-tutorial-','sprint12-tutorial-']
]);
copy('tests/browser-sprint11-tactics.js','tests/browser-sprint12-tactics.js',[
  ['sprint11-tactical-browser.json','sprint12-tactical-browser.json'],['sprint11-','sprint12-']
]);
let tutorial=fs.readFileSync('tutorial.js','utf8');
for(const [a,b]of [['End Turn','End window'],['end your turn','end your action window'],['next offensive turn','next action window'],['your offensive turn','your action window'],['your next turn','your next action window'],['at turn end','at window end'],['this turn.','this action window.'],['your turns','your action windows']])tutorial=tutorial.replaceAll(a,b);
fs.writeFileSync('tutorial.js',tutorial);
let training=fs.readFileSync('tactical-training.js','utf8');training=training.replaceAll('<br>TURN ','<br>ACTION WINDOW ').replaceAll("'<li>Turn '","'<li>Window '").replaceAll('real engine turn boundaries','real engine action-window boundaries');fs.writeFileSync('tactical-training.js',training);
console.log('Current-release browser checks prepared; legacy checks preserved.');
