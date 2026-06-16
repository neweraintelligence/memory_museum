import { useMemo } from 'react';
import { Group, Line } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import FloorTileSurface from './FloorTileSurface';
import WallSegmentFace, { WallSegmentTopEdge, WallBaseKickplate } from './WallSegmentFace';
import IsoObject from './IsoObject';
import { usePublicImage } from './usePublicImage';
import { WallFeatureSprite } from './wallFeature';
import { TILE_W, TILE_H, tileDiamond, gridToScreen, floorDrawZ, wallDrawZ } from '../lib/iso';
import { getStyle } from '../themes/styles';
import { pickWallSegmentTexture } from '../themes/styleTextures';
import { getRoomTiles, parseTileKey } from '../lib/floor';
import { buildWallSegs } from '../lib/wallAttach';
import { findSurfaceUnder, footprintDepthKey, footprintTiles, objectScreenPos } from '../lib/objectPlacement';
import { isWallAttachable, mustStack, surfaceStackLift } from '../themes/objects';
import type { Room, PObject } from '../types';

const WALL_H = 110;
const HALF_W = TILE_W / 2;
const HALF_H = TILE_H / 2;

interface Props {
  room: Room;
  objects: PObject[];
  originX: number;
  originY: number;
  opacity: number;
  onPick: () => void;
}

const noop = () => {};

/**
 * A faded, non-interactive copy of a room drawn into the SAME isometric canvas
 * as the active room (same scale, no frame). Clicking anywhere on it switches to
 * that room. Reuses the real floor/wall/object renderers so it matches 1:1.
 */
