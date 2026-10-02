# FRONTLINES — SPRINT 3
## Balance Lab, Faction Identity, AI Validation & Playtest Intelligence

### PROJECT STATE

Frontlines currently has a functioning playable game, five factions, visual presentation, card artwork, combat/battlefield effects, AI opponents, a standalone Windows build, external playtesting capability, and an automated simulator capable of running approximately 10,000 matches per batch.

The simulator has exposed a major faction-balance problem.

Current baseline results:

- Stonewall — 4,000 games — 2,177 wins — **54.4%**
- Bruiser — 4,000 games — 3,929 wins — **98.2%**
- Syndicate — 4,000 games — 2,218 wins — **55.5%**
- Nightwalker — 4,000 games — 798 wins — **20.0%**
- Rogue — 4,000 games — 878 wins — **21.9%**

These numbers are not automatically proof that card stats alone are broken.

Possible causes include:

- card balance,
- Presence economy,
- territory rules,
- faction mechanics,
- AI quality,
- AI inability to utilize certain factions,
- matchup-specific counters,
- snowballing,
- turn-order advantage,
- simulator/live-game divergence,
- incorrect effect implementations,
- or combinations of these factors.

Sprint 3 must identify the actual causes before aggressively modifying numbers.

---

# PRIMARY SPRINT GOAL

Transform the existing simulator into a proper **Frontlines Balance Lab** and use it to establish the first genuinely balanced and mechanically distinct version of the five-faction ecosystem.

By the end of Sprint 3, we should be able to answer:

- Why does Bruiser currently dominate?
- Why are Nightwalker and Rogue currently failing?
- Is the AI playing every faction correctly?
- Is there significant first-player advantage?
- Which cards are outliers?
- Which faction mechanics produce the most value per Presence?
- How quickly does territory move?
- Which matchups are problematic?
- How often does a losing player successfully recover?
- Are games being decided too early?
- Are factions mechanically distinct or simply different stat packages?
- Does the simulator accurately reproduce the real game?
- Did the balance changes actually improve the ecosystem?

The final target is not mathematical perfection.

The target is a game where each faction is viable, strategically identifiable, counterplay exists, and balance can be measured rather than guessed.

---

# SPRINT PHILOSOPHY

Treat this as a maximum-productivity development sprint.

Do not stop after implementing one requested feature.

Establish a stable checkpoint early, then continue autonomously through:

diagnosis → instrumentation → simulation → AI validation → balance changes → testing → additional simulation → human-playtest improvements → polish.

Always preserve a runnable stable build.

Do not sacrifice game stability simply to complete optional features.

Do not rewrite working systems without a concrete reason.

Prefer improving and extending the existing architecture.

---

# PHASE 1 — LOCK A BASELINE

Before changing balance values, preserve the current build as the Sprint 3 baseline.

Create a balance snapshot containing:

- current card definitions,
- faction rules,
- Presence rules,
- AI behavior configuration,
- game-rule configuration,
- simulator version,
- baseline simulation results.

Store these in a clearly documented form.

Suggested location:

`docs/balance/sprint-3-baseline/`

The baseline should allow comparison against every subsequent balance iteration.

Record the existing faction results listed above.

Do not overwrite the historical baseline after balance work begins.

---

# PHASE 2 — VERIFY LIVE GAME VS SIMULATOR

Before making balance decisions, validate that simulation results represent actual Frontlines gameplay.

Audit the simulator against the authoritative game engine.

Verify:

- card draw rules,
- hand limits,
- Presence generation,
- Presence commitment,
- Presence refunds/recovery,
- deployment restrictions,
- attack order,
- attack targeting,
- damage,
- health,
- death,
- triggered abilities,
- passive abilities,
- lane movement,
- territory pressure,
- territory capture,
- faction abilities,
- response actions,
- end-of-turn effects,
- end-of-round effects,
- win-condition checks,
- tie handling,
- deck exhaustion,
- cards becoming affordable/unaffordable,
- and unusual edge cases.

