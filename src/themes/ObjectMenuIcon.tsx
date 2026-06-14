import type { CSSProperties } from 'react';
import { Icon } from './Icon';
import { objectIcon, iconTint } from './icons';
import { objectMenuIcon } from './menuIcons';
import { getObjectDef } from './objects';

interface ObjectMenuIconProps {
  kind: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

/** Palette icon: sticker PNG when available, otherwise tinted react-icon fallback. */
export function ObjectMenuIcon({ kind, size = 26, className, style }: ObjectMenuIconProps) {
  const src = objectMenuIcon(kind);
  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className={['menu-icon', className].filter(Boolean).join(' ') || undefined}
        style={{ flex: 'none', objectFit: 'contain', ...style }}
        draggable={false}
      />
    );
  }

  const def = getObjectDef(kind);
  return (
    <Icon
      icon={objectIcon(kind)}
      size={size}
      color={iconTint(def.color)}
      className={className}
      style={style}
    />
  );
}
