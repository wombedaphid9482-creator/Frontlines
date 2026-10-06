# Tactical Arsenal — Forge Sprint 011

Frontlines v1.0.4 adds exactly 40 battlefield card designs: eight for each of the five existing factions. The 115-card v1.0.3 pool and ten separate Commanders remain the foundation. This document lists the final card data and five new showcase lists; the sprint report records engine compatibility changes and validation.

## Design and acquisition

Each faction adds three Common, two Uncommon, two Rare and one Legendary design. Rarity describes tactical identity and complexity, not a numerical advantage. New units pay for utility through weaker raw combat bodies, paid abilities, readiness, setup requirements or genuine material costs.

All forty designs enter Standard, faction, Veteran and Elite pack pools using existing rarity odds, guarantees, pity and cosmetic rolls. Crafting and duplicate Supply values are unchanged. Mastery, wear, Foil and Full-Art treatments use the existing architecture. No new currency or progression system is introduced.

New designs begin unowned in fresh and migrated normal collections. Original starter inventories, Commander grants, Credits, Supply, mastery, cosmetic preferences and schema version remain unchanged. War Room and simulator decks, including these showcase presets and legal imported custom decks, are independent of collection ownership. Normal match and editor ownership rules remain intact.

## Tactical rules contract

| Mechanic | Exact timing, stacking and counterplay |
| --- | --- |
| Cover | One charge reduces the next eligible direct enemy hit by 2, then is consumed. Direct hits are initiated combat, single-target damage Orders, damaging Commander abilities and Overwatch; return fire, Ambush, Retaliate and Blast are excluded. It never stacks and expires when its owner’s next offensive action window begins. Breach removes/ignores it; Blast bypasses it. |
| Breach | Initiated attacks remove and ignore Cover. Any printed Asset damage bonus applies only to Assets. It grants no generic bonus to unprepared units and does not itself counter Dodge. |
| Blast | A territory-targeted effect damages at most its printed target cap, using numeric unit-ID order. Expansion grenades cap at two enemies. It bypasses Cover and Dodge, gains no Mark bonus and does not consume Exposed’s direct-hit charge. Friendly units are excluded unless a card explicitly says otherwise. |
| Dodge | One deterministic charge avoids the next eligible direct enemy hit. Mark on the defender, Precision on the attacker or Exposed counters it; the charge is consumed even on a bypass. It never stacks and expires when its owner’s next offensive action window begins. No percentage miss rolls. |
| Suppression | −1 Attack, with a minimum of zero, and no voluntary movement until the end of the target’s next offensive action window. Applying again refreshes duration without stacking. It does not disable printed traits, attacks, Orders, deployment or abilities; it differs from existing Sabotage. |
| Overwatch | A ready, previously deployed unit spends its printed setup cost and exhausts instead of attacking. The first enemy voluntary move, deployment or Drifter relocation into the same territory triggers its printed direct reaction damage and consumes the state. Forced retreat and Breakthrough do not trigger it. Sources resolve in numeric unit-ID order. It expires at the owner’s next offensive-window start. Smoke prevents reactions in that space. Improvised Mine arms on deployment and destroys itself by rule resolution on triggering. |
| Sacrifice | The owner explicitly destroys a friendly permanent as a cost. Source and payoff targets must satisfy the card’s public legality requirements. Destruction cause is `sacrifice`; general Scavenge/Nothing Wasted casualty rewards do not trigger. The lost card, paid Capacity and spent Command Action remain real costs. |
| Exposed | Applying removes Cover and Dodge. The next eligible direct enemy hit receives +1 damage, then consumes Exposed. It never stacks and expires when the target’s next offensive action window begins. It supplies no Blast, return-fire, Ambush or Retaliate bonus. |
| Smoke (supporting territory effect) | Friendly permanents in the chosen territory take 1 less direct enemy damage; Overwatch does not react within that territory. Smoke expires at the creator’s next offensive-window start, never stacks, does not forbid Mark targeting and does not protect against Blast. |

Activated tactical abilities exhaust their source, pay their exact Capacity and Command Action cost and obey deployment/readiness locks. Targeting uses engine-generated legal actions. A shield cannot silently stack, an exhausted tool cannot fire again, and animations never determine outcomes.

