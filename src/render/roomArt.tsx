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

/** Cheap deterministic 0..1 noise so each tile/brick varies but stays stable. */
const hash = (a: number, b: number): number => {
  const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

/** Inset diamond outline points centered at (cx, cy), scaled by s in (0..1]. */
const diamondPts = (cx: number, cy: number, s: number): number[] => [
  cx,
  cy - HALF_H * s,
  cx + HALF_W * s,
  cy,
  cx,
  cy + HALF_H * s,
  cx - HALF_W * s,
  cy,
];

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
  const deep = shade(style.floorA, -0.34);
  const lightLine = shade(style.floorA, 0.2);
  const sheen = shade(style.floorA, 0.34);

  if (pattern === 'planks') {
    // Wood grain: faint lines running along one grid axis + a plank joint + knot.
    const d = { x: HALF_W, y: HALF_H };
    const n = { x: -HALF_H, y: HALF_W };
    const len = 0.78;
    const nl = Math.hypot(n.x, n.y);
    const knot = hash(cx, cy) > 0.62;
    return (
      <Fragment>
        {[-1.4, -0.5, 0.5, 1.4].map((k, i) => {
          const off = (k * HALF_H * 0.4) / nl;
          const c = { x: cx + n.x * off, y: cy + n.y * off };
          return (
            <Line
              key={i}
              points={[c.x - d.x * len, c.y - d.y * len, c.x + d.x * len, c.y + d.y * len]}
              stroke={i % 2 === 0 ? grout : lightLine}
              strokeWidth={1}
              opacity={i % 2 === 0 ? 0.45 : 0.28}
            />
          );
        })}
        {/* cross plank joint */}
        <Line points={[cx - HALF_W * 0.2, cy + HALF_H * 0.6, cx + HALF_W * 0.6, cy + HALF_H * 0.2]} stroke={deep} strokeWidth={1.2} opacity={0.4} />
        {knot && <Circle x={cx + (hash(cy, cx) - 0.5) * HALF_W * 0.5} y={cy} radius={1.6} fill={deep} opacity={0.45} />}
      </Fragment>
    );
  }

  if (pattern === 'tatami') {
    const s = 0.84;
    return (
      <Fragment>
        <Line points={diamondPts(cx, cy, s)} closed stroke={shade(style.accent, -0.1)} strokeWidth={1.2} opacity={0.6} />
        <Line points={diamondPts(cx, cy, s * 0.84)} closed stroke={shade(style.floorA, 0.1)} strokeWidth={1} opacity={0.3} />
        <Line points={[cx, cy - HALF_H * s, cx, cy + HALF_H * s]} stroke={shade(style.accent, -0.1)} strokeWidth={1} opacity={0.4} />
      </Fragment>
    );
  }

  if (pattern === 'tiles') {
    const s = 0.8;
    return (
      <Fragment>
        <Line points={diamondPts(cx, cy, s)} closed stroke={alt ? lightLine : grout} strokeWidth={1} opacity={0.5} />
        {/* glossy specular near the top corner */}
        <Line points={[cx - HALF_W * 0.12, cy - HALF_H * 0.42, cx + HALF_W * 0.16, cy - HALF_H * 0.24]} stroke={withAlpha('#ffffff', 0.5)} strokeWidth={1.4} opacity={0.4} />
      </Fragment>
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
        <Line points={corners.flatMap((c) => [c.x, c.y])} closed stroke={withAlpha(style.accent, 0.4)} strokeWidth={1} opacity={0.7} />
        {/* brushed-metal highlight */}
        <Line points={[cx - HALF_W * 0.5, cy - HALF_H * 0.1, cx + HALF_W * 0.5, cy + HALF_H * 0.1]} stroke={withAlpha('#ffffff', 0.35)} strokeWidth={1} opacity={0.4} />
        {corners.map((c, i) => (
          <Circle key={i} x={interp(c, { x: cx, y: cy }, 0.18).x} y={interp(c, { x: cx, y: cy }, 0.18).y} radius={1.3} fill={withAlpha(style.accent, 0.7)} />
        ))}
      </Fragment>
    );
  }

  if (pattern === 'marble') {
    // Cool veined marble: a couple of branching veins + soft polish sheen.
    const veins = [0, 1].map((i) => {
      const j = hash(cx + i * 7, cy);
      const k = hash(cy, cx + i * 13);
      const a = { x: cx - HALF_W * 0.55, y: cy + (j - 0.5) * HALF_H };
      const m = { x: cx + (k - 0.5) * HALF_W * 0.5, y: cy + (j - 0.5) * HALF_H * 0.3 };
      const b = { x: cx + HALF_W * 0.55, y: cy + (k - 0.5) * HALF_H };
      return (
        <Line
          key={i}
          points={[a.x, a.y, m.x, m.y, b.x, b.y]}
          stroke={i === 0 ? shade(style.floorA, -0.16) : shade(style.floorA, -0.28)}
          strokeWidth={i === 0 ? 1.4 : 0.9}
          opacity={0.4}
          tension={0.5}
          lineCap="round"
        />
      );
    });
    return (
      <Fragment>
        <Line points={diamondPts(cx, cy, 0.86)} closed stroke={withAlpha('#ffffff', 0.35)} strokeWidth={1} opacity={0.25} />
        {veins}
        {/* polish glint */}
        <Line points={[cx - HALF_W * 0.2, cy - HALF_H * 0.36, cx + HALF_W * 0.28, cy - HALF_H * 0.12]} stroke={withAlpha('#ffffff', 0.6)} strokeWidth={1.6} opacity={0.35} />
      </Fragment>
    );
  }

  if (pattern === 'parquet') {
    // Herringbone: short planks alternating along the two iso edge directions.
    const d1 = { x: HALF_W * 0.42, y: HALF_H * 0.42 };
    const d2 = { x: HALF_W * 0.42, y: -HALF_H * 0.42 };
    const cells: Array<{ c: Pt; dir: Pt }> = [
      { c: { x: cx, y: cy - HALF_H * 0.34 }, dir: d1 },
      { c: { x: cx - HALF_W * 0.34, y: cy }, dir: d2 },
      { c: { x: cx + HALF_W * 0.34, y: cy }, dir: d1 },
      { c: { x: cx, y: cy + HALF_H * 0.34 }, dir: d2 },
    ];
    return (
      <Fragment>
        {cells.map((cell, i) => (
          <Fragment key={i}>
            <Line points={[cell.c.x - cell.dir.x, cell.c.y - cell.dir.y, cell.c.x + cell.dir.x, cell.c.y + cell.dir.y]} stroke={lightLine} strokeWidth={1} opacity={0.35} />
            <Line points={[cell.c.x - cell.dir.x, cell.c.y - cell.dir.y + 1, cell.c.x + cell.dir.x, cell.c.y + cell.dir.y + 1]} stroke={grout} strokeWidth={1} opacity={0.4} />
          </Fragment>
        ))}
      </Fragment>
    );
  }

  if (pattern === 'brick') {
    // Brick floor: courses along one iso axis with staggered head joints.
    const d = { x: HALF_W, y: HALF_H };
    const n = { x: -HALF_H, y: HALF_W };
    const nl = Math.hypot(n.x, n.y);
    const len = 0.66;
    return (
      <Fragment>
        {[-1, 0, 1].map((k) => {
          const off = (k * HALF_H * 0.42) / nl;
          const c = { x: cx + n.x * off, y: cy + n.y * off };
          const head = ((k + 2) % 2 === 0 ? 0.18 : -0.18) * HALF_W;
          return (
            <Fragment key={k}>
              <Line points={[c.x - d.x * len, c.y - d.y * len, c.x + d.x * len, c.y + d.y * len]} stroke={grout} strokeWidth={1.2} opacity={0.5} />
              {/* head joints */}
              {[-0.4, 0.1, 0.6].map((t, i) => {
                const hp = { x: c.x + d.x * (t + head / HALF_W), y: c.y + d.y * (t + head / HALF_W) };
                return <Line key={i} points={[hp.x - n.x * 0.16, hp.y - n.y * 0.16, hp.x + n.x * 0.16, hp.y + n.y * 0.16]} stroke={grout} strokeWidth={1} opacity={0.4} />;
              })}
            </Fragment>
          );
        })}
      </Fragment>
    );
  }

  if (pattern === 'carpet') {
    // Soft pile: stipple of tiny dots + a woven border, no hard joints.
    const dots = [];
    for (let i = 0; i < 16; i++) {
      const u = hash(cx + i * 3.1, cy + i) * 2 - 1;
      const v = hash(cy + i * 2.3, cx - i) * 2 - 1;
      if (Math.abs(u) + Math.abs(v) > 0.82) continue;
      dots.push(
        <Circle
          key={i}
          x={cx + u * HALF_W * 0.78}
          y={cy + v * HALF_H * 0.78}
          radius={0.9}
          fill={i % 2 === 0 ? sheen : grout}
          opacity={0.3}
        />,
      );
    }
    return (
      <Fragment>
        {dots}
        <Line points={diamondPts(cx, cy, 0.82)} closed stroke={withAlpha(style.accent, 0.5)} strokeWidth={1} opacity={0.3} dash={[3, 3]} />
      </Fragment>
    );
  }

  if (pattern === 'stone') {
    // Irregular flagstones: cracks radiating to an off-center node.
    const node = {
      x: cx + (hash(cx, cy) - 0.5) * HALF_W * 0.4,
      y: cy + (hash(cy, cx) - 0.5) * HALF_H * 0.4,
    };
    const corners: Pt[] = [
      { x: cx, y: cy - HALF_H * 0.8 },
      { x: cx + HALF_W * 0.8, y: cy },
      { x: cx, y: cy + HALF_H * 0.8 },
      { x: cx - HALF_W * 0.8, y: cy },
    ];
    return (
      <Fragment>
        {corners.map((c, i) =>
          // skip one crack at random for irregularity
          hash(cx + i, cy + i) > 0.18 ? (
            <Line key={i} points={[node.x, node.y, c.x, c.y]} stroke={grout} strokeWidth={1.2} opacity={0.5} />
          ) : null,
        )}
        <Circle x={node.x} y={node.y} radius={1.2} fill={deep} opacity={0.4} />
      </Fragment>
    );
  }

  // slab (brutalist): subtle crack + a few speckles
  return (
    <Fragment>
      <Line
        points={[cx - HALF_W * 0.3, cy - HALF_H * 0.1, cx + HALF_W * 0.1, cy + HALF_H * 0.2, cx + HALF_W * 0.35, cy - HALF_H * 0.05]}
        stroke={grout}
        strokeWidth={1}
        opacity={0.35}
      />
      {[0, 1, 2].map((i) => (
        <Circle key={i} x={cx + (hash(cx + i, cy) - 0.5) * HALF_W} y={cy + (hash(cy, cx + i) - 0.5) * HALF_H} radius={0.8} fill={deep} opacity={0.3} />
      ))}
    </Fragment>
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
  const deep = shade(fill, -0.34);
  const lightc = shade(fill, 0.16);

  const hLine = (h: number, color: string, w: number, key: string, opacity = 1) => (
    <Line key={key} points={[p0.x, p0.y - h, p1.x, p1.y - h]} stroke={color} strokeWidth={w} opacity={opacity} />
  );
  const vLine = (t: number, color: string, w: number, key: string, opacity = 1) => {
    const b = interp(p0, p1, t);
    const tp = up(b, H);
    return <Line key={key} points={[b.x, b.y, tp.x, tp.y]} stroke={color} strokeWidth={w} opacity={opacity} />;
  };
  const vSeg = (t: number, h0: number, h1: number, color: string, w: number, key: string, opacity = 1) => {
    const b = interp(p0, p1, t);
    return <Line key={key} points={[b.x, b.y - h0, b.x, b.y - h1]} stroke={color} strokeWidth={w} opacity={opacity} />;
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

  if (pattern === 'brick') {
    const courses = 8;
    const ch = H / courses;
    const items = [];
    for (let li = 0; li < courses; li++) {
      const yb = li * ch;
      items.push(hLine(yb, deep, 1.4, `bm${li}`, 0.55));
      const stagger = li % 2 === 0 ? 0 : 0.5;
      for (let i = 0; i <= 5; i++) {
        const t = ((i + stagger) / 5) * 0.96 + 0.02;
        if (t > 0.99) continue;
        items.push(vSeg(t, yb, yb + ch, deep, 1.1, `bj${li}-${i}`, 0.5));
      }
      // subtle top highlight on each course
      items.push(hLine(yb + 1.5, lightc, 1, `bh${li}`, 0.25));
    }
    return <Fragment>{items}</Fragment>;
  }

  if (pattern === 'stone') {
    const courses = 4;
    const ch = H / courses;
    const items = [];
    for (let li = 0; li < courses; li++) {
      const yb = li * ch;
      items.push(hLine(yb, deep, 1.6, `sm${li}`, 0.5));
      items.push(hLine(yb + 2, lightc, 1, `sh${li}`, 0.2));
      // irregular block joints
      const n = 3;
      for (let i = 0; i <= n; i++) {
        const jitter = (hash(li * 9 + i, li) - 0.5) * 0.12;
        const t = ((i + (li % 2 ? 0.5 : 0)) / n) * 0.9 + 0.05 + jitter;
        if (t < 0.04 || t > 0.96) continue;
        items.push(vSeg(t, yb, yb + ch, deep, 1.2, `sj${li}-${i}`, 0.45));
      }
    }
    // a few shading specks for rough stone
    for (let i = 0; i < 5; i++) {
      const b = interp(p0, p1, hash(i, i * 3));
      items.push(<Circle key={`sp${i}`} x={b.x} y={b.y - H * hash(i * 2, i)} radius={1.2} fill={deep} opacity={0.3} />);
    }
    return <Fragment>{items}</Fragment>;
  }

  if (pattern === 'wood') {
    // Vertical walnut paneling: plank seams with highlight, base + crown.
    const items = [hLine(H - 5, lightc, 2, 'crown', 0.5), hLine(7, deep, 3, 'base', 0.7), hLine(H * 0.4, dark, 1.5, 'rail', 0.4)];
    for (let i = 1; i <= 7; i++) {
      const t = i / 8;
      items.push(vLine(t, deep, 1.4, `pv${i}`, 0.45));
      items.push(vLine(t + 0.012, lightc, 1, `pl${i}`, 0.3));
    }
    return <Fragment>{items}</Fragment>;
  }

  if (pattern === 'wallpaper') {
    // Damask: faint vertical stripes, a chair rail, and a rosette motif grid.
    const items = [hLine(H * 0.34, withAlpha(accent, 0.6), 2, 'rail', 0.6), hLine(6, dark, 3, 'base', 0.7)];
    for (let i = 1; i <= 8; i++) {
      const t = i / 9;
      items.push(vLine(t, i % 2 === 0 ? lightc : dark, 1, `wv${i}`, 0.2));
    }
    const rows = [0.5, 0.72, 0.92];
    rows.forEach((h, ri) => {
      for (let i = 0; i < 5; i++) {
        const t = (i + (ri % 2 ? 0.5 : 0)) / 5;
        if (t > 0.97 || t < 0.03) continue;
        const b = interp(p0, p1, t);
        items.push(<Circle key={`r${ri}-${i}`} x={b.x} y={b.y - H * h} radius={2.2} stroke={withAlpha(accent, 0.5)} strokeWidth={1} />);
        items.push(<Circle key={`rc${ri}-${i}`} x={b.x} y={b.y - H * h} radius={0.9} fill={withAlpha(accent, 0.5)} />);
      }
    });
    return <Fragment>{items}</Fragment>;
  }

  // plain: crown + baseboard
  return (
    <Fragment>
      {hLine(H - 6, lightc, 2, 'crown', 0.5)}
      {hLine(6, dark, 3, 'base', 0.6)}
    </Fragment>
  );
}
