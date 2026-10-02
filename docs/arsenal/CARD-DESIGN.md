# Arsenal design notes — Sprint 4

The playable pool contains 80 cards: the original 60 and 20 Arsenal additions. Every card is available for testing. Each faction has two 26-card archetype presets plus its preserved original starter. Construction uses one faction, at most four copies of a non-Leader card, and at most two copies of a Leader card. Unique still limits simultaneous battlefield copies, rather than acquisition.

Faction identity drives these designs. New tools use the existing territory, action, commitment, positioning and response systems. They do not introduce health-based player victory, random outcomes, or an alternate resource. Printed Presence remains a cost and a capture contribution, so a lower cost is not automatically an improvement.

The table shows the **Arsenal profile** values after its focused iteration 3 pass. P/A/H means Presence, Attack and Health. Orders show Presence and effect. The original authoring values remain in `data.js`; reviewable runtime changes live in `balance/arsenal.json`. All original starter card definitions are unchanged in the historical baseline profile.

| Faction / card | P/A/H or Order | Why choose it? | Cost, risk and counterplay |
| --- | --- | --- | --- |
| Stonewall — Watchguard Detachment | 5/2/6; Guard, Retaliate | An interception line that punishes opponents who leave its defender alive. | Shield Defender has one more Health at the same Presence. Direct damage avoids Retaliate; a lethal combat hit prevents it. |
| Stonewall — Field Redoubt | 6/0/9; Fortify, Command; Asset | A durable fixed anchor that supports nearby attackers and holds capture Presence. | Cannot follow Breakthrough or attack. Moving the objective can strand its investment; precision removal can target the support directly. |
| Stonewall — Counterbattery Section | 6/3/7; Fortify, Retaliate | Occupies controlled ground and punishes unsuccessful assaults, preparing a later advance. | Has no Guard: opponents can attack another ally. Fortify only applies on owned ground and never blocks Order damage. |
| Stonewall — Recovery Column | 5/2/4; Medic, Mobile | Moves healing support behind a counteroffensive without losing readiness on the first move. | Ordinary Field Medic has one more Health. Recovery only occurs at the owner's turn start; it cannot undo a lethal hit. |
| Bruiser — Shock Runner | 4/3/3; Rush, Mobile | A cheap forward unit can move and attack during its deployment turn if actions remain. | Three actions are still required for deploy, move and attack. Low Health makes failed rushes costly and gives removal a clean answer. |
| Bruiser — Breach Caller | 5/2/4; Command, Rush | Coordinates a shock group immediately, giving other allies stronger attacks. | Its own attack is weak; it does not boost itself. Selectively killing or sabotaging the caller breaks the coordination. |
| Bruiser — Rupture Heavy | 10/6/5; Berserk | A large territorial and combat commitment supports a deliberate breakthrough. | The first screen exposed excessive staying power at 7 Health. Five Health enables selective removal; it is expensive, lacks Guard and Rush, and a failed attack releases substantial commitment. |
| Bruiser — Overrun Charge | Order 6; damage 6 | Clears a six-Health defender without losing a valuable Heavy in retaliation. | Costs temporary Presence and a major action, does not create occupation, and is inefficient against tiny targets or targets above its lethal breakpoint. |
| Syndicate — Tactical Recovery Team | 5/2/5; Medic, Precision | Adds reliable recovery to a formation and can finish a weak protected target. | Modest Attack; healing must wait for the owner turn. Removing it breaks the formation's long-term recovery. |
| Syndicate — Rapid Security Detail | 5/3/5; Guard, Mobile | Keeps an interception ready while escorting units across the frontier. | More commitment than Security Detail. Only the first move preserves readiness, and Precision bypasses interception. |
| Syndicate — Contract Eliminator | 7/5/4; Precision, Mobile | A costly mobile specialist selects important targets rather than accepting a Guard's trade. | Low Health and no Rush: deployment timing matters. Direct damage, Ambush and an unfavorable retaliation punish careless movement. |
| Syndicate — Signal Lock | Order 3; Sabotage | Opens a calculated ability-removal window for an existing ready attacker. | Gives no raw damage or occupation. Without a remaining legal attack action, the window expires unused. It cannot cancel a response Order. |
| Nightwalker — Deep-cover Handler | 5/2/5; Command, Mobile | A mobile support piece turns several fragile units into a coordinated disruption force. | Does not strengthen itself, has low Attack, and rewards killing or suppressing the support before engaging its allies. |
| Nightwalker — Blackout Protocol | Order 2; Sabotage | Turns off Guard, Fortify, Command or Retaliate for a planned offensive exchange. | The target recovers traits at its next offensive turn start. It does not change printed stats or prevent reaction Orders, so timing and follow-up matter. |
| Nightwalker — Silencer Team | 6/5/4; Precision, Rush | An assassination finisher can attack a valuable protected target on deployment if the position allows it. | No Mobile: an ordinary move exhausts it. Four Health makes Ambush and direct removal effective responses. |
| Nightwalker — Ghost Extraction | Order 2; Reclaim | Returns a wounded specialist for a planned second entry and frees commitment. | Withdraws its capture Presence, consumes an action, and requires paying and deploying it again. Cannot be used as a defender response. |
| Rogue — Salvage Broker | 5/2/5; Scavenge, Mobile | Follows the battle and converts a nearby allied casualty into another option. | A source must survive; it cannot recover its own death. Multiple sources never stack draws. Remove the broker or fight elsewhere. |
| Rogue — Patchwork Bulwark | 6/3/6; Guard, Scavenge | Protects an attrition group while preserving casualty recovery. | Trail Guard has more Health and Mobile. Intercepting a lethal hit destroys the recovery source; Precision can attack another piece. |
| Rogue — Improvised Lancer | 5/4/4; Precision, Mobile | Provides flexible movement and selective attacks while deciding how much ground to contest. | No Rush, no protection and modest Health. The player must choose whether its next move is worth exposing it. |
| Rogue — Repair Courier | 4/2/5; Medic, Mobile | Repositions recovery cheaply between wounded groups rather than locking it in one static workshop. | Lower Presence contributes less capture pressure than Salvage Crew. Healing is delayed, and the courier cannot prevent lethal damage. |

