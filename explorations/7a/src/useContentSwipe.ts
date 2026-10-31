import { useEffect, useLayoutEffect, useRef } from 'react';
import { swipeDestination } from './gesture';

// Local exploration only. Keep V1's hook untouched; device calibration follows review.
export function useContentSwipe(
  index: number,
  navigate: (index: number) => void,
  blocked: boolean,
) {
  const ref = useRef<HTMLElement>(null);
  const latest = useRef({ index, navigate, blocked });
  latest.current = { index, navigate, blocked };
  const trackRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const track = trackRef.current!;
    track.classList.remove('dragging');
    track.style.transform = `translate3d(${-index * 100}%,0,0)`;
  }, [index]);
  const suppressUntil = useRef(0);
  useEffect(() => {
    const root = ref.current!;
    let g: {
      id: number;
      x: number;
      y: number;
      width: number;
      index: number;
      locked: boolean;
      time: number;
    } | null = null;
    let frame = 0,
      offset = 0;
    const paint = () => {
      frame = 0;
      const track = trackRef.current;
      if (track)
        track.style.transform = `translate3d(calc(${-latest.current.index * 100}% + ${offset}px),0,0)`;
    };
    const reset = () => {
      g = null;
      cancelAnimationFrame(frame);
      frame = 0;
      offset = 0;
      const track = trackRef.current;
      if (track) {
        track.classList.remove('dragging');
        track.style.transform = `translate3d(${-latest.current.index * 100}%,0,0)`;
      }
    };
    const unavailable = () => latest.current.blocked || !!document.querySelector('dialog[open]');
    const start = (e: TouchEvent) => {
      suppressUntil.current = 0;
      reset();
      if (unavailable() || e.touches.length !== 1 || e.defaultPrevented) return;
      const target = e.target instanceof Element ? e.target : null;
      if (
        !target ||
        target.closest('[data-no-swipe],input,select,textarea,label,summary,[contenteditable]')
      )
        return;
      if (
        target.closest('button,a,[role="button"],[role="slider"]') &&
        !target.closest('[data-swipe-surface]')
      )
        return;
      const t = e.touches[0];
      if (t.clientX < 24 || t.clientX > innerWidth - 24) return;
      g = {
        id: t.identifier,
        x: t.clientX,
        y: t.clientY,
        width: root.clientWidth,
        index: latest.current.index,
        locked: false,
        time: e.timeStamp,
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
      const t = e.touches[0],
        dx = t.clientX - g.x,
        dy = Math.abs(t.clientY - g.y);
      if (t.identifier !== g.id || (!g.locked && dy > 10 && dy >= Math.abs(dx))) return reset();
      if (!g.locked && Math.abs(dx) > 12 && Math.abs(dx) > dy * 1.8) {
        g.locked = true;
        trackRef.current?.classList.add('dragging');
      }
      if (!g.locked) return;
      if (!e.cancelable) return reset();
      e.preventDefault();
      suppressUntil.current = performance.now() + 450;
      const next = g.index + (dx < 0 ? 1 : -1);
      offset = Math.max(-g.width, Math.min(g.width, dx * (next < 0 || next > 2 ? 0.18 : 1)));
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const end = (e: TouchEvent) => {
      const done = g;
      reset();
      if (
        !done ||
        !done.locked ||
        unavailable() ||
        e.touches.length ||
        latest.current.index !== done.index
      )
        return;
      const t = Array.from(e.changedTouches).find((t) => t.identifier === done.id);
      if (!t || root.clientWidth !== done.width) return;
      const dx = t.clientX - done.x,
        dy = Math.abs(t.clientY - done.y);
      const next = swipeDestination(done.index, dx, dy, done.width, e.timeStamp - done.time);
      if (next !== null) latest.current.navigate(next);
    };
    root.addEventListener('touchstart', start, { passive: true });
    root.addEventListener('touchmove', move, { passive: false });
    root.addEventListener('touchend', end, { passive: true });
    root.addEventListener('touchcancel', reset);
    window.addEventListener('blur', reset);
    window.addEventListener('resize', reset);
    document.addEventListener('visibilitychange', reset);
    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener('touchstart', start);
      root.removeEventListener('touchmove', move);
      root.removeEventListener('touchend', end);
      root.removeEventListener('touchcancel', reset);
      window.removeEventListener('blur', reset);
      window.removeEventListener('resize', reset);
      document.removeEventListener('visibilitychange', reset);
    };
  }, []);
  return { ref, trackRef, suppressClick: () => performance.now() < suppressUntil.current };
}
