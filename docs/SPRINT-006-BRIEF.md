# FRONTLINES — SPRINT 6 DIRECTIVE
## v0.7.0 — Onboarding, Action Economy & Frontline Rules

### PRIMARY GOAL

Sprint 6 should make Frontlines substantially easier to learn, easier to read, and more satisfying to actually play.

Frontlines is not a simple card game. The player is managing:

- Presence / Capacity
- card deployment
- battlefield positioning
- territory control
- combat
- advancing the frontline
- faction mechanics
- action economy
- card abilities
- tactical sequencing
- enemy responses

A completely new player should not be expected to understand these systems through tooltips alone.

This sprint must therefore treat onboarding and game-flow clarity as major gameplay systems, not as optional polish.

At the same time, address several problems observed while watching an inexperienced human player:

1. The AI feels overwhelmingly difficult and opaque to an inexperienced player.
2. The current three-major-action limit makes turns feel unnecessarily restrictive, particularly when a player may have very large amounts of unused Capacity.
3. Units can currently be left stranded behind an advancing frontline, creating battlefield states that do not make intuitive territorial sense.
4. New players do not receive enough explanation for why events occur or what they should be thinking about during a turn.

Target release:

**Frontlines v0.7.0**

---

# SPRINT PHILOSOPHY

Treat this as a maximum-usage development sprint.

Establish a stable playable checkpoint early.

After the core systems are stable, continue autonomously implementing, testing, refining UX, adding tutorial coverage, improving readability, fixing edge cases, and polishing the feature set rather than stopping at the first functional implementation.

Do not conserve development effort merely to produce a minimal prototype.

However:

**DO NOT autonomously run large balance simulations.**

Simulation runs are controlled by Ryken unless he explicitly authorizes Codex to run them.

If simulation evidence is needed:

1. Stop the balance-analysis portion of the task.
2. Specify exactly what simulation Ryken should run.
3. Include recommended match count.
4. Include which decks/factions/profile should be tested.
5. Include any seed or configuration requirements when relevant.
6. State what measurements/results you need returned.
7. Continue with non-simulation work where possible.

Only run simulations yourself when Ryken explicitly requests a simulation-based balance patch or otherwise explicitly authorizes simulation runs.

Automated unit tests, browser tests, deterministic rule tests, tutorial tests, smoke tests, and small non-balance fixture tests are allowed and expected.

---

# PART 1 — ACTION ECONOMY 2.0

The current system can produce situations where a player has something like **80 available Capacity but only three major actions**.

This feels wrong.

When this happens, the real limiting resource stops being Capacity and instead becomes the arbitrary action counter.

The revised design should follow this philosophy:

> Capacity determines what the player can afford.
> Command Actions determine the major battlefield decisions the player can make.

Do not simply increase the action counter from 3 to 5 or 6 and call the problem solved.

Redesign the action economy so spending Presence/Capacity and performing major tactical commands are meaningfully separated.

## Desired baseline model

Retain approximately:

**3 Command Actions per turn**

but redefine what consumes them.

Normal deployment of ordinary cards should generally be governed primarily by Capacity rather than consuming a Command Action.

Examples of things that MAY consume Capacity without consuming a Command Action:

- deploying ordinary units
- deploying many standard assets
- playing certain low-impact support cards
- basic reinforcement

Examples of things that SHOULD generally consume Command Actions:

- initiating an attack
- major tactical orders
- powerful activated abilities
- major repositioning
- advancing the frontline
- special territory actions
- high-impact command effects

Some cards may explicitly say:

**Free Action**

or:

**Does not consume a Command Action.**

Conversely, particularly powerful deployments may explicitly consume a Command Action in addition to Capacity.

Examples might include:

- massive Heavy units
- battlefield-changing assets
- faction leaders
- powerful strategic deployments

Do not hardcode these assumptions unnecessarily. Build a flexible action-cost model that cards/effects can use.

---

# PART 2 — COMMAND ACTION UI

The revised system must be extremely readable.

The player should always be able to immediately understand:

- current Capacity
- committed Presence
- available Capacity
- Command Actions remaining
- what will consume Capacity
- what will consume a Command Action
- what will consume both
- what is currently unavailable and why

If a player highlights or selects a card/action, clearly preview its costs.

Example:

**Deploy Rifle Squad**
Presence: 5  
Command Actions: 0

