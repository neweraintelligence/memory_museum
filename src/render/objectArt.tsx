import { Fragment } from 'react';
import { Line, Rect, Circle, Ellipse, Star } from 'react-konva';
import { shade, withAlpha } from '../lib/color';
import {
  palette,
  isoBoxFaces,
  diamond,
  archetypeFor,
  OBJ_HW,
  OBJ_HH,
} from './art';
import type { Palette } from './art';

/** A shaded isometric box with outline + a top highlight inset. */
function IsoBox({
  hw,
  hh,
  h,
  baseY = 0,
  p,
  outline = true,
}: {
  hw: number;
  hh: number;
  h: number;
  baseY?: number;
  p: Palette;
  outline?: boolean;
}) {
  const f = isoBoxFaces(hw, hh, h, baseY);
  const stroke = outline ? p.outline : undefined;
  return (
    <Fragment>
      <Line points={f.left} closed fill={p.dark} stroke={stroke} strokeWidth={1} />
      <Line points={f.right} closed fill={p.base} stroke={stroke} strokeWidth={1} />
      <Line points={f.top} closed fill={p.light} stroke={stroke} strokeWidth={1} />
      <Line points={diamond(hw * 0.58, hh * 0.58, baseY - h)} closed fill={p.lighter} opacity={0.5} />
    </Fragment>
  );
}

// ---- Archetypes ------------------------------------------------------------

function crate(p: Palette) {
  const hw = OBJ_HW * 0.92;
  const hh = OBJ_HH * 0.92;
  const h = 30;
  const d = h * 0.5;
  return (
    <Fragment>
      <IsoBox hw={hw} hh={hh} h={h} p={p} />
      {/* drawer / panel seam on the right face */}
      <Line points={[0, hh - d, hw, -d]} stroke={p.darker} strokeWidth={1.2} opacity={0.7} />
      <Circle x={hw * 0.5} y={hh * 0.5 - d} radius={1.8} fill={p.lighter} />
      {/* seam on the left face */}
      <Line points={[-hw, -d, 0, hh - d]} stroke={p.darker} strokeWidth={1.2} opacity={0.5} />
    </Fragment>
  );
}

function light(p: Palette, pulse: number, kind: string) {
  const glow = (
    <Fragment>
      <Circle x={0} y={-30} radius={24 + pulse * 8} fill={withAlpha(p.lighter, 0.18 + pulse * 0.12)} />
      <Circle x={0} y={-30} radius={13 + pulse * 3} fill={withAlpha(p.lighter, 0.4)} />
    </Fragment>
  );

  if (kind === 'candle') {
    const cp = palette('#efe4c4');
    return (
      <Fragment>
        {glow}
        <IsoBox hw={6} hh={3} h={26} p={cp} />
        {/* flame */}
        <Ellipse x={0} y={-34} radiusX={4} radiusY={8 + pulse * 2} fill="#ffd76a" />
        <Ellipse x={0} y={-32} radiusX={2} radiusY={4 + pulse} fill="#fff3c0" />
      </Fragment>
    );
  }

  if (kind === 'gem') {
    return (
      <Fragment>
        {glow}
        <Line
          points={[0, -42, 11, -28, 0, -14, -11, -28]}
          closed
          fill={p.base}
          stroke={p.outline}
          strokeWidth={1}
        />
        <Line points={[0, -42, 0, -14, -11, -28]} closed fill={p.light} opacity={0.7} />
        <Circle x={-4} y={-32} radius={1.6} fill="#ffffff" opacity={0.9} />
      </Fragment>
    );
  }

  if (kind === 'crystal') {
    return (
      <Fragment>
        {glow}
        <Line points={[-7, 0, -3, -30, 1, 0]} closed fill={p.dark} stroke={p.outline} strokeWidth={1} />
        <Line points={[-1, 0, 4, -40, 9, 0]} closed fill={p.base} stroke={p.outline} strokeWidth={1} />
        <Line points={[5, 0, 12, -24, 16, 0]} closed fill={p.light} stroke={p.outline} strokeWidth={1} />
      </Fragment>
    );
  }

  if (kind === 'star') {
    return (
      <Fragment>
        {glow}
        <Star
          x={0}
          y={-30}
          numPoints={5}
          innerRadius={6}
          outerRadius={15}
          fill={p.base}
          stroke={p.outline}
          strokeWidth={1}
        />
        <Star x={0} y={-30} numPoints={5} innerRadius={3} outerRadius={8} fill={p.lighter} />
      </Fragment>
    );
  }

  if (kind === 'fountain') {
    const stone = palette('#b9bfc4');
    return (
      <Fragment>
        <IsoBox hw={OBJ_HW * 0.95} hh={OBJ_HH * 0.95} h={14} p={stone} />
        <Ellipse x={0} y={-14} radiusX={OBJ_HW * 0.7} radiusY={OBJ_HH * 0.7} fill={withAlpha(p.base, 0.85)} />
        <Ellipse x={0} y={-15} radiusX={OBJ_HW * 0.45} radiusY={OBJ_HH * 0.45} fill={p.lighter} opacity={0.8} />
        {glow}
        <Line points={[0, -14, 0, -40]} stroke={withAlpha(p.lighter, 0.8)} strokeWidth={3} />
      </Fragment>
    );
  }

  // lamp (default light)
  const stand = palette('#5b5e6b');
  return (
    <Fragment>
      <IsoBox hw={9} hh={4} h={8} p={stand} />
      <Line points={[0, -8, 0, -30]} stroke={shade('#5b5e6b', -0.2)} strokeWidth={2.5} />
      {glow}
      {/* shade */}
      <Line
        points={[-12, -30, 12, -30, 8, -44, -8, -44]}
        closed
        fill={p.base}
        stroke={p.outline}
        strokeWidth={1}
      />
      <Line points={[-8, -44, 8, -44, 7, -47, -7, -47]} closed fill={p.lighter} />
    </Fragment>
  );
}

