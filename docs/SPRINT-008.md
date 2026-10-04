# Sprint 8 — Arsenal economy, collection and presentation

Target: **Frontlines v0.9.0**, continuing the completed v0.8.0 build. Sprint 8 creates the local progression loop: starter collection, deckbuilding, completed human operations, earned Credits, packs, new options, exact crafting and cosmetic mastery. Its visual and audio work keeps rules, artwork, stats and targets readable while making the collection feel persistent.

This report records the completed implementation and verification: 250 passing Node tests, eleven passing browser suites, five passing native checks and a packaged v0.9.0 candidate. These establish correctness and release provenance; human progression pacing and competitive balance remain playtest questions.

## Gameplay and historical artifacts

Live play keeps **`sprint7` / the 115-card pool / 23 cards per faction**, the existing five 26-card starters and 15 archetype/hybrid templates. No Sprint 8 combat-stat, effect, keyword, Presence or Command Action balance pass was performed. The collectible layer reads gameplay definitions separately; rarity and cosmetics add no power. Historical rules profiles, AI legality and simulator inventories retain their existing access.

The completed Sprint 7 artifacts remain preserved:

| Artifact | SHA-256 |
| --- | --- |
| `docs/checkpoints/sprint7-v0.8.0.zip` | `d2e5e8432e5ebb531f45dbca7a51899906517e9d729e3d4f15a23275ac2c828e` |
| `release/0.8.0/Frontlines-Setup-0.8.0.exe` | `8fa3e97bc0baf4ee9218511a27a4fb1c30faef7c45e5890d23e1c60119b693ee` |

The prior competitive baseline identified faction/preset disparity and first-seat advantage. This progression sprint does not establish that those balance risks are resolved. [Sprint 7 report](SPRINT-007.md) and [baseline report](balance/SPRINT6-BASELINE.md) retain their own rules and evidence.

## Ownership, starter grants and currency

[collection.js](../collection.js) introduces `FrontlinesCollection` / the equivalent Node module. Every profile stores Credits, Supply, gameplay quantities, cosmetic ownership, preferred appearance, mastery, new markers, RNG, pack-family pity and durable transaction receipts. Explicit collectible metadata covers all 115 designs, including availability, pack pools, starter quantities, rarity, copy cap, craft cost and duplicate Supply.

Fresh profiles receive **60 unique designs / 130 copies**, enough for all **five legal 26-card starters**, **300 Credits** and **0 Supply**. Existing pre-collection deck/settings saves receive the same starters and **500 Credits** once. Collection initializes before new shell preferences, so a first visit receives the fresh grant correctly. Existing deck/profile/preference/tutorial data remains intact; unowned templates become incomplete rather than disappearing.

Eligible completed human matches award **70 Credits for victory / 50 for defeat**, plus **50 for the first eligible completion**. Completing the entire tutorial awards **100 once**, even after restart. Currency and mastery require at least **four own turns and four meaningful commands**. Practice, training, AI self-play, War Room, concessions, developer/debug/both-hands play and non-default configurations do not grant match progression.

The live adapter awards the one local profile from **Player 1 / internal seat 0** using completed telemetry. Hotseat ownership applies to both human decks under the shared profile; it still grants one seat-0 result, not independent accounts or twice the currency. Solo enemy AI can use every legal deck independently of local ownership.

Result presentation includes the actual Credits earned, reward sources, resulting wallet, mastery points and unlock counts. Stable operation receipts prevent duplicate grants. Enabling developer tools or public hands makes progression ineligible for the entire operation, even if the setting is subsequently switched off. [Economy reference](COLLECTION-ECONOMY.md) records exact values and boundaries.

## Collection, shop and deckbuilding

The new [collection.html](../collection.html) and [collection-app.js](../collection-app.js) provide collection and pack-shop screens with a wallet/completion summary, faction progress, search, rarity/ownership/new/mastery filters, owned quantities, exact rules, acquisition sources, crafting, mastery and owned cosmetic selection. Unowned cards remain inspectable. Damaged storage exposes a recovery download and a blocked state.

Standard costs **100 Credits**; Stonewall, Bruiser, Syndicate, Nightwalker and Rogue packs cost **140 each** and exclusively draw their faction. Veteran costs **200**, and Elite **350**. All enabled packs contain five cards. Standard/faction guarantee an Uncommon+ final slot, Veteran Rare+, and Elite Epic+. Per-family Rare/Epic/Legendary pity ceilings are **8 / 4 / 20** packs. Guarantees condition and renormalize the final-slot weights; base odds are not independent probabilities for every slot. Commander has registered disabled future infrastructure with no placeholder pool.

Buying atomically saves the charge, seeded contents, RNG and pity. The opening sequence presents a sealed pack, optional individual reveals, Reveal All and Skip to results. A pending pack survives closing/reload. Only the idempotent claim grants cards, cosmetics and duplicate Supply; animations never grant or reroll acquisitions.

