import { useMemo, useState } from 'react';
import { OBJECT_LIBRARY, OBJECT_CATEGORIES } from '../themes/objects';
import { Icon } from '../themes/Icon';
import { objectIcon, iconTint } from '../themes/icons';
import { useUI } from '../state/useUI';

export default function ObjectLibrary() {
  const placingKind = useUI((s) => s.placingKind);
  const setPlacingKind = useUI((s) => s.setPlacingKind);
  const [cat, setCat] = useState<string>('All');

  const items = useMemo(
    () => (cat === 'All' ? OBJECT_LIBRARY : OBJECT_LIBRARY.filter((o) => o.category === cat)),
    [cat],
  );

  return (
    <div>
      <div className="field">
        <label>Category</label>
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="All">All objects</option>
          {OBJECT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {placingKind && (
        <div className="tag" style={{ marginBottom: 10, display: 'inline-block' }}>
          Placing — click a floor tile · Esc to cancel
        </div>
      )}

      <div className="palette">
        {items.map((o) => (
          <div
            key={o.kind}
            className={`palette-item ${placingKind === o.kind ? 'active' : ''}`}
            title={`${o.label} — click then tap a tile`}
            onClick={() => setPlacingKind(placingKind === o.kind ? null : o.kind)}
          >
            <span className="glyph">
              <Icon icon={objectIcon(o.kind)} size={26} color={iconTint(o.color)} />
            </span>
            <span className="name">{o.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
