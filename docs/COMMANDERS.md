# Commanders — Frontlines v1.0.0

Ten named, off-lane Commanders define different approaches inside the five factions. All ten launch Commanders and their ten foundation inventories are granted automatically. Commander rarity and cosmetics add no gameplay power and do not gate playtesting.

## Construction and access

- Exactly one same-faction Commander accompanies a legal **26-card** deck. The Commander sits outside that list.
- Normal cards retain a maximum of **four copies**, or **two copies per deployable Leader design**. A Leader unit is a battlefield card; a named Commander is a separate strategic leader.
- Commanders occupy no lane, contribute no printed Presence or maintenance commitment, cannot be attacked or targeted, and have no death, retreat or positioning rules. Their public abilities still affect the authoritative battlefield.
- Every active is **once per match**, costs **one Command Action**, and spends **two available Capacity** except Reserve Release, which spends zero Capacity. Temporary spending clears normally at the next offensive turn.
- Actives require the Commander owner’s offensive turn, resolved response windows, sufficient resources and legal targets. Disabled buttons explain the relevant condition. An invalid action spends nothing.
- Existing five starters and fifteen archetype/hybrid lists remain intact. The ten additional foundations introduce quantity differences and actual Mark/Sabotage/Adapt tools where relevant. Their max-copy grant union with original starters is **63 designs / 171 copies**.
- Human Play requires a legal deck and owned card copies. AI and War Room retain every legal card independently of ownership and grant no collection progression.

## Launch lineup

| Faction | Commander | Primary plan | Passive | Active |
| --- | --- | --- | --- | --- |
| Stonewall | The Warden | Fortified endurance | Hold Fast | Lasting Resolve |
| Stonewall | The Marshal | Defensive counterattack | Return Fire | Countermand |
| Bruiser | The Breaker | Frontline breakthrough | Drive Forward | Breach Order |
| Bruiser | The Bloodhound | Elimination tempo | Scent of Weakness | Finish the Hunt |
| Syndicate | The Coordinator | Mark sequencing | Target Network | Priority Target |
| Syndicate | The Quartermaster | Efficient sequencing | Rapid Logistics | Reserve Release |
| Nightwalker | The Ghost | Precision timing | Veiled Entry | Fade to Shadow |
| Nightwalker | The Saboteur | Frontline disruption | Supply Interference | Blackout |
| Rogue | The Scavenger | Salvaged value | Nothing Wasted | Recover the Fallen |
| Rogue | The Drifter | Adaptive positioning | Open Route | Change the Plan |

## Exact public rules

The following text comes from the shared [Commander catalog](../commanders.js). Humans, AI and simulations use the same implementation; names do not imply additional unprinted bonuses.

### Stonewall — The Warden

**Identity:** Fortified endurance.

**Passive — Hold Fast.** At the start of your offensive turn, heal 1 damage from each allied battlefield card in territory you control.

**Active — Lasting Resolve.** Once per match: heal 3 damage from a damaged allied battlefield card and give it temporary Armor 1 until your next offensive turn. Armor does not stack with printed Armor. Cost: 2 available Capacity and 1 Command Action.

**Deckbuilding direction.** Build around Fortify, Guard, durable units and Reinforce. Holding friendly ground lets wounded forces recover.

**Ready foundation:** `commander_stonewall_warden-foundation`. The exact quantity list is in [deck foundations](commanders/deck-foundations.json).

### Stonewall — The Marshal

**Identity:** Defensive counterattack.

**Passive — Return Fire.** An allied unit that survives as the defender in regular combat gains +1 Attack until the end of your next offensive turn. This bonus does not stack.

**Active — Countermand.** Once per match: ready an exhausted allied unit and give it +1 Attack until the end of this offensive turn. This bonus does not stack with Return Fire. Deployment-turn attack restrictions still apply. Cost: 2 available Capacity and 1 Command Action.

**Deckbuilding direction.** Choose Guard, Retaliate and resilient attackers. Survive enemy pressure, then convert defensive survivors into a controlled counterattack.

**Ready foundation:** `commander_stonewall_marshal-foundation`. The exact quantity list is in [deck foundations](commanders/deck-foundations.json).

### Bruiser — The Breaker

**Identity:** Frontline breakthrough.