Gameplay copies remain capped at **four ordinary / two Leader**. Excess copies convert to **5 / 10 / 20 / 45 / 90 Supply** from Common through Legendary. Exact crafting costs **15 / 35 / 80 / 180 / 360 Supply**. Usable copies are retained, and new cosmetics survive an excess gameplay copy. The same purchase/craft request ID cannot charge again; failed storage never reports a successful economic commit.

The existing [deck-builder.js](../deck-builder.js) now shows owned and required quantities, rarity, acquisition information, mastery, preferred cosmetics and crafting. Quantity increases respect ownership. Templates and saved decks retain the existing legality/edit/save behavior, and incomplete designs stay reviewable. Collection checks are separate from `Decks.validate`: AI and War Room use unrestricted legal cards and produce no progression.

## Rarity, cosmetic history and presentation

Explicit rarity data contains **35 Common / 30 Uncommon / 20 Rare / 20 Epic / 10 Legendary**. [presentation.js](../presentation.js) exports centralized rarity `PROFILES`, faction motifs, `PRESETS`, safe cosmetic normalization, `profile`, `faction`, `skin`, `badge`, `limits`, `variantId` and `reveal`. Future cards inherit presentation from their metadata rather than scattered rarity branches.

Common treatment stays clean. Higher rarities add bounded frame accents, short reveal/deployment/attack timings, controlled particles and richer audio layers. Faction signatures remain distinct: Stonewall shields/metal; Bruiser shockwaves; Syndicate targeting; Nightwalker distortion; Rogue sparks. Full, Reduced and Minimal tiers, fast animation, system reduced-motion and reduced shake limit spectacle. Minimal retains gameplay feedback.

Standard, Field-Worn, Battle-Hardened, Veteran, Foil and Full-Art are separate cosmetic IDs. The mastery unlocks are **25 / 100 / 300 points** for the three battlefield-history treatments. Included matches and victories give one point each; card deployments/played Orders and eliminations give two; attacks, territory contributions and faction actions give one. Real human-seat telemetry supplies the counts, and a match receipt applies them once per included design. Cosmetics preserve all gameplay values.

Pack slots have **3% Foil / 0.5% Full-Art** cosmetic chances. Preferred or random-owned appearance uses Standard as a safe fallback. Collection camel-case IDs normalize to bounded CSS classes without accepting arbitrary markup. The initial Full-Art treatment uses a larger safe art region and keeps rules visible; it does not require alternate gameplay definitions.

[art.js](../art.js) exposes a shared escaped artwork subtree. [presentation.css](../presentation.css) establishes art/text separation, contained portrait and symbol regions, long-name/text handling, responsive sizes and safe frame overlays. The collection layout also separates catalog artwork, card rules and card detail. Layout evidence across viewport/fullscreen combinations remains subject to the verification table below.

## Layered audio and original music

[music-data.js](../music-data.js) supplies original procedural compositions and replaceable state assignments:

| Screen state | Track | Tempo |
| --- | --- | ---: |
| Main menu | Lines of Command | 88 BPM |
| Arsenal, collection, deckbuilder | Tools of the Campaign | 72 BPM |
| Shop and pack opening | Supply Lines | 92 BPM |
| Active match | Hold the Line | 104 BPM |

The score uses local synthesis with no external copyrighted recordings or samples. Whole musical bars loop with a released boundary; route changes crossfade over **0.65 seconds**, at most **two music voices**. The state table can support future tension or faction tracks without changing game rules. Current initial music is state-based; no claim of a finished adaptive battle soundtrack is made.

[effects.js](../effects.js) exposes `configure`, `cue`, `reveal`, `setMusicState`, `unlockAudio` and `audioState` alongside the existing event effects. Audio combines base action, faction and rarity layers with bounded effect voices. Optional adapter/audio failures cannot interrupt game actions. Clearing transient effects preserves music, while disabling sound stops music and effect voices.

Settings provide **Master, Music, UI, Card Effects and Battlefield** volumes and Full/Reduced/Minimal presentation. Zero-volume channel values remain muted through normalization. Sound stays opt-in and begins after trusted user interaction; loops do not bypass browser audio activation rules.

## Save integrity and recoverability

The collection uses `frontlines.collection.v1`, separate from deck and preference saves. Single-document commits retain pending/claimed packs, seeded contents, pity and reward/craft/purchase receipts. Reloading or revisiting a reward cannot repeat acquisition.

Malformed JSON, unsupported future schema, invalid wallet/ownership/mastery/pack data and unavailable storage block economic writes while preserving the original text. The UI can export that text; a read-only starter preview lets the game load without pretending the saved economy was repaired. Missing known card entries recover as unowned, and unknown fields/future card entries survive unrelated valid transactions. Unsafe prototype transaction names and unknown collectible IDs are rejected. This is local-origin persistence, not cloud synchronization or an anti-cheat service.

## Validation evidence and completion gates

