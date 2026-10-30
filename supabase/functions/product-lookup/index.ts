import { OpenFoodFactsProvider } from '../../../src/productLookupServer.ts';
import { createLookupHandler, LookupAuthError } from '../../../src/productLookupHandler.ts';
import type { LookupSlot } from '../../../src/productInfo.ts';
import { DEFAULT_OFF_USER_AGENT } from '../../../src/offIdentity.ts';

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};

const api = Deno.env.get('SUPABASE_URL')!;
const key = Deno.env.get('SUPABASE_ANON_KEY')!;
const provider = new OpenFoodFactsProvider({
  userAgent: Deno.env.get('OFF_USER_AGENT') ?? DEFAULT_OFF_USER_AGENT,
  intervalMs: Number(Deno.env.get('OFF_MIN_INTERVAL_MS') ?? 6000),
});
async function budget(token: string, signal: AbortSignal, cooldown = 0): Promise<LookupSlot> {
  const response = await fetch(`${api}/rest/v1/rpc/claim_product_lookup_slot`, {
    method: 'POST',
    signal,
    redirect: 'error',
    headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_cooldown_seconds: cooldown }),
  });
  if (response.status === 401 || response.status === 403) throw new LookupAuthError();
  if (!response.ok) throw new Error('Shared lookup budget unavailable');
  const row = await response.json();
  if (
    typeof row.allowed !== 'boolean' ||
    !['cooldown', 'rate-limit'].includes(row.reason) ||
    !Number.isInteger(row.retry_after_seconds) ||
    row.retry_after_seconds < 1 ||
    row.retry_after_seconds > 86400
  )
    throw new Error('Invalid shared lookup budget');
  return { allowed: row.allowed, reason: row.reason, retryAfterSeconds: row.retry_after_seconds };
}

Deno.serve(
  createLookupHandler({
    provider,
    claim: (token, signal) => budget(token, signal),
    defer: (token, signal) => budget(token, signal, provider.retryAfterSeconds),
    retryAfterSeconds: () => provider.retryAfterSeconds,
    // Exact origins only, explicitly configured before a Cloud deployment.
    origins: (Deno.env.get('OFF_ALLOWED_ORIGINS') ?? 'http://127.0.0.1:5173,http://localhost:5173')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    authorize: async (token, signal) => {
      const headers = { apikey: key, Authorization: `Bearer ${token}` };
      const userResponse = await fetch(`${api}/auth/v1/user`, {
        headers,
        signal,
        redirect: 'error',
      });
      if (userResponse.status === 401 || userResponse.status === 403) return false;
      if (!userResponse.ok) throw new Error('Auth unavailable');
      const user = await userResponse.json();
      if (
        !user.id ||
        !user.email_confirmed_at ||
        user.is_anonymous ||
        user.role !== 'authenticated'
      )
        return false;
      // RLS verifies membership. No reserve/catalogue data is transmitted to OFF.
      const members = await fetch(
        `${api}/rest/v1/reserve_members?select=user_id&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
        { headers, signal, redirect: 'error' },
      );
      if (members.status === 401 || members.status === 403) return false;
      if (!members.ok) throw new Error('Membership check unavailable');
      const rows = await members.json();
      return Array.isArray(rows) && rows.length === 1;
    },
  }),
);
