import type { Room } from '../types';

export const tileKey = (gx: number, gy: number): string => `${gx},${gy}`;

export function parseTileKey(key: string): { gx: number; gy: number } {
  const [gx, gy] = key.split(',').map(Number);
  return { gx, gy };
}

/**
 * The floor tiles that make up a room. When a room has no explicit `tiles`
 * (legacy rooms / fresh rooms), we derive a full rectangle from gridW x gridH
 * so everything stays backward compatible.
 */
export function getRoomTiles(room: Room): string[] {
  if (room.tiles != null && room.tiles.length > 0) return room.tiles;
  const out: string[] = [];
  for (let gy = 0; gy < room.gridH; gy++) {
    for (let gx = 0; gx < room.gridW; gx++) {
      out.push(tileKey(gx, gy));
    }
  }
  return out;
}

export function roomTileSet(room: Room): Set<string> {
  return new Set(getRoomTiles(room));
}

export interface GridBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function tileBounds(keys: string[]): GridBounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const k of keys) {
    const { gx, gy } = parseTileKey(k);
    if (gx < minX) minX = gx;
    if (gx > maxX) maxX = gx;
    if (gy < minY) minY = gy;
    if (gy > maxY) maxY = gy;
  }
  if (!isFinite(minX)) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  return { minX, maxX, minY, maxY };
}

/** Empty neighbor cells around the present tiles (candidates for new flooring). */
export function ghostTiles(present: Set<string>): string[] {
  const ghosts = new Set<string>();
  for (const k of present) {
    const { gx, gy } = parseTileKey(k);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nk = tileKey(gx + dx, gy + dy);
      if (!present.has(nk)) ghosts.add(nk);
    }
  }
  return Array.from(ghosts);
}

/** Find the nearest present tile to a (possibly fractional) grid coordinate. */
export function nearestTile(
  present: Set<string>,
  gx: number,
  gy: number,
): { gx: number; gy: number } | null {
  const rounded = tileKey(Math.round(gx), Math.round(gy));
  if (present.has(rounded)) return { gx: Math.round(gx), gy: Math.round(gy) };
  let best: { gx: number; gy: number } | null = null;
  let bestD = Infinity;
  for (const k of present) {
    const t = parseTileKey(k);
    const d = (t.gx - gx) ** 2 + (t.gy - gy) ** 2;
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  return best;
}