function plant(p: Palette, _pulse: number, kind: string) {
  const pot = palette('#b06a3e');
  const potTop = -16;
  const Pot = (
    <Fragment>
      <IsoBox hw={OBJ_HW * 0.5} hh={OBJ_HH * 0.5} h={16} p={pot} />
      <Ellipse x={0} y={potTop} radiusX={OBJ_HW * 0.5} radiusY={OBJ_HH * 0.5} fill={pot.lighter} />
    </Fragment>
  );

  if (kind === 'tree') {
    const trunk = palette('#7a5230');
    return (
      <Fragment>
        {Pot}
        <Rect x={-3} y={-42} width={6} height={28} fill={trunk.base} stroke={trunk.outline} strokeWidth={1} />
        <Circle x={0} y={-50} radius={16} fill={p.dark} stroke={p.outline} strokeWidth={1} />
        <Circle x={-8} y={-44} radius={11} fill={p.base} />
        <Circle x={9} y={-46} radius={10} fill={p.light} />
        <Circle x={2} y={-56} radius={9} fill={p.lighter} opacity={0.85} />
      </Fragment>
    );
  }

  if (kind === 'flower') {
    const stem = palette('#3fa35a');
    const center = '#f5c542';
    const petals = [0, 1, 2, 3, 4].map((i) => {
      const a = (i / 5) * Math.PI * 2;
      return <Circle key={i} x={Math.cos(a) * 6} y={-44 + Math.sin(a) * 6} radius={4.5} fill={p.base} />;
    });
    return (
      <Fragment>
        {Pot}
        <Line points={[0, potTop, 0, -40]} stroke={stem.base} strokeWidth={2.5} />
        <Ellipse x={-6} y={-26} radiusX={6} radiusY={3} fill={stem.base} />
        <Ellipse x={6} y={-32} radiusX={6} radiusY={3} fill={stem.light} />
        {petals}
        <Circle x={0} y={-44} radius={3.5} fill={center} stroke={shade(center, -0.3)} strokeWidth={0.8} />
      </Fragment>
    );
  }

  // potted plant (default)
  const leaf = (x: number, y: number, rx: number, ry: number, rot: number, fill: string) => (
    <Ellipse x={x} y={y} radiusX={rx} radiusY={ry} rotation={rot} fill={fill} stroke={p.outline} strokeWidth={0.6} />
  );
  return (
    <Fragment>
      {Pot}
      {leaf(-7, -30, 5, 12, -28, p.dark)}
      {leaf(7, -30, 5, 12, 28, p.base)}
      {leaf(0, -36, 5, 14, 0, p.light)}
      {leaf(-3, -30, 4, 10, -10, p.lighter)}
    </Fragment>
  );
}

