import type { UiTheme, UiThemeId } from './types';

export const UI_THEMES: UiTheme[] = [
  {
    id: 'brutalist',
    label: 'Brutalist',
    description: 'Raw cast concrete, warm rust accents, editorial serif titles.',
  },
  {
    id: 'project-manager',
    label: 'Project Manager',
    description: 'Sage site-office glass UI — minimal chrome, palace-first.',
  },
];

export const DEFAULT_UI_THEME: UiThemeId = 'brutalist';

export const UI_THEME_STORAGE_KEY = 'memory-palace-ui-theme';

export function isUiThemeId(value: string | null | undefined): value is UiThemeId {
  return UI_THEMES.some((theme) => theme.id === value);
}

export function getUiTheme(id: UiThemeId): UiTheme {
  return UI_THEMES.find((theme) => theme.id === id) ?? UI_THEMES[0];
}
