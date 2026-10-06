# Project Faction: Frontlines

**Frontlines v1.2.0 — Arsenal Prestige candidate.**

Legendary cards now have faction-specific frame construction; rarity, premium finish and earned wear stack independently. Collection adds actual-use history, favorites, milestone explanations and separate finish/wear controls. The reviewed artwork, competitive catalog and economy remain intact. [Release status](docs/RELEASE-1.2.0.md) · [Rarity presentation](docs/RARITY-PRESENTATION.md) · [Card mastery](docs/CARD-MASTERY.md).

Private Internet multiplayer is ready for playtesting. The owner-authorized public Cloudflare relay and two separate final packaged clients pass through the ordinary configured route, including a complete territorial match and rematch. Host/join with a short code; no relay app, provider account or endpoint setup is needed. **Different-home player testing and Wyatt's physical display/scaling remain unverified.** [Historical multiplayer sprint](docs/SPRINT-013.md) · [Player instructions](docs/MULTIPLAYER-PLAYTEST.md). Offline modes continue without Internet.

All 155 battlefield cards now use reviewed illustrated artwork, with the ten premium Commander portraits preserved. Tactical AI, timing explanations, save migration and normal win/loss Credits are verified. [Download and verification](docs/RELEASE-1.0.5.md) · [Sprint report](docs/SPRINT-012.md) · [Artwork audit and every replacement](docs/art/SPRINT12-ART-QUALITY.md).

Fight for territory. Commit Presence. Push the frontline into enemy ground.

Start with **Learn Frontlines**, a fourteen-lesson playable operation, including explicit Commander passive, active and deckbuilding lessons, that teaches what to do and why. The central menu keeps **Play**, **Tutorial**, **Arsenal**, **Collection & Packs**, **War Room** and **Settings** easy to find. Major screens fit the window; card collections, logs, decks and reports scroll inside contained panels.

## Launch

Double-click **Launch Frontlines.cmd**, or open **index.html** in a current desktop browser. All artwork, rules and interface assets are local. No account, internet connection or server is required.

Optional local preview with Node 18 or newer:

```text
npm start
```

Open `http://127.0.0.1:4173`. The server binds only to this computer. Native development launch uses `npm run electron` with the installed dependencies.

The [v1.2.0 release guide](docs/RELEASE-1.2.0.md) records current packaging status and validation. Ten off-lane Commanders and ten linked foundations are available immediately. The [v1.1.0 private-match checkpoint](docs/RELEASE-1.1.0.md), [v1.0.5 illustrated arsenal](docs/RELEASE-1.0.5.md), [v1.0.2 illustrated Commanders](docs/RELEASE-1.0.2.md), [v1.0.2 viewport hotfix](docs/HOTFIX-1.0.2-VIEWPORT.md), [v1.0.1 art restoration](docs/RELEASE-1.0.1.md), [v1.0.0 Commander Update](docs/RELEASE-1.0.0.md) and [v0.9.0 pre-Commander checkpoint](docs/RELEASE-0.9.0.md) remain preserved. Keep an unpacked application folder together when using it. Releases do not publish or install over the owner's copy automatically.

## Learn and play

1. Choose **Learn Frontlines** at first launch, or **Tutorial** from the command menu. You can skip and return later.
2. Perform real deployments, movement, combat, capture, retreat and Orders. Highlights, short objectives and progressive hints explain the purpose of each interaction.
3. Complete a short operation against Learning AI, then choose **Play** for an ordinary match.
4. Select faction, Commander, actual starter/foundation/preset/saved deck and AI difficulty. **Easy — Learning** is intended for first matches; Normal, Hard and Expert improve tactical decision quality without hidden resource or stat bonuses.
5. Inspect costs and legal targets, build Presence on the orange objective, and end your offensive turn to earn capture progress. Push toward enemy home to win.

Tutorial supports Restart lesson, Restart tutorial, Skip, Continue and Replay. Local progress resumes at the current lesson boundary. Known hands and declared shortened scenarios make the first encounters predictable; the final training lesson is an actual legal match. Tutorial scenarios are identified separately from competitive evidence.

The contained **Field Manual** explains winning, turns, Capacity, Command Actions, deployment, combat, territory, frontline, retreat, card types, keywords and factions. Dismissible contextual tips remain available afterward, with disable/reset controls in Settings.

## Your military collection

Open **Collection & Packs** to inspect every card, track faction/rarity completion, purchase Standard/faction/Veteran/Elite packs and craft missing copies. All ten base Commanders are granted freely; Commander cosmetic packs remain future content. Fresh profiles start with **300 Credits**; profiles arriving without an existing collection receive the legacy **500** migration grant. Existing v0.9 wallets and pending packs are preserved, and the v1.0 Commander/foundation grant adds no currency. Legal decks containing unowned cards remain intact and explain acquisition; War Room still tests them.

