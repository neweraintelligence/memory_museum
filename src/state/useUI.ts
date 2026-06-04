import { create } from 'zustand';
import type { AppMode } from '../types';

interface UIState {
  mode: AppMode;
  placingKind: string | null;
  selectedObjectId: string | null;
  searchOpen: boolean;
  floorEditing: boolean;
  setMode: (m: AppMode) => void;
  setPlacingKind: (k: string | null) => void;
  setSelected: (id: string | null) => void;
  setSearchOpen: (v: boolean) => void;
  setFloorEditing: (v: boolean) => void;
}

export const useUI = create<UIState>((set) => ({
  mode: 'build',
  placingKind: null,
  selectedObjectId: null,
  searchOpen: false,
  floorEditing: false,
  setMode: (mode) => set({ mode, placingKind: null, floorEditing: false }),
  // entering placement and floor editing are mutually exclusive
  setPlacingKind: (placingKind) => set({ placingKind, floorEditing: false }),
  setSelected: (selectedObjectId) => set({ selectedObjectId }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setFloorEditing: (floorEditing) =>
    set(floorEditing ? { floorEditing, placingKind: null, selectedObjectId: null } : { floorEditing }),
}));
