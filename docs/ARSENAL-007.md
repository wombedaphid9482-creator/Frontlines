# Frontlines Arsenal 007 — v0.8.0

The expansion adds **35 cards: seven per faction**, bringing the current profile to **115 cards / 23 per faction**. All cards remain available for deckbuilding and testing. The original 80 definitions, starter lists and ten archetype templates remain available; historical balance profiles do not receive this expansion.

The canonical rules live in `deck-rules.js`: 26 cards, one faction, at most four copies of a normal card and two copies of a Commander. There are no acquisition or rarity restrictions. Five optional hybrid templates demonstrate the expansion; they are starting points for custom decks, not new compulsory faction identities.

## Rules vocabulary

| Mechanic | Exact rule | Counterplay / limitation |
| --- | --- | --- |
| Armor | Printed trait: reduce incoming regular combat damage by 1 on any ground. Adds to Fortify on owned ground. Printed Armor and temporary Reinforce do not stack. | Direct Orders, Ambush and Retaliate bypass it. Sabotage suppresses printed Armor. |
| Mark | Action Order: a chosen enemy takes +1 damage from each positive regular combat hit until its next offensive turn starts. Includes normal simultaneous return fire. Zero-Attack cards remain unable to deal damage; shields and protection can absorb the bonus. Marks do not stack. | Costs a Command Action and requires a follow-up exchange before expiration. Guard and response Orders remain legal. Direct Orders, Ambush and Retaliate gain no bonus. |
| Reinforce | Action Order: heal a chosen friendly permanent by the printed amount, then grant temporary Armor 1 until your next offensive turn starts. Does not stack with printed Armor; adds to Fortify. | The protection expires before the next friendly initiative. Full-health unarmored targets are legal; an already protected target must be wounded for the play to help. Direct removal bypasses it. |
| Adapt | Choose one printed mode when playing the Order. Only that mode resolves, using the ordinary targeting rules of its effect. An explicit mode ID is required. Every mode pays the shared Capacity cost and one Command Action. | Flexibility spends more tempo than dedicated free support. Heal needs a wounded ally; Rally needs an exhausted ally; Draw needs no target. No randomness. |

Existing Guard, Fortify, Medic, Command, Mobile, Rush, Precision, Berserk, Retaliate and Scavenge retain their rules. All additions use these existing mechanics or the four definitions above. Scavenge remains limited to one trigger per player per offensive initiative, with multiple sources providing coverage rather than extra draws.

Ordinary deployment remains a Free Action where printed. New command specialists and selected heavy units explicitly cost one Command Action. Free does **not** mean free Capacity, free slots, unrestricted deployment timing or immediate attacks without Rush. Captures still force enemy survivors to retreat or be eliminated; none of the new cards bypasses frontline integrity.

## New card designs

`P` is both deployment Capacity and ongoing commitment for permanents; Orders temporarily spend it. `CA` is Command Action cost. Stats are Attack / Health. Numbers are initial authored candidates, not an independently validated balance result.

### Stonewall

Defense remains useful on a moving front. Bastion gets protection before ownership; Counteroffensive gets mobile reinforcement and retaliatory support. Low-Attack support does not replace pressure units.

| Card / ID suffix | P / CA | Stats or effect | Deckbuilding choice |
| --- | --- | --- | --- |
| Bulwark Warden / `bulwark_warden` | 6 / 0 | 2 / 6; Armor, Guard | Intercept on contested ground; sacrifices offensive damage and remains vulnerable to direct Orders. |
| Countermarch Section / `countermarch` | 5 / 0 | 3 / 5; Mobile, Retaliate | Convert survival into a repositioned counterpush; less durable than Counterbattery Section. |
| Plate Medic / `plate_medic` | 4 / 0 | 1 / 4; Armor, Medic | Lower commitment for frontline healing, with little attack and weak protection from Orders. |
| Advance Marshal / `advance_marshal` | 6 / 1 | 2 / 5; Command, Retaliate | A fragile counterpush aura that pays tempo instead of replacing the existing Commander. |
| Line Reinforcement / `line_reinforcement` | 3 / 0 | Reinforce 2 | Buy temporary defense instead of Triage's larger heal. |
| Reserve Watch / `reserve_watch` | 3 / 0 | 1 / 4; Retaliate | Restore a defensive body cheaply; low pressure prevents an effortless finisher. |
| Breach Shield Column / `breach_shield` | 7 / 1 | 2 / 6; Armor, Guard, Mobile | Carry protection through the moving frontline at a real Command Action and damage cost. |

