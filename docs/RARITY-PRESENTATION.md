# Rarity presentation — Arsenal Prestige v1.2.0

Frontlines now renders rarity, premium finish and earned wear as independent layers. A Legendary Foil Veteran keeps its Legendary construction, its reflective artwork finish and its earned service marks together. None changes Presence, stats, abilities, deck legality or simulation results.

The sprint preserves all 155 reviewed battlefield-card artwork mappings, all ten Commander portraits, the accepted crops and canonical 5:7 card faces. It changes the surrounding presentation rather than replacing illustrations. The existing 155 cards, 35 preset decks and ten Commanders remain the competitive catalog.

## The three layers

| Layer | Determines | Available treatment |
| --- | --- | --- |
| Rarity | Frame construction, material, corners, nameplate and rarity symbol | Common, Uncommon, Rare, Epic, Legendary |
| Premium finish | Artwork surface treatment | Standard, owned Foil, owned Full-Art |
| Earned wear | Patina and service insignia | Unworn, Field-Worn, Battle-Hardened, Veteran |

The renderer also accepts `holographic` as a presentation style. This is not an additional collectible entitlement, pack drop or player-facing acquisition system in v1.2.0. Current Collection saves and selectors retain the existing `foil` and `fullArt` entitlements. Full-Art uses the accepted artwork with its existing wider treatment; it does not create replacement illustrations or stretch a portrait.

### Rarity hierarchy

| Rarity | Readable identity |
| --- | --- |
| Common | Clean, restrained frame and simple square rarity mark |
| Uncommon | Accented construction, modest inset detail and bar mark |
| Rare | Refined inset frame, cut-corner geometry and diamond mark |
| Epic | The preserved intermediate tier, layered frame and double-diamond mark |
| Legendary | Multiple frame plates, structural rails, faction crest, signature corners and stronger nameplate |

Epic remains between Rare and Legendary. Existing rarity assignments, crafting values, pack odds, guarantees and pity are preserved. The hierarchy is a visual classification, not an assertion that a Legendary is automatically stronger in combat.

### Legendary faction construction

| Faction | Material and geometry |
| --- | --- |
| Stonewall | Forged armor, squared bastion corners and reinforced plating |
| Bruiser | Industrial impact plates, breach angles and striped reinforcement |
| The Syndicate | Precision alloy, circuit detail and orderly machined corners |
| Nightwalker | Spectral composite, narrow veil accents and tapered insignia |
| Rogue | Salvaged panels, patchwork asymmetry and improvised service detailing |

Faction identity uses construction and emblem as well as color. Legendary recognition remains visible with Standard finish, without animation and with reduced effects. Foil and wear do not replace the frame or cover name, cost, rules and combat statistics.

## Shared renderer

`presentation.js` supplies the same vocabulary to Collection cards and inspection, Arsenal cards and briefing, hand cards, battlefield units, match inspection, full card details, pack reveals/results, tutorial examples, Tactical Training and War Room card inspection.

| API | Purpose |
| --- | --- |
| `skin(card, options)` | Resolve rarity, faction material, finish, wear, classes and accessible label |
| `chrome(card, options)` | Render frame rails, corners and Legendary faction crest |
| `layers(card, options)` | Render independent artwork finish and wear overlays |
| `summary(card, options)` | Render named rarity, premium-finish and mastery badges |
| `badge(card, options)` | Render the rarity name and symbol |

Frame chrome and art overlays have no pointer hit testing. Artwork overlays remain inside the artwork region. Existing card dimensions, legal-action targets and battlefield placement stay authoritative. Commander portraits retain their established premium Commander design.

An owned card resolves its local finish and wear from Collection preferences. Public or opponent cards use `public: true`, which resolves Standard finish and Unworn without reading local private cosmetic preferences. The opponent's canonical rarity remains visible. This is the intentional safe fallback; v1.2.0 does not transmit collection inventories, mastery history or cosmetic descriptors through the multiplayer protocol.

Cosmetics never enter gameplay card definitions, canonical state, deck contents, ruleset hashes, AI decisions or simulator arithmetic. Two players with different local treatments can still agree on the same match state.

## Collection and mastery

Collection offers faction, rarity, type, ownership/new/favorite, set, owned finish and unlocked wear filters, plus rarity and mastery sorting. Inspection and Arsenal briefing separate **Finish**, **Earned wear** and **Favorite** controls. Choosing wear retains the chosen premium finish, and choosing a finish retains wear.

History shows confirmed matches used, deployments, victories while included, first acquisition when known, latest progression reason and the next milestone. Actual-use points, additive save migration and honest unknown legacy dates are documented in [Card mastery](CARD-MASTERY.md). Old points, unlocked wear, wallets, pending packs and saved decks remain preserved.

## Pack presentation

Face-down cards do not expose their identity or rarity styling. Revealing a Legendary opens a faction-themed spotlight with the accepted portrait, complete frame and explicit rarity/finish/wear explanation. The entry lasts about 650 ms; Continue and Skip remain available. A final-card Legendary is saved safely before its spotlight is dismissed, so the result is neither lost nor hidden by the automatic claim.

Legendary and Rare/Epic reveals have distinct short synthesized card-channel audio cues. Sound still respects user interaction, mute, channel volume and hidden-page guards. Fast opening skips reveal effects and audio. Reduced effects and system reduced motion retain the static Legendary identity. Pack purchasing, random generation, drops and atomic claims use the existing economy unchanged.

## Accessibility and performance

Rarity and wear have names and symbols, rather than depending on color alone. Frame decoration stays separate from reading and interaction regions. Collection, Arsenal briefing and pack content use contained scrolling at smaller sizes; the page itself remains bounded. Ordinary deck quantity and action controls retain their existing layout.

Premium cards do not run continuous idle animations. Hover/focus can trigger a single short sheen, disabled by reduced presentation and reduced motion. Frames use local CSS and existing faction SVG emblems; no new bitmap payload is required. Effects remain bounded and never delay a gameplay transition.

## Verification

The dedicated matrix contains seven treatments for each of five factions: Common Standard, Rare Standard, Legendary Standard, Legendary Foil, Legendary Veteran, Legendary Foil Veteran and Full-Art. The 35 examples passed at 1920×1080, 1600×900, 1366×768 and 1280×720, for 20 faction layouts and 140 measured card faces. It checks 5:7 dimensions, art crop, region separation, noninteractive frames and absence of idle animations.

Collection/Arsenal tests passed at the four desktop sizes and 911×512 CSS pixels at 1.5 device scaling, including independent persistent selections, filters, pack privacy and durable last-Legendary claims. The two-browser local relay match performed 434 cosmetic-isolation checks and 434 private-information checks. These are interface/protocol correctness tests, not competitive balance evidence.

Final aggregate, packaged application and public relay status are recorded in [Release 1.2.0](RELEASE-1.2.0.md). Cross-home play and the owner's actual Windows scaling remain human playtest checks.
