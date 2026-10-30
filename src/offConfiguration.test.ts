import { afterEach, expect, it, vi } from 'vitest';
import { DEFAULT_OFF_USER_AGENT } from './offIdentity';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

it.each([undefined, 'Pantry/1.0 (https://operator.example/contact)', '', 'invalid'])(
  'wires the actual Edge environment to the provider: %j',
  async (identity) => {
    let handler!: (request: Request) => Promise<Response>;
    const env: Record<string, string | undefined> = {
      SUPABASE_URL: 'http://127.0.0.1:55321',
      SUPABASE_ANON_KEY: 'synthetic-public-key',
      OFF_ALLOWED_ORIGINS: 'https://pantry.example',
      OFF_USER_AGENT: identity,
    };
    vi.stubGlobal('Deno', {
      env: { get: (key: string) => env[key] },
      serve: (callback: typeof handler) => {
        handler = callback;
      },
    });
    const requests: string[] = [];
    const http = vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
      const url = new URL(String(input));
      requests.push(url.pathname);
      if (url.hostname === 'world.openfoodfacts.org') {
        expect(init?.headers).toMatchObject({ 'User-Agent': identity ?? DEFAULT_OFF_USER_AGENT });
        expect(init?.headers).not.toHaveProperty('Authorization');
        return new Response(null, { status: 404 });
      }
      expect(url.origin).toBe(env.SUPABASE_URL);
      expect(init?.headers).toMatchObject({ Authorization: 'Bearer synthetic.jwt' });
      if (url.pathname === '/auth/v1/user')
        return Response.json({ id: 'member', email_confirmed_at: 'date', role: 'authenticated' });
      if (url.pathname === '/rest/v1/reserve_members')
        return Response.json([{ user_id: 'member' }]);
      expect(url.pathname).toBe('/rest/v1/rpc/claim_product_lookup_slot');
      return Response.json({ allowed: true, reason: 'cooldown', retry_after_seconds: 6 });
    });
    vi.stubGlobal('fetch', http);
    await import('../supabase/functions/product-lookup/index');
    const result = await handler(
      new Request('http://localhost/product-lookup', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer synthetic.jwt',
          Origin: 'https://pantry.example',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ barcode: '00123456' }),
      }),
    );
    expect(result.headers.get('Access-Control-Allow-Origin')).toBe('https://pantry.example');
    expect(await result.json()).toMatchObject(
      identity === '' || identity === 'invalid'
        ? { status: 'unavailable', reason: 'disabled' }
        : { status: 'missing' },
    );
    expect(requests.slice(0, 3)).toEqual([
      '/auth/v1/user',
      '/rest/v1/reserve_members',
      '/rest/v1/rpc/claim_product_lookup_slot',
    ]);
    expect(http).toHaveBeenCalledTimes(identity === '' || identity === 'invalid' ? 3 : 4);
  },
);
