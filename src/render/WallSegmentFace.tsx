import { Group, Image as KonvaImage, Line } from 'react-konva';
import { shade, withAlpha } from '../lib/color';
import { wallDecor } from './roomArt';
import type { WallSeg } from '../lib/wallAttach';
import type { RoomStyle } from '../themes/styles';

const SEAM_BLEED = 1;

function wallClip(
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

interface Props {
  seg: WallSeg;
  style: RoomStyle;
  wallH: number;
  texture: HTMLImageElement | null;
  feature?: boolean;
}

/** Wall face fill — PNG texture or procedural gradient + decor. */
export default function WallSegmentFace({ seg, style, wallH, texture, feature }: Props) {
  const fill = seg.side === 'left' ? style.wallLeft : style.wallRight;
  const useTexture = !!(style.wallTextures && texture);

  if (useTexture) {
    const minX = Math.min(seg.p0.x, seg.p1.x);
    const maxX = Math.max(seg.p0.x, seg.p1.x);
    const minY = Math.min(seg.p0.y - wallH, seg.p1.y - wallH);
    const maxY = Math.max(seg.p0.y, seg.p1.y);
    return (
      <Group listening={false} clipFunc={(ctx) => wallClip(ctx, seg.pts)}>
        <KonvaImage
          image={texture}
          x={minX - SEAM_BLEED}
          y={minY - SEAM_BLEED}
          width={maxX - minX + SEAM_BLEED * 2}
          height={maxY - minY + SEAM_BLEED * 2}
        />
      </Group>
    );
  }

  return (
    <>
      <Line
        points={seg.pts}
        closed
        fillPriority="linear-gradient"
        fillLinearGradientStartPoint={{ x: seg.p0.x, y: seg.p0.y - wallH }}
        fillLinearGradientEndPoint={{ x: seg.p0.x, y: seg.p0.y }}
        fillLinearGradientColorStops={[0, shade(fill, 0.16), 0.5, fill, 1, shade(fill, -0.18)]}
        stroke={shade(fill, -0.18)}
        strokeWidth={1}
        listening={false}
      />
      {!feature && (
        <Group listening={false}>
          {wallDecor(style.wallPattern, seg.p0, seg.p1, wallH, fill, style.accent)}
        </Group>
      )}
    </>
  );
}

/**
 * Subtle vertical highlight where a left wall folds into a right wall (the
 * room's back/top corner). Catches ambient light along the crease so the two
 * faces read as a joined corner rather than a flat seam. Theme-aware and faint
 * so it works over both procedural and textured walls.
 */
export function RoomCornerSeam({
  x,
  baseY,
  wallH,
  style,
}: {
  x: number;
  baseY: number;
  wallH: number;
  style: RoomStyle;
}) {
  // Inset the top so the seam doesn't poke above where the two wall top edges meet.
  const topY = baseY - wallH + 6;
  const highlight = shade(style.wallRight, 0.32);
  const shadow = shade(style.wallLeft, -0.22);
  return (
    <Group listening={false}>
      {/* Soft contact shadow tucked into the crease (ambient occlusion). */}
      <Line
        points={[x, topY, x, baseY]}
        stroke={shadow}
        strokeWidth={2.5}
        opacity={0.16}
        lineCap="butt"
      />
      {/* Crisp edge highlight, brightest up top and fading toward the floor. */}
      <Line
        points={[x, topY, x, baseY]}
        strokeWidth={1.25}
        strokeLinearGradientStartPoint={{ x, y: topY }}
        strokeLinearGradientEndPoint={{ x, y: baseY }}
        strokeLinearGradientColorStops={[
          0,
          withAlpha(highlight, 0.6),
          0.65,
          withAlpha(highlight, 0.22),
          1,
          withAlpha(highlight, 0),
        ]}
        lineCap="butt"
      />
    </Group>
  );
}

export function WallSegmentTopEdge({
  seg,
  style,
  wallH,
  useTexture,
}: {
  seg: WallSeg;
  style: RoomStyle;
  wallH: number;
  useTexture: boolean;
}) {
  if (useTexture) return null;
  const fill = seg.side === 'left' ? style.wallLeft : style.wallRight;
  const lightEdge = shade(fill, 0.2);
  return (
    <Line
      points={[seg.p0.x, seg.p0.y - wallH, seg.p1.x, seg.p1.y - wallH]}
      stroke={lightEdge}
      strokeWidth={1.5}
      opacity={0.6}
      listening={false}
    />
  );
}

/** Bottom strip redrawn over floor tiles so grid seams don't bleed onto the wall foot. */
export function WallBaseKickplate({
  seg,
  style,
  wallH,
  texture,
}: {
  seg: WallSeg;
  style: RoomStyle;
  wallH: number;
  texture: HTMLImageElement | null;
}) {
  const fill = seg.side === 'left' ? style.wallLeft : style.wallRight;
  const useTexture = !!(style.wallTextures && texture);
  const kickH = wallH * 0.22;
  const floorOverlap = 8;
  const kickPts = [
    seg.p0.x,
    seg.p0.y + floorOverlap,
    seg.p1.x,
    seg.p1.y + floorOverlap,
    seg.p1.x,
    seg.p1.y - kickH,
    seg.p0.x,
    seg.p0.y - kickH,
  ];

  if (useTexture) {
    const minX = Math.min(seg.p0.x, seg.p1.x);
    const maxX = Math.max(seg.p0.x, seg.p1.x);
    const minY = Math.min(seg.p0.y - wallH, seg.p1.y - wallH);
    const maxY = Math.max(seg.p0.y, seg.p1.y);
    return (
      <Group listening={false} clipFunc={(ctx) => wallClip(ctx, kickPts)}>
        <KonvaImage
          image={texture}
          x={minX - SEAM_BLEED}
          y={minY - SEAM_BLEED}
          width={maxX - minX + SEAM_BLEED * 2}
          height={maxY - minY + SEAM_BLEED * 2}
        />
      </Group>
    );
  }

  return (
    <Line
      points={kickPts}
      closed
      fillPriority="linear-gradient"
      fillLinearGradientStartPoint={{ x: seg.p0.x, y: seg.p0.y - kickH }}
      fillLinearGradientEndPoint={{ x: seg.p0.x, y: seg.p0.y + floorOverlap }}
      fillLinearGradientColorStops={[0, shade(fill, 0.16), 0.5, fill, 1, shade(fill, -0.18)]}
      listening={false}
    />
  );
}
