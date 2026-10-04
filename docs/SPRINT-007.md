# Sprint 7 — Arsenal & Deckbuilding

Target: **Frontlines v0.8.0**, local playtest candidate. This sprint expands the existing territorial game, Arsenal and saved-deck library. The Sprint 6 tutorial, fair difficulty choices, Capacity/Command Action split, mandatory capture retreat, bounded screens and native fullscreen remain the foundation.

## Entry checkpoint and authorized baseline

The explicitly authorized v0.7.0 batch completed **10,000/10,000 decisive matches**, with **zero errors and cutoffs**, on October 3, 2026. Its original ten presets, paired seats, deck policy, seed 20261003, default `sprint6` rules and per-decision verification are archived with an independently reconciled audit. No additional balance batch is authorized or performed by this sprint.

| Faction against other factions | Wins / appearances | Win rate |
| --- | ---: | ---: |
| Stonewall | 1,598 / 3,560 | 44.89% |
| Bruiser | 1,553 / 3,556 | 43.67% |
| The Syndicate | 2,089 / 3,556 | 58.75% |
| Nightwalker | 2,484 / 3,552 | 69.93% |
| Rogue | 1,164 / 3,552 | 32.77% |

The first seat won **57.05%**. Match length averaged **26.36 offensive turns**, median **22**, P95 **53**, maximum **160**. Assassination and Combined Arms won 78.68% and 78.05% across all their appearances; Shock Assault and Scavenger won 20.70% and 31.43%. Six pairings exceeded 90–10; Shock Assault won only 5/222 against Assassination. These results fail the standing approximately 45–55% cross-faction target and preferred spread ≤5 percentage points.

The audit reconciled **461,915 Command Actions**, **269,546 free card plays**, **60,167 forced retreats** and **4,248 forced eliminations**. Mean unused end-turn Capacity ranged 46.49–50.45 across factions. High unused Capacity can reflect late saturation, card access or command bottlenecks; it does not establish that deployment resources need increasing.

[Baseline report](balance/SPRINT6-BASELINE.md), [structured summary and hashes](balance/sprint6-authorized-10000-summary.json), [immutable report archive](balance/sprint6-baseline-v070.zip) and [actual v0.7.0 source checkpoint](checkpoints/sprint7-entry-v0.7.0.zip) preserve the evidence. The original v0.7.0 installer and release manifest remain unchanged. The Sprint 5 competitive gate was never completed; historical results are kept with their own rules and provenance.

Card/pair correlations do not prove causal strength. Paired deterministic policy games do not establish human balance, tutorial learnability or fun. Cross-faction rates exclude 1,112 same-faction matches; deck rates include them. The audit also identifies limitations in comeback exposure, first-capture timing and final territory-swing measures.

## Narrow correction and preserved signatures

The new `sprint7` / `sprint7-arsenal-v1` profile changes **Silencer Team deployment from 0 to 1 Command Action**. Its Presence, Attack, Health, Rush and Precision remain intact. This introduces an opportunity cost for a major deployment-turn specialist instead of replacing its faction signature. The baseline identifies severe Nightwalker/preset and initiative skew; it cannot prove that Silencer alone caused it or that this change fixes the environment.

Every other existing card retains its combat values, traits, effects and command cost. The original 80-card pool, five starters and ten archetype presets remain playable. Sprint 6 and earlier profiles do not receive the expansion or Silencer correction. No broad stat-tuning pass was performed.

## Expanded Arsenal and strategic choices

**35 new cards — seven per faction — produce 115 available cards, 23 per faction.** All are available for testing, without acquisition, rarity or account restrictions. New designs add explicit roles, costs, target definitions, parent strategy tags, design intentions and AI metadata. Existing cards receive descriptive metadata under the new profile.

| Faction | Seven additions | Deckbuilding purpose |
| --- | --- | --- |
| Stonewall | Bulwark Warden; Countermarch Section; Plate Medic; Advance Marshal; Line Reinforcement; Reserve Watch; Breach Shield Column | Protect neutral ground, preserve survivors, move a defensive screen and turn defense into a controlled advance. |
| Bruiser | Pavise Breaker; Collision Crew; Armored Ram Team; Surge Drummers; Counterpuncher; Combat Triage Rig; Breakthrough Gunner | Choose immediate shock pressure, a supported expensive push, or recovery after an assault fails. |
| The Syndicate | Target Designator; Screen Operator; Fire Coordinator; Tactical Patch Team; Breach Monitor; Field Link; Cover Protocol | Combine distinct support jobs and create selective removal through visible Mark windows. |
| Nightwalker | Exposure Window; Shadow Handler; Misfire Team; False Route; Decoy Patrol; Route Keeper; Crossfire Cell | Plan precise openings, restrict response Capacity and protect fragile operatives without adding printed Armor. |
| Rogue | Field Options; Route Scout; Scrap Hauler; Field Negotiator; Salvage Medic; Patchguard; Salvage Cache | Adapt a support Order, rebuild recovery sources and choose mobility, interception or fixed support. |

