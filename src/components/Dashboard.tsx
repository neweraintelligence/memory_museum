import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/useStore';
import { useTheme } from '../state/useTheme';
import { Icon } from '../themes/Icon';
import { UI_ICONS } from '../themes/icons';
import { PALACE_THEMES } from '../themes/styles';
import { PALACE_TEMPLATES, buildBundleFromTemplate } from '../themes/templates';

export default function Dashboard() {
  const navigate = useNavigate();
  const palaces = useStore((s) => s.palaces);
  const rooms = useStore((s) => s.rooms);
  const createPalace = useStore((s) => s.createPalace);
  const deletePalace = useStore((s) => s.deletePalace);
  const importBundle = useStore((s) => s.importBundle);
  const wallpaperEnabled = useTheme((s) => s.wallpaperEnabled);
  const toggleWallpaper = useTheme((s) => s.toggleWallpaper);

  const [name, setName] = useState('');
  const [theme, setTheme] = useState(PALACE_THEMES[0].id);

  const activePalaces = palaces.filter((p) => !p.deleted);

  const handleCreate = () => {
    const p = createPalace(name || 'My Palace', theme);
    setName('');
    navigate(`/palace/${p.id}`);
  };

  const handleTemplate = (tplId: string) => {
    const tpl = PALACE_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;
    const bundle = buildBundleFromTemplate(tpl);
    importBundle(bundle);
    navigate(`/palace/${bundle.palace.id}`);
  };

  const roomCount = (palaceId: string) =>
    rooms.filter((r) => r.palaceId === palaceId && !r.deleted).length;

  return (
    <div className="page fade-in">
      <div className="dashboard-top">
        <div className="dashboard-top-row">
          <div className="page-head">
            <h1>
              <span className="page-title-lead">Your</span>
              <span className="page-title-main">Palaces</span>
            </h1>
            <span className="muted">Build a place for your knowledge to live.</span>
          </div>

          <div className="card create-palace-bar">
            <div className="row wrap" style={{ gap: 12, alignItems: 'flex-end' }}>
              <div className="field create-palace-field create-palace-field--name">
                <label>New palace name</label>
                <input
                  value={name}
                  placeholder="e.g. Neuroscience Mansion"
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <div className="field create-palace-field create-palace-field--theme">
                <label>Theme</label>
                <select value={theme} onChange={(e) => setTheme(e.target.value)}>
                  {PALACE_THEMES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <button className="primary" onClick={handleCreate}>
                + Create Palace
              </button>
            </div>
          </div>
        </div>
      </div>

      {activePalaces.length === 0 ? (
        <div className="empty">
          No palaces yet. Create one above, or start from a template below.
        </div>
      ) : (
        <div className="grid">
          {activePalaces.map((p) => (
            <div
              key={p.id}
              className="card clickable"
              onClick={() => navigate(`/palace/${p.id}`)}
            >
              <div className="card-emoji">
                <span
                  className="card-icon-engraved card-icon-engraved--palace"
                  aria-hidden="true"
                >
                  <span className="card-icon-carve" aria-hidden="true" />
                </span>
                <img
                  src="/palace-room-icon-brutal-95.png?v=5"
                  alt=""
                  className="palace-card-icon palace-card-icon--brutal-95"
                />
                <img
                  src="/palace-room-icon.png"
                  alt=""
                  className="palace-card-icon palace-card-icon--default"
                />
              </div>
              <h3>{p.name}</h3>
              <div className="meta">
                {roomCount(p.id)} room{roomCount(p.id) === 1 ? '' : 's'} ·{' '}
                {PALACE_THEMES.find((t) => t.id === p.theme)?.label ?? p.theme}
              </div>
              <div className="row palace-card-actions" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
                <button
                  className="danger icon-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete "${p.name}" and everything inside?`)) {
                      deletePalace(p.id);
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="section-title">Start from a template</div>
      <div className="grid">
        {PALACE_TEMPLATES.map((t) => (
          <div key={t.id} className="card clickable" onClick={() => handleTemplate(t.id)}>
            <div className="card-emoji">
              <span
                className="card-icon-engraved card-icon-engraved--template"
                aria-hidden="true"
              >
                <span className="card-icon-carve" aria-hidden="true" />
              </span>
              <img
                src="/template-icon-brutal-95.png?v=2"
                alt=""
                className="template-card-icon template-card-icon--brutal-95"
              />
              <img
                src="/template-icon.png"
                alt=""
                className="template-card-icon template-card-icon--default"
              />
            </div>
            <h3>{t.name}</h3>
            <div className="meta">{t.description}</div>
            <div className="row" style={{ marginTop: 12 }}>
              <span className="tag">{t.rooms.length} rooms</span>
              <span className="tag">prefilled memories</span>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className={`wallpaper-toggle${wallpaperEnabled ? ' active' : ''}`}
        onClick={toggleWallpaper}
        aria-pressed={wallpaperEnabled}
        aria-label={wallpaperEnabled ? 'Hide wallpaper' : 'Show wallpaper'}
        title={wallpaperEnabled ? 'Hide wallpaper' : 'Show wallpaper'}
      >
        <Icon icon={UI_ICONS.wallpaper} size={18} />
      </button>
    </div>
  );
}