Where practical, share authoritative rules between the playable game and simulator rather than maintaining duplicate logic.

The simulator must never become an alternate interpretation of Frontlines.

If simplifications are necessary for simulation performance, document them explicitly and verify that they do not meaningfully affect results.

---

# PHASE 3 — DETERMINISTIC SIMULATION

Add deterministic seeded simulations if not already available.

Every simulation batch should record:

- seed,
- rules version,
- balance version,
- AI version,
- faction configuration,
- decks used,
- simulation size.

Individual simulated matches should also have reproducible seeds.

Example:

`Seed: 83947201`

The same:

- seed,
- decks,
- rules,
- AI,
- and balance configuration

should reproduce the same match.

This will allow abnormal matches to be replayed rather than disappearing inside a 10,000-game dataset.

---

# PHASE 4 — MATCH REPLAY / DEBUG TRACE

Add the ability to inspect suspicious simulated matches.

At minimum, generate a readable event log containing:

- turn number,
- active player,
- cards drawn,
- Presence before action,
- action selected,
- card deployed,
- lane targeted,
- combat result,
- unit death,
- territory state,
- Presence after action,
- relevant triggered effects,
- AI decision score/reason where practical.

Example:

`Turn 7 — Bruiser`

`Available Presence: 14`

`AI evaluated 9 legal actions.`

`Selected: Deploy Breaker into Lane 2.`

`Reason: highest territory-pressure score.`

`Lane 2 pressure changed 6 → 11.`

`Nightwalker Defender destroyed.`

`Forward Zone captured.`

A simulation anomaly should therefore be diagnosable rather than merely visible in aggregate statistics.

---

# PHASE 5 — COMPLETE MATCHUP MATRIX

Overall win rate is insufficient.

Generate a complete faction-versus-faction matrix.

Include every matchup.

Example:

Stonewall vs Bruiser  
Stonewall vs Syndicate  
Stonewall vs Nightwalker  
Stonewall vs Rogue  
Bruiser vs Syndicate  
Bruiser vs Nightwalker  
Bruiser vs Rogue  
Syndicate vs Nightwalker  
Syndicate vs Rogue  
Nightwalker vs Rogue

Where relevant, include mirror matches as sanity tests.

For every matchup show:

- games simulated,
- wins,
- losses,
- ties,
- win percentage,
- 95% confidence interval,
- first-player win percentage,
- second-player win percentage,
- average game length.

This will determine whether Bruiser has universal dominance or only destroys specific archetypes.

---

# PHASE 6 — FIRST-PLAYER ADVANTAGE

Measure turn-order advantage.

Track globally:

- Player 1 wins,
- Player 2 wins,
- ties,
- first-player percentage.

Then break this down by faction and matchup.

Example:

Bruiser as Player 1  
Bruiser as Player 2

Nightwalker as Player 1  
Nightwalker as Player 2

etc.

Flag significant discrepancies.

Do not artificially force exactly 50/50 turn-order results.

However, large systematic advantage must be investigated.

Potential fixes may include:

- initial Presence,
- first-turn draw,
- deployment limitations,
- response opportunities,
- initiative rules.

Do not modify these systems without evidence.

---

# PHASE 7 — MATCH LENGTH ANALYTICS

Track:

- average match length,
- median,
- minimum,
- maximum,
- standard deviation,
- 75th percentile,
- 90th percentile,
- 95th percentile.

Break results down by:

- faction,
- matchup,
- winner,
- turn order.

Identify:

- extreme blowouts,
- excessive stalemates,
- matches effectively decided several turns before victory,
- factions that win disproportionately quickly,
- factions that survive for many rounds but rarely win.

---

# PHASE 8 — TERRITORY FLOW ANALYTICS

Territory is the defining objective of Frontlines.

Instrument it heavily.

Track:

