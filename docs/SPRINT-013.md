# Frontlines — Forge Sprint 013

Target: **v1.1.0 — Private Online Multiplayer**

**Release gate remains open. Ryken and Wyatt should not use the current candidate across homes.** The final installer, native two-client match, offline regression and short-height viewport checks pass. No project-owned public Cloudflare endpoint is provisioned. Public internet and different-home play have not been verified. Source checkpoint/commit metadata is recorded separately in `release/1.1.0/manifest.json`. This document is a candidate report, not a declaration that Sprint 13 is complete.

## Preserved foundation

Work started from the frozen v1.0.5 checkpoint recorded in `docs/balance/sprint13-v1.0.5-baseline/checkpoint-hashes.json`, dated `2026-10-05T23:11:08.272Z`. Its base commit is `7f388ec66fb80f4c8d9883b3111551dd8ab0e829`; no new commit is asserted here.

The checked hashes for `engine.js`, `tactical-rules.js`, `commanders.js`, `deck-rules.js`, `data.js`, `balance.js`, `art-map012.js` and `art.js` remain identical. Package verification matched 242 runtime files, 234 frozen checkpoint entries and 169 assets; the 155 cards, 35 decks and 10 Commanders remain unchanged. Multiplayer calls the same canonical engine; it does not fork rules, change numerical balance or remap artwork. Previous releases and the frozen proofs remain intact. No large balance simulation or matchup campaign was run. The future Legendary presentation overhaul remains outside this sprint.

## Implementation

The selected transport is an always-relayed HTTPS/WSS service: a Cloudflare Worker routes temporary rooms to SQLite-backed Durable Objects. Two outbound TLS connections avoid player IP/router/VPN configuration. Direct P2P is not implemented; relay is the primary route, so a distinct relay fallback is not applicable. See `docs/MULTIPLAYER-ARCHITECTURE.md` for provider comparison, deployment boundary and source references.

The Electron main process owns the host's unchanged canonical match. Clients submit strict action intentions; the host validates authenticated sender, actor, ownership, legality, sequence and scoped hash before resolving once. The normal host renderer receives the same kind of player-safe view as the guest. The guest never dispatches a projected board through the engine.

Protocol version 1 checks application version, engine/profile, gameplay content, ruleset and selected deck manifests. Public lobby data includes display names, faction, explicit Commander, deck name/count/hash, legality and readiness; it excludes deck card lists. Selection changes clear readiness. Both clients acknowledge the same seeded opening. Canonical starting-seat assignment uses the match seed, then alternates on rematches without changing host/guest transport roles.

Recipient snapshots include public battlefield/status/Commander/resource information, public hand/reserve counts, the recipient's hand and its legal actions. Opponent hand identities, reserve identities/order, active seed/RNG and private choices are withheld. Reviewed event allowlists also redact private draw/recovery identities. Canonical JSON SHA-256 supports separate scoped and shared/public hashes. Tiny periodic checkpoints detect a missed final state frame even when the waiting recipient has no pending intention. Hash gaps request a safe full resync; reconnect replaces the board without replaying old effects. See `docs/MULTIPLAYER-PROTOCOL.md` for the exact contracts.

Temporary disconnect pauses gameplay. Bound reconnect capabilities restore the same member, sequence and authoritative state. The initial compatible lobby hello is idempotent if the first welcome was lost; starting/active recovery still requires its stored protocol credential. Grace expiry remains paused with retry/wait/return choices and does not manufacture a winner. Concession is a distinct confirmed terminal result. Rematch creates a fresh match and preserves selections with readiness cleared.

Private progression records match history and eligible mastery for actual owned card/Order/Commander use once per match ID. Credits, Supply and packs are zero for private matches. Conceded, abandoned and no-use results are excluded from mastery rewards. Ordinary match credit behavior is unchanged. Existing profile/deck keys remain in use; multiplayer preferences are additive.

## Verified local evidence

