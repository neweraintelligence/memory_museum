import { create } from 'zustand';
import {
  applyUiTheme,
  applyWallpaper,
  readStoredUiTheme,
  readWallpaperEnabled,
  storeUiTheme,
  storeWallpaperEnabled,
} from '../themes/ui/applyTheme';
import type { UiThemeId } from '../themes/ui/types';

interface ThemeState {
  themeId: UiThemeId;
  wallpaperEnabled: boolean;
  setTheme: (themeId: UiThemeId) => void;
  toggleWallpaper: () => void;
}

const initialThemeId = readStoredUiTheme();

export const useTheme = create<ThemeState>((set, get) => ({
  themeId: initialThemeId,
  wallpaperEnabled: readWallpaperEnabled(initialThemeId),
  setTheme: (themeId) => {
    applyUiTheme(themeId);
    storeUiTheme(themeId);
    const wallpaperEnabled = readWallpaperEnabled(themeId);
    applyWallpaper(wallpaperEnabled);
    set({ themeId, wallpaperEnabled });
  },
  toggleWallpaper: () => {
    const { themeId, wallpaperEnabled } = get();
    const next = !wallpaperEnabled;
    applyWallpaper(next);
    storeWallpaperEnabled(themeId, next);
    set({ wallpaperEnabled: next });
  },
}));
