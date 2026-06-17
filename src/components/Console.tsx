import { useState } from 'react';
import { useTheme } from '../state/useTheme';
import type { UiThemeId } from '../themes/ui/types';

/* ── command registry (string → handler) ─────────────────────────── */
type Ctx = {
  setTheme: (id: UiThemeId) => void;
  toggleWallpaper: () => void;
  wallpaperEnabled: boolean;
};

function buildRegistry(ctx: Ctx): Map<string, () => void> {
  const m = new Map<string, () => void>();

  // theme <name>
  m.set('theme utilitarian', () => ctx.setTheme('utilitarian'));
  m.set('theme clairvoyant', () => ctx.setTheme('clairvoyant'));
  m.set('theme bookworm',    () => ctx.setTheme('bookworm'));

  // wallpaper on/off
  m.set('wallpaper on',  () => { if (!ctx.wallpaperEnabled) ctx.toggleWallpaper(); });
  m.set('wallpaper off', () => { if (ctx.wallpaperEnabled)  ctx.toggleWallpaper(); });

  // dev mode
  m.set('dev on',  () => localStorage.setItem('mm-dev', '1'));
  m.set('dev off', () => localStorage.removeItem('mm-dev'));

  return m;
}

/* ── component ──────────────────────────────────────────────────── */
export function Console() {
  const [value, setValue] = useState('');
  const [flash, setFlash] = useState<'ok' | 'err' | null>(null);

  const setTheme = useTheme((s) => s.setTheme);
  const toggleWallpaper = useTheme((s) => s.toggleWallpaper);
  const wallpaperEnabled = useTheme((s) => s.wallpaperEnabled);

  const exec = (cmd: string) => {
    const registry = buildRegistry({ setTheme, toggleWallpaper, wallpaperEnabled });
    const handler = registry.get(cmd.trim().toLowerCase());
    if (handler) {
      handler();
      setFlash('ok');
    } else {
      setFlash('err');
    }
    setValue('');
    setTimeout(() => setFlash(null), 600);
  };

  return (
    <input
      className={`console-input${flash ? ` console-${flash}` : ''}`}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && value.trim()) exec(value);
      }}
      placeholder=">"
      spellCheck={false}
      autoComplete="off"
    />
  );
}
