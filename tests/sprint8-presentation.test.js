'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Data=require('../balance').dataFor('sprint7'),Collection=require('../collection'),P=require('../presentation'),Music=require('../music-data'),Art=require('../art'),Shell=require('../shell-state');

test('all collectible card metadata inherit immutable centralized rarity profiles',()=>{
  assert.equal(Object.keys(Data.CARDS).length,115);
  for(const card of Object.values(Data.CARDS)){const profile=P.profile(card);assert.equal(profile.id,Collection.metadata(card).rarity);assert.ok(Object.isFrozen(profile));assert.ok(profile.deployment<=1100);assert.ok(profile.packReveal<=800);assert.ok(profile.particleLimit<=10);}
  assert.deepEqual(Object.keys(P.PROFILES),['common','uncommon','rare','epic','legendary']);
  assert.equal(P.profile({rarity:'invalid'}).id,'common');
});
test('cosmetic aliases produce safe frame classes and leave all gameplay card values intact',()=>{
  const card=JSON.parse(JSON.stringify(Object.values(Data.CARDS)[0])),prior=JSON.stringify(card);
  for(const [canonical,css]of [['standard','standard'],['fieldWorn','field-worn'],['battleHardened','battle-hardened'],['veteran','veteran'],['foil','foil'],['fullArt','full-art']]){
    const skin=P.skin(card,{variant:canonical});assert.equal(skin.variant,css);assert.match(skin.className,new RegExp('variant-'+css+'$'));assert.match(skin.style,/^--rarity-color:#[a-f0-9]{6};--rarity-glow:[.\d]+;--foil-intensity:[.\d]+;$/);assert.equal(JSON.stringify(card),prior);
  }
  assert.equal(P.variantId('foil" onmouseover="x'),'standard');
});
test('Full, Reduced, Minimal, Fast and system motion limits bound spectacle without changing cards',()=>{
  const card={rarity:'legendary',faction:'nightwalker'};
  const full=P.limits(card,{presentation:'full'}),reduced=P.limits(card,{presentation:'reduced'}),minimal=P.limits(card,{presentation:'minimal'}),fast=P.limits(card,{animationSpeed:'fast'});
  assert.equal(full.particles,10);assert.equal(full.audioLayers,4);assert.equal(reduced.particles,3);assert.equal(reduced.audioLayers,1);assert.equal(minimal.particles,0);assert.equal(minimal.audioLayers,0);assert.ok(fast.duration<full.duration);assert.equal(P.limits(card,{presentation:'full'},true).particles,0);
  assert.equal(P.faction(card).motif,'distortion');assert.notEqual(P.faction({faction:'stonewall'}).pitch,P.faction({faction:'bruiser'}).pitch);
});
test('art HTML confines atlas and glyphs to an escaped semantic art subtree',()=>{
  const unit=Art.html({name:'A <long> "name"',faction:'stonewall',type:'unit'}),order=Art.html({name:'Order',faction:'rogue',type:'order',effect:{kind:'draw'}}),asset=Art.html({name:'Asset',faction:'rogue',type:'asset'});
  assert.match(unit,/card-portrait/);assert.match(unit,/&lt;long&gt; &quot;name&quot;/);assert.match(order,/art-symbol/);assert.match(order,/<svg/);assert.match(asset,/<svg/);assert.doesNotMatch(unit,/position:absolute/);assert.doesNotMatch(Art.html({name:'X',type:'unit'},{className:'card-portrait onload="x"'}),/onload/);
  const css=fs.readFileSync(require.resolve('../presentation.css'),'utf8');assert.match(css,/isolation:isolate;contain:paint/);assert.match(css,/\.hand-card \.card-rules\{[^}]*font-size:10px[^}]*overflow:visible/);
});
test('audio and presentation preferences migrate with safe defaults and preserve individual zero mutes',()=>{
  const input={sound:true,masterVolume:0,musicVolume:0,uiVolume:0,cardEffectsVolume:0,battlefieldVolume:0,presentation:'minimal',animationSpeed:'fast'};
  const saved=Shell.preferences(input);for(const key of Object.keys(input))assert.equal(saved[key],input[key]);
  const defaults=Shell.preferences({musicVolume:99,uiVolume:-3,cardEffectsVolume:NaN,presentation:'cinema'});assert.equal(defaults.musicVolume,1);assert.equal(defaults.uiVolume,0);assert.equal(defaults.cardEffectsVolume,.8);assert.equal(defaults.presentation,'full');assert.equal(Shell.preferences().sound,false);
});

