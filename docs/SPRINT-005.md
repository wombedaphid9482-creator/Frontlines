# Sprint 5 — Command Interface and Competitive Stabilization

Target: **Frontlines v0.6.0**. The command interface, player War Room, shared Settings and native fullscreen are implemented. Final competitive validation is still in progress; this report does not claim the balance release gate has passed. Packaging, final hashes and the release decision belong in [RELEASE-0.6.0.md](RELEASE-0.6.0.md).

The territory/Presence game, custom decks, factions and shared authoritative engine remain the foundation. This sprint refines the interface and performs measured balance investigation rather than rebuilding functioning rules.

## Fresh baseline and the release gate

The untouched v0.5.0 runtime is preserved under `balance/sprint5-baseline-source/`, with 31 source SHA-256 hashes. The fresh [50,000-match report](balance/sprint5-baseline-50000.json) / [HTML](balance/sprint5-baseline-50000.html) uses Arsenal `sprint4-arsenal-v3`, deck-aware AI `frontlines-ai-sprint4-v2`, the ten representative archetypes, paired seating, seed **20261007**, and per-decision invariants/card conservation. It completed **50,000 conquests, zero errors and zero cutoffs**. The original starter lists, historical authoring data and previous reports remain preserved.

| Faction | All-appearance wins / resolved | All-appearance rate | Cross-faction wins / resolved | Cross-faction rate |
| --- | ---: | ---: | ---: | ---: |
| Stonewall | 10,039 / 20,016 | 50.155% | 8,927 / 17,792 | 50.174% |
| Bruiser | 10,485 / 20,006 | 52.409% | 9,373 / 17,782 | 52.711% |
| Syndicate | 9,731 / 19,994 | 48.670% | 8,621 / 17,774 | 48.503% |
| Nightwalker | 12,864 / 19,992 | 64.346% | 11,754 / 17,772 | 66.138% |
| Rogue | 6,881 / 19,992 | 34.419% | 5,771 / 17,772 | 32.472% |

Cross-faction figures above are derived from the preserved match records, excluding same-faction deck-variant games. Each same-faction game contributes one faction win and one loss, which compresses the all-appearance spread toward 50%. Simulator 3.1 exposes both `summary.byFaction` and `summary.byFactionCross`; the player faction table uses the latter when cross-faction observations exist. Same-faction deck comparisons remain visible in deck/archetype and matchup results.

The baseline **fails** the formal release gate. The final current-profile validation must contain at least **50,000 representative-deck matches**, with every faction **45–55% against other factions** and a preferred highest-minus-lowest spread **at most 5 percentage points**. Deck/archetype viability and extreme pairings require separate review; a passing faction aggregate alone is insufficient.

The baseline also exposes strategic disparity: Shock Assault **25.879%** versus Heavy Breakthrough **78.966%**, and Combined Arms **62.302%** versus Precision Operations **35.034%** over all deck appearances. First-player wins are **54.01%**; mean match length **27.15 offensive turns**, median **23**, P95 **58**, maximum **189**. These are measurements of the frozen baseline, not results for an unvalidated new profile.

Targeted hypotheses and 10,000-match control comparisons are recorded in [sprint5-iteration-notes.md](balance/sprint5-iteration-notes.md). Silent Blade is re-evaluated using current draws/plays, repeated-play cohorts, efficiency, kills, timing, policy priority, territory windows and matchup context. Winning-card associations and shared territory windows remain correlations. No automatic nerf is inferred from appearance counts alone. Final profile decisions and the final 50,000-match gate will be recorded after validation.

## Command-oriented navigation

The main screen puts **Play**, **Arsenal**, **War Room** and **Settings** in a central command area. Larger hitboxes, clear typography, focus outlines, pressed/selected/disabled states and primary/secondary/destructive hierarchy replace dependence on thin top navigation links. Native menu commands navigate through the same renderer routes in the same window.

