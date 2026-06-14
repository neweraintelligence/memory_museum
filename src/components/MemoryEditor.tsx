import { useStore } from '../state/useStore';
import { useUI } from '../state/useUI';
import { ObjectMenuIcon } from '../themes/ObjectMenuIcon';
import { canPlaceObject, nextRotation, objectFootprint } from '../lib/objectPlacement';
import type { PObject } from '../types';

const STATUS_COLOR: Record<string, string> = {
  new: '#94a3b8',
  easy: '#22c55e',
  hard: '#f59e0b',
  forgotten: '#ef4444',
  mastered: '#06b6d4',
  'needs-review': '#8b5cf6',
};

const SWATCHES = [
  '#c0392b', '#e2b53c', '#3fa35a', '#3ad7ff', '#9b6dd6',
  '#e98aa8', '#7f8c8d', '#d97757', '#2e7d57', '#b7b7a8',
];

export default function MemoryEditor({ obj }: { obj: PObject }) {
  const memory = useStore((s) => s.memories.find((m) => m.objectId === obj.id));
  const updateMemory = useStore((s) => s.updateMemory);
  const updateObject = useStore((s) => s.updateObject);
  const deleteObject = useStore((s) => s.deleteObject);
  const setSelected = useUI((s) => s.setSelected);

  const rotateObject = () => {
    if (obj.wallSide) return;
    const { rooms, objects } = useStore.getState();
    const room = rooms.find((r) => r.id === obj.roomId);
    if (!room) return;
    const roomObjects = objects.filter((o) => o.roomId === obj.roomId && !o.deleted);
    const rot = nextRotation(obj.rotation);
    if (canPlaceObject(room, roomObjects, obj.kind, obj.gridX, obj.gridY, rot, null, obj.id)) {
      updateObject(obj.id, { rotation: rot });
    }
  };

  if (!memory) return null;

  return (
    <div className="fade-in">
      <div className="row" style={{ marginBottom: 12 }}>
        <span style={{ lineHeight: 0 }}>
          <ObjectMenuIcon kind={obj.kind} size={26} />
        </span>
        <div style={{ flex: 1 }}>
          <input
            value={obj.label}
            onChange={(e) => updateObject(obj.id, { label: e.target.value })}
            style={{ fontWeight: 600 }}
          />
        </div>
      </div>

      <div className="field">
        <label>Color</label>
        <div className="row wrap" style={{ gap: 6 }}>
          {SWATCHES.map((c) => (
            <div
              key={c}
              onClick={() => updateObject(obj.id, { color: c })}
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: c,
                cursor: 'pointer',
                outline: obj.color === c ? '2px solid #fff' : '1px solid rgba(0,0,0,0.3)',
              }}
            />
          ))}
        </div>
      </div>

      {!obj.wallSide && (
        <div className="field">
          <label>Orientation</label>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="icon-btn" onClick={rotateObject} title="Rotate (R)">
              ↻ Rotate
            </button>
            <span className="muted" style={{ fontSize: 13 }}>
              Facing {obj.rotation}
              {objectFootprint(obj.kind) > 1 ? ` · ${objectFootprint(obj.kind)} tiles` : ''}
            </span>
          </div>
        </div>
      )}

      <div className="field">
        <label>Memory title</label>
        <input
          value={memory.title}
          placeholder="What does this anchor represent?"
          onChange={(e) => updateMemory(memory.id, { title: e.target.value })}
        />
      </div>

      <div className="field">
        <label>Prompt (the recall question)</label>
        <textarea
          rows={2}
          value={memory.prompt}
          placeholder="e.g. What are the four chambers of the heart?"
          onChange={(e) => updateMemory(memory.id, { prompt: e.target.value })}
        />
      </div>

      <div className="field">
        <label>Answer / details</label>
        <textarea
          rows={3}
          value={memory.answer}
          placeholder="The thing to recall."
          onChange={(e) => updateMemory(memory.id, { answer: e.target.value })}
        />
      </div>

      <div className="field">
        <label>Notes</label>
        <textarea
          rows={3}
          value={memory.body}
          placeholder="Free-form notes, mnemonics, associations…"
          onChange={(e) => updateMemory(memory.id, { body: e.target.value })}
        />
      </div>

      <div className="field">
        <label>Category</label>
        <input
          value={memory.category}
          placeholder="e.g. cardiology"
          onChange={(e) => updateMemory(memory.id, { category: e.target.value })}
        />
      </div>

      <div className="field">
        <label>Tags (comma separated)</label>
        <input
          value={memory.tags.join(', ')}
          placeholder="exam, high-yield"
          onChange={(e) =>
            updateMemory(memory.id, {
              tags: e.target.value
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
            })
          }
        />
      </div>

      <div className="field">
        <label>Image URL</label>
        <input
          value={memory.imageUrl}
          placeholder="https://…"
          onChange={(e) => updateMemory(memory.id, { imageUrl: e.target.value })}
        />
        {memory.imageUrl && (
          <img
            src={memory.imageUrl}
            alt=""
            style={{ width: '100%', borderRadius: 8, marginTop: 8 }}
            onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
          />
        )}
      </div>

      <div className="field">
        <label>Links (comma separated)</label>
        <input
          value={memory.links.join(', ')}
          placeholder="https://…"
          onChange={(e) =>
            updateMemory(memory.id, {
              links: e.target.value
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
            })
          }
        />
      </div>

      <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
        <span
          className="status-badge"
          style={{ background: STATUS_COLOR[memory.reviewStatus] + '33', color: STATUS_COLOR[memory.reviewStatus] }}
        >
          {memory.reviewStatus}
        </span>
        <button
          className="danger icon-btn"
          onClick={() => {
            deleteObject(obj.id);
            setSelected(null);
          }}
        >
          Delete object
        </button>
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />
      <button className="ghost" style={{ width: '100%' }} onClick={() => setSelected(null)}>
        ← Back to object library
      </button>
    </div>
  );
}