function audioFixture(){
  const contexts=[],callbacks=new Map();let timer=0;
  class Param{constructor(){this.value=1;this.calls=[];}setValueAtTime(value,time){this.value=value;this.calls.push(['set',value,time]);}setTargetAtTime(value,time,constant){this.value=value;this.calls.push(['target',value,time,constant]);}linearRampToValueAtTime(value,time){this.value=value;this.calls.push(['linear',value,time]);}exponentialRampToValueAtTime(value,time){this.value=value;this.calls.push(['exp',value,time]);}cancelScheduledValues(time){this.calls.push(['cancel',time]);}}
  class Node{constructor(){this.connections=[];this.gain=new Param();this.frequency=new Param();this.stops=[];}connect(node){this.connections.push(node);}disconnect(){this.disconnected=true;}start(at){this.started=at||0;}stop(at){this.stops.push(at);if(at===undefined)this.onended?.();}}
  class Context{constructor(){this.currentTime=0;this.sampleRate=8000;this.state='running';this.destination={};this.nodes=[];contexts.push(this);}node(){const node=new Node();this.nodes.push(node);return node;}createGain(){return this.node();}createOscillator(){return this.node();}createBufferSource(){return this.node();}createBiquadFilter(){return this.node();}createBuffer(channels,length,rate){const samples=new Float32Array(length);return {length,sampleRate:rate,duration:length/rate,getChannelData:()=>samples};}resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}}
  const doc={hidden:false,querySelector:()=>null,addEventListener:()=>{},documentElement:{dataset:{}},body:{dataset:{}}};
  const root={document:doc,AudioContext:Context,FrontlinesData:Data,FrontlinesPresentation:P,FrontlinesMusic:Music,navigator:{userActivation:{isActive:false}},setTimeout(fn){const id=++timer;callbacks.set(id,fn);return id;},clearTimeout:id=>callbacks.delete(id),addEventListener:()=>{},matchMedia:()=>({matches:false,addEventListener:()=>{}})};
  vm.createContext(root);vm.runInContext(fs.readFileSync(require.resolve('../effects'),'utf8'),root);
  return {fx:root.FrontlinesEffects,root,contexts,async flush(){while(callbacks.size){for(const [id,fn]of [...callbacks]){callbacks.delete(id);fn();}await Promise.resolve();}await Promise.resolve();}};
}
test('audio stays muted until enabled and trusted interaction, then loops the assigned original score',async()=>{
  const f=audioFixture();f.fx.setMusicState('match');f.fx.unlockAudio({isTrusted:true});assert.equal(f.contexts.length,0);
  f.fx.configure({sound:true});f.fx.unlockAudio({isTrusted:false});f.fx.unlockAudio();assert.equal(f.contexts.length,0);
  f.fx.unlockAudio({isTrusted:true});await f.flush();assert.equal(f.contexts.length,1);assert.equal(f.fx.audioState().track,'battlefield');assert.equal(f.fx.audioState().musicVoices,1);assert.equal(f.fx.audioState().looping,true);
  const source=f.contexts[0].nodes.find(n=>n.loop);assert.ok(source.buffer.duration>8);const wave=source.buffer.getChannelData(0);assert.equal(wave[0],0);assert.ok(Math.abs(wave[wave.length-1])<.001,'Loop boundary must release without a click');
  assert.match(Music.license,/Original/);
});
test('music transitions crossfade at bounded polyphony and route changes never restart the same track',async()=>{
  const f=audioFixture();f.fx.configure({sound:true});f.fx.unlockAudio({isTrusted:true});await f.flush();const context=f.contexts[0];
  const old=context.nodes.find(n=>n.loop),before=context.nodes.length;f.fx.setMusicState('menu');await f.flush();assert.equal(context.nodes.length,before);
  f.fx.setMusicState('arsenal');await f.flush();assert.equal(f.fx.audioState().musicVoices,2);assert.ok(old.stops.some(at=>at>=Music.crossfadeSeconds));
  const gains=context.nodes.filter(n=>n.gain.calls.some(c=>c[0]==='linear'));assert.ok(gains.some(n=>n.gain.calls.some(c=>c[0]==='linear'&&c[1]===0)));assert.ok(gains.some(n=>n.gain.calls.some(c=>c[0]==='linear'&&c[1]===1)));
  for(const state of ['shop','match','menu','arsenal']){f.fx.setMusicState(state);await f.flush();assert.ok(f.fx.audioState().musicVoices<=2);}
  f.fx.configure({sound:false});assert.equal(f.fx.audioState().musicVoices,0);assert.equal(f.fx.audioState().effectVoices,0);
});
test('channel adapters receive faction and rarity layers while independent mixer settings retain zero',async()=>{
  const f=audioFixture(),heard=[];f.fx.configure({sound:true,musicVolume:0,uiVolume:.4,cardEffectsVolume:0,battlefieldVolume:.6});f.fx.unlockAudio({isTrusted:true});await f.flush();f.fx.setSoundAdapter(event=>heard.push(event));
  const card={rarity:'legendary',faction:'nightwalker'};f.fx.cue('deploy',{card,channel:'card'});assert.equal(heard[0].channel,'card');assert.equal(heard[0].output.gain.value,0);assert.equal(heard[0].rarity,'legendary');assert.equal(heard[0].faction.motif,'distortion');assert.equal(heard[0].layers,5);
  f.fx.configure({presentation:'minimal'});f.contexts[0].currentTime+=1;f.fx.cue('deploy',{card,channel:'card'});assert.equal(heard[1].layers,1);assert.equal(f.fx.audioState().channels.music,0);assert.equal(f.fx.audioState().channels.card,0);assert.equal(f.fx.audioState().channels.ui,.4);
  f.fx.configure({presentation:'full'});for(const name of ['commanderIntro','commander','land','impact']){f.contexts[0].currentTime+=1;f.fx.cue(name,{card,channel:name==='impact'?'battlefield':'card'});const event=heard.at(-1);assert.equal(event.name,name);assert.equal(event.layers,5);assert.equal(event.output.gain.value,name==='impact'?.6:0);}
});
test('effect audio caps live voices and optional audio failures never escape into actions',async()=>{
  const f=audioFixture();f.fx.configure({sound:true});f.fx.unlockAudio({isTrusted:true});await f.flush();
  for(let i=0;i<40;i++){f.contexts[0].currentTime+=.1;f.fx.cue('deploy',{card:{rarity:'legendary',faction:'rogue'},channel:'card'});}assert.ok(f.fx.audioState().effectVoices<=24);
  f.fx.setSoundAdapter(()=>{throw new Error('missing optional audio');});assert.doesNotThrow(()=>f.fx.cue('victory'));f.fx.clear();assert.equal(f.fx.audioState().effectVoices,0);assert.ok(f.fx.audioState().musicVoices>0,'Clearing transient battlefield effects must preserve the soundtrack');
});