Major screens fit the active viewport. Long card collections, deck contents, hand rows, logs and statistics scroll inside bounded panels; scrollbars remain usable. Primary actions stay visible in fixed command areas. Quick transitions respect reduced-motion settings rather than delaying play.

The owner’s October 2 correction is implemented: **Balance Lab remains accessible inside Frontlines so players can test their decks**. The earlier removal request is canceled. The separate request for larger, prominent controls is implemented through the central command menu and the match/Arsenal/War Room command areas.

## Battlefield and Arsenal

The battlefield remains the match centerpiece. Presence, territory, turn context, the moving objective, hand and contextual commands stay readable without scrolling the application. Long hands use controlled horizontal organization. Secondary explanation moves into inspection and overlays. **Full card briefing** enlarges artwork and exact rules; Escape returns to the battlefield without mutating gameplay state. Private hot-seat hands and the shared presentation queue remain intact.

Arsenal uses a bounded deck library/contents area, card collection and inspection/composition panels. Card count, legality, Presence curve, average cost and declared archetype stay visible. **Save**, **Test in War Room**, **Duplicate**, **Export** and **Play this deck** remain in a command bar. Filtering, sorting, artwork, saved drafts, JSON import/export, random legal decks and copy rules are preserved. **Ctrl + S** saves an editable deck/draft; unsaved navigation requires a discard decision. Original starters and presets remain read-only sources for editable copies.

## Player War Room and Advanced Lab

The landing screen offers four prominent commands:

| Command | Purpose |
| --- | --- |
| Quick Matchup | Select two actual decks and run a fast comparison. |
| Tournament | Select multiple decks with checkboxes and run both-seat round robin. |
| Faction Overview | Begin a five-starter benchmark and inspect faction performance. |
| Advanced Lab | Open the full engineering analysis controls. |

Player entry uses the selected current game profile and deck-aware AI. Saved legal decks share the Arsenal’s local library; illegal drafts remain repairable in Arsenal and are excluded from simulations. The requested count is the total across the schedule, not matches per pairing. Quick Matchup keeps both faction/deck selectors, count input and all three count presets visible without scrolling setup at the tested desktop sizes, including 900×600. Explanatory text remains in Read results in context/Advanced; compact library status keeps draft repair counts visible. Run/Pause/Resume/Stop stay available in the fixed command bar, and completed records survive Stop.

Overview uses deck-rate cards and sample counts. **Decks**, **Cards**, **Economy** and **Territory** are bounded result tabs rather than a long HTML page. Small browser windows switch between Setup and Results panes. Player faction rates explicitly say **against other factions**; same-faction variants remain deck results.

**Advanced view** preserves profile/AI selection, seeds, rule overrides, safeguards, verification, thresholds, confidence intervals, detailed diagnostics, Matches/traces, regression and named-variant Compare, JSON and both CSV exports. HTML export remains accessible to players. Advanced experiment settings are labeled when shown through the simpler view. Invalid hidden advanced inputs reveal their panel before validation, so an inaccessible input cannot silently prevent running.

Exact deck lists and version/profile/AI/rule metadata remain snapshotted. Worker, Node and direct-file cooperative runners use the same simulation logic. Replay rejects incompatible builds instead of silently reinterpreting old results. Cutoffs/errors stay separate from conquests; stopped jobs remain honest partial experiments. Pause does not create persistent recovery after closing/reloading a page.

## Native fullscreen, Settings and updates

The Electron host uses **BrowserWindow fullscreen** through **F11**, **Alt + Enter**, or Settings’ **Windowed / Fullscreen** control. Key repeats and key-up events do not double-toggle. Display mode and normal bounds are saved locally. The host uses the remembered rectangle to select a display when available, then clamps inaccessible or oversized bounds to its work area. Invalid rectangles fall back to the primary display. The ordinary target minimum is **900×600**; smaller display work areas recover to the available size.

