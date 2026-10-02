# Sprint 2 balance checkpoint

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
