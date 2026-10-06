# Forge Sprint 011 — v1.0.4 Tactical Arsenal

Frontlines v1.0.4 adds forty tactical battlefield cards, five 26-card showcase decks and optional advanced training to the published v1.0.3 foundation. The territory/Capacity/Command Action game, ten off-lane Commanders, old artwork, collection economy and beginner tutorial remain intact. This is a local playtest candidate; it has not been published or installed over the owner's game.

## Provenance and scope

The authoritative base is **7f388ec66fb80f4c8d9883b3111551dd8ab0e829 — Frontlines v1.0.3 - Balance Recovery**. HEAD was verified before implementation. The entry suite passed **334/334**. [The entry checkpoint](balance/sprint11-v1.0.3-baseline/checkpoint-hashes.json) freezes 95 runtime files and [the old rules/catalog](balance/sprint11-v1.0.3-baseline/rules-and-decks.json). The old v1.0.3 installer and source ZIP remain available. No new commit is claimed.

The live rules profile is `sprint11 / sprint11-tactical-v1`, engine `frontlines-territory-v7-tactical`. Historical profiles still instantiate their original card pools and mechanics. New modules are loaded consistently in browser, worker, Node and packaged desktop contexts.

## Arsenal and five lists

**Exactly 40 additions: eight per faction; 155 battlefield designs total.** Each faction adds 3 Common, 2 Uncommon, 2 Rare and 1 Legendary. The complete inventory, printed costs/stats, rules, design intent, counterplay and exact five deck lists are in [Tactical Arsenal](TACTICAL-ARSENAL.md). These are ordinary battlefield Units, Orders, Assets and one battlefield Leader; no new off-lane Commander is added.

| Faction | Showcase | Tactical identity |
| --- | --- | --- |
| Stonewall | Prepared Ground | Paid Cover, repair and surviving a defensive stand |
| Bruiser | Breach Column | Fortification removal, bounded Blast and risky pressure |
| Syndicate | Fire Control | Mark/Exposed setup, combined classes and precision payoff |
| Nightwalker | Smoke and Mirrors | Timed evasion, temporary Smoke and measured withdrawal |
| Rogue | Make Do | Real material sacrifice, patching and flexible paid tools |

Each showcase combines all eight new faction designs with existing roles. All five obey the existing 26-card, single-faction, four-copy and Leader/unique restrictions. The thirty existing built-in lists remain unchanged, including the repaired Sprint 10 hybrids and ten Commander foundations. Custom decks and import/export use the same validation.

## Exact mechanics

[`tactical-rules.js`](../tactical-rules.js) is the canonical implementation and glossary source. A direct enemy hit means an initiated combat attack, single-target damaging Order/Commander ability or Overwatch reaction. Simultaneous return fire, Ambush, Retaliate and Blast are not direct hits.

| Mechanic | Final rules |
| --- | --- |
| Cover | Reduce the next eligible direct enemy hit by 2, then consume. One charge; refresh never stacks. Expires at the protected owner's next action-window start. |
| Breach | Initiated attacks remove and ignore Cover. Printed Asset bonuses apply only to Assets. Breach alone does not counter Dodge. |
| Blast | Damage at most two enemy permanents in the chosen territory, in numeric UID order. Apply all selected wounds before resolving casualties. Bypass Cover/Dodge/Smoke without consuming them; no generic Mark or Exposed bonus. Coordinated Barrage's explicit prepared-target bonus is applied once for Mark **or** Exposed. |
| Dodge | Avoid the next eligible direct hit deterministically; consume the charge. Mark, Precision or Exposed bypasses and consumes it. One charge, refreshed duration; expires at protected owner's next start. |
| Suppression | −1 Attack, minimum zero, and no voluntary movement through the end of the target's next action window after application. Refresh, never stack. Forced retreat/Breakthrough still happen. Traits, Orders, attacks and abilities continue to work. Distinct from legacy Sabotage. |
| Overwatch | A ready source spends 1 Command Action and exhausts to prepare printed direct reaction damage. Newly deployed sources need Rush. First voluntary enemy entry into the same territory triggers once; numeric source UID order, stopping on entrant death. Expires at source owner's next start; movement/attack/ability cancels it. Forced retreat/Breakthrough do not trigger. Smoke blocks the reaction. Improvised Mine auto-arms and destroys itself by rule resolution on triggering. |
| Sacrifice | Explicitly destroy a friendly permanent as an irreversible paid cost. Validate every source/payoff/Capacity/command requirement before spending anything. No Scavenge, Nothing Wasted, enemy kill credit or extra Presence refund. Normal commitment release still occurs. |
| Exposed | Immediately remove Cover and Dodge; add 1 to the next eligible direct hit, then consume. One charge, refreshed duration; expires at target owner's next start. No generic Blast/return-fire/Retaliate/Ambush bonus. |
| Smoke (supporting effect) | Friendly permanents in its territory take 1 less direct enemy damage; no Overwatch reacts to entry there while Smoke exists. Refresh per owner/territory; expire at creator's next start. Does not deny Mark or ordinary targeting. Blast bypasses it. |