- round of first territory change,
- number of captures,
- number of recaptures,
- number of contested states,
- average controlled territory per round,
- time spent controlling center,
- time spent in enemy territory,
- longest uninterrupted territorial hold,
- average territorial lead,
- maximum territorial lead,
- round where the eventual winner first gained the lead,
- round where the eventual winner gained a permanent lead.

Create territory progression visualization if practical.

Example:

`Round`

1 2 3 4 5 6 7 8 9

Stonewall territory:

3 3 3 4 4 4 3 4 5

Bruiser territory:

2 2 2 1 1 1 2 1 0

This should make snowball behavior visible.

---

# PHASE 9 — COMEBACK ANALYTICS

The Presence system is partially designed to reduce runaway snowballing by forcing dominant players to commit resources to the battlefield.

Measure whether this actually works.

Define meaningful comeback states such as:

- trailing by multiple territory zones,
- losing the center,
- enemy occupying forward territory,
- Presence disadvantage,
- unit-count disadvantage.

Track how often players recover from those states.

Generate metrics such as:

- comeback attempt frequency,
- comeback success rate,
- faction comeback rate,
- comeback rate by matchup,
- comeback rate by territory deficit.

If Bruiser gains an early advantage and then essentially never loses, identify why.

---

# PHASE 10 — PRESENCE ECONOMY ANALYTICS

Presence is a core Frontlines mechanic and must receive detailed analysis.

Track per faction:

- total Presence generated,
- total Presence spent,
- average Presence spent per round,
- committed Presence,
- available Presence,
- unused Presence,
- Presence recovered,
- Presence tied up in surviving troops,
- Presence lost when units die,
- average unit value on field,
- average number of deployed units,
- average card cost played,
- cards stranded because of cost,
- turns where no meaningful play was affordable.

Create a useful derived metric:

## PRESSURE PER PRESENCE

Estimate the battlefield value generated per Presence committed.

Possible contributing factors:

- damage,
- kills,
- survival,
- lane control,
- territorial pressure,
- captures.

Do not reduce all balance decisions to this metric, but use it to identify extreme faction efficiency.

Bruiser's current performance strongly warrants investigation here.

---

# PHASE 11 — CARD ANALYTICS

Track performance for every card.

Metrics should include:

- number of times included in decks,
- number of times drawn,
- number of times played,
- percentage played when affordable,
- average turn drawn,
- average turn played,
- average Presence spent,
- average survival duration,
- damage dealt,
- damage received,
- kills,
- territory pressure contributed,
- captures contributed to,
- win rate when drawn,
- win rate when played,
- win rate when played early,
- win rate when played late,
- frequency stranded in hand.

Highlight outliers automatically.

Possible classifications:

`Potentially Overperforming`

`Potentially Underperforming`

`Rarely Played`

`Frequently Stranded`

`Extremely Efficient`

`Highly Conditional`

Do NOT automatically nerf a card because its "win rate when played" is high.

Context matters.

A finisher may naturally be played primarily in winning games.

---

# PHASE 12 — AI DECISION QUALITY

The simulator cannot be trusted unless every faction's AI understands its faction.

Review AI logic.

Generic decision making should understand:

- affordable cards,
- lane threats,
- territory priority,
- lethal opportunities,
- Presence conservation,
- unit trades,
- reinforcement,
- defensive necessity,
- offensive opportunity.

Then layer faction-specific priorities.

---

# STONEWALL AI

Stonewall should value:

- holding territory,
- stabilizing threatened lanes,
- defensive efficiency,
- durable units,
- preserving advantageous board positions.

Stonewall should not waste defensive assets on unnecessary aggression.

---

# BRUISER AI

Bruiser should value:

- forcing contested lanes,
- breakthrough opportunities,
- punishing weak defenses,
- coordinated aggression,
- creating decisive pressure.

Bruiser should be willing to accept some losses.

It should not receive artificial omniscience or perfect aggression sequencing merely because its strategy is simpler.

---

# SYNDICATE AI

Syndicate should value:

- efficient trades,
- tactical flexibility,
- calculated deployment,
- positioning,
- adaptable responses.

