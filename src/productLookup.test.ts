import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenFoodFactsProvider, OFF_FIELDS } from './productLookupServer';
import { EdgeProductProvider } from './productLookupClient';
import { createLookupHandler } from './productLookupHandler';

const code = '3017620422003';
const response = {
  status: 'success',
  product: { code, product_name_fr: 'Produit test', quantity: '500 g' },
};
const userAgent = 'App_reserve/0.1.0 (https://github.com/Khaoseon)';
const signal = () => new AbortController().signal;
afterEach(() => vi.useRealTimers());

describe('OFF HTTP, cache and request budget', () => {
  it('uses only the fixed API v3.6 endpoint, requested fields, French and Swiss hints and custom UA', async () => {
    const http = vi.fn<typeof fetch>().mockResolvedValue(Response.json(response));
    const provider = new OpenFoodFactsProvider({ userAgent, fetch: http });
    expect((await provider.lookup(code, signal())).status).toBe('found');
    const url = new URL(String(http.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe(
      `https://world.openfoodfacts.org/api/v3.6/product/${code}`,
    );
    expect(url.searchParams.get('fields')).toBe(OFF_FIELDS);
    expect(url.searchParams.get('lc')).toBe('fr');
    expect(url.searchParams.get('cc')).toBe('ch');
    expect(http.mock.calls[0][1]).toMatchObject({
      redirect: 'error',
      headers: { 'User-Agent': userAgent },
    });
    expect(OFF_FIELDS).not.toMatch(/ingredients|nutriments|score/);
    expect((await provider.lookup(code, signal())).status).toBe('found');
    expect(http).toHaveBeenCalledOnce();
  });
  it('caches 404 misses, expires results and limits successive unknown codes', async () => {
    let now = 1000;
    const http = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => new Response(null, { status: 404 }));
    const provider = new OpenFoodFactsProvider({ userAgent, fetch: http, now: () => now });
    expect(await provider.lookup(code, signal())).toEqual({ status: 'missing' });
    expect(await provider.lookup(code, signal())).toEqual({ status: 'missing' });
    expect(await provider.lookup('00001234', signal())).toEqual({
      status: 'unavailable',
      reason: 'cooldown',
    });
    now += 600001;
    await provider.lookup(code, signal());
    expect(http).toHaveBeenCalledTimes(2);
  });
  it.each(['120', new Date(181000).toUTCString()])(
    'honours 429 Retry-After %s without automatic retries',
    async (retry) => {
      let now = 1000;
      const http = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(null, { status: 429, headers: { 'Retry-After': retry } }));
      const provider = new OpenFoodFactsProvider({ userAgent, fetch: http, now: () => now });
      expect(await provider.lookup(code, signal())).toEqual({
        status: 'unavailable',
        reason: 'rate-limit',
      });
      now += 61000;
      expect(await provider.lookup('00005678', signal())).toEqual({
        status: 'unavailable',
        reason: 'rate-limit',
      });
      expect(http).toHaveBeenCalledOnce();
    },
  );
  it.each([500, 503, 403])('falls back on HTTP %s', async (status) => {
    const provider = new OpenFoodFactsProvider({
      userAgent,
      fetch: vi.fn().mockResolvedValue(new Response(null, { status })),
    });
    expect(await provider.lookup(code, signal())).toEqual({
      status: 'unavailable',
      reason: 'network',
    });
  });
  it.each(['invalid json', 'x'.repeat(100001), JSON.stringify({ product: [] })])(
    'bounds and validates external data',
    async (body) => {
      const provider = new OpenFoodFactsProvider({
        userAgent,
        fetch: vi.fn().mockResolvedValue(new Response(body)),
      });
      expect((await provider.lookup(code, signal())).status).toBe('unavailable');
    },
  );
  it('cancels slow fetches and recovers from network errors', async () => {
    vi.useFakeTimers();
    // AbortSignal.timeout uses a native timer; explicitly abort the user lifecycle.
    const controller = new AbortController();
    const http = vi.fn<typeof fetch>().mockImplementation(
      async (_url, init) =>
        new Promise((_resolve, reject) =>
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), {
            once: true,
          }),
        ),
    );
    const provider = new OpenFoodFactsProvider({ userAgent, fetch: http });
    const pending = provider.lookup(code, controller.signal);
    controller.abort();
    expect((await pending).status).toBe('unavailable');
  });
  it('rejects arbitrary URLs and unidentified application traffic before HTTP', async () => {
    const http = vi.fn();
    expect(
      (
        await new OpenFoodFactsProvider({ userAgent, fetch: http }).lookup(
          'https://evil.test',
          signal(),
        )
      ).status,
    ).toBe('unavailable');
    expect(
      (await new OpenFoodFactsProvider({ userAgent: '', fetch: http }).lookup(code, signal()))
        .status,
    ).toBe('unavailable');
    expect(http).not.toHaveBeenCalled();
  });
});