**Passive — Drive Forward.** At your offensive turn end, add 2 extra capture progress if a Rush or Mobile allied unit occupies the contested territory. This is territorial pressure, not spendable Capacity.

**Active — Breach Order.** Once per match: ready an allied unit in the contested territory and give it +2 Attack until this offensive turn ends. Deployment-turn attack restrictions still apply. Cost: 2 available Capacity and 1 Command Action.

**Deckbuilding direction.** Choose Rush, Mobile and cheap occupation units to establish pressure; commit the signature burst when it can break resistance.

**Ready foundation:** `commander_bruiser_breaker-foundation`. The exact quantity list is in [deck foundations](commanders/deck-foundations.json).

### Bruiser — The Bloodhound

**Identity:** Elimination tempo.

**Passive — Scent of Weakness.** Your initiated regular combat attacks gain +1 Attack against a wounded enemy. The bonus does not apply to retaliation, direct damage or a target that was fully healed before combat resolves.

**Active — Finish the Hunt.** Once per match: deal 3 direct damage to a wounded enemy battlefield card. Direct damage ignores Armor and Fortify. Cost: 2 available Capacity and 1 Command Action.

**Deckbuilding direction.** Choose selective damage, Precision and aggressive finishers. Set up wounds before committing elimination attacks.

**Ready foundation:** `commander_bruiser_bloodhound-foundation`. The exact quantity list is in [deck foundations](commanders/deck-foundations.json).

### Syndicate — The Coordinator

**Identity:** Mark sequencing.

**Passive — Target Network.** Your action Orders whose selected effect is Mark cost 1 less Capacity, to a minimum of 1. Printed Presence and all other effects are unchanged.

**Active — Priority Target.** Once per match: Mark an enemy battlefield card and deal 2 direct damage to it. Mark lasts until its owner’s next offensive turn. Cost: 2 available Capacity and 1 Command Action.

**Deckbuilding direction.** Choose Mark, Precision and coordinated attackers. Spend less on setup, then exploit a visible target with regular combat.

**Ready foundation:** `commander_syndicate_coordinator-foundation`. The exact quantity list is in [deck foundations](commanders/deck-foundations.json).

### Syndicate — The Quartermaster

**Identity:** Efficient sequencing.

**Passive — Rapid Logistics.** The first action Order each offensive turn with printed Presence 3 or less and printed Command Action cost above 0 costs 0 Command Actions. Its Capacity cost is unchanged.

**Active — Reserve Release.** Once per match: clear up to 4 temporary spent Capacity and draw 2 cards. Does not release deployed commitment or exceed total Capacity. Cost: 0 available Capacity and 1 Command Action.

**Deckbuilding direction.** Choose inexpensive tactical Orders, draw support and efficient combined arms. Sequence the free tactical Order before costly commands.

**Ready foundation:** `commander_syndicate_quartermaster-foundation`. The exact quantity list is in [deck foundations](commanders/deck-foundations.json).

### Nightwalker — The Ghost

**Identity:** Precision timing.

**Passive — Veiled Entry.** The first Precision unit you deploy each offensive turn gains temporary Armor 1 until your next offensive turn. This does not stack with printed Armor.

**Active — Fade to Shadow.** Once per match: withdraw an allied unit one territory toward home into adjacent friendly ground, heal up to 3 damage and ready it. Destination slots and deployment-turn attack restrictions still apply. Cost: 2 available Capacity and 1 Command Action.

**Deckbuilding direction.** Choose Precision units and Ambush responses. Protect the first infiltrator, then withdraw a valuable unit before it is overwhelmed.

**Ready foundation:** `commander_nightwalker_ghost-foundation`. The exact quantity list is in [deck foundations](commanders/deck-foundations.json).

### Nightwalker — The Saboteur

**Identity:** Frontline disruption.

**Passive — Supply Interference.** The first Sabotage action Order you resolve each offensive turn also locks 1 enemy available Capacity until their next offensive turn. It cannot lock committed Capacity.

**Active — Blackout.** Once per match: suppress the printed traits of every enemy battlefield card in the contested territory until its owner’s next offensive turn, and lock up to 2 enemy available Capacity for that window. Cost: 2 available Capacity and 1 Command Action.

**Deckbuilding direction.** Choose Sabotage, selective damage and occupation forces. Disable a frontline’s abilities before attacking; disrupted spending clears at enemy initiative.

