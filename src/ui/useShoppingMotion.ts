import { useLayoutEffect, useRef } from 'react';
import { animateMotion } from './motion';

type Position = { element: HTMLElement; top: number; width: number; height: number };

/** FLIP on confirmed list order only. No React updates or layout reads during animation. */
export function useShoppingMotion(order: string, active: boolean) {
  const ref = useRef<HTMLElement>(null);
  const previous = useRef(new Map<string, Position>());
  const animations = useRef(new Map<HTMLElement, Animation>());
  const ghosts = useRef(new Set<HTMLElement>());
  const heightAnimation = useRef<Animation | null>(null);
  const previousHeight = useRef(0);
  const previouslyActive = useRef(active);
  useLayoutEffect(() => {
    const list = ref.current!;
    const oldHeight = heightAnimation.current ? list.offsetHeight : previousHeight.current;
    heightAnimation.current?.cancel();
    heightAnimation.current = null;
    list.removeAttribute('data-motion-collapse');
    const newHeight = list.offsetHeight;
    const rows = [...list.querySelectorAll<HTMLElement>(':scope > [data-motion-id]')];
    // Read all geometry before writing. Existing transforms allow interrupted FLIPs to retarget.
    const next = new Map(
      rows.map((element) => [
        element.dataset.motionId!,
        {
          element,
          top: element.offsetTop,
          width: element.offsetWidth,
          height: element.offsetHeight,
        },
      ]),
    );
    const offsets = new Map(
      rows.map((element) => {
        const transform = animations.current.has(element)
          ? getComputedStyle(element).transform
          : 'none';
        return [element, transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42];
      }),
    );
    for (const animation of animations.current.values()) animation.cancel();
    animations.current.clear();
    const enabled =
      active &&
      previouslyActive.current &&
      !matchMedia('(prefers-reduced-motion: reduce)').matches &&
      !document.hidden;
    previouslyActive.current = active;
    if (enabled) {
      const deleting = [...previous.current.keys()].some((id) => !next.has(id));
      if (deleting && oldHeight > newHeight) {
        // One bounded height transition clips the exiting copy and keeps following
        // content below it. Transform-only ghosts otherwise overlap the list hint.
        const animation = animateMotion(
          list,
          [{ height: `${oldHeight}px` }, { height: `${newHeight}px` }],
          'reflow',
        );
        if (animation) {
          heightAnimation.current = animation;
          list.dataset.motionCollapse = '';
          void animation.finished
            .catch(() => {})
            .finally(() => {
              if (heightAnimation.current === animation) {
                heightAnimation.current = null;
                list.removeAttribute('data-motion-collapse');
              }
            });
        }
      }
      for (const [id, position] of next) {
        const old = previous.current.get(id);
        if (!old) continue;
        const delta = old.top + (offsets.get(position.element) ?? 0) - position.top;
        if (Math.abs(delta) < 1) continue;
        const animation = animateMotion(
          position.element,
          [{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }],
          'reflow',
        );
        if (animation) {
          animations.current.set(position.element, animation);
          void animation.finished
            .catch(() => {})
            .finally(() => {
              if (animations.current.get(position.element) === animation)
                animations.current.delete(position.element);
            });
        }
      }
      for (const [id, old] of previous.current) {
        if (next.has(id) || !next.size) continue;
        // This is a disposable visual copy of an already removed confirmed row.
        // Never retain live controls or use it to delay/undo the business mutation.
        const ghost = old.element.cloneNode(true) as HTMLElement;
        ghost.removeAttribute('data-motion-id');
        ghost.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
        ghost.inert = true;
        ghost.setAttribute('aria-hidden', 'true');
        ghost.classList.add('shopping-exit');
        Object.assign(ghost.style, {
          top: `${old.top}px`,
          width: `${old.width}px`,
          height: `${old.height}px`,
          transform: 'none',
        });
        list.append(ghost);
        ghosts.current.add(ghost);
        const animation = animateMotion(
          ghost,
          [
            { opacity: 1, transform: 'translateY(0)' },
            { opacity: 0, transform: 'translateY(-4px)' },
          ],
          'exit',
        );
        if (animation)
          void animation.finished
            .catch(() => {})
            .finally(() => {
              ghost.remove();
              ghosts.current.delete(ghost);
            });
        else {
          ghost.remove();
          ghosts.current.delete(ghost);
        }
      }
    } else {
      for (const ghost of ghosts.current) {
        ghost.getAnimations().forEach((animation) => animation.cancel());
        ghost.remove();
      }
      ghosts.current.clear();
    }
    previous.current = next;
    previousHeight.current = newHeight;
  }, [order, active]);
  useLayoutEffect(
    () => () => {
      heightAnimation.current?.cancel();
      for (const animation of animations.current.values()) animation.cancel();
      for (const ghost of ghosts.current) {
        ghost.getAnimations().forEach((animation) => animation.cancel());
        ghost.remove();
      }
    },
    [],
  );
  useLayoutEffect(() => {
    const observer = new ResizeObserver(() => {
      // The renderer owns the bounded collapse. Do not measure it every frame.
      if (heightAnimation.current) return;
      previousHeight.current = ref.current!.offsetHeight;
      // Details, text wrapping and viewport changes can resize rows between mutations.
      for (const position of previous.current.values()) {
        const element = position.element;
        if (!element.isConnected) continue;
        position.top = element.offsetTop;
        position.width = element.offsetWidth;
        position.height = element.offsetHeight;
      }
    });
    observer.observe(ref.current!);
    for (const position of previous.current.values()) observer.observe(position.element);
    return () => observer.disconnect();
  }, [order]);
  return ref;
}
