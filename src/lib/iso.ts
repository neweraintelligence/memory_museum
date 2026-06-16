// Isometric projection helpers.
// We use a classic 2:1 diamond tile. Grid coordinates (gx, gy) map to screen
// coordinates relative to an origin. tileW/tileH describe the diamond footprint.

export const TILE_W = 88;
export const TILE_H = 44;

export interface ScreenPoint {
  x: number;
  y: number;
}

/** Convert grid coordinates to the screen position of the tile center. */
export function gridToScreen(
  gx: number,
  gy: number,
  originX: number,
  originY: number,
  tileW = TILE_W,
  tileH = TILE_H,
): ScreenPoint {
  return {
    x: originX + (gx - gy) * (tileW / 2),
    y: originY + (gx + gy) * (tileH / 2),
  };
}

/** Convert a screen position back to (possibly fractional) grid coordinates. */
export function screenToGrid(
  sx: number,
  sy: number,
  originX: number,
  originY: number,
  tileW = TILE_W,
  tileH = TILE_H,
): { gx: number; gy: number } {
  const dx = sx - originX;
  const dy = sy - originY;
  const gx = (dx / (tileW / 2) + dy / (tileH / 2)) / 2;
  const gy = (dy / (tileH / 2) - dx / (tileW / 2)) / 2;
  return { gx, gy };
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Depth sort key: tiles/objects further "back" (smaller gx+gy) render first. */
export function depthKey(gx: number, gy: number): number {
  return gx + gy;
}

/** Painter's z for a wall segment — in front of floor tiles at its tile and neighbors. */
export function wallDrawZ(depth: number): number {
  // +0.75 beats adjacent forward floor tiles (depth+0.5) that overlap the wall foot.
  return depth + 0.75;
}

/** Painter's z for a floor tile — paired with {@link wallDrawZ}. */
export function floorDrawZ(gx: number, gy: number): number {
  return gx + gy - 0.5;
}

/** Painter's z for a floor object — stays above walls when {@link wallDrawZ} is boosted. */
export function objectDrawZ(depth: number): number {
  return depth + 0.95;
}

/** Compute the four corners of a diamond tile (top, right, bottom, left). */
export function tileDiamond(
  gx: number,
  gy: number,
  originX: number,
  originY: number,
  tileW = TILE_W,
  tileH = TILE_H,
): number[] {
  const c = gridToScreen(gx, gy, originX, originY, tileW, tileH);
  return [
    c.x, c.y - tileH / 2, // top
    c.x + tileW / 2, c.y, // right
    c.x, c.y + tileH / 2, // bottom
    c.x - tileW / 2, c.y, // left
  ];
}

/** A good origin so a grid of (w x h) is centered in the given stage size. */
export function centeredOrigin(
  gridW: number,
  gridH: number,
  stageW: number,
  stageH: number,
  tileW = TILE_W,
  tileH = TILE_H,
): ScreenPoint {
  // Center of the diamond board in grid space is ((w-1)/2, (h-1)/2).
  const cx = ((gridW - 1) - (gridH - 1)) * (tileW / 2);
  const cy = ((gridW - 1) + (gridH - 1)) * (tileH / 2);
  return {
    x: stageW / 2 - cx / 2,
    y: stageH / 2 - cy / 2 - tileH, // nudge up a touch to leave room for walls
  };
}
