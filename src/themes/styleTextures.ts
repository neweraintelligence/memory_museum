export interface StyleTextureSet {
  floorTextures: [string, string];
  floorTextureAspect: 'iso';
  wallTextures: { left: string; right: string };
}

/** Bump when replacing generated architectural style PNGs. */
export const ARCHITECTURAL_STYLE_ASSET_VERSION = 28;

const v = ARCHITECTURAL_STYLE_ASSET_VERSION;
const floor = (slug: string, variant: 'a' | 'b') => `floors/${slug}-floor-${variant}.png?v=${v}`;
const wall = (slug: string, side: 'left' | 'right') =>
  `walls/${slug}-wall-${side}-a.png?v=${v}`;

const textureSet = (slug: string): StyleTextureSet => ({
  floorTextures: [floor(slug, 'a'), floor(slug, 'b')],
  floorTextureAspect: 'iso',
  wallTextures: {
    left: wall(slug, 'left'),
    right: wall(slug, 'right'),
  },
});

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
  'stone-keep': textureSet('stone-keep'),
  'reading-study': textureSet('reading-study'),
};