export default function GhostRoom({ room, objects, originX, originY, opacity, onPick }: Props) {
  const style = getStyle(room.style);
  const floorTexPaths = style.floorTextures ?? [];
  const floorTex0 = usePublicImage(floorTexPaths[0]);
  const floorTex1 = usePublicImage(floorTexPaths[1]);
  const floorTex2 = usePublicImage(floorTexPaths[2]);
  const floorTex3 = usePublicImage(floorTexPaths[3]);
  const floorTexturesLoaded = useMemo(
    () => [floorTex0, floorTex1, floorTex2, floorTex3].slice(0, floorTexPaths.length),
    [floorTexPaths.length, floorTex0, floorTex1, floorTex2, floorTex3],
  );
  const wallTexLeft = usePublicImage(style.wallTextures?.left);
  const wallTexLeftAlt = usePublicImage(style.wallTextures?.leftAlt);
  const wallTexRight = usePublicImage(style.wallTextures?.right);
  const wallTexRightAlt = usePublicImage(style.wallTextures?.rightAlt);
  const wallTexLoaded = {
    left: wallTexLeft,
    leftAlt: wallTexLeftAlt,
    right: wallTexRight,
    rightAlt: wallTexRightAlt,
  };

  const presentKeys = useMemo(() => getRoomTiles(room), [room]);
  const present = useMemo(() => new Set(presentKeys), [presentKeys]);

  const tiles = useMemo(
    () =>
      presentKeys.map((k) => {
        const { gx, gy } = parseTileKey(k);
        const c = gridToScreen(gx, gy, originX, originY);
        return {
          gx,
          gy,
          key: k,
          pts: tileDiamond(gx, gy, originX, originY),
          alt: (gx + gy) % 2 === 0,
          cx: c.x,
          cy: c.y,
        };
      }),
    [presentKeys, originX, originY],
  );

  const wallSegs = useMemo(
    () => buildWallSegs(presentKeys, present, originX, originY, HALF_W, HALF_H, WALL_H),
    [presentKeys, present, originX, originY],
  );

  const liveObjects = useMemo(() => objects.filter((o) => !o.deleted), [objects]);

  const floorObjects = useMemo(
    () =>
      liveObjects
        .filter((o) => !o.wallSide && !isWallAttachable(o.kind))
        .sort((a, b) => {
          const d = footprintDepthKey(a) - footprintDepthKey(b);
          if (d !== 0) return d;
          return (mustStack(a.kind) ? 1 : 0) - (mustStack(b.kind) ? 1 : 0);
        }),
    [liveObjects],
  );

  const stackLiftById = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of floorObjects) {
      if (!mustStack(o.kind)) continue;
      const surface = findSurfaceUnder(floorObjects, room.id, footprintTiles(o), o.id);
      if (surface) map.set(o.id, surfaceStackLift(surface.kind));
    }
    return map;
  }, [floorObjects, room.id]);

  const wallMountsBySeg = useMemo(() => {
    const map = new Map<string, PObject>();
    for (const o of liveObjects) {
      if (!o.wallSide) continue;
      map.set(`${o.gridX},${o.gridY},${o.wallSide}`, o);
    }
    return map;
  }, [liveObjects]);

  // Walls + floor interleaved by depth (painter's order). Objects simply draw
  // on top, which reads fine for a faded backdrop room.
  const drawOrder = useMemo(() => {
    type Item =
      | { z: number; t: 'wall'; key: string; idx: number }
      | { z: number; t: 'kick'; key: string; idx: number }
      | { z: number; t: 'floor'; key: string; idx: number };
    const items: Item[] = [];
    wallSegs.forEach((seg, i) => {
      const z = wallDrawZ(seg.depth);
      items.push({ z, t: 'wall', key: `w${i}`, idx: i });
      items.push({ z: z + 0.1, t: 'kick', key: `k${i}`, idx: i });
    });
    tiles.forEach((tile, i) =>
      items.push({
        z: floorDrawZ(tile.gx, tile.gy),
        t: 'floor',
        key: `f${tile.key}`,
        idx: i,
      }),
    );
    return items.sort((a, b) => a.z - b.z);
  }, [wallSegs, tiles]);

  const setPointer = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = 'pointer';
  };
  const resetPointer = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = 'default';
  };

  return (
    <Group
      opacity={opacity}
      onClick={onPick}
      onTap={onPick}
      onMouseEnter={setPointer}
      onMouseLeave={resetPointer}
    >
      {drawOrder.map((item) => {
        if (item.t === 'wall') {
          const seg = wallSegs[item.idx];
          const feature = wallMountsBySeg.get(`${seg.gx},${seg.gy},${seg.side}`) ?? null;
          const texture = pickWallSegmentTexture(seg, style.wallTextures, wallTexLoaded);
          const useWallTexture = !!(style.wallTextures && texture);
          return (
            <Group key={item.key} listening={false}>
              <WallSegmentFace
                seg={seg}
                style={style}
                wallH={WALL_H}
                texture={texture}
                feature={!!feature}
              />
              <WallSegmentTopEdge
                seg={seg}
                style={style}
                wallH={WALL_H}
                useTexture={useWallTexture}
              />
            </Group>
          );
        }
        if (item.t === 'kick') {
          const seg = wallSegs[item.idx];
          return (
            <WallBaseKickplate
              key={item.key}
              seg={seg}
              style={style}
              wallH={WALL_H}
              texture={pickWallSegmentTexture(seg, style.wallTextures, wallTexLoaded)}
            />
          );
        }
        const t = tiles[item.idx];
        return (
          <FloorTileSurface
            key={item.key}
            tile={t}
            style={style}
            floorEditing={false}
            textures={floorTexturesLoaded}
            cursor="pointer"
            placingKind={null}
            blockViewportPan={noop}
            onTileClick={onPick}
          />
        );
      })}

      {wallSegs.map((seg, i) => {
        const feature = wallMountsBySeg.get(`${seg.gx},${seg.gy},${seg.side}`);
        if (!feature) return null;
        const fill = seg.side === 'left' ? style.wallLeft : style.wallRight;
        return (
          <WallFeatureSprite
            key={`wall-feature-${i}`}
            kind={feature.kind}
            color={feature.color}
            p0={seg.p0}
            p1={seg.p1}
            wallH={WALL_H}
            wallFill={fill}
            side={seg.side}
          />
        );
      })}

      {floorObjects.map((o) => {
        const s = objectScreenPos(o, originX, originY);
        return (
          <IsoObject
            key={o.id}
            obj={o}
            x={s.x}
            y={s.y}
            draggable={false}
            selected={false}
            highlighted={false}
            pulse={0}
            dim={false}
            stackLift={stackLiftById.get(o.id) ?? 0}
            onSelect={onPick}
            onDragEnd={noop}
          />
        );
      })}

      {/* Transparent hit cover so clicks on walls (which are non-listening) still
          switch rooms. */}
      {wallSegs.map((seg, i) => (
        <Line
          key={`hit${i}`}
          points={seg.pts}
          closed
          fill="rgba(0,0,0,0.001)"
          onClick={onPick}
          onTap={onPick}
          onMouseEnter={setPointer}
          onMouseLeave={resetPointer}
        />
      ))}
    </Group>
  );
}
