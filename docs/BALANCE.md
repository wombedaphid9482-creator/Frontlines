# v1.1.0 networking preservation

Sprint 13 retains the exact Sprint 12 canonical engine, Tactical rules, 155 cards, 35 deck lists, ten Commanders and numerical configuration. Network sequencing and wall-clock reconnect expiry sit outside gameplay timing. Two-client correctness fixtures are not win-rate evidence. No large autonomous balance campaign was run and no numeric balance claim is made. Normal completed-match Credits remain 70/50 plus the first-match bonus; private matches mint no currency and record only eligible actual card use.

# Frontlines balance history and current validation policy

## Current v1.0.5 Arsenal Refinement

The default profile is `sprint12 / sprint12-refinement-v1`. All 155 printed designs, 35 decks, ten Commanders and numerical/capture rules are unchanged from completed v1.0.4. Three public-information AI defects are repaired before considering numeric tuning. [The mechanics/AI audit](TACTICAL-REFINEMENT-AUDIT.md) and [exact owner-run proposal](BALANCE-REFINEMENT-VALIDATION.md) distinguish verified correctness from unmeasured competitive balance. No large campaign ran; no v1.0.5 win rates are claimed.

The [accepted artwork checkpoint](art/SPRINT12-VISUAL-CHECKPOINT.json) preceded all policy changes. Normal completed matches now use completion-based progression (70 Credits win / 50 loss, one-time first match +50); training/developer/simulator exclusions, wallet values and duplicate-proof receipts remain. Historical analysis below is preserved and is not v1.0.5 evidence.



## Current v1.0.4 Tactical Arsenal candidate

Sprint 11 adds forty tactical cards and five showcase decks under `sprint11 / sprint11-tactical-v1`. The authoritative published v1.0.3 commit is `7f388ec66fb80f4c8d9883b3111551dd8ab0e829`; [95 frozen runtime hashes](balance/sprint11-v1.0.3-baseline/checkpoint-hashes.json) and the old catalog/rules preserve provenance. All 115 old card definitions, thirty built-in lists and ten Commander definitions remain. Direct-hit defenses interact with existing attacks/Orders/Commander damage, and Suppression constrains voluntary withdrawals; [the sprint report](SPRINT-011.md) explains every compatibility decision.

Deterministic public-action mechanic, five-faction AI/privacy, save/economy, browser/worker, training, viewport and packaged checks establish correctness. **No balance campaign ran and no new win rates are claimed.** The one-match expansion fixture is the same seed in Node and browser Worker, not independent statistical samples. Tactical coverage now includes actual protection, bounded Blast, paid preparation, destruction causes and setup/payoff counters.

The owner should first manually play the five showcases and custom variants, then run [this exact proposed 100,000-match matrix](balance/sprint11-validation-options.json) in War Room: all 35 lists, mirrors, paired seats, deck AI, seed 1209, Sprint 11, default rules and 240-turn/10,000-decision cutoffs. Separate **20 legacy / 10 Commander foundations / 5 tactical showcases**, faction, Commander, archetype, seat, matchup and mechanic exposure. Report errors/cutoffs and actual per-cell sample counts. A seat-paired full cycle has 1,225 matches; 100k is a partial-cycle endpoint. The proposal has not been executed. Comparative aggregate changes include new deck weighting and AI policy; card correlations are diagnostic rather than causal nerf instructions.

Priority manual watch points are cheap Cover/evasion, paid area damage, Mark/Exposed burst, Overwatch route pressure, Hold Fast conversion and Mine/Sacrifice timing. Rogue's one shared casualty draw and retained reclaim wounds stay enforced. Historical evidence below is preserved and must not be presented as v1.0.4 validation. [The release manifest](release-1.0.4-manifest.json) records final checks and hashes.

## Current v1.0.3 Balance Recovery candidate

Sprint 10 preserves v1.0.2 artwork and battlefield fitting, freezes the previous rules and implements targeted recovery repairs under the new `sprint10` profile. Scavenge and Nothing Wasted share one casualty draw per player/global offensive turn. Reclaim retains wounds through redeployment. Four weak hybrid templates change composition; public-board AI cost/sequence/projection defects are corrected before broad stat buffs. Card Presence, Attack, Health, traits, effect amounts and printed Command Action costs remain unchanged. Drifter and the turn system remain intact.

The [v1.0.3 release candidate](RELEASE-1.0.3.md) is built and verified: 334/334 automated tests, thirteen populated battlefield viewport/scaling cases, ten action/card contexts, random-opponent persistence/default-migration checks, full tutorial at six viewports, legacy presentation at five viewports and final packaged shell/ordinary-match smoke passes. All 95 packaged runtime files match source; protected art and historical snapshots remain intact. These are correctness results, not new competitive win rates. Exact evidence/hashes are in the [release manifest](release-1.0.3-manifest.json).

