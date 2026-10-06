# Private online multiplayer architecture — Frontlines v1.1.0

Decision status: selected and implemented after the frozen v1.0.5 checkpoint. Provider provisioning and an internet smoke test are required before the release can be called ready for different-home play.

## Product decision

Use HTTPS session creation and an always-relayed, ordered WSS connection between two players. A Cloudflare Worker routes each temporary invitation to a single SQLite-backed Durable Object. The host's existing Frontlines engine remains authoritative; the relay authenticates each socket's temporary seat and forwards bounded JSON messages. The relay does not implement a second rules engine.

Both PCs establish outbound encrypted connections to the same public service. Ordinary home NAT therefore needs no inbound connection, public player IP, router setting, or port forwarding. This is an internet relay route, not direct P2P. There is no direct route to fall back from: the relay is used for every match. A production test must explicitly verify that route rather than label local loopback as internet evidence.

## Options investigated

| Option | Connectivity and player identity | Electron and operations | Decision |
| --- | --- | --- | --- |
| Epic Online Services P2P | Mature NAT traversal; its AllowRelays policy attempts relay after direct connection failure. Connect can support internal Product User IDs without requiring the Epic account UI. | Requires a configured EOS developer product/client policy, native SDK integration and a maintained Electron bridge; product onboarding and SDK packaging become new project obligations. | Viable future platform integration; no existing EOS product or native integration was found. |
| WebRTC DataChannels + signaling + STUN/TURN | Browser DataChannels are suitable for arbitrary reliable ordered game data. Signaling is a separate application service. STUN-only is insufficient for difficult NAT; TURN must be available with service-issued temporary credentials. | Native browser APIs fit Electron, but we still operate invitations/signaling, TURN capacity/credentials, ICE recovery and two transport paths. | Technically viable; more moving parts than this turn-based game currently needs. |
| HTTPS/WSS private relay + Durable Objects | Two outbound TLS connections; anonymous temporary capabilities; ordered TCP messages per connection. A room coordinates exactly two sockets. | Uses Electron's standard fetch/WebSocket implementation, no native networking addon or permanent embedded secret. Worker and one small relay class are the service deployment. | Selected for private casual matches. |

