# Frontlines v0.7.0 playtest candidate

**Onboarding, Action Economy & Frontline Rules.** Prepared locally on October 3, 2026. No automatic publication or GitHub release is authorized. Prior release folders and historical reports remain intact.

## Candidate status

Package metadata is **0.7.0**. The local Windows candidate is built and smoke-tested: **177/177 Node tests passed**, including **35 new tests**, and six browser suites passed. Native packaged checks exercised the game, Arsenal, War Room, tutorial deployment/version display and actual F11 / Alt+Enter fullscreen input. [The release manifest](release-0.7.0-manifest.json) records exact versions, results, source hashes and limits. Working changes remain uncommitted; nothing was published.

The Sprint 5 competitive gate was not completed. Sprint 6 retains Arsenal combat values while changing the economy and retreat rules; no new balance rates are claimed. Ryken runs the requested balance validation. [SPRINT-006.md](SPRINT-006.md) records exact rules, architectural boundaries and the initial owner-operated 10,000-game request.

## Launch and first session

Source browser: double-click **Launch Frontlines.cmd**, or open `index.html` offline. Optional local preview: `npm start`, then `http://127.0.0.1:4173`. Native source: `npm run electron` using the installed dependencies.

- [Windows installer](../release/0.7.0/Frontlines-Setup-0.7.0.exe): **112,978,100 bytes** (about 107.7 MiB).
- [Run without installing](../release/0.7.0/win-unpacked/Frontlines.exe): keep the whole `win-unpacked` folder together; its executable alone is insufficient.
- Dedicated tools in that folder: `Launch Arsenal.cmd`, `Launch War Room.cmd` and the compatibility `Launch Balance Lab.cmd`.

This is an **unsigned** local playtest installer (`Authenticode: NotSigned`). The packaged executable was launched with isolated temporary user data. Installation/uninstallation over the owner's existing copy and real release-server update delivery were not performed.

Installer SHA-256:

```text
e4eecca184d8a96fdca99662db1c0b2dc78a725dcfd687c7553941b987f87746
```

1. Choose **Learn Frontlines** on the first-launch prompt or **Tutorial** on the central command menu.
2. Complete the controlled objectives, use progressive **Hint** when needed, and finish the shortened Learning-AI operation.
3. Open **Play**, select faction/deck and **Easy — Learning** for a first ordinary match. Normal, Hard and Expert remain selectable.
4. Inspect each card's Capacity and Command Action costs. Ordinary deployment can continue at zero commands; attacks, moves and marked major cards require commands.
5. End turn with forces on the orange objective. On capture, watch defenders retreat or be eliminated, then observe the front move.
6. Inspect recent action history or the Field Manual when an event is unclear. Finish a match and export feedback; use Arsenal to save/export a deck variant.

War Room remains available in the game for player deck testing. Use its Advanced view for profile/seed/policy/provenance controls. Browser, offline-file and native-app local storage origins differ; exchange deck JSON when moving between them.

## Manual human checklist

- Complete the tutorial without developer explanation; verify the highlights, short objectives and progressive hints make the next interaction apparent.
- Try an unexpected action, restart a lesson, pause/open Settings, skip, continue from the menu and replay after completion. Confirm there is always a recovery path.
- Play one Easy match. Identify the current actor, available Capacity, committed Presence, remaining commands, legal deployments/targets and capture forecast without consulting external notes.
- Confirm more than three ordinary cards can deploy when Capacity/slots permit, and a Heavy/Leader or tactical Order explains its command requirement.
- Trigger capture with surviving defenders and with a blocked destination. Explain why they retreat or are eliminated from the on-screen feedback.
- Inspect AI narration/history and adjust Fast / Normal / Deliberate cadence. Check whether Easy is welcoming and Expert clearly signals its stronger planning.
- Test native F11, Alt+Enter, Settings display modes, window resize, a second monitor if available, keyboard focus and reduced motion at Windows display scaling.
- Open an existing saved deck, edit/duplicate/import/export it, and verify Arsenal/War Room remain usable in the bounded shell.
- Check About and the subtle main-menu version indicator against the installed package. A ready update must wait for an inactive match and explicit Restart & update.

