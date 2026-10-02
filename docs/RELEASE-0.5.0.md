# Frontlines v0.5.0 playtest candidate

**Custom Deckbuilding + Expanded Arsenal.** Built locally on October 1, 2026; nothing published automatically. The existing v0.3.0 output in `dist/` remains intact.

## Windows launch

- Installer: `release/0.5.0/Frontlines-Setup-0.5.0.exe` (112,613,127 bytes; about 107.4 MiB).
- Run without installing: `release/0.5.0/win-unpacked/Frontlines.exe`. Keep the entire folder together.
- Separate tools in that folder: `Launch Arsenal.cmd` and `Launch Balance Lab.cmd`.
- Native menu: press Alt if hidden, then Frontlines → Open Arsenal / Open Balance Lab. `Frontlines.exe --arsenal` and `Frontlines.exe --simulator` also launch the tools directly.

The installer is an unsigned local playtest build. Installation/uninstallation was not performed over the owner's existing application. The actual packaged executable was smoke-tested. Do not distribute only `Frontlines.exe`; either share the installer or the whole runnable folder.

No installation is needed for browser testing: use `Launch Frontlines.cmd`, `Launch Arsenal.cmd` or `Launch Simulator.cmd` from the project root. Those open the current HTML files offline. Native, browser and direct-file libraries use different origins; export/import deck JSON when moving between them.

## A tester's first session

1. Launch Frontlines and open Arsenal.
2. Inspect a faction's starter or archetype, make an editable copy, give it a name and change cards.
3. Save a legal 26-card deck. Select it in match setup for either player; hot-seat hides hands between actors.
4. Finish a match, answer optional feedback and export the playtest report.
5. Export Deck from Arsenal alongside the report to exchange your exact list.
6. For measurement, open Balance Lab, refresh saved decks, choose a duel or deck pool, set a count and run. Export HTML/JSON for comparison and seeded inspection.

All cards are available. No account, internet connection, packs or developer mode are required.

## Verified candidate

- All 123 Node tests passed.
- Two fresh 10,000-match batches completed every game with zero errors/cutoffs and per-action conservation/invariant checks.
- Browser tests covered complete custom matches, persistence/import/edit/delete, private handoffs, rematch/feedback, effects and small windows.
- Worker, Node and offline runners agreed on exact custom-deck results; 90-round-robin games covered all 45 archetype pairings.
- Packaged game smoke: conquest in 67 offensive turns/304 decisions. Lab smoke: 20 preset matches, zero errors. Arsenal smoke: 80 designs/26-card starter. All three exited 0 using isolated temporary user data.
- 45 packaged runtime files match current source byte for byte. Tests, reports, archived checkpoints and source artwork are excluded. Native smoke logs included two GPU teardown warnings during process exit; no app-level failure or browser error was observed.

Balance remains provisional: Heavy/Assassination are favored; Shock, Precision and Rogue need human counterplay/AI review. [Sprint 4 report](SPRINT-004.md) records exact deck rates and reproducible results. Do not describe every archetype as equally competitive.

## Rebuild and provenance

```text
npm run build -- --win nsis --publish never
```

Packaging uses the project's installed Electron distribution and writes only the new release directory plus the builder's tool cache. Runtime isolation remains enabled; native Node integration remains disabled.

[Release manifest](release-0.5.0-manifest.json) records version, balance/AI/simulator versions, test counts, seeds, size and SHA-256. Installer SHA-256:

```text
8689098bedb57e5070fbe9cd11d781d6df756fb977eaeeb18febb24aa98780aa
```

Game and simulator action plans are in [GAME-ROADMAP.md](GAME-ROADMAP.md) and [SIMULATOR-ROADMAP.md](SIMULATOR-ROADMAP.md).
