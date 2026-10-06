# Private multiplayer readiness — v1.0.5

The deterministic local rules core is a usable foundation, not a completed network authority. No transport, accounts, public matchmaking or online mode is implemented.

| Finding | Current evidence / next requirement |
| --- | --- |
| Deterministic resolution | Explicit seed plus serialized xorshift state; dispatch uses no ambient clock/random. Reserve recycling reproduces after reload. Require server-chosen seed and matching rules/catalog/AI versions. |
| Serializable state | Units, statuses/expiry/provenance, Commander one-use/passive state, territories/progress, pending Response/Counter, UID allocators and RNG survive JSON. Version the network state schema. |
| Intent → new state/events | Immutable validated dispatch, ordered per-action event array, deterministic six-exercise replay and historical rule parity. Persist an append-only action/event ledger; the bounded display log is not the authoritative replay store. |
| Invalid action | Engine legality rejects out-of-phase and illegal targets atomically. A server must additionally validate message shape/size and bind authenticated seat to `getActor`; dispatch does not authenticate callers. |
| Deduplication / ordering | Not implemented in rules state. Add match ID, sequence, rules/content hash, expected revision and unique intent ID to a server envelope; reject stale/replayed intent before applying once. |
| Private information | Local authoritative state includes both hands and reserve order. Never broadcast it. Build explicit per-seat projections and spectator policies; revealed public events only. AI tests cannot substitute for network secrecy validation. |
| Presentation independence | Engine and tactical resolver have no DOM/audio/animation dependencies. UI represents committed engine results; animation scheduling must never authorize gameplay. |
| Resync / reconnect | Future trusted snapshot plus action revision/hash and deterministic replay; include pending response owner, statuses and Commander flags. Test real two-client disconnect/race cases in v1.1.0. |

Current proof: `tests/sprint12-replay.test.js` exercises JSON roundtrip at each tactical transition, exact ordered events, unresolved Response, Commander state, invalid action atomicity and seeded recycled draws. Existing frontend/simulator use the same rules. AI consumes its own hand and public board without reading concealed opponent hand/deck/RNG. UI/reward timestamps are outside gameplay authority.

Next release gate: strict versioned intent envelope; authoritative host/server adapter; authenticated seat/action ownership; private projections; deduplicated append-only ledger; resync/reconnect; then two-client smoke tests. These remain required before claiming online readiness.
