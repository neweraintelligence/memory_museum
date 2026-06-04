export type ID = string;

export type ReviewStatus =
  | 'new'
  | 'easy'
  | 'hard'
  | 'forgotten'
  | 'mastered'
  | 'needs-review';

export type AppMode = 'build' | 'walk' | 'review';

export interface Palace {
  id: ID;
  userId: string | null;
  name: string;
  theme: string;
  createdAt: number;
  updatedAt: number;
  deleted: number; // 0 | 1, used for tombstone sync
}

export interface Room {
  id: ID;
  palaceId: ID;
  name: string;
  type: string;
  style: string;
  gridW: number;
  gridH: number;
  mapX: number;
  mapY: number;
  orderIndex: number;
  updatedAt: number;
  deleted: number;
}

export interface Connection {
  id: ID;
  palaceId: ID;
  fromRoomId: ID;
  toRoomId: ID;
  updatedAt: number;
  deleted: number;
}

export interface PObject {
  id: ID;
  roomId: ID;
  kind: string;
  label: string;
  gridX: number;
  gridY: number;
  rotation: number;
  color: string;
  icon: string;
  orderIndex: number;
  updatedAt: number;
  deleted: number;
}

export interface Memory {
  id: ID;
  objectId: ID;
  title: string;
  body: string;
  prompt: string;
  answer: string;
  tags: string[];
  category: string;
  imageUrl: string;
  links: string[];
  reviewStatus: ReviewStatus;
  difficulty: number;
  ease: number;
  lastReviewed: number | null;
  nextReview: number | null;
  updatedAt: number;
  deleted: number;
}

export type AnyRecord = Palace | Room | Connection | PObject | Memory;
