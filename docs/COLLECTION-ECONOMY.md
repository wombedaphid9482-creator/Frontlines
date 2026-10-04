# Collection and economy — Frontlines v0.9.0

Sprint 8 adds local ownership, Credits, Supply, packs, crafting, cosmetics and mastery to the existing **115-card Sprint 7 gameplay pool**. Gameplay remains on `sprint7`; collectible rarity and appearance do not change printed values, mechanics, costs or deck rules. All currencies are earned in the game. No payments, premium currency or real-money shop exist.

The authoritative values and collectible metadata live in [collection.js](../collection.js): `ECONOMY`, `PACKS`, `CARD_META`, `RARITY_GROUPS`, `STARTER_COLLECTION` and `STARTER_DECKS`. Presentation reads this data through [presentation.js](../presentation.js). These definitions are centralized and immutable at runtime; tune their source values for later releases.

## Initial collection and migration

Every new profile owns **60 unique designs / 130 gameplay copies**, exactly enough for the original **five legal 26-card starters**. Each faction contributes 12 unique designs and 26 copies. `STARTER_COLLECTION` derives the required quantities from `Decks.forData(Balance.dataFor('sprint7')).starters()` and validates every starter when the module initializes. Broken starters fail validation instead of silently receiving an incomplete grant.

| Profile | Initial Credits | Initial Supply | Card grant |
| --- | ---: | ---: | --- |
| Fresh local profile | 300 | 0 | Five complete starters |
| Existing Sprint 7 decks/settings with no collection save | 500 | 0 | The same five complete starters |

The migration detects existing `frontlines.decks.v1` or `frontlines.settings.v1` before the new collection save is created. Browser entry points initialize collection before the shell writes fresh preferences, preventing a new player from accidentally receiving the migration grant. Grants persist once; loading another page does not replenish currency or copies.

Migration retains existing deck definitions, profile/progression keys, tutorial data and preferences. A saved or built-in template containing unowned cards remains inspectable and editable as an incomplete deck. It is not deleted or silently filled. Future players do not receive the full card pool.

Ordinary designs cap at **four gameplay copies**; Leaders cap at **two**. Unique is an active-battlefield rule, not another collectible copy cap. Cosmetics never count as extra gameplay copies.

## Match Credits and eligibility

| Reward source | Credits |
| --- | ---: |
| Eligible match completion | 35 |
| Victory addition | 35 |
| Defeat addition | 15 |
| First eligible completed match, once per profile | 50 |
| Whole tutorial completion, once per profile | 100 |

An ordinary eligible victory gives **70 Credits**, and an eligible defeat gives **50 Credits**. The first such match gives **120 for a victory / 100 for a defeat** after its one-time bonus. Losing still contributes to progression.

Match progression requires an actual completed human operation, at least **four own offensive turns** and **four meaningful actions**. The live adapter counts successful Player 1 commands: deploy, Order, move, attack, non-pass response and non-pass counter; end-turn and passing do not count. The regular solo AI opponent remains unrestricted and may face an owned human deck.

AI self-play, War Room, simulations, training/practice, tutorial matches, concessions, developer/debug play, both-hands play and non-default match configurations do not earn match currency or mastery. The tutorial instead calls its separate completion reward. Restarting training or supplying another tutorial identifier cannot repeat that bonus.

The current live adapter credits the local profile from **Player 1 / internal seat 0**. Hotseat players share that one local profile: ownership applies to both human decks, but the reward, victory flag and mastery describe seat 0 once. There are no independent Player 2 accounts or double rewards.

Match receipts preserve sources, Credits earned, resulting balance and per-card mastery gains. A stable operation ID prevents another grant when the result is revisited.

## Pack prices, pools and base odds

All enabled packs contain **five cards**. Faction packs exclusively contain their named faction. Other enabled packs draw from all five factions. A card is selected uniformly within its selected rarity and allowed faction pool.

The percentages below are **base rarity weights for slots 1–4**. The fifth slot has a rarity floor, so its distribution is conditional and renormalized; pity can raise that floor further.

| Pack | Credits | Pool | Common | Uncommon | Rare | Epic | Legendary | Fifth-slot floor |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Standard | 100 | All factions | 60% | 27% | 9% | 3.5% | 0.5% | Uncommon |
| Stonewall | 140 | Stonewall | 55% | 29% | 11% | 4% | 1% | Uncommon |
| Bruiser | 140 | Bruiser | 55% | 29% | 11% | 4% | 1% | Uncommon |
| Syndicate | 140 | Syndicate | 55% | 29% | 11% | 4% | 1% | Uncommon |
| Nightwalker | 140 | Nightwalker | 55% | 29% | 11% | 4% | 1% | Uncommon |
| Rogue | 140 | Rogue | 55% | 29% | 11% | 4% | 1% | Uncommon |
| Veteran | 200 | All factions | 36% | 34% | 20% | 8.5% | 1.5% | Rare |
| Elite | 350 | All factions | 15% | 32% | 32% | 17% | 4% | Epic |

