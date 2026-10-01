# PROJECT FACTION CARD GAME
## Forge Sprint 001 — The Frontline Prototype

### Working Title
**Project Faction: Frontlines**

This is an internal working title only. Do not spend meaningful sprint time on final branding.

---

# 1. SPRINT MISSION

Build the first genuinely playable version of a standalone **Project Faction tactical card game** based on the factions, characters, units, and territorial warfare of the main Project Faction universe.

This must NOT be a generic card battler with Project Faction artwork pasted onto it.

The defining gameplay identity is:

**Fight for territory. Commit Presence to the battlefield. Push the frontline into enemy ground.**

Players deploy cards onto a seven-territory battlefield. Units fight, survive, advance, and accumulate territorial Presence. Capturing territory physically shifts the frontline toward the opponent.

The economy and capture systems both revolve around the concept of **Presence**.

The game should already be fun enough at the end of Sprint 001 that two people can sit at the same computer and play multiple matches while discussing balance.

---

# 2. SPRINT PHILOSOPHY

Treat this as a **maximum-usage sprint**, not a minimal prototype sprint.

Priority order:

1. Reach a stable playable checkpoint early.
2. Verify that the fundamental game loop works.
3. Continue implementing meaningful mechanics.
4. Add faction identity.
5. Improve UX and visual readability.
6. Add content.
7. Playtest internally and repair exploits or softlocks.
8. Polish.
9. Continue useful work until further work would risk leaving the project unstable.

Do NOT stop after producing a technical proof of concept.

Do NOT preserve usage merely for the sake of preserving usage.

End Sprint 001 in a stable, launchable, playable state.

---

# 3. PROJECT LOCATION

If a dedicated project does not already exist, create one as a standalone project rather than modifying the main Project Faction game.

Suggested location:

`C:\Users\noaho\OneDrive\Documents\Project Faction Card Game`

Do not alter or destabilize the primary Project Faction FPS project.

The card game may use the existing Project Faction lore, characters, factions, terminology, and concepts.

---

# 4. PLATFORM

For Sprint 001, prioritize rapid iteration and easy local testing.

Preferred implementation:

**HTML + CSS + JavaScript local desktop/web application**

Requirements:

- Runs locally.
- No backend required.
- No account system.
- No online multiplayer yet.
- No external service dependency required to play.
- Desktop-first.
- Designed so it could later be packaged as an Electron app if desired.
- Keep game rules/data separated cleanly from rendering where practical.

If there is a compelling existing technical reason to use another already-established framework in the project, preserve it rather than rebuilding unnecessarily.

---

# 5. CORE GAME CONCEPT

The game represents one advancing and retreating frontline in the Project Faction war.

There are **seven battlefield territories arranged in a straight line**.

Initial state:

`PLAYER 1`

`[P1 Territory] [P1 Territory] [P1 Territory] [Neutral Territory] [P2 Territory] [P2 Territory] [P2 Territory]`

`PLAYER 2`

Each player begins controlling three territories.

The center territory begins uncontrolled.

Players fight into the uncontrolled center.

After capturing it, they may push into enemy-controlled territory.

Example:

Starting:

**3 territories — Neutral — 3 territories**

After Player 1 captures the middle:

**4 territories — 3 territories**

After Player 1 successfully captures the next enemy territory:

**5 territories — 2 territories**

The frontline must visibly shift during the match.

Territory control should feel like the most important thing happening on the screen.

---

# 6. ATTACKER / RESPONDER TURN STRUCTURE

The game uses alternating initiative.

One player is currently the:

**ATTACKER**

The other is:

**RESPONDER**

The Attacker performs their offensive turn.

The Responder is not inactive. They may respond when valid defensive/reaction opportunities occur.

When the Attacker finishes their offensive turn, initiative flips.

The previous Responder becomes the Attacker.

The previous Attacker becomes the Responder.

Continue alternating.

Do not make players wait through long solitaire turns.

---

# 7. OFFENSIVE TURN FLOW

A player's offensive turn should approximately follow:

### 1. Start Phase
- Increase or refresh appropriate Presence values.
- Ready cards.
- Draw cards as appropriate.
- Resolve start-of-turn effects.

### 2. Deployment / Action Phase
Player may use available Presence to:

- Deploy units.
- Move units.
- Attack.
- Play Orders.
- Activate card abilities.
- Reinforce the frontline.
- Perform other legal actions.

The exact action economy may be tuned during implementation.

Favor a system that prevents infinite turns while still allowing players to execute an actual tactical plan.

A starting target of approximately **3 major actions per offensive turn** is acceptable, but this should remain configurable and may be adjusted during playtesting.

### 3. Presence Phase
Surviving units in the currently contested territory contribute their printed Presence toward territorial capture.

### 4. End Phase
- Resolve end-of-turn effects.
- Discard temporary effects.
- Check territory capture.
- Check match victory.
- Flip initiative.

---

# 8. PRESENCE — MASTER RESOURCE

Presence is the game's central concept.

Do not create unnecessary additional currencies during Sprint 001.

Each player has:

### COMMAND PRESENCE
Maximum Presence that player's forces can currently support.

Prototype starting value:

**20 Command Presence**

On each subsequent offensive turn, that player's Command Presence increases by:

**+10**

Example progression:

20  
30  
40  
50  
60

Make these values configurable constants rather than hardcoding them throughout the application.

A maximum cap may be introduced during balance testing if necessary.

---

# 9. COMMITTED PRESENCE

Cards that remain on the battlefield continue occupying part of the player's Command Presence.

Example:

Player Command Presence:

**40**

Units currently deployed:

- Rifle Squad: 4
- Heavy: 8
- Specialist: 5
- Commander: 7

Total committed:

**24**

Available Presence:

**16**

Therefore:

`Available Presence = Command Presence - Committed Presence - Presence spent this turn on temporary effects`

This creates the desired natural comeback system.

A dominant player with a huge army has much of their Presence tied up maintaining that army.

A player whose forces have been destroyed has much more Presence available for reinforcements.

This is intentional.

Do NOT add arbitrary "losing player bonus resources" unless testing later proves absolutely necessary.

The Presence economy itself should create that pressure.

---

# 10. TEMPORARY PRESENCE EXPENDITURE

One-time cards such as Orders may cost Presence without remaining on the battlefield.

Example:

**Airstrike — Presence 6**

The player spends 6 Presence.

Airstrike resolves and leaves play.

However, those 6 Presence points remain spent for the remainder of that offensive turn.

They refresh/recalculate on the player's next offensive turn.

This prevents repeatedly recycling the same Presence within a single turn.

---

# 11. CARD PRESENCE VALUE

Permanent battlefield cards should have a printed **Presence value**, shown clearly as:

`P: X`

For Sprint 001, the same printed Presence number should ideally serve three related functions:

### Deployment
The amount of Presence required to field the card.

### Commitment
The amount of Command Presence occupied while the card remains deployed.

### Territorial Control
The amount of territorial Presence that surviving card contributes toward capturing the currently contested territory.

This is intentionally elegant.

Avoid introducing separate deployment cost and occupation score unless playtesting demonstrates that the unified value fundamentally fails.

---

# 12. TERRITORIAL PRESENCE

Territory is NOT captured simply because every enemy unit dies.

Combat creates the opportunity to establish control.

**Presence captures the territory.**

Every contested territory has a configurable:

### CAPTURE THRESHOLD

Recommended prototype starting value:

**25 Presence**

During the Presence Phase at the end of a player's offensive turn:

Add the total printed Presence of that player's qualifying surviving cards in the contested territory to that player's Capture Progress for that territory.

Example:

Stonewall has:

- Rifle Squad P3
- Rifle Squad P3
- Officer P4

They contribute:

**10 Presence**

If Stonewall already had 8 Capture Progress:

They now have:

**18 / 25**

The opponent accumulates their own Capture Progress during their offensive turns.

First side to meet or exceed the Capture Threshold captures the territory.

Upon capture:

- Ownership changes.
- The frontline advances.
- Capture progress for that engagement resets.
- Surviving units remain relevant rather than being arbitrarily deleted.
- The next forward territory becomes the next objective.

Visualize this clearly.

---

# 13. FRONTLINE RULE

Players cannot freely teleport conventional forces deep into enemy territory.

The normal army must fight through connected territory.

The frontline should naturally progress:

Home Territory → Home Territory → Home Territory → Center → Enemy Territory → Enemy Territory → Enemy Territory