Five additional **26-card hybrid templates** demonstrate new content: **Fortified Advance**, **Rolling Breakthrough**, **Coordinated Removal**, **Planned Exposure** and **Field Improvisation**. They complement the original ten presets; they do not replace them. Built-in templates are preserved and must be duplicated into an editable local deck.

Hybrid AI intent resolves through centralized `ARCHETYPE_PARENTS`: Bastion/Counteroffensive, Shock Assault/Heavy Breakthrough, Combined Arms/Precision Operations, Sabotage/Assassination and Scavenger/Wildcard respectively. A hybrid receives its strongest useful parent preference rather than stacking both bonuses; a card's matching strategy metadata adds only one small tie preference. Custom decks can select optional AI intent, while their cards remain unrestricted within faction legality.

## Four reusable mechanics

| Mechanic | Exact implementation | Counterplay |
| --- | --- | --- |
| Armor | Reduce each regular combat hit by 1 on any ground. Adds to owned-ground Fortify. Printed Armor and temporary Reinforce protection use their maximum, not their sum. Sabotage disables printed Armor but not already granted temporary Armor. | Direct damage Orders, Ambush and separate Retaliate damage bypass it; suppression and stronger attacks still matter. |
| Mark | One enemy permanent takes +1 damage from each positive original regular combat attack or simultaneous counterfire until its owner's next offensive turn begins. No stacking. Apply before shield/protection; zero-Attack retaliation remains zero. | Guard can redirect an attack to an unmarked ally, shields/protection absorb the bonus, and the window expires before the target acts. |
| Reinforce | Heal a friendly permanent by the printed amount, then grant temporary Armor 1 until that owner's next offensive turn begins. Protection persists through the intervening enemy turn. | Temporary protection cannot stop direct effects and does not stack with printed Armor. A healthy already armored/reinforced target is illegal; an injured one can still receive the heal. |
| Adapt | Choose one printed mode using an explicit mode ID. Field Options offers Repair (heal 3), Resupply (draw 2), or Reposition (ready an exhausted allied unit). Only the chosen mode resolves. Every mode shares its printed Capacity and **1 Command Action**. | Dedicated support is cheaper in tempo; mode targets retain ordinary heal/rally legality. No hidden draw prediction or randomness chooses a mode. |

Assets cannot attack or rally. Mark and Armor do not change Orders, pre-combat Ambush or the separate post-combat Retaliate hit. Temporary states clear at their owner's offensive start before Medic healing; movement preserves them until expiration or removal. Reclaim/redeployment starts a fresh unmarked/unreinforced permanent. Capture still immediately retreats/eliminates defenders; no enemy remains stranded behind the front.

The engine exports `resolveEffect(card,action)`, `orderTargets(state,player,card,action)` and `combatDamage(state,unit,incoming,shield=0)` so mode resolution, valid targeting and combat forecasts use the same rules. Invalid/missing Adapt modes fail before spending cards or resources. Status events are `mark`, `markEnd`, `reinforce`, `reinforceEnd`; Adapt's Order event identifies its selected mode and effect. Invariants accept temporary status value 1 only.

`frontlines-territory-v4-arsenal-mechanics` and `frontlines-ai-sprint7-v1` apply only to the new rules flag. Historical profiles retain their prior version and behavior. Simulator snapshots include the new rules, definitions and fingerprints; incompatible replays must use the archived originating runtime.

## Deckbuilding and browsing

The canonical rules remain **exactly 26 cards**, one faction, maximum **four copies per ordinary design** and **two per Leader**. Unique cards restrict active copies on the battlefield, not additional deck rarity rules. Legality is centralized in the shared deck module; normal Play and simulation reject illegal lists.

Arsenal supports new/edit/name/save/duplicate/delete-with-confirmation/import/export, plus quick add/remove and quantity controls. Original templates are read-only; **Make editable copy** creates a local variant. Illegal drafts remain editable and savable with reasons; unavailable/cross-faction entries can be removed. Card edit undo/redo and Ctrl+S make iteration faster.