Eligible ordinary matches earn **70 Credits for victory / 50 for defeat**, plus **50 once for the first match**. Tutorial completion earns **100 once**. A short authoritative ordinary defeat still receives its configured Credits. Concessions, developer/configuration games, practice and AI self-play receive no ordinary match rewards. Private matches award eligible actual-use mastery only. Excess copies above the legal copy limit become **Supply**. Purchases/claims/crafting/rewards persist atomically and cannot repeat on reload.

Mastery unlocks **Field-Worn**, **Battle-Hardened** and **Veteran**; packs may add **Foil** or **Full-Art**. Choose owned finish and earned wear independently, so Legendary + Foil + Veteran remains layered. New mastery points require actual observed card use; old earned points and unlocks stay preserved. Collection history explains progress and honest unknown legacy dates. Cosmetics and collectible rarity never modify combat values or deck legality. [Economy definitions](docs/COLLECTION-ECONOMY.md) explain unchanged prices, guarantees, pity and thresholds; [mastery](docs/CARD-MASTERY.md) explains actual-use history and migration.

Settings offers independent **Master / Music / UI / Card Effects / Battlefield** levels and **Full / Reduced / Minimal** presentation. Sound starts after interaction. Art, frames and text have isolated regions; compact hands keep costs/name/stats and an explicit full inspection.

## Capacity and Command Actions

```text
Available Capacity = total Capacity − committed Presence − temporary spending
```

Default Capacity starts at 20, grows by 10 on later own offensive turns and caps at 80. Deployed cards keep their printed Presence committed. Destruction or recall frees it. Orders spend Presence temporarily until their owner's next offensive turn.

Each offensive turn still has **three Command Actions**, now reserved for major battlefield decisions.

| Action | Command Actions |
| --- | ---: |
| Ordinary troop deployment; healing/draw/reclaim support Orders | 0 |
| Move or initiate an attack | 1 |
| Leaders; explicitly marked Heavy units/command assets; tactical damage/Rally/disruption/Sabotage Orders | 1 |
| Responses, counters, Guard, forced retreat and Breakthrough | 0 |

Every card shows its explicit cost. Zero-command deployment remains possible after all three commands are spent if Capacity, timing, owned territory and slots permit. Free Action means free of command spending; it still requires Capacity. [Sprint 6 rules](docs/SPRINT-006.md) document the action-economy foundation. The `sprint10` profile retains the Sprint 7 printed costs: Silencer Team requires one Command Action to deploy, and Field Options requires one for every Adapt mode. [Sprint 7](docs/SPRINT-007.md) explains the narrow correction and expanded card pool. Reclaim frees commitment but retains wounds; Scavenge and Nothing Wasted share one casualty draw per player/global turn.

New units may move but normally cannot attack on their deployment turn without Rush. Movement normally exhausts; Mobile preserves readiness on the first move while still consuming a command. Same-territory combat deals damage simultaneously after defender response and optional counter. Wounds persist and dead cards enter discard. Empty reserves recycle discard; there is no fatigue damage.

## Territory and forced retreat

The battlefield has seven connected territories, each with five friendly permanent-card positions by default. The orange objective begins at neutral Downtown. At offensive turn end, your surviving objective forces add printed Presence to capture progress, even with defenders present. Default threshold is 25.

On capture, surviving enemy units immediately retreat one adjacent territory toward their own home, into friendly-owned ground with a free slot. Retreat positions resolve in stable numeric UID order. Immobile assets and units without a legal retreat are eliminated, releasing commitment. Enemies never remain stranded behind the new frontline.

After defender resolution, the objective advances and your movable survivors make the existing adjacent Breakthrough, preserving wounds/readiness. Friendly assets and overflow can remain on your owned ground. Capture enemy home or the configured territory requirement to win; gameplay locks and rematch starts a fresh match.

## Difficulty, settings and desktop controls

**Easy — Learning** uses readable local choices. **Normal — Standard** makes competent tactical decisions. **Hard — Tactical** adds deck priorities and bounded two-action sequencing. **Expert — Command AI** adds stronger deck-aware three-action planning for experienced players. AI uses the same cards, Capacity and legal actions as the human. It does not inspect opponent hands or deck order.

Settings remembers difficulty for future matches, **Fast / Normal / Deliberate** AI cadence, contextual hints and optional AI explanations. Current opponents retain their match-start difficulty. Normal/Fast combat animation, reduced effects/shake, muted-by-default sound and volume remain available. System reduced motion is respected.