## New card inventory

| Faction | Card | Rarity | Type | Presence | Attack / Health | Play Command Actions |
| --- | --- | --- | --- | ---: | --- | ---: |
| Stonewall | Trench Engineer | Common | Unit | 3 | 1 / 4 | 0 |
| Stonewall | Shield Section | Uncommon | Unit | 5 | 1 / 6 | 0 |
| Stonewall | Bastion Gunner | Rare | Unit | 6 | 3 / 5 | 1 |
| Stonewall | Field Mechanic | Common | Unit | 4 | 1 / 4 | 0 |
| Stonewall | Hardpoint | Rare | Asset | 5 | 0 / 6 | 0 |
| Stonewall | Dig In | Common | Order | 2 | — | 0 |
| Stonewall | Interlocking Fire | Uncommon | Order | 3 | — | 1 |
| Stonewall | Hold Fast | Legendary | Order | 5 | — | 1 |
| Bruiser | Demolition Squad | Common | Unit | 5 | 3 / 4 | 0 |
| Bruiser | Grenadier | Uncommon | Unit | 5 | 2 / 4 | 0 |
| Bruiser | Suppressor Heavy | Rare | Unit | 7 | 3 / 6 | 1 |
| Bruiser | Linebreaker | Rare | Unit | 7 | 4 / 5 | 1 |
| Bruiser | Assault Charge | Common | Order | 3 | — | 1 |
| Bruiser | Frag Out | Common | Order | 4 | — | 1 |
| Bruiser | No Shelter | Uncommon | Order | 3 | — | 1 |
| Bruiser | Break the Position | Legendary | Order | 5 | — | 1 |
| Syndicate | Spotter Cell | Common | Unit | 3 | 1 / 3 | 0 |
| Syndicate | Fire Control Officer | Rare | Leader | 6 | 2 / 4 | 1 |
| Syndicate | Contract Marksman | Uncommon | Unit | 6 | 3 / 4 | 0 |
| Syndicate | Suppression Team | Common | Unit | 4 | 2 / 4 | 0 |
| Syndicate | Recon Drone | Rare | Asset | 3 | 0 / 3 | 0 |
| Syndicate | Target Package | Common | Order | 2 | — | 1 |
| Syndicate | Coordinated Barrage | Uncommon | Order | 4 | — | 1 |
| Syndicate | Contingency Plan | Legendary | Order | 4 | — | 1 |
| Nightwalker | Smoke Runner | Common | Unit | 3 | 1 / 3 | 0 |
| Nightwalker | Ghost Operative | Uncommon | Unit | 5 | 3 / 3 | 0 |
| Nightwalker | Shadow Trapper | Rare | Unit | 4 | 2 / 3 | 0 |
| Nightwalker | False Contact | Common | Asset | 2 | 0 / 2 | 0 |
| Nightwalker | Smoke Screen | Uncommon | Order | 3 | — | 1 |
| Nightwalker | Vanish | Common | Order | 2 | — | 1 |
| Nightwalker | Expose the Opening | Rare | Order | 2 | — | 1 |
| Nightwalker | Clean Exit | Legendary | Order | 4 | — | 1 |
| Rogue | Scrap Grenadier | Common | Unit | 3 | 1 / 3 | 0 |
| Rogue | Jury-Rigged Shield | Uncommon | Asset | 3 | 0 / 3 | 0 |
| Rogue | Patch Runner | Common | Unit | 4 | 1 / 3 | 0 |
| Rogue | Improvised Mine | Rare | Asset | 2 | 0 / 2 | 0 |
| Rogue | Make It Work | Common | Order | 3 | — | 1 |
| Rogue | Salvage Charge | Uncommon | Order | 3 | — | 1 |
| Rogue | Strip It for Parts | Rare | Order | 2 | — | 1 |
| Rogue | Bad Plan, Good Result | Legendary | Order | 4 | — | 1 |

## Stonewall — exact card text

### Trench Engineer

`stonewall_trench_engineer` · Common · Unit · 3 Presence · 1 Attack / 4 Health

