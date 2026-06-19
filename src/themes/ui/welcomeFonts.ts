import type { UiThemeId } from './types';

export type WelcomeTitleFontSpec = {
  family: string;
  weight: number;
};

/** Title-page title fonts only — not used by in-app chrome or dashboards. */
export const WELCOME_TITLE_FONTS: Record<UiThemeId, WelcomeTitleFontSpec> = {
  utilitarian: { family: 'Manrope', weight: 800 },
  clairvoyant: { family: 'Urbanist', weight: 300 },
  bookworm: { family: 'Cinzel', weight: 550 },
  blueprint: { family: 'PW Scratched', weight: 400 },
};

export function getWelcomeFontLoadSpec(themeId: UiThemeId): string {
  const { family, weight } = WELCOME_TITLE_FONTS[themeId];
  return `${weight} 1em '${family}'`;
}

export function isWelcomeFontReady(themeId: UiThemeId): boolean {
  if (!document.fonts?.check) return true;
  return document.fonts.check(getWelcomeFontLoadSpec(themeId));
}

export function preloadWelcomeFont(themeId: UiThemeId): Promise<FontFace[]> {
  if (!document.fonts?.load) return Promise.resolve([]);
  return document.fonts.load(getWelcomeFontLoadSpec(themeId));
}

export function preloadWelcomeFonts(): void {
  for (const themeId of Object.keys(WELCOME_TITLE_FONTS) as UiThemeId[]) {
    void preloadWelcomeFont(themeId);
  }
}
