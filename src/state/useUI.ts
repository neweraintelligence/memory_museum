import { create } from 'zustand';
import type { AppMode } from '../types';

interface UIState {
  mode: AppMode;
  placingKind: string | null;
  selectedObjectId: string | null;
  searchOpen: boolean;
  setMode: (m: AppMode) => void;
  setPlacingKind: (k: string | null) => void;
  setSelected: (id: string | null) => void;
  setSearchOpen: (v: boolean) => void;
}

export const useUI = create<UIState>((set) => ({
  mode: 'build',
  placingKind: null,
  selectedObjectId: null,
  searchOpen: false,
  setMode: (mode) => set({ mode, placingKind: null }),
  setPlacingKind: (placingKind) => set({ placingKind }),
  setSelected: (selectedObjectId) => set({ selectedObjectId }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
}));
