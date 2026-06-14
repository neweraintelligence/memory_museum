import { useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Line, Group, Text } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import IsoObject from './IsoObject';
import GhostRoom from './GhostRoom';
import FloorTileSurface from './FloorTileSurface';
import WallSegmentFace, { WallSegmentTopEdge, RoomCornerSeam } from './WallSegmentFace';
import { usePublicImage } from './usePublicImage';
import { WallFeatureSprite, WallFeatureInteract } from './wallFeature';
import {
  TILE_W,
  TILE_H,
  tileDiamond,
  gridToScreen,
  screenToGrid,
  clamp,
} from '../lib/iso';
import { shade, withAlpha } from '../lib/color';
import { getStyle } from '../themes/styles';
import { objectArtHeight } from './objectArt';
import {
  getRoomTiles,
  parseTileKey,
  ghostTiles,
  nearestTile,
} from '../lib/floor';
import {
  canPlaceObject,
  findSurfaceUnder,
  footprintDepthKey,
  footprintTileKeys,
  footprintTiles,
  objectScreenPos,
} from '../lib/objectPlacement';
import { defaultObjectRotation, isWallAttachable, mustStack, surfaceStackLift } from '../themes/objects';
import { buildWallSegs, nearestWallSeg, type WallSeg } from '../lib/wallAttach';
import type { Room, PObject, Memory, AppMode, WallSide } from '../types';

const WALL_H = 110;
/** Vertical nudge for locked room view (− = lower on screen), as a fraction of wall height. */
const ROOM_VIEW_Y_BIAS = WALL_H * -0.50 + 20;
const HALF_W = TILE_W / 2;
const HALF_H = TILE_H / 2;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

const WALL_HIT_PAD_X = TILE_W * 0.36;
const WALL_HIT_PAD_Y = TILE_H * 0.5;

/** Keep viewport pan from stealing clicks meant for room objects / tiles. */
function blockViewportPan(e: KonvaEventObject<MouseEvent>) {
  e.cancelBubble = true;
}

function aabbOverlap(
  aMinX: number,
  aMaxX: number,
  aMinY: number,
  aMaxY: number,
  bMinX: number,
  bMaxX: number,
  bMinY: number,
  bMaxY: number,
): boolean {
  return aMinX <= bMaxX && aMaxX >= bMinX && aMinY <= bMaxY && aMaxY >= bMinY;
}

/**
 * Left-wall (NW face) version of the "behind" test. The right wall (NE face) is
 * the exact mirror of this under a gx<->gy swap, so `objectBehindWall` reuses it.
 */
function behindLeftWall(wx: number, wy: number, ox: number, oy: number): boolean {
  if (ox === wx && oy === wy) return false;
  const wSum = wx + wy;
  const oSum = ox + oy;
  if (oSum > wSum) return false;
  // Same gx, lower gy → in front of this wall even when oSum < wSum
  if (oy < wy && ox >= wx) return false;
  if (oSum === wSum) return ox < wx || oy > wy;
  return wSum - oSum <= 2;
}

/** Left-wall version of the "in front" test (see `behindLeftWall`). */
function inFrontOfLeftWall(wx: number, wy: number, ox: number, oy: number): boolean {
  if (ox === wx && oy === wy) return false;
  const wSum = wx + wy;
  const oSum = ox + oy;
  if (oSum > wSum) return true;
  if (oy < wy && ox >= wx) return true;
  if (oSum === wSum) return ox > wx && oy < wy;
  return ox > wx && oy <= wy;
}

/** Northwest of the wall tile in grid space (behind the camera-facing face). */
function objectBehindWall(seg: WallSeg, ox: number, oy: number): boolean {
  // Right walls are the gx<->gy mirror of left walls.
  if (seg.side === 'right') return behindLeftWall(seg.gy, seg.gx, oy, ox);
  return behindLeftWall(seg.gx, seg.gy, ox, oy);
}

/** Southeast of the wall tile — closer to camera; must not trigger see-through alone. */
function objectInFrontOfWall(seg: WallSeg, ox: number, oy: number): boolean {
  if (seg.side === 'right') return inFrontOfLeftWall(seg.gy, seg.gx, oy, ox);
  return inFrontOfLeftWall(seg.gx, seg.gy, ox, oy);
}

