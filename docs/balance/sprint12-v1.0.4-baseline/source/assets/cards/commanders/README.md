# Commander illustration pipeline

These ten original, code-native SVG portraits share the same graphic-novel armor,
faction palette and military framing as the expanded card illustration system.
They are optimized runtime assets (about 23 KB total); no external image or font
is required. `art.js` preserves the editable source geometry in `commanderSvg`.

To regenerate the portraits after an art change, run from the project root:

```js
const fs = require('node:fs');
const Art = require('./art');
for (const id of Object.keys(Art.COMMANDER_ART)) {
  fs.writeFileSync(`assets/cards/commanders/${id}.svg`, Art.commanderSvg(id));
}
```

`commanderGet` resolves an asset, and `commanderHtml` provides an escaped semantic
portrait region. Alternate portraits can replace that lookup without touching
Commander rules. Card illustrations use `identity` / `illustration` over the
preserved faction atlas backdrops; safe paint regions remain separate from card
nameplates, rules text, stats and cosmetics.
