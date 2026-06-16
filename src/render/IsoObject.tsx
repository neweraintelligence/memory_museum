import { Group, Image as KonvaImage, Ellipse, Circle } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { withAlpha } from '../lib/color';
import { TILE_W, TILE_H } from '../lib/iso';
import { isoArtTransform, objectFootprint } from '../lib/objectPlacement';
import { renderObjectArt, objectArtHeight } from './objectArt';
import { useObjectSprite } from './useObjectSprite';
import { hasObjectSprites, objectSpriteFrame, objectSpriteGround, objectSpriteHeight, objectSpriteXOffset, objectSpriteYOffset } from '../themes/objectSprites';
import { objectIcon, useIconImage } from '../themes/icons';
import type { PObject } from '../types';

interface Props {
  obj: PObject;
  x: number;
  y: number;
  draggable: boolean;
  selected: boolean;
  highlighted: boolean;
  pulse: number; // 0..1
  dim: boolean;
  /** Screen-px lift when the object is stacked on a surface (table / bed). */
  stackLift?: number;
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
  pulse,
  dim,
  stackLift = 0,
  onSelect,
  onDragEnd,
}: Props) {
  const lift = highlighted ? 8 + pulse * 4 : 0;
  const footprint = objectFootprint(obj.kind);
  const artTransform = isoArtTransform(obj.rotation, footprint);
  const spriteFrame = objectSpriteFrame(obj.kind, obj.rotation);
  const { image: spriteImg, groundY: detectedGroundY, centerX: detectedCenterX, topY: detectedTopY } =
    useObjectSprite(spriteFrame?.url);
  const spriteH = objectSpriteHeight(obj.kind) ?? 96;
  const groundY = objectSpriteGround(obj.kind) ?? detectedGroundY;
  const spriteYOffset = objectSpriteYOffset(obj.kind);
  const spriteXOffset = objectSpriteXOffset(obj.kind);
  const spriteX = detectedCenterX * spriteH + spriteXOffset;
  const proceduralTopY = -objectArtHeight(obj.kind, footprint, obj.rotation);
  const badgeImg = useIconImage(objectIcon(obj.kind), '#eef2ff', 36);
  const shadowScale = footprint > 1 ? 1.75 : 1.1;
  const useSprite = hasObjectSprites(obj.kind) && !!spriteImg;
  const spriteImageTop = -spriteH * groundY + spriteYOffset;
  const spriteVisualTop = spriteImageTop + detectedTopY * spriteH;
  const badgeY = (useSprite ? spriteVisualTop : proceduralTopY) - 14;
  const haloY = useSprite ? spriteVisualTop * 0.6 : proceduralTopY * 0.6;

  return (
    <Group
      x={x}
      y={y - lift}
      draggable={draggable}
      opacity={dim ? 0.35 : 1}
      onMouseDown={(e) => {
        e.cancelBubble = true;
      }}
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
      onDragStart={(e) => e.target.moveToTop()}
      onDragEnd={(e) => onDragEnd(obj.id, e)}
    >
      {/* Stacked props ride on top of their surface; lift only the visuals so
          the group origin stays on the tile for drag / snap math. */}
      <Group y={-stackLift}>
      {/* contact shadow (sprites include their own) */}
      {!useSprite && (
        <Ellipse
          x={0}
          y={2}
          radiusX={HW * shadowScale}
          radiusY={HH * shadowScale}
          fill="rgba(0,0,0,0.22)"
        />
      )}

      {/* selection ring on the floor */}
      {(selected || highlighted) && (
        <Ellipse
          x={0}
          y={0}
          radiusX={HW * (footprint > 1 ? 1.85 : 1.3 + (highlighted ? pulse * 0.25 : 0))}
          radiusY={HH * (footprint > 1 ? 1.85 : 1.3 + (highlighted ? pulse * 0.25 : 0))}
          stroke={highlighted ? '#ffe27a' : '#7dd3fc'}
          strokeWidth={highlighted ? 3 : 2}
          opacity={0.95}
          dash={selected ? [6, 4] : undefined}
        />
      )}

      {/* highlight halo behind tall art when walking/reviewing */}
      {highlighted && (
        <Circle x={0} y={haloY} radius={26 + pulse * 6} fill={withAlpha('#ffe27a', 0.18 + pulse * 0.12)} listening={false} />
      )}

      {/* the detailed object art, rotated to face */}
      {useSprite ? (
        <Group scaleX={spriteFrame?.flipX ? -1 : 1} scaleY={1}>
          <KonvaImage
            image={spriteImg}
            x={-spriteH / 2 + spriteX}
            y={spriteImageTop}
            width={spriteH}
            height={spriteH}
          />
        </Group>
      ) : (
        <Group scaleX={artTransform.scaleX} scaleY={artTransform.scaleY}>
          {renderObjectArt(obj.kind, obj.color, pulse, footprint, obj.rotation)}
        </Group>
      )}

      {(selected || highlighted) && (
        <Group y={badgeY} listening={false}>
          <Circle
            x={0}
            y={0}
            radius={11}
            fill="rgba(12,14,22,0.78)"
            stroke={withAlpha(highlighted ? '#ffe27a' : obj.color, 0.85)}
            strokeWidth={1.2}
            listening={false}
          />
          {badgeImg && (
            <KonvaImage image={badgeImg} x={-7} y={-7} width={14} height={14} listening={false} />
          )}
        </Group>
      )}
      </Group>
    </Group>
  );
}