All Stonewall IDs begin `stonewall_`.

### Bruiser

Shock Assault and Heavy Breakthrough can mix, but protecting a failed push takes support slots and actions. Healing a wounded Berserk unit can remove its damage bonus.

| Card / ID suffix | P / CA | Stats or effect | Deckbuilding choice |
| --- | --- | --- | --- |
| Pavise Breaker / `pavise_breaker` | 6 / 1 | 3 / 5; Guard, Berserk | Screen an expensive assault; tempo and Precision limit the protection. |
| Collision Crew / `collision_crew` | 5 / 0 | 2 / 4; Rush, Retaliate | Lose Assault Squad's damage for an awkward enemy counterattack. |
| Armored Ram Team / `ram_team` | 7 / 1 | 3 / 7; Armor, Berserk | A slower durable heavy trades opening damage for survival; no Rush or mobility. |
| Surge Drummers / `surge_drummers` | 4 / 1 | 1 / 4; Command, Mobile | Move a low-commitment assault aura while risking a weak support body and tempo. |
| Counterpuncher / `counterpuncher` | 4 / 0 | 2 / 4; Berserk, Retaliate | Keep a failed push dangerous by exchanging Brawler damage for retaliation. |
| Combat Triage Rig / `triage_rig` | 3 / 0 | Heal 3 | Preserve a major force instead of drawing more threats; can switch off Berserk. |
| Breakthrough Gunner / `breakthrough_gunner` | 8 / 1 | 4 / 4; Rush, Armor | Rush and chip protection cost more commitment and less raw health than Siege Heavy. A 4-damage Order kills the Gunner while a fresh Siege Heavy survives. Deployment, movement and attack can use all three commands. |

All Bruiser IDs begin `bruiser_`.

### The Syndicate

Combined Arms gets efficient combined jobs with fragile bodies. Precision Operations gets target preparation and a protected specialist, rather than more unconditional direct damage.

| Card / ID suffix | P / CA | Stats or effect | Deckbuilding choice |
| --- | --- | --- | --- |
| Target Designator / `target_designator` | 2 / 1 | Mark 1 | Invest an action in coordinated combat instead of immediate removal. |
| Screen Operator / `screen_operator` | 5 / 0 | 2 / 5; Armor, Guard | Choose durable contested-ground protection over Rapid Detail mobility and Attack. |
| Fire Coordinator / `fire_coordinator` | 5 / 0 | 2 / 4; Command, Precision | A selective supporting shot in return for less Coordinator damage and health. |
| Tactical Patch Team / `patch_team` | 4 / 0 | 1 / 4; Medic, Guard | Combine two support jobs in one slot while becoming easy to remove with direct damage. |
| Breach Monitor / `breach_monitor` | 6 / 1 | 3 / 6; Armor, Precision | Plan a durable Mark exchange instead of an Eliminator's burst and movement. |
| Field Link / `field_link` | 3 / 1 | Asset, 0 / 5; Command, Medic | Cheap combined Presence support that cannot retreat or follow a breakthrough. |
| Cover Protocol / `cover_protocol` | 2 / 0 | Reinforce 1 | Prepare one exchange with temporary protection rather than a large heal. |

All Syndicate IDs begin `syndicate_`.

### Nightwalker

Disruption creates openings for deliberate removal. The new pool offers protective decoys and reactive precision troops; it avoids free Rush on its most flexible new threats.

