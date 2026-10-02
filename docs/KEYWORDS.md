# Arsenal keyword rules

The in-game field manual and card detail views use `data.js`'s shared glossary. Existing Guard, Fortify, Rush, Mobile, Precision, Berserk, Command and Medic rules remain intact.

| New mechanic | Exact rule | Counterplay |
| --- | --- | --- |
| Retaliate | After normal simultaneous combat and combat deaths, a surviving defending Retaliate card deals 1 non-combat damage to a surviving attacker. It cannot trigger from an Order, Ambush, Retreat or another Retaliate hit. | Lethal attacks, selective removal, Sabotage, or a non-combat effect bypass the extra defensive hit. |
| Sabotage | An action Order suppresses one enemy permanent's printed traits until its owner's next offensive turn starts. Clears before Medic healing. Printed stats, Presence, legal actions, incoming allied Command auras and already played Orders remain. Traitless or already suppressed targets are illegal. | The window expires quickly. Attack the source elsewhere, finish the turn, remove the relevant attacker or use response Orders. |
| Scavenge | When another ally here dies, a surviving unsuppressed source draws one card. At most one such draw per player per global turn across all sources. Dead sources cannot trigger during simultaneous casualties. Uses ordinary reserve recycling. | Remove or suppress the source first. It gives card access, not bonus capacity or restored troops; repeated sources do not multiply draws. |

The authoritative engine exports `hasTrait(unit,name)` so suppression affects legality, combat, movement and passives consistently. Engine events attribute the new effects to their sources. Telemetry records actual Retaliate health damage, actual Scavenge draws and observed Sabotage combat windows; it does not invent prevented damage.

Deck-aware AI uses public board state and its own strategy declaration. It evaluates retaliation in trades, surviving salvage sources and useful suppression followed by a legal attack. It does not know the enemy hand or future reserve order. Rules and policy tests cover lethal/retreat/ambush cases, simultaneous deaths, once-per-turn draws, suppression restoration and concealed information independence.
