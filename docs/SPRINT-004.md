# Sprint 4 — Custom Deckbuilding + Expanded Arsenal

Frontlines **v0.5.0** is a runnable local playtest candidate with an Arsenal, named custom decks, expanded faction strategies and deck-level Balance Lab analysis. It preserves the territory/Presence game and original starter lists. It does not claim completed human validation or equal competitive strength for every strategy.

## Validation before expansion

The Sprint 3 gate passed 97 automated tests, an actual complete browser match with private handoffs, rich Lab/replay/export checks and a 100-match quick simulation with no errors or cutoffs. The resulting 58-file runtime/test checkpoint is immutable and hash-verified in `checkpoints/sprint3-validated/`. Historical source, authoring art, AI and original results also remain in `balance/sprint-3-baseline/`. See `SPRINT-003.md` for diagnosis and preserved exploratory tuning.

## Delivered systems

- Shared deck rules: exactly 26 cards, one faction, max 4 regular copies/max 2 Leader copies. Unique remains a deployed singleton. No acquisition/rarity restrictions or extra composition quotas.
- Standalone Arsenal: illustrated catalog, type/cost/keyword/role filters, search/sort, detailed rules/flavor/keyword inspection, copy counts, Presence/type curves, named local saves, rename/duplicate, confirmed deletion, random legal decks and validated JSON import/export.
- All five original starters plus ten read-only archetype presets. Editable copies preserve the source. Illegal or outdated lists remain explained repairable drafts; local-storage failures do not crash play.
- Actual saved lists in live setup and immutable rematch/report snapshots. Hot-seat privacy remains intact; human reports include selected decks and optional feedback. Fixed a victory timer that previously erased a feedback form during rerender.
- Twenty new cards, four per faction, bringing the pool to 80. Exact Retaliate, Sabotage and Scavenge mechanics share the authoritative engine and event hooks. All additions have role, tradeoff and counterplay notes in `arsenal/CARD-DESIGN.md`.
- Deck-aware AI reads its own declared strategy and visible board only. It values tactical roles, recovery and combinations; the Sabotage heuristic requires a useful legal offensive follow-up rather than suppressing a Medic that will recover before healing.
- Deck-vs-deck Lab runs, selected-pool round robin including same-faction variants, deck/archetype/seat rates, composition, card usage, played-pair associations and report/named-variant comparisons. Workers receive explicit deck lists; replay never looks up a changed local library.
- Detailed tactical terrain, faction ownership/capture accents, explicit art-role mapping for expansion cards and a matching desktop icon. Representative faction atlas portraits are reused; individual final illustrations remain replaceable. Desktop and 390px populated hand/inspector layouts verified.

## Faction approaches

| Faction | First approach | Second approach |
| --- | --- | --- |
| Stonewall | Bastion: Guard/Fortify, fixed support and attrition. | Counteroffensive: retaliation, surviving-force recovery and controlled advance. |
| Bruiser | Shock Assault: Rush/Mobile with fragile Command support. | Heavy Breakthrough: expensive occupation, supported finishers and demolition. |
| Syndicate | Combined Arms: distinct Guard, recovery and Command jobs. | Precision Operations: selected targets, mobile Precision and timed suppression. |
| Nightwalker | Sabotage: short ability windows and mobile coordinated pressure. | Assassination: Guard bypass, removal and planned extraction. |
| Rogue | Scavenger: surviving salvage sources replace lost options. | Wildcard: mobility, Precision, healing, Rally and Reclaim adapt to the board. |

Archetype declaration configures AI intent; it grants no rule bonus and does not constrain deck legality. Human strength of these approaches is not yet established.

## Focused expansion decisions

Four preserved 1,000-match screens use seed 20261004. The first exposed Heavy Breakthrough93.5%, Precision13.5% and Sabotage28.3%. Rupture Heavy's Arsenal Health7→5 introduces a selective-removal breakpoint while preserving its10-Presence finisher role. Sabotage timing correction reduced Signal Lock170plays/12observed combat windows to15/13, and Blackout276/39 to42/29.

Watchguard and Recovery Column would have strictly upgraded original same-cost cards. Each now trades one Health for Retaliate or Mobile in the Arsenal profile. Precision/Sabotage lists gained occupation instead of indiscriminate stat buffs. Counteroffensive gained sturdier recovery/late anchors and fewer fragile mobile bodies; Shock gained two regular Heavies while keeping twelve Rush units. Exact earlier profiles and lists remain in `arsenal/arsenal-v1.json`, `arsenal-v2.json` and `deck-presets-v1/v2.json`.

