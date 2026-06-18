export type FloorPattern =
  | 'none'
  | 'planks'
  | 'tatami'
  | 'tiles'
  | 'metal'
  | 'slab'
  | 'marble'
  | 'parquet'
  | 'brick'
  | 'carpet'
  | 'stone';
export type WallPattern =
  | 'shelves'
  | 'panels'
  | 'screens'
  | 'tech'
  | 'plain'
  | 'glass'
  | 'concrete'
  | 'brick'
  | 'stone'
  | 'wood'
  | 'wallpaper';

import { INDUSTRIAL_LOFT_FLOOR } from './floorTilesets/industrialLoftFloor';
import { INDUSTRIAL_LOFT_WALL } from './wallTilesets/industrialLoftWall';
import { PALACE_BALLROOM_FLOOR } from './floorTilesets/palaceBallroomFloor';
import { PALACE_BALLROOM_WALL } from './wallTilesets/palaceBallroomWall';
import { STYLE_TEXTURES, type StyleWallTextures } from './styleTextures';

export interface RoomStyle {
  id: string;
  label: string;
  floorA: string;
  floorB: string;
  wallLeft: string;
  wallRight: string;
  accent: string;
  bg: string; // canvas background wash
  mood: string;
  floorPattern: FloorPattern;
  wallPattern: WallPattern;
  /** PNG paths for floor tiles [A, B] or [A, B, C, D] relative to /public. */
  floorTextures?: readonly [string, string] | readonly [string, string, string, string];
  /** Degrees to rotate floor textures (Konva: negative = left/CCW). */
  floorTextureRotation?: number;
  /** 'iso' = native 2:1 diamond PNG; 'square' = square canvas (default). */
  floorTextureAspect?: 'square' | 'iso';
  /** PNG paths for left/right wall faces — replaces gradient + wallPattern decor. */
  wallTextures?: StyleWallTextures;
}

