export type UiThemeId = 'utilitarian' | 'clairvoyant' | 'bookworm';

export interface UiTheme {
  id: UiThemeId;
  label: string;
  description: string;
  /** Wallpaper on when the user has not saved a preference for this theme. */
  defaultWallpaperEnabled: boolean;
}
