# Sprint 5 balance investigation and iteration record

Status: experiments remain in progress. The live default remains Arsenal. No experiment has been promoted; no release gate is claimed.

## Frozen current-build baseline

The untouched v0.5.0 runtime, data, AI, decks and profile are frozen in `sprint5-baseline-source/` with 31 SHA-256 hashes. Fresh 50,000-game baseline: Arsenal v3, deck-aware AI v2, ten existing presets, 45 unordered pairings, paired seating, seed 20261007, invariant/card-conservation checks each decision. Result: 50,000 territorial victories, zero errors/cutoffs, 805 seconds. Original authoring cards and starter lists remain intact.

Faction rates **against other factions**: Stonewall 50.174%, Bruiser 52.711%, Syndicate 48.503%, Nightwalker 66.138%, Rogue 32.472%; spread 33.666pp. Historical all-appearance rates including same-faction variants: 50.155%, 52.409%, 48.670%, 64.346%, 34.419%. Mirror variants cannot dilute the gate.

Deck baseline: Bastion 45.534%, Counteroffensive 54.776%, Shock Assault 25.879%, Heavy Breakthrough 78.966%, Combined Arms 62.302%, Precision Operations 35.034%, Sabotage 59.234%, Assassination 69.458%, Scavenger 34.944%, Wildcard 33.894%. First player 54.010%. Shock Assault versus Assassination 3.867%; Heavy versus Shock 92.896%. Faction averages conceal unacceptable archetype disparity.

## Method and audit correction

Development screens use 10,000 matches with identical baseline seed, lists and seat schedule. Isolated source prevents halfway-updated runtime contamination. Original JSON/HTML/CSV reports retain compiled cards, rules, AI versions and seeds.

**Independent compiled-card audit caught a builder defect before promotion.** Initial per-card overrides were replaced rather than field-merged. `blade-health3` changed Presence 4→3 **and** Health 4→3. `rupture-attack4`, `rupture-presence7`, `rupture-presence12` also restored Health 5→7. Earlier isolated-stat descriptions and causal conclusions are rejected. The original reports remain unchanged. All early combined candidates inherited Presence-3 Blade until candidate04 explicitly restored Presence 4. None entered the live profile.

The corrected builder merges individual fields and asserts the complete compiled card pool, rules and starter lists against precisely the requested delta. Regression tests preserve Blade Presence 4 and Rupture Health 5. Corrected hypotheses record `compiledDataDiffVerified:true`; regenerated actual-deltas and source hashes describe the precise folder, not its parent. Comparing descriptions or IDs alone is insufficient.

Instrumentation is observational: all first 10,000 compact match records exactly match the frozen baseline (`sprint5-instrumentation-parity.json`). Baseline retains simulator 3.0.0/telemetry v2. Extended diagnostics use simulator 3.1.0/telemetry v3; deck AI action policy remains v2.

## Silent Blade: actual observations

ID `nightwalker_blade`, Arsenal Presence 4 / Attack 4 / Health 4 / Precision. Assassination has three copies; Sabotage has none. Fresh 50k: 29,670 draws, 29,843 plays, 119,372 Presence paid, 22,323 kills, 34,052 capture contributions, 323,548 pressure, 151,883 raw damage. Mean play initiative 20.613; pressure/Presence 2.710; raw damage/Presence 1.272.

Denominators: 9,996 Assassination player-game appearances, 19,992 all Nightwalker appearances, 18,882 unique games containing Nightwalker. Plays/Assassination appearance **2.986**; plays/all Nightwalker appearance including Sabotage's zero copies **1.493**; plays/unique Nightwalker game **1.581**. Same-faction games have two faction appearances. Ghost Extraction returns existing copies without a reserve draw, explaining plays exceeding draws.

