# Immutable Sprint 3 baseline

This archive was captured before Sprint 3 rule, AI, or balance changes. Its original runtime source, optimized assets, package metadata, and native tests are locked by SHA-256 in `manifest.json`. Original authoring assets were added before experimentation and are separately locked in `source-art-hashes.json`. The project regression suite verifies both sets of hashes.

`source/index.html` is the original playable offline build. `source/simulator.html` is its original Balance Lab. The source archive includes the supplied Electron packaging setup; installed dependencies are not duplicated. It can be inspected or run without altering the current candidate.

Evidence is kept separately:

- `reported-results.json`: the user's 10,000-match aggregate figures. Its original seed, cutoff counts, and raw records were not provided; these fields are explicitly unknown.
- `simulator-baseline-1000.json`: the earlier reproducible 1,000-match matrix.
- `playtest-results.json`: the original Sprint 2 100-match checkpoint.
- `reproduced-10000.json` and companion CSVs: a fresh pre-change-code 10,000-match matrix using seed 83947201. This batch executes the archived engine and AI, independently of ongoing candidate work.

Reproduce with a new output path; never overwrite the historical files:

```text
node docs/balance/sprint-3-baseline/source/scripts/simulate.js --mode matrix --count 10000 --seed 83947201 --out test-results/baseline-reproduction.json --csv
```

The archive retains the original seven-territory conquest, committed Presence economy, Breakthrough, starter decks, basic heuristic AI, and cutoff semantics. There is no hand-size cap, separate end-of-round action, or tie victory in those rules. Cutoffs are unresolved records, not draws.
