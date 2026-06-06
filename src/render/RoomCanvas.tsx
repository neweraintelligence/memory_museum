import { useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Line, Group, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import IsoObject from './IsoObject';
import {
  TILE_W,
  TILE_H,
  tileDiamond,
  gridToScreen,
  screenToGrid,
  clamp,
  depthKey,
} from '../lib/iso';
import { shade, withAlpha } from '../lib/color';
import { getStyle } from '../themes/styles';
import { floorTileDecor, wallDecor } from './roomArt';
import { objectArtHeight } from './objectArt';
import {
  getRoomTiles,
  parseTileKey,
  tileKey,
  ghostTiles,
  nearestTile,
} from '../lib/floor';
import type { Room, PObject, Memory, AppMode } from '../types';

const WALL_H = 110;
const HALF_W = TILE_W / 2;
const HALF_H = TILE_H / 2;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

type WallSeg = {
  side: 'left' | 'right';
  gx: number;
  gy: number;
  pts: number[];
  p0: { x: number; y: number };
  p1: { x: number; y: number };
  depth: number;
};

const WALL_HIT_PAD_X = TILE_W * 0.36;
const WALL_HIT_PAD_Y = TILE_H * 0.5;

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

/** Northwest of the wall tile in grid space (behind the camera-facing face). */
function objectBehindWall(seg: WallSeg, ox: number, oy: number): boolean {
  const { gx: wx, gy: wy } = seg;
  if (ox === wx && oy === wy) return false;
  const wSum = wx + wy;
  const oSum = ox + oy;
  if (oSum > wSum) return false;
  // Same gx, lower gy → in front of this wall even when oSum < wSum
  if (oy < wy && ox >= wx) return false;
  if (oSum === wSum) return ox < wx || oy > wy;
  return wSum - oSum <= 2;
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
  return objects.some((o) =>
    wallOccludesObject(seg, o.gridX, o.gridY, o.kind, originX, originY),
  );
}

function WallSegment({
  seg,
  style,
  opacity,
}: {
  seg: WallSeg;
  style: ReturnType<typeof getStyle>;
  opacity: number;
}) {
  const fill = seg.side === 'left' ? style.wallLeft : style.wallRight;
  const lightEdge = shade(fill, 0.2);
  return (
    <Group listening={false} opacity={opacity}>
      <Line
        points={seg.pts}
        closed
        fillPriority="linear-gradient"
        fillLinearGradientStartPoint={{ x: seg.p0.x, y: seg.p0.y - WALL_H }}
        fillLinearGradientEndPoint={{ x: seg.p0.x, y: seg.p0.y }}
        fillLinearGradientColorStops={[0, shade(fill, 0.16), 0.5, fill, 1, shade(fill, -0.18)]}
        stroke={shade(fill, -0.18)}
        strokeWidth={1}
        listening={false}
      />
      <Group listening={false}>
        {wallDecor(style.wallPattern, seg.p0, seg.p1, WALL_H, fill, style.accent)}
      </Group>
      <Line
        points={[seg.p0.x, seg.p0.y - WALL_H, seg.p1.x, seg.p1.y - WALL_H]}
        stroke={lightEdge}
        strokeWidth={1.5}
        opacity={0.6}
        listening={false}
      />
    </Group>
  );
}

interface Props {
  room: Room;
  objects: PObject[];
  memories: Memory[];
  mode: AppMode;
  placingKind: string | null;
  floorEditing: boolean;
  selectedId: string | null;
  highlightId: string | null;
  focusHighlight: boolean;
  onSelect: (id: string | null) => void;
  onPlace: (gx: number, gy: number) => void;
  onMove: (id: string, gx: number, gy: number) => void;
  onAddTile: (gx: number, gy: number) => void;
  onRemoveTile: (gx: number, gy: number) => void;
}

export default function RoomCanvas({
  room,
  objects,
  memories,
  mode,
  placingKind,
  floorEditing,
  selectedId,
  highlightId,
  focusHighlight,
  onSelect,
  onPlace,
  onMove,
  onAddTile,
  onRemoveTile,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [pulse, setPulse] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
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
      y: size.h / 2 - (minSy + maxSy) / 2 - WALL_H * 0.45,
    };
  }, [presentKeys, size.w, size.h]);

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

  const sortedObjects = useMemo(
    () => [...roomObjects].sort((a, b) => depthKey(a.gridX, a.gridY) - depthKey(b.gridX, b.gridY)),
    [roomObjects],
  );

  // Per-tile wall segments: for each floor tile, draw an exposed face wherever
  // the adjacent back-left (gx-1) or back-right (gy-1) neighbour is absent.
  // This makes walls hug any custom floor shape with no gaps.
  const wallSegs = useMemo(() => {
    const segs: Array<{
      side: 'left' | 'right';
      pts: number[];
      p0: { x: number; y: number };
      p1: { x: number; y: number };
      depth: number;
      gx: number;
      gy: number;
    }> = [];

    for (const k of presentKeys) {
      const { gx, gy } = parseTileKey(k);
      const { x: cx, y: cy } = gridToScreen(gx, gy, origin.x, origin.y);

      // Left face (upper-left diamond edge) → exposed when no tile at (gx-1, gy)
      if (!present.has(tileKey(gx - 1, gy))) {
        const p0 = { x: cx - HALF_W, y: cy };
        const p1 = { x: cx, y: cy - HALF_H };
        segs.push({
          side: 'left',
          pts: [p0.x, p0.y, p1.x, p1.y, p1.x, p1.y - WALL_H, p0.x, p0.y - WALL_H],
          p0,
          p1,
          depth: gx + gy,
          gx,
          gy,
        });
      }

      // Right face (upper-right diamond edge) → exposed when no tile at (gx, gy-1)
      if (!present.has(tileKey(gx, gy - 1))) {
        const p0 = { x: cx, y: cy - HALF_H };
        const p1 = { x: cx + HALF_W, y: cy };
        segs.push({
          side: 'right',
          pts: [p0.x, p0.y, p1.x, p1.y, p1.x, p1.y - WALL_H, p0.x, p0.y - WALL_H],
          p0,
          p1,
          depth: gx + gy,
          gx,
          gy,
        });
      }
    }

    // Painter's algorithm: render back (low gx+gy) to front
    return segs.sort((a, b) => a.depth - b.depth);
  }, [presentKeys, present, origin.x, origin.y]);

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
    } else if (placingKind) {
      onPlace(gx, gy);
    } else {
      onSelect(null);
    }
  };

  const handleDragEnd = (id: string, e: KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const { gx, gy } = screenToGrid(node.x(), node.y(), origin.x, origin.y);
    const t = nearestTile(present, gx, gy);
    if (!t) return;
    const snapped = gridToScreen(t.gx, t.gy, origin.x, origin.y);
    node.position({ x: snapped.x, y: snapped.y });
    onMove(id, t.gx, t.gy);
  };

  // ---- zoom + pan ----
  const applyZoom = (newScaleRaw: number, center: { x: number; y: number }) => {
    const oldScale = zoom;
    const newScale = clamp(newScaleRaw, MIN_ZOOM, MAX_ZOOM);
    const mp = { x: (center.x - stagePos.x) / oldScale, y: (center.y - stagePos.y) / oldScale };
    setZoom(newScale);
    setStagePos({ x: center.x - mp.x * newScale, y: center.y - mp.y * newScale });
  };

  const onWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (!pointer) return;
    const factor = e.evt.deltaY > 0 ? 1 / 1.12 : 1.12;
    applyZoom(zoom * factor, pointer);
  };

  const zoomButton = (factor: number) => applyZoom(zoom * factor, { x: size.w / 2, y: size.h / 2 });
  const resetView = () => {
    setZoom(1);
    setStagePos({ x: 0, y: 0 });
  };

  const cursor = placingKind ? 'copy' : floorEditing ? 'pointer' : 'grab';

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: `radial-gradient(circle at 50% 38%, ${shade(style.bg, 0.12)} 0%, ${style.bg} 70%)`,
        cursor,
        position: 'relative',
      }}
    >
      {/* Guard: don't let Konva try to paint on a 0×0 canvas */}
      <Stage
        width={size.w || 1}
        height={size.h || 1}
        scaleX={zoom}
        scaleY={zoom}
        x={stagePos.x}
        y={stagePos.y}
        draggable
        onWheel={onWheel}
        onDragEnd={(e) => {
          // only the stage itself panning (not a child object) updates the view
          if (e.target === e.target.getStage()) {
            setStagePos({ x: e.target.x(), y: e.target.y() });
          }
        }}
      >
        <Layer>
          {/* Walls + floor tiles, interleaved by depth so they never overlap.
              Walls are per-tile edge quads, so they wrap any floor shape. */}
          {drawOrder.map((item) => {
            if (item.t === 'wall') {
              return <WallSegment key={item.key} seg={item.seg} style={style} opacity={1} />;
            }
            const t = item.tile;
            const floorBase = t.alt ? style.floorA : style.floorB;
            return (
              <Group key={item.key}>
                <Line
                  points={t.pts}
                  closed
                  fillPriority="linear-gradient"
                  fillLinearGradientStartPoint={{ x: t.cx, y: t.cy - HALF_H }}
                  fillLinearGradientEndPoint={{ x: t.cx, y: t.cy + HALF_H }}
                  fillLinearGradientColorStops={[0, shade(floorBase, 0.12), 1, shade(floorBase, -0.08)]}
                  stroke={floorEditing ? withAlpha('#ff8a8a', 0.5) : shade(style.floorA, -0.12)}
                  strokeWidth={floorEditing ? 1.5 : 1}
                  onClick={() => handleTileClick(t.gx, t.gy)}
                  onTap={() => handleTileClick(t.gx, t.gy)}
                  onMouseEnter={(e) => {
                    const stage = e.target.getStage();
                    if (!stage) return;
                    if (placingKind) stage.container().style.cursor = 'copy';
                    else if (floorEditing) stage.container().style.cursor = 'not-allowed';
                  }}
                  onMouseLeave={(e) => {
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = cursor;
                  }}
                />
                <Group listening={false}>
                  {floorTileDecor(style.floorPattern, t.cx, t.cy, style, t.alt)}
                </Group>
              </Group>
            );
          })}

          {/* Objects above floors; nearer floor tiles never paint over them. */}
          {sortedObjects.map((o) => {
            const s = gridToScreen(o.gridX, o.gridY, origin.x, origin.y);
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
                onSelect={onSelect}
                onDragEnd={handleDragEnd}
              />
            );
          })}

          {/* Front walls that occlude an object — drawn on top, see-through. */}
          {[...frontWallSegs]
            .sort((a, b) => a.depth - b.depth)
            .map((seg, i) => (
              <WallSegment key={`fw${i}`} seg={seg} style={style} opacity={0.28} />
            ))}

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
            <Group x={size.w / 2} y={size.h / 2}>
              <Text
                text={
                  placingKind
                    ? 'Click a floor tile to place the object'
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
