# Sprint 12 painted artwork sources

The source set replaces 40 Tactical Arsenal vector compositions, 39 legacy Order/Asset glyphs, and nine legacy card mappings with missing role equipment. Three further legacy role repairs reuse exact strong source-atlas quadrants. Original atlases and all Commander artwork remain preserved.

`jobs-plan.json` describes 23 generated square PNG masters: twenty-two precise 2×2 sheets and one standalone Bruiser drummer painting. The sheets are native 1,254×1,254 pixels, giving 627×627 source cells. Three Stonewall medical-support cards deliberately share one reviewed role painting; each receives a stable individual runtime path. Three original 512×512 atlas crops are reused without enlargement.

The runtime export contains 91 stable card-ID mappings and 89 distinct encoded paintings. Every WebP is 512×512 at quality 88, for 7,074,746 total bytes. Uniform downsampling and cover cropping preserve proportions; no image is stretched or enlarged.

`generation-*.json` preserves all 23 exact executed prompts and original returned PNG paths. Those original generated files were copied, not moved. The six earliest batch records truthfully mark their unretained raw output hints as null, with explanatory notes; the exact prompts, original paths and copied source hashes remain available. The pilot prompt differs from the later design-plan wording and is recorded separately.

`manifest.json` records source and runtime hashes, native dimensions, exact crop coordinates, encoded sizes, focal points and artwork review status. Its design-plan prompt is explicitly distinguished from the exact executed prompt. `art-map012.js` is the trusted, deeply frozen runtime registry; imported arbitrary artwork URLs are not accepted.

Run the read-only source preflight:

```sh
node scripts/optimize-sprint12-art.js --check
```

The optimizer refuses to publish any asset when a required source or exact execution record is missing, a source is too small, a crop is invalid, or a path escapes its approved asset namespace. It decodes and prepares every replacement before publishing the complete map. Running a new export deliberately returns artwork grades to provisional until actual rendered cards are reviewed.

The legacy before/framing evidence is immutable. Current-card evidence is captured separately:

```sh
node scripts/audit-sprint12-legacy-art.js --after
```

All 115 legacy after faces and ten protected Commander benchmarks are in `docs/art/sprint12-after/`. The separate Tactical Arsenal and cross-surface audits complete the full 155-card quality gate. During this artwork work, no mechanics, balance values, complete matches or large simulations were changed or run.
