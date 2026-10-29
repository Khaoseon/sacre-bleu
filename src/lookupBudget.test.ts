import { afterEach, expect, it, vi } from 'vitest';
import { EdgeProductProvider } from './productLookupClient';
import { OpenFoodFactsProvider } from './productLookupServer';
import { createLookupHandler, LookupAuthError } from './productLookupHandler';
import { ProductSearch } from './productSearch';
const code = '3017620422003';
const other = '3274080005003';
const agent = 'App_reserve/0.1.0 (https://github.com/Khaoseon)';
afterEach(() => vi.useRealTimers());

it('a new client remains compatible with legacy Edge success and 429 responses during rollout', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(1000);
  const http = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ status: 'missing' }))
    .mockResolvedValueOnce(
      Response.json(
        { status: 'unavailable', reason: 'rate-limit' },
        {
          status: 429,
          headers: { 'Retry-After': '60' },
        },
      ),
    )
    .mockResolvedValueOnce(Response.json({ status: 'missing' }));
  const client = new EdgeProductProvider({
    url: 'https://edge.test',
    publicKey: 'fixture',
    token: async () => 'fixture',
    fetch: http,
  });
  const signal = new AbortController().signal;
  expect(await client.lookup(code, signal)).toEqual({ status: 'missing' });
  expect(await client.lookup(other, signal)).toEqual({
    status: 'unavailable',
    reason: 'rate-limit',
  });
  expect(client.getStatus()).toEqual({ reason: 'rate-limit', until: 61000 });
  await vi.advanceTimersByTimeAsync(59999);
  expect((await client.lookup(other, signal)).status).toBe('unavailable');
  expect(http).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(1);
  expect(await client.lookup(other, signal)).toEqual({ status: 'missing' });
  expect(http).toHaveBeenCalledTimes(3);
});