Automated browser/host tests supplement these checks; they do not substitute for an inexperienced human playtest. Tutorial progress resumes at a lesson boundary, not an exact saved mid-lesson board. Artwork remains a coherent representative portrait system. Competitive validation is pending owner-run data.

## Verified build evidence

- **Rules/unit:** 177 tests passed, zero failures, including 35 additions. Existing archived-source checks and bounded deterministic robustness fixtures remain intact.
- **Command/learning flow:** all five desktop resolutions (1920×1080, 2560×1440, 1366×768, 1280×720 and 900×600), cost previews/free deployment, persistent difficulty, deliberate cadence, pause/resume and manual sections; a complete operation reached conquest in 84 decisions / 16 offensive turns.
- **Playable tutorial:** real UI clicks completed all eleven lessons, actual combat, both retreat outcomes, five faction examples, an alternative guided solution and a Learning-AI victory (12 player clicks). The loss/retry route, progress, skip/replay, paused response and strict HUD/coaching/command-dock bounds passed at six sizes, including the narrow fallback.
- **Preferences and settings:** immediate explanation/hint toggles, distinct deployment/command costs, stale-toast cleanup and restoring commands after Settings; host-adapter fullscreen controls, active/paused-match update protection and manual restart; emulated 125%/150% display scaling. This did not change real Windows scaling or perform a server update.
- **Arsenal/War Room:** existing deck saves and intentional historical profiles survive; invalid drafts remain editable; CRUD/import/export and cost labels work. One custom-deck stability fixture agreed exactly across Worker, Node and offline runners. The ordinary command suite also completed its populated operation after 226 further decisions.
- **Packaged native:** shell received actual F11 and Alt+Enter input, entered/exited true fullscreen and deployed a tutorial unit with visible installed version. Game conquest completed in 165 decisions / 37 turns; Arsenal loaded 80 cards / a 26-card deck; War Room completed two deterministic smoke fixtures with zero errors.
- **Payload/history:** 58 packaged source/runtime files match the frozen source byte for byte; production updater dependencies are included while development material is excluded. All 31 preserved Sprint 5 baseline source hashes remain unchanged.

The packaged native tutorial smoke covers launch/deployment; the full eleven-lesson campaign was completed in browser automation. Neither establishes that an inexperienced human understands the explanations. No fresh balance campaign or faction certification was performed.

[Main menu](screenshots/command-menu-sprint-6.png), [battlefield](screenshots/battlefield-sprint-6.png), [tutorial](screenshots/tutorial-sprint-6.png), [minimum-window tutorial](screenshots/tutorial-minimum-sprint-6.png) and [Arsenal](screenshots/arsenal-sprint-6.png) screenshots record the final presentation.

## Rebuild and publication boundary

```text
npm run build -- --win nsis --publish never
```

The build uses the installed Electron distribution and writes `release/0.7.0`. The package's version-sync prebuild generates browser metadata from `package.json`. Native Node integration stays disabled; context isolation, sandboxing, fixed IPC requests and local main-frame trust remain enabled.

[Release manifest](release-0.7.0-manifest.json) is also copied into `release/0.7.0`. It records the installer hash, runtime/source parity and test results. The pre-sprint [source checkpoint](checkpoints/sprint6-entry-a7921c0.zip) preserves entry commit `a7921c0`; it contains 1,475,046 bytes and SHA-256 `dcfa46a01328949e995a4492d946543b920f7ce4e820ad1a1803b3c2071e4c0e`. Do not infer a successful installer install/update flow from direct executable smoke.

For a later owner-approved GitHub release, use the validated installer and builder update artifacts, check their hashes/version, and attach concise release notes explaining free ordinary deployment, tactical commands, forced retreat and playable onboarding. This document does not authorize uploading or publishing them.
