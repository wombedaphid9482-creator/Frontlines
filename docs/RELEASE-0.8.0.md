# Frontlines v0.8.0 playtest candidate

**Arsenal & Deckbuilding.** Prepared locally on October 3, 2026. The final Windows candidate is built and smoke-tested; **215/215 Node tests and eight browser suites passed**. The preserved v0.7.0 package and baseline remain intact. Nothing was published or installed over the owner's existing copy.

## Launch the candidate

- [Windows installer](../release/0.8.0/Frontlines-Setup-0.8.0.exe): **113,004,679 bytes** (about 107.8 MiB).
- [Run without installing](../release/0.8.0/win-unpacked/Frontlines.exe): keep the entire `win-unpacked` folder together.
- Dedicated launchers remain in that folder: `Launch Arsenal.cmd`, `Launch War Room.cmd` and compatibility `Launch Balance Lab.cmd`. War Room also stays inside the game.

The installer is **unsigned** (`Authenticode: NotSigned`). Packaged checks used isolated temporary user data; installation/uninstallation over the owner's copy and real update-server delivery were not performed.

Installer SHA-256:

```text
8fa3e97bc0baf4ee9218511a27a4fb1c30faef7c45e5890d23e1c60119b693ee
```

## What changes

- **115 available cards:** 35 additions, seven per faction, with roles, strategic metadata and reusable Armor, Mark, Reinforce and Adapt rules.
- **15 archetype presets:** original ten retained plus five hybrid templates. Five original starters remain. Duplicate a template to create your own editable deck.
- **Expanded Arsenal:** collection search/filter/sort, cross-faction browsing, detailed rule/design briefings, quantity controls, card edit undo/redo, local library recovery, clear legality and persistent composition.
- **Custom decks remain actual inventories:** build/name/save/edit/duplicate/import/export a legal 26-card faction deck, then select it for Play or test it in the in-game War Room.
- **Fair deck-aware AI:** all new effects and explicit Adapt choices use public board information; hybrid intent uses centralized parent strategies without stacking their bonuses.
- **Narrow balance candidate:** Silencer Team now costs 1 Command Action to deploy under Sprint 7, retaining Presence, combat stats, Rush and Precision. Every other existing combat design is preserved.

The Sprint 6 playable tutorial, Easy/Normal/Hard/Expert choices, Capacity/commands, immediate capture retreat/elimination, action explanations, bounded game shell and native F11 / Alt+Enter controls remain.

## Baseline and simulation boundary

The owner-authorized v0.7.0 run finished **10,000 decisive games, zero errors/cutoffs**. Cross-faction rates were Stonewall 44.89%, Bruiser 43.67%, Syndicate 58.75%, Nightwalker 69.93% and Rogue 32.77%; first seat won 57.05%. The baseline fails the parity/counterplay goal. [Archived baseline](balance/SPRINT6-BASELINE.md) and [structured evidence](balance/sprint6-authorized-10000-summary.json) preserve configuration, hashes, diagnostics and limits.

