# Sprint 6 — Onboarding, Action Economy & Frontline Rules

Target: **Frontlines v0.7.0**, local playtest candidate. Sprint 6 makes the territory game learnable through a playable tutorial, separates deployment Capacity from tactical Command Actions, resolves defenders when territory is captured, and adds fair AI difficulty. It extends the existing engine, deck library, game shell and War Room.

## Scope and evidence

Sprint 5 delivered the central command interface, bounded screens, native fullscreen and update controls. Its competitive release gate **was not completed** before the Sprint 6 directive. The preserved 50,000-match Arsenal baseline failed: Nightwalker 66.138% and Rogue 32.472% against other factions. Exploratory Sprint 5 results do not certify the new rules. No experimental Sprint 5 stat profile was promoted into this release.

Sprint 6 inherits Arsenal v3's 80 card combat values, starter lists and ten archetype presets. Presence, Attack, Health, traits and effects are unchanged. The explicit `sprint6` profile introduces rules, card command-cost metadata and explanatory text. The original authoring data, older profiles and archived reports remain historical references.

**Ryken operates balance simulations.** This sprint runs automated unit, deterministic rule, tutorial, browser and small stability fixtures; it does not launch a balance campaign, perform simulation-driven stat tuning, or claim a fresh faction win-rate result. New rules require new owner-run evidence before further balance decisions.

## Action Economy 2.0

Available Capacity = total Capacity − deployed Presence commitment − temporary Order spending. Defaults remain 20 starting Capacity, +10 on subsequent own offensive turns, cap 80, three Command Actions, five friendly positions per territory, 25 capture progress, and enemy-home/all-seven conquest.

Printed Presence still pays for deployment, stays committed while a permanent survives, and contributes to capture at the objective. An Order temporarily spends its Presence until that owner's next offensive turn. Destruction or recall immediately frees field commitment.

| Action or card | Command Actions | Capacity / Presence |
| --- | ---: | --- |
| Ordinary units | 0 | Printed Presence becomes committed |
| Leaders | 1 | Printed Presence becomes committed |
| Bastion Heavy, Siege Heavy, Rupture Heavy | 1 | Printed Presence becomes committed |
| Field Redoubt, Assault Standard, Coordination Relay, Targeting Beacon | 1 | Printed Presence becomes committed |
| Forward Aid Station, Field Workshop | 0 | Printed Presence becomes committed |
| Healing, draw and reclaim Orders | 0 | Printed Presence is temporary spending |
| Damage, Rally/readying, disruption and Sabotage Orders | 1 | Printed Presence is temporary spending |
| Move or initiate attack | 1 | No additional Presence cost |
| Response Order / Counter / Guard / pass | 0 | Orders still pay printed Presence |
| Forced retreat / Breakthrough | 0 | No additional Presence cost |

Every current card has explicit `commandCost` metadata. The engine does not infer future costs from a card name, art role or faction. `engine.actionCost(state, action)` returns `{ presence, commandActions }`; validation and execution share that function. Future explicit card costs can exceed one. Selecting a card/action previews both resources, and legality reports insufficient Capacity, exhausted units, occupied slots and unavailable commands.

Zero Command Actions does **not** end the player's ability to deploy. A zero-command card remains legal if its Capacity, ownership, slot, targeting and timing requirements are met. Free Action means zero commands, not free Capacity. Ordinary deployments can exceed three cards in one turn. New units still require Rush to attack on their deployment turn; moving still costs a command and normally exhausts.

## Capture and frontline integrity

Capture remains a Presence race. At offensive turn end, the ending player's surviving permanent cards on the contested objective contribute printed Presence, even when defenders are present. Removing defenders slows their progress; it is not an empty-territory prerequisite.

When progress reaches the threshold:

1. Capture the territory and reset both progress tracks.
2. Resolve displaced defenders in ascending numeric card UID order.
3. A movable defender retreats exactly one adjacent territory toward its own home, into friendly-owned ground with a free allied position. Earlier UIDs reserve positions first.
4. Immobile assets, overflow into a full destination, missing friendly ground and off-map home retreats are eliminated. Cards enter discard, commitment is freed, and the capturing player receives kill credit without invented damage or individual-card damage attribution.
5. Advance the objective. Eligible capturing units/Leaders make the existing adjacent Breakthrough; friendly overflow and assets stay on their owned ground. Winning capture resolves defenders before locking the final board and does not make another Breakthrough.

Forced retreat preserves wounds, consumes no Capacity or command, and exhausts the unit. If that defender's normal initiative begins immediately afterward, normal start-turn readiness applies. Forced retreat is separate from a voluntarily played Retreat response Order.

`retreatDestination(state, unit)` supplies the dedicated legality boundary for future withdrawal modifiers. No unused Pursuit/No Retreat card system was added. Ordered events are `capture`, `forcedRetreat` / `forcedElimination` (plus normal casualty events), `frontline`, then Breakthrough moves. The winning frontline event keeps its final location and includes `victory: true`.