On deployment: gain Cover. Entrench — pay 1 Capacity and 1 Command Action; exhaust to give one ally here Cover. Cover reduces the next direct enemy attack by 2, then is consumed; it never stacks. Free Action — playing costs Capacity; no Command Action.

**Choice it creates:** A weak attacker turns spare actions and Capacity into one-shot protection. Blast and Breach answer the position.

### Shield Section

`stonewall_shield_section` · Uncommon · Unit · 5 Presence · 1 Attack / 6 Health

Guard. Shield Wall — pay 1 Capacity and 1 Command Action; exhaust to give another ally here Cover. Guard remains vulnerable to Precision and prepared Breach. Free Action — playing costs Capacity; no Command Action.

**Choice it creates:** Protect a valuable neighbor by sacrificing this section’s readiness; does not passively cover the whole army.

### Bastion Gunner

`stonewall_bastion_gunner` · Rare · Unit · 6 Presence · 3 Attack / 5 Health

Overwatch — instead of attacking, pay 1 Command Action and exhaust. The first enemy deployment or movement into this territory takes 2 direct damage; consume Overwatch. It expires when your next action window begins. Playing costs 1 Command Action in addition to Capacity.

**Choice it creates:** A substantial stationary commitment deters careless entry but does not react to enemies already present.

### Field Mechanic

`stonewall_field_mechanic` · Common · Unit · 4 Presence · 1 Attack / 4 Health

Repair — pay 1 Capacity and 1 Command Action; exhaust to heal one damaged friendly unit or Asset here by 2. Repair does not raise maximum Health. Free Action — playing costs Capacity; no Command Action.

**Choice it creates:** Trades attack tempo and paid maintenance for controlled chip-damage repair rather than repeatable free healing.

### Hardpoint

`stonewall_hardpoint` · Rare · Asset · 5 Presence · 0 Attack / 6 Health

At the beginning of your action window: give the most wounded friendly unit here Cover (ties: lowest unit ID). One unit only; Cover does not stack. Immobile. Breach attacks gain their printed Asset bonus. Free Action — playing costs Capacity; no Command Action.

**Choice it creates:** An interactable, nonattacking position prepares one defender and is vulnerable to dedicated anti-Asset pressure.

### Dig In

`stonewall_dig_in` · Common · Order · 2 Presence

Give one friendly permanent Cover. The next eligible direct enemy attack is reduced by 2, then Cover is consumed. Cover expires at your next action-window start. Blast bypasses it; Breach removes it. Free Action — playing costs Capacity; no Command Action.

**Choice it creates:** Emergency paid defense preserves actions but buys only a single protected exchange.

### Interlocking Fire

`stonewall_interlocking_fire` · Uncommon · Order · 3 Presence

Choose a territory with at least two friendly units. Give up to two of them Cover, choosing the most wounded first (ties: lowest unit ID). Each charge reduces one direct attack by 2; never stacks. Playing costs 1 Command Action in addition to Capacity.

**Choice it creates:** Rewards concentration but competes with deployment and loses value to area damage.

### Hold Fast

`stonewall_hold_fast` · Legendary · Order · 5 Presence

Choose territory with at least two friendly units, including one that survived defending combat in the immediately preceding enemy action window. Heal its friendly units by 1 and give up to two Cover. Gain +2 capture pressure there until this action window ends. No instant capture or unresolved-defender bypass. Playing costs 1 Command Action in addition to Capacity.

**Choice it creates:** Converts a successful defensive stand into a brief controlled advance; requires a real surviving defender and cannot hold indefinitely.


## Bruiser — exact card text

### Demolition Squad

`bruiser_demolition_squad` · Common · Unit · 5 Presence · 3 Attack / 4 Health

Breach — direct attacks remove and ignore Cover. Deal +1 combat damage against Assets only. No bonus against ordinary units without Cover. Free Action — playing costs Capacity; no Command Action.

**Choice it creates:** A fragile dedicated fortification answer loses efficiency against unprepared troops.

### Grenadier

`bruiser_grenadier` · Uncommon · Unit · 5 Presence · 2 Attack / 4 Health

Grenade — pay 2 Capacity and 1 Command Action; exhaust to deal 2 Blast damage to up to two enemies here (lowest unit IDs first). Blast bypasses Cover and Dodge; it gains no Asset bonus. Free Action — playing costs Capacity; no Command Action.

