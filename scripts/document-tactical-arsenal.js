'use strict';
const fs=require('node:fs'),path=require('node:path'),T=require('../tactical-arsenal'),B=require('../docs/balance/sprint11-v1.0.3-baseline/source/balance');
const root=path.resolve(__dirname,'..'),D=B.dataFor('sprint10'),cards={...D.CARDS,...T.CARD_ADDITIONS};
const title=s=>String(s).replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
const lines=[
  '# Tactical Arsenal — Forge Sprint 011',
  '',
  'Frontlines v1.0.4 adds exactly 40 battlefield card designs: eight for each of the five existing factions. The 115-card v1.0.3 pool and ten separate Commanders remain the foundation. This document lists the final card data and five new showcase lists; the sprint report records engine compatibility changes and validation.',
  '',
  '## Design and acquisition',
  '',
  'Each faction adds three Common, two Uncommon, two Rare and one Legendary design. Rarity describes tactical identity and complexity, not a numerical advantage. New units pay for utility through weaker raw combat bodies, paid abilities, readiness, setup requirements or genuine material costs.',
  '',
  'All forty designs enter Standard, faction, Veteran and Elite pack pools using existing rarity odds, guarantees, pity and cosmetic rolls. Crafting and duplicate Supply values are unchanged. Mastery, wear, Foil and Full-Art treatments use the existing architecture. No new currency or progression system is introduced.',
  '',
  'New designs begin unowned in fresh and migrated normal collections. Original starter inventories, Commander grants, Credits, Supply, mastery, cosmetic preferences and schema version remain unchanged. War Room and simulator decks, including these showcase presets and legal imported custom decks, are independent of collection ownership. Normal match and editor ownership rules remain intact.',
  '',
  '## Tactical rules contract',
  '',
  '| Mechanic | Exact timing, stacking and counterplay |',
  '| --- | --- |',
  '| Cover | One charge reduces the next eligible direct enemy hit by 2, then is consumed. Direct hits are initiated combat, single-target damage Orders, damaging Commander abilities and Overwatch; return fire, Ambush, Retaliate and Blast are excluded. It never stacks and expires when its owner’s next offensive action window begins. Breach removes/ignores it; Blast bypasses it. |',
  '| Breach | Initiated attacks remove and ignore Cover. Any printed Asset damage bonus applies only to Assets. It grants no generic bonus to unprepared units and does not itself counter Dodge. |',
  '| Blast | A territory-targeted effect damages at most its printed target cap, using numeric unit-ID order. Expansion grenades cap at two enemies. It bypasses Cover and Dodge, gains no Mark bonus and does not consume Exposed’s direct-hit charge. Friendly units are excluded unless a card explicitly says otherwise. |',
  '| Dodge | One deterministic charge avoids the next eligible direct enemy hit. Mark on the defender, Precision on the attacker or Exposed counters it; the charge is consumed even on a bypass. It never stacks and expires when its owner’s next offensive action window begins. No percentage miss rolls. |',
  '| Suppression | −1 Attack, with a minimum of zero, and no voluntary movement until the end of the target’s next offensive action window. Applying again refreshes duration without stacking. It does not disable printed traits, attacks, Orders, deployment or abilities; it differs from existing Sabotage. |',
  '| Overwatch | A ready, previously deployed unit spends its printed setup cost and exhausts instead of attacking. The first enemy voluntary move, deployment or Drifter relocation into the same territory triggers its printed direct reaction damage and consumes the state. Forced retreat and Breakthrough do not trigger it. Sources resolve in numeric unit-ID order. It expires at the owner’s next offensive-window start. Smoke prevents reactions in that space. Improvised Mine arms on deployment and destroys itself by rule resolution on triggering. |',
  '| Sacrifice | The owner explicitly destroys a friendly permanent as a cost. Source and payoff targets must satisfy the card’s public legality requirements. Destruction cause is `sacrifice`; general Scavenge/Nothing Wasted casualty rewards do not trigger. The lost card, paid Capacity and spent Command Action remain real costs. |',
  '| Exposed | Applying removes Cover and Dodge. The next eligible direct enemy hit receives +1 damage, then consumes Exposed. It never stacks and expires when the target’s next offensive action window begins. It supplies no Blast, return-fire, Ambush or Retaliate bonus. |',
  '| Smoke (supporting territory effect) | Friendly permanents in the chosen territory take 1 less direct enemy damage; Overwatch does not react within that territory. Smoke expires at the creator’s next offensive-window start, never stacks, does not forbid Mark targeting and does not protect against Blast. |',
  '',
  'Activated tactical abilities exhaust their source, pay their exact Capacity and Command Action cost and obey deployment/readiness locks. Targeting uses engine-generated legal actions. A shield cannot silently stack, an exhausted tool cannot fire again, and animations never determine outcomes.',
  '',
  '## New card inventory',
  '',
  '| Faction | Card | Rarity | Type | Presence | Attack / Health | Play Command Actions |',
  '| --- | --- | --- | --- | ---: | --- | ---: |'
];
for(const c of Object.values(T.CARD_ADDITIONS))lines.push('| '+[D.FACTIONS[c.faction].name,c.name,title(c.rarity),title(c.type),c.presence,c.type==='order'?'—':c.attack+' / '+c.health,c.commandCost].join(' | ')+' |');
for(const faction of Object.keys(D.FACTIONS)){
  lines.push('','## '+D.FACTIONS[faction].name+' — exact card text','');
  for(const c of Object.values(T.CARD_ADDITIONS).filter(c=>c.faction===faction)){
    lines.push('### '+c.name,'','`'+c.id+'` · '+title(c.rarity)+' · '+title(c.type)+' · '+c.presence+' Presence'+(c.type!=='order'?' · '+c.attack+' Attack / '+c.health+' Health':''),'',c.rulesText,'','**Choice it creates:** '+c.designIntent,'');
  }
}
lines.push('## Five showcase deck lists','','Each list has exactly 26 cards, one faction and all eight new faction designs alongside existing battlefield roles. Normal Commander assignment follows the existing faction/archetype defaults; the Commander remains outside the 26-card list. Showcase cards are not automatically granted to normal collections. Original 30 baseline/foundation lists remain available.');
for(const deck of T.PRESETS){
  const counts=deck.cards.reduce((out,id)=>(out[id]=(out[id]||0)+1,out),{});
  lines.push('','### '+deck.name,'','ID: `'+deck.id+'` · analytics group: `tactical-showcase` · 26 cards','','| Copies | Card | Set |','| ---: | --- | --- |');
  for(const[id,n]of Object.entries(counts))lines.push('| '+n+' | '+cards[id].name+' | '+(T.CARD_ADDITIONS[id]?'Tactical Arsenal':'Legacy')+' |');
}
lines.push(
  '','## Artwork pipeline','',
  'Forty faction-consistent vector equipment compositions have explicit card-ID mappings in `art.js`. Each optimized runtime asset has a square 400×400 viewBox, safe uniform cover cropping and no external image dependency. Full card faces retain 5:7 proportions. Original atlas mappings, ordinary paintings, source artwork and Commander portraits are preserved.','',
  'Regenerate only the new art with `node scripts/generate-tactical-art.js`. The generator writes `assets/cards/tactical-011/<faction>/<card-id>.svg` and the source manifest `assets/source/tactical-011/art-manifest.json`; it never replaces old assets. Forty runtime SVGs total less than 90 KB.','',
  'Collection and Deck Builder expose a Tactical Arsenal set filter. Keyword search/filtering understands the tactical mechanics, and exact card inspection remains complete even when the small face previews long rules.','',
  '## Validation and balance limits','',
  'Content and collection fixtures cover exact counts, five legal lists, preservation of all legacy metadata/economy/grants, v1.0.3 migration, all forty crafting/duplicate/mastery/cosmetic paths, deterministic packs and valid artwork. Forty individual engine fixtures deploy every new permanent, cast every new Order with legal public targets and resolve every activated ability after its real deployment lock. Additional deterministic fixtures verify stacking, consumption, expiry, counterplay, sacrifice costs, previews, Commander direct effects and contiguous captures. They complete no full matches. The full sprint report supplies AI, viewport and packaged-runtime results.','',
  'No large balance campaign was run. Conservative first-pass values and correctness tests establish playtest readiness; they do not establish competitive win rates. Prepared targeting, concentrated Cover, clustered Blast, Overwatch timing and explicit Sacrifice payoffs remain owner-playtest/balance risks. Pre-v1.0.3 rates are diagnostic history rather than expansion balance truth.',''
);
fs.writeFileSync(path.join(root,'docs/TACTICAL-ARSENAL.md'),lines.join('\n'));
console.log(JSON.stringify({document:'docs/TACTICAL-ARSENAL.md',cards:Object.keys(T.CARD_ADDITIONS).length,decks:T.PRESETS.length}));
