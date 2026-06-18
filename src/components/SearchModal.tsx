import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { IconType } from 'react-icons';
import { useStore } from '../state/useStore';
import { useUI } from '../state/useUI';
import { Icon } from '../themes/Icon';
import { objectIcon, roomIcon, UI_ICONS } from '../themes/icons';

interface Hit {
  museumId: string;
  museumName: string;
  roomId: string;
  roomName: string;
  roomType: string;
  objectId: string | null;
  icon: IconType;
  label: string;
  snippet: string;
}

export default function SearchModal() {
  const open = useUI((s) => s.searchOpen);
  const setSearchOpen = useUI((s) => s.setSearchOpen);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');

  const museums = useStore((s) => s.museums);
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
    const museumMap = new Map(museums.map((p) => [p.id, p]));
    const roomMap = new Map(rooms.map((r) => [r.id, r]));
    const out: Hit[] = [];

    for (const o of objects) {
      if (o.deleted) continue;
      const room = roomMap.get(o.roomId);
      if (!room || room.deleted) continue;
      const museum = museumMap.get(room.museumId);
      if (!museum || museum.deleted) continue;
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
          museumId: museum.id,
          museumName: museum.name,
          roomId: room.id,
          roomName: room.name,
          roomType: room.type,
          objectId: o.id,
          icon: objectIcon(o.kind),
          label: mem?.title || o.label,
          snippet: mem?.prompt || mem?.answer || mem?.body || '',
        });
      }
    }

    // also match rooms / museums by name
    for (const r of rooms) {
      if (r.deleted) continue;
      const museum = museumMap.get(r.museumId);
      if (!museum || museum.deleted) continue;
      if (r.name.toLowerCase().includes(term) || museum.name.toLowerCase().includes(term)) {
        out.push({
          museumId: museum.id,
          museumName: museum.name,
          roomId: r.id,
          roomName: r.name,
          roomType: r.type,
          objectId: null,
          icon: roomIcon(r.type),
          label: r.name,
          snippet: 'Room',
        });
      }
    }

    return out.slice(0, 40);
  }, [q, museums, rooms, objects, memories]);

  if (!open) return null;

  const go = (hit: Hit) => {
    const params = new URLSearchParams();
    params.set('room', hit.roomId);
    if (hit.objectId) params.set('obj', hit.objectId);
    setSearchOpen(false);
    navigate(`/museum/${hit.museumId}?${params.toString()}`);
  };

  return (
    <div
      className="modal-backdrop"
      onClick={() => setSearchOpen(false)}
      onKeyDown={(e) => e.key === 'Escape' && setSearchOpen(false)}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span style={{ lineHeight: 0, color: 'var(--text-dim)' }}>
            <Icon icon={UI_ICONS.search} size={18} />
          </span>
          <input
            ref={inputRef}
            value={q}
            placeholder="Search museums, rooms, objects, memories…"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && hits[0]) go(hits[0]);
            }}
          />
        </div>
        <div className="modal-body">
          {q && hits.length === 0 && <div className="empty">No matches.</div>}
          {hits.map((h) => (
            <div key={h.objectId ?? h.roomId} className="search-result" onClick={() => go(h)}>
              <span style={{ lineHeight: 0, color: 'var(--text)' }}>
                <Icon icon={h.icon} size={22} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{h.label}</div>
                <div className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {h.snippet}
                </div>
              </div>
              <div className="breadcrumb" style={{ flexShrink: 0 }}>
                {h.museumName} <span>›</span> {h.roomName}
              </div>
            </div>
          ))}
          {!q && <div className="empty">Type to search across everything you've built.</div>}
        </div>
      </div>
    </div>
  );
}
