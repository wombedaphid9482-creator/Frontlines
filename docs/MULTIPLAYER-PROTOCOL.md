# Frontlines private-match protocol

This document describes protocol version 1. The host runs the unchanged v1.0.5 canonical engine. The guest sends action intentions and receives filtered results; it never rolls gameplay RNG or dispatches its local rendering projection.

## Compatibility and identity

Both players must agree on the application version, explicit network protocol version, active gameplay profile, engine version, gameplay content hash and complete ruleset hash. The gameplay manifest contains printed card mechanics, Commander definitions, deck limits, profile rules, default configuration and canonical implementation fingerprint. Artwork and cosmetic state do not affect wire compatibility. Every selected deck is parsed and validated by the host using the existing deck library; a sorted card-count manifest hashes composition without relying on JSON property order.

Transport-authenticated sender identity is the authority for seat ownership. The sender ID inside a message must match that identity. A guest cannot choose its opponent's faction, Commander or deck. Selection changes clear readiness. Both legal selections and both connected, compatible, ready players are required to start.

## Initiative and opening acknowledgement

The original engine always starts canonical seat 0 and runs that seat's opening effects. Private matches preserve this rule. Initial host/guest assignment to canonical seats uses a bit of the host-generated match seed; rematches alternate the assignments. This is separate from relay roles, where the host remains relay seat 0. Both clients acknowledge the same match opening before gameplay is accepted.

## Action ordering

An intent includes protocol version, session ID, match ID, authenticated sender ID, action ID, observed host sequence, ruleset hash, observed player-view hash and the action payload. Payloads allow only documented engine action fields; damage, resources, draw results, arbitrary state and executable data are never accepted.

The host checks identity, compatibility, match, connection state, deduplication, sequence, view hash, active actor, ownership and normal engine legality before resolving an intention once. Only successful canonical actions advance the monotonic host sequence. Repeated action IDs never dispatch twice; reuse with different content is rejected. Old intentions are rejected and future sequencing requires authoritative synchronization. Wall-clock time controls only invitation and reconnect expiry, never gameplay rules.

## Explicit views and privacy

Public and player-scoped snapshots are constructed by allowlist rather than by serializing the full canonical object. Public battlefield cards, Commander state, resources, statuses, response decisions, territory, discard and aggregate counts are visible. Only the recipient's hand contains card identities. Both reserve arrays contain null placeholders representing their public counts; no future card IDs or order are transmitted. Opponent hands are empty arrays with a separate count. This keeps reserve-count-dependent public Commander previews correct without exposing shuffled cards.

Canonical RNG state, the active match seed, next-card counters and private deck lists are withheld. Revealing a live seed could reveal a known starter's shuffle. The seed can appear in the completed match record after play ends. Private draw/recovery event identities are removed from messages to the other seat; unknown event types are omitted until their privacy contract is reviewed. Network history is derived from reviewed public events and actions. Normal host UI uses the same scoped projections as the guest and cannot inspect an opponent's private deck or developer hand.

The host process necessarily holds both players' canonical private information. A modified malicious host can inspect it or alter outcomes. This is suitable for consensual private friend matches, not ranked secrecy or server-grade anti-cheat.

## Hashes and synchronization

SHA-256 hashes use canonical JSON with sorted object keys and preserved array order. The host retains a private canonical hash for diagnostics. Every recipient receives a hash of its own scoped state and a reproducible shared/public hash. Intentionally private information is never included in a shared hash that the client must reproduce.

A gap or view-hash mismatch locks dependent inputs and requests synchronization. A resync response replaces the local projection with a fresh recipient-safe authoritative snapshot. Ordinary action frames require the next sequence; duplicate or stale frames cannot roll the board backward. Reconnect resync may jump directly to the latest sequence.

The main-process controller sends a small checkpoint every five seconds while a match exists. It contains only the normal authenticated envelope, match ID, sequence, recipient-scoped state hash and shared/public hash; it contains no snapshot, card list, event or reconnect credential. Equal checkpoints do not rerender the UI. Old sequence/retired-match checkpoints are ignored. A missed final action frame can otherwise leave a player waiting with no pending action of its own; a newer checkpoint detects that gap, locks intentions and requests a full safe resync. Checkpoints never dispatch or replay an action.

## Reconnect and termination

Temporary reconnect capabilities are random, scoped to one session member, expire, remain private and are excluded from diagnostic exports. Connection loss pauses meaningful gameplay immediately. Reconnecting restores the authenticated member, verifies the session/match and receives a current safe snapshot; previously accepted action IDs remain deduplicated. Grace expiry leaves the match paused with a useful return/wait choice. It does not invent a territorial victory or pay repeatable rewards.

The opening lobby handshake is idempotent for the same relay-authenticated guest. If a connection drops before the first welcome/token arrives, that guest may repeat a compatible lobby hello without the protocol token and receive its own welcome again. No other identity receives that capability. A wrong supplied token still fails, and starting or active matches always require the stored protocol reconnect token.

