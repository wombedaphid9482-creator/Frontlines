# FRONTLINES — SPRINT 5
## Command Interface, Competitive Stabilization, Fullscreen & Game-Shell Overhaul

### TARGET VERSION

# Frontlines v0.6.0

---

# CURRENT PROJECT STATE

Frontlines currently contains:

- five playable factions,
- territorial Presence-based gameplay,
- faction-specific mechanics,
- card artwork and battlefield presentation,
- AI opponents,
- custom deckbuilding,
- saved decks,
- faction archetypes,
- an expanded Arsenal,
- the Balance Lab,
- large-scale automated simulations,
- card/deck analytics,
- external Windows builds,
- GitHub Releases,
- and automatic update infrastructure.

Frontlines is now mechanically substantial.

The next major problem is presentation and cohesion.

The project still contains several behaviors that make it feel like:

**a sophisticated web application running inside Electron**

rather than:

**a native-feeling PC strategy/card game.**

Sprint 5 should aggressively address that.

At the same time, faction balance must become a formal release requirement rather than an informal goal.

---

# PRIMARY SPRINT GOALS

Sprint 5 has four primary objectives:

## 1. Competitive stabilization

Bring all five factions into a tightly grouped competitive range.

## 2. Game-like navigation

Remove webpage-like navigation and unnecessary vertical scrolling.

## 3. Command-oriented visual interface

Make buttons, menus, navigation, and major actions more visually prominent and satisfying.

## 4. Proper fullscreen support

Frontlines should work naturally as a fullscreen PC game.

---

# PART I — BALANCE RELEASE GATE

Balance is now a formal development requirement.

Large simulation runs should target:

# NO FACTION BELOW 45% OR ABOVE 55%

Additionally, the preferred final balance target is:

# HIGHEST FACTION WIN RATE − LOWEST FACTION WIN RATE ≤ 5 PERCENTAGE POINTS

Example:

Acceptable preferred cluster:

- Stonewall 48.2%
- Bruiser 52.1%
- Syndicate 49.4%
- Nightwalker 51.3%
- Rogue 49.0%

Spread:

52.1 − 48.2 = 3.9 percentage points.

This is healthier than:

- 45%
- 55%
- 46%
- 54%
- 50%

even though all five technically fall within 45–55.

The desired competitive ecosystem should cluster relatively tightly around 50%.

---

# PHASE 1 — ESTABLISH NEW BASELINE

Sprint 4 introduced:

- expanded card pools,
- custom decks,
- archetypes,
- new keywords,
- deck-aware AI.

Therefore, old faction percentages must NOT automatically be treated as current truth.

Begin Sprint 5 by running a fresh baseline.

Minimum:

# 50,000 MATCHES

Use:

- current v0.5.0 rules,
- current Arsenal,
- current AI,
- current balance profile,
- representative archetype decks,
- paired seating where appropriate.

Record:

- faction win rates,
- deck win rates,
- archetype win rates,
- matchup matrix,
- first-player advantage,
- average match length,
- Presence economy,
- territory progression,
- card usage,
- card efficiency.

Preserve this as:

`docs/balance/sprint5-baseline-*`

---

# PHASE 2 — INVESTIGATE EXTREME CARDS FIRST

Do not immediately change faction-wide values when a specific card may be responsible.

Previous simulation results identified Nightwalker's:

# SILENT BLADE

as a particularly suspicious card.

It previously appeared approximately 79,000 times across a 50,000-game simulation dataset while Nightwalker substantially overperformed.

Re-evaluate Silent Blade under the current Arsenal environment.

Track:

- times drawn,
- times played,
- plays per Nightwalker match,
- win rate when drawn,
- win rate when played,
- win rate when played multiple times,
- average turn played,
- Presence efficiency,
- kills,
- territorial swing after deployment,
- AI priority,
- matchup-specific performance,
- performance in different Nightwalker archetypes.

If Silent Blade remains an extreme outlier, fix the actual problem rather than broadly weakening Nightwalker.

---

# PHASE 3 — BALANCE ITERATION LOOP

Use a disciplined balance loop.

For each meaningful change:

1. State hypothesis.
2. Make minimal targeted change.
3. Run approximately 10,000 simulations.
4. Compare results.
5. Retain or revert.
6. Document finding.

Do not change twenty unrelated cards simultaneously unless there is a clear systemic reason.

Use larger:

# 50,000-match validation runs

for major checkpoints.

---

# PHASE 4 — BALANCE PRIORITY ORDER

When diagnosing imbalance, investigate in this order:

1. Bugs
2. AI misunderstanding
3. Single-card outliers
4. Broken card combinations
5. Presence efficiency
6. Territory conversion efficiency
7. Deck/archetype imbalance
8. Faction mechanic imbalance
9. Individual stat tuning
10. Broad faction buffs/nerfs

Do not begin with faction-wide stat changes unless evidence supports them.

---

# PHASE 5 — ARCHETYPE BALANCE

Faction balance alone is no longer enough.

Each faction now contains multiple archetypes.

Track each archetype separately.

Avoid situations where:

Faction overall win rate = 50%

but:

Archetype A = 67%

Archetype B = 33%

That is not healthy balance.

Aim for viable strategic diversity within each faction.

Some matchup advantage is acceptable.

Extreme near-auto-win archetypes are not.

---

# PHASE 6 — PLAYER-FACING WAR ROOM

Preserve the Balance Lab.

Do NOT remove it.

However, split its identity conceptually into:

## WAR ROOM

Player-facing simulation and analysis.

Allow players to explore:

- deck vs deck,
- faction matchups,
- archetype comparisons,
- simulated tournaments,
- card usage,
- approximate matchup percentages.

Make this visually understandable.

Avoid overwhelming ordinary players with engineering data.

---

## DEVELOPER BALANCE LAB

Retain advanced diagnostics such as:

- seeds,
- confidence intervals,
- AI decision traces,
- rule snapshots,
- balance profiles,
- debug logs,
- raw Presence efficiency,
- regression comparison.

Developer information can exist behind:

`Advanced`

or

`Developer View`

rather than dominating the normal War Room.

---

# PART II — GAME SHELL OVERHAUL

Frontlines should stop behaving visually like a webpage.

This is a major Sprint 5 objective.

---

# PHASE 7 — FIXED GAME VIEWPORT

The primary application shell should use the available game window rather than extending vertically like a website.

General objective:

# MAJOR SCREENS SHOULD FIT WITHIN THE ACTIVE VIEWPORT

Avoid requiring the player to scroll down to discover:

- navigation,
- primary actions,
- game modes,
- settings,
- deckbuilder controls,
- simulator controls.

Use:

- panels,
- tabs,
- drawers,
- sidebars,
- modal overlays,
- paginated/card-grid content,
- fixed command bars.

Do NOT simply hide scrollbars while leaving content inaccessible.

Redesign screens to properly fit.

---

# PHASE 8 — SCROLLING RULE

Scrolling is not banned completely.

It is appropriate inside bounded content containers such as:

- card collections,
- long deck lists,
- match history,
- logs,
- detailed statistics.

But the APPLICATION ITSELF should not behave like one long scrolling webpage.

Bad:

Scroll from title  
↓  
buttons  
↓  
game mode  
↓  
deck options  
↓  
settings  
↓  
footer

Good:

Fixed game shell with clearly selectable screens.

---

# PHASE 9 — MAIN MENU REDESIGN

Create a proper game-oriented home screen.

Suggested primary actions:

# PLAY

# ARSENAL

# WAR ROOM

# SETTINGS

Possibly:

# QUIT

These should feel like major navigation controls rather than small HTML buttons.

Do not place every important interaction in a thin strip along the top edge.

The player's attention should naturally land on the major actions.

---

# PHASE 10 — COMMAND BUTTON DESIGN

Buttons should become:

- slightly larger,
- visually stronger,
- easier to identify,
- more satisfying to hover,
- more satisfying to click.

Primary actions should carry stronger visual hierarchy than secondary actions.

Use:

- larger hitboxes,
- stronger typography,
- clear hover transitions,
- pressed state,
- subtle motion,
- faction/game styling,
- iconography where appropriate.

Avoid generic browser-button aesthetics.

---

# PHASE 11 — BUTTON HIERARCHY

Define visual button levels.

## PRIMARY

Examples:

Start Match  
Save Deck  
Run Simulation  
Confirm

Largest emphasis.

---

## SECONDARY

Examples:

Edit  
Duplicate  
Inspect  
Change Deck

Moderate emphasis.

---

## TERTIARY

Examples:

Back  
Cancel  
Advanced options

Lower emphasis.

---

## DESTRUCTIVE

Examples:

Delete Deck  
Reset Data

Clearly distinct.

Do not use the same visual weight for every button.

---

# PHASE 12 — NAVIGATION TRANSITIONS

Switching screens should feel deliberate.

Potential transitions:

- subtle fade,
- lateral panel shift,
- tactical scan effect,
- brief command-console animation.

Keep transitions fast.

Target roughly:

150–300ms

Do not slow players down for cinematic effect.

Respect reduced-motion accessibility settings.