Units generally:

- Deploy into controlled territory.
- Advance through connected territory.
- Fight at or near the frontline.

Future factions/cards may break these rules.

Example:

Nightwalker may eventually possess:

**Infiltrate**

allowing specialized units to bypass conventional frontline restrictions.

Those exceptions should feel special.

---

# 14. OVERALL MATCH VICTORY

Implement an overall conquest victory state.

For Sprint 001, make the victory condition data-driven/configurable.

Recommended initial implementation:

**Capture enough territory to push completely through the opponent's defensive line and seize their final/home territory.**

If playtesting reveals that matches become unnecessarily long, support easy testing of alternate victory values such as controlling 5 or 6 of the 7 territories.

Do not deeply bury the victory rule in code.

---

# 15. UNIT COMBAT

Sprint 001 combat should be tactical but readable.

Each unit should initially have:

- Name
- Faction
- Presence
- Attack
- Health
- Ability text
- Card type
- Optional traits

Avoid excessive statistics.

Do NOT begin with armor penetration, accuracy, initiative speed, ten damage types, elemental resistances, etc.

We need to learn whether the fundamental game is fun before adding simulation complexity.

---

# 16. ATTACKING

A deployed and ready unit may attack an eligible opposing unit according to territory/frontline rules.

Recommended initial combat:

Both units deal their Attack as damage when engaged unless a card rule modifies the result.

Example:

Rifle Squad:

Attack 3  
Health 4

Enemy Raider:

Attack 2  
Health 3

After combat:

Rifle Squad takes 2.

Raider takes 3 and is destroyed.

Damage should persist until healed or otherwise removed.

Destroyed cards go to a discard/casualty area.

Clearly display damage and remaining health.

---

# 17. RESPONSE WINDOW

The defending player must have opportunities to respond.

For Sprint 001, use a deliberately controlled response system.

Suggested structure:

**Attack declared → Defender Response → optional Attacker Counter → Resolve**

Do not allow infinitely nested response chains.

A maximum reaction depth of roughly:

**Attack → Response → Counter → Resolution**

is sufficient.

Possible defensive responses include:

- Defensive Order.
- Redirect.
- Reinforcement ability.
- Guard/intercept.
- Retreat.
- Unit ability.

Not every option needs to exist immediately.

Implement the response framework so future cards can use it.

---

# 18. TERRITORY CAPACITY

Do not allow unlimited card stacking.

Each territory should have a configurable number of unit positions per player.

Prototype recommendation:

**5 unit slots per player per territory**

Adjust during playtesting if visually or mechanically necessary.

Cards should visibly occupy battlefield positions.

---

# 19. CARD TYPES

Begin with a small understandable set.

### UNIT
Persistent battlefield character/squad/vehicle.

### LEADER
Powerful persistent unit that modifies nearby/allied forces.

Leaders may simply be implemented as a Unit subtype if technically cleaner.

### ORDER
One-time tactical card.

Examples:

- Airstrike
- Reinforce
- Suppressing Fire
- Tactical Withdrawal
- Rally
- Ambush

### ASSET
Persistent support card.

Examples:

- Fortifications
- Supply Depot
- Field Stabilizer
- Weapons platform

Assets are lower priority than Units and Orders for the first stable checkpoint.

---

# 20. INITIAL FACTIONS

Project Faction currently has five foundational factions:

### STONEWALL
Identity:

Defense  
Formation  
Territorial control  
Efficient occupation  
Durability

Stonewall should be very good at holding ground.

Potential mechanics:

- Guard
- Fortify
- Reduced commitment while defending
- Presence bonuses in controlled territory
- Defensive reactions

---

### THE SYNDICATE
Identity:

Resources  
Manipulation  
Sabotage  
Flexible deals  
Unfair economic advantages

Potential mechanics:

- Temporary Presence
- Enemy Presence disruption
- Paying to alter outcomes
- Temporary control effects
- Black-market Orders

---

### BRUISER
Identity:

Aggression  
Heavy units  
Raw damage  
Breaking defensive lines

Potential mechanics:

- High-cost powerful units
- Momentum from kills
- Damage bonuses
- Effects triggered when wounded
- Brutal frontline pressure

---

### NIGHTWALKER
Identity:

Stealth  
Ambush  
Assassination  
Information  
Precision

Potential mechanics:

- Hidden cards
- Ambush reactions
- Low-Presence lethal specialists
- Leader assassination
- Infiltration

Nightwalker should be able to kill effectively without automatically being best at territorial occupation.

---

### ROGUE
Identity:

Mobility  
Improvisation  
Scavenging  
Adaptability

Potential mechanics:

- Cheap movement
- Repositioning
- Salvaging destroyed Assets
- Returning units to hand to free committed Presence
- Limited access to unconventional tools

Rogue should eventually become highly flexible without simply being "better at everything."

---

# 21. CONTENT IMPLEMENTATION ORDER

Do not attempt to perfectly balance five complete factions before the game is functional.

Use this order:

## CHECKPOINT A — Core Prototype
Create enough neutral/test cards to verify:

- Deployment
- Presence economy
- Attacking
- Damage
- Destruction
- Territory Presence
- Territory capture
- Frontline advancement
- Initiative flipping
- Match victory

This should be reached very early.

---

## CHECKPOINT B — Two Real Factions
Implement playable starter decks for:

### Stonewall
and
### Bruiser

These are ideal initial opposing archetypes because one emphasizes holding ground and the other emphasizes breaking it.

Provide enough cards for complete matches.

---

## CHECKPOINT C — Five Factions
Once the core rules are stable:

Add functional starter implementations for:

- Syndicate
- Nightwalker
- Rogue

They do not need 50-card production-ready sets.

They DO need enough distinct cards and mechanics to demonstrate their identity.

---

# 22. STARTER DECK TARGET

For initial playtesting, target approximately:

**20–30 cards per faction deck**

Duplicates are acceptable.

Example:

- 12–16 Units
- 2–4 Leaders
- 6–10 Orders
- optional Assets

Deck size may be adjusted based on match length.

Do not create hundreds of cards this sprint.

Quality and mechanical usefulness matter more than quantity.

---

# 23. PROJECT FACTION CHARACTERS

The card game exists partly to turn Project Faction's characters and units into tangible cards.

Create the architecture needed for named characters.

Named characters should typically be:

**Leader** or **Unique Unit** cards.

Add a `unique` property to card data if useful.

Do not invent massive amounts of permanent canon without clear source material.

Generic faction units may be invented as necessary for the prototype.

Named lore-critical characters should be structured so their final names/stats/abilities can be edited easily later.

---

# 24. RIFTWALKERS

Project Faction Riftwalkers will eventually be important.

Do NOT overbuild the Riftwalker system during the first stable checkpoint.

However, prepare architecture for a future concept where a player's chosen Riftwalker acts somewhat like a commander/avatar with unique abilities.

If sufficient sprint capacity remains after the five factions and core systems work, prototype:

**1–2 Riftwalker cards/commanders**

Possible future structure:

Deck = Faction + Riftwalker

Do not allow this stretch feature to destabilize the core game.

---

# 25. RIFT / TEMPORAL SYSTEM

The larger Project Faction universe includes temporal instability and Rift phenomena.

This can eventually become one of the card game's signature mechanics.

Do NOT make a complex Rift system mandatory for Checkpoint A.

If the core game becomes stable early, prototype a lightweight future-facing system:

### Instability
Certain powerful cards generate Instability.

At a threshold, a Rift event occurs.

Possible example events:

- Temporal Freeze
- Reinforcement Echo
- Time Collapse
- Ancient Breach
- Future Incursion

This should remain a stretch mechanic for Sprint 001.

Territory + Presence + combat remain the priority.

---

# 26. HOT-SEAT MULTIPLAYER

Sprint 001 primary play mode:

### LOCAL TWO-PLAYER HOT-SEAT

Two people at one computer must be able to play against each other.

Required:

- Clear indication of active Attacker.
- Clear indication of Responder.
- End Turn button.
- Response prompts.
- Separate hands.
- A reasonable privacy solution when swapping players.

A simple:

**"Pass computer to Player 2"**

overlay between turns is acceptable.

Provide an optional developer/testing mode where both hands remain visible for debugging.

---

# 27. OPTIONAL AI

AI is NOT required before local multiplayer works.

If sufficient sprint capacity remains:

Create a basic AI opponent capable of:

