# Project Faction: Frontlines

**Frontlines v0.6.0 — Command Interface candidate.**

Fight for territory. Commit Presence. Push the frontline into enemy ground.

The command menu puts **Play**, **Arsenal**, **War Room** and **Settings** in the main viewing area. The game, deckbuilder and simulator fit the active viewport, with scrolling inside bounded collections, lists and statistics. Primary actions stay visible in command bars rather than depending on small top links. Territory, Presence, private hands and the shared authoritative engine remain the foundation.

Competitive validation is a release gate: every faction must fall within **45–55% against other factions**, with a preferred highest-to-lowest spread of **at most 5 percentage points**, and archetype gaps must be reviewed separately. Same-faction deck variants are measured separately so forced 50% faction contributions cannot compress the spread. The fresh frozen v0.5.0 baseline completed 50,000 matches with zero errors/cutoffs but failed: Nightwalker **66.138%**, Rogue **32.472%** against other factions (all-appearance figures were 64.346% / 34.419%). Final Sprint 5 validation is still in progress; UI completion does not establish competitive balance. See [Sprint 5 status](docs/SPRINT-005.md) and [the preserved investigation](docs/balance/sprint5-iteration-notes.md).

## Command interface and display

Use **Play** for faction/deck/opponent setup; **Arsenal** to build or inspect a deck; **War Room** to test decks; and **Settings** for display, interface and audio. Native menu commands use the same window and navigation routes. Escape closes a modal or inspection, or returns from a submenu; it does not quit the application or serve as the fullscreen toggle.

The Windows app uses true native fullscreen through **F11** or **Alt + Enter**. Settings also offers **Windowed / Fullscreen**. The app remembers display mode and normal window bounds, and recovers off-screen bounds on a changed monitor. Browser launch uses browser fullscreen. Settings includes Normal/Fast animation, reduced motion/effects, reduced shake, optional sound, and master/effects volume; system reduced motion remains respected.

Installed-build update feedback provides available/downloading/ready status, **Later**, and **Restart & update**. Downloading an update never restarts a match. Installation requires a ready update and no active match in any game window; updates are unavailable in a plain browser. See the [v0.6.0 release guide](docs/RELEASE-0.6.0.md) for candidate packaging and validation status.

## Arsenal and custom decks

Open **Arsenal** from the command menu, the native menu, or **Launch Arsenal.cmd**. All 80 cards are available: five preserved starters, two archetype presets per faction, and a local library of named custom decks. The viewport contains deck selection/contents, the card collection and inspection, plus a persistent composition summary and **Save / Test in War Room / Duplicate / Export / Play** command bar. Inspect artwork/rules, filter and sort cards, add/remove copies, review Presence/type curves, save variants and exchange lightweight JSON. Invalid decks remain editable drafts with explained warnings. Unsaved edits prompt before navigation; **Ctrl + S** saves an editable deck or draft.

Build exactly 26 cards from one faction, with at most four copies of a regular card and two of a Leader. Unique still limits deployed Leaders. Select the actual saved deck for each side before a match; rematches and exported playtest reports retain its exact list. See [deckbuilding guide](docs/DECKBUILDING.md), [card design and counterplay](docs/arsenal/CARD-DESIGN.md), and [keyword rules](docs/KEYWORDS.md).

Retaliate, Sabotage and Scavenge use the same engine in live matches and simulations. Updated terrain includes command fortifications, cargo yards, factories, river crossings and transit landmarks. New cards use coherent representative faction portraits.

## War Room and Advanced Balance Lab

Open **War Room** inside the game, **Test in War Room** from Arsenal, **Launch Simulator.cmd**, or **simulator.html**. Player access remains available inside Frontlines, as requested by the owner on October 2. AI-versus-AI matches use the same rules engine, without battlefield artwork, animation or turn delays; no admin access is required.

The landing commands are **Quick Matchup**, **Tournament**, **Faction Overview** and **Advanced Lab**. Choose starter, preset or saved decks and the **total simulation count**. Tournament uses checkboxes to select a deck pool. **Run / Pause / Resume / Stop** remain in the fixed command bar. Overview, Decks, Cards, Economy and Territory use bounded result tabs; player summaries show approximate deck rates and sample counts.

**Advanced view** retains profiles, AI policies, seeds, rule overrides, safeguards, diagnostic thresholds, confidence intervals, match traces, regression/named-variant comparison and JSON/CSV exports. Player entry defaults to the current game profile and deck-aware AI. Advanced experiments stay labeled when viewed through the simpler results UI. An experiment does not alter live rules or a saved deck.

Baseline, faction-aware, random and deck-aware policies are selectable. Reports snapshot custom lists, so local edits cannot change a replay. Compare older reports or named deck variants. Timeouts/errors remain separate from victories. Card/pair associations and AI rates require human validation before competitive balance claims.

The optional HTTP preview uses a background worker. Direct offline launch uses a cooperative runner that yields to the browser, so controls remain responsive. For larger headless batches with Node:

```text
npm run simulate -- --count 1000 --a stonewall --b bruiser --seed 1009 --out test-results/sim-report.json --csv
```

That CLI example uses historical baseline defaults. Specify the current profile with `--balance` and use `--ai deck` to match a player War Room experiment; Advanced view and report options identify its profile. Use `--pool archetypes` for the ten-preset tournament.

See the [War Room guide](docs/SIMULATOR.md), [game roadmap](docs/GAME-ROADMAP.md), and [simulator roadmap](docs/SIMULATOR-ROADMAP.md) for the workflow and next implementation stages.

## Battlefield and card presentation

The seven-zone battlefield has faction-colored ground, banners, a connected tactical city map, an advancing objective, and an explicit end-turn capture forecast. The desktop hand sits beside the board so selecting a card and deploying it does not require scrolling between them.

Five optimized faction atlases supply twenty illustrated Rifle, Heavy, Specialist, and Commander concepts. The eighty card definitions share this role-based art foundation. Card frames, emblems, battlefield accents, and unit thumbnails identify factions consistently.

Deployment, movement, combat, damage, destruction, Presence changes, drawing, capture, and victory have short presentation cues. Rifle bursts, Heavy impacts, specialist tracers, and commander effects differ. Hot-seat transfers remove private hand content immediately and replay only public battlefield events after reveal.

**Settings** provides Normal/Fast animation, reduced effects, reduced screen shake, and optional sound. Sound defaults to off and uses local synthesized placeholders. System reduced-motion preferences are respected. Animation never changes the authoritative game state.

## Launch

Double-click **Launch Frontlines.cmd**, or open **index.html** in a current desktop browser. No installation, account, internet connection, build, or server is required. All fonts, symbols, game data, rules, and styles are local.

Optional development server with Node 18 or newer:

```text
npm start
```

Open `http://127.0.0.1:4173`. The optional server binds to this computer only. To stop it, press Ctrl+C.

## First match

1. Choose **Play** from the command menu, then select a faction and actual deck for each side. Stonewall versus Bruiser is a useful first matchup.
2. Start a local hot-seat game. Pass the computer when prompted and reveal your hand when ready. You can instead select a deck-aware AI opponent for player 2.
3. Select a Unit or Leader in your hand, then a highlighted controlled territory to deploy it. The controlled territory closest to the orange objective is usually a useful staging area.
4. Select a deployed unit and move it one adjacent territory toward the objective. Movement takes an action and normally exhausts the unit. Units can move immediately after deployment; only Rush units can attack on the turn they deploy.
5. Attack an enemy in the same territory with a ready unit. The defender may pass, use a defensive Order, or intercept with a ready Guard. A played response gives the attacker one counter opportunity, then the engagement resolves.
6. End your offensive turn. Your surviving cards in the orange objective contribute their printed Presence. Enemies do not block this contribution. Reach the capture threshold to claim the ground and push the objective toward the enemy home.
7. Take the opponent's home to win. The setup balance controls also support shorter five- or six-territory victories.

## Presence

```text
Available = Command − Field commitment − temporary spending
```

Command starts at 20 and grows by 10 on each subsequent offensive turn, up to 80 by default. Your opponent follows their own progression. Permanent cards occupy their printed `P` while deployed; destroying or returning them to hand frees that commitment. Orders stay spent until their owner's next offensive turn, including Orders played as the responder. A lost army therefore leaves more room for reinforcements without a bonus for losing.

At the end of your offensive turn, all of your surviving permanent cards at the objective add their printed `P` to your capture progress. Both sides track progress separately. The default threshold is 25. Capture resets the engagement's progress and moves the objective one territory toward the opponent. A defender who completes capture of their own contested ground pushes the objective back.

**Breakthrough:** after capture, the capturing side's surviving mobile army (Units and Leaders) advances one adjacent territory into the new objective, filling available friendly positions in deployment order. Damage and readiness carry over. Assets and any overflow stay behind. This brings the two forces into contact and prevents a passive loop of each army repeatedly securing its own separate ground.

## Core rules

- Three major actions per offensive turn. Deployment, movement, attacking, and action Orders each cost one.
- Five permanent-card positions per player per territory; Assets occupy a position too.
- Deploy into controlled territory. Move one adjacent step into controlled territory or the objective. A survivor stranded beyond a shifted frontline can fall back toward it.
- A unit must be ready to move or attack. A normal move or attack exhausts it. Mobile preserves readiness for its first move each turn, but still spends an action.
- Combat is simultaneous; damage persists. Exhausted defenders still deal their Attack in combat.
- Reactions and counters spend Presence but no major actions. There is only one defender response and one attacker counter.
- A unique Leader can have only one copy deployed per player.
- At the start of your offensive turn, your cards ready, temporary spending refreshes, and you draw. When the deck is empty, the discard pile shuffles back as reserves. If both are empty, drawing is skipped safely.
- Breakthrough moves the capturing army into the next objective. Move reserves and stranded survivors up with regular actions; Assets stay fixed.
- The game stops accepting normal actions after victory; rematch starts a fresh shuffled match.

