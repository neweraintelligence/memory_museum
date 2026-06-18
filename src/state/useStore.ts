import { create } from 'zustand';
import type { Table } from 'dexie';
import { db } from '../lib/db';
import { newId, now } from '../lib/id';
import { queuePush, pullAll } from '../lib/sync';
import { ensureAuth, isCloudEnabled } from '../lib/supabase';
import { applyGrade } from '../lib/srs';
import type { Grade } from '../lib/srs';
import { getTheme } from '../themes/styles';
import { getObjectDef, isSurface, isWallAttachable } from '../themes/objects';
import { getRoomTiles, tileKey } from '../lib/floor';
import { autoWallKeys } from '../lib/wallAttach';
import {
  canPlaceObject,
  footprintTileKeys,
  normalizeRotation,
  stackedItemsOn,
} from '../lib/objectPlacement';
import type {
  Museum,
  Room,
  Connection,
  PObject,
  Memory,
  WallSide,
} from '../types';

export type CloudStatus = 'off' | 'connecting' | 'on' | 'error';

interface State {
  loaded: boolean;
  cloud: CloudStatus;
  museums: Museum[];
  rooms: Room[];
  connections: Connection[];
  objects: PObject[];
  memories: Memory[];

  init: () => Promise<void>;

  // museums
  createMuseum: (name: string, theme: string) => Museum;
  updateMuseum: (id: string, patch: Partial<Museum>) => void;
  deleteMuseum: (id: string) => void;

  // rooms
  createRoom: (museumId: string, partial?: Partial<Room>) => Room;
  updateRoom: (id: string, patch: Partial<Room>) => void;
  deleteRoom: (id: string) => void;
  duplicateRoom: (id: string) => Room | null;
  toggleConnection: (museumId: string, a: string, b: string) => void;

  // floor plan
  addFloorTile: (roomId: string, gx: number, gy: number) => void;
  removeFloorTile: (roomId: string, gx: number, gy: number) => boolean;

  // walls
  addWall: (roomId: string, gx: number, gy: number, side: WallSide) => void;
  removeWall: (roomId: string, gx: number, gy: number, side: WallSide) => void;

  // objects
  addObject: (
    roomId: string,
    kind: string,
    gridX: number,
    gridY: number,
    wallSide?: WallSide | null,
    rotation?: number,
  ) => PObject | null;
  updateObject: (id: string, patch: Partial<PObject>) => void;
  deleteObject: (id: string) => void;

  // memories
  getMemory: (objectId: string) => Memory | undefined;
  updateMemory: (id: string, patch: Partial<Memory>) => void;
  gradeMemory: (id: string, grade: Grade) => void;

  // bulk import (templates)
  importBundle: (bundle: {
    museum: Museum;
    rooms: Room[];
    connections: Connection[];
    objects: PObject[];
    memories: Memory[];
  }) => void;
}

type TName = 'museums' | 'rooms' | 'connections' | 'objects' | 'memories';

function persist<T extends { id: string }>(tableName: TName, rec: T): void {
  (db[tableName] as unknown as Table<T, string>).put(rec).catch((err) => {
    console.error(`[db] persist ${tableName} failed:`, err);
  });
  queuePush(tableName, rec);
}

