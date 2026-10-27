import { useEffect, useSyncExternalStore } from 'react';
import type { SharedPantryStore } from './store';
export function usePantry(store: SharedPantryStore) {
  const view = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') void store.refresh();
    };
    const offline = () => store.offline();
    refresh();
    const timer = window.setInterval(refresh, 5000);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    window.addEventListener('offline', offline);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      window.removeEventListener('offline', offline);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [store]);
  return view;
}
