import { Fragment } from 'react';
import { Line, Circle } from 'react-konva';
import { shade, withAlpha } from '../lib/color';
import { TILE_W, TILE_H } from '../lib/iso';
import type { RoomStyle, FloorPattern, WallPattern } from '../themes/styles';

const HALF_W = TILE_W / 2;
const HALF_H = TILE_H / 2;

interface Pt {
  x: number;
  y: number;
}

const interp = (a: Pt, b: Pt, t: number): Pt => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
const up = (p: Pt, h: number): Pt => ({ x: p.x, y: p.y - h });

// ---- Floor tile detailing --------------------------------------------------

/** Decorative overlay for a single floor tile centered at (cx, cy). */
export function floorTileDecor(
  pattern: FloorPattern,
  cx: number,
  cy: number,
  style: RoomStyle,
  alt: boolean,
) {
  const grout = shade(style.floorA, -0.22);
  const lightLine = shade(style.floorA, 0.18);

  if (pattern === 'planks') {
    // Wood grain: faint lines running along one grid axis.
    const d = { x: HALF_W, y: HALF_H };
    const n = { x: -HALF_H, y: HALF_W };
    const len = 0.78;
    const nl = Math.hypot(n.x, n.y);
    return (
      <Fragment>
        {[-1, 1].map((k) => {
          const off = (k * HALF_H * 0.5) / nl;
          const c = { x: cx + n.x * off, y: cy + n.y * off };
          return (
            <Line
              key={k}
              points={[c.x - d.x * len, c.y - d.y * len, c.x + d.x * len, c.y + d.y * len]}
              stroke={grout}
              strokeWidth={1}
              opacity={0.5}
            />
          );
        })}
      </Fragment>
    );
  }

  if (pattern === 'tatami') {
    const s = 0.84;
    return (
      <Fragment>
        <Line
          points={[cx, cy - HALF_H * s, cx + HALF_W * s, cy, cx, cy + HALF_H * s, cx - HALF_W * s, cy]}
          closed
          stroke={shade(style.accent, -0.1)}
          strokeWidth={1.2}
          opacity={0.6}
        />
        <Line points={[cx, cy - HALF_H * s, cx, cy + HALF_H * s]} stroke={shade(style.accent, -0.1)} strokeWidth={1} opacity={0.4} />
      </Fragment>
    );
  }

  if (pattern === 'tiles') {
    const s = 0.8;
    return (
      <Line
        points={[cx, cy - HALF_H * s, cx + HALF_W * s, cy, cx, cy + HALF_H * s, cx - HALF_W * s, cy]}
        closed
        stroke={alt ? lightLine : grout}
        strokeWidth={1}
        opacity={0.5}
      />
    );
  }

  if (pattern === 'metal') {
    const s = 0.78;
    const corners: Pt[] = [
      { x: cx, y: cy - HALF_H * s },
      { x: cx + HALF_W * s, y: cy },
      { x: cx, y: cy + HALF_H * s },
      { x: cx - HALF_W * s, y: cy },
    ];
    return (
      <Fragment>
        <Line
          points={corners.flatMap((c) => [c.x, c.y])}
          closed
          stroke={withAlpha(style.accent, 0.4)}
          strokeWidth={1}
          opacity={0.7}
        />
        {corners.map((c, i) => (
          <Circle key={i} x={interp(c, { x: cx, y: cy }, 0.18).x} y={interp(c, { x: cx, y: cy }, 0.18).y} radius={1.3} fill={withAlpha(style.accent, 0.7)} />
        ))}
      </Fragment>
    );
  }

  // slab (brutalist): a single subtle crack
  return (
    <Line
      points={[cx - HALF_W * 0.3, cy - HALF_H * 0.1, cx + HALF_W * 0.1, cy + HALF_H * 0.2, cx + HALF_W * 0.35, cy - HALF_H * 0.05]}
      stroke={grout}
      strokeWidth={1}
      opacity={0.35}
    />
  );
}

// ---- Wall detailing --------------------------------------------------------

/**
 * Decorate a wall whose base runs from p0 to p1 and is extruded straight up by H.
 * `fill` is the wall's base color.
 */