Concession is an explicit confirmed intention. The host verifies membership and assigns the opponent a canonical terminal result; the remaining battlefield is preserved and the cause is distinct from territorial capture. Rematch returns both members to the lobby with choices preserved and readiness cleared. Starting it creates a fresh match ID, fresh seed and alternating initiative.

Response snapshots also carry `responseWindow`: a stable match-scoped ID, the sequence that opened it, its current stage and eligible canonical seat. The existing engine decides Response and Counter transitions. Sequence plus scoped-state hash binds the response intention to the correct pending engagement; animation completion never opens or closes a response.

Full snapshots replace the board without replaying the last action's effects. Only ordinary next-sequence action frames carry the resolved event feedback. Reconnecting verifies application, protocol and rules compatibility again before restoring the member.

## Desktop implementation contract

`multiplayer-session.js` creates the main-process host authority with `createHost({runtime, appVersion, implementationHash, sessionId, hostId, name})`. `handle(authenticatedSenderId, envelope)` returns an outbox of `{toId, message}` entries. The controller feeds its own recipient entry into a scoped client and sends only the peer's entry through the transport. The host's `inspectCanonical()` and `getReconnectCredential()` methods are main-only; neither is bridged to the renderer.

Accepted client message types are `hello`, `selection`, `ready`, `start`, `startAck`, `intent`, `resync`, `concede`, `rematch`, `returnLobby`, `name`, `waitLonger` and `leave`. Authoritative replies use `welcome`, `lobby`, `snapshot`, `state`, `checkpoint` and `error`. `welcome` contains only the receiving member's temporary reconnect credential. Public lobby views contain deck names, legality, counts and composition hashes, never card lists. Changing selections cannot silently fall back to an unspecified Commander: online selections require one explicit available faction Commander.

An authenticated first-time guest receives a targeted compatibility error even before it becomes a session member. That reply contains no lobby, snapshot, hand, deck or reconnect credential. Unsupported wire versions are checked for safe JSON structure before a clean protocol error is returned. Forged sender/session identities and unsafe nested payloads do not receive private data. The controller closes terminally rejected guest claims so another player can use the invitation.

`createClient({compatibility, sessionId, senderId, hostId})` checks incoming frames and supplies `hello()`, `message()`, `makeIntent()`, `requestResync()`, `getSnapshot()` and `getLobby()`. Its action helper accepts only the host-issued legal list. Client callbacks never dispatch a scoped rendering state through the engine.

`host.checkpointMessages()` returns an array of `{toId, message}` entries for connected match members, or an empty array outside a current match. The controller sends peer entries directly without a local presentation update. `client.accept(checkpoint)` returns `{ok:true,type:'checkpoint',noop:true}` for matching or ignored stale frames; a mismatch returns `resync:true` and leaves the old projection untouched until the full snapshot arrives.

Completed snapshots contain recipient-only `progression`: used card IDs and actual deployment, attack, elimination, capture contribution, Order and passive counts, plus the local Commander's active-use flag. The canonical telemetry module observes the same authoritative actions. The private online policy grants no Credits, Supply or packs; root Collection handling persists eligible mastery/history once per match ID. No undeployed opposing deck contents are included.

## Correctness evidence

`tests/sprint13-protocol.test.js` covers the browser/Node hashing contract, invitation normalization, compatibility, deck manifests, malformed data limits, strict action payloads, hidden-information projections and all ten Commander availability previews.

`tests/sprint13-session.test.js` covers shared lobbies, explicit Commander/deck validation, opening acknowledgement, seat assignment/rematch, ownership, duplicate/stale/future actions, hash resync, reconnect credentials and expiry, missed frames, pending Response/Counter recovery, concession, all ten Commander signatures, six tactical exercises, actual casualty Scavenge privacy, wounded Reclaim/redeployment, capture displacement, deployed trap reaction and one full deterministic territorial match. Every accepted fixture action is compared with the ordinary canonical engine's full state and ordered events.

The focused authority and protocol suite has 52 passing tests, including five checkpoint privacy/recovery tests. The run with the then-current six desktop controller tests passed 58/58. Earlier 50-test evidence remains in `test-results/sprint13-authority.log`; the final aggregate release report records later controller/full-project totals separately. This is local protocol/correctness evidence. It does not establish different-home connectivity, relay deployment or balance statistics; those require their separate release gates.

The frozen v1.0.5 hashes of `engine.js`, `tactical-rules.js`, `commanders.js`, `deck-rules.js`, `data.js`, `balance.js`, `art-map012.js` and `art.js` remain exact after this protocol work. No canonical rule or artwork mapping changed.

## Future versions

Increment the protocol version when message meaning, ownership, privacy, sequencing or snapshot interpretation changes incompatibly. Application version checks remain strict for the initial release. A future dedicated authority can implement the same intention and projection boundary without introducing separate rules. Host migration, transport replacement, spectators and a replay UI are outside this release.
