import { OpenFoodFactsProvider } from '../../../src/productLookupServer.ts';
import { createLookupHandler } from '../../../src/productLookupHandler.ts';

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};

const api = Deno.env.get('SUPABASE_URL')!;
const key = Deno.env.get('SUPABASE_ANON_KEY')!;
const provider = new OpenFoodFactsProvider({
  userAgent: 'App_reserve/0.1.0 (https://github.com/Khaoseon)',
  intervalMs: Number(Deno.env.get('OFF_MIN_INTERVAL_MS') ?? 6000),
});
async function budget(token: string, signal: AbortSignal, cooldown = 0): Promise<boolean> {
  const response = await fetch(`${api}/rest/v1/rpc/claim_product_lookup`, {
    method: 'POST',
    signal,
    redirect: 'error',
    headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_cooldown_seconds: cooldown }),
  });
  return response.ok && (await response.json()) === true;
}

Deno.serve(
  createLookupHandler({
    provider,
    claim: (token, signal) => budget(token, signal),
    defer: async (token, signal) => {
      await budget(token, signal, provider.retryAfterSeconds);
    },
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
      if (!userResponse.ok) return false;
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
      if (!members.ok) return false;
      const rows = await members.json();
      return Array.isArray(rows) && rows.length === 1;
    },
  }),
);
