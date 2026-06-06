// Shared drawing helpers for the detailed ("32-bit") object + room art.
import { shade } from '../lib/color';
import { TILE_W, TILE_H } from '../lib/iso';

export interface Palette {
  base: string;
  light: string;
  lighter: string;
  dark: string;
  darker: string;
  outline: string;
}

/** Derive a small tonal ramp from a single base color, sprite-art style. */
export function palette(color: string): Palette {
  return {
    base: color,
    light: shade(color, 0.2),
    lighter: shade(color, 0.42),
    dark: shade(color, -0.16),
    darker: shade(color, -0.34),
    outline: shade(color, -0.62),
  };
}

export interface BoxFaces {
  top: number[];
  left: number[];
  right: number[];
}

/**
 * Build the three visible faces of an isometric box.
 * Origin (0,0) is the box's base center (where it meets the floor).
 * hw/hh are the screen half-extents of the footprint diamond; h is the height.
 */
export function isoBoxFaces(hw: number, hh: number, h: number, baseY = 0): BoxFaces {
  return {
    top: [0, baseY - hh - h, hw, baseY - h, 0, baseY + hh - h, -hw, baseY - h],
    left: [-hw, baseY, 0, baseY + hh, 0, baseY + hh - h, -hw, baseY - h],
    right: [0, baseY + hh, hw, baseY, hw, baseY - h, 0, baseY + hh - h],
  };
}

/** Footprint diamond (flat on the ground) centered at origin. */
export function diamond(hw: number, hh: number, baseY = 0): number[] {
  return [0, baseY - hh, hw, baseY, 0, baseY + hh, -hw, baseY];
}

export const OBJ_HW = TILE_W * 0.3;
export const OBJ_HH = TILE_H * 0.3;

export type Archetype =
  | 'crate'
  | 'light'
  | 'plant'
  | 'panel'
  | 'figure'
  | 'book'
  | 'bed'
  | 'desk'
  | 'cabinet'
  | 'chest'
  | 'door'
  | 'clock'
  | 'key'
  | 'weapon'
  | 'hourglass'
  | 'vessel'
  | 'machine';

// Route every object kind to a drawing archetype.
const ARCHETYPE_BY_KIND: Record<string, Archetype> = {
  // light emitters
  lamp: 'light',
  candle: 'light',
  gem: 'light',
  crystal: 'light',
  star: 'light',
  fountain: 'light',
  // greenery
  plant: 'plant',
  tree: 'plant',
  flower: 'plant',
  // flat framed art
  painting: 'panel',
  mirror: 'panel',
  map: 'panel',
  document: 'panel',
  window: 'panel',
  // upright figures on a pedestal
  statue: 'figure',
  'gold-statue': 'figure',
  mask: 'figure',
  skull: 'figure',
  anatomy: 'figure',
  crown: 'figure',
  pillar: 'figure',
  // books
  book: 'book',
  books: 'book',
  scroll: 'book',
  // dedicated furniture / props
  bed: 'bed',
  desk: 'desk',
  cabinet: 'cabinet',
  chest: 'chest',
  door: 'door',
  clock: 'clock',
  key: 'key',
  weapon: 'weapon',
  hourglass: 'hourglass',
  flask: 'vessel',
  jar: 'vessel',
  machine: 'machine',
  // everything else falls back to a detailed crate
};

export function archetypeFor(kind: string): Archetype {
  return ARCHETYPE_BY_KIND[kind] ?? 'crate';
}
