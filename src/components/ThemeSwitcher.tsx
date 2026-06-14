import { useTheme } from '../state/useTheme';
import { UI_THEMES } from '../themes/ui/themes';
import type { UiThemeId } from '../themes/ui/types';

export default function ThemeSwitcher() {
  const themeId = useTheme((s) => s.themeId);
  const setTheme = useTheme((s) => s.setTheme);
  const current = UI_THEMES.find((theme) => theme.id === themeId);

  return (
    <label className="theme-switcher" title={current?.description}>
      <span className="theme-switcher-label">Theme</span>
      <select
        className="theme-switcher-select"
        value={themeId}
        onChange={(e) => setTheme(e.target.value as UiThemeId)}
        aria-label="UI theme"
      >
        {UI_THEMES.map((theme) => (
          <option key={theme.id} value={theme.id}>
            {theme.label}
          </option>
        ))}
      </select>
    </label>
  );
}
