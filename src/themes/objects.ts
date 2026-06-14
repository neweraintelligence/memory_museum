export interface ObjectDef {
  kind: string;
  label: string;
  icon: string;
  color: string;
  category: string;
  /** Mounts flush on an exposed room wall instead of a floor tile. */
  wallAttach?: boolean;
  /** Acts as a surface that "must-stack" objects can be placed on top of. */
  surface?: boolean;
  /** Must be stacked on top of a surface object — cannot sit on a bare floor tile. */
  mustStack?: boolean;
  /** Screen-px lift applied to objects stacked on top of this surface. */
  stackLift?: number;
  /** Floor tiles occupied (1 = single tile, 2 = spans two adjacent tiles). */
  footprint?: number;
  /** Default isometric facing (0–3) when first placed. */
  defaultRotation?: number;
  /** PNG paths relative to /public — two diagonal views or four facings (0–3). */
  sprites?: string[];
  /** Bottom-anchored display height in canvas px. */
  spriteHeight?: number;
  /** Manual floor contact (0–1 from sprite top). Overrides auto-detect when set. */
  spriteGround?: number;
  /** Extra px to nudge sprite down onto the tile (+ = lower). */
  spriteYOffset?: number;
  /** Extra px to nudge sprite horizontally (+ = right). */
  spriteXOffset?: number;
}

export const OBJECT_CATEGORIES = [
  'Furniture',
  'Knowledge',
  'Symbols',
  'Science',
  'Nature',
  'Architecture',
  'Curios',
] as const;