- Deploying affordable units.
- Reinforcing the frontline.
- Attacking sensible targets.
- Playing simple Orders.
- Advancing territory.

Do not spend half the sprint building sophisticated AI while core mechanics remain unfinished.

---

# 28. CARD DATA ARCHITECTURE

Cards must be data-driven.

Avoid writing a separate hardcoded function for every individual card.

Example conceptual structure:

```js
{
  id: "stonewall_rifle_squad",
  name: "Rifle Squad",
  faction: "stonewall",
  type: "unit",
  presence: 3,
  attack: 3,
  health: 4,
  traits: ["infantry"],
  ability: {
    ...
  },
  rulesText: "..."
}
```

Exact implementation may differ.

Cards should be easy to add, remove, duplicate, or rebalance.

---

# 29. GAME STATE ARCHITECTURE

Keep game state centralized and understandable.

Track at minimum:

- Current player
- Current Attacker
- Current Responder
- Turn number
- Each player's Command Presence
- Presence spent this turn
- Presence committed
- Available Presence
- Deck
- Hand
- Discard pile
- Battlefield cards
- Damage
- Ready/exhausted status
- Seven territory ownership states
- Contested territory
- Capture progress
- Response state
- Winner
- Match log

Avoid UI elements directly becoming the authoritative game state.

---

# 30. BATTLEFIELD UI

The battlefield should immediately communicate:

**This is a war front moving across territory.**

The seven territories should dominate the center of the screen.

Clearly distinguish:

- Player 1 territory
- Neutral territory
- Player 2 territory
- Currently contested territory
- Captured territory
- Frontline

When territory ownership shifts, make it visually satisfying.

Possible effects:

- Territory banner changes.
- Frontline marker slides.
- Short capture animation.
- Territory briefly pulses.
- Combat log announces capture.

Do not overdo effects at the expense of responsiveness.

---

# 31. PLAYER HUD

Each player must be able to quickly read:

### Command Presence
Example:

`COMMAND: 40`

### Committed Presence
Example:

`FIELD: 24`

### Available Presence
Example:

`AVAILABLE: 16`

### Hand size

### Deck size

### Discard size

### Territories controlled

### Capture progress

### Current attacker/responder status

Presence must never be mysterious.

The player should understand exactly why they can or cannot afford a card.

---

# 32. CARD VISUAL DESIGN

Aim for a military/sci-fi Project Faction aesthetic.

Cards should clearly display:

- Name
- Faction
- Type
- Presence
- Attack
- Health
- Ability
- Traits where relevant

Use strong hierarchy.

Presence should be extremely easy to locate.

Faction cards should visually differ from each other.

Temporary placeholder graphics are acceptable.

Do not waste major sprint capacity sourcing perfect final artwork.

Use:

- CSS designs
- faction symbols
- gradients
- geometric military UI
- silhouettes/placeholders

where appropriate.

---

# 33. TOOLTIP / RULE CLARITY

Hovering or inspecting a card should display full readable information.

Implement tooltips for key terms as they are introduced.

Examples:

- Presence
- Guard
- Fortify
- Stealth
- Ambush
- Infiltrate

Avoid forcing card text to contain paragraphs explaining universal rules.

---

# 34. MATCH LOG

Implement a readable combat/game log.

Examples:

`Bruiser Heavy deployed to Industrial District.`

`Rifle Squad attacked Stonewall Defender.`

`Stonewall Defender took 3 damage.`

`Player 2 added 7 Presence to Downtown.`

`Player 1 captured Downtown.`

`Frontline advanced.`

This will be valuable for debugging and balancing.

---

# 35. DECK / HAND RULES

Implement a simple functional deck system.

Recommended prototype:

- Shuffle deck at match start.
- Draw opening hand.
- Draw one card at beginning of offensive turn.
- Hand limit can initially be generous or unlimited.
- Empty deck behavior must not crash or softlock the game.

Add a mulligan later only if useful.

---

# 36. RETREAT / MOVEMENT

Units should eventually be able to move backward as well as forward.

For Sprint 001:

Implement clear adjacent-territory movement rules.

A unit generally moves one connected territory per movement action.

Units should not casually cross enemy-controlled territory.

Retreating should be strategically useful because:

Returning a unit from danger may preserve the Presence tied up in that card rather than losing it completely.

