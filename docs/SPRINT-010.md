# Sprint 10 — v1.0.3 Balance Recovery

Frontlines v1.0.3 continues the stable v1.0.2 viewport/art build. This candidate repairs verified Rogue value loops, tactical AI defects, four weak preset compositions and action readability. It does not certify competitive balance. Private online multiplayer and the tactical expansion remain postponed until owner-run validation and human playtests establish a reliable local foundation.

The final Windows candidate is built at `C:\Users\noaho\OneDrive\Documents\ChatGPT\Faction Cards\release\1.0.3\Frontlines-Setup-1.0.3.exe`. [Installer](../release/1.0.3/Frontlines-Setup-1.0.3.exe), [unpacked app](../release/1.0.3/win-unpacked/Frontlines.exe), [release guide](RELEASE-1.0.3.md) and [verified release manifest](release-1.0.3-manifest.json) are ready. Nothing was published or installed over the owner's game.

## Evidence and preserved baseline

The supplied, owner-approved report is **interim: 46,679 / 100,000 matches**, with **46,402 decisive games, 277 cutoffs and zero reported errors**. It uses v1.0.2 / `sprint9`, simulator 4.0.0, deck/deck AI, seed 1209, paired seats and a thirty-deck pool including mirrors. It is not the final 100,000-match dataset. Cutoffs are excluded from decisive win rates; winning associations are diagnostic, not causal proof.

The preserved baseline is [sprint10-v1.0.2-baseline](balance/sprint10-v1.0.2-baseline/), including the original HTML, extracted tables, exact frozen simulation options/profile, source copies and 93 runtime hashes. [The complete change log](balance/SPRINT-010-CHANGELOG.md) records BEFORE / AFTER / WHY / DATA / INTENDED BEHAVIOR, card values/costs, Commander definitions, deck labels/lists, AI priorities and resource/capture lifecycle.

All 93 baseline runtime files, including approved artwork, are preserved and match their recorded hashes. The current Lab default is `sprint10`; saved v1.0.2 `sprint9` settings move to the new default, while other chosen historical profiles remain. Exported snapshots identify `sprint10-recovery-v1`, engine v6, AI Sprint 10 and both repaired mechanics rather than relying on a version label alone.

| Interim diagnostic | Measured result | Interpretation |
| --- | ---: | --- |
| Rogue cross-faction | 95.4% | Systemic warning across several lists |
| Rogue Scavenger / Wildcard / Field Improvisation | 97.6% / 92.4% / 97.1% | Shared faction mechanics merit inspection before individual stat nerfs |
| Scavenger / Drifter foundations | 88.1% / 60.9% | Different Commander outcomes; do not apply one indiscriminate Commander nerf |
| Rolling Breakthrough | 12.8% | Command-heavy tempo and AI sequencing failure risk |
| Coordinated Removal | 21.5% | Setup/payoff reliability and AI cost previews |
| Planned Exposure | 19.6% | Fragile deployment/advance and trick timing |
| Fortified Advance | 25.6% | Defensive command investment versus forward occupation |
| Assassination / Combined Arms / Ghost foundation | 72.0% / 68.5% / 64.9% | Strong non-Rogue watch list; no blind stat adjustment |

## Rules and faction repair

**Rogue's verified compound loop:** a destroyed unit releases its whole field commitment, enters recyclable discard, and could trigger two independent casualty draws from Nothing Wasted plus Scavenge. A cheap free-command Pull Back also returned the card, released commitment and erased all wounds; free deployment could turn that recovery into full healing. These are verified code interactions. The interim matrix motivates repair but does not prove that these two interactions account for every Rogue victory.

`sprint10` adds `RULES.salvageRecovery`. Scavenge and Nothing Wasted now share **one casualty draw per player per global offensive turn**, across both players' initiatives and all territories. A surviving, unsuppressed nearby Scavenge source gets attribution; the Commander supplies the same salvage opportunity when no nearby source survives. Routed or simultaneously dead sources cannot trigger, and the allowance cannot duplicate a reserve card.

Reclaim preserves the returned permanent's wounds in hand and on redeployment. It still immediately frees commitment, returns the same card, spends its Order cost and requires the usual legal redeployment. Repeated Pull Back cannot replace healing. Generic Ghost Extraction follows the same rule. Fresh draws and Scavenger's paid once-per-match Recover the Fallen remain healthy cards with printed redeployment costs.

