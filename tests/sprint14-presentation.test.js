'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const P=require('../presentation'),C=require('../collection'),D=require('../balance').dataFor(require('../balance').DEFAULT_PROFILE),root=path.resolve(__dirname,'..');

test('all 155 cards retain their collectible classification and competitive definitions during prestige rendering',()=>{
  assert.equal(Object.keys(D.CARDS).length,155);const before=JSON.stringify(D.CARDS),counts={};
  for(const card of Object.values(D.CARDS)){
    const s=P.skin(card,{variant:'foil',wear:'veteran'});assert.equal(s.rarity,C.metadata(card).rarity);counts[s.rarity]=(counts[s.rarity]||0)+1;
    assert.match(s.className,/cosmetic-foil wear-veteran variant-foil$/);assert.ok(!Object.hasOwn(s,'attack')&&!Object.hasOwn(s,'health')&&!Object.hasOwn(s,'presence'));
    assert.match(P.summary(card,{variant:'foil',wear:'veteran'}),/Foil/);assert.match(P.layers(card,{variant:'foil',wear:'veteran'}),/prestige-cosmetic cosmetic-foil/);
  }
  assert.equal(JSON.stringify(D.CARDS),before);assert.deepEqual(Object.keys(counts).sort(),['common','epic','legendary','rare','uncommon']);
});

test('five faction Legendary frames have independent material, geometry and existing emblems',()=>{
  const geometries=new Set(),materials=new Set();
  for(const faction of Object.keys(D.FACTIONS)){
    const card=Object.values(D.CARDS).find(c=>c.faction===faction&&C.metadata(c).rarity==='legendary'),s=P.skin(card),chrome=P.chrome(card);
    assert.equal(s.frame,'signature');geometries.add(s.geometry);materials.add(s.material);
    assert.match(chrome,new RegExp('data-geometry="'+s.geometry+'"'));assert.match(chrome,/prestige-crest/);assert.match(chrome,new RegExp('assets/ui/faction_emblems/'+faction+'\\.svg'));
    assert.ok(fs.existsSync(path.join(root,'assets/ui/faction_emblems',faction+'.svg')));assert.equal((chrome.match(/prestige-corner/g)||[]).length,4);assert.match(chrome,/aria-hidden="true"/);
  }
  assert.equal(geometries.size,5);assert.equal(materials.size,5);
  assert.doesNotMatch(P.chrome({rarity:'common',faction:'stonewall'}),/prestige-crest/);
});

test('rarity, cosmetic material and earned wear stack without replacing each other',()=>{
  const card={rarity:'legendary',faction:'nightwalker'},s=P.skin(card,{variant:'foil',wear:'veteran'});
  assert.equal(s.rarity,'legendary');assert.equal(s.cosmetic,'foil');assert.equal(s.wear,'veteran');assert.equal(s.ariaLabel,'Legendary · Foil · Veteran');
  const art=P.layers(card,{variant:'foil',wear:'veteran'});assert.match(art,/cosmetic-foil/);assert.match(art,/wear-veteran/);assert.doesNotMatch(art,/prestige-rail|prestige-crest/);
  assert.equal(P.skin(card,{variant:'battleHardened'}).cosmetic,'standard');assert.equal(P.skin(card,{variant:'battleHardened'}).wear,'battle-hardened');
  assert.equal(P.skin(card,{cosmetic:'fullArt',wear:'fieldWorn'}).cosmetic,'full-art');assert.equal(P.skin(card,{cosmetic:'holographic',wear:'veteran'}).cosmetic,'holographic');
  assert.equal(P.skin(card,{variant:'foil',wear:'standard'}).wear,'standard');
});

test('profile cosmetics are read-only and public cards do not read the viewer inventory or preferences',()=>{
  const calls=[],collection={metadata:card=>({rarity:card.rarity,faction:card.faction}),cosmeticState(){calls.push('state');return {variant:'foil',wear:'veteran'};},variantFor(){calls.push('variant');return 'foil';}};
  const scope={FrontlinesCollection:collection};scope.globalThis=scope;vm.runInNewContext(fs.readFileSync(path.join(root,'presentation.js'),'utf8'),scope);
  const card={faction:'rogue',rarity:'legendary'},local=scope.FrontlinesPresentation.skin(card);assert.equal(local.cosmetic,'foil');assert.equal(local.wear,'veteran');assert.ok(calls.length>0);
  calls.length=0;const publicSkin=scope.FrontlinesPresentation.skin(card,{public:true,variant:'foil',wear:'veteran',profile:new Proxy({},{get(){throw Error('Private inventory read');}})});
  assert.deepEqual(calls,[]);assert.equal(publicSkin.rarity,'legendary');assert.equal(publicSkin.cosmetic,'standard');assert.equal(publicSkin.wear,'standard');
});

