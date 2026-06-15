export type UiThemeId = 'brutalist' | 'project-manager' | 'dusty-library';

export interface UiTheme {
  id: UiThemeId;
  label: string;
  description: string;
}