| Check | Current evidence/status |
| --- | --- |
| Collection unit tests | **23/23 passed** with `node --test tests/sprint8-collection.test.js` |
| Presentation/audio unit tests | **9/9 new presentation tests passed**; original effect/shell regressions also pass |
| Full `npm test` | **250/250 passed**, zero failures, 35 additions since v0.8.0 |
| Browser collection/shop/pack/craft/readability | **Passed**: all nine shop definitions, pending/reload/claim-once, individual/Reveal All/Skip, crafting/cosmetics/owned caps and 1366/900/390 layouts |
| Browser real progression/ownership/configuration boundaries | **Passed**: 37-turn / 156-decision ordinary fixture earns 120 Credits and 12-card mastery gains; reload persists; developer fixture earns 0; missing-owned deck rejected while AI uses unowned legal template |
| Existing browser gameplay/tutorial/Arsenal/War Room regressions | **Passed**: eight prior browser suites plus three Sprint 8 suites, zero errors |
| Windowed/native F11/Alt+Enter and supported resolutions | **Passed**: five isolated native modes; real F11/Alt+Enter; fresh collection: 60 designs, 130 copies, 300 Credits; art/text bounds across 1920/1366/1280/900/390 |
| v0.9.0 installer/package/source verification | **Built and verified**: 69 runtime files match source; 31 frozen historical files unchanged; unsigned installer: 113,031,305 bytes, SHA-256 `52a20c031417dbb96c4796ad480c67ec0198ccd37d60131ae2f9025413c6f0c8` |
| v0.8.0 preserved artifact hashes | **Verified unchanged**: v0.8 installer and source archive hashes match release manifest |
| Statistical balance or economy campaign | **None run or authorized for Sprint 8** |

Targeted collection tests cover all metadata without gameplay mutation; five complete legal starters; fresh and migrated grants; initialization ordering; original-save preservation; future/unknown-data recovery; quota failures; valid faction pools; deterministic guarantees and all pity boundaries; fixed-seed Foil/Full-Art examples; durable pending packs; idempotent purchases/claims/crafts/rewards; duplicate caps; cosmetic fallback; ownership/legality separation; reward exclusions; mastery unlocks and tutorial restart protection.

These are deterministic correctness tests. Small browser/gameplay fixtures are permitted regression checks; they do not estimate win rates or certify human balance. The [v0.9 release guide](RELEASE-0.9.0.md) and [release manifest](release-0.9.0-manifest.json) preserve exact package/source provenance. Installation over an owner copy and real updater delivery were not tested; nothing was published.

## Exact simulation request for Ryken — not executed

No 10,000-/50,000-match batch, matchup sweep, repeated tuning loop or large economy simulation is authorized by this sprint. The following is a proposed future request only. Prioritize the original ten profiles for continuity before considering the expanded pool.

**First request:** 10,000 games; default **`sprint7`** rules; the original ten archetype decks listed below; **`deck` policy for both sides**; base seed **20261003**; paired opening seats; exact deck mirrors **off**; same-faction distinct variants **included**; invariant/card-conservation verification; **240 offensive-turn / 10,000-decision** safeguards; ordinary logs without rich decision traces; JSON, HTML, match CSV and card CSV exports. All five factions and both original archetypes per faction are represented. Collection is bypassed and no currencies, packs or mastery are awarded.

```text
npm run simulate -- --mode matrix --pool stonewall-bastion,stonewall-counteroffensive,bruiser-shock-assault,bruiser-heavy-breakthrough,syndicate-combined-arms,syndicate-precision-operations,nightwalker-sabotage,nightwalker-assassination,rogue-scavenger,rogue-wildcard --count 10000 --balance sprint7 --ai deck --seed 20261003 --verify --max-turns 240 --max-decisions 10000 --out test-results/sprint8-original-10000.json --csv
```

Matrix mode swaps seats automatically. Do not add `--mirrors` or `--fixed-seats`. The CLI has no live AI-difficulty override: this is a **deck-policy check, not an Expert benchmark**. No custom rule settings are requested. Exact seeds/options/versions/deck lists and existing source fingerprints must accompany the result.

Required analysis: requested/completed/error/cutoff counts; cross-faction rates and appearances separated from all appearances; deck/pair rates; first-seat split; mean/median/P95/min/max turns; capture/recapture and comeback denominators; Command Actions/free plays/committed/available/unused Capacity; forced retreats/eliminations; card exposure/usage and Armor/Mark/Reinforce/Adapt metrics; suspicious seeds for exact replay. Findings remain diagnostics, not automatic tuning instructions.

**Optional second request, separately authorized:** another 10,000 games with all **15** current archetype/hybrid decks and the same rules, seed, policies, seat pairing, mirror exclusion, safeguards, verification and exports:

```text
npm run simulate -- --mode matrix --pool archetypes --count 10000 --balance sprint7 --ai deck --seed 20261003 --verify --max-turns 240 --max-decisions 10000 --out test-results/sprint8-expanded-10000.json --csv
```

The first request has 45 deck pairs; the expanded request has 105 and less exposure per pairing. Their aggregates answer different questions and must be reported separately. Approval of the first request does not authorize the second, a 50,000-game confirmation or any repeated tuning/economy campaign.
