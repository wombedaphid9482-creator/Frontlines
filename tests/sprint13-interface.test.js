'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Shell=require('../shell-state');
test('multiplayer display preferences migrate without changing offline or accessibility choices',()=>{
  const value={animationSpeed:'fast',presentation:'minimal',reducedEffects:true,reducedShake:true,sound:true,masterVolume:0,musicVolume:0,aiDifficulty:'expert',aiSpeed:'deliberate',tutorialHints:false,actionExplanations:false};
  const updated=Shell.preferences({...value,displayName:'  Ryken\u0000  ',multiplayerFaction:'rogue',multiplayerDeckId:'saved-variant'});
  for(const [key,wanted]of Object.entries(value))assert.equal(updated[key],wanted);
  assert.equal(updated.displayName,'Ryken');assert.equal(updated.multiplayerFaction,'rogue');assert.equal(updated.multiplayerDeckId,'saved-variant');
  assert.equal(Shell.preferences({displayName:'x'.repeat(80)}).displayName.length,24);assert.equal(Shell.preferences({displayName:'  '}).displayName,'Commander');
});
test('online renderer uses dedicated canonical adapter and has no provider capabilities',()=>{
  const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),ui=fs.readFileSync(path.join(__dirname,'../multiplayer-ui.js'),'utf8');
  assert.match(app,/if\(networkMatch\)return;/);assert.match(app,/beginNetworkMatch/);assert.match(app,/sendIntent\(action\)/);
  assert.match(app,/networkMatch && player!==localSeat\(\)/);assert.match(app,/function handsPublic\(\) \{ return !networkMatch/);
  assert.doesNotMatch(ui,/socketTicket|reconnectToken|Authorization|wss:\/\/|https:\/\//);
});