It should behave like a faction winning through efficiency rather than brute force.

---

# NIGHTWALKER AI

Nightwalker deserves particular scrutiny.

If Nightwalker relies on:

- timing,
- disruption,
- stealth,
- information,
- selective targeting,
- tempo,
- conditional effects,

then a generic "play highest-value card" AI may catastrophically undervalue the faction.

Build Nightwalker-specific decision logic where necessary.

Ensure Nightwalker understands when to:

- hold cards,
- exploit exposed targets,
- disrupt high-value units,
- create tactical openings,
- avoid unfavorable direct confrontation.

---

# ROGUE AI

Rogue should understand its flexibility and improvisational tools.

If Rogue contains:

- variable effects,
- unconventional deployments,
- temporary advantages,
- opportunistic cards,
- sacrifice mechanics,
- or asymmetric strategies,

then its AI must recognize them.

Do not judge Rogue's actual balance using an AI incapable of understanding Rogue.

---

# PHASE 13 — AI QUALITY BENCHMARKING

Run AI-vs-AI comparisons with different decision quality where practical.

Potential tiers:

- Random legal action AI
- Basic heuristic AI
- Current faction-aware AI

The point is not to ship three difficulty settings yet.

The point is to diagnose whether faction win rate changes dramatically as AI intelligence improves.

If Nightwalker goes:

20% with Basic AI  
47% with Faction-Aware AI

then Nightwalker may not actually need huge buffs.

That is extremely valuable information.

---

# PHASE 14 — FACTION MECHANICAL IDENTITY

Each faction must become mechanically identifiable without relying on artwork or faction name.

Audit the existing card pool and reinforce identities.

## STONEWALL

Theme:

Defense, fortification, attrition, positional control.

Strengths:

- durable units,
- defensive reinforcement,
- holding territory,
- stabilizing contested lanes,
- punishing enemies for attacking fortified positions.

Weaknesses:

- slower advances,
- reduced burst pressure,
- higher commitment,
- difficulty rapidly changing lanes.

Stonewall must not simply become "Bruiser with more health."

---

## BRUISER

Theme:

Aggression, breakthrough, overwhelming frontal pressure.

Strengths:

- attacking,
- destroying defenders,
- forcing movement,
- exploiting weak lanes,
- decisive battlefield pushes.

Weaknesses should include some combination of:

- poor staying power after failed attacks,
- limited flexibility,
- high commitment,
- vulnerability to disruption,
- reduced efficiency when forced to defend.

Bruiser should feel frightening when attacking.

Bruiser should not also be the game's best faction at:

- economy,
- defense,
- recovery,
- and attrition.

---

## SYNDICATE

Theme:

Efficiency, professionalism, tactical control.

Strengths:

- efficient trades,
- flexible responses,
- reliable units,
- tactical tools,
- Presence efficiency when played intelligently.

Weaknesses:

- fewer overwhelming individual units,
- reliance on sequencing,
- less extreme specialization.

Syndicate should feel controlled and precise.

---

## NIGHTWALKER

Theme:

Disruption, stealth, manipulation and tactical timing.

Strengths:

- removing or bypassing key targets,
- disrupting enemy plans,
- creating temporary openings,
- punishing overcommitment,
- controlling tempo.

Weaknesses:

- weaker direct confrontation,
- lower durability,
- dependence on timing,
- difficulty recovering from badly mistimed actions.

Nightwalker should NOT become balanced by simply adding attack and health until it resembles Bruiser.

---

## ROGUE

Theme:

Adaptability, improvisation, opportunism.

Strengths:

- unusual answers,
- flexible deployment,
- unexpected combinations,
- exploiting unstable battlefields,
- turning unusual board states into advantages.

Weaknesses:

- lower consistency,
- reduced specialization,
- greater dependence on player decision quality.

Rogue should produce creative opportunities rather than simply random effects.

---

# PHASE 15 — BALANCE CONFIGURATION SYSTEM

Avoid scattering balance numbers throughout source files.

Where practical, centralize:

- unit stats,
- Presence costs,
- faction modifiers,
- territory modifiers,
- ability parameters.

Allow balance iterations to be easily compared.

Suggested structure:

`balance/`

`baseline.json`

`iteration-01.json`

`iteration-02.json`

`candidate.json`

or equivalent existing-project structure.

Do not introduce unnecessary complexity if the current architecture already provides an equivalent clean solution.

---

# PHASE 16 — AUTOMATIC BALANCE FLAGS

Create configurable warning thresholds.

Examples:

### Faction overall win rate

Green:
47%–53%

Watch:
44%–47% or 53%–56%

Warning:
below 44% or above 56%

Critical:
below 40% or above 60%

These are development diagnostics, not absolute rules.

### Matchup imbalance

Flag individual matchups significantly outside healthy ranges.

### Turn-order advantage

Flag strong first-player or second-player advantage.

### Match duration

Flag unusually short or long matchups.

### Cards

Flag statistical outliers.

Do not automatically modify gameplay.

The system identifies candidates for human review.

---

# PHASE 17 — BALANCE REPORT

Every large simulation run should create a readable report.

Create both:

- machine-readable output,
- human-readable output.

Suggested files:

`simulation-results.json`

`balance-report.html`

or equivalent.

The report should summarize:

## Executive Summary

Example:

"10,000 matches completed."

"Bruiser remains substantially above the intended competitive range."

"Nightwalker improved significantly after AI revision."

"First-player advantage is 51.8% and currently acceptable."

## Faction Overview

Win rates and confidence intervals.

## Matchup Matrix

Full faction-vs-faction table.

## Turn Order

First-player advantage.

## Match Length

Distribution and outliers.

## Territory Flow

Capture and snowball metrics.

## Presence Economy

Faction efficiency.

## Card Outliers

Potential balance problems.

## AI Notes

Relevant decision-quality findings.

## Comparison to Previous Run

Show directional changes.

Example:

Bruiser:

98.2% → 71.4% → 55.8%

Nightwalker:

20.0% → 35.2% → 48.1%

This historical comparison is extremely important.

---

# PHASE 18 — SIMULATOR DASHBOARD IMPROVEMENTS

Improve the existing simulator interface into a usable Balance Lab.

Include useful controls such as:

- number of simulations,
- faction selection,
- matchup selection,
- seed,
- AI version/configuration,
- balance profile,
- simulation start,
- progress indicator,
- export results.

Display:

- faction win rates,
- matchup matrix,
- confidence intervals,
- first-player advantage,
- match-length information,
- Presence metrics,
- territory metrics,
- card outliers.

Do not clutter the interface with every raw statistic simultaneously.

Use expandable details where appropriate.

---

# PHASE 19 — SIMULATION PRESETS

Add useful presets.

Examples:

## Quick Check
1,000 matches.

Used during development.

## Standard Balance Run
10,000 matches.

Primary iteration benchmark.

## Deep Validation
50,000+ matches if performance permits.

Used sparingly when confirming a release candidate.

Do not freeze the UI during large browser simulations.

Use workers or existing asynchronous architecture appropriately.

---

# PHASE 20 — PERFORMANCE

The simulator must remain fast.

Profile any major bottlenecks.

Avoid expensive visual updates while simulations are running.

Aggregate results efficiently.

Keep detailed event logs only for:

- requested matches,
- abnormal matches,
- sampled matches,

rather than storing full logs for tens of thousands of games unless performance remains acceptable.

---

# PHASE 21 — BALANCE ITERATION 1

After diagnostics are trustworthy, perform the first evidence-based balance pass.

Do NOT start by attempting exact 50% faction win rates.

Instead:

1. identify obvious systemic problems,
2. correct AI problems,
3. correct bugs,
4. correct extreme Presence-efficiency outliers,
5. correct clearly broken cards,
6. rerun simulation.

Preserve the results.

---

# PHASE 22 — BALANCE ITERATION 2+

Continue iterating.