export const ROOM_STYLES: RoomStyle[] = [
  {
    id: 'timeless-library',
    label: 'Timeless Library',
    floorA: '#3b2f2a',
    floorB: '#332823',
    wallLeft: '#4a3a33',
    wallRight: '#5a473d',
    accent: '#caa86a',
    bg: '#1b1410',
    mood: 'Dark wood, candlelight, towering shelves.',
    floorPattern: 'none',
    wallPattern: 'shelves',
    ...STYLE_TEXTURES['timeless-library'],
  },
  {
    id: 'brutalist-atrium',
    label: 'Brutalist Atrium',
    floorA: '#9a9a9a',
    floorB: '#8d8d8d',
    wallLeft: '#7d7d7d',
    wallRight: '#919191',
    accent: '#e2552b',
    bg: '#5c5c5c',
    mood: 'Raw concrete, hard shadows, monumental.',
    floorPattern: 'slab',
    wallPattern: 'concrete',
    ...STYLE_TEXTURES['brutalist-atrium'],
  },
  {
    id: 'tea-room',
    label: 'Tea Room',
    floorA: '#cdab76',
    floorB: '#c4a26c',
    wallLeft: '#e9ddc7',
    wallRight: '#f2e9d8',
    accent: '#8a5a44',
    bg: '#e7dcc6',
    mood: 'Tatami, paper screens, quiet warmth.',
    floorPattern: 'tatami',
    wallPattern: 'screens',
    ...STYLE_TEXTURES['tea-room'],
  },
  {
    id: 'futuristic-lab',
    label: 'Futuristic Lab',
    floorA: '#1d2740',
    floorB: '#222d4a',
    wallLeft: '#27324f',
    wallRight: '#30406a',
    accent: '#3ad7ff',
    bg: '#0b1020',
    mood: 'Cold metal, neon seams, deep space.',
    floorPattern: 'metal',
    wallPattern: 'tech',
    ...STYLE_TEXTURES['futuristic-lab'],
  },
  {
    id: 'enterprise-d',
    label: 'Enterprise-D',
    floorA: '#7b6767',
    floorB: '#6b5858',
    wallLeft: '#8e5b64',
    wallRight: '#986561',
    accent: '#f1e6dd',
    bg: '#2d2025',
    mood: 'Padded rose wall panels, muted mauve carpet, soft starship lighting.',
    floorPattern: 'carpet',
    wallPattern: 'tech',
    ...STYLE_TEXTURES['enterprise-d'],
  },
  {
    id: 'courtroom',
    label: 'Old Courtroom',
    floorA: '#6e4a30',
    floorB: '#664430',
    wallLeft: '#7a5638',
    wallRight: '#8a6442',
    accent: '#d9c089',
    bg: '#39271a',
    mood: 'Dark oak, brass, solemn authority.',
    floorPattern: 'none',
    wallPattern: 'panels',
    ...STYLE_TEXTURES.courtroom,
  },
  {
    id: 'clinic',
    label: 'Medical Clinic',
    floorA: '#e8f1f3',
    floorB: '#dde9ec',
    wallLeft: '#cfe0e4',
    wallRight: '#e3eef0',
    accent: '#19b3a6',
    bg: '#eef6f7',
    mood: 'Sterile white, teal accents, clean light.',
    floorPattern: 'tiles',
    wallPattern: 'plain',
    ...STYLE_TEXTURES.clinic,
  },
  {
    id: 'greenhouse',
    label: 'Greenhouse',
    floorA: '#8a6f50',
    floorB: '#7d6447',
    wallLeft: '#bfe6cf',
    wallRight: '#d6f0df',
    accent: '#3fa35a',
    bg: '#cfeede',
    mood: 'Glass panes, lush foliage, soft daylight.',
    floorPattern: 'tiles',
    wallPattern: 'glass',
    ...STYLE_TEXTURES.greenhouse,
  },
  {
    id: 'beach-house',
    label: 'Beach House',
    floorA: '#c79a6a',
    floorB: '#bd9162',
    wallLeft: '#e7d3bd',
    wallRight: '#f0e0cd',
    accent: '#d97757',
    bg: '#efe2d2',
    mood: 'Warm wood, soft rugs, golden hour.',
    floorPattern: 'slab',
    wallPattern: 'panels',
    ...STYLE_TEXTURES['beach-house'],
  },
  {
    id: 'marble-hall',
    label: 'Marble Hall',
    floorA: '#e9e6df',
    floorB: '#dcd8cf',
    wallLeft: '#c9c3b6',
    wallRight: '#d8d2c6',
    accent: '#b89b5e',
    bg: '#cfcabd',
    mood: 'Veined marble, ashlar stone, grand and cool.',
    floorPattern: 'marble',
    wallPattern: 'stone',
    ...STYLE_TEXTURES['marble-hall'],
  },
  {
    id: 'palace-ballroom',
    label: 'Palace Ballroom',
    floorA: '#8a5a32',
    floorB: '#7e4f2b',
    wallLeft: '#5e3550',
    wallRight: '#6e3f5e',
    accent: '#d7b56a',
    bg: '#2c1b27',
    mood: 'Herringbone parquet, damask wallpaper, candlelit.',
    floorPattern: 'parquet',
    wallPattern: 'wallpaper',
    ...PALACE_BALLROOM_FLOOR,
    ...PALACE_BALLROOM_WALL,
  },
  {
    id: 'gothic-belfry',
    label: 'Gothic Belfry',
    floorA: '#8f8a82',
    floorB: '#84807a',
    wallLeft: '#6f6a63',
    wallRight: '#7c776f',
    accent: '#caa86a',
    bg: '#3a3733',
    mood: 'Cut flagstones, heavy masonry, torch-lit keep.',
    floorPattern: 'stone',
    wallPattern: 'stone',
    ...STYLE_TEXTURES['gothic-belfry'],
  },
  {
    id: 'industrial-loft',
    label: 'Industrial Loft',
    floorA: '#7d6a5a',
    floorB: '#73604f',
    wallLeft: '#8a4a3a',
    wallRight: '#9c5443',
    accent: '#e2552b',
    bg: '#241c18',
    mood: 'Worn planks, exposed red brick, warehouse light.',
    floorPattern: 'planks',
    wallPattern: 'brick',
    ...INDUSTRIAL_LOFT_FLOOR,
    ...INDUSTRIAL_LOFT_WALL,
  },
  {
    id: 'private-study',
    label: 'Private Study',
    floorA: '#7c2f2f',
    floorB: '#732a2a',
    wallLeft: '#5a4632',
    wallRight: '#6a543c',
    accent: '#d9b25a',
    bg: '#241712',
    mood: 'Plush carpet, walnut paneling, lamplit calm.',
    floorPattern: 'carpet',
    wallPattern: 'wood',
    ...STYLE_TEXTURES['private-study'],
  },
];

