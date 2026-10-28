// Blocking head script: apply the preference before the app's first paint.
(() => {
  let preference = 'auto';
  try {
    const saved = localStorage.getItem('app-reserve.theme.v1');
    if (['auto', 'light', 'dark', 'slate', 'retro-cream', 'retro-petrol'].includes(saved))
      preference = saved;
  } catch {
    // The system theme remains available even if browser storage is blocked.
  }
  const theme =
    preference === 'auto'
      ? matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : preference;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme =
    theme === 'dark' || theme === 'retro-petrol' ? 'dark' : 'light';
})();