The in-game field manual explains card keywords and faction mechanics.

## Five starter factions

| Faction | Prototype approach |
| --- | --- |
| Stonewall | Guards, fortified defenders, healing, and durable occupation. |
| Bruiser | Heavy troops, immediate assault, and wounded-unit aggression. |
| The Syndicate | Card access, temporary enemy Presence disruption, and counter-orders. |
| Nightwalker | Precise low-Presence killers, bypassing Guard, and ambush responses. |
| Rogue | Mobile troops, rallying, and extracting troops to free commitment. |

Each starter deck contains 26 cards including duplicates. Leaders use editable role titles; these cards are prototype content, not new permanent character canon.

## Developer tools and verification

Enable developer mode in setup to expose testing controls and the optional both-hands view. Setup balance controls include Command, growth, cap, capture threshold, draw, opening hand, slots, action count, and victory count. Settings persist in localStorage when the browser permits it; a storage failure does not prevent play.

```text
npm test
npm run playtest
```

Tests use Node's built-in test runner and require no npm install. The playtest script runs seeded AI matches across all faction pairings, checks card conservation and state invariants after decisions, and writes `docs/playtest-results.json`. These simulations find rule failures and obvious balance problems; they cannot establish human enjoyment or competitive balance.

See [Sprint 5 status](docs/SPRINT-005.md), [Sprint 4 report](docs/SPRINT-004.md), [Sprint 3 checkpoint](docs/SPRINT-003.md), [balance history](docs/BALANCE.md), and [art direction](docs/ART-DIRECTION.md). Current native release details are in [v0.6.0 release guide](docs/RELEASE-0.6.0.md); the [v0.5.0 guide](docs/RELEASE-0.5.0.md) remains historical.

Optional browser checks use an existing Playwright installation and Microsoft Edge:

```text
node tests/browser-smoke.js <path-to-playwright>
node tests/browser-effects.js <path-to-playwright>
node tests/browser-layout.js <path-to-playwright>
node tests/browser-sprint3.js <path-to-playwright>
node tests/browser-deck-builder.js <path-to-playwright>
node tests/browser-deck-lab.js <path-to-playwright>
node tests/browser-warroom-sprint5.js <path-to-playwright>
node tests/browser-arsenal-sprint5.js <path-to-playwright>
```

Run `npm start` first for HTTP checks. The suites verify direct file launch, complete matches, actual button input, privacy, effects cleanup, audio hooks, the paced AI, settings, rematch, custom-deck/Worker/Node parity and bounded viewport navigation. Sprint 5 screen checks cover 1920×1080, 2560×1440, 1366×768, 1280×720 and 900×600, with a small-browser fallback where applicable. Desktop host tests use a mocked updater and isolated temporary profiles; native smoke launches also use an isolated profile. These checks are automated; owner/external human playtests have not been performed. Browser-test dependencies are not needed to play or run the rules tests.

## Main files

| File | Responsibility |
| --- | --- |
| `index.html`, `styles.css`, `command.css`, `app.js` | Command menu, setup, bounded battlefield/hand, input, privacy, feedback and dialogs. |
| `shell-state.js`, `shell.js`, `shell.css` | Shared command styling, navigation, settings, display/update state and safe update feedback. |
| `data.js` | Factions, card definitions, 26-card starter decks, glossary, default balance values. |
| `engine.js` | Pure state transitions, legality, combat, Presence, capture, victory, and debug helpers. |
| `ai.js` | Deterministic baseline, faction, deck and random policies using the same legal actions as players. |
| `decks.js`, `deck-builder.*` | Shared construction/persistence, archetype presets and Arsenal UI. |
| `balance.js`, `balance/`, `live-runtime.js` | Explicit isolated rules/card profiles and selected live runtime. |
| `telemetry.js`, `analytics.js`, `sim-core.js`, `simulator-*`, `war-room.css` | Authoritative event observation, player War Room, advanced diagnostics, deck tournaments, comparison and replay. |
| `main.js`, `desktop.js`, `preload.js`, `package.json` | Sandboxed native host/bridge, fullscreen, menu routes, update guard and Windows packaging. |
| `art.js`, `assets/` | Faction themes, illustrated role atlases, vector emblems, tactical map, original source art, and future asset folders. |
| `effects.js`, `effects.css` | State-diff presentation events, bounded animations, resource counters, public hot-seat replay, and replaceable audio cues. |
| `tests/` | Rules regression tests, integration checks, and deterministic full-match simulation. |
| `server.js` | Optional dependency-free local preview server. |
| `CONTRACT.md` | Public module/state interface used during implementation. |
| `scripts/optimize-art.py` | Optional Pillow-based resizing/compression of source art into runtime WebP. |

No files from the main Project Faction FPS project are needed or modified.