**Choice it creates:** A poor raw combat body supplies paid, limited area damage against clustered defenders.

### Suppressor Heavy

`bruiser_suppressor_heavy` · Rare · Unit · 7 Presence · 3 Attack / 6 Health

Suppressive Fire — pay 1 Capacity and 1 Command Action; exhaust to Suppress an enemy here. Until its next action-window end it has −1 Attack and cannot voluntarily move; refreshes duration, never stacks. Playing costs 1 Command Action in addition to Capacity.

**Choice it creates:** Ties up an expensive Heavy to limit mobility without preventing deployment, Orders, abilities or attacks.

### Linebreaker

`bruiser_linebreaker` · Rare · Unit · 7 Presence · 4 Attack / 5 Health

Breach — remove and ignore Cover when attacking. Deal +2 combat damage against Assets only. Aggressive commitment; wounds and failed assaults are not refunded. Playing costs 1 Command Action in addition to Capacity.

**Choice it creates:** An expensive anti-infrastructure finisher remains killable and is less efficient against mobile forces.

### Assault Charge

`bruiser_assault_charge` · Common · Order · 3 Presence

Give one ready friendly unit +2 Attack and Exposed until your next action window begins. Exposed removes Cover and Dodge; its next direct enemy hit deals +1 damage. Does not ready an exhausted or newly deployed unit. Playing costs 1 Command Action in addition to Capacity.

**Choice it creates:** Paid pressure exposes the attacker to a real counterattack instead of granting extra attacks.

### Frag Out

`bruiser_frag_out` · Common · Order · 4 Presence

Choose a territory containing enemies. Deal 2 Blast damage to up to two enemy permanents there (lowest unit IDs first). Blast bypasses Cover and Dodge; never damages friendly cards. Playing costs 1 Command Action in addition to Capacity.

**Choice it creates:** Answers clustered preparation with a sensible two-target cap and a full action cost.

### No Shelter

`bruiser_no_shelter` · Uncommon · Order · 3 Presence

Choose an enemy permanent. Remove its Cover, then deal 1 damage, or 3 if it is an Asset. This effect ignores Cover; Dodge can avoid it unless countered by Mark or Exposed. No bonus against ordinary units. Playing costs 1 Command Action in addition to Capacity.

**Choice it creates:** An efficient narrow Asset answer is deliberately modest against an unfortified unit.

### Break the Position

`bruiser_break_the_position` · Legendary · Order · 5 Presence

Choose territory with a friendly unit and a Covered or wounded enemy, or an enemy Asset. Remove enemy Cover there, Suppress one eligible enemy (lowest ID), and ready one friendly unit there (lowest ID) that has not attacked this action window. Never grants a second attack. Playing costs 1 Command Action in addition to Capacity.

**Choice it creates:** Requires a contested damaged position, pays an action, and converts a cracked defense into one usable follow-up.


## Syndicate — exact card text

### Spotter Cell

`syndicate_spotter_cell` · Common · Unit · 3 Presence · 1 Attack / 3 Health

Designate — pay 1 Capacity and 1 Command Action; exhaust to Mark and Expose one enemy here. Exposed removes Cover/Dodge and adds +1 to its next direct enemy hit. Both statuses have explicit expiry. Free Action — playing costs Capacity; no Command Action.

**Choice it creates:** A low-stat setup piece earns value only if another unit can exploit its paid action.

### Fire Control Officer

`syndicate_fire_control_officer` · Rare · Leader · 6 Presence · 2 Attack / 4 Health

Command — other allies here gain +1 Attack. Fire Solution — pay 1 Capacity and 1 Command Action; exhaust to Expose one already Marked enemy here. No legal target without Mark. Playing costs 1 Command Action in addition to Capacity.

**Choice it creates:** A fragile command unit coordinates ordinary pieces and demands sequencing instead of supplying unconditional removal.

### Contract Marksman

`syndicate_contract_marksman` · Uncommon · Unit · 6 Presence · 3 Attack / 4 Health

Precision — bypass Guard and counter Dodge. Direct attacks deal +1 damage to an already Marked or Exposed target. This preparation bonus is once per attack, even if both statuses apply. Free Action — playing costs Capacity; no Command Action.