For the final slot, discard rarities below its floor and divide the remaining weights by their sum. Without pity, Standard's final slot is **67.5% Uncommon / 22.5% Rare / 8.75% Epic / 1.25% Legendary**. A faction pack is **64.444…% / 24.444…% / 8.888…% / 2.222…%** across those four rarities. Veteran is **66.666…% Rare / 28.333…% Epic / 5% Legendary**. Elite is **80.95238…% Epic / 19.04762…% Legendary**. These are exact conditional rules; rounded UI percentages are descriptive rather than independent odds for every slot.

Commander Pack has a registered disabled definition, no card slots, no live pool and no purchasable price. Its `price: 0` is an unavailable future-content field, not a free pack. Existing Leader cards remain ordinary legal gameplay cards; dedicated future Commander content is not replaced with placeholders. Recruit Pack is not implemented.

## Bad-luck protection and deterministic generation

Each enabled pack definition has its own family: `standard`, each individual faction, `veteran` and `elite`. Counters are separate even when their pools overlap.

| Counter | Guarantee on the next qualifying boundary |
| --- | --- |
| Rare | Rare or better by the eighth consecutive pack without Rare+ |
| Epic | Epic or better by the fourth consecutive pack without Epic+ |
| Legendary | Legendary by the twentieth consecutive pack without Legendary |

When the next purchase reaches a threshold, the fifth-slot floor becomes the highest triggered rarity or the pack's ordinary guarantee, whichever is higher. Any qualifying card among all five contents resets that rarity's counter; lower counters also reset when a higher rarity appears. A miss increments the corresponding counter. The Epic guarantee can satisfy the Rare protection earlier than its separate ceiling.

Pity and RNG state advance **at purchase**, including packs still waiting to be opened. A reload, different reveal order or Skip cannot reroll their contents. `generatePack(definitionId, seedOrCursor, pity)` returns deterministic contents, the next Xorshift RNG state, updated counters and any applied pity floor without awarding anything. Purchases serialize the RNG state alongside their immutable contents.

## Supply, duplicates and crafting

Every acquired gameplay copy below its legal cap is retained. Only an excess gameplay copy converts to Supply. Several instances of the same card inside one pack are processed in sequence, so the first may fill a missing copy and the next may convert.

| Rarity | Craft one gameplay copy | Supply from one excess copy |
| --- | ---: | ---: |
| Common | 15 | 5 |
| Uncommon | 35 | 10 |
| Rare | 80 | 20 |
| Epic | 180 | 45 |
| Legendary | 360 | 90 |

Crafting selects the exact desired card, spends Supply once and adds its Standard appearance. It rejects insufficient Supply, unavailable cards and cards already at the legal cap. A repeated owned non-Standard pack cosmetic adds **5 Supply**, in addition to any Supply from an excess gameplay copy. A new cosmetic is retained even when its gameplay copy must convert.

## Cosmetic variants and mastery

Rarity is explicit metadata for every card: **35 Common, 30 Uncommon, 20 Rare, 20 Epic and 10 Legendary**. Each faction has representatives at every rarity. No card receives a raw-power buff from this classification.

Every owned card has Standard. Pack slots independently choose **96.5% Standard / 3% Foil / 0.5% Full-Art**, after the gameplay card is selected. These cosmetic weights are shared by all enabled packs and do not alter rarity guarantees or pity. Foil and Full-Art currently reuse safe art regions and frame treatment rather than introducing gameplay variants or changing printed rules.

| Appearance | Collection ID | Acquisition |
| --- | --- | --- |
| Standard | `standard` | Owning a gameplay copy |
| Field-Worn | `fieldWorn` | 25 mastery points |
| Battle-Hardened | `battleHardened` | 100 mastery points |
| Veteran | `veteran` | 300 mastery points |
| Foil / Holographic | `foil` | Pack cosmetic drop |
| Full-Art | `fullArt` | Pack cosmetic drop |

Mastery is recorded per gameplay design, once per eligible match, with duplicate deck entries collapsed. Only currently owned cards in the human deck receive it. Inclusion gives progress even if a card is not drawn; additional actual usage gives more.

| Mastery statistic | Points per counted event |
| --- | ---: |
| Matches included | 1 |
| Victories | 1 |
| Deployments / played Orders in the live telemetry adapter | 2 |
| Attacks initiated | 1 |
| Eliminations | 2 |
| Territories influenced | 1 |
| Faction-specific actions / passive triggers | 1 |

