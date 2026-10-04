# Frontlines balance history and current validation policy

## Current v0.9.0 collection candidate

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
