# Frontlines v1.0.1 — emergency card-art restoration

This amends v1.0.0 by restoring the illustrated card artwork used in v0.9.0. The v1.0 procedural SVG layer was covering the original portraits; it is removed from ordinary unit and deployable Leader cards. Order/Asset symbols retain their original rendering. All 115 card renders match the v0.9 contract exactly across hand, Arsenal and effect class names.

The shared renderer restores portraits in the hand, battlefield, inspection, Arsenal, Collection, packs and deployment effects. Commander gameplay, named Commander portraits, decks, saves, card frames, animations and rules remain as shipped in v1.0.0.

[Windows installer](../release/1.0.1/Frontlines-Setup-1.0.1.exe) · [Installation-free app](../release/1.0.1/win-unpacked/Frontlines.exe). Keep the complete unpacked folder together. The installer is unsigned. This is a local build; nothing is published or installed over the owner's copy.

Validation: 298/298 Node tests pass. Focused browser checks verify the original atlas portraits are visible without SVG overlays across supported resolutions. All five packaged native modes pass, and 83 packaged runtime files match source. The installer SHA-256 is `8277d0b8725473b535df895af232fafa4d0a2754fc8759ef07bff4fca8103ed1`. Package/native results and exact artifact hashes are recorded in the [manifest](release-1.0.1-manifest.json). The original [v1.0.0 build](RELEASE-1.0.0.md) and checkpoint remain preserved.