| Evidence | Result | Scope |
| --- | --- | --- |
| Final whole-project automated suite | **554 passed, 0 failed, 0 skipped**; `test-results/sprint13-node-final.log` | Final automated run includes existing offline rules/progression plus new protocol, privacy, transport, controller and interface checks. |
| Protocol/session authority plus desktop controller focused suite | 58 passed, 0 failed in the checkpoint validation run | 52 protocol/session tests and the then-current 6 controller tests; historical 50-test log in `test-results/sprint13-authority.log`. Not the final whole-project total. |
| Transport/service suite | 13 passed | Adapter/service correctness and fault cases. |
| Actual local Worker relay route | Passed; `test-results/sprint13-relay-route.json` | Two authenticated sockets, invitation normalization, sender binding, both reconnects, secret-free diagnostics and closure on `127.0.0.1:8787`. |
| Provider-boundary security checks | 10 passed; `test-results/sprint13-relay-security.json` | Ticket reuse, seat takeover, malformed frames and bounded declared/chunked HTTP bodies. |
| Two real desktop controllers through local Worker | Complete territorial match; `test-results/sprint13-relay-controller.json` | 123 canonical actions, 27 action windows, both Commander actives, tactical effects, capture/forced retreat, safe views after every action, both socket reconnects, matching sequence/shared hash, rematch and concession. |
| Two browser clients through actual local relay | Passed; `test-results/sprint13-two-browser-real-relay.json` | 217 actions / 49 windows, 434 privacy checks, both Commander activations, tactical cards, reconnect/rematch; native bridge emulated, not a native or public internet claim. |
| Final native packaged EXE confirmation | **Passed**; `test-results/sprint13-native-final2-host.log`, `test-results/sprint13-native-final2-guest.log` | Two separate EXE processes, 94 canonical actions / 15 windows, same winner 0/shared hash, hidden hand/reserve checks, both Ready/opening acknowledgements, rematch/alternating initiative; both smoke failure arrays empty. Actual local Worker relay, not public internet. |
| Native packaged offline smoke | **Six modes passed**; `test-results/sprint13-native-{shell,match,collection,arsenal,training,warroom}.log` | Menu/settings, tutorial deployment + Commander activation, full solo match, Collection, Arsenal/decks, six Tactical Training lessons and two small War Room correctness matches. No balance campaign. |
| Browser interface and ordinary rewards | Passed; `test-results/sprint13-ui-browser.json`, `test-results/sprint13-battlefield-browser.json`, `test-results/sprint13-offline-rewards-browser.json` | Interface fixtures at all four requested base resolutions, scoped controls/privacy and 5:7 rendering; ordinary first win +120 and later loss +50 persisted after reload. Actual Windows scaling remains a manual gate. |
| Current-release legacy browser regression | **Passed**; `test-results/sprint13-offline-legacy-regressions.json` | Four fixtures cover the complete 14-lesson tutorial with explicit Commander teaching, Commander/deck persistence and JSON migration, Arsenal CRUD/import/recovery/custom-match routing, and preserved War Room preferences/historical selection. Zero large campaigns. |
| Exact 1366×768 / 150% browser equivalent | **Passed after short-height fixes**; `test-results/sprint13-offline-regressions.json`, `test-results/sprint13-ui-scaled-browser.json` | Seven offline layouts and ten multiplayer layouts at 911×512 / 1.5 DPR, no errors; all seven tutorial territories, 44px coach controls, visible 5:7 hand artwork and actual guided deployment, Hotseat curtain/transfer/resume privacy, decoded Commander portraits and Deck Builder/War Room dock. Browser equivalent, not native Windows scaling verification. |
| Final installer/package content | **Rebuilt and verified** | Installer 121,633,156 bytes; SHA-256 `5a3957a75ae971143dc6ec60eba22c259d04f01819bc28bca44cac0138283ed1`; 242 runtime files verified. `release/1.1.0/manifest.json` records final package/checkpoint metadata. |
| Worker compilation | Passed with Wrangler 4.147.0 | 16.39 KiB bundle / 4.62 KiB gzip; reviewed hashes in `docs/network/sprint13-relay-review.json`. |
| Deployed public endpoint / outside-home match | **Not verified** | External provisioning gate remains open. |
| Source checkpoint / candidate commit | Recorded externally in `release/1.1.0/manifest.json` | `docs/checkpoints/sprint13-v1.1.0.zip` creation/hash and final commit are recorded after this report is archived, avoiding a document self-hash cycle. |

