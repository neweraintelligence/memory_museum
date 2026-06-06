import { useNavigate, useLocation } from 'react-router-dom';
import type { IconType } from 'react-icons';
import { useUI } from '../state/useUI';
import { useStore } from '../state/useStore';
import { Icon } from '../themes/Icon';
import { UI_ICONS } from '../themes/icons';
import type { AppMode } from '../types';

const MODES: { id: AppMode; label: string; icon: IconType }[] = [
  { id: 'build', label: 'Build', icon: UI_ICONS.build },
  { id: 'walk', label: 'Walk', icon: UI_ICONS.walk },
  { id: 'review', label: 'Review', icon: UI_ICONS.review },
];

const CLOUD_LABEL: Record<string, string> = {
  off: 'Local only',
  connecting: 'Syncing…',
  on: 'Cloud synced',
  error: 'Offline',
};

export default function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const showModes = location.pathname.startsWith('/palace/');
  const mode = useUI((s) => s.mode);
  const setMode = useUI((s) => s.setMode);
  const setSearchOpen = useUI((s) => s.setSearchOpen);
  const cloud = useStore((s) => s.cloud);

  return (
    <div className="topbar">
      <div className="brand" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
        <span className="logo">
          <Icon icon={UI_ICONS.palace} size={22} color="var(--gold)" />
        </span>
        <span>Memory Palace</span>
      </div>

      {showModes && (
        <div className="mode-switch" role="tablist">
          {MODES.map((m) => (
            <button
              key={m.id}
              className={mode === m.id ? 'active' : ''}
              onClick={() => setMode(m.id)}
            >
              <Icon icon={m.icon} size={15} /> {m.label}
            </button>
          ))}
        </div>
      )}

      <div className="spacer" />

      <button className="ghost" onClick={() => setSearchOpen(true)}>
        <Icon icon={UI_ICONS.search} size={15} /> Search <span className="kbd">/</span>
      </button>

      <div className="cloud-pill" title={CLOUD_LABEL[cloud]}>
        <Icon icon={cloud === 'error' || cloud === 'off' ? UI_ICONS.cloudOff : UI_ICONS.cloudOn} size={14} />
        <span className={`dot ${cloud}`} />
        {CLOUD_LABEL[cloud]}
      </div>
    </div>
  );
}
