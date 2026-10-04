'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Arsenal=require('../arsenal.js'),B=require('../balance.js'),Decks=require('../decks.js'),Art=require('../art.js');
const clone=value=>JSON.parse(JSON.stringify(value));
const pool=()=>B.dataFor('sprint7');

test('35 structured additions preserve seven faction choices, local art and exact archetypes',()=>{
  const cards=Object.values(Arsenal.CARD_ADDITIONS);assert.equal(cards.length,35);
  const names=new Set(),ids=new Set();
  for(const [faction,expected]of Object.entries({stonewall:['bastion','counteroffensive'],bruiser:['shock-assault','heavy-breakthrough'],syndicate:['combined-arms','precision-operations'],nightwalker:['sabotage','assassination'],rogue:['scavenger','wildcard']})){
    const group=cards.filter(c=>c.faction===faction);assert.equal(group.length,7);
    assert.deepEqual(new Set(group.flatMap(c=>c.archetypes)),new Set(expected));
    assert.ok(group.some(c=>c.archetypes.length===2),'Each faction can bridge its archetypes');
    for(const c of group){assert.ok(!names.has(c.name));names.add(c.name);assert.ok(!ids.has(c.id));ids.add(c.id);
      assert.equal(c.set,'arsenal-007');assert.ok(c.role&&c.designIntent&&c.rulesText&&c.ai.role);assert.ok(c.tags.length);
      assert.ok([0,1].includes(c.commandCost));assert.ok(Arsenal.SCHEMA.artRoles.includes(c.artRole));
      assert.equal(Art.get(c).faction,faction);assert.equal(Art.get(c).role,c.artRole);
      assert.ok(fs.existsSync(path.join(__dirname,'..',Art.get(c).src)),c.id);
      assert.ok(c.rulesText.includes(c.commandCost?'Costs 1 Command Action':'no Command Action'));
    }
  }
});

test('historical eighty cards and existing templates remain available, expansion is Sprint7-only',()=>{
  const old=B.dataFor('sprint6'),current=pool();assert.equal(Object.keys(old.CARDS).length,80);assert.equal(Object.keys(current.CARDS).length,115);
  assert.deepEqual(current.DECKS,old.DECKS);
  for(const [id,c]of Object.entries(old.CARDS)){
    const now=current.CARDS[id];assert.ok(now,id);
    for(const key of ['id','name','faction','type','presence','attack','health','traits','effect','unique'])assert.deepEqual(now[key],c[key],id+' '+key);
    if(id==='nightwalker_silencer'){assert.equal(c.commandCost,0);assert.equal(now.commandCost,1);}
    else assert.equal(now.commandCost,c.commandCost,id);
  }
  for(const id of Object.keys(Arsenal.CARD_ADDITIONS)){assert.ok(current.CARDS[id]);assert.equal(old.CARDS[id],undefined);}
  assert.deepEqual(Decks.forData(old).presets().map(d=>d.id),Decks.forData(current).presets().map(d=>d.id).filter(id=>!Arsenal.PRESETS.some(p=>p.id===id)));
});

test('Breakthrough Gunner trades higher commitment and direct-damage vulnerability for Rush and Armor',()=>{
  const runtime=B.createRuntime('sprint7'),data=runtime.data,E=runtime.engine,gunner=data.CARDS.bruiser_breakthrough_gunner,siege=data.CARDS.bruiser_heavy;
  assert.equal(gunner.attack,siege.attack);assert.equal(gunner.commandCost,siege.commandCost);
  assert.ok(gunner.presence>siege.presence);assert.ok(gunner.health<siege.health);
  assert.ok(gunner.traits.includes('rush')&&gunner.traits.includes('armor'));
  for(const card of [gunner,siege]){
    const source=clone(Decks.forData(data).starters().find(d=>d.faction==='bruiser'));
    if(!source.cards.includes(card.id))source.cards[0]=card.id;
    const enemyDeck=Decks.forData(data).starters().find(d=>d.faction==='nightwalker');
    let state=E.createGame({factions:['bruiser','nightwalker'],decks:[source,enemyDeck],seed:800072,config:{startingCommand:80,commandCap:80,startingHand:26}});
    function field(seat,id){const index=state.players[seat].hand.findIndex(h=>h.cardId===id),item=state.players[seat].hand.splice(index,1)[0];assert.ok(item,id);const u={...item,owner:seat,territory:3,damage:0,ready:true,deployedTurn:0,movedTurn:-1};state.units.push(u);return u;}
    const attacker=field(0,card.id),asset=field(1,'nightwalker_beacon'),ambush=state.players[1].hand.find(h=>h.cardId==='nightwalker_ambush');
    for(const action of [{type:'attack',unitUid:attacker.uid,targetUid:asset.uid},{type:'respond',handUid:ambush.uid},{type:'counter',pass:true}]){
      const result=E.dispatch(state,action,{events:true});assert.equal(result.ok,true,result.error);state=result.state;
    }
    const survivor=state.units.find(u=>u.uid===attacker.uid);
    if(card.id===gunner.id)assert.equal(survivor,undefined,'The existing 4-damage Ambush bypasses Armor and destroys the Gunner before its shot');
    else {assert.ok(survivor,'Siege Heavy survives the same direct hit and an asset’s zero-damage return fire');assert.equal(survivor.damage,4);}
  }
});