function panel(p: Palette, _pulse: number, kind: string) {
  const W = OBJ_HW * 1.5;
  const BH = 42;
  const standH = 7;
  const top = -(standH + BH);
  const frame = palette(kind === 'window' ? '#7d8a96' : '#6b4a2c');
  const stand = palette('#5a4631');

  // thin side strip for thickness
  const side = [W / 2, -standH, W / 2 + 6, -standH - 3, W / 2 + 6, top - 3, W / 2, top];

  let inner;
  if (kind === 'mirror') {
    inner = (
      <Fragment>
        <Rect x={-W / 2 + 5} y={top + 5} width={W - 10} height={BH - 10} fill={p.light} />
        <Line points={[-W / 2 + 8, -standH - 8, W / 2 - 14, top + 10]} stroke="#ffffff" strokeWidth={3} opacity={0.5} />
      </Fragment>
    );
  } else if (kind === 'window') {
    inner = (
      <Fragment>
        <Rect x={-W / 2 + 5} y={top + 5} width={W - 10} height={BH - 10} fill={withAlpha('#bfe3f2', 0.85)} />
        <Line points={[0, top + 5, 0, -standH - 5]} stroke={frame.dark} strokeWidth={2} />
        <Line points={[-W / 2 + 5, top + BH / 2 - 3, W / 2 - 5, top + BH / 2 - 3]} stroke={frame.dark} strokeWidth={2} />
      </Fragment>
    );
  } else if (kind === 'map') {
    inner = (
      <Fragment>
        <Rect x={-W / 2 + 5} y={top + 5} width={W - 10} height={BH - 10} fill="#e8d8a8" />
        <Line points={[-W / 2 + 9, top + 14, -2, top + 20, W / 2 - 9, top + 12]} stroke="#9a6a3a" strokeWidth={1.4} />
        <Line points={[-6, top + 10, 2, top + BH - 12]} stroke="#9a6a3a" strokeWidth={1.4} dash={[3, 3]} />
      </Fragment>
    );
  } else if (kind === 'document') {
    inner = (
      <Fragment>
        <Rect x={-W / 2 + 5} y={top + 5} width={W - 10} height={BH - 10} fill="#f4f1e8" />
        {[0, 1, 2, 3].map((i) => (
          <Line
            key={i}
            points={[-W / 2 + 9, top + 12 + i * 7, W / 2 - 9, top + 12 + i * 7]}
            stroke="#9aa0a6"
            strokeWidth={1}
          />
        ))}
      </Fragment>
    );
  } else {
    // painting
    inner = (
      <Fragment>
        <Rect x={-W / 2 + 5} y={top + 5} width={W - 10} height={BH - 10} fill={p.base} />
        <Line points={[-W / 2 + 5, -standH - 12, 0, top + 14, W / 2 - 5, -standH - 8]} closed fill={p.dark} opacity={0.7} />
        <Circle x={W / 4} y={top + 13} radius={4} fill={p.lighter} />
      </Fragment>
    );
  }

  return (
    <Fragment>
      <IsoBox hw={OBJ_HW * 0.55} hh={OBJ_HH * 0.55} h={standH} p={stand} />
      <Line points={side} closed fill={frame.dark} stroke={frame.outline} strokeWidth={1} />
      <Rect
        x={-W / 2}
        y={top}
        width={W}
        height={BH}
        fill={frame.base}
        stroke={frame.outline}
        strokeWidth={1.2}
        cornerRadius={2}
      />
      {inner}
    </Fragment>
  );
}

