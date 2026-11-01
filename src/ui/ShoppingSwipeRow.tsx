import { useEffect, useRef, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { t } from '../i18n';

const revealWidth = 104;

/** A drag only reveals an explicit action. It never performs a mutation. */
export function ShoppingSwipeRow({
  children,
  checked,
  locked,
  active,
  open,
  reveal,
  remove,
  name,
}: {
  children: ReactNode;
  checked: boolean;
  locked: boolean;
  active: boolean;
  open: boolean;
  reveal: (open: boolean) => void;
  remove: () => void;
  name: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const latest = useRef({ checked, locked, active, open, reveal });
  latest.current = { checked, locked, active, open, reveal };
  const suppressUntil = useRef(0);
  useEffect(() => {
    const host = root.current!;
    const panel = surface.current!;
    let gesture: { id: number; x: number; y: number; offset: number; dragging: boolean } | null =
      null;
    let offset = 0;
    const paint = (value: number) => {
      offset = Math.max(-revealWidth, Math.min(0, value));
      panel.style.transform = `translate3d(${offset}px,0,0)`;
    };
    const cancel = () => {
      gesture = null;
      host.classList.remove('dragging');
      paint(
        latest.current.open &&
          latest.current.active &&
          latest.current.checked &&
          !latest.current.locked
          ? -revealWidth
          : 0,
      );
    };
    const unavailable = () =>
      !latest.current.checked ||
      latest.current.locked ||
      !latest.current.active ||
      !!document.querySelector('dialog[open]');
    const start = (event: TouchEvent) => {
      cancel();
      if (unavailable() || event.touches.length !== 1) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target || target.closest('summary,.shopping-options,.swipe-delete')) return;
      const touch = event.touches[0];
      if (touch.clientX < 24 || touch.clientX > innerWidth - 24) return;
      gesture = {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        offset,
        dragging: false,
      };
    };
    const move = (event: TouchEvent) => {
      if (!gesture) return;
      if (unavailable() || event.touches.length !== 1) return cancel();
      const touch = event.touches[0];
      const dx = touch.clientX - gesture.x,
        dy = Math.abs(touch.clientY - gesture.y);
      if (touch.identifier !== gesture.id || (!gesture.dragging && dy > 10 && dy >= Math.abs(dx)))
        return cancel();
      if (!gesture.dragging && Math.abs(dx) > 12 && Math.abs(dx) > dy * 1.8) {
        gesture.dragging = true;
        host.classList.add('dragging');
      }
      if (!gesture.dragging) return;
      if (!event.cancelable) return cancel();
      event.preventDefault();
      suppressUntil.current = performance.now() + 450;
      paint(gesture.offset + dx);
    };
    const end = (event: TouchEvent) => {
      if (!gesture) return;
      const dragged = gesture.dragging;
      const valid = !unavailable() && !event.touches.length;
      gesture = null;
      host.classList.remove('dragging');
      if (dragged && valid) {
        const opened = offset <= -48;
        paint(opened ? -revealWidth : 0);
        latest.current.reveal(opened);
      } else cancel();
    };
    host.addEventListener('touchstart', start, { passive: true });
    host.addEventListener('touchmove', move, { passive: false });
    host.addEventListener('touchend', end);
    host.addEventListener('touchcancel', cancel);
    window.addEventListener('resize', cancel);
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', cancel);
    return () => {
      host.removeEventListener('touchstart', start);
      host.removeEventListener('touchmove', move);
      host.removeEventListener('touchend', end);
      host.removeEventListener('touchcancel', cancel);
      window.removeEventListener('resize', cancel);
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', cancel);
    };
  }, []);
  useEffect(() => {
    if (!active || !checked || locked) reveal(false);
    root.current?.classList.remove('dragging');
    if (surface.current)
      surface.current.style.transform = `translate3d(${open && active && checked && !locked ? -revealWidth : 0}px,0,0)`;
  }, [open, active, checked, locked]);
  return (
    <div
      ref={root}
      className={`shopping-swipe ${open ? 'revealed' : ''}`}
      data-no-swipe={checked ? '' : undefined}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          reveal(false);
          surface.current
            ?.querySelector<HTMLButtonElement>('[role="checkbox"]')
            ?.focus({ preventScroll: true });
        }
      }}
      onClickCapture={(event) => {
        if (
          performance.now() < suppressUntil.current &&
          !(event.target instanceof Element && event.target.closest('.swipe-delete'))
        ) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      {checked && (
        <button
          className="swipe-delete"
          disabled={locked}
          tabIndex={open ? 0 : -1}
          aria-hidden={!open}
          aria-label={t('Supprimer {0} des courses', { 0: name })}
          onClick={remove}
        >
          <Trash2 size={20} aria-hidden="true" />
          {t('Supprimer')}
        </button>
      )}
      <div ref={surface} className="shopping-swipe-surface">
        {children}
      </div>
    </div>
  );
}
