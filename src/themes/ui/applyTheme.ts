import type { UiThemeId } from './types';
import { DEFAULT_UI_THEME, isUiThemeId, UI_THEME_STORAGE_KEY } from './themes';

const ROOT_ATTR = 'data-ui-theme';

const BRAND_ICON_PATHS = ['/brand-icon-brutalist.png', '/brand-icon-brain.png'] as const;

export function preloadBrandIcons(): void {
  for (const path of BRAND_ICON_PATHS) {
    const img = new Image();
    img.src = path;
  }
}

export function applyUiTheme(themeId: UiThemeId): void {
  document.documentElement.setAttribute(ROOT_ATTR, themeId);
}

const LEGACY_UI_THEME_IDS: Record<string, UiThemeId> = {
  brutalism: 'brutalist',
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
  preloadBrandIcons();
  return themeId;
}
