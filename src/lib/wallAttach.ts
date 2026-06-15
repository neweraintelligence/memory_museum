import { gridToScreen } from './iso';
import { tileKey } from './floor';
import { isWallAttachable } from '../themes/objects';
import type { WallSide } from '../types';

export type WallSeg = {
  side: WallSide;
  gx: number;
  gy: number;
  pts: number[];
  p0: { x: number; y: number };
  p1: { x: number; y: number };
  depth: number;
};

export function wallSegKey(gx: number, gy: number, side: WallSide): string {
  return `${gx},${gy},${side}`;
}

/** Compute wall keys ("gx,gy,side") for all exposed edges of a floor shape. */
export function autoWallKeys(presentKeys: string[], present: Set<string>): string[] {
  const keys: string[] = [];
  for (const k of presentKeys) {
    const [gx, gy] = k.split(',').map(Number);
    if (!present.has(tileKey(gx - 1, gy))) keys.push(`${gx},${gy},left`);
    if (!present.has(tileKey(gx, gy - 1))) keys.push(`${gx},${gy},right`);
  }
  return keys;
}

/** Build exposed wall segments for the current floor shape. */
export function buildWallSegs(
  presentKeys: string[],
  present: Set<string>,
  originX: number,
  originY: number,
  halfW: number,
  halfH: number,
  wallH: number,
): WallSeg[] {
  const segs: WallSeg[] = [];

  for (const k of presentKeys) {
    const [gx, gy] = k.split(',').map(Number);
    const { x: cx, y: cy } = gridToScreen(gx, gy, originX, originY);

    if (!present.has(tileKey(gx - 1, gy))) {
      const p0 = { x: cx - halfW, y: cy };
      const p1 = { x: cx, y: cy - halfH };
      segs.push({
        side: 'left',
        pts: [p0.x, p0.y, p1.x, p1.y, p1.x, p1.y - wallH, p0.x, p0.y - wallH],
        p0,
        p1,
        depth: gx + gy,
        gx,
        gy,
      });
    }

    if (!present.has(tileKey(gx, gy - 1))) {
      const p0 = { x: cx, y: cy - halfH };
      const p1 = { x: cx + halfW, y: cy };
      segs.push({
        side: 'right',
        pts: [p0.x, p0.y, p1.x, p1.y, p1.x, p1.y - wallH, p0.x, p0.y - wallH],
        p0,
        p1,
        depth: gx + gy,
        gx,
        gy,
      });
    }
  }

  return segs.sort((a, b) => a.depth - b.depth);
}

/** Build wall segments from an explicit list of wall keys ("gx,gy,side"). */
export function buildExplicitWallSegs(
  wallKeys: string[],
  originX: number,
  originY: number,
  halfW: number,
  halfH: number,
  wallH: number,
): WallSeg[] {
  const segs: WallSeg[] = [];

  for (const key of wallKeys) {
    const parts = key.split(',');
    const gx = Number(parts[0]);
    const gy = Number(parts[1]);
    const side = parts[2] as WallSide;
    const { x: cx, y: cy } = gridToScreen(gx, gy, originX, originY);

    if (side === 'left') {
      const p0 = { x: cx - halfW, y: cy };
      const p1 = { x: cx, y: cy - halfH };
      segs.push({
        side: 'left',
        pts: [p0.x, p0.y, p1.x, p1.y, p1.x, p1.y - wallH, p0.x, p0.y - wallH],
        p0,
        p1,
        depth: gx + gy,
        gx,
        gy,
      });
    } else {
      const p0 = { x: cx, y: cy - halfH };
      const p1 = { x: cx + halfW, y: cy };
      segs.push({
        side: 'right',
        pts: [p0.x, p0.y, p1.x, p1.y, p1.x, p1.y - wallH, p0.x, p0.y - wallH],
        p0,
        p1,
        depth: gx + gy,
        gx,
        gy,
      });
    }
  }

  return segs.sort((a, b) => a.depth - b.depth);
}

export function findWallSeg(
  segs: WallSeg[],
  gx: number,
  gy: number,
  side: WallSide,
): WallSeg | undefined {
  return segs.find((s) => s.gx === gx && s.gy === gy && s.side === side);
}

/** Screen anchor for a wall-mounted object (center of the wall face). */
export function wallObjectScreenPos(
  seg: WallSeg,
  wallH: number,
  heightFrac = 0.42,
): { x: number; y: number; tilt: number } {
  const mx = (seg.p0.x + seg.p1.x) / 2;
  const my = (seg.p0.y + seg.p1.y) / 2;
  const dx = seg.p1.x - seg.p0.x;
  const dy = seg.p1.y - seg.p0.y;
  const tilt = (Math.atan2(dy, dx) * 180) / Math.PI;
  return { x: mx, y: my - wallH * heightFrac, tilt };
}

function distToSeg(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** Pick the closest exposed wall segment to a screen point. */
export function nearestWallSeg(
  segs: WallSeg[],
  sx: number,
  sy: number,
  wallH: number,
): WallSeg | null {
  let best: WallSeg | null = null;
  let bestD = Infinity;
  for (const seg of segs) {
    const anchor = wallObjectScreenPos(seg, wallH);
    const edgeD = distToSeg(sx, sy, seg.p0.x, seg.p0.y, seg.p1.x, seg.p1.y);
    const d = edgeD * 0.55 + Math.hypot(sx - anchor.x, sy - anchor.y) * 0.45;
    if (d < bestD) {
      bestD = d;
      best = seg;
    }
  }
  return best;
}

export function canAttachToWall(kind: string): boolean {
  return isWallAttachable(kind);
}
