# Sprint 9 — v1.0.0 Commander Update

Target: **Frontlines v1.0.0**, continuing the v0.9.0 collection and presentation build. This milestone adds named strategic leaders, immediately playable Commander foundations, explicit onboarding and a stronger card presentation system. Territory, Presence commitment, three Command Actions, contiguous ownership, responses, retreat and custom decks remain the shared core.

## Implemented scope

- **Ten off-lane Commanders**, two per faction, each with a persistent passive, one signature active per match and a public deckbuilding direction.
- **Exactly one same-faction Commander outside a 26-card deck**. Four ordinary copies and two per deployable Leader remain unchanged. Named Commander IDs use the separate `commander_<faction>_<name>` namespace.
- **Ten additional Commander foundations**, all legal and immediately owned, with different card quantities and actual Mark/Sabotage/Adapt tools in the relevant foundations. The original five starters and fifteen archetype/hybrid lists remain preserved.
- A central Commander banner and guided **Faction → Commander → Foundation → Customize** flow, complete doctrine, card synergy indicators, save/duplicate/import/export/draft support and Commander Undo/Redo.
- Commander choice in normal setup; visible panels for both sides during play; cost, availability, legal-target and spent-state feedback; inspection, intro and activation presentation.
- Commander browsing, launch access and progression hooks in Collection. All launch leaders are free. The registered Commander Pack remains disabled with an explicit free-lineup/future-cosmetics explanation.
- **Fourteen tutorial lessons**, including required passive observation, guided active use and selecting between two distinct Stonewall Commander plans before final training.
- Shared Commander rules, legal actions and deck-aware AI in live play and the War Room. Exact Commander IDs persist in experiment snapshots, replays and comparisons.
- More distinct silhouettes/equipment/backgrounds and named Commander portraits; layered faction/rarity frames; readable anticipation, grow-forward, landing and settle; staged class/faction attacks; Commander stingers and effects.

## Commander design and rules

The [Commander rules reference](COMMANDERS.md) records exact catalog text, costs, targets, durations and interactions. The public source is [commanders.js](../commanders.js). These are strategic leaders, not ordinary lane cards: they occupy no slot, maintain no battlefield commitment, cannot be damaged or targeted, and do not die or retreat.

| Faction | First approach | Second approach |
| --- | --- | --- |
| Stonewall | The Warden heals forces holding friendly ground | The Marshal turns surviving defenses into counterattacks |
| Bruiser | The Breaker adds pressure from Rush/Mobile occupation | The Bloodhound punishes wounds and finishes targets |
| Syndicate | The Coordinator discounts Mark setup | The Quartermaster saves one low-cost tactical command per turn |
| Nightwalker | The Ghost protects first Precision entry and withdraws forces | The Saboteur combines suppression with temporary resource interference |
| Rogue | The Scavenger converts losses into cards and recovery | The Drifter saves movement commands and relocates pressure |

Every active spends **one Command Action** and **two available Capacity**, except The Quartermaster's Reserve Release, which spends zero Capacity. It requires the owner's offensive turn, resolved response windows, sufficient resources and a legal target. Successful use is spent for the rest of the match. Invalid actions do not consume the active or resources. Direct damage, Mark, temporary Armor, movement slots and deployment-turn readiness obey their established rules.

No existing gameplay card's printed values were rebalanced in Sprint 9. The live `sprint9` profile derives the Sprint 7 115-card pool and enables Commanders through a new rules feature. Historical profiles, including `sprint7`, retain their Commander-free behavior and inventory definitions. Commander effects are gameplay changes; rarity, frame and cosmetics remain visual.

## Foundation access and collection migration

The exact [foundation lists](commanders/deck-foundations.json) contain ten 26-card quantity lists. Their union with the five original starters grants **63 unique designs / 171 card copies**, plus **all ten named Commanders**. This grants enough copies for immediate use of either leader in each faction; it does not grant the entire 115-card pool to human Play.

The Coordinator foundation includes **two Target Designators** to teach its Mark discount. The Saboteur includes **two Blackouts** to trigger Supply Interference through Sabotage. The Drifter includes **two Field Options** to provide Adapt choices. Other distinctions come from deliberate foundation quantity shifts, rather than pretending identical lists teach different plans.

Fresh profiles keep the established **300 Credits / zero Supply**. Pre-collection migration retains the established 500-Credit path. Existing v0.9.0 collections receive only missing foundation quantities and free launch leaders through the idempotent Commander grant version; existing higher quantities, wallet, Supply, cosmetic preferences, mastery, pity, transaction receipts and pending packs are retained. Corrupt/future saves still preserve original data and block economic writes rather than silently replacing it.

