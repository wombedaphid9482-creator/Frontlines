# Sprint 3 — Balance Lab checkpoint

Sprint 3 extended the existing game rather than rebuilding it. It delivered shared engine event instrumentation, deterministic profile-isolated simulation, three AI tiers, rich replay with decision reasons, territory/economy/comeback/card diagnostics, configurable flags, HTML/JSON/CSV exports, comparisons, saved experiment settings and finished-match feedback/history. Sprint 4 added the deck-aware tier and custom deck support later.

## Baseline and diagnosis

The original source, optimized/source art, rules, AI, reports and SHA-256 manifests are preserved in `balance/sprint-3-baseline/`. The project owner's reported 10,000-match aggregate is retained separately because its seed and safeguards were not supplied. It is not represented as a verified replayable dataset.

A fresh original-build 10,000-match matrix, seed 83947201, produced 9,999 conquests, one turn cutoff and zero errors in 74.39 seconds. Original faction decisive rates were Stonewall 55.16%, Bruiser 98.00%, Syndicate 55.81%, Nightwalker 19.40%, Rogue 21.63%. Player 1 won 53.27%. The preserved instrumented 1,000-match baseline reproduces every original canonical match field exactly.

Bruiser combined cheap durability, Berserk, Command and Guard with large sustained capture commitment. Losing Nightwalker and Rogue armies often had abundant unused capacity and higher casualty refunds: insufficient occupied troops/card replacement mattered more than a lack of deployment currency. Lower Presence is not an unconditional buff: printed Presence also drives capture under a five-position limit.

The single original long match is index 5823, seed 500305256, Syndicate/Stonewall, turn limit 240. Both sides repeatedly resecured their own objective and moved full stacks with the shifting front. Its 224 reported captures were mostly objective resecuring, not 224 ownership changes. Instrumentation distinguishes ownership recaptures from resecuring. No global territory rule was changed to conceal this case.

## Measured iterations

Screens use the same 1,000-match matrix, seed 1009, 400 appearances/faction. Original heuristic is retained as explicit `baseline`. Faction-aware AI was tested without card changes before stat tuning. A failed high capture-priority AI screen dramatically harmed Nightwalker and caused four cutoffs; its results and source remain archived. Later conservative policy changes improved Rogue but did not solve Bruiser dominance.

| Card pass | Bruiser baseline / faction AI | Nightwalker baseline / faction AI | Outcome |
| --- | --- | --- | --- |
| Original | 98.25% / 97.25% | 21.00% / 16.50% | AI changes alone insufficient. |
| Iteration 01 | 97.00% / 96.75% | 33.25% / 30.75% | Health reductions alone did not break occupation synergy. |
| Iteration 02 | 92.75% / 92.00% | 28.50% / 24.25% | Selected attack breakpoints and Rogue recovery improved opportunities. |
| Iteration 03 | 87.25% / 88.25% | 26.75% / 24.25% | Higher specialist commitment alone still insufficient. |
| Iteration 04 | 61.25% / 61.25% | 72.50% / 67.00% | Removed Bruiser's universal Guard screen, reduced Heavy/Commander staying power, and enabled selected Nightwalker survival breakpoints. |

Iteration 04 screens each completed all 1,000 matches without errors or cutoffs. Its faction-AI rates were Stonewall 41.5%, Bruiser 61.25%, Syndicate 37%, Nightwalker 67%, Rogue 43.25%. This is an exploratory balance checkpoint, not proof of a finished balanced ecosystem. The archive contains the exact profiles and reports.

## Sprint 4 validation gate

Before Arsenal implementation: all 97 Node tests passed. Actual Edge verified 20 Lab matches, rich replay, exact seeded rerun, report comparison/HTML export, direct-file pause/stop and a complete 180-decision local match with 101 private handoffs and exported feedback. Zero console errors. A fresh 100-match candidate/faction matrix, seed 20261001, completed every match without errors or cutoffs.

The resulting 58-file runnable checkpoint is preserved with hashes in `checkpoints/sprint3-validated/`. Major Sprint 3 tuning stopped at this gate, as requested. Initial Electron 44 launch failed inside the managed Windows shell sandbox before loading content. Subsequent hidden native game, Lab and Arsenal tests passed outside that shell sandbox; the application retains context isolation and disabled Node integration.

Human balance validation remains outstanding. Sprint 4 uses this tooling and candidate as the starting point, adds measurable deck diversity and records further focused expansion changes in `SPRINT-004.md`.