**Ready foundation:** `commander_nightwalker_saboteur-foundation`. The exact quantity list is in [deck foundations](commanders/deck-foundations.json).

### Rogue — The Scavenger

**Identity:** Salvaged value.

**Passive — Nothing Wasted.** The first allied battlefield card destroyed in each offensive initiative draws you 1 card. This may also trigger alongside a surviving unit’s Scavenge ability; each has its own limit.

**Active — Recover the Fallen.** Once per match: return the most recent non-Order card in your discard to your hand. Redeployment pays its printed costs and starts without wounds. Cost: 2 available Capacity and 1 Command Action.

**Deckbuilding direction.** Choose Scavenge, low-cost battlefield units and valuable recovery targets. Trade expendable forces while preserving tools for the next push.

**Ready foundation:** `commander_rogue_scavenger-foundation`. The exact quantity list is in [deck foundations](commanders/deck-foundations.json).

### Rogue — The Drifter

**Identity:** Adaptive positioning.

**Passive — Open Route.** Your first normal unit movement each offensive turn costs 0 Command Actions. Normal adjacency, readiness, slots and movement exhaustion rules still apply.

**Active — Change the Plan.** Once per match: relocate an allied unit to any territory you control or the contested territory, and ready it. Destination slots and deployment-turn attack restrictions still apply. Cost: 2 available Capacity and 1 Command Action.

**Deckbuilding direction.** Choose Mobile and Adapt cards plus flexible occupation forces. Save a movement command, then redeploy pressure where the board opens.

**Ready foundation:** `commander_rogue_drifter-foundation`. The exact quantity list is in [deck foundations](commanders/deck-foundations.json).

## Important interactions

Armor and temporary Armor follow the existing non-stacking rule. Fortify on owned ground still adds its separate protection. Direct damage bypasses Armor/Fortify; normal shields retain their existing behavior. Mark benefits positive regular combat hits until the target owner’s next offensive turn; it does not add damage to direct damage or zero-Attack hits. Suppression disables printed card traits, not the separate Commander.

Ready/relocation abilities preserve ordinary deployment-turn attack restrictions: a non-Rush unit does not gain permission to attack just because it was readied. Movement/withdrawal must respect the active’s territory and slot rules. The Drifter’s signature relocation can reach any friendly territory or the objective; its passive first normal move still follows normal adjacency. Recovery returns the original design, not a free battlefield deployment.

Commander passives are public incentives. They do not reveal reserve order or the opponent’s hidden hand. The AI values legal signature actions, their costs, follow-up opportunities and the visible battlefield; the base rules apply to every difficulty.

## Guided player flow

Arsenal presents **Faction → Commander → Foundation → Customize**, full passive/active/hook text, immediate foundations, and per-card synergy signals. Changing an editable deck’s Commander preserves the card list and supports Undo/Redo. Changing an original makes a saved editable copy. Match setup can test a different same-faction Commander without rewriting the saved original.

Both Commander panels remain visible during play. Their portraits open full doctrine, active controls print costs, legal targets become highlighted, activation receives distinct feedback, and the spent state remains explicit. Collection has Commander browsing and shows launch access plus related foundations.

The full tutorial has **fourteen lessons**. Before the final Learning match, the player is assigned The Warden, observes Hold Fast heal a wounded Heavy after the initiative changes, actively issues Lasting Resolve on a guided legal target, and compares/selects The Warden or The Marshal. The selected leader actually commands the final training operation. These are explicit objectives and explanations, not tooltip-only instruction.

## Persistence and migration

Deck JSON remains `frontlines-deck-v1`; `deck.commanderId` stores the namespaced ID, for example `commander_stonewall_warden`. Save/load, duplicate, rename, import/export and drafts preserve it. A legacy deck with no field receives its faction default and a transparent migration message while its cards, name and ID remain intact. Loading alone preserves the original storage text; saving commits the assignment. An explicit unknown, empty or wrong-faction ID stays visible as an incomplete draft requiring repair. Malformed IDs are rejected safely.

Collection migration grants the launch Commander set and missing foundation copies once, using an idempotent grant version. Wallets, Supply, pending packs, pity, cards, cosmetics, mastery and unrelated deck data remain. Commander rows prepare cosmetic preferences and eligible human-match counts for matches, victories and active uses. Alternate Commander acquisition is a future extension. The disabled Commander Pack clearly explains that the entire launch set is free and cosmetic packs are planned; it does not sell empty content.