**Changed cards:** Pull Back and Ghost Extraction rules text. No printed Presence, Attack, Health, Command Action costs or card effect amounts change. The shared Scavenge glossary and Nothing Wasted text explain the new rule. **Changed Commander:** only Nothing Wasted's shared-draw behavior/text. Recover the Fallen, both Drifter abilities and all other Commander mechanics remain unchanged. Historical profiles preserve their previous engine behavior and historical Commander text.

## Four preset repairs

These are changes to current built-in templates under `sprint10`, not forced rewrites of saved custom decks. Each retains 26 cards, faction, Commander assignment and strategic identity. The frozen v1.0.2 lists remain available for comparison.

| Preset | Remove | Add | Intended role repair |
| --- | --- | --- | --- |
| Stonewall — Fortified Advance | 1 Plate Medic, 1 Advance Marshal | 2 Armored Escorts | More free-command durable forward occupation and Guard/Fortify; preserve defense-to-advance identity |
| Bruiser — Rolling Breakthrough | 1 Ram Team, 1 deployable Assault Commander | 1 Breach Team, 1 Shock Runner | Reduce command-stranded deployments and support a real Rush/Mobile breakthrough window |
| Syndicate — Coordinated Removal | 1 Target Designator, 1 Cover Protocol | 1 Contract Strike, 1 Eliminator | Retain Mark setup while adding standalone direct removal and a payoff body |
| Nightwalker — Planned Exposure | 1 Decoy Patrol, 1 Shadow Handler, 1 Night Reconnaissance | 1 Ghost Marksman, 1 Surgical Strike, 1 From the Dark | More independent removal and a useful response; reduce setup-only draw dependency |

Rules, composition and AI defects can compound. These are hypotheses grounded in concrete command/role deficiencies, not claims that the presets have reached a target win rate. Assassination, Combined Arms and Ghost remain watch-list strategies; changing shared AI can also alter their outcomes.

| Investigated strategy | Primary verified or supported diagnosis | What is not established |
| --- | --- | --- |
| Rogue salvage/reclaim | D: shared faction recovery; B: Scavenger double dividend; F: casualty/recycling/healing interaction; E: reclaim forecasts | The exact share of the 95.4% aggregate explained by each fix |
| Drifter | E: public planning omitted Commander modifiers; its actual free move/relocation obeyed limits | A Commander-power defect requiring a direct nerf |
| Rolling Breakthrough | C: command-heavy preset composition; E: unusable signature/follow-up and pressure forecasts; F: action economy | A raw card-stat deficiency |
| Coordinated Removal | C: setup-heavy composition; E: Mark/Commander/discount follow-up sequencing | That Mark needs a blanket power increase |
| Planned Exposure | C: setup dependency; E: unsupported fragile advance and timing | That fragile units need universal Health buffs |
| Fortified Advance | C: defensive command load; E: support/occupation forecasts and transition to advance | That every Stonewall defender needs more Attack |
| Assassination / Combined Arms / Ghost | Aggregate card/deck/Commander/policy effects remain confounded; shared AI fixes affect them too | A causal reason for a numerical nerf or a healthy post-patch rate |
| Initiative | F: first capture and terminal ordering; E: policy/sequence interaction remains plausible | Measured benefit from a specific opening compensation |

Categories follow the directive: A card power, B Commander power, C deck composition, D faction core, E AI, F rule interaction. Multiple contributors are G. No proposed numerical stat adjustment substitutes for a missing causal result.

## AI and player testing

The current AI repair (`frontlines-ai-sprint10-v1`, gated `RULES.balanceRecovery`) makes cost-aware decisions and public-board projections match the authoritative engine, including Commander discounts, free tactical Orders, retained reclaim wounds, temporary spending, movement readiness and capture consequences. Breaker/Marshal/Coordinator avoid signatures without a usable follow-up, Quartermaster's actual free-Order window enables setup before attack, and Breaker's exact pressure protects a guaranteed capture. Unsupported lethal advances and idle reclaim loops lose priority; urgent capture/defense and worthwhile follow-ups retain exceptions. It preserves hidden-hand and reserve-order privacy. The detailed change log records seven precise tactical-policy deltas and deterministic cases; rules legality remains authoritative.

Playable/unplayable card states and target states explain action availability without changing costs or rules. Playable faces are bright/elevated; unavailable faces remain readable with the exact blocking reason on hover/inspection. Shapes/markers/borders/cursors accompany target color, and invalid targets reject clicks. Retained reclaim wounds receive damaged-health/wound treatment. Commander availability has immediate Ready / Spent / No Valid Target / Unaffordable feedback, plus Wait Turn / No Command Action.

