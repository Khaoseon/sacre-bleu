/** Presentation calibration only; not a replacement for device acceptance. */
export function swipeDestination(
  index: number,
  dx: number,
  dy: number,
  width: number,
  elapsed: number,
): number | null {
  const next = index + (dx < 0 ? 1 : -1);
  const distance = Math.max(56, Math.min(96, width * 0.2));
  const flick = Math.abs(dx) >= 40 && Math.abs(dx) / Math.max(1, elapsed) > 0.55;
  return (Math.abs(dx) >= distance || flick) &&
    Math.abs(dx) > Math.abs(dy) * 1.8 &&
    next >= 0 &&
    next <= 2
    ? next
    : null;
}
