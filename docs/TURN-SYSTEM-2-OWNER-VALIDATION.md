# Owner-run paired timing comparison — prepare, do not execute

This is the comparative validation plan for Sprint 15. It has **not been run**. Implementation and correctness checks must finish first; Ryken separately decides when to execute the balance campaign. Do not tune card numbers from bounded migration smoke fixtures.

## Frozen comparator

Baseline is the released v1.2.0 source at commit `0622bec95175f2204a3eb1b54e6b7c95a9dab07e`, frozen in `docs/balance/sprint15-v1.2.0-baseline/source/` and verified against all 242 packaged runtime source hashes. Its engine, AI, cards and telemetry must execute from that frozen tree. Selecting historical `sprint12` in the new build alone is useful for unit compatibility but is not an exact v1.2 AI/build comparator.

Candidate is v1.3.0 profile `sprint15`, with the same printed card numbers and preset composition. Export complete new schema-2 report alongside original legacy schema-1 report. Never halve old report fields or relabel an old action-window duration as paired Turns.

## Exact primary configuration

| Setting | Both versions |
| --- | --- |
| Mode | Matrix, all 35 preset decks, including mirrors |
| Matches | 24,500 per version; 49,000 total owner-run matches |
| Seat assignment | Paired starting seats; reuse the same seed for each swapped pair |
| Seed | 1209 |
| AI | Deck policy, normal difficulty; each version uses its own correct timing-aware implementation |
| Turn cutoff | v1.2: 240 legacy Action Windows; v1.3: 120 paired Turns |
| Work cutoff | Explicit maximum 240 normal Action Windows |
| Decision cutoff | 10,000 per match |
| Invariants/conservation | Enabled |
| Profile | Frozen `sprint12` baseline vs current `sprint15` candidate |
| Output | Full JSON, HTML, match/card/Commander CSV; never overwrite original report |

24,500 is 20 full 1,225-cell schedule cycles, avoiding the partial-cell exposures of a 100,000-match endpoint. Actual scheduled exposures still must be reported, especially mirror cells and seat pairs. Twenty matches per ordered cell are a screening signal, not a precise matchup win-rate estimate.

Review errors and unfinished/cutoff games first; treat them as unfinished, never inferred wins. Compare decisive faction/deck/Commander rates, starting-seat impact, match length in explicit Action Windows, resource/commitment flow, territory progression/capture frequency, comeback rate, casualty-draw use and tactical status expiry. Paired Turn averages may be compared within v1.3; a v1.2-to-v1.3 Turn delta has incompatible units and must be omitted. Keep twenty legacy presets, ten Commander foundations and five tactical showcases distinguishable.

## Targeted human and follow-up validation

Before broad balance conclusions, Ryken/Wyatt should play both starting seats using defensive Stonewall, aggressive Bruiser, selective Syndicate, disruption Nightwalker and casualty/recovery Rogue lists. Confirm that FIRST has provisional pressure, SECOND can contest it, and actual capture occurs once after both windows. Deliberately test Hold Fast from FIRST, Suppression applied before SECOND, shared Scavenge/Nothing Wasted across the pair, and saved/reconnected Commander state.

Use the first full report to select specific suspect matchups, then authorize larger matched-seed runs for those cells. Do not automatically force every deck to 50%, and do not nerf a combo based only on correlation. Record any numeric tuning separately after this timing candidate.

## Execution readiness

Exact owner commands and verified option JSON will be appended after the CLI/state migration passes. Until then this file is a plan, not evidence of a completed campaign. No large simulation or publication was executed to create it.