/** Along the wall face laterally (east of left wall / south of right wall), not behind. */
function objectBesideWall(seg: WallSeg, ox: number, oy: number): boolean {
  const { gx: wx, gy: wy, side } = seg;
  const dx = ox - wx;
  const dy = oy - wy;
  if (side === 'left') return dy === 0 && dx > 0;
  return dx === 0 && dy > 0;
}

/**
 * Object sits on the tile directly west of a left-wall tile (corner / beside the
 * arm). Not behind the face — the wall stays solid.
 */
function objectBesideLeftWallFace(seg: WallSeg, ox: number, oy: number): boolean {
  if (seg.side !== 'left') return false;
  const { gx: wx, gy: wy } = seg;
  return ox === wx - 1 && oy <= wy;
}

/**
 * Object sits on the tile directly north of a right-wall tile (corner / beside).
 */
function objectBesideRightWallFace(seg: WallSeg, ox: number, oy: number): boolean {
  if (seg.side !== 'right') return false;
  const { gx: wx, gy: wy } = seg;
  return oy === wy - 1 && ox <= wx;
}

/**
 * Tight grid cone for tall upper panels only. Clears as soon as the object
 * leaves the northwest (left wall) or west (right wall) neighborhood.
 */
function objectInUpperWallShadow(seg: WallSeg, ox: number, oy: number): boolean {
  const { gx: wx, gy: wy, side } = seg;
  if (ox === wx && oy === wy) return false;
  const wSum = wx + wy;
  const oSum = ox + oy;
  if (oSum > wSum) return false;
  if (oy < wy && ox >= wx) return false;
  const depthGap = wSum - oSum;
  if (depthGap > 3) return false;

  const dx = wx - ox;
  const dy = oy - wy;

  if (side === 'left') {
    // dy ≥ −1: one row south still sits under the tall upper panels
    return dx >= 0 && dx <= 2 && dy >= -1 && dy <= 2;
  }
  return dx >= 0 && dx <= 2 && dy <= 1 && dy >= -2;
}

/**
 * Does the object's sprite bounds overlap the wall face? Tall upper panels
 * hide objects on diagonal / offset tiles, so upperOnly uses a wider zone.
 */
function objectOverlapsWallFace(
  seg: WallSeg,
  sx: number,
  sy: number,
  artHeight: number,
  depthGap: number,
  upperOnly: boolean,
): boolean {
  const xs = [seg.pts[0], seg.pts[2], seg.pts[4], seg.pts[6]];
  const ys = [seg.pts[1], seg.pts[3], seg.pts[5], seg.pts[7]];
  const wMinY = Math.min(...ys) - WALL_HIT_PAD_Y;
  const wMaxY = Math.max(...ys) + 10;
  const lateralExtra = TILE_W * (upperOnly ? 0.22 : 0.16) * Math.max(0, depthGap - 1);

  const objHalfW = TILE_W * (upperOnly ? 0.4 : 0.36);
  const oMinX = sx - objHalfW;
  const oMaxX = sx + objHalfW;
  const oMinY = sy - artHeight - 16;
  const oMaxY = sy + TILE_H * 0.3;

  if (!upperOnly) {
    const wMinX = Math.min(...xs) - WALL_HIT_PAD_X - lateralExtra;
    const wMaxX = Math.max(...xs) + WALL_HIT_PAD_X + lateralExtra;
    return aabbOverlap(oMinX, oMaxX, oMinY, oMaxY, wMinX, wMaxX, wMinY, wMaxY);
  }

  const upperReach = WALL_HIT_PAD_X + lateralExtra + TILE_W * 0.34;
  const upperMinX = Math.min(...xs) - upperReach;
  const upperMaxX = Math.max(...xs) + upperReach;
  const upperMaxY = wMinY + (wMaxY - wMinY) * 0.62;
  return aabbOverlap(oMinX, oMaxX, oMinY, oMaxY, upperMinX, upperMaxX, wMinY, upperMaxY);
}

function shiftedScreenPos(
  ox: number,
  oy: number,
  seg: WallSeg,
  originX: number,
  originY: number,
  depthGap: number,
): { x: number; y: number } {
  const { x, y } = gridToScreen(ox, oy, originX, originY);
  const wallTile = gridToScreen(seg.gx, seg.gy, originX, originY);
  const shift = depthGap === 0 ? 0.4 : Math.min(0.32, depthGap * 0.14);
  return {
    x: x + (wallTile.x - x) * shift,
    y: y + (wallTile.y - y) * shift,
  };
}

