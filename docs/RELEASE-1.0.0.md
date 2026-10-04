# Frontlines v1.0.0 Commander playtest candidate

Prepared locally on October 3, 2026. [Windows installer](../release/1.0.0/Frontlines-Setup-1.0.0.exe): **113,060,154 bytes**, unsigned (Authenticode: NotSigned). SHA-256: `718312f275eaedf0d4061242ba6d456075b69f6039763d0d75e66a3c37c62d15`. [Installation-free app](../release/1.0.0/win-unpacked/Frontlines.exe): keep its entire folder together. Nothing was published or installed over the owner's copy.

## What to playtest

1. Complete **Learn Frontlines**. Its 14 playable lessons include observing Warden healing, clicking the real Commander active and its wounded target, then choosing Warden or Marshal for the final training battle. Older completed tutorials resume at the three new Commander lessons; their earlier Credits reward does not repeat.
2. Open **Arsenal**. Use **Faction → Commander → Foundation → Customize**. Ten Commanders and all ten legal foundations are immediately available. Inspect the full passive, active, deck direction and card synergy hints. Save a copy, switch Commander, Undo/Redo, reload and exchange deck JSON.
3. Select a Commander and actual deck before an ordinary match. Both leaders stay visible outside the battlefield lanes. Check disabled explanations, Capacity/command costs, legal targets and the once-per-match spent state. Drifter relocation explicitly chooses the unit before its destination. Deployable Leader cards remain separate battlefield units.
4. Compare Warden/Marshal, Breaker/Bloodhound, Coordinator/Quartermaster, Ghost/Saboteur and Scavenger/Drifter. Ten foundations teach different plans; their strength needs human testing. The five original starters and fifteen archetype/hybrid templates remain intact.
5. Browse **Collection → Commanders**. A fresh profile owns 10 leaders and **63 battlefield designs / 171 copies**, with 300 Credits. Existing v0.9 wallets, pending packs, cosmetics, mastery, settings and decks survive the one-time foundation grant. Commander match/victory/activation history is recorded once per eligible reward; future portrait/pack cosmetics remain optional infrastructure.
6. Watch the role illustrations, faction materials and layered rarity frames. Normal deployment has visible anticipation, scale emphasis, landing and settling over **720–1,060 ms**. Try Fast and Full/Reduced/Minimal effects, independent sound/music volumes, dense hands, small windows and native F11/Alt+Enter. Gameplay remains authoritative while effects overlap or cancel.
7. Use **War Room**, which remains inside the game and has a separate launcher. Choose saved decks and Commander variants, compare results and export JSON, HTML, match/card/Commander CSV. HTTP worker, offline cooperative and Node execution reproduce the same fixed fixtures. Export human playtest reports and deck JSON for feedback.

## Verification

**298/298 Node tests pass. Eleven browser suites pass**: eight current Commander/tutorial/collection/progression/runner suites and three preserved Arsenal/presentation-music/effects regressions. Coverage includes all ten passives and actives, expiry, costs, legal targets, reset, AI hidden-information independence, original card definitions, foundation ownership, imports/migration/recovery, wallet protection, real Drifter targeting, discounted/free Order previews, responsive card regions, six tutorial viewports, complete hot-seat/paced-AI matches and all music/mixer/presentation settings.

Five isolated packaged native modes passed: shell/settings/real deployment and Commander tutorial activation/fullscreen/version; expanded-deck conquest (**22 turns / 122 decisions**); Arsenal (**115 cards / 26-card starter / 10 foundations**); War Room (**two correctness fixtures, zero errors/cutoffs**, both leaders used their active); and Collection (**10 Commanders / 63 designs / 171 copies / 300 Credits**). Profiles are temporary and isolated from owner saves.

**83 packaged runtime files match the tested source exactly**. Development files are excluded; Electron 44.5.1 and updater 6.8.9 are present. The 31 frozen Sprint 5 source hashes remain unchanged. Preserved v0.8 and v0.9 installer/source hashes are verified by the automated suite. The [release manifest](release-1.0.0-manifest.json) records exact versions, validation and checkpoint provenance.

## Boundaries

No large Commander, balance or economy campaign ran. Small deterministic fixtures verify correctness; they cannot certify competitive balance. The archived authorized v0.7 baseline showed substantial faction and first-player skew, and v1.0 adds new strategic variables. [Sprint 9](SPRINT-009.md#exact-proposed-simulation-request--awaiting-owner-authorization) supplies an exact proposed 10,000-game foundation tournament, awaiting separate owner authorization.

This is a local harder-playtesting candidate. Human pacing, enjoyment, cosmetic value and competitive tuning remain playtest questions. Vector/atlas role art is a coherent scalable system rather than 115 unique paintings. Commander alternate-portrait acquisition and cosmetic packs remain future work. Browser/native/file saves have separate origins; use deck export/import between them. Corrupt/future saves retain the original bytes and block writes with recovery export. Installation/uninstallation over an owner copy and real updater delivery were not tested. The installer is unsigned.

## Source checkpoint

[Final Sprint 9 source checkpoint](checkpoints/sprint9-v1.0.0.zip) preserves runtime, artwork sources, tests, scripts, documentation and release evidence. Every runtime entry is reopened and checked against the packaged source hashes. Its file count and SHA-256 are in the companion manifest, which stays outside the archive to avoid a circular hash dependency. Dependencies, binaries, owner saves, large historical outputs and older checkpoint archives are excluded. Artifact tests additionally require the preserved v0.8/v0.9 installers and source ZIPs. The [v0.9 release](RELEASE-0.9.0.md) remains available as the pre-Commander checkpoint.