test('all built-in starters, ten archetypes and five optional hybrid decks obey canonical 26-card rules',()=>{
  const data=pool(),library=Decks.forData(data);
  assert.equal(Arsenal.PRESETS.length,5);assert.equal(new Set(Arsenal.PRESETS.map(d=>d.faction)).size,5);
  assert.deepEqual(Arsenal.SCHEMA.deckRules,{size:library.RULES.size,maxCopies:library.RULES.maxCopies,maxLeaderCopies:library.RULES.maxLeaders});
  assert.equal(Object.keys(Arsenal.ARCHETYPE_PARENTS).length,5);
  for(const deck of Arsenal.PRESETS)assert.equal(Arsenal.ARCHETYPE_PARENTS[deck.archetype].length,2);
  assert.equal(library.presets().length,15);
  for(const deck of library.starters().concat(library.presets())){const result=library.validate(deck);assert.equal(result.legal,true,deck.id+': '+result.errors.join(' '));}
  for(const deck of Arsenal.PRESETS){assert.equal(deck.cards.length,26);assert.ok(deck.cards.some(id=>data.CARDS[id].set==='arsenal-007'));assert.ok(deck.cards.some(id=>data.CARDS[id].set!=='arsenal-007'));}
  const result=Arsenal.validateCardPool(data,{presets:library.presets()});assert.equal(result.valid,true,result.errors.join('\n'));
  assert.equal(result.cards,115);assert.deepEqual(result.factions,{stonewall:23,bruiser:23,syndicate:23,nightwalker:23,rogue:23});
});