---

# PHASE 13 — SCREEN ARCHITECTURE

Create a coherent navigation model.

Suggested:

MAIN MENU

→ PLAY  
→ ARSENAL  
→ WAR ROOM  
→ SETTINGS

Inside PLAY:

- match setup,
- faction,
- deck,
- opponent/mode,
- start.

Inside ARSENAL:

- deck list,
- deck editor,
- card collection,
- card inspector.

Inside WAR ROOM:

- quick simulations,
- matchup matrix,
- tournaments,
- advanced Balance Lab.

Inside SETTINGS:

- graphics/display,
- fullscreen,
- audio,
- interface,
- advanced.

Avoid forcing navigation through browser-like top links.

---

# PART III — FULLSCREEN

Fullscreen should become a first-class PC feature.

---

# PHASE 14 — TRUE FULLSCREEN SUPPORT

Implement Electron fullscreen through BrowserWindow APIs.

Required behavior:

# F11

Toggle fullscreen.

Also support:

# ALT + ENTER

if practical and conflict-free.

Use true Electron fullscreen rather than CSS pretending to be fullscreen.

The application should properly use:

`BrowserWindow.setFullScreen(true/false)`

or equivalent appropriate architecture.

---

# PHASE 15 — VISIBLE FULLSCREEN CONTROL

Settings should include:

DISPLAY MODE

- Windowed
- Fullscreen

If borderless fullscreen is later added, it may become:

- Windowed
- Borderless
- Fullscreen

But do not build unnecessary complexity if native fullscreen is sufficient.

---

# PHASE 16 — FULLSCREEN UX

Fullscreen should:

- fill the proper monitor,
- remove normal window chrome,
- resize UI correctly,
- preserve usable card proportions,
- keep modals visible,
- avoid clipped controls,
- correctly resize the battlefield,
- correctly resize Arsenal,
- correctly resize War Room.

The interface must respond to different monitor sizes.

Do not assume 1920×1080 only.

---

# PHASE 17 — FULLSCREEN STATE

If practical, remember the player's previous display preference.

Example:

Player closes Frontlines while fullscreen.

Next launch:

Frontlines restores fullscreen.

Provide a sensible recovery mechanism if display configuration becomes invalid.

---

# PHASE 18 — ESCAPE BEHAVIOR

ESC should not unexpectedly close the application.

Context-sensitive behavior:

Modal open:
ESC closes modal.

Card enlarged:
ESC closes card inspection.

Submenu open:
ESC returns.

Fullscreen with no overlay:
do NOT necessarily force exit from fullscreen unless this is deliberately chosen.

F11 should remain the explicit fullscreen toggle.

---

# PHASE 19 — WINDOWED EXPERIENCE

Windowed mode should still work well.

Minimum window dimensions must prevent unusable layouts.

Existing approximate minimum:

900×600

can be reviewed.

Prevent:

- overlapping panels,
- cropped text,
- disappearing buttons,
- inaccessible controls.

---

# PART IV — BATTLEFIELD GAME UX

---

# PHASE 20 — MAKE THE MATCH SCREEN FEEL LIKE THE CENTERPIECE

The battlefield should dominate the interface.

Avoid surrounding gameplay with excessive browser-like controls.

Prioritize:

- battlefield,
- hand,
- Presence,
- territory,
- turn information,
- critical actions.

Secondary information should move into:

- collapsible panels,
- tooltips,
- inspection overlays.

---

# PHASE 21 — CARD HAND RESPONSIVENESS

Ensure card hand presentation adapts to fullscreen and windowed modes.

Cards should:

- remain readable,
- avoid overflowing the screen,
- expand when inspected,
- compress intelligently when hand size grows.

Do not rely on page scrolling to access hand contents.

Use:

- horizontal organization,
- controlled overlap,
- carousel behavior,
- or another game-like solution.

---

# PHASE 22 — MATCH COMMAND AREA

Create a visually clear command area.

Important actions should not hide among text.

Potential actions:

END TURN  
PASS  
RESPOND  
CONFIRM TARGET

Use contextual availability.

Do not show irrelevant commands constantly.

---

# PHASE 23 — INFORMATION DENSITY

Reduce unnecessary text permanently visible during gameplay.

Move explanatory information into:

- hover tooltips,
- inspect actions,
- codex/help overlay.

Game state should remain readable at a glance.

---

# PART V — ARSENAL UX

---

# PHASE 24 — ARSENAL AS A GAME SCREEN

The Arsenal should feel like a deckbuilding room/interface, not a webpage form.

Suggested composition:

LEFT:
Saved decks / deck selection

