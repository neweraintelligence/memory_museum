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
}

export const ROOM_STYLES: RoomStyle[] = [
  {
    id: 'gothic-library',
    label: 'Gothic Library',
    floorA: '#3b2f2a',
    floorB: '#332823',
    wallLeft: '#4a3a33',
    wallRight: '#5a473d',
    accent: '#caa86a',
    bg: '#1b1410',
    mood: 'Dark wood, candlelight, towering shelves.',
    floorPattern: 'none',
    wallPattern: 'shelves',
  },
  {
    id: 'brutalist',
    label: 'Brutalist Concrete',
    floorA: '#9a9a9a',
    floorB: '#8d8d8d',
    wallLeft: '#7d7d7d',
    wallRight: '#919191',
    accent: '#e2552b',
    bg: '#5c5c5c',
    mood: 'Raw concrete, hard shadows, monumental.',
    floorPattern: 'slab',
    wallPattern: 'concrete',
  },
  {
    id: 'tea-room',
    label: 'Japanese Tea Room',
    floorA: '#cdab76',
    floorB: '#c4a26c',
    wallLeft: '#e9ddc7',
    wallRight: '#f2e9d8',
    accent: '#8a5a44',
    bg: '#e7dcc6',
    mood: 'Tatami, paper screens, quiet warmth.',
    floorPattern: 'tatami',
    wallPattern: 'screens',
  },
  {
    id: 'spaceship',
    label: 'Futuristic Spaceship',
    floorA: '#1d2740',
    floorB: '#222d4a',
    wallLeft: '#27324f',
    wallRight: '#30406a',
    accent: '#3ad7ff',
    bg: '#0b1020',
    mood: 'Cold metal, neon seams, deep space.',
    floorPattern: 'metal',
    wallPattern: 'tech',
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
  },
  {
    id: 'cozy-apartment',
    label: 'Cozy Apartment',
    floorA: '#c79a6a',
    floorB: '#bd9162',
    wallLeft: '#e7d3bd',
    wallRight: '#f0e0cd',
    accent: '#d97757',
    bg: '#efe2d2',
    mood: 'Warm wood, soft rugs, golden hour.',
    floorPattern: 'slab',
    wallPattern: 'panels',
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
  },
  {
    id: 'victorian-parlor',
    label: 'Victorian Parlor',
    floorA: '#8a5a32',
    floorB: '#7e4f2b',
    wallLeft: '#5e3550',
    wallRight: '#6e3f5e',
    accent: '#d7b56a',
    bg: '#2c1b27',
    mood: 'Herringbone parquet, damask wallpaper, candlelit.',
    floorPattern: 'parquet',
    wallPattern: 'wallpaper',
  },
  {
    id: 'stone-keep',
    label: 'Stone Keep',
    floorA: '#8f8a82',
    floorB: '#84807a',
    wallLeft: '#6f6a63',
    wallRight: '#7c776f',
    accent: '#caa86a',
    bg: '#3a3733',
    mood: 'Cut flagstones, heavy masonry, torch-lit keep.',
    floorPattern: 'stone',
    wallPattern: 'stone',
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
  },
  {
    id: 'reading-study',
    label: 'Reading Study',
    floorA: '#7c2f2f',
    floorB: '#732a2a',
    wallLeft: '#5a4632',
    wallRight: '#6a543c',
    accent: '#d9b25a',
    bg: '#241712',
    mood: 'Plush carpet, walnut paneling, lamplit calm.',
    floorPattern: 'carpet',
    wallPattern: 'wood',
  },
];

export const DEFAULT_STYLE = ROOM_STYLES[0].id;

export function getStyle(id: string): RoomStyle {
  return ROOM_STYLES.find((s) => s.id === id) ?? ROOM_STYLES[0];
}

export interface PalaceTheme {
  id: string;
  label: string;
  defaultStyle: string;
  bg: string;
}

export const PALACE_THEMES: PalaceTheme[] = [
  { id: 'scholar', label: 'Scholar', defaultStyle: 'gothic-library', bg: '#1b1410' },
  { id: 'clinical', label: 'Clinical', defaultStyle: 'clinic', bg: '#eef6f7' },
  { id: 'cosmic', label: 'Cosmic', defaultStyle: 'spaceship', bg: '#0b1020' },
  { id: 'natural', label: 'Natural', defaultStyle: 'greenhouse', bg: '#cfeede' },
  { id: 'homely', label: 'Homely', defaultStyle: 'cozy-apartment', bg: '#efe2d2' },
];

export function getTheme(id: string): PalaceTheme {
  return PALACE_THEMES.find((t) => t.id === id) ?? PALACE_THEMES[0];
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
  { id: 'corridor', label: 'Corridor', icon: '🚪' },
  { id: 'custom', label: 'Custom', icon: '✨' },
];

export function roomTypeIcon(type: string): string {
  return ROOM_TYPES.find((t) => t.id === type)?.icon ?? '✨';
}
