'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const pkg=require('../package.json'),Build=require('../build-info'),Shell=require('../shell-state');
test('every visible build version is generated from the package and loaded before runtime',()=>{
  assert.equal(Build.version,pkg.version);assert.equal(Shell.VERSION,pkg.version);
  for(const file of ['index.html','deck-builder.html','simulator.html']){const html=fs.readFileSync(file,'utf8');assert.ok(html.indexOf('src="build-info.js"')<html.indexOf('src="data.js"'));}
});
test('learning preferences survive validation, invalid settings recover to fair defaults',()=>{
  const prefs=Shell.preferences({aiDifficulty:'expert',aiSpeed:'deliberate',tutorialHints:false,actionExplanations:false,masterVolume:0});
  assert.equal(prefs.aiDifficulty,'expert');assert.equal(prefs.aiSpeed,'deliberate');assert.equal(prefs.tutorialHints,false);assert.equal(prefs.actionExplanations,false);assert.equal(prefs.masterVolume,0);
  assert.equal(Shell.preferences({aiDifficulty:'cheat',aiSpeed:'warp'}).aiDifficulty,'normal');assert.equal(Shell.preferences({aiDifficulty:'learning'}).aiDifficulty,'normal');
});