| Card / ID suffix | P / CA | Stats or effect | Deckbuilding choice |
| --- | --- | --- | --- |
| Exposure Window / `exposure_window` | 3 / 1 | Mark 1 | Spend on a visible assassination window; costs more Presence than the Syndicate targeting tool. |
| Shadow Handler / `shadow_handler` | 4 / 0 | 1 / 4; Command, Precision | A cheap covert aura with almost no independent combat value. |
| Misfire Team / `misfire_team` | 4 / 0 | 3 / 4; Precision, Retaliate | Lose Blade Team's Attack to discourage enemy cleanup; no Rush or mobility. |
| False Route / `false_route` | 2 / 1 | Action: disrupt 3 | Restrict enemy response Capacity during an operation; spending clears before the opponent deploys next turn. |
| Decoy Patrol / `decoy_patrol` | 3 / 0 | 1 / 3; Guard, Mobile | Protect a key operative with a cheap movable screen that cannot win exchanges alone. |
| Route Keeper / `route_keeper` | 5 / 0 | 2 / 5; Guard, Precision | Defend support while retaining selective targeting; little burst damage. |
| Crossfire Cell / `crossfire_cell` | 6 / 0 | 3 / 4; Precision, Mobile, Retaliate | Trade immediate Silencer damage for deliberate positioning and defensive punishment. |

All Nightwalker IDs begin `nightwalker_`.

### Rogue

Scavenger gets alternative recovery engines; Wildcard gets deliberate flexible modes. Salvage sources do not stack. Every combined job has a durability, damage, mobility or static-position cost.

| Card / ID suffix | P / CA | Stats or effect | Deckbuilding choice |
| --- | --- | --- | --- |
| Field Options / `field_options` | 3 / 1 | Adapt: heal 3 / draw 2 / ready one ally | Keep one card useful in different positions, paying tempo for flexibility. |
| Route Scout / `route_scout` | 3 / 0 | 1 / 3; Mobile, Scavenge | Rebuild cheap salvage coverage; low health and pressure make it expendable. |
| Scrap Hauler / `scrap_hauler` | 6 / 0 | 2 / 6; Armor, Scavenge | Maintain recovery under combat pressure, losing Bulwark damage and interception. |
| Field Negotiator / `field_negotiator` | 5 / 1 | 1 / 5; Command, Scavenge | Coordinate attacks and casualty value through a fragile paid support unit. |
| Salvage Medic / `wandering_medic` | 5 / 0 | 2 / 4; Medic, Scavenge | Preserve allies or accept losses for recovery; no Repair Courier mobility. |
| Patchguard / `patchguard` | 5 / 0 | 2 / 5; Guard, Armor | Protect an improvised group without a costly recovery engine; low damage and no mobility. |
| Salvage Cache / `rolling_cache` | 4 / 0 | Asset, 0 / 6; Medic, Scavenge | Combine healing and salvage in one fixed slot, risking destruction on a lost territory. |

All Rogue IDs begin `rogue_`. The `rolling_cache` and `wandering_medic` internal IDs are stable identifiers; display names deliberately clarify that the asset is fixed and the Medic has no Mobile trait.

## Optional hybrid templates

| Template ID | Name | Parent strategies |
| --- | --- | --- |
| `stonewall-fortified-advance` | Fortified Advance | Bastion / Counteroffensive |
| `bruiser-rolling-breakthrough` | Rolling Breakthrough | Shock Assault / Heavy Breakthrough |
| `syndicate-coordinated-removal` | Coordinated Removal | Combined Arms / Precision Operations |
| `nightwalker-planned-exposure` | Planned Exposure | Sabotage / Assassination |
| `rogue-field-improvisation` | Field Improvisation | Scavenger / Wildcard |

Each mixes new and existing cards, contains 26 cards, respects copy limits and preserves its existing faction Commander. `ARCHETYPE_PARENTS` maps the deck's archetype slug to these two original strategies for deck-aware AI; it does not compel a custom deck to fit a label. Original starter and archetype templates remain protected originals.

## Centralized content API

`arsenal.js` exports `FactionArsenal` in a browser and `require('./arsenal')` in Node. Browser order is `deck-rules.js` before `arsenal.js`, then profile/deck compilation and consumers.

