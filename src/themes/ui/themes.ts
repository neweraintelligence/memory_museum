import type { UiTheme, UiThemeId } from './types';

export const UI_THEMES: UiTheme[] = [
  {
    id: 'brutal-95',
    label: 'Brutal 95',
    description: 'Raw cast concrete, warm rust accents, editorial serif titles.',
  },
  {
    id: 'project-manager',
    label: 'Project Manager',
    description: 'Sage site-office glass UI — minimal chrome, museum-first.',
  },
  {
    id: 'dusty-library',
    label: 'Dusty Library',
    description: 'Dark chocolate & cream, old-world serif elegance, burgundy accents.',
  },
];

export const DEFAULT_UI_THEME: UiThemeId = 'brutal-95';

export const UI_THEME_STORAGE_KEY = 'memory-museum-ui-theme';
export const UI_WALLPAPER_STORAGE_KEY = 'memory-museum-ui-wallpaper';

export function isUiThemeId(value: string | null | undefined): value is UiThemeId {
  return UI_THEMES.some((theme) => theme.id === value);
}

export function getUiTheme(id: UiThemeId): UiTheme {
  return UI_THEMES.find((theme) => theme.id === id) ?? UI_THEMES[0];
}
