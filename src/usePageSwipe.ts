import { useEffect, useRef } from 'react';

const pages = ['stock', 'scanner', 'shopping'] as const;
export type Page = (typeof pages)[number];

// Touch navigation supplements the buttons. Do not capture vertical scrolling,
// horizontal lists, editable controls, multiple fingers or system-owned gestures.
export function usePageSwipe(page: Page, navigate: (page: Page) => void, blocked: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const latest = useRef({ page, navigate, blocked });
  latest.current = { page, navigate, blocked };

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let gesture: {
      id: number;
      x: number;
      y: number;
      time: number;
      page: Page;
      next: Page;
      direction: 1 | -1;
      captured: boolean;
      width: number;
    } | null = null;
    const cancel = () => {
      gesture = null;
    };
    const unavailable = () =>
      latest.current.blocked ||
      !!document.querySelector('dialog[open]') ||
      !window.matchMedia('(max-width: 760px)').matches;

    const start = (event: TouchEvent) => {
      cancel();
      if (unavailable() || event.defaultPrevented || event.touches.length !== 1) return;
      const target = event.target instanceof Element ? event.target : null;
      if (
        !target ||
        target.closest(
          'input, select, textarea, button, a, label, summary, [contenteditable], [role="slider"], [role="button"], [role="tab"], video[controls], audio[controls]',
        )
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
      const width = window.innerWidth;
      const direction = touch.clientX <= 32 ? -1 : touch.clientX >= width - 32 ? 1 : 0;
      const next = pages[pages.indexOf(latest.current.page) + direction];
      if (!direction || !next) return;
      gesture = {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        time: performance.now(),
        page: latest.current.page,
        next,
        direction,
        captured: false,
        width,
      };
    };
    const move = (event: TouchEvent) => {
      if (!gesture) return;
      if (unavailable() || event.touches.length !== 1 || latest.current.page !== gesture.page) {
        cancel();
        return;
      }
      const touch = event.touches[0];
      const dx = touch.clientX - gesture.x;
      const dy = Math.abs(touch.clientY - gesture.y);
      if (touch.identifier !== gesture.id || dy > 40 || (dy > 8 && dy >= Math.abs(dx))) {
        cancel();
        return;
      }
      if (-dx * gesture.direction > 8 && Math.abs(dx) > dy * 2) {
        if (!event.cancelable) {
          cancel();
          return;
        }
        event.preventDefault();
        gesture.captured = true;
      }
    };
    const end = (event: TouchEvent) => {
      const finished = gesture;
      cancel();
      if (!finished || !finished.captured || unavailable() || event.touches.length) return;
      const touch = Array.from(event.changedTouches).find(
        (item) => item.identifier === finished.id,
      );
      if (!touch || latest.current.page !== finished.page || window.innerWidth !== finished.width)
        return;
      const dx = touch.clientX - finished.x;
      const dy = Math.abs(touch.clientY - finished.y);
      if (
        -dx * finished.direction >= 64 &&
        dy <= 40 &&
        Math.abs(dx) > dy * 2 &&
        performance.now() - finished.time <= 850
      )
        latest.current.navigate(finished.next);
    };
    root.addEventListener('touchstart', start, { passive: true });
    root.addEventListener('touchmove', move, { passive: false });
    root.addEventListener('touchend', end, { passive: true });
    root.addEventListener('touchcancel', cancel, { passive: true });
    return () => {
      root.removeEventListener('touchstart', start);
      root.removeEventListener('touchmove', move);
      root.removeEventListener('touchend', end);
      root.removeEventListener('touchcancel', cancel);
    };
  }, []);
  return ref;
}