export const DEFAULT_STYLE = ROOM_STYLES[0].id;

/**
 * Maps legacy/aliased style ids to their current canonical id. Architectural
 * styles were renamed (slug + label); these aliases keep any saved rooms,
 * cached state, or older clients pointing at the right style after the rename.
 */
const STYLE_ID_ALIASES: Record<string, string> = {
  'enterprise-c': 'enterprise-d',
  // Architectural style renames (old slug -> new slug).
  'gothic-library': 'timeless-library',
  utilitarian: 'brutalist-atrium',
  brutalist: 'brutalist-atrium',
  spaceship: 'futuristic-lab',
  'cozy-apartment': 'beach-house',
  'victorian-parlor': 'palace-ballroom',
  'stone-keep': 'gothic-belfry',
  'reading-study': 'private-study',
};

export function canonicalStyleId(id: string): string {
  return STYLE_ID_ALIASES[id] ?? id;
}

export function getStyle(id: string): RoomStyle {
  const canonicalId = canonicalStyleId(id);
  return ROOM_STYLES.find((s) => s.id === canonicalId) ?? ROOM_STYLES[0];
}

export interface MuseumTheme {
  id: string;
  label: string;
  defaultStyle: string;
  bg: string;
}

export const MUSEUM_THEMES: MuseumTheme[] = [
  { id: 'scholar', label: 'Scholar', defaultStyle: 'timeless-library', bg: '#1b1410' },
  { id: 'clinical', label: 'Clinical', defaultStyle: 'clinic', bg: '#eef6f7' },
  { id: 'cosmic', label: 'Cosmic', defaultStyle: 'futuristic-lab', bg: '#0b1020' },
  { id: 'natural', label: 'Natural', defaultStyle: 'greenhouse', bg: '#cfeede' },
  { id: 'homely', label: 'Homely', defaultStyle: 'beach-house', bg: '#efe2d2' },
];

export function getTheme(id: string): MuseumTheme {
  return MUSEUM_THEMES.find((t) => t.id === id) ?? MUSEUM_THEMES[0];
}

export const ROOM_TYPES: { id: string; label: string; icon: string }[] = [
  { id: 'library', label: 'Library', icon: '📚' },
  { id: 'bedroom', label: 'Bedroom', icon: '🛏️' },
  { id: 'clinic', label: 'Clinic', icon: '🩺' },
  { id: 'courtroom', label: 'Courtroom', icon: '⚖️' },
  { id: 'museum', label: 'Museum', icon: '🏛️' },
  { id: 'temple', label: 'Temple', icon: '🛕' },
  { id: 'laboratory', label: 'Laboratory', icon: '⚗️' },
  { id: 'garden', label: 'Garden', icon: '🌿' },
  { id: 'office', label: 'Office', icon: '💼' },
  { id: 'tower', label: 'Tower', icon: '🗼' },
  { id: 'basement', label: 'Basement', icon: '🕯️' },
  { id: 'corridor', label: 'Corridor', icon: '🖼️🖼️🖼️' },
  { id: 'custom', label: 'Custom', icon: '🚪' },
];

export function roomTypeIcon(type: string): string {
  return ROOM_TYPES.find((t) => t.id === type)?.icon ?? '✨';
}
