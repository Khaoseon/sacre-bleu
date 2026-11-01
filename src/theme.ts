import { useEffect, useState } from 'react';

export const THEMES = [
  ['light', 'Sauge clair'],
  ['maison', 'Maison Sacré bleu'],
  ['maison-night', 'Maison Nuit'],
] as const;
export type ThemePreference = (typeof THEMES)[number][0];
export function isTheme(value: unknown): value is ThemePreference {
  return THEMES.some(([theme]) => theme === value);
}
export const THEME_KEY = 'app-reserve.theme.v1';
export const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)';
/** Legacy values are read only. All selections store explicit appearances. */
export function migrateTheme(saved: unknown, systemDark: boolean): ThemePreference {
  if (isTheme(saved)) return saved;
  if (saved === 'dark' || saved === 'retro-petrol') return 'maison-night';
  if (saved === 'auto') return systemDark ? 'maison-night' : 'light';
  return 'light';
}
export function readThemePreference(): ThemePreference {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch {
    const early = document.documentElement.dataset.theme;
    return isTheme(early) ? early : 'light';
  }
  if (isTheme(saved)) return saved;
  const next = migrateTheme(saved, matchMedia(SYSTEM_THEME_QUERY).matches);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    const early = document.documentElement.dataset.theme;
    // Automatic is frozen by the head script even if storage cannot be written.
    if (saved === 'auto' && isTheme(early)) return early;
  }
  return next;
}
export function applyTheme(preference: ThemePreference) {
  const root = document.documentElement;
  root.dataset.theme = preference;
  root.style.colorScheme = preference === 'maison-night' ? 'dark' : 'light';
  const color = getComputedStyle(root).getPropertyValue('--canvas').trim();
  if (color) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
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
    const sync = (event: StorageEvent) => {
      if (event.key !== THEME_KEY && event.key !== null) return;
      const saved = readThemePreference();
      applyTheme(saved);
      setPreference(saved);
      setError('');
    };
    window.addEventListener('storage', sync);
    return () => {
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
