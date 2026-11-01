/** CSS owns timing. JS reads the same tokens only at an interaction boundary. */
export function animateMotion(
  element: HTMLElement,
  keyframes: Keyframe[],
  kind: 'state' | 'reflow' | 'exit',
): Animation | null {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  if (preference.matches || document.hidden || !element.animate) return null;
  const style = getComputedStyle(element);
  const duration = parseFloat(style.getPropertyValue(`--sb-motion-${kind}`));
  if (!duration) return null;
  const animation = element.animate(keyframes, {
    duration,
    easing: style
      .getPropertyValue(kind === 'exit' ? '--sb-motion-exit-ease' : '--sb-motion-ease')
      .trim(),
    fill: kind === 'exit' ? 'forwards' : 'none',
  });
  // A live preference change/backgrounding also finishes JS presentation work.
  const finish = () => animation.finish();
  const visibility = () => {
    if (document.hidden) finish();
  };
  preference.addEventListener('change', finish);
  document.addEventListener('visibilitychange', visibility);
  void animation.finished
    .catch(() => {})
    .finally(() => {
      preference.removeEventListener('change', finish);
      document.removeEventListener('visibilitychange', visibility);
    });
  return animation;
}

/** Only explicit dismissal waits for exit; replacements and resource cleanup stay immediate. */
export function dismissModal(dialog: HTMLDialogElement | null, close: () => void) {
  if (!dialog || dialog.hasAttribute('data-closing')) return;
  const style = getComputedStyle(dialog);
  const animation = animateMotion(
    dialog,
    [
      { opacity: style.opacity, transform: style.transform },
      { opacity: 0, transform: 'translateY(12px)' },
    ],
    'exit',
  );
  if (!animation) {
    close();
    return;
  }
  dialog.dataset.closing = '';
  void animation.finished
    .then(() => {
      if (dialog.isConnected) close();
    })
    .catch(() => {})
    .finally(() => {
      animation.cancel();
      delete dialog.dataset.closing;
    });
}
