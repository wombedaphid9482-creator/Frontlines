# Card mastery and history — Arsenal Prestige v1.2.0

Frontlines separates three independent presentation layers:

| Layer | Source | Examples | Competitive effect |
| --- | --- | --- | --- |
| Rarity | Existing collectible classification | Common, Uncommon, Rare, Epic, Legendary | None |
| Cosmetic finish | Owned cosmetic entitlement | Standard, Foil, Full-Art | None |
| Mastery and wear | Earned card use | Field-Worn, Battle-Hardened, Veteran | None |

The historical Epic tier remains intact. Foil and Full-Art retain their existing `foil` and `fullArt` entitlements. The shared renderer also supports a Holographic visual style, but v1.2.0 adds no independently selectable Holographic entitlement or pack drop and changes no pack odds. A Legendary Foil Veteran uses all three layers simultaneously. Rarity frames, artwork finish and earned wear do not share one selection or overwrite each other. Full-Art uses the existing artwork and treatment, with no artwork stretching.

## Earning mastery

Only eligible completed matches record progression. The existing ordinary-match policy remains 70 Credits for a win or 50 for a defeat, plus the one-time 50-Credit first-match bonus. A short authoritative normal defeat still earns its configured Credits. Tutorial, practice, developer assistance, AI self-play, War Room, unresolved results and concessions remain excluded under the existing eligibility rules.

New card mastery points require actual observed use: a deployment, attack, elimination, territory contribution, faction action or played order. Merely including an idle card in the deck cannot earn points or unlock wear. Multiple copies count as one card history per match, while their observed actions accumulate.

| Observed event | Points |
| --- | ---: |
| Match in which the card was actually used | 1 |
| Victory in which the card was actually used | 1 |
| Deployment | 2 |
| Attack | 1 |
| Elimination | 2 |
| Territory contribution | 1 |
| Faction action | 1 |

A played order with no deployment receives the actual-used match point and, on a win, its victory point. An order's other observed accomplishments use the same table. These are the existing weights; the change removes idle inclusion as a source of new points. Stats never award currency or change a card's gameplay definition.

| Cumulative points | Unlocked wear |
| ---: | --- |
| 25 | Field-Worn |
| 100 | Battle-Hardened |
| 300 | Veteran |

Existing points and every previously unlocked variant remain earned. Unlocks are not automatically equipped. Select finish and wear independently in card inspection. Turning wear off leaves the premium finish selected; changing the premium finish leaves wear selected. The next milestone shows its label, threshold and remaining points; Veteran shows no next milestone.

Private friend matches keep the v1.1.0 **mastery-only** policy: only cards confirmed as deployed or played can progress, with no Credits, Supply, packs or ordinary first-match bonus. Unresolved, abandoned and conceded private matches remain excluded. Existing Commander participation and activation counters retain their original rules.

## Lightweight history

Each card receives an additive `history` object, rather than a growing match log:

- `matchesUsed`: confirmed actual-used matches recorded from Arsenal Prestige onward.
- `deployments`: preserved historical deployments plus new observed deployments.
- `winsIncluded`: preserved victories while in the deck plus new eligible deck victories. This is a history statistic; idle wins do not award mastery points.
- `firstAcquiredDate` and `firstAcquiredKnown`: the known first-acquisition date, or an honest unknown legacy date.
- `historyComplete`: whether detailed history begins at a known acquisition, rather than midway through an existing collection.
- `lastProgress`: one bounded explanation of the latest earned points. It replaces the previous explanation rather than appending a log.

Old `mastery.matchesIncluded` and `mastery.victories` counters remain intact and continue describing deck inclusion. They are not relabeled as actual-use counts. An old card can show its preserved deployments and deck victories while showing zero *confirmed matches used since Arsenal Prestige*: cumulative legacy inclusion cannot reconstruct which matches actually used that card. Existing earned mastery remains visible and is never reset.

Fresh profiles record their starter acquisition time when persistent storage is initialized. Acquiring a previously unowned card through a pack or crafting records its first known acquisition once. Additional copies, duplicate conversion and retrying a transaction do not change that date. An already owned legacy card with an unknown first-acquired date stays unknown even if another copy is acquired later.

## Save compatibility and API

The collection storage key `frontlines.collection.v1`, schema version 1, entitlement array `variants`, legacy `preferredVariant` and every legacy mastery field remain supported. The additive `prestigeVersion: 1` marker records this migration. Local decks, settings, tutorial progress, multiplayer preferences and match history use their existing storage unchanged.

Legacy selected Field-Worn, Battle-Hardened or Veteran migrates to a Standard cosmetic finish plus the selected wear. The original `preferredVariant` remains retained. Legacy Foil and Full-Art selections remain premium finishes. Migration preserves unknown saved fields, ownership, wallets, purchases, receipts, pity counters and RNG. A corrupt or unsupported save stays recoverable, remains read-only and is never overwritten with a fresh profile.

Public collection APIs:

```js
cosmeticState(card, profile?, seed?)
// { rarity, owned, variant, wear, favorite, unlockedVariants, unlockedWear }

masterySummary(card, profile?)
// { points, level, levelLabel, matchesUsed, deployments, winsIncluded,
//   firstAcquiredDate, firstAcquiredKnown, historyComplete,
//   legacyMatchesIncluded, lastProgressReason, lastProgressPoints,
//   nextMilestone: { points, wear, label, remaining } | null }

setCosmeticPreferences(id, { variant?, wear?, favorite? }, storage?)
setFavorite(id, boolean, storage?)
```

Read-only summaries never mutate a supplied profile or grant an entitlement. Random finish selection chooses only owned cosmetic finishes and uses a copied RNG cursor; it does not consume economic pack randomness. Favorite state can mark an unowned card without granting ownership. Selection validates owned finishes and earned wear. The legacy `setPreferredVariant` / `variantFor` API remains available for earlier callers.

Rewards and selections commit through the existing single-document transaction. Stable normal-match IDs and `private-` receipts make replayed results idempotent. A failed storage write changes neither progress nor wallet and may be retried safely.

## Multiplayer, accessibility and verification

History and cosmetics are local presentation data and never enter gameplay definitions, deck legality or ruleset hashes. The opponent receives no private collection inventory, history, hand identities or deck order. Public opponent cards render standard finish and wear when safe cosmetic synchronization is unavailable; rarity still comes from public collectible metadata. Cosmetic mismatch cannot block the canonical match protocol.

Wear has a visible named label and milestone text. The shared renderer layers it independently from rarity geometry and the premium artwork finish, including when visual effects are reduced. No continuous progression polling or huge per-match history is needed.

`tests/sprint14-history.test.js` covers frozen economy and pack output, v1.0.5 and v1.1.0 migration, legacy selection, Legendary Foil Veteran stacking, actual-use points, idle inclusion, orders, private-match exclusions/idempotency, malformed counters, honest acquisition dates, preference ownership validation, deterministic finish selection, quota recovery and stat-neutral read-only views. No balance simulation is required for these rules.