export const useStore = create<State>((set, get) => ({
  loaded: false,
  cloud: 'off',
  museums: [],
  rooms: [],
  connections: [],
  objects: [],
  memories: [],

  init: async () => {
    if (get().loaded) return;
    // Load local cache first for instant boot.
    const [museums, rawRooms, connections, objects, memories] = await Promise.all([
      db.museums.toArray(),
      db.rooms.toArray(),
      db.connections.toArray(),
      db.objects.toArray(),
      db.memories.toArray(),
    ]);
    // Normalise legacy rooms that predate the tiles/walls fields.
    const rooms = rawRooms.map((r) => ({ ...r, tiles: r.tiles ?? [], walls: r.walls ?? [] }));
    set({ museums, rooms, connections, objects, memories, loaded: true });

    if (isCloudEnabled()) {
      set({ cloud: 'connecting' });
      const uid = await ensureAuth();
      if (uid) {
        const ok = await pullAll();
        if (ok) {
          const [p, rawR, c, o, m] = await Promise.all([
            db.museums.toArray(),
            db.rooms.toArray(),
            db.connections.toArray(),
            db.objects.toArray(),
            db.memories.toArray(),
          ]);
          set({ museums: p, rooms: rawR.map((r) => ({ ...r, tiles: r.tiles ?? [], walls: r.walls ?? [] })), connections: c, objects: o, memories: m });
        }
        set({ cloud: ok ? 'on' : 'error' });
      } else {
        set({ cloud: 'error' });
      }
    }
  },

  createMuseum: (name, theme) => {
    const ts = now();
    const museum: Museum = {
      id: newId(),
      userId: null,
      name: name.trim() || 'Untitled Museum',
      theme,
      createdAt: ts,
      updatedAt: ts,
      deleted: 0,
    };
    persist('museums', museum);
    set((s) => ({ museums: [...s.museums, museum] }));

    // Starter room so the museum is never empty.
    const themeDef = getTheme(theme);
    get().createRoom(museum.id, {
      name: 'Entrance Hall',
      type: 'corridor',
      style: themeDef.defaultStyle,
    });
    return museum;
  },

  updateMuseum: (id, patch) => {
    set((s) => {
      const museums = s.museums.map((p) => {
        if (p.id !== id) return p;
        const next = { ...p, ...patch, updatedAt: now() };
        persist('museums', next);
        return next;
      });
      return { museums };
    });
  },

  deleteMuseum: (id) => {
    const ts = now();
    const s = get();
    const rooms = s.rooms.filter((r) => r.museumId === id);
    const roomIds = new Set(rooms.map((r) => r.id));
    const objects = s.objects.filter((o) => roomIds.has(o.roomId));
    const objIds = new Set(objects.map((o) => o.id));
    const memories = s.memories.filter((m) => objIds.has(m.objectId));
    const connections = s.connections.filter((c) => c.museumId === id);

    const museum = s.museums.find((p) => p.id === id);
    if (museum) persist('museums', { ...museum, deleted: 1, updatedAt: ts });
    rooms.forEach((r) => persist('rooms', { ...r, deleted: 1, updatedAt: ts }));
    objects.forEach((o) => persist('objects', { ...o, deleted: 1, updatedAt: ts }));
    memories.forEach((m) => persist('memories', { ...m, deleted: 1, updatedAt: ts }));
    connections.forEach((c) =>
      persist('connections', { ...c, deleted: 1, updatedAt: ts }),
    );

    set((st) => ({
      museums: st.museums.filter((p) => p.id !== id),
      rooms: st.rooms.filter((r) => r.museumId !== id),
      objects: st.objects.filter((o) => !roomIds.has(o.roomId)),
      memories: st.memories.filter((m) => !objIds.has(m.objectId)),
      connections: st.connections.filter((c) => c.museumId !== id),
    }));
  },

  createRoom: (museumId, partial) => {
    const s = get();
    const existing = s.rooms.filter((r) => r.museumId === museumId);
    const ts = now();
    const idx = existing.length;
    // Lay rooms out on a loose grid for the map view.
    const room: Room = {
      id: newId(),
      museumId,
      name: partial?.name ?? `Room ${idx + 1}`,
      type: partial?.type ?? 'custom',
      style: partial?.style ?? 'beach-house',
      gridW: partial?.gridW ?? 6,
      gridH: partial?.gridH ?? 6,
      tiles: partial?.tiles ?? [],
      walls: partial?.walls ?? (() => {
        // Auto-populate walls from floor edges for new rooms
        const tmpRoom = { gridW: partial?.gridW ?? 6, gridH: partial?.gridH ?? 6, tiles: partial?.tiles ?? [], museumId: museumId } as Room;
        const tk = getRoomTiles(tmpRoom);
        const ps = new Set(tk);
        return autoWallKeys(tk, ps);
      })(),
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
    const newRoom = get().createRoom(room.museumId, {
      name: `${room.name} (copy)`,
      type: room.type,
      style: room.style,
      gridW: room.gridW,
      gridH: room.gridH,
      tiles: [...(room.tiles ?? [])],
      walls: [...(room.walls ?? [])],
    });
    const objects = s.objects.filter((o) => o.roomId === id);
    const newObjects: PObject[] = [];
    const newMemories: Memory[] = [];
    objects.forEach((o) => {
      const copy: PObject = { ...o, id: newId(), roomId: newRoom.id, updatedAt: now() };
      persist('objects', copy);
      const mem = s.memories.find((m) => m.objectId === o.id);
      const memCopy: Memory = mem
        ? { ...mem, id: newId(), objectId: copy.id, updatedAt: now() }
        : blankMemory(copy.id);
      persist('memories', memCopy);
      newObjects.push(copy);
      newMemories.push(memCopy);
    });
    set((st) => ({
      objects: [...st.objects, ...newObjects],
      memories: [...st.memories, ...newMemories],
    }));
    return newRoom;
  },

  toggleConnection: (museumId, a, b) => {
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
        museumId,
        fromRoomId: a,
        toRoomId: b,
        updatedAt: ts,
        deleted: 0,
      };
      persist('connections', conn);
      set((st) => ({ connections: [...st.connections, conn] }));
    }
  },

  addFloorTile: (roomId, gx, gy) => {
    const room = get().rooms.find((r) => r.id === roomId);
    if (!room) return;
    const tiles = getRoomTiles(room);
    const key = tileKey(gx, gy);
    if (tiles.includes(key)) return;
    get().updateRoom(roomId, { tiles: [...tiles, key] });
  },

  removeFloorTile: (roomId, gx, gy) => {
    const s = get();
    const room = s.rooms.find((r) => r.id === roomId);
    if (!room) return false;
    const tiles = getRoomTiles(room);
    if (tiles.length <= 1) return false; // never remove the last tile
    const key = tileKey(gx, gy);
    // Don't remove a tile that an object is sitting on.
    const occupied = s.objects.some(
      (o) =>
        o.roomId === roomId &&
        !o.deleted &&
        footprintTileKeys(o).includes(key),
    );
    if (occupied) return false;
    if (!tiles.includes(key)) return false;
    get().updateRoom(roomId, { tiles: tiles.filter((t) => t !== key) });
    return true;
  },

  addWall: (roomId, gx, gy, side) => {
    const room = get().rooms.find((r) => r.id === roomId);
    if (!room) return;
    const walls = room.walls ?? [];
    const key = `${gx},${gy},${side}`;
    if (walls.includes(key)) return;
    get().updateRoom(roomId, { walls: [...walls, key] });
  },

  removeWall: (roomId, gx, gy, side) => {
    const room = get().rooms.find((r) => r.id === roomId);
    if (!room) return;
    const walls = room.walls ?? [];
    const key = `${gx},${gy},${side}`;
    if (!walls.includes(key)) return;
    get().updateRoom(roomId, { walls: walls.filter((w) => w !== key) });
  },

  addObject: (roomId, kind, gridX, gridY, wallSide = null, rotation?) => {
    if (isWallAttachable(kind) && !wallSide) return null;
    const def = getObjectDef(kind);
    const s = get();
    const room = s.rooms.find((r) => r.id === roomId);
    if (!room) return null;
    const rot = normalizeRotation(rotation ?? def.defaultRotation ?? 0);
    if (!canPlaceObject(room, s.objects, kind, gridX, gridY, rot, wallSide ?? null)) {
      return null;
    }
    const idx = s.objects.filter((o) => o.roomId === roomId).length;
    const ts = now();
    const obj: PObject = {
      id: newId(),
      roomId,
      kind,
      label: def.label,
      gridX,
      gridY,
      wallSide: wallSide ?? null,
      rotation: rot,
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
    set((s) => {
      const target = s.objects.find((o) => o.id === id);
      if (!target) return {};

      // When a surface (table / bed) is dragged to a new tile, carry the props
      // stacked on top of it along by the same grid delta.
      const dx = (patch.gridX ?? target.gridX) - target.gridX;
      const dy = (patch.gridY ?? target.gridY) - target.gridY;
      const carrying =
        (dx !== 0 || dy !== 0) &&
        !target.wallSide &&
        !patch.wallSide &&
        isSurface(target.kind);
      const riderIds = carrying
        ? new Set(stackedItemsOn(s.objects, target).map((o) => o.id))
        : null;

      const ts = now();
      return {
        objects: s.objects.map((o) => {
          if (o.id === id) {
            const next = { ...o, ...patch, updatedAt: ts };
            persist('objects', next);
            return next;
          }
          if (riderIds?.has(o.id)) {
            const next = { ...o, gridX: o.gridX + dx, gridY: o.gridY + dy, updatedAt: ts };
            persist('objects', next);
            return next;
          }
          return o;
        }),
      };
    });
  },

  deleteObject: (id) => {
    const ts = now();
    const s = get();
    const obj = s.objects.find((o) => o.id === id);
    const toDelete = new Set<string>([id]);
    // Deleting a surface also removes whatever is stacked on top of it.
    if (obj && !obj.wallSide && isSurface(obj.kind)) {
      for (const rider of stackedItemsOn(s.objects, obj)) toDelete.add(rider.id);
    }
    for (const did of toDelete) {
      const o = s.objects.find((x) => x.id === did);
      if (o) persist('objects', { ...o, deleted: 1, updatedAt: ts });
      const mem = s.memories.find((m) => m.objectId === did);
      if (mem) persist('memories', { ...mem, deleted: 1, updatedAt: ts });
    }
    set((st) => ({
      objects: st.objects.filter((o) => !toDelete.has(o.id)),
      memories: st.memories.filter((m) => !toDelete.has(m.objectId)),
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
    const s = get();
    const existingIds = new Set(s.museums.map((m) => m.id));
    if (existingIds.has(bundle.museum.id)) return; // skip duplicate import
    persist('museums', bundle.museum);
    bundle.rooms.forEach((r) => persist('rooms', r));
    bundle.connections.forEach((c) => persist('connections', c));
    bundle.objects.forEach((o) => persist('objects', o));
    bundle.memories.forEach((m) => persist('memories', m));
    set((st) => ({
      museums: [...st.museums, bundle.museum],
      rooms: [...st.rooms, ...bundle.rooms],
      connections: [...st.connections, ...bundle.connections],
      objects: [...st.objects, ...bundle.objects],
      memories: [...st.memories, ...bundle.memories],
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
export const selectRoomsOf = (museumId: string) => (s: State) =>
  s.rooms.filter((r) => r.museumId === museumId).sort((a, b) => a.orderIndex - b.orderIndex);

export const selectObjectsOf = (roomId: string) => (s: State) =>
  s.objects.filter((o) => o.roomId === roomId);
