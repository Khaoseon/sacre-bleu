import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Client } from '../backend/client';

type Scope = { client: Client; account: string; reserve: string; online: boolean };
const Context = createContext<Scope | null>(null);
export function PrivatePhotos({ scope, children }: { scope: Scope; children: ReactNode }) {
  return <Context.Provider value={scope}>{children}</Context.Provider>;
}

/** No persistent cache. Only visible media owns a Blob URL. Scope/path/visibility
 * changes revoke it and invalidate late responses, including at signout. */
export function usePrivatePhoto(product: string, path?: string) {
  const scope = useContext(Context);
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState<{ key: string; url: string } | null>(null);
  const key = scope ? `${scope.account}:${scope.reserve}:${path}` : '';
  useEffect(() => {
    const node = ref.current;
    if (!node || !path) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries.some((e) => e.isIntersecting)),
      { rootMargin: '80px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [path]);
  useEffect(() => {
    if (!scope?.online || !path || !visible) return;
    let cancelled = false;
    let url: string | undefined;
    const { client, account, reserve } = scope;
    void (async () => {
      try {
        const session = await client.auth.getSession();
        if (cancelled || session.data.session?.user.id !== account) return;
        const result = await client
          .rpc('read_product_photo', { p_reserve_id: reserve, p_product_id: product, p_path: path })
          .abortSignal(AbortSignal.timeout(8000));
        if (
          cancelled ||
          result.error ||
          !result.data ||
          typeof result.data !== 'object' ||
          Array.isArray(result.data) ||
          typeof result.data.data !== 'string' ||
          result.data.data.length > 700000
        )
          return;
        const bytes = Uint8Array.from(atob(result.data.data.replace(/\s/g, '')), (c) =>
          c.charCodeAt(0),
        );
        if (bytes.length > 500000 || bytes[0] !== 255 || bytes[1] !== 216) return;
        url = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
        setLoaded({ key, url });
      } catch {
        /* OFF/category fallback remains usable. No sensitive diagnostics. */
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
      setLoaded(null);
    };
  }, [scope?.client, scope?.account, scope?.reserve, scope?.online, product, path, visible, key]);
  return { ref, src: scope?.online && visible && loaded?.key === key ? loaded.url : undefined };
}