Example:

**Launch Offensive**
Presence: 3  
Command Actions: 1

Example:

**Deploy Siege Heavy**
Presence: 10  
Command Actions: 1

Never make the player discover these restrictions only after clicking.

If an action cannot be performed, provide a useful reason:

- Not enough Capacity
- No Command Actions remaining
- Territory occupied
- Must defeat defenders first
- Invalid frontline position
- Target already acted
- etc.

---

# PART 3 — FRONTLINE INTEGRITY RULE

Enemy forces should never casually remain stranded behind an advancing frontline.

The battlefield should maintain a coherent, contiguous frontline.

Implement the following general rule:

> When territory changes control and the frontline advances, defending units may not remain behind the new frontline.

When a territory is captured, surviving defenders in that territory must resolve immediately.

Preferred resolution:

### RETREAT

Surviving defenders retreat one territory toward their own side.

If multiple retreat destinations become possible in future map layouts, use a clear deterministic or player-selectable rule.

### NO LEGAL RETREAT

If a defending unit has no legal friendly territory into which it can retreat:

**the unit is eliminated.**

This may visually/lore-wise be described as routed, captured, destroyed, encircled, or overrun depending on later presentation.

The important mechanical rule is:

**No enemy unit remains behind the frontline.**

---

# PART 4 — RETREAT UX

The retreat system must be visually obvious.

When territory is captured:

1. Show territory capture.
2. Identify displaced defenders.
3. Animate defenders retreating toward friendly territory.
4. If they cannot retreat, clearly show their elimination.
5. Then visually update the frontline.

Avoid instantly teleporting cards around without explanation.

Suggested presentation:

**TERRITORY LOST**

then:

**2 units retreat**

or:

**NO RETREAT — 1 unit eliminated**

Keep animations relatively quick.

The player should understand the battlefield transition without reading the combat log.

---

# PART 5 — FUTURE-PROOF RETREAT MECHANICS

Build this cleanly enough that future card mechanics can modify retreat behavior.

Do not necessarily add all of these cards now, but allow the engine to support concepts such as:

- No Retreat
- Entrenched
- Pursuit
- Encircled
- Breakthrough
- Forced Withdrawal
- Fighting Retreat
- Rear Guard
- Rout
- Overrun

Example future possibilities:

A Bruiser effect may prevent enemy retreat and destroy retreating units instead.

A Stonewall unit may refuse forced retreat once.

A Nightwalker effect may exploit units during retreat.

A Rogue effect may retreat sideways or escape unusually.

Do not overbuild unused systems, but avoid implementing retreat in a way that makes these concepts impossible later.

---

# PART 6 — AI DIFFICULTY SETTINGS

Frontlines needs selectable AI difficulty.

The AI currently appears intimidating to an inexperienced human player because it performs efficient sequences without necessarily communicating why those moves are good.

Difficulty must primarily affect:

- decision quality
- planning depth
- tactical awareness
- combo recognition
- risk management
- target evaluation
- territory prioritization
- resource efficiency

Do NOT create fake difficulty primarily through hidden statistical bonuses.

Avoid things like:

- AI secretly gaining extra Presence
- AI drawing better cards
- AI receiving hidden damage bonuses
- player cards secretly becoming weaker

The rules should remain fundamentally fair.

## Suggested difficulty structure

### EASY

Designed for someone learning Frontlines.

Characteristics:

- prioritizes obvious/local moves
- limited look-ahead
- does not consistently find complex combos
- occasionally chooses a merely acceptable option rather than the optimal one
- avoids extremely punishing opening sequences
- favors readable actions
- gives the player room to recover from mistakes

Easy should still play legally and coherently.

Do not intentionally make it nonsensical.

---

### NORMAL

Target experience for an ordinary player.

Characteristics:

- competent tactical play
- basic combo awareness
- sensible territorial priorities
- reasonable resource management
- limited deeper planning
- exploits obvious mistakes but does not relentlessly optimize every decision

---

### HARD

Strong opponent.

Characteristics:

- improved sequencing
- stronger target selection
- matchup awareness
- resource forecasting
- better ability combinations
- recognizes tempo opportunities
- plans several actions ahead where appropriate

---

### EXPERT

Use the strongest current competitive AI logic.

Characteristics:

- full tactical planning
- strong sequencing
- archetype awareness
- matchup-aware play
- advanced resource optimization
- deeper tactical evaluation

This should be clearly labeled as intended for experienced players.

---

# PART 7 — AI DIFFICULTY MUST BE TRANSPARENT

The player should see AI difficulty before starting a game.

Add difficulty selection to the pre-match setup.

Suggested labels:

**Easy — Learning**
Good for first matches.

**Normal — Standard**
Competent opponent.

**Hard — Tactical**
Stronger planning and sequencing.

**Expert — Command AI**
Full-strength opponent.

Remember the selected preference.

Tutorial mode should use a specifically controlled learning AI rather than simply throwing the player against Normal difficulty.

---

# PART 8 — MAJOR TUTORIAL MODE

This is one of the highest-priority parts of Sprint 6.

Do NOT create a tutorial that is simply:

- six paragraphs of instructions
- a tooltip slideshow
- a rules manual
- a giant modal explaining the entire game

Frontlines is too complex for that.

Create a **guided playable tutorial campaign/match** that teaches the game by having the player actually perform actions.

The tutorial should actively control the early game so the player encounters concepts in a logical order.

The tutorial should explain both:

**WHAT to do**

and:

**WHY the player might want to do it.**

Example:

Bad tutorial:

> Click Rifleman.

Better tutorial:

> Deploy the Rifleman into your forward territory. Units establish battlefield Presence and help you contest control. This costs Capacity, but basic deployment does not consume a Command Action.

---

# PART 9 — TUTORIAL STRUCTURE

Build the tutorial in sequential lessons.

Recommended structure:

## LESSON 1 — THE FRONT

Teach:

- what the battlefield represents
- each side's territory
- neutral territory
- the frontline
- overall victory objective

Explain plainly:

**You win by pushing the frontline into enemy territory and securing enough territorial Presence/control to capture the battlefield.**

Use highlights and arrows rather than expecting the player to infer board structure.

---

## LESSON 2 — YOUR TURN

Teach the basic turn structure.

Clearly identify:

- hand
- Capacity
- committed Presence
- available Capacity
- Command Actions

Explain the distinction:

**Capacity pays for forces and resources. Command Actions represent major tactical decisions.**

Make the player perform a simple deployment.

---

## LESSON 3 — DEPLOYING UNITS

Give the player a known hand rather than randomized cards.

Ask them to deploy a basic unit.

Highlight:

- legal territory
- card Presence cost
- resulting Capacity
- unit statistics

Explain why the chosen territory matters.

Allow only sensible tutorial actions until the lesson is complete.

---

## LESSON 4 — COMMAND ACTIONS

Teach the player that deployments and major commands are different resources.

Have them:

1. deploy a unit using Capacity
2. perform an attack using a Command Action

Explicitly show that deployment did not consume the Command Action unless that particular card says otherwise.

This lesson is essential to the redesigned action economy.

---

## LESSON 5 — COMBAT

Create a controlled combat situation.

Teach:

- attacker
- defender
- damage
- health
- relevant combat keywords
- elimination
- surviving units

Show predicted/important combat information before the player commits where practical.

Avoid requiring the player to interpret dense logs.

---

## LESSON 6 — TERRITORY CONTROL

Teach what allows territory to be captured.

Explain:

- contested territory
- controlled territory
- enemy defenders
- what prevents advancement
- what happens after successful advancement

Give the player a controlled opportunity to capture territory.

---

## LESSON 7 — RETREAT AND FRONTLINE ADVANCE

Specifically teach the new rule.

Create a situation where an enemy survives but loses the territory.

Show:

1. player wins the territory
2. enemy retreats toward friendly territory
3. frontline moves

Then create or explain a situation where no legal retreat exists:

> Units with nowhere to retreat are eliminated when the front passes them.

This should visually reinforce why units are never left stranded behind the frontline.

---

## LESSON 8 — ORDERS / ABILITIES

Introduce one simple Order and/or activated ability.

Teach:

- target selection
- Presence/Capacity cost
- whether it consumes a Command Action
- expected effect

Do not introduce several keyword-heavy cards simultaneously.

---

## LESSON 9 — FACTION IDENTITY

Briefly introduce the five factions.

Do not dump every mechanic.

Give concise conceptual descriptions:

**Stonewall**
Defense, fortification, attrition, holding ground.

**Bruiser**
Aggression, breakthrough, frontal pressure.

