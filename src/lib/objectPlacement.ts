import { gridToScreen } from './iso';
import { tileKey, roomTileSet } from './floor';
import { getObjectDef, isSurface, mustStack } from '../themes/objects';
import type { PObject, Room } from '../types';

/** Four isometric facing directions (0 = +gx, 1 = +gy, 2 = −gx, 3 = −gy). */
export type ObjectRotation = 0 | 1 | 2 | 3;

const SPAN_VECTORS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];

export function normalizeRotation(rotation: number): ObjectRotation {
  return (((Math.round(rotation) % 4) + 4) % 4) as ObjectRotation;
}

export function nextRotation(rotation: number): ObjectRotation {
  return normalizeRotation(rotation + 1);
}

export function objectFootprint(kind: string): number {
  return getObjectDef(kind).footprint ?? 1;
}

/** Grid cells occupied by a floor object (anchor is always the first tile). */
export function footprintTiles(obj: {
  kind: string;
  gridX: number;
  gridY: number;
  rotation: number;
  wallSide?: string | null;
}): { gx: number; gy: number }[] {
  if (obj.wallSide) return [{ gx: obj.gridX, gy: obj.gridY }];
  const span = objectFootprint(obj.kind);
  if (span <= 1) return [{ gx: obj.gridX, gy: obj.gridY }];
  const [dx, dy] = SPAN_VECTORS[normalizeRotation(obj.rotation)];
  return [
    { gx: obj.gridX, gy: obj.gridY },
    { gx: obj.gridX + dx, gy: obj.gridY + dy },
  ];
}

export function footprintTileKeys(obj: Parameters<typeof footprintTiles>[0]): string[] {
  return footprintTiles(obj).map((t) => tileKey(t.gx, t.gy));
}

/** Back-most tile for painter's depth sort (smallest gx + gy). */
export function footprintDepthKey(obj: Parameters<typeof footprintTiles>[0]): number {
  return footprintTiles(obj).reduce((min, t) => Math.min(min, t.gx + t.gy), Infinity);
}

export function objectScreenPos(
  obj: Parameters<typeof footprintTiles>[0],
  originX: number,
  originY: number,
): { x: number; y: number } {
  const tiles = footprintTiles(obj);
  if (tiles.length === 1) {
    return gridToScreen(tiles[0].gx, tiles[0].gy, originX, originY);
  }
  let x = 0;
  let y = 0;
  for (const t of tiles) {
    const s = gridToScreen(t.gx, t.gy, originX, originY);
    x += s.x;
    y += s.y;
  }
  return { x: x / tiles.length, y: y / tiles.length };
}

export function tilesAvailable(room: Room, tiles: { gx: number; gy: number }[]): boolean {
  const present = roomTileSet(room);
  return tiles.every((t) => present.has(tileKey(t.gx, t.gy)));
}

/** The surface object (dining table / bed) whose footprint covers `tiles`, if any. */
export function findSurfaceUnder(
  objects: PObject[],
  roomId: string,
  tiles: { gx: number; gy: number }[],
  excludeId?: string,
): PObject | null {
  const keys = new Set(tiles.map((t) => tileKey(t.gx, t.gy)));
  for (const o of objects) {
    if (o.id === excludeId || o.deleted || o.roomId !== roomId || o.wallSide) continue;
    if (!isSurface(o.kind)) continue;
    if (footprintTileKeys(o).some((k) => keys.has(k))) return o;
  }
  return null;
}

/** Must-stack objects currently resting on the given surface's footprint. */
export function stackedItemsOn(objects: PObject[], surface: PObject): PObject[] {
  const keys = new Set(footprintTileKeys(surface));
  return objects.filter(
    (o) =>
      o.id !== surface.id &&
      !o.deleted &&
      o.roomId === surface.roomId &&
      !o.wallSide &&
      mustStack(o.kind) &&
      footprintTileKeys(o).some((k) => keys.has(k)),
  );
}

export function canPlaceObject(
  room: Room,
  objects: PObject[],
  kind: string,
  gridX: number,
  gridY: number,
  rotation: number,
  wallSide: string | null = null,
  excludeId?: string,
): boolean {
  if (wallSide) {
    const key = tileKey(gridX, gridY);
    if (!roomTileSet(room).has(key)) return false;
    const clash = objects.some(
      (o) =>
        o.id !== excludeId &&
        !o.deleted &&
        o.roomId === room.id &&
        o.wallSide === wallSide &&
        o.gridX === gridX &&
        o.gridY === gridY,
    );
    return !clash;
  }

  const probe = { kind, gridX, gridY, rotation, wallSide: null };
  const needed = footprintTiles(probe);
  if (!tilesAvailable(room, needed)) return false;

  const neededKeys = new Set(needed.map((t) => tileKey(t.gx, t.gy)));

  // Must-stack objects can only sit on a surface, never on a bare floor, and
  // never share a tile with another floor object (including another stacked one).
  if (mustStack(kind)) {
    let onSurface = false;
    for (const o of objects) {
      if (o.id === excludeId || o.deleted || o.roomId !== room.id || o.wallSide) continue;
      if (!footprintTileKeys(o).some((key) => neededKeys.has(key))) continue;
      if (isSurface(o.kind)) onSurface = true;
      else return false;
    }
    return onSurface;
  }

  // Regular floor objects collide with anything except items stacked on a
  // surface (those ride on top, so they don't block the tile).
  for (const o of objects) {
    if (o.id === excludeId || o.deleted || o.roomId !== room.id || o.wallSide) continue;
    if (mustStack(o.kind)) continue;
    for (const key of footprintTileKeys(o)) {
      if (neededKeys.has(key)) return false;
    }
  }
  return true;
}

/** Konva transform so props face the four grid directions without flipping upside-down. */
export function isoArtTransform(
  rotation: number,
  footprint: number,
): { scaleX: number; scaleY: number } {
  const r = normalizeRotation(rotation);
  // Mirror on X only — scaleY flips were inverting objects into the floor.
  const single: { scaleX: number; scaleY: number }[] = [
    { scaleX: 1, scaleY: 1 }, // +gx
    { scaleX: -1, scaleY: 1 }, // +gy
    { scaleX: -1, scaleY: 1 }, // −gx
    { scaleX: 1, scaleY: 1 }, // −gy
  ];
  if (footprint <= 1) return single[r];
  // Two-tile art is drawn long on +x (rot 0/2) or reshaped for +y (rot 1/3).
  const wide: { scaleX: number; scaleY: number }[] = [
    { scaleX: 1, scaleY: 1 }, // span +gx
    { scaleX: 1, scaleY: 1 }, // span +gy
    { scaleX: -1, scaleY: 1 }, // span −gx
    { scaleX: -1, scaleY: 1 }, // span −gy
  ];
  return wide[r];
}

/** True when a two-tile object's long axis runs along ±gy (rotation 1 or 3). */
export function footprintSpansGy(rotation: number): boolean {
  const r = normalizeRotation(rotation);
  return r === 1 || r === 3;
}
