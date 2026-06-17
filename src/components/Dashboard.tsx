import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/useStore';
import { useTheme } from '../state/useTheme';
import { Icon } from '../themes/Icon';
import { UI_ICONS } from '../themes/icons';
import { MUSEUM_THEMES } from '../themes/styles';
import { MUSEUM_TEMPLATES, buildBundleFromTemplate } from '../themes/templates';
import { Console } from './Console';

export default function Dashboard() {
  const navigate = useNavigate();
  const museums = useStore((s) => s.museums);
  const rooms = useStore((s) => s.rooms);
  const createMuseum = useStore((s) => s.createMuseum);
  const deleteMuseum = useStore((s) => s.deleteMuseum);
  const importBundle = useStore((s) => s.importBundle);
  const wallpaperEnabled = useTheme((s) => s.wallpaperEnabled);
  const toggleWallpaper = useTheme((s) => s.toggleWallpaper);

  const [name, setName] = useState('');
  const [theme, setTheme] = useState(MUSEUM_THEMES[0].id);

  const activeMuseums = museums.filter((p) => !p.deleted);

  const handleCreate = () => {
    const p = createMuseum(name || 'My Museum', theme);
    setName('');
    navigate(`/museum/${p.id}`);
  };

  const handleTemplate = (tplId: string) => {
    const tpl = MUSEUM_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;
    const bundle = buildBundleFromTemplate(tpl);
    importBundle(bundle);
    navigate(`/museum/${bundle.museum.id}`);
  };

  const roomCount = (museumId: string) =>
    rooms.filter((r) => r.museumId === museumId && !r.deleted).length;

  return (
    <div className="page fade-in">
      <div className="dashboard-top">
        <div className="dashboard-top-row">
          <div className="page-head">
            <h1>
              <span className="page-title-lead">Your</span>
              <span className="page-title-main">Museums</span>
            </h1>
            <span className="muted">Build a place for your knowledge to live.</span>
          </div>

          <div className="card create-museum-bar">
            <div className="row wrap" style={{ gap: 12, alignItems: 'flex-end' }}>
              <div className="field create-museum-field create-museum-field--name">
                <label>New museum name</label>
                <input
                  value={name}
                  placeholder="e.g. Neuroscience Mansion"
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <div className="field create-museum-field create-museum-field--theme">
                <label>Theme</label>
                <select value={theme} onChange={(e) => setTheme(e.target.value)}>
                  {MUSEUM_THEMES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <button className="primary create-museum-submit" onClick={handleCreate}>
                <span className="create-museum-submit-label create-museum-submit-label--desktop">
                  + Create Museum
                </span>
                <span className="create-museum-submit-label create-museum-submit-label--mobile">
                  <span className="create-museum-submit-word">Create</span>{' '}
                  <span className="create-museum-submit-word">Museum</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeMuseums.length === 0 ? (
        <div className="empty">
          No museums yet. Create one above, or start from a template below.
        </div>
      ) : (
        <div className="grid">
          {activeMuseums.map((p) => (
            <div
              key={p.id}
              className="card clickable"
              onClick={() => navigate(`/museum/${p.id}`)}
            >
              <div className="card-emoji">
                <span
                  className="card-icon-engraved card-icon-engraved--museum"
                  aria-hidden="true"
                >
                  <span className="card-icon-carve" aria-hidden="true" />
                </span>
                <img
                  src="/museum-room-icon-utilitarian.png?v=5"
                  alt=""
                  className="museum-card-icon museum-card-icon--utilitarian"
                />
                <img
                  src="/museum-room-icon.png"
                  alt=""
                  className="museum-card-icon museum-card-icon--default"
                />
              </div>
              <h3>{p.name}</h3>
              <div className="meta">
                {roomCount(p.id)} room{roomCount(p.id) === 1 ? '' : 's'} ·{' '}
                {MUSEUM_THEMES.find((t) => t.id === p.theme)?.label ?? p.theme}
              </div>
              <div className="row museum-card-actions" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
                <button
                  className="danger icon-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete "${p.name}" and everything inside?`)) {
                      deleteMuseum(p.id);
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
        {MUSEUM_TEMPLATES.map((t) => (
          <div key={t.id} className="card clickable" onClick={() => handleTemplate(t.id)}>
            <div className="card-emoji">
              <span
                className="card-icon-engraved card-icon-engraved--template"
                aria-hidden="true"
              >
                <span className="card-icon-carve" aria-hidden="true" />
              </span>
              <img
                src="/template-icon-utilitarian.png?v=3"
                alt=""
                className="template-card-icon template-card-icon--utilitarian"
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

      <Console />

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