/**
 * Two-tier occlusion:
 * 1) Full wall — strict behind + gap ≤ 2 (clears reliably when object moves).
 * 2) Upper panels — tight grid shadow + screen overlap (offset / diagonal tiles).
 */
function wallOccludesObject(
  seg: WallSeg,
  ox: number,
  oy: number,
  kind: string,
  originX: number,
  originY: number,
): boolean {
  if (
    objectInFrontOfWall(seg, ox, oy) ||
    objectBesideWall(seg, ox, oy) ||
    objectBesideLeftWallFace(seg, ox, oy) ||
    objectBesideRightWallFace(seg, ox, oy)
  ) {
    return false;
  }

  const wSum = seg.gx + seg.gy;
  const oSum = ox + oy;
  const depthGap = wSum - oSum;
  const effectiveGap = depthGap === 0 ? 1 : Math.max(1, depthGap);
  const artHeight = objectArtHeight(kind);
  const { x, y } = gridToScreen(ox, oy, originX, originY);

  // Tier 1 — adjacent / near tiles, full wall face
  if (objectBehindWall(seg, ox, oy) && depthGap <= 2) {
    if (objectOverlapsWallFace(seg, x, y, artHeight, effectiveGap, false)) return true;
    if (objectOverlapsWallFace(seg, x, y, artHeight, effectiveGap, true)) return true;
    if (depthGap === 0) {
      const shifted = shiftedScreenPos(ox, oy, seg, originX, originY, 0);
      if (objectOverlapsWallFace(seg, shifted.x, shifted.y, artHeight, 1, true)) return true;
    }
  }

  // Tier 2 — tall upper panels on offset / diagonal tiles (grid-bounded so it clears)
  if (!objectInUpperWallShadow(seg, ox, oy)) return false;
  if (objectOverlapsWallFace(seg, x, y, artHeight, effectiveGap, true)) return true;

  const shifted = shiftedScreenPos(ox, oy, seg, originX, originY, depthGap);
  return objectOverlapsWallFace(seg, shifted.x, shifted.y, artHeight, effectiveGap, true);
}

function wallOccludesAny(
  seg: WallSeg,
  objects: PObject[],
  originX: number,
  originY: number,
): boolean {
  return objects.some((o) => {
    if (o.wallSide) return false;
    return footprintTiles(o).some((t) =>
      wallOccludesObject(seg, t.gx, t.gy, o.kind, originX, originY),
    );
  });
}

function WallSegment({
  seg,
  style,
  opacity,
  feature,
  wallTexLeft,
  wallTexRight,
}: {
  seg: WallSeg;
  style: ReturnType<typeof getStyle>;
  opacity: number;
  feature?: PObject | null;
  wallTexLeft: HTMLImageElement | null;
  wallTexRight: HTMLImageElement | null;
}) {
  const texture = seg.side === 'left' ? wallTexLeft : wallTexRight;
  const useWallTexture = !!(style.wallTextures && texture);
  return (
    <Group opacity={opacity}>
      <WallSegmentFace
        seg={seg}
        style={style}
        wallH={WALL_H}
        texture={texture}
        feature={!!feature}
      />
      <WallSegmentTopEdge seg={seg} style={style} wallH={WALL_H} useTexture={useWallTexture} />
    </Group>
  );
}

interface NeighborRoom {
  room: Room;
  objects: PObject[];
}

interface Props {
  room: Room;
  objects: PObject[];
  memories: Memory[];
  mode: AppMode;
  placingKind: string | null;
  placingRotation: number;
  floorEditing: boolean;
  selectedId: string | null;
  highlightId: string | null;
  focusHighlight: boolean;
  /** Faded neighbour rooms shown in the same canvas, to the SW / SE. */
  swNeighbor?: NeighborRoom | null;
  seNeighbor?: NeighborRoom | null;
  onPickRoom?: (id: string) => void;
  onSelect: (id: string | null) => void;
  onPlace: (gx: number, gy: number, wallSide?: WallSide | null, rotation?: number) => void;
  onMove: (id: string, gx: number, gy: number, wallSide?: WallSide | null) => void;
  onAddTile: (gx: number, gy: number) => void;
  onRemoveTile: (gx: number, gy: number) => void;
}

