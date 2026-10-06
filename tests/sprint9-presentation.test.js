'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Art=require('../art').forVersion('1.0.4'),P=require('../presentation'),FX=require('../effects'),Data=require('../balance').dataFor('sprint7');

function webpDimensions(bytes){
  assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
  for(let offset=12;offset+8<=bytes.length;){
    const kind=bytes.toString('ascii',offset,offset+4),length=bytes.readUInt32LE(offset+4),payload=offset+8;
    assert.ok(payload+length<=bytes.length,'Truncated WebP');
    if(kind==='VP8X')return [bytes.readUIntLE(payload+4,3)+1,bytes.readUIntLE(payload+7,3)+1];
    if(kind==='VP8 '){assert.equal(bytes.subarray(payload+3,payload+6).toString('hex'),'9d012a');return [bytes.readUInt16LE(payload+6)&0x3fff,bytes.readUInt16LE(payload+8)&0x3fff];}
    if(kind==='VP8L'){assert.equal(bytes[payload],0x2f);const bits=bytes.readUInt32LE(payload+1);return [(bits&0x3fff)+1,((bits>>>14)&0x3fff)+1];}
    offset=payload+length+(length%2);
  }
  assert.fail('No supported WebP frame');
}
test('all ten launch Commanders have unique optimized painted portraits with named accessible artwork',()=>{
  const ids=Object.keys(Art.COMMANDER_ART),portraits=new Set();assert.equal(ids.length,10);
  for(const faction of Object.keys(Art.THEMES))assert.equal(ids.filter(id=>id.startsWith('commander_'+faction+'_')).length,2);
  let bytes=0;
  for(const id of ids){
    const c=Art.COMMANDER_ART[id],asset=Art.commanderGet(id),portrait=fs.readFileSync(path.join(__dirname,'..',asset.src));
    assert.equal(asset.src,'assets/cards/commanders/'+id+'-portrait-v2.webp');assert.deepEqual(webpDimensions(portrait),[asset.width,asset.height]);assert.equal(asset.width,768);assert.equal(asset.height,768);assert.ok(Object.isFrozen(c));
    assert.ok(portrait.length<200000,id+' portrait exceeds 200KB');bytes+=portrait.length;portraits.add(crypto.createHash('sha256').update(portrait).digest('hex'));
    assert.ok(fs.existsSync(path.join(__dirname,'../assets/source/commanders',id+'-portrait-v2.png')),'Preserved source art missing: '+id);
    assert.match(Art.commanderHtml({id,name:c.name,faction:c.faction}),/art-commander/);assert.match(asset.alt,/strategic Commander portrait/);
  }
  assert.equal(portraits.size,10);assert.ok(bytes<1600000,'Commander set exceeds 1.6MB');assert.equal(Art.commanderGet('not-a-commander'),null);assert.equal(Art.commanderHtml({id:'<script>'}),'');
});

test('ordinary cards retain original faction atlas portraits without procedural SVG overlays',()=>{
  const representative={stonewall_medic:'medic',stonewall_defender:'shield',stonewall_heavy:'heavy',nightwalker_marksman:'marksman',syndicate_courier:'scout',rogue_scrap_hauler:'engineer',stonewall_commander:'officer',nightwalker_blade:'blade',bruiser_brawler:'brawler'};
  for(const [id,identity]of Object.entries(representative)){const card=Data.CARDS[id];assert.ok(card,id);assert.equal(Art.identity(card),identity,id);assert.match(Art.html(card),/starter-atlas\.webp/);assert.doesNotMatch(Art.html(card),/art-identity|art-illustrated|<svg/);}
  for(const faction of Object.keys(Art.THEMES)){
    const units=Object.values(Data.CARDS).filter(c=>c.faction===faction&&['unit','leader'].includes(c.type));
    const roles=new Set(units.map(Art.identity)),pictures=new Set(units.map(Art.illustration));
    assert.ok(roles.size>=4,faction+' should have readable visual jobs');assert.ok(pictures.size>=units.length*.7,faction+' should have varied equipment, stance and backdrop');
  }
});