Random Enemy selects a legal faction/deck/Commander test opponent from available built-in and legal saved lists; Random Deck keeps the chosen faction/Commander while selecting a legal list. Avoid Last Opponent records the previous launched AI configuration and uses an alternative when one exists, with a safe one-choice fallback. These are local testing controls, not matchmaking. War Room remains inside Frontlines.

The v1.0.2 battlefield fit and original artwork mappings remain protected. Cards use one 5:7 aspect ratio across hand, enemy deck inspection, Arsenal and details; optional hand/roster/detail content may scroll locally. The final populated battlefield regression passed thirteen cases, including 1920×1080, 1600×900, 1366×768 and 1280×720 plus smaller/scaled windows. Five units per side, twenty Commander variants, conquest warnings, all seven territories and essential controls remained accessible without vertical page/map scrolling. Artwork URLs, atlas quadrants, mappings and portraits remain unchanged.

## Initiative findings

Both seats receive the same starting Capacity, Command Actions and hand draw before their own first offensive action. Capacity growth and spending refresh follow their own initiatives. Deterministic fixtures verify this symmetry; the initial 6-versus-5 hand count before Player 2's first turn is not an extra draw granted only to Player 1.

Player 1 can accumulate capture progress first. Capture, forced retreat, breakthrough and terminal victory resolve immediately at an offensive turn end, before the opponent's next initiative. This is a structural first-mover risk, not measured causal proof of the full seat gap. AI corrections may affect initiative differently. **No opening compensation, capture restriction or turn-system rewrite was added** without a controlled causal result. The owner-run paired-seat matrix must report the remaining split, and human opening playtests should inspect contested access and first captures.

## Correctness and release evidence

The final normal automated suite passed **334 / 334 tests**, with zero failures, skips or cancellations (`test-results/sprint10-final-node.log`), including the last metadata-only AI regression. It includes existing rules/deck/save-load/collection/telemetry/simulator regressions and the new recovery, AI, opponent, presentation and profile tests. Historical behavior was preserved; expected live-default contracts were intentionally updated from Sprint 9 to Sprint 10, and historical Commander snapshot tests use `Commanders.forRules(oldRules)` rather than mistaking live catalog text for old rules.

`tests/sprint10-recovery.test.js` adds sixteen deterministic rules tests for shared salvage limits, both source/fallback orders, global-turn refresh, simultaneous combat/routing casualties, independent player budgets, reserve recycling/conservation, repeated reclaim, retained wounds, normal healing, fresh deployment, paid recovery, Drifter legality, historical behavior and initiative timing. All pass in the final suite. These fixtures establish correctness, not competitive rates.

`tests/sprint10-ai.test.js` adds eleven cases; the new and prior focused AI suites passed 33/33 after the final metadata edit. They cover all 115 cards and ten Commanders across five difficulties, exact cost/modifier planning, hidden-information access traps, immutable decisions, bounded planning and preserved historical AI. The current basic policy describes its recovery-aware scoring rather than claiming frozen Sprint 2 behavior; historical policy metadata remains exact. They do not establish a statistical improvement.

Three new opponent-selection tests cover legal deterministic picks, faction/Commander preservation, previous-opponent avoidance, malformed saved decks and a safe one-choice fallback. Three presentation tests cover canonical card shape, non-color legality feedback and protected art/mapping hashes; together with prior presentation tests they passed 10/10. The action/card browser suite passed ten contexts, including hand, enemy Inspect Deck, full details and Arsenal at desktop/scaled sizes, with real Commander state transitions and no runtime errors. The separate populated battlefield viewport regression passed thirteen cases after final markup changes; evidence is in `test-results/viewport-hotfix-browser.json` and `test-results/sprint10-action-presentation.json`.

Three profile/integration tests assert unchanged printed combat values/opening defaults, exactly four changed legal presets and two verified deterministic seat-swapped integration matches with correct rules/AI/Commander provenance. The two matches are correctness fixtures; their outcomes are not reported as an estimate of faction/deck win rates.

`test-results/sprint10-playtest-browser.json` passed actual Random Enemy and Random Deck interaction, faction/Commander preservation, last-played-opponent storage, Avoid Last Opponent and preference persistence, and migration of the old default Lab profile. It reports zero complete matches, zero large campaigns and no runtime errors. The populated 1366×768 battlefield and 1280×720 enemy deck inspection also received a visual overlap/readability review.

The existing presentation browser regression also passed five sizes (1920×1080, 1366×768, 1280×720, 900×600, 390×844), sixteen atlas cards, seven symbol cards and ten distinct Commander portraits, with no runtime errors. Its atlas assertion now checks intentional square artwork paint cropped inside the existing window, preserving exact URLs/quadrants/SVG checks and symbol containment. It still verifies normal 960ms deployment presentation, immediate authoritative state and clearing/cancellation behavior. Evidence: `test-results/sprint10-legacy-presentation-test.log` and `test-results/v102-browser-presentation.json`.

