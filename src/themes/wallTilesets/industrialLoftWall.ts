/**
 * Industrial Loft wall source toggle.
 *
 * Revert to procedural brick: set USE_WALL_TEXTURES = false
 */

export const USE_WALL_TEXTURES = true;

/** Bump when replacing PNGs in public/walls/ so browsers reload textures. */
export const WALL_ASSET_VERSION = 4;

const PROCEDURAL = {};

const TEXTURED = {
  wallTextures: {
    left: `walls/industrial-loft-wall-left-a.png?v=${WALL_ASSET_VERSION}`,
    right: `walls/industrial-loft-wall-right-a.png?v=${WALL_ASSET_VERSION}`,
  },
};

export const INDUSTRIAL_LOFT_WALL = USE_WALL_TEXTURES ? TEXTURED : PROCEDURAL;