## Exact new mechanics

**Retaliate:** After simultaneous combat damage and combat deaths, the defending card deals one non-combat damage to the surviving attacker if the defender survived and still has Retaliate. It is not another attack and creates no new response window. No effect follows a Retreat or an Ambush that ended the engagement. Orders and Retaliate hits do not trigger it; it never chains. Because the extra hit is non-combat damage, Fortify does not absorb it.

**Sabotage:** An action Order targets one enemy permanent with printed traits, turning all those traits off until that permanent's owner next begins an offensive turn. It cannot target an ally, a traitless permanent, or an already-suppressed permanent. Suppression ends before start-turn Medic effects. Printed Attack, Health, Presence and card type remain unchanged; incoming allied Command auras still work. The Order requires Presence and a major action. Suppression does not cancel already-played response Orders or erase damage. Its useful offensive window is primarily Guard, Command, Fortify, Berserk and Retaliate; disabling Medic, Rush or Mobile alone has no benefit before this expiry timing.

**Scavenge:** When another allied permanent in the source's territory dies, a surviving unsuppressed source draws one card. At most one Scavenge draw is attempted per player per global offensive turn, across every source and territory. Multiple sources do not stack. A source with lethal simultaneous damage cannot trigger, even if casualty removal is sequential internally. Normal draw recycling applies. A source cannot trigger from itself, an enemy death, Reclaim, or a move. The earliest surviving source in battlefield order receives attribution.

Engine dispatch is authoritative for both live matches and the Balance Lab. AI combat evaluation models Retaliate and active suppression; the deck-aware policy uses only its own declared archetype, own hand and public board. Tests cover lethal boundaries, simultaneous casualties, restoration timing, illegal targets, source attribution and hidden-information independence.

## Archetypes and composition

| Faction | First approach | Second approach |
| --- | --- | --- |
| Stonewall | Bastion: an enduring Guard/Fortify occupation, with fixed support. | Counteroffensive: recover surviving units and move support with the advance. |
| Bruiser | Shock Assault: Rush/Mobile pressure and fragile coordinated attacks. | Heavy Breakthrough: expensive supported units and deliberate demolition. |
| Syndicate | Combined Arms: Guard, Command and Medic give each piece a job. | Precision Operations: selective attacks, direct removal and timed suppression. |
| Nightwalker | Sabotage: mobile coordination turns brief ability windows into openings. | Assassination: protected-target removal and planned specialist extraction. |
| Rogue | Scavenger: surviving sources recover options from allied casualties. | Wildcard: Mobile, Precision, healing, Rally and Reclaim adapt to the visible situation. |

Preset counts are documented in `deck-presets.json`. Initial versions are retained in `deck-presets-v1.json`; the next revisions are in `deck-presets-v2.json`. Precision and Sabotage initially carried fourteen permanents and twelve Orders. The first two screens showed they could spend too many actions on tools without retaining occupation. Their revised lists carry seventeen permanents and nine Orders. Precision gains professional escort/contractor anchors; Sabotage gains mobile handlers/scouts and two finishers. Their tactical identities remain distinct.

