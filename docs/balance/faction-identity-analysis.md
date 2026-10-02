# Faction identity and baseline diagnosis

This analysis uses the frozen Sprint 2 cards and authoritative engine. Presence is both resource commitment and capture strength. A cheaper card can improve deployment flexibility while reducing pressure in a five-slot objective. Raw health/Presence ratios therefore do not explain territorial performance by themselves.

## Printed starter composition

Each starter has 18 permanents and 8 Orders. The following averages count every permanent copy, including its one immobile support asset. They are descriptive card-pool statistics, not a single balance score or causal estimate.

| Faction | Mean Presence | Mean Attack | Mean health | Printed health / Presence | Printed Attack / Presence | Five cheapest permanent copies: Presence |
|---|---:|---:|---:|---:|---:|---:|
| Stonewall | 5.33 | 2.67 | 6.17 | 1.156 | 0.500 | 20 |
| Bruiser | 6.17 | 4.17 | 5.89 | 0.955 | 0.676 | 23 |
| Syndicate | 5.06 | 2.89 | 5.44 | 1.077 | 0.571 | 18 |
| Nightwalker | 4.33 | 3.89 | 3.72 | 0.859 | 0.897 | 16 |
| Rogue | 5.22 | 3.06 | 5.39 | 1.032 | 0.585 | 20 |

The default capture threshold is 25. Pressure accumulates across an owner's turns while present; a low-pressure full stack needs more time to capture. These five-cheapest totals describe available cards, not guaranteed opening draws or a pressure cap: higher-Presence cards exist in every deck. Surviving high-Presence occupation can capture rapidly while commitment keeps later deployment constrained.

## Why Bruiser dominates the frozen heuristic

Bruiser does not have the best average health/Presence ratio. Its advantage is the combination of attack breakpoints, sufficient survivability, substantial printed occupation Presence, and an AI that easily understands straightforward frontal deployment.

- Scarred Brawler costs 4, attacks for 3, has 6 health, and gains Attack while damaged. A 4-Presence Rogue Outrider has 3 Attack and 4 health. The Brawler has two more health plus a combat-growth trait for the same commitment.
- Iron Vanguard costs 6, attacks for 4, has 7 health, and can Guard. It can both attack effectively and shelter valuable occupation. This makes an aggression faction unusually strong at defending and attrition.
- Assault Commander costs 8 with 5 Attack, 7 health, Command and Berserk. Its offensive aura, survivability and capture contribution compound rather than require a meaningful choice.
- Siege Heavy has 7 health and 5 Attack. A 4-Attack, 3-health Nightwalker Blade cannot kill it in one exchange and dies to its retaliation. Even a 6-Attack Marksman misses the Heavy's 7-health breakpoint and dies before its second attack. Surviving Bruiser then retains 8 printed capture Presence.
- Ambush resolves damage before combat. A 3-damage Ambush kills an undamaged 3-health Nightwalker attacker outright. Against a 6/7-health Bruiser, it normally cannot prevent combat; damaging Berserk can increase the surviving attacker's outgoing damage.

These are specific interaction hypotheses supported by engine rules. Simulation matrices and effect/card telemetry test their aggregate consequence. They do not prove the same outcome against skilled humans.

## Identity, counterplay and AI gaps

| Faction | Existing mechanical identity | Weakness to retain | AI gap addressed |
|---|---|---|---|
| Stonewall | Fortify reduces combat damage on owned ground; Guard, healing and durable commitments preserve occupation | Slow advances and modest burst Attack; Fortify loses its benefit on enemy ground | Place Fortify on owned territory, support wounded occupation, shield valuable fortified defenders, avoid recalling capture Presence |
| Bruiser | Rush and high Attack create immediate breakthroughs; Berserk rewards surviving damage | A failed push should leave vulnerable forces; high commitment and limited recovery/flexibility | Recognize legal Rush follow-ups and valuable defender removal without knowing hidden reactions |
| Syndicate | Command coordination, reliable Guards, Disrupt and Counter control public exchanges | Sequencing and reaction budget matter; individual units lack extreme burst | Disrupt before a favorable legal attack only when affordable opposing reactions can be constrained; Counter a visible Order rather than a guessed hand |
| Nightwalker | Precision bypasses Guard; high Attack, Ambush and direct damage remove chosen targets | Fragile occupied ground and limited pressure density; cannot win prolonged frontal attrition by default | Recognize legal damage-then-attack combinations, Ambush pre-kills, reserve held reactions, preserve fragile units, target visible Command auras |
| Rogue | Mobile preserves readiness on its first move; Rally restores tempo; Reclaim releases a wounded commitment for later redeployment | Modest raw Attack; tools consume actions and require connected capacity | Value Mobile follow-up attacks, verify actual Rally paths/capacity, recall threatened wounded front units while retaining imminent capture Presence |

The original basic AI undervalues damage Orders that set up a lethal attack, sometimes counts newly deployed non-Rush units as potential finishers, estimates Rally advance without validating adjacent capacity, and rescues damaged units with Reclaim only away from the objective. The frozen baseline policy intentionally preserves these historical decisions for controlled comparison. The faction policy fixes their evaluation, using only its own hand and public state.

There is no new stealth rule or arbitrary faction win bonus. Existing Precision, reactions, temporary Orders, readiness, positioning and the Presence economy carry the identities. Card modifications and measured results are recorded separately in [iteration-notes.md](iteration-notes.md).

## Interpretation boundaries

Card wins when played, per-Presence ratios, and exposure counts are observational. Strong units may be played in already winning states, and a finisher may appear late. Compare AI-only, balance-only, and combined runs before attributing improvements to card values. Keep the same schedule/seed for exploratory comparisons, then validate on independent seeds. A paired seed controls scheduling but does not promise identical draws after a seat swap.