export const OBJECT_LIBRARY: ObjectDef[] = [
  // Furniture
  { kind: 'desk', label: 'Side Table', icon: '🪑', color: '#8a5a2b', category: 'Furniture', defaultRotation: 1 },
  { kind: 'coffee-table', label: 'Coffee Table', icon: '🪑', color: '#b87a3b', category: 'Furniture', defaultRotation: 0 },
  { kind: 'dining-table', label: 'Dining Table', icon: '🪑', color: '#c48a42', category: 'Furniture', footprint: 2, defaultRotation: 0, surface: true, stackLift: 42 },
  { kind: 'computer-desk', label: 'Desk', icon: '🪑', color: '#8a5a2b', category: 'Furniture', footprint: 2, defaultRotation: 1 },
  {
    kind: 'chair',
    label: 'Chair',
    icon: '🪑',
    color: '#c4a574',
    category: 'Furniture',
    sprites: ['objects/chair-0.png', 'objects/chair-1.png'],
    spriteHeight: 96,
    spriteYOffset: 8,
    defaultRotation: 0,
  },
  {
    kind: 'dining-chair',
    label: 'Dining Chair',
    icon: '🪑',
    color: '#8a6b4a',
    category: 'Furniture',
    sprites: ['objects/dinning-chair-0.png', 'objects/dinning-chair-1.png'],
    spriteHeight: 96,
    spriteYOffset: 9,
    spriteXOffset: -9,
    defaultRotation: 0,
  },
  { kind: 'cabinet', label: 'Cabinet', icon: '🗄️', color: '#6b4423', category: 'Furniture', defaultRotation: 2 },
  { kind: 'bed', label: 'Bed', icon: '🛏️', color: '#9d6b9d', category: 'Furniture', footprint: 2, defaultRotation: 0, surface: true, stackLift: 40 },
  { kind: 'lamp', label: 'Lamp', icon: '💡', color: '#f3c969', category: 'Furniture', defaultRotation: 3 },
  { kind: 'mirror', label: 'Mirror', icon: '🪞', color: '#9fc7d6', category: 'Furniture', wallAttach: true },
  { kind: 'chest', label: 'Chest', icon: '🧰', color: '#7a5230', category: 'Furniture', defaultRotation: 0 },

  // Knowledge
  { kind: 'book', label: 'Book', icon: '📕', color: '#c0392b', category: 'Knowledge', defaultRotation: 2, mustStack: true },
  { kind: 'books', label: 'Bookstack', icon: '📚', color: '#2e7d57', category: 'Knowledge', defaultRotation: 1 },
  { kind: 'scroll', label: 'Scroll', icon: '📜', color: '#d8c08a', category: 'Knowledge', defaultRotation: 3, mustStack: true },
  { kind: 'document', label: 'Document', icon: '📄', color: '#e8e8e8', category: 'Knowledge', defaultRotation: 0, mustStack: true },
  { kind: 'map', label: 'Map', icon: '🗺️', color: '#caa86a', category: 'Knowledge', defaultRotation: 2, mustStack: true },
  { kind: 'clock', label: 'Clock', icon: '🕰️', color: '#b08d57', category: 'Knowledge', defaultRotation: 1 },

  // Symbols
  { kind: 'statue', label: 'Statue', icon: '🗿', color: '#b7b7a8', category: 'Symbols', defaultRotation: 0 },
  { kind: 'gold-statue', label: 'Golden Statue', icon: '🏆', color: '#e2b53c', category: 'Symbols', defaultRotation: 2 },
  { kind: 'key', label: 'Key', icon: '🗝️', color: '#d4af37', category: 'Symbols', defaultRotation: 3, mustStack: true },
  { kind: 'crown', label: 'Crown', icon: '👑', color: '#f1c40f', category: 'Symbols', defaultRotation: 1 },
  { kind: 'mask', label: 'Mask', icon: '🎭', color: '#b94e8a', category: 'Symbols', defaultRotation: 2 },
  { kind: 'gem', label: 'Gem', icon: '💎', color: '#3ad7ff', category: 'Symbols', defaultRotation: 0, mustStack: true },

  // Science
  { kind: 'flask', label: 'Flask', icon: '⚗️', color: '#27ae60', category: 'Science', defaultRotation: 1 },
  { kind: 'microscope', label: 'Microscope', icon: '🔬', color: '#566573', category: 'Science', defaultRotation: 3 },
  { kind: 'anatomy', label: 'Anatomy Model', icon: '🫀', color: '#c0556b', category: 'Science', defaultRotation: 2 },
  { kind: 'machine', label: 'Machine', icon: '⚙️', color: '#7f8c8d', category: 'Science', defaultRotation: 0 },
  { kind: 'dna', label: 'DNA', icon: '🧬', color: '#5dade2', category: 'Science', defaultRotation: 1 },
  { kind: 'jar', label: 'Specimen Jar', icon: '🫙', color: '#8fbf9f', category: 'Science', defaultRotation: 2 },

  // Nature
  { kind: 'plant', label: 'Plant', icon: '🪴', color: '#3fa35a', category: 'Nature', defaultRotation: 3, mustStack: true },
  { kind: 'tree', label: 'Tree', icon: '🌳', color: '#2e7d32', category: 'Nature', defaultRotation: 0 },
  { kind: 'flower', label: 'Flower', icon: '🌸', color: '#e98aa8', category: 'Nature', defaultRotation: 1 },
  { kind: 'crystal', label: 'Crystal', icon: '🔮', color: '#9b6dd6', category: 'Nature', defaultRotation: 2 },

  // Architecture
  { kind: 'door', label: 'Door', icon: '🚪', color: '#6b4423', category: 'Architecture', wallAttach: true },
  { kind: 'window', label: 'Window', icon: '🪟', color: '#8fc2d6', category: 'Architecture', wallAttach: true },
  { kind: 'pillar', label: 'Pillar', icon: '🏛️', color: '#d8d3c4', category: 'Architecture', defaultRotation: 1 },
  { kind: 'fountain', label: 'Fountain', icon: '⛲', color: '#5dade2', category: 'Architecture', defaultRotation: 3 },

  // Curios
  { kind: 'painting', label: 'Painting', icon: '🖼️', color: '#b9892e', category: 'Curios', wallAttach: true },
  { kind: 'candle', label: 'Candle', icon: '🕯️', color: '#f0d27a', category: 'Curios', defaultRotation: 0 },
  { kind: 'weapon', label: 'Sword', icon: '⚔️', color: '#95a5a6', category: 'Curios', defaultRotation: 2, mustStack: true },
  { kind: 'skull', label: 'Skull', icon: '💀', color: '#ece9e0', category: 'Curios', defaultRotation: 1, mustStack: true },
  { kind: 'hourglass', label: 'Hourglass', icon: '⏳', color: '#d6a35c', category: 'Curios', defaultRotation: 3 },
  { kind: 'star', label: 'Star', icon: '⭐', color: '#f5c542', category: 'Curios', defaultRotation: 0, mustStack: true },
];

export function getObjectDef(kind: string): ObjectDef {
  return (
    OBJECT_LIBRARY.find((o) => o.kind === kind) ?? {
      kind,
      label: kind,
      icon: '⭐',
      color: '#f5c542',
      category: 'Curios',
    }
  );
}

export function isWallAttachable(kind: string): boolean {
  return !!getObjectDef(kind).wallAttach;
}

/** Surfaces (dining table, bed) that "must-stack" objects can be placed on. */
export function isSurface(kind: string): boolean {
  return !!getObjectDef(kind).surface;
}

/** Objects that may only be placed on top of a surface, never on a bare floor. */
export function mustStack(kind: string): boolean {
  return !!getObjectDef(kind).mustStack;
}

/** Screen-px lift applied to an object resting on the given surface kind. */
export function surfaceStackLift(surfaceKind: string): number {
  return getObjectDef(surfaceKind).stackLift ?? 40;
}

export function defaultObjectRotation(kind: string): number {
  return getObjectDef(kind).defaultRotation ?? 0;
}