The Windows app uses true Electron fullscreen through **F11**, **Alt+Enter** or Settings → Display. It remembers display mode and normal bounds and recovers inaccessible monitor placement. Escape closes inspection/overlays or returns to commands; it does not quit or toggle native fullscreen.

Menu/About versions derive from actual package/build metadata. Installed update feedback shows available/downloading/ready state and **Later / Restart & update**. A downloaded update never forces a restart or installs during an active match. Plain browser launch does not install desktop updates.

## Arsenal and custom decks

All **155 gameplay cards** remain inspectable and unrestricted for AI/War Room testing. Normal Play requires owned copies; fresh profiles receive **63 designs / 171 copies** covering all five legal starters and all ten Commander foundations. The pool contains the original 80, seven Sprint 7 additions for each faction and forty Sprint 11 tactical cards. All 35 presets remain: five original 26-card starters, ten original archetypes, five hybrids, ten Commander foundations and five tactical showcases. Save, name, duplicate, edit, delete with confirmation, and import/export custom decks locally.

Choose **Faction → Commander → Foundation → Customize**. Each faction has two named leaders with a passive, a once-per-match signature and a clear deckbuilding direction. Commanders stay outside the lanes and outside the 26-card inventory; deployable Leader cards remain ordinary battlefield units. Foundations are legal, immediately owned and editable through duplication. Commander panels show both sides’ passive, active cost, legal-target conditions and spent state.

Deck construction uses exactly 26 cards plus one matching off-lane Commander from one faction, at most four copies of an ordinary card and two copies of a Leader. A Unique deployed card still allows only one active copy. Illegal or outdated drafts remain saved with explained warnings instead of being silently deleted.

Arsenal keeps the collection, deck contents and detailed card briefing in contained panels, with a persistent composition summary and large **Save / Test in War Room / Duplicate / Export / Play** actions. Browse any faction or all factions without changing the deck being edited. Search names, rules and strategic metadata; filter by type, Presence, keyword, role, strategy/design tags, set, command cost or cards already included. Direct quantities and card-edit undo/redo make iteration faster. **Ctrl+S** saves; unsaved edits prompt before leaving. Compact windows use panel tabs and card-briefing dialogs.

Composition shows cost and command distribution alongside overlapping card strategy tags. These tendencies describe the deck; its optional **AI strategy intent** is a separate choice. Saved decks become the actual match and simulation inventories. Repairable drafts and retired-card references remain visible. An unreadable library is protected from ordinary saves and offers a download of its original recovery data.

The expansion formalizes **Armor**, **Mark**, **Reinforce** and **Adapt**. Their exact targets, durations and counterplay are shared by human play, AI and simulation. Field Options asks the player to choose Repair, Resupply or Reposition before showing that mode's legal targets. Battlefield badges and inspection explain temporary Mark/Armor, while combat previews use authoritative damage rules.

See [deckbuilding](docs/DECKBUILDING.md), [card design/counterplay](docs/arsenal/CARD-DESIGN.md), and [keywords](docs/KEYWORDS.md). Native/browser/direct-file storage origins differ; exchange deck JSON when moving between them.

## War Room and simulation policy

**War Room stays accessible inside the game for player deck testing.** Open it from the central menu, Arsenal's Test command, **Launch Simulator.cmd** or `simulator.html`. No admin access is required.

Quick Matchup, Tournament, Faction Overview and Advanced Lab provide saved-deck selection, exact requested counts, paired seats, fixed Run/Pause/Resume/Stop commands and bounded results. Advanced retains seeds, explicit profiles/policies, rule overrides, confidence intervals, diagnostics, replay, comparisons and JSON/HTML/CSV export. Live rules and saved decks are not changed by an experiment.

AI-versus-AI uses the same authoritative engine without battlefield animation. HTTP launch uses a worker; direct offline launch yields cooperatively to keep controls responsive. The current game profile is `sprint10`; changing an Advanced profile refreshes the catalog from that profile's actual cards and templates. Simulator **4.0.0** reports snapshot rules, command costs and exact deck lists, identify originating game version and keep errors/cutoffs separate from victories. Telemetry **`frontlines-telemetry-v6-commanders`** adds Commander activations, passive triggers, cost savings, recovery, disruption and healing/damage alongside Mark, Reinforce, Adapt and Armor counters to economy, territory, free-play and retreat metrics. Incompatible replay versions are refused. [Sprint 10](docs/SPRINT-010.md) records the interim baseline and exact owner-run validation recommendation; no large post-patch campaign has been run.

