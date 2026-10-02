# Frontlines v0.6.0 playtest candidate

**Command Interface, War Room and Competitive Stabilization.** Prepared locally on October 2, 2026. The new interface is implemented; final competitive validation and packaging are still pending. Nothing has been published automatically.

## Candidate status

| Item | Status |
| --- | --- |
| Central command menu, bounded game/Arsenal/War Room panels | Implemented and checked through automated browser flows. |
| Shared Settings, native fullscreen and safe update controls | Implemented; source-native smoke and isolated host/UI tests passed. |
| Final selected balance profile and 50,000-match gate | **Pending.** Do not describe the candidate as competitively validated. |
| Final complete test run and packaged native smoke | **Pending.** Earlier checks are summarized below. |
| Windows installer, byte size, SHA-256 and runtime manifest | **Pending.** Expected output paths are listed below; this guide does not confirm those files exist yet. |
| Owner/external human playtesting | **Not performed.** Automated interaction is not a human playtest. |

The fresh frozen v0.5.0 baseline completed 50,000 matches with zero errors or cutoffs, but failed the faction gate: Nightwalker **64.346%** and Rogue **34.419%** over all appearances; **66.138%** and **32.472%** against other factions. Final validation must measure at least 50,000 representative-deck matches with every faction **45–55% against other factions**, preferably a spread of at most five percentage points. Deck/archetype and worst-matchup results require separate review. Same-faction games must not hide the spread by contributing forced 50% faction results.

See [Sprint 5 status](SPRINT-005.md), [the preserved 50,000-match baseline](balance/sprint5-baseline-50000.json) and [iteration evidence](balance/sprint5-iteration-notes.md). Historical starters, authoring data and archived reports remain preserved. Final profile IDs, results and provenance will be added after validation.

## Windows and browser launch

The expected Windows build locations are:

- Installer: `release/0.6.0/Frontlines-Setup-0.6.0.exe` — final existence, size and hash **pending**.
- Run without installing: `release/0.6.0/win-unpacked/Frontlines.exe` — final packaged smoke **pending**. Keep the entire `win-unpacked` folder together.
- Direct native tool entry: `Frontlines.exe --arsenal` or `Frontlines.exe --simulator` from the runnable folder.

This is intended as an **unsigned local playtest build**; no signing is configured. Final package/signature verification is pending. No installer installation/uninstallation over the owner's existing application has been performed for this candidate. Share the installer or the entire runnable folder, rather than only the executable.

The current source build can be played immediately without installation: use **Launch Frontlines.cmd**, **Launch Arsenal.cmd** or **Launch Simulator.cmd** from the project root, or open `index.html`. These `.cmd` launchers open the local browser pages. For the native development host, run `npm run electron` with the project's existing development dependencies. Optional HTTP preview is `npm start`, then `http://127.0.0.1:4173`.

Offline play requires no account, packs, developer mode or internet. All gameplay cards are available. Native, HTTP and direct-file local libraries use different origins; use Arsenal's **Export deck** and JSON import to transfer exact lists between them. Export decks before moving or replacing a playtest build.

## Command menu, fullscreen and Settings

Frontlines opens to prominent **Play**, **Arsenal**, **War Room** and **Settings** commands. An existing paused operation offers **Resume Operation**. Primary actions stay visible, while collections, deck contents, hand cards, small territory rosters, logs and statistics scroll inside their own panels.

In the Windows app, press Alt if the native menu is hidden. **Frontlines → Command menu / Arsenal / War Room / Balance Lab / Settings** uses the same window and renderer routes. The displayed War Room native command is **War Room / Balance Lab**. Leaving an active battlefield for another page requires confirmation; saved decks remain local. Unsaved Arsenal edits require a discard decision. Returning to the command menu or opening Settings pauses the paced solo AI.

Use **F11**, **Alt + Enter**, or **Settings → Display → Display mode → Windowed / Fullscreen** for true native fullscreen. The host remembers display mode and normal window bounds, selects the remembered display when available, and recovers inaccessible bounds after monitor changes. Escape closes Settings, a modal or card inspection, or returns from a submenu; it does not quit Frontlines or toggle native fullscreen. Browser launch uses the browser's fullscreen controls.

Settings also provides:

- **Interface:** Normal/Fast animation, Reduced motion and visual effects, Reduced screen shake. System reduced motion remains respected.
- **Audio:** Enable effects audio and Master / effects volume. Effects are synthesized placeholders; no music channel is included.
- **About & advanced:** version, Open Advanced Lab, and native update status/actions.

Preferences save automatically on the local device when storage is available. Audio starts disabled. These presentation settings do not change authoritative match rules.

## Updates wait for an explicit restart

The installed native build reports update availability, download progress and readiness. **Later** dismisses the notice; **Restart & update** is available only when a download is ready and no active match exists in any game window. Update notices do not interrupt the active battlefield. Downloading never forces a restart, and automatic installation on application quit is disabled.

Plain browser/development builds do not check installed-build updates. Host and UI validation uses a mocked updater; isolated native smoke disables update checks. No real remote release download, installation or update migration has been exercised for this candidate. Publication remains a separate deliberate action.

## A tester's first session