Persistent effect records have stable IDs, kind, owner/target/territory, source attribution, start turn, amount, refresh/consumption rules and explicit expiry boundary. They serialize in authoritative state. Destruction has explicit `combat`, `enemyEffect`, `alliedEffect`, `sacrifice`, `displacementFailure` or `rulesResolution` provenance. No animation or hidden random roll determines an outcome.

## Compatibility decisions

No existing card's printed Presence, Attack, Health, traits, effect amount, Command cost or rules text was changed. No old preset was rewritten. Ten Commander definitions remain unchanged. New defensive states necessarily affect old **direct** attacks and damaging Orders/Commander commands; this is additive tactical interaction rather than an old-card stat adjustment.

Bloodhound/Coordinator direct damage observes Cover, Dodge and Smoke; Coordinator still Marks before its hit. Ghost/Drifter voluntary relocation observes Suppression and entry reactions. The optional response Retreat is voluntary and is also blocked by Suppression. Forced capture retreat remains authoritative and cannot be refused. Mark and Precision counter Dodge; Armor/Fortify still reduce ordinary combat. Suppression never silently replaces Sabotage.

The v1.0.3 Rogue fix remains: Scavenge/Nothing Wasted share one enemy-casualty draw per player/global turn, and reclaimed cards retain wounds. Sacrifice and consumed Mines are excluded from that casualty budget. Temporary statuses clear on recall; wounds do not. Hold Fast adds temporary pressure only after a real surviving defense; normal capture/contiguous-frontline/retreat logic resolves it. No instant territory overwrite was introduced.

## Collection, saves and art

All forty additions use existing pack rarity odds, crafting prices, duplicate Supply, mastery and cosmetic rules. No new currency or free expansion grant. Fresh and migrated collections initially own none of the new cards; original starter/Commander grants remain exact. Wallets, pending packs, owned copies, mastery/cosmetics, tutorial progress and legal saved decks are retained. War Room may test all legal cards independently of ownership. Normal Play still enforces collection ownership.

The new set/filter/tag UI exposes mechanics and full printed rules. Existing Lab settings using the prior live default migrate to Sprint 11; deliberately selected older profiles remain selectable. Every export retains its exact profile/rules snapshot.

Forty original local vector illustrations use faction palettes, equipment silhouettes and tactical Order symbols, with uniform crop/scale. They total less than 150 KB, contain no external resources and never stretch. All 115 old art API outputs and protected art assets are checked against v1.0.3. Illustrated Commanders and canonical 5:7 full card faces remain. The new art is a coherent tactical illustration set; a future portrait detail pass can improve it without remapping legacy images.

## Interface and learning

Status badges show Cover/Dodge/Exposed/Suppression/Overwatch and timing; Smoke marks territory. Blast highlights the territory and actual bounded targets. Printed unit abilities and Overwatch have explicit costs and legal targeting. Sacrifice asks for a real source and a distinct legal payoff, then presents a named irreversible-cost confirmation; cancelling preserves identical state.

