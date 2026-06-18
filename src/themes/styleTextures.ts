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
  'timeless-library': textureSet('timeless-library'),
  'brutalist-atrium': textureSet('brutalist-atrium'),
  'tea-room': textureSet('tea-room'),
  'futuristic-lab': textureSet('futuristic-lab'),
  'enterprise-d': textureSet('enterprise-d'),
  courtroom: textureSet('courtroom'),
  clinic: textureSet('clinic'),
  greenhouse: textureSet('greenhouse'),
  'beach-house': textureSet('beach-house'),
  'marble-hall': textureSet('marble-hall'),
  'gothic-belfry': {
    ...textureSet('gothic-belfry'),
    floorTextures: [
      floor('gothic-belfry', 'a'),
      floor('gothic-belfry', 'b'),
      floor('gothic-belfry', 'c'),
      floor('gothic-belfry', 'd'),
    ],
    wallTextures: {
      left: wall('gothic-belfry', 'left', 'a'),
      right: wall('gothic-belfry', 'right', 'a'),
      leftAlt: wall('gothic-belfry', 'left', 'b'),
      rightAlt: wall('gothic-belfry', 'right', 'b'),
    },
  },
  'private-study': textureSet('private-study'),
};