The owner-approved balance evidence is **interim 46,679 / 100,000 matches: 46,402 decisive, 277 cutoffs, zero reported errors**, v1.0.2 / `sprint9`, seed 1209. Rogue cross-faction 95.4%, Scavenger list 97.6%, Wildcard 92.4%, Field Improvisation 97.1%, Scavenger foundation 88.1% and Drifter foundation 60.9% motivate different rule/Commander findings. Rolling Breakthrough 12.8%, Coordinated Removal 21.5%, Planned Exposure 19.6% and Fortified Advance 25.6% expose composition and sequencing risks. These are not final 100,000-match results and do not prove human balance or a causal effect of any one repair.

[Sprint 10](SPRINT-010.md) and the [complete traceable change log](balance/SPRINT-010-CHANGELOG.md) identify every changed card text, Commander rule, deck and AI policy, preserved baseline inventories, initiative findings and validation boundaries. The original report/options/source/hashes are in [the frozen v1.0.2 baseline](balance/sprint10-v1.0.2-baseline/). Historical profiles retain their original mechanics rather than silently adopting the new recovery rules.

**No autonomous large post-patch campaign was run.** Ryken controls the next run. Recommend the same thirty-deck, mirror-inclusive, both-seat 100,000-match matrix under `sprint10`, deck/deck AI, seed 1209, max 240 turns / 10,000 decisions, original 20/10/80 Capacity and 25 capture defaults. Keep unfinished counts visible and export JSON/HTML/match/card/Commander CSVs. The exact owner-run command/configuration is in [Sprint 10](SPRINT-010.md#exact-recommended-owner-run-validation--not-executed).

The healthy ranges remain investigation targets, not instructions to force 50%: approximately 45–55% faction, 40–60% deck and 35–65% ordinary matchup. Strong Assassination, Combined Arms and Ghost remain watch-list entries. First-mover capture/terminal ordering remains unresolved; equal own-turn opening resources do not remove this structural risk. Competitive stabilization and human readability validation precede private online multiplayer and tactical expansion.

## Preserved v1.0.0 Commander candidate

Sprint 9 adds ten distinct Commanders to the `sprint9` profile. All 115 battlefield card definitions remain unchanged; Commander modifiers change effective costs, targeting, capture pressure and AI priorities. Commander aggregates, per-match usage and replay fingerprints are recorded by the shared simulator. Correctness fixtures cannot certify Commander, faction or human balance. No new large balance or economy campaign has been run. The exact ten-foundation validation proposal is in [Sprint 9](SPRINT-009.md) and requires Ryken’s separate authorization.

## Preserved v0.9.0 collection candidate

Sprint 8 adds ownership, earned Credits, packs, Supply crafting, mastery and presentation around the existing `sprint7` combat profile. No combat statistics, effects, Command Action costs or AI policies changed since v0.8.0. Human decks require owned copies; AI and War Room retain unrestricted legal inventories. Rarity and cosmetics provide no gameplay bonuses. No new balance or economy campaign ran. [Sprint 8](SPRINT-008.md#exact-simulation-request-for-ryken--not-executed) records the exact proposed next validation, awaiting separate authorization.

### Preserved Arsenal balance evidence

The authorized v0.7.0 baseline completed **10,000 decisive matches, zero errors or cutoffs**, with original ten presets, deck AI, paired opening seats and seed 20261003. Cross-faction rates: Stonewall 44.89%, Bruiser 43.67%, Syndicate 58.75%, Nightwalker 69.93%, Rogue 32.77%; first player 57.05%. Six pairings exceeded 90–10. The environment fails the standing approximately 45–55% cross-faction target; a working build does not certify competitive balance.

[Preserved baseline](balance/SPRINT6-BASELINE.md) records configuration, raw results, independent audit, source checkpoint and hashes. Use byFactionCross for faction comparisons. All-appearance deck rates include same-faction variants. Card/pair winning associations are hypotheses, not causal tuning instructions. The Sprint 5 competitive gate also failed; its reports remain historical.

The new sprint7 / sprint7-arsenal-v1 profile adds 35 cards, four mechanics and five hybrid templates. It preserves all 80 existing cards and original starter/preset lists. Its only correction to an existing card is **Silencer Team deployment: 0 → 1 Command Action**. Presence, stats and Rush/Precision remain. This restores an opportunity cost for a major specialist deployment; it does not establish that Silencer caused all Nightwalker dominance or that the environment is fixed.

**No additional balance campaign ran after the authorized baseline.** Unit, deterministic, browser and native smoke fixtures verify correctness. Ryken controls subsequent jobs. [Sprint 7](SPRINT-007.md#simulation-request--after-the-stable-candidate) requests two separately authorized 10k jobs: original ten presets for comparison, then expanded fifteen for new content. Different opponent weighting prevents a causal aggregate comparison. No 50k run is implied.

Priority risks include weak presets, initiative, late Capacity saturation, static assets trapped on capture, cheap aura/recovery compression and new combinations. Human play and exposure-aware analysis precede broad tuning. [Arsenal 007](ARSENAL-007.md) explains designs, costs and counterplay.

## Historical checkpoints

## Current v0.5.0 checkpoint

The sections below preserve Sprint 2 measurements. Current evidence is in [Sprint 3 diagnosis](SPRINT-003.md), [Sprint 4 report](SPRINT-004.md), and [card design/iteration notes](arsenal/CARD-DESIGN.md).

Sprint 4 validated the final ten-deck pool in two fresh 10,000-game batches, seeds 20261005/20261006, Arsenal v3, deck-aware AI v2. Every game ended in conquest; zero errors/cutoffs with conservation and invariants checked after every action. Median 23 turns, mean 27.23, P95 59. Player 1 won 54.18%/54.46%.

| Faction | Batch A | Batch B | Main concern |
| --- | ---: | ---: | --- |
| Stonewall | 50.1% | 50.4% | Counteroffensive 54–55%, Bastion about 46%. |
| Bruiser | 54.0% | 52.2% | Aggregate hides Heavy 79% versus Shock 26–28%. |
| Syndicate | 47.6% | 47.1% | Combined 61% versus Precision 33–34%. |
| Nightwalker | 62.7% | 64.1% | Assassination 69%; Sabotage 57–59%. |
| Rogue | 35.5% | 36.3% | Both Scavenger/Wildcard around 35–37%; investigate card replacement and tactical sequencing. |

Distinct strategies and configurable lists are implemented; equal competitive viability is not established. Heavy versus Shock and Rogue, and Assassination versus Shock, remain pronounced pairing warnings. These results measure the current policies and preset pool, not human balance. More stat changes solely to force 50% would risk overfitting. The next pass pairs human feedback with replays and AI-tier comparisons before modifying the economy or initiative.

Exact profiles, earlier preset versions, four 1,000-match screens and both final HTML/JSON/CSV reports are preserved in `arsenal/` and `balance/`. They retain explicit decks, seeds, versions, descriptive intervals, card/pair metrics and outcome denominators. Historical original source and results were never overwritten.

The presentation sprint keeps the existing card statistics and territory rules. The seeded CPU benchmark is a rules stability check and a signal for future human playtests; it cannot establish competitive balance because the baseline CPU evaluates different faction tools with the same fixed heuristic.

## Current default configuration

Command Presence starts at 20, grows by 10 on each later offensive turn, and caps at 80. Players receive three major actions per offensive turn. Five allied cards fit in each territory. Capture requires 25 Presence, and conquest requires the enemy command territory or all seven territories.

## 100 seeded matches

All 25 ordered faction pairings, including mirror matches, ran four seeds each. The full reproducible results live in `playtest-results.json`; run `npm run playtest` to refresh them.

| Measure | Result |
| --- | ---: |
| Complete conquest matches | 100 / 100 |
| Offensive turns: minimum / median / maximum | 9 / 24 / 90 |
| Mean offensive turns | 30.1 |
| First player victories | 49 / 100 |
| First center captor victories | 50 / 100 |
| Captures | 880 |
| Defensive reversals | 392 |

Non-mirror faction results:

| Faction | Victories | Matches |
| --- | ---: | ---: |
| Stonewall | 17 | 32 |
| Bruiser | 31 | 32 |
| The Syndicate | 17 | 32 |
| Nightwalker | 6 | 32 |
| Rogue | 9 | 32 |

The first-player and center-capture numbers show that early control can reverse. Bruiser's result is a strong tuning signal. Nightwalker and Rogue require a closer look at both their card economy and CPU use of Precision, Mobile, Retreat, and Reclaim before changing statistics.

## Rules robustness

`npm test` includes 10,800 mixed random/CPU legal decisions across all faction pairings and six configurations. These include low capacity, no growth, no draw, small slot limits, and larger hands/action allowances. Each decision independently checks card conservation, Presence accounting, legal actor ownership, reaction costs, one-territory frontline movement, and input immutability. Consumed cards and completed response windows cannot be replayed.

## Focus for the next balance pass

1. Compare human Bruiser matchups with the CPU benchmark, then tune only after confirming whether its current capture pressure is excessive.
2. Record Nightwalker and Rogue human decisions around deployment commitments, specialist trades, and recovery Orders; determine whether weak benchmark results come from cards or CPU valuation.
3. Review the longest matches and measure actions between captures to identify prolonged territory reversals that remain legal but feel slow.
