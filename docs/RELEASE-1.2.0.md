# Frontlines v1.2.0 — Arsenal Prestige candidate

Arsenal Prestige makes Legendary cards recognizable through faction-specific construction and separates rarity, premium finish and earned wear. Collection inspection now explains actual card use, service history and the next mastery milestone. A Legendary Foil Veteran can display all three layers at once.

**The Windows candidate is ready for private Internet playtesting.** The deployed relay, public route/full-match checks and two separate packaged Windows clients pass through the normal configured endpoint. The owner completed official Cloudflare authorization, and the existing relay is deployed at `https://frontlines-private-relay.frontlines-private-relay.workers.dev` (deployment `73b90d84-6587-4dd5-b21c-f71aa4a9e972`). The installer remains unsigned and unpublished. Ryken and Wyatt's actual different-home match and Wyatt's physical display/scaling remain human validation.

## What changed

- Shared rarity frames, structural Legendary plates, faction crests and distinct material/geometry across card surfaces.
- Independent premium finish and earned wear controls in Collection and Arsenal, with favorites and useful filtering/sorting.
- Lightweight card history: confirmed matches used, deployments, deck victories, known acquisition date, latest earned progress and next milestone.
- New mastery points require actual observed use. Legacy points, unlocked variants and cumulative history remain preserved; unknown old acquisition dates are labeled honestly.
- Legendary pack spotlight and short faction audio, with responsive Continue/Skip, fast/reduced presentation and durable final-card claiming.
- Shared presentation in tutorial examples, Tactical Training and War Room card inspection.
- Local/private multiplayer rendering respects player ownership: your local treatment remains visible while opponent cards safely use Standard finish and Unworn. Cosmetic preferences are excluded from protocol and gameplay hashes.

No new cards, Commanders or factions were added. The engine, AI policies, 155-card catalog, 35 preset decks, ten Commanders and competitive values remain preserved. All accepted card-art mappings and Commander portraits remain intact. Epic remains an existing rarity tier; pack odds, prices, pity, grants and currency rewards are unchanged. No large balance simulation was run.

See [Rarity presentation](RARITY-PRESENTATION.md) and [Card mastery](CARD-MASTERY.md) for the exact layers, compatibility rules and progression definitions.

## Save and economy compatibility

Existing local storage keys remain in use. The Collection schema receives additive versioned cosmetic/history fields, preserving ownership, wallets, unlocked treatments, receipts, pending packs, RNG and saved unknown fields. Corrupt or unsupported saves remain recoverable and protected from overwrite. Migration does not fabricate old actual-use counts or acquisition dates.

Normal eligible matches retain **70 Credits for victory / 50 for defeat**, plus the existing **50 first-match bonus**. Tutorial and other excluded modes retain their separate existing rules. Eligible private matches remain **actual-use mastery only**: no Credits, Supply or packs. A concession or abandoned/unresolved private match does not award mastery. Cosmetic selection and display never grant progression.

## Verification and evidence boundaries

| Check | Result and boundary |
| --- | --- |
| Stable entry checkpoint | v1.1.0 commit `d1f64a94878e3244681550db1a64e0ea211c8455`; frozen runtime, gameplay/economy data and protected artifacts under `docs/balance/sprint14-v1.1.0-baseline/` |
| Prestige matrix | 35 examples; 20 layouts across five factions/four desktop sizes; 140 canonical card faces; passed |
| Collection and Arsenal | Ten layouts across four desktop sizes plus 911×512 at 1.5 scaling; selections persist independently; filters, face-down privacy and final-Legendary claims passed |
| Main multiplayer UI | 37 ordinary layouts plus ten layouts at 1.5 scaling; passed using interface bridge fixtures |
| Current offline browser regression | Four established tutorial/deck/Arsenal/Lab fixtures passed, including all fourteen tutorial lessons, real Commander teaching/activation, victory and loss retry |
| Real local Worker route | Invite/create/join, authentication, reconnect, ordering and diagnostics checks passed; public Internet not verified by this run |
| Two-controller local relay match | 123 canonical actions / 27 action windows; Commander actives, reconnect, privacy, matching results, rematch and concession passed |
| Two-browser local relay match | 217 canonical actions / 49 action windows; two Commander actives, sixteen tactical cards, reconnect and rematch; 434 privacy checks and 434 cosmetic-isolation checks passed |
| Final aggregate tests | **590 passed, 0 failed, 0 skipped**; `test-results/sprint14-node-final.log` |
| War Room card inspection | Fifteen inspections across five layouts, including 911×512 at 1.5 scaling; readable 5:7 face, accepted art, rarity and bounded dialog passed; `test-results/sprint14-warroom-browser.json` |
| Packaged offline modes | Six modes passed: shell/menu/settings/fullscreen/windowed and actual tutorial Commander activation; 108-action/18-window full match with both Commander actives; six training lessons; Arsenal 155 cards/ten foundations/legal 26-card deck; Collection; two zero-error War Room matches |
| Final package/source preservation | All 242 packaged runtime files match source. The 169 protected assets, all 155 accepted artwork mappings and all ten Commander portraits are preserved; core rules, competitive values, economy, AI and network authority remain frozen. Public endpoint/status and the current deployment guide are the intentional activation updates. |
| Public relay deployment/route | Deployed and configured; HTTPS health, invitations, authenticated sockets, sender binding, host/guest reconnect, closure and secret-free diagnostics passed; `test-results/sprint14-relay-public-route.json` |
| Public two-controller full match | 123 canonical actions / 27 action windows; matching hash/result, both Commander actives, privacy, reconnect, rematch and concession passed; `test-results/sprint14-relay-public-controller.json` |
| Public native match | Two separate final packaged Windows processes, normal configured endpoint and no test URL override: 107 canonical actions / 22 action windows; matching winner/hash, lobby/readiness/opening, hidden hands/reserves and rematch with alternate initiative passed. Both clients report no provider errors. |