Each iteration should contain:

- hypothesis,
- change,
- simulation result,
- conclusion.

Example:

Hypothesis:

Bruiser's cheap frontline units generate too much pressure per Presence.

Change:

Increase Presence commitment for specific units.

Result:

Bruiser overall win rate:
71% → 58%

Nightwalker matchup:
18% → 39%

Conclusion:

Pressure efficiency was a major contributor but additional imbalance remains.

Keep this development history.

Do not make dozens of undocumented balance changes simultaneously.

---

# PHASE 23 — HUMAN PLAYTEST TELEMETRY

Frontlines now has at least one external playtester through the distributable Windows build.

Create a lightweight mechanism for human matches to produce useful debugging/playtest information.

Do NOT require accounts or online infrastructure.

At match conclusion, optionally allow:

`Export Playtest Report`

The report may contain:

- version,
- factions,
- winner,
- number of rounds,
- territory history,
- cards played,
- Presence history,
- major game events,
- optional player feedback.

Provide simple optional feedback prompts:

- Did anything feel unfair?
- Did anything feel confusing?
- Which faction felt stronger?
- Was the match too short, about right, or too long?
- Did any card seem broken?
- Did any card seem useless?
- Was there a moment where the outcome felt inevitable?

Export to a local JSON or text file.

Do not collect personal data.

---

# PHASE 24 — MATCH HISTORY FOR LOCAL PLAY

If practical, add a local recent-match history.

Store only lightweight data.

Example:

`Stonewall vs Bruiser`

`Stonewall Victory`

`12 rounds`

`October 1, 2026`

This can assist repeated human playtesting.

Do not build a full account/statistics platform yet.

---

# PHASE 25 — BALANCE LAB QUALITY-OF-LIFE

Add small tools that dramatically improve future development.

Candidates include:

- rerun same seed,
- copy seed,
- replay interesting match,
- export matchup data,
- compare two balance profiles,
- sort cards by performance,
- filter by faction,
- filter by matchup,
- highlight biggest changes between runs,
- save simulation configuration.

Prioritize useful developer functionality over decorative UI.

---

# PHASE 26 — REGRESSION TESTS

Expand automated testing around:

- Presence accounting,
- territory capture,
- faction abilities,
- card effects,
- victory conditions,
- seeded randomness,
- AI legal-action handling,
- simulator/live-game consistency.

Add regression tests for every major bug discovered during this sprint.

A balance change should never accidentally break rules.

---

# PHASE 27 — TARGET BALANCE RANGE

Initial development target:

Most faction overall win rates should eventually fall roughly within:

**47%–53%**

However, do not force this through artificial tuning.

A faction slightly outside this range may be acceptable if:

- matchup distribution is healthy,
- human testing supports it,
- faction identity remains strong,
- and the difference is not structurally problematic.

Individual matchup variation may be wider.

Counterplay is acceptable.

Hard counters approaching guaranteed victory are generally undesirable.

The real objective is:

**Every faction should have a credible path to victory against every other faction.**

---

# PHASE 28 — DO NOT OVERFIT TO AI

This is extremely important.

Simulation balance is evidence.

Simulation balance is NOT automatically equivalent to human balance.

Do not mutilate interesting mechanics merely because automated agents do not use them optimally.

Where a faction's win rate is strongly influenced by AI competency, improve the AI or mark the uncertainty.

Human playtesting should gradually become another source of evidence.

Future balance decisions should eventually combine:

- simulation,
- human matches,
- playtest feedback,
- card statistics,
- design intent.

---

# PHASE 29 — RELEASE CANDIDATE VALIDATION

Once major balance work is complete:

Run a fresh large simulation batch.

Minimum preferred validation:

**10,000 matches**

Use a new seed.

Then run another independent batch if computationally reasonable.

Compare results.

Verify that improvements persist across seeds.

Check:

- faction balance,
- matchup balance,
- first-player advantage,
- match length,
- Presence economy,
- territory flow,
- card outliers,
- comeback rates.