**Choice it creates:** A costly fragile specialist depends on setup to exceed an ordinary attacker’s performance.

### Suppression Team

`syndicate_suppression_team` · Common · Unit · 4 Presence · 2 Attack / 4 Health

Pinpoint Fire — pay 1 Capacity and 1 Command Action; exhaust to Suppress one enemy here. It has −1 Attack and cannot voluntarily move until its next action-window end. Does not stack. Free Action — playing costs Capacity; no Command Action.

**Choice it creates:** A modest body exchanges its own readiness for predictable tempo control rather than hard denial.

### Recon Drone

`syndicate_recon_drone` · Rare · Asset · 3 Presence · 0 Attack / 3 Health

Target Scan — pay 1 Capacity and 1 Command Action; exhaust to Mark and Expose one enemy here. Immobile and fragile; it does not reveal hidden hands or deck order. Free Action — playing costs Capacity; no Command Action.

**Choice it creates:** Interactable infrastructure sets up local targeting without card draw or omniscient information.

### Target Package

`syndicate_target_package` · Common · Order · 2 Presence

Mark and Expose one enemy permanent. Exposed removes Cover and Dodge and adds +1 to its next direct enemy hit; it expires when that enemy’s next action window begins. Marks never stack. Playing costs 1 Command Action in addition to Capacity.

**Choice it creates:** Setup spends Capacity and an action, so it needs an immediate or planned payoff.

### Coordinated Barrage

`syndicate_coordinated_barrage` · Uncommon · Order · 4 Presence

Choose enemy-occupied territory. Deal 1 Blast damage to up to two enemies there (lowest IDs first), or 3 to each target already Marked or Exposed. Blast bypasses Cover/Dodge but does not consume Exposed’s direct-hit charge. Playing costs 1 Command Action in addition to Capacity.

**Choice it creates:** Narrow powerful area payoff requires public preparation and is weak when fired without setup.

### Contingency Plan

`syndicate_contingency_plan` · Legendary · Order · 4 Presence

Choose territory with at least two different friendly unit classes. Give up to two friendly units Cover (most wounded first, ties: lowest ID), then draw 1 card. Requires combined arms; no free actions or resource refund. Playing costs 1 Command Action in addition to Capacity.

**Choice it creates:** Defensive sequencing replenishes one committed card only when multiple ordinary pieces are established.


## Nightwalker — exact card text

### Smoke Runner

`nightwalker_smoke_runner` · Common · Unit · 3 Presence · 1 Attack / 3 Health

Mobile. On deployment: gain Dodge until your next action window begins. Dodge cancels the next direct enemy attack unless its attacker is Precision or you are Marked/Exposed; no random rolls. Free Action — playing costs Capacity; no Command Action.

**Choice it creates:** Cheap fragile timing protection is consumed by one engagement and cannot sustain a frontline.

### Ghost Operative

`nightwalker_ghost_operative` · Uncommon · Unit · 5 Presence · 3 Attack / 3 Health

Precision. On deployment: gain Dodge until your next action window begins. After that one charge is consumed or expires, this operative has only 3 Health. Free Action — playing costs Capacity; no Command Action.

**Choice it creates:** A visible evasive entry buys an opening; prepared targeting and attrition remain efficient answers.

### Shadow Trapper

`nightwalker_shadow_trapper` · Rare · Unit · 4 Presence · 2 Attack / 3 Health

Overwatch — instead of attacking, pay 1 Command Action and exhaust. First enemy deployment or movement here takes 2 direct damage. Visible, consumed after one trigger; expires at your next action-window start. Free Action — playing costs Capacity; no Command Action.

**Choice it creates:** A fragile, readable threat manipulates entry timing without hidden dice, permanent stun or unavoidable global damage.

### False Contact

`nightwalker_false_contact` · Common · Asset · 2 Presence · 0 Attack / 2 Health

Guard. On deployment: gain Dodge until your next action window begins. This immobile decoy can intercept ordinary attacks while ready, but Precision bypasses it and Mark/Exposed counters Dodge. Free Action — playing costs Capacity; no Command Action.