The browser relay fixture emulates the native bridge while using the actual local Worker/WebSocket relay. Its 434 cosmetic-isolation checks are local browser evidence, not a claim about the public native test. Interface bridge fixtures separately use mock transport. The public native test uses two isolated application processes on the development computer through the deployed Internet service; it does not claim two-home hardware coverage. Correctness matches and small worker smoke tests are not win-rate evidence.

The public native match ended with winner 1 and shared hash `62b89d00c5707a1a64429afe9f713dfdbb11cde0cf1f53112f979d5aa13994ba`. Both raw client reports are preserved under `test-results/native-multiplayer/s13-s14-public-final/`; the `s13-` runner-directory prefix is historical and each report explicitly identifies v1.2.0, public service and separate processes. Offline native results are in `test-results/sprint14-native-offline-summary.json`; package proof is in `test-results/release-1.2.0-verification.json`.

Evidence is retained in `test-results/sprint14-*.json` and logs. Earlier v1.1.0 release files and evidence remain preserved.

## Candidate artifacts

The verified Windows outputs are:

- Installer: `release/1.2.0/Frontlines-Setup-1.2.0.exe`
- Update metadata: `release/1.2.0/Frontlines-Setup-1.2.0.exe.blockmap` and `release/1.2.0/latest.yml`
- Portable packaged application: `release/1.2.0/win-unpacked/Frontlines.exe`

Installer size: **121,644,818 bytes**. SHA-256:

```text
1803d3d38c31e0df44de7d1f7b1de80ca7209d7a93eefafa115addc75a1e488f
```

The source checkpoint is `docs/checkpoints/sprint14-v1.2.0.zip`. Its archive hash, exact creation proof and final candidate commit are recorded externally in `release/1.2.0/manifest.json` after archive/commit creation, avoiding a self-hash cycle in this documentation. The release manifest also records update metadata hashes and runtime/source verification.

The build used publication disabled. No GitHub upload or automatic installation over the owner's copy was performed; previous candidate artifacts remain preserved. Source checkpoints and distributable files exclude local Cloudflare credentials and development dependency state. Publication remains a separate owner decision.

## Private multiplayer activation complete

The owner authorized Workers read/write account access and Wrangler's persistent offline authorization and completed the official browser approval. Forge deployed the existing project relay, configured its HTTPS origin and verified public invite/full-match/reconnect checks plus the final packaged route. Players need the same supplied installer, Internet and a short invite code; no developer tooling, endpoint override, relay launch or router configuration is required.

The recommendation is **ready for private playtesting**, including Ryken and Wyatt's separate-home match. The host remains authoritative under the existing private-match design; this is not dedicated-server anti-cheat or host migration. [Player instructions](MULTIPLAYER-PLAYTEST.md) and [service operations](../backend/README.md) describe the verified flow and remaining practical limits.

## Final player checks

1. Open Collection and inspect Common, Rare, Epic and Legendary cards. Equip an owned Foil and earned Veteran independently; reopen to confirm both persist.
2. Filter favorites and mastery, inspect an older acquired card and confirm unknown legacy dates are explained rather than invented.
3. Open a pack containing a Legendary, including when it is the last card. Try Fast and reduced presentation; confirm the saved result survives reopening.
4. Play an ordinary win and loss, confirm configured Credits and actual-used mastery, and inspect populated battlefield cards at the actual Windows display scaling.
5. Open Arsenal, tutorial, Tactical Training and War Room; check the same card's readable rarity frame and accepted artwork.
6. Host/join across homes using the supplied v1.2.0 installer, test disconnect/reconnect and rematch, then export secret-free diagnostics if something fails.

Competitive balance remains provisional under the existing owner-run validation policy. This presentation sprint makes no new win-rate claim.
