import { useTheme } from '../state/useTheme';
import { UI_THEMES } from '../themes/ui/themes';
import type { UiThemeId } from '../themes/ui/types';
import ThemedSelect from './ThemedSelect';

export default function ThemeSwitcher() {
  const themeId = useTheme((s) => s.themeId);
  const setTheme = useTheme((s) => s.setTheme);
  const current = UI_THEMES.find((theme) => theme.id === themeId);

  return (
    <label className="theme-switcher" title={current?.description}>
      <span className="theme-switcher-label">Theme</span>
      <ThemedSelect
        className="theme-switcher-select"
        value={themeId}
        onChange={(value) => setTheme(value as UiThemeId)}
        aria-label="UI theme"
        options={UI_THEMES.map((theme) => ({ value: theme.id, label: theme.label }))}
      />
    </label>
  );
}