1. Launch Frontlines and select **Arsenal**. Choose a faction's starter or archetype preset, inspect its cards, then choose **Make editable copy**.
2. Name the copy, change cards and review legality/Presence composition. Save a legal 26-card, single-faction deck using **Save deck**. An incomplete list can remain a **Save draft**; drafts cannot enter matches or simulations. **Ctrl + S** saves an editable deck/draft.
3. Choose **Play this deck →**, or return to **Play** and select the actual deck for each side. Set **Local hot-seat · 2 players** or **Solo · deck-aware AI opponent**, then **Deploy to front →**. In hot-seat, pass the computer and reveal only the current actor's hand when prompted.
4. Inspect a hand/battlefield card and use **Full card briefing** for larger artwork and exact rules. Deploy, advance, respond and end turns to move the objective. Escape returns from inspection without playing a card.
5. Finish a match, review the final battlefield, and choose **Export Playtest Report**. Add optional feedback and export **Text report** or **JSON report ↓**. A report remains local until you share it. Export the exact deck JSON from Arsenal alongside the report.
6. Use **Rematch →** to start a fresh match with the same deck selections, or return to setup to test another pairing.

Human observations should cover legibility at the tester's resolution/scaling, card inspection, targeting, privacy, resource clarity, perceived counterplay and when the outcome began to feel inevitable. Include the version, deck files, display settings and exported report when reporting a problem. See the [human playtest guide](PLAYTEST-GUIDE.md).

## Test a deck in War Room

Balance Lab stays accessible **inside Frontlines** for players to test their decks. Choose **War Room** from the command menu, or **Test in War Room** from Arsenal.

The landing screen offers **Quick Matchup**, **Tournament**, **Faction Overview** and **Advanced Lab**. Quick Matchup selects two actual decks; Tournament selects a deck pool with checkboxes. Set the **total** simulation count directly or use **Quick 1,000 / Standard 10,000 / Deep 50,000**. The count is across the schedule, not per pairing. Player entry uses the selected current game profile and deck-aware AI. **Run / Pause / Resume / Stop** stays in the command bar; Stop retains completed records as a partial run.

Read **Overview**, **Decks**, **Cards**, **Economy** and **Territory** results, then export HTML if useful. The faction table uses rates **against other factions** when observations exist; same-faction deck variants remain visible as deck outcomes. Draft counts point to decks that need repair in Arsenal.

Choose **Advanced view** for profiles, AI policies, seeds, rule overrides, safeguards, confidence intervals, detailed diagnostics, **Matches**/traces, **Compare**, and JSON/CSV exports. Advanced experiment settings are labeled and do not rewrite the live game or saved deck. Reports snapshot exact lists and version metadata; incompatible replays are rejected. Errors/cutoffs remain separate from victories. A simulation is diagnostic evidence, and does not establish human deck strength or enjoyment. Closing/reloading a page does not resume an unfinished job.

## Verification already performed

These describe completed development checks, not a final packaged release sign-off:

- Browser checks cover central navigation, Arsenal persistence/edit/import/export, real custom-deck matches, privacy, card briefing, Settings/Escape, reduced motion, commands and bounded panels at **1920×1080**, **2560×1440**, **1366×768**, **1280×720** and **900×600**. Additional small-browser and emulated 125%/150% scale checks cover applicable screens.
- War Room completes a custom-deck duel and a **90-match / 45-pair** tournament with exact Worker/Node/offline record parity. Preserved simulator checks match **1,000 canonical baseline records**, test pause/resume/stop, replay, exports, cutoffs and job isolation. Cross-faction faction rates are checked against rendered results.
- An automated full live match exercises private handoffs, telemetry and report export. These are programmatic human-oriented flows, not owner/external human sessions.
- Actual native host/preload modules run under isolated VM tests with mocked Electron/updater. Tests cover trusted-frame/local-page IPC, fullscreen shortcuts/events, bounds persistence and secondary-display recovery, all-window update guards, failures and same-window menu routes. No owner profile or external update service is used.
- An isolated **source-native** shell smoke confirms the command menu, Play, Settings, true fullscreen, return to windowed and both native shortcuts. Final **packaged** game/Arsenal/War Room/shell smoke is pending.

Physical multi-monitor/scaling comfort, human strategy/counterplay, fresh installer installation/uninstallation and real update migration remain untested. Automated assertions cannot establish the game's competitive quality. The [Sprint 5 report](SPRINT-005.md) records implementation, screenshots and outstanding work.

## Rebuild without publishing

```text
npm run build -- --win nsis --publish never
```

This uses the installed Electron distribution and targets `release/0.6.0`. Do **not** use `npm run publish` for this local candidate. The packaging whitelist includes runtime code, selected balance JSON and optimized runtime assets; it excludes tests, reports, source artwork and historical checkpoints. Context isolation, sandboxing and native Node integration off remain enabled.

Before distribution, record the final selected profile/AI/simulator versions and 50,000-match gate, full verification results, packaged smoke logs, installer byte size/SHA-256, and source-to-package runtime hashes. Those fields are **pending** in this guide. Earlier release installers/reports are historical evidence and cannot provide the v0.6.0 hash.

Next actions are in the [game roadmap](GAME-ROADMAP.md) and [simulator roadmap](SIMULATOR-ROADMAP.md). The [v0.5.0 release guide](RELEASE-0.5.0.md) remains preserved for its own build.