CENTER:
Card collection

RIGHT:
Selected card / deck details

BOTTOM OR FIXED COMMAND AREA:
Save / Test / Duplicate / Export

The exact layout may adapt responsively.

Avoid requiring the entire page to scroll.

---

# PHASE 25 — CARD COLLECTION NAVIGATION

Large card collections should use controlled internal navigation.

Options:

- internal grid scroll,
- pages,
- faction/type tabs,
- filters,
- search.

Scrolling inside the card collection itself is acceptable.

Scrolling the entire app is not the desired primary navigation pattern.

---

# PHASE 26 — DECK SUMMARY

Keep important deck information persistently visible:

- card count,
- legality,
- Presence curve,
- faction,
- archetype indication,
- average cost.

Do not force players to scroll back to the top to check deck status.

---

# PART VI — WAR ROOM UX

---

# PHASE 27 — WAR ROOM HOME

Create a simplified player-facing landing screen.

Prominent actions:

# QUICK MATCHUP

Select two decks and simulate.

# TOURNAMENT

Run multiple decks against each other.

# FACTION OVERVIEW

View broad faction performance.

# ADVANCED LAB

Open detailed developer-style analytics.

---

# PHASE 28 — SIMULATION RESULTS PRESENTATION

Do not present every metric as a giant vertical HTML report.

Use:

- tabs,
- panels,
- charts,
- matchup matrix,
- cards,
- expandable details.

Example result tabs:

OVERVIEW  
MATCHUPS  
CARDS  
ECONOMY  
TERRITORY  
ADVANCED

This greatly reduces webpage feel.

---

# PART VII — SETTINGS

---

# PHASE 29 — REAL SETTINGS SCREEN

Create or improve a proper Settings interface.

At minimum:

## DISPLAY

Fullscreen  
Resolution/window behavior if relevant  
UI scale if practical

## INTERFACE

Reduced motion  
Animation speed  
Screen shake

## AUDIO

If audio systems exist:
Master volume  
Effects volume

## ADVANCED

Developer options  
Balance Lab advanced mode

---

# PART VIII — AUTO-UPDATE USER EXPERIENCE

The auto-update infrastructure now exists.

Make it player-friendly.

---

# PHASE 30 — UPDATE FEEDBACK

Do not silently behave unpredictably.

Provide non-intrusive feedback when appropriate:

`Frontlines update available`

`Downloading v0.6.0...`

Then:

`Update ready — restart Frontlines to install.`

Allow:

# RESTART & UPDATE

and:

# LATER

Do not interrupt active matches.

Never force-restart during gameplay.

---

# PHASE 31 — VERSION DISPLAY

Show current version somewhere subtle.

Example:

Settings / About:

`Frontlines v0.6.0`

This makes playtest reports easier to understand.

---

# PART IX — POLISH

---

# PHASE 32 — UI CONSISTENCY PASS

Standardize:

- button heights,
- typography,
- margins,
- panel radius,
- borders,
- icon scale,
- selected states,
- hover states,
- disabled states,
- animation timing.

The game should stop looking like screens built during different sprints.

---

# PHASE 33 — GAME IDENTITY

Use the existing Frontlines identity consistently.

Favor:

- tactical command-console feel,
- military interface language,
- faction identity,
- restrained tactical visual effects.

Avoid turning everything into generic sci-fi neon.

The interface should support the battlefield rather than overpower it.

---

# PHASE 34 — RESPONSIVE TEST MATRIX

Test at minimum:

1920×1080 fullscreen  
2560×1440 fullscreen if environment permits  
1366×768  
1280×720  
minimum supported window

Also test Windows display scaling where practical.

Verify:

- menu,
- battlefield,
- Arsenal,
- War Room,
- Settings.

---

# PART X — TESTING

---

# PHASE 35 — AUTOMATED UI TESTS

Expand tests for:

- screen navigation,
- fullscreen toggle logic,
- settings persistence,
- deckbuilder layout state,
- War Room navigation,
- updater UI state where feasible,
- ESC behavior.

Do not remove existing regression tests.

---

# PHASE 36 — SMOKE TEST

Packaged build smoke testing must verify:

- launch,
- main menu,
- game,
- Arsenal,
- War Room,
- fullscreen toggle,
- return navigation,
- quit.

---

# PHASE 37 — HUMAN TEST

Perform an actual human-oriented flow:

Launch Frontlines.

Enter fullscreen.

Navigate:

MAIN MENU  
→ ARSENAL  
→ choose deck  
→ PLAY  
→ complete or begin match  
→ return  
→ WAR ROOM  
→ run simulation  
→ SETTINGS  
→ exit fullscreen  
→ quit

