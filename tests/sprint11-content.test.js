'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const T=require('../tactical-arsenal'),B=require('../balance'),Decks=require('../decks'),Art=require('../art').forVersion('1.0.4');
const root=path.resolve(__dirname,'..');
test('Tactical Arsenal is exactly forty unique playable alternatives, eight per faction',()=>{
  const old=B.dataFor('sprint10'),list=Object.values(T.CARD_ADDITIONS);
  assert.equal(list.length,40);assert.ok(Object.isFrozen(T.CARD_ADDITIONS));
  for(const faction of Object.keys(old.FACTIONS)){
    const cards=list.filter(c=>c.faction===faction);assert.equal(cards.length,8);
    assert.ok(cards.some(c=>c.type==='unit'));assert.ok(cards.some(c=>c.type==='order'));
    assert.deepEqual(cards.reduce((out,c)=>(out[c.rarity]=(out[c.rarity]||0)+1,out),{}),{common:3,uncommon:2,rare:2,legendary:1});
  }
  for(const c of list){assert.equal(old.CARDS[c.id],undefined,c.id);assert.ok(c.rulesText.length>55);assert.ok(c.designIntent.length>45);assert.equal(c.set,'tactical-011');assert.ok(c.presence>0);assert.ok([0,1].includes(c.commandCost));assert.ok(c.tags.length>0);}
});
test('all five showcase lists are legal and combine the complete faction package with old roles',()=>{
  assert.equal(T.PRESETS.length,5);const D=B.dataFor('sprint10');D.CARDS={...D.CARDS,...T.CARD_ADDITIONS};const L=Decks.forData(D);
  for(const d of T.PRESETS){
    const deck={...d,commanderId:require('../commanders').defaultFor(d.faction)};
    assert.equal(d.cards.length,26,d.id);assert.equal(L.validate(deck).legal,true,L.validate(deck).errors.join(' '));assert.equal(d.deckGroup,'tactical-showcase');
    const newIds=d.cards.filter(id=>T.CARD_ADDITIONS[id]);assert.equal(new Set(newIds).size,8);assert.ok(d.cards.some(id=>!T.CARD_ADDITIONS[id]));
  }
});
test('forty expansion illustrations resolve explicitly and uniformly without remapping legacy cards',()=>{
  assert.equal(Object.keys(Art.TACTICAL_ART).length,40);
  let bytes=0;
  for(const c of Object.values(T.CARD_ADDITIONS)){
    const a=Art.get(c);assert.equal(a.src,c.artSrc);assert.equal(a.faction,c.faction);assert.equal(a.tactical,true);
    const svg=fs.readFileSync(path.join(root,a.src),'utf8');bytes+=Buffer.byteLength(svg);
    assert.match(svg,/viewBox="0 0 400 400"/);assert.match(svg,/preserveAspectRatio="xMidYMid slice"/);assert.match(svg,/<title>/);
    assert.doesNotMatch(svg,/<image|<script|(?:href|xlink:href)=["']https?:|foreignObject/);
    const html=Art.html(c);assert.ok(html.includes(a.src));assert.match(html,/background-size:cover;background-position:center/);
  }
  assert.ok(bytes<150000,'Forty SVGs stay below 150 KB total');
  assert.equal(Art.get({...B.dataFor('sprint10').CARDS.stonewall_rifles,artSrc:'unexpected.svg'}).src,'assets/cards/stonewall/starter-atlas.webp');
});
test('expanded nested tactical schema rejects malformed costs, targets, hooks and unbounded Blast',()=>{
  const Arsenal=require('../arsenal'),base=B.dataFor('sprint11'),targets={cover:'friendly',dodge:'friendly',suppression:'enemy',exposed:'enemy',smoke:'territory',blast:'territory',breach:'enemy',interlockingFire:'territory',holdFast:'territory',assault:'friendly',breakPosition:'territory',contingency:'territory',cleanExit:'friendly',salvageBlast:'friendly',sacrificeRepair:'friendly',badPlan:'friendly'};
  const schema={traits:[...Arsenal.SCHEMA.traits,'breach'],effects:{...Arsenal.SCHEMA.effects,...Object.fromEntries(Object.entries(targets).map(([id,target])=>[id,{target,timings:['action'],minimum:1}]))},adaptKinds:[...Arsenal.SCHEMA.adaptKinds,'cover','dodge','suppression','exposed']};
  const check=data=>Arsenal.validateCardPool(data,{schema,presets:Decks.forData(data).presets()});assert.equal(check(base).valid,true);
  const cases=[
    ['ability scope',d=>{d.CARDS.stonewall_trench_engineer.tactical.ability.targetScope='anywhere';}],
    ['ability action cost',d=>{d.CARDS.stonewall_trench_engineer.tactical.ability.cost.commandActions=0;}],
    ['ability finite Capacity',d=>{d.CARDS.stonewall_trench_engineer.tactical.ability.cost.presence=Infinity;}],
    ['ability negative cost',d=>{d.CARDS.stonewall_trench_engineer.tactical.ability.cost.presence=-1;}],
    ['ability target owner',d=>{d.CARDS.stonewall_trench_engineer.tactical.ability.target='enemy';}],
    ['ability unknown effect',d=>{d.CARDS.stonewall_trench_engineer.tactical.ability.effect.kind='unknown';}],
    ['ability missing payload',d=>{d.CARDS.stonewall_trench_engineer.tactical.ability=null;}],
    ['permanent unknown hook',d=>{d.CARDS.stonewall_trench_engineer.tactical.onAttack=[];}],
    ['automatic hook list',d=>{d.CARDS.stonewall_hardpoint.tactical.onStart={kind:'cover'};}],
    ['automatic zero charge',d=>{d.CARDS.nightwalker_ghost_operative.tactical.onDeploy[0].amount=0;}],
    ['automatic invalid target',d=>{d.CARDS.nightwalker_ghost_operative.tactical.onDeploy[0].target='enemyHere';}],
    ['automatic trap nonconsumption',d=>{d.CARDS.rogue_improvised_mine.tactical.onDeploy[0].consumeSelf=false;}],
    ['Overwatch finite damage',d=>{d.CARDS.stonewall_bastion_gunner.tactical.overwatch.damage=NaN;}],
    ['Overwatch paid action',d=>{d.CARDS.stonewall_bastion_gunner.tactical.overwatch.commandActions=0;}],
    ['unprinted Asset bonus',d=>{d.CARDS.stonewall_trench_engineer.tactical.breachAssetBonus=2;}],
    ['negative preparation bonus',d=>{d.CARDS.syndicate_contract_marksman.tactical.preparedBonus=-2;}],
    ['Blast target cap',d=>{d.CARDS.bruiser_frag_out.effect.maxTargets=3;}],
    ['Blast target cap fractional',d=>{d.CARDS.bruiser_frag_out.effect.maxTargets=1.5;}],
    ['invalid exact boolean',d=>{d.CARDS.nightwalker_expose_the_opening.effect.requiresVulnerable='yes';}],
    ['Adapt mode invalid amount',d=>{d.CARDS.rogue_make_it_work.effect.modes[2].amount=-1;}]
  ];
  for(const[label,mutate]of cases){const data=JSON.parse(JSON.stringify(base));mutate(data);const result=check(data);assert.equal(result.valid,false,label+' must be rejected');assert.ok(result.errors.length,label);}
});
