import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.generated';
import { authStorageKey, backendEnvironmentError } from './config';
export { isPublicKey } from './config';

export const AUTH_STORAGE_KEY = authStorageKey(import.meta.env.VITE_SUPABASE_URL);
export function configuredClient(url?: string, key?: string) {
  if (
    !url ||
    !key ||
    backendEnvironmentError(import.meta.env.MODE, {
      VITE_SUPABASE_URL: url,
      VITE_SUPABASE_PUBLISHABLE_KEY: key,
    })
  )
    return null;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return createClient<Database>(url, key, {
      auth: {
        storageKey: authStorageKey(url),
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
