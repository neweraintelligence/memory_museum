import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Palace, Room, Connection, PObject, Memory } from '../types';

export class MemoryPalaceDB extends Dexie {
  palaces!: Table<Palace, string>;
  rooms!: Table<Room, string>;
  connections!: Table<Connection, string>;
  objects!: Table<PObject, string>;
  memories!: Table<Memory, string>;

  constructor() {
    super('memory-palace');
    this.version(1).stores({
      palaces: 'id, updatedAt, deleted',
      rooms: 'id, palaceId, updatedAt, deleted',
      connections: 'id, palaceId, updatedAt, deleted',
      objects: 'id, roomId, updatedAt, deleted',
      memories: 'id, objectId, updatedAt, deleted',
    });
  }
}

export const db = new MemoryPalaceDB();
