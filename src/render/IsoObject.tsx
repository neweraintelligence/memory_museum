import { Group, Text, Ellipse, Circle } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { withAlpha } from '../lib/color';
import { TILE_W, TILE_H } from '../lib/iso';
import { renderObjectArt, objectArtHeight } from './objectArt';
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

const HW = TILE_W * 0.32;
const HH = TILE_H * 0.32;

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
  const lift = highlighted ? 8 + pulse * 4 : 0;
  const topY = -objectArtHeight(obj.kind);

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
      {/* contact shadow */}
      <Ellipse x={0} y={2} radiusX={HW * 1.1} radiusY={HH * 1.1} fill="rgba(0,0,0,0.22)" />

      {/* anchor / selection ring on the floor */}
      {(isAnchor || selected || highlighted) && (
        <Ellipse
          x={0}
          y={0}
          radiusX={HW * (1.3 + (highlighted ? pulse * 0.25 : 0))}
          radiusY={HH * (1.3 + (highlighted ? pulse * 0.25 : 0))}
          stroke={highlighted ? '#ffe27a' : selected ? '#7dd3fc' : withAlpha(obj.color, 0.9)}
          strokeWidth={highlighted ? 3 : 2}
          opacity={isAnchor && !selected && !highlighted ? 0.4 + pulse * 0.4 : 0.95}
          dash={selected ? [6, 4] : undefined}
        />
      )}

      {/* highlight halo behind tall art when walking/reviewing */}
      {highlighted && (
        <Circle x={0} y={topY * 0.6} radius={26 + pulse * 6} fill={withAlpha('#ffe27a', 0.18 + pulse * 0.12)} />
      )}

      {/* the detailed object art */}
      {renderObjectArt(obj.kind, obj.color, pulse)}

      {/* small glyph badge floating above for instant recognition */}
      <Group y={topY - 14} opacity={highlighted ? 1 : 0.92}>
        <Circle x={0} y={0} radius={11} fill="rgba(12,14,22,0.72)" stroke={withAlpha(obj.color, 0.8)} strokeWidth={1} />
        <Text text={obj.icon} fontSize={13} width={26} align="center" x={-13} y={-7} />
      </Group>
    </Group>
  );
}
