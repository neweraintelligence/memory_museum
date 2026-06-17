import { useNavigate, useLocation } from 'react-router-dom';
import type { IconType } from 'react-icons';
import { useUI } from '../state/useUI';
import { useStore } from '../state/useStore';
import { Icon } from '../themes/Icon';
import { UI_ICONS } from '../themes/icons';
import type { AppMode } from '../types';
import ThemeSwitcher from './ThemeSwitcher';

const MODES: { id: AppMode; label: string; icon: IconType }[] = [
  { id: 'build', label: 'Build', icon: UI_ICONS.build },
  { id: 'walk', label: 'Walk', icon: UI_ICONS.walk },
  { id: 'review', label: 'Review', icon: UI_ICONS.review },
];

const CLOUD_LABEL: Record<string, string> = {
  off: 'Local',
  connecting: 'Syncing…',
  on: 'Cloud synced',
  error: 'Offline',
};

export default function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const showModes = location.pathname.startsWith('/museum/');
  const mode = useUI((s) => s.mode);
  const setMode = useUI((s) => s.setMode);
  const setSearchOpen = useUI((s) => s.setSearchOpen);
  const cloud = useStore((s) => s.cloud);
  const setDataModalOpen = useUI((s) => s.setDataModalOpen);

  return (
    <div className="topbar">
      <div className="brand" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
        <span className="logo">
          <span className="brand-icon" aria-hidden="true">
            <span className="brand-icon-carve" aria-hidden="true" />
          </span>
        </span>
        <span className="brand-text">Memory Museum</span>
      </div>

      {showModes && (
        <div className="mode-switch" role="tablist">
          {MODES.map((m) => (
            <button
              key={m.id}
              className={mode === m.id ? 'active' : ''}
              onClick={() => setMode(m.id)}
              title={m.label}
              aria-label={m.label}
            >
              <Icon icon={m.icon} size={15} /> <span className="mode-label">{m.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="spacer" />

      <button className="ghost" onClick={() => setSearchOpen(true)} title="Search">
        <Icon icon={UI_ICONS.search} size={15} /> <span className="topbar-btn-label">Search</span>{' '}
        <span className="kbd">/</span>
      </button>

      <ThemeSwitcher />

      <div className="cloud-pill">
        <div className="cloud-pill-segment cloud-pill-sync" title={CLOUD_LABEL[cloud]}>
          <Icon icon={cloud === 'error' || cloud === 'off' ? UI_ICONS.cloudOff : UI_ICONS.cloudOn} size={14} />
          <span className={`dot ${cloud}`} />
          <span className="cloud-pill-label">{CLOUD_LABEL[cloud]}</span>
        </div>
        <span className="cloud-pill-divider" aria-hidden="true" />
        <button
          type="button"
          className="cloud-pill-segment cloud-pill-save"
          title="Save"
          aria-label="Save"
          onClick={() => setDataModalOpen(true)}
        >
          <Icon icon={UI_ICONS.save} size={14} />
          <span className="cloud-pill-label">Save</span>
        </button>
      </div>
    </div>
  );
}