The full fourteen-lesson tutorial browser passed at six viewports (1920×1080, 2560×1440, 1366×768, 1280×720, 900×600 and 390×844). It observed the passive, clicked the Commander active and selected a doctrine, then completed real Learning victory/loss retry, progress persistence and Skip/Replay, with no runtime errors. Evidence: `test-results/browser-tutorial-sprint9.json` and `test-results/sprint10-existing-tutorial.log`. The guided training match is a tutorial correctness check, not a balance campaign.

The final rebuilt v1.0.3 package passed native shell smoke again: Home/Play/Settings, tutorial deployment, Commander tutorial activation, visible installed version, F11 fullscreen and Alt+Enter windowed return (`test-results/sprint10-native-shell.log`). **All 95 packaged runtime files match the tested source**, all 31 frozen Sprint 5 files remain preserved, all 39 protected art/mapping files match, and all 93 prepatch v1.0.2 runtime files in the baseline snapshot were verified. Exact installer/source hashes and evidence are recorded in the [release manifest](release-1.0.3-manifest.json). Do not interpret these correctness checks as a completed statistical campaign. No autonomous large balance campaign is authorized or run for Sprint 10.

One final packaged ordinary-match smoke also passed: Nightwalker Planned Exposure versus Rogue Field Improvisation completed in 18 turns / 108 decisions, with both Commander actives used (`test-results/sprint10-native-match.log`). This validates match completion and UI/rules integration; its winner is not interpreted as balance evidence. Sprint 10 validation therefore includes two paired Node integration matches, one native ordinary-match smoke and guided tutorial training, alongside board/action fixtures.

The v1.0.3 work is uncommitted. Checkout HEAD remains `f394c18b09862c064711a5581640bcb922ad8d5a`; this identifies the existing base commit, not a new v1.0.3 release commit. No publication or installed-game replacement is implied.

## Exact recommended owner-run validation — not executed

Ryken should run **100,000-match balanced matrix**, using `sprint10`, **seed 1209**, deck/deck AI, **both seats**, mirrors and the **same thirty deck IDs in the same order** as [frozen configuration](balance/sprint10-v1.0.2-baseline/interim-frozen-configuration.json). The [machine-readable validation options](balance/sprint10-validation-options.json) preserve this setup with the new profile. Keep maxTurns 240, maxDecisions 10,000 and verification disabled to match the supplied baseline. The normal correctness suite separately checks invariants.

| Rule | Value |
| --- | ---: |
| startingCommand / commandGrowth / commandCap | 20 / 10 / 80 |
| captureThreshold | 25 |
| startingHand / drawCount | 5 / 1 |
| slotsPerTerritory / actionLimit / victoryTerritories | 5 / 3 / 7 |

Export full JSON and HTML, match/card/Commander CSVs, faction/deck/archetype/matchup aggregates, first-player split, territory/comeback metrics and all cutoff/error counts. Keep v1.0.2 evidence separate. The four updated presets and AI/rules revisions are intentional experimental conditions; aggregate before/after changes cannot isolate any one intervention.

The exact PowerShell configuration below is a recommendation for the owner to execute; it is **not executed by this sprint**:

```powershell
$baseline = Get-Content -LiteralPath 'docs/balance/sprint10-v1.0.2-baseline/interim-frozen-configuration.json' -Raw | ConvertFrom-Json
$deckPool = $baseline.options.deckPool -join ','
node scripts/simulate.js --count 100000 --mode matrix --balance sprint10 --ai deck --seed 1209 --mirrors --max-turns 240 --max-decisions 10000 --pool $deckPool --out test-results/sprint10-owner-validation-100000-seed1209.json --csv
```

Do not add `--fixed-seats` or `--verify`; matrix pairing and default rules preserve the recorded setup. Confirm the exported options show `swapSeats:true`, `includeMirrors:true`, `verify:false`, all thirty IDs and the values above before drawing conclusions.

Review whether Rogue/Scavenger extremes decrease while Drifter remains viable, whether all four weak presets have workable matchups, whether strong non-Rogue decks become new outliers and whether the seat/cutoff gaps improve. Faction ~45–55%, decks ~40–60% and ordinary matchups ~35–65% are investigation targets rather than forced equality. Unexplained sustained 80/20, 90/10 and 100/0 results still require diagnosis. A completed final v1.0.2 report should supersede this interim baseline if the owner supplies it.