Strict new-profile invariants require contiguous ownership around one objective and forbid enemy units behind it. Simultaneous routed Scavenge sources cannot draw from the elimination of other doomed sources. Older profiles keep their earlier action and stranded-survivor rules for historical reproduction.

## Fair difficulty and readable enemy turns

| Selection | Behavior |
| --- | --- |
| Easy — Learning | Local readable decisions; occasionally chooses an acceptable alternative; avoids advanced combo searches. |
| Normal — Standard | Competent public-board tactics, faction priorities and basic combinations. |
| Hard — Tactical | Deck priorities and bounded two-action sequencing. |
| Expert — Command AI | Strong deck-aware evaluation and bounded three-action planning; labeled for experienced players. |
| Learning AI | Controlled local tutorial policy, separate from the ordinary difficulty selector. |

Difficulty changes decision quality, not printed stats, Capacity, draws or rules. Planning projections use visible units and the acting player's hand; they do not dispatch hypothetical turns that could draw concealed cards. Opponent hand identities and deck order do not influence choices. Omitted difficulty preserves historical policy behavior for diagnostic comparison.

Pre-match setup exposes difficulty and remembers the preference. Changing the setting during a match affects future opponents; the current opponent keeps the selected difficulty. AI speed is Fast / Normal / Deliberate, with optional plain-language action explanations and recent action history. Settings and paused menus stop automated input until gameplay resumes.

## Guided playable tutorial

The first-launch prompt recommends **Learn Frontlines** and also offers **Play immediately**. Tutorial remains a central command after skipping or completing it, with local Continue / Replay behavior.

| Lesson | Actual player interaction |
| ---: | --- |
| 1. Read the front | Identify owned ground, neutral Downtown and the highlighted objective. |
| 2. Two resources | Deploy a Rifle Squad and observe Capacity commitment without command spending. |
| 3. Choose a position | Deploy a Mobile Pathfinder into forward owned ground. |
| 4. Spend a command | Deploy, then order an already deployed center unit to attack. |
| 5. Read an exchange | Inspect Attack, Health and retaliation; resolve a real response window. |
| 6. Turn Presence into ground | Move to Downtown and end turn to capture. |
| 7. No units left behind | Watch surviving defenders retreat, then repeat with a full destination and elimination. |
| 8. Play an Order | Select Defensive Fire, preview both costs and target a defender. |
| 9. Five ways to fight | Inspect real faction examples and concise identities. |
| 10. Your plan, your turn | Capture center through multiple valid deployment/movement solutions. |
| 11. Take command | Win a short real Learning-AI operation with ordinary legal turns. |

The coach shows a short objective, why it matters, highlighted controls, three progressive hints and contextual feedback. Guided steps reject irrelevant actions without changing the board. Restart lesson, Restart tutorial and Skip remain available. Combat lessons show a forecast and scripted opponent passes so the exchange stays understandable.

Fixtures arrange cards from actual 26-card starter inventories, conserving every card and retaining printed stats. Lessons are visibly noncompetitive scenarios with declared thresholds. The final training operation uses known legal opening hands, equal starting Capacity 24, growth 5, cap 60, capture threshold 16 and a four-territory victory. It is a learning mission, not a competitive result or ordinary full-length match.

Local `frontlines.tutorial.v1` stores lesson/completion progress. Continue reloads the current lesson; it does not claim to serialize every mid-lesson click. Broken or unavailable storage falls back to a playable fresh lesson. The controller constrains guided actions, checks progress after authoritative transitions, cleans timers on pause/restart, and releases control for the final match. Tutorial metadata identifies scenarios so they cannot masquerade as standard playtests.

## Ongoing help and settings

First-time contextual tips cover depleted commands, keywords, capture/retreat and unavailable actions. Tips are dismissible, stored locally, and can be disabled or reset under **Settings → Learning & opponents**. The contained Field Manual covers winning, turns, Capacity, Command Actions, deployment, combat, territory, frontline, retreat, card types, keywords, factions and learning tips.

Persistent preferences extend the existing settings storage rather than replacing deck saves: Normal difficulty and Normal AI cadence by default; tutorial hints and action explanations enabled; existing Normal/Fast combat animation, reduced effects/shake, sound and volume preserved. Confirmation of every major command was not added; cost/target previews communicate the consequence before input.

## Version, desktop shell and War Room

The package version is **0.7.0**. `scripts/sync-version.js` generates browser build metadata from the package for start/test/build, while Electron supplies its actual installed version. The main menu and About expose the version, and reports include originating application version. Update feedback distinguishes the installed and available builds; update installation remains blocked during an active match and never restarts automatically.

Sprint 5 native F11 / Alt+Enter fullscreen, saved window/fullscreen preferences, monitor recovery, central commands and bounded scrolling remain. Arsenal and in-game War Room stay available; no admin-only restriction was introduced. Deck persistence/construction/import/export formats are unchanged.

