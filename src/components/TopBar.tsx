import { useNavigate, useLocation } from 'react-router-dom';
import { useUI } from '../state/useUI';
import { useStore } from '../state/useStore';
import type { AppMode } from '../types';

const MODES: { id: AppMode; label: string; icon: string }[] = [
  { id: 'build', label: 'Build', icon: '🛠️' },
  { id: 'walk', label: 'Walk', icon: '🚶' },
  { id: 'review', label: 'Review', icon: '🧠' },
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
        <span className="logo">🏛️</span>
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
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      )}

      <div className="spacer" />

      <button className="ghost" onClick={() => setSearchOpen(true)}>
        🔍 Search <span className="kbd">/</span>
      </button>

      <div className="cloud-pill" title={CLOUD_LABEL[cloud]}>
        <span className={`dot ${cloud}`} />
        {CLOUD_LABEL[cloud]}
      </div>
    </div>
  );
}
