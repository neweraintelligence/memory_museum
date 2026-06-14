/** Victorian Parlor floor PNG textures. */

/** Bump when replacing PNGs in public/floors/ so browsers reload textures. */
export const VICTORIAN_PARLOR_FLOOR_ASSET_VERSION = 1;

const v = VICTORIAN_PARLOR_FLOOR_ASSET_VERSION;
const floor = (name: string) => `floors/${name}.png?v=${v}`;

export const VICTORIAN_PARLOR_FLOOR = {
  floorTextures: [floor('victorian-parlor-floor-a'), floor('victorian-parlor-floor-b')] as [
    string,
    string,
  ],
  floorTextureAspect: 'iso' as const,
};
