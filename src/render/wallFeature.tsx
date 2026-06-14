import { Fragment } from 'react';
import { Line, Circle, Image as KonvaImage, Group } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { shade, withAlpha } from '../lib/color';
import { palette } from './art';
import { objectIcon, useIconImage } from '../themes/icons';
import type { PObject } from '../types';

interface Pt {
  x: number;
  y: number;
}

const interp = (a: Pt, b: Pt, t: number): Pt => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

/** Height above the wall base (p0/p1 y). */
const lift = (p: Pt, h: number): Pt => ({ x: p.x, y: p.y - h });

export interface WallFeatureLayout {
  t0: number;
  t1: number;
  h0: number;
  h1: number;
}

export function wallFeatureLayout(kind: string, wallH: number): WallFeatureLayout {
  switch (kind) {
    case 'door':
      return { t0: 0.1, t1: 0.9, h0: 2, h1: wallH * 0.96 };
    case 'window':
      return { t0: 0.18, t1: 0.82, h0: wallH * 0.28, h1: wallH * 0.8 };
    case 'mirror':
      return { t0: 0.22, t1: 0.78, h0: wallH * 0.22, h1: wallH * 0.74 };
    case 'painting':
      return { t0: 0.2, t1: 0.8, h0: wallH * 0.24, h1: wallH * 0.76 };
    default:
      return { t0: 0.2, t1: 0.8, h0: wallH * 0.25, h1: wallH * 0.75 };
  }
}

function featureCorners(p0: Pt, p1: Pt, layout: WallFeatureLayout): [Pt, Pt, Pt, Pt] {
  const bl = lift(interp(p0, p1, layout.t0), layout.h0);
  const br = lift(interp(p0, p1, layout.t1), layout.h0);
  const tr = lift(interp(p0, p1, layout.t1), layout.h1);
  const tl = lift(interp(p0, p1, layout.t0), layout.h1);
  return [bl, br, tr, tl];
}

export function wallFeaturePts(p0: Pt, p1: Pt, layout: WallFeatureLayout): number[] {
  const [bl, br, tr, tl] = featureCorners(p0, p1, layout);
  return [bl.x, bl.y, br.x, br.y, tr.x, tr.y, tl.x, tl.y];
}

export function wallFeatureCenter(p0: Pt, p1: Pt, layout: WallFeatureLayout): Pt {
  const [bl, br, tr, tl] = featureCorners(p0, p1, layout);
  return {
    x: (bl.x + br.x + tr.x + tl.x) / 4,
    y: (bl.y + br.y + tr.y + tl.y) / 4,
  };
}

function insetQuad(
  p0: Pt,
  p1: Pt,
  layout: WallFeatureLayout,
  insetT: number,
  insetH: number,
): number[] {
  const inner: WallFeatureLayout = {
    t0: layout.t0 + insetT,
    t1: layout.t1 - insetT,
    h0: layout.h0 + insetH,
    h1: layout.h1 - insetH,
  };
  return wallFeaturePts(p0, p1, inner);
}

function vSeg(p0: Pt, p1: Pt, t: number, h0: number, h1: number, key: string, color: string, w: number) {
  const b = interp(p0, p1, t);
  return (
    <Line
      key={key}
      points={[b.x, b.y - h0, b.x, b.y - h1]}
      stroke={color}
      strokeWidth={w}
      listening={false}
    />
  );
}