The final screening pass completed all 1,000 matches, no errors/cutoffs: Counter54%, Heavy79%, Shock28%. Its report and all prior findings remain available; weak decks were not hidden by faction aggregates.

## Final standard validation

Two fresh **10,000-match** batches used the same final ten-preset pool, Arsenal profile `sprint4-arsenal-v3`, deck AI `frontlines-ai-sprint4-v2`, seeds20261005 and20261006. Both checked engine invariants and card conservation after every decision. **20,000 conquests, zero errors and zero cutoffs.** Each took about 219 seconds while running concurrently. Counts are total games across45 pairings, both seats; incomplete schedule cycles create small exposure differences (about 1,998–2,008 appearances/deck).

| Deck | Batch A | Batch B |
| --- | ---: | ---: |
| Stonewall Bastion | 45.9% | 45.7% |
| Stonewall Counteroffensive | 54.4% | 55.1% |
| Bruiser Shock Assault | 28.3% | 25.6% |
| Bruiser Heavy Breakthrough | 79.8% | 78.9% |
| Syndicate Combined Arms | 61.6% | 60.9% |
| Syndicate Precision Operations | 33.7% | 33.3% |
| Nightwalker Sabotage | 56.8% | 59.1% |
| Nightwalker Assassination | 68.7% | 69.1% |
| Rogue Scavenger | 35.9% | 36.6% |
| Rogue Wildcard | 35.0% | 35.9% |

Player 1 won 54.18% /54.46%; mean 27.23 offensive turns, median 23, P95=59; maximum 141/178. Faction rates were Stonewall50.1/50.4%, Bruiser54.0/52.2%, Syndicate47.6/47.1%, Nightwalker62.7/64.1%, Rogue35.5/36.3%. These averages conceal the important Bruiser deck gap. Heavy defeated Shock in 91.4/92.8% of222-game pairing samples; Shock versus Assassination was 3.2/5.0%. Competitive counterplay for those matchups is unresolved.

Full metrics, Wilson descriptive intervals, deck/seat results, card flags, curves, territory, economy, comeback and pair observations are in [batch A HTML](balance/sprint4-validation-10000-a.html) / [JSON](balance/sprint4-validation-10000-a.json) and [batch B HTML](balance/sprint4-validation-10000-b.html) / [JSON](balance/sprint4-validation-10000-b.json). Paired deterministic AI samples are not independent human trials; played-card/pair win association is not causal evidence.

## Verification and release

All 123 Node tests pass, including original behavior, new keywords, exact custom inventory, persistence/import failure handling, hidden-information independence, telemetry and seeded replay. Browser suites verified an89-decision complete custom match;20 custom duels and a90-game/45-pair tournament; Worker/Node/offline equality; all 1,000 original canonical match records; privacy, feedback preservation, rematch, sound/effects cleanup and four viewport sizes. No browser console errors. A further complete effects match exercised360decisions and39 death replays.

The NSIS installer and runnable Windows folder were built with publishing disabled. Packaged game/Lab/Arsenal smoke tests all exited0: complete 67-turn/304-decision game,20-preset Lab run and80-card/26-card Arsenal startup. Runtime assets/source matches are verified against ASAR; source artwork, reports, tests and historical archives are excluded. Existing `dist`/v0.3.0 output is preserved. See `RELEASE-0.5.0.md`.

## Known issues and next actions

1. Strategic approaches are distinct and playable, but two equally competitive choices per faction are **not yet proven**. Shock, Precision and Rogue trail under current AI; Heavy and Assassination remain favored. Human playtesting and AI sequencing review take priority over forcing all rates toward50%.
2. Opening-seat advantage around54% warrants human/paired scenario investigation. No global economy, capture or initiative rules were changed during expansion.
3. Art is a coherent representative pipeline; final individual expansion portraits remain future polish. No online play or synchronized remote match setup was added.
4. Deck/history storage is local and origin-specific. Export/import is the supported transfer path. Compact deck codes and automatic strategy detection remain deferred.
5. Pair analytics are early correlations, not a causal synergy model. Cutoffs can still occur in unusual legal configurations; safeguard reporting remains explicit.

Active follow-up plans are in `GAME-ROADMAP.md` and `SIMULATOR-ROADMAP.md`. Owner/external playtests have not been fabricated or substituted with AI results.
