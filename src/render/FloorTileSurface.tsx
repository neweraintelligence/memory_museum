import { Group, Image as KonvaImage, Line } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { TILE_W, TILE_H } from '../lib/iso';
import { shade, withAlpha } from '../lib/color';
import { floorTileDecor } from './roomArt';
import type { RoomStyle } from '../themes/styles';
import { floorVariantIndex } from '../themes/styleTextures';

const HALF_W = TILE_W / 2;
const HALF_H = TILE_H / 2;
/** Extra pixels per side so adjacent textured tiles overlap and hide seam gaps. */
const SEAM_BLEED = 2;

interface TileGeom {
  gx: number;
  gy: number;
  pts: number[];
  cx: number;
  cy: number;
  alt: boolean;
}

interface Props {
  tile: TileGeom;
  style: RoomStyle;
  floorEditing: boolean;
  textures: (HTMLImageElement | null)[];
  cursor: string;
  placingKind: string | null;
  blockViewportPan: (e: KonvaEventObject<MouseEvent>) => void;
  onTileClick: (gx: number, gy: number) => void;
}

function diamondClip(
  ctx: {
    beginPath: () => void;
    moveTo: (x: number, y: number) => void;
    lineTo: (x: number, y: number) => void;
    closePath: () => void;
  },
  pts: number[],
) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
}

export default function FloorTileSurface({
  tile: t,
  style,
  floorEditing,
  textures,
  cursor,
  placingKind,
  blockViewportPan,
  onTileClick,
}: Props) {
  const variantCount = (style.floorTextures?.length === 4 ? 4 : 2) as 2 | 4;
  const variantIndex = floorVariantIndex(t.gx, t.gy, variantCount);
  const floorBase = variantIndex % 2 === 0 ? style.floorA : style.floorB;
  const texture = textures[variantIndex] ?? undefined;
  const useTexture = textures.length >= 2 && textures.every((img) => img != null);

  const hitHandlers = {
    onMouseDown: blockViewportPan,
    onClick: () => onTileClick(t.gx, t.gy),
    onTap: () => onTileClick(t.gx, t.gy),
    onMouseEnter: (e: KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return;
      if (placingKind) stage.container().style.cursor = 'copy';
      else if (floorEditing) stage.container().style.cursor = 'not-allowed';
    },
    onMouseLeave: (e: KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      if (stage) stage.container().style.cursor = cursor;
    },
  };

  if (useTexture) {
    const rot = style.floorTextureRotation ?? 0;
    const isoNative = style.floorTextureAspect === 'iso';
    return (
      <Group>
        <Group listening={false} clipFunc={(ctx) => diamondClip(ctx, t.pts)}>
          {isoNative ? (
            <KonvaImage
              image={texture}
              x={t.cx - HALF_W - SEAM_BLEED}
              y={t.cy - HALF_H - SEAM_BLEED}
              width={TILE_W + SEAM_BLEED * 2}
              height={TILE_H + SEAM_BLEED * 2}
            />
          ) : (
            <Group x={t.cx} y={t.cy} rotation={rot}>
              <KonvaImage
                image={texture}
                x={-HALF_W - SEAM_BLEED}
                y={-HALF_W - SEAM_BLEED}
                width={TILE_W + SEAM_BLEED * 2}
                height={TILE_W + SEAM_BLEED * 2}
              />
            </Group>
          )}
        </Group>
        <Line
          points={t.pts}
          closed
          fill="rgba(0,0,0,0.001)"
          stroke={floorEditing ? withAlpha('#ff8a8a', 0.5) : undefined}
          strokeWidth={floorEditing ? 1.5 : 0}
          {...hitHandlers}
        />
      </Group>
    );
  }

  return (
    <Group>
      <Line
        points={t.pts}
        closed
        fillPriority="linear-gradient"
        fillLinearGradientStartPoint={{ x: t.cx, y: t.cy - HALF_H }}
        fillLinearGradientEndPoint={{ x: t.cx, y: t.cy + HALF_H }}
        fillLinearGradientColorStops={[0, shade(floorBase, 0.12), 1, shade(floorBase, -0.08)]}
        stroke={floorEditing ? withAlpha('#ff8a8a', 0.5) : shade(style.floorA, -0.12)}
        strokeWidth={floorEditing ? 1.5 : 1}
        {...hitHandlers}
      />
      <Group listening={false}>
        {floorTileDecor(style.floorPattern, t.cx, t.cy, style, variantIndex % 2 === 0)}
      </Group>
    </Group>
  );
}