The last composition pass keeps the card profile fixed. Counteroffensive exchanges two fragile Pathfinders, one Recovery Column and one Rally for two Bastion Heavies and two sturdier Field Medics. It retains three Counterbattery Sections, mobile recovery and two Rally Orders: recover a line, then advance a durable force. Shock Assault exchanges one Runner and one Caller for two ordinary Siege Heavies. Twelve Rush units remain, while the deck gains a late occupation anchor. This is a preset construction change, not a blanket stat buff or a new keyword.

The AI's first Sabotage heuristic overvalued suppression that expired unused. On the same 1,000-match schedule, corrected timing reduced Signal Lock from 170 uses with 12 observed combat windows to 15 uses with 13 windows, and Blackout from 276/39 to 42/29. A combat window is descriptive participation of a suppressed defender/attacker or Command aura, **not** a claim of prevented damage or causation.

## Quality pass and evidence limits

Watchguard and Recovery Column originally copied the Shield Defender and Field Medic stats while adding an ability. The Arsenal profile now taxes each new variant by one Health, so sturdier original cards remain valid construction choices. Fixed assets, reaction Orders, original rifle squads and original support units retain their niches. Card names that resemble existing roles are intentional editable prototype roles, not additional established lore.

The initial 1,000-match preset screen revealed a 93.5% Heavy Breakthrough win rate. Rupture Heavy's durability correction reduced this to 84.5% on the same screening seed. This remains a substantial warning: faction aggregates alone would conceal it. Later composition and standard-validation results belong in `SPRINT-004.md` and `BALANCE.md`; do not use these small screening samples as the final balance claim.

## Screening history

All four screens use 1,000 total matches, seed `20261004`, the same ten preset IDs, deck-aware AI, and seat-reversed pairs. The round-robin has 90 ordered orientations; 1,000 is not a complete number of cycles, so appearance counts range from 198 to 208 per deck. Each screen completed every match with **zero cutoffs and zero errors**. Samples by individual opponent are only about 22–24 matches and have broad intervals.

| Preset | Initial v1 | Timing/Heavy v2 | Quality/composition v3 | Final density pass |
| --- | ---: | ---: | ---: | ---: |
| Stonewall Bastion | 56.7% | 57.2% | 46.6% | 44.2% |
| Stonewall Counteroffensive | 42.0% | 41.5% | 26.0% | 54.0% |
| Bruiser Shock Assault | 29.0% | 29.5% | 24.5% | 28.0% |
| Bruiser Heavy Breakthrough | 93.5% | 84.5% | 79.5% | 79.0% |
| Syndicate Combined Arms | 69.5% | 72.0% | 70.0% | 66.0% |
| Syndicate Precision Operations | 13.5% | 13.0% | 41.5% | 36.0% |
| Nightwalker Sabotage | 28.3% | 30.3% | 60.1% | 54.0% |
| Nightwalker Assassination | 71.2% | 74.7% | 72.2% | 69.7% |
| Rogue Scavenger | 43.9% | 44.4% | 37.4% | 32.8% |
| Rogue Wildcard | 52.0% | 52.5% | 42.4% | 36.4% |

The last pass produced a 52.2% first-player win rate, mean 27.194 offensive turns, median 23, 95th percentile 57 and maximum 123. Its faction aggregates were Stonewall 49.0%, Bruiser 53.5%, Syndicate 51.0%, Nightwalker 61.9%, Rogue 34.6%. This demonstrates why both faction and deck results must remain visible.

These screens validate implementation and support specific construction diagnoses. They do not establish competitive balance or prove each archetype equally strong. Counteroffensive's recovery supports its occupation after the density revision. Shock Assault remains weak under this policy; Heavy Breakthrough remains favored; Rogue's recovery tools need stronger human and AI testing against expensive spearheads. No additional tuning was made just to force 50%. Standard fresh-seed batches and human playtests are the next acceptance evidence.

Reports are retained under `docs/balance/`: `sprint4-archetypes-1000`, `sprint4-archetypes-iteration02-1000`, `sprint4-archetypes-iteration03-1000`, and `sprint4-archetypes-final-screen-1000`, each with JSON, HTML and CSV. Profile snapshots `arsenal-v1.json` and `arsenal-v2.json` preserve the earlier card overrides. Multiple changes in a pass and changed opposing decks mean aggregate deltas cannot be attributed to one card alone.

All twenty additions use explicit existing faction-atlas roles. These are coherent representative portraits rather than twenty bespoke illustrations. Gameplay, rules text and faction styling remain distinct; final individual art can replace the lookup without modifying card IDs or rules.