function pair(http = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 404 }))) {
  let next = 0;
  let reason: 'cooldown' | 'rate-limit' = 'cooldown';
  const provider = new OpenFoodFactsProvider({ userAgent: agent, fetch: http });
  const handler = createLookupHandler({
    provider,
    origins: ['https://app.test'],
    authorize: async () => true,
    claim: async () => {
      const allowed = Date.now() >= next;
      if (allowed) {
        next = Date.now() + 6000;
        reason = 'cooldown';
      }
      return {
        allowed,
        reason,
        retryAfterSeconds: Math.max(1, Math.ceil((next - Date.now()) / 1000)),
      };
    },
    defer: async () => {
      next = Math.max(next, Date.now() + provider.retryAfterSeconds * 1000);
      reason = 'rate-limit';
      return { allowed: false, reason, retryAfterSeconds: Math.ceil((next - Date.now()) / 1000) };
    },
  });
  const edge = vi.fn<typeof fetch>().mockImplementation(async (_url, init) =>
    handler(
      new Request('https://edge.test', {
        ...init,
        headers: { ...init?.headers, Origin: 'https://app.test' },
      }),
    ),
  );
  const client = () =>
    new EdgeProductProvider({
      url: 'https://edge.test',
      publicKey: 'fixture',
      token: async () => 'fixture',
      fetch: edge,
    });
  return { a: client(), b: client(), http, edge };
}
it('two accounts share six seconds without a false one-minute provider ban', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(1000);
  const f = pair();
  const [a, b] = await Promise.all([
    f.a.lookup(code, new AbortController().signal),
    f.b.lookup(other, new AbortController().signal),
  ]);
  expect(a).toEqual({ status: 'missing' });
  expect(b).toEqual({ status: 'unavailable', reason: 'cooldown' });
  expect(f.b.getStatus()).toEqual({ reason: 'cooldown', until: 7000 });
  expect(f.http).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(5000);
  expect((await f.b.lookup(other, new AbortController().signal)).status).toBe('unavailable');
  expect(f.edge).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(1000);
  expect(await f.b.lookup(other, new AbortController().signal)).toEqual({ status: 'missing' });
  expect(f.http).toHaveBeenCalledTimes(2);
});
it('more than twenty known scans bypass OFF even during its provider cooldown', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(1000);
  const f = pair(
    vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 429, headers: { 'Retry-After': '120' } })),
  );
  expect(await f.a.lookup(other, new AbortController().signal)).toEqual({
    status: 'unavailable',
    reason: 'rate-limit',
  });
  const search = new ProductSearch(f.a);
  const products = [{ id: 'p', name: 'Produit fictif', barcode: code, quantity: 1, updatedAt: '' }];
  for (let index = 0; index < 30; index++) {
    expect(search.start(products, code).status).toBe('known');
    await vi.advanceTimersByTimeAsync(1500);
  }
  expect(f.http).toHaveBeenCalledOnce();
  expect(f.edge).toHaveBeenCalledOnce();
});
it('a true provider 429 shares its actual retry time and allows the same barcode afterwards', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(1000);
  const http = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response(null, { status: 429, headers: { 'Retry-After': '8' } }))
    .mockResolvedValue(new Response(null, { status: 404 }));
  const f = pair(http);
  expect(await f.a.lookup(code, new AbortController().signal)).toEqual({
    status: 'unavailable',
    reason: 'rate-limit',
  });
  expect(f.a.getStatus().until).toBe(9000);
  expect(await f.b.lookup(other, new AbortController().signal)).toEqual({
    status: 'unavailable',
    reason: 'rate-limit',
  });
  expect(f.b.getStatus().until).toBe(9000);
  await vi.advanceTimersByTimeAsync(8000);
  expect(await f.a.lookup(code, new AbortController().signal)).toEqual({ status: 'missing' });
  expect(http).toHaveBeenCalledTimes(2);
});
it('network/auth failures are distinct and are not cached for thirty seconds', async () => {
  let token: string | undefined;
  const http = vi
    .fn<typeof fetch>()
    .mockRejectedValueOnce(new Error('network'))
    .mockResolvedValueOnce(new Response(null, { status: 401 }))
    .mockResolvedValue(Response.json({ status: 'missing' }));
  const client = new EdgeProductProvider({
    url: 'https://edge.test',
    publicKey: 'fixture',
    token: async () => token,
    fetch: http,
  });
  const lookup = () => client.lookup(code, new AbortController().signal);
  expect(await lookup()).toEqual({ status: 'unavailable', reason: 'auth' });
  token = 'fixture';
  expect(await lookup()).toEqual({ status: 'unavailable', reason: 'network' });
  expect(await lookup()).toEqual({ status: 'unavailable', reason: 'auth' });
  expect(await lookup()).toEqual({ status: 'missing' });
  expect(http).toHaveBeenCalledTimes(3);
});
it('CORS exposes Retry-After and a failed budget read is not a rate-limit refusal', async () => {
  const lookup = vi.fn();
  const handler = createLookupHandler({
    provider: { lookup },
    origins: ['https://app.test'],
    authorize: async () => true,
    claim: async () => {
      throw new Error('db unavailable');
    },
  });
  const result = await handler(
    new Request('https://edge.test', {
      method: 'POST',
      headers: {
        Origin: 'https://app.test',
        Authorization: 'Bearer fixture',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ barcode: code }),
    }),
  );
  expect(result.status).toBe(200);
  expect(await result.json()).toEqual({ status: 'unavailable', reason: 'network' });
  expect(result.headers.get('Access-Control-Expose-Headers')).toBe('Retry-After');
  expect(lookup).not.toHaveBeenCalled();
});
it('an expired authorization at the budget boundary stays an auth error', async () => {
  const handler = createLookupHandler({
    provider: { lookup: vi.fn() },
    origins: [],
    authorize: async () => true,
    claim: async () => {
      throw new LookupAuthError();
    },
  });
  const result = await handler(
    new Request('https://edge.test', {
      method: 'POST',
      headers: { Authorization: 'Bearer fixture', 'Content-Type': 'application/json' },
      body: JSON.stringify({ barcode: code }),
    }),
  );
  expect(result.status).toBe(401);
});
it('a provider 429 is not disguised as a network failure if persisting its cooldown fails', async () => {
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const handler = createLookupHandler({
      provider: { lookup: async () => ({ status: 'unavailable', reason: 'rate-limit' }) },
      origins: [],
      authorize: async () => true,
      retryAfterSeconds: () => 17,
      defer: async () => {
        throw new Error('db unavailable');
      },
    });
    const result = await handler(
      new Request('https://edge.test', {
        method: 'POST',
        headers: { Authorization: 'Bearer fixture', 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: code }),
      }),
    );
    expect(result.status).toBe(429);
    expect(result.headers.get('Retry-After')).toBe('17');
    expect(warning).toHaveBeenCalledWith('OFF_SHARED_COOLDOWN_UNCONFIRMED');
  } finally {
    warning.mockRestore();
  }
});
