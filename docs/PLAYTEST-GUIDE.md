# First human playtest

For v0.9.0, launch the native candidate described in the [release guide](RELEASE-0.9.0.md), or use `Launch Frontlines.cmd`. Begin with **Learn Frontlines** or **Tutorial**, then play an ordinary **Easy — Learning** match. The central commands also expose Play, Arsenal, War Room and Settings. Observe whether the tutorial explains both the next action and its purpose without developer coaching. Use Hint, restart, pause, skip and Continue to check recovery. Fullscreen and completion must not remove access to Replay Tutorial.

After onboarding, open Arsenal and inspect one of the original presets or new hybrid templates. Choose **Make editable copy**, name it and replace a few cards using +/− or direct quantities. The **Forge VII** filter shows the 35 new designs; the full pool contains 115 cards. Save a legal **26/26** list, then use **Play this deck** or select it under **Play**. Keep developer mode off, answer optional feedback after conquest and use **Export playtest report**. Share that JSON together with **Export deck** from Arsenal; no account or developer setup is required. Browser/file/native libraries are separate, so import exported decks when moving between them.

Test one same-faction contrast (Bastion/Counteroffensive or Sabotage/Assassination), then a cross-faction contest. Try a hybrid or saved variant and swap first attacker. Record whether the decks required different plans, which cards were always included and whether a strong enemy play had a readable answer. [Sprint 7](SPRINT-007.md) separates automated checks, the completed authorized v0.7.0 baseline and proposed follow-up jobs. That baseline exposed severe faction/preset and first-seat disparity; it does not establish the expanded candidate's balance. Sprint 5's older-rule gate also remains incomplete.

Confirm that ordinary deployment can continue at zero commands with enough Capacity, while attacks, movement and marked major cards require commands. Silencer Team and every Field Options mode now require one command under the current `sprint7` profile. Watch a surviving defender retreat after capture and a blocked/immobile defender be eliminated; ask the tester why each happened. Check visible Capacity/committed Presence, commands, legal targets, end-turn forecast and recent AI activity. Use Settings → Learning & opponents for difficulty, cadence, hints and explanations. See the [release checklist](RELEASE-0.9.0.md#first-session-checklist) for candidate checks.

When the relevant cards appear, test **Mark**, **Reinforce**, **Armor** and **Adapt**. A Mark should improve a positive regular combat hit, then expire when the marked owner's next offensive turn begins. It should not increase direct damage Orders. Reinforce should heal a wounded friendly permanent and protect it through the enemy turn, without stacking with printed Armor; it expires before its owner's next Medic step. Choose Repair, Resupply and Reposition explicitly on Field Options and check that the targets change with the mode. Record whether these decisions and their answers are readable, rather than relying only on which deck wins.

## Check the command interface

1. Open **Settings → Display**. In the Windows app, switch Windowed/Fullscreen or use **F11 / Alt + Enter**. Check the proper monitor, readable cards, visible commands and modal boundaries. Restart later to check remembered display mode. Browser fullscreen uses browser controls.
2. Under **Interface**, compare Normal/Fast animation and reduced motion/effects/shake. Under **Audio**, enable optional effects and adjust volume. Escape closes Settings and returns to the previous screen.
3. Confirm that deck count, legality and composition remain visible in Arsenal. Browse all factions without changing an unsaved deck; try role/strategy/set filters, quantity editing and Undo/Redo. Scroll inside the collection/deck contents and use the fixed Save/Test/Duplicate/Export/Play bar. Leave an unsaved deck and check the discard prompt. Export/import a variant and confirm an illegal draft stays editable with explained errors.
4. During a match, inspect a card and open **Full card briefing**. Verify artwork, rules, keywords and temporary conditions. In compact windows use **Inspect** from the command dock; it should open a modal without covering legal targets during ordinary play. Escape returns to the battlefield without changing state. Choose an Adapt mode and check every command remains inside the dock, clear of the hand.
5. Open **War Room → Quick Matchup** and select your saved deck and an opponent. If you choose to run a deck test, set the total count explicitly and export its results. Explore Overview/Decks/Cards/Economy/Territory. Tournament selects several decks; Advanced exposes profiles, seeds, traces and comparisons. Switching to an older profile should show its original template catalog while preserving your saved expansion decks. This human flow does not authorize an autonomous Codex balance batch; the proposed 10,000-game jobs remain separate decisions.
6. If an installed-build update becomes available, check the unobtrusive available/downloading/ready notice and **Later**. **Restart & update** must wait until no match is active. Do not create a real update solely for a playtest.

Record the screen and window/display scale when a control is clipped, too small, hard to find or unreachable by keyboard. The automated minimum-window/fullscreen checks do not establish comfort for a new human player. Owner/external human sessions have not yet been performed or claimed.

Start with default settings, hot-seat Stonewall versus Bruiser. Keep developer mode off for the first match. Swap factions and who takes the first turn for the second match. Try Rogue versus Nightwalker for the third.

## What to record

| Match | Decks / first attacker | Winner | Turns / minutes | First center capturer | Largest reversal | Confusing moment |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |

After each match, answer:

1. Did gaining ground feel more valuable than trading kills?
2. Was choosing between another deployed unit and leaving Presence for an Order interesting?
3. Did losing units create a real chance to reinforce, or only delay defeat?
4. Was a defender response worth the hot-seat interruption? Were too many prompts automatic passes?
5. Did moving from the center to home conquest stay interesting? If it dragged, where did it slow down?
6. Which card did you always deploy, never deploy, or find impossible to answer?
7. Did you understand which ground could be entered, which unit could attack, and why a card was unaffordable?
8. Could you find Play, your deck, Full card briefing, End Turn and War Room without scrolling the application? Were internal panels and keyboard focus clear?
9. Did the curve, command distribution and card tendencies help you change the deck? Did you understand that AI strategy intent is separate from those tendencies?
10. Could you recognize Mark/temporary Armor and understand why an Adapt mode or target was unavailable? Was there a strategic response to the strongest new card?

## Change one setting at a time

- **Match length:** compare conquest at 7 territories with 6, then 5. Changing this is more interpretable than changing several combat stats at once.
- **Capture pace:** compare threshold 25 with 20 or 30 while keeping all other rules fixed.
- **Occupation versus tactics:** compare 3 actions with 4. More actions help repositioning and combinations but may lengthen each hot-seat turn.
- **Field commitment:** compare Command cap 80 with 60. Note actual Field and Available values before deciding whether the economy needs changing.

Use the same factions and switch first attacker when comparing. Baseline AI results are engineering checks; human decisions are needed to answer whether the moving frontline is fun.

## Reporting a problem

Record the turn, factions, objective, selected card, intended action, and visible message. The match log and developer state inspector help diagnose a rules problem. State exports include both hands and decks, so inspect them after the match if hand privacy matters.

## Sprint 8 ownership boundary

Collection progression applies to human Play. The AI, Node simulator, Worker and offline fallback use the complete legal pool without opening packs, charging Credits or awarding mastery. An incomplete owned collection never alters a simulation deck or result. No new large campaign is authorized. See [Sprint 8](SPRINT-008.md#exact-simulation-request-for-ryken--not-executed) for the exact separately authorized follow-up request.
