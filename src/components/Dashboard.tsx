import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/useStore';
import { PALACE_THEMES } from '../themes/styles';
import { Icon } from '../themes/Icon';
import { UI_ICONS } from '../themes/icons';
import { PALACE_TEMPLATES, buildBundleFromTemplate } from '../themes/templates';

export default function Dashboard() {
  const navigate = useNavigate();
  const palaces = useStore((s) => s.palaces);
  const rooms = useStore((s) => s.rooms);
  const createPalace = useStore((s) => s.createPalace);
  const deletePalace = useStore((s) => s.deletePalace);
  const importBundle = useStore((s) => s.importBundle);

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
      <div className="page-head">
        <h1>Your Palaces</h1>
        <span className="muted">Build a place for your knowledge to live.</span>
      </div>

      <div className="card" style={{ marginBottom: 26 }}>
        <div className="row wrap" style={{ gap: 12, alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: 2, minWidth: 220, margin: 0 }}>
            <label>New palace name</label>
            <input
              value={name}
              placeholder="e.g. Neuroscience Mansion"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 160, margin: 0 }}>
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
                <Icon icon={UI_ICONS.palace} size={30} color="var(--gold)" />
              </div>
              <h3>{p.name}</h3>
              <div className="meta">
                {roomCount(p.id)} room{roomCount(p.id) === 1 ? '' : 's'} ·{' '}
                {PALACE_THEMES.find((t) => t.id === p.theme)?.label ?? p.theme}
              </div>
              <div className="row" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
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
              <Icon icon={UI_ICONS.template} size={30} color="var(--accent)" />
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
    </div>
  );
}
