import { createElement } from 'react';
import type { CSSProperties } from 'react';
import type { IconType } from 'react-icons';

interface IconProps {
  icon: IconType;
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

/** Render a react-icon in the DOM. Color defaults to `currentColor`. */
export function Icon({ icon, size = 20, color, className, style, title }: IconProps) {
  return createElement(icon, {
    size,
    color,
    className: ['ui-icon', className].filter(Boolean).join(' ') || undefined,
    style: { flex: 'none', ...style },
    title,
  });
}