Eligible human-match receipts record Commander matches, victories and signature activations alongside existing card mastery. AI self-play, War Room, guided training and developer/custom-rule operations remain outside normal match rewards. Completing the full tutorial retains the existing one-time 100-Credit reward protection.

## Deck identity and player interface

Arsenal preserves original templates and makes editable copies. The Commander flow explains passive, active and deckbuilding direction in a readable modal, displays foundation access, and offers a foundation or empty draft. Changing a Commander on an editable deck keeps its card list; both the assignment and card edits support Undo/Redo. Existing deployable Leader cards are labeled separately from off-lane Commanders.

Deck JSON remains `frontlines-deck-v1` with the added `commanderId` field. Missing legacy IDs get the faction default with a migration explanation. Explicit unavailable, empty or wrong-faction IDs remain saved as incomplete drafts with repair warnings. Names, stable saved IDs, cards and dates are retained. Normal Play still requires legality and owned quantities; legal incomplete decks remain available to the War Room.

Match setup can select a Commander separately for the current operation, without rewriting the saved deck. Both match panels expose identity, passive, signature button, costs and condition. Legal targets and relocation destinations are highlighted. Activation updates authoritative state immediately; animation represents the action and can never decide whether it happened.

War Room stays inside the game. Its duel setup can compare the same card list with different same-faction Commanders using distinct named variant IDs. Tournament setup includes a ten-foundation pool. Historical profile selection hides Commander controls and excludes Commander foundations. Saved experiment settings and snapshots retain assignments, so a reload does not silently substitute the faction default for a tested variant.

## Tutorial integration

The tutorial's first ten lessons retain the territorial/action foundation. Three explicit Commander lessons then precede the final Learning match:

1. **Meet your Commander.** The Warden is assigned and shown in the real panel. The player ends a turn and observes Hold Fast heal a wounded allied Heavy after the enemy passes and the next offensive initiative starts.
2. **Issue your signature command.** The player activates Lasting Resolve, selects the guided wounded Heavy, and sees healing, temporary Armor, resource costs and the once-per-match spent state through the actual engine.
3. **Choose how your faction fights.** The player reads both Stonewall leaders' passive/active/hook and selects The Warden or The Marshal. That actual choice leads the final training operation.

The tutorial cannot mark its full completion without these lessons. Version-1 tutorial saves preserve prior introductory progress but resume at Commander instruction when needed. Existing tutorial reward receipts prevent a new lesson version from farming currency. The field manual and tooltips support this instruction; they do not replace it.

## Presentation and audio

The shared art layer creates role-readable silhouettes, equipment, pose and background treatments with deterministic card identity. Ten portable Commander SVG portraits have their own named visual motifs. Representative atlases remain available; this is scalable illustrated/vector presentation, not a claim of 115 unique painted assets.

Faction frames now use layered materials, edge treatment, nameplates, stat plates, separated rules panels and a contained art window. Common remains readable, while Rare/Epic/Legendary gain progressively stronger accent/prestige treatment. Foil and Full-Art remain confined to safe artwork/frame regions; long text never needs to overlap the portrait.

Normal/full deployment timings are **720 / 780 / 860 / 960 / 1,060 ms** from Common through Legendary. The motion recipe expresses anticipation, scale emphasis, landing at roughly 72% and a short settle. Fast animation and Reduced/Minimal effects shorten feedback; Minimal retains a short readable effect with no particle spam. Attack recipes separate wind-up, delivery, impact and result, with stronger Heavy delivery and more precise specialist/Nightwalker signatures.

Commander intros present the name and passive; activations use signature captions, effects and sound. The existing original music themes and independent Master/Music/UI/Card Effects/Battlefield volumes remain. Trusted interaction and opt-in audio rules still apply. Layered sounds and bounded transient effects add no gameplay delays or simulation work.

## AI, instrumentation and simulation

The current Commander rules expose legal actions and exact costs through the same engine used by humans and the simulator. Commander-aware AI evaluates whether the signature action creates healing value, lethal damage, attack follow-up, capacity recovery, disruption or positioning opportunity. It can preserve a signature use when a current legal action has poor value; it does not know hidden reserve order.

**Simulator 4.0.0 / telemetry v6 / engine rules v5** snapshot the Commander catalog, versions, exact assigned decks and rules fingerprints. Match records include both Commander IDs. Summaries measure Commander decisive outcomes, seat results, active uses, activation rate/timing, passive triggers, costs, direct/effective damage, healing, card recovery, temporary Capacity recovery and disruption. Passive value has typed fields for Presence saved, Command Actions saved, bonus capture pressure and cards drawn; unlike quantities must not be added together as one efficiency score.