Focused gameplay fixtures cover all ten Commander signatures and public previews; exact canonical comparisons cover tactical effects, pending Response/Counter recovery, Scavenge private draws, wounded Reclaim/redeployment, forced retreat/capture and deployed reaction damage. These are deterministic correctness tests, not balance data. No local-loopback or Worker-emulator result is labeled as a public internet test.

The final packaged host and guest agreed on sequence 94 and shared hash `a120f49d968cef8caea456977054cd4c8c45c943b6c44b894b057f8893fd6704`. Both completed the same territorial match and alternating rematch opening with empty smoke failure arrays. Deliberate reconnect/fault evidence comes from the separate local controller/browser/protocol tests, rather than being attributed to this packaged run; detailed connection/rejection lifecycle counters remain in the raw logs.

## Remaining activation gate

**Blocker:** the executable cannot create/join an internet room while `multiplayer-config.js` has an empty public service URL and status `awaiting-owner-provisioning`.

**Why:** a public Worker/Durable Object must belong to a project-owned Cloudflare account. Provider ownership and official browser OAuth approval cannot be manufactured or embedded in the installer.

**What Forge completed:** the production service implementation/configuration, main-process transport, lobby/intent/scoped-state protocol, gameplay integration, private progression, diagnostics and local two-client correctness tests.

**Ryken's one manual action:** sign in to or create the project-owned Cloudflare account, then approve the official browser OAuth flow when Forge opens it. Existing-account approval normally takes a few minutes; account creation may take longer. No password or provider secret should be pasted into chat or committed.

**Forge's next work:** deploy the reviewed service, configure the public origin, run public two-client invite/match/reconnect tests, rebuild the installer, verify the packaged route and update this report with exact evidence. If Forge has no separate home network available, Ryken↔Wyatt different-home testing remains the final owner validation. Public route testing must precede any claim that the build is ready to send across homes.

## Final report — 32 required fields

This is the final local-candidate report. Pending public/home/Windows gates are not passing results. Exact archive and commit metadata lives in `release/1.1.0/manifest.json`, updated after archiving/committing this source report.

