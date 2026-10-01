# Sprint 2 balance checkpoint

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
