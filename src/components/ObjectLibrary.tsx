import { useMemo, useState } from 'react';
import { OBJECT_LIBRARY, OBJECT_CATEGORIES, isWallAttachable, mustStack } from '../themes/objects';
import { ObjectMenuIcon } from '../themes/ObjectMenuIcon';
import { useUI } from '../state/useUI';
import ThemedSelect from './ThemedSelect';

function placementTarget(kind: string): string {
  if (isWallAttachable(kind)) return 'a wall';
  if (mustStack(kind)) return 'a dining table or bed';
  return 'a floor tile';
}

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
        <ThemedSelect
          value={cat}
          onChange={setCat}
          options={[
            { value: 'All', label: 'All objects' },
            ...OBJECT_CATEGORIES.map((c) => ({ value: c, label: c })),
          ]}
        />
      </div>

      {placingKind && (
        <div className="tag" style={{ marginBottom: 10, display: 'inline-block' }}>
          Placing — click {placementTarget(placingKind)} · Esc to cancel
        </div>
      )}

      <div className="palette">
        {items.map((o) => (
          <div
            key={o.kind}
            className={`palette-item ${placingKind === o.kind ? 'active' : ''}`}
            title={`${o.label} — click then place on ${placementTarget(o.kind)}`}
            onClick={() => setPlacingKind(placingKind === o.kind ? null : o.kind)}
          >
            <span className="glyph">
              <ObjectMenuIcon kind={o.kind} size={26} />
            </span>
            <span className="name">{o.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
