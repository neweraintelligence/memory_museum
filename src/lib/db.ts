import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Museum, Room, Connection, PObject, Memory } from '../types';

export class MemoryMuseumDB extends Dexie {
  museums!: Table<Museum, string>;
  rooms!: Table<Room, string>;
  connections!: Table<Connection, string>;
  objects!: Table<PObject, string>;
  memories!: Table<Memory, string>;

  constructor() {
    super('memory-museum');
    this.version(1).stores({
      museums: 'id, updatedAt, deleted',
      rooms: 'id, museumId, updatedAt, deleted',
      connections: 'id, museumId, updatedAt, deleted',
      objects: 'id, roomId, updatedAt, deleted',
      memories: 'id, objectId, updatedAt, deleted',
    });
  }
}

export const db = new MemoryMuseumDB();
