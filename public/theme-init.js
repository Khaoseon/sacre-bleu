// Blocking head script: migrate once before the first paint.
// Keep this standalone resolver aligned with migrateTheme (parity tested).
(() => {
  const key = 'app-reserve.theme.v1';
  let saved = null;
  try {
    saved = localStorage.getItem(key);
  } catch {
    /* Storage is optional. */
  }
  const theme = ['light', 'maison', 'maison-night'].includes(saved)
    ? saved
    : saved === 'dark' ||
        saved === 'retro-petrol' ||
        (saved === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches)
      ? 'maison-night'
      : 'light';
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === 'maison-night' ? 'dark' : 'light';
  try {
    if (saved !== theme) localStorage.setItem(key, theme);
  } catch {
    /* React reuses the DOM choice if persistence fails. */
  }
})();
