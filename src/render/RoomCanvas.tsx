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
  centeredOrigin,
  clamp,
  depthKey,
} from '../lib/iso';
import { shade } from '../lib/color';
import { getStyle } from '../themes/styles';
import type { Room, PObject, Memory, AppMode } from '../types';

const WALL_H = 70;

interface Props {
  room: Room;
  objects: PObject[];
  memories: Memory[];
  mode: AppMode;
  placingKind: string | null;
  selectedId: string | null;
  highlightId: string | null;
  focusHighlight: boolean;
  onSelect: (id: string | null) => void;
  onPlace: (gx: number, gy: number) => void;
  onMove: (id: string, gx: number, gy: number) => void;
}

export default function RoomCanvas({
  room,
  objects,
  memories,
  mode,
  placingKind,
  selectedId,
  highlightId,
  focusHighlight,
  onSelect,
  onPlace,
  onMove,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
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
  const origin = useMemo(
    () => centeredOrigin(room.gridW, room.gridH, size.w, size.h),
    [room.gridW, room.gridH, size.w, size.h],
  );

  const anchorIds = useMemo(() => {
    const set = new Set<string>();
    for (const m of memories) {
      if (m.prompt || m.body || m.answer || m.tags.length > 0 || m.imageUrl) {
        set.add(m.objectId);
      }
    }
    return set;
  }, [memories]);

  const tiles = useMemo(() => {
    const arr: { gx: number; gy: number; pts: number[]; alt: boolean }[] = [];
    for (let gy = 0; gy < room.gridH; gy++) {
      for (let gx = 0; gx < room.gridW; gx++) {
        arr.push({
          gx,
          gy,
          pts: tileDiamond(gx, gy, origin.x, origin.y),
          alt: (gx + gy) % 2 === 0,
        });
      }
    }
    return arr;
  }, [room.gridW, room.gridH, origin.x, origin.y]);

  const sortedObjects = useMemo(
    () => [...objects].sort((a, b) => depthKey(a.gridX, a.gridY) - depthKey(b.gridX, b.gridY)),
    [objects],
  );

  // Wall geometry
  const back = gridToScreen(0, 0, origin.x, origin.y);
  const backTop = { x: back.x, y: back.y - TILE_H / 2 };
  const rc = gridToScreen(room.gridW - 1, 0, origin.x, origin.y);
  const rightCorner = { x: rc.x + TILE_W / 2, y: rc.y };
  const lc = gridToScreen(0, room.gridH - 1, origin.x, origin.y);
  const leftCorner = { x: lc.x - TILE_W / 2, y: lc.y };

  const wallRight = [
    backTop.x, backTop.y,
    rightCorner.x, rightCorner.y,
    rightCorner.x, rightCorner.y - WALL_H,
    backTop.x, backTop.y - WALL_H,
  ];
  const wallLeft = [
    leftCorner.x, leftCorner.y,
    backTop.x, backTop.y,
    backTop.x, backTop.y - WALL_H,
    leftCorner.x, leftCorner.y - WALL_H,
  ];

  const handleTileClick = (gx: number, gy: number) => {
    if (placingKind) {
      onPlace(gx, gy);
    } else {
      onSelect(null);
    }
  };

  const handleDragEnd = (id: string, e: KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const { gx, gy } = screenToGrid(node.x(), node.y(), origin.x, origin.y);
    const cgx = clamp(Math.round(gx), 0, room.gridW - 1);
    const cgy = clamp(Math.round(gy), 0, room.gridH - 1);
    const snapped = gridToScreen(cgx, cgy, origin.x, origin.y);
    node.position({ x: snapped.x, y: snapped.y });
    onMove(id, cgx, cgy);
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: `radial-gradient(circle at 50% 38%, ${shade(style.bg, 0.12)} 0%, ${style.bg} 70%)`,
        cursor: placingKind ? 'copy' : 'default',
      }}
    >
      <Stage width={size.w} height={size.h}>
        <Layer>
          {/* Walls (drawn first, behind floor objects) */}
          <Line points={wallLeft} closed fill={style.wallLeft} stroke={shade(style.wallLeft, -0.2)} strokeWidth={1} />
          <Line points={wallRight} closed fill={style.wallRight} stroke={shade(style.wallRight, -0.2)} strokeWidth={1} />

          {/* Floor tiles */}
          {tiles.map((t) => (
            <Line
              key={`${t.gx}-${t.gy}`}
              points={t.pts}
              closed
              fill={t.alt ? style.floorA : style.floorB}
              stroke={shade(style.floorA, -0.12)}
              strokeWidth={1}
              onClick={() => handleTileClick(t.gx, t.gy)}
              onTap={() => handleTileClick(t.gx, t.gy)}
              onMouseEnter={(e) => {
                if (!placingKind) return;
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = 'copy';
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
                draggable={mode === 'build'}
                selected={selectedId === o.id}
                highlighted={isHi}
                isAnchor={anchorIds.has(o.id)}
                pulse={pulse}
                dim={focusHighlight && !!highlightId && !isHi}
                onSelect={onSelect}
                onDragEnd={handleDragEnd}
              />
            );
          })}

          {objects.length === 0 && (
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
    </div>
  );
}