**Syndicate**
Efficiency, professionalism, combined arms, precision.

**Nightwalker**
Stealth, disruption, timing, assassination.

**Rogue**
Adaptation, improvisation, scavenging, flexible tactics.

Let the player inspect example cards.

---

## LESSON 10 — GUIDED REAL TURN

Stop dictating every individual click.

Give the player an objective such as:

**Capture the center territory this turn.**

Provide optional hints.

Allow multiple valid solutions.

This is the bridge between tutorial scripting and actual gameplay.

---

## LESSON 11 — TRAINING MATCH

Transition directly into a short match against Learning AI.

Reduce tutorial interruption.

Only surface contextual tips when relevant.

Examples:

- You still have Capacity available.
- You have 2 Command Actions remaining.
- This territory cannot advance while enemy defenders remain.
- Capturing this territory will force those units to retreat.

The player should finish the tutorial by winning an actual short match.

---

# PART 10 — CONTEXTUAL TUTORIAL SYSTEM

After the formal tutorial, Frontlines should continue helping new players.

Implement contextual first-time tips.

Examples:

First time player runs out of Command Actions:

> You can still deploy cards that do not require a Command Action if you have enough Capacity.

First time player tries to advance illegally:

> Enemy resistance prevents this advance.

First forced retreat:

> The frontline moved forward. Surviving defenders retreat toward friendly territory.

First card with a major keyword:

Show a concise keyword explanation.

Tips should:

- be dismissible
- not repeatedly spam the player
- be reviewable later if practical
- respect a setting to disable tutorial hints

---

# PART 11 — HINT SYSTEM

Tutorial mode should include a Hint button.

Do not immediately reveal the answer.

Use progressive hints.

Example:

Hint 1:

> Look at the enemy unit defending the center.

Hint 2:

> You need to remove or displace defenders before you can advance.

Hint 3:

> Select your Assault Squad and attack the center defender.

This is substantially better than forcing the player to either know the answer or be directly told every click.

---

# PART 12 — TUTORIAL SAFETY / RECOVERY

A tutorial should be difficult to accidentally break.

Account for:

- player clicking unexpected cards
- player opening another panel
- player attempting illegal actions
- player closing a prompt
- player making a legal but unexpected move
- player restarting the tutorial
- player quitting mid-tutorial

Where appropriate:

- disable irrelevant actions temporarily
- highlight required interfaces
- gracefully explain invalid attempts
- provide restart lesson
- provide restart tutorial
- allow Skip Tutorial

Never trap the player permanently because they did something unexpected.

---

# PART 13 — TUTORIAL PROGRESS

Track tutorial completion locally.

Support:

**Tutorial**
Start / Continue

After completion:

**Replay Tutorial**

Potentially track individual lessons so returning players can revisit specific concepts later.

At minimum provide a way to restart the full tutorial.

Do not permanently remove access once completed.

---

# PART 14 — NEW PLAYER START FLOW

A first launch should feel deliberate.

Suggested flow:

Frontlines logo

→ New Player prompt

→

**Learn Frontlines**
Recommended for first-time commanders.

**Play Immediately**
Skip tutorial.

Do not force the tutorial, but strongly recommend it.

If the player skips, Normal gameplay should still provide contextual tips unless they disable them.

---

# PART 15 — RULE REFERENCE / FIELD MANUAL

Create a concise in-game rules reference.

This may live under:

**Field Manual**

or within Settings/Help.

Organize into short sections:

- Winning
- Turn Structure
- Capacity
- Command Actions
- Deployment
- Combat
- Territory
- Frontline
- Retreat
- Card Types
- Keywords
- Factions

This should complement the tutorial, not replace it.

Avoid giant unformatted walls of text.

---

# PART 16 — BATTLEFIELD READABILITY

Watching another person play revealed that important game information is too difficult to interpret quickly.

Improve visual feedback for:

- whose turn it is
- Command Actions remaining
- Capacity remaining
- legal deployment territories
- legal attack targets
- capturable territory
- territory that cannot advance
- retreat destination
- damage resolution
- card activation
- AI actions

When the AI acts, briefly communicate what happened.

Example:

**Nightwalker deploys Silent Blade — 4 Presence**

**Nightwalker attacks Center**

**Stonewall Defender takes 3 damage**

