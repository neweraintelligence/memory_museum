import { Group, Line, Text, Ellipse, Circle } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { shade, withAlpha } from '../lib/color';
import { TILE_W, TILE_H } from '../lib/iso';
import type { PObject } from '../types';

interface Props {
  obj: PObject;
  x: number;
  y: number;
  draggable: boolean;
  selected: boolean;
  highlighted: boolean;
  isAnchor: boolean;
  pulse: number; // 0..1
  dim: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, e: KonvaEventObject<DragEvent>) => void;
}

const HW = TILE_W * 0.3;
const HH = TILE_H * 0.3;
const H = 30;

// Objects that softly emit light (a little "the lamp is on" warmth).
const LIGHT_KINDS = new Set(['lamp', 'candle', 'star', 'gem', 'crystal', 'fountain']);

export default function IsoObject({
  obj,
  x,
  y,
  draggable,
  selected,
  highlighted,
  isAnchor,
  pulse,
  dim,
  onSelect,
  onDragEnd,
}: Props) {
  const top = shade(obj.color, 0.16);
  const left = shade(obj.color, -0.22);
  const right = shade(obj.color, -0.06);
  const lift = highlighted ? 8 + pulse * 4 : 0;
  const emitsLight = LIGHT_KINDS.has(obj.kind);

  const topFace = [0, -HH - H, HW, -H, 0, HH - H, -HW, -H];
  const leftFace = [-HW, 0, 0, HH, 0, HH - H, -HW, -H];
  const rightFace = [0, HH, HW, 0, HW, -H, 0, HH - H];

  return (
    <Group
      x={x}
      y={y - lift}
      draggable={draggable}
      opacity={dim ? 0.35 : 1}
      onMouseEnter={(e) => {
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = draggable ? 'grab' : 'pointer';
      }}
      onMouseLeave={(e) => {
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = 'default';
      }}
      onClick={() => onSelect(obj.id)}
      onTap={() => onSelect(obj.id)}
      onDragEnd={(e) => onDragEnd(obj.id, e)}
    >
      {/* ground shadow */}
      <Ellipse
        x={0}
        y={2}
        radiusX={HW * 1.05}
        radiusY={HH * 1.05}
        fill="rgba(0,0,0,0.18)"
      />

      {/* anchor / selection ring on the floor */}
      {(isAnchor || selected || highlighted) && (
        <Ellipse
          x={0}
          y={0}
          radiusX={HW * (1.25 + (highlighted ? pulse * 0.25 : 0))}
          radiusY={HH * (1.25 + (highlighted ? pulse * 0.25 : 0))}
          stroke={highlighted ? '#ffe27a' : selected ? '#7dd3fc' : withAlpha(obj.color, 0.9)}
          strokeWidth={highlighted ? 3 : 2}
          opacity={isAnchor && !selected && !highlighted ? 0.4 + pulse * 0.4 : 0.95}
          dash={selected ? [6, 4] : undefined}
        />
      )}

      {/* soft emitted light for lamps/candles/etc. */}
      {emitsLight && (
        <Circle
          x={0}
          y={-H - 6}
          radius={26 + pulse * 6}
          fill={withAlpha(obj.color, 0.18 + pulse * 0.12)}
        />
      )}

      {/* glow behind the icon for anchors */}
      {(isAnchor || highlighted) && (
        <Circle
          x={0}
          y={-H - 6}
          radius={16 + pulse * 4}
          fill={withAlpha(highlighted ? '#ffe27a' : obj.color, 0.25 + pulse * 0.2)}
        />
      )}

      <Line points={leftFace} closed fill={left} />
      <Line points={rightFace} closed fill={right} />
      <Line points={topFace} closed fill={top} stroke={shade(obj.color, 0.3)} strokeWidth={0.5} />

      {/* icon glyph */}
      <Text
        text={obj.icon}
        fontSize={22}
        width={60}
        align="center"
        x={-30}
        y={-H - 18}
      />
    </Group>
  );
}
