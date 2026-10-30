import { useEffect, useRef, useState } from 'react';

// Exploration calibration, covered at 320/375/430 px. Device acceptance remains 7B work.
export function useContentSwipe(
  index: number,
  navigate: (index: number) => void,
  blocked: boolean,
) {
  const ref = useRef<HTMLElement>(null);
  const latest = useRef({ index, navigate, blocked });
  latest.current = { index, navigate, blocked };
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const root = ref.current!;
    let g: {
      id: number;
      x: number;
      y: number;
      width: number;
      index: number;
      dx: number;
      locked: boolean;
    } | null = null;
    const reset = () => {
      g = null;
      setOffset(0);
    };
    const unavailable = () => latest.current.blocked || !!document.querySelector('dialog[open]');
    const start = (e: TouchEvent) => {
      reset();
      if (unavailable() || e.touches.length !== 1 || e.defaultPrevented) return;
      const target = e.target instanceof Element ? e.target : null;
      if (
        !target ||
        target.closest(
          'button,input,select,textarea,a,label,summary,[data-no-swipe],[contenteditable]',
        )
      )
        return;
      const touch = e.touches[0];
      // Leave system-owned edges alone. The rest of the content is available.
      if (touch.clientX < 24 || touch.clientX > innerWidth - 24) return;
      g = {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        width: root.clientWidth,
        index: latest.current.index,
        dx: 0,
        locked: false,
      };
    };
    const move = (e: TouchEvent) => {
      if (!g) return;
      if (
        unavailable() ||
        e.touches.length !== 1 ||
        latest.current.index !== g.index ||
        root.clientWidth !== g.width
      )
        return reset();
      const touch = e.touches[0];
      const dx = touch.clientX - g.x,
        dy = Math.abs(touch.clientY - g.y);
      if (touch.identifier !== g.id || (!g.locked && dy > 10 && dy >= Math.abs(dx))) return reset();
      if (!g.locked && Math.abs(dx) > 12 && Math.abs(dx) > dy * 1.8) g.locked = true;
      if (!g.locked) return;
      if (!e.cancelable) return reset();
      e.preventDefault();
      g.dx = dx;
      const next = g.index + (dx < 0 ? 1 : -1);
      setOffset(
        Math.max(
          -g.width * 0.3,
          Math.min(g.width * 0.3, dx * (next < 0 || next > 2 ? 0.12 : 0.48)),
        ),
      );
    };
    const end = (e: TouchEvent) => {
      const finished = g;
      reset();
      if (
        !finished ||
        !finished.locked ||
        unavailable() ||
        e.touches.length ||
        latest.current.index !== finished.index
      )
        return;
      const touch = Array.from(e.changedTouches).find((t) => t.identifier === finished.id);
      if (!touch || root.clientWidth !== finished.width) return;
      const dx = touch.clientX - finished.x;
      const threshold = Math.max(56, Math.min(96, finished.width * 0.2));
      const next = finished.index + (dx < 0 ? 1 : -1);
      if (
        Math.abs(dx) >= threshold &&
        Math.abs(dx) > Math.abs(touch.clientY - finished.y) * 1.8 &&
        next >= 0 &&
        next <= 2
      )
        latest.current.navigate(next);
    };
    root.addEventListener('touchstart', start, { passive: true });
    root.addEventListener('touchmove', move, { passive: false });
    root.addEventListener('touchend', end, { passive: true });
    root.addEventListener('touchcancel', reset);
    window.addEventListener('blur', reset);
    window.addEventListener('resize', reset);
    document.addEventListener('visibilitychange', reset);
    return () => {
      root.removeEventListener('touchstart', start);
      root.removeEventListener('touchmove', move);
      root.removeEventListener('touchend', end);
      root.removeEventListener('touchcancel', reset);
      window.removeEventListener('blur', reset);
      window.removeEventListener('resize', reset);
      document.removeEventListener('visibilitychange', reset);
    };
  }, []);
  return { ref, offset };
}