Baseline conditional win: when drawn 69.352% (9,795); played 68.661% (9,528). Observed 10k adds: drawn 68.789% (1,948), played 68.053% (1,900), at least two plays 67.210% (1,656), never drawn 72.000% (only 50; uncertain). Whole Assassination deck 68.869%. These are associations, not causal card strength.

Mean actual AI-selected deployment score 15.844; margin over next legal action 5.882. Four-offensive-initiative deployment windows: net territory delta +0.011 (5,436 complete, 500 censored); capture-event delta +0.603. Recaptures are events, not net ownership, and team outcomes can be shared by multiple cards. When-played matchup association varies from 98.598% versus weak Shock Assault to 28.095% versus Combined Arms and 44.495% versus Heavy. Sabotage wins 59.709% without any Blade, contradicting a universal one-card diagnosis.

## Decisions and corrected candidates

Useful genuinely isolated screens include Surgical Strike damage 5→4, Rupture Health 5→4, stronger Assault Squad/ Shock Runner survival and Rogue selective removal/recovery. Raw conditional win rate is never an automatic nerf rule.

Command cap 30/40/50 screens produced 21/25/1 unfinished matches and failed faction/archetype requirements; all rejected. The Heavy-versus-Rogue trace demonstrates unused late-game currency, but confounded Rupture-cost screens cannot prove a causal cost effect. Global economy, territorial objectives and action counts remain unchanged.

Candidate03-strike4 cross rates 49.24/49.38/51.52/46.85/53.01%, decks 43.99–57.20%, worst matchup 25.23%. Spread 6.17pp and first-player 55.98% fail. It inherited Blade Presence 3 and strict card-choice defects; not releasable.

Candidate04 restores Blade Presence 4 and real choices: Lancer Presence 6/Health 5/Precision+Mobile vs Skirmisher Presence 5/Health 5/Mobile; Siege Heavy Attack 4/Health 6 vs Breach Team Attack 5/Health 5/Rush; Overrun Presence 3/damage 4 vs Demolition Presence 5/damage 5. Cross rates 47.28/56.19/49.38/47.04/50.11%, decks 42.84–58.05%, first-player 55.66%, zero errors/cutoffs; fails Bruiser/seat gates.

Truly isolated Blade Health-3 (Presence 4 retained) drops Nightwalker 40.88%, Assassination 39.84%: reject. Lancer Presence-6/Health-6 instead of Health-5 raises Rogue 53.94% while Bruiser remains 55.12%: alternate tested, unaccepted. Next screens: Overrun Presence 4; explicit one-card Player-2 opening reserve draw; combination. Opening compensation draws from the existing legal reserve, never creates a card, and requires explicit profile/rules metadata and conservation before adoption.

Command stacking is published and targetable. Four Handlers plus Veil Commander commit 27 Presence, five deployments and all allied slots; Handlers each attack 6, Commander 8. Suppression removes outgoing bonuses, not incoming auras. This is not an engine bug. A legal four-Handler custom-deck test against ten settled presets plus matched replacement control remains required. Preset success cannot establish balance of all custom decks.

## Final acceptance and limitations

Mandatory: independent-seed 50,000 complete games; zero errors/cutoffs; five cross-faction rates 45–55%; preferred spread ≤5pp; ten deck aggregates 40–60%; first-player 45–55%; all 45 matchups with ≥200 observations, none beyond 90–10. Matchups beyond 80–20 explicitly flagged even if mechanical gate passes. Confidence intervals and matchup-specific counters remain visible; every deck need not be 50%.

No default profile has changed. Final candidate, exact changes, 50k results and aura-stress findings will be appended. Human counterplay and wider custom-deck diversity still require external playtests.

Opening reserve draw completed: first-player 40.12% (versus 55.66% control), all 10,000 decisive. Rejected for reversing the bias. Overrun Presence4 alone has little impact (Bruiser 56.05%, P1 55.68%). Neither promoted. New minimal cards-only screens test Assault Squad Health4, Siege Presence6/Health5 and their combination; original rules remain unchanged.
