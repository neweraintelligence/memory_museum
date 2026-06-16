import type { UiThemeId } from './types';
import {
  DEFAULT_UI_THEME,
  isUiThemeId,
  UI_THEME_STORAGE_KEY,
  UI_WALLPAPER_STORAGE_KEY,
} from './themes';

const ROOT_ATTR = 'data-ui-theme';
const WALLPAPER_ATTR = 'data-wallpaper';

type WallpaperPrefs = Partial<Record<UiThemeId, boolean>>;

const BRAND_ICON_PATHS = ['/brand-icon-brutal-95.png', '/brand-icon-brain.png'] as const;

export function preloadBrandIcons(): void {
  for (const path of BRAND_ICON_PATHS) {
    const img = new Image();
    img.src = path;
  }
}

export function applyUiTheme(themeId: UiThemeId): void {
  document.documentElement.setAttribute(ROOT_ATTR, themeId);
}

export function readWallpaperEnabled(themeId: UiThemeId): boolean {
  try {
    const stored = localStorage.getItem(UI_WALLPAPER_STORAGE_KEY);
    if (!stored) return true;
    const prefs = JSON.parse(stored) as WallpaperPrefs;
    return prefs[themeId] ?? true;
  } catch {
    return true;
  }
}

export function storeWallpaperEnabled(themeId: UiThemeId, enabled: boolean): void {
  try {
    const stored = localStorage.getItem(UI_WALLPAPER_STORAGE_KEY);
    const prefs: WallpaperPrefs = stored ? (JSON.parse(stored) as WallpaperPrefs) : {};
    prefs[themeId] = enabled;
    localStorage.setItem(UI_WALLPAPER_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota / private browsing failures
  }
}

export function applyWallpaper(enabled: boolean): void {
  document.documentElement.setAttribute(WALLPAPER_ATTR, enabled ? 'on' : 'off');
}

const LEGACY_UI_THEME_IDS: Record<string, UiThemeId> = {
  brutalism: 'brutal-95',
  brutalist: 'brutal-95',
};

export function readStoredUiTheme(): UiThemeId {
  try {
    const stored = localStorage.getItem(UI_THEME_STORAGE_KEY);
    if (stored && stored in LEGACY_UI_THEME_IDS) {
      return LEGACY_UI_THEME_IDS[stored];
    }
    return isUiThemeId(stored) ? stored : DEFAULT_UI_THEME;
  } catch {
    return DEFAULT_UI_THEME;
  }
}

export function storeUiTheme(themeId: UiThemeId): void {
  try {
    localStorage.setItem(UI_THEME_STORAGE_KEY, themeId);
  } catch {
    // ignore quota / private browsing failures
  }
}

/** Apply persisted theme before first paint to avoid a flash. */
export function bootstrapUiTheme(): UiThemeId {
  const themeId = readStoredUiTheme();
  applyUiTheme(themeId);
  applyWallpaper(readWallpaperEnabled(themeId));
  preloadBrandIcons();
  return themeId;
}