**Ryken runs balance simulations unless explicitly authorizing Codex to run them.** The explicitly authorized v0.7.0 batch completed 10,000 decisive games with no errors or cutoffs. Its severe faction/deck and first-seat disparity is documented in the [archived Sprint 6 baseline](docs/balance/SPRINT6-BASELINE.md). Those results describe the preserved v0.7.0 rules and pool; they do not certify the expanded candidate. The earlier Sprint 5 competitive gate was not completed. The standing target remains 45–55% cross-faction rates and preferred spread ≤5 percentage points, with archetypes and extreme matchups reviewed separately.

The [Sprint 9 simulation proposal](docs/SPRINT-009.md) specifies a separate owner-reviewed 10,000-game paired-seat tournament across ten Commander foundations. Historical Sprint 7 requests remain archived proposals for their original profiles. Neither launches automatically, and no 50,000-game confirmation is implied. See the [War Room guide](docs/SIMULATOR.md), [game roadmap](docs/GAME-ROADMAP.md), [simulator roadmap](docs/SIMULATOR-ROADMAP.md) and [balance history](docs/BALANCE.md).

## Verification and known limits

```text
npm test
```

The v1.2.0 candidate passes **590 Node tests**, its 35-example prestige matrix, Collection/Arsenal and scaled-window browser checks, fourteen-lesson tutorial regression, local relay privacy/cosmetic checks and fifteen War Room card inspections. All six packaged offline modes pass; a complete match and rematch also pass between two separate packaged applications through the deployed public relay without an endpoint override. Packaging verifies all 242 runtime files against source and preserves accepted artwork. The [current release guide](docs/RELEASE-1.2.0.md) records evidence, installer hash and practical limits. Correctness tests do not establish win rates or replace human playtesting.

The [v0.7.0 entry source checkpoint](docs/checkpoints/sprint7-entry-v0.7.0.zip) and archived baseline preserve the prior build. Historical [Arsenal](docs/screenshots/arsenal-sprint-7.png) and [battlefield](docs/screenshots/battlefield-sprint-7.png) screenshots show the earlier interface; the [Sprint 6 tutorial](docs/screenshots/tutorial-sprint-6.png) remains the onboarding foundation.

Do not use `npm run playtest`, simulation CLI batches or targeted experiment scripts as an autonomous balance loop. They are owner-operated analysis tools. Ordinary unit/browser/tutorial/small rule-smoke tests remain expected.

All 155 card-art mappings use the reviewed local illustrations and original optimized atlases; ten dedicated Commander portraits remain. Faction materials, layered rarity frames, nameplates and stat regions distinguish cards while preserving bounded rules text. Normal deployment uses visible anticipation → emphasis → impact → settle over 720–1,060 ms; Fast and reduced/minimal settings remain available. Human competitive tuning remains future work. Four original procedural music themes and layered faction/rarity effects provide replaceable audio. Gameplay-earned packs, Supply crafting, actual-use mastery and independent cosmetic treatments add local progression. Private invite matches use the configured relay; no real-money systems, player accounts, public matchmaking or sixth faction are added.

## Main modules

| Module | Responsibility |
| --- | --- |
| `engine.js` | Authoritative transitions, legality/cost API, combat, Capacity, capture, retreat, victory and invariants. |
| `balance.js`, `balance/`, `live-runtime.js` | Explicit isolated rules/card profiles; Sprint 10 current default and preserved historical profiles. |
| `arsenal.js` | Structured expansion schema, faction design metadata, new cards and hybrid templates. |
| `app.js`, `command.css`, `effects.*` | Central commands, bounded battlefield/hand, cost/target feedback, history, privacy and presentation. |
| `tutorial.js`, `tutorial.css`, `field-manual.js` | Conserved lesson fixtures, guided controller, progressive hints, progress and concise rules reference. |
| `ai.js` | Public-information policy evaluation, selectable fair difficulty and bounded planning. |
| `decks.js`, `deck-builder.*` | Legal construction, persistence, presets, inspection and Arsenal. |
| `sim-core.js`, `telemetry.js`, `analytics.js`, `simulator-*` | War Room, deterministic batches, exact diagnostics, export and versioned replay. |
| `shell-state.js`, `shell.js`, `shell.css` | Shared settings/navigation, learning preferences, display and update feedback. |
| `desktop.js`, `preload.js`, `main.js` | Sandboxed native host, fixed trusted IPC, fullscreen and update guards. |
| `build-info.js`, `scripts/sync-version.js`, `package.json` | Package-derived application version and native packaging. |

No files from the main Project Faction FPS project are needed or modified. Historical [Sprint 5](docs/SPRINT-005.md), [Sprint 4](docs/SPRINT-004.md) and [v0.5.0 release](docs/RELEASE-0.5.0.md) remain preserved.