test('schema rejects identity, faction, economy, mechanics, mode and art defects without throwing',()=>{
  const cases=[
    ['missing ID',p=>delete p.CARDS.stonewall_reserve_watch.id,/ID/],
    ['unknown faction',p=>p.CARDS.stonewall_reserve_watch.faction='sixth-faction',/faction/],
    ['negative Presence',p=>p.CARDS.stonewall_reserve_watch.presence=-1,/Presence/],
    ['fractional Health',p=>p.CARDS.stonewall_reserve_watch.health=2.5,/Health/],
    ['invalid command cost',p=>p.CARDS.stonewall_reserve_watch.commandCost=100,/Command Action/],
    ['unreachable Capacity cost',p=>p.CARDS.stonewall_reserve_watch.presence=81,/maximum Capacity/],
    ['unknown trait',p=>p.CARDS.stonewall_reserve_watch.traits=['unimplemented'],/keyword/],
    ['duplicate trait',p=>p.CARDS.stonewall_reserve_watch.traits=['armor','armor'],/keyword/],
    ['missing traits array',p=>p.CARDS.stonewall_reserve_watch.traits=1,/keyword/],
    ['unknown effect',p=>p.CARDS.rogue_field_options.effect.kind='unimplemented',/effect/],
    ['wrong effect timing',p=>p.CARDS.nightwalker_false_route.timing='response',/timing/],
    ['zero Mark',p=>p.CARDS.syndicate_target_designator.effect.amount=0,/Mark|effect amount/],
    ['missing modes',p=>delete p.CARDS.rogue_field_options.effect.modes,/modes/],
    ['bad mode',p=>p.CARDS.rogue_field_options.effect.modes[0]=null,/mode/],
    ['duplicate mode',p=>p.CARDS.rogue_field_options.effect.modes[1].id='repair',/mode ID/],
    ['nested mode',p=>p.CARDS.rogue_field_options.effect.modes[0].kind='adapt',/mode effect/],
    ['wrong mode amount',p=>p.CARDS.rogue_field_options.effect.modes[0].amount=-1,/effect amount/],
    ['free Adapt',p=>p.CARDS.rogue_field_options.commandCost=0,/share 1 Command/],
    ['missing intent',p=>delete p.CARDS.stonewall_reserve_watch.designIntent,/metadata/],
    ['missing AI',p=>delete p.CARDS.stonewall_reserve_watch.ai,/AI/],
    ['wrong targeting',p=>p.CARDS.syndicate_target_designator.targeting.owner='friendly',/Targeting/],
    ['wrong target requirement',p=>p.CARDS.syndicate_target_designator.targeting.required=false,/Targeting/],
    ['wrong mode target',p=>p.CARDS.rogue_field_options.targeting.modes.repair.owner='enemy',/Targeting/],
    ['unknown art role',p=>p.CARDS.stonewall_reserve_watch.artRole='missing-atlas-crop',/artwork role/]
  ];
  for(const [label,change,match]of cases){const p=clone(pool());change(p);let result;assert.doesNotThrow(()=>result=Arsenal.validateCardPool(p),label);assert.equal(result.valid,false,label);assert.match(result.errors.join('\n'),match,label);}
  for(const raw of [null,{},42,{CARDS:[null,1,{}],FACTIONS:{}}])assert.doesNotThrow(()=>assert.equal(Arsenal.validateCardPool(raw).valid,false));
  const duplicate=pool();duplicate.CARDS=Object.values(duplicate.CARDS).concat([duplicate.CARDS.stonewall_reserve_watch]);assert.match(Arsenal.validateCardPool(duplicate).errors.join('\n'),/Duplicate ID/);
});

test('schema checks missing runtime artwork and invalid starter or preset decks',()=>{
  const data=pool();assert.match(Arsenal.validateCardPool(data,{assetExists:()=>false}).errors.join('\n'),/Missing artwork/);
  const p=clone(data);p.DECKS.stonewall.pop();assert.match(Arsenal.validateCardPool(p).errors.join('\n'),/26 cards/);
  const illegal=clone(Arsenal.PRESETS[0]);illegal.cards[0]='rogue_patchguard';assert.match(Arsenal.validateCardPool(data,{presets:[illegal]}).errors.join('\n'),/Cross-faction/);
  illegal.cards=Array(26).fill('stonewall_reserve_watch');assert.match(Arsenal.validateCardPool(data,{presets:[illegal]}).errors.join('\n'),/Copy limit/);
  assert.match(Arsenal.validateCardPool(data,{presets:[Arsenal.PRESETS[0],Arsenal.PRESETS[0]]}).errors.join('\n'),/duplicate built-in deck ID/);
});

test('schema supports declared future traits without weakening unknown-effect or mode validation',()=>{
  const data=clone(pool());data.CARDS.stonewall_reserve_watch.traits.push('future-training-trait');
  assert.equal(Arsenal.validateCardPool(data).valid,false);
  const result=Arsenal.validateCardPool(data,{schema:{traits:Arsenal.SCHEMA.traits.concat(['future-training-trait'])}});assert.equal(result.valid,true,result.errors.join('\n'));
});

test('legacy metadata normalization is deterministic and leaves original mechanics untouched',()=>{
  const old=require('../data.js'),before=JSON.stringify(old);
  for(const c of Object.values(old.CARDS)){const a=Arsenal.metadataFor(c),b=Arsenal.metadataFor(c);assert.deepEqual(a,b);assert.ok(a.role&&a.designIntent&&a.ai.role);assert.ok(a.tags.length&&a.archetypes.length);assert.ok(!Object.hasOwn(a,'attack')&&!Object.hasOwn(a,'presence'));a.tags.push('caller-only');assert.ok(!Arsenal.metadataFor(c).tags.includes('caller-only'));}
  assert.equal(JSON.stringify(old),before);
});

