# Frontlines v1.0.5 — Arsenal Refinement

All 155 battlefield cards now have consistent reviewed illustrations. The ten premium Commander portraits remain intact. Tactical AI forecasts, timing explanations and completed-match Credit rewards are repaired. This is a local Windows playtest candidate; it has not been published or installed over the owner's copy.

- [Windows installer](../release/1.0.5/Frontlines-Setup-1.0.5.exe)
- [Unpacked application](../release/1.0.5/win-unpacked/Frontlines.exe) — keep the entire folder together
- [Source checkpoint](checkpoints/sprint12-v1.0.5.zip)
- [Final artifact hashes and verification](release-1.0.5-manifest.json)
- [Complete sprint report and 23 deliverables](SPRINT-012.md)

Completed normal wins grant **70 Credits**, losses **50**; first completed match adds **50** once. Training, developer fixtures and War Room do not grant ordinary match currency. The result screen itemizes the reward and offers retry if saving fails.

Use the central Play, Arsenal, Collection, War Room and Tutorial commands. Existing saves and built-in decks are preserved. Browse the improved cards, inspect the enemy deck, play tactical showcases/custom variants, and check named statuses and their expiry. The HUD now calls the engine's offensive initiative an **action window**; capture still resolves at every window end.

Verification: **478 Node tests pass** with zero failures/skips; all card-art surfaces and ratios, populated viewport/scaling checks, complete win/loss reward persistence, fourteen beginner lessons, six advanced exercises, Lab migration and packaged native smoke checks. See the manifest for saved evidence and installer/source SHA-256 hashes. Correctness checks are not statistical balance certification.

The 155 card definitions, 35 decks and ten Commander definitions are unchanged. [Owner balance validation](BALANCE-REFINEMENT-VALIDATION.md) remains proposed and unexecuted. Paired-player turn timing, private multiplayer authority/transport and the high-priority Legendary presentation redesign remain future work. [Completed v1.0.4](RELEASE-1.0.4.md) and its source checkpoint remain preserved.
