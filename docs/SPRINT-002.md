# Forge Sprint 002 — battlefield identity and game feel

Project: `C:\Users\noaho\OneDrive\Documents\ChatGPT\Faction Cards`

## Delivered

- Preserved the pure rules engine, committed Presence, seven-territory conquest, Breakthrough, starter decks, and baseline AI.
- Faction-colored territory borders, tinted ground, ownership banners, distinct emblems, a connected city blueprint, and a prominent objective.
- Current battlefield pressure and projected end-turn capture progress; impending conquest warnings in the HUD.
- Twenty graphic-novel military portraits in five role atlases: Rifle, Heavy, Specialist, Commander. Reused across the existing sixty card definitions, thumbnails, hand, deck browser, and inspector.
- Reusable faction style definitions: palette, emblem, equipment/silhouette direction, frame treatment, and ground accent.
- Desktop hand dock beside the board, selected/hover card states, readable affordability, private handoffs, card inspection, and terminology tooltips.
- Deployment flight/materialization, movement cues, class-specific attacks, recoil/hit flashes, damage numbers, casualty dissolution, released-Presence cues, capture sweep/emblem, frontline movement, phase announcements, and a territory victory sequence.
- Animated Presence counters plus capacity/commitment/spending/available breakdown and next-turn growth.
- Public combat/capture feedback queued across hot-seat privacy and replayed on reveal; private hand artwork is never retained for those effects.
- Normal/Fast speed, reduced effects, reduced shake, system reduced-motion support, and optional synthesized local sound with replaceable hooks.
- Optimized WebP runtime assets, original source paintings, exact saved prompt set, editable SVG emblems/map, and organized future audio/effect/animation folders.

## Architecture

The engine commits the legal state immediately. `effects.js` derives presentation events by comparing the previous and next state. No animation completion callback dispatches a game action or changes health, Presence, capture, initiative, or victory.

Transient effects have capped node, timer, animation, and sound counts. New matches, menu return, hidden pages, and privacy transitions cancel live effects. Late callbacks cannot resurrect artwork from an earlier match. Hot-seat replay keeps public battlefield facts and clones plus draw counts; no complete game state, drawn-card identity, or hand artwork is queued. Newly drawn cards animate from the revealed hand.

The five runtime atlases are 1024×1024 and total **1,231,842 bytes**. Original PNGs stay in `assets/source/cards/` and are not loaded during matches. No network assets or external service are required to play.

## Verification

- **48 automated rules, integration, property, art, and effects tests pass.**
- The property test exercises **10,800 decisions**, including 6,958 random decisions, 826 attacks, 510 captures, and 742 death decisions, across all faction pairings and varied configurations.
- **100/100 seeded full conquest matches finish**. Median 24 offensive turns, mean 30.1, range 9–90. First attacker wins 49; first center captor wins 50.
- Browser checks cover fresh `file://` and local HTTP launch, real card/territory/unit button input, a complete conquest match, response/counter flow, victory, rematch, privacy, settings persistence, and 1920/1440/1366/1024px widths.
- Separate presentation checks cover a complete private hot-seat match, new-card animation and public casualty replay after reveal, bounded cleanup, audio replacement hooks, reduced effects, and the actual paced AI.
- A dedicated laptop layout check verifies full five-unit stacks, mirror-faction allegiance markers, and a visible hand dock and End Turn button at 1366×768. The final preview is [saved here](screenshots/frontlines-sprint-2.png).

See [balance checkpoint](BALANCE.md) and [reproducible results](playtest-results.json). Automated matches establish rule robustness and reveal tuning signals; human playtests are still needed to assess whether the tactical choices and presentation feel good.

## Launch

Double-click `Launch Frontlines.cmd`, or open `index.html` directly in a current desktop browser. For the optional development preview, run `npm start` and open `http://127.0.0.1:4173`.

## Known limitations

- Art is shared by role rather than bespoke for all sixty cards. The illustrations and leaders are prototype concepts, not finalized Project Faction canon.
- Orders and Assets use tactical symbols; they do not yet have individual painted illustrations.
- The baseline AI remains simple. Bruiser wins 31 of 32 non-mirror CPU benchmark matches; Nightwalker and Rogue need human matchup testing before the next tuning pass.
- Audio is synthesized placeholder material, not a finished sound library.
- Small screens use a scrolling map/hand layout; the interface is designed for desktop.
- No online multiplayer, campaign, deck builder, Riftwalker abilities, Instability, hidden units, or Infiltrate is added.

## Sprint 3

1. Conduct human hot-seat matches, swapping factions and first attacker; measure match length, reaction interruption cost, recovery, and Bruiser pressure.
2. Confirm faction tuning needs from those matches, then adjust specialist survivability, heavy commitment value, and recovery Orders with focused regression tests.
3. Select approved visual/lore references and replace shared role portraits for a small set of signature units or named Leaders.
4. Replace synthesized audio through the existing adapter and refine event timing from player feedback.
5. Add a guided first-match tutorial and a small number of distinct tactical roles only after the presentation and balance feedback is understood.

## Main additions

`art.js`, `effects.js`, `effects.css`, `assets/cards/`, `assets/source/`, `assets/ui/faction_emblems/`, `assets/battlefield/tactical-city.svg`, `scripts/optimize-art.py`, art/effects/property/browser tests, and the art/balance/sprint documentation. Existing `app.js`, `styles.css`, and `index.html` integrate the presentation layer.