The live adapter uses completed human-seat telemetry. `rewardMatch` also accepts `kills`, `captureContributions` and `passiveTriggers` as aliases for the last three relevant statistics. Mastery milestones unlock their appearance once without removing earlier treatments. Points, stats and unlocks persist; duplicate reward receipts do not add more progress.

Players choose an owned preferred treatment or `random`. Random chooses from owned supported treatments; an absent, unsupported or unowned preference falls back to Standard. The presentation layer safely normalizes camel-case collection IDs to CSS names: `field-worn`, `battle-hardened` and `full-art`. Cosmetics never alter stats, Presence, keywords, effects, deck size or copy legality. `summary.mastered` counts cards that unlocked Veteran; the broader mastery filter includes any positive mastery points.

## Saves, receipts and recovery

The collection occupies **`frontlines.collection.v1`** with schema version 1. It stores wallet balances, per-card ownership/cosmetics/mastery, RNG state, per-family pity, pending and claimed packs, purchase/craft/match/tutorial receipts and a revision. Existing deck and preference storage keys stay separate.

Purchase checks affordability, deducts Credits and saves the generated pack, RNG and pity in one document commit. It does not immediately grant cards. Claim uses the saved **pack instance ID**, grants all five acquisitions and duplicate Supply, then marks that instance claimed in one commit. Revealing cards is presentation only; closing an unfinished reveal leaves the pack resumable. `packsOpened` increments when its claim succeeds.

Callers provide a stable `options.requestId` for retry-safe purchases and crafting. The same ID returns its saved receipt; using it for another pack/card is rejected. Claims are idempotent by pack instance ID, match rewards by operation ID, and the entire tutorial bonus by profile. Without an explicit purchase/craft request ID, a new ID is derived from the current revision and represents a new action.

Malformed JSON, unsupported future schema, invalid balances/copy counts/mastery, invalid packs and unavailable storage block economic writes. The original save is preserved exactly, and `load` returns a read-only starter preview with a storage warning rather than crashing gameplay or claiming persistence succeeded. `diagnostics` reports the problem; `recoveryExport` returns the original text for download. Missing known card entries recover as unowned, while unknown saved fields and future card entries survive unrelated transactions. Recovery does not repeat the starter grant.

Unknown collectible IDs are unavailable. Unsafe/prototype transaction names such as `__proto__`, `constructor` and `prototype` are rejected. Economic APIs return `{ok:false,error}` on invalid input or failed writes; the UI retains the pending pack when a claim cannot save.

Saves are local to their storage origin and device. Browser, file and native-app origins can hold different local collections. This is not cloud synchronization or an anti-cheat service.

## Ownership, legality and public API

Deck legality remains in `FrontlinesDecks.forData(data).validate(deck)`: 26 cards, one faction, ordinary maximum four and Leader maximum two. `FrontlinesCollection.canUseDeck(deck, profile)` only answers whether the local player owns each required copy. A legal incomplete template can always be inspected or tested by unrestricted AI/War Room tools. Solo enemy AI and simulation inventories never open packs or earn progression.

| API | Purpose |
| --- | --- |
| `createProfile({seed,migrated})`, `load(storage?)` | Create a deterministic test profile; load/initialize the local profile |
| `metadata(cardOrId)` / `card(cardOrId)`, `copyLimit`, `ownedCount` | Read centralized collectible data and ownership |
| `canUseDeck(deck, profile?)`, `summary(profile?)` | Required/owned/missing quantities and collection overview |
| `generatePack(definitionId, seedOrCursor, pity?)` | Pure deterministic pack generation |
| `purchasePack(definitionId, storage?, {requestId}?)` | Pay for a persistent pending pack |
| `claimPack(instanceId, storage?)` | Grant saved acquisitions exactly once |
| `craft(cardId, storage?, {requestId}?)` | Craft one exact gameplay copy |
| `setPreferredVariant`, `variantFor`, `markSeen` | Cosmetic choice, safe appearance and new-acquisition markers |
| `rewardEligibility`, `rewardMatch`, `completeTutorial` | Eligibility and persisted progression receipts |
| `diagnostics`, `storageDiagnostics`, `recoveryExport` | Save warnings and original-data export |

Node consumers use `require('./collection')`; browser consumers use `FrontlinesCollection`. Explicit storage adapters must implement the `localStorage` `getItem`/`setItem` contract. [Collection tests](../tests/sprint8-collection.test.js) cover deterministic guarantees, pity, duplicates, cosmetics, migration, persistence failures, idempotence and reward boundaries without running an economy or balance campaign.
