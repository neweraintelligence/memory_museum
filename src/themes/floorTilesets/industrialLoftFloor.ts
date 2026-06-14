/**

 * Industrial Loft floor source toggle.

 *

 * Revert to brown PNG floors: set INDUSTRIAL_LOFT_FLOOR_SOURCE = 'brown-png'

 */



export type IndustrialLoftFloorSource = 'brown-png' | 'white-wood';



export const INDUSTRIAL_LOFT_FLOOR_SOURCE: IndustrialLoftFloorSource = 'brown-png';



/** Bump when replacing PNGs in public/floors/ so browsers reload textures. */

export const FLOOR_ASSET_VERSION = 2;



const v = FLOOR_ASSET_VERSION;

const floor = (name: string) => `floors/${name}.png?v=${v}`;



const SOURCES = {

  'brown-png': {

    floorTextures: [floor('industrial-loft-floor-a'), floor('industrial-loft-floor-b')] as [

      string,

      string,

    ],

    floorTextureAspect: 'iso' as const,

  },

  'white-wood': {

    floorTextures: [floor('white-wood-floor-a'), floor('white-wood-floor-b')] as [string, string],

    floorTextureAspect: 'iso' as const,

  },

};



export const INDUSTRIAL_LOFT_FLOOR = SOURCES[INDUSTRIAL_LOFT_FLOOR_SOURCE];