| # | Field | Candidate result / required final evidence |
| --- | --- | --- |
| 1 | Version | v1.1.0 private multiplayer candidate. |
| 2 | Build path | Verified final build: `release/1.1.0/Frontlines-Setup-1.1.0.exe` (121,633,156 bytes; SHA-256 `5a3957a75ae971143dc6ec60eba22c259d04f01819bc28bca44cac0138283ed1`), matching `.exe.blockmap`, `release/1.1.0/latest.yml` and `release/1.1.0/win-unpacked`. Final metadata: `release/1.1.0/manifest.json`. |
| 3 | Source checkpoint path | `docs/checkpoints/sprint13-v1.1.0.zip`; exact creation/hash: `release/1.1.0/manifest.json` after archive creation. Frozen base remains `docs/balance/sprint13-v1.0.5-baseline/checkpoint-hashes.json`. |
| 4 | Commit hash | Exact candidate commit: `release/1.1.0/manifest.json` after committing; excluded from this source report to avoid a self-hash cycle. Frozen base: `7f388ec66fb80f4c8d9883b3111551dd8ab0e829`. |
| 5 | Selected networking technology | Cloudflare Worker + SQLite-backed Durable Object, HTTPS session/ticket endpoints and ordered WSS relay. |
| 6 | Why selected | Outbound TLS fits Electron without a native SDK and gives private two-player rooms one transport path without player network setup. |
| 7 | Direct P2P | **Not implemented.** |
| 8 | Relay fallback | No separate fallback: relay is always primary. Local real Worker route passed; deployed public relay **not verified**. |
| 9 | Outside-home-network play | **Not verified. Do not send current candidate for Ryken↔Wyatt across-home play.** |
| 10 | Invite implementation | Cryptographically random eight-character code formatted `ABCD-EFGH`; case/space/hyphen normalization; one guest; new guest invitation expires after 15 minutes; authenticated room lifetime 6 hours. |
| 11 | Protocol version | Explicit network protocol version 1, separate from application semver. |
| 12 | Ruleset hash behavior | Deterministic gameplay/card/Commander/deck/profile/implementation manifest; strict compatibility rejection. Cosmetic artwork is excluded. |
| 13 | Host authority | Electron main runs the original engine; authenticated strict intents resolve once after ownership, actor, sequence, hash and canonical legality checks. |
| 14 | Hidden-information model | Recipient hand only; opponent hand/reserve identities/order and active seed/RNG withheld. Public counts and reviewed redacted events only. Normal host UI is also scoped. |
| 15 | Reconnect behavior | Automatic authenticated recovery within the active room; same match/sequence/scoped resync; stable action deduplication. Lobby opening recovery is idempotent for the bound sender. |
| 16 | Resync behavior | Scoped/public hashes and small periodic checkpoints detect gaps, including a dropped initiative-transfer frame; full authority snapshot replaces view without replaying old animations. Pending Response/Counter identity survives. |
| 17 | Disconnect behavior | Immediate pause; 60-second grace leads to honest connection-lost state with retry/wait/return. No invented win or repeatable reward. Host application restart loses the match. |
| 18 | Commander compatibility | All 10 signatures and availability previews covered locally, including costs/once-use/reconnect flags. Both players activated Commanders in controller/browser full matches; native package retains all 10 definitions and completes normal canonical play. Public result: **pending activation**. |
| 19 | Tactical Arsenal compatibility | Existing engine effects preserved; canonical fixtures and full relay matches cover tactical statuses, casualty recovery, capture and reactions. Native packaged match passes with unchanged canonical content. Public result: **pending activation**. |
| 20 | Save migration | Existing collection/deck schema and keys retained; additive multiplayer preferences. 554-test run covers preserved progress/settings/audio/collection/Commander/deck records; current-release browser legacy fixtures pass deck/Commander JSON migration, persistence, recovery and War Room historical selection. No profile reset. |
| 21 | Progression | Private history + eligible actual-use mastery only; no Credits, Supply or packs. Concession/abandon/no-use excluded. Ordinary rewards unchanged. |
| 22 | Full automated test totals | **554 passed, 0 failed, 0 skipped** in `test-results/sprint13-node-final.log`. Raw Worker route/security, browser and native runs are additional separately scoped evidence, not added to this Node total. |
| 23 | Two-client full-match result | Local Worker controller run: 123 actions / 27 windows; browser run: 217 / 49 with 434 privacy checks; final native packaged processes: 94 / 15, same winner 0/hash. Reconnect/rematch/concession coverage is scoped in the evidence table. Public endpoint test: **pending**. |
| 24 | Packaged multiplayer smoke | **Final build passed using two separate native packaged EXE processes and the actual local Worker relay.** 94 actions / 15 windows, matching final shared hash `a120f49d968cef8caea456977054cd4c8c45c943b6c44b894b057f8893fd6704`, rematch/alternating initiative, empty smoke failure arrays. Logs `test-results/sprint13-native-final2-{host,guest}.log`. Not a deployed internet result. |
| 25 | Viewport result | Browser UI fixtures passed at 1920×1080, 1600×900, 1366×768 and 1280×720 (37 layouts). After short-height fixes, exact 911×512 / 1.5 DPR passed seven offline and ten multiplayer layouts, no errors; tutorial hand artwork/actual deployment verified. Actual Wyatt Windows 1366×768 at 125%/150% scaling remains **manual validation pending**. |
| 26 | Art/card-ratio regression | Frozen art mapping/source exact; package verification matched 169 assets/234 frozen entries. Browser interface/battlefield measurements preserve 5:7 cards. No new art or remapping. Native result has no hand cards to measure, so no native card-ratio claim is inferred from it. |
| 27 | Offline regression | Six native packaged modes passed: shell/tutorial interaction, complete solo match, Collection, Arsenal/decks, Tactical Training and War Room. Four current-release legacy browser fixtures pass tutorial/migration/Arsenal/lab flows; ordinary win/loss Credits +120/+50 persisted after reload. Exact 150% browser-equivalent home/Hotseat/tutorial/deck/lab layouts pass; no multiplayer login is required for offline play. |
| 28 | Security limitations | Casual host authority; modified host may cheat/read canonical hidden data. Relay sees forwarded messages; TLS is not end-to-end encryption. No ranked anti-cheat claim. Credentials remain main-process/service-private. |
| 29 | Known issues | Public provisioning/internet/home and actual Windows scaling gates open. Active host restart loses match; no host migration; 15-minute new-guest invite / 6-hour room expiry; provider quota/outage possible; unsigned/unpublished candidate. |
| 30 | Exact Ryken instructions | First approve project-owned Cloudflare browser login; Forge deploys/tests/rebuilds. After activation: normal installer → Multiplayer → Host Private Match → send code → select faction/Commander/legal deck → Ready up → Start match. See `docs/MULTIPLAYER-PLAYTEST.md`. |
| 31 | Exact Wyatt instructions | After activation, install the same supplied installer → Multiplayer → Join Private Match → code → select faction/Commander/legal deck → Ready up → play; test 1366×768 and 125%/150% scaling; Export report if needed. No IP/VPN/Node/provider account. |
| 32 | GitHub publication recommendation | **Not recommended yet; not authorized automatically.** Complete public/package/player gates, then obtain Ryken's explicit publication authorization. |

