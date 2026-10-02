# Validated Sprint 3 checkpoint

Preserved on October 1, 2026 before Sprint 4 implementation. `checkpoint-hashes.json` records the 58 runtime, optimized asset and test files. Open `index.html` or `simulator.html` in this directory to run the checkpoint without a build step.

Validation: all 97 Node tests passed; actual Edge exercised 20 Balance Lab matches, rich replay, exact seeded rerun, report comparison/HTML export, offline pause/stop and a complete 180-decision local match with 101 private handoffs and exported feedback. No browser console errors. An additional 100-match matrix used candidate balance, faction AI, seed 20261001; all 100 ended in conquest, with no errors or cutoffs. Its report is `test-results/sprint4-gate-100.json` in the project root.

This checkpoint contains Sprint 3 tooling and an **exploratory** iteration-04 balance profile. The live default was still the original baseline. It does not claim a finished balanced ecosystem or completed human playtesting. Further wholesale Sprint 3 tuning was stopped when Sprint 4 was requested.

Electron 44 development launch encountered a Windows sandbox ACL failure in the managed workspace before loading app content. Browser/file launch was independently verified. Native packaging is verified separately for the final candidate; this failure must not be represented as successful native validation.
