import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { LuChevronDown } from 'react-icons/lu';
import { Icon } from '../themes/Icon';

interface EditorSidePanelProps {
  side: 'left' | 'right';
  open: boolean;
  onToggle: () => void;
  title: ReactNode;
  collapsedIcon: IconType;
  collapsedIconAccent?: boolean;
  children: ReactNode;
}

export default function EditorSidePanel({
  side,
  open,
  onToggle,
  title,
  collapsedIcon,
  collapsedIconAccent = false,
  children,
}: EditorSidePanelProps) {
  const isLeft = side === 'left';

  return (
    <div
      className={`side ${isLeft ? 'left' : 'right'} side-floating${open ? '' : ' collapsed'}`}
      data-side={side}
    >
      <div className="side-chrome-top">
        <div className="side-head">
          <div className="side-head-title" aria-hidden={!open}>
            {title}
          </div>
          <button
            type="button"
            className="icon-btn ghost side-collapse-btn"
            onClick={onToggle}
            title="Minimize panel"
            aria-expanded={open}
            aria-hidden={!open}
            tabIndex={open ? 0 : -1}
          >
            <Icon icon={LuChevronDown} size={16} />
          </button>
        </div>
      </div>

      <div className="side-body-wrap" aria-hidden={!open}>
        <div className="side-body-inner">
          <div className="side-body">{children}</div>
        </div>
      </div>

      <div className="side-foot">
        <button
          type="button"
          className={`icon-btn ghost side-expand-btn${collapsedIconAccent ? ' side-expand-btn--accent' : ''}`}
          onClick={onToggle}
          title="Expand panel"
          aria-expanded={!open}
          aria-hidden={open}
          tabIndex={open ? -1 : 0}
        >
          <Icon icon={collapsedIcon} size={22} />
        </button>
      </div>
    </div>
  );
}