- `CARD_ADDITIONS`: deeply frozen map of the 35 complete new definitions.
- `KEYWORDS`: exact displayed definitions for Armor, Mark, Reinforce and Adapt.
- `SCHEMA`: canonical allowed card types, traits, effects/timing/target rules, art roles, numeric bounds and aliases derived from shared deck limits.
- `PRESETS`: five deeply frozen templates with explicit IDs, names, factions, archetypes and card arrays.
- `ARCHETYPE_PARENTS`: five hybrid archetype slugs with two original strategy parents each.
- `metadataFor(card)`: deterministic role, archetypes, tags, design intent, AI role/priority and targeting metadata for legacy cards. Returns fresh metadata and never changes original costs, stats, abilities or lists.
- `validateCardPool(data, options)`: returns `{valid, errors, cards, factions}`; malformed definitions produce actionable errors. It does not mutate the pool.

New definitions include `set:'arsenal-007'`, `archetypes:string[]`, `tags:string[]`, `role`, `artRole`, `designIntent`, `ai:{role,priority}` and `targeting`. AI priority is descriptive (`support`, `pressure`, `tactical`); it grants no resource or stat advantages. Effect mechanics remain authoritative in the engine.

Example validation:

```js
const result = FactionArsenal.validateCardPool(currentData, {
  presets: currentDeckLibrary.presets()
});
if (!result.valid) showErrors(result.errors);
```

Validation checks IDs and duplicate IDs (including array-form input), factions, stats, costs, maximum playable Capacity/commands, traits, effect amounts/timing, exact Mark amount, Adapt modes and IDs, targeting consistency, metadata, art roles, starter lists and optional presets. `options.presets` supplies extra built-ins. `options.assetExists(src)` can provide a host asset checker; Node checks actual runtime atlas files by default. Browser callers should use the packaged manifest or automated asset checks, since browser code cannot query the local filesystem synchronously.

`options.schema` can declare supported future vocabulary, and `options.deckRules` can supply canonical host limits. Extend the relevant `SCHEMA` collections rather than hiding unsupported effects in card text. A schema extension still requires engine resolution, AI evaluation, tooltip support, and deterministic tests before cards enter a playable profile.

## Art and performance

Every addition explicitly selects one of the existing faction atlas crops: rifle, heavy, specialist or commander. The same five optimized local WebP atlases resolve all 115 cards, avoiding new network dependencies or large image downloads. Shared crops are coherent temporary concept art, not 35 newly commissioned unique illustrations. All art references are verified in tests.

## Baseline evidence and narrow correction

The authorized v0.7.0 run used ten original archetypes, 10,000 games, paired seats, seed 20261003, Sprint 6 rules, deck AI, invariant verification and default 240-turn / 10,000-decision limits. It completed with zero errors or cutoffs. The archive is `docs/balance/sprint6-baseline-v070.zip`.

Cross-faction rates were Nightwalker 69.93%, Syndicate 58.75%, Stonewall 44.89%, Bruiser 43.67% and Rogue 32.77%. Assassination won 78.68% overall; Shock Assault won 20.70%. Player 1 won 57.05%. These results identify severe policy/archetype skews, not isolated card causation.

The new Sprint 7 profile changes **Silencer Team's Command Action deployment cost from 0 to 1**, preserving its Presence, Attack, Health, Rush and Precision. This removes a free immediate precision finisher from the strongest baseline archetype and makes extraction/redeployment consume tempo. Historical Sprint 6 results and rules remain reproducible. The adjustment is provisional; no broad faction stat buffs, cap changes or repeated tuning runs are justified by this evidence alone.

## Validation and interpretation limits

`tests/sprint7-arsenal.test.js` checks all 35 additions and artwork, 115-card compilation, historical profile preservation, all built-in decks, malformed definitions/modes/targets, missing assets, schema extensions, metadata purity, UMD equivalence and nested immutability. Deterministic fixtures play every new card and all three Adapt modes through authoritative rules, verify exact costs and Free Actions at zero commands, and check legal choices from all five AI difficulty policies. Existing art and deck regressions also pass.

No additional balance campaign is run as part of this content work. New cards and templates require Ryken's explicitly controlled validation before claims about their competitive win rates. Card/pair win associations remain confounded by deck strength, match duration, sequencing and winning-position selection. The 10k baseline used the deck policy without an explicit difficulty; it does not separately validate Expert lookahead or compare the five difficulty levels.

The next balance report should distinguish cross-faction rates from same-faction player appearances, retain exact deck lists/seed/rules/AI provenance, and compare the new profile to the preserved baseline without silently overwriting either.
