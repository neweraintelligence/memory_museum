import { create } from 'zustand';
import type { AppMode } from '../types';
import { defaultObjectRotation } from '../themes/objects';

interface UIState {
  mode: AppMode;
  placingKind: string | null;
  placingRotation: number;
  selectedObjectId: string | null;
  searchOpen: boolean;
  floorEditing: boolean;
  wallEditing: boolean;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  setMode: (m: AppMode) => void;
  setPlacingKind: (k: string | null) => void;
  setPlacingRotation: (r: number) => void;
  cyclePlacingRotation: () => void;
  setSelected: (id: string | null) => void;
  setSearchOpen: (v: boolean) => void;
  setFloorEditing: (v: boolean) => void;
  setWallEditing: (v: boolean) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
}

export const useUI = create<UIState>((set) => ({
  mode: 'build',
  placingKind: null,
  placingRotation: 0,
  selectedObjectId: null,
  searchOpen: false,
  floorEditing: false,
  wallEditing: false,
  leftPanelOpen: true,
  rightPanelOpen: true,
  setMode: (mode) => set({ mode, placingKind: null, floorEditing: false, wallEditing: false }),
  // entering placement and floor editing are mutually exclusive
  setPlacingKind: (placingKind) =>
    set({
      placingKind,
      placingRotation: placingKind ? defaultObjectRotation(placingKind) : 0,
      floorEditing: false,
      wallEditing: false,
    }),
  setPlacingRotation: (placingRotation) => set({ placingRotation }),
  cyclePlacingRotation: () =>
    set((s) => ({ placingRotation: (s.placingRotation + 1) % 4 })),
  setSelected: (selectedObjectId) => set({ selectedObjectId }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setFloorEditing: (floorEditing) =>
    set(floorEditing ? { floorEditing, wallEditing: false, placingKind: null, selectedObjectId: null } : { floorEditing }),
  setWallEditing: (wallEditing) =>
    set(wallEditing ? { wallEditing, floorEditing: false, placingKind: null, selectedObjectId: null } : { wallEditing }),
  toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
}));