Old tutorial v1 progress retains prior introductory lesson completion but resumes at the new Commander instruction if it was not taught. A past tutorial completion cannot silently count as learning the new feature. Existing one-time tutorial reward receipts still prevent repeated Credits.

## Analysis and limits

The `sprint9` rules profile enables Commanders. Earlier profiles remain Commander-free and preserve their registered inventories. Simulator reports retain exact Commander assignments, public catalog rules and fingerprints; results group both decks and Commanders, including active use, passive triggers and effect amounts. A Commander change is a changed experimental condition, not merely a renamed cosmetic.

Correctness coverage does not certify competitive balance. The earlier v0.7.0 baseline exposed substantial faction/preset and initiative disparities. v1.0.0 introduces a larger strategic space requiring owner-authorized measurements and human playtests. No large Commander sweep, 10,000/50,000-match campaign or economy campaign is authorized by the sprint.

## Rules and analysis API

`commanders.js` is a standalone frozen UMD catalog (`frontlines-commanders-v1`). It exposes `COMMANDERS`, `list(faction)`, `get(id)`, `defaultFor(faction)` and `synergy(card,id)`. A synergy result contains a nonnegative score and explicit reasons; it is a construction hint, not an automatic bonus or legality restriction.

The engine stores bounded public state in `player.commander = {id,used,passiveTurn}` and the selected ID in `player.deckMeta.commanderId`. `commanderStatus(state,player)` provides the full doctrine, cost, availability, disabled reason and actual legal action targets. `{type:'commander',targetUid?,territory?}` goes through the same validation and immutable dispatch boundary as ordinary actions. Drifter relocation requires both a target UID and destination territory; targetless signatures require neither. Invalid timing, resources, targets or a spent ability do not consume anything.

Authoritative events include `commanderActivated`, `commanderPassive`, `commanderRecovery`, `commanderDisrupt` and ordinary effect events with `sourceCommanderId`. Commanders never appear as synthetic battlefield cards in card statistics. Warden healing and direct signature damage are measured from real effect events; revived discarded cards are counted as Commander recovery, not invented reserve draws. Passive amounts retain their own units rather than implying that a saved command equals a healed point.

The shared AI (`frontlines-ai-sprint9-v1`) evaluates signature value against public wounds, units, legal follow-up attacks, slots, resources and its own hand. It applies a small Commander synergy preference to relevant deployments and sequencing, preserves valuable once-per-match commands when no useful window exists, and respects the existing deployment-turn attack restriction. Difficulties and policies receive the same legal Commander options. Planning does not peek at hidden deck order or enemy cards.

Simulator **4.0.0**, telemetry **v6** and engine **v5** snapshot exact Commander assignments, catalog text and versions. JSON contains `summary.byCommander`, per-match `commanderIds` and `commanderUsage`, including per-seat win rates, active use rate and mean activation turn, healing, direct effective damage, recovered cards and Capacity, disruption, `presenceSaved`, `commandActionsSaved`, `bonusPressure` and `passiveCardsDrawn`. The War Room **Decks** results tab includes Commander performance, and HTML reports include the same readable section. Rates remain associations with the deck, opponent pool and policy; they do not isolate causal Commander strength.

`FrontlinesSimulator.commandersCSV(report)` exports the separate leader summary. The normal player-facing **Commander CSV** button exports it; CLI `--csv` adds a `.commanders.csv` sibling when the rules profile enables Commanders. Match CSV preserves its existing columns and appends the two Commander IDs. CLI `--pool commanders --balance sprint9` chooses all ten foundation lists without starting a run merely by browsing. The historical implicit CLI profile remains `baseline`; specify `--balance sprint9` when measuring this release.

Targeted tests cover all ten passives and signatures, legal targets, once-per-match limits, costs, expiry, new-match reset, migration-compatible faction selection, AI legality and hidden-information independence. Two seat-paired deterministic Warden/Bloodhound fixtures (seed `100009`) complete with no errors or cutoffs and reproduce exactly in replay and the offline browser-script runtime. A separate renderer/export smoke uses a zero-decision preview and starts no matches. These are correctness fixtures, not balance evidence.
