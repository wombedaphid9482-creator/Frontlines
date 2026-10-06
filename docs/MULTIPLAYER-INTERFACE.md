# Private multiplayer interface — v1.1.0

Multiplayer appears immediately beneath Play in the normal command menu. Host Private Match creates a short copyable invite. Join Private Match accepts uppercase/lowercase codes with spaces or hyphens. Players can edit a local 24-character display name in the lobby or Settings → Multiplayer.

The lobby uses the existing Frontlines panels, faction accents, Commander portraits and button language. Only the local participant receives faction, Commander and deck controls. The opponent's name, connection, faction, Commander, public deck name and Ready state are visible. Changing a selection clears Ready. Host Start remains disabled until the authoritative lobby permits it and explains why it is unavailable. Deck ownership is checked locally in addition to the host's canonical legality check.

## Renderer boundary

The main process supplies `FrontlinesDesktop.multiplayer(command,payload)`, `getMultiplayerState()` and `onMultiplayer(callback)`. No endpoint field, socket, reconnect credential or host canonical state is exposed to the normal renderer.

`FrontlinesApp.beginNetworkMatch()` and `updateNetworkMatch()` accept the seat-scoped authoritative snapshot. `endNetworkMatch()` clears that projection when a session returns to its lobby or exits. The renderer retains the ordinary seven-territory battlefield, Presence HUD, Commander panels, targeting, previews, hand, inspector, log and card presentation. It does not dispatch projected state through the engine. Online commands are sent as intents and use the controller's authoritative `snapshot.pending` flag. A canonical acknowledgement, explicit rejection or recovery snapshot releases the lock. Missing acknowledgements trigger a bounded controller resync; recovery never automatically replays a command.

Native IPC events and asynchronous command replies can arrive in different orders. The interface rejects any lower `modelRevision`, including a late lobby or connection reply, and rejects a lower canonical sequence for the same match. An old invoke reply cannot overwrite a newer event or relock acknowledged input. A same-sequence authoritative snapshot with `pending:false` can safely recover an unacknowledged command without resolving gameplay in the renderer.

Legal actions come from the authority for the local actor. Opponent hands are empty identity arrays with a public hand count. Reserve arrays contain null placeholders for public count-dependent previews. Canonical seat indices remain unchanged. The guest's territory presentation is mirrored so their command is on the left, their forces are in the lower row and their hand remains visible while the opponent acts. This is presentation only; terrain IDs, ownership, movement and initiative still follow the canonical engine.

Normal online UI prevents developer mutations, both-hand inspection, offline rematches and enemy deck-list inspection. Opponent inspection exposes its faction, Commander and deployed cards. Player names and deck names are escaped as text. Offline playtest reports cannot accidentally serialize network projections as local complete-game reports.

## Waiting, recovery and results

The persistent command dock identifies Your Action Window, a legitimate Response/Counter window, a pending command, or Waiting for the named opponent. Waiting players can inspect their hand and public information. Starting, reconnecting and expired grace states lock commands. Host Wait Longer extends a supported reconnect grace wait. Retry connection, a diagnostic report and Return to Menu remain available. A lost session never grants an offline victory.

Animation plays only for a new match or an advancing canonical sequence. Heartbeats, connection changes, repeated snapshots and resyncs at the same sequence do not replay attacks or consume input. Animation timing never determines legal Response windows.

Concession requires a player confirmation and is resolved by the host. Results show winner, both factions and Commanders, action windows, territory and survivors, then Rematch, Return to Lobby and Main Menu. Rematch preserves selection and requires both players to Ready again. Each completed private match creates one lightweight local history entry without opponent deck contents, hands or reserve order.

Private match progression uses the separate atomic, idempotent used-card receipt. Normal completed games retain 70 Credits for victory, 50 for defeat and the once-only 50-Credit first-match bonus. Private games grant no Credits, Supply, packs or first ordinary-match bonus. Eligible actual card use contributes mastery and wear; conceded/abandoned matches do not award progression. A failed local save can be retried without double-awarding.

## Evidence and limits

- `test-results/sprint13-ui-browser.json`: 37 presentation/input/privacy contexts across 1920×1080, 1600×900, 1366×768 and 1280×720, plus delayed native reply ordering, stale lobby/sequence rejection and same-sequence pending recovery checks. This suite uses a deliberately mocked native command bridge and makes no internet claim.
- `test-results/sprint13-ui-scaled-browser.json`: 10 private-menu, join, lobby, both-seat battlefield, reconnect, result and error layouts at 911×512 CSS pixels with device scale factor 1.5, the browser equivalent of 1366×768 at 150%. Controls and all seven territories remain visible. This is not proof of native Windows display scaling.
- `test-results/sprint13-two-browser-real-relay.json`: two isolated browser profiles connected through real desktop controllers and the actual local production Worker relay. One full correctness match resolved 217 canonical actions across 49 action windows; 434 view checks confirmed hidden opponent hands/null reserve order; both Commanders activated; 16 Tactical Arsenal cards were played. Temporary guest disconnect recovered the same match, both results agreed and rematch preserved choices while alternating host initiative.
- `test-results/sprint13-offline-rewards-browser.json`: ordinary win/loss reward regression passed, including short completed operation, persistence and no duplicate rendering rewards. Original Sprint 12 evidence was restored from its frozen source checkpoint.
- `test-results/sprint13-offline-legacy-regressions.json`: the existing full tutorial, Commander/deck persistence, Arsenal CRUD/import/export/corrupt-save recovery and lab preference migration fixtures passed against v1.1.0. Only output filenames were changed; historical reports and images remain intact.
- `test-results/sprint13-offline-regressions.json`: seven offline contexts at 911×512/DPR1.5, including hotseat opening/transfer curtains and menu resume, ≥58px home launch actions, seven visible tutorial territories, decoded Commander portraits and Deck Builder/War Room commands. Compact teaching cards retain 5:7 frames and visible artwork; the empty inspector yields hand space, selection restores the inspector, and a guided deployment succeeds through actual clicks. `test-results/sprint13-current-worker-match.json` records one completed v1.1.0 Worker correctness match with zero errors; no balance campaign was started.

These browser results are not packaged EXE proof and are not a different-home internet test. The native packaged smoke report, service activation status and real internet limitations belong in the release report. No large balance campaign was run. Card-art files, mappings and 5:7 card proportions were preserved.
