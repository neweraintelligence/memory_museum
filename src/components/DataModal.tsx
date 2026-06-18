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
    const live = museums.filter((m) => !m.deleted);
    const liveIds = new Set(live.map((m) => m.id));
    const liveRooms = rooms.filter((r) => liveIds.has(r.museumId) && !r.deleted);
    const liveRoomIds = new Set(liveRooms.map((r) => r.id));
    const liveObjects = objects.filter((o) => liveRoomIds.has(o.roomId) && !o.deleted);
    const liveObjectIds = new Set(liveObjects.map((o) => o.id));
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      museums: live,
      rooms: liveRooms,
      connections: connections.filter((c) => liveIds.has(c.museumId) && !c.deleted),
      objects: liveObjects,
      memories: memories.filter((m) => liveObjectIds.has(m.objectId) && !m.deleted),
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
      // Basic shape validation: every record must have a string id.
      const hasId = (rec: unknown): rec is { id: string } =>
        typeof rec === 'object' && rec !== null && typeof (rec as Record<string, unknown>).id === 'string';
      const roomList = (data.rooms ?? []).filter(hasId);
      const connList = (data.connections ?? []).filter(hasId);
      const objList = (data.objects ?? []).filter(hasId);
      const memList = (data.memories ?? []).filter(hasId);
      const validMuseums = (data.museums as unknown[]).filter(hasId);
      if (validMuseums.length === 0) {
        alert('Invalid backup file: no valid museums found.');
        return;
      }
      for (const museum of validMuseums) {
        const museumRooms = roomList.filter((r: { museumId: string }) => r.museumId === museum.id);
        const roomIds = new Set(museumRooms.map((r: { id: string }) => r.id));
        const museumObjects = objList.filter((o: { roomId: string }) => roomIds.has(o.roomId));
        const objectIds = new Set(museumObjects.map((o: { id: string }) => o.id));
        importBundle({
          museum,
          rooms: museumRooms,
          connections: connList.filter((c: { museumId: string }) => c.museumId === museum.id),
          objects: museumObjects,
          memories: memList.filter((m: { objectId: string }) => objectIds.has(m.objectId)),
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
