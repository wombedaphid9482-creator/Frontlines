# FRONTLINES — FORGE SPRINT 007
## ARSENAL & DECKBUILDING
### Target Version: v0.8.0

Continue directly from the completed Sprint 6 / v0.7.0 build. Do not rebuild working systems from scratch.

The primary objective of Sprint 7 is to transform Frontlines from a game primarily driven by preset archetype decks into a true expandable strategy card game with a robust deckbuilding system, deeper faction expression, a larger usable card pool, and infrastructure that makes future card creation substantially easier.

Sprint 6 established the core match experience: AI difficulty selection, guided onboarding/tutorial systems, Action Economy 2.0, contiguous frontline behavior with retreat/elimination resolution, improved readability, fullscreen/presentation improvements, and the revised territorial rules. Preserve these systems unless a genuine bug or regression requires modification.

Use the maximum practical sprint allowance. Establish a stable checkpoint early, then continue implementing, testing, polishing, and expanding until further meaningful work would risk leaving the build unstable.

1. **Use the authorized 10,000-match simulation as the v0.7.0 baseline.** Archive its configuration and results clearly so future balance changes can always be compared against it. Review faction win rates, archetype performance, matchup skew, first-player/initiative effects, match duration, territory movement, Presence usage, individual card performance, and abnormal behaviors. If the simulation exposes a genuinely severe balance or rules problem, make a narrow corrective change before proceeding. Do not overfit small statistical differences and do not flatten faction identity simply to force identical win rates. The existing balance target remains approximately ±5% around parity where practical. This currently authorized 10k run may be analyzed and used. Do NOT autonomously launch additional simulations after it. At the end of Sprint 7, request any specific validation simulation needed from Ryken, including the settings you want him to run.

2. **Build the full Deckbuilder.** Create a dedicated Deckbuilder accessible from the main game shell. Players must be able to create, edit, rename, duplicate, save, delete, and select custom decks. Use the current established legal preset deck size as the canonical deck size rather than arbitrarily changing deck size. Centralize deck legality rules so future changes do not require rewriting the interface. Clearly show current card count, legal/illegal state, faction, archetype tendencies, Presence/cost distribution, card-type distribution, and validation errors. Prevent an illegal deck from entering a normal match. Preserve all existing starter and archetype decks as built-in templates that cannot accidentally be destroyed; players may duplicate them and modify the copies.

3. **Make browsing the Arsenal enjoyable rather than spreadsheet-like.** Add a polished card collection/Arsenal browser with search and useful filters including faction, card type, Presence cost, keywords, and other existing card metadata. Selecting a card should expose its full rules text and useful mechanical explanation. Deckbuilding should support fast add/remove interactions, quantity controls where applicable, visible legality feedback, and responsive layouts. Continue the established rule that the game should feel like a game application rather than a webpage: avoid long-page scrolling as the primary interface and keep important actions large and obvious.

4. **Expand the five faction card pools without diluting their identities.** Stonewall remains defense, fortification, and attrition through Bastion and Counteroffensive concepts such as Armor, Reinforce, and Retaliate. Bruiser remains aggression, breakthrough, and frontline pressure through Shock Assault and Heavy Breakthrough concepts such as Charge, Breakthrough, and Momentum. Syndicate remains professional efficiency, tactical coordination, and combined-arms play through Combined Arms and Precision Operations concepts such as Mark and Command. Nightwalker remains stealth, disruption, manipulation, and timing through Sabotage and Assassination concepts such as Ambush, Concealed, Sabotage, Assassination, and Infiltration. Rogue remains adaptation, improvisation, mobility, and opportunism through Scavenger and Wildcard; Rogue should reward clever adaptation rather than simply gambling on randomness. Scavenge and Adapt should continue to represent that philosophy where applicable. Preserve signature existing cards and concepts rather than replacing the established pool.