Do not make AI turns excessively slow, but do not execute five opaque actions instantly.

Consider a readable AI action cadence and/or speed settings:

- Fast
- Normal
- Deliberate

---

# PART 17 — AI TURN EXPLANATION

Especially on Easy / Tutorial difficulty, provide lightweight reasoning where helpful.

Examples:

**AI reinforces the center because it is contested.**

**AI retreats this unit to preserve Presence.**

**AI attacks before deploying reinforcements.**

Do not expose internal scoring formulas.

The purpose is to help inexperienced players understand strategic logic.

This may be a tutorial-only or optional setting if normal play becomes too verbose.

---

# PART 18 — ACTION HISTORY

Improve the combat/action history so the player can answer:

**What just happened?**

At minimum show recent actions in a readable compact log.

Prioritize human language.

Bad:

`resolveControlTransition actor=1 lane=3 +2`

Good:

**Bruiser captured Center. Nightwalker Scout retreated to Rear Territory.**

Allow the player to inspect recent activity without turning the interface into a webpage.

Keep it in a contained panel/drawer.

---

# PART 19 — DIFFICULTY AND TUTORIAL SETTINGS

Add appropriate settings.

Potential options:

AI Difficulty  
Tutorial Hints  
AI Action Speed  
Combat Animation Speed  
Show Action Explanations  
Confirm Major Actions  
Reduced Motion

Preserve the existing game-shell approach and avoid page-like vertical navigation.

---

# PART 20 — VERSION INDICATOR

Preserve and verify the standing Frontlines version requirement.

The installed game version must be visibly accessible inside the application.

For this release:

**Frontlines v0.7.0**

The displayed version must come from the actual application/package version rather than a separately maintained hardcoded string whenever practical.

Keep a subtle version indicator on the main menu.

Also expose full version information in Settings/About.

Balance/report exports should include the originating game version.

Update messages should clearly distinguish:

**Installed: v0.6.0**
**Available: v0.7.0**

or the appropriate values.

---

# PART 21 — FULLSCREEN / GAME SHELL

Preserve Sprint 5's desktop/game presentation.

Verify:

- true Electron fullscreen
- F11 toggle
- Alt+Enter if already supported/practical
- windowed mode
- responsive layouts
- no webpage-style main navigation
- important actions remain visible
- major screens do not require whole-page vertical scrolling

Contained scrolling remains acceptable for:

- card collections
- logs
- long settings groups
- reports
- deck lists

---

# PART 22 — SIMULATION WORKFLOW

This requirement is mandatory.

Codex is NOT the default simulation operator.

Do not autonomously run:

- 10k simulations
- 50k simulations
- matchup matrices
- repeated balance experiments
- automated simulation-based tuning loops

unless Ryken explicitly asks you to run a simulation-based balance patch or specifically authorizes simulation runs.

If balance validation is needed, produce a request in this format:

### SIMULATION REQUEST

Purpose:
[what question needs answering]

Recommended games:
[e.g. 10,000]

Configuration:
[profile / factions / decks / seats / other parameters]

Required outputs:
[faction rates, archetype rates, P1/P2 split, etc.]

Reason:
[why these results are needed]

Then continue anything that can be completed without those results.

Do not silently tune cards based on simulations Ryken did not request.

---

# PART 23 — BALANCE POLICY FOR THIS SPRINT

Do NOT perform major balance changes early in this sprint based on the current v0.6.0 simulation results.

The action economy and frontline rules are changing substantially.

Those changes may alter:

- deck strength
- archetype strength
- first-player advantage
- game length
- Presence efficiency
- unit density
- territory tempo
- comeback potential

Therefore:

1. Implement new systems.
2. Test rules and stability.
3. Request fresh simulations from Ryken when the new gameplay system is stable.
4. Analyze the returned results.
5. Recommend a balance patch.
6. Only implement simulation-based tuning when directed.

Standing long-term balance target remains:

**All factions approximately 45–55%**

with a preferred overall highest-to-lowest faction spread of approximately:

**5 percentage points or less**

Do not achieve this by flattening faction identity.

---

# PART 24 — TESTING

Expand automated testing significantly.

Test:

### ACTION ECONOMY

- ordinary deployment with Capacity and no Command Action cost
- Command Action-consuming effects
- effects that consume both resources
- Free Actions
- zero remaining Command Actions
- insufficient Capacity
- very high Capacity
- action resets each turn
- AI obeys same economy