Collection scope can browse a chosen faction or all factions without changing the edited deck's faction. Search covers names, rules, keywords, roles and strategic metadata. Filters include type, Presence band, keyword/effect, role, strategy/design tag, set, command cost and cards already in the deck; sort by Presence, name or type. Active filters explain reduced results and can be cleared.

Persistent composition shows size/legality, average Presence, cost curve, unit/Order/Asset/Heavy/Specialist/Commander counts, command-cost distribution and overlapping strategy-tag counts. Tag counts describe tendencies and do not silently change the selected AI intent. Card briefing separates artwork, rules, keyword definitions, battlefield role, design choice and flavor; unfamiliar modes and temporary states have explanations.

Saved decks retain the existing local format/storage key. Recovery preserves readable drafts, repairs missing names/colliding IDs where possible, and exposes rejected records/original data instead of silently erasing a damaged library. A blocked unreadable library cannot be overwritten by ordinary save. Browser, offline-file and native storage origins remain different; export/import when moving decks between them.

## Card design review and remaining risks

New designs generally exchange Attack/Health, mobility, capture Presence, command cost, a deck slot or static positioning for their added role. Printed Armor stays absent from Nightwalker. Scavenge still draws at most once per player per global turn, so added recovery sources do not multiply a casualty into unrestricted draws. Field Options trades tempo for flexibility rather than random outcomes.

An initial design review identified that Breakthrough Gunner could crowd out Siege Heavy. Its candidate niche is **8 Presence / 4 Attack / 4 Health / 1 Command Action**, retaining Rush and Armor, versus Siege Heavy's **7 / 4 / 5 / 1**. It buys a protected immediate attack with greater commitment and less durability against direct effects. This is a pre-release design correction to a new card, not simulation-based tuning of a preserved signature.

Watch **Field Link**, cheap armored escorts/medics, **Salvage Cache**, the revised Gunner and stacking distinct Command sources during later human/deck analysis. Their tradeoffs are explicit, but no fresh data establishes whether those choices are healthy or mandatory. Presence is both commitment and capture pressure, so lower printed cost is not an unconditional upgrade. Existing severe preset disparity and first-seat advantage remain identified; adding choices does not certify competitive viability.

## Validation status

**Full `npm test`: 215/215 passed**, zero failures, including **38 additions since the 177-test v0.7.0 checkpoint**: 18 rule/AI, 10 content/schema, six deck/library and four integration regressions.

Coverage includes all 35 additions actually entering play or resolving their effects, every Adapt mode, correct targets/costs, Armor/Fortify/nonstacking, Mark/counterfire/shields, direct/Ambush/Retaliate bypass, Reinforce expiration, Silencer isolation and historical profile preservation. Every new card is evaluated at all five difficulty choices with concealed opponent hand/deck/RNG getters. Hybrid parent preferences do not double bonuses, and frozen-heuristic regressions pass. Schema, assets, templates, save/recovery/import/export and custom-deck integration are checked. A class-summary regression corrected Heavy/Specialist counts to count units/Leaders from artwork role first, using legacy fallback; support Orders no longer inflate Heavy counts and Bulwark Warden is recognized.

**Eight current browser suites passed:** command, flow, preferences, tutorial, preserved Arsenal/War Room, expanded Arsenal, custom-deck match and current War Room. All eleven tutorial lessons completed through actual clicks, a Learning-AI victory and loss/retry, across six viewports. Expanded Arsenal and saved/custom decks work through the shell. Every Adapt mode was exercised at 1366-, 900- and 390-pixel widths; Mark/Reinforce expiration and combat forecasts passed. A complete actual custom Rogue deck versus Nightwalker reached conquest for Player 1 in **114 decisions / 19 offensive turns**.

One new deterministic War Room fixture matched exactly between Worker and Node; the preserved fixture also agrees across Worker, Node and offline runners. These are correctness smokes, not matchup/balance campaigns. Profile JSON mirrors were regenerated from the final definitions, including the corrected Silencer Team wording.

**The final local v0.8.0 candidate is built and smoke-tested.** `npm run build -- --win nsis --publish never` produced the [Windows installer](../release/0.8.0/Frontlines-Setup-0.8.0.exe), **113,004,679 bytes**, SHA-256 `8fa3e97bc0baf4ee9218511a27a4fb1c30faef7c45e5890d23e1c60119b693ee`. Authenticode status is **NotSigned**. Release verification found **62 packaged source/runtime files matching the final source exactly**, all **31 preserved Sprint 5 source hashes unchanged**, production updater dependencies included and development material excluded. The native runtime uses Electron **44.5.1** and updater **6.8.9**.