export function wallDecor(
  pattern: WallPattern,
  p0: Pt,
  p1: Pt,
  H: number,
  fill: string,
  accent: string,
) {
  const dark = shade(fill, -0.22);
  const lightc = shade(fill, 0.16);

  const hLine = (h: number, color: string, w: number, key: string, opacity = 1) => (
    <Line key={key} points={[p0.x, p0.y - h, p1.x, p1.y - h]} stroke={color} strokeWidth={w} opacity={opacity} />
  );
  const vLine = (t: number, color: string, w: number, key: string, opacity = 1) => {
    const b = interp(p0, p1, t);
    const tp = up(b, H);
    return <Line key={key} points={[b.x, b.y, tp.x, tp.y]} stroke={color} strokeWidth={w} opacity={opacity} />;
  };

  if (pattern === 'shelves') {
    const levels = [0.22, 0.5, 0.78];
    const bookColors = ['#7a3b34', '#3f6b4f', '#6a5a8a', '#9a7b3a', '#42607f'];
    return (
      <Fragment>
        {vLine(0.02, dark, 3, 'L')}
        {vLine(0.98, dark, 3, 'R')}
        {levels.map((lv, li) => {
          const yb = H * lv;
          const board = hLine(yb, dark, 2.5, `b${li}`, 0.9);
          const spines = [];
          for (let i = 1; i <= 7; i++) {
            const t = 0.08 + (i / 8) * 0.84;
            const b = interp(p0, p1, t);
            const sh = 13 + ((i * 7 + li * 3) % 5);
            spines.push(
              <Line
                key={`s${li}-${i}`}
                points={[b.x, b.y - yb, b.x, b.y - yb - sh]}
                stroke={bookColors[(i + li) % bookColors.length]}
                strokeWidth={3}
                opacity={0.92}
              />,
            );
          }
          return (
            <Fragment key={`lv${li}`}>
              {board}
              {spines}
            </Fragment>
          );
        })}
      </Fragment>
    );
  }

  if (pattern === 'panels') {
    return (
      <Fragment>
        {hLine(H * 0.32, dark, 2, 'rail', 0.7)}
        {hLine(6, dark, 3, 'base', 0.8)}
        {[0.2, 0.4, 0.6, 0.8].map((t, i) => vLine(t, dark, 1.5, `v${i}`, 0.45))}
        {[0.2, 0.4, 0.6, 0.8].map((t, i) => vLine(t, lightc, 1, `vl${i}`, 0.3))}
      </Fragment>
    );
  }

  if (pattern === 'screens') {
    return (
      <Fragment>
        {[0.25, 0.5, 0.75].map((h, i) => hLine(H * h, lightc, 1.2, `h${i}`, 0.6))}
        {[0.2, 0.4, 0.6, 0.8].map((t, i) => vLine(t, lightc, 1.2, `v${i}`, 0.6))}
      </Fragment>
    );
  }

  if (pattern === 'tech') {
    return (
      <Fragment>
        {hLine(H * 0.7, withAlpha(accent, 0.8), 2, 'a1')}
        {hLine(H * 0.3, withAlpha(accent, 0.4), 1.5, 'a2')}
        {[0.3, 0.7].map((t, i) => vLine(t, withAlpha(accent, 0.35), 1.5, `v${i}`))}
        {[0.15, 0.5, 0.85].map((t, i) => {
          const b = interp(p0, p1, t);
          return <Circle key={`d${i}`} x={b.x} y={b.y - H * 0.5} radius={2} fill={withAlpha(accent, 0.9)} />;
        })}
      </Fragment>
    );
  }

  if (pattern === 'glass') {
    return (
      <Fragment>
        {[0.2, 0.4, 0.6, 0.8].map((t, i) => vLine(t, withAlpha('#ffffff', 0.5), 1.5, `v${i}`, 0.5))}
        {hLine(H * 0.5, withAlpha('#ffffff', 0.5), 1.5, 'h', 0.5)}
        {hLine(H * 0.5 + 4, withAlpha(accent, 0.25), 6, 'glow', 0.4)}
      </Fragment>
    );
  }

  if (pattern === 'concrete') {
    return (
      <Fragment>
        {hLine(H * 0.55, dark, 1.5, 'seam', 0.4)}
        {[0.33, 0.66].map((t, i) => vLine(t, dark, 1, `v${i}`, 0.25))}
        {[0.2, 0.5, 0.8].map((t, i) => {
          const b = interp(p0, p1, t);
          return <Circle key={`tie${i}`} x={b.x} y={b.y - H * 0.55} radius={1.4} fill={dark} opacity={0.5} />;
        })}
      </Fragment>
    );
  }

  // plain: crown + baseboard
  return (
    <Fragment>
      {hLine(H - 6, lightc, 2, 'crown', 0.5)}
      {hLine(6, dark, 3, 'base', 0.6)}
    </Fragment>
  );
}
