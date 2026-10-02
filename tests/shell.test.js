'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../shell-state.js');
test('fullscreen shortcuts require a deliberate keydown and never treat Escape as quit',()=>{
  assert.equal(S.fullscreenShortcut({type:'keyDown',key:'F11'}),true);
  assert.equal(S.fullscreenShortcut({type:'keyDown',key:'Enter',alt:true}),true);
  for(const input of [{type:'keyUp',key:'F11'},{type:'keyDown',key:'F11',isAutoRepeat:true},{type:'keyDown',key:'F11',control:true},{type:'keyDown',key:'Enter'},{type:'keyDown',key:'Escape'}])assert.equal(S.fullscreenShortcut(input),false);
});
test('update installation requires a downloaded update and no active match',()=>{
  for(const status of ['disabled','checking','available','downloading','current','error'])assert.equal(S.canInstall({status},false),false);
  assert.equal(S.canInstall({status:'ready'},true),false);assert.equal(S.canInstall({status:'ready'},false),true);
});
test('settings sanitize invalid saved values and retain zero-volume mute',()=>{
  assert.deepEqual(S.preferences(null),S.preferences('bad'));
  const prefs=S.preferences({masterVolume:0,animationSpeed:'fast',sound:true,reducedEffects:true,reducedShake:'true'});
  assert.equal(prefs.masterVolume,0);assert.equal(prefs.animationSpeed,'fast');assert.equal(prefs.sound,true);assert.equal(prefs.reducedShake,false);
  assert.equal(S.preferences({masterVolume:200}).masterVolume,1);assert.equal(S.preferences({masterVolume:-3}).masterVolume,0);
});
test('window recovery keeps saved bounds visible on a changed monitor',()=>{
  const area={x:-1366,y:0,width:1366,height:728};
  const bounds=S.windowBounds({x:5000,y:-2000,width:3000,height:2000},area);
  assert.deepEqual(bounds,{x:-1366,y:0,width:1366,height:728});
  const tiny=S.windowBounds({x:NaN,y:NaN,width:'wrong',height:null},{x:0,y:0,width:800,height:500});
  assert.deepEqual(tiny,{x:0,y:0,width:800,height:500});
  const odd=S.windowBounds({}, {x:0,y:0,width:1367,height:769});
  assert.equal(Number.isInteger(odd.x),true);assert.equal(Number.isInteger(odd.y),true);
});
test('update status keeps progress bounded and errors non-disruptive',()=>{
  assert.match(S.updateText({status:'downloading',version:'0.6.0',percent:120}),/100%/);
  assert.match(S.updateText({status:'ready',version:'0.6.0'}),/restart Frontlines/);
  assert.match(S.updateText({status:'error'}),/try again later/);
});
