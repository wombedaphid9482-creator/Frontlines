# Frontlines private relay — owner deployment only

Players never run this folder, install Node, enter an endpoint or configure their router. The finished Windows game uses a public service origin supplied at packaging time. This service is a two-seat encrypted message relay; match rules remain in the host's existing canonical engine.

The local implementation is tested. A project-owned provider account has not been connected or deployed by this sprint. A build whose service origin has not been configured is not ready for Ryken/Wyatt different-home play.

## One-time owner activation

The one manual action is to sign in to the Cloudflare account that will own Frontlines and approve the official browser authorization Forge opens. If no account exists, create a Workers Free account first. Do not paste API tokens or provider credentials into chat. Workers Free with SQLite-backed Durable Objects is supported; review quotas before larger distribution.

After authorization, Forge deploys this prepared service, records its public HTTPS origin, configures that origin in the desktop build, runs the deployed two-client route check and rebuilds the installer. Players receive only the ordinary installer and short invitation code. No owner terminal command is needed when Forge performs activation.

No custom domain is required: the owned `workers.dev` endpoint is sufficient. The owner account is for operating the service, not a required player login. Deployment is deliberately not an automatic game-build step.

## Maintainer commands

Run from `backend/` with Node 22 or later. Dependencies are isolated from the game's package and are not shipped to players.

```text
npm ci
npm run check
npm run dev
```

`check` bundles locally with `wrangler deploy --dry-run`; it does not publish. `dev` starts the actual Worker runtime on 127.0.0.1:8787. From the repository root, `node tests/network-relay-route.js` verifies the relay adapter against that local runtime. The main Node test suite includes `tests/sprint13-transport.test.js` and does not need the emulator.

Only after owner authorization:

```text
node node_modules/wrangler/bin/wrangler.js login
npm run deploy
```

This creates/updates `frontlines-private-relay` and its `FrontlinesRoom` SQLite-backed Durable Object namespace. It never publishes the Frontlines GitHub game release. Set `WRANGLER_SEND_METRICS=false` to avoid Wrangler development telemetry. Keep provider authentication in Wrangler's local credential store; do not copy it to the repository.

## Service contract

| Route | Purpose |
| --- | --- |
| `GET /health` | Nonsecret service/version readiness |
| `POST /v1/rooms` | Create host and random eight-character invitation |
| `POST /v1/rooms/{code}/join` | Reserve the single guest |
| `POST /v1/rooms/{code}/ticket` | Authenticate temporary reconnect capability; return one-use 30-second socket ticket |
| `GET /v1/rooms/{code}/socket` | WSS upgrade using the ticket in a subprotocol; never a durable token URL |
| `POST /v1/rooms/{code}/leave` | Revoke guest seat or close host's room |

New guest invitations expire after fifteen minutes; an existing room's lifetime is six hours so already authenticated players can reconnect and rematch. Reconnect capabilities are random 256-bit values stored only as SHA-256 hashes at the relay and kept only in the main-process adapter at the client. A socket ticket is random, hashed, short lived and consumed once. Returning a host's session ID does not authorize a seat. Reconnect keeps the authenticated member ID; role is independent from canonical game initiative/seat.

Only the opposite authenticated socket receives a forwarded frame. Forwarded sender identity comes from the socket attachment, independently of any untrusted JSON `senderId`. Full host simulation state is never a relay requirement; the host supplies explicit per-player snapshots through the protocol.

HTTP bodies are bounded to 8 KiB, WebSocket frames to 256 KiB, and each connected seat to 80 messages per 10 seconds. The public Worker applies 60 API requests per minute per ephemeral IP/route-class limiter key. The limiter is deliberately approximate across provider locations; it reduces abuse and is not a global account identity. IP keys are not saved or logged by application code. Provider observability is disabled in the supplied configuration. Private reconnect capabilities are not included in normal transport state, diagnostic exports or source artifacts.

## Operations and honest limits

The service always relays. It does not establish direct P2P and does not claim that direct/relay fallback was exercised. Native TLS protects each client-to-service connection; the service operator can see forwarded data. Host-authoritative private games do not protect against a malicious modified host. There is no host migration.

Durable Object reconstruction restores persistent capability hashes and socket attachment identity. Provider maintenance may still close sockets, so clients reconnect and request player-safe snapshots. Room expiration/host closure ends the session. Quota exhaustion or service outage affects multiplayer while offline game modes remain usable.

The local route evidence is `test-results/sprint13-relay-route.json`, explicitly marked as not public-internet or different-home verification. A deployed route test uses `FRONTLINES_RELAY_TEST_URL` with the approved public HTTPS endpoint; the endpoint is not a player-facing setting. Keep public production-route evidence separate from local evidence.