**Choice it creates:** Cheap fragile deception buys one bad target rather than becoming permanently untargetable.

### Smoke Screen

`nightwalker_smoke_screen` · Uncommon · Order · 3 Presence

Choose territory with a friendly permanent. Smoke reduces direct enemy damage to your permanents there by 1 and blocks Overwatch reactions in that territory. It lasts until your next action window begins. Blast bypasses Smoke; Mark targeting remains legal. Playing costs 1 Command Action in addition to Capacity.

**Choice it creates:** Local paid misdirection counters prepared reactions but does not hide or disable the battlefield.

### Vanish

`nightwalker_vanish` · Common · Order · 2 Presence

Give one friendly unit Dodge until your next action window begins. One direct enemy attack is canceled unless answered by Precision, Mark or Exposed. No healing, draw, teleport or readiness refund. Playing costs 1 Command Action in addition to Capacity.

**Choice it creates:** Protect a valuable fragile piece for one timing window rather than reclaiming it into a free full-health reset.

### Expose the Opening

`nightwalker_expose_the_opening` · Rare · Order · 2 Presence

Expose one enemy unit that is wounded or exhausted. Remove Cover/Dodge; its next direct enemy hit gains +1 damage. Expires when its next action window begins; no effect on an uncommitted healthy ready unit. Playing costs 1 Command Action in addition to Capacity.

**Choice it creates:** Rewards reading visible overextension and supplies no unconditional stat or removal advantage.

### Clean Exit

`nightwalker_clean_exit` · Legendary · Order · 4 Presence

Choose a friendly unit that is wounded or has attacked this action window. Retreat it one territory toward your own rear and give it Dodge. Requires room; retains wounds and attack locks. No reclaim, draw or redeployment refund. Playing costs 1 Command Action in addition to Capacity.

**Choice it creates:** A paid, constrained escape lets an accomplished strike survive without recreating a heal or casualty loop.


## Rogue — exact card text

### Scrap Grenadier

`rogue_scrap_grenadier` · Common · Unit · 3 Presence · 1 Attack / 3 Health

Scrap Bomb — pay 2 Capacity and 1 Command Action; exhaust to deal 1 Blast damage to up to two enemies here (lowest IDs first). Blast bypasses Cover/Dodge. Less damage and a frailer body than Grenadier. Free Action — playing costs Capacity; no Command Action.

**Choice it creates:** Cheap awkward equipment buys a weaker version of the specialist answer while still paying its firing cost.

### Jury-Rigged Shield

`rogue_jury_rigged_shield` · Uncommon · Asset · 3 Presence · 0 Attack / 3 Health

Patch Cover — pay 1 Capacity and 1 Command Action; exhaust to give another ally here Cover. Immobile, fragile and vulnerable to Breach. No free repeating shield supply. Free Action — playing costs Capacity; no Command Action.

**Choice it creates:** An improvised defensive tool is less durable than Hardpoint and pays both readiness and upkeep.

### Patch Runner

`rogue_patch_runner` · Common · Unit · 4 Presence · 1 Attack / 3 Health

Mobile. Field Patch — pay 1 Capacity and 1 Command Action; exhaust to heal a damaged ally here by 1. Retains the normal move and attack limits. Free Action — playing costs Capacity; no Command Action.

**Choice it creates:** Flexibility and mobility trade away the specialist mechanic’s better repair and durability.

### Improvised Mine

`rogue_improvised_mine` · Rare · Asset · 2 Presence · 0 Attack / 2 Health

On deployment: arm a visible Overwatch trap. The first enemy voluntary move or deployment here takes 2 direct damage, then destroy this mine through rule resolution. It expires when your next action window begins. Immobile; can be destroyed first; forced retreats do not trigger it. Free Action — playing costs Capacity; no Command Action.

**Choice it creates:** A visible expendable trap threatens predictable entry with a fragile interactable source; consuming it yields no casualty draw.

### Make It Work

`rogue_make_it_work` · Common · Order · 3 Presence

Adapt — choose exactly one: Cover a friendly permanent; heal a wounded friendly permanent by 2; or Suppress an enemy permanent. All modes cost the same Capacity and 1 Command Action. No random result, draw or refund. Playing costs 1 Command Action in addition to Capacity.

