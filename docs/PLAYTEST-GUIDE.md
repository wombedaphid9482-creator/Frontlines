# First human playtest

For v0.6.0, launch the native candidate or `Launch Frontlines.cmd`. The command menu puts **Play**, **Arsenal**, **War Room** and **Settings** in the main viewing area. Open Arsenal, inspect a preset, make an editable named copy and change a few cards. Save the deck, then use **Play this deck** or select it under **Play**. Keep developer mode off, answer optional feedback after conquest, and use **Export playtest report**. Share that JSON together with **Export deck** from Arsenal; no account or developer setup is required. Browser/file/native local libraries are separate, so import exported decks when moving between them.

Test one same-faction contrast (Bastion/Counteroffensive or Sabotage/Assassination), then a cross-faction contest. Swap first attacker. Record whether the decks required different plans, which cards were always included, and whether a strong enemy play had a readable answer. The [Sprint 5 report](SPRINT-005.md) separates automated validation, the competitive release gate and human evidence. The frozen 50,000-match v0.5.0 baseline fails the new gate; final tuning is not established by a polished interface.

## Check the command interface

1. Open **Settings → Display**. In the Windows app, switch Windowed/Fullscreen or use **F11 / Alt + Enter**. Check the proper monitor, readable cards, visible commands and modal boundaries. Restart later to check remembered display mode. Browser fullscreen uses browser controls.
2. Under **Interface**, compare Normal/Fast animation and reduced motion/effects/shake. Under **Audio**, enable optional effects and adjust volume. Escape closes Settings and returns to the previous screen.
3. Confirm that deck count, legality and composition remain visible in Arsenal. Scroll within the collection/deck contents rather than the whole page; use the fixed Save/Test/Duplicate/Export/Play bar. Leave an unsaved editable deck and check the discard prompt.
4. During a match, inspect a card and open **Full card briefing**. Verify artwork, rules and keywords; Escape returns to the battlefield without changing game state. Check the hand, Presence, objective and contextual command area in both display modes.
5. Open **War Room → Quick Matchup**, select your saved deck and an opponent, choose a small count, then run. Explore Overview/Decks/Cards/Economy/Territory. Tournament lets you choose several decks; Advanced opens profiles, seeds, traces and comparisons when wanted.
6. If an installed-build update becomes available, check the unobtrusive available/downloading/ready notice and **Later**. **Restart & update** must wait until no match is active. Do not create a real update solely for a playtest.

Record the screen and window/display scale when a control is clipped, too small, hard to find or unreachable by keyboard. The automated minimum-window/fullscreen checks do not establish comfort for a new human player. Owner/external human sessions have not yet been performed or claimed.

Start with default settings, hot-seat Stonewall versus Bruiser. Keep developer mode off for the first match. Swap factions and who takes the first turn for the second match. Try Rogue versus Nightwalker for the third.

## What to record

| Match | Factions / first attacker | Winner | Turns / minutes | First center capturer | Largest reversal | Confusing moment |
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

## Change one setting at a time

- **Match length:** compare conquest at 7 territories with 6, then 5. Changing this is more interpretable than changing several combat stats at once.
- **Capture pace:** compare threshold 25 with 20 or 30 while keeping all other rules fixed.
- **Occupation versus tactics:** compare 3 actions with 4. More actions help repositioning and combinations but may lengthen each hot-seat turn.
- **Field commitment:** compare Command cap 80 with 60. Note actual Field and Available values before deciding whether the economy needs changing.

Use the same factions and switch first attacker when comparing. Baseline AI results are engineering checks; human decisions are needed to answer whether the moving frontline is fun.

## Reporting a problem

Record the turn, factions, objective, selected card, intended action, and visible message. The match log and developer state inspector help diagnose a rules problem. State exports include both hands and decks, so inspect them after the match if hand privacy matters.
