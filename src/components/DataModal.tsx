import { useRef } from 'react';
import { useStore } from '../state/useStore';
import { useUI } from '../state/useUI';

export default function DataModal() {
  const open = useUI((s) => s.dataModalOpen);
  const setOpen = useUI((s) => s.setDataModalOpen);
  const fileRef = useRef<HTMLInputElement>(null);

  const museums = useStore((s) => s.museums);
  const rooms = useStore((s) => s.rooms);
  const connections = useStore((s) => s.connections);
  const objects = useStore((s) => s.objects);
  const memories = useStore((s) => s.memories);
  const importBundle = useStore((s) => s.importBundle);

  if (!open) return null;

  const handleExport = () => {
    const live = museums.filter((m) => !m.deletedAt);
    const liveIds = new Set(live.map((m) => m.id));
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      museums: live,
      rooms: rooms.filter((r) => liveIds.has(r.museumId) && !r.deletedAt),
      connections: connections.filter((c) => liveIds.has(c.museumId) && !c.deletedAt),
      objects: objects.filter((o) => liveIds.has(o.museumId) && !o.deletedAt),
      memories: memories.filter((m) => {
        const obj = objects.find((o) => o.id === m.objectId);
        return obj && liveIds.has(obj.museumId) && !m.deletedAt;
      }),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `memory-museum-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => fileRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.museums || !Array.isArray(data.museums)) {
        alert('Invalid backup file: missing museums array.');
        return;
      }
      const roomList = data.rooms ?? [];
      const connList = data.connections ?? [];
      const objList = data.objects ?? [];
      const memList = data.memories ?? [];
      for (const museum of data.museums) {
        importBundle({
          museum,
          rooms: roomList.filter((r: { museumId: string }) => r.museumId === museum.id),
          connections: connList.filter((c: { museumId: string }) => c.museumId === museum.id),
          objects: objList.filter((o: { museumId: string }) => o.museumId === museum.id),
          memories: memList.filter((m: { objectId: string }) => {
            const obj = objList.find((o: { id: string; museumId: string }) => o.id === m.objectId);
            return obj?.museumId === museum.id;
          }),
        });
      }
      setOpen(false);
    } catch {
      alert('Failed to read backup file.');
    }
    // reset so the same file can be re-selected
    e.target.value = '';
  };

  return (
    <div className="modal-backdrop" onClick={() => setOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-head">
          <span className="modal-title">Data — Export / Import</span>
          <button
            type="button"
            className="ghost modal-close"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Export all your museums to a JSON backup file, or restore from a previous export.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" style={{ flex: 1 }} onClick={handleExport}>
              Export
            </button>
            <button className="btn" style={{ flex: 1 }} onClick={handleImport}>
              Import
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFile} />
        </div>
      </div>
    </div>
  );
}