**Choice it creates:** Three useful imperfect answers trade efficiency for a deliberate, predictable choice.

### Salvage Charge

`rogue_salvage_charge` · Uncommon · Order · 3 Presence

Sacrifice a friendly permanent in territory containing enemies. Deal 2 Blast damage to up to two enemies there (lowest IDs first). Sacrifice destroys your chosen card and never triggers Scavenge or Nothing Wasted; no draw or refund. Playing costs 1 Command Action in addition to Capacity.

**Choice it creates:** A real lost battlefield piece and paid Order turn awkward equipment into a narrow grenade payoff.

### Strip It for Parts

`rogue_strip_it_for_parts` · Rare · Order · 2 Presence

Choose a friendly permanent to Sacrifice and another damaged friendly permanent in the same territory. Heal the survivor by 3. Sacrifice destroys your source and never triggers casualty draw effects; no resource or card refund. Playing costs 1 Command Action in addition to Capacity.

**Choice it creates:** Save the more important piece by spending a real smaller piece; cannot self-target or mint infinite material.

### Bad Plan, Good Result

`rogue_bad_plan_good_result` · Legendary · Order · 4 Presence

Choose a wounded friendly permanent to Sacrifice and another friendly unit in the same territory. Give the survivor Cover and Dodge until its next action window begins. No draw, heal, readying or refund; Sacrifice does not trigger general casualty rewards. Playing costs 1 Command Action in addition to Capacity.

**Choice it creates:** Rescue one threatened survivor through a visible paid trade, with both protections temporary and answerable.

## Five showcase deck lists

Each list has exactly 26 cards, one faction and all eight new faction designs alongside existing battlefield roles. Normal Commander assignment follows the existing faction/archetype defaults; the Commander remains outside the 26-card list. Showcase cards are not automatically granted to normal collections. Original 30 baseline/foundation lists remain available.

### Stonewall — Prepared Ground

ID: `stonewall-prepared-ground` · analytics group: `tactical-showcase` · 26 cards

| Copies | Card | Set |
| ---: | --- | --- |
| 3 | Line Rifle Squad | Legacy |
| 2 | Shield Defender | Legacy |
| 2 | Watchguard Detachment | Legacy |
| 2 | Armored Escort | Legacy |
| 2 | Emergency Triage | Legacy |
| 2 | Brace for Impact | Legacy |
| 2 | Trench Engineer | Tactical Arsenal |
| 2 | Shield Section | Tactical Arsenal |
| 2 | Bastion Gunner | Tactical Arsenal |
| 1 | Field Mechanic | Tactical Arsenal |
| 2 | Hardpoint | Tactical Arsenal |
| 2 | Dig In | Tactical Arsenal |
| 1 | Interlocking Fire | Tactical Arsenal |
| 1 | Hold Fast | Tactical Arsenal |

### Bruiser — Breach Column

ID: `bruiser-breach-column` · analytics group: `tactical-showcase` · 26 cards

| Copies | Card | Set |
| ---: | --- | --- |
| 3 | Assault Squad | Legacy |
| 2 | Siege Heavy | Legacy |
| 2 | Breach Team | Legacy |
| 2 | Shock Runner | Legacy |
| 2 | Second Wind | Legacy |
| 2 | Violent Reprisal | Legacy |
| 2 | Demolition Squad | Tactical Arsenal |
| 2 | Grenadier | Tactical Arsenal |
| 1 | Suppressor Heavy | Tactical Arsenal |
| 2 | Linebreaker | Tactical Arsenal |
| 2 | Assault Charge | Tactical Arsenal |
| 2 | Frag Out | Tactical Arsenal |
| 1 | No Shelter | Tactical Arsenal |
| 1 | Break the Position | Tactical Arsenal |

### The Syndicate — Fire Control

ID: `syndicate-fire-control` · analytics group: `tactical-showcase` · 26 cards

