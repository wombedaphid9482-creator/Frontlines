# Frontlines v1.1.0 — private multiplayer playtest

**Current status: do not send this candidate to Wyatt for across-home play yet.** Local two-client tests and a complete match between two native packaged applications have passed, but the project-owned public relay has not been provisioned. Public internet and different-home connectivity have not been verified. Offline Frontlines remains available.

## One-time activation for Ryken

The missing dependency is a project-owned Cloudflare account and approval to deploy its Worker/Durable Object relay. Ryken's one manual action is to sign in to, or create, that account and approve the official browser OAuth request when Forge starts the Cloudflare login flow. Existing-account approval should take a few minutes; new-account setup may take longer. Do not paste passwords or provider tokens into chat, reports or the project.

After that approval, Forge will deploy the reviewed service, configure its public HTTPS/WSS origin, run two-client tests through that public service, rebuild the normal installer and record the packaged result. Ryken and Wyatt should use the newly issued activated installer, rather than the current unconfigured candidate. Their actual different-home match is the final player validation.

The following player steps apply **after Forge confirms activation and supplies the tested installer**.

## Ryken: host

1. Install the supplied **Frontlines-Setup-1.1.0.exe** and open Frontlines.
2. Open **Multiplayer → Host Private Match**.
3. Use **Copy code** and send the code to Wyatt.
4. Choose your faction, Commander and a legal deck. Check your display name.
5. Select **Ready up**. Wait until Wyatt is also ready.
6. Select **Start match** and play.

## Wyatt: join

1. Install the same supplied **Frontlines-Setup-1.1.0.exe** and open Frontlines.
2. Open **Multiplayer → Join Private Match**.
3. Enter Ryken's code and select **Join Match**.
4. Choose your faction, Commander and a legal deck. Check your display name.
5. Select **Ready up**, then wait for Ryken to start.
6. Play the match and confirm that both players see the same result.

Neither player needs an IP address, router changes, port forwarding, a VPN, Node.js, a terminal or a provider account. Both PCs need an internet connection. The invitation accepts upper/lowercase and optional spaces or hyphens; a new guest must join within fifteen minutes.

## Short test session

- Finish one territorial match. Both players should see the same winner and final battlefield. Try each player's Commander active and a few tactical cards during play.
- Select **Rematch**, ready both players again and start. Deck choices should remain selected, the match should be new, and the starting player should alternate.
- During a match, briefly disable Wi-Fi on one PC, then restore it without quitting Frontlines. The battlefield should pause, reconnect automatically and resume from the same position. Repeat for the other PC. Neither player should be able to act while the other is disconnected.
- For a longer interruption, use **Retry connection**. After the reconnect grace period, the host can choose **Wait longer**; either player can return to the menu. A disconnect must not invent a territorial winner.
- In another match, choose **Concede** and confirm it. Both result screens should identify the concession. Conceded or abandoned matches must not award repeatable progression.
- Use **Return to lobby** to change decks or Commanders. Changing a choice clears Ready, so both players must ready again.

Closing/restarting the host application loses the active match. This release does not restore a restarted host or transfer authority to the guest. Use brief network interruption, rather than application restart, for the recoverable disconnect test.

## Wyatt's screen check

Use a 1366×768 Windows display. Check the lobby and battlefield at both 125% and 150% Windows scaling. Also try a normal window and fullscreen. The invite, faction/deck/Commander choices, Ready and Start controls should fit; during play, every territory, hand, Commander panel and action control should remain reachable. Cards should keep their 5:7 shape. Report clipped controls, unreadable text or routine whole-page scrolling.

## Report a problem

Select **Export report** in the lobby, reconnect overlay or result screen. Keep the exported JSON file and share it with Forge together with:

- what you were doing and which player hosted;
- approximately when it happened;
- the on-screen error text;
- display resolution and Windows scaling for layout problems;
- a screenshot if the problem is visual.

Reports contain scoped diagnostic information, not reusable reconnect credentials or opponent unrevealed hands/reserve order. The completed match record may include the seed after play ends. Send both players' reports when possible. A full replay viewer is not part of this release.

## Progression

Private matches record local history and eligible mastery for owned cards actually used, including Orders and Commander use. They grant **no Credits, Supply or packs**. Conceded, abandoned and no-use results are excluded from mastery rewards. Ordinary match credit rewards remain unchanged; private multiplayer does not replace or reduce them. Existing collection, currency, decks, settings and tutorial progress should survive the update.

## Troubleshooting

| Message or symptom | What to do |
| --- | --- |
| Private online service unavailable | The present candidate intentionally has no public service URL. Wait for the activated installer. Once activated, check the internet connection; offline modes remain available. |
| Match not found | Ask the host to confirm the code and that the lobby is still open. New guest invitations expire after fifteen minutes; create a fresh room if necessary. |
| Version/rules mismatch | Both players must install the same supplied version. Do not mix an old test build with the release candidate. |
| Deck invalid / Commander missing | Choose an explicit faction Commander and a legal deck using available collection cards. Correct the shown legality warning before Ready. |
| Start is unavailable | Both players must be connected, compatible and Ready. Any faction, Commander or deck change clears Ready. Only the host starts the match. |
| Reconnecting / Connection lost | Restore the internet connection and keep Frontlines open. Use Retry connection, then Wait longer or Return to menu if recovery is impossible. Export a report before leaving if useful. |
| Host left or restarted | The current match cannot continue. Create a new private lobby; no host migration is implemented. |
| Repeated service failures | Export a report. The shared relay can encounter provider outages or quota limits; this release does not promise unlimited service. |
| Installer trust warning | This candidate is unsigned and unpublished. Use only the installer supplied directly by Ryken/Forge; signing and publication are separate release decisions. |

## What this test does and does not establish

Every match uses a secure relay connection. Direct P2P is not implemented, and there is no separate direct-route/relay-fallback switch to test. Local Worker tests prove the implemented relay protocol on one machine; they do not prove internet routing or different-home availability.

This is casual private multiplayer. The host application owns the authoritative engine and can see canonical hidden data if deliberately modified; the normal host UI hides it. The relay provider can observe forwarded messages, so this is TLS transport security rather than end-to-end encryption. Service sessions expire after six hours, and the host must remain open.

This playtest checks connection, rules correctness, reconnect and usability. It is not a large balance campaign and its few match results should not be interpreted as faction balance evidence.