Primary sources: [EOS relay policy](https://dev.epicgames.com/docs/en-US/api-ref/enums/eos-e-relay-control), [EOS Connect interface](https://dev.epicgames.com/docs/epic-online-services/eos-fundamentals/connect-interface), [WebRTC peer connections and signaling](https://webrtc.org/getting-started/peer-connections), [WebRTC DataChannels](https://webrtc.org/getting-started/data-channels), [Cloudflare WebSocket hibernation](https://developers.cloudflare.com/durable-objects/best-practices/websockets/). EOS Connect authentication capabilities require a configured provider product; this document does not claim that its native SDK has been integrated or tested.

## Transport boundary

The provider-independent client contract is `hostSession()`, `joinSession(code)`, `connect()`, `disconnect()`, `closeSession()`, `send(message)`, `onMessage()`, `onConnected()`, `onDisconnected()` and `getConnectionState()`. A loopback/fault implementation and the internet relay implement the same contract. Session credentials stay inside that adapter and are excluded from diagnostics.

The match protocol above that boundary owns lobby choices, readiness, compatibility, deck legality, action ownership, sequence/revision validation, deduplication, hashes, filtered snapshots, resync, concession and rematch. Provider calls do not enter `engine.js` or tactical rules. Replacing the relay therefore does not alter cards or gameplay. Production adapters and temporary reconnect capabilities live in the Electron main process; the renderer receives only explicit commands and scoped game/lobby events through the trusted preload bridge.

## Session service and signaling

1. Host requests a temporary session over HTTPS. The service generates a cryptographically random eight-character invitation, formatted `ABCD-EFGH`, using an alphabet without `0`, `1`, `I` or `O`. Collision reservation happens inside the named Durable Object. New guest invitations expire after fifteen minutes; authenticated room/reconnect lifetime is six hours.
2. The host receives a random session ID, a host seat identity and a temporary reconnect capability. The code is the only value shown to friends.
3. Guest submits the normalized invitation over HTTPS. A room allows a single guest reservation and gives that guest a distinct seat identity and reconnect capability.
4. Each seat exchanges its reconnect capability over HTTPS for a short-lived, one-use socket ticket. The ticket authenticates the WSS connection, without putting the reusable reconnect capability in a URL or log.
5. The relay attaches the authenticated seat to the socket. Incoming messages cannot change their sender by supplying another seat name in JSON. Host gameplay authorization still validates the sender against the active engine actor.
6. Temporary socket loss preserves the seat reservation. Automatic reconnect obtains a fresh ticket and triggers a host-issued player-safe resync. Grace/pause policy belongs to the shared match controller; permanent loss never lets the host advance against an absent guest.

This service performs the rendezvous function that WebRTC would call signaling. It requires no accounts, emails, player identity provider or networking setup. A display name is local preference data, not authentication.

## Security and privacy

Production requires HTTPS/WSS, bounded HTTP bodies and socket frames, strict JSON message validation, two-seat room capacity, cryptographically generated capabilities, time-limited reservations, server-side capability hashes, invite expiration and conservative request/message limits. WebSocket ticket authentication uses a short-lived ticket; durable reconnect capabilities are not socket URLs. Room closure invalidates both seats.

No deployment credential, Cloudflare API token, provider private key or permanent TURN password belongs in the executable, renderer, repository, logs or reports. A public service origin is configuration, not a secret. Provider login remains on the owner's machine. The relay may observe messages it forwards; privacy from the service operator is not end-to-end encryption. Normal messages already exclude inappropriate opponent private fields through explicit match-protocol projections.

The host process necessarily owns both players' canonical hands/reserve orders. That is a documented casual host-authority limitation. A modified host can cheat; the normal host UI must still hide the guest's private information, and guest network traffic must never contain the host's unrevealed hand or future deck order. No ranked-grade anti-cheat is claimed.

Keep the packaged UI local, sandboxed and isolated. Remote JSON is data, never executable content. Restrict network destinations through configuration/CSP while preserving Electron security defaults. [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security) recommends secure connections, sandboxing, isolation and restricted remote-content privileges.

## Durability, recovery and maintenance

Cloudflare recommends the WebSocket hibernation API for idle rooms. Persist room metadata and capability hashes in Durable Object storage; socket attachments restore authenticated seats after object reconstruction. Do not depend on an in-memory JavaScript room surviving hibernation. The relay need not store complete private engine snapshots because the authoritative host supplies resync.

Service deployment/runtime restarts can still terminate connections; reconnect is required even with hibernation. A host application restart loses its in-memory authoritative game and is not host migration. The guest must receive an honest host-disconnected result. [Durable Object lifecycle](https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/) documents object reconstruction and WebSocket shutdown behavior.

Expected service dependency: a project-owned Cloudflare account and deployed Worker/Durable Object namespace. SQLite-backed Durable Objects are available on Workers Free; free quotas can be exhausted and cause errors. Do not promise unlimited free operation. Review request/storage limits before wider distribution. [Current pricing and limits](https://developers.cloudflare.com/durable-objects/platform/pricing/).

At investigation time no Cloudflare/EOS deployment configuration, Wrangler/cloudflared CLI, provider login directory or named provider credential environment variable was found. No credential values were read or printed. The exact service code and deployment configuration are now completed locally; production provisioning needs owner authorization/login before a stable endpoint can be embedded and verified.

## Test claims and future migration

Automated loopback/fault tests prove protocol behavior. Thirteen transport/service tests passed, and `tests/network-relay-route.js` passed against the actual local Cloudflare Worker runtime on 127.0.0.1:8787. That route verified two authenticated sockets, invite normalization, bidirectional messages, independent sender binding, guest and host disconnect/reconnect, secret-free diagnostics and host closure. `tests/network-relay-security.js` separately verified ten raw provider-boundary checks including ticket reuse, seat takeover, malformed frames and declared/chunked HTTP body limits. HTTP validation occurs at the Worker edge before forwarding a bounded reconstructed body, avoiding an observed runtime stream/response race.

`tests/sprint13-relay-controller.js` ran a complete territorial match through two real desktop controllers and that Worker relay: 123 canonical actions, 27 action windows, both Commander activations, tactical statuses, capture/forced retreat, hidden-field checks after every action, guest and host reconnect with matching sequence/shared hash, rematch and concession. These are correctness fixtures, not balance statistics. Evidence is `test-results/sprint13-relay-{route,security,controller}.json`. Local compilation passed with Wrangler 4.147.0: 16.39 KiB bundle, 4.62 KiB gzip. The review manifest with exact source/bundle hashes is `docs/network/sprint13-relay-review.json`.

Neither local route nor compiler evidence proves the public deployed route. Record deployed two-client relay evidence separately; actual Ryken/Wyatt home-network play remains a final player validation when a second home is unavailable to Forge.

A later dedicated server can move the existing engine authority behind the same validated intent protocol and issue the same per-seat views. That removes the host secrecy/availability limitation without rewriting the battlefield rules. Direct WebRTC/EOS can also be added as another transport implementation if latency, platform integration or service economics warrant it.