test('pack Rare and Legendary cues are distinct, faction-aware and bypassed by fast-open',async()=>{
  const f=audioFixture(),heard=[];f.fx.configure({sound:true,reducedEffects:true,cardEffectsVolume:.3});f.fx.unlockAudio({isTrusted:true});await f.flush();f.fx.setSoundAdapter(e=>heard.push(e));
  for(const [rarity,name]of [['common','reveal'],['rare','revealRare'],['epic','revealRare'],['legendary','revealLegendary']]){
    f.contexts[0].currentTime+=1;f.fx.reveal({rarity,faction:'rogue'},null,{pack:true});assert.equal(heard.at(-1).name,name);assert.equal(heard.at(-1).channel,'card');assert.equal(heard.at(-1).output.gain.value,.3);assert.equal(heard.at(-1).faction.motif,'spark');
  }
  const before=heard.length;f.contexts[0].currentTime+=1;f.fx.reveal({rarity:'legendary',faction:'stonewall'},null,{pack:true,fast:true});assert.equal(heard.length,before);
  f.fx.configure({sound:false});f.contexts[0].currentTime+=1;f.fx.reveal({rarity:'legendary',faction:'stonewall'},null,{pack:true});assert.equal(heard.length,before);
  f.fx.configure({sound:true});f.root.document.hidden=true;f.contexts[0].currentTime+=1;f.fx.reveal({rarity:'legendary',faction:'stonewall'},null,{pack:true});assert.equal(heard.length,before);
});
