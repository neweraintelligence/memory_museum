/** Palace Ballroom floor PNG textures. */

/** Bump when replacing PNGs in public/floors/ so browsers reload textures. */
export const PALACE_BALLROOM_FLOOR_ASSET_VERSION = 1;

const v = PALACE_BALLROOM_FLOOR_ASSET_VERSION;
const floor = (name: string) => `floors/${name}.png?v=${v}`;

export const PALACE_BALLROOM_FLOOR = {
  floorTextures: [floor('palace-ballroom-floor-a'), floor('palace-ballroom-floor-b')] as [
    string,
    string,
  ],
  floorTextureAspect: 'iso' as const,
};
