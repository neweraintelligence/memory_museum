import { supabase, ensureAuth, isCloudEnabled } from './supabase';
import { db } from './db';
import type { Museum, Room, Connection, PObject, Memory } from '../types';

export type TableName =
  | 'museums'
  | 'rooms'
  | 'connections'
  | 'objects'
  | 'memories';

// ---- camelCase (local) <-> snake_case (Supabase) mappers -------------------

const toMuseumRow = (p: Museum) => ({
  id: p.id,
  user_id: p.userId,
  name: p.name,
  theme: p.theme,
  created_at: p.createdAt,
  updated_at: p.updatedAt,
  deleted: p.deleted,
});

const fromMuseumRow = (r: Record<string, unknown>): Museum => ({
  id: r.id as string,
  userId: (r.user_id as string) ?? null,
  name: r.name as string,
  theme: r.theme as string,
  createdAt: Number(r.created_at),
  updatedAt: Number(r.updated_at),
  deleted: Number(r.deleted) || 0,
});

const toRoomRow = (x: Room) => ({
  id: x.id,
  museum_id: x.museumId,
  name: x.name,
  type: x.type,
  style: x.style,
  grid_w: x.gridW,
  grid_h: x.gridH,
  tiles: x.tiles,
  walls: x.walls,
  map_x: x.mapX,
  map_y: x.mapY,
  order_index: x.orderIndex,
  updated_at: x.updatedAt,
  deleted: x.deleted,
});

const fromRoomRow = (r: Record<string, unknown>): Room => ({
  id: r.id as string,
  museumId: r.museum_id as string,
  name: r.name as string,
  type: r.type as string,
  style: r.style as string,
  gridW: Number(r.grid_w),
  gridH: Number(r.grid_h),
  tiles: (r.tiles as string[]) ?? [],
  walls: (r.walls as string[]) ?? [],
  mapX: Number(r.map_x),
  mapY: Number(r.map_y),
  orderIndex: Number(r.order_index),
  updatedAt: Number(r.updated_at),
  deleted: Number(r.deleted) || 0,
});

const toConnectionRow = (x: Connection) => ({
  id: x.id,
  museum_id: x.museumId,
  from_room_id: x.fromRoomId,
  to_room_id: x.toRoomId,
  updated_at: x.updatedAt,
  deleted: x.deleted,
});

const fromConnectionRow = (r: Record<string, unknown>): Connection => ({
  id: r.id as string,
  museumId: r.museum_id as string,
  fromRoomId: r.from_room_id as string,
  toRoomId: r.to_room_id as string,
  updatedAt: Number(r.updated_at),
  deleted: Number(r.deleted) || 0,
});

const toObjectRow = (x: PObject) => ({
  id: x.id,
  room_id: x.roomId,
  kind: x.kind,
  label: x.label,
  grid_x: x.gridX,
  grid_y: x.gridY,
  wall_side: x.wallSide,
  rotation: x.rotation,
  color: x.color,
  icon: x.icon,
  order_index: x.orderIndex,
  updated_at: x.updatedAt,
  deleted: x.deleted,
});

const fromObjectRow = (r: Record<string, unknown>): PObject => ({
  id: r.id as string,
  roomId: r.room_id as string,
  kind: r.kind as string,
  label: r.label as string,
  gridX: Number(r.grid_x),
  gridY: Number(r.grid_y),
  wallSide: (r.wall_side as 'left' | 'right' | null | undefined) ?? null,
  rotation: Number(r.rotation),
  color: r.color as string,
  icon: r.icon as string,
  orderIndex: Number(r.order_index),
  updatedAt: Number(r.updated_at),
  deleted: Number(r.deleted) || 0,
});

const toMemoryRow = (x: Memory) => ({
  id: x.id,
  object_id: x.objectId,
  title: x.title,
  body: x.body,
  prompt: x.prompt,
  answer: x.answer,
  tags: x.tags,
  category: x.category,
  image_url: x.imageUrl,
  links: x.links,
  review_status: x.reviewStatus,
  difficulty: x.difficulty,
  ease: x.ease,
  last_reviewed: x.lastReviewed,
  next_review: x.nextReview,
  updated_at: x.updatedAt,
  deleted: x.deleted,
});