Do not declare success based on one unusually favorable batch.

---

# PHASE 30 — HUMAN PLAYTEST BUILD

Prepare the project for a new external build.

Target version:

# Frontlines v0.4.0

Before packaging:

- run automated tests,
- run balance simulation,
- confirm live gameplay,
- confirm simulator,
- confirm menus,
- confirm artwork,
- confirm animations,
- confirm sound if present,
- confirm playtest export,
- verify clean launch from packaged build.

Do NOT publish automatically unless the existing project workflow explicitly supports and expects it.

Leave the repository and build in a stable state ready for release.

---

# PHASE 31 — DOCUMENTATION

Update development documentation.

Include:

`SPRINT-003.md`

Document:

- systems created,
- bugs discovered,
- AI problems discovered,
- balance changes,
- original baseline,
- final results,
- remaining concerns,
- recommended Sprint 4 priorities.

Update `BALANCE.md` with current design philosophy and findings.

Preserve historical statistics rather than overwriting them.

---

# PHASE 32 — OPTIONAL STRETCH GOALS

Only begin these after the core sprint is stable.

Potential stretch work:

### Simulation Playback

Visually replay a simulated match at high speed.

### Heatmaps

Display:

- lane activity,
- deployment density,
- territory conflict,
- faction pressure.

### Card Pair Analysis

Identify cards that become unusually strong when played together.

### Deck Archetype Detection

Recognize recurring successful card packages.

### Scenario Testing

Allow developers to begin simulations from specific states.

Example:

Nightwalker trailing by one territory zone on Round 6.

Measure recovery rate.

### AI Personality Debugging

Display what the AI thinks the best actions are and their scores.

These would be extremely valuable but should not jeopardize the core Sprint 3 deliverables.

---

# DO NOT DO THIS SPRINT

Do not prioritize:

- sixth faction,
- campaign mode,
- online multiplayer,
- ranked matchmaking,
- card packs,
- monetization,
- player accounts,
- massive progression system,
- dozens upon dozens of new cards,
- elaborate 3D environments,
- lore expansion at the expense of gameplay,
- complete UI rebuild.

Minor card additions are acceptable only when needed to complete a faction's mechanical identity.

---

# SPRINT COMPLETION REQUIREMENTS

Sprint 3 is considered successful when:

1. The simulator and live game are verified against each other.
2. Simulations can be reproduced using seeds.
3. Full faction matchup data is available.
4. First-player advantage is measured.
5. Presence economy is measurable.
6. Territory progression is measurable.
7. Comeback frequency is measurable.
8. Individual card performance is measurable.
9. AI understands faction-specific priorities better than before.
10. Bruiser's extreme dominance has a documented explanation.
11. Nightwalker and Rogue's extreme underperformance has a documented explanation.
12. At least one evidence-based balance iteration has occurred.
13. Multiple large simulations validate the resulting changes.
14. Historical balance results are preserved.
15. Human playtests can export useful match information.
16. Automated regression testing remains healthy.
17. The project finishes in a stable playable state.
18. A Frontlines v0.4.0 candidate is ready for external playtesting.

---

# FINAL TARGET

Sprint 1 proved Frontlines could work.

Sprint 2 made Frontlines look and feel like a real game.

Sprint 3 should make Frontlines **understandable as a system**.

At the start of this sprint, we know:

"Bruiser wins 98% of simulated games."

At the end of this sprint, we should be able to say:

"We know exactly why factions win, why they lose, how their economies function, how territory moves, how the AI uses them, which cards create problems, how frequently players recover from losing positions, and whether our balance changes actually worked."

The simulator should evolve from:

**a machine that plays thousands of Frontlines matches**

into:

# THE FRONTLINES BALANCE LAB

Future cards, factions, mechanics, and balance changes should all be testable against this foundation.

Do not optimize merely for prettier numbers.

Optimize for a game where all five factions have distinct identities, meaningful strengths and weaknesses, credible counterplay, and legitimate paths to victory.