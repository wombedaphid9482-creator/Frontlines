# Frontlines v1.1.0 — Private Online Multiplayer candidate

**This build is not ready for Ryken and Wyatt to play across homes.** The public relay must be activated under the project's Cloudflare account before the final installer can host internet matches. Sprint 13 remains open at that external gate; local networking success is not public-internet verification.

The candidate adds Multiplayer to the ordinary main menu, private invite codes, synchronized faction/Commander/deck selection, ready/start, host-authoritative match resolution, protected opponent information, reconnect/resync, concession, results, rematch and secret-free diagnostic export. It uses the existing engine and preserves v1.0.5 artwork, 5:7 cards and offline modes.

## Local candidate artifacts

- Installer: `release/1.1.0/Frontlines-Setup-1.1.0.exe`
- Update metadata: `release/1.1.0/Frontlines-Setup-1.1.0.exe.blockmap` and `release/1.1.0/latest.yml`
- Portable packaged executable: `release/1.1.0/win-unpacked/Frontlines.exe`
- Source checkpoint: `docs/checkpoints/sprint13-v1.1.0.zip`
- Exact artifact hashes and source checkpoint proof: `docs/release-1.1.0-manifest.json`
- Candidate commit recorded after commit creation: `release/1.1.0/manifest.json`

The installer is unsigned and unpublished. Earlier releases remain intact. Do not upload this unconfigured installer as the internet-ready release.

## Verification

The final aggregate suite passed **554 tests**, with zero failures or skips. Packaging verifies 242 runtime files and preserves all 234 frozen v1.0.5 files: 169 protected assets, 155 cards, 35 deck presets and ten Commanders.

Two separate final packaged Windows processes completed a territorial match through the actual local Worker relay in **94 canonical actions / 15 action windows**, with matching winner and state hash, protected hands/reserves, then a rematch with alternate opening initiative. Both native clients reported zero smoke failures and provider errors. The host's final diagnostics at room closure include one rejected message and one disconnect; raw counters are retained in the manifest. This explicitly used a local test endpoint; the ordinary installer still has no public endpoint configured.

Separate two-controller and two-browser relay tests cover reconnect, tactical interactions, Commander activation, privacy after every action, matching results and rematch. Deterministic fixtures cover all ten Commander abilities, Response/Counter state, casualty recovery and strict action validation. These correctness matches are not balance data. No large balance campaign was run.

Packaged offline checks passed the main menu, settings, F11/Alt+Enter fullscreen, tutorial deployment and Commander activation, a full tactical hotseat match, six Tactical Training lessons, Arsenal, Collection and a two-match War Room run. Current browser evidence and exact viewport limits are in the [32-field report](SPRINT-013.md).

Normal match Credits remain 70 for a win, 50 for a loss and the existing 50 first eligible match bonus. Private matches award eligible actual-use mastery and save a local history record; Credits, Supply and packs are disabled. Conceded/abandoned/no-use matches do not award private mastery.

## One remaining owner action

Sign in to or create the project-owned Cloudflare account, then approve the official browser OAuth flow Forge opens. Existing-account approval usually takes a few minutes; account creation may take longer. Do not send passwords or tokens in chat.

Forge then deploys the prepared Worker/Durable Object, configures its public HTTPS origin, runs public invite/full-match/reconnect checks, rebuilds the installer and verifies the packaged route. The ordinary players will need only the installer and short invite code. Actual different-home play and Wyatt's Windows display scaling remain final player validation.

See [simple player instructions](MULTIPLAYER-PLAYTEST.md), [owner activation details](../backend/README.md) and the [complete sprint report](SPRINT-013.md). Publishing to GitHub still requires Ryken's explicit authorization.
