'use strict';
// Wording only. Card definitions, engine counters, intent IDs and timing stay intact.
const fs=require('node:fs'),assert=require('node:assert/strict');
function edit(file,replacements){let text=fs.readFileSync(file,'utf8');for(const [before,after] of replacements){assert.ok(text.includes(before)||text.includes(after),file+': '+before);text=text.replaceAll(before,after);}fs.writeFileSync(file,text);}
edit('app.js',[
  ['CAPTURE ON END TURN','CAPTURE ON WINDOW END'],['ON END TURN','ON WINDOW END'],['ENEMY TURN','ENEMY WINDOW'],['YOUR OFFENSIVE TURN','YOUR ACTION WINDOW'],['YOUR TURN','YOUR WINDOW'],
  ['End turn','End window'],['END-TURN FORECAST','CAPTURE FORECAST'],["eyebrow\">TURN '+String(state.turn)","eyebrow\">ACTION WINDOW '+String(state.turn)"],['<span>TURNS</span>','<span>ACTION WINDOWS</span>'],
  ['own offensive turn.','own action window.'],["log-turn\">T'+String(entry.turn)","log-turn\">W'+String(entry.turn)"],
  ["c.type==='leader'?'leader'","c.type==='leader'?'Field Leader'"]
]);
edit('collection-app.js',[["c.type==='leader'?'Commander'","c.type==='leader'?'Field Leader'"]]);
edit('deck-builder.js',[["stats.leaders+' Commander</span>'","stats.leaders+' Field Leaders</span>'"],["['leader','Leader unit']","['leader','Field Leader']"],["c.type==='leader'?'LEADER UNIT'","c.type==='leader'?'FIELD LEADER'"],["c.type==='leader'?'Leader unit'","c.type==='leader'?'Field Leader'"]]);
edit('field-manual.js',[
  ["'Turn structure':['On your offensive turn, units ready, Order spending resets and you draw cards.'","'Action windows':['The window counter advances whenever initiative passes. At your window start, units ready, Order spending resets and you draw cards.'"],
  ['End turn adds','End window adds'],['next offensive turn','next action window'],['later turns','later action windows'],['on the turn they enter','in the action window they enter'],['turn changes','window changes'],['At offensive turn end','At your action-window end'],
  ['Leaders add powerful support.','Field Leaders are deployable support units; they are separate from the off-lane Commander.'],
  ['until the target’s next action window.','until the target’s next action-window start.'],['Before ending your turn','Before ending your action window'],
  ['Expiry, removal of the source, fighting in place and responses elsewhere','Expiry, fighting in place and responses elsewhere'],
  ['Frag Out hits up to two units','Frag Out hits up to two enemy permanents']
]);
// These paragraphs are human prose outside the immutable accepted JSON checkpoint.
for(const file of ['docs/art/SPRINT12-ART-QUALITY.md','scripts/checkpoint-sprint12-art.js']){
  let text=fs.readFileSync(file,'utf8');for(const [before,after] of [['All155','All 155'],['original76','original 76'],['All165','All 165'],['The115','The 115'],['and40','and 40'],[';76','; 76'],['The91','The 91'],['cover40','cover 40'],[',39',', 39'],['all23','all 23'],['new512','new 512'],['total7,074,746','total 7,074,746'],['is118,300','is 118,300'],['remain1254','remain 1254'],['original512','original 512'],['The5:7','The 5:7'],['Passed184','Passed 184'],['all155','all 155'],['and20','and 20']])text=text.replaceAll(before,after);fs.writeFileSync(file,text);
}
console.log('Sprint 12 presentation wording applied; card definitions and timing preserved.');