Simulator 3.2.0 snapshots explicit rules, card command costs, retreat definitions and engine/AI/data fingerprints. Telemetry counts free plays, commands spent, forced retreats and forced eliminations alongside existing Presence/territory metrics. JSON and CSV identify the originating game version. Replays reject incompatible rules rather than silently applying a newer model. Batch collection omits full per-decision traces; individual deterministic replays provide details on demand.

## Validation and remaining human checks

Final automated checkpoint: **177/177 Node tests passed**, including **35 new tests**, on October 3, 2026. Coverage includes preserved rules/history, every new action-economy restriction, high-Capacity/zero-command plays, response costs, retreat ordering/capacity/assets/home/recapture/Scavenge, deterministic simulator replay, all difficulty choices and hidden-information independence, all eleven tutorial fixtures, recovery and completion persistence. Existing bounded fuzz fixtures remain rule robustness tests rather than balance evidence.

Six browser suites passed: learning/command flow at five desktop sizes and an 84-decision / 16-turn conquest; preference synchronization; a populated operation completed after 226 further decisions; Settings/update guards and emulated 125%/150% scaling; Arsenal/War Room saved-deck preservation and one exact Worker/Node/offline custom-deck fixture; and all eleven tutorial lessons through real UI clicks, actual Learning victory, loss/retry and strict HUD/coaching/dock bounds at six sizes. No application errors were reported.

The final packaged shell exercised actual F11 / Alt+Enter fullscreen input, tutorial deployment and visible installed version. Packaged game conquest completed in 165 decisions / 37 turns; Arsenal loaded 80 cards and a 26-card deck; War Room completed two smoke fixtures with zero errors. The 58 packaged runtime/source files match the frozen source; all 31 preserved historical baseline hashes are unchanged. [Release manifest](release-0.7.0-manifest.json), [entry checkpoint](checkpoints/sprint6-entry-a7921c0.zip) and [release guide](RELEASE-0.7.0.md) preserve this evidence. No publishing occurred.

A real inexperienced owner/external tester has not completed the new tutorial yet. Automated success does not establish that explanations are understood, Easy has the right learning difficulty, or the new economy is competitively balanced. Installation over the owner's copy, actual update-server delivery and real OS/monitor scaling still require manual verification.

Use [RELEASE-0.7.0.md](RELEASE-0.7.0.md) for launch/package evidence and the manual checklist. Signature artwork remains representative; this sprint does not expand the card pool or add online services.

## SIMULATION REQUEST

**Purpose:** Establish the first measurable baseline after separating Capacity/commands and enforcing capture retreat. Identify faction/archetype, seat and pace changes before recommending any card tuning.

**Recommended games:** 10,000 owner-run games initially. A 50,000-game confirmation is a later step only after Ryken reviews the initial evidence and explicitly authorizes it.

**Configuration:** v0.7.0; balance profile `sprint6` / `sprint6-command-frontline-v1`; all ten existing archetype presets; Tournament/round robin with both seats for every nonmirror pair, including same-faction variants; base seed **20261003**; `deck` AI for both sides with no difficulty override; default rules; maximum 240 offensive turns / 10,000 decisions; verification enabled for invariants and per-decision card conservation. Rich per-decision traces **false** (normal batch collection); obtain individual replays on demand.

```text
npm run simulate -- --mode matrix --pool archetypes --count 10000 --balance sprint6 --ai deck --seed 20261003 --verify --max-turns 240 --max-decisions 10000 --out test-results/sprint6-owner-10000.json --csv
```

**Required outputs:** JSON/HTML and both CSV files; completed/error/cutoff counts; `byFactionCross` faction rates and sample counts; all-appearance totals separately; deck/archetype rates and matchup matrix; P1/P2 split; turn minimum/median/mean/P95/maximum; capture/recapture and territory flow; comeback measures; free card plays and Command Actions spent; available/committed/unused Capacity; forced retreats and eliminations; card opportunities, play rates and notable combinations. Return error messages and suspicious match indices/seeds for replay.

The command is supported by the current CLI parser and was checked without executing a run. It creates `test-results/sprint6-owner-10000.json`, `.html`, `.matches.csv` and `.cards.csv`. Existing outputs are preserved through a numbered suffix. There is no `--rich` or difficulty CLI flag: normal batch collection already omits full traces, and `--ai deck` uses the declared deck policy without the live-match difficulty override. Ten presets produce 45 nonmirror deck pairs / 90 ordered fixtures per cycle; a partial final cycle still honors exactly 10,000 games while keeping reversed-seat pairs together.

**Reason:** Sprint 5 evidence uses older rules. The standing 45–55% cross-faction target and preferred spread ≤5 percentage points remain goals, but cannot be assumed after this change. Same-faction variants must not compress the reported competitive spread, and correlation alone does not justify a nerf.

Next priority: observe an unfamiliar human completing the tutorial and an Easy match, correct clarity/difficulty problems, then review Ryken's fresh simulation outputs before proposing a narrowly scoped balance patch.
