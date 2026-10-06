'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {sha256,imageDimensions,localAsset,validateReplacementAssets,validateCardArtManifest}=require('./support/art-integrity');
const root=path.resolve(__dirname,'..'),Art=require('../art'),D=require('../balance').dataFor('sprint11');
const commanders=JSON.parse(fs.readFileSync(path.join(root,'assets/source/commanders/portraits-v2.json'),'utf8'));
const plain=value=>JSON.parse(JSON.stringify(value));
function artInContext(source,registry){const context={module:{exports:{}},...(registry?{FrontlinesArtMap012:registry}:{})};context.globalThis=context;vm.runInNewContext(fs.readFileSync(source,'utf8'),context);return context.module.exports;}

test('Sprint 12 retains every approved Commander source and optimized painted portrait exactly',()=>{
  assert.equal(commanders.assets.length,10);
  for(const record of commanders.assets){
    const source=fs.readFileSync(localAsset(root,record.source,'assets/source/')),runtime=fs.readFileSync(localAsset(root,record.runtime,'assets/cards/'));
    assert.equal(sha256(source),record.sourceSha256,record.id+' source');assert.equal(sha256(runtime),record.runtimeSha256,record.id+' runtime');
    assert.deepEqual(imageDimensions(source),record.sourceDimensions);assert.deepEqual(imageDimensions(runtime),[768,768]);
    assert.equal(Art.commanderGet(record.id).src,record.runtime);assert.ok(Art.commanderHtml(record.id).includes(record.runtime));
  }
});