War Room's Decks tab includes readable Commander performance. `Simulator.commandersCSV(report)` provides a dedicated CSV, and CLI `--csv` emits `.commanders.csv` for Sprint 9 reports. `--pool commanders` selects the ten foundations. Commander and deck changes are visible experimental conditions. Replays reject incompatible rules instead of interpreting old data through the current feature.

Historical artifacts and the authorized v0.7.0 baseline remain reference evidence under their original rules. Small deterministic matches, legal-action fixtures and browser/native checks are correctness tests; they cannot establish that a Commander or faction is competitively balanced.

## Validation evidence

Final release-wide validation is recorded by the release manifest and release guide. The following targeted checks were completed while this report was written:

| Check | Evidence |
| --- | --- |
| Commander deck unit coverage | **8/8 passed** in `tests/sprint9-decks.test.js`: ten legal/distinct foundations, exact grant union, legacy migration, invalid IDs, persistence, exchange, historical isolation and seeded random legality |
| Prior deck/integration regressions plus new deck tests | **26/26 passed** across deck, Sprint 7 deck/integration and Sprint 9 deck suites |
| New guided Commander deck browser suite | **Passed**: all ten foundations owned/playable, full doctrine flow, assignment Undo/Redo, save/reload, JSON exchange, unknown repair, transparent legacy import, five viewport widths, War Room same-list variants and historical controls |
| Existing Arsenal browser regression | **Passed**: seven viewports, filters, CRUD, card quantities, original protection, recovery, import/export, live match routing, idle War Room routing and offline file launch |
| Commander deck browser evidence | `test-results/sprint9-commander-decks-browser.json`; screenshots `sprint9-commander-arsenal-{1920,1366,1280,900,390}.png` and `sprint9-commander-war-room.png` |
| Full Node/browser/native/package gate | **Passed**: 298/298 Node tests; eleven browser suites including the real 14-lesson tutorial; five packaged native modes; 83 runtime files match source; 31 frozen hashes intact. See [release guide](RELEASE-1.0.0.md) and [manifest](release-1.0.0-manifest.json). |
| Statistical Commander/faction/economy campaign | **None authorized or run for this sprint** |

The completed release gate covers Commander rules, targeting, passives, AI, onboarding, collection migration, settings, presentation and packaging. Node/HTTP-worker/offline-cooperative fixture parity is exact; migration retains old rewards and currencies. Supported-window checks include a visible mobile battlefield, both HUDs and square Commander portraits. The installer remains a local candidate until explicitly published; this sprint does not authorize installation over the owner's copy or publication.

## Known limits and playtest questions

- Commanders are a deliberately small ten-leader lineup. Later acquisition/cosmetics can use the existing collection structures; empty Commander packs are not sold.
- Commander cosmetics/mastery have persistence hooks and counters; a finished alternate-portrait acquisition loop is future work.
- Synergy indicators describe intended interactions, not optimized deck ratings or a promise of balance.
- The earlier v0.7.0 baseline recorded severe faction/preset and initiative gaps. No new statistical campaign establishes that the expanded Commander game fixes those gaps.
- Local saves are local-origin data. No accounts, servers, online matchmaking or monetization were introduced.
- Final presentation should be assessed by human pacing and readability, especially repeated signature use, compact windows and battlefield density.

## Exact proposed simulation request — awaiting owner authorization

After the candidate is stable, request **10,000 verified games across all ten Commander foundation decks**, `sprint9`, deck AI on both sides, default rules, seed `20261003`, paired reversed seats, exact mirrors off, distinct same-faction leader pairings included, **240-turn / 10,000-decision cutoffs**, and JSON/HTML/matches/cards/Commander CSV exports. No rich traces or progression awards. These ten decks produce 45 non-mirror pairings with roughly 222–224 games per pairing.

This is a proposed campaign, **not executed and not authorized by the sprint**. It measures each leader's ready foundation, not every possible Commander/custom-deck combination. A separate same-card-list Commander comparison can isolate one assignment more narrowly; it needs its own explicit settings and authorization. Do not present rates from a changed opponent pool as causal before/after results.

The exact pool consists of the foundation ID for each of the ten launch leaders: Warden, Marshal, Breaker, Bloodhound, Coordinator, Quartermaster, Ghost, Saboteur, Scavenger and Drifter. `--pool commanders` resolves those fixed IDs through the current profile:

```powershell
npm run simulate -- --mode matrix --pool commanders --count 10000 --balance sprint9 --ai deck --seed 20261003 --verify --max-turns 240 --max-decisions 10000 --out test-results/sprint9-commanders-10000.json --csv
```

Deck AI is an explicit benchmark policy; this command does not select an Expert difficulty override. The existing simulation command is ready for an owner-controlled run and is not a background job or an automatic tuning loop.
