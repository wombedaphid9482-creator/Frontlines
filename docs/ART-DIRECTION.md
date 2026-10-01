# Project Faction Cards — reusable art foundation

The starter library uses **five illustrated faction atlases**, each with four separately composed role portraits. Twenty concepts cover the existing sixty cards without requiring a new painting for every duplicate or stat variant.

## Shared illustration recipe

Graphic-novel military concept painting, confident ink-like contours, angular shapes, limited texture, strong silhouette, dramatic rim lighting, restrained science-fiction equipment. No hyper-realism, typography, logos, frames, or watermarks inside the illustrations. Heads and equipment remain readable as small crops. Characters are generic roles, not new canonical named characters.

Each square atlas contains a strict equal 2×2 grid with no gutters:

| Position | Role |
| --- | --- |
| Top left | Rifle infantry |
| Top right | Heavy |
| Bottom left | Specialist |
| Bottom right | Commander |

The UI selects a role through `FrontlinesArt.get(card)` and uses a 200% background crop. Unit thumbnails, hand cards, deck previews, and inspectors share the same artwork. Orders and Assets keep explicit support/tactical symbols so their role remains clear.

## Faction definitions

| Faction | Palette | Silhouette and equipment | Emblem / frame motif |
| --- | --- | --- | --- |
| Stonewall | Steel blue, pale cyan, off-white | Reinforced armor, broad shields, bunker plating | Angular shield and reinforced corners |
| The Syndicate | Graphite, ochre gold | Clean professional armor, tactical optics, advanced rifles | Nested corporate hexagons and fine circuit lines |
| Bruiser | Charcoal, rust orange | Oversized weapons, bulky silhouettes, exposed reinforcement | Shock diamond and aggressive chevrons |
| Nightwalker | Near black, violet | Masks, narrow profiles, suppressed weapons, reconnaissance electronics | Split veil and thin light strips |
| Rogue | Olive charcoal, mint green | Patched mixed armor, customized rifles, asymmetrical packs | Broken route arrow and offset framing |

`art.js` owns reusable theme definitions and art lookup. `assets/ui/faction_emblems/` holds editable SVG marks. These preliminary marks establish a consistent prototype language and remain easy to replace.

## Files and future assets

```text
assets/cards/<faction>/starter-atlas.webp   optimized runtime artwork
assets/source/cards/<faction>/            original generated illustrations
assets/ui/faction_emblems/<faction>.svg    editable vector emblems
assets/battlefield/                       ground/map assets
assets/effects/                           future effect textures
assets/animations/                       future animated assets
assets/audio/                            future recorded audio
```

Keep original art in `source`, never load it in the match. Runtime atlases are compressed WebP files sized for hand-card display. A new bespoke portrait can be added by extending the lookup to provide its own file and crop. Do not bake card names, costs, stats, or rules into artwork; the data remains editable.

## Generation

The initial illustrations use the built-in image generation tool. The exact prompt set is saved in `assets/source/card-art-prompts.json`. Runtime conversion only resizes and compresses the source; no painted details are altered programmatically.

## Audio replacement hooks

Sprint 2 procedural Web Audio sounds are optional and default to muted. Replace the sound hook in `effects.js` with local recorded assets for selection, deployment, rifle bursts, heavy impact, damage, destruction, capture, resource gain, and victory. Audio must never gate a rules transition.