describe('authenticated Edge boundary', () => {
  function setup(allowed = true) {
    const lookup = vi.fn().mockResolvedValue({ status: 'missing' });
    const authorize = vi.fn().mockResolvedValue(allowed);
    const handler = createLookupHandler({
      provider: { lookup },
      origins: ['http://localhost:5173'],
      authorize,
    });
    const request = (
      body: unknown = { barcode: code },
      token = 'valid.jwt',
      origin = 'http://localhost:5173',
    ) =>
      new Request('http://localhost/product-lookup', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Origin: origin,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    return { lookup, authorize, handler, request };
  }
  it('requires verified member authorization before reaching the provider', async () => {
    const f = setup(false);
    expect((await f.handler(f.request())).status).toBe(401);
    expect(f.lookup).not.toHaveBeenCalled();
  });
  it('returns exact CORS origin and allows a preflight without a token', async () => {
    const f = setup();
    const result = await f.handler(
      new Request('http://localhost/', {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:5173' },
      }),
    );
    expect(result.status).toBe(204);
    expect(result.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
    expect(f.authorize).not.toHaveBeenCalled();
  });
  it('rejects an unauthorized origin', async () => {
    const f = setup();
    expect((await f.handler(f.request({ barcode: code }, 'jwt', 'https://evil.test'))).status).toBe(
      403,
    );
    expect(f.lookup).not.toHaveBeenCalled();
  });
  it.each([
    { barcode: 1234 },
    { barcode: '123' },
    { barcode: '00123456', url: 'https://evil.test' },
    { barcode: '../test' },
    { barcode: '1'.repeat(130) },
  ])('strictly validates %j', async (body) => {
    const f = setup();
    expect((await f.handler(f.request(body))).status).toBe(400);
    expect(f.lookup).not.toHaveBeenCalled();
  });
  it('forwards only the barcode and cancellation signal', async () => {
    const f = setup();
    expect((await f.handler(f.request())).status).toBe(200);
    expect(f.lookup.mock.calls[0]).toEqual([code, expect.any(AbortSignal)]);
  });
  it('does not call OFF when the shared budget denies a slot', async () => {
    const lookup = vi.fn();
    const handler = createLookupHandler({
      provider: { lookup },
      origins: [],
      authorize: async () => true,
      claim: async () => false,
    });
    const result = await handler(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { Authorization: 'Bearer jwt', 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: code }),
      }),
    );
    expect(result.status).toBe(429);
    expect(lookup).not.toHaveBeenCalled();
  });
});

describe('frontend provider isolation', () => {
  it('calls only Supabase with the access token and barcode and caches the normalized result', async () => {
    const http = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ status: 'missing' }));
    const provider = new EdgeProductProvider({
      url: 'http://localhost:55321',
      publicKey: 'public',
      token: async () => 'token',
      fetch: http,
    });
    expect(await provider.lookup(code, signal())).toEqual({ status: 'missing' });
    expect(await provider.lookup(code, signal())).toEqual({ status: 'missing' });
    expect(http).toHaveBeenCalledOnce();
    expect(http.mock.calls[0][0]).toBe('http://localhost:55321/functions/v1/product-lookup');
    expect(JSON.parse(String(http.mock.calls[0][1]?.body))).toEqual({ barcode: code });
    expect(http.mock.calls[0][1]?.headers).toMatchObject({ Authorization: 'Bearer token' });
  });
  it('does not call anything without an authenticated session', async () => {
    const http = vi.fn();
    const provider = new EdgeProductProvider({
      url: 'http://localhost',
      publicKey: '',
      token: async () => undefined,
      fetch: http,
    });
    expect((await provider.lookup(code, signal())).status).toBe('unavailable');
    expect(http).not.toHaveBeenCalled();
  });
  it('backs off across different barcodes after an Edge 429', async () => {
    const http = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 429, headers: { 'Retry-After': '120' } }));
    const provider = new EdgeProductProvider({
      url: 'http://localhost',
      publicKey: 'public',
      token: async () => 'token',
      fetch: http,
    });
    expect(await provider.lookup(code, signal())).toEqual({
      status: 'unavailable',
      reason: 'rate-limit',
    });
    expect(await provider.lookup('00001234', signal())).toEqual({
      status: 'unavailable',
      reason: 'rate-limit',
    });
    expect(http).toHaveBeenCalledOnce();
  });
});
