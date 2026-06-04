export interface ObjectDef {
  kind: string;
  label: string;
  icon: string;
  color: string;
  category: string;
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
  { kind: 'desk', label: 'Desk', icon: '🪑', color: '#8a5a2b', category: 'Furniture' },
  { kind: 'cabinet', label: 'Cabinet', icon: '🗄️', color: '#6b4423', category: 'Furniture' },
  { kind: 'bed', label: 'Bed', icon: '🛏️', color: '#9d6b9d', category: 'Furniture' },
  { kind: 'lamp', label: 'Lamp', icon: '💡', color: '#f3c969', category: 'Furniture' },
  { kind: 'mirror', label: 'Mirror', icon: '🪞', color: '#9fc7d6', category: 'Furniture' },
  { kind: 'chest', label: 'Chest', icon: '🧰', color: '#7a5230', category: 'Furniture' },

  // Knowledge
  { kind: 'book', label: 'Book', icon: '📕', color: '#c0392b', category: 'Knowledge' },
  { kind: 'books', label: 'Bookstack', icon: '📚', color: '#2e7d57', category: 'Knowledge' },
  { kind: 'scroll', label: 'Scroll', icon: '📜', color: '#d8c08a', category: 'Knowledge' },
  { kind: 'document', label: 'Document', icon: '📄', color: '#e8e8e8', category: 'Knowledge' },
  { kind: 'map', label: 'Map', icon: '🗺️', color: '#caa86a', category: 'Knowledge' },
  { kind: 'clock', label: 'Clock', icon: '🕰️', color: '#b08d57', category: 'Knowledge' },

  // Symbols
  { kind: 'statue', label: 'Statue', icon: '🗿', color: '#b7b7a8', category: 'Symbols' },
  { kind: 'gold-statue', label: 'Golden Statue', icon: '🏆', color: '#e2b53c', category: 'Symbols' },
  { kind: 'key', label: 'Key', icon: '🗝️', color: '#d4af37', category: 'Symbols' },
  { kind: 'crown', label: 'Crown', icon: '👑', color: '#f1c40f', category: 'Symbols' },
  { kind: 'mask', label: 'Mask', icon: '🎭', color: '#b94e8a', category: 'Symbols' },
  { kind: 'gem', label: 'Gem', icon: '💎', color: '#3ad7ff', category: 'Symbols' },

  // Science
  { kind: 'flask', label: 'Flask', icon: '⚗️', color: '#27ae60', category: 'Science' },
  { kind: 'microscope', label: 'Microscope', icon: '🔬', color: '#566573', category: 'Science' },
  { kind: 'anatomy', label: 'Anatomy Model', icon: '🫀', color: '#c0556b', category: 'Science' },
  { kind: 'machine', label: 'Machine', icon: '⚙️', color: '#7f8c8d', category: 'Science' },
  { kind: 'dna', label: 'DNA', icon: '🧬', color: '#5dade2', category: 'Science' },
  { kind: 'jar', label: 'Specimen Jar', icon: '🫙', color: '#8fbf9f', category: 'Science' },

  // Nature
  { kind: 'plant', label: 'Plant', icon: '🪴', color: '#3fa35a', category: 'Nature' },
  { kind: 'tree', label: 'Tree', icon: '🌳', color: '#2e7d32', category: 'Nature' },
  { kind: 'flower', label: 'Flower', icon: '🌸', color: '#e98aa8', category: 'Nature' },
  { kind: 'crystal', label: 'Crystal', icon: '🔮', color: '#9b6dd6', category: 'Nature' },

  // Architecture
  { kind: 'door', label: 'Door', icon: '🚪', color: '#6b4423', category: 'Architecture' },
  { kind: 'window', label: 'Window', icon: '🪟', color: '#8fc2d6', category: 'Architecture' },
  { kind: 'pillar', label: 'Pillar', icon: '🏛️', color: '#d8d3c4', category: 'Architecture' },
  { kind: 'fountain', label: 'Fountain', icon: '⛲', color: '#5dade2', category: 'Architecture' },

  // Curios
  { kind: 'painting', label: 'Painting', icon: '🖼️', color: '#b9892e', category: 'Curios' },
  { kind: 'candle', label: 'Candle', icon: '🕯️', color: '#f0d27a', category: 'Curios' },
  { kind: 'weapon', label: 'Sword', icon: '⚔️', color: '#95a5a6', category: 'Curios' },
  { kind: 'skull', label: 'Skull', icon: '💀', color: '#ece9e0', category: 'Curios' },
  { kind: 'hourglass', label: 'Hourglass', icon: '⏳', color: '#d6a35c', category: 'Curios' },
  { kind: 'star', label: 'Star', icon: '⭐', color: '#f5c542', category: 'Curios' },
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
