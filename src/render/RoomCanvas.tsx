import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  getRoomTiles,
  parseTileKey,
  tileKey,
  tileBounds,
  ghostTiles,
  nearestTile,
} from '../lib/floor';
import type { Room, PObject, Memory, AppMode } from '../types';

const WALL_H = 110;
const HALF_W = TILE_W / 2;
const HALF_H = TILE_H / 2;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

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
  const bounds = useMemo(() => tileBounds(presentKeys), [presentKeys]);

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

  const sortedObjects = useMemo(
    () => [...objects].sort((a, b) => depthKey(a.gridX, a.gridY) - depthKey(b.gridX, b.gridY)),
    [objects],
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
        });
      }
    }

    // Painter's algorithm: render back (low gx+gy) to front
    return segs.sort((a, b) => a.depth - b.depth);
  }, [presentKeys, present, origin.x, origin.y]);

  // Interleave walls and floors in a single depth-sorted pass so a wall in
  // front correctly occludes a floor tile behind it (and vice-versa). A wall
  // renders just before its own tile's floor (z = depth - 0.5).
  const drawOrder = useMemo(() => {
    type Item =
      | { z: number; t: 'wall'; key: string; seg: (typeof wallSegs)[number] }
      | { z: number; t: 'floor'; key: string; tile: (typeof tiles)[number] };
    const items: Item[] = [];
    wallSegs.forEach((seg, i) =>
      items.push({ z: seg.depth - 0.5, t: 'wall', key: `w${i}`, seg }),
    );
    for (const tile of tiles) {
      items.push({ z: tile.gx + tile.gy, t: 'floor', key: `f${tile.key}`, tile });
    }
    return items.sort((a, b) => a.z - b.z);
  }, [wallSegs, tiles]);

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
      <Stage
        width={size.w}
        height={size.h}
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
              const { seg } = item;
              const fill = seg.side === 'left' ? style.wallLeft : style.wallRight;
              return (
                <Fragment key={item.key}>
                  <Line points={seg.pts} closed fill={fill} stroke={shade(fill, -0.2)} strokeWidth={1} listening={false} />
                  <Group listening={false}>
                    {wallDecor(style.wallPattern, seg.p0, seg.p1, WALL_H, fill, style.accent)}
                  </Group>
                </Fragment>
              );
            }
            const t = item.tile;
            return (
              <Group key={item.key}>
                <Line
                  points={t.pts}
                  closed
                  fill={t.alt ? style.floorA : style.floorB}
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

          {/* Objects */}
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

          {objects.length === 0 && !floorEditing && (
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
