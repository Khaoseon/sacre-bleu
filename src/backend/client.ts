import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.generated';

export const AUTH_STORAGE_KEY = 'app-reserve.auth.v1';
export function isPublicKey(key: string): boolean {
  if (key.startsWith('sb_publishable_')) return true;
  try {
    return JSON.parse(atob(key.split('.')[1])).role === 'anon';
  } catch {
    return false;
  }
}
export function configuredClient(url?: string, key?: string) {
  if (!url || !key || !isPublicKey(key)) return null;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return createClient<Database>(url, key, {
      auth: {
        storageKey: AUTH_STORAGE_KEY,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            signal: AbortSignal.any([
              ...(init?.signal ? [init.signal] : []),
              AbortSignal.timeout(8000),
            ]),
          }),
      },
    });
  } catch {
    return null;
  }
}
export const client = configuredClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
export type Client = NonNullable<typeof client>;
