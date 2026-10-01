# Project Faction: Frontlines

**Forge Sprint 002 — battlefield identity, illustrated cards, and game feel.**

Fight for territory. Commit Presence. Push the frontline into enemy ground.

## Separate matchup simulator

Double-click **Launch Simulator.cmd** or open **simulator.html**. This separate analysis app runs AI against AI through the same rules engine, without match artwork, animation, or turn delays. It does not require admin access or change an active game.

Choose two factions and their starter decks, or run an all-faction matrix. Set the **total number of simulations**, seed, rules, and safety limits. Alternating seats reduces first-player bias. Pause, resume, or stop a batch while retaining completed results. Inspect faction, deck, matchup, seat, and card-usage statistics; export JSON or CSV and inspect a seeded match.

There is currently one 26-card starter deck per faction. The selectors use a deck registry ready for the future saved-deck system; this build does not add a deck builder. Timeouts and errors are reported separately from victories. Card usage is descriptive, and baseline AI results need human matchup testing before balance changes.

The optional HTTP preview uses a background worker. Direct offline launch uses a cooperative runner that yields to the browser, so controls remain responsive. For larger headless batches with Node:

```text
npm run simulate -- --count 1000 --a stonewall --b bruiser --seed 1009 --out test-results/sim-report.json --csv
```

See the [simulator guide](docs/SIMULATOR.md), [game roadmap](docs/GAME-ROADMAP.md), and [simulator roadmap](docs/SIMULATOR-ROADMAP.md) for the workflow and next implementation stages.

## Sprint 2 presentation

The seven-zone battlefield has faction-colored ground, banners, a connected tactical city map, an advancing objective, and an explicit end-turn capture forecast. The desktop hand sits beside the board so selecting a card and deploying it does not require scrolling between them.

Five optimized faction atlases supply twenty illustrated Rifle, Heavy, Specialist, and Commander concepts. The existing sixty card definitions share this role-based art foundation. Card frames, emblems, battlefield accents, and unit thumbnails identify factions consistently.

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

1. Choose two factions. Stonewall versus Bruiser is a useful first matchup.
2. Start a local hot-seat game. Pass the computer when prompted and reveal your hand when ready. You can instead select a basic AI opponent for player 2.
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

See [Sprint 2 report](docs/SPRINT-002.md) for verified results, remaining limitations, and next priorities; [balance checkpoint](docs/BALANCE.md) for match observations; and [art direction](docs/ART-DIRECTION.md) for the reusable asset pipeline and saved generation prompts.

Optional browser checks use an existing Playwright installation and Microsoft Edge:

```text
node tests/browser-smoke.js <path-to-playwright>
node tests/browser-effects.js <path-to-playwright>
node tests/browser-layout.js <path-to-playwright>
```

Run `npm start` first for those checks. They verify direct file launch, HTTP launch, complete matches, actual button input, privacy, effects cleanup, audio hooks, the paced AI, settings, rematch, and desktop sizes. Browser-test dependencies are not needed to play or run the rules tests.

## Main files

| File | Responsibility |
| --- | --- |
| `index.html`, `styles.css`, `app.js` | Setup, battlefield, input, privacy, feedback, and dialogs. |
| `data.js` | Factions, card definitions, 26-card starter decks, glossary, default balance values. |
| `engine.js` | Pure state transitions, legality, combat, Presence, capture, victory, and debug helpers. |
| `ai.js` | Baseline tactical AI using the same legal-action API as players. |
| `art.js`, `assets/` | Faction themes, illustrated role atlases, vector emblems, tactical map, original source art, and future asset folders. |
| `effects.js`, `effects.css` | State-diff presentation events, bounded animations, resource counters, public hot-seat replay, and replaceable audio cues. |
| `tests/` | Rules regression tests, integration checks, and deterministic full-match simulation. |
| `server.js` | Optional dependency-free local preview server. |
| `CONTRACT.md` | Public module/state interface used during implementation. |
| `scripts/optimize-art.py` | Optional Pillow-based resizing/compression of source art into runtime WebP. |

No files from the main Project Faction FPS project are needed or modified.