/** Integrated wall cutout — drawn in the wall's native parallelogram space. */
export function renderWallFeature(
  kind: string,
  color: string,
  p0: Pt,
  p1: Pt,
  wallH: number,
  wallFill: string,
) {
  const layout = wallFeatureLayout(kind, wallH);
  const outer = wallFeaturePts(p0, p1, layout);
  const inner = insetQuad(p0, p1, layout, 0.04, 5);
  const p = palette(color);
  const frame = palette(kind === 'window' ? '#7d8a96' : kind === 'door' ? shade(color, -0.2) : '#6b4a2c');
  const dark = shade(wallFill, -0.28);

  const midT = (layout.t0 + layout.t1) / 2;
  const midH = (layout.h0 + layout.h1) / 2;

  let innerFill: string;
  let extras: React.ReactNode = null;

  if (kind === 'window') {
    innerFill = withAlpha('#bfe3f2', 0.92);
    extras = (
      <Fragment>
        {vSeg(p0, p1, midT, layout.h0 + 4, layout.h1 - 4, 'vm', frame.dark, 2)}
        <Line
          points={[
            interp(p0, p1, layout.t0 + 0.04).x,
            interp(p0, p1, layout.t0 + 0.04).y - midH,
            interp(p0, p1, layout.t1 - 0.04).x,
            interp(p0, p1, layout.t1 - 0.04).y - midH,
          ]}
          stroke={frame.dark}
          strokeWidth={2}
          listening={false}
        />
        <Line
          points={[
            interp(p0, p1, layout.t0 + 0.06).x,
            interp(p0, p1, layout.t0 + 0.06).y - layout.h0 - 6,
            interp(p0, p1, layout.t1 - 0.06).x,
            interp(p0, p1, layout.t1 - 0.06).y - layout.h1 + 6,
          ]}
          stroke={withAlpha('#ffffff', 0.35)}
          strokeWidth={2}
          listening={false}
        />
      </Fragment>
    );
  } else if (kind === 'mirror') {
    innerFill = p.light;
    const shine0 = lift(interp(p0, p1, layout.t0 + 0.06), layout.h0 + 8);
    const shine1 = lift(interp(p0, p1, layout.t1 - 0.12), layout.h1 - 14);
    extras = (
      <Line
        points={[shine0.x, shine0.y, shine1.x, shine1.y]}
        stroke="#ffffff"
        strokeWidth={3}
        opacity={0.5}
        listening={false}
      />
    );
  } else if (kind === 'door') {
    innerFill = p.base;
    const knob = lift(interp(p0, p1, layout.t1 - 0.1), midH);
    const panelTop = lift(interp(p0, p1, layout.t0 + 0.06), layout.h0 + 8);
    const panelBot = lift(interp(p0, p1, layout.t1 - 0.06), midH - 4);
    const panelTop2 = lift(interp(p0, p1, layout.t0 + 0.06), midH + 4);
    const panelBot2 = lift(interp(p0, p1, layout.t1 - 0.06), layout.h1 - 10);
    extras = (
      <Fragment>
        <Line
          points={[
            panelTop.x, panelTop.y,
            interp(p0, p1, layout.t1 - 0.06).x, interp(p0, p1, layout.t1 - 0.06).y - layout.h0 - 8,
            interp(p0, p1, layout.t1 - 0.06).x, panelBot.y,
            panelTop.x, panelBot.y,
          ]}
          closed
          fill={p.dark}
          opacity={0.45}
          listening={false}
        />
        <Line
          points={[
            panelTop2.x, panelTop2.y,
            interp(p0, p1, layout.t1 - 0.06).x, panelTop2.y,
            interp(p0, p1, layout.t1 - 0.06).x, panelBot2.y,
            panelTop2.x, panelBot2.y,
          ]}
          closed
          fill={p.dark}
          opacity={0.45}
          listening={false}
        />
        <Circle x={knob.x} y={knob.y} radius={2.2} fill={p.lighter} stroke={p.outline} strokeWidth={0.6} listening={false} />
      </Fragment>
    );
  } else {
    innerFill = p.base;
    const art0 = lift(interp(p0, p1, layout.t0 + 0.05), layout.h0 + 8);
    const art1 = lift(interp(p0, p1, layout.t1 - 0.05), layout.h1 - 10);
    const artMid = lift(interp(p0, p1, midT), midH);
    extras = (
      <Fragment>
        <Line points={[art0.x, art0.y, artMid.x, artMid.y, art1.x, art1.y]} closed fill={p.dark} opacity={0.65} listening={false} />
        <Circle x={artMid.x + 8} y={artMid.y - 6} radius={3.5} fill={p.lighter} listening={false} />
      </Fragment>
    );
  }

  return (
    <Fragment>
      {/* recess shadow */}
      <Line points={outer} closed fill={dark} opacity={0.55} listening={false} />
      {/* frame */}
      <Line points={outer} closed fill={frame.base} stroke={frame.outline} strokeWidth={1.5} listening={false} />
      {/* inset face */}
      <Line points={inner} closed fill={innerFill} stroke={frame.dark} strokeWidth={1} listening={false} />
      {extras}
    </Fragment>
  );
}

interface InteractProps {
  obj: PObject;
  p0: Pt;
  p1: Pt;
  wallH: number;
  draggable: boolean;
  selected: boolean;
  highlighted: boolean;
  isAnchor: boolean;
  pulse: number;
  dim: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, e: KonvaEventObject<DragEvent>) => void;
}

/** Selection halo + invisible drag hit area on the wall face. */
export function WallFeatureInteract({
  obj,
  p0,
  p1,
  wallH,
  draggable,
  selected,
  highlighted,
  isAnchor,
  pulse,
  dim,
  onSelect,
  onDragEnd,
}: InteractProps) {
  const layout = wallFeatureLayout(obj.kind, wallH);
  const hitPts = wallFeaturePts(p0, p1, layout);
  const center = wallFeatureCenter(p0, p1, layout);
  const badgeImg = useIconImage(objectIcon(obj.kind), '#eef2ff', 36);

  return (
    <Group opacity={dim ? 0.35 : 1}>
      {(selected || highlighted || isAnchor) && (
        <Line
          points={hitPts}
          closed
          stroke={highlighted ? '#ffe27a' : selected ? '#7dd3fc' : withAlpha(obj.color, 0.85)}
          strokeWidth={highlighted ? 3 : 2}
          dash={selected ? [5, 4] : undefined}
          opacity={isAnchor && !selected && !highlighted ? 0.4 + pulse * 0.35 : 0.95}
          listening={false}
        />
      )}

      {highlighted && (
        <Line
          points={hitPts}
          closed
          fill={withAlpha('#ffe27a', 0.12 + pulse * 0.1)}
          listening={false}
        />
      )}

      <Line
        points={hitPts}
        closed
        fill="rgba(0,0,0,0.001)"
        draggable={draggable}
        onMouseDown={(e) => {
          e.cancelBubble = true;
        }}
        onClick={() => onSelect(obj.id)}
        onTap={() => onSelect(obj.id)}
        onMouseEnter={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = draggable ? 'grab' : 'pointer';
        }}
        onMouseLeave={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'default';
        }}
        onDragStart={(e) => e.target.moveToTop()}
        onDragMove={(e) => e.target.position({ x: 0, y: 0 })}
        onDragEnd={(e) => {
          e.target.position({ x: 0, y: 0 });
          onDragEnd(obj.id, e);
        }}
      />

      {selected && (
        <Group x={center.x} y={center.y - 10} listening={false}>
          <Circle x={0} y={0} radius={11} fill="rgba(12,14,22,0.78)" stroke={withAlpha(obj.color, 0.85)} strokeWidth={1.2} />
          {badgeImg && <KonvaImage image={badgeImg} x={-7} y={-7} width={14} height={14} />}
        </Group>
      )}
    </Group>
  );
}
