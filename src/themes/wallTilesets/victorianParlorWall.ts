/** Victorian Parlor wall PNG textures. */

/** Bump when replacing PNGs in public/walls/ so browsers reload textures. */
export const VICTORIAN_PARLOR_WALL_ASSET_VERSION = 3;

const wall = (side: 'left' | 'right', variant: 'a' | 'b') =>
  `walls/victorian-parlor-wall-${side}-${variant}.png?v=${VICTORIAN_PARLOR_WALL_ASSET_VERSION}`;

export const VICTORIAN_PARLOR_WALL = {
  wallTextures: {
    left: wall('left', 'a'),
    right: wall('right', 'a'),
    leftAlt: wall('left', 'b'),
    rightAlt: wall('right', 'b'),
  },
};