## Known limits and release checklist

This candidate has no online accounts, ranked queue, freeform chat, spectators, replay viewer, dedicated game authority or host migration. The host process must remain open. A deliberately modified host can cheat; the relay can observe forwarded messages. Free provider quotas can be exhausted, and temporary outages must leave offline modes usable. The installer is unsigned and unpublished. No deployment secrets belong in source, renderer, executable, logs or reports.

Before marking the release ready:

- [ ] Provision the project-owned public service and configure the HTTPS/WSS origin.
- [ ] Pass actual public-route invite, two-client full match, privacy, both reconnect and closure checks.
- [x] Verify native packaged EXE networking through the actual local Worker and six offline modes.
- [x] Complete automated and current-release legacy browser progress/deck/Commander/preference migration checks.
- [x] Record final aggregate automated totals: 554/554, zero failures/skips.
- [x] Record browser lobby/battlefield/result/error base viewports and 5:7 card evidence.
- [ ] Verify actual Wyatt Windows 1366×768 at 125%/150% scaling.
- [x] Recheck exact 911×512 / 1.5 DPR offline/tutorial and multiplayer layouts after the short-height fixes.
- [x] Rebuild/verify the final short-height CSS candidate and record installer size/hash.
- [x] Complete final rebuilt native multiplayer match confirmation.
- [ ] Record clean source checkpoint/hash and candidate commit in `release/1.1.0/manifest.json` after archiving/committing this report.
- [ ] Complete Ryken↔Wyatt different-home playtest or explicitly retain that gate as pending.
- [x] Record all 32 local-candidate fields with evidence or explicit public/manual gate limitations.
- [ ] Obtain explicit authorization before pushing or publishing.

Until these gates are satisfied, describe the work as an implemented local candidate awaiting activation and release validation. Player instructions and troubleshooting are in `docs/MULTIPLAYER-PLAYTEST.md`; protocol details and evidence boundaries are in the architecture/protocol documents.
