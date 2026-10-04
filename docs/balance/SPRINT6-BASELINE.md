# Authorized v0.7.0 baseline — 10,000 matches

Completed 2026-10-03. All 10,000 matches decisive, zero runtime errors or cutoffs. Independent recomputation reconciles faction/deck/seat/territory/economy totals. 5,000 paired seeds, 45 deck matchups, 222–224 matches per matchup; exact deck mirrors off, same-faction distinct archetypes included.

| Cross-faction result | Wins / appearances | Win rate |
|---|---:|---:|
| stonewall | 1598 / 3560 | 44.89% |
| bruiser | 1553 / 3556 | 43.67% |
| syndicate | 2089 / 3556 | 58.75% |
| nightwalker | 2484 / 3552 | 69.93% |
| rogue | 1164 / 3552 | 32.77% |

First seat won **57.05%**. Mean match length **26.36 offensive turns**, median 22, 95th percentile 53, maximum 160. Strongest presets: Assassination 78.68%, Combined Arms 78.05%; weakest: Shock Assault 20.70%, Scavenger 31.43%. Six matchups exceed a 90–10 split; Shock Assault wins just 5/222 versus Assassination. This baseline does **not** meet the parity/counterplay target.

The economy remains coherent: 461,915 Command Actions spent, 269,546 free card plays, 60,167 forced retreats and 4,248 forced eliminations. Mean unused end-turn Capacity 46.49–50.45 indicates late saturation or hand/command bottlenecks; this does not justify a universal Capacity increase. Territory, card, and resource totals were audited without running additional matches.

Sprint 7 applies one narrow candidate correction: Silencer Team deployment changes from 0 to 1 Command Action in the new sprint7 profile. Its stats, Presence and Rush/Precision signature remain. This restores a major specialist deployment opportunity cost; the run cannot establish that this card caused all Nightwalker dominance, or prove that this correction fixes balance. Broader preset and initiative problems remain identified for validation.

The archive [sprint6-baseline-v070.zip](sprint6-baseline-v070.zip) contains the full immutable configuration/results, HTML, CSVs, log and independent audit. [Structured summary](sprint6-authorized-10000-summary.json) records hashes and all detailed audit results. [Source checkpoint](../checkpoints/sprint7-entry-v0.7.0.zip) preserves the actual uncommitted tested v0.7.0 runtime, for replay under its original implementation. The original installer/manifest remain in release/0.7.0 and docs/release-0.7.0-manifest.json.

Interpretation limits:

- Cross-faction rates exclude 1,112 same-faction matches; deck rates include them.
- Deck policy with no live difficulty override: this is not an Expert difficulty validation.
- Paired deterministic seeds are descriptive trials, not independent human samples.
- Card/pair winning associations do not establish causal strength.
- Pair final territory swing is absolute final territory minus starting three, not an event-level swing.
- Comeback exposure includes terminal observations; do not interpret as a clean pre-terminal comeback rate.
- First-capture timing is match-level and copied to both participating factions.
- No follow-up balance simulation is authorized.
