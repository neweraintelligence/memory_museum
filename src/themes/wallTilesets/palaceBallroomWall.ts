/** Palace Ballroom wall PNG textures. */

/** Bump when replacing PNGs in public/walls/ so browsers reload textures. */
export const PALACE_BALLROOM_WALL_ASSET_VERSION = 3;

const wall = (side: 'left' | 'right', variant: 'a' | 'b') =>
  `walls/palace-ballroom-wall-${side}-${variant}.png?v=${PALACE_BALLROOM_WALL_ASSET_VERSION}`;

export const PALACE_BALLROOM_WALL = {
  wallTextures: {
    left: wall('left', 'a'),
    right: wall('right', 'a'),
    leftAlt: wall('left', 'b'),
    rightAlt: wall('right', 'b'),
  },
};