const fromMemoryRow = (r: Record<string, unknown>): Memory => ({
  id: r.id as string,
  objectId: r.object_id as string,
  title: (r.title as string) ?? '',
  body: (r.body as string) ?? '',
  prompt: (r.prompt as string) ?? '',
  answer: (r.answer as string) ?? '',
  tags: (r.tags as string[]) ?? [],
  category: (r.category as string) ?? '',
  imageUrl: (r.image_url as string) ?? '',
  links: (r.links as string[]) ?? [],
  reviewStatus: (r.review_status as Memory['reviewStatus']) ?? 'new',
  difficulty: Number(r.difficulty) || 0,
  ease: Number(r.ease) || 2.5,
  lastReviewed: r.last_reviewed == null ? null : Number(r.last_reviewed),
  nextReview: r.next_review == null ? null : Number(r.next_review),
  updatedAt: Number(r.updated_at),
  deleted: Number(r.deleted) || 0,
});

const TO_ROW: Record<TableName, (x: never) => Record<string, unknown>> = {
  museums: toMuseumRow as (x: never) => Record<string, unknown>,
  rooms: toRoomRow as (x: never) => Record<string, unknown>,
  connections: toConnectionRow as (x: never) => Record<string, unknown>,
  objects: toObjectRow as (x: never) => Record<string, unknown>,
  memories: toMemoryRow as (x: never) => Record<string, unknown>,
};

// ---- push (debounced upsert queue) -----------------------------------------

const pending: Record<TableName, Map<string, Record<string, unknown>>> = {
  museums: new Map(),
  rooms: new Map(),
  connections: new Map(),
  objects: new Map(),
  memories: new Map(),
};

let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function queuePush<T extends { id: string }>(table: TableName, rec: T): void {
  if (!isCloudEnabled()) return;
  const row = TO_ROW[table](rec as never);
  pending[table].set(rec.id, row);
  scheduleFlush();
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, 800);
}

export async function flush(): Promise<void> {
  if (!supabase) return;
  const userId = await ensureAuth();
  if (!userId) return;

  // Flush in dependency order: museums → rooms → connections → objects → memories
  const flushOrder: TableName[] = ['museums', 'rooms', 'connections', 'objects', 'memories'];
  for (const table of flushOrder) {
    const map = pending[table];
    if (map.size === 0) continue;
    const rows = Array.from(map.values());
    // Stamp user_id on museums so RLS accepts them.
    if (table === 'museums') {
      for (const r of rows) r.user_id = userId;
    }
    if (table === 'museums') console.log('[sync] museum upsert payload:', JSON.stringify(rows));
    const { error } = await supabase.from(table).upsert(rows);
    if (error) {
      console.warn(`[sync] upsert ${table} failed:`, error.message);
      // If a parent table fails, stop flushing — children will fail RLS too.
      if (table === 'museums') break;
    } else {
      map.clear();
    }
  }
}

// ---- pull (hydrate Dexie from cloud) ---------------------------------------

export async function pullAll(): Promise<boolean> {
  if (!supabase) return false;
  const userId = await ensureAuth();
  if (!userId) return false;

  try {
    const [museums, rooms, connections, objects, memories] = await Promise.all([
      supabase.from('museums').select('*'),
      supabase.from('rooms').select('*'),
      supabase.from('connections').select('*'),
      supabase.from('objects').select('*'),
      supabase.from('memories').select('*'),
    ]);

    await mergeIntoDexie(db.museums, (museums.data ?? []).map(fromMuseumRow));
    await mergeIntoDexie(db.rooms, (rooms.data ?? []).map(fromRoomRow));
    await mergeIntoDexie(
      db.connections,
      (connections.data ?? []).map(fromConnectionRow),
    );
    await mergeIntoDexie(db.objects, (objects.data ?? []).map(fromObjectRow));
    await mergeIntoDexie(db.memories, (memories.data ?? []).map(fromMemoryRow));
    return true;
  } catch (e) {
    console.warn('[sync] pull failed', e);
    return false;
  }
}

async function mergeIntoDexie<T extends { id: string; updatedAt: number }>(
  table: { get: (id: string) => Promise<T | undefined>; put: (v: T) => Promise<unknown> },
  remote: T[],
): Promise<void> {
  for (const r of remote) {
    const local = await table.get(r.id);
    if (!local || r.updatedAt >= local.updatedAt) {
      await table.put(r);
    }
  }
}