Whether retreat returns a unit to the previous territory or back to hand should depend on the specific mechanic.

---

# 37. COMEBACK DESIGN

The game should NOT use aggressive artificial rubber-banding.

The natural comeback mechanism is:

**The player with fewer surviving cards has less Presence committed and therefore has greater ability to deploy reinforcements.**

The dominant player has:

- More territory
- More surviving forces
- Better battlefield position

but:

- More Command Presence tied up
- More ground to defend
- Less uncommitted Presence

Protect this relationship.

Do not accidentally create mechanics where winning also gives dramatically more deployable resources.

---

# 38. CONFIGURATION / BALANCE PANEL

Keep major values centralized.

Preferably provide a developer configuration section or debug controls for:

- Starting Command Presence
- Presence gain per offensive turn
- Capture threshold
- Starting hand size
- Draw amount
- Maximum units per territory
- Action limit
- Victory territory requirement
- AI toggle
- Debug hand visibility

This will dramatically accelerate future balancing.

---

# 39. DEBUG TOOLS

Create useful developer tools.

Examples:

- Add Presence.
- Draw card.
- Damage unit.
- Destroy selected unit.
- Force territory capture.
- Skip turn.
- Reset match.
- Inspect full game state.
- Toggle both hands visible.

Keep these hidden/collapsible during normal gameplay.

---

# 40. GAME SETUP SCREEN

Create a simple setup screen.

Allow:

### Player 1
Choose faction.

### Player 2
Choose faction.

At minimum once implemented:

- Stonewall
- Syndicate
- Bruiser
- Nightwalker
- Rogue

Options:

- Start Match
- Developer mode
- Possibly AI opponent if implemented

Faction selection should display a short gameplay identity.

Example:

**STONEWALL**
Defensive territorial army focused on holding ground.

**BRUISER**
Heavy aggressive army focused on smashing through defensive lines.

---

# 41. UX REQUIREMENTS

Do not rely on the player already knowing what is happening.

Illegal actions should be prevented.

Examples:

- Cannot deploy unaffordable card.
- Cannot deploy in illegal territory.
- Cannot attack nonexistent target.
- Cannot attack twice if unit is exhausted.
- Cannot move through invalid territory.
- Cannot exceed slot capacity.

When action is illegal, explain WHY.

Example:

`Requires 6 Presence. You currently have 4 available.`

Not:

`Invalid action.`

---

# 42. VISUAL FEEDBACK

Provide feedback for:

- Card selected.
- Valid targets.
- Invalid targets.
- Damage.
- Unit destruction.
- Presence spending.
- Capture progress.
- Territory capture.
- Frontline advancement.
- Turn change.
- Victory.

A tactical game becomes dramatically easier to understand when actions visibly resolve.

---

# 43. SOUND

Sound is optional for Sprint 001.

If added, keep implementation simple.

Do not spend meaningful core-development time searching for audio assets.

---

# 44. SAVE / PERSISTENCE

Full campaign persistence is unnecessary.

If easy to implement, save:

- Settings
- Last faction selections
- Developer configuration

using localStorage.

Do not build accounts or cloud saves.

---

# 45. TESTING REQUIREMENTS

After major systems are implemented, actively test rather than only visually inspecting.

Test at minimum:

### Economy
- Presence calculates correctly.
- Committed cards remain committed.
- Destroyed cards free commitment appropriately.
- Temporary Orders do not regenerate Presence during the same turn.

### Combat
- Damage applies correctly.
- Units die correctly.
- Dead units cannot act.
- Reactions resolve once.
- Response chains cannot loop infinitely.

### Territory
- Presence accumulates correctly.
- Territory captures at correct threshold.
- Ownership changes.
- Frontline updates.
- Players cannot skip territories illegally.

### Turn System
- Initiative flips.
- Attacker/responder roles update.
- Draw/readiness happens for correct player.
- Turn cannot become stuck in response state.

### Victory
- Victory triggers.
- Match stops accepting normal actions afterward.
- Rematch/reset works.

### UI
- Player understands available Presence.
- Cards remain readable.
- Seven-territory board fits desktop layout.
- No critical interface overlap.

---

# 46. PLAYTEST PASSES

Conduct simulated playtest passes internally.

