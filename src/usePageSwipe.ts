import { useEffect, useLayoutEffect, useRef } from 'react';
import { swipeDestination } from './ui/swipe';
const pages = ['stock', 'scanner', 'shopping'] as const;
export type Page = (typeof pages)[number];

// Paint gestures outside React; each pane retains its scroll and drafts.
export function usePageSwipe(page: Page, navigate: (page: Page) => void, blocked: boolean) {
  const index = pages.indexOf(page);
  const ref = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const latest = useRef({ index, navigate, blocked });
  latest.current = { index, navigate, blocked };
  const cancelGesture = useRef<(() => void) | null>(null);
  const suppressUntil = useRef(0);
  useLayoutEffect(() => {
    cancelGesture.current?.();
    const track = trackRef.current!;
    track.classList.remove('dragging');
    track.style.transform = `translate3d(${-index * 100}%,0,0)`;
  }, [index, blocked]);
  useEffect(() => {
    const root = ref.current!;
    const track = trackRef.current!;
    const mobile = matchMedia('(max-width: 760px)');
    let gesture: {
      id: number;
      x: number;
      y: number;
      width: number;
      index: number;
      origin: number;
      locked: boolean;
      time: number;
    } | null = null;
    let frame = 0;
    let position = 0;
    const clear = () => {
      gesture = null;
      cancelAnimationFrame(frame);
      frame = 0;
    };
    cancelGesture.current = clear;
    const paint = () => {
      frame = 0;
      track.style.transform = `translate3d(${position}px,0,0)`;
    };
    const settle = () => {
      clear();
      track.classList.remove('dragging');
      track.style.transform = `translate3d(${-latest.current.index * 100}%,0,0)`;
    };
    const interrupt = () => {
      if (gesture?.locked) suppressUntil.current = performance.now() + 450;
      clear();
      // Resize/background are discontinuities, not another navigation animation.
      track.classList.add('dragging');
      track.style.transform = `translate3d(${-latest.current.index * 100}%,0,0)`;
      frame = requestAnimationFrame(() => {
        frame = 0;
        track.classList.remove('dragging');
      });
    };
    const unavailable = () =>
      latest.current.blocked || !!document.querySelector('dialog[open]') || !mobile.matches;
    const start = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        settle();
        return;
      }
      suppressUntil.current = 0;
      clear();
      if (unavailable() || event.defaultPrevented) return;
      const target = event.target instanceof Element ? event.target : null;
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
      for (
        let element: Element | null = target;
        element && element !== root;
        element = element.parentElement
      ) {
        if (
          element.scrollWidth > element.clientWidth + 1 &&
          /auto|scroll/.test(getComputedStyle(element).overflowX)
        )
          return;
      }
      const touch = event.touches[0];
      if (touch.clientX < 24 || touch.clientX > innerWidth - 24) return;
      // Read once, including an interrupted CSS transition. Never read layout per move.
      const transform = getComputedStyle(track).transform;
      gesture = {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        width: root.clientWidth,
        index: latest.current.index,
        origin: transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m41,
        locked: false,
        time: event.timeStamp,
      };
    };
    const move = (event: TouchEvent) => {
      if (!gesture) return;
      if (unavailable() || event.touches.length !== 1 || latest.current.index !== gesture.index)
        return settle();
      const touch = event.touches[0];
      const dx = touch.clientX - gesture.x;
      const dy = Math.abs(touch.clientY - gesture.y);
      if (touch.identifier !== gesture.id || (!gesture.locked && dy > 10 && dy >= Math.abs(dx)))
        return settle();
      if (!gesture.locked && Math.abs(dx) > 12 && Math.abs(dx) > dy * 1.8) {
        gesture.locked = true;
        track.style.transform = `translate3d(${gesture.origin}px,0,0)`;
        track.classList.add('dragging');
      }
      if (!gesture.locked) return;
      if (!event.cancelable) return settle();
      event.preventDefault();
      suppressUntil.current = performance.now() + 450;
      const raw = gesture.origin + Math.max(-gesture.width, Math.min(gesture.width, dx));
      const edge = -2 * gesture.width;
      position = raw > 0 ? raw * 0.18 : raw < edge ? edge + (raw - edge) * 0.18 : raw;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const end = (event: TouchEvent) => {
      const done = gesture;
      clear();
      if (
        !done?.locked ||
        unavailable() ||
        event.touches.length ||
        latest.current.index !== done.index
      )
        return settle();
      suppressUntil.current = performance.now() + 450;
      const touch = Array.from(event.changedTouches).find((t) => t.identifier === done.id);
      if (!touch) return settle();
      const next = swipeDestination(
        done.index,
        touch.clientX - done.x,
        touch.clientY - done.y,
        done.width,
        event.timeStamp - done.time,
      );
      track.classList.remove('dragging');
      if (next === null) return settle();
      // Do not write the old origin before React commits the destination.
      latest.current.navigate(pages[next]);
      // Also settle if the owner refuses navigation (e.g. an in-flight scanner ref).
      frame = requestAnimationFrame(settle);
    };
    root.addEventListener('touchstart', start, { passive: true });
    root.addEventListener('touchmove', move, { passive: false });
    root.addEventListener('touchend', end, { passive: true });
    root.addEventListener('touchcancel', settle);
    window.addEventListener('blur', interrupt);
    window.addEventListener('resize', interrupt);
    document.addEventListener('visibilitychange', interrupt);
    return () => {
      clear();
      cancelGesture.current = null;
      root.removeEventListener('touchstart', start);
      root.removeEventListener('touchmove', move);
      root.removeEventListener('touchend', end);
      root.removeEventListener('touchcancel', settle);
      window.removeEventListener('blur', interrupt);
      window.removeEventListener('resize', interrupt);
      document.removeEventListener('visibilitychange', interrupt);
    };
  }, []);
  return {
    ref,
    trackRef,
    allowClick: () => {
      suppressUntil.current = 0;
    },
    suppressClick: () => performance.now() < suppressUntil.current,
  };
}
