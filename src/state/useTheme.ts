import { create } from 'zustand';
import { applyUiTheme, readStoredUiTheme, storeUiTheme } from '../themes/ui/applyTheme';
import type { UiThemeId } from '../themes/ui/types';

interface ThemeState {
  themeId: UiThemeId;
  setTheme: (themeId: UiThemeId) => void;
}

export const useTheme = create<ThemeState>((set) => ({
  themeId: readStoredUiTheme(),
  setTheme: (themeId) => {
    applyUiTheme(themeId);
    storeUiTheme(themeId);
    set({ themeId });
  },
}));
