# Frontlines private relay — deployed service and maintainer guide

Players never run this folder, install Node, enter an endpoint or configure their router. The finished Windows game uses a public service origin supplied at packaging time. This service is a two-seat encrypted message relay; match rules remain in the host's existing canonical engine.

The owner-authorized project service is deployed at **`https://frontlines-private-relay.frontlines-private-relay.workers.dev`**. `multiplayer-config.js` supplies this origin to the normal v1.2.0 build. Deployment `73b90d84-6587-4dd5-b21c-f71aa4a9e972` completed on 2026-10-06 using the existing reviewed Worker and room implementation. No account upgrade was performed.

The public HTTPS/WSS route and a complete two-controller territorial match pass through the deployed endpoint, including both authenticated sockets, reconnect, privacy, Commander activation, rematch and concession. Two separate final packaged v1.2.0 Windows processes also completed a match and rematch through the ordinary configured public endpoint, with no URL override and no provider errors. The candidate is ready for private Internet playtesting; Ryken/Wyatt's actual different-home test remains a separate human check. The original v1.1.0 installer and Sprint 13 reports remain historical, unconfigured checkpoint evidence rather than the activated release.

## Owner activation completed

The owner explicitly authorized account access, Workers read/write and Wrangler's persistent offline authorization, then completed the official browser sign-in and approval. Authentication stays in Wrangler's local credential store; passwords, API tokens and OAuth credentials do not belong in chat, reports, repository files or source checkpoints.

Forge deployed the prepared service, recorded and configured its public HTTPS origin and ran the deployed route/full-match checks. The final activated v1.2.0 installer is assembled and verified, including its ordinary public multiplayer route. Players receive only the ordinary installer and short invitation code; no owner terminal command or player provider login is needed.

No custom domain is required: the owned `workers.dev` endpoint is sufficient. The owner account is for operating the service, not a required player login. Deployment is deliberately not an automatic game-build step.

## Maintainer commands

Run from `backend/` with Node 22 or later. Dependencies are isolated from the game's package and are not shipped to players.

```text
npm ci
npm run check
npm run dev
```

`check` bundles locally with `wrangler deploy --dry-run`; it does not publish. `dev` starts the actual Worker runtime on 127.0.0.1:8787. From the repository root, `node tests/network-relay-route.js` verifies the relay adapter against that local runtime. The main Node test suite includes `tests/sprint13-transport.test.js` and does not need the emulator.

For an authorized maintainer who needs to authenticate or redeploy later:

```text
node node_modules/wrangler/bin/wrangler.js login --browser=false --scopes account:read user:read workers:write
npm run deploy
```

Wrangler prints the official browser authorization link; complete sign-in yourself. It adds persistent `offline_access` automatically rather than accepting it as a named CLI scope. Deployment creates/updates `frontlines-private-relay` and its `FrontlinesRoom` SQLite-backed Durable Object namespace. It never publishes the Frontlines GitHub game release. Set `WRANGLER_SEND_METRICS=false` to avoid Wrangler development telemetry. Keep provider authentication in Wrangler's local credential store; do not copy it to the repository. Deployment remains a separate authorized operation rather than an automatic game-build step.

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

Historical local route evidence is `test-results/sprint13-relay-route.json`, explicitly marked as not public-internet or different-home verification. Current public-route evidence is `test-results/sprint14-relay-public-route.json`; its two-controller full-match counterpart is `test-results/sprint14-relay-public-controller.json`. Both identify the deployed HTTPS origin and public Internet verification, while correctly leaving `homeNetworkVerified` false.

A maintainer route test uses `FRONTLINES_RELAY_TEST_URL` with the approved public HTTPS endpoint. The endpoint is not a player-facing setting. Keep public production-route, local-emulator and packaged-client evidence separately labeled. [The current release guide](../docs/RELEASE-1.2.0.md) records the final package and human-playtest boundary.