### FRONTLINE

- capture territory
- surviving defender retreats
- multiple defenders retreat
- no legal retreat eliminates defender
- frontline remains contiguous
- no enemy remains behind frontline
- retreat destination validity
- interaction with full territories
- simultaneous removal/capture edge cases

### AI DIFFICULTY

- all difficulty settings select correctly
- AI remains rules-legal
- Easy does not access illegal resources
- Expert does not receive hidden cheats
- preference persistence
- tutorial AI selection

### TUTORIAL

- tutorial launch
- each lesson advances
- illegal action recovery
- restart lesson
- restart tutorial
- skip tutorial
- completion persistence
- hint progression
- controlled hand/deck behavior
- tutorial cannot soft-lock
- tutorial remains functional in fullscreen/windowed mode

### VERSION

- displayed application version matches package version

### GAME SHELL

- command menu
- battlefield
- tutorial
- settings
- Arsenal
- War Room
- fullscreen/windowed transitions

---

# PART 25 — MANUAL HUMAN PLAYTEST CHECKLIST

Before considering Sprint 6 complete, perform a human-flow test.

Pretend the tester knows almost nothing about Frontlines.

Check whether the interface itself answers:

- What am I trying to accomplish?
- Whose turn is it?
- How much Capacity do I have?
- What is Capacity?
- How many Command Actions remain?
- What costs a Command Action?
- Why can't I perform this action?
- Where can this card be deployed?
- Which territory is contested?
- Can I advance?
- Why did those enemy units retreat?
- Why was that unit eliminated?
- What did the AI just do?
- What should I probably think about next?

If the game requires external explanation for basic answers, improve the interface/tutorial.

---

# PART 26 — TUTORIAL QUALITY BAR

The tutorial is not complete merely because every rule has text explaining it.

The quality bar is:

> A person unfamiliar with Frontlines should be able to launch the game, choose Tutorial, complete the guided experience without outside assistance, and then play a real Easy match while understanding the basic reason behind most of their available choices.

The tutorial should feel like the opening mission of a strategy game, not like reading documentation.

Use:

- controlled scenarios
- highlights
- arrows
- contextual prompts
- progressive hints
- limited early choices
- increasing freedom
- short explanations
- visible cause-and-effect

Avoid:

- giant instruction dumps
- unexplained terminology
- introducing five mechanics simultaneously
- blocking the entire screen repeatedly
- excessive mandatory reading

---

# PART 27 — DOCUMENTATION

Update relevant project documentation for:

- action economy
- Command Actions
- Capacity
- frontline capture
- retreat
- AI difficulty
- tutorial architecture
- tutorial lesson progression
- new settings
- v0.7.0 release changes

Create/update:

**docs/SPRINT-006.md**

and:

**docs/RELEASE-0.7.0.md**

Document any important architectural decisions that future sprints need to preserve.

---

# PART 28 — RELEASE READINESS

Before Sprint 6 is considered complete:

- application launches normally
- Tutorial works from beginning to end
- Easy/Normal/Hard/Expert selectable
- AI follows new action economy
- player follows new action economy
- high Capacity no longer feels artificially blocked by only three total card plays
- frontline cannot leave enemy units stranded behind it
- retreat works consistently
- no legal retreat causes elimination
- player can understand why territory changed
- version indicator reports v0.7.0 correctly
- fullscreen still works
- Arsenal still works
- War Room still works
- saved decks survive upgrade
- update system remains functional
- automated test suite passes
- packaged Electron build launches successfully

Do not publish or create a GitHub release automatically unless explicitly instructed.

---

# FINAL DELIVERABLE

Finish Sprint 6 in a stable, playable state suitable for Ryken to personally test.

At the end, provide:

1. concise implementation summary
2. major gameplay changes
3. tutorial features completed
4. action-economy behavior
5. frontline/retreat behavior
6. AI difficulty behavior
7. tests added/updated
8. test results
9. known issues
10. any manual testing needed
11. exact simulation request, if balance data is needed
12. exact current version
13. recommended next development priority

Remember:

**Ryken runs balance simulations unless he explicitly authorizes Codex to run them.**

Do not independently launch a simulation-driven balance campaign.

Prioritize making Frontlines understandable, readable, and enjoyable for an inexperienced human player.