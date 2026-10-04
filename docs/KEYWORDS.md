# Arsenal keyword rules — v1.0.0

[Commander rules](COMMANDERS.md) add named off-lane passives and once-per-match actives under sprint9. They reuse Armor, Mark, Sabotage, draw, heal, movement and direct damage; they do not create new flavor-only keywords. Printed Command aura and deployable Leader units remain distinct from the named Commander. Historical profiles disable Commanders.

The in-game Field Manual and card detail views use the selected profile's glossary, built from `data.js` and current rule definitions. Existing Guard, Fortify, Rush, Mobile, Precision, Berserk, Command aura and Medic rules remain intact. **Command aura** is the allied Attack bonus; **Command Actions** are the separate tactical resource.

## Sprint 6 economy and frontline terms

| Term | Exact current rule |
| --- | --- |
| Capacity | Total force support; Available Capacity = Capacity − committed Presence − temporary Order spending. |
| Command Actions | Three per offensive turn by default. Movement, attack and cards marked with an explicit command cost use them. Ordinary deployment and low-impact support use zero. |
| Free Action | Zero Command Actions, while still requiring Capacity, legal timing, target/location and slots. Such cards can play at zero commands. |
| Forced Retreat | Captured defenders resolve in ascending numeric UID order and retreat one adjacent territory toward their own home, into friendly-owned ground with a free allied position. Wounds remain; the unit exhausts until normal readiness. This costs no Capacity or command. |
| No legal retreat | Immobile assets, full/no friendly destinations and off-map retreats are eliminated, enter discard and release commitment. Enemy units cannot remain behind the advancing front. |

Voluntary Retreat response Orders retain their printed response rules and Capacity cost. They are separate from mandatory capture displacement. Reclaim clears wounds and temporary states and returns the same card to hand; redeployment pays that card's Capacity and explicit command cost. Sprint 6's exact major-card costs are in [SPRINT-006.md](SPRINT-006.md#action-economy-20). Sprint 7 adds the mechanics below and marks Silencer Team deployment as 1 Command Action only in the new profile.

## Sprint 7 mechanics

| Keyword | Exact rule | Counterplay |
| --- | --- | --- |
| Armor | Reduce each regular combat hit by 1 on any ground, including simultaneous counterfire. Adds to Fortify on owned ground. Printed Armor and temporary Reinforce protection use their maximum, not their sum. Sabotage suppresses printed Armor; already granted temporary protection remains. | Damage Orders, Ambush and separate Retaliate damage bypass Armor. Stronger hits and suppression can still remove the protected unit. |
| Mark | An enemy permanent takes +1 damage on each positive original regular combat hit until its owner's next offensive turn starts. Marks do not stack. Apply the bonus before shields/protection; zero-Attack retaliation remains zero. | A ready Guard can redirect to an unmarked ally. Shields/Armor/Fortify can absorb the bonus; it expires before the marked owner acts. Direct Orders, Ambush and Retaliate do not gain damage. |
| Reinforce | Heal a friendly permanent by the printed amount, then grant temporary Armor 1 until its owner's next offensive turn starts. Does not stack with printed Armor; combines with Fortify. Healthy already armored/reinforced targets are illegal, while wounded ones can still be healed. | Protection lasts through the enemy turn but ends before your next Medic step. Direct effects bypass it. It grants no Attack, movement, command or capture bonus. |
| Adapt | Choose exactly one printed mode with its own ordinary target rules. Field Options offers Repair (heal 3), Resupply (draw 2), or Reposition (ready one exhausted allied unit). Every mode pays the same printed Capacity and 1 Command Action. Missing/unknown modes cannot consume the card. | Flexibility costs tempo compared with dedicated support. Healthy heal targets and ready/Asset rally targets remain illegal. It never predicts a draw or chooses randomly. |

The shared engine resolves mode definitions with `resolveEffect`, enumerates targets with `orderTargets`, and calculates public combat damage with `combatDamage`. Mark/Reinforce indicators expire on their owner's offensive start before Medic healing. Move/forced retreat preserves temporary states until that expiration; Reclaim/redeployment starts clean. Historical profiles do not receive these mechanics. See [Sprint 7](SPRINT-007.md#four-reusable-mechanics) for exact rules, content and validation scope.

## Existing expansion keywords

| Keyword | Exact rule | Counterplay |
| --- | --- | --- |
| Retaliate | After normal simultaneous combat and combat deaths, a surviving defending Retaliate card deals 1 non-combat damage to a surviving attacker. It cannot trigger from an Order, Ambush, Retreat or another Retaliate hit. | Lethal attacks, selective removal, Sabotage, or a non-combat effect bypass the extra defensive hit. |
| Sabotage | An action Order suppresses one enemy permanent's printed traits until its owner's next offensive turn starts. Clears before Medic healing. Printed stats, Presence, legal actions, incoming allied Command auras and already played Orders remain. Traitless or already suppressed targets are illegal. | The window expires quickly. Attack the source elsewhere, finish the turn, remove the relevant attacker or use response Orders. |
| Scavenge | When another ally here dies, a surviving unsuppressed source draws one card. At most one such draw per player per global turn across all sources. Dead sources cannot trigger during simultaneous casualties. Uses ordinary reserve recycling. | Remove or suppress the source first. It gives card access, not bonus capacity or restored troops; repeated sources do not multiply draws. |

The authoritative engine exports `hasTrait(unit,name)` so suppression affects legality, combat, movement and passives consistently. Engine events attribute the new effects to their sources. Telemetry records actual Retaliate health damage, actual Scavenge draws and observed Sabotage combat windows; it does not invent prevented damage.

Deck-aware AI uses public board state and its own strategy declaration. It evaluates retaliation in trades, surviving salvage sources and useful suppression followed by a legal attack. It does not know the enemy hand or future reserve order. Rules and policy tests cover lethal/retreat/ambush cases, simultaneous deaths, once-per-turn draws, suppression restoration and concealed information independence.
