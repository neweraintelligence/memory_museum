import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/useStore';
import { useUI } from '../state/useUI';
import { roomTypeIcon } from '../themes/styles';

interface Hit {
  palaceId: string;
  palaceName: string;
  roomId: string;
  roomName: string;
  roomType: string;
  objectId: string | null;
  icon: string;
  label: string;
  snippet: string;
}

export default function SearchModal() {
  const open = useUI((s) => s.searchOpen);
  const setSearchOpen = useUI((s) => s.setSearchOpen);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');

  const palaces = useStore((s) => s.palaces);
  const rooms = useStore((s) => s.rooms);
  const objects = useStore((s) => s.objects);
  const memories = useStore((s) => s.memories);

  useEffect(() => {
    if (open) {
      setQ('');
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const hits = useMemo<Hit[]>(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const palaceMap = new Map(palaces.map((p) => [p.id, p]));
    const roomMap = new Map(rooms.map((r) => [r.id, r]));
    const out: Hit[] = [];

    for (const o of objects) {
      if (o.deleted) continue;
      const room = roomMap.get(o.roomId);
      if (!room || room.deleted) continue;
      const palace = palaceMap.get(room.palaceId);
      if (!palace || palace.deleted) continue;
      const mem = memories.find((m) => m.objectId === o.id);
      const haystack = [
        o.label,
        mem?.title,
        mem?.body,
        mem?.prompt,
        mem?.answer,
        mem?.category,
        mem?.tags.join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (haystack.includes(term)) {
        out.push({
          palaceId: palace.id,
          palaceName: palace.name,
          roomId: room.id,
          roomName: room.name,
          roomType: room.type,
          objectId: o.id,
          icon: o.icon,
          label: mem?.title || o.label,
          snippet: mem?.prompt || mem?.answer || mem?.body || '',
        });
      }
    }

    // also match rooms / palaces by name
    for (const r of rooms) {
      if (r.deleted) continue;
      const palace = palaceMap.get(r.palaceId);
      if (!palace || palace.deleted) continue;
      if (r.name.toLowerCase().includes(term) || palace.name.toLowerCase().includes(term)) {
        out.push({
          palaceId: palace.id,
          palaceName: palace.name,
          roomId: r.id,
          roomName: r.name,
          roomType: r.type,
          objectId: null,
          icon: roomTypeIcon(r.type),
          label: r.name,
          snippet: 'Room',
        });
      }
    }

    return out.slice(0, 40);
  }, [q, palaces, rooms, objects, memories]);

  if (!open) return null;

  const go = (hit: Hit) => {
    const params = new URLSearchParams();
    params.set('room', hit.roomId);
    if (hit.objectId) params.set('obj', hit.objectId);
    setSearchOpen(false);
    navigate(`/palace/${hit.palaceId}?${params.toString()}`);
  };

  return (
    <div
      className="modal-backdrop"
      onClick={() => setSearchOpen(false)}
      onKeyDown={(e) => e.key === 'Escape' && setSearchOpen(false)}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span style={{ fontSize: 18 }}>🔍</span>
          <input
            ref={inputRef}
            value={q}
            placeholder="Search palaces, rooms, objects, memories…"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && hits[0]) go(hits[0]);
            }}
          />
        </div>
        <div className="modal-body">
          {q && hits.length === 0 && <div className="empty">No matches.</div>}
          {hits.map((h, i) => (
            <div key={i} className="search-result" onClick={() => go(h)}>
              <span style={{ fontSize: 22 }}>{h.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{h.label}</div>
                <div className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {h.snippet}
                </div>
              </div>
              <div className="breadcrumb" style={{ flexShrink: 0 }}>
                {h.palaceName} <span>›</span> {h.roomName}
              </div>
            </div>
          ))}
          {!q && <div className="empty">Type to search across everything you've built.</div>}
        </div>
      </div>
    </div>
  );
}
