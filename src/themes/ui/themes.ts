import type { UiTheme, UiThemeId } from './types';

export const UI_THEMES: UiTheme[] = [
  {
    id: 'utilitarian',
    label: 'Utilitarian',
    description: 'Raw cast concrete, warm rust accents, editorial serif titles.',
    defaultWallpaperEnabled: true,
  },
  {
    id: 'clarity',
    label: 'Clarity',
    description: 'Sage site-office glass UI — minimal chrome, museum-first.',
    defaultWallpaperEnabled: false,
  },
  {
    id: 'bookworm',
    label: 'Bookworm',
    description: 'Dark chocolate & cream, old-world serif elegance, burgundy accents.',
    defaultWallpaperEnabled: true,
  },
];

export const DEFAULT_UI_THEME: UiThemeId = 'utilitarian';

export const UI_THEME_STORAGE_KEY = 'memory-museum-ui-theme';
export const UI_WALLPAPER_STORAGE_KEY = 'memory-museum-ui-wallpaper';

export function isUiThemeId(value: string | null | undefined): value is UiThemeId {
  return UI_THEMES.some((theme) => theme.id === value);
}

export function getUiTheme(id: UiThemeId): UiTheme {
  return UI_THEMES.find((theme) => theme.id === id) ?? UI_THEMES[0];
}

export function getDefaultWallpaperEnabled(themeId: UiThemeId): boolean {
  return getUiTheme(themeId).defaultWallpaperEnabled;
}