test('Complete S11 catalog has safe existing art mappings and named accessible rendering',()=>{
  const cards=Object.values(D.CARDS);assert.equal(cards.length,155);
  for(const card of cards){const asset=Art.get(card),html=Art.html(card);assert.ok(asset.alt.includes(card.name),card.id);assert.equal(asset.faction,card.faction);assert.ok(fs.existsSync(localAsset(root,asset.src,'assets/cards/')),card.id);assert.ok(html.includes('role="img"'),card.id);assert.ok(html.includes('aria-label='),card.id);assert.doesNotMatch(html,/(?:src|url\()\s*=?["']?https?:|<script/i);}
});

test('Local artwork paths reject traversal, remote URLs, query strings and untrusted absolute paths',()=>{
  for(const candidate of ['../assets/cards/a.webp','assets/cards/../outside.webp','https://example.test/art.webp','C:/assets/cards/a.webp','/assets/cards/a.webp','assets/cards/a.webp?other','assets/cards\\a.webp','assets/cards/a.webp\0'])assert.throws(()=>localAsset(root,candidate,'assets/cards/'),candidate);
});

test('Image dimension inspection validates lossless, lossy, source and damaged headers',()=>{
  for(const record of commanders.assets){assert.deepEqual(imageDimensions(fs.readFileSync(path.join(root,record.runtime))),[768,768]);assert.deepEqual(imageDimensions(fs.readFileSync(path.join(root,record.source))),record.sourceDimensions);}
  const webp=fs.readFileSync(path.join(root,commanders.assets[0].runtime));assert.throws(()=>imageDimensions(webp.subarray(0,24)),/Truncated|malformed/);assert.throws(()=>imageDimensions(Buffer.from('<svg width="768" height="768"></svg>')),/PNG or WebP/);
});

test('Raster replacement validation checks provenance, mappings, optimization and uniform scaling',()=>{
  const first=commanders.assets[0],fixture={...first,id:'stonewall_rifles',cardIds:['stonewall_rifles'],runtimeDimensions:[768,768]};
  assert.equal(validateReplacementAssets(root,[fixture],{cards:D.CARDS}).valid,true);
  const cases=[
    ['hash',record=>record.runtimeSha256='0'.repeat(64),'Runtime SHA256'],
    ['source hash',record=>record.sourceSha256='0'.repeat(64),'Source SHA256'],
    ['dimensions',record=>record.runtimeDimensions=[768,512],'dimensions mismatch'],
    ['unknown card',record=>record.cardIds=['not_a_card'],'Unknown card'],
    ['crop bounds',record=>record.crop={left:0,top:0,width:9999,height:100},'crop is outside'],
    ['stretch',record=>record.crop={left:0,top:0,width:700,height:350},'aspect ratio'],
    ['upscale',record=>record.crop={left:0,top:0,width:400,height:400},'upscales'],
    ['runtime path',record=>record.runtime='../outside.webp','normalized local']
  ];
  for(const[label,change,expected]of cases){const altered=JSON.parse(JSON.stringify(fixture));change(altered);const result=validateReplacementAssets(root,[altered],{cards:D.CARDS});assert.equal(result.valid,false,label);assert.ok(result.errors.some(error=>error.includes(expected)),label+': '+result.errors.join('; '));}
  assert.equal(validateReplacementAssets(root,[fixture,fixture],{cards:D.CARDS}).valid,false);
  assert.equal(validateReplacementAssets(root,[fixture],{cards:D.CARDS,maxAssetBytes:100}).valid,false);
});

test('Sprint 12 manifest requires explicit authorized C/D replacements with review rationale',()=>{
  const {runtime,runtimeSha256,...sourceRecord}=commanders.assets[0];
  const record={...sourceRecord,src:runtime,sha256:runtimeSha256,width:768,height:768,classificationBefore:'D',classificationAfter:'A',reason:'Replace placeholder with cohesive painted illustration.'};
  const manifest={version:'sprint12-art-v1',cards:{stonewall_rifles:record}};
  assert.equal(validateCardArtManifest(root,manifest,{cards:D.CARDS}).valid,true);
  const strong=JSON.parse(JSON.stringify(manifest));strong.cards.stonewall_rifles.classificationBefore='A';assert.equal(validateCardArtManifest(root,strong,{cards:D.CARDS}).valid,false);
  const missing=JSON.parse(JSON.stringify(manifest));delete missing.cards.stonewall_rifles.reason;assert.equal(validateCardArtManifest(root,missing,{cards:D.CARDS}).valid,false);
  const weak=JSON.parse(JSON.stringify(manifest));weak.cards.stonewall_rifles.classificationAfter='C';assert.equal(validateCardArtManifest(root,weak,{cards:D.CARDS}).valid,false);
});

test('Historical facade preserves the exact complete frozen S11 rendering and current nonreplacements',()=>{
  const frozen=artInContext(path.join(root,'docs/balance/sprint12-v1.0.4-baseline/source/art.js'));
  assert.ok(Object.isFrozen(Art.legacy));assert.equal(Art.forVersion('1.0.4'),Art.legacy);assert.equal(Art.forVersion('1.0.5'),Art);
  for(const card of Object.values(D.CARDS)){
    assert.deepEqual(Art.legacy.get(card),plain(frozen.get(card)),card.id+' historical mapping');assert.equal(Art.legacy.symbol(card),frozen.symbol(card),card.id+' tactical glyph');assert.equal(Art.legacy.illustration(card),frozen.illustration(card),card.id+' historical illustration');
    for(const className of ['card-portrait','arsenal-portrait','collection-portrait']){assert.equal(Art.legacy.html(card,{className}),frozen.html(card,{className}),card.id+' preserved rendering');if(!Object.hasOwn(Art.REFINED_ART,card.id))assert.equal(Art.html(card,{className}),frozen.html(card,{className}),card.id+' unchanged current rendering');}
    if(!Object.hasOwn(Art.REFINED_ART,card.id))assert.deepEqual(Art.get(card),plain(frozen.get(card)),card.id+' unchanged current mapping');
  }
});

test('Original S11 runtime artwork remains byte-for-byte available beside authorized replacements',()=>{
  const checkpoint=JSON.parse(fs.readFileSync(path.join(root,'docs/balance/sprint12-v1.0.4-baseline/checkpoint-hashes.json'),'utf8'));
  const assets=Object.entries(checkpoint.sourceHashes).filter(([file])=>file.startsWith('assets/cards/'));
  assert.ok(assets.length>=55,'Frozen archive covers the forty Tactical assets, atlases and Commander portraits');
  for(const[file,expected]of assets)assert.equal(sha256(fs.readFileSync(localAsset(root,file,'assets/cards/'))),expected,file+' original preserved');
});

test('Current raster facade uses only the explicit trusted registry, safe focal crop and named accessible art',()=>{
  const registry={VERSION:'frontlines-refined-art-012-v1',CARDS:{stonewall_rifles:{src:commanders.assets[0].runtime,width:768,height:768,position:'42% 50%',alt:'Stonewall Rifles — reviewed painted infantry'},bruiser_frag_out:{src:commanders.assets[0].runtime,width:768,height:768,position:'50% 50%',alt:'Frag Out — reviewed painted grenade action'}}};
  const current=artInContext(path.join(root,'art.js'),registry);
  for(const id of Object.keys(registry.CARDS)){
    const card={...D.CARDS[id],artSrc:'https://untrusted.test/changed.webp'},before=JSON.stringify(card),asset=current.get(card),html=current.html(card,{className:'card-portrait onload="alert(1)"'});
    assert.equal(asset.src,registry.CARDS[id].src);assert.equal(asset.refined,true);assert.deepEqual([asset.width,asset.height],[768,768]);assert.ok(asset.alt.includes(card.name));assert.match(html,/art-refined/);assert.match(html,/role="img" aria-label=/);assert.match(html,/background-size:cover;background-position:/);assert.doesNotMatch(html,/onload=|untrusted\.test|<svg/);assert.equal(JSON.stringify(card),before);if(id==='bruiser_frag_out')assert.match(html,/art-tactical/);
  }
  const notMapped={...D.CARDS.stonewall_heavy,artSrc:registry.CARDS.stonewall_rifles.src};assert.deepEqual(plain(current.get(notMapped)),Art.legacy.get(notMapped));assert.equal(current.html(null),'');
  const unsafe=artInContext(path.join(root,'art.js'),{VERSION:registry.VERSION,CARDS:{stonewall_rifles:{...registry.CARDS.stonewall_rifles,src:'https://untrusted.test/art.webp'}}});assert.throws(()=>unsafe.get(D.CARDS.stonewall_rifles),/Invalid reviewed artwork record/);
});

test('Every card-facing entry point loads the reviewed registry immediately before the art renderer',()=>{
  for(const file of ['index.html','collection.html','deck-builder.html','simulator.html','tactical-training.html']){const html=fs.readFileSync(path.join(root,file),'utf8'),scripts=[...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(match=>match[1]),index=scripts.indexOf('art.js');assert.ok(index>0,file+' renderer loaded');assert.equal(scripts[index-1],'art-map012.js',file+' explicit registry before renderer');}
});

test('Actual91 reviewed raster mappings match the source plan, manifest, hashes, crop and optimization budgets',t=>{
  const plan=JSON.parse(fs.readFileSync(path.join(root,'assets/source/card-art-012/jobs-plan.json'),'utf8'));
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/source/card-art-012/manifest.json'),'utf8'));
  const checkpoint=JSON.parse(fs.readFileSync(path.join(root,'docs/balance/sprint12-v1.0.4-baseline/checkpoint-hashes.json'),'utf8'));
  assert.equal(plan.expectedCardCount,91);assert.equal(plan.jobs.length,23);assert.equal(Object.keys(manifest.cards).length,91);assert.equal(Object.keys(Art.REFINED_ART).length,91);
  const expected={};
  for(const job of plan.jobs)for(const cell of job.cells)for(const id of cell.cardIds)expected[id]={...cell,source:job.source,atlas:job.name,grid:job.grid??2};
  for(const reuse of plan.reuse)for(const id of reuse.cardIds)expected[id]={...reuse};
  assert.deepEqual(Object.keys(manifest.cards).sort(),Object.keys(expected).sort());assert.deepEqual(Object.keys(Art.REFINED_ART).sort(),Object.keys(expected).sort());
  const result=validateCardArtManifest(root,manifest,{cards:D.CARDS,preservedSourceHashes:checkpoint.sourceHashes});assert.equal(result.valid,true,result.errors.join('\n'));
  for(const[id,record]of Object.entries(manifest.cards)){
    const planned=expected[id],asset=Art.get(D.CARDS[id]),html=Art.html(D.CARDS[id]);assert.ok(Object.isFrozen(Art.REFINED_ART[id]),id+' trusted mapping frozen');assert.deepEqual(Art.REFINED_ART[id],record,id+' complete manifest provenance');
    assert.equal(record.source,planned.source,id+' planned source');assert.equal(record.reason,planned.reason,id+' intentional replacement rationale');assert.equal(record.classificationBefore,planned.classificationBefore,id+' reviewed original tier');assert.equal(record.position,planned.position,id+' planned focal crop');
    if(planned.crop)assert.deepEqual(record.crop,planned.crop,id+' exact preserved source crop');
    else{const width=Math.floor(record.sourceDimensions[0]/planned.grid),height=Math.floor(record.sourceDimensions[1]/planned.grid);assert.deepEqual(record.crop,{left:(planned.cell%planned.grid)*width,top:Math.floor(planned.cell/planned.grid)*height,width,height},id+' exact source quadrant');}
    assert.equal(asset.src,record.src,id+' current asset');assert.deepEqual([asset.width,asset.height],[512,512]);assert.equal(asset.position,record.position);assert.equal(asset.refined,true);assert.ok(asset.alt.includes(D.CARDS[id].name));assert.ok(html.includes(record.src));assert.match(html,/art-refined/);assert.match(html,/background-size:cover;background-position:/);assert.doesNotMatch(html,/art-symbol|<svg/);
    if(Object.hasOwn(Art.TACTICAL_ART,id))assert.match(html,/art-tactical/);
    assert.equal(Art.get({...D.CARDS[id],artSrc:'https://untrusted.test/not-approved.webp'}).src,record.src,id+' imported paths never override registry');
  }
  assert.ok(Object.keys(Art.TACTICAL_ART).every(id=>Object.hasOwn(manifest.cards,id)),'All forty Tactical SVG illustrations have current raster replacements');
  assert.ok(Object.values(D.CARDS).filter(card=>['order','asset'].includes(card.type)&&!Object.hasOwn(Art.TACTICAL_ART,card.id)).every(card=>Object.hasOwn(manifest.cards,card.id)),'All39 legacy symbol-only Orders/Assets have current painted scenes');
  t.diagnostic('91 optimized runtime files: '+result.totalBytes.toLocaleString('en-US')+' bytes; preserved source crops retain actual512px or better detail. Pixel quality remains separately reviewed on real rendering surfaces.');
});
