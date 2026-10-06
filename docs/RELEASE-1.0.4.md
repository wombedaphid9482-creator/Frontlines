# Frontlines v1.0.4 — Tactical Arsenal

This Windows playtest candidate adds forty cards, five showcase decks and optional advanced tactics to the published v1.0.3 build. Nothing has been published or installed automatically.

## Launch

- [Windows installer](../release/1.0.4/Frontlines-Setup-1.0.4.exe)
- [Unpacked application](../release/1.0.4/win-unpacked/Frontlines.exe) — keep this entire folder together
- [Source checkpoint](checkpoints/sprint11-v1.0.4.zip)
- [Final verification, evidence and SHA-256 hashes](release-1.0.4-manifest.json)

Use the central **Play**, **Arsenal**, **Collection**, **War Room** and **Tutorial** commands. Advanced tactics is optional from Learn Frontlines. Build/craft your expansion decks for normal Play; War Room can test every legal deck regardless of collection ownership. The new showcase presets intentionally include unowned cards until acquired. F11 and Alt+Enter toggle native fullscreen.

## Manual acceptance

1. Inspect all five showcase decks in Arsenal; duplicate one and save a variation. Confirm existing saved decks and wallet/mastery/cosmetics remain.
2. Play a normal match; inspect new and old cards. Check restored old portraits, Commander art and 5:7 full cards at your display scale.
3. Try Cover versus Breach; split a formation against Blast; observe deterministic Dodge/Mark/Exposed counters and status expiry.
4. Prepare Overwatch, enter it, then use Smoke. Verify Suppression limits movement without disabling all actions.
5. Try Rogue Sacrifice: inspect both targets, cancel once, then confirm. Check the named cost, real card loss, no casualty draw, and normal commitment release.
6. Finish the six advanced exercises; the fourteen beginner lessons remain available. Practice grants no extra collection rewards.
7. Use War Room for your own saved decks and inspect tactical diagnostics. Only after human review, run the proposed [100,000-match configuration](balance/sprint11-validation-options.json) and export the full result.

## Verification

The [sprint report](SPRINT-011.md) records exact rules, compatibility, save/economy policy, AI, telemetry and limitations. [Tactical Arsenal](TACTICAL-ARSENAL.md) lists all forty cards, rarities and five exact lists. The final machine-readable manifest reports automated counts, packaged/source equality, installer/source hashes, native outcomes and browser evidence. Correctness checks are not statistical balance certification. No large balance campaign ran.

The original [v1.0.3 release](RELEASE-1.0.3.md) and frozen source remain intact. This release has no new Git commit unless separately requested; the recorded base commit identifies provenance, not the modified working tree.