function figure(p: Palette, _pulse: number, kind: string) {
  const ped = palette('#9a958a');
  const Pedestal = (
    <Fragment>
      <IsoBox hw={OBJ_HW * 0.7} hh={OBJ_HH * 0.7} h={16} p={ped} />
    </Fragment>
  );

  if (kind === 'pillar') {
    const stone = palette('#d8d3c4');
    return (
      <Fragment>
        <Ellipse x={0} y={0} radiusX={OBJ_HW * 0.55} radiusY={OBJ_HH * 0.55} fill={stone.dark} />
        <Rect x={-OBJ_HW * 0.42} y={-58} width={OBJ_HW * 0.84} height={58} fill={stone.base} />
        <Line points={[-OBJ_HW * 0.42, -58, -OBJ_HW * 0.42, 0]} stroke={stone.light} strokeWidth={3} />
        <Line points={[OBJ_HW * 0.3, -58, OBJ_HW * 0.3, 0]} stroke={stone.dark} strokeWidth={3} />
        <Ellipse x={0} y={-58} radiusX={OBJ_HW * 0.5} radiusY={OBJ_HH * 0.5} fill={stone.lighter} stroke={stone.outline} strokeWidth={1} />
      </Fragment>
    );
  }

  // statue silhouette on a pedestal
  const baseY = -16;
  return (
    <Fragment>
      {Pedestal}
      <Line
        points={[-8, baseY, 8, baseY, 5, baseY - 26, -5, baseY - 26]}
        closed
        fill={p.base}
        stroke={p.outline}
        strokeWidth={1}
      />
      <Line points={[0, baseY, 5, baseY - 26, 0, baseY - 26]} closed fill={p.dark} opacity={0.6} />
      <Circle x={0} y={baseY - 32} radius={7} fill={p.light} stroke={p.outline} strokeWidth={1} />
      <Circle x={2} y={baseY - 33} radius={2.4} fill={p.lighter} />
    </Fragment>
  );
}

function book(p: Palette, _pulse: number, kind: string) {
  if (kind === 'scroll') {
    const paper = palette('#e6d6a8');
    return (
      <Fragment>
        <Rect x={-16} y={-14} width={32} height={12} fill={paper.base} cornerRadius={2} rotation={0} />
        <Ellipse x={-16} y={-8} radiusX={4} radiusY={6} fill={paper.dark} stroke={paper.outline} strokeWidth={1} />
        <Ellipse x={16} y={-8} radiusX={4} radiusY={6} fill={paper.light} stroke={paper.outline} strokeWidth={1} />
        <Line points={[-10, -8, 10, -8]} stroke={p.base} strokeWidth={1.4} opacity={0.7} />
      </Fragment>
    );
  }

  const oneBook = (offY: number, pal: Palette) => (
    <Fragment>
      <IsoBox hw={OBJ_HW * 0.78} hh={OBJ_HH * 0.78} h={9} baseY={offY} p={pal} />
      {/* pages edge on the right face */}
      <Line
        points={[0, offY + OBJ_HH * 0.78 - 9, OBJ_HW * 0.78, offY - 9]}
        stroke="#f3ead0"
        strokeWidth={2}
        opacity={0.9}
      />
    </Fragment>
  );

  if (kind === 'books') {
    return (
      <Fragment>
        {oneBook(0, palette('#7a5230'))}
        {oneBook(-9, palette('#2e7d57'))}
        {oneBook(-18, p)}
      </Fragment>
    );
  }

  return <Fragment>{oneBook(0, p)}</Fragment>;
}

// ---- Public renderer -------------------------------------------------------

export function renderObjectArt(kind: string, color: string, pulse: number) {
  const p = palette(color);
  switch (archetypeFor(kind)) {
    case 'light':
      return light(p, pulse, kind);
    case 'plant':
      return plant(p, pulse, kind);
    case 'panel':
      return panel(p, pulse, kind);
    case 'figure':
      return figure(p, pulse, kind);
    case 'book':
      return book(p, pulse, kind);
    default:
      return crate(p);
  }
}

/** Approx height (screen px above the base) used to place the glyph badge. */
export function objectArtHeight(kind: string): number {
  switch (archetypeFor(kind)) {
    case 'light':
      return kind === 'fountain' ? 44 : 50;
    case 'plant':
      return kind === 'tree' ? 66 : 46;
    case 'panel':
      return 52;
    case 'figure':
      return kind === 'pillar' ? 64 : 52;
    case 'book':
      return kind === 'books' ? 30 : 18;
    default:
      return 34;
  }
}
