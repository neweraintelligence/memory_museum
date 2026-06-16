---
name: reposition-imported-object
description: >-
  Import and reposition isometric PNG floor objects in Memory Museum — tile
  anchoring, rotation sprites, ground/center auto-detect, and fine-tuning.
  Use when adding sprite props, importing PNG furniture, fixing floating or
  off-center objects, or when the user says "position like the chair",
  "reposition imported object", or "sprite looks wrong on the tile".
disable-model-invocation: true
---

# Reposition Imported Object

Import PNG props into the isometric room canvas and anchor them on floor tiles the same way as the **chair** (canonical reference).

## Key files

| File | Role |
|------|------|
| `public/objects/*.png` | Sprite assets (RGBA, square canvas) |
| `src/themes/objects.ts` | `OBJECT_LIBRARY` entries + tuning fields |
| `src/themes/objectSprites.ts` | Rotation → sprite URL + flip |
| `src/render/useObjectSprite.ts` | Load PNG; auto-detect `groundY` + `centerX` |
| `src/render/IsoObject.tsx` | Draw sprite at tile anchor |
| `src/themes/icons.tsx` | Panel/library icon (`OBJECT_ICONS`) |

## Tile anchor model

Objects anchor at the **center of their floor tile** (`y = 0` = contact point).

Sprite draw position:

```
x = -spriteH/2 + (centerX * spriteH) + spriteXOffset
y = -spriteH * groundY + spriteYOffset
```

- **`spriteHeight`** — display size in canvas px (1-tile props: start at `96`)
- **`groundY`** — auto-detected (0–1 from top to feet); override with `spriteGround`
- **`centerX`** — auto-detected horizontal weight; override with `spriteXOffset`
- **`spriteYOffset`** — + = south/down on screen (+ = lower)
- **`spriteXOffset`** — + = right

Auto-detect scans the **bottom 28%** of each PNG (weighted alpha). It ignores faint shadow fringes and uneven canvas padding. Do not anchor to the bottommost transparent pixel row.

## Import workflow

Copy this checklist:

```
- [ ] Copy PNG(s) to public/objects/{kind}-0.png, {kind}-1.png, ...
- [ ] Add ObjectDef to OBJECT_LIBRARY in src/themes/objects.ts
- [ ] Add icon mapping in src/themes/icons.tsx (react-icons/gi)
- [ ] Set sprites, spriteHeight (~96), defaultRotation
- [ ] Place in room; tune spriteYOffset until centered and slightly south on tile
- [ ] Hard-refresh browser after replacing PNGs (metrics cache by URL)
```

### ObjectDef template (1-tile floor prop)

```typescript
{
  kind: 'lamp',
  label: 'Floor Lamp',
  icon: '💡',
  color: '#c4a574',
  category: 'Furniture',
  sprites: ['objects/lamp-0.png', 'objects/lamp-1.png'],
  spriteHeight: 96,
  spriteYOffset: 8,  // tune after visual check; chair uses 8
  defaultRotation: 0,
},
```

### Rotation sprites

| PNG count | Behavior |
|-----------|----------|
| **2** | Diagonal views; rotations 0/1 use sprites 0/1; rotations 2/3 mirror them |
| **4** | One PNG per facing (0–3), no mirror |

Logic lives in `objectSpriteFrame()` in `src/themes/objectSprites.ts`.

### PNG prep (helps auto-detect)

- Square PNG, **RGBA transparency**
- Isometric 2:1 style, same angle as existing props
- Object centered horizontally; feet in the **lower third**
- Soft ground shadow OK; avoid huge empty padding below feet

## Reposition / tune workflow

When the user reports bad placement, adjust in this order:

1. **Let auto-detect run first** — only override if wrong
2. **Floating** → increase `spriteYOffset` by 2–4 px (chair: `8`)
3. **Sinking** → decrease `spriteYOffset`
4. **Off-center horizontally** → `spriteXOffset` ±2–4 (auto usually enough)
5. **Too big/small** → change `spriteHeight` (try `88`, `96`, `112`)
6. **Shadow breaks vertical detect** → set manual `spriteGround` (e.g. `0.78`)
7. **Wrong facing on R** → swap sprite files or add 3rd/4th PNG

Match the **chair** feel: feet on tile, slightly south of geometric center, horizontally centered.

## Reference implementation

Chair in `src/themes/objects.ts`:

```typescript
sprites: ['objects/chair-0.png', 'objects/chair-1.png'],
spriteHeight: 96,
spriteYOffset: 8,
defaultRotation: 0,
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Floating above tile | ↑ `spriteYOffset` |
| Clipping into floor | ↓ `spriteYOffset` |
| Left/right drift | `spriteXOffset` or check PNG horizontal padding |
| Black box around art | PNG must be RGBA; re-export with transparency |
| Stale look after PNG swap | Hard-refresh; optional `clearObjectSpriteCache()` |
| Double floor shadow | Sprites skip procedural shadow in `IsoObject.tsx` — expected |

## Scope limits

- This skill covers **floor sprite objects** only (`sprites` on `ObjectDef`).
- **Wall-mounted** objects use `wallAttach: true` and `wallFeature.tsx` — different pipeline.
- **2-tile** objects need `footprint: 2` (see bed); sizing may need larger `spriteHeight`.

## User prompt templates

**New import:**

```
Import a sprite object like the chair:
- Kind: {kind}, Label: {label}, Category: {category}
- PNGs: [attached or paths in public/objects/]
- {1 or 2} tile footprint, {2 or 4} rotation views
- Position like the chair: auto ground/center, tune spriteYOffset until
  centered and slightly south on the tile.
```

**Reposition only:**

```
Reposition the {kind} sprite — it's floating / too far north / off-center.
Use the reposition-imported-object skill. Match chair placement.
```

For extended file map and formulas, see [reference.md](reference.md).