Escape closes an active Settings/modal/card inspection, or returns from a submenu. It does not quit Frontlines or unexpectedly serve as the fullscreen key. Settings is a bounded overlay with Display, Interface, Audio and About/Advanced categories. It retains Normal/Fast animation, reduced motion/effects/shake, optional synthesized effects, volume and a subtle version display. System reduced motion and muted audio remain supported.

Update feedback reports availability, download progress and readiness, with **Later** and **Restart & update**. No downloaded update forces a restart. Automatic installation on application quit is disabled; explicit installation requires a ready update and no active match in any window. Updates are unavailable in a plain browser/development build. Installed-build network behavior is not manufactured through a fake release: host/UI tests use a mocked updater, and native smoke uses an isolated profile with checks disabled.

The native renderer retains context isolation, Node integration off and sandboxing. The preload exposes only fixed desktop requests. Host IPC accepts registered local main frames for Game/Arsenal/War Room and rejects subframes, remote/other pages and closed windows; generic filesystem/IPC access is not exposed.

## Verification performed

- Screen checks cover **1920×1080**, **2560×1440**, **1366×768**, **1280×720** and **900×600**, with additional **390px** War Room/browser fallback. Commands remain within the viewport; content stays reachable through bounded panels. Settings also has emulated 125%/150% display-scale checks.
- War Room browser checks complete a custom-deck duel and a **90-game / 45-pair** tournament, compare actual Worker/Node/offline records, render cross-faction rates, verify Pause/Stop, exact replay, comparison/export, invalid advanced rules, Settings/Escape and reduced motion. No console errors.
- Preserved simulator regression checks match all **1,000 canonical baseline records**, cover pause/resume/stop, job isolation, exports, exact replay, cutoff denominators and a Worker-startup/Stop race. The custom-deck regression retains v1/v2 comparison, invalid-draft exclusion and exact snapshots.
- A complete automated live match verifies private transfers, telemetry and feedback export; the preserved example finishes **173 decisions / 97 privacy handoffs**. This is automated interaction, not an owner or external human session.
- Native host/preload tests execute the actual modules with mocked Electron/updater, isolated temporary profiles and no external update requests. They cover IPC trust, native shortcuts/state, bounds persistence/secondary-display recovery, cross-window update guards, failure recovery, same-window menu routes and event unsubscription.
- An isolated source-native shell smoke confirms main menu, Play, Settings, true fullscreen, return to windowed and both shortcuts. Final packaged smoke results and runtime/source hashes are recorded by the release guide after packaging.

Screenshots: [command menu](screenshots/command-menu-sprint-5.png), [battlefield](screenshots/battlefield-sprint-5.png), [Arsenal](screenshots/arsenal-sprint-5.png) and [War Room](screenshots/war-room-sprint-5.png). Earlier sprint captures remain preserved.

## Remaining work and limits

1. Final competitive profile and 50,000-match gate are pending; archetype and worst-matchup gaps must not be hidden by faction averages or same-faction padding.
2. Owner/external human playtests have not been performed. Automated browser/native flows cannot establish fun, readability comfort, perceived counterplay or human competitive strength.
3. Final installer packaging/hash verification and packaged native smoke are recorded separately; the interface milestone does not imply publication. No automatic publication is requested.
4. Fullscreen/scale recovery is tested in native, mock and emulated environments; a physical multi-monitor Windows user pass remains useful. Per-card final art, deeper scenario AI, resumable simulation jobs and new gameplay content remain future work.
5. Online matchmaking, accounts, progression, monetization, extra factions and massive collections remain outside this sprint.

The active [game roadmap](GAME-ROADMAP.md), [simulator roadmap](SIMULATOR-ROADMAP.md), [War Room guide](SIMULATOR.md) and [human playtest guide](PLAYTEST-GUIDE.md) describe the next actions. Historical Sprint 3/4 findings remain context for their recorded builds.
