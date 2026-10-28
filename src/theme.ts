import { useEffect, useState } from 'react';

export const THEMES = [
  ['auto', 'Automatique'],
  ['light', 'Sauge claire'],
  ['dark', 'Sauge sombre'],
  ['slate', 'Ardoise'],
  ['retro-cream', 'Rétro crème'],
  ['retro-petrol', 'Rétro pétrole'],
] as const;
export type ThemePreference = (typeof THEMES)[number][0];
export function isTheme(value: unknown): value is ThemePreference {
  return THEMES.some(([theme]) => theme === value);
}
export const THEME_KEY = 'app-reserve.theme.v1';
export const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)';
export function readThemePreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return isTheme(saved) ? saved : 'auto';
  } catch {
    return 'auto';
  }
}
export function resolveTheme(
  preference: ThemePreference,
  systemDark: boolean,
): Exclude<ThemePreference, 'auto'> {
  return preference === 'auto' ? (systemDark ? 'dark' : 'light') : preference;
}
export function applyTheme(preference: ThemePreference) {
  const root = document.documentElement;
  const theme = resolveTheme(preference, matchMedia(SYSTEM_THEME_QUERY).matches);
  root.dataset.theme = theme;
  root.style.colorScheme = theme === 'dark' || theme === 'retro-petrol' ? 'dark' : 'light';
  const color = getComputedStyle(root).getPropertyValue('--canvas').trim();
  if (color) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
}
export function watchSystemTheme(preference: ThemePreference, listener: () => void) {
  const media = matchMedia(SYSTEM_THEME_QUERY);
  const update = () => {
    if (preference === 'auto') listener();
  };
  media.addEventListener('change', update);
  return () => media.removeEventListener('change', update);
}
export function saveThemePreference(preference: ThemePreference) {
  localStorage.setItem(THEME_KEY, preference);
  applyTheme(preference);
}
export function useThemePreference() {
  const [preference, setPreference] = useState(readThemePreference);
  const [error, setError] = useState('');
  useEffect(() => {
    applyTheme(preference);
    const stop = watchSystemTheme(preference, () => applyTheme(preference));
    const sync = (event: StorageEvent) => {
      if (event.key !== THEME_KEY && event.key !== null) return;
      const saved = readThemePreference();
      applyTheme(saved);
      setPreference(saved);
      setError('');
    };
    window.addEventListener('storage', sync);
    return () => {
      stop();
      window.removeEventListener('storage', sync);
    };
  }, [preference]);
  function chooseTheme(next: ThemePreference) {
    try {
      saveThemePreference(next);
      setPreference(next);
      setError('');
    } catch {
      setError(
        'Impossible de mémoriser le thème dans ce navigateur. La préférence n’a pas été modifiée.',
      );
    }
  }
  return { preference, chooseTheme, error };
}
