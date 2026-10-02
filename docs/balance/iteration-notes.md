# Sprint 3 balance iteration notes

Historical Sprint 2 source and reports are preserved in [sprint-3-baseline/](sprint-3-baseline/). Card definitions in `data.js` are unchanged. Central profiles in `balance.js` and `balance/*.json` explicitly describe candidate overrides, and tests check offline registry/JSON equivalence.

## Measurement method

Exploratory screens use 1,000 matches, matrix mode, seed 1009, ten non-mirror matchups, 100 games per matchup, and both seat orientations. Each faction has 400 player appearances. Win rates exclude unresolved turn/decision cutoffs and errors from the decisive denominator; counts remain visible. Wilson intervals are descriptive because deterministic paired AI trials are not independent human observations. Release validation uses larger independent seeds and human evidence.

## AI-only control — original policy

Hypothesis: the modern engine/profile factory must preserve the historical heuristic before any balance attribution is credible.

Change: none to cards, decks, rules, or scoring. The original scoring body and tie order remain the default and explicit `baseline` AI profile. New factories isolate data and engine references.

Result: [ai-only-baseline-1000.json](ai-only-baseline-1000.json), 1,000 decisive results, 0 cutoffs, 0 errors. Stonewall 55.00%, Bruiser 98.25%, Syndicate 55.00%, Nightwalker 21.00%, Rogue 20.75%. Mean 26.98 turns, median 22. These reproduce the prior 1,000-match screen. Tests additionally compare baseline action-by-action against the frozen source across complete matches.

Conclusion: factory isolation does not explain the original faction imbalance.

## AI-only iteration A — failed capture shortcut

Hypothesis: public tactical sequencing, legal Mobile/Rally follow-ups, front Reclaim, and immediate capture could improve underused faction tools.

Change: AI `frontlines-ai-sprint3-v1` adds damage-combo, legal Rally, wounded front recall, reaction reserve, faction positional preferences, and an end-turn score of 34 whenever capture is available. No card changes. The diagnostic source snapshot is [ai-policy-v1.js](ai-policy-v1.js); it is an archival copy, not loaded by the game.

Result: [ai-only-faction-1000.json](ai-only-faction-1000.json). 996 decisive matches, 4 turn cutoffs, 0 errors. Stonewall 242/397 (60.96%), Bruiser 375/400 (93.75%), Syndicate 180/399 (45.11%), Nightwalker 9/400 (2.25%), Rogue 190/396 (47.98%). Mean decisive length 28.56 turns, median 22.

Conclusion: reject the automatic capture priority. Ending immediately with fragile occupation ignores reinforcement, favorable combat and likely recapture. Nightwalker direct-damage plays rose but its direct Order kills fell from 681 to 271; using damage as a setup indiscriminately is not automatically better than waiting for a clean removal. Rogue benefits from readiness/recovery evaluation, but these results cannot justify blanket Nightwalker buffs. The failure remains recorded rather than removed from the history.

## AI-only iteration B — occupation before capture

Hypothesis: a capture opportunity should remain a fallback while a better tactical action can improve the occupation. Precision's Guard bypass is already accounted for in public combat evaluation and should not receive an extra numerical bonus that double counts it.

Change: AI `frontlines-ai-sprint3-v2` restores capture end-turn score to 2 and removes the redundant +3 Precision bonus. Damage/Rally/recall/reaction/positioning checks remain. Card, deck and rule values are unchanged.

Result: [ai-only-faction-v2-1000.json](ai-only-faction-v2-1000.json), all 1,000 decisive, no errors/cutoffs. Stonewall 56.5%, Bruiser 97.75%, Syndicate 54%, Nightwalker 15.5%, Rogue 26.25%. Mean 28.497 turns, median 22, maximum 167.

Conclusion: restoring occupation priority removes the cutoffs and catastrophic Nightwalker collapse, but generic improvements still do not solve faction balance. Later conservative AI and four explicit card screens are summarized in [SPRINT-003.md](../SPRINT-003.md). Their exact JSON reports remain in this directory. Sprint 4 expansion profiles and preset revisions are recorded separately in [CARD-DESIGN.md](../arsenal/CARD-DESIGN.md) and [SPRINT-004.md](../SPRINT-004.md).