No follow-up batch has run. [Sprint 7](SPRINT-007.md#simulation-request--after-the-stable-candidate) proposes two separately authorized 10,000-game jobs: original ten presets for a comparable pool check, then all fifteen for expansion coverage. Mixed-pool rates are not a causal before/after comparison. This candidate is not competitively certified, and simulation cannot certify tutorial learnability or human enjoyment.

## First session checklist

1. Open Arsenal from the large central menu. Inspect the new faction designs, roles and keyword definitions.
2. Select a preserved starter/preset and choose **Make editable copy**. Name the copy, replace cards, try quantity controls and inspect the curve/command/strategy summaries.
3. Save a legal **26/26** list. Export/import it, duplicate a variant and confirm illegal drafts retain explained repair paths while Play stays disabled.
4. Start a match with the saved deck. Confirm the selected list is the actual inventory and ordinary free deployments still work at zero commands.
5. Use Mark before a positive combat follow-up; inspect shields/Armor and expiration. Reinforce a wounded defender through the enemy turn. Choose each Field Options mode explicitly.
6. Watch capture retreat/elimination, finish a match, rematch and export feedback. Compare custom decks in War Room only when choosing to run your own experiment.
7. Revisit Tutorial/Field Manual, native fullscreen, Settings/pause/recovery and narrow-window controls to confirm Sprint 6 behavior remains clear.

Existing local deck storage is preserved; unreadable data must remain recoverable rather than being silently replaced. Native/browser/offline storage origins differ, so exchange deck JSON when moving between them.

## Verified candidate evidence

**215/215 Node tests passed**, including **38 additions** since v0.7.0: 18 rule/AI, 10 content/schema, six deck/library and four integration regressions. Coverage includes all new cards/modes, hidden-information independence, hybrid intent, old-profile preservation, deck recovery/import/export, assets/templates and corrected unit-only class summaries.

**Eight browser suites passed:** command/flow/preferences/tutorial, preserved Arsenal/War Room, expanded Arsenal, custom-deck match and current War Room. All eleven lessons completed through actual clicks with Learning victory and loss/retry across six viewports. Adapt's three modes, Mark/Reinforce expiration and forecasts passed; a real custom Rogue deck conquered against Nightwalker in **114 decisions / 19 turns**. One current Worker/Node fixture and the preserved Worker/Node/offline fixture agree exactly. These are correctness tests, not balance campaigns or proof of human learnability.

Four packaged native smokes passed using isolated temporary user data:

- **Shell:** menu/setup/Settings, playable tutorial deployment, actual F11 fullscreen and Alt+Enter windowed input, and visible installed version 0.8.0.
- **Game:** Planned Exposure versus Field Improvisation reached conquest for Player 2 in **98 decisions / 18 offensive turns**.
- **Arsenal:** loaded **115 cards and a 26-card deck**.
- **War Room:** cooperative execution completed **two deterministic fixtures with zero errors/cutoffs**.

Release verification confirmed **62 packaged source/runtime files match the final source byte for byte**, all **31 preserved Sprint 5 baseline hashes remain unchanged**, production updater dependencies are present and development material is excluded. Electron **44.5.1**, updater **6.8.9**, sandboxing, context isolation and disabled native Node integration remain. The [release manifest](release-0.8.0-manifest.json) records exact versions, hashes, validation and limits; a copy accompanies `release/0.8.0`.

No publication or installation over the owner's existing copy occurred. The [v0.7.0 entry checkpoint](checkpoints/sprint7-entry-v0.7.0.zip), [final v0.8.0 source archive](checkpoints/sprint7-v0.8.0.zip), previous installer, release manifests and baseline archives preserve the work. The automated/native tutorial checks do not establish inexperienced-human learnability. Signature bespoke artwork, final audio, human balance work and online services remain future scope; new cards reuse the coherent optimized faction portrait pipeline. The old competitive baseline is unhealthy; this candidate has not received a fresh statistical certification.

## Rebuild boundary

```text
npm test
npm run build -- --win nsis --publish never
```

The final build used the command above with publication disabled and package-derived version metadata. A direct executable smoke does not prove installation over an existing copy or real update-server delivery. Uploading/releasing anything requires the existing explicit owner workflow.

## Next simulation request

[Sprint 7 specifies two exact, separately authorized jobs](SPRINT-007.md#simulation-request--after-the-stable-candidate): **10,000 games with the original ten presets**, followed after review by **10,000 with all fifteen presets**. Both request `sprint7`, deck policy without a live difficulty override, seed 20261003, paired seats, exact mirrors off, same-faction variants included, default rules, verification, 240-turn/10,000-decision safeguards and JSON/HTML/CSV exports without rich batch traces. Neither job has run or is automatically authorized; the expanded pool changes opponent weighting and cannot replace the original-pool comparison.