| Copies | Card | Set |
| ---: | --- | --- |
| 3 | Security Detail | Legacy |
| 2 | Contract Enforcer | Legacy |
| 2 | Target Observer | Legacy |
| 2 | Blackline Courier | Legacy |
| 2 | Contract Strike | Legacy |
| 2 | Override Protocol | Legacy |
| 2 | Spotter Cell | Tactical Arsenal |
| 1 | Fire Control Officer | Tactical Arsenal |
| 2 | Contract Marksman | Tactical Arsenal |
| 1 | Suppression Team | Tactical Arsenal |
| 2 | Recon Drone | Tactical Arsenal |
| 2 | Target Package | Tactical Arsenal |
| 2 | Coordinated Barrage | Tactical Arsenal |
| 1 | Contingency Plan | Tactical Arsenal |

### Nightwalker — Smoke and Mirrors

ID: `nightwalker-smoke-and-mirrors` · analytics group: `tactical-showcase` · 26 cards

| Copies | Card | Set |
| ---: | --- | --- |
| 3 | Silent Blade | Legacy |
| 2 | Veil Stalker | Legacy |
| 2 | Ghost Marksman | Legacy |
| 2 | Night Reconnaissance | Legacy |
| 2 | Surgical Strike | Legacy |
| 2 | From the Dark | Legacy |
| 2 | Smoke Runner | Tactical Arsenal |
| 2 | Ghost Operative | Tactical Arsenal |
| 2 | Shadow Trapper | Tactical Arsenal |
| 1 | False Contact | Tactical Arsenal |
| 2 | Smoke Screen | Tactical Arsenal |
| 2 | Vanish | Tactical Arsenal |
| 1 | Expose the Opening | Tactical Arsenal |
| 1 | Clean Exit | Tactical Arsenal |

### Rogue — Make Do

ID: `rogue-make-do` · analytics group: `tactical-showcase` · 26 cards

| Copies | Card | Set |
| ---: | --- | --- |
| 3 | Dust Outrider | Legacy |
| 2 | Frontier Skirmisher | Legacy |
| 2 | Scrap Fighter | Legacy |
| 2 | Salvage Crew | Legacy |
| 2 | Repair Courier | Legacy |
| 2 | Break Contact | Legacy |
| 2 | Scrap Grenadier | Tactical Arsenal |
| 2 | Jury-Rigged Shield | Tactical Arsenal |
| 2 | Patch Runner | Tactical Arsenal |
| 1 | Improvised Mine | Tactical Arsenal |
| 2 | Make It Work | Tactical Arsenal |
| 2 | Salvage Charge | Tactical Arsenal |
| 1 | Strip It for Parts | Tactical Arsenal |
| 1 | Bad Plan, Good Result | Tactical Arsenal |

## Artwork pipeline

Forty faction-consistent vector equipment compositions have explicit card-ID mappings in `art.js`. Each optimized runtime asset has a square 400×400 viewBox, safe uniform cover cropping and no external image dependency. Full card faces retain 5:7 proportions. Original atlas mappings, ordinary paintings, source artwork and Commander portraits are preserved.

Regenerate only the new art with `node scripts/generate-tactical-art.js`. The generator writes `assets/cards/tactical-011/<faction>/<card-id>.svg` and the source manifest `assets/source/tactical-011/art-manifest.json`; it never replaces old assets. Forty runtime SVGs total less than 90 KB.

Collection and Deck Builder expose a Tactical Arsenal set filter. Keyword search/filtering understands the tactical mechanics, and exact card inspection remains complete even when the small face previews long rules.

## Validation and balance limits

Content and collection fixtures cover exact counts, five legal lists, preservation of all legacy metadata/economy/grants, v1.0.3 migration, all forty crafting/duplicate/mastery/cosmetic paths, deterministic packs and valid artwork. Forty individual engine fixtures deploy every new permanent, cast every new Order with legal public targets and resolve every activated ability after its real deployment lock. Additional deterministic fixtures verify stacking, consumption, expiry, counterplay, sacrifice costs, previews, Commander direct effects and contiguous captures. They complete no full matches. The full sprint report supplies AI, viewport and packaged-runtime results.

No large balance campaign was run. Conservative first-pass values and correctness tests establish playtest readiness; they do not establish competitive win rates. Prepared targeting, concentrated Cover, clustered Blast, Overwatch timing and explicit Sacrifice payoffs remain owner-playtest/balance risks. Pre-v1.0.3 rates are diagnostic history rather than expansion balance truth.