Do not merely load the app.

Play multiple complete matches.

Specifically investigate:

### Snowballing
Does taking the center make winning inevitable?

### Stalemates
Can two defensive armies lock the game permanently?

### Presence Economy
Does a player with a huge field become meaningfully constrained?

### Recovery
Can a damaged player rebuild without arbitrary bonuses?

### Capture Speed
Is 25 territorial Presence too fast or too slow?

### Unit Cost
Are expensive cards worth the amount of Presence they permanently commit?

### Orders
Can one-time Orders be spammed?

### Territory Count
Does pushing across seven zones create satisfying progression or excessive match length?

Tune configuration values based on findings.

Document meaningful balance observations.

---

# 47. STRETCH GOALS

ONLY after the stable core game and five faction foundations work:

### Stretch A
Riftwalker commander selection.

### Stretch B
Temporal Instability / Rift events.

### Stretch C
Basic AI opponent.

### Stretch D
Deck builder.

### Stretch E
Territory cards with unique effects.

Possible examples:

**Abandoned Metro**
Stealth effects improved.

**Industrial District**
Assets become more efficient.

**Rift Scar**
Instability increases faster.

**Military Checkpoint**
Defenders gain protection.

### Stretch F
Simple animations.

### Stretch G
Expanded faction card pools.

### Stretch H
Match statistics screen.

---

# 48. DO NOT BUILD THIS SPRINT

Do NOT spend Sprint 001 primarily building:

- Online multiplayer.
- Accounts.
- Monetization.
- Booster packs.
- Trading.
- Marketplace.
- Server infrastructure.
- Ranked matchmaking.
- Mobile app.
- Hundreds of cards.
- Complex campaign.
- Final artwork pipeline.
- Elaborate lore database.
- 3D battlefield.
- Fully animated characters.

Those may come later.

This sprint exists to prove and establish the **game**.

---

# 49. DESIGN PRINCIPLES

When uncertain, prioritize these principles:

### Territory over kills
Killing units creates opportunity.

**Taking ground wins wars.**

### Presence has weight
Every deployed card should represent an ongoing commitment.

### Dominance has a cost
A player controlling a huge army should feel powerful but stretched.

### Losing creates opportunity
Destroyed forces free Command Presence for reinforcement.

### The frontline moves
Players should visually feel themselves pushing into enemy territory or being pushed backward.

### Factions play differently
Different card art is not sufficient faction identity.

### Interaction is constant
The Responding player should continue making meaningful decisions.

### Simplicity first
A clever mechanic expressed with one number is better than three redundant systems.

---

# 50. SPRINT 001 SUCCESS CONDITION

Sprint 001 is successful when:

Two people can launch the game locally.

They select factions.

They draw cards.

They deploy units using Presence.

Deployed units consume Command Presence.

They attack each other.

The defending player can respond.

Units take damage and die.

Destroyed forces free previously committed Presence.

Players accumulate territorial Presence.

Territories are captured.

The frontline visibly advances and retreats.

A player can fight from the center into enemy territory.

The match reaches a valid victory state.

The players can restart and play again.

At least Stonewall and Bruiser feel meaningfully different.

Ideally all five foundational factions are functional.

The game contains enough content to make replaying a few matches worthwhile.

There are no known game-breaking softlocks in ordinary play.

---

# 51. END-OF-SPRINT DELIVERABLES

Before ending the sprint:

1. Leave the project in a stable runnable state.
2. Verify a fresh launch.
3. Verify a complete match.
4. Repair major console errors.
5. Provide clear launch instructions.
6. Document implemented features.
7. Document known limitations.
8. Document meaningful balance observations.
9. List major systems/files created.
10. State exactly what should be tackled in Sprint 002.
11. Provide the final project path.
12. Do not leave unfinished experimental work breaking the main playable build.

---

# FINAL DIRECTIVE

Do not treat this prompt as a request to merely design the card game.

**Build it.**

Reach the smallest stable playable version quickly, then continue expanding, testing, balancing, improving readability, implementing factions, and polishing for the remainder of the sprint.

The primary question Sprint 001 must answer is:

**Is fighting over a moving Project Faction frontline using committed Presence genuinely fun?**

Everything implemented this sprint should help answer that question while establishing a strong foundation for future development.