test('UMD browser content equals Node definitions and nested shared templates remain immutable',()=>{
  const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','deck-rules.js'),'utf8'),context);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','arsenal.js'),'utf8'),context);
  assert.equal(context.FactionArsenal.VERSION,Arsenal.VERSION);
  assert.equal(JSON.stringify(context.FactionArsenal.CARD_ADDITIONS),JSON.stringify(Arsenal.CARD_ADDITIONS));
  assert.equal(JSON.stringify(context.FactionArsenal.PRESETS),JSON.stringify(Arsenal.PRESETS));
  assert.ok(Object.isFrozen(Arsenal.CARD_ADDITIONS));assert.ok(Object.isFrozen(Arsenal.CARD_ADDITIONS.rogue_field_options.effect.modes));
  assert.throws(()=>Arsenal.CARD_ADDITIONS.rogue_field_options.effect.modes.push({}),TypeError);
  assert.throws(()=>Arsenal.PRESETS[0].cards.push('rogue_patchguard'),TypeError);
  assert.equal(JSON.parse(JSON.stringify(Arsenal.CARD_ADDITIONS.rogue_field_options)).effect.modes.length,3);
});

test('every expanded card and every Adapt mode plays through authoritative rules with exact costs and legal fair AI followups',()=>{
  const runtime=B.createRuntime('sprint7'),D=runtime.data,E=runtime.engine,A=runtime.ai,library=Decks.forData(D);
  function fixture(card){
    const source=clone(Arsenal.PRESETS.find(p=>p.faction===card.faction));source.id='fixture-'+card.id;
    if(!source.cards.includes(card.id))source.cards[0]=card.id;
    assert.equal(library.validate(source).legal,true,card.id);
    const enemy=card.faction==='bruiser'?'stonewall':'bruiser';
    const enemyDeck=library.starters().find(p=>p.faction===enemy);
    const state=E.createGame({factions:[card.faction,enemy],decks:[source,enemyDeck],seed:800071,config:{startingCommand:80,commandCap:80,startingHand:26}});
    const h=state.players[0].hand.find(item=>item.cardId===card.id);
    function field(seat){const index=state.players[seat].hand.findIndex(item=>item.uid!==h.uid&&D.CARDS[item.cardId].type==='unit');const item=state.players[seat].hand.splice(index,1)[0];
      const unit={...item,owner:seat,territory:3,damage:seat===0?1:0,ready:seat!==0,deployedTurn:0,movedTurn:-1};state.units.push(unit);return unit;}
    return {state,h,ally:field(0),enemy:field(1)};
  }
  for(const card of Object.values(Arsenal.CARD_ADDITIONS)){
    const modes=card.effect?.kind==='adapt'?card.effect.modes:[null];
    for(const mode of modes){
      const {state,h,ally,enemy}=fixture(card),kind=mode?.kind||card.effect?.kind;
      const action=card.type!=='order'?{type:'deploy',handUid:h.uid,territory:2}:{type:'order',handUid:h.uid,...(mode?{mode:mode.id}:{})};
      if(['heal','reinforce','rally','reclaim'].includes(kind))action.targetUid=ally.uid;
      else if(['mark','damage','sabotage'].includes(kind))action.targetUid=enemy.uid;
      if(!card.commandCost)state.actionsLeft=0;
      const before=JSON.stringify(state),presence=E.presence(state,0),commands=state.actionsLeft;
      assert.equal(E.validate(state,action),null,card.id+' '+(mode?.id||''));
      const result=E.dispatch(state,action,{events:true});assert.equal(result.ok,true,card.id+': '+result.error);
      assert.equal(JSON.stringify(state),before,'Card actions must not mutate the input');E.assertInvariants(result.state);
      assert.equal(result.state.actionsLeft,commands-card.commandCost,card.id);
      const after=E.presence(result.state,0);
      assert.equal(after.available,presence.available-card.presence,card.id);
      if(card.type!=='order')assert.ok(result.state.units.some(u=>u.uid===h.uid));
      else assert.ok(result.events.some(e=>e.type==='order'&&e.cardId===card.id));
      for(const difficulty of ['easy','normal','hard','expert','learning']){
        const action=A.chooseAction(result.state,{profile:'deck',difficulty});assert.ok(action,card.id+' '+difficulty);assert.equal(E.validate(result.state,action),null,card.id+' '+difficulty);
      }
    }
  }
});