const NEIGHBOR_GAP = 6;
const NEIGHBOR_OPACITY = 0.3;

function gridBounds(keys: string[]) {
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

export default function RoomCanvas({
  room,
  objects,
  memories,
  mode,
  placingKind,
  placingRotation,
  floorEditing,
  selectedId,
  highlightId,
  focusHighlight,
  swNeighbor,
  seNeighbor,
  onPickRoom,
  onSelect,
  onPlace,
  onMove,
  onAddTile,
  onRemoveTile,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<Konva.Group>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [pulse, setPulse] = useState(0);
  const [zoom, setZoom] = useState(1);

  // Track container size. Ignore transient 0×0 layout frames during flex reflow.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let raf = 0;
    const apply = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w < 2 || h < 2) return;
      setSize({ w, h });
    };

    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    });
    ro.observe(el);
    apply();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      if (t - last > 60) {
        last = t;
        setPulse((Math.sin(t / 480) + 1) / 2);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const style = getStyle(room.style);
  const floorTexA = usePublicImage(style.floorTextures?.[0]);
  const floorTexB = usePublicImage(style.floorTextures?.[1]);
  const wallTexLeft = usePublicImage(style.wallTextures?.left);
  const wallTexRight = usePublicImage(style.wallTextures?.right);

  const presentKeys = useMemo(() => getRoomTiles(room), [room]);
  const present = useMemo(() => new Set(presentKeys), [presentKeys]);

  // Center the floor's screen bounding box inside the canvas.
  const origin = useMemo(() => {
    let minSx = Infinity;
    let maxSx = -Infinity;
    let minSy = Infinity;
    let maxSy = -Infinity;
    for (const k of presentKeys) {
      const { gx, gy } = parseTileKey(k);
      const s = gridToScreen(gx, gy, 0, 0);
      minSx = Math.min(minSx, s.x - HALF_W);
      maxSx = Math.max(maxSx, s.x + HALF_W);
      minSy = Math.min(minSy, s.y - HALF_H);
      maxSy = Math.max(maxSy, s.y + HALF_H);
    }
    if (!isFinite(minSx)) return { x: size.w / 2, y: size.h / 2 };
    return {
      x: size.w / 2 - (minSx + maxSx) / 2,
      y: size.h / 2 - (minSy + maxSy) / 2 - ROOM_VIEW_Y_BIAS,
    };
  }, [presentKeys, size.w, size.h]);

  // Fixed anchor for zoom — matches the room center computed by `origin`.
  const viewCx = size.w / 2;
  const viewCy = size.h / 2 - ROOM_VIEW_Y_BIAS;

  // Offset origins so neighbour rooms sit diagonally adjacent (same scale) —
  // SE along the +gx axis (bottom-right), SW along the +gy axis (bottom-left).
  const neighborOrigin = (neighborRoom: Room, dir: 'sw' | 'se') => {
    const mb = gridBounds(presentKeys);
    const nb = gridBounds(getRoomTiles(neighborRoom));
    const mainCenter = gridToScreen(
      (mb.minX + mb.maxX) / 2,
      (mb.minY + mb.maxY) / 2,
      origin.x,
      origin.y,
    );
    const nbCx = (nb.minX + nb.maxX) / 2;
    const nbCy = (nb.minY + nb.maxY) / 2;
    let centerX: number;
    let centerY: number;
    if (dir === 'se') {
      const k = (mb.maxX - mb.minX + 1) / 2 + (nb.maxX - nb.minX + 1) / 2 + NEIGHBOR_GAP;
      centerX = mainCenter.x + k * HALF_W;
      centerY = mainCenter.y + k * HALF_H;
    } else {
      const k = (mb.maxY - mb.minY + 1) / 2 + (nb.maxY - nb.minY + 1) / 2 + NEIGHBOR_GAP;
      centerX = mainCenter.x - k * HALF_W;
      centerY = mainCenter.y + k * HALF_H;
    }
    return {
      x: centerX - (nbCx - nbCy) * HALF_W,
      y: centerY - (nbCx + nbCy) * HALF_H,
    };
  };

  const swOrigin = useMemo(
    () => (swNeighbor ? neighborOrigin(swNeighbor.room, 'sw') : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [swNeighbor, presentKeys, origin.x, origin.y],
  );
  const seOrigin = useMemo(
    () => (seNeighbor ? neighborOrigin(seNeighbor.room, 'se') : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seNeighbor, presentKeys, origin.x, origin.y],
  );

  const anchorIds = useMemo(() => {
    const set = new Set<string>();
    for (const m of memories) {
      if (m.prompt || m.body || m.answer || m.tags.length > 0 || m.imageUrl) set.add(m.objectId);
    }
    return set;
  }, [memories]);

  const tiles = useMemo(
    () =>
      presentKeys.map((k) => {
        const { gx, gy } = parseTileKey(k);
        const c = gridToScreen(gx, gy, origin.x, origin.y);
        return {
          gx,
          gy,
          key: k,
          pts: tileDiamond(gx, gy, origin.x, origin.y),
          alt: (gx + gy) % 2 === 0,
          cx: c.x,
          cy: c.y,
        };
      }),
    [presentKeys, origin.x, origin.y],
  );

  const ghosts = useMemo(() => {
    if (!floorEditing) return [];
    return ghostTiles(present).map((k) => {
      const { gx, gy } = parseTileKey(k);
      return { gx, gy, key: k, pts: tileDiamond(gx, gy, origin.x, origin.y) };
    });
  }, [floorEditing, present, origin.x, origin.y]);

  const roomObjects = useMemo(() => objects.filter((o) => !o.deleted), [objects]);

  const floorObjects = useMemo(
    () => roomObjects.filter((o) => !o.wallSide && !isWallAttachable(o.kind)),
    [roomObjects],
  );

  const wallObjects = useMemo(
    () => roomObjects.filter((o) => !!o.wallSide),
    [roomObjects],
  );

  const sortedFloorObjects = useMemo(
    () =>
      [...floorObjects].sort((a, b) => {
        const d = footprintDepthKey(a) - footprintDepthKey(b);
        if (d !== 0) return d;
        // At equal depth, stacked props paint above their surface.
        return (mustStack(a.kind) ? 1 : 0) - (mustStack(b.kind) ? 1 : 0);
      }),
    [floorObjects],
  );

  // Lift amount for each must-stack prop resting on a surface (table / bed).
  const stackLiftById = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of floorObjects) {
      if (!mustStack(o.kind)) continue;
      const surface = findSurfaceUnder(floorObjects, room.id, footprintTiles(o), o.id);
      if (surface) map.set(o.id, surfaceStackLift(surface.kind));
    }
    return map;
  }, [floorObjects, room.id]);

  const wallSegs = useMemo(
    () => buildWallSegs(presentKeys, present, origin.x, origin.y, HALF_W, HALF_H, WALL_H),
    [presentKeys, present, origin.x, origin.y],
  );

  // Inner corners: a tile exposing both a left (NW) and right (NE) wall folds
  // into a vertical crease at its shared top vertex. One subtle seam per corner.
  const cornerSeams = useMemo(() => {
    const sides = new Map<string, { left?: WallSeg; right?: WallSeg }>();
    for (const seg of wallSegs) {
      const key = `${seg.gx},${seg.gy}`;
      const entry = sides.get(key) ?? {};
      entry[seg.side] = seg;
      sides.set(key, entry);
    }
    const seams: { x: number; baseY: number; key: string }[] = [];
    for (const [key, { left, right }] of sides) {
      if (left && right) seams.push({ x: left.p1.x, baseY: left.p1.y, key });
    }
    return seams;
  }, [wallSegs]);

  const placingOnWall = !!(placingKind && isWallAttachable(placingKind));

  // Walls that cover an object behind them render in a third pass (on top of
  // objects, semi-transparent). All other walls stay in the depth-sorted pass.
  const { backWallSegs, frontWallSegs } = useMemo(() => {
    const back: WallSeg[] = [];
    const front: WallSeg[] = [];
    for (const seg of wallSegs) {
      if (wallOccludesAny(seg, roomObjects, origin.x, origin.y)) front.push(seg);
      else back.push(seg);
    }
    return { backWallSegs: back, frontWallSegs: front };
  }, [wallSegs, roomObjects, origin.x, origin.y]);

  const drawOrder = useMemo(() => {
    type Item =
      | { z: number; t: 'wall'; key: string; seg: WallSeg }
      | { z: number; t: 'floor'; key: string; tile: (typeof tiles)[number] };
    const items: Item[] = [];
    backWallSegs.forEach((seg, i) =>
      items.push({ z: seg.depth - 0.5, t: 'wall', key: `w${i}`, seg }),
    );
    for (const tile of tiles) {
      items.push({ z: tile.gx + tile.gy, t: 'floor', key: `f${tile.key}`, tile });
    }
    return items.sort((a, b) => a.z - b.z);
  }, [backWallSegs, tiles]);

  const handleTileClick = (gx: number, gy: number) => {
    if (floorEditing) {
      onRemoveTile(gx, gy);
    } else if (placingKind && !placingOnWall) {
      onPlace(gx, gy, null, placingRotation);
    } else if (!placingKind) {
      onSelect(null);
    }
  };

  const handleWallPlace = (seg: WallSeg) => {
    if (!placingOnWall) return;
    onPlace(seg.gx, seg.gy, seg.side);
  };

  const handleFloorDragEnd = (id: string, e: KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const obj = roomObjects.find((o) => o.id === id);
    if (!obj) return;
    const { gx, gy } = screenToGrid(node.x(), node.y(), origin.x, origin.y);
    const t = nearestTile(present, gx, gy);
    if (!t) return;
    if (
      !canPlaceObject(room, roomObjects, obj.kind, t.gx, t.gy, obj.rotation, null, id)
    ) {
      const snapped = objectScreenPos(obj, origin.x, origin.y);
      node.position({ x: snapped.x, y: snapped.y });
      return;
    }
    const snapped = objectScreenPos(
      { ...obj, gridX: t.gx, gridY: t.gy },
      origin.x,
      origin.y,
    );
    node.position({ x: snapped.x, y: snapped.y });
    onMove(id, t.gx, t.gy, null);
  };

  const handleWallDragEnd = (id: string) => {
    const pos = viewportRef.current?.getRelativePointerPosition();
    if (!pos) return;
    const seg = nearestWallSeg(wallSegs, pos.x, pos.y, WALL_H);
    if (!seg) return;
    onMove(id, seg.gx, seg.gy, seg.side);
  };

  // ---- zoom (room stays centered; panning disabled) ----
  const applyZoom = (newScaleRaw: number) => {
    setZoom(clamp(newScaleRaw, MIN_ZOOM, MAX_ZOOM));
  };

  const onWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const factor = e.evt.deltaY > 0 ? 1 / 1.12 : 1.12;
    applyZoom(zoom * factor);
  };

  const zoomButton = (factor: number) => applyZoom(zoom * factor);
  const resetView = () => setZoom(1);

  const cursor = placingKind ? 'copy' : floorEditing ? 'pointer' : 'default';

  const wallMountsBySeg = useMemo(() => {
    const map = new Map<string, PObject>();
    for (const o of wallObjects) {
      if (!o.wallSide) continue;
      map.set(`${o.gridX},${o.gridY},${o.wallSide}`, o);
    }
    return map;
  }, [wallObjects]);

  const wallInteract = (o: PObject) => ({
    draggable: mode === 'build' && !floorEditing,
    selected: selectedId === o.id,
    highlighted: highlightId === o.id,
    isAnchor: anchorIds.has(o.id),
    pulse,
    dim: (focusHighlight && !!highlightId && highlightId !== o.id) || floorEditing,
    onSelect,
    onDragEnd: handleWallDragEnd,
  });

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        width: '100%',
        minHeight: 0,
        background: `radial-gradient(circle at 50% 38%, ${shade(style.bg, 0.12)} 0%, ${style.bg} 70%)`,
        cursor,
        position: 'relative',
      }}
    >
      <Stage width={size.w} height={size.h} onWheel={onWheel}>
        <Layer>
          {/* Zoom around the room center; no pan so the view never drifts. */}
          <Group
            ref={viewportRef}
            name="viewport"
            x={viewCx}
            y={viewCy}
            offsetX={viewCx}
            offsetY={viewCy}
            scaleX={zoom}
            scaleY={zoom}
          >
          {/* Faded neighbour rooms in the same canvas — drawn first so the
              active room paints over any overlap. Click to switch rooms. */}
          {swNeighbor && swOrigin && onPickRoom && (
            <GhostRoom
              room={swNeighbor.room}
              objects={swNeighbor.objects}
              originX={swOrigin.x}
              originY={swOrigin.y}
              opacity={NEIGHBOR_OPACITY}
              onPick={() => onPickRoom(swNeighbor.room.id)}
            />
          )}
          {seNeighbor && seOrigin && onPickRoom && (
            <GhostRoom
              room={seNeighbor.room}
              objects={seNeighbor.objects}
              originX={seOrigin.x}
              originY={seOrigin.y}
              opacity={NEIGHBOR_OPACITY}
              onPick={() => onPickRoom(seNeighbor.room.id)}
            />
          )}

          {/* Walls + floor tiles, interleaved by depth so they never overlap.
              Walls are per-tile edge quads, so they wrap any floor shape. */}
          {drawOrder.map((item) => {
            if (item.t === 'wall') {
              const seg = item.seg;
              const feature = wallMountsBySeg.get(`${seg.gx},${seg.gy},${seg.side}`) ?? null;
              return (
                <WallSegment
                  key={item.key}
                  seg={seg}
                  style={style}
                  opacity={1}
                  feature={feature}
                  wallTexLeft={wallTexLeft}
                  wallTexRight={wallTexRight}
                />
              );
            }
            const t = item.tile;
            return (
              <FloorTileSurface
                key={item.key}
                tile={t}
                style={style}
                floorEditing={floorEditing}
                textureA={floorTexA}
                textureB={floorTexB}
                cursor={cursor}
                placingKind={placingKind}
                blockViewportPan={blockViewportPan}
                onTileClick={handleTileClick}
              />
            );
          })}

          {/* Subtle crease where the left and right walls meet at a top corner. */}
          {cornerSeams.map((c) => (
            <RoomCornerSeam
              key={`corner-${c.key}`}
              x={c.x}
              baseY={c.baseY}
              wallH={WALL_H}
              style={style}
            />
          ))}

          {/* Wall objects sit proud of the wall/floor join, so their bases overlap
              the floor tiles instead of being tucked behind the tile pass. */}
          {wallSegs.map((seg, i) => {
            const feature = wallMountsBySeg.get(`${seg.gx},${seg.gy},${seg.side}`);
            if (!feature) return null;
            const fill = seg.side === 'left' ? style.wallLeft : style.wallRight;
            const interact = wallInteract(feature);
            return (
              <Group key={`wall-feature-${i}`}>
                <Group listening={false}>
                  <WallFeatureSprite
                    kind={feature.kind}
                    color={feature.color}
                    p0={seg.p0}
                    p1={seg.p1}
                    wallH={WALL_H}
                    wallFill={fill}
                    side={seg.side}
                  />
                </Group>
                <WallFeatureInteract
                  obj={feature}
                  p0={seg.p0}
                  p1={seg.p1}
                  wallH={WALL_H}
                  draggable={interact.draggable}
                  selected={interact.selected}
                  highlighted={interact.highlighted}
                  isAnchor={interact.isAnchor}
                  pulse={interact.pulse}
                  dim={interact.dim}
                  onSelect={interact.onSelect}
                  onDragEnd={interact.onDragEnd}
                />
              </Group>
            );
          })}

          {/* Floor objects above tiles; wall-mounted sprites already overlap the floor edge. */}
          {sortedFloorObjects.map((o) => {
            const s = objectScreenPos(o, origin.x, origin.y);
            const isHi = highlightId === o.id;
            return (
              <IsoObject
                key={o.id}
                obj={o}
                x={s.x}
                y={s.y}
                draggable={mode === 'build' && !floorEditing}
                selected={selectedId === o.id}
                highlighted={isHi}
                isAnchor={anchorIds.has(o.id)}
                pulse={pulse}
                dim={(focusHighlight && !!highlightId && !isHi) || floorEditing}
                stackLift={stackLiftById.get(o.id) ?? 0}
                onSelect={onSelect}
                onDragEnd={handleFloorDragEnd}
              />
            );
          })}

          {/* Valid placement footprint preview */}
          {placingKind &&
            !placingOnWall &&
            !floorEditing &&
            (() => {
              const rot = placingRotation ?? defaultObjectRotation(placingKind);
              const highlighted = new Set<string>();
              for (const t of tiles) {
                if (canPlaceObject(room, roomObjects, placingKind, t.gx, t.gy, rot)) {
                  for (const k of footprintTileKeys({
                    kind: placingKind,
                    gridX: t.gx,
                    gridY: t.gy,
                    rotation: rot,
                  })) {
                    highlighted.add(k);
                  }
                }
              }
              return tiles
                .filter((t) => highlighted.has(t.key))
                .map((t) => (
                  <Line
                    key={`ph${t.key}`}
                    points={t.pts}
                    closed
                    fill={withAlpha(style.accent, 0.14)}
                    stroke={withAlpha(style.accent, 0.55)}
                    strokeWidth={1.5}
                    dash={[4, 3]}
                    listening={false}
                  />
                ));
            })()}

          {/* Front walls that occlude an object — drawn on top, see-through. */}
          {[...frontWallSegs]
            .sort((a, b) => a.depth - b.depth)
            .map((seg, i) => {
              const feature = wallMountsBySeg.get(`${seg.gx},${seg.gy},${seg.side}`) ?? null;
              return (
                <WallSegment
                  key={`fw${i}`}
                  seg={seg}
                  style={style}
                  opacity={0.28}
                  feature={feature}
                  wallTexLeft={wallTexLeft}
                  wallTexRight={wallTexRight}
                />
              );
            })}

          {/* Clickable wall targets while placing wall-mounted objects */}
          {placingOnWall &&
            wallSegs.map((seg, i) => {
              const occupied = wallMountsBySeg.has(`${seg.gx},${seg.gy},${seg.side}`);
              return (
              <Line
                key={`wp${i}`}
                points={seg.pts}
                closed
                fill={withAlpha(style.accent, occupied ? 0.08 : 0.18)}
                stroke={withAlpha(style.accent, occupied ? 0.35 : 0.75)}
                strokeWidth={2}
                dash={occupied ? [6, 4] : undefined}
                onMouseDown={blockViewportPan}
                onClick={() => handleWallPlace(seg)}
                onTap={() => handleWallPlace(seg)}
                onMouseEnter={(e) => {
                  const stage = e.target.getStage();
                  if (stage) stage.container().style.cursor = 'copy';
                }}
                onMouseLeave={(e) => {
                  const stage = e.target.getStage();
                  if (stage) stage.container().style.cursor = cursor;
                }}
              />
              );
            })}

          {/* Ghost (addable) tiles in floor-edit mode */}
          {ghosts.map((g) => (
            <Line
              key={g.key}
              points={g.pts}
              closed
              fill={withAlpha(style.accent, 0.12)}
              stroke={withAlpha(style.accent, 0.7)}
              strokeWidth={1.5}
              dash={[5, 4]}
              onMouseDown={blockViewportPan}
              onClick={() => onAddTile(g.gx, g.gy)}
              onTap={() => onAddTile(g.gx, g.gy)}
              onMouseEnter={(e) => {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = 'copy';
              }}
              onMouseLeave={(e) => {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = cursor;
              }}
            />
          ))}

          {roomObjects.length === 0 && !floorEditing && (
            <Group x={origin.x} y={origin.y + 48} listening={false}>
              <Text
                text={
                  placingKind
                    ? placingOnWall
                      ? 'Click a wall to add a window, door, or mirror'
                      : mustStack(placingKind)
                        ? 'Add a dining table or bed first — this object must rest on one'
                        : 'Click a floor tile to place the object'
                    : 'Empty room — pick an object from the library to place it'
                }
                fontSize={15}
                fill="rgba(255,255,255,0.6)"
                width={360}
                align="center"
                x={-180}
              />
            </Group>
          )}
          </Group>
        </Layer>
      </Stage>

      {/* Zoom controls */}
      <div className="zoom-controls">
        <button className="icon-btn" title="Zoom out" onClick={() => zoomButton(1 / 1.2)}>
          −
        </button>
        <button className="icon-btn" title="Reset view" onClick={resetView}>
          {Math.round(zoom * 100)}%
        </button>
        <button className="icon-btn" title="Zoom in" onClick={() => zoomButton(1.2)}>
          +
        </button>
      </div>

      {floorEditing && (
        <div className="floor-hint">
          Floor editing — click a dashed cell to add flooring, a solid tile to remove it.
        </div>
      )}
    </div>
  );
}
