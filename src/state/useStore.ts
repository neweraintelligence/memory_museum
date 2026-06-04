import { create } from 'zustand';
import type { Table } from 'dexie';
import { db } from '../lib/db';
import { newId, now } from '../lib/id';
import { queuePush, pullAll } from '../lib/sync';
import { ensureAuth, isCloudEnabled } from '../lib/supabase';
import { applyGrade } from '../lib/srs';
import type { Grade } from '../lib/srs';
import { getTheme } from '../themes/styles';
import { getObjectDef } from '../themes/objects';
import type {
  Palace,
  Room,
  Connection,
  PObject,
  Memory,
} from '../types';

export type CloudStatus = 'off' | 'connecting' | 'on' | 'error';

interface State {
  loaded: boolean;
  cloud: CloudStatus;
  palaces: Palace[];
  rooms: Room[];
  connections: Connection[];
  objects: PObject[];
  memories: Memory[];

  init: () => Promise<void>;

  // palaces
  createPalace: (name: string, theme: string) => Palace;
  updatePalace: (id: string, patch: Partial<Palace>) => void;
  deletePalace: (id: string) => void;

  // rooms
  createRoom: (palaceId: string, partial?: Partial<Room>) => Room;
  updateRoom: (id: string, patch: Partial<Room>) => void;
  deleteRoom: (id: string) => void;
  duplicateRoom: (id: string) => Room | null;
  toggleConnection: (palaceId: string, a: string, b: string) => void;

  // objects
  addObject: (roomId: string, kind: string, gridX: number, gridY: number) => PObject;
  updateObject: (id: string, patch: Partial<PObject>) => void;
  deleteObject: (id: string) => void;

  // memories
  getMemory: (objectId: string) => Memory | undefined;
  updateMemory: (id: string, patch: Partial<Memory>) => void;
  gradeMemory: (id: string, grade: Grade) => void;

  // bulk import (templates)
  importBundle: (bundle: {
    palace: Palace;
    rooms: Room[];
    connections: Connection[];
    objects: PObject[];
    memories: Memory[];
  }) => void;
}

type TName = 'palaces' | 'rooms' | 'connections' | 'objects' | 'memories';

function persist<T extends { id: string }>(tableName: TName, rec: T): void {
  void (db[tableName] as unknown as Table<T, string>).put(rec);
  queuePush(tableName, rec);
}

