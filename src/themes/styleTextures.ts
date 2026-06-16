export interface StyleWallTextures {
  left: string;
  right: string;
  /** When set, alternates with `left` per wall segment (same checker as floor tiles). */
  leftAlt?: string;
  /** When set, alternates with `right` per wall segment (same checker as floor tiles). */
  rightAlt?: string;
}

export interface StyleTextureSet {
  floorTextures: readonly [string, string] | readonly [string, string, string, string];
  floorTextureAspect: 'iso';
  wallTextures: StyleWallTextures;
}

/** Bump when replacing generated architectural style PNGs. */
export const ARCHITECTURAL_STYLE_ASSET_VERSION = 30;

const v = ARCHITECTURAL_STYLE_ASSET_VERSION;
const floor = (slug: string, variant: 'a' | 'b' | 'c' | 'd') =>
  `floors/${slug}-floor-${variant}.png?v=${v}`;
const wall = (slug: string, side: 'left' | 'right', variant: 'a' | 'b' = 'a') =>
  `walls/${slug}-wall-${side}-${variant}.png?v=${v}`;

const textureSet = (slug: string): StyleTextureSet => ({
  floorTextures: [floor(slug, 'a'), floor(slug, 'b')],
  floorTextureAspect: 'iso',
  wallTextures: {
    left: wall(slug, 'left'),
    right: wall(slug, 'right'),
  },
});

/** Pick floor texture index — 2-way uses checker `(gx + gy) % 2`; 4-way uses a 2×2 repeat. */
export function floorVariantIndex(gx: number, gy: number, variantCount: 2 | 4): number {
  if (variantCount === 2) return (gx + gy) % 2;
  return (gx & 1) | ((gy & 1) << 1);
}

/** Pick A or B wall texture for a segment — matches 2-way floor checker `(gx + gy) % 2`. */
export function wallSegmentUsesAlt(gx: number, gy: number): boolean {
  return (gx + gy) % 2 !== 0;
}

export function pickWallSegmentTexture(
  seg: { gx: number; gy: number; side: 'left' | 'right' },
  wallTextures: StyleWallTextures | undefined,
  loaded: {
    left: HTMLImageElement | null;
    leftAlt: HTMLImageElement | null;
    right: HTMLImageElement | null;
    rightAlt: HTMLImageElement | null;
  },
): HTMLImageElement | null {
  if (!wallTextures) return null;
  const altPath = seg.side === 'left' ? wallTextures.leftAlt : wallTextures.rightAlt;
  const useAlt = wallSegmentUsesAlt(seg.gx, seg.gy) && !!altPath;
  if (seg.side === 'left') {
    return (useAlt ? loaded.leftAlt : loaded.left) ?? loaded.left;
  }
  return (useAlt ? loaded.rightAlt : loaded.right) ?? loaded.right;
}

export const STYLE_TEXTURES: Record<string, StyleTextureSet> = {
  'gothic-library': textureSet('gothic-library'),
  brutalist: textureSet('brutalist'),
  'tea-room': textureSet('tea-room'),
  spaceship: textureSet('spaceship'),
  'enterprise-d': textureSet('enterprise-d'),
  courtroom: textureSet('courtroom'),
  clinic: textureSet('clinic'),
  greenhouse: textureSet('greenhouse'),
  'cozy-apartment': textureSet('cozy-apartment'),
  'marble-hall': textureSet('marble-hall'),
  'stone-keep': {
    ...textureSet('stone-keep'),
    floorTextures: [
      floor('stone-keep', 'a'),
      floor('stone-keep', 'b'),
      floor('stone-keep', 'c'),
      floor('stone-keep', 'd'),
    ],
    wallTextures: {
      left: wall('stone-keep', 'left', 'a'),
      right: wall('stone-keep', 'right', 'a'),
      leftAlt: wall('stone-keep', 'left', 'b'),
      rightAlt: wall('stone-keep', 'right', 'b'),
    },
  },
  'reading-study': textureSet('reading-study'),
};
