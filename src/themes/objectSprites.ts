import { normalizeRotation } from '../lib/objectPlacement';
import { getObjectDef } from './objects';

export interface ObjectSpriteFrame {
  url: string;
  flipX: boolean;
}

interface GeneratedSpriteMetrics {
  height?: number;
  ground?: number;
  xOffset?: number;
  yOffset?: number;
}

const GENERATED_SPRITE_METRICS: Record<string, GeneratedSpriteMetrics> = {
  desk: { height: 100 },
  'coffee-table': { height: 86 },
  'dining-table': { height: 112 },
  'computer-desk': { height: 118 },
  cabinet: { height: 102 },
  bed: { height: 132, yOffset: 4 },
  lamp: { height: 98 },
  mirror: { height: 96 },
  chest: { height: 88 },
  book: { height: 58 },
  books: { height: 72 },
  scroll: { height: 52 },
  document: { height: 58 },
  map: { height: 62 },
  clock: { height: 108 },
  statue: { height: 92 },
  'gold-statue': { height: 92 },
  key: { height: 54 },
  crown: { height: 82 },
  mask: { height: 90 },
  gem: { height: 62 },
  flask: { height: 72 },
  microscope: { height: 84 },
  anatomy: { height: 92 },
  machine: { height: 88 },
  dna: { height: 104 },
  jar: { height: 70 },
  plant: { height: 92 },
  tree: { height: 118 },
  flower: { height: 90 },
  crystal: { height: 80 },
  door: { height: 106 },
  window: { height: 96 },
  pillar: { height: 118 },
  fountain: { height: 104 },
  painting: { height: 96 },
  candle: { height: 72 },
  weapon: { height: 94 },
  skull: { height: 86 },
  hourglass: { height: 94 },
  star: { height: 62 },
};

function generatedSpritePaths(kind: string): string[] | undefined {
  if (!(kind in GENERATED_SPRITE_METRICS)) return undefined;
  return [`objects/${kind}-0.png`, `objects/${kind}-1.png`];
}

function spritePaths(kind: string): string[] | undefined {
  return getObjectDef(kind).sprites ?? generatedSpritePaths(kind);
}

function generatedMetrics(kind: string): GeneratedSpriteMetrics | undefined {
  return GENERATED_SPRITE_METRICS[kind];
}

function publicAssetUrl(path: string): string {
  return `/${path.replace(/^\//, '')}`;
}

/** Two diagonal views cover all four facings; four entries map one-to-one. */
const TWO_VIEW_FRAMES: ReadonlyArray<{ i: number; flip: boolean }> = [
  { i: 0, flip: false },
  { i: 1, flip: false },
  { i: 0, flip: true },
  { i: 1, flip: true },
];

export function hasObjectSprites(kind: string): boolean {
  return (spritePaths(kind)?.length ?? 0) > 0;
}

export function objectSpriteFrame(kind: string, rotation: number): ObjectSpriteFrame | null {
  const sprites = spritePaths(kind);
  if (!sprites?.length) return null;

  const r = normalizeRotation(rotation);
  if (sprites.length >= 4) {
    return { url: publicAssetUrl(sprites[r]), flipX: false };
  }

  const frame = TWO_VIEW_FRAMES[r];
  const path = sprites[Math.min(frame.i, sprites.length - 1)];
  return { url: publicAssetUrl(path), flipX: frame.flip };
}

export function objectSpriteHeight(kind: string): number | undefined {
  return getObjectDef(kind).spriteHeight ?? generatedMetrics(kind)?.height;
}

export function objectSpriteGround(kind: string): number | undefined {
  return getObjectDef(kind).spriteGround ?? generatedMetrics(kind)?.ground;
}

export function objectSpriteYOffset(kind: string): number {
  return getObjectDef(kind).spriteYOffset ?? generatedMetrics(kind)?.yOffset ?? 0;
}

export function objectSpriteXOffset(kind: string): number {
  return getObjectDef(kind).spriteXOffset ?? generatedMetrics(kind)?.xOffset ?? 0;
}