test('unit illustration and Commander rendering never mutate definitions or inject unsafe labels',()=>{
  const card=Object.freeze({id:'custom_unsafe',name:'A <script> "portrait"',faction:'stonewall',type:'unit',traits:Object.freeze(['medic'])});
  const prior=JSON.stringify(card),html=Art.html(card,{className:'arsenal-portrait onload="alert(1)"'});assert.equal(JSON.stringify(card),prior);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script|onload=/);assert.match(html,/arsenal-portrait/);
  assert.doesNotMatch(Art.commanderHtml('commander_stonewall_warden',{className:'commander-portrait style="x"'}),/style="x"/);
});

test('deployment has explicit anticipation, forward emphasis, landing and settle with bounded human-visible timing',()=>{
  for(const profile of Object.values(P.PROFILES)){assert.ok(profile.deployment>=700&&profile.deployment<=1100);assert.ok(profile.particleLimit<=10);}
  const frames=P.deploymentFrames(80,-200,.35);assert.deepEqual(frames.map(f=>f.offset),[0,.18,.42,.72,.84,1]);assert.match(frames[2].transform,/scale\(1\.2\)/);assert.match(frames[3].transform,/translate\(80px,-200px\)/);assert.equal(frames.at(-1).opacity,0);
  for(const rarity of Object.keys(P.PROFILES)){
    const card={rarity,faction:'stonewall'},normal=P.limits(card,{presentation:'full'}),fast=P.limits(card,{animationSpeed:'fast'}),minimal=P.limits(card,{presentation:'minimal'});
    assert.ok(normal.duration>=700);assert.ok(fast.duration<normal.duration);assert.ok(minimal.duration<=120);assert.equal(minimal.particles,0);assert.equal(P.limits(card,{presentation:'full'},true).duration<=120,true);
  }
});

test('heavy and precision strikes have distinct windup, burst count, delivery and motion weight',()=>{
  const heavy=P.attackPlan({rarity:'rare',faction:'bruiser'},'heavy'),precision=P.attackPlan({rarity:'rare',faction:'nightwalker'},'specialist'),rifle=P.attackPlan({rarity:'common',faction:'stonewall'},'rifleman');
  assert.ok(heavy.windup>rifle.windup);assert.ok(heavy.lunge>precision.lunge);assert.ok(heavy.duration>precision.duration);assert.equal(precision.shots,1);assert.equal(rifle.shots,3);assert.notEqual(heavy.motif,precision.motif);
  for(const plan of [heavy,precision,rifle])assert.ok(plan.windup+plan.delivery<plan.duration);
});

test('Commander activation has one public event from authoritative engine events and never appears as a lane deploy',()=>{
  const state={players:[{faction:'stonewall',command:20,spent:0,hand:[]},{faction:'bruiser',command:20,spent:0,hand:[]}],units:[],territories:[{id:0,owner:0}],attacker:0,response:null,turn:1,winner:null,contested:0};
  const prior=JSON.stringify(state),event={type:'commanderActivated',player:0,commanderId:'commander_stonewall_warden',targetUid:'public-unit',territory:0,ability:'Citadel Order'};
  const events=FX.deriveEvents(state,state,{type:'commander'},[event]);assert.equal(events.length,1);assert.equal(events[0].type,'commander');assert.equal(events[0].commanderId,event.commanderId);assert.equal(JSON.stringify(state),prior);assert.equal(events.some(e=>e.type==='deploy'),false);
  assert.equal(typeof FX.commanderIntro,'function');assert.equal(typeof FX.commanderActivate,'function');assert.doesNotThrow(()=>FX.commanderIntro({id:'commander_stonewall_warden'}));
});

test('premium frame ornament remains in art windows and name/rules/stat panels remain separate',()=>{
  const css=fs.readFileSync(require.resolve('../presentation.css'),'utf8');
  assert.match(css,/v1\.0 material frames/);assert.match(css,/\.rarity-legendary :is\(\.card-art,\.arsenal-art,\.collection-art,\.pack-card-art\):before/);assert.doesNotMatch(css,/\.card-rules:(?:before|after)/);assert.doesNotMatch(css,/\.art-identity\{/);
  for(const id of Object.keys(Art.COMMANDER_ART)){const skin=P.commanderSkin({id,faction:Art.COMMANDER_ART[id].faction});assert.equal(skin.rarity,'legendary');assert.match(skin.className,/faction-/);}
});