test('frame labels and classes are allowlisted even when presentation options contain malicious strings',()=>{
  const unsafe={faction:'rogue" onload="x',rarity:'legendary" onmouseover="x',name:'<script>'},options={variant:'foil" onload="x',wear:'veteran" onclick="x',cosmetic:'<script>',rarity:'<script>'};
  for(const html of [P.chrome(unsafe,options),P.layers(unsafe,options),P.summary(unsafe,options)])assert.doesNotMatch(html,/<script|onload|onclick|onmouseover/);
  assert.equal(P.skin(unsafe,options).rarity,'common');assert.equal(P.skin(unsafe,options).wear,'standard');assert.equal(P.skin(unsafe,options).cosmetic,'standard');
});

test('rarity symbols, mastery numerals and frame geometry provide a color-independent hierarchy',()=>{
  assert.equal(new Set(Object.values(P.RARITY_SYMBOLS)).size,5);
  for(const rarity of Object.keys(P.PROFILES)){const html=P.badge({rarity,faction:'stonewall'});assert.match(html,new RegExp('aria-label="Rarity: '+P.PROFILES[rarity].label+'"'));assert.match(html,/rarity-symbol.*aria-hidden="true"/);}
  const css=fs.readFileSync(path.join(root,'presentation.css'),'utf8');assert.match(css,/\.prestige-wear\.wear-veteran:after\{content:'III'\}/);assert.match(css,/@media\(forced-colors:active\)/);
  assert.match(css,/\.prestige-card\.rarity-legendary[^{]*\{[^}]*border:3px double CanvasText/);
});

test('reduced motion preserves static frame identity and no premium card runs an infinite idle animation',()=>{
  const css=fs.readFileSync(path.join(root,'presentation.css'),'utf8'),prestige=css.slice(css.indexOf('/* Forge XIV prestige:'));
  assert.doesNotMatch(prestige,/animation:[^;}]*infinite/);assert.match(prestige,/animation:prestige-sheen 1200ms ease-out 1/);
  assert.match(prestige,/body\[data-presentation="reduced"\] \.prestige-cosmetic\{animation:none!important\}/);assert.match(prestige,/@media\(prefers-reduced-motion:reduce\)\{\.prestige-cosmetic\{animation:none!important\}\}/);
  assert.match(prestige,/\.prestige-frame\{[^}]*pointer-events:none!important/);assert.match(prestige,/\.prestige-art-layers\{[^}]*overflow:hidden;contain:paint/);
});

test('canonical card dimensions and protected art crops survive the prestige material changes',()=>{
  const css=fs.readFileSync(path.join(root,'presentation.css'),'utf8'),prestige=css.slice(css.indexOf('/* Forge XIV prestige:'));
  assert.match(css,/:root\{--card-aspect-ratio:5\/7\}/);
  // New War Room and scripted example contexts need explicit art containers.
  // They must not override the accepted hand, Arsenal or Collection geometry.
  for(const rule of prestige.matchAll(/([^{}]+)\{([^{}]*)\}/g))if(/aspect-ratio:/.test(rule[2])){
    assert.match(rule[1],/lab-card-face|lab-card-art|tutorial-example-art|training-unit-art/);
    assert.doesNotMatch(rule[1],/hand-card|arsenal-card|collection-card|pack-card|inspect-art|full-card-art/);
  }
  assert.doesNotMatch(prestige,/(?:^|\})\s*\.card-portrait[^{}]*\{/);assert.doesNotMatch(prestige,/\.card-rules:(?:before|after)/);
  assert.match(prestige,/\.lab-card-face\{[^}]*aspect-ratio:5\/7/);
  assert.match(css,/\.training-unit-art>\.card-portrait\.art-refined\{[^}]*background-size:cover;background-repeat:no-repeat/);
  assert.match(prestige,/\.prestige-crest img\{[^}]*object-fit:contain/);
});