export const useStore = create<State>((set, get) => ({
  loaded: false,
  cloud: 'off',
  palaces: [],
  rooms: [],
  connections: [],
  objects: [],
  memories: [],

  init: async () => {
    if (get().loaded) return;
    // Load local cache first for instant boot.
    const [palaces, rooms, connections, objects, memories] = await Promise.all([
      db.palaces.toArray(),
      db.rooms.toArray(),
      db.connections.toArray(),
      db.objects.toArray(),
      db.memories.toArray(),
    ]);
    set({ palaces, rooms, connections, objects, memories, loaded: true });

    if (isCloudEnabled()) {
      set({ cloud: 'connecting' });
      const uid = await ensureAuth();
      if (uid) {
        const ok = await pullAll();
        if (ok) {
          const [p, r, c, o, m] = await Promise.all([
            db.palaces.toArray(),
            db.rooms.toArray(),
            db.connections.toArray(),
            db.objects.toArray(),
            db.memories.toArray(),
          ]);
          set({ palaces: p, rooms: r, connections: c, objects: o, memories: m });
        }
        set({ cloud: ok ? 'on' : 'error' });
      } else {
        set({ cloud: 'error' });
      }
    }
  },

  createPalace: (name, theme) => {
    const ts = now();
    const palace: Palace = {
      id: newId(),
      userId: null,
      name: name.trim() || 'Untitled Palace',
      theme,
      createdAt: ts,
      updatedAt: ts,
      deleted: 0,
    };
    persist('palaces', palace);
    set((s) => ({ palaces: [...s.palaces, palace] }));

    // Starter room so the palace is never empty.
    const themeDef = getTheme(theme);
    get().createRoom(palace.id, {
      name: 'Entrance Hall',
      type: 'corridor',
      style: themeDef.defaultStyle,
    });
    return palace;
  },

  updatePalace: (id, patch) => {
    set((s) => {
      const palaces = s.palaces.map((p) => {
        if (p.id !== id) return p;
        const next = { ...p, ...patch, updatedAt: now() };
        persist('palaces', next);
        return next;
      });
      return { palaces };
    });
  },

  deletePalace: (id) => {
    const ts = now();
    const s = get();
    const rooms = s.rooms.filter((r) => r.palaceId === id);
    const roomIds = new Set(rooms.map((r) => r.id));
    const objects = s.objects.filter((o) => roomIds.has(o.roomId));
    const objIds = new Set(objects.map((o) => o.id));
    const memories = s.memories.filter((m) => objIds.has(m.objectId));
    const connections = s.connections.filter((c) => c.palaceId === id);

    const palace = s.palaces.find((p) => p.id === id);
    if (palace) persist('palaces', { ...palace, deleted: 1, updatedAt: ts });
    rooms.forEach((r) => persist('rooms', { ...r, deleted: 1, updatedAt: ts }));
    objects.forEach((o) => persist('objects', { ...o, deleted: 1, updatedAt: ts }));
    memories.forEach((m) => persist('memories', { ...m, deleted: 1, updatedAt: ts }));
    connections.forEach((c) =>
      persist('connections', { ...c, deleted: 1, updatedAt: ts }),
    );

    set((st) => ({
      palaces: st.palaces.filter((p) => p.id !== id),
      rooms: st.rooms.filter((r) => r.palaceId !== id),
      objects: st.objects.filter((o) => !roomIds.has(o.roomId)),
      memories: st.memories.filter((m) => !objIds.has(m.objectId)),
      connections: st.connections.filter((c) => c.palaceId !== id),
    }));
  },

  createRoom: (palaceId, partial) => {
    const s = get();
    const existing = s.rooms.filter((r) => r.palaceId === palaceId);
    const ts = now();
    const idx = existing.length;
    // Lay rooms out on a loose grid for the map view.
    const room: Room = {
      id: newId(),
      palaceId,
      name: partial?.name ?? `Room ${idx + 1}`,
      type: partial?.type ?? 'custom',
      style: partial?.style ?? 'cozy-apartment',
      gridW: partial?.gridW ?? 6,
      gridH: partial?.gridH ?? 6,
      mapX: partial?.mapX ?? 120 + (idx % 4) * 200,
      mapY: partial?.mapY ?? 120 + Math.floor(idx / 4) * 180,
      orderIndex: partial?.orderIndex ?? idx,
      updatedAt: ts,
      deleted: 0,
    };
    persist('rooms', room);
    set((st) => ({ rooms: [...st.rooms, room] }));
    return room;
  },

  updateRoom: (id, patch) => {
    set((s) => ({
      rooms: s.rooms.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch, updatedAt: now() };
        persist('rooms', next);
        return next;
      }),
    }));
  },

  deleteRoom: (id) => {
    const ts = now();
    const s = get();
    const objects = s.objects.filter((o) => o.roomId === id);
    const objIds = new Set(objects.map((o) => o.id));
    const memories = s.memories.filter((m) => objIds.has(m.objectId));
    const connections = s.connections.filter(
      (c) => c.fromRoomId === id || c.toRoomId === id,
    );
    const room = s.rooms.find((r) => r.id === id);
    if (room) persist('rooms', { ...room, deleted: 1, updatedAt: ts });
    objects.forEach((o) => persist('objects', { ...o, deleted: 1, updatedAt: ts }));
    memories.forEach((m) => persist('memories', { ...m, deleted: 1, updatedAt: ts }));
    connections.forEach((c) =>
      persist('connections', { ...c, deleted: 1, updatedAt: ts }),
    );

    set((st) => ({
      rooms: st.rooms.filter((r) => r.id !== id),
      objects: st.objects.filter((o) => o.roomId !== id),
      memories: st.memories.filter((m) => !objIds.has(m.objectId)),
      connections: st.connections.filter(
        (c) => c.fromRoomId !== id && c.toRoomId !== id,
      ),
    }));
  },

  duplicateRoom: (id) => {
    const s = get();
    const room = s.rooms.find((r) => r.id === id);
    if (!room) return null;
    const newRoom = get().createRoom(room.palaceId, {
      name: `${room.name} (copy)`,
      type: room.type,
      style: room.style,
      gridW: room.gridW,
      gridH: room.gridH,
    });
    const objects = s.objects.filter((o) => o.roomId === id);
    objects.forEach((o) => {
      const copy: PObject = { ...o, id: newId(), roomId: newRoom.id, updatedAt: now() };
      persist('objects', copy);
      const mem = s.memories.find((m) => m.objectId === o.id);
      const memCopy: Memory = mem
        ? { ...mem, id: newId(), objectId: copy.id, updatedAt: now() }
        : blankMemory(copy.id);
      persist('memories', memCopy);
      set((st) => ({
        objects: [...st.objects, copy],
        memories: [...st.memories, memCopy],
      }));
    });
    return newRoom;
  },

  toggleConnection: (palaceId, a, b) => {
    if (a === b) return;
    const s = get();
    const existing = s.connections.find(
      (c) =>
        (c.fromRoomId === a && c.toRoomId === b) ||
        (c.fromRoomId === b && c.toRoomId === a),
    );
    const ts = now();
    if (existing) {
      persist('connections', { ...existing, deleted: 1, updatedAt: ts });
      set((st) => ({ connections: st.connections.filter((c) => c.id !== existing.id) }));
    } else {
      const conn: Connection = {
        id: newId(),
        palaceId,
        fromRoomId: a,
        toRoomId: b,
        updatedAt: ts,
        deleted: 0,
      };
      persist('connections', conn);
      set((st) => ({ connections: [...st.connections, conn] }));
    }
  },

  addObject: (roomId, kind, gridX, gridY) => {
    const def = getObjectDef(kind);
    const s = get();
    const idx = s.objects.filter((o) => o.roomId === roomId).length;
    const ts = now();
    const obj: PObject = {
      id: newId(),
      roomId,
      kind,
      label: def.label,
      gridX,
      gridY,
      rotation: 0,
      color: def.color,
      icon: def.icon,
      orderIndex: idx,
      updatedAt: ts,
      deleted: 0,
    };
    persist('objects', obj);
    const mem = blankMemory(obj.id);
    mem.title = def.label;
    persist('memories', mem);
    set((st) => ({ objects: [...st.objects, obj], memories: [...st.memories, mem] }));
    return obj;
  },

  updateObject: (id, patch) => {
    set((s) => ({
      objects: s.objects.map((o) => {
        if (o.id !== id) return o;
        const next = { ...o, ...patch, updatedAt: now() };
        persist('objects', next);
        return next;
      }),
    }));
  },

  deleteObject: (id) => {
    const ts = now();
    const s = get();
    const obj = s.objects.find((o) => o.id === id);
    if (obj) persist('objects', { ...obj, deleted: 1, updatedAt: ts });
    const mem = s.memories.find((m) => m.objectId === id);
    if (mem) persist('memories', { ...mem, deleted: 1, updatedAt: ts });
    set((st) => ({
      objects: st.objects.filter((o) => o.id !== id),
      memories: st.memories.filter((m) => m.objectId !== id),
    }));
  },

  getMemory: (objectId) => get().memories.find((m) => m.objectId === objectId),

  updateMemory: (id, patch) => {
    set((s) => ({
      memories: s.memories.map((m) => {
        if (m.id !== id) return m;
        const next = { ...m, ...patch, updatedAt: now() };
        persist('memories', next);
        return next;
      }),
    }));
  },

  gradeMemory: (id, grade) => {
    const mem = get().memories.find((m) => m.id === id);
    if (!mem) return;
    get().updateMemory(id, applyGrade(mem, grade));
  },

  importBundle: (bundle) => {
    persist('palaces', bundle.palace);
    bundle.rooms.forEach((r) => persist('rooms', r));
    bundle.connections.forEach((c) => persist('connections', c));
    bundle.objects.forEach((o) => persist('objects', o));
    bundle.memories.forEach((m) => persist('memories', m));
    set((s) => ({
      palaces: [...s.palaces, bundle.palace],
      rooms: [...s.rooms, ...bundle.rooms],
      connections: [...s.connections, ...bundle.connections],
      objects: [...s.objects, ...bundle.objects],
      memories: [...s.memories, ...bundle.memories],
    }));
  },
}));

export function blankMemory(objectId: string): Memory {
  const ts = now();
  return {
    id: newId(),
    objectId,
    title: '',
    body: '',
    prompt: '',
    answer: '',
    tags: [],
    category: '',
    imageUrl: '',
    links: [],
    reviewStatus: 'new',
    difficulty: 0,
    ease: 2.5,
    lastReviewed: null,
    nextReview: null,
    updatedAt: ts,
    deleted: 0,
  };
}

// Selectors --------------------------------------------------------------
export const selectRoomsOf = (palaceId: string) => (s: State) =>
  s.rooms.filter((r) => r.palaceId === palaceId).sort((a, b) => a.orderIndex - b.orderIndex);

export const selectObjectsOf = (roomId: string) => (s: State) =>
  s.objects.filter((o) => o.roomId === roomId);
