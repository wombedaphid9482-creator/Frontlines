# Frontlines v0.9.0 playtest candidate

Built and verified locally on October 3, 2026. [Windows installer](../release/0.9.0/Frontlines-Setup-0.9.0.exe) — **113,031,305 bytes**, unsigned (Authenticode: NotSigned). SHA-256: `52a20c031417dbb96c4796ad480c67ec0198ccd37d60131ae2f9025413c6f0c8`. [Installation-free application](../release/0.9.0/win-unpacked/Frontlines.exe): keep its complete folder together. Nothing was published or installed over the owner's copy.

## What to try

1. Start Tutorial or Play. A fresh profile owns **60 designs / 130 copies**, enough for a legal 26-card starter for each of five factions. Fresh Credits: 300; migrated test profile: 500. Old deck definitions/preferences stay intact.
2. Open **Collection & Packs**. Inspect unowned designs, acquisition sources, faction completion, rarity filters and wallet. Buy a Standard/faction pack; reveal individually or Reveal All/Skip. Reload before opening and verify the sealed pack is retained.
3. Open Arsenal, duplicate a starter and edit within owned copies. An incomplete template/import remains savable; Play identifies missing copies, while War Room still accepts a legal list. Craft a missing copy with Supply and choose an owned appearance.
4. Finish an ordinary match. Eligible victory: 70 Credits / defeat: 50, first completed match +50; tutorial +100 once. Four own turns and four meaningful actions are required. Developer/custom-rule/practice games, concessions and AI self-play earn no match rewards. Review sources, balance and mastery on the final screen.
5. Check safe artwork/text regions, long names/rules and full inspection. Compact hands keep name/cost/stats with an explicit Inspect command. Rarity frames and Field-Worn/Battle-Hardened/Veteran/Foil/Full-Art treatments change presentation only.
6. Enable sound in Settings. Adjust Master/Music/UI/Card Effects/Battlefield independently, test Full/Reduced/Minimal, and listen to menu/Arsenal/shop/match themes. Music starts after interaction, loops and crossfades; no external music samples are used.
7. Check native F11/Alt+Enter, windowed 900×600 and browser 390×844 layouts. Report confusing ownership/acquisition, card readability, pacing and audio fatigue. Export ordinary playtest feedback as before.

## Verification

**250/250 Node tests pass**, including 35 new: 23 collection/economy, 9 presentation/audio and 3 integration. **Eleven browser suites pass** (eight preserved gameplay/deck/lab/tutorial suites and three new collection/progression/presentation suites). Coverage includes all 115 metadata entries, five playable starters, migration/corruption/quota failure, seeded guaranteed/pity packs, duplicate/crafting caps, idempotent claims/rewards, cosmetics/mastery, ownership bypass for AI/War Room, actual reward persistence, safe card geometry and all four looping themes.

Five isolated packaged-native checks pass: shell/settings/playable tutorial/F11/Alt+Enter/version, expanded-deck conquest: 18 turns / 98 decisions, Arsenal: 115 cards / legal 26-card starter, War Room: two correctness fixtures, zero errors/cutoffs, and fresh Collection: 60 designs / 130 copies / 300 Credits / nine pack definitions. **69 runtime files exactly match source**, 31 historical frozen hashes remain unchanged and development material is excluded. Electron 44.5.1 and updater 6.8.9 are included. [Manifest](release-0.9.0-manifest.json) records exact hashes and source checkpoint.

## Boundaries and known issues

The combat pool/rules stay on **sprint7 / sprint7-arsenal-v1**, with no new statistical balance or economy campaign. The archived v0.7 baseline showed severe faction/preset/initiative skew; neither progression nor correctness tests certify competitive balance. [Sprint 8's exact proposed validation](SPRINT-008.md#exact-simulation-request-for-ryken--not-executed) requires new authorization before execution.

Economy values are first-pass tunable data. Human progression pacing, enjoyment and soundtrack quality need owner playtests. Original procedural audio and reused faction portraits are replaceable; Commander Pack remains disabled until dedicated future content exists. Browser/native/offline-file saves use separate local origins: transfer deck JSON when moving between them. Corrupt/future collection formats retain original text and block writes with a read-only starter preview and recovery export.

The installer is unsigned. Native checks use temporary profiles; actual installation/uninstallation and real updater-server delivery are unverified. The [v0.8.0 installer/source checkpoint](RELEASE-0.8.0.md) and authorized baseline remain preserved.

## Source checkpoint

[Sprint 8 source checkpoint](checkpoints/sprint8-v0.9.0.zip) preserves the tested runtime, artwork sources, tests, scripts, documentation and targeted release evidence. Its hash and file count are in the companion [manifest](release-0.9.0-manifest.json). Dependencies, release binaries, owner saves, large historical simulation outputs and earlier checkpoint archives are excluded. Artifact-integrity tests still require the separately preserved v0.8.0 installer and source archive. The manifest is kept outside the ZIP to avoid a circular hash dependency.

## Rebuild

```text
npm test
npm run build -- --win nsis --publish never
node scripts/verify-release.js
```
