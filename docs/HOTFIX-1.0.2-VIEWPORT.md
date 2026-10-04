# Frontlines v1.0.2 — battlefield viewport hotfix

This local candidate fixes normal-match viewport fitting. It preserves the completed Commander artwork candidate and the v1.0.1 ordinary-card artwork restoration. It is packaged separately under `release/1.0.2-viewport-hotfix/`; earlier installers and source checkpoints remain intact.

## Cause and change

Fixed territory minimum heights competed with the Commander row for space. The map could therefore scroll internally even when the application page was constrained. The hand column also retained its intrinsic height, and implicit HUD rows squeezed Presence labels on short windows.

Only `commander-ui.css` changes at runtime. Scoped normal-match desktop rules let territories and rosters use their actual grid tracks, keep the hand inside its allocated height, compact spacing and deployed cards on shorter windows, and retain readable Presence labels and Commander controls. Optional contextual hints occupy the existing detail column on short windows. Tutorial and non-match layouts are excluded.

The hand keeps its local scrolling. At unusually short or scaled effective viewports, individual unit rosters may also scroll locally; the map and page remain stationary. Commander passive and availability details retain existing local scrolling and inspection access.

## Focused verification

- Populated fixture: five units on each side of the objective, assembled through legal actions.
- Required sizes: 1920×1080, 1600×900, 1366×768, and 1280×720. All seven territories and all ten deployed units fit without page or map scrolling.
- Additional sizes: 1366×680, 1280×600, 1093×614, 1024×576, and 900×600, plus a resize back to 1366×768.
- Windows scaling equivalents: 1366×768 at 125%, 1600×900 at 150%, and 1920×1080 at 150%, using the corresponding effective CSS viewport and device scale.
- Real interaction checks cover deployment, movement targeting, hand selection, Commander inspection/targeting, End Turn, and expired animation overlays.
- All ten Commanders pass name, active-cost text, and status checks at 1280×720 and 1024×576 (20 cases). Both players' near-victory HUD warnings fit at those sizes (four cases).
- Ten focused artwork/presentation regressions pass.
- The packaged Windows app passes the native shell smoke: F11 fullscreen, Alt+Enter back to windowed, setup/settings, tutorial deployment, Commander activation, and version display. The isolated smoke profile leaves the owner's data untouched.
- Package verification matches all 93 runtime files to tested source, excludes development material, and verifies 31 frozen baseline files.
- No balance simulations or complete-match campaigns are part of this patch.

Browser regression: `tests/browser-battlefield-viewport-hotfix.js`. Detailed local evidence: `test-results/viewport-hotfix-browser.json` and the matching viewport screenshots.

## Scope protection

Hash comparison with `docs/release-1.0.2-manifest.json` proves the other 92 runtime files are unchanged. Artwork assets and mappings, mechanics, card pool, decks, AI, save data, economy, tutorial content, audio, and animation logic retain their approved bytes. This is a local build candidate; it has not been published or installed over the owner's copy.

Package hashes and final native verification are recorded in `docs/viewport-hotfix-1.0.2-manifest.json`.

Installer: `release/1.0.2-viewport-hotfix/Frontlines-Setup-1.0.2.exe` (114,610,308 bytes). SHA-256: `7a214a5e1a4fbb86e85f85b9a02b221df42c1fc114de594a39ff924ac9458a0d`.
