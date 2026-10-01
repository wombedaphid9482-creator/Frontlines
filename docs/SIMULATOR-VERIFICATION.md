# Simulator verification checkpoint

## Shared rules and automated checks

All **65 tests pass**, including 17 simulator tests alongside the existing rules, integration, property, art, and effects tests. Simulator coverage checks exact counts, seat scheduling, paired seeds, mirror denominators, rule validation, cutoffs, error handling, partial reports, card counters, replay compatibility, and CSV/CLI behavior. A completed simulator match is compared directly with the unchanged engine and AI.

## Saved 1,000-match baseline

[Full JSON report](simulator-baseline-1000.json): all five faction starter decks, non-mirror matrix, seed 1009, default game rules, 240-turn and 10,000-decision safeguards. This is 50 seed pairs for each of ten matchups, reversed seats, for 1,000 total matches. Each faction has 200 first-seat and 200 second-seat appearances.

- 1,000 territory victories; zero cutoffs and zero errors.
- First player wins 534 / 1,000 (53.4%).
- Offensive turns: minimum 9, median 22, mean 26.98, maximum 182.
- Direct Node run: 10.262 seconds, about 97 matches/second on this workstation.
- CLI with invariant/inventory verification enabled: 12.06 seconds, about 83 matches/second. Its match records and aggregates equal the direct-run report exactly.
- 34,237 card plays, equal to deployments plus Orders; 19,555 initiated attacks, equal to attack actions.

| Faction | Resolved appearances | Wins | Win rate |
| --- | ---: | ---: | ---: |
| Stonewall | 400 | 220 | 55.00% |
| Bruiser | 400 | 393 | 98.25% |
| The Syndicate | 400 | 220 | 55.00% |
| Nightwalker | 400 | 84 | 21.00% |
| Rogue | 400 | 83 | 20.75% |

These are deterministic baseline-AI outcomes. Bruiser pressure is the first investigation priority; compare AI decisions and human play before changing several card values. Retain this report as the original comparison checkpoint. Runtime varies with settings and browser; invariant verification and long matches increase work.

Reproduce the checked CLI batch:

```text
node scripts/simulate.js --mode matrix --count 1000 --seed 1009 --verify --out test-results/simulator-report.json --csv
```

## Browser and launch checks

The background Worker completed the same **1,000-match matrix in 10.205 seconds** (about 98 matches/second). All individual match records and aggregate metrics equal the Node and CLI reports. A separate 24-match chosen matchup also agrees exactly between HTTP Worker and direct `file://` cooperative launch.

The browser regression verifies faction/deck selection, invalid input, disabled configuration during a run, pause/resume with stable counts and timing, stopping with 18 finalized results retained, a subsequent isolated run, JSON and both CSV downloads, readable seeded replay, unresolved safety-limit labels, and a Worker startup failure concurrent with Stop. No unexpected browser errors occurred.

Layout checks pass at 1366, 1024, 768, and 390px widths without page overflow. The [saved dashboard preview](screenshots/simulator.png) shows the completed benchmark. The simulator loads no artwork, audio, or match-animation modules. The original game and its launcher remain separate.

Optional browser regression, using an existing Playwright installation and local preview server:

```text
node tests/simulator-browser.js "<path-to-playwright>"
```

The original Sprint 2 [100-match balance checkpoint](BALANCE.md) remains intact. See the [game roadmap](GAME-ROADMAP.md) and [simulator roadmap](SIMULATOR-ROADMAP.md) for the action sequence.
