# Frontlines v1.0.5 — Arsenal Refinement

The completed v1.0.4 build was frozen before the art audit. All 155 battlefield cards now meet the consistent illustrated quality floor, with ten premium Commander portraits unchanged. The accepted visual checkpoint preceded AI and readability changes. Normal completed matches now always pay the configured win/loss Credits, including short defeats.

## Completion record

| Requested deliverable | Result |
| --- | --- |
| 1. Version | Frontlines **v1.0.5**, default `sprint12 / sprint12-refinement-v1`. |
| 2. Build path | `C:\Users\noaho\OneDrive\Documents\ChatGPT\Faction Cards\release\1.0.5\Frontlines-Setup-1.0.5.exe`; complete `win-unpacked` folder beside it. |
| 3. Commit | No new commit. Base HEAD `7f388ec66fb80f4c8d9883b3111551dd8ab0e829`; working-tree changes preserved. Completed v1.0.4 installer, source archive and 141 runtime files remain frozen. |
| 4. Tests | **478 passed, 0 failed, 0 skipped**. Browser/native checks and artifact hashes are recorded in [the final manifest](release-1.0.5-manifest.json). |
| 5. Audited cards | **155** playable battlefield designs + **10** separate Commander benchmarks. |
| 6. Art before | Battlefield A/B/C/D **0/0/17/138**. With Commanders: **10/0/17/138**. Grades include actual framing; the original 76 painted sources were strong. |
| 7. Art after | Battlefield A/B/C/D **0/155/0/0**. With Commanders: **10/155/0/0**. No live glyph/vector placeholder or unresolved image. |
| 8. Every replacement | [All 91 card IDs, runtime files and preserved source mappings](art/SPRINT12-ART-QUALITY.md#every-replaced-runtime-artwork-asset), plus individual before/after audits and generation manifest. |
| 9. Commander art | All ten approved paintings and optimized portraits remain byte-for-byte intact. No Commander regeneration. |
| 10. Tactical rules | No gameplay rule rewrite. Cover/Breach/Blast/Dodge/Suppression/Overwatch/Sacrifice/Exposed/Smoke, provenance, Rogue recovery, Commander interactions and frontline behavior audited; existing exact rules preserved. [Audit](TACTICAL-REFINEMENT-AUDIT.md). |
| 11. Balance | No printed numerical changes or new win-rate claims. Correct policy defects first; owner statistical validation remains pending. |
| 12. Commanders | Ten definitions, costs, one-use flags and passive incentives unchanged. |
| 13. Decks | All 35 built-in lists unchanged: 20 legacy, 10 Commander foundations, 5 tactical showcases. Custom decks/ownership remain separate from War Room legality. |
| 14. AI | Mark/Exposed uses canonical public previews and actual legal follow-ups; rear Overwatch avoids unreachable entry; repair survival bonus requires a genuine saved exchange. New `frontlines-ai-sprint12-v1`; historical policies preserved. |
| 15. Readability/UI | Consistent faction art, repaired legacy cropping, correct Field Leader labels, action-window HUD/control/capture/victory/log terminology, reward save failure/retry. Existing large central actions, filters, fixed panels, targeting and status-duration badges retained. |
| 16. Tutorial | Fourteen beginner lessons and six optional tactical exercises preserved. Instructions use End window; Field Manual clarifies timing, Leader/Commander distinction, Blast permanents and persistent Suppression. Commander passive/active/deckbuilding teaching still completes through real clicks. |
| 17. Viewport | Populated ten-unit battlefield passed 13 layouts: requested 1920×1080 / 1600×900 / 1366×768 / 1280×720 and compact/Windows-scaling equivalents. All seven territories, both Commander areas, resources, hand and controls fit without routine whole-page scrolling. Native F11/Alt+Enter checked. |
| 18. Inspect Deck | Own/enemy inspection and other card surfaces preserve **5:7** frames with uniform artwork scaling. 184 rendering contexts plus 20 responsive art contexts passed. |
| 19. Saves | Wallet, Supply, ownership, cosmetics, mastery, receipts and deck storage preserved. Old release Lab defaults migrate to Sprint 12 without running; deliberately selected historical profiles remain selected. Invalid/future saves are preserved, not overwritten. |
| 20. Multiplayer | Deterministic seeded resolution, JSON statuses/Commander/Response state, exact intent/event replay and atomic rejection verified. Authenticated seat binding, strict versioned intent envelopes, deduplication, private projections and resync remain required. [Readiness audit](MULTIPLAYER-READINESS.md). No networking added. |
| 21. Remaining issues | Competitive expansion balance is unmeasured; AI is not proven optimal. Some coherent portraits intentionally share source panels. Current turns are action windows; paired-turn timing needs a migration. Windows candidate is unsigned and unpublished. Storage failures need retry while the completed match remains open. |
| 22. Owner simulation | [Exact 12,250-match proposal](BALANCE-REFINEMENT-VALIDATION.md), all 35 decks, mirrors/both seats, deck AI, seed 1209, Sprint 12, invariant checks, default rules and cutoffs. Optional matched Sprint 11 policy baseline. **Not executed here.** |
| 23. Legendary roadmap | **HIGH PRIORITY** future presentation: independent rarity, cosmetic variant and wear/mastery layers. Final Legendary redesign deferred; [roadmap](GAME-ROADMAP.md). |

## Artwork and preservation

The 91 explicit replacement mappings cover all 40 Tactical Arsenal illustrations, 39 legacy Order/Asset placeholders, nine role corrections using new subjects, and three compatible existing-source crops. Sixty-four strong legacy mappings stay exact. The 76 existing painted faces receive consistent framing rather than replacement. Three Stonewall medical cards intentionally share one appropriate medical painting.

Twenty-three PNG masters are preserved separately from optimized 512×512 WebPs. The new runtime art totals **7,074,746 bytes**; largest tile **118,300 bytes**. Subject focal points are explicit. Artwork crops uniformly; cards never scale X/Y independently. Ten Commander source/runtime hashes, original assets, historical Art API and frozen build hashes are protected.

[Immutable visual checkpoint](art/SPRINT12-VISUAL-CHECKPOINT.json) · [individual legacy audit](art/SPRINT12-ART-AUDIT-LEGACY.json) · [individual Tactical after audit](art/SPRINT12-ART-AUDIT-TACTICAL-AFTER.json) · [rendering audit](art/SPRINT12-RENDERING-AUDIT.md) · [asset/prompt manifest](../assets/source/card-art-012/manifest.json).

## Credits after every completed normal match

Match completion **35** + Victory **35** = **70 Credits**; completion **35** + Defeat **15** = **50 Credits**. The first completed normal match adds **50** once: first win **120**, first loss **100**. Normal matches use an authoritative completed result instead of the old four-window/four-action minimum; short losses cannot miss payment.

Each match gets a stable receipt ID. Currency, first-match flag, card/Commander mastery and receipt save atomically; retries cannot duplicate progression. Rematches get a new ID. The result screen itemizes sources and persistent wallet balance. Failed saves show an explicit failure and **Retry saving reward**, rather than reporting success. Incomplete/conceded matches, tutorials/practice, developer or modified-config fixtures, War Room and AI self-play remain excluded from ordinary match rewards. Tutorial's existing one-time 100-Credit reward stays separate.

Current reward tests cover short outcomes, rematches, receipts, persistent reload, exclusions, malformed data and quota/retry atomicity. Two completed browser UI matches exercise win → actual Rematch → loss → Collection reload: starting 300, first win +120, rematch loss +50, saved balance **470**. No balance statistics are derived from these intentionally controlled smoke matches.

## Stable validation and release

All old automated regressions remain. New coverage protects all artwork mappings/dimensions/source hashes, public AI decisions for forty tactical cards at all difficulties, frozen S11 policy behavior, all showcase/random opponent legality, exact JSON tactical replay, pending Response/Commander state, seeded reserve recycling and updated reward policy. Browser checks cover every card, actual targeting/confirmation/status expiry, all six advanced lessons, fourteen beginner lessons with real Commander activation, migration and populated responsive layouts.

The installer, unpacked app, blockmap, latest.yml, runtime/source equality, source checkpoint and SHA-256 hashes are listed in [release notes](RELEASE-1.0.5.md) and [the final manifest](release-1.0.5-manifest.json). No publication or installation over the owner's copy occurs automatically.