The fourteen beginner tutorial lessons remain intact, including explicit Commander teaching. [Six optional advanced exercises](TACTICAL-TRAINING.md) teach **Action → Counter → Result** with real engine actions: Cover/Breach, clustering/Blast, Dodge/Mark/Exposed, Overwatch/Suppression, enemy damage/Sacrifice/repair, and Overwatch/Smoke/timing. They grant no match or progression rewards.

## AI and Balance Lab

The tactical AI remains a public-information policy. It evaluates exact paid costs/readiness, protection with one-charge timing, prepared fire, suppression mobility, Breach/Asset opportunities, bounded Blast clusters, setup/payoff and real Sacrifice material cost. New archetypes inherit relevant faction priorities; training/normal/hard/expert remain separate policies. It cannot read the opponent's hand, reserve order or RNG state. Frozen Sprint 10 decisions remain reproducible.

Simulator 5 / telemetry 7 under Sprint 11 reports applications/consumption/expiry, actual protection, Breach bypass/Asset bonus, Blast victims, Overwatch setups/triggers, Sacrifice causes/commitment release, Suppression, Exposed and Smoke. Faction/deck/Commander/archetype/seat/matchup/cutoff statistics remain; deck groups separate **20 legacy**, **10 Commander foundations** and **5 tactical showcase** lists. HTML/CSV/JSON retain diagnostic caveats. No tactical effects are omitted from simulated rules.

## Validation and boundaries

Entry tests, final rules/AI/telemetry tests, all forty art decode/detail inspections, five legal showcases, collection preservation, browser Worker equivalence, tutorial/training, populated viewport checks and native packaging checks are recorded in the [release guide](RELEASE-1.0.4.md) and [machine-readable manifest](release-1.0.4-manifest.json). Browser checks cover 1920×1080, 1600×900, 1366×768 and 1280×720, compact windows/scaling and canonical card proportions. Native checks verify real F11/Alt+Enter behavior and trusted advanced training.

**Zero autonomous balance campaigns.** Complete-match fixtures are correctness checks only; the Node/Worker expansion fixture reuses the same seed, not independent balance samples. No 1k/10k/100k/matrix sweep was executed. No faction/deck win-rate claim is made. The detailed final counts and artifact hashes belong to the final release manifest, avoiding stale numbers during packaging.

## Exact recommended owner-run validation — not executed

After manually playing ordinary/custom decks, all five showcases and all six exercises, run **100,000 matches** in War Room using [the saved exact options](balance/sprint11-validation-options.json): `sprint11`, all 35 built-in deck IDs, mirrors on, paired seats, deck AI on both sides, seed **1209**, default 20→80 Capacity/+10 growth, 3 commands, capture threshold 25, 7 territories, 5 slots, 5 opening cards/+1 draw, 240-turn and 10,000-decision cutoffs. This is a recommendation for Ryken, not authorization to run it here.

Export JSON, HTML, deck/card/Commander/match CSV and tactical diagnostics. Inspect legacy/showcase/foundation groups separately, then faction, Commander, archetype, seat, matchup, unfinished/error counts, turn lengths, territory flow and mechanic exposure. Use decisive and all-attempt denominators explicitly; do not bury cutoffs or interpret card correlations as causal strength. With 35 decks and mirrors, a complete seat-paired schedule is **1,225 matches**; 100,000 ends partway through a cycle. Report actual per-cell samples instead of claiming perfectly equal exposure. Historical v1.0.2 interim data and a Sprint 10 comparison cannot be combined into a new causal win rate.

## Known risks and next work

Competitive balance of the forty-card expansion is unmeasured. Paid area damage, cheap preparations, Hold Fast pressure, prepared-target burst and Mine/Sacrifice sequencing deserve manual counterplay review and exposure-aware owner analysis. AI competence is tested, not proven optimal. New vector art is readable and consistent but less detailed than existing illustrated Commander portraits. The release is locally packaged without publication; Windows signing/reputation and the owner's real display/device still require distribution/manual checks. Online multiplayer, accounts, monetization and broad rebalance remain outside this sprint.
