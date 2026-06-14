# Reposition Imported Object — Reference

## Canvas constants

From `src/lib/iso.ts`:

- `TILE_W = 88`, `TILE_H = 44` (2:1 isometric diamond)
- 1-tile sprite canvas target: **96×96 px** display (`spriteHeight: 96`)

## Auto-detect algorithm

`detectSpriteMetrics()` in `src/render/useObjectSprite.ts`:

1. Draw PNG to offscreen canvas
2. Scan rows from `72%` height to bottom
3. For pixels with alpha > 48, accumulate weighted `sumY`, `sumX`, `sumA`
4. `groundY = (sumY/sumA + 1) / height`
5. `centerX = sumX/sumA / width - 0.5`

Results cached per image URL in `metricsCache`.

## Manual overrides on ObjectDef

| Field | Type | Effect |
|-------|------|--------|
| `spriteHeight` | number | Scaled draw size (square) |
| `spriteGround` | 0–1 | Overrides auto `groundY` |
| `spriteYOffset` | px | + = move down (south) |
| `spriteXOffset` | px | + = move right |
| `footprint` | 1 or 2 | Tiles occupied (bed = 2) |
| `defaultRotation` | 0–3 | Initial facing when placed |

## Rotation mapping (2 sprites)

From `TWO_VIEW_FRAMES` in `objectSprites.ts`:

| Rotation | Sprite | Flip X |
|----------|--------|--------|
| 0 | `sprites[0]` | no |
| 1 | `sprites[1]` | no |
| 2 | `sprites[0]` | yes |
| 3 | `sprites[1]` | yes |

## Files touched for a new sprite object

1. `public/objects/{name}-{0,1,...}.png`
2. `src/themes/objects.ts` — library entry
3. `src/themes/icons.tsx` — `OBJECT_ICONS` entry (if new kind)

No changes needed to `IsoObject.tsx` or `useObjectSprite.ts` unless adding new behavior.

## Chair tuning history (for calibration)

- Initial issue: anchored to shadow fringe → floating
- Fix: weighted bottom-band detect (not bottommost pixel)
- Final polish: `spriteYOffset: 8` for slightly south, centered on tile
- Auto `centerX` handles uneven PNG horizontal padding per rotation view

When tuning a new object, start `spriteYOffset: 8` and adjust ±2–4 based on screenshot feedback.
