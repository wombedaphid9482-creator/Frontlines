# Frontlines v1.3.0 — Turn System 2.0 & Design Polish

Frontlines v1.3.0 replaces the legacy one-window-per-turn clock with the intended paired-turn model and applies a focused presentation polish pass without changing printed card values, the 155-card catalog, the ten Commanders, the 35 preset decks, collection economy or Arsenal Prestige cosmetics.

## Turn System 2.0

A Turn is now one complete pair:

1. first player's Action Window;
2. second player's Action Window;
3. true Turn-End resolution;
4. next Turn.

Responses and Counters remain nested inside the initiating Action Window. Draw, readiness, Command Actions, Capacity growth and owner-specific refreshes still occur at that player's own Action Window start.

Territory now resolves once at true Turn End from the surviving objective board. Net surviving pressure is applied simultaneously:

```text
gain[P0] = max(0, pressure[P0] - pressure[P1])
gain[P1] = max(0, pressure[P1] - pressure[P0])
```

Only one objective can capture in a Turn. The existing forced-retreat, no-legal-retreat destruction, contiguous-frontline, Breakthrough and victory pipeline then resolves. The first player's forecast explicitly warns that the opponent still has an Action Window before resolution.

Scavenge and Nothing Wasted retain one shared eligible casualty draw per player per paired Turn. Sacrifice and allied-effect destruction remain excluded. Reclaim keeps wounds.

See [Turn System 2.0 rules](TURN-SYSTEM-2-RULES.md), [audit](TURN-SYSTEM-2-AUDIT.md), [card migration](TURN-SYSTEM-2-CARD-MIGRATION.md) and [owner validation plan](TURN-SYSTEM-2-OWNER-VALIDATION.md).

## Design polish

The release adds a shared design-polish layer across the main menu, setup, battlefield, multiplayer, Arsenal, Collection, Tactical Training and War Room. The pass improves hierarchy, Action Window/Turn state, territory and capture-outlook communication, Commander/status readability, primary-button emphasis and contained-panel behavior while preserving the accepted card artwork and canonical 5:7 card faces.

Arsenal Prestige remains intact: rarity, premium finish and earned wear are independent; Legendary + Foil + Veteran combinations remain presentation-only and stat-neutral.

## Multiplayer

Private invite-code multiplayer remains host-authoritative through the configured public Cloudflare relay. v1.3.0 peers serialize paired Turn, Action Window, active player, phase and Turn-End resolution markers. Gameplay compatibility rejects old timing rules rather than trying to mix v1.2.0 and v1.3.0 matches. Hidden hands/reserve order remain player-scoped, and reconnect/resync uses canonical snapshots and hashes.

The relay transport itself remains protocol-compatible; the gameplay/rules fingerprint changes for Turn System 2.0.

## Compatibility

- Existing collection ownership, Credits, Supply, mastery, wear, cosmetics and custom decks remain preserved.
- Printed card Presence, Attack, Health and Command costs are unchanged.
- No new cards, Commanders or factions are introduced.
- No large balance campaign was run. The paired-turn system changes competitive timing and requires owner-reviewed validation before numeric tuning.
- Historical simulator reports retain their original action-window timing semantics. v1.3.0 reports paired Turns and Action Windows separately.

## Verification

The current source passes **672 Node tests with 0 failures**. Dedicated Sprint 15 tests cover paired Turn/Action Window state, true Turn-End capture, status timing, Rogue casualty-draw protection, Commander timing, multiplayer compatibility, replay/telemetry and preservation of the v1.2.0 catalog/economy.

The owner-run comparative balance campaign is prepared but was **not executed**. See [Turn System 2.0 validation](TURN-SYSTEM-2-VALIDATION.md).

## Windows artifacts

- Installer: `release/1.3.0/Frontlines-Setup-1.3.0.exe`
- Blockmap: `release/1.3.0/Frontlines-Setup-1.3.0.exe.blockmap`
- Update metadata: `release/1.3.0/latest.yml`
- Portable app: `release/1.3.0/win-unpacked/Frontlines.exe`

SHA-256:

```text
Frontlines-Setup-1.3.0.exe
ba6be587f4a6722a3509776d7300c2204bd4042255fa81ec8d12cfad092e8388

Frontlines-Setup-1.3.0.exe.blockmap
96c0f6b65077f189b8b512b59259b89f01806bf4b91763e3677238b8dae0306d

latest.yml
49ebdc68584a4d123fe2d186fc4bcf590a6840eb0baa7727f0c0343dfa8ac162
```

Installer size: **121,659,036 bytes**.

## Known validation boundary

Automated correctness is strong, but the new simultaneous paired-turn capture model is a material strategic change. Human matches and the separately owner-authorized comparative simulation should be used before any broad balance patch. Private multiplayer should also continue to receive ordinary two-home human testing.