5. **Add enough meaningful cards to make custom deckbuilding matter.** Expand each faction with a focused set of new cards that open real choices between its existing archetypes and hybrid builds. Favor roughly 6–8 strong new designs per faction over huge amounts of filler. Every new card should answer a deckbuilding question: reinforce an archetype, bridge two archetypes, counter a recognizable strategy, create a new tactical decision, or support an underrepresented part of the faction. Avoid simple numerical copies of existing cards. New mechanics should be reusable enough to justify adding them to the rules vocabulary. Do not create complexity merely for novelty.

6. **Strengthen the data-driven card architecture.** Card definitions, faction restrictions, keywords, costs, targeting rules, AI metadata, archetype tags, and deckbuilding metadata should live in centralized structured data wherever practical rather than being scattered through UI code. Add schema/validation checks capable of catching malformed cards, missing assets, invalid faction references, impossible costs, broken effects, duplicate IDs, and illegal deck definitions. The goal is for a future sprint to be able to add dozens of cards without destabilizing the engine.

7. **Integrate custom decks into Match Setup and AI.** Before a match, the player should be able to select faction and deck cleanly, while AI opponents can select appropriate built-in decks and difficulty using the Sprint 6 difficulty system. Preserve the existing starter/archetype choices. The AI should understand the metadata and broad strategic intention of newly added cards well enough not to treat them as random buttons. Do not solve this by giving the AI hidden resource/stat advantages. Difficulty differences should continue to come from decision quality and behavior.

8. **Improve card readability and rules discoverability while expanding the pool.** Add or improve keyword tooltips, card inspection, clear targeting states, legal-target highlighting, explanations for why an action is unavailable, and visual indicators for important temporary states. New players who finish the Sprint 6 tutorial should be able to inspect an unfamiliar card and understand what it is trying to accomplish without consulting external documentation. Preserve true fullscreen behavior and the larger, clearer interaction targets established in the previous sprint.

9. **Finish Sprint 7 as a stable v0.8.0 candidate.** Run normal automated tests, deterministic rule tests, deck-validation tests, save/load migration tests, card-effect regression tests, browser/UI tests, and targeted manual match tests. Do not automatically perform another large balance simulation. Produce a concise Sprint 7 report covering the new cards, deckbuilder functionality, balance changes made from the authorized v0.7.0 10k baseline, known issues, test status, and recommended next work. Then state exactly which simulation Ryken should run next, if one is needed, including match count, deck pool, AI difficulty/profile, seat swapping, mirrors, and any other relevant parameters.

## PRODUCT DIRECTION

The goal of this sprint is not merely “add a deck editor.”

At the end of Sprint 7, two players choosing the same faction should be capable of building meaningfully different strategies.

A Stonewall deck should be able to feel different from another Stonewall deck while both unmistakably feeling like Stonewall. The same principle applies to Bruiser, Syndicate, Nightwalker, and Rogue.

Cards should create strategic commitments and interactions with Frontlines' distinctive systems: Presence commitment, territorial pressure, the contiguous frontline, attack/response interaction, occupation, retreat, reinforcement, and resource opportunity cost.

Do not sacrifice those systems to imitate another existing card game.

Frontlines should increasingly feel like its own game.

## IMPORTANT SIMULATION RULE

The currently authorized 10,000-match simulation may finish and its results may be analyzed as the Sprint 6 baseline.

After that simulation, do not independently launch further large balance simulations during this sprint.

If additional simulation evidence would help, finish the stable implementation first and provide Ryken with the exact simulation request. Ryken controls simulation runs unless he explicitly authorizes another one.

## DEFINITION OF DONE

Sprint 7 is complete when Frontlines has a polished usable Deckbuilder and Arsenal; custom legal decks can be built, saved, loaded, selected, and played; all five factions have substantially more meaningful deckbuilding choices; existing starter/archetype decks continue working; the AI can use the expanded pool; card/deck data is structured for future expansion; the Sprint 6 systems remain intact; old saves are safely handled or migrated; automated and manual validation passes; v0.8.0 is stable enough for Ryken to playtest; and no unauthorized balance simulation has been launched.

Once all required work is stable, use any remaining sprint capacity for polish, UX improvements, card presentation, additional regression coverage, and other directly useful work that strengthens this objective rather than stopping early.