This should feel coherent without browser navigation habits.

---

# PART XI — FINAL BALANCE VALIDATION

Once gameplay changes are stable:

Run another:

# 50,000 MATCH VALIDATION

Release gate:

- no faction below 45%
- no faction above 55%
- target total faction spread ≤5 percentage points
- no obviously dominant archetype
- no catastrophic matchup
- no major first-player bias
- no single card producing unexplained extreme performance

If these targets are not reached:

continue targeted balance iteration before declaring Sprint 5 complete.

Do not fake success by suppressing statistics.

Document remaining deviations.

---

# PART XII — RELEASE

Prepare:

# FRONTLINES v0.6.0

Update:

`package.json`

release documentation

Balance Lab version metadata

auto-updater metadata

GitHub release notes

Do not automatically release an unstable build.

Leave a validated packaged release candidate.

---

# SPRINT 5 COMPLETION REQUIREMENTS

Sprint 5 is complete when:

1. A fresh post-Arsenal balance baseline exists.
2. Silent Blade and other major card outliers have been investigated.
3. All factions are between approximately 45–55%.
4. Preferred faction spread is ≤5 percentage points where achievable through evidence-based tuning.
5. Archetype balance has been reviewed.
6. Main navigation no longer behaves like a scrolling webpage.
7. Major screens fit the active game viewport.
8. Primary buttons are larger and visually stronger.
9. Important actions are not hidden at the top of long screens.
10. A proper game-style main menu exists.
11. Arsenal feels like a game interface rather than a webpage.
12. War Room provides a cleaner player-facing version of Balance Lab functionality.
13. Advanced Balance Lab functionality remains available.
14. True Electron fullscreen works.
15. F11 toggles fullscreen.
16. Alt+Enter works if safely practical.
17. Fullscreen state can persist if practical.
18. Windowed layouts remain usable.
19. Battlefield UI scales correctly.
20. Auto-update status is presented cleanly.
21. Updates never interrupt an active match.
22. Existing automated tests continue passing.
23. UI/navigation regression tests exist.
24. A stable v0.6.0 release candidate is produced.

---

# STRETCH GOALS

Only after all core requirements are stable.

## UI SCALE

Allow:

80%  
90%  
100%  
110%  
125%

Useful for different monitors.

---

## BORDERLESS WINDOWED

Add:

Windowed  
Borderless  
Fullscreen

only if implementation is stable.

---

## KEYBOARD NAVIGATION

Support useful shortcuts:

F11 — Fullscreen

ESC — Back/close overlay

Ctrl+S — Save deck while in Arsenal

Space or Enter — contextual confirmation where safe

Do not create shortcuts that trigger destructive actions accidentally.

---

## CONTROLLER FOUNDATION

Do not implement full controller support unless practical.

But structure menus so future controller navigation is possible:

clear focus order  
large targets  
directional navigation concepts

---

## MENU AUDIO

Subtle:

hover  
select  
back  
confirm

sounds can improve the game feel substantially.

Do not use obnoxious constant audio.

---

## WAR ROOM TOURNAMENT PRESENTATION

Turn round-robin deck simulation into a polished tournament board.

Allow players to watch:

- rankings,
- matchup records,
- deck performance.

This could become a distinctive Frontlines feature.

---

# DO NOT PRIORITIZE THIS SPRINT

Do not prioritize:

- sixth faction,
- giant new card expansion,
- campaign,
- ranked multiplayer,
- monetization,
- card unlocking/grinding,
- accounts,
- cosmetics marketplace,
- lore database overhaul.

Sprint 5 is about:

# TURNING THE EXISTING GAME INTO A COHESIVE PC GAME EXPERIENCE.

---

# FINAL TARGET

Before Sprint 5:

Frontlines is a powerful game system presented through interfaces that still reveal its browser origins.

After Sprint 5:

The player launches Frontlines.

The game opens into a deliberate command interface.

Large clear controls present:

PLAY  
ARSENAL  
WAR ROOM  
SETTINGS

The player presses F11.

Frontlines fills the display properly.

There is no giant webpage to scroll down.

Navigation happens through purposeful game screens.

The battlefield owns the screen when fighting.

The Arsenal owns the screen when building.

The War Room owns the screen when analyzing.

And behind all of it, tens of thousands of simulated battles continuously keep the five factions within a tightly controlled competitive ecosystem.

Sprint 5 should be the point where someone seeing Frontlines for the first time stops thinking:

"Ry built a really impressive web card game."

and starts thinking:

# "Ry is making a PC strategy game."