Four native smokes ran with isolated temporary user data. The packaged shell exercised menu/setup/Settings, playable tutorial deployment, actual F11 fullscreen and Alt+Enter windowed input, and version **0.8.0**. A packaged Planned Exposure versus Field Improvisation match reached conquest for Player 2 in **98 decisions / 18 offensive turns**; Arsenal loaded **115 cards / a 26-card deck**; the cooperative War Room completed **two deterministic fixtures, zero errors/cutoffs**.

[Release guide](RELEASE-0.8.0.md), [release manifest](release-0.8.0-manifest.json) and [final source archive](checkpoints/sprint7-v0.8.0.zip) record the candidate and its provenance. The existing owner installation was not replaced, installation/uninstallation and real update-server delivery were not tested, and nothing was published. No additional statistical campaign or external human learnability certification is claimed. The competitive baseline remains unhealthy; this candidate's expanded choices and narrow correction require the separately authorized validation below.

## SIMULATION REQUEST — after the stable candidate

**Authorization boundary:** the completed Sprint 6 run is the only authorized balance campaign. The following are two separate proposed jobs for Ryken's review; neither is launched automatically. No 50,000-game confirmation or tuning loop is implied.

**Job A — comparable original-pool check:** 10,000 games with the exact original ten archetype lists, `sprint7`, deck AI for both sides, base seed **20261003**, paired opening seats, exact deck mirrors **off**, same-faction distinct variants **included**, default rules, invariant/card-conservation verification, 240 offensive-turn / 10,000-decision safeguards and ordinary batch collection without rich traces.

```text
npm run simulate -- --mode matrix --pool stonewall-bastion,stonewall-counteroffensive,bruiser-shock-assault,bruiser-heavy-breakthrough,syndicate-combined-arms,syndicate-precision-operations,nightwalker-sabotage,nightwalker-assassination,rogue-scavenger,rogue-wildcard --count 10000 --balance sprint7 --ai deck --seed 20261003 --verify --max-turns 240 --max-decisions 10000 --out test-results/sprint7-original-10000.json --csv
```

This retains 45 deck pairs with 222–224 games per pair. Compare the original v0.7.0 report's cross-faction/deck/pair/seat/length/economy data. Engine, AI metadata and Silencer opportunity cost changed; matched seed/pool does not by itself attribute differences to Silencer alone.

**Job B — expanded-content check:** a separate 10,000 games with all **15** current presets, including the five hybrids, using the same settings. This checks expanded decks and keyword/economy behavior.

```text
npm run simulate -- --mode matrix --pool archetypes --count 10000 --balance sprint7 --ai deck --seed 20261003 --verify --max-turns 240 --max-decisions 10000 --out test-results/sprint7-expanded-10000.json --csv
```

The expanded pool contains 105 deck pairs with **94–96 games per pair**, approximately 47–48 paired seeds. Individual matchup estimates are noisier. Its different opponents and exposures change faction/deck aggregates, so compare it separately; it cannot serve as a causal before/after replacement for Job A. If Ryken approves only one job initially, prioritize Job A for continuity, then review before authorizing Job B.

**Required return:** JSON, HTML, `.matches.csv` and `.cards.csv`; exact versions/profile/lists/options; requested/completed/error/cutoff counts; `byFactionCross` rates and appearances with all-appearance totals separate; original/hybrid deck and pair rates; first-seat split; turn min/median/mean/P95/max; captures/recaptures, territory and comeback denominators; free plays/commands, available/committed/unused Capacity; retreats/eliminations; Mark/Reinforce/Adapt/Armor metrics; card exposure/usage and suspicious seeds for exact replay. Card associations remain diagnostic, not automatic nerf instructions.

Both requests were checked through the current CLI parser and options normalizer **without creating a run**: their pools resolve to 10 and 15 legal presets respectively. The CLI uses `deck` policy without a live difficulty override; this is **not an Expert-difficulty benchmark**. Matrix mode always swaps seats; do not pass `--fixed-seats` or `--mirrors`. There is no `--rich` or difficulty CLI flag. Both commands create four sibling exports and preserve existing outputs through a suffix. No default-rule overrides are requested.
