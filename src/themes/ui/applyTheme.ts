import type { UiThemeId } from './types';
import {
  DEFAULT_UI_THEME,
  getDefaultWallpaperEnabled,
  isUiThemeId,
  UI_THEME_STORAGE_KEY,
  UI_WALLPAPER_STORAGE_KEY,
} from './themes';

const ROOT_ATTR = 'data-ui-theme';
const WALLPAPER_ATTR = 'data-wallpaper';

type WallpaperPrefs = Partial<Record<UiThemeId, boolean>>;

const BRAND_ICON_PATHS = [
  '/brand-icon-utilitarian.png',
  '/brand-icon-brain.png',
  '/brand-icon-blueprint.png',
] as const;

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
  const fallback = getDefaultWallpaperEnabled(themeId);
  try {
    const stored = localStorage.getItem(UI_WALLPAPER_STORAGE_KEY);
    if (!stored) return fallback;
    const prefs = JSON.parse(stored) as Record<string, boolean>;
    if (themeId in prefs) return prefs[themeId] ?? fallback;
    const legacyKey = LEGACY_WALLPAPER_KEYS[themeId];
    if (legacyKey && legacyKey in prefs) return prefs[legacyKey] ?? fallback;
    return fallback;
  } catch {
    return fallback;
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
  brutalism: 'utilitarian',
  brutalist: 'utilitarian',
  'brutal-95': 'utilitarian',
  'project-manager': 'clairvoyant',
  clarity: 'clairvoyant',
  'dusty-library': 'bookworm',
};

const LEGACY_WALLPAPER_KEYS: Partial<Record<UiThemeId, string>> = {
  utilitarian: 'brutal-95',
  clairvoyant: 'project-manager',
  bookworm: 'dusty-library',
};

export function readStoredUiTheme(): UiThemeId {
  try {
    const stored = localStorage.getItem(UI_THEME_STORAGE_KEY);
    if (stored && stored in LEGACY_UI_THEME_IDS) {
      const themeId = LEGACY_UI_THEME_IDS[stored];
      storeUiTheme(themeId);
      return themeId;
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
